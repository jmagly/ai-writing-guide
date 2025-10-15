# Data Retention and Deletion Policy Template

## Document Control

| Field | Value |
|-------|-------|
| Document Type | Data Retention and Deletion Policy |
| Organization | `[Organization Name]` |
| Version | `[e.g., 1.0]` |
| Effective Date | `[YYYY-MM-DD]` |
| Author | `[Privacy Officer, Data Protection Officer]` |
| Reviewers | `[Legal, Compliance, IT, Records Manager]` |
| Status | `[Draft/Approved/Implemented]` |
| Next Review Date | `[YYYY-MM-DD]` (annual review minimum) |
| Related Documents | DPIA, Data Classification, Lawful Basis Assessment |

## Purpose and Regulatory Basis

### Purpose

This policy defines retention periods and deletion procedures for personal data to ensure compliance with **GDPR Article 5(1)(e) - Storage Limitation Principle** and other data protection regulations.

### Regulatory Requirements

**GDPR Article 5(1)(e)**: Personal data shall be "kept in a form which permits identification of data subjects for no longer than is necessary for the purposes for which the personal data are processed."

**GDPR Article 17**: Data subjects have right to erasure when data is no longer necessary for purposes.

**GDPR Article 30**: Controller must document retention periods in Record of Processing Activities.

**Other Regulations**:
- **Tax/Accounting Laws**: Financial records often require 7-year retention
- **Legal Hold**: Litigation or investigation may suspend deletion
- **Industry-Specific**: Healthcare (HIPAA), finance (SOX, GLBA) may mandate retention periods

## Retention Principles

1. **Minimum Necessary**: Retain data only as long as necessary for lawful purpose
2. **Purpose-Driven**: Retention tied to specific processing purpose and lawful basis
3. **Defensible**: Retention periods justified by business, legal, or regulatory requirement
4. **Documented**: All retention decisions documented with justification
5. **Automated**: Deletion automated where possible (manual review for exceptions)
6. **Auditable**: Deletion activities logged and verifiable

## Retention Schedule Matrix

### Personal Data Retention Schedule

| Data Category | Data Examples | Lawful Basis | Purpose | Retention Period | Deletion Trigger | Legal/Business Justification |
|---------------|---------------|--------------|---------|------------------|------------------|------------------------------|
| **Account Data** | Name, email, phone, address, account settings | Contract | Service delivery, account management | Account lifetime + 30 days | Account deletion request OR 30 days after account termination | Grace period for account recovery; business need |
| **Authentication Data** | Password hashes, MFA tokens, session tokens | Contract | Security, access control | Active use only | Immediate on password change/logout | Security best practice; no retention need |
| **Transaction Data** | Purchase history, invoices, payment confirmations | Contract, Legal Obligation | Contract fulfillment, tax compliance | **7 years** | 7 years from transaction date | Tax law (IRS, EU VAT); accounting standards |
| **Payment Card Data (PAN)** | Credit card numbers (if stored) | Contract | Payment processing | **Tokenize immediately** (do not store) | Immediate tokenization or deletion | PCI DSS requirement; security |
| **Marketing/Consent Data** | Email opt-ins, marketing preferences, communication history | Consent | Direct marketing | Until consent withdrawn + 90 days | Consent withdrawal | GDPR Art. 7 (consent withdrawable); 90-day backup purge |
| **Behavioral/Analytics Data** | Page views, clickstream, device fingerprint, session replays | Legitimate Interest or Consent | Product improvement, UX research | **90 days** (active logs) OR anonymized (indefinite) | 90 days from collection OR anonymization | Business need for recent data; anonymized data not personal data |
| **Support Tickets** | Customer inquiries, support interactions, chat logs | Contract, Legitimate Interest | Customer support, quality improvement | **3 years** OR anonymized | 3 years from ticket closure OR anonymization | Business need (trend analysis); anonymized for training |
| **User-Generated Content** | Posts, comments, reviews, uploads | Contract | Platform functionality | Content lifetime OR until user deletion request | User deletion request OR account termination | Service delivery; user expectation of persistence |
| **Logs (Access, Security, Audit)** | Access logs, security events, audit trails | Legitimate Interest, Legal Obligation | Security monitoring, compliance, forensics | **1 year** (active) / **7 years** (compliance audit logs) | Rolling deletion (1 year) OR 7 years for audit logs | Security incident investigation; compliance proof |
| **Backups** | All data categories | Various | Disaster recovery, business continuity | **90 days** from backup creation | 90-day rolling deletion | Recovery window balance; GDPR deletion within reasonable time |
| **Employee Data** | HR records, performance reviews, payroll | Contract, Legal Obligation | Employment management, tax, legal | Employment + **7 years** (varies by jurisdiction) | 7 years after termination | Labor law, tax law, discrimination claims statute of limitations |
| **Children's Data (under 16)** | Any data from children | Consent (parental) | Service delivery (with parental consent) | **Minimize retention**; delete when no longer necessary or at age 18 | Purpose fulfilled OR age 18 | GDPR Art. 8; enhanced protection for children |
| **Special Category Data** | Health, biometric, genetic, racial/ethnic origin, etc. | Explicit Consent or Art. 9(2) exception | Specific purpose (health tracking, biometric auth, etc.) | **Minimum necessary**; delete as soon as purpose fulfilled | Purpose fulfilled OR consent withdrawn | GDPR Art. 9; heightened risk requires minimal retention |
| **Legal Hold Data** | Any data subject to litigation or investigation | Legal Obligation | Legal claims, regulatory investigation | **Hold duration** (until claim resolved or investigation closed) | Legal hold lifted | Legal requirement; duty to preserve evidence |

### Cookie Retention Schedule

| Cookie Type | Purpose | Lawful Basis | Retention Period | Deletion Trigger |
|-------------|---------|--------------|------------------|------------------|
| **Strictly Necessary** | Authentication, security, load balancing | Contract, Legitimate Interest | Session (temporary) OR 30 days (persistent) | Session end OR 30 days |
| **Functional** | Language preference, user settings | Consent | 1 year | Consent withdrawal OR 1 year |
| **Analytics** | Google Analytics, usage tracking | Consent | 2 years (Google default) OR 14 months (privacy-friendly) | Consent withdrawal OR expiry |
| **Marketing/Advertising** | Retargeting, ad personalization | Consent | 90 days (typical) | Consent withdrawal OR 90 days |

## Deletion Methods

### Technical Deletion Approaches

| Method | Description | Data Types | Verification | GDPR Compliant? |
|--------|-------------|------------|--------------|-----------------|
| **Logical Delete (Soft Delete)** | Mark record as deleted (flag: `deleted=true`); data remains in database | Temporary deletion (e.g., 30-day account recovery period) | Query for `deleted=true` records | **Only if followed by hard delete** within reasonable time (e.g., 30-90 days) |
| **Hard Delete (Physical Delete)** | Permanently remove record from database (`DELETE FROM table WHERE user_id=X`) | All active data | Query confirms no results | **Yes** - data no longer exists |
| **Cryptographic Erasure** | Delete encryption keys; data becomes unreadable without keys | Encrypted data at rest | Attempt to decrypt (should fail) | **Yes** - equivalent to deletion per GDPR guidance |
| **Anonymization** | Remove identifiers; data no longer attributable to individual | Analytics, research data | Re-identification test (should not identify individuals) | **Yes** - anonymized data not personal data (GDPR Recital 26) |
| **Pseudonymization** | Replace identifiers with pseudonyms; reversible with key table | Analytics (retained for legitimate interest) | Identifiers replaced; key table separate | **Partial** - still personal data but reduced risk (GDPR Art. 4(5)) |
| **Overwrite (DoD 5220.22-M or similar)** | Overwrite data with random bits (multiple passes) | Physical media, highly sensitive data | Verification scan | **Yes** - data irretrievably destroyed |
| **Physical Destruction** | Shred paper, degauss/destroy hard drives | Physical records, decommissioned hardware | Certificate of destruction | **Yes** |

### Deletion Priorities by Data Classification

| Data Classification | Deletion Method | Verification | Timeline |
|---------------------|-----------------|--------------|----------|
| **Public** | Standard deletion | None required | No urgency |
| **Internal** | Standard deletion | Query verification | 30 days |
| **Confidential** | Hard delete OR cryptographic erasure | Query + audit log | 30 days |
| **Restricted (PII, PHI, credentials)** | Hard delete + overwrite (if highly sensitive) OR cryptographic erasure | Query + forensic verification + audit trail | **7-14 days** (high priority) |

## Deletion Procedures

### Automated Deletion

**Scheduled Jobs**:
- **Daily**: Delete expired session tokens, temporary files
- **Weekly**: Purge soft-deleted accounts (>30 days since deletion request)
- **Monthly**: Anonymize old analytics data (>90 days); delete old logs (>1 year)
- **Quarterly**: Purge old backups (>90 days)

**Job Execution**:
1. Query for records meeting deletion criteria (e.g., `created_at < NOW() - INTERVAL '90 days'`)
2. Log records to be deleted (audit trail)
3. Execute deletion (hard delete or anonymization)
4. Verify deletion (query confirms no results)
5. Log completion and record count

**Example SQL (Automated Deletion)**:
```sql
-- Delete old analytics data (pseudonymize)
UPDATE analytics_events
SET user_id = NULL, ip_address = NULL
WHERE event_timestamp < NOW() - INTERVAL '90 days';

-- Delete old logs
DELETE FROM access_logs
WHERE log_timestamp < NOW() - INTERVAL '1 year';
```

### Manual Deletion (Data Subject Requests)

See **Data Subject Rights Workflow Template** (Art. 17 - Right to Erasure).

### Backup Deletion

**Challenge**: Backups are point-in-time snapshots; cannot selectively delete individual records from backup.

**Approach**:
1. **Flag for Purge**: Mark deleted users in "deletion queue" table
2. **Rolling Deletion**: As backups age out (90 days), deleted user data purges
3. **Immediate Backup Exclusion**: Exclude flagged users from new backups
4. **Cryptographic Erasure**: If user data encrypted with per-user key, delete key (data unreadable in backups)

**Timeline**: Deleted data fully purged from backups within **90 days** (acceptable under GDPR per ICO guidance).

### Cross-System Deletion

**Challenge**: Data may exist in multiple systems (CRM, database, analytics, processors).

**Approach**:
1. **Data Mapping**: Document all systems containing personal data (DPIA Section 1.7)
2. **Deletion Orchestration**: API or script triggers deletion across all systems
3. **Processor Notification**: Email processors with deletion instruction (per DPA Art. 28(3)(g))
4. **Verification**: Confirm deletion from each system; log confirmations

**Example Systems**:
- [ ] User database (PostgreSQL)
- [ ] CRM (Salesforce)
- [ ] Marketing platform (Mailchimp)
- [ ] Analytics (Google Analytics - user ID deletion)
- [ ] Support (Zendesk - ticket anonymization)
- [ ] Payment processor (Stripe - customer object deletion)
- [ ] Cloud storage (AWS S3 - user files deletion)

## Retention Exceptions

### Legal Hold

**Trigger**: Litigation, regulatory investigation, audit, or reasonable anticipation of legal claim.

**Effect**: Suspend deletion for affected data until hold lifted.

**Process**:
1. **Legal Counsel Issues Hold**: Specify data scope (e.g., "All data related to Project X from 2023-2024")
2. **IT Implements Hold**: Flag affected records; suspend automated deletion
3. **Monitor Hold**: Periodic review (quarterly) - is hold still necessary?
4. **Lift Hold**: Legal counsel authorizes; resume normal retention schedule

**Documentation**: Maintain legal hold register with hold date, scope, reason, lift date.

### Extended Retention Requests

**Scenario**: Business unit requests extended retention beyond policy (e.g., "Keep customer data 10 years for trend analysis").

**Approval Process**:
1. Business unit justifies need (business case, regulatory requirement)
2. Privacy Officer assesses GDPR compliance (storage limitation, data minimization)
3. Legal approves if defensible
4. Exception documented with expiry date

**Rejection Criteria**: Request violates GDPR principles (excessive retention, no valid purpose, data subject rights not respected).

## Anonymization vs. Pseudonymization

### Anonymization (Data Ceases to be Personal Data)

**GDPR Recital 26**: Anonymized data is not personal data; GDPR does not apply.

**Requirements**:
- **Irreversible**: Cannot re-identify individuals (even with additional data)
- **No Direct Identifiers**: Remove name, email, SSN, etc.
- **No Indirect Identifiers**: Remove quasi-identifiers (DOB + ZIP + gender can re-identify)
- **No Singling Out**: Cannot isolate individual in dataset
- **No Linkability**: Cannot link records across datasets
- **No Inference**: Cannot infer attributes about individual

**Techniques**:
- Aggregation (e.g., "Users aged 25-34" instead of individual ages)
- Noise addition (differential privacy)
- Generalization (e.g., "New York" instead of specific ZIP code)

**Use Case**: Indefinite retention for research, statistics, product improvement (GDPR does not apply to anonymized data).

### Pseudonymization (Data Remains Personal Data)

**GDPR Art. 4(5)**: Pseudonymization replaces identifiers with pseudonyms; data still personal data but reduced risk.

**Technique**: Replace user ID with random ID; keep mapping table separate.

**Use Case**: Analytics, logs (legitimate interest); reduced risk if breach occurs.

**Retention**: Subject to same retention limits as identified data (but risk-mitigated).

## Compliance and Audit

### Demonstrable Compliance (GDPR Art. 5(2))

**Controller must demonstrate**:
- [ ] Retention periods defined and justified
- [ ] Automated deletion mechanisms operational
- [ ] Deletion logs maintained (audit trail)
- [ ] Data subject deletion requests fulfilled (30-day SLA)
- [ ] Legal holds managed and documented

### Audit Trail

**Log for Each Deletion**:
- Deletion timestamp
- Data subject ID or record ID
- Data category deleted
- Deletion method (hard delete, anonymization, etc.)
- Reason (automated schedule, user request, legal obligation)
- Executor (system job, Privacy Officer, support agent)

**Audit Trail Retention**: 7 years (longer than data retention to prove compliance).

### Periodic Reviews

**Quarterly**:
- [ ] Review automated deletion job logs (verify jobs running)
- [ ] Spot-check deleted records (query confirms deletion)
- [ ] Review legal holds (can any be lifted?)

**Annually**:
- [ ] Review retention schedule (still aligned with purposes?)
- [ ] Update justifications (new laws, business changes)
- [ ] Test backup purge (deleted data purged from old backups?)
- [ ] Audit processors (confirm they delete per DPA)

## Roles and Responsibilities

| Role | Responsibilities |
|------|------------------|
| **Privacy Officer** | Define retention policy, approve exceptions, audit compliance |
| **Data Protection Officer (DPO)** | Review policy for GDPR compliance, approve high-risk retention |
| **Legal Counsel** | Issue and lift legal holds, approve retention justifications |
| **IT/Engineering** | Implement automated deletion jobs, execute manual deletions, maintain audit logs |
| **Data Owners (Business Units)** | Justify retention needs, request exceptions, ensure compliance in their domain |
| **Records Manager** | Maintain retention schedule, coordinate physical records destruction |

## Training and Awareness

**Annual Training** (all employees):
- Data retention principles
- Legal hold obligations (do not delete data under hold)
- Data subject deletion requests (escalate to Privacy Officer)

**Role-Specific Training**:
- **Developers**: Implement deletion logic, automated jobs
- **Support**: Handle deletion requests, verify identity
- **Legal**: Manage legal holds

## Policy Review and Updates

**Review Frequency**: Annual or upon:
- Regulatory change (new law, supervisory authority guidance)
- Business model change (new data types, new purposes)
- Technology change (new systems, new processors)
- Audit finding or data breach

**Update Process**:
1. Privacy Officer proposes updates
2. Legal and DPO review
3. Stakeholders approve
4. Policy published (effective date)
5. Training updated

## Approval and Sign-Off

| Role | Name | Approval | Signature | Date |
|------|------|----------|-----------|------|
| **Privacy Officer** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Data Protection Officer** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Legal Counsel** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **CIO/CTO** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |

---

**References**:
- GDPR Article 5(1)(e): [https://gdpr-info.eu/art-5-gdpr/](https://gdpr-info.eu/art-5-gdpr/)
- ICO Retention and Disposal Guidance: [https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/principles/storage-limitation/](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/principles/storage-limitation/)
