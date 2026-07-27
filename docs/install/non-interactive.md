# Non-Interactive Installation

Guide for deploying AIWG frameworks in non-interactive environments: cloud-init, CI/CD pipelines, provisioning scripts, and automated setups.

For the broader zero-to-running setup flow, including provider handoff and
verification prompts, see the [Agentic Install Runbook](../agentic-install-runbook.md).

## The Problem

`aiwg use` needs to be on PATH and expects an interactive TTY for first-time config. In automated environments (cloud-init, Docker build, CI), neither is guaranteed:

- npm global binaries live in versioned directories (e.g., `~/.local/share/fnm/node-versions/v24.x.x/...`) not on the static PATH
- No TTY means the init wizard can't prompt

## Solutions

### Option A: `npx` with `--prefix` (Recommended)

Use `npx` (always available with Node) and `--prefix` to target a specific project directory:

```bash
# Deploy SDLC framework to a project directory
npx aiwg use sdlc --provider claude --prefix /home/agent/workspace

# Deploy multiple frameworks
npx aiwg use sdlc --provider claude --prefix /home/agent/workspace
npx aiwg use research --provider claude --prefix /home/agent/workspace

# Deploy to all configured providers
npx aiwg use all --prefix /home/agent/workspace
```

`--prefix` is an alias for `--target`. When provided:
- Config is auto-created if missing (no wizard prompt)
- The provider defaults to `claude` unless `--provider` is specified
- Works without TTY

### Option B: Full path invocation

After `npm install -g aiwg`, invoke via the npm prefix:

```bash
NPM_PREFIX=$(npm config get prefix)
"$NPM_PREFIX/bin/aiwg" use sdlc --provider claude
```

Or create a stable symlink:

```bash
npm install -g aiwg
ln -sf "$(npm config get prefix)/bin/aiwg" /usr/local/bin/aiwg
aiwg use sdlc --provider claude
```

### Option C: `--providers` shorthand

Skip the init wizard entirely by declaring providers inline:

```bash
aiwg use sdlc --providers claude,copilot
```

This auto-creates `.aiwg/aiwg.config` with the specified providers.

## Cloud-Init Example

```yaml
# cloud-init user-data snippet
runcmd:
  - npm install -g aiwg
  - NPM_PREFIX=$(npm config get prefix)
  - "$NPM_PREFIX/bin/aiwg" use sdlc --provider claude --prefix /home/agent/workspace
```

Or using npx:

```yaml
runcmd:
  - npm install -g aiwg
  - npx aiwg use sdlc --provider claude --prefix /home/agent/workspace
```

## Docker Example

```dockerfile
RUN npm install -g aiwg \
 && npx aiwg use sdlc --provider claude --prefix /app
```

## CI/CD Example

```yaml
# GitHub Actions
- run: |
    npm install -g aiwg
    npx aiwg use sdlc --provider claude --prefix ${{ github.workspace }}
```

## Behavior Details

| Environment | Config exists | Result |
|-------------|--------------|--------|
| TTY, no config | No | Init wizard runs interactively |
| TTY, config exists | Yes | Deploys using config |
| Non-TTY, no config, `--provider` set | No | Auto-creates config with specified provider |
| Non-TTY, no config, `--prefix` set | No | Auto-creates config with default provider (claude) |
| Non-TTY, no config, no flags | No | Warning printed, deploys with default (claude) |

## Troubleshooting

**`command not found: aiwg`** — Use `npx aiwg` or full path `$(npm config get prefix)/bin/aiwg`

**Init wizard hangs** — You're in a non-TTY environment. Add `--provider claude` or `--prefix <dir>` to bypass the wizard.

**Config not created** — Check that the target directory exists and is writable. The `.aiwg/` directory is created automatically.

## Related

- [Agentic Install Runbook](../agentic-install-runbook.md) — Canonical setup flow
- [CLI Reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/cli-reference.md) — Full command documentation
- [agentic-sandbox loadouts](https://github.com/jmagly/agentic-sandbox) — VM provisioning that calls `aiwg use`
