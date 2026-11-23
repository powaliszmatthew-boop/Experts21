# Experts21: Miami Specialty Coffee Shop Advisory Team

This project is an advisory team of Claude Code subagents that helps a consultant plan and open an independent specialty coffee shop in Miami, Florida. The team's shared knowledge is the research in `docs/` (index: `docs/README.md`, researched Nov 23, 2026).

## How to use the team
- **Any question → the orchestrator.** Ask normally (e.g. "Use the expert-orchestrator: should we open in Brickell or Coral Gables?"), or @-mention `@agent-expert-orchestrator`. It picks the experts, runs them, reconciles their advice, and returns one combined answer.
- **Slash command:** `/ask-experts [question]` runs the orchestrator directly.
- **Whole session as the orchestrator:** `claude --agent expert-orchestrator`.
- **One specialist:** @-mention an expert directly, e.g. `@agent-financial-analyst`.
- **Change the team:** ask `team-builder` to add a role or skill, or to improve one.

## The team (27 agents)
| Group | Agents |
|---|---|
| Infrastructure | `expert-orchestrator` (routes and combines), `team-builder` (creates and improves agents and skills) |
| Strategy | `engagement-lead` |
| Market & Customer | `market-research-analyst`, `customer-insights-researcher`, `competitive-intelligence-analyst` |
| Real Estate & Build-Out | `site-selection-advisor`, `architect-buildout-manager`, `cafe-equipment-engineer` |
| Legal & Regulatory | `lease-attorney`, `corporate-contracts-attorney`, `permitting-expediter`, `employment-law-specialist`, `food-safety-specialist` |
| Finance | `financial-analyst`, `funding-capital-advisor`, `accounting-tax-advisor`, `insurance-risk-manager` |
| Coffee & Product | `coffee-sourcing-specialist`, `beverage-menu-lead` |
| Operations & People | `cafe-operations-manager`, `talent-training-lead`, `technology-ordering-specialist` |
| Marketing & Growth | `brand-creative-director`, `digital-social-marketer`, `pr-community-manager`, `wholesale-b2b-lead` |

Full job descriptions and the agent ↔ skill matrix are in `docs/expert-roster.md`. Each agent's model (`opus` / `sonnet` / `haiku`), first name, voice, and working style are in `docs/agent-brains.md`.

## Layout
- `.claude/agents/<agent>.md`: subagent definitions (frontmatter + system prompt). Each one preloads its skills through the `skills` field.
- `knowledge/<agent>/`: each agent's private knowledge folder, read before every answer. Its `README.md` says what belongs there; shared research stays in `docs/`.
- `.claude/skills/<skill>/SKILL.md`: 33 skills. 30 are domain skills shared across agents, plus `team-routing`, `agent-skill-authoring`, and the user-only `ask-experts`.
- `docs/`: research (01-09), `expert-roster.md`, `agent-brains.md`, `team-changelog.md`.
- `web/`: React chat app for the team, deployed on Netlify (`netlify.toml` at the root). It reads the agents, their skills, `knowledge/` folders and `docs/` at build time, so changes to them reach the app on the next deploy. Deploy steps: `web/README.md`.

## Conventions (all agents)
- Label claims **Verified** (official source), **Reported** (secondary source), or **Estimate** (our model), and cite sources. Never invent figures.
- Re-check time-sensitive facts (fees, wages, rents, coffee prices, tax rules) before relying on them.
- Legal, tax, and insurance output is research-level only; a licensed Florida professional must sign off.
- Only `expert-orchestrator` spawns subagents; experts answer their brief and name hand-offs.

## Maintaining the team
After any change to agents or skills, keep `docs/expert-roster.md`, `docs/agent-brains.md`, the agent's `knowledge/<agent>/` folder, the routing map in `.claude/skills/team-routing/SKILL.md`, this file, and `docs/team-changelog.md` in sync. Then run:

```bash
python3 .claude/skills/agent-skill-authoring/scripts/validate_team.py
```
