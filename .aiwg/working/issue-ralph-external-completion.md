# Issue: Complete External Ralph Loop Implementation

## Summary

The ralph-external implementation has comprehensive internal architecture but lacks proper CLI integration to run as a truly external, crash-resilient process supervisor. Currently `aiwg ralph` delegates to internal scripts rather than spawning an external orchestrator that can survive terminal sessions, recover from crashes, and run multiple concurrent loops.

## Current State

### What Exists ✅

**Comprehensive modules in `tools/ralph-external/` (~13,400 lines):**
- `orchestrator.mjs` - Main loop coordination (~515 lines)
- `session-launcher.mjs` - Claude CLI spawning with output capture (~535 lines)
- `snapshot-manager.mjs` - Pre/post session state capture (~640 lines)
- `checkpoint-manager.mjs` - Periodic checkpoints during sessions (~495 lines)
- `state-manager.mjs` - Persistent state management (~280 lines)
- `output-analyzer.mjs` - Session output analysis (~300 lines)
- `prompt-generator.mjs` - Context-aware prompt building (~250 lines)
- `state-assessor.mjs` - Two-phase orient + prompt generation (~400 lines)
- `recovery-engine.mjs` - Crash detection and recovery (~200 lines)

**Research-backed modules (imported but NOT wired):**
- `best-output-tracker.mjs` - Quality dimension tracking per REF-015 Self-Refine
- `memory-manager.mjs` - Reflection window management per REF-021 Reflexion
- `cross-task-learner.mjs` - Cross-loop pattern extraction per REF-154
- `iteration-analytics.mjs` - Metrics collection and reporting
- `early-stopping.mjs` - High confidence termination detection

**Multi-loop infrastructure (exists but NOT integrated):**
- `external-multi-loop-state-manager.mjs` - Registry, file locking, lease mechanism
- `multi-loop-gitea-reporter.mjs` - Gitea integration for tracking
- `process-monitor.mjs` - PID tracking and health monitoring

**Tests:** 166 passing tests across 6 test files

### What's Missing ❌

1. **No detached process execution** - `aiwg ralph` runs in foreground, dies with terminal
2. **No proper CLI integration** - Handler delegates to internal ralph, not external
3. **Research modules not wired** - 5 modules imported but never called
4. **Multi-loop not integrated** - Orchestrator doesn't use registry
5. **No active process monitoring** - PID stored but not monitored during sessions
6. **Signal handling incomplete** - No graceful state persistence on SIGTERM

## Expected Behavior

```bash
# Start external loop - spawns detached background process
aiwg ralph "Fix all failing tests" --completion "npm test passes"
# → Prints: "Ralph loop started (loop-id: abc123). Check status with: aiwg ralph-status"
# → Returns immediately, loop continues in background

# Check status from any terminal
aiwg ralph-status
# → Shows progress, current iteration, learnings

# Resume interrupted loop
aiwg ralph-resume

# Abort running loop
aiwg ralph-abort

# Multiple concurrent loops
aiwg ralph "Task A" --completion "..." --loop-id task-a
aiwg ralph "Task B" --completion "..." --loop-id task-b
aiwg ralph-status --all
```

## Implementation Plan

### Phase 1: External Process Spawning (Core)

**1.1 Create detached process launcher**

```typescript
// src/cli/handlers/ralph-launcher.ts
import { spawn } from 'child_process';
import { join } from 'path';

export async function launchExternalRalph(options: RalphOptions): Promise<string> {
  const orchestratorPath = join(__dirname, '../../tools/ralph-external/index.mjs');

  // Spawn detached process
  const child = spawn('node', [orchestratorPath, ...buildArgs(options)], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: process.cwd(),
    env: { ...process.env, RALPH_LOOP_ID: generateLoopId() }
  });

  // Detach from parent
  child.unref();

  // Wait for startup confirmation (read from stdout)
  const loopId = await waitForStartup(child);

  // Record PID and loop ID for status/abort
  await recordLoop(loopId, child.pid);

  return loopId;
}
```

**1.2 Update CLI handler**

```typescript
// src/cli/handlers/ralph.ts
export class RalphHandler implements CommandHandler {
  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const { external = true } = parseOptions(ctx.args);

    if (external) {
      const loopId = await launchExternalRalph(buildOptions(ctx));
      return {
        success: true,
        output: `Ralph loop started (${loopId}). Check status: aiwg ralph-status`
      };
    }

    // Fallback to internal for --internal flag
    const runner = createScriptRunner(ctx.frameworkRoot);
    return runner.run('tools/ralph/ralph-cli.mjs', ctx.args);
  }
}
```

**1.3 Add status/abort/resume that work across terminals**

```typescript
// Read loop registry to find running loops
export async function getRalphStatus(): Promise<LoopStatus[]> {
  const registry = await loadRegistry('.aiwg/ralph-external/registry.json');
  return registry.loops.map(loop => ({
    id: loop.id,
    status: checkProcessAlive(loop.pid) ? 'running' : loop.status,
    iteration: loop.currentIteration,
    objective: loop.objective
  }));
}
```

### Phase 2: Wire Research Modules

**2.1 Integrate BestOutputTracker**

```javascript
// In orchestrator.mjs runLoop()
const bestOutputTracker = new BestOutputTracker(this.stateDir);

// After each iteration
bestOutputTracker.recordIteration({
  iteration: currentIteration,
  artifacts: postSnapshot.modifiedFiles,
  qualityScore: analysis.completionPercentage / 100,
  validationPassed: analysis.completed
});

// On loop completion - use best, not final
const bestOutput = bestOutputTracker.selectBest();
if (bestOutput.iteration !== currentIteration) {
  await this.restoreIteration(bestOutput.iteration);
}
```

**2.2 Integrate MemoryManager**

```javascript
// In orchestrator.mjs
const memoryManager = new MemoryManager({
  capacity: options.memory || 3,
  projectRoot: this.projectRoot
});

// Load reflections for prompt context
const reflections = memoryManager.getReflectionWindow();
promptContext.reflections = reflections;

// Record learnings after iteration
memoryManager.recordReflection({
  iteration: currentIteration,
  learnings: analysis.learnings,
  outcome: analysis.completed ? 'success' : 'continue'
});
```

**2.3 Integrate EarlyStopping**

```javascript
// In orchestrator.mjs iteration check
const earlyStopping = new EarlyStopping({
  confidenceThreshold: 0.95,
  minIterations: 2
});

if (earlyStopping.shouldStop(analysis)) {
  return { success: true, reason: 'early_stop_high_confidence' };
}
```

**2.4 Integrate IterationAnalytics**

```javascript
// In orchestrator.mjs
const analytics = new IterationAnalytics(this.stateDir);

// After each iteration
analytics.record({
  iteration: currentIteration,
  duration: result.duration,
  toolCallCount: result.toolCallCount,
  errorCount: result.errorCount,
  progressDelta: analysis.completionPercentage - previousPercentage
});

// On completion
const report = analytics.generateReport();
await this.writeCompletionReport(report);
```

**2.5 Integrate CrossTaskLearner**

```javascript
// In orchestrator.mjs before first iteration
const crossTaskLearner = new CrossTaskLearner(this.projectRoot);
const similarTasks = await crossTaskLearner.findSimilarTasks(options.objective);
if (similarTasks.length > 0) {
  promptContext.priorLearnings = crossTaskLearner.extractPatterns(similarTasks);
}

// After loop completion
await crossTaskLearner.recordTaskCompletion({
  objective: options.objective,
  success: result.success,
  iterations: result.iterations,
  keyLearnings: state.accumulatedLearnings
});
```

### Phase 3: Multi-Loop Integration

**3.1 Integrate ExternalMultiLoopStateManager**

```javascript
// In orchestrator.mjs execute()
const multiLoop = new ExternalMultiLoopStateManager(this.projectRoot);

// Check concurrent loop limit
const activeLoops = await multiLoop.getActiveLoops();
if (activeLoops.length >= 4) {
  throw new Error('Maximum concurrent loops (4) reached');
}

// Register this loop
const loopId = await multiLoop.registerLoop({
  objective: options.objective,
  pid: process.pid
});

// On completion
await multiLoop.completeLoop(loopId, result);
```

**3.2 Add multi-loop status command**

```bash
aiwg ralph-status --all
# Loop task-a: Running (iteration 3/10) - "Fix tests"
# Loop task-b: Running (iteration 1/5) - "Add feature"
# Loop task-c: Completed (5 iterations) - "Refactor"
```

### Phase 4: Process Reliability

**4.1 Active process monitoring**

```javascript
// In orchestrator.mjs during session
const processMonitor = new ProcessMonitor(this.stateDir);

// Start monitoring Claude session
processMonitor.startMonitoring(claudeProcess.pid, {
  checkInterval: 30000, // 30 seconds
  onUnresponsive: () => this.handleSessionHang(),
  onCrash: () => this.handleSessionCrash()
});
```

**4.2 Graceful shutdown with state persistence**

```javascript
// In index.mjs
process.on('SIGTERM', async () => {
  console.log('[External Ralph] SIGTERM received, saving state...');

  // Stop checkpoint manager
  const checkpointSummary = checkpointManager.stop();

  // Save current state
  await stateManager.save({
    ...currentState,
    status: 'interrupted',
    checkpointSummary
  });

  // Kill Claude session gracefully
  orchestrator.abort();

  process.exit(0);
});
```

**4.3 Recovery with RecoveryEngine**

```javascript
// In resume handler
const recoveryEngine = new RecoveryEngine(projectRoot);
const recoveryPlan = await recoveryEngine.analyze();

if (recoveryPlan.strategy === 'resume_from_checkpoint') {
  const checkpoint = recoveryPlan.checkpoint;
  await restoreFromCheckpoint(checkpoint);
}
```

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/cli/handlers/ralph-launcher.ts` | Detached process spawning |
| `src/cli/handlers/ralph-registry.ts` | Loop registry management |
| `tools/ralph-external/supervisor.mjs` | Background supervisor daemon |

### Modified Files

| File | Changes |
|------|---------|
| `src/cli/handlers/ralph.ts` | Use external by default, add launcher |
| `tools/ralph-external/index.mjs` | Add startup confirmation, PID recording |
| `tools/ralph-external/orchestrator.mjs` | Wire all research modules |
| `src/extensions/commands/definitions.ts` | Update ralph command definitions |

## Acceptance Criteria

- [ ] `aiwg ralph` spawns detached background process
- [ ] Loop continues after terminal closes
- [ ] `aiwg ralph-status` works from any terminal
- [ ] `aiwg ralph-abort` stops background process
- [ ] `aiwg ralph-resume` resumes interrupted loops
- [ ] BestOutputTracker selects best iteration output
- [ ] MemoryManager provides reflection context
- [ ] EarlyStopping terminates on high confidence
- [ ] IterationAnalytics generates metrics
- [ ] CrossTaskLearner shares learnings across loops
- [ ] Multi-loop registry tracks concurrent loops
- [ ] Max 4 concurrent loops enforced
- [ ] Process monitoring detects hangs/crashes
- [ ] SIGTERM saves state before exit
- [ ] RecoveryEngine restores from checkpoints

## Testing Requirements

- [ ] Integration test: detached process survives parent exit
- [ ] Integration test: status/abort/resume across terminals
- [ ] Unit tests for research module integration
- [ ] Unit tests for multi-loop registry
- [ ] Integration test: crash recovery scenario
- [ ] Integration test: concurrent loop limit enforcement

## References

- `@tools/ralph-external/README.md` - Current architecture
- `@.aiwg/research/findings/REF-015-self-refine.md` - Best output selection
- `@.aiwg/research/findings/REF-021-reflexion.md` - Memory management
- `@.claude/rules/anti-laziness.md` - Integration requirements
- `@.claude/rules/best-output-selection.md` - Selection rules

## Labels

`enhancement`, `ralph`, `cli`, `priority:high`

## Estimated Complexity

**High** - Requires:
- Node.js detached process management
- Cross-terminal state synchronization
- Integration of 5 research-backed modules
- Multi-loop coordination
- Process monitoring and recovery
