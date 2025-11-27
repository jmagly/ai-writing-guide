# AIWG Deployment Context Rescoping Plan

**Created**: 2025-11-26
**Updated**: 2025-11-26
**Status**: APPROVED - Ready for Execution
**Purpose**: Correct server/API assumptions in AIWG project artifacts while preserving generic SDLC framework templates

---

## Executive Summary

The AIWG SDLC artifacts were generated using generic templates that assumed a deployed server/API context. This plan identifies artifacts that need correction or deprecation to accurately reflect AIWG's actual deployment context.

### Critical Distinction: Dogfooding Scope

**AIWG is dogfooding itself** - using its own SDLC framework to manage its development. This creates two distinct artifact layers:

| Layer | Scope | Action |
|-------|-------|--------|
| **AIWG Project Artifacts** (`.aiwg/`) | Specific to AIWG as a CLI tool | Rescope to CLI context |
| **SDLC Framework Templates** (`agentic/.../templates/`) | Generic for ALL project types | Keep server-capable |
| **SDLC Framework Commands** (`.claude/commands/`) | Generic orchestration | No changes |
| **SDLC Framework Agents** (`.claude/agents/`) | Generic role definitions | No changes |

**The framework templates remain generic** so users can apply AIWG to SaaS apps, APIs, and servers. Only the AIWG-specific project artifacts get rescoped.

---

## AIWG Deployment Context

**AIWG IS:**
- A documentation/template framework consumed by AI agents
- A local CLI tool (`aiwg`) installed on developer machines
- Markdown linters, validators, and analyzers
- Agent definitions deployed to user projects (`.claude/agents/`)
- A GitHub-distributed open source project

**AIWG IS NOT:**
- A deployed server or API
- A SaaS platform requiring uptime monitoring
- A containerized application (Docker/K8s)
- A service handling HTTP requests

---

## Resolved Decisions

The following questions have been resolved:

### Decision 1: CodebaseAnalyzer (UC-003)

**Decision**: **KEEP** - UC-003 remains in scope

**Rationale**:
- `/intake-from-codebase` is a key differentiator for brownfield projects
- The 785-line implementation is complete and well-structured
- The 79.5% test failure rate indicates test/implementation misalignment, not a broken feature
- Tests need fixing, not feature removal

### Decision 2: Test Pass Rate Target

**Decision**: **Fix all relevant tests**

**Rationale**:
- All 39 test files are relevant to AIWG CLI/tooling context
- No tests are server-oriented; all test local file processing and CLI operations
- 125 failures are due to implementation/test misalignment, not wrong test scope

### Decision 3: Transition Phase Scope

**Decision**: **Reframe as "Release Preparation"** for AIWG project artifacts only

**Rationale**:
- AIWG deploys to GitHub (releases, npm), not production servers
- Framework templates keep generic "Transition" for server-capable projects

### Decision 4: Hypercare

**Decision**: **Replace with "Post-Release Support"** for AIWG project artifacts only

**Rationale**:
- AIWG support = GitHub issues monitoring, documentation updates
- Framework templates keep generic "Hypercare" for server projects

---

## Artifacts Classification

### Category A: DEPRECATE (AIWG-Specific Server Artifacts)

These AIWG project artifacts assume server deployment and should be **archived**:

| Artifact | Reason for Deprecation |
|----------|----------------------|
| `.aiwg/transition/operations/runbook-monitoring-alerting.md` | Prometheus, Grafana, PagerDuty, CloudWatch - AIWG has no server |
| `.aiwg/transition/operations/runbook-scaling-performance.md` | Autoscaling, load balancers, database connections - AIWG has no server |
| `.aiwg/transition/operations/runbook-incident-response.md` | Server incident procedures - AIWG has no production server |
| `.aiwg/transition/hypercare/hypercare-monitoring-plan.md` | Server health monitoring - AIWG has no server |
| `.aiwg/transition/hypercare/daily-health-check-template.md` | API health checks - AIWG has no API |
| `.aiwg/transition/hypercare/weekly-summary-template.md` | Server metrics summary - AIWG has no server |
| `.aiwg/transition/hypercare/issue-log-template.md` | Production incident tracking - partially relevant, archive for now |
| `.aiwg/transition/deployment/deployment-runbook.md` | EC2, ECS, Docker deployment - AIWG not containerized |
| `.aiwg/transition/deployment/production-deployment-checklist.md` | Server deployment checklist - AIWG not server-deployed |

**Action**: Move to `.aiwg/archive/deprecated-server-context/` with README explaining deprecation reason.

**Note**: The generic SDLC framework templates (`agentic/.../templates/transition/`) remain unchanged for projects that DO need server deployment.

---

### Category B: SIGNIFICANT REVISION (Mixed Content)

These AIWG project artifacts contain both relevant and irrelevant content:

#### B1: Gate Reports (Construction IOC)

**Files**:
- `.aiwg/gates/construction-ioc/CONSTRUCTION-IOC-GATE-DECISION.md`
- `.aiwg/gates/construction-ioc/FINAL-GATE-REPORT.md`
- `.aiwg/gates/construction-ioc/EXECUTIVE-SUMMARY.md`
- `.aiwg/gates/construction-ioc/validation/reliability-engineer-assessment.md`
- `.aiwg/gates/construction-ioc-20251024-204657/*` (duplicate - archive entirely)

**Remove/Revise**:
- ❌ "99.9% uptime target" → Not applicable to AIWG
- ❌ "SLO/SLI framework required" → Not applicable to AIWG
- ❌ "PagerDuty alerting" → Not applicable to AIWG
- ❌ "Health check endpoints (/health, /ready, /live)" → Not applicable to AIWG
- ❌ "Load testing (1000 ops/min)" → Not applicable to AIWG
- ❌ "CloudWatch/ELK log aggregation" → Not applicable to AIWG
- ❌ "Grafana dashboards" → Not applicable to AIWG
- ❌ "CPU monitoring" → Not applicable to AIWG

**Keep/Adjust**:
- ✅ Test coverage metrics (90.8%) - relevant for CLI tooling
- ✅ Feature completion (100%) - relevant
- ✅ Security validation (zero vulnerabilities) - relevant
- ✅ CodebaseAnalyzer fix - **CONFIRMED IN SCOPE** (UC-003)
- ✅ CLI command functionality - relevant
- ✅ Test pass rate (target ≥95%) - relevant

#### B2: Transition Phase Summary

**File**: `.aiwg/transition/TRANSITION-PHASE-SUMMARY.md`

**Remove**:
- Week 1 tasks: SLO/SLI framework, PagerDuty, health endpoints, CPU metrics
- Week 2 tasks: Load testing
- All "production observability" references

**Keep/Revise**:
- Week 1: CodebaseAnalyzer fix, critical test fixes
- Week 2: E2E test suites for CLI, documentation review
- Reframe UAT as "CLI User Testing"

#### B3: Transition Phase Plan

**File**: `.aiwg/transition/planning/transition-phase-plan.md`

**Revise to focus on**:
- GitHub release workflow validation
- Installation testing (curl, npm)
- Cross-platform compatibility (Linux, macOS, WSL)
- Documentation completeness validation
- CLI smoke testing
- Post-release GitHub issues monitoring

---

### Category C: MINOR REVISION (Mostly Correct)

These artifacts need terminology updates but are fundamentally sound:

| Artifact | Changes Needed |
|----------|---------------|
| `.aiwg/requirements/nfr-modules/reliability.md` | Remove any server uptime references; keep data retention NFRs |
| `.aiwg/testing/master-test-plan.md` | Remove load testing sections; focus on unit/integration/CLI E2E |
| `.aiwg/testing/test-infrastructure-specification.md` | Remove container/K8s testing infra; focus on vitest/Node.js |
| `.aiwg/testing/nfr-measurement-protocols.md` | Remove server-oriented protocols |
| `.aiwg/reports/construction-phase-final-report.md` | Add context note about CLI deployment model |

---

### Category D: NO CHANGES NEEDED

These artifacts are appropriate for AIWG's context:

- `.aiwg/intake/*` - Project intake (correct)
- `.aiwg/requirements/use-cases/*` - Use cases (correct - CLI/agent workflows)
- `.aiwg/requirements/vision-document.md` - Vision (correct)
- `.aiwg/requirements/stakeholder-register.md` - Stakeholders (correct)
- `.aiwg/architecture/software-architecture-doc.md` - SAD (correct - document processing architecture)
- `.aiwg/architecture/adr/*` - ADRs (correct - modular deployment, multi-agent patterns)
- `.aiwg/architecture/decisions/*` - Decisions (correct)
- `.aiwg/planning/phase-plan-inception.md` - Inception plan (correct)
- `.aiwg/planning/phase-plan-elaboration.md` - Elaboration plan (correct)
- `.aiwg/risks/risk-list.md` - Risks (correct - adoption, burnout risks)
- `.aiwg/security/data-classification.md` - Data classification (correct - local processing)
- `.aiwg/security/privacy-impact-assessment.md` - PIA (correct - privacy by design)
- `.aiwg/gates/inception-lom-report.md` - Inception gate (correct)
- `.aiwg/archive/*` - Historical artifacts (preserve as-is)

---

## Revised IOC Gate Criteria for AIWG

### CLI-Appropriate Criteria (Replace Server Criteria)

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| **CLI Command Functionality** | 100% commands working | `aiwg -version`, `-deploy-agents`, `-deploy-commands`, `-new` |
| **Installation Success** | Works on Linux, macOS, WSL | Cross-platform installation test via curl |
| **Agent Deployment** | Deploys 58 agents correctly | `aiwg -deploy-agents` produces valid `.claude/agents/` |
| **Command Deployment** | Deploys 45 commands correctly | `aiwg -deploy-commands` produces valid `.claude/commands/` |
| **Template Completeness** | All templates present and valid | Manifest validation passes |
| **Markdown Linting** | Zero blocking errors | `npm exec markdownlint-cli2` passes |
| **Test Coverage** | ≥80% for tooling code | vitest coverage report |
| **Test Pass Rate** | ≥95% | vitest run (39 test files) |
| **Security** | Zero high/critical vulnerabilities | `npm audit` (production deps only) |
| **Documentation** | README, USAGE_GUIDE, CLAUDE.md complete | Manual review |
| **GitHub Actions** | CI/CD workflows passing | lint-fixcheck, test workflows green |
| **CodebaseAnalyzer (UC-003)** | Functional with ≥80% test pass | `/intake-from-codebase` generates valid intake |

### Criteria NOT Applicable for AIWG

- ❌ 99.9% uptime (no server)
- ❌ SLO/SLI framework (no service)
- ❌ PagerDuty/alerting (no production incidents)
- ❌ Health check endpoints (no API)
- ❌ Load testing (no request handling)
- ❌ Container deployment (not containerized)
- ❌ Database connections (no database)
- ❌ Horizontal scaling (not a service)

---

## Implementation Plan

### Phase 1: Archive Deprecated Artifacts (30 min)

1. Create `.aiwg/archive/deprecated-server-context/`
2. Move 9 Category A artifacts
3. Add `README.md` explaining deprecation reason
4. Archive duplicate gate directory `.aiwg/gates/construction-ioc-20251024-204657/`

### Phase 2: Revise Gate Reports (1-2 hours)

1. Update `.aiwg/gates/construction-ioc/CONSTRUCTION-IOC-GATE-DECISION.md`
2. Update `.aiwg/gates/construction-ioc/FINAL-GATE-REPORT.md`
3. Update `.aiwg/gates/construction-ioc/EXECUTIVE-SUMMARY.md`
4. Update `.aiwg/gates/construction-ioc/validation/reliability-engineer-assessment.md`

### Phase 3: Revise Transition Artifacts (1 hour)

1. Update `.aiwg/transition/TRANSITION-PHASE-SUMMARY.md`
2. Update `.aiwg/transition/planning/transition-phase-plan.md`
3. Revise `.aiwg/transition/uat/uat-framework.md` for CLI testing

### Phase 4: Test Analysis and Fixes (2-4 hours)

1. Run test suite to identify current failures
2. Categorize failures by component
3. Fix test/implementation misalignments
4. Target ≥95% pass rate

### Phase 5: Validation (30 min)

1. Grep for remaining server terminology in `.aiwg/`
2. Verify cross-references are valid
3. Run revised IOC gate criteria checklist
4. Confirm no orphaned artifact references

---

## Test Suite Analysis

### Test Files (39 total) - All Relevant

**CLI/Core Tooling** (24 files):
- `agents/` - 3 files (validator, packager, deployer)
- `cli/` - 4 files (config, workflow, watch, git-hooks)
- `writing/` - 8 files (validation, patterns, voice, content)
- `plugin/` - 9 files (workspace, migration, framework detection)

**SDLC Framework Tooling** (15 files):
- `sdlc/analysis/` - 1 file (codebase-analyzer - **UC-003**)
- `sdlc/traceability/` - 1 file (traceability-checker)
- `sdlc/security/` - 1 file (security-validator)
- `sdlc/testing/` - 9 files (mocks, fixtures, NFR testing)
- `sdlc/git/` - 1 file (git-workflow-orchestrator)
- `sdlc/orchestration/` - 1 file (agent-orchestrator)

**All 39 test files test CLI/local operations** - none test server functionality.

---

## Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Archive | 30 min | HIGH |
| Phase 2: Gate Revisions | 1-2 hours | HIGH |
| Phase 3: Transition Revisions | 1 hour | HIGH |
| Phase 4: Test Fixes | 2-4 hours | HIGH |
| Phase 5: Validation | 30 min | MEDIUM |
| **Total** | **5-8 hours** | |

---

## Success Criteria

- [ ] 9 server-oriented artifacts archived with deprecation notice
- [ ] Duplicate gate directory archived
- [ ] Gate reports reflect CLI-appropriate criteria only
- [ ] Transition phase reframed as Release Preparation
- [ ] Zero grep hits for "99.9% uptime", "SLO/SLI framework", "PagerDuty", "health check endpoint" in `.aiwg/`
- [ ] Test pass rate ≥95% (39 test files)
- [ ] CodebaseAnalyzer (UC-003) tests passing ≥80%
- [ ] IOC gate criteria validated against AIWG CLI deployment context
- [ ] Clear path to PR (Product Release) gate for GitHub release

---

## Appendix: Full Artifact Inventory

### Files to Archive (Category A) - 9 files

```
.aiwg/transition/operations/runbook-monitoring-alerting.md
.aiwg/transition/operations/runbook-scaling-performance.md
.aiwg/transition/operations/runbook-incident-response.md
.aiwg/transition/hypercare/hypercare-monitoring-plan.md
.aiwg/transition/hypercare/daily-health-check-template.md
.aiwg/transition/hypercare/weekly-summary-template.md
.aiwg/transition/hypercare/issue-log-template.md
.aiwg/transition/deployment/deployment-runbook.md
.aiwg/transition/deployment/production-deployment-checklist.md
```

### Directories to Archive (Duplicate) - 1 directory

```
.aiwg/gates/construction-ioc-20251024-204657/ → .aiwg/archive/
```

### Files to Significantly Revise (Category B) - 8 files

```
.aiwg/gates/construction-ioc/CONSTRUCTION-IOC-GATE-DECISION.md
.aiwg/gates/construction-ioc/FINAL-GATE-REPORT.md
.aiwg/gates/construction-ioc/EXECUTIVE-SUMMARY.md
.aiwg/gates/construction-ioc/validation/reliability-engineer-assessment.md
.aiwg/transition/TRANSITION-PHASE-SUMMARY.md
.aiwg/transition/planning/transition-phase-plan.md
.aiwg/transition/uat/uat-framework.md
.aiwg/transition/uat/uat-execution-log.md
```

### Files to Minor Revise (Category C) - 5 files

```
.aiwg/requirements/nfr-modules/reliability.md
.aiwg/testing/master-test-plan.md
.aiwg/testing/test-infrastructure-specification.md
.aiwg/testing/nfr-measurement-protocols.md
.aiwg/reports/construction-phase-final-report.md
```

---

## Framework Templates (NO CHANGES)

The following remain **unchanged** to support all project types:

```
agentic/code/frameworks/sdlc-complete/templates/transition/
agentic/code/frameworks/sdlc-complete/templates/deployment/
agentic/code/frameworks/sdlc-complete/templates/operations/
agentic/code/frameworks/sdlc-complete/flows/
```

These templates support SaaS, API, and server projects that DO need:
- Production deployment procedures
- SLO/SLI monitoring
- Hypercare and incident response
- Container orchestration

AIWG provides these capabilities for users; AIWG itself just doesn't need them.
