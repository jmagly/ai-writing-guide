---
title: Fortemi React Issue Audit for Fortemi Core Migration
date: 2026-07-02
parent_issue: 1664
mode: read-only
---

# Fortemi React Issue Audit

This audit records whether AIWG needs new Fortemi React tracker work for the
Fortemi Core indexing migration after the `fortemi/core` 2026.7.1 release.

## Tracker Access

- Fortemi React local repo: `/home/roctinam/dev/fortemi-react`
- Configured remotes:
  - Gitea origin: `git@git.integrolabs.net:Fortemi/fortemi-react.git`
  - GitHub mirror: `https://github.com/Fortemi/fortemi-react.git`
- `tea login list` is empty in this process. The operator authorized Gitea MCP
  on 2026-07-02, so Fortemi React tracker writes are permitted through MCP if a
  distinct uncovered package gap is found.
- Public Gitea API reads for #219 and #220 succeeded on 2026-07-02.
- Latest public Gitea API recheck on 2026-07-02T05:44:04-04:00 listed
  three open Fortemi React issues: #220, #219, and #212. #219 and #220 were
  the AIWG v2 package-boundary work items at the time; #212 is an unrelated
  GraphRAG integration spike.
- GitHub `gh issue list --repo Fortemi/fortemi-react --state open` returned no
  open GitHub issues, so Fortemi React issue state for this migration is the
  Gitea tracker.
- Latest `npm view @fortemi/core@2026.7.1 version dist-tags exports --json
  --min-release-age=0` recheck on 2026-07-03 reported `2026.7.1` as the
  `latest` dist-tag and confirmed the published exports still include
  `./aiwg-index`; this is PASS evidence for the released package entry point
  and direct v2 package contract.
- Latest local AIWG package smoke validates direct v2 export/query behavior
  against package version `2026.7.1`.
- Published `@fortemi/core@2026.7.1` types and validator now accept AIWG v2
  export/record schema versions and v2 relationship fields such as
  `target_path`, `direction`, `privacy`, `confidence`, and `metadata`.
- Upstream verification command passed from `/home/roctinam/dev/fortemi-react`:
  `pnpm --filter @fortemi/core exec vitest run src/__tests__/aiwg-index.test.ts --reporter dot`
  (`1` file, `37` tests passed).
- `npm pack @fortemi/core@2026.7.1 --min-release-age=0` was used for read-only
  tarball inspection under `/tmp`; no AIWG dependency files were modified.

## Current Released Surface

The published `@fortemi/core` package is at 2026.7.1.

The 2026.7.1 `@fortemi/core/aiwg-index` surface includes:

- extensible AIWG static record `type` strings,
- AIWG discovery ranking,
- direct v2 AIWG export validation,
- v2 relationship fields,
- relationship traversal helpers,
- static embedding sidecar helpers,
- semantic/hybrid bridge-search helpers.

The published `./aiwg-index` module exports the expected helper names,
including `queryAiwgFortemiIndex`, `queryAiwgSemanticIndex`,
`queryAiwgHybridIndex`, relationship traversal/controller helpers, chunked
index helpers, static embedding validators, and
`validateAiwgFortemiIndexExport`.

The published validator accepts both v1 and v2 AIWG export/record schema
versions. AIWG therefore validates direct v2 exports against the published
package and keeps the v2-to-v1 projection only for legacy compatibility.

## Existing Fortemi React Issues

- Fortemi/fortemi-react#219 can be treated as satisfied or superseded by
  `@fortemi/core@2026.7.1` direct v2 AIWG export and record acceptance after
  maintainer tracker closeout.
- Fortemi/fortemi-react#220 can be treated as satisfied or superseded by
  `@fortemi/core@2026.7.1` v2 relationship-field validation after maintainer
  tracker closeout.
- Fortemi/fortemi-react#212 is also open, but it tracks optional GraphRAG
  integration work and is not a package-boundary blocker for AIWG #1664.

These two issues covered the previously observed package-boundary gaps for
AIWG's Fortemi Core migration.

## Filing Decision

No new Fortemi React issue is needed at this time.

The current package no longer shows a direct v2 package-acceptance gap. AIWG's
local v2-to-v1 projection remains useful for legacy consumers but is not the
primary package boundary.

File a new Fortemi React issue only if package-boundary validation against
`@fortemi/core@2026.7.1` or later reveals a distinct gap not covered by #219 or
#220. Examples that would justify a new issue:

- semantic/hybrid static helper behavior diverges from the documented 2026.7.1
  contract after using a package API instead of AIWG's local adapter;
- chunked traversal fails for a supported v1/v2 compatibility shape unrelated
  to `target_path` or `direction`;
- package exports or import paths advertised by 2026.7.1 are unavailable in the
  published package.

Any new issue must be filed through the compliant Fortemi React tracker route.
In this environment, the operator-authorized Gitea MCP connector is available
for that purpose if package-boundary validation finds a gap not covered by #219
or #220.
