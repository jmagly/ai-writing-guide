# Cursor session acquisition

AIWG supports three explicit Cursor surfaces under canonical provider `cursor`:

| Surface | Locator class | Fidelity |
| --- | --- | --- |
| Agent CLI `--output-format stream-json` capture | `cursor-cli-stream-json` | Structured messages, tool calls/results, cwd, model, permission mode, session and request IDs |
| Cloud Agents API v1 event capture | `cursor-cloud-events-jsonl` | Structured agent/run status, SSE event IDs, reconnect provenance, cancellation, archive, unarchive, and deletion |
| Editor **Export Chat** Markdown | `cursor-editor-markdown` | Message text and roles only; explicitly lossy |

Import an explicitly selected file:

```sh
aiwg sessions import ./run.jsonl --provider cursor --source-id cursor-run
aiwg sessions import ./run.cloud.jsonl --provider cursor --source-id cursor-cloud-run
aiwg sessions import ./chat.md --provider cursor --source-id cursor-editor-chat
```

The adapter does not search Cursor directories. It also does not read the editor's
undocumented SQLite history database. Cursor documents that history as local SQLite,
but directs users to export chats as Markdown for preservation; AIWG therefore keeps
SQLite unsupported rather than silently depending on a private schema.

## Version and consistency policy

- Adapter and normalized source schema tested: `1.0.0`.
- CLI and Cloud JSONL accept additive unknown fields and retain them as source metadata.
- An explicitly declared unknown major schema fails closed before normalized state is written.
- CLI streams remain provisional until a successful terminal `result` event.
- Cloud streams remain provisional until a terminal run, archive, or delete event.
- Markdown is a completed manual snapshot, but never supplies timestamps, model,
  tools, native lifecycle, or native session IDs that the export does not contain.

Cursor documents that stream JSON is NDJSON, that assistant deltas must be
concatenated, that tool call IDs correlate start/completion, and that fields may be
added compatibly. Cloud Agents v1 documents SSE event IDs and `Last-Event-ID`
reconnection, run-scoped cancellation, and distinct archive/unarchive/permanent-delete
operations. AIWG records those states; importing or deleting AIWG's copy never invokes
provider lifecycle endpoints.

## Evidence

Verified 2026-07-27 against:

- [Cursor CLI output format](https://docs.cursor.com/en/cli/reference/output-format)
- [Cursor chat history and Markdown preservation](https://docs.cursor.com/en/agent/chat/history)
- [Cursor SDK and Cloud Agents v1 lifecycle announcement](https://cursor.com/changelog/sdk-release)
- [Cursor data use and privacy controls](https://cursor.com/data-use)

All fixtures are synthetic. They cover complete and provisional streams, malformed
input, unknown-major drift, unknown-field preservation, redaction, reconnect/cancel,
and the distinction between archive, restore, and irreversible provider deletion.
