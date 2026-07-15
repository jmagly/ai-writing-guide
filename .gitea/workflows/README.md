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

## PR-trigger workflow hardening

Workflows triggered by `pull_request` events run against the fork's HEAD code on fork PRs. Gitea Actions clamps the auto-issued `GITHUB_TOKEN` scope and does NOT expose user-defined secrets to fork PRs by default (verified against Gitea source — see [`models/secret/secret.go` `GetSecretsOfTask`](https://github.com/go-gitea/gitea/blob/main/models/secret/secret.go) lines 160-165: "ignore secrets for fork pull request, except `GITHUB_TOKEN` and `GITEA_TOKEN` which are automatically generated"). The same file's `models/actions/token_permissions.go` `restrictCrossRepoAccess` clamp further restricts the per-run token's cross-repo capability on fork PRs.

That default behavior means a fork PR cannot directly exfiltrate `NPM_TOKEN`, `NPMJS_TOKEN`, or `GT_ACCESS_TOKEN`. The residual surface is (a) install-script execution from a malicious lockfile change, mitigated by [A15 (#1290, release-age gate)](https://git.integrolabs.net/roctinam/aiwg/issues/1290) and [A20 (#1300, dep-source lint)](https://git.integrolabs.net/roctinam/aiwg/issues/1300); and (b) runtime regressions in Gitea's secret-handling. The hardening pattern below is defense-in-depth for (b): every workflow step that references a user-defined secret gets an explicit guard so the secret-handling assumption is local-and-visible rather than implicit-and-global.

### Reusable guard snippet (step level)

Place on any step that touches a user-defined secret. Step-level (not job-level) preserves non-secret validation steps for fork PRs — fork PR validation has value, and skipping the whole job throws it away.

```yaml
# Variant A — fork-PR guard (simpler; reusable default for any secret-bearing PR-triggered step).
# Skips on any fork PR; runs on internal-branch PRs and push events.
- name: Step that touches a user-defined secret
  if: ${{ gitea.event.pull_request.head.repo.fork != true }}
  env:
    SECRET_VALUE: ${{ secrets.SOME_SECRET }}
  run: |
    # ...

# Variant B — same-repo guard (stricter; catches the edge case where a
# branch in this repo somehow has `fork: true` in the payload).
- name: Step that touches a user-defined secret
  if: ${{ github.event.pull_request.head.repo.full_name == github.repository }}
  env:
    SECRET_VALUE: ${{ secrets.SOME_SECRET }}
  run: |
    # ...
```

**Which to use:** Variant A is the documented default. (`docsite-build.yml` previously carried this guard around its publisher clone; as of #1484 it sources `@pagenary/publisher` from npm and touches no secret, so it no longer needs the guard — the pattern remains here for other secret-bearing PR-triggered steps.) Variant B is stricter and is the canonical GitHub Actions form; on Gitea the two are functionally equivalent because both `gitea.*` and `github.*` expression contexts resolve to the same payload. Pick A for new workflows unless there's a specific reason to require full-name comparison.

**Job-level vs step-level:** Putting the guard at the job level (`jobs.<id>.if: …`) skips the entire job on fork PRs, which discards the validation value of running tests against fork code. Step-level guards on the specific secret-touching steps preserve the rest of the job.

**`pull_request_target` is not the right answer:** GitHub provides `pull_request_target` to opt fork PRs into secret access; Gitea's support for this trigger is version-dependent and the audit decided against relying on it. Use the same-repo guard pattern instead.

### Audit disposition

The A14 audit ([#1289](https://git.integrolabs.net/roctinam/aiwg/issues/1289)) walked the five PR-triggered workflows. ADR at [`.aiwg/architecture/adr-pr-trigger-hardening.md`](../../.aiwg/architecture/adr-pr-trigger-hardening.md) documents the per-workflow disposition matrix.

## Release-secret policy

Gitea Actions stores only the vault CI bootstrap pair:
`VAULT_CI_ROLE_ID` and `VAULT_CI_SECRET_ID`. Repository-managed release, mirror,
dispatch, and deploy-key material lives in vault and is fetched at runtime by
[`ci/vault-fetch.sh`](../../ci/vault-fetch.sh).

| Former Gitea secret | Current route variables |
|---|---|
| `NPM_TOKEN` | `GITEA_NPM_TOKEN_VAULT_PATH`, `GITEA_NPM_TOKEN_VAULT_FIELD` |
| `GH_ACCESS_TOKEN` | `GITHUB_MIRROR_TOKEN_VAULT_PATH`, `GITHUB_MIRROR_TOKEN_VAULT_FIELD` |
| `AIWG_IO_DISPATCH_TOKEN` | `AIWG_IO_DISPATCH_TOKEN_VAULT_PATH`, `AIWG_IO_DISPATCH_TOKEN_VAULT_FIELD` |
| `DOCSITE_DEPLOY_KEY` | `DOCSITE_DEPLOY_KEY_VAULT_PATH`, `DOCSITE_DEPLOY_KEY_VAULT_FIELD` |

Docsite deploy coordinates are Gitea Actions variables. `secrets.GITHUB_TOKEN`
is CI-issued per run and is not stored or migrated.

Rotation is documented in
[`docs/contributing/secret-rotation.md`](../../docs/contributing/secret-rotation.md).

## Shared `docs.aiwg.io` tenants

The docs site is a shared static host. The AIWG repository owns the root tenant;
sibling repositories may publish isolated subtrees under that same host. The
first registered sibling tenant is:

| Tenant | Owning repo | Public route | Deploy target |
|---|---|---|---|
| `agentic-sandbox` | `roctinam/agentic-sandbox` | public subpath | configured sibling deploy path |

AIWG's `docsite-deploy.yml` still runs `rsync --delete` for the root tenant, so
it must explicitly protect sibling tenant subtrees. The workflow defines
`PROTECTED_DOCS_SUBPATHS=agentic-sandbox`, converts each entry into an rsync
receiver-protect filter (`P /<subpath>/***`), runs a dry-run sync first, and
fails before mutation if the plan would delete a protected subtree.

When adding another shared docs tenant:

1. Add the route/subpath to the table above.
2. Add the subpath to `PROTECTED_DOCS_SUBPATHS` in `docsite-deploy.yml`.
3. Configure the sibling repository to deploy inside its own subtree, never to
   the root tenant path.
4. Verify both the root AIWG docs and the sibling route after the next deploy.

Do not solve tenant isolation by weakening `--delete`; stale root docs should
still be removed from the AIWG tenant. Protect only explicitly registered
subtrees.

### The Gitea Actions `environment:`-keyword gap

GitHub Actions provides an `environment:` keyword that gates workflow runs on a per-environment approval and exposes secrets only to runs that satisfy the gate. Gitea Actions currently ignores the keyword (see [docs.gitea.com/usage/actions/comparison](https://docs.gitea.com/usage/actions/comparison)). The implication for AIWG: there is no native deployment-protection-rule surface on the Gitea publish workflows. The audit (#1278 finding F6) flagged this as a residual risk.

### Compensating controls bundle (#1286 / A10)

The mitigation for the missing native gate is a bundle of three controls. Together they cover the threat model (S1 — release-key compromise, S2 — workflow injection) at parity with a single environment-protection rule.

| Control | What it does | Where it lives |
|---|---|---|
| Signed-tag verify (#1299 / A9) | Hard cryptographic gate. Every release tag must verify against a maintainer public key before any publish/release-creation step runs. Catches forged tags, replay, and most workflow-injection vectors. | [`tools/ci/verify-signed-tag.sh`](../../tools/ci/verify-signed-tag.sh) — invoked by `npm-publish.yml` and `gitea-release.yml`. |
| Manual approval record (#1286 / A10) | The actor and UTC timestamp of the tag push are embedded in the Gitea release body. In direct-mode delivery, the tag push **is** the approval moment; the signed tag is the actor's cryptographic affirmation. | `gitea-release.yml` `Create or reuse Gitea release` step injects `Approved by: ${{ github.actor }}` + ISO-8601 timestamp into the release body. |
| Scoped + rotated vault CI leaves (#1286 / A10) | Token scopes are limited to their workflow needs and rotated quarterly. Gitea stores only the vault bootstrap pair. | [`docs/contributing/secret-rotation.md`](../../docs/contributing/secret-rotation.md). |

The bundle does **not** include a dedicated publish runner. That control is operationally desirable (it isolates the publish step from runs that handle untrusted PRs) and was scoped into #1286 but deferred to operator scheduling. Until a dedicated runner is provisioned, the three controls above are the active mitigation.

ADR: [`.aiwg/architecture/adr-gitea-release-compensating-controls.md`](../../.aiwg/architecture/adr-gitea-release-compensating-controls.md).

### Forward-looking: npmjs.org publishing moves to GitHub Actions (#1283 / A5)

npm trusted-publishing requires a supported provider and `id-token: write` workflow permissions. Gitea Actions is not in the npm supported-provider matrix as of 2026-05-12, so the npmjs.org publish leg moves to [`/.github/workflows/npm-publish.yml`](../../.github/workflows/npm-publish.yml) on the GitHub mirror. The new workflow uses OIDC trusted publishing (no long-lived token) and `npm publish --provenance` (cryptographic attestation linking the published tarball to the GitHub Actions workflow run + the source commit SHA).

The two-leg model holds while the operator verifies the OIDC path:

- **npmjs.org publish** — handled by `.github/workflows/npm-publish.yml` (GitHub mirror).
- **Gitea-registry publish** — handled by `.gitea/workflows/npm-publish.yml` (Gitea origin). The Gitea API token is fetched from vault at runtime; the bundle of compensating controls above governs it.

After the first OIDC-verified npmjs.org release: operator removes the npmjs.org publish steps from `.gitea/workflows/npm-publish.yml` and revokes `NPMJS_TOKEN`. Tracked on #1283 close-out.
