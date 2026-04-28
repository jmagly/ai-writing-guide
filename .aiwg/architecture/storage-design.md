# Storage Adapter Design — Configurable `.aiwg/` + PKM Backends

**Issue:** #934
**Status:** Proposed (design pass; no code yet)
**Date:** 2026-04-28
**Inputs:**
- Research: `.aiwg/architecture/research/storage-backends.md`
- Schema: `.aiwg/architecture/schemas/storage.config.v1.json`
- ADR: `.aiwg/architecture/adr-configurable-storage-backends.md`

---

## 1. Goals and non-goals

### 1.1 Goals

1. **Configurable physical location** for `.aiwg/` subtrees, so heavy artifact trees (research corpus, media caches) can live on secondary drives or network shares while small config/metadata stays in the repo.
2. **Per-subsystem backend routing**, so memory artifacts can flow into Obsidian / Logseq / Notion / AnythingLLM / Fortemi while activity logs and provenance remain on the local filesystem.
3. **Backend abstraction**, so consumers (`activity-log`, `kb-ingest`, `memory-ingest`, `ralph-memory`, `reflection-injection`, `memory-log-append`, `sandbox-registry`) write through a single interface instead of calling `fs.promises` directly.
4. **Non-breaking**: absence of `storage.config` is a no-op — existing projects keep working unchanged.
5. **Credentials never on disk**: the schema rejects `token`/`password`/`secret`/`apiKey`/`accessKey` keys at every level. All credentials come from environment variables or the OS keychain.

### 1.2 Non-goals (v1)

- **Multi-target writes** (write to fs *and* obsidian simultaneously). Adds correctness concerns; defer.
- **Cross-backend migration of existing artifacts**. The `aiwg storage migrate` CLI is in scope, but bulk re-embed for Notion/AnythingLLM/Fortemi is phase 3.
- **Read-after-write parity for async backends.** AnythingLLM, Notion (rate-limited), Fortemi all queue. Adapter `read()` falls through to a local cache for these backends.
- **Live sync from the backend back to AIWG**. We write into the backend; the user consumes through the backend's UI. No bidirectional propagation.

---

## 2. Adapter interface

```ts
// src/storage/types.ts

export type SubsystemKey =
  | 'memory'
  | 'reflections'
  | 'kb'
  | 'activity_log'
  | 'provenance'
  | 'research'
  | 'media'
  | 'sandbox_identity';

export interface StorageEntry {
  /** Adapter-relative path. Always forward-slash-separated. */
  path: string;
  /** Bytes for fs/s3/webdav; undefined for backends without a meaningful size. */
  size?: number;
  /** Last-modified time when the backend reports one. */
  modifiedAt?: Date;
  /** Backend-specific opaque handle (e.g., Notion page ID, Logseq block UUID). */
  externalId?: string;
}

export interface WriteMeta {
  /** Optional content-type hint for backends that care (Notion blocks, S3 objects). */
  contentType?: string;
  /** Frontmatter / properties forwarded to PKM backends. Adapters transform. */
  frontmatter?: Record<string, unknown>;
}

export interface StorageAdapter {
  /** Returns `null` when the path does not exist. Throws on permission/transport errors. */
  read(path: string): Promise<string | null>;

  /** Idempotent. Overwrites by default. */
  write(path: string, content: string, meta?: WriteMeta): Promise<void>;

  /** Returns entries whose path starts with `prefix`. Empty prefix lists everything. */
  list(prefix: string): Promise<StorageEntry[]>;

  /** No-op when the path does not exist. */
  delete(path: string): Promise<void>;

  /** Optional. Backends without server-side query (fs, s3, webdav) omit this. */
  query?(q: string): Promise<StorageEntry[]>;

  /** Lifecycle. Adapters may open connections / authenticate here. */
  init?(): Promise<void>;

  /** Lifecycle. Adapters release resources here. */
  close?(): Promise<void>;
}
```

### 2.1 Why a tiny interface

- Every reviewed backend can implement these four methods. A wider interface (transactions, batch ops, metadata listing) doesn't fit Notion's REST shape or AnythingLLM's multipart-only ingest.
- Optional `query` lets RAG-shaped backends (AnythingLLM, Fortemi) advertise full-text/semantic search without forcing every backend to fake it.

### 2.2 Resolution

```ts
// src/storage/index.ts
export function resolveStorage(subsystem: SubsystemKey): StorageAdapter;
```

`resolveStorage`:
1. Loads `.aiwg/storage.config` (or returns the `fs`-rooted default).
2. Picks the backend declared for `subsystem`, or the `fs` fallback.
3. Applies `roots[subsystem]` for `fs` backends to redirect the physical path.
4. Returns a memoized adapter instance per subsystem.

### 2.3 Path semantics

All paths the consumer passes are **subsystem-relative** with forward slashes. The adapter is responsible for translating:

- `fs`: `<root>/<path>`
- `obsidian`: `<vault>/<folder>/<path>` (with `.md` extension preserved)
- `logseq`: `pages/<slug>.md` or `journals/YYYY_MM_DD.md` based on path shape
- `notion`: child page under the configured parent, page title = basename(path)
- `anythingllm`: file name = path with slashes flattened to `__`
- `fortemi`: passed as a `note_id` to `capture_knowledge`
- `s3`: `<prefix>/<path>` as the object key
- `webdav`: appended to the configured URL

Adapters must reject paths containing `..`, leading `/`, or backslashes.

---

## 3. Configuration

### 3.1 File location

`.aiwg/storage.config` (project-local). Project-scoped because the `.aiwg/` directory it governs is project-scoped.

### 3.2 Schema

See `.aiwg/architecture/schemas/storage.config.v1.json`. Top-level shape:

```jsonc
{
  "$schema": "https://aiwg.io/schemas/storage.config.v1.json",
  "version": "1",
  "roots": {
    "research": "/mnt/archive/aiwg-research",
    "media": "/mnt/archive/aiwg-media"
  },
  "backends": {
    "memory":       { "type": "obsidian", "vault": "~/vaults/main", "folder": "AIWG/memory" },
    "reflections":  { "type": "obsidian", "vault": "~/vaults/main", "folder": "AIWG/reflections" },
    "kb":           { "type": "logseq",   "graph":  "~/.logseq/graphs/work" },
    "activity_log": { "type": "fs" },
    "provenance":   { "type": "fs" }
  },
  "fallback": "cache_and_warn"
}
```

### 3.3 Validation

`aiwg doctor` runs:
1. JSON Schema validation against `storage.config.v1.json`.
2. **Recursive credential walk** — refuses to load any config containing a property named `token`, `password`, `secret`, `apiKey`/`api_key`, `accessKey`/`accessKeyId`, or `secretAccessKey` at any depth.
3. **Backend reachability probe** for each backend (best-effort: `obsidian --version`, `GET /api/v1/system` for AnythingLLM, etc.).
4. **Roots existence** check for `fs` backends.

Failures are reported with the property path, line/col, and a remediation hint.

---

## 4. Subsystem inventory

| Subsystem | Default root | Current direct-fs callers | Migration scope |
|---|---|---|---|
| `memory` | `.aiwg/memory/` | `agentic/code/addons/ralph/skills/ralph-memory/`, `agentic/code/frameworks/sdlc-complete/skills/memory-{ingest,lint,query-capture,log-append}/` | Phase 1.5 — migrate after `activity_log` proves the abstraction |
| `reflections` | `.aiwg/reflections/` | `agentic/code/addons/ralph/skills/{ralph-reflect,reflection-injection}/` | Phase 1.5 |
| `kb` | `.aiwg/kb/` | `agentic/code/addons/aiwg-utils/skills/kb-{ingest,health}/` | Phase 1.5 |
| `activity_log` | `.aiwg/activity.log` | `agentic/code/addons/aiwg-utils/skills/activity-log/` | **Phase 1 — first migrated consumer (smallest surface area)** |
| `provenance` | `.aiwg/provenance/` | research-complete provenance skills | Phase 2 |
| `research` | `.aiwg/research/` | `agentic/code/frameworks/research-complete/` | Phase 2 |
| `media` | `.aiwg/media/` | `agentic/code/frameworks/media-curator/` | Phase 3 |
| `sandbox_identity` | `~/.config/aiwg/sandbox-agents.json` | `src/serve/sandbox-registry.ts` | Phase 2 (touches a different consumer pattern — single file vs many) |

---

## 5. Backend implementation notes

The research note (`.aiwg/architecture/research/storage-backends.md`) carries citations and confirmed/assumed flags. This section captures the resulting *strategy* per adapter.

### 5.1 `fs` (default)

- Wraps `fs.promises.{readFile, writeFile, readdir, stat, unlink}`.
- Honors `roots[subsystem]` overrides.
- Path traversal rejection at the boundary.

### 5.2 `obsidian`

- Prefer the official Obsidian CLI (Feb 2026) for writes; falls back to direct fs writes with a warning if `obsidian` is not on PATH.
- Vault config (`.obsidian/`) is never touched.
- Frontmatter forwarded as YAML.
- `query()` not implemented (Obsidian's search is not exposed via the CLI as of research date).

### 5.3 `logseq`

- Prefer the HTTP API at `http://127.0.0.1:12315/api` with `LOGSEQ_API_TOKEN` env.
- Falls back to file writes under `pages/` and `journals/` if `useApi: false` or API unreachable.
- Frontmatter is *transformed* into Logseq `property:: value` block syntax (not YAML).
- Block IDs (`id::`) are never written by AIWG.

### 5.4 `notion`

- `NOTION_API_TOKEN` env var.
- `parent` is either a page ID (creates child pages) or a database ID (creates rows).
- **External-id-based upsert**: the adapter computes `external_id = sha256(subsystem + ':' + path)` and stores it in the configured `externalIdProperty`. `write()` first queries for an existing page with that external_id; updates if found, creates if not.
- Bulk operations rate-limited to ≤3 req/s with exponential backoff on 429.
- `query()` implemented via Notion search.

### 5.5 `anythingllm`

- API key via env (`ANYTHINGLLM_API_KEY`); base URL from config.
- `write()` wraps content in a multipart upload to `POST /api/v1/document/upload/<folder>`. Folder defaults to subsystem name.
- Embedding is async — `write()` returns when the upload is accepted, not when it's queryable.
- `read()` and `list()` fall through to a local `.aiwg/.storage-cache/anythingllm/<subsystem>/` mirror, since AnythingLLM does not expose chunked read-back.
- `query()` implemented via the chat-thread query API.

### 5.6 `fortemi` (first-party)

- Calls Fortemi via the configured MCP server; tools used: `capture_knowledge`, `update_note`, `manage_concepts`, `bulk_reprocess_notes`.
- `note_id` derived from `subsystem + ':' + path`.
- SKOS `scheme` from config used to scope the subsystem's notes.
- `query()` implemented via Fortemi's semantic search MCP tool.
- "Forte" in the originating issue body confirmed (#961) to refer to Fortemi.

### 5.7 `s3`

- `@aws-sdk/client-s3` v3.
- Auth via the AWS default credential chain (env, instance profile, SSO, etc.) — never from `storage.config`.
- For research/media subsystems primarily; not for memory artifacts (latency, no full-text query).

### 5.8 `webdav`

- `webdav` npm package.
- `AIWG_WEBDAV_USER`/`AIWG_WEBDAV_PASSWORD` or `AIWG_WEBDAV_TOKEN` env vars.
- Same use case as `s3`: bulk artifacts, not memory.

---

## 6. Failure modes and the local cache

`fallback: cache_and_warn` is the default. Behavior when a backend `write()` fails:

1. Write to `.aiwg/.storage-cache/<backend>/<subsystem>/<path>` instead.
2. Append a record to `.aiwg/.storage-cache/queue.jsonl` describing the failed write.
3. Surface a warning to the user via the calling consumer's normal logging.
4. **Do not throw** — the consumer has acted as if the write succeeded.

A separate `aiwg storage flush` command (out of scope for v1, but worth filing) drains the queue back to the live backend when reachable.

`fallback: block` causes `write()` to throw on transport failure — appropriate for compliance-sensitive subsystems where silent caching is wrong.

---

## 7. CLI surface

| Command | Purpose |
|---|---|
| `aiwg storage show` | Print the effective config and resolved physical paths per subsystem. |
| `aiwg storage list-backends` | Inventory of compiled-in adapters with their version + reachability status. |
| `aiwg storage test <subsystem>` | Round-trip read/write/list/delete through the configured backend; reports each step. |
| `aiwg storage migrate <subsystem> --from <type> --to <type> [--dry-run]` | Move existing artifacts across backends. |
| `aiwg doctor` | Existing command — extended to validate `storage.config`. |

---

## 8. Migration plan

### 8.1 Phase 1 — foundation (no consumer change)

1. Schema published at `aiwg.io/schemas/storage.config.v1.json`.
2. `StorageAdapter` interface + `resolveStorage()` implemented.
3. `fs` backend (the only backend) lands.
4. `aiwg storage show/list-backends/test` CLI lands.
5. `aiwg doctor` validates `storage.config` (or its absence).
6. **No consumer migration yet.** The interface ships unused; `storage.config` always uses `fs`.

### 8.2 Phase 1.5 — first consumer migration

Migrate `activity-log` to use `resolveStorage('activity_log')`. This is the smallest consumer (one append-only file) and exercises:
- Path resolution
- Write idempotency
- The `cache_and_warn` fallback path

When `backends.activity_log.type === 'fs'` (default), output must be byte-identical to the legacy direct-write behavior.

### 8.3 Phase 2 — PKM reach

Adapters land in this order, lowest-friction first:

1. `obsidian` (file-shaped, has CLI)
2. `logseq` (file-shaped, has API)
3. `fortemi` (first-party MCP)
4. `notion` (REST + upsert complexity)
5. `anythingllm` (RAG-shaped, async)

Consumer migrations follow the same order, one PR per consumer:

1. `kb` (small, single skill cluster)
2. `memory` subsystem (`memory-{ingest,lint,log-append,query-capture}`)
3. `ralph-memory` and `reflection-injection`
4. `provenance`
5. `sandbox_identity`

### 8.4 Phase 3 — remote/bulk

`s3` and `webdav` adapters. `research` and `media` consumers migrated. `aiwg storage migrate` ships in this phase.

---

## 9. Security boundaries

1. **Schema-level credential rejection** — JSON Schema forbids `token`/`password`/`secret`/`apiKey`/`accessKey`/`accessKeyId`/`secretAccessKey` at every nesting depth via the `noCredentials` definition.
2. **Runtime credential walk** — `aiwg doctor` recursively walks the parsed config and rejects any property whose name is in the credential blocklist (defense in depth, since users can extend types).
3. **Path traversal rejection at the adapter boundary** — every adapter rejects paths containing `..`, leading `/`, or backslashes.
4. **Token logging prohibition** — adapters must never log token values. CI grep should add a pattern check.
5. **OS keychain integration** — out of scope for v1 (env-var only); track as a follow-up.

---

## 10. Open questions and risks

1. **Logseq DB version** — when it ships, the file-write fallback needs a re-check. Tracked as a phase-2 follow-up.
2. **Notion external_id UX** — the `External ID` page property is opaque to humans browsing in Notion. Worth a UX review before phase 2.
3. **AnythingLLM read parity** — for subsystems that need to *read* what was written, the cache fall-through doubles disk usage. Acceptable; document.
4. **Backend reachability at session start** — `aiwg session` health check should probe declared backends and warn early. Tracked as a follow-up.

---

## 11. References

- Issue #934 (parent feature spec)
- `.aiwg/architecture/research/storage-backends.md` (research with citations)
- `.aiwg/architecture/schemas/storage.config.v1.json` (schema)
- `.aiwg/architecture/adr-configurable-storage-backends.md` (decision record)
- Sub-issues filed against this design: see the closing comment on #934.
