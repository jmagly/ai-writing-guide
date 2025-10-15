# Regulatory Compliance Framework Template

## Cover Page

- `Project Name`
- `Regulatory Compliance Framework`
- `Version 1.0`

## Revision History

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| `dd/mmm/yy` | `x.x` | `<details>` | `<name>` |

## Ownership & Collaboration

- Document Owner: Legal Liaison
- Contributor Roles: Privacy Officer, Security Gatekeeper, Compliance Team
- Automation Inputs: Regulatory standards databases, control frameworks, audit requirements
- Automation Outputs: Compliance status reports, control mapping matrices, audit evidence packages

## 1 Introduction

> Establish the regulatory compliance landscape for this project, identifying applicable regulations, mapping requirements to controls, and defining audit readiness procedures.

### 1.1 Purpose

This framework identifies regulatory obligations, maps them to technical and operational controls, establishes audit trails, and ensures the project meets all compliance requirements before and after deployment.

### 1.2 Scope

This document covers:
- Identification of applicable regulations and standards
- Mapping of regulatory requirements to implementation artifacts
- Compliance verification and evidence collection
- Audit preparation and certification tracking
- Continuous compliance monitoring procedures

### 1.3 Definitions, Acronyms, and Abbreviations

- **GDPR**: General Data Protection Regulation (EU)
- **HIPAA**: Health Insurance Portability and Accountability Act (US)
- **SOC 2**: System and Organization Controls Type 2
- **PCI-DSS**: Payment Card Industry Data Security Standard
- **ISO 27001**: Information Security Management System standard
- **CCPA**: California Consumer Privacy Act
- **ITAR**: International Traffic in Arms Regulations
- **EAR**: Export Administration Regulations
- **BAA**: Business Associate Agreement (HIPAA)
- **DPA**: Data Processing Agreement (GDPR)

### 1.4 References

- `security-requirements-template.md` - Security controls implementation
- `privacy-impact-assessment-template.md` - Privacy compliance
- `architecture-notebook-template.md` - Technical architecture
- `deployment-plan-template.md` - Production deployment controls
- `legal-risk-assessment-template.md` - Legal risk tracking

### 1.5 Overview

Section 2 identifies applicable regulations; Section 3 maps regulatory requirements to controls; Section 4 defines evidence collection; Section 5 establishes audit procedures; Section 6 covers continuous monitoring.

## 2 Applicable Regulations and Standards

> Identify all regulations, standards, and certifications applicable to this project based on industry, geography, data types, and business requirements.

### 2.1 Regulatory Applicability Assessment

| Regulation | Applicable? | Trigger | Scope | Enforcement Authority | Max Penalty |
| --- | --- | --- | --- | --- | --- |
| GDPR | [ ] Yes / [ ] No | EU personal data | All EU data subjects | National DPAs | €20M or 4% revenue |
| HIPAA | [ ] Yes / [ ] No | US healthcare PHI | PHI processing | HHS OCR | $1.5M per violation type |
| SOC 2 | [ ] Yes / [ ] No | Enterprise SaaS | Trust services | AICPA | Contract breach, loss of certification |
| PCI-DSS | [ ] Yes / [ ] No | Payment card data | Cardholder data | PCI SSC | $5K-$100K/month fines |
| ISO 27001 | [ ] Yes / [ ] No | ISMS certification | Information security | Certification body | Loss of certification |
| CCPA | [ ] Yes / [ ] No | CA consumer data | CA residents | CA AG | $2.5K-$7.5K per violation |
| ITAR | [ ] Yes / [ ] No | Defense articles | US persons, export | DDTC | Criminal penalties |
| EAR | [ ] Yes / [ ] No | Dual-use tech | Export destinations | BIS | Criminal penalties |

### 2.2 Industry Standards

| Standard | Applicable? | Purpose | Implementation Level |
| --- | --- | --- | --- |
| NIST CSF | [ ] Yes / [ ] No | Cybersecurity framework | Target: [Identify/Protect/Detect/Respond/Recover] |
| OWASP Top 10 | [ ] Yes / [ ] No | Web application security | Target: All mitigations implemented |
| CIS Controls | [ ] Yes / [ ] No | Security controls baseline | Target: Level [1/2/3] |
| WCAG 2.1 | [ ] Yes / [ ] No | Accessibility compliance | Target: Level [A/AA/AAA] |

### 2.3 Organizational Standards

| Standard | Description | Owner | Enforcement |
| --- | --- | --- | --- |
| Coding standards | [Reference: programming-guidelines-template.md] | Engineering Lead | CI/CD linting |
| Security standards | [Reference: security-requirements-template.md] | Security Gatekeeper | Security gates |
| Privacy standards | [Reference: privacy-impact-assessment-template.md] | Privacy Officer | Privacy review |

## 3 Compliance Mapping Matrix

> Map each regulatory requirement to implementation artifacts and verification methods, establishing traceability from legal obligation to technical control.

### 3.1 GDPR Compliance (If Applicable)

| Article | Requirement Summary | Implementation Artifact | Verification Method | Status | Evidence Location |
| --- | --- | --- | --- | --- | --- |
| Art. 5 | Data processing principles | Data flow diagrams, retention policies | Privacy review | [Complete/Partial/Planned] | PIA Section 4 |
| Art. 6 | Lawful basis for processing | Consent management system, legitimate interest assessments | Legal review | [Complete/Partial/Planned] | PIA Section 2 |
| Art. 7 | Consent requirements | Consent UX, opt-in flows, withdrawal mechanism | User testing | [Complete/Partial/Planned] | Test report TR-012 |
| Art. 12-22 | Data subject rights | Subject rights portal, deletion workflows | Functional testing | [Complete/Partial/Planned] | API docs, test cases |
| Art. 25 | Privacy by design | Architecture patterns, data minimization | Design review | [Complete/Partial/Planned] | Architecture Notebook Sec 5 |
| Art. 28 | Processor agreements | DPAs with vendors | Contract review | [Complete/Partial/Planned] | Contract management template |
| Art. 32 | Security of processing | Encryption, access controls, monitoring | Penetration testing | [Complete/Partial/Planned] | Security requirements Sec 3 |
| Art. 33-34 | Breach notification | Incident response plan, notification templates | IR drill | [Complete/Partial/Planned] | Incident response template |
| Art. 35 | Data Protection Impact Assessment | DPIA for high-risk processing | Legal sign-off | [Complete/Partial/Planned] | PIA document |
| Art. 44-49 | International transfers | Standard Contractual Clauses, adequacy decisions | Legal review | [Complete/Partial/Planned] | Data sovereignty template |

### 3.2 HIPAA Compliance (If Applicable)

| Rule | Requirement | Implementation Artifact | Verification Method | Status | Evidence Location |
| --- | --- | --- | --- | --- | --- |
| 164.308(a)(1) | Security management process | Risk assessment, security policies | Audit review | [Complete/Partial/Planned] | Risk register |
| 164.308(a)(3) | Workforce security | Access controls, training records | HR verification | [Complete/Partial/Planned] | Training logs |
| 164.308(a)(4) | Information access management | Role-based access control (RBAC) | Access review | [Complete/Partial/Planned] | IAM configuration |
| 164.310(a)(1) | Facility access controls | Physical security, visitor logs | Facility audit | [Complete/Partial/Planned] | Physical security plan |
| 164.312(a)(1) | Access controls | Unique user IDs, emergency access | Penetration test | [Complete/Partial/Planned] | Security requirements Sec 4 |
| 164.312(a)(2)(iv) | Encryption and decryption | Encryption at rest and in transit | Security review | [Complete/Partial/Planned] | Security requirements Sec 5 |
| 164.312(b) | Audit controls | Logging, SIEM, audit trails | Log review | [Complete/Partial/Planned] | Monitoring plan |
| 164.312(c)(1) | Integrity controls | Data integrity checks, checksums | Data validation testing | [Complete/Partial/Planned] | Test plan TP-008 |
| 164.314(a)(1) | Business associate contracts | BAAs with vendors | Contract review | [Complete/Partial/Planned] | Contract management template |
| 164.530(b) | Safeguard requirements | Administrative, physical, technical safeguards | Compliance audit | [Complete/Partial/Planned] | Security architecture |

### 3.3 SOC 2 Trust Service Criteria (If Applicable)

| Criteria | Requirement | Implementation Artifact | Verification Method | Status | Evidence Location |
| --- | --- | --- | --- | --- | --- |
| CC1.1 | Organizational structure | Governance model, org chart | Document review | [Complete/Partial/Planned] | Governance docs |
| CC1.2 | Board oversight | Board meetings, oversight activities | Meeting minutes | [Complete/Partial/Planned] | Board records |
| CC2.1 | Communication | Security policies, communication plan | Policy review | [Complete/Partial/Planned] | Policy repository |
| CC3.1 | Policies and procedures | Security policies, change management | Policy review | [Complete/Partial/Planned] | Policy docs |
| CC4.1 | Monitoring activities | SIEM, dashboards, alerting | Tool demonstration | [Complete/Partial/Planned] | Monitoring plan |
| CC5.1 | Risk assessment process | Risk register, risk assessments | Risk review | [Complete/Partial/Planned] | Risk management plan |
| CC6.1 | Logical access controls | Authentication, authorization, MFA | Access review | [Complete/Partial/Planned] | IAM configuration |
| CC7.1 | Threat detection | IDS/IPS, SIEM, threat intelligence | Security testing | [Complete/Partial/Planned] | Security monitoring |
| CC8.1 | Change management | Change approval, testing, rollback | Change log review | [Complete/Partial/Planned] | Change management plan |
| CC9.1 | Vendor management | Vendor assessments, SOC 2 reviews | Vendor audit | [Complete/Partial/Planned] | Contract management template |

### 3.4 PCI-DSS Requirements (If Applicable)

| Requirement | Description | Implementation Artifact | Verification Method | Status | Evidence Location |
| --- | --- | --- | --- | --- | --- |
| 1 | Firewall configuration | Network diagrams, firewall rules | Firewall review | [Complete/Partial/Planned] | Network architecture |
| 2 | Vendor defaults | System hardening, configuration management | Configuration audit | [Complete/Partial/Planned] | CM plan |
| 3 | Stored cardholder data protection | Encryption, data masking, tokenization | Data flow review | [Complete/Partial/Planned] | Data protection spec |
| 4 | Encrypted transmission | TLS configuration, certificate management | SSL labs scan | [Complete/Partial/Planned] | Security requirements Sec 5 |
| 5 | Anti-malware | Endpoint protection, malware scanning | AV logs | [Complete/Partial/Planned] | Security monitoring |
| 6 | Secure development | SDLC security, code review, SAST/DAST | Code review logs | [Complete/Partial/Planned] | Development plan |
| 7 | Access control | Need-to-know access, RBAC | Access review | [Complete/Partial/Planned] | IAM configuration |
| 8 | Unique IDs | User identification, MFA | Identity audit | [Complete/Partial/Planned] | IAM policies |
| 9 | Physical access | Physical security controls | Facility audit | [Complete/Partial/Planned] | Physical security plan |
| 10 | Logging and monitoring | Audit trails, log retention, SIEM | Log review | [Complete/Partial/Planned] | Monitoring plan |
| 11 | Security testing | Vulnerability scanning, penetration testing | Pentest reports | [Complete/Partial/Planned] | Security test plan |
| 12 | Security policy | Information security policy | Policy review | [Complete/Partial/Planned] | Policy repository |

### 3.5 ISO 27001 Controls (If Applicable)

| Control | Description | Implementation Artifact | Verification Method | Status | Evidence Location |
| --- | --- | --- | --- | --- | --- |
| A.5 | Information security policies | Security policies | Policy review | [Complete/Partial/Planned] | Policy docs |
| A.6 | Organization of information security | Security organization, roles | Org chart review | [Complete/Partial/Planned] | Governance docs |
| A.7 | Human resource security | Background checks, training | HR records | [Complete/Partial/Planned] | HR files |
| A.8 | Asset management | Asset inventory, classification | Asset review | [Complete/Partial/Planned] | Asset register |
| A.9 | Access control | Access policies, RBAC | Access review | [Complete/Partial/Planned] | IAM configuration |
| A.10 | Cryptography | Encryption policies, key management | Crypto review | [Complete/Partial/Planned] | Security requirements Sec 5 |
| A.11 | Physical security | Physical controls | Facility audit | [Complete/Partial/Planned] | Physical security plan |
| A.12 | Operations security | Change management, backup, logging | Operations review | [Complete/Partial/Planned] | Operations plan |
| A.13 | Communications security | Network security, data transfer | Network review | [Complete/Partial/Planned] | Network architecture |
| A.14 | System acquisition, development, maintenance | Secure SDLC | SDLC review | [Complete/Partial/Planned] | Development plan |
| A.15 | Supplier relationships | Vendor management | Vendor review | [Complete/Partial/Planned] | Contract management template |
| A.16 | Incident management | Incident response | IR drill | [Complete/Partial/Planned] | Incident response template |
| A.17 | Business continuity | BCP/DR plans | DR test | [Complete/Partial/Planned] | Business continuity plan |
| A.18 | Compliance | Legal compliance, audits | Compliance review | [Complete/Partial/Planned] | This document |

## 4 Evidence Collection and Documentation

> Define what evidence must be collected, how it is stored, who is responsible, and how it supports audit readiness.

### 4.1 Evidence Types

| Evidence Type | Description | Collection Method | Storage Location | Retention Period | Owner |
| --- | --- | --- | --- | --- | --- |
| Policies and procedures | Security policies, SOPs | Document repository | Policy management system | Lifecycle + 7 years | Legal Liaison |
| Technical configurations | Firewall rules, IAM settings | Configuration exports | Version control, CM system | Lifecycle + 3 years | Configuration Manager |
| Access logs | Authentication, authorization events | SIEM, log aggregation | Log storage (encrypted) | 1 year minimum | Security Operations |
| Change records | Change tickets, approvals | Change management system | Ticketing system | 3 years | Configuration Manager |
| Test results | Penetration tests, vulnerability scans | Test reports | Document repository | Lifecycle + 3 years | Security Gatekeeper |
| Training records | Security awareness, compliance training | Learning management system | HR system | Employment + 7 years | HR Manager |
| Vendor assessments | SOC 2 reports, security questionnaires | Vendor review process | Vendor management system | Contract term + 3 years | Legal Liaison |
| Incident reports | Security incidents, breaches | Incident management system | Incident repository | Lifecycle + 7 years | Security Gatekeeper |
| Audit reports | Internal audits, external audits | Audit process | Audit repository | 10 years | Compliance Team |

### 4.2 Evidence Collection Procedures

#### 4.2.1 Automated Evidence Collection

- **Log aggregation**: SIEM collects authentication, authorization, data access, and change logs
- **Configuration snapshots**: Configuration management tool exports settings weekly
- **Scan results**: Vulnerability scanners and SAST/DAST tools store results in centralized repository
- **Metrics collection**: Monitoring systems capture uptime, performance, error rates for SLA verification

#### 4.2.2 Manual Evidence Collection

- **Policy reviews**: Legal Liaison maintains document repository with version control
- **Training records**: HR exports training completion reports quarterly
- **Vendor assessments**: Legal Liaison requests and stores SOC 2 reports, security questionnaires
- **Audit artifacts**: Compliance Team compiles evidence packages before audits

### 4.3 Evidence Quality Standards

- **Completeness**: All required evidence for each control must be present
- **Accuracy**: Evidence must be current, unmodified, and from authoritative sources
- **Traceability**: Evidence must link to specific controls and regulatory requirements
- **Timeliness**: Evidence collection must occur within required timeframes (real-time logs vs. annual policies)

## 5 Audit Preparation and Certification

> Establish procedures for preparing for external audits, managing audit processes, and maintaining certifications.

### 5.1 Audit Timeline

| Certification | Audit Type | Frequency | Lead Time | Next Audit Date | Owner |
| --- | --- | --- | --- | --- | --- |
| SOC 2 Type II | External audit | Annual | 6 months | [yyyy-mm-dd] | Compliance Team |
| ISO 27001 | Certification audit | 3-year renewal + annual surveillance | 9 months | [yyyy-mm-dd] | Compliance Team |
| HIPAA | Self-assessment + periodic HHS audit | Annual self-assessment | 3 months | [yyyy-mm-dd] | Privacy Officer |
| PCI-DSS | Qualified Security Assessor (QSA) | Annual | 4 months | [yyyy-mm-dd] | Security Gatekeeper |

### 5.2 Pre-Audit Preparation

#### 5.2.1 Readiness Assessment (T-90 days)

- [ ] Conduct internal audit using audit framework
- [ ] Identify gaps between current state and requirements
- [ ] Create remediation plan with owners and deadlines
- [ ] Verify evidence collection is complete

#### 5.2.2 Gap Remediation (T-60 days)

- [ ] Execute remediation plan
- [ ] Re-test controls to verify fixes
- [ ] Update documentation to reflect changes
- [ ] Collect additional evidence as needed

#### 5.2.3 Pre-Audit Review (T-30 days)

- [ ] Compile evidence package organized by control
- [ ] Conduct mock audit with internal team
- [ ] Address any findings from mock audit
- [ ] Brief stakeholders on audit process and expectations

### 5.3 Audit Execution

- **Kickoff meeting**: Review audit scope, timeline, evidence requests
- **Evidence submission**: Provide evidence package to auditors
- **Interviews**: Coordinate with auditors for process and control interviews
- **Testing**: Support auditors in control testing (access reviews, log analysis, etc.)
- **Findings review**: Address auditor questions and provide additional evidence
- **Draft report review**: Review draft report, challenge findings if needed
- **Corrective actions**: Create plan for any findings or recommendations

### 5.4 Post-Audit Activities

- [ ] Document lessons learned
- [ ] Implement corrective actions from audit findings
- [ ] Update compliance framework based on audit feedback
- [ ] Communicate certification status to stakeholders
- [ ] Schedule next audit

### 5.5 Certification Maintenance

| Certification | Maintenance Activities | Frequency | Owner |
| --- | --- | --- | --- |
| SOC 2 Type II | Continuous control monitoring, quarterly reviews | Ongoing | Compliance Team |
| ISO 27001 | Annual surveillance audits, internal audits every 6 months | Per schedule | Compliance Team |
| HIPAA | Annual risk assessment, policy updates | Annual | Privacy Officer |
| PCI-DSS | Quarterly network scans, annual penetration test | Per schedule | Security Gatekeeper |

## 6 Continuous Compliance Monitoring

> Establish mechanisms for ongoing compliance verification, identifying drift, and maintaining control effectiveness.

### 6.1 Compliance Monitoring Plan

| Control Category | Monitoring Method | Frequency | Alert Threshold | Owner |
| --- | --- | --- | --- | --- |
| Access controls | Automated access reviews, SIEM alerts | Real-time + monthly review | Unauthorized access attempts | Security Operations |
| Encryption | Certificate expiration monitoring, TLS config scans | Daily + weekly | Certificate expiring < 30 days | Security Operations |
| Logging | Log volume monitoring, log integrity checks | Real-time | Missing logs > 1 hour | Security Operations |
| Vulnerability management | Automated vulnerability scanning | Weekly | Critical vulnerabilities detected | Security Operations |
| Change management | Change approval tracking, unauthorized change detection | Per change + weekly | Unapproved changes | Configuration Manager |
| Training compliance | Training completion tracking | Monthly | Employee overdue > 30 days | HR Manager |
| Vendor compliance | SOC 2 expiration tracking | Quarterly | SOC 2 expiring < 90 days | Legal Liaison |
| Incident response | Incident detection and response time tracking | Per incident | Response SLA breach | Security Gatekeeper |

### 6.2 Compliance Dashboards

#### 6.2.1 Executive Compliance Dashboard

- **Overall compliance status**: Traffic light (green/yellow/red) by regulation
- **Certification status**: Valid certifications and expiration dates
- **Open findings**: Count and severity of open audit findings
- **Control effectiveness**: % of controls operating effectively
- **Compliance trends**: Historical compliance scores over time

#### 6.2.2 Operational Compliance Dashboard

- **Control status by category**: Access, encryption, logging, change management, etc.
- **Evidence collection status**: % of required evidence collected
- **Audit readiness score**: 0-100 score based on evidence completeness
- **Remediation tracking**: Open remediations, age, priority
- **Vendor compliance**: Vendor certifications, expiration dates, risk levels

### 6.3 Compliance Drift Detection

#### 6.3.1 Configuration Drift

- **Baseline configurations**: Define approved security configurations (CIS benchmarks, hardening standards)
- **Drift detection**: Automated scanning compares current state to baseline
- **Alerting**: Alert on unauthorized configuration changes
- **Remediation**: Auto-remediate or create ticket for manual fix

#### 6.3.2 Policy Drift

- **Policy versioning**: Track policy versions, review dates, approval dates
- **Staleness detection**: Alert when policies approach review date (30 days before)
- **Ownership tracking**: Ensure policies have owners responsible for updates
- **Regulatory updates**: Monitor regulatory changes, assess impact on policies

#### 6.3.3 Evidence Drift

- **Evidence freshness**: Track when evidence was last collected
- **Gap identification**: Identify missing evidence for controls
- **Automated collection**: Where possible, automate evidence collection
- **Manual collection reminders**: Alert evidence owners when manual collection is due

### 6.4 Regulatory Change Management

| Regulation | Monitoring Method | Update Frequency | Impact Assessment | Owner |
| --- | --- | --- | --- | --- |
| GDPR | Subscribe to DPA guidance, legal newsletters | Ongoing | As changes occur | Privacy Officer |
| HIPAA | Monitor HHS OCR updates | Quarterly | As changes occur | Privacy Officer |
| SOC 2 | Monitor AICPA Trust Services Criteria updates | Annual | As changes occur | Compliance Team |
| PCI-DSS | Monitor PCI SSC updates | Annual | As changes occur | Security Gatekeeper |
| ISO 27001 | Monitor ISO standard updates | Per revision cycle (typically 3-5 years) | As changes occur | Compliance Team |

### 6.5 Compliance Review Cycle

- **Monthly**: Review compliance dashboards, address open findings
- **Quarterly**: Conduct internal control testing, update evidence packages
- **Semi-annually**: Internal audit of high-risk controls
- **Annually**: Comprehensive compliance review, external audits

## Appendices

### Appendix A: Regulatory Contact Information

| Regulation | Authority | Contact | Website |
| --- | --- | --- | --- |
| GDPR | Relevant national Data Protection Authority | [contact info] | [URL] |
| HIPAA | HHS Office for Civil Rights | [contact info] | [URL] |
| SOC 2 | Auditing firm | [contact info] | [URL] |
| PCI-DSS | Acquiring bank, QSA | [contact info] | [URL] |

### Appendix B: Compliance Acronyms Quick Reference

- **DPA**: Data Protection Authority (GDPR enforcement)
- **HHS OCR**: US Department of Health and Human Services Office for Civil Rights (HIPAA enforcement)
- **AICPA**: American Institute of Certified Public Accountants (SOC 2 framework owner)
- **PCI SSC**: Payment Card Industry Security Standards Council (PCI-DSS framework owner)
- **QSA**: Qualified Security Assessor (PCI-DSS auditor)
- **SIEM**: Security Information and Event Management (log aggregation and analysis)
- **RBAC**: Role-Based Access Control
- **MFA**: Multi-Factor Authentication

## Agent Notes

- Prioritize regulations based on business impact: contract-required certifications (SOC 2) before nice-to-have standards
- Automate evidence collection wherever possible to reduce manual burden and improve audit efficiency
- Establish continuous monitoring to detect compliance drift early, before audits
- Maintain traceability from regulatory requirements to implementation artifacts to evidence
- Coordinate with Privacy Officer on GDPR/HIPAA privacy-specific requirements
- Verify Automation Outputs entry is satisfied before signaling completion
