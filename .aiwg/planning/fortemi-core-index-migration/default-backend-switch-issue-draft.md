---
title: Default Backend Switch Issue Draft
date: 2026-07-02
parent_issue: 1664
status: draft-do-not-file-before-ci
---

# Default Backend Switch Issue Draft

This is a ready-to-file tracker draft for the post-#1691 Fortemi Core default
backend switch. Do not file it until the closeout preconditions in
`post-ci-tracker-closeout-plan.md` are met and tracker writes can be performed
through `tea` as `roctinam`.

## Title

```text
feat(index): switch AIWG search/discovery defaults to Fortemi Core after parity gates
```

## Body

```text
## Summary

Switch AIWG's default indexing, discovery, search, and traversal backend from
the local graph internals to the Fortemi Core static-cache path after the
Fortemi Core migration roadmap has passed remote CI and package-boundary gates.

Parent roadmap: #1664
Prerequisite parity gate: #1691

This issue must remain blocked until #1691 is green in remote CI and the
Fortemi 2026.7.1 direct-v2 package boundary remains green against AIWG fixtures.

## Scope

- Make Fortemi Core the default backend for accepted `aiwg discover`,
  `aiwg show`, `aiwg index query`, dependency traversal, neighbor/set traversal,
  research-query source selection, and KB/semantic-memory traversal surfaces.
- Preserve an explicit local backend selector or config flag for rollback.
- Keep `.aiwg/.index/<graph>/` local fallback build/read behavior shipped and
  tested for at least one release after the default switch.
- Keep required CI independent of live Fortemi services and credentials.
- Update migration/release notes to describe the default change and rollback.

## Preconditions

- [ ] #1684-#1691 are closed or explicitly superseded with compliant tracker
      comments through `tea` as `roctinam`.
- [ ] #1691 parity fixtures are green in remote CI for the migration commit.
- [ ] The package-boundary decision records direct v2 package acceptance for
      `@fortemi/core@2026.7.1`.
- [ ] `npm run build:cli`, `npm test`, `aiwg index build --all`,
      `aiwg index status --json`, and `aiwg doctor` pass on the switch branch.
- [ ] Rollback docs have been reviewed and still reference a working local
      fallback path.

## Acceptance Criteria

- [ ] Default command behavior uses Fortemi Core for the accepted surfaces
      without requiring users to pass `--backend local` for legacy fallback.
- [ ] `--backend local` or an equivalent documented config selector forces the
      local `.aiwg/.index/<graph>/` backend.
- [ ] Remote CI covers default Fortemi behavior and `--backend local` rollback
      behavior for discover/show, query/fulltext, semantic/hybrid, deps,
      neighbors/set, research-query, and KB graph traversal.
- [ ] Required CI does not require a live Fortemi service, Fortemi credentials,
      or an always-on `AIWG_FORTEMI_CORE_PACKAGE_REQUIRED` dependency.
- [ ] Missing, stale, corrupt, and schema-incompatible Fortemi cache states
      fail with actionable recovery guidance and preserve local fallback.
- [ ] Fresh-clone bootstrap remains `aiwg index build --all`; status and doctor
      continue to report durable-index state accurately.
- [ ] Release notes document the default switch, rollback selector, cache sync
      path, and support window for the local backend.
- [ ] `.aiwg/.index/<graph>/` fallback removal is explicitly out of scope and is
      deferred until at least one release after this switch ships.

## Out Of Scope

- Removing the local `.aiwg/.index/<graph>/` backend.
- Requiring a hosted Fortemi service in required CI.
- Bypassing the Fortemi package-boundary decision.
- Filing or mutating tracker state through `roctibot`.

## Verification

Expected local and CI verification:

```bash
npm run build:cli
npm test
aiwg index build --all
aiwg index sync
aiwg index status --json
aiwg doctor
```

Switch-specific verification must also include focused tests proving the new
default path and `--backend local` rollback path for:

- `aiwg discover` / `aiwg show`
- `aiwg index query` fulltext, semantic, hybrid, metadata filters, and JSON
- `aiwg index deps`, `neighbors`, and `set`
- `aiwg research-query`
- KB and semantic-memory graph traversal
- missing/stale/corrupt/schema-mismatched Fortemi cache recovery
```
