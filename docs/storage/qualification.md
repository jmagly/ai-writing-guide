# Storage qualification and benchmark evidence

`npm run test:conformance:storage` is the zero-dependency correctness gate. It
runs the versioned graph corpus against JSON, Graphology, and SQLite; exercises
the migration fault/recovery protocol; verifies the PostgreSQL transports; and
tests the evidence reporter's negative controls.
The common graph contract includes UTF-8 byte ordering, Unicode/null attribute
parity, exact filters, and deterministic keyset pages in addition to CRUD,
typed traversal, set operations, incremental reconciliation, and deletion.

Server qualification jobs opt in with their declared service URLs. Correctness
must pass before timing is evidence:

```bash
AIWG_POSTGRES_LIVE_URL='postgresql://…' npm run test:conformance:storage:server
AIWG_POSTGREST_LIVE_URL='https://…' npm run test:conformance:storage:server
```

The Gitea `Storage Server Conformance` workflow exposes separate manual-only
PostgreSQL Direct and PostgREST jobs. Each job is guarded by its service-URL
secret, binds reports to the workflow commit/ref, and uploads sanitized JSON
evidence. These jobs do not run for pull requests or ordinary main pushes.

The `aiwg.storage-qualification/v1` report records backend, branch, commit,
dataset, declared and observed scope, readers/writers, operation count, exact
record digests, side-effect outcomes, retries/errors, p50/p95/p99 latency,
throughput, CPU, RSS, and nullable backend-specific database size, write amplification, WAL,
lock waits, pool saturation, migration/recovery time, and HTTP transport
overhead. Backend-specific resource fields are always present as a nonnegative
measurement or `null`, so an unavailable observation cannot be confused with a
forgotten field. `assertCurrentStorageEvidence` rejects invalid, incomplete, or stale
records before a performance statement is published. The declared reader count
now drives actual concurrent reads while record writes are distributed across
the declared bounded writer count; the report rejects any declared-versus-
observed operation mismatch.
Checked-in measurements are registered in
`docs/storage/evidence/claims.v1.json`. `npm run verify:storage-claims` binds
each rendered documentation block to exact correctness results, the benchmark
source digest, and a bounded validity window. Normal CI and every tag-driven
publication path run the same dependency-free verifier.
The runner uses bounded exponential backoff for classified transient failures;
the configured retry ceiling and observed retry/error rates remain part of the
evidence rather than being hidden by the benchmark.

The gate deliberately injects omitted, unexpected, and corrupt records. Each
negative control must invalidate the report. The migration protocol suite adds
crash-before-commit, lost acknowledgement after commit, duplicate replay,
updates/deletes during online copy, retry exhaustion, cancellation, corrupt
receipts, schema/identity mismatch, and failed cutover coverage. Backend live
suites add same-key races, transaction rollback, restart/reconnect, backup and
restore, and transport interruption.

Report local SQLite and shared service results as separate operating envelopes.
Never compare speed across backends until declared scope, exact count/digest,
and representative query/traversal results all match. MySQL rows remain absent
until the demand gate authorizes an implementation; Fortemi Server rows remain
provisional until a compatible live service is available.
