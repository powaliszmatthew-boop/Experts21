// POST /api/plan — "Ask the whole team", step 1: the orchestrator picks experts and writes briefs.
// Body: { messages: {role, content}[] }  (the team conversation so far, ending with the new question)
// Streams the Claude API's server-sent events. The answer text is a JSON object matching
// PLAN_SCHEMA; the browser collects it and checks it (src/App.tsx).
import { getAgent, ORCHESTRATOR_ID, resolveModel, ROUTABLE_AGENT_IDS } from "../shared/team.ts";
import { planSystem } from "../shared/prompts.ts";
import { checkPassword, effortFromEnv, errorResponse, parseMessages, readJson, streamClaude } from "../shared/server.ts";

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
    return await streamClaude(
      {
        model: resolveModel(getAgent(ORCHESTRATOR_ID)!.model),
        system: planSystem(),
        messages,
        effort: effortFromEnv("EFFORT_PLAN", "low"),
        maxTokens: 32000,
        outputFormat: { type: "json_schema", schema: PLAN_SCHEMA },
      },
      req,
    );
  } catch (err) {
    return errorResponse(err);
  }
};

// Route: see [[edge_functions]] in netlify.toml at the repo root.
