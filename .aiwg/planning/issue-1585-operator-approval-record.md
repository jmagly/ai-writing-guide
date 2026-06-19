# Issue 1585 Operator Approval Record

**Issue**: `roctinam/aiwg#1585`  
**Status**: Pending operator decision  
**Date opened**: 2026-06-17  
**Review packet**: `.aiwg/planning/issue-1585-review-packet.md`  
**Construction preview**: `.aiwg/planning/issue-1585-construction-issue-preview.md`

## Purpose

This record captures the operator decisions required before issue #1585 moves
from research/planning into construction. Construction should not start until
the approval status is changed from `PENDING` to `APPROVED` or the plan is
revised.

## Approval Status

**Overall status**: PENDING

| Decision | Recommended Option | Operator Decision | Status |
|---|---|---|---|
| ADR direction | Adopt conditional LFD controls, not a mandatory global workflow | TBD | PENDING |
| Loop surface priority | generic `agent-loop` plus Ralph docs first; Mission Control later | TBD | PENDING |
| First construction wave | docs/rules only for Wave 1 | TBD | PENDING |
| VOID semantics scope | eval/holdout harnesses and high-criticality adversarial loops only | TBD | PENDING |
| Exploration quota policy | require each loop to declare K initially | TBD | PENDING |
| Issue filing shape | split into seven construction issues across three waves | TBD | PENDING |
| Risk/test/security constraints | accept supporting docs as construction constraints | TBD | PENDING |
| Follow-up research handling | cite REF-1398 through REF-1406 as load-bearing; treat #72 as pending | TBD | PENDING |

## Approval Options

### Option A: Approve Recommended Path

Approve the recommended path:

- split into seven construction issues
- Wave 1 docs/rules only
- generic `agent-loop` plus Ralph docs first
- VOID limited to eval/holdout harnesses and high-criticality adversarial loops
- per-loop declared exploration quota K
- REF-1398 through REF-1406 are load-bearing; `section9/research-papers#72`
  remains pending/future evidence

### Option B: Revise Before Construction

Provide revision guidance for any decision above. Update the review packet,
construction preview, ADR, and supporting docs before filing construction
issues.

### Option C: Stop After Research Spike

Do not proceed to construction. Keep the research/planning packet as the outcome
for #1585 and close or defer construction follow-up manually.

## Required Actions After Approval

If approved:

1. File the construction issues from
   `.aiwg/planning/issue-1585-construction-issue-preview.md`.
2. Link each child issue back to `roctinam/aiwg#1585`.
3. Post the filed issue list and wave ordering to `roctinam/aiwg#1585`.
4. Start `address-issues` only on Wave 1 unless the operator explicitly expands
   the construction scope.

## Required Actions If Revised

If revised:

1. Update this record with the chosen decisions.
2. Update the review packet and construction issue preview.
3. Re-post a tracker comment summarizing the revision.
4. Wait for explicit approval again before filing construction issues.

## Notes

This record intentionally has no default approval. The original guidance
requested review before construction, so silence is not approval.
