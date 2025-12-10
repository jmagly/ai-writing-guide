# Agent Scaffolding Templates

Ready-to-use templates for creating production-grade agents following the [Agent Design Bible](../../docs/AGENT-DESIGN.md).

## Template Selection Guide

| Template | Use When | Model Tier | Tools |
|----------|----------|------------|-------|
| `simple.md` | Single-purpose utility tasks | haiku | 1-2 |
| `complex.md` | Full reasoning with all safeguards | sonnet/opus | 2-3 |
| `orchestrator.md` | Coordinating multiple agents | opus | Task only |
| `validator.md` | Read-only review/validation | haiku/sonnet | Read, Grep |

## Research Foundation

These templates incorporate failure prevention patterns from empirical research:

- **[REF-001](../../docs/references/REF-001-production-grade-agentic-workflows.md)**: Production-grade best practices (Bandara et al.)
- **[REF-002](../../docs/references/REF-002-llm-failure-modes-agentic.md)**: Failure archetype prevention (Roig 2025)

## Quick Start

```bash
# Using the /agent-new command
/agent-new my-agent --template simple

# Manual copy
cp templates/agent-scaffolding/simple.md .claude/agents/my-agent.md
```

## Template Variables

Replace these placeholders when using templates:

| Variable | Replace With |
|----------|--------------|
| `{{AGENT_NAME}}` | Your agent's display name |
| `{{AGENT_SLUG}}` | Lowercase hyphenated name for files |
| `{{DESCRIPTION}}` | One-sentence purpose statement |
| `{{ROLE}}` | The persona (e.g., "senior code reviewer") |
| `{{FOCUS}}` | Specific focus area |
| `{{MODEL}}` | haiku, sonnet, or opus |
| `{{TOOLS}}` | Comma-separated tool list |

## Validation Checklist

Before deploying, verify against the 10 Golden Rules:

- [ ] Single responsibility (Rule 1)
- [ ] Minimal tools (Rule 2)
- [ ] Explicit I/O (Rule 3)
- [ ] Grounding step (Rule 4)
- [ ] Uncertainty escalation (Rule 5)
- [ ] Context scoping (Rule 6)
- [ ] Recovery protocol (Rule 7)
- [ ] Appropriate tier (Rule 8)
- [ ] Parallel-ready (Rule 9)
- [ ] Observable (Rule 10)

## Failure Prevention

Each template includes sections addressing the four failure archetypes:

| Section | Prevents | Archetype |
|---------|----------|-----------|
| Grounding | Premature action | 1 |
| Uncertainty Handling | Over-helpfulness | 2 |
| Context Scope | Distractor pollution | 3 |
| Error Recovery | Fragile execution | 4 |
