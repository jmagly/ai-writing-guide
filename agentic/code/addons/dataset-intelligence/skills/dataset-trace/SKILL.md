---
namespace: aiwg
name: dataset-trace
description: Explain dataset, record, field, index, graph, and export lineage using evidence-bearing bounded queries.
version: 1.0.0
platforms: [all]
aliases: [dataset lineage, provenance explain, trace record]
triggers: [where did this record come from, explain this result, trace this field, show dataset lineage, prove this index source]
---

# Dataset Trace and Explain

Delegate to `aiwg dataset lineage <dataset-or-record-ref> --json`; use
`aiwg dataset show <ref> --json` for referenced contracts. Report stable logical
and revision identities, run and schema bindings, assertion basis, method,
confidence, privacy, and evidence locators. Clearly label gaps and bounded-query
limits.

Do not infer provenance from graph adjacency or search success. Never expose
source values or credentials. Identify indexes, embeddings, graphs, caches, and
Fortemi shards as derived/regenerable and hand questionable evidence to Dataset
Provenance Reviewer.
