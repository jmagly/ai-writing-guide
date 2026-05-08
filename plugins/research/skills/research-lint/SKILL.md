---
namespace: aiwg
platforms: [all]
name: research-lint
description: Run the research corpus lint ruleset to detect structural and referential integrity issues — orphan notes, missing frontmatter, broken references, missing GRADE assessments.
commandHint:
  argumentHint: "[target] [--fix] [--format full|summary|json] [--ci] [--fail-on error|warn|info]"
  allowedTools: Read, Write, Bash, Glob, Grep
  model: sonnet
  category: research-validation
---

# Research Lint

Run the research corpus lint ruleset against `.aiwg/research/` to detect structural and referential integrity issues.

## Triggers

- "lint the research corpus"
- "check research integrity"
- "validate research notes"
- "sweep the corpus for issues"
- "research lint"
- `/research-lint`

## Parameters

### `[target]` (optional)
Path to lint. Defaults to `.aiwg/research/`.

### `--fix` (optional)
Attempt auto-fixes for fixable issues (add missing frontmatter defaults, correct formatting).

### `--format` (optional)
Output format: `full` (default), `summary`, or `json`.

### `--ci` (optional)
CI mode — exit code reflects pass/fail.

### `--fail-on` (optional)
Severity threshold for failure: `error` (default), `warn`, or `info`.

## Execution Flow

### Phase 1: Run Lint

Execute the lint runner against the research corpus:

```bash
aiwg lint .aiwg/research/ --ruleset research --format full
```

This checks all 11 rules in the research ruleset:

| Rule | Severity | What it checks |
|------|----------|---------------|
| `ref-frontmatter` | error | Required frontmatter fields present |
| `ref-id-unique` | error | No duplicate REF-XXX identifiers |
| `ref-id-format` | warn | REF identifiers follow `REF-NNN` naming |
| `citation-resolves` | error | REF-XXX references point to existing notes |
| `grade-present` | warn | GRADE quality assessment in frontmatter |
| `provenance-present` | warn | Provenance metadata present |
| `cross-ref-bidirectional` | info | Related refs linked both ways |
| `orphan-detection` | info | Notes with no inbound references |
| `frontmatter-date-format` | warn | Dates follow ISO 8601 |
| `source-file-exists` | error | Referenced source files exist |

### Phase 2: Report Results

Display the results grouped by file with severity indicators:
- Errors: must be fixed for corpus integrity
- Warnings: should be addressed for corpus quality
- Info: suggestions for improvement

### Phase 3: Auto-Fix (if --fix)

When `--fix` is specified, attempt automatic corrections:

1. **Missing frontmatter fields** — Add fields with sensible defaults:
   - `status: pending`
   - `documented_date: <today>`
   - `tags: []`
2. **Date format** — Convert dates to ISO 8601
3. **Missing GRADE** — Add `grade_rating: null` placeholder

Write corrections in place and re-run lint to verify fixes.

## Integration Points

| Component | Relationship |
|-----------|-------------|
| `aiwg lint` | Underlying CLI command this skill wraps |
| `corpus-health` | Lint results feed into health scoring |
| `induct-research` | Post-induction hook can trigger lint on new notes |
| `ralph` loops | Lint pass as completion gate |
| CI/CD | `aiwg lint --ci --ruleset research --fail-on error` |

## Examples

```bash
# Full corpus lint
/research-lint

# Quick summary
/research-lint --format summary

# CI mode (exit code)
/research-lint --ci --fail-on warn

# Lint specific directory
/research-lint .aiwg/research/findings/

# Auto-fix what's fixable
/research-lint --fix

# JSON output for programmatic use
/research-lint --format json
```

## References

- @$AIWG_ROOT/agentic/code/frameworks/research-complete/lint/ruleset.yaml
- @$AIWG_ROOT/src/lint/cli.ts
- @$AIWG_ROOT/src/lint/runner.ts
