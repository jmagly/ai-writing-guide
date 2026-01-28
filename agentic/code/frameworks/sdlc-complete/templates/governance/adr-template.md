# Architecture Decision Record (ADR)

## Metadata

- **ADR ID**: ADR-XXX
- **Status**: Proposed | Accepted | Rejected | Superseded by ADR-XXX
- **Date**: YYYY-MM-DD
- **Author(s)**: [Names or roles]
- **Reviewers**: [Architecture Review Board, Tech Lead, etc.]

## Phase 1: Core Decision (ESSENTIAL)

Complete these fields immediately when proposing an architectural decision:

### Title

[Short phrase describing the decision in active voice]

<!-- EXAMPLE: Use PostgreSQL as Primary Database for User Data -->
<!-- ANTI-PATTERN: "Database Selection" (too vague, passive voice) -->

### Status

**Current Status**: [Proposed | Accepted | Rejected | Superseded by ADR-XXX]

<!-- EXAMPLE: Accepted (2026-01-15) -->

**Decision Date**: [When this decision was made]

<!-- EXAMPLE: 2026-01-15 -->

**Supersedes**: [ADR-XXX if this replaces an earlier decision]

<!-- EXAMPLE: Supersedes ADR-012 (MongoDB decision from 2024-03-01) -->

### Context

**Problem**: [What architectural challenge requires a decision?]

<!-- EXAMPLE: The system needs to store structured user data including profiles, preferences, authentication credentials, and relationships between users. Current spreadsheet-based storage cannot scale beyond 1000 users and lacks ACID guarantees needed for financial transactions. -->

**Constraints**: [What limits our options?]

<!-- EXAMPLE:
- Budget: $500/month maximum for database infrastructure
- Team expertise: Strong SQL skills, limited NoSQL experience
- Compliance: Must support GDPR data deletion requests
- Scale: Expected 50K users in first year, 500K within 3 years
- Performance: <100ms query response time for user profile lookups
-->

**Stakeholders**: [Who cares about this decision and why?]

<!-- EXAMPLE:
- Development Team: Daily interaction with database
- Security Team: Data protection and access controls
- Finance Team: Cost management and budget adherence
- Operations Team: Maintenance and monitoring burden
-->

## Phase 2: Decision & Alternatives (EXPAND WHEN READY)

<details>
<summary>Click to expand decision rationale and alternatives considered</summary>

### Decision

**What we are deciding to do:**

[Clear statement of the chosen approach]

<!-- EXAMPLE:
We will use PostgreSQL 16+ as the primary database for all structured user data, hosted on AWS RDS with multi-AZ deployment for high availability.

Specific implementation:
- PostgreSQL 16.1 or later
- AWS RDS managed service (db.t4g.medium instances)
- Multi-AZ configuration for HA
- Automated daily backups with 30-day retention
- Connection pooling via PgBouncer
- Primary access via TypeORM or Prisma ORM
-->

**Why this decision:**

[Rationale connecting decision to context]

<!-- EXAMPLE:
PostgreSQL was chosen because:
1. Strong SQL support matches team expertise (3/4 developers have PostgreSQL experience)
2. ACID compliance meets financial transaction requirements
3. JSON/JSONB support provides flexibility for evolving schemas
4. Mature ecosystem with extensive tooling (monitoring, backup, migration tools)
5. Cost-effective at expected scale ($200-400/month for 500K users)
6. Excellent support for relational data modeling (user relationships, permissions)
7. Battle-tested at similar scale by companies in our industry
-->

### Alternatives Considered

List all viable alternatives and why they were not chosen:

#### Alternative 1: [Name]

**Description**: [Brief overview of this option]

<!-- EXAMPLE:
#### Alternative 1: MongoDB (NoSQL Document Store)

**Description**: Use MongoDB Atlas as primary database, storing user data as JSON documents with flexible schemas.
-->

**Pros**:
- [Advantage 1]
- [Advantage 2]

<!-- EXAMPLE:
**Pros**:
- Flexible schema evolution without migrations
- Horizontal scaling easier for very large datasets
- Strong developer experience with Node.js ecosystem
-->

**Cons**:
- [Disadvantage 1]
- [Disadvantage 2]

<!-- EXAMPLE:
**Cons**:
- Team has limited MongoDB experience (training required)
- No ACID transactions across collections (critical for our use case)
- More expensive at our expected scale ($600-800/month)
- Requires more complex application logic for relationship management
-->

**Why Not Chosen**: [Specific reason this was rejected]

<!-- EXAMPLE:
**Why Not Chosen**: Lack of multi-document ACID transactions is a dealbreaker for financial operations. Team would require 2-3 months training to reach productivity. Cost 50% higher than PostgreSQL alternative.
-->

#### Alternative 2: [Name]

<!-- EXAMPLE:
#### Alternative 2: MySQL 8.0

**Description**: Use MySQL 8.0 on AWS RDS as primary database.

**Pros**:
- Mature, well-documented, widely adopted
- Similar cost profile to PostgreSQL
- Good performance for read-heavy workloads

**Cons**:
- JSON support less mature than PostgreSQL
- Fewer advanced features (window functions, CTEs less capable)
- Licensing concerns (Oracle ownership)

**Why Not Chosen**: PostgreSQL offers better JSON support and more advanced SQL features that will benefit future development. No significant advantage over PostgreSQL for our use case.
-->

#### Alternative 3: [Name]

<!-- EXAMPLE:
#### Alternative 3: Serverless (Aurora Serverless, PlanetScale)

**Description**: Use serverless database with auto-scaling capabilities.

**Pros**:
- Automatic scaling based on load
- Pay only for actual usage
- Zero administration overhead

**Cons**:
- Cold start latency unacceptable for interactive application
- More expensive at steady-state load
- Less operational control for optimization

**Why Not Chosen**: Cold start latency (up to 30 seconds) conflicts with <100ms response time requirement. Cost modeling shows 2-3x higher expense at expected steady load.
-->

</details>

## Phase 3: Impact & Implementation (ADVANCED)

<details>
<summary>Click to expand consequences, risks, and implementation details</summary>

### Consequences

#### Positive Outcomes

What benefits does this decision bring?

<!-- EXAMPLE:
- Team productivity high due to existing PostgreSQL expertise
- ACID guarantees eliminate entire class of data consistency bugs
- Strong JSON support enables flexible user preferences without schema changes
- Mature tooling ecosystem reduces operational burden
- Battle-tested at scale by similar companies (Reddit, Instagram, Notion)
-->

- [Positive consequence 1]
- [Positive consequence 2]

#### Negative Outcomes

What trade-offs or costs does this decision impose?

<!-- EXAMPLE:
- Horizontal scaling more complex than with NoSQL (requires sharding strategy)
- Write-heavy workloads may require optimization (connection pooling, caching)
- RDS vendor lock-in makes provider migration costly
- Schema migrations require careful planning and downtime coordination
-->

- [Negative consequence 1]
- [Negative consequence 2]

#### Operational Impacts

How does this affect day-to-day operations?

<!-- EXAMPLE:
- DevOps team needs to monitor RDS metrics (connections, IOPS, replication lag)
- Backup/restore procedures must be documented and tested quarterly
- Schema migration workflow must be added to CI/CD pipeline
- On-call engineers require PostgreSQL troubleshooting training
-->

- [Operational impact 1]
- [Operational impact 2]

### Risks

**Technical Risks**:

<!-- EXAMPLE:
- Risk: PostgreSQL connection pool exhaustion under load
- Probability: Medium
- Impact: High (application downtime)
- Mitigation: Implement PgBouncer connection pooling, monitor connection usage, set up alerts at 80% threshold
-->

- [Technical risk 1]
- [Technical risk 2]

**Business Risks**:

<!-- EXAMPLE:
- Risk: AWS RDS pricing increases significantly
- Probability: Low
- Impact: Medium (budget overrun)
- Mitigation: Monitor cost trends, evaluate multi-cloud strategy if pricing exceeds $500/month
-->

- [Business risk 1]
- [Business risk 2]

**Security Risks**:

<!-- EXAMPLE:
- Risk: Misconfigured security groups expose database publicly
- Probability: Low
- Impact: Critical (data breach)
- Mitigation: Infrastructure-as-code with peer review, automated security scanning, quarterly audits
-->

- [Security risk 1]
- [Security risk 2]

### Implementation Notes

**Migration Path**:

<!-- EXAMPLE:
1. Provision PostgreSQL RDS instance in dev environment (Week 1)
2. Define initial schema and migration strategy (Week 1-2)
3. Implement data access layer with ORM (Week 2-3)
4. Migrate existing data from spreadsheets (Week 3)
5. Deploy to staging and run load tests (Week 4)
6. Production cutover with blue-green deployment (Week 5)
-->

**Timeline**:

<!-- EXAMPLE:
- Decision date: 2026-01-15
- Implementation start: 2026-01-20
- Staging deployment: 2026-02-10
- Production cutover: 2026-02-17
- Retrospective: 2026-03-01
-->

**Dependencies**:

<!-- EXAMPLE:
- AWS account with RDS provisioning permissions
- ORM library selection (TypeORM vs Prisma) - ADR-XXX
- Monitoring integration (CloudWatch vs Datadog) - pending
- Backup strategy approval from Security team
-->

**Success Criteria**:

<!-- EXAMPLE:
- All user data successfully migrated from spreadsheets
- Query response time <100ms at p95
- Zero data loss or corruption during migration
- Team velocity unaffected 2 weeks post-migration
- Incident count stable or decreased vs. previous solution
-->

### Related Decisions

**Upstream Decisions** (decisions that led to this one):

<!-- EXAMPLE:
- ADR-005: Monolithic architecture vs. microservices
- ADR-008: AWS as primary cloud provider
-->

**Downstream Decisions** (decisions that depend on this one):

<!-- EXAMPLE:
- ADR-XXX: ORM selection (pending)
- ADR-XXX: Caching strategy (pending)
- ADR-XXX: Backup and disaster recovery (pending)
-->

**Related Decisions** (decisions in same problem space):

<!-- EXAMPLE:
- ADR-015: Redis for session storage
- ADR-018: S3 for file uploads
-->

</details>

## References

Wire @-mentions for traceability:

- @.aiwg/requirements/use-cases/UC-XXX.md - Driving requirement
- @.aiwg/architecture/software-architecture-doc.md - Architecture context
- @src/path/to/implementation.ts - Implementation (when applicable)
- @.aiwg/requirements/nfr-modules/performance.md - Performance requirements
- @.aiwg/requirements/nfr-modules/security.md - Security requirements

**External References**:

<!-- EXAMPLE:
- PostgreSQL Documentation: https://www.postgresql.org/docs/16/
- AWS RDS Best Practices: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html
- Comparison Study: "PostgreSQL vs MySQL Performance Benchmarks" (internal wiki)
-->

## Review & Approval

**Review Process**:

<!-- EXAMPLE:
- Draft circulated to architecture review board (2026-01-10)
- Feedback period (2026-01-10 to 2026-01-14)
- Architecture review meeting (2026-01-15)
- Decision approved with unanimous consent
-->

**Reviewers**:

<!-- EXAMPLE:
- [ ] Tech Lead (Jane Smith) - Approved 2026-01-15
- [ ] Security Lead (Bob Jones) - Approved with conditions 2026-01-15
- [ ] DevOps Lead (Alice Chen) - Approved 2026-01-15
- [ ] CTO (Sam Wilson) - Approved 2026-01-15
-->

**Approval Conditions** (if any):

<!-- EXAMPLE:
- Security team requires quarterly penetration testing (agreed)
- DevOps requires disaster recovery drill within 60 days (agreed)
-->

## Agent Notes

- ADRs document **decisions**, not requirements or design details
- Focus on **why** this decision was made, not just **what** was decided
- Include enough context that future readers understand the forces at play
- Document alternatives considered to prevent re-litigating settled decisions
- Update status to "Superseded by ADR-XXX" if decision is later reversed
- Progressive disclosure: Focus on Phase 1 during initial proposal, expand Phases 2-3 before approval

## Related Templates

- @agentic/code/frameworks/sdlc-complete/templates/analysis-design/software-architecture-doc-template.md - Overall architecture
- @agentic/code/frameworks/sdlc-complete/templates/governance/decision-matrix-template.md - Multi-criteria decision analysis
- @agentic/code/frameworks/sdlc-complete/templates/management/risk-card.md - Risk tracking
