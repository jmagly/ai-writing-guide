# Project Intake Form (Existing System)

**Document Type**: Brownfield System Documentation (Self-Intake)
**Generated**: 2025-10-16
**Source**: Codebase analysis of `~/.local/share/ai-writing-guide`

## Metadata

- **Project name**: AI Writing Guide
- **Repository**: https://github.com/jmagly/ai-writing-guide.git
- **Current Version**: main branch (active development)
- **Last Updated**: 2025-10-16 21:38:14 (feat: implement aiwg-setup-project command)
- **Stakeholders**: Engineering (Joseph Magly - solo developer), future community contributors

## System Overview

**Purpose**: Comprehensive framework for improving AI-generated content quality across chats, agentic processes, and agents, with specialized SDLC toolkit for agentic coding projects.

**Current Status**: Active development, pre-launch (0 users)

**Users**: None currently (preparing for initial launch)

**Tech Stack**:
- **Content**: Markdown documentation (485 files, ~474 focused content files)
- **Tooling**: Node.js (22 .mjs scripts for deployment, validation, manifest generation)
- **Deployment**: Bash installer script (`tools/install/install.sh`)
- **CI/CD**: GitHub Actions (markdown linting, manifest validation)
- **Hosting**: GitHub repository (open source, MIT license)

## Problem and Outcomes

**Problem Statement**:
AI-generated content often exhibits formulaic patterns that trigger detection and lack authentic human voice. Additionally, agentic coding workflows need structured SDLC guidance to produce consistent, traceable artifacts beyond hard-to-process chat logs.

**Target Personas**:
1. **AI Users** (writers, developers using chat interfaces): Need to generate natural, professional content that avoids AI detection patterns
2. **Agentic Developers** (using Claude Code, Cursor, Codex): Need SDLC structure and process to manage complex projects with AI agents
3. **Enterprise Teams**: Need comprehensive lifecycle support from concept through production with compliance/audit trails

**Success Metrics** (aspirational):
- Writing Guide Adoption: Users report reduced AI detection rates, improved content authenticity
- SDLC Framework Adoption: Teams successfully use framework for projects ranging from small (1-3 devs) to enterprise (10+ devs)
- Community Growth: GitHub stars, contributors, issue/PR activity indicating active usage
- Self-Improvement Loop: Framework successfully used to maintain and evolve itself

## Current Scope and Features

### Core Features (Two Products in One Repository)

**1. Writing Quality Framework**:
- `core/`: Writing philosophy and sophistication principles (3 docs)
- `validation/`: Banned patterns, detection markers, validation checklists (3 docs)
- `examples/`: Before/after rewrites, technical writing patterns (3 docs)
- `context/`: Quick-reference guides for different voices (executive, technical, academic) (5 docs)
- `patterns/`: Common AI tells and avoidance strategies (1 doc)
- `agents/`: 3 writing-focused agents (writing-validator, prompt-optimizer, content-diversifier)
- `commands/`: General command documentation

**2. SDLC Complete Framework** (`agentic/code/frameworks/sdlc-complete/`):
- **58 specialized agents**: Covering all lifecycle roles (requirements-analyst, architecture-designer, security-gatekeeper, test-engineer, devops-engineer, incident-responder, etc.)
- **45 slash commands**: Project management, intake, phase transitions, quality gates, deployment, security reviews
- **156 templates**: Intake forms, requirements (user stories, use cases), architecture (SAD, ADRs), test plans, security artifacts, deployment runbooks
- **Phase-based workflows**: Inception → Elaboration → Construction → Transition → Production
- **Add-ons**: GDPR compliance, legal frameworks
- **Metrics**: Health indicators, tracking catalogs

**3. Development Tools** (`tools/`):
- Agent deployment (`deploy-agents.mjs`): Deploy agents/commands to Claude Code projects
- Project scaffolding (`new-project.mjs`): Bootstrap new projects with SDLC templates
- Markdown linting (10 custom fixers): MD012, MD022, MD031, MD038, MD041, MD047, etc.
- Manifest management (`generate-manifest.mjs`, `sync-manifests.mjs`, `enrich-manifests.mjs`): Track documentation structure
- Card prefilling (`prefill-cards.mjs`): Auto-populate SDLC card metadata from team profiles
- CLI installer (`install.sh`): One-line install to `~/.local/share/ai-writing-guide`

### Recent Additions (last 3 months from git log)

**Active Development Focus**:
- aiwg-setup-project command (update existing project CLAUDE.md with orchestration guidance)
- Natural language translation guide for flow orchestration
- Multi-provider support (Claude Code + OpenAI/Codex compatibility)
- Intake process (intake-wizard, intake-from-codebase, option-matrix with project type handling)
- Agent tool standardization (comma-separated format, core fundamental tools)
- Markdown linting CI/CD (drift prevention, automated fixes)

**All 105 commits in last 3 months** from solo developer

### Planned/In Progress

- **Small team testing** (2-3 contributors within 6 months)
- **Self-application maturity**: Using framework to manage its own development (early/experimental stage)
- **Multi-platform refactor** (if needed): Abstraction layer for OpenAI, Codex, other LLM platforms
- **Community infrastructure**: If traction grows, need FAQs, self-service support, PR acceptance patterns

## Architecture (Current State)

**Architecture Style**: Multi-component documentation/tooling system

**Components**:

1. **Writing Guide Content** (485 markdown files):
   - Core philosophy and validation rules
   - Context-optimized documents for agent consumption
   - Examples and pattern libraries

2. **SDLC Framework** (`agentic/code/frameworks/sdlc-complete/`):
   - Agents (58 specialized roles)
   - Commands (45 slash commands for workflows)
   - Templates (156 structured documents)
   - Flows (phase-based orchestration guides)

3. **Tooling Layer** (22 Node.js scripts):
   - Deployment automation (agents, commands)
   - Project scaffolding
   - Content validation (linting, manifests)
   - Installation/distribution (bash CLI)

4. **Distribution**:
   - GitHub repository (primary distribution)
   - Bash installer → `~/.local/share/ai-writing-guide`
   - CLI command: `aiwg` with subcommands (-deploy-agents, -new, -version, -update, -help)

**Data Models**:
- Documentation files (markdown with frontmatter where applicable)
- Manifest.json (directory-level metadata)
- Agent definitions (.md files with YAML-style headers)
- Command definitions (.md files in `.claude/commands/`)

**Integration Points**:
- GitHub Actions (CI/CD for linting, validation)
- Claude Code (primary target platform - agents deployed to `.claude/agents/`)
- OpenAI/Codex (secondary target - agents deployed to `.codex/agents/` or single `AGENTS.md`)
- Git (version control, contributor workflows)
- Node.js runtime (for tooling scripts, requires >=18.20.8)

## Scale and Performance (Current)

**Current Capacity**: Solo developer, pre-launch (0 users)

**Active Users**: 0 (framework in active development)

**Performance Characteristics**:
- **Repository size**: ~500 files, primarily markdown (text-based, lightweight)
- **Tool performance**: Deploy scripts, linting fast (<5s for most operations)
- **Documentation consumption**: Designed for LLM context windows (agents read docs, users ask questions)

**Performance Optimizations Present**:
- Context-optimized documents (quick-reference, condensed versions)
- Modular deployment (general vs SDLC vs both modes, project-type-specific subsets)
- Manifest-based tracking (avoid full repo scans)
- Incremental linting (GitHub Actions only checks changed files)

**Bottlenecks/Pain Points** (from user answers):
- **Potential scale issues**: Support capacity (solo developer can't handle 100 issues/week)
- **Pivot triggers**: User testing revealing wrong assumptions, performance/scale issues even at small usage
- **10x growth limiting factor**: Support infrastructure (need FAQs, self-service, PR acceptance patterns for self-improvement loops)

## Security and Compliance (Current)

**Security Posture**: Minimal (appropriate for documentation/tooling project)

**Data Classification**: Public (open source, MIT license, no user data)

**Security Controls**:
- **Authentication**: None (public repository)
- **Authorization**: GitHub repository permissions (solo maintainer currently)
- **Data Protection**: No sensitive data handled
- **Secrets Management**: N/A (no API keys, credentials, or secrets)

**Compliance Requirements**:
- **GDPR**: N/A (no PII, no user accounts, no data collection)
- **PCI-DSS**: N/A (no payments)
- **HIPAA**: N/A (no health data)
- **License Compliance**: MIT license (permissive, attribution required)

## Team and Operations (Current)

**Team Size**: Solo developer (Joseph Magly)

**Active Contributors**: 1 (105 commits in last 3 months)

**Development Velocity**: 35 commits/month average (~1+ per day)

**Process Maturity**:
- **Version Control**: GitHub Flow (main branch + feature branches, though primarily direct commits currently)
- **Code Review**: Self-review (solo developer), will add PR review process with team expansion
- **Testing**: Manual testing currently (accepting 30-50% coverage, will add automated tests post-validation)
- **CI/CD**: GitHub Actions for linting and manifest validation
- **Documentation**: Comprehensive (README, USAGE_GUIDE, AGENTS.md, CLAUDE.md, CONTRIBUTING.md, per-directory READMEs)

**Operational Support**:
- **Monitoring**: GitHub Issues (for user-reported problems)
- **Logging**: N/A (documentation project, no runtime logs)
- **Alerting**: GitHub notifications for issues/PRs
- **On-call**: N/A (no production systems)

## Dependencies and Infrastructure

**Third-Party Services**:
- **GitHub**: Repository hosting, CI/CD (GitHub Actions), issue tracking
- **Node.js**: Runtime for tooling scripts (requires >=18.20.8)

**Infrastructure**:
- **Hosting**: GitHub (public repository)
- **Deployment**: User-initiated (bash install script to local machine)
- **Database**: None
- **Caching**: None
- **Message Queue**: None

**Development Dependencies** (inferred from usage):
- Node.js >=18.20.8
- Bash (for install script)
- Git (for repository operations)
- markdownlint-cli2 (for markdown validation)

## Known Issues and Technical Debt

**Performance Issues**:
- None currently (pre-launch, no users)
- Potential future: Support capacity at scale (solo developer limit)

**Security Gaps**:
- None critical (public documentation, no sensitive data)
- Future consideration: Contributor authentication if team expands (handled by GitHub)

**Technical Debt** (from user responses):
- **Testing**: Manual only, accepting 30-50% coverage short-term. Plan to add comprehensive tests post-user-validation.
- **Documentation**: Core usage covered, but may need beginner-friendly paths if user testing reveals clarity issues
- **Code Quality**: Prioritizing features over refactoring, technical debt acceptable short-term (will clean up post-validation)
- **Self-application**: Early/experimental stage - framework not yet fully self-hosted, will mature over time

**Modernization Opportunities**:
- **Multi-platform abstraction**: Currently Claude Code-focused, may need OpenAI/Codex abstraction layer if multi-platform adoption grows
- **Community infrastructure**: Self-service support (FAQs, discussions), PR acceptance patterns for self-improvement loops
- **Automated testing**: Add unit tests for tooling scripts, integration tests for deployment workflows

## Why This Intake Now?

**Context**: Framework author using intake process on own project to:
1. **Document baseline**: Establish clear snapshot of current state before broader launch
2. **Self-application testing**: Use framework on itself (early/experimental stage, testing what works)
3. **SDLC adoption**: Begin formal process for project that's been rapid prototype/development
4. **Prepare for team expansion**: Planning 2-3 contributors within 6 months, need shared understanding
5. **Community launch preparation**: Ship-now mindset (already usable), but need clear documentation of current state and evolution plan

**Goals**:
- Establish SDLC baseline for existing system
- Document for future contributors (onboarding clarity)
- Plan evolution roadmap (solo → small team, pre-launch → community-driven)
- Support self-improvement loop (using framework to improve framework)
- Prepare for user testing (validate assumptions before broader adoption)

## Attachments

- Solution profile: [solution-profile.md](./solution-profile.md)
- Option matrix: [option-matrix.md](./option-matrix.md)
- Codebase location: `~/.local/share/ai-writing-guide`
- Repository: `https://github.com/jmagly/ai-writing-guide.git`

## Next Steps

1. **Review generated intake for accuracy**: Verify codebase analysis and user responses captured correctly
2. **Fill any gaps**: No critical unknowns currently, but may add details as team expands
3. **Choose improvement path from option-matrix.md**:
   - **Current**: Ship-now mode (iterate based on feedback)
   - **Short-term** (2-4 weeks): User testing with 2-5 users, fix critical issues
   - **Medium-term** (1-2 months): Stability milestone, add 2-3 contributors, mature self-application
   - **Long-term** (6-12 months): Depends on traction (community vs commercial vs personal tool)
4. **Start appropriate SDLC flow**:
   - **Continue development**: Use framework workflows (self-application)
   - **User testing**: `flow-team-onboarding` for new contributors
   - **Refactoring**: `flow-architecture-evolution` if multi-platform pivot needed
   - **Launch preparation**: `project-status` command to track readiness
