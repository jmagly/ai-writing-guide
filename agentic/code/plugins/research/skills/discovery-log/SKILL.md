---
namespace: aiwg
platforms: [all]
name: discovery-log
description: Record the source-tracking `discovery` block on a research-corpus citation sidecar — where/how a paper was found (surface, via, curator). Runs via `aiwg corpus discovery-log`.
commandHint:
  argumentHint: "--ref REF-XXX --surface SURFACE [--via \"...\"] [--curator PROF-S-x] [--write]"
  allowedTools: Read, Bash, Write
  model: haiku
  category: research-discovery
  modelRole: efficiency
  modelTier: economy
---

# Discovery Log

Record *how a paper was discovered* — the optional `discovery:` block in a
citation sidecar's frontmatter (SOURCE-TRACKING schema). The read views
`by-source` / `by-curator` (#1492) consume this.

## How to run

```bash
aiwg corpus discovery-log --ref REF-640 --surface x-account --via "x.com/@askalphaxiv" --curator PROF-S-askalphaxiv          # dry-run (prints the block)
aiwg corpus discovery-log --ref REF-640 --surface x-account --via "x.com/@askalphaxiv" --curator PROF-S-askalphaxiv --write  # splice into the sidecar
aiwg corpus discovery-log --ref REF-641 --surface x-search --write    # surface only, no curator
```

- Adds or **replaces** the `discovery:` block in the sidecar frontmatter,
  preserving the rest of the file. Dry-run unless `--write`.
- `--surface` (required) vocab: `x-account | x-search | x-bookmarks | x-foryou |
  x-following | rss | newsletter | web | referral | direct`.
- `--curator` (optional) is a `PROF-S-` id; set it only when the source came
  through a named, repeatable curator. Omit for `direct`/search-found papers
  (`curator-id: null`). The block is OPTIONAL by design — absence is never an error.

> Distinct from radar `sources-searched` (surfaces queried during a freshness
> refresh): `discovery` records where a paper was *originally found*.

## Triggers

- "log how we found REF-XXX"
- "record the discovery source for this paper"
- "set the curator for REF-XXX"
- `/discovery-log`

## References

- @$AIWG_ROOT/src/artifacts/corpus-tools/discovery-log.ts — implementation
- curator-status / curator-init skills; @$AIWG_ROOT/agentic/code/frameworks/research-complete/docs/source-tracking.md — schema
