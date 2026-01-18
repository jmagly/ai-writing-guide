# Checkpoint Manager

Periodic state capture for External Ralph Loop sessions, enabling crash recovery and progress tracking during long-running Claude sessions (6-8 hours).

## Overview

The Checkpoint Manager captures periodic snapshots of project state during active Claude sessions. This enables:

- **Crash Recovery**: Know exactly what state the project was in when a session crashed
- **Progress Tracking**: See how the project evolved over time
- **Memory Tracking**: Monitor resource usage during long sessions
- **Cumulative Change Tracking**: Aggregate all files modified across checkpoints

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Checkpoint Manager                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  start()                     captureCheckpoint()                        │
│     │                              │                                    │
│     ▼                              ▼                                    │
│  ┌─────────┐               ┌──────────────┐                            │
│  │ Initial │               │   Capture    │                            │
│  │Checkpoint│──────────────│   Git Status │                            │
│  └─────────┘               └──────────────┘                            │
│       │                           │                                     │
│       │                    ┌──────────────┐                            │
│       │                    │   Capture    │                            │
│       │                    │ .aiwg State  │                            │
│       │                    └──────────────┘                            │
│       │                           │                                     │
│       ▼                    ┌──────────────┐                            │
│  ┌─────────┐               │   Capture    │                            │
│  │ Timer   │──interval────▶│Memory Usage  │                            │
│  │ (30min) │               └──────────────┘                            │
│  └─────────┘                      │                                     │
│       │                           ▼                                     │
│       │                    ┌──────────────┐                            │
│       │                    │    Write     │                            │
│       │                    │ Checkpoint   │                            │
│       │                    │   File       │                            │
│       │                    └──────────────┘                            │
│       ▼                                                                │
│  stop() ──────────────────▶ Final Checkpoint + Summary                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

```javascript
import { CheckpointManager } from './checkpoint-manager.mjs';

const checkpoints = new CheckpointManager({
  stateDir: '.aiwg/ralph-external/iterations/001',
  projectRoot: '/path/to/project',
  interval: 15 * 60 * 1000, // 15 minutes
  sessionId: 'session-uuid',
});

// Start periodic checkpoints
checkpoints.start();

// ... Claude session runs ...

// Stop and get summary
const summary = checkpoints.stop();
console.log(`Captured ${summary.total} checkpoints`);
console.log(`Files modified: ${summary.filesModified.length}`);
```

## API Reference

### Constructor

```javascript
const checkpoints = new CheckpointManager(options);
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stateDir` | string | required | Directory for checkpoint files |
| `projectRoot` | string | required | Project root directory |
| `interval` | number | 1800000 | Checkpoint interval in ms (30 min) |
| `sessionId` | string | 'unknown' | Claude session ID |
| `onCheckpoint` | function | null | Callback on each checkpoint |

### Methods

#### `start(options?)`

Start periodic checkpoint capture.

```javascript
checkpoints.start();
// or with options override
checkpoints.start({
  interval: 10 * 60 * 1000, // 10 minutes
});
```

- Captures initial checkpoint immediately
- Starts periodic timer
- Returns `this` for chaining

#### `stop()`

Stop checkpoint timer and capture final checkpoint.

```javascript
const summary = checkpoints.stop();
```

**Returns**: Checkpoint summary (see below)

#### `captureCheckpoint(number)`

Manually capture a checkpoint.

```javascript
const checkpoint = checkpoints.captureCheckpoint(5);
```

**Returns**: `CheckpointData` object

#### `getAllCheckpoints()`

Get all checkpoints for current session.

```javascript
const checkpoints = manager.getAllCheckpoints();
```

**Returns**: Array of `CheckpointData` objects

#### `summarizeCheckpoints(stateDir?)`

Generate summary of all checkpoints.

```javascript
const summary = checkpoints.summarizeCheckpoints();
// or for a specific directory
const summary = CheckpointManager.prototype.summarizeCheckpoints('.aiwg/ralph-external/iterations/001');
```

**Returns**: Summary object (see below)

### Static Methods

#### `CheckpointManager.getLatestCheckpoint(stateDir)`

Get latest checkpoint from a directory.

```javascript
const latest = CheckpointManager.getLatestCheckpoint(
  '.aiwg/ralph-external/iterations/001'
);
```

#### `CheckpointManager.formatDuration(ms)`

Format duration in human-readable format.

```javascript
CheckpointManager.formatDuration(5400000); // "1h 30m"
CheckpointManager.formatDuration(90000);   // "1m 30s"
CheckpointManager.formatDuration(5000);    // "5s"
```

## Type Definitions

### CheckpointData

```typescript
interface CheckpointData {
  number: number;           // Checkpoint number
  timestamp: string;        // ISO timestamp
  duration: number;         // Milliseconds since session start
  sessionId: string;        // Claude session ID
  gitStatus: {
    branch: string;         // Current git branch
    modified: string[];     // Modified files
    untracked: string[];    // Untracked files
    staged: string[];       // Staged files
    error?: string;         // Error message if git command failed
  };
  aiwgState: {
    files: string[];        // Files in .aiwg/
    sizes: Record<string, number>; // File sizes in bytes
    error?: string;         // Error message if scan failed
  };
  filesModified: string[];  // Cumulative files modified
  memory: {
    heapUsed: number;       // Heap memory used in bytes
    rss: number;            // Resident set size in bytes
  };
}
```

### CheckpointSummary

```typescript
interface CheckpointSummary {
  total: number;            // Total checkpoint count
  totalDuration: number;    // Total session duration in ms
  filesModified: string[];  // All files modified across checkpoints
  checkpoints: Array<{
    number: number;
    timestamp: string;
    duration: number;
    filesModified: number;  // Count of files
    gitStatus: {
      modified: number;
      staged: number;
      untracked: number;
    };
    aiwgFiles: number;      // Count of .aiwg files
  }>;
}
```

## Events

The CheckpointManager extends EventEmitter:

```javascript
checkpoints.on('started', ({ interval, checkpointsDir }) => {
  console.log(`Started with ${interval}ms interval`);
});

checkpoints.on('checkpoint', (checkpoint) => {
  console.log(`Checkpoint ${checkpoint.number} captured`);
});

checkpoints.on('stopped', ({ finalCheckpoint, summary }) => {
  console.log(`Stopped after ${summary.total} checkpoints`);
});
```

## File Output

Checkpoints are saved as JSON files:

```
.aiwg/ralph-external/iterations/001/
└── checkpoints/
    ├── 001-checkpoint.json
    ├── 002-checkpoint.json
    ├── 003-checkpoint.json
    └── ...
```

### Example Checkpoint File

```json
{
  "number": 3,
  "timestamp": "2026-01-18T14:30:00.000Z",
  "duration": 3600000,
  "sessionId": "abc123-def456",
  "gitStatus": {
    "branch": "feature/auth",
    "modified": ["src/auth/login.ts"],
    "untracked": ["src/auth/logout.ts"],
    "staged": []
  },
  "aiwgState": {
    "files": [
      "requirements/UC-001-auth.md",
      "planning/iteration-1.md"
    ],
    "sizes": {
      "requirements/UC-001-auth.md": 2048,
      "planning/iteration-1.md": 1024
    }
  },
  "filesModified": [
    "src/auth/login.ts",
    "src/auth/middleware.ts"
  ],
  "memory": {
    "heapUsed": 52428800,
    "rss": 104857600
  }
}
```

## Integration with Orchestrator

```javascript
// In orchestrator.mjs
if (this.config.enableCheckpoints) {
  this.checkpointManager = new CheckpointManager({
    stateDir: iterationDir,
    projectRoot: this.projectRoot,
    interval: (this.config.checkpointIntervalMinutes || 30) * 60 * 1000,
    sessionId,
  });

  // Start checkpoints before session
  this.checkpointManager.start();

  // ... run Claude session ...

  // Stop and get summary after session
  const checkpointSummary = this.checkpointManager.stop();
  iteration.checkpointSummary = checkpointSummary;
}
```

## Recommended Intervals

| Session Duration | Recommended Interval |
|------------------|---------------------|
| < 1 hour | 10-15 minutes |
| 1-3 hours | 15-20 minutes |
| 3-6 hours | 20-30 minutes |
| 6-8 hours | 30 minutes (default) |

## Performance Considerations

- Checkpoint capture is synchronous but fast (~10-50ms)
- Git status is captured via shell command
- .aiwg directory is walked recursively (keep it organized)
- Memory tracking uses Node's `process.memoryUsage()`

## Error Handling

The checkpoint manager is designed to be resilient:

- Git command failures: Captured with error message in checkpoint
- Directory scan failures: Captured with error message
- File write failures: Thrown (caller should handle)

## Recovery Usage

To recover from a crash:

```javascript
// Get latest checkpoint from crashed session
const latest = CheckpointManager.getLatestCheckpoint(
  '.aiwg/ralph-external/iterations/001'
);

if (latest) {
  console.log(`Last checkpoint: ${latest.timestamp}`);
  console.log(`Files modified: ${latest.filesModified.join(', ')}`);
  console.log(`Duration at crash: ${CheckpointManager.formatDuration(latest.duration)}`);
}
```

## References

- @tools/ralph-external/orchestrator.mjs - Main loop integration
- @tools/ralph-external/snapshot-manager.mjs - Pre/post snapshots
- @tools/ralph-external/state-assessor.mjs - Two-phase assessment
- @.aiwg/requirements/design-ralph-external.md - Design specification
