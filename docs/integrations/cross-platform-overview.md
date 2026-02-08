# Cross-Platform Overview

AIWG works across multiple AI platforms. **One command deploys everything.**

---

## Quick Comparison

| Platform | Deploy Command | Context File |
|----------|----------------|--------------|
| Claude Code | `aiwg use sdlc` | CLAUDE.md |
| OpenAI/Codex | `aiwg use sdlc --provider codex` | AGENTS.md |
| GitHub Copilot | `aiwg use sdlc --provider copilot` | copilot-instructions.md |
| Factory AI | `aiwg use sdlc --provider factory` | AGENTS.md |
| Cursor | `aiwg use sdlc --provider cursor` | .cursorrules |
| OpenCode | `aiwg use sdlc --provider opencode` | AGENTS.md |
| Warp Terminal | `aiwg use sdlc --provider warp` | WARP.md |
| Windsurf | `aiwg use sdlc --provider windsurf` | .windsurfrules |

---

## What Gets Deployed

All four artifact types deploy automatically in each platform's native format:

- **Agents** - Specialized AI personas (Architecture Designer, Test Engineer, Security Auditor, etc.)
- **Commands** - Slash commands and CLI commands (`/mention-wire`, `transition`, `where-are-we`)
- **Skills** - Natural language workflows (project awareness, handoffs, quality gates)
- **Rules** - Context rules and coding standards (citation policy, token security, versioning)

---

## Provider Capability Matrix

| Provider | Agents | Commands | Skills | Rules |
|----------|--------|----------|--------|-------|
| Claude Code | native | native | native | native |
| OpenAI/Codex | native | native | native | conventional |
| GitHub Copilot | native | conventional | conventional | conventional |
| Factory AI | native | native | conventional | conventional |
| Cursor | conventional | conventional | conventional | native |
| OpenCode | native | native | conventional | conventional |
| Warp Terminal | aggregated | aggregated | conventional | conventional |
| Windsurf | aggregated | native | conventional | conventional |

**Legend**:
- **native** - Platform auto-discovers artifacts in standard directories
- **conventional** - AIWG directory convention (platform reads on request)
- **aggregated** - Single-file compilation + discrete files for compatibility

---

## Directory Conventions

### Standard Pattern

Most providers follow `.<provider>/<type>/`:

```
.claude/
├── agents/          # Agent definitions
├── commands/        # Slash commands
├── skills/          # Natural language workflows
└── rules/           # Context rules

.github/
├── agents/          # Agent definitions (YAML format)
├── commands/        # Converted from slash commands
├── skills/          # Workflow definitions
└── rules/           # Copilot-specific rules
```

### Special Cases

| Provider | Special Convention |
|----------|--------------------|
| **OpenAI/Codex** | Commands → `~/.codex/prompts/`<br>Skills → `~/.codex/skills/` (home directory) |
| **GitHub Copilot** | Commands converted to YAML agents in `.github/agents/` |
| **Warp Terminal** | Discrete files + aggregated `WARP.md` |
| **Windsurf** | Agents aggregated to `AGENTS.md`<br>Commands → `.windsurf/workflows/` |
| **Cursor** | Rules use `.mdc` extension (MDC format) |

---

## Migration Guide

**Upgrading from older AIWG versions that only deployed agents?**

Run the deploy command with `--force` to get all four artifact types:

```bash
aiwg use sdlc --provider <your-provider> --force
```

**What changes**:
- New `skills/` directory created alongside `agents/`
- New `rules/` directory created alongside `agents/`
- Existing agent files remain unchanged
- Commands deployed to appropriate location per provider

**No breaking changes** - all existing agents remain compatible.

---

## Ralph Multi-Provider Support

Ralph iterative loops can target different providers, not just deployment. Use `--provider` to run task loops through Codex instead of Claude:

```bash
# Default (Claude)
aiwg ralph "Fix tests" --completion "npm test passes"

# Target Codex
aiwg ralph "Fix tests" --completion "npm test passes" --provider codex
```

Model mapping is automatic: opus → gpt-5.3-codex, sonnet → codex-mini-latest, haiku → gpt-5-codex-mini. The provider adapter handles capability differences with graceful degradation.

See [Ralph Guide](../ralph-guide.md) for full documentation.

---

## Platform Setup Guides

| Platform | Guide |
|----------|-------|
| Claude Code | [Setup Guide](claude-code-quickstart.md) |
| OpenAI/Codex | [Setup Guide](codex-quickstart.md) |
| GitHub Copilot | [Setup Guide](copilot-quickstart.md) |
| Factory AI | [Setup Guide](factory-quickstart.md) |
| Cursor | [Setup Guide](cursor-quickstart.md) |
| OpenCode | [Setup Guide](opencode-quickstart.md) |
| Warp Terminal | [Setup Guide](warp-terminal-quickstart.md) |
| Windsurf | [Setup Guide](windsurf-quickstart.md) |

---

## After Setup

Once deployed, see the [Intake Guide](#intake-guide) to start your project.
