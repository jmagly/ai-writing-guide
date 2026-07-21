# AIWG Project-Key Migration — 2026-07-20

AIWG migrated from shared cross-project credentials to project-dedicated
credentials under the private OpenBao routing documented by itops. This record
contains public and operational facts only.

- Project: AIWG (`roctinam/aiwg`)
- Forge identity: `roctinam`
- Commit identity: `roctinam <1159087+jmagly@users.noreply.github.com>`
- Commit-signing fingerprint: `25BEE160811F66FD6F7B1BF0454C68C4A2174CE9`
- Release-signing fingerprint: `401584AAA3376B898FB34427839584D0E25E5126`
- Git SSH fingerprint: `SHA256:MkFIK2DS6s79kgWbLKHwqZAKvoYf8dsmzmfg3XoK2N0`
- GPG expiry: 2028-07-20
- Operator reader AppRole: `git-aiwg-roctinam`
- Public registration: both GPG keys and the AIWG SSH key are registered to
  the Gitea `roctinam` account.
- Reader boundary: the operator role can read the AIWG commit and SSH leaves;
  a live read of the adjacent AIWG release leaf returned HTTP 403.
- Release boundary: `ci-aiwg` can read the AIWG release leaf; live reads of
  the AIWG commit and SSH leaves returned HTTP 403. Protected release-routing
  variables were repointed to the project release leaf.
- Historical decision: shared public keys remain committed so existing commits
  and tags continue to verify; their private authority is no longer selected
  for new AIWG operations.

Private leaf paths are injected through `AIWG_COMMIT_SIGNING_KEY_VAULT_PATH`,
`RELEASE_SIGNING_KEY_VAULT_PATH`, and `AIWG_GIT_SSH_KEY_VAULT_PATH`. They are
intentionally absent from this repository.
