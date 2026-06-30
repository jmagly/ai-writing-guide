---
enforcement: high
---

# TAO Loop Standardization Rules

**Enforcement Level**: HIGH
**Scope**: All iterative agent execution (agent loops, agent tasks)
**Research Basis**: REF-018 ReAct (Yao et al., 2022 — interleaving thought+action +34% performance; explicit TAO cut hallucination 56%→0%)
**Issue**: #162

## Overview

Standardize the Thought→Action→Observation (TAO) loop across all iterative execution for consistent reasoning traces and tool grounding.

## Canonical Format

Every iteration is a complete triplet:

```
THOUGHT: [reasoning about current state and next step]
ACTION:  [specific tool + parameters]
OBSERVATION: [result + status]
```

## Mandatory Elements

- **THOUGHT** must have: a type classification (one of the six thought types — see `thought-protocol.md`), clear intent, and justification. ("The error indicates token expiry; check the TTL config because the 60s default is likely too short" — not "Looking at the code.")
- **ACTION** must have: specific tool name, all parameter values, and rationale. ("Read src/auth/config.ts — checking TTL" — not "Reading the file.")
- **OBSERVATION** must have: the actual result, a status (`success` | `failure` | `partial` | `timeout`), and the key extraction (what was learned).

## Loop Execution Rules

### Rule 1: No Action Without Thought
Every ACTION is preceded by a THOUGHT stating intent. A bare ACTION with no preceding thought is FORBIDDEN.

### Rule 2: No Thought Without Follow-Up
A THOUGHT must lead to an ACTION (then OBSERVATION). Stacking thoughts with no action taken is FORBIDDEN.

### Rule 3: Complete TAO Triplets
Every iteration MUST be a complete T→A→O triplet. A partial iteration signals loop interruption (log it), agent failure (trigger recovery), or a need for human intervention.

### Rule 4: Observation Grounding
Each subsequent THOUGHT must reference prior OBSERVATIONs ("Based on the TTL=60 found in the config, increase to 3600" — not "update the TTL to some larger value").

## Error Handling

On observation failure: express an exception thought, analyze the failure cause, determine a recovery action, and continue with a new TAO iteration — never skip observation logging, proceed without analysis, or repeat the same action unchanged. On timeout: log a partial observation, express an exception thought, then retry with increased timeout / try an alternative / escalate.

Agent loops MUST log every iteration (loop id, task, per-iteration thought type + action + observation status) for monitoring and cross-agent learning.

## Checklist

Before completing a TAO loop: all iterations complete triplets; all thoughts type-classified; all actions have tool+parameters; all observations have status+result; subsequent thoughts reference prior observations; error handling followed.

## References

- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/thought-protocol.md — six thought types
- @$AIWG_ROOT/agentic/code/addons/ralph/schemas/iteration-analytics.yaml — iteration tracking
- #162

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
