---
namespace: aiwg
name: doc-sync
description: Synchronize documentation and code to eliminate drift with parallel audit and auto-fix
commandHint:
  argumentHint: "<direction> [--dry-run] [--scope <path>] [--incremental]"
  allowedTools: Task, Read, Write, Bash, Glob, Grep, Edit
  category: utilities
  orchestration: true
platforms: [all]

---

# Doc Sync

**You are the Doc Sync Orchestrator** - detecting and eliminating documentation drift between code and docs using parallel domain auditors, cross-reference validation, and targeted auto-fixes.

## Core Philosophy

Code and documentation must tell the same story. Drift accumulates silently during construction; this command makes it visible and reversible before it compounds.

## Natural Language Triggers

Users may say:
- "doc sync"
- "sync docs"
- "documentation sync"
- "fix doc drift"
- "reconcile docs"
- "sync documentation"
- "docs are out of date"
- "update docs to match code"
- "update code to match docs"
- "check for documentation drift"
- "audit docs"

## Parameters

### direction (required)

Controls the source of truth:

| Value | Meaning | When to use |
|-------|---------|-------------|
| `code-to-docs` | Update docs to match code | Most common — code changed, docs lag |
| `docs-to-code` | Update code to match docs | Docs-first workflows, spec compliance |
| `full` | Bidirectional reconciliation | Major releases, post-construction cleanup |

### --dry-run

Preview all detected drift and proposed changes without writing any files. Produces a drift report identical to the live run but with no mutations.

### --scope `<path>`

Limit the audit to a subtree. Useful for large monorepos or targeted cleanup.

```bash
aiwg doc-sync code-to-docs --scope src/cli/
aiwg doc-sync code-to-docs --scope docs/extensions/
```

### --incremental

Only audit files changed since the last successful doc-sync run. Reads the timestamp from `.aiwg/reports/doc-sync-last-run.json`. Falls back to full audit if no prior run exists.

## Execution Flow

### Phase 1: Parse Direction and Options

1. Parse `direction` argument — fail fast with usage hint if missing
2. Detect `--dry-run`, `--scope`, `--incremental` flags
3. If `--incremental`: read `.aiwg/reports/doc-sync-last-run.json` for last-run timestamp and changed-file set
4. Determine audit scope (full repo or subtree)
5. Communicate plan to user before dispatching agents

**Communicate**:
```
Doc Sync Initialized
Direction: {direction}
Scope: {scope or "full repo"}
Mode: {dry-run | live}
Incremental: {yes (since {date}) | no}

Dispatching parallel domain auditors...
```

### Phase 2: Dispatch Parallel Domain Auditors

Launch independent Task agents simultaneously — one per domain. Each auditor reads the relevant source files and docs, then writes its findings to `.aiwg/working/doc-sync/audit-{domain}.json`.

**Auditor domains**:

| Agent | Responsibility |
|-------|----------------|
| CLI auditor | Commands in `src/extensions/commands/definitions.ts` vs `docs/cli-reference.md` |
| Extension auditor | Types in `src/extensions/types.ts` vs `docs/extensions/` |
| API auditor | Exported functions/classes vs API reference docs |
| Config auditor | Config schema vs configuration docs |
| Schema auditor | JSON/YAML schemas vs schema documentation |

**Dispatch pattern** (all in one message):
```
Task(cli-auditor):    compare CLI command definitions to docs/cli-reference.md
Task(extension-auditor): compare extension types to docs/extensions/
Task(api-auditor):    compare exported API surface to API docs
Task(config-auditor): compare config schema to configuration docs
Task(schema-auditor): compare JSON/YAML schemas to schema docs
```

Each auditor outputs findings in a normalized format:
```json
{
  "domain": "cli",
  "findings": [
    {
      "type": "undocumented-feature",
      "source": "src/extensions/commands/definitions.ts:142",
      "detail": "Command 'sdlc-accelerate --resume' has no docs entry",
      "confidence": "HIGH"
    },
    {
      "type": "stale-reference",
      "source": "docs/cli-reference.md:89",
      "detail": "Documents '--watch' flag removed in v2026.2.0",
      "confidence": "HIGH"
    }
  ]
}
```

**Communicate**:
```
Parallel audit running (5 domain auditors)...
  ⏳ CLI auditor
  ⏳ Extension auditor
  ⏳ API auditor
  ⏳ Config auditor
  ⏳ Schema auditor
```

### Phase 3: Cross-Reference Validation

After all auditors complete, run cross-reference checks that span domain boundaries:

1. **Anchor link validation** — internal `[text](#anchor)` links in docs resolve to actual headings
2. **Code sample validation** — fenced code blocks in docs reference functions/types that exist in source
3. **Version string consistency** — version numbers mentioned in docs match `package.json`
4. **External reference freshness** — flag docs that cite removed CLI flags or deprecated APIs

Write cross-reference findings to `.aiwg/working/doc-sync/cross-refs.json`.

**Communicate**:
```
  ✓ CLI auditor — {N} findings
  ✓ Extension auditor — {N} findings
  ✓ API auditor — {N} findings
  ✓ Config auditor — {N} findings
  ✓ Schema auditor — {N} findings
Running cross-reference validation...
```

### Phase 4: Generate Drift Report

Merge all auditor outputs and cross-reference findings into a unified drift report. Categorize each finding by severity and type.

**Finding types**:

| Type | Description |
|------|-------------|
| `undocumented-feature` | Code has a feature/export with no docs entry |
| `stale-reference` | Docs reference code that no longer exists |
| `parameter-mismatch` | Documented parameters differ from actual signature |
| `example-broken` | Code example in docs uses removed/renamed API |
| `broken-anchor` | Internal link target does not exist |
| `version-mismatch` | Version string in docs differs from package.json |

**Report format**:
```markdown
# Documentation Drift Report
Generated: {timestamp}
Direction: {direction}
Scope: {scope}

## Summary

| Severity | Count | Auto-fixable |
|----------|-------|--------------|
| HIGH     | {N}   | {N}          |
| MEDIUM   | {N}   | {N}          |
| LOW      | {N}   | {N}          |

## HIGH Severity Findings

### CLI Domain
- [UNDOCUMENTED] `sdlc-accelerate --resume` flag — no entry in docs/cli-reference.md
  Auto-fix: add parameter entry from command definition
- [STALE] `docs/cli-reference.md:89` references `--watch` flag (removed v2026.2.0)
  Auto-fix: remove stale entry

### Extension Domain
...

## Files Affected

| File | Findings | Auto-fixable |
|------|----------|--------------|
| docs/cli-reference.md | 4 | 3 |
| docs/extensions/overview.md | 2 | 1 |
```

Save to: `.aiwg/reports/doc-sync-{timestamp}.md`

If `--dry-run`: print report and exit. Do not proceed to Phase 5.

### Phase 5: Apply Auto-Fixes and Al Refinement

Apply fixes for all HIGH confidence findings. MEDIUM and LOW findings are reported but not auto-fixed — they require human review.

**Auto-fix strategy by type**:

| Type | Fix action |
|------|-----------|
| `undocumented-feature` | Generate documentation stub from source code signatures and inline JSDoc |
| `stale-reference` | Remove the stale section/parameter from the doc file |
| `parameter-mismatch` | Update documented parameter table to match actual signature |
| `example-broken` | Update code example to use current API |
| `broken-anchor` | Update link target to nearest matching heading |
| `version-mismatch` | Update version string to match package.json |

For complex documentation stubs (undocumented features), use a Al refinement loop (max 3 iterations) to ensure the generated docs pass a quality check:

```
Agent loop (max 3 iterations):
  Task: "Generate documentation for {feature} at {source}"
  Completion: "Generated doc passes markdownlint and includes: description, parameters, at least one example"
```

Track all changes made during this phase to support the validation step.

**Communicate**:
```
Applying auto-fixes...
  ✓ Removed stale '--watch' flag from docs/cli-reference.md
  ✓ Added 'sdlc-accelerate --resume' parameter entry
  ✓ Updated version string in docs/extensions/overview.md
  ⚠ MEDIUM: Skipped 'API section structure inconsistency' — requires manual review
  ⚠ LOW: Skipped 'Informal tone in CLI description' — requires manual review
```

### Phase 6: Validate Changes

Verify that applied fixes do not introduce regressions:

1. Run `npm exec markdownlint-cli2 "**/*.md"` — all modified docs must pass
2. Run `npx tsc --noEmit` — code-side changes (if `docs-to-code` direction) must compile
3. Re-run cross-reference validation on modified files only — confirm no new broken anchors introduced

If validation fails on any auto-fixed file, revert that specific file and record the failure in the final report.

**Communicate**:
```
Validating changes...
  ✓ Markdown lint: 0 errors across 3 modified files
  ✓ TypeScript: no errors
  ✓ Cross-reference check: no new broken links

Updating last-run record...
```

Write `.aiwg/reports/doc-sync-last-run.json`:
```json
{
  "timestamp": "{ISO-8601}",
  "direction": "{direction}",
  "scope": "{scope}",
  "findings_total": {N},
  "fixes_applied": {N},
  "files_modified": ["{path}", ...]
}
```

## Error Handling

### Missing Direction Argument

```
Error: direction is required.

Usage: aiwg doc-sync <direction> [options]

Directions:
  code-to-docs   Update docs to match code (most common)
  docs-to-code   Update code to match docs
  full           Bidirectional reconciliation

Example: aiwg doc-sync code-to-docs --dry-run
```

### Auditor Failure

If a domain auditor Task fails, log the failure and continue with remaining auditors. Mark the failed domain as `SKIPPED` in the drift report with the error detail. Do not abort the entire sync.

### Validation Failure After Fix

```
Warning: Auto-fix for {finding} in {file} failed validation.
  Error: {lint/compile error}
  Action: Reverted {file} to pre-fix state.
  Manual fix required — see report for details.
```

### No Findings

```
Doc Sync Complete: No drift detected.
Direction: {direction}
Scope: {scope}
Auditors run: 5
Files checked: {N}
```

## User Communication

**On completion**:
```
═══════════════════════════════════════════
Doc Sync: COMPLETE
═══════════════════════════════════════════

Direction: {direction}
Findings: {total} ({HIGH} high, {MEDIUM} medium, {LOW} low)
Fixes applied: {N} ({files} files modified)
Skipped (manual review): {N}

Report: .aiwg/reports/doc-sync-{timestamp}.md

Items requiring manual review:
  - {finding summary}
  - {finding summary}
═══════════════════════════════════════════
```

## Examples

### Example 1: Standard docs update after construction sprint

**User**: "sync docs"

```bash
aiwg doc-sync code-to-docs
```

5 domain auditors run in parallel. 8 findings detected. 6 HIGH-confidence fixes applied automatically. 2 MEDIUM findings flagged for manual review. Report saved to `.aiwg/reports/doc-sync-{timestamp}.md`.

### Example 2: Preview before release

**User**: "fix doc drift" (day before release)

```bash
aiwg doc-sync code-to-docs --dry-run
```

Produces a full drift report with zero file mutations. User reviews the report, decides which MEDIUM findings to handle manually, then runs without `--dry-run` to apply HIGH-confidence fixes.

### Example 3: Incremental sync during active construction

**User**: "doc sync" (end of sprint, only changed files since last sync)

```bash
aiwg doc-sync code-to-docs --incremental
```

Reads `.aiwg/reports/doc-sync-last-run.json`, determines 12 files changed since last run, audits only those files. Fast execution — typical full audit reduced from minutes to seconds.

## References

- @$AIWG_ROOT/src/cli/handlers/utilities.ts — Doc sync command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference (primary doc target)
- @$AIWG_ROOT/docs/extensions/overview.md — Extension system docs (audited by extension auditor)
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/ralph/SKILL.md — Agent loop pattern used in Phase 5
