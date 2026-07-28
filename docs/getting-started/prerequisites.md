# Prerequisites

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

Before installing AIWG, ensure you have the following requirements.

## Required

### Node.js ≥20.0.0

```bash
node --version  # Should show v20.x.x or higher
npm --version
```

AIWG's package runtime supports Node 20 or newer. For new installs,
prefer the current LTS line, Node 24.

Contributor and release workflows have stricter npm requirements:

| Use case | Requirement | Why |
|----------|-------------|-----|
| Install and run AIWG | Node 20+ | Matches the package `engines.node` floor |
| Change dependencies or regenerate lockfiles | npm 11.5+ | Required for the committed `min-release-age=7` gate |
| Publish AIWG releases | Node 24 in the release workflow | Current npm 11.x plus npm trusted-publishing support |

Reuse a healthy Node version manager if one is already installed. Do not stack
`nvm`, `fnm`, `asdf`, `mise`, Volta, or another manager. If no manager exists,
the new-user defaults are `nvm-sh` on macOS, Linux, and WSL, and `nvm-windows`
on native Windows. See [Install Node.js and npm Safely](install-node.md) for
the platform-specific checks and official installation sources.

macOS users should start with the [macOS Install Guide](macos-install.md).
npm's own documentation recommends a Node version manager on macOS to avoid
global-package permission errors such as `EACCES` under `/usr/local/lib/node_modules`.

### AI Platform (Choose One or More)

| Platform | Best For | Install |
|----------|----------|---------|
| **Claude Code** | Multi-agent orchestration, artifact generation | [claude.ai/code](https://claude.ai/code) |
| **Warp Terminal** | Terminal-native AI, command-line workflows | [warp.dev](https://www.warp.dev/) |
| **Factory AI** | Custom droid workflows | [factory.ai](https://factory.ai/) |
| **Cursor** | IDE-native rules | [cursor.sh](https://cursor.sh/) |
| **GitHub Copilot** | GitHub integration | VS Code extension |

Deploy the complete system separately for each provider your team uses:

```bash
aiwg use all --provider claude
aiwg use all --provider warp
aiwg use all --provider factory
aiwg use all --provider cursor
```

## Platform Support Status

| Platform | Status | Notes |
|----------|--------|-------|
| **Claude Code** | ✅ Tested & Validated | Multi-agent orchestration, native plugins |
| **GitHub Copilot** | ✅ Tested & Validated | copilot-instructions.md |
| **Warp Terminal** | ✅ Tested & Validated | Terminal-native workflows |
| **Factory AI** | ✅ Tested & Validated | Native droid format, AGENTS.md |
| **OpenCode** | ✅ Tested & Validated | AGENTS.md |
| **Cursor** | ✅ Tested & Validated | Native rules format, AGENTS.md |
| **OpenAI/Codex** | ✅ Tested & Validated | Native prompts format, AGENTS.md |
| **Windsurf** | 🟡 Experimental | Should work, not validated |

## Operating Systems

| OS | Status |
|----|--------|
| **macOS** (Intel + Apple Silicon) | ✅ Supported |
| **Linux** (Ubuntu, Debian, Fedora, Arch, RHEL) | ✅ Supported |
| **WSL2** (Windows Subsystem for Linux) | ✅ Supported |
| **Native Windows** (PowerShell) | ✅ Supported |

## Optional (Recommended)

### Git

Required for `aiwg -new` project scaffolding and version control.

```bash
git --version

# Install if needed:
# macOS: brew install git
# Ubuntu: sudo apt-get install git
# Fedora: sudo dnf install git
```

## Quick Compatibility Check

```bash
# Check Node.js and npm
node --version && echo "Node.js present" || echo "Node.js missing"
npm --version && echo "npm present" || echo "npm missing"

# Check Claude Code (if using)
claude --version 2>/dev/null && echo "✅ Claude Code" || echo "ℹ️ Claude Code not installed"

# Check Factory AI (if using)
factory --version 2>/dev/null && echo "✅ Factory AI" || echo "ℹ️ Factory AI not installed"

# Check Git (optional)
git --version && echo "✅ Git" || echo "ℹ️ Git optional"
```

**All checks passed?** Continue to [Quick Start](../quickstart.md)
