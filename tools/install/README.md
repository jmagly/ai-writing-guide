# Installer

One-liner installs the framework to a standard location and registers CLI aliases:

```bash
curl -fsSL https://raw.githubusercontent.com/manitcor/ai-writing-guide/main/tools/install/install.sh | bash
```

Options:

```bash
# View help
bash -c "$(curl -fsSL https://raw.githubusercontent.com/manitcor/ai-writing-guide/main/tools/install/install.sh)" -- --help

# Custom repo/prefix/branch/alias-file
bash -c "$(curl -fsSL https://raw.githubusercontent.com/manitcor/ai-writing-guide/main/tools/install/install.sh)" -- \
  --repo https://github.com/manitcor/ai-writing-guide.git \
  --branch main \
  --prefix $HOME/.local/share/ai-writing-guide \
  --alias-file $HOME/.bash_aliases

# Auto-install Node.js (attempt via NodeSource/Homebrew/etc.)
bash -c "$(curl -fsSL https://raw.githubusercontent.com/manitcor/ai-writing-guide/main/tools/install/install.sh)" -- --auto-install-node
```

Aliases installed (unified CLI):

- `aiwg -deploy-agents` → copy shared agents into `.claude/agents` of current dir
- `aiwg -new` → scaffold a new project with intake templates (agents auto-deployed by default)
  - The CLI auto-updates the installed framework (git pull) before executing.

Scaffolding:

```bash
# In a new/empty project directory
aiwg -new              # create docs/sdlc/intake/*.md and a README; deploy agents; init git
# use --no-agents to skip deployment
# to copy agents later or in an existing project:
aiwg -deploy-agents    # copy shared agents into .claude/agents
```

Node.js requirement:

- Node >= 18.20.8 (Latest LTS: Hydrogen)
- The installer checks your Node version and can attempt to install when `--auto-install-node` is used.
- If automatic install is not possible, it prints instructions for NVM and NodeSource.
