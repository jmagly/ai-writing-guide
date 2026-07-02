---
title: Fortemi Package Boundary Decision Record
date: 2026-07-02
status: pending-maintainer-decision
---

# Fortemi Package Boundary Decision Record

This record narrows the unresolved package-boundary question from the #1664
Fortemi Core migration:

> Is AIWG's v2-to-v1 compatibility projection a temporary bridge, or is it the
> approved long-term package boundary for `@fortemi/core@2026.7.0`?

## Current Decision

AIWG must treat the v2-to-v1 projection as a temporary bridge until one of these
events happens:

1. Fortemi accepts AIWG v2 exports and v2-only relationship fields directly.
2. A maintainer explicitly approves the projection as the long-term boundary in
   tracker/PR review, with the acceptance recorded on #1664 and the relevant
   Fortemi React issue.

Until then, this migration remains opt-in and must not switch AIWG's default
index/search backend.

## Evidence From `@fortemi/core@2026.7.0`

Latest local package metadata recheck on 2026-07-02T05:44:04-04:00:

```bash
npm view @fortemi/core@2026.7.0 version dist-tags exports dist.integrity dist.tarball --json
```

Observed evidence:

- Version `2026.7.0` is published and is the `latest` dist-tag.
- Version publish time is `2026-07-02T03:12:43.193Z`; this remains inside
  the normal release-age gate on the day of the migration.
- The package exports `./aiwg-index`.
- Registry integrity is
  `sha512-SF9ve2yctKra1zQoNq7RiQJpzgI22EZN4zZtkdZnNsDRKtrzKGylrtYqr8ykxrxokczLrOqSfrkPP0PMrD/qXg==`.
- Tarball URL is
  `https://registry.npmjs.org/@fortemi/core/-/core-2026.7.0.tgz`.

The repository release-age policy blocked a first package fetch without an
override:

```text
No matching version found for @fortemi/core@2026.7.0 with a date before 6/25/2026
```

That confirms the optional package-boundary workflow needs the documented,
single-package `--min-release-age=0` override while the release is fresh.
The override remains a one-off package-boundary evidence path and is not part
of required CI.

The follow-up registry tarball inspection used:

```bash
npm pack @fortemi/core@2026.7.0 --ignore-scripts --min-release-age=0
```

Observed package-shape evidence:

- Tarball integrity matched the `npm view` registry metadata.
- Published package scripts were only `build`, `typecheck`, `test`, and
  `test:watch`; no `preinstall`, `install`, `postinstall`, or `prepare`
  lifecycle scripts were present in `package.json`.
- `dist/aiwg-index.d.ts` and `dist/aiwg-index.js` expose AIWG index validation,
  relationship traversal, static semantic/hybrid search helpers, chunked-index
  helpers, and static embedding-set validation.
- The published index export validator still requires
  `aiwg.fortemi.index.export.v1`.
- The published index record validator still requires
  `aiwg.fortemi.index.record.v1`.
- Relationship traversal normalizes relationships through `target_id`, `type`,
  and optional `source_path`; direct AIWG v2-only relationship fields such as
  `target_path` are not directly accepted by the published v1 export validator.

## Local AIWG Bridge

AIWG's local bridge projects the richer v2 all-domain export into Fortemi's
current v1 package contract before invoking the published validator. This keeps
package compatibility testable without requiring `@fortemi/core` to accept AIWG
v2 records directly.

That bridge is acceptable for preview and opt-in Fortemi backend testing because:

- Required CI still uses the static local Fortemi cache and does not require a
  live Fortemi service.
- The default backend remains local.
- Forced-local rollback remains documented and tested.
- Package-boundary testing is optional, human-approved, and label-gated.

The bridge is not enough to close the package-boundary question by itself.

## Required Resolution Before Default Switch

Before any default-backend switch issue can be filed or completed:

- #1691 parity fixtures must pass in remote CI.
- The package-boundary workflow proposal must either be approved and run, or an
  equivalent maintainer-reviewed package evidence path must be recorded.
- Fortemi/fortemi-react#219 must be closed, superseded, or explicitly accepted
  as satisfied by the AIWG projection boundary.
- Fortemi/fortemi-react#220 must be closed, superseded, or explicitly accepted
  as satisfied by the normalized relationship projection.
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
