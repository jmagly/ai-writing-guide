#!/usr/bin/env bash
# templates/dev/apply-inotify.sh — Increase inotify watches for file watchers
# Platform: linux
# Required by: webpack, jest, vite, nodemon, and other file-watch-based dev tools
# Requires re-login (or at minimum a new shell) to observe updated limits
set -euo pipefail
source "$(dirname "$0")/../../lib/detect.sh"
source "$(dirname "$0")/../../lib/params.sh"
source "$(dirname "$0")/../../lib/verify.sh"

REQUIRED_WATCHES="${INOTIFY_WATCHES:-524288}"
SYSCTL_CONF="/etc/sysctl.d/99-dev.conf"

# --- check ---
current=$(sysctl -n fs.inotify.max_user_watches 2>/dev/null || echo 0)
if [ "${current}" -ge "${REQUIRED_WATCHES}" ]; then
  echo "fs.inotify.max_user_watches=${current} already meets required minimum (${REQUIRED_WATCHES}). No changes needed."
  exit 0
fi

# --- apply ---
echo "Setting fs.inotify.max_user_watches=${REQUIRED_WATCHES}..."

if [ -f "${SYSCTL_CONF}" ] && grep -q "fs.inotify.max_user_watches" "${SYSCTL_CONF}"; then
  sudo sed -i "s/fs.inotify.max_user_watches=.*/fs.inotify.max_user_watches=${REQUIRED_WATCHES}/" "${SYSCTL_CONF}"
else
  echo "fs.inotify.max_user_watches=${REQUIRED_WATCHES}" | sudo tee -a "${SYSCTL_CONF}" > /dev/null
fi

sudo sysctl -p "${SYSCTL_CONF}"

# verify
new=$(sysctl -n fs.inotify.max_user_watches)
if [ "${new}" -ge "${REQUIRED_WATCHES}" ]; then
  echo "inotify watches set to ${new}."
else
  echo "ERROR: Expected ${REQUIRED_WATCHES}, got ${new}." >&2
  exit 1
fi
