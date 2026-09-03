# Dataset Intelligence v1 contracts

The canonical serialized contract is
`schemas/dataset/dataset-contracts.v1.schema.json`. The public TypeScript surface
is exported from `src/dataset/index.ts` and the package API.

The v1 family contains `DatasetSource`, `Dataset`, `DatasetRevision`,
`Distribution`, `CapabilityProfile`, `ProcessingPlan`, `ProcessingRun`,
`DerivedArtifact`, `ProvenanceAssertion`, `Relationship`, `Checkpoint`, and
`RunReceipt`.

## Identity and artifacts

`Dataset.id` and `logicalId` identify the continuing dataset. A revision uses a
different immutable ID and binds its manifest/content digests. Never substitute
a file path, Fortemi record ID, distribution, cache, or search-index ID for the
logical dataset ID. `artifactClass` makes canonical, derived, regenerable-index,
cache, distribution, and portable-export roles explicit.

## Policy and credentials

Source policies declare privacy, rights/license, retention, intended use,
locality, network behavior, and authorization references. References locate
authorization managed elsewhere; contract documents must never contain tokens,
passwords, API keys, private keys, or other credential values.

## Plans, runs, and checkpoints

Use canonical JSON and `computeProcessingPlanDigest` to bind a plan before
execution. Runs and receipts reference that digest but have independent IDs.
Only outcome `committed` is success. Preview, attempted, rejected, cancelled,
and failed receipts remain evidence without advancing committed state.

A checkpoint binds source identity and schema, adapter version, plan digest, and
the prior committed receipt. Opaque cursors are interpreted only by the named
adapter version.

## Provenance projections

`Dataset` maps to a W3C PROV Entity and OpenLineage Dataset. `ProcessingPlan`
maps to an OpenLineage Job; `ProcessingRun` maps to a PROV Activity and
OpenLineage Run. `ProvenanceAssertion` and `Relationship` express derivation,
generation, usage, attribution, and association while retaining whether evidence
was declared or directly observed. These are mapping rules, not claims of full
PROV or OpenLineage conformance; profile-specific conformance requires governed
fixtures and loss reports.

## Canonical run ledger

`schemas/dataset/run-ledger.v1.schema.json` and `src/dataset/ledger.ts` define the
append-only authority for processing and lineage history. Event IDs are globally
scoped identifiers, record IDs are stable within the ledger, and sequence is the
authoritative ordering key. Timestamps describe observation time and do not
override sequence ordering.

Each event digest is SHA-256 over canonical JSON of the complete event except
`eventDigest`: object keys are sorted recursively, array order is retained, and
JSON primitives retain their JSON representation. Replaying the same event ID
and digest is idempotent; reusing an event ID for different content is rejected.
Corrections and supersessions append records referencing existing events, so
previous evidence is never rewritten.

Event IDs and run IDs are globally scoped identifiers (for example, an absolute
URI or a namespaced `run:...`/`event:...` identifier). Record IDs are immutable
within a ledger and become unambiguous when paired with the ledger authority.
The runtime returns stable `RUN_LEDGER_*` diagnostic codes for unsupported
versions or record types, malformed identities and locators, digest conflicts,
sequence violations, dangling references, and illegal observed assertions.
`ProcessingRun` remains the canonical run contract; ledger activity, evidence,
and assertion records bind to its globally scoped `runId`.

Assertions distinguish `declared`, `observed`, `imported`, and `inferred`
lineage. Observed assertions require a run ID. Structured source and target
locators, producing activity, responsible agent and version, confidence,
privacy classification, retention policy, timestamp, and field pointer preserve
record-, field-, and activity-level provenance. Privacy may remain equal or
become more restrictive through a projection, but cannot be downgraded.

Research, marketplace, Fortemi v2, operational-state, mention, SDLC trace, and
legacy dependency-graph adapters return a value together with a machine-readable
loss report. The W3C PROV core projection preserves entities, activities, agents,
generation, derivation, usage, association, and attribution. Unsupported
predicates, canonical qualifiers, evidence detail, and ledger history operations
are explicitly reported as loss rather than silently discarded. Loss items carry
source privacy and retention metadata when the source supplies it, allowing a
downstream diagnostic or policy gate to retain those obligations.
