---
title: Fortemi Core Migration PR Readiness Checklist
date: 2026-07-02
parent_issue: 1664
status: pending-tracker-login-and-remote-ci
---

# Fortemi Core Migration PR Readiness Checklist

This checklist prepares the default Fortemi Core backend work for review and
remote CI. It does not authorize legacy-backend removal, release tag, workflow
installation, or tracker mutation.

## Scope For The Review Branch

Include the local implementation and evidence for the Fortemi default backend
phase:

- Fortemi Core v2 all-domain export and v2-to-v1 package compatibility
  projection.
- `aiwg index sync` static-cache materialization.
- Default Fortemi backend support for discover/show/query/fulltext/static
  semantic/static hybrid/deps/neighbors/status/export paths.
- Research-query and KB graph traversal parity through explicit
  `--backend local` for legacy fallback.
- Documentation, ADR, release note, completion audit, handoff readiness report,
  traceability matrix, package-boundary proposal, package-boundary decision
  record, Fortemi React issue audit, CI workflow audit, review branch scope
  manifest, and post-CI tracker closeout plan.

Do not include unrelated local artifacts. The existing untracked
`.aiwg/reports/doc-sync-20260630T164445Z.md` is outside this migration.
Use `.aiwg/planning/fortemi-core-index-migration/review-branch-scope.md` as the
authoritative include/exclude manifest before creating a review commit.

## Local Pre-Push Gate

Run these immediately before committing or pushing the review branch:

```bash
git status --short --branch
npm run build:cli
npm run test:ci
aiwg index build --all
aiwg index sync
aiwg index status --json
aiwg doctor
git diff --check
git diff -- .gitea/workflows AGENTS.md
tea login list
```

Expected local state before push:

- `npm run test:ci` passes with the current main suite and UAT suite.
- `aiwg index status --json` reports no warnings, project graph built, and
  Fortemi Core `built: true`, `stale: false`.
- `aiwg doctor` exits `0`; the known provider-size/budget warnings are not
  Fortemi blockers.
- `git diff -- .gitea/workflows AGENTS.md` is empty.
- `tea login list` shows a `roctinam` login before any tracker write. If it is
  empty, do not comment, close issues, label issues, file a legacy-removal
  issue, or file Fortemi React issues from this environment.

Latest local evidence captured before this checklist:

- `npm run test:ci` passed on 2026-07-02: main suite `425` files passed,
  `2` skipped; `7367` tests passed, `28` skipped. UAT suite `5` files and
  `95` tests passed.
- `npm test` passed after the latest evidence edits: `425` files passed,
  `2` skipped; `7367` tests passed, `28` skipped.
- Focused release/changelog and review-scope validation passed after the
  release-facing #1551/#1508 related-issue assertions and explicit
  review-branch scope assertions were added:
  `npm test -- --run test/unit/skills/routing-docs.test.ts` (`31` tests
  passed).
- `aiwg index build --all` reported framework `3684`, project `1097`, and
  codebase `1197` artifacts.
- `aiwg index sync` reported the Fortemi Core project
  cache updated with `1097` items after the latest evidence refresh.
- `aiwg index status --json` reported Fortemi Core `stale: false` and no index
  warnings.
- `aiwg doctor` reported `43` passed and `9` known warnings.

Do not paste the Fortemi export checksum into indexed project docs. Use the
checksum only in the post-CI tracker comment after the final status command,
because embedding it here would make the project index self-referential.

## Remote CI Evidence To Capture

After push, capture:

- Commit SHA.
- Gitea Actions run URL or run ID for `.gitea/workflows/ci.yml`.
- Final status of the Test and Build jobs.
- Fresh issue state for #1664 and #1684-#1691, updating
  `.aiwg/planning/fortemi-core-index-migration/tracker-status-refresh.md` if
  any issue state changed before closeout.
- Fresh related-issue state for #1551 and #1508, preserving #1551 as the
  body-level embedding acceptance case and #1508 as deferred until the
  provider-neutral corpus storage/index boundary is approved.
- Whether the optional package-boundary workflow was installed by explicit
  human approval. If not installed, record that local package-boundary evidence
  uses `@fortemi/core@2026.7.1` direct v2 validation/query behavior and the
  v2-to-v1 projection remains only a legacy compatibility bridge.

Remote CI must prove `npm run test:ci` on the pushed commit. Local full-suite
success is readiness evidence only.

## Tracker Closeout Gate

Do not mutate the tracker until all of these are true:

- `tea login list` shows `roctinam`.
- `tea whoami` confirms the active actor is `roctinam`.
- Remote CI is green for the pushed commit.
- Package-boundary disposition is recorded.
- The final local checks above have been rerun after CI if any files changed.

Then execute
`.aiwg/planning/fortemi-core-index-migration/post-ci-tracker-closeout-plan.md`
in order for #1685, #1684, #1686, #1687, #1688, #1689, #1690, #1691, then
#1664.

Treat the existing `roctibot` comments as non-compliant historical notes unless
the maintainer explicitly accepts them. Do not use them as closeout proof.

## Explicit Non-Goals

- Do not remove `.aiwg/.index/<graph>/` fallback behavior.
- Do not install the optional package-boundary workflow under
  `.gitea/workflows/` without explicit human authorization.
- Do not add a live Fortemi dependency to required CI.
- Do not file a legacy-backend removal issue until #1691 has remote CI evidence
  and the package boundary is accepted or explicitly deferred.
- Do not use the Gitea connector or `roctibot` for tracker mutations.

## Review Focus

Reviewers should focus on:

- Public CLI compatibility and strict flag parsing.
- Fortemi static-cache freshness, corrupt-cache reporting, and local fallback.
- Parity fixtures for discover/show/query/fulltext/static semantic/static
  hybrid/graph traversal/research/KB/export.
- Security boundary: static cache only, no credentials, no direct Fortemi REST
  import path.
- Documentation consistency across CLI docs, integration docs, skills, ADR,
  release note, completion audit, and traceability matrix.
