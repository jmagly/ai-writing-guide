# Issue 1585 Review Packet: LFD Control Patterns Before Construction

**Issue**: `roctinam/aiwg#1585`  
**Date**: 2026-06-17  
**Status**: Ready for operator review; construction not yet approved  
**Gate Result**: CONDITIONAL GO to construction after explicit decisions below

## Purpose

This packet consolidates the research spike and SDLC planning artifacts for
issue #1585 so the operator can review the proposed direction before
construction begins.

## Evidence Reviewed

### Primary LFD source

- `https://github.com/elvisun/loss-function-development`
- Verified current source files:
  - `README.md`
  - `skills/lfd-design/SKILL.md`
  - `skills/lfd-design/references/cheat-museum.md`
  - `skills/lfd-design/references/goal-template.md`
  - `skills/lfd-design/references/log-template.md`

### Research corpus

- `section9/research-papers`
- Verified audit reports:
  - `audits/LFD-2026-06-13/01-loss-function-development-report.md`
  - `audits/LFD-2026-06-13/02-lfd-vs-aiwg-analysis.md`
- Closed induction issues:
  - `section9/research-papers#66`: REF-1398 through REF-1402
  - `section9/research-papers#67`: REF-1403
  - `section9/research-papers#71`: corrected edges plus REF-1404 through REF-1406
- New follow-up induction:
  - `section9/research-papers#72`: AI Safety Gridworlds and deduplication /
    memorization follow-up sources

### Local AIWG evidence

- Local AIWG research anchors exist for REF-015, REF-017, REF-018, REF-057,
  REF-058, REF-089, REF-122, REF-909, and REF-910.
- Existing agent-persistence risk/test/security docs were used as style and
  scope references.

## Review Artifacts

| Artifact | Purpose |
|---|---|
| `.aiwg/research/reports/issue-1585-lfd-control-patterns-research-brief.md` | Source inventory and track-by-track synthesis |
| `.aiwg/architecture/adr-lfd-control-patterns-for-agent-loops.md` | Proposed architectural decision |
| `.aiwg/planning/issue-1585-lfd-control-patterns-plan.md` | Backlog waves and construction order |
| `.aiwg/planning/issue-1585-construction-issue-preview.md` | Draft tracker issues for approval before filing |
| `.aiwg/planning/issue-1585-operator-approval-record.md` | Pending approval decisions before construction |
| `.aiwg/planning/issue-1585-research-planning-completion-audit.md` | Completion audit for research/planning phase |
| `.aiwg/risks/issue-1585-lfd-control-patterns-risks.md` | Risk register for the proposed control model |
| `.aiwg/testing/issue-1585-lfd-control-patterns-test-strategy.md` | Verification expectations for construction |
| `.aiwg/security/issue-1585-lfd-control-patterns-security-screening.md` | Security-sensitive constraints and threat notes |

## Proposed Decision

Adopt LFD patterns into AIWG as conditional loop controls, not as a mandatory
global workflow:

1. Add a mechanical-control layer for long-running, adversarial, high-stakes,
   eval-driven, or budgeted loops.
2. Preserve cooperative AIWG rules, but make mechanical evidence load-bearing
   under high criticality.
3. Introduce five portable control primitives:
   - dosed entropy: stall rule plus configurable exploration quota
   - hypothesis-before-change iteration records
   - holdout isolation and contamination discipline
   - mechanical/cooperative rule tiering
   - hard budget stop with best-output report

## Recommended Construction Scope

Recommended first pass:

1. **Docs/rules first**:
   - mechanical/cooperative rule-tier guidance
   - reproducibility holdout extension
   - progress-file / best-output schema guidance
   - loop entropy directive
2. **Runtime support second**:
   - wall-clock budget object and budget-exhausted stop
   - best-output stop report
   - token/spend fields only where observable
3. **Harness conventions third**:
   - optional score/lint/probe/status convention
   - VOID semantics and human-only diagnostics
   - holdout leakage tests

## Gate Criteria

### Research Sufficiency

| Criterion | Status | Evidence |
|---|---|---|
| Primary LFD source verified | PASS | GitHub raw/API reads on 2026-06-17 |
| Existing audit reports verified | PASS | `audits/LFD-2026-06-13/*` in `section9/research-papers` |
| Core REFs inducted | PASS | `section9/research-papers#66`, `#67`, `#71` closed |
| New sources filed for induction | PASS | `section9/research-papers#72` open with `induction` label |
| Local AIWG anchors identified | PASS | listed in research brief |

### Planning Completeness

| Criterion | Status | Evidence |
|---|---|---|
| ADR drafted | PASS | `adr-lfd-control-patterns-for-agent-loops.md` |
| Backlog waves drafted | PASS | planning doc |
| Risks identified | PASS | risk register |
| Test expectations drafted | PASS | test strategy |
| Security-sensitive constraints drafted | PASS | security screening |
| Human review gate explicit | PASS | planning doc and this packet |

### Construction Readiness

| Criterion | Status | Evidence |
|---|---|---|
| Operator approves ADR direction | PENDING | requires review |
| Operator selects loop surface priority | PENDING | requires review |
| Operator chooses docs-only vs runtime first pass | PENDING | requires review |
| Operator decides VOID scope | PENDING | requires review |
| Operator accepts risk/test/security constraints | PENDING | requires review |

## Decision Questions

Please answer these before construction starts:

1. **Loop surface priority**
   - Recommended: generic `agent-loop` plus Ralph docs first; Mission Control
     after the shared language settles.
   - Alternatives: Ralph-only, Mission Control-first, or all surfaces in one
     pass.

2. **First construction wave**
   - Recommended: docs/rules only for Wave 1, with runtime budget/status support
     as Wave 2.
   - Alternative: include wall-clock budget stop in the first construction pass.

3. **VOID semantics scope**
   - Recommended: eval/holdout harnesses and high-criticality adversarial loops
     only.
   - Alternative: broader high-criticality rule pattern across AIWG.

4. **Exploration quota default**
   - Recommended: require each loop to declare K initially; add a default only
     after dogfooding.
   - Alternative: ship a default K in docs now.

5. **Construction issue shape**
   - Recommended: split into backlog waves from the planning doc.
   - Alternative: one combined construction issue for all five tracks.

## Go / No-Go Recommendation

**Recommendation**: CONDITIONAL GO after operator approval.

Construction should not start until the decision questions above are resolved.
The research and planning artifacts are otherwise sufficient for a construction
handoff.

## Tracker Updates Already Posted

- Progress comment with initial research/planning artifacts
- Addendum with verified audit report paths
- Update listing risk/test/security support docs

## Next Action

Operator reviews this packet and answers the decision questions. After approval,
construction can proceed using the backlog waves in
`.aiwg/planning/issue-1585-lfd-control-patterns-plan.md` and the draft tracker
issue preview in `.aiwg/planning/issue-1585-construction-issue-preview.md`.
Record the decision in
`.aiwg/planning/issue-1585-operator-approval-record.md`.
