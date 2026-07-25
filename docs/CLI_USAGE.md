# AIWG CLI Usage Guide

> **Note:** The `aiwg` CLI command is only available when installed via npm
> (`npm install -g aiwg`). If you installed AIWG using Claude Code plugins
> (`/plugin install sdlc@aiwg`), you won't have access to the CLI. Plugins
> provide agents, commands, and skills directly within Claude Code without
> requiring a separate CLI tool.

## Installation

```bash
npm install -g aiwg
```

Native PTY and dense-embedding support is optional and is not installed by the
base package. Opt in with `aiwg features install pty` or
`aiwg features install embeddings`; each command uses an isolated user-owned
manifest with a package-specific lifecycle-script allowlist. Run `aiwg doctor`
to distinguish a missing feature from native package files whose build was
blocked or failed.

## Quick Start

```bash
# Check installation health
aiwg doctor

# Preview the guided first-run path without writing files
aiwg wizard --dry-run --goal "help me start a project"

# Deploy SDLC framework to your project
cd your-project
aiwg use sdlc

# Verify AIWG is engaged in this project
aiwg status --probe --json
```

## Core Commands

### doctor

Check AIWG installation health and diagnose issues.

```bash
aiwg doctor
```

Checks:

- AIWG installation location
- Version info
- Project `.aiwg/` directory
- Deployed agents and commands
- Node.js version
- MCP server availability
- Skill Seekers (optional)
- Optional feature availability and native-module loadability

### features

Inspect and install optional runtime capabilities without changing global npm
script policy.

```bash
aiwg features
aiwg features info pty
aiwg features install pty
```

### use

Deploy a framework to your project.

```bash
# SDLC framework (software development)
aiwg use sdlc

# Marketing framework
aiwg use marketing

# Writing addon (voice profiles)
aiwg use writing

# All frameworks
aiwg use all
```

**Options:**

- `--provider <name>`: Target platform (claude, factory, openai, warp)
- `--no-utils`: Skip aiwg-utils addon
- `--force`: Overwrite existing deployments

### wizard

Guide first-run provider, project, framework, deploy, and verification choices.

```bash
# Interactive terminal path
aiwg wizard

# No-write preview
aiwg wizard --dry-run --goal "help me start a project"

# Scripted path
aiwg wizard --non-interactive --profile beginner --provider codex
```

**Options:**

- `--goal <text>`: Plain-language goal used to recommend a framework
- `--profile <preset>`: Preset for a common path (`beginner`, `sdlc`,
  `research`, `marketing`, `forensics`, `ops`, `security`, `knowledge-base`,
  `writing`)
- `--provider <name>`: Target provider
- `--framework <name>`: Framework to deploy first
- `--non-interactive`: Use selected or inferred defaults without prompting
- `--dry-run`: Print the plan without writing files
- `--json`: Print the plan as JSON

### -new

Create a new project with full SDLC scaffolding.

```bash
aiwg -new my-project
cd my-project
```

### -status

Show workspace health and installed frameworks.

```bash
aiwg -status
aiwg status --probe --json
```

### issue

Manage project-local issues under `.aiwg/issues/` and move snapshots to or from
Gitea/GitHub. See [Local Issues](./local-issues.md) for sync, backup, and Git
conflict guidance.

```bash
aiwg issue init --prefix PROJECT
aiwg issue new --title "Fix import flow" --body-file issue.md
aiwg issue import --from gitea --snapshot-file gitea-1463.json
aiwg issue import --from github --live --repo org/repo --external-id 42
aiwg issue export PROJECT-0001 --to github --out project-0001.github.json
aiwg issue export PROJECT-0001 --to gitea --live --repo org/repo
aiwg issue sync conflicts PROJECT-0001 --snapshot-file gitea-1463.json --out conflicts.json
aiwg issue sync map-comments PROJECT-0001 --map-file comment-map.json
```

### list

List installed frameworks and addons.

```bash
aiwg list
```

### remove

Remove a framework or addon.

```bash
aiwg remove <id>
```

## MCP Server

### mcp serve

Start the AIWG MCP server.

```bash
aiwg mcp serve
```

### mcp install

Generate MCP client configuration.

```bash
# For Claude Desktop
aiwg mcp install claude

# For Cursor IDE
aiwg mcp install cursor

# For Factory AI
aiwg mcp install factory

# Preview without writing
aiwg mcp install claude --dry-run
```

### mcp info

Show MCP server capabilities.

```bash
aiwg mcp info
```

## Channel Management

### --use-main

Switch to bleeding edge (tracks main branch).

```bash
aiwg --use-main
```

### --use-stable

Switch back to stable (npm releases).

```bash
aiwg --use-stable
```

## Web-Backed Resources (Experimental Partial Implementation)

AIWG ships an experimental partial implementation for web-backed resource
resolution for `aiwg discover`, `aiwg show`, and `aiwg versions`.

```bash
aiwg discover "architecture evolution" --resource-source local --aiwg-version 2026.7.16
aiwg discover "architecture evolution" --resource-source web --aiwg-version stable
aiwg discover "architecture evolution" --resource-source auto --aiwg-version 2026.7.16
aiwg discover "architecture evolution" --offline

aiwg show skill architecture-evolution --resource-source web --aiwg-version 2026.7.16
aiwg show framework sdlc --resource-source web --aiwg-version candidate --offline

aiwg versions list --json
aiwg versions resolve stable --json
aiwg versions resolve stable --write-lock
aiwg versions show 2026.7.18 --json --pretty
aiwg versions resolve '>=2026.7.18 <2026.8.0' --json
aiwg versions resolve sha256:ef5a7112c593d5df90f7940c315a3d4a3d6d6e2a3bd9c063d87de1e811ad80c1
aiwg versions clean-cache --dry-run --json
aiwg doctor
```

Supported `--aiwg-version` values in this beta are exact AIWG CalVer releases,
SemVer ranges, signed manifest digests, and signed channel names:

```bash
aiwg discover "architecture evolution" --resource-source web --aiwg-version 2026.7.18
aiwg discover "architecture evolution" --resource-source web --aiwg-version '>=2026.7.18 <2026.8.0'
aiwg discover "architecture evolution" --resource-source web --aiwg-version sha256:ef5a7112c593d5df90f7940c315a3d4a3d6d6e2a3bd9c063d87de1e811ad80c1
aiwg discover "architecture evolution" --resource-source web --aiwg-version stable
aiwg discover "architecture evolution" --resource-source web --aiwg-version latest
aiwg discover "architecture evolution" --resource-source web --aiwg-version canary
aiwg discover "architecture evolution" --resource-source web --aiwg-version main
```

This partial implementation is active only for `discover`/`show` resource
queries and `versions` release inspection. It does not yet apply to `aiwg use`
or `aiwg regenerate` rollout-wide web defaults. See
[Web-Backed AIWG Resources](./install/web-backed-resources.md) for the planned
operator contract, trust anchors, troubleshooting, and safety model.

Maintainer checkouts can already relocate the project AIWG artifact directory
with the project pointer file written by the CLI:

```bash
aiwg artifacts move --to ../aiwg-web-release-ops/corpus/.aiwg
```

The command moves the configured artifact root, writes `.aiwg-location`,
updates `.gitignore` for the local pointer, rebuilds the project index, and
syncs the Fortemi Core static cache. For one-off sessions,
`AIWG_ARTIFACTS_PATH` can still point at an absolute, project-relative, or
`~/`-relative artifact directory and takes precedence over `.aiwg-location`.

For AIWG's own repository, this is the supported bridge to the private SDLC
corpus. See [Private AIWG Corpus](./development/private-aiwg-corpus.md).

## Maintenance

### -version

Show version and channel info.

```bash
aiwg -version
```

### -update

Check for and apply updates.

```bash
aiwg -update
```

### -help

Show all available commands.

```bash
aiwg -help
```

## Support

- **GitHub Issues**: <https://github.com/jmagly/aiwg/issues>
- **Documentation**: <https://docs.aiwg.io>
- **Examples**: `.aiwgrc.example.json` in repository
