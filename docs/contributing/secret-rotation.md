# Secret Rotation

AIWG's Gitea CI/CD secrets are stored in OpenBao. Gitea Actions keeps only the
OpenBao bootstrap pair: `BAO_CI_ROLE_ID` and `BAO_CI_SECRET_ID`.

This procedure covers the OpenBao leaves used by Gitea CI/CD:

| Leaf | Purpose |
|---|---|
| `kv_internal/ci/aiwg/gitea-npm-token` | Gitea npm registry publish and release API token. |
| `kv_internal/ci/aiwg/github-mirror-token` | GitHub mirror push and release token. |
| `kv_internal/ci/aiwg/aiwg-io-dispatch-token` | aiwg.io deploy dispatch token. |
| `kv_internal/ci/shared/docs-deploy` | Docs host SSH private key. |

The signed-tag verify gate remains the hard release gate. Rotation limits blast
radius if a token or runner is exposed.

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

For `kv_internal/ci/aiwg/gitea-npm-token`, log in to Gitea as the AIWG
release-bearing account and generate a date-stamped access token, such as
`aiwg-publish-2026Q3`.

Minimum viable scopes:

- `write:package` for the Gitea npm registry.
- `write:repository` for release records and release assets.

Do not grant `admin:*`, `write:user`, or `write:organization`.

For the other leaves, generate or obtain the replacement value from the owning
service. Do not paste values into chat, issues, shell history, or commit
messages.

### 2. Write the Value to OpenBao

Use the itops OpenBao tooling and pass secret values by file only. Example for
the Gitea npm/release token:

```bash
scripts/secret-induct.sh \
  --mount kv_internal \
  --path ci/aiwg/gitea-npm-token \
  --file /path/on/approved/media/gitea-npm-token.txt \
  --field token \
  --type api-token \
  --service ci/aiwg \
  --owner roctibot \
  --tenant internal \
  --purpose "Gitea package publish and release API token for AIWG" \
  --consumers gitea-actions:aiwg \
  --sensitivity high \
  --rotation quarterly \
  --scope repo \
  --sop aiwg/docs/contributing/secret-rotation.md
```

Adjust `--path`, `--field`, and `--purpose` for the other leaves.

### 3. Verify

The cheapest verification path is a signed pre-release tag. It exercises the
OpenBao fetch path, Gitea package publish, and release API without affecting the
stable channel.

```bash
git tag -s v2026.6.0-rc.1 -m "rc.1 - CI secret rotation verification"
git push origin main --tags
```

Watch Gitea Actions:

- `Publish to Gitea npm registry` should reach `Affirm dist-tag on Gitea`.
- `Create Gitea Release` should reach `Create or reuse Gitea release`.
- `Mirror signed release assets to Gitea release` should fetch the Gitea token
  from OpenBao during manual asset mirroring.

Then smoke-test installation from the Gitea registry on a clean host:

```bash
npm install -g aiwg@2026.6.0-rc.1 --registry=https://git.integrolabs.net/api/packages/roctinam/npm/
```

### 4. Revoke the Old Source Credential

Only after verification is green, revoke the previous token or key at the
source service. For Gitea tokens, remove the previous date-stamped access token
from **User Settings -> Applications -> Manage Access Tokens**.

### 5. Record the Rotation

Append a rotation record below. The record proves the cadence is being honored.

## Rotation History

| Date | Performed by | Leaf | Trigger | Verification |
|---|---|---|---|---|
| _(seed entry - first OpenBao-backed rotation is pending)_ | | | | |

## If Rotation Breaks Publish

1. Restore the previous OpenBao leaf value if it is still valid.
2. Check token scope, AppRole policy, and whether the Gitea repo bootstrap pair
   points at a current `ci-aiwg` secret ID.
3. Re-run the relevant fetch spec in dry-run mode:

```bash
bash ci/openbao-fetch.sh --spec ci/openbao-fetch.npm-publish.spec --dry-run
```

4. File a follow-up issue if the failure is in workflow logic rather than token
   material or OpenBao policy.

## Related Procedures

- [`ci-cd-secrets.md`](ci-cd-secrets.md) - current Gitea CI/CD secret model.
- `itops/docs/security/ci-secret-migration.md` - OpenBao CI migration runbook.
- `tools/ci/verify-signed-tag.sh` - signed-tag release gate.
