---
namespace: aiwg
name: ralph-analytics
platforms: [all]
description: Show analytics and metrics from agent loop execution history
commandHint:
  category: ralph
---

# Al Analytics Command

Display aggregate analytics and metrics from agent loop execution history.

## Instructions

When invoked, analyze agent loop data and present metrics:

1. **Scan Loop History**
   - Load all loop records from `.aiwg/ralph/`
   - Load reflections from `.aiwg/ralph/reflections/`
   - Load debug memory from `.aiwg/ralph/debug-memory/`

2. **Calculate Metrics**
   - **Success rate**: % of loops that completed successfully
   - **Average iterations**: Mean iterations to completion
   - **Reflection reuse rate**: % of reflections applied in subsequent loops
   - **Stuck loop rate**: % of loops that hit stuck detection
   - **Escalation rate**: % requiring human intervention

3. **Pattern Analysis**
   - Most common failure types
   - Most effective fix patterns
   - Average time per iteration
   - Quality trajectory per loop

4. **Display Dashboard**
   - Summary metrics table
   - Trend indicators (improving/stable/degrading)
   - Recommendations for improvement

## Arguments

- `--since [date]` - Analyze loops from date (default: all)
- `--loop [id]` - Analyze specific loop
- `--export [path]` - Export analytics to file
- `--brief` - Show summary only

## References

- @$AIWG_ROOT/agentic/code/addons/ralph/schemas/reflection-memory.json - Reflection schema
- @$AIWG_ROOT/agentic/code/addons/ralph/schemas/debug-memory.yaml - Debug memory schema
- @$AIWG_ROOT/agentic/code/addons/ralph/docs/reflection-memory-guide.md - Guide
