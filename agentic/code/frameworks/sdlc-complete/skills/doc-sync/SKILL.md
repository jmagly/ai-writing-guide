---
namespace: aiwg
name: doc-sync
platforms: [all]
description: Synchronize documentation and code to eliminate drift with parallel audit, auto-fix, and Al refinement
commandHint:
  argumentHint: <direction> [--interactive --guidance "text" --scope "path" --dry-run --parallel N --incremental --verbose --no-commit --max-iterations N]
  allowedTools: Task, Read, Write, Bash, Glob, Grep, Edit
  model: opus
  category: documentation
---

# Documentation-Code Sync (doc-sync)

You are a Documentation Synchronization Orchestrator that detects and resolves drift between code and documentation through parallel audit, automated fixes, and iterative refinement.

## Your Task

When invoked with `/doc-sync <direction> [options]`:

1. **Parse direction**: `code-to-docs` (code is truth), `docs-to-code` (docs are truth), or `full` (bidirectional reconciliation)
2. **Audit** code and documentation in parallel for inconsistencies
3. **Report** drift findings with severity and fix classification
4. **Fix** auto-fixable issues and iterate on complex ones
5. **Validate** all changes pass cross-reference checks

## Switches

| Switch | Default | Purpose |
|--------|---------|---------|
| `<direction>` | required | `code-to-docs`, `docs-to-code`, `full` |
| `--interactive` | false | Prompt for each sync decision |
| `--guidance "text"` | none | Human guidance for ambiguous cases |
| `--scope "path"` | `.` | Limit to specific directory |
| `--dry-run` | false | Audit only, no modifications |
| `--parallel N` | 4 | Max concurrent audit agents |
| `--incremental` | false | Git-diff since last sync instead of full scan |
| `--verbose` | false | Detailed per-file findings |
| `--no-commit` | false | Skip auto-commit |
| `--max-iterations N` | 3 | agent loop refinement iterations |

## Execution Phases

### Phase 1 — Init

1. Parse direction argument
2. Validate `--scope` path exists
3. Read `.aiwg/.last-doc-sync` for incremental mode (skip if not found)
4. Inventory files in scope:
   - Count documentation files (`docs/`, `*.md` in root, CLAUDE.md)
   - Count source files (`src/`, `agentic/`, `tools/`)
5. If >50 files, activate RLM mode for context management

### Phase 2 — Parallel Audit (Wave 1)

Dispatch 8 domain-specific auditor agents via `parallel-dispatch`:

| Auditor | Docs Scope | Code Scope |
|---------|-----------|------------|
| cli-ref-auditor | `docs/cli-reference.md`, CLAUDE.md | `definitions.ts`, `.claude/commands/` |
| extension-type-auditor | `docs/extensions/` | `src/extensions/types.ts`, `registry.ts` |
| provider-auditor | `docs/integrations/`, CLAUDE.md provider table | `providers/*.mjs`, `platform-paths.ts` |
| skill-auditor | `docs/development/skill-inventory.md` | `.claude/skills/`, framework skills |
| agent-auditor | Agent catalog docs | `agentic/*/agents/` |
| config-auditor | Config guides | `src/`, `agentic/*/config/` |
| readme-auditor | `README.md` | `package.json`, `src/` |
| changelog-auditor | `CHANGELOG.md`, `docs/releases/` | git tags, `package.json` |

Each auditor:
- Reads its docs scope and code scope
- Identifies mismatches (missing entries, wrong counts, stale descriptions, dead references)
- Outputs structured findings as `DOC-DRIFT-NNN` items with severity (critical/high/medium/low)

### Phase 3 — Cross-Reference Audit (Wave 2)

Depends on Wave 1 completion. Run in parallel:

1. **mention-validate**: Check all @-mentions resolve to existing files
2. **claims-validator**: Verify numeric claims (command counts, agent counts, file counts) against actual counts
3. **check-traceability**: Verify bidirectional links between artifacts
4. **Internal link checker**: Validate all markdown links point to existing targets

### Phase 4 — Drift Report

Synthesizer agent produces `.aiwg/reports/doc-sync-audit-{date}.md`:

- **Executive summary**: Total drift items, severity distribution, estimated fix effort
- **Per-domain findings**: Grouped by auditor, each with DOC-DRIFT-NNN identifier
- **Cross-reference issues**: Broken links, stale mentions, wrong counts
- **Sync plan**: Categorized as auto-fixable / template-fixable / human-required

### Phase 5 — Sync Planning

Categorize each drift item:

| Category | Criteria | Action |
|----------|----------|--------|
| Auto-fixable | Numeric claims, table entries, argument hints | Direct edit |
| Template-fixable | Missing sections, outdated descriptions | Generate via template + Al |
| Human-required | Architectural changes, ambiguous intent | Flag for review |

If `--dry-run`: Output report and exit.

### Phase 6 — Auto-fix (code-to-docs direction)

Apply auto-fixes:
- Update numeric claims (command count, agent count) from source-of-truth
- Add missing table entries (new commands, new agents)
- Remove entries for deleted artifacts
- Update argument hints from `definitions.ts` metadata
- Fix broken internal links

### Phase 7 — Al Refinement

For template-fixable items:
1. Generate initial fix from template
2. Run validation (Wave 2 checks) on modified files
3. If issues remain, iterate (up to `--max-iterations`)
4. Select best output per best-output-selection rule

### Phase 8 — Validation

Re-run Wave 2 checks on all modified files:
- All @-mentions resolve
- Numeric claims match actuals
- Internal links valid
- No new drift introduced

### Phase 9 — Record

1. Write `.aiwg/.last-doc-sync` with timestamp and scope
2. If not `--no-commit`: Stage changes and commit with message `docs: sync documentation to match code`
3. Output final summary with before/after drift counts

## Direction Behavior

### code-to-docs (Default)
Code is source of truth. Documentation is updated to match code reality.

### docs-to-code
Documentation is source of truth. Generates TODOs and code fix suggestions where code doesn't match documented behavior.

### full
Bidirectional reconciliation:
1. Run both directions
2. For conflicts (code says X, docs say Y, both changed), flag for human resolution
3. In `--interactive` mode, prompt for each conflict

## Integration Points

Uses existing skills and commands:
- `claims-validator` — Verify numeric claims
- `mention-validate` — Check @-mention resolution
- `mention-wire` — Fix broken @-mentions
- `check-traceability` — Verify bidirectional links
- `parallel-dispatch` — Launch audit agents concurrently
- `rlm-mode` — Context management for large file sets
- `ralph` — Iterative refinement loop
- `workspace-health` — Pre-flight workspace checks

## Examples

### Dry-run audit
```
/doc-sync code-to-docs --dry-run
```
Outputs audit report without modifying any files.

### Incremental sync after code changes
```
/doc-sync code-to-docs --incremental --verbose
```
Only audits files changed since last sync.

### Full bidirectional with human guidance
```
/doc-sync full --interactive --guidance "Focus on CLI reference accuracy"
```

### Scoped to specific directory
```
/doc-sync code-to-docs --scope docs/extensions/
```

## Output Locations

- Audit report: `.aiwg/reports/doc-sync-audit-{date}.md`
- Last sync record: `.aiwg/.last-doc-sync`
- Modified documentation: in-place updates

## References

- @$AIWG_ROOT/src/extensions/commands/definitions.ts — Command definitions source of truth
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference documentation
- @CLAUDE.md — Project-level documentation
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/manifest.json — Skills catalog
