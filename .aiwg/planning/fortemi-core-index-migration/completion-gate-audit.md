---
title: Fortemi Core Migration Completion Gate Audit
date: 2026-07-02
parent_issue: 1664
status: not-production-ready
---

# Fortemi Core Migration Completion Gate Audit

This audit maps the handoff completion standard to current evidence. It is a
read-only readiness artifact: it does not close roadmap issues or approve a
default backend switch.

For requirement-to-code-to-test traceability, see
`.aiwg/planning/fortemi-core-index-migration/traceability-matrix.md`.
For the delivery-to-operations handoff decision, see
`.aiwg/planning/fortemi-core-index-migration/handoff-readiness-report.md`.

## Summary

Current state: local implementation and fixture coverage are substantially
advanced, but the migration is not production-ready.

Blocking reasons:

- AIWG child issues #1684-#1691 are still open.
- A refreshed read-only tracker snapshot at
  `.aiwg/planning/fortemi-core-index-migration/tracker-status-refresh.md`
  confirms #1664 and #1684-#1691 remain open as of 2026-07-02T05:44:04-04:00.
- Public commit status for `origin/main`/`HEAD`
  `549aa2a9841f0e59b8b8c35f00eec4f11b68a921` is green for `CI / Test (push)`
  and `CI / Build (push)`, but #1691 has not passed in CI for the exact local
  WIP state because the Fortemi migration changes remain uncommitted in this
  checkout.
- Current branch state verified on 2026-07-02: only local `main` is present,
  tracking `origin/main`; the working tree is still uncommitted WIP.
- Direct `@fortemi/core` v2 export acceptance remains blocked upstream; AIWG has
  a tested v2-to-v1 compatibility projection but not direct v2 package support.
- No default-backend switch issue has been filed and completed after gates.
  Public Gitea issue search on 2026-07-02 for `default backend`,
  `default-backend`, `default switch`, `switch AIWG index/search default`, and
  `Fortemi Core default` found only existing migration issues #1664, #1684,
  #1689, and #1691, not a dedicated switch issue. A ready-to-file draft exists
  at
  `.aiwg/planning/fortemi-core-index-migration/default-backend-switch-issue-draft.md`.
- The WIP is not committed or delivered through review/CI yet.
- PR-readiness steps are captured in
  `.aiwg/planning/fortemi-core-index-migration/pr-readiness-checklist.md`,
  including pre-push local gates, remote CI evidence to capture, tracker
  closeout preconditions, and explicit non-goals.
- Conditional handoff readiness is captured in
  `.aiwg/planning/fortemi-core-index-migration/handoff-readiness-report.md`;
  it approves review-branch handoff only, not production closeout.
- Post-CI tracker closeout is documented in
  `.aiwg/planning/fortemi-core-index-migration/post-ci-tracker-closeout-plan.md`.
  The operator authorized Gitea MCP on 2026-07-02 for tracker writes, but
  closure cannot be executed until remote CI exists for the actual WIP commit
  and the package-boundary gate is resolved or explicitly deferred.
- A local CI workflow audit exists at
  `.aiwg/security/working/ci-workflow-audit.md`. It found no tag-pinned actions,
  no undigested workflow containers, no executable `:latest` references, no
  `curl | sh` installers, and no user-defined secret exposure on PR-triggered
  workflow jobs. This is readiness evidence only; it does not replace remote CI.
- Two local-validation tracker comments were posted through a Gitea connector
  as `roctibot` (#1664 issuecomment-77496 and #1691 issuecomment-77499).
  Project delivery policy requires tracker mutations as `roctinam` via `tea`
  and forbids `roctibot`, so those comments are treated as non-compliant
  historical notes, not closure/delivery evidence.

## Handoff Completion Standard

| Requirement                                            | Current evidence                                                                                                                                                                                                                                                                | Status      | Next action                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| All #1664 child issues closed or explicitly superseded | Gitea issue reads on 2026-07-02 show #1684, #1685, #1686, #1687, #1688, #1689, #1690, and #1691 are still open. Status comments exist on each implemented slice, but none is closed or superseded.                                                                              | Not met     | Close implementation issues only after branch review/CI, or add explicit supersession comments.    |
| #1691 parity fixtures green in CI                      | Latest local `npm run test:ci` pass after review-scope hardening: main suite `425` test files passed, `2` skipped; `7367` tests passed, `28` skipped; UAT suite `5` files and `95` tests passed. No remote CI run is available for this WIP. | Not met     | Push branch/PR and require green CI for the #1691 suites and full required test matrix.            |
| Fortemi Core backend fallback/rollback documented      | `docs/integrations/fortemi-index-export.md` documents opt-in cache, local fallback, stale/cache behavior, and rollback by omitting `--backend fortemi-core` and preserving `.aiwg/.index/<graph>/`. ADR includes rollback window requirements.                                  | Locally met | Keep through review; verify docs render and remain accurate after final code review.               |
| Docs and ADRs updated                                  | Local files exist: `.aiwg/architecture/adr-fortemi-core-indexing-substrate.md`, `.aiwg/planning/fortemi-core-index-migration/current-surface-inventory.md`, `docs/integrations/fortemi-index-export.md`.                                                                        | Locally met | Link from tracker/PR and close #1684/#1685 only after acceptance.                                  |
| Release notes or migration notes exist                 | `CHANGELOG.md` has a `2026.7.1` Fortemi Core migration preview section; `docs/releases/v2026.7.1-announcement.md` exists and release manifest is updated locally. Release-facing docs include the valid empty-cache behavior and storage/issue boundaries.                         | Locally met | Review release note scope before finalizing version/date.                                          |
| Default switch completed only after gates              | ADR and docs keep Fortemi Core backend opt-in. Public Gitea issue search on 2026-07-02 for `default backend`, `default-backend`, `default switch`, `switch AIWG index/search default`, and `Fortemi Core default` found only existing migration issues #1664, #1684, #1689, and #1691, not a dedicated default-backend switch issue. | Not met     | File default-switch issue only after #1691 is green in CI and upstream/package boundary is agreed. |
| No live Fortemi dependency in required CI              | `test/unit/artifacts/fortemi-core-parity.test.ts` gates live integration behind `AIWG_FORTEMI_CORE_LIVE`; static fixtures run without external service. `.gitea/workflows/ci.yml` runs `npm run test:ci` with only perf-budget env vars and does not set `AIWG_FORTEMI_CORE_LIVE` or `AIWG_FORTEMI_CORE_PACKAGE_REQUIRED`. `.aiwg/security/working/ci-workflow-audit.md` also confirms the optional package-boundary workflow is not installed. | Locally met | Reconfirm after any workflow change; remote CI still required for merge evidence.                  |
| No hardcoded credentials or direct REST import pattern | New local sync/export paths write static cache files and do not add credentials or Fortemi REST import code. `test/unit/artifacts/fortemi-core-security.test.ts` statically guards the required static backend files against direct network clients and credential hooks.       | Locally met | Reconfirm in review/security scan before merge.                                                    |
| `.aiwg/.index` fallback preserved                      | Local backend remains default. Fortemi cache lives under `.aiwg/.index/fortemi-core/<graph>/`; docs warn not to remove `.aiwg/.index/<graph>/` during rollback.                                                                                                                 | Locally met | Keep default backend unchanged until post-switch rollback window.                                  |

## Child Issue Readiness

| Issue | Scope                         | Local evidence                                                                                                                                                                                                                                                                                                                                                                                    | Closure readiness |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| #1685 | Current surface inventory     | `.aiwg/planning/fortemi-core-index-migration/current-surface-inventory.md` covers discovery/show, index CLI, research, KB/memory, Cockpit, storage/Fortemi bridge, local issue/search, #1551, and #1508. Status comment: issuecomment-77466.                                                                                                                                                      | Needs CI/review   |
| #1684 | ADR                           | `.aiwg/architecture/adr-fortemi-core-indexing-substrate.md` defines ownership boundary, data model, command compatibility, fallback, gates, rollback, and `@fortemi/core@2026.7.0` baseline. It now explicitly locks the Fortemi MCP storage vs Fortemi Core search boundary, the local issue search boundary, and optional package-boundary release-age safeguards. Status comment: issuecomment-77469. | Needs CI/review   |
| #1686 | v2 export contract            | `schemas/aiwg-fortemi-index-export.json` and `src/artifacts/browser-export.ts` add v2 all-domain records plus v2-to-v1 compatibility projection. The schema fixture now exercises every v2 AIWG record domain, including behavior/provider/bundle/research-view/synthesis/memory/issue records. Status comment: issuecomment-77471. Upstream direct v2 support remains Fortemi/fortemi-react#219. | Partially gated   |
| #1687 | Sync/ingest pipeline          | `src/artifacts/fortemi-core-sync.ts`, `aiwg index sync --backend fortemi-core`, manifest/status behavior, stale-source, checksum-drift, unreadable-manifest, unreadable-export, and schema-drift detection tests exist. Final local status shows Fortemi cache built, fresh, and non-orphaned. Status comments: issuecomment-77473, issuecomment-77484.                                                                 | Needs CI/review   |
| #1688 | Discover/show parity          | `--backend fortemi-core` paths for discover/show use materialized static cache; tests cover ranking, exact fetch, title fallback, canonical agent duplicate preference, ambiguity, missing cache, schema mismatch, and corrupt cache. Status comment: issuecomment-77474.                                                                                                                                                                               | Needs CI/review   |
| #1689 | Index CLI compatibility       | Backend flags exist for query/deps/neighbors/set/discover/show; export v2 and sync are wired; semantic and hybrid CLI Fortemi static paths have direct public-router coverage. Public CLI fixtures now cover stats/status/export/sync plus Fortemi cache status. Local issue search remains a separate provider surface and rejects `--backend fortemi-core` instead of silently implying Fortemi support. Status comment exists from earlier implementation.                                                                               | Needs CI/review   |
| #1690 | Research/KB migration         | `aiwg research-query` executable source-selection wrapper supports `--backend fortemi-core`; tests cover local/Fortemi retrieval parity, REF/PROF, GRADE, JSON/save, and strict value parsing for backend/depth/graph/max-source flags. Corpus view/parser tests pin golden view names plus radar/discovery/funder renderers, with corpus-snapshot docs preserving the local snapshot boundary. KB graph traversal parity covered in Fortemi fixtures. Status comments include issuecomment-77464.                                                       | Needs CI/review   |
| #1691 | No-regression parity fixtures | Local parity fixtures now cover discover/show ranking and fetch behavior, including title fallback and canonical agent duplicate preference; query/fulltext/public semantic/public hybrid; graph traversal; research/KB; v1/v2 export; local issue search backend-boundary rejection; Cockpit capability-search malformed type/limit rejection; missing/stale/corrupt/schema cache; fresh clone/malformed config via index-status tests; and live test skip gating. Comments through 77488.                                                                                                              | Needs CI          |

## Local Verification Evidence

Recent local verification commands reported passing:

```bash
npm run build:cli
npm test
aiwg index build --all
aiwg index status --json
aiwg doctor
```

Latest required local handoff validation on 2026-07-02:

- `npm run build:cli` passed: version metadata matched `2026.7.0`, TypeScript
  compilation completed, and build-copy finished.
- `npm run test:ci` passed: main suite `425` test files passed, `2` skipped;
  `7367` tests passed, `28` skipped; UAT suite `5` files and `95` tests
  passed.
- `npm test` passed after the latest evidence edits: `425` test files passed,
  `2` skipped; `7367` tests passed, `28` skipped.
- `aiwg index build --all` passed. The command output reported framework
  `3684` artifacts, project `1097`, and codebase `1197`; the refreshed build
  indexed `1` new project artifact and updated `3` project artifacts and `1`
  codebase artifact after the latest
  source/doc edits.
- `aiwg index status --json` passed with all `3` graphs built, `0` missing, `0`
  orphan index dirs, `0` warnings, and Fortemi Core cache `built: true`,
  `stale: false`.
- `aiwg index sync --backend fortemi-core` was rerun after the index build and
  updated the Fortemi cache with `1097` items.
- Final `aiwg index status --json` after the sync reports Fortemi Core
  `itemCount: 1097` and a current export checksum in command output. The
  checksum value is intentionally not repeated here because this document is
  indexed into the project graph and embedding the checksum would make the
  evidence self-referential.
- `aiwg doctor` exited `0`: `43` checks passed with `9` existing warnings
  about provider deployment size/budget and ambiguous `aiwg show aiwg-doctor`.
  Those warnings predate and sit outside this Fortemi migration slice.

Earlier focused local checks also reported passing:

```bash
npm test -- --run test/unit/artifacts/fortemi-core-discover-show.test.ts test/unit/artifacts/fortemi-core-parity.test.ts test/unit/artifacts/fortemi-core-sync.test.ts test/unit/research/query-cli.test.ts
npm run build:cli
npx prettier --check test/unit/artifacts/fortemi-core-discover-show.test.ts
```

Recent broader local verification from this WIP also reported:

```bash
npm test -- --run
npm test -- --run test/unit/artifacts/fortemi-core-sync.test.ts test/unit/artifacts/fortemi-core-parity.test.ts test/unit/artifacts/fortemi-core-discover-show.test.ts test/unit/artifacts/browser-export.test.ts test/unit/research/query-cli.test.ts
npm test -- --run test/unit/artifacts/fortemi-core-sync.test.ts test/unit/artifacts/index-status.test.ts
npm test -- --run test/unit/artifacts/fortemi-core-discover-show.test.ts test/unit/artifacts/fortemi-core-parity.test.ts test/unit/artifacts/fortemi-core-sync.test.ts test/unit/artifacts/index-status.test.ts test/unit/cli/handlers/subcommands.test.ts
npm test -- --run test/unit/artifacts/browser-export.test.ts
npm test -- --run test/unit/artifacts/fortemi-core-discover-show.test.ts
npm test -- --run test/unit/artifacts/fortemi-core-discover-show.test.ts test/unit/artifacts/fortemi-core-parity.test.ts test/unit/artifacts/fortemi-core-sync.test.ts test/unit/artifacts/index-status.test.ts test/unit/artifacts/browser-export.test.ts test/unit/research/query-cli.test.ts test/unit/cli/handlers/subcommands.test.ts
npm run test:ci && npm run build:cli
aiwg index build --all
aiwg index sync --backend fortemi-core
aiwg index status --json
aiwg doctor
```

Latest full-suite local test evidence after docs/runbook hardening:

- `npm run test:ci` passed on 2026-07-02 after review-scope hardening:
  main suite `425` test files passed, `2` skipped; `7367` tests passed,
  `28` skipped. UAT suite: `5` files,
  `95` tests passed. This evidence was refreshed after the package-boundary
  decision record, PR-readiness cleanup evidence updates, and review branch
  scope manifest.

Earlier local full-suite `npm run test:ci` result before subsequent focused
docs/runbook hardening:

- Main suite: `424` test files passed, `2` skipped; `7314` tests passed, `28`
  skipped.
- UAT suite: `5` test files passed; `95` tests passed.
- Earlier local release-build gate rerun completed successfully on 2026-07-02:
  `npm run test:ci && npm run build:cli` exited `0`. The console output was
  truncated by volume during the main suite, but the command exit plus visible
  UAT summary (`5` files, `95` tests passed) and subsequent build output confirm
  the local gate completed.

Latest CLI review-hardening pass:

- `src/artifacts/cli.ts` now uses the shared `parseBackendFlag` helper for
  `query`, `discover`, and `show` instead of duplicating backend validation in
  each command handler.
- Avoidable formatting churn in `src/artifacts/cli.ts` was reduced after the
  hybrid CLI addition by restoring the file to its existing single-quote,
  wider-line convention while preserving the Fortemi Core backend behavior.
- Follow-up CLI review reduced more avoidable churn and fixed a real argument
  parsing gap: `index deps` and `index neighbors` now skip known flag values
  when resolving positional operands, so `--backend fortemi-core` cannot be
  mistaken for an artifact path or node.
- Follow-up backend-flag review tightened `parseBackendFlag` so a trailing
  `--backend` or another flag where the backend value should be fails with
  `Error: --backend must be local or fortemi-core` instead of falling back to
  the local backend. `index sync` now uses the same parser before applying its
  stricter `fortemi-core` requirement.
- Follow-up graph-flag review tightened `parseGraphFlag` so a trailing or
  flag-valued `--graph` fails with `Error: --graph requires a graph name`
  instead of silently using the default graph or treating another option as a
  graph name. This keeps graph-specific Fortemi parity checks from accidentally
  exercising the default project graph.
- Follow-up traversal-flag review tightened `--direction` parsing for `index
  deps`, `index neighbors`, and `index set`, so missing or invalid direction
  values fail instead of silently using the command default. Covered errors
  include `Error: --direction must be upstream, downstream, or both` and
  `Error: --direction must be in, out, or both`.
- Follow-up traversal-operand review tightened required graph traversal values,
  so `--node`, `--node-a`, and `--node-b` cannot accidentally consume another
  flag token as the node identifier. Covered errors include
  `Error: --node is required for neighbors command` and
  `Error: --node-a and --node-b are required`.
- Follow-up `index discover` / `index query` / traversal / `index export` /
  `index sync` option review tightened value-bearing flags used by the Fortemi
  public CLI paths, so discover/query filters (`--type`, `--phase`, `--tags`,
  `--updated-after`, `--limit`, `--path`) and traversal / export / sync flags
  (`--depth`, `--edge-type`, `--repo`, `--privacy`, `--generated-at`,
  `--schema-version`, `--out`) cannot consume another flag token or leak a
  `NaN` limit/depth into search, capability discovery, or graph traversal.
  Covered
  errors include
  `Error: --type requires a value`,
  `Error: --limit must be a positive integer`,
  `Error: --depth must be a positive integer`,
  `Error: --edge-type requires a value`, and
  `Error: --repo requires a value`, `Error: --schema-version must be v1 or v2`,
  and `Error: --out requires a file path`.
- Follow-up graph traversal review reduced avoidable formatting churn in
  `src/artifacts/dep-graph.ts` and `src/artifacts/graph-query.ts`, leaving the
  diff focused on the Fortemi backend option, Fortemi dependency-graph loader,
  and JSON `backend` field.
- Focused CLI/Fortemi regression suite passes: `5` test files passed, `56`
  tests passed, `1` skipped.
- Latest review-readiness validation passed: Fortemi discover/show, Fortemi
  parity, and CLI subcommand tests (`3` files, `46` tests passed, `1` skipped),
  `npm run build:cli`, formatter checks for touched files, and the whitespace
  diff check. Latest backend/graph/direction/operand/option regression validation
  passed: Fortemi discover/show, routing docs, and research-query tests (`3`
  files, `54` tests passed).

Latest package-boundary contract evidence:

- `test/unit/artifacts/browser-export.test.ts` validates v2 exports against
  `schemas/aiwg-fortemi-index-export.json` with representative records for all
  v2 AIWG domains: artifact, skill, agent, command, rule, behavior, flow,
  provider, bundle, research REF, research profile, research view, research
  synthesis, KB page, memory entry, and issue. It also validates the v2-to-v1
  compatibility projection against `@fortemi/core/aiwg-index` when that package
  is installed.
- The schema now enforces the v1 compatibility boundary directly: v1 exports
  reject v2 compatibility metadata, graph source metadata, v2 record schema
  markers, search/chunk fields, and `target_path`/`direction` relationship
  fields. The browser export regression validates the clean projection and
  negative drift cases.
- The optional package validator loader now uses a Vitest-compatible dynamic
  import and accepts the current `@fortemi/core@2026.7.0` validator result shape
  (`valid: true`) as well as the earlier `ok: true` shape.
- The v2 export fixture includes a synthesis-to-REF citation relationship so
  cross-domain relationship IDs are checked against the exported target record.
- Set `AIWG_FORTEMI_CORE_PACKAGE_REQUIRED=1` to make the package validator
  mandatory in a package-boundary CI job.
- `.aiwg/planning/fortemi-core-index-migration/fortemi-package-boundary-workflow-proposal.md`
  proposes an optional remote package-boundary gate. The active workflow is not
  installed because AIWG CI safety rules require explicit human authorization
  before adding files under `.gitea/workflows/`.
- The package-boundary proposal now includes an npm release-age override record
  for `@fortemi/core@2026.7.0`: package/version, rationale for not waiting,
  explicit human approval requirement, label gate, disabled lifecycle scripts,
  no manifest mutation, mandatory package validation, and post-smoke `npm ci`.
- Local static export test passes without requiring the package (`5` tests
  passed).
- Local package-boundary smoke validation also passes after a transient
  no-lockfile install:
  `npm install --no-save --package-lock=false --ignore-scripts --min-release-age=0 @fortemi/core@2026.7.0`
  followed by
  `AIWG_FORTEMI_CORE_PACKAGE_REQUIRED=1 npm test -- --run test/unit/artifacts/browser-export.test.ts`
  (`5` tests passed). The transient install was not committed to `package.json`
  or `package-lock.json`; a committed dependency change should follow the npm
  release-age override policy if adopted.

Latest index CLI compatibility evidence:

- `test/unit/artifacts/fortemi-core-discover-show.test.ts` now exercises the
  public `src/artifacts/cli.ts` router for `index stats --graph project --json`,
  `index status --json`, the `index list --json` status alias,
  `index export --format fortemi --schema-version v2`,
  `index sync --backend fortemi-core --json`,
  `index query ... --semantic --backend fortemi-core --json`, and
  `index query ... --hybrid --backend fortemi-core --json` with type/tag/path
  filters.
- Public CLI coverage now also guards positional graph operands after
  `--backend fortemi-core` flag values for `index deps` and `index neighbors`,
  so the backend value cannot be mistaken for the artifact path or node.
- Fortemi fulltext query now ranks exported static-cache text/chunks directly
  and preserves type/phase/tag/path filters without rereading source files after
  sync. The export/fulltext fixture now proves source-body text is captured in
  v2 chunks by matching a source-only phrase after the source file is removed.
- `test/unit/cli/handlers/subcommands.test.ts` now verifies the top-level
  `aiwg discover` and `aiwg show` handlers preserve `--backend fortemi-core`
  when delegating to the shared artifact CLI implementation.
- `test/unit/cli/handlers/subcommands.test.ts` also verifies provider command
  metadata advertises `research-query --save` and includes `Write` in allowed
  tools, keeping the command surface aligned with the executable wrapper and
  research-query skill docs.
- `test/unit/artifacts/fortemi-core-security.test.ts` guards the required
  Fortemi static backend code against direct network clients, Authorization /
  Bearer hooks, API-key names, access-token names, client-secret names, and
  password strings. The only Fortemi credential references remain in the
  explicitly skipped live integration fixture.
- `test/unit/artifacts/fortemi-core-parity.test.ts` now includes a recursive
  `**` path-filter regression for Fortemi static hybrid queries, covering the
  same glob semantics expected by the local hybrid path filter.
- `test/unit/cli/doctor.test.ts` now locks down the doctor durable-index gate:
  `collectIndexStatus` integration, graph-config warnings, orphan index-dir
  drift, registered durable-index missing warnings, and remediation messages for
  `aiwg index status` / `aiwg index build --all`.
- Latest focused Fortemi suite includes the static security guard and passes:
  browser export, Fortemi discover/show, parity, security, sync, index-status,
  research-query, and top-level CLI handler tests (`8` files, `68` tests
  passed, `1` live-gated skip), plus `npm run build:cli`.
- Latest Fortemi CLI parsing/security verification passed: Fortemi
  discover/show public router, parity, and static security tests (`3` files,
  `18` tests passed, `1` live-gated skip). Follow-up public-router validation
  also passed after adding the missing `--backend` value regression (`15`
  Fortemi discover/show tests).
- Latest Fortemi static fulltext verification passed: Fortemi discover/show
  public router, parity, and static security tests (`3` files, `19` tests
  passed, `1` live-gated skip), plus `npm run build:cli`.
- `docs/cli-reference.md`, `docs/integrations/fortemi-index-export.md`, and
  `docs/releases/v2026.7.1-announcement.md` document the Fortemi static semantic
  and filtered hybrid query modes, including the opt-in `--backend fortemi-core`
  requirement for index and top-level discover/show routes.
- `docs/cli-reference.md` and
  `docs/integrations/fortemi-index-export.md` document Fortemi static fulltext
  as BM25 over exported record text/chunks rather than live source-file reads.
- `docs/cli-reference.md` also documents Fortemi Core graph traversal for
  `index deps` and `index neighbors`, including that those commands read
  relationships from the opt-in static cache after
  `aiwg index sync --backend fortemi-core`.
- The `index`, `build-artifact-index`, and `artifact-lookup` skill docs now
  describe `status`, `export`, `sync`, `neighbors`, `set`, and the opt-in
  Fortemi Core backend across source and deployed plugin copies, closing the
  agent-facing capability documentation gap found during final review.
- The `corpus-snapshot` skill docs now document the Fortemi migration boundary:
  snapshots remain AIWG-rendered from corpus sidecars/views and local
  `.aiwg/.index` artifacts until #1690 accepts a Fortemi-projected snapshot
  contract and #1691 proves metric parity.
- Local issue search was rechecked against the Fortemi migration boundary.
  `aiwg issue list` already supports `--search`; CLI usage and
  `docs/local-issues.md` now document it, and the docs state that local issue
  operations remain on the local provider unless a later ADR joins `aiwg.issue`
  records into the shared index.
- Latest local issue/export boundary verification passed: local issue provider,
  issue CLI, issue sync, live issue snapshot/client, local issue workflow, and
  browser export tests (`6` files, `27` tests passed).
- KB and semantic-memory skill docs now document the Fortemi migration boundary:
  `kb-ingest`, `kb-health`, and `memory-query-capture` keep persistence routed
  through storage adapters, while Fortemi Core search/traversal remains opt-in
  through artifact graph sync and explicit `--backend fortemi-core` commands.
- Latest KB/memory boundary verification passed: routing docs, Fortemi KB
  neighbor traversal, KB CLI, and memory CLI tests (`4` files, `59` tests
  passed).
- `docs/storage/backends/fortemi.md` now explicitly separates the older Fortemi
  MCP storage adapter from the Fortemi Core static index/search backend, so
  configuring `"type": "fortemi"` for storage cannot be mistaken for switching
  AIWG discovery/query/traversal to `--backend fortemi-core`.
- Latest storage-boundary validation passed: Fortemi storage adapter, storage
  config, backend listing, storage migration, routing docs, and Fortemi static
  security tests (`6` files, `79` tests passed).
- Release notes now include boundary clarifications for Fortemi MCP storage and
  local issue search, and `CHANGELOG.md` records those surfaces as intentionally
  separate from the opt-in Fortemi Core static index/search backend.
- Latest release/docs boundary verification passed: routing docs, AIWG guide
  release-note lookup, Fortemi storage adapter, and Fortemi static security
  tests (`4` files, `44` tests passed).
- The ADR has been hardened to match the latest boundary docs: `"type":
  "fortemi"` remains Fortemi MCP persistence, `aiwg issue list --search`
  remains local-provider search, and optional `@fortemi/core@2026.7.0`
  package-boundary evidence requires the documented release-age override
  safeguards.
- Latest package-boundary proposal verification passed: routing docs, browser
  export/package-validator fixture, and Fortemi static security tests (`3`
  files, `17` tests passed).
- The post-CI tracker closeout runbook now requires pre-mutation verification
  (`git status`, `aiwg index status`, `aiwg doctor`, `tea login list`, and
  `tea whoami` after selecting the `roctinam` login) and uses explicit
  `--login roctinam` on `tea` commands that accept the flag, while preserving
  the `roctibot` prohibition.
- The closeout runbook now also keeps related issues #1551 and #1508 out of
  the child-issue closure flow. It provides optional non-closing status comment
  text for #1551 as the body-level embedding acceptance case and #1508 as the
  deferred provider-neutral corpus-to-storage/index boundary.
- Latest tracker-closeout runbook validation passed: routing docs, AIWG config,
  project config get/set, and doctor delivery-identity tests (`4` files, `126`
  tests passed).
- Closeout command syntax was rechecked against installed `tea` `0.14.1` help:
  `tea issues`, `tea comment`, `tea issues close`, `tea issues create`,
  `tea actions runs list`, `tea actions runs view --jobs`, and `tea api` all
  support the command/flag shapes documented in
  `post-ci-tracker-closeout-plan.md`. `tea logins list` is also accepted as an
  alias for `tea login list`. Local login output still contains no configured
  `roctinam` login, so this is syntax validation only, not tracker execution
  evidence.
- Latest supplemental docs/runbook/package-boundary verification passed:
  routing docs, browser export/package-validator fixture, Fortemi static
  security guard, AIWG config, project config get/set, and doctor
  delivery-identity tests (`6` files, `131` tests passed).
- Latest ADR/security boundary verification passed: routing docs and Fortemi
  static security guard (`2` files, `15` tests passed).
- Latest CLI docs/traversal verification passed: routing docs, Fortemi
  discover/show public router, and Fortemi static security guard (`3` files,
  `28` tests passed).
- Latest closeout related-issue verification passed: routing docs regression
  (`31` tests) now asserts #1551/#1508 remain non-closing related issues in the
  post-CI closeout plan and PR readiness checklist.
- The focused Fortemi/research/CLI suite passes: `7` test files passed, `65`
  tests passed, `1` live-gated skip.
- Latest export-contract validation passed: browser export, Fortemi parity,
  Fortemi sync, and Fortemi discover/show tests (`4` files, `25` tests passed,
  `1` live-gated skip), plus `npm run build:cli`.
- Latest docs/contract validation passed: Fortemi discover/show public-router
  test (`11` tests), `npm run build:cli`, and whitespace diff checks for the
  CLI/Fortemi docs.
- Latest doctor/status validation passed: doctor durable-index gate,
  index-status, and Fortemi discover/show tests (`3` files, `64` tests passed).
- Fortemi sync validation now treats repeated normal syncs over unchanged index
  content as `status: "unchanged"` even when a fresh generated timestamp would
  otherwise be available, preventing timestamp-only cache churn.
- Fortemi status validation now marks opted-in caches stale when the manifest is
  unreadable, the export file is missing or unreadable, the export checksum no
  longer matches the manifest, the export schema no longer matches the expected
  v2 schema, or the source graph was rebuilt after sync. This closes the
  status/doctor side of the corrupt/schema cache gate before a query attempts
  to load the cache.
- Latest corrupt-manifest status validation passed: Fortemi sync and
  index-status tests (`2` files, `17` tests passed), plus `npm run build:cli`.
  The runtime status reason starts with `manifest file is unreadable`.
- Fortemi query/discover/show errors now preserve the precise status-level
  stale reason and append recovery guidance to re-run
  `aiwg index sync --backend fortemi-core` or omit the backend flag for local
  fallback.
- Valid but empty Fortemi Core static caches are treated as built empty indexes
  rather than unavailable caches. Query and fulltext return zero results,
  discover returns a backend-specific no-match hint, and show reports no
  Fortemi artifact match without falling back to the local AIWG corpus.
- The source and deployed `index` skill docs now preserve that same
  valid-empty-cache distinction for agents routing Fortemi-backed index work.
- Latest Fortemi sync/status/doctor validation passed: Fortemi sync, index
  status, and doctor durable-index tests (`3` files, `61` tests passed), plus
  `npm run build:cli`.
- Research-query Fortemi source selection now follows the explicit-backend cache
  contract: local/Fortemi parity is covered when the static cache exists, and a
  missing Fortemi cache fails with recovery guidance instead of silently
  returning an empty source set. The executable wrapper now also rejects missing
  or flag-valued `--backend`, `--depth`, `--graph`, and `--max-sources` values
  before they can alter the question text or silently fall back to local/default
  source selection.
- Latest research/corpus validation passed: corpus view/parser and routing docs
  tests (`3` files, `56` tests passed). The corpus view test now pins the exact
  golden markdown view list, the parser coverage includes radar/discovery/funder
  renderers, and routing docs assert that corpus snapshots remain AIWG-rendered
  from corpus sidecars/views plus the local `.aiwg/.index` during the Fortemi
  preview.
- Latest Cockpit capability-surface validation passed: bridge integration tests
  (`1` file, `27` tests passed) now reject malformed capability-search `type`
  and `limit` filters before shelling to `aiwg discover`, keeping
  operator-correctable request errors out of the Bridge 5xx path.
- Release-note regression coverage now checks that
  `docs/releases/_manifest.json` registers `v2026.7.1-announcement` first and
  that the preview announcement/changelog document static semantic/hybrid query
  support alongside the storage and local-issue boundaries. The latest
  release-facing regression also asserts #1551 and #1508 remain non-closing
  related issues in the release/changelog surface, preserving #1551 as the
  body-level embedding acceptance case and #1508 as the deferred
  provider-neutral corpus-to-storage/index boundary. Direct Fortemi REST import
  and hardcoded-token patterns remain out of scope.

CI inclusion evidence:

- `.gitea/workflows/ci.yml` runs `npm run test:ci` in the main `Test` job after
  `npm run build:cli`.
- The proposed package-boundary workflow is documented under
  `.aiwg/planning/fortemi-core-index-migration/`; it still needs explicit human
  authorization before it can be copied into `.gitea/workflows/` and produce
  remote CI evidence.
- `package.json` defines `test:ci` as
  `vitest run --config config/vitest.config.js && vitest run --config config/vitest.uat.config.js`.
- `config/vitest.config.js` includes `test/**/*.test.ts`, so the Fortemi static
  parity fixtures under `test/unit/artifacts/` and `test/unit/research/` are in
  the CI test discovery path.
- Remote CI evidence is still absent until this WIP is pushed and the Gitea CI
  run completes successfully.
- Latest local `npm run test:ci` completed successfully on 2026-07-02 after
   review-scope hardening. Main suite:
   `425` files passed, `2` skipped; `7367` tests passed, `28` skipped. UAT
  suite: `5` files and `95` tests passed. This confirms the same npm script
  wired into `.gitea/workflows/ci.yml`, but does not satisfy the remote CI gate.
- Latest focused release/changelog and review-scope validation passed after the
  release-facing #1551/#1508 assertions and explicit review branch scope
  assertions were added:
  `npm test -- --run test/unit/skills/routing-docs.test.ts` (`31` tests
  passed).

Latest local index/status evidence:

- `aiwg index build --all` rebuilt framework/project/codebase graphs. Latest
  run reported framework `3684` artifacts, project `1097`, and codebase `1197`.
- `aiwg index sync --backend fortemi-core` updated the project Fortemi cache
  with `1097` items after the latest evidence refresh.
- `aiwg index status --json` reports all `3` graphs built, `0` missing, `0`
  orphan index dirs, `0` warnings, and Fortemi Core `built: true`,
  `stale: false`, `itemCount: 1097`, with a current export checksum in command
  output. The checksum value is intentionally not repeated in this indexed
  audit document to avoid self-referential index churn.
- `aiwg doctor` exits successfully with the artifact index up to date. It still
  reports existing provider deployment warnings for `security-auditor` size,
  Claude skill budget/count, and ambiguous `aiwg show aiwg-doctor`; those are
  outside this Fortemi migration slice.
- Latest PR-readiness cleanup review used AIWG discovery and routed to
  `cleanup-audit`; `npm run lint:schemas` passed; a Fortemi-scoped scan found
  no accidental `.only`, `debugger`, TODO, FIXME, XXX, HACK, or TEMP markers in
  the touched Fortemi migration source, tests, and evidence docs. The only
  `console.log` hits in the narrowed scan were normal CLI output paths in
  `src/research/query-cli.ts`.

These are local signals only. They do not replace CI.

## Tracker Delivery Compliance

`.aiwg/aiwg.config` sets `delivery.mode: direct`, `require_ci_green: true`, and
`remotes.tracker_actor.login: roctinam` via `tea`, with `roctibot` listed under
`forbid_actors`.

Before any push/review handoff, use
`.aiwg/planning/fortemi-core-index-migration/pr-readiness-checklist.md` for the
pre-push local gate list and the remote CI evidence fields that must be captured
before this closeout section can become actionable.

Read-only tracker inspection via connector is acceptable for status checks, but
tracker mutations for issue comments, issue closure, labels, milestones, or PRs
must use the configured `tea` route. Local `tea` currently has no configured
login, so compliant tracker writes are unavailable from this environment until
the operator configures/authorizes that route.

Non-compliant comments already present:

- #1664 issuecomment-77496 — local validation update, authored by `roctibot`.
- #1691 issuecomment-77499 — local parity update, authored by `roctibot`.

These comments should be deleted/reposted by `roctinam` via `tea`, or explicitly
accepted by the maintainer despite the delivery-policy exception. They must not
be used as evidence that child issues are ready to close.

Latest read-only tracker check on 2026-07-02:

- `origin` still points at
  `git@git.integrolabs.net:roctinam/aiwg.git`; `github` remains the separate
  GitHub mirror remote.
- `.aiwg/planning/fortemi-core-index-migration/tracker-status-refresh.md`
  records the latest public Gitea API read for #1664 and #1684-#1691.
- Public Gitea API reads show #1664 remains open:
  "research(index): plan AIWG search/discovery convergence on @fortemi/core".
- Public Gitea API reads show #1684, #1685, #1686, #1687, #1688, #1689,
  #1690, and #1691 all remain open.
- Latest read-only roadmap-child recheck on 2026-07-02T05:44:04-04:00 found
  no child issue state, label, or updated-at changes from the previous
  snapshot.
- Related issues #1551 and #1508 were also rechecked read-only. #1551 remains
  open as the body-level embedding acceptance case for the #1684/#1690
  Fortemi Core ownership decision. #1508 remains open with `deferred` and
  `needs-infrastructure` labels until #1687/#1690 settle the provider-neutral
  corpus storage/index boundary; the direct Fortemi REST/token import pattern
  remains out of scope for this migration.
- `tea login list` still reports no configured login, so no compliant tracker
  writes were available during this audit refresh.

## Upstream / Cross-Repo State

- `@fortemi/core@2026.7.0` is the verified released baseline.
- Latest `npm view @fortemi/core@2026.7.0 version dist-tags exports
  dist.integrity dist.tarball time --json` recheck on
  2026-07-02T05:44:04-04:00 reported `2026.7.0` as the `latest` dist-tag,
  confirmed the published package still exports `./aiwg-index`, and showed
  the version publish time as `2026-07-02T03:12:43.193Z`. PASS evidence for
  package availability is separate from the fact that direct v2 export/record
  acceptance remains MISSING from the published validator and is tracked
  separately.
- Published package exposes `@fortemi/core/aiwg-index`, relationship traversal,
  and static semantic/hybrid helper contracts.
- Local Fortemi React 2026.7.0 source tests cover relationship traversal and
  graph projection for full v1 and projected chunked indexes; the remaining
  relationship gap is direct AIWG v2-only fields such as `target_path` and
  `direction`.
- Upstream Fortemi React verification passed from the clean checkout:
  `pnpm --filter @fortemi/core exec vitest run src/__tests__/aiwg-index.test.ts --reporter dot`
  (`1` file, `37` tests passed).
- Published AIWG export/record validation remains v1-only.
- AIWG local compatibility bridge projects v2 exports into the current v1
  contract, but direct v2 acceptance remains open.
- Fortemi/fortemi-react#219 remains the direct v2 export/record acceptance
  blocker.
- Fortemi/fortemi-react#220 remains open unless the AIWG projection into
  Fortemi's normalized relationship model is accepted as the long-term boundary.
- Read-only Fortemi React issue filing decision:
  `.aiwg/planning/fortemi-core-index-migration/fortemi-react-issue-audit.md`.
- Package-boundary decision record:
  `.aiwg/planning/fortemi-core-index-migration/package-boundary-decision-record.md`
  treats AIWG's v2-to-v1 projection as a temporary bridge until Fortemi accepts
  v2 directly or a maintainer explicitly approves the projection as the
  long-term boundary.

## Remaining Work Queue

1. Keep PR-readiness review focused on final diff review before push. The known
   `src/artifacts/cli.ts` churn item has been reduced and now carries an added
   positional-operand regression test; the latest cleanup pass found no
   Fortemi-scoped TODO/FIXME/debugger/test-only residue, and build/schema gates
   passed locally.
2. Configure/verify the compliant Gitea tracker write path (`tea` as
   `roctinam`) before any further issue comments, closures, labels, milestones,
   or PR delivery mutations.
3. Obtain maintainer approval for whether AIWG's v2-to-v1 compatibility
   projection remains a temporary bridge or becomes the approved long-term
   package boundary.
4. Push for CI and use CI evidence to close or explicitly supersede #1684-#1691.
5. Execute the post-CI tracker closeout plan only through `tea` as `roctinam`.
6. File the default-backend switch issue from
   `.aiwg/planning/fortemi-core-index-migration/default-backend-switch-issue-draft.md`
   only after #1691 is green in CI and Fortemi v2/package boundary is settled.
