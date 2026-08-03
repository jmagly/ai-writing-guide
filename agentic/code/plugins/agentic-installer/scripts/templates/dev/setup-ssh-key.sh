#!/usr/bin/env bash
# templates/dev/setup-ssh-key.sh — Generate ED25519 SSH key and configure ssh-agent
# Platform: linux, macos
# Params: SSH_EMAIL (interactive_required), SSH_KEY_PATH (default: ~/.ssh/id_ed25519)
set -euo pipefail
source "$(dirname "$0")/../../lib/detect.sh"
source "$(dirname "$0")/../../lib/params.sh"
source "$(dirname "$0")/../../lib/verify.sh"

aiwg_require_param SSH_EMAIL

SSH_KEY_PATH="${SSH_KEY_PATH:-${HOME}/.ssh/id_ed25519}"
aiwg_expand_path SSH_KEY_PATH
SSH_DIR="$(dirname "${SSH_KEY_PATH}")"

# --- check if key already exists ---
if [[ -f "${SSH_KEY_PATH}" ]]; then
  echo "SSH key already exists at ${SSH_KEY_PATH}. Skipping key generation."
  echo "Public key:"
  cat "${SSH_KEY_PATH}.pub"
  exit 0
fi

# --- create .ssh dir with correct permissions ---
mkdir -p "${SSH_DIR}"
chmod 700 "${SSH_DIR}"

# --- generate key ---
echo "Generating ED25519 SSH key for ${SSH_EMAIL}..."
ssh-keygen -t ed25519 -C "${SSH_EMAIL}" -f "${SSH_KEY_PATH}" -N ""

chmod 600 "${SSH_KEY_PATH}"
chmod 644 "${SSH_KEY_PATH}.pub"

# --- add to ssh-agent ---
echo "Adding key to ssh-agent..."

OS="$(uname -s)"
if [[ "${OS}" == "Darwin" ]]; then
  # macOS: use Keychain integration
  ssh-add --apple-use-keychain "${SSH_KEY_PATH}" 2>/dev/null || ssh-add "${SSH_KEY_PATH}"
else
  # Linux: start agent if not running, then add key
  if [[ -z "${SSH_AUTH_SOCK:-}" ]]; then
    eval "$(ssh-agent -s)"
  fi
  ssh-add "${SSH_KEY_PATH}"
fi

echo ""
echo "SSH key generated. Add the following public key to your Git host:"
echo ""
cat "${SSH_KEY_PATH}.pub"
echo ""
echo "GitHub:  https://github.com/settings/ssh/new"
echo "Gitea:   <your-gitea-instance>/user/settings/keys"
