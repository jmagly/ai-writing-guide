#!/usr/bin/env bash
# templates/dev/verify-dev.sh — Developer environment verification
# Platform: linux, macos
# Params: LOCAL_DOMAIN (optional), HTTPS_DEV (default: false)
# Checks: local domain resolves, HTTPS cert trusted (if applicable), docker works without sudo
set -euo pipefail
source "$(dirname "$0")/../../lib/detect.sh"
source "$(dirname "$0")/../../lib/params.sh"
source "$(dirname "$0")/../../lib/verify.sh"

LOCAL_DOMAIN="${LOCAL_DOMAIN:-}"
HTTPS_DEV="${HTTPS_DEV:-false}"
FAIL=0

echo "Verifying developer environment..."
echo ""

# --- docker without sudo ---
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    echo "  [OK] docker: accessible without sudo"
  else
    echo "  [WARN] docker: installed but not accessible without sudo"
    echo "         Run: newgrp docker  (or log out and back in)"
    FAIL=1
  fi
else
  echo "  [SKIP] docker: not installed"
fi

# --- git identity ---
GIT_NAME="$(git config --global user.name 2>/dev/null || echo '')"
GIT_EMAIL="$(git config --global user.email 2>/dev/null || echo '')"
if [[ -n "${GIT_NAME}" && -n "${GIT_EMAIL}" ]]; then
  echo "  [OK] git identity: ${GIT_NAME} <${GIT_EMAIL}>"
else
  echo "  [WARN] git identity not configured (run setup-git-config.sh)"
  FAIL=1
fi

# --- SSH key ---
if [[ -f "${HOME}/.ssh/id_ed25519.pub" ]]; then
  echo "  [OK] SSH key: ${HOME}/.ssh/id_ed25519.pub exists"
else
  echo "  [WARN] No ED25519 SSH key found at ~/.ssh/id_ed25519.pub"
fi

# --- local domain resolves ---
if [[ -n "${LOCAL_DOMAIN}" && "${LOCAL_DOMAIN}" != "localhost" ]]; then
  if ping -c1 -W1 "${LOCAL_DOMAIN}" >/dev/null 2>&1 || \
     getent hosts "${LOCAL_DOMAIN}" >/dev/null 2>&1; then
    echo "  [OK] local domain: ${LOCAL_DOMAIN} resolves"
  else
    echo "  [WARN] local domain: ${LOCAL_DOMAIN} does not resolve"
    echo "         Add to /etc/hosts: 127.0.0.1 ${LOCAL_DOMAIN}"
    FAIL=1
  fi
fi

# --- HTTPS cert trusted ---
if [[ "${HTTPS_DEV}" == "true" && -n "${LOCAL_DOMAIN}" ]]; then
  CERT_DIR="${HOME}/.local/share/mkcert"
  if ls "${CERT_DIR}/${LOCAL_DOMAIN}"*.pem >/dev/null 2>&1; then
    echo "  [OK] HTTPS cert: found in ${CERT_DIR}"
  else
    echo "  [WARN] HTTPS cert: no certificate for ${LOCAL_DOMAIN} in ${CERT_DIR}"
    echo "         Run install-mkcert.sh to generate a local certificate"
    FAIL=1
  fi
fi

# --- inotify watches ---
if [[ "$(uname -s)" == "Linux" ]]; then
  watches=$(sysctl -n fs.inotify.max_user_watches 2>/dev/null || echo 0)
  if [[ "${watches}" -ge 524288 ]]; then
    echo "  [OK] inotify watches: ${watches}"
  else
    echo "  [WARN] inotify watches: ${watches} (recommended: 524288)"
    echo "         Run apply-inotify.sh to increase"
  fi
fi

echo ""
if [[ "${FAIL}" -eq 0 ]]; then
  echo "Developer environment: OK"
else
  echo "Developer environment: WARNINGS found (see above)"
  exit 1
fi
