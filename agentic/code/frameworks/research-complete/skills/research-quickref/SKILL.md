---
name: research-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: Research framework quick reference — corpus inception, paper acquisition, GRADE quality, citation graphs, and provenance-tracked synthesis
---

# Research Framework — Quick Reference

You are operating in a project that has the AIWG **research-complete** framework installed. This skill is your always-loaded directory for research-corpus workflows. The full skill catalog is reachable through the AIWG artifact index.

## What this framework is for

Research workflow automation. Builds and maintains a citation-graphed research corpus: discover papers, acquire PDFs, induct sources with structured analysis, assess quality via GRADE, build citation networks, query with grounded answers, and archive with W3C PROV provenance. Works hand-in-hand with the kernel `aiwg-utils` skills.

## When to reach for which skill

| Need | Skill | How to invoke |
|---|---|---|
| Find papers on a topic | `research-discover` | "find papers about X" |
| Download a paper + extract metadata | `research-acquire` | "fetch this paper" |
| Induct a source into the corpus | `induct-research` | "induct this paper" |
| Run multi-stage research workflow | `research-workflow` | "research X end-to-end" |
| Generate literature note from a paper | `research-document` | "summarize this paper" |
| Assess a source via GRADE | `research-quality` (alias `quality-assess`) | "GRADE this source" |
| Generate a corpus-wide GRADE report | `grade-report` | "GRADE distribution" |
| Auto-grade on ingest | `grade-on-ingest` | (background hook) |
| Check citation quality | `citation-check` / `citation-guard` | "check citations in X" |
| Verify all citations resolve | `verify-citations` | "verify citations" |
| Format a citation | `research-cite` | "cite REF-008" |
| Query the corpus, grounded | `research-query` | "what does the corpus say about Y?" |
| Detect research gaps | `research-gap` / `research-gap-detect` | "find research gaps" |
| Build citation graph indices | `corpus-index-build` | "build citation network" |
| Backfill bidirectional citation edges | `citation-backfill` | "fix citation edges" |
| Snapshot corpus state | `corpus-snapshot` | "snapshot the corpus" |
| Export corpus subsets | `corpus-export` | "export cluster X" |
| Archive corpus for long-term | `research-archive` | "archive the corpus" |
| Corpus health & integrity | `corpus-health` | "corpus health check" |
| Lint the corpus | `research-lint` | "lint research" |
| Show research status | `research-status` | "research status" |
| Generate provenance record | `provenance-create` / `auto-provenance` | "track provenance" |
| Query provenance chains | `provenance-query` / `provenance-report` | "trace REF-008 lineage" |
| Best-practices audit (cited) | `best-practices-audit` | "audit X against best practices" |
| Quality audit of corpus depth | `research-quality-audit` | "audit shallow stubs" |

This framework ships **20 skills**. Reach for `aiwg index discover` for anything not listed.

## Corpus directory layout

Research artifacts go under `.aiwg/research/`:

```
.aiwg/research/
├── findings/         # REF-XXX literature notes (one per source)
├── citations/        # Citation sidecars (REF-XXX-citations.md)
├── sources/          # Acquired papers (PDFs, metadata)
├── profiles/         # Entity profiles (PROF-P-*, PROF-O-*, ...)
│   ├── people/       # PROF-P-* author/researcher profiles
│   ├── orgs/         # PROF-O-* organizations
│   ├── funders/      # PROF-F-* funding bodies
│   └── groups/       # PROF-G-* research groups
└── reports/          # GRADE distributions, gap reports, snapshots
```

## ID conventions

- `REF-NNN` — research papers (citation-network nodes)
- `PROF-[POFG]-<slug>` — entity profiles (people / orgs / funders / groups)
- Both ID spaces are first-class in `aiwg index neighbors` traversal.

## Finding the right skill when this quickref doesn't list it

```bash
aiwg index discover "<phrase>"
```

The corpus is large and operations are highly composable. Common alternates: `induct-research` (the "ingest a single source" entry), `research-workflow` (multi-stage pipeline), `research-query` (the "ask the corpus" entry).

## Common multi-skill flows

- **Topic exploration → corpus build**: `research-discover` → `research-acquire` → `induct-research` → `research-document` → `research-quality`
- **Citation graph rebuild**: `corpus-index-build` → `citation-backfill` → `research-gap-detect`
- **Grounded answer**: `research-query` → `verify-citations` → `research-cite`
- **Quarterly snapshot**: `corpus-snapshot` → `corpus-health` → `grade-report` → `research-archive`

## GRADE methodology

Quality grading is opinionated and built-in. When inducting:
- Apply `research-quality` to assess study design, sample size, conflicts, peer review
- Tag with HIGH / MODERATE / LOW / VERY LOW per GRADE
- Higher-quality sources earn lower hedging in synthesis; LOW/VERY LOW require explicit hedging in any output

## Don't list from this skill — query the index

If a user asks "what research skills are available?", **do not enumerate from memory**. Run `aiwg index discover --type skill --graph framework "research"`. This skill exists to orient.
