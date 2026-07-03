---
title: ADR — Fortemi Core as AIWG indexing, discovery, and search substrate
phase: architecture
type: adr
created: 2026-07-02
issue: "1684"
parent: "1664"
status: proposed
---

# ADR: Fortemi Core as AIWG indexing, discovery, and search substrate

**Status**: Proposed
**Date**: 2026-07-02
**Issue**: #1684 (parent #1664)
**Follows**: #1685 current-surface inventory
**Related**: #1508, #1551, #1578, #1686, #1687, #1688, #1689, #1690, #1691

## Context

AIWG currently owns several overlapping indexing and search implementations:

- `aiwg discover` / `aiwg show` for capability discovery and artifact fetch.
- `aiwg index build/query/deps/neighbors/stats/list/status/export` for
  JSON graph indexes, fulltext/semantic query, graph traversal, status, and
  Fortemi export.
- Research corpus rendering and graph tooling: REF/PROF records, citation
  graphs, profile/funder/radar/discovery views, and `research-query`.
- KB and semantic-memory topology: `kb-ingest`, `kb-health`,
  `memory-ingest`, `memory-query-capture`, and graph traversal.
- Cockpit Explore, which is registry-bound to `aiwg discover` and `aiwg show`.
- Local issue search/index workflows.

#1685 captured the current capability ledger in
`.aiwg/planning/fortemi-core-index-migration/current-surface-inventory.md`.
That inventory is the no-regression baseline for this ADR. Existing public
commands are agent-facing contracts, so implementation may replace internals but
must not change public behavior until parity fixtures prove equivalence.

The migration target is `@fortemi/core`, not Fortemi MCP storage. AIWG already
has a Fortemi storage adapter (`src/storage/backends/fortemi.ts`, #934) and a
browser-consumable export contract (`aiwg.fortemi.index.export.v1`, #1578).
Those are related but narrower than the search/index substrate decision here.
Configuring a subsystem storage backend with `"type": "fortemi"` continues to
mean Fortemi MCP persistence for that subsystem; it does not switch AIWG
discovery, artifact query, graph traversal, research-query, or KB traversal to
the Fortemi Core static index/search backend.

Local issue search is also outside the initial Fortemi Core backend switch.
`aiwg issue list --search` and related filters continue to use the local issue
provider's rebuildable `.aiwg/issues/index/issues.index.json` cache. Fortemi
exports may carry `aiwg.issue` records for cross-domain artifact search, but
that export does not make issue operations depend on Fortemi Core unless a
later ADR changes the local issue CLI contract.

## Decision

AIWG will converge indexing, discovery, graph traversal, research retrieval, and
KB search onto `@fortemi/core` contracts through an AIWG compatibility adapter.
Fortemi Core becomes the target substrate for record storage contracts,
lexical/semantic/hybrid query, relationship traversal, chunk/body embeddings,
static/browser indexes, and PGlite/local-first search. AIWG keeps ownership of
source scanning, public CLI/skill behavior, project-local policy, fallback
caches, and compatibility shims.

This migration has entered the default-backend phase. Fortemi Core is the
default backend for artifact search, discovery, traversal, and research source
selection. The current AIWG local index remains available through
`--backend local` as a legacy fallback during the July 2026 deprecation window.

## Ownership Boundary

| Concern                                               | Owner                        | Decision                                                                                                                                                                                                                     |
| ----------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source discovery and parsing                          | AIWG                         | AIWG continues to scan `.aiwg/`, `agentic/code/`, project-local bundles, research corpus files, KB files, local issues, provider deployment surfaces, and source sidecars.                                                   |
| Public commands and skill UX                          | AIWG                         | `aiwg discover`, `aiwg show`, `aiwg index *`, `research-query`, KB/memory skills, and Cockpit APIs keep current command names, flags, output shapes, and fallback guidance unless a later ADR/deprecation approves a change. |
| Canonical cross-domain index record contract          | Fortemi Core + AIWG adapter  | #1686 defines `aiwg.fortemi.index.export.v2` (or successor) as the all-domain AIWG record contract consumed by Fortemi Core.                                                                                                 |
| Lexical, semantic, hybrid, and graph query primitives | Fortemi Core                 | Fortemi Core owns reusable query and traversal primitives once parity is implemented. AIWG adapter translates current command requests into those primitives.                                                                |
| Chunk/body embedding contract                         | Fortemi Core                 | #1686/#1689 exercise source-body chunk export for static fulltext. #1551 is held until #1690 verifies Fortemi Core vector embedding ownership. Expected outcome: close #1551 as subsumed, or narrow it to AIWG adapter/fixture work if Fortemi lacks an AIWG-specific projection. |
| Local cache and rollback files                        | AIWG                         | `.aiwg/.index` remains the local fallback and bootstrap cache through at least one release after a default switch.                                                                                                           |
| Fortemi MCP storage adapter                           | AIWG storage subsystem       | `src/storage/backends/fortemi.ts` and `"type": "fortemi"` remain persistence routing for subsystems, not the search substrate. #1687 must keep this boundary explicit.                                                       |
| Local issue provider/search                           | AIWG issue subsystem         | `aiwg issue list --search` stays on the local issue provider and local issue index. Exported `aiwg.issue` records do not alter issue CLI behavior without a later ADR.                                                        |
| Browser/static consumption                            | Fortemi Core + Fortemi React | Static export/chunk manifests, browser/PGlite mode, and bridge-friendly query helpers are Fortemi-side contracts consumed by Fortemi React/Cockpit surfaces.                                                                 |

## Canonical AIWG Record Domains

#1686 must extend the current v1 export beyond `aiwg.artifact` and CRM records.
The v2 contract must represent at least:

| Domain                     | Record types                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Capability corpus          | `aiwg.skill`, `aiwg.agent`, `aiwg.command`, `aiwg.rule`, `aiwg.behavior`, `aiwg.flow`                                                           |
| Provider / bundle topology | `aiwg.provider`, `aiwg.bundle`, project-local extension/addon/framework/plugin records                                                          |
| SDLC artifacts             | `aiwg.artifact` plus precise artifact facets/types for use cases, ADRs, test plans, risks, requirements, runbooks, reports, generated answers   |
| Research corpus            | `aiwg.research.ref`, `aiwg.research.profile`, `aiwg.research.view`, `aiwg.research.synthesis`, citation/radar/discovery/funder/profile sidecars |
| KB / semantic memory       | `aiwg.kb.page`, `aiwg.memory.entry`, memory log/query-capture records                                                                           |
| Local issues               | `aiwg.issue` export records for cross-domain artifact search; local issue CLI/search remains local unless a later ADR changes that contract      |
| Generated views            | Corpus markdown views, graph projections, Cockpit-visible capability projections, export manifests                                              |

Every record must carry stable identity, source provenance, repo-relative path,
generated-vs-source classification, checksum/input hash, timestamps, privacy and
locality flags, search fields, facets, relationship fields, and optional chunk
and embedding manifests.

## Query Modes To Preserve

The AIWG adapter must preserve all query modes from #1685:

| Mode / surface          | Required behavior                                                                                                                                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aiwg discover` ranking | Exact/near name, trigger phrase, capability/description, title/tag/summary/path/type weighting, stopword-stripped verbose query handling, relaxed fallback, curated facet fusion, type filtering, duplicate alias handling, project-local bundle discovery. |
| `aiwg show` fetch       | Full-path fetch, exact basename/title fallback, `--first`, ambiguity diagnostics, canonical duplicate-agent preference, AIWG_ROOT corpus fallback, JSON mode.                                                                                               |
| Metadata query          | Type/phase/tag/path/date filters, no-text filtered listing, JSON result shape, deterministic ordering.                                                                                                                                                      |
| Fulltext/BM25           | Body search with matched terms where currently exposed.                                                                                                                                                                                                     |
| Semantic/vector         | Optional dependency behavior, semantic query, similar, dedup-report, chunk/body embedding decision from #1551/#1690.                                                                                                                                        |
| Hybrid search           | Explicit lexical+semantic composition with documented scoring tolerances.                                                                                                                                                                                   |
| Graph traversal         | Dependencies, neighbors, in/out/both, edge-type filters, REF shorthand, suffix node resolution, set operations.                                                                                                                                             |
| Research retrieval      | REF/PROF IDs, GRADE and citation fields, source-only mode, synthesis inputs, generated corpus views.                                                                                                                                                        |
| KB traversal            | KB page/entity/concept/synthesis records and `aiwg index neighbors --graph kb` parity.                                                                                                                                                                      |
| Status/doctor           | Missing/stale/malformed graph config, orphan index dir, fresh clone, and opted-in Fortemi state checks.                                                                                                                                                     |

## Research, KB, And Embedding Decisions

- `research-query` remains a skill-level synthesis workflow, but now has an
  executable source-selection wrapper. `aiwg research-query <question>` supports
  `--backend local|fortemi-core`, `--depth quick|thorough`, `--sources-only`,
  `--max-sources`, `--json`, and `--save` so #1690/#1691 can test retrieval
  parity without requiring agent synthesis. The skill still owns the final
  domain-specific synthesis behavior: REF citations, GRADE-aware hedging,
  contradiction handling, and answer prose.
- Corpus markdown views remain generated from AIWG source files and sidecars
  for this migration unless #1691 golden fixtures prove Fortemi projections are
  byte-for-byte compatible. This keeps the current deterministic view renderer
  as the fallback and avoids switching view generation before parity is proven.
- #1551 body-level indexing is split by capability during the preview:
  Fortemi v2 exports now carry source-body chunks for static fulltext/cache
  parity, while vector embeddings remain represented as metadata slots until
  #1690 verifies Fortemi Core embedding ownership. AIWG-specific embedding work
  remains only as an adapter/fallback concern for existing optional
  `aiwg index embed`, `query --semantic`, `similar`, and `dedup-report` flows.
- #1508 remains deferred. Reopen it only when the provider-neutral Fortemi
  Core/storage boundary has a stable contract that can carry index records,
  graph relationships, and storage persistence without conflating the MCP
  storage adapter with the search substrate.

## No-Regression Capability Matrix

| Current surface                                                  | Decision                                                                                             | Implementation issue | Parity gate                                                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------- |
| `aiwg discover` / `aiwg show`                                    | Preserve unchanged at public boundary.                                                               | #1688                | #1691 discovery/show fixtures exact where current behavior is deterministic. |
| `aiwg index build/query/deps/neighbors/stats/list/status/export` | Preserve flags, JSON shapes, graph registry, fallback, and bootstrap behavior.                       | #1689                | #1691 CLI compatibility fixtures.                                            |
| `artifact-lookup`, `build-artifact-index`, `index` skills        | Preserve as wrappers over CLI.                                                                       | #1688/#1689          | Skill discovery and CLI parity tests.                                        |
| Research corpus views/query/graphs                               | Preserve REF/PROF, GRADE/citation, view outputs, and graph analytics.                                | #1690                | Corpus golden fixtures plus research retrieval fixtures.                     |
| KB / semantic-memory                                             | Preserve topology and graph traversal.                                                               | #1690                | KB graph and memory query-capture fixtures.                                  |
| Cockpit Explore                                                  | Preserve because it shells out to `aiwg discover`/`show`; no Cockpit-only ranking.                   | #1688                | Bridge API fixtures for `/api/capabilities` and `/api/show`.                 |
| Fortemi export/storage bridge                                    | v1 compatibility preserved or explicitly deprecated; v2 all-domain export added.                     | #1686/#1687          | v1/v2 schema and deterministic export fixtures.                              |
| Local issue/search                                               | Preserve current local issue behavior; join shared index only after explicit record-domain decision. | #1686/#1689          | Local issue search/index fixtures if included in shared index.               |

## Fortemi-Side Prerequisites

Implementation must verify these Fortemi tracker items and their shipped
contracts before AIWG depends on them:

- Fortemi/fortemi-react#213 — extensible AIWG record types.
- Fortemi/fortemi-react#214 — AIWG discovery-ranking mode.
- Fortemi/fortemi-react#215 — relationship traversal and graph queries.
- Fortemi/fortemi-react#216 — static-index semantic/hybrid search contract.
- Fortemi/fortemi-react#217 — bridge tool surface for semantic/hybrid search.

The Fortemi issues were readable on 2026-07-02 and showed closed tracker state.
Closed state is not enough for AIWG adoption; #1686-#1691 must validate the
actual package/API behavior against AIWG fixtures.

`@fortemi/core@2026.7.1` was verified from npm on 2026-07-03. It publishes the
`@fortemi/core/aiwg-index` subpath with direct
`aiwg.fortemi.index.export.v2` validation, v2 record validation, static query,
chunked index helpers, relationship traversal, static semantic/hybrid helpers,
SKOS metadata fields, and provenance-event fields. Its relationship helpers now
accept AIWG v2 relationship fields such as `target_path`, `direction`,
`privacy`, `confidence`, and `metadata`, so the Fortemi v2 export-contract gate
is satisfied for the current static export contract.

AIWG still ships a tested v2-to-v1 compatibility projection for older v1
consumers. The projection preserves AIWG domain record types, stable IDs,
facets, tags, concepts, provenance, privacy classification, and upstream/related
relationships while stripping v2-only fields (`search`, `chunks`, `embeddings`,
SKOS metadata, provenance events, source origin/checksum, privacy locality, and
downstream reverse edges). This is a legacy compatibility bridge, not the
primary package boundary.

Package-boundary evidence for `@fortemi/core@2026.7.1` is optional and separate
from required CI until maintainers explicitly approve it. The proposed
package-boundary workflow must remain label-gated, use the documented one-off
`--min-release-age=0` override only for this freshly released package, disable
lifecycle scripts with `--ignore-scripts`, avoid dependency manifest mutation,
require `AIWG_FORTEMI_CORE_PACKAGE_REQUIRED=1`, and restore the locked
dependency set with `npm ci` after local smoke validation.

## Migration Plan

1. **#1685 — inventory**: maintain the current-surface inventory as the parity
   ledger.
2. **#1684 — this ADR**: lock ownership, compatibility, fallback, release gates,
   #1551 positioning, and #1508 positioning.
3. **#1686 — all-domain export v2**: define and emit v2 records for every
   required domain while keeping v1 compatibility or an explicit deprecation
   plan.
4. **#1687 — Fortemi Core sync/ingest**: add the opt-in materialization path
   and status/doctor integration. Keep `.aiwg/.index` as fallback and keep the
   Fortemi MCP storage adapter separate.
5. **#1688 — discover/show parity**: route discovery/fetch through Fortemi Core
   only behind an adapter and fixtures.
6. **#1689 — index CLI parity**: preserve the `aiwg index` command surface on a
   Fortemi backend.
7. **#1690 — research and KB migration**: migrate research retrieval, corpus
   graph/view projections, KB traversal, and semantic-memory query capture.
   Decide #1551 and #1508 here.
8. **#1691 — no-regression fixtures**: compare current local backend and
   Fortemi Core backend across the same fixtures. This blocks the default
   switch.
9. **Default switch issue**: file and complete only after #1691 is green. It
   must include migration notes, release notes, fallback docs, and rollback
   procedure.

## Fallback Behavior

Fallback is part of the public contract:

| Failure / environment                 | Required behavior                                                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fortemi Core package not installed    | Required package-contract tests fail; releases must include `@fortemi/core`.                                                                                                  |
| Optional local semantic dependencies absent | Fortemi static semantic/hybrid modes keep working. Legacy local embedding commands fail with actionable install/config guidance.                                      |
| Fresh clone with no `.aiwg/.index`    | `aiwg index build --all` remains the bootstrap path; `aiwg discover` can auto-ensure the framework graph where current behavior does.                                          |
| Fortemi cache missing/stale/corrupt   | Default artifact search commands fail with repair commands. Operators can pass `--backend local` during the deprecation window.                                                |
| Schema mismatch                       | Refuse Fortemi-backed execution for affected commands, report expected/actual schema versions, and point to `aiwg index sync` or `--backend local`.                            |
| Browser/static index absent           | Cockpit/Fortemi React surfaces show actionable missing-index state and do not silently query stale or partial data.                                                            |
| Live Fortemi unavailable              | Required CI and default local commands must not require a live Fortemi service. Optional live tests skip cleanly without credentials.                                          |

## Release Gates

Fortemi Core defaulting is allowed because the package and parity gates passed.
Removing the legacy local backend is not allowed until all deprecation gates
pass:

- #1685 inventory and this ADR are committed.
- #1686 v2 schema/export fixtures pass and v1 compatibility is proven or
  explicitly deprecated.
- #1687 sync/ingest tests pass without live Fortemi infrastructure.
- #1688/#1689/#1690 parity tests pass for their public surfaces.
- #1691 parity suite is green in CI.
- Any optional package-boundary workflow for `@fortemi/core@2026.7.1` is
  explicitly human-approved before installation, remains separate from required
  CI, and follows the documented release-age override safeguards.
- `npm run build:cli`, `npm test`, `aiwg index build --all`,
  `aiwg index status --json`, and `aiwg doctor` pass on the migration branch.
- Public command behavior changes must preserve `--backend local` through the
  deprecation window.
- No hardcoded credentials, direct REST import shortcuts, or required live
  Fortemi dependency in CI.
- `.aiwg/.index` fallback remains shipped and documented for at least one
  release after any default switch.

## Rollback Strategy

Rollback must remain simple and local-first:

1. Keep the current local backend selectable with `--backend local` through the
   deprecation window.
2. Keep `.aiwg/.index` build/read code intact until at least one release after
   the default switch and until rollback docs have been exercised.
3. Add a config flag or backend selector that forces local mode even when
   Fortemi Core is installed.
4. When Fortemi-backed execution fails a schema/cache/dependency gate, prefer
   safe local fallback over partial Fortemi results.
5. Document how to rebuild local state with `aiwg index build --all` and verify
   with `aiwg index status --json` and `aiwg doctor`.

## Security And Trust Notes

Fortemi Core is an internal AIWG/Fortemi dependency, so planning may evaluate
recent internal builds without blocking on the usual external dependency aging
policy. Any published-package release-age override must be explicit, narrow,
human-approved, lifecycle-script disabled, and free of manifest churn. Before
broad release, AIWG must pin compatible package versions, verify published
artifacts through normal release controls, and keep credentials out of
index/export/sync configuration. Sync/import code must not introduce direct REST
credential shortcuts; it must follow existing storage/MCP/config patterns.

## Alternatives Considered

### A. Keep AIWG-owned search/index internals permanently

Rejected. It preserves current behavior but continues duplicated lexical,
semantic, graph, research, KB, and browser export implementations across AIWG
and Fortemi.

### B. Switch directly to Fortemi Core as the default backend

Rejected. The current AIWG behavior surface is larger than the current export
contract. A direct switch would risk regressions in discovery ranking,
ambiguity handling, graph traversal, research retrieval, KB traversal, and
fresh-clone behavior.

### C. Use Fortemi MCP storage as the search substrate

Rejected. The storage adapter is a subsystem persistence backend. It does not
define the all-domain static/PGlite/browser search contract, ranking parity,
relationship traversal, or no-regression fixtures required for this migration.

### D. Limit Fortemi integration to browser export

Rejected. #1664 explicitly scopes the migration to full indexing, discovery,
search, research-query, and KB traversal convergence, not only Fortemi React
browser consumption.

## Consequences

### Positive

- One shared substrate for AIWG/Fortemi indexing and query semantics.
- Clear separation between AIWG public UX and Fortemi reusable primitives.
- Browser/static, PGlite/local-first, and CLI paths converge on the same record
  contract.
- #1551 and #1508 get concrete decision points instead of continuing as
  parallel Fortemi-related slices.

### Negative

- AIWG must carry compatibility shims during migration.
- The v2 export/schema becomes a load-bearing cross-repo contract.
- Parity fixtures are required before visible progress on the default switch.
- Fortemi package/API versioning becomes part of AIWG release management.

### Risks

| Risk                             | Mitigation                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Discovery ranking drift          | #1688 and #1691 compare current and Fortemi-backed results; exact cases stay exact.                                     |
| Graph semantics drift            | #1686 relationship schema plus #1691 graph fixtures cover deps, neighbors, citation, KB, and set operations.            |
| Semantic search dependency creep | Keep live/package semantic integration optional in required CI; exercise static-cache semantic/hybrid fixtures locally. |
| Browser/static index divergence  | v2 schema fixtures and deterministic export ordering.                                                                   |
| Loss of rollback path            | Keep `.aiwg/.index` fallback and local backend selector through at least one post-switch release.                       |
| Credential leakage               | Reject credentials in config/export paths and reuse existing storage/MCP credential patterns.                           |

## References

- #1664 — planning parent.
- #1685 — current-surface inventory:
  `.aiwg/planning/fortemi-core-index-migration/current-surface-inventory.md`.
- #1686, #1687, #1688, #1689, #1690, #1691 — implementation and parity
  children.
- #1551 — body-level embedding option, held for #1690 decision.
- #1508 — deferred Fortemi corpus import, held until storage/index boundary is
  settled.
- #1578 — `aiwg.fortemi.index.export.v1`.
- Fortemi/fortemi-react#213-#217 — Fortemi-side prerequisite contracts.
- `.aiwg/architecture/adr-index-builder-unification.md`.
- `.aiwg/architecture/adr-index-config-consolidation.md`.
- `.aiwg/architecture/decisions/ADR-021-semantic-memory-kernel.md`.
- `.aiwg/architecture/adr-configurable-storage-backends.md`.
