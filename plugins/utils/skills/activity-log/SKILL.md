---
namespace: aiwg
name: activity-log
platforms: [all]
description: Query and manage the unified .aiwg/activity.log chronological record of AIWG-managed workflow operations
---

# Activity Log

You query and manage the unified `.aiwg/activity.log` — a chronological record of all framework operations across SDLC, research, and other AIWG-managed workflows.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "what happened recently" → show (default limit)
- "show me today's activity" → show --since today's date
- "log a create operation" → append create <summary>
- "how many deploys have we done" → stats
- "activity since last week" → show --since YYYY-MM-DD

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Recent activity | "show activity log" | `activity-log show` |
| Filtered by date | "activity since 2026-04-10" | `activity-log show --since 2026-04-10` |
| Filtered by operation | "show all deploys" | `activity-log show --operation deploy` |
| Limited output | "last 5 entries" | `activity-log show --limit 5` |
| Manual append | "log that we archived the SAD draft" | `activity-log append archive <summary>` |
| Statistics | "how many operations by type" | `activity-log stats` |

## Behavior

When triggered:

1. **Identify the subcommand**:
   - `show` — display entries, optionally filtered
   - `append` — add a manual entry
   - `stats` — summarize operation counts and date range

2. **Locate the log file**: `.aiwg/activity.log` relative to the project root. If the file does not exist, report it as empty (do not error).

3. **Execute the subcommand**:

### `show`

Display entries in reverse-chronological order (newest first).

```bash
# Show last 20 entries (default)
aiwg activity-log show

# Filter by date (inclusive)
aiwg activity-log show --since 2026-04-10

# Filter by operation type
aiwg activity-log show --operation deploy

# Limit output count
aiwg activity-log show --limit 5

# Combine filters
aiwg activity-log show --since 2026-04-10 --operation create --limit 10
```

Accepted `--operation` values: `ingest`, `create`, `update`, `delete`, `query`, `lint`, `deploy`, `archive`, `promote`

### `append`

Add a manual entry with the current UTC timestamp.

```bash
# Append a manual entry
aiwg activity-log append <operation> "<summary>"
```

Example:
```bash
aiwg activity-log append create "UC-011-logout.md created manually during team review"
```

The entry is written in standard format:
```
## [2026-04-12 14:33] create | UC-011-logout.md created manually during team review
```

Reject invalid operation tokens with a clear error listing the nine valid tokens.

### `stats`

Summarize operation counts grouped by type and show the date range covered.

```bash
aiwg activity-log stats
```

Output format:
```
Activity Log Statistics
Log file: .aiwg/activity.log
Date range: 2026-04-01 → 2026-04-12 (12 days)
Total entries: 47

By operation:
  create    18  ████████████████████  38%
  update    12  █████████████         26%
  deploy     7  ████████               15%
  archive    4  ████                    9%
  lint       3  ███                     6%
  promote    2  ██                      4%
  delete     1  █                       2%
```

## Examples

### Example 1: Recent activity overview

**User**: "What's happened in the activity log recently?"

**Extraction**: show subcommand, default limit

**Action**:
```bash
aiwg activity-log show --limit 10
```

**Response**: Last 10 entries from `.aiwg/activity.log` newest first. If the file is absent, report "No activity log found at .aiwg/activity.log — operations will create it automatically."

### Example 2: Audit all deploys

**User**: "Show me all deploy operations since April 10th"

**Extraction**: show, --operation deploy, --since 2026-04-10

**Action**:
```bash
aiwg activity-log show --operation deploy --since 2026-04-10
```

**Response**: Filtered entries matching `deploy` on or after 2026-04-10, newest first.

### Example 3: Manual log entry

**User**: "Log that we archived the old SAD draft"

**Extraction**: append, operation = archive, summary from user phrase

**Action**:
```bash
aiwg activity-log append archive ".aiwg/working/sad-draft-v0.1.md archived manually after SAD baseline"
```

**Response**: "Entry appended to .aiwg/activity.log."

### Example 4: Operation statistics

**User**: "Give me a stats breakdown of the activity log"

**Extraction**: stats subcommand

**Action**:
```bash
aiwg activity-log stats
```

**Response**: Tabular summary with operation counts, percentages, and date range.

## Clarification Prompts

If the user's intent is ambiguous:

- "Are you looking to read recent activity or record a new entry?"
- "Which operation type should I filter on? Valid types: ingest, create, update, delete, query, lint, deploy, archive, promote."

## Storage routing

`aiwg activity-log` routes through `resolveStorage('activity_log')` (#964). On the default `fs` backend, the log file is `.aiwg/activity.log` and the line format is byte-identical to the legacy `echo >> .aiwg/activity.log` pattern. Configuring `.aiwg/storage.config` redirects the log to a different filesystem location (via `roots.activity_log`) without changing how agents call the CLI.

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/activity-log.md — Rule that governs when agents must append entries
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/index/SKILL.md — Artifact index skill (complementary query tool)
- @$AIWG_ROOT/.aiwg/architecture/storage-design.md — Storage adapter design (#934)
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
