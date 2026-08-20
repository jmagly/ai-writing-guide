#!/usr/bin/env bash
# Push AIWG through its project-dedicated Gitea SSH key as roctinam.
# The ITOps wrapper resolves the key from OpenBao into tmpfs for one command,
# validates its fingerprint, and isolates SSH from ambient agents/config.

set -euo pipefail
set +x
ROOT="$(git rev-parse --show-toplevel)"
ROLE="${AIWG_GIT_VAULT_ROLE:-$(git config --local --get aiwg.vault.readerRole)}"
KEY_PATH="${AIWG_GIT_SSH_KEY_VAULT_PATH:-$(git config --local --get aiwg.vault.sshKeyPath)}"
FINGERPRINT="${AIWG_GIT_SSH_KEY_FINGERPRINT:-$(git config --local --get aiwg.vault.sshKeyFingerprint)}"
EXPECTED_HOST="${AIWG_GIT_EXPECTED_HOST:-$(git config --local --get aiwg.vault.sshExpectedHost)}"
EXPECTED_REPO="${AIWG_GIT_EXPECTED_REPO:-$(git config --local --get aiwg.vault.sshExpectedRepo)}"
SSH_HELPER="${AIWG_GIT_SSH_HELPER:-$(git config --local --get aiwg.vault.sshHelper)}"
TOKEN_HELPER="${OPENBAO_TOKEN_HELPER:-/home/roctinam/.local/lib/itops/openbao-token.sh}"

[[ -n "$ROLE" && -n "$KEY_PATH" && -n "$FINGERPRINT" && -n "$EXPECTED_HOST" && -n "$EXPECTED_REPO" ]] || {
  echo 'FAIL: AIWG Git vault routing is incomplete.' >&2
  exit 1
}
[[ -x "$SSH_HELPER" && -x "$TOKEN_HELPER" ]] || {
  echo 'FAIL: installed ITOps OpenBao SSH helpers are unavailable.' >&2
  exit 1
}

run_git() {
  OPENBAO_GIT_APPROLE="$ROLE" \
  OPENBAO_GIT_DATA_PATH="$KEY_PATH" \
  OPENBAO_GIT_FINGERPRINT="$FINGERPRINT" \
  OPENBAO_GIT_EXPECTED_HOST="$EXPECTED_HOST" \
  OPENBAO_GIT_EXPECTED_REPO="$EXPECTED_REPO" \
  OPENBAO_TOKEN_HELPER="$TOKEN_HELPER" \
  GIT_SSH_COMMAND="$SSH_HELPER" \
    git -C "$ROOT" "$@"
}

if [[ "${1:-}" == --check ]]; then
  run_git ls-remote origin HEAD >/dev/null
  echo "Gitea SSH authentication passed for roctinam ($FINGERPRINT)."
  exit 0
fi
run_git push origin "$@"
