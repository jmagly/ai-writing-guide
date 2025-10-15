# .aiwg/ - SDLC Artifacts Directory

This directory contains all Software Development Lifecycle (SDLC) artifacts generated during project planning, development, and deployment.

## What's In Here?

All planning documents, requirements, architecture decisions, test plans, and process artifacts created by the SDLC tooling live in `.aiwg/`. This keeps your project root clean while preserving a complete audit trail of decisions and planning.

## Directory Structure

```
.aiwg/
├── intake/              # Project intake and initial requirements
├── requirements/        # User stories, use cases, NFRs
├── architecture/        # Architecture docs, ADRs, diagrams
├── planning/            # Phase and iteration plans
├── risks/               # Risk management and spikes
├── testing/             # Test strategy, plans, and results
├── security/            # Threat models and security artifacts
├── quality/             # Code reviews, retrospectives, metrics
├── deployment/          # Deployment plans and runbooks
├── handoffs/            # Phase transition checklists
├── gates/               # Quality gate reports
├── decisions/           # Change requests and CCB meetings
├── team/                # Team profile and coordination
├── working/             # Temporary/scratch files (safe to delete)
└── reports/             # Generated reports and indices
```

## Do I Need to Commit This?

**It depends on your needs:**

### Option 1: Commit Everything (Recommended for Teams)
- Full audit trail of decisions
- Shared context for team members
- Compliance and governance support
- Easy onboarding for new team members

### Option 2: Commit Planning Only (Good Balance)
Add to `.gitignore`:
```gitignore
# Ignore working files and reports (can be regenerated)
.aiwg/working/
.aiwg/reports/
```

Keep everything else committed for team coordination.

### Option 3: Use Locally Only (Solo Developers)
Add to `.gitignore`:
```gitignore
# Use SDLC tooling locally, don't commit artifacts
.aiwg/

# Exception: Keep intake forms for project context
!.aiwg/intake/
!.aiwg/README.md
```

## Key Files

### Getting Started
- `.aiwg/intake/project-intake.md` - Project requirements and constraints
- `.aiwg/intake/solution-profile.md` - Quality and process profile
- `.aiwg/intake/option-matrix.md` - Architectural options considered

### Current State
- `.aiwg/planning/phases/` - Current phase plan
- `.aiwg/planning/iterations/` - Current iteration plan
- `.aiwg/risks/risk-list.md` - Active risk register

### Decisions
- `.aiwg/architecture/adrs/` - Architecture Decision Records
- `.aiwg/decisions/change-requests/` - Approved changes

### Reports
- `.aiwg/reports/project-health.md` - Latest project health check
- `.aiwg/reports/artifact-index.md` - Index of all artifacts
- `.aiwg/reports/traceability-report.md` - Requirements traceability

## Common Commands

### View Artifacts
```bash
# List all intake forms
ls .aiwg/intake/

# View current phase plan
cat .aiwg/planning/phases/*.md

# List all ADRs
ls .aiwg/architecture/adrs/

# View risk register
cat .aiwg/risks/risk-list.md
```

### Generate Reports
```bash
# Project health check
aiwg project-health-check

# Build artifact index
aiwg build-artifact-index

# Check requirements traceability
aiwg check-traceability
```

### Search Artifacts
```bash
# Find all mentions of a feature
grep -r "authentication" .aiwg/

# Find high-priority items
grep -r "Priority: High" .aiwg/
```

## Generate User Documentation

To create end-user documentation from SDLC artifacts:

```bash
# Extract user-facing docs from .aiwg/ artifacts
/project:flow-generate-user-docs

# Outputs to: docs/ (standard user documentation location)
```

This converts:
- Use cases → User guides
- API contracts → API documentation
- Deployment plans → Deployment guides
- Runbooks → Troubleshooting guides

## Troubleshooting

### "I can't find my artifacts!"
- Check `.aiwg/reports/artifact-index.md` for a complete index
- Run `aiwg build-artifact-index` to regenerate the index

### "The directory is getting large"
- Delete `.aiwg/working/` - it's all temporary files
- Archive old iterations: `mv .aiwg/planning/iterations/old/ .aiwg/archive/`

### "I want to start fresh"
- Backup if needed: `cp -r .aiwg/ .aiwg.backup/`
- Delete: `rm -rf .aiwg/`
- Re-run intake: `aiwg intake-wizard "your project description"`

## Learn More

- Full SDLC documentation: https://github.com/jmagly/ai-writing-guide
- `.aiwg/` structure reference: See repository docs
- SDLC command reference: `aiwg -help`

## Questions?

This directory was created by the AI Writing Guide SDLC framework.
For issues or questions: https://github.com/jmagly/ai-writing-guide/issues
