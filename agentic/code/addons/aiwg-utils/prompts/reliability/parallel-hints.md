# Parallel Execution Patterns

Guidance for maximizing agent concurrency in multi-step workflows.

## Research Foundation

**REF-001**: Bandara et al. (2024) BP-9 - KISS principle with composable agents

**REF-002**: Roig (2025) - Distributing load prevents Archetype 4 (Fragile Execution Under Load)

## Core Principle

> **Think parallel first.** Before executing any multi-step workflow, identify which subtasks can run concurrently.

## Parallel Execution Rules

### Rule 1: Single Message, Multiple Tasks

Launch independent agents in ONE message with multiple Task calls.

**CORRECT**:

```python
# Single message with 4 Task calls
Task(security-architect, "Review for security...")
Task(test-architect, "Review for testability...")
Task(technical-writer, "Review for clarity...")
Task(requirements-analyst, "Review for traceability...")
```

**INCORRECT**:

```python
# Multiple messages = serial execution
Task(security-architect, "Review...")  # Message 1
# Wait for response
Task(test-architect, "Review...")      # Message 2 - WRONG
# Wait for response
Task(technical-writer, "Review...")    # Message 3 - WRONG
```

### Rule 2: Identify Independence

Subtasks are independent when:

- [ ] No data flows from one to another
- [ ] No shared state modification
- [ ] Success of one doesn't depend on other's output
- [ ] Can produce complete output without other's results

### Rule 3: Sequence Only When Necessary

Only use sequential execution when:

- Output of task A is input to task B
- Task B validates/transforms task A's output
- Task B cannot start without task A's state change

## Parallel Identification Checklist

Before executing any workflow:

```
PARALLEL ANALYSIS:
1. List all subtasks
2. For each pair, ask: "Does B need A's output?"
3. Group tasks with no dependencies
4. Execute groups in parallel
5. Sequence only across groups
```

## Common Parallel Patterns

### Pattern 1: Fan-Out Review

Multiple independent reviewers examine same artifact.

```
Input: Document to review
        ↓
┌───────┴───────┐
│   PARALLEL    │
├───────────────┤
│ Reviewer A    │
│ Reviewer B    │
│ Reviewer C    │
│ Reviewer D    │
└───────┬───────┘
        ↓
Synthesizer merges feedback
```

**Implementation**:

```
Task(reviewer-a, "Review document for X...")
Task(reviewer-b, "Review document for Y...")
Task(reviewer-c, "Review document for Z...")
Task(reviewer-d, "Review document for W...")
# All in single message

# After all complete:
Task(synthesizer, "Merge reviews from .aiwg/working/reviews/")
```

### Pattern 2: Parallel Preparation

Multiple data gathering tasks before analysis.

```
┌───────────────┐
│   PARALLEL    │
├───────────────┤
│ Gather data A │
│ Gather data B │
│ Gather data C │
└───────┬───────┘
        ↓
Analysis (needs all data)
```

### Pattern 3: Parallel Implementation

Multiple independent features developed concurrently.

```
┌───────────────┐
│   PARALLEL    │
├───────────────┤
│ Feature A     │
│ Feature B     │
│ Feature C     │
└───────┬───────┘
        ↓
Integration testing
```

### Pattern 4: Pipeline with Parallel Stages

Some stages parallel, some sequential.

```
Stage 1 (sequential): Requirements analysis
        ↓
Stage 2 (parallel):
┌───────────────┐
│ Design A      │
│ Design B      │
└───────┬───────┘
        ↓
Stage 3 (sequential): Integration design
        ↓
Stage 4 (parallel):
┌───────────────┐
│ Implement A   │
│ Implement B   │
└───────┬───────┘
        ↓
Stage 5 (sequential): Testing
```

## Dependency Graph Notation

Use this notation to plan parallel execution:

```
[A] → Independent, can parallel
[B] → Independent, can parallel
[C] ← A,B → Depends on A and B
[D] ← C → Depends on C

Execution:
  Group 1 (parallel): A, B
  Group 2 (sequential after 1): C
  Group 3 (sequential after 2): D
```

## Anti-Patterns

### Anti-Pattern 1: Serial by Default

**Wrong**: Execute each task, wait, execute next.
**Right**: Analyze dependencies first, parallelize where possible.

### Anti-Pattern 2: False Dependencies

**Wrong**: "Review B might want to see Review A's notes"
**Right**: If B doesn't REQUIRE A's output, they're independent.

### Anti-Pattern 3: Over-Sequencing

**Wrong**: Sequential execution "to be safe"
**Right**: Parallel is safe when tasks are independent.

## Parallel Utilization Metrics

From Unified Production Plan:

| Metric | Target |
|--------|--------|
| Parallel utilization | >60% on flows with ≥4 subtasks |
| Parallel group size | 2-5 agents per group |
| Sequential bottlenecks | <2 per workflow |

## Integration with Decomposition

The decomposition template marks parallelization:

```
Subtasks:
  1. [task] → Parallel: Yes
  2. [task] → Parallel: Yes
  3. [task] → Parallel: No, depends on 1,2
```

Use this to build execution plan:

```
Phase 1 (parallel): Tasks 1, 2
Phase 2 (sequential): Task 3
```
