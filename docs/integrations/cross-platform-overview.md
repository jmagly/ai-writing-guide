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
| Cursor | `aiwg use sdlc --provider cursor` | .cursor/rules/ (MDC) |
| OpenCode | `aiwg use sdlc --provider opencode` | AGENTS.md |
| Warp Terminal | `aiwg use sdlc --provider warp` | WARP.md |
| Devin Desktop | `aiwg use sdlc --provider devin` | AGENTS.md |
| OpenClaw | `aiwg use sdlc --provider openclaw` | - |

---

## What Gets Deployed

All artifact types deploy automatically in each platform's native format:

- **Agents** - Specialized AI personas (Architecture Designer, Test Engineer, Security Auditor, etc.)
- **Commands** - Slash commands and CLI commands (`/mention-wire`, `transition`, `where-are-we`)
- **Skills** - Natural language workflows (project awareness, handoffs, quality gates)
- **Rules** - Context rules and coding standards (citation policy, token security, versioning)
- **Behaviors** - Platform behavior definitions (OpenClaw only)

---

## Provider Capability Matrix

| Provider | Agents | Commands | Skills | Rules | Behaviors |
|----------|--------|----------|--------|-------|-----------|
| Claude Code | native | native | native | native | - |
| OpenAI/Codex | native | native | native | conventional | - |
| GitHub Copilot | native | native | conventional | native | - |
| Factory AI | native | native | native | conventional | - |
| Cursor | conventional | conventional | native | native | - |
| OpenCode | native | native | conventional | conventional | - |
| Warp Terminal | aggregated | conventional | native | aggregated | - |
| Devin Desktop | aggregated | native | native | native | - |
| OpenClaw | native | native | native | native | native |

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
├── agents/          # Agent definitions (.agent.md format)
├── prompts/         # Slash commands (.prompt.md format)
├── instructions/    # Path-scoped rules (.instructions.md format)
└── copilot-instructions.md  # Repository-wide instructions
```

### Special Cases

| Provider | Special Convention |
|----------|--------------------|
| **OpenAI/Codex** | Commands → `~/.codex/prompts/`<br>Skills → project `.agents/skills/` (legacy AIWG entries under `~/.codex/skills/` are pruned)<br>AGENTS.md is free-form Markdown (no YAML frontmatter or structured directives)<br>Rust CLI is current product; TypeScript CLI is legacy<br>Uses Responses API exclusively (`wire_api = "chat"` removed) |
| **GitHub Copilot** | Agents use `.agent.md` format<br>Commands → `.github/prompts/*.prompt.md`<br>Rules → `.github/instructions/*.instructions.md` (with `applyTo` globs)<br>MCP → `.vscode/mcp.json` |
| **Warp Terminal** | Skills natively discovered at `.warp/skills/`; agents and rules aggregated into `WARP.md`; `AGENTS.md` also supported (preferred by Warp, but `WARP.md` takes priority); `.warp/workflows/` for legacy YAML workflows |
| **Devin Desktop** | Agents aggregated to `AGENTS.md`<br>Commands → `.windsurf/workflows/`<br>Rules → `.windsurf/rules/*.md` (with trigger frontmatter)<br>Skills → `.windsurf/skills/`<br>Legacy selector: `windsurf` |
| **Cursor** | Rules use `.mdc` extension (MDC format) with frontmatter (`description`, `globs`, `alwaysApply`)<br>Skills use native `.cursor/skills/*/SKILL.md` format (2.4+)<br>Also supports `AGENTS.md` with directory inheritance<br>Legacy `.cursorrules` still generated for backward compatibility<br>Cloud Agents support MCP for remote AIWG access |
| **OpenClaw** | All artifacts deploy to home directory (`~/.openclaw/`)<br>First provider to support behaviors (`~/.openclaw/behaviors/`) |

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

## Agent Loop Multi-Provider Support

Al iterative loops can target different providers, not just deployment. Use `--provider` to run task loops through Codex instead of Claude:

```bash
# Default (Claude)
aiwg ralph "Fix tests" --completion "npm test passes"

# Target Codex
aiwg ralph "Fix tests" --completion "npm test passes" --provider codex
```

Model mapping is automatic: opus → gpt-5.3-codex, sonnet → codex-mini-latest, haiku → gpt-5-codex-mini. The provider adapter handles capability differences with graceful degradation.

See [Al Guide](../ralph-guide.md) for full documentation.

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
| Devin Desktop | [Setup Guide](windsurf-quickstart.md) |
| OpenClaw | [Setup Guide](openclaw-quickstart.md) |

---

## After Setup

Once deployed, see the [Intake Guide](#intake-guide) to start your project.
