---
namespace: aiwg
platforms: [all]
name: curator-init
description: Scaffold a PROF-S source/curator profile for a research-corpus discovery curator (account/feed) from its handle. Runs via `aiwg corpus curator-init`.
commandHint:
  argumentHint: "--handle @account [--platform x] [--name \"N\"] [--cadence weekly] [--write]"
  allowedTools: Read, Bash, Write
  model: haiku
  category: research-discovery
  modelRole: efficiency
  modelTier: economy
---

# Curator Init

Scaffold a `PROF-S` source/curator profile so a discovery curator (an X account,
RSS feed, newsletter, …) can be tracked for yield and revisited deliberately.

## How to run

```bash
aiwg corpus curator-init --handle @askalphaxiv                          # dry-run
aiwg corpus curator-init --handle @askalphaxiv --platform x --cadence daily --write
aiwg corpus curator-init --handle @rohanpaul_ai --name "Rohan Paul" --write
```

- Slug derives from the handle: lowercased, leading punctuation stripped, `_`→`-`
  (`@_akhaliq` → `PROF-S-akhaliq`, `@rohanpaul_ai` → `PROF-S-rohanpaul-ai`).
- Writes `documentation/profiles/sources/PROF-S-{slug}.md` from the source-profile
  template. Dry-run unless `--write`; skips existing.
- `--cadence` is the revisit cadence: `daily | weekly | biweekly | monthly | on-demand`.
- Populate `signal-quality`, yield, and the surfaced-papers table on first harvest.

## Triggers

- "create a curator profile for @account"
- "scaffold PROF-S for this source"
- `/curator-init`

## References

- @$AIWG_ROOT/src/artifacts/corpus-tools/curator.ts — implementation
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/templates/source-profile.md — template
- curator-status / discovery-log skills
