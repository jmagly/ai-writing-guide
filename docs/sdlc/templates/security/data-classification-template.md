# Data Classification Template

## Document Control

| Field | Value |
|-------|-------|
| Document Type | Data Classification Guide |
| Version | `[e.g., 1.0]` |
| Date | `[YYYY-MM-DD]` |
| Author | `[Security Architect, Data Protection Officer]` |
| Reviewers | `[Legal, Compliance, Privacy Officer]` |
| Status | `[Draft/Approved/Updated]` |
| Related Documents | Security Requirements, Privacy Policy, Compliance Matrix |

## Purpose and Scope

### Purpose
This document defines the data classification framework for `[Organization/System Name]` to ensure appropriate protection measures are applied based on data sensitivity and regulatory requirements.

### Scope
- **In Scope**: All data created, processed, stored, or transmitted by the organization
- **Applicability**: All employees, contractors, vendors, and systems
- **Coverage**: Structured and unstructured data, electronic and physical
- **Lifecycle**: Data classification applies from creation through disposal

### Objectives
1. Protect sensitive information from unauthorized access or disclosure
2. Ensure compliance with regulatory requirements (GDPR, PCI DSS, HIPAA, etc.)
3. Enable risk-based security controls
4. Facilitate data governance and lifecycle management
5. Support incident response and breach notification

## Classification Levels

### Level 1: Public

#### Definition
Information that can be freely shared with the public without risk to the organization, individuals, or regulatory compliance.

#### Examples
- Published marketing materials
- Public website content
- Press releases
- Public documentation and whitepapers
- Open source code (explicitly designated)
- Public job postings
- General company information (location, contact)

#### Handling Requirements

| Requirement | Specification |
|-------------|---------------|
| **Access Control** | No restrictions; publicly accessible |
| **Encryption at Rest** | Not required (recommended for integrity) |
| **Encryption in Transit** | HTTPS recommended for integrity |
| **Storage Location** | Any approved storage; public cloud OK |
| **Sharing** | Unrestricted external sharing |
| **Retention** | Business need basis; typically indefinite |
| **Disposal** | Standard deletion; no special requirements |
| **Backup** | Standard backup procedures |
| **Logging** | Standard access logs |
| **Monitoring** | Standard monitoring |

#### Protection Measures
- Basic integrity controls
- Version control for accuracy
- Standard malware scanning
- No encryption required

#### Regulatory Considerations
- None

---

### Level 2: Internal

#### Definition
Information intended for internal use that could cause minor harm if disclosed but is not subject to specific regulatory protection.

#### Examples
- Internal policies and procedures
- Internal communications (non-sensitive)
- Organization charts
- Project plans (non-strategic)
- Internal training materials
- Meeting notes (non-confidential)
- Internal system documentation
- General employee directories

#### Handling Requirements

| Requirement | Specification |
|-------------|---------------|
| **Access Control** | Authenticated employees/contractors only |
| **Encryption at Rest** | Recommended but not mandatory |
| **Encryption in Transit** | TLS 1.2+ required for external transmission |
| **Storage Location** | Approved internal systems or approved cloud |
| **Sharing** | Internal sharing unrestricted; external requires approval |
| **Retention** | Per retention schedule (typically 3-7 years) |
| **Disposal** | Secure deletion from active systems |
| **Backup** | Standard encrypted backups |
| **Logging** | Access logging for audit purposes |
| **Monitoring** | Standard DLP monitoring |

#### Protection Measures
- Network perimeter security
- Authentication required
- Role-based access control
- Standard backups
- Antivirus/antimalware

#### Regulatory Considerations
- May be subject to e-discovery
- Retention policies apply

---

### Level 3: Confidential

#### Definition
Sensitive business information that could cause significant harm to the organization, competitive position, or stakeholders if disclosed to unauthorized parties.

#### Examples
- Strategic plans and roadmaps
- Financial records and forecasts
- Customer lists and sales data
- Trade secrets and proprietary algorithms
- M&A information
- Contract negotiations
- Employee compensation data
- Security assessments and vulnerability reports
- Unpublished research and development
- Source code (proprietary)
- Business intelligence reports

#### Handling Requirements

| Requirement | Specification |
|-------------|---------------|
| **Access Control** | Need-to-know basis; explicit authorization required |
| **Encryption at Rest** | AES-256 encryption mandatory |
| **Encryption in Transit** | TLS 1.2+ mandatory; consider mTLS |
| **Storage Location** | Approved secure systems only; restricted cloud regions |
| **Sharing** | External sharing requires NDA and executive approval |
| **Retention** | Per retention schedule with periodic review |
| **Disposal** | Secure deletion with verification; overwrite methods |
| **Backup** | Encrypted backups with separate key management |
| **Logging** | Comprehensive access and modification logging |
| **Monitoring** | Enhanced DLP; anomaly detection; alerts on access |

#### Protection Measures
- Strong authentication (MFA recommended)
- Encryption at rest and in transit
- Access approval workflows
- Data loss prevention (DLP)
- Watermarking (for documents)
- Secure file sharing solutions
- Regular access reviews (quarterly)
- Network segmentation

#### Regulatory Considerations
- Subject to NDA and confidentiality agreements
- May trigger breach notification if exposed
- Export control considerations (ITAR, EAR)

---

### Level 4: Restricted

#### Definition
Highly sensitive information subject to strict regulatory requirements or that could cause severe harm, legal liability, or regulatory penalties if disclosed or breached.

#### Examples

**Personal Identifiable Information (PII)**:
- Social Security Numbers
- Driver's license numbers
- Passport numbers
- Biometric data
- Financial account numbers
- Credit/debit card information (PCI DSS)

**Protected Health Information (PHI)**:
- Medical records
- Health insurance information
- Genetic information
- Mental health records
- Treatment information

**Authentication Credentials**:
- Passwords and hashes
- API keys and tokens
- Private keys and certificates
- Encryption keys

**Legal/Regulatory**:
- Legal privileged communications
- Investigation materials
- Regulatory filings (pre-public)
- Breach notification data

#### Handling Requirements

| Requirement | Specification |
|-------------|---------------|
| **Access Control** | Strictly need-to-know; multi-level approval required |
| **Encryption at Rest** | AES-256 GCM; HSM/KMS for key management mandatory |
| **Encryption in Transit** | TLS 1.3+ mandatory; mTLS for APIs |
| **Storage Location** | Highly secure systems only; specific geographic restrictions |
| **Sharing** | Minimal sharing; DPA/BAA required; encryption mandatory |
| **Retention** | Minimal retention; delete at earliest allowed date |
| **Disposal** | Cryptographic erasure or physical destruction; audit trail |
| **Backup** | Encrypted backups; separate encryption keys; air-gapped |
| **Logging** | Full audit trail; tamper-proof logs; SIEM integration |
| **Monitoring** | Real-time monitoring; immediate alerts; anomaly detection |

#### Protection Measures
- Multi-factor authentication (mandatory)
- Privileged access management (PAM)
- Data masking/tokenization for non-production
- Field-level encryption for databases
- Hardware security modules (HSM)
- Secrets management system
- Just-in-time access provisioning
- Zero trust network architecture
- Regular penetration testing
- Incident response plan specific to this data
- Monthly access reviews (minimum)

#### Regulatory Considerations

| Regulation | Applicability | Key Requirements |
|------------|---------------|------------------|
| **GDPR** | EU resident PII | Consent, data minimization, breach notification (72h) |
| **CCPA** | California resident PI | Right to know, delete, opt-out; notice requirements |
| **PCI DSS** | Payment card data | Specific encryption, network segmentation, quarterly scans |
| **HIPAA** | PHI (US healthcare) | HIPAA Security Rule; Business Associate Agreements |
| **GLBA** | Financial data (US) | Safeguards Rule; privacy notices |
| **SOX** | Financial records (public companies) | Audit controls; retention requirements |
| **FERPA** | Education records (US) | Student privacy; limited disclosure |

#### Breach Impact
- Regulatory fines (up to €20M or 4% revenue for GDPR)
- Legal liability and lawsuits
- Mandatory breach notification to regulators and individuals
- Reputational damage
- Credit monitoring obligations
- Forensic investigation costs

---

## Classification Decision Tree

### Step 1: Regulatory Requirements
```
Does the data contain:
  ├─ Payment card information? → RESTRICTED (PCI DSS)
  ├─ Health information (PHI)? → RESTRICTED (HIPAA)
  ├─ Social Security Numbers? → RESTRICTED (various)
  ├─ EU resident personal data? → RESTRICTED (GDPR)
  ├─ Authentication credentials? → RESTRICTED
  └─ None of the above? → Continue to Step 2
```

### Step 2: Business Impact Assessment
```
If disclosed, could this data cause:
  ├─ Severe harm or regulatory penalties? → RESTRICTED
  ├─ Significant competitive harm or financial loss? → CONFIDENTIAL
  ├─ Minor business disruption? → INTERNAL
  └─ No harm? → PUBLIC
```

### Step 3: Individual Privacy Impact
```
Does the data:
  ├─ Identify an individual and is sensitive? → RESTRICTED
  ├─ Identify an individual but is non-sensitive? → CONFIDENTIAL or INTERNAL
  └─ Not identify individuals? → Based on business impact
```

### Classification Examples Table

| Data Type | Classification | Rationale |
|-----------|---------------|-----------|
| Marketing brochure | Public | Designed for public distribution |
| Internal newsletter | Internal | No harm if disclosed, but not public |
| Product roadmap | Confidential | Competitive advantage; strategic |
| Customer SSN | Restricted | PII; regulatory requirements |
| Employee salary | Confidential | Sensitive but not regulated |
| Credit card number | Restricted | PCI DSS requirements |
| Medical record | Restricted | HIPAA PHI |
| Database password | Restricted | System security critical |
| Office location | Public | Publicly available information |
| Board meeting minutes | Confidential | Strategic decisions; not regulated |
| Customer email address | Restricted | PII under GDPR/CCPA |
| Public job posting | Public | Intended for public view |
| Vulnerability scan results | Confidential | Security risk if disclosed |

## Data Handling Procedures

### Classification Assignment

#### Responsibility
- **Data Owner**: Business unit responsible for data; assigns classification
- **Data Custodian**: IT/Security team; implements controls
- **Data User**: Individual accessing data; follows handling requirements

#### Classification Process
1. **Creation**: Data owner classifies at creation/collection
2. **Labeling**: Apply classification label (metadata, header, watermark)
3. **Documentation**: Record classification in data inventory
4. **Review**: Re-classify when data changes or annually
5. **Downgrade**: Requires data owner approval and justification

#### Labeling Standards

**Electronic Data**:
- Metadata tags: `Classification: [Level]`
- Email subject line: `[RESTRICTED]`, `[CONFIDENTIAL]`, `[INTERNAL]`
- Document headers/footers: "Classification: [Level] - Handle Accordingly"
- File naming: Optional prefix `[R]`, `[C]`, `[I]`, `[P]`

**Physical Data**:
- Color-coded labels (Red=Restricted, Yellow=Confidential, Blue=Internal, Green=Public)
- Cover sheets for printed documents
- Envelopes marked with classification
- Secure containers for storage

### Storage Requirements

#### Electronic Storage

| Classification | Approved Storage | Encryption | Access Control |
|----------------|------------------|------------|----------------|
| **Public** | Any approved system | Optional | None required |
| **Internal** | Approved corporate systems | Recommended | Authentication |
| **Confidential** | Approved secure systems | AES-256 mandatory | RBAC, MFA recommended |
| **Restricted** | Highly secure systems only | AES-256 GCM, HSM/KMS | RBAC, MFA mandatory, PAM |

#### Physical Storage

| Classification | Storage Method | Access Control | Monitoring |
|----------------|---------------|----------------|------------|
| **Public** | Standard filing | None | None |
| **Internal** | Locked office/cabinet | Key/badge access | Sign-out log |
| **Confidential** | Locked safe/cabinet | Limited key holders | Access log, camera |
| **Restricted** | High-security vault | Multi-person access, biometric | Video surveillance, audit log |

### Transmission Requirements

#### Electronic Transmission

| Classification | Method | Encryption | Additional Controls |
|----------------|--------|------------|---------------------|
| **Public** | Email, web | HTTPS recommended | None |
| **Internal** | Corporate email | TLS 1.2+ | Authentication |
| **Confidential** | Encrypted email, SFTP | TLS 1.2+, file encryption | Recipient verification, NDA |
| **Restricted** | Encrypted channels only | TLS 1.3+, file encryption, mTLS | MFA, NDA, DPA/BAA, audit trail |

#### Physical Transmission

| Classification | Method | Requirements |
|----------------|--------|--------------|
| **Public** | Regular mail | None |
| **Internal** | Internal mail | Sealed envelope |
| **Confidential** | Tracked delivery | Double envelope, signature required |
| **Restricted** | Bonded courier | Tamper-evident packaging, chain of custody |

### Sharing and Collaboration

#### Internal Sharing

| Classification | Sharing Model | Approval Required |
|----------------|---------------|-------------------|
| **Public** | Unrestricted | None |
| **Internal** | Any employee | None |
| **Confidential** | Need-to-know | Manager approval |
| **Restricted** | Strictly need-to-know | Data owner + security approval |

#### External Sharing

| Classification | Allowed? | Requirements |
|----------------|----------|--------------|
| **Public** | Yes | None |
| **Internal** | With approval | Manager approval; business justification |
| **Confidential** | With strict controls | Executive approval, NDA, specific use limitation |
| **Restricted** | Minimal; only if required | Legal approval, DPA/BAA, encryption, audit trail, compliance review |

### Retention and Disposal

#### Retention Schedules

| Classification | Typical Retention | Justification |
|----------------|-------------------|---------------|
| **Public** | Indefinite or business need | No regulatory requirement |
| **Internal** | 3-7 years | Business and legal hold requirements |
| **Confidential** | Per legal/business need | Varies by type (contracts 7 years, etc.) |
| **Restricted** | Minimum necessary | GDPR requires minimization; dispose ASAP |

#### Disposal Methods

| Classification | Electronic Disposal | Physical Disposal |
|----------------|---------------------|-------------------|
| **Public** | Standard deletion | Recycling OK |
| **Internal** | Secure deletion | Shredding (cross-cut) |
| **Confidential** | Cryptographic erasure or overwrite (DoD 5220.22-M) | Cross-cut shredding; incineration |
| **Restricted** | Cryptographic erasure (mandatory); overwrite 7+ passes | Cross-cut shredding + incineration; certified destruction |

#### Disposal Verification
- **Confidential**: Certificate of destruction (digital or physical)
- **Restricted**: Certificate of destruction + audit trail + verification

## Special Data Types

### Personally Identifiable Information (PII)

**Classification**: Typically Restricted (may be Confidential if low sensitivity)

**Examples**:
- Direct identifiers: SSN, passport, driver's license
- Quasi-identifiers: Name + DOB + ZIP code
- Sensitive PII: Biometrics, financial data, health data

**Special Requirements**:
- Data minimization (collect only what's needed)
- Purpose limitation (use only for stated purpose)
- Consent management (GDPR requires explicit consent)
- Data subject rights (access, rectification, erasure, portability)
- Breach notification (72 hours for GDPR)
- Privacy impact assessments for high-risk processing

### Payment Card Information (PCI)

**Classification**: Restricted (PCI DSS mandate)

**Prohibited Storage**:
- Full magnetic stripe data
- Card verification code (CVV2/CVC2)
- PIN or PIN block

**Allowed Storage** (with encryption):
- Primary Account Number (PAN) - truncate or hash when possible
- Cardholder name
- Expiration date
- Service code

**Special Requirements**:
- Tokenization preferred over storage
- Network segmentation (CDE isolation)
- Quarterly vulnerability scans (ASV)
- Annual penetration testing
- PCI DSS compliance attestation

### Protected Health Information (PHI)

**Classification**: Restricted (HIPAA mandate)

**Examples**:
- Medical records and treatment information
- Health insurance information
- Genetic information
- Mental health records
- Any health data linked to an individual

**Special Requirements**:
- Business Associate Agreements (BAAs) for vendors
- Minimum necessary standard
- HIPAA Security Rule compliance
- Breach notification (60 days)
- Patient rights (access, amendment, accounting)
- Physical, technical, administrative safeguards

### Authentication Credentials

**Classification**: Restricted (always)

**Examples**:
- Passwords and password hashes
- API keys and tokens
- Private keys and certificates
- OAuth tokens
- Session tokens

**Special Requirements**:
- Never log in plaintext
- Hash with strong algorithm (bcrypt, scrypt, Argon2)
- Store in secrets management system
- Rotate regularly
- Revoke on compromise
- MFA for access to credential stores

## Compliance Mapping

### GDPR (General Data Protection Regulation)

| GDPR Principle | Classification Impact |
|----------------|----------------------|
| Lawfulness, fairness, transparency | Document lawful basis for Restricted/Confidential data |
| Purpose limitation | Use data only for declared purpose |
| Data minimization | Classify and collect only necessary data |
| Accuracy | Update/correct classified data |
| Storage limitation | Apply retention schedules; minimize Restricted data retention |
| Integrity and confidentiality | Encryption and access controls per classification |
| Accountability | Maintain data inventory with classifications |

### PCI DSS Requirements

| Requirement | Classification Action |
|-------------|----------------------|
| Build and maintain secure network | Network segmentation for Restricted payment data |
| Protect cardholder data | Encryption, tokenization for Restricted PCI data |
| Maintain vulnerability management | Scanning for systems handling Restricted data |
| Implement strong access control | Need-to-know for Restricted data access |
| Monitor and test networks | Enhanced logging for Restricted data systems |
| Maintain information security policy | Data classification policy includes PCI requirements |

### HIPAA Requirements

| Safeguard | Classification Action |
|-----------|----------------------|
| Physical | Secure storage for Restricted PHI (locked, monitored) |
| Technical | Encryption, access controls, audit logs for Restricted PHI |
| Administrative | Policies, training, risk assessments for PHI handling |

## Data Inventory and Governance

### Data Inventory Requirements

For Confidential and Restricted data:

| Field | Description |
|-------|-------------|
| **Data Type** | Description of data (e.g., "Customer PII") |
| **Classification** | Public/Internal/Confidential/Restricted |
| **Data Owner** | Business unit responsible |
| **Data Custodian** | IT/Security responsible for controls |
| **Storage Location** | Systems/databases where stored |
| **Access List** | Who has access (roles/individuals) |
| **Regulatory Applicability** | GDPR, PCI, HIPAA, etc. |
| **Retention Period** | How long data is kept |
| **Disposal Method** | How data is destroyed |
| **Encryption Status** | At rest and in transit |
| **Last Review Date** | When classification was last reviewed |

### Reclassification

#### Triggers for Reclassification
- Annual review cycle
- Change in regulatory status
- Business context change (e.g., data now public)
- Security incident
- Data aggregation/combination

#### Downgrade Process
1. Data owner proposes downgrade with justification
2. Security review confirms no regulatory barriers
3. Compliance approval (if applicable)
4. Update data inventory
5. Adjust controls to new classification level
6. Communicate change to data users

#### Upgrade Process
1. Identify need (regulation, incident, risk assessment)
2. Security or data owner initiates upgrade
3. Update data inventory immediately
4. Implement higher controls within 30 days
5. Communicate change to all data users

## Training and Awareness

### Required Training

| Audience | Frequency | Content |
|----------|-----------|---------|
| **All Employees** | Annual | Data classification levels, handling basics, responsibilities |
| **Data Owners** | Annual + on assignment | Classification assignment, governance, compliance |
| **Developers** | Annual + onboarding | Secure coding for classified data, encryption, logging |
| **IT/Security** | Quarterly | Control implementation, monitoring, incident response |
| **Contractors/Vendors** | Before access | Handling requirements, NDA/BAA obligations |

### Awareness Materials
- Data classification posters/desk references
- Email signature reminders
- Intranet resources
- Role-based quick reference guides
- Data handling decision trees

## Violations and Enforcement

### Policy Violations

| Violation | Example | Consequence |
|-----------|---------|-------------|
| **Minor** | Incorrect classification label | Coaching, retraining |
| **Moderate** | Sharing Confidential data without approval | Written warning, access review |
| **Serious** | Exposing Restricted data | Suspension, termination, legal action |
| **Critical** | Intentional data theft | Termination, criminal prosecution |

### Incident Response
- Report data classification violations to security team
- Investigate and determine impact
- Notify affected parties if Restricted data exposed
- Remediate and implement corrective actions
- Disciplinary action per policy

## Review and Updates

### Review Schedule
- **Policy Review**: Annual
- **Classification Inventory**: Quarterly for Restricted, Annual for Confidential
- **Handling Procedures**: Annual or upon regulatory change
- **Training Materials**: Annual or upon policy change

### Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | `[Date]` | Initial classification framework | `[Name]` |
| 1.1 | `[Date]` | Added GDPR requirements | `[Name]` |
| 2.0 | `[Date]` | Restructured classification levels | `[Name]` |

## Appendices

### A. Data Classification Label Templates
- Email header templates
- Document watermark examples
- Metadata tag formats

### B. Classification Decision Workflow
- Flowchart for data owners
- Classification request form

### C. Regulatory Quick Reference
- GDPR data types and requirements
- PCI DSS cardholder data elements
- HIPAA PHI examples

### D. Approved Tools and Systems
- Encryption tools by classification level
- Approved cloud storage by classification
- DLP solution configurations

### E. Contact Information
- Data Protection Officer
- Security team
- Legal/Compliance team
- Vendor/BAA management

## Approval and Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Data Protection Officer | `[Name]` | `[Signature]` | `[Date]` |
| Security Architect | `[Name]` | `[Signature]` | `[Date]` |
| Legal Counsel | `[Name]` | `[Signature]` | `[Date]` |
| Compliance Officer | `[Name]` | `[Signature]` | `[Date]` |
| Chief Information Officer | `[Name]` | `[Signature]` | `[Date]` |