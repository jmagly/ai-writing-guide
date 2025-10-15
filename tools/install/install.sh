#!/usr/bin/env bash
set -euo pipefail

# AI Writing Guide Installer
# - Clones/updates the repository to an install location
# - Registers CLI aliases: aiwg-deploy-agents, aiwg-new

REPO_URL_DEFAULT="https://github.com/jmagly/ai-writing-guide.git"
BRANCH="main"
PREFIX_DEFAULT="$HOME/.local/share/ai-writing-guide"
ALIAS_BANNER="# --- ai-writing-guide aliases (begin) ---"
ALIAS_FOOTER="# --- ai-writing-guide aliases (end) ---"

usage() {
  cat <<USAGE
Usage: $0 [--repo <url>] [--branch <name>] [--prefix <dir>] [--alias-file <file>]
             [--auto-install-node]

Options:
  --repo <url>     Repository URL (default: env AIWG_REPO_URL or $REPO_URL_DEFAULT)
  --branch <name>  Branch to checkout (default: $BRANCH)
  --prefix <dir>   Install location (default: $PREFIX_DEFAULT)
  --alias-file <f> Shell RC/alias file to append (auto-detected if omitted)
  --auto-install-node  Attempt to install Node.js >= 18.20.8 if missing/older

This installs the framework to the prefix and registers aliases:
  aiwg-deploy-agents  -> copy shared agents into .claude/agents (current dir)
  aiwg-new            -> scaffold a new project with intake templates
USAGE
}

REPO_URL="${AIWG_REPO_URL:-$REPO_URL_DEFAULT}"
PREFIX="$PREFIX_DEFAULT"
ALIAS_FILE=""

AUTO_INSTALL_NODE="${AIWG_AUTO_INSTALL_NODE:-0}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO_URL="$2"; shift 2;;
    --branch) BRANCH="$2"; shift 2;;
    --prefix) PREFIX="$2"; shift 2;;
    --alias-file) ALIAS_FILE="$2"; shift 2;;
    --auto-install-node) AUTO_INSTALL_NODE="1"; shift 1;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown option: $1"; usage; exit 1;;
  esac
done

ensure_git() {
  if command -v git >/dev/null 2>&1; then
    return
  fi
  echo "git not found; attempting to install..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update && sudo apt-get install -y git
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y git
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y git
  elif command -v pacman >/dev/null 2>&1; then
    sudo pacman -Sy --noconfirm git
  elif command -v zypper >/dev/null 2>&1; then
    sudo zypper -n install git
  elif command -v brew >/dev/null 2>&1; then
    brew install git
  else
    echo "Could not detect a supported package manager. Please install git and re-run."
    exit 1
  fi
}

ensure_git

MIN_NODE_VERSION="18.20.8"

ver_ge() { # returns 0 if $1 >= $2
  [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n1)" = "$2" ]
}

install_node() {
  echo "Attempting to install Node.js (>= $MIN_NODE_VERSION)..."
  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs
  elif command -v dnf >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo -E bash - && sudo dnf install -y nodejs
  elif command -v yum >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo -E bash - && sudo yum install -y nodejs
  elif command -v pacman >/dev/null 2>&1; then
    sudo pacman -Sy --noconfirm nodejs npm
  elif command -v zypper >/dev/null 2>&1; then
    sudo zypper -n install nodejs npm || sudo zypper -n install nodejs18 npm18 || true
  elif command -v brew >/dev/null 2>&1; then
    brew install node@18 || brew install node
    brew link --overwrite node@18 || true
  else
    echo "No supported package manager detected for automatic Node.js install."
    return 1
  fi
}

ensure_node() {
  local have_node=0
  local node_ver=""
  if command -v node >/dev/null 2>&1; then
    have_node=1
    node_ver=$(node -v 2>/dev/null | sed 's/^v//')
  fi
  if [[ "$have_node" -eq 1 ]]; then
    if ver_ge "$node_ver" "$MIN_NODE_VERSION"; then
      return
    else
      echo "Detected Node.js v$node_ver (< $MIN_NODE_VERSION)."
      if [[ "$AUTO_INSTALL_NODE" == "1" ]]; then
        install_node || true
      else
        echo "Please upgrade to Node $MIN_NODE_VERSION (LTS: Hydrogen) or higher. Suggestions:"
        echo "  - NVM: curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \\
    . \"$HOME/.nvm/nvm.sh\" && nvm install v$MIN_NODE_VERSION && nvm use v$MIN_NODE_VERSION"
        echo "  - NodeSource (Debian/Ubuntu): curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
        return
      fi
    fi
  else
    echo "Node.js not found."
    if [[ "$AUTO_INSTALL_NODE" == "1" ]]; then
      install_node || true
    else
      echo "Please install Node $MIN_NODE_VERSION (LTS: Hydrogen) or higher. Suggestions:"
      echo "  - NVM: curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \\
    . \"$HOME/.nvm/nvm.sh\" && nvm install v$MIN_NODE_VERSION && nvm use v$MIN_NODE_VERSION"
      echo "  - NodeSource (Debian/Ubuntu): curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    fi
  fi
}

ensure_node

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
  echo "aiwg_update() { command -v git >/dev/null 2>&1 && git -C \"$PREFIX\" fetch --all -q && git -C \"$PREFIX\" pull --ff-only -q || true; }"
  echo "aiwg() { aiwg_update; local sub=\"\$1\"; shift || true; case \"\$sub\" in \\
    -new|--new) node \"$PREFIX/tools/install/new-project.mjs\" \"\$@\" ;; \\
    -deploy-agents|--deploy-agents) node \"$PREFIX/tools/agents/deploy-agents.mjs\" \"\$@\" ;; \\
    -prefill-cards|--prefill-cards) node \"$PREFIX/tools/cards/prefill-cards.mjs\" \"\$@\" ;; \\
    -h|--help|-help|help|\"\") echo 'Usage: aiwg -new [--no-agents|--provider <claude|openai>] | -deploy-agents [--provider <...> --force|--dry-run|--source <path>|--target <path>] | -prefill-cards --target <path> --team <team-profile.(yml|yaml|json)> [--write]' ;; \\
    *) echo 'Unknown command. Use: aiwg -new | -deploy-agents | -prefill-cards' ;; \\
  esac }"
  echo "aiwg-deploy-agents() { aiwg -deploy-agents \"\$@\"; }"
  echo "aiwg-new() { aiwg -new \"\$@\"; }"
  echo "$ALIAS_FOOTER"
} >> "$ALIAS_FILE"

echo "Installed to: $PREFIX"
echo "Aliases added to: $ALIAS_FILE"
echo "Run 'source $ALIAS_FILE' or open a new shell to use: aiwg-deploy-agents, aiwg-new"
