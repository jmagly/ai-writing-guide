# ADR: Signed-Tag Verification as a Hard Release Gate

**Status**: Accepted
**Date**: 2026-05-12
**Issue**: [#1299](https://git.integrolabs.net/roctinam/aiwg/issues/1299) (A9, Wave 3 of supply-chain hardening epic [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278))

## Context

The May 2026 Mini Shai-Hulud npm worm campaign demonstrated that publish credentials and CI runner access are the primary lateral-movement paths in npm-distributed packages. Two scenarios from the supply-chain threat model address this directly:

- **S2 (workflow injection)** — an attacker with write access to CI YAML can push code that publishes a malicious release.
- **S8 (maintainer account takeover)** — an attacker with the maintainer's Gitea/GitHub credentials can push a tag that triggers the publish workflow.

A signed-tag gate closes both: even with Gitea write access or maintainer credentials, the attacker must also possess (and use without alerting) the project release-signing key in order to push a tag that survives the CI verify step. Per [operator decision 4 (2026-05-12)](https://git.integrolabs.net/roctinam/aiwg/issues/1278), signed tags became the **hard gate** for [#1286 (A10 — compensating controls)](https://git.integrolabs.net/roctinam/aiwg/issues/1286): the verify step is what makes "Gitea environment-scoped secrets are ignored at runtime" survivable.

## Decision

A `Verify signed tag` step lands in the two existing publish-bearing workflows (`.gitea/workflows/npm-publish.yml` and `.gitea/workflows/gitea-release.yml`) before any publish or release-creation step. It runs `tools/ci/verify-signed-tag.sh`, which:

1. Extracts the tag name from `$GITHUB_REF`.
2. Discovers maintainer public keys from `.gitea/keys/maintainers.asc` (GPG) or `.gitea/allowed_signers` (OpenSSH allowed-signers format). Both formats are accepted; both can co-exist (different maintainers may use different formats).
3. Imports / configures the discovered keys into the runner's keyring.
4. Runs `git tag -v <tag>` and exits non-zero with an actionable diagnostic if the signature does not verify against any of the published keys.

The script is a hard fail with no "advisory" or "warn-only" mode: if maintainer keys are not yet published in the repo, the gate fails with explicit setup instructions and the release does not proceed.

A future GitHub Actions publish workflow (added by [#1283 / A5](https://git.integrolabs.net/roctinam/aiwg/issues/1283), Wave 4) will reuse the same script.

## Consequences

**Positive**:

- An attacker who acquires Gitea write access OR maintainer Gitea/GitHub credentials cannot tag-and-publish a release without ALSO compromising the maintainer's signing key. The release-key custody requirement becomes the gate.
- The verify step is the cryptographic anchor [#1286 (A10)](https://git.integrolabs.net/roctinam/aiwg/issues/1286) relies on for compensating against Gitea's lack of environment-scoped secrets.
- Reproducers and downstream consumers can independently verify a release tag's identity against the maintainer fingerprint(s) published in [`SECURITY.md`](../../SECURITY.md).
- Both GPG and SSH signing are supported, including hardware-backed SSH keys (YubiKey / SoloKey / similar), so the maintainer's key custody can match their existing infrastructure.

**Negative**:

- Operator must complete the key-generation + key-publication setup before the next tag push. The first attempted release after this ADR lands will fail loudly if setup hasn't happened yet — by design. The error message includes the full remediation procedure.
- A lost signing key blocks future releases until rotation completes. Mitigated by documenting the rotation procedure in [`docs/contributing/versioning.md`](../../docs/contributing/versioning.md).
- Historical tags (`v2026.5.2` and earlier) are not retroactively signed. The verify gate only fires on tag pushes, so old releases keep their existing unsigned annotations. Treat the gate as forward-going only.
- A compromised signing key is a single point of failure for release authenticity. Mitigated by (a) using a project-scoped key not a personal one, (b) hardware-backed signing where feasible, and (c) the rotation cadence documented in `versioning.md`.

## Alternatives Considered

**A. Advisory-mode verify (log result but don't fail)**: rejected. The whole point of the gate is "no unsigned tags ever publish." A soft-warn mode preserves the same blast radius the gate is meant to close.

**B. Server-side enforcement (Gitea push hook)**: rejected for now. Would be stricter (rejects unsigned tags at git-push time, before any workflow runs), but is operator-side configuration outside the AIWG repo's control, and Gitea's push-hook tag-signature verification is version-dependent. Filing as a Phase 3 follow-up if the operator decides to harden further.

**C. Use a CA-style PKI rather than published flat public keys**: rejected. Adds a CA infrastructure dependency for a project this small. The flat-public-key model is what the rest of the open-source ecosystem (sigstore-rooted reproducers, OSV scanners) is moving toward; align with that.

**D. Bundle A9 with A8 (tarball Sigstore signing)**: rejected per operator decision 4 (2026-05-12). A8 ships in Wave 5 after A5 provides the OIDC identity for keyless cosign. A9 is load-bearing for A10 in Wave 4, so it must land earlier as its own concern.

## References

- [`tools/ci/verify-signed-tag.sh`](../../tools/ci/verify-signed-tag.sh) — the verify implementation
- [`docs/contributing/versioning.md`](../../docs/contributing/versioning.md) — operator setup procedure
- [`SECURITY.md`](../../SECURITY.md) — maintainer signing-key fingerprint(s) and rotation policy (populated when key is generated)
- [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278) — parent epic
- [#1299](https://git.integrolabs.net/roctinam/aiwg/issues/1299) — this issue
- [#1286](https://git.integrolabs.net/roctinam/aiwg/issues/1286) — A10, the consumer of this gate
- [#1283](https://git.integrolabs.net/roctinam/aiwg/issues/1283) — A5, the future GH Actions publish workflow that reuses this script
- [#1287](https://git.integrolabs.net/roctinam/aiwg/issues/1287) — A8 (tarball Sigstore signing), split-from sibling
- Threat model controls C4 / C-D; supply-chain defenses brief C4
