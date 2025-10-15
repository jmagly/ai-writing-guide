# Breach Notification Plan Template

## Document Control

| Field | Value |
|-------|-------|
| Document Type | Personal Data Breach Notification Plan |
| Organization | `[Organization Name]` |
| Version | `[e.g., 1.0]` |
| Effective Date | `[YYYY-MM-DD]` |
| Author | `[Data Protection Officer, Security Officer, Privacy Officer]` |
| Reviewers | `[Legal, IT, Communications, Executive]` |
| Status | `[Draft/Approved/Tested]` |
| Next Test Date | `[YYYY-MM-DD]` (tabletop exercise annually) |
| Related Documents | Incident Response Plan, DPIA, Security Policy |

## Purpose and Regulatory Basis

### Purpose

This plan defines procedures for detecting, assessing, containing, and notifying relevant parties of **personal data breaches** in compliance with **GDPR Articles 33-34** and other data protection regulations.

### Regulatory Requirements

**GDPR Article 33(1)**: Controller must notify supervisory authority of breach **within 72 hours** of becoming aware, unless breach unlikely to result in risk to rights and freedoms of data subjects.

**GDPR Article 34(1)**: Controller must notify data subjects **without undue delay** if breach likely to result in **high risk** to rights and freedoms.

**GDPR Article 33(5)**: Controller must document all breaches (even if not notified), including facts, effects, and remedial action.

**Other Regulations**:
- **CCPA**: 72-hour notification to California Attorney General if breach affects 500+ California residents
- **HIPAA**: 60-day notification to HHS and affected individuals if PHI breach affects 500+ individuals
- **PCI DSS**: Payment card breach requires immediate notification to card brands and acquiring bank

## 1. Breach Definition

### What is a Personal Data Breach?

**GDPR Article 4(12)**: "A breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to, personal data transmitted, stored or otherwise processed."

### Breach Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Confidentiality Breach** | Unauthorized access or disclosure | Hacking, phishing, data exfiltration, accidental email to wrong recipient, lost laptop |
| **Integrity Breach** | Unauthorized alteration | Ransomware, malware corruption, unauthorized data modification, system compromise |
| **Availability Breach** | Loss of access or data destruction | Ransomware, DDoS, accidental deletion, hardware failure, natural disaster |

### Not Every Security Incident is a Personal Data Breach

**Breach**: Unauthorized access to customer database (personal data compromised)

**Not Breach**: Failed login attempts blocked by authentication system (no personal data compromised)

**Uncertain**: Suspected breach requires investigation to determine if personal data was actually accessed/compromised.

## 2. Breach Detection

### Detection Methods

- [ ] **Intrusion Detection System (IDS)**: Alerts on suspicious network activity
- [ ] **SIEM (Security Information and Event Management)**: Correlates logs to detect anomalies
- [ ] **Data Loss Prevention (DLP)**: Detects and blocks unauthorized data exfiltration
- [ ] **Access Logs Review**: Periodic review of unusual access patterns
- [ ] **Vulnerability Scans**: Identifies exploitable weaknesses before attackers
- [ ] **Penetration Testing**: Simulates attacks to find security gaps
- [ ] **User Reports**: Employees, customers, or third parties report suspected breach
- [ ] **Processor Notification**: Data processor notifies controller of breach (Art. 28(3)(f))
- [ ] **Supervisory Authority Alert**: Authority informs controller of breach
- [ ] **Media/Public Reports**: Breach discovered via news or social media

### Indicators of Potential Breach

- Unusual access patterns (e.g., access from unfamiliar location, mass data export)
- System anomalies (e.g., unexpected system slowdown, strange processes)
- Alerts from security tools (IDS, antivirus, DLP)
- Missing or corrupted data
- Ransom notes (ransomware attack)
- User complaints (e.g., "I received a strange email", "My account was accessed by someone else")
- Unauthorized system changes (e.g., new user accounts, changed permissions)

### First Responders

When potential breach detected, notify immediately:
- **Security Team**: `[Email/Phone]`
- **Data Protection Officer (DPO)**: `[Email/Phone]`
- **Incident Response Lead**: `[Name/Phone]`

## 3. Breach Response Workflow

### Phase 1: Detection and Initial Assessment (Hour 0-1)

#### Step 1: Detect and Report

**Who**: Any employee, automated system, customer, processor

**Action**: Report suspected breach immediately to Security Team and DPO

**Reporting Channels**:
- Email: security@example.com
- Phone: `[24/7 Security Hotline]`
- Ticketing System: Priority: Critical

#### Step 2: Acknowledge and Assign

**Who**: Security Team

**Action**:
- Acknowledge report within **15 minutes**
- Assign Incident Response Lead
- Open incident ticket: `[INCIDENT-YYYY-MM-DD-XXXX]`
- Assemble Incident Response Team (Security, DPO, Legal, IT, Communications)

**Incident Response Team**:
- Incident Response Lead: `[Name/Role]`
- Security Officer: `[Name]`
- Data Protection Officer (DPO): `[Name]`
- Legal Counsel: `[Name]`
- IT/Engineering Lead: `[Name]`
- Communications/PR Lead: `[Name]`
- Executive Sponsor: `[Name/Role: CEO, CTO, etc.]`

#### Step 3: Initial Containment

**Who**: Security Team, IT

**Action**: Immediate steps to contain breach and prevent further damage

**Containment Measures** (as applicable):
- [ ] Isolate affected systems (disconnect from network if necessary)
- [ ] Disable compromised user accounts
- [ ] Reset passwords for affected accounts
- [ ] Block attacker IP addresses
- [ ] Patch vulnerabilities being exploited
- [ ] Preserve logs and evidence (do not alter systems if forensic investigation needed)
- [ ] Activate backup systems if availability breach

**Do NOT**: Shut down systems without consulting forensics team (may destroy evidence)

### Phase 2: Investigation and Assessment (Hour 1-24)

#### Step 4: Investigate Scope

**Who**: Security Team, IT, Forensics (if external)

**Action**: Determine scope of breach

**Investigation Checklist**:
- [ ] What personal data was affected? (categories, volume)
- [ ] How many data subjects affected? (estimate if exact number unknown)
- [ ] What data subjects affected? (customers, employees, children, vulnerable populations)
- [ ] When did breach occur? (initial compromise date)
- [ ] How did breach occur? (attack vector, vulnerability exploited)
- [ ] What systems/databases compromised?
- [ ] Was data accessed, exfiltrated, altered, or destroyed?
- [ ] Was data encrypted? (if yes, were keys compromised?)
- [ ] Were backups affected?
- [ ] Who is the attacker? (if known: internal, external, nation-state, cybercriminal)
- [ ] Is breach ongoing? (has attacker been fully removed from systems?)

**Evidence Collection**:
- [ ] System logs (access logs, authentication logs, network traffic)
- [ ] Database queries (which records accessed)
- [ ] Emails, phishing messages
- [ ] Screenshots, system snapshots
- [ ] Forensic disk images (if applicable)
- [ ] Chain of custody documented

#### Step 5: Risk Assessment

**Who**: DPO, Security Team, Legal

**Action**: Assess risk to data subjects (determines notification obligations)

**Risk Assessment Criteria** (GDPR Recital 75-85):

| Factor | Assessment |
|--------|------------|
| **Type of Breach** | Confidentiality (unauthorized access) = HIGH risk; Integrity (alteration) = MEDIUM risk; Availability (temporary loss) = LOW risk |
| **Nature of Data** | Special category (health, biometric) = HIGH risk; Financial data = HIGH risk; Contact info = MEDIUM risk; Pseudonymized data = LOW risk |
| **Volume** | >1000 subjects = HIGH risk; 100-1000 = MEDIUM risk; <100 = LOW risk |
| **Ease of Identification** | Directly identifiable (name, email) = HIGH risk; Pseudonymized with key compromised = MEDIUM risk; Anonymized = NO risk (not personal data) |
| **Severity of Consequences** | Identity theft, fraud, discrimination = HIGH risk; Embarrassment, inconvenience = MEDIUM risk; Minimal impact = LOW risk |
| **Data Subject Characteristics** | Children, employees, vulnerable populations = HIGHER risk; General public = MEDIUM risk |
| **Safeguards** | Encrypted data (keys not compromised) = LOWER risk; Plaintext data = HIGHER risk |

**Risk Levels**:
- **LOW RISK**: Unlikely to adversely affect data subject rights and freedoms
  - **No notification required** (Art. 33(1) exception)
  - Example: Encrypted data breach, keys not compromised; or availability breach resolved within hours
- **MEDIUM RISK (Risk, but not HIGH RISK)**: May adversely affect data subjects, but manageable
  - **Notify supervisory authority within 72 hours** (Art. 33)
  - **No data subject notification required** (Art. 34 threshold not met)
  - Example: Limited contact info (email, phone) exposed; no financial or special category data
- **HIGH RISK**: Likely to result in significant adverse effects (identity theft, fraud, discrimination)
  - **Notify supervisory authority within 72 hours** (Art. 33)
  - **Notify data subjects without undue delay** (Art. 34)
  - Example: Financial data, credentials, special category data compromised; large-scale breach; children's data

**Decision**: DPO determines risk level (with Legal input). Document justification.

### Phase 3: Notification (Hour 24-72)

#### Step 6: Notify Supervisory Authority (If Required)

**Requirement**: GDPR Article 33(1) - Notify within **72 hours** of becoming aware of breach (unless breach unlikely to result in risk = LOW RISK).

**"Becoming Aware"**: When controller has reasonable degree of certainty that breach occurred (not just suspicion). Clock starts from this point.

**Supervisory Authority**: Data protection authority of controller's main establishment (EU/EEA member state where main processing decisions made).

**Controller's Supervisory Authority**: `[e.g., CNIL (France), ICO (UK), BfDI (Germany)]`

**Notification Method**: `[Online portal, email, phone - per authority requirements]`
- CNIL (France): https://www.cnil.fr/en/notifying-data-breach
- ICO (UK): https://ico.org.uk/for-organisations/report-a-breach/
- BfDI (Germany): https://www.bfdi.bund.de/EN/Home/home_node.html

**Notification Content** (GDPR Art. 33(3)):
1. **Nature of breach**: Description, categories of data subjects and records affected (approximate numbers if exact unknown)
2. **DPO Contact**: Name and contact details of Data Protection Officer or other contact point
3. **Likely Consequences**: Potential adverse effects on data subjects
4. **Measures Taken**: Actions to address breach, mitigate harm, and prevent recurrence

**Phased Notification** (Art. 33(4)): If full information not available within 72 hours, provide:
- Initial notification with available information (within 72 hours)
- Additional information without undue delay (as investigation progresses)

**Documentation**: DPO documents notification sent (date, time, content) per Art. 33(5).

**Late Notification**: If notification sent >72 hours after becoming aware, provide **justification for delay**.

#### Step 7: Notify Data Subjects (If HIGH RISK)

**Requirement**: GDPR Article 34(1) - Notify data subjects **without undue delay** if breach likely to result in HIGH RISK.

**"Without Undue Delay"**: No specific deadline, but as soon as reasonably practicable (typically within 72 hours of risk determination).

**Notification Method**: Direct communication to data subjects (email preferred; postal mail if no email; phone if critical)

**Notification Content** (GDPR Art. 34(2)):
1. **Description of Breach**: In clear, plain language (not technical jargon)
2. **DPO Contact**: Name and contact details of Data Protection Officer
3. **Likely Consequences**: Explain potential risks (e.g., identity theft, financial fraud)
4. **Measures Taken and Recommended**: What controller has done; what data subjects should do (e.g., change passwords, monitor accounts, enable MFA)

**Example Notification** (email to data subjects):

```
Subject: Important Security Notice - Data Breach

Dear [Name],

We are writing to inform you of a security incident that may have affected your personal information.

What Happened:
On [Date], we discovered that an unauthorized party gained access to our system containing customer information. We immediately took steps to secure our systems and are working with cybersecurity experts to investigate.

What Information Was Involved:
The affected information includes: [e.g., name, email address, and encrypted passwords]. [Note: Your financial information (credit card numbers) was NOT affected.]

What We Are Doing:
- We have secured the affected systems and changed all access credentials
- We are conducting a full forensic investigation
- We have notified law enforcement and data protection authorities
- We are enhancing our security measures to prevent future incidents

What You Should Do:
- Change your password immediately on our platform and any other site where you use the same password
- Enable multi-factor authentication (MFA) on your account
- Monitor your accounts for suspicious activity
- Be cautious of phishing emails (we will never ask for your password via email)

For More Information:
Contact our Data Protection Officer at privacy@example.com or [Phone].

You have the right to lodge a complaint with the data protection authority: [Supervisory Authority Name] ([Website/Phone]).

We sincerely apologize for this incident and any concern it may cause. We take the security of your information very seriously.

[Organization Name]
[DPO Name and Contact]
```

**Exceptions to Data Subject Notification** (Art. 34(3)):
- **(a) Effective Technical Safeguards**: Data encrypted and keys not compromised (data unintelligible to unauthorized persons)
- **(b) Subsequent Mitigation**: Controller took measures to ensure high risk no longer likely (e.g., attacker identified and data recovered)
- **(c) Disproportionate Effort**: Notifying individuals would require disproportionate effort (e.g., contact info not available)
  - In this case: **Public communication** required (e.g., press release, website notice, social media)

**Decision**: DPO determines if data subject notification required and if any exceptions apply. Document justification.

#### Step 8: Other Notifications (As Applicable)

**Processors**: If controller uses processors, notify processors of breach affecting their systems (per DPA Art. 28(3)(f))

**Law Enforcement**: Notify if criminal activity (hacking, theft); may request delay in data subject notification to not hinder investigation

**Payment Card Brands**: If payment card breach, notify card brands (Visa, Mastercard, Amex) and acquiring bank immediately (PCI DSS requirement)

**Cyber Insurance**: Notify cyber insurance provider per policy requirements

**Media/PR**: Prepare holding statement for media inquiries; proactive press release if public interest or large-scale breach

**Credit Monitoring Services**: If HIGH RISK breach (e.g., SSN, financial data), consider offering free credit monitoring to affected data subjects

### Phase 4: Remediation and Recovery (Hour 72+)

#### Step 9: Full Remediation

**Who**: Security Team, IT, Engineering

**Action**: Eliminate root cause and restore secure operations

**Remediation Checklist**:
- [ ] Patch vulnerabilities exploited by attacker
- [ ] Remove attacker access (backdoors, persistent access mechanisms)
- [ ] Rebuild compromised systems from clean backups (if necessary)
- [ ] Reset all credentials (passwords, API keys, certificates)
- [ ] Review and enhance access controls (RBAC, least privilege)
- [ ] Deploy additional security monitoring (IDS, SIEM, DLP)
- [ ] Conduct security audit (internal or external)
- [ ] Penetration test to verify remediation effectiveness

**Verification**: Confirm attacker fully removed; no persistent access remains

#### Step 10: Data Subject Support

**Who**: Support Team, Legal, Communications

**Action**: Assist affected data subjects

**Support Measures**:
- [ ] Dedicated support hotline/email for breach-related inquiries
- [ ] FAQ page on website
- [ ] Credit monitoring services (if financial data compromised)
- [ ] Identity theft protection services (if HIGH RISK)
- [ ] Password reset assistance
- [ ] Account monitoring (alert data subjects of suspicious activity)

**Duration**: Support available for at least 6-12 months after breach (depending on risk level)

### Phase 5: Post-Incident Review (Within 30 Days)

#### Step 11: Lessons Learned

**Who**: Incident Response Team, Executive Sponsor

**Action**: Conduct blameless post-mortem

**Post-Mortem Questions**:
- What happened? (timeline, root cause)
- What went well? (effective containment, good communication)
- What went poorly? (detection delays, communication gaps)
- What should we change? (preventive measures, detection improvements, process updates)
- Were notification deadlines met (72 hours to authority, timely to data subjects)?
- Were documentation requirements met (Art. 33(5))?

**Deliverables**:
- Post-incident report (executive summary, technical details, timeline)
- Root cause analysis
- Remediation action plan (with owners and deadlines)
- Policy and procedure updates (incident response plan, security policies)

#### Step 12: Update Documentation

**Who**: DPO, Security Officer

**Action**: Update policies and procedures based on lessons learned

**Documents to Update**:
- [ ] Incident Response Plan
- [ ] Breach Notification Plan (this document)
- [ ] Security policies (access control, password, encryption)
- [ ] Training materials (incorporate breach lessons)
- [ ] DPIA (if breach reveals new risks)

**Training**: Conduct refresher training for employees on breach prevention and response

#### Step 13: Follow-Up with Supervisory Authority

**Who**: DPO, Legal

**Action**: Respond to any follow-up inquiries from supervisory authority

**Possible Authority Actions**:
- Request additional information
- Conduct investigation or audit
- Issue corrective measures (e.g., enhance security, update policies)
- Impose administrative fines (up to €20M or 4% global revenue per Art. 83)

**Cooperation**: Cooperate fully with authority; provide requested information promptly

## 4. Breach Documentation (GDPR Art. 33(5))

### Documentation Requirements

**GDPR Art. 33(5)**: Controller must **document all breaches** (facts, effects, remedial action), regardless of whether breach was notified.

**Breach Register** (maintain centrally by DPO):

| Field | Content |
|-------|---------|
| **Incident ID** | `[INCIDENT-YYYY-MM-DD-XXXX]` |
| **Date/Time Detected** | When breach first detected |
| **Date/Time of Incident** | When breach actually occurred (if known) |
| **Date/Time "Became Aware"** | When controller had reasonable certainty (72-hour clock starts) |
| **Breach Type** | Confidentiality / Integrity / Availability |
| **Description** | What happened, how it happened, who was responsible (if known) |
| **Personal Data Affected** | Categories, volume, data subjects affected |
| **Risk Assessment** | LOW / MEDIUM / HIGH RISK (with justification) |
| **Authority Notified?** | Yes/No (if no, why: LOW RISK) |
| **Authority Notification Date** | `[YYYY-MM-DD HH:MM]` (within 72 hours?) |
| **Data Subjects Notified?** | Yes/No (if no, why: exception applies) |
| **Data Subject Notification Date** | `[YYYY-MM-DD]` |
| **Measures Taken** | Containment, remediation, prevention |
| **Consequences** | Impact on data subjects (actual, not just potential) |
| **Follow-Up Actions** | Action plan, owners, deadlines |
| **Resolution Date** | When breach fully remediated and closed |
| **Lessons Learned** | Key takeaways from post-mortem |

**Retention**: Breach register retained for **5 years** minimum (demonstrable compliance, statute of limitations for claims).

### Reportable Breaches vs. Non-Reportable Incidents

**Reportable to Supervisory Authority** (unless LOW RISK):
- Personal data accessed, disclosed, altered, destroyed, or lost
- Even if no harm occurred (potential risk sufficient)

**Not Reportable** (but document in internal incident log):
- Failed attack attempts (no personal data compromised)
- Security incidents not involving personal data (e.g., website defacement with no data access)
- Availability incidents resolved quickly with no lasting impact (<1 hour downtime, no data loss)

**When Uncertain**: Consult DPO; err on side of notification if unsure (better to over-notify than under-notify).

## 5. Roles and Responsibilities

| Role | Responsibilities | Contact |
|------|------------------|---------|
| **Data Protection Officer (DPO)** | Oversee breach response, assess risk, notify authorities, notify data subjects, maintain breach register | `[Name, Email, Phone]` |
| **Incident Response Lead** | Coordinate incident response team, manage investigation, containment, remediation | `[Name, Email, Phone]` |
| **Security Team** | Detect, contain, investigate breaches; forensic analysis; implement security fixes | `[Team Email, Phone]` |
| **IT/Engineering** | System remediation, patch deployment, backup restoration, access control updates | `[Team Email, Phone]` |
| **Legal Counsel** | Advise on legal obligations, review notifications, liaise with regulators and law enforcement | `[Name, Email, Phone]` |
| **Communications/PR** | Draft data subject notifications, media statements, FAQs; handle media inquiries | `[Name, Email, Phone]` |
| **Executive Sponsor (CEO/CTO)** | Final approval on notifications, authorize resources, escalate to board if necessary | `[Name, Email, Phone]` |
| **Support Team** | Handle data subject inquiries, provide assistance, password resets | `[Support Email, Phone]` |

**24/7 Availability**: DPO, Incident Response Lead, and Security Team must be reachable 24/7 (72-hour deadline requires rapid response).

## 6. Training and Testing

### Training

**Frequency**: Annual (or more frequently if high-risk processing)

**Audience**:
- All employees (general awareness: how to detect and report breaches)
- Incident Response Team (detailed breach response procedures, notification deadlines)
- DPO and Security Team (GDPR requirements, risk assessment, notification content)

**Training Content**:
- Breach definition and examples
- Detection methods and reporting channels
- 72-hour notification deadline (Art. 33)
- Risk assessment criteria (LOW/MEDIUM/HIGH)
- Data subject notification requirements (Art. 34)
- Documentation requirements (Art. 33(5))
- Roles and responsibilities

### Testing (Tabletop Exercises)

**Frequency**: Annual minimum

**Objective**: Test breach response plan; identify gaps; train team

**Scenario Examples**:
- Ransomware attack encrypting customer database
- Phishing attack compromising employee credentials and customer data access
- Lost laptop containing unencrypted employee data
- Unauthorized API access by third party
- Insider threat (employee exfiltrates customer data)

**Exercise Steps**:
1. Present scenario to Incident Response Team
2. Team walks through response steps (detection, containment, investigation, notification)
3. Time-box exercise (simulate 72-hour deadline pressure)
4. Debrief: What went well? What needs improvement?
5. Update plan based on findings

**Documentation**: Document exercise, findings, and action items.

## 7. Continuous Improvement

**Review Frequency**: Annual OR after each breach (post-mortem)

**Review Triggers**:
- Actual breach (lessons learned)
- Regulatory guidance update (EDPB, supervisory authority)
- Organizational change (new systems, new data processing, M&A)
- Test/exercise findings

**Update Process**:
1. DPO proposes updates based on findings
2. Legal and Security review
3. Executive approves
4. Plan updated (version incremented)
5. Training updated
6. Team notified of changes

## 8. Approval and Sign-Off

| Role | Name | Approval | Signature | Date |
|------|------|----------|-----------|------|
| **Data Protection Officer** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Security Officer** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Legal Counsel** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Chief Information Officer (CIO)** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |

---

**References**:
- GDPR Articles 33-34: [https://gdpr-info.eu/art-33-gdpr/](https://gdpr-info.eu/art-33-gdpr/), [https://gdpr-info.eu/art-34-gdpr/](https://gdpr-info.eu/art-34-gdpr/)
- ICO Breach Notification Guidance: [https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/personal-data-breaches/](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/personal-data-breaches/)
- EDPB Guidelines on Breach Notification (WP250): [https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-personal-data-breach-notification-under-regulation_en](https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-personal-data-breach-notification-under-regulation_en)
