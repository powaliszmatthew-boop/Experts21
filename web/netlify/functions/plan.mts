// POST /api/plan — "Ask the whole team", step 1: the orchestrator picks experts and writes briefs.
// Body: { messages: {role, content}[] }  (the team conversation so far, ending with the new question)
// Returns: { assumptions: string, experts: { agent, name, brief }[], model: string }
import type { Config } from "@netlify/functions";
import { getAgent, ORCHESTRATOR_ID, resolveModel, ROUTABLE_AGENT_IDS } from "../shared/team";
import { planSystem } from "../shared/prompts";
import { describeError, effortFromEnv, runToCompletion } from "../shared/claude";
import { checkPassword, errorResponse, HttpError, json, LIMITS, parseMessages, readJson } from "../shared/http";

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    assumptions: {
      type: "string",
      description: "Assumptions made for this question, including any made because the question was ambiguous.",
    },
    experts: {
      type: "array",
      description: "The smallest set of experts that covers the question (usually 2-5, at most 8).",
      items: {
        type: "object",
        properties: {
          agent: { type: "string", enum: ROUTABLE_AGENT_IDS },
          brief: { type: "string", description: "A self-contained brief for this expert." },
        },
        required: ["agent", "brief"],
        additionalProperties: false,
      },
    },
  },
  required: ["assumptions", "experts"],
  additionalProperties: false,
};

export default async (req: Request) => {
  try {
    checkPassword(req);
    const body = await readJson(req);
    const messages = parseMessages(body.messages);
    const orchestrator = getAgent(ORCHESTRATOR_ID)!;
    const model = resolveModel(orchestrator.model);

    let message;
    try {
      message = await runToCompletion({
        model,
        system: planSystem(),
        messages,
        effort: effortFromEnv("EFFORT_PLAN", "low"),
        maxTokens: 16000,
        outputFormat: { type: "json_schema", schema: PLAN_SCHEMA },
      });
    } catch (err) {
      throw new HttpError(502, describeError(err));
    }
    if (message.stop_reason === "refusal") throw new HttpError(422, "The orchestrator declined this request. Try rephrasing it.");
    if (message.stop_reason === "max_tokens") throw new HttpError(502, "The plan was cut off. Try a narrower question.");

    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    let parsed: { assumptions?: unknown; experts?: unknown };
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new HttpError(502, "The orchestrator returned a plan the app couldn't read. Please try again.");
    }

    const seen = new Set<string>();
    const experts = (Array.isArray(parsed.experts) ? parsed.experts : [])
      .filter((e): e is { agent: string; brief: string } => !!e && typeof e.agent === "string" && typeof e.brief === "string")
      .filter((e) => ROUTABLE_AGENT_IDS.includes(e.agent) && e.brief.trim() && !seen.has(e.agent) && seen.add(e.agent))
      .slice(0, LIMITS.maxExperts)
      .map((e) => ({ agent: e.agent, name: getAgent(e.agent)!.name, brief: e.brief.slice(0, LIMITS.maxMessageChars) }));
    if (experts.length === 0) throw new HttpError(502, "The orchestrator didn't pick any experts. Please try again.");

    return json(200, {
      assumptions: typeof parsed.assumptions === "string" ? parsed.assumptions : "",
      experts,
      model: message.model,
    });
  } catch (err) {
    return errorResponse(err);
  }
};

export const config: Config = { path: "/api/plan", method: "POST" };
