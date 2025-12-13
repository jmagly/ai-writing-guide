# Subagents Quick Reference

Quick reference for launching specialized subagents in Claude Code.

## Basic Pattern

```markdown
Use the Task tool with:
- `subagent_type`: Agent specialization (e.g., "code-reviewer", "test-engineer")
- `prompt`: Detailed task description
- `model`: Optional model override (sonnet, opus, haiku)
```

## Common Subagent Types

| Type | Purpose |
|------|---------|
| `code-reviewer` | Code quality and security review |
| `test-engineer` | Test creation and validation |
| `architecture-designer` | System design and ADRs |
| `security-gatekeeper` | Security assessment |
| `requirements-analyst` | Requirements analysis |

## Parallel Execution

Launch multiple agents in a single message for true parallelism:

```text
Task(code-reviewer) → Reviews code quality
Task(security-gatekeeper) → Reviews security
Task(test-engineer) → Validates test coverage
```

## See Also

- [Comprehensive Guide](#cmd-agents-commands) - Full patterns and examples
- [Development Guide](#cmd-dev-guide) - Command creation
- [Agent Design](#ref-agent-design) - The 10 Golden Rules
