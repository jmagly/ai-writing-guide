# RLM Messaging Events

Documentation for how the RLM (Recursive Language Models) addon reports progress via AIWG's messaging hub to Slack, Discord, and Telegram.

**Issue**: #327
**Version**: 1.0.0

## Overview

RLM operations decompose tasks into recursive sub-agent trees that can run for minutes to hours, processing large codebases or document corpora. Remote monitoring via chat platforms enables users to track progress, manage budgets, and respond to alerts without constant terminal access.

The AIWG messaging hub (`tools/messaging/index.mjs`) provides event-driven notifications. RLM publishes structured events to the hub's EventBus, which are formatted and broadcast to all connected chat adapters (Slack, Discord, Telegram).

## RLM Event Types

### Tree Lifecycle Events

#### `rlm:tree:started`

Published when a new task tree is initiated.

**Event Payload**:
```typescript
{
  topic: 'rlm:tree:started',
  source: 'rlm-agent',
  severity: 'info',
  summary: 'RLM task tree started: {tree_id}',
  details: {
    tree_id: 'tree-a1b2c3d4',
    root_prompt: 'Analyze security risks in authentication module',
    estimated_nodes: 5,
    max_depth: 3,
    root_model: 'claude-sonnet-4.5',
    sub_model: 'codex-mini-latest',
    budget_tokens: 100000,
    budget_usd: 2.5
  },
  project: 'my-project',
  timestamp: '2026-02-09T10:00:00Z'
}
```

**Rendered Message** (Slack/Discord/Telegram):
```
🌳 RLM Task Tree Started

Tree ID: tree-a1b2c3d4
Prompt: Analyze security risks in authentication module

Estimated nodes: 5 (max depth: 3)
Models: claude-sonnet-4.5 (root) → codex-mini-latest (sub)
Budget: 100,000 tokens ($2.50)

Project: my-project
Started: 2026-02-09 10:00:00 UTC
```

#### `rlm:tree:progress`

Published periodically during execution (default: every 30 seconds or after each node completion).

**Event Payload**:
```typescript
{
  topic: 'rlm:tree:progress',
  source: 'rlm-agent',
  severity: 'info',
  summary: 'RLM progress: {completed}/{total} nodes ({pct}%)',
  details: {
    tree_id: 'tree-a1b2c3d4',
    completed_nodes: 3,
    total_nodes: 5,
    progress_pct: 60,
    current_depth: 2,
    tokens_used: 45000,
    cost_usd: 0.82,
    budget_remaining_tokens: 55000,
    budget_remaining_usd: 1.68,
    budget_pct: 45.0,
    eta_seconds: 90
  },
  project: 'my-project',
  timestamp: '2026-02-09T10:02:30Z'
}
```

**Rendered Message**:
```
📊 RLM Progress Update

Tree: tree-a1b2c3d4
Progress: [████████░░] 3/5 nodes (60%)
Depth: 2

Cost: $0.82 / $2.50 budget (32.8%)
Tokens: 45,000 / 100,000 (45.0%)
Remaining: $1.68 / 55,000 tokens

ETA: 1m 30s

Project: my-project
```

#### `rlm:tree:completed`

Published when the entire task tree finishes successfully.

**Event Payload**:
```typescript
{
  topic: 'rlm:tree:completed',
  source: 'rlm-agent',
  severity: 'info',
  summary: 'RLM task tree completed: {tree_id}',
  details: {
    tree_id: 'tree-a1b2c3d4',
    total_nodes: 5,
    completed_nodes: 5,
    failed_nodes: 0,
    max_depth: 2,
    total_tokens: 62000,
    total_cost_usd: 1.15,
    budget_used_pct: 46.0,
    duration_ms: 180000,
    result_summary: 'Identified 3 security risks with mitigation strategies',
    output_path: '.aiwg/rlm/trees/tree-a1b2c3d4/report.md'
  },
  project: 'my-project',
  timestamp: '2026-02-09T10:03:00Z'
}
```

**Rendered Message**:
```
✅ RLM Task Tree Completed

Tree ID: tree-a1b2c3d4
Duration: 3m 0s

Results: 5/5 nodes completed (0 failed)
Max depth: 2
Summary: Identified 3 security risks with mitigation strategies

Cost: $1.15 (46.0% of budget)
Tokens: 62,000

Output: .aiwg/rlm/trees/tree-a1b2c3d4/report.md

Project: my-project
Completed: 2026-02-09 10:03:00 UTC
```

### Node Execution Events

#### `rlm:node:started`

Published when a sub-agent node begins execution.

**Event Payload**:
```typescript
{
  topic: 'rlm:node:started',
  source: 'rlm-agent',
  severity: 'info',
  summary: 'RLM node started: {node_id}',
  details: {
    tree_id: 'tree-a1b2c3d4',
    node_id: 'task-b2c3d4e5',
    parent_id: 'task-a1b2c3d4',
    depth: 1,
    model: 'codex-mini-latest',
    prompt_preview: 'What are the specific OWASP vulnerabilities in the...',
    context_tokens: 2000
  },
  project: 'my-project',
  timestamp: '2026-02-09T10:00:45Z'
}
```

**Rendered Message** (verbose mode only):
```
▶️ RLM Node Started

Node: task-b2c3d4e5 (depth: 1)
Parent: task-a1b2c3d4
Model: codex-mini-latest

Prompt: What are the specific OWASP vulnerabilities in the...
Context: 2,000 tokens

Tree: tree-a1b2c3d4
```

#### `rlm:node:completed`

Published when a sub-agent node finishes successfully.

**Event Payload**:
```typescript
{
  topic: 'rlm:node:completed',
  source: 'rlm-agent',
  severity: 'info',
  summary: 'RLM node completed: {node_id}',
  details: {
    tree_id: 'tree-a1b2c3d4',
    node_id: 'task-b2c3d4e5',
    depth: 1,
    model: 'codex-mini-latest',
    input_tokens: 2000,
    output_tokens: 800,
    total_tokens: 2800,
    cost_usd: 0.014,
    duration_ms: 30000,
    result_preview: 'OWASP A01:2021 - Broken Access Control: Missing...',
    confidence: 0.92
  },
  project: 'my-project',
  timestamp: '2026-02-09T10:01:15Z'
}
```

**Rendered Message** (verbose mode only):
```
✓ RLM Node Completed

Node: task-b2c3d4e5 (depth: 1)
Model: codex-mini-latest
Duration: 30s

Result: OWASP A01:2021 - Broken Access Control: Missing...
Confidence: 92%

Cost: $0.014 (2,800 tokens)

Tree: tree-a1b2c3d4
```

#### `rlm:node:failed`

Published when a sub-agent node encounters an error.

**Event Payload**:
```typescript
{
  topic: 'rlm:node:failed',
  source: 'rlm-agent',
  severity: 'warning',
  summary: 'RLM node failed: {node_id}',
  details: {
    tree_id: 'tree-a1b2c3d4',
    node_id: 'task-c3d4e5f6',
    depth: 1,
    model: 'codex-mini-latest',
    error_type: 'timeout',
    error_message: 'Request timed out after 300s',
    retry_status: 'retrying (attempt 2/3)',
    duration_ms: 300000
  },
  project: 'my-project',
  timestamp: '2026-02-09T10:05:00Z'
}
```

**Rendered Message**:
```
⚠️ RLM Node Failed

Node: task-c3d4e5f6 (depth: 1)
Model: codex-mini-latest

Error: timeout
Message: Request timed out after 300s
Status: retrying (attempt 2/3)

Tree: tree-a1b2c3d4
```

### Budget Management Events

#### `rlm:budget:warning`

Published when budget usage exceeds warning threshold (default: 80%).

**Event Payload**:
```typescript
{
  topic: 'rlm:budget:warning',
  source: 'rlm-agent',
  severity: 'warning',
  summary: 'RLM budget warning: {usage_pct}% used',
  details: {
    tree_id: 'tree-a1b2c3d4',
    alert_id: 'alert-00000001',
    alert_type: 'warn',
    threshold_pct: 80,
    current_usage: {
      tokens: 82000,
      cost_usd: 1.85,
      usage_pct: 82.0
    },
    budget_remaining: {
      tokens: 18000,
      cost_usd: 0.65
    },
    node_id: 'task-d4e5f6g7',
    recommendation: 'Consider stopping execution to stay within budget'
  },
  project: 'my-project',
  timestamp: '2026-02-09T10:02:45Z'
}
```

**Rendered Message**:
```
⚠️ RLM Budget Warning

Tree: tree-a1b2c3d4
Alert: 82.0% of budget used

Current usage:
  • 82,000 tokens / 100,000 (82.0%)
  • $1.85 / $2.50 (74.0%)

Remaining:
  • 18,000 tokens
  • $0.65

Recommendation: Consider stopping execution to stay within budget

Triggered by: task-d4e5f6g7
Time: 2026-02-09 10:02:45 UTC
```

#### `rlm:budget:exceeded`

Published when budget usage reaches abort threshold (default: 100%).

**Event Payload**:
```typescript
{
  topic: 'rlm:budget:exceeded',
  source: 'rlm-agent',
  severity: 'critical',
  summary: 'RLM budget exceeded: {usage_pct}%',
  details: {
    tree_id: 'tree-a1b2c3d4',
    alert_id: 'alert-00000002',
    alert_type: 'abort',
    threshold_pct: 100,
    current_usage: {
      tokens: 101500,
      cost_usd: 2.55,
      usage_pct: 101.5
    },
    budget_exhausted: true,
    enforcement_action: 'execution_stopped',
    node_id: 'task-e5f6g7h8',
    partial_results_available: true,
    output_path: '.aiwg/rlm/trees/tree-a1b2c3d4/partial-report.md'
  },
  project: 'my-project',
  timestamp: '2026-02-09T10:04:00Z'
}
```

**Rendered Message**:
```
🚨 RLM Budget Exceeded

Tree: tree-a1b2c3d4
Budget exhausted: 101.5% used

Current usage:
  • 101,500 tokens / 100,000 (101.5%)
  • $2.55 / $2.50 (102.0%)

Action: Execution stopped
Triggered by: task-e5f6g7h8

Partial results available:
  .aiwg/rlm/trees/tree-a1b2c3d4/partial-report.md

Project: my-project
Time: 2026-02-09 10:04:00 UTC
```

## Event Payload Schemas

### Common Fields

All RLM events include these standard fields:

```typescript
interface RlmEvent {
  topic: EventTopic;        // From EventTopic enum
  source: 'rlm-agent';      // Always 'rlm-agent' for RLM events
  severity: 'info' | 'warning' | 'critical';
  summary: string;          // One-line human-readable summary
  details: object;          // Event-specific payload
  project: string;          // Project name
  timestamp: string;        // ISO 8601 format
}
```

### Tree Events Details Schema

```typescript
interface TreeStartedDetails {
  tree_id: string;
  root_prompt: string;
  estimated_nodes: number;
  max_depth: number;
  root_model: string;
  sub_model: string;
  budget_tokens?: number;
  budget_usd?: number;
}

interface TreeProgressDetails {
  tree_id: string;
  completed_nodes: number;
  total_nodes: number;
  progress_pct: number;
  current_depth: number;
  tokens_used: number;
  cost_usd: number;
  budget_remaining_tokens?: number;
  budget_remaining_usd?: number;
  budget_pct?: number;
  eta_seconds?: number;
}

interface TreeCompletedDetails {
  tree_id: string;
  total_nodes: number;
  completed_nodes: number;
  failed_nodes: number;
  max_depth: number;
  total_tokens: number;
  total_cost_usd: number;
  budget_used_pct?: number;
  duration_ms: number;
  result_summary: string;
  output_path: string;
}
```

### Node Events Details Schema

```typescript
interface NodeStartedDetails {
  tree_id: string;
  node_id: string;
  parent_id: string | null;
  depth: number;
  model: string;
  prompt_preview: string;    // First ~100 chars
  context_tokens: number;
}

interface NodeCompletedDetails {
  tree_id: string;
  node_id: string;
  depth: number;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  duration_ms: number;
  result_preview: string;    // First ~200 chars
  confidence?: number;       // 0.0-1.0
}

interface NodeFailedDetails {
  tree_id: string;
  node_id: string;
  depth: number;
  model: string;
  error_type: string;
  error_message: string;
  retry_status: string;
  duration_ms: number;
}
```

### Budget Events Details Schema

```typescript
interface BudgetWarningDetails {
  tree_id: string;
  alert_id: string;
  alert_type: 'warn' | 'abort' | 'info';
  threshold_pct: number;
  current_usage: {
    tokens: number;
    cost_usd: number;
    usage_pct: number;
  };
  budget_remaining: {
    tokens: number;
    cost_usd: number;
  };
  node_id: string;
  recommendation: string;
}

interface BudgetExceededDetails {
  tree_id: string;
  alert_id: string;
  alert_type: 'abort';
  threshold_pct: number;
  current_usage: {
    tokens: number;
    cost_usd: number;
    usage_pct: number;
  };
  budget_exhausted: true;
  enforcement_action: string;
  node_id: string;
  partial_results_available: boolean;
  output_path?: string;
}
```

## Message Formatting

### Progress Bar Rendering

For chat platforms with limited formatting, progress is rendered as ASCII:

```
[████████░░] 4/10 nodes (40%)
```

**Generation algorithm**:
```typescript
function renderProgressBar(completed: number, total: number, width = 10): string {
  const pct = Math.round((completed / total) * 100);
  const filled = Math.round((completed / total) * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${completed}/${total} nodes (${pct}%)`;
}
```

### Cost Formatting

```typescript
function formatCost(cost_usd: number, budget_usd?: number): string {
  if (budget_usd) {
    const pct = ((cost_usd / budget_usd) * 100).toFixed(1);
    return `$${cost_usd.toFixed(2)} / $${budget_usd.toFixed(2)} budget (${pct}%)`;
  }
  return `$${cost_usd.toFixed(2)}`;
}

// Examples:
// formatCost(0.42, 5.0)  → "$0.42 / $5.00 budget (8.4%)"
// formatCost(1.25)       → "$1.25"
```

### Platform-Specific Formatting

#### Slack

Uses Slack Block Kit for rich formatting:

```json
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🌳 RLM Task Tree Started"
      }
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Tree ID:*\ntree-a1b2c3d4"},
        {"type": "mrkdwn", "text": "*Budget:*\n100,000 tokens ($2.50)"}
      ]
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": "Project: my-project | Started: 2026-02-09 10:00:00 UTC"}
      ]
    }
  ]
}
```

#### Discord

Uses Discord embeds:

```json
{
  "embeds": [
    {
      "title": "🌳 RLM Task Tree Started",
      "color": 3447003,
      "fields": [
        {"name": "Tree ID", "value": "tree-a1b2c3d4", "inline": true},
        {"name": "Budget", "value": "100,000 tokens ($2.50)", "inline": true},
        {"name": "Prompt", "value": "Analyze security risks in authentication module"}
      ],
      "footer": {
        "text": "Project: my-project"
      },
      "timestamp": "2026-02-09T10:00:00Z"
    }
  ]
}
```

#### Telegram

Uses Telegram markdown:

```
🌳 *RLM Task Tree Started*

*Tree ID:* tree-a1b2c3d4
*Prompt:* Analyze security risks in authentication module

Estimated nodes: 5 (max depth: 3)
Models: claude-sonnet-4.5 (root) → codex-mini-latest (sub)
Budget: 100,000 tokens ($2.50)

_Project: my-project_
_Started: 2026-02-09 10:00:00 UTC_
```

## Subscription Configuration

### Verbosity Levels

**Default subscription** (normal verbosity):
```yaml
subscriptions:
  - rlm:tree:started
  - rlm:tree:progress
  - rlm:tree:completed
  - rlm:budget:warning
  - rlm:budget:exceeded
```

**Quiet mode** (tree lifecycle only):
```yaml
subscriptions:
  - rlm:tree:started
  - rlm:tree:completed
  - rlm:budget:exceeded
```

**Verbose mode** (every node):
```yaml
subscriptions:
  - rlm:tree:started
  - rlm:tree:progress
  - rlm:tree:completed
  - rlm:node:started
  - rlm:node:completed
  - rlm:node:failed
  - rlm:budget:warning
  - rlm:budget:exceeded
```

### Progress Update Frequency

**Time-based** (default: every 30 seconds):
```yaml
progress_updates:
  mode: time
  interval_seconds: 30
```

**Node-based** (after each node completion):
```yaml
progress_updates:
  mode: node
  interval_nodes: 1
```

**Hybrid** (whichever comes first):
```yaml
progress_updates:
  mode: hybrid
  interval_seconds: 30
  interval_nodes: 1
```

### Configuration via Environment

```bash
# Verbosity
export AIWG_RLM_MESSAGING_VERBOSITY=normal  # quiet | normal | verbose

# Progress update frequency
export AIWG_RLM_MESSAGING_PROGRESS_INTERVAL=30  # seconds

# Budget alert thresholds
export AIWG_RLM_BUDGET_WARN_THRESHOLD=80   # percent
export AIWG_RLM_BUDGET_ABORT_THRESHOLD=100 # percent
```

## Integration Pattern

### RLM Operations Publishing Events

```typescript
// In RLM agent or tree executor
import { EventBus } from '@aiwg/messaging';
import { EventTopic } from '@aiwg/messaging/types';

class RlmTreeExecutor {
  constructor(private bus: EventBus) {}

  async startTree(tree_id: string, root_prompt: string, config: RlmConfig) {
    // Publish tree started event
    this.bus.publish({
      topic: EventTopic.RLM_TREE_STARTED,
      source: 'rlm-agent',
      severity: 'info',
      summary: `RLM task tree started: ${tree_id}`,
      details: {
        tree_id,
        root_prompt,
        estimated_nodes: config.estimatedNodes,
        max_depth: config.maxDepth,
        root_model: config.rootModel,
        sub_model: config.subModel,
        budget_tokens: config.budgetTokens,
        budget_usd: config.budgetUsd
      },
      project: process.cwd().split('/').pop(),
      timestamp: new Date().toISOString()
    });

    // Execute tree...
  }

  async executeNode(node: TaskNode) {
    // Publish node started
    this.bus.publish({
      topic: EventTopic.RLM_NODE_STARTED,
      source: 'rlm-agent',
      severity: 'info',
      summary: `RLM node started: ${node.node_id}`,
      details: {
        tree_id: node.tree_id,
        node_id: node.node_id,
        parent_id: node.parent_id,
        depth: node.depth,
        model: node.execution_config.model,
        prompt_preview: node.prompt.slice(0, 100),
        context_tokens: node.context.size_tokens
      },
      project: process.cwd().split('/').pop(),
      timestamp: new Date().toISOString()
    });

    // Execute node...

    // Publish node completed
    this.bus.publish({
      topic: EventTopic.RLM_NODE_COMPLETED,
      source: 'rlm-agent',
      severity: 'info',
      summary: `RLM node completed: ${node.node_id}`,
      details: {
        tree_id: node.tree_id,
        node_id: node.node_id,
        depth: node.depth,
        model: node.execution_config.model,
        input_tokens: node.cost.input_tokens,
        output_tokens: node.cost.output_tokens,
        total_tokens: node.cost.total_tokens,
        cost_usd: node.cost.total_cost_usd,
        duration_ms: node.timestamps.duration_ms,
        result_preview: node.result.output.slice(0, 200),
        confidence: node.result.confidence
      },
      project: process.cwd().split('/').pop(),
      timestamp: new Date().toISOString()
    });
  }

  async checkBudget(tree_id: string, current_usage: CostAggregates, budget: CostBudget) {
    if (current_usage.total_tokens >= budget.budget_tokens * budget.warn_threshold_pct / 100) {
      this.bus.publish({
        topic: EventTopic.RLM_BUDGET_WARNING,
        source: 'rlm-agent',
        severity: 'warning',
        summary: `RLM budget warning: ${budget.usage_pct}% used`,
        details: {
          tree_id,
          alert_id: generateAlertId(),
          alert_type: 'warn',
          threshold_pct: budget.warn_threshold_pct,
          current_usage: {
            tokens: current_usage.total_tokens,
            cost_usd: current_usage.total_cost_usd,
            usage_pct: budget.usage_pct
          },
          budget_remaining: {
            tokens: budget.remaining_tokens,
            cost_usd: budget.remaining_usd
          },
          node_id: current_node.node_id,
          recommendation: 'Consider stopping execution to stay within budget'
        },
        project: process.cwd().split('/').pop(),
        timestamp: new Date().toISOString()
      });
    }
  }
}
```

### EventBus Topic Naming

RLM events use the topic prefix `rlm:`:

```typescript
// Extended EventTopic enum (in types.mjs)
export const EventTopic = Object.freeze({
  // Existing topics...

  // RLM lifecycle
  RLM_TREE_STARTED: 'rlm:tree:started',
  RLM_TREE_PROGRESS: 'rlm:tree:progress',
  RLM_TREE_COMPLETED: 'rlm:tree:completed',

  // RLM node execution
  RLM_NODE_STARTED: 'rlm:node:started',
  RLM_NODE_COMPLETED: 'rlm:node:completed',
  RLM_NODE_FAILED: 'rlm:node:failed',

  // RLM budget
  RLM_BUDGET_WARNING: 'rlm:budget:warning',
  RLM_BUDGET_EXCEEDED: 'rlm:budget:exceeded',
});
```

### Chat Adapters Formatting RLM Events

The messaging hub's `formatEvent()` function handles RLM-specific formatting:

```typescript
// In tools/messaging/message-formatter.mjs
function formatEvent(event: AiwgEvent): FormattedMessage {
  if (event.topic.startsWith('rlm:')) {
    return formatRlmEvent(event);
  }
  // ... other formatters
}

function formatRlmEvent(event: AiwgEvent): FormattedMessage {
  switch (event.topic) {
    case EventTopic.RLM_TREE_STARTED:
      return {
        title: '🌳 RLM Task Tree Started',
        body: formatTreeStarted(event.details),
        severity: event.severity,
        fields: [
          { name: 'Tree ID', value: event.details.tree_id, inline: true },
          { name: 'Budget', value: formatBudget(event.details), inline: true },
          { name: 'Prompt', value: event.details.root_prompt }
        ],
        project: event.project,
        timestamp: event.timestamp
      };

    case EventTopic.RLM_TREE_PROGRESS:
      return {
        title: '📊 RLM Progress Update',
        body: formatTreeProgress(event.details),
        severity: event.severity,
        fields: [
          { name: 'Progress', value: renderProgressBar(event.details.completed_nodes, event.details.total_nodes) },
          { name: 'Cost', value: formatCost(event.details.cost_usd, event.details.budget_remaining_usd) }
        ],
        project: event.project,
        timestamp: event.timestamp
      };

    case EventTopic.RLM_BUDGET_WARNING:
      return {
        title: '⚠️ RLM Budget Warning',
        body: formatBudgetWarning(event.details),
        severity: 'warning',
        fields: [
          { name: 'Usage', value: `${event.details.current_usage.usage_pct}%` },
          { name: 'Remaining', value: formatBudget(event.details.budget_remaining) }
        ],
        project: event.project,
        timestamp: event.timestamp
      };

    // ... other RLM event types
  }
}
```

## Example Chat Session

### Slack Conversation

```
[10:00:00 AM] AIWG Bot
🌳 RLM Task Tree Started

Tree ID: tree-a1b2c3d4
Prompt: Analyze security risks in authentication module

Estimated nodes: 5 (max depth: 3)
Models: claude-sonnet-4.5 (root) → codex-mini-latest (sub)
Budget: 100,000 tokens ($2.50)

Project: my-project
Started: 2026-02-09 10:00:00 UTC

---

[10:00:30 AM] AIWG Bot
📊 RLM Progress Update

Tree: tree-a1b2c3d4
Progress: [███░░░░░░░] 1/5 nodes (20%)
Depth: 1

Cost: $0.25 / $2.50 budget (10.0%)
Tokens: 12,000 / 100,000 (12.0%)
Remaining: $2.25 / 88,000 tokens

ETA: 2m 0s

Project: my-project

---

[10:01:00 AM] AIWG Bot
📊 RLM Progress Update

Tree: tree-a1b2c3d4
Progress: [██████░░░░] 3/5 nodes (60%)
Depth: 2

Cost: $0.82 / $2.50 budget (32.8%)
Tokens: 45,000 / 100,000 (45.0%)
Remaining: $1.68 / 55,000 tokens

ETA: 1m 20s

Project: my-project

---

[10:02:45 AM] AIWG Bot
⚠️ RLM Budget Warning

Tree: tree-a1b2c3d4
Alert: 82.0% of budget used

Current usage:
  • 82,000 tokens / 100,000 (82.0%)
  • $1.85 / $2.50 (74.0%)

Remaining:
  • 18,000 tokens
  • $0.65

Recommendation: Consider stopping execution to stay within budget

Triggered by: task-d4e5f6g7
Time: 2026-02-09 10:02:45 UTC

---

[10:03:00 AM] AIWG Bot
✅ RLM Task Tree Completed

Tree ID: tree-a1b2c3d4
Duration: 3m 0s

Results: 5/5 nodes completed (0 failed)
Max depth: 2
Summary: Identified 3 security risks with mitigation strategies

Cost: $1.15 (46.0% of budget)
Tokens: 62,000

Output: .aiwg/rlm/trees/tree-a1b2c3d4/report.md

Project: my-project
Completed: 2026-02-09 10:03:00 UTC

---

[10:03:05 AM] User
/rlm-status tree-a1b2c3d4

[10:03:05 AM] AIWG Bot
Command Result

Tree: tree-a1b2c3d4
Status: completed

Nodes: 5/5 completed (0 failed)
Cost: $1.15 (62,000 tokens)
Duration: 3m 0s

Report: .aiwg/rlm/trees/tree-a1b2c3d4/report.md
```

### Discord Conversation

```
[10:00 AM] AIWG Bot

🌳 RLM Task Tree Started

Tree ID              Budget
tree-a1b2c3d4        100,000 tokens ($2.50)

Prompt: Analyze security risks in authentication module

Estimated nodes: 5 (max depth: 3)
Models: claude-sonnet-4.5 (root) → codex-mini-latest (sub)

Project: my-project

---

[10:00 AM] AIWG Bot

📊 RLM Progress Update

Tree: tree-a1b2c3d4
[████████░░] 4/5 nodes (80%)

Cost: $1.05 / $2.50 (42.0%)
Tokens: 55,000 / 100,000 (55.0%)

ETA: 45s

---

[10:03 AM] AIWG Bot

✅ RLM Task Tree Completed

Tree ID: tree-a1b2c3d4
Duration: 3m 0s

Results                    Cost
5/5 completed (0 failed)   $1.15 (46.0% of budget)

Summary: Identified 3 security risks with mitigation strategies

Output: .aiwg/rlm/trees/tree-a1b2c3d4/report.md

Project: my-project
```

### Telegram Conversation

```
[10:00] AIWG Bot
🌳 *RLM Task Tree Started*

*Tree ID:* tree-a1b2c3d4
*Prompt:* Analyze security risks in authentication module

Estimated nodes: 5 (max depth: 3)
Models: claude-sonnet-4.5 (root) → codex-mini-latest (sub)
Budget: 100,000 tokens ($2.50)

_Project: my-project_
_Started: 2026-02-09 10:00:00 UTC_

---

[10:01] AIWG Bot
📊 *RLM Progress Update*

Tree: tree-a1b2c3d4
Progress: [██████░░░░] 3/5 nodes (60%)

Cost: $0.82 / $2.50 budget (32.8%)
Tokens: 45,000 / 100,000 (45.0%)

ETA: 1m 20s

---

[10:03] AIWG Bot
✅ *RLM Task Tree Completed*

Tree ID: tree-a1b2c3d4
Duration: 3m 0s

Results: 5/5 nodes completed (0 failed)
Summary: Identified 3 security risks with mitigation strategies

Cost: $1.15 (46.0% of budget)
Tokens: 62,000

Output: .aiwg/rlm/trees/tree-a1b2c3d4/report.md

_Project: my-project_
_Completed: 2026-02-09 10:03:00 UTC_
```

## References

- `@tools/messaging/index.mjs` — Messaging hub implementation
- `@tools/messaging/types.mjs` — Event topic definitions
- `@tools/messaging/event-bus.mjs` — EventBus pub/sub system
- `@tools/messaging/message-formatter.mjs` — Event formatting logic
- `@tools/messaging/adapters/slack.mjs` — Slack adapter
- `@tools/messaging/adapters/discord.mjs` — Discord adapter
- `@tools/messaging/adapters/telegram.mjs` — Telegram adapter
- `@agentic/code/addons/rlm/schemas/rlm-task-tree.yaml` — Task tree schema
- `@agentic/code/addons/rlm/schemas/rlm-cost.yaml` — Cost tracking schema
- `@agentic/code/addons/rlm/manifest.json` — RLM addon manifest
- `@.aiwg/architecture/adrs/ADR-messaging-bot-mode.md` — Messaging architecture

---

**Status**: ACTIVE
**Last Updated**: 2026-02-09
**Issue**: #327
