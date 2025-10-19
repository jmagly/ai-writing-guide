# CLI Tools

Command-line interface utilities for AI Writing Guide plugin management and status reporting.

## Commands

### status-command.mjs

Display health status and information for installed plugins (frameworks, add-ons, extensions).

**Usage:**

```bash
# Show all plugins
node tools/cli/status-command.mjs
aiwg -status

# Filter by type
aiwg -status --type frameworks
aiwg -status --type add-ons
aiwg -status --type extensions

# Check specific plugin
aiwg -status sdlc-complete

# Verbose mode
aiwg -status --verbose
aiwg -status sdlc-complete --verbose
```

**Output:**

Displays ASCII tables with:

- Plugin ID, version, install date
- Health status (✓ HEALTHY, ⚠️ WARNING, ❌ ERROR)
- Project count (frameworks)
- Parent framework (add-ons)
- Extended framework (extensions)
- Workspace summary (base path, legacy mode, disk usage)

**Example Output:**

```
AI Writing Guide - Plugin Status
================================================================================

FRAMEWORKS (2 installed)
┌────────────────┬─────────┬──────────────┬──────────┬─────────────────┐
│ ID             │ Version │ Installed    │ Projects │ Health          │
├────────────────┼─────────┼──────────────┼──────────┼─────────────────┤
│ sdlc-complete  │ 1.0.0   │ 2025-10-18   │ 2        │ ✓ HEALTHY       │
│ marketing-flow │ 1.0.0   │ 2025-10-19   │ 1        │ ✓ HEALTHY       │
└────────────────┴─────────┴──────────────┴──────────┴─────────────────┘

WORKSPACE
  Base Path:     .aiwg/
  Legacy Mode:   No (framework-scoped workspace active)
  Total Plugins: 2
  Disk Usage:    125 MB
```

## Testing

### test-status-display.mjs

Creates mock plugin data to test status command output formatting without requiring actual plugins.

**Usage:**

```bash
node tools/cli/test-status-display.mjs
```

This creates temporary test data at `/tmp/aiwg-test-status` and runs multiple test scenarios:

1. Show all plugins
2. Filter by frameworks
3. Filter by add-ons
4. Check specific plugin
5. Verbose mode

Test data is automatically cleaned up after execution.

## Environment Variables

### AIWG_REGISTRY_PATH

Override the default registry path for testing.

```bash
export AIWG_REGISTRY_PATH=/tmp/test-registry.json
node tools/cli/status-command.mjs
```

This is used by the test suite to run tests against mock data.

## Implementation Details

### Table Formatting

Uses ASCII box-drawing characters for clean table output:

- Top border: `┌─┬─┐`
- Header separator: `├─┼─┤`
- Bottom border: `└─┴─┘`
- Column separator: `│`

### Health Icons

- ✓ HEALTHY - All checks passed
- ⚠️ WARNING - Non-critical issues found
- ❌ ERROR - Critical issues detected
- ? UNKNOWN - Health status unknown

### Disk Usage Calculation

Recursively calculates directory size for all plugin repositories.
Displays human-readable format (Bytes, KB, MB, GB, TB).

## Dependencies

- `PluginRegistry` - Plugin metadata CRUD operations
- `HealthChecker` - Plugin health validation and monitoring
- Node.js built-in modules: `fs/promises`, `path`

## Future Enhancements

1. JSON output mode for scripting
2. Color-coded health status (requires terminal color support)
3. Export to CSV/HTML
4. Health history tracking
5. Update availability checks
6. Interactive repair mode
