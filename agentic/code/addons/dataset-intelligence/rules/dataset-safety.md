---
enforcement: high
paths: ["agentic/code/addons/dataset-intelligence/**", "schemas/dataset/**", "src/dataset/**", ".aiwg/**"]
---

# Dataset Safety and Authority

All dataset execution delegates to the shared `aiwg dataset` orchestration
service. Skills, agents, flows, and provider wrappers MUST NOT enumerate or
mutate sources, implement connectors, advance checkpoints, write indexes, or
delete artifacts themselves.

Before policy-sensitive or destructive work, require a bounded preview, an
immutable plan with impact counts and artifact classes, and approval scoped to
its digest. Retirement and deletion require complete enumeration, tombstones by
default, a reviewed bulk threshold, and a reconciliation receipt. Cancellation
must preserve the last committed checkpoint and report partial attempts.

Credential references are opaque and write-only. Never request, inspect, echo,
log, serialize, test, or transmit credential or environment values. Redact
source samples unless explicitly allowlisted.

Canonical source data and canonical dataset revisions remain distinct from
derived indexes, graphs, embeddings, caches, exports, and Fortemi shards.
Derived artifacts must be labeled with freshness and verification state and be
regenerable from recoverable canonical material.

Required capability absence fails closed. Optional fallback must be explicit in
the reviewed plan and receipt, state changed guarantees, age, and reason, and
must never imply unsupported backend maturity. Offline means zero network
attempts. Preserve plan, run, checkpoint, verification, evidence, approval, and
cancellation references at every handoff.
