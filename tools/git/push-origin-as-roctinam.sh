#!/usr/bin/env bash
# Push AIWG through its project-dedicated Gitea SSH key as roctinam.

set -euo pipefail
set +x
umask 077

ROOT="$(git rev-parse --show-toplevel)"
ROLE="${AIWG_GIT_VAULT_ROLE:-$(git config --local --get aiwg.vault.readerRole)}"
KEY_PATH="${AIWG_GIT_SSH_KEY_VAULT_PATH:-$(git config --local --get aiwg.vault.sshKeyPath)}"
TOKEN_HELPER="${OPENBAO_TOKEN_HELPER:-/home/roctinam/dev/itops/scripts/lib/openbao-token.sh}"
source "${OPENBAO_ENV:-/home/roctinam/.config/openbao/env}"

[[ -n "$ROLE" && -n "$KEY_PATH" ]] || { echo 'FAIL: AIWG Git vault routing is not configured.' >&2; exit 1; }
for candidate in "${XDG_RUNTIME_DIR:-}" /dev/shm; do
  if [[ -n "$candidate" && -d "$candidate" && -w "$candidate" && "$(stat -f -c %T "$candidate" 2>/dev/null || true)" == tmpfs ]]; then
    RUNTIME_PARENT="$candidate"
    break
  fi
done
[[ -n "${RUNTIME_PARENT:-}" ]] || { echo 'FAIL: writable tmpfs is required.' >&2; exit 1; }

TMP="$(mktemp -d "$RUNTIME_PARENT/aiwg-git-push.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT INT TERM
TOKEN="$($TOKEN_HELPER approle "$ROLE")"
curl -fsS --config /dev/fd/3 "$BAO_ADDR/v1/$KEY_PATH" \
  3<<<"header = \"X-Vault-Token: $TOKEN\"" > "$TMP/secret.json"
jq -er '.data.data.private_key' "$TMP/secret.json" > "$TMP/id_ed25519"
chmod 600 "$TMP/id_ed25519"

SSH_COMMAND="ssh -F /dev/null -o BatchMode=yes -o IdentitiesOnly=yes -o IdentityFile=$TMP/id_ed25519"
identity="$($SSH_COMMAND -T git@git.integrolabs.net 2>&1 || true)"
grep -q 'roctinam' <<<"$identity" || { echo 'FAIL: AIWG key did not authenticate as roctinam.' >&2; exit 1; }
if [[ "${1:-}" == --check ]]; then
  echo 'Gitea SSH authentication passed for roctinam.'
  exit 0
fi
GIT_SSH_COMMAND="$SSH_COMMAND" git -C "$ROOT" push origin "$@"
