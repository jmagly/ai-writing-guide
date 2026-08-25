# PostgreSQL through PostgREST

PostgREST is an optional `accessMode` for the PostgreSQL storage engine. It is
not a separate storage engine: `PostgrestStorageBackend` uses the same schema,
logical identity `(tenant, subsystem, path)`, durable batch receipts, change
sequence, tombstones, and migration protocol as `PostgresStorageBackend`.

## Transaction boundary

Every HTTP request is one PostgreSQL transaction. Atomic batches use the
versioned `POST /rpc/aiwg_commit_batch_v1` function so record updates and the
durable idempotency receipt commit or roll back together. Do not split a
guarded operation across requests. PostgREST transaction-end preferences alter
the transaction for one request; they cannot create a cross-request
transaction.

Install the base schema with a migration-role `PostgresStorageBackend` using
`schemaMode: 'migrate'`, then call `installPostgrestSchemaV1(client)` with a
migration-role connection. Runtime callers only call the versioned functions.
The installer commits function changes before notifying the `pgrst` channel to
reload the schema cache. Reload and verify health after changing keys, tables,
views, or functions.

## Bounds and retry semantics

| Control | Default | Allowed range |
|---|---:|---:|
| Request timeout | 15 seconds | 1 ms–10 minutes |
| JSON request body | 1 MiB | 1 KiB–16 MiB |
| JSON response body | 1 MiB | 1 KiB–16 MiB |
| Mutations per atomic batch | 1,000 | 1–10,000 |
| Page/snapshot records | 1,000 | 1–10,000 |

Path queries use deterministic keyset pagination. Change queries use the
monotonic PostgreSQL `change_seq`. A snapshot fails at its configured record
ceiling instead of returning an incomplete snapshot.

The batch UUID and payload digest are deterministic functions of the complete
mutation array. After a timeout, disconnect, HTTP 408/425/429, or HTTP 5xx,
retry the identical batch. The advisory transaction lock serializes concurrent
delivery of that batch ID; the durable receipt proves one logical commit.
Reusing the ID with a different payload fails closed.

Bulk JSON writes in the canonical path are the `p_mutations` array accepted by
`aiwg_commit_batch_v1`. `bulkBootstrapJson()` and `bulkBootstrapCsv()` also
expose PostgREST's native table bulk mode for controlled bootstrap jobs. Both
fix `on_conflict=tenant,subsystem,path`, request deterministic merge-duplicate
resolution, enforce the same tenant/subsystem and batch/body ceilings, and
return the server representation. CSV parsing validates quoting, row width,
and required columns before transport. Native bootstrap does not create
migration receipts and must not be used for reconcile or cutover.
PostgREST applies PostgreSQL's CSV field coercions; use JSON bootstrap when a
`value` must remain a structured JSON object rather than its CSV text form.

## Authentication, TLS, and RLS

Remote endpoints require HTTPS. Plain HTTP is accepted only for an explicit
loopback development URL. Put the complete `Authorization` header in a named
environment variable through `authorizationEnv`; credentials are rejected in
the URL and are never included in adapter error text.

The RPC functions are `SECURITY INVOKER`. Use a login-only authenticator role,
one or more `NOLOGIN` requester roles, short-lived signed JWTs, and explicit
grants. Revoke table and function access from `PUBLIC`. Enable and force RLS on
records, receipts, and edges, with both `USING` and `WITH CHECK` policies bound
to trusted JWT claims. A representative predicate is:

```sql
tenant = current_setting('request.jwt.claims', true)::jsonb ->> 'tenant'
AND subsystem = current_setting('request.jwt.claims', true)::jsonb ->> 'subsystem'
```

Grant requesters `SELECT, INSERT, UPDATE, DELETE` only on the three storage
tables, sequence `USAGE`, and `EXECUTE` only on the `aiwg_*_v1` functions.
Keep schema installation, role administration, backup, restore, and direct DDL
outside the requester role. RLS is defense in depth: the adapter also rejects
cross-tenant or cross-subsystem mutations before transport.

`postgrestLeastPrivilegeSql('aiwg_requester')` generates the complete quoted
grant/revoke/RLS policy script. It revokes public table and function access,
grants only the v1 RPC surface, forces RLS on all tenant-bearing tables, and
binds both `USING` and `WITH CHECK` to trusted JWT `tenant` and `subsystem`
claims. Role creation, membership, JWT signing keys, and login credentials stay
outside the generated script and remain operator-owned.

## Qualification

Run the common PostgreSQL parity, migration, rollback/fault, and performance
gates against both `accessMode=direct` and `accessMode=postgrest`. Report HTTP
serialization and network overhead separately from database execution time.
The opt-in live tests use `AIWG_POSTGRES_LIVE_URL` for direct PostgreSQL and
`AIWG_POSTGREST_LIVE_URL` for HTTP; supply `AIWG_POSTGREST_AUTHORIZATION` when
the qualification service requires a JWT.
