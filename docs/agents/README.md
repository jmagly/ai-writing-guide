# Agents

## Purpose
This directory holds shared agent playbooks used across projects. Agents are universal and may be
specialized by subfolder.

## Layout
- `./` — General-purpose agents (architecture, PM, devops, testing, etc.)
- `sdlc/` — SDLC-focused agents (orchestrator, governance, security, reliability)

## Quick links
- `docs/agents/sdlc/` — SDLC agent suite
- `docs/agents/openai-compat.md` — OpenAI/Codex model mapping and paths

## Maintenance
- Keep agent responsibilities and deliverables current
- Prefer embedded templates for agents that generate standard artifacts (e.g., RACI Expert)

## Agent Deployment CLI

Use the deploy script to copy shared agents into a project's `.claude/agents` directory.

### Prerequisites
- Node.js ≥ 18
- Access to this repository on disk

### Commands

```text
aiwg -deploy-agents [--provider <claude|openai>] [--source <path>] [--target <path>] [--dry-run] [--force]
aiwg -new [--no-agents] [--provider <claude|openai>]
aiwg -prefill-cards --target docs/sdlc/artifacts/<project> --team team-profile.(yml|yaml|json) [--write]
```

### Behavior
- Copies all Markdown agents from `docs/agents/` and `docs/agents/sdlc/` into the target
  project's `.claude/agents` directory (flat structure).
- Creates `.claude/agents` if it does not exist.
- Conflict handling: if a filename already exists and `--force` is not set, SDLC agents are copied
  with a `-sdlc` suffix (e.g., `project-manager-sdlc.md`). With `--force`, existing files are
  overwritten.

### Options
- `--provider <claude|openai>`: Target provider (default: `claude`). For `openai`, agents are written to `.codex/agents`.
- `--reasoning-model <name>`: Override reasoning model (default: `opus` for Claude, `gpt-5` for OpenAI).
- `--coding-model <name>`: Override coding model (default: `sonnet` for Claude, `gpt-5-codex` for OpenAI).
- `--efficiency-model <name>`: Override efficiency model (default: `sonnet` for Claude, `gpt-5-codex` for OpenAI).
- `--as-agents-md` (OpenAI): Aggregate all agents into `.codex/AGENTS.md` instead of individual files.
- `--source <path>`: Path to this repo (defaults to repo root relative to the script).
- `--target <path>`: Project root that will receive agent files (defaults to current directory).
- `--dry-run`: Print planned actions without copying files.
- `--force`: Overwrite existing files on conflict (disables the `-sdlc` suffix fallback).

### Examples
- Deploy into current directory's `.claude/agents`:
  ```bash
  aiwg -deploy-agents
  ```
- Deploy from a separate clone into another project:
  ```bash
  aiwg -deploy-agents --source /path/to/ai-writing-guide --target /path/to/another-project
  ```
- Preview without writing:
  ```bash
  aiwg -deploy-agents --dry-run
  ```
- Force overwrite on conflicts:
  ```bash
  aiwg -deploy-agents --force
  ```

### Alias (optional)
Add a shell alias for convenience (adjust path as needed):

```bash
alias deploy_agents='node /path/to/ai-writing-guide/tools/agents/deploy-agents.mjs'
```

### CI usage (optional)
In a GitHub Action step (if you want to vendor agents into a build artifact):

```yaml
- name: Deploy agents
  run: node tools/agents/deploy-agents.mjs --target ${{ github.workspace }}
```

### Notes
- Commands auto-update the installed framework before running.
- Current behavior is intentionally simple: flat copy of all agents. Future flags may support
  selective deployment by role, category, or glob.
- Generated agents should be reviewed per-project and tailored where necessary.
