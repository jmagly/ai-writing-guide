# Warp session import

Warp supports explicit, lossy import from a user-selected Markdown conversation export. In Agent Mode run
`/export-to-file`, review the resulting `.md` file, then pass that file to `aiwg sessions import`.

AIWG does not discover, open, or reverse-engineer Warp's internal SQLite or protobuf stores. Internal-store
source classes fail with remediation directing the user back to `/export-to-file`.

Markdown does not prove native session or event IDs, timestamps, model identity, structured tool calls,
attachment structure, token usage, cost, workspace, or lineage. Every normalized event therefore carries an
explicit loss report and a stable AIWG-derived session identity that is never represented as Warp-native.
Lifecycle is `unknown-at-import` unless the selected export contains explicit completion evidence, in which
case it is `completed-at-import`.

Deleting an AIWG copy or the exported file does not delete the Warp conversation. Provider deletion state
remains unknown.

## Evidence and tested contract

Verified 2026-07-27 against:

- <https://docs.warp.dev/agent-platform/capabilities/slash-commands> (`/export-to-file` and
  `/export-to-clipboard`)
- <https://docs.warp.dev/agent-platform/local-agents/interacting-with-agents>

AIWG adapter contract: `1.0.0`. Synthetic fixtures cover recognized role headings, explicit/unknown
lifecycle, loss reporting, unsupported internal stores, malformed input, unknown schemas, redaction,
replay, and deletion limitations.
