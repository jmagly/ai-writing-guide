# Session Intelligence Planning Corpus

Status: research and planning complete

Parent: [AIWG #1898](https://git.integrolabs.net/roctinam/aiwg/issues/1898)

Evidence date: 2026-07-26

This corpus defines the implementation program for cross-provider session-log
discovery, import, search, intelligence extraction, and review-gated memory
promotion.

## Documents

- [Research synthesis](research-synthesis.md)
- [Provider capability matrix](provider-capability-matrix.md)
- [Architecture](architecture.md)
- [ADR-001: AIWG/Fortemi ownership boundary](adr-001-aiwg-fortemi-boundary.md)
- [ADR-002: Immutable evidence-event normalization](adr-002-evidence-event-normalization.md)
- [ADR-003: Policy-approved indexing](adr-003-policy-approved-indexing.md)
- [ADR-004: Review-gated memory candidates](adr-004-review-gated-memory.md)
- [ADR-005: Tombstone, purge, and revocation](adr-005-deletion-and-revocation.md)
- [Use cases](use-cases.md)
- [Supplementary requirements](supplementary-requirements.md)
- [Threat model and risk register](threat-model.md)
- [Test strategy](test-strategy.md)
- [Traceability and issue plan](traceability-and-issue-plan.md)

## Decision Summary

AIWG owns provider-specific acquisition, canonical session/event contracts, the
local operational repository, extraction candidates, review, and memory
promotion. SQLite/FTS5 is the reference local backend. Fortemi is optional and
owns generic external-source upsert, hybrid retrieval, portability, and purge
primitives where configured.

Provider support is evidence-based and surface-specific. Unsupported or
manual-only behavior is a valid, testable outcome and is never represented as
an empty successful discovery.
