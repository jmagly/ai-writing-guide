# Agent Deployment Tools

## deploy-agents.mjs

Copy shared agents from this repository into a project's `.claude/agents` directory. By default,
it uses the current working directory as the target, so you can alias this script and run it from
any project root.

### Usage

```bash
# From this repo, deploy into the current directory's .claude/agents
node tools/agents/deploy-agents.mjs

# Specify a different source (path to this repo clone) or target project
node tools/agents/deploy-agents.mjs --source /path/to/ai-writing-guide --target /path/to/project

# Preview only
node tools/agents/deploy-agents.mjs --dry-run

# Overwrite on conflicts (otherwise "-sdlc" suffix is appended for SDLC duplicates)
node tools/agents/deploy-agents.mjs --force
```

### Behavior
- Copies Markdown files from `docs/agents/` and `docs/agents/sdlc/` into `.claude/agents` (flat).
- On filename conflicts, SDLC files get a `-sdlc` suffix unless `--force` is used.
- Creates `.claude/agents` if it does not exist.

