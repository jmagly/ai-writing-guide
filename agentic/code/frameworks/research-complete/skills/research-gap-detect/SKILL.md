---
namespace: aiwg
platforms: [all]
name: research-gap-detect
description: Build the mutual citation graph, find connected components, identify isolated clusters, and optionally search for bridge candidates and file gap issues.
commandHint:
  argumentHint: "[--clusters-only] [--file-issues] [--search-bridges] [--format full|summary|json]"
  allowedTools: Read, Write, Glob, Grep, Bash, Agent, WebSearch
  model: sonnet
  category: research-analysis
---

# Research Gap Detect

Analyze the research corpus citation graph to find disconnected clusters, isolated papers, and gap opportunities. Optionally searches for bridge paper candidates and files gap issues.

## Triggers

- "find research gaps"
- "detect clusters"
- "cluster analysis"
- "find isolated papers"
- "bridge candidate search"
- `/research-gap-detect`

## Parameters

### `--clusters-only` (optional)
Only run cluster detection — skip bridge search and issue filing.

### `--file-issues` (optional)
Auto-file gap issues for each disconnected cluster pair.

### `--search-bridges` (optional)
Search external databases for papers that could bridge disconnected clusters.

### `--min-cluster-size N` (optional)
Minimum papers in a cluster to report. Default: 2.

### `--format` (optional)
Output format: `full` (default), `summary`, or `json`.

## Execution Flow

### Phase 1: Build Citation Graph

1. Read the citation-network index (from `/corpus-index-build --graph citation-network`)
   - If stale or missing: run `/corpus-index-build --graph citation-network` first
2. Build an adjacency list from outgoing + incoming edges
3. Treat as undirected for cluster detection (A cites B ≡ A connected to B)

### Phase 2: Connected Components (BFS)

Run BFS/connected-components on the undirected citation graph:

1. Initialize: all nodes unvisited
2. For each unvisited node: BFS to find its connected component
3. Collect components sorted by size (largest first)

**Output**:
```
Connected Components: 9

Cluster 1: "Agentic Workflows" (124 papers)
  Hub: REF-016 (34 connections)
  Topics: agentic-workflows, multi-agent, orchestration
  Sample: REF-001, REF-016, REF-024, REF-121 ...

Cluster 2: "GUI Agents" (31 papers)
  Hub: REF-198 (12 connections)
  Topics: gui-agents, web-agents, screen-understanding
  Sample: REF-198, REF-201, REF-215 ...

...

Cluster 9: "Isolated" (3 papers)
  No hub (all degree 1)
  REF-299, REF-312, REF-350
```

### Phase 3: Gap Analysis

For each pair of clusters, assess the gap:

1. **Topic overlap** — do the clusters share any tags?
2. **Temporal overlap** — do they cover the same years?
3. **Author overlap** — do any authors appear in both clusters?
4. **Bridgeability** — could a single paper connect them?

Prioritize gaps by:
- **Size product** — larger clusters disconnected = higher priority
- **Topic proximity** — clusters with related but not identical topics
- **Recency** — newer clusters may simply be missing recent cross-citations

**Output**:
```
Gap Analysis: 12 cluster pairs

Priority 1: "Agentic Workflows" ↔ "GUI Agents"
  Gap: 124 × 31 = 3,844 (size product)
  Topic overlap: agent, llm (2 shared tags)
  Bridge opportunity: HIGH
  Suggested search: "LLM agent GUI interaction orchestration"

Priority 2: "Evaluation" ↔ "Reproducibility"
  Gap: 45 × 28 = 1,260
  Topic overlap: evaluation, benchmark (2 shared tags)
  Bridge opportunity: MEDIUM
  Suggested search: "reproducible LLM evaluation benchmarks"
...
```

### Phase 4: Bridge Search (if --search-bridges)

For each high-priority gap:

1. Generate search queries from cluster topic overlap
2. Search external databases (Semantic Scholar, arXiv, Google Scholar)
3. Filter candidates by:
   - Cites papers from BOTH clusters
   - Published in overlapping time range
   - High citation count (likely to be connecting work)
4. Rank candidates by bridge potential

**Output**:
```
Bridge Candidates Found: 8

For gap "Agentic Workflows" ↔ "GUI Agents":
  1. "WebAgent: World-Centric Web Navigation" (2024)
     Cites: REF-016 (Cluster 1), REF-198 (Cluster 2)
     Citations: 87
     Bridge potential: HIGH

  2. "Agent-E: Vision-Language Planning for Web Tasks" (2024)
     Cites: REF-024 (Cluster 1), REF-201 (Cluster 2)
     Citations: 45
     Bridge potential: MEDIUM
```

### Phase 5: File Issues (if --file-issues)

For each gap with bridge candidates, file a research induction issue:

```markdown
## Research Gap: [Cluster A] ↔ [Cluster B]

**Gap Size**: [N × M papers disconnected]
**Bridge Candidates**: [list]
**Suggested Action**: Induct [top candidate] to connect clusters

### Bridge Papers to Induct
- [ ] "WebAgent: World-Centric Web Navigation" — arxiv:2401.XXXXX
- [ ] "Agent-E: Vision-Language Planning" — arxiv:2403.XXXXX
```

### Phase 6: Report

```
Research Gap Detection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Graph: 372 nodes, 1,247 edges
Connected components: 9
Largest cluster: 124 papers ("Agentic Workflows")
Isolated papers: 3

Gap analysis: 12 cluster pairs
  HIGH priority: 4 (bridge candidates available)
  MEDIUM priority: 5
  LOW priority: 3

Bridge candidates found: 8 papers
Issues filed: 4
Papers recommended for induction: 8
```

## Distinction from research-gap

| Tool | Approach | Output |
|------|----------|--------|
| `research-gap` | **Intellectual** — topic coverage, missing areas, GRADE gaps | Gap report with search queries |
| `research-gap-detect` | **Structural** — citation graph topology, disconnected components | Cluster map, bridge candidates, filed issues |

`research-gap` answers "what topics are we missing?" while `research-gap-detect` answers "which existing papers don't cite each other but should?"

## Examples

```bash
# Full analysis with bridge search
/research-gap-detect --search-bridges

# Just show clusters
/research-gap-detect --clusters-only

# Detect and auto-file issues
/research-gap-detect --file-issues

# Combined: search + file
/research-gap-detect --search-bridges --file-issues

# JSON for visualization
/research-gap-detect --format json
```

## References

- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/corpus-index-build/SKILL.md — Builds the citation-network graph
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/citation-backfill/SKILL.md — Prerequisite: complete bidirectional edges
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-gap/SKILL.md — Complementary intellectual gap analysis
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/induct-research/SKILL.md — Inducts bridge candidates
