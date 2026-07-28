# Session Intelligence Test Strategy

## Test Levels

1. Unit: schema validators, identity derivation, canonicalization, redaction,
   filters, lifecycle reducers, and citation resolution.
2. Adapter contract: one reusable suite applied to every provider adapter.
3. Repository integration: transactions, checkpoints, replay, concurrency,
   FTS, metadata filters, tombstones, and purge.
4. End to end: source selection through search, extraction, review, promotion,
   and deletion.
5. Security/property/fuzz: malformed records, traversal, injection, secrets,
   resource limits, and schema drift.
6. Optional-backend conformance: SQLite reference behavior versus Fortemi where
   configured.

## Blocking Gates

| Gate | Evidence |
|---|---|
| G0 Contract | Canonical schema, JSON version, error/status, and migration tests |
| G1 Adapter | All 12 provider dispositions pass implemented or degraded/unsupported contracts |
| G2 Import | JSONL, API, SQLite snapshot, hook, and manual-export replay/idempotency tests as applicable |
| G3 Security | Traversal, injection, secret/PII, workspace isolation, and resource-limit tests |
| G4 Retrieval | Lexical/metadata correctness, deterministic pagination, citation integrity |
| G5 Curation | Candidate state, conflict, review, promotion, and duplicate prevention |
| G6 Lifecycle | Tombstone, purge preview, crash retry, orphan scan, and promotion dependency tests |
| G7 Release | Provider documentation and traceability complete; all prior gates green |

## Adapter Conformance Contract

Every canonical provider must prove:

- Capability classification and operational-state reporting.
- No implicit source or network access.
- Version/schema probe behavior.
- Stable source/session/event identity.
- Incremental and unchanged replay behavior.
- Active/provisional consistency behavior where applicable.
- Opaque unknown-event preservation and unknown-major failure.
- Provider-native field preservation.
- Synthetic fixture provenance and no real-user data.
- Deletion semantics and unsupported-operation reason codes.

## Provider Fixture Matrix

| Provider | Required fixture surface |
|---|---|
| `claude` | Complete and truncated JSONL, active append, resume/fork, hook metadata |
| `codex` | App Server responses, rollout JSONL, compaction, active/idle/archive/delete |
| `copilot` | Supported JSON export, sync/archive states, versioned local-store negative/experimental fixtures |
| `cursor` | CLI NDJSON, cloud events, project-scoped agent-transcripts JSONL, editor Markdown lossiness, unsupported SQLite probe |
| `factory` | Versioned JSONL/settings, API/Exec responses, incomplete active tail |
| `hermes` | Native JSONL export, schema-23 isolated store, lineage/archive/compaction |
| `opencode` | Sanitized export, API/SSE, tool states, attachments, share/redaction behavior |
| `openclaw` | Schema-16/event-v3 store, branch/reset/compaction, bounded/incomplete export |
| `openhuman` | Schema-1 raw JSONL, thread/turn joins, interruption, expired attachment, deletion gap |
| `warp` | Synthetic Markdown export and explicit loss report; unsupported internal store |
| `devin-desktop` (`windsurf` alias) | Hook JSONL, alias/canonical identity, in-place catalog migration, retention limit, unknown schema; unsupported protobuf history |
| `generic` | Versioned AIWG interchange and negative ambiguous/opaque inputs |

## Core Invariants

- Unchanged replay creates no duplicate row, event, revision, job, or receipt.
- Unknown major schema creates no partial visible state.
- Search scope is applied before ranking.
- Every search hit and candidate citation resolves to the same normalized event.
- Redaction canaries never appear in derived surfaces.
- Purge retries converge on one terminal outcome.
- Provider source files are unchanged by all AIWG lifecycle commands.
- Promotion requires an accepted exact candidate version and named destination.

## Performance Validation

Run `npm run benchmark:sessions` against the production adapter/importer/repository paths. Required CI
uses a reproducible 10,000-event seeded corpus and gates metadata and lexical p95, deterministic-local
hybrid p95, minimum import throughput, peak heap/RSS, slow-downstream producer lead, and bounded-record
failure behavior. It uploads the complete JSON profile and raw samples even after a budget failure; missing
dependencies, signals, and wall timeout write explicit non-pass artifacts. Release validation raises
`AIWG_SESSION_BENCH_EVENTS` to one million on a documented reference machine and preserves the result under
`docs/planning/session-intelligence/evidence/`. The hybrid backend is local and deterministic, so it measures
production orchestration and authorization—not live model or provider latency. Environment-specific
observations are not portable guarantees; targets may be revised only with preserved evidence and an
updated requirement decision.
