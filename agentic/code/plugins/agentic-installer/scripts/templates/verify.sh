#!/usr/bin/env bash
# templates/verify.sh — Post-installation verification
# Platform: linux, macos, wsl2
# Params: INSTALL_DIR (required), CMD_NAME (required — primary binary to check)
set -euo pipefail
source "$(dirname "$0")/../lib/detect.sh"
source "$(dirname "$0")/../lib/params.sh"
source "$(dirname "$0")/../lib/verify.sh"

# --- param validation ---
aiwg_require_param INSTALL_DIR
aiwg_require_param CMD_NAME
aiwg_expand_path INSTALL_DIR

echo "Verifying installation..."

# --- verify ---
aiwg_verify_path "${INSTALL_DIR}" dir
aiwg_verify_cmd "${CMD_NAME}" "${CMD_NAME} --version 2>/dev/null || ${CMD_NAME} --help >/dev/null 2>&1"

echo "Installation verified successfully."
