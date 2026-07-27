# Devin Desktop session ingestion (`windsurf` compatibility ID)

AIWG retains `windsurf` as its stable provider compatibility ID, but the current product and documentation
surface is **Devin Desktop**. The former Windsurf Cascade Hooks URL redirects to Devin Docs. This adapter was
verified against the current Devin Desktop hook contract, not an archived standalone-Windsurf schema.

Ingestion is strictly opt-in. AIWG neither discovers nor edits system, user, or workspace hook
configuration. A user or administrator enables `post_cascade_response_with_transcript`, then explicitly
selects one of its JSONL outputs for import. The adapter does not read credentials or environment variables.

The transcript is treated as provisional even though each hook fires after a completed Cascade response:
it is not a live-token feed, does not prove complete historical capture, and Devin Desktop retains at most
100 transcript files before evicting the oldest by modification time. Records preserve trajectory and
execution IDs, timestamps, model labels, provider status, sensitive-content warnings, and unknown fields.
Unknown schema majors, mixed schemas, mixed trajectories, malformed steps, and ambiguous timestamps fail
closed. Legacy private protobuf stores remain unsupported.

The hook transcript can contain workspace files, command output, tool arguments, search results, rules, and
conversation history. AIWG records that warning as provenance; it does not inspect the transcript to seek
secrets. Normal repository redaction policy still applies to searchable projections.

## Current evidence

Verified 2026-07-27:

- <https://docs.devin.ai/desktop/cascade/hooks>
- <https://windsurf.com/switch/cursor>

The current hook contract names `trajectory_id`, `execution_id`, `timestamp`, `model_name`, and `tool_info`;
documents the `post_cascade_response_with_transcript` JSONL path and step shape; warns that step structures
may evolve; specifies `0600` transcript permissions; and documents the 100-file retention cap.
