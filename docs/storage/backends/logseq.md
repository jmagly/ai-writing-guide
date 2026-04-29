# Backend: `logseq`

Routes a subsystem's persistence into a [Logseq](https://logseq.com) graph. AIWG writes Markdown files directly into the graph's filesystem; Logseq's file watcher picks up changes within seconds.

## When to use

- You already use Logseq for daily journaling / PKM and want AIWG memory in your graph.
- You want AIWG entries to participate in Logseq's block-level linking, queries, and properties.

## Configuration

```jsonc
{
  "version": "1",
  "backends": {
    "kb": {
      "type": "logseq",
      "graph": "~/.logseq/graphs/work",  // required
      "useApi": true,                     // optional, default true
      "apiUrl": "http://127.0.0.1:12315/api"  // optional
    }
  }
}
```

| Field    | Required | Notes                                                                |
| -------- | -------- | -------------------------------------------------------------------- |
| `graph`  | yes      | Absolute path to the graph directory                                 |
| `useApi` | no       | Default `true`. When true, probes the HTTP API on init               |
| `apiUrl` | no       | Default `http://127.0.0.1:12315/api`                                 |

Optional env var: `LOGSEQ_API_TOKEN` — only when `useApi: true`. Generate one in Logseq via Settings → Features → Developer mode.

## How it works

The adapter does direct filesystem reads/writes against the graph root. Logseq's on-disk layout:

```
<graph>/
  pages/<title>.md          regular pages
  journals/YYYY_MM_DD.md    journal entries
  logseq/                   REFUSED (Logseq config)
```

When `useApi: true` (default), `init()` POSTs once to `<apiUrl>` with a `Bearer` token from `LOGSEQ_API_TOKEN` to confirm reachability. On missing token or unreachable API, emits a one-time stderr warning and continues with direct filesystem writes.

### Frontmatter → property:: transform

Logseq doesn't recognize YAML frontmatter. The adapter strips any `---` YAML block from incoming content and renders the fields as Logseq page-level properties:

Input:
```markdown
---
tags: [ai, note]
created: 2026-04-28
---
body
```

Written to disk:
```markdown
tags:: ai, note
created:: 2026-04-28

body
```

`WriteMeta.frontmatter` (from `aiwg <subsystem> put` with the meta hint) merges *over* in-content YAML — the caller wins. Block IDs (`id::`) the caller smuggles in are stripped — Logseq auto-assigns them.

## Capabilities

| Operation | Notes                                                          |
| --------- | -------------------------------------------------------------- |
| `read`    | Returns `null` for missing files; refuses paths into `logseq/`  |
| `write`   | Strips YAML, emits `property::`, strips smuggled `id::` lines  |
| `list`    | Recursive walk; **`logseq/` is skipped at the graph root**     |
| `delete`  | No-op for missing; refuses `logseq/`                           |
| `query`   | Not implemented in v1                                          |

## Path safety

Same five rules as `fs` (`..`/absolute/`~`/backslash/empty), plus the `logseq/` config-dir refusal. Tested in `test/unit/storage/logseq.test.ts`.

## Caveats

- **DB version not yet supported.** As of April 2025 Logseq's DB-backed rewrite is still in development; this adapter targets file-backed graphs. When the DB version stabilizes, the adapter behavior will need re-validation.
- **API integration is conservative.** `useApi: true` only probes reachability. AIWG doesn't yet synthesize HTTP API commands to write through the running app. Direct filesystem writes converge via Logseq's file watcher in seconds.
- **Block IDs are auto-assigned.** Don't write `id:: <uuid>` lines from AIWG — Logseq handles this. The adapter strips them defensively.
- **`query` is not implemented.** Use Logseq's native query DSL on the resulting pages.

## Setup

1. Install Logseq and create or open a graph.
2. (Optional) Enable the HTTP API server: Settings → Features → Developer mode → enable the API token.
3. Export the API token: `export LOGSEQ_API_TOKEN=<token>` (only needed if `useApi: true`).
4. Add the backend to `.aiwg/storage.config`:

   ```jsonc
   {
     "version": "1",
     "backends": {
       "kb": {
         "type": "logseq",
         "graph": "~/.logseq/graphs/work"
       }
     }
   }
   ```

5. Verify:

   ```bash
   aiwg doctor
   aiwg storage test kb
   ```

6. (Optional) Migrate existing data into the graph:

   ```bash
   aiwg storage migrate kb --from fs:.aiwg/kb --to logseq:~/.logseq/graphs/work
   ```

## See also

- `docs/storage/migration.md` — moving existing data into the graph
- Logseq docs: https://docs.logseq.com
