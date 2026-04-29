# Backend: `anythingllm` (planned)

Status: **STUB** — not yet implemented. Tracked at [#960](https://git.integrolabs.net/roctinam/aiwg/issues/960).

## Planned design

When implemented, the AnythingLLM adapter will:

- POST documents to `/api/v1/document/upload/<folder>` as multipart uploads (AnythingLLM doesn't expose a raw-text endpoint)
- Authenticate via `ANYTHINGLLM_API_KEY`
- Mirror written content to a local cache at `.aiwg/.storage-cache/anythingllm/<subsystem>/` so `read`/`list` work despite AnythingLLM's lack of chunked read-back
- Treat embedding as async — `write` returns when the upload is accepted, not when the artifact is queryable
- Implement `query` via the chat-thread query API

## Anticipated configuration

```jsonc
{
  "version": "1",
  "backends": {
    "memory": {
      "type": "anythingllm",
      "baseUrl": "http://localhost:3001",
      "workspace": "aiwg-memory",
      "folder": "memory"
    }
  }
}
```

Env: `ANYTHINGLLM_API_KEY` is required. AIWG will never read it from `storage.config`.

## Why deferred

AnythingLLM's RAG-only ingest model requires a cache-mirror pattern that doesn't apply to file-shaped backends. The `read` path falls through to a local mirror, which doubles disk usage for ingested artifacts. Implementation is gated on user demand.

## How to track / contribute

- Tracking issue: [#960](https://git.integrolabs.net/roctinam/aiwg/issues/960)
- Research note: `.aiwg/architecture/research/storage-backends.md` (§anythingllm)
- Design: `.aiwg/architecture/storage-design.md` (§5.5)
