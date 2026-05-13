# Security Engineering Templates

Templates that scaffold security-engineering artifacts in user projects.

## Available Templates

| Template | Purpose | Variables |
|---|---|---|
| [`chain-of-trust-design.md`](chain-of-trust-design.md) | Document boot/bootstrap/signing chain of trust | system-specific |
| [`cryptographic-decisions.md`](cryptographic-decisions.md) | Record applied-cryptography decisions (KDFs, AEADs, key separation) | system-specific |
| [`degraded-mode-matrix.md`](degraded-mode-matrix.md) | Fail-open vs fail-closed behavior matrix | system-specific |
| [`factor-design-rationale.md`](factor-design-rationale.md) | Authentication factor design + rationale | system-specific |
| [`physical-threat-scenarios.md`](physical-threat-scenarios.md) | Physical-access threat scenarios + mitigations | system-specific |
| [`security-md-template.md`](security-md-template.md) | Vulnerability-disclosure policy for any project | `{{project_name}}`, `{{reporting_email}}`, `{{pgp_fingerprint}}` or `{{age_recipient}}`, `{{key_location}}`, `{{acknowledgement_sla}}` (default 48h), `{{assessment_sla}}` (default 5 business days), `{{disclosure_sla}}` (default 90 days), `{{repo_url}}`, optional `{{security_advisory_url}}` |

## Rendering

Templates use `{{variable}}` substitution. Render manually by find/replace, or via:

```bash
# Render security-md-template.md for a project
aiwg run skill template-engine -- render security-md-template.md \
  --var project_name="My Project" \
  --var reporting_email=security@example.org \
  --var repo_url=https://github.com/example/my-project \
  --output ./SECURITY.md
```

Optional sections in `security-md-template.md` (bug bounty, CVE policy, hall-of-fame) are commented out by default. Uncomment those you want to publish before committing.

## See Also

- Framework overview: [`../README.md`](../README.md)
- Rules: [`../rules/RULES-INDEX.md`](../rules/RULES-INDEX.md)
- Skills: [`../skills/`](../skills/)
