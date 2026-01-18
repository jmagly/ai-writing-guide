# Snapshot Manager Usage Guide

The Snapshot Manager captures comprehensive state before and after long-running Claude sessions, enabling detailed analysis of what changed during 6-8 hour external Ralph loops.

## Overview

The Snapshot Manager provides three core capabilities:

1. **Pre-Session Snapshots** - Capture initial state before Claude session starts
2. **Post-Session Snapshots** - Capture final state after Claude session completes
3. **Diff Calculation** - Compare snapshots to determine what changed

## Basic Usage

```javascript
import { SnapshotManager } from './snapshot-manager.mjs';

const projectRoot = '/path/to/project';
const iterationDir = '/path/to/iteration/001';

const snapshotMgr = new SnapshotManager(projectRoot);

// Before session starts
const preSnapshot = snapshotMgr.capturePreSnapshot(projectRoot, iterationDir);

// ... long-running Claude session ...

// After session completes
const postSnapshot = snapshotMgr.capturePostSnapshot(projectRoot, iterationDir);

// Calculate what changed
const diff = snapshotMgr.calculateDiff(preSnapshot, postSnapshot);

console.log(`Session duration: ${diff.duration}`);
console.log(`Files added: ${diff.filesAdded.length}`);
console.log(`Files modified: ${diff.filesModified.length}`);
console.log(`Commits made: ${diff.commitCount}`);
console.log(`AIWG artifacts created: ${diff.aiwgArtifactsCreated.length}`);
```

## Pre-Session Snapshot

Captures the starting state including:

- **Git Status**: Current branch, commit hash, staged/unstaged/untracked files
- **Key Files**: Hashes of package.json, CLAUDE.md, CHANGELOG.md, etc.
- **AIWG State**: All files in `.aiwg/` directory with modification times and hashes
- **Internal Ralph State**: Current loop state if exists in `.aiwg/ralph/current-loop.json`

### Example Output

```json
{
  "timestamp": "2026-01-18T12:00:00.000Z",
  "git": {
    "branch": "main",
    "commit": "abc123def456...",
    "staged": [],
    "unstaged": ["src/module.ts"],
    "untracked": [".aiwg/working/notes.md"]
  },
  "keyFiles": [
    {
      "path": "package.json",
      "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "size": 1024,
      "mtime": "2026-01-18T11:30:00.000Z"
    }
  ],
  "aiwg": {
    "files": [
      {
        "path": ".aiwg/requirements/user-stories.md",
        "hash": "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
        "size": 2048,
        "mtime": "2026-01-18T10:00:00.000Z"
      }
    ],
    "ralphState": {
      "currentPhase": "elaboration",
      "iteration": 2
    }
  }
}
```

## Post-Session Snapshot

Captures the final state including:

- **Git Status**: Updated branch, commit, file states
- **File Diffs**: All files added, modified, or deleted since pre-snapshot
- **Commits**: All commits made during the session
- **AIWG Updates**: Updated `.aiwg/` directory state
- **Test Results**: Parsed test output if available

### Example Output

```json
{
  "timestamp": "2026-01-18T18:00:00.000Z",
  "git": {
    "branch": "main",
    "commit": "xyz789abc123...",
    "staged": [],
    "unstaged": [],
    "untracked": []
  },
  "fileDiffs": [
    {
      "path": "src/new-feature.ts",
      "status": "added"
    },
    {
      "path": "src/module.ts",
      "status": "modified",
      "diff": "@@ -10,6 +10,8 @@\n+  // New implementation\n..."
    }
  ],
  "commits": [
    "xyz789 feat: implement new feature",
    "def456 refactor: improve module structure",
    "abc789 test: add comprehensive test suite"
  ],
  "aiwg": {
    "files": [
      {
        "path": ".aiwg/architecture/sad.md",
        "hash": "new-hash-value",
        "size": 4096,
        "mtime": "2026-01-18T17:45:00.000Z"
      }
    ],
    "ralphState": {
      "currentPhase": "construction",
      "iteration": 5
    }
  },
  "tests": {
    "found": true,
    "file": "test-results.json",
    "summary": {
      "type": "jest",
      "total": 45,
      "passed": 43,
      "failed": 2,
      "skipped": 0
    }
  }
}
```

## Snapshot Diff

The diff calculation provides a structured summary of all changes:

```json
{
  "duration": "6h 0m",
  "durationMs": 21600000,
  "filesAdded": ["src/new-feature.ts", "test/new-feature.test.ts"],
  "filesModified": ["src/module.ts", "package.json"],
  "filesDeleted": [],
  "aiwgArtifactsCreated": [".aiwg/architecture/component-diagram.md"],
  "aiwgArtifactsUpdated": [".aiwg/architecture/sad.md", ".aiwg/requirements/user-stories.md"],
  "commitCount": 3,
  "commits": [
    "xyz789 feat: implement new feature",
    "def456 refactor: improve module structure",
    "abc789 test: add comprehensive test suite"
  ],
  "hasTests": true,
  "testSummary": {
    "type": "jest",
    "total": 45,
    "passed": 43,
    "failed": 2,
    "skipped": 0
  }
}
```

## Integration with Orchestrator

The Snapshot Manager is designed to integrate with the External Ralph Loop orchestrator:

```javascript
// In orchestrator's iteration loop

// Before launching Claude session
const iterationDir = stateManager.getIterationDir(iteration);
const preSnapshot = snapshotManager.capturePreSnapshot(projectRoot, iterationDir);

// Launch Claude session
await sessionLauncher.launch(/* ... */);

// After session completes
const postSnapshot = snapshotManager.capturePostSnapshot(projectRoot, iterationDir);
const diff = snapshotManager.calculateDiff(preSnapshot, postSnapshot);

// Use diff for analysis
const report = `
## Session ${iteration} Summary

Duration: ${diff.duration}
Files Changed: ${diff.filesAdded.length + diff.filesModified.length}
AIWG Artifacts: ${diff.aiwgArtifactsCreated.length} created, ${diff.aiwgArtifactsUpdated.length} updated
Commits: ${diff.commitCount}
Tests: ${diff.hasTests ? `${diff.testSummary.passed}/${diff.testSummary.total} passed` : 'Not run'}
`;
```

## Test Result Detection

The Snapshot Manager automatically searches for test results in common locations:

1. **Iteration output logs** - Parses stdout/stderr for test patterns
2. **test-results.json** - Jest/Vitest JSON output
3. **.aiwg/testing/*** - SDLC test artifacts
4. **coverage/** - Coverage reports

### Supported Test Formats

- **Jest/Vitest JSON**: Full test statistics
- **Text patterns**: "Tests: X passed, X total"
- **Mocha**: "X passing"
- **TAP**: "# tests X"

## Error Handling

### Pre-Snapshot Errors

```javascript
try {
  const preSnapshot = snapshotManager.capturePreSnapshot(projectRoot, iterationDir);
} catch (error) {
  // Non-fatal - snapshot may be incomplete but should not crash
  console.error('Pre-snapshot failed:', error.message);
}
```

### Post-Snapshot Errors

```javascript
try {
  const postSnapshot = snapshotManager.capturePostSnapshot(projectRoot, iterationDir);
} catch (error) {
  if (error.message.includes('Pre-snapshot not found')) {
    // Fatal - cannot compare without baseline
    throw error;
  }
  // Other errors may be non-fatal
  console.error('Post-snapshot incomplete:', error.message);
}
```

## Performance Considerations

- **Large .aiwg directories**: Snapshot capture time scales with file count
- **Large git diffs**: Diff generation can be slow for massive changes
- **Nested directories**: Deep directory structures increase traversal time

### Optimization Tips

1. **Exclude working files**: Don't track `.aiwg/working/` in snapshots
2. **Limit diff context**: For large files, consider limiting git diff context lines
3. **Async operations**: Use Promise.all() for parallel file hashing when possible

## Snapshot Storage

Snapshots are stored in the iteration directory:

```
.aiwg/ralph-external/iterations/
└── 001/
    ├── pre-snapshot.json   # Captured before session
    └── post-snapshot.json  # Captured after session
```

Each snapshot file is ~1-10KB depending on project size.

## Examples

### Example 1: Simple Session Tracking

```javascript
const snapshotMgr = new SnapshotManager('/path/to/project');
const iterDir = '.aiwg/ralph-external/iterations/001';

// Before
snapshotMgr.capturePreSnapshot('/path/to/project', iterDir);

// ... work happens ...

// After
const postSnap = snapshotMgr.capturePostSnapshot('/path/to/project', iterDir);

if (postSnap.tests.found) {
  console.log('Tests ran:', postSnap.tests.summary);
}
```

### Example 2: Progress Tracking

```javascript
const preSnap = JSON.parse(
  readFileSync('.aiwg/ralph-external/iterations/001/pre-snapshot.json')
);
const postSnap = JSON.parse(
  readFileSync('.aiwg/ralph-external/iterations/001/post-snapshot.json')
);

const diff = snapshotMgr.calculateDiff(preSnap, postSnap);

console.log(`
Progress Report:
- Duration: ${diff.duration}
- New features: ${diff.filesAdded.filter(f => f.startsWith('src/')).length}
- Tests added: ${diff.filesAdded.filter(f => f.includes('.test.')).length}
- Documentation: ${diff.aiwgArtifactsCreated.length} artifacts created
`);
```

### Example 3: Test Coverage Tracking

```javascript
function analyzeTestCoverage(diff) {
  if (!diff.hasTests) {
    return 'No tests run';
  }

  const { passed, failed, total } = diff.testSummary;
  const passRate = (passed / total * 100).toFixed(1);

  return `${passRate}% pass rate (${passed}/${total} tests passed)`;
}

const diff = snapshotMgr.calculateDiff(preSnap, postSnap);
console.log(analyzeTestCoverage(diff));
```

## Troubleshooting

### "Pre-snapshot not found"

Ensure you called `capturePreSnapshot()` before attempting `capturePostSnapshot()`.

### Git commands failing

If not in a git repository, git fields will show "unknown" but snapshot still works.

### Missing test results

Check that:
1. Tests actually ran during the session
2. Output is in a recognized format
3. Test files are in expected locations

### Large snapshot files

If snapshots exceed 100KB:
1. Check for large binary files in `.aiwg/`
2. Consider excluding large generated files
3. Verify git diff output isn't enormous

## References

- @.aiwg/requirements/design-ralph-external.md - External Ralph Loop design
- @tools/ralph-external/state-manager.mjs - Session state management
- @tools/ralph-external/output-analyzer.mjs - Output analysis patterns
