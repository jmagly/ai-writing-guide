# Storage Backends — Overview

AIWG persists artifacts (memory pages, knowledge-base entries, activity log, reflections, provenance records, research corpus, sandbox identities) through a **pluggable storage adapter system**. By default everything lives on the local filesystem under `.aiwg/`. With one config file you can route any subsystem to:

- **Obsidian** vault — your AIWG memory becomes searchable via the graph
- **Logseq** graph — pages flow into your daily journal workflow
- **Fortemi** — first-party semantic-memory backend (Rust + Postgres + pgvector)
- A different filesystem location — heavy artifacts on a secondary drive
- Any future backend (S3, WebDAV, Notion, AnythingLLM — tracked, not yet shipped)

Each subsystem is configured independently. You can keep the activity log on local disk for compliance while routing memory pages into Obsidian and the research corpus to a network share.

## Quick start

If you do nothing, AIWG works exactly like before — every subsystem persists under `.aiwg/`.

To change behavior, create `.aiwg/storage.config`:

```json
{
  "$schema": "https://aiwg.io/schemas/storage.config.v1.json",
  "version": "1",
  "roots": {
    "research": "/mnt/archive/aiwg-research"
  },
  "backends": {
    "memory":      { "type": "obsidian", "vault": "~/vaults/main", "folder": "AIWG/memory" },
    "kb":          { "type": "logseq",   "graph": "~/.logseq/graphs/work" },
    "activity_log":{ "type": "fs" }
  }
}
```

Then verify:

```bash
aiwg storage show           # effective config + resolved paths
aiwg storage list-backends  # which adapters are READY vs STUB
aiwg storage test memory    # round-trip write/read/list/delete probe
```

## Subsystems

AIWG defines eight subsystems. Each one can be configured independently in `storage.config`.

| Subsystem          | Default location                              | What lives here                                          |
| ------------------ | --------------------------------------------- | -------------------------------------------------------- |
| `memory`           | `.aiwg/memory/`                               | Consumer-framework semantic memory (pages, lessons)      |
| `reflections`      | `.aiwg/reflections/`                          | Agent-loop reflections, ralph-reflect output             |
| `kb`               | `.aiwg/kb/`                                   | Knowledge-base entity/concept pages                      |
| `activity_log`     | `.aiwg/activity.log`                          | Cross-framework chronological event log                  |
| `provenance`       | `.aiwg/provenance/`                           | W3C PROV records                                         |
| `research`         | `.aiwg/research/`                             | Research corpus — papers, summaries, citations           |
| `media`            | `.aiwg/media/`                                | Media artifacts (curator framework)                      |
| `sandbox_identity` | `~/.config/aiwg/sandbox-agents.json`          | Persistent agent-instance identities (host-level)        |

## Configuration shape

`.aiwg/storage.config` is JSON, validated against `https://aiwg.io/schemas/storage.config.v1.json`.

```jsonc
{
  "version": "1",                         // required; v1 is the only currently-supported version
  "roots": {                              // optional path overrides for fs-backed subsystems
    "research": "/mnt/archive/aiwg-research"
  },
  "backends": {                           // optional per-subsystem backend selection
    "memory":      { "type": "obsidian", "vault": "~/vaults/main" },
    "kb":          { "type": "logseq",   "graph": "~/.logseq/graphs/work" },
    "activity_log":{ "type": "fs" }
  },
  "fallback": "cache_and_warn"            // optional: cache_and_warn (default) | block
}
```

- **`roots`** redirects the *physical filesystem location* of an `fs`-backed subsystem. No effect on non-`fs` backends.
- **`backends`** picks the adapter type per subsystem. Subsystems not listed default to `fs`.
- **`fallback`** controls behavior when an external backend is unreachable. `cache_and_warn` (default) queues writes under `.aiwg/.storage-cache/` and continues; `block` refuses the write.

Every backend's required fields are documented in `docs/storage/backends/<type>.md`.

## CLI surface

| Command                                            | Purpose |
| -------------------------------------------------- | ------- |
| `aiwg storage show`                                | Print the effective config and resolved physical paths per subsystem |
| `aiwg storage list-backends`                       | Inventory of compiled-in adapters with READY/STUB status |
| `aiwg storage test <subsystem>`                    | Round-trip write/read/list/delete probe — proves connectivity |
| `aiwg storage migrate <subsystem> --from … --to …` | Copy entries from one backend to another. See `docs/storage/migration.md` |
| `aiwg doctor`                                      | Validates `.aiwg/storage.config` (schema + credential walk + reachability probes) |

Per-subsystem CLIs route through the configured adapter:

| Command            | Subsystem        |
| ------------------ | ---------------- |
| `aiwg memory`      | `memory`         |
| `aiwg reflections` | `reflections`    |
| `aiwg kb`          | `kb`             |
| `aiwg activity-log`| `activity_log`   |
| `aiwg provenance`  | `provenance`     |
| `aiwg research-store` | `research`    |

Each one supports `path / list / get / put / delete / append-log` (where applicable). See per-skill documentation for usage.

## Security

The schema actively forbids credential-named properties at every nesting depth:

```
token, password, secret, apiKey, api_key,
accessKey, accessKeyId, secretAccessKey
```

Loading a `storage.config` containing any of these throws an error pointing at the offending path. **Tokens, passwords, and API keys must come from environment variables or your OS keychain**, never from `storage.config`.

See `docs/storage/security.md` for the full security model — credential handling, path traversal rejection, atomic writes, doctor validation.

## What's implemented vs deferred

| Backend       | Status      | Notes |
| ------------- | ----------- | ----- |
| `fs`          | READY       | Default; local filesystem |
| `obsidian`    | READY       | Direct fs writes against vault; refuses `.obsidian/` config dir |
| `logseq`      | READY       | Direct fs writes against graph; YAML→`property::` transform |
| `fortemi`     | READY (alpha) | Routes through Fortemi MCP tool surface |
| `notion`      | STUB (#959) | Planned — REST + external_id upsert |
| `anythingllm` | STUB (#960) | Planned — multipart upload + cache mirror |
| `s3`          | STUB (#962) | Planned — phase 3 (bulk artifacts) |
| `webdav`      | STUB (#963) | Planned — phase 3 (Nextcloud/ownCloud) |

`aiwg storage list-backends` shows the live status. Declaring a STUB backend in `storage.config` produces a clear error citing the tracking issue.

## Further reading

- `docs/storage/security.md` — credential handling, path safety, doctor validation
- `docs/storage/migration.md` — `aiwg storage migrate` walkthrough
- `docs/storage/backends/<type>.md` — per-backend setup, env vars, caveats
- `.aiwg/architecture/storage-design.md` — full design (adapter interface, subsystem registry, phasing)
- `.aiwg/architecture/adr-configurable-storage-backends.md` — decision record
- `.aiwg/architecture/schemas/storage.config.v1.json` — published JSON Schema
