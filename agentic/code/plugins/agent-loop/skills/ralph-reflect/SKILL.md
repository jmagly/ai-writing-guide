---
namespace: aiwg
name: ralph-reflect
platforms: [all]
description: View and manage agent loop reflections and episodic memory
commandHint:
  category: ralph
---

# Al Reflect Command

View, search, and manage reflections from agent loop iterations.

## Instructions

Manage the Reflexion episodic memory stored in `.aiwg/ralph/reflections/`:

### Subcommand: show

Display reflections for a specific loop or the most recent loop.

1. Load reflections from `.aiwg/ralph/reflections/loops/`
2. Display each reflection with:
   - Trial number, timestamp
   - Outcome (success/failure/partial)
   - Reflection text
   - Strategy change

### Subcommand: patterns

Show recurring patterns across all loops.

1. Load `.aiwg/ralph/reflections/patterns/`
2. Display patterns by frequency
3. Show success rate for each pattern
4. Highlight patterns applicable to current context

### Subcommand: clear

Archive and clear reflection history.

1. Archive current reflections to timestamped directory
2. Reset loops and patterns directories
3. Preserve index.yaml

## Arguments

- `show [loop-id]` - Show reflections for loop (default: latest)
- `patterns` - Show learned patterns
- `clear` - Archive and clear reflections
- `--format [yaml|markdown|summary]` - Output format (default: markdown)
- `--last [n]` - Show only last n reflections
- `--loop [id]` - Filter by loop ID

## References

- @$AIWG_ROOT/agentic/code/addons/ralph/schemas/reflection-memory.json - Reflection schema
- @$AIWG_ROOT/agentic/code/addons/ralph/docs/reflection-memory-guide.md - Guide
- @.aiwg/research/findings/REF-021-reflexion.md - Research foundation

## Storage Routing (#934, #967)

This skill's persistence flows through `resolveStorage('reflections')`. On the default `fs` backend reflections live at `.aiwg/reflections/`. To redirect into Obsidian, Logseq, Fortemi, or another backend without changing this skill, configure `roots.reflections` or `backends.reflections` in `.aiwg/storage.config` (#934).

When this skill needs to read/write reflections from a Bash step, prefer the storage-routed CLI:

```bash
aiwg reflections list --prefix sessions/
aiwg reflections get sessions/2026-04-28.md
echo "# reflection" | aiwg reflections put sessions/2026-04-28.md
echo '{"event":"reflect","summary":"..."}' | aiwg reflections append-log sessions/log.jsonl
```

The legacy direct-fs paths continue to work on the default `fs` backend — byte-identical to what the adapter writes — but only the adapter route honors `storage.config` redirection.
