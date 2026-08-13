# Experimental Hybrid Corpus Retrieval Lab

`aiwg corpus retrieval-lab` benchmarks hybrid source selection without changing `research-query`. It is a local, research-focused sidecar for narrow implementation questions.

## Run the strategy matrix

Build the project corpus index, prepare reviewed query and concept fixtures, then run:

```bash
aiwg index build --graph project
aiwg corpus retrieval-lab \
  --queries ./retrieval-queries.jsonl \
  --concepts ./concept-scheme.json \
  --json \
  --out .aiwg/reports/retrieval-lab.json
```

The matrix includes:

- the current local `research-query` selector;
- a direct source-text scan equivalent to a narrow `rg` baseline;
- deterministic local feature-hash vectors;
- BM25 over titles, `prefLabel`, `altLabels`, REF metadata, tags, summaries, and source bodies;
- typed `broader`, `narrower`, and `related` graph expansion with personalized PageRank, specificity-weighted restart, and hub suppression; and
- reciprocal-rank fusion (RRF, `k=60`) over vector, BM25, and graph ranks.

The local feature-hash vector is a reproducible prototype seed, not a claim of learned semantic-embedding quality. A later experiment may substitute an opt-in embedding index while retaining the same benchmark contract.

## Query fixture

Use one JSON object per line:

```json
{"schema":"aiwg.corpus-retrieval-query/v1","id":"narrow-question","question":"Which source defines typed graph rank fusion?","expected_ids":["REF-103"],"expected_evidence":["RRF"]}
```

Expected IDs make Hit@1/3/5, MRR, and failure examples reviewable. `expected_evidence` drives a faithfulness probe over the selected source text.

## Concept-scheme fixture

```json
{
  "schema": "aiwg.concept-scheme/v1",
  "id": "project-concepts",
  "concepts": [
    {
      "id": "hybrid-retrieval",
      "prefLabel": "Hybrid retrieval",
      "altLabels": ["multi-signal retrieval"],
      "related": ["rank-fusion"]
    },
    {
      "id": "rank-fusion",
      "prefLabel": "Reciprocal rank fusion",
      "broader": ["hybrid-retrieval"]
    }
  ]
}
```

Document tags map to concept IDs. The report records a canonical SHA-256 scheme hash. Pin it on later runs to invalidate stale results when the scheme drifts:

```bash
aiwg corpus retrieval-lab \
  --queries ./retrieval-queries.jsonl \
  --concepts ./concept-scheme.json \
  --expected-scheme-hash <sha256>
```

## Reading the report

Every strategy reports Hit@1/3/5, MRR, p95 latency, and top-five failure examples. Each hybrid query also reports source-selection confidence, normalized dispersion, graph concepts, lexical evidence terms, and missing expected evidence.

The adoption gate requires hybrid quality to beat both baselines without exceeding the latency ceiling. Even when it clears, the report sets `replaces_current_query` to `false`: replacing `research-query` requires a separate explicit decision. A failed gate reports `HOLD`.

This public utility is local only. It does not provide hosted retrieval, broad corpus reindexing, or an automatic production-query switch.
