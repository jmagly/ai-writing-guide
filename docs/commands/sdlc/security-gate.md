---
name: Security Gate
description: Enforce minimum security criteria before iteration close or release
model: sonnet
tools: ["read", "write", "glob", "grep"]
argument-hint: "docs/sdlc/artifacts/<project>"
---

# Security Gate (SDLC)

## Criteria
- Approved threat model with mitigations or accepted risks
- Zero open critical vulnerabilities; highs triaged with owners/dates
- SBOM generated and reviewed (if applicable)
- Secrets policy verified; no hardcoded secrets

## Output
- `security-gate-report.md` with pass/fail and remediation tasks

