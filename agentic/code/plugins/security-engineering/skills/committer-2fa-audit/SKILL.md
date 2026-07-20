---
namespace: aiwg
name: committer-2fa-audit
platforms: [all]
description: Audit source-control organization settings for strong 2FA/MFA requirements across all committers
requires:
  - tracker-platform: github or gitea
  - token: org-admin token when querying member 2FA status
ensures:
  - report: committer 2FA enforcement status and platform setting guidance
errors:
  - token-missing: org-admin token required for platform member audit
  - unsupported-platform: selected tracker does not expose 2FA enrollment status
invariants:
  - tokens are never printed, written, or passed through shell history
  - recovery codes are never requested
commandHint:
  argumentHint: "[--platform github|gitea] [--org <name>] [--report-only]"
  allowedTools: Read, Bash
  model: haiku
  category: security
  orchestration: false
  modelRole: efficiency
  modelTier: economy
---

# Committer 2FA Audit

Audit whether all committers are covered by strong two-factor authentication policy. This enforces `committer-2fa-required` and maps curl Practice 25 into source-control governance.

## GitHub

Requires an org-admin token supplied outside the prompt context. Query the org member endpoint with the 2FA-disabled filter and report non-compliant users.

## Gitea

Gitea support is instance-dependent. When the API exposes 2FA status, report non-compliant users. When it does not, report the configured organization/site policy and mark member-level visibility as unavailable.

## Token Handling

Follow `token-security`: read tokens from a secure environment or secret manager, do not echo them, do not paste them into issue comments, and do not persist audit responses containing token material.

## References

- `agentic/code/frameworks/security-engineering/rules/committer-2fa-required.md`
- `agentic/code/addons/aiwg-utils/rules/token-security.md`
