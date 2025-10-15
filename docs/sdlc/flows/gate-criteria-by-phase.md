# Gate Criteria by Phase

## Purpose

This document defines specific, measurable exit criteria for each SDLC phase and the gate review process used to validate milestone achievement. Gates prevent premature phase transitions and ensure quality, completeness, and risk management.

## Overview of Lifecycle Milestones

| Phase | Lifecycle Milestone | Primary Goal | Gate Focus |
|-------|---------------------|--------------|------------|
| **Inception** | Lifecycle Objective Milestone (LOM) | Business alignment | Stakeholder consensus + funding |
| **Elaboration** | Architecture Baseline Milestone (ABM) | Technical feasibility | Architecture proven + risks retired |
| **Construction** | Operational Capability Milestone (OCM) | Product readiness | Tests passing + deployment proven |
| **Transition** | Product Release Milestone (PRM) | Production success | Users adopting + support accepting |

## Gate Review Process (All Phases)

### Pre-Gate Review (1-2 weeks before milestone)
1. Compile all required artifacts
2. Self-assess against checklist (identify gaps)
3. Assign owners to close gaps
4. Schedule gate review meeting (required attendees confirmed)
5. Distribute materials to reviewers (at least 3 days before meeting)

### Gate Review Meeting
- **Duration**: 2-3 hours (depending on phase complexity)
- **Format**: Presentation + Q&A + Decision
- **Required Attendees**: See phase-specific sections below
- **Outputs**: Go/No-Go decision recorded in ADR

### Post-Gate Review
- If **GO**: Baseline artifacts, schedule next phase kickoff
- If **CONDITIONAL**: Document conditions, set re-review date
- If **NO-GO**: Document gaps, plan remediation, schedule re-review
- If **CANCEL**: Document reason, conduct lessons learned

---

## Inception Gate: Lifecycle Objective Milestone (LOM)

### Purpose
Achieve stakeholder consensus that the project vision is sound, scope is bounded, risks are acceptable, and funding is committed for at least the Elaboration phase.

### Exit Criteria

#### 1. Vision Documentation COMPLETE
- [ ] Vision document exists (`requirements/vision-template.md` or `vision-informal-template.md`)
- [ ] Vision includes:
  - [ ] Problem statement (clear, specific)
  - [ ] Target personas (at least 2 defined)
  - [ ] Success metrics (at least 3 measurable metrics)
  - [ ] Competitive landscape (alternatives documented)
  - [ ] Constraints (technical, regulatory, budget, timeline)
- [ ] Vision reviewed by Requirements Reviewer
- [ ] Vision APPROVED by Vision Owner (signature + date)

#### 2. Scope Boundaries DEFINED
- [ ] In-scope features listed (high-level, 5-15 items)
- [ ] Out-of-scope explicitly documented (what we WON'T do)
- [ ] Business use cases identified (at least 3-5 use cases via `requirements/use-case-brief-template.md`)
- [ ] Scope validated against timeline and budget
- [ ] RACI matrix created (key roles assigned via `governance/raci-template.md`)

#### 3. Stakeholder Alignment ACHIEVED
- [ ] Key stakeholders identified (minimum 3, typical 5-10)
- [ ] Stakeholder interviews conducted (`requirements/context-free-interview-template.md`)
- [ ] Stakeholder requests logged (`requirements/stakeholder-requests-template.md`)
- [ ] At least 75% of key stakeholders APPROVE vision (signed signoff)
- [ ] Dissenting opinions documented (minority report if applicable)
- [ ] Executive Sponsor APPROVAL obtained (required)

#### 4. Initial Risk Assessment COMPLETE
- [ ] Risk list created (`management/risk-list-template.md`)
- [ ] At least 5-10 risks identified
- [ ] Top 3 risks have:
  - [ ] Probability and impact assessed
  - [ ] Mitigation strategy defined
  - [ ] Owner assigned
  - [ ] Target resolution date (by end of Elaboration)
- [ ] No "Show Stopper" risks without mitigation plans

#### 5. Funding and Business Case APPROVED
- [ ] Business case document exists (`management/business-case-informal-template.md` or `business-case-template.md`)
- [ ] Business case includes:
  - [ ] Cost estimate (ROM - Rough Order of Magnitude, ±50%)
  - [ ] Benefit quantification (ROI, NPV, or other metric)
  - [ ] Timeline estimate (phase durations)
  - [ ] Resource requirements (team size, skills)
- [ ] Funding approved for Elaboration phase (minimum requirement)
- [ ] Conditional funding identified for Construction/Transition (not required, but documented)
- [ ] Financial authority APPROVAL obtained (CFO, Budget Owner, or equivalent)

#### 6. Initial Architecture Scan COMPLETE
- [ ] Technology stack proposed (major technologies listed)
- [ ] Deployment target identified (cloud, on-prem, hybrid)
- [ ] Integration points identified (external systems, APIs)
- [ ] Data classification completed (`security/data-classification-template.md`)
- [ ] Security screening performed (no Show Stopper security concerns)
- [ ] Architecture Feasibility: "Yes, this is buildable" (Architect signoff)

#### 7. Governance Established
- [ ] Project Manager assigned
- [ ] Core team identified (architect, analysts, etc.)
- [ ] Communication plan defined (meeting cadence, status reports)
- [ ] Decision-making authority defined (who decides what)
- [ ] Escalation path defined (`deployment/escalation-matrix-template.md`)

### Gate Review Meeting

**Required Attendees**:
- Executive Sponsor (decision authority)
- Vision Owner
- Project Manager
- Software Architect
- Requirements Analyst
- Key Stakeholders (at least 3)

**Agenda** (2 hours):
1. Vision presentation (15 min) - Vision Owner presents
2. Scope and risks review (20 min) - Project Manager presents
3. Business case review (15 min) - Product Strategist presents
4. Architecture scan (15 min) - Software Architect presents
5. Q&A and discussion (30 min)
6. Go/No-Go decision (15 min)
7. Action items and next steps (10 min)

**Decision Outcomes**:
- **GO to Elaboration**: All criteria met, approval signatures obtained
- **CONDITIONAL GO**: Minor gaps exist, specific conditions defined, re-review date set
- **NO-GO**: Major gaps exist, return to Inception work, re-review in 2-4 weeks
- **CANCEL PROJECT**: Vision not viable, business case weak, project terminated

### Success Metrics
- **Cycle Time**: Inception phase duration (target: 2-4 weeks)
- **Rework Rate**: % of LOM reviews that result in NO-GO (target: <20%)
- **Stakeholder Satisfaction**: Post-LOM survey score (target: ≥4/5)

### Common Failure Modes

**Unclear Vision**: Stakeholders cannot articulate problem or success metrics
- **Remediation**: Return to intake, conduct more stakeholder interviews

**Scope Creep Already Visible**: Scope is vague, "everything is in scope"
- **Remediation**: Scope refinement workshop, MoSCoW prioritization

**Unfunded Mandate**: Vision approved but no budget allocated
- **Remediation**: Strengthen business case, executive escalation

**Hidden Risks**: Major risks discovered in Elaboration that should have been caught
- **Remediation**: Improve risk identification process, bring in domain experts

---

## Elaboration Gate: Architecture Baseline Milestone (ABM)

### Purpose
Prove that the proposed architecture is viable, requirements are sufficiently elaborated, and major risks are retired or mitigated such that full-scale construction can proceed with confidence.

### Exit Criteria

#### 1. Architecture Documentation COMPLETE
- [ ] Software Architecture Document exists (`analysis-design/software-architecture-doc-template.md`)
- [ ] SAD includes:
  - [ ] Architectural drivers (quality attributes, constraints)
  - [ ] Component decomposition (logical and physical views)
  - [ ] Deployment architecture (environments, infrastructure)
  - [ ] Key architectural decisions (ADRs for major choices via `architecture-decision-record-template.md`)
  - [ ] Technology stack (languages, frameworks, databases, tools)
  - [ ] Integration architecture (external systems, APIs, protocols)
  - [ ] Security architecture (authentication, authorization, encryption)
  - [ ] Data architecture (data models, storage, migration)
- [ ] SAD reviewed by peer architects (at least 1 external review)
- [ ] SAD APPROVED by Software Architect and Security Architect
- [ ] SAD BASELINED (version control, immutable for Construction)

#### 2. Architectural Prototype OPERATIONAL
- [ ] Prototype implements "steel thread" (end-to-end skeleton)
- [ ] Prototype demonstrates:
  - [ ] At least 2 architecturally significant use cases
  - [ ] Key architectural patterns (layering, modularity, etc.)
  - [ ] Integration with at least 1 external system (if applicable)
  - [ ] Security mechanisms (authentication/authorization)
  - [ ] Data persistence and retrieval
- [ ] Prototype is EXECUTABLE:
  - [ ] Runs in development environment
  - [ ] Runs in CI/CD pipeline (automated build)
  - [ ] Can be deployed to test environment (automated deployment)
- [ ] Prototype has automated tests:
  - [ ] Unit tests passing (coverage ≥ 60%)
  - [ ] Integration tests passing (key paths covered)
  - [ ] Performance baseline established (load test results)
- [ ] Prototype code reviewed and meets coding standards

#### 3. Requirements Baseline ESTABLISHED
- [ ] Use-case specifications written (`requirements/use-case-spec-template.md`):
  - [ ] At least 10 use cases documented (enough for 2-3 Construction iterations)
  - [ ] Top 3 use cases are "architecturally significant" (covered by prototype)
  - [ ] Acceptance criteria defined for each use case
- [ ] Supplementary specification complete (`requirements/supplementary-spec-template.md`):
  - [ ] Non-functional requirements (NFRs) documented:
    - [ ] Performance (response time, throughput)
    - [ ] Scalability (concurrent users, data volume)
    - [ ] Availability (uptime target, SLA)
    - [ ] Security (authentication, authorization, audit)
    - [ ] Usability (accessibility, internationalization)
    - [ ] Maintainability (coding standards, documentation)
  - [ ] Constraints documented (technical, regulatory, business)
- [ ] Requirements traceability matrix seeded (requirements → components)
- [ ] Requirements BASELINED (no changes without change control)

#### 4. Risk Retirement ACHIEVED
- [ ] Risk list updated (`management/risk-list-template.md`)
- [ ] All "Show Stopper" (P0) risks: RETIRED or have approved mitigation
- [ ] All "High" (P1) architectural risks: RETIRED or have approved mitigation
- [ ] At least 70% of identified risks: RETIRED or mitigated
- [ ] Remaining risks:
  - [ ] Assessed as acceptable (within risk tolerance)
  - [ ] Have owners assigned
  - [ ] Have monitoring plan (how we'll track)
- [ ] Top 3 risks from Inception: RESOLVED (specific validation)
- [ ] New risks identified during Elaboration: ASSESSED

#### 5. Test Strategy DEFINED
- [ ] Master Test Plan complete (`test/master-test-plan-template.md`)
- [ ] Test strategy includes:
  - [ ] Test types (unit, integration, system, acceptance, performance, security)
  - [ ] Test coverage targets (unit ≥80%, integration ≥70%, e2e ≥50%)
  - [ ] Test environments (dev, test, staging, prod)
  - [ ] Test data strategy (synthetic, anonymized, production-like)
  - [ ] Test automation approach (frameworks, tools, CI integration)
  - [ ] Defect management process (triage, tracking, resolution)
- [ ] Test strategy APPROVED by Test Architect
- [ ] Test environments OPERATIONAL (at least dev and test)

#### 6. Configuration Management OPERATIONAL
- [ ] Configuration Management Plan complete (`governance/configuration-management-plan-template.md`)
- [ ] CM practices include:
  - [ ] Version control strategy (branching, merging, tagging)
  - [ ] Baseline management (how artifacts are baselined)
  - [ ] Change control process (how changes are approved)
  - [ ] Build automation (CI/CD pipeline operational)
  - [ ] Artifact repository (where deliverables are stored)
- [ ] CM tools operational (Git, CI/CD, artifact repo)
- [ ] Team trained on CM practices

#### 7. Development Process TAILORED
- [ ] Development Case complete (`environment/development-case-template.md`)
- [ ] Development case tailors:
  - [ ] Iteration length (1 week? 2 weeks? sprint?)
  - [ ] Ceremonies (standups, reviews, retrospectives)
  - [ ] Roles and responsibilities (RACI updated)
  - [ ] Artifact requirements (which templates are required vs optional)
  - [ ] Review and approval process (peer review, architectural review)
- [ ] Guidelines updated:
  - [ ] Design guidelines (`environment/design-guidelines-template.md`)
  - [ ] Programming guidelines (`environment/programming-guidelines-template.md`)
  - [ ] Test guidelines (`environment/test-guidelines-template.md`)
- [ ] Team trained on process

#### 8. Iteration Plans PREPARED
- [ ] First 2 Construction iterations planned (`management/iteration-plan-template.md`)
- [ ] Iteration plans include:
  - [ ] Objectives (what will be delivered)
  - [ ] Work items (requirements, design, implementation, test)
  - [ ] Resource allocation (who works on what)
  - [ ] Dependencies (blocking items identified)
  - [ ] Success criteria (how we'll know it's done)
- [ ] Backlog prioritized (ready backlog ≥ 2 iterations of work)

### Gate Review Meeting

**Required Attendees**:
- Executive Sponsor
- Vision Owner / Product Owner
- Project Manager
- Software Architect
- Requirements Analyst
- Test Architect
- Configuration Manager
- Key Stakeholders (at least 2)
- Peer Architect (external reviewer)

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

### Success Metrics
- **Architecture Stability**: % of architectural changes during Construction (target: <10%)
- **Prototype Quality**: Defects found in prototype (target: <20 open defects)
- **Risk Retirement**: % of risks resolved (target: ≥70%)
- **Cycle Time**: Elaboration phase duration (target: 4-8 weeks)

### Common Failure Modes

**Analysis Paralysis**: Elaboration drags on, endless refinement, no prototype
- **Remediation**: Timebox Elaboration (max 8 weeks), force decision

**Premature Construction**: Rush to code, skip architecture validation
- **Remediation**: Enforce ABM criteria, demonstrate prototype before proceeding

**Prototype Is Not Architectural**: Prototype is "toy app" that doesn't prove architecture
- **Remediation**: Select architecturally significant use cases, go deep not wide

**Requirements Instability**: Requirements keep changing during Elaboration
- **Remediation**: Baseline requirements, implement change control process

---

## Construction Gate: Operational Capability Milestone (OCM)

### Purpose
Deliver a feature-complete, tested, deployable product that meets acceptance criteria and is ready for production release pending final transition activities (training, cutover, handover).

### Exit Criteria

#### 1. Feature Completeness ACHIEVED
- [ ] All planned features implemented (per iteration plans)
- [ ] All use cases have passing acceptance tests
- [ ] Feature parity with requirements baseline (100% of "Must Have", ≥80% of "Should Have")
- [ ] Feature toggle configuration complete (for phased rollout if applicable)
- [ ] Traceability complete (requirements → design → code → tests)

#### 2. Test Coverage and Quality VALIDATED
- [ ] Unit test coverage ≥ 80% (or per project standard from Master Test Plan)
- [ ] Integration test coverage ≥ 70%
- [ ] End-to-end test coverage ≥ 50% (critical paths 100%)
- [ ] Performance tests passing:
  - [ ] Response time meets SLA (e.g., p95 < 500ms)
  - [ ] Throughput meets target (e.g., 1000 req/s)
  - [ ] Concurrent users supported (e.g., 10k users)
- [ ] Security tests passing:
  - [ ] No High or Critical vulnerabilities (SAST, DAST, dependency scan)
  - [ ] Penetration testing complete (if required)
  - [ ] Security review APPROVED by Security Gatekeeper
- [ ] Regression suite green (all tests passing)
- [ ] Test evidence documented (`test/test-evaluation-summary-template.md`)

#### 3. Defect Management COMPLETE
- [ ] Zero P0 (Show Stopper) defects open
- [ ] Zero P1 (High) defects open OR all have approved waivers with mitigation
- [ ] P2 (Medium) defects: Documented, owners assigned, scheduled for post-release
- [ ] P3/P4 (Low) defects: Documented, backlog prioritized, no release blocker
- [ ] Defect density within acceptable range:
  - [ ] Target: < 1 defect per 1000 lines of code (or per project standard)
- [ ] Defect trend: Declining (not increasing)
- [ ] Known issues documented (in release notes)

#### 4. Deployment Pipeline PROVEN
- [ ] CI/CD pipeline operational (automated build, test, deploy)
- [ ] Successful deployments to all environments:
  - [ ] Development: Continuous deployment working
  - [ ] Test: Automated deployment working
  - [ ] Staging: Automated deployment working (production-like)
  - [ ] Production: Deployment procedure validated (at least 1 dry run)
- [ ] Rollback procedure tested and successful:
  - [ ] Staged rollback test performed (at least once)
  - [ ] Rollback time within SLA (target: < 30 minutes)
  - [ ] Rollback does not lose data
- [ ] Blue/green or canary deployment configured (if applicable)
- [ ] Deployment automation code reviewed and approved
- [ ] Deployment plan complete (`deployment/deployment-plan-template.md`)

#### 5. Operational Readiness VALIDATED
- [ ] Operational Readiness Review (ORR) conducted and PASSED
- [ ] Production environment provisioned and tested:
  - [ ] Infrastructure capacity validated (compute, storage, network)
  - [ ] Scalability tested (can handle expected load + 20% buffer)
  - [ ] High availability configured (redundancy, failover)
- [ ] Monitoring and alerting operational:
  - [ ] SLIs/SLOs defined (`deployment/sli-card.md`)
  - [ ] Alerts configured (`deployment/alert-runbook-card.md`)
  - [ ] Dashboards operational (metrics visible)
  - [ ] Log aggregation working (structured logs, searchable)
- [ ] Incident response procedures defined:
  - [ ] Runbooks complete (`deployment/runbook-entry-card.md`)
  - [ ] On-call rotation staffed (if applicable)
  - [ ] Escalation paths defined
- [ ] Backup and restore tested:
  - [ ] Backup procedures automated
  - [ ] Restore test successful (RTO/RPO validated)
- [ ] Disaster recovery plan defined (if applicable)

#### 6. Documentation COMPLETE
- [ ] User documentation complete (if applicable):
  - [ ] User guides
  - [ ] Online help
  - [ ] FAQs
- [ ] API documentation complete (if applicable):
  - [ ] API reference (OpenAPI/Swagger)
  - [ ] Integration guides
  - [ ] SDKs or client libraries
- [ ] Operational documentation complete:
  - [ ] Runbooks (`deployment/support-runbook-template.md`)
  - [ ] Architecture diagrams (as-built)
  - [ ] Configuration guide
  - [ ] Troubleshooting guide
- [ ] Release notes complete (`deployment/release-notes-template.md`):
  - [ ] New features
  - [ ] Bug fixes
  - [ ] Known issues
  - [ ] Upgrade instructions (if applicable)
- [ ] Bill of Materials complete (`deployment/bill-of-materials-template.md`):
  - [ ] Software components (versions)
  - [ ] Dependencies (libraries, services)
  - [ ] Licenses (compliance check)

#### 7. Support Readiness ACHIEVED
- [ ] Support team trained:
  - [ ] Training sessions conducted
  - [ ] Training materials delivered
  - [ ] Hands-on practice completed
- [ ] Support infrastructure operational:
  - [ ] Support portal/ticketing system ready
  - [ ] Support knowledge base populated
  - [ ] Support escalation procedures defined
- [ ] Support handover meeting conducted
- [ ] Support Lead ACCEPTANCE signature obtained

#### 8. Security and Compliance VALIDATED
- [ ] Security review complete:
  - [ ] Threat model reviewed (no unmitigated High risks)
  - [ ] Security testing complete (SAST, DAST, pen test)
  - [ ] Security controls validated (authentication, authorization, encryption)
- [ ] Privacy review complete (if handling PII/PCI/PHI):
  - [ ] Data minimization validated
  - [ ] Consent mechanisms operational
  - [ ] Data retention and deletion procedures defined
- [ ] Compliance checks passed:
  - [ ] Regulatory requirements met (SOC2, HIPAA, GDPR, etc.)
  - [ ] Audit trail operational (if required)
  - [ ] Compliance documentation complete
- [ ] Security Gatekeeper APPROVAL obtained

### Gate Review Meeting

**Required Attendees**:
- Executive Sponsor
- Product Owner
- Project Manager
- Deployment Manager
- Software Architect
- Test Architect
- Security Gatekeeper
- Reliability Engineer
- Support Lead
- Operations Representative
- Key Stakeholders (at least 2)

**Agenda** (3 hours):
1. Feature completeness review (20 min) - Product Owner presents
2. Test results presentation (30 min) - Test Architect presents
3. Defect status review (20 min) - Project Manager presents
4. Deployment readiness (20 min) - Deployment Manager presents
5. Operational readiness (20 min) - Reliability Engineer presents
6. Support readiness (15 min) - Support Lead presents
7. Security and compliance (15 min) - Security Gatekeeper presents
8. Q&A and discussion (30 min)
9. Go/No-Go decision (15 min)

**Decision Outcomes**:
- **GO to Transition**: All criteria met, ready for production deployment
- **CONDITIONAL GO**: Minor gaps, proceed with specific mitigation plans
- **NO-GO**: Major gaps, additional Construction sprint required
- **DEFER RELEASE**: Product complete but market timing wrong (business decision)

### Success Metrics
- **Test Pass Rate**: % tests passing (target: ≥98%)
- **Defect Escape Rate**: Defects found in production (target: <5 per quarter)
- **Deployment Success Rate**: % successful deploys (target: ≥95%)
- **Mean Time to Recovery (MTTR)**: If rollback needed (target: <30 min)

### Common Failure Modes

**Last-Minute Defects**: Critical defects discovered just before OCM
- **Remediation**: Final regression sprint, extend Construction if P0/P1 defects

**Operational Unreadiness**: Product works but operations isn't ready (monitoring, runbooks, training)
- **Remediation**: Extend Construction, complete operational artifacts, re-train support

**Performance Surprises**: Performance tests fail at scale
- **Remediation**: Performance tuning sprint, architecture optimization (may be significant)

**Security Vulnerabilities**: Security scan reveals High/Critical vulnerabilities
- **Remediation**: Emergency security patching, may require architecture changes

---

## Transition Gate: Product Release Milestone (PRM)

### Purpose
Successfully transition the product to production use, validate that users can effectively use the system, confirm operational stability, and formally hand over to support and operations teams.

### Exit Criteria

#### 1. Production Deployment SUCCESSFUL
- [ ] Production deployment completed (deployed to production environment)
- [ ] Smoke tests passed post-deployment (critical paths validated)
- [ ] Production health checks green:
  - [ ] All services running
  - [ ] No critical errors in logs (first 1 hour)
  - [ ] Monitoring dashboards green
- [ ] Rollback plan validated (ready to execute if needed)
- [ ] Production access controls validated (only authorized users)

#### 2. Production Stability DEMONSTRATED
- [ ] Hypercare period completed (typical: 7 days post-launch)
- [ ] System stable:
  - [ ] No P0/P1 incidents (zero Show Stoppers, zero High)
  - [ ] Error rates within acceptable range (< 0.1% of requests)
  - [ ] Performance metrics meeting SLA targets:
    - [ ] Response time: p95 < SLA threshold
    - [ ] Availability: ≥ SLA target (e.g., 99.9%)
    - [ ] Throughput: Handling production load
  - [ ] No capacity issues (CPU, memory, disk, network all < 70% utilization)
- [ ] SLO compliance: Meeting or exceeding SLOs (first week)

#### 3. User Adoption VALIDATED
- [ ] User training completed:
  - [ ] All user roles trained (at least 1 representative per role)
  - [ ] Training materials delivered (guides, videos, job aids)
  - [ ] Training effectiveness validated (quiz, hands-on exercise, or certification)
- [ ] User acceptance testing (UAT) passed:
  - [ ] Key users performed UAT in production environment
  - [ ] UAT acceptance criteria met (≥90% of scenarios successful)
  - [ ] Product Acceptance Plan completed (`deployment/product-acceptance-plan-template.md`)
- [ ] User feedback captured:
  - [ ] Initial user feedback collected (survey, interviews)
  - [ ] Critical usability issues addressed or planned
  - [ ] User satisfaction score ≥ 4/5 (or equivalent)
- [ ] User adoption metrics positive (if measurable):
  - [ ] Target number of users onboarded
  - [ ] Active usage rate (daily/weekly active users)
  - [ ] Feature adoption rate (key features being used)

#### 4. Support Handover ACCEPTED
- [ ] Support team trained and operational:
  - [ ] Support training completed (all support staff trained)
  - [ ] Support has access to production systems (with appropriate permissions)
  - [ ] Support runbooks validated (support team tested procedures)
  - [ ] Support team successfully resolved at least 3 practice incidents
- [ ] Support infrastructure operational:
  - [ ] Support ticketing system integrated
  - [ ] Support knowledge base populated
  - [ ] Support escalation procedures validated (test escalation performed)
- [ ] Support handover meeting conducted:
  - [ ] Development team presents product to support team
  - [ ] Known issues reviewed
  - [ ] Common troubleshooting scenarios reviewed
  - [ ] Support team questions answered
- [ ] Support Lead FORMAL ACCEPTANCE:
  - [ ] Support Lead signs handover acceptance document
  - [ ] Support team confirms readiness to own production support
  - [ ] On-call rotation staffed (if applicable)

#### 5. Operational Handover ACCEPTED
- [ ] Operations team trained and operational:
  - [ ] Operations team trained on deployment, monitoring, incident response
  - [ ] Operations has access to infrastructure and monitoring tools
  - [ ] Operations successfully performed at least 1 deployment independently
- [ ] Operational procedures validated:
  - [ ] Runbooks tested and working
  - [ ] Backup and restore procedures validated
  - [ ] Disaster recovery procedures validated (if applicable)
  - [ ] Scaling procedures validated (if applicable)
- [ ] Monitoring and alerting validated:
  - [ ] All critical alerts firing correctly (validated during hypercare)
  - [ ] Alert noise minimized (false positive rate < 5%)
  - [ ] On-call team responding to alerts effectively
- [ ] Operations Lead FORMAL ACCEPTANCE:
  - [ ] Operations Lead signs handover acceptance document
  - [ ] Operations team confirms readiness to own production operations

#### 6. Release Criteria VALIDATED
- [ ] All planned features delivered (100% of "Must Have", documented % of "Should Have")
- [ ] All acceptance tests passing (≥98%)
- [ ] No open P0 or P1 defects
- [ ] Production performance meeting SLAs
- [ ] Security posture validated (no High/Critical vulnerabilities)
- [ ] Compliance requirements met (audit evidence collected)
- [ ] Stakeholder acceptance obtained (Product Owner signoff)

#### 7. Documentation FINALIZED
- [ ] Release notes published:
  - [ ] User-facing release notes (what's new, what's fixed)
  - [ ] Internal release notes (technical changes)
  - [ ] Known issues documented
- [ ] Post-release documentation updated:
  - [ ] User documentation reflects production behavior
  - [ ] API documentation accurate
  - [ ] Runbooks updated based on hypercare learnings
- [ ] Project closure documentation:
  - [ ] Final status assessment (`management/status-assessment-template.md`)
  - [ ] Lessons learned captured (retrospective)
  - [ ] Project metrics finalized (actual vs planned: cost, schedule, quality)
  - [ ] Artifacts archived (per CM plan)

#### 8. Business Value VALIDATED
- [ ] Success metrics tracked:
  - [ ] Baseline metrics captured (pre-release)
  - [ ] Post-release metrics captured (1 week post-launch)
  - [ ] Metrics trending positive or as expected
- [ ] Business case revisited:
  - [ ] Projected benefits on track (early indicators)
  - [ ] ROI forecast updated (based on actuals)
- [ ] Stakeholder satisfaction:
  - [ ] Executive Sponsor signoff on release success
  - [ ] Key stakeholders satisfied with outcome

### Gate Review Meeting

**Required Attendees**:
- Executive Sponsor
- Product Owner
- Project Manager
- Deployment Manager
- Support Lead
- Operations Lead
- Reliability Engineer
- Key Stakeholders (at least 2)

**Agenda** (Week 2 post-launch, 2 hours):
1. Production stability report (20 min) - Reliability Engineer presents
2. User adoption report (15 min) - Product Owner presents
3. Support handover status (15 min) - Support Lead presents
4. Operations handover status (15 min) - Operations Lead presents
5. Known issues and roadmap (15 min) - Project Manager presents
6. Business value validation (15 min) - Executive Sponsor reviews
7. Lessons learned preview (15 min) - Project Manager presents
8. Project closure decision (15 min)

**Decision Outcomes**:
- **PROJECT COMPLETE**: All criteria met, formal project closure
- **EXTENDED HYPERCARE**: Need more time to validate stability (extend 1-2 weeks)
- **ISSUES DETECTED**: Production issues require additional work (back to Construction)
- **ROLLBACK**: Critical issues, roll back deployment (escalation, executive decision)

### Success Metrics
- **Production Stability**: Zero P0/P1 incidents in first week (target: 100%)
- **User Adoption**: ≥ target number of active users (per product goals)
- **Support Effectiveness**: Mean Time to Resolution (MTTR) < target (e.g., <4 hours for P1)
- **Stakeholder Satisfaction**: Post-release survey score ≥ 4/5

### Common Failure Modes

**Production Outage**: Critical production issue within first week
- **Remediation**: Emergency hotfix or rollback, root cause analysis, process improvement

**User Rejection**: Users refuse to use new system, adoption rate low
- **Remediation**: Additional training, usability improvements, stakeholder re-engagement

**Support Overwhelmed**: Support ticket backlog growing, long resolution times
- **Remediation**: Additional support training, runbook improvements, defect hotfixes

**Performance Degradation**: Performance acceptable in staging but poor in production
- **Remediation**: Performance tuning, scaling infrastructure, query optimization

---

## Summary and Integration

### Milestone Comparison

| Milestone | Phase | Primary Goal | Key Validation | Typical Duration |
|-----------|-------|--------------|----------------|------------------|
| LOM | Inception | Business alignment | Stakeholder consensus + funding | 2-4 weeks |
| ABM | Elaboration | Technical feasibility | Architecture proven + risks retired | 4-8 weeks |
| OCM | Construction | Product readiness | Tests passing + deployment proven | 8-16 weeks |
| PRM | Transition | Production success | Users adopting + support accepting | 1-2 weeks |

### Gate Decision Authority

| Gate | Primary Decision Maker | Required Approvers | Can Veto |
|------|------------------------|-------------------|----------|
| LOM | Executive Sponsor | Vision Owner, Financial Authority | Any required approver |
| ABM | Software Architect | Project Manager, Test Architect | Security Architect, Executive Sponsor |
| OCM | Deployment Manager | Product Owner, Security Gatekeeper, Reliability Engineer | Any required approver |
| PRM | Product Owner | Support Lead, Operations Lead, Executive Sponsor | Executive Sponsor |

### Gate Integration with Templates

Each gate references specific templates that must be completed:
- **Inception**: Intake templates, vision templates, business case, initial risk list
- **Elaboration**: Architecture doc, use-case specs, test plan, CM plan, development case
- **Construction**: Test evidence, deployment plan, release notes, runbooks, ORR
- **Transition**: Product acceptance plan, status assessment, support handover docs

### Tailoring Guidance

**For Small Projects** (< 3 months, < 5 people):
- Combine Inception and Elaboration (2-week timeboxed phase)
- Use informal templates (vision-informal, business-case-informal)
- Simplified gate reviews (1-hour meetings)
- Reduced artifact count (focus on critical templates)

**For Large Projects** (> 12 months, > 20 people):
- Add intermediate checkpoints (mid-Elaboration review, mid-Construction review)
- Require formal templates and extensive documentation
- External peer reviews at each gate
- Phased releases (multiple Construction → Transition cycles)

**For Continuous Delivery**:
- Inception and Elaboration once per product
- Construction and Transition per feature/release
- Automated gate validation where possible
- Lightweight gate reviews (automated checklists)

## References

- Phase definitions: See `docs/sdlc/plan-act-sdlc.md`
- Handoff checklists: See `handoff-checklist-template.md`
- Template directory: `docs/sdlc/templates/`
- Iteration flows: See `iteration-dual-track-template.md`
