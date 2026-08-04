---
namespace: aiwg
name: agent-persistence
platforms: [all]
description: Enable and explain the reusable human-in-the-loop gates used by persistent agent loops for destructive actions, false-positive overrides, and recovery escalation.
triggers:
  - enable agent persistence gates
  - configure human checkpoints for agent loops
  - add destructive action authorization
  - configure recovery escalation gates
---

# Agent Persistence

Use this driver to activate or understand the `agent-persistence` addon:

```bash
aiwg use agent-persistence
```

The addon supplies deterministic gate definitions, not a replacement loop
runtime. Compose it with `agent-loop` or another orchestrator that supports
human checkpoints.

## Canonical gates

- `destructive-action-gate.yaml` requires authorization before destructive work.
- `false-positive-override-gate.yaml` records reviewed policy overrides.
- `recovery-escalation-gate.yaml` escalates bounded recovery failures.

Read the gate contract before integrating it, preserve its authorization
boundary, and use the owning loop's status surface to verify activation.

## References

- @$AIWG_ROOT/agentic/code/addons/agent-persistence/docs/hitl-integration.md
- @$AIWG_ROOT/agentic/code/addons/agent-loop/skills/agent-loop/SKILL.md
