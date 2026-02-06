# Project Memory

## AIWG Framework

This project uses the AI Writing Guide (AIWG) framework for structured SDLC workflows.

### Core Concepts

- **Artifacts Directory**: All SDLC artifacts stored in `.aiwg/`
- **Phase Progression**: Concept → Inception → Elaboration → Construction → Transition
- **Status Check**: Use `/project-status` or `aiwg status` to check current phase
- **Framework Installation**: Frameworks deployed via `aiwg use sdlc` or `aiwg use marketing`

### Artifact Structure

```
.aiwg/
├── intake/           # Project intake forms
├── requirements/     # Use cases, user stories, NFRs
├── architecture/     # SAD, ADRs, diagrams
├── planning/         # Phase plans, iteration plans
├── testing/          # Test strategy, test plans
├── security/         # Threat models, security gates
├── deployment/       # Deployment plans, runbooks
└── working/          # Temporary files (safe to delete)
```

### Key Commands

- `/project-status` - Show current phase and recent artifacts
- `aiwg use sdlc` - Deploy SDLC framework agents and templates
- `aiwg status` - Workspace health check
- `aiwg ralph "task" --completion "criteria"` - Iterative task execution

## Key Patterns

Memory is organized by topic. See individual topic files for learned patterns:

- **testing.md** - Test patterns, frameworks, and gotchas
- **debugging.md** - Recurring issues and resolution strategies
- **architecture.md** - Design decisions and architectural patterns

## Team Conventions

<!-- Auto-populated as conventions are learned during development -->

### Code Style

<!-- Learned from code reviews and formatting patterns -->

### Git Workflow

<!-- Learned from commit messages and branch patterns -->

### Review Process

<!-- Learned from PR discussions and review comments -->

## Project-Specific Notes

<!-- Add project-specific conventions, constraints, or preferences here -->
<!-- Example: "This is a monorepo using pnpm workspaces" -->
<!-- Example: "API endpoints must follow REST conventions in ADR-005" -->

## Learning Trajectory

<!-- Track key learnings and evolution of project understanding -->
<!-- Example: "Discovered critical security requirement after inception - see UC-SEC-001" -->
<!-- Example: "Refactored auth module based on performance testing - see ADR-012" -->
