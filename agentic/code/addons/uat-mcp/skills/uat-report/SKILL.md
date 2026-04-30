---
namespace: aiwg
name: uat-report
platforms: [all]
description: Generate UAT completion report with tool coverage matrix, pass/fail metrics, and regression detection
commandHint:
  argumentHint: <results_path> [--format markdown|json|table] [--compare <previous_results>] [--output <path>]
  allowedTools: Read, Write, Glob, Grep, Bash
  model: sonnet
  category: uat-mcp
---

# UAT Report

Generate a structured UAT completion report from execution results. Includes tool coverage matrix, per-phase metrics, failure details, and optional regression detection against previous runs.

## Usage

```bash
# Generate report from results
/uat-report .aiwg/testing/uat/results/results-gitea-20260227.yaml

# Compare against previous run (regression detection)
/uat-report .aiwg/testing/uat/results/results-gitea-20260227.yaml \
  --compare .aiwg/testing/uat/results/results-gitea-20260220.yaml

# JSON output for CI integration
/uat-report .aiwg/testing/uat/results/results-gitea-20260227.yaml --format json

# Custom output path
/uat-report results.yaml --output .aiwg/reports/uat/RELEASE-UAT-REPORT.md

# Report from latest results in directory
/uat-report .aiwg/testing/uat/results/
```

## Parameters

### results_path (required)
Path to a results file (YAML) or a directory containing results files. If a directory is given, uses the most recent results file.

### --format (default: markdown)
Output format:

| Format | Use Case |
|--------|----------|
| `markdown` | Human-readable report, suitable for issue comments or docs |
| `json` | Machine-readable, for CI/CD pipelines |
| `table` | Compact terminal-friendly summary |

### --compare (optional)
Path to a previous results file. Enables regression detection: highlights tests that passed before but fail now, and tests that were fixed.

### --output (optional)
Output path. Default: `.aiwg/reports/uat/UAT-REPORT-{timestamp}.md`

## Report Sections

### Executive Summary

```markdown
# UAT Report: {server_name}

**Date**: {execution_date}
**Plan**: {plan_file}
**Duration**: {total_duration}
**Result**: {PASS | FAIL | PARTIAL}

| Metric | Value |
|--------|-------|
| Total tests | 165 |
| Passed | 159 (96.4%) |
| Failed | 4 (2.4%) |
| Skipped | 1 (0.6%) |
| Errors | 1 (0.6%) |
| Tool coverage | 76/78 (97.4%) |
| Issues filed | 4 |
```

### Tool Coverage Matrix

```markdown
## Tool Coverage

| Tool | Phase | Happy Path | Edge Case | Negative | Status |
|------|-------|------------|-----------|----------|--------|
| create_issue | P03 | PASS | PASS | PASS | Full |
| get_issue_by_index | P03 | PASS | — | — | Partial |
| edit_issue | P03 | PASS | PASS | PASS | Full |
| create_issue_comment | P03 | PASS | — | PASS | Partial |
| ... | ... | ... | ... | ... | ... |

Coverage: 76/78 tools (97.4%)
Untested: cancel_repo_action_run, stop_stopwatch
```

### Per-Phase Results

```markdown
## Phase Results

| Phase | Tests | Pass | Fail | Skip | Duration |
|-------|-------|------|------|------|----------|
| P00: Preflight | 3 | 3 | 0 | 0 | 5s |
| P01: Seed Data | 5 | 5 | 0 | 0 | 12s |
| P02: User & Org | 8 | 8 | 0 | 0 | 23s |
| P03: Issues | 12 | 12 | 0 | 0 | 45s |
| P04: Repositories | 10 | 8 | 2 | 0 | 38s |
| ... | ... | ... | ... | ... | ... |
| P11: Cleanup | 3 | 3 | 0 | 0 | 8s |
```

### Failure Details

```markdown
## Failures

### P04-007: Update Repository Description
- **Tool**: mcp__gitea__update_repo
- **Expected**: Returns updated repository with new description
- **Actual**: 404 Not Found
- **Issue**: #415
- **Severity**: High

### P06-003: Wiki Page Creation
- **Tool**: mcp__gitea__create_wiki_page
- **Expected**: Returns created wiki page
- **Actual**: Timeout after 30 seconds
- **Issue**: #416
- **Severity**: Medium
```

### Regression Analysis (if --compare)

```markdown
## Regression Analysis

Compared against: results-gitea-20260220.yaml

### Regressions (previously passed, now failing)
| Test | Tool | Previous | Current |
|------|------|----------|---------|
| P04-007 | update_repo | PASS | FAIL |

### Fixed (previously failing, now passing)
| Test | Tool | Previous | Current |
|------|------|----------|---------|
| P05-002 | create_label | FAIL | PASS |

### Summary
- Regressions: 1
- Fixed: 1
- Net change: 0
```

### Issues Filed

```markdown
## Issues Filed

| Issue | Test | Tool | Severity |
|-------|------|------|----------|
| #415 | P04-007 | update_repo | High |
| #416 | P06-003 | create_wiki_page | Medium |
| #417 | P08-002 | create_release | Medium |
| #418 | P09-011 | search_repos | Low |
```

## Error Handling

### No Results Found

```
Error: No UAT results found at {path}

Run a UAT execution first:
  /uat-execute .aiwg/testing/uat/plan.md
```

### Malformed Results

```
Warning: Results file has unexpected format.
Attempting to parse partial results...

Recovered: 120/165 test results parsed.
Report generated with available data.
```

## References

- Schema: @$AIWG_ROOT/agentic/code/addons/uat-mcp/schemas/uat-result.yaml
- Schema: @$AIWG_ROOT/agentic/code/addons/uat-mcp/schemas/uat-coverage.yaml
- Template: @$AIWG_ROOT/agentic/code/addons/uat-mcp/templates/uat-report.md
