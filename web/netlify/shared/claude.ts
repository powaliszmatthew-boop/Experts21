// Claude API calls. Runs only inside Netlify Functions; the API key never reaches the browser.
import Anthropic from "@anthropic-ai/sdk";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/** Netlify stops a synchronous function at 60 s; stop a little earlier so we can say so cleanly. */
export const DEADLINE_MS = 52_000;

const EFFORTS: Effort[] = ["low", "medium", "high", "xhigh", "max"];

export function effortFromEnv(name: string, fallback: Effort): Effort {
  const v = process.env[name]?.trim().toLowerCase();
  return EFFORTS.includes(v as Effort) ? (v as Effort) : fallback;
}

let client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ConfigError("ANTHROPIC_API_KEY is not set. Add it in Netlify: Project configuration > Environment variables, then redeploy.");
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1 });
  return client;
}

export class ConfigError extends Error {}

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

export function buildParams(o: CallOptions): Anthropic.Beta.MessageCreateParamsStreaming {
  const fallback = supportsFallback(o.model);
  return {
    model: o.model,
    max_tokens: o.maxTokens,
    system: o.system,
    messages: o.messages,
    stream: true,
    thinking: { type: "adaptive" },
    output_config: { effort: o.effort, ...(o.outputFormat ? { format: o.outputFormat } : {}) },
    ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  };
}

export function describeError(err: unknown): string {
  if (err instanceof ConfigError) return err.message;
  if (err instanceof Anthropic.AuthenticationError) return "The Claude API rejected the API key. Check ANTHROPIC_API_KEY in Netlify.";
  if (err instanceof Anthropic.PermissionDeniedError) return `The API key isn't allowed to do this: ${err.message}`;
  if (err instanceof Anthropic.NotFoundError) return `Not found (is the model available to your account?): ${err.message}`;
  if (err instanceof Anthropic.RateLimitError) return "Rate limited by the Claude API. Wait a minute and try again.";
  if (err instanceof Anthropic.BadRequestError) return `The Claude API rejected the request: ${err.message}`;
  if (err instanceof Anthropic.APIError) return `Claude API error ${err.status ?? ""}: ${err.message}`.trim();
  if (err instanceof Error && err.name === "AbortError") return "The request was cancelled.";
  return err instanceof Error ? err.message : String(err);
}

/** One line of the newline-delimited JSON stream sent to the browser. */
export type StreamEvent =
  | { t: "meta"; model: string }
  | { t: "text"; d: string }
  | { t: "notice"; d: string }
  | { t: "error"; d: string }
  | { t: "done"; stop: string | null; model: string; usage?: Record<string, number | null> };

const encoder = new TextEncoder();

/**
 * Streams one Claude call to the browser as NDJSON. Text deltas are forwarded as they arrive.
 * The call is cut at DEADLINE_MS so the browser gets a clear notice instead of a dropped connection.
 */
export function streamToBrowser(o: CallOptions, requestSignal?: AbortSignal): Response {
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: StreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      const abort = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        abort.abort();
      }, DEADLINE_MS);
      requestSignal?.addEventListener("abort", () => abort.abort());

      try {
        send({ t: "meta", model: o.model });
        const stream = getClient().beta.messages.stream(buildParams(o), { signal: abort.signal });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send({ t: "text", d: event.delta.text });
          } else if (event.type === "content_block_start" && event.content_block.type === "fallback") {
            const b = event.content_block;
            send({ t: "notice", d: `${b.from.model} declined this request; ${b.to.model} answered instead.` });
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          send({ t: "notice", d: "The model declined to answer this request. Try rephrasing it." });
        } else if (final.stop_reason === "max_tokens") {
          send({ t: "notice", d: "The answer hit the length limit and was cut off. Ask a narrower question or say \"continue\"." });
        }
        send({
          t: "done",
          stop: final.stop_reason,
          model: final.model,
          usage: {
            input_tokens: final.usage.input_tokens,
            output_tokens: final.usage.output_tokens,
            cache_read_input_tokens: final.usage.cache_read_input_tokens ?? null,
            cache_creation_input_tokens: final.usage.cache_creation_input_tokens ?? null,
          },
        });
      } catch (err) {
        if (timedOut) {
          send({
            t: "notice",
            d: "Stopped after ~50 seconds (Netlify's 60-second function limit). The answer above is partial. Ask a narrower question or say \"continue\".",
          });
          send({ t: "done", stop: "timeout", model: o.model });
        } else {
          console.error("Claude call failed:", err);
          send({ t: "error", d: describeError(err) });
        }
      } finally {
        clearTimeout(timer);
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

/** Runs one call to completion (used for the JSON plan) and returns the final message. */
export async function runToCompletion(o: CallOptions): Promise<Anthropic.Beta.BetaMessage> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), DEADLINE_MS);
  try {
    const stream = getClient().beta.messages.stream(buildParams(o), { signal: abort.signal });
    return await stream.finalMessage();
  } catch (err) {
    if (abort.signal.aborted) throw new Error("Planning took longer than ~50 seconds (Netlify's 60-second function limit). Try again or ask a narrower question.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
