# Storage Backends — Research Note

**Issue:** #934 (configurable external `.aiwg` storage + memory backends)
**Date:** 2026-04-28
**Status:** Research input for design — feeds the ADR and design doc.
**Related artifacts:**
- `.aiwg/architecture/adr-configurable-storage-backends.md`
- `.aiwg/architecture/storage-design.md`
- `.aiwg/architecture/schemas/storage.config.v1.json`

---

## Purpose

Surface authoritative findings on each candidate storage backend so the design picks the right write path per backend, accounts for known caveats, and flags backends that need a research spike before adapter implementation.

Findings come from focused web research per backend, conducted 2026-04-28. Each claim is tagged **CONFIRMED** (cited), **ASSUMED** (general knowledge / reasonable extrapolation), or **UNKNOWN — needs spike**.

---

## Naming clarification — "Forte" → Fortemi (resolved)

The issue body lists *"Obsidian, Forte, Logseq, Notion, AnythingLLM, and similar"*. **"Forte" was confirmed by the issue author to refer to Fortemi** — the internal AIWG project: a Rust/PostgreSQL semantic memory system with SKOS hierarchies, pgvector embeddings, and W3C PROV tracking, documented at `.aiwg/planning/training-framework/phase-4-fortemi-review.md`.

The `fortemi` adapter is therefore a **first-party adapter** against the Fortemi MCP tool surface (`capture_knowledge`, `update_note`, `manage_concepts`, `bulk_reprocess_notes`). Resolution captured on issue #961.

---

## Backend matrix

| Backend | Storage shape | Best write path | AIWG fit | Phase |
|---|---|---|---|---|
| `fs` (default) | Local filesystem | `fs.writeFile` | Always — fallback | 1 |
| `obsidian` | Vault directory of `.md` + `.obsidian/` config | **Obsidian CLI** (Feb 2026 official) | High — markdown maps directly | 1 |
| `logseq` | Graph dir: `pages/`, `journals/`, `logseq/` | **HTTP API** at `localhost:12315/api` | High — markdown + properties | 2 |
| `notion` | Workspace pages / databases via REST | `POST /v1/pages` with `markdown` param | Medium — needs external_id dedup | 2 |
| `anythingllm` | Workspace folders, vector-indexed | Multipart upload to `POST /api/v1/document/upload` | Medium — RAG-only, async embed | 2 |
| `fortemi` (if intended) | Postgres + pgvector via MCP tool surface | `capture_knowledge` MCP tool or direct Postgres | High — first-party | 2 |
| `s3` | Object store | aws-sdk-js v3 | Bulk artifacts only | 3 |
| `webdav` | HTTP file protocol | `webdav` npm package | Bulk artifacts only | 3 |

---

## Per-backend findings

### `fs` (filesystem, default)

Trivial baseline — wraps `fs.promises.{readFile, writeFile, readdir, unlink}`. Honors `roots` overrides (e.g., redirect `memory` to `~/vaults/aiwg-memory`). All claims **CONFIRMED** by node API.

Caveats:
- Path resolution must reject `..` traversal at the adapter boundary.
- Permission errors must surface as adapter errors, not crashes.

### `obsidian`

| Aspect | Finding | Status |
|---|---|---|
| Vault layout | Directory of `.md` + hidden `.obsidian/` config dir. **Never clobber `.obsidian/`** | CONFIRMED [help.obsidian.md](https://help.obsidian.md/Files+and+folders/How+Obsidian+stores+data) |
| Direct fs writes | Work on disk, **but Obsidian's index/cache won't reliably see them** while it's running. Causes stale graph view, broken links until restart. | CONFIRMED |
| **Recommended path** | **Obsidian CLI** (official, released Feb 2026). Coordinates index, links, and Sync. | CONFIRMED [help.obsidian.md/cli](https://help.obsidian.md/cli) |
| URI scheme (`obsidian://`) | `obsidian://new`, `obsidian://open`, `obsidian://advanced-uri` (plugin). Useful for triggering reload, **not** as primary write path. | CONFIRMED |
| Frontmatter | YAML supported, but **graph view ignores frontmatter tags/links** — only inline `[[links]]` and `#tags` populate graph. | CONFIRMED |
| Plugin API | `app.vault.create(path, content)` — only viable if we ship a plugin. | CONFIRMED |
| Concurrency w/ Sync | 3-way merge for `.md`. External writes bypass — pause Sync or use CLI. | CONFIRMED |

**Adapter strategy:** shell out to `obsidian` CLI for writes; fall back to `fs.writeFile` if CLI unavailable, and warn that the user must restart Obsidian or run "Reload app without saving" to pick up changes.

### `logseq`

| Aspect | Finding | Status |
|---|---|---|
| Graph layout | `pages/<title>.md`, `journals/YYYY_MM_DD.md`, `logseq/` config | CONFIRMED |
| Direct fs writes | Work, but indexing delay + conflict risk while Logseq is running | ASSUMED |
| **Recommended path** | **HTTP API** at `http://localhost:12315/api` with bearer token (Settings → Features → Developer mode) | CONFIRMED |
| Property syntax | `property:: value` block-level — **not YAML frontmatter** | CONFIRMED |
| Block IDs | Auto-generated on load; do **not** write `id::` ourselves | CONFIRMED |
| **DB version** | As of April 2025, the DB-backed rewrite is still in development. File-backed graphs remain primary. DB version maintains backward compatibility with both modes. | CONFIRMED [discuss.logseq.com](https://discuss.logseq.com/t/backwards-compatibility-between-current-logseq-version-and-next-db/31306) |

**Adapter strategy:** prefer HTTP API; fall back to direct file writes if API server is disabled (with a warning). Property syntax required — markdown content must be transformed (no YAML frontmatter for Logseq).

### `notion`

| Aspect | Finding | Status |
|---|---|---|
| Auth | Internal integration token (`secret_…`) via env var **only**, never in config. OAuth for multi-workspace apps. | CONFIRMED [developers.notion.com](https://developers.notion.com/reference/authentication) |
| Page create | `POST /v1/pages` accepts a top-level `markdown` parameter (mutex with `children`). | CONFIRMED [Notion markdown guide](https://developers.notion.com/guides/data-apis/working-with-markdown-content) |
| Parent shape | Page-parent (nested page hierarchy) or data-source-parent (database row). API v2025-09-03: databases now contain *data sources*. | CONFIRMED |
| Rate limits | 3 req/s average; HTTP 429 + `Retry-After` | CONFIRMED [request-limits](https://developers.notion.com/reference/request-limits) |
| Block size | 2,000 chars/rich-text block; 1,000 blocks/request; 500KB payload | CONFIRMED |
| Upsert | **No native upsert.** Must store an `external_id` page property and look up before write. | CONFIRMED |
| File attachments | Multi-part upload, ≤20 MB free / ≤5 GB paid; files expire 1 hour if not attached. | CONFIRMED |

**Adapter strategy:** parent-page-per-subsystem (e.g., one Notion page "AIWG/memory" with child pages per artifact). Maintain client-side `external_id` (sha256 of subsystem+path) and `GET` before write to dedupe.

### `anythingllm`

| Aspect | Finding | Status |
|---|---|---|
| Project | Mintplex Labs AnythingLLM — Docker + Desktop, self-hosted RAG | CONFIRMED [github](https://github.com/Mintplex-Labs/anything-llm) |
| API | REST, OpenAPI at `/api/docs`; auth via API key from admin settings | CONFIRMED |
| Document upload | `POST /api/v1/document/upload` and `POST /api/v1/document/upload/:folderName` — **multipart only** | CONFIRMED |
| Raw text endpoint | **Not documented** — must wrap markdown into a multipart file upload | CONFIRMED |
| Embedding | Async via Collector service, queued automatically when `addToWorkspaces` set | CONFIRMED |
| Folders | Folder hierarchy supported per workspace; **tags not yet implemented** ([issue #3888](https://github.com/Mintplex-Labs/anything-llm/issues/3888)) | CONFIRMED |
| Self-hosted base URL | Fully configurable | CONFIRMED |

**Adapter strategy:** RAG-shaped target — write markdown as a multipart upload to `/api/v1/document/upload/:folder`, where folder = subsystem name. One-way flow (we write; user queries via AnythingLLM UI). No read-back parity for adapter `read()`/`query()` — those operations should fall through to the `fs` cache.

### `fortemi` (first-party — confirmed)

| Aspect | Finding | Status |
|---|---|---|
| Identity | Internal AIWG project: Rust + PostgreSQL + pgvector with SKOS, PROV, MRL embeddings | CONFIRMED [phase-4-fortemi-review.md](../planning/training-framework/phase-4-fortemi-review.md) |
| Write API | MCP tool surface (`capture_knowledge`, `update_note`, `manage_concepts`, `bulk_reprocess_notes`, …) | CONFIRMED (internal docs) |
| Auth | MCP host config | UNKNOWN — needs spike |
| Public docs | Not public | CONFIRMED |
| Maturity | Phase 4 review confirms "feasible with minor workarounds" | CONFIRMED |

**Adapter strategy:** call Fortemi via the MCP tool surface (the most stable contract); avoid direct Postgres connections from the adapter.

### `s3`

Use `@aws-sdk/client-s3` v3. PutObject for writes, GetObject for reads, ListObjectsV2 for listing. Auth via the AWS default credential chain — never accept `accessKeyId`/`secretAccessKey` in `storage.config`. **CONFIRMED.**

Use case: large artifacts (research corpus, media caches), **not** memory artifacts (latency too high, no full-text query). Phase 3.

### `webdav`

Use [`webdav`](https://www.npmjs.com/package/webdav) npm package. Endpoint URL + auth (basic or digest) loaded from env. **ASSUMED** — package is well-known but not exhaustively researched.

Use case: Nextcloud/ownCloud users wanting a remote ops mirror. Phase 3.

---

## Cross-cutting findings

### Direct file writes are the wrong default for live PKM apps
Both Obsidian and Logseq maintain in-memory caches that won't see external file writes reliably while the app is running. Both now expose **first-party programmatic interfaces** (Obsidian CLI, Logseq HTTP API) — the design must prefer those over `fs.writeFile`.

### Markdown is the lingua franca, but conventions diverge
- Obsidian: YAML frontmatter (graph view ignores it), `[[wikilinks]]`, `#tags`
- Logseq: `property:: value` block syntax, no YAML
- Notion: rich-text blocks (markdown converted at API boundary)
- AnythingLLM: any text format (extracts on ingest)

The adapter contract should accept **canonical markdown with YAML frontmatter** as input and let each adapter transform on the way out.

### Auth/credential handling is uniformly env-var-only
Every reviewed backend's auth model is compatible with "tokens live in env vars or OS keychain, never in `.aiwg/storage.config`." The schema must reject `token` / `password` / `secret` / `apiKey` keys at any nesting depth.

### Async ingest backends require a write-success contract
AnythingLLM, Notion (rate-limited), Fortemi (queue-based) — these don't synchronously confirm "the artifact is queryable now." The adapter `write()` must return when the backend has *accepted* the artifact, even if embedding/indexing happens later. Consumers expecting read-after-write parity (e.g., reflection-injection) need a fallback to the `fs` cache.

---

## Recommendations for the design doc

1. **Adapter interface should be minimal and synchronous-shaped** (`read`, `write`, `list`, `delete`). Optional `query` for backends that support it.
2. **Phase 1: `fs` + `obsidian` only.** Both are file-shaped, both have official tooling, both are well-understood. Prove the abstraction with one consumer migration (`activity-log`).
3. **Phase 2: PKM reach.** Logseq (HTTP API), Notion (REST), AnythingLLM (multipart), and Fortemi (MCP) — only after Phase 1 stabilizes. Logseq is the next-easiest after Obsidian.
4. **Phase 3: remote/bulk.** S3 and WebDAV — separate adapter pattern (no live-app coordination concerns).
5. **Always-on `.storage-cache/`** — when an external backend is unreachable, queue writes locally and surface a warning. Don't block consumers.
6. **No multi-target writes in v1.** "Write to fs AND obsidian simultaneously" adds complexity. Defer.

## Open questions surfaced by research

1. **Logseq DB version readiness** — when it ships, do we keep file-backed compatibility or fork the adapter? Defer to phase 2 implementation.
2. **Notion external_id strategy** — sha256(subsystem+path) is durable but opaque to humans browsing in Notion. Worth a UX review before building.
3. **AnythingLLM read parity** — for subsystems that need to *read* what was written (e.g., research corpus), AnythingLLM doesn't expose chunked read-back. Fall through to `fs`-cached copy.

---

*Sources cited inline. Generated 2026-04-28 via parallel web-research agents — see PR description for raw outputs.*
