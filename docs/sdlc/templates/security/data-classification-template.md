# Data Classification

## Categories

| Class | Description | Examples | Handling |
|------|-------------|----------|----------|
| Public | Safe for public | docs | no special controls |
| Internal | Team-only | internal docs | access-controlled |
| Confidential | Sensitive business | plans, costs | encryption at rest |
| Restricted | PII/PHI/keys | user data, secrets | strict access, audit |

## Rules

- Label and tag data at ingestion
- Enforce controls per class across storage and transport
- Review classification changes during releases

