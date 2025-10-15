# Legal Approval Workflow Template

## Cover Page

- `Project Name`
- `Legal Review and Approval Workflow`
- `Version 1.0`

## Revision History

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| `dd/mmm/yy` | `x.x` | `<details>` | `<name>` |

## Ownership & Collaboration

- Document Owner: Legal Liaison
- Contributor Roles: General Counsel, Senior Counsel, Project Manager
- Automation Inputs: Review request tickets, approval tracking system, phase gate status
- Automation Outputs: Approval status reports, escalation alerts, legal gate compliance dashboards

## 1 Introduction

> Define when and how legal review occurs during the project lifecycle, establishing clear triggers, SLAs, escalation paths, and approval authorities.

### 1.1 Purpose

This document establishes a consistent legal review process to ensure timely legal guidance, minimize risk, prevent bottlenecks, and maintain clear approval documentation for audit trails.

### 1.2 Scope

This document covers:
- Legal review triggers (when review is mandatory vs. optional)
- Review request procedures and required information
- Review turnaround SLAs and prioritization
- Escalation paths and approval authorities
- Gating criteria for phase transitions
- Documentation and recordkeeping requirements

### 1.3 Definitions, Acronyms, and Abbreviations

- **Legal Review**: Assessment of legal implications, risks, and compliance requirements
- **Legal Approval**: Formal authorization to proceed from Legal Liaison or General Counsel
- **Phase Gate**: Checkpoint where legal criteria must be met before proceeding to next phase
- **SLA**: Service Level Agreement (review turnaround time commitment)
- **Escalation**: Elevation of legal issue to higher authority (Legal Liaison → General Counsel → CEO)

### 1.4 References

- `legal-risk-assessment-template.md` - Legal risk identification and tracking
- `regulatory-compliance-framework-template.md` - Compliance requirements
- `contract-management-template.md` - Contract review triggers
- `license-compliance-template.md` - Open source license approval

### 1.5 Overview

Section 2 defines review triggers; Section 3 describes request procedures; Section 4 establishes SLAs; Section 5 defines approval authorities; Section 6 establishes phase gate criteria; Section 7 covers documentation.

## 2 Legal Review Triggers

> Identify when legal review is mandatory, recommended, or optional.

### 2.1 Mandatory Legal Review

**Project CANNOT proceed without legal approval** in these scenarios:

#### 2.1.1 Inception Phase Triggers

- **New project or product**: Any new initiative requiring legal risk assessment
- **New market entry**: Expansion to new geographic market (especially regulated jurisdictions)
- **New data processing**: Processing of personal data not previously handled (new data types, purposes, regions)
- **Regulated industry**: Projects in healthcare, finance, government, defense
- **Customer contract commitments**: New customer contracts with legal obligations (SLAs, deliverables, compliance)

#### 2.1.2 Requirements Phase Triggers

- **Regulatory compliance requirements**: GDPR, HIPAA, SOC 2, PCI-DSS, export control
- **High-risk features**: Features with legal implications (payment processing, healthcare data, encryption, AI/ML)
- **Customer contractual commitments**: Features required by customer contracts
- **Material data processing changes**: New purposes, new data types, new third parties

#### 2.1.3 Design Phase Triggers

- **Architecture decisions with legal implications**: Data storage locations (data sovereignty), encryption choices (export control), third-party integrations (DPAs)
- **Intellectual property concerns**: Patent landscape analysis (FTO), technology licensing
- **Third-party technology selection**: Vendor due diligence, DPAs, license compliance

#### 2.1.4 Construction Phase Triggers

- **License violations detected**: CI/CD detects prohibited licenses (GPL, AGPL, unlicensed)
- **Contract changes**: Amendments to customer or vendor contracts
- **Data breach or security incident**: Legal response required

#### 2.1.5 Transition Phase Triggers

- **Production deployment**: Final legal sign-off before go-live (terms of service, privacy policy, compliance certifications)
- **International deployment**: Export classification, data residency verification
- **Customer onboarding**: Customer DPAs, BAAs (HIPAA), contract execution

### 2.2 Recommended Legal Review

**Legal input valuable but not strictly required**:

- **Technical design reviews**: Optional legal participation to identify early risks
- **Vendor RFP process**: Legal review of finalists before selection
- **Marketing materials**: Review of claims, trademark usage, disclaimers
- **Partnership agreements**: Legal review of partnership terms before negotiation
- **Open source contributions**: Legal review before contributing company IP to open source projects

### 2.3 Advisory Legal Consultation

**Informal consultation with Legal Liaison**:

- **Early-stage idea exploration**: "Is this legally feasible?" questions
- **Risk clarification**: Understanding legal constraints before detailed planning
- **Policy interpretation**: Questions about company legal policies

**Process**: Email or Slack message to Legal Liaison, no formal review ticket required

## 3 Legal Review Request Process

> Define how to request legal review, required information, and submission procedures.

### 3.1 Review Request Submission

**Submission Method**: [Ticketing system] - Legal Review queue

**Requester**: Project Manager, Product Manager, Engineering Lead, or any stakeholder identifying legal review need

**Required Information**:

#### 3.1.1 Basic Information

- **Project name and ID**: [Project identifier]
- **Requester name and role**: [Contact information]
- **Request date**: [yyyy-mm-dd]
- **Review priority**: [Standard / Urgent / Emergency - see Section 4.2]
- **Business urgency**: [Customer commitment, revenue impact, deadline]

#### 3.1.2 Legal Review Context

- **What requires review**: [Feature, contract, decision, policy, etc.]
- **Project phase**: [Inception / Elaboration / Construction / Transition]
- **Legal concerns or questions**: [Specific legal issues, risks, or questions]
- **Regulatory context**: [Applicable regulations: GDPR, HIPAA, SOC 2, export control, etc.]
- **Contractual context**: [Customer or vendor contracts affected]

#### 3.1.3 Supporting Documentation

- **Requirements documents**: [Link to requirements, specifications]
- **Contracts**: [Customer contracts, vendor agreements, DPAs]
- **Architecture diagrams**: [Data flows, system architecture]
- **Risk assessments**: [Existing risk analysis, security assessments]
- **Prior legal reviews**: [Related legal opinions, previous decisions]

**Incomplete Requests**: Legal Liaison will request additional information, pausing SLA clock

### 3.2 Review Triage and Assignment

**Triage Process** (within 4 hours for standard requests, 1 hour for urgent/emergency):

1. **Legal Liaison receives request**: Review for completeness, priority
2. **Assess complexity**: Simple (Legal Liaison review) vs. complex (external counsel needed)
3. **Assign reviewer**: Legal Liaison, Senior Counsel, General Counsel, or external counsel
4. **Communicate assignment**: Notify requester of assignment, estimated completion date

**Assignment Criteria**:

| Complexity | Reviewer | Examples |
| --- | --- | --- |
| **Low** | Legal Liaison | Open source license approval, simple contract reviews, routine compliance questions |
| **Medium** | Senior Counsel or General Counsel | Complex contracts, moderate IP risks, regulatory interpretations |
| **High** | General Counsel + External Counsel | Litigation risk, high-value contracts, novel legal issues, M&A |

### 3.3 Information Gathering

**Legal Reviewer May Request**:
- Additional context or clarification
- Stakeholder interviews (Engineering, Product, Security)
- External research (regulatory guidance, case law, patent searches)
- External counsel opinion (for specialized issues)

**Requester Responsibility**: Respond promptly to information requests to avoid delays

## 4 Legal Review SLAs and Prioritization

> Establish review turnaround time commitments and prioritization criteria.

### 4.1 Review SLA Tiers

| Priority | Response Time | Review Completion | Escalation Path | Use Cases |
| --- | --- | --- | --- | --- |
| **Standard** | 1 business day | 5 business days | Legal Liaison → Senior Counsel (if > 5 days) | Routine reviews, no immediate deadline |
| **Urgent** | 4 hours | 2 business days | Legal Liaison → General Counsel (if > 2 days) | Customer commitment, upcoming deadline, moderate business impact |
| **Emergency** | 1 hour | 1 business day | General Counsel immediately | Regulatory investigation, litigation threat, imminent customer deadline, critical business impact |

**SLA Clock**:
- **Starts**: When complete request received
- **Pauses**: When additional information requested from requester
- **Resumes**: When requester provides requested information
- **Stops**: When legal review delivered

**SLA Monitoring**: Legal review tickets tracked in [system], dashboards monitor SLA compliance

### 4.2 Priority Determination

**Standard Priority** (default):
- No immediate deadline (> 1 week)
- Routine compliance questions
- Proactive risk assessments
- General legal guidance

**Urgent Priority**:
- Customer deadline within 1-2 weeks
- Contract negotiation in progress
- Moderate revenue impact ($50K-$500K)
- Moderate legal risk (score 6-11)

**Emergency Priority**:
- Customer deadline within 1-3 days
- Regulatory investigation or enforcement action
- Litigation threatened or filed
- High revenue impact (> $500K)
- High legal risk (score ≥ 12)
- Security breach or data breach

**Escalation for Priority Disputes**: If requester and Legal Liaison disagree on priority, escalate to Project Manager and Senior Counsel for decision.

### 4.3 SLA Exceptions

**SLA May Be Exceeded** in these scenarios:
- External counsel review required (adds 5-10 business days)
- Novel legal issue requiring extensive research
- Regulatory agency response required (outside legal team control)
- Multiple high-priority requests simultaneously (resource constraints)

**Exception Process**:
1. Legal Liaison identifies SLA breach risk
2. Notify requester immediately with reason and revised estimate
3. Escalate to General Counsel for resource prioritization
4. Document exception reason in review ticket

## 5 Approval Authorities and Escalation

> Define who can approve what, and when escalation is required.

### 5.1 Approval Authority Matrix

| Decision Type | Legal Liaison | Senior Counsel | General Counsel | CEO | Board |
| --- | --- | --- | --- | --- | --- |
| **Open source license approval** (allowlist) | Approve | - | - | - | - |
| **Open source license approval** (review-required) | Recommend | Approve | - | - | - |
| **Vendor contract review** (< $100K) | Approve | - | - | - | - |
| **Vendor contract review** ($100K-$500K) | Recommend | Approve | - | - | - |
| **Customer contract review** (< $500K) | Recommend | Approve | - | - | - |
| **Customer contract review** (> $500K) | Recommend | - | Approve | - | - |
| **Legal risk acceptance** (score ≤ 5) | Approve | - | - | - | - |
| **Legal risk acceptance** (score 6-11) | Recommend | - | Approve | - | - |
| **Legal risk acceptance** (score ≥ 12) | Recommend | - | - | Approve | - |
| **Patent filing decision** (< $50K) | Recommend | - | Approve | - | - |
| **Patent filing decision** (> $50K) | Recommend | - | - | Approve | - |
| **Trademark registration** | Approve | - | - | - | - |
| **Regulatory compliance certification** | Recommend | - | Approve | - | - |
| **Data breach notification** | Recommend | - | Approve | Notify | - |
| **Litigation settlement** (< $100K) | Recommend | - | Approve | Notify | - |
| **Litigation settlement** (> $100K) | Recommend | - | - | Approve | Notify |
| **M&A, major transactions** | Recommend | - | Recommend | Approve | Approve |

**Note**: "Recommend" means Legal provides opinion; final approval by next level.

### 5.2 Escalation Paths

#### 5.2.1 Standard Escalation

**When to Escalate**:
- Review exceeds SLA without exception
- Legal Liaison lacks authority to approve
- Novel legal issue outside Legal Liaison expertise
- High-risk decision requiring senior review

**Escalation Path**: Requester → Legal Liaison → Senior Counsel → General Counsel → CEO

**Escalation Process**:
1. **Legal Liaison** escalates to **Senior Counsel** via email/Slack with summary, urgency
2. **Senior Counsel** reviews, decides to: (a) Handle directly, (b) Escalate to General Counsel, or (c) Engage external counsel
3. **General Counsel** reviews, decides to: (a) Handle directly, (b) Escalate to CEO, or (c) Bring to Board

**Timeline**: Each escalation level has 1-2 business days to respond or escalate further

#### 5.2.2 Emergency Escalation

**When to Escalate Immediately**:
- Regulatory investigation or enforcement action
- Litigation threatened or filed
- Security or data breach
- Imminent contract breach with major customer
- Critical business risk (> $1M impact)

**Emergency Escalation Path**: Requester → Legal Liaison → General Counsel (immediately) → CEO (same day)

**Process**:
1. **Requester** creates emergency review ticket AND directly contacts Legal Liaison (phone, Slack)
2. **Legal Liaison** immediately notifies General Counsel (phone, not email)
3. **General Counsel** convenes emergency meeting (Legal, Executive team, affected stakeholders)
4. **Decision made** within hours, not days

### 5.3 Approval Documentation

**Approval Record Requirements**:
- **Decision**: Approve / Approve with conditions / Reject / Escalate
- **Approver name and title**: [Legal Liaison / Senior Counsel / General Counsel]
- **Approval date**: [yyyy-mm-dd]
- **Conditions** (if applicable): [Specific requirements, mitigations, restrictions]
- **Rationale**: [Brief legal reasoning for decision]
- **Expiration** (if applicable): [Approval valid until condition changes, date expires]

**Approval Storage**: Review tickets with approval documentation stored in [ticketing system], exported to [document repository] for long-term retention

**Retention Period**: 7 years (align with contract retention policies)

## 6 Phase Gate Legal Criteria

> Define legal requirements that must be met before transitioning to next project phase.

### 6.1 Inception Phase Gate

**Legal Criteria** (all must be complete):

- [ ] Regulatory applicability assessment complete (GDPR, HIPAA, SOC 2, export control, etc.)
- [ ] Customer contract obligations identified and documented
- [ ] Vendor contracts reviewed (SLAs, DPAs, compliance certifications)
- [ ] IP landscape review complete (patent search, trademark clearance, FTO if needed)
- [ ] Initial legal risk assessment complete (legal-risk-assessment-template.md)
- [ ] Critical legal risks (score ≥ 20) mitigated or escalated to CEO
- [ ] **Legal Liaison sign-off obtained**

**Gate Owner**: Legal Liaison

**Gate Review Meeting**: Legal Liaison + Project Manager + Key Stakeholders

**Block Criteria**: Critical legal risks (score ≥ 20) without approved mitigation plan

**Deliverables**:
- `legal-risk-assessment-template.md` (initial version)
- Regulatory applicability checklist
- Contract obligations summary
- Legal Liaison approval record

### 6.2 Elaboration Phase Gate

**Legal Criteria** (all must be complete):

- [ ] Privacy Impact Assessment complete (if processing personal data)
- [ ] License compliance plan approved (SBOM reviewed, no prohibited licenses)
- [ ] Compliance framework documented (regulatory-compliance-framework-template.md)
- [ ] Contract requirements traced to system requirements (contract-requirements-traceability-matrix.md)
- [ ] High legal risks (score ≥ 12) mitigated or accepted per policy (with General Counsel approval)
- [ ] Vendor DPAs/BAAs signed (if applicable)
- [ ] **Legal Liaison sign-off obtained**

**Gate Owner**: Legal Liaison

**Gate Review Meeting**: Legal Liaison + Privacy Officer + Project Manager

**Block Criteria**: High legal risks (score ≥ 12) without approved mitigation or acceptance

**Deliverables**:
- `privacy-impact-assessment-template.md` (if applicable)
- `license-compliance-template.md` (initial SBOM review)
- `regulatory-compliance-framework-template.md`
- `contract-requirements-traceability-matrix.md`
- Legal Liaison approval record

### 6.3 Construction Phase Gate

**Legal Criteria** (ongoing during construction, quarterly review):

- [ ] Ongoing compliance monitoring active (license scanning in CI/CD)
- [ ] Vendor compliance verified (SOC 2 reports reviewed, certifications valid)
- [ ] Data protection controls verified (encryption, access controls, logging)
- [ ] Attribution files generated (open source license compliance)
- [ ] No outstanding legal blockers (review tickets resolved or escalated)
- [ ] **Legal Liaison quarterly review sign-off**

**Gate Owner**: Legal Liaison

**Review Frequency**: Quarterly during construction phase

**Block Criteria**: License violations detected, vendor certification expired, unresolved legal blockers

**Deliverables**:
- CI/CD license scan reports (green/passing)
- Vendor compliance verification (SOC 2 reports, certification validity)
- Attribution file (ATTRIBUTIONS.md or LICENSE.txt)
- Quarterly legal review meeting notes

### 6.4 Transition Phase Gate

**Legal Criteria** (all must be complete before production deployment):

- [ ] Terms of Service finalized and reviewed
- [ ] Privacy Policy published and compliant (GDPR, CCPA)
- [ ] Compliance certifications obtained (SOC 2, ISO 27001, etc. - if required)
- [ ] Export classification complete (ECCN assigned if applicable)
- [ ] License attributions included in release (verified in final build)
- [ ] Data processing agreements active (customer DPAs signed)
- [ ] Legal risk register updated (all high risks mitigated or accepted)
- [ ] **Legal Liaison sign-off for production release**
- [ ] **General Counsel sign-off (if high-risk project: score ≥ 12)**

**Gate Owner**: Legal Liaison, General Counsel (high-risk)

**Gate Review Meeting**: Legal Liaison + General Counsel (if needed) + Project Manager + Deployment Manager

**Block Criteria**:
- Missing compliance certifications (SOC 2, ISO 27001) if contractually required
- Unsigned customer DPAs
- Export classification incomplete (if international deployment)
- Unmitigated high legal risks (score ≥ 12)

**Deliverables**:
- Terms of Service (final version)
- Privacy Policy (final version)
- Compliance certifications (SOC 2 report, ISO 27001 certificate)
- Export classification documentation (ECCN, self-classification report)
- Attribution file (in release package)
- Customer DPAs (signed copies)
- `legal-risk-assessment-template.md` (final version)
- Legal Liaison approval record
- General Counsel approval record (if required)

## 7 Documentation and Recordkeeping

> Define documentation requirements, storage, and retention for legal reviews and approvals.

### 7.1 Review Documentation Requirements

**Each Legal Review Must Document**:

- **Request details**: Project, requester, date, priority
- **Legal issues reviewed**: Regulatory compliance, IP, contracts, risks
- **Legal analysis**: Research conducted, risks identified, legal reasoning
- **Recommendation**: Approve / Approve with conditions / Reject / Escalate
- **Conditions** (if applicable): Specific requirements for approval
- **Approval decision**: Final decision, approver name, date
- **Escalations**: If escalated, record escalation path and final decision

**Documentation Location**: [Ticketing system] (primary), [Document repository] (long-term storage)

### 7.2 Documentation Templates

#### 7.2.1 Legal Review Ticket Template

**Subject**: Legal Review: [Project Name] - [Brief Description]

**Request Details**:
- Project Name: [Name]
- Requester: [Name, Role]
- Request Date: [yyyy-mm-dd]
- Priority: [Standard / Urgent / Emergency]

**Review Scope**:
- Legal Issues: [Regulatory compliance, IP, contracts, etc.]
- Applicable Regulations: [GDPR, HIPAA, export control, etc.]
- Supporting Documents: [Links]

**Legal Analysis**:
- [Legal research, risk analysis, compliance assessment]

**Recommendation**:
- Decision: [Approve / Approve with Conditions / Reject / Escalate]
- Conditions: [If any]
- Rationale: [Legal reasoning]

**Approval**:
- Approver: [Name, Title]
- Approval Date: [yyyy-mm-dd]
- Signature: [Electronic signature or approval record]

#### 7.2.2 Phase Gate Approval Template

**Phase Gate**: [Inception / Elaboration / Construction / Transition]

**Legal Criteria Status**:
- [ ] Criterion 1: [Complete/Incomplete]
- [ ] Criterion 2: [Complete/Incomplete]
- [All criteria from Section 6]

**Legal Review Summary**:
- Key Legal Risks: [Summary]
- Mitigation Status: [Summary]
- Outstanding Issues: [List or "None"]

**Approval Decision**:
- Gate Status: [Approve Transition / Conditional Approval / Block Transition]
- Conditions: [If conditional approval, list conditions]
- Approver: [Legal Liaison, General Counsel if required]
- Approval Date: [yyyy-mm-dd]

**Next Steps**:
- [Actions required before next phase]

### 7.3 Recordkeeping and Retention

**Storage**:
- **Primary**: [Ticketing system] for active reviews
- **Long-term**: [Document repository] for completed reviews and approvals

**Retention Period**: 7 years from completion (align with contract and compliance retention)

**Access Control**: Legal team, auditors, authorized compliance personnel

**Audit Trail**: All review tickets include complete history (requester, reviewer actions, approvals, dates)

### 7.4 Reporting and Dashboards

#### 7.4.1 Legal Review Metrics

**Tracked Metrics**:
- **Review volume**: Count of reviews per week/month
- **SLA compliance**: % of reviews completed within SLA
- **Average turnaround time**: Mean time from request to approval
- **Escalation rate**: % of reviews escalated beyond Legal Liaison
- **Phase gate approval rate**: % of gates approved vs. blocked vs. conditional

**Dashboard Access**: Legal Liaison, General Counsel, Project Management Office

**Review Frequency**: Monthly review of metrics, identify process improvements

#### 7.4.2 Executive Legal Dashboard

**Metrics for Executive Team**:
- **Open legal reviews**: Count and age of pending reviews
- **High-risk legal issues**: Count and severity of active legal risks (score ≥ 12)
- **Phase gate status**: Projects awaiting legal gate approval
- **SLA breaches**: Reviews exceeding SLA, reason, resolution plan
- **Legal escalations**: Count and nature of escalated issues

**Distribution**: CEO, General Counsel, Project Management Office

**Frequency**: Weekly or on-demand

## 8 Continuous Improvement

> Periodically review and improve the legal review process.

### 8.1 Process Review

**Review Frequency**: Quarterly

**Review Participants**: Legal Liaison, General Counsel, Project Managers, Stakeholders

**Review Focus**:
- **SLA performance**: Are SLAs realistic? Are breaches frequent? Why?
- **Bottlenecks**: Where do delays occur? How to streamline?
- **Escalations**: Are escalation paths effective? Are escalations appropriate?
- **Stakeholder satisfaction**: Are requesters satisfied with legal support?

**Improvements**: Update legal approval workflow based on findings

### 8.2 Legal Training

**Audience**: Project Managers, Product Managers, Engineering Leads, all employees

**Training Topics**:
- When to request legal review (triggers)
- How to request legal review (process, required information)
- Legal review SLAs and prioritization
- Common legal risks (compliance, IP, contracts)

**Training Frequency**: Annual mandatory training, new hire orientation

**Training Tracking**: Learning management system, records maintained for audit

## Appendices

### Appendix A: Legal Review Request Form

[Link to form or embed form fields]

**Form Fields**:
- Project Name
- Requester Name/Role/Email
- Request Date
- Priority (Standard/Urgent/Emergency)
- Review Scope (Compliance/IP/Contracts/Risk)
- Applicable Regulations
- Supporting Documents (links)
- Deadline (if any)
- Business Impact (revenue, customer commitments)

### Appendix B: Legal Contact Information

| Role | Name | Email | Phone | Escalation Path |
| --- | --- | --- | --- | --- |
| Legal Liaison | [name] | [email] | [phone] | First point of contact |
| Senior Counsel | [name] | [email] | [phone] | Escalation from Legal Liaison |
| General Counsel | [name] | [email] | [phone] | Escalation for high-risk issues |
| External Counsel (General) | [firm] | [email] | [phone] | Specialized legal issues |
| External Counsel (IP) | [firm] | [email] | [phone] | Patent, trademark issues |

### Appendix C: Legal Review Decision Tree

[Flowchart or decision tree diagram]

**Decision Flow**:
1. Does issue require legal review? (Check Section 2 triggers)
2. What priority? (Standard / Urgent / Emergency)
3. Submit review request (Section 3)
4. Legal Liaison triages and assigns (Section 3.2)
5. Legal review conducted (within SLA, Section 4)
6. Approval decision (Section 5.1)
7. Documentation (Section 7)

## Agent Notes

- Prioritize legal reviews based on business impact (customer commitments, revenue, deadlines), not just legal risk score
- Set realistic SLAs: 5 business days standard, 2 business days urgent, 1 business day emergency
- Automate review request intake (ticketing system, forms) to ensure consistent information capture
- Track SLA compliance, identify process bottlenecks and resource needs
- Escalate high-risk decisions appropriately (General Counsel for score ≥ 12, CEO for score ≥ 20)
- Document all reviews and approvals for audit trail (7-year retention)
- Phase gate criteria prevent non-compliant products from reaching production
- Train stakeholders on legal review triggers and process to reduce delays
- Verify Automation Outputs entry is satisfied before signaling completion
