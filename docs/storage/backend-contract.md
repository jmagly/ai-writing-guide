# ADR: Scalable Storage Backend Contract v1

Status: Accepted for local implementations; remote backends remain capability-gated  
Contract: `aiwg.storage-backend/v1`  
Issue: #2193

## Decision

AIWG uses a versioned, asynchronous capability contract for persistence and
index backends. A backend advertises only behavior demonstrated by its current
implementation and conformance evidence. Consumers declare required
capabilities before an operation; negotiation fails closed when the contract
major, schema, or capability set is incompatible. There is no silent fallback
from a requested consistency or durability guarantee.

The existing zero-dependency filesystem and JSON behavior remains the default.
The scalable ramp is JSON/filesystem, then SQLite for a larger same-host tier,
then Fortemi Server for shared/concurrent scale-out after live certification.
Direct PostgreSQL and PostgreSQL through PostgREST are advanced,
operator-managed alternatives. MySQL is demand-gated.

The normative TypeScript surface is
`src/storage/backend-contract.ts`. It defines descriptors, negotiation,
logical identities, versioned records, atomic mutations, receipts, snapshots,
and change pages.

## Data classes

These classes must never be conflated:

| Class | Meaning | Examples |
| --- | --- | --- |
| Canonical | Authoritative user records; loss requires recovery | Filesystem storage, future direct SQL |
| Regenerable index | Derived from canonical sources and safe to rebuild | JSON, Graphology, SQLite graph indexes |
| Static cache | Read-only packaged/query projection | Fortemi Core static cache |
| Remote persistence | Server-owned records reached through a service contract | Live Fortemi MCP storage |

A successful static-cache query is not proof that live persistence works, and
a successful live persistence probe is not proof that a portable shard can be
imported.

## Identity, revisions, ordering, and deletion

The stable logical identity is the tuple `(tenant, subsystem, path)`. Backends
may use an opaque physical key, but receipts and migration evidence retain the
logical tuple. Each record carries an immutable source revision and a digest of
its canonical bytes. Ordering uses a backend-issued opaque high-water mark;
wall-clock timestamps are diagnostic and never establish causality.

Deletion is a versioned tombstone, not absence. Tombstones participate in
change feeds and migration until the declared retention horizon has passed.
Replaying the same idempotency key and canonical mutation must return the same
effect or receipt; reuse with different content is an error.

## Atomic batches and checkpoints

An atomic batch contains ordered upsert/delete mutations. The record effects,
batch receipt, and new high-water mark commit in one transaction. A failed or
ambiguous commit exposes no partial success: the caller resolves ambiguity by
reading the idempotency receipt before retrying. A checkpoint may advance only
to a committed receipt whose record count and digests were verified.

Backends without `atomic-batch` cannot be used for an online cutover that
requires it. Local file migration must instead use the backup-first offline
protocol.

## Snapshots, cursors, and pagination

A consistent snapshot pins a high-water mark. Every page in a traversal or
query names that snapshot, uses an opaque cursor, and returns a deterministic
order: logical identity ascending after the operation-specific primary sort.
Cursor replay is stable for the snapshot lifetime. Expired or foreign cursors
fail explicitly; they never restart at page one.

Change feeds contain upserts and tombstones after an exclusive cursor and
return the inclusive observed high-water mark. Consumers persist a cursor only
after applying and verifying the whole page.

## Query, traversal, and set semantics

- Filters are conjunctive unless the request explicitly contains a boolean
  expression.
- Text scores are backend-specific and cannot be compared across backends;
  ties resolve by logical identity.
- Recursive traversal declares direction, edge kinds, maximum depth, cycle
  handling, snapshot, and page limit. Nodes and edges are deduplicated by
  stable identity.
- Set union, intersection, and difference operate on logical identity and
  return identity-ascending results.
- Unsupported filters or operations fail capability negotiation instead of
  being approximated client-side without an explicit bounded fallback.

## Concurrency, durability, availability, and isolation

Descriptors declare durability (`process`, `filesystem`, `wal`, or
`replicated`), availability (`local-process`, `single-host`, or
`remote-service`), and isolation (`none`, `snapshot`, or `serializable`). These
are declarations of demonstrated behavior, not product-category assumptions.
Correctness parity is required before performance comparisons.

Writers use optimistic expected revisions or serializable transactions.
Same-key races yield one committed revision order, not duplicate logical
records. Bounded queues apply backpressure; overload and rate limits return an
actionable retry class and bounded retry-after value.

## Schema and corruption behavior

Descriptors report a backend schema version independently of the contract
version. Additive schema upgrades may use dual-read/dual-write only when the
compatibility matrix is green. Breaking upgrades require preview, verified
backup, explicit apply, verification, and rollback evidence. Downgrade is
permitted only when a loss report is empty.

Unknown contract majors, unsupported schemas, invalid receipts, digest
mismatches, cursor regression, and partially committed batches fail closed.
Canonical data is never rebuilt from a regenerable index. A corrupt index may
be quarantined and rebuilt from canonical sources.

## Security and operations

- Remote non-loopback transports require authenticated TLS. Plain HTTP is
  limited to explicit loopback development.
- Configuration stores credential locators, never bearer or password values.
- Each credential is scoped to the minimum tenant and subsystem operations;
  administrative schema, backup, and destructive-retention roles are separate.
- Tenant and subsystem identity is enforced server-side, not only by path
  prefixes in clients.
- Health means the process responds. Readiness additionally proves contract and
  schema negotiation plus required dependency access. Staleness reports the
  last verified high-water mark and lag.
- Backup/restore evidence records schema, count, digests, high-water mark,
  encryption state, and recovery timings. Telemetry excludes content and
  credentials.

## Backend mapping and maturity

The runtime matrix in `STORAGE_BACKEND_MATRIX` is conservative:

| Backend | Class | Current position |
| --- | --- | --- |
| JSON/filesystem | Regenerable index / canonical files | Supported default; no server required |
| Graphology | Regenerable in-process index | Supported, process durability |
| SQLite | Regenerable local index | Supported same-host tier; WAL/transaction capabilities |
| Fortemi Core static | Static cache | Supported read/query plane, never live persistence evidence |
| Fortemi Server | Remote persistence | Alpha until #2194 live conformance and recovery pass |
| PostgreSQL direct | Canonical advanced backend | Disposable PostgreSQL 17 reference-host conformance, migration, reconnect, and backup/restore evidence published; remote production certification remains gated |
| PostgREST | PostgreSQL transport | Disposable PostgreSQL 17/PostgREST 14 reference-host conformance published; authenticated RLS and remote production certification remain gated |
| MySQL | Canonical advanced backend | Deferred and demand-gated |

## Compatibility risks and rejected alternatives

- Rejected: extend the synchronous `GraphBackend` until it resembles a remote
  database. It cannot express cancellation, transactions, cursors, or service
  readiness without breaking local callers.
- Rejected: treat `StorageAdapter` path operations as the scalable contract.
  Its get-then-write flow does not prove atomic upsert or consistent migration.
- Rejected: infer capabilities from backend names. Product versions and
  deployment modes differ; only negotiated descriptors count.
- Rejected: make direct PostgreSQL the default scale-out path. Fortemi Server
  is the first-class service boundary; direct databases remain advanced.
- Rejected: treat PostgREST as a database engine. It is an access mode over a
  PostgreSQL schema and inherits database recovery obligations.
- Risk: local and server query scoring differs. Only count, identity, digest,
  relationship, and deterministic ordering parity are release gates.

## Implementation and conformance dependencies

1. #2188 routes configured local graph backends (complete).
2. #2189 hardens SQLite against this contract.
3. #2190 implements verified offline/online migration and receipts.
4. #2191 supplies correctness, concurrency, fault, and performance gates.
5. #2194 certifies Fortemi Server with live evidence.
6. #2195 implements direct PostgreSQL; #2196 adds the optional PostgREST transport.
7. #2197 remains demand-gated.
8. #2192 publishes executable release and migration graphs.

No remote backend advances in maturity based solely on mocked tests.
