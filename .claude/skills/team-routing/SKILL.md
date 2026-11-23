---
name: team-routing
description: "Routing map for the Miami coffee shop expert team: which expert agents to call for each type of question, standard combinations, and the full roster. Use when deciding who should answer a question."
---

# Team routing

Use this map to choose which experts to bring in. Pick the **smallest set** that covers the question: usually 1 lead plus 1-4 supporting experts. Agent names are the exact `subagent_type` values.

## Question type → experts

| Question type | Lead | Supporting |
|---|---|---|
| Should we do this? / go-no-go / overall plan | `engagement-lead` | `financial-analyst`, `site-selection-advisor`, `insurance-risk-manager`, `market-research-analyst` |
| Market size, demand, demographics, tourism | `market-research-analyst` | `customer-insights-researcher`, `site-selection-advisor` |
| Who are our customers / what do they want | `customer-insights-researcher` | `market-research-analyst`, `brand-creative-director`, `beverage-menu-lead` |
| Competitors, pricing benchmarks near a site | `competitive-intelligence-analyst` | `site-selection-advisor`, `beverage-menu-lead` |
| Which neighborhood / evaluate a listing | `site-selection-advisor` | `competitive-intelligence-analyst`, `financial-analyst`, `lease-attorney`, `permitting-expediter`, `insurance-risk-manager` |
| Lease terms, LOI, landlord negotiation | `lease-attorney` | `site-selection-advisor`, `financial-analyst`, `insurance-risk-manager` |
| Build-out design, contractor, construction schedule | `architect-buildout-manager` | `cafe-equipment-engineer`, `permitting-expediter`, `financial-analyst` |
| Espresso machine, equipment, bar layout, walk-up window | `cafe-equipment-engineer` | `architect-buildout-manager`, `cafe-operations-manager`, `funding-capital-advisor` |
| Permits, licenses, approvals, timelines | `permitting-expediter` | `architect-buildout-manager`, `food-safety-specialist`, `accounting-tax-advisor` |
| Entity setup, contracts, trademarks | `corporate-contracts-attorney` | `accounting-tax-advisor`, `funding-capital-advisor` |
| Wages, tips, hiring compliance, workers' comp, E-Verify | `employment-law-specialist` | `talent-training-lead`, `accounting-tax-advisor` |
| Food safety, inspections, certifications | `food-safety-specialist` | `cafe-operations-manager`, `permitting-expediter` |
| Costs, P&L, break-even, pricing math | `financial-analyst` | `accounting-tax-advisor`, `beverage-menu-lead`, `site-selection-advisor` |
| Funding, loans, investors, how much capital | `funding-capital-advisor` | `financial-analyst`, `corporate-contracts-attorney` |
| Taxes, bookkeeping, payroll setup | `accounting-tax-advisor` | `financial-analyst`, `employment-law-specialist` |
| Insurance, hurricanes, flood, risk register | `insurance-risk-manager` | `site-selection-advisor`, `lease-attorney`, `cafe-operations-manager` |
| Beans, roaster, coffee prices, tariffs | `coffee-sourcing-specialist` | `beverage-menu-lead`, `financial-analyst` |
| Menu, recipes, drink pricing, food program | `beverage-menu-lead` | `coffee-sourcing-specialist`, `financial-analyst`, `food-safety-specialist`, `brand-creative-director` |
| Daily operations, SOPs, scheduling, inventory | `cafe-operations-manager` | `talent-training-lead`, `food-safety-specialist`, `technology-ordering-specialist` |
| Hiring, training, pay ladder, retention | `talent-training-lead` | `employment-law-specialist`, `cafe-operations-manager` |
| POS, app ordering, loyalty, delivery apps | `technology-ordering-specialist` | `cafe-operations-manager`, `digital-social-marketer`, `financial-analyst` |
| Brand, name, positioning, bilingual copy | `brand-creative-director` | `customer-insights-researcher`, `digital-social-marketer`, `corporate-contracts-attorney` |
| Social media, Google profile, reviews, launch campaign | `digital-social-marketer` | `brand-creative-director`, `pr-community-manager` |
| Press, events, community partnerships | `pr-community-manager` | `brand-creative-director`, `digital-social-marketer` |
| Catering, offices, hotels, wholesale beans | `wholesale-b2b-lead` | `coffee-sourcing-specialist`, `permitting-expediter`, `financial-analyst` |
| Adding beer and wine | `permitting-expediter` | `corporate-contracts-attorney`, `accounting-tax-advisor`, `insurance-risk-manager`, `beverage-menu-lead` |

## Standard combinations

- **Site decision:** site-selection-advisor + competitive-intelligence-analyst + lease-attorney + financial-analyst (+ insurance-risk-manager for the flood zone)
- **Build & permits:** architect-buildout-manager + cafe-equipment-engineer + permitting-expediter + food-safety-specialist, run in sequence; the Certificate of Use comes only after construction
- **Product costing loop:** coffee-sourcing-specialist → beverage-menu-lead → financial-analyst
- **Launch:** brand-creative-director + digital-social-marketer + pr-community-manager + technology-ordering-specialist; then cafe-operations-manager + talent-training-lead
- **Funding package:** financial-analyst + funding-capital-advisor + corporate-contracts-attorney + accounting-tax-advisor
- **Go/no-go:** engagement-lead synthesizes the inputs from financial-analyst, site-selection-advisor, insurance-risk-manager, and market-research-analyst

## Full roster

| Agent | Role | Job |
|---|---|---|
| `engagement-lead` | Engagement Lead / Chief Strategist | Coordinates all experts, settles trade-offs, and turns their advice into one go/no-go plan and recommendation for the consultant. |
| `market-research-analyst` | Market Research Analyst | Sizes the Miami-Dade opportunity using Census, tourism, and NCA/SCA coffee-demand data, and tracks how those numbers change. |
| `customer-insights-researcher` | Customer Insights Researcher | Defines and validates target segments (professionals, Latin American residents, tourists, students, affluent regulars) and what each wants. |
| `competitive-intelligence-analyst` | Competitive Intelligence Analyst | Maps specialty shops, Cuban cafeterias, and chains near each candidate site, covering price, format, hours, and reviews. |
| `site-selection-advisor` | Site Selection & Commercial Real Estate Advisor | Finds and ranks candidate sites by foot traffic, rent per square foot, zoning, flood zone, and fit with the target customers. |
| `architect-buildout-manager` | Architect & Build-Out Project Manager | Designs the space and manages construction bids, budget, and schedule through every inspection. |
| `cafe-equipment-engineer` | Café Equipment & Bar Workflow Engineer | Specifies the espresso, grinder, ice, and water-filtration package and lays out a fast bar, including a walk-up window. |
| `lease-attorney` | Lease & Real Estate Attorney | Reviews and negotiates the lease: use clause, tenant-improvement allowance, free rent during permitting, escalators, guarantees, and renewal options. |
| `corporate-contracts-attorney` | Corporate & Contracts Attorney | Sets up the business entity and drafts or reviews vendor, roaster, equipment, investor, and wholesale contracts. |
| `permitting-expediter` | Permitting & Licensing Expediter | Runs the approvals in the right order (zoning, DBPR, building/DERM/WASD, Certificate of Use, BTR/LBTR, DR-1, signs, sidewalk café) to avoid delays. |
| `employment-law-specialist` | Employment Law & HR Compliance Specialist | Keeps the business compliant on Florida minimum wage and its inflation indexing, the tip credit, workers' comp, E-Verify, I-9s, and posters. |
| `food-safety-specialist` | Food Safety & Sanitation Specialist | Gets the shop ready for DBPR inspections and manages manager certification and staff food-handler training. |
| `financial-analyst` | Financial Analyst (FP&A) | Builds and maintains the startup budget, monthly P&L, break-even, and sensitivity models. |
| `funding-capital-advisor` | Funding & Capital Advisor | Structures how the project is funded (SBA loans, equipment leasing, investors) and sizes the working-capital cushion. |
| `accounting-tax-advisor` | Accounting & Tax Advisor | Sets up bookkeeping and payroll and handles sales tax, the county food & beverage tax, the resort tax, and payroll-tax compliance. |
| `insurance-risk-manager` | Insurance & Risk Manager | Buys the right coverage (property/wind, flood, liability, business interruption, workers' comp) and owns the risk register and hurricane plan. |
| `coffee-sourcing-specialist` | Coffee Sourcing & Roasting Specialist | Chooses the roaster or green-coffee suppliers, negotiates fixed-price contracts, and manages commodity and tariff risk. |
| `beverage-menu-lead` | Beverage & Menu Development Lead | Designs a menu that combines Cuban classics with specialty drinks and leads with iced options, costed per cup to hit margin targets. |
| `cafe-operations-manager` | Café Operations Manager | Writes the SOPs, staffing schedules, inventory, and opening/closing routines that keep labor near 30% of sales and service fast. |
| `talent-training-lead` | Talent & Training Lead | Recruits bilingual baristas and leads, runs barista training, and designs the pay ladder and retention plan. |
| `technology-ordering-specialist` | Technology & Digital Ordering Specialist | Selects and configures the POS, mobile ordering app, loyalty program, delivery platforms, Wi-Fi, and reporting. |
| `brand-creative-director` | Brand & Creative Director | Owns the "specialty coffee, Miami style" positioning, the bilingual brand identity, signage, and packaging. |
| `digital-social-marketer` | Digital & Social Media Marketer | Runs Instagram/TikTok, the Google Business Profile, reviews, and the pre-opening waitlist and launch campaigns. |
| `pr-community-manager` | PR & Community Partnerships Manager | Gets local press coverage and builds neighborhood, university, art-walk, and bakery partnerships and events. |
| `wholesale-b2b-lead` | Wholesale & B2B Sales Lead | Builds a second revenue stream from office catering, hotels, and wholesale bean accounts. |

Infrastructure: `expert-orchestrator` (routes and combines) and `team-builder` (creates and improves agents and skills). Don't route business questions to `team-builder`.

If no expert fits a recurring question type, tell the consultant and suggest asking `team-builder` to create one.
