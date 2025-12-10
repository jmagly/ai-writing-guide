# AIWG Hooks

Claude Code hook templates for workflow tracing, permissions, and session management.

## Research Foundation

- **REF-001**: BP-6 - Production workflows require trace capture for observability
- **REF-002**: Archetype 4 - Recovery requires execution history

## Installation

```bash
aiwg install aiwg-hooks
```

Or manual:

```bash
cp -r aiwg-hooks/hooks/* ~/.config/claude/hooks/
```

## Hooks

### aiwg-trace.js

Captures multi-agent workflow execution traces.

**Events Captured:**
- `SubagentStart` - Agent spawn with metadata (type, model, tools)
- `SubagentStop` - Completion with outcome, duration, transcript path

**Configuration:**

Add to `.claude/settings.local.json`:

```json
{
  "hooks": {
    "SubagentStart": ["node", "~/.config/claude/hooks/aiwg-trace.js", "start"],
    "SubagentStop": ["node", "~/.config/claude/hooks/aiwg-trace.js", "stop"]
  }
}
```

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `AIWG_TRACE_DIR` | `.aiwg/traces` | Trace output directory |
| `AIWG_TRACE_FILE` | `current-trace.jsonl` | Trace filename |
| `AIWG_TRACE_VERBOSE` | `false` | Log to stderr |
| `AIWG_WORKFLOW_ID` | (auto) | Workflow identifier |

**Trace Format (JSONL):**

```json
{"timestamp":"2025-01-15T10:30:00.000Z","type":"agent_start","agent_id":"abc123","subagent_type":"security-architect","model":"sonnet"}
{"timestamp":"2025-01-15T10:30:45.000Z","type":"agent_stop","agent_id":"abc123","outcome":"success","duration_ms":45000}
```

## Scripts

### trace-viewer.mjs

View and analyze workflow traces.

```bash
# View current trace as tree
aiwg trace-view

# View as timeline
aiwg trace-view --format timeline

# Filter by agent type
aiwg trace-view --filter security

# View specific trace file
aiwg trace-view --trace .aiwg/traces/2025-01-15.jsonl

# Export as JSON
aiwg trace-view --format json > trace.json
```

**Output Formats:**

**Tree** (default):
```
✓ architecture-designer [opus] (45000ms)
  ✓ security-architect [sonnet] (12000ms)
  ✓ test-architect [sonnet] (8000ms)
  ✓ technical-writer [haiku] (5000ms)
✓ documentation-synthesizer [sonnet] (15000ms)
```

**Timeline:**
```
| Time     | Event | Agent              | Details            |
|----------|-------|--------------------|--------------------|
| 10:30:00 | START | architecture-designer | model=opus       |
| 10:30:05 | START | security-architect | model=sonnet       |
| 10:30:17 | STOP  | security-architect | success (12000ms)  |
```

## Trace Directory Structure

```
.aiwg/traces/
├── current-trace.jsonl    # Active workflow trace
├── 2025-01-15-workflow-abc.jsonl  # Archived traces
└── transcripts/           # Captured agent transcripts
    ├── agent-abc123.json
    └── agent-def456.json
```

## Integration with Workflows

Set workflow ID for correlated traces:

```bash
export AIWG_WORKFLOW_ID="flow-security-$(date +%Y%m%d-%H%M%S)"
/flow-security-review-cycle
```

Archive trace after workflow:

```bash
mv .aiwg/traces/current-trace.jsonl .aiwg/traces/$AIWG_WORKFLOW_ID.jsonl
```

## Observability Benefits

1. **Debugging**: Trace agent interactions to identify failures
2. **Performance**: Identify slow agents or bottlenecks
3. **Recovery**: Use traces to replay failed workflows
4. **Audit**: Compliance trail of agent decisions
5. **Optimization**: Analyze parallel execution patterns

## Related

- `prompts/reliability/resilience.md` - Recovery protocol using traces
- `flow-*.md` - Workflow commands that generate traces
- Claude Code hooks documentation
