# Twelve-Factor Audit Evidence Prompt

Audit the application against Twelve-Factor and modern 12+ Factor criteria.

Inputs:

- Repository paths:
- Deployment/configuration paths:
- CI/CD and release evidence:
- Runtime telemetry evidence:
- Security and supply-chain evidence:
- Requirements, ADRs, and issue links:

Instructions:

1. Inspect every provided evidence source before scoring.
2. For each factor, set status to `pass`, `partial`, `fail`, or `not_applicable`.
3. Cite concrete evidence paths or mark evidence as `missing`.
4. Record risks with severity and impact.
5. Write remediation tasks with owner-ready actions.
6. Ensure the output can be mapped to `schemas/audit-report.schema.json`.
