---
namespace: aiwg
platforms: [all]
name: curator-status
description: Report research-corpus discovery curators (PROF-S) ranked by yield (return-to score = inducted-ref-count × avg GRADE), with revisit-cadence staleness and a discovery-orphan check. Runs via `aiwg corpus curator-status`.
commandHint:
  argumentHint: "[--out PATH]"
  allowedTools: Read, Bash
  model: sonnet
  category: research-discovery
---

# Curator Status

The "which accounts should I return to?" report — ranks PROF-S curators by their
**return-to score** (inducted-ref count × average GRADE of surfaced papers) and
surfaces curators overdue for a revisit, plus discovery orphans.

## How to run

```bash
aiwg corpus curator-status                          # ranked table + orphan section to stdout
aiwg corpus curator-status --out indices/curators.md
```

Reports, per PROF-S: inducted-ref count, avg GRADE, return-to score, signal
quality, revisit cadence, and overdue days (revisit-cadence vs last-harvested,
via the shared staleness helper). The **Discovery orphans** section lists
sidecars whose `discovery.curator-id` is set but the named curator is absent or
is missing that REF in its `corpus-refs` (SOURCE-TRACKING §3 — the check fires
only when curator-id is set).

## Triggers

- "which curators have the best yield?"
- "curator status / return-to ranking"
- "find discovery orphans"
- `/curator-status`

## References

- @$AIWG_ROOT/src/artifacts/corpus-tools/curator.ts — implementation
- discovery-log / curator-init skills; the by-curator view (#1492)
