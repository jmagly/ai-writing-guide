# Test Contribution Implementation

**Status:** ✅ Complete
**Created:** 2025-10-17
**Tool:** `tools/contrib/test-contribution.mjs`
**Command:** `aiwg -contribute-test <feature-name> [--verbose]`

## Overview

Implements quality validation for contributor workflow before PR creation. Ensures contributions meet AIWG quality standards (80/100 minimum).

## Implementation Details

### File Location

`/home/manitcor/dev/ai-writing-guide/tools/contrib/test-contribution.mjs`

### Dependencies

- `tools/contrib/lib/quality-validator.mjs` - Quality gates and scoring
- `tools/contrib/lib/workspace-manager.mjs` - Workspace persistence

### Functionality

#### 1. Argument Parsing

```bash
# Basic usage
aiwg -contribute-test cursor-integration

# Verbose mode
aiwg -contribute-test cursor-integration --verbose
```

Arguments:
- `<feature-name>` (required) - Feature being validated
- `--verbose` or `-v` (optional) - Show detailed lint errors

#### 2. Prerequisites Check

**Workspace Validation:**
- Checks `.aiwg/contrib/{feature}/` exists
- Displays workspace path if valid
- Exits with code 2 if missing

**Branch Validation:**
- Expected pattern: `contrib/{username}/{feature}`
- Compares current branch to expected
- Shows warning if mismatch, but continues validation

#### 3. Quality Gates

Runs all validation gates via `quality-validator.mjs`:

1. **Markdown Lint**
   - Tool: `npm exec markdownlint-cli2`
   - Pass criteria: No errors
   - Score impact: -5 per error

2. **Manifest Sync**
   - Tool: `tools/manifest/sync-manifests.mjs`
   - Pass criteria: All manifests current
   - Score impact: -10 if out of sync

3. **Documentation Completeness**
   - Checks:
     - README.md mentions feature (-20 if missing)
     - Quick-start guide exists (-20 if missing)
     - Integration doc exists (-10 if missing)
   - Locations checked:
     - `docs/integrations/{feature}-quickstart.md`
     - `docs/integrations/{feature}.md`

4. **Breaking Changes**
   - Detects changes to:
     - `install.sh`
     - `package.json`
     - `/commands/`
     - `/agents/`
     - `CLAUDE.md`
   - Checks if documented in CHANGELOG.md
   - Score impact: -30 if undocumented

5. **Tests**
   - Searches for test files in:
     - `tests/`
     - `test/`
     - `__tests__/`
   - Pattern: `*.test.{js,mjs}`, `*.spec.{js,mjs}`
   - Score impact: -10 if missing

#### 4. Quality Score Calculation

Base: 100 points

Deductions:
- Markdown lint errors: -5 each
- Manifest out of sync: -10
- Missing README update: -20
- Missing quick-start: -20
- Missing integration doc: -10
- Breaking changes undocumented: -30
- Missing tests: -10

**Passing threshold:** 80/100

#### 5. Visual Output

Uses color-coded symbols:
- ✓ (green) - Passed
- ✗ (red) - Failed
- ⚠ (yellow) - Warning

Example output:
```
Running quality validation...

Checking prerequisites...

✓ Workspace exists: .aiwg/contrib/cursor-integration
✓ Current branch: contrib/john/cursor-integration

Running quality gates...

✓ Markdown lint: PASSED
✓ Manifest sync: PASSED
⚠ Documentation: INCOMPLETE
✓ Breaking changes: NONE
⚠ Tests: MISSING

Quality Score: 85/100
Status: ✅ READY for PR creation
```

#### 6. Verbose Mode

When `--verbose` flag is used, shows:

- Specific markdown lint errors with file:line
- Manifest sync issues
- Missing documentation details
- Breaking change file list
- Test file locations

#### 7. Issues to Fix

For failing validations, provides actionable guidance:

```
Issues to Fix:

1. Fix markdown lint errors (3 errors)
   Run: npm exec markdownlint-cli2-fix "**/*.md"
2. Update README.md to mention your feature
3. Add quick-start guide
   Location: docs/integrations/cursor-quickstart.md
4. Add integration documentation
   Location: docs/integrations/cursor.md

Minimum quality score: 80/100 (current: 65/100)
```

#### 8. Report Persistence

Saves quality report to workspace:

**File:** `.aiwg/contrib/{feature}/quality.json`

**Schema:**
```json
{
  "score": 85,
  "passed": true,
  "timestamp": "2025-10-17T12:00:00.000Z",
  "gates": {
    "markdownLint": {
      "passed": true,
      "errors": 0
    },
    "manifestSync": {
      "synced": true,
      "outOfSync": 0
    },
    "documentation": {
      "complete": false,
      "missing": ["Quick-start guide present"]
    },
    "breakingChanges": {
      "hasBreaking": false,
      "documented": false
    },
    "tests": {
      "hasTests": true,
      "testFiles": 2
    }
  }
}
```

Also updates `status.json` with quality data.

### Exit Codes

- **0** - Quality score >= 80 (ready for PR)
- **1** - Quality score < 80 (not ready) or missing argument
- **2** - Workspace not found (prerequisites not met)
- **3** - Validation error (fatal)

## Testing

### Test Cases

1. **Missing feature name:**
   ```bash
   node tools/contrib/test-contribution.mjs
   # Exit 1, shows usage
   ```

2. **Workspace not found:**
   ```bash
   node tools/contrib/test-contribution.mjs nonexistent
   # Exit 2, suggests running -contribute-start
   ```

3. **Wrong branch warning:**
   ```bash
   # On branch 'main', testing 'cursor-integration'
   # Shows warning but continues
   ```

4. **Quality validation:**
   ```bash
   node tools/contrib/test-contribution.mjs test-feature
   # Runs all gates, shows results, saves report
   ```

5. **Verbose mode:**
   ```bash
   node tools/contrib/test-contribution.mjs test-feature --verbose
   # Shows detailed lint errors
   ```

### Manual Test Results

All test cases passed:
- ✓ Argument parsing works
- ✓ Workspace validation works
- ✓ Branch checking works (warning shown)
- ✓ Quality gates execute
- ✓ Visual output is clear
- ✓ Verbose mode shows details
- ✓ Report saved correctly
- ✓ Exit codes correct
- ✓ Integration with quality-validator.mjs works
- ✓ Integration with workspace-manager.mjs works

## Usage Example

```bash
# Start contribution
aiwg -contribute-start cursor-integration

# Develop feature...

# Test quality before PR
aiwg -contribute-test cursor-integration

# Output:
# Running quality validation...
#
# ✓ Workspace exists: .aiwg/contrib/cursor-integration
# ✓ Current branch: contrib/john/cursor-integration
#
# ✓ Markdown lint: PASSED
# ✓ Manifest sync: PASSED
# ✗ Documentation: INCOMPLETE
# ✓ Breaking changes: NONE
# ⚠ Tests: MISSING
#
# Quality Score: 85/100
# Status: ✅ READY for PR creation

# Fix issues if needed, then create PR
aiwg -contribute-pr cursor-integration
```

## Integration Points

### With quality-validator.mjs

- `runAllGates(feature, projectRoot)` - Executes all validation
- `generateReport(results)` - Generates human-readable report

### With workspace-manager.mjs

- `workspaceExists(feature)` - Validates workspace
- `getWorkspacePath(feature)` - Gets workspace path
- `saveQualityReport(feature, data)` - Persists results

### With install.sh

Will be integrated as:
```bash
-contribute-test|--contribute-test)
  shift
  node "$INSTALL_DIR/tools/contrib/test-contribution.mjs" "$@"
  exit $?
  ;;
```

## Error Handling

1. **Missing workspace:**
   - Clear error message
   - Suggests `aiwg -contribute-start`
   - Exit 2

2. **Wrong branch:**
   - Shows warning
   - Continues validation
   - Does not fail

3. **Validation errors:**
   - Catches exceptions
   - Shows error message
   - Exit 3

4. **Save failures:**
   - Shows warning
   - Continues execution
   - Does not fail validation

## Future Enhancements

1. **Custom thresholds:**
   ```bash
   aiwg -contribute-test feature --threshold 90
   ```

2. **Skip specific gates:**
   ```bash
   aiwg -contribute-test feature --skip-lint
   ```

3. **Auto-fix mode:**
   ```bash
   aiwg -contribute-test feature --fix
   # Runs lint fixers, manifest sync
   ```

4. **CI mode:**
   ```bash
   aiwg -contribute-test feature --ci
   # Machine-readable output
   ```

## Documentation

See:
- Feature plan: `.aiwg/planning/contributor-workflow-feature-plan.md`
- User guide: `docs/contributing/contributor-quickstart.md`
- Library docs: `tools/contrib/lib/quality-validator.mjs`

## Status

✅ **COMPLETE** - Ready for integration into install.sh

**Next steps:**
1. Add command to install.sh
2. Test end-to-end workflow
3. Update contributor documentation
