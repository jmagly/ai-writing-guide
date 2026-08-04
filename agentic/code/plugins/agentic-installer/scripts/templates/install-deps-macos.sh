#!/usr/bin/env bash
# templates/install-deps-macos.sh — Install dependencies via Homebrew
# Platform: macos
# Params: SKIP_OPTIONAL (default: false)
set -euo pipefail
source "$(dirname "$0")/../lib/detect.sh"
source "$(dirname "$0")/../lib/params.sh"
source "$(dirname "$0")/../lib/verify.sh"

# --- param validation ---
aiwg_bool_param SKIP_OPTIONAL false

# --- prerequisite check ---
aiwg_has_cmd brew || {
  echo "ERROR: Homebrew not found. Install from https://brew.sh and retry."
  exit 1
}

# --- main ---
echo "Updating Homebrew..."
brew update --quiet

echo "Installing required packages..."
brew install git curl

if [[ "${SKIP_OPTIONAL}" != "true" ]]; then
  brew install jq
fi

# --- verify ---
aiwg_verify_cmd "git" "git --version"
aiwg_verify_cmd "curl" "curl --version"
