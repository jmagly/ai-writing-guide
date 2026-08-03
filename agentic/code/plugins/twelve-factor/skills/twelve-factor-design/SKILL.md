---
namespace: aiwg
name: twelve-factor-design
description: Generate or review application architecture against Twelve-Factor and modern 12+ Factor design criteria.
platforms: [all]
triggers:
  - "twelve factor application design"
  - "12 factor design review"
  - "review architecture against 12+ factor"
  - "cloud native app design audit"
---

# Twelve-Factor Design

Use this skill to design or review an application before implementation or major refactoring. It turns requirements, architecture notes, and platform constraints into a factor-by-factor design review with decisions, risks, evidence needs, and remediation candidates.

## Triggers

- "Design this service as a Twelve-Factor app"
- "Review this architecture against 12+ Factor criteria"
- "Generate a cloud-native operational design checklist"
- "Check whether this design is platform portable and observable"

## Behavior

1. Identify the application boundary: service name, runtime, deployment model, backing services, operators, users, and platform targets.
2. Collect available design inputs: requirements, ADRs, API contracts, event schemas, service diagrams, deployment notes, runbooks, test strategy, and security assumptions.
3. Review the original Twelve-Factor dimensions: codebase, dependencies, config, backing services, build/release/run, processes, port binding, concurrency, disposability, dev/prod parity, logs, and admin processes.
4. Review modern 12+ Factor extensions: API-first contracts, telemetry and observability, security by default, supply-chain provenance, dependency hygiene, runtime disposability, and platform portability.
5. For each factor, produce a status of `pass`, `partial`, `fail`, or `not_applicable`, with rationale and missing evidence.
6. Map factors to requirements, ADRs, tests, code/config paths, and operational artifacts when they exist.
7. Generate remediation tasks for gaps that block implementation, readiness review, or continuous audit.

## Output

Return a design review with these sections:

- Application boundary and assumptions
- Factor coverage summary
- Factor-by-factor design decisions and risks
- Required evidence for later audit
- Remediation backlog candidates
- Open questions for humans

## Examples

Input:

```text
Review the checkout API design for 12+ Factor readiness. Inputs: ADR-004, OpenAPI spec, Dockerfile, Kubernetes deployment, runbook, and CI workflow.
```

Expected output:

```text
Design status: partial
High-risk gaps: config separation, dev/prod parity, telemetry SLOs
Remediation: externalize payment provider config; add OpenTelemetry trace plan; add ADR for backing-service attachment and failover.
```

## References

- @$AIWG_ROOT/agentic/code/addons/twelve-factor/checklists/design-checklist.md
- @$AIWG_ROOT/agentic/code/addons/twelve-factor/templates/remediation-backlog.md
- @$AIWG_ROOT/agentic/code/addons/twelve-factor/rules/twelve-factor-evidence.md
