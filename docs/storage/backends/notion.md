# Backend: `notion` (planned)

Status: **STUB** — not yet implemented. Tracked at [#959](https://git.integrolabs.net/roctinam/aiwg/issues/959).

Declaring `{ "type": "notion", … }` in `.aiwg/storage.config` today produces a clear error: `storage: backend "notion" is declared in storage.config but not yet implemented.`

## Planned design

When implemented, the Notion adapter will:

- Use `POST /v1/pages` with the `markdown` parameter for direct Markdown ingestion
- Authenticate via `NOTION_API_TOKEN` (env var only — never in config)
- Support both page-parent (nested page hierarchy) and database-parent (database row) modes
- Implement upsert via an `external_id` page property: `external_id = sha256(subsystem + ':' + path)`. Before each write, the adapter queries for an existing page with the same external_id; updates if found, creates if not
- Respect Notion's 3 req/s rate limit with a token-bucket limiter and exponential backoff on 429
- Split content >2,000 chars across multiple blocks (Notion's per-block char limit)

## Anticipated configuration

```jsonc
{
  "version": "1",
  "backends": {
    "memory": {
      "type": "notion",
      "parent": { "pageId": "abc123…" },        // or { "databaseId": "…" }
      "externalIdProperty": "AIWG External ID"  // optional; default shown
    }
  }
}
```

Env: `NOTION_API_TOKEN` is required. AIWG will never read it from `storage.config`.

## Why deferred

Notion's adapter introduces complexity unique to its API (upsert dance, rate limits, block-size splitting) that doesn't apply to the file-shaped backends. Implementation is gated on user demand for Notion-as-PKM-target.

## How to track / contribute

- Tracking issue: [#959](https://git.integrolabs.net/roctinam/aiwg/issues/959)
- Research note: `.aiwg/architecture/research/storage-backends.md` (§notion)
- Design: `.aiwg/architecture/storage-design.md` (§5.4)
