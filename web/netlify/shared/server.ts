// Claude API calls and request handling for the Netlify Edge Functions.
// The API key is read on the server and never reaches the browser.
//
// Why edge functions: regular Netlify Functions stop after 10-60 seconds depending on the
// account, and an Opus answer can take longer. Edge functions have no wall-clock limit once
// the response has started; they only limit CPU time (50 ms, not counting time spent waiting
// for the network). So these handlers do almost no work themselves: they build the request,
// open a streaming call to the Claude API, and pipe the API's server-sent events straight to
// the browser without parsing them. The browser reads the events (src/api.ts).
import Anthropic from "@anthropic-ai/sdk";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

const EFFORTS: Effort[] = ["low", "medium", "high", "xhigh", "max"];

export const LIMITS = {
  maxMessages: 40,
  maxMessageChars: 20_000,
  maxBodyBytes: 400_000,
  maxExperts: 8,
  maxExpertAnswerChars: 30_000,
};

function env(name: string): string | undefined {
  return Netlify.env.get(name) || undefined;
}

export function effortFromEnv(name: string, fallback: Effort): Effort {
  const v = env(name)?.trim().toLowerCase();
  return EFFORTS.includes(v as Effort) ? (v as Effort) : fallback;
}

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
  return json(502, { error: describeError(err) });
}

/**
 * If APP_PASSWORD is set in Netlify, every API call must send it in the x-app-password header.
 * Without it, anyone who finds the site URL can spend your API credits.
 */
export function checkPassword(req: Request): void {
  const expected = env("APP_PASSWORD");
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

/** Validates a plain-text chat history ending with a user turn. */
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

let client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = env("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new HttpError(
      500,
      "ANTHROPIC_API_KEY is not set. Add it in Netlify (Project configuration > Environment variables, scope must include Functions), then redeploy.",
    );
  }
  client ??= new Anthropic({ apiKey, maxRetries: 1 });
  return client;
}

/** Models with server-side refusal fallback. Claude Haiku 5.5 has none. */
function supportsFallback(model: string): boolean {
  return model.startsWith("claude-opus-5") || model.startsWith("claude-sonnet-5-5") || model.startsWith("claude-fable-5");
}

export interface CallOptions {
  model: string;
  system: Anthropic.Beta.BetaTextBlockParam[];
  messages: Anthropic.Beta.BetaMessageParam[];
  effort: Effort;
  maxTokens: number;
  outputFormat?: Anthropic.Beta.BetaJSONOutputFormat;
}

function buildParams(o: CallOptions, withFallback: boolean): Anthropic.Beta.MessageCreateParamsStreaming {
  return {
    model: o.model,
    max_tokens: o.maxTokens,
    system: o.system,
    messages: o.messages,
    stream: true,
    thinking: { type: "adaptive" },
    output_config: { effort: o.effort, ...(o.outputFormat ? { format: o.outputFormat } : {}) },
    ...(withFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  };
}

export function describeError(err: unknown): string {
  if (err instanceof HttpError) return err.message;
  if (err instanceof Anthropic.AuthenticationError) return "The Claude API rejected the API key. Check ANTHROPIC_API_KEY in Netlify.";
  if (err instanceof Anthropic.PermissionDeniedError) return `The API key isn't allowed to do this: ${err.message}`;
  if (err instanceof Anthropic.NotFoundError) return `Not found (is the model available to your account?): ${err.message}`;
  if (err instanceof Anthropic.RateLimitError) return "Rate limited by the Claude API. Wait a minute and try again.";
  if (err instanceof Anthropic.BadRequestError) return `The Claude API rejected the request: ${err.message}`;
  if (err instanceof Anthropic.APIError) return `Claude API error ${err.status ?? ""}: ${err.message}`.trim();
  return err instanceof Error ? err.message : String(err);
}

/**
 * Opens a streaming Claude call and returns the API's server-sent-event stream as the response.
 * Errors that happen before the stream starts (bad key, bad request, rate limit) come back as
 * JSON with an error message. If the account can't use server-side fallback, the call is retried
 * once without it.
 */
export async function streamClaude(o: CallOptions, req: Request): Promise<Response> {
  const claude = getClient();
  const open = (withFallback: boolean) =>
    claude.beta.messages.create(buildParams(o, withFallback), { signal: req.signal }).asResponse();

  let upstream: Response;
  const fallback = supportsFallback(o.model);
  try {
    upstream = await open(fallback);
  } catch (err) {
    if (!(fallback && err instanceof Anthropic.BadRequestError)) throw err;
    console.warn("Request with server-side fallback was rejected; retrying without it:", err.message);
    upstream = await open(false);
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-model": o.model,
    },
  });
}
