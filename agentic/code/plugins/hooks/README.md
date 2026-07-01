# AIWG Hooks

Claude Code hooks for workflow tracing and observability.

## Features

- **Workflow Tracing**: Capture multi-agent workflow traces
- **JSONL Output**: Streaming data for analysis
- **Session Management**: Track session state across interactions
- **Timeline Visualization**: Understand workflow execution

## Hooks

- `SessionStart`: Initialize tracing on session start
- `PostToolUse`: Capture tool execution results
- `AgentComplete`: Record agent completion status

## Quick Start

Install the plugin and hooks are automatically active.

Traces are written to `.aiwg/traces/` in JSONL format.

## Documentation

- Full guide: https://docs.aiwg.io/hooks
- Discord: https://discord.gg/BuAusFMxdA
