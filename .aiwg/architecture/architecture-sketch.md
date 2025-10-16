# Architecture Sketch - AI Writing Guide

**Project**: AI Writing Guide
**Phase**: Inception
**Document Owner**: Architecture Designer
**Date**: 2025-10-15
**Status**: APPROVED (Sketch - Full SAD in Elaboration)

## Purpose

This architecture sketch provides a high-level overview of the AI Writing Guide system components, integration points, and technology stack. Full Software Architecture Document (SAD) will be created during Elaboration phase.

## System Overview

**Architecture Style**: Documentation Framework + Distribution Tooling

**Deployment Model**: Git-based distribution with local installation

**Key Characteristics**:
- Static content (markdown documentation)
- Client-side tooling (Node.js scripts)
- No server-side processing
- No user data storage
- Cross-platform compatibility (Linux, macOS, WSL)

## Component Architecture

```
AI Writing Guide
├── Writing Guide Content (Markdown)
│   ├── Core Philosophy (core/)
│   ├── Validation Rules (validation/)
│   ├── Examples & Patterns (examples/, patterns/)
│   └── Context Documents (context/)
│
├── Agent Framework (.claude/agents/)
│   ├── General-Purpose Agents (3)
│   │   ├── writing-validator.md
│   │   ├── prompt-optimizer.md
│   │   └── content-diversifier.md
│   └── SDLC Agents (51)
│       ├── requirements-analyst.md
│       ├── code-reviewer.md
│       ├── test-engineer.md
│       ├── security-auditor.md
│       └── [47 more specialized agents]
│
├── Command Framework (.claude/commands/)
│   ├── General Commands (8)
│   └── SDLC Commands (24)
│       ├── flow-concept-to-inception.md
│       ├── flow-elaboration-to-construction.md
│       └── [22 more workflow commands]
│
├── Template Library (agentic/code/frameworks/sdlc-complete/templates/)
│   ├── Intake Forms
│   ├── Requirements Documents
│   ├── Architecture Artifacts
│   ├── Test Plans & Strategies
│   ├── Security Assessments
│   └── Deployment Runbooks
│
└── Distribution Tooling (tools/)
    ├── Installation (tools/install/)
    │   ├── install.sh (one-line installer)
    │   └── new-project.mjs (project scaffolding)
    ├── Agent Deployment (tools/agents/)
    │   └── deploy-agents.mjs (agent deployment automation)
    ├── Manifest Management (tools/manifest/)
    │   ├── generate-manifest.mjs
    │   ├── enrich-manifests.mjs
    │   └── sync-manifests.mjs
    └── Markdown Linting (tools/lint/)
        ├── fix-md12.mjs
        ├── fix-md58.mjs
        └── [10+ custom markdown fixers]
```

## Technology Stack

### Core Technologies

**Documentation**:
- **Markdown**: Primary content format (CommonMark spec)
- **JSON**: Manifests and configuration
- **YAML**: Agent/command metadata (optional)

**Tooling**:
- **Node.js**: >= 18.20.8 (runtime for scripts)
- **JavaScript (ESM)**: Distribution tools and automation
- **Shell (Bash)**: Installation and setup scripts

**Distribution**:
- **Git**: Version control and distribution
- **GitHub**: Repository hosting, CI/CD
- **GitHub Actions**: Continuous integration (markdown linting, drift detection)

### Dependencies

**Runtime Dependencies**:
- Node.js standard library only (no npm packages)
- Shell utilities: git, curl, grep, find

**Development Dependencies**:
- markdownlint-cli2 (via npx, no package.json)
- No build tools (static content)

**Platform Dependencies**:
- **Linux**: apt-get, dnf, yum, pacman, or zypper (for Node.js install)
- **macOS**: Homebrew (for Node.js install)
- **Windows**: WSL (Ubuntu on Windows)

## Integration Points

### GitHub Integration

**Purpose**: Version control, distribution, CI/CD

**Endpoints**:
- Repository: `https://github.com/jmagly/ai-writing-guide.git`
- Raw content: `https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/`
- GitHub Actions: `.github/workflows/`

**Data Flow**:
1. Developer commits to repository
2. GitHub Actions runs markdown linting
3. Users clone/pull repository for updates
4. `aiwg` CLI auto-updates via git pull

### Claude Code Integration

**Purpose**: AI agent execution platform (primary target)

**Integration Method**:
- Agents deployed to `.claude/agents/` directory
- Commands deployed to `.claude/commands/` directory
- Claude Code reads agent definitions at runtime
- Agents execute in isolated contexts

**Data Flow**:
1. User runs `aiwg -deploy-agents --mode both`
2. Agents copied to `.claude/agents/` in target project
3. Claude Code discovers agents dynamically
4. User invokes agents via slash commands or Task tool

### OpenAI/Codex Integration (Secondary)

**Purpose**: Multi-platform support

**Integration Method**:
- Agents deployable to `.codex/agents/` directory
- Alternative AGENTS.md single-file format
- Model selection override (gpt-4, gpt-5)

**Status**: Compatibility documented, not extensively tested

### Shell Environment Integration

**Purpose**: CLI command registration

**Integration Method**:
- `aiwg` wrapper added to `~/.bash_aliases` or `~/.zshrc`
- Shell function wraps git operations
- Auto-update on every command invocation

**Data Flow**:
1. User runs `aiwg <command>`
2. Shell function performs `git pull` in install directory
3. Node.js script executes command
4. Results returned to user

## Deployment Architecture

### Installation Flow

```
User
  ↓ (curl installer)
GitHub Raw Content
  ↓ (download install.sh)
User's Shell
  ↓ (execute install.sh)
System Package Manager (apt/brew/dnf)
  ↓ (install Node.js if needed)
Git Clone Repository
  ↓ (clone to ~/.local/share/ai-writing-guide)
Register Shell Alias
  ↓ (add to ~/.bash_aliases or ~/.zshrc)
User can run: aiwg <command>
```

### Distribution Flow

```
Developer
  ↓ (git commit, git push)
GitHub Repository
  ↓ (trigger CI/CD)
GitHub Actions
  ↓ (lint markdown, check drift)
  ├─ PASS → merge allowed
  └─ FAIL → merge blocked
```

### Agent Deployment Flow

```
User in Project Directory
  ↓ (aiwg -deploy-agents --mode both)
Read Agents from ~/.local/share/ai-writing-guide/
  ↓ (copy agents)
Write to .claude/agents/ or .codex/agents/
  ↓ (54 agent files)
Claude Code Discovers Agents
  ↓ (dynamic discovery)
User invokes agents via slash commands
```

## Data Flow

### No User Data Processing

**Key Principle**: The AI Writing Guide processes **zero user data**.

**Data Flows**:
1. **Repository → User**: Git clone/pull (documentation distribution)
2. **User → Local Filesystem**: Agent deployment (file copy)
3. **No telemetry**: No data sent back to repository
4. **No analytics**: No usage tracking

**Rationale**: Documentation framework operates entirely client-side. Users control their own projects locally.

## Security Architecture

### Security Boundaries

**Trust Boundaries**:
1. **GitHub → User**: Trusted (HTTPS/TLS, open source code)
2. **User's Filesystem**: Trusted (user permissions only)
3. **No External APIs**: No additional trust boundaries

**Security Controls**:
- Git commit history (integrity verification)
- GitHub HTTPS/TLS (encrypted transport)
- User filesystem permissions (access control)
- No secrets or credentials (no sensitive data)

### Threat Model

**Threats Considered**:
- **Supply chain attack**: Malicious code in repository
  - Mitigation: Open source code, community review, git signatures (future)
- **GitHub account compromise**: Attacker pushes malicious commits
  - Mitigation: 2FA enforcement, git commit signing (recommended)
- **Man-in-the-middle**: Intercepted git traffic
  - Mitigation: GitHub HTTPS/TLS enforced

**Threats Explicitly Excluded**:
- **User data breach**: No user data stored
- **Service availability**: No SLA commitments (open source)
- **DDoS attacks**: No server to attack (git-based distribution)

## Performance Characteristics

### Token Optimization

**Claim**: 60-80% token reduction through agent context isolation

**Mechanism**:
- Agents operate independently with isolated context
- No full codebase context required for each agent
- Parallel execution reduces overall token usage

**Measurement**: Qualitative (based on agent design principles)

### Execution Speed

**Claim**: 40-60% faster execution through parallel agents

**Mechanism**:
- Multiple agents execute simultaneously
- Independent tasks run without blocking
- Claude Code Task tool enables parallel execution

**Measurement**: Qualitative (based on parallel execution patterns)

### Installation Performance

**Installation Time**: < 5 minutes
- Git clone: ~30 seconds (3,403 files)
- Node.js installation: ~2-4 minutes (if not present)
- Shell alias registration: < 1 second

**Update Time**: < 30 seconds
- Git pull: ~5-10 seconds
- Automatic on every `aiwg` command

## Scalability

### User Scalability

**Supported Users**: Unlimited (git-based distribution)
- No server capacity constraints
- GitHub handles distribution (99.9% SLA)
- Users clone/fork independently

### Agent Scalability

**Current Agents**: 54 (3 general + 51 SDLC)
**Projected Growth**: 75+ by 12 months
**Scalability Limit**: None (file-based, no runtime dependencies)

### Project Scalability

**Supported Project Sizes**: Any (framework is project-agnostic)
- Solo developers: Lightweight SDLC templates
- Small teams (2-10): Collaboration patterns
- Large teams (10-100): Enterprise SDLC framework

## Technology Decisions (Summary)

### Why Markdown?

**Decision**: Use Markdown for all documentation
**Rationale**:
- Universal format (readable by humans and tools)
- Version control friendly (git diff)
- Cross-platform compatibility
- No build step required
**Trade-offs**: No rich formatting, but simplicity outweighs

### Why Node.js?

**Decision**: Use Node.js for distribution tooling
**Rationale**:
- Cross-platform (Linux, macOS, Windows/WSL)
- Standard library sufficient (no npm dependencies)
- Familiar to developers
**Trade-offs**: Node.js version dependency, but >=18.20.8 is widely available

### Why Git Distribution?

**Decision**: Distribute via git clone (not npm package)
**Rationale**:
- No package manager lock-in
- Auto-update via git pull (zero maintenance)
- Fork-friendly (community can customize)
**Trade-offs**: Requires git installed, but acceptable for developer tools

### Why Claude Code Primary Target?

**Decision**: Target Claude Code as primary AI platform
**Rationale**:
- Native agent support (.claude/agents/)
- Command framework (.claude/commands/)
- Parallel execution via Task tool
**Trade-offs**: Platform dependency, but OpenAI compatibility maintained

## Architecture Constraints

### Technical Constraints

**Must Have**:
- Node.js >= 18.20.8 (runtime requirement)
- Git installed (distribution dependency)
- Shell environment (Bash or Zsh for aliases)
- HTTPS connectivity (GitHub access)

**Cannot Have**:
- Server-side processing (static content only)
- User authentication (no user accounts)
- Database (stateless framework)
- External API dependencies (self-contained)

### Organizational Constraints

**Solo Developer**:
- No team coordination overhead
- No peer review (currently)
- Fast iteration (70 commits/week possible)

**Open Source**:
- Public repository (no proprietary code)
- MIT license (permissive)
- Community contributions welcome

### Quality Constraints

**Performance**:
- Installation: < 5 minutes
- Update: < 30 seconds
- Agent deployment: < 10 seconds

**Reliability**:
- No SLA (open source, best effort)
- Graceful recovery: `aiwg -reinstall`
- No breaking changes in minor versions

## Future Architecture Considerations (Post-v1.0)

### Elaboration Phase

**Architecture Documentation**:
- Create full Software Architecture Document (SAD)
- Add Architecture Decision Records (ADRs) for key choices
- Document component interfaces and contracts

**Executable Baseline**:
- Current codebase serves as executable baseline (already functional)
- Add smoke tests to validate architecture
- Cross-platform testing (Ubuntu, macOS, WSL)

### Construction Phase

**Feature Expansion**:
- Add more specialized agents (per ROADMAP)
- Expand template library
- Create example projects

**Quality Evolution**:
- Expand testing coverage (integration tests)
- Add code style enforcement (ESLint, ShellCheck)
- Improve CI/CD workflows

### Transition Phase

**Distribution Evolution**:
- Package manager distribution (Homebrew, apt repository)
- Release archives (tar.gz, zip)
- Multi-platform installers

**Platform Evolution**:
- Enhanced OpenAI/Codex support
- Integration with more AI platforms
- Agent marketplace or catalog

## Approval and Sign-Off

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Architecture Designer | AI Writing Guide Team | APPROVED | 2025-10-15 |
| Project Owner | Joseph Magly | APPROVED | 2025-10-15 |

**Status**: Architecture sketch APPROVED for Inception exit

**Next Steps**:
1. **Elaboration Week 1-2**: Create full Software Architecture Document (SAD)
2. **Elaboration Week 1-2**: Document Architecture Decision Records (ADRs) for key choices
3. **Elaboration Week 3-4**: Validate executable baseline with smoke tests

---

**Related Documents**:
- Current state: `.aiwg/intake/project-intake.md` (detailed inventory)
- Technology decisions: To be documented as ADRs in Elaboration
- Security architecture: `.aiwg/security/data-classification.md`
- Risk assessment: `.aiwg/risks/risk-list.md`
