---
name: research-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: Research framework quick reference — capability domains and curated discovery phrases for corpus inception, paper acquisition, GRADE quality, citation graphs, and provenance-tracked synthesis
---

# Research Framework — Quick Reference

This is your always-loaded directory for the AIWG **research-complete** framework. It does **not** list every skill. Instead, it teaches the framework's mental model and gives you **curated search phrases** that map to `aiwg discover` lookups.

## Canonical access pattern: discover → show

When you find a candidate via `aiwg discover`, fetch its body with `aiwg show <type> <name>`. **Never** use `find`, `ls`, `Glob`, or direct `Read` on `<provider>/skills/` paths — those reflect the kernel-pivot deploy state, not the full surface.

```bash
aiwg discover "<phrase>"             # find — returns ranked candidates
aiwg show skill <name>               # fetch — streams the SKILL.md body
```

If your platform's Skill tool errors on a non-kernel skill (expected — most aren't kernel), the fallback is `aiwg show`, never filesystem browsing. Last-resort if `aiwg` itself is broken: read directly from `$AIWG_ROOT/agentic/code/...` (the canonical corpus, always present).

## How to use this quickref

1. Identify the **capability domain** the user's need belongs to
2. Pick a **curated phrase** from that domain (or paraphrase the user's words)
3. Run `aiwg discover "<phrase>"` and surface the top match (or top-3) to the user

**Do not enumerate skills from memory.** Discovery is the lookup surface.

## What this framework is for

Research workflow automation. Builds and maintains a citation-graphed research corpus: discover papers, acquire PDFs, induct sources with structured analysis, assess quality via GRADE, build citation networks, query with grounded answers, and archive with W3C PROV provenance.

## Capability domains

| Domain | Covers |
|---|---|
| **Discovery & acquisition** | Find papers across academic databases, download PDFs, extract metadata |
| **Induction & summarization** | Bring sources into the corpus with structured analysis and literature notes |
| **Quality assessment** | GRADE methodology — assess study design, sample size, conflicts, peer review |
| **Citation graphs** | Build/maintain citation networks, detect gaps, traverse with `aiwg index neighbors` |
| **Querying the corpus** | Grounded answers with inline REF-XXX citations |
| **Health & integrity** | Lint corpus, snapshot state, archive with provenance |

## Curated discovery phrases

### Discovery & acquisition

```bash
aiwg discover "research workflow"              # → research-workflow (score 1.00)
aiwg discover "research discover"              # → research-discover
aiwg discover "acquire research papers"        # → research-acquire
aiwg discover "best practices audit"           # → best-practices-audit
```

### Induction & summarization

```bash
aiwg discover "induct research source"         # → induct-research (score 1.00)
aiwg discover "research document summary"      # → research-document
```

### Quality assessment

```bash
aiwg discover "GRADE source quality"           # → grade-on-ingest / quality-assess
aiwg discover "research quality audit"         # → research-quality-audit
aiwg discover "GRADE distribution report"      # → grade-report
```

### Citation graphs

```bash
aiwg discover "citation network"               # → corpus-index-build / citation-backfill
aiwg discover "verify citations"               # → verify-citations (score 1.00)
aiwg discover "research gap detection"         # → research-gap-detect
aiwg discover "citation guard"                 # → citation-guard
aiwg discover "format citation"                # → research-cite
```

### Querying the corpus

```bash
aiwg discover "research query corpus"          # → research-query (score 0.90)
aiwg discover "research status"                # → research-status
```

### Health, snapshot & archive

```bash
aiwg discover "snapshot the corpus"            # → corpus-snapshot (score 1.00)
aiwg discover "corpus export"                  # → corpus-export
aiwg discover "research archive"               # → research-archive
aiwg discover "research lint"                  # → research-lint
```

### Provenance

```bash
aiwg discover "create provenance record"       # → provenance-create / auto-provenance
aiwg discover "query provenance chain"         # → provenance-query / provenance-report
aiwg discover "validate provenance"            # → provenance-validate
```

## Corpus directory layout

Research artifacts go under `.aiwg/research/`:

```
.aiwg/research/
├── findings/         # REF-XXX literature notes (one per source)
├── citations/        # Citation sidecars (REF-XXX-citations.md)
├── sources/          # Acquired papers (PDFs, metadata)
├── profiles/         # Entity profiles
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

## GRADE methodology

Quality grading is opinionated and built-in. When inducting:
- Apply quality assessment at ingest
- Tag with HIGH / MODERATE / LOW / VERY LOW per GRADE
- Higher-quality sources earn lower hedging in synthesis; LOW/VERY LOW require explicit hedging in any output

## When the curated phrases don't fit

```bash
aiwg discover "<your need, paraphrased>" --limit 5
```

## Anti-pattern: don't enumerate

If a user asks "what research skills are available?", **do not list from this skill**. Run:

```bash
aiwg discover --type skill --limit 20 "<their interest area>"
```
