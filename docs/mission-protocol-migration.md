# Mission Protocol migration

AIWG reads legacy Mission Control, conductor, executor, fleet, A2A, UHP,
graph, Cockpit, MCP, audit, and activity representations through the adapters
in `src/mission-protocol/codecs.ts`. New persisted definitions use
`mission.aiwg.io/v1`; legacy reads remain supported through **2027-08-24**.
Removal requires a separately announced major release after that date.

## Preview

Preview is the default and does not print mission objectives or record bodies:

```console
aiwg mission migrate
aiwg mission migrate --dry-run --root /approved/workspace
```

The report lists paths, detected versions, transformations, unknowns, byte
counts, and conservative backup/write disk requirements. Invalid JSON,
unknown major versions, and ambiguous mappings are reported as fail-closed.

## Backup and apply

Apply requires the target version explicitly:

```console
aiwg mission migrate --apply --target mission.aiwg.io/v1 --id release-v1
```

Before any target write, AIWG copies every original byte stream beneath
`.aiwg/mission-migrations/release-v1.backup/`, verifies its SHA-256 digest, and
writes `.aiwg/mission-migrations/release-v1.json`. Each manifest entry records
the relative path, source and target versions, tool version, timestamp, and
before/after digest. Target replacement uses a synced temporary file and an
atomic rename.

## Verify, resume, and rollback

```console
aiwg mission migrate --verify release-v1
aiwg mission migrate --resume release-v1
aiwg mission migrate --rollback release-v1
```

Resume skips files already matching their after digest and converts only files
still matching their before digest. Any third digest fails closed. Rollback
first verifies backup integrity, rejects post-migration edits, restores the
exact original bytes atomically, and verifies the restored digest. Re-running
apply with the same identifier or resuming a completed migration is
idempotent.

## Mixed-version operation

During the compatibility window, consumers decode legacy records into the
canonical in-memory type and make format loss visible through `lossReport`.
Canonical writes are the default only for files selected by this migration;
transport-specific projections remain explicit. Generated plugin copies must
be regenerated from their canonical source rather than edited independently.

The checked-in inventory at
`schemas/mission-protocol/inventory-v1.json` classifies every discovered
Mission producer, consumer, schema, fixture, and example as `canonicalize`,
`adapt`, or `retain`. `npm run lint:mission-inventory` rejects any new,
unclassified Mission surface.
