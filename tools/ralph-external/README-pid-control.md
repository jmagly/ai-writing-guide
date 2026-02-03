# PID Control Layer Documentation

## Overview

The PID Control layer provides adaptive loop management for External Ralph through a control theory-inspired feedback system. It continuously monitors loop progress and dynamically adjusts execution parameters to optimize convergence, prevent stuck states, and maintain system stability.

### Why PID Control for Ralph Loops?

Traditional software loops execute with fixed parameters regardless of runtime conditions. The PID Control layer brings adaptive intelligence by:

- **Responding to current error** (Proportional) - How far from completion
- **Accounting for persistent issues** (Integral) - Accumulated learnings and repeated blockers
- **Predicting future trends** (Derivative) - Rate of progress change

This creates loops that self-correct, adapt to task complexity, and avoid common failure modes like oscillation and stagnation.

### Control Theory Basics

A PID controller calculates a control output using three components:

```
control_output = Kp * P + Ki * I + Kd * D

Where:
  P = Proportional error (current completion gap)
  I = Integral accumulation (persistent issues over time)
  D = Derivative rate (velocity of progress)

  Kp, Ki, Kd = Gain coefficients (tunable weights)
```

Each component addresses different temporal aspects:

| Component | Time Focus | Purpose | Ralph Mapping |
|-----------|------------|---------|---------------|
| **Proportional** | Present | React to current error | Completion gap (1 - progress) |
| **Integral** | Past | Correct persistent offset | Accumulated learnings, repeated blockers |
| **Derivative** | Future | Dampen oscillation | Rate of progress change (velocity) |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     PIDController                        │
│  Integrates all components and provides control         │
│  decisions for orchestrator                              │
└────┬──────────────────────────────────────────────┬─────┘
     │                                               │
     ├──────────────┬──────────────┬────────────────┤
     │              │              │                │
┌────▼──────┐ ┌────▼──────┐ ┌────▼────────┐ ┌─────▼──────┐
│ Metrics   │ │   Gain    │ │  Control    │ │  Process   │
│ Collector │ │ Scheduler │ │   Alarms    │ │ Monitor    │
└───────────┘ └───────────┘ └─────────────┘ └────────────┘

Flow:
1. MetricsCollector extracts P/I/D from iteration data
2. GainScheduler adapts Kp/Ki/Kd based on task/phase
3. PIDController computes control signal
4. ControlAlarms detect pathological behaviors
5. Control decision affects next iteration
```

## Component 1: PIDController

**Purpose**: Core control logic that integrates metrics collection, gain scheduling, and alarm monitoring to provide intelligent control decisions.

### Initialization

```javascript
import { PIDController } from './pid-controller.mjs';

const controller = new PIDController({
  windowSize: 5,              // Metrics moving window
  integralDecay: 0.9,         // Integral decay factor
  noiseThreshold: 0.05,       // Deadband for noise filtering
  adaptiveGains: true,        // Enable gain scheduling
  autoIntervene: false,       // Auto-apply interventions
  thresholds: {},             // Custom alarm thresholds
  initialProfile: 'standard', // Initial gain profile
});

// Initialize for a specific task
controller.initialize({
  objective: 'Fix authentication bug',
  completionCriteria: 'Tests pass',
  maxIterations: 10,
  estimatedComplexity: 7,      // 1-10 scale
  securitySensitive: true,
  breakingChanges: false,
});
```

### Processing Iterations

```javascript
// After each iteration
const decision = controller.process(iteration, state);

console.log(decision);
// {
//   action: 'continue' | 'adjust' | 'pause' | 'abort',
//   controlSignal: 0.45,
//   urgency: 'normal' | 'elevated' | 'high' | 'critical',
//   recommendations: {
//     adjustBudget: false,
//     changeStrategy: false,
//     escalate: false,
//     message: 'Task on track...'
//   },
//   alarmSummary: {
//     activeCount: 1,
//     bySeverity: { warning: 1, ... }
//   },
//   metrics: {
//     proportional: 0.3,
//     integral: 0.5,
//     derivative: -0.05,
//     trend: 'improving',
//     velocity: 0.08
//   },
//   gains: { kp: 0.5, ki: 0.15, kd: 0.25 }
// }
```

### Control Decisions

| Action | Meaning | Trigger |
|--------|---------|---------|
| `continue` | Proceed normally | No critical alarms, progressing |
| `adjust` | Modify approach | Warning alarms, slow progress |
| `pause` | Request human review | Critical alarms, high iteration usage |
| `abort` | Stop immediately | Emergency alarms, unrecoverable state |

### Prompt Adjustments

Get context to inject into Claude prompts:

```javascript
const adjustments = controller.getPromptAdjustments();

console.log(adjustments);
// {
//   adjustments: [
//     'Focus on completing the most critical remaining work',
//     'Address recurring issues: null check failures'
//   ],
//   context: 'Urgency level: high. Issues appearing multiple times: 3',
//   metrics: { ... },
//   gains: { ... }
// }
```

### State Persistence

```javascript
// Export state for crash recovery
const state = controller.exportState();
saveToFile('.aiwg/ralph/pid-state.json', state);

// Restore from saved state
const savedState = loadFromFile('.aiwg/ralph/pid-state.json');
controller.importState(savedState);
```

## Component 2: MetricsCollector

**Purpose**: Extracts Proportional, Integral, and Derivative metrics from Ralph loop iteration data.

### Metric Definitions

#### Proportional (P): Current Error

Represents the **completion gap** at this moment:

```javascript
P = (1.0 - completionPercentage) + qualityPenalty + errorPenalty

where:
  qualityPenalty = (1.0 - qualityScore) * 0.2
  errorPenalty = min(errorCount * 0.05, 0.3)
```

**Range**: 0.0 (complete) to 1.0+ (no progress, with quality/error penalties)

#### Integral (I): Accumulated Error

Represents **persistent issues** over time:

```javascript
I_new = I_old * decayFactor + P + repeatedBlockerPenalty - learningsCredit

where:
  decayFactor = 0.9 (prevents windup)
  repeatedBlockerPenalty = 0.1 * occurrenceCount
  learningsCredit = learningsCount * 0.05
```

**Range**: -1.0 (many learnings) to 5.0 (max windup limit)

#### Derivative (D): Rate of Change

Represents **velocity** of progress:

```javascript
D = weightedAverage(recentErrorChanges)

where recent changes are weighted:
  - More recent = higher weight
  - Window size = 5 iterations (default)
```

**Range**: -1.0 (rapid improvement) to +1.0 (rapid regression)

### Usage

```javascript
import { MetricsCollector } from './metrics-collector.mjs';

const collector = new MetricsCollector({
  windowSize: 5,          // Derivative window
  integralDecay: 0.9,     // Anti-windup decay
  noiseThreshold: 0.05,   // Ignore changes < 5%
});

// Extract metrics from iteration
const pidMetrics = collector.collect(iteration);

console.log(pidMetrics);
// {
//   proportional: 0.45,
//   integral: 1.2,
//   derivative: -0.08,
//   timestamp: 1706198400000,
//   iterationNumber: 3,
//   raw: {
//     completionPercentage: 0.55,
//     qualityScore: 0.8,
//     errorCount: 2,
//     testsPassing: 8,
//     testsFailing: 2,
//     learnings: ['Fixed auth token expiry'],
//     blockers: ['Database connection timeout']
//   }
// }
```

### Metric Formulas

**Proportional Calculation**:
```javascript
calculateProportional(metrics) {
  const completionGap = 1.0 - metrics.completionPercentage;
  const qualityPenalty = (1.0 - metrics.qualityScore) * 0.2;
  const errorPenalty = Math.min(metrics.errorCount * 0.05, 0.3);

  const rawP = completionGap + qualityPenalty + errorPenalty;
  return applyDeadband(Math.min(rawP, 1.0));
}
```

**Integral Calculation**:
```javascript
calculateIntegral(metrics, proportional) {
  // Decay previous value
  integralAccumulator *= 0.9;

  // Add current error
  integralAccumulator += proportional;

  // Add repeated blocker penalty
  for (const blocker of metrics.blockers) {
    const count = issueFrequency.get(blocker) || 0;
    if (count > 1) {
      integralAccumulator += 0.1 * count;
    }
  }

  // Subtract learnings credit
  const learningsCredit = metrics.learnings.length * 0.05;

  return applyAntiWindup(integralAccumulator - learningsCredit);
}
```

**Derivative Calculation**:
```javascript
calculateDerivative(metrics, proportional) {
  const recent = history.slice(-windowSize);

  let sumWeightedChange = 0;
  let sumWeights = 0;

  for (let i = 1; i < recent.length; i++) {
    const weight = i / recent.length;
    const change = recent[i].proportional - recent[i-1].proportional;
    sumWeightedChange += change * weight;
    sumWeights += weight;
  }

  const derivative = sumWeightedChange / sumWeights;
  return applyDeadband(derivative);
}
```

### Noise Filtering

Deadband filter ignores small changes:

```javascript
applyDeadband(value) {
  if (Math.abs(value) < noiseThreshold) {
    return 0;
  }
  return value;
}
```

### Anti-Windup

Bounds prevent integral saturation:

```javascript
applyAntiWindup(integral) {
  const maxIntegral = 5.0;
  const minIntegral = -1.0;
  return Math.max(minIntegral, Math.min(integral, maxIntegral));
}
```

### Trend Analysis

```javascript
const trend = collector.getTrend();

console.log(trend);
// {
//   trend: 'improving' | 'stable' | 'regressing' | 'oscillating',
//   velocity: 0.08,
//   iterationsAnalyzed: 5,
//   repeatedIssues: [
//     { issue: 'null check failure', count: 3 },
//     { issue: 'timeout', count: 2 }
//   ]
// }
```

## Component 3: GainScheduler

**Purpose**: Adaptive gain tuning based on task complexity, loop phase, and observed behavior patterns.

### Gain Profiles

Five predefined profiles optimized for different scenarios:

| Profile | Kp | Ki | Kd | When to Use |
|---------|----|----|----|----|
| **Conservative** | 0.3 | 0.05 | 0.4 | High-risk, security-sensitive, breaking changes |
| **Standard** | 0.5 | 0.15 | 0.25 | Typical development tasks (default) |
| **Aggressive** | 0.8 | 0.25 | 0.1 | Simple tasks (docs, config, minor fixes) |
| **Recovery** | 1.0 | 0.4 | -0.1 | Stuck or regressing (escape local minimum) |
| **Cautious** | 0.2 | 0.02 | 0.5 | Near completion (fine-tuning phase) |

**Profile Characteristics**:

- **Conservative**: High damping (Kd=0.4), low response → Stable but slow
- **Standard**: Balanced → Most tasks
- **Aggressive**: Low damping (Kd=0.1), high response → Fast but riskier
- **Recovery**: Negative Kd → Accelerate change when stuck
- **Cautious**: Very high damping (Kd=0.5) → Precise landing

### Usage

```javascript
import { GainScheduler, GAIN_PROFILES } from './gain-scheduler.mjs';

const scheduler = new GainScheduler({
  initialProfile: GAIN_PROFILES.standard,
  adaptiveEnabled: true,
  transitionSmoothing: 0.3,
});

// Assess task complexity
scheduler.assessTaskComplexity({
  estimatedIterations: 8,
  filesAffected: 15,
  hasTests: true,
  securitySensitive: true,
  breakingChanges: false,
  domainComplexity: 'high',
});
```

### Adaptive Gain Updates

Gains automatically adjust based on system state:

```javascript
const gains = scheduler.update({
  proportional: 0.45,
  integral: 1.2,
  derivative: -0.08,
  trend: 'improving',
  iterationNumber: 5,
  maxIterations: 10,
});

console.log(gains);
// {
//   name: 'cautious',
//   kp: 0.2,
//   ki: 0.02,
//   kd: 0.5,
//   description: 'Near completion: fine-tuning phase'
// }
```

### Transition Conditions

| Condition | New Profile | Reason |
|-----------|-------------|--------|
| Stuck (P > 0.7, \|D\| < 0.02, iter > 3) | Recovery | Escape stagnation |
| Near completion (P < 0.15, progress > 50%) | Cautious | Precision landing |
| Oscillating (alternating improvements/regressions) | Damped | Reduce oscillation |
| Regressing (D > 0.1) | Conservative | Stabilize |
| Integral windup (I > 3.0) | Recovery | Break through blockers |

### Smooth Transitions

Profiles transition gradually to avoid discontinuities:

```javascript
smoothTransition(current, target) {
  const alpha = 0.3; // Smoothing factor

  return {
    kp: current.kp + alpha * (target.kp - current.kp),
    ki: current.ki + alpha * (target.ki - current.ki),
    kd: current.kd + alpha * (target.kd - current.kd),
  };
}
```

### Control Output Calculation

```javascript
const controlOutput = scheduler.calculateControlOutput({
  proportional: 0.45,
  integral: 1.2,
  derivative: -0.08,
});

console.log(controlOutput);
// {
//   controlSignal: 0.53,
//   pTerm: 0.225,      // 0.5 * 0.45
//   iTerm: 0.18,       // 0.15 * 1.2
//   dTerm: -0.02,      // 0.25 * -0.08
//   recommendations: {
//     urgency: 'elevated',
//     adjustBudget: true,
//     changeStrategy: false,
//     escalate: false,
//     message: 'Task behind schedule - may need more resources'
//   }
// }
```

### Interpretation

Control signal influences urgency and recommendations:

| Control Signal | Urgency | Meaning |
|----------------|---------|---------|
| > 0.8 | Critical | Significantly behind, strategy change needed |
| 0.5 - 0.8 | High | Behind schedule, may need more resources |
| 0.3 - 0.5 | Elevated | Progressing slowly, monitor closely |
| < 0.3 | Normal/Low | On track or completing |

## Component 4: ControlAlarms

**Purpose**: Detect pathological loop behaviors and trigger appropriate interventions.

### Alarm Types

| Alarm | Trigger | Severity | Intervention |
|-------|---------|----------|--------------|
| **Stuck Loop** | No progress for N iterations | Warning/Critical | Change approach, request human |
| **Oscillation** | Alternating improvement/regression | Warning | Increase damping (Kd) |
| **Regression** | Consistent negative progress | Warning/Critical | Revert changes, switch to recovery |
| **Resource Burn** | High iteration usage | Critical/Emergency | Increase budget or abort |
| **Quality Degradation** | Declining quality scores | Warning/Critical | Review changes, focus on quality |
| **Integral Windup** | Excessive accumulation | Warning | Address persistent blockers |
| **Derivative Spike** | Sudden velocity change | Info/Warning | Investigate cause |

### Usage

```javascript
import { ControlAlarms, DEFAULT_THRESHOLDS } from './control-alarms.mjs';

const alarms = new ControlAlarms({
  thresholds: {
    stuckIterations: 3,
    oscillationCount: 2,
    regressionRate: 0.1,
    maxIterationsPercent: 0.8,
    qualityDropThreshold: 0.15,
    integralWindupLimit: 4.0,
    derivativeSpike: 0.2,
    minProgressRate: 0.02,
  },
  onAlarm: (alarm) => {
    console.log(`[ALARM] ${alarm.severity}: ${alarm.message}`);
  },
  autoIntervene: false,
});

// Check for alarms
const newAlarms = alarms.check(metrics, systemState);

if (newAlarms.length > 0) {
  console.log(`Raised ${newAlarms.length} new alarms`);
}
```

### Alarm Object

```javascript
{
  id: 'alarm-42-1706198400000',
  type: 'stuck_loop',
  severity: 'critical',
  message: 'Loop stuck for 3 iterations with error=0.65',
  timestamp: 1706198400000,
  context: {
    iterationsStuck: 3,
    errorLevel: 0.65,
    errorChange: 0.02
  },
  acknowledged: false,
  interventions: [
    'Change approach or strategy',
    'Break task into smaller sub-tasks',
    'Request human guidance',
    'Increase iteration budget'
  ]
}
```

### Severity Levels

| Severity | Impact | Action Required |
|----------|--------|-----------------|
| `info` | Informational | Monitor |
| `warning` | Suboptimal behavior | Adjust approach |
| `critical` | Serious issue | Human review recommended |
| `emergency` | Unrecoverable | Immediate abort |

### Intervention Levels

```javascript
import { INTERVENTION_LEVELS } from './control-alarms.mjs';

const level = alarms.suggestIntervention(alarm);

// INTERVENTION_LEVELS:
// - NONE: No intervention
// - ADJUST: Adjust parameters
// - NUDGE: Suggest new approach
// - PAUSE: Request human review
// - ABORT: Stop immediately
```

### Alarm Management

```javascript
// Get all active alarms
const active = alarms.getActiveAlarms();

// Get highest severity
const highest = alarms.getHighestSeverityAlarm();

// Acknowledge an alarm
alarms.acknowledgeAlarm('alarm-42-1706198400000');

// Clear specific alarm type
alarms.clearAlarm('stuck_loop');

// Clear all alarms
alarms.clearAllAlarms();

// Get summary
const summary = alarms.getSummary();
// {
//   activeCount: 2,
//   bySeverity: {
//     emergency: 0,
//     critical: 1,
//     warning: 1,
//     info: 0
//   },
//   types: ['stuck_loop', 'quality_degradation'],
//   highestSeverity: 'critical',
//   totalHistorical: 15
// }
```

### Pattern Detection

**Stuck Loop Detection**:
```javascript
// Triggers when:
// - Error hasn't changed significantly for N iterations
// - Derivative near zero (no velocity)
// Severity: Warning if error < 0.5, Critical if error > 0.5
```

**Oscillation Detection**:
```javascript
// Triggers when:
// - Direction changes N times in recent window
// - Each change magnitude > threshold
// Severity: Warning (always)
```

**Regression Detection**:
```javascript
// Triggers when:
// - Derivative > regressionRate (error increasing)
// Severity: Warning if D > 0.1, Critical if D > 0.2
```

**Resource Burn Detection**:
```javascript
// Triggers when:
// - Iteration usage > maxIterationsPercent
// Severity: Critical at 80%, Emergency at 95%
```

## Integration with Orchestrator

The PID Control layer integrates into the orchestrator's main loop:

```javascript
// Initialize PID controller at loop start
if (config.enablePIDControl) {
  this.pidController = new PIDController({ ... });

  this.pidController.initialize({
    objective: config.objective,
    completionCriteria: config.completionCriteria,
    maxIterations: config.maxIterations,
    estimatedComplexity: 7,
  });
}

// During iteration
const decision = this.pidController.process(iteration, {
  currentIteration: 5,
  maxIterations: 10,
});

// Apply control decisions
if (decision.action === 'pause') {
  // Request human review
  await escalationHandler.escalate({
    level: 'high',
    reason: decision.recommendations.message,
  });
}

// Adjust prompts based on control signals
const promptAdjustments = this.pidController.getPromptAdjustments();
prompt = injectAdjustments(prompt, promptAdjustments);
```

## Configuration Examples

### Simple Task (Documentation)

```javascript
const controller = new PIDController({
  initialProfile: GAIN_PROFILES.aggressive,
  adaptiveGains: false, // Fixed gains
});

controller.initialize({
  objective: 'Update API documentation',
  completionCriteria: 'All endpoints documented',
  maxIterations: 5,
  estimatedComplexity: 2,
});
```

### Security-Critical Task

```javascript
const controller = new PIDController({
  initialProfile: GAIN_PROFILES.conservative,
  adaptiveGains: true,
  thresholds: {
    stuckIterations: 2,      // Detect sooner
    regressionRate: 0.05,    // Lower tolerance
  },
});

controller.initialize({
  objective: 'Fix authentication vulnerability',
  completionCriteria: 'Security tests pass',
  maxIterations: 8,
  estimatedComplexity: 9,
  securitySensitive: true,
});
```

### Long-Running Complex Task

```javascript
const controller = new PIDController({
  windowSize: 7,            // Longer window
  integralDecay: 0.85,      // Slower decay
  adaptiveGains: true,
});

controller.initialize({
  objective: 'Refactor authentication system',
  completionCriteria: 'All tests pass, no regressions',
  maxIterations: 15,
  estimatedComplexity: 10,
  breakingChanges: true,
});
```

## Troubleshooting

### Problem: Loop Oscillating

**Symptoms**: Progress alternates between improvement and regression.

**Solution**:
```javascript
// Increase damping (Kd)
scheduler.setProfile({
  ...GAIN_PROFILES.standard,
  kd: 0.4,  // Higher damping
});
```

### Problem: Loop Stuck

**Symptoms**: No progress for multiple iterations.

**Solution**:
```javascript
// Switch to recovery profile
scheduler.setProfile(GAIN_PROFILES.recovery);

// Or increase urgency
const decision = controller.process(iteration, state);
if (decision.metrics.proportional > 0.7) {
  // Manual intervention
}
```

### Problem: Integral Windup

**Symptoms**: Integral value continuously growing, excessive accumulated error.

**Solution**:
```javascript
// Increase decay rate
const collector = new MetricsCollector({
  integralDecay: 0.8,  // Faster decay (default: 0.9)
});

// Or address repeated blockers directly
const repeatedIssues = collector.getRepeatedIssues();
console.log('Fix these first:', repeatedIssues);
```

### Problem: Too Sensitive to Noise

**Symptoms**: Control signals fluctuate wildly from small changes.

**Solution**:
```javascript
// Increase noise threshold
const collector = new MetricsCollector({
  noiseThreshold: 0.10,  // Ignore changes < 10%
});
```

### Problem: Too Many False Alarms

**Symptoms**: Alarms triggering too frequently for normal conditions.

**Solution**:
```javascript
// Adjust thresholds
const alarms = new ControlAlarms({
  thresholds: {
    stuckIterations: 5,      // Tolerate longer
    oscillationCount: 3,     // More oscillations
    minProgressRate: 0.01,   // Lower progress requirement
  },
});
```

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Overhead per iteration | < 10ms | Lightweight calculations |
| Memory usage | ~1MB | Bounded history windows |
| State persistence | ~5KB | JSON serialization |
| Response time | Immediate | No async operations |

## Best Practices

1. **Start with standard profile** - Most tasks work well with default settings
2. **Enable adaptive gains** - Let the system adjust automatically
3. **Monitor alarm patterns** - Recurring alarms indicate systemic issues
4. **Use conservative for critical paths** - Security and breaking changes
5. **Check control signals** - High signals indicate struggling loops
6. **Preserve state** - Export/import for crash recovery
7. **Review metrics history** - Understand loop behavior over time
8. **Tune thresholds cautiously** - Defaults are research-backed
9. **Watch integral accumulation** - Sign of persistent blockers
10. **Use recovery mode sparingly** - Only when genuinely stuck

## References

- Issue #23: PID-inspired Control Feedback Loop
- REF-015: Self-Refine (Madaan et al., 2023)
- REF-021: Reflexion (Shinn et al., 2023)
- Classic PID Control Theory (Åström & Hägglund)

## See Also

- `README-state-assessment.md` - State assessment and prompt generation
- `README-memory.md` - Memory and learning systems
- `README-snapshot.md` - Snapshot and checkpoint management
- Orchestrator integration in `orchestrator.mjs`
