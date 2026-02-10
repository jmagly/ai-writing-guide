# Ralph External Epic #26: Intelligent Control System Architecture

**Version:** 1.0.0
**Date:** 2026-02-03
**Status:** Active
**Epic Issue:** [#26](https://git.integrolabs.net/roctinam/ai-writing-guide/issues/26)

## Table of Contents

1. [Overview](#overview)
2. [Four-Layer Architecture](#four-layer-architecture)
3. [Layer 1: PID Control Layer](#layer-1-pid-control-layer)
4. [Layer 2: Claude Intelligence Layer](#layer-2-claude-intelligence-layer)
5. [Layer 3: Memory Layer](#layer-3-memory-layer)
6. [Layer 4: Overseer Layer](#layer-4-overseer-layer)
7. [Data Flow](#data-flow)
8. [Integration Points](#integration-points)
9. [Configuration](#configuration)
10. [Performance Characteristics](#performance-characteristics)

---

## Overview

### What Epic #26 Adds to Ralph External

Epic #26 transforms Ralph External from a simple iteration loop into an **intelligent self-managing control system**. It adds four layers of coordinated intelligence that work together to provide:

- **Adaptive behavior** through PID-inspired control feedback
- **Strategic planning** via AI-powered prompt generation
- **Cross-loop learning** through persistent semantic memory
- **Autonomous oversight** with intervention and escalation

### The Intelligent Self-Managing Control System Concept

Traditional Ralph External operated as a fixed-parameter loop: run Claude session → analyze output → repeat. Epic #26 introduces a **closed-loop control system** that continuously monitors performance, adjusts behavior, accumulates knowledge, and intervenes when pathological patterns emerge.

**Key Insight:** By treating the Ralph loop as a control problem (similar to how a thermostat maintains temperature), we can dynamically adjust parameters, strategies, and focus based on real-time feedback. This enables the system to:

1. **Self-correct** when stuck or oscillating
2. **Learn** from past successes and failures across loops
3. **Adapt** prompts and strategies to current progress state
4. **Intervene** before wasting resources on unproductive iterations

### Benefits

| Benefit | Without Epic #26 | With Epic #26 |
|---------|------------------|---------------|
| **Stuck Detection** | Human must notice and abort | PID detects no progress, adjusts gains automatically |
| **Learning Transfer** | Each loop starts from scratch | Semantic memory provides relevant past learnings |
| **Prompt Quality** | Static templates | Claude generates context-aware prompts per iteration |
| **Safety** | Runs until max iterations | Overseer monitors and pauses/aborts on pathology |
| **Resource Efficiency** | Fixed iteration budget | Early stopping when confidence high |

---

## Four-Layer Architecture

The four layers form a **hierarchical control system** with increasing levels of abstraction:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: OVERSEER                                           │
│ • Health monitoring                                         │
│ • Intervention system                                       │
│ • Escalation to humans                                      │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ Health Reports
                            │
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: MEMORY                                             │
│ • Semantic knowledge store                                  │
│ • Learning extraction                                       │
│ • Cross-loop retrieval                                      │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ Learnings
                            │
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: CLAUDE INTELLIGENCE                                │
│ • Dynamic prompt generation                                 │
│ • Pre/post iteration validation                             │
│ • Strategy planning                                         │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ Strategic Guidance
                            │
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: PID CONTROL                                        │
│ • Metrics extraction (P/I/D)                                │
│ • Gain scheduling                                           │
│ • Control signal generation                                 │
│ • Alarm monitoring                                          │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ Iteration Results
                            │
                      ┌─────┴─────┐
                      │ Claude    │
                      │ Session   │
                      └───────────┘
```

### Layer Responsibilities

| Layer | Primary Function | Key Output |
|-------|-----------------|------------|
| **PID Control** | Measure and adjust | Control signals, alarms |
| **Claude Intelligence** | Plan and validate | Optimized prompts, strategy |
| **Memory** | Learn and recall | Relevant knowledge |
| **Overseer** | Monitor and protect | Health status, interventions |

---

## Layer 1: PID Control Layer

### Purpose

Implements **adaptive loop behavior** using control theory principles. Continuously measures the "error" (completion gap), accumulates history of issues (integral), and tracks rate of change (derivative) to provide feedback for parameter adjustment.

### Components

#### 1. MetricsCollector

**Responsibility:** Extract P/I/D values from iteration data.

**Metrics Extraction:**

```javascript
// From tools/ralph-external/metrics-collector.mjs

extractIterationMetrics(iteration) {
  return {
    // Proportional: Current completion gap
    completionPercentage: normalize(iteration.analysis.completionPercentage),

    // Quality indicators
    qualityScore: normalize(iteration.analysis.qualityScore),
    errorCount: iteration.errorCount || 0,
    testsPassing: iteration.testsPassing || 0,

    // Integral inputs: accumulated issues
    learnings: extractLearnings(iteration),
    blockers: extractBlockers(iteration),

    // Derivative inputs: velocity indicators
    duration: iteration.duration,
    filesModified: iteration.filesModified,
    toolCallCount: iteration.toolCallCount,
  };
}
```

**PID Metric Computation:**

| Metric | Formula | Meaning |
|--------|---------|---------|
| **Proportional (P)** | `1.0 - completionPercentage` | How far from done (0.0 = complete, 1.0 = not started) |
| **Integral (I)** | `Σ(accumulated_learnings * decay)` | Memory of past issues and learnings |
| **Derivative (D)** | `Δ(completionPercentage) / Δt` | Rate of progress (positive = improving, negative = regressing) |

**Example:**

```javascript
// Iteration 3: 60% complete
P = 1.0 - 0.60 = 0.40  // 40% gap remaining

// Accumulated 5 learnings over 3 iterations
I = 5 * 0.9 = 4.5      // With 0.9 decay factor

// Progress increased from 50% to 60% (10% gain)
D = (0.60 - 0.50) / 1 = +0.10  // Positive velocity
```

#### 2. GainScheduler

**Responsibility:** Adapt PID gains based on task phase and volatility.

**Gain Profiles:**

```javascript
const GAIN_PROFILES = {
  exploration: {
    kp: 0.3,  // Low proportional (allow exploration)
    ki: 0.1,  // Low integral (don't over-react to early issues)
    kd: 0.2,  // Moderate derivative (track trends)
  },

  focused: {
    kp: 0.5,  // Medium proportional (balanced response)
    ki: 0.2,  // Medium integral (learn from issues)
    kd: 0.3,  // Higher derivative (detect stalls quickly)
  },

  aggressive: {
    kp: 0.7,  // High proportional (strong correction)
    ki: 0.3,  // Higher integral (accumulate learnings)
    kd: 0.4,  // High derivative (rapid trend detection)
  },
};
```

**Adaptive Scheduling:**

```javascript
adjustGains({ phase, volatility, errorMagnitude }) {
  if (phase === 'early') {
    return GAIN_PROFILES.exploration;
  }

  if (volatility > 0.3 || errorMagnitude > 0.7) {
    return GAIN_PROFILES.aggressive;
  }

  return GAIN_PROFILES.focused;
}
```

#### 3. PIDController

**Responsibility:** Integrate metrics, gains, and alarms to produce control decisions.

**Control Output Calculation:**

```javascript
compute(proportional) {
  // Update integral with decay
  this.integralAccumulator =
    (this.integralAccumulator * this.integralDecay) + proportional;

  // Calculate derivative (rate of change)
  const derivative = this.history.length > 0
    ? proportional - this.history[this.history.length - 1].proportional
    : 0;

  // PID formula
  const output =
    (this.kp * proportional) +
    (this.ki * this.integralAccumulator) +
    (this.kd * derivative);

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, output));
}
```

**Control Signal Interpretation:**

| Signal Range | Meaning | Suggested Action |
|--------------|---------|------------------|
| `0.0 - 0.3` | Near completion | Continue current approach |
| `0.3 - 0.5` | Moderate gap | Maintain focus, monitor progress |
| `0.5 - 0.7` | Significant gap | Consider strategy adjustment |
| `0.7 - 1.0` | Critical gap | Pivot or escalate |

#### 4. ControlAlarms

**Responsibility:** Monitor for pathological behaviors and recommend interventions.

**Alarm Types:**

```javascript
const ALARM_TYPES = {
  STUCK: {
    threshold: 3,  // 3 iterations with <5% progress
    severity: 'warning',
    interventions: ['pivot_strategy', 'simplify_scope'],
  },

  OSCILLATING: {
    threshold: 3,  // 3 sign changes in progress direction
    severity: 'critical',
    interventions: ['stabilize', 'constrain_scope'],
  },

  REGRESSING: {
    threshold: 2,  // 2 consecutive negative deltas
    severity: 'critical',
    interventions: ['review_changes', 'consider_rollback'],
  },

  BUDGET_EXCEEDED: {
    threshold: 0.9,  // 90% of max iterations
    severity: 'emergency',
    interventions: ['pause', 'escalate'],
  },
};
```

### PID Control Flow

```
PRE-ITERATION:
┌─────────────────────────────────────────────────────────┐
│ 1. MetricsCollector extracts P/I/D from last iteration  │
│    • Proportional: 1 - completionPercentage             │
│    • Integral: Accumulated learnings + issues           │
│    • Derivative: ΔcompletionPercentage / Δt             │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. GainScheduler adapts gains based on phase/volatility│
│    • Early phase → exploration gains                    │
│    • High volatility → aggressive gains                 │
│    • Normal → focused gains                             │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. PIDController computes control output               │
│    output = (kp × P) + (ki × I) + (kd × D)             │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. ControlAlarms check for pathologies                  │
│    • Stuck? Oscillating? Regressing?                    │
│    • Generate alarms with interventions                 │
└────────────────────┬────────────────────────────────────┘
                     ▼
              Control Decision
         (signals + alarms → Layer 2)
```

---

## Layer 2: Claude Intelligence Layer

### Purpose

Replaces static prompt templates with **AI-powered iteration guidance**. Uses Claude itself to analyze loop state, plan strategy, generate optimized prompts, and validate results.

### Components

#### 1. ClaudePromptGenerator

**Responsibility:** Generate dynamic, context-aware prompts for each iteration.

**Two-Phase Approach:**

**Phase 1: Analysis Prompt Generation**

```javascript
_buildAnalysisPrompt(context) {
  // Build analysis request for Claude
  return `
# Generate Dynamic Claude Code Session Prompt

## Task Information
**Objective**: ${context.objective}
**Completion Criteria**: ${context.completionCriteria}
**Iteration**: ${context.iteration} / ${context.maxIterations}

## Current State
**Progress**: ${context.stateAssessment.estimatedProgress}%
**Phase**: ${context.stateAssessment.phase}
**Blockers**: ${context.stateAssessment.blockers.join(', ')}

## Control Metrics
**Completion Gap**: ${(context.pidMetrics.proportional * 100).toFixed(1)}%
**Trend**: ${context.pidMetrics.trend}
**Velocity**: ${(context.pidMetrics.velocity * 100).toFixed(1)}%/iteration

## Recommended Strategy
**Approach**: ${context.strategyPlan.approach}
**Reasoning**: ${context.strategyPlan.reasoning}
**Priorities**: ${context.strategyPlan.priorities.join(', ')}

## Output Format
Provide JSON with:
{
  "prompt": "Main prompt text",
  "systemContext": "Context injection",
  "focusAreas": ["Priority 1", "Priority 2", "Priority 3"],
  "urgency": "low|normal|high|critical"
}
  `.trim();
}
```

**Phase 2: Prompt Invocation**

```javascript
async generate(context) {
  const analysisPrompt = this._buildAnalysisPrompt(context);

  // Invoke Claude to analyze and generate prompt
  const result = spawnSync('claude', [
    '--dangerously-skip-permissions',
    '--print',
    '--output-format', 'json',
    '--model', 'sonnet',
    analysisPrompt,
  ]);

  const generated = this._parseClaudeResponse(result.stdout);

  return {
    prompt: generated.prompt,
    systemContext: generated.systemContext,
    focusAreas: generated.focusAreas,
    toolSuggestions: this._suggestTools(context, generated),
    metadata: {
      urgency: generated.urgency,
      generatedAt: Date.now(),
    },
  };
}
```

**Adaptive Prompt Features:**

- **Blocker-aware:** If blockers detected, prioritizes debugging
- **Velocity-aware:** If regressing, suggests review/rollback
- **Phase-aware:** Early iterations get exploration prompts, late get completion focus
- **PID-aware:** High control signal increases urgency tone

#### 2. ValidationAgent

**Responsibility:** Pre and post-iteration validation.

**Pre-Iteration Validation:**

```javascript
async validatePre({ objective, strategy, assessment }) {
  const issues = [];

  // Check strategy coherence
  if (strategy.approach === 'pivot' && !strategy.reasoning) {
    issues.push({
      severity: 'high',
      message: 'Pivot strategy lacks reasoning',
    });
  }

  // Check for unresolved blockers
  if (assessment.blockers.length > 0) {
    issues.push({
      severity: 'medium',
      message: `${assessment.blockers.length} blockers remain unaddressed`,
    });
  }

  // Check iteration budget
  if (assessment.iteration > assessment.maxIterations * 0.9) {
    issues.push({
      severity: 'critical',
      message: 'Approaching iteration limit',
    });
  }

  return {
    valid: issues.filter(i => i.severity === 'critical').length === 0,
    issues,
    warnings: issues.filter(i => i.severity !== 'critical'),
  };
}
```

**Post-Iteration Validation:**

```javascript
async validatePost({ analysis, sessionResult, completionCriteria }) {
  const errors = [];

  // Check for completion signal
  if (!sessionResult.completionSignal && analysis.completionPercentage >= 95) {
    errors.push({
      type: 'missing_completion_signal',
      message: 'Near completion but no signal received',
    });
  }

  // Check for tool errors
  if (sessionResult.errorCount > 5) {
    errors.push({
      type: 'excessive_errors',
      message: `${sessionResult.errorCount} errors during session`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

#### 3. StrategyPlanner

**Responsibility:** Analyze iteration history and recommend strategy adjustments.

**Strategy Selection:**

```javascript
_selectStrategy(situation, history, metrics) {
  // Critical: Has blockers - debug first
  if (situation.hasBlockers) {
    return {
      approach: 'pivot',
      reasoning: 'Blockers preventing progress - address root causes',
      adjustments: { focus: 'blocker_resolution' },
    };
  }

  // Stuck pattern - try different approach
  if (situation.stuck) {
    return {
      approach: 'pivot',
      reasoning: `No progress for ${this.stuckThreshold}+ iterations`,
      adjustments: { temperature: 0.8, reframeProblem: true },
    };
  }

  // Near completion - persist to finish
  if (situation.nearCompletion) {
    return {
      approach: 'persist',
      reasoning: 'Near completion (>80%) - finish current approach',
      adjustments: { focusOnCompletion: true },
    };
  }

  // Default: continue
  return {
    approach: 'persist',
    reasoning: 'Normal progress - continue',
    adjustments: {},
  };
}
```

### Claude Intelligence Flow

```
PRE-ITERATION:
┌─────────────────────────────────────────────────────────┐
│ 1. StrategyPlanner analyzes history + PID metrics       │
│    → Recommends: persist|pivot|escalate                 │
│    → Provides priorities and adjustments                │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. ValidationAgent runs pre-iteration checks            │
│    → Validates strategy coherence                       │
│    → Flags unresolved blockers                          │
│    → Warns about iteration budget                       │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. ClaudePromptGenerator builds analysis prompt         │
│    Includes: state, PID metrics, strategy, validation   │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Invoke Claude to generate optimized prompt           │
│    → Context-aware prompt text                          │
│    → Focus areas prioritized                            │
│    → Urgency level set                                  │
└────────────────────┬────────────────────────────────────┘
                     ▼
               Launch Claude Session
                     ▼
POST-ITERATION:
┌─────────────────────────────────────────────────────────┐
│ 5. ValidationAgent validates session results            │
│    → Check completion signal                            │
│    → Check error counts                                 │
│    → Validate quality metrics                           │
└─────────────────────────────────────────────────────────┘
```

---

## Layer 3: Memory Layer

### Purpose

Provides **cross-loop persistent knowledge** that accumulates successful strategies, anti-patterns, project conventions, and time estimates across multiple loop executions.

### Three-Tier Memory Architecture

```
┌──────────────────────────────────────────────────────────┐
│ L1: Working Memory (Claude Session)                      │
│ • Temporary conversation context                         │
│ • Lost when session ends                                 │
│ • Scope: Single iteration                                │
└──────────────────────────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│ L2: Episodic Memory (Loop State)                         │
│ • Iteration history within current loop                  │
│ • Accumulated learnings for this task                    │
│ • Scope: Single loop execution                           │
└──────────────────────────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│ L3: Semantic Memory (Persistent Knowledge)               │
│ • Proven strategies across all loops                     │
│ • Anti-patterns to avoid                                 │
│ • Project conventions                                    │
│ • Time/iteration estimates by task type                  │
│ • Scope: All loops, all time                             │
└──────────────────────────────────────────────────────────┘
```

### Components

#### 1. SemanticMemory

**Responsibility:** Persistent cross-loop knowledge store.

**Learning Types:**

```javascript
const LEARNING_TYPES = {
  strategy: {
    // Proven approaches for specific task types
    example: {
      taskType: 'test-fix',
      content: {
        approach: 'Start with test file, work backward to implementation',
        toolSequence: ['Grep', 'Read', 'Edit', 'Bash'],
        successRate: 0.85,
      },
    },
  },

  antipattern: {
    // Approaches that consistently fail
    example: {
      taskType: 'refactor',
      content: {
        pattern: 'Large multi-file refactors in single iteration',
        consequence: 'High regression risk, difficult rollback',
        alternative: 'Incremental refactor with tests per step',
      },
    },
  },

  estimate: {
    // Time/iteration predictions
    example: {
      taskType: 'feature',
      content: {
        estimatedIterations: 3.5,
        confidence: 0.75,
        basedOnSamples: 12,
      },
    },
  },

  convention: {
    // Project-specific patterns
    example: {
      taskType: 'general',
      content: {
        convention: 'Always update CHANGELOG.md before commit',
        source: 'Project guidelines',
      },
    },
  },
};
```

**Storage Format:**

```yaml
# .aiwg/knowledge/ralph-learnings.json
{
  "version": "1.0.0",
  "checksum": "a1b2c3d4...",  # SHA-256 for corruption detection
  "lastUpdated": "2026-02-03T10:30:00Z",
  "learnings": [
    {
      "id": "learn-a1b2c3",
      "type": "strategy",
      "taskType": "test-fix",
      "content": {
        "approach": "Start with failing test, trace to root cause",
        "toolSequence": ["Bash", "Grep", "Read", "Edit", "Bash"],
        "avgIterations": 2.3
      },
      "confidence": 0.85,
      "sourceLoops": ["loop-001", "loop-005", "loop-012"],
      "useCount": 5,
      "successRate": 0.8,
      "createdAt": "2026-01-15T08:00:00Z",
      "updatedAt": "2026-02-01T14:00:00Z"
    }
  ],
  "stats": {
    "totalLearnings": 42,
    "byType": {
      "strategy": 15,
      "antipattern": 8,
      "estimate": 12,
      "convention": 7
    }
  }
}
```

**Query API:**

```javascript
// Retrieve relevant strategies for current task
const relevant = semanticMemory.query({
  type: 'strategy',
  taskType: 'test-fix',
  minConfidence: 0.7,
  minSuccessRate: 0.6,
  limit: 5,
});
```

#### 2. LearningExtractor

**Responsibility:** Extract actionable learnings from iteration outcomes.

**Extraction Logic:**

```javascript
async extract({ iteration, analysis, strategy, outcome }) {
  const learnings = [];

  // Success pattern extraction
  if (outcome === 'success' && analysis.completionPercentage >= 90) {
    learnings.push({
      type: 'strategy',
      content: {
        approach: strategy.approach,
        toolsUsed: this._extractToolSequence(iteration),
        blockers: analysis.blockers,
        resolution: analysis.resolutionSteps,
      },
      confidence: 0.9,
    });
  }

  // Anti-pattern extraction
  if (outcome === 'failure' && iteration.repeatedIssues.length > 0) {
    learnings.push({
      type: 'antipattern',
      content: {
        pattern: iteration.repeatedIssues[0],
        consequence: 'Failed after multiple attempts',
        detectedIn: iteration.number,
      },
      confidence: 0.7,
    });
  }

  return learnings;
}
```

#### 3. MemoryPromotion

**Responsibility:** Promote valuable episodic memories (L2) to semantic memory (L3).

**Promotion Criteria:**

```javascript
promote({ learnings, source }) {
  for (const learning of learnings) {
    // Check if learning meets promotion threshold
    if (learning.confidence < 0.6) continue;
    if (learning.useCount < 2) continue;

    // Check if similar learning exists
    const existing = this.semanticMemory.query({
      type: learning.type,
      taskType: learning.taskType,
      limit: 1,
    });

    if (existing.length > 0) {
      // Merge: increase confidence, update success rate
      this.semanticMemory.update(existing[0].id, {
        confidence: (existing[0].confidence + learning.confidence) / 2,
        successRate: this._updateSuccessRate(existing[0], learning),
        sourceLoops: [...existing[0].sourceLoops, source],
        useCount: existing[0].useCount + 1,
      });
    } else {
      // Store new learning
      this.semanticMemory.store(
        learning.type,
        learning.taskType,
        learning.content,
        { confidence: learning.confidence, sourceLoops: [source] }
      );
    }
  }
}
```

#### 4. MemoryRetrieval

**Responsibility:** Retrieve relevant cross-loop knowledge for current task.

**Retrieval Strategy:**

```javascript
async retrieve({ query, context, maxResults }) {
  // Semantic similarity search (simplified example)
  const taskType = this._classifyTaskType(query);

  // Get strategies
  const strategies = this.semanticMemory.query({
    type: 'strategy',
    taskType,
    minConfidence: 0.7,
    limit: 3,
  });

  // Get anti-patterns to avoid
  const antipatterns = this.semanticMemory.query({
    type: 'antipattern',
    taskType,
    limit: 2,
  });

  // Get time estimates
  const estimates = this.semanticMemory.query({
    type: 'estimate',
    taskType,
    limit: 1,
  });

  return {
    strategies,
    antipatterns,
    estimates,
    contextSummary: this._buildContextSummary(strategies, antipatterns),
  };
}
```

### Memory Layer Flow

```
POST-ITERATION:
┌─────────────────────────────────────────────────────────┐
│ 1. LearningExtractor analyzes iteration outcome         │
│    → Successful? Extract strategy                       │
│    → Failed? Extract anti-pattern                       │
│    → Timing data? Extract estimate                      │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. MemoryPromotion evaluates learnings                  │
│    → Check promotion threshold (confidence, useCount)   │
│    → Merge with existing or store new                   │
│    → Update L3 semantic memory                          │
└─────────────────────────────────────────────────────────┘

PRE-ITERATION (Next Loop):
┌─────────────────────────────────────────────────────────┐
│ 3. MemoryRetrieval queries semantic memory              │
│    → Classify current task type                         │
│    → Retrieve relevant strategies                       │
│    → Get anti-patterns to avoid                         │
│    → Include in prompt context                          │
└─────────────────────────────────────────────────────────┘
```

---

## Layer 4: Overseer Layer

### Purpose

Provides **autonomous health monitoring and intervention** to prevent pathological loop behaviors: stuck loops, oscillation, objective deviation, resource burn, and quality regression.

### Five Intervention Levels

| Level | Trigger | Action | Example |
|-------|---------|--------|---------|
| **LOG** | Informational | Record to log | "Progress slightly slower than average" |
| **WARN** | Minor issue | Display warning | "Approaching iteration budget (70%)" |
| **REDIRECT** | Moderate issue | Adjust strategy | "Oscillation detected - stabilize" |
| **PAUSE** | Serious issue | Pause loop, request human guidance | "Stuck for 5 iterations" |
| **ABORT** | Critical issue | Abort loop immediately | "Budget exhausted, no progress" |

### Components

#### 1. BehaviorDetector

**Responsibility:** Detect pathological patterns in iteration history.

**Detection Patterns:**

```javascript
const BEHAVIOR_PATTERNS = {
  stuck: {
    // No meaningful progress for N iterations
    detect: (history, threshold = 3) => {
      const recent = history.slice(-threshold);
      const progressChanges = recent.map((h, i) =>
        i === 0 ? 0 : h.completionPercentage - recent[i-1].completionPercentage
      );
      return progressChanges.every(c => Math.abs(c) < 5); // <5% change
    },
    severity: 'high',
  },

  oscillating: {
    // Back-and-forth changes in progress direction
    detect: (history, threshold = 3) => {
      const deltas = history.map((h, i) =>
        i === 0 ? 0 : h.completionPercentage - history[i-1].completionPercentage
      );
      let signChanges = 0;
      for (let i = 1; i < deltas.length; i++) {
        if (Math.sign(deltas[i]) !== Math.sign(deltas[i-1])) signChanges++;
      }
      return signChanges >= threshold;
    },
    severity: 'critical',
  },

  regressing: {
    // Consecutive negative progress
    detect: (history, threshold = 2) => {
      const recent = history.slice(-threshold);
      return recent.every((h, i) =>
        i === 0 ? true : h.completionPercentage < recent[i-1].completionPercentage
      );
    },
    severity: 'critical',
  },

  objective_deviation: {
    // Working on unrelated tasks
    detect: (history, objective) => {
      const lastIteration = history[history.length - 1];
      const relevance = this._calculateRelevance(lastIteration.filesModified, objective);
      return relevance < 0.3; // <30% relevance
    },
    severity: 'medium',
  },

  resource_burn: {
    // High token/time usage with low progress
    detect: (history) => {
      const totalTokens = history.reduce((sum, h) => sum + h.toolCallCount, 0);
      const avgProgress = history.reduce((sum, h) => sum + h.completionPercentage, 0) / history.length;
      return totalTokens > 5000 && avgProgress < 30;
    },
    severity: 'high',
  },
};
```

#### 2. InterventionSystem

**Responsibility:** Apply interventions based on detections.

**Intervention Logic:**

```javascript
intervene(detection) {
  const { type, severity } = detection;

  // Map severity to intervention level
  const level = this._mapSeverityToLevel(severity, type);

  // Build intervention
  const intervention = {
    level,
    detection,
    reason: this._buildReason(detection),
    recommendations: this._buildRecommendations(detection),
    timestamp: Date.now(),
  };

  // Execute intervention
  switch (level) {
    case 'LOG':
      this._log(intervention);
      break;
    case 'WARN':
      this._warn(intervention);
      break;
    case 'REDIRECT':
      this._redirect(intervention);
      break;
    case 'PAUSE':
      this._pause(intervention);
      break;
    case 'ABORT':
      this._abort(intervention);
      break;
  }

  return intervention;
}
```

**REDIRECT Example:**

```javascript
_redirect(intervention) {
  const { detection } = intervention;

  if (detection.type === 'oscillating') {
    // Inject stabilization instructions
    this.injectedInstructions = [
      'Focus on incremental changes',
      'Commit progress after each step',
      'Avoid large refactors mid-iteration',
    ];

    // Adjust PID gains to dampen oscillation
    this.pidController.updateGains({
      kp: 0.3,  // Reduce proportional (less reactive)
      kd: 0.5,  // Increase derivative (dampen oscillation)
    });
  }
}
```

**PAUSE Example:**

```javascript
_pause(intervention) {
  this.isPaused = true;

  console.log(`
╔═══════════════════════════════════════════════════════╗
║ OVERSEER: LOOP PAUSED                                 ║
╠═══════════════════════════════════════════════════════╣
║ Reason: ${intervention.reason}                        ║
║                                                       ║
║ Detected: ${intervention.detection.type}             ║
║ Severity: ${intervention.detection.severity}         ║
║                                                       ║
║ Recommendations:                                      ║
${intervention.recommendations.map(r => `║ • ${r}`).join('\n')}
║                                                       ║
║ Awaiting human guidance to continue...               ║
╚═══════════════════════════════════════════════════════╝
  `);
}
```

#### 3. EscalationHandler

**Responsibility:** Escalate to humans via Gitea issues.

**Escalation Levels:**

```javascript
const ESCALATION_LEVELS = {
  INFO: {
    priority: 'low',
    labels: ['ralph-external', 'info'],
  },
  WARNING: {
    priority: 'medium',
    labels: ['ralph-external', 'warning'],
  },
  CRITICAL: {
    priority: 'high',
    labels: ['ralph-external', 'critical', 'needs-review'],
  },
  EMERGENCY: {
    priority: 'urgent',
    labels: ['ralph-external', 'emergency', 'blocking'],
  },
};
```

**Escalation Process:**

```javascript
async escalate(level, context) {
  const { loopId, iterationNumber, reason, detection } = context;

  // Build issue title
  const title = `[Ralph External] ${level}: ${detection.type} in ${loopId}`;

  // Build issue body
  const body = `
## Overseer Escalation

**Loop ID:** ${loopId}
**Iteration:** ${iterationNumber}
**Level:** ${level}
**Detection:** ${detection.type}

### Reason

${reason}

### Context

${JSON.stringify(context, null, 2)}

### Recommendations

${context.recommendations.map(r => `- ${r}`).join('\n')}

### Next Steps

Please review and provide guidance to continue.
  `.trim();

  // Create Gitea issue
  const issue = await this.giteaClient.createIssue({
    title,
    body,
    labels: ESCALATION_LEVELS[level].labels,
  });

  this.escalationLog.push({
    level,
    issueNumber: issue.number,
    issueUrl: issue.html_url,
    context,
    timestamp: Date.now(),
  });

  return issue;
}
```

#### 4. Overseer (Coordinator)

**Responsibility:** Coordinate detection, intervention, and escalation.

**Health Check Flow:**

```javascript
async check(iterationResult) {
  // 1. Add to history
  this.iterationHistory.push(iterationResult);

  // 2. Run detections
  const detections = this.behaviorDetector.detect(this.iterationHistory);

  // 3. Process interventions
  const interventions = [];
  for (const detection of detections) {
    const intervention = this.interventionSystem.intervene(detection);
    interventions.push(intervention);

    // 4. Auto-escalate if needed
    if (this.shouldEscalate(intervention)) {
      await this.escalate(intervention, iterationResult);
    }
  }

  // 5. Determine overall status
  const status = this._determineStatus(detections, interventions);

  // 6. Create health check record
  const healthCheck = {
    iterationNumber: iterationResult.number,
    timestamp: Date.now(),
    detections,
    interventions,
    status,
    metrics: this._computeMetrics(),
  };

  // 7. Log and persist
  this.healthCheckLog.push(healthCheck);
  this.saveLog();

  return healthCheck;
}
```

### Overseer Flow

```
POST-ITERATION:
┌─────────────────────────────────────────────────────────┐
│ 1. BehaviorDetector scans iteration history             │
│    → Check for: stuck, oscillating, regressing          │
│    → Check for: objective deviation, resource burn      │
│    → Generate detections with severity                  │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. InterventionSystem processes detections              │
│    → Map severity to intervention level                 │
│    → Execute: LOG, WARN, REDIRECT, PAUSE, or ABORT      │
│    → Record intervention in log                         │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Check if escalation needed                           │
│    → PAUSE/ABORT always escalate                        │
│    → Critical detections escalate                       │
│    → Prolonged issues escalate                          │
└────────────────────┬────────────────────────────────────┘
                     ▼ (if escalation needed)
┌─────────────────────────────────────────────────────────┐
│ 4. EscalationHandler creates Gitea issue                │
│    → Build context summary                              │
│    → Set priority and labels                            │
│    → Provide recommendations                            │
│    → Await human guidance                               │
└─────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Complete Iteration Data Flow

```
═══════════════════════════════════════════════════════════
                    PRE-ITERATION
═══════════════════════════════════════════════════════════

1. StateAssessor → Assess current situation
   ├─ Parse last iteration output
   ├─ Compute estimated progress
   └─ Identify blockers

2. MemoryRetrieval → Get relevant knowledge (L3)
   ├─ Query semantic memory for task type
   ├─ Retrieve proven strategies
   └─ Get anti-patterns to avoid

3. StrategyPlanner → Plan iteration strategy (Layer 2)
   ├─ Analyze situation from StateAssessor
   ├─ Consider iteration history
   ├─ Recommend: persist | pivot | escalate
   └─ Build priority list

4. MetricsCollector → Extract PID metrics (Layer 1)
   ├─ P = 1 - completionPercentage
   ├─ I = Σ(accumulated_learnings × decay)
   └─ D = Δ(completionPercentage) / Δt

5. GainScheduler → Adapt PID gains (Layer 1)
   ├─ Check phase: early | mid | late
   ├─ Check volatility: low | medium | high
   └─ Select gain profile: exploration | focused | aggressive

6. PIDController → Compute control signal (Layer 1)
   ├─ output = (kp × P) + (ki × I) + (kd × D)
   └─ Clamp to [0, 1]

7. ControlAlarms → Check for pathologies (Layer 1)
   ├─ Stuck? Oscillating? Regressing?
   └─ Generate alarms with interventions

8. ValidationAgent → Pre-iteration validation (Layer 2)
   ├─ Validate strategy coherence
   ├─ Check for unresolved blockers
   └─ Warn about iteration budget

9. ClaudePromptGenerator → Generate dynamic prompt (Layer 2)
   ├─ Build analysis prompt with all context
   ├─ Invoke Claude to analyze and generate
   ├─ Parse JSON response
   └─ Add tool suggestions

─────────────────────────────────────────────────────────
                  DURING ITERATION
─────────────────────────────────────────────────────────

10. SessionLauncher → Execute Claude session
    ├─ Launch with generated prompt
    ├─ Monitor for completion signal
    └─ Capture output and errors

═══════════════════════════════════════════════════════════
                   POST-ITERATION
═══════════════════════════════════════════════════════════

11. ValidationAgent → Post-iteration validation (Layer 2)
    ├─ Check completion signal
    ├─ Validate error counts
    └─ Check quality metrics

12. BehaviorDetector → Detect pathologies (Layer 4)
    ├─ Analyze iteration history
    ├─ Check for: stuck, oscillating, regressing
    └─ Generate detections with severity

13. InterventionSystem → Apply interventions (Layer 4)
    ├─ Map severity to intervention level
    ├─ Execute: LOG, WARN, REDIRECT, PAUSE, ABORT
    └─ Record in intervention log

14. Overseer → Health check (Layer 4)
    ├─ Coordinate detection and intervention
    ├─ Determine overall health status
    ├─ Escalate to human if needed
    └─ Persist health check log

15. LearningExtractor → Extract learnings (Layer 3)
    ├─ Success? Extract strategy
    ├─ Failure? Extract anti-pattern
    └─ Record timing estimates

16. MemoryPromotion → Promote to L3 (Layer 3)
    ├─ Check promotion threshold
    ├─ Merge with existing or store new
    └─ Update semantic memory

17. StateManager → Update loop state
    ├─ Record iteration result
    ├─ Update accumulated learnings
    └─ Persist state to disk
```

### Simplified Flow Diagram

```
┌─────────────┐
│ Last        │
│ Iteration   │
│ Result      │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ PRE-ITERATION INTELLIGENCE               │
│                                          │
│ ┌────────────┐    ┌────────────┐        │
│ │ Memory     │───▶│ Strategy   │        │
│ │ Retrieval  │    │ Planner    │        │
│ │ (L3)       │    │ (L2)       │        │
│ └────────────┘    └─────┬──────┘        │
│                         │                │
│ ┌────────────┐    ┌─────▼──────┐        │
│ │ PID        │───▶│ Claude     │        │
│ │ Controller │    │ Prompt     │        │
│ │ (L1)       │    │ Generator  │        │
│ └────────────┘    │ (L2)       │        │
│                   └─────┬──────┘        │
│                         │                │
│ ┌────────────┐          │                │
│ │ Validation │◀─────────┘                │
│ │ Agent (L2) │                           │
│ └────────────┘                           │
└──────────────┬───────────────────────────┘
               │
               ▼
       ┌───────────────┐
       │ Claude        │
       │ Session       │
       │ Execution     │
       └───────┬───────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ POST-ITERATION OVERSIGHT                 │
│                                          │
│ ┌────────────┐    ┌────────────┐        │
│ │ Validation │───▶│ Behavior   │        │
│ │ Agent      │    │ Detector   │        │
│ │ (L2)       │    │ (L4)       │        │
│ └────────────┘    └─────┬──────┘        │
│                         │                │
│ ┌────────────┐    ┌─────▼──────┐        │
│ │ Learning   │───▶│ Overseer   │        │
│ │ Extractor  │    │ (L4)       │        │
│ │ (L3)       │    │            │        │
│ └─────┬──────┘    └────────────┘        │
│       │                                  │
│       ▼                                  │
│ ┌────────────┐                           │
│ │ Memory     │                           │
│ │ Promotion  │                           │
│ │ (L3)       │                           │
│ └────────────┘                           │
└──────────────────────────────────────────┘
```

---

## Integration Points

### Layer Communication

| From | To | Data Type | Example |
|------|----|-----------| --------|
| PID Controller (L1) | Claude Prompt (L2) | Control signals | `{ output: 0.65, urgency: 'high' }` |
| Memory Retrieval (L3) | Strategy Planner (L2) | Relevant knowledge | `{ strategies: [...], antipatterns: [...] }` |
| Strategy Planner (L2) | Prompt Generator (L2) | Strategy plan | `{ approach: 'pivot', priorities: [...] }` |
| Validation Agent (L2) | Overseer (L4) | Validation issues | `{ errors: [...], warnings: [...] }` |
| Behavior Detector (L4) | Intervention System (L4) | Detections | `{ type: 'stuck', severity: 'high' }` |
| Learning Extractor (L3) | Memory Promotion (L3) | Learnings | `{ type: 'strategy', content: {...} }` |

### State Object Structure

The central state object flows through all layers:

```javascript
const state = {
  // Identification
  loopId: 'loop-abc123',
  sessionId: 'session-def456',

  // Progress
  currentIteration: 3,
  maxIterations: 10,

  // Task
  objective: 'Fix failing authentication tests',
  completionCriteria: 'All tests in test/auth/** pass',

  // Configuration
  config: {
    enablePIDControl: true,
    enableOverseer: true,
    enableSemanticMemory: true,
    // ...
  },

  // Layer 1: PID State
  pidMetrics: {
    proportional: 0.35,
    integral: 2.1,
    derivative: -0.05,
  },

  // Layer 2: Strategy State
  currentStrategy: {
    approach: 'persist',
    reasoning: 'Making good progress, continue',
    priorities: ['Complete test fixes', 'Validate coverage'],
  },

  // Layer 3: Memory State
  relevantKnowledge: {
    strategies: [...],
    antipatterns: [...],
  },

  // Layer 4: Health State
  overseerStatus: {
    status: 'healthy',
    detections: [],
    interventions: [],
  },

  // Iteration history
  iterations: [
    { number: 1, ... },
    { number: 2, ... },
    { number: 3, ... },
  ],
};
```

### Error Propagation

Errors are handled hierarchically:

```
Layer 4 (Overseer)
  ├─ Catches: Critical failures, intervention failures
  └─ Action: Escalate to human, abort loop

Layer 3 (Memory)
  ├─ Catches: Memory corruption, promotion failures
  └─ Action: Use backup, continue without memory

Layer 2 (Claude Intelligence)
  ├─ Catches: Prompt generation failures, validation errors
  └─ Action: Use fallback prompt, log warning

Layer 1 (PID Control)
  ├─ Catches: Metric calculation errors, gain adjustment failures
  └─ Action: Use default gains, continue with warning
```

---

## Configuration

### Three Main Flags

```javascript
const config = {
  // Layer 1: PID Control
  enablePIDControl: true,  // Default: true
  pidOptions: {
    windowSize: 5,
    integralDecay: 0.9,
    noiseThreshold: 0.05,
  },

  // Layer 4: Overseer
  enableOverseer: true,  // Default: true
  overseerOptions: {
    stuckThreshold: 3,
    oscillationThreshold: 3,
    autoEscalate: true,
  },

  // Layer 3: Semantic Memory
  enableSemanticMemory: true,  // Default: true
  memoryOptions: {
    storagePath: '.aiwg/knowledge',
    minConfidence: 0.7,
  },
};
```

### Layer-Specific Configuration

#### PID Control Configuration

```javascript
pidConfig: {
  // Metrics collection
  windowSize: 5,              // Iterations for derivative calculation
  integralDecay: 0.9,         // Decay factor for integral
  noiseThreshold: 0.05,       // Deadband for noise filtering

  // Gain scheduling
  adaptiveGains: true,        // Enable adaptive gain scheduling
  initialProfile: 'standard', // exploration | standard | aggressive
  transitionSmoothing: 0.3,   // Gain transition smoothing

  // Alarms
  stuckThreshold: 3,          // Iterations before stuck alarm
  budgetWarning: 0.9,         // Warn at 90% iterations
  autoIntervene: false,       // Auto-apply alarm interventions
}
```

#### Claude Intelligence Configuration

```javascript
intelligenceConfig: {
  // Prompt generation
  model: 'sonnet',            // Claude model for prompt generation
  timeout: 90000,             // Generation timeout (ms)
  verbose: false,             // Enable verbose output

  // Strategy planning
  stuckThreshold: 3,          // Iterations to consider stuck
  oscillationThreshold: 3,    // Sign changes for oscillation
  escalationThreshold: 7,     // Iterations before escalation

  // Validation
  strictValidation: true,     // Strict pre/post validation
}
```

#### Memory Configuration

```javascript
memoryConfig: {
  // Storage
  storagePath: '.aiwg/knowledge',
  backupEnabled: true,

  // Query
  minConfidence: 0.7,
  minSuccessRate: 0.6,
  maxResults: 5,

  // Promotion
  promotionThreshold: 0.6,    // Min confidence to promote
  minUseCount: 2,             // Min uses before promotion
}
```

#### Overseer Configuration

```javascript
overseerConfig: {
  // Detection
  stuckThreshold: 3,
  oscillationThreshold: 3,
  regressionThreshold: 2,

  // Intervention
  autoEscalate: true,         // Auto-escalate critical issues
  pauseOnCritical: true,      // Pause on critical detections

  // Escalation
  giteaRepo: 'roctinam/ai-writing-guide',
  escalationLevels: {
    info: { priority: 'low', labels: ['ralph-external', 'info'] },
    warning: { priority: 'medium', labels: ['ralph-external', 'warning'] },
    critical: { priority: 'high', labels: ['ralph-external', 'critical'] },
  },
}
```

### Default Behaviors

| Flag | Default | Disabled Behavior |
|------|---------|-------------------|
| `enablePIDControl` | `true` | Uses static template prompts, no adaptive gains |
| `enableOverseer` | `true` | No health monitoring, runs until max iterations |
| `enableSemanticMemory` | `true` | No cross-loop learning, each loop starts fresh |

---

## Performance Characteristics

### Layer Overhead

| Layer | Overhead per Iteration | Bottleneck |
|-------|------------------------|------------|
| **PID Control** | ~50ms | Metric extraction and gain calculation |
| **Claude Intelligence** | ~5-10s | Prompt generation via Claude invocation |
| **Memory** | ~100ms | Semantic memory query and retrieval |
| **Overseer** | ~200ms | Behavior detection across history |
| **Total Epic #26 Overhead** | ~6-11s | Dominated by prompt generation |

### Scaling Characteristics

| Metric | Scaling | Notes |
|--------|---------|-------|
| **PID History** | O(windowSize) | Typically 5 iterations, bounded |
| **Memory Query** | O(log n) | Efficient indexing in semantic memory |
| **Behavior Detection** | O(history length) | Linear scan, but history is bounded |
| **Prompt Generation** | O(1) | Fixed cost per invocation |

### Memory Footprint

| Component | Memory Usage |
|-----------|--------------|
| PID History | ~1 KB per iteration (5 iter = ~5 KB) |
| Semantic Memory | ~50-500 KB (depends on learning count) |
| Overseer Log | ~10 KB per iteration |
| Total Epic #26 | ~100-600 KB additional |

### Trade-offs

| Feature | Benefit | Cost |
|---------|---------|------|
| **Claude-Generated Prompts** | Higher quality, context-aware | +5-10s per iteration |
| **Semantic Memory** | Cross-loop learning | +100ms query, +50-500 KB storage |
| **Overseer Monitoring** | Safety and intervention | +200ms detection |
| **PID Adaptive Gains** | Better convergence | +50ms metrics |

---

## References

### Implementation Files

- **Orchestrator:** `tools/ralph-external/orchestrator.mjs`
- **PID Controller:** `tools/ralph-external/pid-controller.mjs`
- **Metrics Collector:** `tools/ralph-external/metrics-collector.mjs`
- **Gain Scheduler:** `tools/ralph-external/gain-scheduler.mjs`
- **Control Alarms:** `tools/ralph-external/control-alarms.mjs`
- **Claude Prompt Generator:** `tools/ralph-external/lib/claude-prompt-generator.mjs`
- **Validation Agent:** `tools/ralph-external/lib/validation-agent.mjs`
- **Strategy Planner:** `tools/ralph-external/lib/strategy-planner.mjs`
- **Semantic Memory:** `tools/ralph-external/lib/semantic-memory.mjs`
- **Learning Extractor:** `tools/ralph-external/lib/learning-extractor.mjs`
- **Memory Promotion:** `tools/ralph-external/lib/memory-promotion.mjs`
- **Memory Retrieval:** `tools/ralph-external/lib/memory-retrieval.mjs`
- **Overseer:** `tools/ralph-external/lib/overseer.mjs`
- **Behavior Detector:** `tools/ralph-external/lib/behavior-detector.mjs`
- **Intervention System:** `tools/ralph-external/lib/intervention-system.mjs`
- **Escalation Handler:** `tools/ralph-external/lib/escalation-handler.mjs`

### Related Documentation

- **Working Issue:** `.aiwg/working/issue-ralph-external-completion.md`
- **Epic #26:** https://git.integrolabs.net/roctinam/ai-writing-guide/issues/26
- **Issue #22:** Claude Intelligence Layer
- **Issue #23:** PID Control Layer
- **Issue #24:** Memory Layer
- **Issue #25:** Overseer Layer

### Research References

- **REF-015:** Self-Refine (non-monotonic quality)
- **REF-021:** Reflexion (episodic memory)
- **Control Theory:** PID controller fundamentals

---

**Document Status:** Complete
**Last Updated:** 2026-02-03
**Maintainer:** AIWG Team
