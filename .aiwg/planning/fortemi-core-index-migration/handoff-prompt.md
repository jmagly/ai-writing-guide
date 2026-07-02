# Handoff Prompt — Fortemi Core Index/Search Migration

You are working in `/home/roctinam/dev/aiwg` on the AIWG issue-tracked roadmap for replacing AIWG-owned indexing, discovery, and search internals with `@fortemi/core` contracts.

## Objective

Work issue #1664 and its roadmap until the Fortemi Core migration is production-ready. Preserve or improve every existing AIWG indexing, discovery, search, research-query, and KB traversal capability. Do not switch defaults until no-regression parity fixtures prove current behavior is preserved.

## Tracker Source Of Truth

Use Gitea `origin` as the issue tracker:

- Repo: `roctinam/aiwg`
- Parent: #1664 — research(index): plan AIWG search/discovery convergence on `@fortemi/core`
- Roadmap comment: #1664 issuecomment-77378

AIWG-side roadmap children:

1. #1685 — inventory every AIWG search/discovery/index surface for Fortemi Core parity
2. #1684 — ADR: Fortemi Core as AIWG indexing/discovery/search substrate
3. #1686 — extend AIWG -> Fortemi export contract to all record domains
4. #1687 — add Fortemi Core sync/ingest pipeline for AIWG project indexes
5. #1688 — preserve `aiwg discover` / `aiwg show` ranking and fetch semantics
6. #1689 — preserve `aiwg index` CLI compatibility
7. #1690 — migrate research corpus and knowledge-base search
8. #1691 — no-regression parity fixtures for the migration

Execution order:

```text
#1685 -> #1684 -> #1686 -> #1687 -> (#1688 + #1689 + #1690) -> #1691 -> default-backend switch issue
```

Related existing issues:

- #1551 — body-level embedding option. Keep open as a concrete acceptance case until #1684/#1690 decide whether Fortemi Core owns chunk/body embeddings.
- #1508 — deferred Fortemi corpus import. Keep deferred until #1687/#1690 settle the provider-neutral storage/index boundary.
- #1578 — closed v1 browser-consumable AIWG Fortemi export contract.
- #1487-#1496, #1624, #1626 — closed index prior art; treat as baseline, not work to reopen.

Fortemi-side prerequisites already referenced on #1664:

- Fortemi/fortemi-react#213 — extensible AIWG record types
- Fortemi/fortemi-react#214 — AIWG discovery-ranking mode
- Fortemi/fortemi-react#215 — relationship traversal and graph queries
- Fortemi/fortemi-react#216 — static-index semantic/hybrid search contract
- Fortemi/fortemi-react#217 — bridge tool surface for semantic/hybrid search

## Starting Protocol

1. Confirm worktree state:

   ```bash
   git status --short --branch
   git branch --format='%(refname:short) %(upstream:short) %(committerdate:iso8601) %(objectname:short) %(subject)'
   ```

2. Read #1664 and all child issues before coding.
3. Start with #1685 unless the tracker says it is closed.
4. Use AIWG discovery before filesystem spelunking for AIWG capabilities:

   ```bash
   aiwg discover "artifact index search semantic graph discovery"
   aiwg discover "research corpus index search citation graph query"
   aiwg discover "knowledge base semantic memory Fortemi search"
   aiwg discover "architecture evolution ADR migration planning"
   aiwg discover "execute test strategy"
   ```

5. Use `aiwg show skill <name> --first` for relevant skills.

## Required Phase 0 Deliverables

For #1685, create:

```text
.aiwg/planning/fortemi-core-index-migration/current-surface-inventory.md
```

The inventory must cover at least:

- `aiwg discover` / `aiwg show`
- `aiwg index build/query/deps/neighbors/stats/list/status/export`
- `artifact-lookup`, `build-artifact-index`, and `index` skills
- research corpus views, `research-query`, citation/profile/funder/radar/discovery views, `aiwg corpus snapshot`
- KB and semantic-memory surfaces: `kb-ingest`, `kb-health`, `memory-ingest`, `memory-query-capture`, graph traversal
- Cockpit capability/index inspection, especially #1592
- storage/Fortemi bridge: `src/storage/backends/fortemi.ts`, #934, #1578 export schema
- local issue/search interactions if they use index graph behavior

For #1684, create an ADR under:

```text
.aiwg/architecture/
```

The ADR must decide:

- `@fortemi/core` ownership boundary vs AIWG adapter/local cache logic
- data model and record domains
- public command compatibility and fallback behavior
- default-backend switch criteria
- no-regression gates and rollback path

## Testing And Audit Requirements

Testing and audit are required deliverables, not optional cleanup.

Minimum validation before closing each implementation issue:

```bash
npm run build:cli
npm test
aiwg index build --all
aiwg index status --json
aiwg doctor
```

When touching targeted areas, add targeted tests and run them directly, for example:

```bash
npm run test -- test/unit/artifacts
npm run test -- test/unit/storage
npm run test -- test/unit/kb
npm run test -- test/unit/config
```

For #1691, build parity fixtures that compare current local backend vs Fortemi Core backend across:

- discover/show ranking and exact fetch behavior
- ambiguous names, `--first`, full-path show
- metadata query, fulltext, semantic, hybrid, filters, JSON output
- dependencies, neighbors, citation graph, KB graph
- research REF/PROF retrieval and GRADE/citation fields
- v1 export compatibility and v2 all-domain export
- fresh clone, missing index, stale source, malformed graph config, doctor findings

Required audit gates:

- no public command behavior changes without #1684 ADR approval
- no default backend switch until #1691 is green
- no live Fortemi dependency in required CI
- no hardcoded credentials or direct REST import patterns
- no removal of `.aiwg/.index` fallback until rollback has shipped for at least one release

## Current Repo Notes

At handoff creation, local branch cleanup was already checked:

- local branches: only `main`
- `main` tracks `origin/main`
- `github/main` may lag `origin/main`; do not push/sync unless explicitly asked
- pre-existing untracked file: `.aiwg/reports/doc-sync-20260630T164445Z.md`; unrelated to Fortemi roadmap unless user says otherwise

## Completion Standard

Production-ready means:

- all #1664 child issues are closed or explicitly superseded with tracker comments
- #1691 parity fixtures pass in CI
- Fortemi Core backend has documented fallback/rollback
- docs and ADRs are updated
- release notes or migration notes exist
- default switch issue is completed only after all gates pass
