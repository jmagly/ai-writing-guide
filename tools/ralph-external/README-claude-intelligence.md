# Claude Intelligence Layer

AI-powered iteration guidance that transforms External Ralph from a simple retry loop into an adaptive, learning system. The Claude Intelligence layer analyzes iteration history, learns from patterns, and generates strategic prompts that improve with each cycle.

---

## Overview

The Intelligence layer adds three critical capabilities to External Ralph:

1. **ClaudePromptGenerator** - Generates dynamic, context-aware prompts that adapt to project state
2. **ValidationAgent** - Quality gates that catch regressions before and after iterations
3. **StrategyPlanner** - High-level iteration strategy based on progress patterns

Together, these components enable External Ralph to:

- **Learn from history** - Previous iterations inform future approaches
- **Adapt to obstacles** - Detect stuck patterns and recommend pivots
- **Prevent regressions** - Validate that iterations improve rather than degrade quality
- **Escalate intelligently** - Recognize when human intervention is needed

## Why Intelligence vs Simple Retry

A naive retry loop repeats the same approach until it succeeds or times out. The Intelligence layer transforms this into a learning system:

| Without Intelligence | With Intelligence |
|---------------------|-------------------|
| Same prompt every iteration | Prompts evolve based on progress and blockers |
| No validation between iterations | Pre/post validation catches regressions early |
| Continues until timeout | Detects stuck patterns and pivots strategy |
| No learning from failures | Accumulates learnings and adjusts approach |
| Random retry on errors | Strategic approach based on error patterns |

**Example**: Without intelligence, a failing test might trigger 10 identical retry attempts. With intelligence, iteration 1 tries the original approach, iteration 2 analyzes why it failed and tries debugging, iteration 3 detects a stuck pattern and suggests a different solution path.

## Two-Phase Approach

The Intelligence layer operates in two phases per iteration:

### Phase 1: Pre-Iteration (Planning)

**Before spawning Claude session:**

1. **ValidationAgent.validatePre()** - Verify project is in good state
   - Git conflicts? → Block iteration
   - Missing dependencies? → Warn but continue
   - Existing blockers documented? → Surface to prompt

2. **StrategyPlanner.plan()** - Analyze history and recommend approach
   - Stuck for 3+ iterations? → "pivot" strategy
   - Regressing? → "review and rollback" strategy
   - Improving? → "persist" strategy

3. **ClaudePromptGenerator.generate()** - Build strategic prompt
   - Incorporate validation issues
   - Apply strategy recommendations
   - Include relevant learnings from history
   - Suggest appropriate tools

### Phase 2: Post-Iteration (Validation)

**After Claude session completes:**

1. **ValidationAgent.validatePost()** - Check for regressions
   - Tests failing? → Flag as regression
   - Build broken? → Critical issue
   - New lint errors? → Warning

2. **Learning extraction** - Capture patterns
   - What was attempted?
   - What worked/failed?
   - What should be remembered?

3. **Strategy update** - Feed results back to planner
   - Progress made? → Continue current strategy
   - No progress? → Increment stuck counter
   - Regression? → Consider rollback

## Component 1: ClaudePromptGenerator

**Purpose:** Replace static template prompts with AI-generated strategic prompts that adapt to iteration context.

### How It Works

The generator uses Claude to analyze iteration state and generate optimal prompts:

```javascript
import { ClaudePromptGenerator } from './lib/claude-prompt-generator.mjs';

const generator = new ClaudePromptGenerator({
  model: 'sonnet',  // Which Claude model to use for prompt generation
  timeout: 90000,   // 90 second timeout
  verbose: true,
});

const prompt = await generator.generate({
  objective: 'Fix authentication tests',
  completionCriteria: 'npm test -- --grep auth passes',
  iteration: 3,
  maxIterations: 10,
  stateAssessment: {
    estimatedProgress: 45,
    phase: 'mid',
    accomplishments: ['Fixed login flow', 'Added password validation'],
    blockers: ['Token expiration logic failing'],
  },
  pidMetrics: {
    proportional: 0.55,  // 55% completion gap
    integral: 0.15,      // Accumulated error
    trend: 'improving',
    velocity: 0.10,      // +10% per iteration
  },
  strategyPlan: {
    approach: 'persist',
    reasoning: 'Making steady progress, continue current approach',
    priorities: ['Fix token expiration', 'Add edge case tests'],
  },
  validationResults: {
    passed: true,
    issues: [],
  },
  learnings: [
    'Token TTL was hardcoded to 60 seconds',
    'Need to update config to 3600 seconds for production',
  ],
});

console.log(prompt.prompt);  // Main prompt text
console.log(prompt.focusAreas);  // ['Fix token expiration logic', ...]
console.log(prompt.toolSuggestions);  // ['Read', 'Edit', 'Bash']
```

### Analysis Prompt Structure

The generator asks Claude to analyze:

1. **Task Information** - Objective, criteria, iteration number
2. **Current State** - Progress, accomplishments, blockers
3. **Control Metrics** - Completion gap, trend, velocity
4. **Recommended Strategy** - Approach and priorities
5. **Validation Results** - Pre-iteration issues

Claude returns structured JSON:

```json
{
  "prompt": "Fix authentication token expiration issue...",
  "systemContext": "Iteration 3 of authentication test fixes",
  "focusAreas": [
    "Update TOKEN_TTL in auth/config.ts from 60 to 3600",
    "Verify tests pass with new TTL",
    "Check for hardcoded timeout assumptions"
  ],
  "reasoning": "Token expiration is primary blocker. Should be quick fix.",
  "urgency": "normal"
}
```

### Tool Suggestions

The generator intelligently suggests tools based on context:

| Context | Suggested Tools |
|---------|----------------|
| Early phase (exploration) | Glob, Grep, Read |
| Mid/late phase (implementation) | Edit, Write, Bash |
| Test files changed | Bash (for running tests) |
| Validation issues detected | Grep (find issues), Edit (fix) |
| Debug strategy | Bash (debug commands), Grep (search logs) |

### Fallback Behavior

If Claude invocation fails (timeout, API error, rate limit):

```javascript
// Generator automatically falls back to template-based prompt
const fallback = {
  prompt: `# Continue External Ralph Loop

**Objective**: ${objective}
**Completion Criteria**: ${completionCriteria}
**Iteration**: ${iteration} / ${maxIterations}

## Priority: Address Blockers
- ${blockers.join('\n- ')}

## Instructions
1. Continue working toward objective
2. Address blockers first
3. Update .aiwg/ artifacts
4. Signal completion with: {"ralph_external_completion": true}
  `,
  systemContext: `Resuming iteration ${iteration}`,
  focusAreas: blockers,
  toolSuggestions: ['Read', 'Write', 'Edit', 'Bash'],
  metadata: {
    model: 'fallback',
    reasoning: 'Claude generation failed, using template',
  },
};
```

### Configuration Options

```javascript
new ClaudePromptGenerator({
  model: 'sonnet',         // 'opus' | 'sonnet' | 'haiku'
  timeout: 90000,          // Generation timeout (ms)
  verbose: false,          // Log generation process
});
```

### Validation

Every generated prompt is validated:

```javascript
const validation = generator.validatePrompt(generated);

if (!validation.valid) {
  console.warn('Prompt quality issues:', validation.issues);
  // Issues like:
  // - "Prompt too short (< 50 characters)"
  // - "Missing completion signal instructions"
  // - "No focus areas specified"
}
```

## Component 2: ValidationAgent

**Purpose:** Quality gates that prevent iterations from introducing regressions or continuing in degraded states.

### Pre-Iteration Validation

Runs **before** spawning Claude session to verify project is in good state:

```javascript
import { ValidationAgent } from './lib/validation-agent.mjs';

const validator = new ValidationAgent({
  projectRoot: '/path/to/project',
  runTests: true,        // Run npm test
  checkBuild: true,      // Run build checks
  checkLint: true,       // Run linting
  timeout: 60000,        // Command timeout
  verbose: true,
});

const preValidation = await validator.validatePre({
  iteration: 2,
  objective: 'Fix tests',
});

if (!preValidation.passed) {
  console.log('Pre-validation failed:', preValidation.severity);

  for (const issue of preValidation.issues) {
    console.log(`[${issue.severity}] ${issue.message}`);
    if (issue.suggestion) {
      console.log(`  → ${issue.suggestion}`);
    }
  }

  // Decide: block iteration or continue with warnings
}
```

**Pre-Validation Checks:**

| Check | Severity | Action |
|-------|----------|--------|
| Git merge conflicts | critical | Block iteration |
| Missing node_modules | warning | Warn, continue |
| Documented blockers (.aiwg/working/BLOCKERS.md) | warning | Surface to prompt |

**Example output:**

```
Validation: FAILED (warning)

Issues:
  [WARNING] node_modules not found but package.json exists
    → Run npm install or pnpm install
  [WARNING] Blocker file exists in .aiwg/working/BLOCKERS.md
    → Review and address documented blockers
```

### Post-Iteration Validation

Runs **after** Claude session completes to detect regressions:

```javascript
const postValidation = await validator.validatePost(
  { iteration: 2 },
  { exitCode: 0, sessionId: 'uuid-123' }
);

if (!postValidation.passed) {
  console.log('Post-validation detected regressions!');

  // Typical regression indicators:
  // - Tests that passed before now fail
  // - Build broken
  // - New lint errors
  // - Import errors
}
```

**Post-Validation Checks:**

| Check | What It Detects | Severity |
|-------|----------------|----------|
| npm test | Test failures | error |
| tsc --noEmit | TypeScript build errors | error |
| npm run lint | Linting errors | warning |
| Import analysis | Broken imports | error |

**Example regression detection:**

```javascript
// Iteration 1 ends with all tests passing
// Iteration 2 makes changes
// Post-validation detects:

{
  passed: false,
  severity: 'error',
  issues: [
    {
      type: 'test_failure',
      severity: 'error',
      message: '3 test(s) failing',
      suggestion: 'Fix failing tests before continuing',
    },
  ],
  details: {
    tests: {
      ran: true,
      passed: 12,
      failed: 3,
      total: 15,
    },
  },
}
```

### Handling Validation Failures

Integration with loop control:

```javascript
// In orchestrator.mjs
const preValidation = await validationAgent.validatePre(context);

if (preValidation.severity === 'critical') {
  // Block iteration entirely
  console.error('Critical validation failure, aborting iteration');
  return { success: false, reason: 'validation_critical' };
}

if (preValidation.severity === 'error') {
  // Include in prompt as high-priority tasks
  prompt.priorities.unshift(...preValidation.issues.map(i => i.message));
}

// After iteration
const postValidation = await validationAgent.validatePost(context, output);

if (postValidation.severity === 'error') {
  // Mark iteration as regression
  state.iterations[currentIteration].regression = true;

  // Consider rollback or repair
  if (strategyPlanner.shouldEscalate(history, metrics)) {
    // Escalate to human for intervention
    await escalationHandler.escalate({
      reason: 'post_validation_failure',
      details: postValidation,
    });
  }
}
```

### Configuration

```javascript
new ValidationAgent({
  projectRoot: '/path/to/project',
  runTests: true,          // Enable test execution
  checkBuild: true,        // Enable build validation
  checkLint: true,         // Enable linting
  timeout: 60000,          // Command timeout (ms)
  verbose: false,          // Log validation details
});
```

## Component 3: StrategyPlanner

**Purpose:** High-level iteration strategy based on progress patterns and PID control signals.

### Situation Analysis

The planner analyzes iteration history to detect patterns:

```javascript
import { StrategyPlanner } from './lib/strategy-planner.mjs';

const planner = new StrategyPlanner({
  stuckThreshold: 3,           // Iterations to consider stuck
  oscillationThreshold: 3,     // Sign changes for oscillation
  escalationThreshold: 7,      // Iterations before escalation
  verbose: true,
});

const strategy = planner.plan(history, metrics);

console.log(strategy.approach);   // 'persist' | 'pivot' | 'escalate'
console.log(strategy.reasoning);  // Why this strategy was chosen
console.log(strategy.priorities); // Ordered priority list
console.log(strategy.confidence); // 0.0 to 1.0
```

### Detected Situations

| Situation | Detection Logic | Confidence |
|-----------|----------------|------------|
| **stuck** | No progress (< 5% change) for N iterations | 0.85 |
| **oscillating** | Multiple sign changes in progress direction | 0.70 |
| **regressing** | Negative progress trend | 0.75 |
| **improving** | Positive progress trend | 0.80 |
| **nearCompletion** | Progress >= 80% | 0.90 |
| **hasBlockers** | Blockers detected in latest iteration | 0.90 |

**Example situation analysis:**

```javascript
const situation = {
  stuck: false,
  oscillating: false,
  regressing: false,
  improving: true,
  nearCompletion: false,
  hasBlockers: false,
  repeatedIssues: [],
  trend: 'improving',  // From PID metrics
};
```

### Strategy Selection

Based on situation, the planner recommends one of three strategies:

#### 1. Persist Strategy

**When:** Making good progress, near completion, or normal early iterations

```javascript
{
  approach: 'persist',
  reasoning: 'Making good progress. Continue current strategy.',
  priorities: [
    'Continue current implementation',
    'Maintain test coverage',
    'Document progress',
  ],
  adjustments: {},
  confidence: 0.80,
}
```

#### 2. Pivot Strategy

**When:** Stuck, oscillating, regressing, or blockers detected

```javascript
{
  approach: 'pivot',
  reasoning: 'No meaningful progress for 3+ iterations. Try different approach.',
  priorities: [
    'Try fundamentally different approach',
    'Simplify scope or break down task',
  ],
  adjustments: {
    temperature: 0.8,         // Increase creativity
    reframeProblem: true,
    constrainScope: true,
  },
  confidence: 0.85,
}
```

**Pivot scenarios:**

| Trigger | Strategy Adjustment |
|---------|-------------------|
| Stuck 3+ iterations | Increase temperature, reframe problem |
| Oscillating | Constrain scope, require progress commits |
| Regressing | Review recent changes, consider rollback |
| Blockers detected | Focus on blocker resolution, debug tools |

#### 3. Escalate Strategy

**When:** Beyond iteration limit or stuck too long

```javascript
const shouldEscalate = planner.shouldEscalate(history, metrics);

if (shouldEscalate) {
  // Reasons to escalate:
  // - Reached max iterations (7+)
  // - Stuck for 5+ iterations
  // - Regressing for 4+ iterations
}
```

### Priority Building

The planner generates prioritized task lists:

```javascript
// Example: Blockers detected
priorities: [
  'Address repeated issue: "Token expiration failing"',
  'Identify and resolve current blockers',
]

// Example: Stuck pattern
priorities: [
  'Try fundamentally different approach',
  'Simplify scope or break down task',
]

// Example: Near completion
priorities: [
  'Complete remaining tasks',
  'Validate all acceptance criteria',
  'Run final tests and checks',
]

// Example: Normal progress
priorities: [
  'Continue current implementation',
  'Maintain test coverage',
  'Document progress',
]
```

### Integration with PID Control

The strategy planner uses PID metrics to inform decisions:

```javascript
const pidMetrics = {
  proportional: 0.45,     // 45% completion gap
  integral: 0.12,         // Accumulated error
  derivative: -0.05,      // Slowing progress
  trend: 'regressing',    // Trend classification
  velocity: -0.05,        // -5% per iteration
};

const strategy = planner.plan(history, pidMetrics);

// If trend is 'regressing', planner recommends pivot even with few iterations
if (pidMetrics.trend === 'regressing') {
  strategy.approach = 'pivot';
  strategy.reasoning = 'Progress is regressing. Review recent changes.';
}
```

### Repeated Issue Detection

The planner tracks issues across iterations:

```javascript
// Track blockers mentioned in multiple iterations
const repeatedIssues = [
  { issue: 'Token expiration failing', count: 3 },
  { issue: 'Database connection timeout', count: 2 },
];

// Prioritize most frequent issue
strategy.priorities.unshift(
  `Address repeated issue: "${repeatedIssues[0].issue}"`
);
```

### Configuration

```javascript
new StrategyPlanner({
  stuckThreshold: 3,          // Iterations to detect stuck
  oscillationThreshold: 3,    // Sign changes for oscillation
  escalationThreshold: 7,     // Iterations before escalation
  verbose: false,             // Log strategy decisions
});
```

## Usage Examples

### Example 1: Basic Intelligence Layer Integration

```javascript
import { ClaudePromptGenerator } from './lib/claude-prompt-generator.mjs';
import { ValidationAgent } from './lib/validation-agent.mjs';
import { StrategyPlanner } from './lib/strategy-planner.mjs';

// Initialize components
const promptGen = new ClaudePromptGenerator({ model: 'sonnet' });
const validator = new ValidationAgent({ projectRoot: '.' });
const planner = new StrategyPlanner({ stuckThreshold: 3 });

// Pre-iteration workflow
async function beforeIteration(context) {
  // 1. Validate project state
  const preValidation = await validator.validatePre(context);

  if (preValidation.severity === 'critical') {
    throw new Error('Critical validation failure');
  }

  // 2. Plan strategy based on history
  const strategy = planner.plan(context.history, context.metrics);

  // 3. Generate intelligent prompt
  const prompt = await promptGen.generate({
    ...context,
    validationResults: preValidation,
    strategyPlan: strategy,
  });

  return { prompt, preValidation, strategy };
}

// Post-iteration workflow
async function afterIteration(context, output) {
  // Validate for regressions
  const postValidation = await validator.validatePost(context, output);

  if (!postValidation.passed) {
    console.warn('Regression detected:', postValidation.issues);
  }

  return { postValidation };
}
```

### Example 2: Adaptive Prompt Based on Stuck Pattern

```javascript
const history = [
  { iteration: 1, analysis: { completionPercentage: 20 } },
  { iteration: 2, analysis: { completionPercentage: 22 } },
  { iteration: 3, analysis: { completionPercentage: 21 } },
  // Stuck! Progress oscillating around 20-22%
];

const metrics = {
  proportional: 0.79,  // 79% gap remaining
  trend: 'stuck',
  velocity: 0.003,     // Almost no progress
};

const strategy = planner.plan(history, metrics);

// Strategy detects stuck pattern:
// {
//   approach: 'pivot',
//   reasoning: 'No meaningful progress for 3+ iterations. Try different approach.',
//   priorities: [
//     'Try fundamentally different approach',
//     'Simplify scope or break down task'
//   ],
//   confidence: 0.85
// }

const prompt = await promptGen.generate({
  objective: 'Implement user authentication',
  completionCriteria: 'Tests pass',
  iteration: 4,
  maxIterations: 10,
  stateAssessment: { estimatedProgress: 21, phase: 'early' },
  pidMetrics: metrics,
  strategyPlan: strategy,
  learnings: [
    'Attempted JWT approach - complex integration',
    'Attempted session cookies - CORS issues',
  ],
});

// Generated prompt will reflect pivot strategy:
// "Previous attempts have stalled around 20% completion.
//  Consider fundamentally different approach:
//  1. Simplify to basic auth first
//  2. Add advanced auth later
//  3. Break down into smaller increments"
```

### Example 3: Regression Detection and Recovery

```javascript
// Iteration 4 completes
const output = {
  exitCode: 0,
  sessionId: 'uuid-abc',
  filesChanged: ['src/auth/login.ts', 'test/auth.test.ts'],
};

// Post-validation detects regression
const postValidation = await validator.validatePost(
  { iteration: 4 },
  output
);

// Result:
// {
//   passed: false,
//   severity: 'error',
//   issues: [
//     {
//       type: 'test_failure',
//       message: '5 test(s) failing',
//       suggestion: 'Fix failing tests before continuing',
//     }
//   ]
// }

// Check if should escalate
const shouldEscalate = planner.shouldEscalate(history, metrics);

if (shouldEscalate) {
  await escalationHandler.escalate({
    reason: 'repeated_regression',
    iteration: 4,
    validationResults: postValidation,
  });
} else {
  // Plan recovery strategy for iteration 5
  const strategy = planner.plan(history, metrics);

  // Strategy will recommend:
  // approach: 'pivot'
  // reasoning: 'Regressing - review and possibly rollback changes'
  // priorities: [
  //   'Review recent changes for issues',
  //   'Consider reverting problematic changes'
  // ]
}
```

## Best Practices

### When to Use Claude Intelligence

**Use Intelligence Layer when:**

- Tasks span multiple iterations (> 2)
- Risk of regressions exists (test suite, build process)
- Need adaptive strategy (complex problems with multiple solutions)
- Long-running sessions (> 30 minutes per iteration)
- Learning from failures is valuable

**Skip Intelligence Layer when:**

- Single iteration is sufficient
- Simple, deterministic tasks
- No test suite or validation available
- Latency is critical (intelligence adds 10-30 seconds overhead)

### Tuning the Intelligence Layer

#### Prompt Generation

```javascript
// For creative tasks - use higher temperature model
new ClaudePromptGenerator({ model: 'opus', timeout: 120000 });

// For fast iterations - use lighter model
new ClaudePromptGenerator({ model: 'haiku', timeout: 30000 });

// Disable Claude generation entirely (use templates)
// Set environment variable: DISABLE_CLAUDE_PROMPTS=1
```

#### Validation Thresholds

```javascript
// Strict validation (block on warnings)
new ValidationAgent({
  runTests: true,
  checkBuild: true,
  checkLint: true,
  timeout: 120000,  // Allow longer for comprehensive checks
});

// Lenient validation (tests only, no lint)
new ValidationAgent({
  runTests: true,
  checkBuild: false,
  checkLint: false,
  timeout: 30000,
});
```

#### Strategy Sensitivity

```javascript
// Aggressive pivoting (detect stuck early)
new StrategyPlanner({
  stuckThreshold: 2,          // Pivot after 2 stuck iterations
  oscillationThreshold: 2,
  escalationThreshold: 5,     // Escalate sooner
});

// Patient approach (allow more exploration)
new StrategyPlanner({
  stuckThreshold: 5,          // Allow 5 stuck iterations
  oscillationThreshold: 4,
  escalationThreshold: 10,    // Escalate later
});
```

### Monitoring Intelligence Effectiveness

Track these metrics to tune intelligence layer:

```javascript
// Per-iteration metrics
const intelligenceMetrics = {
  promptGeneration: {
    duration: 8500,           // ms to generate prompt
    model: 'sonnet',
    fallbackUsed: false,
  },
  preValidation: {
    duration: 2300,
    issuesFound: 1,
    severity: 'warning',
  },
  postValidation: {
    duration: 45000,          // Test execution time
    issuesFound: 0,
    regressionDetected: false,
  },
  strategy: {
    approach: 'persist',
    confidence: 0.85,
    adjustmentsMade: 0,
  },
};

// Loop-level metrics
const loopMetrics = {
  totalIntelligenceOverhead: 55800,  // ms across all iterations
  pivotsTriggered: 1,
  escalationsAvoided: 2,
  regressionsDetected: 0,
  averagePromptQuality: 0.87,
};
```

### Fallback Strategies

The intelligence layer degrades gracefully:

1. **ClaudePromptGenerator fails** → Template-based prompts
2. **ValidationAgent fails** → Continue with warning
3. **StrategyPlanner confidence < 0.5** → Default to 'persist'

Always configure fallbacks:

```javascript
try {
  const prompt = await promptGen.generate(context);
} catch (error) {
  console.warn('Prompt generation failed, using template:', error);
  const prompt = buildTemplatePrompt(context);
}
```

## Performance Considerations

### Overhead by Component

| Component | Typical Duration | When Run |
|-----------|-----------------|----------|
| ClaudePromptGenerator | 5-15 seconds | Before each iteration |
| ValidationAgent (pre) | 1-3 seconds | Before each iteration |
| ValidationAgent (post) | 10-60 seconds | After each iteration |
| StrategyPlanner | < 100ms | Before each iteration |
| **Total Pre-Iteration** | **6-18 seconds** | Before spawning session |
| **Total Post-Iteration** | **10-60 seconds** | After session completes |

**Mitigation strategies:**

- Use `haiku` model for prompt generation (faster, lower cost)
- Disable validation for fast iterations (`runTests: false`)
- Cache validation results for unchanged files
- Run validation in parallel with other tasks

## Debugging Intelligence Layer

### Enable Verbose Logging

```javascript
const promptGen = new ClaudePromptGenerator({ verbose: true });
const validator = new ValidationAgent({ verbose: true });
const planner = new StrategyPlanner({ verbose: true });

// Output shows:
// [ClaudePromptGenerator] Generating dynamic prompt...
// [ClaudePromptGenerator] Claude invocation successful
// [ValidationAgent] Running pre-iteration validation...
// [ValidationAgent] Git check: clean
// [StrategyPlanner] Strategy Plan: { approach: 'persist', confidence: 0.8 }
```

### Inspect Generated Prompts

```javascript
const prompt = await promptGen.generate(context);

console.log('=== Generated Prompt ===');
console.log(prompt.prompt);
console.log('\n=== Focus Areas ===');
console.log(prompt.focusAreas);
console.log('\n=== Tool Suggestions ===');
console.log(prompt.toolSuggestions);
console.log('\n=== Metadata ===');
console.log(prompt.metadata);
```

### Validation Reports

```javascript
const validation = await validator.validatePost(context, output);

console.log(validator.format(validation));
// Validation: FAILED (error)
//
// Issues:
//   [ERROR] 3 test(s) failing
//     → Fix failing tests before continuing
//   [WARNING] 5 linting error(s)
//     → Fix linting errors
```

## Related Documentation

| Document | Purpose |
|----------|---------|
| [README.md](./README.md) | External Ralph overview |
| [README-state-assessor.md](./README-state-assessor.md) | Two-phase state assessment |
| [README-best-output-tracker.md](./README-best-output-tracker.md) | Non-monotonic output selection |
| [@.claude/rules/executable-feedback.md](../../.claude/rules/executable-feedback.md) | Test-driven iteration loops |

## References

- @.aiwg/research/findings/REF-015-self-refine.md - Iterative refinement research
- @.aiwg/research/findings/REF-021-reflexion.md - Learning from iteration history
- @.aiwg/research/findings/REF-013-metagpt.md - Executable feedback loops
- @.claude/rules/actionable-feedback.md - Feedback quality requirements
- @.claude/rules/thought-protocol.md - Reasoning transparency

---

**Status:** Production Ready
**Issues:** #22 - Claude Intelligence Layer
**Version:** 1.0.0
