# Ralph Multi-Loop CLI Implementation Summary

**Issue**: #267
**Date**: 2026-02-02

## Overview

Implemented multi-loop support for Ralph CLI commands, enabling concurrent execution of up to 4 Ralph loops with isolated state and automatic single-loop detection for backward compatibility.

## Changes Made

### 1. Updated ralph-cli.mjs

**File**: `tools/ralph/ralph-cli.mjs`

**Changes**:
- Added `--loop-id <id>` flag for custom loop IDs
- Added `--force` flag to override MAX_CONCURRENT_LOOPS
- Added `list` subcommand to list all active loops
- Integrated `MultiLoopStateManager` for state management
- Auto-generates loop IDs from task names
- Shows active loops when MAX_CONCURRENT_LOOPS exceeded
- Updated help text with multi-loop examples

**Key Features**:
- `aiwg ralph "task" --completion "criteria"` - Create loop with auto-generated ID
- `aiwg ralph list` - List all active loops
- `aiwg ralph "task" --completion "criteria" --loop-id custom-id` - Custom loop ID
- `aiwg ralph "task" --completion "criteria" --force` - Override MAX_CONCURRENT_LOOPS

### 2. Updated ralph-status.mjs

**File**: `tools/ralph/ralph-status.mjs`

**Changes**:
- Added `--loop-id <id>` flag to show specific loop
- Added `--all` flag to show all loops summary
- Auto-detects single loop when only one exists
- Requires `--loop-id` when multiple loops are active
- Shows helpful error with loop list when `--loop-id` missing
- Supports `--json` output for all modes

**Key Features**:
- `aiwg ralph-status` - Auto-detect single loop
- `aiwg ralph-status --loop-id <id>` - Show specific loop
- `aiwg ralph-status --all` - Show all loops
- `aiwg ralph-status --all --json` - JSON output for scripting

### 3. Updated ralph-abort.mjs

**File**: `tools/ralph/ralph-abort.mjs`

**Changes**:
- Added `--loop-id <id>` flag to abort specific loop
- Auto-detects single loop when only one exists
- Requires `--loop-id` when multiple loops are active
- Shows available loops when `--loop-id` missing
- Uses `MultiLoopStateManager` for state updates

**Key Features**:
- `aiwg ralph-abort` - Auto-detect single loop
- `aiwg ralph-abort --loop-id <id>` - Abort specific loop
- `aiwg ralph-abort --loop-id <id> --revert` - Show revert instructions

### 4. Updated ralph-resume.mjs

**File**: `tools/ralph/ralph-resume.mjs`

**Changes**:
- Added `--loop-id <id>` flag to resume specific loop
- Auto-detects single loop when only one exists
- Requires `--loop-id` when multiple loops are active
- Shows available loops when `--loop-id` missing
- Supports `--max-iterations` and `--timeout` overrides per loop
- Uses `MultiLoopStateManager` for state updates

**Key Features**:
- `aiwg ralph-resume` - Auto-detect single loop
- `aiwg ralph-resume --loop-id <id>` - Resume specific loop
- `aiwg ralph-resume --loop-id <id> --max-iterations 20` - Override limits

## State Management

### Directory Structure

```
.aiwg/ralph/
├── registry.json                    # Central registry
├── loops/
│   ├── ralph-loop-1/
│   │   ├── state.json
│   │   ├── iterations/
│   │   ├── checkpoints/
│   │   └── debug-memory/
│   ├── ralph-loop-2/
│   └── ...
├── archive/                         # Completed loops
└── shared/                          # Cross-loop resources
```

### Registry Format

Tracks all active loops with metadata:
- Loop ID
- Task summary
- Status
- Iteration count
- Priority
- Tags

### MAX_CONCURRENT_LOOPS

- Default limit: 4 concurrent loops
- Enforced by `LoopRegistry` (already implemented)
- Can be overridden with `--force` flag
- Prevents O(n²) communication overhead (REF-088)

## Backward Compatibility

All commands maintain backward compatibility:

| Scenario | Behavior |
|----------|----------|
| No loops exist | Show helpful message |
| Single loop exists | Auto-detect and operate on that loop |
| Multiple loops exist | Require `--loop-id` (except `list` and `--all`) |

### Migration from Single-Loop

Existing single-loop state (`.aiwg/ralph/current-loop.json`) is NOT automatically migrated.

Users should:
1. Complete or abort existing loop
2. Start fresh with new multi-loop commands

## Testing

### Test Coverage

Created comprehensive test suite: `test/unit/ralph/ralph-cli-multiloop.test.mjs`

**Test Suites**:
1. `ralph list` - 3 tests
2. `ralph creation with --loop-id` - 4 tests
3. `ralph-status` - 6 tests
4. `ralph-abort` - 5 tests
5. `ralph-resume` - 7 tests
6. `backward compatibility` - 1 test

**Total**: 26 tests, all passing

### Test Scenarios

- **List**: No loops, multiple loops, loop details
- **Creation**: Custom ID, auto-generation, MAX_CONCURRENT_LOOPS enforcement, --force override
- **Status**: Auto-detect, require --loop-id, --all flag, --json output
- **Abort**: Auto-detect, require --loop-id, specific loop, invalid ID
- **Resume**: Auto-detect, require --loop-id, overrides, completed/aborted loops
- **Backward Compatibility**: Single-loop auto-detection across all commands

### Existing Tests

All existing tests still passing:
- `registry-sync.test.mjs` - 12 tests
- `state-manager-sync.test.mjs` - 15 tests

## Documentation

Created comprehensive guide: `docs/ralph-multiloop-cli-guide.md`

**Sections**:
- Quick Start
- Command Reference (ralph, list, status, abort, resume)
- State Management
- Backward Compatibility
- Error Messages
- Best Practices
- Scripting Examples
- Troubleshooting

## Acceptance Criteria

All acceptance criteria from Issue #267 met:

- [x] `ralph list` shows all active loops
- [x] `ralph --loop-id X status` shows specific loop
- [x] `ralph --all status` shows all loops
- [x] Auto-detection works for single loop
- [x] Error message when multiple loops and no --loop-id specified
- [x] Tests written and passing
- [x] Documentation created

## Usage Examples

### Basic Multi-Loop Workflow

```bash
# Create first loop
aiwg ralph "Fix tests" --completion "npm test passes"

# Create second loop
aiwg ralph "Add coverage" --completion "coverage >= 80%"

# List all loops
aiwg ralph list

# Check specific loop
aiwg ralph-status --loop-id ralph-fix-tests-a1b2c3d4

# Abort one loop
aiwg ralph-abort --loop-id ralph-fix-tests-a1b2c3d4

# Resume the other
aiwg ralph-resume --loop-id ralph-add-coverage-e5f6g7h8
```

### Scripting

```bash
# Check if any loops are running
aiwg ralph-status --all --json | jq 'length'

# Get all running loops
aiwg ralph-status --all --json | jq '.[] | select(.status == "running")'

# Abort all loops
for LOOP_ID in $(aiwg ralph-status --all --json | jq -r '.[].loopId'); do
  aiwg ralph-abort --loop-id "$LOOP_ID"
done
```

## Files Modified

1. `tools/ralph/ralph-cli.mjs` - Main CLI entry point
2. `tools/ralph/ralph-status.mjs` - Status command
3. `tools/ralph/ralph-abort.mjs` - Abort command
4. `tools/ralph/ralph-resume.mjs` - Resume command

## Files Created

1. `test/unit/ralph/ralph-cli-multiloop.test.mjs` - Test suite
2. `docs/ralph-multiloop-cli-guide.md` - User guide
3. `.aiwg/working/ralph-multiloop-cli-implementation-summary.md` - This file

## Dependencies

Uses existing modules:
- `tools/ralph/registry-sync.mjs` - Registry management
- `tools/ralph/state-manager-sync.mjs` - State management

No new dependencies added.

## Breaking Changes

None. All changes are backward compatible with single-loop scenarios.

## Known Limitations

1. **No automatic migration**: Existing single-loop state not migrated to new structure
2. **Loop ID format**: Auto-generated IDs use task name slugification (may have collisions)
3. **Archive management**: No automatic cleanup of archived loops
4. **Cross-loop coordination**: No built-in mechanism for loop dependencies

## Future Enhancements

Potential improvements:
1. Loop priority scheduling
2. Cross-loop dependency tracking
3. Automatic archive cleanup
4. Loop migration tool for legacy state
5. Loop grouping/tagging system
6. Performance metrics per loop

## References

- Issue #267
- @tools/ralph/registry-sync.mjs - Registry implementation
- @tools/ralph/state-manager-sync.mjs - State manager implementation
- REF-088 - Communication overhead in multi-loop systems

## Completion

Implementation complete and tested. All acceptance criteria met.

**Status**: READY FOR REVIEW
