#!/usr/bin/env bash
#
# Cockpit "up" — one launcher that ensures BOTH halves are running:
#
#   1. the latest agentic-sandbox executor (started via its own management/dev.sh
#      if it is not already healthy — dev.sh builds the current source and waits
#      for the HTTP health endpoint), and
#   2. the Cockpit Bridge + web UI (delegated to cockpit-dev.sh).
#
# This is the supported "just bring up the whole thing" entry point. cockpit-dev.sh
# remains the Cockpit-only launcher; this wrapper adds the explicit guarantee that a
# real, current executor is listening before the Bridge starts.
#
#   apps/cockpit/scripts/cockpit-up.sh [--rebuild]
#   npm --prefix apps/cockpit run up
#   npm run cockpit:up              # from the repo root
#
# Env:
#   AIWG_COCKPIT_EXECUTOR_URL        executor base URL (default http://127.0.0.1:8122)
#   AGENTIC_SANDBOX_DIR              agentic-sandbox checkout
#                                    (default: sibling ../../../agentic-sandbox, else ~/dev/agentic-sandbox)
#   PORT / AIWG_COCKPIT_BRIDGE_PORT  Bridge port (default 8140, off the 8120-8122 range)
#   AIWG_COCKPIT_ENSURE_EXECUTOR=0   skip ensuring the executor (assume it is already up)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COCKPIT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$COCKPIT_DIR/../.." && pwd)"

EXECUTOR_URL="${AIWG_COCKPIT_EXECUTOR_URL:-${EXECUTOR_URL:-http://127.0.0.1:8122}}"
ENSURE_EXECUTOR="${AIWG_COCKPIT_ENSURE_EXECUTOR:-1}"

REBUILD=0
for arg in "$@"; do
  case "$arg" in
    --rebuild) REBUILD=1 ;;
    -h | --help)
      sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "✗ unknown argument: $arg (try --rebuild or --help)" >&2
      exit 2
      ;;
  esac
done

executor_healthy() {
  local path
  for path in /healthz/http /healthz /health; do
    if curl -fsS --max-time 2 "${EXECUTOR_URL}${path}" >/dev/null 2>&1; then
      return 0
    fi
  done
  return 1
}

# Defense-in-depth for agentic-sandbox #595: the file-backed vsock CID registry
# is written `instance-id=cid` but parsed `cid=instance-id`, so a stale/reversed
# entry makes the executor fail-closed on startup ("invalid vsock CID …") and
# crash-loop on every restart after a VM was provisioned. Normalize the file to
# the parser's `cid=instance-id` form before starting the executor: keep already
# correct lines, flip reversed ones, drop unparseable ones. Forward-compatible —
# once the writer is fixed upstream this is a pure no-op (correct lines pass
# through). Runs only in the start path, when the executor is down and not
# holding the file. Skip with AIWG_COCKPIT_HEAL_VSOCK_CID=0.
heal_vsock_cid_registry() {
  [ "${AIWG_COCKPIT_HEAL_VSOCK_CID:-1}" = "1" ] || return 0
  local f="${AGENTIC_GRPC_VSOCK_CID_MAP_FILE:-/var/lib/agentic-sandbox/vms/.vsock-cid-registry}"
  [ -s "$f" ] || return 0
  local healed
  healed="$(awk -F= '
    /^[[:space:]]*($|#)/ { print; next }      # blank/comment: keep
    NF < 2               { next }             # no "=": drop
    $1 ~ /^[0-9]+$/      { print; next }      # cid=name: already correct
    $2 ~ /^[0-9]+$/      { print $2"="$1; next }  # name=cid (the #595 bug): flip
    { next }                                  # neither side numeric: drop
  ' "$f" 2>/dev/null)"
  [ "$healed" = "$(cat "$f" 2>/dev/null)" ] && return 0
  if printf '%s\n' "$healed" > "$f" 2>/dev/null; then
    echo "• healed vsock CID registry — normalized reversed/stale entries (agentic-sandbox #595)"
  elif command -v sudo >/dev/null 2>&1 && printf '%s\n' "$healed" | sudo -n tee "$f" >/dev/null 2>&1; then
    echo "• healed vsock CID registry via sudo (agentic-sandbox #595)"
  else
    echo "⚠ vsock CID registry at $f looks malformed (agentic-sandbox #595) and could not be rewritten;" >&2
    echo "  the executor may crash-loop on start. Clear it manually:  : > $f" >&2
  fi
}

resolve_sandbox_dir() {
  if [ -n "${AGENTIC_SANDBOX_DIR:-}" ]; then
    echo "${AGENTIC_SANDBOX_DIR}"
    return
  fi
  local cand
  for cand in "${REPO_ROOT}/../agentic-sandbox" "${HOME}/dev/agentic-sandbox"; do
    if [ -x "${cand}/management/dev.sh" ]; then
      ( cd "${cand}" && pwd )
      return
    fi
  done
  echo ""
}

# 1. Ensure the agentic-sandbox executor is up and ready to receive.
if [ "${ENSURE_EXECUTOR}" = "1" ]; then
  if executor_healthy; then
    echo "✓ agentic-sandbox executor already healthy at ${EXECUTOR_URL}"
  else
    SANDBOX_DIR="$(resolve_sandbox_dir)"
    if [ -z "${SANDBOX_DIR}" ]; then
      cat >&2 <<MSG
✗ No executor reachable at ${EXECUTOR_URL}, and no agentic-sandbox checkout was found.

Set AGENTIC_SANDBOX_DIR to your agentic-sandbox path (the directory containing
management/dev.sh) and retry, or start it manually:

    cd <agentic-sandbox>/management && ./dev.sh
MSG
      exit 1
    fi
    echo "• executor not up — bringing up the latest agentic-sandbox via ${SANDBOX_DIR}/management/dev.sh"
    heal_vsock_cid_registry
    # Bring the executor up with all three runtime tiers usable from the Cockpit:
    #   - VM: vsock transport (guest agents enroll over their hypervisor CID).
    #   - Host: the opt-in bare-host runtime supervisor (in-process "local" mode;
    #     without this the host tier fail-closes and the picker shows
    #     "No registered host available"). See agentic-sandbox
    #     docs/runtimes/host-supervisor.md.
    #   - Docker: always available, no flag needed.
    # Operators can override any of these in the environment before calling.
    ( cd "${SANDBOX_DIR}/management" \
        && AGENTIC_GRPC_VSOCK_PORT="${AGENTIC_GRPC_VSOCK_PORT:-8120}" \
           AGENTIC_GRPC_VSOCK_CID_MAP_FILE="${AGENTIC_GRPC_VSOCK_CID_MAP_FILE:-/var/lib/agentic-sandbox/vms/.vsock-cid-registry}" \
           AGENTIC_HOST_RUNTIME_ENABLED="${AGENTIC_HOST_RUNTIME_ENABLED:-1}" \
           ./dev.sh )
    if executor_healthy; then
      echo "✓ agentic-sandbox executor up at ${EXECUTOR_URL}"
    else
      echo "✗ executor did not become healthy at ${EXECUTOR_URL}; check ${SANDBOX_DIR}/management/.run/mgmt.log" >&2
      exit 1
    fi
  fi
else
  echo "• AIWG_COCKPIT_ENSURE_EXECUTOR=0 — skipping executor ensure (assuming ${EXECUTOR_URL} is up)"
fi

# 2. Optional fresh web build (cockpit-dev.sh only builds when web/dist is absent).
if [ "${REBUILD}" = "1" ]; then
  echo "• rebuilding Cockpit web UI…"
  npm --prefix "${COCKPIT_DIR}" run build:web
fi

# 3. Launch the Cockpit (Bridge + web) against the real executor.
echo "• launching Cockpit against ${EXECUTOR_URL}"
exec "${SCRIPT_DIR}/cockpit-dev.sh"
