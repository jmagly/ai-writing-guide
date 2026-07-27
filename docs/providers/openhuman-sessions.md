# OpenHuman session ingestion

AIWG treats OpenHuman's schema-1 `session_raw/*.jsonl` transcript as the full-fidelity source. Thread and
turn-state rows are optional enrichment joined by `thread_id` and `request_id`; they never replace or
silently delete raw transcript events.

The adapter preserves event-parent relationships, repeated per-message provider/model/profile metadata,
provider or model changes, cumulative token and cost fields, compaction and interruption state, nested-agent
identity, tool failures, attachment placeholders, unknown fields, and source provenance. A live append-only
file is provisional. Unknown schema majors and mixed schemas fail closed.

Attachment placeholders remain explicitly `present` or `expired`; an expired attachment is not represented
as an empty present file. Thread deletion and raw-transcript deletion are separate timestamps. Deleting a
thread does not prove the raw transcript was removed, and deleting an AIWG copy does not mutate OpenHuman.

## Evidence and tested contract

Verified 2026-07-27 against:

- <https://github.com/tinyhumansai/openhuman/releases> (session_raw flattening, cold-boot turn-state
  restoration, and preserved message metadata)
- <https://github.com/tinyhumansai/openhuman/blob/main/src/openhuman/agent/harness/session/transcript.rs>
- <https://github.com/tinyhumansai/openhuman/blob/main/src/openhuman/agent/harness/tool_loop.rs>

AIWG adapter contract: `1.0.0`. Synthetic fixtures cover active append, compaction, interruption,
nested agents, repeated metadata and model changes, failed tools, present/expired attachments, thread-only
deletion, malformed input, mixed/unknown schemas, redaction, replay, and deletion limitations.
