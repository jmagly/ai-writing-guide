#!/usr/bin/env bash
# templates/dev/apply-vm-mapcount.sh — Set vm.max_map_count for Elasticsearch/Weaviate/OpenSearch
# Platform: linux
# Required by: Elasticsearch, Weaviate, OpenSearch (minimum 262144)
set -euo pipefail
source "$(dirname "$0")/../../lib/detect.sh"
source "$(dirname "$0")/../../lib/params.sh"
source "$(dirname "$0")/../../lib/verify.sh"

REQUIRED_MAP_COUNT="${VM_MAX_MAP_COUNT:-262144}"
SYSCTL_CONF="/etc/sysctl.d/99-dev.conf"

# --- check ---
current=$(sysctl -n vm.max_map_count 2>/dev/null || echo 0)
if [ "${current}" -ge "${REQUIRED_MAP_COUNT}" ]; then
  echo "vm.max_map_count=${current} already meets required minimum (${REQUIRED_MAP_COUNT}). No changes needed."
  exit 0
fi

# --- apply ---
echo "Setting vm.max_map_count=${REQUIRED_MAP_COUNT}..."

if [ -f "${SYSCTL_CONF}" ] && grep -q "vm.max_map_count" "${SYSCTL_CONF}"; then
  sudo sed -i "s/vm.max_map_count=.*/vm.max_map_count=${REQUIRED_MAP_COUNT}/" "${SYSCTL_CONF}"
else
  echo "vm.max_map_count=${REQUIRED_MAP_COUNT}" | sudo tee -a "${SYSCTL_CONF}" > /dev/null
fi

sudo sysctl -p "${SYSCTL_CONF}"

# verify
new=$(sysctl -n vm.max_map_count)
if [ "${new}" -ge "${REQUIRED_MAP_COUNT}" ]; then
  echo "vm.max_map_count set to ${new}."
else
  echo "ERROR: Expected ${REQUIRED_MAP_COUNT}, got ${new}." >&2
  exit 1
fi
