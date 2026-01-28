# Tree-of-Thought for Architecture Decisions - Practical Guide

**Research Basis**: REF-020 Tree of Thoughts (Yao et al., NeurIPS 2023)
**Performance**: 18.5x improvement on planning tasks (4% → 74% success rate)
**Pattern**: Generate k alternatives → Evaluate → Select best b → Backtrack on failure

## Overview

This guide provides practical instructions for applying Tree-of-Thought (ToT) deliberate planning to architectural decision-making. ToT enables systematic exploration of alternatives with explicit evaluation and backtracking, dramatically improving decision quality over linear reasoning.

## When to Use ToT vs Linear Reasoning

### Decision Criteria

| Factor | Use Linear Reasoning | Use ToT Pattern |
|--------|---------------------|-----------------|
| **Decision Impact** | Low impact, local change | High impact, affects multiple systems |
| **Reversibility** | Easily reversed | Difficult or impossible to reverse |
| **Uncertainty** | Clear best choice | Multiple viable alternatives |
| **Complexity** | Simple, well-understood | Complex with trade-offs |
| **Stakeholders** | Single person/team | Multiple teams or organizations |
| **Cost of Error** | Low (can iterate) | High (significant rework) |

### Use ToT For

- **Architecture Selection**: Monolith vs microservices, REST vs GraphQL, SQL vs NoSQL
- **Security Decisions**: Authentication strategy, encryption approach, access control model
- **Deployment Strategy**: Cloud provider, container orchestration, deployment pattern
- **Integration Patterns**: Sync vs async, event-driven vs request-response
- **Data Modeling**: Schema design, normalization strategy, caching approach

### Use Linear Reasoning For

- **Tactical Decisions**: Naming conventions, file organization, code style
- **Well-Established Patterns**: Standard CRUD operations, common UI patterns
- **Constrained Choices**: When requirements clearly point to one option
- **Low-Risk Changes**: Documentation updates, minor refactoring
- **Personal Preference**: Editor choice, local development setup

## ToT Process for Architecture Decisions

### Step-by-Step Workflow

```
1. DEFINE DECISION
   ├─ State decision clearly
   ├─ Identify evaluation criteria (NFRs, constraints)
   └─ Set complexity level (determines k and b)

2. GENERATE ALTERNATIVES (k options)
   ├─ Brainstorm diverse options
   ├─ Use thought types: Goal → Reasoning
   └─ Aim for k=3-10 depending on complexity

3. EVALUATE EACH ALTERNATIVE
   ├─ Score against each criterion
   ├─ Use thought types: Extraction → Reasoning → Synthesis
   ├─ Document strengths and weaknesses
   └─ Calculate weighted overall score

4. PRUNE LOW-SCORING OPTIONS
   ├─ Keep top b alternatives (beam search)
   ├─ Use thought type: Exception for pruned options
   └─ Document prune rationale

5. DETAILED ANALYSIS (Lookahead)
   ├─ Deep dive into top b options
   ├─ Consider implementation details
   ├─ Identify risks and mitigations
   └─ Project success probability

6. SELECT BEST ALTERNATIVE
   ├─ Choose highest-scoring option
   ├─ Use thought type: Synthesis
   └─ Document decision rationale

7. VALIDATE SELECTION
   ├─ Check against all requirements
   ├─ Identify trade-offs
   └─ Plan backtrack triggers

8. DOCUMENT IN ADR
   ├─ Alternatives considered
   ├─ Evaluation criteria and scores
   ├─ Selected option and rationale
   └─ Trade-offs and mitigation plans

9. BACKTRACK IF NEEDED
   ├─ Monitor implementation
   ├─ Return to Step 4 or 5 if issues arise
   └─ Update ADR with pivot reasoning
```

### Integration with Six Thought Types

ToT leverages the thought protocol from `@.claude/rules/thought-protocol.md`:

| ToT Phase | Primary Thought Types | Example |
|-----------|----------------------|---------|
| Define Decision | **Goal** | "Goal: Select authentication strategy for multi-tenant SaaS" |
| Generate Alternatives | **Reasoning** | "Reasoning: We should consider JWT, sessions, and OAuth2 because..." |
| Evaluate | **Extraction**, **Reasoning** | "Extraction: From NFRs, security is weighted 30%"<br>"Reasoning: JWT scores 8/10 on security because..." |
| Prune | **Exception** | "Exception: OAuth2 adds unnecessary complexity for our use case" |
| Lookahead | **Reasoning** | "Reasoning: If we choose sessions, we'll need Redis for scaling..." |
| Select | **Synthesis** | "Synthesis: Combining all scores, JWT is optimal at 8.2/10" |
| Validate | **Exception** | "Exception: Wait, JWT requires key rotation strategy..." |
| Document | **Progress** | "Progress: ADR-005 created documenting JWT selection" |

## Worked Example 1: REST vs GraphQL API Selection

**Scenario**: E-commerce platform needs API for mobile and web clients

### Step 1: Define Decision

**Decision**: Choose API architecture for product catalog and ordering system

**Evaluation Criteria**:
- Performance (30%): Response time, throughput
- Developer Experience (25%): Tooling, ease of development
- Flexibility (20%): Ability to evolve
- Client Support (15%): Mobile/web integration
- Ecosystem Maturity (10%): Libraries, community

**Complexity**: Moderate → k=5, b=3

**Thought - Goal**:
> Goal: Select API architecture that optimizes for mobile performance while maintaining good developer experience for our team of 8 engineers.

### Step 2: Generate Alternatives (k=5)

**Thought - Reasoning**:
> Reasoning: We should explore both traditional and modern API patterns because mobile clients need efficiency, but team familiarity also matters.

#### Alternative 1: REST API with OpenAPI

**Description**: Traditional REST architecture with resource-based endpoints, HTTP verbs, JSON responses, OpenAPI specification for documentation.

**Key Characteristics**:
- GET /products, POST /orders pattern
- Standard HTTP methods and status codes
- Swagger UI for API exploration
- JSON:API or HAL for hypermedia

#### Alternative 2: GraphQL with Apollo

**Description**: GraphQL API with single endpoint, client-specified queries, strongly-typed schema, Apollo Server and Client.

**Key Characteristics**:
- Single /graphql endpoint
- Clients request exact data needed
- Real-time subscriptions for inventory
- Type-safe with code generation

#### Alternative 3: gRPC with Protocol Buffers

**Description**: High-performance binary protocol using HTTP/2, strongly-typed with Protocol Buffers.

**Key Characteristics**:
- Binary serialization
- HTTP/2 multiplexing and streaming
- Strong typing with .proto files
- Excellent performance

#### Alternative 4: REST + GraphQL Hybrid

**Description**: REST for simple CRUD, GraphQL for complex queries.

**Key Characteristics**:
- REST for products, orders (simple operations)
- GraphQL for search, recommendations (complex)
- Gradual migration path
- Flexibility in approach selection

#### Alternative 5: JSON-RPC

**Description**: Simple RPC-style API with JSON payloads.

**Key Characteristics**:
- Method-oriented vs resource-oriented
- Simpler than REST for complex operations
- Less conventional than REST or GraphQL

### Step 3: Evaluate Each Alternative

**Thought - Extraction**:
> Extraction: From requirements, we need: mobile efficiency (mentioned 3 times), real-time updates (critical NFR), and team has Node.js expertise.

#### REST API Scores

| Criterion | Score | Reasoning |
|-----------|-------|-----------|
| Performance | 7/10 | Good, but over-fetching wastes mobile bandwidth |
| Developer Experience | 8/10 | Familiar pattern, excellent tooling |
| Flexibility | 6/10 | Versioning required for breaking changes |
| Client Support | 8/10 | Universal support, simple integration |
| Ecosystem Maturity | 9/10 | Massive ecosystem, well-understood |

**Overall**: 7.2/10

**Strengths**:
- Team already knows REST well
- Massive library ecosystem
- Simple mental model

**Weaknesses**:
- Over-fetching wastes mobile data
- Multiple round trips for related data
- No built-in real-time

**Thought - Reasoning**:
> Reasoning: REST scores well on maturity and developer experience, but the over-fetching problem is significant for mobile clients where bandwidth efficiency matters.

#### GraphQL Scores

| Criterion | Score | Reasoning |
|-----------|-------|-----------|
| Performance | 8/10 | Efficient data fetching, single round trip |
| Developer Experience | 9/10 | Excellent tooling, type safety |
| Flexibility | 9/10 | Add fields without versioning |
| Client Support | 7/10 | Good but requires Apollo Client |
| Ecosystem Maturity | 8/10 | Mature, but smaller than REST |

**Overall**: 8.1/10

**Strengths**:
- Eliminates over/under-fetching
- Built-in real-time (subscriptions)
- Strong typing improves quality

**Weaknesses**:
- Learning curve (~2-3 weeks)
- Caching more complex
- Query complexity needs limits

**Thought - Reasoning**:
> Reasoning: GraphQL's 8.1 score reflects strong performance in our top priorities (performance 8/10, flexibility 9/10), despite the learning curve trade-off.

#### gRPC Scores

| Criterion | Score | Reasoning |
|-----------|-------|-----------|
| Performance | 9/10 | Binary protocol, excellent performance |
| Developer Experience | 6/10 | Tooling less mature than REST/GraphQL |
| Flexibility | 7/10 | Schema changes require coordination |
| Client Support | 5/10 | Poor browser support without proxy |
| Ecosystem Maturity | 7/10 | Growing but smaller community |

**Overall**: 6.8/10

**Thought - Exception**:
> Exception: Wait, gRPC's browser support issue is a blocker. We need web client support, and requiring a proxy adds complexity.

#### Hybrid REST + GraphQL Scores

| Criterion | Score | Reasoning |
|-----------|-------|-----------|
| Performance | 7/10 | Good for appropriate use cases |
| Developer Experience | 6/10 | Maintaining two APIs is overhead |
| Flexibility | 8/10 | Can choose best tool per endpoint |
| Client Support | 8/10 | Both widely supported |
| Ecosystem Maturity | 8/10 | Leverage both ecosystems |

**Overall**: 7.3/10

**Thought - Reasoning**:
> Reasoning: Hybrid approach has merit but introduces operational complexity of maintaining two different API paradigms. The flexibility benefit doesn't outweigh the operational cost.

#### JSON-RPC Scores

| Criterion | Score | Reasoning |
|-----------|-------|-----------|
| Performance | 7/10 | Comparable to REST |
| Developer Experience | 5/10 | Less tooling than REST/GraphQL |
| Flexibility | 6/10 | Similar to REST |
| Client Support | 6/10 | Less common than REST |
| Ecosystem Maturity | 5/10 | Much smaller ecosystem |

**Overall**: 5.8/10

**Thought - Exception**:
> Exception: JSON-RPC doesn't offer advantages over REST for our use case and has worse ecosystem support.

### Step 4: Prune Low-Scoring Options

**Keep (b=3)**: GraphQL (8.1), Hybrid (7.3), REST (7.2)

**Prune**: gRPC (6.8 - browser support issue), JSON-RPC (5.8 - no advantages)

**Thought - Exception**:
> Exception: Pruning gRPC despite good performance because browser support is a hard requirement, not a nice-to-have.

### Step 5: Detailed Analysis (Lookahead)

#### GraphQL - Deep Dive

**Implementation Path**:
1. Week 1-2: Team training on GraphQL and Apollo
2. Week 3: Schema design for products and orders
3. Week 4: Server implementation with Apollo Server
4. Week 5: Client integration with Apollo Client
5. Week 6: Testing and performance optimization

**Risks & Mitigations**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| Learning curve delays delivery | Medium | 2-week training budget, pair programming |
| N+1 query problem | High | DataLoader for batching, monitoring |
| Query complexity attacks | High | Max depth limits, query cost analysis |
| Caching complexity | Medium | Apollo cache normalization, clear docs |

**Projected Success**: 85%

**Thought - Reasoning**:
> Reasoning: If we invest in proper training and set up DataLoader from day one, the N+1 query risk is manageable. The 85% success projection accounts for the learning curve but reflects strong team capability.

#### Hybrid REST + GraphQL - Deep Dive

**Implementation Path**:
1. Start with REST for simple CRUD
2. Add GraphQL for complex queries (search, recommendations)
3. Maintain both long-term

**Risks & Mitigations**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| Operational complexity | High | Clear boundaries, good documentation |
| Developers must know both | Medium | Training on both paradigms |
| Unclear when to use which | Medium | Decision tree in docs |
| Double testing effort | Medium | Shared test infrastructure |

**Projected Success**: 70%

**Thought - Reasoning**:
> Reasoning: The hybrid approach introduces "decision fatigue" - every new endpoint requires choosing REST vs GraphQL. This cognitive overhead reduces projected success to 70%.

#### REST - Deep Dive

**Implementation Path**:
1. Week 1: OpenAPI schema design
2. Week 2-3: Implement endpoints with Express
3. Week 4: Client integration
4. Week 5: Optimize with caching

**Risks & Mitigations**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-fetching on mobile | High | Partial responses, field filtering |
| Multiple round trips | Medium | Include related resources option |
| No real-time support | High | Add WebSocket for inventory updates |

**Projected Success**: 75%

**Thought - Reasoning**:
> Reasoning: REST is safe and familiar (hence 75% success), but the mobile over-fetching issue requires workarounds rather than elegant solutions. The need to add WebSockets separately is technical debt.

### Step 6: Select Best Alternative

**Selected**: **GraphQL with Apollo**

**Overall Score**: 8.1/10 (highest)

**Dimension Breakdown**:
- Performance: 8/10
- Developer Experience: 9/10
- Flexibility: 9/10
- Client Support: 7/10
- Ecosystem Maturity: 8/10

**Thought - Synthesis**:
> Synthesis: Combining all evidence, GraphQL is the optimal choice. Despite the learning curve, it directly solves our mobile efficiency problem, provides excellent developer experience, and the 85% projected success is highest among viable options.

### Step 7: Validate Selection

**Requirements Check**:
- ✅ Mobile efficiency: Eliminates over-fetching
- ✅ Real-time updates: Built-in subscriptions
- ✅ Web client support: Apollo Client works universally
- ✅ Developer productivity: Strong typing, excellent tooling
- ✅ Scalability: Proven at scale (Airbnb, GitHub, Shopify)

**Trade-offs Accepted**:
1. **Learning Curve**: 2-3 weeks for team to become proficient
   - *Mitigation*: Dedicate 2 weeks to training, pair programming
2. **Caching Complexity**: Normalized cache requires understanding
   - *Mitigation*: Apollo cache documentation, clear examples
3. **Query Cost**: Complex queries can be expensive
   - *Mitigation*: Query depth limits, cost analysis, monitoring

**Backtrack Triggers**:
- If team unable to learn GraphQL in 4 weeks → Revert to REST
- If query performance issues unsolvable → Consider Hybrid approach
- If caching complexity causes major bugs → Re-evaluate REST

### Step 8: Document in ADR

**Created**: `.aiwg/architecture/adr-003-graphql-api.md`

```markdown
# ADR-003: GraphQL API with Apollo

## Status
Accepted

## Context
E-commerce platform requires API for mobile and web clients. Mobile efficiency
is critical due to bandwidth constraints. Real-time inventory updates required.

## Decision
Implement GraphQL API using Apollo Server (backend) and Apollo Client (frontend).

## Alternatives Considered

### 1. REST API with OpenAPI (Score: 7.2/10)
**Strengths**: Mature ecosystem, team familiarity, universal support
**Weaknesses**: Over-fetching wastes mobile data, no built-in real-time
**Rejection Reason**: Mobile efficiency is top priority; REST requires workarounds

### 2. gRPC with Protocol Buffers (Score: 6.8/10)
**Strengths**: Excellent performance, strong typing
**Weaknesses**: Poor browser support, requires proxy
**Rejection Reason**: Browser support is hard requirement, not negotiable

### 3. Hybrid REST + GraphQL (Score: 7.3/10)
**Strengths**: Flexibility, leverage both paradigms
**Weaknesses**: Operational complexity, decision fatigue
**Rejection Reason**: Maintaining two APIs outweighs flexibility benefit

### 4. JSON-RPC (Score: 5.8/10)
**Strengths**: Simple method-oriented approach
**Weaknesses**: Poor ecosystem, no advantages over alternatives
**Rejection Reason**: Strictly worse than REST or GraphQL for our use case

## Evaluation Criteria

| Criterion | Weight | GraphQL Score |
|-----------|--------|---------------|
| Performance | 30% | 8/10 |
| Developer Experience | 25% | 9/10 |
| Flexibility | 20% | 9/10 |
| Client Support | 15% | 7/10 |
| Ecosystem Maturity | 10% | 8/10 |
| **Overall** | | **8.1/10** |

## Consequences

### Positive
- Eliminates over-fetching/under-fetching for mobile clients
- Single request for complex queries reduces latency
- Strong typing catches errors at development time
- Built-in real-time via subscriptions
- Excellent developer tooling (GraphiQL, Apollo Studio)

### Negative
- Team requires 2-3 weeks training on GraphQL concepts
- Caching more complex than REST (normalization required)
- Query complexity must be limited to prevent abuse
- Smaller ecosystem than REST (though still mature)

### Risks & Mitigations
- **N+1 Query Problem**: Use DataLoader for batching from day one
- **Query Complexity Attacks**: Implement max depth (5), query cost analysis
- **Learning Curve**: 2-week training period, pair programming, office hours

## Implementation Plan
1. Week 1-2: Team GraphQL training
2. Week 3: Schema design (products, orders, inventory)
3. Week 4: Apollo Server implementation
4. Week 5: Apollo Client integration
5. Week 6: Testing, optimization, query cost limits

## Backtrack Triggers
- Team unable to learn GraphQL in 4 weeks → Revert to REST
- Query performance unsolvable → Consider Hybrid
- Caching complexity causes major bugs → Re-evaluate

## References
- @agentic/code/frameworks/sdlc-complete/schemas/flows/tree-of-thought.yaml - ToT workflow
- @.aiwg/requirements/nfr-modules/performance.md - Performance NFRs
- @.aiwg/requirements/use-cases/UC-012-mobile-catalog.md - Mobile use case
```

### Step 9: Backtrack Example (If Needed)

**Scenario**: After 6 weeks, query performance issues arise despite DataLoader.

**Backtrack Process**:
1. Capture failure analysis: Complex nested queries causing 2-3s response times
2. Return to pruned alternatives: REST (7.2), Hybrid (7.3)
3. Re-evaluate with new constraint: "Query performance must be <500ms even for complex nests"
4. **Select Hybrid**: Use REST for simple CRUD (fast), GraphQL only for search/recommendations
5. Update ADR-003 with:
   - Status: Superseded by ADR-008
   - Lessons learned: Nested query complexity underestimated
   - Pivot reasoning: Hybrid provides performance while keeping GraphQL benefits

**Thought - Exception**:
> Exception: The performance issue reveals our initial evaluation underestimated nested query complexity. The Hybrid approach we previously pruned is actually optimal given this new information.

## Worked Example 2: Monolith vs Microservices

**Scenario**: Growing startup needs to scale system architecture

### Step 1: Define Decision

**Decision**: Choose deployment architecture for SaaS product with 50K users, growing to 500K in 12 months

**Evaluation Criteria**:
- Scalability (30%): Handle 10x growth
- Operational Complexity (25%): Team can manage
- Development Velocity (20%): Feature delivery speed
- Cost (15%): Infrastructure and operational costs
- Team Fit (10%): Match current team of 12 engineers

**Complexity**: Critical → k=7, b=4

**Context**:
- Current: Monolithic Rails app on Heroku
- Team: 12 engineers, mostly Rails experience
- Growth: 50K → 500K users in 12 months
- Budget: $10K/month infrastructure

### Step 2: Generate Alternatives (k=7)

#### Alternative 1: Enhanced Monolith

Well-architected monolith with domain modules, improved caching, horizontal scaling via load balancer.

#### Alternative 2: Modular Monolith

Single deployable with internal module boundaries, preparation for future microservices extraction.

#### Alternative 3: Microservices (Full)

Complete microservices architecture: Auth, User, Billing, Analytics, Core Product services.

#### Alternative 4: Hybrid (Monolith + Critical Services)

Monolith for core product, extract only Auth and Billing as microservices (high security needs).

#### Alternative 5: Serverless Event-Driven

AWS Lambda functions with EventBridge, DynamoDB for data, fully serverless.

#### Alternative 6: Service-Oriented Architecture (SOA)

Fewer, larger services (3-4) instead of many microservices. Less granular than microservices.

#### Alternative 7: Microservices with Service Mesh

Full microservices plus Istio/Linkerd for observability, security, and traffic management.

### Step 3: Evaluate Each Alternative

| Alternative | Scalability | Ops Complexity | Dev Velocity | Cost | Team Fit | Overall |
|-------------|-------------|----------------|--------------|------|----------|---------|
| Enhanced Monolith | 6 | 9 | 8 | 8 | 9 | 7.7 |
| Modular Monolith | 7 | 8 | 8 | 8 | 9 | 7.9 |
| Full Microservices | 10 | 4 | 5 | 5 | 4 | 6.0 |
| Hybrid | 8 | 6 | 7 | 7 | 7 | 7.1 |
| Serverless | 10 | 6 | 5 | 7 | 4 | 6.7 |
| SOA | 8 | 7 | 7 | 7 | 6 | 7.1 |
| Micro + Mesh | 10 | 3 | 4 | 4 | 3 | 5.3 |

**Thought - Extraction**:
> Extraction: Modular Monolith scores highest (7.9), followed by Enhanced Monolith (7.7) and Hybrid + SOA (both 7.1). Full microservices performs poorly on ops complexity and team fit.

### Step 4: Prune Low-Scoring Options

**Keep (b=4)**: Modular Monolith (7.9), Enhanced Monolith (7.7), Hybrid (7.1), SOA (7.1)

**Prune**:
- Full Microservices (6.0): Too complex for team size and experience
- Serverless (6.7): Poor team fit, paradigm shift
- Micro + Mesh (5.3): Operational complexity overwhelming

**Thought - Exception**:
> Exception: Full microservices scores 10/10 on scalability but only 4/10 on team fit and ops complexity. For a 12-person team, this is a recipe for disaster despite the scalability benefits.

### Step 5: Detailed Analysis

#### Modular Monolith - Lookahead

**Implementation**:
- Month 1-2: Define module boundaries (Auth, User, Billing, Product, Analytics)
- Month 3: Enforce boundaries with architecture tests
- Month 4: Extract to internal gems/libraries
- Month 5-6: Implement monitoring per module

**Risks**:
- Module boundaries erode over time → Mitigation: Fitness functions, automated checks
- Not solving immediate scale issues → Mitigation: Also implement caching, DB optimization

**Projected Success**: 85%

**Thought - Reasoning**:
> Reasoning: Modular Monolith provides the best path forward. It maintains development velocity while preparing for future service extraction. The 85% success rate reflects this being a known pattern with manageable risks.

#### Enhanced Monolith - Lookahead

**Implementation**:
- Month 1: Implement Redis caching layer
- Month 2: Database query optimization
- Month 3: Add horizontal scaling with load balancer
- Month 4: CDN for static assets
- Month 5-6: Performance monitoring and tuning

**Risks**:
- Hits scaling limits at ~200K users → Mitigation: Plan re-architecture at 150K
- No clear migration path → Risk: May need big-bang rewrite later

**Projected Success**: 75%

**Thought - Reasoning**:
> Reasoning: Enhanced Monolith is lower risk short-term but lacks long-term vision. The 75% success accounts for eventual scaling wall with no clear migration path.

#### Hybrid - Lookahead

**Implementation**:
- Month 1-2: Extract Auth service (high security)
- Month 3-4: Extract Billing service (PCI compliance)
- Month 5-6: Service mesh for inter-service communication

**Risks**:
- Distributed system complexity appears immediately → Mitigation: Start simple, add complexity as needed
- Inter-service latency → Mitigation: Keep services in same VPC, optimize calls

**Projected Success**: 70%

**Thought - Reasoning**:
> Reasoning: Hybrid approach introduces distributed system complexity earlier than Modular Monolith, reducing success probability to 70%. The benefits (isolated security-critical services) don't outweigh the complexity cost yet.

#### SOA - Lookahead

**Implementation**:
- Month 1-3: Design 3-4 large services (Frontend, Backend, Analytics, Integration)
- Month 4-5: Implement service boundaries
- Month 6: Deploy and monitor

**Risks**:
- Service boundaries less clear than microservices → Mitigation: Domain-driven design
- May still face monolith scaling issues → Mitigation: Services can scale independently

**Projected Success**: 72%

**Thought - Reasoning**:
> Reasoning: SOA is a middle ground but doesn't provide clear advantages over Modular Monolith. The 72% success reflects uncertainty about service boundary design.

### Step 6: Select Best Alternative

**Selected**: **Modular Monolith**

**Overall Score**: 7.9/10

**Rationale**:
1. **Best for Current Scale**: Handles 50K → 500K growth
2. **Team Fit**: Team can continue working productively in Rails
3. **Low Risk**: Proven pattern, manageable complexity
4. **Future-Proof**: Clear path to extract services if needed
5. **Velocity**: Maintains fast feature delivery (8/10)

**Thought - Synthesis**:
> Synthesis: The Modular Monolith balances all priorities. It keeps the team productive (9/10 team fit) while preparing for future scale (7/10 scalability). Most importantly, it's reversible - we can extract services later if growth demands it.

### Step 7: Validate and Document

**Trade-offs**:
- Lower ultimate scalability than microservices
- Requires discipline to maintain boundaries
- May need to extract services at 300-400K users

**Backtrack Triggers**:
- Module boundaries break down despite fitness functions → Extract to services
- Growth exceeds 400K users in 6 months → Accelerate service extraction
- Operational issues due to size → Consider Hybrid approach

### ADR Created

See `.aiwg/architecture/adr-012-modular-monolith.md` (full ADR documenting decision)

## Worked Example 3: Authentication Strategy

**Scenario**: Multi-tenant SaaS needs secure authentication

### Step 1: Define Decision

**Decision**: Choose authentication strategy for B2B SaaS with 100+ tenant organizations

**Evaluation Criteria**:
- Security (35%): Resistance to attacks, compliance
- User Experience (25%): Ease of login, SSO support
- Implementation Complexity (20%): Development and maintenance effort
- Scalability (10%): Handle growth to 1000+ tenants
- Cost (10%): Infrastructure and licensing

**Complexity**: High → k=7, b=3

### Step 2: Generate Alternatives (k=7)

1. **JWT (JSON Web Tokens)**: Stateless tokens with signature verification
2. **Session-Based**: Server-side session storage (Redis)
3. **OAuth2 + JWT**: OAuth2 flow with JWT access tokens
4. **SAML SSO**: Enterprise SSO with SAML 2.0
5. **OAuth2 + SAML Hybrid**: Support both for different tenant types
6. **Passwordless (Magic Links)**: Email-based authentication
7. **Multi-Factor with Passkeys**: WebAuthn + FIDO2

### Step 3: Evaluate

| Alternative | Security | UX | Complexity | Scalability | Cost | Overall |
|-------------|----------|-----|------------|-------------|------|---------|
| JWT | 7 | 7 | 8 | 9 | 9 | 7.7 |
| Session-Based | 8 | 8 | 7 | 6 | 8 | 7.5 |
| OAuth2 + JWT | 9 | 7 | 6 | 9 | 8 | 7.9 |
| SAML SSO | 9 | 5 | 4 | 8 | 6 | 6.8 |
| OAuth2 + SAML | 10 | 8 | 3 | 9 | 6 | 7.6 |
| Passwordless | 6 | 6 | 7 | 9 | 8 | 6.9 |
| Passkeys | 10 | 7 | 5 | 9 | 7 | 7.9 |

**Thought - Extraction**:
> Extraction: OAuth2 + JWT and Passkeys both score 7.9. OAuth2 + SAML scores 7.6 despite highest security (10/10) due to complexity penalty.

### Step 4: Prune

**Keep (b=3)**: OAuth2 + JWT (7.9), Passkeys (7.9), JWT (7.7)

**Prune**: Others due to lower scores or specific weaknesses

**Thought - Exception**:
> Exception: SAML-only approach scores 6.8 despite 9/10 security because the 5/10 UX (complex for end users) and 4/10 complexity (difficult implementation) are deal-breakers.

### Step 5: Detailed Analysis

#### OAuth2 + JWT - Lookahead

**Implementation**:
- OAuth2 authorization server
- JWT access tokens (15-min expiry)
- Refresh tokens (7-day expiry)
- Support authorization code + PKCE flow

**Security Features**:
- Token rotation on refresh
- Anomaly detection on token usage
- IP-based restrictions per tenant

**Risks**:
- Token theft if HTTPS misconfigured → Mitigation: Strict HTTPS enforcement
- Refresh token compromise → Mitigation: Rotation, device fingerprinting

**Projected Success**: 88%

**Thought - Reasoning**:
> Reasoning: OAuth2 + JWT is industry standard with proven security. The 88% success rate reflects its maturity and team familiarity with OAuth2 concepts.

#### Passkeys - Lookahead

**Implementation**:
- WebAuthn API for registration and authentication
- FIDO2 server for credential storage
- Fallback to password + MFA for unsupported devices

**Security Features**:
- Phishing-resistant (public key cryptography)
- No password storage
- Device-bound credentials

**Risks**:
- Browser support incomplete (95% coverage) → Mitigation: Password fallback
- User confusion with new paradigm → Mitigation: Extensive onboarding
- Device loss → Mitigation: Recovery codes, multiple devices

**Projected Success**: 75%

**Thought - Reasoning**:
> Reasoning: Passkeys offer cutting-edge security but the 75% success rate reflects user adoption risk. Not all users will have compatible devices or understand the paradigm.

#### JWT-Only - Lookahead

**Implementation**:
- Simple JWT issuance on login
- Signature verification on requests
- Short expiry (15 min) + refresh token

**Risks**:
- No built-in OAuth2 flows → Mitigation: Custom authorization layer
- SSO requires custom implementation → Risk: May need OAuth2 later anyway

**Projected Success**: 80%

**Thought - Reasoning**:
> Reasoning: JWT-only is simpler initially but lacks OAuth2 extensibility. The 80% success rate accounts for eventual need to add OAuth2 for enterprise SSO, making this a short-term solution.

### Step 6: Select Best Alternative

**Selected**: **OAuth2 + JWT**

**Overall Score**: 7.9/10

**Rationale**:
- Highest security among finalists (9/10)
- Industry-standard pattern (reduces implementation risk)
- Extensible to SAML or other flows in future
- Strong scalability (9/10)
- Highest projected success (88%)

**Thought - Synthesis**:
> Synthesis: OAuth2 + JWT provides the best balance of security, UX, and extensibility. While Passkeys scored equally (7.9), the 88% vs 75% success rate tips the decision. OAuth2's maturity and flexibility for future SSO needs make it the safer choice.

### Step 7: Validate

**Security Validation**:
- ✅ Resistant to CSRF (state parameter)
- ✅ Resistant to token theft (short expiry, HTTPS)
- ✅ Supports MFA (can add as OAuth2 flow)
- ✅ Audit logging (OAuth2 grants tracked)

**Trade-offs**:
- More complex than JWT-only
- Requires OAuth2 authorization server
- Refresh token storage and rotation overhead

**Backtrack Triggers**:
- Enterprise customers demand SAML → Add OAuth2 + SAML Hybrid
- Token theft incidents → Consider Passkeys or certificate-based auth
- OAuth2 complexity proves overwhelming → Simplify to JWT-only

### ADR Created

`.aiwg/architecture/adr-018-oauth2-jwt-auth.md` documents full decision with:
- 7 alternatives evaluated
- Security analysis for each
- Selected OAuth2 + JWT with rationale
- Implementation roadmap
- Backtrack triggers

## Integration with Existing AIWG Patterns

### Thought Protocol Integration

ToT leverages all six thought types from `@.claude/rules/thought-protocol.md`:

```markdown
## ToT Execution with Thought Types

**Goal** 🎯
"Goal: Select authentication strategy for multi-tenant SaaS platform"

**Progress** 📊
"Progress: Generated 7 alternatives, evaluated 7, pruned to 3 finalists"

**Extraction** 🔍
"Extraction: From NFRs, security weighted 35%, highest priority dimension"

**Reasoning** 💭
"Reasoning: OAuth2 + JWT selected because 9/10 security + 88% projected success"

**Exception** ⚠️
"Exception: SAML-only approach has 9/10 security but 5/10 UX is dealbreaker"

**Synthesis** ✅
"Synthesis: Combining all scores and risk analysis, OAuth2 + JWT optimal"
```

### ADR Template Integration

ToT output maps directly to ADR sections per `@.claude/rules/reasoning-sections.md`:

| ToT Element | ADR Section |
|-------------|-------------|
| Task definition | Context |
| Generated alternatives | Alternatives Considered |
| Evaluation scores | Decision Matrix / Evaluation Criteria |
| Selected option | Decision |
| Strengths/weaknesses | Consequences (Positive/Negative) |
| Risks & mitigations | Risks & Mitigations |
| Backtrack triggers | Monitoring / Review Triggers |

### Ensemble Review Integration

ToT can trigger ensemble review at selection step:

```yaml
ensemble_review_integration:
  trigger: before_final_selection
  panel_size: 5
  reviewers:
    - architect
    - security_auditor
    - test_engineer
    - domain_expert
    - technical_lead
  review_question: "Evaluate the top 3 alternatives and vote on best option"
  consensus_threshold: 0.80
```

### Ralph Loop Integration

Use ToT for recovery when Ralph detects failure:

```yaml
ralph_tot_integration:
  on_failure:
    - capture_failure_context
    - initiate_tot_workflow:
        task: "Generate alternative approaches to recover from failure"
        k: 5  # Generate 5 recovery strategies
        b: 2  # Select top 2 for detailed analysis
    - evaluate_recovery_options
    - select_best_recovery
    - resume_ralph_with_new_approach
```

## Evaluation Rubric

Use this rubric to score alternatives consistently:

### Performance (1-10 scale)

| Score | Criteria |
|-------|----------|
| 9-10 | Meets all performance NFRs with margin, scales to 10x current load |
| 7-8 | Meets performance NFRs, scales to 3-5x current load |
| 5-6 | Borderline on NFRs, requires optimization, scales to 2x |
| 3-4 | Does not meet NFRs without significant work |
| 1-2 | Fundamentally cannot meet performance requirements |

### Security (1-10 scale)

| Score | Criteria |
|-------|----------|
| 9-10 | Exceeds security requirements, industry best practices, compliance ready |
| 7-8 | Meets security requirements, some best practices, minor gaps |
| 5-6 | Meets minimum security, notable gaps, requires hardening |
| 3-4 | Security concerns, significant gaps, requires major work |
| 1-2 | Insecure, cannot be made compliant reasonably |

### Developer Experience (1-10 scale)

| Score | Criteria |
|-------|----------|
| 9-10 | Excellent tooling, clear docs, fast feedback loops, team loves it |
| 7-8 | Good tooling, adequate docs, reasonable productivity |
| 5-6 | Workable but friction, learning curve, tooling gaps |
| 3-4 | Poor tooling, productivity hit, team resistance |
| 1-2 | Unusable, blocks development, team refuses |

### Team Fit (1-10 scale)

| Score | Criteria |
|-------|----------|
| 9-10 | Team has expertise, can start immediately, high confidence |
| 7-8 | Team has adjacent skills, 1-2 week learning curve |
| 5-6 | Moderate learning curve (1-2 months), some team members unfamiliar |
| 3-4 | Significant learning curve (3-6 months), most team members unfamiliar |
| 1-2 | No team expertise, requires hiring or extensive training (6+ months) |

## Best Practices

### 1. Generate Diverse Alternatives

- Include both conventional and innovative options
- Consider alternatives from different paradigms
- Don't dismiss unconventional options too quickly

### 2. Use Objective Evaluation Criteria

- Define criteria BEFORE generating alternatives (avoid bias)
- Weight criteria based on project priorities
- Use numeric scales (easier to compare than subjective ratings)

### 3. Document Pruning Rationale

- Explain WHY options were pruned
- Use Exception thought type to flag dealbreakers
- Preserve pruned alternatives in ADR (for future reference)

### 4. Perform Realistic Lookahead

- Consider implementation details, not just theory
- Identify concrete risks and mitigations
- Project success probability based on team capability

### 5. Validate Before Committing

- Check selected option against ALL requirements
- Identify trade-offs explicitly
- Define clear backtrack triggers

### 6. Maintain Backtrack Capability

- Store intermediate states (evaluation scores, rationale)
- Define triggers for reconsidering decision
- Update ADR if backtracking occurs (preserve learning)

## Common Pitfalls

### 1. Analysis Paralysis

**Problem**: Generating too many alternatives (k > 10) or analyzing too deeply (depth > 4)

**Solution**:
- Set hard limits: k ≤ 10, b ≤ 5, depth ≤ 3
- Use time box: 2 hours for generation, 3 hours for evaluation
- Accept "good enough" rather than "perfect"

### 2. Confirmation Bias

**Problem**: Generating alternatives to confirm pre-determined choice

**Solution**:
- Define evaluation criteria FIRST
- Include at least one unconventional alternative
- Use ensemble review to challenge assumptions

### 3. Ignoring Team Fit

**Problem**: Selecting technically optimal solution that team cannot implement

**Solution**:
- Weight "team fit" at minimum 10%
- Consider training time and cost in evaluation
- Include team members in evaluation process

### 4. Premature Pruning

**Problem**: Pruning alternatives too quickly, missing best option

**Solution**:
- Set minimum pruning threshold (e.g., 0.4 out of 1.0)
- Keep beam width b ≥ 3 until final selection
- Revisit pruned options if selected option fails

### 5. Forgetting to Document

**Problem**: Making good decision but not capturing rationale in ADR

**Solution**:
- Create ADR immediately after selection (while rationale fresh)
- Include ALL alternatives considered (even pruned ones)
- Document backtrack triggers and monitoring plan

## References

- @.aiwg/research/findings/REF-020-tree-of-thoughts.md - Research paper summary
- @.aiwg/research/paper-analysis/REF-020-aiwg-analysis.md - AIWG-specific analysis
- @agentic/code/frameworks/sdlc-complete/schemas/flows/tree-of-thought.yaml - ToT workflow schema
- @.claude/rules/thought-protocol.md - Six thought types
- @.claude/rules/reasoning-sections.md - Reasoning structure for ADRs
- @agentic/code/frameworks/sdlc-complete/templates/adr-template.md - ADR template
- @.aiwg/research/findings/REF-016-chain-of-thought.md - Chain-of-thought baseline
- @.aiwg/research/findings/REF-017-self-consistency.md - Self-consistency comparison

---

**Document Status**: ACTIVE
**Created**: 2026-01-26
**Last Updated**: 2026-01-26
**Issue**: #97
