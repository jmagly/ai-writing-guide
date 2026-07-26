# ADR-001: Keep Session Intelligence in AIWG Behind Storage Ports

Status: Accepted for planning

Date: 2026-07-26

## Context

AIWG needs provider-specific source integration and a local operational catalog.
Fortemi supplies mature knowledge-storage, search, provenance, and portability
capabilities, but it is optional and does not own provider semantics.

## Decision

AIWG defines the session domain and application services behind
`SessionRepository`, `SessionSearch`, and `MemoryPromotionGateway` ports.
SQLite/FTS5 is the reference backend. Fortemi is an optional backend and
portability target.

Knowledge Shards are an export/backup boundary, not the incremental import API.

## Consequences

- AIWG works offline without Fortemi.
- Provider churn remains isolated to AIWG adapters.
- Fortemi integration can reuse generic capabilities without absorbing session
  parsing or memory policy.
- The local backend ships independently of Fortemi issue delivery.

## Rejected Alternatives

- AIWG-only end to end: duplicates generic hybrid search, portability, and
  storage lifecycle work.
- Fortemi-owned acquisition through promotion: makes optional infrastructure
  mandatory and puts provider/memory policy in the wrong domain.
