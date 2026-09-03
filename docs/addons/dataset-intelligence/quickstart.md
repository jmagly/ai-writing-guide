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

The recommendation becomes an immutable `aiwg dataset plan`. Review the exact
plan digest, schemas, estimated reads and writes, artifact classes, capability
fallbacks, retention, and authorization references. Policy-sensitive work
pauses for approval scoped to that digest.

After approval, the addon delegates execution to `aiwg dataset ingest`. It
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

Ask “where did this result come from?” to route a bounded query through
`aiwg dataset lineage`. Evidence includes identities, revisions, schema and run
bindings, assertion basis, method, confidence, privacy, and locators.

Ask “is this dataset and index current?” to route through
`aiwg dataset verify`. The result distinguishes verified, degraded,
unverifiable, and failed states. Search success alone is never verification.

## Export or retire

An export uses a versioned standards profile and reports exact mapping coverage
and loss. Descriptor-only profiles are not executable capabilities.

Retirement first creates an `aiwg dataset` plan with complete affected-artifact
enumeration, canonical/derived distinctions, holds, tombstones, bulk threshold,
and rollback limits. Nothing is deleted by an agent or skill. The shared service
performs only the approved operation and returns reconciliation evidence.
