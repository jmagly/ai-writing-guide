# ADR: Publish-Time Evidence — Tarball Audit, Audit Signatures, SBOM

- **Status**: Accepted
- **Date**: 2026-05-12
- **Issue**: [#1288](https://git.integrolabs.net/roctinam/aiwg/issues/1288)
- **Epic**: [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278) — Supply-chain hardening (Mini Shai-Hulud response)
- **Wave**: 6 (combined A11 + A12 + A13)

## Context

Earlier waves of the supply-chain hardening campaign established:

- **A5** (#1283) — npmjs.org publish via OIDC trusted publishing + `npm publish --provenance`. Produces a cryptographic attestation linking the published tarball to the GitHub Actions workflow run and source commit SHA.
- **A8** (#1287) — Cosign keyless signatures over the tarball and a release manifest, anchored in Sigstore's Fulcio CA and Rekor transparency log. Registry-independent — verifies the same way whether the consumer pulled from npmjs.org, the Gitea bundled npm registry, or any mirror.
- **A9** (#1299) — Hard cryptographic gate that every release tag must verify against a maintainer key published in `.gitea/keys/maintainers.asc` or `.gitea/allowed_signers`.
- **A20** (#1300) — Dep-source policy lint blocking `git+`, `github:`, tarball-URL, `file:`, and `link:` sources.

Three gaps remained at the publish-time boundary:

1. **Tarball composition tampering (A11)** — A8 signs whatever bytes `npm pack` produces. If an attacker pushes a commit that adds a new file at the tarball ROOT (the Mini Shai-Hulud Aikido-reported injection class — `router_init.js`, `prepare.sh`, etc.), A8 happily signs the tampered artifact. The signature attests "this came from our workflow," but the contents at the root were silently expanded.

2. **Upstream-package compromise (A12)** — A20 catches exotic dep sources, but says nothing about whether the registry-hosted tarballs in our dep graph have been tampered with. npmjs.org now signs published packages; verifying those signatures on every publish (and every CI run) catches upstream tampering before it ships in our release.

3. **Tarball composition disclosure (A13)** — A8 says "this tarball was produced by this workflow." It says nothing about what's INSIDE. A consumer running a vulnerability scan or a license audit has no portable, signed disclosure of what AIWG's dep graph and ship-tree contain at release time. CycloneDX SBOM closes this — a registry-independent, machine-readable manifest of what's in the box, signed with the same OIDC identity as the tarball.

This ADR records the three controls that close these gaps. They share a workflow surface (publish-time CI gates) and are landed as one combined commit per the per-issue audit-trail discipline.

## Decision

Land three controls in `.gitea/workflows/npm-publish.yml`, `.github/workflows/npm-publish.yml`, `.gitea/workflows/ci.yml`, and `.gitea/workflows/upload-release-sigs.yml`:

### A11 — Tarball top-level allowlist

A scanner at `tools/lint/tarball-audit.mjs` runs `npm pack --dry-run --json`, extracts unique top-level entries (anything before the first `/`), and diffs them against an allowlist at `ci/expected-tarball-top-level.txt`. Any unexpected entry fails the build with an explicit remediation procedure printed inline.

Initial allowlist (12 entries, sourced from `aiwg@2026.5.2` on 2026-05-12): `agentic`, `apps`, `bin`, `CLAUDE.md`, `dist`, `LICENSE`, `man`, `package.json`, `plugins`, `README.md`, `templates`, `tools`.

Wired into both publish workflows before any publish step. Exposed as `npm run lint:tarball` for local invocation.

### A12 — `npm audit signatures` gate

A scanner at `tools/lint/audit-signatures.mjs` runs `npm audit signatures --json` and cross-references failures against a time-bounded waiver file at `ci/npm-audit-signatures-waivers.yaml`. "Invalid" signatures (signature exists but does not verify) are never waiveable — that's the tampering signal. "Missing" signatures (no signature at all) are waiveable when the package predates npm's signature infrastructure AND has a non-expired waiver entry. Expired waivers fail.

Wired into both publish workflows AND `.gitea/workflows/ci.yml` (so signature regressions in the dep graph surface on every push, not just at publish time). Exposed as `npm run lint:audit-signatures`.

Current state: zero waivers. `npm audit signatures` on the current dep graph reports `377 packages have verified registry signatures, 41 packages have verified attestations` — clean pass.

### A13 — CycloneDX SBOM via syft

The GitHub Actions publish workflow installs syft from a tag-pinned raw GitHub URL (`raw.githubusercontent.com/anchore/syft/v1.18.0/install.sh`), runs `syft scan dir:.` after the build step, and emits a CycloneDX JSON SBOM at `aiwg-${VERSION}.cdx.json`. The SBOM is then cosign-signed using the same keyless OIDC identity as the tarball + manifest, producing `aiwg-${VERSION}.cdx.json.sigstore`. Both files are added to the GitHub release alongside the existing four assets.

The `.gitea/workflows/upload-release-sigs.yml` mirror is extended to download and re-upload the two new assets to the Gitea release.

Total assets per release: 6 (was 4 from A8).

## Alternatives considered

### A11 alternatives

**Exact-file-list manifest (rejected)**: track every file in the tarball, not just top-level. AIWG ships 4,340+ files across `agentic/**`, and every doc edit, agent definition, or skill addition would churn the manifest. Reviewer fatigue would erode the signal — the actual injection class (new file at tarball root) would get lost in the noise. Top-level scoping matches the threat model.

**Regex-based content audit (rejected)**: scan tarball contents for suspicious patterns (`exec`, `eval`, network calls). Too noisy, too slow, and the attack surface keeps evolving. The structural check (allowlist of top-level entries) is precise and low-noise.

### A12 alternatives

**Hard fail with no waivers (rejected)**: would guarantee a stuck pipeline on any dep graph that contains an older unsigned package. The npm signature infrastructure rolled out 2022-2023, and the long tail of unsigned older packages is real. Time-bounded waivers (quarterly re-evaluation) preserve the security signal without permanently blocking AIWG on legacy packages.

**Permanent waivers (rejected)**: would accumulate into a silent regression-by-default state. The `expires` field is what keeps waivers honest.

### A13 alternatives

**`@cyclonedx/cyclonedx-npm` (rejected)**: would add a multi-dep build tool to a workflow whose whole purpose is reducing dep surface. Every transitive dep in the SBOM-generator tool itself becomes a publish-time supply-chain risk. syft is a single Go binary with zero npm dep-graph impact.

**SPDX format (rejected)**: CycloneDX is the dominant format in the npm/SCA ecosystem; npm-native tooling consumes it; license-audit tools assume it. SPDX would be more enterprise-procurement-friendly but less practical for AIWG consumers. CycloneDX wins on integration breadth.

**`anchore/sbom-action` GitHub Action (deferred)**: would be the cleanest path if its SHA-pinning surface matched our other action pins. Today the action requires more research before we can pin it cleanly. Deferred to a #1310-class follow-up; current install-script approach has documented drift detection.

## Trade-offs

### syft install-script pinning

The install script is fetched from `raw.githubusercontent.com/anchore/syft/<tag>/install.sh`. The URL is content-addressed via the tag (GitHub serves the file at the exact commit the tag points at), so the script bytes are pinned by the version pin alone. An attacker who can rotate the tag would also need to push to the `anchore/syft` repo — same trust model as any other GitHub-action SHA pin.

Strict SHA enforcement of the install script is opt-in. The workflow logs the observed SHA-256 on every run so the operator can spot drift; once verified, the operator fills in `ENFORCE_INSTALL_SHA` and uncomments the strict-check block. We chose this over a guessed-and-pinned value because the value the operator records from the first real CI run is the only one we can attest is correct.

The trade-off: between the first verified release and the strict-enforcement turn-on, the install-script bytes are protected by the tag pin alone, not by SHA enforcement. The strict-SHA gate is a defense-in-depth check against tag force-push by an upstream attacker — a low-probability event already covered by GitHub's tag-protection model, and the observed-SHA logging surfaces it within one CI run.

### A12 waiver expiry

A 90-day expiry forces re-evaluation but does NOT force a fix — the operator can extend by another 90 days. The waiver discipline is about visibility and ongoing review, not about coercing upstream into signing their packages. Some packages may never get signed (abandoned-but-still-used); the waiver mechanism lets us accept that state explicitly rather than implicitly.

### A11 maintenance overhead

The 12-entry allowlist requires updating any time a new top-level entry is intentionally added (a new top-level docs directory, a new ship-tree subdirectory). The procedure is documented at the top of `ci/expected-tarball-top-level.txt`: append a row + commit a justification. We accept the ~yearly maintenance touch in exchange for catching Mini Shai-Hulud-class injection on every release.

## Consequences

### Positive

- **Three additional attack vectors closed** at publish time without expanding the operator workflow burden — all three controls are CI gates on existing workflows.
- **Composition disclosure** via SBOM enables consumers to run their own vulnerability scans, license audits, and dep-graph reviews against a signed, registry-independent manifest.
- **Tampering detection** via A11 catches the specific Mini Shai-Hulud injection class that prompted the supply-chain hardening epic in the first place.
- **Upstream signature regression detection** via A12 surfaces dep-graph trust issues within one CI run, not at audit time.
- **Six release assets** give consumers a full chain-of-custody for every release: tarball + cosign signature + provenance manifest + manifest signature + SBOM + SBOM signature.

### Negative

- **Six assets per release** is more for the operator to mentally track. Mitigated by the `upload-release-sigs.yml` workflow's hard-fail asset-count verification (it explicitly checks for all six on the Gitea release after upload).
- **A11 maintenance touch** when new top-level entries are intentionally added. Mitigated by the inline remediation procedure printed when the audit fails — the operator gets exactly the instructions they need.
- **A12 waiver bookkeeping** if AIWG's dep graph ever picks up unsigned packages. Mitigated by the time-bounded `expires` field forcing quarterly review.
- **syft install dependency** adds another publish-time external dependency (the anchore/syft repo). Mitigated by the tag-pinned URL + observed-SHA logging + opt-in strict-SHA enforcement.

### Neutral

- **CI run duration**: A11 adds ~2 seconds (one `npm pack --dry-run`). A12 adds ~5-10 seconds (one `npm audit signatures`). A13 adds ~10-20 seconds (syft install + scan + cosign sign). Negligible vs the publish workflow's total runtime.

## Verification

Local verification:

```bash
npm run lint:tarball                # A11 scanner
npm run lint:audit-signatures       # A12 scanner
```

CI verification (every push):

- `.gitea/workflows/ci.yml` runs `npm run lint:audit-signatures` (catches signature regressions in dep graph between releases).

CI verification (every publish):

- Both `.gitea/workflows/npm-publish.yml` and `.github/workflows/npm-publish.yml` run both `lint:audit-signatures` and `lint:tarball` before any publish step.
- `.github/workflows/npm-publish.yml` additionally runs the syft + cosign SBOM pipeline after publish, before upload.

Consumer verification (per release):

- `docs/releases/verifying.md` documents how to download the SBOM + its sigstore bundle and verify with the same `cosign verify-blob` invocation pattern as the tarball and manifest signatures.

## References

- [Mini Shai-Hulud Aikido report (Sept 2025)](https://www.aikido.dev/blog/shai-hulud-strikes-again-hitting-cdk-and-other-packages-in-a-fresh-npm-supply-chain-attack) — origin of the extra-file-at-tarball-root injection class A11 catches
- [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278) — supply-chain hardening epic (parent)
- [#1283](https://git.integrolabs.net/roctinam/aiwg/issues/1283) — A5: npmjs.org via GitHub Actions OIDC + provenance
- [#1287](https://git.integrolabs.net/roctinam/aiwg/issues/1287) — A8: Cosign keyless tarball + manifest signing
- [#1288](https://git.integrolabs.net/roctinam/aiwg/issues/1288) — this ADR (A11 + A12 + A13)
- [#1300](https://git.integrolabs.net/roctinam/aiwg/issues/1300) — A20: dep-source policy lint
- [`docs/releases/verifying.md`](../../docs/releases/verifying.md) — consumer-facing verification documentation
- [`ci/expected-tarball-top-level.txt`](../../ci/expected-tarball-top-level.txt) — A11 allowlist
- [`ci/npm-audit-signatures-waivers.yaml`](../../ci/npm-audit-signatures-waivers.yaml) — A12 waivers
- [`ci/digests.txt`](../../ci/digests.txt) — syft pin
- [CycloneDX specification](https://cyclonedx.org/specification/overview/)
- [syft](https://github.com/anchore/syft)
- [npm package signatures](https://docs.npmjs.com/about-registry-signatures)
