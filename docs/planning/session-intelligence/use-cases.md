# Session Intelligence Use Cases

## Actors

- Operator: authorizes sources and manages the catalog.
- Automation consumer: uses stable JSON output.
- Security/privacy reviewer: sets indexing and retention policy.
- Adapter maintainer: maintains provider evidence and compatibility.
- Intelligence reviewer: validates extracted candidates.
- Memory curator: approves durable promotion or revocation.

## UC-SI-001: Assess Provider Capabilities

**Primary actor:** Operator

**Goal:** Determine safe, available session operations for a canonical provider.

### Main Flow

1. The operator runs `aiwg sessions sources` or `doctor`.
2. AIWG validates the provider ID against the canonical registry.
3. AIWG returns capability classification, operational state, evidence date,
   tested versions, supported operations, reason code, and remediation.

### Acceptance

- All 12 canonical IDs return a disposition.
- Unsupported is distinct from supported with zero sessions.
- Aliases do not create duplicate providers.

## UC-SI-002: Discover Authorized Sources

**Primary actor:** Operator

**Goal:** Locate session sources without ambient collection.

### Main Flow

1. The operator selects a provider and authorized root or account scope.
2. AIWG canonicalizes and validates the scope.
3. The provider adapter discovers candidates without reading content outside the
   selected scope.
4. AIWG reports candidate source identity, format, version, and accessibility.

### Exceptions

- Traversal, symlink escape, special file, disallowed root, or implicit network
  access fails before content is read.

## UC-SI-003: Import or Update Sessions

**Primary actor:** Operator

**Goal:** Build or update a normalized catalog without duplicates.

### Main Flow

1. AIWG probes source/provider/schema versions.
2. The adapter streams bounded records from a provider-supported source.
3. AIWG classifies and redacts content.
4. Normalized evidence is written transactionally with a checkpoint.
5. AIWG returns inserted, updated, unchanged, opaque, skipped, and failed counts.

### Acceptance

- Unchanged replay creates zero new sessions or events.
- Interrupted import resumes or rolls back to a consistent checkpoint.
- Unknown major schemas create no partial normalized records.

## UC-SI-004: Search Across Providers

**Primary actor:** Operator or automation consumer

**Goal:** Find decisions, errors, artifacts, and unresolved work.

### Main Flow

1. The actor submits text and optional provider/workspace/date/model/role/tool/
   tag/entity/sensitivity/extraction-state filters.
2. AIWG applies authorization and metadata scope before ranking.
3. AIWG returns deterministic paginated hits with inspectable event citations.

### Acceptance

- Every hit identifies provider, normalized session/event, native identity when
  available, import run, and source locator class.
- Semantic retrieval cannot escape the lexical/metadata authorization scope.

## UC-SI-005: Inspect Evidence and Provenance

**Primary actor:** Intelligence reviewer

**Goal:** Validate a normalized event or derived interpretation.

### Main Flow

1. The reviewer selects a session, event, or search hit.
2. AIWG displays normalized evidence, lifecycle/consistency, and provenance.
3. When authorized, the reviewer can inspect namespaced native fields or the
   bounded raw reference.

### Acceptance

- Unknown timestamps, workspace associations, and lifecycle states remain
  `unknown`; they are not inferred from weak heuristics.
- Relocation and reindexing preserve stable evidence identity.

## UC-SI-006: Extract and Review Intelligence

**Primary actor:** Intelligence reviewer

**Goal:** Produce trustworthy candidates without changing durable memory.

### Main Flow

1. The reviewer selects sessions, a query result, or a time/provider scope.
2. AIWG performs structural extraction and optional model-assisted extraction
   under the approved policy.
3. AIWG validates schema, citations, sensitivity, confidence, conflicts, and
   supersession.
4. Candidates enter the pending review queue.
5. The reviewer accepts, rejects, defers, or supersedes candidates.

### Acceptance

- Every candidate has at least one resolvable source citation.
- Transcript instructions remain data and cannot invoke tools.
- Rejected or low-confidence candidates are never promoted implicitly.

## UC-SI-007: Promote Approved Memory

**Primary actor:** Memory curator

**Goal:** Promote an accepted candidate into a named memory or KB consumer.

### Main Flow

1. The curator previews destination and resulting changes.
2. AIWG validates candidate version, review state, destination, and conflicts.
3. The curator explicitly confirms promotion.
4. AIWG writes through the existing memory topology and stores a receipt.

### Acceptance

- Promotion is idempotent for the same candidate version and destination.
- The receipt preserves source-to-candidate-to-memory provenance.

## UC-SI-008: Delete or Forget Imported Information

**Primary actor:** Operator

**Goal:** Remove AIWG-owned copies and understand surviving dependents.

### Main Flow

1. The operator requests tombstone or purge preview.
2. AIWG reports affected normalized events, indexes, embeddings, candidates,
   snapshots, and promoted dependents.
3. The operator confirms the exact scope.
4. AIWG performs idempotent cleanup and returns a content-free receipt.

### Acceptance

- Provider-owned source logs are never modified.
- Search returns no purged content after completion.
- Promoted memory is reported and handled by a separate explicit decision.

## UC-SI-009: Handle Degraded or Unsupported Providers

**Primary actor:** Operator or automation consumer

**Goal:** Distinguish unavailable capabilities from empty history.

### Main Flow

1. AIWG probes capability and operational state.
2. Degraded providers expose only verified operations.
3. Unsupported operations fail with stable reason codes and remediation before
   source reads or AIWG-state mutation.

### Acceptance

- Every canonical provider has automated conformance for either implemented,
  degraded, manual-only, or unsupported behavior.
