# Hermes session acquisition

AIWG supports Hermes under canonical provider `hermes`, preferring the native export:

```sh
hermes sessions export session.jsonl --session-id <id> --redact
aiwg sessions import session.jsonl --provider hermes --source-id hermes-session
```

Hermes JSONL writes one full session per line. The adapter validates native schema 23
and exposes AIWG parser schema `1.0.0`. It preserves canonical session/message/tool
IDs, gateway routing identity, workspace and Git fields, compression lineage, archive
and inactive state, token and cost totals, model configuration, reasoning metadata,
opaque content, and additive unknown fields.

Active exports are provisional. Ended, archived, inactive, and provider-deleted
sessions are complete snapshots. Archive, compaction lineage, deletion of an exported
file, and deletion from Hermes remain separate metadata:

- archive hides a session while retaining messages and search data;
- compaction creates a continuation linked to its parent;
- removing an export does not affect `state.db`;
- `hermes sessions delete` removes provider data and is not invoked by AIWG.

## SQLite and local API fallback

Hermes's canonical `state.db` runs in WAL mode. AIWG rejects a raw database copy
because omitting or racing `state.db-wal` can yield a partial snapshot. A SQLite
fallback must first be created with SQLite's backup API and converted to the documented
snapshot JSONL form carrying `snapshotConsistency: "sqlite-backup"`.

A caller may instead inject a local Sessions API transport, but it remains unavailable
until explicitly configured and authorized with operation
`hermes.local.sessions.read`. The standard CLI import performs no network operations.

## Evidence and tested boundary

Verified 2026-07-27 against:

- [Hermes Sessions guide](https://hermes-agent.nousresearch.com/docs/user-guide/sessions/)
- [Hermes session-storage developer guide](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/session-storage.md)
- [Hermes CLI commands and consistent backup behavior](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/reference/cli-commands.md)

Synthetic fixtures cover schema-23 active/ended sessions, parent/compression lineage,
archived/inactive state, tools, opaque content, consistent and inconsistent snapshots,
unknown-major drift, malformed input, redaction, replay, and deletion limitations.
