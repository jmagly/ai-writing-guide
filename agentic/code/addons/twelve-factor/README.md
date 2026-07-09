# Twelve-Factor Application Design and Audit

The `twelve-factor` addon packages design-time guidance and audit-time evidence collection for applications that need to satisfy the original Twelve-Factor App principles plus common modern extensions: API-first contracts, telemetry, security by default, supply-chain provenance, dependency hygiene, runtime disposability, and platform portability.

Use it when a team is designing a new service, reviewing an existing architecture, preparing operational readiness evidence, or turning 12+ Factor gaps into remediation work.

## Included Workflows

| Workflow | Use | Primary artifact |
| --- | --- | --- |
| `twelve-factor-design` | Generate or review an application architecture against 12+ Factor design criteria. | Design review with factor-by-factor decisions and risks |
| `twelve-factor-audit` | Collect evidence from code, config, tests, docs, and runtime signals. | Structured audit report with pass/partial/fail findings |

## Inputs

Provide as many of these as are available:

- Requirements, use cases, ADRs, service diagrams, or architecture notes
- Repository paths for source, configuration, deployment manifests, CI, and tests
- API contracts, event schemas, service catalog records, runbooks, and dashboards
- Security, dependency, SBOM, provenance, and operational readiness evidence
- Known platform targets and constraints

The addon is stack-agnostic. Stack examples may be used as evidence, but findings should be framed around factor criteria rather than a specific framework.

## Generated Artifacts

- Design review notes organized by factor, with decisions, assumptions, and open questions
- Audit reports matching `schemas/audit-report.schema.json`
- Remediation backlog items using `templates/remediation-backlog.md`
- Evidence checklists for configuration, dependencies, backing services, logs, processes, ports, concurrency, disposability, dev/prod parity, observability, security, and provenance

## Downstream Integration

Audit findings are structured for downstream quality, security, reporting, and delivery workflows:

- `status` maps to pass/fail/partial quality gates.
- `evidence` preserves traceability to code, config, tests, docs, dashboards, or human-provided artifacts.
- `risks` support security and operational review.
- `remediation` entries can become issue tracker work items.
- `traceability` links factors to requirements, ADRs, tests, and code/config evidence.

## Discovery

Find the addon workflows through the standard capability path:

```bash
aiwg discover "twelve factor application design"
aiwg discover "12 factor audit evidence"
aiwg show skill twelve-factor-audit
```

## Files

- `skills/twelve-factor-design/SKILL.md` — design workflow
- `skills/twelve-factor-audit/SKILL.md` — audit workflow
- `agents/twelve-factor-reviewer.md` — specialist reviewer
- `rules/twelve-factor-evidence.md` — evidence and traceability rule
- `checklists/` — design and audit checklists
- `prompts/` — reusable review and evidence prompts
- `templates/` — report and remediation templates
- `schemas/audit-report.schema.json` — structured audit output contract
- `fixtures/sample-audit-report.json` — representative audit artifact
