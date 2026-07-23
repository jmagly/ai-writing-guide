# Secret Rotation

AIWG's Gitea CI/CD secrets are stored in vault. Gitea Actions keeps only the
vault bootstrap pair: `VAULT_CI_ROLE_ID` and `VAULT_CI_SECRET_ID`.

Concrete vault paths, metadata paths, hostnames, and fields live in the private
operations catalog and Gitea repository variables. Do not add them to issues,
release docs, workflow comments, or this repository.

## When to Rotate

| Trigger | Cadence |
|---|---|
| Scheduled rotation | Every 90 days |
| Maintainer offboarding | Immediately |
| Suspected runner compromise | Immediately |
| Gitea audit-log anomaly | Within 24 hours |
| Token or key believed to have been logged | Immediately |
| First successful release after the previous rotation | Record as the start of the next 90-day window |

## Rotation Procedure

### 1. Generate the Replacement Value

For package and release tokens, log in to Gitea as the AIWG release-bearing
account and generate a date-stamped access token, such as
`aiwg-publish-2026Q3`.

Minimum viable scopes:

- `write:package` for the Gitea npm registry.
- `write:repository` for release records and release assets.

Do not grant `admin:*`, `write:user`, or `write:organization`.

For other leaves, generate or obtain the replacement value from the owning
service. Do not paste values into chat, issues, shell history, or commit
messages.

### 2. Write the Value to Vault

Use the private routing env and the itops secret induction tooling. Pass secret
values by file only:

```bash
npm run provision:vault-migration -- \
  --routing-env /path/to/private-routing.env \
  --values-dir /path/to/approved-value-files \
  --apply
```

### 3. Verify

The cheapest verification path is a signed pre-release tag. It exercises the
vault fetch path, Gitea package publish, and release API without affecting the
stable channel.

```bash
git tag -s v2026.6.0-rc.1 -m "rc.1 - CI secret rotation verification"
git push origin main --tags
```

Watch Gitea Actions:

- `Publish to Gitea npm registry` should reach `Affirm dist-tag on Gitea`.
- `Create Gitea Release` should reach `Create or reuse Gitea release`.
- `Mirror signed release assets to Gitea release` should fetch the Gitea token
  from vault during manual asset mirroring.

Then smoke-test the versioned Gitea `dist.tarball` URL on a clean host. Do not
set Gitea as npm's process-wide registry for this test: Gitea stores AIWG
packages but does not proxy their public npmjs.org dependencies.

### 4. Revoke the Old Source Credential

Only after verification is green, revoke the previous token or key at the
source service. For Gitea tokens, remove the previous date-stamped access token
from **User Settings -> Applications -> Manage Access Tokens**.

### 5. Record the Rotation

Append a rotation record below. The record proves the cadence is being honored.

## Rotation History

| Date | Performed by | Route ID | Trigger | Verification |
|---|---|---|---|---|
| _(seed entry - first vault-backed rotation is pending)_ | | | | |

## If Rotation Breaks Publish

1. Restore the previous vault leaf value if it is still valid.
2. Check token scope, AppRole policy, and whether the Gitea repo bootstrap pair
   points at a current `ci-aiwg` secret ID.
3. Re-run the relevant fetch spec in dry-run mode:

```bash
bash ci/vault-fetch.sh --spec ci/vault-fetch.npm-publish.spec --dry-run
```

4. File a follow-up issue if the failure is in workflow logic rather than token
   material or vault policy.

## Related Procedures

- [`ci-cd-secrets.md`](ci-cd-secrets.md) - current Gitea CI/CD secret model.
- `itops/docs/security/ci-secret-migration.md` - vault CI migration runbook.
- `tools/ci/verify-signed-tag.sh` - signed-tag release gate.
