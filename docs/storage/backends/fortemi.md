# Backend: `fortemi` (alpha)

Routes a subsystem's persistence into [Fortemi](https://github.com/jmagly/aiwg/blob/main/.aiwg/planning/training-framework/phase-4-fortemi-review.md), the first-party AIWG semantic-memory project. Fortemi is Rust + PostgreSQL + pgvector with SKOS hierarchies, MRL embeddings, and W3C PROV provenance. Communication happens over MCP.

## Status: alpha

The adapter ships with the parameter shapes documented in `phase-4-fortemi-review.md`, but those shapes have **not been formally validated against a live Fortemi instance**. Real-world parameter mismatches surface as MCP errors that bubble up to the consumer.

Use this backend when:
- You're running AIWG against a Fortemi instance and want memory artifacts to flow into Fortemi's semantic-memory graph
- You're prototyping the integration

## Configuration

```jsonc
{
  "version": "1",
  "backends": {
    "memory": {
      "type": "fortemi",
      "mcpServer": "fortemi",        // optional, default: "fortemi"
      "scheme": "aiwg-memory"        // optional SKOS scheme to scope writes
    }
  }
}
```

| Field       | Required | Notes                                                                                |
| ----------- | -------- | ------------------------------------------------------------------------------------ |
| `mcpServer` | no       | MCP server name registered via `aiwg mcp add`. Default `"fortemi"`                   |
| `scheme`    | no       | Optional SKOS scheme (vocabulary scope) for this subsystem's notes                   |

No env vars in `storage.config`. Authentication is governed by the AIWG MCP server config — register the Fortemi server via `aiwg mcp add fortemi --command <…>` first.

## How it works

The adapter routes the storage interface to Fortemi MCP tools:

| AIWG op | Fortemi tool                                  |
| ------- | --------------------------------------------- |
| `read`  | `get_note`                                    |
| `write` (new) | `capture_knowledge`                     |
| `write` (existing) | `update_note` (versions are first-class) |
| `list`  | `list_notes` (filtered by `id_prefix`)        |
| `delete`| `update_note { archived: true }` (Fortemi is immutable) |
| `query` | `search`                                      |

### Note-id namespacing

Each entry stored in Fortemi has `note_id = subsystem + ':' + path`. The subsystem prefix prevents collisions across `kb`/`memory`/`research`/etc. when they share a single Fortemi instance.

Example: `aiwg memory put research-complete/index.md` → Fortemi note_id `memory:research-complete/index.md`.

### Delete semantics

Fortemi's design is immutable — no destructive delete. The adapter's `delete()` issues `update_note { archived: true }` instead, which suppresses the note from `list`/`read` but preserves history. If you need a "real" delete, do it through Fortemi's admin tooling.

## Capabilities

| Operation | Notes                                                          |
| --------- | -------------------------------------------------------------- |
| `read`    | Returns `null` for `not_found`; prefers `revised_content`      |
| `write`   | Calls `capture_knowledge` for new IDs, `update_note` for existing |
| `list`    | Filters by subsystem prefix; strips prefix from returned paths |
| `delete`  | Archives via `update_note`; no-op for missing                  |
| `query`   | Implemented (Fortemi has native semantic search)               |

## Caveats

- **Alpha stability.** Parameter shapes are based on the planning doc, not a live API. File issues if you see schema mismatches.
- **Async model.** Fortemi's NLP pipeline runs server-side; `write` returns when the tool call is accepted, not when the artifact is queryable.
- **Stdio transport only in v1.** HTTP/SSE MCP transports are out of scope; the default factory throws clearly if config requests them.
- **No `update`-on-conflict semantics.** Two concurrent `write`s to the same `note_id` may race at the Fortemi side. Behavior is governed by Fortemi's versioning model, not by the adapter.

## Setup

1. Install and run Fortemi (separately from AIWG).
2. Register the Fortemi MCP server with AIWG:

   ```bash
   aiwg mcp add fortemi --type stdio --command <fortemi-mcp-binary>
   ```

3. Add the backend to `.aiwg/storage.config`:

   ```jsonc
   {
     "version": "1",
     "backends": {
       "memory": { "type": "fortemi", "mcpServer": "fortemi", "scheme": "aiwg-memory" }
     }
   }
   ```

4. Verify:

   ```bash
   aiwg doctor
   aiwg storage test memory
   ```

5. (Optional) Migrate existing AIWG memory:

   ```bash
   aiwg storage migrate memory --from fs:.aiwg/memory --to fortemi:fortemi
   ```

## See also

- `.aiwg/planning/training-framework/phase-4-fortemi-review.md` — Fortemi architecture review
- `docs/storage/migration.md` — bulk migration into Fortemi
- AIWG MCP server registry: `aiwg mcp list`, `aiwg mcp add`
