# Test Strategy: LFD Control Patterns for AIWG Agent Loops

**Document Type**: Test Strategy  
**Issue**: `roctinam/aiwg#1585`  
**Status**: Draft for pre-construction review  
**Date**: 2026-06-17  
**Related Docs**:

- `.aiwg/research/reports/issue-1585-lfd-control-patterns-research-brief.md`
- `.aiwg/architecture/adr-lfd-control-patterns-for-agent-loops.md`
- `.aiwg/planning/issue-1585-lfd-control-patterns-plan.md`
- `.aiwg/risks/issue-1585-lfd-control-patterns-risks.md`

## Executive Summary

This strategy defines how construction for issue #1585 should be verified once
approved. The expected work is rule/documentation first, then optional runtime
budget/status support, then eval-harness conventions. Tests must prove the new
controls improve loop discipline without leaking holdout data, blocking simple
workflows, or substituting self-report for mechanical evidence.

## Quality Goals

| Goal | Target |
|---|---|
| Rule clarity | Operators can identify when LFD controls are required, optional, or unnecessary |
| Evaluation integrity | Holdout answers and lint details never enter optimizer-readable output |
| Backward compatibility | Existing non-eval workflows continue without mandatory harness setup |
| Budget stop behavior | Budget exhaustion halts loops and emits a best-output report |
| Progress auditability | Each cycle can record hypothesis, expected failure, diagnostic, and result |

## Test Scope by Wave

### Wave 1: Documentation and Rule Changes

**Artifacts under test**:

- rule-tier documentation
- reproducibility / holdout isolation guidance
- progress-file / best-output / thought-protocol guidance
- loop entropy guidance

**Verification**:

- Static doc tests or unit tests that scan for required concepts:
  - mechanical vs cooperative controls
  - holdout-only acceptance
  - aggregate-only holdout feedback
  - hypothesis-before-change fields
  - stall rule and exploration quota
- Existing routing/docs tests updated where command/skill mirrors include these
  files.
- Manual review confirms construction docs cite REF-1398 through REF-1406 and
  do not depend on pending #72 sources as load-bearing evidence.

### Wave 2: Runtime Budget/Status Support

**Artifacts under test**:

- loop budget schema or runtime helper
- budget-exhausted stop behavior
- best-output stop report
- status/progress output

**Unit tests**:

- Wall-clock budget exceeded -> loop stops.
- Token/spend unavailable -> status reports `unknown`, not a fabricated value.
- Budget remaining -> loop may continue.
- Plateau threshold reached -> loop stops with best-output report.
- Best output is preserved when later cycles regress.

**Integration tests**:

- A simulated loop runs multiple cycles, hits budget exhaustion, and emits a
  stop report.
- Existing loop without budget configuration behaves as before.
- Configured budget is carried through compaction/progress files.

### Wave 3: Eval Harness Conventions

**Artifacts under test**:

- score/lint/probe/status convention docs or helpers
- VOID semantics
- private diagnostics
- holdout scoring limits

**Required adversarial tests**:

- Plant an eval-shaped literal in optimizer-readable files. Scoring returns
  only `VOID: constraint violation` to optimizer output.
- Confirm detailed lint diagnostics are written only to the configured
  human-only location.
- Attempt repeated holdout scoring. Rate limit blocks or records calls
  according to policy.
- Probe gap increases after adding a lookup-shaped artifact; guidance requires
  removing eval-shaped artifacts rather than adding more.
- Scorer/checksum files declared read-only cannot be modified by the optimizer
  in the expected workflow.

## Test Data Requirements

Use synthetic fixtures for construction tests:

- small dev set with visible inputs and hidden answers
- small holdout set with hidden answers
- known-good candidate output
- known-bad candidate output
- eval-shaped literal planted for lint VOID testing
- lookup-shaped artifact that should trigger capacity-cap checks

Do not use real research corpus holdout data for unit tests. The goal is to
test leakage behavior and control flow, not benchmark model quality.

## Acceptance Criteria

Construction for issue #1585 should not be considered complete until:

- [ ] The ADR is accepted or explicitly superseded.
- [ ] The implemented docs/rules cross-link the research brief or core REFs.
- [ ] Tests cover every new parser/schema/helper introduced by runtime support.
- [ ] If VOID semantics are implemented, tests prove optimizer output does not
  reveal the matching holdout/lint detail.
- [ ] If budget stops are implemented, tests prove stop report generation and
  best-output preservation.
- [ ] Existing test suites relevant to touched files pass.

## Residual Test Gaps

Some claims will remain review-only unless a concrete runtime helper is built:

- Whether agents actually choose better structural variants under exploration
  quota.
- Whether real provider token/spend accounting is accurate across all surfaces.
- Whether holdout leakage can occur through side channels outside the harness
  contract, such as timing or filesystem metadata.

These should be called out in construction PR/commit notes if not directly
tested.
