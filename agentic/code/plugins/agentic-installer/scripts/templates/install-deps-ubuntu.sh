#!/usr/bin/env bash
# templates/install-deps-ubuntu.sh — Install system dependencies
# Platform: linux/ubuntu, linux/debian
# Params: SKIP_OPTIONAL (default: false)
set -euo pipefail
source "$(dirname "$0")/../lib/detect.sh"
source "$(dirname "$0")/../lib/params.sh"
source "$(dirname "$0")/../lib/verify.sh"

# --- param validation ---
aiwg_bool_param SKIP_OPTIONAL false

# --- prerequisite check ---
aiwg_has_cmd apt-get || { echo "ERROR: apt-get not found. This script requires Ubuntu or Debian."; exit 1; }

# --- main ---
echo "Updating package index..."
sudo apt-get update -qq

echo "Installing required packages..."
sudo apt-get install -y --no-install-recommends \
  build-essential \
  curl \
  git

if [[ "${SKIP_OPTIONAL}" != "true" ]]; then
  echo "Installing optional packages..."
  sudo apt-get install -y --no-install-recommends \
    jq \
    unzip
fi

# --- verify ---
aiwg_verify_cmd "gcc" "gcc --version"
aiwg_verify_cmd "curl" "curl --version"
