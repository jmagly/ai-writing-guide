---
title: Graph Backends
description: Operator guide for the artifact index graph backend system — tiers, configuration, and module graph declarations.
---

# Graph Backends

The AIWG artifact index stores dependency and relationship data as a directed graph. The **graph backend** controls how that graph is represented and queried. AIWG ships with a zero-dependency JSON default; optional backends unlock richer queries and larger-scale performance at the cost of additional npm packages.

## The Three Tiers

| Tier | Backend | Sweet spot | Extra deps |
|------|---------|-----------|------------|
| **Default** | `json` | All projects, <5k nodes | none |
| **Optional** | `graphology` | Rich traversal, community detection, <50k nodes | `graphology` + ecosystem (~50KB) |
| **Optional** | `sqlite` | Large corpora, SQL set ops, persistence | `better-sqlite3` (~200KB native) |

A fourth, orthogonal capability — **semantic embeddings** — can be added to any tier for similarity search.

All three tiers produce the same `dependencies.json` output format and support the same `aiwg index` CLI surface. The backend is an implementation detail.

---

## Default: JSON Backend

No configuration needed. The JSON backend is always active unless overridden.

**Capabilities:**
- Typed edges (`{ path, type }` via `EdgeRef`)
- BFS/DFS traversal up to configurable depth
- Set operations (intersection, difference, union) via JavaScript `Set`
- Shell composition for complex queries via `aiwg index neighbors --json`

**Limitations:**
- Graph rebuilt in memory on every `aiwg index` invocation
- Set operations on large neighbor lists are O(n×m)
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

```yaml
# .aiwg/config.yaml
index:
  graphBackend: graphology
```

Or per-graph:

```yaml
index:
  graphs:
    citation-network:
      graphBackend: graphology
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

Best for large corpora (5k+ nodes), teams running repeated cross-graph citation queries, or workflows where the graph must persist between runs without a full rebuild.

### Install

```bash
npm install better-sqlite3
```

**Platform note:** Prebuilt binaries ship for Linux x64/arm64 and macOS. Alpine (musl) or non-standard Node versions require `npm rebuild better-sqlite3`.

### Activate

```yaml
# .aiwg/config.yaml
index:
  graphBackend: sqlite
```

### Set operations (native SQL)

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

These run via `aiwg index query --set-query` or are composed by the `aiwg index neighbors` command when the SQLite backend is active.

### Cross-graph federation

```sql
ATTACH DATABASE '.aiwg/.index/summaries/graph.db' AS summaries;
ATTACH DATABASE '.aiwg/.index/citation-network/graph.db' AS cn;

SELECT s.id, s.title
FROM summaries.nodes s
JOIN cn.edges e ON e.source = s.id
WHERE e.target = 'REF-008' AND e.edge_type = 'cites';
```

### Incremental updates

The SQLite backend writes at the row level — only changed nodes and edges are updated. For large corpora where most files are unchanged between builds, this significantly reduces rebuild time.

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
    model: Xenova/all-MiniLM-L6-v2   # ~22MB, ~5ms/embedding on CPU
    # model: Xenova/all-mpnet-base-v2  # ~110MB, higher quality
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

| Corpus | Model | One-time build | Query |
|--------|-------|---------------|-------|
| 234 nodes | all-MiniLM-L6-v2 | ~12s | <5ms |
| 1,000 nodes | all-MiniLM-L6-v2 | ~50s | <5ms |
| 5,000 nodes | all-MiniLM-L6-v2 | ~4 min | <5ms |

Incremental rebuilds only re-embed nodes whose content checksum changed.

---

## Backend Comparison

| Feature | JSON | Graphology | SQLite |
|---------|:----:|:----------:|:------:|
| Typed edges | ✓ | ✓ | ✓ |
| BFS/DFS traversal | ✓ | ✓ (library) | ✓ (recursive CTE) |
| Set intersection/difference | ✓ (JS) | ✓ (JS/operators) | ✓ (native SQL) |
| Cross-graph joins | shell `comm` | manual merge | SQL `ATTACH` |
| Shortest path | — | ✓ | — |
| Community detection | — | ✓ (Louvain) | — |
| Persistent (survives rebuild) | — | — | ✓ |
| Incremental row-level updates | — | — | ✓ |
| Zero native deps | ✓ | ✓ | — |
| Corpus sweet spot | <5k | <50k | 5k–500k |

---

## Module Graph Declarations

Frameworks and addons can declare their own graph configurations in `manifest.json`. This means operators who install `aiwg use research` automatically get `papers`, `citation-network`, and `summaries` graphs — no manual `.aiwg/config.yaml` changes needed.

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

Operator `.aiwg/config.yaml` always takes precedence over framework-declared graphs:

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
