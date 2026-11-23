# Team Changelog

Dated log of changes to the expert agents (`.claude/agents/`) and skills (`.claude/skills/`). `team-builder` adds an entry for every change.

## 2026-11-23 (brains, personas, knowledge folders)
- Set `model` on all 27 agents: 9 `opus` (strategy, legal, finance, orchestration), 15 `sonnet` (specialist work, team-builder), 3 `haiku` (`food-safety-specialist`, `technology-ordering-specialist`, `pr-community-manager`). Rationale in `docs/agent-brains.md`.
- Gave every agent a `## Persona` section (first name, voice, working style), listed in `docs/agent-brains.md`.
- Created `knowledge/<agent>/README.md` for all 27 agents plus `knowledge/README.md`; every agent now reads its folder first ("Knowledge folder (read first)" section).
- `expert-orchestrator` now passes knowledge-folder facts into briefs and does not pass `model` on Agent calls (it would override each agent's own model).
- `agent-skill-authoring` conventions and `validate_team.py` now require `model`, a persona, and a knowledge folder for every agent.

## 2026-11-23 (initial build)
- Created 25 expert subagents from `docs/expert-roster.md`, plus `expert-orchestrator` and `team-builder` (27 agents total).
- Created 33 skills: the 30 roster skills (S01-S30), `team-routing` (S31), `agent-skill-authoring` (S32, with `scripts/validate_team.py`), and the user-only `/ask-experts` (S33).
- Wired each agent to its skills through the `skills` preload field, following the roster's "Used by" matrix.
