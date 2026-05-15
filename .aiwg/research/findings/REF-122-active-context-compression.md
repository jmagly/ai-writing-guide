# REF-122 AIWG Analysis: Active Context Compression / Focus Agent

**Source**: @~/dev/research-papers/documentation/references/REF-122-active-context-compression.md
**Paper**: Verma, N. (2026). *Active Context Compression: Autonomous Memory Management in LLM Agents*. arXiv:2501.09067v1.
**arXiv**: https://arxiv.org/abs/2501.09067
**Preprint Date**: 2026-01-12
**AIWG Relevance**: **HIGH** — Empirical basis for the "aggressive, not passive" compaction discipline in auto-compact-continue Rule 6.
**GRADE**: **VERY LOW** — Not peer-reviewed; N=5 SWE-bench Lite instances; single author; novel concept with limited validation.

---

## Executive Summary

Verma introduces the **Focus Agent**: an architecture for agent-controlled context compression *during* a single long-horizon task. Two tool primitives are added to the standard ReAct loop:

- **`start_focus`** — marks a checkpoint and declares an investigation goal
- **`complete_focus`** — generates a structured summary and deletes intervening messages

This produces a **"Sawtooth" context pattern**: context grows during exploration, collapses during consolidation, with learnings preserved in a persistent "Knowledge" block at the top of context. The agent autonomously decides when to compress, based on task structure rather than arbitrary step counts.

**Headline empirical result** (Table I, N=5 SWE-bench Lite, Claude Haiku 4.5):
- **22.7% token reduction** (14.9M → 11.5M tokens) with **identical accuracy** (3/5 = 60% for both baseline and Focus)
- **Aggressive prompting was critical**: aggressive (compress every 10-15 tool calls) gave 22.7% savings with no accuracy loss; **passive prompting gave only 6% savings AND caused accuracy degradation** (60% vs 80% baseline in passive condition)

The slime-mold analogy is the conceptual core: biological systems don't retain perfect motion logs; they retain learned maps. An agent exploring a codebase doesn't need to remember 50 lines of `ls -R` output — it needs to remember "config not in `/src`."

---

## AIWG Concept Mapping

| REF-122 Concept | AIWG Equivalent | Status |
|---|---|---|
| `start_focus` / `complete_focus` primitives | No direct equivalent at tool level | **Gap** — AIWG relies on auto-compact + manual progress-file writes |
| Sawtooth context pattern | Progress-file checkpoint cycle (write summary → continue) | **Approximated** in Rule 3 (progress file at checkpoints) |
| Persistent "Knowledge" block | CLAUDE.md / AGENTS.md / AIWG.md (system-scope) + progress file | **Implemented** at different layer |
| Aggressive compression (every 10-15 tool calls) | Codified in auto-compact-continue Rule 6 | **Codified** with explicit cadence |
| Consolidate-and-prune cycle within one task | Within-session pattern; complements REF-909's across-session pattern | **Codified** |
| Summary cost amortized over task | Implicit in Rule 6 ("conclusion only, stop carrying raw output forward") | **Codified** |

### The 22.7% vs 6% finding is what motivates Rule 6

This is the only quantitative result the auto-compact-continue rule cites by number. Rule 6 ("Aggressive, Not Passive, Compaction Discipline") states:

> REF-122 (Focus Agent / Active Context Compression) is unambiguous: passive instructions to compress yield ~6% savings; aggressive instructions (compress every 10–15 tool calls; consolidate findings; prune raw history) yield ~22.7%.

The takeaway is operational, not architectural. AIWG doesn't add Focus tool primitives — instead, Rule 6 mandates the *behavior* the primitives enforce: after every meaningful tool-result observation, ask "is the raw content load-bearing or is the conclusion?" If conclusion-only, summarize forward and drop the raw output.

---

## Direct Application: `auto-compact-continue` Rule 6

Rule 6 operationalizes REF-122's findings as three checkpointing behaviors:

1. **Per-observation pruning**: after every meaningful tool-result observation, ask "is the raw content load-bearing for the remaining work, or is the conclusion?" If conclusion-only, summarize it into your next thought and stop carrying the raw output forward.
2. **Tool-call cadence**: after every 10–15 tool calls on a long task, write a progress-file update.
3. **Delegation discipline**: before spawning a subagent (`subagent-scoping` rule), pass conclusions, not raw history (`context-bloat` rule).

The 10-15 tool call cadence comes directly from REF-122's "aggressive prompting" condition. The 22.7% vs 6% gap supplies the *why* — passive compression is too rare to matter, and may even hurt accuracy if the agent improvises about what to keep.

---

## Quantitative Evidence

| Metric | Baseline | Focus (aggressive) | Delta |
|---|---|---|---|
| Task Success (Tests Pass) | 3/5 (60%) | 3/5 (60%) | Same |
| Total Tokens | 14,920,555 | 11,526,418 | **-22.7%** |
| Avg Tokens/Task | 2,984,111 | 2,305,284 | -678K |
| Avg Compressions | 0 | 6.0 | — |
| Avg Messages Dropped | 0 | 70.2 | — |

| Prompting Style | Avg Compressions/Task | Token Savings | Accuracy |
|---|---|---|---|
| Passive | 2.0 | 6% | **60% (degraded from 80% baseline)** |
| Aggressive | 6.0 | **22.7%** | 60% (same as baseline) |

### Per-instance heterogeneity

Focus reduced tokens on 4 of 5 instances (range: -18% to -57%). The exception was `pylint-7080` (+110% tokens) — Focus made 136 LLM calls vs Baseline's 63 because compressions occasionally discarded context the agent later needed, forcing re-exploration.

**AIWG implication**: Rule 6's discipline carries a "re-exploration" risk on tasks where compressed-away context later becomes needed. AIWG mitigates by writing structured progress-file summaries (Rule 3) rather than raw conversational summaries — the progress file is recoverable, the conversational summary often isn't.

---

## Limitations & Open Questions

- **N=5**: five SWE-bench Lite instances; not statistically significant. The 22.7% finding is suggestive, not established.
- **Single model**: Claude Haiku 4.5 only. Generalization to Opus, Sonnet, GPT, Gemini unverified.
- **Single author, not peer-reviewed**: independent researcher preprint; methodology is reasonable but un-replicated.
- **Cognitive tax**: compression introduces token overhead (summary generation), amortized over the task. On short tasks the overhead dominates.
- **Re-exploration risk**: aggressive compression occasionally discards context the agent later needs (`pylint-7080` case).

**GRADE: VERY LOW** is appropriate. AIWG adopts the *direction* (aggressive > passive) without committing to the specific numbers as load-bearing. The rule cites "~22.7%" with a tilde to signal estimate-not-precision.

---

## Cross-References

- **REF-910** (Anthropic — Compaction) — platform layer: REF-122 is the agent-controlled layer on top.
- **REF-909** (Effective Harnesses) — sibling: across-session pattern; REF-122 is within-session.
- **REF-128** (Zylos — Context Window Management) — context: 30-40% effective-capacity gap is the problem REF-122 attacks.
- **REF-143** (ACON) — adjacent research direction in context compression.
- **REF-369** (Survey of Context Engineering) — places this work in the academic taxonomy.

### Within AIWG

- @agentic/code/addons/aiwg-utils/rules/auto-compact-continue.md — Rule 6 is the direct consumer
- @agentic/code/addons/aiwg-utils/rules/context-bloat.md — companion: don't pass raw history to subagents
- @agentic/code/addons/aiwg-utils/rules/subagent-scoping.md — companion: focused delegation
- @agentic/code/addons/aiwg-utils/rules/context-budget.md — companion: budget-aware compression

---

## Implementation Status

| AIWG component | Status | Notes |
|---|---|---|
| Rule 6 ("Aggressive, Not Passive") | Active | Codified with 10-15 tool-call cadence |
| Per-observation pruning discipline | Codified | Rule 6 first bullet |
| Tool-call cadence checkpointing | Codified | Rule 6 second bullet |
| Subagent delegation passes conclusions | Codified | Rule 6 third bullet + context-bloat rule |
| Focus-style tool primitives | Not adopted | AIWG uses progress file + activity log instead |

---

## Revision History

| Date | Change | Author |
|---|---|---|
| 2026-05-15 | Initial AIWG-side analysis | claude-opus-4-7 |
