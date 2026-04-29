# Backend: `fs` (filesystem)

The default backend. Wraps `fs.promises` and writes plain files under a per-subsystem root.

## When to use

- You want everything to "just work" with no setup. (This is the default.)
- You want to relocate a subsystem to a different filesystem path (different drive, network share, encrypted volume) without changing how AIWG accesses it.

## Configuration

`fs` is the default for every subsystem when `.aiwg/storage.config` is absent. To explicitly select it:

```jsonc
{
  "version": "1",
  "backends": {
    "memory":       { "type": "fs" },
    "activity_log": { "type": "fs" }
  }
}
```

To redirect the physical location of an `fs`-backed subsystem, set `roots.<subsystem>`:

```jsonc
{
  "version": "1",
  "roots": {
    "research": "/mnt/archive/aiwg-research",
    "media":    "/mnt/archive/aiwg-media",
    "memory":   "~/vaults/aiwg-memory"
  }
}
```

Path expansion: `~/` is expanded to `$HOME`. Relative paths resolve against the project root (the directory containing `.aiwg/`). Absolute paths are used as-is.

## Default subsystem roots (when no override)

| Subsystem          | Default                                              |
| ------------------ | ---------------------------------------------------- |
| `memory`           | `<project>/.aiwg/memory/`                            |
| `reflections`      | `<project>/.aiwg/reflections/`                       |
| `kb`               | `<project>/.aiwg/kb/`                                |
| `activity_log`     | `<project>/.aiwg/activity.log` (single file)         |
| `provenance`       | `<project>/.aiwg/provenance/`                        |
| `research`         | `<project>/.aiwg/research/`                          |
| `media`            | `<project>/.aiwg/media/`                             |
| `sandbox_identity` | `~/.config/aiwg/sandbox-agents.json` (host-level)    |

## Capabilities

| Operation       | Notes                                                                            |
| --------------- | -------------------------------------------------------------------------------- |
| `read`          | Returns `null` for missing files (does not throw)                                |
| `write`         | Idempotent; overwrites; auto-creates parent directories                          |
| `append`        | Atomic via POSIX `O_APPEND`. Concurrent appenders interleave at line granularity |
| `list`          | Recursive walk with optional prefix filter                                       |
| `delete`        | No-op for missing paths                                                          |
| `query`         | Not implemented — filesystem has no semantic search                              |

## Path safety

The fs adapter rejects paths that:

- Contain `..` segments
- Start with `/` (absolute)
- Start with `~`
- Contain backslashes
- Are empty

These are tested in `test/unit/storage/fs.test.ts`.

## Caveats

- **No content addressability**: re-writing the same logical artifact at a different path creates two files. Use the per-subsystem CLI's `delete` first, or run `aiwg storage migrate` if you're moving things en masse.
- **`activity_log` is a single-file subsystem.** Its default "root" maps to a file path, not a directory. Don't `aiwg activity-log put` arbitrary subpaths — append flows through `aiwg activity-log append` which uses atomic O_APPEND.
- **`sandbox_identity` defaults to a host-level path** for backward compatibility. To redirect, set `roots.sandbox_identity` in `.aiwg/storage.config` — the file `sandbox-agents.json` will land in the configured directory.

## Setup

None. The default is `fs` and AIWG creates per-subsystem directories on first write.

## Verifying

```bash
aiwg storage show              # see resolved roots
aiwg storage test memory       # round-trip probe
```
