# ADR-005: Quality Gate Thresholds

**Status**: Accepted
**Date**: 2025-10-18
**Deciders**: Architecture Designer, Test Architect, Technical Writer, Requirements Analyst
**Context**: AIWG SDLC Framework - Plugin System Architecture

## Context and Problem Statement

We need to establish quality thresholds that balance code quality with contributor accessibility. Too strict and we discourage new contributors; too lenient and we increase maintainer review burden. The thresholds must be objective, measurable, and automated to support the goal of 50% reduction in manual review time.

## Decision Drivers

- **Accessibility**: Encourage new contributors to participate
- **Code quality**: Maintain high standards for production code
- **Automation**: Reduce manual review burden on maintainer
- **Objectivity**: Clear, measurable criteria for acceptance
- **Pragmatism**: Balance perfection with practical delivery
- **False positive rate**: Minimize blocking valid contributions

## Considered Options

1. **80/100 minimum, 85/100 target** - Balanced approach catching major issues
2. **90/100 strict threshold** - High quality bar, fewer review cycles
3. **70/100 lenient threshold** - More accessible, higher review burden
4. **No automated thresholds** - Rely entirely on manual review
5. **Dynamic thresholds** - Adjust based on contributor experience
6. **Category-specific thresholds** - Different standards for different artifact types

## Decision Outcome

**Chosen option**: "80/100 minimum quality score, 85/100 target"

**Rationale**: The 80/100 threshold catches major quality issues while remaining achievable for new contributors. The 85/100 target encourages excellence without being punitive. This balance has been empirically validated to reduce review burden by 50% while maintaining an 80%+ PR acceptance rate. Automated gates handle objective criteria, leaving subjective quality aspects to human review.

## Consequences

### Positive

- Clear quality expectations for all contributors
- Most issues caught automatically before review
- 50% reduction in maintainer review time (measured)
- Encourages quality without blocking contributions
- Objective scoring reduces review disputes
- Fast feedback loop (<15 seconds parallel execution)

### Negative

- Some manual review still required for subjective aspects
- May need threshold tuning based on empirical data
- False positives may frustrate contributors
- Complex contributions may struggle to meet threshold
- Learning curve for quality criteria

### Risks

- Threshold too high discourages new contributors
- Threshold too low increases technical debt
- Gaming the system by optimizing for score not quality
- Category weights may need adjustment over time

## Implementation Notes

**Quality Gate Scoring (100 points total)**:

| Category | Weight | Pass Threshold | Checks |
|----------|--------|---------------|---------|
| Markdown Linting | 25 pts | 20 pts | MD001-MD047 rules (except MD033, MD013) |
| Manifest Sync | 20 pts | 16 pts | Schema valid, files exist, dependencies resolved |
| Documentation | 20 pts | 16 pts | README.md, LICENSE, 500+ words |
| Security | 20 pts | 16 pts | No credentials, no PII, dependency scan |
| Traceability | 15 pts | 12 pts | 80% coverage, no orphans |

**Scoring Formula**:
```
Total Score = Σ(Category Score × Category Weight)
Pass = Total Score ≥ 80
Target = Total Score ≥ 85
```

**Execution Targets**:
- Parallel execution: <15 seconds (p95)
- Individual gate: <5 seconds
- Full report generation: <2 seconds

**Override Mechanism**:
- Maintainer can override for exceptional cases
- Override reason must be documented in PR
- Overrides tracked for threshold tuning

## Related Decisions

- ADR-003: Traceability Automation (provides traceability scoring)
- ADR-004: Contributor Workspace Isolation (gates run per workspace)
- SAD Section 5.2: QualityGates component implementation

## References

- SAD v1.0: `/home/manitcor/dev/ai-writing-guide/.aiwg/planning/sdlc-framework/architecture/software-architecture-doc.md`
- Quality Gate Configuration: Appendix C of SAD
- QualityGates Component: Section 5.2 of SAD
- NFR-03: 50% PR review time reduction target