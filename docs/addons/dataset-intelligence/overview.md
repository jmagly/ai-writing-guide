# Dataset Intelligence

Dataset Intelligence gives every AIWG domain the same governed path from “use
this data” to a verified, explainable result. You can start with only a path or
URI and a desired outcome. The Dataset Steward recommends a source assessment,
schema posture, capabilities, privacy and network defaults, and an approval path
without asking you to understand indexing terminology.

## Common Use Cases

- Decide whether a local file set, database export, or URI collection is ready for ingestion.
- Preview privacy, locality, writes, and network effects before data processing starts.
- Plan full-text, vector, hybrid, or graph-backed retrieval for a domain workflow.
- Verify lineage, digests, and freshness before using a derived dataset result.

## One control plane, composable outcomes

The workflow independently composes full-text, vector, hybrid, and reranked
search; traceability; evidence-bearing provenance; graph materialization; and
portable export. A recommendation explains why each capability is useful, what
it materializes, and how it changes locality, privacy, network use, and writes.

SDLC, research, knowledge-base, media, marketing, operations, and project-local
bundles all exchange the same `dataset-intake/v1` request and
`dataset-workflow-handoff/v1` phase envelope. Domain-specific additions live in
namespaced extensions instead of forking the core contract.

## Runtime boundary

The addon contains guidance and declarative flows, not an ingestion engine.
Every source check, preview, plan, run, cancellation, verification, lineage
query, export, synchronization, and retirement operation delegates to the
shared `aiwg dataset` service. Stable artifact and receipt references—not chat
history—carry authority between phases.

The orchestration CLI exposes thirteen actions through this shared boundary:
`source`, `check`, `preview`, `plan`, `ingest`, `status`, `show`, `verify`,
`query`, `lineage`, `export`, `cancel`, and `retry`. Check `aiwg dataset
--help` rather than deriving command names from task prose.

Conformance evidence qualifies local orchestration, offline behavior,
provenance, and the PROV/OpenLineage profiles. The pre-stable migration cell is
pending because no stable predecessor exists. Fortemi Core parity is pending a
pinned compatible dependency, and live Fortemi Server persistence is pending
separately authorized live qualification.

Canonical source material remains distinct from derived indexes, embeddings,
graphs, caches, portable projections, and Fortemi shards. A successful search
does not prove canonical availability, freshness, authorization, or provenance.
Backend maturity is reported only from negotiated evidence.

## Safe lifecycle

Checks and previews are bounded and non-mutating. Sensitive samples are
redacted, and configuration stores opaque credential references rather than
values. Plans state estimated reads/writes, artifact classes, degradation, and
network/privacy effects. Sensitive writes require review of an immutable plan.

Runs expose cancellation, checkpoint/resume, rejections, and commit receipts.
Verification checks digests, checkpoints, evidence completeness, and freshness.
Retirement is tombstone-first and requires complete enumeration, threshold
review, and reconciliation evidence.

Continue with the [quickstart](quickstart.md), [task guide](task-guide.md),
[worked examples](worked-examples.md), [migration guide](migration-guide.md),
and [Fortemi boundary](fortemi-boundaries.md).
