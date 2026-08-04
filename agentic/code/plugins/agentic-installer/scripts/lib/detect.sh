#!/usr/bin/env bash
# lib/detect.sh — Platform and OS detection helpers
# Source this file; do not execute directly.
# Usage: source "$(dirname "$0")/lib/detect.sh"

set -euo pipefail

# Detect OS family: linux | macos | windows-wsl2 | unknown
aiwg_detect_os() {
  local os
  os="$(uname -s 2>/dev/null || echo unknown)"
  case "$os" in
    Linux*)
      # Check for WSL2
      if grep -qi microsoft /proc/version 2>/dev/null; then
        echo "windows-wsl2"
      else
        echo "linux"
      fi
      ;;
    Darwin*) echo "macos" ;;
    *)       echo "unknown" ;;
  esac
}

# Detect Linux distro: ubuntu | debian | fedora | rhel | rocky | arch | alpine | unknown
aiwg_detect_distro() {
  if [[ -f /etc/os-release ]]; then
    # shellcheck source=/dev/null
    source /etc/os-release
    case "${ID:-}" in
      ubuntu)  echo "ubuntu" ;;
      debian)  echo "debian" ;;
      fedora)  echo "fedora" ;;
      rhel)    echo "rhel" ;;
      rocky)   echo "rocky" ;;
      centos)  echo "centos" ;;
      arch)    echo "arch" ;;
      alpine)  echo "alpine" ;;
      *)       echo "${ID:-unknown}" ;;
    esac
  else
    echo "unknown"
  fi
}

# Detect CPU architecture: x86_64 | arm64 | unknown
aiwg_detect_arch() {
  local arch
  arch="$(uname -m 2>/dev/null || echo unknown)"
  case "$arch" in
    x86_64)          echo "x86_64" ;;
    aarch64 | arm64) echo "arm64" ;;
    *)               echo "$arch" ;;
  esac
}

# Check if a command exists; exit 0 = yes, exit 1 = no
aiwg_has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

# Check minimum version: aiwg_version_gte <actual> <minimum>
# Compares dot-separated version strings
aiwg_version_gte() {
  local actual="$1" minimum="$2"
  printf '%s\n%s\n' "$minimum" "$actual" | sort -V -C
}

# Print detected platform summary
aiwg_print_platform() {
  echo "OS:   $(aiwg_detect_os)"
  if [[ "$(aiwg_detect_os)" == "linux" ]]; then
    echo "Distro: $(aiwg_detect_distro)"
  fi
  echo "Arch: $(aiwg_detect_arch)"
}
