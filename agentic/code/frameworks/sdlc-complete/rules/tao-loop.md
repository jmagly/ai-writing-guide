---
enforcement: high
---

# TAO Loop Standardization Rules

**Enforcement Level**: HIGH
**Scope**: All iterative agent execution (agent loops, agent tasks)
**Research Basis**: REF-018 ReAct (Yao et al., 2022 — interleaving thought+action +34% performance; explicit TAO cut hallucination 56%→0%); the LFD control-pattern research cluster (external corpus: section9/research-papers REF-1398–REF-1406 / REF-1500–REF-1542, pending local induction)
**Issue**: #162, #1585

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

### Rule 5: Non-Improving Cycles Require Structural Variation

If an iteration does not improve the declared score, validation state, or
completion evidence, the next THOUGHT MUST name what will change structurally.
Repeating the same adjustment, prompt, search query, or edit pattern after a
flat observation is FORBIDDEN unless new evidence explains why repetition is
expected to work.

Examples of structural variation:

- switch from broad search to targeted source inspection
- replace prompt-only changes with mechanical validation
- isolate one failing case instead of editing the general solution
- introduce a probe that distinguishes two hypotheses
- reduce scope to a minimal reproduction before widening again

### Rule 6: Declare Exploration Quota for Long Loops

Long-running, eval-driven, or budgeted loops MUST declare an exploration quota
`K` before autonomous execution. At least once every `K` non-terminal cycles,
the loop must try a structurally different strategy or stop with a best-output
report. `K` may be task-specific, but it must be visible in the progress file.

```yaml
loop_entropy:
  exploration_quota_k: 3
  flat_cycle_count: 2
  next_required_action: "structural_variant_or_stop"
```

## Error Handling

On observation failure: express an exception thought, analyze the failure cause, determine a recovery action, and continue with a new TAO iteration — never skip observation logging, proceed without analysis, or repeat the same action unchanged. On timeout: log a partial observation, express an exception thought, then retry with increased timeout / try an alternative / escalate.

Agent loops MUST log every iteration (loop id, task, per-iteration thought type,
action, and observation status) for monitoring and cross-agent learning. For
multi-iteration autonomous loops, the log also includes the current hypothesis,
expected failure mode, distinguishing diagnostic, structural variant, and any
budget-stop status.

## Checklist

Before completing a TAO loop: all iterations complete triplets; all thoughts
type-classified; all actions have tool+parameters; all observations have
status+result; subsequent thoughts reference prior observations; flat cycles
trigger structural variation or stop; error handling followed.

## References

- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/thought-protocol.md — six thought types
- @$AIWG_ROOT/agentic/code/addons/agent-loop/schemas/iteration-analytics.yaml — iteration tracking
- @.aiwg/research/reports/issue-1585-lfd-control-patterns-research-brief.md — LFD control-pattern synthesis
- @.aiwg/architecture/adr-lfd-control-patterns-for-agent-loops.md — tiered loop-control ADR
- #162
- #1585

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
