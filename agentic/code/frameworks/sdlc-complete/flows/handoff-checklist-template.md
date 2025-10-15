# Handoff Checklist Template

## Overview

This template provides a structured checklist for handing off work between phases, disciplines, or teams. Use phase-specific sections based on the type of handoff.

## Handoff Context

- **From**: [Sending phase/team/agent]
- **To**: [Receiving phase/team/agent]
- **Work Items**: [IDs, names, or epic/feature references]
- **Handoff Type**: [Phase transition | Discovery → Delivery | Delivery → Operations | Other]
- **Handoff Date**: [YYYY-MM-DD]
- **Handoff Lead**: [Name/Role]
- **Reviewers**: [Names/Roles]
- **Due Date**: [YYYY-MM-DD]
- **Dependencies**: [Blocking items, prerequisites, external dependencies]

## Phase Transition Handoffs

### Inception → Elaboration Handoff (Lifecycle Objective Milestone)

#### Required Artifacts
- [ ] Business Vision (`business-modeling/business-vision-template.md`) - APPROVED by Vision Owner
- [ ] Project Intake (`intake/project-intake-template.md`) - COMPLETE
- [ ] Vision Document (`requirements/vision-informal-template.md` or `vision-template.md`) - BASELINED
- [ ] Initial Risk List (`management/risk-list-template.md`) - 3-10 risks identified, top 3 assigned owners
- [ ] Business Case (`management/business-case-informal-template.md`) - APPROVED by funding authority
- [ ] Stakeholder Requests Log (`requirements/stakeholder-requests-template.md`) - Initial set captured

#### Optional Artifacts (If Applicable)
- [ ] Option Matrix (`intake/option-matrix-template.md`) - If alternatives evaluated
- [ ] Solution Profile (`intake/solution-profile-template.md`) - If solution direction proposed
- [ ] Business Glossary (`requirements/glossary-template.md`) - If domain is complex

#### Approval Requirements
- [ ] Vision Owner signoff on vision documents
- [ ] Executive Sponsor signoff on business case
- [ ] Security Architect signoff on data classification initial scan
- [ ] At least 3 key stakeholders signoff on vision

#### Quality Gates
- [ ] All "Critical" risks have mitigation plans
- [ ] Success metrics are measurable and have baselines
- [ ] Funding is approved for at least Elaboration phase
- [ ] No "Show Stopper" issues remain open

#### Decision Point
- [ ] Go/No-Go decision recorded in Decision Log (ADR)
- [ ] If No-Go: Reason documented, project closed or returned to Intake

---

### Elaboration → Construction Handoff (Architecture Baseline Milestone)

#### Required Artifacts
- [ ] Software Architecture Document (`analysis-design/software-architecture-doc-template.md`) - BASELINED
- [ ] Architectural Prototype - EXECUTABLE (running in dev environment)
- [ ] Use-Case Specifications (`requirements/use-case-spec-template.md`) - Top 10 priority use cases COMPLETE
- [ ] Supplementary Specification (`requirements/supplementary-spec-template.md`) - NFRs defined
- [ ] Risk List (`management/risk-list-template.md`) - Top 3 architectural risks RETIRED
- [ ] Master Test Plan (`test/master-test-plan-template.md`) - APPROVED
- [ ] Configuration Management Plan (`governance/configuration-management-plan-template.md`) - APPROVED
- [ ] Development Case (`environment/development-case-template.md`) - Process tailored and approved
- [ ] Iteration Plan for Construction (`management/iteration-plan-template.md`) - First 2 iterations planned

#### Architecture Validation
- [ ] Architecture review conducted (attendees: Architect, Tech Leads, Security Architect)
- [ ] Component boundaries defined (`analysis-design/interface-contract-card.md` for key interfaces)
- [ ] Technology stack approved (ADRs for major tech choices)
- [ ] Deployment architecture sketched (environments defined)

#### Prototype Validation
- [ ] Prototype demonstrates key architectural patterns
- [ ] Prototype includes at least 2 use-case realizations
- [ ] Prototype has passing unit and integration tests
- [ ] Prototype can be deployed via automation (CI/CD)

#### Requirements Readiness
- [ ] At least 20 requirements baselined (enough for 2-3 iterations)
- [ ] Traceability matrix seeded (requirements → components)
- [ ] Acceptance criteria defined for prioritized use cases

#### Test Readiness
- [ ] Test strategy approved by Test Architect
- [ ] Test environments provisioned (dev, test, staging)
- [ ] Test data strategy defined
- [ ] Automated test framework operational

#### Risk Validation
- [ ] All "Show Stopper" and "High" architectural risks resolved or have mitigation in place
- [ ] Remaining risks have owners and tracking mechanism
- [ ] New risks identified during Elaboration are assessed

#### Approval Requirements
- [ ] Software Architect signoff on architecture baseline
- [ ] Project Manager signoff on iteration plans
- [ ] Configuration Manager signoff on CM plan
- [ ] Test Architect signoff on test strategy

#### Decision Point
- [ ] Go/No-Go to Construction recorded in Decision Log
- [ ] If No-Go: Specific gaps documented, additional Elaboration iteration planned

---

### Construction → Transition Handoff (Operational Capability Milestone)

#### Feature Completeness
- [ ] All planned features implemented (per iteration plans)
- [ ] All use cases have passing acceptance tests
- [ ] Traceability complete (requirements → code → tests)
- [ ] Technical debt documented and acceptable (per quality gates)

#### Test Validation
- [ ] Unit test coverage ≥ 80% (or per project standard)
- [ ] Integration tests passing 100%
- [ ] End-to-end tests passing ≥ 95%
- [ ] Performance tests meet SLA targets
- [ ] Security tests passing (no High/Critical vulnerabilities)
- [ ] Regression suite green

#### Defect Status
- [ ] Zero P0 (Show Stopper) defects open
- [ ] Zero P1 (High) defects open OR all have approved waivers
- [ ] P2 (Medium) defects documented, owners assigned, scheduled for future iterations
- [ ] P3/P4 (Low) defects documented, backlog prioritized
- [ ] Defect density within acceptable range (per measurement plan)

#### Deployment Validation
- [ ] Deployment pipeline automated (CI/CD operational)
- [ ] Successful deployments to staging environment (at least 3 successful deploys)
- [ ] Rollback procedure tested and successful (at least 1 rollback test)
- [ ] Blue/green or canary deployment strategy defined (if applicable)
- [ ] Feature flags operational (if applicable)

#### Operational Readiness
- [ ] Operational Readiness Review (ORR) conducted and PASSED
- [ ] Production environment provisioned and tested
- [ ] Monitoring and alerting operational (SLIs/SLOs defined via `deployment/sli-card.md`)
- [ ] Support runbooks complete (`deployment/support-runbook-template.md`)
- [ ] Incident response procedures defined
- [ ] Backup/restore tested

#### Documentation Completeness
- [ ] Release Notes complete (`deployment/release-notes-template.md`)
- [ ] User documentation complete (if applicable)
- [ ] API documentation complete (if applicable)
- [ ] Deployment Plan complete (`deployment/deployment-plan-template.md`)
- [ ] Bill of Materials complete (`deployment/bill-of-materials-template.md`)

#### Support Readiness
- [ ] Support team trained (training materials delivered)
- [ ] Support FAQs created
- [ ] Escalation paths defined (`deployment/escalation-matrix-template.md`)
- [ ] On-call rotation staffed (if applicable)

#### Security & Compliance
- [ ] Security review complete (no High/Critical findings unresolved)
- [ ] Privacy review complete (if handling PII/PCI/PHI)
- [ ] Compliance checks passed (regulatory requirements met)
- [ ] Security runbooks complete (incident response)

#### Approval Requirements
- [ ] Deployment Manager signoff on deployment readiness
- [ ] Support Lead signoff on support readiness
- [ ] Security Gatekeeper signoff on security posture
- [ ] Reliability Engineer signoff on SRE readiness
- [ ] Product Owner signoff on feature completeness

#### Decision Point
- [ ] Go/No-Go to Production recorded in Decision Log
- [ ] If No-Go: Specific gaps documented, additional Construction work planned
- [ ] Rollback plan confirmed and approved

---

### Transition → Production Handoff (Product Release Milestone)

#### Production Deployment
- [ ] Production deployment completed successfully
- [ ] Smoke tests passed post-deployment
- [ ] Production health checks green
- [ ] Rollback plan validated (ready to execute if needed)
- [ ] Production access controls validated

#### Production Stability (Hypercare Period: 7 days)
- [ ] System stable for 24 hours (no P0/P1 incidents)
- [ ] Error rates within acceptable range (per SLOs)
- [ ] Performance metrics meeting SLA targets
- [ ] No critical security alerts
- [ ] User adoption metrics positive (if measurable)

#### User Readiness
- [ ] User training completed (all user roles trained)
- [ ] User documentation published and accessible
- [ ] User feedback mechanism operational
- [ ] Product Acceptance Plan completed (`deployment/product-acceptance-plan-template.md`)

#### Support Handover
- [ ] Support team training complete
- [ ] Support has access to production systems
- [ ] Support runbooks validated with support team
- [ ] Support Lead FORMAL ACCEPTANCE signature obtained

#### Approval Requirements
- [ ] Product Owner signoff on acceptance
- [ ] Deployment Manager signoff on production stability
- [ ] Support Lead signoff on support readiness
- [ ] Project Manager signoff on project closure

#### Decision Point
- [ ] Project officially closed OR
- [ ] Transition to maintenance mode (ongoing support only) OR
- [ ] Next iteration/release planned (continuous delivery)

## Iteration-Level Handoffs

### Discovery → Delivery Handoff (Definition of Ready)

A work item is READY for delivery when:

#### Documentation Complete
- [ ] Use-case specification OR user story is written (`requirements/use-case-brief-template.md` or `user-story-card.md`)
- [ ] Acceptance criteria are testable and specific
- [ ] Interface contracts defined (`requirements/data-contract-template.md`, API specs, data models)
- [ ] Dependencies identified and documented (`management/dependency-card.md`)
- [ ] Related risks assessed (`management/risk-card.md` - no unmitigated High risks)
- [ ] Architectural decisions documented (`analysis-design/architecture-decision-record-template.md` if needed)

#### Clarity Validated
- [ ] Requirements reviewed by Requirements Reviewer
- [ ] Ambiguities resolved (no open questions)
- [ ] Acceptance criteria reviewed by Test Architect
- [ ] Design sketches provided (if complex)

#### Sizing and Prioritization
- [ ] Work item sized (story points, hours, or t-shirt size)
- [ ] Priority assigned (MoSCoW, numeric, or backlog rank)
- [ ] Iteration target identified (which sprint/iteration?)

#### Technical Feasibility
- [ ] Architectural impact assessed (changes to architecture?)
- [ ] Technology choices approved (no new tech without ADR)
- [ ] Test approach defined (unit, integration, e2e strategy)
- [ ] Performance/security implications evaluated

#### Traceability
- [ ] Linked to parent requirement or epic
- [ ] Linked to business value or OKR
- [ ] Traceability IDs assigned

#### Approval
- [ ] Requirements Reviewer signoff
- [ ] Product Owner prioritization confirmed
- [ ] Development team accepts (team pulls from ready backlog)

---

### Delivery → Operations Handoff (Definition of Done)

A work item is DONE when:

#### Code Completeness
- [ ] Code implemented and peer-reviewed (code review approved)
- [ ] Code merged to main/trunk branch
- [ ] No compiler warnings or linter errors
- [ ] Technical debt documented (if any introduced)

#### Test Completeness
- [ ] Unit tests written and passing (coverage ≥ 80%)
- [ ] Integration tests passing
- [ ] Acceptance tests passing (per DoR acceptance criteria)
- [ ] Regression tests passing (no existing functionality broken)
- [ ] Performance tests passing (if applicable)
- [ ] Security scans passing (no High/Critical vulnerabilities)

#### Documentation Complete
- [ ] Code comments added (public APIs documented)
- [ ] README updated (if applicable)
- [ ] Release notes updated (`deployment/release-notes-template.md` - user-facing changes)
- [ ] Runbook entries updated (`deployment/runbook-entry-card.md` - operational changes)

#### Deployment Readiness
- [ ] Deployed to dev environment successfully
- [ ] Deployed to test/staging environment successfully
- [ ] Feature flag configured (if applicable)
- [ ] Configuration changes documented
- [ ] Database migrations tested (rollback tested)

#### Operational Readiness
- [ ] Monitoring/alerting updated (if new services/endpoints)
- [ ] Logs are structured and meaningful
- [ ] SLIs/SLOs defined (`deployment/sli-card.md` if new capability)
- [ ] Runbook updated with operational procedures

#### Traceability
- [ ] Commits reference work item ID
- [ ] Work item status updated in tracking system
- [ ] Traceability matrix updated (requirement → code → test)

#### Approval
- [ ] Code Reviewer signoff
- [ ] Test Engineer signoff (test evidence provided)
- [ ] Product Owner signoff (acceptance demo completed)

## Handoff Acceptance

### Signoff Section

| Role | Name | Signature/Status | Date |
|------|------|------------------|------|
| Sending Team Lead | [Name] | [Approved/Rejected] | YYYY-MM-DD |
| Receiving Team Lead | [Name] | [Accepted/Rejected] | YYYY-MM-DD |
| Project Manager | [Name] | [Approved/Rejected] | YYYY-MM-DD |

**Outcome**: [APPROVED / CONDITIONAL / REJECTED]

**Conditions** (if conditional): [List specific conditions that must be met]

**Next Review Date** (if rejected): [YYYY-MM-DD]

### Handoff SLA

- Handoff initiated: [YYYY-MM-DD]
- Review SLA: 2 business days
- Review deadline: [YYYY-MM-DD + 2 days]
- Approval deadline: [YYYY-MM-DD + 3 days]
- Escalation: If not approved within 5 days, escalate to Project Manager

## Artifact Baselines

| Artifact | Template | Version/Baseline | Location |
|----------|----------|------------------|----------|
| [Artifact Name] | [Template filename] | [v1.2 or git tag] | [File path or URL] |

## Handoff Failure Recovery

If handoff is rejected or conditional:

1. **Document specific gaps**: Which criteria not met? (checklist above)
2. **Assign owners to close gaps**: Who will fix what by when?
3. **Set target date for re-evaluation**: When will handoff be re-attempted?
4. **Escalate if systemic**: If gaps indicate larger issues, escalate to Project Manager
5. **Consider phase return**: If gaps are fundamental, may need to return to previous phase

## Notes and Open Issues

[Free-text area for additional context, open questions, known limitations, or special instructions]

## References

- Full gate criteria: See `gate-criteria-by-phase.md`
- Phase definitions: See `docs/sdlc/plan-act-sdlc.md`
- Template directory: `docs/sdlc/templates/`
