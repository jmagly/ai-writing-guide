# Security Policy

<!--
This template is from the AIWG security-engineering framework
(#1294 / B7). Fill in the {{variables}} below and remove this comment
block before publishing. Optional sections at the bottom are commented
out — uncomment any you want to publish.

Variables to fill in:
  {{project_name}}        — Your project's display name
  {{reporting_email}}     — Private vulnerability-disclosure email
  {{pgp_fingerprint}}     — Optional: GPG fingerprint for encrypted reports (omit if none)
  {{age_recipient}}       — Optional: age recipient string for encrypted reports (omit if none)
  {{key_location}}        — Path or URL where the public key is published
  {{acknowledgement_sla}} — How fast you'll acknowledge a report (default: 48 hours)
  {{assessment_sla}}      — How fast you'll assess severity and triage (default: 5 business days)
  {{disclosure_sla}}      — Coordinated disclosure window (default: 90 days from acknowledgement)
  {{repo_url}}            — Canonical repository URL
  {{security_advisory_url}} — Optional: platform-native private advisory channel (GitHub/Gitea/GitLab)
-->

{{project_name}} takes the integrity of its source, its release artifacts, and the systems it touches seriously. This document describes how to report a vulnerability and what to expect when you do.

## Reporting a Vulnerability

**Please do not file public issues for vulnerabilities.** A public issue puts users at risk before a fix is available.

### Preferred channel — private email

Send a report to:

> **{{reporting_email}}**

We accept reports in plain text. For active exploits, working PoCs, or unpublished cryptographic material, **strongly prefer encrypted reports** — see **Encryption Key** below.

Include in your report:

1. A description of the vulnerability and the component(s) affected.
2. The version, commit SHA, or release tag the report is against.
3. Steps to reproduce — minimal proof-of-concept if possible.
4. The impact you have observed or believe is achievable.
5. Whether you intend to disclose publicly, and if so on what timeline.

### Alternate channel — private security advisory

<!-- Uncomment and adjust if your hosting platform supports private advisories. -->
<!--
If your account can submit a private security advisory against [`{{security_advisory_url}}`]({{security_advisory_url}}), that is an acceptable channel. If submission fails or is not acknowledged within {{acknowledgement_sla}}, fall back to email.
-->

### What not to do

- Do not run automated scanners against {{project_name}} infrastructure without prior coordination — scans look identical to attacks from the receiving end.
- Do not attempt to exfiltrate, modify, or destroy data belonging to other users.
- Do not submit reports that depend on physical access to a target machine or social engineering of a maintainer — those are out of scope.

## Response SLAs

| Phase | Target | What we will do |
|---|---|---|
| **Acknowledgement** | Within {{acknowledgement_sla}} of receipt | Confirm we received the report and started triage |
| **Initial assessment** | Within {{assessment_sla}} | Confirm severity, scope, and reproducibility; share initial impact analysis |
| **Coordinated disclosure** | {{disclosure_sla}} from acknowledgement (negotiable) | Ship the fix; coordinate with reporter on a public advisory |

If a fix is going to take longer than the disclosure window, we will negotiate an extension with the reporter rather than disclose unilaterally.

## Safe Harbor

We will not take legal action against, or report to law enforcement, security researchers who:

- Make a good-faith effort to avoid privacy violations, data destruction, and service disruption while researching
- Report vulnerabilities through the channels described above
- Do not disclose publicly before we have had a reasonable opportunity to address the issue
- Do not extort, threaten, or otherwise act in bad faith

This is patterned after the [`disclose.io` SAFE-HARBOR clause](https://disclose.io/) — refer to that document for the canonical wording and full legal text.

## Scope

### In scope

- Source code in [`{{repo_url}}`]({{repo_url}})
- Released artifacts (npm packages, binaries, container images) published by the project
- Documentation that could mislead users into insecure configurations

### Out of scope

- Vulnerabilities in third-party dependencies (please report upstream first; we'll prioritize updates after that)
- Issues that require physical access to a target machine
- Issues that require social engineering of a maintainer
- Theoretical attacks without a demonstrated impact path
- Vulnerabilities in development environments, local test fixtures, or unreleased branches

## Maintainer Signing Keys

<!--
If your project signs releases, document the signing key(s) here so external reproducers can independently verify a release tag against a known-good identity. Delete this section if you don't sign releases.
-->

Release tags are signed by maintainer keys published in this repo. CI fails to publish any release whose tag does not verify against one of these keys.

| Format | Public-key location | Notes |
|--------|--------------------|-------|
| GPG (ASCII-armored) | `{{key_location}}` | Long-lived release keys |
| SSH (allowed-signers format) | `{{key_location}}` | Works with hardware tokens (YubiKey, etc.) |

> **Active signing key**
> Principal: `{{project_name}} Release Signing <{{reporting_email}}>`
> Fingerprint: `{{pgp_fingerprint}}`
> Algorithm: ed25519 (recommended) or Ed25519-SSH

External reproducers should verify release tags only after importing the key and confirming the fingerprint matches the value above.

## Encryption Key

<!--
For encrypted vulnerability reports. Choose one (PGP or age) and remove the other. Delete this entire section if you don't accept encrypted reports yet.
-->

### Option A — GPG (PGP)

Import the project security key:

```bash
gpg --recv-keys {{pgp_fingerprint}}
# OR
curl -fsSL {{key_location}} | gpg --import
```

Verify the fingerprint matches: `{{pgp_fingerprint}}`

Encrypt your report:

```bash
gpg --encrypt --armor --recipient {{pgp_fingerprint}} report.txt > report.txt.asc
# Send report.txt.asc as an email attachment to {{reporting_email}}
```

### Option B — age

Project age recipient:

```
{{age_recipient}}
```

Encrypt your report:

```bash
age --encrypt --recipient {{age_recipient}} --output report.age report.txt
# Send report.age as an email attachment to {{reporting_email}}
```

## Acknowledgement

<!--
Optional. Uncomment to publish a hall-of-fame for responsibly-disclosed vulnerabilities.

We acknowledge security researchers who help keep {{project_name}} users safe. With reporter permission, we add disclosed findings to:

- The relevant release's CHANGELOG entry
- A "Security Acknowledgements" page (if maintained)
- A CVE record (where applicable — see CVE Assignment Policy below)
-->

## Bug Bounty

<!--
Optional. Uncomment if you offer a bounty program.

{{project_name}} does not currently operate a paid bug bounty program. We acknowledge contributors publicly with reporter permission (see above).

— OR —

{{project_name}} offers monetary rewards for qualifying vulnerability reports. See [{{bounty_url}}]({{bounty_url}}) for current bounty tiers and qualifying criteria.
-->

## CVE Assignment Policy

<!--
Optional. Uncomment if you participate in CVE assignment.

For vulnerabilities with non-trivial impact, we will request a CVE identifier from MITRE (or our CNA, if assigned). The reporter is acknowledged in the CVE record by default; opt-out is available on request.
-->

## Updates to this Policy

This security policy may be updated. Substantive changes will be announced in the CHANGELOG for the affected release. Reporters with active disclosures will be notified directly of any change that affects their pending report.

---

<sub>This security policy is based on the AIWG security-engineering framework's `security-md-template`. Reusable for other projects — see the [AIWG documentation](https://aiwg.io) for the template source and rendering guide.</sub>
