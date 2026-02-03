# Oversight Layer

**Status**: Implemented (Issue #25)
**Purpose**: Autonomous health monitoring and intervention for long-running Ralph loops

## Overview

The Oversight layer provides autonomous health monitoring and intervention capabilities that prevent pathological loop behaviors without requiring human oversight for every iteration. This is critical for long-running Ralph loops that may execute overnight or in unattended environments.

### Why Oversight Matters

Long-running iterative loops can exhibit problematic patterns that waste resources and produce poor outcomes:

- **Stuck loops**: Repeating the same error 3+ times without progress
- **Oscillation**: Undoing and redoing changes in cycles
- **Objective deviation**: Drifting from the original task goal
- **Resource burn**: Exceeding time/budget constraints without value
- **Quality regression**: Tests passing → failing, coverage dropping

Without oversight, these patterns can persist for many iterations, burning through API budgets and producing no useful output. The Oversight layer detects these patterns early and intervenes autonomously.

### Five Intervention Levels

The Oversight layer responds to detected issues with escalating intervention levels:

| Level | Action | When Used | Example |
|-------|--------|-----------|---------|
| **LOG** | Record observation, continue | Low severity, monitoring only | Minor inefficiency detected |
| **WARN** | Inject warning into next prompt | Medium severity, course correction | Progress slowing down |
| **REDIRECT** | Force strategy change | High severity, current approach failing | Stuck loop detected |
| **PAUSE** | Halt and request human approval | Critical severity, uncertain path | Resource budget approaching limit |
| **ABORT** | Terminate loop, save state | Emergency, unrecoverable issue | Critical test regression |

## Architecture

The Oversight layer consists of four coordinated components:

```
┌─────────────────────────────────────────────────────────────┐
│                         Overseer                            │
│  (Coordinates all oversight activities after each iteration) │
└──────────────┬──────────────────────────────────────────────┘
               │
       ┌───────┴────────┬─────────────┬─────────────┐
       │                │             │             │
┌──────▼──────┐  ┌─────▼────┐  ┌────▼─────┐  ┌────▼──────┐
│  Behavior   │  │Intervention│ │Escalation│  │  Human    │
│  Detector   │  │   System   │ │  Handler │  │ Feedback  │
│             │  │            │ │          │  │           │
│ Analyzes    │  │ Applies    │ │ Alerts   │  │ Approves/ │
│ iteration   │─▶│ corrective │─▶│ humans   │◀─│ Rejects   │
│ history     │  │ actions    │ │ via Gitea│  │           │
└─────────────┘  └────────────┘ └──────────┘  └───────────┘
```

## Component 1: Overseer

**File**: `tools/ralph-external/lib/overseer.mjs`
**Role**: Main coordination hub for all oversight activities

### Purpose

The Overseer orchestrates health checks after each iteration, coordinating behavior detection, intervention application, and human escalation. It maintains an audit trail of all oversight decisions and system health metrics.

### Health Check Protocol

After each iteration, the Overseer executes this protocol:

1. **Add to history** - Store iteration result in history buffer
2. **Detect behaviors** - Run BehaviorDetector analysis
3. **Process interventions** - For each detection, determine and apply intervention
4. **Auto-escalate** - If critical issues detected, notify humans via EscalationHandler
5. **Determine status** - Compute overall health (healthy/warning/critical/paused/aborted)
6. **Create health check** - Record metrics, detections, interventions, status
7. **Persist log** - Write to `.aiwg/ralph-external/overseer/` for audit trail
8. **Callback** - Notify orchestrator of results

### Metrics Monitored

The Overseer tracks these key metrics:

| Metric | Purpose | Threshold Example |
|--------|---------|-------------------|
| **Progress rate** | Completion % per iteration | < 2% avg = stuck |
| **Error patterns** | Repeated failures | Same error 3+ times = critical |
| **Resource usage** | Iterations vs budget | 2x budget = burn |
| **Time elapsed** | Wall-clock duration | Approaching timeout |
| **Quality trajectory** | Tests/coverage trends | Coverage drop >10% = regression |

### Integration with Other Layers

The Overseer integrates with:

- **Orchestrator**: Receives iteration results, returns health check decisions
- **Memory Layer**: Stores learnings about successful interventions
- **Control Layer**: Provides health metrics for PID controller adaptation
- **Gitea Tracker**: Creates issues for critical/emergency escalations

### API

```javascript
import { Overseer } from './lib/overseer.mjs';

// Create overseer
const overseer = new Overseer(loopId, taskDescription, {
  storagePath: '.aiwg/ralph-external/overseer',
  detectorOptions: { /* custom thresholds */ },
  interventionOptions: { /* custom strategies */ },
  escalationOptions: {
    repo: 'owner/repo',
    giteaUrl: 'https://git.integrolabs.net/api/v1'
  },
  autoEscalate: true,
  onHealthCheck: (healthCheck) => {
    console.log(`Health: ${healthCheck.status}`);
  }
});

// After each iteration
const healthCheck = await overseer.check(iterationResult);

if (healthCheck.status === 'paused') {
  // Wait for human approval
  await waitForApproval();
  interventionSystem.resume('Human approved continuation');
}

// Get current health
const health = overseer.getHealth();
console.log(`Status: ${health.status}`);
console.log(`Detections: ${JSON.stringify(health.latestHealthCheck.detections)}`);

// Generate report
const report = overseer.generateReport();
await fs.writeFile('overseer-report.md', report);
```

### Configuration

```javascript
const overseer = new Overseer(loopId, taskDescription, {
  // Storage location
  storagePath: '.aiwg/ralph-external/overseer',

  // Detector thresholds
  detectorOptions: {
    thresholds: {
      stuck: {
        sameErrorCount: 3,      // Same error 3+ times = stuck
        noProgressIterations: 5  // No progress for 5 iters = stuck
      },
      oscillation: {
        undoRedoCycles: 2,       // 2+ undo/redo cycles = oscillation
        fileChurnThreshold: 0.8  // 80% files reverted = oscillation
      },
      deviation: {
        objectiveSimilarity: 0.5, // <50% similarity = deviation
        scopeCreepRatio: 1.5      // 1.5x scope = creep
      },
      resource: {
        costMultiplier: 2.0,       // 2x budget = burn
        iterationMultiplier: 2.0   // 2x iterations = burn
      },
      regression: {
        testPassToFail: true,      // Tests failing = regression
        coverageDropPercent: 10    // 10% coverage drop = regression
      }
    }
  },

  // Auto-escalation
  autoEscalate: true,  // Automatically notify humans for critical issues

  // Callbacks
  onHealthCheck: (healthCheck) => {
    // Called after each health check
  }
});
```

## Component 2: BehaviorDetector

**File**: `tools/ralph-external/lib/behavior-detector.mjs`
**Role**: Pattern detection in iteration history

### Purpose

The BehaviorDetector analyzes iteration history to identify pathological patterns. It implements research-backed detection heuristics that catch common failure modes early.

### Detection Types

#### 1. Stuck Loop Detection

**Pattern**: Same error repeated 3+ times with minimal progress

**Detection Logic**:
- Extract error messages from recent iterations (window: 5)
- Count occurrences of each unique error
- Check if progress rate < 2% per iteration
- Severity: `critical` if 5+ occurrences, `high` if 3+ occurrences

**Evidence Collected**:
```javascript
{
  repeatedError: "TypeError: Cannot read property 'length' of null",
  occurrences: 5,
  avgProgressRate: 0.01,  // 1% per iteration
  recentBlockers: [
    "Missing null check in validateInput()",
    "Unhandled promise rejection",
    // ...
  ]
}
```

**Recommendations**:
- Change approach or strategy
- Break task into smaller sub-tasks
- Request human intervention
- Review and address root cause

#### 2. Oscillation Detection

**Pattern**: Undo/redo cycles - alternating between approaches

**Detection Logic**:
- Track file changes per iteration
- Compare iteration N with N-2 to detect reverts
- Count cycles where >80% of files from N-2 reappear in N
- Trigger: 2+ undo/redo cycles in recent window

**Evidence Collected**:
```javascript
{
  undoRedoCycles: 3,
  recentFileChanges: [
    ['src/auth.ts', 'src/login.ts'],  // Iteration N-2
    ['src/api.ts', 'src/routes.ts'],  // Iteration N-1
    ['src/auth.ts', 'src/login.ts'],  // Iteration N (reverted!)
  ]
}
```

**Recommendations**:
- Commit to one approach instead of alternating
- Review feedback quality - may be conflicting
- Pause and assess which approach is better
- Request human decision on direction

#### 3. Deviation Detection

**Pattern**: Work drifting from original objective

**Detection Logic**:
- Compare recent iteration learnings with original objective
- Use keyword similarity (simple NLP - production should use embeddings)
- Flag iterations with <50% similarity to objective
- Trigger: 2+ recent iterations below threshold

**Evidence Collected**:
```javascript
{
  originalObjective: "Fix authentication tests",
  deviationExamples: [
    {
      iteration: 7,
      similarity: 0.3,  // 30% keyword overlap
      artifacts: ['src/api-docs.md', 'README.md']  // Not auth-related
    }
  ],
  averageSimilarity: 0.35
}
```

**Recommendations**:
- Review original objective and criteria
- Realign current work with stated goals
- Confirm scope with human if uncertain
- Document any necessary scope changes

#### 4. Resource Burn Detection

**Pattern**: Exceeding time/iteration budgets without value

**Detection Logic**:
- Compare actual iterations vs estimated max iterations
- Trigger: >2x estimated iterations used
- Severity escalates at 2.5x multiplier

**Evidence Collected**:
```javascript
{
  estimatedIterations: 10,
  actualIterations: 22,
  iterationRatio: 2.2,  // 220% of budget
  completionPercent: 45,  // Only 45% done
  efficiency: 0.02  // 2% progress per iteration
}
```

**Recommendations**:
- Consider aborting if little progress made (if <50% complete)
- Increase iteration budget if task is viable (if >50% complete)
- Analyze why estimates were incorrect
- Break remaining work into smaller tasks
- Request human decision on continuation

#### 5. Regression Detection

**Pattern**: Quality going backwards (tests failing, coverage dropping)

**Detection Logic**:
- Track test pass/fail status across iterations
- Track code coverage percentage
- Flag: tests passing → failing transitions
- Flag: coverage drops >10%

**Evidence Collected**:
```javascript
{
  regressions: [
    {
      iteration: 8,
      message: 'Tests went from passing to failing'
    },
    {
      iteration: 9,
      message: 'Coverage dropped 12.5%',
      from: 85.0,
      to: 72.5
    }
  ]
}
```

**Recommendations**:
- Stop making changes that break tests
- Fix tests instead of deleting or disabling them
- Review anti-laziness rules (`@.claude/rules/anti-laziness.md`)
- Restore previous working state if needed

### Thresholds Configuration

Thresholds are tunable per detection type:

```javascript
import { BehaviorDetector, THRESHOLDS } from './lib/behavior-detector.mjs';

const detector = new BehaviorDetector({
  thresholds: {
    stuck: {
      sameErrorCount: 3,         // Default: 3
      noProgressIterations: 5    // Default: 5
    },
    oscillation: {
      undoRedoCycles: 2,         // Default: 2
      fileChurnThreshold: 0.8    // Default: 80%
    },
    deviation: {
      objectiveSimilarity: 0.5,  // Default: 50%
      scopeCreepRatio: 1.5       // Default: 1.5x
    },
    resource: {
      costMultiplier: 2.0,       // Default: 2x budget
      iterationMultiplier: 2.0   // Default: 2x iterations
    },
    regression: {
      testPassToFail: true,      // Default: true
      coverageDropPercent: 10    // Default: 10%
    }
  }
});

// Run detection
const detections = detector.detect(iterationHistory);

detections.forEach(det => {
  console.log(`[${det.severity}] ${det.type}: ${det.message}`);
  console.log('Recommendations:', det.recommendations);
});
```

### False Positive Mitigation

The detector uses multiple signals to reduce false positives:

1. **Stuck detection** requires BOTH repeated error AND stalled progress
2. **Oscillation** requires sustained pattern (2+ cycles, not just one revert)
3. **Deviation** requires multiple recent iterations, not just one outlier
4. **Resource burn** considers completion percentage (don't abort if 90% done)
5. **Regression** tracks trends, not single-iteration anomalies

## Component 3: InterventionSystem

**File**: `tools/ralph-external/lib/intervention-system.mjs`
**Role**: Automated response to detected issues

### Purpose

The InterventionSystem receives detections from the BehaviorDetector and applies appropriate interventions based on severity. It maintains pause state and generates actionable feedback for the next iteration.

### Intervention Level Mapping

The system maps detection severity to intervention levels:

```javascript
// Severity → Intervention mapping
switch (detection.severity) {
  case 'critical':
    // Critical = PAUSE or ABORT depending on type
    if (type === 'resource_burn' || type === 'regression') {
      return 'abort';  // Unrecoverable
    }
    return 'pause';    // Needs human decision

  case 'high':
    // High = REDIRECT or WARN depending on type
    if (type === 'stuck' || type === 'oscillation') {
      return 'redirect';  // Force strategy change
    }
    return 'warn';        // Strong warning

  case 'medium':
    return 'warn';        // Inject warning

  case 'low':
  default:
    return 'log';         // Monitor only
}
```

### Intervention Actions

#### LOG Level

**Action**: Record observation, continue execution

```javascript
{
  level: 'log',
  reason: 'Minor inefficiency detected',
  detection: { /* ... */ },
  timestamp: '2026-02-03T10:00:00Z',
  action: 'Logged detection for monitoring'
}
```

**Use case**: Low-severity observations that don't require intervention but should be tracked for pattern analysis.

#### WARN Level

**Action**: Inject warning into next prompt

The system generates a warning message that includes:
- Detection type and severity
- Specific recommendations
- Type-specific guidance

```javascript
const warning = `⚠️ OVERSEER WARNING: Loop stuck: Same error repeated 5 times

Recommended actions:
1. Change approach or strategy
2. Break task into smaller sub-tasks
3. Request human intervention

You are making the same error repeatedly. Stop and try a different approach.`;

// Warning is prepended to next iteration's prompt
const modifiedPrompt = interventionSystem.injectWarning(originalPrompt, warning);
```

**Use case**: Medium-severity issues where course correction is needed but autonomous recovery is still possible.

#### REDIRECT Level

**Action**: Force strategy change with explicit override

The system generates a strategy override directive that replaces the current approach:

```javascript
// For stuck detection
strategyOverride = `OVERRIDE: Change approach immediately.
The current method is not working. You have hit "Missing null check" 5 times.
Try a completely different solution strategy.`;

// For oscillation
strategyOverride = `OVERRIDE: Stop alternating between approaches.
Analyze which approach is better and commit to it.
No more back-and-forth changes.`;

// For deviation
strategyOverride = `OVERRIDE: Return to original objective.
Original objective: "Fix authentication tests".
All work must align with this goal.`;
```

**Use case**: High-severity issues where the current approach is clearly failing and a hard pivot is required.

#### PAUSE Level

**Action**: Halt execution, require human approval to continue

```javascript
{
  level: 'pause',
  reason: 'Resource budget approaching limit',
  requiresApproval: true,
  detection: { /* ... */ }
}

// System updates state
interventionSystem.isPaused = true;
interventionSystem.pauseReason = detection.message;

// Callback fires
onPause(intervention);

// Console output
╔═══════════════════════════════════════════════════════════╗
║                 OVERSEER: LOOP PAUSED                     ║
║  Reason: Resource budget approaching limit                ║
╚═══════════════════════════════════════════════════════════╝
```

**Resume from pause**:
```javascript
interventionSystem.resume('Human approved continuation after budget increase');
```

**Use case**: Critical issues where human judgment is required before proceeding.

#### ABORT Level

**Action**: Terminate loop, save state for forensics

```javascript
{
  level: 'abort',
  reason: 'Critical test regression - tests passing → failing',
  requiresApproval: true,
  abortReason: detection.message,
  detection: { /* ... */ }
}

// Callback fires
onAbort(intervention);

// Console output
╔═══════════════════════════════════════════════════════════╗
║                 OVERSEER: LOOP ABORTED                    ║
║  Reason: Critical test regression                         ║
╚═══════════════════════════════════════════════════════════╝
```

**Use case**: Emergency situations where continuing would cause damage (e.g., cascading test failures, uncontrolled resource burn).

### Escalation Paths

The InterventionSystem escalates to humans when:

1. **Automatic**: Any PAUSE or ABORT intervention (if `autoEscalate: true`)
2. **Conditional**: REDIRECT interventions with critical severity
3. **Never**: LOG and WARN interventions (stay autonomous)

### API

```javascript
import { InterventionSystem } from './lib/intervention-system.mjs';

const interventionSystem = new InterventionSystem({
  onIntervention: (intervention) => {
    console.log(`Applied ${intervention.level}: ${intervention.reason}`);
  },
  onPause: (intervention) => {
    console.log('Loop paused, waiting for approval...');
  },
  onAbort: (intervention) => {
    console.log('Loop aborted, saving state...');
  }
});

// Apply intervention based on detection
const intervention = interventionSystem.intervene(detection);

// Check pause status
const { isPaused, reason } = interventionSystem.getPauseStatus();

if (isPaused) {
  // Wait for human approval
  const approved = await promptHumanForApproval(reason);

  if (approved) {
    interventionSystem.resume('Human approved continuation');
  } else {
    // Abort the loop
  }
}

// Get intervention summary
const summary = interventionSystem.getSummary();
console.log(`Total interventions: ${summary.total}`);
console.log(`By level:`, summary.byLevel);
console.log(`By type:`, summary.byType);
```

## Component 4: EscalationHandler

**File**: `tools/ralph-external/lib/escalation-handler.mjs`
**Role**: Human notification via multiple channels

### Purpose

The EscalationHandler manages human escalation when autonomous intervention is insufficient. It supports multiple notification channels with graceful degradation.

### Escalation Channels

#### 1. Desktop Notifications

**Platform**: Linux (notify-send), graceful fallback if unavailable

```javascript
// Sends desktop notification
sendDesktopNotification(level, context);

// Urgency mapping
urgency = {
  'info': 'low',
  'warning': 'normal',
  'critical': 'critical',
  'emergency': 'critical'
}

// Example notification
// Title: Ralph Overseer: CRITICAL
// Message: Loop stuck: Same error repeated 5 times
//          Loop: ralph-ext-001
//          Iteration: 7
```

**Features**:
- Non-blocking (failures don't halt execution)
- Urgency-based prioritization
- Includes loop ID and iteration number

#### 2. Gitea Issue Creation

**Trigger**: CRITICAL and EMERGENCY escalations

Creates a Gitea issue with full context:

```markdown
## Ralph Loop Overseer Alert

**Loop ID:** ralph-ext-001
**Task:** Fix authentication tests
**Iteration:** 7
**Timestamp:** 2026-02-03T10:00:00Z

### Issue

Loop stuck: Same error repeated 5 times with minimal progress

### Detection

- **Type:** stuck
- **Severity:** critical
- **Message:** Loop stuck: Same error repeated 5 times

**Evidence:**
```json
{
  "repeatedError": "Missing null check in validateInput()",
  "occurrences": 5,
  "avgProgressRate": 0.01
}
```

**Recommendations:**
1. Change approach or strategy
2. Break task into smaller sub-tasks
3. Request human intervention

### Intervention

- **Level:** pause
- **Reason:** Loop stuck - requires human decision

### Actions Required

- [ ] Review loop state and iteration history
- [ ] Determine if loop should continue or abort
- [ ] Provide guidance on how to proceed

---
*Automated escalation from Ralph External Loop Overseer*
```

**Labels applied**: `ralph-overseer`, `critical`, `automated`

**Configuration**:
```javascript
const escalationHandler = new EscalationHandler({
  giteaTokenPath: '~/.config/gitea/token',
  giteaUrl: 'https://git.integrolabs.net/api/v1',
  repo: 'owner/repo'
});
```

#### 3. Webhook Support

**Optional**: For integration with external systems

```javascript
const escalationHandler = new EscalationHandler({
  webhookUrl: 'https://example.com/webhook/ralph-alerts'
});

// Sends JSON payload
{
  "level": "critical",
  "context": {
    "loopId": "ralph-ext-001",
    "taskDescription": "Fix auth tests",
    "iterationNumber": 7,
    "reason": "Loop stuck",
    "detection": { /* ... */ },
    "intervention": { /* ... */ }
  },
  "timestamp": "2026-02-03T10:00:00Z"
}
```

**Use cases**:
- Slack/Discord notifications
- PagerDuty integration
- Custom monitoring dashboards

### Escalation Levels

```javascript
export const ESCALATION_LEVELS = {
  INFO: 'info',         // Informational, no action required
  WARNING: 'warning',   // Attention needed
  CRITICAL: 'critical', // Immediate review required
  EMERGENCY: 'emergency' // Urgent intervention required
};
```

**Mapping from intervention levels**:

| Intervention | Escalation | Channels |
|-------------|------------|----------|
| LOG | INFO | Desktop only |
| WARN | WARNING | Desktop only |
| REDIRECT (high) | WARNING | Desktop only |
| REDIRECT (critical) | CRITICAL | Desktop + Gitea |
| PAUSE | CRITICAL | Desktop + Gitea |
| ABORT | EMERGENCY | Desktop + Gitea + Webhook |

### API

```javascript
import { EscalationHandler, ESCALATION_LEVELS } from './lib/escalation-handler.mjs';

const escalationHandler = new EscalationHandler({
  giteaTokenPath: '~/.config/gitea/token',
  giteaUrl: 'https://git.integrolabs.net/api/v1',
  repo: 'roctinam/ai-writing-guide',
  webhookUrl: 'https://example.com/webhook',  // Optional
  enableNotifications: true
});

// Escalate to human
const escalation = await escalationHandler.escalate(
  ESCALATION_LEVELS.CRITICAL,
  {
    loopId: 'ralph-ext-001',
    taskDescription: 'Fix authentication tests',
    iterationNumber: 7,
    level: 'critical',
    reason: 'Loop stuck: Same error repeated 5 times',
    detection: { /* ... */ },
    intervention: { /* ... */ }
  }
);

// Check what channels were used
console.log('Escalation channels:', escalation.channels);
// ['desktop_notification', 'gitea_issue']

// If Gitea issue was created
if (escalation.issueNumber) {
  console.log(`Issue created: ${escalation.issueUrl}`);
}

// Get escalation log
const log = escalationHandler.getLog();
const summary = escalationHandler.getSummary();
```

## Usage Examples

### Example 1: Stuck Loop Caught and Redirected

```javascript
// Iteration 5 completes with same error as iterations 2, 3, 4
const iteration5 = {
  number: 5,
  status: 'failed',
  analysis: {
    failureClass: 'Missing null check in validateInput()',
    blockers: ['Unhandled null pointer'],
    completionPercentage: 12,  // Minimal progress
    artifactsModified: ['src/validation.ts']
  }
};

// Overseer runs health check
const healthCheck = await overseer.check(iteration5);

// BehaviorDetector finds stuck pattern
healthCheck.detections = [
  {
    type: 'stuck',
    severity: 'high',
    message: 'Loop stuck: Same error repeated 5 times with minimal progress',
    evidence: {
      repeatedError: 'Missing null check in validateInput()',
      occurrences: 5,
      avgProgressRate: 0.01
    },
    recommendations: [
      'Change approach or strategy',
      'Break task into smaller sub-tasks'
    ]
  }
];

// InterventionSystem applies REDIRECT
healthCheck.interventions = [
  {
    level: 'redirect',
    reason: 'Loop stuck - forcing strategy change',
    strategyOverride: `OVERRIDE: Change approach immediately.
      The current method is not working. You have hit "Missing null check" 5 times.
      Try a completely different solution strategy.`
  }
];

// Next iteration receives modified prompt with override
// Agent is forced to try a different approach
```

**Result**: Loop recovers by iteration 6 with new strategy, avoiding wasted iterations.

### Example 2: Resource Burn Triggers Pause

```javascript
// Iteration 22 of a loop estimated at 10 iterations
const iteration22 = {
  number: 22,
  context: { maxIterations: 10 },
  analysis: {
    completionPercentage: 45  // Only 45% done after 220% budget
  }
};

const healthCheck = await overseer.check(iteration22);

// BehaviorDetector finds resource burn
healthCheck.detections = [
  {
    type: 'resource_burn',
    severity: 'critical',
    message: 'Resource burn: Used 22/10 iterations (220% of budget)',
    evidence: {
      estimatedIterations: 10,
      actualIterations: 22,
      iterationRatio: 2.2,
      completionPercent: 45,
      efficiency: 0.02
    },
    recommendations: [
      'Consider aborting if little progress made',
      'Request human decision on continuation'
    ]
  }
];

// InterventionSystem triggers PAUSE
healthCheck.interventions = [
  {
    level: 'pause',
    reason: 'Resource budget exceeded - human decision required',
    requiresApproval: true
  }
];

// Overseer auto-escalates to human
await overseer.escalate(intervention, iteration22);

// Desktop notification sent
// Gitea issue created
// Loop paused, waiting for approval

╔═══════════════════════════════════════════════════════════╗
║                 OVERSEER: LOOP PAUSED                     ║
║  Reason: Resource budget exceeded                         ║
╚═══════════════════════════════════════════════════════════╝

// Human reviews Gitea issue, decides to increase budget and resume
interventionSystem.resume('Human approved: Budget increased to 30 iterations');
```

**Result**: Human prevents uncontrolled resource burn, adjusts budget, loop continues productively.

### Example 3: Test Regression Aborts Loop

```javascript
// Iteration 8: Tests were passing in iteration 7, now failing
const iteration8 = {
  number: 8,
  analysis: {
    testsPassing: false,  // Was true in iteration 7
    coveragePercent: 72.5,  // Was 85.0 in iteration 7
    artifactsModified: ['src/auth.ts']
  }
};

const healthCheck = await overseer.check(iteration8);

// BehaviorDetector finds regression
healthCheck.detections = [
  {
    type: 'regression',
    severity: 'critical',
    message: 'Regression detected: 2 quality regressions',
    evidence: {
      regressions: [
        {
          iteration: 8,
          message: 'Tests went from passing to failing'
        },
        {
          iteration: 8,
          message: 'Coverage dropped 12.5%',
          from: 85.0,
          to: 72.5
        }
      ]
    },
    recommendations: [
      'Stop making changes that break tests',
      'Fix tests instead of deleting or disabling them',
      'Review anti-laziness rules'
    ]
  }
];

// InterventionSystem triggers ABORT
healthCheck.interventions = [
  {
    level: 'abort',
    reason: 'Critical test regression - aborting to prevent further damage',
    abortReason: 'Tests passing → failing, coverage dropped 12.5%',
    requiresApproval: true
  }
];

// Overseer escalates as EMERGENCY
await overseer.escalate(intervention, iteration8);

// Desktop notification (critical urgency)
// Gitea issue created with label 'emergency'
// Webhook triggered
// Loop aborted

╔═══════════════════════════════════════════════════════════╗
║                 OVERSEER: LOOP ABORTED                    ║
║  Reason: Critical test regression                         ║
╚═══════════════════════════════════════════════════════════╝

// State saved to .aiwg/ralph-external/ for forensics
```

**Result**: Loop terminated before further damage, full context preserved for human investigation and recovery.

## Tuning the Oversight Layer

### Balancing Sensitivity vs False Positives

The Oversight layer uses conservative defaults to minimize false positives while catching genuine issues. Tuning depends on your project:

#### High-Stakes Projects (e.g., security, compliance)

**Increase sensitivity** - catch issues earlier, accept some false positives:

```javascript
const overseer = new Overseer(loopId, taskDescription, {
  detectorOptions: {
    thresholds: {
      stuck: {
        sameErrorCount: 2,      // Trigger after 2 occurrences (vs 3)
        noProgressIterations: 3  // Shorter window (vs 5)
      },
      resource: {
        costMultiplier: 1.5,     // Trigger at 150% budget (vs 200%)
        iterationMultiplier: 1.5
      },
      regression: {
        coverageDropPercent: 5   // Stricter (vs 10%)
      }
    }
  },
  autoEscalate: true  // Escalate all critical issues immediately
});
```

**Trade-off**: More human interventions, but earlier detection of problems.

#### Experimental/Exploratory Projects

**Decrease sensitivity** - allow more autonomy, reduce interruptions:

```javascript
const overseer = new Overseer(loopId, taskDescription, {
  detectorOptions: {
    thresholds: {
      stuck: {
        sameErrorCount: 5,       // More tolerant (vs 3)
        noProgressIterations: 8  // Longer window (vs 5)
      },
      resource: {
        costMultiplier: 3.0,     // Trigger at 300% budget (vs 200%)
        iterationMultiplier: 3.0
      },
      deviation: {
        objectiveSimilarity: 0.3  // Allow more exploration (vs 0.5)
      }
    }
  },
  autoEscalate: false  // Only escalate on explicit abort
});
```

**Trade-off**: More wasted iterations possible, but fewer interruptions to flow.

#### Production Continuous Integration

**Strict thresholds** - fail fast, preserve clean state:

```javascript
const overseer = new Overseer(loopId, taskDescription, {
  detectorOptions: {
    thresholds: {
      stuck: {
        sameErrorCount: 3,
        noProgressIterations: 3  // Fail faster in CI
      },
      regression: {
        testPassToFail: true,
        coverageDropPercent: 1   // Any coverage drop = abort
      }
    }
  },
  autoEscalate: true,
  interventionOptions: {
    // Abort immediately on regression
    onIntervention: (intervention) => {
      if (intervention.detection?.type === 'regression') {
        intervention.level = 'abort';
      }
    }
  }
});
```

**Trade-off**: Aggressive termination, but protects main branch quality.

### When to Use Stricter Thresholds

Use tighter thresholds when:

1. **High cost of errors** - Security vulnerabilities, data loss risks
2. **Limited budget** - API costs matter, iteration count capped
3. **Unattended execution** - Running overnight, need early termination
4. **CI/CD pipelines** - Must preserve clean state
5. **Regulated environments** - Compliance requires audit trails

Use looser thresholds when:

1. **Exploratory work** - Research, prototyping, learning
2. **Complex tasks** - Expected to require many iterations
3. **High tolerance for waste** - Cost isn't a primary concern
4. **Human monitoring** - Someone watching and can intervene manually
5. **Iterative refinement** - Quality expected to fluctuate during development

### Monitoring Overseer Effectiveness

Track these metrics to tune thresholds:

```javascript
// Generate report after loop completes
const report = overseer.generateReport();

// Key metrics to review:
// - Detection counts by type
// - Intervention counts by level
// - False positive rate (interventions that weren't helpful)
// - True positive rate (interventions that prevented waste)
```

**Tuning indicators**:

| Observation | Likely Issue | Adjustment |
|------------|--------------|------------|
| Many LOG detections, no higher levels | Thresholds too loose | Tighten slightly |
| Frequent PAUSE/ABORT, loops often successful | Thresholds too tight | Loosen slightly |
| Stuck detections but oscillation missed | Oscillation threshold too high | Lower file churn threshold |
| Resource burn detected too late | Cost multiplier too high | Lower multiplier |
| False regressions (coverage drops briefly then recovers) | Single-iteration sensitivity too high | Require sustained trend |

## References

- **Implementation**: Issue #25 - Autonomous Overseer
- **Research**: `@.claude/rules/anti-laziness.md` - Avoidance pattern detection
- **Integration**: `@.claude/rules/hitl-patterns.md` - Human-in-the-loop gates
- **Architecture**: `.aiwg/architecture/ralph-external-architecture.md` - Overall system design

## See Also

- `README-memory.md` - Memory Layer (feeds learning to Overseer)
- `README-intelligence.md` - Intelligence Layer (receives intervention feedback)
- `README-control.md` - Control Layer (uses health metrics for adaptation)
- `docs/ralph-external-security.md` - Security considerations for oversight

---

*Generated documentation for Ralph External Loop Oversight Layer - autonomous health monitoring and intervention for long-running iterative tasks.*
