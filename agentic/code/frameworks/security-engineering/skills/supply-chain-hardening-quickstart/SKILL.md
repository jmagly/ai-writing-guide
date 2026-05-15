---
namespace: aiwg
name: supply-chain-hardening-quickstart
platforms: [all]
description: "Orchestrate a pragmatic npm supply-chain hardening pass: dependency-source audit, release-age gate, lifecycle-script review, trusted publishing, signed releases, SBOM, and user verification docs."
---

# supply-chain-hardening-quickstart

Use this skill when a user asks to harden an npm project after a
supply-chain incident, prepare a release pipeline for trusted
publishing, or give their users verification instructions.

## Runbook

1. Run `npm-supply-chain-audit` to find the current exposure.
2. Run `npm-release-age-gate` to configure the 7-day default and
   10-day high-sensitivity profile.
3. Use `supply-chain-trust` for broader release evidence: signed tags,
   provenance, cosign signatures, SBOM, and reproducible-build tradeoffs.
4. Produce user-facing docs that explain:
   - runtime Node/npm requirements,
   - contributor lockfile requirements,
   - release-publisher requirements,
   - how to verify provenance, signatures, and SBOMs,
   - what to rotate if a malicious package ran.

## Minimum issue set

File or verify issues for:

- Remove install lifecycle scripts or document why each one must remain.
- Block Git, GitHub shorthand, direct tarball, `file:`, and `link:` dep
  sources outside an allowlist.
- Add a known-affected package feed scan and document how CI points it at
  the current CSV snapshot (local path or raw gist URL).
- Add `.npmrc` `min-release-age=7`.
- Document npm 11.5+ for dependency updates.
- Move npmjs.org release publishing to trusted publishing where possible.
- Add signed tag verification before release workflows publish.
- Add tarball audit, npm audit signatures, and SBOM generation.
- Add consumer verification docs.

## Completion criteria

- A clean audit result exists with file:line findings or explicit clean
  checks.
- Known-affected exact matches are distinguished from advisory-vuln
  results and include package/version/published/detected evidence.
- Users can install without lifecycle-script surprises.
- Contributors know when npm 11.5+ is required.
- Release engineers use Node 24 or another environment satisfying npm
  trusted-publishing requirements.
- Public docs explain verification without asking users to trust the
  registry alone.
