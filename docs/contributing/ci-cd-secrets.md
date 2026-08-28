# CI/CD Secrets Configuration

**Version:** 3.2
**Last Updated:** 2026-08-28
**Target Audience:** Repository maintainers and administrators

AIWG's Gitea CI/CD workflows use vault for repository-managed secrets. Gitea
Actions stores only the vault bootstrap pair:

| Tracker secret       | Purpose                                     |
| -------------------- | ------------------------------------------- |
| `VAULT_CI_ROLE_ID`   | AppRole role ID for the `ci-aiwg` reader.   |
| `VAULT_CI_SECRET_ID` | AppRole secret ID for the `ci-aiwg` reader. |

Do not recreate legacy Gitea secrets such as `NPM_TOKEN`, `GH_ACCESS_TOKEN`,
`AIWG_IO_DISPATCH_TOKEN`, or `DOCSITE_DEPLOY_KEY`. Those values live in vault
and are fetched at runtime with [`../../ci/vault-fetch.sh`](../../ci/vault-fetch.sh).

`secrets.GITHUB_TOKEN` is not part of this migration. It is a per-run token
issued by the CI system and is still used by PR-comment workflows.

## Vault Fetch Specs

| Workflow                                   | Spec                                      | Exported value            |
| ------------------------------------------ | ----------------------------------------- | ------------------------- |
| `.gitea/workflows/npm-publish.yml`         | `ci/vault-fetch.npm-publish.spec`         | `NODE_AUTH_TOKEN`         |
| `.gitea/workflows/gitea-release.yml`       | `ci/vault-fetch.gitea-release.spec`       | `GITEA_TOKEN`             |
| `.gitea/workflows/upload-release-sigs.yml` | `ci/vault-fetch.upload-release-sigs.spec` | `GITEA_TOKEN`             |
| `.gitea/workflows/github-mirror.yml`       | `ci/vault-fetch.github-mirror.spec`       | `GH_TOKEN`                |
| `.gitea/workflows/notify-site.yml`         | `ci/vault-fetch.notify-site.spec`         | `AIWG_IO_DISPATCH_TOKEN`  |
| `.gitea/workflows/docsite-deploy.yml`      | `ci/vault-fetch.docsite-deploy.spec`      | `DOCSITE_DEPLOY_KEY_FILE` |
| `.gitea/workflows/docsite-deploy.yml`      | `ci/vault-fetch.docsite-cloudflare.spec`  | `CLOUDFLARE_API_TOKEN`   |
| `.gitea/workflows/storage-server-conformance.yml` | `ci/vault-fetch.storage-postgres.spec` | `AIWG_POSTGRES_LIVE_URL` |
| `.gitea/workflows/storage-server-conformance.yml` | `ci/vault-fetch.storage-postgrest.spec` | `AIWG_POSTGREST_LIVE_URL` |
| `.gitea/workflows/storage-server-conformance.yml` | `ci/vault-fetch.storage-postgrest-auth.spec` | `AIWG_POSTGREST_AUTHORIZATION` |

The specs contain only `*_VAULT_PATH` and `*_VAULT_FIELD` placeholders. Concrete
vault paths, metadata paths, hostnames, and fields are stored as private Gitea
variables or in the private operations catalog.

Validate specs without reading live secrets:

```bash
for f in ci/vault-fetch.*.spec; do
  bash ci/vault-fetch.sh --spec "$f" --dry-run
done
```

Run the local consistency gate:

```bash
npm run lint:vault-migration
```

## Classification

| Name                                                                                       | Class           | Destination                |
| ------------------------------------------------------------------------------------------ | --------------- | -------------------------- |
| `VAULT_CI_ROLE_ID`                                                                         | `BOOTSTRAP`     | Gitea Actions secret       |
| `VAULT_CI_SECRET_ID`                                                                       | `BOOTSTRAP`     | Gitea Actions secret       |
| `GITHUB_TOKEN`                                                                             | CI-issued token | No storage; issued per run |
| `GT_NPM_TOKEN_VAULT_PATH`, `GT_NPM_TOKEN_VAULT_FIELD`                                      | `ROUTE`         | Gitea Actions variables    |
| `GT_RELEASE_TOKEN_VAULT_PATH`, `GT_RELEASE_TOKEN_VAULT_FIELD`                              | `ROUTE`         | Gitea Actions variables    |
| `GH_MIRROR_TOKEN_VAULT_PATH`, `GH_MIRROR_TOKEN_VAULT_FIELD`                                | `ROUTE`         | Gitea Actions variables    |
| `AIWG_IO_DISPATCH_TOKEN_VAULT_PATH`, `AIWG_IO_DISPATCH_TOKEN_VAULT_FIELD`                  | `ROUTE`         | Gitea Actions variables    |
| `DOCSITE_DEPLOY_KEY_VAULT_PATH`, `DOCSITE_DEPLOY_KEY_VAULT_FIELD`                          | `ROUTE`         | Gitea Actions variables    |
| `CLOUDFLARE_API_TOKEN_VAULT_PATH`, `CLOUDFLARE_API_TOKEN_VAULT_FIELD`                      | `ROUTE`         | Gitea Actions variables    |
| `RELEASE_SIGNING_KEY_VAULT_PATH`, `RELEASE_SIGNING_KEY_VAULT_FIELD`                        | `ROUTE`         | Gitea Actions variables    |
| `RELEASE_SIGNING_PASSPHRASE_VAULT_PATH`, `RELEASE_SIGNING_PASSPHRASE_VAULT_FIELD`          | `ROUTE`         | Gitea Actions variables    |
| `AIWG_POSTGRES_LIVE_URL_VAULT_PATH`, `AIWG_POSTGRES_LIVE_URL_VAULT_FIELD`                  | `ROUTE`         | Gitea Actions variables    |
| `AIWG_POSTGREST_LIVE_URL_VAULT_PATH`, `AIWG_POSTGREST_LIVE_URL_VAULT_FIELD`                | `ROUTE`         | Gitea Actions variables    |
| `AIWG_POSTGREST_AUTHORIZATION_VAULT_PATH`, `AIWG_POSTGREST_AUTHORIZATION_VAULT_FIELD`      | `ROUTE`         | Gitea Actions variables    |
| `VAULT_ADDR`                                                                               | `ROUTE`         | Gitea Actions variable     |
| `DOCSITE_DEPLOY_HOST`, `DOCSITE_DEPLOY_PORT`, `DOCSITE_DEPLOY_USER`, `DOCSITE_DEPLOY_PATH` | `CONFIG`        | Gitea Actions variables    |

The machine-readable variable manifest is
[`../../ci/vault-migration-plan.json`](../../ci/vault-migration-plan.json).

## Provisioning

Use the private operations catalog to create the scoped policy and AppRole. Keep
the concrete policy file outside this repository, then pass it to:

```bash
npm run provision:vault-approle -- --policy-file /path/to/private-policy.hcl
VAULT_ADMIN_TOKEN=<admin-token> npm run provision:vault-approle -- \
  --policy-file /path/to/private-policy.hcl \
  --apply
```

To induct or rotate values from an approved local medium, prepare one file per
route ID:

```text
gitea-npm-token.value
gitea-release-token.value
github-mirror-token.value
aiwg-io-dispatch-token.value
docsite-deploy-key.value
cloudflare-api-token.value
release-signing-key.value
release-signing-passphrase.value
storage-postgres-live-url.value
storage-postgrest-live-url.value
storage-postgrest-authorization.value
```

Preview the vault writes without printing paths:

```bash
npm run provision:vault-migration -- \
  --routing-env /path/to/private-routing.env \
  --values-dir /path/to/approved-value-files
```

Apply only after confirming the private routing env and value files:

```bash
npm run provision:vault-migration -- \
  --routing-env /path/to/private-routing.env \
  --values-dir /path/to/approved-value-files \
  --apply
```

Validate and apply the Gitea handoff without printing values:

```bash
npm run configure:gitea-vault -- \
  --bootstrap-env /path/from/private-itops-runbook/aiwg-ci.env \
  --vars-env /path/to/private-routing-and-deploy.env

npm run configure:gitea-vault -- \
  --bootstrap-env /path/from/private-itops-runbook/aiwg-ci.env \
  --vars-env /path/to/private-routing-and-deploy.env \
  --apply
```

## Local Release-Tag Signing

The private itops release-signing runbook is authoritative for the local
mode-0600 `ci-aiwg` handoff, provider endpoint, trust bundle, and concrete route
metadata. This public repository intentionally documents only the required
environment-variable interface. Use the value-safe sequence in
[`versioning.md`](versioning.md); never call `git tag` directly or import the
release key into the persistent operator keyring.

## AppRole Recovery Custody

The `ci-aiwg` handoff contains only the AppRole bootstrap pair. It is not a
backup of the GPG release key, its passphrase, the Git SSH key, or any other
vault-held project secret. Those private values remain solely under the secret
store's custody and its backup and disaster-recovery controls.

The private itops repository defines the approved encrypted recovery medium,
copy verification, manifest, recovery-login test, and source-removal procedure
for newly generated handoffs. Do not commit that medium's path, a role ID, a
SecretID, or a secret-derived digest to this repository. Combined CI handoff
files use exactly `VAULT_CI_ROLE_ID` and `VAULT_CI_SECRET_ID`; rewrite any
legacy provider-specific names when an older handoff is touched.

## Docsite Deployment Config

The `Docsite Deploy` workflow publishes the AIWG documentation tenant over SSH.
The private key is fetched from vault. Target connection details are Gitea
Actions variables and should not be hardcoded in workflow files.

`GT_ACCESS_TOKEN` is not used by AIWG's current docsite workflows. The publisher
is installed from npm as `@pagenary/publisher`; do not add a clone token back to
the docsite workflows unless the publisher source model changes again.

## Troubleshooting

### Vault Bootstrap Missing

If `VAULT_CI_ROLE_ID` or `VAULT_CI_SECRET_ID` is absent, secret-bearing Gitea jobs
skip instead of attempting a partial publish. Add or rotate the AppRole
bootstrap pair in Gitea Actions secrets.

### Fetch Fails with 403

The `ci-aiwg` AppRole is missing the required path policy or is trying to read
the wrong leaf. Compare the workflow spec placeholder names with the private
vault routing env and policy.

### Gitea Registry Publish Fails

Check the private routing entry, token scope, and token freshness. The value
must remain vault-only.
