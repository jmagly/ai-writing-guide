#!/usr/bin/env bash
# templates/clone.sh — Clone repository to INSTALL_DIR
# Platform: linux, macos, wsl2
# Params: REPO_URL (required), INSTALL_DIR (required), BRANCH (default: main)
set -euo pipefail
source "$(dirname "$0")/../lib/detect.sh"
source "$(dirname "$0")/../lib/params.sh"
source "$(dirname "$0")/../lib/verify.sh"

# --- param validation ---
aiwg_require_param REPO_URL
aiwg_require_param INSTALL_DIR
aiwg_expand_path INSTALL_DIR
BRANCH="${BRANCH:-main}"

# --- prerequisite check ---
aiwg_has_cmd git || { echo "ERROR: git not found. Install git and retry."; exit 1; }

# --- main ---
if [[ -d "${INSTALL_DIR}/.git" ]]; then
  echo "Repository already cloned at ${INSTALL_DIR}. Pulling latest..."
  git -C "${INSTALL_DIR}" fetch origin
  git -C "${INSTALL_DIR}" checkout "${BRANCH}"
  git -C "${INSTALL_DIR}" pull --ff-only
else
  echo "Cloning ${REPO_URL} → ${INSTALL_DIR} (branch: ${BRANCH})..."
  git clone --branch "${BRANCH}" --depth 1 "${REPO_URL}" "${INSTALL_DIR}"
fi

# --- verify ---
aiwg_verify_path "${INSTALL_DIR}/.git" dir
