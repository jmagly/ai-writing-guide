# State Assessor

Two-phase assessment for External Ralph Loop sessions, enabling intelligent continuation after long-running sessions (6-8 hours) that exhaust context memory.

## Overview

The State Assessor implements a two-phase approach:

1. **Orient Phase**: Understand what happened in the previous session
2. **Prompt Phase**: Generate an intelligent continuation prompt

This enables the External Ralph Loop to resume work with context awareness even when the previous session's conversation memory is unavailable.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         State Assessor                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        PHASE 1: Orient                           │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  Inputs:                    Analysis:                           │   │
│  │  - Pre/Post Snapshots       - File change categorization        │   │
│  │  - Snapshot Diff            - Test status analysis              │   │
│  │  - Parsed Events            - Event pattern detection           │   │
│  │  - Session Transcript       - .aiwg artifact inspection         │   │
│  │                             - Internal Ralph state check        │   │
│  │                                                                  │   │
│  │  Outputs:                                                       │   │
│  │  - OrientationResult (summary, progress, accomplishments, etc.) │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      PHASE 2: Generate Prompt                    │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  Inputs:                    Generation:                         │   │
│  │  - OrientationResult        - Task prioritization               │   │
│  │  - Original Objective       - Context file identification       │   │
│  │  - Completion Criteria      - System context building           │   │
│  │  - Accumulated Learnings    - Continuation prompt building      │   │
│  │                                                                  │   │
│  │  Outputs:                                                       │   │
│  │  - PromptGenerationResult (prompt, systemContext, tasks, files) │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

```javascript
import { StateAssessor } from './state-assessor.mjs';

const assessor = new StateAssessor('/path/to/project');

// Full two-phase assessment
const { orientation, prompt } = await assessor.assess({
  objective: 'Implement user authentication',
  completionCriteria: 'npm test -- --testPathPattern=auth passes',
  preSnapshot: preSessionSnapshot,
  postSnapshot: postSessionSnapshot,
  diff: snapshotDiff,
  parsedEvents: parsedStreamEvents,
  iteration: 2,
  accumulatedLearnings: ['Previous learning 1', 'Previous learning 2'],
});

// Use the generated prompt for the next session
console.log(prompt.prompt);
```

## API Reference

### Constructor

```javascript
const assessor = new StateAssessor(projectRoot);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectRoot` | string | Project root directory |

### Methods

#### `assess(context)`

Run full two-phase assessment.

```javascript
const { orientation, prompt } = await assessor.assess(context);
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `objective` | string | Yes | Original task objective |
| `completionCriteria` | string | Yes | How to verify completion |
| `preSnapshot` | Object | No | Pre-session state from SnapshotManager |
| `postSnapshot` | Object | No | Post-session state from SnapshotManager |
| `diff` | Object | No | Calculated diff between snapshots |
| `parsedEvents` | Object | No | Parsed stream-json events |
| `transcriptPath` | string | No | Path to session transcript |
| `iteration` | number | Yes | Current iteration number |
| `accumulatedLearnings` | string[] | No | Learnings from previous iterations |

**Returns**: `{ orientation: OrientationResult, prompt: PromptGenerationResult }`

#### `orient(context)`

Phase 1 only - understand what happened.

```javascript
const orientation = await assessor.orient(context);
```

**Returns**: `OrientationResult`

#### `generatePrompt(context, orientation)`

Phase 2 only - generate continuation prompt.

```javascript
const promptResult = await assessor.generatePrompt(context, orientation);
```

**Returns**: `PromptGenerationResult`

#### `enhanceWithClaude(context, orientation)`

Use Claude (sonnet) to enhance assessment when pattern matching is insufficient.

```javascript
const enhanced = await assessor.enhanceWithClaude(context, orientation);
```

**Returns**: Enhanced `OrientationResult`

#### `saveAssessment(outputDir, orientation, prompt)`

Save assessment results to files.

```javascript
const paths = assessor.saveAssessment(
  '.aiwg/ralph-external/iterations/001',
  orientation,
  promptResult
);
// Returns: { assessmentPath, promptPath, systemContextPath }
```

## Type Definitions

### OrientationResult

```typescript
interface OrientationResult {
  summary: string;           // High-level summary of what happened
  phase: 'early' | 'mid' | 'late' | 'complete' | 'unknown';
  estimatedProgress: number; // 0-100 progress estimate
  accomplishments: string[]; // What was achieved
  pendingTasks: string[];    // What remains to be done
  blockers: string[];        // Current blockers
  learnings: string[];       // Key learnings from session
  lastAction: string;        // Last significant action taken
  recommendedNextStep: string; // Suggested next action
  filesChanged: {
    added: string[];
    modified: string[];
    deleted: string[];
    byCategory: {
      source: string[];
      test: string[];
      config: string[];
      docs: string[];
      aiwg: string[];
      other: string[];
    };
  };
  testStatus: {
    ran: boolean;
    passed: number;
    failed: number;
    skipped: number;
    total: number;
    summary: string;
  } | null;
}
```

### PromptGenerationResult

```typescript
interface PromptGenerationResult {
  prompt: string;              // Generated continuation prompt
  systemContext: string;       // System context to inject
  prioritizedTasks: string[];  // Ordered list of tasks
  contextFiles: {              // Key files to reference
    recentlyModified?: string[];
    testFiles?: string[];
    artifacts?: string[];
  };
}
```

## Analysis Capabilities

### File Change Categorization

Files are automatically categorized:

| Category | Patterns |
|----------|----------|
| `source` | `.ts`, `.js`, `.mjs`, `.tsx`, `.jsx` |
| `test` | Contains `test` or `spec` |
| `config` | `.json`, `.yaml`, `.yml`, `.toml` |
| `docs` | `.md`, `.txt`, contains `doc` |
| `aiwg` | In `.aiwg/` directory |
| `other` | Everything else |

### Progress Estimation

Progress is calculated from multiple signals:

| Signal | Weight |
|--------|--------|
| Accomplishments count | Up to 30% |
| Files modified | Up to 25% |
| Test pass rate | Up to 30% |
| Blockers penalty | -10% each |

### Phase Detection

| Phase | Criteria |
|-------|----------|
| `complete` | Tests passing + >3 accomplishments |
| `late` | Progress >80% |
| `mid` | Progress >40% |
| `early` | Default |

## Integration with Orchestrator

```javascript
// In orchestrator.mjs
if (this.config.useClaudeAssessment) {
  // Use two-phase assessment for intelligent prompts
  const assessment = await this.stateAssessor.assess({
    objective: state.objective,
    completionCriteria: state.completionCriteria,
    preSnapshot: this.currentPreSnapshot,
    postSnapshot,
    diff,
    parsedEvents: result.parsedEventsPath
      ? JSON.parse(readFileSync(result.parsedEventsPath, 'utf8'))
      : null,
    iteration: state.currentIteration,
    accumulatedLearnings: state.accumulatedLearnings,
  });

  // Use generated prompt for next iteration
  const { prompt } = this.promptGenerator.build({
    ...assessment.prompt,
    type: 'continuation',
  });
}
```

## Output Files

When `saveAssessment()` is called:

```
iterations/001/
├── assessment.json      # Full assessment data
├── next-prompt.md       # Generated continuation prompt
└── system-context.md    # System context for injection
```

## Claude Enhancement

For complex situations where pattern matching is insufficient, enable Claude-powered assessment:

```javascript
// Enable in orchestrator config
const config = {
  useClaudeAssessment: true,
  // ...
};

// Or call directly
const enhanced = await assessor.enhanceWithClaude(context, orientation);
```

This spawns a separate Claude session (sonnet model, 2-minute timeout) to provide:
- Enhanced summary
- Additional learnings
- Refined progress estimate
- Suggested approach

## Error Handling

The assessor is designed to be resilient:

- Missing snapshots: Continues with available data
- Parse errors: Returns unenhanced orientation
- Claude enhancement failure: Returns original orientation
- Assessment failure: Generates fallback prompt

## References

- @tools/ralph-external/orchestrator.mjs - Main loop integration
- @tools/ralph-external/snapshot-manager.mjs - Pre/post snapshots
- @tools/ralph-external/checkpoint-manager.mjs - Periodic checkpoints
- @tools/ralph-external/prompt-generator.mjs - Prompt templates
- @.aiwg/requirements/design-ralph-external.md - Design specification
