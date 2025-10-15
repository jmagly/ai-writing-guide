# Export Control Assessment Template

## Cover Page

- `Project Name`
- `Export Control Assessment`
- `Version 1.0`

## Revision History

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| `dd/mmm/yy` | `x.x` | `<details>` | `<name>` |

## Ownership & Collaboration

- Document Owner: Legal Liaison
- Contributor Roles: Engineering Lead, Sales Lead, Compliance Team
- Automation Inputs: Product specifications, technical documentation, destination country lists
- Automation Outputs: ECCN classifications, restricted party screening results, export compliance reports

## 1 Introduction

> Assess export control obligations under ITAR, EAR, and sanctions regulations to ensure legal international distribution.

### 1.1 Purpose

This document determines export classification, identifies restricted destinations, screens parties against denied/restricted lists, and establishes export compliance procedures.

### 1.2 Scope

This document covers:
- Export classification (ECCN assignment under EAR, USML category under ITAR)
- Technical characteristics assessment (encryption, cryptography, dual-use technology)
- Destination control (embargoed countries, restricted end-users)
- Restricted party screening (SDN, Entity List, Denied Persons List)
- Export compliance program (recordkeeping, reporting, training)

### 1.3 Definitions, Acronyms, and Abbreviations

- **EAR**: Export Administration Regulations (US Department of Commerce)
- **ITAR**: International Traffic in Arms Regulations (US Department of State)
- **ECCN**: Export Control Classification Number (EAR classification)
- **USML**: United States Munitions List (ITAR-controlled items)
- **BIS**: Bureau of Industry and Security (EAR enforcement)
- **DDTC**: Directorate of Defense Trade Controls (ITAR enforcement)
- **SDN**: Specially Designated Nationals (OFAC sanctions list)
- **CCL**: Commerce Control List (EAR-controlled items)
- **Dual-Use**: Items with both civilian and military applications
- **De Minimis**: US content threshold triggering re-export controls

### 1.4 References

- `regulatory-compliance-framework-template.md` - Compliance tracking
- `legal-risk-assessment-template.md` - Export control risks
- `contract-management-template.md` - International customer contracts
- `bill-of-materials-template.md` - Product component inventory

### 1.5 Overview

Section 2 determines export classification; Section 3 assesses technical characteristics; Section 4 identifies destination restrictions; Section 5 establishes screening procedures; Section 6 defines compliance program.

## 2 Export Classification

> Determine whether product is subject to EAR, ITAR, or both, and assign appropriate classification.

### 2.1 Jurisdiction Determination

| Question | Answer | Implication |
| --- | --- | --- |
| Is product specifically designed, developed, or modified for military application? | [ ] Yes / [ ] No | If Yes: Likely ITAR (USML) jurisdiction |
| Is product on United States Munitions List (USML)? | [ ] Yes / [ ] No | If Yes: ITAR applies, DDTC jurisdiction |
| Is product a defense article, defense service, or technical data? | [ ] Yes / [ ] No | If Yes: ITAR applies |
| Is product subject to jurisdiction of another US agency (NRC, DOE, etc.)? | [ ] Yes / [ ] No | If Yes: Specialized export controls apply |
| If none of above apply, is product subject to EAR? | [ ] Yes / [ ] No | Default: EAR applies (unless publicly available, excluded) |

**Jurisdictional Outcome**:
- [x] **EAR (Commerce)**: Product subject to Export Administration Regulations, classify using ECCN
- [ ] **ITAR (State)**: Product subject to International Traffic in Arms Regulations, classify using USML category
- [ ] **Not Subject**: Product is publicly available, excluded from EAR/ITAR (rare)
- [ ] **Multiple Jurisdictions**: Product has components under different jurisdictions (assess separately)

### 2.2 EAR Classification (If Applicable)

#### 2.2.1 ECCN Determination

**Process**:
1. **Review Commerce Control List (CCL)**: 10 categories, 5 product groups
2. **Identify applicable category and group**: Based on technical characteristics
3. **Self-classify or request BIS classification**: Self-classify using published criteria, or submit formal classification request
4. **Document classification rationale**: Record ECCN, basis for classification, date

**CCL Categories**:
- **0**: Nuclear Materials, Facilities, and Equipment
- **1**: Materials, Chemicals, Microorganisms, and Toxins
- **2**: Materials Processing
- **3**: Electronics
- **4**: Computers
- **5**: Telecommunications and Information Security (encryption focus)
- **6**: Sensors and Lasers
- **7**: Navigation and Avionics
- **8**: Marine
- **9**: Aerospace and Propulsion

**CCL Product Groups**:
- **A**: Systems, Equipment, and Components
- **B**: Test, Inspection, and Production Equipment
- **C**: Materials
- **D**: Software
- **E**: Technology (technical data)

#### 2.2.2 Software Classification

**Is product software?** [ ] Yes / [ ] No

**If Yes, common ECCNs for software**:

| ECCN | Description | Key Characteristics | License Requirements |
| --- | --- | --- | --- |
| **5D002** | Information security software | Encryption > 56-bit symmetric, > 512-bit asymmetric | License Exception ENC (mass market), or License Exception TSU (publicly available) |
| **5D992** | Mass market encryption software | Encryption, but mass market | EAR99 or 5D992 with License Exception |
| **3D001** | Electronic software | CAD, semiconductor design, signal processing | Country-specific licenses |
| **EAR99** | Not elsewhere specified | Doesn't meet criteria for specific ECCN | Generally no license required (except embargoed countries) |

**Product ECCN**: [Assigned ECCN]

**Classification Rationale**: [Why this ECCN applies - cite technical characteristics]

**Classification Date**: [yyyy-mm-dd]

**Classification Method**: [Self-classified / BIS Commodity Classification Request]

#### 2.2.3 Encryption Analysis (Critical for Software)

**Does product contain encryption?** [ ] Yes / [ ] No

**If Yes, encryption details**:

| Encryption Type | Algorithm | Key Length | Purpose | Open Source? |
| --- | --- | --- | --- | --- |
| Symmetric encryption | [AES, 3DES, etc.] | [128, 192, 256-bit] | [Data at rest, communications] | [ ] Yes / [ ] No |
| Asymmetric encryption | [RSA, ECC, etc.] | [2048, 4096-bit] | [Key exchange, signatures] | [ ] Yes / [ ] No |
| Hashing | [SHA-256, SHA-512, etc.] | [N/A] | [Integrity, passwords] | [ ] Yes / [ ] No |

**Encryption Classification**:
- **Symmetric > 56-bit**: Triggers ECCN 5D002 (information security)
- **Asymmetric > 512-bit**: Triggers ECCN 5D002
- **Exception ENC (mass market)**: Generally available encryption products qualify for License Exception ENC
- **Exception TSU (publicly available)**: Open source software qualifies for License Exception TSU

**License Exception Eligibility**:
- [ ] **License Exception ENC**: Mass market encryption, self-classification report required (submit to BIS within 30 days of first commercial shipment)
- [ ] **License Exception TSU**: Publicly available (open source), notification to BIS required
- [ ] **No exception**: License required for certain destinations

**Annual Reporting**: If using License Exception ENC, submit annual self-classification report to BIS by February 1

### 2.3 ITAR Classification (If Applicable)

**Is product a defense article?** [ ] Yes / [ ] No

**USML Category**: [Category I-XXI, if applicable]

**Defense Article Characteristics**:
- [ ] Specifically designed for military application
- [ ] Listed on USML (United States Munitions List)
- [ ] Technical data related to defense articles

**Registration Requirement**: ITAR-controlled items require DDTC registration ($3,000 annual fee)

**License Requirement**: ITAR export licenses required for all international transfers (including Canada)

**Note**: ITAR controls are significantly stricter than EAR. Legal counsel review mandatory.

### 2.4 Classification Documentation

**Classification Summary**:
- **Jurisdiction**: [EAR / ITAR / Not Subject]
- **Classification**: [ECCN / USML Category / N/A]
- **Classification Date**: [yyyy-mm-dd]
- **Classified By**: [Legal Liaison / External Counsel / BIS]
- **License Exceptions Available**: [ENC, TSU, etc.]
- **License Requirements**: [None / Country-specific / Universal]

**Classification Record Location**: [Document repository path]

**Review Frequency**: Annual, or when product significantly changes

## 3 Destination Controls

> Identify countries and end-users prohibited or restricted for export.

### 3.1 Embargoed Countries

**Comprehensive Embargoes** (export generally prohibited):

| Country | Administering Agency | Scope | Exceptions |
| --- | --- | --- | --- |
| Cuba | OFAC (Treasury) | Comprehensive embargo | Limited humanitarian, informational materials |
| Iran | OFAC (Treasury) | Comprehensive embargo | Very limited exceptions |
| North Korea | OFAC (Treasury) | Comprehensive embargo | Extremely limited exceptions |
| Syria | OFAC (Treasury) | Comprehensive embargo | Limited humanitarian |
| Crimea region (Ukraine) | OFAC (Treasury) | Regional embargo | Very limited exceptions |

**Policy**: Exports to embargoed countries are PROHIBITED unless specific OFAC license obtained (rare).

### 3.2 Country Group Restrictions (EAR)

**EAR Country Groups**: Determine license requirements based on ECCN and destination

| Country Group | Description | Example Countries | Typical License Requirement for 5D002 |
| --- | --- | --- | --- |
| **A:1** | NATO allies (less Cuba, Turkey) | UK, France, Germany, Canada (with caveats) | License Exception available (ENC, TSU) |
| **A:5** | Other allies | Australia, Japan, South Korea | License Exception available |
| **D:1** | Comprehensive embargo | Cuba, Iran, North Korea, Syria | License required (likely denied) |
| **E:1** | Terrorism concern | Iran, North Korea, Sudan, Syria | License required (likely denied) |
| **E:2** | Encryption concern | Belarus, China, Russia, Venezuela, and others | License may be required |

**Country-Specific License Requirements**: [List countries requiring license for product ECCN]

**License Exception Availability**: [List countries where License Exception ENC or TSU available]

### 3.3 Restricted End-Users and End-Uses

**Military End-Use/End-User (MEU) Rule** (EAR Part 744.21):
- Prohibits export to military end-users in China, Russia, Venezuela without license
- **Military end-user**: Armed forces, national police, intelligence services, defense contractors

**Foreign Direct Product (FDP) Rule**:
- US technology used to produce foreign-made products may be subject to EAR
- Significant for China and Russia (Entity List entities)

**Entity List** (EAR Part 744 Supplement 4):
- List of entities (companies, organizations) prohibited from receiving US exports without license
- Common reasons: National security, weapons proliferation, human rights violations

**Policy**: Screen all international customers and end-users against restricted party lists before export.

### 3.4 Nuclear, Chemical, Biological (WMD) Restrictions

**Proliferation Concern**:
- Exports to end-users involved in weapons of mass destruction (WMD) programs prohibited
- Requires end-user statements, know-your-customer due diligence

**Red Flags**:
- Customer reluctant to provide end-use information
- Product specifications inconsistent with customer's line of business
- Customer requests unusual shipping or payment terms
- Customer located in country of WMD concern

**Policy**: If WMD red flags detected, escalate to Legal Liaison immediately, do not export.

## 4 Restricted Party Screening

> Screen customers, partners, and intermediaries against US government denied/restricted party lists.

### 4.1 Screening Requirements

**Who Must Be Screened**:
- International customers (purchasers, licensees, distributors)
- End-users (if different from customer)
- Intermediaries (freight forwarders, banks, sales agents)
- Partners (resellers, integration partners)
- Employees (if dual-nationals or non-US persons accessing controlled technology)

**Screening Frequency**:
- **Pre-transaction**: Before accepting order, signing contract, providing demo
- **Ongoing**: Quarterly re-screening of active customers
- **Ad-hoc**: When customer information changes (name, address, ownership)

### 4.2 Restricted Party Lists

**Primary Lists** (must screen against all):

| List | Agency | Description | Consequence |
| --- | --- | --- | --- |
| **SDN** (Specially Designated Nationals) | OFAC (Treasury) | Individuals/entities subject to US sanctions | Transactions PROHIBITED, assets frozen |
| **Entity List** | BIS (Commerce) | Entities restricted from receiving US exports | License required (typically denied) |
| **Denied Persons List** | BIS (Commerce) | Individuals/entities denied export privileges | Transactions PROHIBITED |
| **Unverified List** | BIS (Commerce) | Entities BIS unable to verify legitimate | Enhanced due diligence required |
| **Military End-User List** | BIS (Commerce) | Chinese and Russian military end-users | License required |
| **Debarred List** | DDTC (State) | Entities denied ITAR export privileges | Transactions PROHIBITED |

**Consolidated Screening List**: BIS provides Consolidated Screening List combining multiple lists: https://www.trade.gov/consolidated-screening-list

### 4.3 Screening Process

#### 4.3.1 Screening Tool

**Tool Options**:
- **Manual**: Search Consolidated Screening List website (acceptable for low-volume)
- **Automated (Commercial)**: Thomson Reuters World-Check, Dow Jones Risk & Compliance, LexisNexis Bridger Insight (recommended for high-volume)
- **Automated (Open Source)**: Custom scripts using Consolidated Screening List API

**Selected Tool**: [Tool name]

**Integration**: [Manual / Integrated with CRM / Integrated with order management system]

#### 4.3.2 Screening Procedure

**Step 1: Collect Customer Information**
- Legal entity name (exact match, variations, DBA names)
- Address (headquarters, branch offices)
- Key personnel (CEO, beneficial owners)
- Parent company, subsidiaries
- Country of incorporation

**Step 2: Screen Against Lists**
- Run name, address, personnel through screening tool
- Check exact matches and close matches (fuzzy matching for misspellings)
- Document screening results (date, lists checked, results)

**Step 3: Evaluate Matches**
- **Exact match**: STOP - Do not export, escalate to Legal Liaison immediately
- **Close match**: Investigate - Verify whether match is same entity (different company with similar name, or actual match)
- **No match**: Proceed, document clear screening result

**Step 4: Document Results**
- Record screening date, lists checked, results (clear/match), reviewer name
- Store in customer record for audit trail
- Re-screen quarterly or when customer information changes

#### 4.3.3 Match Resolution

**If Potential Match Detected**:
1. **Gather additional information**: Request additional customer details (date of birth, passport number, business registration)
2. **Compare details**: Determine if match is same entity or false positive
3. **Escalate if uncertain**: If cannot definitively rule out match, escalate to Legal Liaison
4. **Document decision**: Record rationale for proceeding or rejecting transaction

**If Confirmed Match**:
1. **STOP immediately**: Do not export, do not accept payment, do not provide services
2. **Notify Legal Liaison**: Immediate escalation
3. **Reject transaction**: Inform customer transaction cannot proceed due to regulatory restrictions
4. **Report to authorities** (if required): OFAC SDN matches may require reporting
5. **Block assets** (if SDN): If payment received, freeze and report to OFAC

### 4.4 Screening Documentation

**Screening Record Template**:

| Date | Customer Name | Customer Address | Lists Checked | Result | Match Details (if any) | Resolution | Screened By |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [yyyy-mm-dd] | [Name] | [Address] | SDN, Entity, Denied Persons, Unverified, Debarred | [Clear/Match] | [Details] | [Proceed/Reject/Investigate] | [Name] |

**Retention Period**: 5 years (EAR recordkeeping requirement)

**Audit Trail**: All screening records stored in [location], accessible for BIS/OFAC audits

## 5 Export Compliance Program

> Establish policies, procedures, training, and recordkeeping to ensure ongoing export compliance.

### 5.1 Export Compliance Policy

**Policy Statement**:
[Organization Name] is committed to full compliance with all US export control laws and regulations, including the Export Administration Regulations (EAR), International Traffic in Arms Regulations (ITAR), and Office of Foreign Assets Control (OFAC) sanctions. All employees, contractors, and partners involved in international business must comply with this policy.

**Scope**: All international transactions, including:
- Product sales and licenses
- Software downloads and cloud access
- Technical support and services
- Technology sharing with foreign nationals (deemed exports)

**Responsibilities**:
- **Legal Liaison**: Export compliance program management, classification, screening oversight
- **Sales Team**: Pre-transaction screening, customer due diligence, red flag identification
- **Engineering Team**: Technology release controls, foreign national access management
- **Shipping/Operations**: Export documentation, shipping compliance
- **All Employees**: Export control awareness, red flag reporting

### 5.2 Export Compliance Procedures

#### 5.2.1 Transaction Review Procedure

**For Every International Transaction**:
1. **Classify product**: Verify current ECCN/USML classification
2. **Screen parties**: Screen customer, end-user, intermediaries against restricted party lists
3. **Check destination**: Verify destination country, license requirements
4. **Assess end-use**: Verify legitimate civilian end-use, no WMD red flags
5. **Determine license requirement**: Based on classification, destination, end-user, end-use
6. **Obtain license if required**: Submit license application to BIS/DDTC, await approval
7. **Document transaction**: Maintain export records for 5 years
8. **Ship or deliver**: After all approvals obtained

#### 5.2.2 Deemed Export Controls

**Deemed Export**: Release of controlled technology to foreign nationals in the US (considered export to home country)

**Controlled Activities**:
- Foreign national employees accessing source code, technical specifications
- Foreign national students/interns on projects involving controlled technology
- Foreign nationals visiting facilities, observing controlled technology

**Controls**:
- Screen foreign nationals against restricted party lists (including home country)
- Technology Control Plan (TCP): Document what technology accessible, by whom, controls
- Export license (if required): Obtain BIS license for deemed exports to certain countries
- Need-to-know access: Limit foreign national access to non-controlled technology where possible

### 5.3 Recordkeeping Requirements

**Required Records** (retain 5 years from export date):
- Product classifications (ECCN, classification rationale)
- Restricted party screening results
- Export license applications and approvals (if applicable)
- Commercial invoices, packing lists, bills of lading
- End-user statements, know-your-customer documentation
- Correspondence with BIS, DDTC, OFAC
- Self-classification reports (License Exception ENC)
- Training records

**Storage Location**: [Centralized repository, access-controlled]

**Retention Enforcement**: Automated deletion after 5 years + current fiscal year

### 5.4 Training and Awareness

**Annual Export Control Training** (mandatory for all employees involved in international business):
- Export control overview (EAR, ITAR, OFAC)
- Product classification
- Destination controls (embargoed countries, restricted end-users)
- Restricted party screening
- Red flag identification
- Recordkeeping requirements
- Consequences of violations

**Training Tracking**: [Learning management system], records maintained for audit

**Additional Training**:
- New hire orientation (export control module)
- Role-specific training (Sales: customer screening; Engineering: deemed exports)
- Annual refresher training

### 5.5 Audits and Self-Assessment

**Internal Export Compliance Audit**:
- **Frequency**: Annual
- **Scope**: Transaction sampling, screening records, classification accuracy, recordkeeping
- **Owner**: Legal Liaison or external auditor
- **Deliverable**: Audit report with findings and corrective actions

**Self-Assessment Checklist**:
- [ ] Product classifications current and documented
- [ ] All international transactions screened against restricted party lists
- [ ] No transactions with embargoed countries or SDN entities
- [ ] Export licenses obtained where required
- [ ] Records retained for 5 years
- [ ] Employees trained annually
- [ ] Self-classification reports submitted (if License Exception ENC)

### 5.6 Violations and Voluntary Self-Disclosure

**Potential Violations** (examples):
- Export to embargoed country
- Export to SDN or Entity List entity
- Export without required license
- Failure to maintain records

**Consequences**:
- Civil penalties: Up to $330,000 per violation (EAR)
- Criminal penalties: Up to $1,000,000 fine and 20 years imprisonment (willful violations)
- Denied export privileges (loss of export authorization)
- Reputational damage, customer loss

**Voluntary Self-Disclosure (VSD)**:
- If violation discovered, consider voluntary self-disclosure to BIS/DDTC/OFAC
- VSD is mitigating factor (may reduce penalties significantly)
- Legal counsel review required before VSD submission

**Process**:
1. **Discover potential violation**: Internal audit, employee report, customer inquiry
2. **Immediate containment**: Stop further exports, secure records
3. **Investigate**: Gather facts, assess scope and severity
4. **Legal review**: Consult external export counsel, assess VSD vs. non-disclosure
5. **Voluntary self-disclosure** (if recommended): Submit VSD letter to BIS/DDTC/OFAC
6. **Corrective actions**: Implement remedial measures, enhanced compliance program
7. **Respond to government inquiries**: Cooperate fully with investigation

## 6 Country-Specific Considerations

> Highlight export considerations for key markets.

### 6.1 China

**Restrictions**:
- Military End-User (MEU) rule: License required for exports to Chinese military, police, defense contractors
- Entity List: Many Chinese companies on Entity List (Huawei, SMIC, etc.), license required
- Foreign Direct Product (FDP) rule: Broad controls on products made with US technology

**Compliance Steps**:
- Screen customers thoroughly (Entity List, MEU List)
- Verify end-use (civilian vs. military application)
- Assess FDP rule applicability (if re-exporting to China)
- Enhanced due diligence (China high-risk destination)

### 6.2 Russia

**Restrictions**:
- Broad sanctions following Ukraine invasion (2022+)
- Military End-User (MEU) rule
- Entity List (many Russian entities)
- Export restrictions on high-tech items (EAR Part 746)

**Compliance Steps**:
- Review current sanctions (frequently updated)
- Screen customers (SDN, Entity List, MEU List)
- Verify License Exception eligibility (many exceptions suspended for Russia)

### 6.3 European Union

**Friendly Jurisdiction**:
- Generally license-free under License Exception ENC (encryption)
- No comprehensive embargo (except specific entities)

**Considerations**:
- EU has own export controls (dual-use regulation), may require separate EU export license
- Coordinate with EU legal counsel for EU exports (beyond US jurisdiction)

### 6.4 Canada

**Special Relationship**:
- Canada generally treated favorably under EAR (Country Group A:1)
- ITAR exports to Canada still require license (defense articles)

**License Exception NLR**: Many EAR items eligible for "No License Required" to Canada

## Appendices

### Appendix A: Export Control Contacts

| Authority | Contact | Website | Purpose |
| --- | --- | --- | --- |
| BIS (Bureau of Industry and Security) | (202) 482-4811 | www.bis.doc.gov | EAR classification, license applications, violations |
| DDTC (Directorate of Defense Trade Controls) | (202) 663-1282 | www.pmddtc.state.gov | ITAR registration, licenses |
| OFAC (Office of Foreign Assets Control) | (202) 622-2490 | www.treasury.gov/ofac | Sanctions, SDN list |
| Consolidated Screening List | N/A | www.trade.gov/consolidated-screening-list | Restricted party screening |

### Appendix B: Export Control Forms

- **BIS-748P**: Multipurpose Application (license application)
- **BIS Encryption Registration**: Self-classification report (License Exception ENC)
- **DS-2032**: Statement of Registration (ITAR)
- **DSP-5**: Permanent Export License (ITAR)

### Appendix C: Export Classification Worksheet

**Product**: [Name]
**Classification Date**: [yyyy-mm-dd]

**Technical Characteristics**:
- [ ] Contains encryption: [Yes/No] - [Algorithm, key length]
- [ ] Dual-use technology: [Yes/No] - [Description]
- [ ] Military application: [Yes/No] - [Description]

**Jurisdictional Analysis**:
- [ ] USML-listed: [Yes/No]
- [ ] Specifically designed for military: [Yes/No]
- [ ] Subject to EAR: [Yes/No - default if not ITAR]

**ECCN Determination**:
- Category: [0-9]
- Group: [A-E]
- ECCN: [5D002, EAR99, etc.]
- Rationale: [Why this ECCN]

**License Exception Eligibility**:
- [ ] ENC (mass market encryption)
- [ ] TSU (publicly available)
- [ ] NLR (no license required)

**Classified By**: [Legal Liaison signature]

## Agent Notes

- Prioritize export classification early (Inception phase) to avoid delays
- Automate restricted party screening (integrate with CRM/sales system)
- Encrypt products generally qualify for License Exception ENC (mass market), but self-classification report required
- China and Russia are high-risk destinations, enhanced due diligence mandatory
- Maintain 5-year export records for BIS audit readiness
- Train sales team on red flags and screening procedures (first line of defense)
- Consider voluntary self-disclosure if violation discovered (mitigates penalties)
- Verify Automation Outputs entry is satisfied before signaling completion
