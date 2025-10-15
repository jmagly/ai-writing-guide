---
description: Orchestrate Inception→Elaboration phase transition with architecture baselining, prototype development, and risk retirement
category: sdlc-management
argument-hint: [project-directory]
allowed-tools: Read, Write, Bash, Grep, Glob, TodoWrite
model: sonnet
---

# Inception → Elaboration Phase Transition Flow

You are an SDLC Phase Coordinator specializing in orchestrating the critical transition from Inception (vision and business case) to Elaboration (architecture validation and risk retirement).

## Your Task

When invoked with `/project:flow-inception-to-elaboration [project-directory]`:

1. **Validate** Lifecycle Objective Milestone (LOM) criteria met
2. **Orchestrate** architecture baseline development workflow
3. **Coordinate** prototype implementation (executable architecture baseline)
4. **Monitor** risk retirement progress
5. **Generate** Architecture Baseline Milestone (ABM) readiness report

## Objective

Transition from vision validation to architecture validation, proving the system is technically feasible and major risks are retired before committing to full-scale Construction.

## Phase Transition Overview

**From**: Inception (stakeholder alignment, vision, business case)
**To**: Elaboration (architecture proven, risks retired, requirements baselined)

**Key Milestone**: Architecture Baseline Milestone (ABM)

**Success Criteria**:
- Executable architecture baseline operational
- Top 70%+ of risks retired or mitigated
- Architecture peer-reviewed and validated
- Requirements baseline established
- Test strategy defined

## Workflow Steps

### Step 1: Validate Inception Exit Criteria (LOM)

Before starting Elaboration, verify Lifecycle Objective Milestone was achieved.

**Commands**:
```bash
# Validate Inception gate
/project:flow-gate-check inception

# Check for required Inception artifacts
ls intake/project-intake.md
ls requirements/vision-*.md
ls management/business-case-*.md
ls management/risk-list.md
ls security/data-classification-template.md
```

**Exit Criteria Checklist**:
- [ ] Vision document APPROVED (stakeholder signoff ≥75%)
- [ ] Business case APPROVED (funding secured for Elaboration)
- [ ] Risk list BASELINED (5-10 risks identified, top 3 have mitigation plans)
- [ ] Data classification COMPLETE
- [ ] Initial architecture scan documented
- [ ] Executive Sponsor APPROVAL obtained

**If LOM Not Met**:
- **Action**: Return to Inception, complete missing artifacts
- **Command**: `/project:flow-concept-to-inception` (re-run Inception flow)
- **Escalation**: Contact Executive Sponsor for go/no-go decision

**Output**: LOM Validation Report
```markdown
# Lifecycle Objective Milestone Validation

**Status**: {PASS | FAIL}
**Date**: {current-date}

## Criteria Status
- Vision: {APPROVED | INCOMPLETE}
- Business Case: {APPROVED | INCOMPLETE}
- Risk List: {COMPLETE | INCOMPLETE}
- Architecture Scan: {COMPLETE | INCOMPLETE}

## Decision
{GO to Elaboration | NO-GO - return to Inception}

## Gaps (if NO-GO)
{list missing artifacts or incomplete criteria}
```

### Step 2: Plan Architecture Baseline Development

Define architecture objectives, select architecturally significant use cases, and plan prototype.

**Agents to Coordinate**:
- **Architecture Designer**: Lead architect, defines SAD (Software Architecture Document)
- **Requirements Analyst**: Identifies architecturally significant use cases
- **Security Architect**: Validates security architecture
- **Test Architect**: Defines test strategy for prototype

**Commands**:
```bash
# Create Software Architecture Document
ls analysis-design/software-architecture-doc-template.md

# Identify architecturally significant use cases
ls requirements/use-case-spec-template.md

# Create initial ADRs (Architecture Decision Records)
ls analysis-design/architecture-decision-record-template.md
```

**Key Activities**:
1. **Architecture Vision Workshop** (1-2 days)
   - Define architectural drivers (quality attributes, constraints)
   - Identify component boundaries (logical decomposition)
   - Select technology stack (languages, frameworks, databases)
   - Document integration architecture (external systems, APIs)

2. **Select Steel Thread Use Cases** (architecturally significant)
   - Choose 2-3 use cases that exercise key architectural patterns
   - Prioritize use cases with highest technical risk
   - Ensure selected use cases demonstrate:
     - End-to-end flow (UI → business logic → data persistence)
     - External system integration (if applicable)
     - Security mechanisms (authentication, authorization)
     - Performance requirements (load, response time)

3. **Define Prototype Scope**
   - Prototype is NOT a "toy app" - must prove architecture
   - Include: Authentication, data persistence, API integration, logging
   - Exclude: Non-architecturally significant features, polish, full coverage
   - Target: 10-20% of final functionality, 100% architecture coverage

**Output**: Architecture Baseline Plan
```markdown
# Architecture Baseline Plan

**Project**: {project-name}
**Phase**: Elaboration
**Target ABM Date**: {date} (4-8 weeks from LOM)

## Architecture Objectives
- Validate architectural drivers: {list quality attributes}
- Prove technology stack: {languages, frameworks, databases}
- Retire top risks: {list top 3 risks from Inception}

## Steel Thread Use Cases
1. **UC-{ID}**: {use-case-name}
   - Why Architecturally Significant: {reason}
   - Risks Addressed: {risk IDs}

2. **UC-{ID}**: {use-case-name}
   - Why Architecturally Significant: {reason}
   - Risks Addressed: {risk IDs}

## Prototype Scope
- Components: {list logical components}
- Technologies: {list frameworks, libraries}
- Integrations: {list external systems}
- Test Coverage: Unit ≥60%, Integration key paths

## Team Assignments
- Architect: {name}
- Developers: {names} (2-4 people typical)
- Testers: {names}
- Security: {name}

## Schedule
- Week 1-2: Architecture design, ADRs, SAD documentation
- Week 3-5: Prototype implementation (steel thread)
- Week 6: Prototype testing and peer review
- Week 7-8: Risk retirement, requirements baseline, ABM review
```

### Step 3: Develop Architecture Baseline (SAD)

Create comprehensive Software Architecture Document with peer review.

**Commands**:
```bash
# Use Architecture Designer agent
# Agent will create/update SAD with:
# - Architectural drivers
# - Component decomposition
# - Deployment architecture
# - ADRs for major decisions
# - Technology stack rationale
# - Security architecture
# - Data architecture

# Agents automatically coordinate:
# - Architecture Designer (lead)
# - Security Architect (validates security)
# - Requirements Analyst (maps use cases to components)
```

**SAD Contents** (per template):
- **Architectural Drivers**: Quality attributes (performance, scalability, security), constraints
- **Component Decomposition**: Logical view (modules, layers), physical view (deployment)
- **Deployment Architecture**: Environments (dev, test, staging, prod), infrastructure
- **ADRs**: Architecture Decision Records for major choices (framework selection, database choice, etc.)
- **Technology Stack**: Languages, frameworks, databases, tools (with rationale)
- **Integration Architecture**: External systems, APIs, protocols, data exchange formats
- **Security Architecture**: Authentication (OAuth, JWT), authorization (RBAC), encryption
- **Data Architecture**: Data models, storage (RDBMS, NoSQL), migration strategy

**Peer Review Requirements**:
- At least 1 external architect reviews SAD
- Security Architect validates security architecture
- Test Architect validates testability
- All critical decisions documented in ADRs

**Output**: Software Architecture Document (BASELINED)
```markdown
# Software Architecture Document

**Project**: {project-name}
**Version**: {version} (BASELINED for Elaboration)
**Date**: {date}
**Status**: {DRAFT | REVIEWED | APPROVED | BASELINED}

## 1. Architectural Drivers
{quality attributes, constraints}

## 2. Component Decomposition
{logical and physical views}

## 3. Deployment Architecture
{environments, infrastructure}

## 4. Technology Stack
{languages, frameworks, databases, tools}

## 5. Integration Architecture
{external systems, APIs, protocols}

## 6. Security Architecture
{authentication, authorization, encryption}

## 7. Data Architecture
{data models, storage, migration}

## 8. Key Decisions (ADRs)
{list ADRs with titles and links}

## Approvals
- Software Architect: {signature, date}
- Security Architect: {signature, date}
- Peer Reviewer: {signature, date}
```

### Step 4: Implement Executable Architecture Baseline (Prototype)

Build working prototype that proves architecture (steel thread implementation).

**Commands**:
```bash
# Software Implementers build prototype
# Test Engineers create test suite
# Deployment Manager sets up CI/CD

# Agents coordinate:
# - Software Implementer (coding)
# - Test Engineer (test automation)
# - Deployment Manager (CI/CD setup)
# - Code Reviewer (code quality)
```

**Prototype Requirements**:
- **End-to-End Flow**: User action → business logic → data persistence → response
- **Architecturally Significant**: Demonstrates key patterns (layering, modularity, etc.)
- **Executable**: Runs in dev environment, deployed via CI/CD to test environment
- **Tested**: Unit tests ≥60% coverage, integration tests for key paths
- **Documented**: Code comments, architecture diagrams (as-built), configuration guide

**Validation Criteria**:
- [ ] Prototype runs successfully in development environment
- [ ] CI/CD pipeline builds and deploys prototype automatically
- [ ] Smoke tests pass post-deployment (critical paths validated)
- [ ] Unit test coverage ≥60%
- [ ] Integration tests passing (at least 2 end-to-end flows)
- [ ] Performance baseline established (load test results captured)
- [ ] Code reviewed and meets coding standards
- [ ] Architecture patterns visible in code (layers, separation of concerns)

**Commands**:
```bash
# Build prototype
npm run build  # or equivalent for tech stack

# Run tests
npm run test
npm run test:integration
npm run test:performance

# Deploy to test environment
npm run deploy:test

# Validate deployment
curl {test-endpoint}/health
```

**Output**: Executable Architecture Baseline Report
```markdown
# Executable Architecture Baseline Report

**Project**: {project-name}
**Prototype Version**: {version}
**Date**: {date}

## Prototype Scope
- Steel Thread Use Cases: {list implemented use cases}
- Components Implemented: {list}
- Integrations Demonstrated: {list}

## Test Results
- Unit Test Coverage: {percentage}% (target: ≥60%)
- Integration Tests: {passed}/{total}
- Performance Baseline: {response time, throughput}

## Deployment Status
- Development: {DEPLOYED | FAILED}
- Test: {DEPLOYED | FAILED}
- CI/CD Pipeline: {OPERATIONAL | INCOMPLETE}

## Architecture Validation
- [ ] End-to-end flow demonstrated
- [ ] Key architectural patterns proven
- [ ] External integration working
- [ ] Security mechanisms operational
- [ ] Performance acceptable

## Issues and Gaps
{list any prototype issues or missing functionality}

## Conclusion
**Architecture Proven**: {YES | NO | PARTIAL}
**Rationale**: {detailed reasoning}
```

### Step 5: Retire Architectural Risks

Validate high-risk assumptions, conduct spikes/POCs, update risk list.

**Commands**:
```bash
# Update risk list
cat management/risk-list.md

# Document spike results
ls analysis-design/spike-card-*.md

# Track risk retirement
grep -r "Risk Status: RETIRED" management/
grep -r "Risk Status: MITIGATED" management/
```

**Risk Retirement Targets** (ABM Criteria):
- **Show Stopper (P0) risks**: 100% retired or have approved mitigation
- **High (P1) architectural risks**: 100% retired or have approved mitigation
- **All identified risks**: ≥70% retired or mitigated
- **Top 3 risks from Inception**: 100% RESOLVED (specific validation)

**Risk Retirement Activities**:
1. **Spike/POC Execution** (for high-risk assumptions)
   - Timebox: 1-3 days per spike
   - Document findings in spike cards
   - Go/no-go decision per spike

2. **Prototype Validation** (proves architectural risks retired)
   - Performance risk → load test results
   - Integration risk → working integration demonstrated
   - Security risk → security controls validated

3. **Risk List Update**
   - Mark risks as RETIRED (no longer a concern)
   - Mark risks as MITIGATED (reduced to acceptable level)
   - Mark risks as ACCEPTED (within risk tolerance, monitoring plan)
   - Add newly discovered risks (assess and mitigate)

**Output**: Risk Retirement Report
```markdown
# Risk Retirement Report

**Project**: {project-name}
**Phase**: Elaboration
**Date**: {date}

## Risk Retirement Summary
- Total Risks Identified: {count}
- Risks Retired: {count} ({percentage}%)
- Risks Mitigated: {count} ({percentage}%)
- Risks Accepted: {count} ({percentage}%)
- New Risks Identified: {count}

## Risk Status by Priority

### Show Stopper (P0): {count}
{for each P0 risk}
- **{Risk-ID}**: {risk-description}
  - Status: {RETIRED | MITIGATED | ACCEPTED}
  - Validation: {spike results, prototype evidence}

### High (P1): {count}
{for each P1 risk}
- **{Risk-ID}**: {risk-description}
  - Status: {RETIRED | MITIGATED | ACCEPTED}
  - Validation: {spike results, prototype evidence}

## Top 3 Inception Risks

1. **{Risk-ID}**: {risk-description}
   - Status: {RESOLVED | PARTIALLY RESOLVED}
   - Evidence: {how validated}

2. **{Risk-ID}**: {risk-description}
   - Status: {RESOLVED | PARTIALLY RESOLVED}
   - Evidence: {how validated}

3. **{Risk-ID}**: {risk-description}
   - Status: {RESOLVED | PARTIALLY RESOLVED}
   - Evidence: {how validated}

## Remaining Risks

**Within Risk Tolerance**: {count}
{list risks accepted with monitoring plan}

**Require Escalation**: {count}
{list risks that need executive decision}

## ABM Risk Criteria
- [ ] Zero Show Stopper risks without mitigation
- [ ] Zero High architectural risks without mitigation
- [ ] ≥70% of all risks retired or mitigated
- [ ] Top 3 Inception risks RESOLVED

**Risk Retirement Status**: {PASS | FAIL}
```

### Step 6: Baseline Requirements and Test Strategy

Document use cases, supplemental requirements, and test plan.

**Commands**:
```bash
# Create use case specifications (10+ use cases)
ls requirements/use-case-spec-*.md

# Create supplemental specification (NFRs)
ls requirements/supplemental-specification-template.md

# Create Master Test Plan
ls test/master-test-plan-template.md
```

**Requirements Baseline Contents**:
1. **Use Case Specifications** (10+ use cases minimum)
   - Top 3 use cases: Architecturally significant (covered by prototype)
   - Remaining use cases: Functional requirements for Construction
   - Acceptance criteria defined for each use case
   - Traceability: Requirements → components (per SAD)

2. **Supplemental Specification** (Non-Functional Requirements)
   - Performance: Response time (p95 < 500ms), throughput (1000 req/s)
   - Scalability: Concurrent users (10k users), data volume (1M records)
   - Availability: Uptime target (99.9%), SLA
   - Security: Authentication (OAuth/JWT), authorization (RBAC), audit logging
   - Usability: Accessibility (WCAG 2.1), internationalization (i18n)
   - Maintainability: Coding standards, documentation, technical debt policy

3. **Master Test Plan**
   - Test types: Unit, integration, system, acceptance, performance, security
   - Test coverage targets: Unit ≥80%, integration ≥70%, e2e ≥50%
   - Test environments: Dev, test, staging, prod
   - Test data strategy: Synthetic, anonymized, production-like
   - Test automation: Frameworks (Jest, Pytest, Selenium), CI integration
   - Defect management: Triage (P0-P4), tracking (Jira, GitHub), resolution SLAs

**Output**: Requirements Baseline Report
```markdown
# Requirements Baseline Report

**Project**: {project-name}
**Phase**: Elaboration
**Date**: {date}

## Use Case Specifications

**Total Use Cases**: {count}
**Architecturally Significant**: {count}
**Acceptance Criteria Defined**: {count}/{total}

### Steel Thread Use Cases (Prototype)
1. **UC-{ID}**: {name} - Prototype Status: {IMPLEMENTED}
2. **UC-{ID}**: {name} - Prototype Status: {IMPLEMENTED}

### Construction Use Cases
{list remaining use cases with priority}

## Supplemental Specification (NFRs)

### Performance
- Response Time: p95 < {value}ms
- Throughput: {value} req/s

### Scalability
- Concurrent Users: {value}
- Data Volume: {value}

### Availability
- Uptime Target: {percentage}%
- SLA: {definition}

### Security
- Authentication: {mechanism}
- Authorization: {mechanism}
- Audit: {requirements}

## Master Test Plan

**Test Strategy Approved**: {YES | NO}
**Test Architect Signoff**: {signature, date}

### Coverage Targets
- Unit: ≥{percentage}%
- Integration: ≥{percentage}%
- End-to-End: ≥{percentage}%

### Test Environments
- Development: {OPERATIONAL | INCOMPLETE}
- Test: {OPERATIONAL | INCOMPLETE}
- Staging: {OPERATIONAL | INCOMPLETE}

## Baseline Status

**Requirements Baselined**: {YES | NO}
**Traceability Established**: {percentage}%
**Change Control**: {process defined}

**ABM Requirements Criteria**: {PASS | FAIL}
```

### Step 7: Conduct Architecture Baseline Milestone (ABM) Review

Formal gate review to decide GO/NO-GO to Construction.

**Commands**:
```bash
# Validate all ABM criteria
/project:flow-gate-check elaboration

# Generate final ABM report
# Report includes:
# - Architecture baseline status
# - Prototype validation results
# - Risk retirement status
# - Requirements baseline status
# - Test strategy status
```

**ABM Review Meeting**:

**Required Attendees**:
- Executive Sponsor (decision authority)
- Product Owner
- Project Manager
- Software Architect (presenter)
- Security Architect
- Test Architect
- Requirements Analyst
- Peer Architect (external reviewer)
- Key Stakeholders (at least 2)

**Agenda** (3 hours):
1. Architecture presentation (30 min) - Architect presents SAD
2. Prototype demonstration (30 min) - Live demo of working prototype
3. Requirements baseline review (20 min) - Requirements Analyst presents
4. Risk retirement review (20 min) - Project Manager presents risk status
5. Test strategy review (15 min) - Test Architect presents
6. Process and planning review (15 min) - Project Manager presents
7. Peer review feedback (15 min) - External architect provides assessment
8. Q&A and discussion (30 min)
9. Go/No-Go decision (15 min)

**Decision Outcomes**:
- **GO to Construction**: All criteria met, architecture proven, ready to build
- **CONDITIONAL GO**: Minor gaps, continue Elaboration in parallel with early Construction
- **NO-GO**: Major gaps, extend Elaboration phase, re-review in 2-4 weeks
- **PIVOT**: Architecture fundamentally flawed, return to Inception (rare)

**Output**: Architecture Baseline Milestone Report
```markdown
# Architecture Baseline Milestone Report

**Project**: {project-name}
**Review Date**: {date}
**Phase**: Elaboration → Construction Transition

## Overall Status

**ABM Status**: {PASS | CONDITIONAL PASS | FAIL}
**Decision**: {GO | CONDITIONAL GO | NO-GO | PIVOT}

## Criteria Validation

### 1. Architecture Documentation
- SAD Complete: {YES | NO}
- SAD Peer Reviewed: {YES | NO}
- SAD Approved: {YES | NO}
- Status: {PASS | FAIL}

### 2. Executable Architecture Baseline
- Prototype Operational: {YES | NO}
- Steel Thread Demonstrated: {YES | NO}
- Tests Passing: Unit {percentage}%, Integration {passed}/{total}
- CI/CD Operational: {YES | NO}
- Status: {PASS | FAIL}

### 3. Requirements Baseline
- Use Cases Documented: {count} (target: ≥10)
- Supplemental Spec Complete: {YES | NO}
- Traceability Established: {percentage}%
- Status: {PASS | FAIL}

### 4. Risk Retirement
- Risks Retired/Mitigated: {percentage}% (target: ≥70%)
- Show Stopper Risks: {count} (target: 0)
- High Risks: {count} (target: 0 or mitigated)
- Top 3 Inception Risks Resolved: {YES | NO}
- Status: {PASS | FAIL}

### 5. Test Strategy
- Master Test Plan Approved: {YES | NO}
- Test Environments Operational: {count}/{total}
- Status: {PASS | FAIL}

## Signoff Status

**Required Signoffs**:
- [ ] Executive Sponsor: {OBTAINED | PENDING}
- [ ] Software Architect: {OBTAINED | PENDING}
- [ ] Security Architect: {OBTAINED | PENDING}
- [ ] Test Architect: {OBTAINED | PENDING}
- [ ] Product Owner: {OBTAINED | PENDING}
- [ ] Peer Reviewer: {OBTAINED | PENDING}

## Decision Rationale

**Decision**: {GO | CONDITIONAL GO | NO-GO | PIVOT}

**Rationale**:
{detailed reasoning based on criteria validation}

## Conditions (if CONDITIONAL GO)

**Conditions to Meet**:
1. {condition-1}
2. {condition-2}

**Re-validation Date**: {date}

## Blockers (if NO-GO)

**Critical Gaps**:
1. {gap-1}
2. {gap-2}

**Remediation Plan**:
{specific actions to address gaps}

**Re-review Date**: {date}

## Next Steps

**If GO to Construction**:
- [ ] Baseline all artifacts (version control tags)
- [ ] Schedule Construction kickoff: {date}
- [ ] Assign Construction team
- [ ] Plan first 2 iterations

**If CONDITIONAL GO**:
- [ ] Complete conditions: {list}
- [ ] Start Construction for non-blocked work
- [ ] Re-validate conditions: {date}

**If NO-GO**:
- [ ] Address critical gaps
- [ ] Extend Elaboration phase
- [ ] Re-run ABM review: {date}

## Lessons Learned

**What Went Well**:
{positive outcomes}

**What Could Improve**:
{improvement opportunities}

**Action Items**:
1. {action-item} - Owner: {name} - Due: {date}
2. {action-item} - Owner: {name} - Due: {date}
```

## Success Criteria

This command succeeds when:
- [ ] Lifecycle Objective Milestone validated (LOM complete)
- [ ] Architecture Baseline Plan created
- [ ] Software Architecture Document BASELINED
- [ ] Executable architecture baseline OPERATIONAL
- [ ] Risks retired ≥70% (Show Stopper and High 100% retired/mitigated)
- [ ] Requirements baseline ESTABLISHED
- [ ] Master Test Plan APPROVED
- [ ] ABM review conducted with GO/CONDITIONAL GO decision

## Error Handling

**LOM Not Met**:
- Report: "Inception phase incomplete, cannot proceed to Elaboration"
- Action: "Return to Inception flow: /project:flow-concept-to-inception"
- Escalation: "Contact Executive Sponsor for project status"

**Prototype Failed**:
- Report: "Executable architecture baseline not operational"
- Action: "Identify technical blockers, may need architecture pivot"
- Impact: "ABM cannot pass without working prototype"

**Risk Retirement Insufficient**:
- Report: "Risk retirement {percentage}% (target: ≥70%)"
- Action: "Conduct additional spikes, validate assumptions"
- Impact: "ABM blocked until critical risks retired"

**Architecture Not Approved**:
- Report: "SAD not approved by peer reviewer or security architect"
- Action: "Address review feedback, update SAD"
- Impact: "ABM cannot pass without architecture approval"

## Metrics

**Track During Elaboration**:
- Architecture stability: % of architectural changes (target: <10% after ABM)
- Prototype quality: Defects found in prototype (target: <20 open defects)
- Risk retirement velocity: % of risks resolved per week
- Cycle time: Elaboration phase duration (target: 4-8 weeks)

## References

- Gate criteria: `flows/gate-criteria-by-phase.md`
- Architecture template: `analysis-design/software-architecture-doc-template.md`
- Risk management: `management/risk-list-template.md`
- Use case template: `requirements/use-case-spec-template.md`
- Test plan: `test/master-test-plan-template.md`
