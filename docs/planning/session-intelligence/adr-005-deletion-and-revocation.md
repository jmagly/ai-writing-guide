# ADR-005: Separate Tombstone, Purge, and Memory Revocation

Status: Accepted for planning

Date: 2026-07-26

## Context

Provider archives, compaction, provider-side deletion, imported copies,
search projections, extraction candidates, and promoted memory have different
owners and retention semantics.

## Decision

- `delete` defaults to a reversible AIWG catalog tombstone.
- Purge always starts with a preview of affected events, indexes, embeddings,
  candidates, snapshots, and promoted dependents.
- Confirmed purge removes AIWG-owned imported content and derived indexes. It
  never mutates provider-owned source logs.
- Promoted memory is not silently deleted. It is marked `origin_unavailable`
  and requires a separate reviewable revoke, supersede, or retain decision.
- Retain a content-free deletion receipt with opaque IDs, counts, time, actor
  class, policy/reason code, and outcome.

## Consequences

- Operators can distinguish local forgetting from provider deletion claims.
- Surviving promoted memory is explicit.
- Storage backends need impact planning, idempotent cleanup, and terminal
  receipts.
- Stable content hashes and raw paths are excluded from retained purge receipts.
