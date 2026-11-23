// Request validation and the optional shared password.
import type Anthropic from "@anthropic-ai/sdk";

export const LIMITS = {
  maxMessages: 40,
  maxMessageChars: 20_000,
  maxBodyBytes: 400_000,
  maxExperts: 8,
  maxExpertAnswerChars: 30_000,
};

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return json(err.status, { error: err.message });
  console.error(err);
  return json(500, { error: err instanceof Error ? err.message : "Server error" });
}

/**
 * If APP_PASSWORD is set in Netlify, every API call must send it in the x-app-password header.
 * Without it, anyone who finds the site URL can spend your API credits.
 */
export function checkPassword(req: Request): void {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return;
  if (req.headers.get("x-app-password") !== expected) throw new HttpError(401, "Password required");
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  if (req.method !== "POST") throw new HttpError(405, "Use POST");
  const text = await req.text();
  if (text.length > LIMITS.maxBodyBytes) throw new HttpError(413, "Request too large");
  try {
    const data = JSON.parse(text);
    if (data && typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  throw new HttpError(400, "Body must be a JSON object");
}

/** Validates a plain-text chat history: alternating user/assistant turns, ending with a user turn. */
export function parseMessages(value: unknown): Anthropic.Beta.BetaMessageParam[] {
  if (!Array.isArray(value) || value.length === 0) throw new HttpError(400, "messages must be a non-empty array");
  const messages = value.slice(-LIMITS.maxMessages).map((m, i) => {
    if (!m || typeof m !== "object") throw new HttpError(400, `messages[${i}] is invalid`);
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") throw new HttpError(400, `messages[${i}].role must be user or assistant`);
    if (typeof content !== "string" || !content.trim()) throw new HttpError(400, `messages[${i}].content must be text`);
    if (content.length > LIMITS.maxMessageChars) throw new HttpError(413, `messages[${i}] is too long`);
    return { role, content } as Anthropic.Beta.BetaMessageParam;
  });
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    throw new HttpError(400, "The last message must be from the user");
  }
  return messages;
}
