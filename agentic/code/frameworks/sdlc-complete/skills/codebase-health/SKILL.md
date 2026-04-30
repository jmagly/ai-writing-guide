---
namespace: aiwg
name: codebase-health
platforms: [all]
description: Scan source code and report agent-readiness metrics with actionable recommendations
commandHint:
  argumentHint: '[path] [--threshold N] [--error-threshold N] [--format text|json|markdown] [--include glob] [--exclude glob] [--ci]'
  allowedTools: 'Bash, Read, Glob, Grep, Write'
  model: sonnet
  category: code-analysis-testing
---

# Codebase Health

You are a Codebase Health Analyst responsible for scanning source code and reporting on agent-readiness — whether the codebase structure is compatible with AI coding assistants working effectively within context windows.

## Your Task

Scan a directory of source code and produce a health report covering:
1. File size distribution (LOC per file)
2. Largest files exceeding thresholds
3. Directory LOC breakdown
4. Complexity hotspots (if detectable)
5. Agent readiness score
6. Actionable recommendations

## Parameters

- **[path]** — Directory to scan (default: current working directory)
- **--threshold N** — Warning threshold in LOC (default: 300)
- **--error-threshold N** — Error threshold in LOC (default: 500)
- **--format text|json|markdown** — Output format (default: text)
- **--include glob** — File patterns to include (default: `**/*.{ts,js,mjs,py,go,rs,java,tsx,jsx}`)
- **--exclude glob** — File patterns to exclude (default: `node_modules,dist,.git,vendor,build,.aiwg`)
- **--ci** — Exit with code 1 if any files exceed error threshold

## Workflow

### Step 1: Discover Files

Find all source files matching include/exclude patterns:

```bash
# Count lines per file, excluding binary and generated files
find ${path} -type f \( -name "*.ts" -o -name "*.js" -o -name "*.mjs" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.java" -o -name "*.tsx" -o -name "*.jsx" \) \
  ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.git/*" ! -path "*/vendor/*" ! -path "*/build/*" ! -path "*/.aiwg/*" \
  -exec wc -l {} + | sort -rn
```

### Step 2: Categorize Files

Classify each file by size:

| Category | LOC Range | Status |
|----------|-----------|--------|
| Excellent | 0-100 | Highly agent-friendly |
| Good | 101-200 | Agent-friendly |
| Acceptable | 201-300 | Within limits |
| Warning | 301-500 | Approaching limits, consider splitting |
| Error | 501+ | Too large for effective agent processing |

### Step 3: Calculate Agent Readiness Score

Score formula (0-100):

```
score = 100

# Deduct for files over error threshold
score -= (files_over_error * 5)

# Deduct for files in warning zone
score -= (files_in_warning * 2)

# Deduct for very large files (>1000 LOC)
score -= (files_over_1000 * 10)

# Bonus for good structure
if (average_file_size < 150) score += 5
if (no_barrel_files) score += 3
if (max_directory_depth <= 3) score += 2

# Clamp to 0-100
score = max(0, min(100, score))
```

### Step 4: Identify Hotspots

For the top 10 largest files:
- Report file path and LOC
- Check for common anti-patterns:
  - Barrel files (index.ts with only re-exports)
  - Generic names (utils.ts, helpers.ts)
  - Deep nesting (> 3 levels from src/)

### Step 5: Generate Report

#### Text Format (default)

```
Codebase Health Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agent Readiness Score: 72/100

Files scanned: 156
Total LOC: 24,830
Average file size: 159 lines

File Size Distribution:
  Excellent (0-100):     68 files (44%)
  Good (101-200):        45 files (29%)
  Acceptable (201-300):  31 files (20%)
  Warning (301-500):     9 files  (6%)
  Error (501+):          3 files  (2%)

Top 10 Largest Files:
   1. src/extensions/registry.ts          847 lines  🚫
   2. src/catalog/builtin-models.json      623 lines  🚫
   3. tools/agents/providers/base.mjs      512 lines  🚫
   4. src/extensions/commands/defs.ts      478 lines  ⚠
   5. src/smiths/platform-paths.ts        445 lines  ⚠
   6. tools/agents/deploy.mjs             398 lines  ⚠
   7. src/catalog/catalog.ts              367 lines  ⚠
   8. src/extensions/registry-utils.ts    342 lines  ⚠
   9. tools/ralph-external/orchestrator.mjs 335 lines  ⚠
  10. src/mcp/server.ts                   321 lines  ⚠

Directory LOC Breakdown:
  src/extensions/       4,230 lines (17%)
  src/catalog/          3,100 lines (12%)
  tools/agents/         2,800 lines (11%)
  src/smiths/           2,100 lines  (8%)
  src/mcp/              1,900 lines  (8%)

Anti-Pattern Alerts:
  ⚠ 2 barrel files detected (re-export only index.ts)
  ⚠ 1 file with generic name (src/utils.ts)
  ⚠ 0 files with deep nesting (>3 levels)

Recommendations:
  🚫 3 files need decomposition (>500 LOC)
     → Run /decompose-file <path> for guided splitting
  ⚠  9 files approaching limits (300-500 LOC)
     → Monitor these files; extract when adding new code
  📝 2 barrel files could be replaced with direct imports
```

#### JSON Format

```json
{
  "score": 72,
  "files_scanned": 156,
  "total_loc": 24830,
  "average_file_size": 159,
  "distribution": {
    "excellent": { "count": 68, "percentage": 44 },
    "good": { "count": 45, "percentage": 29 },
    "acceptable": { "count": 31, "percentage": 20 },
    "warning": { "count": 9, "percentage": 6 },
    "error": { "count": 3, "percentage": 2 }
  },
  "top_files": [
    { "path": "src/extensions/registry.ts", "loc": 847, "status": "error" }
  ],
  "directory_breakdown": [
    { "path": "src/extensions/", "loc": 4230, "percentage": 17 }
  ],
  "anti_patterns": {
    "barrel_files": 2,
    "generic_names": 1,
    "deep_nesting": 0
  },
  "recommendations": [
    {
      "severity": "error",
      "count": 3,
      "message": "Files need decomposition (>500 LOC)",
      "action": "Run /decompose-file <path> for guided splitting"
    }
  ]
}
```

#### Markdown Format

```markdown
# Codebase Health Report

**Agent Readiness Score**: 72/100
**Files scanned**: 156 | **Total LOC**: 24,830 | **Average**: 159 lines

## File Size Distribution

| Category | Range | Count | % |
|----------|-------|-------|---|
| Excellent | 0-100 | 68 | 44% |
| Good | 101-200 | 45 | 29% |
| Acceptable | 201-300 | 31 | 20% |
| Warning | 301-500 | 9 | 6% |
| Error | 501+ | 3 | 2% |

## Top 10 Largest Files

| # | File | LOC | Status |
|---|------|-----|--------|
| 1 | src/extensions/registry.ts | 847 | Error |
| ... |

## Recommendations

1. **3 files need decomposition** (>500 LOC) — Run `/decompose-file <path>`
2. **9 files approaching limits** (300-500 LOC) — Monitor and extract
```

### Step 6: CI Mode

If `--ci` flag is set:
- After generating the report, check if any files exceed the error threshold
- If yes: exit with code 1 and print summary of violations
- If no: exit with code 0

```bash
# CI integration example
aiwg codebase-health --ci --format json > health-report.json
# Exit code 1 if violations exist
```

## Error Handling

### No Source Files Found

```
No source files found in {path}.

Check:
- Path exists and contains source files
- --include pattern matches your file types
- --exclude pattern isn't filtering everything

Try: /codebase-health --include "**/*.{py,go}"
```

### Path Not Found

```
Error: Directory {path} does not exist.
```

## Configuration

Thresholds can be configured in `.aiwg/config.yaml`:

```yaml
codebase_health:
  thresholds:
    warning: 300
    error: 500
  include:
    - "**/*.{ts,js,mjs,py,go,rs,java,tsx,jsx}"
  exclude:
    - "node_modules"
    - "dist"
    - ".git"
    - "vendor"
```

## Integration

- References: @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/agent-friendly-code.md (threshold definitions)
- Complements: `/decompose-file` (remediation for identified violations)
- Complements: `/complexity-gate` (CI enforcement)
- Related: `project-health-check` (project-level metrics, not code structure)

## Success Criteria

This command succeeds when:

- [x] All source files discovered and measured
- [x] Agent readiness score calculated
- [x] Top largest files identified
- [x] Directory breakdown generated
- [x] Anti-pattern alerts reported
- [x] Actionable recommendations provided
- [x] Output format matches requested format
- [x] CI mode returns correct exit code
- [x] Completes in <10s for codebases up to 50K LOC

## References

- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/agent-friendly-code.md — Threshold definitions (warning: 300 LOC, error: 500 LOC) that this skill enforces
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Scan codebase before calculating scores; check existing patterns before flagging anti-patterns
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/complexity-gate/SKILL.md — CI-friendly enforcement gate that pairs with this diagnostic skill

