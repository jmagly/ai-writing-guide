<div align="center">

# AIWG

**Cognitive architecture for AI-augmented software development**

```bash
npm i -g aiwg        # install globally
aiwg use sdlc        # deploy SDLC framework
```

[![npm version](https://img.shields.io/npm/v/aiwg/latest?label=npm&color=CB3837&logo=npm&style=flat-square)](https://www.npmjs.com/package/aiwg)
[![npm downloads](https://img.shields.io/npm/dm/aiwg?color=CB3837&logo=npm&style=flat-square)](https://www.npmjs.com/package/aiwg)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/jmagly/ai-writing-guide?style=flat-square)](https://github.com/jmagly/aiwg/stargazers)

[**Get Started**](#-quick-start) · [**Documentation**](#-documentation) · [**Examples**](examples/) · [**Contributing**](CONTRIBUTING.md) · [**Community**](#-community--support)

[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white&style=flat-square)](https://discord.gg/BuAusFMxdA)
[![Telegram](https://img.shields.io/badge/Telegram-Join-26A5E4?logo=telegram&logoColor=white&style=flat-square)](https://t.me/+oJg9w2lE6A5lOGFh)

</div>

---

## What AIWG Actually Is

AIWG is a cognitive architecture that provides AI coding assistants with structured memory, ensemble validation, and closed-loop self-correction. Unlike simple prompt libraries or ad-hoc workflows, AIWG implements research-backed patterns for multi-agent coordination, reproducible execution, and FAIR-aligned artifact management. The system addresses fundamental challenges in AI-augmented development: recovery from failures, maintaining context across sessions, preventing hallucinated citations, and ensuring workflow reproducibility. These capabilities position AIWG closer to cognitive architectures like SOAR and ACT-R, adapted for large language model orchestration, than to conventional AI development tools.

---

## Why This Matters

### For Practitioners

**Turn unpredictable AI assistance into reliable, auditable workflows.** Research shows 47% of AI workflows produce inconsistent results without reproducibility constraints. AIWG implements closed-loop self-correction, human-in-the-loop validation (reducing costs by 84%), and retrieval-first citation architecture (eliminating the 56% hallucination rate of generation-only approaches). The `.aiwg/` artifact directory provides persistent memory across sessions, ensuring context isn't lost when your AI assistant restarts.

### For Researchers

**Standards-aligned implementation of multi-agent systems and reproducibility frameworks.** AIWG operationalizes FAIR Principles (endorsed by G20, EU, NIH), implements OAIS-inspired archival lifecycles (ISO 14721), and uses W3C PROV for provenance tracking. The framework provides a testbed for studying human-AI collaboration patterns, ensemble validation effectiveness, and cognitive load optimization in AI-augmented workflows. All artifacts are structured for analysis and citation export.

### For Executives

**Risk reduction through governance-ready AI workflows.** AIWG provides audit trails (W3C PROV provenance chains), quality gates (GRADE-style evidence assessment), and deterministic execution modes. The system implements stage-gate processes familiar from Cooper's methodology, ensuring predictable phase transitions and milestone tracking. Standards adopted by 100+ organizations (WHO, Cochrane, NICE) back the quality assessment approach. Human validation checkpoints ensure AI outputs meet enterprise quality standards before production deployment.

---

## Research Foundations

AIWG's architecture is informed by established research across cognitive science, software engineering, and AI systems. The cognitive load optimization follows Miller's "7±2" limits and Sweller's worked examples approach. Multi-agent ensemble validation implements mixture-of-experts patterns from Jacobs et al. The closed-loop self-correction design addresses the finding that recovery capability—not initial correctness—dominates agentic task success. Research management implements FAIR Principles with 17,000+ citations and institutional backing from G20, EU Horizon 2020, and NIH. The retrieval-first citation architecture eliminates hallucination by grounding all references in verified sources rather than generative recall.

Full research background, citations, and methodology available in [docs/research/](docs/research/).

---

## Core Capabilities

### 1. Structured Semantic Memory

Persistent artifact repository (`.aiwg/`) maintaining project knowledge across sessions. Implements retrieval-augmented generation patterns to prevent context loss when AI assistants restart or hit token limits.

### 2. Multi-Agent Ensemble Validation

Specialized agents (Test Engineer, Security Auditor, API Designer) provide domain expertise with coordinated review and synthesis. Mixture-of-experts architecture enables parallel evaluation and quality gates.

### 3. Closed-Loop Self-Correction

Ralph loop implements iterative execution with automatic error recovery. Research shows recovery capability is more important than initial correctness for agentic task success. Supports both short sessions (minutes) and long-running operations (6-8 hours with crash recovery).

### 4. Bidirectional Traceability

@-mention system links requirements, architecture, implementation, and tests. Enables impact analysis, compliance auditing, and change propagation tracking per IEEE 830 and DO-178C standards.

### 5. Stage-Gate Process Management

Phase-gated workflows (Inception → Elaboration → Construction → Transition → Production) with milestone tracking and quality checkpoints. Implements Cooper's stage-gate methodology adapted for AI-augmented development.

### 6. FAIR-Aligned Artifact Management

Research corpus management with persistent identifiers (REF-XXX system), W3C PROV provenance tracking, and GRADE-style quality assessment. Ensures findable, accessible, interoperable, and reusable project artifacts.

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
aiwg use media-curator     # Media archive management
aiwg use rlm               # RLM addon (recursive context decomposition)
aiwg use all               # All frameworks

# Or scaffold a new project
aiwg new my-project
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
| **[SDLC Complete](agentic/code/frameworks/sdlc-complete/)** | Full software development lifecycle with 70+ agents, commands, templates, and multi-agent orchestration |
| **[Media/Marketing Kit](agentic/code/frameworks/media-marketing-kit/)** | Complete marketing campaign management from strategy to analytics |
| **[Media Curator](agentic/code/frameworks/media-curator/)** | Intelligent media archive management — discography analysis, acquisition, quality filtering, metadata curation, and multi-platform export |
| **[Research Complete](agentic/code/frameworks/research-complete/)** | Academic research workflow — discovery, acquisition, RAG-based documentation, and citation management |

### Addons

| Addon | What it does |
|-------|--------------|
| **[RLM](agentic/code/addons/rlm/)** | Recursive context decomposition for processing 10M+ tokens via sub-agent delegation |
| **[Writing Quality](agentic/code/addons/writing-quality/)** | Content validation, AI pattern detection, voice profiles |
| **[Testing Quality](agentic/code/addons/testing-quality/)** | TDD enforcement, mutation testing, flaky test detection |
| **[Voice Framework](agentic/code/addons/voice-framework/)** | 4 built-in voice profiles with create/blend/apply skills |

### Reliability Patterns

- **[Ralph Loop](docs/ralph-guide.md)** — Iterative task execution with automatic recovery
- **[Agent Design Bible](docs/AGENT-DESIGN.md)** — 10 Golden Rules based on academic research
- **[@-Mention Traceability](docs/mention-utilities.md)** — Wire live doc references in code
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

# Process massive codebases with recursive decomposition
/rlm-query "src/**/*.ts" "Extract all exported interfaces" --model haiku
/rlm-batch "src/components/*.tsx" "Add TypeScript types" --parallel 4

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
- **[CLI Reference](docs/cli-reference.md)** — All 40 `aiwg` commands with examples

### By Audience Level

**Practitioners:**
- [Quick Start Guide](USAGE_GUIDE.md) — Hands-on workflows
- [Ralph Loop Guide](docs/ralph-guide.md) — Iterative execution
- [Platform Guides](docs/integrations/) — 5-10 minute setup

**Technical Leaders:**
- [Extension System Overview](docs/extensions/overview.md) — Architecture and capabilities
- [Workspace Architecture](docs/architecture/workspace-architecture.md) — Multi-framework isolation
- [Multi-Agent Orchestration](agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md) — Ensemble patterns

**Researchers & Evaluators:**
- [Research Background](docs/research/) — Literature review and citations
- [Glossary](docs/research/glossary.md) — Professional terminology mapping
- [Production-Grade Guide](docs/production-grade-guide.md) — Failure mode mitigation

### Platform Guides

- **[Claude Code](docs/integrations/claude-code-quickstart.md)** — 5-10 min setup
- **[Warp Terminal](docs/integrations/warp-terminal-quickstart.md)** — 3-5 min setup
- **[Factory AI](docs/integrations/factory-quickstart.md)** — 5-10 min setup
- **[Cursor](docs/integrations/cursor-quickstart.md)** — 5-10 min setup
- **[All Integrations](docs/integrations/)**

### Framework Documentation

- **[SDLC Framework](agentic/code/frameworks/sdlc-complete/README.md)** — Agents, commands, templates, flows
- **[Marketing Kit](agentic/code/frameworks/media-marketing-kit/README.md)** — Campaign lifecycle guide
- **[Media Curator](agentic/code/frameworks/media-curator/README.md)** — Media archive management
- **[Research Complete](agentic/code/frameworks/research-complete/README.md)** — Research workflows
- **[Voice Framework](agentic/code/addons/voice-framework/)** — Voice profiles and skills

### Extension System

AIWG's unified extension system enables dynamic discovery, semantic search, and cross-platform deployment:

- **[Extension System Overview](docs/extensions/overview.md)** — Architecture and capabilities
- **[Creating Extensions](docs/extensions/creating-extensions.md)** — Build custom agents, commands, skills
- **[Extension Types Reference](docs/extensions/extension-types.md)** — Complete type definitions

**Extension types:**
- **Agents** (70+): Specialized AI personas (API Designer, Test Engineer, Security Auditor)
- **Commands** (31): CLI and slash commands (`aiwg use sdlc`, `/mention-wire`)
- **Skills**: Natural language workflows (project awareness, voice application)
- **Hooks**: Lifecycle event handlers (pre-session, post-write)
- **Tools**: External utilities (git, jq, npm)
- **Frameworks**: Complete workflows (SDLC, Marketing)
- **Addons**: Feature bundles (Voice, Testing Quality)

### Advanced Topics

- **[Ralph Loop](docs/ralph-guide.md)** — Iterative task execution with crash recovery
- **[RLM Addon](agentic/code/addons/rlm/README.md)** — Recursive context decomposition for 10M+ token processing
- **[Daemon Mode](docs/daemon-guide.md)** — Background file watching, cron scheduling, IPC
- **[Messaging Integration](docs/messaging-guide.md)** — Bidirectional Slack, Discord, and Telegram bots
- **[Workspace Architecture](docs/architecture/workspace-architecture.md)** — Multi-framework isolation
- **[Multi-Agent Orchestration](agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md)** — Parallel reviews and synthesis
- **[MCP Server](docs/mcp/)** — Model Context Protocol integration
- **[Agent Design Bible](docs/AGENT-DESIGN.md)** — Best practices for agent creation

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Quick contributions:**
- Found an AI pattern? [Open an issue](https://github.com/jmagly/aiwg/issues/new)
- Have a better rewrite? Submit a PR to `examples/`
- Want to add an agent? Use `docs/development/agent-template.md`

---

## 💬 Community & Support

- 🌐 **Website:** [aiwg.io](https://aiwg.io)
- 💬 **Discord:** [Join Server](https://discord.gg/BuAusFMxdA)
- 📱 **Telegram:** [Join Group](https://t.me/+oJg9w2lE6A5lOGFh)
- 🐛 **Issues:** [GitHub Issues](https://github.com/jmagly/aiwg/issues)
- 💡 **Discussions:** [GitHub Discussions](https://github.com/jmagly/aiwg/discussions)

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

**Interested in sponsoring?** [Contact us](https://github.com/jmagly/aiwg/discussions)

---

## 🙏 Acknowledgments

**Research foundations:** Built on established principles from cognitive science (Miller 1956, Sweller 1988), multi-agent systems (Jacobs et al. 1991), software engineering (Cooper 1990), and recent AI systems research. Implements standards from FAIR Principles, OASIS archival model (ISO 14721), W3C PROV, GRADE evidence assessment, and MCP protocol (Linux Foundation).

**Inspiration:** Hemingway Editor's clarity-first approach, RUP/ITIL/Agile methodologies, and [Skill Seekers](https://github.com/yusufkaraaslan/Skill_Seekers) (MIT).

**Platforms:** Thanks to Anthropic (Claude Code), Warp, and Factory AI for building the platforms that enable this work.

---

<div align="center">

**[⬆ Back to Top](#aiwg)**

Made with ☕ and 🤖 by [Joseph Magly](https://github.com/jmagly)

</div>
