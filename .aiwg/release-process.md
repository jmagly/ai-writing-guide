# AIWG Internal Release Process

This is maintainer memory for cutting AIWG releases from this host.

## Signing Keys

Signing-key custody moved to OpenBao on 2026-07-11. Do **not** assume
`/home/roctinam/.gnupg` is the source of truth for either regular commit signing
or release-tag signing. The private keys live in the itops OpenBao instance and
are hydrated into a short-lived local GPG home only for the operation that needs
them.

OpenBao source of truth:

- Endpoint: `https://rca-g2.s9.internal:8200`
- SOP: `/home/roctinam/dev/itops/docs/security/secret-management-sop.md`
- Commit key path: `kv_internal/gpg/commit-signing-key`
- Release key path: `kv_internal/gpg/release-signing-key`
- Catalog/discovery: `/home/roctinam/dev/itops/scripts/secret-catalog.sh`

CI/CD note: the release workflows still only pull repository contents and verify
tags against the public keys committed under `.gitea/keys/maintainers.asc` (or
`.gitea/allowed_signers`). CI does not need OpenBao access for signed-tag
verification.

Expected commit signing key, used for regular commits:

- Fingerprint: `62297562B1C7053088F405DB0117DAAA677A5BF2`
- Short key ID: `0117DAAA677A5BF2`
- UID: `roctinam (grissom) <1159087+jmagly@users.noreply.github.com>`

Expected release tag signing key, used only for annotated release tags:

- Fingerprint: `FE9272F0BC5781E1DE77FAAA719AB63879E84CE8`
- Short key ID: `719AB63879E84CE8`
- UIDs:
  - `jmagly <1159087+jmagly@users.noreply.github.com>`
  - `AIWG Release Signing <release@aiwg.io>`

Hydrate the commit key only when a regular signed commit is required:

```bash
set +x
umask 077
export BAO_ADDR=https://rca-g2.s9.internal:8200
export GNUPGHOME="${XDG_RUNTIME_DIR:-/dev/shm}/aiwg-gpg-commit.$$"
mkdir -p "$GNUPGHOME"
bao kv get -field=private_key kv_internal/gpg/commit-signing-key \
  | gpg --batch --import

git -c user.signingkey=62297562B1C7053088F405DB0117DAAA677A5BF2 \
  commit -S

gpgconf --kill gpg-agent || true
rm -rf "$GNUPGHOME"
```

Hydrate the release key only for release tags. Prefer the wrapper so preflight
checks run before any tag is created:

```bash
set +x
umask 077
export BAO_ADDR=https://rca-g2.s9.internal:8200
export GNUPGHOME="${XDG_RUNTIME_DIR:-/dev/shm}/aiwg-gpg-release.$$"
mkdir -p "$GNUPGHOME"
bao kv get -field=private_key kv_internal/gpg/release-signing-key \
  | gpg --batch --import

tools/release/cut-tag.sh YYYY.M.P
```

Verify before pushing:

```bash
git tag -v vYYYY.M.P
GITHUB_REF=refs/tags/vYYYY.M.P bash tools/ci/verify-signed-tag.sh

gpgconf --kill gpg-agent || true
rm -rf "$GNUPGHOME"
```

## Release Checklist

1. Confirm the worktree only contains intended changes.
2. Update package version, manifests, and release notes.
3. Run the verification suite:
   - `npm run typecheck`
   - `npm run build:cli`
   - targeted tests for the touched behavior
   - `npm test`
4. Commit and push `main` to both remotes.
5. Confirm branch CI is green before tagging.
6. Hydrate the release key from OpenBao into a temporary `GNUPGHOME` and create
   the signed tag with `tools/release/cut-tag.sh`.
7. Push the tag to both remotes:

```bash
git push origin vYYYY.M.P
git push github vYYYY.M.P
```

8. Watch tag/release CI and confirm the release artifact exists.

## Notes From v2026.5.9 and the OpenBao migration

`v2026.5.9` required explicitly setting `GNUPGHOME=/home/roctinam/.gnupg`
because the default runtime GPG home had no private keys. That host keyring is
now legacy convenience state, not custody. For future releases, fetch the key
from OpenBao and use a throwaway GPG home for the ceremony.

Post-release docs commits must use the commit signing key, not the release tag
signing key. Release tags use the release key.
