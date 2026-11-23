import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";
import { PasswordDialog } from "./components/PasswordDialog";
import { fetchPlan, PasswordRequiredError, streamCall, toApiMessages, type StreamEvent } from "./api";
import { loadConversations, saveConversations } from "./storage";
import { agentById, TEAM_ID, type Conversations, type ExpertRun, type ReplyTurn, type TeamTurn, type Turn } from "./types";

const ACTIVE_KEY = "experts21.active";

function initialActive(): string {
  try {
    const v = localStorage.getItem(ACTIVE_KEY);
    if (v && (v === TEAM_ID || agentById(v))) return v;
  } catch {
    /* ignore */
  }
  return TEAM_ID;
}

export default function App() {
  const [conversations, setConversations] = useState<Conversations>(loadConversations);
  const [active, setActive] = useState<string>(initialActive);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [needPassword, setNeedPassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const controllers = useRef<Record<string, AbortController>>({});

  // Persist chats (debounced, and immediately when the page is hidden or closed) and the selected conversation.
  const latest = useRef(conversations);
  latest.current = conversations;
  useEffect(() => {
    const id = setTimeout(() => saveConversations(conversations), 400);
    return () => clearTimeout(id);
  }, [conversations]);
  useEffect(() => {
    const flush = () => saveConversations(latest.current);
    const onVisibility = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_KEY, active);
    } catch {
      /* ignore */
    }
  }, [active]);

  /** Updates the last turn of a conversation. */
  const updateLast = useCallback(<T extends Turn>(convId: string, fn: (t: T) => T) => {
    setConversations((prev) => {
      const turns = prev[convId] ?? [];
      if (!turns.length) return prev;
      const next = turns.slice();
      next[next.length - 1] = fn(next[next.length - 1] as T);
      return { ...prev, [convId]: next };
    });
  }, []);

  const handleError = (err: unknown): string => {
    if (err instanceof PasswordRequiredError) {
      setNeedPassword(true);
      return "This site is password-protected. Enter the password and send your message again.";
    }
    if (err instanceof DOMException && err.name === "AbortError") return "Stopped.";
    return err instanceof Error ? err.message : String(err);
  };

  async function askExpert(convId: string, history: Turn[], signal: AbortSignal) {
    const update = (fn: (t: ReplyTurn) => ReplyTurn) => updateLast<ReplyTurn>(convId, fn);
    try {
      const result = await streamCall(
        "/api/chat",
        { agent: convId, messages: toApiMessages(history) },
        (e: StreamEvent) => {
          if (e.t === "text") update((t) => ({ ...t, text: t.text + e.d }));
          else if (e.t === "notice") update((t) => ({ ...t, notices: [...t.notices, e.d] }));
          else if (e.t === "meta" || e.t === "done") update((t) => ({ ...t, model: e.model }));
        },
        signal,
      );
      update((t) => ({
        ...t,
        status: result.error ? (result.text ? "partial" : "error") : result.stop === "incomplete" ? "partial" : "done",
        notices: result.error ? [...t.notices, result.error] : t.notices,
      }));
    } catch (err) {
      const msg = handleError(err);
      update((t) => ({ ...t, status: t.text ? "partial" : "error", notices: [...t.notices, msg] }));
    }
  }

  async function askTeam(history: Turn[], signal: AbortSignal) {
    const update = (fn: (t: TeamTurn) => TeamTurn) => updateLast<TeamTurn>(TEAM_ID, fn);
    const updateExpert = (i: number, fn: (e: ExpertRun) => ExpertRun) =>
      update((t) => ({ ...t, experts: t.experts.map((e, j) => (j === i ? fn(e) : e)) }));
    const messages = toApiMessages(history);

    // 1. Marisol plans.
    let plan;
    try {
      plan = await fetchPlan(messages, signal);
    } catch (err) {
      const msg = handleError(err);
      update((t) => ({ ...t, phase: "error", error: msg }));
      return;
    }
    const experts: ExpertRun[] = plan.experts.map((e) => ({ ...e, answer: "", status: "waiting", notices: [] }));
    update((t) => ({ ...t, phase: "experts", assumptions: plan.assumptions, experts }));

    // 2. Experts answer their briefs in parallel.
    await Promise.all(
      experts.map(async (e, i) => {
        updateExpert(i, (x) => ({ ...x, status: "streaming" }));
        // `experts` is this function's own copy, used for the synthesis request below.
        try {
          const r = await streamCall(
            "/api/chat",
            { agent: e.agent, team: true, messages: [{ role: "user", content: e.brief }] },
            (ev) => {
              if (ev.t === "text") {
                experts[i].answer += ev.d;
                updateExpert(i, (x) => ({ ...x, answer: x.answer + ev.d }));
              } else if (ev.t === "notice") updateExpert(i, (x) => ({ ...x, notices: [...x.notices, ev.d] }));
              else if (ev.t === "meta") updateExpert(i, (x) => ({ ...x, model: ev.model }));
            },
            signal,
          );
          const status: ExpertRun["status"] = r.error ? (r.text ? "partial" : "failed") : r.stop === "incomplete" || r.stop === "max_tokens" ? "partial" : "ok";
          experts[i].status = status;
          updateExpert(i, (x) => ({ ...x, status, notices: r.error ? [...x.notices, r.error] : x.notices }));
        } catch (err) {
          const msg = handleError(err);
          const status: ExpertRun["status"] = experts[i].answer ? "partial" : "failed";
          experts[i].status = status;
          updateExpert(i, (x) => ({ ...x, status, notices: [...x.notices, msg] }));
        }
      }),
    );
    if (signal.aborted) {
      update((t) => ({ ...t, phase: "error", error: "Stopped." }));
      return;
    }
    if (experts.every((e) => e.status === "failed")) {
      update((t) => ({ ...t, phase: "error", error: "None of the experts returned an answer, so there is nothing to combine." }));
      return;
    }

    // 3. Marisol synthesizes.
    update((t) => ({ ...t, phase: "synthesizing", synthesisStatus: "streaming" }));
    try {
      const r = await streamCall(
        "/api/synthesize",
        {
          messages,
          assumptions: plan.assumptions,
          results: experts.map((e) => ({ agent: e.agent, brief: e.brief, answer: e.answer, status: e.status })),
        },
        (ev) => {
          if (ev.t === "text") update((t) => ({ ...t, synthesis: t.synthesis + ev.d }));
          else if (ev.t === "notice") update((t) => ({ ...t, notices: [...t.notices, ev.d] }));
        },
        signal,
      );
      update((t) => ({
        ...t,
        phase: r.error && !r.text ? "error" : "done",
        error: r.error,
        synthesisStatus: r.error ? "error" : r.stop === "incomplete" ? "partial" : "done",
      }));
    } catch (err) {
      const msg = handleError(err);
      update((t) => ({ ...t, phase: t.synthesis ? "done" : "error", synthesisStatus: "error", error: msg }));
    }
  }

  async function send(convId: string, text: string) {
    if (busy[convId]) return;
    const userTurn: Turn = { kind: "user", text };
    const history = [...(conversations[convId] ?? []), userTurn];
    const placeholder: Turn =
      convId === TEAM_ID
        ? { kind: "team", phase: "planning", assumptions: "", experts: [], synthesis: "", synthesisStatus: "waiting", notices: [] }
        : { kind: "reply", agent: convId, text: "", status: "streaming", notices: [] };
    setConversations((prev) => ({ ...prev, [convId]: [...history, placeholder] }));

    const controller = new AbortController();
    controllers.current[convId] = controller;
    setBusy((b) => ({ ...b, [convId]: true }));
    try {
      if (convId === TEAM_ID) await askTeam(history, controller.signal);
      else await askExpert(convId, history, controller.signal);
    } finally {
      delete controllers.current[convId];
      setBusy((b) => ({ ...b, [convId]: false }));
    }
  }

  const stop = (convId: string) => controllers.current[convId]?.abort();
  const clear = (convId: string) => {
    stop(convId);
    setConversations((prev) => {
      const next = { ...prev };
      delete next[convId];
      return next;
    });
  };

  return (
    <div className={`app ${sidebarOpen ? "sidebar-open" : ""}`}>
      <Sidebar
        active={active}
        busy={busy}
        onSelect={(id) => {
          setActive(id);
          setSidebarOpen(false);
        }}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="scrim" onClick={() => setSidebarOpen(false)} />
      <ChatView
        key={active}
        convId={active}
        turns={conversations[active] ?? []}
        busy={!!busy[active]}
        onSend={(text) => send(active, text)}
        onStop={() => stop(active)}
        onClear={() => clear(active)}
        onOpenSidebar={() => setSidebarOpen(true)}
        onPickExpert={(id) => setActive(id)}
      />
      {needPassword && <PasswordDialog onClose={() => setNeedPassword(false)} />}
    </div>
  );
}
