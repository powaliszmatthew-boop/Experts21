---
name: miami-market-data
description: "Miami-Dade demographics, tourism, and specialty-coffee demand data with sources and analysis methods. Use for market sizing, trade-area demand, and segment sizing questions."
---

# Miami-Dade market data

## Baseline (Verified: Census QuickFacts, see docs/01-market.md)
- Population 2,802,029 (July 2025), +3.7% since 2020; 975,411 households; 2.76 persons/household.
- 70.6% Hispanic or Latino; 54.5% foreign-born; 75.3% speak a language other than English at home.
- Median household income $71,753; per capita $39,469; 34.4% bachelor's or higher; 18.3% age 65+.
- Accommodation and food services sales: $15.37B (2022 Economic Census).

## Tourism (Reported: GMCVB via press)
About 28M visitors and $23B in visitor spending in 2025. Top international markets: Colombia, Canada, Brazil, UK, Mexico.

## Coffee demand (Reported: NCA/SCA)
46% (2025) and 47% (2026) of US adults drank specialty coffee in the past day. Specialty drinkers average 3.0 cups/day, and 36% of them had it prepared away from home.

## Method for trade-area sizing
1. Define the trade area (0.5-mile walk, 1-mile, or a 5-minute drive) for each candidate site.
2. Pull tract or ZIP-level data (Census ACS/data.census.gov): population, daytime workers, income, age, Hispanic share.
3. Add daytime population (offices, universities) and tourist flow where relevant.
4. Demand estimate = adults × past-day specialty rate × away-from-home share × visit frequency × capture rate. Show every assumption and run low/base/high cases.
5. Label all outputs **Estimate**.
