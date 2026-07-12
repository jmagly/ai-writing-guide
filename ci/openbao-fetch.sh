#!/usr/bin/env bash
# Fetch CI secrets from OpenBao via a least-privilege AppRole.
#
# Spec format, one directive per line. Both path forms are accepted:
#   env <ENV_NAME> <mount/path> <field>
#   keyfile <ENV_NAME> <mount/data/path> <field>
#
# Values fetched with `env` are masked and appended to GITHUB_ENV or --env-file.
# Values fetched with `keyfile` are written to mode-600 temp files; the env var
# receives the path. Run `openbao-fetch.sh --cleanup` in an always step.
set -euo pipefail

BAO_ADDR="${BAO_ADDR:-https://rca-g2.s9.internal:8200}"
SPEC_FILE=""
ENV_FILE="${GITHUB_ENV:-}"
CLEANUP=0
DRY_RUN=0

usage() {
  cat >&2 <<'EOF'
Usage:
  ci/openbao-fetch.sh --spec <file> [--env-file <file>] [--addr <url>] [--dry-run]
  ci/openbao-fetch.sh [--env-file <file>] [--addr <url>] < spec
  ci/openbao-fetch.sh --cleanup

Required environment for fetch:
  BAO_CI_ROLE_ID
  BAO_CI_SECRET_ID

Spec directives:
  env <ENV_NAME> <mount/path> <field>
  keyfile <ENV_NAME> <mount/data/path> <field>

Example:
  env GHCR_TOKEN kv_internal/ci/shared/ghcr-token token
  keyfile DEPLOY_KEY kv_internal/data/ci/my-repo/docsite-deploy private_key
EOF
}

die() {
  printf 'openbao-fetch: %s\n' "$*" >&2
  exit 1
}

mask() {
  local value="$1"
  if [[ -n "${GITHUB_ACTIONS:-}" || -n "${CI:-}" ]]; then
    printf '::add-mask::%s\n' "$value"
  fi
}

cleanup_file() {
  if [[ -n "${RUNNER_TEMP:-}" ]]; then
    printf '%s/openbao-fetch-cleanup\n' "$RUNNER_TEMP"
  else
    printf '.openbao-fetch-cleanup\n'
  fi
}

cleanup() {
  local list
  list="$(cleanup_file)"
  [[ -f "$list" ]] || return 0
  while IFS= read -r path; do
    [[ -n "$path" && -f "$path" ]] || continue
    if command -v shred >/dev/null 2>&1; then
      shred -u "$path" || rm -f "$path"
    else
      rm -f "$path"
    fi
  done <"$list"
  rm -f "$list"
}

kv_data_path() {
  local path="$1"
  if [[ "$path" == */data/* ]]; then
    printf '%s\n' "$path"
  else
    printf '%s/data/%s\n' "${path%%/*}" "${path#*/}"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --addr) BAO_ADDR="$2"; shift 2 ;;
    --spec) SPEC_FILE="$2"; shift 2 ;;
    --env-file) ENV_FILE="$2"; shift 2 ;;
    --cleanup) CLEANUP=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown argument: $1" ;;
  esac
done

if [[ "$CLEANUP" == 1 ]]; then
  cleanup
  exit 0
fi

if [[ -z "$SPEC_FILE" ]]; then
  SPEC_FILE="/dev/stdin"
fi
[[ -r "$SPEC_FILE" ]] || die "cannot read spec: $SPEC_FILE"

if [[ "$DRY_RUN" == 1 ]]; then
  awk '
    /^[[:space:]]*($|#)/ { next }
    $1 != "env" && $1 != "keyfile" { printf "invalid directive on line %d: %s\n", NR, $0; exit 2 }
    NF != 4 { printf "expected 4 fields on line %d: %s\n", NR, $0; exit 2 }
    $2 !~ /^[A-Z_][A-Z0-9_]*$/ { printf "invalid env var on line %d: %s\n", NR, $2; exit 2 }
    $3 !~ /^[A-Za-z0-9_.-]+\/.+$/ { printf "invalid KV path on line %d: %s\n", NR, $3; exit 2 }
    $4 !~ /^[A-Za-z0-9_.-]+$/ { printf "invalid field on line %d: %s\n", NR, $4; exit 2 }
  ' "$SPEC_FILE"
  printf 'openbao-fetch: dry-run OK for %s\n' "$SPEC_FILE"
  exit 0
fi

# Dependency checks live below the dry-run branch on purpose: dry-run is pure
# spec validation (awk only) and must work in containers without curl/jq.
if ! command -v curl >/dev/null 2>&1; then die "curl is required"; fi
if ! command -v jq >/dev/null 2>&1; then die "jq is required"; fi

[[ -n "${BAO_CI_ROLE_ID:-}" ]] || die "BAO_CI_ROLE_ID is required"
[[ -n "${BAO_CI_SECRET_ID:-}" ]] || die "BAO_CI_SECRET_ID is required"
[[ -n "$ENV_FILE" ]] || die "GITHUB_ENV or --env-file is required; refusing to print secrets"

token="$(
  jq -n --arg role_id "$BAO_CI_ROLE_ID" --arg secret_id "$BAO_CI_SECRET_ID" \
    '{role_id:$role_id, secret_id:$secret_id}' |
  curl -fsS -k --max-time 20 -X POST --data @- \
    "$BAO_ADDR/v1/auth/approle/login" |
  jq -er '.auth.client_token'
)"
mask "$token"
revoke_token() {
  [[ -n "${token:-}" ]] || return 0
  curl -fsS -k --max-time 10 \
    -H "X-Vault-Token: $token" \
    -X POST "$BAO_ADDR/v1/auth/token/revoke-self" >/dev/null 2>&1 || true
  token=""
}
trap revoke_token EXIT

tmp_dir="${RUNNER_TEMP:-$(mktemp -d)}"
mkdir -p "$tmp_dir"
chmod 700 "$tmp_dir" 2>/dev/null || true
cleanup_list="$(cleanup_file)"
: >"$cleanup_list"
chmod 600 "$cleanup_list" 2>/dev/null || true

while read -r kind name path field extra; do
  [[ -z "${kind:-}" || "$kind" == \#* ]] && continue
  [[ -z "${extra:-}" ]] || die "too many fields for $name"
  [[ "$kind" == "env" || "$kind" == "keyfile" ]] || die "invalid directive: $kind"
  [[ "$name" =~ ^[A-Z_][A-Z0-9_]*$ ]] || die "invalid env var: $name"
  [[ "$path" == */* ]] || die "path must be mount/path: $path"
  api_path="$(kv_data_path "$path")"
  value="$(
    curl -fsS -k --max-time 20 \
      -H "X-Vault-Token: $token" \
      "$BAO_ADDR/v1/$api_path" |
    jq -er --arg field "$field" '.data.data[$field]'
  )"

  if [[ "$kind" == "env" ]]; then
    mask "$value"
    {
      printf '%s<<__OPENBAO_%s__\n' "$name" "$name"
      printf '%s\n' "$value"
      printf '__OPENBAO_%s__\n' "$name"
    } >>"$ENV_FILE"
    printf 'openbao-fetch: exported %s from %s:%s\n' "$name" "$path" "$field" >&2
  else
    file="$(mktemp "$tmp_dir/openbao-${name}.XXXXXX")"
    # Trailing newline is load-bearing: command substitution strips it from the
    # fetched value, and OpenSSH rejects a private key file that does not end
    # with one ("error in libcrypto").
    printf '%s\n' "$value" >"$file"
    chmod 600 "$file"
    printf '%s\n' "$file" >>"$cleanup_list"
    printf '%s=%s\n' "$name" "$file" >>"$ENV_FILE"
    printf 'openbao-fetch: wrote keyfile %s from %s:%s\n' "$name" "$path" "$field" >&2
  fi
done <"$SPEC_FILE"
