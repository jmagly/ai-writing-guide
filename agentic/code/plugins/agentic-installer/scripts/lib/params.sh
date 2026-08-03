#!/usr/bin/env bash
# lib/params.sh — Parameter parsing and validation helpers
# Source this file; do not execute directly.
# Usage: source "$(dirname "$0")/lib/params.sh"

set -euo pipefail

# Require a param by env var name; exit 1 with message if unset or empty
aiwg_require_param() {
  local name="$1"
  local val="${!name:-}"
  if [[ -z "$val" ]]; then
    echo "ERROR: Required parameter ${name} is not set." >&2
    exit 1
  fi
}

# Expand ~ in a path param and export
aiwg_expand_path() {
  local name="$1"
  local val="${!name:-}"
  if [[ -z "$val" ]]; then return; fi
  # Expand leading ~/
  val="${val/#\~/$HOME}"
  export "${name}=${val}"
}

# Validate a bool param is 'true' or 'false'; default to $2 if unset
aiwg_bool_param() {
  local name="$1"
  local default="${2:-false}"
  local val="${!name:-$default}"
  case "$val" in
    true|false) export "${name}=${val}" ;;
    *)
      echo "ERROR: Parameter ${name} must be 'true' or 'false', got: ${val}" >&2
      exit 1
      ;;
  esac
}

# Validate a choice param against allowed values
aiwg_choice_param() {
  local name="$1"
  shift
  local val="${!name:-}"
  local allowed=("$@")
  for opt in "${allowed[@]}"; do
    [[ "$val" == "$opt" ]] && return 0
  done
  echo "ERROR: Parameter ${name}='${val}' is not one of: ${allowed[*]}" >&2
  exit 1
}
