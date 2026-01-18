# Snapshot Manager

Captures comprehensive pre-session and post-session state for External Ralph Loop iterations, enabling detailed analysis of long-running Claude sessions (6-8 hours).

## Quick Start

```javascript
import { SnapshotManager } from './snapshot-manager.mjs';

const snapshotMgr = new SnapshotManager('/path/to/project');
const iterDir = '.aiwg/ralph-external/iterations/001';

// Before session
const pre = snapshotMgr.capturePreSnapshot('/path/to/project', iterDir);

// ... 6-8 hour Claude session ...

// After session
const post = snapshotMgr.capturePostSnapshot('/path/to/project', iterDir);
const diff = snapshotMgr.calculateDiff(pre, post);

console.log(`Session: ${diff.duration}`);
console.log(`Changed: ${diff.filesAdded.length + diff.filesModified.length} files`);
console.log(`Commits: ${diff.commitCount}`);
console.log(`AIWG: ${diff.aiwgArtifactsCreated.length} new artifacts`);
```

## What It Captures

### Pre-Session Snapshot
- Git status (branch, commit, staged/unstaged/untracked files)
- Key file hashes (package.json, CLAUDE.md, etc.)
- Complete `.aiwg/` directory state
- Internal Ralph state if exists

### Post-Session Snapshot
- Updated git status
- All file changes (added/modified/deleted)
- Git commits made during session
- Updated `.aiwg/` directory state
- Test results if available

### Diff Analysis
- Files added, modified, deleted
- AIWG artifacts created or updated
- Commit history
- Test pass/fail statistics
- Session duration

## Module Structure

```
tools/ralph-external/
├── snapshot-manager.mjs         # Main implementation
├── docs/
│   ├── snapshot-manager-api.md  # Complete API reference
│   └── snapshot-manager-usage.md # Usage examples
└── README-snapshot-manager.md   # This file

test/unit/ralph-external/
└── snapshot-manager.test.ts     # Test suite (23 tests)
```

## Test Coverage

```bash
npm test -- snapshot-manager.test.ts
```

**Status:** ✅ All 23 tests passing

**Coverage Areas:**
- Pre-snapshot capture (git, files, .aiwg state)
- Post-snapshot capture (diffs, commits, tests)
- Diff calculation and categorization
- Test result detection and parsing
- Error handling and recovery

## Integration Points

### With State Manager
```javascript
const stateManager = new StateManager(projectRoot);
const snapshotManager = new SnapshotManager(projectRoot);

const iterDir = stateManager.getIterationDir(iteration);
snapshotManager.capturePreSnapshot(projectRoot, iterDir);
```

### With Output Analyzer
```javascript
const diff = snapshotManager.calculateDiff(pre, post);

// Feed diff into output analyzer
const analysis = outputAnalyzer.analyze(stdout, {
  filesChanged: diff.filesAdded.length + diff.filesModified.length,
  commits: diff.commits,
  testResults: diff.testSummary,
});
```

### With Gitea Tracker
```javascript
const diff = snapshotManager.calculateDiff(pre, post);

// Post progress comment with diff summary
await giteaTracker.addProgressComment(iteration, {
  duration: diff.duration,
  filesChanged: diff.filesAdded.length + diff.filesModified.length,
  commits: diff.commitCount,
  aiwgArtifacts: diff.aiwgArtifactsCreated.length,
});
```

## Key Features

### Comprehensive Git Tracking
- Branch and commit snapshots
- Staged, unstaged, and untracked file detection
- Full diff generation with context
- Commit history extraction

### AIWG Artifact Tracking
- All files in `.aiwg/` directory
- SHA256 hashing for change detection
- Modification timestamps
- Internal Ralph state integration

### Test Result Detection
- Automatic search in common locations
- Multiple format support (Jest, Vitest, Mocha, TAP)
- JSON and text parsing
- Pass/fail statistics

### Performance Optimized
- Efficient file hashing (SHA256)
- Lazy git operations (only when needed)
- Atomic snapshot writes
- Minimal memory footprint

## Example Output

### Pre-Snapshot
```json
{
  "timestamp": "2026-01-18T12:00:00Z",
  "git": {
    "branch": "main",
    "commit": "abc123...",
    "staged": [],
    "unstaged": ["src/module.ts"]
  },
  "keyFiles": [
    {"path": "package.json", "hash": "e3b0c4...", "size": 1024}
  ],
  "aiwg": {
    "files": [...],
    "ralphState": {"currentPhase": "elaboration"}
  }
}
```

### Diff Summary
```json
{
  "duration": "6h 15m",
  "filesAdded": ["src/new-feature.ts"],
  "filesModified": ["src/module.ts", "package.json"],
  "aiwgArtifactsCreated": [".aiwg/architecture/sad.md"],
  "commitCount": 5,
  "hasTests": true,
  "testSummary": {"passed": 43, "total": 45}
}
```

## Documentation

- **API Reference**: `docs/snapshot-manager-api.md`
- **Usage Guide**: `docs/snapshot-manager-usage.md`
- **Tests**: `test/unit/ralph-external/snapshot-manager.test.ts`

## Dependencies

**Node.js Built-ins:**
- `fs` - File system operations
- `path` - Path manipulation
- `crypto` - SHA256 hashing
- `child_process` - Git command execution

**No External Dependencies** - Pure Node.js implementation

## Design Decisions

### Why SHA256 Hashing?
- Reliable change detection
- Standard cryptographic hash
- Fast enough for typical projects (~1ms per file)
- Built into Node.js crypto module

### Why Store Both Snapshots?
- Pre-snapshot provides baseline
- Post-snapshot shows final state
- Both needed for accurate diff calculation
- Supports manual inspection/debugging

### Why Automatic Test Detection?
- Reduces manual configuration
- Supports multiple test frameworks
- Gracefully handles missing tests
- Provides actionable feedback

### Why Track AIWG Artifacts Separately?
- SDLC artifacts are high-value changes
- Enables progress tracking
- Supports loop termination decisions
- Facilitates Gitea issue updates

## Future Enhancements

- [ ] Parallel file hashing for large projects
- [ ] Configurable key files list
- [ ] Coverage percentage tracking
- [ ] Performance metrics (lines of code, complexity)
- [ ] Snapshot compression for large diffs
- [ ] Incremental snapshot updates

## References

- @.aiwg/requirements/design-ralph-external.md - External Ralph Loop design
- @tools/ralph-external/state-manager.mjs - Session state management
- @tools/ralph-external/output-analyzer.mjs - Output analysis
- @tools/ralph-external/orchestrator.mjs - Loop orchestration

---

**Status:** ✅ Complete and tested
**Test Coverage:** 23/23 passing
**Documentation:** Complete
**Version:** 1.0.0
