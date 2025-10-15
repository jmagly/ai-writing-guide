# Threat Model Template

## Document Control

| Field | Value |
|-------|-------|
| System Name | `[System/Component Name]` |
| Version | `[e.g., 1.0]` |
| Date Created | `[YYYY-MM-DD]` |
| Last Updated | `[YYYY-MM-DD]` |
| Authors | `[Security Architect, System Architect]` |
| Reviewers | `[Product Owner, Security Team, Dev Lead]` |
| Status | `[Draft/In Review/Approved/Updated]` |
| Classification | `[Internal/Confidential]` |

## Executive Summary

### Purpose
Brief description of the system's business function and why threat modeling is being performed.

### Key Findings
- **Critical Risks**: `[Number]` identified, `[Number]` mitigated
- **High Risks**: `[Number]` identified, `[Number]` accepted with compensating controls
- **Attack Surface**: `[Number]` external entry points, `[Number]` internal interfaces
- **Compliance**: Addresses `[List frameworks: PCI DSS, GDPR, HIPAA, etc.]`

### Recommendations Summary
Top 3-5 security recommendations based on threat analysis.

## System Overview

### Business Context
- **Business Function**: What business problem does this solve?
- **User Population**: Who uses this system? (internal, customers, partners)
- **Data Sensitivity**: What types of data are processed?
- **Business Impact**: What happens if this system is compromised?
- **Criticality Level**: `[Critical/High/Medium/Low]`

### Technical Architecture

#### System Components
| Component | Type | Purpose | Trust Level |
|-----------|------|---------|-------------|
| `[Web App]` | `[Frontend]` | `[User interface]` | `[Untrusted]` |
| `[API Gateway]` | `[Service]` | `[Request routing]` | `[Semi-trusted]` |
| `[Auth Service]` | `[Service]` | `[Authentication]` | `[Trusted]` |
| `[Database]` | `[Data Store]` | `[Persistent storage]` | `[Trusted]` |

#### Technology Stack
| Layer | Technology | Version | Security Notes |
|-------|------------|---------|----------------|
| Frontend | `[React]` | `[18.x]` | `[CSP headers required]` |
| Backend | `[Node.js]` | `[20.x]` | `[Keep updated, scan deps]` |
| Database | `[PostgreSQL]` | `[15.x]` | `[Encryption at rest]` |
| Infrastructure | `[AWS/Azure/GCP]` | `[N/A]` | `[Use managed services]` |

### Architecture Diagram
```
[Include or reference architecture diagrams showing:
- Components and their relationships
- Trust boundaries (dotted lines)
- Data flows (arrows with labels)
- External systems and actors
- Network zones/segments]
```

## Asset Identification

### Information Assets
| Asset | Classification | Location | Protection Requirements |
|-------|---------------|----------|------------------------|
| User Credentials | `Restricted` | `Auth DB` | Hashing (bcrypt/scrypt), MFA |
| Personal Data (PII) | `Restricted` | `User DB` | Encryption at rest, audit logging |
| Session Tokens | `Confidential` | `Cache/Memory` | Short TTL, secure transmission |
| Business Logic | `Confidential` | `App Server` | Code obfuscation, integrity checks |
| Audit Logs | `Internal` | `Log Storage` | Tamper protection, retention policy |
| API Keys | `Restricted` | `Secrets Manager` | Rotation, least privilege |

### Threat Actors

#### External Actors
| Actor Type | Motivation | Capability | Likelihood |
|------------|------------|------------|------------|
| Cybercriminals | Financial gain | High (tools, exploits) | High |
| Hacktivists | Ideological | Medium | Low |
| Nation State | Espionage | Very High | Low |
| Script Kiddies | Fame/Fun | Low | Medium |
| Competitors | Business advantage | Medium | Low |

#### Internal Actors
| Actor Type | Motivation | Capability | Likelihood |
|------------|------------|------------|------------|
| Malicious Insider | Revenge/Profit | High (access) | Low |
| Careless Employee | None (accident) | Medium | High |
| Compromised Account | Varies | High | Medium |
| Third-Party/Vendor | Varies | Medium | Medium |

## Attack Surface Analysis

### External Entry Points
| Entry Point | Protocol | Authentication | Input Types | Validation |
|-------------|----------|---------------|-------------|------------|
| Web UI | `HTTPS` | `Username/Password + MFA` | `Forms, Files` | `Client + Server` |
| REST API | `HTTPS` | `OAuth 2.0` | `JSON` | `Schema validation` |
| Admin Portal | `HTTPS` | `SSO/SAML` | `Forms` | `Strict validation` |
| Webhook Endpoints | `HTTPS` | `HMAC signature` | `JSON` | `Schema + signature` |
| File Upload | `HTTPS` | `Session token` | `Binary files` | `Type, size, content` |

### Internal Interfaces
| Interface | From | To | Protocol | Security |
|-----------|------|-----|----------|----------|
| API to Database | `API Server` | `Database` | `TLS 1.3` | `mTLS, least privilege` |
| Cache Queries | `API Server` | `Redis` | `TLS` | `AUTH, network isolation` |
| Message Queue | `Services` | `Queue` | `AMQPS` | `SASL, encryption` |
| Service Mesh | `Microservices` | `Each other` | `mTLS` | `Zero trust, RBAC` |

### Trust Boundaries

1. **Internet → DMZ**: Public traffic enters through WAF/CDN
2. **DMZ → Application Tier**: Authenticated requests only
3. **Application → Data Tier**: Service accounts with least privilege
4. **Internal Network → Admin Access**: Privileged access management
5. **Third-Party Integrations**: API gateway with strict controls

## STRIDE Threat Analysis

### Threat Identification Methodology
Using STRIDE framework to systematically identify threats:
- **S**poofing: Authentication threats
- **T**ampering: Integrity threats
- **R**epudiation: Non-repudiation threats
- **I**nformation Disclosure: Confidentiality threats
- **D**enial of Service: Availability threats
- **E**levation of Privilege: Authorization threats

### Component-Level STRIDE Analysis

#### Frontend Application
| Threat Type | Specific Threat | Impact | Likelihood | Risk | Mitigation |
|-------------|-----------------|--------|------------|------|------------|
| Spoofing | Phishing site mimics UI | High | Medium | HIGH | Security headers, user education |
| Tampering | XSS payload injection | High | Medium | HIGH | CSP, input sanitization |
| Repudiation | User denies action | Low | Low | LOW | Audit logging |
| Info Disclosure | Sensitive data in browser | Medium | Medium | MEDIUM | No sensitive data client-side |
| Denial of Service | Resource exhaustion | Medium | Low | LOW | Rate limiting, CDN |
| Elevation | Session hijacking | High | Low | MEDIUM | Secure cookies, timeout |

#### API Gateway
| Threat Type | Specific Threat | Impact | Likelihood | Risk | Mitigation |
|-------------|-----------------|--------|------------|------|------------|
| Spoofing | API key theft | High | Medium | HIGH | Key rotation, IP allowlisting |
| Tampering | Request manipulation | High | Medium | HIGH | Request signing, validation |
| Repudiation | API abuse | Medium | Medium | MEDIUM | Comprehensive logging |
| Info Disclosure | Error message leakage | Low | High | MEDIUM | Generic error responses |
| Denial of Service | DDoS attack | High | Medium | HIGH | Rate limiting, DDoS protection |
| Elevation | Privilege escalation | High | Low | MEDIUM | RBAC, principle of least privilege |

#### Authentication Service
| Threat Type | Specific Threat | Impact | Likelihood | Risk | Mitigation |
|-------------|-----------------|--------|------------|------|------------|
| Spoofing | Credential stuffing | High | High | CRITICAL | MFA, account lockout |
| Tampering | Password reset exploit | High | Low | MEDIUM | Secure reset flow |
| Repudiation | Login without trace | Medium | Low | LOW | Audit all auth events |
| Info Disclosure | Username enumeration | Low | High | MEDIUM | Consistent responses |
| Denial of Service | Brute force attempts | Medium | High | HIGH | Rate limiting, CAPTCHA |
| Elevation | JWT manipulation | High | Low | MEDIUM | Signature verification |

#### Database
| Threat Type | Specific Threat | Impact | Likelihood | Risk | Mitigation |
|-------------|-----------------|--------|------------|------|------------|
| Spoofing | Connection hijacking | High | Low | MEDIUM | mTLS, network isolation |
| Tampering | SQL injection | Critical | Medium | CRITICAL | Parameterized queries |
| Repudiation | Unauthorized changes | High | Low | MEDIUM | Audit triggers |
| Info Disclosure | Data breach | Critical | Low | HIGH | Encryption at rest |
| Denial of Service | Query flooding | High | Low | MEDIUM | Query timeouts, monitoring |
| Elevation | Privilege abuse | High | Low | MEDIUM | Least privilege, separation |

## Risk Assessment

### Risk Rating Matrix

| Likelihood ↓ Impact → | Low (1) | Medium (2) | High (3) | Critical (4) |
|------------------------|---------|------------|----------|--------------|
| **High (3)** | Medium (3) | High (6) | Critical (9) | Critical (12) |
| **Medium (2)** | Low (2) | Medium (4) | High (6) | Critical (8) |
| **Low (1)** | Low (1) | Low (2) | Medium (3) | High (4) |

### Risk Register

| ID | Threat | Component | Risk Score | Treatment | Owner | Status |
|----|--------|-----------|------------|-----------|-------|--------|
| T-001 | SQL Injection | Database | Critical (12) | Mitigate | Dev Team | In Progress |
| T-002 | Credential Stuffing | Auth Service | Critical (9) | Mitigate | Security | Implemented |
| T-003 | XSS | Frontend | High (6) | Mitigate | Dev Team | Planned |
| T-004 | DDoS | API Gateway | High (6) | Transfer | Infrastructure | Implemented |
| T-005 | Data Breach | Database | High (4) | Mitigate | Security | In Progress |

### Risk Treatment Options
- **Mitigate**: Implement controls to reduce risk
- **Accept**: Accept risk with management approval
- **Transfer**: Insurance or third-party service
- **Avoid**: Remove the risky functionality

## Security Controls and Mitigations

### Preventive Controls

#### Authentication & Authorization
- [ ] Multi-factor authentication for all users
- [ ] OAuth 2.0/OpenID Connect for API access
- [ ] Role-based access control (RBAC)
- [ ] Principle of least privilege
- [ ] Regular access reviews and recertification

#### Data Protection
- [ ] Encryption at rest (AES-256)
- [ ] Encryption in transit (TLS 1.2+)
- [ ] Key management system integration
- [ ] Data masking for non-production
- [ ] Secure data disposal procedures

#### Input Validation
- [ ] Allowlist validation approach
- [ ] Schema validation for APIs
- [ ] File type and size restrictions
- [ ] SQL parameterization
- [ ] Output encoding

### Detective Controls

#### Monitoring & Logging
- [ ] Centralized security logging
- [ ] Security event correlation (SIEM)
- [ ] Anomaly detection baselines
- [ ] Real-time alerting
- [ ] Log retention per compliance

#### Security Testing
- [ ] Static application security testing (SAST)
- [ ] Dynamic application security testing (DAST)
- [ ] Software composition analysis (SCA)
- [ ] Penetration testing schedule
- [ ] Security regression testing

### Corrective Controls

#### Incident Response
- [ ] Incident response plan documented
- [ ] Security operations center (SOC) integration
- [ ] Automated containment capabilities
- [ ] Forensics and investigation procedures
- [ ] Post-incident review process

#### Recovery
- [ ] Backup and restore procedures
- [ ] Disaster recovery plan
- [ ] Business continuity planning
- [ ] Recovery time objectives (RTO)
- [ ] Recovery point objectives (RPO)

## Compliance Mapping

### Regulatory Requirements

| Framework | Requirement | Control | Evidence |
|-----------|------------|---------|----------|
| GDPR | Data protection by design | Encryption, access controls | Design docs, audit logs |
| GDPR | Right to erasure | Data deletion procedures | Deletion logs |
| PCI DSS | Requirement 6.5 | Secure coding | SAST/DAST reports |
| HIPAA | Access controls | RBAC implementation | Access matrix |
| SOC 2 | Availability | DDoS protection, DR | Uptime reports |

### Security Standards

| Standard | Section | Implementation | Status |
|----------|---------|---------------|--------|
| OWASP Top 10 | A01:2021 - Access Control | RBAC, least privilege | Implemented |
| OWASP Top 10 | A02:2021 - Crypto Failures | TLS 1.2+, strong crypto | Implemented |
| OWASP Top 10 | A03:2021 - Injection | Input validation | In Progress |
| NIST CSF | Identify | Asset inventory | Complete |
| NIST CSF | Protect | Access controls | In Progress |
| ISO 27001 | A.9 Access Control | Identity management | Planned |

## Residual Risk

### Accepted Risks

| Risk ID | Description | Justification | Compensating Controls | Approval |
|---------|-------------|---------------|----------------------|----------|
| R-001 | Legacy system integration | Cost of upgrade | Additional monitoring | CTO, CISO |
| R-002 | Third-party component | Vendor dependency | SLA, escrow | Product Owner |

### Risk Appetite Statement
Organization accepts medium risk for innovation features but requires low risk for core business functions and zero tolerance for compliance violations.

## Testing and Validation

### Security Test Cases

| Test ID | Threat | Test Description | Expected Result | Frequency |
|---------|--------|------------------|-----------------|-----------|
| ST-001 | SQL Injection | SQLMap against all endpoints | No vulnerable parameters | Each release |
| ST-002 | XSS | Payload injection testing | Proper encoding/sanitization | Each sprint |
| ST-003 | Authentication | Brute force simulation | Account lockout triggers | Monthly |
| ST-004 | Authorization | Privilege escalation attempts | Access denied | Each release |
| ST-005 | Encryption | TLS configuration scan | TLS 1.2+ only | Weekly |

### Validation Checklist
- [ ] All STRIDE threats identified and documented
- [ ] Risk ratings align with organizational matrix
- [ ] Mitigations mapped to all high/critical risks
- [ ] Test cases cover all identified threats
- [ ] Compliance requirements addressed
- [ ] Residual risks formally accepted
- [ ] Security controls implementable

## Maintenance and Review

### Update Triggers
- Major architecture changes
- New features or components
- Security incidents
- Threat landscape changes
- Regulatory updates
- Annual review minimum

### Review Process
1. Security architect updates threat model
2. Development team validates technical accuracy
3. Risk management reviews risk ratings
4. Compliance confirms regulatory alignment
5. Management approves residual risks
6. Updates communicated to all stakeholders

### Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | `[Date]` | Initial threat model | `[Name]` |
| 1.1 | `[Date]` | Added API gateway threats | `[Name]` |
| 2.0 | `[Date]` | Major architecture update | `[Name]` |

## Appendices

### A. Threat Library Reference
Link to organizational threat library or MITRE ATT&CK mappings

### B. Security Control Catalog
Reference to available security controls and implementation guides

### C. Tool Configuration
SAST/DAST tool configurations and rule sets

### D. Acronyms and Definitions
- **STRIDE**: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege
- **DREAD**: Damage, Reproducibility, Exploitability, Affected Users, Discoverability
- **RTO**: Recovery Time Objective
- **RPO**: Recovery Point Objective
- **mTLS**: Mutual TLS
- **RBAC**: Role-Based Access Control
- **ABAC**: Attribute-Based Access Control

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Security Architect | `[Name]` | `[Signature]` | `[Date]` |
| System Architect | `[Name]` | `[Signature]` | `[Date]` |
| Product Owner | `[Name]` | `[Signature]` | `[Date]` |
| Risk Manager | `[Name]` | `[Signature]` | `[Date]` |
| Development Lead | `[Name]` | `[Signature]` | `[Date]` |