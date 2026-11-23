import { useEffect, useRef, useState } from "react";
import { Avatar, ModelBadge } from "./Avatar";
import { Markdown } from "./Markdown";
import { agentById, modelLabel, ORCHESTRATOR_ID, TEAM_ID, type ExpertRun, type ReplyTurn, type TeamTurn, type Turn } from "../types";

interface Props {
  convId: string;
  turns: Turn[];
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
  onOpenSidebar: () => void;
  onPickExpert: (id: string) => void;
}

const TEAM_EXAMPLES = [
  "Should we open in Brickell or Coral Gables?",
  "We have $300,000 in total capital. Is that enough to open a 1,200 sq ft café with 30 seats in the City of Miami?",
  "What should our opening menu and prices be?",
  "What are the five things most likely to make this shop fail, and what do we do about each?",
];

/** Turns raw model IDs from the API into short labels, e.g. claude-opus-5-5 -> Opus 5.5. */
function servedLabel(model?: string): string | undefined {
  const m = model?.match(/^claude-([a-z]+)-(\d+)(?:-(\d+))?/);
  if (!m) return model;
  return `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}${m[3] ? "." + m[3] : ""}`;
}

export function ChatView({ convId, turns, busy, onSend, onStop, onClear, onOpenSidebar, onPickExpert }: Props) {
  const isTeam = convId === TEAM_ID;
  const agent = agentById(isTeam ? ORCHESTRATOR_ID : convId);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    if (stick.current) endRef.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  const submit = (text = draft) => {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setDraft("");
    stick.current = true;
  };

  const title = isTeam ? "Ask the whole team" : agent ? `${agent.name}, ${agent.title}` : convId;

  return (
    <main className="chat">
      <header className="chat-head">
        <button className="icon-btn menu-btn" onClick={onOpenSidebar} aria-label="Open experts menu">
          ☰
        </button>
        {agent && <Avatar name={isTeam ? "✦" : agent.name} color={agent.color} size={40} />}
        <div className="chat-head-text">
          <h1>
            {title} {agent && <ModelBadge label={modelLabel(agent.model)} />}
          </h1>
          <p>
            {isTeam
              ? `${agent?.name ?? "The orchestrator"} picks the experts, briefs them in parallel, and combines their answers into one.`
              : `${agent?.voice} ${agent?.workingStyle}`}
          </p>
        </div>
        {turns.length > 0 && (
          <button className="btn ghost small" onClick={onClear} title="Delete this conversation">
            Clear
          </button>
        )}
      </header>

      <div
        className="messages"
        ref={scrollRef}
        onScroll={() => {
          const el = scrollRef.current;
          if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {turns.length === 0 && (
          <div className="empty">
            {isTeam ? (
              <>
                <h2>Ask the whole team</h2>
                <p>Your question goes to {agent?.name ?? "the orchestrator"}, who brings in the right specialists. Try one of these:</p>
              </>
            ) : (
              <>
                <h2>Chat with {agent?.name}</h2>
                <p>{agent?.description}</p>
                <p className="meta">
                  Skills: {agent?.skills.join(", ") || "none"}
                  <br />
                  Knowledge folder: {agent?.knowledgeFiles.length ?? 0} file(s) · Shared research: docs/
                </p>
              </>
            )}
            <div className="examples">
              {(isTeam ? TEAM_EXAMPLES : ["Introduce yourself and tell me what you can help with.", `What are the first three things you'd want to know about our plan?`]).map(
                (ex) => (
                  <button key={ex} className="example" onClick={() => submit(ex)}>
                    {ex}
                  </button>
                ),
              )}
            </div>
          </div>
        )}

        {turns.map((t, i) =>
          t.kind === "user" ? (
            <div key={i} className="msg user">
              <div className="bubble">{t.text}</div>
            </div>
          ) : t.kind === "reply" ? (
            <Reply key={i} turn={t} />
          ) : (
            <TeamReply key={i} turn={t} onPickExpert={onPickExpert} />
          ),
        )}
        <div ref={endRef} />
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={isTeam ? "Ask the whole team…" : `Message ${agent?.name ?? "the expert"}…`}
          rows={2}
          aria-label="Message"
        />
        {busy ? (
          <button type="button" className="btn stop" onClick={onStop}>
            Stop
          </button>
        ) : (
          <button type="submit" className="btn primary" disabled={!draft.trim()}>
            Send
          </button>
        )}
      </form>
      <p className="disclaimer">
        Research-level advice only. Legal, tax and insurance answers need sign-off from a licensed Florida professional. Experts can't browse the web here, so
        re-check time-sensitive figures.
      </p>
    </main>
  );
}

function Notices({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="notices">
      {items.map((n, i) => (
        <li key={i}>{n}</li>
      ))}
    </ul>
  );
}

function Typing({ label }: { label: string }) {
  return (
    <div className="typing">
      <span className="pulse" />
      {label}
    </div>
  );
}

function Reply({ turn }: { turn: ReplyTurn }) {
  const a = agentById(turn.agent);
  return (
    <div className="msg assistant">
      {a && <Avatar name={a.name} color={a.color} size={32} />}
      <div className="bubble">
        <div className="who">
          {a?.name ?? turn.agent}
          {turn.model && <span className="served">{servedLabel(turn.model)}</span>}
        </div>
        {turn.text ? <Markdown text={turn.text} /> : turn.status === "streaming" ? <Typing label="Thinking…" /> : null}
        <Notices items={turn.notices} />
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<ExpertRun["status"], string> = {
  waiting: "Waiting",
  streaming: "Working…",
  ok: "Done",
  partial: "Partial",
  failed: "Failed",
};

function ExpertCard({ run, onPickExpert }: { run: ExpertRun; onPickExpert: (id: string) => void }) {
  const a = agentById(run.agent);
  return (
    <details className={`expert-card status-${run.status}`}>
      <summary>
        {a && <Avatar name={a.name} color={a.color} size={26} />}
        <span className="expert-name">
          <strong>{run.name}</strong> <span>{a?.title}</span>
        </span>
        <span className={`status status-${run.status}`}>{STATUS_LABEL[run.status]}</span>
      </summary>
      <div className="expert-body">
        <div className="brief">
          <div className="label">Brief from the orchestrator</div>
          <Markdown text={run.brief} />
        </div>
        {run.answer ? <Markdown text={run.answer} /> : run.status === "streaming" ? <Typing label="Thinking…" /> : null}
        <Notices items={run.notices} />
        <button className="btn ghost small" onClick={() => onPickExpert(run.agent)}>
          Follow up with {run.name} directly →
        </button>
      </div>
    </details>
  );
}

function TeamReply({ turn, onPickExpert }: { turn: TeamTurn; onPickExpert: (id: string) => void }) {
  const orch = agentById(ORCHESTRATOR_ID);
  const done = turn.experts.filter((e) => e.status === "ok" || e.status === "partial" || e.status === "failed").length;
  return (
    <div className="msg assistant team">
      {orch && <Avatar name="✦" color={orch.color} size={32} />}
      <div className="bubble">
        <div className="who">{orch?.name ?? "Orchestrator"} · the whole team</div>

        {turn.phase === "planning" && <Typing label={`${orch?.name ?? "The orchestrator"} is choosing experts and writing their briefs…`} />}

        {turn.experts.length > 0 && (
          <div className="team-progress">
            <div className="label">
              Experts consulted ({done}/{turn.experts.length} finished)
            </div>
            {turn.assumptions && (
              <details className="assumptions">
                <summary>Assumptions</summary>
                <Markdown text={turn.assumptions} />
              </details>
            )}
            {turn.experts.map((e) => (
              <ExpertCard key={e.agent} run={e} onPickExpert={onPickExpert} />
            ))}
          </div>
        )}

        {turn.phase === "synthesizing" && !turn.synthesis && <Typing label={`${orch?.name ?? "The orchestrator"} is combining the answers…`} />}
        {turn.synthesis && (
          <div className="synthesis">
            <Markdown text={turn.synthesis} />
          </div>
        )}
        <Notices items={turn.notices} />
        {turn.error && <div className="error-box">{turn.error}</div>}
      </div>
    </div>
  );
}
