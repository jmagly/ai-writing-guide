# Privacy Impact Assessment (DPIA)

## Document Control

| Field | Value |
|-------|-------|
| Document Type | Data Protection Impact Assessment (DPIA) |
| Project Name | `[Project/System Name]` |
| Version | `[e.g., 1.0]` |
| Assessment Date | `[YYYY-MM-DD]` |
| Author | `[Privacy Officer, Data Protection Officer]` |
| Reviewers | `[Legal, Security Architect, Product Owner]` |
| Status | `[Draft/In Review/Approved/Requires Art. 36 Consultation]` |
| DPIA ID | `[DPIA-XXX]` |
| Related Documents | Project Intake, Lawful Basis Assessment, Data Classification, Cross-Border Transfer Assessment |

## Purpose and Regulatory Basis

### Purpose of DPIA

This Data Protection Impact Assessment (DPIA) evaluates privacy risks associated with `[Project/System Name]` to ensure compliance with GDPR Article 35 and other applicable data protection regulations.

### Regulatory Requirements

**GDPR Article 35(1)**: DPIA required when processing is likely to result in high risk to rights and freedoms of natural persons.

**Triggering Criteria** (see DPIA Trigger Assessment):
- [ ] Automated decision-making with legal or significant effects (Art. 22)
- [ ] Large-scale processing of special category data (Art. 9)
- [ ] Systematic monitoring of publicly accessible areas (CCTV, tracking)
- [ ] Innovative technology use (AI/ML, biometrics, profiling)
- [ ] Data combination from multiple sources
- [ ] Processing of vulnerable populations (children, employees, patients)
- [ ] Processing preventing data subjects from exercising rights
- [ ] Other high-risk criteria per supervisory authority guidance

### Scope of Assessment

**Systems/Processes Covered**: `[List all systems, applications, processes in scope]`

**Data Processing Activities**: `[Describe processing operations: collection, storage, analysis, sharing, deletion]`

**Geographic Scope**: `[EU/EEA, specific member states, international]`

**Temporal Scope**: `[Project duration, data retention period]`

**Exclusions**: `[Any processing activities explicitly out of scope]`

## Section 1: Processing Description (GDPR Art. 35(7)(a))

### 1.1 Processing Operations

#### Nature of Processing

| Aspect | Description |
|--------|-------------|
| **Processing Activities** | `[Collection, storage, analysis, sharing, profiling, deletion, etc.]` |
| **Automated Processing** | `[Yes/No - describe any automated decision-making, profiling, or AI/ML]` |
| **Processing Scale** | `[Number of data subjects, data volume, geographic reach]` |
| **Processing Context** | `[Where and how processing occurs: web, mobile, IoT, CCTV, etc.]` |
| **Processing Duration** | `[One-time, continuous, periodic]` |

#### Technology and Infrastructure

| Component | Description |
|-----------|-------------|
| **Technology Stack** | `[Programming languages, frameworks, databases, cloud services]` |
| **Hosting/Infrastructure** | `[On-premises, cloud provider, region/availability zones]` |
| **Third-Party Services** | `[Analytics, payment processors, CDNs, marketing tools]` |
| **Data Storage Systems** | `[Databases, file storage, backups, archives]` |
| **Data Transfer Mechanisms** | `[APIs, file transfers, manual exports, integrations]` |

### 1.2 Personal Data Inventory

#### Data Categories

| Data Category | Examples | Data Classification | Volume/Scale | Special Category (Art. 9)? |
|---------------|----------|---------------------|--------------|---------------------------|
| Identification Data | Name, email, phone, address, IP address | Restricted | `[e.g., 100K subjects]` | No |
| Financial Data | Payment card, bank account, transaction history | Restricted | `[Volume]` | No |
| Behavioral Data | Usage patterns, preferences, clickstream | Confidential/Restricted | `[Volume]` | No |
| Special Category Data | Health, biometric, genetic, racial/ethnic origin | Restricted | `[Volume]` | **Yes** |
| Authentication Data | Passwords (hashed), MFA tokens, session data | Restricted | `[Volume]` | No |
| Communication Data | Messages, emails, support tickets | Confidential | `[Volume]` | No |
| Device/Technical Data | Device ID, browser fingerprint, cookies | Internal/Confidential | `[Volume]` | No |

**Special Category Data (GDPR Art. 9)**: If yes, document explicit consent or Art. 9(2) condition:
- [ ] Explicit consent (Art. 9(2)(a))
- [ ] Employment/social security law (Art. 9(2)(b))
- [ ] Vital interests (Art. 9(2)(c))
- [ ] Legitimate activities of foundation/association (Art. 9(2)(d))
- [ ] Data manifestly made public (Art. 9(2)(e))
- [ ] Legal claims/judicial acts (Art. 9(2)(f))
- [ ] Substantial public interest (Art. 9(2)(g))
- [ ] Health/social care (Art. 9(2)(h))
- [ ] Public health (Art. 9(2)(i))
- [ ] Research/statistics (Art. 9(2)(j))

**Children's Data (GDPR Art. 8)**: Does processing involve children (under 16, or member state threshold)?
- [ ] Yes - Age verification method: `[Describe]`
- [ ] Yes - Parental consent mechanism: `[Describe]`
- [ ] No

### 1.3 Data Subjects

| Data Subject Category | Description | Vulnerable Population? | Volume |
|-----------------------|-------------|------------------------|--------|
| Customers | `[End users, subscribers, purchasers]` | `[Yes/No]` | `[Number]` |
| Employees | `[Staff, contractors, job applicants]` | Potentially | `[Number]` |
| Children | `[Users under 16/13]` | **Yes** | `[Number]` |
| Patients | `[Healthcare subjects]` | **Yes** | `[Number]` |
| Website Visitors | `[Anonymous visitors tracked]` | No | `[Number]` |
| Other | `[Describe]` | `[Yes/No]` | `[Number]` |

**Vulnerable Populations**: Processing of children, employees, patients, asylum seekers, elderly, or other vulnerable groups requires enhanced protections and heightened scrutiny.

### 1.4 Processing Purposes

| Purpose | Lawful Basis (Art. 6) | Legitimate Interest (if Art. 6(1)(f)) | Special Category Basis (if Art. 9) |
|---------|----------------------|---------------------------------------|-----------------------------------|
| `[Purpose 1: e.g., Service delivery]` | Contract (Art. 6(1)(b)) | N/A | N/A |
| `[Purpose 2: e.g., Marketing]` | Consent (Art. 6(1)(a)) | N/A | N/A |
| `[Purpose 3: e.g., Fraud detection]` | Legitimate Interest (Art. 6(1)(f)) | `[LIA: Prevent fraud, protect users]` | N/A |
| `[Purpose 4: e.g., Health monitoring]` | Consent (Art. 6(1)(a)) | N/A | Explicit consent (Art. 9(2)(a)) |

**Purpose Limitation**: Data will be used **only** for the purposes listed above. Any new purposes require updated DPIA and lawful basis assessment.

### 1.5 Data Recipients

#### Internal Recipients

| Recipient | Purpose | Access Level | Data Categories |
|-----------|---------|--------------|-----------------|
| Engineering team | System development, maintenance | Need-to-know | `[Technical data, pseudonymized user data]` |
| Customer support | Issue resolution | Case-by-case | `[Identification, account data]` |
| Marketing team | Campaign management | Consented users only | `[Contact data, preferences]` |
| Data analytics team | Product improvement | Aggregated/anonymized | `[Behavioral data]` |

#### External Recipients (Third Parties)

| Recipient | Purpose | Controller/Processor | DPA Signed? | Data Categories | Location |
|-----------|---------|---------------------|-------------|-----------------|----------|
| `[Cloud provider: AWS]` | Infrastructure hosting | Processor | Yes | All data | `[US - SCCs]` |
| `[Payment processor]` | Payment processing | Processor | Yes | Payment data | `[EU]` |
| `[Analytics service]` | Usage analytics | Processor | Yes | Behavioral data (pseudonymized) | `[US - SCCs]` |
| `[Marketing platform]` | Email campaigns | Processor | Yes | Contact data (consented) | `[EU]` |

**Data Processing Agreements (DPAs)**: All processors must have signed GDPR-compliant DPAs (Art. 28). See Processor Agreement Template.

**Sub-Processors**: List known sub-processors or require processor to maintain current list with notification obligation.

### 1.6 Cross-Border Data Transfers

| Transfer | Destination Country | Transfer Mechanism | Transfer Impact Assessment? | Approval Date |
|----------|---------------------|--------------------|-----------------------------|---------------|
| `[AWS hosting]` | United States | Standard Contractual Clauses (2021) | Yes - `[TIA-001]` | `[Date]` |
| `[Support vendor]` | India | SCCs + supplementary measures (encryption) | Yes - `[TIA-002]` | `[Date]` |

**GDPR Chapter V Compliance**: All transfers outside EU/EEA must use approved transfer mechanisms:
- Adequacy decision (Art. 45): UK, Switzerland, Japan, etc.
- Standard Contractual Clauses (SCCs) (Art. 46(2)(c)): EU Commission 2021 templates
- Binding Corporate Rules (BCRs) (Art. 47)
- Derogations (Art. 49): Limited use only

See Cross-Border Transfer Assessment Template for full analysis.

### 1.7 Retention and Deletion

| Data Category | Retention Period | Retention Justification | Deletion Method | Deletion Verification |
|---------------|------------------|-------------------------|-----------------|----------------------|
| Account data | Account lifetime + 30 days | Contract fulfillment, user access | Cryptographic erasure | Automated verification report |
| Transaction data | 7 years | Legal obligation (tax/accounting) | Overwrite + archive deletion | Audit trail |
| Marketing data | Until consent withdrawn | Consent-based | Immediate suppression + 90-day backup purge | Suppression list verification |
| Log data | 90 days | Security monitoring | Rolling deletion | Automated log rotation |
| Backup data | 90 days from backup creation | Disaster recovery | Tape/media destruction | Certificate of destruction |

**Storage Limitation (GDPR Art. 5(1)(e))**: Data retained only as long as necessary for purpose. Automated deletion mechanisms mandatory.

See Data Retention and Deletion Policy Template for detailed schedules.

## Section 2: Necessity and Proportionality (GDPR Art. 35(7)(b))

### 2.1 Data Minimization

**Principle**: Collect only data that is adequate, relevant, and limited to what is necessary (GDPR Art. 5(1)(c)).

| Data Element | Necessity Justification | Alternatives Considered | Data Minimization Measure |
|--------------|------------------------|-------------------------|---------------------------|
| Email address | Required for account creation, communication | None - essential for service | None - minimum required |
| Phone number | Optional for 2FA, account recovery | Email-only recovery rejected due to security risk | Made optional, not mandatory |
| Date of birth | Age verification (regulatory requirement) | Age range rejected - not granular enough | Collect year only (not full DOB) |
| Precise geolocation | Fraud detection, service delivery | Coarse location (city-level) acceptable | IP geolocation only, not GPS |
| Full name | Contract fulfillment, legal identity | Pseudonym rejected - not legally binding | Required but not shared externally |

**Minimization Controls**:
- [ ] Optional fields clearly marked
- [ ] Progressive disclosure (ask for data only when needed)
- [ ] Pseudonymization for analytics (Art. 32(1)(a))
- [ ] Anonymization when identification not required
- [ ] Data aggregation instead of individual records

### 2.2 Purpose Limitation

**Principle**: Data collected for specified, explicit, legitimate purposes; not further processed incompatibly (GDPR Art. 5(1)(b)).

**Purpose Compatibility Test**:
- [ ] New processing purpose aligns with original purpose
- [ ] Data subjects have reasonable expectation of new use
- [ ] New purpose disclosed in privacy notice
- [ ] If incompatible: obtain new consent or establish new lawful basis

**Secondary Use Prevention**:
- Technical controls: Access restrictions prevent unauthorized purpose use
- Organizational controls: Policy training, audit monitoring
- Consent granularity: Separate consent for marketing vs. service delivery

### 2.3 Proportionality Assessment

**Balancing Test**: Is the processing proportionate to the legitimate aim?

| Factor | Assessment |
|--------|------------|
| **Legitimate Aim** | `[e.g., Fraud prevention, service improvement, regulatory compliance]` |
| **Necessity** | `[Why this processing is required to achieve aim; alternatives rejected]` |
| **Less Intrusive Alternatives** | `[Other methods considered: aggregation, anonymization, sampling]` |
| **Safeguards** | `[Technical and organizational measures to reduce intrusiveness]` |
| **Data Subject Impact** | `[Low/Medium/High - justification]` |
| **Proportionality Conclusion** | `[Proportionate / Requires mitigation / Disproportionate]` |

**Conclusion**: Processing is `[proportionate/not proportionate]` because `[justification]`.

## Section 3: Risk Assessment (GDPR Art. 35(7)(c))

### 3.1 Risk Methodology

**Risk Formula**: Risk = Likelihood × Impact

**Likelihood Scale**:
1. Remote: Unlikely to occur (0-10% probability)
2. Possible: Could occur (10-40% probability)
3. Likely: Probable occurrence (40-70% probability)
4. Very Likely: Expected to occur (70-100% probability)

**Impact Scale** (on data subject rights and freedoms):
1. Minimal: Inconvenience, no lasting effect
2. Moderate: Distress, reversible harm
3. Significant: Lasting distress, financial loss, reputational damage
4. Severe: Irreversible harm, discrimination, identity theft, physical harm

**Risk Matrix**:

| Likelihood / Impact | Minimal | Moderate | Significant | Severe |
|---------------------|---------|----------|-------------|--------|
| **Remote** | Low | Low | Medium | High |
| **Possible** | Low | Medium | High | Critical |
| **Likely** | Medium | High | Critical | Critical |
| **Very Likely** | High | Critical | Critical | Critical |

### 3.2 Privacy Risk Scenarios

#### Risk 1: Unauthorized Access or Data Breach

| Attribute | Value |
|-----------|-------|
| **Risk Description** | External attacker or malicious insider gains unauthorized access to personal data |
| **Threat Actors** | Cybercriminals, nation-states, malicious insiders, hacktivists |
| **Vulnerabilities** | Weak authentication, unpatched systems, excessive access privileges, unencrypted data |
| **Likelihood** | `[Remote/Possible/Likely/Very Likely]` - Justification: `[Based on threat landscape, existing controls]` |
| **Impact** | `[Minimal/Moderate/Significant/Severe]` - Justification: `[Data sensitivity, volume, population affected]` |
| **Risk Level** | `[Low/Medium/High/Critical]` |
| **Affected Data Subjects** | `[All users, specific vulnerable groups]` |
| **Potential Harms** | Identity theft, financial fraud, discrimination, reputational damage, psychological distress |

#### Risk 2: Unlawful Processing (Purpose Creep, Function Creep)

| Attribute | Value |
|-----------|-------|
| **Risk Description** | Data used for purposes beyond original collection purpose without lawful basis |
| **Threat Actors** | Internal business units (marketing, analytics), processors |
| **Vulnerabilities** | Lack of access controls, unclear purpose documentation, weak governance |
| **Likelihood** | `[Remote/Possible/Likely/Very Likely]` |
| **Impact** | `[Minimal/Moderate/Significant/Severe]` |
| **Risk Level** | `[Low/Medium/High/Critical]` |
| **Affected Data Subjects** | `[Population]` |
| **Potential Harms** | Loss of control, unwanted marketing, profiling without consent, trust erosion |

#### Risk 3: Data Subject Rights Violations

| Attribute | Value |
|-----------|-------|
| **Risk Description** | Inability to fulfill data subject requests (access, erasure, portability) within 30-day deadline |
| **Threat Actors** | N/A (operational risk) |
| **Vulnerabilities** | Data scattered across systems, no deletion APIs, manual processes, complex data architecture |
| **Likelihood** | `[Remote/Possible/Likely/Very Likely]` |
| **Impact** | `[Minimal/Moderate/Significant/Severe]` - Justification: Violates fundamental rights (GDPR Chapter III) |
| **Risk Level** | `[Low/Medium/High/Critical]` |
| **Affected Data Subjects** | Data subjects exercising rights |
| **Potential Harms** | Inability to exercise rights, regulatory penalties, reputational damage |

#### Risk 4: Automated Decision-Making and Profiling (Art. 22)

| Attribute | Value |
|-----------|-------|
| **Risk Description** | Automated decisions produce discriminatory, inaccurate, or opaque outcomes |
| **Threat Actors** | N/A (algorithmic risk) |
| **Vulnerabilities** | Biased training data, unexplainable AI models, lack of human oversight |
| **Likelihood** | `[Remote/Possible/Likely/Very Likely]` |
| **Impact** | `[Minimal/Moderate/Significant/Severe]` - Justification: Legal/significant effects (credit, employment, etc.) |
| **Risk Level** | `[Low/Medium/High/Critical]` |
| **Affected Data Subjects** | All subjects of automated decisions |
| **Potential Harms** | Discrimination, unfair treatment, inability to contest decisions, lack of transparency |

#### Risk 5: Cross-Border Transfer Risks (Chapter V)

| Attribute | Value |
|-----------|-------|
| **Risk Description** | Data transferred to countries without adequate protection; government surveillance |
| **Threat Actors** | Foreign governments (FISA 702, CLOUD Act), local authorities |
| **Vulnerabilities** | US/non-EU cloud hosting, inadequate SCCs, weak supplementary measures |
| **Likelihood** | `[Remote/Possible/Likely/Very Likely]` |
| **Impact** | `[Minimal/Moderate/Significant/Severe]` |
| **Risk Level** | `[Low/Medium/High/Critical]` |
| **Affected Data Subjects** | EU residents whose data is transferred |
| **Potential Harms** | Government surveillance, lack of legal redress, data access without oversight |

#### Risk 6: Inadequate Data Retention (Storage Limitation Violation)

| Attribute | Value |
|-----------|-------|
| **Risk Description** | Data retained longer than necessary; no deletion mechanisms; "data hoarding" |
| **Threat Actors** | N/A (operational risk) |
| **Vulnerabilities** | No retention policies, manual deletion, backup retention indefinite |
| **Likelihood** | `[Remote/Possible/Likely/Very Likely]` |
| **Impact** | `[Minimal/Moderate/Significant/Severe]` - Justification: Violates Art. 5(1)(e); increased breach surface |
| **Risk Level** | `[Low/Medium/High/Critical]` |
| **Affected Data Subjects** | Past users, inactive accounts |
| **Potential Harms** | Data used for unintended purposes, increased breach exposure, trust erosion |

#### Risk 7: Processor/Sub-Processor Non-Compliance

| Attribute | Value |
|-----------|-------|
| **Risk Description** | Third-party processor fails to implement adequate safeguards or comply with DPA |
| **Threat Actors** | Negligent or malicious processors, sub-processors |
| **Vulnerabilities** | Lack of processor audits, weak DPA terms, no sub-processor controls |
| **Likelihood** | `[Remote/Possible/Likely/Very Likely]` |
| **Impact** | `[Minimal/Moderate/Significant/Severe]` |
| **Risk Level** | `[Low/Medium/High/Critical]` |
| **Affected Data Subjects** | All data subjects whose data is processed by third parties |
| **Potential Harms** | Controller liability for processor breach, data loss, unauthorized sharing |

**Additional Risks**: `[Add project-specific risks: biometric surveillance, children's profiling, health data leaks, etc.]`

### 3.3 Risk to Vulnerable Populations

If processing involves children, employees, patients, or other vulnerable groups:

| Vulnerable Group | Specific Risks | Enhanced Protections Required |
|------------------|----------------|-------------------------------|
| Children (Art. 8) | Exploitation, profiling, behavioral manipulation | Parental consent, age verification, no profiling for marketing |
| Employees | Power imbalance, surveillance, coercion | Minimize monitoring, transparency, limit retention |
| Patients | Health data leaks, discrimination | HIPAA/GDPR Art. 9 compliance, explicit consent, pseudonymization |
| Asylum seekers | Risk to safety if data exposed | Enhanced security, access restrictions, no international transfers |

### 3.4 Consultation with Data Subjects (GDPR Art. 35(9))

**Requirement**: Seek views of data subjects or their representatives, where appropriate.

| Consultation Method | Date | Participants | Feedback Received | Actions Taken |
|---------------------|------|--------------|-------------------|---------------|
| `[User survey]` | `[Date]` | `[N participants]` | `[Summary of privacy concerns]` | `[Design changes, transparency improvements]` |
| `[Privacy notice review]` | `[Date]` | `[Privacy advocates, DPO]` | `[Clarity issues, consent concerns]` | `[Updated notice, granular consent]` |
| `[Focus group]` | `[Date]` | `[N participants]` | `[Trust concerns, deletion requests]` | `[Implemented deletion API]` |

**Exemptions**: Consultation not required if disproportionate effort OR processing subject to legal obligation OR existing consultations cover concerns.

## Section 4: Mitigations and Safeguards (GDPR Art. 35(7)(d))

### 4.1 Technical Safeguards

#### Encryption and Pseudonymization (GDPR Art. 32(1)(a))

| Safeguard | Implementation | Data Protected | Effectiveness |
|-----------|----------------|----------------|---------------|
| **Encryption at Rest** | AES-256 GCM; AWS KMS for key management | All Restricted data in databases, file storage | High - renders data unreadable without keys |
| **Encryption in Transit** | TLS 1.3 for APIs; HTTPS for web; mTLS for backend services | All data transmissions | High - prevents interception |
| **Field-Level Encryption** | Encrypt sensitive fields (SSN, payment data) separately | PII, payment data | High - granular protection |
| **Pseudonymization** | Replace identifiers with pseudonyms for analytics | User IDs in analytics, logs | Medium - reduces direct identification |
| **Tokenization** | Payment card tokenization via processor | Payment card data (PCI requirement) | High - removes PAN from environment |

#### Access Controls (GDPR Art. 32(1)(b))

| Safeguard | Implementation | Coverage | Effectiveness |
|-----------|----------------|----------|---------------|
| **Authentication** | SSO with MFA for all system access | All users, administrators | High - prevents unauthorized access |
| **Role-Based Access Control (RBAC)** | Least privilege; need-to-know roles | All systems | High - limits exposure |
| **Privileged Access Management (PAM)** | Just-in-time access for Restricted data | Production databases, admin panels | High - time-limited privileged access |
| **Access Reviews** | Quarterly review of all access rights | All systems | Medium - detects access creep |

#### Security Monitoring (GDPR Art. 32(1)(d))

| Safeguard | Implementation | Coverage | Effectiveness |
|-----------|----------------|----------|---------------|
| **Audit Logging** | All data access, modifications logged; tamper-proof | Restricted/Confidential data systems | High - enables forensics, accountability |
| **SIEM Integration** | Logs ingested into SIEM; real-time alerting | All systems | High - detects anomalies |
| **Data Loss Prevention (DLP)** | Monitor and block unauthorized data exfiltration | Email, web, endpoints | Medium - reduces insider threat |
| **Anomaly Detection** | ML-based detection of unusual access patterns | Critical systems | Medium - early warning |

#### Data Subject Rights Implementation (GDPR Arts. 15-22)

| Right | Technical Implementation | Response Time | Automation Level |
|-------|-------------------------|---------------|------------------|
| **Right of Access (Art. 15)** | API endpoint exports all user data in JSON format | < 30 days (target 7 days) | Fully automated |
| **Right to Erasure (Art. 17)** | Deletion API propagates to all systems; backup purge in 90 days | < 30 days (target 7 days) | Automated with manual verification |
| **Right to Portability (Art. 20)** | Export API provides machine-readable CSV/JSON | < 30 days (target immediate) | Fully automated |
| **Right to Rectification (Art. 16)** | User self-service update UI + admin tools | Immediate | Fully automated |
| **Right to Restriction (Art. 18)** | Flag sets processing suspension; data retained but not processed | < 30 days | Automated flag system |
| **Right to Object (Art. 21)** | Opt-out for marketing; stop processing for legitimate interest | Immediate (marketing) | Automated opt-out |

### 4.2 Organizational Safeguards

#### Policies and Procedures

| Safeguard | Description | Review Frequency | Owner |
|-----------|-------------|------------------|-------|
| **Data Classification Policy** | Defines Restricted/Confidential handling | Annual | Security Architect |
| **Data Retention Policy** | Specifies retention periods and deletion triggers | Annual | Privacy Officer |
| **Incident Response Plan** | Privacy breach response, 72-hour notification | Annual + post-incident | Security + Legal |
| **Data Processing Agreements (DPAs)** | GDPR Art. 28 contracts with all processors | Per vendor onboarding | Legal |
| **Privacy-by-Design Checklist** | Embeds privacy in design phase | Per project | Privacy Officer |

#### Training and Awareness

| Audience | Training Content | Frequency | Completion Rate Target |
|----------|-----------------|-----------|------------------------|
| All employees | GDPR basics, data handling, data subject rights | Annual | 100% |
| Developers | Secure coding, encryption, pseudonymization | Annual + onboarding | 100% |
| Support staff | Data subject request handling, breach escalation | Quarterly | 100% |
| Data owners | Classification, retention, DPIAs | Annual | 100% |

#### Governance and Oversight

| Safeguard | Description | Frequency | Participants |
|-----------|-------------|-----------|--------------|
| **Privacy Review Board** | Reviews high-risk processing, DPIA approvals | Quarterly | DPO, Legal, Security, Product |
| **DPIA Reviews** | Re-assess DPIA on material changes or annually | Annual | Privacy Officer, Project Owner |
| **Processor Audits** | Verify processor compliance with DPA | Annual | Security team |
| **Access Reviews** | Review and recertify all system access | Quarterly | Security + Managers |

### 4.3 Privacy by Design and by Default (GDPR Art. 25)

| Principle | Implementation | Example |
|-----------|----------------|---------|
| **Data Minimization** | Collect only required fields; progressive disclosure | Optional fields, ask for data only when needed |
| **Purpose Limitation** | Technical controls prevent purpose creep | Separate databases for marketing vs. transactional data |
| **Default Privacy Settings** | Opt-in for marketing; minimal data sharing by default | Marketing emails opt-in only; public profile opt-in |
| **Pseudonymization** | Analytics use pseudonyms, not direct identifiers | User IDs hashed for analytics dashboards |
| **Transparency** | Clear privacy notice; granular consent | Layered privacy notice, separate consent checkboxes |
| **User Control** | Preference center; self-service data access/deletion | User dashboard for privacy settings and data export |

### 4.4 Contractual Safeguards

| Safeguard | Application | Key Terms |
|-----------|-------------|-----------|
| **Data Processing Agreements (DPAs)** | All processors (GDPR Art. 28) | Processing scope, security, sub-processors, deletion, audits, liability |
| **Standard Contractual Clauses (SCCs)** | International transfers | EU Commission 2021 SCCs; supplementary measures |
| **Non-Disclosure Agreements (NDAs)** | External sharing of Confidential data | Confidentiality, use restrictions, term |
| **Business Associate Agreements (BAAs)** | PHI processors (HIPAA requirement) | HIPAA Security Rule compliance, breach notification |

### 4.5 Residual Risk Assessment

After applying all mitigations:

| Risk | Initial Risk Level | Post-Mitigation Risk Level | Residual Risk Acceptable? | Additional Actions Required |
|------|-------------------|---------------------------|---------------------------|----------------------------|
| Unauthorized Access | High | Low | Yes | None |
| Purpose Creep | Medium | Low | Yes | None |
| Data Subject Rights Violation | High | Medium | Yes | Automate deletion API (Q2 2026) |
| Automated Decision-Making | Critical | Medium | Requires consultation | DPO review + Art. 36 consultation with supervisory authority |
| Cross-Border Transfers | High | Medium | Yes | Annual TIA review |
| Retention Violation | Medium | Low | Yes | None |
| Processor Non-Compliance | Medium | Low | Yes | Annual processor audits |

**High Residual Risk**: If any risks remain High or Critical after mitigations, **prior consultation with supervisory authority required (GDPR Art. 36)**.

## Section 5: Legal Compliance

### 5.1 GDPR Articles Addressed

| GDPR Article | Requirement | Compliance Approach |
|--------------|-------------|---------------------|
| **Art. 5** | Principles (lawfulness, fairness, transparency, purpose limitation, data minimization, accuracy, storage limitation, integrity/confidentiality, accountability) | All principles documented in DPIA; technical controls enforce |
| **Art. 6** | Lawful basis for processing | Lawful basis documented per purpose (see Lawful Basis Assessment) |
| **Art. 7** | Consent conditions | Consent mechanisms compliant (see Consent Management Template) |
| **Art. 8** | Children's consent (parental if under 16) | Age verification + parental consent flow |
| **Art. 9** | Special category data conditions | Explicit consent or Art. 9(2) exception documented |
| **Art. 12-22** | Data subject rights (transparency, access, rectification, erasure, portability, restriction, objection) | Automated APIs for all rights; 30-day SLA |
| **Art. 25** | Privacy by design and by default | Privacy-by-design checklist applied; default settings privacy-protective |
| **Art. 28** | Processor contracts | DPAs signed with all processors |
| **Art. 32** | Security of processing | Encryption, access controls, logging, monitoring implemented |
| **Art. 33-34** | Breach notification (72 hours to authority, high risk to individuals) | Breach notification plan operational; 72-hour SLA tested |
| **Art. 35** | DPIA requirement | This document fulfills Art. 35 |
| **Art. 36** | Prior consultation with supervisory authority (if high residual risk) | `[Required/Not Required - see Section 4.5]` |
| **Art. 44-50** | International transfers (Chapter V) | SCCs + TIA for all non-EU transfers |

### 5.2 Other Regulatory Compliance

| Regulation | Applicability | Compliance Measures |
|------------|---------------|---------------------|
| **CCPA (California)** | California resident data | Privacy notice, opt-out, deletion, access rights |
| **HIPAA (US healthcare)** | Protected Health Information (PHI) | BAAs with processors, HIPAA Security Rule compliance |
| **PCI DSS (payment cards)** | Payment card data | Tokenization, network segmentation, ASV scans |
| **COPPA (US children)** | Children under 13 in US | Parental consent, no behavioral advertising |
| **ePrivacy Directive** | Cookies and electronic communications | Cookie consent banner; opt-in for non-essential |

### 5.3 Supervisory Authority Consultation (GDPR Art. 36)

**Prior Consultation Required?**: `[Yes/No]`

**Criteria**: High residual risk remains after mitigations OR processing involves systematic large-scale monitoring OR special category data at scale with automated decision-making.

If Yes:
- **Supervisory Authority**: `[e.g., CNIL (France), ICO (UK), specific member state DPA]`
- **Consultation Date**: `[Date submitted]`
- **Authority Response**: `[Approval/Conditions/Rejection]`
- **Conditions Imposed**: `[List any additional safeguards required by authority]`
- **Compliance Date**: `[When conditions implemented]`

If No:
- **Justification**: Residual risks are Low or Medium; mitigations are robust and proportionate.

## Section 6: Approval and Review

### 6.1 Approvals

| Role | Name | Approval Status | Signature | Date |
|------|------|----------------|-----------|------|
| **Data Protection Officer (DPO)** | `[Name]` | `[Approved/Conditional/Rejected]` | `[Signature]` | `[Date]` |
| **Privacy Officer** | `[Name]` | `[Approved/Conditional/Rejected]` | `[Signature]` | `[Date]` |
| **Security Architect** | `[Name]` | `[Approved/Conditional/Rejected]` | `[Signature]` | `[Date]` |
| **Legal Counsel** | `[Name]` | `[Approved/Conditional/Rejected]` | `[Signature]` | `[Date]` |
| **Product Owner** | `[Name]` | `[Approved/Conditional/Rejected]` | `[Signature]` | `[Date]` |
| **Executive Sponsor** | `[Name]` | `[Approved/Conditional/Rejected]` | `[Signature]` | `[Date]` |

**DPO Sign-Off**: As required by GDPR Art. 39(1)(c), the Data Protection Officer has reviewed and approved this DPIA.

### 6.2 Review and Maintenance

**Review Triggers**:
- [ ] Annual review (minimum)
- [ ] Material change to processing (new data types, new purposes, new processors, technology change)
- [ ] Supervisory authority guidance update
- [ ] Data breach or security incident
- [ ] Residual risk increases
- [ ] Regulatory change (new law, guidance)

**Next Review Date**: `[YYYY-MM-DD]` (no later than one year from approval)

**Review Owner**: `[Privacy Officer name]`

### 6.3 Follow-Up Actions

| Action | Owner | Deadline | Status | Completion Date |
|--------|-------|----------|--------|-----------------|
| `[Implement deletion API]` | `[Engineering Lead]` | `[Q2 2026]` | In Progress | |
| `[Conduct processor audit for Vendor X]` | `[Security team]` | `[Date]` | Not Started | |
| `[Update privacy notice with DPIA findings]` | `[Legal]` | `[Date]` | Completed | `[Date]` |
| `[Train support staff on data subject rights]` | `[HR/Training]` | `[Date]` | In Progress | |
| `[Art. 36 consultation (if required)]` | `[DPO]` | `[Before go-live]` | Not Started | |

### 6.4 Integration with SDLC

**DPIA Lifecycle Integration**:
- **Inception Phase**: DPIA drafted and approved before detailed design
- **Elaboration Phase**: DPIA mitigations translated to requirements (Supplementary Spec)
- **Construction Phase**: Mitigations implemented and tested
- **Transition Phase**: DPIA validation report confirms all mitigations operational
- **Production**: Annual DPIA review; update on material changes

**Traceability**:
- DPIA risks → Requirements (Supplementary Spec)
- Requirements → Design (Architecture Doc)
- Design → Implementation (Code, APIs)
- Implementation → Validation (Test cases, DPIA Validation Report)

## Appendices

### Appendix A: Data Flow Diagrams

`[Include diagrams showing: data sources → collection → storage → processing → sharing → deletion]`

### Appendix B: Lawful Basis Assessment

`[Reference or attach Lawful Basis Assessment Template for each processing purpose]`

### Appendix C: Consent Management

`[Reference Consent Management Template if consent is lawful basis]`

### Appendix D: Data Subject Rights Workflows

`[Reference Data Subject Rights Workflow Template]`

### Appendix E: Cross-Border Transfer Impact Assessments

`[Reference or attach Transfer Impact Assessments for each non-EU transfer]`

### Appendix F: Processor Inventory and DPAs

| Processor | Service Provided | DPA Signed Date | DPA Expiry | Sub-Processors | Audit Date |
|-----------|------------------|-----------------|------------|----------------|------------|
| `[Vendor]` | `[Service]` | `[Date]` | `[Date]` | `[List or "See vendor list"]` | `[Date]` |

### Appendix G: Privacy by Design Checklist

`[Attach completed Privacy by Design Checklist]`

---

**Document Version History**:

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | `[Date]` | Initial draft | `[Privacy Officer]` |
| 1.0 | `[Date]` | DPO approval | `[DPO]` |
| 1.1 | `[Date]` | Updated for processor change | `[Privacy Officer]` |
