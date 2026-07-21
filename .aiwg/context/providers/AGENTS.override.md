# Provider-specific context from AGENTS.override.md

Source attribution: migrated from `AGENTS.override.md`; checksum `a1bfb2c4f985ac8e0abcb4451974ba5d03827d49a3a07af013ce1c034e9ea657`.

# AGENTS.override.md

<!-- Operator-authored additions go here. The block below is AIWG-managed spillover; -->
<!-- do not edit between the spillover markers. Content outside is preserved across runs. -->

## Signing Keys

Signing-key custody has moved to OpenBao. Do not treat the host GPG home as the
source of truth for private signing keys.

Commit signing and release tag signing use different keys:

- Commits: `25BEE160811F66FD6F7B1BF0454C68C4A2174CE9` (`AIWG Commit Signing`)
- Release tags: `401584AAA3376B898FB34427839584D0E25E5126` (`AIWG Release Signing`)

Do not sign regular commits with the release tag key. Use the release key only for
annotated release tags such as `v2026.5.9`.

OpenBao source of truth:

- Commit key: injected by `AIWG_COMMIT_SIGNING_KEY_VAULT_PATH`
- Release key: injected by `RELEASE_SIGNING_KEY_VAULT_PATH`
- Git transport key: injected by `AIWG_GIT_SSH_KEY_VAULT_PATH`
- SOP: `/home/roctinam/dev/itops/docs/security/secret-management-sop.md`

For signing, hydrate only the needed key into a temporary `GNUPGHOME`, run the
operation, verify, then remove the temporary keyring. CI/CD does not need
OpenBao access for release verification; it only verifies pushed tags against
the public keys committed in the repo.

## Issue Tracking Mode

Use .aiwg/aiwg.config remotes.issue_tracker as the source of truth for
where this project's issues live. For this repository, issue_tracker points to
origin, and origin is the Gitea remote:

    git@git.integrolabs.net:roctinam/aiwg.git

Treat this as a configuration/topology note, not a separate specialized provider
decision. Agents should not guess or introduce extra issue-provider complexity.
If a project config points issue tracking at a local issue store instead, use the
AIWG issue CLI for local issue operations.

## Fortemi Integration Contract

Keep the three Fortemi integration planes separate:

- Static AIWG v1/v2 index files are rebuildable discovery/search artifacts.
- `--format fortemi-shard` is an explicit v2 index-to-shard conversion.
- The `fortemi` storage backend is a separate alpha live MCP persistence
  adapter.

The converter exists in AIWG source and the locked
`@fortemi/core@2026.7.11` package publishes it. AIWG's immutable `core-v1`
receipt and blocking shard-conformance CI exercise that published package,
validate the server-owned schema/profile, and pass clean PGlite and Fortemi
server import/re-export checks. This evidence is profile-scoped; source-unit
tests and self round trips alone remain insufficient for new profiles or
package revisions.

Use only named shard profiles (`full-v1`, `core-v1`,
`record-v1`). Treat `record-v1` as a declared subset with explicit loss
reporting. Never use unqualified "full", "100%", "server compatible", or
"backup" language for cross-repository data movement.
