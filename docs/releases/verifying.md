# Verifying AIWG Releases

AIWG ships two cryptographic verifications you can run on any release:

1. **npm provenance attestation** — proves a published tarball was produced
   by a specific GitHub Actions workflow run from a specific source commit.
   Lands on npmjs.org starting with the first release published via #1283
   (A5, the GitHub Actions OIDC trusted-publishing path).
2. **Signed git tag** — proves the tag was created by a holder of the AIWG
   maintainer release key. Applies to every release tag from `cee91c96`
   (#1299 / A9, Wave 3 of #1278) forward.

This doc walks through both verifications and shows what each one rules out.

> Historical note: releases earlier than #1299 (`v2026.5.2` and prior) are
> not retroactively signed. The signed-tag gate is forward-going only.
> Provenance attestations are also forward-going — releases before A5's
> first OIDC publish do not have them on npmjs.org.

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
# Replace 2026.6.0 with the version you want to verify.
npm view aiwg@2026.6.0 --json | jq .dist.attestations
```

Expected output: a JSON object with `url` and `provenance` fields.
`provenance` contains a Sigstore bundle linking the tarball SHA to:

- The GitHub Actions workflow file path (`.github/workflows/npm-publish.yml`)
- The workflow run URL
- The source commit SHA
- The build environment (`runner.os`, action versions)

If the output is `null`, `{}`, or missing the `provenance` key, the
release does **not** have an OIDC-issued provenance attestation. Either
it predates A5's first OIDC publish, or something went wrong with the
trusted-publisher configuration. Treat the release with the same trust
level you would treat a release from any registry without provenance —
i.e., verify the signed tag below as the next-strongest signal.

### Deeper verification

`npm` itself can validate the attestation without you parsing the JSON:

```bash
npm audit signatures aiwg@2026.6.0
```

This downloads the tarball, recomputes its SHA, fetches the provenance
bundle, and verifies the Sigstore signature against the public Sigstore
transparency log. Output `verified registry signatures, audited <N>
packages` means the attestation is intact.

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
fingerprint in [`SECURITY.md`](../../SECURITY.md).

### How to verify

```bash
# Clone (or use an existing checkout) from a public mirror you trust the
# transport of. The signature verification doesn't trust the mirror itself.
git clone https://github.com/jmagly/aiwg.git
cd aiwg

# Import the published maintainer key. SHA256-pin the file before importing.
sha256sum -c <(grep -A1 "maintainers.asc fingerprint" SECURITY.md | tail -1)
gpg --import .gitea/keys/maintainers.asc

# Verify a specific tag.
git tag -v v2026.6.0
```

Expected output:

```
object <commit-sha>
type commit
tag v2026.6.0
tagger AIWG Release Signing <release@aiwg.io> 2026-06-01 12:34:56 +0000

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
git tag -v v2026.6.0
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

## How the two verifications combine

| What it catches | Provenance only | Signed tag only | Both |
|---|---|---|---|
| Forged tag from compromised maintainer account | No | **Yes** | Yes |
| Tampered tarball uploaded directly to npmjs.org | **Yes** | No | Yes |
| Workflow-injection attack via Gitea write access | Partial | **Yes** | Yes |
| Both Gitea write access AND maintainer key compromised | No | No | A8 (Wave 5, future) |
| Build environment compromised mid-workflow | Partial | No | Partial |

Run both. Each rules out a different attacker. The audit (#1278) treats
the combination as the supply-chain-defense baseline.

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

AIWG publishes to two registries on every release:

| Registry | URL | Provenance? | Signed tag? |
|---|---|---|---|
| npmjs.org | `https://registry.npmjs.org/aiwg` | Yes (post-A5) | Yes (via the tag itself) |
| Gitea bundled npm | `https://git.integrolabs.net/api/packages/roctinam/npm/aiwg` | No today (#1287 / A8 in Wave 5 will add Sigstore tarball signing as a registry-independent attestation) | Yes |

The signed tag is registry-independent — it verifies regardless of where
you pulled the tarball from. The provenance attestation is npmjs.org-only
today. For Gitea-registry installs, trust the signed tag plus AIWG's
operator-hygiene controls for the Gitea-side publish leg
(#1286 / A10 — compensating controls bundle).

## References

- [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278) — supply-chain hardening epic
- [#1283](https://git.integrolabs.net/roctinam/aiwg/issues/1283) — npmjs.org via GitHub Actions OIDC (A5, this ADR's parent)
- [#1299](https://git.integrolabs.net/roctinam/aiwg/issues/1299) — signed-tag verify (A9)
- [#1286](https://git.integrolabs.net/roctinam/aiwg/issues/1286) — Gitea compensating controls (A10)
- [#1287](https://git.integrolabs.net/roctinam/aiwg/issues/1287) — tarball Sigstore signing (A8, Wave 5)
- [`SECURITY.md`](../../SECURITY.md) — maintainer key fingerprint(s), private reporting channel
- [`.aiwg/architecture/adr-npmjs-org-via-github-actions.md`](../../.aiwg/architecture/adr-npmjs-org-via-github-actions.md) — A5 ADR
- [`.aiwg/architecture/adr-signed-tag-verify.md`](../../.aiwg/architecture/adr-signed-tag-verify.md) — A9 ADR
- [`.aiwg/architecture/adr-gitea-release-compensating-controls.md`](../../.aiwg/architecture/adr-gitea-release-compensating-controls.md) — A10 ADR
- [npm Trusted Publishers documentation](https://docs.npmjs.com/trusted-publishers)
- [GitHub OIDC token claims](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
