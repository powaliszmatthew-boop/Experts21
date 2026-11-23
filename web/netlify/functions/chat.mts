// POST /api/chat — streams one expert's answer.
// Body: { agent: string, messages: {role, content}[], team?: boolean }
//   team: true when the orchestrator's brief is being answered in "Ask the whole team" mode.
import type { Config } from "@netlify/functions";
import { getAgent, resolveModel } from "../shared/team";
import { expertSystem, teamExpertSystem } from "../shared/prompts";
import { effortFromEnv, streamToBrowser } from "../shared/claude";
import { checkPassword, errorResponse, HttpError, parseMessages, readJson } from "../shared/http";

export default async (req: Request) => {
  try {
    checkPassword(req);
    const body = await readJson(req);
    const agent = typeof body.agent === "string" ? getAgent(body.agent) : undefined;
    if (!agent) throw new HttpError(400, "Unknown agent");
    const messages = parseMessages(body.messages);
    const isTeam = body.team === true;
    return streamToBrowser(
      {
        model: resolveModel(agent.model),
        system: isTeam ? teamExpertSystem(agent) : expertSystem(agent),
        messages,
        effort: isTeam ? effortFromEnv("EFFORT_TEAM_EXPERT", "low") : effortFromEnv("EFFORT_CHAT", "medium"),
        maxTokens: 16000,
      },
      req.signal,
    );
  } catch (err) {
    return errorResponse(err);
  }
};

export const config: Config = { path: "/api/chat", method: "POST" };
