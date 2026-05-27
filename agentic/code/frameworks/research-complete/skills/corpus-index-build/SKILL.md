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

## Primary Execution Path

Use the co-located reference implementation before writing any ad hoc parser:

```bash
python "$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/corpus-index-build/build.py" --corpus-root . [--graph <name>|--all] [--force] [--format full|summary|json]
```

If `$AIWG_ROOT` is not set, use the absolute path returned by `aiwg show skill corpus-index-build`. The script reads the target corpus's `.aiwg/config.yaml` `index.graphs.indices.manifest`, parses mixed-format `documentation/references/REF-*.md` files and `documentation/citations/REF-*-citations.md` sidecars, writes configured `indices/*.md`, and reports built/skipped graphs.

## Triggers

- "build the research indices"
- "rebuild corpus graphs"
- "update the topic index"
- "index build"
- `/corpus-index-build`

## Parameters

### `--graph <name>` (optional)
Build a single named graph. The name must match a manifest entry `name` under `index.graphs.indices.manifest` in `.aiwg/config.yaml` (or one of the built-in renderer names listed under [Configuration](#configuration)).

### `--all` (optional)
Build every configured graph. This is also the default when no `--graph` is given — `build.py` renders all configured manifest graphs. (`--all` is accepted for symmetry with `aiwg index build`; `build.py` itself does not filter by a `defaultBuild` flag — that flag is advisory metadata consumed by the separate `aiwg index build` command.)

### `--force` (optional)
Rebuild from scratch, ignoring cached state. Default: incremental (only rebuild if source data changed).

### `--format` (optional)
Output format: `full` (default), `summary`, or `json`.

## Configuration

When generating or editing a research corpus index config — canonically `.aiwg/aiwg.config` (JSON) as of #1491 — keep the two index paths distinct:

```yaml
# Build JSON node graphs (citation network, profiles, etc.):
#   aiwg index build
#   aiwg index build --graph <name>
#
# Render markdown indices (by-topic.md, by-year.md, authors.md, ...):
#   These are NOT rendered by `aiwg index build`.
#   Use this skill instead:
#     aiwg discover "build research indices"
#     aiwg show skill corpus-index-build
```

Markdown graphs are defined under `index.graphs.indices.manifest`. As of #1491 the canonical home is **`.aiwg/aiwg.config`** (JSON, validated against `aiwg.config.v1.json`); the legacy **`.aiwg/config.yaml`** (YAML) still works as a deprecated fallback. `build.py` reads `aiwg.config` first and falls back to `config.yaml`. Either way `configured_graphs()` reads each manifest entry's **`name`** (which selects the renderer) and optional **`output`** (defaults to `indices/<name>.md`); other keys (`description`, `source`, …) are human-facing metadata it ignores.

The following `.aiwg/aiwg.config` block round-trips through `build.py` unmodified:

```json
{
  "index": {
    "graphs": {
      "indices": {
        "manifest": [
          { "name": "by-topic",         "output": "indices/by-topic.md", "description": "Papers grouped by detected topic" },
          { "name": "by-year",          "output": "indices/by-year.md" },
          { "name": "authors",          "output": "indices/authors.md" },
          { "name": "citation-network", "output": "indices/citation-network.md" }
        ]
      }
    }
  }
}
```

<details><summary>Legacy <code>.aiwg/config.yaml</code> equivalent (deprecated — migrate the index block into aiwg.config)</summary>

```yaml
index:
  graphs:
    indices:
      manifest:
        - name: by-topic
          output: indices/by-topic.md
        - name: by-year
          output: indices/by-year.md
        - name: authors
          output: indices/authors.md
        - name: citation-network
          output: indices/citation-network.md
```

</details>

> **The entry `name` selects the renderer — there is no `type` key.** A manifest
> entry `name: by-topic` invokes the topic renderer; `name: by-year` the timeline
> renderer, and so on. Supported renderer names: `by-topic`, `by-year`, `authors`,
> `by-venue`, `by-method`, `by-model-size`, `training-pipeline`, `citation-network`,
> `by-author`, `by-org`, `by-bridge`, `unprofiled-hubs`. An unrecognized `name`
> is reported as `unsupported` (non-zero exit), not silently skipped.

**Fallback behavior** (`configured_graphs()`):
- If `index.graphs.indices.manifest` is absent or empty, `build.py` builds a default
  set: `by-topic`, `by-year`, `authors`, `by-venue`, `by-method`, `training-pipeline`,
  `by-model-size`.
- If `index.graphs.citation-network` is present as a key, `citation-network` is added
  to the build set automatically.

The canonical schema is the `configured_graphs()` reader in this skill's `build.py`.
A formally validated `index.graphs` schema (and consolidation of the two index config
shapes) is tracked in [#1491](https://git.integrolabs.net/roctinam/aiwg/issues/1491);
the reconciliation of `build.py` with the `aiwg index build` builder is [#1490](https://git.integrolabs.net/roctinam/aiwg/issues/1490).

## Execution Flow

### Phase 1: Load Configuration

1. Run `build.py` from the skill directory with `--corpus-root` pointing at the research corpus
2. Read `.aiwg/config.yaml` graph definitions
3. Determine which graphs to build:
   - No flags: build all `defaultBuild: true` graphs
   - `--graph <name>`: build only the named graph
   - `--all`: build every defined graph
4. Check for staleness (skip up-to-date graphs unless `--force`)

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
| `aiwg index build` | Separate AIWG artifact-index command; builds JSON graph artifacts under `.aiwg/.index/*` and does not render `indices/*.md` |
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
