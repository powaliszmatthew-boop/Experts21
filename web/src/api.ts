// Browser side of the API. All Claude calls go through /api/* Netlify Functions.
import type { Turn } from "./types";

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

/** POSTs to a streaming endpoint and calls onEvent for each NDJSON line. */
export async function streamCall(
  path: string,
  body: unknown,
  onEvent: (e: StreamEvent) => void,
  signal: AbortSignal,
): Promise<StreamResult> {
  const res = await fetch(path, { method: "POST", headers: headers(), body: JSON.stringify(body), signal });
  if (!res.ok || !res.body) throw await failure(res);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  const result: StreamResult = { text: "", stop: null };
  let sawDone = false;
  const handle = (line: string) => {
    if (!line.trim()) return;
    let e: StreamEvent;
    try {
      e = JSON.parse(line);
    } catch {
      return;
    }
    if (e.t === "text") result.text += e.d;
    if (e.t === "error") result.error = e.d;
    if (e.t === "done") {
      result.stop = e.stop;
      sawDone = true;
    }
    onEvent(e);
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(handle);
  }
  handle(buffer);
  if (!sawDone && !result.error) {
    result.stop = "timeout";
    onEvent({ t: "notice", d: "The connection ended before the answer finished (likely Netlify's 60-second limit). The answer is partial." });
  }
  return result;
}

export interface Plan {
  assumptions: string;
  experts: { agent: string; name: string; brief: string }[];
  model: string;
}

export async function fetchPlan(messages: ApiMessage[], signal: AbortSignal): Promise<Plan> {
  const res = await fetch("/api/plan", { method: "POST", headers: headers(), body: JSON.stringify({ messages }), signal });
  if (!res.ok) throw await failure(res);
  return res.json();
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
