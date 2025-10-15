# Data Processing Agreement Template

## Document Control

| Field | Value |
|-------|-------|
| Document Type | Data Processing Agreement (DPA) |
| Agreement Between | `[Controller Name]` and `[Processor Name]` |
| Version | `[e.g., 1.0]` |
| Effective Date | `[YYYY-MM-DD]` |
| Expiry/Renewal Date | `[YYYY-MM-DD or "Co-terminous with Main Agreement"]` |
| Governing Law | `[Jurisdiction, e.g., EU law, specific member state]` |
| Related Documents | Master Service Agreement, Standard Contractual Clauses, Security Exhibit |

## Purpose and Regulatory Basis

This Data Processing Agreement (DPA) governs the processing of personal data by **`[Processor Name]`** (the "Processor") on behalf of **`[Controller Name]`** (the "Controller") in compliance with **GDPR Article 28** and other applicable data protection laws.

**GDPR Article 28(3)** requires processing by processor to be governed by contract that sets out:
- (a) Subject matter and duration
- (b) Nature and purpose of processing
- (c) Type of personal data and categories of data subjects
- (d) Obligations and rights of controller
- (e) Processor obligations (confidentiality, security, sub-processors, assistance, deletion, audits)

## 1. Definitions

| Term | Definition |
|------|------------|
| **Controller** | `[Controller Name]`, determining purposes and means of processing personal data |
| **Processor** | `[Processor Name]`, processing personal data on behalf of Controller |
| **Personal Data** | Any information relating to identified or identifiable natural person per GDPR Art. 4(1) |
| **Processing** | Any operation on personal data (collection, storage, use, disclosure, erasure) per GDPR Art. 4(2) |
| **Data Subject** | Identified or identifiable natural person to whom personal data relates |
| **Sub-Processor** | Third party engaged by Processor to process personal data on Controller's behalf |
| **GDPR** | Regulation (EU) 2016/679 (General Data Protection Regulation) |
| **Data Protection Laws** | GDPR and applicable national data protection laws |
| **Supervisory Authority** | EU/EEA member state data protection authority (e.g., CNIL, ICO, BfDI) |
| **Main Agreement** | `[Name of underlying service agreement, e.g., Master Service Agreement dated YYYY-MM-DD]` |

## 2. Scope and Application

### 2.1 Application

This DPA applies to all processing of personal data by Processor on behalf of Controller in connection with the services described in the Main Agreement.

### 2.2 Relationship to Main Agreement

This DPA supplements the Main Agreement. In case of conflict, this DPA prevails on data protection matters.

### 2.3 Duration

This DPA is effective from `[Effective Date]` and continues for the duration of the Main Agreement and any renewal period, plus any period required for data return/deletion.

## 3. Details of Processing

### 3.1 Subject Matter

Processor will provide the following services to Controller involving processing of personal data:

`[Describe services: e.g., "Cloud infrastructure hosting", "Email marketing platform", "Customer support services", "Payment processing"]`

### 3.2 Duration of Processing

Processing will continue for: `[Duration: e.g., "Term of Main Agreement", "Until termination", "3 years from Effective Date"]`

### 3.3 Nature and Purpose of Processing

| Nature of Processing | Purpose of Processing |
|----------------------|----------------------|
| `[e.g., Storage, transmission, analysis, backup]` | `[e.g., Service delivery, data analytics, customer support, payment processing]` |

### 3.4 Categories of Data Subjects

- [ ] Customers/clients of Controller
- [ ] Employees of Controller
- [ ] Contractors of Controller
- [ ] Website visitors
- [ ] Prospects/leads
- [ ] Other: `[Specify]`

### 3.5 Categories of Personal Data

- [ ] Identification data (name, email, phone, address)
- [ ] Financial data (payment card, bank account, transaction history)
- [ ] Behavioral data (usage logs, clickstream, preferences)
- [ ] Authentication data (passwords (hashed), MFA tokens)
- [ ] Communication data (support tickets, messages, emails)
- [ ] Device/technical data (IP address, device ID, user agent)
- [ ] Special category data (health, biometric, genetic - **see Art. 9 compliance below**)
- [ ] Children's data (under 16) - **see Art. 8 compliance**
- [ ] Criminal convictions data - **see Art. 10 compliance**
- [ ] Other: `[Specify]`

### 3.6 Special Category Data (GDPR Art. 9)

**Does processing involve special category data** (health, biometric, genetic, racial/ethnic origin, political opinions, religious beliefs, trade union membership, sex life/sexual orientation)?

- [ ] **No** - Skip to Section 3.7
- [ ] **Yes** - Complete below:

**Categories of Special Data**: `[e.g., Health data for symptom tracker app]`

**Art. 9(2) Legal Basis** (Controller's responsibility to ensure lawful basis):
- [ ] Explicit consent (Art. 9(2)(a))
- [ ] Employment/social security law (Art. 9(2)(b))
- [ ] Vital interests (Art. 9(2)(c))
- [ ] Other Art. 9(2) exception: `[Specify]`

**Additional Safeguards** (Processor obligations):
- [ ] Enhanced encryption (field-level encryption for special category data)
- [ ] Restricted access (only named personnel with explicit authorization)
- [ ] Enhanced audit logging (all access logged and monitored)
- [ ] Annual security audits (third-party audit of special category data controls)

### 3.7 Children's Data (GDPR Art. 8)

**Does processing involve children's data (under 16, or member state threshold)?**

- [ ] **No**
- [ ] **Yes** - Processor acknowledges heightened privacy protections apply. Controller confirms parental consent obtained where required.

### 3.8 Criminal Convictions Data (GDPR Art. 10)

**Does processing involve criminal convictions or offenses data?**

- [ ] **No**
- [ ] **Yes** - Controller confirms processing authorized by EU/member state law (Art. 10 requirement). Processor applies enhanced security controls.

## 4. Processor Obligations (GDPR Art. 28(3))

### 4.1 Processing Instructions (Art. 28(3)(a))

Processor shall process personal data **only on documented instructions from Controller**, unless required by EU/member state law (in which case Processor shall inform Controller before processing, unless law prohibits).

**Documented Instructions**:
- This DPA and Annexes
- Main Agreement
- Written instructions from Controller (email, ticketing system, API parameters)

**Prohibited Actions**:
- Processor shall **not** process personal data for Processor's own purposes
- Processor shall **not** disclose personal data to third parties without Controller authorization
- Processor shall **not** transfer personal data outside EU/EEA without Controller authorization and valid transfer mechanism

**Unlawful Instructions**: If Processor believes Controller's instruction violates GDPR or other Data Protection Laws, Processor shall **immediately inform Controller**. If Controller insists on unlawful instruction, Processor may suspend processing and is not liable for non-performance.

### 4.2 Confidentiality (Art. 28(3)(b))

Processor shall ensure that **all personnel** authorized to process personal data:
- Have committed to confidentiality (contractual or statutory obligation)
- Receive appropriate training on data protection and GDPR compliance
- Understand their obligations under this DPA

**Personnel**: Includes employees, contractors, consultants with access to personal data.

### 4.3 Security of Processing (Art. 28(3)(c), Art. 32)

Processor shall implement appropriate **technical and organizational measures** to ensure security of processing appropriate to the risk, including:

#### Technical Measures

- [ ] **Encryption at Rest**: AES-256 encryption for all personal data in storage
- [ ] **Encryption in Transit**: TLS 1.3 for all data transmissions
- [ ] **Pseudonymization**: Where appropriate, replace identifiers with pseudonyms
- [ ] **Access Controls**: Role-based access control (RBAC); least privilege principle
- [ ] **Authentication**: Multi-factor authentication (MFA) for administrative access
- [ ] **Key Management**: HSM or KMS for encryption keys (not hardcoded)
- [ ] **Network Segmentation**: Isolate systems processing personal data
- [ ] **Intrusion Detection**: IDS/IPS to detect and prevent unauthorized access

#### Organizational Measures

- [ ] **Security Policies**: Information security policy, acceptable use policy
- [ ] **Access Reviews**: Quarterly review of all access rights
- [ ] **Background Checks**: Personnel with access to personal data undergo background checks
- [ ] **Security Training**: Annual security and privacy training for all personnel
- [ ] **Incident Response Plan**: Documented breach notification plan (72-hour SLA per Art. 33)
- [ ] **Business Continuity**: Backup and disaster recovery procedures

#### Monitoring and Logging

- [ ] **Audit Logging**: Log all access to personal data (who, what, when)
- [ ] **Tamper-Proof Logs**: Logs append-only; integrity verified
- [ ] **SIEM Integration**: Security Information and Event Management system
- [ ] **Anomaly Detection**: Alerts on unusual access patterns

#### Testing and Validation

- [ ] **Penetration Testing**: Annual penetration tests by third-party
- [ ] **Vulnerability Scanning**: Quarterly vulnerability scans
- [ ] **Security Audits**: Annual ISO 27001 or SOC 2 audit

**Security Documentation**: Processor shall provide Controller with documentation of security measures upon request (e.g., SOC 2 report, ISO 27001 certificate).

### 4.4 Sub-Processors (Art. 28(3)(d))

#### General Authorization

Controller provides **general authorization** for Processor to engage sub-processors, subject to conditions below.

**Alternative**: ~~Controller provides specific authorization for named sub-processors only (list in Annex II).~~

#### Current Sub-Processors

Processor shall maintain current list of sub-processors at: `[URL or "Annex II to this DPA"]`

**Current Sub-Processors** (as of `[Date]`):

| Sub-Processor Name | Service Provided | Location | Security Certification |
|--------------------|------------------|----------|------------------------|
| `[e.g., AWS]` | Cloud infrastructure hosting | United States (with EU regions) | ISO 27001, SOC 2 |
| `[e.g., Stripe]` | Payment processing | United States | PCI DSS Level 1, ISO 27001 |
| `[Sub-Processor 3]` | `[Service]` | `[Country]` | `[Certification]` |

#### Notification of Changes

Processor shall **notify Controller** of any intended changes (addition or replacement of sub-processors) at least **30 days in advance**.

**Notification Method**: Email to `[Controller contact email]`

#### Controller Objection Rights

Controller may **object** to new or replacement sub-processor within **14 days** of notification if Controller has reasonable grounds (e.g., sub-processor lacks adequate security, located in high-risk country).

If Controller objects, Parties shall discuss in good faith:
1. Alternative sub-processor, OR
2. Termination of affected services (without penalty to Controller)

#### Sub-Processor Obligations

Processor shall impose **same data protection obligations** on sub-processors as in this DPA, including:
- Processing only on instructions
- Confidentiality obligations
- Security measures (Art. 32 equivalent)
- Assistance with data subject rights and breach notification
- Deletion/return of data
- Audit rights

Processor remains **fully liable** to Controller for sub-processor performance (GDPR Art. 28(4)).

#### Sub-Processor DPA

Processor shall enter into written DPA with each sub-processor (contract or other legal act under EU/member state law).

### 4.5 International Transfers

If Processor or sub-processor processes personal data outside EU/EEA:

- [ ] **Transfer Mechanism Required**: Adequacy decision (Art. 45), Standard Contractual Clauses (Art. 46), or other valid mechanism
- [ ] **SCCs Incorporated**: Standard Contractual Clauses (2021 EU Commission version) are incorporated as Annex III to this DPA
- [ ] **Transfer Impact Assessment (TIA)**: Controller has conducted TIA; risks mitigated (see Cross-Border Transfer Assessment)

**Processor Obligations** for transfers outside EU/EEA:
- Notify Controller of transfer destinations
- Cooperate with Controller's TIA
- Implement supplementary measures if required (encryption, data minimization)
- Sign SCCs with sub-processors if required

### 4.6 Assistance with Data Subject Rights (Art. 28(3)(e))

Processor shall **assist Controller** (taking into account nature of processing) in fulfilling Controller's obligations to respond to data subject rights requests (GDPR Arts. 15-22):

| Right | Processor Assistance |
|-------|----------------------|
| **Right of Access (Art. 15)** | Provide Controller with export of data subject's personal data in machine-readable format (CSV/JSON) within **7 days** of Controller request |
| **Right to Rectification (Art. 16)** | Update inaccurate data per Controller instructions within **48 hours** |
| **Right to Erasure (Art. 17)** | Delete data subject's personal data (including backups) within **14 days**; provide deletion confirmation |
| **Right to Restriction (Art. 18)** | Implement processing restriction (flag in system); data stored but not processed |
| **Right to Portability (Art. 20)** | Provide data in machine-readable format (CSV/JSON) within **7 days** |
| **Right to Object (Art. 21)** | Cease processing per Controller instructions (e.g., stop marketing use) within **24 hours** |

**Fees**: Processor may charge **reasonable fees** for assistance if requests are excessive or manifestly unfounded (as determined by Controller). Standard data subject rights assistance is included in service fees.

**Direct Requests**: If Processor receives data subject rights request directly, Processor shall **forward to Controller within 48 hours** without responding to data subject (Controller is responsible for responding).

### 4.7 Assistance with Security Incidents and DPIAs (Art. 28(3)(f))

#### Security Incidents (Personal Data Breaches)

**Notification Obligation**: Processor shall notify Controller **without undue delay** and in any case **within 24 hours** of becoming aware of personal data breach affecting Controller's data.

**Notification Content** (GDPR Art. 33(3)):
- Description of breach (nature, categories of data, approximate number of data subjects affected)
- Name and contact of Processor's Data Protection Officer or contact point
- Likely consequences of breach
- Measures taken or proposed to address breach and mitigate harm

**Notification Method**: Email to `[Controller contact email]` and phone call to `[Controller phone]`

**Cooperation**: Processor shall cooperate with Controller to enable Controller to notify supervisory authority within **72 hours** (Art. 33) and data subjects (Art. 34) if required.

**Documentation**: Processor shall document all breaches (Art. 33(5)) and provide documentation to Controller upon request.

#### Data Protection Impact Assessments (DPIA)

Processor shall provide **reasonable assistance** to Controller in conducting DPIA (GDPR Art. 35) by:
- Providing information on processing operations, security measures, risks
- Reviewing DPIA drafts for technical accuracy
- Implementing mitigations identified in DPIA

**Fees**: DPIA assistance is included in service fees (no additional charge for reasonable assistance).

### 4.8 Deletion or Return of Data (Art. 28(3)(g))

At the **termination** of this DPA or Main Agreement (or earlier upon Controller request):

**Option 1: Deletion** (default):
- Processor shall **delete all personal data** (including backups) within **30 days** of termination
- Provide **certificate of deletion** confirming data destroyed
- Exception: Processor may retain data if required by EU/member state law (in which case, Processor shall inform Controller of legal obligation and continue to protect data)

**Option 2: Return**:
- Processor shall **return all personal data** to Controller in machine-readable format (CSV/JSON) within **30 days**
- After return, delete all retained copies (including backups) within **90 days**
- Provide certificate of deletion

**Transitional Period**: During transition period (before deletion/return), Processor shall continue to protect personal data per this DPA.

**Controller Selection**: Controller shall specify deletion or return in writing at least **14 days before termination**.

### 4.9 Audits and Inspections (Art. 28(3)(h))

Processor shall make available to Controller **all information necessary** to demonstrate compliance with this DPA and GDPR Art. 28.

Processor shall allow for and contribute to **audits** and **inspections** conducted by Controller or Controller-mandated auditor.

#### Audit Rights

- **Frequency**: Controller may audit once per year (or more frequently if breach or reasonable suspicion of non-compliance)
- **Advance Notice**: Controller shall provide **30 days advance notice** (except in case of breach investigation)
- **Audit Scope**: Processing facilities, systems, records, personnel (relevant to personal data processing)
- **Auditor**: Conducted by Controller or independent third-party auditor (subject to confidentiality obligations)
- **Cooperation**: Processor shall cooperate fully; provide access to facilities, systems, documentation, personnel
- **Timing**: Audits conducted during business hours; Processor may have personnel present
- **Costs**: Controller bears auditor costs; Processor may charge reasonable fees if audit exceeds **2 business days** per year

#### Alternative: Audit Reports

In lieu of on-site audit, Processor may provide Controller with:
- ISO 27001 certificate (current, valid)
- SOC 2 Type II report (covering review period)
- Other independent third-party audit report

Controller may request on-site audit if audit reports insufficient to demonstrate compliance.

## 5. Controller Obligations

### 5.1 Lawful Instructions

Controller shall ensure all instructions to Processor comply with GDPR and Data Protection Laws.

### 5.2 Lawful Basis

Controller is responsible for ensuring lawful basis (GDPR Art. 6) and, if applicable, Art. 9 or Art. 10 compliance.

### 5.3 Data Subject Rights

Controller is responsible for responding to data subject rights requests (Arts. 15-22). Processor provides assistance (Section 4.6).

### 5.4 DPIAs and Prior Consultation

Controller is responsible for conducting DPIAs (Art. 35) and prior consultation with supervisory authority (Art. 36) if required. Processor provides assistance (Section 4.7).

### 5.5 Breach Notification to Authorities and Data Subjects

Controller is responsible for notifying supervisory authority (Art. 33) and data subjects (Art. 34) of breaches. Processor provides assistance (Section 4.7).

## 6. Liability and Indemnification

### 6.1 GDPR Liability (Art. 82)

Each Party is liable for damages caused by its processing that violates GDPR. Processor is liable only if it has not complied with GDPR obligations directed at processors OR acted outside or contrary to Controller's lawful instructions.

### 6.2 Indemnification

**Processor Indemnity**: Processor shall indemnify and hold harmless Controller from any claims, fines, or damages arising from Processor's breach of this DPA or GDPR Art. 28 obligations.

**Controller Indemnity**: Controller shall indemnify and hold harmless Processor from any claims arising from Controller's unlawful instructions or Controller's breach of GDPR obligations (e.g., lack of lawful basis, failure to obtain consent).

### 6.3 Limitations

Liability limitations in Main Agreement apply, **except** neither Party shall limit liability for:
- Gross negligence or willful misconduct
- Data subject claims under GDPR Art. 82
- Supervisory authority fines or penalties

## 7. Term and Termination

### 7.1 Term

This DPA is effective from `[Effective Date]` and continues for the duration of the Main Agreement.

### 7.2 Termination

This DPA terminates automatically upon termination of the Main Agreement.

Either Party may terminate this DPA immediately if the other Party materially breaches and fails to cure within **30 days** of written notice.

### 7.3 Survival

Obligations that by their nature should survive termination shall survive, including:
- Deletion/return of data (Section 4.8)
- Confidentiality (Section 4.2)
- Audit rights (for 3 years post-termination to verify deletion)
- Liability and indemnification (Section 6)

## 8. General Provisions

### 8.1 Amendments

This DPA may be amended only by written agreement signed by both Parties.

**Exception**: Processor may update Annex II (sub-processor list) per Section 4.4 notification process.

### 8.2 Governing Law

This DPA is governed by the laws of `[Jurisdiction, e.g., Ireland, Germany, or "same as Main Agreement"]`.

### 8.3 Dispute Resolution

Disputes shall be resolved per Main Agreement dispute resolution clause. Supervisory authority jurisdiction and data subject court rights under GDPR Arts. 77-79 are not affected.

### 8.4 Severability

If any provision is held invalid, remaining provisions remain in full force.

### 8.5 Entire Agreement

This DPA, together with Main Agreement, constitutes entire agreement on data processing between Parties.

## 9. Signatures

**CONTROLLER**: `[Controller Name]`

Signature: ______________________________
Name: `[Name]`
Title: `[Title]`
Date: `[Date]`

**PROCESSOR**: `[Processor Name]`

Signature: ______________________________
Name: `[Name]`
Title: `[Title]`
Date: `[Date]`

---

## Annex I: Details of Processing

See Section 3 (incorporated by reference).

## Annex II: Sub-Processors

See Section 4.4 (current list incorporated by reference or maintained at `[URL]`).

## Annex III: Standard Contractual Clauses (SCCs)

**Applicable**: If Processor or sub-processor processes personal data outside EU/EEA.

**SCC Version**: EU Commission Standard Contractual Clauses (2021) - Module 2 (Controller to Processor)

**SCC Document**: [Attach full SCC document or incorporate by reference: https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en]

**SCC Annexes Completed**:
- Annex I.A: List of Parties (Controller and Processor details)
- Annex I.B: Description of Transfer (see Section 3 of this DPA)
- Annex I.C: Competent Supervisory Authority (Controller's supervisory authority)
- Annex II: Technical and Organizational Measures (see Section 4.3 of this DPA)
- Annex III: List of Sub-Processors (see Section 4.4 of this DPA)

---

**References**:
- GDPR Article 28: [https://gdpr-info.eu/art-28-gdpr/](https://gdpr-info.eu/art-28-gdpr/)
- EU Commission SCCs: [https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en](https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en)
