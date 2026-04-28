---
kind: research
domain: Research methodology
description: Validates research methodology, citation hygiene, and source quality against current scholarly and information-science practice
detect:
  glob:
    - ".aiwg/research/findings/**/*.md"
    - ".aiwg/research/sources/**/*.md"
    - ".aiwg/research/syntheses/**/*.md"
    - ".aiwg/research/lint-findings.md"
  minCount: 1
focus_areas:
  - research-methodology
  - citation-quality
  - source-classification
  - reproducibility
  - corpus-curation
sources:
  preferred:
    - academic
    - standards-bodies
    - methodology-handbooks
    - library-science
  exclude:
    - seo-spam
    - ai-content-farms
recency_default_months: 36
---

# Research Methodology Research Contributor

When the `research-complete` framework is in use (detected via the presence
of a corpus under `.aiwg/research/`), `best-practices-audit` should weight
its research toward sources with authority on research methodology, citation
hygiene, and corpus curation rather than the substantive topic of the corpus.

## What This Contributor Configures

### Focus Areas

| Area | What it covers |
|------|---------------|
| `research-methodology` | study design, GRADE adaptation, evidence hierarchies |
| `citation-quality` | reference standards (APA, IEEE, Vancouver), DOI hygiene, citation graph practices |
| `source-classification` | primary/secondary/tertiary categorization, peer-review standards |
| `reproducibility` | data availability, provenance, replication studies |
| `corpus-curation` | inclusion criteria, deduplication, lint rules, version control |

### Source Preferences

**Preferred** (high-trust for methodology):

- `academic` — published methodology papers, JAMA/BMJ/SAGE methodological articles
- `standards-bodies` — ISO 690 (citations), W3C provenance specs, COUNTER/CASRAI
- `methodology-handbooks` — Cochrane Handbook, GRADE handbook, similar canonical references
- `library-science` — LIS journals (JASIST, Library Trends) for retrieval and classification

**Excluded**: same SEO/AI-content exclusions as other research contributors.

### Recency Default

36 months. Methodology practice changes slowly — citation standards and
evidence frameworks have multi-decade lifespans. A short window misses
the canon. The audit tightens automatically when validating tooling-
specific claims (e.g. "the Cochrane handbook v6 says X") — that's a tool
version question, not a methodology question.

## Notes on Scope

This contributor configures research **about** research, not research
about whatever subject the corpus contains. If a project's corpus is
about LLM safety, the substantive research goes through other contributors
(SDLC, marketing, etc.); this contributor validates that the corpus's
own research practices are sound.

## Anti-Pattern Reminders

- Do not pull this contributor into substantive subject-matter research.
  Its preferences are calibrated for methodology, not for the topics in
  the corpus.
- Do not exclude practitioner blogs entirely — high-quality methodology
  blogs (e.g. Trish Greenhalgh, Ben Goldacre) may surface here even though
  they're not in the preferred classes. The audit's source-quality gate
  (GRADE) handles individual source quality.
- Do not assume citation-quality issues are always citation-format issues.
  The deeper concern is fabricated citations, weak source classification,
  or stale claims — those rank above formatting nits.
