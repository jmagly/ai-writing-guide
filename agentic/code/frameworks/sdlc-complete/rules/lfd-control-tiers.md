# LFD Control Tiers — Mechanical vs Cooperative

**Enforcement Level**: HIGH
**Scope**: All agent-loop / Mission Control LFD controls
**Issue**: #1585 (Track 4); remediation #1769
**Research Basis**: LFD black-box discipline; REF-803/444/189 (deceptive/hidden-objective agents)

## Overview

LFD (Loss-Function-Development) controls fall into two tiers by **who enforces
them**. This distinction is load-bearing: under adversarial or high-criticality
conditions, only the mechanical tier survives a deceptive optimizer, because a
white-box (cooperative) control cannot fence a black-box deception.

A control is **mechanical** if its trigger and enforcement are computed by the
harness from observed facts the agent cannot fabricate through its output text.
A control is **cooperative** if it is a prompt directive the agent is asked to
honor — useful for a cooperative agent, but substitutable by agent self-report.

## The tier table

| Control | Trigger source | Enforcement | Substitutable by self-report? | Tier |
|---|---|---|---|---|
| Wall-clock budget stop | Orchestrator-measured elapsed time | Harness halts the loop + best-output report | **No** | Mechanical |
| Tool-call budget stop | Harness-counted tool-call events | Harness halts the loop | **No** | Mechanical |
| Token/spend budget stop | Provider-reported usage (else **unobservable**, surfaced) | Harness halts when observable; warns when not | **No** (never silently passes; #1766) | Mechanical |
| Budget-exhausted resume guard | Persisted status + restored cumulative counters | Resume refused without `--allow-exhausted-resume` | **No** | Mechanical |
| Exploration quota (flat-cycle → structural variant) | Quality-delta over K cycles (quality signal is analyzer-scored) | Prompt directive requiring a variant | **Partially** — trigger depends on the quality signal; enforcement is a directive | Hybrid |
| Stall rule (no-repeat adjustment) | Adjustment fingerprint + non-improving quality delta | Prompt directive forbidding the prior adjustment | **Partially** — same caveat as the quota | Hybrid |
| Hypothesis-before-change record | Planner-derived pre-change, injected + recorded | Prompt directive to state/refine before acting | **Yes** (the agent authors the confirmation) | Cooperative |
| Eval-harness VOID (lint violation → VOID) | Harness lint instrument exit/violation (#1776) | Harness sets `void`; VOID fenced out of best-output selection (mechanical) | **No** for the fence; the lint instrument itself is harness-owned | Mechanical |
| Holdout isolation (VOID-safe optimizer feedback) | Allowlist strip of forbidden fields (#1776) | Only aggregate/VOID feedback reaches the agent; diagnostics kept private | **No** | Mechanical |
| Plateau ≠ success | Quality-delta plateau over N cycles | Harness assigns `plateau` status (never success) | **No** for the *status*; the quality signal is analyzer-scored | Hybrid |

## Rules

### Rule 1: The quality signal is not mechanical

Flat-cycle detection, the stall rule's non-improving test, best-output
selection, and plateau detection all read `quality_score`, which is derived by
the output analyzer from agent stdout. An agent that varies phrasing can move
that signal. Therefore the **exploration quota, stall rule, and plateau** are
**hybrid**, not mechanical — do not document or rely on them as tamper-proof
under an adversarial threat model. When a genuinely mechanical trigger is
required (eval/holdout loops, high-criticality), gate on verification exit
codes, diff statistics, or test counts — not the analyzer score.

### Rule 2: Mechanical controls must remain load-bearing under adversarial pressure

Under `criticality-panel-sizing` HIGH/adversarial conditions, the mechanical
tier (wall-clock/tool-call/token-spend budget stops, resume guard) must be the
load-bearing control. A cooperative or hybrid control MUST NOT be the sole gate
for a high-stakes stop. Wall-clock is the provider-independent hard stop and
should always be available as the backstop.

### Rule 3: Cooperative controls are honest annotations, not guarantees

Hypothesis-before-change records are authored (or refined) by the agent. They
are valuable for auditability and for steering a cooperative agent, but they are
NOT evidence of what the agent actually did. Do not treat a recorded hypothesis
as proof of a pre-change experiment under an adversarial model. The record is
marked `recorded_before_change: true` because the harness derives the initial
hypothesis pre-session; the agent's refinement is cooperative.

### Rule 4: Prompt-injected controls apply to all command-injection providers

Hybrid/cooperative controls are injected into the prompt, so they apply to every
provider that accepts an injected prompt — not only the Claude adapter. The
mechanical controls are enforced by the harness and are likewise
provider-independent. Neither tier may be silently Claude-only.

## References

- `.aiwg/reports/lfd-cycle-audit-2026-07-11.md` — Track 4 findings (M2, D-F12)
- `agentic/code/frameworks/sdlc-complete/rules/best-output-selection.md`
- `agentic/code/frameworks/sdlc-complete/rules/reproducibility.md`
- `tools/ralph-external/iteration-analytics.mjs` — `checkBudgetLimits`, `checkStallRule`, `checkExplorationQuota`
- `.aiwg/risks/issue-1585-lfd-control-patterns-risks.md` — R-LFD-005

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-07-11
