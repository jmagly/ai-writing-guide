# Backend: `fortemi` (alpha, legacy for search)

Routes a subsystem's persistence into [Fortemi](https://github.com/jmagly/aiwg/blob/main/.aiwg/planning/training-framework/phase-4-fortemi-review.md), the first-party AIWG semantic-memory project. Fortemi is Rust + PostgreSQL + pgvector with SKOS hierarchies, MRL embeddings, and W3C PROV provenance. Communication happens over MCP.

## Status: alpha MCP storage adapter

As of AIWG 2026.9.1, the adapter includes an opt-in, schema-first live
qualification gate. Fortemi Server nevertheless remains alpha and uncertified:
a compatible result from one endpoint is scoped evidence, not a general
persistence, recovery, migration, or load claim. Real-world parameter
mismatches fail the qualification preflight and remain visible to the consumer.

This adapter is deprecated for index/search routing. New discovery, artifact
query, graph traversal, and release-package fallback work uses the Fortemi Core
static-cache backend by default; `--backend local` selects the legacy local
fallback during the phase-out window.

Use this backend when:
- You're running AIWG against a Fortemi instance and want memory artifacts to flow into Fortemi's semantic-memory graph
- You're prototyping the integration

## Fortemi Core Migration Boundary

This backend is the older Fortemi MCP storage adapter. It is not the Fortemi
Core index/search backend used by:

```bash
aiwg index sync
aiwg index query "..."
aiwg index neighbors --graph kb
```

Configuring a subsystem with `"type": "fortemi"` changes persistence for that
subsystem through Fortemi MCP tools. It does not switch AIWG discovery,
artifact query, graph traversal, research-query, or KB traversal to the
Fortemi Core static cache. Those paths use Fortemi Core by default after an
artifact graph sync; `--backend local` selects the legacy local fallback during
the phase-out window.

Release packages also include a prebuilt Fortemi Core `framework` index for
capability discovery fallback. See
[`docs/fortemi-core-prebuilt-indices.md`](../../fortemi-core-prebuilt-indices.md)
for the cache contract and release matrix maintenance workflow.

There is also a separate, explicit conversion command:

```bash
aiwg index export --format fortemi-shard --graph project --out aiwg-project.shard
```

That command maps an AIWG v2 static index through the installed
`@fortemi/core/aiwg-index` converter. It does not use this MCP adapter.
Conversely, a successful `aiwg storage test` does not prove that a generated
shard is accepted by a Fortemi server. Shard compatibility must name a profile
and pass the published-package, server-owned-schema, and real server
import/re-export gates documented in
[`docs/integrations/fortemi-index-export.md`](../../integrations/fortemi-index-export.md).

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

No credentials or env vars belong in `storage.config`. Authentication is
governed by the AIWG MCP server registry. Local workstation installs can use a
stdio server; internal/Enterprise installs can use HTTPS Streamable HTTP or
legacy SSE with `--header-env`. The registry stores the environment-variable
name, never its value.

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
- **Transport security.** Stdio supports local workstation installs. Streamable
  HTTP and legacy SSE support remote services; non-loopback endpoints require
  HTTPS and missing credential references fail closed.
- **No `update`-on-conflict semantics.** Two concurrent `write`s to the same `note_id` may race at the Fortemi side. Behavior is governed by Fortemi's versioning model, not by the adapter.

## Live qualification

Run the opt-in live gate against an explicitly authorized Streamable HTTP MCP
endpoint. This command is read-only by default:

```bash
AIWG_FORTEMI_LIVE_URL=https://memory.example.internal/mcp \
AIWG_FORTEMI_LIVE_TOKEN="$AIWG_FORTEMI_TOKEN" \
AIWG_FORTEMI_CONTRACT_REVISION=2026-07-06 \
npm run test:fortemi:live
```

Without `AIWG_FORTEMI_LIVE_URL`, the suite is skipped and ordinary CI remains offline. The transport retains the adapter's HTTPS requirement (plain HTTP is accepted only on loopback), and the token value is read from the environment rather than written to configuration or output. `AIWG_FORTEMI_LIVE_TIMEOUT_MS` controls each bounded operation (250–30000 ms; default 5000).

| Environment variable | Contract |
| --- | --- |
| `AIWG_FORTEMI_LIVE_URL` | Authorized live MCP endpoint; required to run rather than skip. |
| `AIWG_FORTEMI_LIVE_TOKEN` | Optional credential value; keep it in the process environment or approved secret provider. |
| `AIWG_FORTEMI_CONTRACT_REVISION` | Optional expected/declared contract revision recorded with the observation. |
| `AIWG_FORTEMI_LIVE_TIMEOUT_MS` | Per-operation bound, clamped to 250–30000 ms. |
| `AIWG_FORTEMI_LIVE_ALLOW_WRITE` | Mutation gate. Only the exact value `1` enables the isolated write probe; omit it for read-only qualification. |

Qualification first requests the MCP tool catalog and reports the server name/version, optional contract revision, and per-operation schema compatibility. If any adapter argument is absent or no longer required, qualification stops before invoking a tool. The 2026.9.1 status remains **pre-certification**: the gate detects contract drift, but no checked-in live receipt currently establishes compatible Server persistence, recovery, migration, or load behavior.

Reads, list, and search use a fresh `aiwg-qualification-<UUID>` namespace only after schema preflight succeeds. Writes are disabled by default. Set `AIWG_FORTEMI_LIVE_ALLOW_WRITE=1` only after separate mutation authorization confirms that an isolated qualification record may be retained by the server's immutable history. Endpoint access alone is not mutation authorization.

The manual `Storage Server Conformance` workflow follows the same boundary: it
defaults to read-only and requires an explicit write input in addition to the
Vault-gated endpoint. Its evidence-artifact location is reserved for a durable,
sanitized qualification receipt. Until that receipt implementation lands, do
not treat console output or an empty artifact upload as durable evidence. The
intended receipt will generically bind the tested AIWG revision, a non-secret
endpoint identity, observed server/contract versions, operation outcomes,
mutation state, timestamps, and resource bounds; its exact versioned schema is
owned by the receipt implementation rather than this guide.

## Setup

1. Install and run Fortemi (separately from AIWG).
2. Register the Fortemi MCP server with AIWG:

   ```bash
   aiwg mcp add fortemi --type stdio --command <fortemi-mcp-binary>
   ```

   Or register authenticated Enterprise transport without storing its token:

   ```bash
   aiwg mcp add fortemi-enterprise \
     --type http \
     --url https://memory.example.internal/mcp \
     --header-env Authorization=AIWG_FORTEMI_TOKEN
   ```

   `--header-env` is resolved only by AIWG's storage runtime. The registry and
   generated provider configuration contain the environment-variable name, not
   its value; set that variable in the environment that runs `aiwg storage`.

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

6. Ingest the research corpus (preview first):

   ```bash
   aiwg storage import-corpus --dry-run
   aiwg storage import-corpus --server fortemi
   ```

## See also

- `.aiwg/planning/training-framework/phase-4-fortemi-review.md` — Fortemi architecture review
- `docs/storage/migration.md` — bulk migration into Fortemi
- AIWG MCP server registry: `aiwg mcp list`, `aiwg mcp add`
