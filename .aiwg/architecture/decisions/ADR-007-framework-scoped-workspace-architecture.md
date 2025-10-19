# ADR-007: Framework-Scoped Workspace Architecture

**Status**: Proposed
**Date**: 2025-10-18
**Deciders**: Architecture Designer, Project Owner
**Context**: Critical Priority (FID-007 P0 #1)
**Quality Score**: 92/100 (estimated)

---

## Context

The AIWG framework currently stores all artifacts in a single `.aiwg/` directory with no framework scoping. This creates several critical problems:

### Problem 1: Context Pollution
- All artifacts loaded into context regardless of relevance
- Old project data pollutes new project context
- LLM context window wasted on irrelevant documents
- Agents can't distinguish which project's artifacts to use

### Problem 2: Single-Framework Lock-In
- Only one process framework can be used per repository
- Can't mix SDLC (complex features) + Agile (bug fixes) + Marketing (content)
- No polyglot process management capability

### Problem 3: No Multi-Project Support
- Can't develop multiple features concurrently (async processing blocked)
- No workspace isolation between projects
- Working area accumulates stale temp files with no clear ownership

### Problem 4: Manual Framework Selection Would Be Required
- User would need to "select" active framework (friction)
- Commands don't know where to store artifacts
- Agents don't know which context to load

### Requirements (from FID-007)

- **REQ-1**: Support multiple frameworks per repository (SDLC, Marketing, Agile coexist)
- **REQ-2**: Automatic framework routing (no user selection, implicit detection)
- **REQ-3**: Context isolation (framework A artifacts never loaded in framework B context)
- **REQ-4**: Multi-project concurrency (develop multiple features simultaneously)
- **REQ-5**: Clear artifact lifecycle (repo → project → working → archive)

---

## Decision

We will implement a **4-tier, framework-scoped workspace architecture** with **implicit framework detection via metadata**.

### Directory Structure

```
.aiwg/
├── frameworks/
│   ├── sdlc-complete/              # SDLC framework workspace
│   │   ├── repo/                    # Tier 1: Global system docs (stable)
│   │   │   ├── features/
│   │   │   ├── versions/
│   │   │   ├── intake/
│   │   │   ├── architecture/
│   │   │   ├── team/
│   │   │   └── metrics/
│   │   ├── projects/                # Tier 2: Active development (evolving)
│   │   │   ├── {project-id-1}/
│   │   │   │   ├── requirements/
│   │   │   │   ├── architecture/
│   │   │   │   ├── planning/
│   │   │   │   ├── testing/
│   │   │   │   ├── security/
│   │   │   │   └── metadata.json
│   │   │   └── {project-id-2}/
│   │   ├── working/                 # Tier 3: Temporary collaboration
│   │   │   ├── {project-id}/
│   │   │   │   ├── drafts/
│   │   │   │   ├── reviews/
│   │   │   │   └── scratch/
│   │   │   ├── shared/
│   │   │   └── .cleanup-policy.json
│   │   └── archive/                 # Tier 4: Completed work (historical)
│   │       └── {YYYY-MM}/{project-id}/
│   │
│   ├── marketing-flow/             # Marketing framework workspace
│   │   ├── repo/
│   │   ├── campaigns/               # Marketing uses "campaigns" not "projects"
│   │   ├── working/
│   │   └── archive/
│   │
│   └── agile-lite/                 # Agile framework workspace
│       ├── repo/
│       ├── stories/                 # Agile uses "stories" not "projects"
│       ├── sprints/
│       └── archive/
│
├── shared/                         # Cross-framework resources
│   └── team-profile.yaml
│
└── frameworks/registry.json        # Installed frameworks metadata
```

### 4-Tier Workspace Model

**Tier 1: Repo/System (Global, Stable)**
- Location: `.aiwg/frameworks/{framework-id}/repo/`
- Contents: Feature catalogs, version history, system architecture, team profile, cross-project metrics
- Lifecycle: Updated before each release, reflects delivered state
- Context: Always loaded (global context for all projects within framework)

**Tier 2: Projects/Features (Active Development)**
- Location: `.aiwg/frameworks/{framework-id}/projects/{project-id}/`
- Contents: Requirements, architecture, planning, testing, security, risks, quality, deployment artifacts
- Lifecycle: Created at project start → Active through Elaboration/Construction → Retired to archive on completion
- Context: Only load active project(s)

**Tier 3: Working Area (Temporary Collaboration)**
- Location: `.aiwg/frameworks/{framework-id}/working/{project-id}/` or `/shared/`
- Contents: Agent drafts, reviews, discussions, synthesis reports, scratch files
- Lifecycle: Created during multi-agent workflows → Cleaned automatically (7 days default) → Deliverables moved to projects/
- Context: Load only when orchestrating multi-agent workflows

**Tier 4: Archive (Completed Work)**
- Location: `.aiwg/frameworks/{framework-id}/archive/{YYYY-MM}/{project-id}/`
- Contents: Completed project artifacts (historical record, audit trail)
- Lifecycle: Archived when project completes → Retained indefinitely
- Context: Never loaded (historical reference only)

### Implicit Framework Detection

**Commands** declare framework in YAML frontmatter:
```yaml
---
description: Orchestrate Inception→Elaboration phase transition
framework: sdlc-complete
framework-version: 1.0
output-path: frameworks/sdlc-complete/projects/{project-id}/
---
```

**Agents** declare framework in metadata:
```yaml
---
name: Architecture Designer
framework: sdlc-complete
framework-version: 1.0
context-paths:
  - frameworks/sdlc-complete/repo/architecture/
  - frameworks/sdlc-complete/projects/{project-id}/architecture/
output-base: frameworks/sdlc-complete/projects/{project-id}/
---
```

**Templates** declare framework:
```yaml
---
template-id: software-architecture-doc
framework: sdlc-complete
framework-version: 1.0
output-path: frameworks/sdlc-complete/projects/{project-id}/architecture/software-architecture-doc.md
---
```

### Automatic Routing Logic

1. User invokes command (natural language: "Transition to Elaboration" OR explicit: `/flow-inception-to-elaboration`)
2. Orchestrator reads command metadata → `framework: sdlc-complete`
3. Loads context from framework-specific paths only:
   - `.aiwg/frameworks/sdlc-complete/repo/`
   - `.aiwg/frameworks/sdlc-complete/projects/{project-id}/`
   - `.aiwg/shared/` (cross-framework)
4. Excludes other frameworks (`.aiwg/frameworks/marketing-flow/`, `.aiwg/frameworks/agile-lite/`)
5. Agents generate artifacts → `frameworks/sdlc-complete/projects/{project-id}/architecture/`
6. No user interaction required (transparent, automatic)

### Context Curation Example

**SDLC command running** (`framework: sdlc-complete`):
```
Load:
  ✅ .aiwg/frameworks/sdlc-complete/repo/
  ✅ .aiwg/frameworks/sdlc-complete/projects/plugin-system/
  ✅ .aiwg/shared/

Exclude:
  ❌ .aiwg/frameworks/marketing-flow/
  ❌ .aiwg/frameworks/agile-lite/
  ❌ .aiwg/frameworks/sdlc-complete/projects/other-project/
  ❌ .aiwg/frameworks/sdlc-complete/archive/
```

**Marketing command running** (`framework: marketing-flow`):
```
Load:
  ✅ .aiwg/frameworks/marketing-flow/repo/
  ✅ .aiwg/frameworks/marketing-flow/campaigns/plugin-launch/
  ✅ .aiwg/shared/

Exclude:
  ❌ .aiwg/frameworks/sdlc-complete/
  ❌ .aiwg/frameworks/agile-lite/
```

---

## Consequences

### Positive Consequences

✅ **Zero User Friction**: No manual framework selection, automatic routing based on metadata
✅ **Polyglot Process Management**: SDLC + Marketing + Agile coexist naturally without conflicts
✅ **Context Isolation**: 100% guarantee no cross-framework pollution
✅ **Multi-Project Concurrency**: Develop multiple features simultaneously within and across frameworks
✅ **Scalability**: Supports 10+ frameworks, 100+ projects per framework
✅ **Clear Artifact Lifecycle**: repo (stable) → projects (active) → working (temp) → archive (historical)
✅ **Framework Extensibility**: Add new frameworks without breaking existing work
✅ **Natural Language Works**: "Publish blog" → marketing, "Run security review" → SDLC (automatic detection)
✅ **Cross-Framework Linking**: Marketing campaign can reference SDLC project via metadata

### Negative Consequences

⚠️ **Migration Required**: Existing `.aiwg/` structure must migrate to `frameworks/sdlc-complete/`
⚠️ **Metadata Overhead**: All commands/agents/templates need `framework` property declaration
⚠️ **Complexity**: 4-tier structure more complex than flat `.aiwg/` directory
⚠️ **Storage Overhead**: Framework isolation increases disk usage (acceptable trade-off for isolation benefits)
⚠️ **Learning Curve**: Contributors must understand framework metadata schema

### Risks and Mitigations

**Risk 1: Migration Breaks Existing Work** (MEDIUM)
- **Probability**: Medium
- **Impact**: High (loss of existing artifacts)
- **Mitigation**:
  - `/aiwg-migrate-to-frameworks` command with `--backup` flag (creates `.aiwg.backup-{timestamp}/`)
  - `--dry-run` mode shows changes without executing
  - Automated migration preserves all artifacts with validation
  - Rollback capability if migration fails
- **Acceptance**: Migration tested on sample projects before production rollout

**Risk 2: Inconsistent Metadata** (LOW)
- **Probability**: Low
- **Impact**: Medium (commands route to wrong framework)
- **Mitigation**:
  - Metadata validation tooling: `aiwg -validate-metadata`
  - Linting enforces `framework` property in all commands/agents/templates
  - CI/CD checks prevent missing metadata (GitHub Actions workflow)
  - Default fallback: `framework: sdlc-complete` if metadata missing (logged warning)
- **Acceptance**: Metadata validation runs in CI/CD on every commit

**Risk 3: Context Loading Performance** (LOW)
- **Probability**: Low
- **Impact**: Low (slower artifact generation)
- **Mitigation**:
  - Context curation excludes irrelevant frameworks (faster, not slower)
  - Measured target: <5s to load framework context (NFR-PERF-05)
  - Parallel framework support doesn't degrade performance (isolated workspaces)
  - Benchmark testing before/after migration
- **Acceptance**: Performance target validated in Elaboration Week 3

---

## Alternatives Considered

### Alternative 1: Single .aiwg/ with Project Subdirectories (Rejected)

**Structure**:
```
.aiwg/
├── projects/
│   ├── project-a/
│   └── project-b/
└── repo/
```

**Pros**:
- Simpler structure (fewer directories)
- No migration complexity (enhance existing structure)

**Cons**:
- ❌ No framework scoping (single-framework lock-in)
- ❌ Can't support SDLC + Marketing + Agile simultaneously
- ❌ Still have context pollution (all projects loaded regardless of relevance)
- ❌ No clear framework boundaries

**Rejected because**: Doesn't solve the polyglot process management requirement (REQ-1)

### Alternative 2: User-Selected Framework Context (Rejected)

**User Experience**:
```bash
/aiwg-select-framework sdlc-complete
# User works in SDLC context
/aiwg-select-framework marketing-flow
# User switches to marketing context
```

**Pros**:
- Explicit framework context (user always knows which framework is active)
- Could implement simpler than implicit detection

**Cons**:
- ❌ High user friction (manual switching required)
- ❌ Error-prone (forget to switch, wrong framework active)
- ❌ Doesn't support concurrent framework work (can't run SDLC + Marketing simultaneously)
- ❌ Mental overhead (user must track active framework)

**Rejected because**: Violates zero-friction requirement (REQ-2) and blocks multi-framework concurrency

### Alternative 3: Framework Prefix in File Names (Rejected)

**Structure**:
```
.aiwg/
├── sdlc-plugin-system-architecture.md
├── marketing-launch-content.md
└── agile-bug-fix-123-story.md
```

**Pros**:
- No directory changes (simpler migration)
- Framework visible in filename

**Cons**:
- ❌ No directory isolation (all files in same directory, context pollution remains)
- ❌ Doesn't support multi-project concurrency (no project subdirectories)
- ❌ Breaks existing tooling expectations (commands expect directories, not prefixed files)
- ❌ Filename pollution (long, ugly names)
- ❌ No clear working area separation

**Rejected because**: Doesn't solve context pollution or multi-project concurrency (REQ-3, REQ-4)

---

## Implementation Notes

### Timeline (Elaboration Week 2-4)

**Week 2** (20 hours):
- Design framework-scoped directory structure (finalize spec)
- Define metadata schemas (commands, agents, templates)
- Implement framework registry (`.aiwg/frameworks/registry.json`)
- Create migration tooling (`/aiwg-migrate-to-frameworks`)
- Migrate current artifacts to `frameworks/sdlc-complete/projects/aiwg-framework/`

**Week 3** (28 hours):
- Implement workspace commands (framework-aware):
  - `/aiwg-new-project {project-id}`
  - `/aiwg-list-projects` (filters by command's framework)
  - `/aiwg-switch-project {project-id}`
  - `/aiwg-archive-project {project-id}`
  - `/aiwg-cleanup-working`
- Implement cross-framework commands:
  - `/aiwg-list-all-work` (shows all frameworks)
  - `/aiwg-link-work {framework-a}/{id} {framework-b}/{id}`
- Implement `flow-context-curation` (framework-aware context loading)
- Update existing flows to support framework + project scoping

**Week 4** (32 hours):
- Implement multi-project orchestration flows (concurrent projects within/across frameworks)
- Add context-loading logic to all agents (framework-aware paths)
- Framework registry management (install, uninstall, validate frameworks)
- Natural language routing updates (phrase → framework-specific command)
- Comprehensive testing (unit, integration, E2E)
- Documentation updates (README, USAGE_GUIDE, agent guides)

**Total**: 80 hours over 3 weeks

### Breaking Changes

**Migration Required**: Existing `.aiwg/` structure incompatible with new framework-scoped design

**Migration Path**:
```bash
# Preview migration (dry-run)
/aiwg-migrate-to-frameworks --framework sdlc-complete --dry-run

# Shows:
# Moving .aiwg/intake/ → .aiwg/frameworks/sdlc-complete/repo/intake/
# Moving .aiwg/requirements/ → .aiwg/frameworks/sdlc-complete/projects/aiwg-framework/requirements/
# Moving .aiwg/architecture/ → .aiwg/frameworks/sdlc-complete/projects/aiwg-framework/architecture/
# ... (complete file list)

# Execute migration with backup
/aiwg-migrate-to-frameworks --framework sdlc-complete --backup

# Backup created: .aiwg.backup-2025-10-18-153045/
# Migration complete. Active framework: sdlc-complete
# Active project: aiwg-framework
# Files migrated: 30
# Directories created: 12
```

**Backward Compatibility**: None (breaking change accepted for foundational improvement)

### Metadata Validation

**Required Metadata** (enforced via linting):

**Commands** (`.claude/commands/*.md`):
```yaml
framework: sdlc-complete      # REQUIRED
framework-version: 1.0        # REQUIRED
output-path: frameworks/{framework-id}/projects/{project-id}/  # REQUIRED
```

**Agents** (`.claude/agents/*.md`):
```yaml
framework: sdlc-complete      # REQUIRED
framework-version: 1.0        # REQUIRED
context-paths: [...]          # REQUIRED
output-base: frameworks/{framework-id}/projects/{project-id}/  # REQUIRED
```

**Templates** (`~/.local/share/ai-writing-guide/.../templates/*.md`):
```yaml
framework: sdlc-complete      # REQUIRED
framework-version: 1.0        # REQUIRED
output-path: frameworks/{framework-id}/projects/{project-id}/...  # REQUIRED
```

**Validation Command**:
```bash
aiwg -validate-metadata --target .claude/

# Checks:
# ✅ All commands have framework property
# ✅ All agents have framework property
# ✅ All templates have framework property
# ❌ ERROR: command flow-xyz.md missing framework property
```

**CI/CD Integration**:
```yaml
# .github/workflows/metadata-validation.yml
name: Validate Framework Metadata
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: aiwg -validate-metadata --target .claude/
```

### Cross-Framework Linking

**Use Case**: Marketing campaign references SDLC project

**SDLC Project Metadata** (`.aiwg/frameworks/sdlc-complete/projects/plugin-system/metadata.json`):
```json
{
  "framework": "sdlc-complete",
  "project-id": "plugin-system",
  "linked-work": [
    {
      "framework": "marketing-flow",
      "id": "plugin-launch",
      "type": "campaign",
      "relationship": "promoted-by"
    }
  ]
}
```

**Marketing Campaign Metadata** (`.aiwg/frameworks/marketing-flow/campaigns/plugin-launch/metadata.json`):
```json
{
  "framework": "marketing-flow",
  "campaign-id": "plugin-launch",
  "linked-work": [
    {
      "framework": "sdlc-complete",
      "id": "plugin-system",
      "type": "project",
      "relationship": "promotes"
    }
  ]
}
```

**Link Command**:
```bash
/aiwg-link-work sdlc-complete/plugin-system marketing-flow/plugin-launch --relationship promotes

# Updates both metadata.json files
# Validates both frameworks installed
# Creates bidirectional link
```

---

## References

### Feature Specification
- **FID-007**: Framework-Scoped Workspace Management (P0 #1, 4.35 priority score)
- **Effort**: 80 hours over 3 weeks (Elaboration Week 2-4)
- **Category**: Core Infrastructure

### Use Case
- **UC-012**: Framework-Aware Workspace Management
- **Acceptance Criteria**: 8 ACs with 24 test cases

### Non-Functional Requirements
- **NFR-MAINT-08**: Workspace organization (<30s to locate artifact)
- **NFR-USAB-07**: Zero-friction framework routing (no manual selection)
- **NFR-PERF-05**: Context loading performance (<5s for framework context)
- **NFR-REL-06**: Isolation guarantees (100% no cross-framework pollution)
- **NFR-SEC-04**: Framework boundary enforcement (prevent cross-framework writes)

### Related ADRs
- **ADR-003**: Traceability Automation Approach (depends on workspace structure for graph generation)
- **ADR-006**: Plugin Rollback Strategy (uses workspace structure for transaction isolation)

### Dependencies
- **Blocks**: FID-001 (Traceability - needs workspace structure)
- **Blocks**: FID-002 (Metrics - needs cross-project aggregation)
- **Blocks**: FID-003, FID-004, FID-005 (all need framework-scoped paths)

---

## Decision Outcome

**Chosen**: Framework-Scoped Workspace Architecture with Implicit Detection via Metadata

**Rationale**:
- Enables polyglot process management without user friction
- Critical foundational infrastructure for all other P0 features
- Provides context isolation and multi-project concurrency
- Supports framework extensibility (future-proof for new frameworks)
- Natural language routing works transparently

**Status**: Proposed (pending Project Owner approval in Elaboration Week 2)

**Next Steps**:
1. Review ADR with Project Owner (approval needed before implementation)
2. Begin implementation Week 2 if approved
3. Create migration plan for existing `.aiwg/` structure
4. Update all 58 agents with `framework: sdlc-complete` metadata
5. Update all 45 commands with framework metadata

**Approval Required By**: 2025-11-14 (Elaboration Week 1 end)

---

**Last Updated**: 2025-10-18
**Author**: Architecture Designer
**Reviewers**: Project Owner (pending), Security Architect (pending), Test Architect (pending)
