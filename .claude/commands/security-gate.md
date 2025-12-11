---
description: Enforce minimum security criteria before iteration close or release
category: security-quality
argument-hint: <docs/sdlc/artifacts/project> [--guidance "text"] [--interactive]
allowed-tools: Read, Write, Glob, Grep
model: sonnet
---

# Security Gate (SDLC)

## Criteria

- Approved threat model with mitigations or accepted risks
- Zero open critical vulnerabilities; highs triaged with owners/dates
- SBOM generated and reviewed (if applicable)
- Secrets policy verified; no hardcoded secrets


## Optional Parameters

### --guidance "text"
Provide strategic context or constraints to guide the command execution:
```
/security-gate --guidance "Focus on security implications"
```

### --interactive
Enable interactive mode for step-by-step confirmation and input:
```
/security-gate --interactive
```

When interactive mode is enabled, the command will:
1. Confirm understanding of the task before proceeding
2. Ask clarifying questions if requirements are ambiguous
3. Present options for user decision at key branch points
4. Summarize changes before applying them

## Output

- `security-gate-report.md` with pass/fail and remediation tasks
