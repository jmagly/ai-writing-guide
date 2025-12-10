# CLAUDE.md

This file provides guidance to AI platforms (Claude Code, Warp Terminal, Factory AI) when working with code in this repository.

## Repository Purpose

The AI Writing Guide is a comprehensive framework for improving AI-generated content quality. It provides voice profiles,
validation tools, and specialized agents to ensure AI outputs maintain authentic, professional writing
standards with consistent voice control.

## Multi-Platform Support

This repository supports multiple AI platforms with platform-specific deployment formats:

- **Claude Code** (`.claude/agents/*.md`, `.claude/commands/*.md`) - Multi-agent orchestration
- **Warp Terminal** (`WARP.md` symlinked to `CLAUDE.md`) - Terminal-native workflows
- **Factory AI** (`.factory/droids/*.md`, `.factory/commands/*.md`, `AGENTS.md`) - Custom droid format
- **OpenAI/Codex** (`.codex/agents/*.md` or `AGENTS.md`) - Experimental support

All platforms share the same agent logic and SDLC framework; only the deployment format differs.

## Critical Usage Instructions

### Context Selection Strategy

**IMPORTANT**: Do not include all documents from this repository in your context. The USAGE_GUIDE.md provides targeted
document combinations for specific needs.

**Always include**: `CLAUDE.md` (this file)

**Add situationally based on task**:

- For consistent voice: Voice Framework profiles (`technical-authority`, `friendly-explainer`, `executive-brief`, `casual-conversational`)
- For maintaining authority: `core/sophistication-guide.md`
- For technical writing: `examples/technical-writing.md`
- For quick validation: `context/quick-reference.md`

## High-Level Architecture

### Document Framework Structure

1. **Core Philosophy (`core/`)**: Fundamental writing principles that guide all content generation. These establish the
   balance between voice consistency and maintaining sophisticated, authoritative writing.

2. **Voice Framework (`agentic/code/addons/voice-framework/`)**: Voice profiles that define consistent writing characteristics.
   Replaces pattern-avoidance with positive voice definition.

3. **Context Documents (`context/`)**: Optimized, condensed versions of guidelines for efficient agent context usage.
   These provide quick-reference materials without overwhelming the context window.

4. **Examples (`examples/`)**: Before/after demonstrations showing transformation to authentic
   human voice while preserving technical depth.

5. **Agent Definitions (`.claude/agents/`)**: Pre-configured Claude Code subagents specialized for different aspects of
   writing improvement and validation.

### Agent Ecosystem

The repository includes two categories of specialized agents:

**General-Purpose Writing Agents** (`/agents/`):
- **writing-validator**: Validates content for voice consistency and authenticity
- **prompt-optimizer**: Enhances prompts using AI Writing Guide principles
- **content-diversifier**: Generates varied examples and perspectives

**SDLC Framework Agents** (`/agentic/code/frameworks/sdlc-complete/agents/`):
- 53 specialized agents covering all SDLC phases (Inception → Transition)
- Including: code-reviewer, test-engineer, requirements-analyst, devops-engineer, architecture-designer, security-gatekeeper, incident-responder, and many more
- See `/agentic/code/frameworks/sdlc-complete/README.md` for complete list

**Media/Marketing Kit Agents** (`/agentic/code/frameworks/media-marketing-kit/agents/`):
- 37 marketing-focused agents covering campaign lifecycle (Strategy → Analysis)
- Including: campaign-strategist, copywriter, brand-guardian, seo-specialist, analytics, and more
- See `/agentic/code/frameworks/media-marketing-kit/README.md` for complete list

Agents can be deployed via:
- **Claude Code**: `aiwg -deploy-agents --mode general|sdlc|both`
- **Warp Terminal**: `aiwg -deploy-agents --platform warp --mode sdlc`
- **Factory AI**: `aiwg -deploy-agents --provider factory --mode sdlc --deploy-commands`

All agents work independently with isolated contexts regardless of platform.

## Common Development Tasks

### Using the Writing Guide

```bash
# Validate content for voice consistency
/writing-validator "path/to/content.md"

# Optimize a prompt for better output
/prompt-optimizer "original prompt text"

# Generate diverse content examples
/content-diversifier "base concept or topic"
```

### Working with Agents

```bash
# Launch multiple agents in parallel for comprehensive work:
# 1. Use Task tool with multiple invocations in single message
# 2. Each agent operates independently
# 3. Results returned upon completion

# For complex multi-step tasks, use general-purpose agent
# For specific validations, use specialized agents
```

### Key Commands

```bash
# Review available agents
ls .claude/agents/

# Check agent configurations
cat .claude/agents/[agent-name].md

# View usage guide for context selection
cat USAGE_GUIDE.md
```

## Writing Guide Principles

When generating or reviewing content:

1. **Apply appropriate voice**: Use Voice Framework profiles to match audience and context
2. **Maintain sophistication**: Don't dumb down technical content - preserve domain-appropriate vocabulary
3. **Include authenticity markers**: Add opinions, acknowledge trade-offs, reference real-world constraints
4. **Vary structure**: Mix sentence lengths, paragraph structures, and transition styles
5. **Be specific**: Replace vague claims with exact metrics and concrete examples

## Voice Framework

The Voice Framework addon provides voice profiles for consistent, authentic writing:

### Built-in Voice Profiles

Located in `agentic/code/addons/voice-framework/voices/templates/`:

- `technical-authority` - Direct, precise, confident (docs, architecture)
- `friendly-explainer` - Approachable, encouraging (tutorials, onboarding)
- `executive-brief` - Concise, outcome-focused (business cases)
- `casual-conversational` - Relaxed, personal (blogs, newsletters)

### Voice Profile Locations (Priority Order)

1. Project: `.aiwg/voices/` (project-specific)
2. User: `~/.config/aiwg/voices/` (user-wide)
3. Built-in: `voice-framework/voices/templates/` (AIWG defaults)

### Voice Skills

- `voice-apply` - Apply voice profile to content
- `voice-create` - Generate new voice profile from description
- `voice-blend` - Combine multiple profiles (e.g., 70% technical + 30% casual)
- `voice-analyze` - Analyze content's current voice characteristics

### Usage Examples

Natural language (skills auto-trigger):

- "Write this in technical-authority voice"
- "Make it more casual"
- "Create a voice for API docs - precise, no-nonsense"
- "Blend 70% technical with 30% friendly"

## Important Notes

### Content Generation

- The goal is removing performative language, not simplifying content
- Maintain the sophistication level appropriate to the audience and domain
- Academic, executive, and technical content require different voice calibrations

### Agent Usage

- Agents are stateless - provide complete context in prompts
- Parallel execution is preferred for independent tasks
- Use specialized agents for their defined purposes, not general tasks

### Context Optimization

- Start with minimal context (just CLAUDE.md)
- Add documents only when specific problems emerge
- Different writing contexts need different guideline combinations

## Configuration

The repository includes:

- `.claude/settings.local.json`: Permissions and tool access configuration
- `.claude/agents/`: Specialized agent definitions
- No build commands or test suites (documentation/guideline repository)

## Manifest System

The repository uses a manifest-based documentation structure:

- **Purpose**: Each directory contains `manifest.json` tracking files and metadata
- **Auto-generation**: `node tools/manifest/generate-manifest.mjs <dir> [--write-md]`
- **Enrichment**: `node tools/manifest/enrich-manifests.mjs --target . [--write]`
- **Sync check**: `node tools/manifest/sync-manifests.mjs --target . --fix --write-md`

When adding new files to documented directories, update manifests to maintain consistency.

## Markdown Linting

The repository enforces strict markdown formatting via custom fixers:

```bash
# Fix table spacing (MD058)
node tools/lint/fix-md58.mjs --target . --write

# Fix code fences (MD031/MD040)
node tools/lint/fix-md-codefences.mjs --target . --write

# Fix heading/list spacing (MD022/MD032)
node tools/lint/fix-md-heading-lists.mjs --target . --write

# Fix multiple blank lines (MD012)
node tools/lint/fix-md12.mjs --target . --write

# Fix list indentation (MD005/MD007)
node tools/lint/fix-md5-7-lists.mjs --target . --write

# Fix heading punctuation (MD026)
node tools/lint/fix-md26-headpunct.mjs --target . --write

# Fix first-line H1 (MD041)
node tools/lint/fix-md41-firsth1.mjs --target . --write

# Fix final newline (MD047)
node tools/lint/fix-md47-finalnewline.mjs --target . --write

# Fix code span spacing (MD038)
node tools/lint/fix-md38-codespace.mjs --target . --write

# Run all lint checks (CI drift check)
npm exec markdownlint-cli2 "**/*.md"
```

The `.github/workflows/lint-fixcheck.yml` workflow enforces these on all PRs.

## Installation & CLI

### One-Line Install

```bash
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash
```

This installs to `~/.local/share/ai-writing-guide` and registers the `aiwg` CLI.

### Available Commands

```bash
# Show current installed version
aiwg -version

# Manually update aiwg installation (graceful)
aiwg -update

# Force fresh reinstall (removes and reclones)
aiwg -reinstall

# Deploy agents to current project
aiwg -deploy-agents [--mode general|sdlc|both] [--provider claude|openai] [--dry-run] [--force]

# Deploy commands to current project
aiwg -deploy-commands [--mode general|sdlc|both] [--provider claude|openai]

# Scaffold new project with SDLC templates
aiwg -new [--no-agents] [--provider claude|openai]

# Prefill card metadata from team profile
aiwg -prefill-cards --target agentic/code/frameworks/sdlc-complete/artifacts/<project> --team team-profile.yaml [--write]

# Show help
aiwg -help
```

**Note**: aiwg automatically updates on every command invocation to ensure you're always using the latest version. If you encounter corruption or installation issues, use `aiwg -reinstall` to force a clean reinstall.

### Development Kit

Create and extend the AIWG ecosystem with scaffolding tools:

```bash
# Create new packages
aiwg scaffold-addon <name> [--description "..."] [--dry-run]
aiwg scaffold-extension <name> --for <framework> [--description "..."] [--dry-run]

# Add components to existing packages
aiwg add-agent <name> --to <target> [--template simple|complex|orchestrator]
aiwg add-command <name> --to <target> [--template utility|transformation|orchestration]
aiwg add-skill <name> --to <target>
aiwg add-template <name> --to <target> [--type document|checklist|matrix|form]

# Validate packages
aiwg validate <path> [--fix] [--verbose]
```

In-session commands for AI-guided creation:

```bash
/devkit-create-addon <name> [--interactive]
/devkit-create-extension <name> --for <framework> [--interactive]
/devkit-create-agent <name> --to <target> [--template simple|complex|orchestrator]
/devkit-create-command <name> --to <target> [--template utility|transformation|orchestration]
/devkit-validate <path> [--fix] [--verbose]
```

See [Development Kit Overview](docs/development/devkit-overview.md) for comprehensive documentation.

### Direct Tool Usage (Without Install)

```bash
# Deploy agents (supports --mode general|sdlc|both)
node tools/agents/deploy-agents.mjs --target /path/to/project --mode both

# Deploy commands
node tools/agents/deploy-agents.mjs --target /path/to/project --deploy-commands

# Generate new project scaffold
node tools/install/new-project.mjs --name my-project

# Prefill SDLC card ownership
node tools/cards/prefill-cards.mjs --target agentic/code/frameworks/sdlc-complete/artifacts/my-project --team team.yaml --write
```

## Multi-Provider Support

Agents support Claude, Factory AI, and OpenAI platforms:

```bash
# Deploy for Claude Code (default - creates .claude/agents/)
aiwg -deploy-agents --mode sdlc

# Deploy for Factory AI (creates .factory/droids/ + AGENTS.md)
aiwg -deploy-agents --provider factory --mode sdlc --deploy-commands --create-agents-md

# Deploy for OpenAI/Codex (creates .codex/agents/)
aiwg -deploy-agents --provider openai

# Deploy as single AGENTS.md file (OpenAI/Factory preference)
aiwg -deploy-agents --provider openai --as-agents-md

# Override model selections (all providers)
# Note: Default models are defined in agentic/code/frameworks/sdlc-complete/config/models.json
aiwg -deploy-agents --provider factory \
  --reasoning-model <your-reasoning-model> \
  --coding-model <your-coding-model> \
  --efficiency-model <your-efficiency-model>
```

**Platform-Specific Guidance:**
- **Factory AI**: `agentic/code/frameworks/sdlc-complete/agents/factory-compat.md`
- **OpenAI/Codex**: `agentic/code/frameworks/sdlc-complete/agents/openai-compat.md`

## SDLC Complete Framework (PLAN → ACT)

This repository includes a comprehensive software development lifecycle framework at `/agentic/code/frameworks/sdlc-complete/`:

### Core Components

- **Agents** (`agentic/code/frameworks/sdlc-complete/agents/`): 53 specialized SDLC role agents (intake-coordinator, security-gatekeeper, architecture-designer, etc.)
- **Commands** (`agentic/code/frameworks/sdlc-complete/commands/`): 48 SDLC commands for project management, security, traceability
- **Templates** (`agentic/code/frameworks/sdlc-complete/templates/`): Intake, requirements, architecture, test, security, deployment
- **Flows** (`agentic/code/frameworks/sdlc-complete/flows/`): Phase-based workflows (Inception → Elaboration → Construction → Transition)
- **Add-ons** (`agentic/code/frameworks/sdlc-complete/add-ons/`): GDPR compliance, legal frameworks
- **Artifacts** (`agentic/code/frameworks/sdlc-complete/artifacts/`): Sample projects demonstrating complete lifecycle
- **Metrics** (`agentic/code/frameworks/sdlc-complete/metrics/`): Tracking catalogs and health indicators

### Using SDLC Framework

**For New Projects**:

1. Scaffold new project: `aiwg -new` (copies intake templates, CLAUDE.md with orchestration prompts)
2. Deploy SDLC agents: `aiwg -deploy-agents --mode sdlc`
3. Deploy SDLC commands: `aiwg -deploy-commands --mode sdlc`
4. Fill intake forms: `/intake-wizard "your project description"`
5. Follow phase workflows: Reference `agentic/code/frameworks/sdlc-complete/plan-act-sdlc.md` for milestone guidance

**For Existing Projects**:

1. Update project CLAUDE.md: `/aiwg-setup-project` (preserves existing content, adds AIWG orchestration section)
2. Deploy SDLC agents: `aiwg -deploy-agents --mode sdlc`
3. Deploy SDLC commands: `aiwg -deploy-commands --mode sdlc`
4. Start intake: `/intake-wizard "your project description"` or `/intake-from-codebase .`

**Natural Language Orchestration**:

Both new and existing projects configured with AIWG support natural language workflow triggering:

- "Let's transition to Elaboration" → Orchestrates `flow-inception-to-elaboration`
- "Run security review" → Orchestrates `flow-security-review-cycle`
- "Where are we?" → Checks project status
- "Create architecture baseline" → Generates SAD + ADRs

See `agentic/code/frameworks/sdlc-complete/docs/simple-language-translations.md` for 70+ supported phrases.

See `agentic/code/frameworks/sdlc-complete/actors-and-templates.md` for role-to-template mappings.

### Intake Commands with Guidance

All three intake commands now support an optional `--guidance` parameter to provide additional context:

**intake-wizard** - Generate or complete intake forms with guidance:
```bash
/intake-wizard "Build customer portal" --guidance "B2B SaaS for healthcare, HIPAA compliance critical, 50k users"
/intake-wizard --complete --interactive --guidance "Focus on security first, SOC2 audit in 3 months"
```

**intake-from-codebase** - Analyze existing codebase with guidance:
```bash
/intake-from-codebase . --guidance "Focus on security posture and compliance gaps for SOC2 audit"
/intake-from-codebase . --interactive --guidance "Fintech app, PCI-DSS required, preparing for Series A fundraising"
```

**intake-start** - Kick off Inception with guidance:
```bash
/intake-start .aiwg/intake/ --guidance "Focus on security architecture first, compliance is critical path"
/intake-start .aiwg/intake/ --guidance "Team has limited DevOps experience, need extra infrastructure support"
```

The `--guidance` parameter accepts free-form text to:
- Prioritize specific areas (security, compliance, scale, performance)
- Provide business context (domain, strategic drivers, constraints)
- Clarify requirements (timeline pressure, budget limits, team skills)
- Highlight unknowns or risks (technical uncertainties, integration challenges)
- Influence profile selection, priority weights, and agent assignments

## .aiwg/ - SDLC Artifacts Directory

All SDLC artifacts (requirements, architecture, planning, testing, etc.) are stored in the **`.aiwg/`** directory by default. This keeps user-facing code in the project root separate from process artifacts.

### Directory Structure

```
.aiwg/
├── intake/              # Project intake forms (default output)
├── requirements/        # User stories, use cases, NFRs
├── architecture/        # SAD, ADRs, diagrams, API contracts
├── planning/            # Phase and iteration plans
├── risks/               # Risk register and spikes
├── testing/             # Test strategy, plans, results
├── security/            # Threat models and security artifacts
├── quality/             # Code reviews, retrospectives, metrics
├── deployment/          # Deployment plans and runbooks
├── handoffs/            # Phase transition checklists
├── gates/               # Quality gate reports
├── decisions/           # Change requests, CCB meetings
├── team/                # Team profile and coordination
├── working/             # Temporary/scratch (safe to delete)
└── reports/             # Generated reports and indices
```

### Benefits

- **Clean separation**: User code stays in root, process artifacts in `.aiwg/`
- **Easy to ignore**: Single `.gitignore` entry ignores all SDLC artifacts
- **Optional sharing**: Teams choose to commit (full audit trail) or ignore (local use)
- **Discoverable**: Centralized location for all planning documents
- **Tooling-friendly**: Consistent paths for all SDLC commands

### Recommended .gitignore Strategy

**Option 1: Commit Everything** (Teams & Enterprise)
- Full audit trail for compliance
- Shared context for team coordination
- No .gitignore entries for `.aiwg/`

**Option 2: Commit Planning Only** (Balanced)
```gitignore
.aiwg/working/       # Ignore temporary files
.aiwg/reports/       # Ignore generated reports
```

**Option 3: Use Locally Only** (Solo Developers)
```gitignore
.aiwg/               # Ignore all SDLC artifacts
!.aiwg/intake/       # Keep intake forms for context
!.aiwg/README.md
```

### Default Output Paths

| Command | Default Output |
|---------|---------------|
| intake-wizard | `.aiwg/intake/` |
| intake-from-codebase | `.aiwg/intake/` |
| flow-risk-management-cycle | `.aiwg/risks/` |
| flow-architecture-evolution | `.aiwg/architecture/` |
| flow-test-strategy-execution | `.aiwg/testing/` |
| flow-security-review-cycle | `.aiwg/security/` |
| flow-gate-check | `.aiwg/gates/` |
| flow-handoff-checklist | `.aiwg/handoffs/` |
| flow-change-control | `.aiwg/decisions/` |
| build-artifact-index | `.aiwg/reports/` |
| check-traceability | `.aiwg/reports/` |
| project-health-check | `.aiwg/reports/` |

All commands support custom output paths via arguments.

### Migration from intake/

If you have existing `intake/` artifacts:
```bash
mkdir -p .aiwg/intake
mv intake/* .aiwg/intake/
rmdir intake
```

Or specify custom path: `/intake-wizard --complete intake/`

## Important File References

When contributing or troubleshooting:

- **AGENTS.md**: Repository contribution guidelines and SDLC overview
- **USAGE_GUIDE.md**: Context selection strategy (critical for avoiding over-inclusion)
- **PROJECT_SUMMARY.md**: Expansion roadmap and value proposition
- **ROADMAP.md**: 12-month development plan
- **agentic/code/frameworks/sdlc-complete/README.md**: Complete SDLC framework documentation
- **agentic/code/frameworks/sdlc-complete/prompt-templates.md**: Copy-ready prompts for SDLC phases
- **agentic/code/frameworks/sdlc-complete/actors-and-templates.md**: Role and artifact mappings
- **commands/DEVELOPMENT_GUIDE.md**: Advanced slash command patterns

## Development Workflow

1. **Initial content creation**: Start with CLAUDE.md only
2. **Pattern detection**: If AI patterns appear, add validation documents
3. **Voice correction**: If lacking authenticity, add example documents
4. **Full remediation**: Use complete suite only for persistent issues

Remember: Authority comes from expertise (not formality), sophistication from precision (not complexity), and
authenticity from honesty (not casualness).

---

## AIWG (AI Writing Guide) SDLC Framework

This project uses the **AI Writing Guide SDLC framework** for software development lifecycle management.

### What is AIWG?

AIWG is a comprehensive SDLC framework providing:

- **58 specialized agents** covering all lifecycle phases (Inception → Elaboration → Construction → Transition → Production)
- **42+ commands** for project management, security, testing, deployment, and traceability
- **100+ templates** for requirements, architecture, testing, security, deployment artifacts
- **Phase-based workflows** with gate criteria and milestone tracking
- **Multi-agent orchestration** patterns for collaborative artifact generation

### Installation and Access

**AIWG Installation Path**: `~/.local/share/ai-writing-guide`

**Agent Access**: Claude Code agents have read access to AIWG templates and documentation via allowed-tools configuration.

**Verify Installation**:

```bash
# Check AIWG is accessible
ls ~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/

# Available resources:
# - agents/     → 58 SDLC role agents
# - commands/   → 42+ slash commands
# - templates/  → 100+ artifact templates
# - flows/      → Phase workflow documentation
```

### Project Artifacts Directory: .aiwg/

All SDLC artifacts (requirements, architecture, testing, etc.) are stored in **`.aiwg/`**:

```text
.aiwg/
├── intake/              # Project intake forms
├── requirements/        # User stories, use cases, NFRs
├── architecture/        # SAD, ADRs, diagrams
├── planning/            # Phase and iteration plans
├── risks/               # Risk register and mitigation
├── testing/             # Test strategy, plans, results
├── security/            # Threat models, security artifacts
├── quality/             # Code reviews, retrospectives
├── deployment/          # Deployment plans, runbooks
├── team/                # Team profile, agent assignments
├── working/             # Temporary scratch (safe to delete)
└── reports/             # Generated reports and indices
```

## Core Platform Orchestrator Role

**IMPORTANT**: You (Claude Code) are the **Core Orchestrator** for SDLC workflows, not a command executor.

### Your Orchestration Responsibilities

When users request SDLC workflows (natural language or commands):

#### 1. Interpret Natural Language

Map user requests to flow templates:

- "Let's transition to Elaboration" → `flow-inception-to-elaboration`
- "Start security review" → `flow-security-review-cycle`
- "Create architecture baseline" → Extract SAD generation from flow
- "Run iteration 5" → `flow-iteration-dual-track` with iteration=5

See full translation table in `~/.local/share/ai-writing-guide/docs/simple-language-translations.md`

#### 2. Read Flow Commands as Orchestration Templates

**NOT bash scripts to execute**, but orchestration guides containing:

- **Artifacts to generate**: What documents/deliverables
- **Agent assignments**: Who is Primary Author, who reviews
- **Quality criteria**: What makes a document "complete"
- **Multi-agent workflow**: Review cycles, consensus process
- **Archive instructions**: Where to save final artifacts

Flow commands are located in `.claude/commands/flow-*.md`

#### 3. Launch Multi-Agent Workflows via Task Tool

**Follow this pattern for every artifact**:

```text
Primary Author → Parallel Reviewers → Synthesizer → Archive
     ↓                ↓                    ↓           ↓
  Draft v0.1    Reviews (3-5)      Final merge    .aiwg/archive/
```

**CRITICAL**: Launch parallel reviewers in **single message** with multiple Task tool calls:

```python
# Pseudo-code example
# Step 1: Primary Author creates draft
Task(
    subagent_type="architecture-designer",
    description="Create Software Architecture Document draft",
    prompt="""
    Read template: ~/.local/share/ai-writing-guide/templates/analysis-design/software-architecture-doc-template.md
    Read requirements from: .aiwg/requirements/
    Create initial SAD draft
    Save draft to: .aiwg/working/architecture/sad/drafts/v0.1-primary-draft.md
    """
)

# Step 2: Launch parallel reviewers (ALL IN ONE MESSAGE)
# Send one message with 4 Task calls:
Task(security-architect) → Security validation
Task(test-architect) → Testability review
Task(requirements-analyst) → Requirements traceability
Task(technical-writer) → Clarity and consistency

# Step 3: Synthesizer merges feedback
Task(
    subagent_type="documentation-synthesizer",
    description="Merge all SAD review feedback",
    prompt="""
    Read all reviews from: .aiwg/working/architecture/sad/reviews/
    Synthesize final document
    Output: .aiwg/architecture/software-architecture-doc.md (BASELINED)
    """
)
```

#### 4. Track Progress and Communicate

Update user throughout with clear indicators:

```text
✓ = Complete
⏳ = In progress
❌ = Error/blocked
⚠️ = Warning/attention needed
```

**Example orchestration progress**:

```text
✓ Initialized workspaces
⏳ SAD Draft (Architecture Designer)...
✓ SAD v0.1 draft complete (3,245 words)
⏳ Launching parallel review (4 agents)...
  ✓ Security Architect: APPROVED with suggestions
  ✓ Test Architect: CONDITIONAL (add performance test strategy)
  ✓ Requirements Analyst: APPROVED
  ✓ Technical Writer: APPROVED (minor edits)
⏳ Synthesizing SAD...
✓ SAD BASELINED: .aiwg/architecture/software-architecture-doc.md
```

### Natural Language Command Translation

**Users don't type slash commands. They use natural language.**

#### Common Phrases You'll Hear

**Phase Transitions**:

- "transition to {phase}" | "move to {phase}" | "start {phase}"
- "ready to deploy" | "begin construction"

**Workflow Requests**:

- "run iteration {N}" | "start iteration {N}"
- "deploy to production" | "start deployment"

**Review Cycles**:

- "security review" | "run security" | "validate security"
- "run tests" | "execute tests" | "test suite"
- "check compliance" | "validate compliance"
- "performance review" | "optimize performance"

**Artifact Generation**:

- "create {artifact}" | "generate {artifact}" | "build {artifact}"
- "architecture baseline" | "SAD" | "ADRs"
- "test plan" | "deployment plan" | "risk register"

**Status Checks**:

- "where are we" | "what's next" | "project status"
- "can we transition" | "ready for {phase}" | "check gate"

**Team and Process**:

- "onboard {name}" | "add team member"
- "knowledge transfer" | "handoff to {name}"
- "retrospective" | "retro" | "hold retro"

**Operations**:

- "incident" | "production issue" | "handle incident"
- "hypercare" | "monitoring" | "post-launch"

### Response Pattern

**Always confirm understanding before starting**:

```text
User: "Let's transition to Elaboration"

You: "Understood. I'll orchestrate the Inception → Elaboration transition.

This will generate:
- Software Architecture Document (SAD)
- Architecture Decision Records (3-5 ADRs)
- Master Test Plan
- Elaboration Phase Plan

I'll coordinate multiple agents for comprehensive review.
Expected duration: 15-20 minutes.

Starting orchestration..."
```

### Available Commands (For Reference)

**Intake & Inception**:

- `/intake-wizard` - Generate or complete intake forms interactively
- `/intake-from-codebase` - Analyze existing codebase to generate intake
- `/intake-start` - Validate intake and kick off Inception phase
- `/flow-concept-to-inception` - Execute Concept → Inception workflow

**Phase Transitions**:

- `/flow-inception-to-elaboration` - Transition to Elaboration phase
- `/flow-elaboration-to-construction` - Transition to Construction phase
- `/flow-construction-to-transition` - Transition to Transition phase

**Continuous Workflows** (run throughout lifecycle):

- `/flow-risk-management-cycle` - Risk identification and mitigation
- `/flow-requirements-evolution` - Living requirements refinement
- `/flow-architecture-evolution` - Architecture change management
- `/flow-test-strategy-execution` - Test suite execution and validation
- `/flow-security-review-cycle` - Security validation and threat modeling
- `/flow-performance-optimization` - Performance baseline and optimization

**Quality & Gates**:

- `/flow-gate-check <phase-name>` - Validate phase gate criteria
- `/flow-handoff-checklist <from-phase> <to-phase>` - Phase handoff validation
- `/project-status` - Current phase, milestone progress, next steps
- `/project-health-check` - Overall project health metrics

**Team & Process**:

- `/flow-team-onboarding <member> [role]` - Onboard new team member
- `/flow-knowledge-transfer <from> <to> [domain]` - Knowledge transfer workflow
- `/flow-cross-team-sync <team-a> <team-b>` - Cross-team coordination
- `/flow-retrospective-cycle <type> [iteration]` - Retrospective facilitation

**Deployment & Operations**:

- `/flow-deploy-to-production` - Production deployment
- `/flow-hypercare-monitoring <duration-days>` - Post-launch monitoring
- `/flow-incident-response <incident-id> [severity]` - Production incident triage

**Compliance & Governance**:

- `/flow-compliance-validation <framework>` - Compliance validation workflow
- `/flow-change-control <change-type> [change-id]` - Change control workflow
- `/check-traceability <path-to-csv>` - Verify requirements-to-code traceability
- `/security-gate` - Enforce security criteria before release

### Command Parameters

All flow commands support standard parameters:

- `[project-directory]` - Path to project root (default: `.`)
- `--guidance "text"` - Strategic guidance to influence execution
- `--interactive` - Enable interactive mode with strategic questions

**Examples**:

```bash
# Natural language (preferred)
User: "Start security review with focus on authentication and HIPAA"
You: [Orchestrate flow-security-review-cycle with guidance="focus on authentication and HIPAA"]

# Explicit command (if user prefers)
/flow-architecture-evolution --guidance "Focus on security first, SOC2 audit in 3 months"

# Interactive mode
/flow-inception-to-elaboration --interactive
```

## AIWG-Specific Rules

1. **Artifact Location**: All SDLC artifacts MUST be created in `.aiwg/` subdirectories (not project root)
2. **Template Usage**: Always use AIWG templates from `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/`
3. **Agent Orchestration**: Follow multi-agent patterns (Primary Author → Parallel Reviewers → Synthesizer → Archive)
4. **Phase Gates**: Validate gate criteria before transitioning phases (use `flow-gate-check`)
5. **Traceability**: Maintain traceability from requirements → code → tests → deployment
6. **Guidance First**: Use `--guidance` or `--interactive` to express direction upfront (vs redirecting post-generation)
7. **Parallel Execution**: Launch independent agents in single message with multiple Task calls

## Reference Documentation

- **Orchestrator Architecture**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md`
- **Multi-Agent Pattern**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/docs/multi-agent-documentation-pattern.md`
- **Natural Language Translations**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/docs/simple-language-translations.md`
- **Flow Templates**: `.claude/commands/flow-*.md`
- **SDLC Framework**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/README.md`
- **Template Library**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/`
- **Agent Catalog**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/agents/`

## Phase Overview

**Inception** (4-6 weeks):

- Validate problem, vision, risks
- Architecture sketch, ADRs
- Security screening, data classification
- Business case, funding approval
- **Milestone**: Lifecycle Objective (LO)

**Elaboration** (4-8 weeks):

- Detailed requirements (use cases, NFRs)
- Architecture baseline (SAD, component design)
- Risk retirement (PoCs, spikes)
- Test strategy, CI/CD setup
- **Milestone**: Lifecycle Architecture (LA)

**Construction** (8-16 weeks):

- Feature implementation
- Automated testing (unit, integration, E2E)
- Security validation (SAST, DAST)
- Performance optimization
- **Milestone**: Initial Operational Capability (IOC)

**Transition** (2-4 weeks):

- Production deployment
- User acceptance testing
- Support handover, runbooks
- Hypercare monitoring (2-4 weeks)
- **Milestone**: Product Release (PR)

**Production** (ongoing):

- Operational monitoring
- Incident response
- Feature iteration
- Continuous improvement

## Quick Start

1. **Initialize Project**:

   ```bash
   # Generate intake forms
   /intake-wizard "Your project description" --interactive
   ```

2. **Start Inception**:

   ```bash
   # Validate intake and kick off Inception
   /intake-start .aiwg/intake/

   # Execute Concept → Inception workflow
   /flow-concept-to-inception .
   ```

3. **Check Status**:

   ```bash
   # View current phase and next steps
   /project-status
   ```

4. **Progress Through Phases**:

   ```bash
   # When Inception complete, transition to Elaboration
   /flow-gate-check inception  # Validate gate criteria
   /flow-inception-to-elaboration  # Transition phase
   ```

## Common Patterns

**Risk Management** (run weekly or when risks identified):

```bash
# Natural language
User: "Update risks with focus on technical debt"

# Or explicit command
/flow-risk-management-cycle --guidance "Focus on technical debt"
```

**Architecture Evolution** (when architecture changes needed):

```bash
# Natural language
User: "Evolve architecture for database migration"

# Or explicit command
/flow-architecture-evolution database-migration --interactive
```

**Security Review** (before each phase gate):

```bash
# Natural language
User: "Run security review for SOC2 audit prep"

# Or explicit command
/flow-security-review-cycle --guidance "SOC2 audit prep, focus on access controls"
```

**Test Execution** (run continuously in Construction):

```bash
# Natural language
User: "Execute integration tests with 5 minute timeout"

# Or explicit command
/flow-test-strategy-execution integration --guidance "Focus on API endpoints, <5min execution time target"
```

## Troubleshooting

**Template Not Found**:

```bash
# Verify AIWG installation
ls ~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/

# Set environment variable if installed elsewhere
export AIWG_ROOT=/custom/path/to/ai-writing-guide
```

**Agent Access Denied**:

- Check `.claude/settings.local.json` has read access to AIWG installation path
- Verify path uses absolute path (not `~` shorthand for user home)

**Command Not Found**:

```bash
# Deploy commands to project
aiwg -deploy-commands --mode sdlc

# Verify deployment
ls .claude/commands/flow-*.md
```

## Resources

- **AIWG Repository**: https://github.com/jmagly/ai-writing-guide
- **Framework Documentation**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/README.md`
- **Phase Workflows**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/flows/`
- **Template Library**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/`
- **Agent Catalog**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/agents/`

## Support

- **Issues**: https://github.com/jmagly/ai-writing-guide/issues
- **Discussions**: https://github.com/jmagly/ai-writing-guide/discussions
- **Documentation**: https://github.com/jmagly/ai-writing-guide/blob/main/README.md

---

## Project-Specific Notes

<!-- User: Add project-specific guidance, conventions, and rules below -->
