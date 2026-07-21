#!/usr/bin/env bash
# Git gpg.program adapter for the project-dedicated AIWG commit key.

set -euo pipefail
set +x
umask 077

ROOT="$(git rev-parse --show-toplevel)"
ROLE="${AIWG_GIT_VAULT_ROLE:-$(git config --local --get aiwg.vault.readerRole)}"
KEY_PATH="${AIWG_COMMIT_SIGNING_KEY_VAULT_PATH:-$(git config --local --get aiwg.vault.commitKeyPath)}"
EXPECTED="${AIWG_COMMIT_SIGNING_FINGERPRINT:-$(git config --local --get user.signingkey)}"
TOKEN_HELPER="${OPENBAO_TOKEN_HELPER:-/home/roctinam/dev/itops/scripts/lib/openbao-token.sh}"
source "${OPENBAO_ENV:-/home/roctinam/.config/openbao/env}"

[[ -n "$ROLE" && -n "$KEY_PATH" && -n "$EXPECTED" ]] || {
  echo 'FAIL: AIWG project vault routing is not configured.' >&2
  exit 1
}
[[ -x "$TOKEN_HELPER" ]] || { echo 'FAIL: OpenBao token helper unavailable.' >&2; exit 1; }

for candidate in "${XDG_RUNTIME_DIR:-}" /dev/shm; do
  if [[ -n "$candidate" && -d "$candidate" && -w "$candidate" && "$(stat -f -c %T "$candidate" 2>/dev/null || true)" == tmpfs ]]; then
    RUNTIME_PARENT="$candidate"
    break
  fi
done
[[ -n "${RUNTIME_PARENT:-}" ]] || { echo 'FAIL: writable tmpfs is required.' >&2; exit 1; }

TMP="$(mktemp -d "$RUNTIME_PARENT/aiwg-commit-signing.XXXXXX")"
GNUPGHOME="$TMP/gnupg"
cleanup() {
  gpgconf --homedir "$GNUPGHOME" --kill gpg-agent >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT INT TERM
mkdir -m 700 "$GNUPGHOME"

TOKEN="$($TOKEN_HELPER approle "$ROLE")"
curl -fsS --config /dev/fd/3 "$BAO_ADDR/v1/$KEY_PATH" \
  3<<<"header = \"X-Vault-Token: $TOKEN\"" > "$TMP/secret.json"
jq -er '.data.data.armored_private_key' "$TMP/secret.json" > "$TMP/key.asc"
jq -er '.data.data.passphrase' "$TMP/secret.json" > "$TMP/passphrase"
jq -er '.data.data.fingerprint' "$TMP/secret.json" > "$TMP/fingerprint"
[[ "$(<"$TMP/fingerprint")" == "$EXPECTED" ]] || { echo 'FAIL: AIWG commit fingerprint mismatch.' >&2; exit 1; }
GNUPGHOME="$GNUPGHOME" gpg --batch --import "$TMP/key.asc" >/dev/null 2>&1
GNUPGHOME="$GNUPGHOME" exec gpg --batch --pinentry-mode loopback --passphrase-file "$TMP/passphrase" "$@"
