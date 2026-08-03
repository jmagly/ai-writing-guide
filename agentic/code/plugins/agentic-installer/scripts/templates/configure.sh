#!/usr/bin/env bash
# templates/configure.sh — Configure installed software
# Platform: linux, macos, wsl2
# Params: INSTALL_DIR (required), CONFIG_DIR (default: ~/.config/<project>)
set -euo pipefail
source "$(dirname "$0")/../lib/detect.sh"
source "$(dirname "$0")/../lib/params.sh"
source "$(dirname "$0")/../lib/verify.sh"

# --- param validation ---
aiwg_require_param INSTALL_DIR
aiwg_expand_path INSTALL_DIR
# Default DATA_DIR to project-local path to avoid requiring elevated permissions (#675)
DATA_DIR="${DATA_DIR:-${INSTALL_DIR}/data}"
aiwg_expand_path DATA_DIR
CONFIG_DIR="${CONFIG_DIR:-${HOME}/.config/$(basename "${INSTALL_DIR}")}"
aiwg_expand_path CONFIG_DIR

# --- main ---
echo "Configuring in ${CONFIG_DIR}..."
mkdir -p "${CONFIG_DIR}"

# Detect protocol based on DOMAIN to avoid TLS issues on localhost (#671)
if [[ -n "${DOMAIN:-}" ]]; then
  if echo "${DOMAIN}" | grep -qE '^(localhost|127\.0\.0\.1)(:[0-9]+)?$'; then
    PROTOCOL="${PROTOCOL:-http}"
  else
    PROTOCOL="${PROTOCOL:-https}"
  fi
  ISSUER_URL="${ISSUER_URL:-${PROTOCOL}://${DOMAIN}}"
fi

# Create data directory (project-local by default, no sudo needed)
if ! mkdir -p "${DATA_DIR}" 2>/dev/null; then
  echo "ERROR: Cannot create DATA_DIR at ${DATA_DIR}"
  echo "Try setting DATA_DIR to a writable path, e.g.: DATA_DIR=${INSTALL_DIR}/data"
  exit 1
fi

# Copy default config if not already present
if [[ -f "${INSTALL_DIR}/config/defaults.conf" && ! -f "${CONFIG_DIR}/config.conf" ]]; then
  cp "${INSTALL_DIR}/config/defaults.conf" "${CONFIG_DIR}/config.conf"
  echo "  Wrote default config to ${CONFIG_DIR}/config.conf"
fi

# --- verify ---
aiwg_verify_path "${CONFIG_DIR}" dir
aiwg_verify_path "${DATA_DIR}" dir
