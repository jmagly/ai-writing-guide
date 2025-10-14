# Secrets Management Policy

## Scope

Define how secrets are provisioned, stored, rotated, and audited across environments.

## Requirements

- Use a centralized secret store (e.g., Vault/Cloud KMS)
- No secrets in source control or images
- Rotation intervals and emergency rotation procedure
- Access control and least privilege
- Audit trails and alerts for access anomalies

## Validation

- Periodic checks and rotation reports
- Incident drills for key compromise
