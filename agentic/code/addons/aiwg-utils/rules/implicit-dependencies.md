---
enforcement: medium
---

# Implicit-Dependencies Antipattern

**Enforcement Level**: MEDIUM
**Scope**: All tool-using agents across all platforms
**Addon**: aiwg-utils (core, universal)
**Issue**: #648

## Overview

Implicit-dependencies occurs when an orchestrator relies on conversation history or shared memory — rather than explicit context — to pass information between agents. Each sub-agent is a clean-slate process. It does not have access to the parent session's conversation, prior agent outputs, or any context not explicitly provided in its prompt.

## Problem Statement

Orchestrators assume sub-agents can "remember" or "see" context from the parent session:
- "Based on what we discussed earlier, fix the auth bug"
- Spawning an agent without providing the error message it needs to fix
- Assuming a second agent automatically knows the first agent's output
- Relying on a sub-agent to re-discover facts the parent already knows

This causes:
- Sub-agent hallucination (fabricates context it doesn't have)
- Sub-agent asking for information it should have been given
- Sub-agent working on the wrong problem because it lacked the actual context
- Inconsistent results across runs as sub-agents make different assumptions

## Mandatory Rules

### Rule 1: Sub-Agents Start Fresh

Every sub-agent has no knowledge of the parent session. Treat each sub-agent prompt as if you are writing it for someone who has never seen your conversation.

**FORBIDDEN**:
```
Parent session has been discussing a bug for 20 messages.

Sub-agent prompt:
  "Based on our investigation, fix the authentication bug."

Problem: Sub-agent has no idea what "our investigation" found.
```

**REQUIRED**:
```
Sub-agent prompt:
  "Fix the authentication bug in src/auth/sessionManager.ts line 142.

  Context:
  - Bug: session.userId is undefined on token refresh
  - Root cause identified: refreshToken() doesn't re-populate userId after validation
  - Expected behavior: userId must be set from the decoded token payload
  - Files to modify: src/auth/sessionManager.ts, possibly src/auth/tokenValidator.ts"
```

### Rule 2: Pass Prior Outputs Explicitly

When chaining agents (Agent A → Agent B), pass Agent A's output explicitly to Agent B — do not assume B can access A's work.

**FORBIDDEN**:
```python
# Agent A produces a research summary
result_a = run_agent("Research auth best practices")

# Agent B is expected to know what A found
result_b = run_agent("Based on the research, design the auth module")
# ERROR: Agent B has never seen Agent A's output
```

**REQUIRED**:
```python
# Agent A produces a research summary
result_a = run_agent("Research auth best practices")

# Explicitly pass A's output to B
result_b = run_agent(f"""
Design the auth module based on this research summary:

{result_a}

Requirements: ...
""")
```

### Rule 3: Include All Facts the Agent Needs

Before dispatching a sub-agent, ask: "Does this prompt contain everything the agent needs to complete the task, with no external lookups required for context?"

**Minimum required context**:
- The task itself (clear, unambiguous)
- Relevant file paths (for files the agent needs to read)
- Prior findings (from parent or sibling agents) the agent will build on
- Constraints (what not to change, what to preserve)
- Expected output format

**Not required**:
- Full conversation history
- Entire file contents (provide paths; agent reads itself)
- Background documentation the task doesn't use

### Rule 4: File Paths Are Explicit; Contents Are Optional

The pattern "here is the path, please read the file" provides explicit context without context-bloat. The agent is given an explicit pointer, not left to discover or assume.

**REQUIRED pattern**:
```
Sub-agent prompt:
  File: src/auth/sessionManager.ts (focus on the refreshToken function)
  File: src/auth/tokenValidator.ts (reference for token decode logic)

  Task: ...
```

This is explicit (the agent knows exactly what to look at) without being bloated (you're not dumping file contents you already loaded).

## Detection Patterns

| Symptom | Likely Cause |
|---------|-------------|
| Sub-agent output doesn't match the problem | Missing explicit context |
| Sub-agent asks clarifying questions the parent could have answered | Implicit dependency |
| Sub-agent hallucinates prior conversation | Assumed it had history access |
| Same task produces different results each run | Context was ambiguous or missing |
| Sub-agent "forgets" what the first agent found | Prior output not passed explicitly |

## Integration with Other Rules

- **context-bloat**: The opposite failure — passing too much context (see `context-bloat.md`)
- **subagent-scoping**: This rule ensures context completeness; subagent-scoping ensures task scope
- **instruction-comprehension**: Clear instructions from the user should translate to clear sub-agent prompts

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-bloat.md
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/subagent-scoping.md
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/instruction-comprehension.md
- OpenProse antipatterns guidance (research: #617)

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-04-02
