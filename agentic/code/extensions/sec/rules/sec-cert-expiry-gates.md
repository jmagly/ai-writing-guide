---
enforcement: high
---

# Certificate Expiry Gates

**Enforcement Level**: HIGH
**Scope**: All TLS certificates, SSH host certificates, code signing certificates, CA certificates, and client certificates managed by the fleet
**Issue**: #778

## Principle

An expired certificate is an immediate service outage or security failure. Certificate expiry is entirely predictable and entirely preventable. No deployment may proceed through an environment where certificates are at or near expiry. Monitoring thresholds enforce progressively stronger gates as expiry approaches.

## Threshold Definitions

| Threshold | Days to Expiry | Gate Level | Required Action |
|-----------|---------------|------------|-----------------|
| HEALTHY | > 30 days | None — pass | No action required |
| WARNING | ≤ 30 days | Soft flag | Log warning, create renewal ticket |
| BLOCK | ≤ 7 days | Deployment block | Block all non-emergency deployments to affected host/service |
| INCIDENT | ≤ 1 day | Incident trigger | Treat as active incident, page on-call |
| EXPIRED | 0 days (past) | Emergency | Service considered degraded, immediate escalation required |

## Gate Rules

### WARNING Gate (≤ 30 days)

1. Any certificate scan that detects a WARNING-threshold certificate must:
   - Log the finding with certificate subject, expiry date, and affected host/service
   - Create or update the renewal tracking ticket
   - Notify the responsible operator

2. Deployments to hosts with WARNING certificates are permitted but must include a note in the deployment record acknowledging the expiring certificate.

3. WARNING findings must be resolved (renewed or documented as intentional) within 21 days of detection.

### BLOCK Gate (≤ 7 days)

1. Deployments to hosts or services with BLOCK-threshold certificates are not permitted without an explicit override approved by an authorized operator.

2. The override must be documented in the deployment record with:
   - Certificate subject and expiry date
   - Reason renewal has not been completed
   - Commit to renewal within 24 hours
   - Approving operator identity

3. The agent must present the BLOCK finding prominently and require explicit acknowledgment before proceeding with any deployment to the affected scope.

4. Automated deployments (CI/CD pipelines) must fail with a non-zero exit code when BLOCK-threshold certificates are detected.

### INCIDENT Gate (≤ 1 day)

1. Detection of any certificate with ≤ 1 day to expiry triggers an immediate incident:
   - Notify on-call operator
   - Open incident ticket with CRITICAL severity
   - Do not proceed with any other work until renewal is initiated

2. All deployments to the affected scope are blocked until the certificate is renewed and the expiry gate is satisfied.

3. If the certificate cannot be renewed within the remaining validity period, prepare for controlled service degradation and notify stakeholders.

### EXPIRED

1. An expired certificate is an active incident at CRITICAL severity.

2. The affected service must be treated as degraded regardless of whether clients are currently failing (some clients ignore expiry in non-strict modes and will expose the expired cert silently).

3. Renewal must begin immediately. No other scheduled work takes priority.

## Validation Checklist

Before any deployment, run the following checklist against all certificates in scope:

```
Certificate Expiry Pre-Deployment Check
Host / Service: {host}:{port}
Certificate Subject: {subject_cn}
Expiry Date: {not_after}
Days Remaining: {days}

[ ] Days remaining > 7 (BLOCK threshold not triggered)
[ ] Days remaining > 1 (INCIDENT threshold not triggered)
[ ] Certificate is not expired
[ ] Certificate chain is valid (issuer verifiable to trusted root)
[ ] Certificate CN or SAN matches the host/service hostname
```

## CA Certificate Special Handling

CA certificates (root and intermediate) require earlier warning thresholds due to the operational complexity of CA rotation:

| CA Type | WARNING | BLOCK | INCIDENT |
|---------|---------|-------|----------|
| Issuing CA | ≤ 90 days | ≤ 30 days | ≤ 7 days |
| Intermediate CA | ≤ 180 days | ≤ 90 days | ≤ 30 days |
| Root CA | ≤ 365 days | ≤ 180 days | ≤ 90 days |

CA certificate expiry warnings must include the full count of certificates issued by that CA that will be affected by the CA expiry.

## Automation Integration

Certificate expiry checks must be integrated into:

1. **Deployment pipelines**: Run `sec-cert-scan` as a pre-deployment step. Fail the pipeline on BLOCK or INCIDENT threshold certificates.

2. **Scheduled scanning**: Run `sec-cert-scan` at minimum weekly via cron or equivalent. More frequent scanning (daily) is recommended for certificates with short validity periods (≤ 90 days).

3. **Alerting**: BLOCK and INCIDENT threshold detections must emit alerts to the ops notification channel. Alerts must include certificate subject, expiry date, and affected host/service.

## Rationale

Certificate expiry is the most preventable category of security-related outage. Unlike vulnerabilities or zero-days, expiry dates are known at issuance. Enforcement thresholds exist because operators consistently underestimate the time required to complete renewal in complex environments (HSM-backed CAs, multi-host deployment, certificate chain updates). The 30/7/1 day gates are calibrated to provide sufficient runway for each class of renewal complexity.
