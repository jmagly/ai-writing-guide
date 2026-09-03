---
namespace: aiwg
name: dataset-source-assess
description: Plan and review a bounded, non-mutating dataset source check and redacted preview.
version: 1.0.0
platforms: [all]
aliases: [source check, data source assessment, connector assessment]
triggers: [check this data source, preview these files, assess this API source, inspect dataset shape, can AIWG read this source]
---

# Dataset Source Assessment

Consume an intake reference. Propose `aiwg dataset source check <source> --json`
and `aiwg dataset preview <source> --json`; these operations must remain bounded,
side-effect free, and redacted. Explain adapter/version, schema binding, identity
and revision strategy, incremental cursor support, locality/network behavior,
and evidence-backed maturity.

Never inspect credential or environment values. Distinguish absent, stale,
unverified, unsupported, and degraded capability states. Emit an assessment
reference for `dataset-capability-recommend`.
