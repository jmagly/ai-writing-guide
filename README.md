<div align="center">

# AIWG – Agentic AI Workflow Guide

Modular toolkit for AI-powered SDLC, marketing, and content workflows.

```bash
npm i -g aiwg        # install globally
aiwg use sdlc        # deploy SDLC framework
```

[![npm version](https://img.shields.io/npm/v/aiwg/latest?label=npm&color=CB3837&logo=npm&style=flat-square)](https://www.npmjs.com/package/aiwg)
[![npm downloads](https://img.shields.io/npm/dm/aiwg?color=CB3837&logo=npm&style=flat-square)](https://www.npmjs.com/package/aiwg)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/jmagly/ai-writing-guide?style=flat-square)](https://github.com/jmagly/ai-writing-guide/stargazers)

[**Get Started**](#-quick-start) · [**Documentation**](#-documentation) · [**Examples**](examples/) · [**Contributing**](CONTRIBUTING.md) · [**Community**](#-community--support)

[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white&style=flat-square)](https://discord.gg/BuAusFMxdA)
[![Telegram](https://img.shields.io/badge/Telegram-Join-26A5E4?logo=telegram&logoColor=white&style=flat-square)](https://t.me/+oJg9w2lE6A5lOGFh)

🌐 **Live demo & docs:** [https://aiwg.io](https://aiwg.io)

</div>

---

## 🚀 Quick Start

> **Prerequisites:** Node.js ≥18.0.0 and an AI platform (Claude Code, GitHub Copilot, Warp Terminal, or others). See [Prerequisites Guide](docs/getting-started/prerequisites.md) for details.

### Install & Deploy

```bash
# Install globally
npm install -g aiwg

# Deploy to your project
cd your-project
aiwg use sdlc              # Full SDLC framework
aiwg use marketing         # Marketing framework
aiwg use all               # All frameworks

# Or scaffold a new project
aiwg -new my-project
```

### Claude Code Plugin (Alternative)

```bash
/plugin marketplace add jmagly/ai-writing-guide
/plugin install sdlc@aiwg
```

> **Platform options:** `--provider warp`, `--provider factory`, `--provider cursor`, `--provider copilot`. See [Platform Integration](docs/integrations/) for details.

---

## ✨ What You Get

### Frameworks

| Framework | What it does |
|-----------|--------------|
| **[SDLC Complete](agentic/code/frameworks/sdlc-complete/)** | Full software development lifecycle with agents, commands, templates, and multi-agent orchestration |
| **[Media/Marketing Kit](agentic/code/frameworks/media-marketing-kit/)** | Complete marketing campaign management from strategy to analytics |

### Addons

| Addon | What it does |
|-------|--------------|
| **[Writing Quality](agentic/code/addons/writing-quality/)** | Content validation, AI pattern detection, voice profiles |
| **[Testing Quality](agentic/code/addons/testing-quality/)** | TDD enforcement, mutation testing, flaky test detection |
| **[Voice Framework](agentic/code/addons/voice-framework/)** | 4 built-in voice profiles with create/blend/apply skills |

### Reliability Patterns

- **[Ralph Loop](docs/ralph-guide.md)** — Iterative task execution with automatic recovery
- **[Agent Design Bible](docs/AGENT-DESIGN.md)** — 10 Golden Rules based on academic research
- **[@-Mention Traceability](docs/CLI_USAGE.md#-mention-utilities)** — Wire live doc references in code
- **[Production-Grade Guide](docs/production-grade-guide.md)** — Research-backed failure mode mitigations

---

## 🎬 See It In Action

```bash
# Generate project intake
/intake-wizard "Build customer portal with real-time chat"

# Phase transition with automated gate check
/flow-inception-to-elaboration

# Iterative task execution - "iteration beats perfection"
/ralph "Fix all failing tests" --completion "npm test passes"

# Long-running tasks with crash recovery (6-8 hours)
/ralph-external "Migrate to TypeScript" --completion "npx tsc --noEmit exits 0"

# Deploy to production
/flow-deploy-to-production
```

Voice transformation:

```bash
"Apply technical-authority voice to docs/architecture.md"
"Create a voice profile based on our existing blog posts"
```

See [Examples](examples/) for before/after rewrites and workflow demonstrations.

---

## 🛠️ Platform Support

| Platform | Status | Command |
|----------|--------|---------|
| **Claude Code** | ✅ Tested | `aiwg use sdlc` (default) |
| **GitHub Copilot** | ✅ Tested | `aiwg use sdlc --provider copilot` |
| **Warp Terminal** | ✅ Tested | `aiwg use sdlc --provider warp` |
| **Factory AI** | ✅ Tested | `aiwg use sdlc --provider factory` |
| **Cursor** | ✅ Tested | `aiwg use sdlc --provider cursor` |
| **OpenCode** | ✅ Tested | `aiwg use sdlc --provider opencode` |
| **OpenAI/Codex** | ✅ Tested | `aiwg use sdlc --provider openai` |
| **Windsurf** | 🟡 Experimental | `aiwg use sdlc --provider windsurf` |

See [Platform Integration Guides](docs/integrations/) for setup instructions.

---

## 📚 Documentation

### Getting Started

- **[Quick Start Guide](USAGE_GUIDE.md)** — Context selection and basic usage
- **[Prerequisites](docs/getting-started/prerequisites.md)** — Node.js, AI platforms, OS support
- **[CLI Reference](docs/CLI_USAGE.md)** — All `aiwg` commands

### Platform Guides

- **[Claude Code](docs/integrations/claude-code-quickstart.md)** — 5-10 min setup
- **[Warp Terminal](docs/integrations/warp-terminal-quickstart.md)** — 3-5 min setup
- **[Factory AI](docs/integrations/factory-quickstart.md)** — 5-10 min setup
- **[Cursor](docs/integrations/cursor-quickstart.md)** — 5-10 min setup
- **[All Integrations](docs/integrations/)**

### Framework Documentation

- **[SDLC Framework](agentic/code/frameworks/sdlc-complete/README.md)** — Agents, commands, templates, flows
- **[Marketing Kit](agentic/code/frameworks/media-marketing-kit/README.md)** — Campaign lifecycle guide
- **[Voice Framework](agentic/code/addons/voice-framework/)** — Voice profiles and skills

### Advanced Topics

- **[Ralph Loop](docs/ralph-guide.md)** — Iterative task execution with crash recovery
- **[Workspace Architecture](docs/architecture/workspace-architecture.md)** — Multi-framework isolation
- **[Multi-Agent Orchestration](agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md)** — Parallel reviews and synthesis
- **[MCP Server](docs/mcp/)** — Model Context Protocol integration
- **[Agent Design Bible](docs/AGENT-DESIGN.md)** — Best practices for agent creation

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Quick contributions:**
- Found an AI pattern? [Open an issue](https://github.com/jmagly/ai-writing-guide/issues/new)
- Have a better rewrite? Submit a PR to `examples/`
- Want to add an agent? Use `docs/development/agent-template.md`

---

## 💬 Community & Support

- 🌐 **Website:** [aiwg.io](https://aiwg.io)
- 💬 **Discord:** [Join Server](https://discord.gg/BuAusFMxdA)
- 📱 **Telegram:** [Join Group](https://t.me/+oJg9w2lE6A5lOGFh)
- 🐛 **Issues:** [GitHub Issues](https://github.com/jmagly/ai-writing-guide/issues)
- 💡 **Discussions:** [GitHub Discussions](https://github.com/jmagly/ai-writing-guide/discussions)

---

## 💡 Usage Notes

AIWG is optimized for token efficiency. Most users on **Claude Pro** or similar plans will have no issues. See [Usage Notes](docs/usage-notes.md) for rate limit guidance.

---

## 📄 License

**MIT License** — Free to use, modify, and distribute. See [LICENSE](LICENSE).

**Important:** This framework does not provide legal, security, or financial advice. All generated content should be reviewed before use. See [TERMS.md](TERMS.md) for full disclaimers.

---

## ❤️ Sponsors

<table>
<tr>
<td width="33%" align="center">

### [Roko Network](https://roko.network)

**The Temporal Layer for Web3**

Enterprise-grade timing infrastructure for blockchain applications.

</td>
<td width="33%" align="center">

### [Selfient](https://selfient.xyz)

**No-Code Smart Contracts for Everyone**

Making blockchain-based agreements accessible to all.

</td>
<td width="33%" align="center">

### [Integro Labs](https://integrolabs.io)

**AI-Powered Automation Solutions**

Custom AI and blockchain solutions for the digital age.

</td>
</tr>
</table>

**Interested in sponsoring?** [Contact us](https://github.com/jmagly/ai-writing-guide/discussions)

---

## 🙏 Acknowledgments

Built with inspiration from [Hemingway Editor](https://hemingwayapp.com/), RUP/ITIL/Agile methodologies, multi-agent orchestration research, and [Skill Seekers](https://github.com/yusufkaraaslan/Skill_Seekers) (MIT).

Thanks to Anthropic (Claude Code), Warp, and Factory AI for building the platforms that make this possible.

---

<div align="center">

**[⬆ Back to Top](#aiwg--agentic-ai-workflow-guide)**

Made with ☕ and 🤖 by [Joseph Magly](https://github.com/jmagly)

</div>
