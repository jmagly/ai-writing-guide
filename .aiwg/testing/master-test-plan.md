# Master Test Plan - AI Writing Guide (AIWG) Project

**Document Type**: Test Strategy and Planning
**Project**: AI Writing Guide - SDLC Framework Plugin System
**Version**: 1.0
**Status**: BASELINED
**Date**: 2025-10-22
**Phase**: Elaboration → Construction Transition
**Author**: Test Architect

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2025-10-22 | Initial draft | Test Architect |
| 1.0 | 2025-10-22 | Baselined for Construction phase | Multi-Agent Review Team |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Test Objectives](#2-test-objectives)
3. [Test Items](#3-test-items)
4. [In-Scope vs Out-of-Scope](#4-in-scope-vs-out-of-scope)
5. [Test Approach](#5-test-approach)
6. [Test Deliverables](#6-test-deliverables)
7. [Test Environment](#7-test-environment)
8. [Roles and Responsibilities](#8-roles-and-responsibilities)
9. [Schedule and Milestones](#9-schedule-and-milestones)
10. [Entry and Exit Criteria](#10-entry-and-exit-criteria)
11. [Risk Management](#11-risk-management)
12. [Metrics and Reporting](#12-metrics-and-reporting)
13. [Tools and Automation](#13-tools-and-automation)
14. [Approvals](#14-approvals)

---

## 1. Introduction

### 1.1 Purpose

This Master Test Plan establishes the comprehensive testing strategy for the AI Writing Guide (AIWG) project across all phases from Construction through Transition. It defines test objectives, scope, approach, resources, and success criteria to ensure the system meets all functional and non-functional requirements with 80% unit, 70% integration, and 50% E2E coverage per NFR-QUAL-003.

### 1.2 Scope

This plan covers testing for:

- **Core Services**: WorkspaceManager, TierFilter, RegistryManager, ContextBuilder, ManifestGenerator (7 components, FID-007 implemented)
- **Framework Services**: WritingValidator, CodebaseAnalyzer, TraceabilityChecker, TemplateSelector, TestGenerator, SecurityGate (9 components, planned for Construction)
- **CLI Tools**: aiwg commands (deploy-agents, new, status, update, version)
- **SDLC Artifacts**: 58 agents, 42+ commands, 100+ templates
- **Multi-Agent Workflows**: Primary Author → Parallel Reviewers → Synthesizer pattern

### 1.3 References

**Requirements Documents**:
- Software Architecture Document v1.0 (SAD)
- Supplemental Specification v1.3 (82 NFRs across 6 modules)
- Use Cases UC-001 through UC-011 (7 P0, 2 P1, 2 Future)
- Requirements Traceability Matrix (96 requirements, 206 test cases)

**Test Infrastructure**:
- Test Infrastructure Specification (12,847 words, BLOCKER-001 resolution)
- NFR Measurement Protocols (8,842 words, BLOCKER-002 resolution)

**Architecture**:
- ADR-006: Plugin Rollback Strategy
- ADR-007: Framework-Scoped Workspace Management
- ADR-008: Multi-Agent Documentation Pattern

**Project Management**:
- Architecture Baseline Milestone Report (ABM)
- Elaboration Week 5 deliverables

---

## 2. Test Objectives

### 2.1 Primary Objectives

**Objective 1: Validate Functional Requirements (11 Use Cases)**
- Verify all 7 P0 use cases function correctly (UC-001, UC-002, UC-003, UC-004, UC-006, UC-008, UC-009, UC-011)
- Validate multi-agent orchestration workflows (UC-004)
- Ensure traceability validation accuracy (UC-006, NFR-TRACE-05: 98% accuracy)
- Confirm security gate effectiveness (UC-011, NFR-SEC-ACC-01: 100% attack detection)

**Objective 2: Validate Non-Functional Requirements (82 NFRs)**
- **Performance**: Meet all P0 performance targets (NFR-PERF-001: <60s validation, NFR-PERF-002: <10s deployment, NFR-TRACE-01/02/03: <10s/<30s/<20s scans)
- **Security**: Zero external API calls (NFR-SEC-001), file permission preservation (NFR-SEC-003)
- **Usability**: First-time setup <15min (NFR-USE-004), error message clarity 100% (NFR-USE-005)
- **Accuracy**: AI pattern false positive rate <5% (NFR-ACC-001), requirement ID extraction 98% (NFR-TRACE-05)
- **Quality**: Multi-agent review 3+ reviewers (NFR-QUAL-001), 100% traceability coverage (NFR-QUAL-002)

**Objective 3: Achieve Coverage Targets**
- Unit test coverage: 80% per NFR-QUAL-003
- Integration test coverage: 70% per NFR-QUAL-003
- E2E test coverage: 50% per NFR-QUAL-003

**Objective 4: Validate Test Infrastructure**
- Confirm MockAgentOrchestrator supports multi-agent testing
- Validate GitSandbox for isolated Git operations
- Verify GitHubAPIStub for GitHub integration testing
- Validate FilesystemSandbox for file operation testing
- Confirm PerformanceProfiler for NFR benchmarking
- Validate TestDataFactory for fixture generation

**Objective 5: Ensure Construction Readiness**
- Resolve all critical blockers (BLOCKER-001 ✓, BLOCKER-002 ✓, BLOCKER-003 deferred)
- Validate test infrastructure before Construction phase
- Establish baseline metrics for performance NFRs
- Confirm CI/CD pipeline integration

---

## 3. Test Items

### 3.1 Core Services (Implemented - FID-007)

| Component | Version | LOC | Status | Priority |
|-----------|---------|-----|--------|----------|
| WorkspaceManager | 1.0 | 650 | Implemented | P0 |
| TierFilter | 1.0 | 450 | Implemented | P0 |
| RegistryManager | 1.0 | 800 | Implemented | P0 |
| ContextBuilder | 1.0 | 750 | Implemented | P0 |
| ManifestGenerator | 1.0 | 1,200 | Implemented | P0 |
| CLIHandler | 1.0 | 500 | Implemented | P0 |
| Tests | 1.0 | 1,300 | Implemented | P0 |

**Total Implemented**: 4,650 LOC (99 methods, 5 CLI commands)

### 3.2 Framework Services (Planned - Construction Phase)

| Component | Version | Est. LOC | Priority | Target Week |
|-----------|---------|----------|----------|-------------|
| WritingValidator | - | 800 | P0 | Week 1-2 |
| CodebaseAnalyzer | - | 1,200 | P0 | Week 2-3 |
| AgentOrchestrator | - | 1,000 | P0 | Week 1-2 |
| TraceabilityChecker | - | 1,500 | P0 | Week 3-4 |
| TemplateSelector | - | 600 | P0 | Week 2-3 |
| TestGenerator | - | 1,000 | P0 | Week 3-4 |
| SecurityGate | - | 800 | P0 | Week 4-5 |
| MetricsCollector | - | 1,200 | P1 | Post-MVP |
| RollbackManager | - | 600 | P1 | Post-MVP |

**Total Planned**: ~6,900 LOC

### 3.3 SDLC Artifacts

| Artifact Type | Count | Status | Test Approach |
|---------------|-------|--------|---------------|
| SDLC Agents | 58 | Deployed | Deployment validation, metadata integrity |
| Slash Commands | 42+ | Deployed | Command parsing, execution validation |
| Templates | 100+ | Available | Template selection accuracy, copy integrity |
| NFRs | 82 | Documented | NFR measurement protocol validation |
| Use Cases | 11 | Elaborated | Acceptance criteria validation |

---

## 4. In-Scope vs Out-of-Scope

### 4.1 In-Scope

**Functional Testing**:
- ✅ All 7 P0 use cases (UC-001, UC-002, UC-003, UC-004, UC-006, UC-008, UC-009, UC-011)
- ✅ Multi-agent orchestration workflows
- ✅ Framework-scoped workspace management (FID-007)
- ✅ Plugin deployment and rollback
- ✅ Traceability validation (requirements → code → tests)
- ✅ Security gate multi-tool orchestration
- ✅ Template selection and recommendation
- ✅ Test case generation from use cases

**Non-Functional Testing**:
- ✅ Performance benchmarking (all 22 performance NFRs)
- ✅ Security validation (18 security NFRs)
- ✅ Usability testing (13 usability NFRs)
- ✅ Accuracy validation (12 accuracy NFRs)
- ✅ Reliability testing (9 reliability NFRs)

**Infrastructure Testing**:
- ✅ Test infrastructure components (MockAgentOrchestrator, GitSandbox, etc.)
- ✅ CI/CD pipeline validation
- ✅ Cross-platform compatibility (Linux, macOS, WSL)

### 4.2 Out-of-Scope

**Deferred to P1/P2**:
- ❌ UC-005: Framework Self-Improvement (P1, meta-application)
- ❌ UC-007: Metrics Collection (P1, manual workaround acceptable)
- ❌ UC-010: Plugin Rollback (P1, git reset manual workaround)
- ❌ Metrics dashboard (P1, CLI output sufficient for MVP)
- ❌ Real-time monitoring (P2, no telemetry in MVP)

**External Systems**:
- ❌ Claude Code platform testing (external dependency)
- ❌ GitHub Actions platform testing (external dependency)
- ❌ Git platform testing (external dependency, assume correct)

**User Acceptance Testing**:
- ❌ UAT with external users (solo developer project, dogfooding only)
- ❌ Beta testing program (no formal program for MVP)

---

## 5. Test Approach

### 5.1 Test Pyramid Strategy

```
       /\
      /  \     E2E Tests (50% coverage, 30 scenarios)
     / 🔺 \    Focus: Full user workflows, CLI interactions
    /______\
   /        \  Integration Tests (70% coverage, 60 scenarios)
  /    🟡   \  Focus: Multi-component interactions
 /__________\
/            \ Unit Tests (80% coverage, 200+ scenarios)
/     🟢      \ Focus: Individual methods, edge cases
/______________\
```

**Rationale**: Maximize unit test coverage (fast, isolated, high coverage), moderate integration tests (workflow validation), selective E2E tests (critical paths only).

### 5.2 Test Levels

#### 5.2.1 Unit Testing (80% Coverage Target)

**Scope**: Individual methods, classes, pure functions

**Components**:
- Core Services: WorkspaceManager, TierFilter, RegistryManager, ContextBuilder, ManifestGenerator, CLIHandler
- Framework Services: WritingValidator, CodebaseAnalyzer, TraceabilityChecker, TemplateSelector, TestGenerator, SecurityGate

**Approach**:
- Test each public method with valid inputs, invalid inputs, edge cases
- Use mocks for external dependencies (filesystem, Git, agents)
- MockAgentOrchestrator for multi-agent workflows
- GitSandbox for Git operations
- FilesystemSandbox for file operations

**Tools**:
- Framework: node:test (built-in)
- Assertions: node:assert (built-in)
- Mocks: MockAgentOrchestrator, GitSandbox, GitHubAPIStub, FilesystemSandbox

**Examples**:
- `TierFilter.filterByTier()` - Test tier 1/2/3 filtering logic
- `RegistryManager.addPlugin()` - Test registry.json updates
- `WorkspaceManager.initialize()` - Test directory creation
- `ContextBuilder.buildContext()` - Test manifest merging

**Coverage Metric**: Line coverage ≥80% per NFR-QUAL-003

#### 5.2.2 Integration Testing (70% Coverage Target)

**Scope**: Multi-component interactions, service integration

**Workflows**:
- Plugin Deployment: CLIHandler → DeploymentManager → AgentDeployer → RegistryManager → FileSystem
- Context Loading: WorkspaceManager → TierFilter → ManifestLoader → ContextBuilder
- Traceability Validation: TraceabilityChecker → RequirementsLoader → CodebaseScanner → TestFileAnalyzer → CSVMatrixGenerator
- Security Gate: SecurityGate → SecretScanner → SASTTool → DependencyScanner → ReportGenerator

**Approach**:
- Test component interactions without mocking intermediate layers
- Use sandboxes for isolated test environments (GitSandbox, FilesystemSandbox)
- Validate data flow between components
- Test error propagation and recovery

**Tools**:
- Framework: node:test
- Sandboxing: GitSandbox (isolated Git repos), FilesystemSandbox (temporary directories)
- Fixtures: TestDataFactory (iteration backlogs, team profiles, spike reports)

**Examples**:
- Deploy 58 agents → Verify registry.json updated → Verify .claude/agents/ populated
- Initialize workspace → Load tier 1/2/3 manifests → Build merged context
- Scan requirements → Scan code → Scan tests → Generate CSV matrix
- Run secret scan + SAST + dependency scan → Generate security report

**Coverage Metric**: Component interaction coverage ≥70% per NFR-QUAL-003

#### 5.2.3 End-to-End Testing (50% Coverage Target)

**Scope**: Full user workflows, CLI interactions, multi-agent orchestration

**Scenarios** (30 critical paths):

**Deployment Scenarios** (10):
1. First-time project setup (`aiwg -new`)
2. Deploy SDLC framework (`aiwg -deploy-agents --mode sdlc`)
3. Deploy writing agents (`aiwg -deploy-agents --mode general`)
4. Deploy both modes (`aiwg -deploy-agents --mode both`)
5. Check plugin status (`aiwg -status`)
6. Update AIWG (`aiwg -update`)
7. Reinstall AIWG (`aiwg -reinstall`)
8. Multi-framework project (deploy sdlc, then future framework)
9. Rollback plugin installation (`git reset --hard {baseline}`)
10. Verify deployment on clean project (no .aiwg/, no .claude/)

**Workflow Scenarios** (15):
11. Create intake from codebase (UC-003: `intake-from-codebase .`)
12. Multi-agent documentation (UC-004: Primary Author → Reviewers → Synthesizer)
13. Automated traceability check (UC-006: `check-traceability .aiwg/traceability/`)
14. Template selection workflow (UC-008: Interactive selection)
15. Test case generation (UC-009: UC → 15-30 test cases)
16. Security gate validation (UC-011: Multi-tool scan)
17. AI pattern validation (UC-001: 2000-word document)
18. Framework self-improvement (UC-005: Meta-application)
19. Risk management cycle (identify → assess → mitigate)
20. Architecture evolution (ADR generation, SAD updates)
21. Phase transition (Inception → Elaboration)
22. Iteration planning (dual-track: Discovery + Delivery)
23. Gate check validation (phase exit criteria)
24. Knowledge transfer workflow (from → to member)
25. Incident response (triage → resolution → post-mortem)

**Performance Scenarios** (5):
26. Large codebase traceability (10,000 files)
27. Bulk agent deployment (58 agents <10s per NFR-PERF-002)
28. Concurrent validation (5 documents in parallel)
29. Incremental validation (git diff-based filtering)
30. Security scan on large repo (1,000 files <30s total)

**Approach**:
- Execute full workflows using real CLI commands
- Use temporary Git repos for isolation
- Validate expected outputs (files created, registry updated, reports generated)
- Measure performance against NFR targets

**Tools**:
- Framework: Bash scripts + node:test
- Isolation: GitSandbox, temporary directories
- Validation: File existence, JSON schema, performance metrics

**Coverage Metric**: Critical user path coverage ≥50% per NFR-QUAL-003

#### 5.2.4 Performance Testing

**Scope**: Validate all 22 performance NFRs

**P0 Performance NFRs** (10):
- NFR-PERF-001: Content Validation Time (<60s for 2000 words, p95)
- NFR-PERF-002: SDLC Deployment Time (<10s for 58 agents, p95)
- NFR-TRACE-01: Requirements Scan Time (<10s for 200 requirements)
- NFR-TRACE-02: Code Scan Time (<30s for 1,000 files)
- NFR-TRACE-03: Test Scan Time (<20s for 500 test files)
- NFR-TMPL-01: Template Catalog Search (<2s, p95)
- NFR-TMPL-02: Template Selection Time (<5min, p95)
- NFR-TEST-01: Test Generation Time (<10min for 100 requirements)
- NFR-SEC-PERF-01: Security Gate Validation (<10s, p95)
- NFR-TRACE-13: Real-Time Validation (<90s for full traceability)

**Approach**:
- Use PerformanceProfiler (from Test Infrastructure Specification)
- Measure 95th percentile latencies (100 runs for P1/P2, 1000 runs for P0 per NFR Measurement Protocols)
- Measure 95% confidence intervals
- Detect regressions (alert if >10% slower)
- Baseline measurement in Construction Week 1

**Tools**:
- PerformanceProfiler (custom, from Test Infrastructure Specification)
- Node.js `performance.now()` for high-precision timing
- Statistical aggregation (95th percentile calculation)

**Metrics**:
- p50, p95, p99 latencies
- Mean, median, standard deviation
- Throughput (operations/second)
- Memory usage (peak, average)

#### 5.2.5 Security Testing

**Scope**: Validate 18 security NFRs

**P0 Security NFRs**:
- NFR-SEC-001: Content Privacy (zero external API calls)
- NFR-SEC-003: File Permissions Security (match source)
- NFR-SEC-ACC-01: Attack Detection Accuracy (100% for known vectors)
- NFR-SEC-ACC-04: CVE Detection Accuracy (100% for Critical/High)
- NFR-SEC-COMP-02: P0 Threat Mitigation Coverage (100%)

**Approach**:
- Static analysis: Scan codebase for external API calls (ensure zero)
- File permission testing: Verify deployed files match source permissions
- Attack vector testing: Test known attack patterns (SQL injection, XSS, etc.)
- CVE scanning: Validate dependency scanner detects known CVEs
- Threat model coverage: Verify all P0 threats addressed

**Tools**:
- Secret scanning: detect-secrets, truffleHog (via SecurityGate)
- SAST: ESLint security plugin, custom static analysis
- Dependency scanning: npm audit, snyk (optional)
- Manual review: Code review for security anti-patterns

**Validation**:
- Zero external API calls (grep codebase for http://, https://, fetch, axios)
- File permissions preserved (compare source vs deployed)
- 100% known attack vector detection
- 100% Critical/High CVE detection

#### 5.2.6 Usability Testing

**Scope**: Validate 13 usability NFRs

**P0 Usability NFRs**:
- NFR-USE-001: AI Validation Learning Curve (1-2 cycles)
- NFR-USE-004: First-Time Setup Friction (<15 minutes)
- NFR-USE-005: Error Message Clarity (100% include remediation)
- NFR-TRACE-11: Report Clarity (100% actionable steps)
- NFR-TMPL-04: First-Time User Success Rate (85%+)

**Approach**:
- First-time user testing: Fresh project setup, measure time to first success
- Error message validation: Trigger all error paths, verify remediation steps included
- Report clarity testing: Generate reports, verify actionable steps present
- Learning curve testing: Track cycles to proficiency (1-2 cycles target)

**Validation**:
- Setup time <15min (measure from install to first artifact generated)
- 100% error messages include remediation steps
- 100% reports include actionable next steps
- 85%+ first-time template selection success

---

## 6. Test Deliverables

### 6.1 Test Plans

**Master Test Plan** (This Document):
- Overall testing strategy
- Coverage targets (80/70/50%)
- Test approach (pyramid, levels, types)
- Schedule and milestones

**Iteration Test Plans**:
- Construction Week 1-5: Iteration-specific test plans
- Focus: Components delivered that iteration
- Updated weekly based on progress

### 6.2 Test Case Specifications

**Total Test Cases**: 206 (from Requirements Traceability Matrix)

**Breakdown by Use Case**:
- TC-001: AI Pattern Validation (30 test cases) - Elaborated
- TC-002: Deploy SDLC Framework (30 test cases) - Pending
- TC-003: Intake from Codebase (30 test cases) - Pending
- TC-004: Multi-Agent Documentation (30 test cases) - Pending
- TC-005: Framework Self-Improvement (30 test cases) - Elaborated
- TC-006: Automated Traceability (25 test cases) - Pending
- TC-007: Metrics Collection (25 test cases) - Pending
- TC-008: Template Selection (10 test cases) - Pending
- TC-009: Test Templates (15 test cases) - Pending
- TC-010: Plugin Rollback (20 test cases) - Pending
- TC-011: Security Validation (18 test cases) - Pending

**Status**: 60 elaborated (TC-001, TC-005), 146 pending (Construction Week 1-2)

### 6.3 Test Scripts

**Unit Test Scripts**:
- `tests/workspace-manager.test.mjs`
- `tests/tier-filter.test.mjs`
- `tests/registry-manager.test.mjs`
- `tests/context-builder.test.mjs`
- `tests/manifest-generator.test.mjs`
- Additional scripts for each Framework Service component

**Integration Test Scripts**:
- `tests/integration/plugin-deployment.test.mjs`
- `tests/integration/context-loading.test.mjs`
- `tests/integration/traceability-validation.test.mjs`
- `tests/integration/security-gate.test.mjs`

**E2E Test Scripts**:
- `tests/e2e/first-time-setup.sh`
- `tests/e2e/deploy-sdlc-framework.sh`
- `tests/e2e/traceability-workflow.sh`
- `tests/e2e/security-validation.sh`

### 6.4 Test Reports

**Coverage Reports**:
- Unit test coverage report (HTML, generated by node:test --experimental-coverage)
- Integration test coverage report
- E2E test coverage report
- Combined coverage report (80/70/50% targets)

**Performance Reports**:
- NFR benchmark report (all 22 performance NFRs)
- Regression detection report (>10% slower alerts)
- Performance trend report (track over iterations)

**Security Reports**:
- Secret scan report (0 secrets found)
- SAST report (0 high/critical issues)
- Dependency scan report (0 Critical/High CVEs)
- Security gate summary report

**Traceability Reports**:
- Requirements coverage report (100% per NFR-QUAL-002)
- Test case linkage report (requirements → test cases)
- Orphan artifact report (0 orphans)

**Defect Reports**:
- Defect trend report (new, resolved, open, net change)
- Defect aging report (0-3 days, 4-7 days, 8-14 days, 15+ days)
- Defect severity distribution (Critical, High, Medium, Low)

---

## 7. Test Environment

### 7.1 Development Environment

**Platform**: Linux (Ubuntu 22.04 LTS, WSL2), macOS (12+)
**Hardware**: 4 cores, 8GB RAM, SSD (per NFR targets)
**Software**:
- Node.js 18+ (LTS)
- Git 2.20+
- Claude Code (for agent orchestration)
- VS Code (optional, for development)

### 7.2 Test Execution Environment

**Isolated Sandboxes**:
- **GitSandbox**: Temporary Git repositories for isolated testing
  - Auto-initialization (git init, git config)
  - Command execution (commit, branch, merge, reset)
  - Status inspection (git status, git log, git diff)
  - Auto-cleanup (rm -rf after test)

- **FilesystemSandbox**: Temporary directories for file operations
  - Auto-creation (mkdtemp)
  - Fixture copying (copy test fixtures to sandbox)
  - Path resolution (resolve paths relative to sandbox)
  - Auto-cleanup (rm -rf after test)

**Mock Services**:
- **MockAgentOrchestrator**: Simulates multi-agent workflows
  - Agent registration (register agents)
  - Execution latency simulation (configurable delays)
  - Failure injection (timeout, error scenarios)
  - Result collection (aggregate agent outputs)

- **GitHubAPIStub**: Mocks GitHub API for integration testing
  - MSW-based API stubbing (intercept HTTP requests)
  - PR operations (create, list, merge)
  - Issue operations (create, comment, close)
  - Rate limit simulation (429 responses)

### 7.3 CI/CD Environment

**GitHub Actions**:
- Workflow: `.github/workflows/test.yml` (to be created)
- Triggers: Pull requests, main branch pushes
- Jobs:
  - Unit tests (node:test --experimental-coverage)
  - Integration tests (node:test integration/)
  - E2E tests (bash e2e scripts)
  - Coverage report (upload to codecov or GitHub artifacts)
  - Performance benchmarks (track p95 latencies)

**Environments**:
- Matrix testing: Node.js 18, 20, 22 (LTS versions)
- OS matrix: Ubuntu latest, macOS latest
- Total: 6 environment combinations (3 Node.js × 2 OS)

### 7.4 Test Data

**Fixtures**:
- Sample projects (5-10 projects with varying complexity)
- Sample use cases (all 11 use cases with realistic content)
- Sample requirements (200 requirements in various formats)
- Sample code files (1,000 files with requirement ID comments)
- Sample test files (500 test files with test case IDs)
- Sample templates (subset of 100+ SDLC templates)

**Generated Test Data**:
- **TestDataFactory** (from Test Infrastructure Specification):
  - `createIterationBacklog(iterNum, storyCount)` - Generate iteration backlogs
  - `createTeamProfile(size, skills)` - Generate team profiles
  - `createSpikeReport(riskName, outcome)` - Generate spike reports
  - `createUseCase(id, complexity)` - Generate use case documents
  - `createNFR(category, priority)` - Generate NFR documents

---

## 8. Roles and Responsibilities

### 8.1 Test Team

| Role | Name | Responsibilities |
|------|------|------------------|
| **Test Architect** | Test Architect Agent | Overall test strategy, Master Test Plan, NFR validation framework |
| **Test Engineer** | Test Engineer Agent | Test case specification, test script implementation, execution |
| **Performance Engineer** | Performance Engineer Agent | NFR benchmarking, PerformanceProfiler, regression detection |
| **Security Auditor** | Security Auditor Agent | Security testing, SAST/DAST, vulnerability assessment |
| **Quality Assurance** | QA Lead | Test execution, defect tracking, quality metrics |
| **DevOps Engineer** | DevOps Engineer Agent | CI/CD setup, test automation, environment management |

### 8.2 Development Team

| Role | Responsibilities in Testing |
|------|----------------------------|
| **Software Implementer** | Unit test creation, component testing, bug fixes |
| **Architecture Designer** | Integration test design, component interaction validation |
| **Requirements Analyst** | Acceptance criteria validation, traceability verification |

### 8.3 Stakeholders

| Role | Responsibilities in Testing |
|------|----------------------------|
| **Project Manager** | Test schedule tracking, resource allocation, risk escalation |
| **Product Owner** | UAT coordination (dogfooding), acceptance sign-off |

---

## 9. Schedule and Milestones

### 9.1 Construction Phase Test Schedule (5 Weeks)

**Week 1** (Nov 4-8):
- ✅ Create Master Test Plan (this document)
- ✅ Create Test Infrastructure Specification (BLOCKER-001 resolved)
- ✅ Create NFR Measurement Protocols (BLOCKER-002 resolved)
- ⏳ Generate test case specifications (TC-002 through TC-011: 135 test cases)
- ⏳ Implement unit tests for Core Services (WorkspaceManager, TierFilter, etc.)
- ⏳ Establish performance baselines (measure P0 NFRs with PerformanceProfiler)

**Week 2** (Nov 11-15):
- Implement WritingValidator + unit tests (UC-001)
- Implement AgentOrchestrator + integration tests (UC-004)
- Implement TemplateSelector + tests (UC-008)
- Performance testing: Validate NFR-PERF-001, NFR-TMPL-01/02
- Security testing: Validate NFR-SEC-001 (zero external API calls)

**Week 3** (Nov 18-22):
- Implement CodebaseAnalyzer + tests (UC-003)
- Implement TraceabilityChecker + tests (UC-006)
- Integration testing: Context loading, plugin deployment
- Performance testing: Validate NFR-TRACE-01/02/03
- Usability testing: First-time setup friction (NFR-USE-004)

**Week 4** (Nov 25-29):
- Implement TestGenerator + tests (UC-009)
- Implement SecurityGate + tests (UC-011)
- E2E testing: Full workflows (deploy, trace, security, test gen)
- Performance testing: Validate NFR-TEST-01, NFR-SEC-PERF-01
- Security testing: Multi-tool orchestration, attack detection

**Week 5** (Dec 2-6):
- Final integration testing (all components)
- Complete E2E test suite (30 scenarios)
- Coverage validation (verify 80/70/50% targets met)
- Performance regression testing
- Test report generation (coverage, performance, security, traceability)
- Construction phase gate review (IOC Milestone)

### 9.2 Test Milestones

| Milestone | Date | Criteria | Status |
|-----------|------|----------|--------|
| **Test Infrastructure Ready** | Nov 4 | Test Infrastructure Specification complete, PerformanceProfiler ready | ✅ COMPLETE |
| **Test Plan Baselined** | Nov 4 | Master Test Plan approved, test case specs generated | ⏳ IN PROGRESS |
| **Unit Tests (80%)** | Nov 15 | 80% line coverage for Core + Framework Services | ⏳ PENDING |
| **Integration Tests (70%)** | Nov 22 | 70% component interaction coverage | ⏳ PENDING |
| **E2E Tests (50%)** | Nov 29 | 50% critical path coverage (15 of 30 scenarios) | ⏳ PENDING |
| **Performance Baseline** | Nov 8 | All P0 NFRs baselined with PerformanceProfiler | ⏳ PENDING |
| **Security Validation** | Nov 29 | All P0 security NFRs validated (zero external API calls, etc.) | ⏳ PENDING |
| **Construction Complete (IOC)** | Dec 6 | All P0 use cases implemented and tested, 80/70/50% coverage met | ⏳ PENDING |

---

## 10. Entry and Exit Criteria

### 10.1 Unit Testing

**Entry Criteria**:
- Component implementation complete (code checked into main)
- Component interface defined (public methods documented)
- Unit test template available (from test case specification)
- MockAgentOrchestrator, GitSandbox, FilesystemSandbox ready

**Exit Criteria**:
- ✅ 80% line coverage per NFR-QUAL-003
- ✅ All public methods tested (valid inputs, invalid inputs, edge cases)
- ✅ All tests passing (0 failures)
- ✅ No critical defects (High/Critical severity)
- ✅ Code review complete (Test Architect sign-off)

### 10.2 Integration Testing

**Entry Criteria**:
- All dependent components unit tested (80% coverage)
- Integration test environment ready (GitSandbox, FilesystemSandbox)
- Integration test scenarios defined (test case specifications)
- Test data available (TestDataFactory fixtures)

**Exit Criteria**:
- ✅ 70% component interaction coverage per NFR-QUAL-003
- ✅ All integration test scenarios passing
- ✅ Multi-component workflows validated
- ✅ Error propagation tested (graceful degradation per NFR-TRACE-09, NFR-SEC-REL-01)
- ✅ Performance acceptable (no regressions >10%)

### 10.3 E2E Testing

**Entry Criteria**:
- All components integrated (unit + integration tests passing)
- E2E test environment ready (real Git repos, CLI commands)
- E2E test scenarios defined (30 critical paths)
- Test data fixtures available (sample projects, requirements, code)

**Exit Criteria**:
- ✅ 50% critical path coverage per NFR-QUAL-003 (15 of 30 scenarios)
- ✅ All P0 user workflows validated (deploy, trace, security, test gen)
- ✅ Performance targets met (NFR-PERF-002: <10s deployment, NFR-TRACE-13: <90s validation)
- ✅ Usability targets met (NFR-USE-004: <15min setup, NFR-USE-005: 100% error remediation)
- ✅ No critical defects in user workflows

### 10.4 Performance Testing

**Entry Criteria**:
- Components implemented and functionally tested
- PerformanceProfiler ready (from Test Infrastructure Specification)
- Performance test scenarios defined (22 performance NFRs)
- Sample data available (2000-word documents, 200 requirements, 1000 code files, etc.)

**Exit Criteria**:
- ✅ All P0 performance NFRs validated (10 NFRs):
  - NFR-PERF-001: <60s content validation (p95)
  - NFR-PERF-002: <10s SDLC deployment (p95)
  - NFR-TRACE-01/02/03: <10s/<30s/<20s scans
  - NFR-TMPL-01/02: <2s/<5min template selection
  - NFR-TEST-01: <10min test generation
  - NFR-SEC-PERF-01: <10s security gate
  - NFR-TRACE-13: <90s real-time validation
- ✅ Performance baselines established (p50, p95, p99 latencies)
- ✅ No regressions >10% vs baseline
- ✅ Statistical significance validated (95% CI per NFR Measurement Protocols)

### 10.5 Security Testing

**Entry Criteria**:
- Security-relevant components implemented (SecurityGate, WritingValidator)
- Security tools available (detect-secrets, ESLint security, npm audit)
- Security test scenarios defined (18 security NFRs)
- Attack vector test data available (known SQL injection, XSS patterns)

**Exit Criteria**:
- ✅ All P0 security NFRs validated:
  - NFR-SEC-001: Zero external API calls (grep codebase, validate)
  - NFR-SEC-003: File permissions preserved (compare source vs deployed)
  - NFR-SEC-ACC-01: 100% known attack vector detection
  - NFR-SEC-ACC-04: 100% Critical/High CVE detection
  - NFR-SEC-COMP-02: 100% P0 threat mitigation coverage
- ✅ Security scan reports clean (0 secrets, 0 high/critical SAST issues, 0 Critical/High CVEs)
- ✅ Threat model validated (all P0 threats addressed)
- ✅ Security review complete (Security Architect sign-off)

---

## 11. Risk Management

### 11.1 Testing Risks

**TR-001: Test Infrastructure Gaps (RETIRED)**
- **Original Risk**: Missing test infrastructure blocks Construction
- **Mitigation**: Created Test Infrastructure Specification (12,847 words, BLOCKER-001)
- **Status**: RETIRED (6 mock classes specified: MockAgentOrchestrator, GitSandbox, GitHubAPIStub, FilesystemSandbox, PerformanceProfiler, TestDataFactory)

**TR-002: NFR Measurement Uncertainty (RETIRED)**
- **Original Risk**: Undefined NFR measurement protocols lead to inconsistent validation
- **Mitigation**: Created NFR Measurement Protocols (8,842 words, BLOCKER-002)
- **Status**: RETIRED (95th percentile, 95% CI, sample sizes defined for all 82 NFRs)

**TR-003: Test Data Catalog (DEFERRED)**
- **Original Risk**: Missing test data catalog blocks test execution
- **Mitigation**: Defer to Construction Week 1 (use TestDataFactory + fixtures for now)
- **Status**: DEFERRED (BLOCKER-003, acceptable for Week 1 start)

**TR-004: Coverage Target Feasibility (MONITORING)**
- **Risk**: 80/70/50% coverage targets may be unrealistic for Construction timeline
- **Probability**: Medium (ambitious targets)
- **Impact**: Medium (quality risk if coverage too low)
- **Mitigation**:
  - Focus on P0 components first (WritingValidator, TraceabilityChecker, SecurityGate)
  - Defer P1/P2 component testing to post-MVP
  - Use TestDataFactory to accelerate test data generation
  - Prioritize critical paths over edge cases
- **Status**: Monitor weekly, adjust targets if needed

**TR-005: Performance Test Environment Variability (MITIGATED)**
- **Risk**: Different hardware (HDD vs SSD, 4 cores vs 8 cores) impacts NFR validation
- **Probability**: Medium (developers use varied hardware)
- **Impact**: Medium (false NFR failures)
- **Mitigation**:
  - Document hardware assumptions (4 cores, 8GB RAM, SSD per NFRs)
  - Add environment validation (warn if .aiwg/ on HDD)
  - Use PerformanceProfiler normalization (adjust for hardware)
  - Accept 10% variance (only alert if >10% regression)
- **Status**: MITIGATED (documented in NFR Measurement Protocols)

**TR-006: CI/CD Pipeline Flakiness (MONITORING)**
- **Risk**: Flaky tests in CI/CD pipeline slow down development
- **Probability**: Medium (common in E2E tests)
- **Impact**: High (blocks PR merges)
- **Mitigation**:
  - Isolate tests with GitSandbox, FilesystemSandbox
  - Retry flaky tests (max 3 retries)
  - Track flaky tests (mark as "flaky" if fails intermittently)
  - Fix root cause (race conditions, timing dependencies)
- **Status**: Monitor test execution, track flaky test rate

### 11.2 Quality Risks

**QR-001: Insufficient Test Coverage (MONITORING)**
- **Risk**: Missing test coverage leads to undetected bugs
- **Probability**: Low (comprehensive test plan)
- **Impact**: High (production defects)
- **Mitigation**:
  - Use coverage tools (node:test --experimental-coverage)
  - Review uncovered code paths (prioritize critical logic)
  - Add tests for edge cases found in code review
  - Track coverage trend (alert if drops below 80/70/50%)
- **Status**: Monitor coverage reports weekly

**QR-002: Late Defect Discovery (MONITORING)**
- **Risk**: Defects discovered late in Construction (Week 4-5) delay delivery
- **Probability**: Medium (complex multi-agent workflows)
- **Impact**: High (schedule risk)
- **Mitigation**:
  - Continuous testing (test as you implement)
  - Daily test execution (catch defects early)
  - Integration tests early (Week 2, not Week 4)
  - E2E tests in parallel with development (Week 3-4)
- **Status**: Monitor defect discovery trend (track when defects found)

### 11.3 Schedule Risks

**SR-001: Test Case Specification Delay (MONITORING)**
- **Risk**: Generating 135 test case specifications (TC-002 through TC-011) delays Construction Week 1 start
- **Probability**: Medium (large effort: 20-30 hours)
- **Impact**: Medium (delays unit test implementation)
- **Mitigation**:
  - Prioritize P0 test case specs first (80 test cases)
  - Use TestDataFactory to generate sample test data
  - Defer P1/P2 test case specs to post-MVP
  - Parallelize test case generation (multiple agents)
- **Status**: Monitor Week 1 progress, adjust if behind schedule

**SR-002: Performance Benchmarking Overhead (MITIGATED)**
- **Risk**: Benchmarking all 22 performance NFRs consumes excessive time
- **Probability**: Low (PerformanceProfiler automates measurement)
- **Impact**: Medium (delays other testing activities)
- **Mitigation**:
  - Focus on P0 NFRs first (10 NFRs, baseline in Week 1)
  - Defer P1/P2 NFR benchmarking to post-MVP
  - Automate benchmarking in CI/CD (run nightly)
  - Use PerformanceProfiler for statistical aggregation (saves manual analysis time)
- **Status**: MITIGATED (PerformanceProfiler ready, P0 focus defined)

---

## 12. Metrics and Reporting

### 12.1 Test Execution Metrics

**Tracked Metrics**:
- **Test Case Count**: Total, executed, passed, failed, blocked
- **Test Pass Rate**: (Passed / Executed) × 100%
- **Defect Density**: Defects per KLOC (thousand lines of code)
- **Defect Trend**: New, resolved, open, net change (weekly)
- **Test Execution Time**: Total time to run all tests (unit, integration, E2E)

**Targets**:
- Test Pass Rate: >95% (high quality)
- Defect Density: <5 defects per KLOC (industry standard for good quality)
- Test Execution Time: <15 minutes total (fast feedback)

**Reporting Cadence**: Daily (test execution logs), Weekly (summary reports)

### 12.2 Coverage Metrics

**Tracked Metrics**:
- **Line Coverage**: Lines executed / Total lines
- **Branch Coverage**: Branches executed / Total branches
- **Function Coverage**: Functions executed / Total functions
- **Component Coverage**: Components tested / Total components

**Targets** (per NFR-QUAL-003):
- Unit Test Coverage: ≥80% line coverage
- Integration Test Coverage: ≥70% component interaction coverage
- E2E Test Coverage: ≥50% critical path coverage

**Reporting Cadence**: Weekly (coverage reports from CI/CD)

### 12.3 Performance Metrics

**Tracked Metrics** (per NFR Measurement Protocols):
- **p50 Latency**: Median response time
- **p95 Latency**: 95th percentile response time (NFR target)
- **p99 Latency**: 99th percentile response time
- **Mean Latency**: Average response time
- **Throughput**: Operations per second
- **Memory Usage**: Peak and average memory consumption

**Targets**: All P0 performance NFRs met (10 NFRs with <60s, <10s, <30s targets)

**Reporting Cadence**: Weekly (NFR benchmark reports), Per-commit (CI/CD performance checks)

### 12.4 Defect Metrics

**Tracked Metrics**:
- **Defect Count by Severity**: Critical, High, Medium, Low
- **Defect Aging**: 0-3 days (fresh), 4-7 days (aging), 8-14 days (stale), 15+ days (very stale)
- **Defect Closure Rate**: Defects resolved per week
- **Defect Escape Rate**: Defects found in production (post-release)

**Targets**:
- Zero Critical defects at Construction exit
- <5 High defects at Construction exit
- Defect closure rate > defect discovery rate (shrinking backlog)
- Defect escape rate <2% (high quality releases)

**Reporting Cadence**: Weekly (defect trend reports)

### 12.5 Quality Gate Metrics

**Tracked Metrics** (per Phase Gate Criteria):
- **Requirements Traceability Coverage**: (Traced requirements / Total requirements) × 100%
- **Test Coverage**: Unit (80%), Integration (70%), E2E (50%)
- **Critical Defects**: Count of Critical severity defects
- **NFR Validation**: % of P0 NFRs validated and passing
- **Security Validation**: Zero external API calls, 0 secrets, 0 Critical/High CVEs

**Targets**:
- Requirements Traceability: 100% per NFR-QUAL-002
- Test Coverage: 80/70/50% per NFR-QUAL-003
- Critical Defects: 0
- NFR Validation: 100% of P0 NFRs passing
- Security Validation: All P0 security NFRs passing

**Reporting Cadence**: Per milestone (Construction exit, IOC gate review)

---

## 13. Tools and Automation

### 13.1 Test Frameworks

**Unit Testing**:
- Framework: node:test (Node.js built-in, v18+)
- Assertions: node:assert (Node.js built-in)
- Coverage: node:test --experimental-coverage (built-in coverage tool)
- Rationale: Zero external dependencies per ADR-010

**Integration Testing**:
- Framework: node:test
- Sandboxing: GitSandbox, FilesystemSandbox (custom, from Test Infrastructure Specification)
- Rationale: Isolate tests from system state

**E2E Testing**:
- Framework: Bash scripts + node:test
- Isolation: Temporary Git repos, temporary directories
- Rationale: Test real CLI interactions

### 13.2 Test Infrastructure (Custom Components)

**MockAgentOrchestrator** (from Test Infrastructure Specification):
- Purpose: Simulate multi-agent workflows for testing
- Features:
  - Agent registration (`registerAgent(id, role, tools)`)
  - Execution latency simulation (configurable delays)
  - Failure injection (timeout, error scenarios)
  - Result collection (`collectResults()`)
- Usage: UC-004 multi-agent documentation testing

**GitSandbox** (from Test Infrastructure Specification):
- Purpose: Isolated Git operations for testing
- Features:
  - Auto-initialization (`git init`, `git config`)
  - Command execution (`exec('git commit -m "..."')`)
  - Status inspection (`getStatus()`, `getLog()`)
  - Auto-cleanup (`cleanup()` removes temp repo)
- Usage: Plugin deployment, rollback, traceability testing

**GitHubAPIStub** (from Test Infrastructure Specification):
- Purpose: Mock GitHub API for integration testing
- Features:
  - MSW-based HTTP stubbing (intercept requests)
  - PR operations (`createPR()`, `listPRs()`, `mergePR()`)
  - Issue operations (`createIssue()`, `commentIssue()`)
  - Rate limit simulation (429 responses)
- Usage: GitHub integration testing (PR creation, issue tracking)

**FilesystemSandbox** (from Test Infrastructure Specification):
- Purpose: Isolated filesystem operations for testing
- Features:
  - Auto-creation (`mkdtemp()` creates temp directory)
  - Fixture copying (`copyFixture('sample-project')`)
  - Path resolution (`resolvePath('relative/path')`)
  - Auto-cleanup (`cleanup()` removes temp directory)
- Usage: File operations, deployment, manifest generation testing

**PerformanceProfiler** (from Test Infrastructure Specification):
- Purpose: High-precision performance measurement for NFR validation
- Features:
  - High-precision timing (`performance.now()`, nanosecond precision)
  - Statistical aggregation (p50, p95, p99, mean, stddev)
  - Regression detection (alert if >10% slower than baseline)
  - Sample size recommendations (100 for P1/P2, 1000 for P0)
- Usage: Benchmark all 22 performance NFRs

**TestDataFactory** (from Test Infrastructure Specification):
- Purpose: Generate test fixtures for various SDLC artifacts
- Features:
  - `createIterationBacklog(iterNum, storyCount)` - Generate iteration backlogs
  - `createTeamProfile(size, skills)` - Generate team profiles
  - `createSpikeReport(riskName, outcome)` - Generate spike reports
  - `createUseCase(id, complexity)` - Generate use case documents
  - `createNFR(category, priority)` - Generate NFR documents
- Usage: Integration and E2E testing (generate realistic test data)

### 13.3 Security Testing Tools

**Secret Scanning**:
- Tools: detect-secrets, truffleHog
- Integration: SecurityGate orchestration
- Validation: 0 secrets found per NFR-SEC-ACC-03

**Static Analysis (SAST)**:
- Tools: ESLint with security plugins
- Integration: SecurityGate orchestration
- Validation: 0 high/critical issues per NFR-SEC-PERF-03

**Dependency Scanning**:
- Tools: npm audit, snyk (optional)
- Integration: SecurityGate orchestration
- Validation: 0 Critical/High CVEs per NFR-SEC-ACC-04

**Attack Vector Testing**:
- Tools: Custom attack pattern database (SQL injection, XSS, etc.)
- Integration: SecurityGate validation
- Validation: 100% known attack detection per NFR-SEC-ACC-01

### 13.4 CI/CD Integration

**GitHub Actions Workflow** (`.github/workflows/test.yml`):
```yaml
name: Test Suite

on:
  pull_request:
  push:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm test -- --experimental-coverage
      - run: npm run test:coverage-check  # Verify 80% target

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm run test:integration
      - run: npm run test:integration-coverage-check  # Verify 70%

  e2e-tests:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: bash tests/e2e/run-all.sh

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm run test:performance
      - run: npm run test:regression-check  # Alert if >10% slower

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit
      - run: npm run test:security
```

---

## 14. Approvals

### 14.1 Approval Criteria

**Master Test Plan Approval Criteria**:
- [✓] All 14 template sections complete
- [✓] Test objectives aligned with NFR-QUAL-003 (80/70/50% coverage)
- [✓] Test approach defined (pyramid, levels, types)
- [✓] Test infrastructure validated (BLOCKER-001, BLOCKER-002 resolved)
- [✓] Entry/exit criteria defined for all test levels
- [✓] Schedule aligned with Construction phase (5 weeks)
- [✓] Risks identified and mitigated
- [✓] Tools and automation specified

### 14.2 Approval Sign-Off

**Master Test Plan Status**: BASELINED
**Approval Date**: 2025-10-22
**Approved By**: Multi-Agent Review Team

**Reviewers**:
- Test Architect (Primary Author) ✓
- Performance Engineer (NFR validation framework review) ✓
- Security Auditor (Security testing review) ✓
- Test Engineer (Test case feasibility review) ✓
- Project Manager (Schedule and resource review) ✓

**Construction Phase Readiness**: APPROVED (Test Plan Baselined)

**Next Review**: Construction Week 3 (validate progress against coverage targets)

---

**END OF DOCUMENT**