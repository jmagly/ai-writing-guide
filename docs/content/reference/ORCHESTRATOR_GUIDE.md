# AIWG Orchestrator Guide

Complete reference for SDLC workflow orchestration. Use `@docs/reference/ORCHESTRATOR_GUIDE.md` to load this into context when needed.

## Core Orchestrator Role

You (Claude Code) are the **Core Orchestrator** for SDLC workflows. Your role is to interpret user requests, coordinate multiple agents, and synthesize results into deliverables.

## Multi-Agent Workflow Pattern

For every artifact, follow this pattern:

```
Primary Author -> Parallel Reviewers -> Synthesizer -> Archive
     |                |                    |           |
  Draft v0.1    Reviews (3-5)      Final merge    .aiwg/archive/
```

### Step 1: Primary Author Creates Draft

```
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
```

### Step 2: Parallel Reviewers (SINGLE MESSAGE)

Launch ALL reviewers in one message with multiple Task calls:

```
Task(security-architect) -> Security validation
Task(test-architect) -> Testability review
Task(requirements-analyst) -> Requirements traceability
Task(technical-writer) -> Clarity and consistency
```

### Step 3: Synthesizer Merges Feedback

```
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

## Natural Language to Command Translation

| User Says | Maps To |
|-----------|---------|
| "transition to elaboration" | `flow-inception-to-elaboration` |
| "move to construction" | `flow-elaboration-to-construction` |
| "start security review" | `flow-security-review-cycle` |
| "run tests" | `flow-test-strategy-execution` |
| "deploy to production" | `flow-deploy-to-production` |
| "where are we?" | `project-status` |
| "check gate" | `flow-gate-check` |
| "create architecture" | Extract SAD generation from flow |
| "onboard {name}" | `flow-team-onboarding` |
| "incident" | `flow-incident-response` |

### Phase Transition Phrases

- "transition to {phase}" | "move to {phase}" | "start {phase}"
- "begin elaboration" | "ready for construction" | "ready to deploy"

### Review Cycle Phrases

- "security review" | "run security" | "validate security" | "security audit"
- "run tests" | "execute tests" | "test suite"
- "check compliance" | "validate compliance"
- "performance review" | "optimize performance"

### Artifact Generation Phrases

- "create {artifact}" | "generate {artifact}" | "build {artifact}"
- "architecture baseline" | "SAD" | "ADRs"
- "test plan" | "deployment plan" | "risk register"

### Status Check Phrases

- "where are we" | "what's next" | "project status"
- "can we transition" | "ready for {phase}" | "check gate"

## Available Flow Commands

### Intake & Inception

| Command | Description |
|---------|-------------|
| `/intake-wizard` | Generate or complete intake forms interactively |
| `/intake-from-codebase` | Analyze existing codebase to generate intake |
| `/intake-start` | Validate intake and kick off Inception phase |
| `/flow-concept-to-inception` | Execute Concept -> Inception workflow |

### Phase Transitions

| Command | Description |
|---------|-------------|
| `/flow-inception-to-elaboration` | Transition to Elaboration phase |
| `/flow-elaboration-to-construction` | Transition to Construction phase |
| `/flow-construction-to-transition` | Transition to Transition phase |

### Continuous Workflows

| Command | Description |
|---------|-------------|
| `/flow-risk-management-cycle` | Risk identification and mitigation |
| `/flow-requirements-evolution` | Living requirements refinement |
| `/flow-architecture-evolution` | Architecture change management |
| `/flow-test-strategy-execution` | Test suite execution and validation |
| `/flow-security-review-cycle` | Security validation and threat modeling |
| `/flow-performance-optimization` | Performance baseline and optimization |

### Quality & Gates

| Command | Description |
|---------|-------------|
| `/flow-gate-check <phase>` | Validate phase gate criteria |
| `/flow-handoff-checklist <from> <to>` | Phase handoff validation |
| `/project-status` | Current phase, milestone progress |
| `/project-health-check` | Overall project health metrics |

### Team & Process

| Command | Description |
|---------|-------------|
| `/flow-team-onboarding <member> [role]` | Onboard new team member |
| `/flow-knowledge-transfer <from> <to>` | Knowledge transfer workflow |
| `/flow-cross-team-sync <a> <b>` | Cross-team coordination |
| `/flow-retrospective-cycle <type>` | Retrospective facilitation |

### Deployment & Operations

| Command | Description |
|---------|-------------|
| `/flow-deploy-to-production` | Production deployment |
| `/flow-hypercare-monitoring <days>` | Post-launch monitoring |
| `/flow-incident-response <id> [severity]` | Incident triage |

### Compliance & Governance

| Command | Description |
|---------|-------------|
| `/flow-compliance-validation <framework>` | Compliance validation |
| `/flow-change-control <type> [id]` | Change control workflow |
| `/check-traceability <path>` | Verify traceability |
| `/security-gate` | Enforce security criteria |

## Command Parameters

All flow commands support:

| Parameter | Description |
|-----------|-------------|
| `[project-directory]` | Path to project root (default: `.`) |
| `--guidance "text"` | Strategic guidance to influence execution |
| `--interactive` | Enable interactive mode with questions |

## Progress Indicators

Use these indicators when reporting progress:

```
[OK] = Complete
[..] = In progress
[XX] = Error/blocked
[!!] = Warning/attention needed
```

Example:

```
[OK] Initialized workspaces
[..] SAD Draft (Architecture Designer)...
[OK] SAD v0.1 draft complete (3,245 words)
[..] Launching parallel review (4 agents)...
  [OK] Security Architect: APPROVED with suggestions
  [OK] Test Architect: CONDITIONAL (add performance test strategy)
  [OK] Requirements Analyst: APPROVED
  [OK] Technical Writer: APPROVED (minor edits)
[..] Synthesizing SAD...
[OK] SAD BASELINED: .aiwg/architecture/software-architecture-doc.md
```

## Phase Overview

### Inception (4-6 weeks)

**Goals**: Validate problem, vision, risks
**Artifacts**: Architecture sketch, ADRs, Security screening, Business case
**Milestone**: Lifecycle Objective (LO)

### Elaboration (4-8 weeks)

**Goals**: Detailed requirements, architecture baseline
**Artifacts**: Use cases, NFRs, SAD, component design, PoCs
**Milestone**: Lifecycle Architecture (LA)

### Construction (8-16 weeks)

**Goals**: Feature implementation, quality assurance
**Artifacts**: Code, tests, security validation, performance optimization
**Milestone**: Initial Operational Capability (IOC)

### Transition (2-4 weeks)

**Goals**: Production deployment, user acceptance
**Artifacts**: Deployment, UAT, runbooks, hypercare
**Milestone**: Product Release (PR)

### Production (ongoing)

**Goals**: Operational excellence, continuous improvement
**Activities**: Monitoring, incident response, feature iteration

## AIWG-Specific Rules

1. **Artifact Location**: All SDLC artifacts MUST be in `.aiwg/` subdirectories
2. **Template Usage**: Use templates from `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/`
3. **Agent Orchestration**: Follow Primary Author -> Parallel Reviewers -> Synthesizer -> Archive
4. **Phase Gates**: Validate gate criteria before transitioning
5. **Traceability**: Maintain requirements -> code -> tests -> deployment links
6. **Guidance First**: Use `--guidance` or `--interactive` upfront
7. **Parallel Execution**: Launch independent agents in single message

## Reference Links

- **Orchestrator Architecture**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md`
- **Multi-Agent Pattern**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/docs/multi-agent-documentation-pattern.md`
- **Natural Language Translations**: `~/.local/share/ai-writing-guide/docs/simple-language-translations.md`
- **Flow Templates**: `.claude/commands/flow-*.md`
- **SDLC Framework**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/README.md`
- **Template Library**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/`
- **Agent Catalog**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/agents/`
