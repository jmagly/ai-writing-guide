# Epic #26 Troubleshooting Guide

**Version**: 1.0.0
**Last Updated**: 2026-02-03
**Applies To**: Ralph External Orchestrator with Epic #26 integration

## Overview

This guide covers troubleshooting for all four layers of Epic #26:
- **PID Control Layer** (#23) - Dynamic parameter adjustment
- **Claude Intelligence Layer** (#22) - Strategic prompt generation
- **Memory Layer** (#24) - Cross-loop knowledge persistence
- **Overseer Layer** (#25) - Autonomous health monitoring

## General Troubleshooting Approach

### Step 1: Identify the Layer

Epic #26 issues typically manifest in one of four layers. Determine which layer is involved:

| Symptom | Likely Layer |
|---------|--------------|
| Loop oscillates or converges slowly | PID Control |
| Poor prompts or irrelevant validation | Claude Intelligence |
| Not learning from past loops | Memory Layer |
| Pathological behaviors not caught | Overseer |
| Loop runs but features disabled | Configuration |

### Step 2: Check Logs

**Primary Locations:**

```bash
# General loop state
.aiwg/ralph-external/{loop-id}/state.json

# Iteration history with Epic #26 data
.aiwg/ralph-external/{loop-id}/history/iteration-*.json

# PID metrics log
.aiwg/ralph-external/{loop-id}/pid-metrics.json

# Overseer health checks
.aiwg/ralph-external/overseer/health-{loop-id}.json

# Semantic memory store
.aiwg/knowledge/ralph-learnings.json

# Escalation logs
.aiwg/ralph-external/overseer/escalations/
```

**What to Look For:**

- **PID metrics**: `proportional`, `integral`, `derivative`, `controlSignal`, `gains`
- **Overseer checks**: `detections`, `interventions`, `status`, `escalations`
- **Intelligence**: `stateAssessment`, `strategyPlan`, `preValidation`, `postValidation`
- **Memory**: `learningsRetrieved`, `learningsPromoted`

### Step 3: Verify Configuration

Epic #26 features can be toggled via config:

```javascript
// In orchestrator options
config: {
  enablePIDControl: true,        // PID control system
  enableOverseer: true,           // Overseer monitoring
  enableSemanticMemory: true,     // Semantic memory
}
```

If disabled, features won't activate. Check state file:

```bash
jq '.config' .aiwg/ralph-external/{loop-id}/state.json
```

### Step 4: Check for Common First Issues

| Issue | Check | Fix |
|-------|-------|-----|
| Features not active | `config.*` in state file | Enable in orchestrator options |
| PID metrics missing | Iteration has `pidMetrics` field? | Verify MetricsCollector initialization |
| No overseer checks | `healthReport` in iteration? | Verify Overseer initialization |
| Memory not retrieved | `learningsRetrieved` count? | Check semantic memory file exists |
| Claude not invoked | `claudePromptGenerator` errors? | Check `claude` CLI in PATH |

---

## 1. PID Control Issues

The PID Control Layer adjusts loop parameters dynamically based on progress metrics.

### Problem: Loop Converges Too Slowly

**Symptoms:**
- High iteration count for simple tasks
- Progress increases by <5% per iteration
- `controlSignal` consistently low (< 0.3)

**Diagnosis:**

```bash
# Check PID metrics
jq '.iterations[] | {iter: .number, progress: .analysis.completionPercentage, signal: .controlSignals.controlSignal}' \
  .aiwg/ralph-external/{loop-id}/state.json
```

Look for:
- Low `controlSignal` values despite low progress
- `gains.kp` (proportional gain) < 0.5

**Likely Causes:**
- Gains too conservative for task complexity
- GainScheduler using `cautious` profile
- Task complexity underestimated

**Solutions:**

1. **Manual gain adjustment** (temporary):

```javascript
// In orchestrator initialization
pidController.gainScheduler.setGains({
  kp: 0.8,  // Increase from default 0.6
  ki: 0.3,  // Increase from default 0.2
  kd: 0.4,  // Increase from default 0.3
});
```

2. **Switch gain profile** (better):

```javascript
// Set to aggressive profile for fast convergence
pidController.gainScheduler.selectProfile('aggressive');
// Or standard (balanced)
pidController.gainScheduler.selectProfile('standard');
```

3. **Adjust task complexity estimate**:

```javascript
// Higher complexity = more aggressive gains
taskConfig.estimatedComplexity = 8; // 1-10 scale
```

4. **Check alarm thresholds**:

```bash
# View current thresholds
jq '.alarmSummary.thresholds' .aiwg/ralph-external/{loop-id}/state.json
```

If `slowConvergence` alarm is firing but not severe, increase threshold:

```javascript
alarms.updateThresholds({
  slowConvergence: { progressPerIteration: 0.03 }, // Was 0.05
});
```

### Problem: Loop Oscillates (Progress Bouncing)

**Symptoms:**
- Progress goes: 40% → 60% → 45% → 70% → 55%
- `derivative` metric swings wildly (-0.3 → +0.4 → -0.2)
- Repeated WARN interventions for "oscillation detected"

**Diagnosis:**

```bash
# Check derivative trend
jq '.iterations[] | {iter: .number, progress: .analysis.completionPercentage, derivative: .pidMetrics.derivative}' \
  .aiwg/ralph-external/{loop-id}/state.json
```

Look for:
- `derivative` frequently changing sign
- Large `controlSignal` swings (e.g., -0.8 to +0.6)

**Likely Causes:**
- Proportional gain (`kp`) too high → overreacts to progress changes
- Derivative gain (`kd`) too low → can't dampen oscillations
- High noise in progress measurements

**Solutions:**

1. **Reduce proportional gain**:

```javascript
pidController.gainScheduler.adjustGains({
  kp: 0.4, // Reduce from 0.6 to prevent overreaction
});
```

2. **Increase derivative gain** (damping):

```javascript
pidController.gainScheduler.adjustGains({
  kd: 0.5, // Increase from 0.3 for more damping
});
```

3. **Switch to `cautious` profile**:

```javascript
pidController.gainScheduler.selectProfile('cautious');
// Lower gains reduce oscillation risk
```

4. **Increase noise threshold**:

```javascript
// In MetricsCollector options
metricsCollector.setNoiseThreshold(0.1); // Was 0.05
// Filters out small progress fluctuations
```

5. **Check for measurement noise**:

If `analysis.completionPercentage` is unreliable (fluctuates without actual progress changes), the issue may be upstream in output analysis.

### Problem: Control Diverges (Gets Worse)

**Symptoms:**
- Progress decreases over iterations
- `integral` accumulates negative values (< -1.0)
- Overseer detects "quality regression"

**Diagnosis:**

```bash
# Check for negative integral accumulation
jq '.iterations[] | {iter: .number, progress: .analysis.completionPercentage, integral: .pidMetrics.integral}' \
  .aiwg/ralph-external/{loop-id}/state.json
```

**Likely Causes:**
- Integral windup (accumulated error too large)
- Task is actually getting harder (scope creep)
- Bad feedback loop (iteration is making things worse)

**Solutions:**

1. **Reset integral** (anti-windup):

```javascript
pidController.metricsCollector.resetIntegral();
// Clears accumulated error
```

2. **Reduce integral gain**:

```javascript
pidController.gainScheduler.adjustGains({
  ki: 0.1, // Reduce from 0.2
});
```

3. **Enable integral decay**:

```javascript
// In MetricsCollector options
metricsCollector.setIntegralDecay(0.85); // Was 0.9
// Prevents old errors from dominating
```

4. **Check for scope creep**:

If progress decreases because new work is being added, re-scope the objective or increase `maxIterations`.

5. **Overseer intervention**:

If divergence continues for 3+ iterations, Overseer should trigger PAUSE. If not:

```javascript
overseer.detector.updateThresholds({
  qualityRegression: { consecutive: 2 }, // Was 3
});
```

### Problem: Alarms Firing Incorrectly

**Symptoms:**
- False alarms for "excessive oscillation" when progress is steady
- Missing alarms for actual stuck loops
- Email/issue escalations spam

**Diagnosis:**

```bash
# View alarm history
jq '.alarmSummary.activeAlarms' .aiwg/ralph-external/{loop-id}/state.json

# Check thresholds
jq '.alarmSummary.thresholds' .aiwg/ralph-external/{loop-id}/state.json
```

**Solutions:**

1. **Adjust specific alarm thresholds**:

```javascript
// Too sensitive
alarms.updateThresholds({
  excessiveOscillation: { derivativeSwing: 0.5 }, // Was 0.3
  slowConvergence: { progressPerIteration: 0.03 }, // Was 0.05
  stuckLoop: { iterationsWithoutProgress: 4 }, // Was 3
});
```

2. **Disable specific alarms** (not recommended):

```javascript
alarms.disableAlarm('excessiveOscillation');
// Only if genuinely not needed for this task
```

3. **Reduce escalation frequency**:

```javascript
// In EscalationHandler options
escalationHandler.setThrottling({
  minInterval: 600000, // 10 minutes between escalations (was 300000)
});
```

4. **Change alarm action levels**:

```javascript
// Make less severe
alarms.setActionLevel('excessiveOscillation', 'WARN'); // Was 'REDIRECT'
```

---

## 2. Claude Intelligence Issues

The Claude Intelligence Layer generates prompts, validates iterations, and plans strategies.

### Problem: Generated Prompts Unhelpful

**Symptoms:**
- Claude sessions don't make progress
- Prompts are too vague or off-topic
- Sessions repeatedly ask for clarification

**Diagnosis:**

```bash
# View generated prompts
jq '.iterations[] | {iter: .number, prompt: .claudePrompt | split("\n")[0:5]}' \
  .aiwg/ralph-external/{loop-id}/state.json
```

Check:
- Is prompt specific to current blockers?
- Does it include relevant learnings?
- Is focus area correct?

**Likely Causes:**
- StateAssessor providing poor situation assessment
- Insufficient context (missing history/learnings)
- Claude model timeout during generation

**Solutions:**

1. **Check StateAssessor output**:

```bash
jq '.iterations[].assessment' .aiwg/ralph-external/{loop-id}/state.json
```

If `blockers` or `accomplishments` are empty/generic:

```javascript
// Ensure StateAssessor has enough history
stateAssessor.setWindowSize(5); // Was 3
```

2. **Verify memory retrieval**:

```bash
jq '.iterations[].learningsRetrieved' .aiwg/ralph-external/{loop-id}/state.json
```

If `[]` (empty), memory isn't being retrieved. Check:

```javascript
// Ensure MemoryRetrieval is initialized
memoryRetrieval.setRelevanceThreshold(0.5); // Was 0.7 (too strict)
```

3. **Increase Claude timeout**:

```javascript
// In ClaudePromptGenerator options
claudePromptGenerator.setTimeout(120000); // 2 minutes (was 90s)
```

4. **Fall back to template prompts**:

If Claude invocation fails consistently:

```javascript
// Check Claude CLI availability
spawnSync('which', ['claude']).status === 0
```

If not available, orchestrator falls back to standard PromptGenerator automatically.

5. **Check StrategyPlanner output**:

```bash
jq '.iterations[].strategy' .aiwg/ralph-external/{loop-id}/state.json
```

If strategy is generic ("continue working"), StrategyPlanner needs better PID signals:

```javascript
// Ensure PID metrics are being passed
strategyPlanner.plan(stateAssessment, pidMetrics);
```

### Problem: Validation Too Strict/Loose

**Symptoms:**
- Pre-validation blocks iterations that should proceed
- Post-validation passes iterations with obvious issues
- False positives for "schema validation failed"

**Diagnosis:**

```bash
# Check validation results
jq '.iterations[] | {iter: .number, preValid: .preValidation.valid, postValid: .postValidation.valid, issues: .postValidation.issues}' \
  .aiwg/ralph-external/{loop-id}/state.json
```

**Solutions:**

1. **Adjust validation thresholds**:

```javascript
// In ValidationAgent options
validationAgent.setThresholds({
  minProgress: 0.05,      // Allow iterations with 5%+ progress (was 0.1)
  maxRegressions: 3,      // Allow up to 3 minor regressions (was 1)
  requiredArtifacts: [],  // Don't require specific artifacts
});
```

2. **Disable specific checks** (per-check tuning):

```javascript
// Too strict for this project
validationAgent.disableCheck('schemaValidation');
validationAgent.disableCheck('testCoverageRequirement');
```

3. **Enable check-by-check configuration**:

```javascript
validationAgent.configureCheck('qualityGate', {
  minQualityScore: 0.6, // Was 0.8
  failOnLowQuality: false, // Warn instead
});
```

4. **Review false positive patterns**:

```bash
# Common false positives
jq '.iterations[] | select(.postValidation.valid == false) | .postValidation.issues[]' \
  .aiwg/ralph-external/{loop-id}/state.json
```

If a specific issue type appears repeatedly without actual problems, disable that check.

### Problem: Strategy Planner Keeps Escalating

**Symptoms:**
- StrategyPlanner recommends "escalate_to_human" repeatedly
- Low confidence scores (< 0.5) for all iterations
- Loop doesn't make progress due to excessive escalation

**Diagnosis:**

```bash
# Check strategy confidence
jq '.iterations[] | {iter: .number, strategy: .strategy.strategy, confidence: .strategy.confidence}' \
  .aiwg/ralph-external/{loop-id}/state.json
```

**Likely Causes:**
- Confidence threshold too high
- PID signals indicating instability when task is actually progressing
- Task genuinely too complex for autonomous handling

**Solutions:**

1. **Lower confidence threshold**:

```javascript
// In StrategyPlanner options
strategyPlanner.setConfidenceThreshold(0.4); // Was 0.6
// Allow lower-confidence strategies
```

2. **Check PID stability**:

```bash
jq '.iterations[] | {iter: .number, derivative: .pidMetrics.derivative}' \
  .aiwg/ralph-external/{loop-id}/state.json
```

If `derivative` is stable (not oscillating), but StrategyPlanner still escalates, it's being overcautious:

```javascript
// Adjust stability criteria
strategyPlanner.setStabilityCriteria({
  maxDerivativeSwing: 0.4, // Was 0.2 (too strict)
});
```

3. **When escalation is correct**:

If task genuinely requires human input (e.g., design decision, ambiguous requirements), escalation is appropriate. In this case:

- Provide input via HITL gate
- Resume loop after clarification
- Memory will learn from the resolution

4. **Disable auto-escalation** (not recommended for production):

```javascript
// Only for testing
strategyPlanner.setAutoEscalate(false);
```

---

## 3. Memory Layer Issues

The Memory Layer persists cross-loop knowledge and retrieves relevant learnings.

### Problem: Memory Not Being Used

**Symptoms:**
- `learningsRetrieved: []` in all iterations
- Loop doesn't benefit from past experience
- Same mistakes repeated across loops

**Diagnosis:**

```bash
# Check if memory file exists
ls -lh .aiwg/knowledge/ralph-learnings.json

# Check learning count
jq '.stats.totalLearnings' .aiwg/knowledge/ralph-learnings.json

# Check retrieval attempts
jq '.iterations[] | {iter: .number, retrieved: .learningsRetrieved | length}' \
  .aiwg/ralph-external/{loop-id}/state.json
```

**Likely Causes:**

1. **Memory store empty** (no prior loops completed successfully)
2. **Retrieval relevance threshold too strict**
3. **Task type mismatch** (stored learnings for "test-fix", current task is "feature")

**Solutions:**

1. **Verify memory is populated**:

```bash
jq '.learnings | length' .aiwg/knowledge/ralph-learnings.json
```

If `0`, no learnings have been promoted yet. Complete at least one successful loop to populate memory.

2. **Lower relevance threshold**:

```javascript
// In MemoryRetrieval options
memoryRetrieval.setRelevanceThreshold(0.5); // Was 0.7
// Retrieves more learnings (may include less relevant ones)
```

3. **Check task type matching**:

```bash
# View available task types in memory
jq '.learnings[] | .taskType' .aiwg/knowledge/ralph-learnings.json | sort | uniq
```

If current task type isn't represented:

```javascript
// Use more generic task type
taskConfig.taskType = 'general'; // Instead of 'specific-feature-name'
```

4. **Manually verify retrieval**:

```javascript
// Test retrieval directly
const learnings = await memoryRetrieval.retrieve({
  objective: 'your objective',
  taskType: 'test-fix',
});
console.log('Retrieved:', learnings.length);
```

5. **Check for initialization**:

```javascript
// Ensure MemoryRetrieval is created and passed to orchestrator
const memoryRetrieval = new MemoryRetrieval({
  knowledgeDir: '.aiwg/knowledge',
  relevanceThreshold: 0.6,
});
```

### Problem: Bad Learnings Promoted

**Symptoms:**
- Retrieved learnings recommend anti-patterns
- Confidence scores low for stored learnings
- Success rate < 50% for specific learnings

**Diagnosis:**

```bash
# Find low-confidence learnings
jq '.learnings[] | select(.confidence < 0.5) | {id, type, confidence, successRate}' \
  .aiwg/knowledge/ralph-learnings.json

# Find learnings with low success rate
jq '.learnings[] | select(.successRate < 0.5) | {id, type, successRate}' \
  .aiwg/knowledge/ralph-learnings.json
```

**Likely Causes:**
- Loop completed but quality was poor
- Learning extracted from failed iteration
- Promotion criteria too lenient

**Solutions:**

1. **Manual cleanup**:

```bash
# Identify bad learning ID
jq '.learnings[] | select(.id == "learn-abc123")' .aiwg/knowledge/ralph-learnings.json

# Remove it (requires manual edit or script)
```

Edit `.aiwg/knowledge/ralph-learnings.json` and remove the entry.

2. **Stricter promotion criteria**:

```javascript
// In MemoryPromotion options
memoryPromotion.setPromotionCriteria({
  minConfidence: 0.7, // Was 0.5
  minSuccessRate: 0.8, // Was 0.6 (after multiple uses)
});
```

3. **Automatic deprecation**:

```javascript
// Deprecate learnings with low success after N uses
memoryPromotion.enableAutoDeprecation({
  minUses: 3,
  deprecateBelow: 0.4, // Success rate
});
```

4. **Prevention strategies**:

- Only promote from iterations with high post-validation scores
- Filter out learnings from loops that required human intervention
- Review learnings before promotion (HITL gate)

```javascript
// In MemoryPromotion
memoryPromotion.setRequireValidation(true);
// Triggers HITL gate before promoting to semantic memory
```

### Problem: Memory Corruption

**Symptoms:**
- Error: "Checksum mismatch - data may be corrupted"
- SemanticMemory fails to load
- Backup recovery attempted

**Diagnosis:**

```bash
# Check error logs
grep "Checksum mismatch" .aiwg/ralph-external/*/logs/*.log

# Verify backup exists
ls -lh .aiwg/knowledge/ralph-learnings.json.bak
```

**Likely Causes:**
- File corruption (disk I/O error, interrupted write)
- Concurrent writes from multiple loops
- Manual editing introduced JSON syntax error

**Solutions:**

1. **Recovery from backup**:

If backup is valid (checksum matches):

```bash
# Automatic recovery happens on next load
# Or manually restore:
cp .aiwg/knowledge/ralph-learnings.json.bak .aiwg/knowledge/ralph-learnings.json
```

2. **If backup also corrupted**:

```bash
# Rebuild from loop-specific learnings
cat .aiwg/ralph-external/*/promoted-learnings.json | jq -s 'add' > rebuilt.json

# Manually create new store
echo '{
  "version": "1.0.0",
  "learnings": [],
  "stats": {"totalLearnings": 0, "byType": {}, "byTaskType": {}}
}' > .aiwg/knowledge/ralph-learnings.json
```

3. **Prevention**:

- Enable file locking for concurrent access
- Use atomic writes (write to temp file, then rename)
- Regular backups (automated)

```javascript
// In SemanticMemory options
semanticMemory.setBackupInterval(10); // Backup every 10 saves
semanticMemory.enableFileLocking(true); // Prevent concurrent writes
```

4. **Verify JSON syntax**:

```bash
jq empty .aiwg/knowledge/ralph-learnings.json
# If valid: no output
# If invalid: error message with line number
```

---

## 4. Oversight Issues

The Overseer Layer monitors loop health and triggers interventions.

### Problem: False Positive Interventions

**Symptoms:**
- Overseer triggers PAUSE for healthy loops
- "Stuck loop" detected when progress is steady
- Excessive escalations to human

**Diagnosis:**

```bash
# Check detection patterns
jq '.healthCheckLog[] | select(.interventions | length > 0) | {iter: .iterationNumber, detections, interventions}' \
  .aiwg/ralph-external/overseer/health-{loop-id}.json
```

**Solutions:**

1. **Threshold tuning**:

```javascript
// In BehaviorDetector options
behaviorDetector.updateThresholds({
  stuckLoop: {
    iterationsWithoutProgress: 4, // Was 3
    minProgressDelta: 0.03,        // Was 0.05
  },
  oscillation: {
    derivativeSwing: 0.4,          // Was 0.3
    consecutiveSwings: 3,          // Was 2
  },
  qualityRegression: {
    consecutive: 3,                // Was 2
    minDelta: 0.1,                 // Was 0.05
  },
});
```

2. **Behavior detector sensitivity**:

```javascript
// Make less sensitive overall
behaviorDetector.setSensitivity('low'); // Was 'normal'
// Options: 'low', 'normal', 'high'
```

3. **Disable specific detectors** (not recommended):

```javascript
behaviorDetector.disableDetector('oscillation');
// Only if genuinely problematic for this task type
```

4. **Adjust intervention levels**:

```javascript
// Make stuck loop less severe
interventionSystem.setInterventionLevel('stuckLoop', 'WARN'); // Was 'REDIRECT'
```

### Problem: Missed Problems (False Negatives)

**Symptoms:**
- Loop stuck for 5+ iterations without intervention
- Quality regresses but no detection
- Infinite loops not caught

**Diagnosis:**

```bash
# Check if detections are firing
jq '.healthCheckLog[] | {iter: .iterationNumber, detections: .detections | length}' \
  .aiwg/ralph-external/overseer/health-{loop-id}.json
```

If `detections: 0` for all iterations, detectors aren't firing.

**Solutions:**

1. **Stricter thresholds**:

```javascript
behaviorDetector.updateThresholds({
  stuckLoop: {
    iterationsWithoutProgress: 2, // Was 3
  },
  qualityRegression: {
    consecutive: 1, // Was 2 (detect immediately)
  },
});
```

2. **Increase sensitivity**:

```javascript
behaviorDetector.setSensitivity('high'); // Was 'normal'
```

3. **Enable additional checks**:

```javascript
// Add resource burn detection
behaviorDetector.enableDetector('resourceBurn', {
  maxIterations: 10,
  warnThreshold: 7,
});
```

4. **Verify overseer initialization**:

```javascript
// Ensure Overseer is created and check() is called after each iteration
const overseer = new Overseer(loopId, objective, { autoEscalate: true });

// After each iteration:
const healthCheck = await overseer.check(iterationResult);
```

5. **Check for exceptions**:

```bash
# Look for errors in overseer logs
grep -i "error" .aiwg/ralph-external/overseer/*.log
```

### Problem: Escalation Not Working

**Symptoms:**
- ABORT intervention triggered but no human notification
- Escalations logged but no Gitea issue created
- Email notifications not sent

**Diagnosis:**

```bash
# Check escalation attempts
jq '.escalations' .aiwg/ralph-external/overseer/escalations/{loop-id}.json

# Check for errors
grep "escalation" .aiwg/ralph-external/*/logs/*.log
```

**Solutions:**

1. **Channel configuration**:

```javascript
// In EscalationHandler options
escalationHandler.setChannels({
  gitea: true,    // Create Gitea issue
  email: false,   // Send email (requires config)
  cli: true,      // CLI notification
});
```

2. **Gitea configuration**:

```bash
# Verify Gitea token exists
ls -lh ~/.config/gitea/token

# Test Gitea API
bash <<'EOF'
TOKEN=$(cat ~/.config/gitea/token)
curl -s -H "Authorization: token $TOKEN" \
  "https://git.integrolabs.net/api/v1/user" | jq .
EOF
```

If token invalid or missing, create at: https://git.integrolabs.net/user/settings/applications

3. **Notification permissions**:

```javascript
// Ensure escalation handler has repo permissions
escalationHandler.setRepo('roctinam/ai-writing-guide');
```

4. **Fallback behavior**:

```javascript
// If Gitea fails, fallback to CLI notification
escalationHandler.setFallback('cli');
```

5. **Test escalation manually**:

```javascript
const escalation = await escalationHandler.escalate({
  level: 'WARN',
  reason: 'Test escalation',
  loopId: 'test-001',
  context: { test: true },
});
console.log('Escalation result:', escalation);
```

---

## 5. Integration Issues

Multiple layers interacting can cause conflicts or performance problems.

### Problem: Layers Conflicting

**Symptoms:**
- PID recommends "continue" but Strategy Planner recommends "escalate"
- Validation passes but Overseer triggers PAUSE
- Redundant checks slow down iterations

**Diagnosis:**

```bash
# Compare recommendations
jq '.iterations[] | {iter: .number, pidAction: .controlSignals.action, strategyPlan: .strategy.strategy, overseerStatus: .healthReport.status}' \
  .aiwg/ralph-external/{loop-id}/state.json
```

**Solutions:**

1. **PID vs Strategy Planner disagreement**:

This is expected behavior. Resolution:
- **PID signals**: Quantitative (metrics-based)
- **Strategy Planner**: Qualitative (context-based)

When they disagree:
- If PID says "continue" but Strategy says "escalate" → Escalate (qualitative override)
- If PID says "abort" but Strategy says "continue" → Abort (safety override)

2. **Validation vs Overseer redundancy**:

Overseer can detect behaviors Validation can't (stuck loops, oscillation). If both firing for same issue:

```javascript
// Disable redundant validation checks
validationAgent.disableCheck('progressCheck'); // Overseer handles this
```

3. **Resolution strategies**:

```javascript
// Priority order (highest to lowest):
// 1. Overseer ABORT/PAUSE
// 2. Strategy Planner escalate
// 3. Validation fail
// 4. PID control signals

// Implement conflict resolution
function resolveActions(pidAction, strategyPlan, overseerStatus, validationResult) {
  if (overseerStatus === 'aborted' || overseerStatus === 'paused') {
    return overseerStatus;
  }
  if (strategyPlan === 'escalate_to_human') {
    return 'escalate';
  }
  if (!validationResult.valid && validationResult.severity === 'critical') {
    return 'pause';
  }
  return pidAction; // Default to PID recommendation
}
```

### Problem: Performance Degradation

**Symptoms:**
- Iterations take >2 minutes longer than before Epic #26
- High CPU usage
- Long pauses between iterations

**Diagnosis:**

```bash
# Check iteration timing
jq '.iterations[] | {iter: .number, duration: .duration, pidTime: .pidMetrics.computeTime, overseerTime: .healthReport.computeTime}' \
  .aiwg/ralph-external/{loop-id}/state.json
```

**Solutions:**

1. **Identify slow layers**:

- **PID metrics**: Should be < 10ms
- **Overseer check**: Should be < 50ms
- **Claude prompt generation**: Can be 1-2 minutes (worth it)
- **Memory retrieval**: Should be < 100ms

2. **Disable unnecessary checks**:

```javascript
// If not using PID control for this task
config.enablePIDControl = false;

// If overseer not critical for this task
config.enableOverseer = false;
```

3. **Optimize memory retrieval**:

```javascript
// Limit retrieval count
memoryRetrieval.setMaxResults(5); // Was 10

// Cache recent retrievals
memoryRetrieval.enableCaching(true);
```

4. **Reduce Claude prompt generation frequency**:

```javascript
// Use fallback prompts every other iteration
claudePromptGenerator.setFrequency(0.5); // 50% of iterations
```

5. **Caching strategies**:

```javascript
// Cache StateAssessor output for similar states
stateAssessor.enableCaching({
  maxAge: 300000, // 5 minutes
  similarityThreshold: 0.9,
});
```

---

## 6. Recovery Procedures

### How to Reset Epic #26 State

**When to reset:**
- PID control is completely diverged
- Memory contains too many bad learnings
- Overseer state is corrupted

**Steps:**

1. **Clear PID state**:

```bash
# Remove PID metrics file
rm .aiwg/ralph-external/{loop-id}/pid-metrics.json

# Reset in-memory state
pidController.reset();
```

2. **Clear Overseer state**:

```bash
# Remove health check log
rm .aiwg/ralph-external/overseer/health-{loop-id}.json

# Reset overseer
overseer = new Overseer(loopId, objective);
```

3. **Clear semantic memory** (CAUTION: loses all learnings):

```bash
# Backup first
cp .aiwg/knowledge/ralph-learnings.json .aiwg/knowledge/ralph-learnings.json.backup-$(date +%Y%m%d)

# Reset
rm .aiwg/knowledge/ralph-learnings.json
# Will auto-initialize on next use
```

4. **Partial reset** (keep learnings, reset metrics):

```bash
# Keep semantic memory, reset loop-specific state
rm .aiwg/ralph-external/{loop-id}/pid-metrics.json
rm .aiwg/ralph-external/overseer/health-{loop-id}.json
```

### How to Disable Epic #26 Temporarily

**Emergency bypass** (if Epic #26 causing loop to fail):

```javascript
// In orchestrator initialization
const config = {
  enablePIDControl: false,
  enableOverseer: false,
  enableSemanticMemory: false,
};
```

This reverts to pre-Epic #26 behavior (basic Ralph External loop).

**Gradual re-enablement**:

```javascript
// Enable one layer at a time
// Iteration 1: Enable PID only
config.enablePIDControl = true;

// Iteration 2: Add Overseer
config.enableOverseer = true;

// Iteration 3: Add Memory
config.enableSemanticMemory = true;
```

### Starting Fresh After Corruption

If all state is corrupted and backups failed:

```bash
# 1. Backup corrupted state
mkdir .aiwg/ralph-external/corrupted-$(date +%Y%m%d)
mv .aiwg/ralph-external/{loop-id}/* .aiwg/ralph-external/corrupted-$(date +%Y%m%d)/

# 2. Remove corrupted memory
mv .aiwg/knowledge/ralph-learnings.json .aiwg/knowledge/corrupted-$(date +%Y%m%d).json

# 3. Initialize fresh
# Orchestrator will auto-initialize all state on next run

# 4. Re-run loop from beginning
aiwg ralph "Your objective" --completion "Your completion criteria"
```

---

## Common Error Messages

| Error Message | Meaning | Solution |
|---------------|---------|----------|
| `PIDController not initialized. Call initialize() first.` | PID controller used before initialization | Call `pidController.initialize(taskConfig)` |
| `Checksum mismatch - data may be corrupted` | Semantic memory file corrupted | Restore from `.bak` backup or rebuild |
| `Claude invocation failed: ENOENT` | `claude` CLI not in PATH | Install Claude Code or use fallback prompts |
| `No learnings retrieved for task type: X` | Memory has no learnings for this task | Complete more loops or lower relevance threshold |
| `Overseer detected ABORT-level behavior` | Critical loop pathology | Check health report, fix root cause, resume |
| `GainScheduler: task complexity unknown` | Task config missing complexity estimate | Set `taskConfig.estimatedComplexity` (1-10) |
| `InterventionSystem: no handler for action X` | Intervention type not configured | Add handler or disable that intervention type |
| `EscalationHandler: Gitea API failed (401)` | Gitea token invalid/expired | Regenerate token at https://git.integrolabs.net |
| `MemoryPromotion: confidence below threshold` | Learning not confident enough to promote | Lower `minConfidence` or improve learning quality |
| `ValidationAgent: schema validation failed` | Artifact doesn't match expected schema | Disable schema check or fix artifact format |

---

## Diagnostic Commands

```bash
# Quick health check
jq '{
  config: .config,
  iteration: .currentIteration,
  status: .status,
  pidEnabled: .config.enablePIDControl,
  overseerEnabled: .config.enableOverseer,
  memoryEnabled: .config.enableSemanticMemory
}' .aiwg/ralph-external/{loop-id}/state.json

# PID diagnostics
jq '.iterations[-5:] | .[] | {
  iter: .number,
  progress: .analysis.completionPercentage,
  p: .pidMetrics.proportional,
  i: .pidMetrics.integral,
  d: .pidMetrics.derivative,
  signal: .controlSignals.controlSignal,
  action: .controlSignals.action
}' .aiwg/ralph-external/{loop-id}/state.json

# Overseer diagnostics
jq '.healthCheckLog[-5:] | .[] | {
  iter: .iterationNumber,
  status: .status,
  detections: .detections | length,
  interventions: .interventions | map(.action)
}' .aiwg/ralph-external/overseer/health-{loop-id}.json

# Memory diagnostics
jq '{
  total: .stats.totalLearnings,
  byType: .stats.byType,
  avgConfidence: (.learnings | map(.confidence) | add / length),
  avgSuccessRate: (.learnings | map(.successRate) | add / length)
}' .aiwg/knowledge/ralph-learnings.json

# Claude Intelligence diagnostics
jq '.iterations[-5:] | .[] | {
  iter: .number,
  strategyPlan: .strategy.strategy,
  strategyConfidence: .strategy.confidence,
  preValid: .preValidation.valid,
  postValid: .postValidation.valid,
  promptLength: .claudePrompt | length
}' .aiwg/ralph-external/{loop-id}/state.json
```

---

## References

- @tools/ralph-external/README.md - Architecture overview
- @.aiwg/working/epic-26-integration-complete.md - Integration summary
- @.claude/rules/anti-laziness.md - Oversight behavioral patterns
- @.aiwg/research/findings/REF-015-self-refine.md - PID control research
- @.aiwg/research/findings/REF-021-reflexion.md - Memory layer research

## Support

For issues not covered in this guide:
1. Check `.aiwg/ralph-external/{loop-id}/logs/` for detailed logs
2. Search issues at: https://github.com/jmagly/aiwg/issues
3. Create new issue with: loop ID, error messages, diagnostic output

**Diagnostic Package:**

```bash
# Generate comprehensive diagnostic package
tar czf ralph-diagnostics-$(date +%Y%m%d).tar.gz \
  .aiwg/ralph-external/{loop-id}/ \
  .aiwg/knowledge/ralph-learnings.json \
  .aiwg/ralph-external/overseer/
```

Attach to issue report for faster troubleshooting.
