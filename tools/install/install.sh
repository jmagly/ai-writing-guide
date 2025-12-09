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

  Framework Management:
    aiwg use <framework>   -> Install and deploy a framework (sdlc, marketing, writing)
    aiwg list              -> List installed frameworks
    aiwg remove <id>       -> Remove a framework

  Project Setup:
    aiwg -new              -> Scaffold new project with templates

  Utilities:
    aiwg -prefill-cards    -> Prefill SDLC card metadata from team profile
    aiwg -contribute-start -> Start AIWG contribution workflow

  Maintenance:
    aiwg -version          -> Show installed version
    aiwg -update           -> Update installation
    aiwg -reinstall        -> Force fresh reinstall
    aiwg -help             -> Show command help

  Legacy (deprecated):
    aiwg -deploy-agents    -> Use 'aiwg use <framework>' instead
    aiwg -deploy-commands  -> Use 'aiwg use <framework>' instead

Frameworks:
  sdlc       -> SDLC Complete (54 agents, 42 commands, 10 skills)
  marketing  -> Media/Marketing Kit (37 agents, 23 commands, 8 skills)
  writing    -> Writing Quality + Voice Framework (3 agents, 5 skills)

Note: 'aiwg use' automatically installs aiwg-utils addon (6 skills) with --no-utils to skip.
Skills include: voice-apply, voice-create, voice-blend, voice-analyze, project-awareness, and more.

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
    use) \\
      local fw=\"\$1\"; shift || true; \\
      local skip_utils=0; \\
      for arg in \"\$@\"; do [[ \"\$arg\" == \"--no-utils\" ]] && skip_utils=1; done; \\
      case \"\$fw\" in \\
        sdlc) node \"$PREFIX/tools/agents/deploy-agents.mjs\" --mode sdlc --deploy-commands --deploy-skills \"\$@\" ;; \\
        marketing) node \"$PREFIX/tools/agents/deploy-agents.mjs\" --mode marketing --deploy-commands --deploy-skills \"\$@\" ;; \\
        writing|general) node \"$PREFIX/tools/agents/deploy-agents.mjs\" --mode general --deploy-commands --deploy-skills \"\$@\" ;; \\
        all) node \"$PREFIX/tools/agents/deploy-agents.mjs\" --mode all --deploy-commands --deploy-skills \"\$@\" ;; \\
        *) echo \"Unknown framework: \$fw\"; echo 'Available: sdlc, marketing, writing, all'; return 1 ;; \\
      esac; \\
      if [[ \"\$skip_utils\" -eq 0 ]]; then \\
        echo ''; echo 'Deploying aiwg-utils addon...'; \\
        node \"$PREFIX/tools/agents/deploy-agents.mjs\" --source \"$PREFIX/agentic/code/addons/aiwg-utils\" --deploy-commands --deploy-skills; \\
      fi ;; \\
    list) node \"$PREFIX/tools/plugin/plugin-status-cli.mjs\" \"\$@\" ;; \\
    remove) node \"$PREFIX/tools/plugin/plugin-uninstaller-cli.mjs\" \"\$@\" ;; \\
    -new|--new) node \"$PREFIX/tools/install/new-project.mjs\" \"\$@\" ;; \\
    -deploy-agents|--deploy-agents) \\
      echo '[DEPRECATED] Use: aiwg use <framework> instead'; \\
      if echo \"\$@\" | grep -q \"\\-\\-platform[[:space:]]*warp\"; then \\
        node \"$PREFIX/tools/warp/setup-warp.mjs\" \"\$@\"; \\
      else \\
        node \"$PREFIX/tools/agents/deploy-agents.mjs\" \"\$@\"; \\
      fi ;; \\
    -deploy-commands|--deploy-commands) \\
      echo '[DEPRECATED] Use: aiwg use <framework> instead'; \\
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
    -migrate-workspace|--migrate-workspace) node \"$PREFIX/tools/cli/workspace-migrate.mjs\" \"\$@\" ;; \\
    -rollback-workspace|--rollback-workspace) node \"$PREFIX/tools/cli/workspace-rollback.mjs\" \"\$@\" ;; \\
    -status|--status|status) node \"$PREFIX/tools/cli/workspace-status.mjs\" \"\$@\" ;; \\
    -validate-metadata|--validate-metadata) node \"$PREFIX/tools/cli/validate-metadata.mjs\" \"\$@\" ;; \\
    -version|--version|version) aiwg_version ;; \\
    -update|--update|update) echo 'Updating ai-writing-guide...'; git -C \"$PREFIX\" fetch --all && git -C \"$PREFIX\" pull --ff-only && echo 'Update complete. Re-running installer to refresh aliases...' && bash \"$PREFIX/tools/install/install.sh\" && echo 'Please run: source ~/.bash_aliases (or ~/.zshrc) to activate new commands' ;; \\
    -reinstall|--reinstall|reinstall) aiwg_reinstall ;; \\
    -h|--help|-help|help|\"\") \\
      echo 'Usage: aiwg <command> [options]'; echo ''; \\
      echo 'Framework Management:'; \\
      echo '  use <framework> [--no-utils] [--provider <...>] [--force]'; \\
      echo '      Install and deploy framework (sdlc, marketing, writing, all)'; \\
      echo '  list [--type <type>] [--json]'; \\
      echo '      List installed frameworks and addons'; \\
      echo '  remove <id> [--force] [--keep-data]'; \\
      echo '      Remove a framework or addon'; echo ''; \\
      echo 'Project Setup:'; \\
      echo '  -new [--no-agents] [--provider <...>]'; \\
      echo '      Create new project with SDLC templates'; echo ''; \\
      echo 'Workspace Management:'; \\
      echo '  -status [--verbose] [--json]'; \\
      echo '      Show workspace health and installed frameworks'; \\
      echo '  -migrate-workspace [--dry-run] [--force]'; \\
      echo '      Migrate legacy .aiwg/ to framework-scoped structure'; \\
      echo '  -rollback-workspace [--list] [--backup <path>]'; \\
      echo '      Rollback workspace migration from backup'; echo ''; \\
      echo 'Utilities:'; \\
      echo '  -prefill-cards --target <path> --team <team.yml> [--write]'; \\
      echo '      Prefill SDLC card metadata'; \\
      echo '  -contribute-start <feature-name>'; \\
      echo '      Start AIWG contribution workflow'; echo ''; \\
      echo 'Maintenance:'; \\
      echo '  -version    Show installed version'; \\
      echo '  -update     Update installation'; \\
      echo '  -reinstall  Force fresh reinstall'; echo ''; \\
      echo 'Note: aiwg automatically updates on every command run.' ;; \\
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
echo "Quick Start:"
echo "  aiwg use sdlc           Install SDLC framework (54 agents, 42 commands)"
echo "  aiwg use marketing      Install Marketing framework (37 agents)"
echo "  aiwg use all            Install all frameworks"
echo "  aiwg -new               Create new project with templates"
echo ""
echo "Other Commands:"
echo "  aiwg list               List installed frameworks"
echo "  aiwg remove <id>        Remove a framework"
echo "  aiwg -version           Show current version"
echo "  aiwg -update            Update installation"
echo "  aiwg -help              Show all commands"
echo ""
echo "Platform options:"
echo "  --provider factory      Deploy for Factory AI"
echo "  --provider openai       Deploy for OpenAI/Codex"
echo ""
echo "Note: 'aiwg use' automatically includes aiwg-utils (regenerate commands, etc.)"
echo "For corrupted installs, use: aiwg -reinstall"
