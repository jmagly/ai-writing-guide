---
namespace: aiwg
platforms: [all]
name: radar-status
description: Report which research-corpus radar sidecars are overdue for refresh. Computes staleness (days since last refresh vs the cadence window) for every radar, sorted most-overdue-first. Runs via `aiwg corpus radar-status`.
commandHint:
  argumentHint: "[--stale-only] [--format table|csv|list] [--out PATH]"
  allowedTools: Read, Bash
  model: haiku
  category: research-radar
  modelRole: efficiency
  modelTier: economy
---

# Radar Status

Report overdue radar sidecars — the operational "what needs a refresh" view.
One row per radar, sorted most-overdue-first.

## How to run

```bash
aiwg corpus radar-status                          # markdown table to stdout, all radars
aiwg corpus radar-status --stale-only             # only overdue radars
aiwg corpus radar-status --format csv             # csv (table | csv | list)
aiwg corpus radar-status --out indices/radar-status.md   # write to a file in the corpus
```

- **Overdue** = days since `last-refreshed` minus the cadence window
  (monthly 30, quarterly 90, biannual 180, annual 365). `on-demand` and
  undatable radars are never overdue and sort last.
- The cadence math is the single shared helper used by the `radar-stale-queue`
  view and `radar-report` (one source of truth, #1498/#1502).

## Triggers

- "which radars are overdue?"
- "show stale refreshes"
- "radar status"
- `/radar-status`

## References

- @$AIWG_ROOT/src/artifacts/corpus-tools/radar-status.ts — implementation
- radar-init (scaffold) / radar-report (aggregate) skills
