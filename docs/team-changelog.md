# Team Changelog

Dated log of changes to the expert agents (`.claude/agents/`) and skills (`.claude/skills/`). `team-builder` adds an entry for every change.

## 2026-11-23
- Created 25 expert subagents from `docs/expert-roster.md`, plus `expert-orchestrator` and `team-builder` (27 agents total).
- Created 33 skills: the 30 roster skills (S01-S30), `team-routing` (S31), `agent-skill-authoring` (S32, with `scripts/validate_team.py`), and the user-only `/ask-experts` (S33).
- Wired each agent to its skills through the `skills` preload field, following the roster's "Used by" matrix.
