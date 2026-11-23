// POST /api/chat — streams one expert's answer (Claude API server-sent events).
// Body: { agent: string, messages: {role, content}[], team?: boolean }
//   team: true when an expert is answering the orchestrator's brief in "Ask the whole team" mode.
import { getAgent, resolveModel } from "../shared/team.ts";
import { expertSystem, teamExpertSystem } from "../shared/prompts.ts";
import { checkPassword, effortFromEnv, errorResponse, HttpError, parseMessages, readJson, streamClaude } from "../shared/server.ts";

export default async (req: Request) => {
  try {
    checkPassword(req);
    const body = await readJson(req);
    const agent = typeof body.agent === "string" ? getAgent(body.agent) : undefined;
    if (!agent) throw new HttpError(400, "Unknown agent");
    const messages = parseMessages(body.messages);
    const isTeam = body.team === true;
    return await streamClaude(
      {
        model: resolveModel(agent.model),
        system: isTeam ? teamExpertSystem(agent) : expertSystem(agent),
        messages,
        effort: isTeam ? effortFromEnv("EFFORT_TEAM_EXPERT", "low") : effortFromEnv("EFFORT_CHAT", "medium"),
        maxTokens: 32000,
      },
      req,
    );
  } catch (err) {
    return errorResponse(err);
  }
};

// Route: see [[edge_functions]] in netlify.toml at the repo root.
