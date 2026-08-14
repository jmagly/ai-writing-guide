# Verifying AIWG Releases

AIWG ships four cryptographic verifications you can run on any release:

1. **npm provenance attestation** — proves a published tarball was produced
   by a specific GitHub Actions workflow run from a specific source commit.
   Lands on npmjs.org starting with the first release published via #1283
   (A5, the GitHub Actions OIDC trusted-publishing path).
2. **Signed git tag** — proves the tag was created by a holder of the AIWG
   maintainer release key. Applies to every release tag from `cee91c96`
   (#1299 / A9, Wave 3 of #1278) forward.
3. **Cosign tarball signature** — proves the release tarball was produced
   by the AIWG GitHub Actions publish workflow, registry-independent.
   Verifiable offline against a Sigstore Rekor transparency-log entry
   embedded in the signature bundle. Applies to the first release
   published after #1287 (A8, Wave 5 of #1278) and forward.
4. **CycloneDX SBOM** — a registry-independent, signed software bill of
   materials disclosing exactly what shipped in the tarball, down to the
   transitive dep level. Applies to the first release published after
   #1288 (A13, Wave 6 of #1278) and forward.

This doc walks through all four verifications and shows what each one
rules out.

> Historical note: releases earlier than #1299 (`v2026.5.2` and prior) are
> not retroactively signed. The signed-tag gate is forward-going only.
> Provenance attestations and cosign tarball signatures are also forward-
> going — releases before each control's first activation do not have
> them.

## Verification 1 — npm provenance attestation

### What it proves

The published tarball was built by GitHub Actions workflow
`.github/workflows/npm-publish.yml` on commit `<sha>` of the
`github.com/jmagly/aiwg` repository, on a runner npmjs.org could
cryptographically attest to. Independent of AIWG's claim — the chain
of trust roots in npmjs.org's verification of GitHub's OIDC token, not
in any AIWG-controlled credential.

### How to verify

```bash
# Replace 2026.5.3 with the version you want to verify.
npm view aiwg@2026.5.3 --json | jq .dist.attestations
```

Expected output: a non-empty JSON value under `.dist.attestations`.
Recent npm CLI/registry versions may represent the attestation metadata
as an object or an array. The important signal is that the published
version has an attestation entry linking the tarball SHA to:

- The GitHub Actions workflow file path (`.github/workflows/npm-publish.yml`)
- The workflow run URL
- The source commit SHA
- The build environment (`runner.os`, action versions)

If the output is `null`, `[]`, or `{}`, the release does **not** have an
OIDC-issued provenance attestation. Either it predates A5's first OIDC
publish, or something went wrong with the trusted-publisher
configuration. Treat the release with the same trust level you would
treat a release from any registry without provenance — i.e., verify the
signed tag below as the next-strongest signal.

### Deeper verification

`npm` itself can validate registry signatures and provenance
attestations for the dependency tree installed in your current project:

```bash
mkdir -p /tmp/aiwg-verify && cd /tmp/aiwg-verify
npm init -y >/dev/null
npm install --package-lock-only --ignore-scripts aiwg@2026.5.3
npm audit signatures --include-attestations
```

This builds a lockfile without running package lifecycle scripts, then
asks npm to verify registry signatures and available provenance
attestations for the downloaded packages. Output like `verified registry
signatures, audited <N> packages` means npm accepted the signatures for
that dependency tree.

### What it does **not** prove

- That the source commit was made by an AIWG maintainer. A push from a
  compromised GitHub account could produce a valid attestation. Use
  verification 2 (signed tag) to close that gap.
- That the tarball is functionally safe. Provenance is about *who built
  what*, not *whether the result is malware-free*. Run AIWG through your
  own runtime sandbox if that matters to you.

## Verification 2 — Signed git tag

### What it proves

The annotated tag `v<version>` was created by a holder of the AIWG
maintainer release-signing key. Independent of npmjs.org, GitHub, and
Gitea — the chain of trust roots in the published maintainer key
fingerprint in [`SECURITY.md`](https://github.com/jmagly/aiwg/blob/main/SECURITY.md).

### How to verify

```bash
# Clone (or use an existing checkout) from a public mirror you trust the
# transport of. The signature verification doesn't trust the mirror itself.
git clone https://github.com/jmagly/aiwg.git
cd aiwg

# Import the published maintainer key.
gpg --import .gitea/keys/maintainers.asc
gpg --fingerprint 401584AAA3376B898FB34427839584D0E25E5126
# Confirm the fingerprint matches SECURITY.md:
# 401584AAA3376B898FB34427839584D0E25E5126

# Verify a specific tag.
git tag -v v2026.5.3
```

Expected output:

```
object <commit-sha>
type commit
tag v2026.5.3
tagger AIWG Release Signing <release@aiwg.io> 2026-05-12 12:34:56 +0000

<tag annotation message>
gpg: Signature made <date>
gpg:                using RSA key <key-id>
gpg: Good signature from "AIWG Release Signing <release@aiwg.io>" [ultimate]
```

The key line is `Good signature from`. The fingerprint `gpg` reports
must match the fingerprint published in `SECURITY.md`. If the
fingerprint differs, treat the tag as untrusted regardless of the
"Good signature" line.

### If the tag is signed with SSH instead of GPG

AIWG supports both GPG and SSH signing on the maintainer side. The
`.gitea/allowed_signers` file (if present) holds the SSH allowed-signers
for verification. The command becomes:

```bash
# Configure git to verify against the published allowed-signers file.
git config gpg.ssh.allowedSignersFile .gitea/allowed_signers
git tag -v v2026.5.3
```

Same `Good signature` expectation; the verifying key will be the SSH
public key whose fingerprint is published in `SECURITY.md`.

### What it does **not** prove

- That the tag was created in CI versus on a maintainer's workstation.
  The signing key signs the tag, not the environment that produced it.
  Use verification 1 (provenance) to close that gap on npmjs.org
  artifacts.
- That the maintainer key itself is uncompromised. If the key leaks,
  every tag signed with it before rotation is also implicated. Mitigated
  by AIWG's key-rotation procedure documented in
  [`docs/contributing/versioning.md`](../contributing/versioning.md)
  and the operator-hygiene controls in
  [`docs/contributing/secret-rotation.md`](../contributing/secret-rotation.md).

## Verification 3 — Cosign tarball signature

### What it proves

The specific tarball bytes you have on disk were produced by the AIWG
GitHub Actions publish workflow at `.github/workflows/npm-publish.yml`,
running on `github.com/jmagly/aiwg` at the tagged commit. Independent of
both npmjs.org and the registry the tarball came from — works the same
whether you pulled the file from npmjs.org, the Gitea bundled npm
registry, the GitHub release, the Gitea release, or any mirror.

The chain of trust roots in Sigstore's Fulcio CA (which only signs
keyless certificates against verified OIDC identities) and is anchored
in the Rekor transparency log (which makes silent re-signing detectable
by anyone watching).

### How to verify

Required: `cosign` CLI v2.0+ — install from
<https://github.com/sigstore/cosign/releases>.

Download the assets from either the [GitHub
release](https://github.com/jmagly/aiwg/releases) or the [Gitea
release](https://git.integrolabs.net/roctinam/aiwg/releases) for the
version you want to verify. You need:

- `aiwg-X.Y.Z.tgz` (the tarball itself)
- `aiwg-X.Y.Z.tgz.sigstore` (the signature bundle)

Verify:

```bash
cosign verify-blob \
  --bundle aiwg-X.Y.Z.tgz.sigstore \
  --certificate-identity-regexp '^https://github.com/jmagly/aiwg/\.github/workflows/npm-publish\.yml@refs/tags/v' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  aiwg-X.Y.Z.tgz
```

Expected output: `Verified OK`.

The two `--certificate-*` flags are non-optional. They are what bind the
signature to a specific workflow (`.github/workflows/npm-publish.yml` on
`jmagly/aiwg`) and a specific OIDC issuer (GitHub Actions). Without
them, `cosign verify-blob` would accept any keyless signature from any
GitHub Actions workflow on any repo — defeating the point of the
identity binding.

### Cross-check the release manifest

Every release also ships a signed `release-manifest.json` containing the
tarball SHA-256, the version, the tag SHA, the source commit SHA, and
the workflow run URL. Verify it the same way:

```bash
cosign verify-blob \
  --bundle release-manifest.json.sigstore \
  --certificate-identity-regexp '^https://github.com/jmagly/aiwg/\.github/workflows/npm-publish\.yml@refs/tags/v' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  release-manifest.json
```

Then sanity-check that the manifest's `tarball_sha256` matches the
actual tarball on disk:

```bash
jq -r '.tarball_sha256' release-manifest.json
sha256sum aiwg-X.Y.Z.tgz
```

The two values must match. If they don't, the manifest is signed for a
different tarball than the one you have — treat the artifact as
untrusted.

### What it does **not** prove

- That the source commit was made by an AIWG maintainer. The cosign
  signature binds the tarball to a specific workflow run, not to a
  specific human author. Use verification 2 (signed tag) to close that
  gap.
- That the tarball is functionally safe. The signature is about *who
  built what*, not *whether the result is malware-free*. Run AIWG
  through your own runtime sandbox if that matters to you.
- That the signing workflow itself is uncompromised. If an attacker can
  push to `.github/workflows/npm-publish.yml` AND push a signed tag,
  they can produce a cosign-verifiable malicious tarball. The combined
  defense (signed tag + cosign signature) closes this — the attacker
  would need both Gitea/GitHub write access AND the maintainer release
  key AND a Sigstore-recognized OIDC identity on the AIWG repo.

## Verification 4 — CycloneDX SBOM

### What it proves

The signed SBOM discloses the installed release graph observed by CI: the
exact direct + transitive npm deps, their versions, and any non-npm components
syft detected in the release workspace. npm dependency packages are fetched as
separate archives during installation; they are not copied into the `aiwg`
tarball merely because they appear in this SBOM. The SBOM bytes are signed with the same
keyless OIDC identity that signed the tarball (Verification 3), so the
SBOM can be trusted to the same extent and via the same chain as the
tarball itself.

This is composition disclosure, not malware detection — the SBOM tells
you *what's in the box*, not *whether it's safe to run*. Pipe the SBOM
into your SCA tool of choice (Grype, Trivy, Dependency-Track, Snyk, your
internal scanner) for vulnerability assessment.

### How to verify

Required: `cosign` CLI v2.0+ — same as Verification 3.

Download from either release:

- `aiwg-X.Y.Z.cdx.json` (the SBOM itself, CycloneDX JSON format)
- `aiwg-X.Y.Z.cdx.json.sigstore` (the signature bundle)

Verify the signature:

```bash
cosign verify-blob \
  --bundle aiwg-X.Y.Z.cdx.json.sigstore \
  --certificate-identity-regexp '^https://github.com/jmagly/aiwg/\.github/workflows/npm-publish\.yml@refs/tags/v' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  aiwg-X.Y.Z.cdx.json
```

Expected output: `Verified OK`.

### Inspecting the SBOM

CycloneDX JSON is consumable by any standard SCA tool. A few quick
inspections:

```bash
# Top-level metadata
jq '.metadata' aiwg-X.Y.Z.cdx.json

# Total component count
jq '.components | length' aiwg-X.Y.Z.cdx.json

# Component names + versions, sorted
jq -r '.components[] | "\(.name)@\(.version)"' aiwg-X.Y.Z.cdx.json | sort
```

The `aiwg` and `@aiwg/cli` package archives also ship
`THIRD_PARTY_NOTICES.md`. It identifies the reviewed AGPL-licensed Fortemi and
Bytecask runtime dependencies, immutable source references, and commands for
checking the versions npm actually resolved. The detailed boundary decision is
in [`fortemi-agpl-runtime-boundary.md`](../contributing/fortemi-agpl-runtime-boundary.md).

### Feeding into an SCA scanner

```bash
# Grype
grype sbom:aiwg-X.Y.Z.cdx.json

# Trivy
trivy sbom aiwg-X.Y.Z.cdx.json

# Dependency-Track (upload to your DT instance)
curl -X POST "https://dt.example.com/api/v1/bom" \
  -H "X-Api-Key: $DT_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F "project=$PROJECT_UUID" \
  -F "bom=@aiwg-X.Y.Z.cdx.json"
```

### What it does **not** prove

- That a deps in the SBOM is safe. An SBOM is a manifest, not a clean
  bill of health. Run an SCA scanner against it.
- That syft found everything. SBOM completeness depends on the
  generator's ecosystem coverage. For AIWG (pure-npm + Go-binary tools),
  syft's coverage is comprehensive; for polyglot projects, gaps are
  possible. The signed manifest tells you what syft observed at
  release-build time, not what an exhaustive analysis would find.
- That the SBOM matches the tarball byte-for-byte. The SBOM is generated
  on the working tree before `npm publish`; we don't post-verify it
  against the published tarball contents. If you need that, recompute
  the SBOM yourself with `syft scan` against the downloaded tarball and
  diff against the signed one.

## How the four verifications combine

| What it catches | Provenance only | Signed tag only | Cosign signature only | SBOM only | All four |
|---|---|---|---|---|---|
| Forged tag from compromised maintainer account | No | **Yes** | No | No | Yes |
| Tampered tarball uploaded directly to npmjs.org | **Yes** | No | **Yes** | Partial | Yes |
| Tampered tarball uploaded to Gitea bundled npm registry | No | No | **Yes** | Partial | Yes |
| Tampered tarball on a third-party mirror | No | No | **Yes** | Partial | Yes |
| Workflow-injection attack via Gitea write access | Partial | **Yes** | Partial | Partial | Yes |
| Both Gitea write access AND maintainer key compromised | No | No | No | No | Partial (still needs Sigstore identity) |
| Build environment compromised mid-workflow | Partial | No | Partial | No | Partial |
| Unknown dep present in tarball | No | No | No | **Yes** | Yes |
| Known-vulnerable dep present in tarball | No | No | No | **Yes** (via SCA scan) | Yes |

Run all four. Each rules out a different attacker. The audit (#1278)
treats the combination as the supply-chain-defense baseline.

The signed tag is the only check that does not depend on
GitHub-as-OIDC-issuer or npmjs.org-as-registry. It is the cryptographic
anchor that makes the other two trustworthy even if a registry or OIDC
provider is itself attacked.

## What if a verification fails

1. **Stop the install.** Do not proceed with `npm install` or `git
   checkout` of the suspect artifact.
2. **Confirm you have the right fingerprint.** Re-fetch `SECURITY.md`
   from the canonical Gitea URL (`https://git.integrolabs.net/roctinam/aiwg/raw/branch/main/SECURITY.md`)
   and compare. If your local copy diverges from the canonical one, your
   local copy may be tampered.
3. **Open a private report** via the channel in `SECURITY.md`
   (`security@integrolabs.net`). Include the version, the verification
   that failed, the exact output, and how you obtained the artifact.
4. **Do not file a public Gitea issue** for a verification failure —
   that's exactly what `SECURITY.md`'s private channel is for.

## Two-leg model: what gets verified where

AIWG publishes to two registries on every release. The signed tag and the
cosign signature are both registry-independent, so the only verification
that varies by registry is the npm provenance attestation:

| Registry | URL | Provenance? | Signed tag? | Cosign signature? | SBOM? |
|---|---|---|---|---|---|
| npmjs.org | `https://registry.npmjs.org/aiwg` | Yes (post-A5) | Yes (via the tag itself) | Yes (post-A8, via GitHub/Gitea release assets) | Yes (post-A13, via GitHub/Gitea release assets) |
| Gitea bundled npm | `https://git.integrolabs.net/api/packages/roctinam/npm/aiwg` | No | Yes | Yes (post-A8, via GitHub/Gitea release assets) | Yes (post-A13, via GitHub/Gitea release assets) |

The signed tag and cosign signature are registry-independent — they
verify the same way regardless of which registry you pulled the tarball
from, or whether you pulled it from a mirror. The cosign signature
specifically closes the "Gitea-registry tarball lacks a provenance
chain" gap that #1286 (A10) covered with operator-hygiene controls
only.

To verify a Gitea-registry install end-to-end: download the matching
`.sigstore` bundle from the [Gitea
release](https://git.integrolabs.net/roctinam/aiwg/releases), then run
`cosign verify-blob` against the tarball that npm installed (typically
at `$(npm root -g)/aiwg/` or wherever your global npm prefix points).

## References

- [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278) — supply-chain hardening epic
- [#1283](https://git.integrolabs.net/roctinam/aiwg/issues/1283) — npmjs.org via GitHub Actions OIDC (A5, this ADR's parent)
- [#1299](https://git.integrolabs.net/roctinam/aiwg/issues/1299) — signed-tag verify (A9)
- [#1286](https://git.integrolabs.net/roctinam/aiwg/issues/1286) — Gitea compensating controls (A10)
- [#1287](https://git.integrolabs.net/roctinam/aiwg/issues/1287) — tarball Sigstore signing (A8, Wave 5)
- [#1288](https://git.integrolabs.net/roctinam/aiwg/issues/1288) — publish-time evidence: tarball audit + audit signatures + SBOM (A11/A12/A13, Wave 6)
- [`SECURITY.md`](https://github.com/jmagly/aiwg/blob/main/SECURITY.md) — maintainer key fingerprint(s), private reporting channel
- [`.aiwg/architecture/adr-npmjs-org-via-github-actions.md`](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-npmjs-org-via-github-actions.md) — A5 ADR
- [`.aiwg/architecture/adr-signed-tag-verify.md`](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-signed-tag-verify.md) — A9 ADR
- [`.aiwg/architecture/adr-gitea-release-compensating-controls.md`](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-gitea-release-compensating-controls.md) — A10 ADR
- [`.aiwg/architecture/adr-tarball-cosign-signing.md`](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-tarball-cosign-signing.md) — A8 ADR
- [`.aiwg/architecture/adr-publish-time-evidence.md`](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-publish-time-evidence.md) — A11+A12+A13 ADR
- [CycloneDX specification](https://cyclonedx.org/specification/overview/)
- [syft](https://github.com/anchore/syft)
- [npm Trusted Publishers documentation](https://docs.npmjs.com/trusted-publishers)
- [GitHub OIDC token claims](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [Sigstore cosign documentation](https://docs.sigstore.dev/cosign/signing/signing_with_blobs/) — keyless sign-blob and bundle format
