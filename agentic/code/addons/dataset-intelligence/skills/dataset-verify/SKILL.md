---
namespace: aiwg
name: dataset-verify
description: Verify a dataset plan or run receipt, checkpoint continuity, provenance completeness, and derived-artifact freshness.
version: 1.0.0
platforms: [all]
aliases: [dataset health, verify ingest, check dataset freshness]
triggers: [verify this dataset, did ingestion succeed, is this index fresh, validate the run receipt, check checkpoint continuity]
---

# Dataset Verification

Delegate to `aiwg dataset verify <dataset-or-run-ref> --json`. Verify plan and
receipt digests, committed outcome, checkpoint continuity, counts/rejections,
schema bindings, evidence completeness, derived-artifact freshness, and stated
degradation. Searchability alone is not proof of success or canonical-source
availability.

Return a verification reference with explicit `verified`, `degraded`,
`unverifiable`, or `failed` state. Preserve diagnostics and route evidence
questions to Dataset Provenance Reviewer.
