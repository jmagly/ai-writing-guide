#!/usr/bin/env bash
# templates/install-deps-fedora.sh — Install system dependencies
# Platform: linux/fedora, linux/rhel, linux/rocky
# Params: SKIP_OPTIONAL (default: false)
set -euo pipefail
source "$(dirname "$0")/../lib/detect.sh"
source "$(dirname "$0")/../lib/params.sh"
source "$(dirname "$0")/../lib/verify.sh"

# --- param validation ---
aiwg_bool_param SKIP_OPTIONAL false

# --- prerequisite check ---
aiwg_has_cmd dnf || aiwg_has_cmd yum || {
  echo "ERROR: dnf/yum not found. This script requires Fedora, RHEL, or Rocky Linux."
  exit 1
}
PKG_MGR=$(aiwg_has_cmd dnf && echo dnf || echo yum)

# --- main ---
echo "Installing required packages via ${PKG_MGR}..."
sudo "${PKG_MGR}" install -y \
  gcc \
  make \
  curl \
  git

if [[ "${SKIP_OPTIONAL}" != "true" ]]; then
  sudo "${PKG_MGR}" install -y jq unzip
fi

# --- verify ---
aiwg_verify_cmd "gcc" "gcc --version"
aiwg_verify_cmd "curl" "curl --version"
