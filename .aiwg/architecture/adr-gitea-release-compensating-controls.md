# ADR: Compensating Controls for the Gitea Release Gate

**Status**: Accepted
**Date**: 2026-05-12
**Issue**: [#1286](https://git.integrolabs.net/roctinam/aiwg/issues/1286) (A10, Wave 4 of supply-chain hardening epic [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278))

## Context

Audit finding F6 (May 2026 Mini Shai-Hulud response, [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278)) called for "release-gate compensating controls" on Gitea because Gitea Actions does not provide the surface that GitHub Actions does for gating sensitive workflows:

- The `environment:` keyword is **ignored** at runtime by Gitea Actions (see [docs.gitea.com/usage/actions/comparison](https://docs.gitea.com/usage/actions/comparison)). There is no native deployment-protection-rule equivalent. Environment-scoped secrets cannot be defined; secrets exposed to one workflow are exposed to all workflows in the repo.
- There is no built-in manual-approval gate that fires between a tag push and the workflow run that publishes against that tag.
- There is no first-party Dependabot equivalent for secrets-aware rotation reminders.

The threat model scenarios this leaves exposed:

- **S1 — release-key compromise**: an attacker who acquires the npmjs.org or Gitea publish token can push a release without the maintainer ever pressing a button.
- **S2 — workflow injection**: an attacker with Gitea write access to `.gitea/workflows/` can author a workflow that exfiltrates secrets or alters the published artifact, and there's no environment-scoped secret separation to limit the blast.

[A9 (signed-tag verify, #1299)](https://git.integrolabs.net/roctinam/aiwg/issues/1299) landed in Wave 3 specifically to be the hard cryptographic gate this ADR depends on. A9 alone closes most of S2 (a workflow injection that doesn't possess the release-signing key cannot produce a tag that survives the gate). But the audit asked for a bundle, not a single control, because A9 is forward-going only and a single point of failure if the signing key itself is compromised.

[A5 (#1283)](https://git.integrolabs.net/roctinam/aiwg/issues/1283) moves npmjs.org publishing to GitHub Actions in Wave 4 to inherit GitHub's environment-protection surface for the npmjs.org leg. That covers half the problem. This ADR covers the other half — the **Gitea-registry** leg and the **Gitea release-record creation** workflow, both of which stay on Gitea Actions for the foreseeable future.

## Decision

The Gitea side gets a bundle of compensating controls. Together, the bundle covers S1 and S2 at parity with a single GitHub `environment:` rule. Individually, each control closes a different sub-vector and the bundle degrades gracefully (any one control failing still leaves two).

### Control 1 — Signed-tag verify gate (A9, already shipped)

The cryptographic anchor. Implemented by `tools/ci/verify-signed-tag.sh` (commit `cee91c96`) and wired into `.gitea/workflows/npm-publish.yml` (both pre-release and stable jobs) and `.gitea/workflows/gitea-release.yml`. Every release-tag push must verify against a maintainer public key published in `.gitea/keys/maintainers.asc` (or SSH allowed-signers form). A bad signature halts the workflow before any publish step or release-creation step.

This is the hard gate. A1, A5, and A10 all stack on top of it.

### Control 2 — Manual approval record (this commit)

In direct-mode delivery (AIWG's mode), the tag push **is** the manual approval moment. A signed tag is the actor's cryptographic affirmation that they intended this release. We embed that affirmation into the Gitea release body as a permanent audit record:

```
## Release approval record

- Approved by: <github.actor>
- Tag push (UTC): <ISO-8601 timestamp>
- Tag signature verified by: tools/ci/verify-signed-tag.sh (#1299 / A9)
- Compensating-controls bundle: #1286 (A10)
```

The record is permanent — it survives token rotation, runner replacement, and Gitea version upgrades — and lives next to the release artifacts where any consumer can read it.

### Control 3 — Scoped + quarterly-rotated `NPM_TOKEN` (this commit)

Reduces blast radius for the case where the token leaks despite the other controls. Scopes are constrained to `write:package` + `write:repository` only — no `admin:*`, no `write:user`, no `write:organization`. Rotation cadence is quarterly per [`docs/contributing/secret-rotation.md`](../../docs/contributing/secret-rotation.md), plus emergency triggers (maintainer offboarding, suspected runner compromise, audit-log anomaly).

A four-step rotation procedure with verification + revoke-only-after-green-test-tag is documented at the link above.

### Control 4 — Dedicated publish runner (deferred)

Operationally desirable: isolates the publish workflow from runs that handle untrusted PRs (forks, CodeQL, etc.) and limits the per-runner secret exposure. Deferred to operator scheduling — not blocking this ADR. Documented as a follow-up so that when a dedicated runner is provisioned, the publish-bearing workflows can pin `runs-on: dedicated-publish` without further architecture work.

## Consequences

**Positive**:

- The bundle covers S1 and S2 without requiring Gitea-side changes (no Gitea version pin, no push-hook configuration, no waiting on upstream feature parity with GitHub Actions).
- Each control degrades gracefully. A leaked token (control 3 fails) still leaves the signed-tag gate (control 1) and the public approval record (control 2) intact. A lost signing key (control 1 fails) still leaves token-scoping (control 3) and audit-trail recovery via the approval record (control 2). Workflow injection (control 1's main target) still has the audit record (control 2) for forensics if a future Gitea CVE bypasses the gate.
- The approval record is permanent and visible to release consumers — independent verifiability beyond what a private CI log would offer.
- Quarterly rotation reduces the window of opportunity for a credential leak from "indefinite" to ~90 days.

**Negative**:

- The dedicated publish runner is deferred. Until provisioned, every Gitea Actions run shares the same secret exposure surface. The audit accepts this as an operational follow-up; the three active controls cover the primary attack paths.
- `NPMJS_TOKEN` stays in the Gitea repo until A5 completes its first verified release. During the overlap window, both legs publish to npmjs.org and either could be the vector. Mitigated by the same A9 signed-tag gate that protects every other publish step.
- Token rotation is operator-driven. There is no automated reminder; the procedure relies on a recurring calendar entry. If the operator misses the cadence, the leak-window grows. Mitigated by recording rotation dates in [`docs/contributing/secret-rotation.md`](../../docs/contributing/secret-rotation.md)'s history table and reviewing it in the per-quarter security check on the #1278 follow-up tracker.
- The approval record is informational — it does not block a malicious tag from being pushed by an attacker who possesses both Gitea write access AND the signing key. That double-compromise case is what A8 (#1287, tarball Sigstore signing) addresses in Wave 5.

## Alternatives Considered

**A. Petition Gitea for environment-keyword support**: rejected. Not in AIWG's control, no roadmap timeline, and the audit closure can't wait. Filing as a long-tail follow-up on the Gitea project is reasonable, but the bundle has to land regardless.

**B. Self-hosted GitHub Actions runner that participates in Gitea environments**: rejected. Out of scope — it requires a bridge layer that doesn't exist in either Gitea or GitHub Actions, plus runner-hosting infrastructure AIWG doesn't currently operate.

**C. Migrate everything (both legs) to GitHub Actions**: rejected. The audit constraint is "minimize blast radius and preserve the Gitea origin's auditability." Moving Gitea-registry publishing off Gitea Actions would force users on the Gitea registry to trust a publisher running on a different platform — net-negative on the threat model. A5 moves only the npmjs.org leg, which makes sense because that leg is the trusted-publishing-eligible one anyway.

**D. Single combined control (e.g., "require both signed tag AND timestamp from a hardware token")**: rejected. Single controls are single points of failure. The audit asked for compensating controls (plural) precisely so a defect in one control doesn't open the whole gate.

**E. Wait for Gitea to ship environment-protection-rules natively**: rejected per [operator decision 2 (2026-05-12)](https://git.integrolabs.net/roctinam/aiwg/issues/1278) — no timeline, blast radius is the live concern.

## References

- [#1286](https://git.integrolabs.net/roctinam/aiwg/issues/1286) — this issue
- [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278) — parent epic, F6 audit finding
- [#1299](https://git.integrolabs.net/roctinam/aiwg/issues/1299) — A9, signed-tag verify (the hard gate this bundle depends on)
- [#1283](https://git.integrolabs.net/roctinam/aiwg/issues/1283) — A5, npmjs.org via GitHub Actions OIDC (covers the npmjs.org leg)
- [#1287](https://git.integrolabs.net/roctinam/aiwg/issues/1287) — A8, tarball Sigstore signing (Wave 5, covers the double-compromise case)
- [`tools/ci/verify-signed-tag.sh`](../../tools/ci/verify-signed-tag.sh) — A9 implementation
- [`.gitea/workflows/gitea-release.yml`](../../.gitea/workflows/gitea-release.yml) — manual-approval-record step
- [`.gitea/workflows/README.md`](../../.gitea/workflows/README.md) — release-secret policy section
- [`docs/contributing/secret-rotation.md`](../../docs/contributing/secret-rotation.md) — operator rotation procedure
- [docs.gitea.com/usage/actions/comparison](https://docs.gitea.com/usage/actions/comparison) — Gitea Actions vs GitHub Actions feature matrix
