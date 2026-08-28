---
title: Graph Backends
description: Operator guide for the artifact index graph backend system — tiers, configuration, and module graph declarations.
---

# Graph Backends

The AIWG artifact index stores dependency and relationship data as a directed graph. The **graph backend** controls how that graph is represented and queried. AIWG ships with a zero-dependency JSON default; optional backends unlock richer queries and larger-scale performance at the cost of additional npm packages.

## The Three Tiers

| Tier | Backend | Sweet spot | Extra deps |
|------|---------|-----------|------------|
| **Default** | `json` | Zero-dependency local graphs | none |
| **Optional** | `graphology` | Rich in-process graph operations | `graphology` ecosystem |
| **Optional** | `sqlite` | Persistent same-host graph storage | `better-sqlite3` (native) |

A fourth, orthogonal capability — **semantic embeddings** — can be added to any tier for similarity search.

All three tiers produce the same `dependencies.json` compatibility output. The
resolved backend is visible in `aiwg index status` and `aiwg index stats`.

---

## Default: JSON Backend

No configuration needed. The JSON backend is always active unless overridden.

Backend selection is deterministic: a graph's `graphBackend` overrides the
project-level `index.graphBackend`; when neither is present, AIWG uses `json`.
SQLite graphs persist at `.aiwg/.index/<graph>/graph.db` (shared graphs use
their existing shared index directory). Selecting an unavailable optional
backend fails with an installation diagnostic and does not silently use JSON.

**Capabilities:**
- Typed edges (`{ path, type }` via `EdgeRef`)
- BFS/DFS traversal up to configurable depth
- Set operations (intersection, difference, union) via JavaScript `Set`
- Shell composition for complex queries via `aiwg index neighbors --json`

**Limitations:**
- Graph rebuilt in memory on every `aiwg index` invocation
- Set operations use JavaScript `Set` membership and are O(n+m) for two input
  lists
- No cross-graph SQL joins (compose with shell `comm` instead)

---

## Optional: Graphology Backend

Best for teams that need traversal algorithms (shortest path, community detection) or want in-process graph operators without SQL.

### Install

```bash
npm install graphology graphology-operators graphology-traversal
# Optional extras:
npm install graphology-shortest-path graphology-communities
```

### Activate

```json
{
  "index": { "graphBackend": "graphology" }
}
```

Or per-graph:

```json
{
  "index": {
    "graphs": {
      "citation-network": {
        "scanDirs": ["documentation/citations"],
        "graphBackend": "graphology"
      }
    }
  }
}
```

### Staged Build Order

Multi-graph builds and syncs run in deterministic order. This lets lightweight
corpus graphs come online before heavier full-content, source, or embedding
work backfills.

```yaml
index:
  graphs:
    references:
      scanDirs: [documentation/references]
      buildTier: lightweight
      buildOrder: 10
    citation-network:
      scanDirs: [documentation/citations]
      buildTier: lightweight
      buildOrder: 20
    bibliography:
      scanDirs: [documentation/bibliography]
      buildTier: lightweight
      buildOrder: 30
    papers:
      scanDirs: [pdfs/full]
      buildTier: heavy
```

`aiwg index build`, `aiwg index build --all`, and `aiwg index sync --all` use
that order. When `buildOrder` is absent, AIWG infers common corpus names so
refs/references build first, citations/citation-network second, bibliography
third, summaries before standard graphs, and full/source/papers later.

### What you get

- **Typed edge attributes** native to graphology's data model
- **BFS/DFS** via `graphology-traversal` with visitor callbacks
- **Shortest citation path** via `graphology-shortest-path`
- **Community/cluster detection** via `graphology-communities` (Louvain algorithm)
  - "Which citation cluster does REF-008 belong to?"
  - "What are the densely connected sub-networks in this corpus?"
- **Graph-level operators** via `graphology-operators` (`union`, `intersection`, `disjointUnion`)

### Example: citation chain

```typescript
import { bidirectional } from 'graphology-shortest-path/unweighted';

const path = bidirectional(graph, 'REF-001', 'REF-234');
// → ['REF-001', 'REF-008', 'REF-047', 'REF-234']
```

---

## Optional: SQLite Backend

Use SQLite when a graph must persist on the same host. A reproducible
reference-host observation is published below, but it is not a universal
support envelope.

### Install

```bash
npm install better-sqlite3
```

**Platform note:** Prebuilt binaries ship for Linux x64/arm64 and macOS. Alpine (musl) or non-standard Node versions require `npm rebuild better-sqlite3`.

### Activate

```json
{
  "index": { "graphBackend": "sqlite" }
}
```

### SQL inspection

```sql
-- Papers that cited both REF-008 and REF-016
SELECT source FROM edges WHERE target = 'REF-008' AND edge_type = 'cites'
INTERSECT
SELECT source FROM edges WHERE target = 'REF-016' AND edge_type = 'cites';

-- Papers that cited REF-008 but not REF-001
SELECT source FROM edges WHERE target = 'REF-008' AND edge_type = 'cites'
EXCEPT
SELECT source FROM edges WHERE target = 'REF-001' AND edge_type = 'cites';
```

The SQLite backend executes union, intersection, and difference with native
`UNION`, `INTERSECT`, and `EXCEPT`, returning identity-sorted results.

### Cross-graph federation

Cross-database `ATTACH` is explicitly out of scope. AIWG does not expose it
because attached-file authorization, lifecycle, and consistent-snapshot
semantics are not defined. Use the existing multi-graph query surface and
combine its deterministic identity results instead.

### Incremental updates

Rebuild reconciliation runs in one transaction, upserts desired nodes and
typed edges, and removes stale rows. Node `type`, `phase`, `title`, `summary`,
and `checksum` are queryable columns while the complete attribute object is
retained for compatibility.

### WAL, concurrency, and recovery policy

On-disk graphs require verified WAL mode, `synchronous=NORMAL` by default, a
5-second busy timeout, and a 1,000-frame automatic checkpoint. `SQLITE_BUSY`
and `SQLITE_LOCKED` exhaustion is surfaced as `AIWG_SQLITE_BUSY`; it is not
reported as an empty result. `walMetrics()` exposes busy, log-frame, and
checkpointed-frame counts, and callers can request bounded passive, restart,
or truncate checkpoints. Backup uses SQLite's online backup API.

WAL is a same-host feature: it supports concurrent readers and one writer and
must not be placed on a network filesystem. AIWG rejects SQLite releases
affected by the upstream WAL-reset corruption defect, accepting the official
patched lines 3.44.6, 3.50.7, and 3.51.3 or later (excluding withdrawn 3.52).
See the [SQLite WAL documentation](https://www.sqlite.org/wal.html#walreset).

The backend uses schema `user_version=1`; migrations run transactionally and
an unknown newer schema fails closed.

Run the reproducible local benchmark with `npm run benchmark:index:sqlite`.
Its JSON reports binding/engine versions, corpus shape, exact correctness and
source digests, database/WAL size, CPU/RSS, throughput, latency percentiles,
and event-loop delay.

<!-- aiwg-storage-benchmark-claim:sqlite-local-reference-v1:start -->
A 2026-08-28 reference-host qualification on linux x64, Node 24.12.0, better-sqlite3 12.8.0, and SQLite 3.51.3 produced:

| Nodes / edges | Write throughput | Query + traversal pairs | Write latency p50/p95/p99 | Query latency p50/p95/p99 | Event-loop delay p95 | DB / peak WAL bytes |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10,000 / 9,999 | 4,011 ops/s | 506 pairs/s | 254.77 / 378.22 / 378.22 ms | 1.2 / 1.97 / 2.74 ms | 378.27 ms | 2,379,776 / 4,157,112 |

Evidence: [sqlite-local-reference-v1](../storage/evidence/sqlite-local-reference-v1.json). The release gate rejects this claim when its correctness digest, source digest, freshness window, or rendered values no longer match.
<!-- aiwg-storage-benchmark-claim:sqlite-local-reference-v1:end -->

This is a qualification point, not a universal capacity limit. The high p95
delay reflects synchronous native calls and is part of the selection decision:
keep latency-sensitive event loops isolated from bulk SQLite graph builds.
Operators must run the benchmark on their own hardware and workload before
declaring a support envelope; #2191 owns the comparative release gate.

Run the common local correctness gate with:

```bash
npm run test:conformance:storage
```

The versioned `aiwg.storage-backend-golden/v1` corpus checks declared topology,
Unicode and null attributes, typed directional traversal, set parity,
incremental updates, deletion/reload, and exact counts across JSON, Graphology,
and SQLite. It does not certify remote PostgreSQL, MySQL, or Fortemi services.

### Combining backends

Graphology and SQLite are complementary. A common pattern for research corpora:

```yaml
index:
  graphs:
    citation-network:
      graphBackend: sqlite       # fast SQL set ops and persistence
    summaries:
      graphBackend: graphology   # community detection across summary docs
```

---

## Optional: Semantic Embedding Index

Orthogonal to the graph backend — the embedding index adds a dense vector layer for similarity search. It coexists with any backend tier.

### Install

```bash
npm install @xenova/transformers hnswlib-node
```

`@xenova/transformers` is pure JavaScript (ONNX runtime, no native code). `hnswlib-node` ships prebuilt binaries.

### Activate

```yaml
index:
  embedding:
    enabled: true
    model: Xenova/all-MiniLM-L6-v2
    # model: Xenova/all-mpnet-base-v2
    topK: 10
```

### Model is downloaded once

Models are cached to `~/.cache/aiwg/models/` on first use. Subsequent builds use the cached ONNX weights.

### What you get

```bash
# Semantic similarity search
aiwg index query "dense retrieval for question answering" \
  --semantic --graph citation-network
# Returns corpus papers ranked by semantic similarity to the query

# Body-level embedding for finer semantic dedup granularity (#1551)
aiwg index embed --graph citation-network --embed-body
aiwg index dedup-report --graph citation-network --threshold 0.85
# The embedding manifest records granularity: title-summary or body

# Semantic neighbors of a specific node
aiwg index neighbors --node REF-008 --semantic --top-k 5
# Returns 5 papers most similar to REF-008's abstract
```

Body granularity reads each node's source file, strips YAML frontmatter, embeds
bounded overlapping body chunks with the configured transformer model, and stores
one normalized mean vector per node. If the source body is missing, oversized, or
binary-like, AIWG falls back to the node's title and summary text.

### Corpus size guidance

Incremental rebuilds only re-embed nodes whose content checksum changed.
No embedding support envelope is published without a source-bound benchmark
record; measure the selected model and hardware before choosing a corpus tier.

---

## Backend Comparison

| Feature | JSON | Graphology | SQLite |
|---------|:----:|:----------:|:------:|
| Typed edges | ✓ | ✓ | ✓ |
| Bounded traversal | ✓ | ✓ | ✓ (recursive CTE) |
| Set intersection/difference | ✓ (JS) | ✓ (JS) | ✓ (native SQL) |
| Cross-graph joins | shell `comm` | manual merge | — |
| Shortest path | — | ✓ | — |
| Community detection | — | ✓ (Louvain) | — |
| Persistent (survives rebuild) | — | — | ✓ |
| Incremental row-level updates | — | — | ✓ (transactional reconcile) |
| Zero native deps | ✓ | ✓ | — |
| Measured support envelope | not published | not published | not published |

---

## Module Graph Declarations

Frameworks and addons can declare their own graph configurations in `manifest.json`. This means operators who install `aiwg use research` automatically get `papers`, `citation-network`, and `summaries` graphs — no manual `.aiwg/aiwg.config` changes needed.

### How it works

Each framework manifest may include an `index.graphs` section:

```json
{
  "id": "research-complete",
  "index": {
    "graphs": {
      "citation-network": {
        "scanDirs": ["documentation/citations"],
        "extensions": [".md"],
        "edgeExtraction": {
          "parser": "citation-sidecar",
          "edges": [
            { "type": "cites",    "source": "frontmatter.ref", "target": "outgoing-table.inducted-ref" },
            { "type": "cited-by", "source": "frontmatter.ref", "target": "incoming-table.inducted-ref" }
          ]
        },
        "defaultBuild": true
      },
      "papers": {
        "scanDirs": ["pdfs/full"],
        "extensions": [".pdf"],
        "nodeStrategy": "filename-metadata",
        "filenamePattern": "REF-(?<ref>\\d{3})-(?<author>[^-]+)-(?<year>\\d{4})-(?<slug>.+)\\.pdf",
        "defaultBuild": true
      }
    }
  }
}
```

### Operator override

Operator `.aiwg/aiwg.config` always takes precedence over framework-declared graphs:

```yaml
index:
  graphs:
    citation-network:
      scanDirs: [my/custom/citations]  # overrides research-complete default
      graphBackend: sqlite              # use SQLite for this graph specifically
```

### Pattern

This follows the same model as `memory.creates` in addons — a module declares its structural contract; AIWG materializes it at install time. Any framework or addon can define graphs relevant to its domain:

| Module | Graphs declared |
|--------|----------------|
| `research-complete` | `papers`, `citation-network`, `summaries` |
| `media-curator` | `recordings`, `releases` |
| `sdlc-complete` | `project` (already built-in) |
| Custom addon | anything in `manifest.json` |

---

## Typed Edges

All backends support typed edges via the `EdgeRef` schema:

```typescript
type EdgeRef = { path: string; type?: string };
// type defaults to 'depends-on' when absent (backward compatible)
```

Edge types in the research domain: `cites`, `cited-by`, `summarizes`, `discusses`.
Edge types in SDLC: `depends-on` (default), `implements`, `tests`, `supersedes`.

Filter by type in any CLI command:

```bash
aiwg index neighbors --node REF-008 --direction in --edge-type cites
aiwg index deps .aiwg/requirements/UC-001.md --edge-type implements
```

---

## Related Issues

| Issue | Description |
|-------|-------------|
| #724 | Typed edges — `EdgeRef` schema change (prerequisite for all graph features) |
| #722 | Citation sidecar edge extraction (uses `cites`/`cited-by` typed edges) |
| #723 | PDF node scanning (`nodeStrategy: filename-metadata`) |
| #725 | Cross-graph set queries (CLI surface; benefits from SQLite backend) |
| #726 | Module graph declarations in manifest.json |
| #727 | `GraphBackend` interface (enables swappable backends) |
| #728 | Graphology backend implementation |
| #729 | SQLite backend implementation |
| #730 | Semantic embedding index |
