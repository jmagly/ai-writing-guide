# Threat Model (Sample)

## Scope
- Component: Core API
- Data: PII (email), session tokens

## STRIDE (excerpt)
| Component | Spoofing | Tampering | Repudiation | Info disclosure | DoS | EoP |
|-----------|----------|-----------|-------------|-----------------|-----|-----|
| API GW | MFA | WAF rules | signed logs | TLS | rate limits | RBAC |

## Mitigations
- TLS 1.2+, HSTS
- JWT with short TTL, refresh tokens

