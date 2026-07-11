# Issue 1585 Operator Approval Record

**Issue**: `roctinam/aiwg#1585`  
**Status**: APPROVED — retroactive, with revisions (operator decision recorded 2026-07-11)  
**Date opened**: 2026-06-17  
**Date decided**: 2026-07-11  
**Review packet**: `.aiwg/planning/issue-1585-review-packet.md`  
**Construction preview**: `.aiwg/planning/issue-1585-construction-issue-preview.md`  
**Post-construction audit**: `.aiwg/reports/lfd-cycle-audit-2026-07-11.md`

## Purpose

This record captures the operator decisions required before issue #1585 moves
from research/planning into construction. Construction should not start until
the approval status is changed from `PENDING` to `APPROVED` or the plan is
revised.

## Approval Status

**Overall status**: APPROVED (retroactive, 2026-07-11)

Construction was executed on 2026-07-10 (commits `9fe5af09f`, `9acf62206`) while this
gate was still PENDING — risk **R-LFD-010 ("Human Review Gate Skipped") occurred**.
On 2026-07-11 the operator, after reviewing the post-construction audit
(`.aiwg/reports/lfd-cycle-audit-2026-07-11.md`), granted **retroactive approval
as-built** for the delivered scope, with the revisions recorded below. The
"Review before construction" control is recorded as **WAIVED (2026-07-11)**, not
passed. Remediation proceeds via issues `#1765`–`#1775`.

| Decision | Recommended Option | Operator Decision (2026-07-11) | Status |
|---|---|---|---|
| ADR direction | Adopt conditional LFD controls, not a mandatory global workflow | Approved as recommended; ADR marked Accepted | APPROVED |
| Loop surface priority | generic `agent-loop` plus Ralph docs first; Mission Control later | Retroactively approved as-built (agent-loop + external runtime + Mission Control in one pass) | APPROVED (as-built) |
| First construction wave | docs/rules only for Wave 1 | Wave sequencing waived retroactively; all tracks delivered in one commit; remediation now tracked per-issue (#1765–#1775) | WAIVED |
| VOID semantics scope | eval/holdout harnesses and high-criticality adversarial loops only | Approved as recommended; eval-harness + VOID must now be BUILT (not spec-only) — #1771/#1772 | APPROVED + BUILD |
| Exploration quota policy | require each loop to declare K initially | **REVISED**: require declared K per loop, no default — the shipped on-by-default k=3 is to be reverted (#1770) | REVISED |
| Issue filing shape | split into seven construction issues across three waves | Superseded: 11 post-audit remediation issues filed instead (#1765–#1775), linked from #1585 | SUPERSEDED |
| Risk/test/security constraints | accept supporting docs as construction constraints | Accepted; R-LFD-010 marked occurred; R-LFD-003 re-review required (zero-vs-unknown gap, #1766) | APPROVED |
| Follow-up research handling | cite REF-1398 through REF-1406 as load-bearing; treat #72 as pending | Retroactive acceptance of the expanded evidence base (REF-1398–1406 + REF-1500–1542) conditional on the spot-check in #1775 | CONDITIONAL |

### Additional operator directives (2026-07-11)

1. **Stop semantics** (#1767): budget-vs-completion behavior is to be **configurable,
   with completion-wins as the default** (a task that meets completion criteria on the
   ceiling-crossing iteration reports success, budget crossing annotated). A quality
   plateau must never be recorded as `success` without verification — it gets a
   distinct status/outcome.
2. **Build, don't descope** (#1768, #1769, #1771, #1772): the stall rule, real
   pre-change hypothesis records, the eval-harness + VOID contract, and the
   `holdout-isolated` execution mode are all to be implemented.
3. **Implementation shape**: LFD controls are to be implemented as **agentically
   driven functions**, with the CLI system providing support only at logical entry
   points — not as CLI-only mechanisms.
4. **Provider coverage**: loop controls must have proper implementation support for
   **all providers that allow command injection** (prompt/command-level control
   surfaces), not only the Claude adapter.

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
