---
namespace: aiwg
platforms: [all]
name: profile-metrics
description: Compute corpus-local influence/centrality metrics — per-paper CD-index + PageRank, and per-PROF-P h-index / mean-CD / mean-PageRank / betweenness / eigenvector + influence grade. Runs via `aiwg corpus profile-metrics`.
commandHint:
  argumentHint: "[--papers] [--out PATH]"
  allowedTools: Read, Bash
  model: haiku
  category: research-analytics
  modelRole: efficiency
  modelTier: economy
---

# Profile Metrics

Corpus-local bibliometric + social-network metrics over the co-author and
citation graphs (NetworkX-equivalent, no graph library).

## How to run

```bash
aiwg corpus profile-metrics                 # per-PROF-P table to stdout
aiwg corpus profile-metrics --papers        # per-paper CD-index + PageRank
aiwg corpus profile-metrics --out indices/metrics.md
```

Per person (PROF-P): **h-index** (Hirsch), **mean CD-index** (Wu-Wang-Evans
disruption), **mean PageRank**, **betweenness** + **eigenvector** centrality on
the co-author graph, and an **influence grade** (h≥3→A, ≥2→B, ≥1→C, else D).
Per paper (`--papers`): CD-index + PageRank.

> CD-index is null for papers with < 3 in-corpus citers (low confidence). The
> node2vec embedding metrics are an opt-in add-on (needs-infrastructure), not
> computed here.

## Triggers

- "compute influence metrics"
- "h-index / PageRank / disruption for the corpus"
- `/profile-metrics`

## References

- @$AIWG_ROOT/src/artifacts/corpus-tools/profile-metrics.ts · corpus-graph.ts — implementation
- profile-temporal / profile-communities skills
