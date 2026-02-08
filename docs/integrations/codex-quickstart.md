# OpenAI Codex Integration Guide

Complete guide for using AIWG with OpenAI Codex CLI, the Codex App, and the Codex API.

---

## Platform Overview

OpenAI Codex is available across multiple interfaces:

| Interface | Model Default | Best For |
|-----------|---------------|----------|
| **Codex CLI** | `codex-mini-latest` | Terminal-first development, automation |
| **Codex App** (macOS) | `gpt-5.3-codex` | Parallel agents, long-running tasks |
| **Codex in Copilot** | `gpt-5.3-codex` | GitHub-integrated workflows |
| **Codex API** | `codex-mini-latest` | Custom tooling, CI/CD integration |

---

## Available Models (February 2026)

| Model | Capability | Pricing | Notes |
|-------|-----------|---------|-------|
| **GPT-5.3-Codex** | Most capable | Premium tier | Combines Codex + GPT-5 stacks, tops SWE-Bench Pro |
| **GPT-5-Codex-Mini** | Cost-effective | 4x more usage | Auto-offered at 90% of usage limit |
| **codex-mini-latest** | API default | $1.50/$6 per 1M tokens | Fine-tuned o4-mini, 75% prompt caching discount |

Switch models mid-session with `/model` or configure in `config.toml`.

---

## Install & Deploy

### 1. Install AIWG

```bash
npm install -g aiwg
```

### 2. Deploy to your project

```bash
cd /path/to/your/project

# Deploy all 4 artifact types for Codex
aiwg use sdlc --provider codex
```

This deploys to:
- `.codex/agents/` — Project-local agent definitions
- `.codex/rules/` — Project-local context rules
- `~/.codex/prompts/` — User-level command prompts
- `~/.codex/skills/` — User-level AIWG skills
- `AGENTS.md` — Project context file

> **Note:** Codex uses a split deployment model. Agents and rules are project-local (`.codex/`), while commands and skills are deployed to the user's home directory (`~/.codex/`) to be available across all projects.

### 3. Deploy commands and skills separately (optional)

```bash
# Skills only (user-level)
aiwg -deploy-skills --provider codex

# Commands/prompts only (user-level)
aiwg -deploy-commands --provider codex
```

### 4. Regenerate for intelligent integration

```text
/aiwg-regenerate-agents
```

This enables natural language command mapping ("run security review" maps to the correct workflow).

---

## What Gets Created

```text
your-project/
├── .codex/
│   ├── agents/          # SDLC agents (Requirements Analyst, etc.)
│   └── rules/           # Context rules (token security, citation policy, etc.)
├── AGENTS.md            # Project context
└── .aiwg/               # SDLC artifacts

~/.codex/
├── skills/              # AIWG skills (voice profiles, project awareness, etc.)
├── prompts/             # AIWG commands as prompts (/project-status, /security-gate, etc.)
└── config.toml          # Configuration (copy template)
```

### Skills Loading

Codex loads skills from two locations:
- `~/.codex/skills/` — User-level skills (AIWG deploys here)
- `.agents/skills/` — Project-local skills in any git repo

Use the built-in `$skill-creator` to bootstrap new skills.

---

## Configuration

Copy the AIWG config template:

```bash
cp $(npm root -g)/aiwg/agentic/code/frameworks/sdlc-complete/templates/codex/config.toml.aiwg-template ~/.codex/config.toml
```

### Key settings

```toml
# Model selection
model = "codex-mini-latest"          # Default CLI model (cost-effective)
review_model = "gpt-5.3-codex"       # Most capable for /review

# Profiles for different workflows
[profiles.aiwg-sdlc]
model = "gpt-5.3-codex"
model_reasoning_effort = "high"
approval_policy = "on-request"

[profiles.aiwg-dev]
model = "codex-mini-latest"
model_reasoning_effort = "medium"
```

### Config layers (precedence order)

1. Project `.codex/config.toml` (highest)
2. User `~/.codex/config.toml`
3. System config
4. Built-in defaults

Use `/debug-config` in the CLI to inspect the effective configuration.

---

## CLI Features

### Mid-Turn Steering

Submit messages while Codex is working to redirect behavior. Steer mode is now stable and the default — Enter sends immediately, Tab queues a follow-up.

### Code Review

```text
/review
```

Opens review presets. Reads the selected diff, reports prioritized actionable findings without touching the working tree. Trained to catch critical flaws and match PR intent to diff.

### Web Search

Built-in first-party web search. Defaults to cached mode for speed. Use `--search` flag for live browsing when you need the latest information.

### Image Attachments

Attach PNG and JPEG images directly in the CLI composer or via command line for visual context.

### Cloud Tasks

```bash
codex cloud
```

Interactive picker for cloud tasks. List, filter, and browse cloud task results. Apply cloud task diffs locally. Cloud environments use 12-hour container caching.

```bash
# JSON output for automation
codex cloud --json
```

### Feature Flags

```bash
codex features enable unified_exec
codex features disable some_feature
```

Manage CLI feature flags for experimental capabilities.

### Model Switching

```text
/model gpt-5.3-codex
```

Switch models mid-session without restarting.

---

## Codex App (macOS)

The Codex App (launched February 2, 2026) provides a native macOS interface for:

- **Parallel agents** — Run multiple Codex agents simultaneously on different tasks
- **Long-running tasks** — Background processing with notification on completion
- **Automations** — Schedule recurring tasks combining instructions and optional skills
- **Review queue** — Automation results are queued for human review before applying

### Automations

Schedule tasks to run periodically:
- Issue triage and categorization
- CI failure summaries
- Release briefs
- Automated bug checking

Results go to a review queue — you approve before changes are applied.

---

## Using AIWG Prompts

```text
/prompts:aiwg-pr-review PR_NUMBER=123
/prompts:aiwg-security-audit
/prompts:aiwg-generate-tests
```

---

## Non-Interactive / CI Mode

```bash
# Full auto execution
codex exec "Perform AIWG security review" --full-auto --sandbox read-only

# With specific model
codex exec "Fix failing tests" --model gpt-5.3-codex --full-auto
```

---

## AIWG Model Mapping

When AIWG deploys agents, model shorthands are mapped:

| AIWG Shorthand | Codex Model | Use Case |
|----------------|-------------|----------|
| `opus` | `gpt-5.3-codex` | Architecture, complex reasoning |
| `sonnet` | `codex-mini-latest` | Code generation, implementation |
| `haiku` | `gpt-5-codex-mini` | Quick tasks, file operations |

---

## GitHub Integration

Codex is available as a coding agent for GitHub Copilot Pro+ and Enterprise customers. AIWG agents deployed via `--provider copilot` work with this integration.

---

## Ralph Iterative Loops

Ralph loops can target Codex directly via `--provider codex`:

```bash
# Run Ralph with Codex as the execution provider
aiwg ralph "Fix all failing tests" \
  --completion "npm test passes" \
  --provider codex

# External Ralph with Codex for long-running tasks
aiwg ralph-external "Migrate codebase to TypeScript" \
  --completion "npx tsc --noEmit exits 0" \
  --provider codex \
  --budget 5.0
```

Model mapping: opus → gpt-5.3-codex, sonnet → codex-mini-latest, haiku → gpt-5-codex-mini.

See [Ralph Guide](../ralph-guide.md) for full documentation.

---

## Troubleshooting

**Natural language not working?** Run regenerate:
```text
/aiwg-regenerate-agents
```

**Skills not loading?** Check both skill locations:
```bash
ls ~/.codex/skills/
ls .agents/skills/    # Project-local
```
Restart Codex after installing new skills.

**Config not applying?** Inspect effective config:
```text
/debug-config
```

**Model not available?** Check your tier:
- GPT-5.3-Codex requires Pro/Team plan
- codex-mini-latest available on all plans
- GPT-5-Codex-Mini auto-offered at 90% usage

**Verify installation:**
```bash
ls ~/.codex/skills/
ls ~/.codex/prompts/
ls .codex/agents/
ls .codex/rules/
cat AGENTS.md | head -20
```
