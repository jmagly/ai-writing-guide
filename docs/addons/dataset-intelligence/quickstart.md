# Dataset Intelligence Quickstart

For installation and initial provider connection, begin with the canonical
[install, connect, and verify guide](../../getting-started/install-connect-verify.md).

## Start in ordinary language

Tell AIWG what you have and what you want:

```text
Use ./exports/support.ndjson for searchable support history, and make every
answer traceable to its source. Keep everything local.
```

The `dataset-intelligence` router creates an intake, proposes a bounded source
check and redacted preview, and returns a recommendation with rationale,
assumptions, materialized artifacts, privacy/locality/network implications, and
safe defaults.

## Review before writes

Register and assess the source, then create an immutable plan:

```bash
aiwg dataset source --file source.json --json
aiwg dataset check source:support-history --json
aiwg dataset preview source:support-history --count 10 --offline --json
aiwg dataset plan --file plan-input.json --json
```

Review the exact
plan digest, schemas, estimated reads and writes, artifact classes, capability
fallbacks, retention, and authorization references. Policy-sensitive work
pauses for approval scoped to that digest.

After approval, ingest using the exact digest and a caller-selected idempotency
key:

```bash
aiwg dataset ingest plan:support-history --digest <sha256> --idempotency-key <key> --approve <approval-id> --json
```

The service
reports run, receipt, rejection, cancellation, and checkpoint references. It
does not execute a connector or index data itself.

## Resume an incremental source

Ask:

```text
Sync the support-history dataset from its last committed checkpoint, show me
what changed, and do not treat missing records as deletions without review.
```

The incremental flow reassesses the source, builds a new immutable plan, and
requires review of changed-source evidence, tombstone policy, prior checkpoint,
and expected writes. Cancellation preserves the last committed checkpoint.

## Explain and verify

Ask “where did this result come from?” to request a bounded lineage query.
Evidence includes identities, revisions, schema and run
bindings, assertion basis, method, confidence, privacy, and locators.

Ask “is this dataset and index current?” to request verification. The result
distinguishes verified, degraded,
unverifiable, and failed states. Search success alone is never verification.

```bash
aiwg dataset status run:support-history --json
aiwg dataset show run:support-history --json
aiwg dataset verify run:support-history --json
aiwg dataset query dataset:support-history --json
aiwg dataset lineage dataset:support-history --json
aiwg dataset export dataset:support-history --json
aiwg dataset cancel run:support-history --json
aiwg dataset retry run:support-history --json
```

## Export or retire

An export uses a versioned standards profile and reports exact mapping coverage
and loss. Descriptor-only profiles are not executable capabilities.

Retirement first creates an `aiwg dataset` plan with complete affected-artifact
enumeration, canonical/derived distinctions, holds, tombstones, bulk threshold,
and rollback limits. Nothing is deleted by an agent or skill. The shared service
performs only the approved operation and returns reconciliation evidence.

Local JSONL/CSV adapters are stable and the checked-in local orchestration,
offline, provenance, and standards cells are qualified. Pre-stable migration,
Fortemi Core parity, and live Fortemi Server persistence remain pending. See
the [task guide support matrix](task-guide.md#support-status) and consult `aiwg
dataset --help` for the installed action surface. The aggregate conformance
receipt is not stable-eligible while those three cells remain pending.
