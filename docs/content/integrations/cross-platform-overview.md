# Cross-Platform Overview

AIWG works across multiple AI platforms. **One command deploys everything** - the installer creates all necessary files, context, and configuration automatically.

## What Gets Deployed

**95 agents/subagents/droids** · **100+ commands** · **49 skills** · **157 templates** · **5 voice profiles**

All assets deploy automatically to each platform in its native format.

## Quick Comparison

| Capability | Claude Code | Factory AI | Warp Terminal | Cursor | Windsurf | OpenCode | GitHub Copilot |
|------------|:-----------:|:----------:|:-------------:|:------:|:--------:|:--------:|:--------------:|
| **Multi-agent orchestration** | <span title="Built-in UI with auto-triggers">✅ Native</span> | <span title="Installer creates AGENTS.md automatically">🚀 Auto</span> | <span title="Installer creates WARP.md automatically">🚀 Auto</span> | <span title="Installer creates .cursor/agents/">🚀 Auto</span> | <span title="Installer creates .windsurfrules">🚀 Auto</span> | <span title="Installer creates AGENTS.md automatically">🚀 Auto</span> | <span title="Manual setup required">📋 Manual</span> |
| **Slash commands** | <span title="Built-in /command invocation">✅ Native</span> | <span title="Built-in /command invocation">✅ Native</span> | <span title="Some commands work natively">⚡ Limited</span> | <span title="Some commands work natively">⚡ Limited</span> | <span title="Some commands work natively">⚡ Limited</span> | <span title="Installer includes in AGENTS.md">🚀 Auto</span> | <span title="Manual setup required">📋 Manual</span> |
| **Skills** | <span title="Auto-trigger on keywords">✅ Native</span> | <span title="Installer deploys available skills">🔀 Partial</span> | <span title="Reference skill files in prompts">📎 Ref</span> | <span title="Reference skill files in prompts">📎 Ref</span> | <span title="Reference skill files in prompts">📎 Ref</span> | <span title="Reference skill files in prompts">📎 Ref</span> | <span title="Reference skill files in prompts">📎 Ref</span> |
| **Agents/Subagents/Droids** | <span title="Deployed to .claude/agents/">✅ Native</span> | <span title="Deployed to .factory/droids/">🤖 Auto</span> | <span title="Inline in WARP.md">🚀 Inline</span> | <span title="Deployed to .cursor/agents/">🚀 Auto</span> | <span title="Inline in .windsurfrules">🚀 Inline</span> | <span title="Included in AGENTS.md">🚀 Auto</span> | <span title="Manual setup required">📋 Manual</span> |
| **MCP Server** | <span title="Full MCP 2025-11-25 spec support">✅ Native</span> | <span title="Reference MCP docs in prompts">📎 Ref</span> | <span title="Reference MCP docs in prompts">📎 Ref</span> | <span title="Configure via MCP settings">⚙️ Config</span> | <span title="Configure via MCP settings">⚙️ Config</span> | <span title="Configure via MCP settings">⚙️ Config</span> | <span title="Reference MCP docs in prompts">📎 Ref</span> |
| **Natural language workflows** | <span title="Full orchestration support">✅ Native</span> | <span title="Installer includes orchestration in AGENTS.md">🔀 Partial</span> | <span title="Installer includes orchestration in WARP.md">🔀 Partial</span> | <span title="Installer includes orchestration in .cursorrules">🔀 Partial</span> | <span title="Installer includes orchestration in .windsurfrules">🔀 Partial</span> | <span title="Installer includes orchestration in AGENTS.md">🔀 Partial</span> | <span title="Manual setup required">📋 Manual</span> |
| **Voice Framework** | <span title="Voice profiles auto-trigger">✅ Native</span> | <span title="Reference voice files in prompts">📎 Ref</span> | <span title="Reference voice files in prompts">📎 Ref</span> | <span title="Reference voice files in prompts">📎 Ref</span> | <span title="Reference voice files in prompts">📎 Ref</span> | <span title="Reference voice files in prompts">📎 Ref</span> | <span title="Reference voice files in prompts">📎 Ref</span> |
| **@-mention traceability** | <span title="Native file path following">✅ Native</span> | <span title="Works automatically when deployed">🚀 Auto</span> | <span title="Works automatically when deployed">🚀 Auto</span> | <span title="Works automatically when deployed">🚀 Auto</span> | <span title="Works automatically when deployed">🚀 Auto</span> | <span title="Works automatically when deployed">🚀 Auto</span> | <span title="Reference files in prompts">📎 Ref</span> |
| **Context file** | <span title="Main orchestration file">CLAUDE.md</span> | <span title="Created by installer">AGENTS.md</span> | <span title="Symlinked to CLAUDE.md">WARP.md</span> | <span title="Created by installer">.cursorrules</span> | <span title="Created by installer">.windsurfrules</span> | <span title="Created by installer">AGENTS.md</span> | <span title="Manual setup">.github/</span> |

**Legend** (hover icons for details):

| Icon | Meaning |
|:----:|---------|
| ✅ | **Native** - Built-in UI, auto-triggers, full integration |
| 🚀 | **Auto** - Installer handles this automatically |
| 🔀 | **Partial** - Some features auto-deploy, others via reference |
| ⚙️ | **Config** - Requires configuration (installer provides guidance) |
| 📎 | **Ref** - Works by pointing AI to the file (always available) |
| 📋 | **Manual** - Requires manual setup (copy/paste) |
| ⚡ | **Limited** - Basic support, advanced features via reference |

> 💡 **All features work on all platforms.** Most are deployed automatically by the installer. "📎 Ref" features just need you to point the AI at the file - no setup required.

## One-Command Deployment

For most platforms, a single command sets everything up:

```bash
# Claude Code (recommended)
aiwg use sdlc

# Cursor
aiwg deploy --platform cursor

# Windsurf
aiwg deploy --platform windsurf

# Factory AI
aiwg deploy --provider factory --mode sdlc

# Warp Terminal
aiwg deploy --platform warp

# OpenCode / Codex
aiwg deploy --provider openai --as-agents-md
```

The installer automatically:

- Creates the correct context file (CLAUDE.md, AGENTS.md, WARP.md, etc.)
- Deploys agents/droids to the correct location
- Sets up commands and orchestration
- Configures symlinks where needed

## The Key Insight

**Every feature works on every platform - most deploy automatically.**

AIWG capabilities are defined in markdown and YAML files. When you deploy to a platform, the installer generates the right format for that platform. After deployment, the AI naturally uses them.

**For features marked 📎 Ref**, you can access them anytime by referencing the AIWG file directly:

```text
"Use the template at @~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/..."
```

No additional setup needed - any AI can read and follow these files.

### Automatic Capability Chaining

When you run a workflow, the AI automatically uses whatever tools and templates the workflow references:

```text
"Run security review"
```

That workflow file references security agents, threat model templates, and review checklists. **The AI follows all those references automatically.** You don't need to set up each component separately.

## Platform Details

### Claude Code ✅ Full Native Support

Everything works out of the box:

| Feature | Support | Details |
|---------|:-------:|---------|
| Agents | <span title="Deployed to .claude/agents/">✅ Native</span> | Task tool launches subagents |
| Commands | <span title="Deployed to .claude/commands/">✅ Native</span> | `/command` invocation |
| Skills | <span title="Auto-trigger on keywords">✅ Native</span> | Auto-trigger on keywords |
| MCP Server | <span title="Full MCP 2025-11-25 specification">✅ Native</span> | `aiwg mcp serve` |
| Orchestration | <span title="Natural language workflow triggers">✅ Native</span> | Natural language workflows |
| @-mentions | <span title="Native file path resolution">✅ Native</span> | File traceability |

**Deploy:**

```bash
aiwg use sdlc           # or: aiwg use all
claude .
```

### Factory AI 🤖 Full Auto-Deploy

The installer creates everything:

| Feature | Support | Details |
|---------|:-------:|---------|
| Droids | <span title="Deployed to .factory/droids/">🤖 Auto</span> | Auto-deployed, import once |
| Commands | <span title="Included in AGENTS.md by installer">🚀 Auto</span> | Included in AGENTS.md |
| Skills | <span title="Available skills auto-deploy">🔀 Partial</span> | Most auto-deploy |
| MCP Server | <span title="Reference MCP docs in prompts">📎 Ref</span> | Reference in prompts |
| Orchestration | <span title="Included in AGENTS.md by installer">🚀 Auto</span> | Included in AGENTS.md |

**Deploy:**

```bash
aiwg deploy --provider factory --mode sdlc
droid .
/droids → I → A → Enter  # One-time import
```

After import, everything works automatically.

### Warp Terminal 🖥️ Full Auto-Deploy

The installer creates and symlinks WARP.md:

| Feature | Support | Details |
|---------|:-------:|---------|
| Agents | <span title="Agent definitions included in WARP.md by installer">🚀 Inline</span> | Auto-included |
| Commands | <span title="Some work natively, most available via ref">⚡ Limited</span> | Some work natively |
| Skills | <span title="Reference skill files in prompts">📎 Ref</span> | Reference in prompts |
| MCP Server | <span title="Reference MCP docs in prompts">📎 Ref</span> | Reference in prompts |
| Orchestration | <span title="Symlinked to CLAUDE.md by installer">🚀 WARP.md</span> | Auto-symlinked |

**Deploy:**

```bash
aiwg deploy --platform warp
# WARP.md is automatically symlinked to CLAUDE.md
```

Both Warp and Claude Code see the same orchestration content.

### Cursor 📝 Full Auto-Deploy

The installer creates `.cursor/agents/` and `.cursorrules`:

| Feature | Support | Details |
|---------|:-------:|---------|
| Agents | <span title="Agents deployed to .cursor/agents/">🚀 Auto</span> | Auto-deployed |
| Commands | <span title="Reference command files in prompts">📎 Ref</span> | Reference in prompts |
| Skills | <span title="Reference skill files in prompts">📎 Ref</span> | Reference in prompts |
| MCP Server | <span title="Configure via MCP settings">⚙️ Config</span> | Configure if supported |
| Orchestration | <span title="Included in .cursorrules">🚀 Auto</span> | Auto-included |

**Deploy:**

```bash
aiwg deploy --platform cursor
```

### Windsurf 🌊 Full Auto-Deploy

The installer creates `.windsurfrules`:

| Feature | Support | Details |
|---------|:-------:|---------|
| Agents | <span title="Agents inline in .windsurfrules">🚀 Inline</span> | Inline in rules |
| Commands | <span title="Reference command files in prompts">📎 Ref</span> | Reference in prompts |
| Skills | <span title="Reference skill files in prompts">📎 Ref</span> | Reference in prompts |
| MCP Server | <span title="Configure via MCP settings">⚙️ Config</span> | Configure if supported |
| Orchestration | <span title="Included in .windsurfrules">🚀 Auto</span> | Auto-included |

**Deploy:**

```bash
aiwg deploy --platform windsurf
```

### OpenCode 💬 Full Auto-Deploy

The installer creates AGENTS.md:

| Feature | Support | Details |
|---------|:-------:|---------|
| Agents | <span title="Agents included in AGENTS.md by installer">🚀 Auto</span> | Auto-included |
| Commands | <span title="Commands included in AGENTS.md by installer">🚀 Auto</span> | Auto-included |
| Skills | <span title="Reference skill files in prompts">📎 Ref</span> | Reference in prompts |
| MCP Server | <span title="Configure via MCP settings if supported">⚙️ Config</span> | Configure if supported |
| Orchestration | <span title="Included in AGENTS.md by installer">🚀 Auto</span> | Auto-included |

**Deploy:**

```bash
aiwg deploy --provider openai --as-agents-md
```

### GitHub Copilot 🐙 Manual Setup

Copilot requires manual configuration:

| Feature | Support | Details |
|---------|:-------:|---------|
| Agents | <span title="Copy agent definitions to instructions file">📋 Manual</span> | Copy to instructions |
| Commands | <span title="Reference command files in prompts">📎 Ref</span> | Reference in prompts |
| Skills | <span title="Reference skill files in prompts">📎 Ref</span> | Reference in prompts |
| MCP Server | <span title="Reference MCP docs in prompts">📎 Ref</span> | Reference in prompts |
| Orchestration | <span title="Copy orchestration to instructions file">📋 Manual</span> | Copy to instructions |

**Setup:**

```bash
mkdir -p .github
cat CLAUDE.md >> .github/copilot-instructions.md
```

> ⚠️ **Note:** Copilot's context window is more limited. Include only essential guidance and reference AIWG files for detailed workflows.

## Using 📎 Ref Features

Features marked with 📎 work on any platform by referencing the file directly:

```text
# 🎤 Voice Framework
"Read @~/.local/share/ai-writing-guide/agentic/code/addons/voice-framework/voices/templates/technical-authority.yaml and apply that voice"

# 🏥 Workspace Health Skill
"Follow @~/.local/share/ai-writing-guide/agentic/code/addons/aiwg-utils/skills/workspace-health/SKILL.md to check my workspace"

# 📝 Requirements Template
"Use @~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/requirements/use-case-template.md to document this feature"
```

Any AI that can read files will understand and apply these. No setup required.

## Common Workflows (Any Platform)

### 🛡️ Security Review

```text
# Claude Code (native)
"Run security review"

# Other platforms
"Follow @~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/commands/flow-security-review-cycle.md"
```

### 🎤 Voice-Consistent Writing

```text
# Claude Code (native skill)
"Write in technical-authority voice"

# Other platforms
"Apply voice from @~/.local/share/ai-writing-guide/agentic/code/addons/voice-framework/voices/templates/technical-authority.yaml"
```

### 🏗️ Architecture Document

```text
# Claude Code (native orchestration)
"Create architecture baseline"

# Other platforms
"Use template @~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/analysis-design/software-architecture-doc-template.md"
```

## Deployment Summary

| Platform | Command | Auto-Creates |
|----------|---------|--------------|
| ✅ Claude Code | `aiwg use sdlc` | .claude/agents/, .claude/commands/, CLAUDE.md |
| 🤖 Factory AI | `aiwg deploy --provider factory` | .factory/droids/, AGENTS.md |
| 🖥️ Warp | `aiwg deploy --platform warp` | WARP.md (symlinked to CLAUDE.md) |
| 📝 Cursor | `aiwg deploy --platform cursor` | .cursor/agents/, .cursorrules |
| 🌊 Windsurf | `aiwg deploy --platform windsurf` | .windsurfrules |
| 💬 OpenCode | `aiwg deploy --as-agents-md` | AGENTS.md |
| 🐙 Copilot | Manual | .github/copilot-instructions.md |

## Next Steps

- [Claude Code Setup](#integrations-claude-code)
- [Factory AI Setup](#integrations-factory)
- [Warp Terminal Setup](#integrations-warp)
- [CLI Reference](#ref-cli)
