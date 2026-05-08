---
namespace: aiwg
platforms: [all]
name: corpus-index-build
description: Build graph indices (by-topic, by-year, authors, citation-network) from corpus state using definitions in .aiwg/config.yaml. Replaces a manual 3-agent dispatch.
commandHint:
  argumentHint: "[--graph <name>] [--all] [--force] [--format full|summary|json]"
  allowedTools: Read, Write, Glob, Grep, Bash
  model: sonnet
  category: research-indexing
---

# Corpus Index Build

Build research graph indices from corpus state. Reads graph definitions from `.aiwg/config.yaml` and generates by-topic, by-year, authors, and citation-network indices from the current findings and citation data.

> **Scope: research corpora, not SDLC artifacts.** This skill renders the human-readable markdown indices declared under `.aiwg/config.yaml` `graphs:` (output paths like `indices/by-topic.md`) from corpus frontmatter. The CLI command `aiwg index build` is a separate feature operated by the `index` skill in `aiwg-utils` — it builds the SDLC artifact graph at `.aiwg/.index/*` (JSON nodes/edges/checksums) and does **not** render the markdown indices listed in `index.graphs.indices.manifest`. If `aiwg index build` did not produce your `indices/*.md`, that is expected — invoke `corpus-index-build` instead.

## Triggers

- "build the research indices"
- "rebuild corpus graphs"
- "update the topic index"
- "index build"
- `/corpus-index-build`

## Parameters

### `--graph <name>` (optional)
Build a single named graph. Must match a key in `config.yaml` `graphs` section.

### `--all` (optional)
Build all graphs defined in config, including those not in `defaultBuild`. Default behavior builds only `defaultBuild` graphs.

### `--force` (optional)
Rebuild from scratch, ignoring cached state. Default: incremental (only rebuild if source data changed).

### `--format` (optional)
Output format: `full` (default), `summary`, or `json`.

## Configuration

Graphs are defined in `.aiwg/config.yaml`:

```yaml
graphs:
  by-topic:
    type: cluster
    source: findings
    groupBy: tags
    output: indices/by-topic.md
    defaultBuild: true

  by-year:
    type: timeline
    source: findings
    groupBy: year
    output: indices/by-year.md
    defaultBuild: true

  authors:
    type: entity
    source: findings
    groupBy: authors
    output: indices/authors.md
    defaultBuild: true

  citation-network:
    type: graph
    source: citations
    edges: [outgoing, incoming]
    output: indices/citation-network.md
    defaultBuild: false  # expensive, build on demand

  by-methodology:
    type: cluster
    source: findings
    groupBy: methodology
    output: indices/by-methodology.md
    defaultBuild: false
```

## Execution Flow

### Phase 1: Load Configuration

1. Read `.aiwg/config.yaml` graph definitions
2. Determine which graphs to build:
   - No flags: build all `defaultBuild: true` graphs
   - `--graph <name>`: build only the named graph
   - `--all`: build every defined graph
3. Check for staleness (skip up-to-date graphs unless `--force`)

### Phase 2: Collect Source Data

For each graph, collect the required data:

**Cluster graphs** (by-topic, by-methodology):
- Scan all `findings/REF-*.md` frontmatter
- Extract the `groupBy` field values (tags, methodology)
- Build `Map<group, Set<REF-XXX>>`

**Timeline graphs** (by-year):
- Extract `year` from each finding's frontmatter
- Build `Map<year, Set<REF-XXX>>` sorted chronologically

**Entity graphs** (authors):
- Extract `authors` field from each finding
- Normalize author names (Last, First → canonical form)
- Build `Map<author, Set<REF-XXX>>`

**Citation graphs** (citation-network):
- Read outgoing and incoming citation data (from citation-backfill output)
- Build adjacency list: `Map<REF-XXX, {outgoing: Set, incoming: Set}>`
- Compute: degree distribution, hubs, isolated nodes

### Phase 3: Generate Index Files

For each graph, write the index markdown to the configured `output` path:

**Cluster index format** (by-topic example):
```markdown
# By Topic Index

Generated: 2026-04-13T12:00:00Z
Sources: 372 findings

## agentic-workflows (47 papers)

| REF | Title | Year | GRADE |
|-----|-------|------|-------|
| REF-001 | Multi-Agent Orchestration | 2024 | High |
| REF-016 | AutoGen Framework | 2023 | High |
...

## multi-agent-systems (31 papers)
...
```

**Citation network format**:
```markdown
# Citation Network

Nodes: 372 | Edges: 1,247 | Density: 0.009
Avg degree: 6.7 | Max hub: REF-016 (34 edges)

## Top 10 Hubs
| REF | Title | In | Out | Total |
...

## Isolated Nodes (0 edges)
| REF | Title | Reason |
...
```

### Phase 4: Report

```
Corpus Index Build
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Graphs built: 3 / 3
  by-topic:          47 groups, 372 papers  → indices/by-topic.md
  by-year:           8 years, 372 papers    → indices/by-year.md
  authors:           412 authors, 372 papers → indices/authors.md

Skipped (not in defaultBuild):
  citation-network:  use --graph citation-network to build
  by-methodology:    use --graph by-methodology to build
```

## Staleness Detection

Each index file stores a `Generated:` timestamp and a source checksum. On incremental builds:
1. Compute checksum of all source frontmatter
2. Compare against stored checksum in the index file
3. Skip if identical (report "up to date")
4. Rebuild if different

## Integration Points

| Component | Relationship |
|-----------|-------------|
| `citation-backfill` | Must run before citation-network graph build |
| `research-gap-detect` | Consumes citation-network graph for cluster analysis (#815) |
| `corpus-snapshot` | Reads index metrics for snapshot reports (#814) |
| `aiwg index build` | The existing CLI command — this skill extends it for research-specific graphs |
| `research-status` | Reports index staleness as a health metric |

## Examples

```bash
# Build default graphs (by-topic, by-year, authors)
/corpus-index-build

# Build a specific graph
/corpus-index-build --graph citation-network

# Build everything including optional graphs
/corpus-index-build --all

# Force full rebuild
/corpus-index-build --force

# JSON output for programmatic use
/corpus-index-build --format json
```

## References

- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/citation-backfill/SKILL.md — Prerequisite for citation-network graph
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-gap-detect/SKILL.md — Consumes citation-network
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/corpus-snapshot/SKILL.md — Reads index metrics
- @$AIWG_ROOT/src/artifacts/cli.ts — Existing `aiwg index build` infrastructure
