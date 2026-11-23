---
name: agent-skill-authoring
description: "How to create, edit, and validate Claude Code subagents (.claude/agents) and skills (.claude/skills) for this expert team, including the frontmatter rules, house conventions, files to keep in sync, and the validator script. Use when adding or improving agents or skills."
---

# Agent & skill authoring (Claude Code)

Rules from the official docs (code.claude.com/docs/en/sub-agents and /skills, read Nov 2026). Re-check them with WebFetch if something behaves unexpectedly.

## Subagent files: `.claude/agents/<name>.md`
- YAML frontmatter starting on line 1, then the system prompt in Markdown.
- Required: `name` (lowercase-hyphen, at most 256 chars, no `:`, must not start with `-`) and `description` (when to delegate; keep it brief, because combined descriptions over ~15k tokens trigger a warning).
- Optional fields used here: `tools` (comma list; omitting it inherits everything), `skills` (YAML list to **preload**: the full content is injected at startup, first 32 names), `color`, `model`, `effort`, `memory`, `maxTurns`, `disallowedTools`.
- Field names are camelCase and must match exactly; unknown fields are silently ignored.
- A file without `name` is treated as documentation; a file with `name` but no `description` is skipped.
- Experts get no `Agent` tool (they can't spawn). Only `expert-orchestrator` has `Agent`.
- Subagents start fresh: no conversation history. They get their own prompt, the delegation message, CLAUDE.md, the git status, and their preloaded skills.
- Nesting: up to 3 layers below the main conversation by default; 20 concurrent subagents at most.
- Changes are picked up automatically within seconds (no restart needed).

## Skill files: `.claude/skills/<skill-name>/SKILL.md`
- Frontmatter: `name` (defaults to the folder name; keep them identical), `description` (what plus when; key use case first; description plus `when_to_use` is capped at 1,536 chars in the listing; avoid `<` `>`).
- `disable-model-invocation: true` = only the user can run it (and it **can't be preloaded** into subagents). `user-invocable: false` = hidden from the `/` menu.
- `context: fork` plus `agent: <name>` runs the skill as a task inside that subagent; `background: false` waits for the result.
- Keep SKILL.md under 500 lines; put long reference material in supporting files and link to it. Write instructions, not narration; loaded skills cost context every turn.

## House conventions for this team
1. Agent system prompt sections: Mission → Focus areas → How you work → Output format → Hand-offs. Copy an existing expert as the template.
2. Every expert preloads `source-verification`. Each preloaded skill must exist in `.claude/skills/`.
3. Domain facts live in `docs/`; skills summarize them and point to the file. Don't duplicate large tables.
4. Label claims Verified / Reported / Estimate. Legal, tax, and insurance agents state that licensed sign-off is required.
5. Every agent sets `model`: `opus` for deep strategy, legal, and finance judgment; `sonnet` for most specialist work; `haiku` for fast, simple lookups. Record the choice and reason in `docs/agent-brains.md`.
6. Every agent has a `## Persona` section (unique first name, voice, working style) right after its opening "You are the **Role**" line, followed by a `## Knowledge folder (read first)` section. Copy both from an existing agent.
7. Every agent has `knowledge/<agent>/README.md` describing which documents belong there. Rename or remove the folder with the agent.
8. When you add, rename, or remove an agent or skill, also update: `docs/agent-brains.md` (for agents), `docs/expert-roster.md` (agents table + skills table with "Used by"), the routing map in `.claude/skills/team-routing/SKILL.md`, the team table in `CLAUDE.md`, and `docs/team-changelog.md`.

## Workflow
1. **Understand the request:** a new role, a new skill, or an improvement (to which file, and why). For improvements, collect the evidence: a bad answer, a gap, or stale facts.
2. **Check for overlap:** read `docs/expert-roster.md` and the routing map. Prefer extending an existing agent or skill over creating a near-duplicate.
3. **Write or edit** the files following the rules above. Make minimal, targeted edits to existing files.
4. **Validate:** run `python3 .claude/skills/agent-skill-authoring/scripts/validate_team.py` from the project root and fix every error.
5. **Report:** list the files created or changed, the wiring changes (agent ↔ skills), and the validator result.
