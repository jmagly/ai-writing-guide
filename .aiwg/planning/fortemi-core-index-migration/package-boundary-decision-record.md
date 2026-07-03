---
title: Fortemi Package Boundary Decision Record
date: 2026-07-03
status: direct-v2-accepted
---

# Fortemi Package Boundary Decision Record

This record narrows the unresolved package-boundary question from the #1664
Fortemi Core migration:

> Is AIWG's v2-to-v1 compatibility projection a temporary bridge, or is direct
> v2 export validation the package boundary for `@fortemi/core@2026.7.1`?

## Current Decision

AIWG treats direct `aiwg.fortemi.index.export.v2` validation in
`@fortemi/core@2026.7.1` as the current package boundary. The v2-to-v1
projection remains a legacy compatibility bridge for consumers that still read
the v1 static export shape.

This resolves the direct package-acceptance blocker. The migration remains
opt-in until #1691 parity fixtures and the default-backend switch issue prove
default Fortemi behavior and `--backend local` rollback behavior.

## Evidence From `@fortemi/core@2026.7.1`

Latest local package metadata recheck on 2026-07-03:

```bash
npm view @fortemi/core@2026.7.1 version dist-tags exports dist.integrity dist.tarball --json
```

Observed evidence:

- Version `2026.7.1` is published and is the `latest` dist-tag.
- The package exports `./aiwg-index`.
- The exported AIWG index types include v1 and v2 export/record schema
  versions, v2 relationship metadata, chunk/body/source fields, embeddings,
  SKOS concepts/relations, provenance events, chunked index helpers,
  relationship traversal, and static semantic/hybrid search helpers.

The repository release-age policy blocked a first package fetch without an
override:

```text
No matching version found for @fortemi/core@2026.7.1 with a date before 6/25/2026
```

That confirms the optional package-boundary workflow needs the documented,
single-package `--min-release-age=0` override while the release is fresh.
The override remains a one-off package-boundary evidence path and is not part
of required CI.

The follow-up registry tarball inspection used:

```bash
npm pack @fortemi/core@2026.7.1 --ignore-scripts --min-release-age=0
```

Observed package-shape evidence:

- Tarball integrity matched the `npm view` registry metadata.
- Published package scripts were only `build`, `typecheck`, `test`, and
  `test:watch`; no `preinstall`, `install`, `postinstall`, or `prepare`
  lifecycle scripts were present in `package.json`.
- `dist/aiwg-index.d.ts` and `dist/aiwg-index.js` expose direct v2 AIWG index
  validation, relationship traversal, static semantic/hybrid search helpers,
  chunked-index helpers, static embedding-set validation, and review-decision
  exports.
- The published validator accepts `aiwg.fortemi.index.export.v2` and
  `aiwg.fortemi.index.record.v2`.
- Relationship traversal accepts AIWG v2 relationship fields such as
  `target_path`, `direction`, `privacy`, `confidence`, and `metadata`.

## Local AIWG Bridge

AIWG validates the richer v2 all-domain export directly against
`@fortemi/core@2026.7.1`. The local bridge still projects v2 into the v1 export
shape for older consumers and regression coverage.

That bridge is acceptable for preview and default Fortemi backend testing because:

- Required CI still uses the static local Fortemi cache and does not require a
  live Fortemi service.
- Fortemi Core is the default backend.
- Local rollback remains documented and tested through `--backend local`.
- Package-boundary testing is optional, human-approved, and label-gated.

The bridge is no longer the package boundary by itself.

## Required Resolution Before Default Switch

Before any default-backend switch issue can be filed or completed:

- #1691 parity fixtures must pass in remote CI.
- The package-boundary workflow proposal must either be approved and run, or an
  equivalent maintainer-reviewed package evidence path must be recorded.
- Fortemi/fortemi-react#219 must be closed, superseded, or explicitly accepted
  as satisfied by direct v2 package validation.
- Fortemi/fortemi-react#220 must be closed, superseded, or explicitly accepted
  as satisfied by v2 relationship-field validation.
- The final #1664 closeout comment must state whether the projection is
  temporary or long-term.

## Tracker Handling

Do not use this record as permission to close or supersede package-boundary
issues. Prefer `tea` as `roctinam` if configured; local `tea login list`
currently has no configured login in this process. The operator authorized
Gitea MCP on 2026-07-02, so non-closing package-boundary comments or a new
Fortemi React issue for a distinct uncovered gap may use MCP. Default-switch
and child-issue closure still require remote CI evidence plus maintainer
acceptance or explicit deferral of the package-boundary decision.
