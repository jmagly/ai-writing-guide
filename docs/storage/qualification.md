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
PostgreSQL Direct, PostgREST, and Fortemi jobs. Each job is guarded by the Vault AppRole
bootstrap pair and its service-URL Vault mapping, binds reports to the workflow
commit/ref, and uploads sanitized JSON evidence. Gitea stores only
`VAULT_CI_ROLE_ID` and `VAULT_CI_SECRET_ID`; repository variables select the
Vault paths and fields for the URLs and optional service authorization. These
jobs do not run for pull requests or ordinary main pushes. The direct
PostgreSQL job installs the feature catalog's exact `pg@8.23.0` driver before
the live suite; deployed operators continue to use `aiwg features install postgres`.
The Fortemi job is read-only by default. Its explicit write input is a separate
mutation gate and may create one retained, UUID-namespaced qualification record;
endpoint authorization must not be interpreted as permission to enable it.

As of AIWG 2026.9.1, Fortemi live qualification remains pre-certification. The
workflow writes sanitized `aiwg.fortemi-live-qualification-receipt/v1` evidence
under `test-results/storage/`. The receipt binds the AIWG revision, non-secret endpoint identity, observed server and
contract versions, operation outcomes, mutation state, timestamps, and resource
bounds. Until an approved live run exists and its receipt verifies, an uploaded
directory or console report is not certification evidence.

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

## Shared-server reference envelopes

<!-- aiwg-storage-benchmark-claim:postgres-direct-reference-v1:start -->
A 2026-08-28 disposable loopback reference-host qualification on linux x64, Node 24.12.0, and PostgreSQL 17.11 via pg 8.23.0 produced:

| Records / readers / writers | Throughput | Latency p50/p95/p99 | Errors / retries | DB / WAL bytes | Write amplification | Pool saturation | HTTP overhead |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 128 / 4 / 4 | 325.21 ops/s | 5.13 / 49.98 / 111.66 ms | 40 / 40 | 8,410,803 / 314,216 | 9.58 | 0.75 | n/a |

6 live tests passed with no skips. This is a reference-host envelope, not production or remote-service certification.

Evidence: [postgres-direct-reference-v1](evidence/postgres-direct-reference-v1.json). The release gate rejects this claim when correctness, scope, source digest, required metrics, freshness, or rendered values no longer match.
<!-- aiwg-storage-benchmark-claim:postgres-direct-reference-v1:end -->

<!-- aiwg-storage-benchmark-claim:postgres-postgrest-reference-v1:start -->
A 2026-08-28 disposable loopback reference-host qualification on linux x64, Node 24.12.0, and PostgreSQL 17.11 via PostgREST 14.16 produced:

| Records / readers / writers | Throughput | Latency p50/p95/p99 | Errors / retries | DB / WAL bytes | Write amplification | Pool saturation | HTTP overhead |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 64 / 4 / 4 | 576.69 ops/s | 6.17 / 9.06 / 13.9 ms | 0 / 0 | n/a / n/a | n/a | n/a | 6.11 ms |

4 live tests passed; 1 authenticated-RLS test was skipped because this loopback run had no JWT authority. This is a reference-host envelope, not production or remote-service certification.

Evidence: [postgres-postgrest-reference-v1](evidence/postgres-postgrest-reference-v1.json). The release gate rejects this claim when correctness, scope, source digest, required metrics, freshness, or rendered values no longer match.
<!-- aiwg-storage-benchmark-claim:postgres-postgrest-reference-v1:end -->

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
