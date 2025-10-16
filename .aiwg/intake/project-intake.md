# Project Intake Form (Existing System)

**Document Type**: Brownfield System Documentation
**Generated**: 2025-10-15
**Source**: Codebase analysis of /home/manitcor/dev/ai-writing-guide

## Metadata

- **Project name**: AI Writing Guide
- **Repository**: https://github.com/jmagly/ai-writing-guide.git
- **Current Version**: No version tags (active development)
- **Last Updated**: 2025-10-15 19:16:00 -0400
- **Stakeholders**: Software development teams, AI content creators, technical writers, SDLC practitioners

## System Overview

**Purpose**: Comprehensive framework for improving AI-generated content quality by avoiding common detection patterns and maintaining authentic, professional writing standards. Expanded to include a complete Software Development Lifecycle (SDLC) framework with 51 specialized agents.

**Current Status**: Active development (75 commits in last year, 70 in last week)

**Users**: Unknown (documentation/framework repository - not a deployed application)

**Tech Stack**:
- **Languages**: Markdown (759 files, ~75%), JavaScript/Node.js (38 files, ~5%), JSON (61 files, ~5%), Shell scripts (~2%)
- **Runtime**: Node.js >= 18.20.8
- **Deployment**: Git-based distribution with automated installer
- **Distribution**: GitHub repository with one-line install script
- **CI/CD**: GitHub Actions for markdown linting and drift detection

## Problem and Outcomes (Historical)

**Problem Statement**: AI-generated content often contains detectable patterns, formulaic structures, and lacks authentic human voice. Development teams need structured SDLC processes but lack accessible, practical frameworks.

**Target Personas**:
1. **Individual Developers**: Using AI coding assistants (Claude Code, GitHub Copilot) to improve output quality
2. **Technical Writers**: Creating documentation that sounds authentically human
3. **Development Teams**: Adopting structured SDLC processes with AI agent support
4. **Enterprise Organizations**: Implementing compliance-ready software development practices

**Success Metrics** (Inferred from documentation):
- Content authenticity: Avoiding AI detection patterns
- Token optimization: 60-80% reduction through agent context isolation
- Development velocity: 40-60% faster execution through parallel agents
- Process adoption: Complete SDLC coverage from Inception to Transition

## Current Scope and Features

**Core Features** (Writing Guide):
- **Writing Philosophy** (`core/`): Fundamental principles for authentic technical writing
- **Validation Rules** (`validation/`): Banned patterns, detection indicators, quality checklists
- **Examples** (`examples/`): Before/after writing transformations
- **Context Documents** (`context/`): Optimized quick-reference materials
- **Pattern Library** (`patterns/`): Common AI patterns to avoid

**Core Features** (Agent Framework):
- **3 General-Purpose Agents** (`agents/`):
  - writing-validator: Content validation against AI patterns
  - prompt-optimizer: Prompt enhancement using writing principles
  - content-diversifier: Varied example generation
- **51 SDLC Agents** (`agentic/code/frameworks/sdlc-complete/agents/`):
  - Complete role coverage: Architecture, Testing, Security, DevOps, Product, Legal
  - Includes: requirements-analyst, code-reviewer, test-engineer, security-auditor, cloud-architect, debugger, incident-responder, and 44 others
- **24 SDLC Commands** (slash commands for workflows)
- **Complete Template Library** (intake, requirements, architecture, testing, security, deployment)

**Deployment Tooling**:
- Agent deployment automation (`tools/agents/deploy-agents.mjs`)
- Project scaffolding (`tools/install/new-project.mjs`)
- One-line installer (`tools/install/install.sh`)
- Manifest generation and sync (`tools/manifest/`)
- Markdown linting automation (`tools/lint/`)
- Card prefilling from team profiles (`tools/cards/`)

**Recent Additions** (Last week - 70 commits):
- .aiwg/ directory standardization
- Graceful reinstall with automatic error recovery
- Version and update commands (aiwg -version, aiwg -update)
- Intake from codebase generation command
- Agent tools standardization (comma-separated format)

## Architecture (Current State)

**Architecture Style**: Documentation repository + Distribution framework

**Components**:
1. **Writing Guide Content** (Markdown documentation):
   - Core philosophy and principles
   - Validation rules and banned patterns
   - Examples and context documents
2. **Agent Definitions** (Markdown specifications):
   - General-purpose writing agents (3)
   - SDLC framework agents (51)
   - Deployed to `.claude/agents/` in target projects
3. **Command Definitions** (Markdown specifications):
   - SDLC workflow commands (24)
   - Deployed to `.claude/commands/` in target projects
4. **Distribution Tooling** (Node.js scripts):
   - Installation and update automation
   - Agent/command deployment
   - Manifest generation and synchronization
   - Markdown linting and formatting
5. **Template Library** (SDLC artifacts):
   - Intake forms, requirements, architecture docs
   - Test plans, security assessments, deployment runbooks

**Data Models**: N/A (documentation repository - no runtime data persistence)

**Integration Points**:
- GitHub for version control and distribution
- Claude Code for agent execution (primary target platform)
- OpenAI/Codex compatibility (secondary target platform)
- Shell environment for CLI installation

## Scale and Performance (Current)

**Current Capacity**: Documentation repository (no active users measured)

**Distribution Metrics**:
- Repository size: 3,403 files
- Documentation: 759 markdown files
- Agent definitions: 54 total (3 general + 51 SDLC)
- Command definitions: 8 general + 24 SDLC
- Tools: 38 JavaScript/Shell scripts

**Performance Characteristics** (from documentation):
- Token usage reduction: 60-80% through agent context isolation
- Execution speed improvement: 40-60% through parallel agent deployment
- Installation time: <5 minutes (automated installer)
- Update time: <30 seconds (git pull automation)

**Optimization Patterns**:
- Context isolation (agents operate independently)
- Parallel execution (multiple agents simultaneously)
- Automatic updates (built into CLI wrapper)
- Graceful error recovery (reinstall on corruption)

## Security and Compliance (Current)

**Security Posture**: Minimal (documentation repository)

**Data Classification**: Public (open source MIT license)

**Security Controls**:
- Version control: Git with GitHub remote
- Distribution: Automated installer with signature verification (git)
- Secrets Management: None required (no runtime secrets)
- Access Control: GitHub repository permissions

**Compliance Requirements**: None detected
- No GDPR (no PII processing)
- No PCI-DSS (no payment processing)
- No HIPAA (no health data)
- Open source MIT license (permissive)

**Security Considerations**:
- Installation script runs with user permissions (not sudo except for package managers)
- Node.js version requirement (>= 18.20.8 for security)
- GitHub Actions CI/CD with no secret exposure
- No external service dependencies (self-contained framework)

## Team and Operations (Current)

**Team Size**: Solo developer (1 active contributor)

**Active Contributors**: 1 (Joseph Magly - 75 commits total)

**Development Velocity**:
- Last year: 75 commits total
- Last 3 months: 75 commits (all recent activity)
- Last week: 70 commits (intensive development phase)
- Average: ~10 commits/day during active periods

**Process Maturity**:
- **Version Control**: Git with main branch (GitHub Flow)
- **Code Review**: Not detected (solo developer)
- **Testing**: N/A (documentation repository - markdown linting instead)
- **CI/CD**: GitHub Actions for markdown linting and drift detection
- **Documentation**: Comprehensive (README, CLAUDE.md, USAGE_GUIDE, PROJECT_SUMMARY, ROADMAP, CONTRIBUTING)
- **Versioning**: No semantic versioning or tags yet (using commit hashes)

**Operational Support**:
- **Monitoring**: None (static content repository)
- **Logging**: Git commit history only
- **Alerting**: GitHub Actions workflow failures
- **On-call**: N/A (documentation project)

**Quality Assurance**:
- Custom markdown linters (10+ specialized fixers)
- Manifest drift detection
- GitHub Actions CI enforcement on PRs
- Automated formatting standardization

## Dependencies and Infrastructure

**Third-Party Services**:
- **GitHub**: Repository hosting, version control, CI/CD
- **npm**: Markdown linting tools (markdownlint-cli2)
- **NodeSource**: Node.js distribution for installer

**Runtime Dependencies** (Node.js tools):
- No package.json detected (scripts use only Node.js stdlib)
- Markdown linting: markdownlint-cli2 (invoked via npx)

**Infrastructure**:
- **Hosting**: GitHub repository (static content)
- **Distribution**: Git clone + shell installer
- **Installation Location**: `~/.local/share/ai-writing-guide` (default)
- **CLI Integration**: Shell aliases (~/.bash_aliases or ~/.zshrc)

**Build/Deployment**:
- No build step (documentation + scripts)
- Distribution via git clone
- Updates via git pull (automated in CLI wrapper)
- CI enforcement via GitHub Actions (markdown linting)

## Known Issues and Technical Debt

**Quality Gaps** (from analysis):
- No semantic versioning or release tags
- Solo development (no peer review)
- No automated testing for Node.js scripts
- Documentation-only (no compiled artifacts or release binaries)

**Modernization Opportunities**:
- Add semantic versioning and changelog
- Create GitHub releases with versioned archives
- Add script testing (e.g., for deploy-agents.mjs)
- Consider multi-contributor governance model

**Technical Debt**: Minimal (young project in active development)

**Performance Considerations**: None (static content distribution)

## Why This Intake Now?

**Context**: Self-documentation for SDLC framework demonstration

**Goals**:
- Demonstrate intake-from-codebase command on real project
- Establish baseline documentation for AI Writing Guide itself
- Validate SDLC framework tools on actual codebase
- Enable future contributors to understand project structure

## Attachments

- **Solution profile**: [solution-profile.md](solution-profile.md)
- **Option matrix**: [option-matrix.md](option-matrix.md)
- **Codebase location**: `/home/manitcor/dev/ai-writing-guide`
- **Repository**: https://github.com/jmagly/ai-writing-guide.git
- **Documentation**: [README.md](../../README.md), [CLAUDE.md](../../CLAUDE.md), [USAGE_GUIDE.md](../../USAGE_GUIDE.md)

## Next Steps

1. **Review generated intake** for accuracy and completeness
2. **Add version tagging** (semantic versioning for releases)
3. **Create GitHub release** with installation instructions
4. **Consider**: Multi-contributor governance and contribution guidelines expansion
5. **Continue development**: Follow ROADMAP.md for planned features
