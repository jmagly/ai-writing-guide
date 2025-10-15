# Data Sovereignty Template

## Cover Page

- `Project Name`
- `Data Sovereignty and Cross-Border Transfer Assessment`
- `Version 1.0`

## Revision History

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| `dd/mmm/yy` | `x.x` | `<details>` | `<name>` |

## Ownership & Collaboration

- Document Owner: Legal Liaison
- Contributor Roles: Privacy Officer, Cloud Architect, Security Gatekeeper
- Automation Inputs: Data flow diagrams, cloud region configurations, customer location data
- Automation Outputs: Data residency compliance reports, transfer mechanism tracking, region mapping

## 1 Introduction

> Assess data residency requirements and cross-border transfer mechanisms to ensure compliance with jurisdictional data sovereignty laws.

### 1.1 Purpose

This document identifies data residency obligations, maps data to appropriate storage regions, establishes lawful cross-border transfer mechanisms, and tracks data localization compliance.

### 1.2 Scope

This document covers:
- Data residency requirements by jurisdiction (EU, China, Russia, India, etc.)
- Cross-border data transfer mechanisms (SCCs, BCRs, adequacy decisions)
- Cloud region selection and configuration
- Data localization laws and enforcement
- Transfer Impact Assessments (TIAs)

### 1.3 Definitions, Acronyms, and Abbreviations

- **SCCs**: Standard Contractual Clauses (GDPR Article 46)
- **BCRs**: Binding Corporate Rules (GDPR Article 47)
- **TIA**: Transfer Impact Assessment (post-Schrems II requirement)
- **Adequacy Decision**: EU Commission determination that third country has adequate data protection
- **Data Residency**: Requirement that data remain within specific geographic boundaries
- **Data Localization**: Laws requiring data to be stored and processed within national borders
- **Data Subject**: Individual whose personal data is processed

### 1.4 References

- `privacy-impact-assessment-template.md` - Data processing details
- `regulatory-compliance-framework-template.md` - GDPR compliance
- `architecture-notebook-template.md` - Data storage architecture
- `contract-management-template.md` - Customer DPAs

### 1.5 Overview

Section 2 identifies data residency requirements; Section 3 maps data to regions; Section 4 establishes transfer mechanisms; Section 5 implements localization controls; Section 6 defines monitoring procedures.

## 2 Data Residency Requirements by Jurisdiction

> Identify jurisdictional data residency obligations based on data subjects' locations and applicable laws.

### 2.1 European Union (GDPR)

**Applicable Law**: General Data Protection Regulation (GDPR)

**Residency Requirement**: No explicit residency requirement (data can be stored outside EU), BUT cross-border transfers require lawful transfer mechanism.

**Transfer Restrictions**:
- Transfers to "adequate" countries (UK, Canada, Japan, etc.): No restrictions
- Transfers to "non-adequate" countries (US, China, India, etc.): Requires SCCs, BCRs, or derogation

**Post-Schrems II Requirements** (2020):
- Transfer Impact Assessment (TIA) required for all non-EU transfers
- Assess destination country's surveillance laws, government access
- Implement supplementary measures (encryption, pseudonymization) if needed

**Enforcement**: National Data Protection Authorities (DPAs), fines up to €20M or 4% revenue

**Project Data**:
- **EU Data Subjects**: [Count, data types]
- **Current Storage Location**: [Cloud region]
- **Transfer Mechanism**: [SCC / BCR / Adequacy / N/A]

### 2.2 United Kingdom (UK GDPR)

**Applicable Law**: UK GDPR (post-Brexit)

**Status**: Similar to EU GDPR, UK has adequacy decision from EU (allows EU-UK transfers)

**Transfer Requirements**: Same as EU GDPR (SCCs, TIA for non-adequate countries)

**UK Adequacy Countries**: EU/EEA, plus countries with EU adequacy decisions

**Project Data**:
- **UK Data Subjects**: [Count, data types]
- **Current Storage Location**: [Cloud region]
- **Transfer Mechanism**: [SCC / Adequacy / N/A]

### 2.3 China (Personal Information Protection Law - PIPL)

**Applicable Law**: Personal Information Protection Law (PIPL), effective November 2021

**Residency Requirement**:
- **Critical Information Infrastructure Operators (CIIOs)**: Must store personal data in China (strict localization)
- **Large-scale processors**: Must store personal data in China OR conduct security assessment for cross-border transfers
- **Others**: May transfer abroad with consent + security assessment OR standard contract

**Transfer Mechanisms**:
- Security assessment by Cyberspace Administration of China (CAC)
- Standard contract (CAC-approved template)
- Individual consent (for small-scale transfers)

**Enforcement**: CAC, fines up to RMB 50M or 5% revenue, criminal liability possible

**Project Data**:
- **Chinese Data Subjects**: [Count, data types]
- **CIIO Status**: [ ] Yes / [ ] No
- **Current Storage Location**: [China region / Outside China]
- **Transfer Mechanism**: [Security assessment / Standard contract / Consent / N/A]
- **Compliance Status**: [Compliant / Under review / Non-compliant]

### 2.4 Russia (Federal Law No. 242-FZ)

**Applicable Law**: Federal Law No. 242-FZ (Data Localization Law), effective September 2015

**Residency Requirement**: Russian citizens' personal data must be stored on servers physically located in Russia

**Storage Requirement**: Database recording, systematization, accumulation, storage must occur in Russia FIRST, before any cross-border transfer

**Cross-Border Transfers**: Allowed AFTER data stored in Russia first

**Enforcement**: Roskomnadzor (Federal Service for Supervision of Communications), fines, blocking of non-compliant services

**Project Data**:
- **Russian Data Subjects**: [Count, data types]
- **Current Storage Location**: [Russia region / Outside Russia]
- **Compliance Strategy**: [Russia-first storage / Geo-blocking Russian users / Service not offered in Russia]

### 2.5 India (Personal Data Protection Bill - Draft)

**Applicable Law**: Personal Data Protection Bill (PDPB) - draft legislation, not yet enacted

**Proposed Residency Requirement**:
- **Sensitive personal data**: Copy must be stored in India (mirror requirement)
- **Critical personal data**: Must be processed only in India (strict localization)

**Status**: Legislation pending, requirements subject to change

**Project Data**:
- **Indian Data Subjects**: [Count, data types]
- **Current Storage Location**: [India region / Outside India]
- **Compliance Strategy**: [Await legislation / Proactive India storage / Service not offered in India]

### 2.6 Brazil (LGPD)

**Applicable Law**: Lei Geral de Proteção de Dados (LGPD), effective September 2020

**Residency Requirement**: No explicit residency requirement (similar to GDPR)

**Transfer Requirements**: Transfers to adequate countries, or use of SCCs, BCRs, or other safeguards

**Adequacy**: Brazil recognizes EU, UK, and several others as adequate

**Enforcement**: ANPD (National Data Protection Authority), fines up to BRL 50M or 2% revenue

**Project Data**:
- **Brazilian Data Subjects**: [Count, data types]
- **Current Storage Location**: [Cloud region]
- **Transfer Mechanism**: [Adequacy / SCC / N/A]

### 2.7 Other Jurisdictions

| Jurisdiction | Data Residency Requirement | Cross-Border Transfer Mechanism | Enforcement Authority |
| --- | --- | --- | --- |
| Australia | No explicit residency | Privacy safeguards required | OAIC |
| Canada | No explicit residency (sector-specific) | Adequacy from EU, contracts | Privacy Commissioners |
| Japan | No explicit residency | Adequacy from EU, consent | PPC |
| South Korea | No explicit residency | Information sharing agreements | PIPC |
| Singapore | No explicit residency | Accountability, consent | PDPC |
| Switzerland | No explicit residency (EU GDPR-like) | Adequacy from EU | FDPIC |
| Vietnam | Localization for certain sectors | Government approval | MIC |

**Project Expansion**: If expanding to new jurisdictions, conduct data sovereignty assessment for each.

## 3 Data-to-Region Mapping

> Map personal data to appropriate cloud regions based on data subject locations and residency requirements.

### 3.1 Data Classification

| Data Type | Contains Personal Data? | Data Subject Locations | Residency Requirement | Target Storage Region |
| --- | --- | --- | --- | --- |
| User profile (name, email) | Yes | EU, US, UK | EU: Transfer mechanism required | EU (Frankfurt), US (Virginia), UK (London) |
| Payment information | Yes | EU, US | EU: Transfer mechanism; PCI-DSS | EU (Frankfurt), US (Virginia) |
| Usage analytics | Yes (pseudonymized) | Global | No specific requirement | US (Virginia) - centralized |
| System logs | Yes (may contain IP, user ID) | Global | EU: Transfer mechanism | EU (Frankfurt), US (Virginia) - regional |
| Support tickets | Yes (may contain PII) | Global | EU: Transfer mechanism | EU (Frankfurt), US (Virginia) - regional |

### 3.2 Cloud Region Selection

#### 3.2.1 Available Regions

**Cloud Provider**: [AWS / Azure / GCP / Other]

**Regions Used**:

| Region ID | Geographic Location | Country | Data Sovereignty Considerations | Services Used |
| --- | --- | --- | --- | --- |
| eu-central-1 | Frankfurt | Germany (EU) | EU GDPR-compliant, EU data residency | Compute, database, storage |
| us-east-1 | Virginia | United States | Non-adequate (requires SCC), CLOUD Act jurisdiction | Compute, database, storage |
| uk-south-1 | London | United Kingdom | UK GDPR-compliant, post-Brexit considerations | Compute, database, storage |
| cn-north-1 | Beijing | China | PIPL-compliant, operated by local partner | Compute, database, storage |

#### 3.2.2 Regional Data Routing

**Routing Logic**:
1. **User registration**: Determine user location (IP geolocation, self-declared country)
2. **Data residency assignment**: Assign user to regional data center based on location
3. **Data storage**: Store personal data in assigned region
4. **Data processing**: Process data in assigned region (EU data in EU region, etc.)
5. **Cross-border access**: If access from different region needed, use transfer mechanisms

**Example**:
- **EU user** → Data stored in eu-central-1 (Frankfurt)
- **US user** → Data stored in us-east-1 (Virginia)
- **Chinese user** → Data stored in cn-north-1 (Beijing)

### 3.3 Data Residency Architecture

#### 3.3.1 Regional Data Isolation

**Architecture Pattern**: [Multi-region active-active / Multi-region active-passive / Regional silos]

**Data Isolation Level**:
- [ ] **Full isolation**: EU data never leaves EU, separate databases per region
- [ ] **Partial isolation**: Primary storage regional, limited cross-border replication for resilience
- [ ] **Centralized with encryption**: All data in one region, encrypted per-region keys

**Selected Pattern**: [Description, rationale]

#### 3.3.2 Cross-Region Data Flows

**Legitimate Cross-Border Access Scenarios**:

| Scenario | From Region | To Region | Data Type | Lawful Basis | Transfer Mechanism | Frequency |
| --- | --- | --- | --- | --- | --- | --- |
| Customer support | EU | US | Support ticket, user profile | Legitimate interest | SCC with support vendor | Per support request |
| Analytics aggregation | EU | US | Aggregated analytics (no PII) | Legitimate interest | N/A (anonymized) | Daily batch |
| Backup and DR | EU | US | Full database backup | Legal obligation (business continuity) | SCC | Daily encrypted backup |

**Access Controls**: Cross-region access logged, audited, requires justification

## 4 Cross-Border Transfer Mechanisms

> Establish lawful mechanisms for transferring personal data across borders.

### 4.1 EU Standard Contractual Clauses (SCCs)

**Applicable**: Transfers from EU/EEA to non-adequate countries (US, China, India, etc.)

**SCCs Version**: EU Commission SCCs (June 2021) - Module [One/Two/Three/Four]

**SCC Modules**:
- **Module One**: Controller to Controller
- **Module Two**: Controller to Processor (most common for SaaS)
- **Module Three**: Processor to Processor
- **Module Four**: Processor to Controller

**Project SCCs**:

| Transfer | Data Exporter | Data Importer | SCC Module | Signature Date | Status |
| --- | --- | --- | --- | --- | --- |
| EU customer data to US vendor (analytics) | [Company] (Controller) | [Vendor] (Processor) | Module Two | [yyyy-mm-dd] | [Signed/Pending] |
| EU customer data to US support team | [Company EU] (Controller) | [Company US] (Controller) | Module One | [yyyy-mm-dd] | [Signed/Pending] |

**SCC Documentation**: Signed SCCs stored in [location], attached to vendor DPAs

#### 4.1.1 Transfer Impact Assessment (TIA)

**Post-Schrems II Requirement**: For each SCC, conduct Transfer Impact Assessment

**TIA Steps**:
1. **Identify transfer**: Data types, destination country, recipient
2. **Assess destination country laws**: Government access to data (CLOUD Act, FISA, etc.)
3. **Assess practical safeguards**: Encryption, access controls, pseudonymization
4. **Determine adequacy**: Are safeguards sufficient to protect data?
5. **Implement supplementary measures**: If not adequate, add encryption, minimize data, etc.
6. **Document TIA**: Record assessment, decision, supplementary measures

**Project TIA**:

| Transfer | Destination Country | Government Access Risk | Supplementary Measures | TIA Outcome | TIA Date |
| --- | --- | --- | --- | --- | --- |
| EU customer data to US support | United States | CLOUD Act, FISA 702 (limited scope) | End-to-end encryption, pseudonymization, no mass surveillance | Adequate with measures | [yyyy-mm-dd] |
| EU customer data to China analytics | China | National security laws, broad access | [Measures] | [Adequate/Inadequate] | [yyyy-mm-dd] |

**TIA Documentation**: TIA reports stored with SCCs

### 4.2 Binding Corporate Rules (BCRs)

**Applicable**: Intra-corporate transfers within multinational groups (EU to non-EU subsidiaries)

**Requirement**: Approved by EU DPA (lead supervisory authority), legally binding on all group entities

**Advantages**: One-time approval, no contract-by-contract SCCs, demonstrates compliance commitment

**Disadvantages**: Expensive, time-consuming (12-18 months approval), complex approval process

**Project BCRs**: [ ] Implemented / [ ] Under development / [ ] Not applicable (no EU subsidiaries)

**BCR Status**: [If applicable: BCR approval date, lead supervisory authority, scope]

### 4.3 Adequacy Decisions

**Applicable**: Transfers to countries EU Commission has determined have adequate data protection

**Adequate Countries** (as of 2024):
- Andorra, Argentina, Canada (commercial), Faroe Islands, Guernsey, Israel, Isle of Man, Japan, Jersey, New Zealand, South Korea, Switzerland, United Kingdom, Uruguay

**No Adequacy**: United States (Privacy Shield invalidated 2020), China, Russia, India, Brazil, Australia

**Project Transfers to Adequate Countries**:

| Transfer | Destination Country | Adequacy Status | Additional Safeguards | Status |
| --- | --- | --- | --- | --- |
| EU customer data to UK subsidiary | United Kingdom | Adequate | None (adequacy sufficient) | [Compliant] |
| EU customer data to Japanese partner | Japan | Adequate | None (adequacy sufficient) | [Compliant] |

**Note**: Even with adequacy, customer contracts may impose additional transfer restrictions

### 4.4 Derogations (GDPR Article 49)

**Applicable**: Specific situations where SCCs/BCRs not feasible

**Derogations**:
- **Explicit consent**: Data subject explicitly consents to transfer despite risks (limited to occasional, non-systematic transfers)
- **Contract performance**: Transfer necessary to perform contract with data subject
- **Legal claims**: Transfer necessary for legal claims
- **Public interest**: Transfer necessary for important public interest reasons
- **Vital interests**: Transfer necessary to protect vital interests

**Limitations**: Derogations are exceptions, not routine transfer mechanisms. Cannot rely on consent for systematic transfers.

**Project Use of Derogations**: [Describe if any, rationale, limitations]

### 4.5 China-Specific Mechanisms

**Applicable**: Transfers of Chinese personal data outside China (PIPL requirements)

**Mechanisms**:
- **Security Assessment**: CAC approval for cross-border transfers (CIIOs, large-scale processors)
- **Standard Contract**: CAC-approved standard contract (alternative to security assessment)
- **Individual Consent**: Explicit consent for each transfer (limited use)

**Project China Transfers**:

| Transfer | Data Volume | Mechanism | Status | Approval Date |
| --- | --- | --- | --- | --- |
| Chinese customer data to US HQ | [Records count] | [Security assessment / Standard contract / N/A] | [Approved/Pending/N/A] | [yyyy-mm-dd] |

**China Compliance Strategy**: [Localize data in China / Geo-block Chinese users / Seek CAC approval]

## 5 Data Localization Controls

> Implement technical and operational controls to enforce data residency requirements.

### 5.1 Technical Controls

#### 5.1.1 Regional Data Storage Configuration

**Database Configuration**:
- **Primary database region**: [Region ID]
- **Read replicas**: [Regions]
- **Backup storage**: [Region]
- **Cross-region replication**: [Enabled / Disabled]

**Object Storage Configuration**:
- **Bucket region**: [Region ID]
- **Replication**: [Disabled / Same-region only / Cross-region with encryption]

**Compliance Verification**: Infrastructure-as-Code (Terraform, CloudFormation) enforces regional constraints

#### 5.1.2 Data Residency Enforcement

**Geo-Fencing**: Prevent accidental data migration to non-compliant regions

**Implementation**:
- Cloud provider policy: Restrict resource creation to approved regions
- IAM policies: Deny cross-region data transfer actions
- Monitoring: Alert on cross-region data access attempts

**Example (AWS IAM Policy)**:

```json
{
  "Effect": "Deny",
  "Action": ["s3:ReplicateObject", "rds:CreateDBInstanceReadReplica"],
  "Resource": "*",
  "Condition": {
    "StringNotEquals": {
      "aws:RequestedRegion": ["eu-central-1", "us-east-1", "uk-south-1"]
    }
  }
}
```

#### 5.1.3 Encryption for Cross-Border Transfers

**Encryption Standards**:
- **In transit**: TLS 1.3, AES-256 encryption
- **At rest**: AES-256 encryption, region-specific encryption keys

**Key Management**:
- **EU data**: Keys stored in EU region (AWS KMS eu-central-1)
- **US data**: Keys stored in US region (AWS KMS us-east-1)
- **Cross-region access**: Requires key decryption in source region

**Pseudonymization**: Where possible, pseudonymize data before cross-border transfer

### 5.2 Operational Controls

#### 5.2.1 Data Residency Policy

**Policy Statement**: Personal data of data subjects in jurisdictions with data residency requirements must be stored in compliant regions. Cross-border transfers require lawful transfer mechanisms (SCCs, BCRs, adequacy).

**Responsibilities**:
- **Legal Liaison**: Define residency requirements, approve transfer mechanisms
- **Privacy Officer**: Conduct TIAs, document transfers
- **Cloud Architect**: Implement regional architecture, enforce geo-fencing
- **Engineering**: Configure services per regional requirements, verify compliance

**Exceptions**: Any exception to data residency policy requires General Counsel approval

#### 5.2.2 Regional Access Controls

**Principle**: Data access should be regional where possible (EU data accessed by EU employees)

**Implementation**:
- **Role-based access control (RBAC)**: Assign access by region (EU admins access EU data)
- **Just-in-time access**: Cross-region access granted only when needed, time-limited, logged
- **Audit logging**: All cross-region data access logged and reviewed

**Cross-Region Access Approval**: Requires manager approval, documented justification

### 5.3 Vendor Data Processing Agreements (DPAs)

**Vendor Residency Requirements**: Vendors processing personal data must comply with data residency obligations

**DPA Terms**:
- **Processing location**: Vendor must process data in [specified regions]
- **Sub-processors**: Vendor must disclose sub-processor locations, obtain approval for non-compliant locations
- **Transfer mechanisms**: SCCs, BCRs, or adequacy required for cross-border processing
- **Audit rights**: Right to audit vendor's data residency compliance

**Vendor Review**:

| Vendor | Service | Data Processing Locations | SCCs in Place? | Sub-Processors | Compliance Status |
| --- | --- | --- | --- | --- | --- |
| AWS | Cloud infrastructure | EU, US, UK | Yes | [List] | Compliant |
| Datadog | Monitoring | EU, US | Yes | [List] | Compliant |
| Zendesk | Support ticketing | US | Yes | [List] | Under review (EU data in US) |

## 6 Monitoring and Compliance Verification

> Continuously monitor data residency compliance and verify controls effectiveness.

### 6.1 Data Residency Compliance Dashboard

**Metrics**:
- **Data storage by region**: [% EU data in EU regions, % US data in US regions]
- **Cross-border transfers**: [Count, data volume, transfer mechanisms]
- **Vendor compliance**: [Vendors with valid SCCs, TIA completion status]
- **Policy violations**: [Accidental cross-region transfers, unauthorized access]

**Dashboard Access**: Legal Liaison, Privacy Officer, Compliance Team

**Review Frequency**: Monthly

### 6.2 Compliance Audits

**Quarterly Data Residency Audit**:
1. **Verify regional data storage**: Sample user records, verify storage region matches user location
2. **Review cross-border transfers**: Verify SCCs/TIAs in place for all transfers
3. **Audit vendor compliance**: Verify vendor SOC 2 reports, DPAs, sub-processor disclosures
4. **Test geo-fencing**: Attempt to create resources in non-compliant regions, verify blocks
5. **Review access logs**: Sample cross-region access, verify justification and approval

**Audit Report**: Document findings, non-compliance issues, corrective actions

### 6.3 Regulatory Change Monitoring

**Data Sovereignty Regulations Evolve**: Monitor for new laws, enforcement actions, guidance

**Monitoring Sources**:
- **EU GDPR**: EDPB guidelines, CJEU decisions (Schrems cases), DPA guidance
- **China PIPL**: CAC announcements, enforcement actions
- **Russia**: Roskomnadzor guidance, blocking orders
- **Other jurisdictions**: IAPP newsletters, legal updates

**Process**:
1. **Detect regulatory change**: Legal team monitors updates
2. **Assess impact**: Does change affect data residency requirements?
3. **Update policy**: Modify data sovereignty template, transfer mechanisms
4. **Communicate**: Notify Engineering, Privacy, Product teams
5. **Implement changes**: Update architecture, contracts, processes
6. **Verify compliance**: Audit new requirements

### 6.4 Incident Response

**Data Residency Violation Scenarios**:
- Accidental data replication to non-compliant region
- Cross-region access without transfer mechanism
- Vendor sub-processor in non-approved location

**Response Process**:
1. **Detect violation**: Monitoring alert, audit finding, manual discovery
2. **Contain**: Stop further non-compliant transfers, restrict access
3. **Assess impact**: Data types, data subjects affected, jurisdictional risks
4. **Notify stakeholders**: Legal Liaison, Privacy Officer, affected data subjects (if breach)
5. **Remediate**: Delete data from non-compliant region, implement corrective controls
6. **Document**: Incident report, root cause analysis, preventive measures
7. **Regulatory reporting** (if required): GDPR breach notification if unauthorized transfer

## Appendices

### Appendix A: Data Sovereignty Contacts

| Jurisdiction | Regulator | Contact | Website |
| --- | --- | --- | --- |
| EU GDPR | European Data Protection Board (EDPB) | [contact] | edpb.europa.eu |
| EU GDPR (National DPAs) | [Country] DPA | [contact] | [website] |
| UK GDPR | Information Commissioner's Office (ICO) | [contact] | ico.org.uk |
| China PIPL | Cyberspace Administration of China (CAC) | [contact] | cac.gov.cn |
| Russia | Roskomnadzor | [contact] | rkn.gov.ru |

### Appendix B: Standard Contractual Clauses (SCCs)

**EU Commission SCCs (June 2021)**:
- Module One: Controller to Controller
- Module Two: Controller to Processor
- Module Three: Processor to Processor
- Module Four: Processor to Controller

**Download**: [Link to EU Commission SCC templates]

**Storage**: Signed SCCs stored in [contract repository path]

### Appendix C: Transfer Impact Assessment (TIA) Template

**Transfer Description**: [From region, to region, data types, recipient]

**Destination Country Assessment**:
- Government access laws: [Description, risk level]
- Surveillance programs: [Description, scope]
- Legal protections: [Due process, redress mechanisms]

**Supplementary Measures**:
- [ ] End-to-end encryption
- [ ] Pseudonymization
- [ ] Data minimization
- [ ] Contractual restrictions (no government disclosure without legal process + notification)

**Adequacy Determination**: [Adequate with measures / Inadequate / Transfer should not proceed]

**Approver**: [Legal Liaison signature, date]

## Agent Notes

- EU GDPR allows cross-border transfers with proper mechanisms (SCCs, BCRs), but Schrems II requires TIAs
- China PIPL requires localization for CIIOs and large-scale processors, cross-border transfers need CAC approval
- Russia requires Russia-first storage, cross-border transfers allowed after
- Use cloud provider regional isolation features (region-locked buckets, regional databases) to enforce data residency
- Automate geo-fencing to prevent accidental non-compliant transfers
- Conduct TIAs for all EU-to-non-adequate transfers, document supplementary measures
- Monitor regulatory changes closely (data sovereignty laws evolving rapidly)
- Verify Automation Outputs entry is satisfied before signaling completion
