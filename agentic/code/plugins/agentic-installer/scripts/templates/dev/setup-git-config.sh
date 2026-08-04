#!/usr/bin/env bash
# templates/dev/setup-git-config.sh — Configure git identity, signing, and line endings
# Platform: linux, macos
# Params: GIT_USER_NAME (interactive_required), GIT_USER_EMAIL (interactive_required),
#         GIT_GPG_SIGN (default: false), GIT_GPG_KEY_ID (interactive_required when GPG_SIGN=true)
set -euo pipefail
source "$(dirname "$0")/../../lib/detect.sh"
source "$(dirname "$0")/../../lib/params.sh"
source "$(dirname "$0")/../../lib/verify.sh"

aiwg_require_param GIT_USER_NAME
aiwg_require_param GIT_USER_EMAIL

GIT_GPG_SIGN="${GIT_GPG_SIGN:-false}"
OS="$(uname -s)"

echo "Configuring git identity..."

git config --global user.name "${GIT_USER_NAME}"
git config --global user.email "${GIT_USER_EMAIL}"

# --- line endings ---
case "${OS}" in
  Linux|Darwin)
    git config --global core.autocrlf input
    ;;
  MINGW*|CYGWIN*|MSYS*)
    git config --global core.autocrlf true
    ;;
esac

# --- default branch ---
git config --global init.defaultBranch main

# --- GPG signing ---
if [[ "${GIT_GPG_SIGN}" == "true" ]]; then
  if [[ -z "${GIT_GPG_KEY_ID:-}" ]]; then
    echo "ERROR: GIT_GPG_KEY_ID is required when GIT_GPG_SIGN=true" >&2
    echo "List your GPG keys with: gpg --list-secret-keys --keyid-format=long" >&2
    exit 1
  fi
  git config --global user.signingkey "${GIT_GPG_KEY_ID}"
  git config --global commit.gpgsign true
  echo "  GPG signing enabled with key ${GIT_GPG_KEY_ID}"
fi

echo ""
echo "Git configuration applied:"
echo "  Name:    $(git config --global user.name)"
echo "  Email:   $(git config --global user.email)"
echo "  CRLF:    $(git config --global core.autocrlf)"
if [[ "${GIT_GPG_SIGN}" == "true" ]]; then
  echo "  GPG:     ${GIT_GPG_KEY_ID} (signing enabled)"
fi
