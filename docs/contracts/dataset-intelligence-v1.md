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

