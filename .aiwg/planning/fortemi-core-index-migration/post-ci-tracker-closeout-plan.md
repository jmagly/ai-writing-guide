---
title: Fortemi Core Migration Post-CI Tracker Closeout Plan
date: 2026-07-02
parent_issue: 1664
status: pending-ci-and-remote-gates
---

# Fortemi Core Migration Post-CI Tracker Closeout Plan

This is the ordered closeout runbook for #1664 after the Fortemi Core migration
work is committed, pushed, and validated by remote CI. Local `tea` currently
has no configured login, but the operator authorized the Gitea MCP connector on
2026-07-02 for tracker writes when needed. That authorization allows
non-closing status comments and Fortemi React issue filing if a distinct gap is
found. It does not satisfy the remote CI, package-boundary, or default-switch
gates.

## Preconditions

All of these must be true before closing or superseding any AIWG child issue:

- The pre-push/review handoff checklist at
  `.aiwg/planning/fortemi-core-index-migration/pr-readiness-checklist.md` has
  been run and updated if any required evidence changed.
- The read-only tracker snapshot at
  `.aiwg/planning/fortemi-core-index-migration/tracker-status-refresh.md` has
  been refreshed after remote CI and before any issue closeout.
- Either `tea login list` (alias: `tea logins list`) shows a configured login
  named `roctinam`, or the operator explicitly authorizes the Gitea MCP
  connector for the mutation being performed.
- If using `tea`, `tea whoami` confirms the authenticated actor is `roctinam`
  after the `roctinam` login is selected as the active/default login. In `tea`
  0.14.1, `whoami` does not accept `--login`.
- The work is committed to `main` using the configured commit signing key.
- The commit is pushed to `origin/main`.
- Gitea Actions for the pushed commit are green, including
  `.gitea/workflows/ci.yml`.
- The CI run URL or run ID is captured in tracker comments.
- No new local blockers are present in `git status --short`,
  `aiwg index status --json`, or `aiwg doctor`.
- The package-boundary gate is resolved: either a separate
  `AIWG_FORTEMI_CORE_PACKAGE_REQUIRED=1` job is green with `@fortemi/core`, or
  the maintainer explicitly accepts the v2-to-v1 projection as the current
  boundary for `@fortemi/core@2026.7.0`.

Verification commands before any tracker mutation:

```bash
git status --short
aiwg index status --json
aiwg doctor
tea login list
tea whoami
```

## Compliance Rules

`.aiwg/aiwg.config` points issue tracking at the Gitea `origin` remote. Prefer
`tea` as `roctinam` when it is configured. If `tea` is unavailable and the
operator explicitly authorizes Gitea MCP, the connector may be used for tracker
comments and issue filing. Do not use unauthorized `roctibot` paths as closure
evidence.

Use `--login roctinam` on every `tea` command that accepts the flag and reads
privileged state or mutates tracker state. Relying on the default login is not
enough for those commands because the tracker actor is an explicit
delivery-policy requirement. For `tea whoami`, which does not accept
`--login` in `tea` 0.14.1, first select `roctinam` as the active/default login
and then verify `tea whoami`.

Existing historical comments that are not closure evidence:

- #1664 issuecomment-77496
- #1691 issuecomment-77499
- #1664 issuecomment-77505, posted through operator-authorized Gitea MCP as a
  non-closing local status update

Before final closure, leave those comments in place only as historical notes or
post a fresh operator-authorized closeout comment with the final commit SHA and
CI URL.

## Tea Command Shapes

These command shapes are available in the installed `tea` CLI help output. They
are not execution evidence until `tea login list` shows `roctinam` and `tea
whoami` confirms the active actor is `roctinam` in the delivery environment.
When the operator authorizes Gitea MCP instead, use the connector's issue write
operation and record that route in the final handoff note.

```bash
tea login list
tea whoami
tea actions runs list --login roctinam --repo roctinam/aiwg --branch main --status success --output json
tea actions runs view --login roctinam --repo roctinam/aiwg --jobs --output json <run-id>
tea issues <issue-number> --login roctinam --remote origin --comments --output json
tea comment --login roctinam --remote origin <issue-number> "<comment body>"
tea issues close --login roctinam --remote origin <issue-number>
tea issues create --login roctinam --remote origin --title "<title>" --description "<body>"
tea api --login roctinam --remote origin --method DELETE /repos/{owner}/{repo}/issues/comments/<comment-id>
```

Verify endpoint and permission behavior before deleting comments. If deletion is
not permitted, use the explicit historical-note treatment instead.

## Closeout Order

Close or supersede child issues in dependency order:

1. #1685 - current surface inventory.
2. #1684 - ADR.
3. #1686 - v2 export contract.
4. #1687 - sync/ingest pipeline.
5. #1688 - discover/show parity.
6. #1689 - index CLI compatibility.
7. #1690 - research and KB migration.
8. #1691 - no-regression parity fixtures.
9. #1664 - parent roadmap.

Do not file or close the default-backend switch issue until #1691 has remote CI
evidence and the Fortemi package boundary is accepted or explicitly deferred.
Use
`.aiwg/planning/fortemi-core-index-migration/default-backend-switch-issue-draft.md`
as the issue body source when those gates are satisfied.

## Related Issue Handling

Do not close #1551 or #1508 as part of the #1664 opt-in backend closeout.
They are related ordering gates, not child issues in the #1664 roadmap.

After #1690 and #1691 are closed or explicitly superseded, post non-closing
status comments through `tea` as `roctinam` or operator-authorized Gitea MCP
only if the maintainer wants the relationship made explicit in the tracker:

- #1551 remains open as the body-level embedding acceptance case unless
  maintainers decide Fortemi Core owns chunk/body embeddings and the current
  migration evidence is enough to close it as subsumed.
- #1508 remains deferred until a provider-neutral corpus-to-storage/index
  boundary is approved; do not port direct Fortemi REST import or token-loading
  patterns from the deferred historical scripts.

Suggested #1551 status comment:

```text
Status from #1664 Fortemi Core migration:

- AIWG now exports source-body chunks in the opt-in Fortemi static index path.
- The default embedding/dedup path remains local and optional.
- This issue stays open as the body-level embedding acceptance case until the
  #1690/#1691 evidence and Fortemi package-boundary decision prove whether
  Fortemi Core owns chunk/body embeddings directly or AIWG keeps adapter-level
  body embedding fixtures.

No closure requested by this comment.
```

Suggested #1508 status comment:

```text
Status from #1664 Fortemi Core migration:

- The Fortemi Core index/search preview keeps storage/MCP persistence separate
  from static index/search contracts.
- Corpus snapshots and research views remain AIWG-rendered during the preview.
- This issue remains deferred until a provider-neutral corpus-to-storage/index
  boundary is approved.
- Direct Fortemi REST import and hardcoded-token patterns remain out of scope.

No closure requested by this comment.
```

## Suggested Child Comments

Use the actual commit SHA and CI URL before posting.

### #1685

```text
Closeout evidence for #1685:

- Current surface inventory is documented in `.aiwg/planning/fortemi-core-index-migration/current-surface-inventory.md`.
- It covers discover/show, index CLI, research-query, KB/memory, Cockpit capability surfaces, storage/Fortemi bridge, local issue/search interactions, #1551, and #1508.
- Remote CI: <CI URL or run ID>
- Commit: <SHA>

Closing as implemented for the Fortemi Core migration roadmap.
```

### #1684

```text
Closeout evidence for #1684:

- ADR is documented in `.aiwg/architecture/adr-fortemi-core-indexing-substrate.md`.
- It records the `@fortemi/core@2026.7.0` baseline, AIWG adapter/cache boundary, opt-in backend behavior, fallback/rollback path, no-regression gates, and default-switch criteria.
- Remote CI: <CI URL or run ID>
- Commit: <SHA>

Closing as implemented for the Fortemi Core migration roadmap.
```

### #1686

```text
Closeout evidence for #1686:

- `schemas/aiwg-fortemi-index-export.json` defines the v2 all-domain AIWG export envelope.
- `src/artifacts/browser-export.ts` emits v2 records and includes the v2-to-v1 compatibility projection for the published Fortemi package validator.
- Fixtures cover artifact, skill, agent, command, rule, behavior, flow, provider, bundle, research REF/profile/view/synthesis, KB page, memory entry, and issue records.
- Remote CI: <CI URL or run ID>
- Commit: <SHA>

Package-boundary note: direct v2 acceptance remains tracked on Fortemi React unless the maintainer accepts the compatibility projection as the current boundary.
```

### #1687

```text
Closeout evidence for #1687:

- `aiwg index sync --backend fortemi-core` materializes the project static cache and manifest under `.aiwg/.index/fortemi-core/<graph>/`.
- Status handling reports missing/stale/corrupt/schema-incompatible cache states without removing the local fallback graph, and valid empty caches remain built empty indexes rather than recovery failures.
- Latest local sync evidence before CI: 1097 project items and a current export
  checksum from the final `aiwg index status --json` command output. Do not
  paste the checksum into indexed project docs; use it only in the tracker
  comment after the final post-CI status run.
- Remote CI: <CI URL or run ID>
- Commit: <SHA>

Closing as implemented after remote validation.
```

### #1688

```text
Closeout evidence for #1688:

- `--backend fortemi-core` discover/show paths read the materialized static cache.
- Tests cover ranking, exact fetch, ambiguity, valid empty cache, missing cache, stale cache, corrupt cache, and schema mismatch behavior.
- Remote CI: <CI URL or run ID>
- Commit: <SHA>

Closing as implemented after remote validation.
```

### #1689

```text
Closeout evidence for #1689:

- `aiwg index` preserves local defaults and adds opt-in `--backend fortemi-core` support for query, deps, neighbors, set, discover, show, sync, status, and export paths.
- Public-router tests cover stats/status/export/sync plus Fortemi static semantic and filtered hybrid query modes.
- Remote CI: <CI URL or run ID>
- Commit: <SHA>

Closing as implemented after remote validation.
```

### #1690

```text
Closeout evidence for #1690:

- `aiwg research-query` supports deterministic source selection from the Fortemi static cache through `--backend fortemi-core`.
- Tests cover local/Fortemi retrieval parity, REF/PROF metadata, GRADE extraction, JSON, save behavior, and KB graph traversal parity.
- Remote CI: <CI URL or run ID>
- Commit: <SHA>

Closing as implemented after remote validation.
```

### #1691

```text
Closeout evidence for #1691:

- No-regression parity fixtures cover discover/show, query/fulltext/public semantic/public hybrid, graph traversal, research/KB, v1/v2 export, valid-empty and missing/stale/corrupt/schema cache handling, fresh-clone status, malformed config, and live-test skip gating.
- `.gitea/workflows/ci.yml` runs `npm run test:ci`, and the pushed commit has green remote CI.
- Remote CI: <CI URL or run ID>
- Commit: <SHA>

Closing as the parity gate for the opt-in Fortemi Core backend. This does not switch the default backend.
```

## Parent Closeout Comment

Post this only after every child issue above is closed or explicitly
superseded:

```text
Roadmap closeout for #1664:

- #1685-#1691 are closed or explicitly superseded.
- Remote CI is green for the pushed commit: <CI URL or run ID>.
- Fortemi Core backend remains opt-in through `--backend fortemi-core`.
- Fallback/rollback is documented in `docs/integrations/fortemi-index-export.md`.
- ADR and release notes are present.
- Default backend switch is not included in this closeout and remains gated on a separate issue after the package-boundary decision and rollback window.

Closing the migration planning/implementation roadmap as complete for the opt-in backend phase.
```

## Default-Backend Switch Issue Draft

Create this issue only after #1691 has green remote CI and the package boundary
is accepted or explicitly deferred:

```text
Title: research(index): switch AIWG index/search default to Fortemi Core after rollback window

Body:
Follow-up to #1664. The opt-in Fortemi Core backend is implemented and parity-gated.

Scope:
- Switch default query/discover/show/index paths from local graph internals to Fortemi Core static cache where accepted by the ADR.
- Preserve an explicit local fallback flag or documented rollback route.
- Keep `.aiwg/.index/<graph>/` fallback available for at least one release.
- Require remote CI parity for the default path and rollback path.

Preconditions:
- #1691 green in remote CI.
- Fortemi package boundary accepted for v2 direct records or the v2-to-v1 projection.
- Release notes describe the default change and rollback.

Acceptance criteria:
- Default discover/show/query paths use Fortemi Core only after the accepted
  package/projection boundary is available.
- A documented backend selector or config flag forces local mode for rollback.
- `.aiwg/.index/<graph>/` local fallback remains built, tested, and shipped for
  at least one release after the default switch.
- Remote CI covers both default Fortemi behavior and forced-local rollback
  behavior.
- Required CI still has no live Fortemi service, Fortemi credentials, or
  `AIWG_FORTEMI_CORE_PACKAGE_REQUIRED` dependency.

Out of scope:
- Removing the local fallback graph.
- Live Fortemi service dependency in required CI.
```

## Fortemi React Follow-Ups

Read-only issue audit:
`.aiwg/planning/fortemi-core-index-migration/fortemi-react-issue-audit.md`.

Package-boundary decision record:
`.aiwg/planning/fortemi-core-index-migration/package-boundary-decision-record.md`.

Use existing Fortemi React issues where possible:

- Fortemi/fortemi-react#219 for direct v2 AIWG export/record acceptance.
- Fortemi/fortemi-react#220 for normalized relationship projection acceptance.

File a new Fortemi React issue only if remote package-boundary validation finds
a distinct `@fortemi/core@2026.7.0` capability gap that is not covered by #219
or #220. Any such issue must be filed through the compliant tracker route for
that repository; in this environment the operator-authorized Gitea MCP connector
is available for that purpose.

Current AIWG-side decision: the v2-to-v1 projection is a temporary bridge until
direct v2 support lands or a maintainer explicitly approves the projection as
the long-term package boundary.
