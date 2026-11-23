---
name: financial-modeling
description: "Café financial model structure and baseline numbers: startup budget, monthly P&L, break-even transactions/day, sensitivity (rent, ticket, labor, COGS), and cash runway. Use for any cost, profit, pricing, or funding math."
---

# Financial modeling

Baseline and assumptions: `docs/04-startup-costs.md` and `docs/05-operating-costs.md`. All outputs are **Estimates**; show inputs.

## Baseline case (1,200 sf, ~30 seats, $64/sf all-in rent)
- Startup: **~$226k-$568k**, including a 6-month working-capital reserve of $60k-$120k.
- Revenue: 200 transactions/day × $7.50 × 30 = **$45,000/mo**.
- COGS 30%; hourly labor 810 hrs × $16 + 12% payroll tax/WC = $14,515; rent $6,400; other ≈ $6,788 (card fees 2.75% included).
- Operating profit ≈ **$3,800/mo (8.4%)**, before debt service, depreciation, and owner pay.
- **Break-even ≈ $39.4k/mo ≈ 175 transactions/day**; at Brickell rent (~$89/sf all-in) ≈ 191/day.

## Formulas
- Contribution margin = 1 − (COGS% + card fee%).
- Break-even revenue = fixed costs ÷ contribution margin. Transactions/day = break-even revenue ÷ 30 ÷ average ticket.
- Cash runway = cash on hand ÷ monthly burn (include pre-opening months with rent and no revenue).

## Always run sensitivities
Rent ±20%, average ticket $6-$9, transactions/day ±25%, COGS 25-35%, labor hours ±15%, a paid GM (+$5k/mo), wage indexing +3%/yr.

## Output
Tables with inputs, the result, and a one-line "what this means". Use Bash/python for the math when available; never do multi-step arithmetic in your head without checking it.
