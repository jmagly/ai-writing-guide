# Task Decomposition Prompts

Structured patterns for breaking complex tasks into manageable subtasks.

## Research Foundation

**REF-002**: Roig (2025) Archetype 4 - "Fragile Execution Under Load"

> "As task complexity increases, models exhibit coherence loss, generation loops, malformed tool calls, and abandonment of structured reasoning."

**Mitigation**: Decompose tasks to keep subtasks within cognitive limits (≤7 items per level).

## The 7±2 Rule

Cognitive load research shows working memory handles 7±2 items effectively. Apply this to:

- Maximum subtasks per decomposition level: 7
- Maximum depth of decomposition: 3 levels
- If more needed: restructure into phases

## Decomposition Templates

### Template 1: Atomic Task

For tasks completable in a single agent action.

```
Task: [description]
Type: ATOMIC
Agent: [single agent]
Estimated complexity: Low
Dependencies: None

Action: Execute directly without further decomposition.
```

### Template 2: Small Task (2-3 subtasks)

For tasks requiring a short sequence.

```
Task: [description]
Type: SMALL
Subtasks:
  1. [subtask] → Agent: [agent]
  2. [subtask] → Agent: [agent]
  3. [subtask] → Agent: [agent]

Execution: Sequential or parallel based on dependencies.
```

### Template 3: Medium Task (4-7 subtasks)

For substantial tasks with clear breakdown.

```
Task: [description]
Type: MEDIUM
Complexity: Moderate

Subtasks:
  1. [subtask] → Agent: [agent] | Dependencies: None | Parallel: Yes
  2. [subtask] → Agent: [agent] | Dependencies: None | Parallel: Yes
  3. [subtask] → Agent: [agent] | Dependencies: 1,2 | Parallel: No
  4. [subtask] → Agent: [agent] | Dependencies: 3 | Parallel: No
  5. [subtask] → Agent: [agent] | Dependencies: 4 | Parallel: No

Grounding Required:
  - Before subtask 1: [verification step]
  - Before subtask 3: [verification step]

Success Criteria:
  - [measurable outcome]
```

### Template 4: Large Task (Multi-level)

For complex tasks requiring hierarchical breakdown.

```
Task: [description]
Type: LARGE
Complexity: High

Phase 1: [phase name]
  1.1 [subtask] → Agent: [agent]
  1.2 [subtask] → Agent: [agent]
  1.3 [subtask] → Agent: [agent]
  Gate: [what must be true to proceed]

Phase 2: [phase name]
  2.1 [subtask] → Agent: [agent]
  2.2 [subtask] → Agent: [agent]
  Gate: [what must be true to proceed]

Phase 3: [phase name]
  3.1 [subtask] → Agent: [agent]
  3.2 [subtask] → Agent: [agent]
  3.3 [subtask] → Agent: [agent]

Total subtasks: [count] across [phase count] phases
Max per phase: [count] (must be ≤7)
```

### Template 5: Epic Task (Multiple decomposition rounds)

For very large initiatives.

```
Task: [description]
Type: EPIC
Complexity: Very High

Initial Decomposition → Work Packages:
  WP1: [name] - [brief description]
  WP2: [name] - [brief description]
  WP3: [name] - [brief description]

Each work package decomposes into LARGE or MEDIUM tasks.

Example WP1 breakdown:
  Task 1.1: [description] → MEDIUM template
  Task 1.2: [description] → SMALL template
  Task 1.3: [description] → LARGE template

Coordination:
  - WP dependencies: [dependency graph]
  - Integration points: [where WPs connect]
  - Checkpoints: [milestones]
```

## Decomposition Decision Tree

```
START
  │
  ├─ Can a single agent complete this in one action?
  │   └─ YES → ATOMIC
  │
  ├─ Can this be done in 2-3 steps?
  │   └─ YES → SMALL
  │
  ├─ Can this be done in 4-7 steps?
  │   └─ YES → MEDIUM
  │
  ├─ Does this need phases with gates?
  │   └─ YES → LARGE
  │
  └─ Does this span multiple work packages?
      └─ YES → EPIC
```

## Grounding Checkpoints

Insert grounding steps when:

- Subtask modifies external state
- Subtask depends on previous output
- Subtask operates on user data

```
Grounding Checkpoint:
  Before: [subtask N]
  Verify: [what to check]
  Tool: [Read/Grep/ls/etc]
  Proceed if: [condition]
  Escalate if: [condition]
```

## Parallel Identification

Mark subtasks for parallel execution when:

- No data dependencies between them
- No shared state modification
- Independent success criteria

```
Parallel Group A: [subtasks 1, 2, 3]
  - Launch in single message with multiple Task calls
  - All independent
  - Results merged after completion

Sequential after A: [subtask 4]
  - Depends on Group A outputs
  - Must wait for completion
```

## Agent Assignment Heuristics

| Subtask Type | Agent Tier | Rationale |
|--------------|------------|-----------|
| Information gathering | haiku | Simple retrieval |
| Analysis/review | sonnet | Balanced reasoning |
| Architecture/design | opus | Complex trade-offs |
| Validation/formatting | haiku | Deterministic checks |
| Coordination | opus | Multi-agent orchestration |

## Example: Feature Implementation

```
Task: "Implement user authentication with SSO"
Type: LARGE

Phase 1: Design
  1.1 Gather requirements → Requirements Analyst | sonnet
  1.2 Design auth architecture → Architecture Designer | opus
  1.3 Security review design → Security Architect | opus
  Gate: Architecture approved, security requirements met

Phase 2: Implementation
  2.1 Implement auth service → Software Implementer | sonnet [Parallel]
  2.2 Implement SSO integration → Software Implementer | sonnet [Parallel]
  2.3 Write unit tests → Test Engineer | sonnet [After 2.1, 2.2]
  Gate: All tests passing, code reviewed

Phase 3: Validation
  3.1 Integration testing → Test Engineer | sonnet
  3.2 Security testing → Security Auditor | opus
  3.3 Documentation → Technical Writer | haiku
  Gate: All validations passed

Grounding Checkpoints:
  - Before 1.1: Verify existing auth if any
  - Before 2.1: Verify design doc exists
  - Before 3.1: Verify implementation complete
```

## Success Metrics

From Unified Production Plan:

| Metric | Target |
|--------|--------|
| Tasks auto-split | 80% into ≤7 subtasks |
| Subtask success rate | Higher than monolithic |
| Parallel utilization | >60% on ≥4-subtask flows |
