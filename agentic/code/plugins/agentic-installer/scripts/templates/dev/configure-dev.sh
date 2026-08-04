#!/usr/bin/env bash
# templates/dev/configure-dev.sh — Developer-specific environment configuration
# Platform: linux, macos
# Params: INSTALL_DIR (required), LOCAL_DOMAIN (interactive_required, optional),
#         DEV_PORT (default: 3000), HTTPS_DEV (default: false)
set -euo pipefail
source "$(dirname "$0")/../../lib/detect.sh"
source "$(dirname "$0")/../../lib/params.sh"
source "$(dirname "$0")/../../lib/verify.sh"

aiwg_require_param INSTALL_DIR
aiwg_expand_path INSTALL_DIR

DEV_PORT="${DEV_PORT:-3000}"
HTTPS_DEV="${HTTPS_DEV:-false}"
LOCAL_DOMAIN="${LOCAL_DOMAIN:-localhost}"

ENV_FILE="${INSTALL_DIR}/.env.local"

echo "Configuring developer environment..."

# --- create .env.local from .env.example if present ---
if [[ -f "${INSTALL_DIR}/.env.example" && ! -f "${ENV_FILE}" ]]; then
  cp "${INSTALL_DIR}/.env.example" "${ENV_FILE}"
  echo "  Created ${ENV_FILE} from .env.example"
fi

# --- write dev-specific values ---
if [[ -f "${ENV_FILE}" ]]; then
  # Update or append each dev setting
  for VAR_PAIR in \
    "DEV_PORT=${DEV_PORT}" \
    "LOCAL_DOMAIN=${LOCAL_DOMAIN}"; do
    VAR_NAME="${VAR_PAIR%%=*}"
    VAR_VALUE="${VAR_PAIR#*=}"
    if grep -q "^${VAR_NAME}=" "${ENV_FILE}"; then
      sed -i "s|^${VAR_NAME}=.*|${VAR_NAME}=${VAR_VALUE}|" "${ENV_FILE}"
    else
      echo "${VAR_NAME}=${VAR_VALUE}" >> "${ENV_FILE}"
    fi
  done
  echo "  Updated dev settings in ${ENV_FILE}"
fi

# --- protocol selection ---
if [[ "${HTTPS_DEV}" == "true" && -n "${LOCAL_DOMAIN}" && "${LOCAL_DOMAIN}" != "localhost" ]]; then
  PROTOCOL="https"
else
  PROTOCOL="http"
fi

echo ""
echo "Developer config complete."
echo "  Dev server: ${PROTOCOL}://${LOCAL_DOMAIN}:${DEV_PORT}"
if [[ -f "${ENV_FILE}" ]]; then
  echo "  Env file:   ${ENV_FILE}"
fi
