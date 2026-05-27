---
namespace: aiwg
platforms: [all]
name: profile-status
description: Report research-corpus entity profiles (PROF-P/O/G/F) past their refresh cadence. Computes staleness via the shared cadence helper, sorted most-overdue-first. Runs via `aiwg corpus profile-status`.
commandHint:
  argumentHint: "[--stale-only] [--format table|csv|list] [--out PATH]"
  allowedTools: Read, Bash
  model: sonnet
  category: research-profiles
---

# Profile Status

Report which entity profiles are overdue for refresh — the profile-subsystem
counterpart to `radar-status`, sharing the same cadence/staleness helper (#1498/#1502).

## How to run

```bash
aiwg corpus profile-status                       # markdown table to stdout, all profiles
aiwg corpus profile-status --stale-only          # only overdue profiles
aiwg corpus profile-status --format csv
aiwg corpus profile-status --out indices/profile-status.md
```

- Reads `refresh-cadence` + `last-refreshed` from each profile's frontmatter
  (`documentation/profiles/{people,orgs,groups,funders,sources}/PROF-*.md`).
- **Cadence vocab**: monthly / quarterly / semi-annual / annual / on-demand.
  A missing or unknown cadence is treated as `annual`; `on-demand` is never stale.
- **Stale** when overdue ≥ 0 (at or past the window) — faithful to
  `find_stale_profiles.py`. Profiles without `last-refreshed` are skipped.

## Triggers

- "which profiles are stale?"
- "profile refresh status"
- "overdue entity profiles"
- `/profile-status`

## References

- @$AIWG_ROOT/src/artifacts/corpus-tools/profile-status.ts — implementation
- radar-status — the radar-sidecar counterpart (shared staleness helper)
