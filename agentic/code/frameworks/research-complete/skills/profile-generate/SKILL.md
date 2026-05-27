---
namespace: aiwg
platforms: [all]
name: profile-generate
description: Scaffold compact PROF-P entity profiles for unprofiled hub authors — ranks corpus REFs by citation in-degree, takes each top REF's primary author, skips institutional/group names and already-profiled people. Runs via `aiwg corpus profile-generate`.
commandHint:
  argumentHint: "[--limit N] [--scan N] [--write]"
  allowedTools: Read, Bash, Write
  model: sonnet
  category: research-profiles
---

# Profile Generate

Generate Tier-1 `PROF-P` entity profiles for the corpus's most-cited authors who
don't have a profile yet — the bulk profile-induction pass.

## How to run

```bash
aiwg corpus profile-generate                 # dry-run: list the PROF-P profiles it would create
aiwg corpus profile-generate --write         # write them (skips existing)
aiwg corpus profile-generate --limit 10 --write
aiwg corpus profile-generate --scan 100 --limit 40 --write
```

- **Dry-run by default.** `--write` creates files; existing profiles are skipped.
- Ranks REFs by **corpus in-degree** (citations within the corpus, derived from
  the citation sidecars), takes each top REF's **primary author**, and skips
  institutional/group "authors" (team, labs, foundation, consortium, …) — those
  get group profiles, not PROF-P.
- `--scan N` = how many top-in-degree REFs to consider (default 60);
  `--limit N` = max profiles to generate (default 25).
- Generates a compact 5-section profile (summary, corpus presence, focus,
  co-author network, notes). `affiliation` is left blank for manual enrichment;
  `corpus-refs` is written as a list of REF-id strings.

## Triggers

- "generate profiles for top corpus authors"
- "scaffold tier-1 hub-author profiles"
- "profile the unprofiled hubs"
- `/profile-generate`

## References

- @$AIWG_ROOT/src/artifacts/corpus-tools/profile-generate.ts — implementation
- profile-status — entity-profile staleness; radar-init — the radar-sidecar analogue
