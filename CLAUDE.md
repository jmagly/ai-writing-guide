# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

The AI Writing Guide is a comprehensive framework for improving AI-generated content quality. It provides guidelines,
validation patterns, and specialized Claude Code agents to ensure AI outputs maintain authentic, professional writing
standards while avoiding detection patterns.

## Critical Usage Instructions

### Context Selection Strategy

**IMPORTANT**: Do not include all documents from this repository in your context. The USAGE_GUIDE.md provides targeted
document combinations for specific needs.

**Always include**: `CLAUDE.md` (this file)

**Add situationally based on task**:

- For AI pattern detection: `validation/banned-patterns.md`
- For maintaining authority: `core/sophistication-guide.md`
- For technical writing: `examples/technical-writing.md`
- For quick validation: `context/quick-reference.md`

## High-Level Architecture

### Document Framework Structure

1. **Core Philosophy (`core/`)**: Fundamental writing principles that guide all content generation. These establish the
   balance between removing AI patterns and maintaining sophisticated, authoritative voice.

2. **Validation Rules (`validation/`)**: Specific patterns, phrases, and structures that indicate AI-generated content.
   These are detection patterns that should be avoided.

3. **Context Documents (`context/`)**: Optimized, condensed versions of guidelines for efficient agent context usage.
   These provide quick-reference materials without overwhelming the context window.

4. **Examples (`examples/`)**: Before/after demonstrations showing transformation from AI-detected writing to authentic
   human voice while preserving technical depth.

5. **Agent Definitions (`.claude/agents/`)**: Pre-configured Claude Code subagents specialized for different aspects of
   writing improvement and validation.

### Agent Ecosystem

The repository includes two categories of specialized agents:

**General-Purpose Writing Agents** (`/agents/`):
- **writing-validator**: Validates content against AI patterns and authenticity markers
- **prompt-optimizer**: Enhances prompts using AI Writing Guide principles
- **content-diversifier**: Generates varied examples and perspectives

**SDLC Framework Agents** (`/agentic/code/frameworks/sdlc-complete/agents/`):
- 51 specialized agents covering all SDLC phases (Inception → Transition)
- Including: code-reviewer, test-engineer, requirements-analyst, devops-engineer, architecture-designer, security-gatekeeper, incident-responder, and many more
- See `/agentic/code/frameworks/sdlc-complete/README.md` for complete list

Agents can be deployed via `aiwg -deploy-agents --mode general|sdlc|both` and work independently with isolated contexts.

## Common Development Tasks

### Using the Writing Guide

```bash
# Validate content for AI patterns
/project:writing-validator "path/to/content.md"

# Optimize a prompt for better output
/project:prompt-optimizer "original prompt text"

# Generate diverse content examples
/project:content-diversifier "base concept or topic"
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

1. **Avoid banned patterns**: Check `validation/banned-patterns.md` for phrases that trigger AI detection
2. **Maintain sophistication**: Don't dumb down technical content - preserve domain-appropriate vocabulary
3. **Include authenticity markers**: Add opinions, acknowledge trade-offs, reference real-world constraints
4. **Vary structure**: Mix sentence lengths, paragraph structures, and transition styles
5. **Be specific**: Replace vague claims with exact metrics and concrete examples

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

Agents support both Claude and OpenAI platforms:

```bash
# Deploy for OpenAI/Codex (creates .codex/agents/)
aiwg -deploy-agents --provider openai

# Deploy as single AGENTS.md file (OpenAI preference)
aiwg -deploy-agents --provider openai --as-agents-md

# Override model selections
aiwg -deploy-agents --provider openai \
  --reasoning-model gpt-5 \
  --coding-model gpt-5-codex \
  --efficiency-model gpt-5-codex
```

See `agentic/code/frameworks/sdlc-complete/agents/openai-compat.md` for platform-specific guidance.

## SDLC Complete Framework (PLAN → ACT)

This repository includes a comprehensive software development lifecycle framework at `/agentic/code/frameworks/sdlc-complete/`:

### Core Components

- **Agents** (`agentic/code/frameworks/sdlc-complete/agents/`): 51 specialized SDLC role agents (intake-coordinator, security-gatekeeper, architecture-designer, etc.)
- **Commands** (`agentic/code/frameworks/sdlc-complete/commands/`): 24 SDLC commands for project management, security, traceability
- **Templates** (`agentic/code/frameworks/sdlc-complete/templates/`): Intake, requirements, architecture, test, security, deployment
- **Flows** (`agentic/code/frameworks/sdlc-complete/flows/`): Phase-based workflows (Inception → Elaboration → Construction → Transition)
- **Add-ons** (`agentic/code/frameworks/sdlc-complete/add-ons/`): GDPR compliance, legal frameworks
- **Artifacts** (`agentic/code/frameworks/sdlc-complete/artifacts/`): Sample projects demonstrating complete lifecycle
- **Metrics** (`agentic/code/frameworks/sdlc-complete/metrics/`): Tracking catalogs and health indicators

### Using SDLC Framework

1. Scaffold new project: `aiwg -new` (copies intake templates)
2. Deploy SDLC agents: `aiwg -deploy-agents --mode sdlc`
3. Deploy SDLC commands: `aiwg -deploy-commands --mode sdlc`
4. Fill intake forms: `/project:intake-wizard "your project description"`
5. Follow phase workflows: Reference `agentic/code/frameworks/sdlc-complete/plan-act-sdlc.md` for milestone guidance

See `agentic/code/frameworks/sdlc-complete/actors-and-templates.md` for role-to-template mappings.

### Intake Commands with Guidance

All three intake commands now support an optional `--guidance` parameter to provide additional context:

**intake-wizard** - Generate or complete intake forms with guidance:
```bash
/project:intake-wizard "Build customer portal" --guidance "B2B SaaS for healthcare, HIPAA compliance critical, 50k users"
/project:intake-wizard --complete --interactive --guidance "Focus on security first, SOC2 audit in 3 months"
```

**intake-from-codebase** - Analyze existing codebase with guidance:
```bash
/project:intake-from-codebase . --guidance "Focus on security posture and compliance gaps for SOC2 audit"
/project:intake-from-codebase . --interactive --guidance "Fintech app, PCI-DSS required, preparing for Series A fundraising"
```

**intake-start** - Kick off Inception with guidance:
```bash
/project:intake-start .aiwg/intake/ --guidance "Focus on security architecture first, compliance is critical path"
/project:intake-start .aiwg/intake/ --guidance "Team has limited DevOps experience, need extra infrastructure support"
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

Or specify custom path: `/project:intake-wizard --complete intake/`

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
