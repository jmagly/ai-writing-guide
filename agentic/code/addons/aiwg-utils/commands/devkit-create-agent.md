---
name: devkit-create-agent
description: Create a new agent with AI-guided expertise definition
args: <name> --to <target> [--template <type>] [--interactive]
---

# Create AIWG Agent

Create a new agent with AI assistance to define expertise, workflow, and capabilities.

## Usage

```
/devkit-create-agent <name> --to <target> [options]
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| name | Yes | Agent name (kebab-case recommended) |

## Required Options

| Option | Description |
|--------|-------------|
| --to | Target addon or framework |

## Optional Options

| Option | Description |
|--------|-------------|
| --template | Agent template: simple (default), complex, orchestrator |
| --interactive | Enable interactive mode with guided questions |

## Templates

### simple (default)
Single-purpose, focused agent with minimal structure.
- Best for: Utility agents, single-task specialists
- Tools: Read, Write, MultiEdit, Bash, WebFetch

### complex
Domain expert with deep knowledge sections, patterns, and anti-patterns.
- Best for: Subject matter experts, reviewers, analysts
- Tools: Read, Write, MultiEdit, Bash, WebFetch, Glob, Grep

### orchestrator
Multi-agent coordination with workflow patterns and agent assignment tables.
- Best for: Workflow coordinators, phase managers, CI/CD orchestrators
- Tools: Read, Write, MultiEdit, Bash, WebFetch, Task

## Interactive Mode

When `--interactive` is specified, I will ask:

1. **Role**: What is this agent's primary role?
2. **Expertise**: What domains does it specialize in?
3. **Responsibilities**: What are its key responsibilities?
4. **Tools**: What tools does it need access to?
5. **Workflow**: How should it approach tasks?
6. **Output**: What format should its output take?

## Examples

```bash
# Simple agent
/devkit-create-agent code-reviewer --to aiwg-utils

# Complex domain expert
/devkit-create-agent security-auditor --to sdlc-complete --template complex

# Orchestrator agent
/devkit-create-agent deployment-coordinator --to sdlc-complete --template orchestrator --interactive
```

## Execution

1. **Validate inputs**: Check name and target
2. **Verify target exists**: Ensure addon/framework is installed
3. **Select template**: Use specified or default to simple
4. **Gather expertise**: In interactive mode, ask about domain knowledge
5. **Generate agent file**: Create with frontmatter and sections
6. **Update manifest**: Add agent to manifest.json
7. **Report success**: Show location and customization tips

## Output Location

```
<target>/agents/<name>.md
```

## Agent File Structure

```markdown
---
name: agent-name
description: Agent description
model: sonnet
tools: Read, Write, MultiEdit, Bash, WebFetch
---

# Agent Title

[Description]

## Expertise
[Domain knowledge]

## Responsibilities
[What the agent does]

## Workflow
[How it approaches tasks]

## Output Format
[Expected output structure]
```

## CLI Equivalent

```bash
aiwg add-agent <name> --to <target> --template <type>
```

## Related Commands

- `/devkit-create-command` - Create a slash command
- `/devkit-create-skill` - Create an auto-triggered skill
- `/devkit-validate` - Validate agent structure
