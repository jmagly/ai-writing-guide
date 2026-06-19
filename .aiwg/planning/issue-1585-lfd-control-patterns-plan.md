# Issue 1585 Plan: Port LFD Control Patterns into AIWG

**Status**: Proposed plan for human review before construction  
**Issue**: `roctinam/aiwg#1585`  
**Related ADR**: `.aiwg/architecture/adr-lfd-control-patterns-for-agent-loops.md`  
**Research brief**: `.aiwg/research/reports/issue-1585-lfd-control-patterns-research-brief.md`
**Review packet**: `.aiwg/planning/issue-1585-review-packet.md`
**Issue preview**: `.aiwg/planning/issue-1585-construction-issue-preview.md`
**Approval record**: `.aiwg/planning/issue-1585-operator-approval-record.md`
**Completion audit**: `.aiwg/planning/issue-1585-research-planning-completion-audit.md`
**Supporting docs**:

- `.aiwg/risks/issue-1585-lfd-control-patterns-risks.md`
- `.aiwg/testing/issue-1585-lfd-control-patterns-test-strategy.md`
- `.aiwg/security/issue-1585-lfd-control-patterns-security-screening.md`

## Scope

This plan covers research-backed design and backlog decomposition for the five
tracks in issue #1585. It intentionally stops before construction.

In scope:

- rules and skills that govern Ralph / agent-loop / Mission-style loops
- progress-file and iteration-record schema guidance
- reproducibility and eval-fixture guidance
- mechanical-vs-cooperative control tiering
- budget stop-condition design

Out of scope for the first construction pass:

- building a full LFD-compatible harness generator
- importing LFD as an AIWG skill verbatim
- changing every AIWG workflow to require eval/holdout setup
- scoring or optimizing current issue-resolution loops against a new metric

## Proposed Backlog

### Wave 1: Documentation and Control Model

1. **ADR and rule-tier doc**
   - Deliverable: accepted ADR plus a mechanical/cooperative rule-tier doc.
   - Acceptance:
     - Defines black-box/mechanical vs white-box/cooperative controls.
     - Names which controls are load-bearing under high criticality.
     - Cross-links REF-1398 through REF-1406 and issue #1585.

2. **Reproducibility holdout extension**
   - Deliverable: update reproducibility/reproducibility-validation guidance.
   - Acceptance:
     - Adds dev/holdout split language.
     - Requires holdout answers to be hidden from optimizer-readable surfaces.
     - Defines aggregate-only holdout feedback and leakage audit.
     - Covers canaries/capacity caps for benchmark fixtures.

3. **Hypothesis-before-change progress schema**
   - Deliverable: update progress-file / best-output / thought-protocol docs.
   - Acceptance:
     - Adds `hypothesis`, `expected_failure_mode`, and
       `distinguishing_diagnostic` before-change fields.
     - Explains how fields survive compaction.
     - Includes at least one example iteration record.

### Wave 2: Loop Runtime Policy

4. **Dosed entropy directive**
   - Deliverable: Ralph/agent-loop loop directive for stall rule and
     exploration quota.
   - Acceptance:
     - Non-improving cycle forbids repeating the same adjustment.
     - Every K cycles requires a structurally different approach.
     - K is configurable or locally declared.
     - Directive remains bounded by stop conditions.

5. **Budget stop-condition design**
   - Deliverable: loop budget spec and stop report schema.
   - Acceptance:
     - Covers wall-clock, token, and spend ceilings where observable.
     - Defines budget-exhausted stop behavior.
     - Requires best-output report on stop.
     - Separates rate caps from hard stops.

### Wave 3: Harness and Verification Conventions

6. **Eval harness convention**
   - Deliverable: optional convention for `score`, `lint`, `probe`, and
     `status` instruments in eval-driven AIWG loops.
   - Acceptance:
     - Defines VOID semantics.
     - Requires detailed lint findings to stay outside optimizer-readable
       surfaces.
     - Defines probe gap as memorization/generalization signal.
     - Includes test expectations for no holdout answer leakage.

7. **Traceability and corpus cross-links**
   - Deliverable: issue #1585 docs/rules cross-link to REF-1398 through
     REF-1406 and any new induction tasks.
   - Acceptance:
     - Cites the corrected REF cluster including REF-1404 through REF-1406.
     - Notes any lower-priority sources left as future work.
     - Updates relevant docs indexes if the touched docs have indexes.

## Suggested Execution Order

1. Review this plan and ADR.
2. Track induction issue `section9/research-papers#72` for the lower-priority
   candidates from `section9/research-papers#71` that this plan now depends on.
3. Run construction Wave 1 first; it has no runtime dependencies.
4. Run Wave 2 after the control model language is accepted.
5. Run Wave 3 only after the team agrees how much LFD-style harness machinery
   belongs in AIWG core versus optional eval-driven workflows.

## Open Questions for Review

1. Should the first implementation target Ralph, generic `agent-loop`, Mission
   Control, or all loop surfaces at once?
2. Should VOID semantics be reserved for eval/holdout harnesses, or become a
   broader high-criticality rule pattern?
3. Do we want an explicit numeric default for exploration quota K, or require
   each loop to declare it?
4. Where should budget observation live first: docs-only, progress files, or a
   concrete `status` command/runtime helper?
5. Should construction produce one combined issue or split the seven backlog
   items above into separate tracker issues?

## Review Gate

Construction should not start until the operator approves:

- the ADR direction,
- the track/backlog split,
- the loop surface priority,
- the risk/test/security constraints,
- and the induction handling for lower-priority sources.
