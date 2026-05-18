# AIWG Internal Release Process

This is maintainer memory for cutting AIWG releases from this host.

## Signing Keys

Use the host GPG home when signing or verifying release tags and commits. The Codex runtime may set
`HOME` to a role-specific directory that does not contain the maintainer keys.

Expected commit signing key:

- Fingerprint: `62297562B1C7053088F405DB0117DAAA677A5BF2`
- Short key ID: `0117DAAA677A5BF2`
- UID: `roctinam (grissom) <1159087+jmagly@users.noreply.github.com>`

Expected release tag signing key:

- Fingerprint: `FE9272F0BC5781E1DE77FAAA719AB63879E84CE8`
- Short key ID: `719AB63879E84CE8`
- UIDs:
  - `jmagly <1159087+jmagly@users.noreply.github.com>`
  - `AIWG Release Signing <release@aiwg.io>`

Use:

```bash
GNUPGHOME=/home/roctinam/.gnupg \
  git -c user.signingkey=62297562B1C7053088F405DB0117DAAA677A5BF2 \
  commit -S

GNUPGHOME=/home/roctinam/.gnupg \
  git -c user.signingkey=FE9272F0BC5781E1DE77FAAA719AB63879E84CE8 \
  tag -s vYYYY.M.P -m "release: vYYYY.M.P"
```

Verify before pushing:

```bash
GNUPGHOME=/home/roctinam/.gnupg git tag -v vYYYY.M.P
GNUPGHOME=/home/roctinam/.gnupg GITHUB_REF=refs/tags/vYYYY.M.P \
  bash tools/ci/verify-signed-tag.sh
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
6. Create the signed tag with the host GPG home and release signing key above.
7. Push the tag to both remotes:

```bash
git push origin vYYYY.M.P
git push github vYYYY.M.P
```

8. Watch tag/release CI and confirm the release artifact exists.

## Notes From v2026.5.9

`v2026.5.9` was signed successfully only after explicitly setting
`GNUPGHOME=/home/roctinam/.gnupg`. The default runtime GPG home had no private keys.

Post-release docs commits must use the commit signing key, not the release tag
signing key. Release tags use the release key.
