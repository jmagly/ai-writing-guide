---
namespace: aiwg
platforms: [all]
name: profile-communities
description: Detect co-author communities (label propagation), report modularity Q, and identify bridge authors (high betweenness). Runs via `aiwg corpus profile-communities`.
commandHint:
  argumentHint: "[--out PATH]"
  allowedTools: Read, Bash
  model: haiku
  category: research-analytics
  modelRole: efficiency
  modelTier: economy
---

# Profile Communities

Community structure of the corpus co-author graph.

## How to run

```bash
aiwg corpus profile-communities
aiwg corpus profile-communities --out indices/communities.md
```

Uses **label propagation** (deterministic variant — no `python-louvain`
dependency; the graceful fallback the corpus tooling specifies), reports
**modularity Q** (warns when Q < 0.3 = weak structure on a sparse graph), and
lists **bridge authors** (highest betweenness, spanning communities).

## Triggers

- "detect research communities"
- "co-author clusters / modularity"
- "bridge authors"
- `/profile-communities`

## References

- @$AIWG_ROOT/src/artifacts/corpus-tools/profile-communities.ts — implementation
- profile-metrics / profile-temporal skills
