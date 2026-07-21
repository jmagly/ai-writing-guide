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
- Commit key route: `AIWG_COMMIT_SIGNING_KEY_VAULT_PATH`
- Release key route: `RELEASE_SIGNING_KEY_VAULT_PATH`
- Git transport route: `AIWG_GIT_SSH_KEY_VAULT_PATH`
- Catalog/discovery: `/home/roctinam/dev/itops/scripts/secret-catalog.sh`

CI/CD note: the release workflows still only pull repository contents and verify
tags against the public keys committed under `.gitea/keys/maintainers.asc` (or
`.gitea/allowed_signers`). CI does not need OpenBao access for signed-tag
verification.

Expected commit signing key, used for regular commits:

- Fingerprint: `25BEE160811F66FD6F7B1BF0454C68C4A2174CE9`
- Short key ID: `454C68C4A2174CE9`
- UID: `AIWG Commit Signing <1159087+jmagly@users.noreply.github.com>`

Expected release tag signing key, used only for annotated release tags:

- Fingerprint: `401584AAA3376B898FB34427839584D0E25E5126`
- Short key ID: `839584D0E25E5126`
- UID: `AIWG Release Signing <1159087+jmagly@users.noreply.github.com>`

Regular commits use the repository-local vault-backed adapter:

```bash
git commit -S
```

Release tags use the separate `ci-aiwg` reader route. Prefer the wrapper so
preflight checks run before any tag is created:

```bash
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
tools/git/push-origin-as-roctinam.sh vYYYY.M.P
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
