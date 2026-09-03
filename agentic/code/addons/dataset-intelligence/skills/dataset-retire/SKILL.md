---
namespace: aiwg
name: dataset-retire
description: Plan and delegate safe dataset retirement, tombstoning, derived-artifact cleanup, and reconciliation.
version: 1.0.0
platforms: [all]
aliases: [remove dataset, decommission index, dataset cleanup]
triggers: [retire this dataset, remove this index safely, delete derived dataset artifacts, reconcile dataset deletion, decommission this source]
---

# Dataset Retirement

First use `aiwg dataset plan <dataset-ref> --capability retire --json`. Require
complete bounded enumeration of affected canonical and derived artifacts,
retention/legal-hold checks, tombstones by default, rollback limits, and a
reviewed bulk threshold. Dataset Policy Reviewer approval must match the exact
plan digest.

Delegate only through the retirement operation exposed by `aiwg dataset`.
Never delete directly. Preserve canonical material unless explicitly and
separately authorized. Finish with `aiwg dataset verify <run-ref> --json` and a
reconciliation/evidence handoff.
