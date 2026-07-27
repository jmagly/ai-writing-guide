# OpenClaw session ingestion

AIWG reads OpenClaw sessions through the Gateway or through an explicitly selected projection created from
a consistent SQLite backup. The Gateway is the source of truth, especially in remote mode. Raw
`openclaw-agent.sqlite` files are not accepted because copying a live WAL-backed database does not prove a
consistent view.

## Supported boundaries

- `openclaw-gateway-api`: negotiated read-only Gateway acquisition with explicit
  `openclaw.gateway.sessions.read` authorization.
- `openclaw-consistent-snapshot-jsonl`: schema-16/event-v3 projection carrying
  `snapshotConsistency: "sqlite-backup"`.
- `openclaw-bounded-history-jsonl`, `openclaw-html-projection-jsonl`, and
  `openclaw-trajectory-jsonl`: useful but explicitly incomplete projections.

The adapter preserves session windows, session-key/conversation mappings, event parent trees, model and
usage data, tool and media state, stable idempotency keys, recovery state, opaque event JSON, and
reset/fork/rewind/compaction lineage. Unknown schema-16 or event-v3 major successors fail closed.

## Explicit degraded states

Incognito capture reports `inaccessible` and cannot be streamed. A remote Gateway whose host identity does
not match the authorized host reports `degraded` and cannot be streamed. Bounded history, HTML, and
trajectory sources report `degraded`, `provisional`, and `lossless: false`; a history gap is never presented
as a complete transcript.

Deleting an AIWG copy does not mutate the Gateway or provider store. Reset history and archived transcripts
may remain in OpenClaw under its retention and disk-budget policy.

## Evidence and tested contract

Verified 2026-07-27 against:

- <https://docs.openclaw.ai/reference/session-management-compaction>
- <https://docs.openclaw.ai/gateway/protocol>
- <https://docs.openclaw.ai/session-tool>
- <https://docs.openclaw.ai/reference/path3-live-sqlite-e2e-harness>

AIWG adapter contract: `1.0.0`. Synthetic fixtures cover branch/reset/rewind/compaction, models, tools,
media, idempotency, recovery, active state, incognito, remote mismatch, projection gaps, malformed input,
schema drift, redaction, and deletion limitations.
