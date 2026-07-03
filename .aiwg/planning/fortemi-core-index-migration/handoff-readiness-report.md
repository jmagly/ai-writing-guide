---
title: Fortemi Core Migration Handoff Readiness Report
date: 2026-07-02
parent_issue: 1664
status: delivered-fortemi-default-local-legacy
---

# Fortemi Core Migration Handoff Readiness Report

**Handoff**: delivery -> operations/release review
**Project**: AIWG Fortemi Core index/search migration
**Decision**: DELIVERED for Fortemi Core default, with local legacy fallback preserved

This report applies the `flow-handoff-checklist` delivery-to-operations shape to
the #1664 Fortemi Core migration. It is a readiness summary, not a tracker
mutation, release tag approval, legacy-backend removal approval, or production
closeout.

## Overall Status

| Area | Status | Evidence |
| --- | --- | --- |
| Local implementation | DELIVERED | Fortemi Core v2 export, sync/cache, default query/discover/show, graph traversal, research-query, KB traversal, and Cockpit capability validation shipped on `origin/main`; local remains available via `--backend local`. |
| Local regression tests | PASS locally | `npm run test:ci` passed on 2026-07-02: main suite `425` files, `7367` tests passed, `28` skipped; UAT suite `5` files, `95` tests passed. |
| Local index/cache readiness | PASS locally | Latest project graph has `1097` artifacts; Fortemi Core static cache has `1097` items and reports `stale: false`. |
| Documentation and runbooks | PASS locally | ADR, current-surface inventory, integration docs, release note, traceability matrix, PR checklist, post-CI closeout plan, package-boundary decision record, and tracker snapshot exist. |
| Remote CI | PASS | Pushed head `52f468e9ffc195bec18eb793b888e77992bafd01` is green: `CI / Test (push)` run 3196 job 0, `CI / Build (push)` run 3196 job 1, `Docsite Build` run 3197 job 0, and `Docsite Deploy` run 3198 job 0. |
| Tracker closeout | READY FOR CHILDREN | `tea login list` is empty, but the operator authorized Gitea MCP on 2026-07-02. Child issue closeout can use MCP with the pushed commit and CI evidence; legacy-removal filing remains gated. |
| Package boundary | PASS locally | `@fortemi/core@2026.7.1` accepts direct v2 exports; AIWG keeps the v2-to-v1 projection only for legacy compatibility. |
| Legacy backend removal | BLOCKED | The local backend is intentionally preserved behind `--backend local` for the phase-out window. Removal needs separate review after rollback evidence remains green. |

## Required Artifacts

| Artifact | Status | Location |
| --- | --- | --- |
| Handoff prompt | PRESENT | `.aiwg/planning/fortemi-core-index-migration/handoff-prompt.md` |
| Surface inventory | PRESENT | `.aiwg/planning/fortemi-core-index-migration/current-surface-inventory.md` |
| ADR | PRESENT | `.aiwg/architecture/adr-fortemi-core-indexing-substrate.md` |
| Completion gate audit | PRESENT | `.aiwg/planning/fortemi-core-index-migration/completion-gate-audit.md` |
| Traceability matrix | PRESENT | `.aiwg/planning/fortemi-core-index-migration/traceability-matrix.md` |
| PR readiness checklist | PRESENT | `.aiwg/planning/fortemi-core-index-migration/pr-readiness-checklist.md` |
| Tracker status refresh | PRESENT | `.aiwg/planning/fortemi-core-index-migration/tracker-status-refresh.md` |
| Post-CI closeout plan | PRESENT | `.aiwg/planning/fortemi-core-index-migration/post-ci-tracker-closeout-plan.md` |
| Package-boundary decision | PRESENT | `.aiwg/planning/fortemi-core-index-migration/package-boundary-decision-record.md` |
| Fortemi React issue audit | PRESENT | `.aiwg/planning/fortemi-core-index-migration/fortemi-react-issue-audit.md` |
| Legacy-removal planning draft | PRESENT, DO NOT FILE YET | `.aiwg/planning/fortemi-core-index-migration/default-backend-switch-issue-draft.md` |

## Checklist Results

| Criterion | Result | Notes |
| --- | --- | --- |
| Preserve public command behavior | PASS locally | Fortemi Core is the default backend; existing local behavior remains selectable through `--backend local`. |
| Preserve `.aiwg/.index` rollback | PASS locally | Local graph index remains the fallback; Fortemi cache is separate under `.aiwg/.index/fortemi-core/<graph>/`. |
| Avoid live Fortemi in required CI | PASS locally | Required CI path uses static fixtures; live/package checks are optional and gated. |
| No hardcoded credentials/direct REST import | PASS locally | Static sync/export code has security regression tests guarding against direct network clients and credential hooks. |
| Child issue evidence mapped | PASS locally | Traceability matrix maps #1684-#1691 to code, tests, docs, and remaining proof. |
| Remote CI proof | PASS | Public commit status for `52f468e9ffc195bec18eb793b888e77992bafd01` is `success` with CI/Test, CI/Build, Docsite Build, and Docsite Deploy all green. |
| Tracker write route | PARTIAL | Local `tea` login list is empty, but the operator authorized Gitea MCP on 2026-07-02. Use MCP only for non-closing comments or issue filing that does not bypass CI/package gates. |
| Maintainer/package-boundary signoff | PENDING | Projection is a bridge until accepted directly or explicitly approved. |

## Required Signoffs

| Role | Status | Required Evidence |
| --- | --- | --- |
| Engineering/reviewer | PASS | Direct-mode delivery to `origin/main` with green remote CI. |
| Release/operations | PENDING | Acceptance that rollback, cache status, and legacy-removal gates are documented and enforceable. |
| Tracker owner (`roctinam`) | PENDING | `tea` login configured and compliant comments/closures posted. |
| Package-boundary maintainer | PENDING | Direct v2 acceptance or explicit approval of the v2-to-v1 projection boundary. |

## Conditions Before Handoff Approval

1. Confirm remote CI runs the required `npm run test:ci` path without
   `AIWG_FORTEMI_CORE_LIVE` or `AIWG_FORTEMI_CORE_PACKAGE_REQUIRED`.
2. Prefer `tea` as `roctinam` if configured; otherwise use the
   operator-authorized Gitea MCP connector only for tracker mutations that do
   not bypass the remote CI, package-boundary, or legacy-removal gates.
3. Re-read #1664 and #1684-#1691 immediately before closeout; update
   `tracker-status-refresh.md` if any state changed.
4. Record package-boundary disposition: direct v2 support, approved projection,
   or explicit deferral.
5. Execute `post-ci-tracker-closeout-plan.md` for the opt-in child issues.
6. Keep any legacy-removal issue unfiled until #1691 is green in remote CI and
   the package boundary is resolved.

## Decision

The default Fortemi Core backend migration is delivered to `origin/main` with
green remote CI. Removing the legacy local backend remains blocked by package
boundary disposition and separate phase-out approval.

## Next Validation

If any files change after this report, rerun the local pre-push gate and wait
for green remote CI again. Before filing any legacy-removal issue, update this
report with package-boundary disposition and final issue states.
