# RLM Agent Supervisor Integration

## Overview

The RLM (Recursive Language Models) addon integrates with AIWG's Agent Supervisor to enable recursive sub-agent decomposition for processing arbitrarily large codebases. Instead of spawning raw tmux sessions, RLM sub-agents are managed through the supervisor's task queue, enabling consistent lifecycle management, concurrency control, and progress tracking.

**Core principle**: Every RLM sub-call is a supervisor task, not a raw subprocess. This provides unified monitoring, cost tracking, and error recovery across the entire recursion tree.

## Architecture Overview

### RLM → Supervisor Mapping

| RLM Pattern | Supervisor Implementation |
|-------------|---------------------------|
| `rlm-query` single file | `supervisor.submit(prompt, {agent: 'rlm-agent', metadata: {depth, context_file}})` |
| `rlm-batch` parallel fan-out | Multiple `supervisor.submit()` calls with shared `batch_id` metadata |
| Recursive sub-calls | `supervisor.submit()` with incremented `depth` in metadata |
| Depth tracking | `metadata.depth` field, max 3 by default (from manifest) |
| Result aggregation | Poll completed tasks by `batch_id`, aggregate outputs |

### Supervisor Role

The Agent Supervisor (`tools/daemon/agent-supervisor.mjs`) provides:

1. **Task Queue Management**: Queue RLM sub-calls, process up to `maxConcurrency` in parallel
2. **Lifecycle Tracking**: Track states (queued → running → completed/failed)
3. **Output Streaming**: Real-time stdout/stderr from sub-agents via events
4. **Timeout Enforcement**: Kill sub-agents that exceed `taskTimeout` (default 2 hours)
5. **Graceful Shutdown**: Cancel queued tasks, wait for running tasks or force-kill on timeout
6. **Event Integration**: Emit `task:queued`, `task:started`, `task:completed`, `task:failed` events for hub integration

### Integration Points

```
RLM Agent
   ↓
   ↓ submit() with depth metadata
   ↓
Agent Supervisor
   ↓
   ├─→ Task Queue (priority-sorted)
   ├─→ Running Pool (≤ maxConcurrency)
   ├─→ Event Emitter (task lifecycle events)
   └─→ Task Store (persistent state)
       ↓
       ↓ events
       ↓
Messaging Hub (Telegram/Discord/REPL)
```

## Lifecycle Management

### Task Submission (rlm-query)

When `rlm-query <file> <prompt>` is invoked:

```javascript
// Internal RLM agent logic (conceptual)
const task = supervisor.submit(
  // Prompt includes context file and sub-prompt
  `Context: ${readFileSync(contextFile)}\n\nTask: ${subPrompt}`,
  {
    agent: 'rlm-agent',         // Target agent
    priority: 5 - depth,        // Deeper calls = lower priority
    metadata: {
      type: 'rlm-query',
      depth: currentDepth + 1,
      context_file: contextFile,
      parent_task_id: currentTaskId,
      max_depth: 3              // From manifest default
    }
  }
);

// Wait for completion
await waitForTaskCompletion(task.id);
const result = taskStore.getTask(task.id).result;
```

**Key behaviors**:
- **Not raw tmux**: Uses supervisor's managed `spawn()` with proper process tracking
- **Priority inversion**: Deeper recursion gets lower priority to prevent queue starvation
- **Depth enforcement**: If `depth >= max_depth`, reject submission immediately

### Task Submission (rlm-batch)

When `rlm-batch <pattern> <prompt>` is invoked:

```javascript
const files = glob(pattern);
const batchId = `batch-${Date.now()}`;
const tasks = [];

// Submit all tasks in parallel (up to maxConcurrency)
for (const file of files) {
  const task = supervisor.submit(
    `Context: ${readFileSync(file)}\n\nTask: ${subPrompt}`,
    {
      agent: 'rlm-agent',
      priority: 5 - depth,  // Same depth-based priority
      metadata: {
        type: 'rlm-batch',
        batch_id: batchId,
        depth: currentDepth + 1,
        context_file: file,
        total_in_batch: files.length
      }
    }
  );
  tasks.push(task);
}

// Wait for all to complete
await Promise.all(tasks.map(t => waitForTaskCompletion(t.id)));

// Aggregate results
const results = tasks.map(t => taskStore.getTask(t.id).result);
const aggregated = aggregateByStrategy(results, aggregateStrategy);
```

**Key behaviors**:
- **Parallel spawning**: All tasks submitted immediately, supervisor controls concurrency
- **Batch tracking**: Shared `batch_id` in metadata for group operations
- **Aggregate after completion**: Poll completed tasks, merge results according to strategy

### Sub-Agent Spawning (Recursive Calls)

When a sub-agent at depth N spawns its own sub-agent (depth N+1):

```javascript
// Inside depth-N sub-agent
if (needsRecursion && currentDepth < maxDepth) {
  const childTask = supervisor.submit(
    // Child prompt
    childPrompt,
    {
      agent: 'rlm-agent',
      priority: 5 - (currentDepth + 1),  // Lower priority
      metadata: {
        type: 'rlm-recursive',
        depth: currentDepth + 1,
        parent_task_id: myTaskId,
        max_depth: maxDepth
      }
    }
  );

  // Depth N sub-agent waits for depth N+1 to complete
  await waitForTaskCompletion(childTask.id);
  const childResult = taskStore.getTask(childTask.id).result;
} else if (currentDepth >= maxDepth) {
  throw new Error(`Max recursion depth ${maxDepth} exceeded`);
}
```

**Depth limit enforcement**:
```javascript
// In supervisor.submit() or pre-submit validation
if (options.metadata?.depth >= MAX_DEPTH) {
  throw new Error(
    `Recursion depth limit exceeded: ${options.metadata.depth} >= ${MAX_DEPTH}`
  );
}
```

### Graceful Shutdown

When daemon shuts down with active RLM tasks:

```javascript
// supervisor.shutdown() behavior
await supervisor.shutdown(timeoutMs = 30000);

// 1. Reject all queued tasks (including RLM sub-calls)
while (queue.length > 0) {
  const task = queue.shift();
  taskStore.cancelTask(task.id);
  emit('task:cancelled', {taskId: task.id, reason: 'shutdown'});
}

// 2. Wait for running tasks (including depth-N sub-agents) to complete
// 3. If timeout exceeded, SIGKILL all running processes
// 4. All RLM recursion trees are terminated consistently
```

**Impact on RLM**:
- Queued sub-calls are cancelled (partial tree completion)
- Running sub-calls are given 30s to complete gracefully
- If timeout, entire tree is killed (no orphan processes)
- Task store preserves partial state for later inspection

## Concurrency Control

### maxConcurrency Limits Parallel Sub-Agents

```javascript
// Supervisor config
const supervisor = new AgentSupervisor({
  maxConcurrency: 10,  // Max 10 sub-agents running simultaneously
  taskTimeout: 120 * 60 * 1000  // 2 hours per sub-agent
});
```

**Behavior**:
- If 10 RLM sub-agents are running, 11th waits in queue
- Queue is priority-sorted (deeper calls = lower priority)
- As sub-agents complete, queue drains automatically
- Prevents system overload from deep/wide recursion trees

### Queue Overflow Handling

When `rlm-batch` spawns 100 tasks but `maxConcurrency: 10`:

```
Iteration 0: Submit all 100 tasks → queue has 100 items
Iteration 1: Spawn 10 (up to maxConcurrency) → queue: 90, running: 10
Iteration 2: As tasks complete, spawn more → queue: 85, running: 10
...
Iteration 10: All 100 processed → queue: 0, running: 0
```

**No manual batching needed**: Supervisor handles queue automatically.

### Recommended Concurrency by Task Type

| Task Type | Recommended maxConcurrency | Rationale |
|-----------|----------------------------|-----------|
| **Single-file rlm-query** | 3-5 | Low parallelism, sequential by nature |
| **rlm-batch (10-50 files)** | 10-20 | Balance throughput and memory |
| **rlm-batch (100+ files)** | 20-50 | High throughput, watch memory (each ~100MB) |
| **Deep recursion (depth 3)** | 5-10 | Conservative to avoid cascade failures |
| **Mixed workload** | 10 | Default balance for typical daemon use |

**Memory considerations**:
- Each sub-agent: ~100MB RAM
- 50 parallel sub-agents: ~5GB RAM
- Adjust `maxConcurrency` based on available system memory
- Monitor with `supervisor.getStatus()` for runningCount

## Event Integration

### Task Lifecycle Events

All RLM sub-calls emit standard supervisor events:

| Event | When | Payload |
|-------|------|---------|
| `task:queued` | Task added to queue | `{taskId, prompt, queueSize}` |
| `task:started` | Task begins execution | `{taskId, pid}` |
| `task:output` | Sub-agent produces output | `{taskId, chunk, stream}` |
| `task:completed` | Task succeeds | `{taskId, result, duration}` |
| `task:failed` | Task fails | `{taskId, error, exitCode}` |
| `task:timeout` | Task exceeds taskTimeout | `{taskId}` |
| `task:cancelled` | Task cancelled (shutdown or manual) | `{taskId, signal}` |

### RLM-Specific Event Metadata

Enhance events with RLM context:

```javascript
// On task:started for RLM sub-agent
supervisor.on('task:started', ({taskId, pid}) => {
  const task = taskStore.getTask(taskId);
  if (task.metadata?.type?.startsWith('rlm-')) {
    console.log(`RLM sub-agent started: depth ${task.metadata.depth}, file ${task.metadata.context_file}`);
  }
});

// On task:completed, check if part of batch
supervisor.on('task:completed', ({taskId, result}) => {
  const task = taskStore.getTask(taskId);
  if (task.metadata?.batch_id) {
    // Check if all batch tasks complete
    const batchTasks = taskStore.getTasksByBatchId(task.metadata.batch_id);
    const allComplete = batchTasks.every(t => t.state === 'completed');
    if (allComplete) {
      emit('rlm:batch:completed', {batchId: task.metadata.batch_id});
    }
  }
});
```

### Progress Reporting Chain

```
Sub-agent (depth 2)
   ↓ stdout
   ↓
Supervisor
   ↓ task:output event
   ↓
Messaging Hub
   ↓
Telegram/Discord/REPL
   (User sees: "RLM sub-agent [depth 2/3] processing src/auth/login.ts...")
```

**Implementation**:
```javascript
// In messaging hub
supervisor.on('task:output', ({taskId, chunk, stream}) => {
  const task = taskStore.getTask(taskId);
  if (task.metadata?.type?.startsWith('rlm-')) {
    // Format for user
    const depthLabel = `[depth ${task.metadata.depth}/${task.metadata.max_depth}]`;
    messagingHub.send(`RLM ${depthLabel}: ${chunk}`);
  }
});
```

## Depth Tracking

### Metadata Propagation

Depth is tracked in task metadata, incremented on each spawn:

```javascript
// Root RLM call (depth 0)
const rootTask = supervisor.submit(prompt, {
  metadata: {depth: 0, max_depth: 3}
});

// Depth 1 sub-call (spawned by root)
const childTask = supervisor.submit(childPrompt, {
  metadata: {depth: 1, max_depth: 3, parent_task_id: rootTask.id}
});

// Depth 2 sub-call (spawned by depth 1)
const grandchildTask = supervisor.submit(grandchildPrompt, {
  metadata: {depth: 2, max_depth: 3, parent_task_id: childTask.id}
});

// Depth 3 is MAX, cannot spawn further
// Attempting depth 4 throws error
```

### Enforcement of maxDepth

**Default max depth**: 3 (from `agentic/code/addons/rlm/manifest.json`)

```json
{
  "config": {
    "max_depth": 3,
    "max_sub_calls": 20
  }
}
```

**Enforcement points**:
1. **Pre-submit validation** (before `supervisor.submit()`):
   ```javascript
   if (metadata.depth >= maxDepth) {
     throw new Error(`Max depth ${maxDepth} exceeded`);
   }
   ```

2. **Task creation** (in supervisor):
   ```javascript
   if (options.metadata?.depth >= MAX_DEPTH) {
     emit('task:failed', {taskId, error: 'Max depth exceeded'});
     return null;
   }
   ```

3. **Agent runtime** (inside RLM agent):
   ```javascript
   if (this.currentDepth >= this.maxDepth) {
     return 'MAX_DEPTH_REACHED';  // Don't spawn more sub-calls
   }
   ```

### Recursion Tree Tracking

Task metadata forms a tree structure:

```javascript
// Task tree example
{
  "task-root-001": {
    depth: 0,
    parent_task_id: null,
    children: ["task-child-001", "task-child-002"]
  },
  "task-child-001": {
    depth: 1,
    parent_task_id: "task-root-001",
    children: ["task-grandchild-001"]
  },
  "task-grandchild-001": {
    depth: 2,
    parent_task_id: "task-child-001",
    children: []  // Depth 3 cannot spawn children
  }
}
```

**Visualization** (via task store query):
```
Root (depth 0): "Analyze codebase security"
├── Child 1 (depth 1): "Check src/auth/ for vulnerabilities"
│   └── Grandchild 1 (depth 2): "Analyze src/auth/login.ts"
├── Child 2 (depth 1): "Check src/api/ for vulnerabilities"
    └── Grandchild 2 (depth 2): "Analyze src/api/users.ts"
```

## Error Recovery

### Sub-Agent Crash Handling

When a sub-agent crashes unexpectedly:

```javascript
// Supervisor detects process exit with non-zero code
proc.on('exit', (code, signal) => {
  if (code !== 0 && signal !== 'SIGTERM') {
    // Sub-agent crashed
    taskStore.failTask(task.id, `Process exited with code ${code}`);
    emit('task:failed', {taskId: task.id, exitCode: code});

    // If part of batch, mark batch as partial failure
    if (task.metadata?.batch_id) {
      batchStore.recordFailure(task.metadata.batch_id, task.id);
    }
  }
});
```

**Impact on RLM**:
- Failed sub-call does not crash parent
- Parent receives `null` or error result
- Partial tree completion (some branches succeed, some fail)
- Final report documents which branches failed

### Partial Tree Completion

When some sub-calls succeed and some fail:

```javascript
// rlm-batch aggregation with partial failures
const tasks = await Promise.allSettled(
  taskIds.map(id => waitForTaskCompletion(id))
);

const successful = tasks.filter(t => t.status === 'fulfilled');
const failed = tasks.filter(t => t.status === 'rejected');

if (failed.length > 0) {
  console.warn(`Batch partially failed: ${failed.length}/${tasks.length} tasks failed`);
}

// Aggregate only successful results
const results = successful.map(t => taskStore.getTask(t.value).result);
return aggregateByStrategy(results, strategy);
```

**User notification**:
```
RLM Batch: PARTIAL SUCCESS

Pattern: src/**/*.ts
Processed: 87/100 files
Failed: 13 files (see report for details)

Aggregated results based on 87 successful analyses.
Failed files:
  - src/auth/legacy.ts (timeout)
  - src/utils/deprecated.ts (parse error)
  ...
```

### Retry Strategy for Failed Sub-Calls

**Option 1: Automatic retry** (at supervisor level):
```javascript
const supervisor = new AgentSupervisor({
  retryPolicy: {
    maxRetries: 1,          // Retry failed tasks once
    retryDelay: 5000,       // Wait 5s before retry
    retryableErrors: [      // Only retry specific errors
      'ETIMEDOUT',
      'ECONNRESET'
    ]
  }
});
```

**Option 2: Manual retry** (at RLM level):
```javascript
// Inside RLM agent
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    const task = supervisor.submit(prompt, options);
    const result = await waitForTaskCompletion(task.id);
    return result;  // Success
  } catch (error) {
    if (attempt === 2) throw error;  // Max retries exceeded
    await sleep(1000 * (attempt + 1));  // Exponential backoff
  }
}
```

**Recommended**: Option 2 (RLM-level retry) for more control over recursive retry logic.

## Configuration

### Supervisor Options Relevant to RLM

```javascript
const supervisor = new AgentSupervisor({
  // Core settings
  maxConcurrency: 10,           // Max parallel sub-agents (default: 3)
  taskTimeout: 120 * 60 * 1000, // 2 hours per sub-agent (default: 2 hours)
  agentCommand: 'claude',       // Command to spawn agents
  agentArgs: [],                // Additional args for all agents

  // Task store for persistent state
  taskStore: new TaskStore({
    path: '.aiwg/daemon/tasks.db'
  }),

  // Optional: Retry policy
  retryPolicy: {
    maxRetries: 1,
    retryDelay: 5000
  }
});
```

### Configuration for Different Workload Profiles

#### Profile 1: Single-file RLM queries (low concurrency)

```javascript
{
  maxConcurrency: 3,
  taskTimeout: 300000,  // 5 minutes
  description: "Conservative for sequential deep recursion"
}
```

#### Profile 2: Batch processing (high throughput)

```javascript
{
  maxConcurrency: 20,
  taskTimeout: 600000,  // 10 minutes
  description: "High throughput for parallel file processing"
}
```

#### Profile 3: Deep recursion trees (balanced)

```javascript
{
  maxConcurrency: 10,
  taskTimeout: 1200000,  // 20 minutes
  description: "Balanced for depth-3 recursion with moderate parallelism"
}
```

#### Profile 4: Mixed workload (default)

```javascript
{
  maxConcurrency: 10,
  taskTimeout: 7200000,  // 2 hours
  description: "Default balanced profile"
}
```

### RLM Addon Configuration

From `agentic/code/addons/rlm/manifest.json`:

```json
{
  "config": {
    "max_depth": 3,
    "max_sub_calls": 20,
    "sub_model": "sonnet",
    "parallel_sub_calls": true,
    "timeout_per_subcall": 300,
    "supervisor": {
      "default_max_concurrency": 10,
      "default_task_timeout": 7200000
    }
  }
}
```

## Integration Examples

### Example 1: Simple rlm-query

```javascript
// User invokes: /rlm-query src/auth/login.ts "extract function names"

// RLM agent internally:
const contextFile = 'src/auth/login.ts';
const subPrompt = 'extract function names';
const context = readFileSync(contextFile);

const task = supervisor.submit(
  `Context:\n${context}\n\nTask: ${subPrompt}`,
  {
    agent: 'rlm-agent',
    priority: 5,  // Depth 0 (high priority)
    metadata: {
      type: 'rlm-query',
      depth: 0,
      context_file: contextFile,
      max_depth: 3
    }
  }
);

// Wait for completion
await waitForTaskCompletion(task.id);
const result = taskStore.getTask(task.id).result;

// Return to user
console.log(`Extracted functions: ${result.output}`);
```

**Supervisor behavior**:
- Task queued immediately
- Spawned when `runningCount < maxConcurrency`
- Output streamed via `task:output` events
- Completed task marked in task store

### Example 2: rlm-batch with partial failures

```javascript
// User invokes: /rlm-batch "src/**/*.ts" "count functions"

const files = glob('src/**/*.ts');  // 100 files
const batchId = `batch-${Date.now()}`;
const tasks = [];

// Submit all 100 tasks
for (const file of files) {
  const task = supervisor.submit(
    `Context:\n${readFileSync(file)}\n\nTask: count functions`,
    {
      agent: 'rlm-agent',
      priority: 5,
      metadata: {
        type: 'rlm-batch',
        batch_id: batchId,
        depth: 0,
        context_file: file,
        total_in_batch: 100
      }
    }
  );
  tasks.push(task);
}

// Wait for all (up to maxConcurrency run in parallel)
const results = await Promise.allSettled(
  tasks.map(t => waitForTaskCompletion(t.id))
);

// Handle partial failures
const successful = results.filter(r => r.status === 'fulfilled');
const failed = results.filter(r => r.status === 'rejected');

if (failed.length > 0) {
  console.warn(`${failed.length} files failed`);
}

// Aggregate successful results
const counts = successful.map(r =>
  taskStore.getTask(r.value).result.output
);
const totalFunctions = counts.reduce((sum, c) => sum + parseInt(c), 0);

console.log(`Total functions: ${totalFunctions} (from ${successful.length}/${files.length} files)`);
```

**Supervisor behavior**:
- All 100 tasks queued immediately
- 10 run in parallel (if `maxConcurrency: 10`)
- As each completes, next is spawned
- Failed tasks don't block others
- Aggregation happens after all complete/fail

### Example 3: Recursive sub-call (depth 2)

```javascript
// Root task (depth 0): "Analyze security"
const rootTask = supervisor.submit(
  "Analyze security across entire codebase",
  {metadata: {depth: 0, max_depth: 3}}
);

// Root agent decides to delegate to module-level analysis (depth 1)
const authModuleTask = supervisor.submit(
  "Analyze security in src/auth/ module",
  {metadata: {depth: 1, max_depth: 3, parent_task_id: rootTask.id}}
);

// Depth-1 agent decides to analyze specific file (depth 2)
const loginFileTask = supervisor.submit(
  "Analyze security in src/auth/login.ts",
  {metadata: {depth: 2, max_depth: 3, parent_task_id: authModuleTask.id}}
);

// Depth-2 agent completes (cannot spawn depth 3 sub-calls)
await waitForTaskCompletion(loginFileTask.id);

// Depth-1 agent collects depth-2 results and completes
await waitForTaskCompletion(authModuleTask.id);

// Root agent collects all results and synthesizes
await waitForTaskCompletion(rootTask.id);
```

**Supervisor behavior**:
- Priority inversions: depth 0 > depth 1 > depth 2
- If maxConcurrency exceeded, deeper tasks queue
- Each depth waits for children before completing
- Depth 2 cannot spawn depth 3 (max_depth enforcement)

## Success Criteria

RLM-Supervisor integration is successful when:

- [ ] All RLM sub-calls managed via supervisor (no raw tmux)
- [ ] Depth tracking accurate across entire recursion tree
- [ ] maxDepth enforced (no depth 4+ sub-calls)
- [ ] maxConcurrency respected (never exceeds limit)
- [ ] Partial tree completion handled (failures don't crash parents)
- [ ] Progress events reach messaging hub
- [ ] Graceful shutdown terminates all sub-agents
- [ ] Cost tracking accurate (sum all sub-call costs)
- [ ] Task store preserves full recursion tree for inspection

## Troubleshooting

### Issue: Queue overflow (100+ queued tasks)

**Symptom**: `supervisor.getStatus()` shows large queuedCount, slow throughput

**Diagnosis**: `maxConcurrency` too low for workload

**Solution**: Increase `maxConcurrency` (e.g., 10 → 20)

### Issue: Sub-agent timeouts

**Symptom**: Many `task:timeout` events, sub-agents killed

**Diagnosis**: `taskTimeout` too short for complex tasks

**Solution**: Increase `taskTimeout` (e.g., 2 hours → 4 hours)

### Issue: Excessive memory usage

**Symptom**: System memory approaching limit

**Diagnosis**: Too many parallel sub-agents (each ~100MB)

**Solution**: Decrease `maxConcurrency` (e.g., 50 → 20)

### Issue: Depth limit not enforced

**Symptom**: Depth 4+ sub-calls observed

**Diagnosis**: Missing depth validation in submit path

**Solution**: Add pre-submit check:
```javascript
if (metadata.depth >= maxDepth) {
  throw new Error(`Max depth ${maxDepth} exceeded`);
}
```

### Issue: Partial batch never completes

**Symptom**: Some batch tasks stuck in "running" state forever

**Diagnosis**: Sub-agent crashed without emitting exit event

**Solution**: Add timeout handling per task, force-kill on timeout

## References

- @tools/daemon/agent-supervisor.mjs - Agent Supervisor implementation
- @agentic/code/addons/rlm/agents/rlm-agent.md - RLM agent definition
- @agentic/code/addons/rlm/commands/rlm-query.md - Single sub-call command
- @agentic/code/addons/rlm/commands/rlm-batch.md - Batch parallel command
- @agentic/code/addons/rlm/schemas/rlm-task-tree.yaml - Task tree schema
- @tools/daemon/task-store.mjs - Persistent task state
- @.aiwg/research/findings/REF-089-recursive-language-models.md - RLM research
- @.claude/rules/subagent-scoping.md - Subagent context minimization
- Issue #323 - Supervisor integration implementation

---

**Document Status**: COMPLETE
**Last Updated**: 2026-02-09
**Related Epic**: Issue #321 (AIWG RLM Addon)
