---
enforcement: high
name: prose-resolution
level: HIGH
scope: prose-integration
description: Canonical rule for resolving PROSE_ROOT across all prose-integration skills. All prose skills MUST use this protocol — never re-implement detection independently.
---

# Prose Resolution Rule

## Purpose

Defines the single, authoritative protocol for resolving `PROSE_ROOT` (the path to the OpenProse `skills/open-prose/` directory). All prose-integration skills follow this protocol via `/prose-detect`. No skill re-implements detection independently.

## The Rule

**Before any prose skill operates, call `/prose-detect` to resolve `PROSE_ROOT`.**

Do not:
- Hardcode `/tmp/prose/skills/open-prose`
- Check only one signal (e.g., only env var or only filesystem path)
- Auto-install without user confirmation
- Accept a path that doesn't contain both `prose.md` and `forme.md`

Do:
- Delegate to `/prose-detect` as the single detection point
- Use the resolved path for all `$PROSE_ROOT` references in the session
- Cache the result in `.aiwg/config.json` after first successful detection

## Detection Priority Chain

`/prose-detect` checks these signals in order, using the first that resolves to a valid installation:

| Signal | Check |
|--------|-------|
| 1 | `$PROSE_ROOT` or `$AIWG_PROSE_ROOT` environment variable |
| 2 | `.aiwg/config.json` → `prose.path` |
| 3 | `~/.aiwg/prose/skills/open-prose/` (AIWG-managed install) |
| 4 | `.claude-plugin/plugin.json` with `name: open-prose` (CWD and ancestors) |
| 5 | `~/.prose/skills/open-prose/` (user's prior Prose usage) |
| 6 | `which prose` (global CLI install) |
| 7 | Not found → prompt user to run `/prose-install` |

## Validation

A candidate path is only accepted if **both** required files exist:
- `$PROSE_ROOT/prose.md` — Prose VM specification
- `$PROSE_ROOT/forme.md` — Forme Container specification

A path missing either file is skipped; the next signal is tried.

## Install-on-Demand

If no signal resolves a valid path, `/prose-detect` surfaces the error with a suggested remedy. `/prose-install` handles installation with user confirmation. Installation is **never silent** — the user must explicitly approve before any files are written.

## Caching

After successful detection, the resolved path is cached in `.aiwg/config.json`:

```json
{
  "prose": {
    "path": "/resolved/path/to/skills/open-prose",
    "detectedVia": "aiwg-local",
    "lastVerified": "2026-04-02T00:00:00Z"
  }
}
```

Cached paths are still validated on subsequent calls (files might have moved or been deleted). A stale cache entry that fails validation is skipped and detection continues to the next signal.

## References

- @$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/skills/prose-detect/SKILL.md — Full detection implementation
- @$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/skills/prose-install/SKILL.md — Install on demand
- @$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/rules/prose-bridge.md — When and how to use Prose from AIWG workflows
