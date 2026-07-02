---
title: Fortemi Core Migration Traceability Matrix
date: 2026-07-02
parent_issue: 1664
status: local-evidence-mapped
---

# Fortemi Core Migration Traceability Matrix

This matrix maps the #1664 handoff requirements to local implementation,
documentation, and verification evidence. It is scoped to the Fortemi Core
index/search migration and complements the completion gate audit.

Status meanings:

- `Met locally`: implementation/docs/tests exist and pass locally.
- `Partially gated`: local bridge exists, but upstream/package or remote CI
  acceptance is still required.
- `Blocked externally`: local work cannot close the item without tracker,
  remote CI, or explicit maintainer approval.

## Roadmap Traceability

| Issue | Requirement                                                                                                                | Code evidence                                                                                                                                                                                | Test evidence                                                                                                                                                                                                                                                                                                                                | Documentation evidence                                                                                                                                                                                                  | Status          | Remaining proof                                                                                                               |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| #1685 | Inventory every AIWG search/discovery/index surface for parity.                                                            | N/A; inventory artifact only.                                                                                                                                                                | N/A; audit artifact reviewed by diff.                                                                                                                                                                                                                                                                                                        | `.aiwg/planning/fortemi-core-index-migration/current-surface-inventory.md`                                                                                                                                              | Met locally     | Tracker closeout via `tea` after review/CI.                                                                                   |
| #1684 | Decide Fortemi Core ownership boundary, data model, command compatibility, fallback, switch criteria, gates, and rollback. | `src/artifacts/fortemi-core-sync.ts`, `src/artifacts/fortemi-core-query-adapter.ts`, local default remains unchanged in `src/artifacts/cli.ts`.                                              | Fortemi sync/query/discover/show/status tests listed below; routing-doc regression guards ADR storage, issue-search, and package-boundary safeguards.                                                                                                                                                                                          | `.aiwg/architecture/adr-fortemi-core-indexing-substrate.md`; `.aiwg/planning/fortemi-core-index-migration/package-boundary-decision-record.md`                                                                          | Met locally     | Tracker closeout via `tea`; maintainer package-boundary approval remains required before default switch.                       |
| #1686 | Extend AIWG -> Fortemi export contract to all record domains.                                                              | `schemas/aiwg-fortemi-index-export.json`, `src/artifacts/browser-export.ts`                                                                                                                  | `test/unit/artifacts/browser-export.test.ts` validates v2 all-domain records, source-body chunk capture, the clean v2-to-v1 projection, and negative schema drift cases for v2-only fields in v1 exports; issue-domain boundary cross-check with local issue provider/CLI/sync/live/workflow tests                                                                        | `docs/integrations/fortemi-index-export.md`; local issue CLI boundary documented in `docs/local-issues.md`                                                                                                             | Partially gated | Direct v2 package acceptance remains Fortemi React #219; local v2-to-v1 bridge is tested.                                     |
| #1687 | Add Fortemi Core sync/ingest pipeline for AIWG project indexes.                                                            | `src/artifacts/fortemi-core-sync.ts`, `src/artifacts/index-status.ts`, `src/artifacts/cli.ts`                                                                                                | `test/unit/artifacts/fortemi-core-sync.test.ts`, `test/unit/artifacts/index-status.test.ts`, public CLI sync/status tests in `test/unit/artifacts/fortemi-core-discover-show.test.ts`; sync/status tests cover valid empty caches, timestamp-only unchanged re-syncs, missing export, source rebuild, unreadable manifest, unreadable export, checksum drift, and schema drift; routing docs guard the Fortemi storage/search boundary docs | `docs/integrations/fortemi-index-export.md`, `docs/storage/backends/fortemi.md`                                                                                                                                         | Met locally     | Remote CI evidence; tracker closeout via `tea`.                                                                               |
| #1688 | Preserve `aiwg discover` / `aiwg show` ranking and fetch semantics.                                                        | `src/artifacts/fortemi-core-query-adapter.ts`, `src/artifacts/query-engine.ts`, `src/artifacts/cli.ts`, `src/cli/handlers/subcommands.ts`                                                    | `test/unit/artifacts/fortemi-core-discover-show.test.ts`, `test/unit/artifacts/fortemi-core-parity.test.ts`, `test/unit/cli/handlers/subcommands.test.ts`; show coverage includes exact path, title fallback, ambiguity, `--first`, and canonical agent duplicate preference.                                                                                                                                                                                                                                       | `docs/cli-reference.md`, `docs/integrations/fortemi-index-export.md`                                                                                                                                                    | Met locally     | Remote CI evidence; tracker closeout via `tea`.                                                                               |
| #1689 | Preserve `aiwg index` CLI compatibility.                                                                                   | `src/artifacts/cli.ts`, `src/artifacts/dep-graph.ts`, `src/artifacts/graph-query.ts`, `src/artifacts/query-engine.ts`, `src/cli/handlers/index.ts`, `src/extensions/commands/definitions.ts`; `src/issues/cli.ts` help now lists the existing local `--search` filter and rejects `--backend` for local issue operations. | `test/unit/artifacts/fortemi-core-discover-show.test.ts`, `test/unit/artifacts/fortemi-core-parity.test.ts`, `test/unit/cli/handlers/subcommands.test.ts`, `test/unit/issues/cli.test.ts`; parity now covers recursive `**` path filters on Fortemi static hybrid queries, static fulltext over exported source-body chunks after source-file removal, the `index list --json` status alias, positional graph operands after `--backend fortemi-core`, missing discover/query/traversal/export/sync option values, and local issue search backend-boundary rejection. | `docs/cli-reference.md` documents Fortemi query, fulltext, deps, and neighbors backend flags; `docs/integrations/fortemi-index-export.md`, `docs/local-issues.md`                                                            | Met locally     | Remote CI evidence; tracker closeout via `tea`.                                                                               |
| #1690 | Migrate research corpus and knowledge-base search.                                                                         | `src/research/query-cli.ts`, `src/artifacts/fortemi-core-query-adapter.ts`, `src/artifacts/graph-query.ts`, `src/extensions/commands/definitions.ts`                                        | `test/unit/research/query-cli.test.ts`, `test/unit/artifacts/corpus-views.test.ts`, `test/unit/artifacts/corpus-parser.test.ts`, KB/research traversal coverage in `test/unit/artifacts/fortemi-core-discover-show.test.ts`, `test/unit/cli/handlers/subcommands.test.ts` provider metadata assertion for `research-query --save`; research-query tests cover local/Fortemi source-selection parity, explicit failure before Fortemi cache sync, and strict backend/depth/graph/max-source flag parsing; corpus view/parser tests cover golden view names plus radar/discovery/funder renderers; `test/unit/skills/routing-docs.test.ts` covers KB/memory, corpus-snapshot, and research-query Fortemi cache-boundary docs | Research-query and corpus-snapshot skill docs in `agentic/code/frameworks/research-complete/skills/` and `agentic/code/plugins/research/skills/`; KB lifecycle and semantic-memory skill docs; `docs/integrations/fortemi-index-export.md` | Met locally     | Remote CI evidence; tracker closeout via `tea`.                                                                               |
| #1691 | Add no-regression parity fixtures across local and Fortemi-backed behavior.                                                | Static Fortemi cache/query/sync adapters and unchanged local fallback paths.                                                                                                                 | `test/unit/artifacts/fortemi-core-discover-show.test.ts`, `test/unit/artifacts/fortemi-core-parity.test.ts`, `test/unit/artifacts/fortemi-core-sync.test.ts`, `test/unit/artifacts/browser-export.test.ts`, `test/unit/artifacts/index-status.test.ts`, `test/unit/artifacts/fortemi-core-security.test.ts`, `test/unit/research/query-cli.test.ts`, `test/unit/cli/handlers/subcommands.test.ts`, `test/unit/cli/doctor.test.ts`, `test/unit/issues/cli.test.ts`, `test/integration/cockpit-bridge.test.js`; Fortemi discover/show coverage includes valid-empty-cache behavior without local-corpus fallback plus title fallback and canonical agent duplicate preference parity; Fortemi static semantic and hybrid coverage exercises adapter scoring, source-body chunks, recursive path filters, CLI JSON shape, and malformed semantic/hybrid option rejection; local issue search rejects unsupported Fortemi backend selection; Cockpit capability search rejects malformed type/limit filters before shelling to `aiwg discover`. | `.aiwg/planning/fortemi-core-index-migration/completion-gate-audit.md`                                                                                                                                                  | Met for opt-in | Remote CI is green for `52f468e9ffc195bec18eb793b888e77992bafd01`; optional package-boundary workflow still requires human approval before installation. |

## Handoff Gate Traceability

| Handoff gate                                            | Evidence                                                                                                                                                                                   | Status             | Remaining proof                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| All #1664 child issues closed or explicitly superseded. | Post-CI closeout runbook: `.aiwg/planning/fortemi-core-index-migration/post-ci-tracker-closeout-plan.md`; docs regression checks the operator-authorized MCP route and no unauthorized `roctibot` closure evidence. | Ready for tracker closeout | Use commit `52f468e9ffc195bec18eb793b888e77992bafd01` and green run evidence for child comments/closures. |
| #1691 parity fixtures pass in CI.                       | Local focused suite passes: browser export, Fortemi discover/show, parity, sync, index-status, Fortemi static security guard, research-query, Cockpit bridge capability-filter guard, and top-level CLI handler tests. CI discovery includes `test/**/*.test.ts`; remote CI/Test is green on run 3196. | Met | Keep optional package-boundary workflow human-approved before installation. |
| Delivery-to-operations handoff.                         | `.aiwg/planning/fortemi-core-index-migration/handoff-readiness-report.md` records a conditional review-branch handoff decision and keeps production closeout blocked on remote CI, `tea` auth, and package-boundary signoff. | Conditional         | Use the report for review handoff only; do not close tracker issues or approve default switch from local evidence alone. |
| Fortemi Core backend fallback/rollback documented.      | `docs/integrations/fortemi-index-export.md`; ADR rollback section; `index`, `build-artifact-index`, and `artifact-lookup` skill docs in framework/addon/plugin copies.                    | Met locally        | Review acceptance and remote docs build if required.                                                                      |
| Docs and ADRs updated.                                  | Current surface inventory, ADR, integration guide, CLI reference, release note.                                                                                                            | Met locally        | Tracker links/closeout through `tea`.                                                                                     |
| Release notes or migration notes exist.                 | `CHANGELOG.md`, `docs/releases/v2026.7.1-announcement.md`, `docs/releases/_manifest.json`; release notes include valid empty-cache semantics, the Fortemi MCP storage boundary, local issue/search boundaries, and non-closing #1551/#1508 related-issue boundaries. | Met locally        | Final release/version/date review.                                                                                        |
| Default switch issue completed only after gates.        | ADR/docs keep Fortemi backend opt-in. Public Gitea issue search on 2026-07-02 for `default backend`, `default-backend`, `default switch`, `switch AIWG index/search default`, and `Fortemi Core default` found only existing migration issues #1664, #1684, #1689, and #1691, not a dedicated default-backend switch issue. Ready-to-file draft: `.aiwg/planning/fortemi-core-index-migration/default-backend-switch-issue-draft.md`. | Blocked externally | File default-switch issue only after #1691 remote CI and package-boundary decision.                                       |
| Related issue gates preserved.                          | `.aiwg/planning/fortemi-core-index-migration/tracker-status-refresh.md` records the 2026-07-02T05:44:04-04:00 read-only status for #1551 and #1508. #1551 remains open for the body-level embedding decision; #1508 remains deferred/needs-infrastructure until the provider-neutral corpus storage/index boundary is settled. | Met locally        | Reconcile through `tea` tracker comments only after CI/review if maintainers want explicit supersession or deferral notes. |
| No live Fortemi dependency in required CI.              | Live Fortemi parity gated behind `AIWG_FORTEMI_CORE_LIVE`; package-boundary workflow proposal is optional and not installed under `.gitea/workflows/`. `.gitea/workflows/ci.yml` runs `npm run test:ci` with only perf-budget env vars, and does not set `AIWG_FORTEMI_CORE_LIVE` or `AIWG_FORTEMI_CORE_PACKAGE_REQUIRED`. `.aiwg/security/working/ci-workflow-audit.md` confirms no package-boundary workflow is installed and no workflow pinning or user-defined secret findings were introduced. | Met | Remote CI/Test is green for `52f468e9ffc195bec18eb793b888e77992bafd01`; reconfirm after any workflow change. |
| No hardcoded credentials or direct REST import pattern. | Sync/export/query paths use local static cache and filesystem; Fortemi MCP storage remains separate and documented as a separate persistence backend. Static guard test: `test/unit/artifacts/fortemi-core-security.test.ts`. | Met locally        | Final security review before merge.                                                                                       |
| `.aiwg/.index` fallback preserved.                      | Local backend remains default; Fortemi cache lives under `.aiwg/.index/fortemi-core/<graph>/`; status excludes Fortemi cache from orphan cleanup.                                          | Met locally        | Keep unchanged through default-switch issue and rollback window.                                                          |

## Verification Commands

Latest required local handoff validation:

```bash
npm run build:cli
npm test
aiwg index build --all
aiwg index sync --backend fortemi-core
aiwg index status --json
aiwg doctor
```

Current local run on 2026-07-02:

- `npm run test:ci` passed: main suite `425` test files passed, `2` skipped;
  `7367` tests passed, `28` skipped. UAT suite: `5` files and `95` tests
  passed.
- `npm test` passed after the latest evidence edits: `425` test files passed,
  `2` skipped; `7367` tests passed, `28` skipped.
- `npm run build:cli` passed after the full suite.
- `aiwg index build --all` passed with framework `3684`, project `1097`, and
  codebase `1197` artifacts.
- `aiwg index sync --backend fortemi-core` updated the project cache with
  `1097` items.
- `aiwg index status --json` passed with `3` graphs built, `0` missing,
  `0` orphan index dirs, `0` warnings, and Fortemi Core `stale: false`.
- `aiwg doctor` exited `0` with `43` checks passed and `9` existing,
  non-Fortemi provider deployment warnings.
- Focused release/changelog and review-scope validation passed:
  `npm test -- --run test/unit/skills/routing-docs.test.ts` (`31` tests
  passed).

Latest focused local verification for this traceability matrix:

```bash
npm test -- --run test/unit/artifacts/browser-export.test.ts test/unit/artifacts/fortemi-core-discover-show.test.ts test/unit/artifacts/fortemi-core-parity.test.ts test/unit/artifacts/fortemi-core-security.test.ts test/unit/artifacts/fortemi-core-sync.test.ts test/unit/artifacts/index-status.test.ts test/unit/research/query-cli.test.ts test/unit/cli/handlers/subcommands.test.ts
npm run build:cli
```

Latest focused CLI parsing/security verification:

```bash
npm test -- --run test/unit/artifacts/fortemi-core-discover-show.test.ts test/unit/artifacts/fortemi-core-parity.test.ts test/unit/artifacts/fortemi-core-security.test.ts
npm run build:cli
```

Follow-up backend/graph/direction/operand/option validation:

```bash
npm test -- --run test/unit/artifacts/fortemi-core-discover-show.test.ts
```

The public CLI now rejects a missing `--backend` value with
`Error: --backend must be local or fortemi-core` instead of falling back to the
local backend. `index sync` reuses the shared parser before enforcing its
required `fortemi-core` backend. It also rejects a trailing or flag-valued
`--graph` with `Error: --graph requires a graph name` instead of silently using
the default project graph or treating another option as a graph name. Traversal commands now reject missing or invalid `--direction`
values instead of silently using command defaults; covered errors include
`Error: --direction must be upstream, downstream, or both` and
`Error: --direction must be in, out, or both`. Required traversal operands also
reject flag tokens where node IDs should be; covered errors include
`Error: --node is required for neighbors command` and
`Error: --node-a and --node-b are required`. `index discover`, `index query`,
traversal, `index export`, and `index sync` option values now also reject flag
tokens before they can become a discover/query filter, edge type, repository
label, privacy value, generated timestamp, schema version, output path, or
`NaN` limit/depth;
covered errors include `Error: --type requires a value`,
`Error: --limit must be a positive integer`,
`Error: --depth must be a positive integer`,
`Error: --edge-type requires a value`, `Error: --repo requires a value`,
`Error: --schema-version must be v1 or v2`, and
`Error: --out requires a file path`.

Latest corrupt-manifest status validation:

```bash
npm test -- --run test/unit/artifacts/fortemi-core-sync.test.ts test/unit/artifacts/index-status.test.ts
npm run build:cli
```

An unreadable Fortemi Core `manifest.json` now keeps the cache opted in and
reports it stale with `manifest file is unreadable` instead of hiding the
broken cache as not opted in.

Latest supplemental docs/runbook/package-boundary verification:

```bash
npm test -- --run test/unit/skills/routing-docs.test.ts test/unit/artifacts/browser-export.test.ts test/unit/artifacts/fortemi-core-security.test.ts test/unit/config/aiwg-config.test.ts test/unit/config/get-set-project.test.ts test/unit/cli/doctor.test.ts
```

The routing-doc regression also checks that the ADR preserves the Fortemi MCP
storage boundary, local issue search boundary, and optional package-boundary
release-age safeguards.

Latest Fortemi sync/status/doctor verification:

```bash
npm test -- --run test/unit/artifacts/fortemi-core-sync.test.ts test/unit/artifacts/index-status.test.ts test/unit/cli/doctor.test.ts
npm run build:cli
```

Latest focused local issue/export boundary verification:

```bash
npm test -- --run test/unit/issues/local.test.ts test/unit/issues/cli.test.ts test/unit/issues/sync.test.ts test/unit/issues/live.test.ts test/integration/local-issue-workflows.test.ts test/unit/artifacts/browser-export.test.ts
```

Latest KB/memory skill-boundary verification:

```bash
npm test -- --run test/unit/skills/routing-docs.test.ts test/unit/artifacts/fortemi-core-discover-show.test.ts test/unit/kb/cli.test.ts test/unit/memory/cli.test.ts
```

Package-boundary smoke command validated locally but not installed as active CI:

```bash
npm install --no-save --package-lock=false --ignore-scripts --min-release-age=0 @fortemi/core@2026.7.0
AIWG_FORTEMI_CORE_PACKAGE_REQUIRED=1 npm test -- --run test/unit/artifacts/browser-export.test.ts
npm ci
```

The package-boundary workflow proposal must receive explicit human approval
before being copied to `.gitea/workflows/`. It also records the one-off
`--min-release-age=0` override rationale and safeguards for the freshly
released `@fortemi/core@2026.7.0` smoke.

Latest CI workflow audit evidence:

- `.aiwg/security/working/ci-workflow-audit.md` records a local read-only scan
  on 2026-07-02. It found no tag-pinned external actions, no undigested
  workflow containers, no executable `:latest` references, no `curl | sh`
  installers, and no user-defined secret exposure on PR-triggered workflow
  jobs.
- The audit confirms the Fortemi package-boundary workflow remains a proposal
  only and is not installed under `.gitea/workflows/`.

PR readiness handoff evidence:

- `.aiwg/planning/fortemi-core-index-migration/pr-readiness-checklist.md`
  records the pre-push local gate list, remote CI evidence fields, tracker
  closeout preconditions, explicit non-goals, and review focus for this WIP.
  It is intentionally a review-prep artifact, not release approval.
- `.aiwg/planning/fortemi-core-index-migration/tracker-status-refresh.md`
  records a read-only public Gitea API snapshot confirming #1664 and
  #1684-#1691 remain open until remote CI and compliant `tea` closeout are
  available.

Latest external package recheck on 2026-07-02T05:44:04-04:00:

```bash
npm view @fortemi/core@2026.7.0 version dist-tags exports dist.integrity dist.tarball time --json
```

The command reported `2026.7.0` as the `latest` dist-tag and confirmed the
published package still exports `./aiwg-index`. It also reported
`2026-07-02T03:12:43.193Z` as the `2026.7.0` publish time, keeping the
package-boundary smoke inside the documented release-age override window. This
is PASS evidence for package availability. Direct v2 export/record acceptance
remains MISSING from the published validator and stays tracked through
Fortemi/fortemi-react#219.
Fortemi React 2026.7.0 source tests already cover relationship traversal and
graph projection for full v1 and projected chunked indexes, so #220 is scoped to
direct AIWG v2-only relationship fields such as `target_path` and `direction`.
