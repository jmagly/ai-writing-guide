---
namespace: aiwg
name: dataset-capability-recommend
description: Recommend an independently composable dataset capability profile with plain-language rationale and safe defaults.
version: 1.0.0
platforms: [all]
aliases: [indexing recommendation, dataset profile, retrieval plan]
triggers: [how should I index this, make it searchable with provenance, add traceability, choose vector or graph, recommend dataset capabilities]
---

# Dataset Capability Recommendation

Consume intake and assessment references. Recommend only capabilities supported
by current negotiation evidence. Compose full-text/vector/hybrid/rerank indexing,
traceability, provenance, graph, and export independently; never force a preset.

For each selection state rationale, assumptions, materialized artifact and its
class, privacy/network/write implications, required versus optional status, and
explicit fallback. Required absence fails closed. Use
`aiwg dataset plan <source> --capability <list> --json` to create the candidate
plan and hand its immutable reference to `dataset-plan-review`.
