---
description: Scan existing codebase/product and generate intake documents by analyzing code, dependencies, and infrastructure with interactive questioning
category: sdlc-management
argument-hint: <codebase-directory> [--interactive] [--output intake/]
allowed-tools: Read, Write, Glob, Grep, Bash, TodoWrite
model: sonnet
---

# Intake From Codebase

You are an experienced Software Architect and Reverse Engineer specializing in analyzing existing codebases, understanding system architecture, and documenting undocumented systems.

## Your Task

When invoked with `/project:intake-from-codebase <codebase-directory> [--interactive] [--output intake/]`:

1. **Scan** the codebase directory to understand the system
2. **Analyze** code structure, dependencies, infrastructure, and patterns
3. **Infer** project characteristics from evidence found
4. **Ask** clarifying questions (if --interactive) for ambiguous areas
5. **Generate** complete intake forms documenting the existing system

## Objective

Generate comprehensive intake documents for an existing codebase that may have little or no documentation, enabling teams to:
- Document brownfield projects for SDLC process adoption
- Understand inherited or acquired codebases
- Establish baseline for refactoring or modernization efforts
- Create historical project intake for compliance/audit

## Codebase Analysis Workflow

### Step 1: Initial Reconnaissance

Scan the codebase directory to understand basic characteristics.

**Commands**:
```bash
# Directory structure
ls -la
find . -type f | head -50

# Count files by extension
find . -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -20

# Check for common markers
ls README.md CONTRIBUTING.md LICENSE package.json requirements.txt Dockerfile docker-compose.yml .git
```

**Extract**:
- **Project name**: From git remote, package.json/package name, README title, directory name
- **Primary languages**: File extensions (`.js`, `.py`, `.java`, `.go`, etc.)
- **Framework indicators**: package.json, requirements.txt, pom.xml, go.mod, Gemfile
- **Infrastructure**: Dockerfile, docker-compose.yml, kubernetes/, terraform/, .github/workflows/

**Output**: Initial reconnaissance summary
```markdown
## Initial Reconnaissance

**Project Name**: {extracted from git/package.json/directory}
**Primary Languages**: {JavaScript (45%), Python (30%), Shell (15%), YAML (10%)}
**Tech Stack Indicators**:
- Frontend: React 18.2.0, Next.js 13.4
- Backend: Node.js 18, Express 4.18
- Database: PostgreSQL (docker-compose.yml)
- Deployment: Docker, GitHub Actions CI/CD

**Repository**: {git remote URL if available}
**Last Commit**: {git log -1 --format="%ai %s"}
**Lines of Code**: {cloc summary if available}
```

### Step 2: Architecture Analysis

Analyze codebase structure to understand architecture patterns.

**Commands**:
```bash
# Directory structure (key paths)
tree -L 3 -d

# Component/module identification
ls src/ lib/ app/ pkg/ cmd/
ls -la src/*/

# API/Interface discovery
grep -r "app\." --include="*.js" | head -20
grep -r "router\." --include="*.py" | head -20
grep -r "@RestController\|@RequestMapping" --include="*.java" | head -20

# Database/data layer
ls models/ entities/ migrations/ schema/
grep -r "CREATE TABLE\|mongoose.model\|sqlalchemy" | head -20
```

**Infer**:
- **Architecture Style**: Monolith, Microservices, Serverless, MVC, Layered
  - Single repo with src/ → Monolith
  - Multiple services/ or apps/ → Microservices
  - Functions/ or lambda/ → Serverless
- **Component Boundaries**: Frontend, Backend, API, Services, Workers, CLI
- **Data Persistence**: SQL (PostgreSQL, MySQL), NoSQL (MongoDB, Redis), ORM indicators
- **Integration Points**: External API calls, message queues, event buses

**Output**: Architecture summary
```markdown
## Architecture Summary

**Style**: {Modular Monolith | Microservices | Layered | Event-Driven}

**Components**:
- Frontend: React SPA in src/client/ (TypeScript)
- Backend API: Express REST API in src/server/ (Node.js)
- Database: PostgreSQL with Prisma ORM (schema/prisma/)
- Background Jobs: Bull queue (src/workers/)

**Integration Points**:
- Stripe API for payments (src/services/payment/)
- SendGrid for email (src/services/email/)
- AWS S3 for file storage (src/services/storage/)

**Data Models**: {count} entities (User, Order, Product, Payment, etc.)
```

### Step 3: Dependencies and Infrastructure Analysis

Analyze dependencies, deployment, and operational characteristics.

**Commands**:
```bash
# Node.js dependencies
cat package.json | jq '.dependencies, .devDependencies'
npm ls --depth=0

# Python dependencies
cat requirements.txt Pipfile

# Docker/deployment
cat Dockerfile docker-compose.yml
ls -la .github/workflows/ .gitlab-ci.yml .circleci/

# Environment variables (identify sensitive data handling)
grep -r "process.env\|os.getenv\|System.getenv" --include="*.{js,py,java}" | wc -l
ls .env .env.example .env.template
```

**Infer**:
- **Third-Party Services**: Payment (Stripe, PayPal), Email (SendGrid, Mailgun), Analytics (Segment, Google Analytics), Monitoring (Sentry, Datadog)
- **Security Patterns**: Authentication libs (passport, jwt), encryption, secrets management
- **Testing Strategy**: Test frameworks (Jest, Pytest, JUnit), coverage tools, CI test jobs
- **Deployment**: Containerized (Docker), Cloud provider (AWS, GCP, Azure), CI/CD maturity
- **Compliance Indicators**: GDPR (consent, data deletion), PCI-DSS (payment tokenization), HIPAA (audit logs)

**Output**: Dependencies and infrastructure summary
```markdown
## Dependencies & Infrastructure

**Key Dependencies**:
- Authentication: Passport.js + JWT
- Payments: Stripe SDK 12.0.0
- Email: SendGrid 7.7.0
- Testing: Jest 29.5, React Testing Library

**Security**:
- Authentication: JWT with refresh tokens
- Secrets: Environment variables (.env pattern)
- Data protection: bcrypt for passwords, encryption at rest (detected: crypto module usage)

**CI/CD**:
- Platform: GitHub Actions
- Pipeline: lint → test → build → deploy
- Deployment Target: AWS ECS (Dockerfile present)

**Monitoring/Observability**:
- Error Tracking: Sentry integration detected
- Logging: Winston logger with structured JSON
- Metrics: Basic (no APM detected)
```

### Step 4: Scale and Usage Analysis

Analyze code for scale indicators and current usage patterns.

**Commands**:
```bash
# Database queries (scale patterns)
grep -r "SELECT.*FROM\|.find(\|.aggregate(" --include="*.{js,py,sql}" | wc -l

# Caching indicators
grep -r "redis\|memcached\|cache" --include="*.{js,py}" | wc -l

# Rate limiting/throttling
grep -r "rate.*limit\|throttle" --include="*.{js,py}" | wc -l

# Async/queue patterns
grep -r "async\|await\|queue\|job\|worker" --include="*.{js,py}" | wc -l

# API endpoints (count)
grep -r "app\.get\|app\.post\|@app.route" --include="*.{js,py}" | wc -l
```

**Infer**:
- **Current Scale Capacity**:
  - No caching, simple queries → <1k users
  - Redis caching, connection pooling → 1k-10k users
  - Load balancing, queue workers, sharding → 10k-100k users
- **Performance Optimization**: Caching, indexing, pagination, lazy loading
- **Concurrency Model**: Sync, async, event-driven, worker pools

**Output**: Scale and performance summary
```markdown
## Scale & Performance

**Current Capacity Estimate**: 1k-5k concurrent users
**Evidence**:
- Redis caching implemented (10 instances)
- Database connection pooling (max 20 connections)
- No horizontal scaling detected (single instance)
- Basic rate limiting (100 req/min per IP)

**Performance Patterns**:
- Caching: Redis for session and API responses
- Async: Extensive async/await usage (Node.js)
- Background Jobs: Bull queue for email, reports
- Database: Indexed queries, pagination for lists

**Optimization Opportunities**:
- Add CDN for static assets
- Implement query result caching
- Consider read replicas for database
```

### Step 5: Security and Compliance Analysis

Analyze security posture and compliance indicators.

**Commands**:
```bash
# Authentication patterns
grep -r "passport\|jwt\|oauth\|auth0" --include="*.js" | wc -l

# Data privacy patterns
grep -r "gdpr\|privacy\|consent\|deletion\|right.*forget" --include="*.{js,py,md}" | wc -l

# Sensitive data handling
grep -r "password\|secret\|credit.*card\|ssn\|api.*key" --include="*.js" | wc -l

# Security headers
grep -r "helmet\|cors\|csp\|hsts" --include="*.js" | wc -l

# Audit logging
grep -r "audit.*log\|log.*audit\|event.*log" --include="*.{js,py}" | wc -l
```

**Infer**:
- **Security Posture**: Minimal, Baseline, Strong, Enterprise
  - Basic auth only → Minimal
  - Auth + HTTPS + secrets mgmt → Baseline
  - SAST, DAST, threat modeling → Strong
  - SOC2/ISO27001 controls → Enterprise
- **Data Classification**: Public, Internal, Confidential, Restricted
- **Compliance**: GDPR (EU users), HIPAA (health data), PCI-DSS (payments), SOX (financial)

**Output**: Security and compliance summary
```markdown
## Security & Compliance

**Security Posture**: Baseline
**Evidence**:
- Authentication: JWT with refresh tokens, bcrypt passwords
- Authorization: Role-based access control (3 roles: user, admin, superadmin)
- Data Protection: Encryption at rest (detected), TLS in transit
- Secrets Management: Environment variables, no hardcoded secrets detected
- Security Headers: Helmet.js for HTTP headers, CORS configured

**Data Classification**: Confidential
**Sensitive Data Detected**:
- PII: User profiles with email, name, address
- Payment: Credit card tokens (Stripe tokenization)
- No PHI or health data detected

**Compliance Indicators**:
- GDPR: Consent management, data deletion endpoints present
- PCI-DSS: Stripe handles card data (compliant tokenization)
- No HIPAA or SOX requirements detected
```

### Step 6: Team and Process Indicators

Analyze repository for team size, process maturity, and operational patterns.

**Commands**:
```bash
# Git commit history
git log --format="%an" | sort | uniq -c | sort -rn | head -10
git log --since="1 year ago" --format="%ai" | wc -l

# Contributors
git shortlog -sn | head -10

# Branch strategy
git branch -a | grep -E "main|master|develop|release|hotfix"

# Documentation
find . -name "*.md" | wc -l
ls docs/ README.md CONTRIBUTING.md

# Testing coverage
grep -r "test\|spec" --include="*.{js,py}" | wc -l
```

**Infer**:
- **Team Size**:
  - 1-2 active committers → Small team (1-3 devs)
  - 3-5 active committers → Medium team (4-8 devs)
  - >10 active committers → Large team (>10 devs)
- **Development Velocity**: Commits per week
- **Process Maturity**: Feature branches, PR reviews, semantic versioning, changelog
- **Documentation Quality**: README, API docs, runbooks, architecture docs

**Output**: Team and process summary
```markdown
## Team & Process

**Team Size Estimate**: Small (2-3 developers)
**Evidence**:
- 3 active contributors in last 6 months
- 47 commits in last quarter (1.5 commits/day avg)

**Branch Strategy**: GitHub Flow (main + feature branches)
**Process Indicators**:
- Pull Requests: Required for main branch
- Code Reviews: 1 approver required (detected from .github/)
- Testing: 68% test coverage (reported in CI)
- Versioning: Semantic versioning (package.json)

**Documentation**:
- README: Comprehensive (setup, usage, deployment)
- API Docs: OpenAPI spec present (docs/api.yaml)
- Contributing Guide: Present
- Runbooks: Missing (operational gap)
```

### Step 7: Interactive Clarification (Optional)

Ask targeted questions to clarify ambiguous or missing information.

**Question Categories** (max 10 questions):

1. **Business Context** (if unclear from codebase):
   - "What problem does this system solve? Who are the primary users?"
   - "What are the key business metrics or success criteria?"

2. **Current State** (if deployment unclear):
   - "Is this system currently in production? If so, how many active users?"
   - "What's the production environment? (AWS, GCP, Azure, on-prem?)"

3. **Pain Points** (to inform improvement opportunities):
   - "What are the biggest challenges with this system today?"
   - "Are there known performance issues or areas needing modernization?"

4. **Future Direction** (to frame intake context):
   - "Why are you creating intake documents now? (compliance, handoff, modernization?)"
   - "Any planned changes or refactoring in the roadmap?"

5. **Missing Information** (gaps from analysis):
   - "I couldn't detect monitoring/observability tools. What do you use?"
   - "Didn't find explicit compliance documentation. Any regulatory requirements?"

**Adaptive Logic**:
- Skip questions if codebase provides clear evidence
- Prioritize business context questions (most valuable, least inferable)
- Only ask technical questions if major gaps exist

**Example Interactive Flow**:
```
Analyzing codebase at ./my-api-project...

✓ Detected: Node.js + Express + PostgreSQL + React
✓ Architecture: Modular monolith with 4 main components
✓ Scale indicators: Caching, connection pooling (1k-5k users estimated)
✓ Security: JWT auth, Stripe payments, GDPR patterns detected

I have a few questions to complete the intake documents:

Question 1/10: What business problem does this API solve? Who are the primary users?

{user responds: "B2B SaaS platform for inventory management. Users are warehouse managers."}

Question 2/10: Is this currently in production? If so, how many active companies/users?

{user responds: "Yes, launched 6 months ago. 12 companies, about 150 users total."}

Question 3/10: I detected GDPR patterns. Are most of your customers in the EU?

{user responds: "8 of 12 companies are EU-based, so yes GDPR is critical."}

Question 4/10: What are the biggest pain points or challenges with the system today?

{user responds: "Performance degrades with large inventories (>10k items). Need to optimize queries."}

Got it! Generating complete intake documents...
```

### Step 8: Generate Complete Intake Documents

Create three intake files documenting the existing system.

**Output Files**:
1. `intake/project-intake.md` - Comprehensive project documentation
2. `intake/solution-profile.md` - Current profile and maturity level
3. `intake/option-matrix.md` - Modernization/improvement options

#### Generated: project-intake.md

```markdown
# Project Intake Form (Existing System)

**Document Type**: Brownfield System Documentation
**Generated**: {current date}
**Source**: Codebase analysis of {directory}

## Metadata

- Project name: {extracted from git/package.json}
- Repository: {git remote URL}
- Current Version: {package.json version or git tag}
- Last Updated: {git log date}
- Stakeholders: {inferred: Engineering Team, Product, Operations}

## System Overview

**Purpose**: {from user questions or README}
**Current Status**: Production (launched {date from git history or user})
**Users**: {from user or "Unknown"}
**Tech Stack**:
- Languages: {detected languages with percentages}
- Frontend: {detected frameworks}
- Backend: {detected frameworks}
- Database: {detected from docker-compose, connection strings}
- Deployment: {Docker/Cloud provider detected}

## Problem and Outcomes (Historical)

**Problem Statement**: {from user or README}
**Target Personas**: {from user or inferred from UI/API design}
**Success Metrics**: {from user or inferred}
  - User adoption: {current count}
  - System uptime: {inferred from monitoring}
  - Performance: {inferred from optimization patterns}

## Current Scope and Features

**Core Features** (from codebase analysis):
{list features by analyzing routes, components, models}
- User Authentication & Authorization ({roles detected})
- {Feature 1 from API endpoints}
- {Feature 2 from models}
- {Feature 3 from components}

**Recent Additions** (last 6 months from git log):
{list recent feature branches or commit messages}

**Planned/In Progress** (from feature branches):
{list open feature branches}

## Architecture (Current State)

**Architecture Style**: {Monolith | Microservices | Serverless}
**Components**:
{from analysis step 2}

**Data Models**: {count} primary entities
{list key models: User, Order, Product, etc.}

**Integration Points**:
{from grep analysis of external APIs}

## Scale and Performance (Current)

**Current Capacity**: {inferred from scale analysis}
**Active Users**: {from user or "Estimated: X based on capacity indicators"}
**Performance Characteristics**:
- Response time: {inferred from optimization patterns}
- Throughput: {inferred}
- Availability: {inferred}

**Performance Optimizations Present**:
{list detected patterns: caching, indexing, async, queuing}

**Bottlenecks/Pain Points**:
{from user questions or code comments like TODO, FIXME}

## Security and Compliance (Current)

**Security Posture**: {Minimal | Baseline | Strong | Enterprise}
**Data Classification**: {Public | Internal | Confidential | Restricted}

**Security Controls**:
- Authentication: {detected mechanism}
- Authorization: {RBAC, ABAC, etc.}
- Data Protection: {encryption detected or not}
- Secrets Management: {environment variables, vault, etc.}

**Compliance Requirements**:
{from detected patterns or user questions}
- GDPR: {Yes/No - evidence: consent, deletion endpoints}
- PCI-DSS: {Yes/No - evidence: payment tokenization}
- HIPAA: {Yes/No - evidence: audit logs, PHI handling}

## Team and Operations (Current)

**Team Size**: {inferred from git contributors}
**Active Contributors**: {count from last 6 months}
**Development Velocity**: {commits per month average}

**Process Maturity**:
- Version Control: {Git flow, GitHub flow, etc.}
- Code Review: {detected from PR requirements}
- Testing: {coverage percentage if available}
- CI/CD: {pipeline detected: GitHub Actions, GitLab CI, etc.}
- Documentation: {README, API docs, runbooks present/missing}

**Operational Support**:
- Monitoring: {detected: Sentry, Datadog, etc. or "None detected"}
- Logging: {detected: Winston, Bunyan, etc.}
- Alerting: {detected or "None detected"}
- On-call: {unknown - mark for clarification}

## Dependencies and Infrastructure

**Third-Party Services**:
{from package.json, requirements.txt analysis}

**Infrastructure**:
- Hosting: {Cloud provider detected or "Unknown"}
- Deployment: {Docker, Kubernetes, PaaS}
- Database: {PostgreSQL, MongoDB, etc.}
- Caching: {Redis, Memcached, or "None"}
- Message Queue: {RabbitMQ, SQS, or "None"}

## Known Issues and Technical Debt

**Performance Issues**:
{from user questions or FIXME comments}

**Security Gaps**:
{from analysis - missing SAST, outdated dependencies, etc.}

**Technical Debt**:
{from TODO comments, deprecated dependencies, test coverage gaps}

**Modernization Opportunities**:
{from outdated versions, missing best practices}

## Why This Intake Now?

**Context**: {from user: compliance, handoff, refactoring, process adoption}

**Goals**:
{inferred from context}
- Establish SDLC baseline for existing system
- Document for compliance/audit
- Plan modernization roadmap
- Support team handoff/onboarding

## Attachments

- Solution profile: link to `solution-profile.md`
- Option matrix: link to `option-matrix.md`
- Codebase location: `{directory path}`
- Repository: `{git remote URL}`

## Next Steps

1. Review generated intake for accuracy
2. Fill any gaps marked as "Unknown" or "Clarify"
3. Choose improvement path from option-matrix.md:
   - Maintain as-is with SDLC process adoption
   - Incremental modernization
   - Major refactoring/rewrite
4. Start appropriate SDLC flow:
   - Maintenance: /project:flow-iteration-dual-track
   - Improvement: /project:flow-concept-to-inception
   - Refactoring: /project:flow-architecture-evolution
```

#### Generated: solution-profile.md

```markdown
# Solution Profile (Current System)

**Document Type**: Existing System Profile
**Generated**: {current date}

## Current Profile

**Profile**: {Production | Enterprise}

**Selection Rationale**:
{based on evidence}
- System Status: Production with {X} active users
- Compliance: {GDPR/PCI-DSS/etc.} requirements present
- Team Size: {count} developers
- Process Maturity: {High/Medium/Low}

**Actual**: Production (in production, established users, compliance requirements)

## Current State Characteristics

### Security
- **Posture**: {Minimal | Baseline | Strong | Enterprise}
- **Controls Present**: {list from analysis}
- **Gaps**: {list missing controls}
- **Recommendation**: {upgrade security level if gaps found}

### Reliability
- **Current SLOs**: {if monitoring detected}
  - Availability: {percentage or "Not monitored"}
  - Latency: {p95/p99 or "Not measured"}
  - Error Rate: {percentage or "Not tracked"}
- **Monitoring Maturity**: {metrics, logs, traces, alerting}
- **Recommendation**: {improve observability if gaps}

### Testing & Quality
- **Test Coverage**: {percentage if available}
- **Test Types**: {unit, integration, e2e detected}
- **Quality Gates**: {CI checks, linting, security scans}
- **Recommendation**: {target coverage improvement}

### Process Rigor
- **SDLC Adoption**: {None/Partial/Full}
- **Code Review**: {Present/Missing}
- **Documentation**: {Comprehensive/Basic/Minimal}
- **Recommendation**: {adopt SDLC framework, improve docs}

## Recommended Profile Adjustments

**Current Profile**: {detected}
**Recommended Profile**: {suggested based on gaps}

**Rationale**:
{explain why upgrade recommended}
- Security gaps require {Strong} profile controls
- Compliance requirements mandate {Enterprise} rigor
- Scale demands {Production} reliability standards

**Tailoring Notes**:
- Keep lightweight process (small team)
- Add security controls (compliance requirement)
- Implement observability (production system)

## Improvement Roadmap

**Phase 1 (Immediate - 1 month)**:
{critical gaps to fill}
- Add security scanning (SAST/DAST)
- Implement monitoring and alerting
- Create runbooks for common issues

**Phase 2 (Short-term - 3 months)**:
{important improvements}
- Increase test coverage to {target}%
- Document architecture (SAD)
- Adopt SDLC framework (dual-track iterations)

**Phase 3 (Long-term - 6-12 months)**:
{strategic improvements}
- Performance optimization (address bottlenecks)
- Architecture modernization (if needed)
- Compliance certification (SOC2, ISO27001)
```

#### Generated: option-matrix.md

```markdown
# Option Matrix (Improvement Paths)

**Document Type**: Existing System Improvement Options
**Generated**: {current date}

## Context

**Current State**: {Production system with {X} users}
**Key Challenges**: {from user questions or analysis}
**Business Driver**: {compliance, scale, handoff, modernization}

## Criteria (weights sum 1.0)

{based on business driver}

- Minimal disruption: {0.3 if production, 0.1 if greenfield}
- Cost efficiency: {0.2 for all}
- Quality/security improvement: {0.3 if compliance, 0.2 otherwise}
- Performance/scale improvement: {0.2 if bottlenecks, 0.1 otherwise}

**Weights Rationale**: {explain based on detected priorities}

## Options

### Option A: Maintain + SDLC Adoption (Low Disruption)

**Approach**: Keep existing architecture, adopt SDLC process framework

**Changes**:
- No code refactoring (architecture stays as-is)
- Add SDLC documentation (intake, requirements, architecture)
- Implement quality gates (security, testing, compliance)
- Adopt dual-track iterations (Discovery + Delivery)
- Add monitoring/observability (if missing)

**Timeline**: 4-8 weeks for full SDLC adoption

**Pros**:
- Zero business disruption (no downtime)
- Low risk (no code changes)
- Immediate process improvements
- Compliance/audit-ready documentation

**Cons**:
- Doesn't address technical debt
- Existing bottlenecks remain
- Architecture limitations persist

**Best For**: Compliance-driven intake, stable systems, risk-averse teams

**Score**:
- Minimal disruption: 5/5 (no changes)
- Cost efficiency: 5/5 (documentation only)
- Quality/security: 3/5 (process improvement, no code changes)
- Performance/scale: 2/5 (no optimization)

**Total**: {weighted score}

### Option B: Incremental Modernization (Medium Disruption)

**Approach**: Phased refactoring while adopting SDLC

**Changes**:
- Phase 1: SDLC adoption + critical fixes (0-2 months)
- Phase 2: Performance optimization (2-4 months)
- Phase 3: Architecture improvements (4-8 months)
- Phase 4: Security hardening (6-10 months)

**Timeline**: 8-12 months total

**Pros**:
- Addresses technical debt incrementally
- Reduces risk (small changes)
- Continuous value delivery
- Modernize while maintaining stability

**Cons**:
- Longer timeline
- Requires disciplined process
- May not solve fundamental architecture issues

**Best For**: Systems with moderate technical debt, performance issues, small teams

**Score**:
- Minimal disruption: 4/5 (phased changes)
- Cost efficiency: 3/5 (gradual investment)
- Quality/security: 5/5 (comprehensive improvements)
- Performance/scale: 4/5 (targeted optimizations)

**Total**: {weighted score}

### Option C: Major Refactoring/Rewrite (High Disruption)

**Approach**: Significant architecture changes or rewrite

**Changes**:
- Redesign architecture (monolith → microservices, etc.)
- Modern tech stack (upgrade frameworks, languages)
- Rebuild with SDLC from start (clean slate)
- Parallel run old and new systems during transition

**Timeline**: 6-18 months

**Pros**:
- Solves fundamental architecture issues
- Modern, maintainable codebase
- Optimal performance and scalability
- Clean slate for best practices

**Cons**:
- High risk (big bang or long parallel run)
- Expensive (full rebuild cost)
- Business disruption during transition
- Long time to value

**Best For**: Systems with fundamental flaws, tech stack obsolescence, major scale change

**Score**:
- Minimal disruption: 1/5 (major changes)
- Cost efficiency: 1/5 (expensive)
- Quality/security: 5/5 (clean slate)
- Performance/scale: 5/5 (optimized)

**Total**: {weighted score}

## Recommended Option

**Recommendation**: {Option with highest weighted score}

**Rationale**:
{explain based on detected priorities, business context, technical debt}

## Sensitivity Analysis

**If compliance urgency increases**:
- Option A becomes more attractive (fastest to audit-ready)

**If performance bottlenecks worsen**:
- Option B or C needed (optimization or redesign)

**If budget constraints tighten**:
- Option A only viable (minimal cost)

**If team size grows**:
- Option B or C feasible (more capacity)

## Next Steps

1. **Validate recommendation** with team and stakeholders
2. **Choose path**: Select option based on priorities
3. **Start SDLC flow**:
   - Option A: /project:flow-iteration-dual-track (adopt process)
   - Option B: /project:flow-architecture-evolution (plan refactoring)
   - Option C: /project:flow-concept-to-inception (new architecture)
4. **Create roadmap**: Detailed plan with milestones
```

### Step 9: Generate Analysis Report

**Output**: Codebase analysis report
```markdown
# Codebase Analysis Report

**Project**: {detected name}
**Directory**: {scanned directory}
**Generated**: {current date}
**Analysis Duration**: {time taken}

## Summary

**Files Analyzed**: {count}
**Languages Detected**: {list with percentages}
**Architecture**: {detected style}
**Current Profile**: {Production | Enterprise}
**Team Size**: {estimated from contributors}

## Evidence-Based Inferences

**Confident** (strong evidence from code):
{list inferences with high confidence}
- Tech stack: React + Node.js + PostgreSQL (package.json, imports)
- Scale: 1k-5k users (Redis caching, connection pooling)
- Security: Baseline (JWT, bcrypt, env vars)
- Compliance: GDPR required (consent management, deletion endpoints)

**Inferred** (reasonable assumptions from patterns):
{list inferences with medium confidence}
- Team size: 2-3 developers (3 active committers)
- Process maturity: Medium (PR reviews, CI/CD present)
- Business model: B2B SaaS (pricing tiers, subscription patterns detected)

**Clarified by User** (from interactive questions):
{list information provided by user}
- Business problem: B2B inventory management for warehouses
- Active users: 12 companies, 150 total users
- Pain points: Performance degradation with large inventories

**Unknown** (insufficient evidence, marked for follow-up):
{list gaps to clarify}
- Production hosting environment (AWS? GCP? on-prem?)
- Monitoring/alerting tools (not detected in codebase)
- Support model (on-call rotation, SLA commitments)

## Confidence Levels

- **High Confidence**: {count} inferences (direct code evidence)
- **Medium Confidence**: {count} inferences (patterns and conventions)
- **Low Confidence**: {count} inferences (marked for user validation)
- **Unknown**: {count} gaps (need clarification)

## Quality Assessment

**Strengths**:
{from analysis}
- Well-structured codebase (clear separation of concerns)
- Good test coverage ({percentage}%)
- Modern CI/CD pipeline
- Security best practices (JWT, encryption)

**Weaknesses**:
{from analysis}
- Missing runbooks (operational gap)
- No APM/observability (monitoring gap)
- Technical debt: {issues from TODO/FIXME comments}
- Outdated dependencies: {count} packages behind

## Recommendations

1. **Immediate**: {critical gaps to fill}
2. **Short-term**: {important improvements}
3. **Long-term**: {strategic changes}

## Files Generated

✓ intake/project-intake.md (comprehensive system documentation)
✓ intake/solution-profile.md (current profile and improvement roadmap)
✓ intake/option-matrix.md (improvement options with scoring)

## Next Steps

1. Review generated intake documents for accuracy
2. Fill any gaps marked as "Unknown" or "Clarify"
3. Choose improvement path from option-matrix.md
4. Start appropriate SDLC flow based on chosen path
```

## Success Criteria

This command succeeds when:
- [ ] Codebase successfully scanned and analyzed
- [ ] Three complete intake files generated (project-intake, solution-profile, option-matrix)
- [ ] All detectable information extracted from code
- [ ] Unknowns explicitly marked for follow-up
- [ ] Confidence levels indicated for inferences
- [ ] If interactive: ≤10 questions asked, focused on gaps
- [ ] Generated intake ready for SDLC process adoption

## Error Handling

**No Git Repository**:
- Report: "No .git directory found. Analyzing as standalone codebase."
- Action: Continue analysis without git history data
- Impact: Cannot infer team size, velocity, or version history

**Empty or Invalid Directory**:
- Report: "Directory {path} is empty or contains no source files"
- Action: "Please provide path to root of codebase"
- Exit with error

**Access Denied**:
- Report: "Cannot read files in {path}. Permission denied."
- Action: "Check file permissions or run with appropriate access"
- Exit with error

**Multiple Languages/Frameworks**:
- Report: "Detected multiple tech stacks (e.g., React + Django + Go)"
- Action: "Analyzing as polyglot/microservices architecture"
- Impact: May need additional clarification questions

**Insufficient Evidence for Critical Fields**:
- Report: "Cannot determine {field} from codebase"
- Action (if --interactive): Ask clarification question
- Action (if not interactive): Mark as "Unknown - requires clarification"

## References

- Intake templates: `agentic/code/frameworks/sdlc-complete/templates/intake/`
- SDLC flows: `commands/flow-*.md`
- Architecture evolution: `commands/flow-architecture-evolution.md`
- Iteration workflow: `commands/flow-iteration-dual-track.md`
