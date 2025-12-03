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
             [--auto-install-node] [--force-reinstall]

Options:
  --repo <url>     Repository URL (default: env AIWG_REPO_URL or $REPO_URL_DEFAULT)
  --branch <name>  Branch to checkout (default: $BRANCH)
  --prefix <dir>   Install location (default: $PREFIX_DEFAULT)
  --alias-file <f> Shell RC/alias file to append (auto-detected if omitted)
  --auto-install-node  Attempt to install Node.js >= 18.20.8 if missing/older
  --force-reinstall    Delete existing installation and reinstall fresh

This installs the framework to the prefix and registers the 'aiwg' CLI with commands:
  aiwg -deploy-agents  -> deploy agents (use --platform warp for Warp Terminal)
  aiwg -deploy-commands -> deploy commands (use --platform warp for Warp Terminal)
  aiwg -new            -> scaffold new project with SDLC templates
  aiwg -prefill-cards  -> prefill SDLC card metadata from team profile
  aiwg -contribute-start -> start AIWG contribution workflow
  aiwg -version        -> show installed version (commit hash)
  aiwg -update         -> manually update installation
  aiwg -help           -> show command help

Deployment modes (--mode):
  general   -> Writing quality agents only (3 agents)
  sdlc      -> SDLC Complete framework only (54 agents)
  marketing -> Media/Marketing Kit only (37 agents)
  both      -> General + SDLC (legacy compatibility)
  all       -> All frameworks (default)

Note: aiwg automatically updates on every command invocation.
USAGE
}

REPO_URL="${AIWG_REPO_URL:-$REPO_URL_DEFAULT}"
PREFIX="$PREFIX_DEFAULT"
ALIAS_FILE=""
FORCE_REINSTALL=0

AUTO_INSTALL_NODE="${AIWG_AUTO_INSTALL_NODE:-0}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO_URL="$2"; shift 2;;
    --branch) BRANCH="$2"; shift 2;;
    --prefix) PREFIX="$2"; shift 2;;
    --alias-file) ALIAS_FILE="$2"; shift 2;;
    --auto-install-node) AUTO_INSTALL_NODE="1"; shift 1;;
    --force-reinstall) FORCE_REINSTALL=1; shift 1;;
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

# Handle force reinstall
if [[ "$FORCE_REINSTALL" == "1" ]] && [[ -d "$PREFIX" ]]; then
  echo "Force reinstall requested. Removing existing installation at $PREFIX"
  rm -rf "$PREFIX"
fi

# Create parent directory
mkdir -p "$(dirname "$PREFIX")"

# Install or update
if [[ -d "$PREFIX" ]]; then
  if [[ -d "$PREFIX/.git" ]]; then
    echo "Updating existing install at $PREFIX"

    # Check for git issues and recover
    if ! git -C "$PREFIX" status >/dev/null 2>&1; then
      echo "Git repository appears corrupted. Removing and reinstalling..."
      rm -rf "$PREFIX"
      git clone --branch "$BRANCH" "$REPO_URL" "$PREFIX"
    else
      # Try to update, but recover gracefully if it fails
      if ! git -C "$PREFIX" fetch --all 2>/dev/null; then
        echo "Fetch failed. Removing and reinstalling..."
        rm -rf "$PREFIX"
        git clone --branch "$BRANCH" "$REPO_URL" "$PREFIX"
      elif ! git -C "$PREFIX" checkout "$BRANCH" 2>/dev/null; then
        echo "Checkout failed. Removing and reinstalling..."
        rm -rf "$PREFIX"
        git clone --branch "$BRANCH" "$REPO_URL" "$PREFIX"
      elif ! git -C "$PREFIX" pull --ff-only 2>/dev/null; then
        echo "Pull failed (likely dirty state or conflicts). Removing and reinstalling..."
        rm -rf "$PREFIX"
        git clone --branch "$BRANCH" "$REPO_URL" "$PREFIX"
      else
        echo "Update successful!"
      fi
    fi
  else
    # Directory exists but not a git repo - replace it
    echo "Existing directory is not a git repository. Removing and reinstalling..."
    rm -rf "$PREFIX"
    git clone --branch "$BRANCH" "$REPO_URL" "$PREFIX"
  fi
else
  echo "Installing aiwg to $PREFIX"
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
  echo "aiwg_version() { if [[ -d \"$PREFIX/.git\" ]]; then echo \"aiwg version: \$(git -C \"$PREFIX\" rev-parse --short HEAD) (branch: \$(git -C \"$PREFIX\" branch --show-current))\"; echo \"Installed at: $PREFIX\"; else echo \"aiwg not installed via git\"; fi; }"
  echo "aiwg_reinstall() { echo 'Reinstalling aiwg from scratch...'; curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash -s -- --force-reinstall; echo 'Reinstall complete. Please restart your shell or run: source ~/.bash_aliases (or ~/.zshrc)'; }"
  echo "aiwg() { aiwg_update; local sub=\"\$1\"; shift || true; case \"\$sub\" in \\
    -new|--new) node \"$PREFIX/tools/install/new-project.mjs\" \"\$@\" ;; \\
    -deploy-agents|--deploy-agents) \\
      if echo \"\$@\" | grep -q \"\\-\\-platform[[:space:]]*warp\"; then \\
        node \"$PREFIX/tools/warp/setup-warp.mjs\" \"\$@\"; \\
      else \\
        node \"$PREFIX/tools/agents/deploy-agents.mjs\" \"\$@\"; \\
      fi ;; \\
    -deploy-commands|--deploy-commands) \\
      if echo \"\$@\" | grep -q \"\\-\\-platform[[:space:]]*warp\"; then \\
        node \"$PREFIX/tools/warp/setup-warp.mjs\" \"\$@\"; \\
      else \\
        node \"$PREFIX/tools/agents/deploy-agents.mjs\" --deploy-commands \"\$@\"; \\
      fi ;; \\
    -prefill-cards|--prefill-cards) node \"$PREFIX/tools/cards/prefill-cards.mjs\" \"\$@\" ;; \\
    -contribute-start|--contribute-start) node \"$PREFIX/tools/contrib/start-contribution.mjs\" \"\$@\" ;; \\
    -install-plugin|--install-plugin) node \"$PREFIX/tools/plugin/plugin-installer-cli.mjs\" \"\$@\" ;; \\
    -uninstall-plugin|--uninstall-plugin) node \"$PREFIX/tools/plugin/plugin-uninstaller-cli.mjs\" \"\$@\" ;; \\
    -plugin-status|--plugin-status) node \"$PREFIX/tools/plugin/plugin-status-cli.mjs\" \"\$@\" ;; \\
    -migrate-workspace|--migrate-workspace) node \"$PREFIX/tools/workspace/migration-tool.mjs\" \"\$@\" ;; \\
    -validate-metadata|--validate-metadata) node \"$PREFIX/tools/cli/validate-metadata.mjs\" \"\$@\" ;; \\
    -version|--version|version) aiwg_version ;; \\
    -update|--update|update) echo 'Updating ai-writing-guide...'; git -C \"$PREFIX\" fetch --all && git -C \"$PREFIX\" pull --ff-only && echo 'Update complete. Current version:' && aiwg_version ;; \\
    -reinstall|--reinstall|reinstall) aiwg_reinstall ;; \\
    -h|--help|-help|help|\"\") echo 'Usage: aiwg <command> [options]'; echo ''; echo 'Commands:'; echo '  -new [--no-agents|--provider <claude|openai>|--platform <warp>]'; echo '       Create new project with SDLC templates'; echo '  -deploy-agents [--provider <...>|--platform <warp>] [--force|--dry-run]'; echo '       Deploy agent definitions'; echo '  -deploy-commands [--provider <...>|--platform <warp>] [--force|--dry-run]'; echo '       Deploy slash commands'; echo '  -install-plugin <plugin-id> [--type <type>] [--parent <id>] [--dry-run]'; echo '       Install plugin (framework, add-on, or extension)'; echo '  -uninstall-plugin <plugin-id> [--force] [--keep-data]'; echo '       Uninstall plugin'; echo '  -plugin-status [plugin-id] [--type <type>] [--health] [--json]'; echo '       Show plugin status'; echo '  -migrate-workspace [--dry-run]'; echo '       Migrate legacy .aiwg/ to framework-scoped structure'; echo '  -validate-metadata [path]'; echo '       Validate plugin/agent metadata'; echo '  -prefill-cards --target <path> --team <team.yml> [--write]'; echo '       Prefill SDLC card metadata'; echo '  -contribute-start <feature-name>'; echo '       Start AIWG contribution workflow'; echo '  -version|-update|-reinstall|-help'; echo '       Version, update, reinstall, or help'; echo ''; echo 'Note: aiwg automatically updates on every command run.' ;; \\
    *) echo 'Unknown command. Use: aiwg -help for usage information' ;; \\
  esac }"
  echo "aiwg-deploy-agents() { aiwg -deploy-agents \"\$@\"; }"
  echo "aiwg-deploy-commands() { aiwg -deploy-commands \"\$@\"; }"
  echo "aiwg-new() { aiwg -new \"\$@\"; }"
  echo "aiwg-contribute-start() { aiwg -contribute-start \"\$@\"; }"
  echo "$ALIAS_FOOTER"
} >> "$ALIAS_FILE"

echo "Installed to: $PREFIX"
echo "Aliases added to: $ALIAS_FILE"
echo ""
echo "Run 'source $ALIAS_FILE' or open a new shell to activate the 'aiwg' CLI."
echo ""
echo "Available commands:"
echo "  aiwg -version           Show current version"
echo "  aiwg -update            Update installation (graceful)"
echo "  aiwg -reinstall         Force fresh reinstall"
echo "  aiwg -deploy-agents     Deploy agents (use --platform warp for Warp Terminal)"
echo "  aiwg -deploy-commands   Deploy commands (use --platform warp for Warp Terminal)"
echo "  aiwg -new               Create new project"
echo "  aiwg -prefill-cards     Prefill card metadata"
echo "  aiwg -contribute-start  Start AIWG contribution"
echo "  aiwg -help              Show detailed help"
echo ""
echo "Platform options:"
echo "  --platform warp         Deploy to Warp Terminal (WARP.md)"
echo "  --provider claude       Deploy to Claude Code (default)"
echo ""
echo "Note: aiwg automatically updates on every command run."
echo "For corrupted installs, use: aiwg -reinstall"
