# Research Gaps and Planned Literature Reviews

Tracks identified evidence gaps requiring formal literature review. Each gap is logged when a claim cannot be adequately supported by the current research corpus.

**Policy**: All gaps are identified per @.claude/rules/citation-policy.md Rule 7.

## Open Gaps

### GAP-001: Microservices Scalability Claims

- **Claim**: "Microservices improve scalability"
- **Current Evidence**: GRADE: VERY LOW — anecdotal practitioner reports only
- **Needed**: Systematic review or controlled study comparing monolith vs microservices scalability metrics
- **Search Terms**: microservices scalability benchmark, monolith migration study, distributed systems performance comparison
- **Filed By**: citation-policy-audit
- **Filed Date**: 2026-01-25
- **Status**: Open
- **Priority**: Medium

### GAP-002: Daily Standup Velocity Impact

- **Claim**: "Daily standups improve team velocity"
- **Current Evidence**: GRADE: VERY LOW — practitioner blog posts, no controlled studies
- **Needed**: Controlled study or cohort study measuring velocity with/without standups
- **Search Terms**: daily standup effectiveness study, agile ceremony impact, scrum meeting productivity
- **Filed By**: citation-policy-audit
- **Filed Date**: 2026-01-25
- **Status**: Open
- **Priority**: Low

### GAP-003: TDD Defect Reduction Magnitude

- **Claim**: "TDD reduces defects by 40-50%"
- **Current Evidence**: GRADE: MODERATE — individual studies exist but effect sizes vary widely (15-90%)
- **Needed**: Meta-analysis or systematic review with pooled effect sizes
- **Search Terms**: test-driven development meta-analysis, TDD defect density systematic review
- **Filed By**: citation-policy-audit
- **Filed Date**: 2026-01-25
- **Status**: Open
- **Priority**: High — frequently cited claim

### GAP-004: Pair Programming Defect Reduction

- **Claim**: "Pair programming reduces defect rates"
- **Current Evidence**: GRADE: MODERATE — single cohort study (Williams et al., 2000)
- **Needed**: Replication studies or meta-analysis across diverse teams
- **Search Terms**: pair programming defect rate study, collaborative programming quality, pair programming systematic review
- **Filed By**: citation-policy-audit
- **Filed Date**: 2026-01-25
- **Status**: Open
- **Priority**: Medium

### GAP-005: Automated Testing Production Defect Impact

- **Claim**: "Automated testing reduces production defects by 40-50%"
- **Current Evidence**: GRADE: MODERATE — large-scale observational study (Beller, 2017), correlation not causation
- **Needed**: Randomized controlled trial or natural experiment with causal inference
- **Search Terms**: automated testing effectiveness RCT, continuous testing production defects, test automation ROI study
- **Filed By**: citation-policy-audit
- **Filed Date**: 2026-01-25
- **Status**: Open
- **Priority**: High — core AIWG claim

### GAP-006: Chain-of-Thought Prompting Generalizability

- **Claim**: "CoT prompting improves reasoning by 2-4x"
- **Current Evidence**: GRADE: HIGH for arithmetic/logic tasks (Wei et al., 2022), but unclear for software engineering tasks
- **Needed**: Studies applying CoT specifically to software engineering agent tasks
- **Search Terms**: chain-of-thought software engineering, CoT prompting code generation, reasoning prompts programming
- **Filed By**: citation-policy-audit
- **Filed Date**: 2026-01-25
- **Status**: Open
- **Priority**: Medium — relevant to agent design

## Resolved Gaps

_No resolved gaps yet._

## Gap Registration Protocol

When identifying a new evidence gap:

1. Assign next GAP-XXX identifier
2. Document the claim being made
3. Assess current GRADE level
4. Specify what evidence type would close the gap
5. Provide search terms for literature review
6. Set priority based on frequency of claim usage

## References

- @.claude/rules/citation-policy.md — Citation requirements that trigger gap identification
- @.aiwg/research/docs/grade-assessment-guide.md — GRADE methodology for assessing evidence
- @.aiwg/research/sources/ — Research corpus (check here before filing new gap)
