# How to Talk to Your Experts

There are three ways to reach the team: ask one expert, ask the whole team, or give the orchestrator a multi-part prompt. Start a **new** Claude Code session in this project first, because agents load when a session starts.

## Ask one specific agent

Name the agent with an @-mention. Type `@`, pick it from the list, or type the name yourself:

```text
@agent-financial-analyst What happens to break-even if our average ticket is $6.50 instead of $7.50?
```

```text
@agent-permitting-expediter What's the order of approvals to open in the City of Miami, and which step usually takes longest?
```

You can also ask in plain language. Claude will usually pass the question to the agent you name:

```text
Use the lease-attorney agent to list the lease clauses we should push back on in a Wynwood LOI.
```

All 27 agent names are in [`CLAUDE.md`](../CLAUDE.md) and [`expert-roster.md`](expert-roster.md).

## Ask the whole team

Use the slash command. The orchestrator decides which experts to bring in and returns one answer:

```text
/ask-experts What should our opening menu and prices be?
```

Or @-mention the orchestrator:

```text
@agent-expert-orchestrator What are the five things most likely to make this shop fail, and what do we do about each?
```

To make **every message** in a session go to the team, start the session as the orchestrator:

```bash
claude --agent expert-orchestrator
```

## Example prompts that get several experts working together

These work as `/ask-experts ...` or `@agent-expert-orchestrator ...`. Each one needs several specialties at once, so the orchestrator has to coordinate them and reconcile their answers. The experts listed under each prompt are the ones it will likely call; it decides for itself.

**1. Site decision**
```text
Compare Brickell, Wynwood, and Coral Gables for our first shop. For each, give the rent, competition, the customers we'd attract, and the daily transactions we'd need to break even, then recommend one.
```
Likely experts: site-selection-advisor, competitive-intelligence-analyst, customer-insights-researcher, financial-analyst, lease-attorney.

**2. Go/no-go with a fixed budget**
```text
We have $300,000 in total capital. Is that enough to open a 1,200 sq ft café with 30 seats in the City of Miami? Show what we'd spend it on, how many months of runway we'd have, the biggest risks, and whether you'd go ahead.
```
Likely experts: engagement-lead, financial-analyst, funding-capital-advisor, architect-buildout-manager, insurance-risk-manager.

**3. Menu, pricing, and coffee costs**
```text
Design our opening menu. Include Cuban classics and specialty drinks, choose a roaster strategy, price every drink so beverage COGS stays under 30%, and tell us what happens to margins if arabica rises back to $4/lb.
```
Likely experts: beverage-menu-lead, coffee-sourcing-specialist, financial-analyst, competitive-intelligence-analyst, brand-creative-director.

**4. 120-day launch plan**
```text
Build a week-by-week plan from lease signing to grand opening. Cover permits, build-out, equipment, hiring and training, POS and app setup, and the pre-launch marketing. Flag the steps that could delay opening day.
```
Likely experts: permitting-expediter, architect-buildout-manager, cafe-equipment-engineer, talent-training-lead, employment-law-specialist, technology-ordering-specialist, digital-social-marketer.

## Tips for better answers

- **Give constraints:** budget, neighborhood, seat count, opening date, and whether you want food or beer and wine.
- **Ask for a decision**, not only information ("recommend one", "go or no-go"). That brings in the engagement lead to weigh trade-offs.
- **Ask for the experts it used.** Add "list the experts you consulted" to see who contributed.
- **Follow up** on one part with the specialist directly, e.g. `@agent-financial-analyst rerun that with 220 transactions a day`.
- **Read the labels:** answers mark claims **Verified**, **Reported**, or **Estimate**. Legal, tax, and insurance advice still needs a licensed professional's sign-off.
- **Missing a specialty?** Ask the meta agent: `@agent-team-builder add an expert on outdoor seating and sidewalk café design`.
