---
kind: status
domain: Research Corpus
description: Reports corpus size, citation graph health, and lint findings for the research-complete framework
detect:
  glob:
    - ".aiwg/research/findings/**/*.md"
    - ".aiwg/research/sources/**/*.md"
    - ".aiwg/research/syntheses/**/*.md"
    - ".aiwg/research/findings/REF-*.md"
  minCount: 1
fields:
  total_findings:
    type: number
    source: ".aiwg/research/findings"
    count: "^# REF-"
---

# Research Corpus Status Contributor

Reports observed state of a research corpus managed by the `research-complete`
framework. Activates when corpus content (findings, sources, or syntheses)
exists under `.aiwg/research/`.

## What This Contributor Reports

When the corpus is in use, the aggregator should produce a research status
block covering:

### 1. Corpus Size

- Number of findings (`REF-*.md` files under `.aiwg/research/findings/`)
- Number of sources / acquisitions (`.aiwg/research/sources/`)
- Number of syntheses / lit notes (`.aiwg/research/syntheses/`)

### 2. Citation Graph Health

- Outgoing citation density (average outgoing citations per finding) if
  `.aiwg/.index/citations.json` is present from `aiwg index build`
- Orphan findings — findings with zero incoming or outgoing citations
- Stale claims flagged in `.aiwg/research/lint-findings.md` (if present from
  the most recent `research-lint` run)

### 3. Lint Findings

If `aiwg run research-lint` has produced output under
`.aiwg/research/lint-findings.md` or similar, surface:
- Count of issues by severity (error / warn / info)
- Date of last lint run
- Top 3 most common issue types

### 4. Inducted-but-Unintegrated Sources

Sources acquired but not yet integrated into findings — files in
`.aiwg/research/sources/` without corresponding `REF-*.md` references.

### 5. GRADE Quality Distribution

If quality assessments are present (frontmatter `grade:` field on findings),
surface distribution: `<N> high / <M> moderate / <L> low / <U> unrated`.

## Output Format Guidance

```
├─ Research Corpus: <K> findings, <O> orphans, <I> lint issues, last linted <date>
```

Detail under the block:

```
├─ Research Corpus
│  ├─ Findings: 712 (high: 198, moderate: 384, low: 87, unrated: 43)
│  ├─ Citation graph: avg 4.2 outgoing per finding, 11 orphans
│  ├─ Lint: 3 errors, 21 warnings (last run: 2026-04-25)
│  └─ Inducted-not-integrated: 17 sources awaiting findings
```

## Anti-Pattern Reminders

- Do not run `aiwg index build` from this contributor — it's a status report,
  not a maintenance trigger. If the citation graph index is stale, surface
  that fact rather than rebuilding it.
- Do not read every finding's body. Frontmatter + filenames + sidecar
  index/lint files contain enough signal for a status block.
- Do not surface raw citations or quotes in the status report. That belongs
  in `research-status` (deep dive), not `project-status` (overview).
