# OpenCode session ingestion

AIWG prefers an explicitly selected `opencode export <sessionID>` JSON document for durable or closed
sessions. Active sessions can be acquired from an explicitly authorized loopback OpenCode server through
the session HTTP API or its Server-Sent Events stream. Direct access to OpenCode's internal SQLite storage
is intentionally not part of the normal adapter.

## Supported boundaries

- `opencode-export-json`: bounded JSON produced by the OpenCode export command.
- `opencode-local-api`: a negotiated transport for an authorized local session snapshot.
- `opencode-sse-jsonl`: an explicitly captured `/event` SSE stream represented as JSONL.
- `opencode-live-sse`: a negotiated transport for an authorized local event stream.

The adapter preserves project and directory classification, native session/message/part relationships,
model identity, cost and token maps, tool state, attachment metadata, sharing state, sanitization evidence,
and unknown fields. Active API/SSE data is provisional. Unknown schema majors fail closed.

## Privacy and deletion

OpenCode exports can be sanitized, so missing native fields are recorded as an export limitation rather
than inferred. A shared session is public to anyone with its link until it is unshared. Deleting an AIWG
copy neither unshares the session nor deletes OpenCode's provider copy; use `/unshare` and OpenCode's own
session deletion controls separately.

## Evidence and tested contract

Verified 2026-07-27 against:

- <https://opencode.ai/docs/cli/> (`opencode export`, `opencode import`, session commands)
- <https://opencode.ai/docs/share/> (share modes, public-link retention, `/unshare`)
- <https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/server/routes/session.ts>
- <https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/message-v2.ts>

AIWG adapter contract: `1.0.0`. Synthetic fixtures cover complete and active exports, API/SSE identity,
tools, reasoning, attachments, malformed input, schema drift, redaction, sharing, and deletion limits.
