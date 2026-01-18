# Snapshot Manager API Reference

Complete API documentation for the Snapshot Manager module.

## Class: SnapshotManager

Manages pre-session and post-session state snapshots for External Ralph Loop iterations.

### Constructor

```javascript
new SnapshotManager(projectRoot)
```

**Parameters:**
- `projectRoot` (string) - Absolute path to the project root directory

**Example:**
```javascript
import { SnapshotManager } from './snapshot-manager.mjs';

const snapshotMgr = new SnapshotManager('/mnt/dev-inbox/jmagly/ai-writing-guide');
```

## Methods

### capturePreSnapshot()

Captures the state before a Claude session starts.

```javascript
capturePreSnapshot(projectRoot, iterationDir): PreSnapshot
```

**Parameters:**
- `projectRoot` (string) - Project root directory path
- `iterationDir` (string) - Directory to store snapshot (e.g., `.aiwg/ralph-external/iterations/001`)

**Returns:** `PreSnapshot` object

**Side Effects:**
- Creates `{iterationDir}/pre-snapshot.json`
- Creates iteration directory if it doesn't exist

**Example:**
```javascript
const preSnapshot = snapshotMgr.capturePreSnapshot(
  '/path/to/project',
  '/path/to/project/.aiwg/ralph-external/iterations/001'
);

console.log('Starting commit:', preSnapshot.git.commit);
console.log('Key files:', preSnapshot.keyFiles.length);
```

---

### capturePostSnapshot()

Captures the state after a Claude session completes.

```javascript
capturePostSnapshot(projectRoot, iterationDir): PostSnapshot
```

**Parameters:**
- `projectRoot` (string) - Project root directory path
- `iterationDir` (string) - Directory containing pre-snapshot

**Returns:** `PostSnapshot` object

**Throws:**
- Error if `pre-snapshot.json` doesn't exist in `iterationDir`

**Side Effects:**
- Creates `{iterationDir}/post-snapshot.json`

**Example:**
```javascript
const postSnapshot = snapshotMgr.capturePostSnapshot(
  '/path/to/project',
  '/path/to/project/.aiwg/ralph-external/iterations/001'
);

console.log('Ending commit:', postSnapshot.git.commit);
console.log('Files changed:', postSnapshot.fileDiffs.length);
console.log('Commits made:', postSnapshot.commits.length);
```

---

### calculateDiff()

Calculates the difference between pre and post snapshots.

```javascript
calculateDiff(preSnapshot, postSnapshot): SnapshotDiff
```

**Parameters:**
- `preSnapshot` (PreSnapshot) - Pre-session snapshot object
- `postSnapshot` (PostSnapshot) - Post-session snapshot object

**Returns:** `SnapshotDiff` object with structured comparison

**Example:**
```javascript
const preSnapshot = JSON.parse(
  readFileSync('.aiwg/ralph-external/iterations/001/pre-snapshot.json', 'utf8')
);
const postSnapshot = JSON.parse(
  readFileSync('.aiwg/ralph-external/iterations/001/post-snapshot.json', 'utf8')
);

const diff = snapshotMgr.calculateDiff(preSnapshot, postSnapshot);

console.log(`Duration: ${diff.duration}`);
console.log(`Files added: ${diff.filesAdded.length}`);
console.log(`Files modified: ${diff.filesModified.length}`);
console.log(`AIWG artifacts created: ${diff.aiwgArtifactsCreated.length}`);
console.log(`Commits: ${diff.commitCount}`);
```

---

### captureGitStatus()

Low-level method to capture current git repository status.

```javascript
captureGitStatus(projectRoot): GitStatus
```

**Parameters:**
- `projectRoot` (string) - Project root directory path

**Returns:** `GitStatus` object

**Example:**
```javascript
const gitStatus = snapshotMgr.captureGitStatus('/path/to/project');

console.log('Branch:', gitStatus.branch);
console.log('Commit:', gitStatus.commit);
console.log('Staged files:', gitStatus.staged);
console.log('Untracked files:', gitStatus.untracked);
```

---

### captureKeyFiles()

Captures snapshots of important project files.

```javascript
captureKeyFiles(projectRoot): FileSnapshot[]
```

**Parameters:**
- `projectRoot` (string) - Project root directory path

**Returns:** Array of `FileSnapshot` objects for each key file that exists

**Tracked Files:**
- `package.json`
- `package-lock.json`
- `CLAUDE.md`
- `CHANGELOG.md`
- `.gitignore`
- `tsconfig.json`

**Example:**
```javascript
const keyFiles = snapshotMgr.captureKeyFiles('/path/to/project');

for (const file of keyFiles) {
  console.log(`${file.path}: ${file.hash.substring(0, 8)}... (${file.size} bytes)`);
}
```

---

### captureAiwgState()

Captures state of the `.aiwg/` directory.

```javascript
captureAiwgState(projectRoot): AiwgState
```

**Parameters:**
- `projectRoot` (string) - Project root directory path

**Returns:** `AiwgState` object containing all `.aiwg/` files and internal Ralph state

**Example:**
```javascript
const aiwgState = snapshotMgr.captureAiwgState('/path/to/project');

console.log('AIWG files tracked:', aiwgState.files.length);

if (aiwgState.ralphState) {
  console.log('Internal Ralph phase:', aiwgState.ralphState.currentPhase);
}
```

---

### createFileSnapshot()

Creates a snapshot of a single file.

```javascript
createFileSnapshot(projectRoot, filePath): FileSnapshot
```

**Parameters:**
- `projectRoot` (string) - Project root directory path
- `filePath` (string) - Absolute path to file

**Returns:** `FileSnapshot` object with hash, size, and mtime

**Example:**
```javascript
const fileSnap = snapshotMgr.createFileSnapshot(
  '/path/to/project',
  '/path/to/project/src/module.ts'
);

console.log('File:', fileSnap.path);
console.log('Hash:', fileSnap.hash);
console.log('Size:', fileSnap.size);
console.log('Modified:', fileSnap.mtime);
```

---

### calculateFileDiffs()

Calculates file differences between two git commits.

```javascript
calculateFileDiffs(projectRoot, fromCommit, toCommit): FileDiff[]
```

**Parameters:**
- `projectRoot` (string) - Project root directory path
- `fromCommit` (string) - Starting commit hash
- `toCommit` (string) - Ending commit hash

**Returns:** Array of `FileDiff` objects

**Example:**
```javascript
const diffs = snapshotMgr.calculateFileDiffs(
  '/path/to/project',
  'abc123',
  'def456'
);

for (const diff of diffs) {
  console.log(`${diff.status}: ${diff.path}`);
  if (diff.diff) {
    console.log(diff.diff.substring(0, 100) + '...');
  }
}
```

---

### getCommitsSince()

Gets all commits made since a specific commit.

```javascript
getCommitsSince(projectRoot, sinceCommit): string[]
```

**Parameters:**
- `projectRoot` (string) - Project root directory path
- `sinceCommit` (string) - Commit hash to start from

**Returns:** Array of commit messages (newest first)

**Example:**
```javascript
const commits = snapshotMgr.getCommitsSince('/path/to/project', 'abc123');

console.log(`${commits.length} commits made:`);
for (const commit of commits) {
  console.log(`  - ${commit}`);
}
```

---

### findTestResults()

Searches for test results in common locations.

```javascript
findTestResults(projectRoot, iterationDir): TestResults
```

**Parameters:**
- `projectRoot` (string) - Project root directory path
- `iterationDir` (string) - Iteration directory to search

**Returns:** `TestResults` object

**Searched Locations:**
1. `{iterationDir}/../*.log` - Iteration output logs
2. `{projectRoot}/test-results.json`
3. `{projectRoot}/.aiwg/testing/test-results.md`
4. `{projectRoot}/coverage/coverage-summary.json`

**Example:**
```javascript
const testResults = snapshotMgr.findTestResults(
  '/path/to/project',
  '/path/to/project/.aiwg/ralph-external/iterations/001'
);

if (testResults.found) {
  console.log('Tests found in:', testResults.file);
  console.log('Summary:', testResults.summary);
}
```

---

### parseTestOutput()

Parses test output to extract summary statistics.

```javascript
parseTestOutput(content): Object|null
```

**Parameters:**
- `content` (string) - Test output content (JSON or text)

**Returns:** Parsed test summary object, or `null` if no test patterns found

**Supported Formats:**
- Jest/Vitest JSON output
- Text patterns: "Tests: X passed, X total"
- Mocha: "X passing"
- TAP: "# tests X"

**Example:**
```javascript
const output = readFileSync('test-output.log', 'utf8');
const summary = snapshotMgr.parseTestOutput(output);

if (summary) {
  if (summary.type === 'jest') {
    console.log(`${summary.passed}/${summary.total} tests passed`);
  } else if (summary.type === 'text') {
    console.log('Test output:', summary.snippet);
  }
}
```

---

### formatDuration()

Formats duration in milliseconds to human-readable string.

```javascript
formatDuration(ms): string
```

**Parameters:**
- `ms` (number) - Duration in milliseconds

**Returns:** Human-readable duration string

**Examples:**
```javascript
console.log(snapshotMgr.formatDuration(5000));      // "5s"
console.log(snapshotMgr.formatDuration(125000));    // "2m 5s"
console.log(snapshotMgr.formatDuration(7380000));   // "2h 3m"
console.log(snapshotMgr.formatDuration(21600000));  // "6h 0m"
```

## Type Definitions

### GitStatus

```typescript
type GitStatus = {
  branch: string;          // Current branch name
  commit: string;          // Current HEAD commit hash
  staged: string[];        // Staged file paths
  unstaged: string[];      // Modified but unstaged file paths
  untracked: string[];     // Untracked file paths
}
```

### FileSnapshot

```typescript
type FileSnapshot = {
  path: string;            // Relative path from project root
  hash: string;            // SHA256 hash of file content
  size: number;            // File size in bytes
  mtime: string;           // Last modification time (ISO 8601)
}
```

### AiwgState

```typescript
type AiwgState = {
  files: FileSnapshot[];   // All files in .aiwg/ directory
  ralphState: Object|null; // Internal Ralph state if exists
}
```

### PreSnapshot

```typescript
type PreSnapshot = {
  timestamp: string;       // ISO 8601 timestamp
  git: GitStatus;          // Git repository status
  keyFiles: FileSnapshot[]; // Key project files
  aiwg: AiwgState;         // .aiwg directory state
}
```

### FileDiff

```typescript
type FileDiff = {
  path: string;            // File path
  status: 'added'|'modified'|'deleted'; // Change type
  diff?: string;           // Git diff output (for modified files)
}
```

### TestResults

```typescript
type TestResults = {
  found: boolean;          // Whether test results were found
  file?: string;           // Path to test output file
  summary?: Object;        // Parsed test summary
}
```

### PostSnapshot

```typescript
type PostSnapshot = {
  timestamp: string;       // ISO 8601 timestamp
  git: GitStatus;          // Updated git status
  fileDiffs: FileDiff[];   // Files changed since pre-snapshot
  commits: string[];       // Commits made during session
  aiwg: AiwgState;         // Updated .aiwg state
  tests: TestResults;      // Test results if available
}
```

### SnapshotDiff

```typescript
type SnapshotDiff = {
  duration: string;        // Human-readable duration
  durationMs: number;      // Duration in milliseconds
  filesAdded: string[];    // New files created
  filesModified: string[]; // Existing files modified
  filesDeleted: string[];  // Files deleted
  aiwgArtifactsCreated: string[];  // New .aiwg artifacts
  aiwgArtifactsUpdated: string[];  // Updated .aiwg artifacts
  commitCount: number;     // Number of commits made
  commits: string[];       // Commit messages
  hasTests: boolean;       // Whether test results exist
  testSummary?: Object;    // Test summary if available
}
```

## Constants

### KEY_FILES

Array of important project files tracked in snapshots:

```javascript
const KEY_FILES = [
  'package.json',
  'package-lock.json',
  'CLAUDE.md',
  'CHANGELOG.md',
  '.gitignore',
  'tsconfig.json',
];
```

### TEST_PATTERNS

Patterns used to search for test results:

```javascript
const TEST_PATTERNS = [
  '.aiwg/ralph-external/outputs/*.log',
  'test-results.json',
  'coverage/lcov-report/index.html',
  '.aiwg/testing/*.md',
];
```

## Error Handling

### Common Errors

**Pre-snapshot not found:**
```javascript
try {
  const postSnapshot = snapshotMgr.capturePostSnapshot(projectRoot, iterationDir);
} catch (error) {
  if (error.message.includes('Pre-snapshot not found')) {
    console.error('Must capture pre-snapshot before post-snapshot');
  }
}
```

**Git not available:**
```javascript
const gitStatus = snapshotMgr.captureGitStatus(projectRoot);
if (gitStatus.commit === 'unknown') {
  console.warn('Not a git repository or git command failed');
}
```

**File not found:**
```javascript
// captureKeyFiles() silently skips missing files
const keyFiles = snapshotMgr.captureKeyFiles(projectRoot);
console.log(`Found ${keyFiles.length} of ${KEY_FILES.length} key files`);
```

## Performance Notes

- **File hashing**: Uses SHA256, ~1ms per file
- **Git operations**: Can be slow for large repositories
- **Directory traversal**: Recursive scan of `.aiwg/` may take seconds for large projects
- **Diff generation**: Large diffs (>1000 files) may take several seconds

## References

- @tools/ralph-external/snapshot-manager.mjs - Implementation
- @tools/ralph-external/docs/snapshot-manager-usage.md - Usage guide
- @test/unit/ralph-external/snapshot-manager.test.ts - Test suite
