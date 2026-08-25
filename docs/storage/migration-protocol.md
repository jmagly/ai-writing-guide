# Storage migration protocol

AIWG's scalable-storage migration coordinator uses the versioned
`aiwg.storage-migration/v1` manifest. It is backend-neutral and complements the
[storage backend contract](backend-contract.md). A backend adapter supplies a
consistent snapshot, optional change cursor, atomic idempotent batch commits,
and logical reads; the coordinator supplies bounded parallel copy, durable
receipts, exact resume, parity checks, approval binding, cutover, and rollback.

## Manifest and receipt invariants

The manifest binds the migration ID and mode to source and destination backend,
instance, tenant, subsystem, and schema identities. It records the snapshot and
change cursor, high-water marks, tool version, timestamps, counts, whole-source
and whole-destination digests, and the approval digest.

Each record receipt contains the stable logical identity, source revision,
content digest, destination committed revision, tombstone state, idempotency
key, atomic batch ID, and commit time. Resume skips only an exact
identity/revision/digest tuple. A later revision or changed digest is copied;
pathname equality alone is never completion evidence.

`commitBatch` has a strict adapter contract: the destination mutation and its
returned batch receipt must become durable in the same transaction. A missing,
partial, or digest-divergent receipt fails closed. If a process dies after the
destination commit but before the manifest save, replay uses the same
idempotency key and the adapter must return the original durable result.

## Safety boundaries

Offline operation requires the caller to quiesce or lease source writes before
`preview`, retain that boundary through `apply`, rebuild backend-derived indexes,
then request cutover. Online operation requires a snapshot-aligned cursor. The
coordinator bulk-copies the snapshot, replays updates and tombstones
idempotently, and will not approve a manifest until the cursor reports drained.
The operator then applies a brief source-write freeze for final verification.

Cutover accepts only the approval digest stored in the verified manifest. It
switches reads before writes, records every state transition through the
manifest store, restores source routing on failure, and retains the source for
the declared rollback window. `complete` retires the rollback state only after
that observation workflow; `rollback` restores source routing.

Callers remain responsible for backend-specific schema/constraint validation,
counts by record type, edge integrity, and representative query/traversal parity
before supplying human approval. The coordinator's mandatory baseline compares
logical identities, tombstone state, record digests, total counts, whole-set
digests, and online lag. Release qualification adds the backend-specific checks
and fault/performance gates described by the release-gate graph.

## Retry and cancellation

Workers and batch size are bounded. Only errors explicitly classified as
retryable are retried, with capped exponential backoff and jitter; permanent
errors pass through unchanged. Retry count is bounded. An `AbortSignal` stops
new work and interrupts backoff. Checkpoints are serialized so concurrent
workers cannot regress the durable manifest.

Fortemi Server remains an alpha target until the live certification issue has
an approved endpoint, isolated tenant, backup/restore control, and load-test
window. The protocol and local negative controls do not constitute live-server
certification.
