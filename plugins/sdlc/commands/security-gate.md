---
description: Enforce minimum security criteria before iteration close or release
category: security-quality
argument-hint: <docs/sdlc/artifacts/project> [--interactive] [--guidance "text"]
allowed-tools: Read, Write, Glob, Grep
model: sonnet
---

# Security Gate (SDLC)

## Criteria

- Approved threat model with mitigations or accepted risks
- Zero open critical vulnerabilities; highs triaged with owners/dates
- SBOM generated and reviewed (if applicable)
- Secrets policy verified; no hardcoded secrets

## Output

- `security-gate-report.md` with pass/fail and remediation tasks
