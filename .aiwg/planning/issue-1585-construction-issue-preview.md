# Issue 1585 Construction Issue Preview

**Status**: Draft only; do not file until operator approval  
**Parent issue**: `roctinam/aiwg#1585`  
**Date**: 2026-06-17  
**Review packet**: `.aiwg/planning/issue-1585-review-packet.md`
**Approval record**: `.aiwg/planning/issue-1585-operator-approval-record.md`

## Purpose

This is the pre-filing issue preview for the construction work that would follow
the #1585 research spike. It converts the approved planning waves into concrete
tracker issues, labels, dependencies, and acceptance criteria. No issues have
been filed from this preview.

## Label Set

Use only labels already present in `roctinam/aiwg`:

- `agent-persistence`
- `efficiency`
- `enhancement`
- `kind/rule`
- `docs`
- `quality`
- `phase:construction`
- `priority:P1-high`
- `priority:P2-medium`

## Recommended Filing Shape

Recommended: split into seven construction issues, matching the planning waves.
This keeps docs/rules, runtime policy, and harness conventions separately
reviewable and testable.

Alternative: file one combined construction issue if the operator wants a single
tracking item, but that is not recommended because the work spans docs, runtime
policy, security, and test strategy.

## Wave 1: Documentation and Control Model

### 1. Document mechanical vs cooperative AIWG loop controls

**Labels**: `agent-persistence`, `enhancement`, `kind/rule`, `docs`,
`phase:construction`, `priority:P1-high`

**Depends on**: operator approval of ADR direction

**Summary**:

Define the two-layer control model introduced by the #1585 ADR: mechanical /
black-box controls versus cooperative / white-box controls. Make explicit which
controls are load-bearing under adversarial or high-criticality conditions and
which can only support, not replace, mechanical evidence.

**Supporting docs**:

- `.aiwg/architecture/adr-lfd-control-patterns-for-agent-loops.md`
- `.aiwg/security/issue-1585-lfd-control-patterns-security-screening.md`
- `.aiwg/risks/issue-1585-lfd-control-patterns-risks.md`

**Acceptance criteria**:

- [ ] Adds or updates AIWG rule guidance for mechanical vs cooperative controls.
- [ ] Identifies controls that are not substitutable by self-report.
- [ ] States that high-criticality loops require mechanical evidence for
  completion.
- [ ] Cross-links REF-1398 through REF-1406 and `roctinam/aiwg#1585`.
- [ ] Updates any relevant rule or docs index if the touched location has one.

### 2. Extend reproducibility guidance with holdout isolation

**Labels**: `quality`, `enhancement`, `kind/rule`, `docs`,
`phase:construction`, `priority:P1-high`

**Depends on**: issue 1

**Summary**:

Promote AIWG reproducibility guidance beyond deterministic reruns by adding
LFD-style holdout isolation, contamination discipline, aggregate-only holdout
feedback, and leakage audit guidance for eval/test fixtures that an agent
optimizes against.

**Supporting docs**:

- `.aiwg/research/reports/issue-1585-lfd-control-patterns-research-brief.md`
- `.aiwg/testing/issue-1585-lfd-control-patterns-test-strategy.md`
- `.aiwg/security/issue-1585-lfd-control-patterns-security-screening.md`

**Acceptance criteria**:

- [ ] Defines dev vs holdout split for eval-driven loops.
- [ ] Requires holdout answers to stay outside optimizer-readable surfaces.
- [ ] Defines aggregate-only holdout feedback.
- [ ] Adds leakage-audit guidance for scoring and lint output.
- [ ] Covers canaries/capacity caps for benchmark or fixture contamination.
- [ ] Avoids treating pending `section9/research-papers#72` sources as
  load-bearing unless they are inducted before citation.

### 3. Add hypothesis-before-change iteration record guidance

**Labels**: `agent-persistence`, `enhancement`, `kind/rule`, `docs`,
`phase:construction`, `priority:P1-high`

**Depends on**: issue 1

**Summary**:

Extend progress-file, best-output, or thought-protocol guidance with LFD's
hypothesis-before-change discipline: every cycle records the expected movement,
expected failure mode, distinguishing diagnostic, result, and generalization
signal before the next change.

**Supporting docs**:

- `.aiwg/planning/issue-1585-lfd-control-patterns-plan.md`
- `.aiwg/testing/issue-1585-lfd-control-patterns-test-strategy.md`

**Acceptance criteria**:

- [ ] Adds `hypothesis`, `expected_failure_mode`, and
  `distinguishing_diagnostic` fields or prose guidance.
- [ ] Explains that the fields are written before changes, not after.
- [ ] Explains how the record survives compaction/progress-file handoff.
- [ ] Includes at least one example iteration record.
- [ ] Preserves compatibility with existing progress logs.

## Wave 2: Loop Runtime Policy

### 4. Add dosed-entropy directive for AIWG agent loops

**Labels**: `agent-persistence`, `enhancement`, `kind/rule`, `docs`,
`phase:construction`, `priority:P2-medium`

**Depends on**: issues 1 and 3

**Summary**:

Add a bounded entropy directive for Ralph/generic agent-loop guidance: after a
non-improving cycle, the loop must not repeat the same adjustment, and every K
cycles it must try a structurally different approach. K should be declared per
loop initially unless the operator approves a default.

**Supporting docs**:

- `.aiwg/architecture/adr-lfd-control-patterns-for-agent-loops.md`
- `.aiwg/risks/issue-1585-lfd-control-patterns-risks.md`

**Acceptance criteria**:

- [ ] Defines stall rule for non-improving cycles.
- [ ] Defines exploration quota and requires K to be declared or configured.
- [ ] Requires structural variation to be tied to a hypothesis and diagnostic.
- [ ] Keeps budget and plateau stop conditions load-bearing.
- [ ] Documents that entropy is bounded exploration, not permission to wander.

### 5. Design hard budget stop conditions for loops

**Labels**: `agent-persistence`, `efficiency`, `enhancement`,
`phase:construction`, `priority:P2-medium`

**Depends on**: issue 1

**Summary**:

Define the loop budget object and stop-report behavior that complements
`context-budget` and `tool-quota`. Start with wall-clock as the baseline
observable; token and spend fields must report `unknown` unless provider logs
make them authoritative.

**Supporting docs**:

- `.aiwg/architecture/adr-lfd-control-patterns-for-agent-loops.md`
- `.aiwg/risks/issue-1585-lfd-control-patterns-risks.md`
- `.aiwg/testing/issue-1585-lfd-control-patterns-test-strategy.md`

**Acceptance criteria**:

- [ ] Defines budget fields for wall-clock, token, spend, and plateau stops.
- [ ] Defines `unknown` semantics for unobservable token/spend values.
- [ ] Defines budget-exhausted stop behavior.
- [ ] Requires best-output report on stop.
- [ ] Separates rate caps from hard stops.
- [ ] Includes test expectations if runtime helpers are implemented.

## Wave 3: Harness and Verification Conventions

### 6. Define optional eval harness convention for score/lint/probe/status

**Labels**: `quality`, `enhancement`, `docs`, `phase:construction`,
`priority:P2-medium`

**Depends on**: issues 1, 2, and 5

**Summary**:

Document an optional LFD-shaped harness convention for eval-driven AIWG loops:
`score`, `lint`, `probe`, and `status` instruments; VOID-on-violation output;
private diagnostics; holdout scoring limits; and no holdout answer leakage.

**Supporting docs**:

- `.aiwg/testing/issue-1585-lfd-control-patterns-test-strategy.md`
- `.aiwg/security/issue-1585-lfd-control-patterns-security-screening.md`

**Acceptance criteria**:

- [ ] Defines score/lint/probe/status responsibilities.
- [ ] Defines VOID semantics for optimizer-visible output.
- [ ] Requires detailed lint findings to stay outside optimizer-readable
  surfaces.
- [ ] Defines probe gap as a memorization/generalization signal.
- [ ] Adds or documents adversarial tests for holdout leakage if helpers are
  implemented.
- [ ] Keeps the convention optional unless a loop is eval-driven or
  high-criticality.

### 7. Wire traceability and corpus cross-links for the LFD control model

**Labels**: `docs`, `documentation`, `enhancement`, `phase:construction`,
`priority:P2-medium`

**Depends on**: issues 1 through 6

**Summary**:

Complete traceability across the #1585 implementation: link changed docs/rules
to the research brief, ADR, risk register, test strategy, security screening,
REF-1398 through REF-1406, and the follow-up induction issue.

**Supporting docs**:

- all #1585 planning artifacts
- `section9/research-papers#66`, `#67`, `#71`, `#72`

**Acceptance criteria**:

- [ ] Changed docs/rules cite or link the #1585 research brief and ADR.
- [ ] Construction notes cite REF-1398 through REF-1406 as the core cluster.
- [ ] Pending #72 sources are marked as pending unless inducted.
- [ ] Relevant indexes are updated where local conventions require it.
- [ ] `roctinam/aiwg#1585` receives a completion comment summarizing traceability.

## Recommended Execution Order

1. File Wave 1 issues after operator approval.
2. Run `address-issues` on Wave 1 first.
3. Review Wave 1 output before Wave 2 if the rule-tier language changes scope.
4. File or start Wave 2 only after budget/entropy choices are approved.
5. File or start Wave 3 only after the harness convention is confirmed as
   optional and eval-driven.

## Proposed `address-issues` Handoff

After filing, the handoff should run in waves:

```bash
address-issues <wave-1-issue-numbers> --guidance "Implement #1585 docs/rules first; no runtime harness changes yet unless explicitly approved."
address-issues <wave-2-issue-numbers> --guidance "Implement #1585 loop runtime policy only after Wave 1 language is accepted."
address-issues <wave-3-issue-numbers> --guidance "Implement optional eval harness conventions; preserve holdout secrecy and VOID diagnostics constraints."
```

## Approval Needed Before Filing

- [ ] Operator approves split-issue filing shape.
- [ ] Operator confirms Wave 1 should be docs/rules only.
- [ ] Operator confirms loop surface priority.
- [ ] Operator confirms VOID scope.
- [ ] Operator confirms exploration quota default policy.
- [ ] Operator approval is recorded in
  `.aiwg/planning/issue-1585-operator-approval-record.md`.
