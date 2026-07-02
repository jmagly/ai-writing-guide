---
title: Fortemi React Issue Audit for Fortemi Core Migration
date: 2026-07-02
parent_issue: 1664
mode: read-only
---

# Fortemi React Issue Audit

This audit records whether AIWG needs new Fortemi React tracker work for the
Fortemi Core indexing migration after the `fortemi/core` 2026.7.0 release.

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
  three open Fortemi React issues: #220, #219, and #212. #219 and #220
  remain open for AIWG v2 package-boundary work; #212 is an unrelated
  GraphRAG integration spike.
- GitHub `gh issue list --repo Fortemi/fortemi-react --state open` returned no
  open GitHub issues, so Fortemi React issue state for this migration is the
  Gitea tracker.
- Latest `npm view @fortemi/core@2026.7.0 version dist-tags exports
  dist.integrity dist.tarball time --json` recheck on
  2026-07-02T05:44:04-04:00 reported `2026.7.0` as the `latest` dist-tag,
  confirmed the published exports still include `./aiwg-index`, and showed
  the version publish time as `2026-07-02T03:12:43.193Z`; this is PASS
  evidence for the released package entry point, not proof of direct v2
  acceptance.
- Latest local Fortemi React repo check was clean on `main...origin/main` at
  package version `2026.7.0`.
- Local source inspection of
  `/home/roctinam/dev/fortemi-react/packages/core/src/__tests__/aiwg-index.test.ts`
  shows `@fortemi/core` already tests relationship traversal and graph
  projection for full v1 and projected chunked indexes. That narrows the
  remaining upstream relationship gap to AIWG's direct v2-only fields
  (`target_path`, `direction`) rather than v1/projected traversal generally.
- Upstream verification command passed from `/home/roctinam/dev/fortemi-react`:
  `pnpm --filter @fortemi/core exec vitest run src/__tests__/aiwg-index.test.ts --reporter dot`
  (`1` file, `37` tests passed).
- `npm pack @fortemi/core@2026.7.0 --min-release-age=0` was used for read-only
  tarball inspection under `/tmp`; no AIWG dependency files were modified.

## Current Released Surface

`fortemi-react` is at 2026.7.0 for the root package and the `@fortemi/core`,
`@fortemi/graph`, and `@fortemi/react` workspaces.

The 2026.7.0 `@fortemi/core/aiwg-index` surface includes:

- extensible AIWG static record `type` strings,
- AIWG discovery ranking,
- relationship traversal helpers,
- static embedding sidecar helpers,
- semantic/hybrid bridge-search helpers.

The published `./aiwg-index` module exports the expected helper names,
including `queryAiwgFortemiIndex`, `queryAiwgSemanticIndex`,
`queryAiwgHybridIndex`, relationship traversal/controller helpers, chunked
index helpers, static embedding validators, and
`validateAiwgFortemiIndexExport`.

The published validator still accepts only:

- envelope `schema_version: aiwg.fortemi.index.export.v1`
- record `schema_version: aiwg.fortemi.index.record.v1`

The published type surface still models relationship edges as v1
`relationships[]` entries with `type`, `target_id`, and optional `source_path`;
AIWG v2 `target_path` and per-edge `direction` are not accepted directly.

AIWG therefore keeps the Fortemi backend opt-in and uses the local v2-to-v1
compatibility projection when validating against the published package.

## Existing Fortemi React Issues

- Fortemi/fortemi-react#219 is open for direct v2 AIWG export and record
  acceptance.
- Fortemi/fortemi-react#220 is open for AIWG v2 relationship traversal fields
  such as `target_path` and `direction`; v1/projected chunk relationship
  traversal is already present in the 2026.7.0 source tests.
- Fortemi/fortemi-react#212 is also open, but it tracks optional GraphRAG
  integration work and is not a package-boundary blocker for AIWG #1664.

These two issues cover the currently observed package-boundary gaps for AIWG's
Fortemi Core migration.

## Filing Decision

No new Fortemi React issue is needed at this time.

The current open upstream gaps remain exactly the direct v2 package acceptance
tracked by #219 and v2 relationship-field traversal tracked by #220. AIWG's
local v2-to-v1 projection and static cache adapter keep the preview usable
without widening the Fortemi React backlog.

File a new Fortemi React issue only if package-boundary validation against
`@fortemi/core@2026.7.0` or later reveals a distinct gap not covered by #219 or
#220. Examples that would justify a new issue:

- semantic/hybrid static helper behavior diverges from the documented 2026.7.0
  contract after using a package API instead of AIWG's local adapter;
- chunked traversal fails for a supported v1/v2 compatibility shape unrelated
  to `target_path` or `direction`;
- package exports or import paths advertised by 2026.7.0 are unavailable in the
  published package.

Any new issue must be filed through the compliant Fortemi React tracker route.
In this environment, the operator-authorized Gitea MCP connector is available
for that purpose if package-boundary validation finds a gap not covered by #219
or #220.
