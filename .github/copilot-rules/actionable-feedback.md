# Actionable Feedback Rules

**Enforcement Level**: HIGH
**Scope**: All feedback generation in iteration loops
**Research Basis**: REF-015 Self-Refine (NeurIPS 2023)
**Issue**: #95

## Overview

These rules enforce structured, actionable feedback following Self-Refine principles. Research shows 94% of iteration failures stem from bad feedback, not bad refinement—making feedback quality the critical success factor.

## Research Foundation

| Finding | Impact |
|---------|--------|
| ~20% average improvement across 7 tasks | Confirms iterative refinement value |
| 94% of failures due to bad feedback | Feedback quality is paramount |
| "Specific, actionable feedback yields superior results" | Core principle |

## Mandatory Rules

### Rule 1: Location is REQUIRED

**FORBIDDEN**:
```
Issue: "The code has a bug"
Issue: "Documentation is unclear"
Issue: "This function needs work"
```

**REQUIRED**:
```
Issue: "Null pointer exception at line 42 in validateUser()"
Issue: "Section 3.2 'Authentication Flow' lacks sequence diagram"
Issue: "Function processPayment() missing error handling for timeout"
```

### Rule 2: Suggestions Must Be Actionable

**FORBIDDEN**:
```
Suggestion: "Consider improving this"
Suggestion: "Think about adding validation"
Suggestion: "Maybe refactor this section"
Suggestion: "You might want to change this"
```

**REQUIRED**:
```
Suggestion: "Replace lines 42-48 with try-catch wrapping the API call"
Suggestion: "Add input validation: if (!email.includes('@')) throw new ValidationError()"
Suggestion: "Extract lines 15-45 into a separate validateCredentials() function"
```

### Rule 3: Feedback Must Include Rationale

Every suggestion MUST explain WHY the change improves the artifact:

**FORBIDDEN**:
```yaml
suggestion:
  action: "Add error handling"
```

**REQUIRED**:
```yaml
suggestion:
  action: "Add try-catch around the database query"
  rationale: "Unhandled promise rejection will crash the process on connection timeout"
```

### Rule 4: Use Severity Levels Correctly

| Severity | Criteria | Example |
|----------|----------|---------|
| `critical` | Blocks acceptance, security/correctness issue | SQL injection vulnerability |
| `major` | Significant quality impact | Missing error handling |
| `minor` | Small improvement opportunity | Inconsistent naming |
| `suggestion` | Optional enhancement | Add JSDoc comments |

### Rule 5: Score All Aspects

Every feedback item MUST include a numeric score (0-1):

```yaml
feedback_items:
  - aspect: security
    severity: critical
    score: 0.2  # REQUIRED
    issue: "..."
```

### Rule 6: Track Feedback Quality

All feedback MUST be tracked for quality:

```yaml
quality_tracking:
  feedback_followed: true
  improvement_observed: true
  improvement_delta: 0.3
```

This enables learning which feedback patterns lead to successful refinement.

### Rule 7: Overall Verdict Must Match Items

The overall verdict must align with feedback items:

| Condition | Required Verdict |
|-----------|-----------------|
| Any critical item | `reject` or `refine` |
| Overall score < 0.5 | `refine` or `reject` |
| All items suggestion/minor, score > 0.8 | `accept` |
| Confidence < 0.5 | `escalate` |

## Feedback Schema

All feedback MUST conform to:
```
@agentic/code/addons/ralph/schemas/actionable-feedback.yaml
```

## Integration with Ralph Loop

When operating within a Ralph loop:

1. **Store feedback in memory**:
   ```yaml
   ralph_memory:
     feedback_history:
       - iteration: 1
         feedback_id: "fb-001"
         items_count: 3
         verdict: refine
   ```

2. **Check for repeated issues**:
   - If same issue appears 3+ times, escalate to human
   - Pattern indicates fundamental misunderstanding

3. **Track improvement trajectory**:
   - Score should improve iteration-over-iteration
   - Plateau indicates need for different approach

## Anti-Patterns

### Vague Feedback
```
# BAD
"Code quality needs improvement"

# GOOD
"Function calculateTotal() at line 87 has O(n²) complexity due to nested loops;
refactor to use a Map for O(n) lookup"
```

### Missing Location
```
# BAD
issue: "Input validation is missing"

# GOOD
issue: "Input validation missing in submitForm() for email field"
location:
  type: function
  reference: "submitForm()"
```

### Non-Actionable Suggestion
```
# BAD
suggestion:
  action: "Consider adding tests"

# GOOD
suggestion:
  action: "Add unit test for edge case: empty string input returns validation error"
  rationale: "Current test suite has no coverage for empty input handling"
```

## Quality Checklist

Before submitting feedback, verify:

- [ ] Every item has a specific location
- [ ] Every suggestion is actionable (concrete change specified)
- [ ] Every suggestion has a rationale
- [ ] Severity levels are appropriate
- [ ] All aspects are scored
- [ ] Overall verdict matches items
- [ ] Schema validation passes

## Metrics

Track these metrics for continuous improvement:

| Metric | Target | Purpose |
|--------|--------|---------|
| Feedback follow rate | >90% | Is feedback clear enough to follow? |
| Improvement rate | >80% | Does following feedback help? |
| Repeated issue rate | <10% | Are issues being addressed? |
| Escalation rate | <5% | Is feedback sufficient without human? |

## References

- @agentic/code/addons/ralph/schemas/actionable-feedback.yaml - Schema definition
- @.aiwg/research/findings/REF-015-self-refine.md - Research paper summary
- @agentic/code/addons/ralph/schemas/reflection-memory.json - Reflexion memory schema
- #95 - Implementation issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
