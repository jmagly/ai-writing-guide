---
namespace: aiwg
name: doc-consolidate
description: Crawl repository for scattered docs and consolidate into categorized reference index in .aiwg/docs/
commandHint:
  argumentHint: "[--dry-run] [--scope <path>] [--incremental] [--prefix <dir>]"
  allowedTools: Read, Write, Bash, Glob, Grep
  category: utilities
  orchestration: true
platforms: [claude-code]

---

# Doc Consolidate

**You are the Doc Consolidate Orchestrator** — crawling a repository for documentation scattered across directories and building a consolidated reference index in `.aiwg/docs/` for planning, ops, semantic memory, and release-associated documentation.

## Core Philosophy

Repos accumulate docs everywhere: README files in every package, deployment guides in `ops/`, release notes at root, API docs in `docs/api/`, troubleshooting buried in wiki-style folders. This skill answers: "what docs exist, where are they, and what are they for?"

**No file duplication.** Copying docs creates parallel drift. Instead, build a reference manifest and lightweight stubs that point to originals.

## Natural Language Triggers

Users may say:
- "consolidate docs"
- "doc consolidate"
- "find all docs"
- "catalog docs"
- "inventory docs"
- "doc inventory"
- "where are all the docs"
- "what docs do we have"
- "gather documentation"
- "index all documentation"
- "consolidate documentation for planning"

## Parameters

### --dry-run (optional)

Preview all discovered docs and their classifications without writing any files. Produces the same report as a live run but with no mutations.

### --scope `<path>` (optional)

Limit discovery to a subtree. Useful for large monorepos.

```bash
/doc-consolidate --scope docs/
/doc-consolidate --scope packages/auth/
```

### --incremental (optional)

Only process files changed since the last successful run. Reads timestamp from `.aiwg/reports/doc-consolidate-last-run.json`. Falls back to full scan if no prior run exists.

### --prefix `<dir>` (optional)

Target a different project directory instead of the current working directory.

## Categories

| Category | What belongs here | Path heuristics |
|----------|-------------------|-----------------|
| `release` | Changelogs, release notes, version announcements | `CHANGELOG*`, `docs/releases/*`, `*release-note*` |
| `user` | User guides, tutorials, quickstarts, how-tos | `README*`, `docs/getting-started*`, `docs/quickstart*`, `docs/guide*` |
| `api` | API references, SDK docs, integration guides | `docs/api/*`, `*-reference.md`, `*-api.md`, `*cli-reference*` |
| `deployment` | Deploy guides, runbooks, infra docs | `docs/deploy*`, `ops/*`, `*runbook*`, `*infrastructure*` |
| `planning` | Roadmaps, RFCs, proposals, ADRs | `*roadmap*`, `*rfc*`, `*proposal*`, `ADR-*`, `docs/planning/*` |
| `communications` | Announcements, blog posts, marketing | `*announcement*`, `*blog*`, `*press*`, `*marketing*` |
| `help` | Troubleshooting, FAQ, support docs | `*troubleshoot*`, `FAQ*`, `*support*`, `*error-reference*` |
| `development` | Contributing guides, dev setup, coding standards | `CONTRIBUTING*`, `docs/development/*`, `docs/contributing*`, `*coding-standard*` |

Each doc gets a `primary` category and optional `tags` for secondary categorization.

## Output Files

| File | Purpose |
|------|---------|
| `.aiwg/docs/_manifest.yaml` | Master index: path, category, title, summary, confidence, tags |
| `.aiwg/docs/{category}/` | Stub files referencing originals via `@`-mentions |
| `.aiwg/reports/doc-consolidate-{timestamp}.md` | Run report with stats and low-confidence flags |
| `.aiwg/reports/doc-consolidate-last-run.json` | Incremental state (timestamp, file list, checksums) |

## Execution Flow

### Phase 1: Discovery

1. Parse flags: `--dry-run`, `--scope`, `--incremental`, `--prefix`
2. If `--incremental`: load `.aiwg/reports/doc-consolidate-last-run.json`
3. Walk repository recursively using Glob, collecting doc-like files:

**Include patterns**:
```
**/*.md
**/*.txt (only in docs/, doc/, documentation/ directories)
**/*.rst
**/*.adoc
**/README*
**/CHANGELOG*
**/CONTRIBUTING*
**/LICENSE*
```

**Exclude patterns**:
```
node_modules/**
.git/**
vendor/**
dist/**
build/**
.aiwg/docs/**       (output directory — avoid self-reference)
**/*.min.*
**/package-lock.json
```

4. For each file, extract:
   - `path` — relative to project root
   - `title` — first H1 heading, or filename if no heading
   - `summary` — first non-empty paragraph (max 200 chars)
   - `size` — file size in bytes
   - `lastModified` — from git log or file mtime

5. If `--incremental`: filter to files with mtime newer than last run, or use `git diff --name-only --since={lastRun}` for precision

6. Report discovery results:
```
Discovery complete: {N} doc-like files found
  Scope: {scope or "full repo"}
  New since last run: {M} (if incremental)
```

### Phase 2: Classification

Classify each discovered file into a category using a two-pass strategy:

**Pass 1: Path heuristics (fast, deterministic)**

Apply pattern matching on the file path. Rules evaluated in order, first match wins:

```yaml
release:
  - path matches: CHANGELOG*, */CHANGELOG*
  - path matches: docs/releases/*, */releases/*
  - path matches: *release-note*, *release_note*
  - filename matches: RELEASES*, HISTORY*

user:
  - path matches: README*, */README*
  - path matches: docs/getting-started*, docs/quickstart*
  - path matches: docs/guide*, docs/tutorial*
  - path matches: docs/usage*, docs/install*

api:
  - path matches: docs/api/*, */api-docs/*
  - path matches: *-reference.md, *-api.md
  - path matches: *cli-reference*, *sdk-*
  - path matches: docs/integrations/*

deployment:
  - path matches: docs/deploy*, */deploy/*
  - path matches: ops/*, */ops/*
  - path matches: *runbook*, *infrastructure*
  - path matches: *docker*, *kubernetes*, *k8s*
  - path matches: docs/install/non-interactive*

planning:
  - path matches: *roadmap*, docs/roadmap*
  - path matches: *rfc*, docs/rfc/*
  - path matches: *proposal*, docs/proposals/*
  - path matches: ADR-*, */ADR-*, *adr-*
  - path matches: docs/planning/*

communications:
  - path matches: *announcement*, */announcements/*
  - path matches: docs/releases/*-announcement*
  - path matches: *blog*, *press*, *marketing*
  - path matches: *newsletter*

help:
  - path matches: *troubleshoot*, */troubleshooting/*
  - path matches: FAQ*, */FAQ*
  - path matches: *support*, docs/support/*
  - path matches: *error-reference*, *known-issues*

development:
  - path matches: CONTRIBUTING*, */CONTRIBUTING*
  - path matches: docs/development/*, docs/contributing/*
  - path matches: *coding-standard*, *style-guide*
  - path matches: docs/architecture/*, *dev-guide*
```

Confidence: `high` for path match.

**Pass 2: Content analysis (for unmatched files)**

For files that didn't match any path heuristic, read the first 500 characters and classify by keyword presence:

| Keywords | Category |
|----------|----------|
| version, release, changelog, breaking change, migration | `release` |
| getting started, tutorial, how to, step by step, quickstart | `user` |
| endpoint, API, request, response, parameter, authentication | `api` |
| deploy, server, infrastructure, docker, kubernetes, production | `deployment` |
| roadmap, milestone, planned, RFC, proposal, decision | `planning` |
| announcement, launch, update, community | `communications` |
| troubleshoot, FAQ, error, fix, solution, workaround | `help` |
| contributing, development, build, test, lint, setup | `development` |

Confidence: `medium` for single-keyword match, `low` for no clear match (defaults to `user`).

**Output**: Each file gets `{ path, category, confidence, title, summary, tags }`

Report classification results:
```
Classification complete:
  release: {N}    user: {N}    api: {N}
  deployment: {N} planning: {N} communications: {N}
  help: {N}       development: {N}
  Low confidence: {N} (review recommended)
```

### Phase 3: Manifest Generation

If `--dry-run`: skip writing, proceed to report only.

Write `.aiwg/docs/_manifest.yaml`:

```yaml
version: 1
generated: "2026-04-06T04:00:00Z"
project: /path/to/repo
total: 47
categories:
  release:
    - path: CHANGELOG.md
      title: Changelog
      summary: "All notable changes to this project..."
      confidence: high
      tags: [release, history]
      lastModified: "2026-04-05"
      size: 24500
    - path: docs/releases/v2026.4.0-announcement.md
      title: "v2026.4.0 Release"
      summary: "AIWG v2026.4.0 brings the web dashboard..."
      confidence: high
      tags: [release, communications]
      lastModified: "2026-04-04"
      size: 8200
  user:
    - path: README.md
      title: AIWG
      summary: "Framework for improving AI-generated content..."
      confidence: high
      tags: [user, overview]
      lastModified: "2026-04-05"
      size: 12000
  # ... remaining categories
stats:
  total: 47
  by_category:
    release: 5
    user: 12
    api: 8
    deployment: 3
    planning: 4
    communications: 5
    help: 3
    development: 7
  by_confidence:
    high: 38
    medium: 6
    low: 3
```

### Phase 4: Stub Generation + Report

If `--dry-run`: skip stub creation, write report only.

**Stub generation**:

For each category with entries, ensure `.aiwg/docs/{category}/` exists. For each doc in the category, write a stub file:

```markdown
<!-- Auto-generated by doc-consolidate. Do not edit — edit the source file instead. -->
# {title}

> {summary}

**Source**: @{path}
**Category**: {category}
**Confidence**: {confidence}
**Last modified**: {lastModified}
**Tags**: {tags joined by comma}
```

Stub filename: sanitized version of the source path (e.g., `docs/cli-reference.md` becomes `docs--cli-reference.md`).

**Run report**: Write `.aiwg/reports/doc-consolidate-{timestamp}.md`:

```markdown
# Doc Consolidate Report — {timestamp}

## Summary
- **Total docs discovered**: {N}
- **Categories**: {breakdown}
- **Low confidence**: {N} (listed below for review)
- **Mode**: {dry-run | live}
- **Scope**: {scope or full repo}

## By Category

### release ({N})
| File | Title | Confidence |
|------|-------|------------|
| CHANGELOG.md | Changelog | high |
| ... | ... | ... |

### user ({N})
...

## Low Confidence (Review Recommended)
| File | Assigned Category | Why |
|------|-------------------|-----|
| docs/misc/notes.md | user | No heuristic match, keyword: "how to" |

## Coverage Gaps
- No docs found in: {categories with 0 entries}
```

**Incremental state**: Write `.aiwg/reports/doc-consolidate-last-run.json`:

```json
{
  "timestamp": "2026-04-06T04:00:00Z",
  "totalFiles": 47,
  "byCategory": { "release": 5, "user": 12, ... },
  "files": {
    "CHANGELOG.md": { "checksum": "sha256:abc...", "category": "release" },
    "README.md": { "checksum": "sha256:def...", "category": "user" }
  }
}
```

## Integration Points

| System | How |
|--------|-----|
| **doc-sync** | After consolidation, `doc-sync` can read `_manifest.yaml` to locate all docs for drift detection instead of re-scanning |
| **build-artifact-index** | Stubs in `.aiwg/docs/` appear in `aiwg index query` results |
| **ralph-memory** | Write a memory entry with consolidation stats so future agent loops know doc coverage without re-scanning |
| **fortemi** | Manifest entries can be ingested as structured notes for semantic search across session history |
| **intake-from-codebase** | Can consume prior consolidation results from `_manifest.yaml` instead of re-analyzing docs |

## Examples

### Full consolidation
```bash
/doc-consolidate
```

### Preview without writing
```bash
/doc-consolidate --dry-run
```

### Scope to docs directory
```bash
/doc-consolidate --scope docs/
```

### Incremental update
```bash
/doc-consolidate --incremental
```

### Target a different project
```bash
/doc-consolidate --prefix /path/to/other-project
```

### Guided consolidation
```
User: "consolidate all the docs, focus on release and deployment docs"
→ Orchestrator runs full consolidation, highlights release and deployment categories in report
```

## Safety and Guardrails

1. **Never modify source docs** — only write to `.aiwg/docs/` and `.aiwg/reports/`
2. **Stubs are disposable** — safe to delete `.aiwg/docs/` and re-run
3. **Low-confidence files flagged** — never silently misclassify; report for human review
4. **Dry-run first** — recommend `--dry-run` before first live run on a new repo
5. **Incremental is safe** — merges with existing manifest, doesn't drop previous entries
6. **No git operations** — does not commit, push, or modify git state

## Completion Criteria

```yaml
completion:
  required:
    - manifest_written: true          # .aiwg/docs/_manifest.yaml exists and is valid YAML
    - stubs_generated: true           # .aiwg/docs/{category}/ directories populated
    - report_written: true            # .aiwg/reports/doc-consolidate-{ts}.md
    - incremental_state_saved: true   # .aiwg/reports/doc-consolidate-last-run.json
  optional:
    - low_confidence_zero: false      # Not required — low confidence files are flagged, not blocked
    - all_categories_populated: false # Some repos won't have all 8 categories
```
