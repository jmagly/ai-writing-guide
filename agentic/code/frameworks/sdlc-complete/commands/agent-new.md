---
description: Create a new agent following the Agent Design Bible patterns
category: project-task-management
argument-hint: "<agent-name> [--template simple|complex|orchestrator|validator] [--output-dir .claude/agents]"
allowed-tools: Read, Write, AskUserQuestion, TodoWrite
---

Create a new agent definition file following the [Agent Design Bible](~/.local/share/ai-writing-guide/docs/AGENT-DESIGN.md) and production-grade patterns from REF-001/REF-002.

## Research Foundation

This command creates agents that prevent the four failure archetypes identified in empirical research:

1. **Premature Action** → Grounding checkpoint included
2. **Over-Helpfulness** → Uncertainty escalation defined
3. **Distractor Pollution** → Context scoping guidance
4. **Fragile Execution** → Recovery protocol specified

## Instructions

1. Parse arguments:
   - `<agent-name>`: Required. Will be used for filename (`agent-name.md`)
   - `--template`: Optional. One of: simple, complex, orchestrator, validator (default: complex)
   - `--output-dir`: Optional. Where to create the agent (default: `.claude/agents`)

2. If interactive mode or missing details, ask:
   - Agent's single responsibility (what ONE thing does it do?)
   - Model tier needed (haiku for simple, sonnet for most, opus for complex reasoning)
   - Tools required (recommend 0-3, validate against Rule 2)
   - Primary input and output types

3. Read the appropriate template from:
   `~/.local/share/ai-writing-guide/templates/agent-scaffolding/{template}.md`

4. Generate the agent definition:
   - Replace all `{{VARIABLE}}` placeholders
   - Include failure prevention sections appropriate to template
   - Add research references

5. Validate against the 10 Golden Rules checklist

6. Write the agent file to `{output-dir}/{agent-name}.md`

7. Output summary with:
   - Path to created file
   - Validation checklist status
   - Suggested next steps (test the agent, add to deployment)

## Template Selection Guide

| Template | Best For | Model | Tools |
|----------|----------|-------|-------|
| `simple` | Single-purpose utilities, transforms | haiku | 1-2 |
| `complex` | Full reasoning with all safeguards | sonnet/opus | 2-3 |
| `orchestrator` | Coordinating multi-agent workflows | opus | Task only |
| `validator` | Read-only validation/review | haiku/sonnet | Read, Grep |

## 10 Golden Rules Checklist

Validate the generated agent against:

- [ ] **Rule 1**: Single responsibility (one clear purpose)
- [ ] **Rule 2**: Minimal tools (0-3, justified)
- [ ] **Rule 3**: Explicit inputs/outputs
- [ ] **Rule 4**: Grounding step before action
- [ ] **Rule 5**: Uncertainty escalation defined
- [ ] **Rule 6**: Context scoping guidance
- [ ] **Rule 7**: Recovery protocol specified
- [ ] **Rule 8**: Appropriate model tier
- [ ] **Rule 9**: Parallel-ready design
- [ ] **Rule 10**: Observable execution (trace output)

## Example Usage

```bash
# Create a simple utility agent
/agent-new config-validator --template simple

# Create a complex reasoning agent
/agent-new security-analyzer --template complex

# Create an orchestrator for a workflow
/agent-new release-coordinator --template orchestrator

# Create a validation agent
/agent-new code-standards-checker --template validator

# Specify output directory
/agent-new my-agent --output-dir src/agents
```

## Output Format

After creation:

```markdown
## Agent Created Successfully

**File**: `.claude/agents/{agent-name}.md`
**Template**: {template}
**Model**: {model}
**Tools**: {tool-list}

### Validation Checklist

✓ Single responsibility
✓ Minimal tools (N tools)
✓ Explicit I/O defined
✓ Grounding step included
✓ Uncertainty handling defined
✓ Context scoping guidance
✓ Recovery protocol specified
✓ Model tier appropriate
✓ Parallel-ready
✓ Observable execution

### Next Steps

1. Review and customize the generated agent
2. Test with: `Task(subagent_type="{agent-name}", prompt="...")`
3. Add to deployment manifest if needed
```

## References

- [Agent Design Bible](~/.local/share/ai-writing-guide/docs/AGENT-DESIGN.md)
- [REF-001: Production-Grade Patterns](~/.local/share/ai-writing-guide/docs/references/REF-001-production-grade-agentic-workflows.md)
- [REF-002: Failure Archetypes](~/.local/share/ai-writing-guide/docs/references/REF-002-llm-failure-modes-agentic.md)
- [Scaffolding Templates](~/.local/share/ai-writing-guide/templates/agent-scaffolding/)

Agent to create: $ARGUMENTS
