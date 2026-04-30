---
namespace: aiwg
name: cost-history
platforms: [all]
description: Show cost trends across multiple workflow sessions, surfacing expensive operations, spending patterns, and outliers
---

# cost-history

You show cost trends across multiple workflow sessions. You read historical cost records from `.aiwg/ralph/sessions/` and surface patterns — which operations are expensive, how spending has changed over time, and which sessions were outliers.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "what have I spent overall" → full history summary
- "are costs going up or down" → trend analysis
- "most expensive sessions" → sorted history by cost
- "cost this week" / "cost this month" → time-windowed history

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Full history | "show cost history" | `aiwg cost-history` |
| Recent sessions | "last 5 sessions" | `aiwg cost-history --last 5` |
| Time window | "costs this week" | `aiwg cost-history --since 7d` |
| Trend summary | "are my costs trending up" | `aiwg cost-history --trend` |
| Sorted by cost | "most expensive sessions" | `aiwg cost-history --sort cost` |

## Behavior

When triggered:

1. **Determine scope**:
   - Default: all recorded sessions, newest first
   - `--last N`: most recent N sessions
   - `--since <duration>`: sessions within the time window (e.g., `7d`, `30d`, `2026-03-01`)

2. **Read session records**:
   - `.aiwg/ralph/sessions/*/metrics.json` — per-session cost records
   - `.aiwg/ralph/cost-tracking.json` — aggregated history index

3. **Compute trend data**:
   - Session-over-session delta
   - Rolling 7-session average
   - Outlier detection (sessions > 2x average)

4. **Run the command**:

   ```bash
   # All sessions, newest first
   aiwg cost-history

   # Most recent 10 sessions
   aiwg cost-history --last 10

   # Sessions in the past 30 days
   aiwg cost-history --since 30d

   # Trend analysis
   aiwg cost-history --trend

   # Sorted by cost descending
   aiwg cost-history --sort cost

   # JSON output
   aiwg cost-history --json
   ```

## Report Format

### Standard History Output

```
Cost History (12 sessions)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date        Session                     Tokens    Cost    Status
──────────  ──────────────────────────  ────────  ──────  ──────
2026-04-01  sdlc-review-143022          61,250    $0.18   green
2026-03-31  greenfield-092211           94,800    $0.28   green
2026-03-30  security-review-174503     118,400    $0.36   yellow
2026-03-28  api-development-110022      52,100    $0.15   green
2026-03-26  full-stack-iteration-3     201,700    $0.61   red *outlier
...

Totals (12 sessions)
  Total tokens: 842,100
  Total cost:   $2.54
  Avg/session:  $0.21

7-session rolling average: $0.23
Trend: stable (±8% over last 7 sessions)
```

### Trend Output (`--trend`)

```
Cost Trend — Last 7 Sessions
  Session 6 (oldest):  $0.28
  Session 5:           $0.22
  Session 4:           $0.36
  Session 3:           $0.15
  Session 2:           $0.61  ← outlier (full-stack-iteration-3)
  Session 1:           $0.18
  Current avg:         $0.23

Direction: stable
Outliers:  1 (full-stack-iteration-3 — 2.6x average)
```

## Efficiency Thresholds

Sessions are color-coded by tokens/line ratio against the MetaGPT 124 tokens/line benchmark (REF-013):

| Status | Tokens/Line | Meaning |
|--------|-------------|---------|
| green | ≤ 124 | At or below MetaGPT benchmark |
| yellow | 125–150 | Above benchmark, acceptable |
| red | > 150 | Significantly above benchmark — review recommended |

## Examples

### Example 1: Quick history overview

**User**: "Show cost history"

**Action**:
```bash
aiwg cost-history
```

**Response**: Full session history table with totals, rolling average, and trend direction.

### Example 2: Recent session costs

**User**: "What did the last 3 sessions cost?"

**Extraction**: `--last 3`

**Action**:
```bash
aiwg cost-history --last 3
```

**Response**:
```
Cost History (last 3 sessions)

Date        Session                  Tokens   Cost
──────────  ───────────────────────  ───────  ────
2026-04-01  sdlc-review-143022       61,250   $0.18
2026-03-31  greenfield-092211        94,800   $0.28
2026-03-30  security-review-174503  118,400   $0.36

Total: $0.82 over 3 sessions  (avg: $0.27)
```

### Example 3: Identifying expensive outliers

**User**: "Which sessions were most expensive?"

**Action**:
```bash
aiwg cost-history --sort cost
```

**Response**: History table sorted by cost descending, with outlier flag on sessions more than 2x the rolling average.

## Clarification Prompts

If a time window is ambiguous:

- "Should I show all-time history or a specific window? (e.g., last 7 days, last 30 days)"

## References

- @$AIWG_ROOT/src/cli/handlers/subcommands.ts — Cost history handler
- @$AIWG_ROOT/src/metrics/token-counter.ts — Token counting and MetaGPT baseline (REF-013)
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
