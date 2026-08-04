#!/usr/bin/env bash
# templates/check-ports.sh — Verify required ports are free before deployment (#673)
# Platform: linux, macos
# Params: PORTS (optional, space-separated list; defaults to common ports 3000 3001 8080)
set -euo pipefail
source "$(dirname "$0")/../lib/detect.sh"

PORTS="${PORTS:-3000 3001 8080}"

echo "Checking port availability..."

for port in ${PORTS}; do
  if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
    echo "ERROR: Port ${port} is already in use:"
    ss -tlnp | grep ":${port} " || true
    echo ""
    echo "Stop the conflicting service or choose different ports."
    exit 1
  elif lsof -iTCP:"${port}" -sTCP:LISTEN -n -P 2>/dev/null | grep -q LISTEN; then
    # fallback for macOS where ss may not be available
    echo "ERROR: Port ${port} is already in use (detected via lsof)."
    lsof -iTCP:"${port}" -sTCP:LISTEN -n -P 2>/dev/null || true
    exit 1
  fi
done

echo "All required ports are available: ${PORTS}"
