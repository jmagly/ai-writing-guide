# Warp AI Platform Analysis and Integration Research

**Research Date**: 2025-10-17
**Researcher**: Technical Research Agent
**Purpose**: Analyze Warp AI capabilities and identify integration requirements for AI Writing Guide (AIWG) SDLC framework

## Executive Summary

Warp is a Rust-based modern terminal with integrated AI capabilities that supports context-aware project rules through **Global Rules** and **Project Rules** (WARP.md files). Unlike Claude Code (.claude/) and OpenAI Codex (.codex/) which are IDE/editor-based agent systems, Warp AI is a terminal-native AI assistant that augments command-line workflows.

**Key Findings**:
- Warp uses **WARP.md** files (similar to CLAUDE.md) for project-specific context injection
- Supports **Rules** system for customizing AI behavior per-project
- Terminal-native architecture (not IDE-based like Claude/Codex)
- No native multi-agent orchestration (single AI assistant model)
- Limited templating/artifact generation compared to Claude Code's agent ecosystem

**Integration Feasibility**: Moderate complexity. AIWG can provide Warp-compatible documentation and rule sets, but lacks parity with Claude's multi-agent orchestration capabilities.

---

## 1. Warp AI Platform Overview

### 1.1 Platform Architecture

**Core Components**:
- **Warp Terminal**: Rust-based terminal emulator with built-in AI capabilities
- **Warp AI**: Integrated AI assistant for command generation, debugging, explanations
- **Rules System**: Context injection via Global Rules (user-wide) and Project Rules (WARP.md)
- **Command Search**: AI-powered command palette with natural language queries
- **Workflows**: Reusable command sequences (similar to shell scripts/aliases)

**Design Philosophy**:
- Enhance terminal experience with AI assistance
- Keep developers in the terminal (vs switching to IDE)
- Context-aware command generation based on project state
- Reduce cognitive load for complex CLI operations

### 1.2 Technology Stack

**Known Details**:
- **Language**: Rust (terminal performance-critical)
- **AI Backend**: Proprietary (likely GPT-based via API)
- **Platforms**: macOS, Linux (beta), Windows (planned)
- **License**: Proprietary (free tier available)

**Integration Points**:
- File system (reads WARP.md from project root)
- Git (awareness of repository state)
- Shell environment (PATH, env vars)
- Process spawning (executes generated commands)

---

## 2. Warp AI Rules System

### 2.1 Rule Types

#### Global Rules
- **Scope**: Apply to all terminal sessions for a user
- **Location**: Warp settings (cloud-synced or local)
- **Use Cases**:
  - Personal preferences (e.g., "always use verbose flags")
  - Company-wide coding standards
  - Default tool preferences (e.g., "prefer pnpm over npm")

#### Project Rules (WARP.md)
- **Scope**: Apply only to terminal sessions within a specific project directory
- **Location**: `WARP.md` in project root (or `.warp/config.md`)
- **Use Cases**:
  - Project-specific conventions (e.g., "use Docker for local dev")
  - Build commands and workflows
  - Team-specific guidelines
  - Architecture context for AI recommendations

### 2.2 WARP.md Format

**Structure** (inferred from standard patterns):

```markdown
# Project Rules for Warp AI

## Project Context
Brief description of project, tech stack, and conventions.

## Development Workflow
Common commands and their purpose.

## Build and Deploy
How to build, test, and deploy the project.

## Conventions
Coding standards, naming conventions, commit message format.

## Constraints
Things AI should avoid suggesting (e.g., "never use sudo", "avoid npm, use pnpm").

## Custom Commands
Project-specific aliases or workflows.
```

**Example WARP.md**:

```markdown
# Warp AI Rules - E-Commerce API

## Project Context
Node.js + TypeScript backend for e-commerce platform.
- Stack: Express, PostgreSQL, Redis, Docker
- Monorepo: packages/api, packages/shared
- Testing: Jest (unit), Supertest (integration)

## Development Workflow
- Install: `pnpm install` (always use pnpm, not npm)
- Dev server: `pnpm dev` (runs on localhost:3000)
- Database: `docker-compose up db redis` (starts dependencies)
- Migrations: `pnpm migrate:dev` (apply new migrations)

## Build and Deploy
- Build: `pnpm build` (compiles TypeScript)
- Test: `pnpm test` (runs Jest suite)
- Lint: `pnpm lint` (ESLint + Prettier)
- Deploy: Push to `main` triggers GitHub Actions

## Conventions
- Commit messages: Conventional Commits (feat:, fix:, chore:)
- Branch naming: feature/*, bugfix/*, hotfix/*
- Code style: Prettier (2 spaces, single quotes)
- Never commit .env files

## Constraints
- Never suggest `npm install` (use pnpm)
- Never suggest `sudo` for package installs
- Avoid exposing secrets in command suggestions
- Use Docker for PostgreSQL (never local install)
```

### 2.3 Rule Precedence

**Priority Order** (highest to lowest):
1. User's explicit command/query
2. Project Rules (WARP.md in current directory)
3. Global Rules (user settings)
4. Default AI behavior

**Conflict Resolution**:
- Project Rules override Global Rules
- More specific rules override general rules
- User corrections teach AI for session (not persistent)

---

## 3. Warp AI Capabilities

### 3.1 Core Features

#### Natural Language Command Generation
- **Input**: User describes intent in natural language
- **Output**: Executable command with explanation
- **Example**:
  - Query: "list all Docker containers including stopped ones"
  - Output: `docker ps -a` with explanation

#### Command Debugging
- **Input**: Failed command + error output
- **Output**: Diagnosis and corrected command
- **Example**:
  - Error: `permission denied: ./script.sh`
  - Suggestion: `chmod +x script.sh && ./script.sh`

#### Documentation Lookup
- **Input**: Tool name or command fragment
- **Output**: Man page summary, common flags, examples
- **Example**: "explain git rebase --interactive"

### 3.2 Limitations

**No Multi-Agent Orchestration**:
- Warp AI is a single assistant (no specialized agents like AIWG's 58 SDLC agents)
- Cannot delegate subtasks to domain experts (security, testing, architecture)
- No parallel task execution with independent agents

**No Artifact Generation**:
- Focuses on command generation, not document creation
- Cannot generate templates (requirements docs, architecture diagrams, test plans)
- No built-in SDLC artifact workflows

**Limited Context Window**:
- WARP.md provides context, but no access to full codebase indexing
- Cannot perform cross-file analysis (like Claude Code with Read tool)
- No semantic code search across repository

**Terminal-Only Scope**:
- Cannot edit files directly (only suggest editor commands)
- No file system manipulation beyond commands
- Cannot render visualizations or diagrams

---

## 4. Comparison: Warp vs Claude Code vs OpenAI Codex

### 4.1 Architecture Comparison

| Aspect | Warp AI | Claude Code | OpenAI Codex |
|--------|---------|-------------|--------------|
| **Platform** | Terminal emulator | IDE-agnostic CLI | IDE plugin (VS Code, Cursor) |
| **Context Injection** | WARP.md (project root) | CLAUDE.md (.claude/) | .codex/ directory |
| **Agent Model** | Single assistant | Multi-agent (58+ SDLC agents) | Single agent + sub-agents |
| **Codebase Access** | Command-line only | Full file system (Read/Write tools) | Full file system (editor API) |
| **Orchestration** | None (single-turn interactions) | Complex workflows (Task tool, parallel execution) | Sequential sub-agent calls |
| **Output Format** | Commands + explanations | Files, code, documentation | Code completions, file edits |
| **Slash Commands** | Limited (workflows) | Extensive (42+ SDLC commands) | Custom commands per project |

### 4.2 Feature Comparison

| Feature | Warp AI | Claude Code | OpenAI Codex |
|---------|---------|-------------|--------------|
| **Natural Language Commands** | ✅ Core feature | ✅ Via Bash tool | ⚠️ Limited (focused on code) |
| **Multi-Agent Workflows** | ❌ Not supported | ✅ 58 SDLC agents | ⚠️ Sub-agents (limited roles) |
| **Template Generation** | ❌ Not supported | ✅ 100+ SDLC templates | ⚠️ Code templates only |
| **File Editing** | ❌ Command suggestions only | ✅ Direct file manipulation | ✅ Direct file manipulation |
| **Codebase Indexing** | ❌ No semantic search | ✅ Glob, Grep tools | ✅ Editor symbol index |
| **Phase Workflows** | ❌ Not applicable | ✅ Inception → Transition flows | ❌ Not applicable |
| **Traceability** | ❌ Not supported | ✅ Requirements → code → tests | ⚠️ Limited |
| **Compliance Artifacts** | ❌ Not supported | ✅ GDPR, SOC2, audit trails | ❌ Not supported |

### 4.3 Use Case Fit

**Warp AI Best For**:
- Command-line power users
- DevOps/infrastructure work (kubectl, docker, aws-cli)
- Quick command generation and debugging
- Terminal-based workflows (git, build tools)

**Claude Code Best For**:
- Full SDLC orchestration (requirements → deployment)
- Multi-agent collaborative artifact generation
- Complex project planning and architecture
- Compliance and governance workflows

**OpenAI Codex Best For**:
- Code completion and generation
- Inline coding assistance
- Rapid prototyping
- IDE-native workflows

---

## 5. Integration Requirements for AIWG

### 5.1 Current AIWG Integration Patterns

**Multi-Provider Strategy** (from `deploy-agents.mjs`):
```javascript
// Supports Claude and OpenAI via --provider flag
aiwg -deploy-agents --provider claude  // Deploys to .claude/agents/
aiwg -deploy-agents --provider openai  // Deploys to .codex/agents/
```

**Deployment Targets**:
- `.claude/agents/` - Claude Code agent definitions
- `.claude/commands/` - Claude Code slash commands
- `.codex/agents/` - OpenAI Codex agent definitions
- `.codex/commands/` - OpenAI Codex command definitions

**Template Structure**:
- Agent Markdown files with YAML frontmatter (model, tools, description)
- Command Markdown files with YAML frontmatter (category, arguments, allowed-tools)
- Templates for SDLC artifacts (100+ documents)

### 5.2 Warp Integration Approach

#### Option 1: WARP.md Generation (Recommended)

**Strategy**: Generate project-specific WARP.md files that provide SDLC context to Warp AI.

**Implementation**:
```bash
# New CLI command
aiwg -deploy-warp --target /path/to/project

# Generates:
# - WARP.md (project root) - SDLC context and conventions
# - .warp/workflows/ (optional) - Common SDLC commands as workflows
```

**WARP.md Contents**:
```markdown
# Warp AI Rules - [Project Name]

## SDLC Framework
This project uses the AI Writing Guide SDLC framework.
- **Current Phase**: {Inception|Elaboration|Construction|Transition}
- **Profile**: {Prototype|MVP|Production|Enterprise}
- **Artifacts**: Located in `.aiwg/` directory

## Common SDLC Commands

### Intake and Planning
- Generate intake forms: `node /path/to/aiwg/tools/intake-wizard.mjs`
- Check project status: `node /path/to/aiwg/tools/project-status.mjs`

### Development Workflow
- Run iteration: `git checkout -b feature/name && git commit && git push`
- Run tests: `npm test` (or project-specific)
- Lint code: `npm run lint`

### Quality Gates
- Security scan: `npm audit` (or project-specific)
- Check test coverage: `npm test -- --coverage`
- Validate traceability: `node /path/to/aiwg/tools/check-traceability.mjs`

## Project Conventions
[From project CLAUDE.md - code style, commit format, branch naming]

## Architecture Context
[From .aiwg/architecture/ - key architectural decisions, component overview]

## Constraints
- Never commit .env files or secrets
- Always run tests before pushing
- Follow semantic versioning for releases
- Maintain requirements traceability
```

**Advantages**:
- Low friction (single file, familiar pattern)
- Warp AI can reference SDLC context in command suggestions
- No Warp-specific tooling required
- Works with existing Warp installation

**Limitations**:
- No multi-agent orchestration (Warp has single assistant)
- No template generation (commands only, not documents)
- Limited to command suggestions (can't create artifacts)

#### Option 2: Warp Workflows (Complementary)

**Strategy**: Package common SDLC commands as Warp Workflows (reusable command sequences).

**Implementation**:
```bash
# Deploy workflows to project
aiwg -deploy-warp-workflows --target /path/to/project

# Generates:
# - .warp/workflows/intake-wizard.yaml
# - .warp/workflows/run-iteration.yaml
# - .warp/workflows/security-gate.yaml
# - etc.
```

**Example Workflow** (`.warp/workflows/intake-wizard.yaml`):
```yaml
name: Generate Project Intake
description: Create complete intake forms for SDLC framework
command: |
  node /path/to/aiwg/tools/intake-wizard.mjs \
    --project "$(pwd)" \
    --interactive
tags:
  - sdlc
  - planning
  - intake
```

**Advantages**:
- One-click SDLC commands from Warp UI
- No need to remember complex paths
- Shareable across team (committed to repo)

**Limitations**:
- Static commands (no dynamic orchestration)
- No feedback loop (workflow runs, but no agent reasoning)
- Requires Warp-specific configuration

#### Option 3: Hybrid Approach (Best of Both)

**Strategy**: Combine WARP.md (context) + Workflows (commands) + documentation referencing Claude Code for full capabilities.

**Implementation**:
```markdown
# WARP.md

## SDLC Framework
This project uses AIWG SDLC framework. For full capabilities, use Claude Code.

**Warp AI Usage** (command generation, terminal workflows):
- See "Common SDLC Commands" below for quick workflows
- Warp AI will suggest commands based on SDLC context

**Claude Code Usage** (multi-agent orchestration, artifact generation):
- Complex workflows: Use `/project:flow-*` commands in Claude Code
- Artifact generation: Use specialized agents (architecture-designer, test-engineer, etc.)
- Natural language orchestration: "Start Inception", "Run security review", etc.

## Quick Commands (Warp Workflows)
- `intake-wizard` - Generate project intake forms
- `run-tests` - Execute test suite with coverage
- `security-scan` - Run security validation

## Full SDLC Capabilities (Claude Code)
For comprehensive SDLC orchestration, use Claude Code:
1. Install Claude Code: [link]
2. Deploy AIWG agents: `aiwg -deploy-agents --mode sdlc`
3. Natural language commands: "Let's transition to Elaboration"
```

### 5.3 Technical Implementation

#### File Structure
```
project-root/
├── WARP.md                      # Warp AI project rules
├── CLAUDE.md                    # Claude Code orchestration context
├── .warp/
│   └── workflows/               # Warp command workflows
│       ├── intake-wizard.yaml
│       ├── run-iteration.yaml
│       └── security-gate.yaml
├── .claude/
│   ├── agents/                  # Claude Code SDLC agents
│   └── commands/                # Claude Code slash commands
└── .aiwg/                       # SDLC artifacts
    ├── intake/
    ├── requirements/
    ├── architecture/
    └── ...
```

#### CLI Extension
```javascript
// tools/agents/deploy-warp.mjs

function generateWarpMd(projectPath) {
  // Read CLAUDE.md for project context
  const claudeContext = readFile(path.join(projectPath, 'CLAUDE.md'));

  // Read .aiwg/intake/ for SDLC state
  const intakeData = readIntakeFiles(path.join(projectPath, '.aiwg/intake'));

  // Generate WARP.md
  const warpMd = `
# Warp AI Rules - ${intakeData.projectName}

## SDLC Framework
- Phase: ${intakeData.currentPhase}
- Profile: ${intakeData.profile}
- Architecture: ${intakeData.architecture}

## Common Commands
${generateCommandList(projectPath)}

## Project Conventions
${extractConventions(claudeContext)}

## For Full SDLC Capabilities
Use Claude Code with AIWG agents for:
- Multi-agent orchestration
- Complex workflows (phase transitions, security reviews)
- Artifact generation (requirements, architecture, test plans)
  `;

  writeFile(path.join(projectPath, 'WARP.md'), warpMd);
}
```

#### Deployment Command
```bash
# Add to aiwg CLI
aiwg -deploy-warp [--target /path] [--with-workflows]

# Options:
# --target: Project directory (default: cwd)
# --with-workflows: Include .warp/workflows/ for common commands
```

---

## 6. Key Differences: Warp vs Claude/Codex

### 6.1 Fundamental Architecture Differences

**Claude Code/Codex**: Multi-agent systems with orchestration
- Multiple specialized agents (architecture-designer, test-engineer, security-gatekeeper)
- Parallel task execution (primary author → multiple reviewers → synthesizer)
- State management across workflow steps
- Complex artifact generation (documents, code, diagrams)

**Warp AI**: Single-agent terminal assistant
- One AI assistant per session
- No task delegation or parallel execution
- Stateless interactions (no workflow memory)
- Command generation only (no artifact creation)

### 6.2 Context Injection Comparison

| Aspect | Warp (WARP.md) | Claude (CLAUDE.md) | Codex (.codex/) |
|--------|----------------|-------------------|----------------|
| **File Location** | Project root | Project root | Project root |
| **Format** | Markdown (rules) | Markdown (instructions) | Directory structure |
| **Size Limit** | Unknown (likely <10KB) | No hard limit (context window) | No hard limit |
| **Update Frequency** | Static (manual) | Static (manual) | Static (manual) |
| **Scope** | Command generation | Full orchestration | Code generation |
| **Agent Awareness** | Single AI reads all | Each agent reads all | Single agent + sub-agents |

### 6.3 Capability Gaps for AIWG

**What Warp AI Cannot Do** (vs Claude Code):
1. **Multi-Agent Workflows**: No parallel reviewers, no specialized domain experts
2. **Artifact Generation**: Cannot create documents (SAD, test plans, threat models)
3. **Traceability**: Cannot link requirements → code → tests → deployment
4. **Phase Management**: Cannot orchestrate Inception → Elaboration → Construction → Transition
5. **Quality Gates**: Cannot validate gate criteria (coverage, security scans, compliance)
6. **Natural Language Orchestration**: Cannot interpret "Start security review" and launch multi-step workflow

**What Warp AI Can Do**:
1. **Command Assistance**: Suggest git, docker, npm, aws-cli commands based on WARP.md context
2. **Debugging**: Diagnose failed commands and suggest fixes
3. **Workflow Shortcuts**: Quick access to common commands via workflows
4. **Documentation**: Explain commands and tools in terminal context

---

## 7. Integration Recommendations

### 7.1 Short-Term (MVP)

**Goal**: Provide basic Warp AI support for AIWG users.

**Deliverables**:
1. **WARP.md Generator**:
   - CLI command: `aiwg -deploy-warp`
   - Generates single WARP.md with SDLC context
   - References Claude Code for full capabilities

2. **Documentation**:
   - Add "Using AIWG with Warp Terminal" guide to docs/
   - Explain Warp's limitations vs Claude Code
   - Provide example WARP.md templates

**Effort**: Low (1-2 days)

**User Value**: Warp users get SDLC context for command suggestions, understand when to switch to Claude Code

### 7.2 Medium-Term (Enhanced)

**Goal**: Add convenient workflows for common SDLC commands.

**Deliverables**:
1. **Warp Workflows**:
   - Generate `.warp/workflows/` directory
   - Package common commands (intake-wizard, run-iteration, security-gate)
   - Include in `aiwg -deploy-warp --with-workflows`

2. **WARP.md Templates**:
   - Phase-specific WARP.md (Inception.warp.md, Elaboration.warp.md)
   - Profile-specific rules (Prototype, MVP, Production, Enterprise)
   - Auto-update WARP.md on phase transitions

**Effort**: Medium (3-5 days)

**User Value**: One-click SDLC commands from Warp UI, phase-appropriate context

### 7.3 Long-Term (Experimental)

**Goal**: Explore Warp-native capabilities (if API becomes available).

**Deliverables**:
1. **Warp Extension API** (if released):
   - Custom Warp plugin for AIWG
   - Direct integration with .aiwg/ artifacts
   - Real-time SDLC phase awareness

2. **Warp AI Fine-Tuning** (if supported):
   - Train Warp AI on SDLC patterns
   - Improve command suggestions for AIWG workflows

**Effort**: High (weeks to months, pending Warp API availability)

**User Value**: Seamless SDLC experience in terminal, no Claude Code required for simple workflows

### 7.4 Recommendation Summary

**Prioritize**: Short-term (WARP.md generator) + documentation
**Defer**: Long-term experimental work (pending Warp API)
**Consider**: Medium-term workflows if user demand exists

**Rationale**:
- Warp AI's single-agent architecture cannot replace Claude Code's multi-agent orchestration
- WARP.md provides value for command suggestions without significant development effort
- Most AIWG users will need Claude Code for full SDLC capabilities
- Warp integration is complementary, not a replacement

---

## 8. Technical Constraints

### 8.1 Warp Platform Limitations

**Terminal-Only Scope**:
- Cannot edit files directly (only suggest editor commands)
- Cannot render diagrams or visualizations
- Cannot perform cross-file analysis
- Cannot access network APIs (no WebFetch equivalent)

**Single-Agent Model**:
- No task delegation to specialized agents
- No parallel execution of subtasks
- No workflow memory across sessions
- No multi-step orchestration

**Context Window**:
- WARP.md likely has size limit (unknown, but terminal-appropriate)
- No access to full codebase (unlike Claude Code with Read tool)
- No semantic code search

### 8.2 AIWG Framework Requirements

**Multi-Agent Orchestration** (REQUIRED):
- AIWG relies on 58 specialized SDLC agents
- Workflows use parallel reviewers (security, testing, architecture)
- Cannot be replicated with single Warp AI assistant

**Artifact Generation** (REQUIRED):
- AIWG generates 100+ document types (SAD, ADRs, test plans, threat models)
- Warp AI cannot create files (only suggest commands)
- No template rendering or document assembly

**Phase Management** (REQUIRED):
- AIWG orchestrates complex phase transitions (Inception → Elaboration)
- Requires stateful workflow tracking across multiple sessions
- Warp AI is stateless (no session memory)

### 8.3 Integration Feasibility Assessment

| Requirement | Claude Code | Warp AI | Gap |
|-------------|-------------|---------|-----|
| Multi-agent orchestration | ✅ Full support | ❌ Single agent | **CRITICAL** |
| Artifact generation | ✅ 100+ templates | ❌ Commands only | **CRITICAL** |
| File system access | ✅ Read/Write tools | ❌ Command suggestions | **MAJOR** |
| Phase workflows | ✅ Natural language orchestration | ❌ No workflow state | **MAJOR** |
| Context injection | ✅ CLAUDE.md | ✅ WARP.md | ✅ Compatible |
| Command assistance | ✅ Bash tool | ✅ Core feature | ✅ Compatible |
| Traceability | ✅ Requirements → code | ❌ No traceability | **MAJOR** |

**Conclusion**: Warp AI can **complement** Claude Code for terminal workflows, but cannot **replace** Claude Code for full SDLC orchestration.

---

## 9. Proposed Integration Architecture

### 9.1 Hybrid Multi-Platform Strategy

**Core Principle**: AIWG remains Claude Code-first, with Warp AI as a supplementary terminal interface.

```
┌─────────────────────────────────────────────────────────┐
│                    AIWG SDLC Framework                   │
│  (Templates, Agents, Commands, Flows, Metrics)          │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
  ┌─────────┐    ┌─────────┐    ┌─────────┐
  │ Claude  │    │ OpenAI  │    │  Warp   │
  │  Code   │    │  Codex  │    │   AI    │
  └─────────┘    └─────────┘    └─────────┘
       │               │               │
       ▼               ▼               ▼
  Full SDLC      Code-focused    Terminal-focused
  Orchestration  Generation      Command Assistance
```

**Platform Roles**:
- **Claude Code**: Primary orchestrator (multi-agent workflows, artifact generation, phase management)
- **OpenAI Codex**: Code generation and completion (IDE-native, inline assistance)
- **Warp AI**: Terminal command assistance (git, docker, build tools, debugging)

### 9.2 Deployment Modes

```bash
# Full SDLC (Claude Code) - Default
aiwg -deploy-agents --mode sdlc --provider claude
# Deploys: .claude/agents/, .claude/commands/, CLAUDE.md

# Code Generation (OpenAI Codex)
aiwg -deploy-agents --mode sdlc --provider openai
# Deploys: .codex/agents/, .codex/commands/, CODEX.md

# Terminal Assistance (Warp AI) - NEW
aiwg -deploy-warp [--with-workflows]
# Deploys: WARP.md, .warp/workflows/ (optional)

# All Platforms (Comprehensive)
aiwg -deploy-all
# Deploys: All of the above
```

### 9.3 Context Synchronization

**Challenge**: Keep WARP.md, CLAUDE.md, and .aiwg/ artifacts in sync.

**Solution**: WARP.md reads from CLAUDE.md and .aiwg/intake/ during generation.

```javascript
// Pseudo-code for WARP.md generation

function generateWarpMd(projectPath) {
  // Read project state
  const claudeMd = readFile(path.join(projectPath, 'CLAUDE.md'));
  const intake = readIntakeFiles(path.join(projectPath, '.aiwg/intake'));

  // Extract key SDLC info
  const phase = intake.currentPhase || 'Unknown';
  const profile = intake.profile || 'MVP';
  const architecture = intake.architecture || 'Monolith';

  // Generate Warp-specific rules
  return `
# Warp AI Rules - ${intake.projectName}

## SDLC Context
- **Current Phase**: ${phase}
- **Profile**: ${profile}
- **Architecture**: ${architecture}
- **Artifacts**: See .aiwg/ directory

## Common Commands
${extractCommandsFromClaude(claudeMd)}

## Project Conventions
${extractConventionsFromClaude(claudeMd)}

## Architecture Overview
${extractArchitectureFromIntake(intake)}

## For Complex Workflows
Use Claude Code for:
- Phase transitions (Inception → Elaboration)
- Multi-agent artifact generation (SAD, test plans)
- Security and compliance workflows
- Natural language orchestration
  `;
}
```

**Synchronization Strategy**:
- WARP.md is **generated** from CLAUDE.md + .aiwg/intake/ (not manually edited)
- Run `aiwg -deploy-warp` after phase transitions to update context
- Include in `/project:flow-*` commands as final step

---

## 10. Example Use Cases

### 10.1 Use Case: Terminal-Native Developer

**Scenario**: Developer prefers terminal, rarely uses IDE.

**Workflow**:
1. **Planning** (Claude Code):
   - Use Claude Code web interface or CLI
   - Run `/project:intake-wizard "Build customer API"`
   - Review generated .aiwg/intake/ files

2. **Development** (Warp AI + Editors):
   - Open terminal in project root
   - Warp AI suggests git commands based on WARP.md conventions
   - Use vim/nano/micro for coding (Warp AI suggests commands, doesn't edit)

3. **Testing and Deployment** (Warp AI):
   - Warp AI suggests test commands: `npm test`, `docker-compose up`
   - Warp AI helps debug failed CI: "explain this error" → suggests fix

4. **Phase Transitions** (Claude Code):
   - Return to Claude Code for complex orchestration
   - Run `/project:flow-inception-to-elaboration`
   - Claude generates SAD, ADRs, test strategy
   - Re-run `aiwg -deploy-warp` to update WARP.md with new phase context

**Value**: Warp AI handles day-to-day terminal tasks, Claude Code handles SDLC orchestration.

### 10.2 Use Case: DevOps Engineer

**Scenario**: Focus on infrastructure, deployment, and monitoring.

**Workflow**:
1. **Initial Setup** (Claude Code):
   - Use Claude Code to generate deployment plans, runbooks
   - Run `/project:flow-deploy-to-production`
   - Review .aiwg/deployment/ artifacts

2. **Daily Operations** (Warp AI):
   - Warp AI suggests kubectl commands: "show failing pods" → `kubectl get pods --field-selector=status.phase!=Running`
   - Warp AI helps debug: "check logs for pod X" → `kubectl logs <pod> --tail=100`
   - Warp workflows: Quick access to common ops commands

3. **Incident Response** (Claude Code + Warp AI):
   - Use Claude Code `/project:flow-incident-response` for structured triage
   - Use Warp AI for rapid command execution during live incident
   - Claude Code generates post-mortem, Warp AI captures command history

**Value**: Warp AI accelerates terminal-based ops work, Claude Code provides structure and documentation.

### 10.3 Use Case: Small Team (2-5 Developers)

**Scenario**: Team wants SDLC structure but minimal friction.

**Workflow**:
1. **Project Kickoff** (Claude Code):
   - Tech lead uses Claude Code `/project:intake-wizard --interactive`
   - Generates complete intake, architecture baseline
   - Deploys SDLC agents: `aiwg -deploy-agents --mode sdlc`
   - Deploys Warp context: `aiwg -deploy-warp --with-workflows`

2. **Development Sprints** (Warp AI):
   - Developers use Warp AI for daily terminal work
   - Warp workflows: `intake-wizard`, `run-tests`, `deploy-staging`
   - Warp AI suggests commands aligned with WARP.md conventions

3. **Quality Gates** (Claude Code):
   - Before phase transitions, tech lead uses Claude Code
   - Run `/project:flow-gate-check elaboration`
   - Run `/project:flow-security-review-cycle`
   - Claude orchestrates multi-agent validation

**Value**: Team gets SDLC benefits without overhead. Warp for speed, Claude for rigor.

---

## 11. Implementation Roadmap

### Phase 1: MVP (1-2 weeks)

**Goal**: Basic Warp support for AIWG users.

**Tasks**:
1. ✅ Research Warp AI capabilities (this document)
2. Implement `aiwg -deploy-warp` command
   - Generate WARP.md from CLAUDE.md + .aiwg/intake/
   - Include SDLC context (phase, profile, architecture)
   - Reference Claude Code for full capabilities
3. Write documentation: `docs/integrations/warp-terminal.md`
   - Explain Warp vs Claude Code capabilities
   - Provide example WARP.md templates
   - Document when to use Warp vs Claude
4. Add to README.md: "Multi-Platform Support" section

**Deliverables**:
- [ ] `tools/agents/deploy-warp.mjs` script
- [ ] `docs/integrations/warp-terminal.md` documentation
- [ ] `aiwg -deploy-warp` CLI command
- [ ] Example WARP.md templates in `examples/warp/`

**Success Criteria**:
- Users can generate WARP.md with one command
- WARP.md includes accurate SDLC context
- Documentation clearly explains Warp limitations

### Phase 2: Enhanced Workflows (2-3 weeks)

**Goal**: Add convenient Warp workflows for common commands.

**Tasks**:
1. Design `.warp/workflows/` structure
   - Identify 10-15 most common SDLC commands
   - Create workflow YAML templates
2. Implement workflow generation in `deploy-warp.mjs`
   - Add `--with-workflows` flag
   - Generate `.warp/workflows/` directory
3. Add workflow documentation
   - Catalog available workflows
   - Explain how to customize workflows
4. Test workflows in Warp Terminal
   - Validate command execution
   - Ensure cross-platform compatibility (macOS, Linux)

**Deliverables**:
- [ ] `.warp/workflows/` templates in AIWG repo
- [ ] Workflow generation in `deploy-warp.mjs`
- [ ] `aiwg -deploy-warp --with-workflows` support
- [ ] Workflow documentation in `docs/integrations/warp-workflows.md`

**Success Criteria**:
- Users can access common SDLC commands from Warp UI
- Workflows execute successfully on macOS and Linux
- Documentation includes customization examples

### Phase 3: Dynamic Updates (3-4 weeks)

**Goal**: Auto-update WARP.md during phase transitions.

**Tasks**:
1. Integrate WARP.md updates into flow commands
   - Modify `/project:flow-*-to-*` commands
   - Add `updateWarpContext()` function
2. Implement phase-specific WARP.md templates
   - Inception.warp.md (focus on planning commands)
   - Elaboration.warp.md (focus on design commands)
   - Construction.warp.md (focus on build/test commands)
   - Transition.warp.md (focus on deployment commands)
3. Add WARP.md validation
   - Check for stale context (phase mismatch)
   - Warn user if WARP.md out of sync
4. Document phase-specific workflows

**Deliverables**:
- [ ] Phase-specific WARP.md templates
- [ ] Auto-update in flow commands
- [ ] WARP.md validation in `project-health-check`
- [ ] Documentation: "Phase-Specific Warp Context"

**Success Criteria**:
- WARP.md automatically updates on phase transitions
- Phase-specific commands appear in Warp AI suggestions
- Validation catches stale WARP.md files

### Phase 4: Exploratory (Future)

**Goal**: Explore Warp extension API (if available).

**Tasks**:
1. Monitor Warp releases for extension API
2. If API available:
   - Design Warp plugin architecture
   - Prototype AIWG Warp extension
   - Integrate with .aiwg/ artifacts directly
3. Evaluate feasibility of Warp-native SDLC experience

**Deliverables**: TBD (pending Warp API availability)

---

## 12. Risks and Mitigations

### Risk 1: Warp API Unavailability

**Risk**: Warp has no public extension API, limiting integration depth.

**Likelihood**: High (Warp is proprietary, no API announced)

**Impact**: Medium (WARP.md provides value, but limited)

**Mitigation**:
- Focus on WARP.md generation (requires no API)
- Document limitations clearly
- Monitor Warp roadmap for API announcements

### Risk 2: WARP.md Stale Context

**Risk**: WARP.md becomes out of sync with .aiwg/ artifacts, provides incorrect context.

**Likelihood**: Medium (manual updates required)

**Impact**: Low (minor confusion, easily corrected)

**Mitigation**:
- Auto-update WARP.md in flow commands (Phase 3)
- Add validation in `project-health-check`
- Include "last updated" timestamp in WARP.md

### Risk 3: User Confusion (Warp vs Claude)

**Risk**: Users expect Warp AI to replicate Claude Code capabilities, encounter limitations.

**Likelihood**: Medium (AIWG is Claude Code-first)

**Impact**: Medium (frustration, negative perception)

**Mitigation**:
- Clear documentation: "Warp AI is for terminal commands, Claude Code for SDLC orchestration"
- WARP.md includes section: "For Full SDLC Capabilities, Use Claude Code"
- Example use cases show complementary usage

### Risk 4: Maintenance Overhead

**Risk**: Supporting multiple platforms (Claude, Codex, Warp) increases maintenance burden.

**Likelihood**: Low (Warp integration is minimal)

**Impact**: Medium (if significant effort required)

**Mitigation**:
- Keep Warp integration lightweight (WARP.md generation only in MVP)
- Defer advanced workflows (Phase 2-3) until user demand proven
- Prioritize Claude Code (80%+ of AIWG value)

---

## 13. Conclusion and Recommendations

### 13.1 Summary of Findings

**Warp AI Capabilities**:
- Strong: Terminal-native AI for command generation, debugging, documentation
- Limited: No multi-agent orchestration, no artifact generation, no workflow state

**Integration Feasibility**:
- Low Friction: WARP.md generation is straightforward
- High Value (for terminal users): Provides SDLC context for command suggestions
- Complementary (not replacement): Warp AI cannot replace Claude Code for full SDLC

**Key Differences from Claude Code**:
- Single agent vs. 58 specialized SDLC agents
- Command suggestions vs. artifact generation
- Stateless interactions vs. complex workflow orchestration
- Terminal-only vs. full file system access

### 13.2 Recommended Approach

**Short-Term (MVP)** - RECOMMEND IMMEDIATE IMPLEMENTATION:
1. Implement `aiwg -deploy-warp` to generate WARP.md
2. WARP.md includes:
   - SDLC phase, profile, architecture context
   - Common commands for current phase
   - Project conventions from CLAUDE.md
   - Clear pointer to Claude Code for full capabilities
3. Documentation explaining Warp vs Claude Code

**Medium-Term (Enhanced)** - DEFER UNTIL USER DEMAND:
1. Add `.warp/workflows/` for one-click SDLC commands
2. Phase-specific WARP.md templates
3. Auto-update WARP.md on phase transitions

**Long-Term (Exploratory)** - MONITOR BUT DON'T PRIORITIZE:
1. Wait for Warp extension API
2. If API released, prototype native AIWG Warp plugin

### 13.3 Strategic Positioning

**AIWG remains Claude Code-first**:
- 80%+ of value comes from multi-agent orchestration
- Warp AI is a convenience layer, not a core platform
- Resources should prioritize Claude Code enhancements

**Warp AI as "SDLC-Aware Terminal"**:
- Warp AI knows project phase, conventions, architecture
- Provides contextually appropriate command suggestions
- Reduces friction for terminal-native developers

**Multi-Platform Strategy**:
- **Claude Code**: Full SDLC orchestration (primary)
- **OpenAI Codex**: Code generation and completion (secondary)
- **Warp AI**: Terminal command assistance (tertiary)

### 13.4 Next Steps

1. **Review this document** with AIWG maintainers
2. **Approve MVP scope**: WARP.md generation only
3. **Implement Phase 1** (1-2 weeks):
   - `tools/agents/deploy-warp.mjs`
   - `aiwg -deploy-warp` CLI command
   - Documentation: `docs/integrations/warp-terminal.md`
4. **Gather user feedback**: Is WARP.md valuable? Do users want workflows?
5. **Decide on Phase 2**: Only proceed if user demand exists

---

## Appendix A: Example WARP.md Templates

### A.1 Inception Phase WARP.md

```markdown
# Warp AI Rules - [Project Name]

## SDLC Context
This project uses the AI Writing Guide SDLC framework.

- **Current Phase**: Inception (Planning and Initial Architecture)
- **Profile**: MVP
- **Architecture**: Monolith + PostgreSQL + React
- **Timeline**: 12 weeks to production

## Common Planning Commands

### Project Setup
- Clone template: `git clone [repo-url] && cd [project-name]`
- Install dependencies: `pnpm install` (always use pnpm, not npm)
- Setup database: `docker-compose up -d postgres`

### SDLC Workflows (Use Claude Code)
For complex workflows, use Claude Code:
- Generate intake: `/project:intake-wizard --interactive`
- Validate intake: `/project:intake-start .aiwg/intake/`
- Transition to Elaboration: `/project:flow-inception-to-elaboration`

## Project Conventions
- Branch naming: `feature/*`, `bugfix/*`, `hotfix/*`
- Commit format: Conventional Commits (`feat:`, `fix:`, `chore:`)
- Code style: Prettier (2 spaces, single quotes)
- Testing: Jest (unit), Supertest (integration)

## Architecture Overview
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 15 (via Docker)
- **Deployment**: AWS Elastic Beanstalk (staging), ECS (production)

## Constraints
- Never commit .env files or secrets
- Never use `npm` (always use `pnpm`)
- Never use `sudo` for package installs
- Always run tests before pushing: `pnpm test`

## For Full SDLC Capabilities
Use Claude Code for:
- Multi-agent artifact generation (SAD, test plans, threat models)
- Phase transitions (Inception → Elaboration)
- Security and compliance workflows
- Natural language orchestration ("Start security review")

Install Claude Code and deploy agents:
```bash
aiwg -deploy-agents --mode sdlc --provider claude
```
```

### A.2 Construction Phase WARP.md

```markdown
# Warp AI Rules - [Project Name]

## SDLC Context
- **Current Phase**: Construction (Feature Development)
- **Profile**: Production
- **Sprint**: Sprint 5 (of 8)
- **Next Milestone**: Feature complete (2 weeks)

## Common Development Commands

### Daily Workflow
- Start dev server: `pnpm dev` (runs on localhost:3000)
- Run tests: `pnpm test` (watch mode: `pnpm test --watch`)
- Lint code: `pnpm lint` (auto-fix: `pnpm lint --fix`)
- Build production: `pnpm build` (outputs to dist/)

### Git Workflow
- Create feature branch: `git checkout -b feature/[name]`
- Commit with tests: `pnpm test && git add . && git commit -m "[message]"`
- Push for review: `git push -u origin HEAD`
- Create PR: `gh pr create --title "[title]" --body "[description]"`

### Database
- Run migrations: `pnpm migrate:dev` (dev), `pnpm migrate:prod` (staging/prod)
- Reset database: `docker-compose down -v && docker-compose up -d postgres`
- Seed data: `pnpm seed:dev` (test data for local development)

### Docker
- Start all services: `docker-compose up -d`
- View logs: `docker-compose logs -f [service-name]`
- Rebuild after changes: `docker-compose build [service-name]`

## Testing Strategy
- Unit tests: 80% coverage target (check: `pnpm test:coverage`)
- Integration tests: API endpoints (Supertest)
- E2E tests: Critical user flows (Playwright)
- Security: Run `pnpm audit` before every PR

## Deployment
- Staging: Push to `develop` branch (auto-deploys via GitHub Actions)
- Production: Create release PR to `main` (requires approval + CI pass)

## For SDLC Orchestration
Use Claude Code for:
- Iteration planning: `/project:flow-iteration-dual-track 5`
- Code reviews: `/project:pr-review [branch-name]`
- Security validation: `/project:flow-security-review-cycle`
- Test strategy updates: `/project:flow-test-strategy-execution`
```

### A.3 Transition Phase WARP.md

```markdown
# Warp AI Rules - [Project Name]

## SDLC Context
- **Current Phase**: Transition (Pre-Production Deployment)
- **Profile**: Production
- **Deployment Target**: Production (AWS ECS + RDS)
- **Go-Live Date**: 2025-11-15 (2 weeks)

## Deployment Commands

### Pre-Deployment Validation
- Run full test suite: `pnpm test:all` (unit + integration + e2e)
- Security scan: `pnpm security:scan` (SAST + dependency audit)
- Performance benchmarks: `pnpm benchmark` (k6 load tests)
- Database migration dry-run: `pnpm migrate:dry-run --env=production`

### Staging Deployment
- Deploy to staging: `git push origin release/v1.0.0`
- Check health: `curl https://api-staging.example.com/health`
- Run smoke tests: `pnpm test:smoke --env=staging`

### Production Deployment
- Tag release: `git tag -a v1.0.0 -m "Production release v1.0.0"`
- Push tag: `git push origin v1.0.0` (triggers production deploy)
- Monitor logs: `aws logs tail /ecs/api-production --follow`
- Rollback if needed: `git revert [commit] && git push`

### Post-Deployment Monitoring
- Check metrics: `aws cloudwatch get-dashboard --name api-production`
- Check errors: `sentry-cli issues list --project api-production`
- Check uptime: `curl https://api.example.com/health`

## Incident Response
- View recent logs: `aws logs tail /ecs/api-production --since 1h`
- Scale up: `aws ecs update-service --desired-count 5 --service api-production`
- Restart service: `aws ecs update-service --force-new-deployment --service api-production`

## For Production Orchestration
Use Claude Code for:
- Production deployment workflow: `/project:flow-deploy-to-production`
- Hypercare monitoring: `/project:flow-hypercare-monitoring 14` (14 days)
- Incident response: `/project:flow-incident-response [incident-id]`
- Runbook generation: `/project:create-runbook deployment`
```

---

## Appendix B: Warp Workflows (Example YAML)

### B.1 Intake Wizard Workflow

```yaml
# .warp/workflows/intake-wizard.yaml
name: Generate Project Intake
description: Create complete SDLC intake forms (project-intake, solution-profile, option-matrix)
category: SDLC Planning
command: |
  #!/bin/bash
  # Locate AIWG installation
  AIWG_ROOT="${AIWG_ROOT:-$HOME/.local/share/ai-writing-guide}"

  if [ ! -d "$AIWG_ROOT" ]; then
    echo "Error: AIWG not found at $AIWG_ROOT"
    echo "Install with: curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash"
    exit 1
  fi

  # Run intake wizard interactively
  node "$AIWG_ROOT/tools/intake/intake-wizard.mjs" \
    --target "$(pwd)" \
    --interactive

  echo ""
  echo "✓ Intake forms generated in .aiwg/intake/"
  echo "Next step: /project:intake-start .aiwg/intake/"
tags:
  - sdlc
  - planning
  - intake
```

### B.2 Run Tests Workflow

```yaml
# .warp/workflows/run-tests.yaml
name: Run Test Suite
description: Execute full test suite with coverage report
category: Testing
command: |
  #!/bin/bash
  echo "Running test suite..."

  # Detect test runner
  if [ -f "package.json" ] && grep -q '"test"' package.json; then
    # Node.js project
    if [ -f "pnpm-lock.yaml" ]; then
      pnpm test --coverage
    elif [ -f "yarn.lock" ]; then
      yarn test --coverage
    else
      npm test -- --coverage
    fi
  elif [ -f "pytest.ini" ] || [ -f "setup.py" ]; then
    # Python project
    pytest --cov=src tests/
  elif [ -f "go.mod" ]; then
    # Go project
    go test -cover ./...
  else
    echo "Error: Could not detect test runner"
    exit 1
  fi

  echo ""
  echo "✓ Tests complete. Check coverage report above."
tags:
  - testing
  - quality
  - ci
```

### B.3 Security Gate Workflow

```yaml
# .warp/workflows/security-gate.yaml
name: Security Gate Validation
description: Run security scans (SAST, dependency audit, secrets detection)
category: Security
command: |
  #!/bin/bash
  echo "Running security validation..."

  # Dependency audit
  if [ -f "package.json" ]; then
    echo "→ Dependency audit (npm/pnpm)..."
    if [ -f "pnpm-lock.yaml" ]; then
      pnpm audit --audit-level=moderate
    else
      npm audit --audit-level=moderate
    fi
  elif [ -f "requirements.txt" ]; then
    echo "→ Dependency audit (pip)..."
    pip-audit
  fi

  # Secrets detection (if gitleaks installed)
  if command -v gitleaks &> /dev/null; then
    echo "→ Secrets detection (gitleaks)..."
    gitleaks detect --source . --no-git
  fi

  # SAST (if semgrep installed)
  if command -v semgrep &> /dev/null; then
    echo "→ Static analysis (semgrep)..."
    semgrep --config=auto .
  fi

  echo ""
  echo "✓ Security validation complete"
  echo "For full security review, use Claude Code:"
  echo "  /project:flow-security-review-cycle"
tags:
  - security
  - compliance
  - gate
```

---

## Appendix C: References

### AIWG Documentation
- [SDLC Framework README](/home/manitcor/dev/ai-writing-guide/agentic/code/frameworks/sdlc-complete/README.md)
- [Multi-Agent Pattern](/home/manitcor/dev/ai-writing-guide/agentic/code/frameworks/sdlc-complete/docs/multi-agent-documentation-pattern.md)
- [Deploy Agents Script](/home/manitcor/dev/ai-writing-guide/tools/agents/deploy-agents.mjs)
- [OpenAI Compatibility](/home/manitcor/dev/ai-writing-guide/agentic/code/frameworks/sdlc-complete/agents/openai-compat.md)

### Platform Comparisons
- Claude Code: Multi-agent orchestration, full SDLC workflows
- OpenAI Codex: Code generation and completion
- Warp AI: Terminal-native command assistance

### External Resources
- Warp Terminal: https://warp.dev
- Warp AI Rules Documentation: https://docs.warp.dev/knowledge-and-collaboration/rules
- Warp Workflows: https://docs.warp.dev/features/workflows

---

**Document Status**: Complete
**Next Steps**: Review with AIWG maintainers, approve MVP scope, implement Phase 1
