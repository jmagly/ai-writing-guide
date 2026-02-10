# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Repository Purpose

<!-- User: Fill in your project purpose here -->

[Brief description of what this project does and its goals]

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

**AIWG Installation Path**: `{AIWG_ROOT}`

**Agent Access**: Claude Code agents have read access to AIWG templates and documentation via allowed-tools configuration.

**Verify Installation**:

```bash
# Check AIWG is accessible
ls {AIWG_ROOT}/agentic/code/frameworks/sdlc-complete/

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

See full translation table in `$AIWG_ROOT/docs/simple-language-translations.md`

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
    Read template: $AIWG_ROOT/templates/analysis-design/software-architecture-doc-template.md
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
2. **Template Usage**: Always use AIWG templates from `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/`
3. **Agent Orchestration**: Follow multi-agent patterns (Primary Author → Parallel Reviewers → Synthesizer → Archive)
4. **Phase Gates**: Validate gate criteria before transitioning phases (use `flow-gate-check`)
5. **Traceability**: Maintain traceability from requirements → code → tests → deployment
6. **Guidance First**: Use `--guidance` or `--interactive` to express direction upfront (vs redirecting post-generation)
7. **Parallel Execution**: Launch independent agents in single message with multiple Task calls

## Reference Documentation

- **Orchestrator Architecture**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md`
- **Multi-Agent Pattern**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/docs/multi-agent-documentation-pattern.md`
- **Natural Language Translations**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/docs/simple-language-translations.md`
- **Flow Templates**: `.claude/commands/flow-*.md`
- **SDLC Framework**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/README.md`
- **Template Library**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/`
- **Agent Catalog**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/`

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
ls $AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/

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

- **AIWG Repository**: https://github.com/jmagly/aiwg
- **Framework Documentation**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/README.md`
- **Phase Workflows**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/flows/`
- **Template Library**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/`
- **Agent Catalog**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/`

## Support

- **Issues**: https://github.com/jmagly/aiwg/issues
- **Discussions**: https://github.com/jmagly/aiwg/discussions
- **Documentation**: https://github.com/jmagly/aiwg/blob/main/README.md

---

## Project-Specific Notes

<!-- User: Add project-specific guidance, conventions, and rules below -->
