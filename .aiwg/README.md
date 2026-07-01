# AIWG Workspace Directory

This directory contains all SDLC artifacts, project documentation, and operational state for the AI Writing Guide project.

## Important: Project-Local Directory

This directory is **project-local extended memory** — it stores SDLC artifacts generated during project development. Key facts:

- **Nothing from `.aiwg/` is deployed to other systems** via `aiwg use`. The CLI deploys from `agentic/code/`, not from here.
- **`.aiwg/` is populated by AIWG agents at runtime** when users work on their projects. It is output, not source.
- **For the AIWG repository specifically**: this directory contains artifacts from AIWG's own development (dogfooding). These files may look like framework source — schemas, research docs, flow definitions — but they are project-local artifacts, not deployable framework components.
- **Framework source code lives in `agentic/code/`** — see `docs/development/aiwg-development-guide.md` for the full source vs output distinction.

## Tracking Taxonomy

`.aiwg/` mixes durable project records with host-local runtime state. Use this
taxonomy before adding, moving, or deleting files.

| Class | Paths | Git Policy | Notes |
|-------|-------|------------|-------|
| Project records | `architecture/`, `requirements/`, `intake/`, `planning/`, `risks/`, `testing/`, `security/`, `reports/`, `research/`, `studies/`, `flows/`, `traceability/`, `transition/`, `ux/`, `references/`, `management/`, `proposals/`, `patterns/`, `kb/` | Track when the file is intentional evidence, a decision record, a report, or a reusable project artifact. | These paths are AIWG dogfooding records for this repository, not upstream product source. |
| Project-local capability records | `smiths/`, `templates/`, selected `config/`, `frameworks/registry.json` | Track stable definitions and registry snapshots. | Deployable upstream framework/addon/plugin source still belongs under `agentic/code/**`. Runtime framework copies under `.aiwg/frameworks/*/` stay ignored. |
| Release and sync markers | `release.config`, `release-process.md`, `.last-doc-sync`, `AIWG.md` | Track when they describe repository release process, docs sync state, or stable project context. | Provider bridge files generated outside `.aiwg/` remain disposable unless separately documented. |
| Archive | `archive/` | Track historical records that should remain reproducible. | New archival material should use `.aiwg/archive/<domain-or-date>/`. Preserve older nested archive paths as historical locations unless a cleanup issue moves them deliberately. |
| Working drafts | `working/` | Ignored for new files. Promote durable work to the appropriate project-record path before committing. | Existing tracked spike notes are retained as historical records; do not use them as precedent for new temporary output. |
| Local issue store | `issues/` | Ignored for issue content. | In this repository, `.aiwg/aiwg.config` points issue tracking at the Gitea `origin` remote. Treat Gitea as authoritative; local issue files are scratch or migration state unless the project config points to a local issue store. |
| Runtime, cache, and generated state | `.index/`, `.storage-cache/`, `ralph/`, `ralph-external/`, `marketing/`, `forensics/`, `research/synthesis/`, `.milestones.json`, `browser-allowlist.yaml`, `aiwg.config` | Ignored and safe to regenerate or clean when not actively in use. | See `docs/generated-output-policy.md` for cleanup commands and generated-path validation. |

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
| `working/` | Temporary workspace | In-progress drafts (ignored for new files; safe to clean after promotion) |

### Extended Directories

| Directory | Purpose | Notes |
|-----------|---------|-------|
| `research/` | Academic references | External research mapped to AIWG patterns |
| `traceability/` | Requirements tracing | RTM, compliance tracking |
| `management/` | Strategic docs | Business case, vision, roadmap |
| `config/` | Configuration | Plugin registry, system config |
| `smiths/` | Agent tooling | AgentSmith, SkillSmith, CommandSmith definitions |
| `ralph/` | Agent Loop state | Runtime iteration state and completion reports |
| `archive/` | Historical artifacts | Completed phases, deprecated content |
| `transition/` | Release preparation | UAT framework, release checklist |

## Key Patterns

### 1. Working Directory Lifecycle

Files in `working/` should be:
- **Promoted** to a permanent project-record location when complete
- **Archived** under `archive/` if abandoned but potentially useful
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

### Agent Loop Integration

Ralph operations create:
- `.aiwg/ralph/current-loop.json` - Active loop state
- `.aiwg/ralph/iterations/` - Iteration history
- `.aiwg/ralph/completion-{timestamp}.md` - Final reports

These files are runtime state by default and are ignored in this repository.
Promote only final reports or decisions that need long-term project evidence
into `reports/`, `planning/`, `architecture/`, or another project-record path.

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
- [docs/generated-output-policy.md](../docs/generated-output-policy.md) - Cleanup and tracked generated-output rules
- [docs/repo-layout-source-taxonomy.md](../docs/repo-layout-source-taxonomy.md) - Source-of-truth boundaries for source-like directories

---

*Last updated: 2026-07-01*
*Maintained by: AIWG SDLC Framework*
