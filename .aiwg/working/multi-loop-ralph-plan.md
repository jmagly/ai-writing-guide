# Multi-Loop Ralph Architecture Plan

## Scope

**Level 1 (Primary Focus): Internal/Agentic Ralph Loop**
- Files: `tools/ralph/`, `.aiwg/ralph/`
- Used by: Claude Code agents running in-session
- Label: `ralph-l1-multiloop`

**Level 2 (Secondary - Tickets Only): External Ralph Loop**
- Files: `tools/ralph-external/`, `.aiwg/ralph-external/`
- Used by: External supervisor for crash-resilient 6-8hr sessions
- Label: `ralph-l2-multiloop`

## Problem Statement

Currently, Ralph loops assume single-instance execution:
- `.aiwg/ralph/current-loop.json` - single global state file (Level 1)
- `.aiwg/ralph-external/session-state.json` - single external state file (Level 2)

Multiple agents working in parallel would overwrite each other's state, causing:
- Lost progress tracking
- Corrupted iteration histories
- Recovery failures
- Inability to run concurrent tasks

## Goals

1. Enable 2-10+ parallel Ralph loops in the same repository
2. Maintain backward compatibility with existing single-loop workflows
3. Preserve all existing features (recovery, checkpoints, learnings)
4. Apply same pattern to both levels (implement L1 first, then L2)
5. Enable cross-loop learning while maintaining isolation

## Research Foundation

### Critical Quantitative Constraints (REF-086 Coordination Tax)

These hard limits are backed by empirical research and MUST be enforced:

| Constraint | Value | Source | Rationale |
|------------|-------|--------|-----------|
| **MAX_CONCURRENT_LOOPS** | 4 | REF-086, REF-088 | Performance peaks at 3-4 agents; diminishing returns beyond |
| **Error Amplification (Independent)** | 17.2x | REF-086 | Independent agents amplify errors 17.2x vs baseline |
| **Error Amplification (Centralized)** | 4.4x | REF-086 | Centralized coordination reduces errors to 4.4x |
| **Capability Threshold** | 45% | REF-086 | Avoid multi-loop when single-agent achieves >45% task completion |
| **Tool-Heavy Threshold** | 8 calls | REF-086 | Tasks with >8 tool calls suffer disproportionate overhead |
| **Communication Paths** | n*(n-1)/2 | REF-088 | 4 loops = 6 paths, 7 loops = 21 paths (quadratic growth) |

**Key Implication**: We MUST implement centralized coordination (registry + orchestrator) to avoid the 17.2x error trap that occurs with "bag of independent agents" approaches.

### Optimal Agent/Loop Ranges (REF-088)

| Loop Count | Communication Paths | Complexity | Recommendation |
|------------|---------------------|------------|----------------|
| 2 | 1 | Trivial | Simple parallel tasks |
| **3-4** | **3-6** | **Manageable** | **Standard multi-loop (RECOMMENDED)** |
| 5-7 | 10-21 | Significant | Complex workflows only |
| 8+ | 28+ | Excessive | **AVOID** - use hierarchical patterns |

### When to Use Multi-Loop (Decision Framework)

**Use multi-loop when:**
- Single-agent task completion < 45%
- Tasks are parallelizable (not sequential dependencies)
- Each loop has isolated resource needs
- Coordination overhead < individual task time

**Avoid multi-loop when:**
- Single-agent can achieve > 45% completion
- Tasks are strictly sequential (39-70% performance degradation)
- Tasks are tool-heavy (> 8 tool calls per iteration)
- Loop count would exceed 4-agent threshold

### Academic Sources

| Source | Key Finding | Application |
|--------|-------------|-------------|
| [Martin Kleppmann - Distributed Locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html) | Lease-based locks with fencing tokens prevent split-brain | Use time-bounded locks with stale detection |
| [REF-004 MAGIS](https://arxiv.org/abs/2403.17927) | Dependency-aware task decomposition | Track loop dependencies, enable parallel execution |
| [REF-022 AutoGen](https://arxiv.org/abs/2308.08155) | ConversableAgent interface with termination | Explicit termination conditions per loop |
| [REF-013 MetaGPT](https://arxiv.org/abs/2308.00352) | Publish-subscribe shared state (159% improvement) | Shared artifact pool with subscriptions |
| [REF-057 Agent Laboratory](https://arxiv.org/abs/2401.06072) | 84% cost reduction with HITL gates | Human gates at coordination level, not per-loop |
| [REF-082 Multi-Agent Orchestration](REF-082-multi-agent-orchestration.md) | 4-layer hierarchy, ConcurrencyManager, tool stratification | MAX_CONCURRENT_AGENTS limit, file locking |
| [REF-083 Event-Driven MAS](REF-083-event-driven-multi-agent.md) | 4 patterns: Orchestrator-Worker, Hierarchical, Blackboard, Market-Based | Orchestrator-Worker for registry coordination |
| [REF-084 Multi-Agent Patterns](REF-084-multi-agent-system-patterns.md) | 4-dimensional framework: Control, Execution, Coordination, Interaction | "As soon as you introduce more than one agent, you are designing a distributed system" |
| [REF-085 LangChain Architecture](REF-085-langchain-multi-agent-architecture.md) | Subagents, Skills, Handoffs, Routers; 90.2% improvement | Router pattern for loop selection |
| [REF-086 Coordination Tax](REF-086-multi-agent-coordination-tax.md) | **17.2x error trap**, 4-agent threshold, 45% capability threshold | Critical constraints above |
| [REF-087 NexAI Patterns](REF-087-nexai-agent-patterns.md) | 5-layer architecture, 3 orchestration patterns | Enterprise-grade observability |
| [REF-088 DEV Guide 2026](REF-088-dev-multi-agent-guide-2026.md) | 3-7 optimal, n*(n-1)/2 paths, 35% fail from over-engineering | Start simple (3 loops), expand only when needed |

### Practitioner Sources

| Source | Key Finding | Application |
|--------|-------------|-------------|
| [Redis Locking Patterns](https://medium.com/@navidbarsalari/the-twelve-redis-locking-patterns-every-distributed-systems-engineer-should-know-06f16dfe7375) | Reader-writer locks, lease mechanisms | Allow concurrent reads, exclusive writes |
| [Terraform State Locking](https://stategraph.com/blog/terraform-state-locking-explained) | File-based locking with timeout | Simple lock file with PID and timestamp |
| [Multi-Agent Orchestration](https://gerred.github.io/building-an-agentic-system/second-edition/part-iv-advanced-patterns/chapter-10-multi-agent-orchestration.html) | Tool isolation, resource boundaries | Each loop gets isolated working directory |
| [Confluent Event-Driven MAS](https://www.confluent.io/blog/event-driven-multi-agent-systems/) | 3-7 agents per workflow optimal | Keep loop count manageable, hierarchy for scale |

### Key Design Principles (Research-Backed)

1. **Lock Only What You Modify** - Loops shouldn't block each other unless accessing same resource
2. **Lease-Based Locks** - Time-bounded with automatic expiry prevents deadlocks
3. **Isolation by Default** - Each loop has private working directory
4. **Shared State is Read-Only** - Cross-loop artifacts are read-only until explicit handoff
5. **Bounded Iterations** - Hard limits prevent runaway execution (MAGIS uses max 3)
6. **Human Gates at Coordination Level** - Not per-iteration, per-loop-completion

## Architecture Design

### Coordination Pattern Selection (REF-083)

Based on REF-083's four event-driven patterns, we select **Orchestrator-Worker** for multi-loop Ralph:

| Pattern | Control | Our Use |
|---------|---------|---------|
| **Orchestrator-Worker** | High (central) | ✅ **Selected** - Registry acts as coordinator |
| Hierarchical | Medium | Future: Phase-based loop nesting |
| Blackboard | Low | Partial: Shared patterns directory |
| Market-Based | Low | Not applicable |

**Why Orchestrator-Worker:**
- Registry provides central coordination (avoiding 17.2x error trap)
- Clear task delegation to worker loops
- Easier debugging and monitoring
- Meets compliance/audit requirements via loop audit trail

**Registry as Orchestrator responsibilities:**
1. Track all active loops
2. Enforce MAX_CONCURRENT_LOOPS
3. Prevent resource conflicts via locking
4. Coordinate cross-loop learning extraction
5. Provide unified status/abort interface

### 1. Directory Structure

**Current Structure:**
```
.aiwg/
├── ralph/
│   ├── current-loop.json         # Single loop state
│   ├── iterations/               # Shared iterations
│   ├── checkpoints/
│   └── debug-memory/
└── ralph-external/
    ├── session-state.json        # Single external state
    ├── iterations/
    └── ...
```

**New Multi-Loop Structure:**
```
.aiwg/
├── ralph/
│   ├── registry.json             # NEW: Active loop registry
│   ├── loops/                    # NEW: Per-loop state directories
│   │   ├── {loop-id-1}/
│   │   │   ├── state.json        # Loop-specific state
│   │   │   ├── iterations/       # Loop-specific iterations
│   │   │   ├── checkpoints/
│   │   │   └── debug-memory/
│   │   ├── {loop-id-2}/
│   │   │   └── ...
│   │   └── ...
│   ├── shared/                   # NEW: Cross-loop resources
│   │   ├── patterns/             # Learned patterns (cross-loop)
│   │   └── memory/               # Cross-task learnings
│   └── archive/                  # NEW: Completed/aborted loops
│       ├── {loop-id-old}/
│       └── ...
├── ralph-external/
│   ├── registry.json             # NEW: External loop registry
│   ├── loops/                    # NEW: Per-loop directories
│   │   ├── {loop-id}/
│   │   │   ├── session-state.json
│   │   │   ├── iterations/
│   │   │   └── ...
│   └── archive/
└── current-loop.json             # DEPRECATED: Symlink for backward compat
```

### 2. Loop Registry Schema

**File: `.aiwg/ralph/registry.json`**

**Critical Enforcement (REF-086, REF-088):**
The registry MUST enforce MAX_CONCURRENT_LOOPS=4. Attempts to create a 5th concurrent loop should:
1. Warn user with communication path overhead (10 paths = "significant complexity")
2. Suggest completing or aborting an existing loop
3. Allow override with `--force` flag (logs warning for post-analysis)

```json
{
  "version": "2.0.0",
  "max_concurrent_loops": 4,
  "updated_at": "2026-02-02T15:00:00Z",
  "active_loops": [
    {
      "loop_id": "ralph-fix-tests-a1b2c3",
      "task_summary": "Fix all failing tests",
      "status": "running",
      "started_at": "2026-02-02T14:00:00Z",
      "owner": "agent-1",
      "pid": 12345,
      "iteration": 3,
      "max_iterations": 10
    },
    {
      "loop_id": "ralph-typescript-d4e5f6",
      "task_summary": "Migrate to TypeScript",
      "status": "paused",
      "started_at": "2026-02-02T13:00:00Z",
      "owner": "agent-2",
      "pid": null,
      "iteration": 7,
      "max_iterations": 20
    }
  ],
  "total_active": 2,
  "total_completed": 15,
  "total_aborted": 3
}
```

### 3. Loop ID Generation

**Pattern:** `ralph-{task-slug}-{short-uuid}`

```javascript
function generateLoopId(task) {
  const slug = task
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 30);
  const shortUuid = randomUUID().split('-')[0]; // First 8 chars
  return `ralph-${slug}-${shortUuid}`;
}

// Examples:
// "Fix all failing tests" → "ralph-fix-all-failing-tests-a1b2c3d4"
// "Migrate to TypeScript" → "ralph-migrate-to-typescript-e5f6g7h8"
```

### 4. State Manager Updates

**New `MultiLoopStateManager` class:**

```javascript
class MultiLoopStateManager {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.baseDir = join(projectRoot, '.aiwg', 'ralph');
    this.registryPath = join(this.baseDir, 'registry.json');
    this.loopsDir = join(this.baseDir, 'loops');
    this.archiveDir = join(this.baseDir, 'archive');
  }

  // Create new loop with unique ID
  // CRITICAL: Enforces MAX_CONCURRENT_LOOPS (REF-086, REF-088)
  createLoop(config, options = {}) {
    const MAX_CONCURRENT_LOOPS = 4; // Research-backed limit
    const registry = this.loadRegistry();

    // Enforce concurrent loop limit
    if (registry.active_loops.length >= MAX_CONCURRENT_LOOPS) {
      const paths = this.calculateCommunicationPaths(registry.active_loops.length + 1);
      if (!options.force) {
        throw new Error(
          `Cannot create loop: ${registry.active_loops.length} loops already active ` +
          `(max: ${MAX_CONCURRENT_LOOPS}).\n` +
          `Adding another would create ${paths} communication paths (REF-088).\n` +
          `Use --force to override or complete/abort an existing loop.`
        );
      }
      // Log warning for post-analysis when --force used
      console.warn(`WARNING: Exceeding recommended MAX_CONCURRENT_LOOPS (${MAX_CONCURRENT_LOOPS})`);
      console.warn(`Communication paths: ${paths} (overhead increases quadratically)`);
    }

    const loopId = generateLoopId(config.task);
    const loopDir = join(this.loopsDir, loopId);
    mkdirSync(loopDir, { recursive: true });

    const state = { loopId, ...config };
    this.saveLoopState(loopId, state);
    this.registerLoop(loopId, config);
    return { loopId, state };
  }

  // Calculate communication paths: n*(n-1)/2 (REF-088)
  calculateCommunicationPaths(n) {
    return (n * (n - 1)) / 2;
  }

  // Get loop by ID
  getLoop(loopId) {
    const statePath = join(this.loopsDir, loopId, 'state.json');
    return JSON.parse(readFileSync(statePath, 'utf8'));
  }

  // List all active loops
  listActiveLoops() {
    const registry = this.loadRegistry();
    return registry.active_loops;
  }

  // Atomic registry update with file locking
  updateRegistry(updateFn) {
    const lockPath = `${this.registryPath}.lock`;
    acquireLock(lockPath);
    try {
      const registry = this.loadRegistry();
      const updated = updateFn(registry);
      this.saveRegistry(updated);
    } finally {
      releaseLock(lockPath);
    }
  }

  // Archive completed loop
  archiveLoop(loopId) {
    const srcDir = join(this.loopsDir, loopId);
    const destDir = join(this.archiveDir, loopId);
    renameSync(srcDir, destDir);
    this.unregisterLoop(loopId);
  }
}
```

### 5. File Locking Strategy (Research-Backed)

**Lease-based locking with fencing tokens** (per [Kleppmann's distributed locking guide](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)):

Key principles:
1. **Lease expiry** - Locks auto-expire after timeout (prevents deadlocks from crashed processes)
2. **Fencing tokens** - Monotonically increasing token prevents stale operations
3. **Owner validation** - Only lock owner can release (prevents accidental releases)
4. **Stale detection** - Check PID alive before honoring existing lock

```javascript
const LOCK_LEASE_MS = 30000;      // 30 second lease
const LOCK_RETRY_MS = 100;        // Retry interval
const MAX_LOCK_ATTEMPTS = 300;    // 30 seconds total wait

/**
 * Lock data structure (stored in .lock file)
 */
const LockSchema = {
  pid: 'number',           // Process ID of lock holder
  loopId: 'string',        // Loop that holds the lock
  timestamp: 'number',     // When lock was acquired
  leaseExpiry: 'number',   // When lease expires
  fencingToken: 'number',  // Monotonically increasing token
};

/**
 * Acquire lease-based lock with stale detection
 */
async function acquireLock(lockPath, loopId) {
  let attempts = 0;

  while (attempts < MAX_LOCK_ATTEMPTS) {
    try {
      // Try atomic creation (O_EXCL)
      const fd = openSync(lockPath, 'wx');
      const fencingToken = await getNextFencingToken();
      const lockData = {
        pid: process.pid,
        loopId,
        timestamp: Date.now(),
        leaseExpiry: Date.now() + LOCK_LEASE_MS,
        fencingToken,
      };
      writeFileSync(fd, JSON.stringify(lockData, null, 2));
      closeSync(fd);
      return { acquired: true, fencingToken };

    } catch (e) {
      if (e.code === 'EEXIST') {
        // Lock exists - check if stale
        const lockData = JSON.parse(readFileSync(lockPath, 'utf8'));

        // Check 1: Lease expired?
        if (Date.now() > lockData.leaseExpiry) {
          unlinkSync(lockPath);
          continue; // Retry immediately
        }

        // Check 2: Process dead? (stale lock)
        if (!processExists(lockData.pid)) {
          unlinkSync(lockPath);
          continue; // Retry immediately
        }

        // Lock is valid - wait and retry
        await sleep(LOCK_RETRY_MS);
        attempts++;
        continue;
      }
      throw e;
    }
  }

  throw new Error(`Failed to acquire lock after ${MAX_LOCK_ATTEMPTS} attempts`);
}

/**
 * Release lock (only if we own it)
 */
function releaseLock(lockPath, loopId) {
  if (!existsSync(lockPath)) return;

  const lockData = JSON.parse(readFileSync(lockPath, 'utf8'));

  // Only release if we own the lock
  if (lockData.loopId === loopId && lockData.pid === process.pid) {
    unlinkSync(lockPath);
  }
}

/**
 * Renew lease (for long operations)
 */
function renewLease(lockPath, loopId) {
  if (!existsSync(lockPath)) return false;

  const lockData = JSON.parse(readFileSync(lockPath, 'utf8'));
  if (lockData.loopId !== loopId) return false;

  lockData.leaseExpiry = Date.now() + LOCK_LEASE_MS;
  writeFileSync(lockPath, JSON.stringify(lockData, null, 2));
  return true;
}

/**
 * Check if process exists (cross-platform)
 */
function processExists(pid) {
  try {
    process.kill(pid, 0); // Signal 0 = check existence
    return true;
  } catch {
    return false;
  }
}
```

### 6. CLI Command Updates

**New `--loop-id` parameter for all commands:**

```bash
# Start new loop (auto-generates ID, returns it)
aiwg ralph "Fix tests" --completion "npm test"
# Output: Loop started: ralph-fix-tests-a1b2c3d4

# Start with explicit ID
aiwg ralph "Fix tests" --completion "npm test" --loop-id "my-custom-id"

# Status of specific loop
aiwg ralph-status --loop-id ralph-fix-tests-a1b2c3d4

# Status of all loops
aiwg ralph-status --all

# Abort specific loop
aiwg ralph-abort --loop-id ralph-fix-tests-a1b2c3d4

# Resume specific loop
aiwg ralph-resume --loop-id ralph-fix-tests-a1b2c3d4
```

**Backward compatibility:**

```javascript
// If no --loop-id provided:
// 1. Check if only one active loop exists → use it
// 2. If multiple active loops → prompt user to specify
// 3. If no active loops → create new one (for /ralph)
```

### 7. External Ralph Updates

Same pattern applies to external Ralph:

```javascript
class ExternalMultiLoopStateManager extends MultiLoopStateManager {
  constructor(projectRoot) {
    super(projectRoot);
    this.baseDir = join(projectRoot, '.aiwg', 'ralph-external');
    // ... override paths
  }

  // External-specific: Track PID for crash detection
  updateLoopPid(loopId, pid) {
    this.updateLoopState(loopId, { currentPid: pid });
    this.updateRegistry(registry => {
      const loop = registry.active_loops.find(l => l.loop_id === loopId);
      if (loop) loop.pid = pid;
      return registry;
    });
  }
}
```

### 8. Cross-Loop Learning

**Shared patterns directory:**

```
.aiwg/ralph/shared/
├── patterns/
│   ├── error-patterns.json      # Common error → fix patterns
│   ├── success-patterns.json    # Successful approaches
│   └── anti-patterns.json       # Approaches that failed
└── memory/
    └── cross-task-learnings.json
```

**Learning flow:**
1. Each loop writes to its own `debug-memory/`
2. On loop completion, successful patterns extracted to `shared/patterns/`
3. New loops can read from `shared/patterns/` for initial context
4. Cross-task learner aggregates insights

### 9. Migration Strategy

**Phase 1: Add multi-loop infrastructure (non-breaking)**
- Create new directory structure alongside existing
- Add registry.json and loops/ directory
- Update StateManager to use new structure for NEW loops
- Existing loops continue using old structure

**Phase 2: Backward-compatible commands**
- Add `--loop-id` parameter (optional)
- Auto-detect single loop scenarios
- Show helpful prompts when multiple loops exist

**Phase 3: Migration helper**
- `aiwg ralph-migrate` command
- Moves existing `current-loop.json` to `loops/{generated-id}/state.json`
- Creates registry entry
- Symlinks `current-loop.json` for legacy tools

**Phase 4: Deprecation**
- Warn on direct `current-loop.json` access
- Document migration path
- Remove in next major version

### 10. Recovery Enhancements

**Per-loop crash detection:**

```javascript
// On agent startup
async function detectCrashedLoops() {
  const registry = loadRegistry();
  const crashed = [];

  for (const loop of registry.active_loops) {
    if (loop.status === 'running' && loop.pid) {
      const isAlive = await processExists(loop.pid);
      if (!isAlive) {
        crashed.push(loop);
      }
    }
  }

  return crashed;
}

// Recovery options
async function recoverCrashedLoops(crashed) {
  for (const loop of crashed) {
    console.log(`Found crashed loop: ${loop.loop_id}`);
    console.log(`  Task: ${loop.task_summary}`);
    console.log(`  Iteration: ${loop.iteration}/${loop.max_iterations}`);
    // Offer: resume, abort, or leave for later
  }
}
```

## Implementation Tasks

### Level 1 (Internal Ralph) - Primary Implementation

#### Issue: `ralph-l1-multiloop-core` - Core Multi-Loop Infrastructure
**Priority**: P0 (Blocking)
- [ ] Create `MultiLoopStateManager` class in `tools/ralph/multi-loop-state-manager.mjs`
- [ ] Implement `registry.json` schema and management
- [ ] Add loop directory creation (`loops/{loop-id}/`)
- [ ] Implement lease-based file locking with stale detection
- [ ] Add loop isolation (private working directories)
- [ ] Add archive functionality for completed loops

#### Issue: `ralph-l1-multiloop-cli` - CLI Command Updates
**Priority**: P0 (Blocking)
**Depends on**: `ralph-l1-multiloop-core`
- [ ] Update `ralph-cli.mjs` with `--loop-id` parameter
- [ ] Update `ralph-status.mjs` with `--all` and `--loop-id` options
- [ ] Update `ralph-abort.mjs` with loop selection
- [ ] Update `ralph-resume.mjs` with loop selection
- [ ] Add backward compatibility (auto-detect single loop)
- [ ] Add helpful prompts when multiple loops exist

#### Issue: `ralph-l1-multiloop-schema` - Schema Updates
**Priority**: P1
**Depends on**: `ralph-l1-multiloop-core`
- [ ] Create `loop-registry.yaml` schema in `agentic/code/addons/ralph/schemas/`
- [ ] Update `checkpoint.yaml` with loop ID field
- [ ] Update `iteration-analytics.yaml` for multi-loop paths
- [ ] Document loop state schema

#### Issue: `ralph-l1-multiloop-learning` - Cross-Loop Learning
**Priority**: P2
**Depends on**: `ralph-l1-multiloop-core`
- [ ] Create `shared/patterns/` directory structure
- [ ] Implement pattern extraction on loop completion
- [ ] Implement pattern injection on loop start
- [ ] Update existing `CrossTaskLearner` for multi-loop awareness

#### Issue: `ralph-l1-multiloop-test` - Testing & Documentation
**Priority**: P1
**Depends on**: `ralph-l1-multiloop-cli`
- [ ] Unit tests for `MultiLoopStateManager`
- [ ] Integration tests for concurrent loop execution
- [ ] Test file locking under contention
- [ ] Update CLI help text
- [ ] Update CLAUDE.md with new command options
- [ ] Create migration guide for existing projects

---

### Level 2 (External Ralph) - Tickets for Future Implementation

#### Issue: `ralph-l2-multiloop-core` - External Multi-Loop State Manager
**Priority**: P2
**Depends on**: `ralph-l1-multiloop-core` (pattern established)
- [ ] Extend `StateManager` to `ExternalMultiLoopStateManager`
- [ ] Apply same registry pattern to `.aiwg/ralph-external/`
- [ ] Add PID tracking per loop for crash detection
- [ ] Implement per-loop checkpoint directories

#### Issue: `ralph-l2-multiloop-cli` - External CLI Updates
**Priority**: P2
**Depends on**: `ralph-l2-multiloop-core`
- [ ] Update `index.mjs` CLI with `--loop-id` support
- [ ] Update `orchestrator.mjs` for multi-loop coordination
- [ ] Update `recovery-engine.mjs` for per-loop recovery
- [ ] Add `--all` option to status/abort commands

#### Issue: `ralph-l2-multiloop-supervisor` - Supervisor Enhancements
**Priority**: P3
**Depends on**: `ralph-l2-multiloop-cli`
- [ ] Multi-loop process monitoring
- [ ] Per-loop crash detection and recovery
- [ ] Coordinated Gitea issue updates for multiple loops

## Files to Modify

### Level 1 (Internal Ralph) - Primary

| File | Changes |
|------|---------|
| `tools/ralph/ralph-cli.mjs` | Add `--loop-id`, use MultiLoopStateManager |
| `tools/ralph/ralph-status.mjs` | Add `--all`, `--loop-id`, list multiple loops |
| `tools/ralph/ralph-abort.mjs` | Add `--loop-id`, loop selection prompt |
| `tools/ralph/ralph-resume.mjs` | Add `--loop-id`, loop selection prompt |
| `agentic/code/addons/ralph/schemas/checkpoint.yaml` | Add `loop_id` field |
| `agentic/code/addons/ralph/schemas/iteration-analytics.yaml` | Update paths for multi-loop |
| `agentic/code/addons/ralph/skills/ralph-loop.md` | Document multi-loop behavior |

### Level 2 (External Ralph) - Future

| File | Changes |
|------|---------|
| `tools/ralph-external/state-manager.mjs` | Extend to `ExternalMultiLoopStateManager` |
| `tools/ralph-external/index.mjs` | Add `--loop-id` parameter |
| `tools/ralph-external/orchestrator.mjs` | Use new state manager |
| `tools/ralph-external/recovery-engine.mjs` | Per-loop recovery |

## New Files to Create

### Level 1 (Internal Ralph) - Primary

| File | Purpose |
|------|---------|
| `tools/ralph/multi-loop-state-manager.mjs` | Core multi-loop state management class |
| `tools/ralph/file-lock.mjs` | Lease-based file locking utilities |
| `tools/ralph/loop-id.mjs` | Loop ID generation utilities |
| `agentic/code/addons/ralph/schemas/loop-registry.yaml` | Registry schema definition |

### Level 2 (External Ralph) - Future

| File | Purpose |
|------|---------|
| `tools/ralph-external/multi-loop-state-manager.mjs` | External variant extending base |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Race conditions | File locking with stale lock detection |
| Backward compat | Symlinks, auto-detection, migration helper |
| Data loss | Archive instead of delete, backup before changes |
| Complexity | Phased rollout, extensive testing |
| Performance | Lazy registry loading, efficient file ops |

## Success Criteria

1. ✓ Multiple agents can run parallel Ralph loops without conflicts
2. ✓ Each loop has isolated state, iterations, and checkpoints
3. ✓ Existing single-loop workflows continue to work
4. ✓ Recovery works per-loop without affecting others
5. ✓ Cross-loop learning preserved and enhanced
6. ✓ CLI commands support both single and multi-loop modes
7. ✓ Clear migration path for existing projects

## Timeline Estimate

### Level 1 (Internal Ralph) - Primary Focus

| Phase | Tasks | Estimate |
|-------|-------|----------|
| Core Infrastructure | MultiLoopStateManager, registry, locking | 2-3 days |
| CLI Updates | All 4 commands with backward compat | 1-2 days |
| Schema & Docs | Registry schema, migration guide, tests | 1-2 days |

**Level 1 Total**: ~4-7 days

### Level 2 (External Ralph) - Tickets Created, Future Work

| Phase | Tasks | Estimate |
|-------|-------|----------|
| Core Extension | ExternalMultiLoopStateManager | 1-2 days |
| CLI Updates | External CLI with loop ID | 1 day |
| Supervisor | Multi-loop process monitoring | 1-2 days |

**Level 2 Total**: ~3-5 days (future)

## References

### Research Papers
- [REF-004 MAGIS](https://arxiv.org/abs/2403.17927) - Multi-agent task decomposition
- [REF-013 MetaGPT](https://arxiv.org/abs/2308.00352) - Publish-subscribe state management
- [REF-022 AutoGen](https://arxiv.org/abs/2308.08155) - ConversableAgent termination patterns
- [REF-057 Agent Laboratory](https://arxiv.org/abs/2401.06072) - HITL cost reduction

### Practitioner Guides
- [Martin Kleppmann - Distributed Locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
- [Redis Locking Patterns](https://medium.com/@navidbarsalari/the-twelve-redis-locking-patterns-every-distributed-systems-engineer-should-know-06f16dfe7375)
- [Multi-Agent Orchestration Patterns](https://gerred.github.io/building-an-agentic-system/second-edition/part-iv-advanced-patterns/chapter-10-multi-agent-orchestration.html)
- [Event-Driven Multi-Agent Systems](https://www.confluent.io/blog/event-driven-multi-agent-systems/)

### Internal Research
- `.aiwg/research/findings/agentic-laziness-research.md` - Failure modes and recovery
- `.aiwg/research/paper-analysis/REF-004-aiwg-analysis.md` - MAGIS analysis
- `.aiwg/research/paper-analysis/REF-022-aiwg-analysis.md` - AutoGen analysis
