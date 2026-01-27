# Tree of Thoughts Decision Workflow

**Purpose:** Guide for applying Tree of Thoughts (ToT) deliberate planning to architecture and design decisions.

**Research Basis:** REF-020 (Yao et al., 2023, NeurIPS) - Demonstrated 18.5x improvement on planning tasks (4% → 74% success rate).

**Status:** Active
**Version:** 1.0.0
**Last Updated:** 2026-01-25

---

## Overview

Tree of Thoughts (ToT) is a deliberate planning framework that explores multiple reasoning paths before committing to a decision. Unlike linear reasoning (Chain-of-Thought), ToT generates multiple alternatives, evaluates each systematically, and enables backtracking when a path fails.

### When to Use ToT

Use Tree of Thoughts for:

- **Architecture decisions** - Technology stack, patterns, infrastructure choices
- **Technology selection** - Database engines, frameworks, cloud providers
- **Design trade-offs** - Performance vs maintainability, cost vs scalability
- **Complex problem decomposition** - Multiple valid solution approaches
- **High-stakes decisions** - Choices difficult or expensive to reverse

**Don't use ToT for:**
- Simple implementation choices (overkill)
- Decisions with clear right answers (no alternatives to evaluate)
- Reversible decisions with low switching cost (not worth overhead)

### Expected Outcomes

When properly applied, ToT produces:
- Multiple viable alternatives (k=3-5 options)
- Quantitative scoring against defined criteria
- Documented rationale for selection
- Clear understanding of trade-offs
- Defined backtracking triggers

---

## The 5-Phase ToT Process

### Phase 1: Define Evaluation Criteria

Before generating alternatives, establish how they will be evaluated.

**Activities:**
1. Review non-functional requirements (NFRs)
2. Identify relevant quality attributes
3. Assign weights based on project priorities
4. Define minimum acceptable thresholds
5. Specify critical (pass/fail) criteria

**Deliverable:** Evaluation criteria table with weights

**Example:**

| Criterion | Weight | Source | Critical? |
|-----------|--------|--------|-----------|
| Performance | 30% | NFR-PERF-001 | No |
| Scalability | 25% | NFR-SCAL-001 | No |
| Maintainability | 20% | NFR-MAIN-001 | No |
| Security | 15% | NFR-SEC-001 | Yes (must score 8+) |
| Cost | 10% | Budget constraint | No |

**Minimum acceptable score:** 65/100
**Critical criteria:** Security must score 8+ regardless of weighted total

### Phase 2: Generate Alternatives (k=3-5)

Create distinct architectural options that address the problem from different angles.

**Guidelines:**
- **Minimum k=3:** Always generate at least 3 alternatives
- **Recommended k=5:** Five options provide good coverage without analysis paralysis
- **Ensure diversity:** Options should represent genuinely different approaches, not minor variations
- **Include status quo:** If modifying existing architecture, include "do nothing" as baseline

**Generation Strategies:**

1. **Pattern-based:** Explore different architectural patterns (microservices, monolith, serverless)
2. **Technology-based:** Same pattern, different tech stacks (PostgreSQL vs MongoDB, REST vs GraphQL)
3. **Trade-off-based:** Optimize for different criteria (performance-optimized vs cost-optimized)
4. **Vendor-based:** Different ecosystem choices (AWS vs GCP vs Azure, MySQL vs PostgreSQL)
5. **Hybrid:** Combine elements from multiple approaches

**Deliverable:** 3-5 distinct option descriptions

**Example Options (Database Selection):**
1. PostgreSQL with read replicas (RDBMS, ACID guarantees)
2. MongoDB sharded cluster (NoSQL, flexible schema)
3. DynamoDB with DAX caching (Managed NoSQL, AWS-native)
4. Hybrid: PostgreSQL for transactional + Redis for caching
5. NewSQL: CockroachDB (Distributed SQL, cloud-native)

### Phase 3: Evaluate Each Alternative

Score each option against defined criteria with documented rationale.

**Scoring Scale:**
- **0-2:** Fails criterion significantly
- **3-4:** Marginal, significant concerns
- **5-6:** Acceptable, some compromises
- **7-8:** Good fit, minor concerns
- **9-10:** Excellent fit, ideal for criterion

**Evaluation Template (per option):**

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Performance | 8 | Handles 10K req/s with <100ms latency. Read replicas support scaling reads. Some write bottleneck concerns. |
| Scalability | 7 | Vertical scaling of primary + horizontal read replicas. Sharding available but complex. |
| Maintainability | 9 | Well-known technology, strong tooling, extensive documentation. Team has expertise. |
| Security | 8 | Mature RBAC, SSL support, encryption at rest. Strong track record. |
| Cost | 6 | Moderate licensing costs, requires DBA expertise. Read replicas increase infrastructure cost. |

**Weighted Score Calculation:**
```
(8×0.30) + (7×0.25) + (9×0.20) + (8×0.15) + (6×0.10) = 7.75
7.75 × 10 = 77.5/100
```

**Critical Criteria Check:**
- Security (critical): Score 8 → PASS

**Deliverable:** Completed evaluation for all k options

### Phase 4: Compare and Select

Use comparison matrix to identify the highest-scoring option and understand trade-offs.

**Comparison Matrix:**

| Option | Perf | Scale | Maint | Sec | Cost | **Total** | Critical Pass? | Rank |
|--------|------|-------|-------|-----|------|-----------|----------------|------|
| PostgreSQL+Replicas | 8 (2.4) | 7 (1.75) | 9 (1.8) | 8 (1.2) | 6 (0.6) | **77.5** | Yes | 1 |
| MongoDB Sharded | 9 (2.7) | 9 (2.25) | 6 (1.2) | 7 (1.05) | 5 (0.5) | **76.5** | Fail (Sec<8) | - |
| DynamoDB+DAX | 9 (2.7) | 10 (2.5) | 7 (1.4) | 8 (1.2) | 4 (0.4) | **81.0** | Yes | - |
| Hybrid PG+Redis | 9 (2.7) | 8 (2.0) | 6 (1.2) | 8 (1.2) | 5 (0.5) | **75.0** | Yes | 2 |
| CockroachDB | 7 (2.1) | 10 (2.5) | 6 (1.2) | 8 (1.2) | 4 (0.4) | **74.0** | Yes | 3 |

**Selection Logic:**
1. Eliminate options failing critical criteria (MongoDB: Security score 7 < 8 required)
2. Identify highest scoring among remaining options (DynamoDB: 81.0)
3. **BUT:** Consider context-specific factors not captured in scoring:
   - **Vendor lock-in risk** (DynamoDB = high AWS dependency)
   - **Team expertise** (PostgreSQL = strong existing skills)
   - **Migration complexity** (PostgreSQL = easier from current MySQL)

**Decision:** Select PostgreSQL+Replicas (77.5) instead of DynamoDB (81.0) due to:
- Avoiding vendor lock-in (strategic)
- Leveraging team expertise (lower risk)
- Easier migration path (faster delivery)
- Score difference small (3.5 points)

**Deliverable:** Selected option with documented rationale for selection, including why higher-scoring options may have been rejected.

### Phase 5: Define Backtracking Triggers

Specify conditions that would indicate the decision was wrong and should be reconsidered.

**Backtracking Trigger Categories:**

1. **Performance failures:**
   - Response times exceed SLA by 50%+ consistently
   - Cannot handle projected load growth
   - Query optimization hits fundamental limits

2. **Scalability ceilings:**
   - Approaching hard scaling limits (e.g., single-server capacity)
   - Sharding complexity becomes maintenance burden
   - Cost of scaling exceeds budget projections

3. **Operational issues:**
   - Availability falls below SLA commitments
   - Maintenance windows exceed acceptable downtime
   - Operational costs exceed 2x projections

4. **Team capability gaps:**
   - Team cannot maintain/operate chosen technology effectively
   - Expertise acquisition fails (hiring, training)
   - Knowledge silos create bottlenecks

5. **Business context changes:**
   - Regulatory requirements change (e.g., new data residency laws)
   - Company acquisition changes technology standards
   - Product pivot changes usage patterns significantly

**Example Backtracking Triggers:**

For PostgreSQL+Replicas decision:
- **Trigger 1:** Write throughput consistently exceeds 5K/s (vertical scaling limit)
- **Trigger 2:** Read replica lag exceeds 5 seconds during normal load
- **Trigger 3:** Database operational costs exceed $10K/month
- **Trigger 4:** DBA turnover creates knowledge gap not filled within 60 days
- **Trigger 5:** New compliance requirement mandates multi-region active-active

**Backtracking Action:** When trigger occurs, re-run ToT evaluation with updated context and constraints.

**Deliverable:** Documented list of 3-7 specific, measurable backtracking triggers

---

## Scoring Matrix Template

Use this template for consistent option evaluation:

```markdown
## Option [N]: [Name]

### Description
[Detailed description of approach]

### Evaluation

| Criterion | Score (0-10) | Rationale |
|-----------|--------------|-----------|
| [Criterion 1] | X | [Why?] |
| [Criterion 2] | X | [Why?] |
| [Criterion 3] | X | [Why?] |
| [Criterion 4] | X | [Why?] |
| [Criterion 5] | X | [Why?] |

**Weighted Score:** [(X×W1) + (X×W2) + ... ] × 10 = XX/100

**Critical Criteria Check:**
- [ ] [Critical 1]: Score X → PASS/FAIL
- [ ] [Critical 2]: Score X → PASS/FAIL

### Pros
- [Strength 1]
- [Strength 2]
- [Strength 3]

### Cons
- [Weakness 1]
- [Weakness 2]
- [Weakness 3]

### Risks
- [Risk 1 + mitigation]
- [Risk 2 + mitigation]
```

---

## Decision Documentation Template

After selection, document in ADR:

```markdown
## Decision

**Selected Option:** [Option X - Name]

**Quantitative Rationale:**
- Scored XX/100 (threshold: 65/100)
- Ranked [1st/2nd/3rd] among viable options
- Passed all critical criteria

**Qualitative Rationale:**
[Why this option despite scoring, context factors, stakeholder input]

**Trade-offs Accepted:**
- [Trade-off 1: What we're giving up and why it's acceptable]
- [Trade-off 2: What we're giving up and why it's acceptable]

**Backtracking Triggers:**
- [Trigger 1: Measurable condition]
- [Trigger 2: Measurable condition]
- [Trigger 3: Measurable condition]
```

---

## Common Pitfalls and Mitigations

### Pitfall 1: Superficial Alternatives

**Problem:** Generating options that differ only cosmetically (e.g., PostgreSQL vs MySQL vs MariaDB when all are relational databases with similar trade-offs).

**Mitigation:**
- Ensure options represent different architectural paradigms
- Consider different trade-off optimizations (performance vs cost, consistency vs availability)
- Include at least one radically different approach as a forcing function

### Pitfall 2: Confirmation Bias in Scoring

**Problem:** Scoring skewed toward pre-selected "favorite" option.

**Mitigation:**
- Score all options before looking at totals
- Have multiple people score independently, then reconcile
- Document specific rationale for each score (forces objectivity)
- Review scoring with stakeholders who have different perspectives

### Pitfall 3: Ignoring Context

**Problem:** Selecting highest-scoring option without considering factors not captured in criteria (team skills, vendor relationships, migration complexity).

**Mitigation:**
- Include "Context-Specific Factors" section in decision rationale
- Explicitly document why higher-scoring options were rejected
- Consider adding criteria for commonly-ignored factors (team expertise, vendor lock-in)

### Pitfall 4: Missing Backtracking Triggers

**Problem:** No defined conditions for re-evaluating decision, leading to sunk-cost fallacy.

**Mitigation:**
- Always define 3-7 specific, measurable triggers
- Include diverse trigger categories (performance, cost, operational, business)
- Review triggers quarterly to ensure still relevant

### Pitfall 5: Analysis Paralysis

**Problem:** Generating too many options (k>7) or over-analyzing each option.

**Mitigation:**
- Cap at k=5 options for most decisions
- Use timeboxing (e.g., 30 minutes per option evaluation)
- Remember: ToT is about deliberate planning, not perfect planning

---

## Integration with AIWG SDLC

### Elaboration Phase

**Primary use:** Architecture baseline establishment

**Activities:**
- Major technology stack decisions
- Architectural pattern selection
- Infrastructure foundation choices

**Artifacts:**
- Software Architecture Document (SAD) with ToT-generated ADRs
- Technology selection ADRs with scored alternatives

### Construction Phase

**Secondary use:** Component-level design decisions

**Activities:**
- API design approach selection
- Database schema pattern choices
- Specific library/framework selection for components

**Artifacts:**
- Component-level ADRs
- Design pattern justifications

### Transition/Production

**Tertiary use:** Re-evaluation based on backtracking triggers

**Activities:**
- Monitoring for backtracking trigger conditions
- Re-running ToT when triggers fire
- Migration planning if alternative selected

**Artifacts:**
- Trigger monitoring dashboards
- Re-evaluation ADRs (superseding original decisions)

---

## Agent Usage

### Architecture Designer Agent

The Architecture Designer agent applies ToT workflow automatically when creating ADRs.

**Invocation:**
```
"Create an ADR for [decision topic] using Tree of Thoughts evaluation"
```

**Agent will:**
1. Review NFRs to define evaluation criteria
2. Generate k=5 alternatives
3. Score each against criteria
4. Create comparison matrix
5. Recommend selection with rationale
6. Define backtracking triggers
7. Populate ADR template

**Agent reference:** @agentic/code/frameworks/sdlc-complete/agents/architecture-designer.md

### Manual Process

If not using Architecture Designer agent:

1. Copy ADR template: `@agentic/code/frameworks/sdlc-complete/templates/architecture/adr-with-tot.md`
2. Follow 5-phase process outlined above
3. Document in ADR
4. Review with stakeholders
5. Store in `.aiwg/architecture/decisions/`

---

## Validation Checklist

Before finalizing a ToT-based decision:

- [ ] Evaluation criteria derived from NFRs with documented weights
- [ ] Minimum k=3 alternatives generated (k=5 recommended)
- [ ] All alternatives scored with specific rationale
- [ ] Comparison matrix completed showing weighted scores
- [ ] Critical criteria pass/fail documented
- [ ] Selection rationale includes both quantitative and qualitative factors
- [ ] Trade-offs explicitly acknowledged
- [ ] 3-7 backtracking triggers defined with measurable conditions
- [ ] Decision documented in ADR
- [ ] Stakeholders reviewed and approved

---

## Success Metrics

Track ToT decision quality:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Alternatives generated | k≥3 per decision | Count in ADRs |
| Decisions requiring backtracking | <10% within 6 months | Track trigger fires |
| Stakeholder confidence | >80% satisfied | Post-decision survey |
| Time to decision | <2 weeks from criteria definition | Track phase timestamps |
| Decision reversal rate | <5% within 1 year | Track superseding ADRs |

---

## References

- **Primary Research:** @.aiwg/research/paper-analysis/REF-020-tree-of-thoughts.md
- **ADR Template:** @agentic/code/frameworks/sdlc-complete/templates/architecture/adr-with-tot.md
- **Architecture Designer:** @agentic/code/frameworks/sdlc-complete/agents/architecture-designer.md
- **NFR Modules:** @.aiwg/requirements/nfr-modules/
- **Software Architecture Doc:** @agentic/code/frameworks/sdlc-complete/templates/architecture/software-architecture-doc.md

---

## Appendix: Quick Reference Card

### ToT in 5 Steps

1. **Define Criteria** (30 min)
   - Review NFRs
   - Weight criteria
   - Set thresholds

2. **Generate Options** (1-2 hours)
   - Create k=3-5 alternatives
   - Ensure diversity
   - Include status quo

3. **Evaluate** (2-4 hours)
   - Score 0-10 per criterion
   - Document rationale
   - Check critical criteria

4. **Select** (30 min)
   - Build comparison matrix
   - Identify highest-scoring
   - Consider context factors
   - Document trade-offs

5. **Define Triggers** (30 min)
   - List 3-7 measurable conditions
   - Cover multiple categories
   - Review quarterly

**Total time investment:** 5-8 hours for major architectural decision

**ROI:** 18.5x improvement in planning task success (per REF-020)

---

**Document Status:** Active
**Maintained By:** Architecture Designer agent
**Review Cycle:** Quarterly or when REF-020 research updates available
**Issue:** #97
