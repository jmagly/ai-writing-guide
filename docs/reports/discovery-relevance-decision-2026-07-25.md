# Operational Discovery Relevance Decision

**Date:** 2026-07-25

**Issue:** #1819

**Corpus:** `test/fixtures/artifacts/discovery-relevance.jsonl` (`aiwg.discovery-relevance.v1`, 80 queries)

**Decision:** Retain the current lexical discovery fallback. No prototype is approved for adoption.

## Method

The corpus contains ten reviewed queries for each broad operational type:
skill, agent, command, rule, flow, runbook, template, and behavior. It includes
exact names, natural-language capabilities, process language, same-type hard
negatives, and cross-type ambiguity. Every query declares one or more relevant
IDs and an explicit hard negative.

All strategies ran against the same framework corpus and hardware:

- Linux x64, Node 24.12.0
- 12th Gen Intel Core i7-12700H, 20 logical CPUs
- 62.5 GiB RAM (67,089,072,128 bytes)
- local framework index: 5,036,483 bytes
- Fortemi Core static export and sidecars: 88,205,152 bytes

The dense prototype uses deterministic token-space vectors. Hybrid uses
reciprocal-rank fusion over lexical and dense ranks. Rerank reorders the top 50
lexical candidates with dense similarity. Chunk/multi-vector takes the maximum
similarity across the indexed name, title, capability, summary, trigger,
process-term, and path fields. These are evaluation prototypes only: they do
not change the live index representation or discovery fallback.

## Results

| Backend | Strategy | Hit@3 | MRR | p95 ms | Index bytes | Peak RSS bytes |
|---|---|---:|---:|---:|---:|---:|
| local | lexical | 1.0000 | 0.9875 | 92.975 | 5,036,483 | 342,491,136 |
| local | dense | 0.9875 | 0.9365 | 29.509 | 5,036,483 | 121,114,624 |
| local | hybrid-rrf | 0.8750 | 0.7113 | 37.129 | 5,036,483 | 119,238,656 |
| local | rerank | 1.0000 | 1.0000 | 40.459 | 5,036,483 | 121,159,680 |
| local | chunk-multivector | 1.0000 | 1.0000 | 99.162 | 5,036,483 | 122,273,792 |
| fortemi-core | lexical-static | 1.0000 | 0.9688 | 86.521 | 88,205,152 | 1,477,402,624 |
| fortemi-core | dense | 0.9875 | 0.9365 | 24.818 | 88,205,152 | 878,436,352 |
| fortemi-core | hybrid-rrf | 0.8750 | 0.7113 | 38.800 | 88,205,152 | 873,746,432 |
| fortemi-core | rerank | 1.0000 | 1.0000 | 31.888 | 88,205,152 | 876,900,352 |
| fortemi-core | chunk-multivector | 1.0000 | 1.0000 | 73.437 | 88,205,152 | 877,613,056 |

Latency and RSS are host observations, not deterministic test assertions.
Metric calculation, ordering, fixture validation, and JSON field ordering are
covered by deterministic unit tests.

## Parity

Local lexical reaches MRR 0.9875; the Fortemi static scorer reaches 0.96875.
Both have perfect per-type Hit@3. Fortemi/local top-1 agreement is 0.9625 and
mean top-5 overlap is 0.935. The differing top-1 queries are `agent-03`,
`template-01`, and `behavior-03`; the machine-readable report retains these
exact IDs.

The Fortemi artifact set is 17.51× the local index bytes on this host. This is
an observation of the current static export and sidecars, not evidence that a
new Fortemi record or shard representation is needed.

## Adoption gate

| Requirement | Dense | Hybrid RRF | Rerank | Chunk/multi-vector |
|---|---|---|---|---|
| No per-type Hit@3 regression | Fail | Fail | Pass | Pass |
| Aggregate MRR improves | Fail | Fail | +0.0125 | +0.0125 |
| Paired 95% CI excludes zero | N/A | N/A | Fail (`[0, 0.03125]`) | Fail (`[0, 0.03125]`) |
| p95 ≤ 250 ms | Pass | Pass | Pass | Pass |
| Storage ≤ 2× local | Prototype only | Prototype only | Prototype only | Prototype only |
| Production representation proven | No | No | No | No |

Rerank and chunk/multi-vector correct the same two second-place lexical
results, but the improvement is too sparse for the paired bootstrap confidence
interval to exclude zero. Their reported index bytes are inherited from the
existing metadata because the prototypes intentionally do not introduce a
production vector representation. They therefore cannot satisfy the storage
or representation gate.

## Decision and follow-up boundary

Keep lexical discovery as the reliable fallback. Do not add generic hybrid,
reranking, or chunk-level multi-vector storage based on this corpus.

If a later, expanded corpus produces a confidence-bounded improvement, any
Fortemi representation change must be proposed separately. That follow-up must
name its profile, test the published `@fortemi/core` package, and preserve
import/re-export evidence. Source-only round trips or a new unversioned record
shape are insufficient.
