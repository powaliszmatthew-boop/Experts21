# Experts21 web app

A web chat for the Miami coffee shop expert team in this repo. The sidebar lists all 27 agents with their persona name, role, voice, and model. You can chat with any one expert, or choose **Ask the whole team** to send your question through the orchestrator (Marisol).

- **Your API key stays on the server.** The browser only talks to three Netlify Functions (`/api/chat`, `/api/plan`, `/api/synthesize`). Those functions call the Claude API using the `ANTHROPIC_API_KEY` environment variable you set in Netlify.
- **The team is read from this repo at build time.** Every deploy runs `scripts/build-team.mjs`, which reads `.claude/agents/`, the skills each agent preloads (`.claude/skills/`), each agent's `knowledge/<agent>/` folder, and the shared research in `docs/`. If you change an agent, add a knowledge file, or update the research, push the change and Netlify rebuilds the app with it.

## Deploy to Netlify (step by step)

You need a Netlify account (free is fine), an Anthropic API key from [console.anthropic.com](https://console.anthropic.com/), and this repository on GitHub.

1. **Get an API key.** In the Anthropic Console, open **API Keys**, create a key, and copy it. Keep it private.
2. **Create the Netlify project.** In Netlify, choose **Add new project → Import an existing project → GitHub**, authorize Netlify if asked, and pick this repository.
3. **Leave the build settings alone.** Netlify reads them from [`netlify.toml`](../netlify.toml) at the root of the repo (build command, publish folder `web/dist`, functions folder `web/netlify/functions`, Node 22). If any fields are pre-filled in the form, leave them as they are or empty. Make sure the branch is `main`.
4. **Deploy.** Click **Deploy**. The first build takes 1–2 minutes. The site will load, but questions will fail with "ANTHROPIC_API_KEY is not set" until you finish step 5.
5. **Add your API key.** Go to **Project configuration → Environment variables → Add a variable**:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key
   - Scopes: include **Functions** (the default, "All scopes", is fine). Tick **Contains secret values** if you're offered it.
   - Don't put the key in `netlify.toml` or anywhere in the repo: variables set in `netlify.toml` aren't available to functions, and the repo isn't the place for secrets.
6. **Redeploy.** Go to **Deploys → Trigger deploy → Deploy project** (new variables only take effect on a new deploy).
7. **Recommended: add a password.** Anyone who finds your site URL could otherwise use your API credits. Add another environment variable `APP_PASSWORD` with a password of your choice, and redeploy. The app will ask for it once per browser.
8. **Open the site** at the `*.netlify.app` URL Netlify shows, pick an expert or **Ask the whole team**, and ask a question.

After that, every push to `main` redeploys automatically.

### Optional settings

Set these as Netlify environment variables (then redeploy). Each takes `low`, `medium`, `high`, `xhigh`, or `max`; higher means more thinking, slower answers, and more cost.

| Variable | Default | Used for |
|---|---|---|
| `APP_PASSWORD` | not set | Password the browser must send with every request |
| `EFFORT_CHAT` | `medium` | One-on-one chats with an expert |
| `EFFORT_PLAN` | `low` | Team mode, step 1: Marisol picks experts and writes briefs |
| `EFFORT_TEAM_EXPERT` | `low` | Team mode, step 2: each expert answers its brief |
| `EFFORT_SYNTHESIS` | `medium` | Team mode, step 3: Marisol combines the answers |

## How it works

| Piece | Where |
|---|---|
| Reads the team from the repo at build time | `scripts/build-team.mjs` → `netlify/shared/team.generated.json` (server only) and `src/generated/roster.generated.json` (sidebar data, no prompts) |
| Builds each agent's system prompt | `netlify/shared/prompts.ts` |
| Claude API calls, streaming, timeouts | `netlify/shared/claude.ts` |
| API endpoints | `netlify/functions/chat.mts`, `plan.mts`, `synthesize.mts` |
| React UI | `src/` |

**One expert.** The function sends that agent's own definition (`.claude/agents/<agent>.md`), its preloaded skills, its knowledge folder, and the shared `docs/` research as the system prompt, using the agent's own model: `opus` → Claude Opus 5.5, `sonnet` → Claude Sonnet 5.5, `haiku` → Claude Haiku 5.5.

**Ask the whole team.** Mirrors what the orchestrator does in Claude Code, in three calls:
1. **Plan:** Marisol (with the `team-routing` skill) picks the smallest set of experts (at most 8) and writes a self-contained brief for each.
2. **Experts:** the browser runs every brief in parallel, each on that expert's own model. You can open each expert's card to see its brief and answer.
3. **Synthesis:** Marisol combines the answers with the `cross-expert-synthesis` template.

Follow-up questions in the team chat include the earlier questions and Marisol's earlier answers.

### Differences from the Claude Code version

- **No tools.** Experts can't browse the web, read files, or run code here. Everything they would read is included in their prompt, and they're told to flag time-sensitive figures that need re-checking.
- **One round only in team mode.** Netlify stops a function after 60 seconds, so the orchestrator can't run a second reconciliation round; it states any unresolved disagreement instead. Each call is cut at about 50 seconds with a clear "partial answer" note. If that happens often, ask narrower questions or lower the effort settings.
- **Text knowledge files only.** `.md`, `.txt`, `.csv`, `.tsv`, `.json`, `.yaml` files (up to 200 KB each) are included. Other files, such as PDFs, are listed to the agent as "not included"; save a text or Markdown version if an agent needs one.
- **Chats are stored in your browser** (local storage), not on a server. **Clear** deletes the current conversation.
- **Refusal fallback.** Opus and Sonnet requests opt into the Claude API's server-side fallback (`fallbacks: "default"`), so if a model declines a request, another model answers and the app shows a note saying so. Haiku has no server-side fallback.

### Costs

You pay Anthropic for every request. Each call re-sends the shared research (about 12,000 tokens) plus the agent's skills and knowledge folder; prompt caching makes repeats within a few minutes much cheaper. A team question makes 2 Opus calls plus one call per expert. Watch usage in the Anthropic Console, and consider setting a spend limit there.

## Run it locally

Requires Node 22 and the Netlify CLI (`npm install -g netlify-cli`). From the repo root:

```bash
npm --prefix web install
```

```bash
export ANTHROPIC_API_KEY=your-key-here
```

```bash
netlify dev
```

Then open http://localhost:8888. (`npm --prefix web run dev` runs only the UI, without the API.)

Check that everything builds (this is what Netlify runs):

```bash
npm --prefix web run build
```

## Troubleshooting

| What you see | Fix |
|---|---|
| "ANTHROPIC_API_KEY is not set" | Add the variable (step 5), then redeploy (step 6). |
| "The Claude API rejected the API key" | The key is wrong or was revoked. Replace the variable's value and redeploy. |
| "Not found (is the model available to your account?)" | Your Anthropic account can't use one of the models. Check the model list in the Console. |
| "Rate limited" | Wait a minute. Team questions send several requests at once; lower-tier accounts hit limits sooner. |
| "Stopped after ~50 seconds" | Netlify's 60-second limit. Ask a narrower question, say "continue", or lower the effort settings. |
| Password prompt keeps coming back | The password doesn't match `APP_PASSWORD` in Netlify. |
| A new agent or knowledge file doesn't show up | Push it to `main` and wait for the deploy to finish. |
