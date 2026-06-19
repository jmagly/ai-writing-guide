#!/usr/bin/env bash
#
# Canonical Cockpit dev bring-up (#1634) — the supported way to run the Cockpit
# against a REAL agentic-sandbox executor. Replaces hand-rolled /tmp rigs.
#
#   apps/cockpit/scripts/cockpit-dev.sh        # or: npm --prefix apps/cockpit run dev
#
# It points the Bridge at a running executor with sane, off-range defaults; it
# does NOT manage the executor's secrets/VMs (start that with its own dev.sh) and
# it NEVER uses the bundled mock (the mock is automated-test-only).
#
# Env:
#   AIWG_COCKPIT_EXECUTOR_URL  real executor base URL (default http://127.0.0.1:8122)
#   PORT / AIWG_COCKPIT_BRIDGE_PORT  Bridge port (default 8140, off the 8120-8122 range)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COCKPIT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

EXECUTOR_URL="${AIWG_COCKPIT_EXECUTOR_URL:-${EXECUTOR_URL:-http://127.0.0.1:8122}}"
BRIDGE_PORT="${PORT:-${AIWG_COCKPIT_BRIDGE_PORT:-8140}}"

# Mirror resolveBridgePort(): never squat on the executor's canonical range.
case "$BRIDGE_PORT" in
  8120 | 8121 | 8122)
    echo "✗ Bridge port $BRIDGE_PORT collides with the agentic-sandbox canonical range" >&2
    echo "  (8120/8121/8122 = gRPC/WS/HTTP). Pick another port (default 8140)." >&2
    exit 2
    ;;
esac

# 1. Require a reachable REAL executor. Health endpoints differ across builds.
reachable=0
for path in /healthz/http /healthz /health; do
  if curl -fsS --max-time 2 "${EXECUTOR_URL}${path}" >/dev/null 2>&1; then
    reachable=1
    break
  fi
done
if [ "$reachable" -ne 1 ]; then
  cat >&2 <<MSG
✗ No real agentic-sandbox executor reachable at ${EXECUTOR_URL}.

Start the canonical dev executor first (it binds 8120 gRPC / 8121 WS / 8122 HTTP):

    cd <agentic-sandbox>/management && ./dev.sh

Then re-run this script, or set AIWG_COCKPIT_EXECUTOR_URL to your executor URL.
The bundled mock is automated-test-only and is intentionally NOT used here.
MSG
  exit 1
fi
echo "✓ executor reachable at ${EXECUTOR_URL}"

# 2. Build the web UI if there is no dist yet.
if [ ! -d "${COCKPIT_DIR}/web/dist" ]; then
  echo "• building web UI (no web/dist yet)…"
  npm --prefix "${COCKPIT_DIR}" run build:web
fi

# 3. Launch the Bridge against the real executor on the off-range default port.
echo "• starting Bridge on http://127.0.0.1:${BRIDGE_PORT}  (executor ${EXECUTOR_URL})"
AIWG_COCKPIT_EXECUTOR_URL="${EXECUTOR_URL}" PORT="${BRIDGE_PORT}" \
  exec node "${COCKPIT_DIR}/bridge/src/server.mjs"
