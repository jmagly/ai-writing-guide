#!/usr/bin/env bash
# templates/dev/apply-docker-group.sh — Add current user to docker group
# Platform: linux
# Effect: allows running docker without sudo
# Requires re-login to take effect
set -euo pipefail
source "$(dirname "$0")/../../lib/detect.sh"
source "$(dirname "$0")/../../lib/params.sh"
source "$(dirname "$0")/../../lib/verify.sh"

# --- check ---
if id -nG | grep -qw docker; then
  echo "User ${USER} is already in the docker group. No changes needed."
  exit 0
fi

# --- apply ---
echo "Adding ${USER} to the docker group..."
sudo usermod -aG docker "${USER}"

echo ""
echo "NOTICE: Group membership change requires re-login to take effect."
echo "After logging out and back in, verify with: id -nG | grep docker"
echo ""
echo "Until then, use 'newgrp docker' in the current shell to activate the group"
echo "without a full re-login: newgrp docker"
