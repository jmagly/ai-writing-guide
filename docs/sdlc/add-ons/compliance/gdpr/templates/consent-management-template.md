# Consent Management Template

## Document Control

| Field | Value |
|-------|-------|
| Document Type | Consent Management Specification |
| Project Name | `[Project/System Name]` |
| Version | `[e.g., 1.0]` |
| Date | `[YYYY-MM-DD]` |
| Author | `[Privacy Officer, Product Owner]` |
| Reviewers | `[Legal, UX Lead, Engineering Lead]` |
| Status | `[Draft/Approved/Implemented]` |
| Related Documents | Privacy Impact Assessment, Lawful Basis Assessment, Privacy Notice |

## Purpose and Regulatory Basis

### Purpose

This document specifies consent capture, storage, withdrawal, and audit mechanisms to ensure compliance with **GDPR Article 7** and other data protection regulations.

### Regulatory Requirements

**GDPR Article 7 (Conditions for Consent)**:
1. **Art. 7(1)**: Controller must demonstrate data subject has consented
2. **Art. 7(2)**: Request must be clearly distinguishable, intelligible, easily accessible, plain language
3. **Art. 7(3)**: Withdrawal must be **as easy as giving consent**
4. **Art. 7(4)**: Freely given - not bundled with non-essential services

**GDPR Article 4(11)** defines valid consent:
- **Freely given**: Not under coercion, pressure, or bundling
- **Specific**: Separate consent for distinct purposes
- **Informed**: Data subject knows what they're consenting to
- **Unambiguous**: Clear affirmative action (not silence, pre-ticked boxes, inactivity)

**Special Category Data (Art. 9)**: Requires **explicit consent** (higher standard than regular consent)

**Children's Data (Art. 8)**: If child under 16 (or member state threshold), requires parental consent

**ePrivacy Directive**: Non-essential cookies require opt-in consent

## Consent Inventory

### Processing Activities Requiring Consent

| Processing Purpose | Data Categories | Consent Type | Special Category? | Legal Requirement |
|--------------------|-----------------|--------------|-------------------|-------------------|
| `[Marketing emails]` | Email, name, preferences | Standard opt-in | No | GDPR Art. 6(1)(a) |
| `[Behavioral profiling for recommendations]` | Browsing history, purchase history | Standard opt-in | No | GDPR Art. 6(1)(a) |
| `[Health data collection]` | Medical conditions, symptoms | **Explicit consent** | **Yes (Art. 9)** | GDPR Art. 9(2)(a) |
| `[Biometric authentication]` | Fingerprint, facial recognition | **Explicit consent** | **Yes (Art. 9)** | GDPR Art. 9(2)(a) |
| `[Third-party data sharing for advertising]` | Contact info, interests | Standard opt-in | No | GDPR Art. 6(1)(a) |
| `[Non-essential cookies (analytics)]` | Device ID, session data | Cookie consent banner | No | ePrivacy Directive |
| `[Children's account (under 16)]` | Child's name, DOB, usage | **Parental consent** | No | GDPR Art. 8 |

### Consent Granularity (Unbundling)

**GDPR Art. 7(4) Requirement**: Consent must not be bundled with unrelated services.

- [ ] **Service Delivery**: NOT consent-based (lawful basis: contract, Art. 6(1)(b))
- [ ] **Marketing Communications**: Separate opt-in (can decline and still use service)
- [ ] **Profiling/Personalization**: Separate opt-in (can decline and still use service)
- [ ] **Third-Party Sharing**: Separate opt-in for each third party or category
- [ ] **Analytics/Non-Essential Cookies**: Separate opt-in via cookie banner
- [ ] **Research/Secondary Use**: Separate opt-in (cannot bundle with service)

**Invalid Bundling Example**: "By creating an account, you agree to receive marketing emails" ❌
**Valid Unbundling**: "I agree to receive marketing emails [optional checkbox]" ✅

## Consent Capture Mechanisms

### 1. Standard Consent (GDPR Art. 6(1)(a))

#### Requirements

- [ ] Clear affirmative action (checkbox, button click, toggle)
- [ ] **Pre-ticked boxes prohibited** (Art. 7(2))
- [ ] Opt-in, NOT opt-out
- [ ] Separate checkbox for each distinct purpose
- [ ] Privacy notice linked or displayed before consent
- [ ] Language: plain, concise, easily accessible

#### UI Patterns

**Valid Consent UI**:

```
☐ I agree to receive marketing emails about products and offers
   [Learn more about how we use your data](privacy-notice-link)

☐ I agree to share my data with Partner X for personalized recommendations
   [View Partner X's privacy policy](partner-privacy-link)
```

**Invalid Consent UI**:

```
☑ I agree to all terms and conditions (pre-ticked) ❌
☐ I do not want marketing emails (opt-out framing) ❌
```

#### Implementation

- **Form Element**: Unchecked checkbox (default: false)
- **Validation**: Form cannot submit if consent required and checkbox unchecked
- **Timestamp**: Record consent grant timestamp (ISO 8601 UTC)
- **Privacy Notice Version**: Record privacy notice version consented to
- **Consent Text**: Store exact consent wording shown to user

### 2. Explicit Consent (GDPR Art. 9(2)(a) for Special Category Data)

#### Requirements

- [ ] All standard consent requirements PLUS:
- [ ] **Explicit statement** of special category data type (e.g., "health data", "biometric data")
- [ ] Higher level of awareness required
- [ ] Typically requires **typed confirmation** or **separate action**

#### UI Patterns

**Valid Explicit Consent**:

```
Processing of Health Data

This feature requires processing of your sensitive health information (medical conditions, symptoms).

Type "I CONSENT" to confirm you understand and agree:
[____________] (text input)

☐ I explicitly consent to processing of my health data for symptom tracking
```

#### Implementation

- **Form Element**: Text input + confirmation checkbox
- **Validation**: Exact match required (case-insensitive: "I CONSENT")
- **Audit Trail**: Store typed confirmation + checkbox state + timestamp
- **Re-confirmation**: Consider periodic re-confirmation (e.g., annual) for high-risk processing

### 3. Parental Consent (GDPR Art. 8 for Children)

#### Age Verification

- [ ] **Age gate**: Ask date of birth or age before account creation
- [ ] If under threshold (16 in EU, 13 in US under COPPA): trigger parental consent flow

#### Parental Consent Mechanisms

**Option 1: Email Verification**:
1. Child provides parent's email
2. System emails parent consent request
3. Parent clicks consent link with unique token
4. System records parental consent timestamp

**Option 2: Credit Card Verification**:
1. Require parent to provide credit card (small charge, refunded)
2. Verifies parent is adult
3. Record parental authorization

**Option 3: Government ID Verification**:
1. Parent uploads ID or undergoes ID verification
2. Third-party service verifies adult status
3. Record verification result

#### Implementation

- **Child Account Status**: Flag as "pending parental consent"
- **Restricted Functionality**: Limit features until parental consent received
- **Parental Consent Record**: Store parent email, consent timestamp, verification method
- **Withdrawal**: Parent must be able to withdraw consent (not just child)

### 4. Cookie Consent (ePrivacy Directive)

#### Cookie Categories

| Category | Description | Consent Required? | Examples |
|----------|-------------|-------------------|----------|
| **Strictly Necessary** | Essential for service | **No** | Authentication, load balancing, fraud prevention |
| **Functional** | Enhance experience (non-essential) | **Yes** | Language preference, saved cart |
| **Analytics/Performance** | Track usage (non-essential) | **Yes** | Google Analytics, Hotjar, session replay |
| **Marketing/Advertising** | Targeted advertising | **Yes** | Facebook Pixel, Google Ads, retargeting |

#### Cookie Consent Banner Requirements

- [ ] **Opt-in required** for non-essential cookies (no implied consent)
- [ ] Banner appears on first visit
- [ ] Clear options: Accept All, Reject All, Cookie Settings
- [ ] Granular control per category (Functional, Analytics, Marketing)
- [ ] Cookies **not set** until consent given (except strictly necessary)
- [ ] Consent stored in cookie with expiry (typically 12 months)

#### UI Pattern

```
🍪 Cookie Consent

We use cookies to enhance your experience. Strictly necessary cookies are enabled by default.

[Cookie Settings] [Reject All] [Accept All]

Cookie Settings:
☐ Functional Cookies (remember your preferences)
☐ Analytics Cookies (help us improve our site)
☐ Marketing Cookies (personalized ads)

[Save Preferences]
```

#### Implementation

- **Cookie Consent Library**: Use compliant library (e.g., OneTrust, Cookiebot, open-source alternatives)
- **Tag Manager Integration**: Google Tag Manager fires tags only after consent
- **Consent State**: Store consent preferences in first-party cookie
- **Consent Mode**: Google Consent Mode v2 for Google services

## Consent Storage

### Data Model

**Consent Record Schema**:

```json
{
  "consent_id": "CONSENT-12345",
  "user_id": "USER-67890",
  "consent_timestamp": "2025-10-15T14:32:00Z",
  "consent_purpose": "marketing_emails",
  "consent_granted": true,
  "consent_method": "web_form",
  "consent_text_shown": "I agree to receive marketing emails about products and offers",
  "privacy_notice_version": "v2.3",
  "privacy_notice_url": "https://example.com/privacy-v2.3",
  "ip_address": "192.0.2.1",
  "user_agent": "Mozilla/5.0...",
  "withdrawal_timestamp": null,
  "withdrawal_method": null,
  "explicit_consent": false,
  "special_category_data": false,
  "parental_consent": false,
  "parent_email": null
}
```

### Storage Requirements

| Requirement | Specification |
|-------------|---------------|
| **Retention** | Consent records retained as long as processing continues + 3 years (proof of compliance) |
| **Encryption** | Encrypt consent records at rest (AES-256) |
| **Access Control** | Restricted to Privacy Officer, Legal, DPO (audit trail on access) |
| **Backup** | Included in standard encrypted backups |
| **Audit Trail** | Tamper-proof logs of consent grants, changes, withdrawals |
| **Deletion** | Delete consent records after retention period OR on explicit request (GDPR Art. 17 exception applies) |

### Demonstrable Consent (GDPR Art. 7(1))

**Proof of Consent Requirements**:
- [ ] Who consented (user ID, email)
- [ ] When (timestamp with timezone)
- [ ] What they consented to (purpose, exact wording)
- [ ] How they consented (web form, API, mobile app)
- [ ] Privacy notice version at time of consent
- [ ] IP address and user agent (for fraud detection)

**Regulator Inquiry**: Controller must be able to produce consent records on demand.

## Consent Withdrawal

### Regulatory Requirement

**GDPR Art. 7(3)**: "It shall be as easy to withdraw as to give consent."

### Withdrawal Mechanisms

#### 1. Self-Service Withdrawal (Primary Method)

**User Dashboard/Preference Center**:

```
Your Privacy Preferences

Marketing Communications:
☑ Receive marketing emails
   [Withdraw Consent]

Personalized Recommendations:
☑ Share data with partners for personalization
   [Withdraw Consent]

Analytics Cookies:
☑ Allow analytics cookies
   [Withdraw Consent]
```

**Implementation**:
- One-click withdrawal (no confirmation hurdles)
- Immediate effect (cessation of processing within 24 hours)
- Confirmation message: "Your consent has been withdrawn. We will stop [purpose] within 24 hours."

#### 2. Unsubscribe Links (Marketing Emails)

**GDPR + CAN-SPAM Requirement**:
- Every marketing email must include unsubscribe link
- Unsubscribe processed within 24-48 hours
- No login required to unsubscribe (email token-based)

**Unsubscribe Page**:

```
Unsubscribe from Marketing Emails

You have been unsubscribed from marketing emails.

Preference: No longer receive promotional emails.

You will continue to receive:
- Transactional emails (order confirmations, password resets)
- Critical account notifications

[Return to Privacy Preferences] (if logged in)
```

#### 3. Support Request (Fallback)

- Email privacy@example.com or support@example.com
- 30-day response window (GDPR Art. 12(3))
- Verify identity before processing withdrawal
- Manual withdrawal processed by Privacy Officer

### Post-Withdrawal Actions

| Action | Timeline | Owner |
|--------|----------|-------|
| **Stop Processing** | Within 24 hours | Engineering |
| **Update Consent Record** | Immediate | System (automated) |
| **Delete Data (if no other lawful basis)** | Within 30 days (or per retention policy) | Engineering |
| **Notify Processors** | Within 48 hours | Privacy Officer |
| **Suppression List** | Permanent (prevent re-subscription without new consent) | Marketing team |
| **Confirm to User** | Immediate | System (automated email) |

### Consent vs. Contract Distinction

**Critical**: If data processing is based on **contract** (GDPR Art. 6(1)(b)), withdrawal of consent does **not** apply. User must terminate contract to stop processing.

Example:
- **Consent-based**: Marketing emails (can withdraw and keep using service)
- **Contract-based**: Order fulfillment data (cannot withdraw without ending contract)

Privacy notice must clearly distinguish consent-based vs. contract-based processing.

## Consent Refresh and Re-Consent

### Triggers for Re-Consent

- [ ] **Material change** to privacy notice (new purposes, new data types, new recipients)
- [ ] **Material change** to consent terms
- [ ] **Supervisory authority guidance** requires updated consent
- [ ] **Periodic refresh** (optional but recommended: annual for high-risk processing)

### Re-Consent Process

1. **Notify Users**: Email or in-app notification of privacy notice update
2. **Require Re-Consent**: Next login or access requires reviewing updated notice and re-consenting
3. **Grace Period**: Allow 30 days for re-consent before restricting access
4. **Record New Consent**: Store new consent record with updated privacy notice version

### Implied Consent Prohibition

**Invalid**: "We updated our privacy policy. Continued use constitutes consent." ❌

**Valid**: "We updated our privacy policy. Please review and provide consent to continue." ✅

## Consent Audit Trail

### Audit Requirements

| Event | Log Data |
|-------|----------|
| **Consent Granted** | User ID, timestamp, purpose, consent text, privacy notice version, IP, user agent |
| **Consent Modified** | User ID, timestamp, old state, new state, reason |
| **Consent Withdrawn** | User ID, timestamp, withdrawal method |
| **Consent Record Accessed** | Accessor, timestamp, reason (legal inquiry, user request, audit) |
| **Consent Record Deleted** | User ID, deletion timestamp, reason (retention expiry, Art. 17 request) |

### Audit Trail Security

- [ ] **Immutability**: Audit logs tamper-proof (append-only, cryptographic hashing)
- [ ] **Retention**: Audit logs retained longer than consent records (7 years for legal proof)
- [ ] **Access Control**: Limited to DPO, Legal, Privacy Officer
- [ ] **SIEM Integration**: Alerts on unusual consent patterns (mass withdrawals, consent record access spikes)

## Consent Testing and Validation

### Functional Tests

- [ ] Test: User can grant consent (checkbox enables, form submits, record stored)
- [ ] Test: User can withdraw consent (one-click, processing stops within 24h, record updated)
- [ ] Test: Consent withdrawal is as easy as granting (same number of clicks)
- [ ] Test: Pre-ticked boxes prevented (default state always unchecked)
- [ ] Test: Consent granularity enforced (can consent to A but not B)
- [ ] Test: Special category consent requires explicit action
- [ ] Test: Parental consent flow triggers for children
- [ ] Test: Cookie consent banner blocks non-essential cookies until consent
- [ ] Test: Consent record includes all required fields (timestamp, text, privacy notice version)

### Compliance Tests

- [ ] Test: Regulator inquiry simulation (produce consent records for audit)
- [ ] Test: User requests consent proof (export consent history via data subject access request)
- [ ] Test: Privacy notice version mismatch handled (user sees current notice)
- [ ] Test: Consent expiry handled (if applicable - e.g., cookie consent expires after 12 months)

### UX Tests

- [ ] Test: Consent request is clear and understandable (user testing)
- [ ] Test: Privacy notice accessible from consent form
- [ ] Test: Consent withdrawal is discoverable (users can find preference center)
- [ ] Test: Consent fatigue mitigated (not overwhelming number of consent requests)

## Integration with SDLC

### Requirements Phase

- [ ] Consent mechanisms defined in Supplementary Specification (Section 9: Privacy Requirements)
- [ ] Consent purposes mapped to processing activities

### Design Phase

- [ ] UX design for consent forms, preference center, cookie banner
- [ ] Data model designed for consent records
- [ ] API contracts for consent grant, withdrawal, retrieval

### Implementation Phase

- [ ] Consent capture UI implemented
- [ ] Consent storage schema implemented
- [ ] Consent withdrawal mechanisms implemented
- [ ] Audit logging implemented

### Testing Phase

- [ ] Functional and compliance tests executed
- [ ] UX testing conducted
- [ ] Legal review of consent language

### Transition Phase

- [ ] Consent management operational before launch (gate criteria)
- [ ] Support team trained on consent withdrawal handling

## Approval and Maintenance

| Role | Name | Approval | Signature | Date |
|------|------|----------|-----------|------|
| **Privacy Officer** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Legal Counsel** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Data Protection Officer** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Product Owner** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |

**Review Schedule**: Annual or upon material change to processing

---

**References**:
- GDPR Article 7: [https://gdpr-info.eu/art-7-gdpr/](https://gdpr-info.eu/art-7-gdpr/)
- EDPB Guidelines on Consent (05/2020): [https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en](https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en)
- ICO Consent Guidance: [https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/consent/](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/consent/)
