# Session Intelligence Architecture

## Context

Session intelligence must work locally without a service, preserve provider
evidence, scale beyond body-at-a-time scans, and prevent transcript content from
becoming executable instructions.

## Logical View

```text
explicitly authorized provider sources
              |
              v
    SessionSourceAdapter registry
              |
       bounded raw records
              |
              v
 normalization + classification + redaction
              |
              v
       SessionRepository port
        |                  |
        v                  v
 SQLite + FTS5       optional Fortemi
        \                  /
         evidence-bearing search
                  |
                  v
       intelligence candidates
                  |
          explicit review
                  |
                  v
       AIWG memory/KB consumers
```

## Ownership

AIWG owns:

- Provider source discovery, probes, and adapters.
- `session_source`, `import_run`, `session`, and `session_event` contracts.
- Allowed-root and bounded-reader policy.
- SQLite repository and lexical search reference implementation.
- Candidate extraction, citation validation, review, conflict, and supersession.
- Memory destination routing, promotion receipts, and revocation decisions.

Fortemi optionally owns:

- Generic source-addressed note upsert.
- Typed metadata predicates and evidence locators across retrieval modes.
- Hybrid retrieval, Knowledge Shard portability, and storage-internal purge.

## Ports

```ts
interface SessionSourceAdapter {
  discover(scope: AuthorizedScope): AsyncIterable<SourceDescriptor>;
  inspect(source: SelectedSource): Promise<SourceProbe>;
  stream(
    source: SelectedSource,
    cursor?: ImportCursor,
  ): AsyncIterable<ProviderRecord>;
}

interface SessionRepository {
  applyImport(
    batch: NormalizedImportBatch,
    checkpoint: ImportCheckpoint,
  ): Promise<ImportReceipt>;
  getSession(id: string): Promise<SessionAggregate | null>;
  tombstone(scope: LifecycleScope): Promise<LifecycleReceipt>;
  planPurge(scope: LifecycleScope): Promise<PurgePlan>;
  purge(planId: string, confirmation: string): Promise<DeletionReceipt>;
}

interface SessionSearch {
  search(
    query: string,
    filters: SessionFilters,
    mode: "lexical" | "hybrid",
  ): Promise<EvidenceHit[]>;
}

interface CandidateService {
  extract(scope: ExtractionScope, policy: ExtractionPolicy): Promise<CandidateSet>;
  review(candidateVersion: string, decision: ReviewDecision): Promise<ReviewReceipt>;
  promote(candidateVersion: string, destination: string): Promise<PromotionReceipt>;
}
```

## Data Model

- `session_source`: provider, selected source identity, allowed-root class,
  redacted locator, probe result, adapter/version, cursor, and status.
- `import_run`: source snapshot, adapter/policy versions, counts, checkpoint,
  consistency, and failure/drift state.
- `session`: normalized and native identities, workspace associations, time,
  models, lifecycle dimensions, and source digest.
- `session_event`: ordered identity, kind, role, time, redacted searchable text,
  digest, raw reference, and `native.<provider>` extension.
- `provenance_edge`: acquisition, normalization, derivation, promotion,
  supersession, and invalidation relationships.
- `intelligence_candidate`: typed assertion, evidence citations, confidence,
  sensitivity, conflict, version, and review state.
- `promotion_receipt`: reviewer, exact candidate version, destination, and
  before/after hashes.
- `deletion_receipt`: content-free operation outcome and affected counts.

## Identity and Consistency

- `source_id` identifies provider profile plus canonical selected source.
- `session_id` derives from provider, source, and native session identity.
- `event_id` uses a stable native ID when available; otherwise it derives from
  the source/session, byte or sequence locator, event kind, and canonical
  payload digest.
- Identical `(source_id, native identity, digest)` replay is a no-op.
- Active logs are provisional snapshots. A complete file is not inferred merely
  because it currently has no writer.
- Unknown major schemas fail closed. Unknown event kinds are preserved as opaque
  records and reported without discarding the entire known session.

## CLI Boundary

`aiwg session` remains the launcher. The management namespace is plural:

```text
aiwg sessions sources
aiwg sessions import
aiwg sessions list
aiwg sessions show
aiwg sessions search
aiwg sessions tag
aiwg sessions extract
aiwg sessions candidates
aiwg sessions promote
aiwg sessions delete
aiwg sessions doctor
```

All commands support versioned `--json`. Mutations support preview or
`--dry-run`. Adapters and repositories do not parse CLI arguments or print
directly.
