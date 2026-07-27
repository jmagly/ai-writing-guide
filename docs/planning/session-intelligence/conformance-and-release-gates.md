# Session ingestion conformance and release gates

The executable source of truth is
[`provider-conformance-matrix.json`](provider-conformance-matrix.json). It maps every canonical provider to
its implementation issue, support state, operations, synthetic fixtures, contract tests, and user
documentation. `devin-desktop` is canonical; `windsurf` is an accepted
deprecated input alias during the documented compatibility window.

## Blocking gate map

All gates below run under the required CI `Test` job. SQLite-backed repository and provider verification
runs through `npm run test:sessions:sqlite`; the gate loads `better-sqlite3` before testing and validates a
machine-readable report for required files, the seven importer tests, and zero skips. The broader suite
runs through `npm run test:ci`, with typecheck and build/conformance prerequisites in earlier steps;
`Build` runs only after the Test job succeeds.

| Gate | Blocking evidence |
|---|---|
| Contract and provider import | `contracts-policy`, `discovery-readers`, and all 12 adapter suites; repository blocks are mandatory under `test:sessions:sqlite` |
| Security and bounded input | traversal/symlink authorization, record/total/depth limits, schema drift, malformed/truncated input, redaction canaries |
| Retrieval | all seven `repository-importer` tests with zero skips, `optional-backends`, and CLI session search tests |
| Curation and promotion | `candidates`, `promotion`, and knowledge-shard tests |
| Lifecycle | replay, relocation, tombstone, restore, purge, revocation, and deletion receipt tests |
| Release traceability | `provider-conformance.test.ts`, full typecheck, CLI build, and required Test + Build workflow jobs |

The matrix gate checks that all provider IDs occur exactly once, every referenced path exists, each fixture
directory is non-empty, provider tests cover drift/malformed behavior, and fixture content uses only
synthetic reserved identities. This prevents a provider from being declared complete with missing fixtures
or documentation.

## SQLite maintainer matrix and troubleshooting

Required maintainer and CI verification uses Node 20 and `better-sqlite3` 12.x. Runtime consumers still
treat the SQLite peer as optional; CI explicitly installs the pinned test
backend without placing deprecated native prebuild plumbing in the default
lockfile. Verify the native module with `node -e "require('better-sqlite3')"`,
then run `npm run test:sessions:sqlite`.
If loading fails, confirm the active Node ABI matches the installed package, remove only the local
`node_modules` directory, rerun `npm ci`, and inspect the native build output. A green wrapper run is not
SQLite conformance evidence unless the dedicated gate reports every required file and zero skips.

## Performance evidence

`npm run benchmark:sessions` uses the production adapter, `IncrementalSessionImporter`,
`SessionRepository`, FTS search, metadata listing, and candidate extractor. It writes the complete machine
profile, generator version/seed, dependency versions, budgets, raw samples, and outcome to
`test-results/session-performance.json`; required CI preserves that file as an artifact even on failure.
A missing native dependency, missing artifact, bounded-input failure that does not fail closed, or exceeded
budget is an explicit non-pass.

The 2026-07-27 local 10,000-event reference run on Node 24.12.0 / `better-sqlite3` 12.8.0 measured
10,419.70 imported records/second, 1,014.81 ms lexical p95, 1.17 ms metadata p95, 21,379,784 bytes peak
heap growth, and a successful bounded-failure assertion. These figures are measured evidence for that
recorded machine profile, not universal deployment guarantees. CI uses portable, deliberately conservative
hard budgets; release-scale one-million-event runs retain their raw artifacts and may tighten budgets only
through a reviewed requirement change.

Metadata listing is structurally bounded by stable cursor pagination and a caller-provided limit. Peak
memory, import throughput, and latency remain environment-sensitive even though CI now measures and gates
them. AIWG does not generalize a passing reference profile into an unmeasured deployment claim.

JSONL acquisition is demand-driven: the reader retains one parsed source
record, adapters emit normalized records incrementally, and the importer pulls
again only after a synchronous repository batch flush returns. Adapter join
state (OpenCode/OpenHuman enrichment) is capped at 10,000 identities; exceeding
that bound fails closed. Single-document JSON and Markdown acquisitions are
treated as one record and remain subject to `maxRecordBytes`.

The default streaming ceilings are one million source records, 4 MiB per
source record, 1 GiB authorized source bytes, nesting depth 64, and importer
batches of 1,000 normalized records. These are authorization ceilings, not
memory reservations. A one-million-record synthetic iterator test verifies
less than 96 MiB heap growth in its test process while retaining no prior
record. Per-batch receipts expose normalized record/event/byte counts, batch
latency, elapsed import time, peak observed heap/RSS, and durable-checkpoint
state without content.

Authorized document scans use keyset pages of at most 500 records. Their cursors bind workspace, session,
provider, metadata, lifecycle, authorization scope, ordering, and a fixed database snapshot; mismatched or
modified cursors are rejected. Page size is a memory/latency control, not a correctness limit. Session
extraction applies its session predicate before paging and scans the complete authorized snapshot by
default. `--max-documents` is an explicit operator safety limit and returns `scan.complete: false`,
`documentsScanned`, and `nextCursor` rather than silently presenting a partial scan as complete. Hybrid
semantic candidate budgets remain bounded, while independently authorized lexical hits remain eligible
for fusion even when they fall outside that semantic window.

## Incremental continuity

Session aggregates merge transactionally across batches: `startedAt` is the earliest valid timestamp,
`updatedAt` is the latest, null timestamps do not erase known bounds, consistency and lifecycle move only
forward, and provider extension namespaces merge deterministically. Complete sources remain staged until
the final publish step; provisional sources expose their committed prefix and resumable checkpoint.
On downstream or source failure, `SessionImportFailure.failureReceipt`
distinguishes the committed provisional prefix, last durable resumable
checkpoint, terminal error code, source generation, and consistency. Complete
sources report no committed prefix and restart from the generation boundary;
their staged batches remain invisible.

New checkpoints use the version-2 envelope. It records position kind, source generation, locator class,
adapter/schema/policy versions, record and byte totals, source size/mtime/file
identity, a prefix digest, and a content-free continuity outcome. Legacy
three-field checkpoints remain readable and are upgraded on the next successful import. Adapter, source
schema, policy, or generation mismatches fail with `SCHEMA_DRIFT` and require an explicit restart or
migration rather than silently combining data. Record-index adapters currently report continuity as
`unverified`; they must not claim append validation until migrated to byte-offset or provider-native
cursors with source-specific prefix/file-generation evidence. Generic
interchange now resumes from a byte offset after validating the prior prefix
and file identity. Unchanged replay is idempotent; append is classified
`validated-append`; truncation, prefix rewrite, and inode/file-generation
replacement fail before parsing or checkpoint advancement.

## Fixture policy

Session fixtures are generated examples. They may contain reserved redaction canaries such as
`example.test`, synthetic token markers, or non-existent absolute paths to prove sanitization. They must
not contain real home-directory identities, credential values, or copied user transcripts. Provider source
files are read-only inputs; lifecycle operations mutate only AIWG-owned normalized state.

## Workspace authorization model

The local CLI operates in explicit single-user catalog-owner mode: opening the catalog grants the local
process authority only within the workspace named for each data operation. Imports additionally bind the
requested workspace to the selected source's prior authorization decision and reject mismatches before
reading records or writing checkpoints. Shared, daemon, API, and Cockpit callers must not inherit
catalog-owner authority; they must provide an actor/workspace/operation authorization context, and
repository queries must apply that workspace predicate before returning or mutating opaque IDs. Omitting
workspace scope is not a supported way for a remote caller to request global access.

The CLI creates a `SessionAuthorizationContext` for each operation, binding the local actor, operation,
workspace, catalog scope, and trust mode. `list`, `show`, `search`, `extract`, `candidates`, `review`,
`promote`, `tag`, `relocate`, `reindex`, `delete`, `restore`, and `purge` all require `--workspace`.
Repository methods retain an omitted-workspace form only for in-process catalog-owner maintenance and
tests; shared callers must use the scoped form. Session, event, tag, source, candidate, review, promotion,
tombstone, restore, purge-preview, purge-retry, and reindex queries apply workspace predicates before
returning or mutating data. Unauthorized opaque IDs produce the same absent/not-found behavior as unknown
IDs, without revealing whether the object exists elsewhere.
