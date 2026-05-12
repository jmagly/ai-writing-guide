# `.gitea/workflows/` — CI Pinning Policy

All container images and external actions referenced in this directory are pinned by immutable identifier — `@sha256:<digest>` for container images, `@<40-char-commit-SHA>` for GitHub Actions. **No mutable tags (`@v4`, `:latest`, `:20`) anywhere.** A trailing inline comment on each pinned line shows the resolved version (`# v4.3.1`, `# node 20.20.2`) so workflow diffs remain readable.

The pin manifest is at [`ci/digests.txt`](../../ci/digests.txt). Every active pin has a row there with the resolved version, the date the pin was set, and the rationale for the most recent update. Treat any digest/SHA change in a workflow file without a corresponding row update in that manifest as a red flag.

## Why pin

Mutable tags are a silent supply-chain attack surface. A compromised action maintainer or a tag-repoint by an upstream registry can replace the runtime code without any commit landing in this repo. SHA/digest pinning makes upstream changes a reviewable diff in our own history.

Source rules: [`.claude/rules/dev-idempotent-builds.md`](../../.claude/rules/dev-idempotent-builds.md) (rule 2 forbids `:latest`, rule 4 requires lockfiles). Originating epic: [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278) (Mini Shai-Hulud response, Wave 2 audit findings F3 + F5).

## Updating a pin

The full procedure lives in [`ci/digests.txt`](../../ci/digests.txt) under "Update process." Short version:

1. File an issue describing why the bump is wanted.
2. Resolve the new pin (`docker pull` for containers, `git ls-remote` for actions).
3. Update all workflow occurrences in one commit. Verify with `grep -rn <pinned-thing> .gitea/workflows/`.
4. Append a row to `ci/digests.txt`.
5. Verify CI is green on the bump commit before declaring done.

Pins are not bumped on a fixed schedule. A bump is triggered by an advisory against the current pin, a needed feature in a newer release, or an explicit audit decision.

## Dependabot / equivalent automation

Gitea Actions does not currently have first-party Dependabot. Automated PR-filing for pin bumps is a follow-on; until that lands, bumps are operator-initiated per the manual process above.

## Release-secret policy

The Gitea publish workflows depend on three secrets. Each has a distinct purpose, scope, and rotation lifecycle — they are not interchangeable.

### `NPM_TOKEN` (Gitea API token, `gta_…`)

Used by both `npm-publish.yml` (Gitea-registry leg) and `gitea-release.yml`. Despite the name, this is **not** an npmjs.org token — it's a Gitea personal access token. Required scopes: `write:package` (to push to the Gitea npm registry at `git.integrolabs.net/api/packages/roctinam/npm/`) and `write:repository` (to create release records on the AIWG repo).

Rotated quarterly per [`docs/contributing/secret-rotation.md`](../../docs/contributing/secret-rotation.md). Emergency rotation on maintainer offboarding, suspected runner compromise, or suspected token leak.

### `NPMJS_TOKEN` (npmjs.org granular access token, `npm_…`)

Used by the npmjs.org publish leg of `npm-publish.yml`. **Being phased out** in favor of the GitHub Actions OIDC trusted-publishing path landed by #1283 / A5 in [`/.github/workflows/npm-publish.yml`](../../.github/workflows/npm-publish.yml). Once A5's first verified release succeeds, the operator removes this token from the Gitea repo secrets and revokes it on npmjs.org. Until then, the same rotation cadence as `NPM_TOKEN` applies (quarterly, plus emergency triggers).

### `GT_ACCESS_TOKEN`

Used by the docsite workflows (`docsite-build.yml`, `docsite-deploy.yml`) for repo cloning. Cleaned up in #1284 / A6 to use the credential-helper pattern instead of token-in-URL. Not used by release-bearing workflows.

### The Gitea Actions `environment:`-keyword gap

GitHub Actions provides an `environment:` keyword that gates workflow runs on a per-environment approval and exposes secrets only to runs that satisfy the gate. Gitea Actions currently ignores the keyword (see [docs.gitea.com/usage/actions/comparison](https://docs.gitea.com/usage/actions/comparison)). The implication for AIWG: there is no native deployment-protection-rule surface on the Gitea publish workflows. The audit (#1278 finding F6) flagged this as a residual risk.

### Compensating controls bundle (#1286 / A10)

The mitigation for the missing native gate is a bundle of three controls. Together they cover the threat model (S1 — release-key compromise, S2 — workflow injection) at parity with a single environment-protection rule.

| Control | What it does | Where it lives |
|---|---|---|
| Signed-tag verify (#1299 / A9) | Hard cryptographic gate. Every release tag must verify against a maintainer public key before any publish/release-creation step runs. Catches forged tags, replay, and most workflow-injection vectors. | [`tools/ci/verify-signed-tag.sh`](../../tools/ci/verify-signed-tag.sh) — invoked by `npm-publish.yml` and `gitea-release.yml`. |
| Manual approval record (#1286 / A10) | The actor and UTC timestamp of the tag push are embedded in the Gitea release body. In direct-mode delivery, the tag push **is** the approval moment; the signed tag is the actor's cryptographic affirmation. | `gitea-release.yml` `Create or reuse Gitea release` step injects `Approved by: ${{ github.actor }}` + ISO-8601 timestamp into the release body. |
| Scoped + rotated `NPM_TOKEN` (#1286 / A10) | Token scopes are limited to `write:package` + `write:repository` only. Quarterly rotation cadence with emergency-rotation triggers. Reduces blast radius if the token leaks. | [`docs/contributing/secret-rotation.md`](../../docs/contributing/secret-rotation.md). |

The bundle does **not** include a dedicated publish runner. That control is operationally desirable (it isolates the publish step from runs that handle untrusted PRs) and was scoped into #1286 but deferred to operator scheduling. Until a dedicated runner is provisioned, the three controls above are the active mitigation.

ADR: [`.aiwg/architecture/adr-gitea-release-compensating-controls.md`](../../.aiwg/architecture/adr-gitea-release-compensating-controls.md).

### Forward-looking: npmjs.org publishing moves to GitHub Actions (#1283 / A5)

npm trusted-publishing requires a supported provider and `id-token: write` workflow permissions. Gitea Actions is not in the npm supported-provider matrix as of 2026-05-12, so the npmjs.org publish leg moves to [`/.github/workflows/npm-publish.yml`](../../.github/workflows/npm-publish.yml) on the GitHub mirror. The new workflow uses OIDC trusted publishing (no long-lived token) and `npm publish --provenance` (cryptographic attestation linking the published tarball to the GitHub Actions workflow run + the source commit SHA).

The two-leg model holds while the operator verifies the OIDC path:

- **npmjs.org publish** — handled by `.github/workflows/npm-publish.yml` (GitHub mirror).
- **Gitea-registry publish** — handled by `.gitea/workflows/npm-publish.yml` (Gitea origin). `NPM_TOKEN` (Gitea API token) drives this leg; the bundle of compensating controls above governs it.

After the first OIDC-verified npmjs.org release: operator removes the npmjs.org publish steps from `.gitea/workflows/npm-publish.yml` and revokes `NPMJS_TOKEN`. Tracked on #1283 close-out.
