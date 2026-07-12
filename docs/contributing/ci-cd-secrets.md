# CI/CD Secrets Configuration

**Version:** 2.0
**Last Updated:** 2026-07-12
**Target Audience:** Repository maintainers and administrators

AIWG's Gitea CI/CD workflows use OpenBao for repository-managed secrets. Gitea
Actions stores only the OpenBao bootstrap pair:

| Tracker secret | Purpose |
|---|---|
| `BAO_CI_ROLE_ID` | AppRole role ID for the `ci-aiwg` reader. |
| `BAO_CI_SECRET_ID` | AppRole secret ID for the `ci-aiwg` reader. |

Do not recreate legacy Gitea secrets such as `NPM_TOKEN`, `GH_ACCESS_TOKEN`,
`AIWG_IO_DISPATCH_TOKEN`, or `DEPLOY_SSH_KEY`. Those values live in OpenBao and
are fetched at runtime with [`../../ci/openbao-fetch.sh`](../../ci/openbao-fetch.sh).

`secrets.GITHUB_TOKEN` is not part of this migration. It is a per-run token
issued by the CI system and is still used by PR-comment workflows.

## OpenBao Fetch Specs

| Workflow | Spec | Exported value |
|---|---|---|
| `.gitea/workflows/npm-publish.yml` | `ci/openbao-fetch.npm-publish.spec` | `NODE_AUTH_TOKEN` |
| `.gitea/workflows/gitea-release.yml` | `ci/openbao-fetch.gitea-release.spec` | `GITEA_TOKEN` |
| `.gitea/workflows/upload-release-sigs.yml` | `ci/openbao-fetch.upload-release-sigs.spec` | `GITEA_TOKEN` |
| `.gitea/workflows/github-mirror.yml` | `ci/openbao-fetch.github-mirror.spec` | `GH_TOKEN` |
| `.gitea/workflows/notify-site.yml` | `ci/openbao-fetch.notify-site.spec` | `AIWG_IO_DISPATCH_TOKEN` |
| `.gitea/workflows/docsite-deploy.yml` | `ci/openbao-fetch.docsite-deploy.spec` | `DEPLOY_SSH_KEY_FILE` |

Validate specs without reading live secrets:

```bash
for f in ci/openbao-fetch.*.spec; do
  bash ci/openbao-fetch.sh --spec "$f" --dry-run
done
```

## Classification

| Name | Class | Destination |
|---|---|---|
| `BAO_CI_ROLE_ID` | `BOOTSTRAP` | Gitea Actions secret |
| `BAO_CI_SECRET_ID` | `BOOTSTRAP` | Gitea Actions secret |
| `GITHUB_TOKEN` | CI-issued token | No storage; issued per run |
| `NPM_TOKEN` | `SECRET` | `kv_internal/ci/aiwg/gitea-npm-token` field `token` |
| `GH_ACCESS_TOKEN` | `SECRET` | `kv_internal/ci/aiwg/github-mirror-token` field `token` |
| `AIWG_IO_DISPATCH_TOKEN` | `SECRET` | `kv_internal/ci/aiwg/aiwg-io-dispatch-token` field `token` |
| `DEPLOY_SSH_KEY` | `SECRET` | `kv_internal/ci/shared/docs-deploy` field `private_key` |
| `DEPLOY_HOST` | `CONFIG` | Gitea Actions variable |
| `DEPLOY_PORT` | `CONFIG` | Gitea Actions variable |
| `DEPLOY_USER` | `CONFIG` | Gitea Actions variable |
| `DEPLOY_PATH` | `CONFIG` | Gitea Actions variable |

## AppRole and Path Plan

The reader AppRole is `ci-aiwg`. Its token TTL should stay short, with a
maximum TTL no longer than the release jobs need.

The machine-readable plan is [`../../ci/openbao-migration-plan.json`](../../ci/openbao-migration-plan.json).
The AppRole policy file is [`../../ci/openbao-ci-aiwg.hcl`](../../ci/openbao-ci-aiwg.hcl).

Required readable leaves:

```text
kv_internal/data/ci/aiwg/gitea-npm-token
kv_internal/data/ci/aiwg/github-mirror-token
kv_internal/data/ci/aiwg/aiwg-io-dispatch-token
kv_internal/data/ci/shared/docs-deploy
```

Adjacent repository paths should deny access. Verify with the OpenBao operator
runbook in `itops/docs/security/ci-secret-migration.md`.

Run the local consistency gate:

```bash
npm run lint:openbao-migration
```

After live leaves are provisioned, verify metadata without reading values:

```bash
npm run lint:openbao-migration -- --live
```

To induct leaf values from an approved local medium, prepare one file per leaf:

```text
ci__aiwg__gitea-npm-token.token
ci__aiwg__github-mirror-token.token
ci__aiwg__aiwg-io-dispatch-token.token
ci__shared__docs-deploy.private_key
```

Preview the OpenBao writes:

```bash
npm run provision:openbao-migration -- --values-dir /path/to/approved/value-files
```

Apply only after confirming the paths and metadata:

```bash
npm run provision:openbao-migration -- --values-dir /path/to/approved/value-files --apply
```

Policy sketch:

```hcl
path "kv_internal/data/ci/aiwg/*" {
  capabilities = ["read"]
}

path "kv_internal/metadata/ci/aiwg/*" {
  capabilities = ["read", "list"]
}

path "kv_internal/data/ci/shared/docs-deploy" {
  capabilities = ["read"]
}

path "kv_internal/metadata/ci/shared/docs-deploy" {
  capabilities = ["read"]
}
```

Provision the AppRole with short-lived tokens. If the `bao` CLI is unavailable,
use the checked-in curl-based helper:

```bash
npm run provision:openbao-approle
BAO_TOKEN=<admin-token> npm run provision:openbao-approle -- --apply
```

Equivalent `bao` CLI commands:

```bash
bao policy write ci-aiwg ci/openbao-ci-aiwg.hcl
bao write auth/approle/role/ci-aiwg \
  token_policies=ci-aiwg \
  token_ttl=5m \
  token_max_ttl=15m \
  secret_id_ttl=0
```

Generate the Gitea bootstrap handoff file without printing values:

```bash
install -d -m 700 ~/.config/openbao/handoff
umask 077
{
  printf 'BAO_CI_ROLE_ID=%s\n' \
    "$(bao read -field=role_id auth/approle/role/ci-aiwg/role-id)"
  printf 'BAO_CI_SECRET_ID=%s\n' \
    "$(bao write -f -field=secret_id auth/approle/role/ci-aiwg/secret-id)"
} > ~/.config/openbao/handoff/aiwg-ci.env
chmod 600 ~/.config/openbao/handoff/aiwg-ci.env
```

Prepare the non-secret deploy variables in a separate env file:

```text
DEPLOY_HOST=docs-host.example.internal
DEPLOY_PORT=22
DEPLOY_USER=deploy
DEPLOY_PATH=/srv/docs/aiwg
```

Validate the Gitea handoff without printing values:

```bash
npm run configure:gitea-openbao -- \
  --bootstrap-env ~/.config/openbao/handoff/aiwg-ci.env \
  --vars-env /path/to/aiwg-deploy-vars.env
```

Apply after `tea login` is configured for `git.integrolabs.net`:

```bash
npm run configure:gitea-openbao -- \
  --bootstrap-env ~/.config/openbao/handoff/aiwg-ci.env \
  --vars-env /path/to/aiwg-deploy-vars.env \
  --apply
```

## Docsite Deployment Config

The `Docsite Deploy` workflow publishes the AIWG documentation tenant to
`docs.aiwg.io` over SSH. The private key is fetched from OpenBao. The target
connection details are non-secret Gitea Actions variables:

| Variable | Purpose |
|---|---|
| `DEPLOY_HOST` | Docs host name. |
| `DEPLOY_PORT` | SSH port. |
| `DEPLOY_USER` | SSH user. |
| `DEPLOY_PATH` | Root web path for the AIWG tenant on `docs.aiwg.io`. |

`GT_ACCESS_TOKEN` is not used by AIWG's current docsite workflows. The publisher
is installed from npm as `@pagenary/publisher`; do not add a clone token back to
the docsite workflows unless the publisher source model changes again.

## Shared `docs.aiwg.io` Tenants

`docs.aiwg.io` is shared with sibling documentation tenants. AIWG owns the root
tenant at `DEPLOY_PATH`; `roctinam/agentic-sandbox` owns the
`agentic-sandbox/` subtree and should deploy to:

```text
${DEPLOY_PATH%/}/agentic-sandbox/
```

AIWG's root deploy keeps `rsync --delete` enabled, but `docsite-deploy.yml`
protects registered sibling tenants with rsync receiver-protect filters and a
dry-run deletion check. Keep the protected-subpath list in
`.gitea/workflows/docsite-deploy.yml` aligned with the tenant table in
`.gitea/workflows/README.md`.

## Troubleshooting

### OpenBao Bootstrap Missing

If `BAO_CI_ROLE_ID` or `BAO_CI_SECRET_ID` is absent, secret-bearing Gitea jobs
skip instead of attempting a partial publish. Add or rotate the AppRole
bootstrap pair in Gitea Actions secrets.

### Fetch Fails with 403

The `ci-aiwg` AppRole is missing the required path policy or is trying to read
the wrong leaf. Compare the workflow's spec file with the OpenBao policy and
verify adjacent paths still deny access.

### Gitea Registry Publish Fails

Check `kv_internal/ci/aiwg/gitea-npm-token` metadata, token scope, and token
freshness. The value should be a Gitea API token scoped for package publish and
release API work, but it must remain OpenBao-only.
