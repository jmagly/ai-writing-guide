# Legal Risk Assessment Template

## Cover Page

- `Project Name`
- `Legal Risk Assessment`
- `Version 1.0`

## Revision History

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| `dd/mmm/yy` | `x.x` | `<details>` | `<name>` |

## Ownership & Collaboration

- Document Owner: Legal Liaison
- Contributor Roles: Risk Manager, Privacy Officer, Security Gatekeeper, General Counsel
- Automation Inputs: Regulatory change feeds, litigation databases, contract repositories, patent databases
- Automation Outputs: Risk register updates, legal gate status reports, escalation alerts

## 1 Introduction

> Identify, assess, and mitigate legal risks throughout the project lifecycle to prevent regulatory violations, IP infringement, contract breaches, and legal liability.

### 1.1 Purpose

This document provides a structured approach to legal risk identification, quantification, mitigation planning, and ongoing monitoring to ensure project compliance with legal obligations and minimize legal exposure.

### 1.2 Scope

This document covers:
- Regulatory compliance risks (GDPR, HIPAA, export control, etc.)
- Intellectual property risks (patent infringement, copyright, trademark)
- Contractual risks (customer SLA breaches, vendor failures)
- Liability risks (product liability, data breach liability, professional liability)
- Legal review gates and approval requirements

### 1.3 Definitions, Acronyms, and Abbreviations

- **IP**: Intellectual Property
- **SLA**: Service Level Agreement
- **GDPR**: General Data Protection Regulation
- **HIPAA**: Health Insurance Portability and Accountability Act
- **ITAR**: International Traffic in Arms Regulations
- **EAR**: Export Administration Regulations
- **DPA**: Data Processing Agreement
- **FTO**: Freedom to Operate (patent analysis)
- **Prior Art**: Existing knowledge that can invalidate patent claims

### 1.4 References

- `regulatory-compliance-framework-template.md` - Compliance tracking
- `contract-management-template.md` - Contractual obligations
- `license-compliance-template.md` - Open source and commercial licenses
- `privacy-impact-assessment-template.md` - Privacy risk assessment
- `risk-list-template.md` - General risk management

### 1.5 Overview

Section 2 defines risk assessment methodology; Section 3 inventories legal risks by category; Section 4 details mitigation strategies; Section 5 establishes legal review gates; Section 6 covers ongoing monitoring.

## 2 Legal Risk Assessment Methodology

> Establish consistent approach to identifying, scoring, and prioritizing legal risks.

### 2.1 Risk Identification

**Sources of Legal Risk**:
- **Regulatory analysis**: Identify applicable regulations and compliance gaps
- **Contract review**: Identify contractual obligations and breach risks
- **IP landscape analysis**: Identify patent/copyright/trademark risks
- **Threat modeling**: Identify security/privacy breach risks
- **Vendor assessment**: Identify vendor dependency and failure risks
- **Stakeholder input**: Collect concerns from Legal, Compliance, Engineering, Product

**Risk Identification Triggers**:
- Project inception: Initial legal risk assessment
- Requirements changes: New features, data processing, markets
- Architecture decisions: Technology choices, third-party integrations
- Contract negotiations: New customer/vendor agreements
- Regulatory changes: New laws, enforcement actions, guidance
- Incidents: Security breaches, SLA violations, customer complaints

### 2.2 Risk Scoring

#### 2.2.1 Likelihood Assessment

| Level | Likelihood | Description | Score |
| --- | --- | --- | --- |
| Very Low | < 5% | Highly unlikely to occur | 1 |
| Low | 5-20% | Unlikely but possible | 2 |
| Medium | 20-50% | Moderate probability | 3 |
| High | 50-80% | Likely to occur | 4 |
| Very High | > 80% | Almost certain to occur | 5 |

#### 2.2.2 Impact Assessment

| Level | Impact | Description | Score |
| --- | --- | --- | --- |
| Negligible | Minimal | < $10K cost, no regulatory action, minimal reputational impact | 1 |
| Minor | Low | $10K-$100K cost, warning letter, limited publicity | 2 |
| Moderate | Medium | $100K-$1M cost, consent decree, significant negative press | 3 |
| Major | High | $1M-$10M cost, enforcement action, major customer loss | 4 |
| Critical | Catastrophic | > $10M cost, criminal liability, business closure | 5 |

#### 2.2.3 Risk Score Calculation

**Risk Score = Likelihood (1-5) × Impact (1-5) = Total Score (1-25)**

**Risk Levels**:
- **Critical (20-25)**: Requires immediate CEO/General Counsel escalation, may block project
- **High (12-19)**: Requires General Counsel review, mitigation plan mandatory
- **Medium (6-11)**: Requires Legal Liaison review, mitigation recommended
- **Low (3-5)**: Monitor, mitigation optional
- **Minimal (1-2)**: Accept, document rationale

### 2.3 Risk Prioritization

**Priority Order**:
1. **Critical risks**: Address immediately, all other work stops if needed
2. **High risks**: Address within 30 days, dedicate resources
3. **Medium risks**: Address within 90 days, plan mitigation
4. **Low risks**: Monitor quarterly, address if feasible
5. **Minimal risks**: Accept, document in risk register

**Resource Allocation**: Focus mitigation efforts on highest risk score (likelihood × impact) risks first

## 3 Legal Risk Inventory

> Identify and document legal risks across all categories, organized by risk type.

### 3.1 Regulatory Compliance Risks

| Risk ID | Regulation | Description | Likelihood | Impact | Score | Status | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REG-001 | GDPR | Unclear data processing lawful basis, risk of Article 5 violation | Medium (3) | Major (4) | 12 | Open | Privacy Officer |
| REG-002 | HIPAA | PHI access controls insufficient, risk of 164.312 violation | Low (2) | Major (4) | 8 | Mitigated | Security Gatekeeper |
| REG-003 | Export Control (EAR) | Software may contain encryption > 56-bit, export classification needed | High (4) | Moderate (3) | 12 | Open | Legal Liaison |
| REG-004 | SOC 2 | Vendor SLA dependency creates control gap, audit finding risk | Medium (3) | Moderate (3) | 9 | Monitoring | Compliance Team |

**Regulatory Risk Examples**:
- **GDPR Article 5**: Data processing principles (lawfulness, fairness, transparency, purpose limitation, data minimization)
- **GDPR Article 32**: Security of processing (encryption, access controls, breach detection)
- **HIPAA 164.312**: Technical safeguards (access controls, audit controls, integrity, transmission security)
- **PCI-DSS Requirement 3**: Protect stored cardholder data (encryption, key management)
- **Export Control**: ITAR defense articles, EAR dual-use technology, restricted destinations

### 3.2 Intellectual Property Risks

| Risk ID | IP Type | Description | Likelihood | Impact | Score | Status | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IP-001 | Patent | Feature X may infringe Competitor Y's patent US1234567 | Low (2) | Critical (5) | 10 | Under review | Patent Attorney |
| IP-002 | Copyright | Unclear provenance of legacy code module, copyright ownership uncertain | Medium (3) | Moderate (3) | 9 | Investigating | Legal Liaison |
| IP-003 | Trademark | Product name may infringe existing trademark in EU market | Low (2) | Moderate (3) | 6 | Mitigated | Legal Liaison |
| IP-004 | Trade Secret | Employee departure risk, inadequate NDA/non-compete protections | High (4) | Major (4) | 16 | Open | HR + Legal |

#### 3.2.1 Patent Risk Detail

**Risk ID**: IP-001

**Description**: Feature X (predictive analytics using machine learning) may infringe Competitor Y's patent US1234567 ("Method for predictive data analysis").

**Likelihood**: Low (2) - Prior art search found similar methods predating patent, claim scope may be narrow

**Impact**: Critical (5) - Patent infringement injunction could halt product sales, damages $5M-$20M, attorney fees $2M+

**Risk Score**: 10 (Medium-High)

**Mitigation Strategy**:
1. **Action**: Conduct Freedom-to-Operate (FTO) analysis by patent attorney
2. **Owner**: Patent Attorney
3. **Deliverable**: FTO opinion letter, prior art search, claim chart analysis
4. **Timeline**: 60 days
5. **Cost**: $25K-$50K legal fees
6. **Decision Options**:
   - **Clear**: Proceed with feature (patent doesn't cover our implementation)
   - **Design around**: Modify feature to avoid patent claims
   - **License**: Negotiate license with patent holder
   - **Cancel feature**: Remove feature if risk too high

**Residual Risk**: Low (if FTO clear), Medium (if design around), Minimal (if licensed)

**Legal Sign-Off Required**: Yes - General Counsel approval before feature release

**Escalation Path**: Patent Attorney → General Counsel → CEO (if litigation threatened)

#### 3.2.2 Copyright Risk Detail

**Risk ID**: IP-002

**Description**: Legacy code module (authentication library) lacks clear copyright ownership, original author unclear, license unknown.

**Likelihood**: Medium (3) - Code predates current team, no documentation of origin

**Impact**: Moderate (3) - Copyright infringement claim could require code rewrite ($100K), damages $50K-$500K

**Risk Score**: 9 (Medium)

**Mitigation Strategy**:
1. **Action**: Code archeology - review version control history, contact former employees
2. **Owner**: Legal Liaison + Engineering Lead
3. **Timeline**: 30 days investigation
4. **Decision Options**:
   - **Ownership confirmed**: Document provenance, continue use
   - **Third-party code identified**: Obtain license, replace if needed
   - **Unknown origin**: Rewrite module to eliminate risk (60 days, $100K)

**Residual Risk**: Low (if provenance confirmed), Minimal (if rewritten)

#### 3.2.3 Trademark Risk Detail

**Risk ID**: IP-003

**Description**: Product name "Acme Analytics" may infringe existing EU trademark for "Acme Analytics GmbH" in software category.

**Likelihood**: Low (2) - Different jurisdictions (US vs. EU), different market segments

**Impact**: Moderate (3) - Trademark dispute could force rebrand in EU ($200K), delay EU launch (6 months)

**Risk Score**: 6 (Medium-Low)

**Mitigation Strategy**:
1. **Action**: Trademark clearance search in EU markets
2. **Owner**: Legal Liaison
3. **Deliverable**: Trademark search report, risk opinion
4. **Timeline**: 14 days
5. **Cost**: $5K-$10K search fees
6. **Decision Options**:
   - **Clear**: Proceed with EU launch
   - **Different name**: Use alternative name for EU market
   - **Negotiate**: Contact trademark holder, request coexistence agreement

**Residual Risk**: Minimal (if clear or different name)

### 3.3 Contractual Risks

| Risk ID | Contract | Description | Likelihood | Impact | Score | Status | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CON-001 | Customer SLA (Acme Corp) | AWS outage could cascade to customer SLA breach (99.95% commitment) | Medium (3) | Major (4) | 12 | Monitoring | Engineering Lead |
| CON-002 | Vendor Agreement (AWS) | No contractual guarantee of feature availability, deprecation risk | Low (2) | Moderate (3) | 6 | Accepted | Engineering Lead |
| CON-003 | Customer SOW (Beta Inc) | Feature Y delivery delayed, milestone payment at risk ($150K) | High (4) | Moderate (3) | 12 | At Risk | Project Manager |
| CON-004 | Vendor DPA (Datadog) | Sub-processor change notification insufficient, GDPR DPA violation risk | Low (2) | Major (4) | 8 | Mitigated | Legal Liaison |

#### 3.3.1 SLA Breach Risk Detail

**Risk ID**: CON-001

**Description**: Customer contract (Acme Corp) requires 99.95% monthly uptime. System depends on AWS EC2 (99.99% SLA). AWS outage could cause customer SLA breach.

**Likelihood**: Medium (3) - AWS outages rare but occur (1-2 times/year regionally)

**Impact**: Major (4) - SLA breach triggers 10% service credit per 0.1% below SLA. 1-hour outage (~99.86% uptime) = ~$5K credit. Multiple outages could trigger termination clause.

**Risk Score**: 12 (High)

**Mitigation Strategy**:
1. **Action**: Multi-region active-active architecture
2. **Owner**: Engineering Lead
3. **Deliverable**: Architecture design, failover procedures, DR testing
4. **Timeline**: 6 months
5. **Cost**: $200K development + $50K/year additional infrastructure
6. **Risk Reduction**: Likelihood → Low (2), Score → 8 (Medium)

**Alternative Mitigation**: Negotiate SLA carve-out for third-party infrastructure failures (customer rejected)

**Residual Risk**: Medium (8) - Multi-region reduces but doesn't eliminate risk

**Monitoring**: Real-time uptime monitoring, weekly SLA compliance review, escalation if < 99.95% projected

#### 3.3.2 Vendor Dependency Risk Detail

**Risk ID**: CON-002

**Description**: AWS Lambda function uses specific runtime version (Python 3.9). AWS could deprecate runtime with 12-month notice. Migration required, potential service disruption.

**Likelihood**: Low (2) - AWS provides long deprecation windows, migration tools

**Impact**: Moderate (3) - Migration effort ~2 months, $100K, potential downtime during cutover

**Risk Score**: 6 (Medium-Low)

**Mitigation Strategy**:
1. **Action**: Monitor AWS deprecation announcements, maintain upgrade cadence
2. **Owner**: Engineering Lead
3. **Approach**: Proactive runtime upgrades every 12-18 months
4. **Contingency**: If deprecation announced, prioritize migration immediately

**Residual Risk**: Low (2) - Proactive monitoring and maintenance

**Decision**: Accept risk, monitor (cost of mitigation > risk)

### 3.4 Liability Risks

| Risk ID | Liability Type | Description | Likelihood | Impact | Score | Status | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LIA-001 | Product Liability | Software bug causes financial loss to customer, negligence claim | Low (2) | Major (4) | 8 | Mitigated | QA Lead |
| LIA-002 | Data Breach Liability | Security breach exposes customer PII, GDPR damages + class action | Low (2) | Critical (5) | 10 | Monitoring | Security Gatekeeper |
| LIA-003 | Professional Liability | Incorrect advice from support team causes customer business loss | Low (2) | Moderate (3) | 6 | Mitigated | Support Lead |
| LIA-004 | Accessibility Liability | ADA/WCAG non-compliance, discrimination lawsuit | Low (2) | Moderate (3) | 6 | Open | UX Lead |

#### 3.4.1 Product Liability Risk Detail

**Risk ID**: LIA-001

**Description**: Software defect in financial calculation module causes customer to overpay vendors by $500K. Customer sues for negligence, breach of contract.

**Likelihood**: Low (2) - Comprehensive testing, code reviews, but bugs still possible

**Impact**: Major (4) - Damages $500K (customer loss) + legal fees $200K + reputational damage

**Risk Score**: 8 (Medium)

**Mitigation Strategy**:
1. **Technical Controls**: Comprehensive test suite, code reviews, staging environment testing
2. **Contractual Protections**: Liability cap in customer contract ($1M or 12 months fees)
3. **Insurance**: Errors & Omissions (E&O) insurance, $5M coverage
4. **Quality Assurance**: QA plan, test coverage > 80%, security testing

**Residual Risk**: Low (4) - Likelihood → Very Low (1), Impact → Major (4), Score → 4

**Insurance Coverage**: E&O insurance deductible $25K, covers damages above deductible

#### 3.4.2 Data Breach Liability Risk Detail

**Risk ID**: LIA-002

**Description**: Security breach (ransomware, SQL injection, etc.) exposes customer PII. GDPR fines (€20M or 4% revenue), US state class actions ($100-$500 per record), breach notification costs ($200 per record), reputational damage, customer churn.

**Likelihood**: Low (2) - Strong security controls, penetration testing, but targeted attacks sophisticated

**Impact**: Critical (5) - GDPR fine up to €20M, class action damages $5M-$50M, notification costs $1M (5K records), customer churn 20% ($2M revenue loss)

**Risk Score**: 10 (Medium-High)

**Mitigation Strategy**:
1. **Technical Controls**: Encryption at rest/transit, MFA, SIEM, intrusion detection, vulnerability scanning
2. **Compliance**: SOC 2, ISO 27001, GDPR compliance program
3. **Insurance**: Cyber liability insurance, $10M coverage
4. **Incident Response**: Breach response plan, forensics retainer, legal counsel retainer
5. **Contractual**: DPAs with customers, liability caps where possible

**Residual Risk**: Low (6) - Likelihood → Low (2), Impact → Moderate (3) - insurance covers most financial exposure

**Insurance Coverage**: Cyber insurance deductible $50K, covers breach costs, legal defense, regulatory fines (up to policy limits)

### 3.5 Export Control Risks

| Risk ID | Regulation | Description | Likelihood | Impact | Score | Status | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EXP-001 | EAR | Software contains > 56-bit encryption, ECCN classification required before export | High (4) | Moderate (3) | 12 | Open | Legal Liaison |
| EXP-002 | ITAR | Software developed for defense application, ITAR compliance unknown | Low (2) | Critical (5) | 10 | Under review | Legal Liaison |
| EXP-003 | Sanctions | International customer in restricted country (Iran, North Korea, etc.), export prohibited | Very Low (1) | Critical (5) | 5 | Mitigated | Sales + Legal |

#### 3.5.1 Encryption Export Control Detail

**Risk ID**: EXP-001

**Description**: Software uses AES-256 encryption (> 56-bit symmetric encryption). US Export Administration Regulations (EAR) require ECCN classification and possible export license for certain destinations.

**Likelihood**: High (4) - Software definitely contains > 56-bit encryption

**Impact**: Moderate (3) - Export without classification is violation, fines up to $1M per violation, criminal penalties possible

**Risk Score**: 12 (High)

**Mitigation Strategy**:
1. **Action**: File Classification Request with BIS, or self-classify using published guidance
2. **Owner**: Legal Liaison
3. **Deliverable**: ECCN classification (likely 5D002 with exception)
4. **Timeline**: 30 days (self-classify) or 90 days (BIS review)
5. **Requirements**: Submit annual self-classification report to BIS, maintain export compliance program
6. **Restrictions**: Generally exportable except to embargoed countries (Cuba, Iran, North Korea, Syria, Sudan)

**Residual Risk**: Low (4) - Once classified, export legal with compliance program

**Compliance Program**: Export compliance checklist, restricted party screening, country restrictions, annual reporting

## 4 Legal Risk Mitigation

> Define mitigation strategies for each identified risk, assign ownership, set timelines, and track residual risk.

### 4.1 Mitigation Strategy Template

**Risk ID**: [ID]

**Current Risk Score**: [Likelihood × Impact = Score]

**Mitigation Options**:

| Option | Description | Cost | Timeline | Risk Reduction | Residual Risk | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| Option 1 | [Description] | [Cost] | [Timeline] | [Likelihood/Impact change] | [New score] | [Recommended/Not Recommended] |
| Option 2 | [Description] | [Cost] | [Timeline] | [Likelihood/Impact change] | [New score] | [Recommended/Not Recommended] |
| Option 3 | Accept risk | $0 | N/A | None | [Current score] | [If risk acceptable] |

**Selected Mitigation**: [Option #, rationale]

**Implementation Plan**:
1. **Action**: [Specific action]
2. **Owner**: [Role/Name]
3. **Deliverable**: [Concrete deliverable]
4. **Timeline**: [Completion date]
5. **Budget**: [Cost]
6. **Success Criteria**: [How to verify risk mitigated]

**Residual Risk**: [New likelihood] × [New impact] = [New score]

**Monitoring**: [How to track ongoing effectiveness]

**Approval**: [Legal Liaison/General Counsel, date]

### 4.2 Risk Acceptance Criteria

**When to Accept Risk** (no mitigation):
- Risk score ≤ 5 (Low risk)
- Cost of mitigation > expected cost of risk
- Risk mitigation technically infeasible
- Risk already mitigated by other controls

**Acceptance Requirements**:
- Legal Liaison approval (score ≤ 5)
- General Counsel approval (score 6-11)
- CEO approval (score ≥ 12)
- Documented rationale
- Periodic review (quarterly for score ≥ 6, annually for score ≤ 5)

**Reference**: See `risk-acceptance-template.md` for formal acceptance process

### 4.3 Risk Transfer (Insurance)

| Insurance Type | Coverage | Limits | Deductible | Premium | Carrier | Renewal Date |
| --- | --- | --- | --- | --- | --- | --- |
| Cyber Liability | Data breach, ransomware, business interruption | $10M | $50K | $80K/year | [Carrier] | [yyyy-mm-dd] |
| Errors & Omissions (E&O) | Professional liability, software defects, negligence | $5M | $25K | $50K/year | [Carrier] | [yyyy-mm-dd] |
| General Liability | Bodily injury, property damage | $2M | $10K | $20K/year | [Carrier] | [yyyy-mm-dd] |
| Directors & Officers (D&O) | Executive liability, shareholder lawsuits | $10M | $50K | $100K/year | [Carrier] | [yyyy-mm-dd] |

**Risk Transfer Strategy**: Use insurance to cap financial exposure for high-impact, low-likelihood risks (cyber breach, professional liability)

**Insurance Limitations**: Insurance doesn't cover reputational damage, customer churn, regulatory sanctions in some cases

## 5 Legal Review Gates

> Define when legal review is required during the project lifecycle and establish approval criteria.

### 5.1 Legal Review Triggers

**Mandatory Legal Review** - Project cannot proceed without legal approval:
- **Inception Phase**: New project, new market, new data processing, export to new countries
- **Requirements Phase**: Regulatory compliance requirements, customer contract commitments, new data types
- **Design Phase**: Architecture decisions with IP/regulatory implications (encryption, data storage)
- **Construction Phase**: Third-party integrations, new vendors, license changes
- **Transition Phase**: Production deployment, terms of service, privacy policy, export classification

**Advisory Legal Review** - Legal input requested but not blocking:
- Technical design reviews (optional legal participation)
- Vendor selection (legal review of finalists)
- Marketing materials (trademark usage, claims substantiation)

### 5.2 Legal Review Process

#### 5.2.1 Review Request

**Requester**: [Project Manager, Product Manager, Engineering Lead]

**Submission**: Legal review ticket in [ticketing system]

**Required Information**:
- Project name and phase
- Description of decision/feature requiring review
- Legal concerns or questions
- Business impact (revenue, customer commitments, deadlines)
- Urgency (standard: 5 business days, urgent: 2 business days)
- Supporting documentation (contracts, requirements, architecture diagrams)

#### 5.2.2 Legal Review SLAs

| Priority | Response Time | Review Completion | Escalation Path |
| --- | --- | --- | --- |
| Standard | 1 business day | 5 business days | Legal Liaison → Senior Counsel (if > 5 days) |
| Urgent | 4 hours | 2 business days | Legal Liaison → General Counsel (if needed) |
| Emergency | 1 hour | 1 business day | General Counsel immediately |

**SLA Clock**: Starts when complete request received, pauses if additional information requested

#### 5.2.3 Legal Review Outcomes

| Outcome | Description | Next Steps |
| --- | --- | --- |
| **Approved** | No legal concerns, proceed as planned | Document approval, proceed |
| **Approved with Conditions** | Approved subject to specific changes/mitigations | Implement conditions, re-submit for verification |
| **Rejected** | Legal risk too high, cannot proceed | Redesign, alternative approach, or cancel |
| **Escalated** | Requires General Counsel or external counsel review | Await escalated review, extended timeline |

**Approval Documentation**: Legal Liaison documents approval in ticket, includes conditions, rationale, date

### 5.3 Phase Gate Legal Criteria

#### 5.3.1 Inception Phase Gate

**Legal Criteria**:
- [ ] Regulatory applicability assessment complete (GDPR, HIPAA, export control, etc.)
- [ ] Customer contract obligations identified and documented
- [ ] Vendor contracts reviewed (SLAs, DPAs, compliance certifications)
- [ ] IP landscape review complete (patent search, trademark clearance)
- [ ] Initial legal risk assessment complete
- [ ] Legal Liaison sign-off

**Gate Owner**: Legal Liaison

**Block Criteria**: Critical legal risks (score ≥ 20) without approved mitigation

#### 5.3.2 Elaboration Phase Gate

**Legal Criteria**:
- [ ] Privacy Impact Assessment complete (if processing personal data)
- [ ] License compliance plan approved (SBOM reviewed, no prohibited licenses)
- [ ] Compliance framework documented (regulatory-compliance-framework-template.md)
- [ ] Contract requirements traced to system requirements
- [ ] Legal risks mitigated or accepted per policy
- [ ] Legal Liaison sign-off

**Gate Owner**: Legal Liaison

**Block Criteria**: High legal risks (score ≥ 12) without approved mitigation

#### 5.3.3 Construction Phase Gate

**Legal Criteria**:
- [ ] Ongoing compliance monitoring active (license scanning in CI/CD)
- [ ] Vendor compliance verified (SOC 2 reports reviewed, certifications valid)
- [ ] Data protection controls verified (encryption, access controls, logging)
- [ ] Attribution files generated (open source license compliance)
- [ ] Legal review checkpoints met (no outstanding legal blockers)

**Gate Owner**: Legal Liaison (quarterly review)

**Block Criteria**: License violations detected, vendor certification expired

#### 5.3.4 Transition Phase Gate

**Legal Criteria**:
- [ ] Terms of Service finalized and reviewed
- [ ] Privacy Policy published and compliant (GDPR, CCPA)
- [ ] Compliance certifications obtained (SOC 2, ISO 27001, etc.)
- [ ] Export classification complete (ECCN assigned if applicable)
- [ ] License attributions included in release
- [ ] Data processing agreements active (customer DPAs signed)
- [ ] Legal sign-off for production release
- [ ] General Counsel sign-off (if high-risk project)

**Gate Owner**: Legal Liaison, General Counsel (high-risk)

**Block Criteria**: Missing compliance certifications, unsigned DPAs, export classification incomplete

## 6 Ongoing Monitoring and Review

> Establish continuous monitoring of legal risks, regulatory changes, and compliance status.

### 6.1 Legal Risk Monitoring Plan

| Risk Category | Monitoring Method | Frequency | Alert Criteria | Owner |
| --- | --- | --- | --- | --- |
| Regulatory compliance | Compliance dashboard, audit findings | Monthly | Open audit findings, certification expiring < 90 days | Legal Liaison |
| Contract SLA performance | SLA monitoring dashboards | Weekly | SLA breach projected within 7 days | Project Manager |
| License compliance | CI/CD license scans, SBOM reviews | Per build + quarterly audit | Denylist license detected, unknown license | Legal Liaison |
| Vendor compliance | Vendor certification tracking | Quarterly | Vendor SOC 2 expiring < 90 days | Legal Liaison |
| IP landscape | Patent database monitoring, competitor analysis | Quarterly | New competitor patent grants in our space | Patent Attorney |

### 6.2 Regulatory Change Monitoring

**Process**:
1. **Subscribe to updates**: Regulatory authority newsletters, legal news feeds, industry associations
2. **Assess impact**: When change announced, Legal Liaison assesses impact on project
3. **Update compliance framework**: Modify regulatory-compliance-framework-template.md
4. **Notify stakeholders**: Alert Project Manager, Engineering, Product if changes required
5. **Plan updates**: Create work items for compliance updates, set deadlines
6. **Verify compliance**: Test/audit changes before enforcement date

**Monitoring Sources**:
- **GDPR**: National DPA guidance, EDPB opinions, CJEU decisions
- **HIPAA**: HHS OCR guidance, enforcement actions
- **Export Control**: BIS Federal Register notices, DDTC ITAR amendments
- **Industry**: Legal newsletters (e.g., IAPP, TechCrunch Law)

### 6.3 Legal Risk Review Cycle

- **Weekly**: Project Manager reviews contract SLA status, escalates issues
- **Monthly**: Legal Liaison reviews compliance dashboard, legal risk register
- **Quarterly**: Legal Liaison conducts license audit, vendor compliance review, IP landscape review
- **Semi-annually**: General Counsel reviews high-risk projects (score ≥ 12)
- **Annually**: Comprehensive legal risk assessment, insurance policy renewal, legal training

### 6.4 Legal Risk Escalation

| Risk Level | Initial Owner | Escalation Threshold | Escalation Target | Escalation Timeline |
| --- | --- | --- | --- | --- |
| Low (3-5) | Legal Liaison | If risk increases to Medium | Senior Counsel | When detected |
| Medium (6-11) | Legal Liaison | If mitigation fails, risk increases to High | General Counsel | Within 5 business days |
| High (12-19) | General Counsel | If mitigation fails, litigation threatened | CEO, Board | Within 2 business days |
| Critical (20-25) | General Counsel | Immediately upon detection | CEO, Board | Within 4 hours |

**Escalation Triggers**:
- Risk score increases beyond threshold
- Mitigation plan fails or blocked
- Regulatory investigation or enforcement action
- Litigation threatened or filed
- Material contract breach
- IP infringement claim received

## Appendices

### Appendix A: Legal Contact Information

| Role | Name | Email | Phone | Responsibilities |
| --- | --- | --- | --- | --- |
| Legal Liaison | [name] | [email] | [phone] | Day-to-day legal reviews, risk tracking |
| Senior Counsel | [name] | [email] | [phone] | Escalated legal issues, contract negotiations |
| General Counsel | [name] | [email] | [phone] | High-risk decisions, litigation, regulatory investigations |
| Patent Attorney | [name] | [email] | [phone] | IP landscape analysis, FTO opinions, patent prosecution |
| Outside Counsel (General) | [firm] | [email] | [phone] | Litigation, specialized legal advice |
| Outside Counsel (IP) | [firm] | [email] | [phone] | Patent litigation, FTO analysis |

### Appendix B: Legal Risk Scenarios

**Scenario 1: GDPR Data Breach**
- **Event**: Ransomware attack exposes 10K EU customer records (name, email, purchase history)
- **Legal Obligations**: Notify DPA within 72 hours (Article 33), notify individuals (Article 34)
- **Potential Liability**: DPA fine up to €20M or 4% revenue, civil claims from individuals
- **Mitigation**: Incident response plan, cyber insurance, breach response counsel on retainer

**Scenario 2: Patent Infringement Claim**
- **Event**: Receive cease-and-desist letter alleging patent infringement
- **Legal Obligations**: Respond within 30 days (typical demand letter deadline)
- **Potential Liability**: Injunction (halt product sales), damages (lost profits or reasonable royalty), attorney fees
- **Mitigation**: FTO analysis before feature launch, patent attorney review, design-around options

**Scenario 3: Customer SLA Breach**
- **Event**: 4-hour outage causes monthly uptime to fall below 99.95% SLA commitment
- **Legal Obligations**: Issue service credit per contract terms (10% per 0.1% below SLA = ~$20K credit)
- **Potential Liability**: Service credits, customer churn risk, termination for cause if repeated breaches
- **Mitigation**: Multi-region architecture, real-time SLA monitoring, customer communication plan

### Appendix C: Legal Review Checklist Templates

**Inception Phase Legal Review Checklist**:
- [ ] Regulatory applicability determined
- [ ] Customer contracts reviewed
- [ ] Vendor contracts reviewed
- [ ] IP landscape analyzed
- [ ] Legal risks identified and scored
- [ ] Critical risks mitigated or escalated

**Production Release Legal Checklist**:
- [ ] Terms of Service finalized
- [ ] Privacy Policy compliant
- [ ] License attributions included
- [ ] Export classification complete
- [ ] Compliance certifications valid
- [ ] DPAs signed
- [ ] Legal Liaison approval
- [ ] General Counsel approval (if required)

## Agent Notes

- Prioritize legal risk mitigation based on risk score (likelihood × impact), not just impact alone
- Escalate critical risks (score ≥ 20) immediately to CEO/General Counsel
- Use insurance to transfer high-impact, low-likelihood risks (cyber breach, product liability)
- Conduct FTO analysis before launching features in patent-sensitive areas (ML, crypto, etc.)
- Monitor regulatory changes continuously, update compliance framework proactively
- Document all legal reviews and approvals for audit trail
- Verify legal gate criteria met before phase transitions
- Coordinate with Privacy Officer on GDPR/HIPAA privacy-specific risks
- Verify Automation Outputs entry is satisfied before signaling completion
