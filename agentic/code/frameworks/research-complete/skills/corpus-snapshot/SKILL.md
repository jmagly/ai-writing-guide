---
namespace: aiwg
platforms: [all]
name: corpus-snapshot
description: Generate a corpus snapshot report — computes dimensions, topology, degree distribution, delta from previous. Helps with cluster, chain, and gap analysis sections.
commandHint:
  argumentHint: "[--compute-only] [--delta-only] [--template <path>] [--format full|summary|json]"
  allowedTools: Read, Write, Glob, Grep, Bash
  model: sonnet
  category: research-reporting
---

# Corpus Snapshot

Generate a point-in-time snapshot of the research corpus with computed metrics and analysis. Reads a snapshot template, fills `[COMPUTE]` sections with data, assists with `[ANALYZE]` sections, and writes the completed report.

## Triggers

- "take a corpus snapshot"
- "generate corpus report"
- "snapshot the research"
- "corpus snapshot"
- `/corpus-snapshot`

## Parameters

### `--compute-only` (optional)
Only compute data sections — skip analysis sections. Faster, fully automated.

### `--delta-only` (optional)
Only compute the delta from the previous snapshot. Useful for tracking session progress.

### `--template <path>` (optional)
Custom template path. Default: `.aiwg/reports/corpus-snapshot-template.md`.

### `--format` (optional)
Output format: `full` (default for the report file), `summary` (terminal), `json` (programmatic).

## Prerequisites

Before generating a snapshot, the following should be current:

| Prerequisite | Command | Gates on |
|-------------|---------|----------|
| Citation edges complete | `/citation-backfill` | Topology metrics |
| Indices up to date | `/corpus-index-build` | Group counts, hub analysis |
| Stub rate < 10% | `/research-quality-audit` | Snapshot validity |

If prerequisites are stale, the snapshot will include warnings.

## Execution Flow

### Phase 1: Collect Raw Metrics

Scan the corpus and compute:

**Dimensions:**
- Total papers (node count)
- Total citation edges (edge count)
- Topics (unique tag count)
- Authors (unique author count)
- Year range (oldest → newest)
- Source types distribution

**Topology (from citation-network index):**
- Graph density: edges / (nodes * (nodes-1))
- Average degree (mean edges per node)
- Max hub (node with most connections)
- Connected components count
- Isolated nodes (degree 0)
- Diameter estimate (longest shortest path in largest component)

**Degree Distribution:**
- Histogram: how many nodes have degree 0, 1-2, 3-5, 6-10, 11-20, 20+
- Power law fit (if applicable)

**Quality Distribution:**
- GRADE breakdown: High / Moderate / Low / Very Low
- Doc depth: Full / Adequate / Stub / Skeleton (from quality-audit)
- Source availability: PDF present / Full text extracted / Missing

### Phase 2: Compute Delta (if previous snapshot exists)

Compare current metrics against the most recent snapshot:

```
Delta from previous snapshot (2026-04-10):
  Papers:     +12 (360 → 372)
  Edges:      +87 (1,160 → 1,247)
  Density:    +0.001 (0.008 → 0.009)
  New topics:  +2 (gui-agents, code-generation)
  Stubs fixed: 23 (88 → 65)
  New hubs:    REF-364 (entered top 10)
```

### Phase 3: Fill Template Sections

Read the snapshot template and fill sections:

**`[COMPUTE]` sections** — fully automated:
- Dimensions table
- Topology metrics
- Degree distribution histogram
- GRADE distribution
- Delta table

**`[ANALYZE]` sections** — agent-assisted:
- **Cluster narrative**: describe the main clusters and their themes
- **Chain analysis**: identify citation chains (A→B→C→D) and their significance
- **Gap narrative**: summarize disconnected areas and bridge opportunities
- **Trend analysis**: what's growing, what's stagnant

### Phase 4: Write Report

Write the completed snapshot to:
```
.aiwg/reports/corpus-snapshot-YYYY-MM-DD.md
```

With frontmatter:
```yaml
---
type: corpus-snapshot
date: 2026-04-13
papers: 372
edges: 1247
density: 0.009
components: 9
stub_rate: 0.17
previous: corpus-snapshot-2026-04-10.md
---
```

### Phase 5: Report Summary

```
Corpus Snapshot Generated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Papers: 372 (+12)  |  Edges: 1,247 (+87)
Density: 0.009     |  Components: 9
Hub: REF-016 (34)  |  Isolated: 3
GRADE: 33% High, 24% Mod, 26% Low, 16% VLow
Stubs: 65 (17%)    |  Full text: 54%

Delta highlights:
  +12 papers inducted
  +87 citation edges (backfill)
  -23 stubs (expanded)
  +2 new topics

Written to: .aiwg/reports/corpus-snapshot-2026-04-13.md
```

## Template Format

The default template uses markers for computed vs analyzed sections:

```markdown
# Corpus Snapshot — [DATE]

## Dimensions
[COMPUTE: dimensions-table]

## Topology
[COMPUTE: topology-metrics]

## Degree Distribution
[COMPUTE: degree-histogram]

## Quality Distribution
[COMPUTE: grade-distribution]
[COMPUTE: depth-distribution]

## Delta
[COMPUTE: delta-from-previous]

## Cluster Analysis
[ANALYZE: describe main clusters, their themes, and notable papers]

## Citation Chains
[ANALYZE: identify significant citation chains and their meaning]

## Gaps and Opportunities
[ANALYZE: summarize disconnected areas and bridge opportunities]

## Recommendations
[ANALYZE: what should be inducted next, what needs expansion]
```

## Integration Points

| Component | Relationship |
|-----------|-------------|
| `corpus-index-build` | Reads index metrics (topology, hubs, components) |
| `research-quality-audit` | Reads depth distribution; gates if stub rate > 10% |
| `citation-backfill` | Must run before snapshot for accurate topology |
| `research-gap-detect` | Cluster data feeds into gap narrative |
| `research-status` | Snapshot is the detailed version of the health score |

## Examples

```bash
# Full snapshot with analysis
/corpus-snapshot

# Just data, no analysis sections
/corpus-snapshot --compute-only

# Delta from previous snapshot only
/corpus-snapshot --delta-only

# Custom template
/corpus-snapshot --template .aiwg/reports/custom-template.md

# JSON metrics for dashboards
/corpus-snapshot --format json
```

## References

- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/corpus-index-build/SKILL.md — Index metrics source
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-quality-audit/SKILL.md — Depth distribution source
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/citation-backfill/SKILL.md — Prerequisite for topology
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-gap-detect/SKILL.md — Cluster data for narrative
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-status/SKILL.md — Health scoring complement
