#!/usr/bin/env bash
# Verify that the tag triggering this CI run is cryptographically signed
# by a maintainer key published in the repo. Hard-fails the workflow if
# either no maintainer keys are present or the tag's signature does not
# verify against any of them. This script is the gate referenced by
# #1299 (A9 — sign git tags + CI verify, parent epic #1278).
#
# Usage (called from a workflow `run:` block, with $GITHUB_REF set by the
# Gitea/GitHub Actions runner):
#   bash tools/ci/verify-signed-tag.sh
#
# Supported signing formats (operator picks one; both can co-exist):
#   - GPG  via .gitea/keys/maintainers.asc      (ASCII-armored pubkey ring)
#   - SSH  via .gitea/allowed_signers           (OpenSSH allowed-signers format)
#
# Operator setup is documented in:
#   - docs/contributing/versioning.md  ("Signing your release tag" section)
#   - SECURITY.md                       ("Maintainer signing keys" section)
#
# The script intentionally fails loudly with an actionable error when
# keys are missing — the gate's whole point is "no unsigned tags ever
# get published," so a soft warning would defeat it.

set -euo pipefail

# ---------------------------------------------------------------------------
# Extract the tag name from $GITHUB_REF. Gitea Actions uses GitHub-compatible
# refs: `refs/tags/vYYYY.M.PATCH`.
# ---------------------------------------------------------------------------
GH_REF="${GITHUB_REF:-}"
TAG="${GH_REF#refs/tags/}"
if [ -z "$TAG" ] || [ "$TAG" = "$GH_REF" ]; then
  cat <<EOF >&2
Signed-tag verify: not a tag push.
  GITHUB_REF=$GH_REF
This script must run only on workflow events that fire on tag pushes
(npm-publish.yml, gitea-release.yml, the future GitHub Actions publish
workflow). Check your workflow trigger config.
EOF
  exit 1
fi

# ---------------------------------------------------------------------------
# Discover maintainer public keys. Either GPG or SSH (or both). We don't
# silently pass when no keys are present — that would mean the verify step
# is a no-op and the gate isn't really gating.
# ---------------------------------------------------------------------------
GPG_KEYS_FILE=".gitea/keys/maintainers.asc"
SSH_SIGNERS_FILE=".gitea/allowed_signers"

HAS_GPG=0
HAS_SSH=0

if [ -f "$GPG_KEYS_FILE" ] && [ -s "$GPG_KEYS_FILE" ]; then
  HAS_GPG=1
fi
if [ -f "$SSH_SIGNERS_FILE" ] && [ -s "$SSH_SIGNERS_FILE" ]; then
  HAS_SSH=1
fi

if [ "$HAS_GPG" = "0" ] && [ "$HAS_SSH" = "0" ]; then
  cat <<'EOF' >&2
====================================================================
✗ Signed-tag gate FAILED: no maintainer public keys in this repo.
====================================================================

This CI step (added per #1299 / A9) enforces that every release tag is
cryptographically signed by a maintainer key published in the repo.
Neither of the supported key locations currently has content:

  .gitea/keys/maintainers.asc      (GPG, ASCII-armored — preferred)
  .gitea/allowed_signers           (SSH allowed-signers format)

To unblock the next release, the maintainer must:

  1. Generate a project-scoped signing key (NOT a personal key):
       GPG:  gpg --quick-generate-key 'AIWG Release Signing <release@aiwg.io>' ed25519 sign 5y
       SSH:  ssh-keygen -t ed25519 -f ~/.ssh/aiwg-release-signing -C 'aiwg-release-signing'

  2. Configure git locally to sign tags by default:
       GPG:  git config --global user.signingkey <key-id>
             git config --global tag.gpgSign true
       SSH:  git config --global gpg.format ssh
             git config --global user.signingkey ~/.ssh/aiwg-release-signing.pub
             git config --global tag.gpgSign true

  3. Publish the PUBLIC component to the repo:
       GPG:  gpg --armor --export <key-id> > .gitea/keys/maintainers.asc
       SSH:  echo "release@aiwg.io $(cat ~/.ssh/aiwg-release-signing.pub)" >> .gitea/allowed_signers

  4. Update SECURITY.md "Maintainer signing keys" with the fingerprint.

  5. Commit + push the public-key file and updated SECURITY.md, then
     re-tag the release with `git tag -s vYYYY.M.PATCH -m "..."`.

See docs/contributing/versioning.md and SECURITY.md for full procedure.
====================================================================
EOF
  exit 1
fi

# ---------------------------------------------------------------------------
# Configure git to use whichever signing format we found public keys for.
# Both can be set simultaneously; git will pick the matching one per-tag.
# ---------------------------------------------------------------------------

if [ "$HAS_GPG" = "1" ]; then
  # GPG path: import maintainer pubring into the runner's keyring.
  if ! command -v gpg >/dev/null 2>&1; then
    echo "Installing gpg (not present in base image)..."
    if command -v apt-get >/dev/null 2>&1; then
      apt-get update -qq >/dev/null
      apt-get install -y --no-install-recommends gnupg2 >/dev/null
    else
      echo "✗ gpg not found and apt-get unavailable; cannot import GPG keys." >&2
      exit 1
    fi
  fi
  # --import is idempotent. Use --batch + --no-tty in CI.
  gpg --batch --no-tty --import "$GPG_KEYS_FILE" 2>&1 | grep -E '(imported|unchanged)' || true
fi

if [ "$HAS_SSH" = "1" ]; then
  # SSH path: configure git to verify against the allowed-signers file.
  # gpg.ssh.allowedSignersFile must be an absolute path or one relative
  # to the working tree; we use $PWD to be explicit.
  git config gpg.ssh.allowedSignersFile "$PWD/$SSH_SIGNERS_FILE"
fi

# ---------------------------------------------------------------------------
# Verify the tag signature. `git tag -v <tag>` exits 0 if signature
# verifies, non-zero otherwise. Capture output so we can show a useful
# diagnostic on failure.
# ---------------------------------------------------------------------------
echo "→ Verifying signature on tag: $TAG"

if VERIFY_OUTPUT="$(git tag -v "$TAG" 2>&1)"; then
  echo "✓ Tag $TAG verified successfully."
  echo "$VERIFY_OUTPUT" | grep -E '^(gpg|Good signature|Signature made|Signer|Signer email)' || true
  exit 0
fi

# Failure path: print git's own diagnostic + actionable next step.
cat <<EOF >&2
====================================================================
✗ Signed-tag gate FAILED: tag '$TAG' did not verify.
====================================================================

git output:
$VERIFY_OUTPUT

Common causes:
  • Tag was created with 'git tag -m "..."' (annotated but unsigned).
    Fix: re-tag with 'git tag -s -m "..."'.
  • Tag was signed with a key not in .gitea/keys/maintainers.asc or
    .gitea/allowed_signers. Either publish the key, or sign with one
    that is already published.
  • Tag was signed by an expired or revoked key. Rotate per the
    SECURITY.md key-rotation policy.

To recover the bad tag and re-push:

  git tag -d $TAG
  git push origin :refs/tags/$TAG
  # ... fix signing setup, then ...
  git tag -s $TAG -m "..."
  git push origin $TAG

See docs/contributing/versioning.md and SECURITY.md for the full procedure.
====================================================================
EOF
exit 1
