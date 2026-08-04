---
enforcement: high
---

# Twelve-Factor Evidence Rule

**Enforcement Level**: HIGH
**Scope**: twelve-factor design and audit workflows

## Rule

Every Twelve-Factor or 12+ Factor finding must be tied to concrete evidence or explicitly marked as missing evidence.

## Requirements

- Each factor finding has exactly one status: `pass`, `partial`, `fail`, or `not_applicable`.
- A `pass` finding cites enough evidence to reproduce the judgment.
- A `partial` or `fail` finding includes at least one risk or remediation task.
- Missing evidence is recorded as `missing`; do not infer compliance from intent, naming, or undocumented conventions.
- Traceability links should connect findings to requirements, ADRs, code/config paths, tests, runbooks, dashboards, issues, or PRs when available.
- Security and supply-chain findings must distinguish observed evidence from recommended remediation.

## Rationale

12+ Factor reviews become useful to downstream quality, security, reporting, and delivery workflows only when findings are evidence-backed and traceable. Unsupported claims are not auditable and should not drive release gates.
