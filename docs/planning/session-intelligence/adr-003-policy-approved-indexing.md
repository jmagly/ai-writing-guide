# ADR-003: Index Only Policy-Approved Normalized Text

Status: Accepted for planning

Date: 2026-07-26

## Context

Transcripts routinely contain source code, command output, credentials, personal
data, hostile prompt instructions, and provider-only metadata. Indexing raw
content can multiply exposure through snippets, embeddings, exports, and model
calls.

## Decision

Classification, secret/PII scanning, and redaction run before lexical indexing,
embeddings, extraction, or transfer to an optional backend. Raw snapshot
retention is separately opt-in.

Search hits return session/event identity, sequence, span or chunk, source
locator class, adapter version, and import run. A score and snippet alone are
not sufficient evidence.

Semantic/hybrid retrieval is optional. Lexical and metadata search remain
available without a model or network dependency.

## Consequences

- Search projections can be rebuilt from approved normalized evidence.
- Raw and searchable stores have separate retention policies.
- Redaction changes require controlled reindexing.
- Semantic ranking cannot expand the authorized candidate set.
