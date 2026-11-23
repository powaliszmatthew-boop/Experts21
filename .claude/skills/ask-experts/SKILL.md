---
name: ask-experts
description: "Ask the Miami coffee shop expert team a question; the expert-orchestrator routes it to the right specialists and returns one combined answer."
argument-hint: "[question]"
context: fork
agent: expert-orchestrator
background: false
disable-model-invocation: true
---

Answer the consultant's question using the expert team.

Question: $ARGUMENTS

Steps:
1. Use the `team-routing` map to pick the smallest set of experts that covers the question.
2. Brief each expert with a self-contained prompt (they don't see this conversation) and run the independent ones in parallel.
3. Run follow-up rounds when one expert's output changes another's (for example, rent → break-even).
4. Combine everything into one answer using the `cross-expert-synthesis` template, naming the experts consulted.
