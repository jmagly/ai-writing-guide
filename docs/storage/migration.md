# Storage Backends — Migration Guide

`aiwg storage migrate` copies entries from one backend to another. Use it when you decide to move a subsystem's persistence — for example, AIWG memory was on the local filesystem, you've now installed Obsidian, and you want the existing pages in your vault.

## Synopsis

```
aiwg storage migrate <subsystem> --from <spec> --to <spec> [--dry-run]
```

**Spec format**: `<type>:<location>`

| Type        | Location format                          | Example                                 |
| ----------- | ---------------------------------------- | --------------------------------------- |
| `fs`        | directory path (relative or absolute)    | `fs:.aiwg/memory` or `fs:/mnt/store`    |
| `obsidian`  | vault directory                          | `obsidian:~/vaults/main` (use `--to-folder` for subfolder) |
| `logseq`    | graph directory                          | `logseq:~/.logseq/graphs/work`          |
| `fortemi`   | MCP server name                          | `fortemi:fortemi`                       |

Optional flags:
- `--from-folder <subfolder>` — Obsidian-only, applies to source
- `--to-folder <subfolder>` — Obsidian-only, applies to destination
- `--dry-run` — preview operations; no writes

## Examples

### Move AIWG memory from filesystem to an Obsidian vault

```bash
# Dry run first — make sure you're moving what you think you're moving
aiwg storage migrate memory \
  --from fs:.aiwg/memory \
  --to obsidian:~/vaults/main \
  --to-folder AIWG/memory \
  --dry-run

# When the preview looks right, run it for real
aiwg storage migrate memory \
  --from fs:.aiwg/memory \
  --to obsidian:~/vaults/main \
  --to-folder AIWG/memory

# Update storage.config so AIWG starts using the new location
cat > .aiwg/storage.config <<'EOF'
{
  "version": "1",
  "backends": {
    "memory": { "type": "obsidian", "vault": "~/vaults/main", "folder": "AIWG/memory" }
  }
}
EOF
```

### Relocate the research corpus to a secondary drive

```bash
aiwg storage migrate research \
  --from fs:.aiwg/research \
  --to fs:/mnt/archive/aiwg-research

# Update config
# .aiwg/storage.config → roots.research = "/mnt/archive/aiwg-research"
```

### Move agent-loop memory into Fortemi

```bash
aiwg storage migrate memory \
  --from fs:.aiwg/memory \
  --to fortemi:fortemi
```

(`fortemi:<server-name>` references an MCP server registered via `aiwg mcp add fortemi --command <…>`.)

## How it works

1. **Build adapters** — one each from `--from` and `--to` specs.
2. **Refuse identical locations** — if both specs resolve to the same physical location, the command aborts with a clear error before touching anything.
3. **Walk source** — calls `source.list('')` to enumerate every entry.
4. **Per-entry copy** — reads from source, writes to destination. Per-entry errors don't abort the migration; they're tallied at the end.
5. **Resume tracking** — appends a JSONL line per successfully-migrated entry to `.aiwg/.storage-cache/migrations/<subsystem>-<from>-to-<to>.jsonl`. Re-running the same command picks up where it left off.

## Resume behavior

Long migrations can be interrupted (Ctrl-C, a network hiccup, a backend rate limit). Re-running the same command:

- Reads the migration log
- Skips any entry whose path appears in the log
- Retries the rest

This means you can safely run a migration in chunks, or re-run after fixing a backend issue. The command prints `skipped=N` in the summary so you can see what the resume picked up.

## Dry-run mode

`--dry-run` lists every operation that *would* happen but performs no writes. Use it to:

- Sanity-check the source has the entries you expect
- Confirm `--to` resolves to the intended physical location (especially with `--to-folder`)
- Estimate migration size before committing

The dry-run output uses `→` to mark planned operations:

```
storage migrate (DRY RUN)
  subsystem: memory
  from:      fs:./aiwg/memory
  to:        obsidian:/home/user/vaults/main (folder=AIWG/memory)

  → page-001.md (would copy)
  → page-002.md (would copy)
  → research-complete/index.md (would copy)

Summary: copied=3 skipped=0 errored=0 total=3
```

## Error handling

Per-entry errors don't abort the migration. The summary line tallies `copied / skipped / errored / total`, and the command exits non-zero when `errored > 0`.

Common causes:

| Symptom                                        | Likely cause                              | Fix                                              |
| ---------------------------------------------- | ----------------------------------------- | ------------------------------------------------ |
| `read returned null`                           | Source entry vanished mid-migration       | Re-run; resume skips already-copied              |
| `refusing to operate on .obsidian/`            | Source contained Obsidian config files    | Pre-clean source, or use `--to-folder`           |
| `rate limit / 429`                             | Notion / AnythingLLM throttling           | Wait and re-run; resume skips done entries       |
| `MCP server not registered`                    | `fortemi:<name>` references unknown server| `aiwg mcp add <name> --command <…>` first        |

## Backwards-compatible after migration

After a successful migration, you'll typically update `storage.config` so AIWG reads from the new location going forward. The migration command itself does NOT update `storage.config` — you control that explicitly. This means:

- You can run a migration to *test* a backend without committing
- You can keep both source and destination in sync briefly while you validate
- You can roll back by reverting `storage.config` (the source data is untouched)

## What can and can't be migrated

| Source → Destination                  | Status                  |
| ------------------------------------- | ----------------------- |
| `fs` → `fs`                           | ✓ supported             |
| `fs` → `obsidian` / `logseq`          | ✓ supported             |
| `obsidian` / `logseq` → `fs`          | ✓ supported             |
| `obsidian` ↔ `logseq`                 | ✓ supported (frontmatter transformation handled) |
| `fs` / file-shaped → `fortemi`        | ✓ supported (alpha; Fortemi tool surface unverified) |
| `fortemi` → file-shaped               | ✓ supported (alpha)     |
| `notion` / `anythingllm` / `s3` / `webdav` | ✗ adapters not yet implemented (#959/#960/#962/#963) |

When the deferred adapters land, this table updates. The migrate command will refuse unimplemented backend types in `--from`/`--to` with a clear error citing the tracking issue.

## Edge cases worth knowing

- **`fs → fs` between the same root is refused.** AIWG checks resolved paths and aborts before any side effect.
- **Empty source is reported gracefully.** No-op, exit 0.
- **The migration log lives under `.aiwg/.storage-cache/migrations/`** — that directory is gitignored by default. Don't commit it.
- **Large migrations**: each entry is read and written serially. If you have 10,000 entries against a rate-limited backend, expect minutes. Use `--dry-run` first to estimate.
