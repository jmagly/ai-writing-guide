---
namespace: aiwg
name: dataset-plan-review
description: Review an immutable dataset plan, impacts, capability degradation, and approval requirements before execution.
version: 1.0.0
platforms: [all]
aliases: [dataset approval, ingest plan review, review indexing plan]
triggers: [review the dataset plan, approve this ingestion, check write impacts, review indexing changes]
---

# Dataset Plan Review

Use `aiwg dataset show <plan-ref> --json` and verify its digest, schemas,
capability negotiation, artifact classes, estimated reads/writes, privacy,
locality, network access, retention, authorization references, fallback, and
rollback/reconciliation behavior. A preview is not execution authority.

Policy-sensitive writes require Dataset Policy Reviewer approval scoped to the
exact plan digest. Retirement additionally requires complete enumeration and a
reviewed bulk threshold. Emit a `dataset-workflow-handoff/v1` approval or
rejection reference; never execute the plan here.
