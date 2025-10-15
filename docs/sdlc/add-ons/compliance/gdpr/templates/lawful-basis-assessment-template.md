# Lawful Basis Assessment Template

## Document Control

| Field | Value |
|-------|-------|
| Document Type | Lawful Basis Assessment |
| Project Name | `[Project/System Name]` |
| Version | `[e.g., 1.0]` |
| Assessment Date | `[YYYY-MM-DD]` |
| Author | `[Privacy Officer, Data Protection Officer]` |
| Reviewers | `[Legal Counsel, Product Owner]` |
| Status | `[Draft/Approved]` |
| Related Documents | Privacy Impact Assessment (DPIA), Data Classification, Consent Management |

## Purpose and Regulatory Basis

### Purpose

This document identifies and justifies the lawful basis for each personal data processing activity under **GDPR Article 6** and, where applicable, **Article 9** (special category data).

### Regulatory Requirement

**GDPR Article 6(1)**: Processing is lawful only if and to the extent that at least one of the following applies:

1. **Art. 6(1)(a) - Consent**: Data subject has given consent for specific purpose(s)
2. **Art. 6(1)(b) - Contract**: Processing necessary for contract performance or pre-contractual steps
3. **Art. 6(1)(c) - Legal Obligation**: Processing necessary to comply with legal obligation
4. **Art. 6(1)(d) - Vital Interests**: Processing necessary to protect vital interests (life-or-death situations)
5. **Art. 6(1)(e) - Public Task**: Processing necessary for public interest or official authority task
6. **Art. 6(1)(f) - Legitimate Interest**: Processing necessary for legitimate interests (controller or third party), except where overridden by data subject interests/rights

**GDPR Article 5(2) - Accountability**: Controller must be able to **demonstrate compliance** with lawful basis selection.

**GDPR Article 9** (Special Category Data): Requires additional condition beyond Art. 6 lawful basis.

## Processing Activities Inventory

### Activity 1: `[e.g., User Account Creation and Management]`

| Attribute | Value |
|-----------|-------|
| **Processing Description** | Collect and store user identification data (name, email, password) to create and manage user accounts |
| **Data Categories** | Name, email address, password (hashed), account creation date, last login |
| **Data Classification** | Restricted (PII) |
| **Data Subjects** | Customers, registered users |
| **Processing Purpose** | Account creation, authentication, account management, customer support |
| **Data Volume** | `[e.g., 100,000 users]` |
| **Special Category Data?** | No |
| **Children's Data?** | `[Yes/No - If yes, see Art. 8 section below]` |

#### Lawful Basis Selection

**Selected Lawful Basis**: **Contract (Art. 6(1)(b))**

**Justification**: Processing is necessary for performing the contract between the controller and data subject (Terms of Service). User account is essential to deliver the service.

**Alternative Bases Considered**:
- Consent (Art. 6(1)(a)): Rejected - contract is more appropriate; consent can be withdrawn but contract obligations remain
- Legitimate Interest (Art. 6(1)(f)): Rejected - contract is more specific and appropriate lawful basis

**Necessity Test**: Can the service be provided without this data? **No** - account data is essential for service delivery.

---

### Activity 2: `[e.g., Marketing Email Campaigns]`

| Attribute | Value |
|-----------|-------|
| **Processing Description** | Send promotional emails about products, offers, and company news |
| **Data Categories** | Email address, name, marketing preferences, email open/click data |
| **Data Classification** | Confidential |
| **Data Subjects** | Customers, newsletter subscribers |
| **Processing Purpose** | Direct marketing, customer engagement |
| **Data Volume** | `[e.g., 50,000 subscribed users]` |
| **Special Category Data?** | No |
| **Children's Data?** | No |

#### Lawful Basis Selection

**Selected Lawful Basis**: **Consent (Art. 6(1)(a))**

**Justification**: Marketing is not necessary for contract performance. Data subject must opt-in to receive marketing communications.

**Consent Requirements** (GDPR Art. 7):
- [ ] Freely given (not bundled with service access)
- [ ] Specific (separate consent for marketing vs. service delivery)
- [ ] Informed (privacy notice explains marketing use)
- [ ] Unambiguous (opt-in checkbox, not pre-ticked)
- [ ] Withdrawable (unsubscribe link in every email, as easy as consenting)

See **Consent Management Template** for implementation details.

---

### Activity 3: `[e.g., Fraud Detection and Prevention]`

| Attribute | Value |
|-----------|-------|
| **Processing Description** | Analyze transaction patterns, device fingerprints, and user behavior to detect fraudulent activity |
| **Data Categories** | IP address, device ID, transaction history, behavioral patterns, risk scores |
| **Data Classification** | Confidential |
| **Data Subjects** | All users (customers, visitors) |
| **Processing Purpose** | Fraud prevention, security, financial loss prevention |
| **Data Volume** | All users (100,000+) |
| **Special Category Data?** | No |
| **Children's Data?** | Incidental (children's accounts monitored for fraud like any user) |

#### Lawful Basis Selection

**Selected Lawful Basis**: **Legitimate Interest (Art. 6(1)(f))**

**Justification**: Fraud detection is necessary for legitimate interests of controller (protect business) and data subjects (protect their accounts).

**Legitimate Interest Assessment (LIA)** required - see Section below.

**Alternative Bases Considered**:
- Consent (Art. 6(1)(a)): Rejected - fraud detection ineffective if users can opt out; fraudsters would opt out
- Contract (Art. 6(1)(b)): Possible but legitimate interest is more appropriate for secondary security purpose

---

### Activity 4: `[e.g., Health Data Collection for Symptom Tracker]`

| Attribute | Value |
|-----------|-------|
| **Processing Description** | Collect and analyze health symptoms, medical conditions, and treatment data for health tracking app |
| **Data Categories** | Medical conditions, symptoms, medications, vital signs, doctor's notes |
| **Data Classification** | Restricted (PHI/Special Category Data) |
| **Data Subjects** | App users (patients) |
| **Processing Purpose** | Health tracking, symptom analysis, treatment recommendations |
| **Data Volume** | `[e.g., 10,000 users]` |
| **Special Category Data?** | **Yes (GDPR Art. 9 - Health Data)** |
| **Children's Data?** | `[Yes/No]` |

#### Lawful Basis Selection (Art. 6)

**Selected Lawful Basis**: **Consent (Art. 6(1)(a))**

**Justification**: Health tracking is not necessary for contract (service is optional feature). Users must opt-in.

#### Special Category Data Basis (Art. 9)

**GDPR Article 9(1)**: Processing of special category data is **prohibited** unless one of Art. 9(2) exceptions applies.

**Selected Art. 9(2) Exception**: **Explicit Consent (Art. 9(2)(a))**

**Explicit Consent Requirements**:
- [ ] All Art. 7 consent requirements (freely given, specific, informed, unambiguous, withdrawable)
- [ ] **PLUS explicit statement** of special category data type ("health data", "medical conditions")
- [ ] Higher standard of awareness (e.g., typed confirmation: "I CONSENT to processing of my health data")

**Alternative Art. 9(2) Exceptions Considered**:
- Art. 9(2)(h) - Health/social care: Rejected - not provided by health professional
- Art. 9(2)(j) - Research/statistics: Not applicable - primary purpose is individual health tracking

**Children's Health Data**: If applicable, requires **both** parental consent (Art. 8) **and** explicit consent for special category data (Art. 9(2)(a)).

---

## Lawful Basis Summary Table

| Processing Activity | Art. 6 Lawful Basis | Art. 9 Basis (if applicable) | Consent Required? | LIA Required? |
|---------------------|---------------------|------------------------------|-------------------|---------------|
| Account Creation | Contract (Art. 6(1)(b)) | N/A | No | No |
| Marketing Emails | Consent (Art. 6(1)(a)) | N/A | **Yes** | No |
| Fraud Detection | Legitimate Interest (Art. 6(1)(f)) | N/A | No | **Yes** |
| Health Data Collection | Consent (Art. 6(1)(a)) | Explicit Consent (Art. 9(2)(a)) | **Yes (Explicit)** | No |
| `[Additional activity]` | `[Basis]` | `[If applicable]` | `[Yes/No]` | `[Yes/No]` |

## Legitimate Interest Assessment (LIA)

**When Required**: If **any** processing activity uses **Legitimate Interest (Art. 6(1)(f))** as lawful basis.

### LIA for: `[Fraud Detection and Prevention]`

#### 1. Purpose Test: What is the legitimate interest?

**Legitimate Interest**: Protect the business and users from fraud, financial loss, and account takeovers.

**Beneficiaries**:
- Controller (business): Prevent financial losses, protect reputation
- Data Subjects: Protect their accounts and personal data from fraudsters
- Third parties: Reduce fraud ecosystem harm

**Specificity**: Interest is specific and well-defined (not vague "business purposes").

#### 2. Necessity Test: Is processing necessary for this interest?

**Why Processing is Necessary**: Fraud detection requires analyzing behavioral patterns, device fingerprints, and transaction anomalies. Cannot effectively detect fraud without this processing.

**Alternatives Considered**:
- Manual review only: Rejected - too slow, misses patterns
- Less data collection: Rejected - reduces detection accuracy, increases false negatives
- Different technologies: Considered rule-based only (rejected - ML improves detection)

**Conclusion**: Processing is **necessary** to achieve fraud prevention interest. Less intrusive alternatives are not effective.

#### 3. Balancing Test: Do data subject interests override legitimate interest?

**Data Subject Interests and Rights**:
- Right to privacy and data protection
- Expectation of minimal surveillance
- Risk of false positives (legitimate users flagged as fraudulent)

**Balancing Factors**:
- **Data Sensitivity**: Moderate (behavioral data, not special category data)
- **Transparency**: Users informed via privacy notice that fraud detection occurs
- **Safeguards**: False positives reviewed by humans; users can contest decisions
- **Data Minimization**: Collect only data necessary for fraud detection; no excessive profiling
- **Impact on Data Subjects**: Low - processing protects users; minimal intrusion

**Balancing Conclusion**: Legitimate interest **does not** override data subject interests because:
1. Processing protects data subjects (fraud prevention benefits users)
2. Transparency provided (privacy notice discloses fraud detection)
3. Safeguards implemented (human review, contestability)
4. Data minimized (only fraud-relevant data)

**Legitimate Interest Justified**: **Yes**

#### 4. Safeguards and Mitigations

- [ ] Transparency: Privacy notice explains fraud detection processing
- [ ] Data Minimization: Collect only fraud-relevant data (no excessive profiling)
- [ ] Human Review: False positives reviewed by support team
- [ ] Contestability: Users can challenge fraud flags
- [ ] Retention Limits: Fraud data retained only as long as necessary (e.g., 90 days for logs)
- [ ] Access Controls: Fraud detection data restricted to security team
- [ ] No Automated Decision-Making with Legal Effects: Account suspensions reviewed by humans

---

## Special Considerations

### Children's Data (GDPR Art. 8)

**Age Threshold**: 16 (or lower threshold set by member state, minimum 13)

If processing involves children:

| Attribute | Value |
|-----------|-------|
| **Age Verification Method** | `[Date of birth gate, age declaration, age estimation]` |
| **Parental Consent Mechanism** | `[Email verification, credit card verification, ID verification]` |
| **Parental Withdrawal Rights** | `[Parent can withdraw consent on behalf of child]` |
| **Child-Appropriate Privacy Notice** | `[Plain language, age-appropriate explanations]` |

**Special Category Data for Children**: Requires **both** parental consent (Art. 8) **and** explicit consent for special category data (Art. 9(2)(a)). Higher scrutiny in DPIA.

### Special Category Data (GDPR Art. 9)

If processing involves special category data (health, biometric, genetic, racial/ethnic origin, political opinions, religious beliefs, trade union membership, sex life/sexual orientation):

**GDPR Art. 9(2) Exceptions** (check all that apply):

- [ ] **(a) Explicit consent** (most common for voluntary processing)
- [ ] **(b) Employment, social security, social protection law** (employment/HR context)
- [ ] **(c) Vital interests** (life-or-death, data subject unable to consent)
- [ ] **(d) Legitimate activities of foundation, association, etc.** (non-profit, members-only)
- [ ] **(e) Data manifestly made public by data subject**
- [ ] **(f) Legal claims or judicial acts**
- [ ] **(g) Substantial public interest** (with basis in EU/member state law)
- [ ] **(h) Health or social care** (by health professional or equivalent)
- [ ] **(i) Public health** (official authority)
- [ ] **(j) Archiving, research, statistics** (with safeguards, public interest)

**Selected Exception**: `[e.g., Art. 9(2)(a) - Explicit Consent]`

**Justification**: `[Why this exception applies; why others do not]`

### Criminal Convictions Data (GDPR Art. 10)

If processing involves criminal convictions or offenses data:

**GDPR Art. 10**: Processing only allowed under control of official authority OR authorized by EU/member state law with appropriate safeguards.

| Attribute | Value |
|-----------|-------|
| **Official Authority Control?** | `[Yes/No]` |
| **Legal Authorization** | `[Cite specific law or regulation]` |
| **Safeguards** | `[Access controls, encryption, audit logging, oversight]` |

## Lawful Basis Change Management

### When Lawful Basis Can Change

- [ ] Initial assessment was incorrect (discovered during implementation)
- [ ] Business model changes (e.g., service becomes free, funded by ads → consent now required)
- [ ] Regulatory guidance clarifies appropriate basis

### Change Process

1. **Assess Impact**: Can new lawful basis be applied retroactively? (Generally no for consent)
2. **Obtain New Basis**: If consent required, obtain consent from existing users
3. **Grace Period**: Provide reasonable time (30-90 days) for users to consent
4. **Deletion**: If user does not consent and no other lawful basis applies, delete data
5. **Update Privacy Notice**: Communicate lawful basis change
6. **Update DPIA**: Reflect lawful basis change in DPIA

**Cannot Switch from Consent to Legitimate Interest**: EDPB guidance prohibits switching from consent to legitimate interest post-facto to avoid withdrawal obligations.

## Documentation and Accountability (GDPR Art. 5(2))

### Record of Processing Activities (GDPR Art. 30)

For each processing activity, document:

- [ ] Name and contact details of controller (and DPO if applicable)
- [ ] Purposes of processing
- [ ] Categories of data subjects and personal data
- [ ] **Lawful basis for processing** (this assessment)
- [ ] Categories of recipients
- [ ] International transfers (if applicable)
- [ ] Retention periods
- [ ] Security measures

This Lawful Basis Assessment fulfills the lawful basis documentation requirement for Art. 30.

### Audit and Review

- **Review Frequency**: Annual OR upon material change to processing
- **Review Triggers**: New processing activities, business model change, regulatory guidance update, DPIA finding
- **Review Owner**: Privacy Officer

## Approval and Sign-Off

| Role | Name | Approval | Signature | Date |
|------|------|----------|-----------|------|
| **Privacy Officer** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Legal Counsel** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Data Protection Officer** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Product Owner** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |

---

**Version History**:

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | `[Date]` | Initial assessment | `[Privacy Officer]` |
| 1.1 | `[Date]` | Added fraud detection LIA | `[Privacy Officer]` |

---

**References**:
- GDPR Article 6: [https://gdpr-info.eu/art-6-gdpr/](https://gdpr-info.eu/art-6-gdpr/)
- GDPR Article 9: [https://gdpr-info.eu/art-9-gdpr/](https://gdpr-info.eu/art-9-gdpr/)
- ICO Lawful Basis Guide: [https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/lawful-basis-for-processing/](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/lawful-basis-for-processing/)
- EDPB Guidelines on Legitimate Interest: [https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22019-processing-personal-data-under-article-61b_en](https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22019-processing-personal-data-under-article-61b_en)
