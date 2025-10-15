# Privacy by Design Checklist

## Purpose

This checklist embeds privacy controls into design and architecture phases to ensure compliance with **GDPR Article 25 - Data Protection by Design and by Default**.

Use this checklist during **Elaboration phase** (architecture and design) and **Code Review** to verify privacy principles are implemented.

## Regulatory Requirement

**GDPR Article 25(1) - Data Protection by Design**:
"The controller shall... implement appropriate technical and organisational measures... designed to implement data-protection principles... in an effective manner and to integrate the necessary safeguards into the processing."

**GDPR Article 25(2) - Data Protection by Default**:
"The controller shall implement... measures for ensuring that, by default, only personal data which are necessary for each specific purpose... are processed."

## GDPR Principles (Art. 5)

### 1. Data Minimization (Art. 5(1)(c))

**Principle**: Collect only data that is adequate, relevant, and limited to what is necessary.

- [ ] **Identify Required vs. Optional Fields**: Mark optional fields clearly in forms
- [ ] **Progressive Disclosure**: Ask for data only when needed (not all at registration)
- [ ] **Avoid Excessive Collection**: Do not collect "nice-to-have" data without clear purpose
- [ ] **Default to Minimal**: Forms pre-populate with minimal data, not maximum
- [ ] **Remove Unused Data**: Delete or anonymize data when no longer needed for purpose
- [ ] **Review Data Models**: Audit database schemas - are all fields necessary?

**Examples**:
- Registration form: Email required, phone optional
- Progressive: Ask for address only at checkout, not registration
- Avoid: Collecting date of birth for adult-only service (age verification: Yes/No sufficient)

### 2. Purpose Limitation (Art. 5(1)(b))

**Principle**: Data collected for specified, explicit, legitimate purposes; not further processed incompatibly.

- [ ] **Document Purposes**: Each data element has documented purpose in data classification
- [ ] **Prevent Purpose Creep**: Technical controls prevent using marketing data for analytics without consent
- [ ] **Separate Databases**: Marketing database separate from transactional database (prevents accidental misuse)
- [ ] **Purpose-Based Access Controls**: Engineering team cannot access marketing data; marketing cannot access full transaction history
- [ ] **New Purpose = New Consent**: If new purpose arises, obtain new consent or establish new lawful basis
- [ ] **Audit Data Use**: Periodic reviews ensure data used only for documented purposes

**Examples**:
- Email collected for account creation (contract) NOT used for marketing (consent) unless separate consent obtained
- Analytics data pseudonymized (separate purpose from identified customer data)

### 3. Storage Limitation (Art. 5(1)(e))

**Principle**: Retain data only as long as necessary for purposes.

- [ ] **Define Retention Periods**: Each data category has retention period (see Data Retention Policy)
- [ ] **Automated Deletion**: Scheduled jobs delete expired data automatically
- [ ] **Deletion on Request**: User can delete account; data erased within 30 days
- [ ] **Backup Purge**: Deleted data purged from backups within 90 days
- [ ] **Archive or Anonymize**: Long-term data anonymized (no longer personal data)
- [ ] **Legal Hold Exception**: Suspend deletion if data subject to legal hold

**Examples**:
- User account: Deleted 30 days after account termination
- Marketing data: Deleted immediately on consent withdrawal
- Transaction data: Retained 7 years (legal obligation), then deleted

### 4. Accuracy (Art. 5(1)(d))

**Principle**: Data must be accurate and kept up to date.

- [ ] **User Self-Service Updates**: Users can update their own data in account settings
- [ ] **Verification**: Verify email/phone with confirmation codes
- [ ] **Rectification API**: Support team can correct inaccurate data on user request
- [ ] **Automated Validation**: Forms validate data format (email regex, phone format)
- [ ] **Stale Data Detection**: Flag accounts inactive >1 year for verification
- [ ] **Propagate Updates**: Updates propagate to all systems (database, CRM, processors)

**Examples**:
- User updates email; change reflected across all systems within 24 hours
- Invalid email format rejected at form submission

### 5. Integrity and Confidentiality (Art. 5(1)(f))

**Principle**: Process data securely to protect against unauthorized access, loss, or damage.

See **Security Measures** section below (Art. 32 compliance).

### 6. Accountability (Art. 5(2))

**Principle**: Controller must demonstrate compliance with principles.

- [ ] **Documentation**: Maintain DPIA, lawful basis assessment, data classification, consent records
- [ ] **Audit Trails**: Log data access, modifications, deletions
- [ ] **Policies**: Data retention policy, data subject rights workflows, breach notification plan
- [ ] **Training**: Annual privacy training for all employees
- [ ] **DPO Oversight**: Data Protection Officer reviews and approves high-risk processing

**Examples**:
- DPIA documents risk assessment and mitigations
- Consent records demonstrate valid consent (GDPR Art. 7(1))
- Access logs show who accessed what data when

## Privacy by Default

### Default Privacy Settings

- [ ] **Opt-In for Marketing**: Marketing emails opt-in, not opt-out (default: no marketing)
- [ ] **Private by Default**: User profile visibility default: private (not public)
- [ ] **Minimal Data Sharing**: Default: do not share data with third parties (user must opt-in)
- [ ] **Conservative Cookies**: Only essential cookies by default; analytics/marketing cookies opt-in
- [ ] **Strongest Security**: Default: MFA enabled (if possible); strongest encryption algorithm
- [ ] **No Pre-Ticked Boxes**: Consent checkboxes default: unchecked
- [ ] **Minimal Notifications**: Default: transactional emails only (not promotional)

**Examples**:
- Social media profile: Default visibility = Friends Only (not Public)
- Newsletter subscription: Default = Unchecked (user must opt-in)
- Cookie banner: Default = Essential Only (analytics/marketing require opt-in)

## Data Minimization in Design

### Collection Phase

- [ ] **Limit Form Fields**: Collect only essential data at registration
- [ ] **Progressive Disclosure**: Multi-step forms ask for data only when needed
- [ ] **Optional Fields**: Mark optional fields clearly; do not require unless necessary
- [ ] **Age Verification**: Collect year of birth only (not full DOB) if age verification sufficient
- [ ] **Location**: IP-based location (city-level) instead of GPS (if precise location not required)

### Processing Phase

- [ ] **Pseudonymization**: Analytics use pseudonymized user IDs, not direct identifiers
- [ ] **Anonymization**: Aggregate data for reporting (no individual records)
- [ ] **Encryption**: Encrypt sensitive data at rest (PII, payment data)
- [ ] **Hashing**: Hash passwords (bcrypt, Argon2); never store plaintext passwords
- [ ] **Tokenization**: Tokenize payment cards (do not store PAN)

### Storage Phase

- [ ] **Separate Databases**: Sensitive data in separate database with restricted access
- [ ] **Field-Level Encryption**: Encrypt SSN, payment data at field level (not just database encryption)
- [ ] **Access Controls**: Least privilege access; sensitive data restricted to specific roles
- [ ] **Data Masking**: Mask sensitive data in non-production environments (test/dev/staging)

### Sharing Phase

- [ ] **Minimal Sharing**: Share only data necessary with third parties (e.g., payment processor gets payment data only, not full profile)
- [ ] **Data Processing Agreements (DPAs)**: Require all processors to sign DPAs (GDPR Art. 28)
- [ ] **Processor Audits**: Annual audits of processors to verify compliance
- [ ] **Encryption in Transit**: TLS 1.3 for all API calls to processors

## User Control and Transparency

### Transparency (Arts. 13-14)

- [ ] **Privacy Notice**: Clear, concise privacy notice at collection (not hidden in terms)
- [ ] **Layered Notice**: Short notice + full notice link (progressive disclosure)
- [ ] **Plain Language**: Privacy notice in plain language (no legalese); appropriate reading level
- [ ] **Key Information Upfront**: Purpose, lawful basis, recipients, retention, rights disclosed clearly
- [ ] **Data Flow Diagrams**: Visual representation of data flows (where data goes)
- [ ] **Contact Info**: Privacy Officer/DPO contact info prominently displayed

**Examples**:
- Registration form: "We use your email for account creation and security. We will not send marketing emails unless you opt-in. [Learn more](privacy-notice)"

### User Control (Preference Center)

- [ ] **Preference Dashboard**: User dashboard shows all privacy settings in one place
- [ ] **Consent Management**: User can view, grant, withdraw consent (marketing, analytics, personalization)
- [ ] **Data Access**: User can download all their data (Art. 15 - Right of Access)
- [ ] **Data Portability**: User can export data in CSV/JSON format (Art. 20)
- [ ] **Data Rectification**: User can update/correct their data (Art. 16)
- [ ] **Data Erasure**: User can delete account and data (Art. 17 - Right to be Forgotten)
- [ ] **Restriction**: User can restrict processing (Art. 18)
- [ ] **Object**: User can object to processing (Art. 21 - e.g., opt-out of marketing)

**Examples**:
- Privacy Dashboard: "Your Data | Marketing Preferences | Download Data | Delete Account"
- One-click actions for common requests (no support ticket required)

## Security Measures (GDPR Art. 32)

### Encryption

- [ ] **Encryption at Rest**: AES-256 encryption for all Restricted data in databases
- [ ] **Encryption in Transit**: TLS 1.3 for all external communications (APIs, web, email)
- [ ] **Field-Level Encryption**: Encrypt SSN, payment data separately (granular protection)
- [ ] **Key Management**: HSM or KMS for encryption key management (not hardcoded keys)
- [ ] **Key Rotation**: Rotate encryption keys annually

### Access Controls

- [ ] **Authentication**: Strong password requirements + MFA for admin access
- [ ] **Authorization (RBAC)**: Role-based access control; least privilege principle
- [ ] **Need-to-Know**: Sensitive data accessible only to roles that require it
- [ ] **Privileged Access Management (PAM)**: Just-in-time access for production databases (time-limited)
- [ ] **Access Reviews**: Quarterly review of all access rights; revoke unnecessary access
- [ ] **Segregation of Duties**: Separation between dev, test, and production access

### Monitoring and Logging

- [ ] **Audit Logging**: Log all access to Restricted data (who, what, when)
- [ ] **Tamper-Proof Logs**: Logs append-only; integrity verified with hashing
- [ ] **SIEM Integration**: Security Information and Event Management system ingests logs
- [ ] **Real-Time Alerts**: Alert on unusual access patterns (e.g., mass data export, after-hours access)
- [ ] **Data Loss Prevention (DLP)**: Monitor and block unauthorized data exfiltration (email, USB)
- [ ] **Anomaly Detection**: ML-based detection of unusual access patterns

### Testing and Validation

- [ ] **Privacy Impact Assessment (DPIA)**: Conducted and approved before launch (Art. 35)
- [ ] **Security Testing**: Penetration testing, vulnerability scanning (annual minimum)
- [ ] **Privacy Testing**: Test data subject rights workflows (access, erasure within 30 days)
- [ ] **Breach Simulation**: Tabletop exercise for 72-hour breach notification (Art. 33)
- [ ] **Privacy Code Review**: Developers trained on secure coding; privacy checklist in code review

## Data Subject Rights Implementation

- [ ] **Right of Access (Art. 15)**: Automated API exports all user data in JSON/CSV format
- [ ] **Right to Erasure (Art. 17)**: Deletion API deletes user data from all systems + backups (90-day purge)
- [ ] **Right to Portability (Art. 20)**: Export API provides machine-readable data (CSV/JSON)
- [ ] **Right to Rectification (Art. 16)**: User self-service update + support tools
- [ ] **Right to Restriction (Art. 18)**: Processing restriction flag in database
- [ ] **Right to Object (Art. 21)**: One-click marketing opt-out; unsubscribe link in emails
- [ ] **Rights Dashboard**: User can exercise all rights from single dashboard (no support tickets)
- [ ] **30-Day SLA**: All requests completed within 30 days (GDPR Art. 12(3))

## Privacy-Preserving Architectures

### Architectural Patterns

- [ ] **Zero-Knowledge Architecture**: Server cannot read user data (end-to-end encryption; user holds keys)
- [ ] **Federated Learning**: Train ML models without centralizing user data (models trained locally)
- [ ] **Differential Privacy**: Add noise to aggregated data to prevent individual identification
- [ ] **Homomorphic Encryption**: Compute on encrypted data without decrypting (advanced, rare)
- [ ] **On-Device Processing**: Process sensitive data on user device, not server (e.g., biometric authentication on phone)
- [ ] **Decentralized Identity**: User controls identity credentials (self-sovereign identity)

**Examples**:
- Signal: End-to-end encrypted messaging (server cannot read messages)
- Apple: Face ID processed on device, not sent to Apple servers
- Google Federated Learning: Train predictive text model without uploading user text

### Data Separation

- [ ] **Identify Isolation**: Separate identifiable data from behavioral data (cannot link without explicit join)
- [ ] **Pseudonymization Key Separation**: Keep pseudonymization key in separate system (different access controls)
- [ ] **Purpose Separation**: Marketing database separate from analytics database
- [ ] **Environment Separation**: Production data never copied to dev/test environments (use synthetic data)

## Privacy in AI/ML Systems

### Ethical AI

- [ ] **Bias Detection**: Test ML models for discriminatory outcomes (protected classes: race, gender, age)
- [ ] **Explainability**: Provide explanations for automated decisions (GDPR Art. 22)
- [ ] **Human Oversight**: Human review of automated decisions with legal/significant effects
- [ ] **Contestability**: Users can challenge automated decisions
- [ ] **Transparency**: Disclose when decisions are automated; explain logic

### Data Protection in ML

- [ ] **Training Data Minimization**: Use only necessary data for training (not entire dataset)
- [ ] **Anonymization**: Anonymize training data if possible (remove identifiers)
- [ ] **Differential Privacy in Training**: Add noise to training data to prevent individual identification
- [ ] **Model Audits**: Audit trained models for privacy leaks (e.g., membership inference attacks)
- [ ] **Federated Learning**: Train models without centralizing data

## Privacy in Third-Party Integrations

### Vendor Selection

- [ ] **Privacy Assessment**: Evaluate vendor privacy practices before onboarding
- [ ] **Data Processing Agreement (DPA)**: Require signed DPA with all processors (GDPR Art. 28)
- [ ] **Sub-Processor List**: Obtain list of sub-processors; require notification of changes
- [ ] **Certifications**: Verify vendor certifications (ISO 27001, SOC 2, GDPR compliance)
- [ ] **Audits**: Annual audit rights in DPA; conduct audits

### Data Minimization with Third Parties

- [ ] **Minimal Sharing**: Share only data necessary for vendor service (e.g., payment processor gets payment data only)
- [ ] **Pseudonymization**: Share pseudonymized data if possible (e.g., analytics vendors)
- [ ] **Aggregation**: Share aggregated data instead of individual records if possible
- [ ] **Contractual Limits**: DPA specifies data use restrictions (vendor cannot use for own purposes)

### Cross-Border Transfers

- [ ] **Transfer Mechanism**: Use SCCs, adequacy decision, or other valid mechanism (GDPR Art. 46)
- [ ] **Transfer Impact Assessment (TIA)**: Assess risks if transferring to US, China, Russia, etc.
- [ ] **Supplementary Measures**: Implement encryption, data minimization if risks identified

See **Cross-Border Transfer Assessment Template**.

## Privacy Documentation

- [ ] **Privacy Impact Assessment (DPIA)**: Completed if high-risk processing (GDPR Art. 35)
- [ ] **Lawful Basis Assessment**: Lawful basis documented for each processing activity (GDPR Art. 6)
- [ ] **Consent Records**: Consent capture, storage, withdrawal mechanisms compliant (GDPR Art. 7)
- [ ] **Data Classification**: All data classified (Public, Internal, Confidential, Restricted)
- [ ] **Data Retention Policy**: Retention periods defined and automated
- [ ] **Data Subject Rights Workflows**: Procedures for access, erasure, rectification, etc.
- [ ] **Data Processing Agreements (DPAs)**: Signed with all processors
- [ ] **Cross-Border Transfer Assessments**: TIA for each transfer

## Integration with SDLC

### Inception Phase

- [ ] Privacy Officer consulted on project scope
- [ ] DPIA trigger assessment completed
- [ ] High-level privacy requirements identified

### Elaboration Phase (Design)

- [ ] **This checklist completed** during architecture and design
- [ ] Privacy requirements in Supplementary Specification (Section 9)
- [ ] Architecture diagram shows privacy controls (encryption, pseudonymization, access controls)
- [ ] Data subject rights APIs designed
- [ ] Privacy documentation drafted (DPIA, lawful basis, consent)

### Construction Phase (Implementation)

- [ ] Privacy controls implemented (encryption, access controls, deletion APIs)
- [ ] Privacy checklist reviewed in code reviews
- [ ] Privacy tests written (data subject rights, 30-day SLA, consent)

### Testing Phase

- [ ] Privacy functional tests pass (access, erasure, rectification, portability)
- [ ] Security tests pass (encryption, access controls, penetration testing)
- [ ] DPIA mitigations verified

### Transition Phase (Go-Live)

- [ ] Privacy gate: All privacy controls operational before launch
- [ ] Privacy documentation complete and approved
- [ ] Support team trained on data subject rights handling
- [ ] Privacy Officer approves launch

## Approval

| Role | Name | Approval | Signature | Date |
|------|------|----------|-----------|------|
| **Privacy Officer** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Security Architect** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Engineering Lead** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Product Owner** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |

---

**References**:
- GDPR Article 25: [https://gdpr-info.eu/art-25-gdpr/](https://gdpr-info.eu/art-25-gdpr/)
- ICO Privacy by Design Guidance: [https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/accountability-and-governance/data-protection-by-design-and-default/](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/accountability-and-governance/data-protection-by-design-and-default/)
- Privacy by Design Principles (Ann Cavoukian): [https://www.ipc.on.ca/wp-content/uploads/resources/7foundationalprinciples.pdf](https://www.ipc.on.ca/wp-content/uploads/resources/7foundationalprinciples.pdf)
