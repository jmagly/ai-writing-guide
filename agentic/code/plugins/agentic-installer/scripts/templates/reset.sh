#!/usr/bin/env bash
# templates/reset.sh — Recovery reset script (removes and re-clones)
# Platform: linux, macos, wsl2
# Params: INSTALL_DIR (required), REPO_URL (required), BRANCH (default: main)
# WARNING: Destructive. Invoked only from recovery procedures after verification failure.
set -euo pipefail
source "$(dirname "$0")/../lib/detect.sh"
source "$(dirname "$0")/../lib/params.sh"

# --- param validation ---
aiwg_require_param INSTALL_DIR
aiwg_require_param REPO_URL
aiwg_expand_path INSTALL_DIR
BRANCH="${BRANCH:-main}"

echo "Recovery: removing ${INSTALL_DIR} and re-cloning..."
rm -rf "${INSTALL_DIR}"
git clone --branch "${BRANCH}" --depth 1 "${REPO_URL}" "${INSTALL_DIR}"
echo "Re-clone complete. Re-run the setup to continue."
