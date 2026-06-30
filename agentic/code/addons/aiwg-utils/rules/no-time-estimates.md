---
enforcement: medium
id: no-time-estimates
severity: HIGH
applies_to: [all-agents, orchestrators, planners, task-decomposers]
tags: [estimation, planning, scope, agents, parallelism]
---

# No Time Estimates — Agent-Oriented Estimation Instead

**Enforcement Level**: MEDIUM
## Rule

**Never produce wall-clock time estimates.** Human+AI development velocity is unknowable and varies non-linearly with operator skill, model quality, task decomposability, and tool configuration. Time estimates are noise that pollutes context and creates false expectations.

Instead, express all effort in **agent-oriented units**: scope, agent count, parallelism potential, and pass count.

---

## Why Time Estimates Fail in AI-Assisted Work

### The Velocity Problem

Traditional estimates assume a known baseline: "1 developer = N hours per story point." This assumption breaks down completely in human-AI centaur configurations (REF-169) where:

- One operator can direct 1–20+ specialized agents simultaneously
- Parallel execution can compress sequential timelines by 60–80% (REF-088)
- Model capability and prompt quality contribute more to speed than headcount
- The same task can complete in minutes or hours depending on tool configuration

### The Non-Linearity Problem

More agents ≠ faster output. The DeepMind scaling research (REF-086) shows:

- Coordination overhead grows as n*(n-1)/2 communication paths
- Above 4 concurrent agents: 17.2× error amplification in "bag of agents" architectures
- Agent quantity, coordination topology, model capability, and task properties interact — no simple multiplier exists

### The Duration Problem

Longer runs don't produce proportionally better results. REF-127 documents:

- 35-minute agent degradation threshold: performance degrades measurably beyond this point
- Doubling agent run duration quadruples failure rate
- Time spent ≠ progress made

### The Variance Problem

AI-assisted developer productivity studies show enormous variance across operators, tasks, and domains. Any single estimate will be wrong by an order of magnitude for some combination of factors. Publishing a time estimate is publishing noise.

---

## What to Estimate Instead

### 1. Scope Units

Decompose the work into atomic, independently-deliverable items. Count them. Each scope unit should be:
- Independently verifiable (testable or demonstrable)
- Completable in one agent loop cycle
- Named precisely ("add JWT validation to auth middleware" not "auth work")

**Output format**:
```
Scope: 7 atomic items
- UC-001: Add JWT validation to POST /auth/login
- UC-002: Add refresh token endpoint
- UC-003: Add token blacklist on logout
...
```

### 2. Agent Count and Roles

State how many specialized agents are needed and what each does. Use the 3–7 sweet spot (REF-088). Above 7, establish hierarchical sub-teams with explicit coordinators.

**Output format**:
```
Agents required: 4
- Planner (orchestrator): decomposes task graph, resolves blockers
- Security Auditor: validates auth implementation against OWASP
- Test Engineer: writes and runs integration tests
- Code Reviewer: checks patterns and consistency
```

### 3. Parallelism Map

Classify each scope unit as parallel-ready or sequential-dependent. This is the most actionable planning output — it determines actual throughput.

**Output format**:
```
Parallel batch 1 (can run simultaneously):
  - UC-001, UC-002, UC-003 (no dependencies)

Sequential gate: integration test suite must pass before:
  Parallel batch 2:
  - UC-004, UC-005 (depend on batch 1)
```

### 4. Pass Estimate

Estimate how many agent loop iterations will be needed to reach the quality gate. Base this on:
- Complexity of the verification command
- Number of interacting systems
- How tight the quality gate is

**Output format**:
```
Quality gate: npx tsc --noEmit && npm test passes with 0 failures
Estimated passes: 2–4
  Pass 1: Initial implementation
  Pass 2: Fix type errors and test failures
  Pass 3–4: Edge cases if integration reveals interaction bugs
```

**Never say**: "This will take 2–3 days."  
**Always say**: "This is 3 scope units, 2 passes to quality gate, parallelizable with 2 agents."

### 5. Quality Gate Clarity

Before any estimate, verify that completion criteria are measurable and agent-executable. If they aren't, getting that clarity is the first deliverable.

Per vague-discretion rule: "zero bugs," "code looks good," and "thorough" are not quality gates. Provide commands that exit 0 on success.

---

## Prohibited Phrases

The following patterns are banned from agent output in planning and estimation contexts:

| Banned | Replace With |
|--------|-------------|
| "This will take N days/hours/weeks" | "This is N scope units" |
| "Expected duration: X minutes" | "Estimated passes: N" |
| "This should be quick" | "This is 1 scope unit, 1 pass" |
| "This is a large task" | "This is N scope units, requires batching" |
| "Complex, may take a while" | "Sequential dependency chain: 3 gates before parallelism" |
| "Approximately N hours of work" | N/A — drop entirely |
| "Estimated completion: [timestamp]" | N/A — drop entirely |

The one exception: if the user explicitly asks for a time estimate and acknowledges the variance, you may offer a range with explicit caveats about the sources of variance. Even then, anchor the range to agent count and pass count, not to assumed human hours.

---

## Application

This rule applies whenever an agent is:
- Planning a task or sprint
- Decomposing work for another agent
- Responding to "how long will this take?"
- Writing completion reports
- Generating ADRs or phase plans
- Responding to scope questions in issues or PRs

---

## References

- REF-086: DeepMind multi-agent scaling — coordination tax, 17.2× error amplification above 4 agents, n*(n-1)/2 path overhead
- REF-088: DEV multi-agent guide — 3–7 agent sweet spot, 60–80% time compression from parallelism
- REF-127: Long-running agents — 35-min degradation threshold, doubling duration quadruples failure
- REF-169: Evans et al. 2026 — centaur configurations, one human directing many agents, velocity is non-scalar
- vague-discretion rule: measurable completion criteria requirement
- subagent-scoping rule: parallel vs sequential decomposition patterns
