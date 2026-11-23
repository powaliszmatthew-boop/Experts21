// POST /api/synthesize — "Ask the whole team", step 3: the orchestrator combines the experts' answers.
// Body: {
//   messages: {role, content}[]   the team conversation so far, ending with the new question
//   assumptions: string           from the plan
//   results: { agent, brief, answer, status: "ok" | "partial" | "failed" }[]
// }
import { getAgent, ORCHESTRATOR_ID, resolveModel } from "../shared/team.ts";
import { synthesisSystem } from "../shared/prompts.ts";
import { checkPassword, effortFromEnv, errorResponse, HttpError, LIMITS, parseMessages, readJson, streamClaude } from "../shared/server.ts";

const escapeAttr = (s: string) => s.replace(/[<>&"]/g, "");

export default async (req: Request) => {
  try {
    checkPassword(req);
    const body = await readJson(req);
    const messages = parseMessages(body.messages);
    const assumptions = typeof body.assumptions === "string" ? body.assumptions.slice(0, LIMITS.maxMessageChars) : "";
    if (!Array.isArray(body.results) || body.results.length === 0) throw new HttpError(400, "results must be a non-empty array");

    const answers = body.results.slice(0, LIMITS.maxExperts).map((r: unknown) => {
      const { agent, brief, answer, status } = (r ?? {}) as Record<string, unknown>;
      const a = typeof agent === "string" ? getAgent(agent) : undefined;
      if (!a) throw new HttpError(400, "Unknown agent in results");
      const s = status === "ok" || status === "partial" ? status : "failed";
      const text = typeof answer === "string" ? answer.slice(0, LIMITS.maxExpertAnswerChars) : "";
      const b = typeof brief === "string" ? brief.slice(0, LIMITS.maxMessageChars) : "";
      return `<expert_answer agent="${escapeAttr(a.id)}" name="${escapeAttr(a.name)}" status="${s}">\n<brief>\n${b}\n</brief>\n<answer>\n${text || "(no answer returned)"}\n</answer>\n</expert_answer>`;
    });

    const question = messages[messages.length - 1].content as string;
    const finalTurn =
      `The consultant's question:\n<question>\n${question}\n</question>\n\n` +
      `Your planning assumptions:\n<assumptions>\n${assumptions || "(none stated)"}\n</assumptions>\n\n` +
      `The experts' answers (status "partial" means the answer was cut off; "failed" means none came back):\n\n${answers.join("\n\n")}\n\n` +
      `Now write the combined answer for the consultant.`;

    return await streamClaude(
      {
        model: resolveModel(getAgent(ORCHESTRATOR_ID)!.model),
        system: synthesisSystem(),
        messages: [...messages.slice(0, -1), { role: "user", content: finalTurn }],
        effort: effortFromEnv("EFFORT_SYNTHESIS", "medium"),
        maxTokens: 32000,
      },
      req,
    );
  } catch (err) {
    return errorResponse(err);
  }
};

// Route: see [[edge_functions]] in netlify.toml at the repo root.
