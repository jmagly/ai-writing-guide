---
description: View and manage Ralph loop reflections and episodic memory
category: ralph
---

# Ralph Reflect Command

View, search, and manage reflections from Ralph loop iterations.

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

- @.aiwg/ralph/schemas/reflection-memory.json - Reflection schema
- @.aiwg/ralph/docs/reflection-memory-guide.md - Guide
- @.aiwg/research/findings/REF-021-reflexion.md - Research foundation
