#!/usr/bin/env bash
# templates/dev/install-ide-extensions.sh — Install IDE extensions for VS Code and JetBrains
# Platform: linux, macos
# Params: IDE (choice: vscode/jetbrains/none, interactive_required)
# Customize: add project-specific extension IDs to the lists below
set -euo pipefail
source "$(dirname "$0")/../../lib/detect.sh"
source "$(dirname "$0")/../../lib/params.sh"
source "$(dirname "$0")/../../lib/verify.sh"

aiwg_require_param IDE

# --- VS Code extension IDs — customize for your project ---
VSCODE_EXTENSIONS=(
  # "esbenp.prettier-vscode"
  # "dbaeumer.vscode-eslint"
  # "eamodio.gitlens"
  # "ms-azuretools.vscode-docker"
  # "golang.go"
  # "ms-python.python"
)

# --- JetBrains plugin IDs — customize for your project ---
# Find IDs at: https://plugins.jetbrains.com
JETBRAINS_PLUGINS=(
  # "com.intellij.ideolog"
  # "org.jetbrains.plugins.go"
)

case "${IDE}" in
  vscode)
    if ! command -v code >/dev/null 2>&1; then
      echo "ERROR: VS Code CLI ('code') not found in PATH." >&2
      echo "Install VS Code: https://code.visualstudio.com/download" >&2
      echo "On macOS, open VS Code and run: Shell Command: Install 'code' command in PATH" >&2
      exit 1
    fi

    if [ ${#VSCODE_EXTENSIONS[@]} -eq 0 ]; then
      echo "No VS Code extensions configured in this template. Edit VSCODE_EXTENSIONS list."
      exit 0
    fi

    echo "Installing VS Code extensions..."
    for ext in "${VSCODE_EXTENSIONS[@]}"; do
      echo "  Installing: ${ext}"
      code --install-extension "${ext}" --force
    done
    echo "VS Code extensions installed."
    ;;

  jetbrains)
    echo "JetBrains plugin installation requires the IDE to be running."
    echo ""
    if [ ${#JETBRAINS_PLUGINS[@]} -eq 0 ]; then
      echo "No JetBrains plugins configured in this template. Edit JETBRAINS_PLUGINS list."
    else
      echo "Install these plugins via Settings > Plugins > Marketplace:"
      for plugin in "${JETBRAINS_PLUGINS[@]}"; do
        echo "  - ${plugin}"
      done
    fi
    ;;

  none)
    echo "IDE set to 'none'. Skipping extension installation."
    ;;

  *)
    echo "ERROR: Unknown IDE '${IDE}'. Valid choices: vscode, jetbrains, none" >&2
    exit 1
    ;;
esac
