# LATS Hybrid Value Function Guide

**Based on**: REF-024 LATS (ICML 2024)
**Achievement**: 92.7% HumanEval pass@1 (state-of-the-art)
**Issue**: #98

## Overview

The LATS (Language Agent Tree Search) hybrid value function combines two complementary evaluation approaches:

1. **V_LM**: LLM-generated scalar score based on expert judgment
2. **V_SC**: Self-consistency voting based on outcome agreement

The combined value: **V(s) = λ × V_LM(s) + (1-λ) × V_SC(s)**

Where λ = 0.5 is optimal per the research.

## Why Hybrid?

| Approach | Strength | Weakness |
|----------|----------|----------|
| V_LM alone | Captures nuance, rationale | Can be overconfident, biased |
| V_SC alone | Robust, execution-grounded | Misses quality nuances |
| **Hybrid** | Best of both | Balanced, reliable |

## The Formula

```
V(s) = λ × V_LM(s) + (1-λ) × V_SC(s)

Where:
- V(s) = Combined value of state s (0-1)
- V_LM(s) = LLM judgment score (0-1)
- V_SC(s) = Self-consistency score (0-1)
- λ = Weighting factor (default 0.5)
```

## V_LM: LLM Judgment

### How It Works

1. Present artifact to LLM with evaluation prompt
2. LLM provides scalar score (0-1) with rationale
3. Optionally break down by quality aspects

### Prompt Templates

**Quality Assessment**:
```
Evaluate the following {{artifact_type}} on a scale of 0-1:

{{content}}

Consider:
1. Correctness: Does it achieve its intended purpose?
2. Completeness: Are all necessary elements present?
3. Clarity: Is it easy to understand?
4. Best practices: Does it follow established conventions?

Provide:
- Overall score (0-1)
- Aspect scores
- Brief rationale
```

**Correctness Check**:
```
Verify the correctness of this {{artifact_type}}:

{{content}}

Check for:
1. Logical errors
2. Inconsistencies
3. Missing edge cases
4. Incorrect assumptions

Score: 0 (definitely incorrect) to 1 (definitely correct)
```

### V_LM Output Structure

```yaml
v_lm:
  score: 0.75
  prompt_template: quality_assessment
  rationale: "Good structure, missing edge case handling"
  aspects:
    - name: correctness
      score: 0.7
      weight: 0.3
    - name: completeness
      score: 0.6
      weight: 0.25
    - name: clarity
      score: 0.9
      weight: 0.2
    - name: best_practices
      score: 0.8
      weight: 0.25
  confidence: 0.8
```

## V_SC: Self-Consistency Voting

### How It Works

1. Generate n rollouts (default: 5) of the same task
2. Cluster similar outcomes
3. Score = proportion in largest cluster

### Rollout Process

```
For i = 1 to n:
    outcome[i] = execute_task(artifact)
    cluster[i] = assign_cluster(outcome[i])

V_SC = max(cluster_sizes) / n
```

### Voting Methods

| Method | Description | Best For |
|--------|-------------|----------|
| `majority` | >50% agreement required | Binary outcomes |
| `plurality` | Largest cluster wins | Multiple valid outcomes |
| `weighted` | Weight by execution success | Code with tests |
| `execution_guided` | Only count successful executions | Test-driven evaluation |

### V_SC Output Structure

```yaml
v_sc:
  score: 0.8
  n_rollouts: 5
  rollouts:
    - id: 1
      outcome: "Tests pass"
      cluster: 1
      execution_success: true
      test_passed: true
    # ... more rollouts
  voting_method: majority
  cluster_distribution:
    - cluster_id: 1
      count: 4
    - cluster_id: 2
      count: 1
  consensus_strength: 0.8
```

## Lambda Tuning

While λ = 0.5 is optimal in general, tune by task type:

| Task Type | Recommended λ | Rationale |
|-----------|--------------|-----------|
| Code generation | 0.4 | Execution provides strong signal |
| Documentation | 0.6 | LLM judgment better for prose |
| Architecture | 0.5 | Balance expert judgment + consistency |
| Requirements | 0.55 | Slight LLM bias for completeness |
| Test cases | 0.45 | Slight execution bias for quality |

### Tuning Guidelines

**Increase λ (favor V_LM)** when:
- Outcomes are subjective
- Execution is expensive/impossible
- Expert judgment is reliable

**Decrease λ (favor V_SC)** when:
- Outcomes are objective/testable
- Execution is cheap
- LLM tends to be overconfident

## Interpretation

| V_LM | V_SC | Combined | Interpretation | Action |
|------|------|----------|----------------|--------|
| High | High | High | `high_confidence` | Accept |
| High | Low | Medium | `llm_favored` | Investigate V_SC failures |
| Low | High | Medium | `consensus_favored` | Review LLM concerns |
| Low | Low | Low | `low_confidence` | Reject or major refine |
| Divergent | Divergent | Varies | `divergent` | Expand search |

## Decision Thresholds

```yaml
accept:
  combined_score: >= 0.85
  interpretation: high_confidence

refine:
  combined_score: 0.5 - 0.85
  interpretation: llm_favored OR consensus_favored

reject:
  combined_score: < 0.5
  interpretation: low_confidence

expand_search:
  condition: divergent AND search_budget_remaining
```

## Integration with AIWG

### With Quality Agents

Quality agents (Test Engineer, Code Reviewer, Security Auditor) should use LATS evaluation:

```yaml
evaluation_protocol:
  trigger: artifact_complete
  method: lats_hybrid
  lambda: 0.5  # or task-specific
  n_rollouts: 5
  decision_mapping:
    accept: proceed
    refine: generate_feedback
    reject: escalate
    expand_search: backtrack
```

### With Ralph Loop

```yaml
ralph_evaluation:
  iteration_evaluation:
    method: lats_hybrid
    lambda: 0.5
  progress_tracking:
    store_evaluations: true
    track_score_trajectory: true
  termination:
    condition: "combined_score >= 0.85 for 2 consecutive iterations"
```

### With HITL Gates

```yaml
gate_integration:
  auto_approve_condition: |
    combined_score >= 0.9 AND
    interpretation == "high_confidence" AND
    consensus_strength >= 0.8
```

## Example Evaluation

```yaml
evaluation_id: "eval-auth-validate"
target:
  type: code
  path: "src/auth/validate.ts"

v_lm:
  score: 0.75
  rationale: "Good structure, missing null input handling"
  aspects:
    - name: correctness
      score: 0.7
    - name: completeness
      score: 0.6
    - name: clarity
      score: 0.9

v_sc:
  score: 0.8
  n_rollouts: 5
  cluster_distribution:
    - cluster_id: 1  # "Tests pass"
      count: 4
    - cluster_id: 2  # "Fails on null"
      count: 1
  consensus_strength: 0.8

combined:
  score: 0.775  # 0.5 × 0.75 + 0.5 × 0.8
  lambda: 0.5
  interpretation: high_confidence
  decision: refine  # Just below 0.85 threshold
```

## Implementation Checklist

When implementing LATS evaluation:

- [ ] Define evaluation prompt template
- [ ] Configure number of rollouts (default: 5)
- [ ] Select voting method
- [ ] Set lambda (default: 0.5, or task-specific)
- [ ] Define decision thresholds
- [ ] Configure integration with agents/Ralph/gates
- [ ] Store evaluations for tracking

## Schema Reference

All evaluations MUST conform to:
```
@agentic/code/frameworks/sdlc-complete/schemas/research/lats-evaluation.yaml
```

## References

- @.aiwg/research/findings/REF-024-lats.md - Research paper summary
- @agentic/code/frameworks/sdlc-complete/schemas/research/lats-evaluation.yaml - Schema definition
- @agentic/code/frameworks/sdlc-complete/schemas/research/quality-assessment.yaml - Quality assessment
- @agentic/code/addons/ralph/schemas/actionable-feedback.yaml - Feedback format
- #98 - Implementation issue

---

**Guide Version**: 1.0.0
**Last Updated**: 2026-01-25
