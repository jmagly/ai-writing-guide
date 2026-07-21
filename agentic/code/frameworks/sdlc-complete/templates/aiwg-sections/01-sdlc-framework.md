## AIWG SDLC Framework

This project uses the **AIWG SDLC framework** for software development lifecycle management.

### What is AIWG?

AIWG is a comprehensive SDLC framework providing:

- **{{AGENTS_COUNT}} specialized agents** covering all lifecycle phases (Inception → Elaboration → Construction → Transition → Production)
- **{{SKILLS_COUNT}} skills** for project management, security, testing, deployment, and traceability
- **100+ templates** for requirements, architecture, testing, security, deployment artifacts
- **Phase-based workflows** with gate criteria and milestone tracking
- **Multi-agent orchestration** patterns for collaborative artifact generation

### Installation and Access

**AIWG Installation Path**: `{AIWG_ROOT}`

**Provider Access**: Supported providers load AIWG context through their generated bootstrap and use the kernel/discovery surface to fetch canonical skills on demand.

**Verify Installation**:

```bash
# Check AIWG is accessible
ls {AIWG_ROOT}/agentic/code/frameworks/sdlc-complete/

# Available resources:
# - agents/     → {{AGENTS_COUNT}} agents
# - skills/     → {{SKILLS_COUNT}} skills
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
