# AIWG Supply-Chain Overview

What AIWG signs, what each signature proves, and what attackers each control is designed to catch.

This is the umbrella reference. For step-by-step verification of a specific release, see [`docs/releases/verifying.md`](../releases/verifying.md). For applying the same pattern to your own npm package, see [`adopting-this-pattern.md`](adopting-this-pattern.md).

## The four signed artifacts

Every AIWG release from v2026.5.3 forward carries four independent signatures, each anchored in a different chain of trust:

| Signature | Issuer | Anchors in | Detects |
|---|---|---|---|
| **npm provenance attestation** | npmjs.org via GitHub Actions OIDC | Sigstore Fulcio CA + Rekor transparency log | Tarball substituted on npmjs.org after publish |
| **Signed git tag** | Maintainer release key (gpg ed25519) | Maintainer key published in this repo | Forged tag from a compromised maintainer account on Gitea or GitHub |
| **Cosign tarball signature** | GitHub Actions OIDC identity (keyless) | Sigstore Fulcio CA + Rekor | Tampered tarball on any mirror — npmjs.org, Gitea, third-party |
| **CycloneDX SBOM (signed)** | Same Sigstore identity as the tarball signature | Same as cosign signature above | Hidden dep substitution; tarball contents diverging from declared deps |

The four are designed to be independent — a single compromised system shouldn't break more than one chain at a time.

## The 6 release assets

Both the [GitHub release](https://github.com/jmagly/aiwg/releases) and the [Gitea release](https://git.integrolabs.net/roctinam/aiwg/releases) carry six assets per release:

```
aiwg-X.Y.Z.tgz                       # the published tarball
aiwg-X.Y.Z.tgz.sigstore              # cosign signature bundle for the tarball
release-manifest.json                # version, SHAs, run URL
release-manifest.json.sigstore       # cosign signature bundle for the manifest
aiwg-X.Y.Z.cdx.json                  # CycloneDX SBOM
aiwg-X.Y.Z.cdx.json.sigstore         # cosign signature bundle for the SBOM
```

The cosign `.sigstore` bundles embed a full Sigstore verification record: the keyless Fulcio certificate, the Rekor transparency-log inclusion proof, and the signature itself. They're self-contained — `cosign verify-blob` against the bundle does not need to call out to a network registry.

## What each signature proves (and doesn't prove)

### npm provenance attestation

**Proves**: A specific tarball, identified by SHA-256, was built by the GitHub Actions workflow `.github/workflows/npm-publish.yml` on `github.com/jmagly/aiwg`, on a runner that GitHub OIDC could vouch for to npmjs.org. The attestation includes the source commit SHA, the workflow run URL, and the build environment.

**Does not prove**:
- That the source commit was made by an AIWG maintainer. A compromised GitHub account that can push to `main` and a tag can produce a perfectly valid provenance attestation. The signed-tag check is what binds the artifact to a maintainer identity.
- That the tarball is functionally safe. Provenance is "who built what," not "is the result malware-free."

**Anchored in**: Sigstore Fulcio CA (`fulcio.sigstore.dev`) + Rekor transparency log (`rekor.sigstore.dev`). Trust roots: npmjs.org's verification of GitHub's OIDC token, plus the Sigstore public-good infrastructure.

### Signed git tag

**Proves**: The annotated tag was created by a holder of the AIWG maintainer release-signing key. The tag is the only artifact where the trust root is an AIWG-controlled key rather than a third-party issuer.

**Does not prove**:
- That the tag was created in CI versus on a maintainer workstation. The key signs the tag, not the environment.
- That the maintainer key itself is uncompromised. If the key leaks, every tag signed before rotation is implicated.

**Anchored in**: The published maintainer-key fingerprint in [`SECURITY.md`](../../SECURITY.md) and the public key at [`.gitea/keys/maintainers.asc`](../../.gitea/keys/maintainers.asc). Trust root: whatever transport you used to fetch the fingerprint (TLS to git.integrolabs.net, the published key in the maintainer's social-media bio, the value embedded in a previous AIWG release you already trusted, etc.).

**Active key as of v2026.5.3**: ed25519, fingerprint `FE9272F0BC5781E1DE77FAAA719AB63879E84CE8`, expires 2031-05-11.

### Cosign tarball signature

**Proves**: The specific tarball bytes were signed by the keyless OIDC identity `https://github.com/jmagly/aiwg/.github/workflows/npm-publish.yml@refs/tags/vX.Y.Z`. Independent of which registry you got the tarball from.

**Does not prove**:
- That the source commit was made by a maintainer. Same gap as npm provenance — closed by the signed tag.
- That the workflow itself is uncompromised. An attacker who can push to `.github/workflows/npm-publish.yml` AND push a signed tag could produce a cosign-verifiable malicious tarball. The combined defense (signed tag + cosign signature) closes this — an attacker would need Gitea/GitHub write access AND the maintainer key AND a Sigstore-recognized OIDC identity on the AIWG repo.

**Anchored in**: Sigstore Fulcio + Rekor. The two `--certificate-*` flags in the verify command (see verifying.md) bind the signature to a specific workflow path and OIDC issuer.

### CycloneDX SBOM

**Proves**: What syft observed in the working tree at release-build time. The signature proves the SBOM bytes came from the same workflow that signed the tarball.

**Does not prove**:
- That any dep in the SBOM is safe. The SBOM is a manifest, not a clean bill of health. Pipe it through Grype/Trivy/Dependency-Track for vulnerability scanning.
- That syft found everything. SBOM completeness depends on the generator's ecosystem coverage. For a pure-npm + Go-binary project like AIWG, syft's coverage is comprehensive; for polyglot projects, gaps are possible.
- That the SBOM matches the published tarball byte-for-byte. The SBOM is generated on the working tree before `npm publish`, not post-extract from the published tarball.

**Anchored in**: Same Sigstore identity as the cosign tarball signature.

## How the four combine — attacker matrix

| Attacker capability | Provenance only | Tag only | Cosign only | SBOM only | All four |
|---|---|---|---|---|---|
| Forged tag from compromised maintainer account | No | **Yes** | No | No | Yes |
| Tampered tarball uploaded to npmjs.org | **Yes** | No | **Yes** | Partial | Yes |
| Tampered tarball on Gitea bundled npm | No | No | **Yes** | Partial | Yes |
| Tampered tarball on third-party mirror | No | No | **Yes** | Partial | Yes |
| Workflow-injection via Gitea write access | Partial | **Yes** | Partial | Partial | Yes |
| Both Gitea write AND maintainer key compromised | No | No | No | No | Partial — Sigstore OIDC identity still required |
| Build environment compromised mid-workflow | Partial | No | Partial | No | Partial |
| Unknown dep present in tarball | No | No | No | **Yes** | Yes |
| Known-vulnerable dep present in tarball | No | No | No | **Yes** via SCA | Yes |

The signed tag is the only check that does not depend on GitHub-as-OIDC-issuer or npmjs.org-as-registry. It's the cryptographic anchor that makes the other two trustworthy even if a registry or OIDC provider is itself attacked.

## Two-registry model

AIWG publishes to both npmjs.org and the Gitea bundled npm registry. The signed tag and cosign signature are registry-independent — they verify the same way regardless of source. Only npm provenance attestation varies:

| Registry | URL | Provenance? | Signed tag? | Cosign? | SBOM? |
|---|---|---|---|---|---|
| npmjs.org | `https://registry.npmjs.org/aiwg` | Yes | Yes (via the tag itself) | Yes | Yes |
| Gitea bundled npm | `https://git.integrolabs.net/api/packages/roctinam/npm/aiwg` | No | Yes | Yes | Yes |

The cosign tarball signature is the bridge that closes the "Gitea-registry tarball lacks a provenance chain" gap.

## CI pipeline hardening (not user-visible, but underlies the above)

Beyond the signed artifacts, the publish pipeline itself is hardened:

- **Pinned containers** — every CI workflow pins its container by sha256 digest. The manifest is at [`ci/digests.txt`](../../ci/digests.txt).
- **Pinned actions** — every action reference is a 40-char commit SHA, not a floating tag.
- **Tarball top-level allowlist** — every release lints what's in the tarball. No surprise files.
- **Dep-source policy lint** — `git+`, `github:`, tarball-URL, `file:`, `link:` dep sources are blocked.
- **`npm audit signatures` gate** — the publish step itself runs `npm audit signatures` against the dep tree. Bad registry signature blocks publish.
- **7-day release-age gate** — `npm install` won't resolve dep versions younger than 7 days. Newly-published malicious versions can't enter the lockfile.
- **Signed-tag verify gate** — `tools/ci/verify-signed-tag.sh` runs before any publish step. A bad signature is a hard stop.
- **Self-contained CI builders** — no external repo cloning, no `:latest` tags, builds are reproducible from this repo alone.

## Verification quickstart

```bash
# Pick a version to verify
V=2026.5.3

# 1. Provenance (requires npm 11.5+)
npm view aiwg@$V --json | jq .dist.attestations

# 2. Signed tag (requires this repo cloned + maintainer key imported)
git fetch --tags
git tag -v v$V

# 3. Cosign tarball signature (requires cosign v2+ and the .sigstore bundle)
gh release download v$V --repo jmagly/aiwg --pattern "aiwg-$V.tgz*"
cosign verify-blob \
  --bundle aiwg-$V.tgz.sigstore \
  --certificate-identity-regexp "^https://github.com/jmagly/aiwg/\.github/workflows/npm-publish\.yml@refs/tags/v" \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  aiwg-$V.tgz

# 4. SBOM (download + scan)
gh release download v$V --repo jmagly/aiwg --pattern "aiwg-$V.cdx.json*"
cosign verify-blob \
  --bundle aiwg-$V.cdx.json.sigstore \
  --certificate-identity-regexp "^https://github.com/jmagly/aiwg/\.github/workflows/npm-publish\.yml@refs/tags/v" \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  aiwg-$V.cdx.json
grype sbom:aiwg-$V.cdx.json  # or trivy sbom <file>
```

Full walkthrough including expected-output samples and failure-mode diagnostics: [`docs/releases/verifying.md`](../releases/verifying.md).

## If a verification fails

1. **Stop the install.** Don't proceed with `npm install` of the suspect artifact.
2. **Confirm the fingerprint.** Re-fetch `SECURITY.md` from the canonical Gitea URL (`https://git.integrolabs.net/roctinam/aiwg/raw/branch/main/SECURITY.md`) and compare to your local copy.
3. **Open a private report** via the channel in `SECURITY.md` (`security@integrolabs.net`). Include version, which verification failed, exact output, and how you obtained the artifact.
4. **Do not file a public Gitea issue.** That defeats the point of the private channel.

## References

- [`docs/releases/verifying.md`](../releases/verifying.md) — step-by-step verification per release
- [`docs/security/adopting-this-pattern.md`](adopting-this-pattern.md) — apply this pattern to your own package
- [`SECURITY.md`](../../SECURITY.md) — maintainer key, disclosure channel
- [`.aiwg/architecture/adr-publish-time-evidence.md`](../../.aiwg/architecture/adr-publish-time-evidence.md) — design rationale
- [`.aiwg/architecture/adr-tarball-cosign-signing.md`](../../.aiwg/architecture/adr-tarball-cosign-signing.md) — cosign integration
- [`.aiwg/architecture/adr-npmjs-org-via-github-actions.md`](../../.aiwg/architecture/adr-npmjs-org-via-github-actions.md) — npm OIDC publish
- [`.aiwg/architecture/adr-signed-tag-verify.md`](../../.aiwg/architecture/adr-signed-tag-verify.md) — signed-tag gate
- [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278) — Mini Shai-Hulud hardening epic
