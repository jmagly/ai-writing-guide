---
namespace: aiwg
name: dataset-export
description: Plan and delegate a governed portable dataset or lineage export with explicit standards coverage and loss reporting.
version: 1.0.0
platforms: [all]
aliases: [provenance export, dataset package, standards export]
triggers: [export this dataset, create a PROV report, make an OpenLineage export, package this corpus, create a RO-Crate]
---

# Dataset Export

Review authorization, privacy, destination, schema binding, and the selected
versioned exchange profile. Delegate to
`aiwg dataset export <dataset-ref> --profile <profile> --json` only after any
required plan approval. Surface exact mapping coverage, unsupported features,
extensions, compatibility, and loss report.

Descriptor-only profiles do not authorize export and must be reported as such.
Portable exports are projections, not replacement canonical persistence.
