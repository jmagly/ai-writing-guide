# ADR: Move npmjs.org Publishing to GitHub Actions OIDC Trusted Publishing

**Status**: Accepted
**Date**: 2026-05-12
**Issues**: [#1283](https://git.integrolabs.net/roctinam/aiwg/issues/1283) (A5, Wave 4 of supply-chain hardening epic [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278)); spike [#1295](https://git.integrolabs.net/roctinam/aiwg/issues/1295) (provider-feasibility decision)

## Context

The May 2026 Mini Shai-Hulud audit (#1278 finding F2, threat-model scenario S1 — release-key compromise) called for retiring the long-lived `NPMJS_TOKEN` that drives AIWG's npmjs.org publish step in `.gitea/workflows/npm-publish.yml`. The replacement is npm's **trusted publishing** model: short-lived OIDC tokens that the registry verifies against the CI workflow's identity claims at publish time, plus `npm publish --provenance` to attach cryptographic attestations linking each published tarball to its source commit and the workflow run that produced it.

Spike [#1295](https://git.integrolabs.net/roctinam/aiwg/issues/1295) investigated whether Gitea Actions could host this. As of 2026-05-12, the [npm trusted-publishers documentation](https://docs.npmjs.com/trusted-publishers) lists supported providers as **GitHub Actions** and **GitLab CI/CD** — Gitea Actions is not in the matrix. Workflow runtime requirements: **Node 22.14.0+** and **npm 11.5.1+**. There is no path to OIDC trusted publishing on Gitea Actions without npm registry-side changes that are outside AIWG's control.

AIWG already maintains a GitHub mirror at `github.com/jmagly/aiwg` per `.aiwg/aiwg.config`'s `remotes.secondary[github].push_on_release: true` setting. Tags pushed to the mirror are the existing artifact for public-mirror release announcements; the same push can now also trigger a GitHub Actions workflow that owns the npmjs.org leg.

The Gitea-registry publish leg stays on Gitea Actions (single-leg responsibility — npmjs.org leg moves, Gitea-leg doesn't) and is governed by the [#1286 / A10 compensating-controls bundle](adr-gitea-release-compensating-controls.md).

## Decision

Add a new GitHub Actions workflow at `.github/workflows/npm-publish.yml` that:

1. **Triggers on tag push** to the GitHub mirror (`on: push: tags: [v*]`) plus `workflow_dispatch` for retries.
2. **Permissions**: `contents: read`, `id-token: write`. The latter is what enables OIDC trusted publishing — without it, npmjs.org rejects the publish request even with the trusted-publisher record configured.
3. **Container**: `node:22@sha256:62e4daa6819762bbd3072af77cc282ab72c631c4aed30dd7980192babaf385b3` (Node 22.22.2, ≥ 22.14.0 requirement). Pinned by immutable digest per the [pinning policy](../../.gitea/workflows/README.md); row in [`ci/digests.txt`](../../ci/digests.txt).
4. **Actions**: `actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5` (v4.3.1, reused from Gitea pinning) and `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020` (v4.4.0, new SHA pin). Both have rows in `ci/digests.txt`.
5. **Reuses A9's signed-tag verify gate**: `bash tools/ci/verify-signed-tag.sh` runs before `npm publish`. Same script, same maintainer-key sources (`.gitea/keys/maintainers.asc` and `.gitea/allowed_signers`). The Gitea-located key files work fine for the GitHub Actions runner because the checkout step pulls the full repo including those files. No script duplication, no key duplication.
6. **Publishes with provenance**: `npm publish --provenance --access public --tag <dist-tag>`. No `NODE_AUTH_TOKEN` env. Trusted publishing handles auth via OIDC.
7. **Post-publish verifies the attestation**: `npm view aiwg@<version> --json | jq .dist.attestations` must be non-null. Catches the regression mode where the publish succeeds but provenance silently doesn't emit (mis-configured trusted-publisher upstream).
8. **Post-publish verifies the dist-tag**: same defense-in-depth check the Gitea workflow added in #1247 — confirms the dist-tag (latest / next / nightly) resolves to the version we just shipped.

Operator-side one-time setup is documented in the workflow's header comment block:
- npmjs.org → package settings → trusted publishers → add publisher (provider: GitHub Actions, owner: `jmagly`, repo: `aiwg`, workflow: `npm-publish.yml`).
- GitHub repo settings → Actions → confirm `id-token: write` is allowed.
- Tags must be pushed to the GitHub mirror to trigger the workflow: `git push origin main --tags && git push github main --tags`.

The Gitea `.gitea/workflows/npm-publish.yml` keeps both legs operational during the transition. Deprecation-comment blocks are added above the two npmjs.org publish steps documenting the phase-out. Once the operator verifies the GH Actions OIDC path with a real tag-push and the post-publish attestation check passes, the operator removes those steps and revokes `NPMJS_TOKEN`. Tracked on the [#1283](https://git.integrolabs.net/roctinam/aiwg/issues/1283) close-out checklist.

## Consequences

**Positive**:

- npmjs.org no longer requires a long-lived bearer token. The S1 (release-key compromise) attack surface for the npmjs.org leg goes from "token exists, can be stolen or leaked, must be rotated" to "no token, OIDC tokens are minutes-long and per-run." This is the audit's primary mitigation goal.
- Every published tarball carries a provenance attestation. Consumers can independently verify the chain from source commit → workflow run → tarball via `npm view aiwg@<version> --json | jq .dist.attestations`, without trusting AIWG's word for it. Procedure documented at [`docs/releases/verifying.md`](../../docs/releases/verifying.md).
- The A9 signed-tag gate continues to run before publish (same script, same key sources). Tag-forging defense remains intact. Workflow-injection defense (S2) is unchanged — A9 closes most of S2 regardless of which platform hosts the workflow.
- GitHub's environment-protection-rule surface is available on this workflow if the operator wants to add an explicit approval step later. Not configured today (the signed tag is the approval), but the door is open.

**Negative**:

- AIWG release flow now depends on both the Gitea origin and the GitHub mirror. Operator must push to both: `git push origin main --tags && git push github main --tags`. Single-push releases will publish to Gitea-registry only. Mitigated by documenting the push pattern in the workflow header and the release checklist.
- The npmjs.org leg now runs on infrastructure (GitHub Actions) AIWG does not directly control. The audit accepts this trade — npmjs.org itself is also untrusted-by-default infrastructure; running the publish on GitHub Actions vs Gitea Actions is the difference between "OIDC-eligible" and "long-lived token" providers, and the OIDC path is the audit's preferred outcome.
- Two-leg publish during the overlap window. Both `.gitea/workflows/npm-publish.yml` and `.github/workflows/npm-publish.yml` attempt to publish to npmjs.org until the operator removes the Gitea-side block. The npm registry de-dups (whichever leg lands first wins; second gets `cannot publish over` and treats it as success). Mitigated by the deprecation comments and explicit removal as a #1283 close-out task.
- `NPMJS_TOKEN` is not removed in this commit. It stays in the Gitea repo secrets until the operator verifies the OIDC path. If the operator never verifies, the token stays, and the audit objective is not fully met. Tracked on #1283.
- A future Gitea Actions trusted-publishing support would force a re-evaluation. Acceptable — by the time that lands, A8 (Sigstore tarball signing in Wave 5) provides an independent attestation surface, so the choice between platforms becomes a maintenance trade-off rather than a security one.

## Alternatives Considered

**A. Keep on Gitea Actions with a constrained `NPMJS_TOKEN`**: rejected. The token remains long-lived; rotation is operator-driven; no provenance attestation. The audit (#1278 F2) explicitly asked for OIDC trusted publishing, not a softer mitigation.

**B. Wait for Gitea Actions to land trusted-publisher support**: rejected per [operator decision 1 (2026-05-12)](https://git.integrolabs.net/roctinam/aiwg/issues/1278). No roadmap visibility, no timeline, and the audit close cannot wait. Filing the request upstream is reasonable but doesn't change today's decision.

**C. Run a self-hosted GitHub Actions runner that participates in Gitea environments**: rejected — too much new infrastructure (operator-hosted runner, bridge layer, monitoring) for a small project. Out of scope of supply-chain hardening.

**D. Use GitLab CI/CD on a mirror**: rejected — adds a third platform to maintain. AIWG already has the GitHub mirror; using it is one less moving piece.

**E. Move both legs (npmjs.org + Gitea-registry) to GitHub Actions**: rejected. The Gitea-registry leg has no security benefit on GitHub Actions (no OIDC trusted-publisher relationship between GitHub Actions and Gitea's npm registry), and consumers who pull from Gitea-registry would have to trust a publisher running on a different platform — net-negative on the threat model. Single-responsibility split keeps the audit trail clean.

**F. Add `npm publish --provenance` to the Gitea workflow without trusted publishing**: rejected. The `--provenance` flag without an OIDC trusted-publisher relationship produces a self-attested provenance that npmjs.org does not validate. It would look like the audit goal was met without actually meeting it.

## Coordination with sibling work

- [#1286 (A10)](adr-gitea-release-compensating-controls.md) — the Gitea side. The bundle there governs the Gitea-registry leg that stays on Gitea Actions. This ADR governs the npmjs.org leg that moves to GitHub Actions. Together they cover the full publish surface.
- [#1299 (A9)](adr-signed-tag-verify.md) — the signed-tag verify gate. Reused, not duplicated. Same script, same key sources, same behavior on both platforms.
- [#1287 (A8)](https://git.integrolabs.net/roctinam/aiwg/issues/1287) — tarball Sigstore signing in Wave 5. Will use the same OIDC identity established here for keyless `cosign sign`. A5 lands the identity; A8 lands the second attestation.
- [#1295](https://git.integrolabs.net/roctinam/aiwg/issues/1295) — the spike that produced the provider-decision. Closing as implemented by this ADR + the workflow file.

## References

- [`.github/workflows/npm-publish.yml`](../../.github/workflows/npm-publish.yml) — the new workflow
- [`ci/digests.txt`](../../ci/digests.txt) — pin manifest with new `node:22` and `actions/setup-node` rows
- [`.gitea/workflows/npm-publish.yml`](../../.gitea/workflows/npm-publish.yml) — deprecation comments above the npmjs.org publish steps
- [`.gitea/workflows/README.md`](../../.gitea/workflows/README.md) — release-secret policy section, points at this ADR
- [`docs/releases/verifying.md`](../../docs/releases/verifying.md) — consumer-facing provenance + signed-tag verification procedure
- [`tools/ci/verify-signed-tag.sh`](../../tools/ci/verify-signed-tag.sh) — A9 signed-tag verify (reused)
- [npm Trusted Publishers documentation](https://docs.npmjs.com/trusted-publishers) — supported-provider matrix (verified 2026-05-12)
- [GitHub OIDC token claims](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect) — what npmjs.org receives
- [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278) — parent epic, F2 audit finding
- [#1283](https://git.integrolabs.net/roctinam/aiwg/issues/1283) — this issue
- [#1295](https://git.integrolabs.net/roctinam/aiwg/issues/1295) — provider-feasibility spike
- [#1286](https://git.integrolabs.net/roctinam/aiwg/issues/1286) — A10, the Gitea-side companion
