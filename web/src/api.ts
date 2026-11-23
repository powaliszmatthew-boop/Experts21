// Browser side of the API. All Claude calls go through /api/* Netlify Functions.
import { agentById, ORCHESTRATOR_ID, type Turn } from "./types";

const PASSWORD_KEY = "experts21.password";

export class PasswordRequiredError extends Error {}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export const passwordStore = {
  get: () => safeGet(PASSWORD_KEY),
  set: (v: string | null) => safeSet(PASSWORD_KEY, v),
};

function headers(): HeadersInit {
  const h: Record<string, string> = { "content-type": "application/json" };
  const pw = passwordStore.get();
  if (pw) h["x-app-password"] = pw;
  return h;
}

async function failure(res: Response): Promise<Error> {
  if (res.status === 401) return new PasswordRequiredError("Password required");
  let message = `${res.status} ${res.statusText}`;
  try {
    const data = await res.json();
    if (data?.error) message = data.error;
  } catch {
    if (res.status === 404) message = "API not found. If you're running locally, use `netlify dev` (see web/README.md).";
  }
  return new Error(message);
}

export type StreamEvent =
  | { t: "meta"; model: string }
  | { t: "text"; d: string }
  | { t: "notice"; d: string }
  | { t: "error"; d: string }
  | { t: "done"; stop: string | null; model: string };

export interface StreamResult {
  text: string;
  stop: string | null;
  error?: string;
}

interface SseEvent {
  type: string;
  message?: { model?: string };
  content_block?: { type: string; from?: { model?: string }; to?: { model?: string } };
  delta?: { type?: string; text?: string; stop_reason?: string | null };
  error?: { type?: string; message?: string };
}

/**
 * POSTs to an /api/* endpoint, which returns the Claude API's server-sent event stream unchanged,
 * and turns the events into simple text / notice / error / done callbacks.
 */
export async function streamCall(
  path: string,
  body: unknown,
  onEvent: (e: StreamEvent) => void,
  signal: AbortSignal,
): Promise<StreamResult> {
  const send = () => fetch(path, { method: "POST", headers: headers(), body: JSON.stringify(body), signal });
  let res = await send();
  // A gateway error from Netlify itself (not a JSON error from our code) is usually a one-off,
  // such as a cold start. Retry once.
  if ([502, 503, 504].includes(res.status) && !(res.headers.get("content-type") ?? "").includes("application/json")) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await send();
  }
  if (!res.ok || !res.body) throw await failure(res);
  if (!(res.headers.get("content-type") ?? "").includes("text/event-stream")) {
    throw new Error("The server returned an unexpected response. Check that the latest deploy finished in Netlify.");
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  const result: StreamResult = { text: "", stop: null };
  let finished = false;
  let model = res.headers.get("x-model") ?? "";

  const handle = (raw: string) => {
    const data = raw
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trimStart())
      .join("\n");
    if (!data) return;
    let e: SseEvent;
    try {
      e = JSON.parse(data);
    } catch {
      return;
    }
    switch (e.type) {
      case "message_start":
        if (e.message?.model) model = e.message.model;
        onEvent({ t: "meta", model });
        break;
      case "content_block_start":
        if (e.content_block?.type === "fallback") {
          onEvent({ t: "notice", d: `${e.content_block.from?.model} declined this request; ${e.content_block.to?.model} answered instead.` });
        }
        break;
      case "content_block_delta":
        if (e.delta?.type === "text_delta" && e.delta.text) {
          result.text += e.delta.text;
          onEvent({ t: "text", d: e.delta.text });
        }
        break;
      case "message_delta":
        if (e.delta?.stop_reason) result.stop = e.delta.stop_reason;
        break;
      case "message_stop":
        finished = true;
        if (result.stop === "refusal") onEvent({ t: "notice", d: "The model declined to answer this request. Try rephrasing it." });
        if (result.stop === "max_tokens") onEvent({ t: "notice", d: "The answer hit the length limit and was cut off. Ask a narrower question or say \"continue\"." });
        onEvent({ t: "done", stop: result.stop, model });
        break;
      case "error":
        result.error =
          e.error?.type === "overloaded_error"
            ? "The Claude API is overloaded right now. Try again in a minute."
            : `Claude API error: ${e.error?.message ?? e.error?.type ?? "unknown"}`;
        onEvent({ t: "error", d: result.error });
        break;
    }
  };

  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value.replace(/\r\n/g, "\n");
    let idx;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      handle(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 2);
    }
  }
  handle(buffer);
  if (!finished && !result.error) {
    result.stop = "incomplete";
    onEvent({ t: "notice", d: "The connection ended before the answer finished, so the answer is partial. Try again." });
  }
  return result;
}

export interface Plan {
  assumptions: string;
  experts: { agent: string; name: string; brief: string }[];
}

const MAX_EXPERTS = 8;

/** Step 1 of team mode: streams the orchestrator's plan (a JSON object) and checks it. */
export async function fetchPlan(messages: ApiMessage[], signal: AbortSignal): Promise<Plan> {
  const r = await streamCall("/api/plan", { messages }, () => {}, signal);
  if (r.error) throw new Error(r.error);
  if (r.stop === "refusal") throw new Error("The orchestrator declined this request. Try rephrasing it.");
  if (r.stop !== "end_turn") throw new Error("The orchestrator's plan was cut off. Please try again.");
  let parsed: { assumptions?: unknown; experts?: unknown };
  try {
    parsed = JSON.parse(r.text);
  } catch {
    throw new Error("The orchestrator returned a plan the app couldn't read. Please try again.");
  }
  const seen = new Set<string>();
  const experts = (Array.isArray(parsed.experts) ? parsed.experts : [])
    .filter((e): e is { agent: string; brief: string } => !!e && typeof e.agent === "string" && typeof e.brief === "string")
    .filter((e) => {
      const ok = e.agent !== ORCHESTRATOR_ID && e.agent !== "team-builder" && !!agentById(e.agent) && !!e.brief.trim() && !seen.has(e.agent);
      if (ok) seen.add(e.agent);
      return ok;
    })
    .slice(0, MAX_EXPERTS)
    .map((e) => ({ agent: e.agent, name: agentById(e.agent)!.name, brief: e.brief }));
  if (experts.length === 0) throw new Error("The orchestrator didn't pick any experts. Please try again.");
  return { assumptions: typeof parsed.assumptions === "string" ? parsed.assumptions : "", experts };
}

export interface ApiMessage {
  role: "user" | "assistant";
  content: string;
}

/** Plain-text history for the API: user turns plus each finished answer. */
export function toApiMessages(turns: Turn[]): ApiMessage[] {
  const out: ApiMessage[] = [];
  for (const t of turns) {
    if (t.kind === "user") out.push({ role: "user", content: t.text });
    else if (t.kind === "reply" && t.text.trim() && t.status !== "error") out.push({ role: "assistant", content: t.text });
    else if (t.kind === "team" && t.synthesis.trim()) out.push({ role: "assistant", content: t.synthesis });
  }
  return out;
}
