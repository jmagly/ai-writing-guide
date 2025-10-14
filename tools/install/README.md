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
```

Aliases installed:
- `aiwg-deploy-agents` → copy shared agents into `.claude/agents` of current dir
- `aiwg-new` → scaffold a new project with intake templates (and optional agents)

Scaffolding:
```bash
# In a new/empty project directory
aiwg-new               # create docs/sdlc/intake/*.md and a README
aiwg-deploy-agents     # copy shared agents into .claude/agents
```

