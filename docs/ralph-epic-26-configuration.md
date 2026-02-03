# Ralph Epic #26 Configuration Reference

**Version**: 1.0.0
**Last Updated**: 2026-02-03
**Epic**: #26 - Intelligence Layers Integration
**Components**: PID Control, Claude Intelligence, Memory Layer, Overseer

---

## Overview

Epic #26 integrates four intelligence layers into the External Ralph Loop to provide adaptive control, strategic planning, persistent learning, and autonomous oversight. This document details all configuration options, their defaults, precedence rules, and usage examples.

### How Epic #26 Configuration Works

Epic #26 configuration follows a hierarchical precedence model:

1. **CLI flags** (highest priority) - Override everything
2. **Orchestrator config object** - Passed to `execute()` or `resume()`
3. **Default values** (lowest priority) - Hardcoded in component constructors

Configuration is validated at initialization and can be partially overridden during runtime for specific components.

### Configuration Precedence

```
CLI flags > execute() config object > Component defaults
```

Example:
```javascript
// CLI: --max-iterations 10 overrides config
await orchestrator.execute({
  maxIterations: 5,  // Ignored if CLI flag present
  enablePIDControl: true,  // Used if no CLI flag
});
```

### Configuration File Location

Currently, Epic #26 uses programmatic configuration only. Configuration files are not yet supported but planned for v2.0.0.

**Planned location** (future):
```
.aiwg/ralph/config.yaml          # Project-level config
~/.config/aiwg/ralph/config.yaml # User-level defaults
```

---

## Main Feature Flags

These top-level flags control which Epic #26 layers are active.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `enablePIDControl` | boolean | `true` | Enable PID-inspired control feedback loop |
| `enableOverseer` | boolean | `true` | Enable autonomous oversight and intervention |
| `enableSemanticMemory` | boolean | `true` | Enable cross-loop persistent memory (L3) |
| `enableAnalytics` | boolean | `true` | Enable iteration analytics tracking |
| `enableBestOutput` | boolean | `true` | Enable best output selection (REF-015) |
| `enableEarlyStopping` | boolean | `true` | Enable early stopping on high confidence |
| `crossTask` | boolean | `true` | Enable cross-task learning (REF-021) |

**Usage:**

```javascript
// CLI
ralph-external "Fix tests" --completion "npm test passes" \
  --no-analytics \
  --no-early-stopping

// Programmatic
await orchestrator.execute({
  objective: "Fix tests",
  completionCriteria: "npm test passes",
  enablePIDControl: true,
  enableOverseer: true,
  enableSemanticMemory: false,  // Disable L3 memory
});
```

---

## PID Control Layer Configuration

The PID Control Layer provides adaptive feedback control to adjust loop parameters dynamically.

### PID Controller Options

```javascript
{
  // Metrics Collection
  windowSize: 5,           // Moving window size for metrics
  integralDecay: 0.9,      // Decay factor for integral term (0-1)
  noiseThreshold: 0.05,    // Deadband to filter noise (0-1)

  // Gain Scheduling
  adaptiveGains: true,     // Enable adaptive gain scheduling
  initialProfile: 'standard',  // conservative|standard|aggressive|recovery|cautious
  transitionSmoothing: 0.3,    // Smoothing factor for gain transitions (0-1)

  // Control Output
  outputMin: -1,           // Minimum control signal
  outputMax: 1,            // Maximum control signal

  // Behavior
  autoIntervene: false,    // Auto-apply PID recommendations (not yet implemented)
}
```

### Gain Profiles

Pre-defined gain profiles for different task types:

| Profile | Kp | Ki | Kd | When to Use |
|---------|-----|-----|-----|-------------|
| **conservative** | 0.3 | 0.05 | 0.4 | High-risk: security, breaking changes, compliance |
| **standard** | 0.5 | 0.15 | 0.25 | Typical development tasks (default) |
| **aggressive** | 0.8 | 0.25 | 0.1 | Simple tasks: docs, config, straightforward fixes |
| **recovery** | 1.0 | 0.4 | -0.1 | Stuck or regressing: needs strategy change |
| **cautious** | 0.2 | 0.02 | 0.5 | Near completion: fine-tuning phase |

**Gain Parameter Meanings:**
- **Kp (Proportional)**: Response to current error (completion gap)
- **Ki (Integral)**: Response to accumulated error over time
- **Kd (Derivative)**: Response to rate of change (trending)

### Gain Scheduler Options

```javascript
{
  initialProfile: GAIN_PROFILES.standard,  // Starting profile
  adaptiveEnabled: true,        // Enable adaptive scheduling
  transitionSmoothing: 0.3,     // Smoothing factor (0=instant, 1=no change)
}
```

**Automatic Profile Selection** based on task complexity:

```javascript
// Task factors influence initial profile
{
  estimatedIterations: 10,      // More iterations = higher complexity
  filesAffected: 50,             // More files = higher complexity
  hasTests: true,                // Tests reduce risk
  securitySensitive: false,      // Security tasks use conservative
  breakingChanges: false,        // Breaking changes use conservative
  domainComplexity: 'medium',    // low|medium|high
}

// Complexity scoring:
// Score 0-2: aggressive
// Score 3-5: standard
// Score 6+: conservative
```

### Metrics Collector Options

```javascript
{
  windowSize: 5,              // Size of sliding window for trend analysis
  integralDecay: 0.9,         // Decay factor prevents unbounded integral
  noiseThreshold: 0.05,       // Ignore changes smaller than this
}
```

**Collected Metrics:**

- **Proportional (P)**: `1 - completionPercentage` (error from goal)
- **Integral (I)**: Accumulated error over time with decay
- **Derivative (D)**: Rate of change in completion percentage
- **Trend**: `improving|stable|degrading` based on derivative

### Control Alarms Options

```javascript
{
  // Divergence Detection
  divergenceThreshold: 0.5,       // Progress change > 0.5 triggers alarm

  // Oscillation Detection
  oscillationWindow: 5,           // Check last 5 iterations for oscillation
  oscillationThreshold: 3,        // 3+ sign changes = oscillation

  // Saturation Detection
  saturationDuration: 3,          // Control signal at limit for 3 iterations

  // Stagnation Detection
  stagnationWindow: 3,            // No progress change for 3 iterations
  stagnationThreshold: 0.02,      // < 2% change = stagnant

  // Auto-intervention
  autoIntervene: false,           // Auto-apply fixes (not yet implemented)
}
```

**Alarm Levels:**

| Level | Trigger | Action |
|-------|---------|--------|
| `NORMAL` | No issues detected | Continue normally |
| `CAUTION` | Minor issue detected | Log warning |
| `WARNING` | Multiple issues or moderate severity | Alert user |
| `CRITICAL` | Severe issue (divergence, sustained oscillation) | Pause for review |

**Example Configuration:**

```javascript
import { PIDController, GAIN_PROFILES } from './pid-controller.mjs';

const pid = new PIDController({
  windowSize: 5,
  integralDecay: 0.9,
  noiseThreshold: 0.05,
  adaptiveGains: true,
  initialProfile: GAIN_PROFILES.conservative,  // For security-critical task
  transitionSmoothing: 0.3,
  autoIntervene: false,
  thresholds: {
    divergenceThreshold: 0.3,  // Stricter divergence detection
    oscillationWindow: 5,
  },
});

// Initialize with task config
pid.initialize({
  objective: "Migrate authentication to OAuth2",
  completionCriteria: "All tests pass with OAuth2",
  maxIterations: 10,
  estimatedComplexity: 8,      // 1-10 scale
  securitySensitive: true,     // Forces conservative profile
  breakingChanges: true,       // Also forces conservative
});

// Process each iteration
const decision = pid.process(iterationResult, systemState);
console.log(`Control signal: ${decision.controlSignal}`);
console.log(`Urgency: ${decision.urgency}`);
console.log(`Recommendations: ${JSON.stringify(decision.recommendations)}`);
```

---

## Claude Intelligence Layer Configuration

The Claude Intelligence Layer provides strategic planning, validation, and intelligent prompt generation.

### Claude Prompt Generator Options

```javascript
{
  enabled: true,                     // Enable Claude-powered prompting
  model: 'claude-sonnet-4-20250514', // Claude model for strategy planning
  maxPromptTokens: 4000,             // Max tokens for generated prompts
  fallbackEnabled: true,             // Fallback to rule-based if Claude unavailable
}
```

**Prompt Enhancement Features:**

- **Task decomposition**: Breaks complex objectives into sub-goals
- **Strategy selection**: Chooses approach based on task type
- **Context injection**: Adds relevant learnings from semantic memory
- **Anti-pattern warnings**: Includes known failure modes

### Validation Agent Options

```javascript
{
  projectRoot: process.cwd(),   // Project root directory
  runTests: true,               // Run tests post-iteration
  checkBuild: true,             // Verify build succeeds
  checkLint: false,             // Run linting (disabled by default)
  checkDependencies: false,     // Verify dependencies installed
  timeout: 60000,               // Command timeout (ms)
  verbose: false,               // Enable verbose output
}
```

**Validation Phases:**

1. **Pre-iteration**: Validates project state before starting
   - Git status check (dirty state warning)
   - Dependency check (package.json integrity)
   - Common blockers (node_modules missing, etc.)

2. **Post-iteration**: Validates iteration didn't introduce regressions
   - Test execution (if `runTests: true`)
   - Build check (if `checkBuild: true`)
   - Lint check (if `checkLint: true`)
   - Regression detection (compare to baseline)

**Validation Result:**

```javascript
{
  passed: true,                // Overall pass/fail
  severity: 'ok',              // ok|warning|error|critical
  issues: [],                  // Array of ValidationIssue
  details: {                   // Detailed validation data
    git: { clean: true },
    tests: { passed: 42, failed: 0 },
    build: { success: true },
  },
  timestamp: 1738515600000,
}
```

### Strategy Planner Options

```javascript
{
  confidenceThreshold: 0.5,      // Minimum confidence to suggest strategy
  escalationThreshold: 0.3,      // Confidence below this escalates to human
  historyDepth: 5,               // Iterations to analyze for patterns
  enableAdaptation: true,        // Adapt strategy based on results
}
```

**Strategy Types:**

- `decompose`: Break into sub-tasks
- `refactor`: Restructure before feature work
- `test-first`: Write tests before implementation
- `incremental`: Small iterative changes
- `research`: Investigation needed before action
- `escalate`: Human guidance required

**Example Configuration:**

```javascript
import { ClaudePromptGenerator } from './lib/claude-prompt-generator.mjs';
import { ValidationAgent } from './lib/validation-agent.mjs';
import { StrategyPlanner } from './lib/strategy-planner.mjs';

// Claude Prompt Generator
const promptGen = new ClaudePromptGenerator({
  enabled: true,
  model: 'claude-sonnet-4-20250514',
  maxPromptTokens: 4000,
  fallbackEnabled: true,
});

// Validation Agent
const validator = new ValidationAgent({
  projectRoot: '/path/to/project',
  runTests: true,
  checkBuild: true,
  checkLint: false,  // Too slow for every iteration
  timeout: 120000,   // 2 minutes for large test suites
  verbose: true,
});

// Strategy Planner
const planner = new StrategyPlanner({
  confidenceThreshold: 0.5,
  escalationThreshold: 0.3,
  historyDepth: 5,
  enableAdaptation: true,
});

// Pre-iteration validation
const preValidation = await validator.validatePre({ iterationNumber: 1 });
if (!preValidation.passed) {
  console.error('Pre-validation failed:', preValidation.issues);
}

// Post-iteration validation
const postValidation = await validator.validatePost(
  { iterationNumber: 1 },
  { changes: ['src/auth.ts'] }
);
if (postValidation.severity === 'error') {
  console.error('Regression detected:', postValidation.issues);
}

// Strategy planning
const strategy = await planner.planStrategy({
  objective: "Add OAuth2 support",
  history: previousIterations,
  context: { securityCritical: true },
});
console.log(`Recommended strategy: ${strategy.type}`);
console.log(`Confidence: ${strategy.confidence}`);
```

---

## Memory Layer Configuration

The Memory Layer provides persistent cross-loop learning through semantic memory (L3), memory promotion, and intelligent retrieval.

### Semantic Memory Options

```javascript
{
  enabled: true,                           // Enable L3 semantic memory
  storagePath: '.aiwg/knowledge',          // Knowledge directory
  maxEntries: 1000,                        // Maximum learnings stored
  checksumVerification: true,              // Verify data integrity on load
}
```

**Memory Levels:**

- **L1 (Working Memory)**: Claude session context (temporary)
- **L2 (Episodic Memory)**: Single loop state history
- **L3 (Semantic Memory)**: Cross-loop persistent knowledge (this)

**Learning Types:**

| Type | Description | Example |
|------|-------------|---------|
| `strategy` | Proven successful approach | "Use test-first for auth features" |
| `antipattern` | Known failure mode | "Don't modify tests to pass - fix code" |
| `estimate` | Time/iteration estimates | "OAuth migration: 8-10 iterations" |
| `convention` | Project conventions | "Use kebab-case for file names" |

**Learning Schema:**

```javascript
{
  id: 'learn-abc123',              // Unique ID
  type: 'strategy',                // strategy|antipattern|estimate|convention
  taskType: 'feature',             // test-fix|feature|refactor|bug-fix|security
  content: {                       // Type-specific content
    description: "Use test-first approach for authentication features",
    reasoning: "Reduces security bugs by 40% (observed over 5 loops)",
    applicability: ["auth", "security"],
  },
  confidence: 0.85,                // 0.0-1.0
  sourceLoops: ['ralph-001', 'ralph-005'],  // Where this came from
  createdAt: '2026-02-03T10:00:00Z',
  updatedAt: '2026-02-03T12:30:00Z',
  useCount: 12,                    // Times retrieved
  successRate: 0.75,               // Success rate when applied (0.0-1.0)
}
```

### Memory Promotion Options

```javascript
{
  autoPromote: true,               // Auto-promote episodic to semantic
  minFrequency: 3,                 // Minimum occurrences to promote
  minSuccessRate: 0.7,             // Minimum success rate to promote
  reviewThreshold: 0.5,            // Confidence below this needs human review
}
```

**Promotion Criteria:**

A learning is promoted from episodic (L2) to semantic (L3) when:
1. It has been observed at least `minFrequency` times
2. Its success rate is >= `minSuccessRate`
3. Its confidence score is >= `reviewThreshold` (or human approves)

### Memory Retrieval Options

```javascript
{
  maxResults: 10,                  // Maximum learnings to retrieve
  relevanceThreshold: 0.5,         // Minimum relevance score (0-1)
  diversityFactor: 0.3,            // Balance relevance vs diversity (0-1)
  cacheSize: 50,                   // LRU cache size for retrieved learnings
}
```

**Retrieval Algorithm:**

```
1. Compute semantic similarity to current task
2. Filter by relevanceThreshold
3. Rank by: (relevance * confidence * successRate)
4. Apply diversity factor to avoid redundant results
5. Return top maxResults
```

### Learning Extractor Options

```javascript
{
  minConfidence: 0.6,              // Minimum confidence for extracted learnings
  extractStrategies: true,         // Extract successful strategies
  extractAntipatterns: true,       // Extract failure patterns
  extractEstimates: true,          // Extract time/iteration estimates
  extractConventions: true,        // Extract project conventions
}
```

**Example Configuration:**

```javascript
import { SemanticMemory } from './lib/semantic-memory.mjs';
import { MemoryPromotion } from './lib/memory-promotion.mjs';
import { MemoryRetrieval } from './lib/memory-retrieval.mjs';
import { LearningExtractor } from './lib/learning-extractor.mjs';

// Semantic Memory
const memory = new SemanticMemory('.aiwg/knowledge');

// Memory Promotion
const promotion = new MemoryPromotion({
  autoPromote: true,
  minFrequency: 3,
  minSuccessRate: 0.7,
  reviewThreshold: 0.5,
});

// Memory Retrieval
const retrieval = new MemoryRetrieval({
  maxResults: 10,
  relevanceThreshold: 0.5,
  diversityFactor: 0.3,
});

// Learning Extractor
const extractor = new LearningExtractor({
  minConfidence: 0.6,
  extractStrategies: true,
  extractAntipatterns: true,
  extractEstimates: true,
  extractConventions: true,
});

// Store a learning
await memory.store({
  type: 'strategy',
  taskType: 'feature',
  content: {
    description: "Use test-first for auth features",
    reasoning: "Reduces security bugs",
    applicability: ["auth", "security"],
  },
  confidence: 0.85,
  sourceLoops: ['ralph-001'],
});

// Retrieve relevant learnings
const learnings = await retrieval.retrieve({
  objective: "Add OAuth2 authentication",
  taskType: "feature",
  tags: ["auth", "security"],
});

console.log(`Found ${learnings.length} relevant learnings`);
```

---

## Overseer Layer Configuration

The Overseer Layer provides autonomous health monitoring, behavior detection, intervention, and escalation.

### Overseer Options

```javascript
{
  enabled: true,                   // Enable overseer monitoring
  checkInterval: 'every_iteration', // every_iteration|every_N|manual
  storagePath: '.aiwg/ralph-external/overseer',  // Log storage
  autoEscalate: true,              // Auto-escalate critical issues
  healthThresholds: {              // Health check thresholds
    progressRate: 0.1,             // Minimum progress per iteration
    maxStuckIterations: 3,         // Max iterations without progress
  },
}
```

**Health Check Frequency:**

- `every_iteration`: After each iteration (default)
- `every_N`: Every N iterations (e.g., `checkInterval: 2`)
- `manual`: Only when explicitly called

### Behavior Detector Options

```javascript
{
  // Stuck Detection
  stuckThreshold: 3,               // Iterations without progress
  stuckProgressDelta: 0.02,        // < 2% change = stuck

  // Oscillation Detection
  oscillationWindow: 5,            // Check last 5 iterations
  oscillationThreshold: 3,         // 3+ direction changes = oscillation

  // Regression Detection
  regressionSensitivity: 0.1,      // 10% quality drop = regression
  regressionWindow: 3,             // Compare to best in last 3 iterations

  // Deviation Detection
  deviationThreshold: 0.5,         // 50% off-objective = deviation

  // Resource Burn Detection
  resourceBurnThreshold: 0.8,      // 80% budget with <50% progress
}
```

**Detected Behaviors:**

| Behavior | Detection Logic | Severity |
|----------|----------------|----------|
| `stuck` | No progress for `stuckThreshold` iterations | high |
| `oscillation` | Direction changes >= `oscillationThreshold` in window | medium |
| `regression` | Quality drops by >= `regressionSensitivity` | high |
| `deviation` | Off-objective score >= `deviationThreshold` | critical |
| `resource_burn` | Budget usage disproportionate to progress | high |

### Intervention System Options

```javascript
{
  levels: ['LOG', 'WARN', 'REDIRECT', 'PAUSE', 'ABORT'],  // Intervention levels
  autoEscalate: true,              // Escalate severity automatically
  pauseRequiresHuman: true,        // PAUSE level requires human approval
  interventionLog: '.aiwg/ralph-external/interventions.log',
}
```

**Intervention Levels:**

| Level | Trigger | Action |
|-------|---------|--------|
| `LOG` | Minor issue | Log to file, continue |
| `WARN` | Moderate issue | Display warning, continue |
| `REDIRECT` | Significant issue | Inject corrective guidance |
| `PAUSE` | Critical issue | Pause loop, await human decision |
| `ABORT` | Fatal issue | Terminate loop immediately |

**Intervention Strategies:**

```javascript
{
  stuck: {
    level: 'REDIRECT',
    action: 'inject_strategy_change',
    message: "No progress for 3 iterations. Try different approach.",
  },
  oscillation: {
    level: 'WARN',
    action: 'suggest_simplification',
    message: "Detected oscillation. Simplify task or add constraints.",
  },
  regression: {
    level: 'REDIRECT',
    action: 'rollback_to_best',
    message: "Quality regressed. Reverting to best iteration.",
  },
  deviation: {
    level: 'PAUSE',
    action: 'require_human_review',
    message: "Objective deviation detected. Human review required.",
  },
  resource_burn: {
    level: 'PAUSE',
    action: 'budget_review',
    message: "Budget usage inefficient. Review strategy.",
  },
}
```

### Escalation Handler Options

```javascript
{
  desktop: true,                   // Show desktop notification
  gitea: {
    enabled: false,                // Create Gitea issue
    repo: 'roctinam/ai-writing-guide',  // Repository
    labels: ['ralph-escalation'],  // Issue labels
  },
  webhook: null,                   // Webhook URL for escalations
  slack: null,                     // Slack webhook (not yet implemented)
  email: null,                     // Email config (not yet implemented)
}
```

**Escalation Levels:**

| Level | Trigger | Notification |
|-------|---------|--------------|
| `INFO` | Informational | Desktop notification (if enabled) |
| `WARNING` | Moderate issue | Desktop + log |
| `CRITICAL` | Severe issue | Desktop + Gitea issue (if enabled) |
| `EMERGENCY` | Fatal issue | Desktop + Gitea + webhook (if configured) |

**Example Configuration:**

```javascript
import { Overseer } from './lib/overseer.mjs';
import { BehaviorDetector } from './lib/behavior-detector.mjs';
import { InterventionSystem } from './lib/intervention-system.mjs';
import { EscalationHandler } from './lib/escalation-handler.mjs';

// Behavior Detector
const detector = new BehaviorDetector({
  stuckThreshold: 3,
  oscillationWindow: 5,
  regressionSensitivity: 0.1,
  deviationThreshold: 0.5,
  resourceBurnThreshold: 0.8,
});

// Intervention System
const intervention = new InterventionSystem({
  levels: ['LOG', 'WARN', 'REDIRECT', 'PAUSE', 'ABORT'],
  autoEscalate: true,
  pauseRequiresHuman: true,
  onPause: (intervention) => {
    console.log('PAUSED:', intervention.reason);
    // Await human decision
  },
  onAbort: (intervention) => {
    console.log('ABORTED:', intervention.reason);
    process.exit(1);
  },
});

// Escalation Handler
const escalation = new EscalationHandler({
  desktop: true,
  gitea: {
    enabled: true,
    repo: 'roctinam/ai-writing-guide',
    labels: ['ralph-escalation', 'urgent'],
  },
  webhook: 'https://hooks.example.com/ralph',
});

// Overseer
const overseer = new Overseer('ralph-001', 'Fix authentication tests', {
  storagePath: '.aiwg/ralph-external/overseer',
  detectorOptions: {
    stuckThreshold: 3,
    oscillationWindow: 5,
  },
  interventionOptions: {
    autoEscalate: true,
    pauseRequiresHuman: true,
  },
  escalationOptions: {
    desktop: true,
    gitea: { enabled: true, repo: 'roctinam/ai-writing-guide' },
  },
  autoEscalate: true,
  onHealthCheck: (check) => {
    console.log(`Health: ${check.status}`);
    if (check.detections.length > 0) {
      console.log('Detections:', check.detections);
    }
  },
});

// Run health check after each iteration
const healthCheck = await overseer.check(iterationResult);
console.log(`Health status: ${healthCheck.status}`);
console.log(`Detections: ${healthCheck.detections.length}`);
console.log(`Interventions: ${healthCheck.interventions.length}`);
```

---

## Environment Variables

Epic #26 respects these environment variables:

| Variable | Purpose | Default |
|----------|---------|---------|
| `AIWG_RALPH_PID_ENABLED` | Enable/disable PID control | `true` |
| `AIWG_RALPH_OVERSEER_ENABLED` | Enable/disable overseer | `true` |
| `AIWG_RALPH_MEMORY_ENABLED` | Enable/disable semantic memory | `true` |
| `AIWG_KNOWLEDGE_DIR` | Knowledge directory for L3 memory | `.aiwg/knowledge` |
| `AIWG_RALPH_VERBOSE` | Enable verbose logging | `false` |
| `CLAUDE_MODEL` | Claude model for intelligence layer | `claude-sonnet-4-20250514` |
| `AIWG_GITEA_TOKEN` | Gitea API token for escalations | (none) |
| `AIWG_GITEA_REPO` | Gitea repository for issues | (none) |

**Usage:**

```bash
# Disable PID control for this run
AIWG_RALPH_PID_ENABLED=false ralph-external "Fix tests" --completion "npm test"

# Use custom knowledge directory
AIWG_KNOWLEDGE_DIR=/shared/knowledge ralph-external "Add OAuth2" ...

# Enable verbose logging
AIWG_RALPH_VERBOSE=true ralph-external "Refactor auth" ...

# Configure Gitea escalations
AIWG_GITEA_TOKEN=$(cat ~/.config/gitea/token) \
AIWG_GITEA_REPO=roctinam/ai-writing-guide \
ralph-external "Critical security fix" --completion "tests pass"
```

---

## Configuration Examples

### Conservative Configuration (Strict Oversight)

For high-risk tasks: security, breaking changes, compliance.

```javascript
await orchestrator.execute({
  objective: "Migrate to new auth system",
  completionCriteria: "All security tests pass",
  maxIterations: 15,
  budgetPerIteration: 3.0,

  // PID Control: Conservative
  enablePIDControl: true,
  pidConfig: {
    windowSize: 5,
    integralDecay: 0.95,    // Slower decay
    noiseThreshold: 0.02,   // Less noise filtering
    adaptiveGains: true,
    initialProfile: 'conservative',  // Low gains, high damping
    transitionSmoothing: 0.5,        // Slow transitions
    thresholds: {
      divergenceThreshold: 0.3,      // Stricter divergence
      oscillationWindow: 5,
      saturationDuration: 2,         // Quick saturation detection
    },
  },

  // Claude Intelligence: Strict Validation
  claudeIntelligence: {
    enabled: true,
    model: 'claude-sonnet-4-20250514',
    maxPromptTokens: 4000,
    fallbackEnabled: true,
  },
  validation: {
    preIteration: {
      checkBuild: true,
      checkGit: true,
      checkDependencies: true,
      checkLint: true,       // Enable linting
    },
    postIteration: {
      checkTests: true,
      checkRegression: true,
      checkCoverage: true,   // Enable coverage check
    },
  },
  strategyPlanner: {
    confidenceThreshold: 0.7,     // Higher confidence required
    escalationThreshold: 0.5,     // Earlier escalation
  },

  // Memory: Full Learning
  enableSemanticMemory: true,
  semanticMemory: {
    enabled: true,
    storagePath: '.aiwg/knowledge',
    maxEntries: 1000,
    checksumVerification: true,
  },
  memoryPromotion: {
    autoPromote: true,
    minFrequency: 2,         // Lower bar for promotion
    minSuccessRate: 0.8,     // Higher success requirement
  },

  // Overseer: Aggressive Monitoring
  enableOverseer: true,
  overseer: {
    enabled: true,
    checkInterval: 'every_iteration',
    autoEscalate: true,
    healthThresholds: {
      progressRate: 0.15,    // Higher minimum progress
      maxStuckIterations: 2,  // Lower stuck tolerance
    },
  },
  behaviorDetector: {
    stuckThreshold: 2,       // Detect stuck faster
    oscillationWindow: 5,
    regressionSensitivity: 0.05,  // More sensitive
  },
  intervention: {
    levels: ['LOG', 'WARN', 'REDIRECT', 'PAUSE', 'ABORT'],
    autoEscalate: true,
    pauseRequiresHuman: true,
  },
  escalation: {
    desktop: true,
    gitea: {
      enabled: true,
      repo: 'roctinam/ai-writing-guide',
      labels: ['ralph-escalation', 'security', 'critical'],
    },
  },
});
```

### Balanced Configuration (Default)

For typical development tasks.

```javascript
await orchestrator.execute({
  objective: "Implement user profile page",
  completionCriteria: "Profile page renders with user data",
  maxIterations: 10,
  budgetPerIteration: 2.0,

  // Use defaults for most settings
  enablePIDControl: true,        // Uses standard profile
  enableOverseer: true,          // Standard monitoring
  enableSemanticMemory: true,    // L3 learning enabled
  enableAnalytics: true,
  enableBestOutput: true,
  enableEarlyStopping: true,
  crossTask: true,

  // Minimal overrides
  validation: {
    postIteration: {
      checkTests: true,
      checkCoverage: false,  // Disable coverage for speed
    },
  },
});
```

### Aggressive Configuration (Minimal Intervention)

For simple tasks: documentation, config, straightforward fixes.

```javascript
await orchestrator.execute({
  objective: "Update README with new examples",
  completionCriteria: "README includes 3 new examples",
  maxIterations: 5,
  budgetPerIteration: 1.0,

  // PID Control: Aggressive
  enablePIDControl: true,
  pidConfig: {
    initialProfile: 'aggressive',  // High gains, low damping
    adaptiveGains: false,          // Keep aggressive throughout
  },

  // Claude Intelligence: Minimal Validation
  validation: {
    preIteration: {
      checkBuild: false,     // Skip build for docs
      checkGit: true,
      checkDependencies: false,
      checkLint: false,
    },
    postIteration: {
      checkTests: false,     // No tests for docs
      checkRegression: false,
    },
  },

  // Memory: Enabled but not critical
  enableSemanticMemory: true,

  // Overseer: Relaxed Monitoring
  enableOverseer: true,
  overseer: {
    checkInterval: 2,        // Every 2 iterations
    autoEscalate: false,     // Manual escalation only
  },
  behaviorDetector: {
    stuckThreshold: 5,       // Higher tolerance
    oscillationWindow: 10,   // Wider window
    regressionSensitivity: 0.2,  // Less sensitive
  },
  intervention: {
    levels: ['LOG', 'WARN'],  // No PAUSE/ABORT for docs
    autoEscalate: false,
  },
  escalation: {
    desktop: false,          // No notifications
    gitea: { enabled: false },
  },
});
```

---

## Configuration Validation

### Validation Checklist

Before starting a Ralph loop, validate your configuration:

- [ ] All required flags are set (`objective`, `completionCriteria`)
- [ ] PID profile matches task risk level
- [ ] Validation checks are appropriate for task type
- [ ] Overseer thresholds align with task complexity
- [ ] Escalation channels are configured and tested
- [ ] Budget and iteration limits are reasonable
- [ ] Memory storage paths are accessible

### Programmatic Validation

```javascript
import { validateConfig } from './lib/config-validator.mjs';

const config = {
  objective: "Fix authentication",
  completionCriteria: "All tests pass",
  maxIterations: 10,
  // ... full config
};

const validation = validateConfig(config);

if (!validation.valid) {
  console.error('Configuration errors:');
  validation.errors.forEach(err => {
    console.error(`  - ${err.field}: ${err.message}`);
  });
  process.exit(1);
}

console.log('Configuration validated successfully');
```

### Common Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing objective` | No task description | Add `objective` field |
| `Missing completionCriteria` | No success criteria | Add `completionCriteria` field |
| `Invalid profile` | Unknown gain profile | Use one of: conservative, standard, aggressive, recovery, cautious |
| `Invalid threshold` | Out of range (0-1) | Set threshold between 0 and 1 |
| `Invalid model` | Unknown Claude model | Use valid model ID |
| `Conflicting flags` | Contradictory settings | `enablePIDControl: false` but `pidConfig` present |

### Configuration Debugging

Enable verbose mode to see configuration loading:

```bash
AIWG_RALPH_VERBOSE=true ralph-external "Fix tests" --completion "tests pass"
```

Output:
```
[Config] Loading configuration...
[Config] PID Control: ENABLED
[Config]   Profile: standard
[Config]   Gains: Kp=0.5, Ki=0.15, Kd=0.25
[Config] Overseer: ENABLED
[Config]   Check interval: every_iteration
[Config]   Auto-escalate: true
[Config] Semantic Memory: ENABLED
[Config]   Storage: .aiwg/knowledge
[Config]   Max entries: 1000
[Config] Configuration validated successfully
```

---

## Advanced Configuration

### Custom Gain Profile

Define custom PID gains for specialized tasks:

```javascript
const CUSTOM_PROFILES = {
  mlTraining: {
    name: 'mlTraining',
    kp: 0.4,    // Moderate response
    ki: 0.3,    // Higher accumulation for long-running tasks
    kd: 0.15,   // Lower damping (expect variability)
    description: 'Machine learning model training tasks',
  },
};

await orchestrator.execute({
  objective: "Train sentiment analysis model",
  completionCriteria: "Accuracy > 95%",
  pidConfig: {
    initialProfile: CUSTOM_PROFILES.mlTraining,
  },
});
```

### Dynamic Configuration Updates

Update configuration during execution:

```javascript
// Start with conservative settings
const orchestrator = new Orchestrator(projectRoot);

await orchestrator.execute({
  objective: "Complex refactoring",
  completionCriteria: "All tests pass",
  initialProfile: 'conservative',

  // Callback to adjust configuration
  onIterationComplete: async (iteration, state) => {
    // If task is simpler than expected, switch to standard
    if (iteration.number === 3 && state.progress > 0.5) {
      console.log('Task easier than expected, switching to standard profile');
      orchestrator.pidController.gainScheduler.setProfile('standard');
    }
  },
});
```

### Multi-Loop Coordination

Configure coordination across multiple concurrent loops:

```javascript
import { ExternalMultiLoopStateManager } from './external-multi-loop-state-manager.mjs';

const multiLoop = new ExternalMultiLoopStateManager(projectRoot);

// Enforce concurrent loop limit
const activeLoops = multiLoop.listActiveLoops();
if (activeLoops.length >= 3) {
  console.error('Maximum 3 concurrent loops allowed');
  process.exit(1);
}

// Register loop with coordination
await orchestrator.execute({
  objective: "Parallel task 1",
  completionCriteria: "Task 1 complete",
  force: false,  // Respect concurrent limit
});
```

---

## References

- **Epic #26**: @.aiwg/working/issue-ralph-external-completion.md
- **Issue #22**: Claude Intelligence Layer
- **Issue #23**: PID Control Layer
- **Issue #24**: Memory Layer
- **Issue #25**: Overseer Layer
- **REF-015**: Self-Refine (Best Output Selection)
- **REF-021**: Reflexion (Memory and Learning)
- **REF-013**: MetaGPT (Executable Feedback)

---

## Changelog

### 1.0.0 (2026-02-03)
- Initial comprehensive configuration reference
- All four Epic #26 layers documented
- Configuration examples for conservative/balanced/aggressive modes
- Environment variable documentation
- Validation guidelines

---

**Next Steps**:
1. Implement configuration file support (YAML/JSON)
2. Add configuration migration tool for version upgrades
3. Create configuration templates for common task types
4. Add configuration validation CLI command
