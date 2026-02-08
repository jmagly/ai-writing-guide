---
name: <AGENT_NAME>
description: <DESCRIPTION>
model: <MODEL:sonnet | opus>
tools: <TOOLS>
---

# Agent Template

## Permission Tier

**Tier**: <Analyst | Implementation | Orchestrator>

**Permitted Task Types**: <Explore | Explore, Bash | Unrestricted>

See @agentic/code/frameworks/sdlc-complete/docs/agent-permission-tiers.md for tier definitions.

## Purpose

<What this agent does and why it exists>

## Operating Model

### Inputs

- <Required inputs from users or other agents>

### Outputs

- <Artifacts, reports, or decisions produced>

## Process

<Step-by-step workflow this agent follows>

## Collaboration Map

- <Other agents this agent works with>
- <Escalation paths for blocked work>

## Thought Protocol

Apply structured reasoning using these thought types:

| Type | When to Use |
|------|-------------|
| **Goal** 🎯 | State objectives at task start |
| **Progress** 📊 | Track completion after each step |
| **Extraction** 🔍 | Pull key data from inputs |
| **Reasoning** 💭 | Explain logic behind decisions |
| **Exception** ⚠️ | Flag unexpected issues |
| **Synthesis** ✅ | Draw conclusions |

**Primary emphasis for <AGENT_NAME>**: <Primary thought types>

See @.claude/rules/thought-protocol.md for complete thought type definitions.
See @.claude/rules/tao-loop.md for Thought→Action→Observation integration.
See @.aiwg/research/findings/REF-018-react.md for research foundation.

## Deliverables

<List of artifacts this agent produces>

## Quality Criteria

<How to evaluate if this agent's output is good>

## Hook Integration

### PreToolUse Context Injection (#284)

Agents can receive dynamic context via PreToolUse hooks with `additionalContext`. This avoids bloating CLAUDE.md with static content that may not be relevant to every tool call.

**Pattern**: When a tool is invoked, hooks can inject agent-specific conventions:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit",
      "command": "cat .aiwg/conventions/<AGENT_SCOPE>.md",
      "additionalContext": true
    }]
  }
}
```

**Agent-specific hooks**:
- Write/Edit hooks: Inject coding conventions, style guides
- Bash hooks: Inject environment checks, safety gates
- Read hooks: Inject analysis frameworks for the content type

See @docs/mcp-auto-mode-guide.md for MCP-specific patterns.

### Quality Gate Hooks (#289)

With 10-minute hook timeouts (up from 60s), agents can enforce quality gates as hooks:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write",
      "command": "npm test -- --bail",
      "timeout": 300000,
      "blocking": true
    }],
    "PostToolUse": [{
      "matcher": "Bash",
      "command": ".aiwg/hooks/validate-output.sh",
      "timeout": 600000
    }]
  }
}
```

**Gate types enforceable via hooks**:

| Gate | Hook Type | Timeout | Use Case |
|------|-----------|---------|----------|
| Unit tests | PreToolUse(Write) | 5 min | Run tests before accepting code changes |
| Security scan | PreToolUse(Bash) | 10 min | Scan for vulnerabilities before execution |
| Lint/format | PostToolUse(Write) | 2 min | Auto-format after writes |
| Coverage check | PostToolUse(Bash) | 5 min | Verify coverage after test runs |

### Disk-Based Output Handling (#287)

Large tool outputs (>30KB) are saved to disk files instead of truncated. Agents must handle output references:

**When Bash output exceeds limits**, the result contains a file path reference instead of inline content. Agents should:

1. **Read the full output** using the Read tool on the referenced path
2. **Extract relevant sections** rather than processing the entire file
3. **Reference the output path** in debug memory and feedback

**Pattern for executable feedback with disk outputs**:
```
1. Run tests via Bash
2. If output is truncated/referenced:
   a. Read the output file
   b. Parse test results from full output
   c. Store in debug memory with file reference
3. Analyze failures from complete output
```

This is critical for Ralph loops where test output drives iteration decisions.
See @docs/task-management-integration.md for task output patterns.

## Skills and Commands (#288)

Claude Code unifies `.claude/commands/` and `.claude/skills/` - both directories work identically. When defining agent-invocable workflows:

- Place in either `.claude/commands/` or `.claude/skills/` (interchangeable)
- Use indexed arguments: `$ARGUMENTS[0]`, `$ARGUMENTS[1]` for positional params
- Use `$ARGUMENTS` for the full argument string
- Skill files are markdown with the prompt as content

**Agent skill pattern**:
```markdown
# .claude/commands/agent-task.md
Invoke the <AGENT_NAME> agent to perform: $ARGUMENTS

Use the following context:
- Project: $ARGUMENTS[0]
- Scope: $ARGUMENTS[1]
```

## Schema References

- @agentic/code/frameworks/sdlc-complete/schemas/<RELEVANT_SCHEMA>.yaml

## Few-Shot Examples

### Example 1: Simple - <Simple Scenario>

**Input:**
<User request>

**Output:**
```
<Complete expected output>
```

**Why This Is Good:**
- <Quality characteristic 1>
- <Quality characteristic 2>

### Example 2: Moderate - <Moderate Scenario>

**Input:**
<More complex request>

**Output:**
```
<Complete expected output>
```

**Why This Is Good:**
- <Quality characteristic 1>
- <Quality characteristic 2>

### Example 3: Complex - <Complex Scenario>

**Input:**
<Edge case or integration scenario>

**Output:**
```
<Complete expected output>
```

**Why This Is Good:**
- <Quality characteristic 1>
- <Quality characteristic 2>
