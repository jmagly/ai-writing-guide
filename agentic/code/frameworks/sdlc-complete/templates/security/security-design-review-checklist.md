# Security Design Review Checklist

## Document Control

| Field | Value |
|-------|-------|
| System | `[System/Component Name]` |
| Review Date | `[YYYY-MM-DD]` |
| Reviewers | `[Security Architect, System Architect, Dev Lead]` |
| Document Version | `[e.g., 1.0]` |
| Related Documents | Architecture Document, Threat Model, Security Requirements |
| Status | `[In Progress/Complete/Approved/Rejected]` |

## Purpose and Scope

### Review Objective
Evaluate the security posture of the system design to identify vulnerabilities, ensure compliance with security requirements, and validate security controls before implementation.

### System Under Review
- **System Name**: `[Name]`
- **Component/Module**: `[If specific component review]`
- **Architecture Type**: `[Web app, Mobile app, API, Microservices, etc.]`
- **Deployment Model**: `[Cloud, On-prem, Hybrid]`
- **Data Sensitivity**: `[Public, Internal, Confidential, Restricted]`

### Review Scope
- [ ] Full system architecture
- [ ] Specific components: `[List]`
- [ ] New features/changes: `[Description]`
- [ ] Third-party integrations: `[List]`
- [ ] Infrastructure changes: `[Description]`

## Section 1: Authentication & Identity

### Authentication Mechanisms

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| AUTH-DR-001 | Authentication mechanism clearly defined and appropriate for use case | ☐ | ☐ | ☐ | |
| AUTH-DR-002 | Multi-factor authentication implemented for privileged access | ☐ | ☐ | ☐ | |
| AUTH-DR-003 | Password policy meets requirements (length, complexity, history) | ☐ | ☐ | ☐ | |
| AUTH-DR-004 | Credential storage uses strong hashing (bcrypt/scrypt/Argon2) | ☐ | ☐ | ☐ | |
| AUTH-DR-005 | Account lockout policy defined to prevent brute force | ☐ | ☐ | ☐ | |
| AUTH-DR-006 | Password reset flow secure (no username enumeration, secure tokens) | ☐ | ☐ | ☐ | |
| AUTH-DR-007 | Authentication bypass paths identified and secured | ☐ | ☐ | ☐ | |
| AUTH-DR-008 | Service-to-service authentication implemented (API keys, mTLS, etc.) | ☐ | ☐ | ☐ | |

### Session Management

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| AUTH-DR-009 | Session tokens cryptographically random (128+ bits) | ☐ | ☐ | ☐ | |
| AUTH-DR-010 | Session timeout configured (idle and absolute) | ☐ | ☐ | ☐ | |
| AUTH-DR-011 | Secure cookie attributes set (HttpOnly, Secure, SameSite) | ☐ | ☐ | ☐ | |
| AUTH-DR-012 | Session invalidation on logout implemented | ☐ | ☐ | ☐ | |
| AUTH-DR-013 | Concurrent session management strategy defined | ☐ | ☐ | ☐ | |
| AUTH-DR-014 | Session fixation attacks prevented | ☐ | ☐ | ☐ | |

## Section 2: Authorization & Access Control

### Access Control Model

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| AUTHZ-DR-001 | Access control model clearly defined (RBAC, ABAC, ACL) | ☐ | ☐ | ☐ | |
| AUTHZ-DR-002 | Roles and permissions documented | ☐ | ☐ | ☐ | |
| AUTHZ-DR-003 | Principle of least privilege enforced | ☐ | ☐ | ☐ | |
| AUTHZ-DR-004 | Default deny policy implemented | ☐ | ☐ | ☐ | |
| AUTHZ-DR-005 | Segregation of duties for critical operations | ☐ | ☐ | ☐ | |
| AUTHZ-DR-006 | Administrative functions separated from user functions | ☐ | ☐ | ☐ | |

### Authorization Enforcement

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| AUTHZ-DR-007 | Authorization checks on every sensitive operation | ☐ | ☐ | ☐ | |
| AUTHZ-DR-008 | Server-side authorization enforcement (not client-side only) | ☐ | ☐ | ☐ | |
| AUTHZ-DR-009 | Horizontal privilege escalation prevented | ☐ | ☐ | ☐ | |
| AUTHZ-DR-010 | Vertical privilege escalation prevented | ☐ | ☐ | ☐ | |
| AUTHZ-DR-011 | Resource-level authorization enforced | ☐ | ☐ | ☐ | |
| AUTHZ-DR-012 | API authorization model documented and implemented | ☐ | ☐ | ☐ | |

## Section 3: Data Protection

### Data Classification

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| DATA-DR-001 | All data types classified (Public, Internal, Confidential, Restricted) | ☐ | ☐ | ☐ | |
| DATA-DR-002 | Handling requirements defined per classification level | ☐ | ☐ | ☐ | |
| DATA-DR-003 | Data flow diagrams show data classification | ☐ | ☐ | ☐ | |
| DATA-DR-004 | Sensitive data minimized (only collect what's needed) | ☐ | ☐ | ☐ | |

### Encryption

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| DATA-DR-005 | Encryption at rest for sensitive data (AES-256) | ☐ | ☐ | ☐ | |
| DATA-DR-006 | Encryption in transit (TLS 1.2+) for all external communications | ☐ | ☐ | ☐ | |
| DATA-DR-007 | Strong cipher suites configured (no weak crypto) | ☐ | ☐ | ☐ | |
| DATA-DR-008 | Certificate management strategy defined | ☐ | ☐ | ☐ | |
| DATA-DR-009 | Key management system specified (HSM, KMS) | ☐ | ☐ | ☐ | |
| DATA-DR-010 | Key rotation schedule defined | ☐ | ☐ | ☐ | |
| DATA-DR-011 | Database encryption configured for sensitive tables | ☐ | ☐ | ☐ | |
| DATA-DR-012 | Backup encryption implemented | ☐ | ☐ | ☐ | |

### Data Handling

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| DATA-DR-013 | Data retention policies defined | ☐ | ☐ | ☐ | |
| DATA-DR-014 | Secure data deletion procedures specified | ☐ | ☐ | ☐ | |
| DATA-DR-015 | Data masking for non-production environments | ☐ | ☐ | ☐ | |
| DATA-DR-016 | PII/PHI handling complies with regulations | ☐ | ☐ | ☐ | |
| DATA-DR-017 | Cross-border data transfer requirements addressed | ☐ | ☐ | ☐ | |

## Section 4: Input Validation & Output Encoding

### Input Validation

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| INPUT-DR-001 | All external inputs validated | ☐ | ☐ | ☐ | |
| INPUT-DR-002 | Positive validation (allowlist) approach used | ☐ | ☐ | ☐ | |
| INPUT-DR-003 | Input length limits enforced | ☐ | ☐ | ☐ | |
| INPUT-DR-004 | File upload validation (type, size, content) | ☐ | ☐ | ☐ | |
| INPUT-DR-005 | SQL injection prevention (parameterized queries) | ☐ | ☐ | ☐ | |
| INPUT-DR-006 | NoSQL injection prevention implemented | ☐ | ☐ | ☐ | |
| INPUT-DR-007 | Command injection prevention implemented | ☐ | ☐ | ☐ | |
| INPUT-DR-008 | XML/XXE attack prevention | ☐ | ☐ | ☐ | |
| INPUT-DR-009 | Path traversal prevention | ☐ | ☐ | ☐ | |

### Output Encoding

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| INPUT-DR-010 | Context-aware output encoding implemented | ☐ | ☐ | ☐ | |
| INPUT-DR-011 | XSS prevention through proper encoding | ☐ | ☐ | ☐ | |
| INPUT-DR-012 | Content Security Policy (CSP) headers configured | ☐ | ☐ | ☐ | |
| INPUT-DR-013 | HTML sanitization for rich text inputs | ☐ | ☐ | ☐ | |

## Section 5: API Security

### API Design

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| API-DR-001 | API authentication mechanism defined (OAuth, API keys) | ☐ | ☐ | ☐ | |
| API-DR-002 | API rate limiting configured | ☐ | ☐ | ☐ | |
| API-DR-003 | API versioning strategy defined | ☐ | ☐ | ☐ | |
| API-DR-004 | Input validation for all API parameters | ☐ | ☐ | ☐ | |
| API-DR-005 | API responses don't leak sensitive information | ☐ | ☐ | ☐ | |
| API-DR-006 | RESTful APIs follow secure design patterns | ☐ | ☐ | ☐ | |
| API-DR-007 | GraphQL queries limited (depth, complexity) | ☐ | ☐ | ☐ | |

### API Security Controls

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| API-DR-008 | CORS policy properly configured | ☐ | ☐ | ☐ | |
| API-DR-009 | API gateway implements security controls | ☐ | ☐ | ☐ | |
| API-DR-010 | Request signing or HMAC validation for webhooks | ☐ | ☐ | ☐ | |
| API-DR-011 | API documentation includes security guidance | ☐ | ☐ | ☐ | |
| API-DR-012 | API keys scoped to specific resources | ☐ | ☐ | ☐ | |

## Section 6: Secrets Management

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| SEC-DR-001 | No hardcoded secrets in code | ☐ | ☐ | ☐ | |
| SEC-DR-002 | Secrets stored in vault/secrets manager | ☐ | ☐ | ☐ | |
| SEC-DR-003 | Secrets rotation mechanism implemented | ☐ | ☐ | ☐ | |
| SEC-DR-004 | Environment-specific secrets management | ☐ | ☐ | ☐ | |
| SEC-DR-005 | API keys and tokens protected | ☐ | ☐ | ☐ | |
| SEC-DR-006 | Database credentials not in configuration files | ☐ | ☐ | ☐ | |
| SEC-DR-007 | Secrets not exposed in logs or error messages | ☐ | ☐ | ☐ | |

## Section 7: Logging & Monitoring

### Logging

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| LOG-DR-001 | Security events logged (auth, authz, config changes) | ☐ | ☐ | ☐ | |
| LOG-DR-002 | Log format includes required fields (user, timestamp, IP, action) | ☐ | ☐ | ☐ | |
| LOG-DR-003 | No sensitive data in logs | ☐ | ☐ | ☐ | |
| LOG-DR-004 | Centralized log aggregation configured | ☐ | ☐ | ☐ | |
| LOG-DR-005 | Log retention policy defined | ☐ | ☐ | ☐ | |
| LOG-DR-006 | Log integrity protection implemented | ☐ | ☐ | ☐ | |
| LOG-DR-007 | Audit trail for compliance requirements | ☐ | ☐ | ☐ | |

### Monitoring & Alerting

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| LOG-DR-008 | Security event monitoring configured | ☐ | ☐ | ☐ | |
| LOG-DR-009 | Alerts for critical security events defined | ☐ | ☐ | ☐ | |
| LOG-DR-010 | Anomaly detection baselines established | ☐ | ☐ | ☐ | |
| LOG-DR-011 | Integration with SIEM/SOC defined | ☐ | ☐ | ☐ | |
| LOG-DR-012 | Security metrics dashboard planned | ☐ | ☐ | ☐ | |

## Section 8: Error Handling

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| ERR-DR-001 | Generic error messages to users (no stack traces) | ☐ | ☐ | ☐ | |
| ERR-DR-002 | Detailed errors logged server-side only | ☐ | ☐ | ☐ | |
| ERR-DR-003 | Error handling doesn't leak system information | ☐ | ☐ | ☐ | |
| ERR-DR-004 | Fail securely (errors default to deny) | ☐ | ☐ | ☐ | |
| ERR-DR-005 | Error handling tested for security implications | ☐ | ☐ | ☐ | |

## Section 9: Infrastructure & Deployment

### Network Architecture

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| INFRA-DR-001 | Network segmentation defined | ☐ | ☐ | ☐ | |
| INFRA-DR-002 | Trust boundaries clearly marked | ☐ | ☐ | ☐ | |
| INFRA-DR-003 | DMZ for internet-facing components | ☐ | ☐ | ☐ | |
| INFRA-DR-004 | Firewall rules follow least privilege | ☐ | ☐ | ☐ | |
| INFRA-DR-005 | VPN or private network for admin access | ☐ | ☐ | ☐ | |
| INFRA-DR-006 | DDoS protection mechanism | ☐ | ☐ | ☐ | |
| INFRA-DR-007 | WAF configured for web applications | ☐ | ☐ | ☐ | |

### Infrastructure Security

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| INFRA-DR-008 | OS hardening standards applied (CIS benchmarks) | ☐ | ☐ | ☐ | |
| INFRA-DR-009 | Container security scanning implemented | ☐ | ☐ | ☐ | |
| INFRA-DR-010 | Infrastructure as Code (IaC) security scanning | ☐ | ☐ | ☐ | |
| INFRA-DR-011 | Immutable infrastructure approach where possible | ☐ | ☐ | ☐ | |
| INFRA-DR-012 | Cloud security posture management (CSPM) | ☐ | ☐ | ☐ | |
| INFRA-DR-013 | Patch management process defined | ☐ | ☐ | ☐ | |

### Deployment Security

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| INFRA-DR-014 | Separate environments (dev, test, prod) | ☐ | ☐ | ☐ | |
| INFRA-DR-015 | No production data in non-production | ☐ | ☐ | ☐ | |
| INFRA-DR-016 | Deployment pipeline security controls | ☐ | ☐ | ☐ | |
| INFRA-DR-017 | Blue/green or canary deployment strategy | ☐ | ☐ | ☐ | |
| INFRA-DR-018 | Rollback procedures defined | ☐ | ☐ | ☐ | |

## Section 10: Third-Party Components

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| THIRD-DR-001 | Third-party dependencies inventoried (SBOM) | ☐ | ☐ | ☐ | |
| THIRD-DR-002 | Dependency vulnerability scanning configured | ☐ | ☐ | ☐ | |
| THIRD-DR-003 | License compliance checked | ☐ | ☐ | ☐ | |
| THIRD-DR-004 | Vendor security assessments completed | ☐ | ☐ | ☐ | |
| THIRD-DR-005 | Third-party API security reviewed | ☐ | ☐ | ☐ | |
| THIRD-DR-006 | Data sharing with third parties documented | ☐ | ☐ | ☐ | |
| THIRD-DR-007 | Subprocessor agreements for sensitive data | ☐ | ☐ | ☐ | |

## Section 11: Privacy & Compliance

### Privacy

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| PRIV-DR-001 | Privacy by design principles applied | ☐ | ☐ | ☐ | |
| PRIV-DR-002 | Data minimization enforced | ☐ | ☐ | ☐ | |
| PRIV-DR-003 | User consent management implemented | ☐ | ☐ | ☐ | |
| PRIV-DR-004 | Data subject rights supported (access, erasure, portability) | ☐ | ☐ | ☐ | |
| PRIV-DR-005 | Privacy notice provided and clear | ☐ | ☐ | ☐ | |
| PRIV-DR-006 | Anonymization/pseudonymization where appropriate | ☐ | ☐ | ☐ | |

### Compliance

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| COMP-DR-001 | Applicable regulations identified (GDPR, PCI, HIPAA) | ☐ | ☐ | ☐ | |
| COMP-DR-002 | Compliance requirements mapped to controls | ☐ | ☐ | ☐ | |
| COMP-DR-003 | OWASP Top 10 threats addressed | ☐ | ☐ | ☐ | |
| COMP-DR-004 | Industry-specific standards followed | ☐ | ☐ | ☐ | |
| COMP-DR-005 | Audit trail supports compliance | ☐ | ☐ | ☐ | |

## Section 12: Incident Response & Recovery

| Check ID | Criteria | Pass | Fail | N/A | Notes |
|----------|----------|------|------|-----|-------|
| IR-DR-001 | Incident response plan exists | ☐ | ☐ | ☐ | |
| IR-DR-002 | Security contact points defined | ☐ | ☐ | ☐ | |
| IR-DR-003 | Incident detection capabilities designed | ☐ | ☐ | ☐ | |
| IR-DR-004 | Forensic data collection capabilities | ☐ | ☐ | ☐ | |
| IR-DR-005 | Backup and recovery procedures defined | ☐ | ☐ | ☐ | |
| IR-DR-006 | Business continuity plan addresses security | ☐ | ☐ | ☐ | |
| IR-DR-007 | Disaster recovery tested | ☐ | ☐ | ☐ | |

## OWASP Top 10 Coverage

### Verification Against OWASP Top 10 2021

| OWASP Item | Description | Addressed | Controls | Notes |
|------------|-------------|-----------|----------|-------|
| A01:2021 | Broken Access Control | ☐ | | |
| A02:2021 | Cryptographic Failures | ☐ | | |
| A03:2021 | Injection | ☐ | | |
| A04:2021 | Insecure Design | ☐ | | |
| A05:2021 | Security Misconfiguration | ☐ | | |
| A06:2021 | Vulnerable Components | ☐ | | |
| A07:2021 | Identification/Authentication Failures | ☐ | | |
| A08:2021 | Software and Data Integrity Failures | ☐ | | |
| A09:2021 | Security Logging/Monitoring Failures | ☐ | | |
| A10:2021 | Server-Side Request Forgery (SSRF) | ☐ | | |

## Findings Summary

### Critical Findings
| Finding ID | Description | Impact | Recommendation | Owner | Target Date |
|------------|-------------|--------|----------------|-------|-------------|
| CRIT-001 | | | | | |
| CRIT-002 | | | | | |

### High Findings
| Finding ID | Description | Impact | Recommendation | Owner | Target Date |
|------------|-------------|--------|----------------|-------|-------------|
| HIGH-001 | | | | | |
| HIGH-002 | | | | | |

### Medium Findings
| Finding ID | Description | Impact | Recommendation | Owner | Target Date |
|------------|-------------|--------|----------------|-------|-------------|
| MED-001 | | | | | |
| MED-002 | | | | | |

### Low/Informational Findings
| Finding ID | Description | Recommendation | Owner |
|------------|-------------|----------------|-------|
| LOW-001 | | | |
| LOW-002 | | | |

## Risk Assessment

### Overall Security Posture

- **Critical Issues**: `[Count]`
- **High Issues**: `[Count]`
- **Medium Issues**: `[Count]`
- **Low Issues**: `[Count]`

### Risk Rating

Based on findings, the overall security risk for this design is:

- [ ] **LOW** - No critical or high issues, design is secure
- [ ] **MEDIUM** - Some high issues with clear mitigation plans
- [ ] **HIGH** - Multiple high issues or critical design flaws
- [ ] **CRITICAL** - Critical security flaws that must be addressed

### Recommendations Priority

1. **Must Fix Before Implementation**: `[List critical items]`
2. **Should Fix in Design Phase**: `[List high items]`
3. **Address in Implementation**: `[List medium items]`
4. **Future Improvements**: `[List low items]`

## Gate Approval

### Pass/Fail Criteria

**Design review PASSES if:**
- Zero critical findings
- All high findings have approved mitigation plans
- OWASP Top 10 addressed
- Compliance requirements met
- Security Architect approval obtained

**Design review FAILS if:**
- Any critical findings without immediate fix
- High findings without mitigation plan
- Compliance violations
- Inadequate security controls for data sensitivity

### Review Decision

- [ ] **APPROVED** - Design meets security requirements, proceed to implementation
- [ ] **CONDITIONALLY APPROVED** - Approved with required fixes listed below
- [ ] **REJECTED** - Major security issues, redesign required

### Conditions for Approval (if applicable)
1. `[Condition 1]`
2. `[Condition 2]`
3. `[Condition 3]`

## Next Steps

### Required Actions
1. `[Action item 1]` - Owner: `[Name]` - Due: `[Date]`
2. `[Action item 2]` - Owner: `[Name]` - Due: `[Date]`
3. `[Action item 3]` - Owner: `[Name]` - Due: `[Date]`

### Follow-up Reviews
- [ ] Re-review after critical fixes: `[Date]`
- [ ] Implementation validation: `[Date]`
- [ ] Pre-deployment security test: `[Date]`

## Sign-Off

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Security Architect | `[Name]` | `[Signature]` | `[Date]` | `[Approve/Reject]` |
| System Architect | `[Name]` | `[Signature]` | `[Date]` | `[Approve/Reject]` |
| Development Lead | `[Name]` | `[Signature]` | `[Date]` | `[Approve/Reject]` |
| Product Owner | `[Name]` | `[Signature]` | `[Date]` | `[Approve/Reject]` |
| Compliance Officer | `[Name]` | `[Signature]` | `[Date]` | `[Approve/Reject]` |

## Appendices

### A. Reference Architecture Diagrams
Link to architecture diagrams reviewed during this session.

### B. Threat Model Reference
Link to related threat model document.

### C. Security Requirements Traceability
Mapping of security requirements to design controls.

### D. Review Meeting Notes
Detailed notes from the design review session(s).

### E. Supporting Documentation
- Security standards referenced
- Compliance checklists used
- Tool scan results (if any)
- Previous review outcomes