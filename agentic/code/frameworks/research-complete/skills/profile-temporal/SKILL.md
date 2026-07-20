---
namespace: aiwg
platforms: [all]
name: profile-temporal
description: Compute an entity's publication trajectory — per-year paper counts, topic drift, hot-streak detection (≥3 consecutive A-grade years), and career phase. Runs via `aiwg corpus profile-temporal`.
commandHint:
  argumentHint: "--entity PROF-P-x [--out PATH]"
  allowedTools: Read, Bash
  model: haiku
  category: research-analytics
  modelRole: efficiency
  modelTier: economy
---

# Profile Temporal

Publication-trajectory analysis for one profile (the §7 table + hot-streak).

## How to run

```bash
aiwg corpus profile-temporal --entity PROF-P-vaswani-ashish
aiwg corpus profile-temporal --entity PROF-P-vaswani-ashish --out indices/vaswani-trajectory.md
```

Reports per-year paper counts, top topics, **topic drift** (cosine distance
between consecutive-year topic vectors; >0.3 flagged as a pivot), **hot-streak**
(≥3 consecutive years each with ≥1 A-grade paper, Fortunato 2018), **career
phase** (early ≤5y / mid ≤15y / senior), and trajectory trend.

## Triggers

- "publication trajectory for X"
- "hot streak detection"
- "topic drift over time"
- `/profile-temporal`

## References

- @$AIWG_ROOT/src/artifacts/corpus-tools/profile-temporal.ts — implementation
- profile-metrics / profile-communities skills
