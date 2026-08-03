#!/usr/bin/env bash
# lib/verify.sh — Post-step verification helpers
# Source this file; do not execute directly.
# Usage: source "$(dirname "$0")/lib/verify.sh"

set -euo pipefail

# Run a verification command; exit 0 = pass, non-zero = fail with output
aiwg_verify_cmd() {
  local label="$1"
  local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "  ✓ ${label}"
  else
    echo "  ✗ ${label}: FAILED" >&2
    echo "    Command: ${cmd}" >&2
    return 1
  fi
}

# Verify a file or directory exists
aiwg_verify_path() {
  local path="$1"
  local type="${2:-any}"  # any | file | dir
  case "$type" in
    file) [[ -f "$path" ]] || { echo "  ✗ Expected file not found: ${path}" >&2; return 1; } ;;
    dir)  [[ -d "$path" ]] || { echo "  ✗ Expected directory not found: ${path}" >&2; return 1; } ;;
    *)    [[ -e "$path" ]] || { echo "  ✗ Expected path not found: ${path}" >&2; return 1; } ;;
  esac
  echo "  ✓ ${path}"
}

# Verify a command is on PATH and optionally meets a minimum version
aiwg_verify_cmd_version() {
  local cmd="$1"
  local version_flag="${2:---version}"
  local min_version="${3:-}"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "  ✗ Command not found: ${cmd}" >&2
    return 1
  fi
  if [[ -n "$min_version" ]]; then
    local actual
    actual="$("$cmd" "$version_flag" 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)"
    if ! printf '%s\n%s\n' "$min_version" "$actual" | sort -V -C; then
      echo "  ✗ ${cmd} version ${actual} < required ${min_version}" >&2
      return 1
    fi
    echo "  ✓ ${cmd} ${actual} (>= ${min_version})"
  else
    echo "  ✓ ${cmd} found"
  fi
}
