# Security Auditor — OWASP Top 10 (2021) Detailed Checklist

Externalized from the agent definition per the few-shot-examples rule (#1587).
The agent definition keeps the 10-category gate index + delegation routing inline;
these are the full per-category checkboxes the auditor works through during an audit.
Delegation notes mark where deep findings hand off to a specialist agent/skill.

1. **A01: Broken Access Control**
   - [ ] Proper authorization checks
   - [ ] No direct object reference vulnerabilities
   - [ ] Proper CORS configuration
   - [ ] No privilege escalation paths

2. **A02: Cryptographic Failures** *(deep findings → `applied-cryptographer`)*
   - [ ] Sensitive data encrypted at rest *(this checklist verifies it IS encrypted; the choice of primitive delegates)*
   - [ ] TLS/HTTPS for data in transit *(verify TLS 1.2+; cipher suite selection delegates if non-standard)*
   - [ ] Strong cryptographic algorithms *(flag deprecated: MD5, SHA-1 as KDF, DES, RC4, CBC-without-MAC; primitive choice for replacement → applied-cryptographer)*
   - [ ] Proper key management *(verify keys are not hardcoded; key separation architecture → applied-cryptographer)*

3. **A03: Injection**
   - [ ] Parameterized queries (no SQL injection)
   - [ ] Input validation and sanitization
   - [ ] No command injection vulnerabilities
   - [ ] Safe templating (no XSS)

4. **A04: Insecure Design**
   - [ ] Threat modeling performed
   - [ ] Security requirements defined
   - [ ] Defense in depth implemented
   - [ ] Fail-secure by default

5. **A05: Security Misconfiguration**
   - [ ] Security headers configured (CSP, HSTS, etc.)
   - [ ] Default credentials changed
   - [ ] Error messages don't leak information
   - [ ] Unnecessary features disabled

6. **A06: Vulnerable and Outdated Components** *(deep supply-chain trust → `supply-chain-trust` skill)*
   - [ ] Dependencies up to date
   - [ ] No known CVEs in dependencies
   - [ ] Supply chain security validated *(CVE-clean is a baseline; deeper attestation/repro-build/snapshot-pinning delegates)*
   - [ ] Software bill of materials (SBOM) *(this checklist verifies SBOM exists; pinning depth and trust-boundary inventory delegates)*

7. **A07: Identification and Authentication Failures**
   - [ ] Strong password requirements
   - [ ] MFA available/required
   - [ ] Session management secure
   - [ ] No credential stuffing vulnerabilities

8. **A08: Software and Data Integrity Failures** *(chain-of-trust review → `secure-bootstrap-reviewer`)*
   - [ ] CI/CD pipeline secure *(deep chain-of-trust audit delegates; this checklist verifies basics: branch protection, signed commits, no token in logs)*
   - [ ] Code signing implemented *(this verifies signatures exist; key custody, rotation, "verify the verifier" delegates)*
   - [ ] Integrity checks for updates *(this verifies checks exist; bootstrap-chain integrity for portable systems delegates)*
   - [ ] No deserialization vulnerabilities *(stays here — application-code altitude)*

9. **A09: Security Logging and Monitoring Failures**
   - [ ] Security events logged
   - [ ] Sensitive data not logged
   - [ ] Log monitoring and alerting
   - [ ] Incident response procedures

10. **A10: Server-Side Request Forgery (SSRF)**
    - [ ] URL validation for external requests
    - [ ] Network segmentation
    - [ ] Allowlist for external services
    - [ ] No user-controlled URLs
