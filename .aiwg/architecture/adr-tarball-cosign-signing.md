# ADR: Tarball Sigstore Signing via Cosign Keyless OIDC

**Status**: Accepted
**Date**: 2026-05-12
**Issue**: [#1287](https://git.integrolabs.net/roctinam/aiwg/issues/1287) (A8, Wave 5 of supply-chain hardening epic [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278))

## Context

The Wave 4 work delivered two registry-bound integrity controls: npm provenance attestations on the npmjs.org leg ([#1283](https://git.integrolabs.net/roctinam/aiwg/issues/1283) / A5) and operator-hygiene compensating controls on the Gitea leg ([#1286](https://git.integrolabs.net/roctinam/aiwg/issues/1286) / A10). The signed-tag gate ([#1299](https://git.integrolabs.net/roctinam/aiwg/issues/1299) / A9) gives a registry-independent identity proof for the *tag*, but not for the *tarball bytes*.

The gap A8 closes: a consumer who pulls `aiwg-X.Y.Z.tgz` from the Gitea bundled npm registry, a third-party mirror, or any non-npmjs source has no cryptographic chain to verify the tarball bytes themselves. The npm provenance attestation lives only in the npmjs.org registry metadata; it does not travel with the artifact. The signed git tag proves who created the tag, not what the build produced. Audit finding F8 (tarball integrity, threat scenario S4 — mid-flight tarball replacement on a mirror) called for an artifact-level, registry-independent signature.

Sigstore's cosign provides the standard primitive for this: keyless OIDC signing produces a signature anchored in the GitHub Actions OIDC token, with the Fulcio CA issuing a short-lived certificate bound to the workflow identity and the Rekor transparency log providing public detectability of tampering. The same OIDC identity that already drives the npmjs.org trusted-publishing path can drive the cosign signing path — no new credentials to manage.

## Decision

After `npm publish` succeeds and the provenance attestation verifies, the GitHub Actions workflow at `.github/workflows/npm-publish.yml` (#1283 / A5):

1. Installs cosign v2.6.1 via `sigstore/cosign-installer@v3.10.1` (SHA-pinned to `7e8b541eb2e61bf99390e1afd4be13a184e9ebc5` in `ci/digests.txt`).
2. Resolves the published tarball (either left in CWD by `npm publish` or regenerated idempotently by `npm pack`).
3. Runs `cosign sign-blob --yes --bundle aiwg-X.Y.Z.tgz.sigstore aiwg-X.Y.Z.tgz` — keyless mode, using the workflow's ambient GitHub OIDC token. The `--bundle` flag produces a self-contained Sigstore bundle (signature + Fulcio cert + Rekor entry) for offline verification.
4. Generates a `release-manifest.json` containing the tarball SHA-256, version, tag, tag object SHA, commit SHA, workflow run URL, and signing metadata (cosign version, mode, OIDC identity, bundle filename).
5. Signs the manifest the same way → `release-manifest.json.sigstore`.
6. Uploads all four files (`aiwg-X.Y.Z.tgz`, `aiwg-X.Y.Z.tgz.sigstore`, `release-manifest.json`, `release-manifest.json.sigstore`) to the GitHub release using the workflow's ephemeral `GITHUB_TOKEN`, via `gh release upload --clobber`.
7. Emits a copy-pasteable verification summary in the workflow log.

A companion Gitea workflow at `.gitea/workflows/upload-release-sigs.yml` (manual `workflow_dispatch`, tag input) mirrors the four signed assets from the GitHub release to the matching Gitea release. It uses `gh release download` against the public GitHub mirror (no GH auth needed) and uploads via the Gitea release-asset API using the existing `NPM_TOKEN` (Gitea API token with `write:repository`). Idempotency is handled by detecting 409 on upload and DELETE-then-re-POSTing the asset.

Consumer-facing verification is documented in [`docs/releases/verifying.md`](../../docs/releases/verifying.md) — `cosign verify-blob --bundle …` with explicit `--certificate-identity-regexp` and `--certificate-oidc-issuer` flags that bind verification to AIWG's workflow on AIWG's repo.

## Consequences

**Positive**:

- A consumer who pulled the tarball from the Gitea registry, npmjs.org, or any mirror can now run the same `cosign verify-blob` command and get the same answer. Tarball integrity is no longer registry-bound.
- The signature chain has no AIWG-controlled long-lived secret. The signing identity is the GitHub Actions OIDC token, which is short-lived and verifiable against GitHub's public OIDC issuer. No private key for AIWG maintainers to lose or rotate.
- The Rekor transparency log makes silent re-signing detectable. Anyone watching the log can see a new signature emitted for AIWG's identity outside an expected release window.
- The release manifest provides an audit-ready bridge between the tarball SHA-256 and the workflow run that produced it. Independent of the registry, the consumer can confirm "this tarball was built by run X at commit Y" without trusting the registry's metadata.
- The Gitea-side mirror workflow does not expand any token surface. It reuses the existing `NPM_TOKEN` (already documented in #1286 / A10's secret-rotation runbook) and uses `gh release download` without authentication against the public GitHub mirror.

**Negative**:

- The cosign verification command is long. Mitigated by including it verbatim in the consumer-facing `verifying.md`, in the post-publish workflow summary, and embedded in the auto-generated GitHub release body. Consumers who script it can paste the block; consumers who one-shot it can copy from the docs.
- The Gitea-side mirror is a manual operator step rather than auto-triggered from the GitHub workflow. The operator must run `gh workflow run upload-release-sigs.yml -F tag=…` (one command per release) after the GitHub workflow completes. Documented in [`docs/contributing/versioning.md`](../../docs/contributing/versioning.md). The alternative (auto-trigger from GitHub) would have required a long-lived Gitea write token in GitHub secrets, expanding the token surface in the opposite direction of the Wave 4 reductions.
- Verification requires Sigstore's public infrastructure (Fulcio CA, Rekor log) to be reachable. Cosign supports air-gapped verification with `--insecure-ignore-tlog` or pre-fetched Rekor entries, but the standard path needs network access. Documented in `verifying.md`.
- Forward-going only: releases before A8's first activation (i.e., before this commit lands and the next tag is pushed) do not have `.sigstore` bundles attached. Same forward-going posture as A5, A9, A10.

## Alternatives Considered

**A. Keyed cosign (long-lived signing key)**: rejected. Would re-introduce the key-custody overhead that the keyless model exists to eliminate. The keyless OIDC path was specifically designed for CI use, has the same cryptographic strength as keyed signing (in fact stronger via the transparency-log requirement), and removes "lost key blocks future signing" from the failure modes. Keyless is the standard recommendation for CI-issued signatures in 2026.

**B. Sigstore-Gitea OIDC integration**: rejected for now. As of 2026-05-12, Gitea is not a Sigstore-recognized OIDC issuer — the Fulcio CA does not accept Gitea OIDC tokens for short-lived cert issuance. If/when Gitea is added to Sigstore's federation, the cosign signing step could move to the Gitea workflow and the cross-mirror dance becomes unnecessary. Tracked as a future follow-up; no specific issue filed because the dependency is upstream (Sigstore + Gitea coordination).

**C. Only GitHub-side signing, no Gitea release sync**: rejected because the acceptance criterion on #1287 explicitly required signatures attached to *both* Gitea and GitHub releases. Consumers who pulled tarballs from the Gitea release page need the `.sigstore` bundle to be there alongside. The manual-mirror workflow satisfies the criterion without expanding token surface.

**D. Auto-trigger Gitea mirror from GitHub workflow (via a new Gitea write token in GitHub secrets)**: rejected. Would expand the Gitea token surface in the opposite direction of Wave 4's reductions. The one-command operator ritual (`gh workflow run upload-release-sigs.yml -F tag=vX.Y.Z`) is documented in the release runbook and adds maybe 30 seconds to the release flow. The audit's "minimize secret surface" principle outweighs the convenience of a fully automated mirror.

**E. Loose `.sig` + `.cert` + `.pem` files instead of `--bundle`**: rejected. Loose files require the consumer to download three files per asset and verify they belong together. The `.sigstore` bundle is a single file carrying signature + cert + transparency-log entry, with one verification command. Bundle format is the cosign default since v2.0 and what `cosign verify-blob` expects via `--bundle`.

**F. SHA-256 checksums published alongside the tarball (no cosign)**: rejected as the *only* control because a checksum file signed by the same workflow that published the tarball adds no integrity guarantee beyond what the cosign signature already provides. The release manifest does include SHA-256 for human-readable cross-checking, but the cryptographic guarantee comes from the cosign signature over the manifest itself.

**G. SLSA Level 3 build attestations instead of cosign sign-blob**: rejected for scope. SLSA L3 would require provenance-of-provenance (the build environment itself attested by the runner), which is a larger surface than what A8 was asked to deliver. The npm provenance attestation (#1283 / A5) is already SLSA Level 1, and adding cosign on top gets us most of the value without re-architecting the build chain. SLSA L3 stays on the backlog as a future hardening epic.

## References

- [#1287](https://git.integrolabs.net/roctinam/aiwg/issues/1287) — this issue (A8 implementation)
- [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278) — supply-chain hardening epic, audit findings F1–F8
- [#1283](https://git.integrolabs.net/roctinam/aiwg/issues/1283) — npmjs.org via GitHub Actions OIDC (A5) — the publish workflow A8 extends
- [#1299](https://git.integrolabs.net/roctinam/aiwg/issues/1299) — signed-tag verify (A9) — the hard gate that runs before A8's signing step
- [#1286](https://git.integrolabs.net/roctinam/aiwg/issues/1286) — Gitea release compensating controls (A10) — the operator-hygiene controls that A8 layers signatures on top of
- [`.github/workflows/npm-publish.yml`](../../.github/workflows/npm-publish.yml) — the workflow that signs
- [`.gitea/workflows/upload-release-sigs.yml`](../../.gitea/workflows/upload-release-sigs.yml) — the manual operator mirror
- [`docs/releases/verifying.md`](../../docs/releases/verifying.md) — consumer-facing verification, all three controls
- [`docs/contributing/versioning.md`](../../docs/contributing/versioning.md) — release runbook, including the post-release sig-mirror ritual
- [`ci/digests.txt`](../../ci/digests.txt) — pinned cosign-installer SHA and cosign binary version
- [Sigstore cosign keyless signing docs](https://docs.sigstore.dev/cosign/signing/signing_with_blobs/)
- [Sigstore Fulcio (CA)](https://github.com/sigstore/fulcio)
- [Sigstore Rekor (transparency log)](https://github.com/sigstore/rekor)
