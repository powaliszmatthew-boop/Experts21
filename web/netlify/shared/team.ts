// Server-side view of the team, generated at build time by scripts/build-team.mjs.
import teamData from "./team.generated.ts";

export interface Skill {
  name: string;
  description: string;
  path: string;
  content: string;
}

export interface Agent {
  id: string;
  name: string;
  title: string;
  group: string;
  model: string;
  color: string;
  description: string;
  voice: string;
  workingStyle: string;
  sourcePath: string;
  prompt: string;
  skills: Skill[];
  knowledge: {
    folder: string;
    files: { path: string; content: string }[];
    skipped: { path: string; reason: string }[];
  };
}

interface Team {
  generatedAt: string;
  docs: { path: string; content: string }[];
  agents: Agent[];
  extraSkills: Record<string, Skill>;
}

export const team = teamData as Team;

export const ORCHESTRATOR_ID = "expert-orchestrator";

/** Agents the orchestrator may brief (never itself or team-builder, per its own rules). */
export const ROUTABLE_AGENT_IDS = team.agents
  .map((a) => a.id)
  .filter((id) => id !== ORCHESTRATOR_ID && id !== "team-builder");

export function getAgent(id: string): Agent | undefined {
  return team.agents.find((a) => a.id === id);
}

/**
 * Maps an agent's `model` frontmatter (opus / sonnet / haiku / fable / inherit / full ID)
 * to a Claude API model ID. `inherit` has no parent conversation here, so it uses Opus.
 */
export function resolveModel(model: string): string {
  switch (model) {
    case "opus":
    case "inherit":
      return "claude-opus-5-5";
    case "sonnet":
      return "claude-sonnet-5-5";
    case "haiku":
      return "claude-haiku-5-5";
    case "fable":
      return "claude-fable-5-2";
    default:
      return model.startsWith("claude-") ? model : "claude-opus-5-5";
  }
}
