# GitHub Copilot and VS Code session import

AIWG supports explicitly exported VS Code chat JSON. In VS Code, open the
session, run **Chat: Export Chat...**, select a destination, and import that
file:

```bash
aiwg sessions import chat.json \
  --provider copilot \
  --source-id copilot-export-1 \
  --workspace my-workspace
```

The supported adapter reads only the selected regular file. It does not scan
VS Code `workspaceStorage`, `state.vscdb`, JSON, or JSONL operation logs.
Those formats are version-dependent implementation details and the proposed
`chatSessionsProvider` API is not treated as a stable dependency.

## Preserved data and losses

The adapter preserves session/request IDs, prompts, response text, timestamps,
model identity, workspace/repository metadata, participants, sync state,
archive state, and unknown export fields. Structured non-Markdown response
parts are flattened into normalized text and reported in each event's
`metadataLoss` list; their unknown fields remain opaque extension data.
Active exports are complete snapshots of the export operation, but their
session lifecycle remains active.

## Sync, archive, and deletion

Sync, archive, and deletion are separate states. Session sync can be enabled,
disabled, excluded by repository, blocked by policy, in progress, or failed.
Archiving hides a session but does not delete it. Provider deletion may target
local and cloud data or cloud data only. AIWG import and purge never claim to
perform either provider-side deletion.

To forget the AIWG-owned copy, use `aiwg sessions delete` for a reversible
tombstone or `aiwg sessions purge` for previewed terminal local cleanup.

## Evidence and tested contract

- Evidence reviewed: 2026-07-27
- AIWG adapter: `1.0.0`
- Supported normalized export schema major: `1`
- Synthetic fixtures only; no user transcript or credential material
- [VS Code chat-session export documentation](https://code.visualstudio.com/docs/chat/chat-sessions#_export-a-chat-session-as-a-json-file)
- [VS Code Copilot session-sync documentation](https://code.visualstudio.com/docs/agents/sessions/session-sync)

Unknown export major versions fail before normalized persistence. Malformed
exports and workspace-store locator classes also fail closed.
