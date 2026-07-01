---
namespace: aiwg
name: cleanup-audit
description: Audit codebase for dead code, unused exports, orphaned files, and stale manifests
commandHint:
  argumentHint: "[--scope <path>] [--type <exports|files|deps|manifests>] [--json] [--fix] [--dry-run]"
  allowedTools: Bash, Read, Write, Glob, Grep
  category: utilities
  orchestration: false
platforms: [all]

---

# Cleanup Audit

Audits the codebase for accumulated dead weight: unused TypeScript/JS exports, orphaned source files, npm dependencies that are declared but never imported, and manifest entries that point to files that do not exist. Every finding carries a confidence rating. Only HIGH confidence findings are safe to auto-fix.

## Natural Language Triggers

Users may say:
- "cleanup audit"
- "dead code audit"
- "find dead code"
- "orphan files"
- "unused exports"
- "cleanup analysis"
- "find unused dependencies"
- "stale manifest entries"
- "what can I delete"
- "codebase cleanup"

## Parameters

### --scope `<path>`

Restrict analysis to a subtree. Default is the full repository root.

```bash
aiwg cleanup-audit --scope src/cli/
aiwg cleanup-audit --scope agentic/code/addons/
```

### --type `<exports|files|deps|manifests>`

Run only the specified audit type. Omit to run all four.

| Value | Audits |
|-------|--------|
| `exports` | TypeScript/JS exports with no importers |
| `files` | Source files not referenced by any import or manifest |
| `deps` | npm dependencies declared in package.json but not used in code |
| `manifests` | Manifest entries (skills, agents) whose source file does not exist |

Multiple types can be combined:
```bash
aiwg cleanup-audit --type exports --type deps
```

### --json

Emit findings as newline-delimited JSON to stdout instead of the formatted report. Useful for piping into other tools or CI scripts.

```bash
aiwg cleanup-audit --json | jq 'select(.confidence == "HIGH")'
```

### --fix

Auto-apply removals for all HIGH confidence findings. Has no effect without confirmation when any HIGH finding involves a non-trivial deletion (more than 10 lines or a full file). Combine with `--dry-run` to preview what `--fix` would remove.

### --dry-run

Show what `--fix` would remove without writing any changes. If used without `--fix`, behaves as the default read-only audit.

## Execution Flow

### Phase 1: Determine Analysis Scope

1. Parse `--scope` — default to repo root
2. Parse `--type` — default to all four types
3. Parse `--json`, `--fix`, `--dry-run` flags
4. Build file inventory for the scope:
   - All `.ts`, `.tsx`, `.js`, `.mjs` files (for exports and files audits)
   - `package.json` (for deps audit)
   - All `manifest.json` files under `agentic/` (for manifests audit)
5. Communicate scope before analysis begins

**Communicate**:
```
Cleanup Audit
Scope: {scope}
Types: {types}
Mode: {read-only | fix | dry-run fix}

Building file inventory...
  Source files: {N}
  Manifests: {N}
```

### Phase 2: Analyze Unused Exports

Applies to `--type exports`. Identifies TypeScript and JavaScript named exports that are never imported anywhere in the scope.

**Detection approach**:
1. Glob all source files in scope: `**/*.ts`, `**/*.tsx`, `**/*.js`, `**/*.mjs`
2. Extract all export declarations: `export function`, `export class`, `export const`, `export type`, `export interface`, `export enum`
3. For each exported identifier, grep all source files for imports of that identifier
4. An export is unused if: zero import matches AND it is not referenced in a manifest entry AND it is not a re-export pattern (`export * from`)

**Confidence rules**:

| Signal | Confidence |
|--------|-----------|
| Zero imports found across entire scope | HIGH |
| Zero imports but identifier is a common name (e.g., `index`, `default`) | MEDIUM |
| Zero imports but file is an entry point (`index.ts`, `main.ts`) | LOW |
| Export appears in a barrel file (`index.ts` re-export) | LOW — skip |

**Output per finding**:
```
[UNUSED-EXPORT] HIGH
  File: src/extensions/registry.ts:45
  Export: registerExtension
  Declared: export function registerExtension(ext: Extension): void
  Importers found: 0
  Safe to remove: yes
```

### Phase 3: Detect Orphaned Files

Applies to `--type files`. Identifies source files that are not imported by any other file and not listed in any manifest.

**Detection approach**:
1. Build full file list for scope
2. For each file, check whether its path appears in:
   - Any `import` or `require` statement in any other source file
   - Any `manifest.json` `scripts` or `path` field
   - Any `package.json` `main`, `exports`, or `bin` field
3. A file is orphaned if none of the above references exist

**Confidence rules**:

| Signal | Confidence |
|--------|-----------|
| No references found anywhere | HIGH |
| No references but filename matches common entry point pattern | MEDIUM |
| No references but file is in root of package (may be undiscovered entry) | LOW |
| Test file with no corresponding source file | MEDIUM (orphaned test) |

**Output per finding**:
```
[ORPHANED-FILE] HIGH
  File: src/legacy/old-config-reader.ts
  References found: 0 (imports: 0, manifests: 0, package.json: 0)
  Last modified: 2025-11-02
  Safe to remove: yes
```

### Phase 4: Audit Dependencies

Applies to `--type deps`. Finds npm packages declared in `package.json` that have no `import` or `require` usage anywhere in the codebase.

**Detection approach**:
1. Read `dependencies` and `devDependencies` from `package.json`
2. For each package name, grep source files for:
   - `import ... from '{package}'`
   - `require('{package}')`
   - `import('{package}')`
   - Scoped sub-path imports: `import ... from '{package}/...'`
3. Also check config files for tool references: `.eslintrc`, `jest.config.*`, `tsconfig.json`

**Confidence rules**:

| Signal | Confidence |
|--------|-----------|
| No import/require in source, no config reference | HIGH |
| No import in source but referenced in a config file | LOW — tool dependency, do not remove |
| No import but package name matches a `peerDependency` | LOW — required by consumers |
| No import but package is a type declaration (`@types/...`) | MEDIUM — check if corresponding package is used |

**Output per finding**:
```
[UNUSED-DEP] HIGH
  Package: lodash
  Version: ^4.17.21
  Type: dependency
  Usage in source: 0 files
  Config references: 0
  Safe to remove: yes (run: npm uninstall lodash)
```

### Phase 5: Check Manifest Entries

Applies to `--type manifests`. Finds entries in `manifest.json` files (skills, agents, commands) whose referenced source files or directories do not exist on disk.

**Detection approach**:
1. Glob all `manifest.json` files: `**/manifest.json`
2. For each manifest, inspect entries that reference file paths:
   - `skills[].scripts[]`
   - `agents[].path`
   - `commands[].handler`
   - Any field ending in `path`, `file`, or `script`
3. Resolve each path relative to the manifest file location
4. Check whether the resolved path exists on disk
5. Also flag entries where the declared `name` has no corresponding `{name}/SKILL.md` or `{name}/AGENT.md` directory

**Confidence rules**:

| Signal | Confidence |
|--------|-----------|
| Declared path does not exist | HIGH |
| Declared path exists but is empty directory | MEDIUM |
| Name entry has no corresponding directory | HIGH |
| Script listed but containing skill directory has no SKILL.md | HIGH |

**Output per finding**:
```
[STALE-MANIFEST] HIGH
  Manifest: agentic/code/addons/aiwg-utils/skills/manifest.json
  Entry: skills[12].name = "old-voice-converter"
  Expected path: skills/old-voice-converter/
  Path exists: no
  Safe to remove: yes (remove entry from manifest)
```

### Phase 6: Compile Confidence-Rated Report

Aggregate all findings from Phases 2–5 into a unified report. Sort by confidence (HIGH first), then by type, then by file path.

**Report format**:
```markdown
# Cleanup Audit Report
Generated: {timestamp}
Scope: {scope}
Types: {types}

## Summary

| Type | HIGH | MEDIUM | LOW | Total |
|------|------|--------|-----|-------|
| Unused exports | {N} | {N} | {N} | {N} |
| Orphaned files | {N} | {N} | {N} | {N} |
| Unused deps | {N} | {N} | {N} | {N} |
| Stale manifests | {N} | {N} | {N} | {N} |
| **Total** | **{N}** | **{N}** | **{N}** | **{N}** |

Auto-fixable (HIGH confidence): {N} findings

## HIGH Confidence Findings

### Unused Exports
...

### Orphaned Files
...

### Unused Dependencies
...

### Stale Manifest Entries
...

## MEDIUM Confidence Findings (manual review recommended)
...

## LOW Confidence Findings (informational)
...

## Recommended Actions

1. Run `aiwg cleanup-audit --fix` to remove {N} HIGH confidence findings automatically
2. Manually review {N} MEDIUM confidence findings
3. Ignore or suppress {N} LOW confidence findings if intentional
```

Save to: `.aiwg/reports/cleanup-audit-{timestamp}.md`

If `--json` flag is set, also emit each finding as a JSON object to stdout:
```json
{"type": "UNUSED-EXPORT", "confidence": "HIGH", "file": "src/extensions/registry.ts", "line": 45, "detail": "registerExtension", "safe_to_remove": true}
```

If `--fix` is set (and not `--dry-run`), apply removals for all HIGH findings after report is generated.

## Confidence Rating Reference

| Rating | Meaning | Auto-fix eligible |
|--------|---------|-------------------|
| HIGH | Strong evidence of dead code with no false-positive signals | Yes |
| MEDIUM | Likely dead code but has signals that warrant human review | No |
| LOW | Informational — pattern matches but may be intentional | No |

**Never auto-fix MEDIUM or LOW findings.** These exist to inform human decisions, not drive automated removal.

## Error Handling

### Scope Path Not Found

```
Error: --scope path does not exist: {path}
Verify the path is relative to the project root or use an absolute path.
```

### Parse Failure on Manifest

```
Warning: Could not parse manifest at {path}
  Error: {JSON parse error}
  Action: Skipping this manifest — listed in report as PARSE_ERROR
```

### Zero Files in Scope

```
Warning: No source files found in scope: {scope}
  Checked patterns: **/*.ts, **/*.tsx, **/*.js, **/*.mjs
  Confirm the scope path contains source files.
```

## Examples

### Example 1: Full audit before a release

```bash
aiwg cleanup-audit
```

Runs all four audit types on the full repository. Generates report at `.aiwg/reports/cleanup-audit-{timestamp}.md`. Prints summary to stdout. No files modified.

### Example 2: Auto-fix high-confidence findings

```bash
aiwg cleanup-audit --fix --dry-run
```

Shows exactly what `--fix` would remove — useful for reviewing before committing. Then:

```bash
aiwg cleanup-audit --fix
```

Removes all HIGH confidence findings: unused exports, orphaned files, stale manifest entries. For unused deps, prints the `npm uninstall` commands to run (does not execute them automatically).

### Example 3: CI integration with JSON output

```bash
aiwg cleanup-audit --type manifests --type files --json \
  | jq 'select(.confidence == "HIGH") | .file' \
  | sort -u
```

Extracts only HIGH confidence file-level findings as a sorted list. Suitable for a CI step that blocks merge if orphaned files are introduced.

### Example 4: Scoped audit during active development

```bash
aiwg cleanup-audit --scope src/cli/ --type exports
```

Targeted export audit for the CLI subtree only. Fast enough to run after each feature branch merge.

## References

- @$AIWG_ROOT/src/cli/handlers/utilities.ts — Cleanup audit command handler
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/manifest.json — Skills manifest (audited by manifests type)
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for this command
