# Storage Backends — Security Model

Three concerns drive the storage abstraction's security design:

1. **Credentials must never live on disk in config.**
2. **Path traversal must be impossible** — agents writing through the adapter cannot escape the configured root.
3. **Concurrent writes must not corrupt files.**

## 1. Credentials are env-var-only

`.aiwg/storage.config` is checked into git on most projects. It would be wrong to put `secret` or `apiKey` there — even one accidental commit pushes the credential into history.

The schema (`https://aiwg.io/schemas/storage.config.v1.json`) **actively rejects** credential-named properties at every nesting depth. The forbidden property names are:

```
token, password, secret, apiKey, api_key,
accessKey, accessKeyId, secretAccessKey
```

Loading a `storage.config` containing any of these throws an error pointing at the offending property path. This catches both the obvious case (`{ "backends": { "memory": { "token": "…" } } }`) and the sneaky case (`{ "backends": { "memory": { "extras": [{ "apiKey": "…" }] } } }`).

`aiwg doctor` runs the same recursive walk on the loaded config as defense-in-depth — schema validation alone can be bypassed by hand-rolled config edits.

### Where credentials *do* come from

Each backend documents its env-var (and optional OS-keychain) requirements:

| Backend        | Env var(s)                                                            |
| -------------- | --------------------------------------------------------------------- |
| `fs`           | none                                                                  |
| `obsidian`     | none (file-system access governed by OS permissions)                  |
| `logseq`       | `LOGSEQ_API_TOKEN` (only when `useApi: true`)                         |
| `notion`       | `NOTION_API_TOKEN` *(planned, #959)*                                  |
| `anythingllm`  | `ANYTHINGLLM_API_KEY` *(planned, #960)*                               |
| `fortemi`      | governed by AIWG MCP server config, not by `storage.config`           |
| `s3`           | AWS default credential chain *(planned, #962)*                        |
| `webdav`       | `AIWG_WEBDAV_USER` + `AIWG_WEBDAV_PASSWORD` or `AIWG_WEBDAV_TOKEN` *(planned, #963)* |

`aiwg storage list-backends` reports each backend's status. `aiwg doctor` does a reachability probe and reports clearly when a required env var is unset.

## 2. Path traversal rejection

Every adapter validates subsystem-relative paths at the boundary. The same five rules apply across `fs`, `obsidian`, and `logseq`:

| Rejected pattern         | Example          | Why                              |
| ------------------------ | ---------------- | -------------------------------- |
| `..` segments            | `../etc/passwd`  | Escapes subsystem root           |
| Leading `/`              | `/etc/passwd`    | Absolute path                    |
| Leading `~`              | `~/secrets.md`   | Home expansion                   |
| Backslashes              | `a\\b.md`        | Windows separator (POSIX bug)    |
| Empty                    | `""`             | Ambiguous                        |

Additionally, file-shaped backends refuse to touch the host application's config directory:
- `obsidian` rejects any path resolving into `<vault>/.obsidian/` — for read, write, delete, AND list (skipped during walk).
- `logseq` rejects any path resolving into `<graph>/logseq/`.

These rejections are tested per-adapter; see `test/unit/storage/{fs,obsidian,logseq}.test.ts`.

## 3. Atomic writes

Three places use atomic write-then-rename (or `O_APPEND`) semantics:

- **`fs` adapter `append()`** — uses Node's `fs.appendFile` which opens with `O_APPEND`. The kernel guarantees atomicity for writes ≤ `PIPE_BUF` (4096 bytes on Linux), which means concurrent appenders interleave at line granularity rather than racing read-then-write. (#976)
- **`aiwg activity-log append`** — prefers `adapter.append` when available; falls back to read-then-write only on backends that don't expose append.
- **`sandbox-registry` identity store** — writes to `<path>.tmp.<pid>` first, then renames onto the live path. SIGINT during save can no longer leave a half-written JSON file. (#969)

Async backends (Notion, AnythingLLM, Fortemi) have their own concurrency models and don't expose `append()`. The read-then-write fallback is harmless on them since they'd serialize requests at the API layer anyway.

## Defense in depth — `aiwg doctor`

`aiwg doctor` runs four checks on `.aiwg/storage.config`:

1. **Schema validation** — JSON Schema v1 conformance.
2. **Credential walk** — recursively rejects any property named in the forbidden list above.
3. **Reachability probe** — best-effort ping per backend (e.g., `obsidian --version`, `GET /api/v1/system` for AnythingLLM, vault existence for `obsidian`).
4. **Roots existence** — checks each `roots.<subsystem>` path actually exists for `fs` backends.

Failures print the property path, the issue, and a remediation hint. Run `aiwg doctor` after every `storage.config` edit and at the start of long sessions.

## What this *does not* protect against

- **An attacker with write access to your `storage.config`** can redirect AIWG writes anywhere on the filesystem (within the configured root rules). Treat `storage.config` like any other build-config file — review changes in PRs.
- **A misconfigured external backend** (wrong vault path, wrong workspace ID) writes to the wrong place. AIWG can't validate semantic correctness — only structural. Run `aiwg storage test <subsystem>` after any config change.
- **Backend-side authentication misconfiguration** (e.g., an Obsidian sync client also writing to the same vault folder) is outside AIWG's scope.

## Reporting issues

Security concerns about the storage system: file an issue at https://git.integrolabs.net/roctinam/aiwg/issues with the `security` label, or follow the project's responsible-disclosure process.
