# Cross-Border Transfer Assessment Template

## Document Control

| Field | Value |
|-------|-------|
| Document Type | Cross-Border Data Transfer Assessment |
| Project Name | `[Project/System Name]` |
| Version | `[e.g., 1.0]` |
| Assessment Date | `[YYYY-MM-DD]` |
| Author | `[Privacy Officer, Data Protection Officer]` |
| Reviewers | `[Legal, Security Architect, Vendor Manager]` |
| Status | `[Draft/Approved]` |
| Next Review Date | `[YYYY-MM-DD]` (annual review minimum) |
| Related Documents | DPIA, Data Processing Agreement, Transfer Impact Assessment |

## Purpose and Regulatory Basis

### Purpose

This assessment evaluates international data transfers to ensure compliance with **GDPR Chapter V (Articles 44-50)** regarding transfers of personal data to third countries or international organizations.

### Regulatory Framework

**GDPR Article 44**: "Any transfer... to a third country or international organization shall take place only if the conditions laid down in this Chapter are complied with."

**GDPR Articles 45-49** define approved transfer mechanisms:
- **Art. 45**: Adequacy decision by EU Commission
- **Art. 46**: Standard Contractual Clauses (SCCs), Binding Corporate Rules (BCRs), approved codes/certifications
- **Art. 49**: Derogations for specific situations (explicit consent, contract necessity, public interest, legal claims, vital interests)

**Schrems II Impact (2020)**: Court of Justice of EU invalidated EU-US Privacy Shield; SCCs remain valid but require **Transfer Impact Assessment (TIA)** to evaluate destination country laws.

## Transfer Inventory

### Transfer 1: `[e.g., AWS Cloud Hosting - US East]`

| Attribute | Value |
|-----------|-------|
| **Transfer Description** | Customer personal data hosted on AWS infrastructure in United States |
| **Data Categories** | Account data, transaction data, user-generated content, logs |
| **Data Classification** | Restricted (PII) |
| **Data Volume** | `[e.g., 100,000 users, 500GB]` |
| **Special Category Data?** | `[Yes/No - If yes, Art. 9 considerations apply]` |
| **Data Subjects** | EU residents (customers) |
| **Purpose of Transfer** | Infrastructure hosting, service delivery, data storage |
| **Recipient (Data Importer)** | Amazon Web Services, Inc. (AWS) |
| **Recipient Country** | United States (Virginia, US-East-1 region) |
| **Recipient Role** | Processor (GDPR Art. 28) |
| **Transfer Frequency** | Continuous (data stored in US) |
| **Transfer Mechanism** | `[To be determined - see Section below]` |

---

### Transfer 2: `[e.g., Support Vendor - India]`

| Attribute | Value |
|-----------|-------|
| **Transfer Description** | Customer support tickets and inquiries processed by offshore support team |
| **Data Categories** | Support tickets, customer inquiries, contact info |
| **Data Classification** | Confidential |
| **Data Volume** | `[e.g., 5,000 tickets/month]` |
| **Special Category Data?** | No |
| **Data Subjects** | EU residents (customers) |
| **Purpose of Transfer** | Customer support, issue resolution |
| **Recipient (Data Importer)** | `[Vendor name, support center]` |
| **Recipient Country** | India (Bangalore) |
| **Recipient Role** | Processor |
| **Transfer Frequency** | Daily (ticket queue) |
| **Transfer Mechanism** | `[To be determined]` |

---

**Transfer Summary Table**:

| Transfer ID | Recipient | Country | Data Categories | Volume | Transfer Mechanism | TIA Required? | Approval Date |
|-------------|-----------|---------|-----------------|--------|-------------------|---------------|---------------|
| TXF-001 | AWS | United States | All personal data | 500GB | SCCs (2021) | **Yes** | `[Date]` |
| TXF-002 | Support Vendor | India | Support tickets | 5K tickets/month | SCCs (2021) | **Yes** | `[Date]` |
| TXF-003 | `[Vendor]` | `[Country]` | `[Data]` | `[Volume]` | `[Mechanism]` | `[Yes/No]` | `[Date]` |

## Transfer Mechanism Selection

### Step 1: Check for Adequacy Decision (GDPR Art. 45)

**EU Commission Adequacy Decisions** (transfers to these countries do NOT require additional safeguards):

**Current Adequacy Decisions** (as of 2025):
- [ ] Andorra
- [ ] Argentina
- [ ] Canada (commercial organizations under PIPEDA)
- [ ] Faroe Islands
- [ ] Guernsey
- [ ] Israel
- [ ] Isle of Man
- [ ] Japan
- [ ] Jersey
- [ ] New Zealand
- [ ] Republic of Korea (South Korea)
- [ ] Switzerland
- [ ] United Kingdom (UK GDPR)
- [ ] Uruguay
- [ ] **EU-US Data Privacy Framework** (2023) - Replaces Privacy Shield for US entities that self-certify

**Destination Country Has Adequacy Decision?**
- **Yes** → Transfer permitted without additional safeguards. Document and proceed.
- **No** → Proceed to Step 2 (Standard Contractual Clauses or other mechanisms).

**Note**: Always verify current adequacy decisions at [https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en](https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en)

### Step 2: Use Standard Contractual Clauses (SCCs) (GDPR Art. 46(2)(c))

**When to Use**: If destination country lacks adequacy decision.

**EU Commission SCC Templates**:
- **2021 SCCs for Controllers and Processors**: [https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en](https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en)
- **Modules**: Controller-to-Controller, Controller-to-Processor, Processor-to-Processor, Processor-to-Controller

**Selected SCC Module**:
- **Transfer 1 (AWS)**: Module 2 - Controller to Processor (EU controller → US processor)
- **Transfer 2 (Support Vendor)**: Module 2 - Controller to Processor

**SCC Integration**:
- SCCs signed as part of Data Processing Agreement (DPA per GDPR Art. 28)
- Annexes completed: Data description, technical/organizational measures, sub-processors

**SCC Compliance**:
- [ ] 2021 SCCs (not outdated 2010 SCCs)
- [ ] Correct module selected
- [ ] Annexes completed (Annex I: transfer details, Annex II: security measures)
- [ ] Signed by both parties (controller and processor)
- [ ] Effective date recorded

### Step 3: Transfer Impact Assessment (TIA) - Post-Schrems II Requirement

**Requirement**: Even with SCCs, controller must assess whether destination country laws undermine SCCs (e.g., government surveillance laws).

**TIA Required?** **Yes** (if no adequacy decision and SCCs used)

See **Transfer Impact Assessment (TIA)** section below.

### Step 4: Alternative Transfer Mechanisms (If SCCs Not Suitable)

#### Binding Corporate Rules (BCRs) (GDPR Art. 47)

**When to Use**: Intra-group transfers (multinational corporations transferring data within corporate group).

**Requirements**:
- Legally binding rules across corporate group
- Approved by supervisory authority (complex, lengthy process)
- Data subject rights enforceable
- Independent audit

**Not Applicable** for most external vendor transfers (SCCs preferred).

#### Derogations (GDPR Art. 49) - **Limited Use Only**

**Emergency Exceptions** (cannot be relied upon for regular transfers):

- [ ] **Art. 49(1)(a) - Explicit Consent**: Data subject explicitly consented **after being informed** of risks (no adequacy, no safeguards)
- [ ] **Art. 49(1)(b) - Contract Necessity**: Transfer necessary for contract with data subject (e.g., hotel booking in US)
- [ ] **Art. 49(1)(c) - Public Interest Contract**: Transfer for public interest contract (rare)
- [ ] **Art. 49(1)(d) - Legal Claims**: Transfer necessary to establish, exercise, or defend legal claims
- [ ] **Art. 49(1)(e) - Vital Interests**: Transfer necessary to protect vital interests (life-or-death)
- [ ] **Art. 49(1)(f) - Public Register**: Transfer from public register
- [ ] **Art. 49(1)(g) - Legitimate Interests (occasional, non-repetitive)**: Transfer occasional, not repetitive, limited to necessary data, compelling legitimate interest, safeguards assessed

**Critical Limitation**: Derogations **cannot** be used for systematic, ongoing transfers (e.g., cloud hosting, regular data processing by vendors). Must use SCCs or adequacy decision.

## Transfer Impact Assessment (TIA)

**Required**: If using SCCs and transferring to country with laws that may conflict with SCCs (e.g., US FISA 702, CLOUD Act; China Cybersecurity Law; Russia Data Localization Law).

### TIA for Transfer 1: AWS (United States)

#### 1. Destination Country Legal Framework

**Country**: United States

**Laws Relevant to Data Access**:

| Law | Description | Impact on Personal Data |
|-----|-------------|-------------------------|
| **FISA Section 702** | Permits US intelligence agencies to compel US companies to provide data on non-US persons | AWS (US company) may be compelled to disclose EU data to NSA/FBI without warrant or data subject notification |
| **CLOUD Act (2018)** | Permits US law enforcement to compel US companies to disclose data stored abroad | AWS may be required to provide data stored in EU if ordered by US court |
| **Executive Order 12333** | Authorizes intelligence activities, including upstream collection | NSA may intercept data in transit (mitigated by encryption) |

**Government Access Oversight**:
- FISA Court (secret, ex parte proceedings)
- Privacy and Civil Liberties Oversight Board (limited oversight)
- No effective judicial redress for non-US persons under FISA 702

**Conclusion**: US legal framework **may conflict** with GDPR due to government surveillance without adequate data subject protections.

#### 2. Recipient's Exposure to Government Access

**Recipient**: Amazon Web Services, Inc.

**US Company?**: Yes (headquartered in Seattle, Washington)

**Subject to FISA 702?**: Yes (US Electronic Communication Service Provider per 50 USC § 1881(b)(4))

**Has Recipient Received Government Data Requests?**:
- AWS Transparency Report: [https://aws.amazon.com/compliance/transparency-reports/](https://aws.amazon.com/compliance/transparency-reports/)
- FISA requests: Reported in bands (e.g., 0-499 requests per year); cannot disclose exact numbers

**Conclusion**: AWS **is exposed** to US government access requests under FISA 702 and CLOUD Act.

#### 3. Practical Assessment of Risk

**Likelihood of Government Access**:
- **Targeted Surveillance**: Low (unless data subject is specific target of intelligence operation)
- **Bulk Collection**: Moderate (FISA 702 permits bulk collection of non-US persons' data)
- **Law Enforcement**: Low (routine law enforcement requires warrant, not FISA)

**Impact on Data Subjects**:
- Government may access data without data subject knowledge or consent
- No effective legal redress for EU data subjects under US law
- Potential for surveillance, profiling, or other rights infringements

**Risk Level**: **Medium** (government access possible but not certain; bulk collection risk exists)

#### 4. Supplementary Measures

**EDPB Recommendations (June 2021)**: If TIA reveals risks, implement supplementary measures to bring protection to "essentially equivalent" level as EU.

**Technical Measures**:

| Measure | Implementation | Effectiveness Against Government Access |
|---------|----------------|----------------------------------------|
| **End-to-End Encryption** | Encrypt data with keys held only by controller (not AWS) | **High** - AWS cannot decrypt data even if compelled; government receives encrypted data |
| **Encryption in Transit (TLS 1.3)** | All data encrypted during transmission | **Medium** - Protects against interception; does not prevent access to data at rest |
| **Pseudonymization** | Replace identifiers with pseudonyms before transfer | **Medium** - Reduces identifiability; not effective if government correlates with other data |
| **Data Minimization** | Transfer only essential data; avoid transferring special category data | **Medium** - Reduces exposure; does not prevent access to transferred data |

**Organizational Measures**:

| Measure | Implementation | Effectiveness |
|---------|----------------|---------------|
| **Data Processing Agreement (DPA) with Transparency Clause** | Require AWS to notify controller if government request received (unless gag order) | **Low** - US law permits gag orders (NSLs, FISA); AWS may not be able to notify |
| **Regular Audits** | Audit AWS compliance with DPA annually | **Low** - Cannot audit government requests AWS receives |
| **Data Residency (EU Regions)** | Store data in AWS EU regions (Frankfurt, Ireland) | **Low** - CLOUD Act permits extraterritorial access; US court can compel AWS to provide data stored in EU |
| **Contractual Challenge Clause** | Require AWS to challenge unlawful government requests | **Medium** - AWS commits to challenge, but may not succeed |

**Contractual Measures**:
- AWS Customer Agreement includes commitments to:
  - Challenge overbroad government requests
  - Notify controller if legally permitted
  - Comply with GDPR when processing EU data

**Selected Supplementary Measures for Transfer 1**:
- [x] **End-to-End Encryption** (keys managed by controller in EU, not AWS)
- [x] **Data Minimization** (transfer only necessary data)
- [x] **AWS EU Regions** (store in Frankfurt/Ireland - limited mitigation)
- [x] **DPA with Transparency and Challenge Clauses**

**Residual Risk**: **Low-Medium** (end-to-end encryption renders data unreadable to government; key risk mitigated)

#### 5. Adequacy of Protection

**Question**: Do SCCs + supplementary measures bring protection to "essentially equivalent" level as EU?

**Assessment**:
- End-to-end encryption provides strong technical protection (government cannot decrypt data)
- Data minimization reduces exposure
- Organizational measures (transparency, challenge) provide limited procedural protection
- **Overall**: Protection approaches "essentially equivalent" but not perfect (government could compel controller to provide keys if controller subject to US jurisdiction)

**Conclusion**: Transfer **permissible** under SCCs with supplementary measures. Residual risk acceptable.

**Approval**: Data Protection Officer approves TIA findings.

---

### TIA for Transfer 2: Support Vendor (India)

#### 1. Destination Country Legal Framework

**Country**: India

**Laws Relevant to Data Access**:

| Law | Description | Impact on Personal Data |
|-----|-------------|-------------------------|
| **Information Technology Act 2000** | Governs data protection and cybersecurity; permits government access with legal process | Government may access data with court order or under national security provisions |
| **Personal Data Protection Bill (pending)** | Proposes data localization and cross-border transfer restrictions | If enacted, may require localization of sensitive data; impact TBD |
| **No Surveillance Law Framework** | Limited legal framework for government surveillance oversight | Lack of transparency and oversight for intelligence activities |

**Government Access Oversight**: Limited; no robust privacy protections equivalent to EU.

**Conclusion**: India legal framework **may conflict** with GDPR due to limited oversight of government access.

#### 2. Recipient's Exposure

**Recipient**: `[Vendor Name]` (Indian company)

**Indian Company?**: Yes

**Subject to Indian Government Access Laws?**: Yes

**Conclusion**: Vendor **is exposed** to Indian government access requests.

#### 3. Practical Assessment of Risk

**Likelihood**: Low (support tickets unlikely to be target of intelligence or law enforcement)

**Impact**: Low (support ticket data less sensitive than account data)

**Risk Level**: **Low**

#### 4. Supplementary Measures

- [x] **Data Minimization**: Transfer only support ticket content, not full account data
- [x] **Pseudonymization**: Mask account IDs in tickets
- [x] **Encryption in Transit**: TLS 1.3
- [x] **Access Controls**: Vendor accesses only assigned tickets (least privilege)
- [x] **Contractual Obligations**: DPA with transparency and challenge clauses

**Residual Risk**: **Low**

#### 5. Adequacy of Protection

**Conclusion**: Transfer **permissible** under SCCs with supplementary measures. Low-risk transfer.

---

## Transfer Approval and Documentation

### Transfer Decision Summary

| Transfer | Mechanism | TIA Required? | TIA Completed? | Supplementary Measures | Residual Risk | Approved? |
|----------|-----------|---------------|----------------|------------------------|---------------|-----------|
| TXF-001 (AWS US) | SCCs (2021) | Yes | Yes | E2E encryption, data minimization, EU regions, DPA clauses | Low-Medium | **Approved** |
| TXF-002 (Support Vendor India) | SCCs (2021) | Yes | Yes | Data minimization, pseudonymization, encryption, access controls | Low | **Approved** |

### Ongoing Monitoring

**Review Triggers**:
- [ ] Annual TIA review (destination country laws may change)
- [ ] New government surveillance law in destination country
- [ ] Data breach or security incident involving transfer
- [ ] Supervisory authority guidance update (EDPB, national DPA)
- [ ] Schrems III or other CJEU ruling

**Monitoring Actions**:
- Subscribe to EDPB guidance updates
- Monitor vendor transparency reports (government requests)
- Audit vendor compliance with DPA and SCCs annually

### Documentation Requirements

**For Each Transfer, Maintain**:
- [ ] Transfer Impact Assessment (TIA) document
- [ ] Standard Contractual Clauses (SCCs) signed
- [ ] Data Processing Agreement (DPA) with SCCs incorporated
- [ ] Vendor security certifications (ISO 27001, SOC 2)
- [ ] Vendor transparency reports (government requests)
- [ ] Annual TIA review records
- [ ] Supplementary measures implementation evidence

**Retention**: 3 years after transfer ends (demonstrable compliance per Art. 5(2))

## Prohibited Transfers

**Do NOT transfer to**:
- Countries under EU sanctions (e.g., North Korea, Iran for certain data types)
- Countries without adequacy decision, SCCs, or other valid mechanism
- Countries where supplementary measures cannot bring protection to essentially equivalent level (e.g., bulk surveillance states with no encryption-friendly laws)

**Red Flag Countries** (high risk, TIA likely to reveal inadequacy):
- China (Cybersecurity Law, data localization, government access obligations)
- Russia (Data Localization Law, SORM surveillance, limited oversight)
- Countries with mandatory data localization and government backdoor requirements

## Integration with SDLC

### Inception Phase

- [ ] Identify all cross-border transfers in architecture
- [ ] Complete transfer inventory
- [ ] Determine transfer mechanisms (adequacy, SCCs, derogations)

### Elaboration Phase

- [ ] Conduct TIA for each SCC-based transfer
- [ ] Negotiate and sign SCCs with processors
- [ ] Design supplementary measures (encryption, pseudonymization)

### Construction Phase

- [ ] Implement supplementary measures
- [ ] Test encryption and data minimization
- [ ] Verify SCCs incorporated in DPAs

### Transition Phase

- [ ] Audit vendor compliance with SCCs
- [ ] Verify transfers operational and compliant (gate criteria)

### Production

- [ ] Annual TIA review
- [ ] Monitor vendor transparency reports
- [ ] Update TIA if destination country laws change

## Approval and Sign-Off

| Role | Name | Approval | Signature | Date |
|------|------|----------|-----------|------|
| **Privacy Officer** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Data Protection Officer** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Legal Counsel** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |
| **Security Architect** | `[Name]` | `[Approved/Rejected]` | `[Signature]` | `[Date]` |

---

**References**:
- GDPR Chapter V: [https://gdpr-info.eu/chapter-5/](https://gdpr-info.eu/chapter-5/)
- EU Commission SCCs: [https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en](https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en)
- EDPB Recommendations on Supplementary Measures (June 2021): [https://edpb.europa.eu/our-work-tools/our-documents/recommendations/recommendations-012020-measures-supplement-transfer_en](https://edpb.europa.eu/our-work-tools/our-documents/recommendations/recommendations-012020-measures-supplement-transfer_en)
- Schrems II Judgment: [https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62018CJ0311](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62018CJ0311)
