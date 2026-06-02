# Prerequisites

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

**Installation options:**

| Platform | Command |
|----------|---------|
| **macOS (recommended)** | `nvm install 24 && nvm use 24` |
| **macOS (Homebrew)** | `brew install node@24` |
| **Ubuntu/Debian** | `curl -fsSL https://deb.nodesource.com/setup_24.x \| sudo -E bash - && sudo apt-get install -y nodejs` |
| **Fedora/RHEL** | `curl -fsSL https://rpm.nodesource.com/setup_24.x \| sudo bash - && sudo dnf install -y nodejs` |
| **NVM (All platforms)** | `nvm install 24 && nvm use 24` |
| **Windows** | Use WSL2, then follow Ubuntu instructions |

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

**Use multiple platforms for best results:**

```bash
aiwg use sdlc                      # Claude Code (default)
aiwg use sdlc --provider warp      # Warp Terminal
aiwg use sdlc --provider factory   # Factory AI
aiwg use sdlc --provider cursor    # Cursor IDE
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
| **Native Windows** (PowerShell/CMD) | ❌ Not supported — Use WSL2 |

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
