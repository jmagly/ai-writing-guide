---
enforcement: high
---

# Vague-Discretion Antipattern

**Enforcement Level**: HIGH
**Scope**: All tool-using agents across all platforms
**Addon**: aiwg-utils (core, universal)
**Issue**: #648

## Overview

Vague-discretion occurs when loop termination conditions, quality gates, or completion criteria use unmeasurable or ambiguous language — "good enough", "zero bugs", "comprehensive", "thorough", "complete". These conditions cannot be evaluated consistently, leading to infinite loops, premature exits, or wildly varying output quality.

## Problem Statement

Vague conditions cause agents to:
- Loop indefinitely because "good enough" is never objectively reached
- Exit prematurely because "good enough" is subjectively satisfied too early
- Produce unpredictable output quality across runs
- Skip steps because "comprehensive" is self-defined and therefore always true
- Stall on judgment calls they cannot make without measurable criteria

Common vague conditions:
- "until the output is good enough"
- "until zero bugs remain"
- "until it's comprehensive"
- "until the code is clean"
- "until everything works"
- "until the tests pass" (vague if it doesn't specify which tests)
- "until the review is thorough"

## Mandatory Rules

### Rule 1: Measurable Termination Conditions

All loop termination conditions MUST be concrete and measurable. Replace vague language with specific thresholds, counts, or verifiable outcomes.

**FORBIDDEN**:
```yaml
completion_criteria:
  - output is good enough
  - zero bugs remain
  - comprehensive coverage achieved
  - the code is clean
```

**REQUIRED**:
```yaml
completion_criteria:
  - score >= 85 on the evaluation rubric
  - all existing test assertions pass (npm test exits 0)
  - branch coverage >= 80% (reported by jest --coverage)
  - no ESLint errors in src/ (eslint exits 0)
```

### Rule 2: Concrete Quality Gate Criteria

Quality gates at phase boundaries must list specific, checkable criteria — not descriptions of a desired state.

**FORBIDDEN**:
```
Gate: Elaboration Complete
Criteria:
  - Architecture is solid
  - Requirements are thorough
  - Team is confident
```

**REQUIRED**:
```
Gate: Elaboration Complete
Criteria:
  - SAD document exists at .aiwg/architecture/software-architecture-doc.md
  - All use cases in .aiwg/requirements/ have acceptance criteria
  - Risk register contains >= 5 identified risks with mitigations
  - CI pipeline is green (last 3 builds pass)
```

### Rule 3: Ralph Completion Criteria

When using Ralph for agent loops, `--completion` must be a verifiable condition, not an aspiration.

**FORBIDDEN**:
```bash
aiwg ralph "Fix all the bugs" --completion "when the code is good"
```

**REQUIRED**:
```bash
aiwg ralph "Fix failing tests" \
  --completion "npm test exits 0 with no skipped tests" \
  --max-cycles 6
```

### Rule 4: Escape Hatches for Infinite Loops

Any loop condition, even a measurable one, must have a `max-cycles` or `max-iterations` escape hatch. A system that loops forever waiting for score >= 85 is broken even if the condition is measurable.

**REQUIRED pattern**:
```yaml
loop:
  condition: score >= 85
  max_iterations: 5
  fallback: return_best  # or: escalate, fail
```

## Substitution Guide

| Vague Condition | Measurable Replacement |
|-----------------|----------------------|
| "good enough" | "score >= N on [rubric]" |
| "zero bugs" | "[tool] exits 0" or "no [severity] findings in report" |
| "comprehensive" | "covers N scenarios" or "N% coverage" |
| "clean" | "linter exits 0" or "no [rule] violations" |
| "everything works" | "CI pipeline passes" or "test suite exits 0" |
| "thorough review" | "reviewer checked [N specific criteria]" |
| "complete" | "checklist of N items all checked" |

## Detection Patterns

| Symptom | Likely Cause |
|---------|-------------|
| Agent loop runs >max-cycles without converging | Vague condition or unmeasurable threshold |
| Different runs produce wildly different iteration counts | Condition evaluated inconsistently |
| Agent declares "done" immediately | Self-referential vague condition |
| Agent stalls asking "is this good enough?" | Missing measurable threshold |

## Integration with Other Rules

- **anti-laziness**: Vague conditions enable lazy exits; measurable criteria enforce completeness
- **instruction-comprehension**: When receiving vague instructions, extract and clarify what "done" means before starting

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/instruction-comprehension.md
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/anti-laziness.md
- OpenProse antipatterns guidance (research: #617)

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-04-02
