# Security Policy

AIWG takes the integrity of its source, its release artifacts, and its deployed AI context seriously. This document describes how to report a vulnerability and what to expect when you do.

## Reporting a Vulnerability

**Please do not file public issues for vulnerabilities.** A public issue puts users at risk before a fix is available.

### Preferred channel — private email

Send a report to:

> **security@integrolabs.net**

We accept reports in plain text, but **strongly prefer encrypted reports** if the finding describes an active exploit, embeds a working PoC, or references unpublished cryptographic material. See **Encryption Key** below.

Include in your report:

1. A description of the vulnerability and the component(s) affected (e.g., `aiwg` CLI, a specific deployed agent/skill, a specific workflow file).
2. The version, commit SHA, or release tag the report is against.
3. Steps to reproduce — minimal PoC if possible.
4. The impact you have observed or believe is achievable.
5. Whether you intend to disclose publicly, and if so on what timeline.

### Alternate channel — Gitea security advisory

If your Gitea account can submit a private security advisory against [`roctinam/aiwg`](https://git.integrolabs.net/roctinam/aiwg/security/advisories/new), that is an acceptable channel. Note: Gitea security advisories are a relatively recent feature and behavior varies by Gitea version; if your submission fails or is not acknowledged within 48 hours, fall back to email.

### What not to do

- Do not run automated scanners against `aiwg.io` or `git.integrolabs.net` without prior coordination — they are small-team infrastructure and a vulnerability scan looks the same as an attack.
- Do not attempt to exfiltrate, modify, or destroy data belonging to other users.
- Do not submit reports that depend on physical access to a target machine or social engineering of a maintainer — those are out of scope.

## Maintainer Signing Keys

Release tags are signed by maintainer keys published in this repo. CI fails to publish any release whose tag does not verify against one of these keys (gate added per [#1299](https://git.integrolabs.net/roctinam/aiwg/issues/1299), enforced by `tools/ci/verify-signed-tag.sh`).

Either format is accepted; both can co-exist:

| Format | Public-key location | Notes |
|--------|--------------------|-------|
| GPG (ASCII-armored) | `.gitea/keys/maintainers.asc` | Preferred for long-lived release keys |
| SSH (allowed-signers format) | `.gitea/allowed_signers` | Acceptable; works with hardware-backed keys (YubiKey, etc.) |

> **Status**: Maintainer release-signing key is being generated. Until either file exists in the repo, the CI gate will fail every release tag with an actionable error. See `docs/contributing/versioning.md` for setup procedure.

Once the key is published, this section will list the fingerprint(s) so external reproducers can independently verify a release tag against a known-good identity.

## Encryption Key

For encrypted reports, use the AIWG project security key.

> **Status**: The project-specific key is being generated. Until it is published at `.github/keys/security.asc` (PGP) or `.github/keys/security.age` (age), please send your report unencrypted to `security@integrolabs.net` and we will respond from an account that can negotiate encrypted follow-up.
>
> **Operator follow-up**: generate a project-scoped key (not a personal maintainer key), publish the public component to a stable path in the repo, and update this section with the fingerprint and rotation policy. Tracked in #1285.

We will publish:

- Fingerprint of the public key
- The public key file under `.github/keys/`
- The key rotation cadence (target: annual rotation; immediate rotation on any suspected maintainer compromise)

## Response SLA

We commit to the following response timeline for valid reports:

| Stage | Target |
|-------|--------|
| **Acknowledgement** | within **24 hours** of receipt |
| **Initial assessment** (severity, scope, confirmed reproducer) | within **7 calendar days** |
| **Coordinated disclosure window** | up to **90 calendar days** from initial assessment, extended only by mutual agreement |
| **Public advisory + fix release** | targeted to coincide with disclosure window end, or sooner if a fix is ready and the report has been validated |

If we miss any of these targets we will tell you why and propose a revised timeline. We will not silently drop a report.

For findings that are actively being exploited in the wild, we will accept an accelerated disclosure timeline — please flag this in the report.

## Scope

In scope:

- The published `aiwg` npm package on `npmjs.org` and the Gitea registry.
- The AIWG repository contents at `https://git.integrolabs.net/roctinam/aiwg` and its GitHub mirror at `https://github.com/jmagly/aiwg`.
- Deployed AI context (agents, skills, commands, rules, templates) shipped under `agentic/code/` insofar as it could be weaponized against a user (e.g., a deployed agent that would induce a user's AI assistant to exfiltrate credentials).
- Release workflows under `.gitea/workflows/` and `.github/workflows/` insofar as they could be exploited to publish a malicious release.
- The supply-chain controls themselves (e.g., a finding that the release-age gate is bypassable).

Out of scope:

- The Gitea instance hosting AIWG (`git.integrolabs.net`) operationally — pen-testing the Gitea installation itself is not authorized.
- `aiwg.io` infrastructure pen-testing (the project website).
- Theoretical vulnerabilities without a demonstrable exploit path.
- Vulnerabilities in user-installed third-party AI providers, IDE extensions, or upstream LLM APIs that AIWG only forwards to — report those to the relevant vendor.
- Issues that require local OS-level compromise to exploit.

## Safe Harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to comply with this policy.
- Stop testing and notify us as soon as they identify a vulnerability.
- Do not exfiltrate data beyond what is required to demonstrate the vulnerability.
- Do not publicly disclose the vulnerability before we have had a reasonable opportunity to address it (see the disclosure window above).

We may publicly credit researchers who report valid vulnerabilities, with their consent.

## Supply-Chain Hardening Context

AIWG is currently executing a [supply-chain hardening campaign](https://git.integrolabs.net/roctinam/aiwg/issues/1278) in response to the May 2026 Mini Shai-Hulud npm worm. If you discover a finding that overlaps with one of the in-progress controls (e.g., the lifecycle script removal, the release-age gate, the signed-tag verification step), please reference the relevant sub-issue number in your report so we can de-duplicate.

## Updates to This Policy

This policy is versioned with the repository. Material changes (response SLA, scope, key fingerprint) will be announced in the release notes for the version that introduces them.

Last updated: 2026-05-12 (initial publication; #1285).
