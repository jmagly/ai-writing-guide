# Architecture Designer ToT Protocol — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

---

## Phase 1: Criteria Definition — Example

```markdown
## Evaluation Criteria

| Criterion | Weight | Description | Source NFR |
|-----------|--------|-------------|------------|
| Performance | 30% | Sub-100ms API response times | @.aiwg/requirements/nfr-modules/performance.md |
| Scalability | 25% | Handle 10x growth without redesign | @.aiwg/requirements/nfr-modules/scalability.md |
| Maintainability | 20% | Team can modify without expert | @.aiwg/requirements/nfr-modules/maintainability.md |
| Security | 15% | OWASP Top 10 mitigation | @.aiwg/requirements/nfr-modules/security.md |
| Cost | 10% | Operational costs <$5K/month | Budget constraint |

Minimum acceptable score: 65/100
Critical criteria: Security must score 8+ (pass/fail)
```

---

## Phase 2: Alternative Generation — Example

```markdown
## Options Considered

### Option 1: Microservices with REST APIs
- Service mesh (Istio) for inter-service communication
- Kubernetes orchestration
- PostgreSQL per-service databases
- Event bus for async workflows (Kafka)

### Option 2: Modular Monolith
- Single deployable with clear module boundaries
- Shared PostgreSQL with schema-per-module
- In-process event bus
- Future extraction path to microservices

### Option 3: Serverless Functions (AWS Lambda)
- API Gateway + Lambda functions
- DynamoDB for data persistence
- EventBridge for async workflows
- Fully managed, auto-scaling

### Option 4: Hybrid Microservices + Monolith
- Core domain as microservices (high-change areas)
- Stable features as modular monolith
- Shared API gateway
- Mixed persistence (PostgreSQL + DynamoDB)

### Option 5: Service-Oriented Architecture (SOA)
- Coarse-grained services (larger than microservices)
- ESB for orchestration
- Centralized PostgreSQL with replication
- Strong versioning and contracts
```

---

## Phase 3: Systematic Evaluation — Example

```markdown
### Option [N]: [Name]

#### Evaluation

| Criterion | Score (0-10) | Rationale |
|-----------|--------------|-----------|
| Performance | 7 | Good latency with caching. Network hops add 10-20ms. Service mesh overhead 5ms. |
| Scalability | 9 | Kubernetes auto-scaling, horizontal pod scaling. Well-proven at scale. |
| Maintainability | 6 | High operational complexity. Requires DevOps expertise. Distributed debugging difficult. |
| Security | 8 | Service mesh provides mTLS. RBAC at service level. Attack surface larger than monolith. |
| Cost | 5 | High infrastructure costs. Kubernetes cluster overhead. Multiple databases expensive. |

**Weighted Score:** (7×0.30) + (9×0.25) + (6×0.20) + (8×0.15) + (5×0.10) = 7.05 × 10 = 70.5/100

**Critical Criteria Check:**
- [x] Security (8/10) → PASS (threshold: 8+)

#### Pros
- Independent scaling of services
- Technology diversity possible
- Team autonomy (service ownership)
- Fault isolation between services

#### Cons
- High operational complexity
- Distributed system challenges (debugging, monitoring)
- Network latency between services
- Higher infrastructure costs

#### Risks
- **Risk:** Team lacks microservices expertise
  **Mitigation:** Training program, hire experienced SRE, start with 2-3 services only
- **Risk:** Over-engineering for current scale (100 users)
  **Mitigation:** Begin with modular monolith, extract services later when needed
```

---

## Phase 4: Comparison and Selection — Example

```markdown
## Options Comparison Matrix

| Option | Perf | Scale | Maint | Sec | Cost | **Total** | Critical Pass? |
|--------|------|-------|-------|-----|------|-----------|----------------|
| 1. Microservices REST | 7 (2.1) | 9 (2.25) | 6 (1.2) | 8 (1.2) | 5 (0.5) | **70.5** | Yes |
| 2. Modular Monolith | 8 (2.4) | 6 (1.5) | 8 (1.6) | 8 (1.2) | 8 (0.8) | **75.0** | Yes |
| 3. Serverless Lambda | 9 (2.7) | 10 (2.5) | 7 (1.4) | 8 (1.2) | 7 (0.7) | **85.0** | Yes |
| 4. Hybrid Micro+Mono | 8 (2.4) | 8 (2.0) | 5 (1.0) | 8 (1.2) | 6 (0.6) | **72.0** | Yes |
| 5. SOA with ESB | 7 (2.1) | 7 (1.75) | 6 (1.2) | 7 (1.05) | 6 (0.6) | **67.5** | Fail (Sec<8) |

*Numbers in parentheses show weighted contribution (score × weight)*
```

Selection process walk-through:

1. **Eliminate failures:**
   - Remove options failing critical criteria (Option 5: Security 7 < 8 required)
   - Remove options below minimum threshold (all remaining pass 65/100)

2. **Identify quantitative winner:**
   - Highest total: Option 3 Serverless (85.0)
   - Second: Option 2 Modular Monolith (75.0)

3. **Apply context factors:**
   - **Team expertise:** Strong in traditional web apps, zero serverless experience
   - **Current architecture:** Monolithic PHP app, migration complexity matters
   - **Timeline:** 6-month deadline, learning curve a risk
   - **Vendor lock-in:** Leadership prefers cloud-agnostic where possible
   - **Scale reality:** 1K users today, 10K projected in 2 years (not hyperscale)

4. **Make selection:**
   - **Selected:** Option 2 Modular Monolith (75.0)
   - **Why not Option 3 (85.0)?** Despite higher score:
     - Team skill gap too large (risk)
     - AWS lock-in conflicts with strategy (business)
     - Premature optimization for current scale (context)
     - 10-point difference acceptable given risk reduction

```markdown
## Decision

**Selected Option:** Option 2 - Modular Monolith

**Quantitative Rationale:**
- Scored 75.0/100 (above 65.0 threshold)
- Ranked 2nd among viable options
- Passed critical security criterion (8/10)

**Qualitative Rationale:**

While Option 3 (Serverless) scored higher (85.0), we selected Option 2 due to:

1. **Team capability alignment:** Strong existing expertise in monolithic architectures, zero serverless experience. Learning curve poses schedule risk.
2. **Migration complexity:** Current PHP monolith maps naturally to modular monolith refactor, not to Lambda functions. Reduces migration risk.
3. **Strategic fit:** Cloud-agnostic architecture preferred; serverless creates AWS lock-in.
4. **Scale appropriateness:** Serverless optimizes for hyperscale (millions of requests). We project 10K users in 2 years. Modular monolith handles this easily.
5. **Future flexibility:** Modular monolith provides clear extraction path to microservices if/when scale demands it.

**Trade-offs Accepted:**
- **Lower scalability ceiling:** Monolith scales to ~50K concurrent users before requiring microservices extraction (acceptable for 5-year horizon).
- **Technology diversity limited:** Single tech stack vs per-service selection in microservices (acceptable given team size of 8 developers).
```

---

## Phase 5: Backtracking Triggers — Example

```markdown
## Backtracking Triggers

Re-evaluate this decision if:

1. **Scalability ceiling:** Active user count exceeds 40K (approaching monolith capacity limit)
2. **Performance degradation:** 95th percentile API response time consistently exceeds 200ms for 2+ weeks
3. **Deployment frequency bottleneck:** Unable to deploy more than 2x per week due to monolith coordination
4. **Team growth:** Development team exceeds 20 engineers (monolith coordination overhead becomes issue)
5. **Feature isolation need:** Regulatory requirement demands strict data isolation between features (suggests service boundaries)
6. **Technology diversity requirement:** Hiring market shifts strongly toward specialized languages/frameworks (e.g., Go for performance-critical components)
7. **Operational cost spike:** Infrastructure costs exceed $15K/month (3x current projection, suggests inefficiency)

**Backtracking Action:** When trigger occurs, re-run ToT evaluation with updated context, constraints, and scale requirements.
```

---

## Alternative Generation Diversity — Bad vs Good

### Bad Example (Insufficient Diversity)

```markdown
Options:
1. PostgreSQL with pgBouncer pooling
2. PostgreSQL with PgPool-II pooling
3. PostgreSQL with Odyssey pooling
```

**Problem:** All options are PostgreSQL with different connection poolers. No architectural diversity. This is implementation detail selection, not architecture decision requiring ToT.

### Good Example (Sufficient Diversity)

```markdown
Options:
1. PostgreSQL with read replicas (RDBMS, ACID, vertical scale primary)
2. MongoDB sharded cluster (NoSQL, flexible schema, horizontal scale)
3. DynamoDB with DAX (Managed NoSQL, serverless, AWS-native)
4. Hybrid: PostgreSQL transactional + Redis cache + S3 objects
5. CockroachDB (NewSQL, distributed SQL, cloud-native)
```

**Why good:** Represents different paradigms (RDBMS vs NoSQL vs NewSQL), deployment models (self-hosted vs managed), and trade-offs (consistency vs availability, cost vs flexibility).

---

## Evaluation Scoring Rationale — Bad vs Good

### Bad Example (Insufficient Rationale)

```markdown
| Performance | 8 | Good performance |
```

**Problem:** Circular reasoning. No specifics. Not auditable.

### Good Example (Sufficient Rationale)

```markdown
| Performance | 8 | Achieves <100ms p95 latency for read queries via materialized views. Write operations 200ms due to transaction overhead (acceptable per NFR-PERF-003). Degrades under 10K concurrent writes (mitigation: write sharding). |
```

**Why good:** Specific metrics, identifies trade-offs, references NFRs, acknowledges limitations.

---

## Context Factor Documentation — Template

```markdown
**Qualitative Rationale:**

While Option X scored highest (YY.Y), we selected Option Z due to:

1. **[Context factor category]:** [Specific situation]
2. **[Context factor category]:** [Specific situation]
3. **[Context factor category]:** [Specific situation]

The score difference ([X.X] points) is acceptable given these risk reductions.
```

---

## Backtracking Trigger Measurability — Bad vs Good

### Bad Example (Unmeasurable)

```markdown
Backtracking triggers:
- If performance becomes a problem
- If the team struggles with the technology
- If costs get too high
```

**Problem:** Subjective, no thresholds, not actionable.

### Good Example (Measurable)

```markdown
Backtracking triggers:
1. **Performance:** P95 response time exceeds 500ms for 7+ consecutive days
2. **Team capability:** >3 senior developers leave within 6 months AND replacements not hired within 60 days
3. **Cost:** Monthly infrastructure cost exceeds $20K (2x projection) for 3+ consecutive months
```

**Why good:** Specific metrics, clear thresholds, time windows, unambiguous detection.

---

## Full ADR Worked Examples

### Example 1: Database Selection ADR

**Context:** Selecting primary database for new e-commerce platform

**Criteria:**
- Performance (30%): Sub-100ms query latency
- Scalability (25%): Handle 50K concurrent users
- Maintainability (20%): Team familiar with technology
- Security (15%): ACID compliance, encryption at rest
- Cost (10%): <$5K/month operational cost

**Options Generated (k=5):**
1. PostgreSQL with read replicas
2. MongoDB sharded cluster
3. Amazon DynamoDB with DAX
4. MySQL with ProxySQL
5. CockroachDB distributed SQL

**Evaluation:** [Full scoring matrix with rationale]

**Selection:** PostgreSQL (scored 78.0, ranked 2nd) chosen over DynamoDB (scored 82.0, ranked 1st) due to team expertise and cloud-agnostic strategy.

**Backtracking Triggers:**
- User count exceeds 40K
- Query latency exceeds 200ms p95
- Sharding becomes necessary (complexity threshold)

### Example 2: API Design Pattern ADR

**Context:** Choosing API style for mobile app backend

**Criteria:**
- Developer Experience (35%): Mobile team ease of use
- Performance (25%): Minimize over-fetching
- Flexibility (20%): Support evolving UI requirements
- Maturity (15%): Ecosystem, tools, best practices
- Learning Curve (5%): Time to team proficiency

**Options Generated (k=4):**
1. REST with JSON:API specification
2. GraphQL with Apollo
3. gRPC with Protocol Buffers
4. REST with custom JSON + WebSocket for real-time

**Evaluation:** [Full scoring matrix]

**Selection:** GraphQL (scored 81.0, ranked 1st) aligns with criteria and team preferences.

**Backtracking Triggers:**
- Query complexity causes N+1 performance issues
- Caching strategy proves inadequate
- Mobile team rejects GraphQL after 3-month trial

---

## Agent Interaction Patterns — Worked Dialogs

### User Requests ToT Evaluation

**User:** "Create an ADR for database selection using Tree of Thoughts"

**Agent Response:**
1. Acknowledge ToT request
2. Read NFR modules to establish criteria
3. Present criteria with weights for user confirmation
4. Generate k=5 database alternatives
5. Evaluate each option with scoring
6. Build comparison matrix
7. Recommend selection with rationale
8. Define backtracking triggers
9. Populate ADR template
10. Save to `.aiwg/architecture/decisions/ADR-XXX-database-selection.md`

### User Requests Simple Justification

**User:** "Document why we chose PostgreSQL"

**Agent Response:**
1. Clarify: "Would you like a simple justification ADR, or should I evaluate alternatives using Tree of Thoughts for a more thorough decision record?"
2. If user confirms simple: Create basic ADR without full ToT process
3. If user wants thorough: Proceed with ToT workflow

### User Needs Quick Decision

**User:** "We need to choose a logging framework today - we're blocked"

**Agent Response:**
1. Acknowledge urgency
2. Offer expedited ToT: k=3 options instead of k=5, simplified evaluation
3. Present comparison matrix within 30 minutes
4. Note in ADR that this was time-constrained ToT (may revisit later)
