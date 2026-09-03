# Dataset schema governance

Dataset Intelligence uses the AIWG Schema Control Plane for every serialized trust boundary. The catalog entry in `schemas/catalog/domains/dataset.json` declares two authorities:

- `dataset.contracts@1.0.0` governs dataset identity, plans, runs, checkpoints, receipts, lineage, and derived artifacts.
- `dataset.schema-governance@1.0.0` governs inferred-schema candidates, review promotions, compatibility-impact reports, adapter manifests/configuration, discovered records, and exchange profiles.

## Required binding

A boundary binding contains the version-qualified schema ID, semantic version, and SHA-256 digest of the cataloged canonical authority. `DatasetBoundaryValidator` resolves this binding offline and fails closed when the ID is unknown, the version differs, the digest is absent or stale, or the instance is invalid. Adapter, checkpoint, plan, run, receipt, lineage, and exchange integrations must validate before accepting the payload.

## Candidate lifecycle

Inferred schemas are observations, not authorities. `createDatasetSchemaCandidate` records the exact source revision, inference method/tool/version, optional run, observation time, inferred schema, and deterministic digest with status `candidate`.

Promotion requires `promoteDatasetSchemaCandidate` and a review receipt naming the reviewer, decision evidence, governed target binding with digest, and compatibility evidence. Modifying a candidate after inference invalidates its digest. Unknown compatibility requires explicit reasons and cannot become an optimistic compatible result.

## Evolution impact

`assessDatasetSchemaImpact` applies the conservative Schema Control Plane compatibility analyzer. A breaking result requires migration analysis; an unknown result requires review. Every result covers adapters, checkpoint/state, processing plans, indexes, derived artifacts, and consumers so an apparently local record-schema change cannot bypass downstream analysis.

## Projection parity

The TypeScript/runtime representations in `src/dataset/schema-governance.ts` are declared catalog projections of the JSON Schema authority. Shared valid and invalid fixtures are evaluated by both the canonical schema and runtime validator. Direct projection drift or acceptance differences are release failures.

Runtime remote schema retrieval is not used. Dependencies resolve from the digest-checked local catalog.
