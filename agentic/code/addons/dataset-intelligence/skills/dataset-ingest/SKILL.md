---
namespace: aiwg
name: dataset-ingest
description: Delegate approved one-shot or incremental dataset execution to the shared orchestration service with resumable receipts.
version: 1.0.0
platforms: [all]
aliases: [run dataset plan, materialize dataset, resume ingest, synchronize dataset]
triggers: [ingest the dataset, run the approved plan, resume dataset sync, update this index, continue ingestion]
---

# Dataset Ingest

Require the approved immutable plan reference and matching approval reference.
Delegate only through `aiwg dataset ingest <plan-id> --digest <plan-digest>
--idempotency-key <key> --json`, adding only reviewed `--approve` and
reconciliation bindings. For an incremental continuation, use `retry <run-id>`
when the orchestration service reports the run retryable; never decode or advance a cursor here.

Surface run ID, status, cancellation affordance, prior and new committed
checkpoint references, rejections, degraded behavior, and receipt reference.
Cancellation must preserve the last committed checkpoint. Hand the run/receipt
references to `dataset-verify` and, when requested, `dataset-trace`.
