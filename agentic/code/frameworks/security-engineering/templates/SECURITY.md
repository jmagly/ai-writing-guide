# Security Policy

<!--
  SECURITY.md template — copy to repo root and fill in {{placeholders}}.
  Removed sections you don't need; keep the structure scannable.
  Reference: https://docs.github.com/en/code-security/security-advisories
  Reference: https://curl.se/docs/vuln-disclosure.html
-->

## Reporting a Vulnerability

**Do not file a public issue for security reports.** Public issues alert attackers before a fix is available.

Use one of the following private channels:

### Preferred: {{primary_channel}}

<!-- Pick ONE primary channel: -->
<!-- (A) Private repository security advisory (GitHub/Gitea): -->
- Open a private security advisory at `{{repo_url}}/security/advisories/new`

<!-- (B) Encrypted email: -->
<!-- - Email `security@{{org_domain}}` -->
<!-- - PGP key fingerprint: `{{pgp_fingerprint}}` -->
<!-- - PGP key file: `{{repo_url}}/raw/main/SECURITY.pgp` -->

<!-- (C) Encrypted form: -->
<!-- - Submit via `{{report_url}}` (encrypted at rest, access limited to {{recipient_role}}) -->

### Fallback: {{fallback_channel}}

<!-- If the primary channel is unavailable: -->
<!-- - Signal contact: `{{signal_handle}}` -->
<!-- - Keybase: `keybase://team/{{team}}` -->

### What to include

To help us triage and reproduce quickly:

1. **Affected version(s)** — exact version string, commit SHA, or release tag
2. **Vulnerability class** — RCE, SQLi, XSS, info disclosure, DoS, supply-chain, crypto weakness, ...
3. **Impact** — what an attacker can do (privilege escalation, data theft, lateral movement, ...)
4. **Reproduction** — minimal steps or PoC; do NOT post PoC publicly
5. **Discovery context** — how you found it (manual review, fuzzing, audit tool — name the tool)
6. **Preferred disclosure timeline** — your preference (defaults below apply otherwise)

We treat all reports as confidential by default. Do not include sensitive data unless required for reproduction.

## Scope

### In scope

<!-- Enumerate covered surfaces. Be specific. -->
- {{project_name}} core code in `{{repo_url}}`
- Official releases on `{{distribution_channel}}`
- Documented public APIs
- Build and release infrastructure (signing, CI, distribution)

### Out of scope

<!-- Enumerate exclusions to set expectations. -->
- Findings in third-party dependencies (report to the upstream project; we will track via {{advisory_channel}})
- Social-engineering attacks against maintainers
- Denial-of-service requiring privileged access already inside the trust boundary
- Issues in unsupported versions (see "Supported Versions" below)

## Supported Versions

| Version | Status        | Security fixes |
|---------|---------------|----------------|
| {{current_minor}}.x   | Active        | Yes            |
| {{previous_minor}}.x  | Maintenance   | Yes (critical only) |
| {{older_versions}}     | End of life   | No             |

Reports against EOL versions will be triaged for context but not fixed.

## Disclosure Timeline

We follow a coordinated-disclosure model:

| Day | Milestone |
|-----|-----------|
| 0   | Report received; acknowledgment within {{ack_window}} (default: 72 hours) |
| 0–7 | Initial triage; severity assessment; reporter contact established |
| 7–30 | Fix development; reporter consulted on technical details |
| 30–45 | Patch released to supported versions |
| 45–90 | Public disclosure (advisory, CVE if applicable, release notes) |

We coordinate with reporters on timing. The default embargo is **90 days from the original report** unless:

- The issue is actively exploited in the wild (immediate disclosure with mitigation)
- A coordinated industry-wide disclosure window applies
- The reporter requests a different timeline

We will not publish before the embargo unless required by active exploitation.

## CVE Assignment

For qualifying issues, we will request a CVE through {{cve_authority}} (e.g., MITRE, GitHub Security Advisories CNA, or our own CNA if applicable). Reporters are credited unless they request anonymity.

## Hall of Fame / Acknowledgments

We publish a list of researchers who have responsibly disclosed vulnerabilities at `{{repo_url}}/blob/main/SECURITY-CREDITS.md`. Inclusion is opt-in and requires the issue to be fixed and publicly disclosed.

## Bug Bounty

<!-- Choose ONE: -->

### Option A: No bounty program

We do not currently offer monetary bounties. We deeply appreciate researcher time and credit all valid reports.

<!-- ### Option B: Bounty program -->
<!-- See `{{bounty_url}}` for scope, rewards, and rules. -->

## Security Updates

- **Notification**: Subscribe to `{{security_announce_channel}}` for advance notice of security releases
- **Signed releases**: Releases are signed with `{{release_signing_key}}` ({{key_fingerprint}})
- **Verification**: See `{{repo_url}}/blob/main/docs/verifying-releases.md`

## Security Hardening

Operators deploying {{project_name}} should consult:

- {{repo_url}}/blob/main/docs/security-hardening.md — recommended deployment configuration
- {{repo_url}}/blob/main/docs/threat-model.md — attacker model and assumptions

---

**Maintainer notes** (remove before publishing):

- Set `{{ack_window}}` realistically — 72h business hours is common; same-day is unrealistic for small teams.
- The 30/45/90 timeline is a starting point. Adjust to match your release cadence.
- If you offer a bounty program, ensure scope and exclusions are precise — vague bounty programs invite low-quality reports.
- Maintain the `SECURITY-CREDITS.md` file actively — it builds trust and recognition.
- Test your private channel quarterly: send a known-good report to yourself and verify the entire receipt → ack → triage flow works.
