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
