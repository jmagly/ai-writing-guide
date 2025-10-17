<div align="center">

# 🎯 AI Writing Guide

### Write like a human. Build like a pro.

**An agent toolset and prompting framework for authentic AI-generated content, structured software development, and process automation**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.20.8-brightgreen)](https://nodejs.org)
[![GitHub Stars](https://img.shields.io/github/stars/jmagly/ai-writing-guide?style=social)](https://github.com/jmagly/ai-writing-guide/stargazers)

[**Get Started**](#-quick-start) · [**Prerequisites**](#-prerequisites) · [**Documentation**](#-documentation) · [**Examples**](examples/) · [**Contributing**](#-contributing)

</div>

---

## 🚀 Quick Start

> **⚠️ IMPORTANT NOTICES**
>
> **Framework Scope:** This is an **agent toolset and prompting framework** for process automation. Current features: **Writing Quality utilities** and **SDLC Complete framework**. Future: Many additional process types (see roadmap). Prompts function as executable software within agentic environments.
>
> **Early Access / Active Testing:** This framework is in active development and validation (Phase 1: 0-3 months). Expect breaking changes, incomplete features, and evolving documentation. **Not recommended for production-critical projects without thorough testing.**
>
> **API Costs Warning:** Multi-agent workflows generate extensive prompts and large document outputs (5,000-15,000 words per workflow). This framework **requires Claude Pro or enterprise accounts** with high usage limits. **Estimated costs:** $20-50/month for moderate usage (10-20 workflows). [See cost guidance →](#-cost-considerations)
>
> **Rate Limits:** Agentic tools handle rate limits and retries automatically. No manual timeout management required.
>
> **Version Control:** Document rollback is **optional** and user-controlled. Enable by committing `.aiwg/` artifacts to git, or add `.aiwg/` to `.gitignore` for local-only use.
>
> **AS-IS License:** Provided under MIT License with NO WARRANTY. Use at your own risk. [Read full disclaimer →](#-license--disclaimer)
>
> ---
>
> **📋 Prerequisites:** Node.js ≥18.20.8 and Claude Code installed. [See setup instructions](#-prerequisites) if you need help getting started.

**Install in 30 seconds** — One command. Zero configuration.

```bash
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash
```

**Activate on your project** — Deploy agents and start using immediately:

```bash
cd your-project
aiwg -deploy-agents        # Adds AI agents to .claude/agents/
aiwg -deploy-commands      # Adds workflow commands to .claude/commands/
```

**Start a new project** — Full SDLC scaffolding in seconds:

```bash
aiwg -new my-awesome-project
cd my-awesome-project
# Ready to go! Intake forms, agents, and commands deployed.
```

> **💡 What just happened?** You now have 61 specialized AI agents and 45+ workflow commands ready to help you write better content, manage projects, and ship faster.

---

## ✨ What You Get

<table>
<tr>
<td width="50%">

### 📝 **Writing Quality Framework**

**Remove AI tells. Write authentically.**

- ✅ **Banned patterns library** — 100+ AI clichés to avoid
- ✅ **Before/after examples** — Real rewrites showing the difference
- ✅ **3 specialized agents** — Validate, optimize, diversify content
- ✅ **Quick-reference guides** — For technical, executive, academic voices

**Perfect for:**
- Content creators removing AI detection patterns
- Developers documenting projects professionally
- Teams maintaining consistent writing standards

</td>
<td width="50%">

### 🏗️ **SDLC Complete Framework**

**Manage projects like an enterprise. Scale like a startup.**

- ✅ **58 SDLC agents** — Requirements, architecture, testing, security, deployment
- ✅ **45+ workflow commands** — Intake, phase gates, risk management, compliance
- ✅ **156 templates** — Every artifact from concept to production
- ✅ **Multi-agent orchestration** — Parallel reviews, synthesis, automated quality gates

**Perfect for:**
- Solo developers needing structure without overhead
- Small teams scaling from 1 to 10+ developers
- Enterprise projects requiring compliance and audit trails

</td>
</tr>
</table>

---

## 🎬 See It In Action

### Writing Quality: Before & After

<details>
<summary><strong>❌ AI-Generated (Detected)</strong></summary>

```markdown
In today's rapidly evolving landscape of artificial intelligence,
it's worth noting that leveraging cutting-edge solutions can
significantly enhance your workflow. Our comprehensive approach
delves into the intricacies of modern development paradigms...
```

**Problems:** Vague claims, buzzwords, no specifics, formulaic structure

</details>

<details>
<summary><strong>✅ Human-Authentic (Validated)</strong></summary>

```markdown
AI code assistants save developers 30-40% of their time on
boilerplate and documentation. But they introduce a new problem:
detecting and removing performative language that screams "I was
written by ChatGPT."

This framework solves that. 485 documents, 19 validation rules,
100+ banned phrases. Ship faster. Write better.
```

**Improvements:** Specific metrics, concrete problem, direct solution, natural voice

</details>

### SDLC Workflow: Inception → Production

```bash
# 1. Generate project intake (5 minutes, replaces 2-4 hours manual work)
/project:intake-wizard "Build customer portal with real-time chat"

# 2. Validate vision and approve phase transition (automated gate check)
/project:flow-inception-to-elaboration

# 3. Generate architecture document with multi-agent review
#    (Primary Author → 4 Parallel Reviewers → Synthesizer → Baseline)
"Create Software Architecture Document"

# 4. Execute dual-track iteration (Discovery + Delivery in parallel)
/project:flow-iteration-dual-track 3

# 5. Deploy to production with automated rollback strategy
/project:flow-deploy-to-production
```

**Time Savings:** 20-98% reduction across 5 core use cases. See [Use Case Briefs](.aiwg/requirements/use-case-briefs/) for quantified ROI.

---

## 📦 What's Inside

### Core Framework

```text
ai-writing-guide/
├── 📝 Writing Quality (Remove AI tells) — CURRENT
│   ├── core/           → Philosophy and sophistication principles
│   ├── validation/     → Banned patterns, detection markers
│   ├── examples/       → Before/after rewrites
│   ├── context/        → Quick-reference for different voices
│   └── patterns/       → Common AI tells and avoidance strategies
│
├── 🤖 General Agents (3 writing-focused) — CURRENT
│   ├── writing-validator      → Validate content against AI patterns
│   ├── prompt-optimizer       → Improve prompts using AIWG principles
│   └── content-diversifier    → Generate varied examples/perspectives
│
├── 🏗️ SDLC Complete (Enterprise-grade lifecycle management) — CURRENT
│   ├── agents/ (58)           → Requirements, architecture, testing, security, DevOps
│   ├── commands/ (45+)        → Intake, phase gates, deployments, compliance
│   ├── templates/ (156)       → Every artifact from concept → production
│   ├── flows/                 → Phase-based workflows (Inception → Transition)
│   ├── add-ons/               → GDPR compliance, legal frameworks
│   └── artifacts/             → Sample projects (complete lifecycle examples)
│
├── 🔮 Future Process Frameworks — PLANNED (see roadmap)
│   ├── agentic/code/frameworks/business-process/    → Business analysis workflows
│   ├── agentic/code/frameworks/content-strategy/    → Content planning & creation
│   ├── agentic/code/frameworks/research-synthesis/  → Research & analysis
│   └── agentic/code/frameworks/decision-making/     → Decision frameworks & matrices
│
└── 🛠️ Development Tools
    ├── install/       → One-line installer + CLI
    ├── agents/        → Deployment automation
    ├── manifest/      → Documentation tracking
    └── lint/          → Markdown quality enforcement
```

### Agent Catalog Highlights

**Requirements & Planning:**
- `requirements-analyst` — Transform vague ideas into detailed specs
- `system-analyst` — Bridge business intent and technical delivery
- `intake-coordinator` — Validate intake forms and assign agents

**Architecture & Design:**
- `architecture-designer` — Design scalable, maintainable systems
- `api-designer` — Design and evolve API contracts
- `cloud-architect` — Multi-cloud infrastructure design (AWS/Azure/GCP)

**Quality & Testing:**
- `test-engineer` — Comprehensive test suites (unit, integration, E2E)
- `code-reviewer` — Focus on quality, security, performance
- `performance-engineer` — Profile bottlenecks, optimize queries

**Security & Compliance:**
- `security-gatekeeper` — Enforce security gates before release
- `security-auditor` — OWASP compliance, vulnerability scanning
- `privacy-officer` — GDPR/CCPA/HIPAA compliance
- `accessibility-specialist` — WCAG 2.1 AA/AAA compliance

**Operations & DevOps:**
- `devops-engineer` — CI/CD pipelines, infrastructure as code
- `incident-responder` — Production incident triage and resolution
- `reliability-engineer` — SLO/SLI definition, capacity planning
- `deployment-manager` — Release planning and operational readiness

[**See all 61 agents →**](docs/agents/README.md)

---

## 🎯 Who Is This For?

<table>
<tr>
<td width="33%">

### 👤 Solo Developers

**You wear all the hats. We provide the structure.**

- Start projects in minutes (not hours)
- Generate intake/architecture docs automatically
- Validate quality with multi-agent reviews
- Ship faster without sacrificing rigor

**Time Investment:** 8-10 hrs/week sustainable

</td>
<td width="33%">

### 👥 Small Teams (2-10)

**Scale from chaos to process without heavyweight tools.**

- Standardize artifacts across team
- Automated phase gates prevent rework
- Clear handoffs between roles
- Audit trail for compliance

**Scales From:** 1 solo dev → 10+ team members

</td>
<td width="33%">

### 🏢 Enterprise Teams

**Comprehensive lifecycle management. Zero vendor lock-in.**

- Full Inception → Production coverage
- Compliance-ready (GDPR, SOC2, HIPAA add-ons)
- Multi-agent orchestration patterns
- Self-hosted, zero data collection

**Support:** Fortune 500 → boutique agencies

</td>
</tr>
</table>

---

## 🧩 Use Cases

### Use Case 1: Remove AI Detection Patterns

**Problem:** ChatGPT wrote your docs. Everyone can tell.

**Solution:** Validate content against 100+ banned patterns, get before/after rewrites.

```bash
# Deploy writing-validator agent
aiwg -deploy-agents --mode general

# Validate any document
"Check this document for AI patterns: docs/architecture.md"
```

**Time Saved:** 56-63% (56-126 minutes → 30-45 minutes)

---

### Use Case 2: Deploy Full SDLC Framework (2 Minutes)

**Problem:** Copying templates manually takes 6+ hours. You do it once and never update them.

**Solution:** One command deploys 58 agents + 45 commands + 156 templates.

```bash
aiwg -deploy-agents --mode sdlc
```

**Time Saved:** 98% (6 hours → 10 seconds)

---

### Use Case 3: Generate Intake From Existing Codebase

**Problem:** Brownfield project. No docs. Need to baseline for new team members.

**Solution:** Analyze codebase, generate comprehensive intake automatically.

```bash
/project:intake-from-codebase .
```

**Output:** Project intake, solution profile, option matrix (3 documents, 5,000+ words)

**Time Saved:** 81-85% (2-3.5 hours → 20-35 minutes)

---

### Use Case 4: Multi-Agent Architecture Review

**Problem:** Architecture docs need multiple perspectives (security, testing, operations).

**Solution:** Orchestrate parallel reviews, synthesize feedback, baseline artifact.

```bash
"Create Software Architecture Document with multi-agent review"
```

**Workflow:** Primary Author → 4 Parallel Reviewers → Synthesizer → Baseline

**Time Saved:** 92-96% (9-15 hours → 45-60 minutes)

---

### Use Case 5: Framework Self-Improvement Loop

**Problem:** Framework needs dogfooding. How do you use SDLC tools to improve SDLC tools?

**Solution:** Use framework on itself. Generate artifacts, track velocity, iterate.

**Current Status:** 100% Inception artifact coverage (vision, business case, risks, architecture)

**Meta-Validation:** If the framework can manage itself, it can manage your project.

**Time Saved:** 20-30% overhead reduction per iteration (5-8 hours → 3-5 hours)

---

## 🛠️ Installation & Setup

### Method 1: One-Line Install (Recommended)

**Install to `~/.local/share/ai-writing-guide` and activate CLI:**

```bash
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash
```

**Verify installation:**

```bash
aiwg -version
```

**Auto-updates:** CLI auto-updates before every command (always latest version).

---

### Method 2: Manual Clone

**Clone repository directly:**

```bash
git clone https://github.com/jmagly/ai-writing-guide.git ~/.local/share/ai-writing-guide
cd ~/.local/share/ai-writing-guide
```

**Use tools directly:**

```bash
# Deploy agents
node tools/agents/deploy-agents.mjs --target /path/to/project --mode both

# Scaffold new project
node tools/install/new-project.mjs --name my-project

# Prefill SDLC cards
node tools/cards/prefill-cards.mjs --target artifacts/my-project --team team.yaml --write
```

---

## 📋 Prerequisites

Before installing, ensure you have the following requirements. This framework is currently **tested and optimized for Claude Code**. Support for other platforms is in development.

### Required

#### 1. Node.js ≥18.20.8 (LTS: Hydrogen)

**Check if you have Node.js:**

```bash
node --version  # Should show v18.20.8 or higher
```

**Don't have Node.js?** Choose your installation method:

<details>
<summary><strong>📦 macOS (Homebrew)</strong></summary>

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js LTS
brew install node@18
```

[**Official Homebrew docs →**](https://brew.sh/)

</details>

<details>
<summary><strong>📦 Linux (NodeSource)</strong></summary>

**Ubuntu/Debian:**

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs
```

**Fedora/RHEL:**

```bash
# Add NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -

# Install Node.js
sudo dnf install -y nodejs
```

[**NodeSource installation guide →**](https://github.com/nodesource/distributions)

</details>

<details>
<summary><strong>📦 Windows (WSL2 Required)</strong></summary>

**Step 1: Install WSL2**

```powershell
# Run in PowerShell as Administrator
wsl --install
```

**Step 2: Install Node.js in WSL2**

```bash
# Open WSL2 terminal
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

[**WSL2 installation guide →**](https://learn.microsoft.com/en-us/windows/wsl/install)

</details>

<details>
<summary><strong>📦 NVM (Node Version Manager) - All Platforms</strong></summary>

**Install NVM:**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

**Install Node.js 18:**

```bash
nvm install 18
nvm use 18
nvm alias default 18
```

**Verify:**

```bash
node --version  # Should show v18.x.x
```

[**NVM installation guide →**](https://github.com/nvm-sh/nvm#installing-and-updating)

</details>

---

#### 2. Claude Code (Primary Platform)

**Currently Required:** This framework is **actively tested with Claude Code**. Other platforms (OpenAI/Codex, Cursor, Windsurf, Zed) are supported via `--provider` flags but not fully validated yet.

**Install Claude Code:**

1. **Download:** Visit [claude.ai/code](https://claude.ai/code)
2. **Sign up/Login:** Create an Anthropic account or login
3. **Install CLI:** Follow platform-specific instructions (macOS, Linux, Windows)

**Verify Installation:**

```bash
# Check Claude Code is installed
claude --version
```

[**Claude Code documentation →**](https://docs.claude.com/claude-code)

---

### Platform Support Status

| Platform | Status | Provider Flag | Notes |
|----------|--------|---------------|-------|
| **Claude Code** | ✅ **Tested & Validated** | (default) | Primary development platform |
| **OpenAI/Codex** | 🟡 Experimental | `--provider openai` | Functional but not fully tested |
| **Cursor** | 🟡 Experimental | (Claude-compatible) | Should work, not validated |
| **Windsurf** | 🟡 Experimental | (Claude-compatible) | Should work, not validated |
| **Zed** | 🟡 Experimental | (Claude-compatible) | Should work, not validated |

**Want to help?** We're actively seeking beta testers for other platforms! [Open a discussion](https://github.com/jmagly/ai-writing-guide/discussions) if you're interested.

---

### Operating Systems

**Fully Supported:**
- ✅ **macOS** (Intel + Apple Silicon)
- ✅ **Linux** (Ubuntu, Debian, Fedora, Arch, RHEL)
- ✅ **WSL2** (Windows Subsystem for Linux)

**Not Supported:**
- ❌ Native Windows (PowerShell/CMD) — Use WSL2 instead

---

### Optional (Recommended)

**Git:** Required for `aiwg -new` project scaffolding and version control.

```bash
# Check if you have Git
git --version

# Install Git (if needed)
# macOS (Homebrew)
brew install git

# Ubuntu/Debian
sudo apt-get install git

# Fedora/RHEL
sudo dnf install git
```

---

### Quick Compatibility Check

Run this command to verify all prerequisites:

```bash
# Check Node.js version
node --version && echo "✅ Node.js installed" || echo "❌ Node.js missing"

# Check Claude Code
claude --version && echo "✅ Claude Code installed" || echo "❌ Claude Code missing"

# Check Git (optional)
git --version && echo "✅ Git installed" || echo "ℹ️ Git optional (needed for aiwg -new)"
```

**All checks passed?** You're ready! [Jump to installation →](#-installation--setup)

**Missing something?** Expand the relevant section above for installation instructions.

---

## 📚 Documentation

### Getting Started

- [**Quick Start Guide**](USAGE_GUIDE.md) — Context selection for different tasks
- [**Installation Guide**](tools/install/README.md) — Detailed setup instructions
- [**CLI Reference**](tools/install/README.md#cli-commands) — All `aiwg` commands

### Writing Quality

- [**Core Philosophy**](core/philosophy.md) — Fundamental writing principles
- [**Banned Patterns**](validation/banned-patterns.md) — 100+ AI clichés to avoid
- [**Examples**](examples/) — Before/after rewrites
- [**Quick Reference**](context/quick-reference.md) — Fast validation checklist

### SDLC Framework

- [**Framework Overview**](agentic/code/frameworks/sdlc-complete/README.md) — Complete lifecycle guide
- [**Agent Catalog**](docs/agents/README.md) — All 58 SDLC agents
- [**Command Reference**](docs/commands/README.md) — All 45+ workflow commands
- [**Template Library**](agentic/code/frameworks/sdlc-complete/templates/) — 156 artifact templates
- [**Phase Workflows**](agentic/code/frameworks/sdlc-complete/flows/) — Inception → Transition
- [**Natural Language Guide**](agentic/code/frameworks/sdlc-complete/docs/simple-language-translations.md) — 70+ supported phrases

### Advanced Topics

- [**Multi-Agent Orchestration**](agentic/code/frameworks/sdlc-complete/docs/multi-agent-documentation-pattern.md) — Parallel reviews and synthesis
- [**Orchestrator Architecture**](agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md) — How workflows coordinate
- [**Multi-Platform Support**](agentic/code/frameworks/sdlc-complete/agents/openai-compat.md) — Claude vs OpenAI differences
- [**Development Guide**](commands/DEVELOPMENT_GUIDE.md) — Advanced slash command patterns

---

## 🎓 Examples & Case Studies

### Real-World Project: AI Writing Guide (Dogfooding)

**Challenge:** Solo developer building comprehensive SDLC framework. Need to validate practicality while developing.

**Solution:** Use framework on itself (meta-application).

**Results:**
- ✅ 100% Inception artifact coverage (9 required + 3 optional)
- ✅ Multi-agent pattern validated (4 parallel reviewers → synthesis → baseline)
- ✅ Gate criteria: 4/4 PASS (LOM approved for Elaboration)
- ✅ ROI: 1.57x with 50 users, breaks even <12 months

**Artifacts Generated:**
- Vision Document (7,200 words, 4 parallel reviews)
- Business Case (ROI quantified, 3 sustainability paths)
- Risk List (19 risks, top 5 actively mitigated)
- 5 Use Cases (20-98% time savings)
- Architecture Sketch + 5 ADRs
- Security assessments (zero-data architecture validated)

[**See full case study →**](.aiwg/reports/inception-completion-report.md)

---

### Sample Projects

Explore complete lifecycle examples in `agentic/code/frameworks/sdlc-complete/artifacts/`:

- **Web Application:** Inception → Production (full audit trail)
- **API Service:** Microservices architecture with compliance
- **Mobile App:** Cross-platform development with security review

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Quick Contributions

**Found a new AI pattern?** [Open an issue](https://github.com/jmagly/ai-writing-guide/issues/new) with examples.

**Have a better rewrite?** Submit a PR to `examples/` with before/after.

**Want to add an agent?** Use `docs/agents/agent-template.md` as a starting point.

### Development Workflow

1. **Fork and clone:**
   ```bash
   git clone https://github.com/your-username/ai-writing-guide.git
   cd ai-writing-guide
   ```

2. **Create feature branch:**
   ```bash
   git checkout -b feat/your-feature-name
   ```

3. **Make changes and test:**
   ```bash
   # Run markdown linting
   npm exec markdownlint-cli2 "**/*.md"

   # Test agent deployment
   node tools/agents/deploy-agents.mjs --target /tmp/test-project --dry-run
   ```

4. **Commit using conventions:**
   ```bash
   git commit -m "feat(agents): add database-optimizer agent"
   ```

5. **Push and create PR:**
   ```bash
   git push origin feat/your-feature-name
   ```

### Commit Message Format

```text
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`

**Scopes:** `agents`, `commands`, `templates`, `tools`, `docs`, `intake`, `flows`

**Example:**
```bash
feat(agents): add cloud-architect specialized agent

Created AWS/Azure/GCP infrastructure design agent with:
- Multi-cloud IaC design (Terraform/CloudFormation)
- Cost optimization strategies
- Auto-scaling and multi-region deployments

Closes #123
```

[**Full contributing guide →**](CONTRIBUTING.md)

---

## 📊 Project Status

### Current Phase: Inception → Elaboration Transition

**Milestone:** Lifecycle Objective (LO) — ✅ **PASS** (2025-10-17)

**Gate Criteria:**
- ✅ Stakeholder Approval: 100%
- ✅ Executive Sponsor Signoff: APPROVED
- ✅ No Show Stopper Unmitigated: PASS
- ✅ Funding Secured: 180-240 hrs Elaboration APPROVED

**Next Milestone:** Architecture Baseline (ABM) — Target: 12 weeks

**Phase 1 Validation** (0-3 months):
- Target: 10+ installations, 5-10 GitHub stars, 2-5 active users
- Decision Point: 3-month checkpoint (GREEN/YELLOW/RED criteria)

[**View detailed status →**](.aiwg/reports/lom-report.md)

### Roadmap

**Phase 1: Validation** (0-3 months)
- ✅ Inception complete (all artifacts baselined)
- ⏳ User recruitment (5-10 early adopters)
- ⏳ Multi-agent pattern validation at scale
- 🎯 Target: 10+ installs, 5-10 stars

**Phase 2: Stability** (3-6 months)
- Elaboration phase (architecture baseline, test strategy)
- 2-3 contributors recruited
- Self-service infrastructure (FAQ, discussions)
- 🎯 Target: 25-50 stars, 1-2 contributors

**Phase 3: Scale** (6-12 months)
- Construction + Transition phases
- Community-driven improvements
- Commercial optionality exploration
- 🎯 Target: 100+ stars, 2-3 contributors, self-service operational

[**Full roadmap →**](ROADMAP.md)

---

## 💬 Community & Support

### Get Help

- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/jmagly/ai-writing-guide/issues)
- 💡 **Feature Requests:** [GitHub Discussions](https://github.com/jmagly/ai-writing-guide/discussions)
- 📖 **Documentation:** [Usage Guide](USAGE_GUIDE.md) | [SDLC README](agentic/code/frameworks/sdlc-complete/README.md)
- 💬 **Community Chat:** [GitHub Discussions](https://github.com/jmagly/ai-writing-guide/discussions)

### Stay Updated

- ⭐ **Star this repo** to follow development
- 👀 **Watch releases** for new features and templates
- 📣 **Follow on Twitter:** [@jmagly](https://twitter.com/jmagly) (coming soon)

---

## ⚠️ Cost Considerations

**IMPORTANT:** This framework generates extensive AI interactions. Understand your costs before deploying.

### Usage Characteristics

**Document Generation Volume:**
- Single workflow: 5,000-15,000 words (intake, SAD, reviews, synthesis)
- Multi-agent pattern: 3-5x token multiplier (parallel reviews)
- Full Inception phase: ~50,000-100,000 words total output
- Iteration cycles: 10,000-30,000 words per iteration

**Typical Monthly Usage** (varies widely):
- **Light** (1-2 workflows/week): 40,000-120,000 words → ~$10-20/month
- **Moderate** (10-20 workflows/month): 150,000-300,000 words → **$20-50/month**
- **Heavy** (daily workflows, full SDLC): 500,000+ words → **$50-150+/month**

### Account Requirements

| Account Type | Suitability | Notes |
|--------------|-------------|-------|
| **Claude Free** | ❌ Not Suitable | Daily message limits hit quickly (5-10 messages) |
| **Claude Pro** | ✅ **Recommended** | Higher limits, suitable for moderate usage |
| **Claude Team/Enterprise** | ✅ Best | Highest limits, team collaboration, no rate throttling |
| **API Pay-as-you-go** | ⚠️ Use with Caution | Can be expensive without cost controls ($50-200+/month) |

### Cost Mitigation Strategies

1. **Start Small:** Test with 1-2 use cases before full deployment
2. **Use Selectively:** Not every project needs full SDLC artifacts
3. **Manual Review:** Edit generated drafts instead of regenerating
4. **Monitor Usage:** Track costs weekly, set budget alerts if using API
5. **Skip Optional Workflows:** Only run required artifacts for your profile

### Your Mileage May Vary

Actual costs depend on:
- Codebase size (larger = more tokens)
- Project complexity (more complex = longer artifacts)
- Revision frequency (regeneration costs add up)
- Account tier and rate limits
- Whether you hit rate limits (retry costs)

**Bottom Line:** Budget $20-50/month for moderate use. Enterprise teams may see $100-500+/month depending on scale.

---

## 📄 License & Disclaimer

### MIT License

**Free to use, modify, and distribute.** Full text: [LICENSE](LICENSE)

```
MIT License

Copyright (c) 2025 Joseph Magly

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Important Disclaimers

#### No Warranty

**THE SOFTWARE IS PROVIDED "AS IS"**, without warranty of any kind. The authors make no guarantees about:
- Accuracy of generated artifacts
- Fitness for any particular purpose
- Absence of bugs or logic errors
- API cost predictions
- Compatibility with all platforms

#### Not Professional Advice

This framework **does not provide**:
- Legal advice (compliance guidance is informational only)
- Security audit services (templates are starting points, not guarantees)
- Financial consulting (ROI estimates are illustrative)
- Professional liability coverage

**Always consult qualified professionals** for legal, security, and compliance requirements.

#### User Responsibility

**You are responsible for:**
- Reviewing all generated content before use
- Validating compliance with your specific regulations
- Testing in non-production environments first
- Monitoring and controlling API costs
- Maintaining backups of critical data
- Understanding licensing of generated artifacts (MIT applies to framework, but your outputs are yours)

#### Experimental Status

This framework is in **active development** (Phase 1: Validation). Expect:
- Breaking changes to agents, commands, templates
- Incomplete documentation
- Bugs and unexpected behavior
- Rate limit issues
- API cost volatility

**Not recommended for:**
- Production-critical projects without thorough testing
- Regulated industries without legal review
- Budget-constrained accounts (pay-as-you-go)
- Time-sensitive deliverables (troubleshooting may take days)

#### Data & Privacy

- **No data collection:** Framework processes everything locally
- **No telemetry:** No analytics, tracking, or usage reporting
- **User artifacts:** You own everything generated (MIT license does not claim your outputs)
- **Third-party services:** Claude Code/OpenAI terms apply to API usage

[**Read Privacy Policy →**](PRIVACY.md) | [**Read Terms of Use →**](TERMS.md)

#### Cost Responsibility

**API usage costs are your responsibility.** The framework does not:
- Track or limit your spending
- Provide cost alerts or budgets
- Guarantee cost estimates
- Refund unexpected charges

**Monitor your usage** via your AI provider's dashboard. Set budget alerts if available.

---

### Known Limitations

**Current Limitations** (will improve over time):
- ⚠️ Only tested with Claude Code (other platforms experimental)
- ⚠️ English-only templates and agents
- ⚠️ No cost tracking or budget enforcement
- ⚠️ Context window limits not validated (>200k tokens)
- ⚠️ Only two process frameworks currently available (Writing Quality + SDLC Complete)

**Report Issues:** [GitHub Issues](https://github.com/jmagly/ai-writing-guide/issues)

---

## 🙏 Acknowledgments

Built with inspiration from:
- **Writing Quality:** [Hemingway Editor](https://hemingwayapp.com/), [Grammarly](https://www.grammarly.com/)
- **SDLC Practices:** Rational Unified Process (RUP), ITIL, Agile methodologies
- **Agent Patterns:** Claude Code orchestration, multi-agent collaboration research
- **OSS Projects:** React, Vue.js, Next.js, Tailwind CSS (README design inspiration)

Special thanks to the Claude Code team for building the platform that makes this possible.

---

<div align="center">

**[⬆ Back to Top](#-ai-writing-guide)**

Made with ☕ and 🤖 by [Joseph Magly](https://github.com/jmagly)

**Questions?** [Open an issue](https://github.com/jmagly/ai-writing-guide/issues/new) or [start a discussion](https://github.com/jmagly/ai-writing-guide/discussions/new)

</div>
