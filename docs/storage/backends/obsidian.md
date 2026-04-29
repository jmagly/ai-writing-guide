# Backend: `obsidian`

Routes a subsystem's persistence into an [Obsidian](https://obsidian.md) vault. AIWG writes Markdown files directly into the vault's filesystem; Obsidian's file watcher picks up changes within a few seconds.

## When to use

- You already use Obsidian as your personal knowledge system and want AIWG memory / kb / reflections in your graph.
- You want full-text search and graph view over AIWG artifacts via Obsidian's native UI.

## Configuration

```jsonc
{
  "version": "1",
  "backends": {
    "memory": {
      "type": "obsidian",
      "vault": "~/vaults/main",     // required: absolute or ~/-prefixed path
      "folder": "AIWG/memory",      // optional: subfolder within the vault
      "useCli": true                // optional, default true
    }
  }
}
```

| Field    | Required | Notes                                                                              |
| -------- | -------- | ---------------------------------------------------------------------------------- |
| `vault`  | yes      | Absolute path to the vault directory; `~/` expanded                                |
| `folder` | no       | Subfolder inside the vault. Default: vault root. Use to scope AIWG writes          |
| `useCli` | no       | Default `true`. When true, probes `obsidian --version` once on init                |

No env vars required.

## How it works

The adapter does direct filesystem reads/writes against `<vault>/<folder>/`. It does **not** touch Obsidian's `.obsidian/` config directory — for read, write, delete, AND list (skipped during walk).

When `useCli: true` (the default), `init()` runs `obsidian --version` once and emits a one-time stderr warning if the binary is missing. This is informational only — direct filesystem writes still work without the CLI installed. Obsidian's own file watcher converges on external markdown changes within seconds.

### Frontmatter handling

`WriteMeta.frontmatter` (passed by AIWG skills via `aiwg <subsystem> put`) is rendered as YAML frontmatter at the top of the markdown:

```markdown
---
tags: [ai, note]
created: 2026-04-28
---
body content here
```

If the content already starts with a `---` YAML block, the existing frontmatter is preserved and `WriteMeta.frontmatter` is ignored — never overwritten.

YAML scalars with special characters (colons, hashes, quotes) are auto-quoted. Arrays render inline (`[a, b, c]`).

## Capabilities

| Operation | Notes                                                                          |
| --------- | ------------------------------------------------------------------------------ |
| `read`    | Returns `null` for missing files; refuses paths into `.obsidian/`             |
| `write`   | Auto-creates parent directories; merges frontmatter when content has none      |
| `list`    | Recursive walk; **`.obsidian/` is skipped**                                    |
| `delete`  | No-op for missing; refuses `.obsidian/`                                        |
| `query`   | Not implemented — Obsidian search isn't exposed via the official CLI yet       |

## Path safety

Same five rules as the `fs` adapter (`..`/absolute/`~`/backslash/empty), plus the explicit `.obsidian/` refusal. Tested in `test/unit/storage/obsidian.test.ts`.

## Caveats

- **Obsidian's index lags by a few seconds** when AIWG writes externally. If a user has Obsidian open and you write a file via AIWG, expect 1–3 seconds before the file appears in the file tree / graph view.
- **Obsidian Sync conflicts**: if Obsidian Sync (or another sync plugin) is also writing to the same vault, external writes can race with sync. The recommended workflow is to either pause Sync during heavy AIWG ingest, or scope AIWG to a `folder` that Sync ignores.
- **The CLI integration is conservative**: `useCli: true` only probes the CLI's existence. AIWG does not synthesize CLI commands to drive the running app — the official CLI's command surface for arbitrary write workflows isn't fully verified yet. Future versions may invoke `obsidian` to trigger reload-after-write.
- **`query` is not implemented**: full-text search through AIWG isn't possible on this backend. Use Obsidian's native search UI on the resulting files.

## Setup

1. Install Obsidian and create a vault (or pick an existing vault).
2. (Optional) Install the official Obsidian CLI: see https://help.obsidian.md/cli
3. Add the backend to `.aiwg/storage.config`:

   ```jsonc
   {
     "version": "1",
     "backends": {
       "memory": {
         "type": "obsidian",
         "vault": "~/vaults/main",
         "folder": "AIWG/memory"
       }
     }
   }
   ```

4. Verify connectivity:

   ```bash
   aiwg doctor                  # validates config
   aiwg storage test memory     # round-trip probe
   ```

5. (Optional) Migrate existing AIWG memory into the vault:

   ```bash
   aiwg storage migrate memory \
     --from fs:.aiwg/memory \
     --to obsidian:~/vaults/main \
     --to-folder AIWG/memory
   ```

   See `docs/storage/migration.md` for details.

## See also

- `docs/storage/security.md` — credential handling, path safety
- `docs/storage/migration.md` — moving existing data into the vault
- Obsidian help: https://help.obsidian.md
