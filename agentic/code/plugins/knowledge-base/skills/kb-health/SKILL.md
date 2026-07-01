---
namespace: aiwg
platforms: [all]
name: kb-health
description: Lint and health-check the knowledge base. Finds orphan pages, missing cross-references, stale claims, broken wiki-links, and regenerates the index.
commandHint:
  argumentHint: "[--path <subtree>] [--kb <path>] [--fix] [--index-only]"
  allowedTools: Read, Write, Glob, Grep, Bash
  model: sonnet
  category: knowledge-base
---

# KB Health

Audit the knowledge base for structural and content issues. Reports problems and, with `--fix`, repairs what can be fixed automatically (broken links, missing index entries). Human review is required for content issues (stale claims, empty sections).

## Triggers

- "check KB health" → full audit
- "find orphan pages" → orphan check only
- "regenerate KB index" → `--index-only`
- `/kb-health` → direct invocation

## Parameters

### `--path <subtree>` (optional)
Scope the check to a subdirectory (e.g., `--path .aiwg/kb/entities/`). Defaults to full KB root.

### `--kb <path>` (optional)
Root of the knowledge base. **Default**: resolved by `aiwg kb path` (#965), which reads `resolveStorage('kb')` and honors any `roots.kb` override in `.aiwg/storage.config`. On the default `fs` backend this is `.aiwg/kb/`.

```bash
KB_ROOT=$(aiwg kb path)
aiwg kb list --prefix entities/
aiwg kb get entities/foo.md
```

### `--fix` (optional)
Automatically repair issues that are safe to fix without human judgment:
- Remove references to confirmed-missing pages from Sources tables
- Add pages missing from the index
- Normalize slug inconsistencies (spaces → hyphens in filenames)

Does NOT auto-fix: empty required sections, stale claim dates, ambiguous duplicates.

### `--index-only` (optional)
Skip all checks; only regenerate `index.md`.

---

## Checks

### 1. Orphan Pages

An orphan is a page with no incoming `[[wiki-link]]` references from any other KB page.

Procedure:
1. Collect all `.md` files under `<kb>/`.
2. For each file, extract all `[[...]]` references.
3. Build an inverted index: page → set of pages that link to it.
4. Pages with zero incoming links are orphans.

Orphans in `sources/` are less critical (sources are often terminal nodes). Report them separately.

### 2. Broken Wiki-Links

For every `[[link-target]]` found in any KB page:
1. Derive the expected file path (slug → filename in each subdirectory).
2. Check whether the file exists.
3. If not: report as a broken link with the containing file and line number.

With `--fix`: remove confirmed-broken links from Sources tables. Flag broken links in prose sections for manual review (do not silently remove).

### 3. Empty Required Sections

Templates define required sections (Overview, Definition, Key Takeaways, etc.).
Detect pages where a required section header exists but the body is a placeholder (`_..._` or a single empty line).

Report as warnings, not errors. Do not auto-fix content.

### 4. Stale Pages

A page is considered stale if:
- Its `_Last updated:` date is more than 180 days ago, AND
- At least one source it references was published after that date (detectable via source summary dates)

Report stale pages as advisory — staleness is informational, not a structural error.

### 5. Duplicate Slugs

Detect files with the same normalized slug in different subdirectories (e.g., `entities/python.md` and `concepts/python.md`). These may be legitimate or accidental duplicates. Report all cases; do not auto-resolve.

---

## Index Regeneration

Always regenerate `<kb>/index.md` at the end of a health check run (or when `--index-only` is used).

The index lists all KB pages grouped by directory with their first-line description (the `>` blockquote line from templates):

```markdown
# Knowledge Base Index

_Generated: YYYY-MM-DD — N pages_

## Entities (N)
- [Entity Name](entities/entity-name.md) — type · domain

## Concepts (N)
- [Concept Name](concepts/concept-name.md) — category · domain

## Sources (N)
- [Source Title](sources/source-slug.md) — type · author · date

## Comparisons (N)
- [A vs B](comparisons/a-vs-b.md) — purpose

## Syntheses (N)
- [Synthesis Title](syntheses/synthesis-slug.md) — type · confidence
```

---

## Report Format

```
KB Health Report — YYYY-MM-DD
Root: .aiwg/kb/
Pages scanned: N

ERRORS (must fix)
  Broken links: N
    entities/foo.md:12 — [[missing-page]] not found

WARNINGS (review recommended)
  Orphan pages: N
    sources/old-article.md — no incoming links
  Empty sections: N
    concepts/bar.md — Definition section is placeholder
  Stale pages: N
    entities/baz.md — last updated 2024-01-01 (>180 days)

INFO
  Duplicate slugs: N
    entities/python.md and concepts/python.md share slug "python"

Index regenerated: .aiwg/kb/index.md (N entries)
```

---

## Scope Limits

- Read-only by default. `--fix` enables targeted writes; `--index-only` writes only `index.md`.
- Do not delete any pages, even if they appear to be duplicates. Report and let the human decide.
- Maximum pages scanned per run: 500. If KB exceeds this, use `--path` to scope.

## References

- @$AIWG_ROOT/agentic/code/frameworks/knowledge-base/templates/entity-page.md
- @$AIWG_ROOT/agentic/code/frameworks/knowledge-base/templates/concept-page.md
- @$AIWG_ROOT/agentic/code/frameworks/knowledge-base/templates/source-summary.md
- @$AIWG_ROOT/agentic/code/frameworks/knowledge-base/skills/kb-ingest/SKILL.md
