---
namespace: aiwg
name: dataset-intelligence
description: Route any dataset, custom indexing, traceability, provenance, lineage, synchronization, or retirement request through one governed workflow. Use when a user points AIWG at data and wants an outcome without knowing schema or indexing terminology.
version: 1.0.0
platforms: [all]
kernel: true
aliases: [dataset, data steward, data onboarding, custom indexing, dataset workflow]
triggers: [use this data, make this searchable, index my files, build a knowledge index, trace this dataset, show data provenance, sync this source, retire this dataset, point AIWG at data]
---

# Dataset Intelligence Router

Ask only for the source path or URI and desired outcome if they are not already
present. Do not require the user to choose a schema, adapter, backend, index, or
provenance vocabulary.

1. Invoke `dataset-intake` and return a concise recommendation containing:
   assumptions, rationale, privacy/locality/network implications, materialized
   artifacts, and safe defaults.
2. Route assessment to `dataset-source-assess`, capability composition to
   `dataset-capability-recommend`, and approval preparation to
   `dataset-plan-review`.
3. Route an approved plan to `dataset-ingest`; route inspection to
   `dataset-trace` or `dataset-verify`; route portable output to
   `dataset-export`; route removal to `dataset-retire`.
4. Carry stable intake, plan, run, checkpoint, approval, verification, and
   evidence references between phases. Never rely on conversation state as the
   record of authority.

Every operational step delegates to `aiwg dataset`. This router must not read a
source, execute a connector, write an index, advance a checkpoint, or delete
data. Indexes and Fortemi shards are derived, never canonical persistence.

SDLC, research, knowledge-base, media, marketing, ops, and project-local callers
all use the same intake and handoff contracts; domain additions are namespaced.
