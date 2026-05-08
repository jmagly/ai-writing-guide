---
namespace: aiwg
platforms: [all]
name: research-quality-audit
description: Audit a research corpus for shallow stubs, missing sources, and doc-depth issues. Detects docs written from abstracts rather than full papers; can dispatch expansion agents.
commandHint:
  argumentHint: "[--range REF-XXX:YYY] [--fix] [--threshold N] [--format full|summary|json]"
  allowedTools: Read, Write, Glob, Grep, Bash, Agent
  model: sonnet
  category: research-validation
---

# Research Quality Audit

Audit the research corpus for shallow stubs, incomplete documentation, and missing source files. Detects analysis docs written from abstracts alone (the root cause of the 88-stub incident) and reports doc depth metrics across the corpus.

## Triggers

- "audit research quality"
- "check for stubs"
- "find shallow docs"
- "research quality audit"
- "how deep are the analysis docs?"
- `/research-quality-audit`

## Parameters

### `--range REF-XXX:YYY` (optional)
Audit a specific range of REF identifiers. Default: entire corpus.

### `--fix` (optional)
Auto-dispatch expansion agents to deepen stubs. Each stub gets a focused agent that reads the full PDF/source and rewrites the analysis doc.

### `--threshold N` (optional)
Minimum line count for a doc to be considered non-stub. Default: 80.

### `--format` (optional)
Output format: `full` (default), `summary`, or `json`.

### `--pdf-check` (optional)
Also verify that each REF has an actual PDF or source file, not just metadata.

## Execution Flow

### Phase 1: Corpus Scan

1. **Glob** all finding docs: `.aiwg/research/findings/REF-*.md`
   (and/or `documentation/references/REF-*.md` depending on corpus layout)
2. For each doc, collect:
   - **Line count** (total lines)
   - **Content lines** (non-empty, non-frontmatter, non-heading lines)
   - **Section count** (number of `##` headings)
   - **Key quote count** (blockquotes or inline quotes)
   - **Source availability** — does the PDF exist at the referenced `pdf_location`?
   - **Full text available** — does `sources/text/REF-XXX.txt` exist?
   - **Frontmatter completeness** — required fields present?

### Phase 2: Classification

Classify each doc into quality tiers:

| Tier | Content Lines | Sections | Quotes | Verdict |
|------|-------------|----------|--------|---------|
| **Full** | >= 150 | >= 8 | >= 3 | Comprehensive analysis |
| **Adequate** | 80-149 | >= 5 | >= 1 | Meets minimum depth |
| **Stub** | 40-79 | >= 3 | 0 | Written from abstract — needs expansion |
| **Skeleton** | < 40 | any | 0 | Placeholder only — needs full rewrite |

Additional flags:
- **No PDF**: analysis exists but source PDF is missing
- **No full text**: PDF exists but text extraction was not run
- **Abstract-only indicators**: doc mentions "abstract" but no methodology/results sections

### Phase 3: Report

```
Research Quality Audit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Corpus: 372 documents
Threshold: 80 content lines

Quality Distribution:
  Full (150+):      124 (33%)  ████████████████░░░░░░░░░░
  Adequate (80-149): 89 (24%)  ████████████░░░░░░░░░░░░░░
  Stub (40-79):      98 (26%)  █████████████░░░░░░░░░░░░░
  Skeleton (<40):    61 (16%)  ████████░░░░░░░░░░░░░░░░░░

Statistics:
  Mean content lines:  112
  Median:              94
  Min:                 12 (REF-299)
  Max:                 591 (REF-018)

Source Availability:
  PDF present:         348 / 372 (94%)
  Full text extracted:  201 / 372 (54%)
  Missing PDF:          24 papers
  Missing text:        171 papers

Stubs Requiring Expansion (159):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  REF-253  22 lines  skeleton  No PDF    "Agentic Design Patterns"
  REF-254  35 lines  skeleton  Has PDF   "Multi-Agent Debate"
  REF-255  45 lines  stub      Has PDF   "Language Agent Tree Search"
  REF-256  48 lines  stub      No text   "ReAct: Synergizing Reasoning"
  ...

Top 10 Shallowest (candidates for immediate expansion):
  1. REF-299  12 lines  skeleton  "Toolformer: Language Models Can..."
  2. REF-312  15 lines  skeleton  "WebArena: A Realistic Web..."
  3. REF-253  22 lines  skeleton  "Agentic Design Patterns..."
  ...
```

### Phase 4: Auto-Fix (if --fix)

When `--fix` is specified:

1. **Filter fixable stubs** — only expand docs that have a PDF or full text available
2. **Batch by priority** — shallowest docs first, batch into groups of 10
3. **Dispatch expansion agents** — each agent:
   - Reads the full PDF/extracted text for the source
   - Rewrites the analysis doc with comprehensive content
   - Target: 150+ content lines with methodology, findings, limitations, key quotes
4. **Re-audit after expansion** — run Phase 1-3 again to verify improvements
5. **Report** — docs expanded, mean line improvement, remaining stubs

```
Auto-Fix Results:
  Dispatched: 10 expansion agents (batch 1 of 16)
  Expanded: 10 / 10
  Mean improvement: 77 → 161 lines (+109%)
  Remaining stubs: 149

  Run again with --fix to process next batch.
```

## Integration Points

| Component | Relationship |
|-----------|-------------|
| `induct-research` | Quality audit should auto-run after batch induction |
| `corpus-snapshot` | Gates on stub rate > 10% (#814) |
| `research-lint` | `ref-frontmatter` rule catches incomplete metadata; quality-audit catches shallow content |
| `research-status` | Doc depth is a component of corpus health scoring |
| `research-acquire` | For stubs with missing PDFs, triggers acquisition before expansion |

## Distinction from Other Tools

| Tool | What it checks |
|------|---------------|
| `research-lint` | **Structural** — frontmatter fields, naming, references resolve |
| `research-quality-audit` | **Depth** — is the content substantive? Was the source actually read? |
| `research-quality` | **Evidence** — GRADE assessment of the source's research quality |
| `corpus-health` | **Aggregate** — overall corpus metrics including depth, structure, coverage |

## Examples

```bash
# Full corpus audit
/research-quality-audit

# Audit specific range
/research-quality-audit --range REF-253:372

# Auto-expand stubs (batch of 10)
/research-quality-audit --fix

# Strict threshold (120 lines minimum)
/research-quality-audit --threshold 120

# Check source file availability
/research-quality-audit --pdf-check

# JSON for programmatic use
/research-quality-audit --format json
```

## References

- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/induct-research/SKILL.md — Source of stubs when acquisition is skipped
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-acquire/SKILL.md — Acquires PDFs for stub expansion
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-lint/SKILL.md — Structural validation (complementary)
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-quality/SKILL.md — GRADE evidence assessment (complementary)
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-status/SKILL.md — Health scoring includes depth metrics
