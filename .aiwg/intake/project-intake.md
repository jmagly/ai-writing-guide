# Project Intake Form (Existing System)

**Document Type**: Brownfield System Documentation
**Generated**: 2025-10-15
**Source**: Codebase analysis of /home/manitcor/dev/ai-writing-guide

## Metadata

- **Project name**: AI Writing Guide
- **Repository**: https://github.com/jmagly/ai-writing-guide.git
- **Current Version**: In active development (no versioning detected)
- **Last Updated**: 2025-10-15 23:34:01 -0400
- **License**: MIT License (Copyright 2024 Joe Magly)
- **Stakeholders**: Solo developer, Open source community, Enterprise SDLC adopters

## System Overview

**Purpose**: Comprehensive framework for improving AI-generated content quality by providing guidelines, validation tools, SDLC agents, and commands to help AI agents produce natural, professional content that avoids detection patterns while maintaining technical accuracy.

**Current Status**: Active Development / Open Source (GitHub)

**Users**:
- AI developers using Claude Code
- Teams adopting SDLC frameworks
- Content creators validating AI outputs
- Enterprise development teams

**Tech Stack**:
- **Languages**: Markdown (91.2%), JSON (8.3%), YAML (0.6%)
- **Primary Content**: Documentation framework (474 markdown files)
- **Tools**: Node.js tooling (2,896 lines across .mjs files)
- **Deployment**: GitHub-based distribution, shell script installer
- **Framework**: SDLC Complete - comprehensive software development lifecycle toolkit

## Problem and Outcomes

**Problem Statement**: AI-generated content often exhibits detectable patterns (formulaic structure, performative language, lack of authentic voice) that undermine credibility while lacking systematic development lifecycle support for AI-assisted projects.

**Target Personas**:
1. **AI Developers**: Using Claude Code for software development, need specialized agents
2. **Technical Writers**: Validating AI-generated documentation for authenticity
3. **Development Teams**: Adopting structured SDLC processes with AI assistance
4. **Enterprise Architects**: Implementing comprehensive development frameworks

**Success Metrics**:
- Writing quality: Eliminate AI detection patterns while maintaining sophistication
- Token optimization: 60-80% reduction in context usage
- Time efficiency: 40-60% faster execution through parallel agents
- SDLC coverage: Complete lifecycle from Inception → Transition
- Community adoption: 1000+ active users within 6 months (planned)
- Agent contributions: 50+ community-contributed agents (planned)

## Current Scope and Features

**Core Features**:

1. **Writing Quality Framework**:
   - Banned pattern detection (validation/banned-patterns.md)
   - Sophistication guidelines (core/sophistication-guide.md)
   - Quick reference validation checklist (context/quick-reference.md)
   - Before/after examples (examples/technical-writing.md)

2. **General-Purpose Agents** (4 agents):
   - writing-validator: Content authenticity validation
   - prompt-optimizer: AI Writing Guide principles application
   - content-diversifier: Varied perspective generation
   - (1 additional agent in agents/ directory)

3. **SDLC Complete Framework** (57 specialized agents):
   - 51 SDLC role agents (Architecture Designer, Test Engineer, Security Gatekeeper, etc.)
   - Complete phase coverage: Inception → Elaboration → Construction → Transition
   - 24 SDLC commands (/flow-concept-to-inception, /security-gate, /check-traceability, etc.)
   - 44 slash commands total (9 general + 35 SDLC-specific)

4. **Development Tooling**:
   - Agent deployment script (deploy-agents.mjs) supporting Claude/OpenAI
   - Manifest generation and validation (42 manifest.json files)
   - Markdown linting automation (10 custom fixers for MD058, MD031, MD040, etc.)
   - Installation system with CLI wrapper (aiwg command)
   - Card prefill automation for team profiles

5. **Template Library**:
   - Intake forms (project-intake, solution-profile, option-matrix)
   - Requirements templates (user stories, use cases, NFRs)
   - Architecture templates (SAD, ADRs, API contracts)
   - Test templates (test plans, strategies, cases)
   - Security templates (threat models, DPIA, breach plans)
   - Deployment templates (runbooks, checklists)

6. **Add-on Modules**:
   - GDPR compliance framework (templates/GDPR/)
   - Legal liaison templates
   - Development workflow patterns

**Recent Additions** (last 3 months - 84 commits):
- Multi-agent pattern documentation (2025-10-15)
- SDLC flow command updates (flow-concept-to-inception)
- Test card templates (test-case-card.md, test-suite-card.md)
- Comprehensive markdown linting workflow

**Planned/In Progress** (from ROADMAP.md):
- Agent marketplace for community contributions
- IDE integrations (VSCode, IntelliJ, Vim)
- Cloud platform-specific agents (AWS, Azure, GCP)
- Self-improving agents with feedback loops

## Architecture (Current State)

**Architecture Style**: Documentation-Centric Open Source Framework (Monorepo)

**Components**:

1. **Core Writing Guide** (core/, validation/, examples/, patterns/, context/)
   - Philosophy and principles
   - Validation rules and banned patterns
   - Example transformations
   - Quick reference materials

2. **Agent Ecosystem**:
   - General writing agents (agents/ - 4 agents)
   - SDLC agents (agentic/code/frameworks/sdlc-complete/agents/ - 57 agents)
   - Deployment via .claude/agents/ or .codex/AGENTS.md

3. **Command Framework**:
   - General commands (commands/ - 9 commands)
   - SDLC commands (agentic/.../commands/ - 44 commands)
   - Deployment via .claude/commands/

4. **Template Repository** (agentic/.../templates/):
   - 15 subdirectories covering all SDLC disciplines
   - 100+ template files (.md format)
   - Organized by phase and artifact type

5. **Tooling Layer** (tools/):
   - agents/ - Deployment and agent management
   - manifest/ - Documentation metadata management
   - lint/ - Markdown quality automation
   - install/ - Installation and CLI wrapper
   - cards/ - Team profile integration
   - index/ - Content cataloging

6. **Distribution Mechanisms**:
   - GitHub repository as source of truth
   - Shell-based installer (install.sh)
   - CLI wrapper (aiwg command) with auto-update
   - Direct tool invocation for CI/CD

**Data Models**: 42 manifest.json metadata files tracking documentation structure

**Integration Points**:
- GitHub for version control and distribution
- Claude Code as primary platform (.claude/ directory structure)
- OpenAI/Codex as secondary platform (.codex/ directory structure)
- CI/CD via GitHub Actions (lint-fixcheck.yml, markdownlint.yml, manifest-lint.yml)
- Node.js runtime for tooling (no package.json - uses system Node)

## Scale and Performance (Current)

**Current Capacity**: Documentation framework (no runtime system)
- Content serving: GitHub Pages / raw file access
- Installation: Shell script with git clone
- Scalability: Unlimited (static content distribution)

**Performance Characteristics**:
- Agent deployment: ~1 second (file copy operations)
- Manifest generation: Processes 42 manifests across directory tree
- Lint checks: 10 parallel checks in CI pipeline (~2-3 minutes)
- Installation: ~10-30 seconds (git clone + alias setup)

**Performance Optimizations Present**:
- Parallel agent deployment (copy operations)
- Cached manifest metadata (avoid re-parsing)
- Incremental linting (only changed files trigger CI)
- Auto-update on CLI invocation (ensures latest version)

**Documented Performance Benefits**:
- Token usage: 60-80% reduction through agent context isolation
- Execution time: 40-60% faster through parallel agent execution
- Context efficiency: Targeted document combinations vs. full repo inclusion

**Bottlenecks/Pain Points**:
- No automated version management (no semantic versioning detected)
- Manual synchronization needed between docs/agents/ and deployment targets
- Potential drift between template files and command documentation
- TODO items in P0-IMPLEMENTATION-SUMMARY.md indicate incomplete manifest updates

## Security and Compliance (Current)

**Security Posture**: Baseline (Open Source Documentation Project)

**Data Classification**: Public (MIT Licensed, Open Source)

**Security Controls**:
- **Access Control**: GitHub repository permissions (public read, maintainer write)
- **Secrets Management**: .gitignore excludes .env, credentials, secrets
- **Code Review**: Not enforced (solo developer, no branch protection detected)
- **Supply Chain**: No package dependencies (shell/Node.js tools only)
- **Content Security**: No user data collection, static content only

**Compliance Requirements**:
- **Open Source Licensing**: MIT License (permissive, attribution required)
- **GDPR**: Not applicable (no personal data processing)
- **No PII/PHI**: Documentation framework only, no sensitive data

**Security Best Practices Implemented**:
- Explicit .gitignore for secrets (.env, credentials)
- No hardcoded credentials detected
- Command documentation includes security reminders (commit-and-push.md checks for secrets)
- SDLC framework includes security agents (Security Gatekeeper, Security Auditor)

**Security Gaps**:
- No branch protection rules (solo developer workflow)
- No automated security scanning (SAST/DAST)
- No dependency scanning (no dependencies to scan)
- No code signing for releases

## Team and Operations (Current)

**Team Size**: Solo Developer (1 active contributor)

**Active Contributors**: Joseph Magly (100% of commits)

**Development Velocity**:
- Last 3 months: 84 commits (28 commits/month avg)
- Last year: 84 commits total (project started recently)
- Commit frequency: ~1 commit/day during active periods

**Process Maturity**:

- **Version Control**: Git with GitHub (simple main branch workflow)
- **Branch Strategy**: GitHub Flow (main branch only, no feature branches detected)
- **Code Review**: Not applicable (solo developer)
- **Testing**: Manual validation (no automated test suite)
- **CI/CD**: GitHub Actions for linting and validation
  - lint-fixcheck.yml: 10 markdown linting checks
  - markdownlint.yml: Comprehensive markdown validation
  - manifest-lint.yml: Manifest consistency checks
- **Documentation**: Comprehensive (README, CLAUDE.md, USAGE_GUIDE, ROADMAP, PROJECT_SUMMARY)
- **Versioning**: No semantic versioning (continuous deployment model)

**Operational Support**:
- **Monitoring**: Not applicable (static content distribution)
- **Logging**: Git history as audit trail
- **Alerting**: GitHub Actions failure notifications
- **On-call**: Not applicable
- **Support Model**: GitHub Issues for community support

**Development Tools**:
- Node.js >= 18.20.8 (LTS Hydrogen) for tooling
- GitHub Actions for CI automation
- markdownlint-cli2 for content validation
- Custom .mjs scripts for manifest/agent/lint automation

## Dependencies and Infrastructure

**Third-Party Services**:
- **GitHub**: Version control, CI/CD, issue tracking, distribution
- **Node.js**: Runtime for tooling scripts (no npm packages)
- **Shell (bash)**: Installation and CLI wrapper

**Infrastructure**:
- **Hosting**: GitHub repository (https://github.com/jmagly/ai-writing-guide.git)
- **Deployment**: Git-based (clone/pull for updates)
- **Distribution**:
  - Direct git clone
  - One-liner install script (curl | bash)
  - CLI wrapper (aiwg) installed to user environment
- **No Database**: File-based content storage (markdown + JSON manifests)
- **No Caching**: Static content, browser/CDN caching only
- **No Message Queue**: Not applicable

**Installation Locations**:
- Default: `~/.local/share/ai-writing-guide`
- Customizable via --prefix flag
- CLI aliases registered in shell rc files (.bashrc, .zshrc)

**Node.js Dependencies**: None (no package.json)
- Pure JavaScript/shell tooling
- No external npm packages
- Self-contained .mjs scripts

## Known Issues and Technical Debt

**Performance Issues**: None detected (static content)

**Security Gaps**:
- No branch protection (acceptable for solo developer)
- No automated security scanning (low risk for documentation)
- No release signing (future enhancement)

**Technical Debt** (from TODO/FIXME analysis):
- **P0-IMPLEMENTATION-SUMMARY.md** lists incomplete tasks:
  - Update framework-inventory.md with new templates
  - Run manifest generation for new templates
  - Update CLAUDE.md with new template counts
- **Potential drift**: Template files added but manifests not regenerated
- **Documentation lag**: New features may not be reflected in all docs

**Modernization Opportunities**:
- Add semantic versioning and releases (GitHub Releases)
- Implement automated changelog generation
- Add contribution guidelines (CONTRIBUTING.md exists but minimal)
- Create automated regression testing for tooling
- Add GitHub branch protection rules
- Implement automated template validation

**Maintenance Considerations**:
- Solo developer bus factor (single maintainer risk)
- Manual manifest synchronization prone to drift
- No automated validation of agent/command deployment
- Template proliferation may need organizational review

## Why This Intake Now?

**Context**: Self-documentation for SDLC framework demonstration and validation

**Goals**:
- Demonstrate `/intake-from-codebase` command capability
- Establish baseline for own SDLC process adoption
- Document current state for future contributors
- Validate comprehensive intake generation from code analysis
- Provide reference example for other projects

**Value of Documentation**:
- Enables structured development planning (roadmap execution)
- Supports contributor onboarding
- Demonstrates framework capabilities to potential users
- Creates audit trail for open source project evolution

## Attachments

- **Solution profile**: [solution-profile.md](./solution-profile.md)
- **Option matrix**: [option-matrix.md](./option-matrix.md)
- **Codebase location**: `/home/manitcor/dev/ai-writing-guide`
- **Repository**: https://github.com/jmagly/ai-writing-guide.git
- **Main documentation**: README.md, CLAUDE.md, USAGE_GUIDE.md
- **Roadmap**: ROADMAP.md (4-phase, 12-month plan)
- **Project summary**: PROJECT_SUMMARY.md

## Next Steps

1. **Review generated intake** for accuracy (validate assumptions)
2. **Complete pending TODOs** from P0-IMPLEMENTATION-SUMMARY.md:
   - Update framework-inventory.md
   - Regenerate manifests for new templates
   - Update CLAUDE.md template counts
3. **Choose improvement path** from option-matrix.md:
   - Option A: Continue current development (maintain agility)
   - Option B: Add versioning and release process (improve stability)
   - Option C: Formalize contribution process (scale community)
4. **Start appropriate SDLC flow**:
   - For roadmap execution: `/flow-iteration-dual-track`
   - For new features: `/flow-concept-to-inception`
   - For community scaling: `/flow-team-onboarding`
5. **Consider adding**:
   - Semantic versioning (git tags)
   - CHANGELOG.md automation
   - Contributor guidelines expansion
   - Automated testing for tooling scripts
