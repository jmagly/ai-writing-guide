---
namespace: aiwg
name: security-gate
platforms: [all]
description: Enforce minimum security criteria before iteration close or release
commandHint:
  argumentHint: <docs/sdlc/artifacts/project> [--interactive] [--guidance "text"]
  allowedTools: Read, Write, Glob, Grep
  model: sonnet
  category: security-quality
---

# Security Gate (SDLC)

## Criteria

- Approved threat model with mitigations or accepted risks
- Zero open critical vulnerabilities; highs triaged with owners/dates
- SBOM generated and reviewed (if applicable)
- Secrets policy verified; no hardcoded secrets

## Output

- `security-gate-report.md` with pass/fail and remediation tasks

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Gate criteria must be concrete and verifiable (zero open criticals, SBOM present); never "acceptable risk" without documentation
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md — Fail the gate and escalate to human; do not autonomously accept or close security findings
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/token-security.md — Token security policy this gate verifies (no hardcoded secrets)
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/security-audit/SKILL.md — Upstream audit skill whose findings feed into this gate's pass/fail evaluation
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/check-traceability/SKILL.md — Traceability verification that may be required as a security gate prerequisite
