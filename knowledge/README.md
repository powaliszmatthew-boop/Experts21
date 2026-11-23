# Agent knowledge folders

Each agent has a private folder here, `knowledge/<agent-name>/`, and reads it before every answer (the "Knowledge folder (read first)" section in each `.claude/agents/<agent>.md`). Each folder's `README.md` says what belongs there.

- **Shared research** that every agent needs goes in `docs/`, not here.
- **Agent-specific material** (quotes, drafts, contracts, notes, data exports) goes in that agent's folder.
- Keep secrets (passwords, API keys, account numbers, SSNs) out of the repository.
- File names: `YYYY-MM-DD-short-topic.ext`. Markdown, text, CSV, and PDF read best.

Agent names, models, and personas: [`docs/agent-brains.md`](../docs/agent-brains.md).
