# ADR Scoring Matrix Template

**Based on**: REF-020 Tree-of-Thoughts Research
**Issue**: #164
**Version**: 1.0.0

## Overview

This template provides a structured scoring matrix for evaluating Architecture Decision Record (ADR) alternatives using Tree-of-Thoughts evaluation methodology.

## Research Foundation

From REF-020 Tree-of-Thoughts (Yao et al., 2023):
- Structured evaluation improves decision quality by 20-70%
- Explicit scoring enables systematic comparison
- Multi-dimensional evaluation prevents overlooking trade-offs
- Quantified scores enable threshold-based acceptance

---

## ADR Scoring Matrix

### Decision Information

| Field | Value |
|-------|-------|
| **ADR ID** | ADR-XXX |
| **Title** | [Decision Title] |
| **Status** | proposed / accepted / deprecated / superseded |
| **Date** | YYYY-MM-DD |
| **Decision Makers** | [Reviewers] |

### Context

[Describe the architectural concern being addressed]

### Alternatives Under Evaluation

| Alternative | Description |
|------------|-------------|
| **A: [Name]** | [Brief description] |
| **B: [Name]** | [Brief description] |
| **C: [Name]** | [Brief description] |

---

## Scoring Dimensions

### Dimension Definitions

| Dimension | Description | Weight |
|-----------|-------------|--------|
| **Technical Fit** | How well does this solve the technical problem? | 0.25 |
| **Complexity** | Implementation and maintenance complexity (lower is better) | 0.15 |
| **Scalability** | Ability to handle growth in load/data/users | 0.15 |
| **Security** | Security posture and risk profile | 0.15 |
| **Cost** | Initial and ongoing cost (lower is better) | 0.10 |
| **Time to Implement** | How quickly can this be delivered? | 0.10 |
| **Team Expertise** | Does team have skills to implement/maintain? | 0.10 |

### Scoring Scale

| Score | Meaning |
|-------|---------|
| **5** | Excellent - Fully meets/exceeds requirements |
| **4** | Good - Meets most requirements with minor gaps |
| **3** | Adequate - Meets basic requirements |
| **2** | Poor - Significant gaps in meeting requirements |
| **1** | Unacceptable - Does not meet requirements |

---

## Evaluation Matrix

### Raw Scores

| Dimension | Weight | Alt A | Alt B | Alt C |
|-----------|--------|-------|-------|-------|
| Technical Fit | 0.25 | _ | _ | _ |
| Complexity | 0.15 | _ | _ | _ |
| Scalability | 0.15 | _ | _ | _ |
| Security | 0.15 | _ | _ | _ |
| Cost | 0.10 | _ | _ | _ |
| Time to Implement | 0.10 | _ | _ | _ |
| Team Expertise | 0.10 | _ | _ | _ |

### Weighted Scores

| Dimension | Alt A Weighted | Alt B Weighted | Alt C Weighted |
|-----------|---------------|---------------|---------------|
| Technical Fit | _ × 0.25 = _ | _ × 0.25 = _ | _ × 0.25 = _ |
| Complexity | _ × 0.15 = _ | _ × 0.15 = _ | _ × 0.15 = _ |
| Scalability | _ × 0.15 = _ | _ × 0.15 = _ | _ × 0.15 = _ |
| Security | _ × 0.15 = _ | _ × 0.15 = _ | _ × 0.15 = _ |
| Cost | _ × 0.10 = _ | _ × 0.10 = _ | _ × 0.10 = _ |
| Time to Implement | _ × 0.10 = _ | _ × 0.10 = _ | _ × 0.10 = _ |
| Team Expertise | _ × 0.10 = _ | _ × 0.10 = _ | _ × 0.10 = _ |
| **TOTAL** | **_** | **_** | **_** |

---

## Scoring Justifications

### Alternative A: [Name]

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Technical Fit | _ | [Why this score?] |
| Complexity | _ | [Why this score?] |
| Scalability | _ | [Why this score?] |
| Security | _ | [Why this score?] |
| Cost | _ | [Why this score?] |
| Time to Implement | _ | [Why this score?] |
| Team Expertise | _ | [Why this score?] |

### Alternative B: [Name]

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Technical Fit | _ | [Why this score?] |
| Complexity | _ | [Why this score?] |
| Scalability | _ | [Why this score?] |
| Security | _ | [Why this score?] |
| Cost | _ | [Why this score?] |
| Time to Implement | _ | [Why this score?] |
| Team Expertise | _ | [Why this score?] |

### Alternative C: [Name]

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Technical Fit | _ | [Why this score?] |
| Complexity | _ | [Why this score?] |
| Scalability | _ | [Why this score?] |
| Security | _ | [Why this score?] |
| Cost | _ | [Why this score?] |
| Time to Implement | _ | [Why this score?] |
| Team Expertise | _ | [Why this score?] |

---

## Decision Thresholds

### Acceptance Criteria

| Criterion | Threshold | Result |
|-----------|-----------|--------|
| Minimum Total Score | ≥ 3.0 | Accept if met |
| Security Minimum | ≥ 3 raw | Reject if not met |
| Technical Fit Minimum | ≥ 3 raw | Reject if not met |
| Leading Margin | ≥ 0.5 over second | Clear winner |

### Threshold Evaluation

| Alternative | Total | Security | Tech Fit | Passes All? |
|-------------|-------|----------|----------|-------------|
| Alt A | _ | _ | _ | Yes/No |
| Alt B | _ | _ | _ | Yes/No |
| Alt C | _ | _ | _ | Yes/No |

---

## Risk Analysis

### Alternative A Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | Low/Med/High | Low/Med/High | [How to address] |
| [Risk 2] | Low/Med/High | Low/Med/High | [How to address] |

### Alternative B Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | Low/Med/High | Low/Med/High | [How to address] |
| [Risk 2] | Low/Med/High | Low/Med/High | [How to address] |

### Alternative C Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | Low/Med/High | Low/Med/High | [How to address] |
| [Risk 2] | Low/Med/High | Low/Med/High | [How to address] |

---

## Final Decision

### Recommendation

**Selected Alternative**: [A/B/C]: [Name]

**Total Score**: [X.XX]

**Rationale**:
1. [Primary reason for selection]
2. [Secondary reason]
3. [Additional considerations]

### Dissenting Views

[Document any disagreement with the decision and the reasoning]

### Consequences

**Positive**:
- [Positive outcome 1]
- [Positive outcome 2]

**Negative**:
- [Trade-off 1]
- [Trade-off 2]

**Neutral**:
- [Other consequence]

---

## Review Information

| Role | Reviewer | Score Agreement |
|------|----------|-----------------|
| Architect | [Name] | Agree/Disagree |
| Tech Lead | [Name] | Agree/Disagree |
| Security | [Name] | Agree/Disagree |
| Product | [Name] | Agree/Disagree |

**Consensus Level**: [Unanimous / Majority / Split]

**Escalation Required**: Yes/No

---

## References

- @.aiwg/research/findings/REF-020-tree-of-thoughts.md - ToT methodology
- @.claude/rules/reasoning-sections.md - Reasoning requirements
- @.aiwg/flows/schemas/ensemble-review.yaml - Review patterns
- #164 - Implementation issue

---

## Usage Notes

### For Architects

1. Fill in Context and Alternatives first
2. Score each dimension independently
3. Calculate weighted totals
4. Check against thresholds
5. Document justifications thoroughly
6. Submit for ensemble review if critical

### For Reviewers

1. Verify scoring justifications make sense
2. Check for missing risks
3. Validate threshold calculations
4. Flag any dimension you'd score differently
5. Provide dissenting view if total score would change ranking

### Weight Customization

Default weights can be adjusted per project:

```yaml
custom_weights:
  # Security-critical project
  security: 0.25
  technical_fit: 0.20
  complexity: 0.15
  scalability: 0.15
  cost: 0.10
  time_to_implement: 0.10
  team_expertise: 0.05
```

Document weight changes and rationale in the ADR.
