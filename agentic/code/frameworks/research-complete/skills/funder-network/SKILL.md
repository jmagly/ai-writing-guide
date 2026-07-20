---
namespace: aiwg
platforms: [all]
name: funder-network
description: Build the bipartite funder↔paper analytics — per-funder paper/A-grade/mean-grade rollup, mean CD-index + novelty bias, and co-funding clusters. Runs via `aiwg corpus funder-network`.
commandHint:
  argumentHint: "[--scan-acks] [--out PATH]"
  allowedTools: Read, Bash
  model: haiku
  category: research-analytics
  modelRole: efficiency
  modelTier: economy
---

# Funder Network

Per-funder analytics over the funder↔paper bipartite graph (funder linkage comes
from each REF's `funders[]`). Complements the `by-funder` view (#1492).

## How to run

```bash
aiwg corpus funder-network                       # funder table + co-funded papers to stdout
aiwg corpus funder-network --out indices/funder-network.md
aiwg corpus funder-network --scan-acks           # also scan REF acknowledgement text (uses funder-aliases.yaml)
```

Per funder (PROF-F / PROF-O): paper count, A-grade count, mean grade, **mean
CD-index** + **novelty bias** (vs the corpus novelty baseline — below/at/above),
reusing the #1501 CD-index. Plus **co-funding clusters** (papers with ≥2 funders).

- Funder linkage is read from citation-sidecar `funders[]` (both `{id, grant-id}`
  and bare-string forms). No funder list is hardcoded.
- `--scan-acks` reads a corpus-local `documentation/profiles/funder-aliases.yaml`
  (raw-name → PROF-F/PROF-O id; absent → no aliasing) and scans REF acknowledgement
  sections — the externalized alias path.
- Funder profiles use the shared **entity-profile** template (`type: funder`).

## Triggers

- "funder analytics / funder network"
- "which funders back disruptive work?"
- "co-funded papers"
- `/funder-network`

## References

- @$AIWG_ROOT/src/artifacts/corpus-tools/funder-network.ts — implementation
- @$AIWG_ROOT/src/artifacts/corpus-tools/corpus-graph.ts — CD-index reused here
