# Ralph External Epic #26: Best Practices Guide

**Version:** 1.0.0
**Date:** 2026-02-03
**Status:** Active
**Epic:** [#26](https://git.integrolabs.net/roctinam/ai-writing-guide/issues/26)

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [Getting Started Best Practices](#getting-started-best-practices)
3. [Task Definition Best Practices](#task-definition-best-practices)
4. [PID Control Best Practices](#pid-control-best-practices)
5. [Claude Intelligence Best Practices](#claude-intelligence-best-practices)
6. [Memory Layer Best Practices](#memory-layer-best-practices)
7. [Oversight Best Practices](#oversight-best-practices)
8. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
9. [Team Usage Patterns](#team-usage-patterns)
10. [Performance Optimization](#performance-optimization)

---

## Philosophy

### "Iteration Beats Perfection"

Epic #26 embodies the principle that **intelligent iteration is more valuable than upfront perfection**. The four-layer architecture is designed to:

1. **Learn from mistakes** (Memory Layer) rather than avoid them
2. **Adapt dynamically** (PID Control) rather than plan exhaustively
3. **Self-correct autonomously** (Overseer) rather than abort on issues
4. **Improve prompts iteratively** (Claude Intelligence) rather than craft perfect templates

**Key insight:** The system treats each iteration as an experiment. Failures are data points that improve future iterations, not reasons to stop.

### When to Trust the Intelligent System

Epic #26 is most effective when you **trust its automation** in these areas:

| Area | Trust Level | Why |
|------|-------------|-----|
| **Prompt generation** | HIGH | Claude generates better context-aware prompts than static templates |
| **Gain scheduling** | HIGH | PID adapts to task dynamics better than fixed parameters |
| **Memory retrieval** | MEDIUM | Relevant learnings improve with corpus size over time |
| **Intervention timing** | MEDIUM | Overseer catches stuck/oscillating patterns humans might miss |
| **Strategy pivoting** | MEDIUM | Strategy planner detects when to change approach |

**Trust, but verify:** Enable verbose mode for the first few loops to understand how the system makes decisions. Once confident, let it run autonomously.

### When Manual Control Is Better

Override automation for:

1. **Highly novel tasks** - First-time task types (no memory to draw from)
2. **Security-critical work** - Human review trumps automation for breaking changes
3. **Rapidly changing requirements** - Frequent objective shifts confuse the system
4. **Very short tasks** - Overhead dominates benefit for 1-2 iteration tasks
5. **Known bad patterns** - If semantic memory has low-quality learnings, disable temporarily

### Finding the Right Balance

**Start automated, tune when needed:**

```bash
# First run: Full automation
ralph-external "Implement OAuth2" --completion "tests pass"

# Second run: Same task type with learnings
ralph-external "Implement SAML" --completion "tests pass"
# → Memory provides OAuth2 strategy automatically

# Third run: Tune if needed
ralph-external "Implement LDAP" --completion "tests pass" \
  --pid-profile conservative  # Override if last run was unstable
```

**The 80/20 rule:** 80% of the value comes from default configuration. Only tune the 20% that matters for your specific task.

---

## Getting Started Best Practices

### Start with Default Configuration

**DO:**
```bash
# First time using Epic #26 - use defaults
ralph-external "Fix authentication bugs" \
  --completion "npm test -- auth passes"
```

**Rationale:** Default configuration is tuned for typical development tasks. Starting simple lets you understand baseline behavior before customizing.

### Enable Layers Incrementally

If unfamiliar with Epic #26, enable layers one at a time:

**Week 1: PID Control Only**
```bash
export AIWG_RALPH_OVERSEER_ENABLED=false
export AIWG_RALPH_MEMORY_ENABLED=false

ralph-external "Task 1" --completion "criteria"
# Observe: How do control signals change? When does it pivot?
```

**Week 2: Add Overseer**
```bash
export AIWG_RALPH_OVERSEER_ENABLED=true
export AIWG_RALPH_MEMORY_ENABLED=false

ralph-external "Task 2" --completion "criteria"
# Observe: What interventions trigger? Are thresholds appropriate?
```

**Week 3: Add Memory**
```bash
export AIWG_RALPH_OVERSEER_ENABLED=true
export AIWG_RALPH_MEMORY_ENABLED=true

ralph-external "Task 3" --completion "criteria"
# Observe: What learnings are retrieved? Are they helpful?
```

**Week 4: Full System**
```bash
# All layers enabled (default)
ralph-external "Task 4" --completion "criteria"
```

### Monitor Before Tuning

**DO:**
```bash
# Enable verbose mode for first 5 loops
AIWG_RALPH_VERBOSE=true ralph-external "Task" --completion "criteria"

# Review logs after each iteration
tail -f .aiwg/ralph-external/iterations/001/stdout.log
```

**DON'T:**
```bash
# Don't tune blindly without understanding baseline
ralph-external "Task" --completion "criteria" \
  --pid-profile aggressive \
  --overseer-threshold 5 \
  --memory-min-confidence 0.9  # Too many changes at once
```

**Monitoring checklist:**

- [ ] Read completion report after first loop
- [ ] Check PID control signals (stdout shows `Control signal: 0.XX`)
- [ ] Review overseer health checks (`.aiwg/ralph-external/overseer/health-log.json`)
- [ ] Examine retrieved learnings (`.aiwg/knowledge/ralph-learnings.json`)
- [ ] Identify any repeated interventions (signals a tuning opportunity)

---

## Task Definition Best Practices

### Writing Clear, Measurable Completion Criteria

**GOOD:**
```bash
# Objective: Verifiable with automated check
ralph-external "Fix failing authentication tests" \
  --completion "npm test -- --testPathPattern=auth exits 0"

# Objective: Specific metric threshold
ralph-external "Improve test coverage" \
  --completion "npx nyc report | grep 'Statements.*: 80'"

# Objective: Multiple verifiable conditions
ralph-external "Migrate to TypeScript" \
  --completion "npx tsc --noEmit && npm test"
```

**BAD:**
```bash
# Too vague - what does "better" mean?
ralph-external "Make code better" \
  --completion "code is improved"

# Not verifiable - requires human judgment
ralph-external "Refactor authentication" \
  --completion "architecture is clean"

# Ambiguous - what is "most"?
ralph-external "Fix bugs" \
  --completion "most bugs are fixed"
```

**Criteria quality checklist:**

- [ ] Can be verified by running a command (test, lint, build, etc.)
- [ ] Returns clear success/failure (exit code 0/1)
- [ ] Doesn't require human interpretation
- [ ] Specific enough to guide iteration (not too broad)
- [ ] Achievable within iteration budget

### Providing Sufficient Context

**GOOD:**
```bash
# Context in objective, clear success criteria
ralph-external \
  "Migrate authentication from session-based to JWT, maintaining backward compatibility for 30 days" \
  --completion "npm test -- auth && npm run migration-check"
```

**BETTER:**
```bash
# Context + key files to monitor
ralph-external \
  "Migrate authentication to JWT (backward compatible)" \
  --completion "npm test -- auth && npm run migration-check" \
  --key-files "src/auth/session.ts,src/auth/jwt.ts,test/auth"
```

**BEST:**
```bash
# Context + key files + Claude assessment for complex migration
ralph-external \
  "Migrate authentication to JWT (backward compatible)" \
  --completion "npm test -- auth && npm run migration-check" \
  --key-files "src/auth/session.ts,src/auth/jwt.ts,test/auth" \
  --use-claude-assessment  # Claude evaluates progress beyond test pass/fail
```

### Scoping Tasks Appropriately

**Too Small** (overhead dominates):
```bash
# Single-line fix - use internal Ralph or do manually
ralph-external "Fix typo in README" --completion "spelling correct"
```

**Just Right** (sweet spot):
```bash
# 3-5 iterations expected, clear scope
ralph-external "Implement password reset flow" \
  --completion "npm test -- password-reset passes"
```

**Too Large** (scope creep risk):
```bash
# Too broad - break into sub-tasks
ralph-external "Build complete user management system" \
  --completion "all user features working"
```

**Scoping guidelines:**

| Task Type | Expected Iterations | Max Iterations | Budget/Iteration |
|-----------|---------------------|----------------|------------------|
| Bug fix (simple) | 1-2 | 3 | $1.0 |
| Bug fix (complex) | 3-5 | 8 | $2.0 |
| Feature (small) | 2-4 | 6 | $1.5 |
| Feature (medium) | 4-8 | 12 | $2.0 |
| Feature (large) | 8-15 | 20 | $3.0 |
| Refactoring | 5-10 | 15 | $2.5 |
| Migration | 10-20 | 30 | $4.0 |

### Examples: Good vs Bad Task Definitions

**Example 1: Authentication Feature**

❌ **Bad:**
```bash
ralph-external "Add login" --completion "login works"
```

**Issues:**
- Too vague objective
- Unverifiable completion
- No context about requirements

✅ **Good:**
```bash
ralph-external \
  "Implement email/password login with bcrypt hashing and session management" \
  --completion "npm test -- --testPathPattern=auth/login passes && npm run security-check"
```

**Why better:**
- Specific technical approach
- Verifiable success criteria
- Security validation included

**Example 2: Refactoring Task**

❌ **Bad:**
```bash
ralph-external "Clean up code" --completion "code is clean"
```

✅ **Good:**
```bash
ralph-external \
  "Extract authentication logic from controllers into dedicated auth service module" \
  --completion "npm test && npx eslint src/auth/ --max-warnings 0" \
  --key-files "src/controllers/,src/services/auth/"
```

**Example 3: Migration Task**

❌ **Bad:**
```bash
ralph-external "Update dependencies" --completion "packages updated"
```

✅ **Good:**
```bash
ralph-external \
  "Migrate from Express 4.x to Express 5.x while maintaining API compatibility" \
  --completion "npm test && npm run integration-tests && node scripts/verify-express5.js" \
  --max-iterations 15 \
  --budget 3.0 \
  --use-claude-assessment
```

---

## PID Control Best Practices

### When to Use Different Gain Profiles

**Conservative Profile** (`kp=0.3, ki=0.05, kd=0.4`):

**Use for:**
- Security-sensitive changes (auth, encryption, access control)
- Breaking changes (API contract changes, schema migrations)
- Production deployments
- Tasks with high rollback cost

**Example:**
```bash
ralph-external "Migrate to new encryption algorithm" \
  --completion "all encrypted data readable && security-scan passes" \
  --pid-profile conservative
```

**Why:** High derivative gain (`kd=0.4`) dampens oscillation, low integral gain (`ki=0.05`) prevents overreaction to noise. Perfect for high-stakes tasks.

---

**Standard Profile** (`kp=0.5, ki=0.15, kd=0.25`) - **DEFAULT**:

**Use for:**
- Typical development tasks
- Feature implementation
- Bug fixes
- Refactoring

**Example:**
```bash
# No need to specify - standard is default
ralph-external "Implement user profile page" \
  --completion "npm test -- profile passes"
```

**Why:** Balanced gains for normal task dynamics. Works for 80% of use cases.

---

**Aggressive Profile** (`kp=0.8, ki=0.25, kd=0.1`):

**Use for:**
- Documentation updates
- Configuration changes
- Simple fixes with clear solutions
- Tasks where fast iteration is valuable

**Example:**
```bash
ralph-external "Update README with new API examples" \
  --completion "markdownlint README.md passes" \
  --pid-profile aggressive
```

**Why:** High proportional gain (`kp=0.8`) responds quickly to completion gap. Low derivative (`kd=0.1`) allows rapid changes without damping.

---

**Recovery Profile** (`kp=1.0, ki=0.4, kd=-0.1`):

**Use for:**
- Stuck loops (manually switched)
- Oscillating tasks
- When default profiles aren't making progress

**Example:**
```bash
# Detected stuck pattern, switching to recovery
ralph-external "Complex state machine refactor" \
  --completion "tests pass" \
  --pid-profile recovery
```

**Why:** Maximum proportional/integral gains force aggressive action. Negative derivative (`kd=-0.1`) amplifies momentum changes to break stuck patterns.

---

**Cautious Profile** (`kp=0.2, ki=0.02, kd=0.5`):

**Use for:**
- Near-completion fine-tuning (auto-selected by gain scheduler)
- Tasks requiring precision over speed
- Situations where overcorrection is risky

**Auto-selected when:** `completionPercentage > 80%`

**Why:** Low gains prevent overshooting when close to goal. High derivative detects when to stop.

### Interpreting Control Signals

Control output is a value from 0.0 to 1.0 indicating "urgency of action":

| Signal Range | Interpretation | Suggested Behavior |
|--------------|----------------|-------------------|
| `0.0 - 0.3` | **Near completion** | Continue current approach, focus on finishing |
| `0.3 - 0.5` | **Moderate gap** | Maintain pace, monitor for blockers |
| `0.5 - 0.7` | **Significant gap** | Consider strategy adjustment if no progress in 2 iterations |
| `0.7 - 0.9` | **Critical gap** | Likely stuck or wrong approach - expect pivot |
| `0.9 - 1.0` | **Emergency** | Immediate intervention needed (overseer likely triggering) |

**Example control signal progression:**

```
Iteration 1: 0.85  (Critical gap - starting from scratch)
Iteration 2: 0.72  (Improving - made some progress)
Iteration 3: 0.55  (Moderate - steady progress)
Iteration 4: 0.38  (Near completion - almost done)
Iteration 5: 0.15  (Finishing - final touches)
```

**Healthy pattern:** Decreasing signal over iterations (converging).

**Unhealthy patterns:**

```
# Stuck pattern
Iteration 1: 0.80
Iteration 2: 0.78  (Minimal change)
Iteration 3: 0.79  (No progress)
Iteration 4: 0.81  (Slight regression)
→ Expect: Overseer REDIRECT or PAUSE

# Oscillating pattern
Iteration 1: 0.70
Iteration 2: 0.45  (Good progress)
Iteration 3: 0.68  (Regressed)
Iteration 4: 0.42  (Improved again)
→ Expect: PID dampening + Overseer WARNING
```

### When to Disable PID Control

**Disable when:**

1. **Task is deterministic** - Single clear path, no adaptation needed
   ```bash
   AIWG_RALPH_PID_ENABLED=false ralph-external \
     "Update version numbers in package.json" \
     --completion "grep '\"version\": \"2.0.0\"' package.json"
   ```

2. **Debugging Epic #26** - Isolate PID behavior
   ```bash
   AIWG_RALPH_PID_ENABLED=false ralph-external "Task" --completion "..."
   # See how loop behaves without adaptive gains
   ```

3. **Extremely simple tasks** (1-2 iterations max)
   ```bash
   # PID overhead not worth it
   AIWG_RALPH_PID_ENABLED=false ralph-external \
     "Fix typo in docs" \
     --completion "docs updated"
   ```

**Keep enabled for:**
- Tasks with uncertain iteration count
- Tasks where progress is non-linear
- Long-running tasks (>5 iterations)
- Tasks with potential for getting stuck

### Signs of Misconfigured PID

**Problem:** Overshooting (completing too fast with quality issues)

**Symptoms:**
- Tests pass but logic is wrong
- Coverage drops
- Regressions introduced

**Fix:**
```bash
# Use conservative profile for more careful approach
ralph-external "Task" --completion "..." \
  --pid-profile conservative
```

---

**Problem:** Oscillation (back-and-forth changes)

**Symptoms:**
- Derivative shows frequent sign changes
- Files modified then reverted
- Control signal oscillates

**Fix:**
```bash
# Increase derivative gain to dampen oscillation
# (Usually auto-handled by gain scheduler, but can force conservative)
ralph-external "Task" --completion "..." \
  --pid-profile conservative  # Higher kd=0.4
```

---

**Problem:** Slow convergence (too many iterations)

**Symptoms:**
- Control signal decreases very slowly
- Progress is steady but inefficient
- Hitting max iteration limit

**Fix:**
```bash
# Use aggressive profile for faster response
ralph-external "Task" --completion "..." \
  --pid-profile aggressive
```

---

**Problem:** Stuck detection too sensitive

**Symptoms:**
- Frequent "stuck" alarms when actually making progress
- PID signals suggest movement but alarms trigger

**Fix:**
```javascript
// In programmatic usage
await orchestrator.execute({
  objective: "...",
  completionCriteria: "...",
  pidConfig: {
    thresholds: {
      stagnationWindow: 5,  // Increase from default 3
      stagnationThreshold: 0.01,  // Decrease sensitivity
    },
  },
});
```

---

## Claude Intelligence Best Practices

### When AI-Generated Prompts Help vs Hurt

**AI prompts HELP when:**

1. **Task context is complex** - Multiple files, intricate dependencies
   ```bash
   ralph-external "Refactor authentication across 12 files" \
     --completion "tests pass" \
     --use-claude-assessment
   # Claude generates context-aware prompts better than templates
   ```

2. **Task evolves during execution** - Blockers appear, scope shifts
   - Claude adapts prompt based on iteration history
   - Incorporates learnings from semantic memory
   - Adjusts strategy based on PID signals

3. **Cross-loop learnings available** - Similar tasks executed before
   - Memory layer provides relevant strategies
   - Claude integrates learnings into prompt context

**AI prompts HURT when:**

1. **Task is extremely simple** - Overhead not worth it
   ```bash
   # For trivial tasks, static template is fine
   AIWG_RALPH_INTELLIGENCE_ENABLED=false ralph-external \
     "Update version in package.json" \
     --completion "grep '2.0.0' package.json"
   ```

2. **Requirements are rigid** - No room for interpretation
   - Example: Compliance tasks with exact steps
   - Better to use explicit instructions in objective

3. **Debugging/isolation needed** - Want to control exact prompts
   ```bash
   # Disable intelligence to test specific prompt
   AIWG_RALPH_INTELLIGENCE_ENABLED=false ralph-external "..." --completion "..."
   ```

### Balancing Validation Strictness

**Strict validation** (more checks, slower iterations):

```javascript
await orchestrator.execute({
  objective: "Security-critical feature",
  completionCriteria: "...",
  validation: {
    preIteration: {
      checkBuild: true,
      checkGit: true,
      checkDependencies: true,
      checkLint: true,  // Enable for security tasks
    },
    postIteration: {
      checkTests: true,
      checkRegression: true,
      checkCoverage: true,  // Ensure no coverage drop
    },
  },
});
```

**Relaxed validation** (fewer checks, faster iterations):

```javascript
await orchestrator.execute({
  objective: "Update documentation",
  completionCriteria: "...",
  validation: {
    preIteration: {
      checkBuild: false,  // No build for docs
      checkGit: true,
      checkDependencies: false,
    },
    postIteration: {
      checkTests: false,  // No tests for docs
      checkRegression: false,
    },
  },
});
```

**Balanced validation** (default):

```javascript
// Default validation is reasonable for most tasks
await orchestrator.execute({
  objective: "Implement feature",
  completionCriteria: "tests pass",
  // Uses default validation (build, tests, git)
});
```

### Strategy Planner Tuning

**Default strategy planner** works well for most tasks. Tune only if:

1. **Escalation too early** - Planner gives up before truly stuck

```javascript
await orchestrator.execute({
  objective: "Complex refactoring",
  completionCriteria: "...",
  strategyPlanner: {
    escalationThreshold: 0.2,  // Lower = escalate later (default: 0.3)
    confidenceThreshold: 0.4,  // Lower = more willing to try (default: 0.5)
  },
});
```

2. **Not pivoting when stuck** - Planner persists too long

```javascript
await orchestrator.execute({
  objective: "Task prone to getting stuck",
  completionCriteria: "...",
  strategyPlanner: {
    historyDepth: 3,  // Shorter history = faster pivot detection (default: 5)
  },
});
```

### When to Use Simpler Prompts

**Disable Claude-generated prompts when:**

1. **Budget constrained** - Saves 5-10 seconds per iteration
   ```bash
   AIWG_RALPH_INTELLIGENCE_ENABLED=false ralph-external "..." --completion "..."
   ```

2. **Task is straightforward** - Static template sufficient
   ```bash
   # Simple fix - no need for AI prompt
   AIWG_RALPH_INTELLIGENCE_ENABLED=false ralph-external \
     "Fix linting errors" \
     --completion "npx eslint . exits 0"
   ```

3. **Testing/debugging** - Want deterministic prompts
   ```bash
   # Isolate other layers, disable intelligence
   AIWG_RALPH_INTELLIGENCE_ENABLED=false ralph-external "..." --completion "..."
   ```

**Keep Claude prompts enabled for:**
- Complex tasks with uncertain paths
- Tasks requiring strategy adaptation
- Tasks benefiting from semantic memory integration
- Long-running loops where prompt quality matters

---

## Memory Layer Best Practices

### Building a Useful Knowledge Base Over Time

**Phase 1: Initial Corpus (Weeks 1-2)**

Start with empty memory, let Epic #26 extract learnings:

```bash
# Enable memory from day 1
export AIWG_RALPH_MEMORY_ENABLED=true
export AIWG_KNOWLEDGE_DIR=.aiwg/knowledge

# Run normal tasks
ralph-external "Implement feature A" --completion "..."
ralph-external "Fix bug B" --completion "..."
ralph-external "Refactor module C" --completion "..."
```

After 10-15 loops, inspect corpus:

```bash
cat .aiwg/knowledge/ralph-learnings.json | jq '.stats'
# Should show:
# {
#   "totalLearnings": 15-25,
#   "byType": {
#     "strategy": 8,
#     "antipattern": 3,
#     "estimate": 7,
#     "convention": 4
#   }
# }
```

**Phase 2: Quality Review (Week 3)**

Review learnings for quality:

```bash
# List all strategies
cat .aiwg/knowledge/ralph-learnings.json | \
  jq '.learnings[] | select(.type == "strategy") | .content.description'
```

Look for:
- ✅ Specific, actionable strategies
- ✅ High confidence (>0.7) and success rate (>0.6)
- ❌ Vague/generic advice
- ❌ Low success rate (<0.5) strategies

**Phase 3: Maintenance (Ongoing)**

Monthly tasks:

1. **Prune stale learnings** - Remove outdated patterns
2. **Promote high-value learnings** - Manually boost confidence for proven strategies
3. **Tag learnings** - Add task type tags for better retrieval

```javascript
// Example: Prune stale learnings
import { SemanticMemory } from './lib/semantic-memory.mjs';

const memory = new SemanticMemory('.aiwg/knowledge');
const learnings = await memory.query({ type: 'all' });

// Remove learnings with:
// - Low success rate (<0.4)
// - Not used in 60 days
// - Confidence <0.5

for (const learning of learnings) {
  const daysSinceUpdate = (Date.now() - new Date(learning.updatedAt)) / (1000 * 60 * 60 * 24);

  if (learning.successRate < 0.4 || daysSinceUpdate > 60 || learning.confidence < 0.5) {
    console.log(`Removing stale learning: ${learning.id}`);
    await memory.remove(learning.id);
  }
}
```

### Pruning Stale Learnings

**When to prune:**

| Condition | Action |
|-----------|--------|
| Success rate <0.4 | Remove (unreliable) |
| Not used in 90 days | Remove (stale) |
| Confidence <0.5 and useCount <3 | Remove (unvalidated) |
| Task type deprecated | Remove (obsolete) |

**How to prune:**

```bash
# Manual prune via script
node tools/prune-learnings.mjs --threshold 0.4 --days 90

# Or programmatic
import { SemanticMemory } from './lib/semantic-memory.mjs';

const memory = new SemanticMemory('.aiwg/knowledge');

// Prune learnings
await memory.prune({
  minSuccessRate: 0.4,
  maxStaleDays: 90,
  minConfidence: 0.5,
  minUseCount: 3,
});
```

### Manual Promotion for High-Value Insights

When you discover a particularly valuable learning manually, promote it:

```javascript
import { SemanticMemory } from './lib/semantic-memory.mjs';

const memory = new SemanticMemory('.aiwg/knowledge');

// Manually add high-value learning
await memory.store({
  type: 'strategy',
  taskType: 'security',
  content: {
    description: "Always run OWASP ZAP scan before deploying auth changes",
    reasoning: "Prevents 90% of auth vulnerabilities (company policy)",
    applicability: ["auth", "security", "deployment"],
  },
  confidence: 0.95,  // High confidence for policy
  sourceLoops: ['manual-entry'],
  metadata: {
    priority: 'critical',
    source: 'security-team',
  },
});
```

**High-value learning characteristics:**

- Directly prevents known failures
- Enforces company policies/conventions
- Proven across multiple projects
- Time-saving shortcuts discovered by team

### When Cross-Loop Learning Doesn't Help

**Disable memory when:**

1. **Task is highly novel** - No similar tasks in history
   ```bash
   # First time working with new technology
   AIWG_RALPH_MEMORY_ENABLED=false ralph-external \
     "Initial setup of GraphQL server" \
     --completion "..."
   ```

2. **Memory has low-quality learnings** - Need to reset corpus
   ```bash
   # Temporarily disable while cleaning memory
   AIWG_RALPH_MEMORY_ENABLED=false ralph-external "..." --completion "..."

   # Clean memory
   rm .aiwg/knowledge/ralph-learnings.json

   # Re-enable
   AIWG_RALPH_MEMORY_ENABLED=true ralph-external "..." --completion "..."
   ```

3. **Task is one-off** - Won't repeat, learning not valuable
   ```bash
   # One-time migration - no future value
   AIWG_RALPH_MEMORY_ENABLED=false ralph-external \
     "Migrate legacy DB schema (deprecated system)" \
     --completion "..."
   ```

**Keep memory enabled for:**
- Recurring task types (auth, testing, deployment)
- Tasks with reusable patterns
- Team tasks where learnings transfer across developers

---

## Oversight Best Practices

### Setting Appropriate Thresholds for Your Project

**Default thresholds** (good for most projects):

```javascript
{
  stuckThreshold: 3,           // 3 iterations without progress
  oscillationWindow: 5,        // Check last 5 iterations
  regressionSensitivity: 0.1,  // 10% quality drop
  resourceBurnThreshold: 0.8,  // 80% budget with <50% progress
}
```

**Tight thresholds** (for critical projects):

```javascript
// Detect issues faster, intervene earlier
await orchestrator.execute({
  objective: "Production deployment",
  completionCriteria: "...",
  overseer: {
    stuckThreshold: 2,           // Only 2 iterations without progress
    oscillationWindow: 3,        // Smaller window
    regressionSensitivity: 0.05, // 5% quality drop triggers alarm
  },
});
```

**Loose thresholds** (for experimental work):

```javascript
// Allow more exploration, fewer interventions
await orchestrator.execute({
  objective: "Exploratory refactoring",
  completionCriteria: "...",
  overseer: {
    stuckThreshold: 5,           // Allow 5 iterations of exploration
    oscillationWindow: 10,       // Wider tolerance
    regressionSensitivity: 0.2,  // 20% quality drop acceptable
  },
});
```

### Responding to Interventions

**LOG** (informational):
- **Action:** None required, just awareness
- **Example:** "Progress slower than average"
- **Response:** Monitor next iteration

**WARN** (minor issue):
- **Action:** Review current approach
- **Example:** "Approaching iteration budget (70%)"
- **Response:** Consider increasing `maxIterations` or simplifying scope

**REDIRECT** (moderate issue):
- **Action:** Overseer injects guidance
- **Example:** "Oscillation detected - stabilizing"
- **Response:** Trust injected instructions, monitor for stabilization

**PAUSE** (serious issue):
- **Action:** Loop paused, awaiting human decision
- **Example:** "Stuck for 5 iterations"
- **Response:** Review progress, provide guidance:
  ```bash
  # Option 1: Resume with adjusted scope
  ralph-external-resume --simplify-scope

  # Option 2: Resume with strategy change
  ralph-external-resume --pivot "try test-first approach"

  # Option 3: Abort and restart
  ralph-external-abort
  ```

**ABORT** (critical issue):
- **Action:** Loop terminated immediately
- **Example:** "Budget exhausted, no progress"
- **Response:** Review logs, adjust configuration for retry

### When to Trust ABORT vs Override

**Trust ABORT when:**

1. **Budget exhausted with <30% progress** - Unlikely to complete
2. **Objective deviation >70%** - Working on wrong thing
3. **Regression for 3+ consecutive iterations** - Digging deeper hole
4. **Critical errors detected** (syntax errors, build failures)

**Override ABORT when:**

1. **Near completion** - 80%+ progress, just needs one more iteration
   ```bash
   # Override abort, force one more iteration
   ralph-external-resume --force
   ```

2. **Known temporary issue** - Flaky test, transient error
   ```bash
   # Acknowledge issue, retry
   ralph-external-resume --ignore-last-error
   ```

3. **Overseer misconfigured** - Threshold too strict
   ```bash
   # Adjust threshold, resume
   export AIWG_RALPH_STUCK_THRESHOLD=5
   ralph-external-resume
   ```

**Decision tree:**

```
ABORT triggered
  ├─ Progress >80%? → OVERRIDE (likely transient issue)
  ├─ Budget >90% used? → TRUST ABORT (won't finish)
  ├─ Regressing for 3+ iter? → TRUST ABORT (wrong approach)
  └─ Unclear? → REVIEW LOGS
      ├─ Blocker identified? → OVERRIDE with blocker fix
      └─ No clear blocker? → TRUST ABORT (something fundamentally wrong)
```

### Escalation Channel Setup

**Desktop notifications** (default):
```javascript
// Enabled by default
overseer: {
  escalation: {
    desktop: true,
  },
}
```

**Gitea issues** (recommended for teams):
```bash
# Configure Gitea escalation
export AIWG_GITEA_TOKEN=$(cat ~/.config/gitea/token)
export AIWG_GITEA_REPO=roctinam/ai-writing-guide

ralph-external "Critical task" --completion "..." --gitea-issue
```

Result: Critical interventions create Gitea issues with:
- Loop ID
- Iteration number
- Detection details
- Recommended actions
- Full context for review

**Webhook** (for custom integrations):
```javascript
overseer: {
  escalation: {
    webhook: 'https://hooks.example.com/ralph',
    headers: {
      'Authorization': 'Bearer token123',
    },
  },
}
```

**Slack** (planned, not yet implemented):
```javascript
// Future
overseer: {
  escalation: {
    slack: {
      webhook: 'https://hooks.slack.com/services/...',
      channel: '#ralph-alerts',
    },
  },
}
```

---

## Anti-Patterns to Avoid

### Over-Tuning: Constantly Adjusting Parameters

**ANTI-PATTERN:**
```bash
# Iteration 1
ralph-external "Task" --completion "..." --pid-profile standard

# Iteration 2 (saw oscillation)
ralph-external "Task" --completion "..." --pid-profile conservative

# Iteration 3 (too slow)
ralph-external "Task" --completion "..." --pid-profile aggressive

# Iteration 4 (stuck)
ralph-external "Task" --completion "..." --pid-profile recovery
```

**Problem:** Constant tuning prevents learning stable configuration. PID needs consistent parameters to adapt.

**SOLUTION:**
```bash
# Start with default, let adaptive gains handle it
ralph-external "Task" --completion "..."

# Only tune if pattern persists across 3+ runs
ralph-external "Task A" --completion "..."  # Run 1: oscillation
ralph-external "Task B" --completion "..."  # Run 2: oscillation
ralph-external "Task C" --completion "..."  # Run 3: oscillation

# Now justified to tune
ralph-external "Task D" --completion "..." --pid-profile conservative
```

### Under-Monitoring: Not Checking Oversight Reports

**ANTI-PATTERN:**
```bash
# Fire and forget
ralph-external "Long task" --completion "..." &

# Never check:
# - .aiwg/ralph-external/overseer/health-log.json
# - .aiwg/ralph-external/iterations/*/analysis.json
# - Completion report

# Discover issues after loop aborts
```

**Problem:** Miss early warning signs of issues.

**SOLUTION:**
```bash
# Monitor during execution
ralph-external "Long task" --completion "..." &

# Check health periodically
watch -n 60 'cat .aiwg/ralph-external/overseer/health-log.json | jq ".[-1]"'

# Review after completion
cat .aiwg/ralph-external/completion-report.md
```

**Monitoring checklist:**

- [ ] Check health status after each iteration (verbose mode)
- [ ] Review completion report after loop finishes
- [ ] Examine intervention log for repeated patterns
- [ ] Verify memory promotions are sensible

### Ignoring Interventions

**ANTI-PATTERN:**
```bash
# Overseer: "WARN - Approaching iteration budget"
# Human: (Ignores)

# Overseer: "REDIRECT - Oscillation detected"
# Human: (Ignores)

# Overseer: "PAUSE - Stuck for 5 iterations"
# Human: (Forces resume without addressing root cause)

# Overseer: "ABORT - Budget exhausted"
# Human: "Why did it abort?!" (Ignored all warnings)
```

**Problem:** Interventions exist for a reason. Ignoring them leads to wasted resources.

**SOLUTION:**

When intervention triggers:

1. **Read the reason** - Don't blindly override
2. **Check logs** - Understand what overseer detected
3. **Address root cause** - Fix the underlying issue
4. **Resume or adjust** - Then continue

```bash
# Overseer: "PAUSE - Stuck for 5 iterations"

# Good response:
cat .aiwg/ralph-external/iterations/*/analysis.json
# Identify blocker: "Missing dependency X"
npm install X
ralph-external-resume --with-fix "Installed missing dependency X"

# Bad response:
ralph-external-resume --force  # Ignore root cause
```

### Trusting Memory Blindly

**ANTI-PATTERN:**
```bash
# Memory says: "For auth tasks, always disable tests temporarily to make progress"
# (Bad learning from one-off situation)

# Loop retrieves this learning
# Applies it blindly
# Introduces security bug

# Memory never questioned
```

**Problem:** Semantic memory can learn bad patterns if not curated.

**SOLUTION:**

1. **Review learnings monthly**
   ```bash
   cat .aiwg/knowledge/ralph-learnings.json | \
     jq '.learnings[] | select(.successRate < 0.6)'
   # Inspect low-success learnings
   ```

2. **Remove bad patterns**
   ```javascript
   await memory.remove('learn-abc123');
   ```

3. **Override bad retrieval**
   ```bash
   # If memory suggests bad approach, disable for this run
   AIWG_RALPH_MEMORY_ENABLED=false ralph-external "..." --completion "..."
   ```

4. **Manually curate high-stakes learnings**
   ```javascript
   // Ensure critical learnings are high quality
   await memory.update('learn-xyz789', {
     confidence: 0.95,
     metadata: { validated: true, source: 'team-lead' },
   });
   ```

### Running Without Oversight on Critical Tasks

**ANTI-PATTERN:**
```bash
# Production deployment without oversight
AIWG_RALPH_OVERSEER_ENABLED=false ralph-external \
  "Deploy to production" \
  --completion "deployment successful"
```

**Problem:** No safety net for critical operations.

**SOLUTION:**
```bash
# Always enable oversight for critical tasks
# Use strict thresholds
ralph-external "Deploy to production" \
  --completion "deployment successful && health-check passes" \
  --overseer-stuck-threshold 2 \
  --overseer-regression-sensitivity 0.05 \
  --gitea-issue  # Escalate any issues
```

**Critical task checklist:**

- [ ] Oversight ENABLED
- [ ] Strict thresholds configured
- [ ] Escalation channel tested (Gitea/webhook)
- [ ] Conservative PID profile
- [ ] Comprehensive validation checks
- [ ] Budget headroom for retries

---

## Team Usage Patterns

### Shared Memory Stores

**Setup shared knowledge directory:**

```bash
# Team convention: shared knowledge in project
mkdir -p .aiwg/knowledge

# All team members use same dir
export AIWG_KNOWLEDGE_DIR=.aiwg/knowledge

# Commit learnings to version control
git add .aiwg/knowledge/ralph-learnings.json
git commit -m "Update shared learnings"
```

**Benefits:**
- New team members inherit proven strategies
- Cross-developer learning transfer
- Consistent approaches across team

**Considerations:**
- Occasional conflicts in `ralph-learnings.json`
  - Resolve by merging `learnings` arrays
  - Re-compute `stats` section
- May need pruning as team grows

**Merge script:**

```bash
#!/bin/bash
# tools/merge-learnings.sh

# Merge learnings from two branches
OURS=.aiwg/knowledge/ralph-learnings.json
THEIRS=$1

jq -s '.[0].learnings + .[1].learnings | unique_by(.id) | {learnings: .}' \
  $OURS $THEIRS > merged.json

mv merged.json $OURS
echo "Merged learnings from $THEIRS"
```

### Consistent Configurations

**Team conventions file:**

```yaml
# .aiwg/ralph/team-config.yaml
pidControl:
  defaultProfile: standard
  conservativeFor:
    - security
    - auth
    - encryption
    - production

overseer:
  stuckThreshold: 3
  escalateVia: gitea
  giteaRepo: team/project

memory:
  sharedPath: .aiwg/knowledge
  minConfidence: 0.7
  pruneInterval: monthly

validation:
  alwaysRunTests: true
  alwaysCheckBuild: true
  requireLintForPR: true
```

**Usage:**

```bash
# Load team config (planned feature)
ralph-external "Task" --completion "..." --config .aiwg/ralph/team-config.yaml
```

**Until config files supported, use shell aliases:**

```bash
# .bashrc or .zshrc
alias ralph-team='ralph-external --pid-profile standard --overseer-stuck-threshold 3 --use-claude-assessment'

# Usage
ralph-team "Task" --completion "..."
```

### Learning from Team Loops

**Pattern: Weekly learning review**

```bash
# Every Friday, team reviews new learnings
cat .aiwg/knowledge/ralph-learnings.json | \
  jq '.learnings[] | select(.createdAt > "2026-01-27")' | \
  jq -s 'group_by(.type) | map({type: .[0].type, count: length, items: .})'

# Discuss:
# - Which learnings are valuable?
# - Any bad patterns to remove?
# - Promote any to higher confidence?
```

**Pattern: Tagging conventions**

```javascript
// Add team member tags to learnings
await memory.update('learn-abc123', {
  metadata: {
    discoveredBy: 'alice',
    validated: true,
    team: 'backend',
    priority: 'high',
  },
});

// Query by tag
const backendStrategies = await memory.query({
  type: 'strategy',
  metadata: { team: 'backend' },
});
```

**Pattern: Pair programming with Ralph**

```bash
# Developer A starts task
ralph-external "Implement feature X" --completion "tests pass" --gitea-issue

# Loop gets stuck, creates Gitea issue
# Developer B sees issue, reviews context

# Developer B provides guidance in issue
# Developer A resumes with guidance
ralph-external-resume --with-guidance "Use test-first approach from issue #123"
```

---

## Performance Optimization

### Reducing Overhead for Simple Tasks

Epic #26 adds ~6-11 seconds per iteration (dominated by Claude prompt generation). For simple tasks, reduce overhead:

**Disable Claude Intelligence:**
```bash
# Simple task - static prompt is fine
AIWG_RALPH_INTELLIGENCE_ENABLED=false ralph-external \
  "Update version number" \
  --completion "grep '2.0.0' package.json"

# Savings: ~5-10 seconds per iteration
```

**Disable Semantic Memory:**
```bash
# One-off task - no learning value
AIWG_RALPH_MEMORY_ENABLED=false ralph-external \
  "One-time migration" \
  --completion "..."

# Savings: ~100ms per iteration
```

**Reduce Validation:**
```javascript
await orchestrator.execute({
  objective: "Simple docs update",
  completionCriteria: "...",
  validation: {
    preIteration: {
      checkBuild: false,
      checkDependencies: false,
      checkLint: false,
    },
    postIteration: {
      checkTests: false,
      checkRegression: false,
    },
  },
});

// Savings: 5-30 seconds per iteration (depending on build/test time)
```

### When to Disable Layers

**PID Control:**
- **Disable for:** Deterministic 1-2 iteration tasks
- **Keep for:** Anything >3 iterations or uncertain

**Claude Intelligence:**
- **Disable for:** Simple tasks, tight budgets
- **Keep for:** Complex tasks, adaptive prompts valuable

**Semantic Memory:**
- **Disable for:** One-off tasks, novel work
- **Keep for:** Recurring patterns, team knowledge

**Overseer:**
- **Disable for:** Trusted simple tasks
- **Keep for:** Long-running tasks, critical work

**Combinations:**

```bash
# Minimal Epic #26 (fastest)
AIWG_RALPH_PID_ENABLED=false \
AIWG_RALPH_INTELLIGENCE_ENABLED=false \
AIWG_RALPH_MEMORY_ENABLED=false \
AIWG_RALPH_OVERSEER_ENABLED=false \
ralph-external "Simple task" --completion "..."

# Moderate (PID + Overseer only)
AIWG_RALPH_INTELLIGENCE_ENABLED=false \
AIWG_RALPH_MEMORY_ENABLED=false \
ralph-external "Medium task" --completion "..."

# Full intelligence (all layers)
ralph-external "Complex task" --completion "..."
```

### Monitoring Resource Usage

**Track token usage per iteration:**

```bash
# Check iteration analysis for token counts
cat .aiwg/ralph-external/iterations/001/analysis.json | jq '.tokenUsage'
# {
#   "input": 12000,
#   "output": 3000,
#   "total": 15000,
#   "cost": 0.45
# }
```

**Track total loop cost:**

```bash
# In completion report
cat .aiwg/ralph-external/completion-report.md | grep "Total Cost"
# Total Cost: $3.20 (5 iterations × ~$0.64 avg)
```

**Budget alerts:**

```javascript
await orchestrator.execute({
  objective: "Task",
  completionCriteria: "...",
  budgetPerIteration: 2.0,  # $2 per iteration
  maxIterations: 10,        # Max $20 total

  onIterationComplete: (iteration, state) => {
    const spent = state.iterations.reduce((sum, i) => sum + i.cost, 0);
    const budget = state.maxIterations * state.budgetPerIteration;

    if (spent > budget * 0.8) {
      console.warn(`Budget warning: ${spent}/${budget} spent (${(spent/budget*100).toFixed(0)}%)`);
    }
  },
});
```

**Resource usage dashboard (planned):**

```bash
# Future feature
ralph-external-dashboard --loop ralph-001

# Shows:
# - Token usage per iteration
# - Cost breakdown (prompt gen, session, validation)
# - Time per layer
# - Memory retrieval efficiency
```

---

## Summary

### Quick Reference

| Scenario | Recommended Configuration |
|----------|--------------------------|
| **Simple task (1-2 iter)** | Disable intelligence, memory, validation |
| **Typical feature (3-8 iter)** | Default configuration (all layers enabled) |
| **Complex refactoring (8-15 iter)** | Default + increased budget, use Claude assessment |
| **Security-critical** | Conservative PID, strict validation, Gitea escalation |
| **Experimental work** | Aggressive PID, relaxed overseer, no memory |
| **Team collaboration** | Shared memory, Gitea issues, consistent config |

### Decision Tree

```
New task
  ├─ Simple (<3 iter)? → Disable intelligence + memory
  ├─ Critical (security/production)? → Conservative + strict validation
  ├─ Novel (first-time)? → Disable memory, standard PID
  ├─ Recurring (similar to past)? → Enable all layers (leverage memory)
  └─ Experimental? → Aggressive PID, loose overseer
```

### Key Takeaways

1. **Start with defaults** - Epic #26 defaults work for 80% of tasks
2. **Monitor first, tune later** - Understand baseline before customizing
3. **Trust the system** - Let intelligence layers do their job
4. **Intervene when needed** - Override when system is clearly wrong
5. **Maintain memory** - Monthly pruning keeps knowledge base healthy
6. **Escalate critical issues** - Use Gitea/webhooks for team visibility
7. **Optimize selectively** - Disable layers only when overhead dominates value

---

## References

- **Epic #26 Architecture:** @docs/ralph-epic-26-architecture.md
- **Epic #26 Configuration:** @docs/ralph-epic-26-configuration.md
- **Ralph External Command:** @.claude/commands/ralph-external.md
- **Issue #22:** Claude Intelligence Layer
- **Issue #23:** PID Control Layer
- **Issue #24:** Memory Layer
- **Issue #25:** Overseer Layer

---

**Document Status:** Complete
**Last Updated:** 2026-02-03
**Maintainer:** AI Writing Guide Team
