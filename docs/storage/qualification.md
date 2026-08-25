# Storage qualification and benchmark evidence

`npm run test:conformance:storage` is the zero-dependency correctness gate. It
runs the versioned graph corpus against JSON, Graphology, and SQLite; exercises
the migration fault/recovery protocol; verifies the PostgreSQL transports; and
tests the evidence reporter's negative controls.

Server qualification jobs opt in with their declared service URLs. Correctness
must pass before timing is evidence:

```bash
AIWG_POSTGRES_LIVE_URL='postgresql://…' npm run test:conformance:storage:server
AIWG_POSTGREST_LIVE_URL='https://…' npm run test:conformance:storage:server
```

The `aiwg.storage-qualification/v1` report records backend, branch, commit,
dataset, declared and observed scope, readers/writers, operation count, exact
record digests, side-effect outcomes, retries/errors, p50/p95/p99 latency,
throughput, CPU, RSS, and optional database size, write amplification, WAL,
lock waits, pool saturation, migration/recovery time, and HTTP transport
overhead. `assertCurrentStorageEvidence` rejects invalid, incomplete, or stale
records before a performance statement is published.

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
