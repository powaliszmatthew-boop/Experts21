import roster from "./generated/roster.generated.json";

export interface RosterAgent {
  id: string;
  name: string;
  title: string;
  group: string;
  model: string;
  color: string;
  description: string;
  voice: string;
  workingStyle: string;
  skills: string[];
  knowledgeFiles: string[];
}

export const AGENTS = roster.agents as RosterAgent[];
export const ORCHESTRATOR_ID = "expert-orchestrator";
export const TEAM_ID = "__team__";

export const GROUP_ORDER = [
  "Infrastructure",
  "Strategy",
  "Market & Customer",
  "Real Estate & Build-Out",
  "Legal & Regulatory",
  "Finance",
  "Coffee & Product",
  "Operations & People",
  "Marketing & Growth",
];

export function agentById(id: string): RosterAgent | undefined {
  return AGENTS.find((a) => a.id === id);
}

/** Friendly label for an agent's `model` frontmatter (resolved the same way as the server). */
export function modelLabel(model: string): string {
  switch (model) {
    case "opus":
    case "inherit":
      return "Opus 5.5";
    case "sonnet":
      return "Sonnet 5.5";
    case "haiku":
      return "Haiku 5.5";
    case "fable":
      return "Fable 5.2";
    default:
      return model;
  }
}

export interface UserTurn {
  kind: "user";
  text: string;
}

export interface ReplyTurn {
  kind: "reply";
  agent: string;
  text: string;
  status: "streaming" | "done" | "partial" | "error";
  notices: string[];
  model?: string;
}

export interface ExpertRun {
  agent: string;
  name: string;
  brief: string;
  answer: string;
  status: "waiting" | "streaming" | "ok" | "partial" | "failed";
  notices: string[];
  model?: string;
}

export interface TeamTurn {
  kind: "team";
  phase: "planning" | "experts" | "synthesizing" | "done" | "error";
  assumptions: string;
  experts: ExpertRun[];
  synthesis: string;
  synthesisStatus: "waiting" | "streaming" | "done" | "partial" | "error";
  notices: string[];
  error?: string;
}

export type Turn = UserTurn | ReplyTurn | TeamTurn;
export type Conversations = Record<string, Turn[]>;
