#!/usr/bin/env bash
# templates/hub-chain.sh — Hub repo orchestrator
# Platform: linux, macos, wsl2
# For repos that chain multiple sub-project installers.
# Each sub-project must have its own setup.manifest.yaml.
# Params: HUB_DIR (required — root of hub repo)
set -euo pipefail
source "$(dirname "$0")/../lib/detect.sh"
source "$(dirname "$0")/../lib/params.sh"
source "$(dirname "$0")/../lib/verify.sh"

# --- param validation ---
aiwg_require_param HUB_DIR
aiwg_expand_path HUB_DIR

# --- prerequisite check ---
aiwg_has_cmd aiwg || {
  echo "ERROR: aiwg CLI not found. Install with: npm install -g aiwg"
  exit 1
}

# --- main ---
# This template is typically invoked indirectly via 'chain' steps in the hub manifest.
# Each chain step calls: aiwg setup-run --manifest <sub-project>/setup.manifest.yaml
# This script is a reference for manual hub orchestration.

echo "Hub installer: ${HUB_DIR}"
echo "Sub-projects:"

for manifest_path in "${HUB_DIR}"/*/setup.manifest.yaml; do
  if [[ -f "${manifest_path}" ]]; then
    subproject="$(basename "$(dirname "${manifest_path}")")"
    echo "  → ${subproject}"
    aiwg setup-run --manifest "${manifest_path}"
  fi
done

echo "Hub installation complete."
