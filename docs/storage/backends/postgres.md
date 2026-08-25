# Direct PostgreSQL backend

Direct PostgreSQL is an advanced, operator-managed canonical-storage backend
for `aiwg.storage-backend/v1`. It is not the default scale-out path: Fortemi
Server remains the first-class shared service. PostgreSQL is appropriate when
the operator owns database availability, upgrades, backup, recovery, TLS, and
capacity planning.

## Install and configure

Install the exact optional driver through AIWG's feature manager:

```bash
aiwg features install postgres
```

Configuration stores only an environment-variable locator. Put the connection
URL in the approved runtime secret provider and pass its variable name as
`connectionStringEnv`; never put a password or bearer value in project config.
Remote endpoints require `ssl: verify-full` or `ssl: require`.
`ssl: disable` is rejected unless the URL host is explicitly loopback.

Recommended bounds for each AIWG process are `maxConnections: 10`, a 15-second
connection/statement timeout, a 5-second lock timeout, and a 30-second
idle-in-transaction timeout. Budget `maxConnections × process count` below the
server limit and reserve administrative headroom. Runtime metrics expose total,
idle, and waiting clients without record content or credentials.

## Separate roles

Use a migration owner only for schema setup/upgrades. Construct the backend
with `schemaMode: migrate` under that role, then remove it from the application
environment. Normal processes use the default `schemaMode: verify` and fail
closed if schema v1 is absent or incompatible.

Grant the runtime role only:

```sql
GRANT USAGE ON SCHEMA public TO aiwg_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  aiwg_storage_records, aiwg_storage_batch_receipts, aiwg_storage_edges
  TO aiwg_runtime;
GRANT SELECT ON aiwg_storage_schema TO aiwg_runtime;
GRANT USAGE, SELECT ON SEQUENCE aiwg_storage_records_change_seq_seq
  TO aiwg_runtime;
```

The migration role owns those objects and schema changes. Backup and restore
use distinct operator credentials; the runtime role receives neither DDL nor
database-wide backup privileges. Tenant/subsystem predicates are mandatory in
every backend query. Deployments requiring hostile-tenant isolation should add
database-enforced RLS policies and qualify them before sharing one database.
Generate the exact quoted grant script with
`postgresLeastPrivilegeSql('aiwg_runtime')`; role creation and credential
assignment intentionally remain operator-owned.

## Schema upgrade and rollback

`upgradePostgresSchemaV1(client)` takes a transaction-scoped schema advisory
lock, inspects the current version, installs v1, verifies it, and commits. It is
idempotent at v1 and rejects unknown versions. `inspectPostgresSchema(client)`
returns the version plus exact record, receipt, and edge counts.

Rollback to an empty v0 schema is intentionally destructive and migration-role
only. `rollbackPostgresSchemaV1(client, approval)` requires all three of:

- `expectedVersion: 1`;
- `allowDataLoss: true`;
- exact counts copied from a fresh inspection.

Any drift rolls the transaction back without dropping objects. Take and verify
a backup first. PostgREST functions are removed in dependency order before the
tables, and the empty-schema result is verified before commit.

## Transaction and migration semantics

- A checked-out `pg` client owns each serializable transaction and is released
  in `finally`; failures roll back before release.
- `INSERT ... ON CONFLICT` enforces one logical `(tenant, subsystem, path)` row.
  Expected revisions provide optimistic compare-and-set behavior.
- Record effects and their checksum-backed batch receipt commit atomically.
  Exact replay returns the durable receipt; a changed payload fails closed.
- Deletes are versioned tombstones and participate in the ordered `change_seq`
  feed.
- `openSnapshotLease()` keeps the exporter transaction open while bounded
  parallel readers import its `pg_export_snapshot()` identifier. `close()` ends
  the lease; an expired/foreign identifier is a hard error.
- Migration advisory locks are transaction-scoped and intended only for brief
  reconcile/cutover sections, never long bulk copies or human approval waits.

## Backup, restore, and readiness gate

Before production-ready status, capture a current evidence record containing:

1. `pg_dump --format=custom` under the backup role;
2. restore into an isolated database using `pg_restore --single-transaction`;
3. schema version, exact live/tombstone counts, logical digest, edge count,
   high-water mark, encryption state, elapsed backup/restore time, and server
   version from both databases;
4. common correctness, migration, concurrency, injected-fault, restart,
   ambiguous-commit, and performance results.

An engine smoke test or mocked pool is not production certification. Until the
current backup/restore and complete server conformance record passes, the
backend remains `advanced`, and `backup`/`restore` are deliberately absent from
its advertised capability receipt.

## Failure behavior

Serialization failures, deadlocks, lock cancellation, administrative
shutdown/restart states, and connection-class errors are classified as
bounded-retry candidates. Revision conflicts and
idempotency mismatches are semantic failures and must not be retried with a
changed payload. Pool exhaustion is visible through `waiting`; callers apply
backpressure rather than opening unbounded clients.
