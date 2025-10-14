#!/usr/bin/env bash
set -euo pipefail

# AI Writing Guide Installer
# - Clones/updates the repository to an install location
# - Registers CLI aliases: aiwg-deploy-agents, aiwg-new

REPO_URL_DEFAULT="https://github.com/manitcor/ai-writing-guide.git"
BRANCH="main"
PREFIX_DEFAULT="$HOME/.local/share/ai-writing-guide"
ALIAS_BANNER="# --- ai-writing-guide aliases (begin) ---"
ALIAS_FOOTER="# --- ai-writing-guide aliases (end) ---"

usage() {
  cat <<USAGE
Usage: $0 [--repo <url>] [--branch <name>] [--prefix <dir>] [--alias-file <file>]

Options:
  --repo <url>     Repository URL (default: env AIWG_REPO_URL or $REPO_URL_DEFAULT)
  --branch <name>  Branch to checkout (default: $BRANCH)
  --prefix <dir>   Install location (default: $PREFIX_DEFAULT)
  --alias-file <f> Shell RC/alias file to append (auto-detected if omitted)

This installs the framework to the prefix and registers aliases:
  aiwg-deploy-agents  -> copy shared agents into .claude/agents (current dir)
  aiwg-new            -> scaffold a new project with intake templates
USAGE
}

REPO_URL="${AIWG_REPO_URL:-$REPO_URL_DEFAULT}"
PREFIX="$PREFIX_DEFAULT"
ALIAS_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO_URL="$2"; shift 2;;
    --branch) BRANCH="$2"; shift 2;;
    --prefix) PREFIX="$2"; shift 2;;
    --alias-file) ALIAS_FILE="$2"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown option: $1"; usage; exit 1;;
  esac
done

mkdir -p "$PREFIX"
if [[ -d "$PREFIX/.git" ]]; then
  echo "Updating existing install at $PREFIX"
  git -C "$PREFIX" fetch --all
  git -C "$PREFIX" checkout "$BRANCH"
  git -C "$PREFIX" pull --ff-only
else
  echo "Cloning $REPO_URL to $PREFIX"
  git clone --branch "$BRANCH" "$REPO_URL" "$PREFIX"
fi

# Determine alias file
detect_alias_file() {
  local shell_name="$(basename "${SHELL:-bash}")"
  if [[ -n "$ALIAS_FILE" ]]; then
    echo "$ALIAS_FILE"
    return
  fi
  if [[ "$shell_name" == "zsh" ]]; then
    echo "$HOME/.zshrc"
  else
    # Bash default sources ~/.bash_aliases if present
    echo "$HOME/.bash_aliases"
  fi
}

ALIAS_FILE="$(detect_alias_file)"
touch "$ALIAS_FILE"

DEPLOY_CMD="node $PREFIX/tools/agents/deploy-agents.mjs"
NEW_CMD="node $PREFIX/tools/install/new-project.mjs"

# Remove previous alias block if present
if grep -q "$ALIAS_BANNER" "$ALIAS_FILE"; then
  echo "Refreshing aliases in $ALIAS_FILE"
  awk -v start="$ALIAS_BANNER" -v end="$ALIAS_FOOTER" '
    $0==start {skip=1} !skip {print} $0==end {skip=0}
  ' "$ALIAS_FILE" > "$ALIAS_FILE.tmp"
  mv "$ALIAS_FILE.tmp" "$ALIAS_FILE"
fi

{
  echo "$ALIAS_BANNER"
  echo "alias aiwg-deploy-agents=\"$DEPLOY_CMD\""
  echo "alias aiwg-new=\"$NEW_CMD\""
  echo "$ALIAS_FOOTER"
} >> "$ALIAS_FILE"

echo "Installed to: $PREFIX"
echo "Aliases added to: $ALIAS_FILE"
echo "Run 'source $ALIAS_FILE' or open a new shell to use: aiwg-deploy-agents, aiwg-new"

