---
namespace: aiwg
platforms: [all]
name: radar-init
description: Scaffold radar/freshness sidecars for research-corpus REFs. Pulls title/authors from the citation sidecar and GRADE from the analysis doc, defaults the refresh cadence from GRADE and the cluster from a corpus-local map, and stamps documentation/radar/REF-XXX-radar.md. Runs via `aiwg corpus radar-init`.
commandHint:
  argumentHint: "--ref REF-XXX | --all-missing [--cadence C] [--cluster T] [--write]"
  allowedTools: Read, Bash, Write
  model: sonnet
  category: research-radar
---

# Radar Init

Scaffold a radar/freshness sidecar for a REF. The radar sidecar tracks GRADE
re-assessment, refresh cadence, and signal-gathering history for a paper —
the read side (`by-grade`, `radar-stale-queue`, `by-trajectory` views) is
rendered by `aiwg index build` (#1492); this skill creates the sidecars those
views consume.

## How to run

```bash
aiwg corpus radar-init --ref REF-614                 # dry-run (prints what it would write)
aiwg corpus radar-init --ref REF-614 --write         # actually write the sidecar
aiwg corpus radar-init --ref REF-614 --cadence annual --cluster vla-robotics --write
aiwg corpus radar-init --all-missing --write         # every REF with a citation sidecar but no radar
```

- **Dry-run by default.** Add `--write` to create files. Existing radars are skipped.
- **Cadence** defaults from the analysis doc's GRADE: A→quarterly, B/C→biannual,
  D→on-demand. Override with `--cadence monthly|quarterly|biannual|annual|on-demand`.
- **GRADE** is read from the analysis doc (`documentation/references/REF-XXX-*.md`):
  the `**Quality**: A-` form the canonical/expanded reference templates use, or a
  `**GRADE:** A` form. The +/- sign is preserved.
- **Cluster** is resolved from the corpus-local cluster map (below). Override with `--cluster`.

## Cluster map (corpus-local, no hardcoded ranges)

Cluster tagging is data-driven: create `documentation/radar/clusters.yaml` in the
corpus mapping cluster tags to REF-number singletons and inclusive ranges:

```yaml
self-evolving-agents:
  - "599"
  - "615-619"
pid-control:
  - "600-605"
vla-robotics:
  - "629-635"
```

If the file is absent, scaffolded radars get no cluster (you can set `--cluster`
explicitly). The literal REF ranges live in the corpus, never in AIWG.

## Corpus root

The corpus root resolves as `AIWG_CORPUS_ROOT` env > `research.corpusRoot` in
`.aiwg/aiwg.config` > the current directory (#1497) — same as `aiwg index build`.

## Triggers

- "scaffold a radar for REF-XXX"
- "create radar sidecars for all missing refs"
- "init the freshness tracker for this paper"
- `/radar-init`

## References

- @$AIWG_ROOT/src/artifacts/corpus-tools/radar-init.ts — implementation
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/templates/radar-sidecar.md — sidecar template
- radar-status / radar-report skills — the report side
