---
description: Show status of RLM task tree execution
category: rlm
---

# RLM Status Command

Display current status of RLM (Recursive Language Model) task tree execution, including decomposition hierarchy, sub-call progress, cost tracking, and completion estimates.

## Instructions

When invoked, analyze RLM task tree state and present comprehensive status:

1. **Load Task Tree State**
   - Load task tree from `.aiwg/rlm/trees/{tree_id}/state.json`
   - Load all sub-call states
   - Load cost tracking data
   - Load trajectory history

2. **Display Tree Structure**
   - Show task decomposition hierarchy
   - Mark active vs completed vs failed sub-calls
   - Display depth distribution
   - Show parallelization status

3. **Calculate Progress Metrics**
   - **Completion rate**: % of sub-calls completed
   - **Active sub-calls**: Currently executing tasks
   - **Failed sub-calls**: Tasks that encountered errors
   - **Total cost**: Cumulative token/USD cost
   - **Cost by depth**: Cost breakdown by tree level
   - **Time estimates**: Predicted completion time

4. **Present Status Dashboard**
   - Tree visualization (if `--tree` flag)
   - Cost summary (if `--cost` flag)
   - JSON export (if `--json` flag)
   - Default: condensed summary

## Arguments

- `--tree` - Show full task decomposition tree visualization
- `--cost` - Show detailed cost breakdown by sub-call
- `--depth [N]` - Limit tree display to depth N (default: all)
- `--json` - Output machine-readable JSON
- `--export [path]` - Export detailed report to file
- `[tree_id]` - Specific tree ID (default: most recent active tree)

## Default Output Format

```
╭─────────────────────────────────────────────────────────╮
│ RLM Task Tree Status                                    │
│ Tree ID: rlm-analyze-codebase-a1b2c3d4                  │
├─────────────────────────────────────────────────────────┤
│ Task: Analyze authentication module for security issues │
│ Status: RUNNING                                         │
│ Started: 2026-02-09 11:30:00                            │
│ Duration: 5m 23s                                        │
├─────────────────────────────────────────────────────────┤
│ Progress                                                │
│   Total Sub-Calls:     15                               │
│   ✓ Completed:         8  (53%)                         │
│   ⚙ Active:            4  (27%)                         │
│   ⏸ Pending:           2  (13%)                         │
│   ✗ Failed:            1  (7%)                          │
│                                                          │
│ Depth Distribution                                      │
│   Root (depth 0):      1                                │
│   Level 1:             5                                │
│   Level 2:             9                                │
│                                                          │
│ Cost                                                    │
│   Input Tokens:        125,430                          │
│   Output Tokens:       42,156                           │
│   Total Cost:          $0.84                            │
│                                                          │
│ Est. Completion: 2026-02-09 11:40:00 (9m 37s remaining) │
╰─────────────────────────────────────────────────────────╯

Active Sub-Calls:
  [1.2] Analyze token validation logic          (80% complete)
  [1.3] Review password hashing implementation   (45% complete)
  [2.1] Check JWT expiration handling           (30% complete)
  [2.4] Audit session management                (15% complete)

Recent Completion:
  ✓ [1.1] Parse authentication module structure
  ✓ [1.4] Identify security-relevant functions

Failed:
  ✗ [2.2] Analyze OAuth flow (error: file not found)

Use --tree for full decomposition hierarchy
Use --cost for detailed cost breakdown
```

## Tree Visualization Format (--tree)

```
╭─────────────────────────────────────────────────────────╮
│ RLM Task Tree: rlm-analyze-codebase-a1b2c3d4            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ [0] Root: Analyze authentication module                 │
│ │   Status: RUNNING | Cost: $0.12 | 2m 15s              │
│ │                                                          │
│ ├─ ✓ [1.1] Parse module structure                       │
│ │   │   Completed | Cost: $0.05 | 45s                   │
│ │   │                                                     │
│ │   ├─ ✓ [2.1] Extract function signatures             │
│ │   │       Completed | Cost: $0.02 | 18s               │
│ │   └─ ✓ [2.2] Map dependencies                         │
│ │           Completed | Cost: $0.03 | 27s               │
│ │                                                          │
│ ├─ ⚙ [1.2] Analyze token validation                     │
│ │   │   ACTIVE (80%) | Cost: $0.08 | 1m 12s (running)   │
│ │   │                                                     │
│ │   ├─ ✓ [2.3] Check signature verification             │
│ │   │       Completed | Cost: $0.03 | 22s               │
│ │   ├─ ⚙ [2.4] Review expiration logic                  │
│ │   │       ACTIVE (60%) | Cost: $0.04 | 35s (running)  │
│ │   └─ ⏸ [2.5] Audit token refresh                      │
│ │           PENDING                                      │
│ │                                                          │
│ ├─ ⚙ [1.3] Review password hashing                      │
│ │   │   ACTIVE (45%) | Cost: $0.06 | 58s (running)      │
│ │   │                                                     │
│ │   ├─ ✓ [2.6] Identify hash algorithm                  │
│ │   │       Completed | Cost: $0.02 | 15s               │
│ │   └─ ⚙ [2.7] Check salt usage                         │
│ │           ACTIVE (30%) | Cost: $0.04 | 43s (running)  │
│ │                                                          │
│ ├─ ⏸ [1.4] Audit session management                     │
│ │       PENDING                                          │
│ │                                                          │
│ └─ ✗ [1.5] Analyze OAuth flow                           │
│         FAILED | Cost: $0.01 | 8s                        │
│         Error: Required file oauth.ts not found          │
│                                                          │
╰─────────────────────────────────────────────────────────╯

Legend:
  ✓ Completed   ⚙ Active   ⏸ Pending   ✗ Failed
```

## Cost Breakdown Format (--cost)

```
╭─────────────────────────────────────────────────────────╮
│ RLM Cost Analysis                                       │
│ Tree ID: rlm-analyze-codebase-a1b2c3d4                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Cost by Depth                                           │
│ ┌──────┬────────────┬─────────────┬──────────┐          │
│ │ Lvl  │ Sub-Calls  │ Tokens      │ Cost     │          │
│ ├──────┼────────────┼─────────────┼──────────┤          │
│ │ 0    │ 1          │ 12,450      │ $0.12    │          │
│ │ 1    │ 5          │ 78,320      │ $0.39    │          │
│ │ 2    │ 9          │ 76,816      │ $0.33    │          │
│ │ TOTAL│ 15         │ 167,586     │ $0.84    │          │
│ └──────┴────────────┴─────────────┴──────────┘          │
│                                                          │
│ Cost by Model                                           │
│ ┌──────────────┬────────────┬──────────┐                │
│ │ Model        │ Tokens     │ Cost     │                │
│ ├──────────────┼────────────┼──────────┤                │
│ │ opus         │ 12,450     │ $0.12    │ (root)         │
│ │ sonnet       │ 122,890    │ $0.61    │ (sub-calls)    │
│ │ haiku        │ 32,246     │ $0.11    │ (leaf tasks)   │
│ │ TOTAL        │ 167,586    │ $0.84    │                │
│ └──────────────┴────────────┴──────────┘                │
│                                                          │
│ Top 5 Most Expensive Sub-Calls                          │
│ 1. [1.2] Analyze token validation       $0.08  (9.5%)   │
│ 2. [0]   Root task                       $0.12  (14.3%)  │
│ 3. [1.3] Review password hashing         $0.06  (7.1%)   │
│ 4. [1.1] Parse module structure          $0.05  (6.0%)   │
│ 5. [2.7] Check salt usage                $0.04  (4.8%)   │
│                                                          │
│ Budget Status                                           │
│   Budget:      500,000 tokens ($2.50 target)            │
│   Used:        167,586 tokens ($0.84)                   │
│   Remaining:   332,414 tokens ($1.66)                   │
│   Utilization: 33.5%                                    │
│                                                          │
│ Projected Final Cost: $1.12 (based on current rate)     │
╰─────────────────────────────────────────────────────────╯
```

## JSON Output Format (--json)

```json
{
  "tree_id": "rlm-analyze-codebase-a1b2c3d4",
  "task": "Analyze authentication module for security issues",
  "status": "RUNNING",
  "started_at": "2026-02-09T11:30:00Z",
  "duration_seconds": 323,

  "progress": {
    "total_sub_calls": 15,
    "completed": 8,
    "active": 4,
    "pending": 2,
    "failed": 1,
    "completion_rate": 0.53
  },

  "depth_distribution": {
    "0": 1,
    "1": 5,
    "2": 9,
    "max_depth": 2
  },

  "cost": {
    "input_tokens": 125430,
    "output_tokens": 42156,
    "total_tokens": 167586,
    "total_cost_usd": 0.84,
    "by_depth": [
      {"depth": 0, "tokens": 12450, "cost": 0.12},
      {"depth": 1, "tokens": 78320, "cost": 0.39},
      {"depth": 2, "tokens": 76816, "cost": 0.33}
    ],
    "by_model": [
      {"model": "opus", "tokens": 12450, "cost": 0.12},
      {"model": "sonnet", "tokens": 122890, "cost": 0.61},
      {"model": "haiku", "tokens": 32246, "cost": 0.11}
    ],
    "budget": {
      "tokens": 500000,
      "target_cost_usd": 2.50,
      "used_tokens": 167586,
      "used_cost_usd": 0.84,
      "remaining_tokens": 332414,
      "remaining_cost_usd": 1.66,
      "utilization": 0.335
    },
    "projected_final_cost_usd": 1.12
  },

  "active_sub_calls": [
    {
      "id": "1.2",
      "task": "Analyze token validation logic",
      "progress": 0.80,
      "duration_seconds": 72,
      "cost_usd": 0.08
    },
    {
      "id": "1.3",
      "task": "Review password hashing implementation",
      "progress": 0.45,
      "duration_seconds": 58,
      "cost_usd": 0.06
    },
    {
      "id": "2.1",
      "task": "Check JWT expiration handling",
      "progress": 0.30,
      "duration_seconds": 35,
      "cost_usd": 0.04
    },
    {
      "id": "2.4",
      "task": "Audit session management",
      "progress": 0.15,
      "duration_seconds": 43,
      "cost_usd": 0.04
    }
  ],

  "completed_sub_calls": [
    {
      "id": "1.1",
      "task": "Parse authentication module structure",
      "duration_seconds": 45,
      "cost_usd": 0.05
    },
    {
      "id": "1.4",
      "task": "Identify security-relevant functions",
      "duration_seconds": 38,
      "cost_usd": 0.04
    }
  ],

  "failed_sub_calls": [
    {
      "id": "2.2",
      "task": "Analyze OAuth flow",
      "error": "file not found: oauth.ts",
      "duration_seconds": 8,
      "cost_usd": 0.01
    }
  ],

  "estimates": {
    "completion_time": "2026-02-09T11:40:00Z",
    "remaining_seconds": 577,
    "confidence": 0.75
  }
}
```

## State File Integration

The command reads from these RLM state files:

### Primary State

```
.aiwg/rlm/
├── registry.json                              # Active trees registry
└── trees/
    ├── rlm-analyze-codebase-a1b2c3d4/
    │   ├── state.json                         # Main state (RLM task tree schema)
    │   ├── trajectory.json                    # Execution trajectory
    │   ├── cost.json                          # Detailed cost tracking
    │   └── sub-calls/
    │       ├── 1.1-state.json                 # Sub-call 1.1 state
    │       ├── 1.2-state.json                 # Sub-call 1.2 state
    │       └── ...
    └── rlm-refactor-module-b2c3d4e5/
        └── ...
```

### State Schema Fields Used

From `rlm-state.yaml`:

```yaml
tree_id: string                    # Tree identifier
status: enum                       # INITIALIZING | RUNNING | COMPLETING | COMPLETED | FAILED | ABORTED
root_task: string                  # Root task description
started_at: datetime               # Start timestamp
last_updated: datetime             # Last state update
completed_at: datetime | null      # Completion timestamp

configuration:
  max_depth: integer               # Maximum tree depth
  max_sub_calls: integer           # Max total sub-calls
  budget_tokens: integer           # Token budget
  parallel_sub_calls: boolean      # Allow parallel execution

sub_calls:
  - id: string                     # Sub-call ID (e.g., "1.2")
    depth: integer                 # Tree depth (0 = root)
    task: string                   # Task description
    status: enum                   # PENDING | ACTIVE | COMPLETED | FAILED
    parent_id: string | null       # Parent sub-call ID
    started_at: datetime | null    # Start timestamp
    completed_at: datetime | null  # Completion timestamp
    cost:
      input_tokens: integer
      output_tokens: integer
      total_cost_usd: number
    progress: number               # 0.0 to 1.0 (for ACTIVE sub-calls)
    error: string | null           # Error message (if FAILED)

metrics:
  total_sub_calls: integer
  completed_sub_calls: integer
  active_sub_calls: integer
  pending_sub_calls: integer
  failed_sub_calls: integer
  total_tokens: integer
  total_cost_usd: number
  depth_distribution: object       # {depth: count}
```

## Usage Examples

### Basic Status Check

```bash
# Show status of most recent active tree
/rlm-status

# Show status of specific tree
/rlm-status rlm-analyze-codebase-a1b2c3d4
```

### Full Tree Visualization

```bash
# Show complete decomposition tree
/rlm-status --tree

# Limit tree depth to 2 levels
/rlm-status --tree --depth 2
```

### Cost Analysis

```bash
# Show detailed cost breakdown
/rlm-status --cost

# Cost breakdown for specific tree
/rlm-status rlm-analyze-codebase-a1b2c3d4 --cost
```

### Export Reports

```bash
# Export JSON report
/rlm-status --json > rlm-report.json

# Export detailed report to file
/rlm-status --export .aiwg/rlm/reports/status-$(date +%Y%m%d).md
```

### Monitoring Active Execution

```bash
# Watch mode (update every 5 seconds)
watch -n 5 'aiwg rlm-status --tree'

# Or use while loop for continuous monitoring
while true; do
  clear
  aiwg rlm-status
  sleep 5
done
```

## Progress Calculation

Progress for ACTIVE sub-calls is estimated based on:

1. **Token consumption**: `used_tokens / estimated_total_tokens`
2. **Depth completion**: `completed_children / total_children` (if sub-call has children)
3. **Time elapsed**: `elapsed_time / estimated_duration` (based on similar tasks)

The displayed progress percentage is a weighted average:
- 50% token consumption
- 30% child completion (if applicable)
- 20% time-based estimate

## Completion Time Estimates

Estimated completion time is calculated using:

1. **Average sub-call duration**: Mean duration of completed sub-calls at each depth
2. **Remaining sub-calls**: Count of PENDING and ACTIVE sub-calls
3. **Parallelization factor**: Adjust for parallel execution (if enabled)
4. **Current rate**: Tokens/second consumption rate

Formula:
```
estimated_remaining = (
  (pending_sub_calls * avg_duration_by_depth) / parallelization_factor
  + sum(active_sub_call.estimated_remaining)
)

completion_time = current_time + estimated_remaining
```

Confidence level indicates reliability:
- **High (>0.8)**: >50% sub-calls completed, stable rate
- **Medium (0.5-0.8)**: 20-50% completed
- **Low (<0.5)**: <20% completed, rate unstable

## Error Handling

### No Active Trees

```
No active RLM trees found.

Use /rlm-query to start a new task tree.
```

### Tree Not Found

```
Error: Tree 'rlm-nonexistent-a1b2c3d4' not found.

Active trees:
  - rlm-analyze-codebase-a1b2c3d4 (running)
  - rlm-refactor-module-b2c3d4e5 (completed)

Use /rlm-status [tree_id] to view specific tree.
```

### Corrupted State

```
Warning: State file for tree 'rlm-analyze-codebase-a1b2c3d4' is corrupted.

Attempting recovery from last checkpoint...
  - Checkpoint found: iteration 12
  - Recovered state up to sub-call 1.3
  - 2 recent sub-calls may need re-execution

Recovered state displayed below. Use /rlm-repair to fix state file.
```

## Integration Points

### With RLM Query Command

```bash
# Start RLM query and get tree ID
tree_id=$(aiwg rlm-query "Analyze auth module" --return-id)

# Monitor progress
watch -n 5 "aiwg rlm-status $tree_id"
```

### With RLM Batch Command

```bash
# Run batch processing
aiwg rlm-batch --tasks batch-config.yaml

# View batch progress
aiwg rlm-status --tree
```

### With Ralph Loops

```bash
# Ralph can use RLM for sub-tasks
# View combined status
aiwg ralph-status && aiwg rlm-status
```

## Performance Considerations

For large trees (>100 sub-calls):

1. **Default view**: Shows summary only (fast)
2. **Tree view**: Lazy-loads sub-call details
3. **Cost view**: Aggregates at depth level first
4. **JSON export**: Full detail (may take several seconds)

Use `--depth N` to limit tree display for very deep hierarchies.

## Configuration

Override display settings in `.aiwg/config.yml`:

```yaml
rlm:
  status:
    default_view: summary         # summary | tree | cost
    max_tree_depth: 5             # Auto-limit tree display
    refresh_interval: 5           # Seconds (for watch mode)
    show_estimates: true          # Display completion estimates
    show_budget: true             # Display budget utilization
    cost_precision: 2             # Decimal places for cost display
```

## References

- @agentic/code/addons/rlm/schemas/rlm-state.yaml - RLM state schema
- @agentic/code/addons/rlm/schemas/rlm-task-tree.yaml - Task tree structure
- @agentic/code/addons/rlm/schemas/rlm-cost.yaml - Cost tracking schema
- @agentic/code/addons/rlm/schemas/rlm-trajectory.yaml - Execution trajectory
- @agentic/code/addons/ralph/schemas/loop-state.yaml - Ralph state reference
- @agentic/code/addons/ralph/commands/ralph-status.md - Ralph status command
- @.aiwg/research/findings/REF-089-recursive-language-models.md - RLM research foundation
- @.claude/rules/tao-loop.md - TAO loop structure underlying RLM
