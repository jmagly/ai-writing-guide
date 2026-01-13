# AIWG Workspace Directory

This directory contains all SDLC artifacts, project documentation, and operational state for the AI Writing Guide project.

## Directory Structure

### Standard SDLC Directories

| Directory | Purpose | Contents |
|-----------|---------|----------|
| `intake/` | Project inception | Intake forms, solution profiles, option matrices |
| `requirements/` | Requirements artifacts | Use cases, user stories, NFRs, vision document |
| `architecture/` | Architecture artifacts | SAD, ADRs, component diagrams |
| `planning/` | Phase planning | Iteration plans, feature roadmaps, agent assignments |
| `risks/` | Risk management | Risk register, mitigation plans |
| `testing/` | Test artifacts | Test plans, strategies, execution logs |
| `security/` | Security artifacts | Threat models, security assessments |
| `deployment/` | Deployment artifacts | Deployment plans, runbooks |
| `reports/` | Generated reports | Phase reports, assessments, summaries |
| `working/` | Temporary workspace | In-progress drafts (safe to clean) |

### Extended Directories

| Directory | Purpose | Notes |
|-----------|---------|-------|
| `research/` | Academic references | External research mapped to AIWG patterns |
| `traceability/` | Requirements tracing | RTM, compliance tracking |
| `management/` | Strategic docs | Business case, vision, roadmap |
| `config/` | Configuration | Plugin registry, system config |
| `smiths/` | Agent tooling | AgentSmith, SkillSmith, CommandSmith definitions |
| `ralph/` | Ralph Loop state | Iteration state, completion reports |
| `archive/` | Historical artifacts | Completed phases, deprecated content |
| `transition/` | Release preparation | UAT framework, release checklist |

## Key Patterns

### 1. Working Directory Lifecycle

Files in `working/` should be:
- **Promoted** to permanent location when complete
- **Archived** if abandoned but potentially useful
- **Deleted** if truly temporary

Never let `working/` accumulate stale files.

### 2. Archive Structure

```
archive/
├── design/              # Completed feature designs
├── features/            # Implemented feature specs
├── gates-completed/     # Historical phase gate reviews
└── research/            # Deprecated research
```

### 3. Report Naming Conventions

```
reports/
├── {phase}-completion-report.md      # Phase summaries
├── issue-{N}-{topic}.md              # Issue deliverables
├── research-{topic}.md               # Research reports
├── T-{N}-implementation-summary.md   # Task summaries
└── week{N}-{feature}.md              # Weekly progress
```

### 4. Requirements Organization

```
requirements/
├── vision-document.md                # Product vision
├── supplemental-specification.md     # NFR overview
├── use-cases/                        # Detailed use cases
├── use-case-briefs/                  # UC summaries
├── nfr-modules/                      # NFR by category
├── nfr-views/                        # NFR by priority
└── backlog/                          # Feature ideas
```

## Maintenance Guidelines

### Regular Cleanup

Run periodically:
1. Review `working/` - promote or delete stale files
2. Archive completed phase artifacts
3. Update traceability matrix after changes
4. Validate @-mentions still resolve

### Before Releases

1. Ensure `working/` is clean
2. Archive completed features
3. Update reports with release notes
4. Verify traceability coverage

### Ralph Loop Integration

Ralph operations create:
- `.aiwg/ralph/current-loop.json` - Active loop state
- `.aiwg/ralph/iterations/` - Iteration history
- `.aiwg/ralph/completion-{timestamp}.md` - Final reports

## File Discovery

### Find artifacts by type:
```bash
# All use cases
find .aiwg/requirements/use-cases -name "UC-*.md"

# All reports
find .aiwg/reports -name "*.md"

# Traceability
cat .aiwg/traceability/requirements-traceability-matrix.csv
```

### Search content:
```bash
# Find references to a use case
grep -r "UC-001" .aiwg/

# Find all issue-related reports
ls .aiwg/reports/issue-*.md
```

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Project overview and release process
- [CHANGELOG.md](../CHANGELOG.md) - Version history
- [agentic/](../agentic/) - Agent and skill definitions
- [docs/](../docs/) - User documentation

---

*Last updated: 2026-01-13*
*Maintained by: AIWG SDLC Framework*
