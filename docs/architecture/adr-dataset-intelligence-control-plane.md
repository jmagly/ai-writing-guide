# ADR: Dataset intelligence control plane and Fortemi execution plane

## Status

Accepted — 2026-09-02

## Context

AIWG supports custom graphs, semantic-memory ingestion, traceability, W3C PROV,
schema governance, and Fortemi-backed query. These capabilities previously did
not share dataset identity, processing plans, run/checkpoint identity, artifact
classification, or evidence contracts. A backend-specific identifier or search
index must not become the authority for a user's dataset.

## Decision

AIWG owns provider-neutral declarations, authorization and policy bindings,
schema governance, immutable processing plans, canonical run receipts, and
compatibility projections. Execution implementations, including Fortemi Core,
negotiate capabilities and return contract-bound observations and receipts.

Logical dataset identity is stable across revisions. A `DatasetRevision` is an
immutable identity bound to manifest and optional content digests. Canonical
sources, derived artifacts, regenerable indexes, caches, distributions, and
portable exports are distinct artifact classes. Physical backend record IDs are
never canonical AIWG dataset identities.

A processing plan is an immutable, canonically serialized declaration whose
digest excludes only the `planDigest` field itself. A processing run is a
separately identified observation of an attempt to execute that plan. Timestamps
are diagnostic metadata; checkpoint and committed-receipt ancestry establishes
processing order.

Required capabilities fail closed. Optional capabilities may be disabled or
use a declared fallback, and that degradation must be machine-readable.
Unsupported contract majors never receive best-effort interpretation.

Declared/design lineage and observed execution lineage remain distinct.
Relationships are directional and retain evidence location, method, confidence,
privacy, source revision, and run identity. W3C PROV and OpenLineage are
versioned projections of these contracts rather than mandatory internal storage
formats.

## Evolution rules

- The JSON Schema `$id` and `aiwg.dataset/v1` major are stable public identities.
- Additive compatible changes require fixtures and schema/runtime parity tests.
- A semantic change that invalidates a previously valid record requires a new
  major, migration evidence, and a cataloged compatibility relationship.
- Generated types, runtime validation, fixtures, and documentation are governed
  projections of the cataloged serialized contract.
- Inferred schemas and execution claims remain candidates until reviewed; local
  tests cannot imply live Fortemi Server certification.

## Consequences

AIWG gains portable identity and policy control without coupling to one
execution backend. Implementations incur explicit negotiation, receipt,
projection, and migration obligations. Existing index, memory, research, and
provenance shapes remain available only through named compatibility projections.

The canonical run ledger is the authority for execution and lineage history.
Search indexes, dependency graphs, W3C PROV views, research records, marketplace
graphs, Fortemi exports, operational state, mentions, and SDLC trace links are
materialized projections rather than competing stores of record. Every adapter
returns an explicit loss receipt, and correction or retraction is represented by
a new immutable ledger event. Privacy classification and retention obligations
travel with evidence and assertions through every governed projection.
