# ADR: LFD Control Patterns for AIWG Agent Loops

## Status

Proposed for review

## Context

Issue #1585 identifies a gap between the external Loss-Function-Development
(LFD) skill and AIWG's existing agent-loop discipline. LFD treats the agent as
a black-box optimizer and wraps it with a mechanically scored loss function,
hidden holdout, budget instruments, cheat fences, and stop conditions. AIWG
already has strong internal discipline: research-before-decision, phase gates,
best-output selection, compaction-aware progress files, tool quotas, and
escalation norms.

The systems are complementary. LFD supplies outer-envelope controls that remain
valid when the optimizer is literal, overfits feedback, or self-reports
incorrectly. AIWG supplies workflow topology, corpus grounding, and cooperative
execution discipline. The decision is how to combine them without making every
AIWG task carry heavyweight eval machinery.

## Decision

Adopt LFD patterns into AIWG as a tiered loop-control model:

1. Add a mechanical-control layer for agent loops that can be enabled when a
   task is long-running, adversarial, high-stakes, eval-driven, or budgeted.
2. Preserve AIWG's cooperative instruction layer as useful guidance, but do not
   let it substitute for mechanical evidence under high criticality.
3. Introduce five portable control primitives:
   - bounded entropy: stall rule plus configurable exploration quota
   - experiment log: hypothesis, expected failure mode, diagnostic, result
   - holdout isolation: hidden answers, aggregate-only acceptance, leak audit
   - rule tiering: mechanical controls vs cooperative controls
   - budget stop: wall-clock/token/spend ceiling that halts with a best-output
     report
4. Stage implementation through docs/rules first, then loop runtime support,
   then harness integration.

## Consequences

### Positive

- Long-running loops gain an explicit stop condition instead of relying only on
  rate caps or agent judgment.
- Eval-driven tasks become less vulnerable to dev-set overfitting, fixture
  memorization, and feedback-channel mining.
- High-criticality workflows get a clear evidence hierarchy: mechanical gates
  first, self-report second.
- Progress logs become more audit-friendly across compaction because every
  cycle records a falsifiable hypothesis before the change.

### Negative

- Some workflows will require more upfront setup before autonomous execution.
- Holdout and lint instruments can become feedback channels if poorly designed.
- A universal K for exploration quota would be false precision; the system must
  allow task-specific tuning.
- VOID semantics can frustrate operators if harnesses do not preserve detailed
  findings outside the optimizer's read surface.

### Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Heavyweight LFD controls slow simple tasks | Make the mechanical layer conditional by criticality and task type |
| Harness/lint reports leak holdout membership | Use aggregate-only output to the optimizer; write details to human-only logs |
| Agents optimize around budget stop by under-reporting | Derive elapsed time and spend from external logs where possible |
| Exploration quota causes random churn | Require "structural variation" to be declared in the hypothesis log and bounded by stop conditions |

## Alternatives Considered

### Copy LFD as a new AIWG workflow

Rejected. It would duplicate useful AIWG machinery and make the integration a
separate island instead of improving existing loops.

### Keep AIWG unchanged and cite LFD only in docs

Rejected. Issue #1585 identifies concrete missing controls, especially hard
budget stop conditions and holdout isolation.

### Make LFD controls mandatory for every loop

Rejected. The controls are valuable but too costly for small, non-adversarial,
single-turn, or purely documentary work.

## Implementation Plan

### Phase 1: Rule and Documentation Changes

- Add rule-tiering guidance to distinguish mechanical and cooperative controls.
- Extend reproducibility guidance with holdout isolation and contamination
  discipline.
- Extend best-output/progress guidance with hypothesis-before-change fields.
- Add loop entropy guidance to Ralph/agent-loop docs.

### Phase 2: Runtime Planning

- Define a shared loop budget object:
  - wall-clock ceiling
  - token ceiling where observable
  - spend ceiling where provider logs allow
  - diminishing-returns threshold
- Define stop report schema:
  - best score / best output
  - budget consumed
  - cycles run
  - hypothesis outcomes
  - next recommended action

### Phase 3: Harness Integration

- Add optional score/lint/probe/status instrument conventions for eval-driven
  AIWG loops.
- Ensure any holdout-touching lint produces VOID to the optimizer and detailed
  diagnostics only to human-readable private logs.
- Add tests that prove holdout answers and lint details do not enter the
  optimizer-readable surface.

## References

- AIWG issue: `roctinam/aiwg#1585`
- LFD source: `https://github.com/elvisun/loss-function-development`
- LFD audit reports in `section9/research-papers`:
  - `audits/LFD-2026-06-13/01-loss-function-development-report.md`
  - `audits/LFD-2026-06-13/02-lfd-vs-aiwg-analysis.md`
- Research induction:
  - `section9/research-papers#66`
  - `section9/research-papers#67`
  - `section9/research-papers#71`
- Core evidence cluster:
  - REF-1398 through REF-1406
- Local AIWG anchors:
  - REF-015, REF-017, REF-018, REF-057, REF-058, REF-089, REF-122, REF-909,
    REF-910
- Supporting planning docs:
  - `.aiwg/planning/issue-1585-review-packet.md`
  - `.aiwg/planning/issue-1585-lfd-control-patterns-plan.md`
  - `.aiwg/risks/issue-1585-lfd-control-patterns-risks.md`
  - `.aiwg/testing/issue-1585-lfd-control-patterns-test-strategy.md`
  - `.aiwg/security/issue-1585-lfd-control-patterns-security-screening.md`
