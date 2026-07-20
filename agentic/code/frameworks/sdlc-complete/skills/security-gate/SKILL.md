---
namespace: aiwg
name: security-gate
platforms: [all]
description: Enforce minimum security criteria before iteration close or release
commandHint:
  argumentHint: <docs/sdlc/artifacts/project> [--interactive] [--guidance "text"]
  allowedTools: Read, Write, Glob, Grep
  model: opus
  category: security-quality
  modelRole: reasoning
  modelTier: premium
  modelRationale: The skill makes a release-blocking security decision.
---

# Security Gate (SDLC)

## Criteria

- Approved threat model with mitigations or accepted risks
- Zero open critical vulnerabilities; highs triaged with owners/dates
- SBOM generated and reviewed (if applicable)
- Secrets policy verified; no hardcoded secrets

## Output

- `security-gate-report.md` with pass/fail and remediation tasks (structured artifact for downstream agents)
- **Append** a gate decision block to `.aiwg/security/audit.md` (the human-readable rolling audit log — see schema below)

## Rolling audit log

`.aiwg/security/audit.md` is the single append-only rollup of security activity in this project. Humans read it first; downstream agents continue to consume the structured per-area artifacts. Both views are maintained.

After running the gate, append a block in this exact format (create `.aiwg/security/audit.md` if it does not exist; create the `.aiwg/security/` directory if missing):

```markdown
---

## [YYYY-MM-DD HH:MM] security-gate — <gate name or scope>

**Source:** security-gate
**Scope:** <artifact path or release identifier under review>
**Verdict:** <pass | fail | conditional>

### Findings rolled up

- **[severity] location** — description. Confirmation quote: `<source snippet>`. Remediation: <action>.
- ...

### References

- Structured artifact: `security-gate-report.md`
- Related: <issue or commit reference if applicable>
```

The same schema is used by `security-auditor` for its findings. Do not rewrite or truncate prior entries — append only.

After appending, log an `audit` entry to `.aiwg/activity.log` per the `activity-log` rule.

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Gate criteria must be concrete and verifiable (zero open criticals, SBOM present); never "acceptable risk" without documentation
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md — Fail the gate and escalate to human; do not autonomously accept or close security findings
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/token-security.md — Token security policy this gate verifies (no hardcoded secrets)
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/security-audit/SKILL.md — Upstream audit skill whose findings feed into this gate's pass/fail evaluation
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/check-traceability/SKILL.md — Traceability verification that may be required as a security gate prerequisite
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/activity-log.md — Append-only artifact discipline used by `.aiwg/security/audit.md`
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/security-auditor.md — Companion writer of the rolling audit log (same schema)
