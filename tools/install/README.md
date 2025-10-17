# Installer

One-liner installs the framework to a standard location and registers CLI aliases:

```bash
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash
```

Options:

```bash
# View help
bash -c "$(curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh)" -- --help

# Custom repo/prefix/branch/alias-file
bash -c "$(curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh)" -- \
  --repo https://github.com/jmagly/ai-writing-guide.git \
  --branch main \
  --prefix $HOME/.local/share/ai-writing-guide \
  --alias-file $HOME/.bash_aliases

# Auto-install Node.js (attempt via NodeSource/Homebrew/etc.)
bash -c "$(curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh)" -- --auto-install-node
```

Aliases installed (unified CLI):

- `aiwg -deploy-agents` → deploy agents to `.claude/agents/` (Claude Code)
- `aiwg -deploy-commands` → deploy commands to `.claude/commands/` (Claude Code)
- `aiwg -setup-warp` → setup Warp Terminal with AIWG framework (creates/updates WARP.md)
- `aiwg -update-warp` → update existing WARP.md with latest AIWG content
- `aiwg -new` → scaffold a new project with intake templates (agents auto-deployed by default)
  - The CLI auto-updates the installed framework (git pull) before executing.

Scaffolding:

```bash
# In a new/empty project directory
aiwg -new              # create .aiwg/intake/*.md and a README; deploy agents; init git
# use --no-agents to skip deployment

# Deploy to Claude Code (existing project):
aiwg -deploy-agents    # copy agents into .claude/agents/
aiwg -deploy-commands  # copy commands into .claude/commands/

# Deploy to Warp Terminal (existing project):
aiwg -setup-warp       # create/update WARP.md with AIWG framework
aiwg -update-warp      # update existing WARP.md with latest content
```

Node.js requirement:

- Node >= 18.20.8 (Latest LTS: Hydrogen)
- The installer checks your Node version and can attempt to install when `--auto-install-node` is used.
- If automatic install is not possible, it prints instructions for NVM and NodeSource.
