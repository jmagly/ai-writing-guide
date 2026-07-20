---
namespace: aiwg
platforms: [all]
name: radar-report
description: Aggregate research-corpus radar sidecars into a corpus or per-cluster freshness report — totals, overdue count, per-cluster / per-GRADE / per-trajectory breakdowns, an overdue table, and per-radar rationale snippets. Runs via `aiwg corpus radar-report`.
commandHint:
  argumentHint: "[--cluster TAG] [--out PATH]"
  allowedTools: Read, Bash
  model: haiku
  category: research-radar
  modelRole: efficiency
  modelTier: economy
---

# Radar Report

The corpus/cluster freshness summary — a roll-up across all radar sidecars
(or one cluster), suitable for a periodic review.

## How to run

```bash
aiwg corpus radar-report                              # full-corpus report to stdout
aiwg corpus radar-report --cluster pid-control        # one cluster
aiwg corpus radar-report --out indices/radar-report.md   # write into the corpus
```

The report includes:
- **Totals** + overdue count
- **Clusters** table (count + stale per cluster)
- **GRADE distribution** and **GRADE-trajectory** breakdowns
- An **Overdue Refreshes** table (most-overdue-first)
- A per-radar summary with the §1 GRADE-reassessment rationale snippet

Empty corpus → a friendly "no radar sidecars yet" note.

## Triggers

- "radar report"
- "corpus freshness report"
- "freshness summary for cluster X"
- `/radar-report`

## References

- @$AIWG_ROOT/src/artifacts/corpus-tools/radar-report.ts — implementation
- radar-init (scaffold) / radar-status (overdue list) skills
