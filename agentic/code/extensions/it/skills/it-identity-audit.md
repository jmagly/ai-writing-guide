---
name: it-identity-audit
description: Audit IdP realms for stale users, expired certificates, unused clients, and policy drift
trigger: when the operator requests identity audit, IdP review, user access audit, certificate expiry check, or client cleanup
---

# Identity Provider Audit

## Purpose

Audit identity provider (IdP) realms to identify security and hygiene issues: stale user accounts, expired or soon-to-expire certificates, unused OAuth/OIDC clients, overprivileged service accounts, and policy configuration drift.

## Workflow

### 1. Connect to IdP

Determine the IdP platform and establish an API connection:

- **Keycloak**: Admin REST API (`/admin/realms/{realm}/...`)
- **Authentik**: API (`/api/v3/...`)
- **FreeIPA**: JSON-RPC API
- **Azure AD / Entra**: Microsoft Graph API
- **LDAP-based**: `ldapsearch` queries

```bash
# Example: Keycloak realm export
curl -s -H "Authorization: Bearer {token}" \
  "https://{idp-host}/admin/realms/{realm}/users?max=1000"
```

### 2. Audit Users

For each user account, evaluate:

| Check | Condition | Flag |
|-------|-----------|------|
| Last login | > 90 days ago | STALE |
| Last login | Never | STALE — never activated |
| Account enabled | Disabled but not removed | INFO |
| Email verified | false | WARN |
| MFA enrolled | false (if policy requires MFA) | CRITICAL |
| Group membership | In privileged group without recent activity | WARN |

Produce a user audit table:

| Username | Last Login | MFA | Groups | Status | Flag |
|----------|-----------|-----|--------|--------|------|
| {user} | {date or "never"} | {yes/no} | {groups} | {enabled/disabled} | {STALE/WARN/OK} |

### 3. Audit Certificates

Check all certificates managed by or registered with the IdP:

```bash
# Check certificate expiry
openssl x509 -in {cert-path} -noout -enddate -subject
```

| Certificate | Subject | Expires | Days Remaining | Status |
|------------|---------|---------|---------------|--------|
| {cert-name} | {subject} | {expiry-date} | {days} | {OK / EXPIRING / EXPIRED} |

Thresholds:
- **EXPIRED**: Already past expiry date
- **EXPIRING**: < 30 days remaining
- **WARN**: < 90 days remaining
- **OK**: >= 90 days remaining

### 4. Audit OAuth/OIDC Clients

For each registered client application:

| Client ID | Description | Last Used | Redirect URIs | Status |
|-----------|------------|-----------|---------------|--------|
| {client-id} | {description} | {date or "never"} | {uris} | {ACTIVE / UNUSED / STALE} |

Flag clients that:
- Have never been used (created but never authenticated)
- Have not been used in > 180 days
- Use wildcard redirect URIs
- Have overly broad scopes

### 5. Audit Policies and Configuration

Check IdP policies against expected baseline:

| Policy | Expected | Actual | Status |
|--------|----------|--------|--------|
| Password minimum length | {expected} | {actual} | MATCH / DRIFT |
| MFA enforcement | {expected} | {actual} | MATCH / DRIFT |
| Session timeout | {expected} | {actual} | MATCH / DRIFT |
| Brute force protection | {expected} | {actual} | MATCH / DRIFT |
| Account lockout threshold | {expected} | {actual} | MATCH / DRIFT |

### 6. Generate Report

Produce a consolidated identity audit report with:

- Summary counts: total users, stale users, expired certs, unused clients
- Critical findings requiring immediate action
- Recommendations prioritized by severity
- Comparison against previous audit (if available)

> Do not disable accounts, revoke clients, or rotate certificates automatically. Present findings and await operator authorization.

## Output

- Identity audit report
- Stale user list with recommended actions
- Certificate expiry timeline
- Unused client inventory
- Policy drift assessment

## Governance Boundary

Identity evidence defaults to `restricted-identity`. Durable output is aggregated by finding/status unless a named user is required for an authorized remediation; raw API responses, bearer headers, named-user lists, redirect URIs, and certificate metadata remain short-lived restricted evidence. Invoke `aiwg ops evidence prepare` before every report write or tracker/publication action. Issue and comment sinks receive only non-expiring sanitized counts unless an explicit destination policy and scoped approval authorize more. Redaction and classification audit records must not reproduce usernames, tokens, URLs, or finding payloads.
