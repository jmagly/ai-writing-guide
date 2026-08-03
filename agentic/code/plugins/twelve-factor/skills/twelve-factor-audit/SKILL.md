---
namespace: aiwg
name: twelve-factor-audit
description: Audit an application against Twelve-Factor and modern 12+ Factor criteria with structured evidence, risks, and remediation tasks.
platforms: [all]
triggers:
  - "twelve factor audit"
  - "12 factor audit evidence"
  - "audit application against 12+ factor"
  - "cloud native operational audit"
---

# Twelve-Factor Audit

Use this skill to inspect an implemented application and produce a structured audit report that downstream quality, security, reporting, and delivery workflows can consume.

## Triggers

- "Audit this repo against Twelve-Factor"
- "Produce a 12+ Factor evidence report"
- "Find cloud-native operational readiness gaps"
- "Turn Twelve-Factor audit findings into remediation issues"

## Behavior

1. Establish the audit scope: application name, repo paths, deployment targets, environments, release process, and evidence sources.
2. Collect evidence from code, dependency manifests, lockfiles, configuration, deployment manifests, CI, tests, API contracts, logs, dashboards, runbooks, ADRs, and security/provenance artifacts.
3. Assess every original Twelve-Factor principle plus the modern extension factors listed in the addon README.
4. Assign each factor a status of `pass`, `partial`, `fail`, or `not_applicable`.
5. For every finding, cite concrete evidence paths or note `missing` evidence explicitly.
6. Record risks with severity and impact, then map remediation to owner-ready tasks.
7. Validate the report against `schemas/audit-report.schema.json` when the output is JSON.

## Output

Use `templates/audit-report.md` for human-readable reports or the JSON contract in `schemas/audit-report.schema.json` for machine-readable reports. Every factor finding should include:

- Factor identifier and title
- Status
- Evidence list
- Risks
- Remediation tasks
- Traceability links to requirements, ADRs, tests, code/config, and issues when available

## Examples

Input:

```text
Audit the billing service. Evidence is in package.json, package-lock.json, Dockerfile, helm/, openapi.yaml, .gitea/workflows/test.yml, docs/runbooks/billing.md, and dashboards/billing.json.
```

Expected output:

```text
Overall status: partial
Pass: codebase, dependencies, port binding, logs
Partial: config, backing services, telemetry, dependency hygiene
Fail: build/release/run separation, supply-chain provenance
Remediation: split release metadata from image build; add SBOM/provenance evidence; document backing-service attachment contracts.
```

## References

- @$AIWG_ROOT/agentic/code/addons/twelve-factor/checklists/audit-checklist.md
- @$AIWG_ROOT/agentic/code/addons/twelve-factor/templates/audit-report.md
- @$AIWG_ROOT/agentic/code/addons/twelve-factor/schemas/audit-report.schema.json
- @$AIWG_ROOT/agentic/code/addons/twelve-factor/fixtures/sample-audit-report.json
- @$AIWG_ROOT/agentic/code/addons/twelve-factor/rules/twelve-factor-evidence.md
