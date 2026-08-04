#!/usr/bin/env bash
# templates/dev/install-mkcert.sh — Install mkcert and set up local CA
# Platform: linux, macos
# Params: LOCAL_DOMAIN (interactive_required)
# Effect: creates a locally-trusted CA certificate for HTTPS dev
set -euo pipefail
source "$(dirname "$0")/../../lib/detect.sh"
source "$(dirname "$0")/../../lib/params.sh"
source "$(dirname "$0")/../../lib/verify.sh"

aiwg_require_param LOCAL_DOMAIN

OS="$(uname -s)"

# --- install mkcert if missing ---
if ! command -v mkcert >/dev/null 2>&1; then
  echo "Installing mkcert..."
  case "${OS}" in
    Linux)
      MKCERT_VERSION="v1.4.4"
      ARCH="$(uname -m)"
      case "${ARCH}" in
        x86_64)  MKCERT_BIN="mkcert-${MKCERT_VERSION}-linux-amd64" ;;
        aarch64|arm64) MKCERT_BIN="mkcert-${MKCERT_VERSION}-linux-arm64" ;;
        *) echo "ERROR: Unsupported architecture: ${ARCH}" >&2; exit 1 ;;
      esac
      curl -fsSL "https://github.com/FiloSottile/mkcert/releases/download/${MKCERT_VERSION}/${MKCERT_BIN}" \
        -o /tmp/mkcert
      chmod +x /tmp/mkcert
      sudo mv /tmp/mkcert /usr/local/bin/mkcert
      ;;
    Darwin)
      if command -v brew >/dev/null 2>&1; then
        brew install mkcert nss
      else
        echo "ERROR: Homebrew required on macOS to install mkcert." >&2
        echo "Install Homebrew: https://brew.sh" >&2
        exit 1
      fi
      ;;
    *)
      echo "ERROR: Unsupported OS: ${OS}" >&2
      exit 1
      ;;
  esac
fi

# --- install local CA ---
echo "Installing local CA (requires sudo on Linux for system trust store)..."
mkcert -install

# --- generate certificate for LOCAL_DOMAIN ---
echo "Generating certificate for ${LOCAL_DOMAIN}..."
mkdir -p "${HOME}/.local/share/mkcert"
cd "${HOME}/.local/share/mkcert"
mkcert "${LOCAL_DOMAIN}" "*.${LOCAL_DOMAIN}" localhost 127.0.0.1 ::1

echo ""
echo "Local CA and certificate created."
echo "Certificate files:"
ls -1 "${HOME}/.local/share/mkcert/"
echo ""
echo "Configure your dev server to use these certificate files."
