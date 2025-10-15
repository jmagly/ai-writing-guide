# Data Subject Rights Workflow Template

## Document Control

| Field | Value |
|-------|-------|
| Document Type | Data Subject Rights Implementation Workflow |
| Project Name | `[Project/System Name]` |
| Version | `[e.g., 1.0]` |
| Date | `[YYYY-MM-DD]` |
| Author | `[Privacy Officer, Engineering Lead]` |
| Reviewers | `[Legal, Support Manager, Product Owner]` |
| Status | `[Draft/Approved/Implemented]` |
| Related Documents | DPIA, Architecture Document, Test Plan, Support Runbook |

## Purpose and Regulatory Basis

### Purpose

This document defines workflows, technical implementation, and operational procedures for fulfilling data subject rights under **GDPR Chapter III (Articles 12-22)**.

### Regulatory Requirements

**GDPR Article 12**: Controller shall provide information and facilitate exercise of rights **free of charge**, in **concise, transparent, intelligible, and easily accessible form**, using **plain language**.

**Response Deadline (Art. 12(3))**: **30 days** from receipt of request (extendable by 2 months if complex, with justification).

**Verification (Art. 12(6))**: Controller may request additional information to verify identity, but cannot refuse request solely based on inability to identify (unless identity required for service).

### Data Subject Rights Summary

| Right | GDPR Article | Description |
|-------|--------------|-------------|
| **Right to be Informed** | Arts. 13-14 | Transparent privacy notice at collection |
| **Right of Access** | Art. 15 | Data subject can obtain copy of their personal data |
| **Right to Rectification** | Art. 16 | Correct inaccurate or incomplete data |
| **Right to Erasure ("Right to be Forgotten")** | Art. 17 | Delete data under specific conditions |
| **Right to Restriction of Processing** | Art. 18 | Suspend processing while disputing accuracy/lawfulness |
| **Right to Data Portability** | Art. 20 | Receive data in machine-readable format; transmit to another controller |
| **Right to Object** | Art. 21 | Object to processing based on legitimate interest or direct marketing |
| **Rights Related to Automated Decision-Making** | Art. 22 | Not be subject to automated decisions with legal/significant effects |

## General Request Handling Workflow

### 1. Request Receipt

**Channels**:
- [ ] Email: privacy@example.com (primary channel)
- [ ] Web form: Privacy Request Form on website
- [ ] Support ticket system
- [ ] Postal mail (legal requirement in some jurisdictions)
- [ ] Phone (not recommended - hard to verify, but must accept if offered)

**Initial Response** (acknowledge within 48 hours):

```
Thank you for your data subject request. We have received your request for [access/erasure/rectification/etc.] and will respond within 30 days as required by GDPR Article 12(3).

Request ID: [DSR-12345]
Request Type: [Access/Erasure/Rectification/Restriction/Portability/Object]
Received Date: [YYYY-MM-DD]

To process your request, we may need to verify your identity. Please be prepared to provide [verification method].

If you have questions, reply to this email with your Request ID.
```

### 2. Identity Verification

**Purpose**: Prevent fraudulent requests that could expose data to unauthorized parties (GDPR Art. 12(6)).

**Verification Methods**:

| Request Type | Verification Level | Method |
|--------------|-------------------|--------|
| **Access** (discloses data) | **High** | Logged-in user OR email verification + security question OR government ID |
| **Erasure** | **High** | Logged-in user OR email verification + security question (prevent malicious deletion) |
| **Portability** | **High** | Logged-in user OR email verification + security question |
| **Rectification** | Medium | Logged-in user OR email verification |
| **Restriction** | Medium | Logged-in user OR email verification |
| **Object** | Medium | Logged-in user OR email verification |

**Verification Process**:
1. If logged in: User initiates request from account dashboard (identity pre-verified)
2. If email: Send unique token link to registered email; user clicks to verify
3. If not registered: Request additional information (e.g., last transaction date, account creation date) + government ID (if high risk)

**Excessive Verification Prohibition**: Cannot request excessive information or unreasonable verification (Art. 12(6)).

### 3. Request Triage and Assignment

**Triage Criteria**:
- Request type (access, erasure, etc.)
- Complexity (single system vs. multi-system data retrieval)
- Urgency (data breach victim requests prioritized)
- Volume (handle batch requests from same organization efficiently)

**Assignment**:
- **Simple requests** (self-service, automated): System processes automatically
- **Complex requests** (manual data retrieval): Assigned to Privacy Officer or designated support agent
- **Ambiguous requests**: Assigned to Privacy Officer for clarification

### 4. Request Processing

See individual right workflows below.

### 5. Response Delivery

**Response Format**:
- **Email**: Secure link to encrypted file (expires in 7 days) OR encrypted PDF attachment
- **In-App**: Data available in user dashboard for 30 days
- **Postal Mail**: Only if specifically requested; certified mail

**Response Content**:
- Cover letter explaining what data is included
- Data in accessible format (CSV, JSON, PDF)
- Explanation of any exceptions applied (e.g., erasure denied under legal obligation)
- Information on right to lodge complaint with supervisory authority

### 6. Documentation and Audit

**Record for Each Request**:
- Request ID, date received, date completed
- Request type, data subject details, verification method
- Actions taken (data exported, deleted, corrected)
- Exceptions applied and justification
- Response sent date

**Audit Trail Retention**: 3 years minimum (demonstrable compliance per Art. 5(2))

## Right of Access (GDPR Art. 15)

### Regulatory Requirement

**Art. 15(1)**: Data subject has right to obtain:
- Confirmation whether their data is being processed
- Copy of personal data undergoing processing
- Information about processing (purposes, categories, recipients, retention, rights)

**Art. 15(3)**: Provide copy **free of charge** (first request); may charge reasonable fee for additional copies or manifestly unfounded/excessive requests.

### Workflow

#### Step 1: Receive and Verify Request

- Request received via privacy@example.com or web form
- Verify identity (high verification level)
- Acknowledge within 48 hours

#### Step 2: Data Retrieval

**Automated Retrieval** (preferred):
- API endpoint queries all systems for user data
- Data aggregated into structured format (JSON or CSV)
- Execution time: < 5 minutes

**Manual Retrieval** (if automated not available):
- Privacy Officer queries each system manually
- Data compiled into spreadsheet
- Execution time: 1-5 days

**Systems to Query**:
- [ ] User account database
- [ ] Transaction/order database
- [ ] Support ticket system
- [ ] Marketing database
- [ ] Analytics/logging systems (last 90 days)
- [ ] Backup systems (if data not in active systems)
- [ ] Processor systems (if data stored by third parties)

**Data to Include**:
- All personal data (identification, financial, behavioral, communication)
- Metadata (creation dates, last modified, source)
- Inferred data (analytics, profiling results, scores)
- Exclude: Trade secrets, confidential business information (may be redacted if inseparable)

#### Step 3: Data Package Preparation

**Format**:
- **Structured data**: CSV or JSON (machine-readable per Art. 20)
- **Documents**: PDF
- **Combined package**: ZIP file with README explaining contents

**README Contents**:
```
Your Personal Data - Data Subject Access Request

Request ID: DSR-12345
Generated: 2025-10-15

This package contains all personal data we hold about you:

1. account_data.csv - Your account information
2. transactions.csv - Your transaction history
3. support_tickets.pdf - Support interactions
4. analytics_data.csv - Usage analytics (last 90 days)

Processing Information:
- Purposes: Service delivery, fraud prevention, marketing (with your consent)
- Legal Basis: Contract (service delivery), Consent (marketing)
- Recipients: Payment processor (Stripe), Analytics (Google Analytics)
- Retention: Account data (account lifetime + 30 days), Transactions (7 years)
- Rights: You can request rectification, erasure, restriction, portability, object
- Complaint: You can lodge a complaint with [Supervisory Authority]

Questions? Contact privacy@example.com with your Request ID.
```

#### Step 4: Delivery

- Upload encrypted package to secure portal
- Send email with download link (unique token, expires in 7 days)
- User downloads data

**Response Time**: Target 7 days, maximum 30 days

### Exceptions and Limitations

**May Refuse If** (Art. 12(5)):
- Request is manifestly unfounded or excessive (charge reasonable fee or refuse)
- Repeated requests (charge reasonable fee for additional copies)

**Cannot Disclose**:
- Data that adversely affects rights of others (e.g., third-party personal data)
- Trade secrets or confidential business information (unless inseparable from data subject's data)

### Test Cases

- [ ] Test: User requests access; system exports all data within 30 days
- [ ] Test: Data package includes all required information (Art. 15(1) list)
- [ ] Test: Export format is machine-readable (CSV/JSON)
- [ ] Test: Sensitive data from other users is not included
- [ ] Test: Encrypted download link expires after 7 days
- [ ] Test: Request is logged in audit trail

## Right to Rectification (GDPR Art. 16)

### Regulatory Requirement

**Art. 16**: Data subject has right to obtain **rectification of inaccurate personal data** and **completion of incomplete personal data**.

### Workflow

#### Step 1: Receive Request

- User submits rectification request: "My email address is incorrect" or "My address is outdated"
- Verify identity (medium verification level)

#### Step 2: Validate Correction

- Verify new data is accurate (e.g., email verification for new email)
- Cannot rectify data if new data is also inaccurate
- If dispute over accuracy (e.g., credit score): may restrict processing instead of rectify (Art. 18)

#### Step 3: Update Data

**Self-Service** (preferred):
- User updates data in account settings
- Immediate effect

**Support-Assisted**:
- Support agent updates data in admin panel
- Propagate to all systems (database, CRM, processors)
- Execution time: < 24 hours

#### Step 4: Notify Recipients

**Obligation (Art. 19)**: Inform recipients (processors, third parties) of rectification **unless impossible or disproportionate effort**.

- Email processors: "User [ID] data updated; please update your records"
- Log notification sent

#### Step 5: Confirm to User

```
Your data has been corrected.

Old Value: [Old data]
New Value: [New data]
Updated: [Timestamp]

This correction has been propagated to all our systems and our data processors.
```

**Response Time**: Immediate (self-service) or within 30 days (support-assisted)

### Test Cases

- [ ] Test: User updates email; change reflected across all systems
- [ ] Test: Rectification propagates to processors within 48 hours
- [ ] Test: User is notified of successful rectification

## Right to Erasure / "Right to be Forgotten" (GDPR Art. 17)

### Regulatory Requirement

**Art. 17(1)**: Data subject has right to erasure if:
- (a) Data no longer necessary for purposes
- (b) Consent withdrawn and no other lawful basis
- (c) Data subject objects (Art. 21) and no overriding legitimate grounds
- (d) Data processed unlawfully
- (e) Legal obligation to erase
- (f) Children's data collected under Art. 8(1)

**Art. 17(3) Exceptions** (erasure NOT required if processing necessary for):
- (a) Freedom of expression and information
- (b) Legal obligation or public interest task
- (c) Public health
- (d) Archiving, research, statistics (with safeguards)
- (e) Legal claims (establish, exercise, defend)

### Workflow

#### Step 1: Receive Request

- User submits erasure request via email or web form
- Verify identity (high verification level - prevent malicious deletion)

#### Step 2: Assess Exceptions

**Checklist**:
- [ ] Is data necessary for legal obligation? (e.g., tax records - 7 years retention)
- [ ] Is data necessary for legal claims? (e.g., contract dispute - retain until resolved)
- [ ] Is processing based on consent or legitimate interest? (If contract, may not erase service-essential data)

**Decision**:
- **Erasure Granted**: No exceptions apply
- **Erasure Denied**: Exception applies; explain to user
- **Partial Erasure**: Some data erased, some retained under exception

#### Step 3: Execute Deletion

**Scope of Deletion**:
- [ ] User account data
- [ ] Transaction history (unless legal obligation to retain)
- [ ] Marketing data (always erasable if consent-based)
- [ ] Analytics data (pseudonymize or delete)
- [ ] Support tickets (anonymize or delete)
- [ ] Backup data (flag for deletion on next backup cycle; purge within 90 days)
- [ ] Processor data (notify processors to delete)

**Deletion Methods**:
- **Active databases**: Delete record (cascade deletes to related tables)
- **Backups**: Flag for purge; overwrite on next backup cycle
- **Logs**: Pseudonymize (replace user ID with anonymous ID)
- **Processors**: Send deletion instruction; verify deletion within 30 days

**Deletion Verification**:
- Run query to confirm data no longer exists
- Check backup systems for deletion flag
- Confirm processors deleted data (email confirmation)

#### Step 4: Notify Recipients (Art. 19)

- Notify all processors and third-party recipients of erasure
- Log notifications sent

#### Step 5: Confirm to User

```
Your data has been deleted.

Deleted Data:
- Account information
- Transaction history (except records required for tax compliance)
- Marketing preferences
- Usage analytics

Retained Data (legal exception):
- Transaction records for fiscal year 2023-2024 (legal obligation - 7 years retention)

Your data will be fully purged from backups within 90 days.

Processors notified: [List]
```

**Response Time**: Target 7 days, maximum 30 days

### Test Cases

- [ ] Test: User requests erasure; all non-exempt data deleted within 30 days
- [ ] Test: Legal obligation data retained (tax records for 7 years)
- [ ] Test: Backup purge job deletes data after 90 days
- [ ] Test: Processors confirmed deletion
- [ ] Test: Deleted user cannot log in
- [ ] Test: Support tickets anonymized (user ID replaced with "Deleted User")

## Right to Restriction of Processing (GDPR Art. 18)

### Regulatory Requirement

**Art. 18(1)**: Data subject has right to restriction if:
- (a) Accuracy of data is contested (restrict while verifying)
- (b) Processing is unlawful and data subject opposes erasure (prefers restriction)
- (c) Controller no longer needs data, but data subject needs it for legal claims
- (d) Data subject objects to processing (Art. 21(1)) (restrict while verifying overriding legitimate grounds)

**Restriction Effect (Art. 18(2))**: Data can only be:
- Stored (not processed)
- Processed with data subject consent
- Processed for legal claims
- Processed to protect rights of another person or public interest

### Workflow

#### Step 1: Receive Request

- User requests restriction: "I dispute the accuracy of my credit score" or "I object to marketing use"
- Verify identity

#### Step 2: Assess Grounds

- Determine which Art. 18(1) ground applies
- Set restriction flag in database: `processing_restricted: true, restriction_reason: "accuracy_disputed", restriction_date: "2025-10-15"`

#### Step 3: Implement Restriction

**Technical Implementation**:
- Database flag prevents non-exempt processing
- Marketing systems check flag (do not include in campaigns)
- Analytics systems exclude from reports
- Storage only (data retained but not actively processed)

**Permitted Processing**:
- Storage (retain data)
- Legal claims (if controller has legal claim involving this data)
- User-consented processing

#### Step 4: Notify User and Recipients

```
Processing of your data has been restricted.

Reason: [Accuracy disputed / Unlawful processing / Legal claim need / Objection pending]

Effect: Your data will be stored but not processed until [restriction lifted / accuracy verified / objection resolved].

You will be notified when restriction is lifted.
```

**Notify Recipients (Art. 19)**: Inform processors and third parties of restriction.

#### Step 5: Lift Restriction (When Grounds No Longer Apply)

- Accuracy verified: Lift restriction
- Objection overridden by legitimate grounds: Lift restriction
- Legal claim resolved: Lift restriction

**Notify User Before Lifting (Art. 18(3))**: Must inform data subject before lifting restriction.

**Response Time**: Implement restriction within 30 days

### Test Cases

- [ ] Test: User disputes accuracy; processing restricted within 30 days
- [ ] Test: Marketing emails not sent to restricted users
- [ ] Test: Analytics excludes restricted users
- [ ] Test: User notified before restriction lifted

## Right to Data Portability (GDPR Art. 20)

### Regulatory Requirement

**Art. 20(1)**: Data subject has right to:
- Receive personal data in **structured, commonly used, machine-readable format**
- Transmit data to another controller **without hindrance**

**Applies Only If**:
- Processing based on **consent** (Art. 6(1)(a)) or **contract** (Art. 6(1)(b))
- Processing is **automated** (not manual filing systems)

**Does NOT Apply If**:
- Processing based on legitimate interest, legal obligation, or public task

### Workflow

#### Step 1: Determine Applicability

- Check lawful basis: Consent or contract? (Yes → portability applies)
- Check processing type: Automated? (Yes → portability applies)
- If both yes: proceed. If no: inform user portability does not apply (but offer access under Art. 15)

#### Step 2: Data Export

**Format**:
- **Structured**: CSV or JSON (machine-readable)
- **Interoperable**: Common format usable by other services
- **Complete**: All personal data provided by or generated from user activity

**Data to Include**:
- User-provided data (registration info, content created)
- Observed data (usage logs, purchase history)
- Inferred data (analytics, preferences)

**Data to Exclude**:
- Data not provided by or about the user (e.g., other users' data)
- Proprietary algorithms, trade secrets

#### Step 3: Transmission Options

**Option 1: Download (User Receives Data)**:
- User downloads CSV/JSON package
- Similar to access request (Art. 15)

**Option 2: Direct Transmission (Controller-to-Controller)**:
- User requests transmission to specific controller (e.g., competitor service)
- Requires API integration or secure file transfer
- Verify recipient is legitimate controller
- Transmit data securely (encrypted, authenticated)

**Limitation (Art. 20(4))**: Portability shall not adversely affect rights of others.

#### Step 4: Confirmation

```
Your data has been prepared for portability.

Format: CSV / JSON
Download Link: [Secure link, expires 7 days]

OR

Your data has been transmitted to [Recipient Controller].
Transmission Date: [Date]
Transmission Method: Secure API

You can verify receipt by contacting [Recipient].
```

**Response Time**: Target 7 days, maximum 30 days

### Test Cases

- [ ] Test: User requests portability; data exported in JSON format
- [ ] Test: Export includes only data based on consent/contract
- [ ] Test: Direct transmission to another controller succeeds
- [ ] Test: Proprietary algorithms excluded from export

## Right to Object (GDPR Art. 21)

### Regulatory Requirement

**Art. 21(1) - General Right to Object**:
- Data subject can object to processing based on **legitimate interest** (Art. 6(1)(f)) or **public task** (Art. 6(1)(e))
- Controller must **stop processing** unless overriding legitimate grounds or legal claims

**Art. 21(2) - Direct Marketing**:
- Data subject has **absolute right** to object to direct marketing
- Controller **must** stop processing for marketing (no exceptions)

**Art. 21(3) - Profiling**:
- Right to object extends to profiling for direct marketing or legitimate interest

### Workflow (Direct Marketing)

#### Step 1: Receive Objection

**Channels**:
- Unsubscribe link in email (most common)
- Preference center in account dashboard
- Email to privacy@example.com
- Support request

#### Step 2: Immediate Cessation

**Effect**: Stop all marketing processing immediately (no exceptions)

**Actions**:
- [ ] Add email to suppression list (permanent - cannot re-subscribe without new consent)
- [ ] Remove from all marketing lists
- [ ] Stop email, SMS, push notification marketing
- [ ] Stop behavioral advertising (retargeting pixels)
- [ ] Notify marketing processors (e.g., email service provider)

**Timeline**: Within 24 hours (preferably immediate)

#### Step 3: Confirmation

```
You have successfully opted out of marketing communications.

You will no longer receive:
- Promotional emails
- SMS marketing
- Push notifications about offers
- Behavioral advertising (retargeting)

You will continue to receive:
- Transactional emails (order confirmations, password resets)
- Critical account notifications

Your preference has been saved permanently.
```

### Workflow (Legitimate Interest)

#### Step 1: Receive Objection

- User objects to processing based on legitimate interest (e.g., fraud detection, analytics)
- Verify identity

#### Step 2: Assess Overriding Legitimate Grounds

**Controller Must Demonstrate**:
- Compelling legitimate grounds that **override** data subject interests, rights, freedoms
- OR processing necessary for legal claims

**Examples of Overriding Grounds**:
- Fraud prevention (protects data subject and others)
- Security monitoring (protects system integrity)
- Legal obligation (e.g., AML compliance)

**Burden of Proof**: Controller must demonstrate; data subject does not need to justify objection

#### Step 3: Decision

**If Overriding Grounds Exist**:
- Continue processing
- Explain to user why objection overridden

**If No Overriding Grounds**:
- Stop processing
- Confirm to user

#### Step 4: Response

```
Your objection to processing has been received.

Processing Purpose: [Fraud detection / Analytics / etc.]

Decision: [Processing stopped / Processing continues]

Justification: [If continues: Explain compelling legitimate grounds or legal claim]

You have the right to lodge a complaint with [Supervisory Authority] if you disagree.
```

**Response Time**: Within 30 days

### Test Cases

- [ ] Test: User opts out of marketing; no marketing emails sent
- [ ] Test: Opt-out processed within 24 hours
- [ ] Test: Suppression list prevents re-subscription without new consent
- [ ] Test: Transactional emails still sent after marketing opt-out
- [ ] Test: User objects to legitimate interest processing; assessment conducted within 30 days

## Rights Related to Automated Decision-Making (GDPR Art. 22)

### Regulatory Requirement

**Art. 22(1)**: Data subject has right **not to be subject to** decision based solely on automated processing (including profiling) that produces **legal effects** or **similarly significantly affects** them.

**Exceptions (Art. 22(2))**:
- (a) Necessary for contract
- (b) Authorized by EU/member state law
- (c) Based on explicit consent

**Safeguards (Art. 22(3))**: If exception applies, controller must implement:
- Right to human intervention
- Right to express point of view
- Right to contest decision

### Workflow

#### Step 1: Identify Automated Decisions

**Does the System Make Automated Decisions?**
- [ ] Credit scoring, loan approval
- [ ] Employment candidate screening
- [ ] Insurance premium calculation
- [ ] Targeted advertising (if significant effects)

**Are There Legal or Significant Effects?**
- Legal: Contract denial, termination, legal rights affected
- Significant: Financial impact, employment, access to services

If Yes to both: Art. 22 applies

#### Step 2: Ensure Exception Applies

- [ ] Necessary for contract? (e.g., automated credit check for loan)
- [ ] Explicit consent obtained?
- [ ] Legal authorization?

If no exception: **Automated decision-making prohibited**

#### Step 3: Implement Safeguards

**Human Intervention**:
- User can request human review of automated decision
- Human reviewer has authority to change decision

**Express Point of View**:
- User can submit explanation or context (e.g., "My credit score is low due to medical debt")

**Contest Decision**:
- User can challenge decision
- Provide explanation of decision logic (not full algorithm, but rationale)

#### Step 4: User Request for Human Review

```
Your request for human review has been received.

Automated Decision: [Loan denied / Job application rejected / etc.]
Reason: [Credit score below threshold / Qualifications mismatch / etc.]

Human Review Process:
1. Your request and context will be reviewed by [Role: Credit Analyst / Hiring Manager]
2. You may provide additional information: [Form link]
3. Decision will be reconsidered within 7 days

You will be notified of the review outcome.
```

**Response Time**: Human review within 7 days

### Test Cases

- [ ] Test: User requests human review of automated decision; review conducted within 7 days
- [ ] Test: User can submit additional context (express point of view)
- [ ] Test: Human reviewer has authority to override automated decision
- [ ] Test: User receives explanation of decision logic

## Integration with SDLC

### Requirements Phase

- [ ] Data subject rights requirements in Supplementary Specification (Section 9: Privacy Requirements)
- [ ] API contracts for each right (access, erasure, rectification, etc.)

### Design Phase

- [ ] Architecture diagram shows data subject rights workflows
- [ ] Database schema includes restriction flags, deletion cascades
- [ ] API endpoints designed: `/api/dsr/access`, `/api/dsr/erasure`, etc.

### Implementation Phase

- [ ] Automated APIs implemented (access, erasure, rectification, portability)
- [ ] Self-service user dashboard implemented (preference center)
- [ ] Support runbook created for manual requests

### Testing Phase

- [ ] Functional tests: Each right tested end-to-end
- [ ] Performance tests: 30-day SLA achievable under load
- [ ] Security tests: Identity verification prevents unauthorized requests

### Transition Phase

- [ ] Data subject rights operational before launch (gate criteria)
- [ ] Support team trained
- [ ] Privacy Officer has tools to handle manual requests

## Approval and Maintenance

| Role | Name | Approval | Signature | Date |
|------|------|----------|-----------|------|
| **Privacy Officer** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Engineering Lead** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Support Manager** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Legal Counsel** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |

**Review Schedule**: Annual or upon regulatory guidance update

---

**References**:
- GDPR Articles 12-22: [https://gdpr-info.eu](https://gdpr-info.eu)
- ICO Data Subject Rights Guide: [https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/individual-rights/](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/individual-rights/)
