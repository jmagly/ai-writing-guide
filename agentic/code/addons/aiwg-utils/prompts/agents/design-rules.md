# Agent Design Rules (Quick Reference)

Condensed 10 Golden Rules from the Agent Design Bible.

**Full Reference**: `~/.local/share/ai-writing-guide/docs/AGENT-DESIGN.md`

## The 10 Golden Rules

### Rule 1: Single Responsibility

One agent = one purpose. No "and" overload.

### Rule 2: Minimal Tools

0-3 tools per agent. Each tool increases decision space exponentially.

### Rule 3: Explicit I/O

Define exactly what agent receives and produces.

### Rule 4: Grounding Before Action

ALWAYS verify assumptions before modifying external state.

```
Before action:
1. List inspection tools available
2. Execute minimum inspection
3. Document confirmed state
4. Only then proceed
```

### Rule 5: Escalate Uncertainty

NEVER silently substitute missing data. Stop and ask.

```
If ambiguous:
1. STOP
2. LIST potential interpretations
3. REPORT to user
4. WAIT for clarification
```

### Rule 6: Scoped Context

Only process RELEVANT information. Ignore DISTRACTORS.

```
RELEVANT: Matches all scope dimensions → Process
PERIPHERAL: Matches some → If needed
DISTRACTOR: Matches none → Never use
```

### Rule 7: Recovery-First Design

Build agents that can recover from failures.

```
PAUSE → DIAGNOSE → ADAPT → RETRY → ESCALATE
```

### Rule 8: Appropriate Model Tier

| Tier | Use For |
|------|---------|
| haiku | Validation, formatting, simple transforms |
| sonnet | Code review, testing, documentation |
| opus | Architecture, security, complex reasoning |

### Rule 9: Parallel-Ready

Design for concurrent execution when tasks are independent.

### Rule 10: Observable Execution

Produce traceable outputs for debugging.

## Failure Archetype Prevention

| Archetype | Rule | Prevention |
|-----------|------|------------|
| 1. Premature Action | Rule 4 | Grounding checkpoint |
| 2. Over-Helpfulness | Rule 5 | Uncertainty escalation |
| 3. Distractor Pollution | Rule 6 | Context scoping |
| 4. Fragile Execution | Rule 7 | Recovery protocol |

## Quick Validation

Before deploying any agent:

- [ ] Single responsibility?
- [ ] ≤3 tools?
- [ ] I/O defined?
- [ ] Grounding step?
- [ ] Uncertainty handling?
- [ ] Context scoping?
- [ ] Recovery protocol?
- [ ] Right model tier?
- [ ] Parallel-safe?
- [ ] Observable?

## CLI Validation

```bash
aiwg lint agents [path] --verbose
```
