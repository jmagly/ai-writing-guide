---
name: memory-log-render
description: Generate a human-readable Markdown view from a consumer's JSON Lines event log
namespace: aiwg
category: kernel
platforms: [claude, copilot, cursor, factory, windsurf, warp, codex, opencode, openclaw, hermes]
---

# memory-log-render

Convert a consumer's `.log.jsonl` into a readable `log.md` Markdown file. The rendered view uses greppable line prefixes and groups events by date.

## When to Use

- On demand: user asks "show me the log" or "render the activity log"
- After bulk operations: post-ingest or post-lint when the log has grown
- As part of `memory-lint --fix`: regenerate the rendered view if stale

## Parameters

### --consumer (optional)
Consumer ID. Resolved via ADR-021 D4 precedence: explicit > wrapper > auto-detect.

### --tail (optional, default: all)
Only render the last N entries. Useful for large logs.

### --since (optional)
Only render entries after this ISO 8601 date.

### --output (optional)
Override output path. Defaults to sibling of `.log.jsonl` → `log.md` (e.g., `.aiwg/research/.log.jsonl` → `.aiwg/research/log.md`).

## Operation

1. **Resolve consumer** — determine which log to render.
2. **Load topology** — read `memory.topology.log` path from consumer's `manifest.json`.
3. **Read JSONL** — parse each line as JSON. Skip malformed lines (warn in output).
4. **Group by date** — cluster entries by `ts` date portion.
5. **Render Markdown** — for each entry, produce:

```markdown
## [2026-04-14] ingest | anthropic-2024-constitutional.pdf
Touched 3 pages: anthropic.md, constitutional-ai.md, summaries/2024-constitutional-ai.md.
Duration: 14.2s. No contradictions.
```

6. **Write output** — overwrite the `log.md` file (this is a generated view, not an append).
7. **Log event** — append a `log-render` entry to `.log.jsonl` via `memory-log-append`.

## Rendered Format

```markdown
# Memory Log — research-complete

> Generated from `.aiwg/research/.log.jsonl` on 2026-04-14T16:00:00Z
> 47 events total

---

## [2026-04-14] ingest | paper.pdf
Touched 3 pages: entities/anthropic.md, concepts/constitutional-ai.md, summaries/paper.md.
Duration: 14.2s. No contradictions.

## [2026-04-14] lint | health check
0 errors, 2 warnings, 5 suggestions. Duration: 3.4s.

## [2026-04-13] query-capture | Constitutional AI comparison
Created synthesis/constitutional-ai-comparison.md (comparison).
Added 2 cross-references.

---

*Rendered by memory-log-render*
```

## Line Prefix Convention

Every operation line starts with `## [YYYY-MM-DD] <op> | <subject>` — this makes the rendered log greppable:

```bash
grep "^## \[" .aiwg/research/log.md | tail -5
grep "ingest" .aiwg/research/log.md
```

## Schema Reference

@semantic-memory/schemas/memory-log-event.md
