---
namespace: aiwg
platforms: [all]
name: profile-graph
description: Entity-profile graph edges + embedding similarity for a research corpus — profile→REF edges (first-class adjacency, reconciled against the citation graph) and text-embedding researcher similarity + collaboration link-prediction. Completes the #1501 graph-analytics family (centrality / communities / temporal already shipped). Runs via `aiwg corpus profile-edges` / `aiwg corpus profile-similar`.
commandHint:
  argumentHint: "profile-edges  |  profile-similar --entity PROF-P-x [--top K] | --predict-collabs [--threshold T]"
  allowedTools: Read, Bash
  model: sonnet
  category: research-analytics
---

# Profile Graph: Edges & Similarity

The graph-integration + embedding pieces of the entity-profile analytics family
(centrality, communities, and temporal trajectories ship in `profile-metrics`,
`profile-communities`, `profile-temporal`).

## profile→REF edges (no extra deps)

```bash
aiwg corpus profile-edges
aiwg corpus profile-edges --out reports/profile-edges.txt
```

Builds the **profile→REF edge graph** from each PROF-{P,O,G,F,S}'s `corpus-refs`,
as first-class adjacency (`byProfile` + reverse `byRef`), reconciled against the
citation graph — edges to REFs with no analysis doc are reported as **dangling**,
not kept. Surfaces top profiles by linked-REF count and top REFs by linked-profile
count (cross-cutting influence). Preferred over the section9 synthetic
`documentation/profiles/edges/` files.

## Researcher similarity + collaboration prediction (opt-in embeddings)

```bash
# Nearest researchers to a profile
aiwg corpus profile-similar --entity PROF-P-gonzalez-joseph --top 10

# Collaboration link-prediction: similar people who have NOT co-authored
aiwg corpus profile-similar --predict-collabs --threshold 0.85
```

Embeds each **person** profile from its name + the titles of its corpus-refs
(text-embedding via the #1493 backend — opt-in `@xenova/transformers`), then:

- **`--entity`** ranks the nearest researchers by cosine similarity.
- **`--predict-collabs`** surfaces high-similarity pairs that share **no**
  corpus-refs (corpus-refs overlap is the co-authorship proxy) — candidate
  future collaborators. Lower `--threshold` to surface more (people who already
  collaborate are correctly excluded, so a high threshold can legitimately
  return zero).

This is the #1501 "embeddings" slot, implemented via text embeddings rather than
a heavy node2vec/graph-embedding stack (operator decision) — one embedding
backend across the codebase, composing with `aiwg index --semantic` (#1493).
Without the optional dep it prints an install hint and exits.

## Triggers

- "profile to REF edges" / "profile edge graph"
- "similar researchers" / "researcher similarity"
- "predict collaborations" / "collaboration link prediction"

## Notes

- TS-native: `src/artifacts/corpus-tools/profile-edges.ts` (port of
  `build_profile_edges.py`) + `profile-embed.ts` (the `graph_embeddings.py`
  slot via text embeddings).
- node2vec/structural graph embeddings remain a possible future enhancement; the
  text-embedding approach here covers the researcher-similarity + link-prediction
  use cases without the heavy ML stack.
