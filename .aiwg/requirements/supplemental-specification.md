# Supplemental Specification - AI Writing Guide (AIWG) Project

**Document Type**: Non-Functional Requirements Specification
**Project**: AI Writing Guide - SDLC Framework Plugin System
**Version**: 1.1
**Status**: BASELINED
**Date**: 2025-10-19
**Phase**: Elaboration (Week 4)

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-18 | Initial baseline with framework NFRs | Requirements Documenter |
| 1.1 | 2025-10-19 | Added 48 NFRs from Elaboration Week 4 requirements workshop with P0/P1/P2 prioritization | Requirements Documenter |

**Version 1.1 Changes**:
- Added 48 NFRs identified during requirements workshop (UC-001 through UC-011 analysis)
- Applied P0/P1/P2 prioritization based on Product Strategist recommendations
- Specified testing approach for each NFR (Automated, Manual, Statistical)
- Enhanced traceability linking NFRs to use cases, components, and test cases
- Organized NFRs by category: Performance (10), Throughput (3), Accuracy (6), Quality (4), Completeness (5), Security (4), Reliability (3), Usability (6), Data Retention (3), Freshness (1), Scalability (4)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Performance Requirements](#2-performance-requirements)
3. [Throughput Requirements](#3-throughput-requirements)
4. [Accuracy Requirements](#4-accuracy-requirements)
5. [Quality Requirements](#5-quality-requirements)
6. [Completeness Requirements](#6-completeness-requirements)
7. [Security Requirements](#7-security-requirements)
8. [Reliability Requirements](#8-reliability-requirements)
9. [Usability Requirements](#9-usability-requirements)
10. [Data Retention Requirements](#10-data-retention-requirements)
11. [Freshness Requirements](#11-freshness-requirements)
12. [Scalability Requirements](#12-scalability-requirements)
13. [Regulatory and Compliance Requirements](#13-regulatory-and-compliance-requirements)
14. [Quality Metrics and Service Level Indicators](#14-quality-metrics-and-service-level-indicators)
15. [NFR Prioritization Summary](#15-nfr-prioritization-summary)
16. [Traceability Matrix](#16-traceability-matrix)
17. [References](#17-references)

---

## 1. Introduction

### 1.1 Purpose

This Supplemental Specification defines all **non-functional requirements (NFRs)** for the AI Writing Guide (AIWG) project. These requirements complement functional requirements captured in use case specifications (UC-001 through UC-012) by specifying quality attributes, performance targets, security controls, usability standards, and compliance obligations.

**New in Version 1.1**: This update incorporates 48 NFRs extracted during Elaboration Week 4 requirements workshop, providing comprehensive coverage of all use cases with prioritized implementation roadmap.

### 1.2 Scope

This document covers NFRs for:

- **Writing Quality Framework**: AI pattern detection, content validation, authenticity scoring
- **SDLC Framework**: 58 agents, 42+ commands, multi-agent orchestration, plugin system
- **CLI Tooling**: Installation, deployment, project scaffolding
- **Infrastructure**: GitHub repository, CI/CD pipelines, documentation generation
- **Workspace Management**: Framework-scoped context loading, tier-based filtering (FID-007)

**Out of Scope**: Functional requirements (captured in use case specifications), implementation details (captured in Software Architecture Document).

### 1.3 Intended Audience

- **Project Manager**: Resource planning, schedule validation, risk assessment
- **Architecture Designer**: Architecture trade-off decisions, technology selection
- **Test Architect**: Test strategy development, validation criteria, coverage targets
- **Security Architect**: Security control design, threat modeling, compliance validation
- **Requirements Analyst**: Requirements traceability, acceptance criteria definition
- **Stakeholders**: Quality expectations, performance commitments, compliance assurance

### 1.4 Document Organization

Sections 2-12 define NFR categories (Performance, Throughput, Accuracy, Quality, Completeness, Security, Reliability, Usability, Data Retention, Freshness, Scalability). Each section provides:

- **Category Overview**: Why this quality attribute matters for AIWG
- **Specific Requirements**: Measurable targets with requirement IDs (NFR-XXX-##)
- **Priority Classification**: P0 (Make-or-Break for MVP), P1 (High Value, Post-MVP), P2 (Nice-to-Have, Future)
- **Rationale**: Business justification for each target
- **Testing Approach**: Automated, Manual, or Statistical validation methodology
- **Traceability**: Links to use cases, architecture components, test cases, and design decisions

Section 13 defines regulatory and compliance NFRs. Section 14 defines quality metrics and Service Level Indicators (SLIs). Section 15 summarizes NFR prioritization strategy. Section 16 provides comprehensive traceability matrix.

### 1.5 Profile Context

**Current Profile**: MVP transitioning to Production (from Solution Profile document)

**Priority Weights**:
- Delivery speed: 40% (ship-now mindset, validate assumptions fast)
- Cost efficiency: 20% (solo developer, time-constrained)
- Quality/security: 20% (accepting technical debt short-term, will increase post-validation)
- Reliability/scale: 20% (pre-launch, 0 users currently, scale not yet concern)

**Implications for NFRs**:
- Performance targets set for current scale (1-10 users), not enterprise scale (1000+ users)
- Security controls appropriate for open-source documentation project (no PII, no sensitive data)
- Testing coverage targets 60-80% (not 95%+ like regulated systems)
- Monitoring minimal (GitHub metrics only, no runtime telemetry)

**Transition Plan**: When AIWG reaches Production profile (6 months, 100+ users, 2-3 contributors), NFR targets will be reassessed:
- Quality/security priority increases to 40-45%
- Performance targets tighten (p95 → p99 latencies)
- Testing coverage increases to 80-95%
- Monitoring maturity increases (runtime metrics, alerting, SLOs)

### 1.6 NFR Prioritization Framework

**Priority Definitions** (established during Elaboration Week 4 requirements workshop):

| Priority | Criteria | Target Release | Rationale |
|----------|----------|----------------|-----------|
| **P0 (Make-or-Break)** | Enterprise blocker if missing, direct user impact, competitive disadvantage | MVP (Iterations 1-5) | Must have for MVP launch, core value delivery |
| **P1 (High Value)** | Significant user benefit, competitive advantage, quality enabler | Version 1.1 (3 months post-MVP) | High-value enhancements, deferred to reduce MVP scope |
| **P2 (Nice-to-Have)** | Incremental improvement, edge case coverage, polish | Version 2.0+ (Backlog) | Nice-to-have features, optimization opportunities |

**NFR Distribution**:
- **P0**: 12 NFRs (25% of total) - Security, Usability, Performance, Accuracy
- **P1**: 18 NFRs (37.5% of total) - Quality, Completeness, Security, Usability
- **P2**: 18 NFRs (37.5% of total) - Throughput, Reliability, Data Retention, Scalability

**Strategic Rationale**: Focus MVP on 12 "make-or-break" NFRs covering security, usability, and performance. Defer 36 NFRs (P1/P2) to accelerate time-to-market while maintaining core value proposition.

---

## 2. Performance Requirements

### 2.1 Overview

Performance requirements ensure AIWG tools remain responsive during normal usage, avoiding workflow interruptions that erode user confidence. As a documentation and tooling project (not runtime service), performance focuses on CLI responsiveness, agent orchestration speed, and document generation throughput.

**Performance Philosophy**: "Fast enough to stay out of the way" - users should spend time thinking about content, not waiting for tools.

**Priority Focus**: P0 NFRs target user-facing operations (validation, deployment, analysis). P1 NFRs target multi-agent workflows and advanced features.

---

### NFR-PERF-001: Content Validation Time [P0]

**Description**: AI pattern validation completes within acceptable user workflow tolerance.

**Rationale**: Content validation is frequent user operation. Delays >60 seconds interrupt writing flow, causing users to abandon validation mid-task.

**Measurement Criteria**:
- **Target**: <60 seconds for 2000-word documents (95th percentile)
- **Measurement Methodology**: Benchmark test with 2000-word fixture documents, 100 runs, exclude top/bottom 5% outliers, report 95th percentile
- **Baseline**: 45 seconds (typical), 60 seconds (threshold)

**Testing Approach**: **Automated** - Performance benchmarking with Node.js `performance.now()` timer

**Priority**: **P0** - User workflow interruption if exceeded, direct impact on user experience

**Traceability**:
- **Source**: UC-001: Validate AI-Generated Content (AC-001, main flow)
- **Test Cases**: TC-001-015 (performance validation)
- **Components**: WritingValidator, PatternDetector (SAD Section 5.1)
- **ADRs**: None

**Target Value**: <60 seconds (p95) for 2000-word documents

**Current Baseline**: TBD (establish baseline in Construction Week 1)

**Implementation Notes**:
- Use incremental pattern matching (avoid reprocessing entire document)
- Cache pattern database after first load (avoid re-parsing YAML)
- Parallelize pattern detection across sections (chunk document)

---

### NFR-PERF-002: SDLC Deployment Time [P0]

**Description**: Framework deployment completes quickly to minimize first-time setup friction.

**Rationale**: First impression matters. Slow deployment (>10s) creates perception of heavyweight tooling, reducing adoption.

**Measurement Criteria**:
- **Target**: <10 seconds for 58 agents + 45 commands deployment (95th percentile)
- **Measurement Methodology**: Timed deployment execution from `aiwg -deploy-agents --mode sdlc` invocation to completion, 100 runs, report p95
- **Baseline**: 7 seconds (typical), 10 seconds (threshold)

**Testing Approach**: **Automated** - Shell time command or custom timer in deployment script

**Priority**: **P0** - First-time setup friction, onboarding conversion rate impact

**Traceability**:
- **Source**: UC-002: Deploy SDLC Framework to Existing Project (AC-001, main flow)
- **Test Cases**: TC-002-015 (performance validation)
- **Components**: CLI entry point, deploy-agents.mjs (SAD Section 2.1)
- **ADRs**: ADR-006 (Plugin Rollback Strategy)

**Target Value**: <10 seconds (p95) for 58 agents + 45 commands

**Current Baseline**: 7 seconds (measured on reference hardware: 4 cores @ 2.5 GHz, 8GB RAM, SSD)

**Implementation Notes**:
- Parallelize file copy operations (concurrent writes)
- Use filesystem streaming (avoid buffering entire agent files in memory)
- Skip CLAUDE.md update if no changes detected (checksum comparison)

---

### NFR-PERF-003: Codebase Analysis Time [P0]

**Description**: Existing codebase analysis completes within acceptable brownfield onboarding tolerance.

**Rationale**: Brownfield projects (existing codebases) are high-value adoption target. Slow analysis (>5 minutes) blocks onboarding, users abandon mid-setup.

**Measurement Criteria**:
- **Target**: <5 minutes for 1000-file repositories (95th percentile)
- **Measurement Methodology**: Benchmark test with 1000-file fixture repository, 50 runs, report p95
- **Baseline**: 3 minutes (typical), 5 minutes (threshold)

**Testing Approach**: **Automated** - `intake-from-codebase` command with timer

**Priority**: **P0** - Brownfield adoption blocker if slow, impacts target market (existing projects)

**Traceability**:
- **Source**: UC-003: Analyze Existing Codebase for Intake (AC-001, main flow)
- **Test Cases**: TC-003-015 (performance validation)
- **Components**: IntakeCoordinator, CodebaseAnalyzer (SAD Section 5.2)
- **ADRs**: None

**Target Value**: <5 minutes (p95) for 1000-file repositories

**Current Baseline**: TBD (establish baseline in Construction Week 2)

**Implementation Notes**:
- Parallelize file tree traversal (concurrent directory reads)
- Skip node_modules/, .git/, .aiwg/ directories (reduce filesystem I/O)
- Use heuristic sampling for large codebases (analyze 10% representative files)

---

### NFR-PERF-004: Multi-Agent Workflow Completion [P1]

**Description**: Comprehensive artifact generation workflows complete within productivity tolerance.

**Rationale**: Multi-agent workflows (SAD generation) are productivity multiplier. 15-20 minutes acceptable for comprehensive artifacts (vs hours manually).

**Measurement Criteria**:
- **Target**: 15-20 minutes for SAD + reviews (wall-clock time)
- **Measurement Methodology**: End-to-end multi-agent workflow timer (orchestrator logs with timestamp deltas)
- **Baseline**: 18 minutes (typical), 20 minutes (threshold)

**Testing Approach**: **Automated** - Orchestrator workflow timer with mock agents

**Priority**: **P1** - Productivity impact, but acceptable baseline (15-20 min still faster than manual)

**Traceability**:
- **Source**: UC-004: Multi-Agent Workflows (AC-001, main flow)
- **Test Cases**: TC-004-015 (performance validation)
- **Components**: CoreOrchestrator, multi-agent coordination (SAD Section 4.2)
- **ADRs**: None

**Target Value**: 15-20 minutes for SAD generation + 4 parallel reviews + synthesis

**Current Baseline**: TBD (establish baseline in Construction Week 3)

**Implementation Notes**:
- Launch parallel reviewers in single message (multiple Task tool calls)
- Chunk large artifacts if context window exceeded (10,000-word limit)
- Set timeout thresholds: 30 minutes for full workflow

---

### NFR-PERF-005: Traceability Validation Time [P1]

**Description**: Automated traceability validation completes within enterprise project tolerance.

**Rationale**: Enterprise projects have 10,000+ nodes (requirements, code, tests). Validation >90s degrades usability, users revert to manual spot-checks.

**Measurement Criteria**:
- **Target**: <90 seconds for 10,000+ node graphs (95th percentile)
- **Measurement Methodology**: Graph algorithm profiler with 10,000-node fixture
- **Baseline**: 60 seconds (typical), 90 seconds (threshold)

**Testing Approach**: **Automated** - Graph traversal performance test

**Priority**: **P1** - Enterprise scale feature, deferred to post-MVP (MVP targets smaller projects)

**Traceability**:
- **Source**: UC-006: Automated Traceability Validation (AC-001, main flow)
- **Test Cases**: TC-006-015 (performance validation)
- **Components**: TraceabilityEngine (SAD Section 5.3)
- **ADRs**: None

**Target Value**: <90 seconds (p95) for 10,000+ node graphs

**Current Baseline**: TBD (establish baseline in Construction Week 4, after traceability implementation)

**Implementation Notes**:
- Use NetworkX sparse graph representation (CSR format)
- Implement incremental graph updates (avoid full rebuilds)
- Parallelize graph traversal algorithms (depth-first search on subgraphs)

---

### NFR-PERF-006: Metrics Collection Overhead [P1]

**Description**: Observability metrics collection has negligible performance impact.

**Rationale**: Metrics (velocity, test coverage, artifact counts) valuable for retrospectives. However, >5% overhead slows development, users disable metrics.

**Measurement Criteria**:
- **Target**: <5% performance impact (comparison: metrics enabled vs disabled)
- **Measurement Methodology**: A/B benchmark comparison (e.g., 100s baseline vs 105s with metrics = 5% overhead)
- **Baseline**: 2% overhead (typical), 5% overhead (threshold)

**Testing Approach**: **Automated** - Benchmark harness with metrics toggle

**Priority**: **P1** - Observability feature, deferred to FID-002 (Version 1.1)

**Traceability**:
- **Source**: UC-007: Collect and Visualize Metrics (AC-001, main flow)
- **Test Cases**: TC-007-015 (performance validation)
- **Components**: MetricsCollector (SAD Section 5.3)
- **ADRs**: None

**Target Value**: <5% performance impact on development workflows

**Current Baseline**: TBD (establish baseline in Version 1.1, FID-002 implementation)

**Implementation Notes**:
- Use async metrics collection (non-blocking background writes)
- Batch metric writes (avoid frequent filesystem I/O)
- Use sampling (collect metrics every Nth operation, not every operation)

---

### NFR-PERF-007: Template Selection Time [P1]

**Description**: Intelligent template recommendation completes quickly to accelerate onboarding.

**Rationale**: Template selection guides reduce onboarding friction. Recommendation >2 minutes frustrates users, who prefer manual selection.

**Measurement Criteria**:
- **Target**: <2 minutes to recommend template pack (95th percentile)
- **Measurement Methodology**: `intake-wizard` command with timer (from invocation to recommendation display)
- **Baseline**: 90 seconds (typical), 120 seconds (threshold)

**Testing Approach**: **Automated** - Template recommendation execution timer

**Priority**: **P1** - Onboarding enhancement, deferred to FID-003 (Version 1.1)

**Traceability**:
- **Source**: UC-008: Template Selection Guides (AC-001, main flow)
- **Test Cases**: TC-008-015 (performance validation)
- **Components**: TemplateSelector (SAD Section 2.1)
- **ADRs**: None

**Target Value**: <2 minutes (p95) for template pack recommendation

**Current Baseline**: TBD (establish baseline in Version 1.1, FID-003 implementation)

**Implementation Notes**:
- Cache template metadata (avoid re-parsing YAML on every invocation)
- Use heuristic scoring (fast rule-based matching, not ML models)
- Limit recommendation set (top 3 templates, not exhaustive search)

---

### NFR-PERF-008: Test Suite Generation Time [P2]

**Description**: Automated test suite generation completes within productivity tolerance.

**Rationale**: Test generation is productivity multiplier (manual test writing takes days). <10 minutes acceptable for comprehensive suite.

**Measurement Criteria**:
- **Target**: <10 minutes for full test suite generation (unit + integration + E2E)
- **Measurement Methodology**: Test Engineer agent execution timer (from invocation to completion)
- **Baseline**: 7 minutes (typical), 10 minutes (threshold)

**Testing Approach**: **Automated** - Test generation workflow timer

**Priority**: **P2** - Nice-to-have feature, deferred to FID-004 enhancement (Version 2.0)

**Traceability**:
- **Source**: UC-009: Generate Test Templates (AC-001, main flow)
- **Test Cases**: TC-009-015 (performance validation)
- **Components**: TestEngineer agent (SAD Section 5.1)
- **ADRs**: None

**Target Value**: <10 minutes (p95) for full test suite generation

**Current Baseline**: TBD (establish baseline in FID-004 implementation)

**Implementation Notes**:
- Generate tests in parallel (unit, integration, E2E simultaneously)
- Use template-based generation (avoid computationally expensive analysis)
- Cache test fixtures (avoid regenerating common test data)

---

### NFR-PERF-009: Plugin Rollback Time [P2]

**Description**: Plugin rollback completes nearly instantly to minimize disruption.

**Rationale**: Rollback is error recovery mechanism. Slow rollback (>5s) prolongs user frustration after installation failure.

**Measurement Criteria**:
- **Target**: <5 seconds (95th percentile)
- **Measurement Methodology**: `performance.now()` timer with millisecond precision
- **Baseline**: 2 seconds (typical), 5 seconds (threshold)

**Testing Approach**: **Automated** - Rollback execution timer

**Priority**: **P2** - Risk mitigation feature, deferred to FID-005 (Version 2.0)

**Traceability**:
- **Source**: UC-010: Plugin Rollback (AC-001, main flow)
- **Test Cases**: TC-010-015 (performance validation)
- **Components**: PluginManager (SAD Section 5.1)
- **ADRs**: ADR-006 (Plugin Rollback Strategy - reset + redeploy)

**Target Value**: <5 seconds (p95) for plugin rollback

**Current Baseline**: TBD (establish baseline in FID-005 implementation)

**Implementation Notes**:
- Use filesystem reset (delete plugin directory, restore backup)
- Avoid expensive validation (rollback assumes backup integrity)
- Use parallel file operations (concurrent deletion + restoration)

---

### NFR-PERF-010: Security Validation Time [P2]

**Description**: Pre-installation security validation completes quickly to avoid installation friction.

**Rationale**: Security scanning is trust builder. However, >10s delay creates perception of heavyweight security, reducing adoption.

**Measurement Criteria**:
- **Target**: <10 seconds per plugin (95th percentile)
- **Measurement Methodology**: Security scanner profiler (from scan invocation to completion)
- **Baseline**: 5 seconds (typical), 10 seconds (threshold)

**Testing Approach**: **Automated** - Security scan execution timer

**Priority**: **P2** - Security feature, deferred to FID-006 Phase 3 (Version 2.0)

**Traceability**:
- **Source**: UC-011: Validate Plugin Security (AC-001, main flow)
- **Test Cases**: TC-011-015 (performance validation)
- **Components**: PluginSandbox, SecurityScanner (SAD Section 5.1)
- **ADRs**: None

**Target Value**: <10 seconds (p95) per plugin security scan

**Current Baseline**: TBD (establish baseline in FID-006 Phase 3 implementation)

**Implementation Notes**:
- Use incremental scanning (cache scan results for unchanged plugins)
- Parallelize static analysis checks (code injection, path traversal, XSS)
- Use heuristic rules (fast pattern matching, not computationally expensive ML)

---

## 3. Throughput Requirements

### 3.1 Overview

Throughput requirements ensure AIWG supports batch operations and parallel workflows efficiently. As a documentation tooling project, throughput focuses on multi-file validation, parallel agent execution, and iteration velocity.

**Throughput Philosophy**: "Scale operations without user intervention" - batch processing should work efficiently without manual optimization.

**Priority Focus**: P2 NFRs target productivity enhancements (batch validation, parallel execution, iteration velocity). Deferred to post-MVP to reduce scope.

---

### NFR-THRU-001: Batch Validation Throughput [P2]

**Description**: Batch file validation completes efficiently for documentation sets.

**Rationale**: Users validate entire documentation directories (10+ files). Sequential validation wastes time, users expect parallel processing.

**Measurement Criteria**:
- **Target**: 10+ files per minute (batch validation)
- **Measurement Methodology**: Batch validation timer with 10-file test set
- **Baseline**: 12 files/minute (typical), 10 files/minute (threshold)

**Testing Approach**: **Automated** - Batch validation performance test

**Priority**: **P2** - Productivity enhancement, deferred to post-MVP batch operations feature

**Traceability**:
- **Source**: UC-001: Validate AI-Generated Content (Alt-4: batch validation)
- **Test Cases**: TC-001-022 (batch throughput validation)
- **Components**: WritingValidator (SAD Section 5.1)
- **ADRs**: None

**Target Value**: 10+ files per minute for batch validation

**Current Baseline**: TBD (establish baseline in batch operations feature)

**Implementation Notes**:
- Parallelize file validation (3-5 concurrent processes)
- Use shared pattern database (avoid reloading per file)
- Stream results incrementally (display validation progress in real-time)

---

### NFR-THRU-002: Parallel File Validation [P2]

**Description**: System supports concurrent file validation without degradation.

**Rationale**: Parallel processing maximizes CPU utilization. Sequential validation wastes compute resources, slows batch operations.

**Measurement Criteria**:
- **Target**: 3-5 concurrent validation processes
- **Measurement Methodology**: Concurrency test with resource monitoring (CPU, memory)
- **Baseline**: 5 concurrent processes (typical), 3 minimum (threshold)

**Testing Approach**: **Automated** - Parallel execution performance test

**Priority**: **P2** - Performance optimization, deferred to post-MVP batch operations feature

**Traceability**:
- **Source**: UC-001: Validate AI-Generated Content (Alt-4: batch validation)
- **Test Cases**: TC-001-023 (parallel execution validation)
- **Components**: WritingValidator (SAD Section 5.1)
- **ADRs**: None

**Target Value**: 3-5 concurrent validation processes

**Current Baseline**: TBD (establish baseline in batch operations feature)

**Implementation Notes**:
- Use Node.js worker threads (avoid process overhead)
- Limit concurrency to CPU core count (avoid oversubscription)
- Use semaphore pattern (queue excess validations if concurrency exceeded)

---

### NFR-THRU-003: Iteration Velocity [P2]

**Description**: Iteration cycle completes within Agile workflow cadence.

**Rationale**: Agile teams expect 1-2 week iterations. >2 weeks reduces feedback velocity, defeats purpose of iterative development.

**Measurement Criteria**:
- **Target**: 1-2 week iterations (10 business days maximum)
- **Measurement Methodology**: Iteration planning to retrospective duration tracking
- **Baseline**: 10 days (typical), 14 days (threshold)

**Testing Approach**: **Manual** - Process observation (not automated)

**Priority**: **P2** - Process metric, deferred to FID-005 (Framework Self-Improvement) validation

**Traceability**:
- **Source**: UC-005: Framework Self-Improvement (AC-006: velocity tracking)
- **Test Cases**: TC-FSI-007 (velocity measurement)
- **Components**: IterationPlanner, RetrospectiveFacilitator (SAD Section 5.1)
- **ADRs**: None

**Target Value**: 1-2 week iteration cycle time

**Current Baseline**: TBD (establish baseline during Framework Self-Improvement execution)

**Implementation Notes**:
- Track iteration duration in metrics CSV (`.aiwg/metrics/velocity-history.csv`)
- Adjust iteration scope based on historical velocity (38-42 story points)
- Flag iterations exceeding 14 days (retrospective action item)

---

## 4. Accuracy Requirements

### 4.1 Overview

Accuracy requirements ensure AIWG automated analysis produces reliable, trustworthy results. As an AI-assisted tooling project, accuracy focuses on pattern detection precision, intake field accuracy, and security validation reliability.

**Accuracy Philosophy**: "Trust but verify" - automated analysis should be accurate enough to reduce manual review burden, while acknowledging <100% accuracy.

**Priority Focus**: P0 NFRs target user trust (false positive rates, security detection). P1/P2 NFRs target quality enhancements (traceability accuracy, recommendation acceptance).

---

### NFR-ACC-001: AI Pattern False Positive Rate [P0]

**Description**: AI pattern detection minimizes false positives to maintain user trust.

**Rationale**: Excessive false positives (>5%) erode confidence. Users ignore validation feedback if frequently incorrect, defeating purpose.

**Measurement Criteria**:
- **Target**: <5% false positive rate
- **Measurement Methodology**: Statistical validation with 1000-document corpus (500 AI-generated, 500 human-written). Confusion matrix: max 25 false positives out of 500 human documents.
- **Baseline**: 3% false positive rate (typical), 5% (threshold)

**Testing Approach**: **Statistical** - Ground truth corpus validation with confusion matrix analysis

**Priority**: **P0** - Trust erosion if exceeded, direct impact on user confidence

**Traceability**:
- **Source**: UC-001: Validate AI-Generated Content (AC-001, AC-002: validation feedback)
- **Test Cases**: TC-001-016 (accuracy validation)
- **Components**: PatternDetector (SAD Section 5.1)
- **ADRs**: None

**Target Value**: <5% false positive rate (max 25 false positives per 500 human documents)

**Current Baseline**: TBD (establish baseline in Construction Week 1, requires ground truth corpus)

**Ground Truth Strategy**:
- Phase 1 (Elaboration): Small corpus (100 documents, 50 AI + 50 human)
- Phase 2 (Construction): Expand corpus (500 documents, 250 AI + 250 human)
- Phase 3 (Transition): Full corpus (1000 documents, 500 AI + 500 human)

**Implementation Notes**:
- Use conservative pattern matching (reduce false positives, accept higher false negatives)
- Provide confidence scores (low-confidence patterns flagged for manual review)
- Allow user feedback (mark false positives to improve pattern database)

---

### NFR-ACC-002: Intake Field Accuracy [P0]

**Description**: Automated codebase analysis produces accurate intake field values.

**Rationale**: High accuracy (80-90%) reduces manual correction burden. <80% accuracy makes automation ineffective, users revert to manual intake.

**Measurement Criteria**:
- **Target**: 80-90% field accuracy (user edits <20%)
- **Measurement Methodology**: User study with 100 codebases, track field edit rate (fields changed / total fields)
- **Baseline**: 85% accuracy (typical), 80% (threshold)

**Testing Approach**: **Manual** - User acceptance testing (UAT) with edit tracking

**Priority**: **P0** - Manual correction burden if low, brownfield adoption blocker

**Traceability**:
- **Source**: UC-003: Analyze Existing Codebase for Intake (AC-002: field accuracy)
- **Test Cases**: TC-003-016 (accuracy validation)
- **Components**: CodebaseAnalyzer (SAD Section 5.2)
- **ADRs**: None

**Target Value**: 80-90% field accuracy (user edits <20%)

**Current Baseline**: TBD (establish baseline in Transition phase, UAT with beta testers)

**Proxy Metric for Automated Testing**:
- Measure field completeness (% fields populated) as proxy for accuracy
- Target: 95% field completeness (critical fields: name, tech stack, language)

**Implementation Notes**:
- Use heuristic analysis (package.json, README.md, directory structure)
- Provide confidence scores (low-confidence fields flagged for review)
- Prefill with high-confidence defaults (e.g., "Node.js" if package.json exists)

---

### NFR-ACC-003: Automated Traceability Accuracy [P2]

**Description**: Automated traceability validation matches manual traceability matrices.

**Rationale**: 99% accuracy enables trust in automated traceability. <99% requires extensive manual review, reducing automation value.

**Measurement Criteria**:
- **Target**: 99% accuracy (comparison with manual traceability matrix)
- **Measurement Methodology**: Ground truth comparison (automated CSV vs manual CSV), diff tool
- **Baseline**: 99.5% accuracy (typical), 99% (threshold)

**Testing Approach**: **Statistical** - Ground truth comparison with manual matrices

**Priority**: **P2** - Compliance feature, deferred to FID-001 enhancement (Version 2.0)

**Traceability**:
- **Source**: UC-006: Automated Traceability Validation (AC-001: accuracy target)
- **Test Cases**: TC-006-016 (accuracy validation)
- **Components**: TraceabilityEngine (SAD Section 5.3)
- **ADRs**: None

**Target Value**: 99% accuracy (max 1% errors)

**Current Baseline**: TBD (establish baseline in FID-001 implementation)

**Ground Truth Strategy**:
- Create manual traceability matrices for 5 sample projects (Elaboration)
- Expand to 20 sample projects (Construction)
- Validate against 50 sample projects (Transition)

**Implementation Notes**:
- Use regex-based link extraction (robust to format variations)
- Validate bidirectional links (requirement → code, code → requirement)
- Flag orphaned nodes (requirements with no code, code with no tests)

---

### NFR-ACC-004: Template Recommendation Acceptance [P2]

**Description**: Intelligent template recommendations align with user preferences.

**Rationale**: 85% acceptance rate indicates recommendations add value. <85% suggests poor recommendation quality, users ignore feature.

**Measurement Criteria**:
- **Target**: 85% user acceptance rate (users accept recommended template vs choosing different template)
- **Measurement Methodology**: A/B testing, track user choices (accept recommendation = 1, reject = 0), aggregate acceptance rate
- **Baseline**: 90% acceptance (typical), 85% (threshold)

**Testing Approach**: **Manual** - User acceptance testing (UAT) with A/B tracking

**Priority**: **P2** - Onboarding enhancement, deferred to FID-003 (Version 2.0)

**Traceability**:
- **Source**: UC-008: Template Selection Guides (AC-002: recommendation acceptance)
- **Test Cases**: TC-008-016 (accuracy validation)
- **Components**: TemplateSelector (SAD Section 2.1)
- **ADRs**: None

**Target Value**: 85% user acceptance rate

**Current Baseline**: TBD (establish baseline in Transition phase, UAT with beta testers)

**Proxy Metric for Automated Testing**:
- Measure template diversity (% templates recommended vs always same template)
- Target: Recommend 3+ different templates across 10 test cases (avoid single-template bias)

**Implementation Notes**:
- Use heuristic scoring (project size, tech stack, team size)
- Limit recommendation set (top 3 templates, ranked by score)
- Provide explanation (why this template recommended)

---

### NFR-ACC-005: Security Attack Detection [P0]

**Description**: Plugin security validation detects all known attack vectors.

**Rationale**: 100% detection of known attacks is security table stakes. Missing attacks (false negatives) exposes users to malicious plugins.

**Measurement Criteria**:
- **Target**: 100% detection rate for known attack vectors
- **Measurement Methodology**: Security test suite with 50 known attack patterns (code injection, path traversal, XSS, etc.), verify 100% detected
- **Baseline**: 100% (no false negatives allowed)

**Testing Approach**: **Automated** - Security scanner with attack database

**Priority**: **P0** - Security breach if missed, enterprise blocker

**Traceability**:
- **Source**: UC-011: Validate Plugin Security (AC-001: attack detection)
- **Test Cases**: TC-011-016 (security validation)
- **Components**: SecurityScanner, PluginSandbox (SAD Section 5.1)
- **ADRs**: None

**Target Value**: 100% detection rate (all 50 known attacks detected)

**Current Baseline**: TBD (establish baseline in FID-006 Phase 1-2 implementation)

**Attack Vector Database**:
- Code injection (eval(), Function() constructor)
- Path traversal (../../../etc/passwd)
- XSS (document.write with unsanitized input)
- Arbitrary file access (fs.readFile with user input)
- Network exfiltration (http.get to external domain)

**Implementation Notes**:
- Use static analysis (AST parsing for dangerous patterns)
- Use regex-based pattern matching (fast heuristics)
- Use allowlist approach (block all by default, explicit permissions required)

---

### NFR-ACC-006: Security Validation False Positives [P2]

**Description**: Plugin security validation minimizes false positives to avoid blocking legitimate plugins.

**Rationale**: <5% false positive rate balances security (NFR-ACC-005: 100% detection) with usability. >5% blocks too many legitimate plugins, frustrating users.

**Measurement Criteria**:
- **Target**: <5% false positive rate
- **Measurement Methodology**: Statistical validation with 1000 legitimate plugins, confusion matrix: max 50 false positives
- **Baseline**: 2% false positive rate (typical), 5% (threshold)

**Testing Approach**: **Statistical** - Ground truth corpus validation (benign plugins flagged as malicious)

**Priority**: **P2** - Usability enhancement, deferred to FID-006 Phase 3 (Version 2.0)

**Traceability**:
- **Source**: UC-011: Validate Plugin Security (AC-002: false positive minimization)
- **Test Cases**: TC-011-017 (security validation)
- **Components**: SecurityScanner (SAD Section 5.1)
- **ADRs**: None

**Target Value**: <5% false positive rate (max 50 false positives per 1000 legitimate plugins)

**Current Baseline**: TBD (establish baseline in FID-006 Phase 3 implementation)

**Ground Truth Strategy**:
- Curate corpus of 100 legitimate plugins (Elaboration)
- Expand to 500 legitimate plugins (Construction)
- Validate against 1000 legitimate plugins (Transition)

**Implementation Notes**:
- Use confidence scores (low-confidence detections flagged for manual review)
- Allow plugin developer to request review (appeal false positives)
- Use community feedback (mark false positives to improve security rules)

---

## 5. Quality Requirements

### 5.1 Overview

Quality requirements ensure AIWG artifacts meet professional standards. As a documentation tooling project, quality focuses on multi-agent review completeness, requirements coverage, test coverage targets, and template completeness.

**Quality Philosophy**: "Built-in quality, not inspected-in quality" - multi-agent reviews and automated checks prevent defects, rather than catching them late.

**Priority Focus**: P1 NFRs target quality assurance processes (reviewers, traceability, test coverage). Deferred to post-MVP to reduce scope.

---

### NFR-QUAL-001: Multi-Agent Reviewer Sign-offs [P1]

**Description**: Multi-agent workflows include comprehensive review from specialized agents.

**Rationale**: 3+ reviewers provide diverse perspectives (security, testability, requirements alignment). <3 reviewers reduces review quality, increases defect escape rate.

**Measurement Criteria**:
- **Target**: 3+ specialized reviewers per artifact
- **Measurement Methodology**: Review history inspection (count reviewers per artifact)
- **Baseline**: 4 reviewers (typical: security, test, requirements, technical writer), 3 minimum (threshold)

**Testing Approach**: **Automated** - Review metadata validation (count reviewers in review history)

**Priority**: **P1** - Quality assurance feature, deferred to post-MVP multi-agent enhancement

**Traceability**:
- **Source**: UC-004: Multi-Agent Workflows (AC-003: multi-agent review)
- **Test Cases**: TC-004-017 (quality validation)
- **Components**: DocumentationSynthesizer, review agents (SAD Section 5.1)
- **ADRs**: None

**Target Value**: 3+ specialized reviewers (security, test, requirements, technical writer)

**Current Baseline**: 4 reviewers (established in multi-agent pattern documentation)

**Implementation Notes**:
- Define review roles (security, testability, requirements, clarity)
- Launch reviewers in parallel (single message, multiple Task tool calls)
- Require sign-offs (APPROVED, CONDITIONAL, REJECTED decisions)

---

### NFR-QUAL-002: Requirements Traceability Coverage [P1]

**Description**: All requirements trace to implementation and tests.

**Rationale**: 100% traceability ensures no requirements slip through cracks. <100% creates gaps, requirements not implemented or tested.

**Measurement Criteria**:
- **Target**: 100% requirements coverage (all requirements trace to code + tests)
- **Measurement Methodology**: Traceability matrix validation (requirements → code → tests)
- **Baseline**: 100% (enforced by traceability automation)

**Testing Approach**: **Automated** - Traceability graph validation (detect orphaned requirements)

**Priority**: **P1** - Compliance feature, deferred to FID-001 (Traceability Automation)

**Traceability**:
- **Source**: UC-004: Multi-Agent Workflows (AC-004: traceability validation), UC-006: Automated Traceability Validation (AC-001)
- **Test Cases**: TC-004-018 (quality validation), TC-006-017 (traceability validation)
- **Components**: TraceabilityEngine (SAD Section 5.3)
- **ADRs**: None

**Target Value**: 100% requirements coverage (no orphaned requirements)

**Current Baseline**: TBD (establish baseline in FID-001 implementation)

**Implementation Notes**:
- Use bidirectional links (requirement → code, code → requirement)
- Flag orphaned requirements (no code implementation)
- Flag orphaned code (no requirement justification)
- Flag orphaned tests (no requirement coverage)

---

### NFR-QUAL-003: Test Coverage Targets [P1]

**Description**: Automated test suite achieves target coverage levels.

**Rationale**: Coverage targets (80% unit, 70% integration, 50% E2E) balance quality with effort. Lower coverage increases defect escape rate.

**Measurement Criteria**:
- **Target**: 80% unit coverage, 70% integration coverage, 50% E2E coverage
- **Measurement Methodology**: Code coverage tools (Istanbul/NYC for Node.js, pytest-cov for Python)
- **Baseline**: 80%/70%/50% (enforced by CI/CD quality gates)

**Testing Approach**: **Automated** - Code coverage measurement in CI/CD pipeline

**Priority**: **P1** - Quality assurance feature, deferred to post-MVP test enhancement

**Traceability**:
- **Source**: UC-009: Generate Test Templates (AC-002: coverage targets)
- **Test Cases**: TC-009-017 (quality validation)
- **Components**: TestEngineer agent, test suite (SAD Section 11.3)
- **ADRs**: None

**Target Value**: 80% unit, 70% integration, 50% E2E coverage

**Current Baseline**: TBD (establish baseline in Construction phase, test implementation)

**Implementation Notes**:
- Exclude generated code from coverage (manifests, fixtures)
- Exclude test utilities from coverage (test helpers not tested)
- Use incremental coverage (require PRs to maintain or improve coverage)

---

### NFR-QUAL-004: Test Template Completeness [P1]

**Description**: Test template library covers all test types.

**Rationale**: Comprehensive templates (unit, integration, E2E, performance, security) reduce gaps. Missing templates leave test types uncovered.

**Measurement Criteria**:
- **Target**: All test types covered (unit, integration, E2E, performance, security)
- **Measurement Methodology**: Template catalog inspection (verify all test types present)
- **Baseline**: 5 test types (unit, integration, E2E, performance, security)

**Testing Approach**: **Automated** - Template catalog validation (file existence checks)

**Priority**: **P1** - Quality assurance feature, deferred to FID-004 (Test Templates)

**Traceability**:
- **Source**: UC-009: Generate Test Templates (AC-003: template completeness)
- **Test Cases**: TC-009-018 (quality validation)
- **Components**: Test template library (SAD Section 10.1)
- **ADRs**: None

**Target Value**: All test types covered (unit, integration, E2E, performance, security)

**Current Baseline**: TBD (establish baseline in FID-004 implementation)

**Implementation Notes**:
- Use template-based generation (avoid custom test writing)
- Provide example tests (fixtures, mocks, stubs)
- Document test patterns (arrange-act-assert, given-when-then)

---

## 6. Completeness Requirements

### 6.1 Overview

Completeness requirements ensure AIWG functionality is comprehensive and gap-free. As a documentation tooling project, completeness focuses on pattern database coverage, intake field coverage, artifact completeness, and orphan detection.

**Completeness Philosophy**: "Leave no gaps" - comprehensive coverage prevents users from encountering missing functionality.

**Priority Focus**: P1 NFRs target comprehensiveness (pattern database size, critical fields, artifact completeness). Deferred to post-MVP to reduce scope.

---

### NFR-COMP-001: AI Pattern Database Size [P1]

**Description**: AI pattern database covers comprehensive set of detection patterns.

**Rationale**: 1000+ patterns provide broad coverage. Smaller databases miss common AI patterns, reducing validation effectiveness.

**Measurement Criteria**:
- **Target**: 1000+ patterns
- **Measurement Methodology**: Pattern database file count (YAML files in validation/banned-patterns.md)
- **Baseline**: 1000+ patterns (established in AI Writing Guide core)

**Testing Approach**: **Automated** - Pattern database file count validation

**Priority**: **P1** - Coverage enhancement, deferred to post-MVP pattern expansion

**Traceability**:
- **Source**: UC-001: Validate AI-Generated Content (AC-001: pattern detection)
- **Test Cases**: TC-001-018 (completeness validation)
- **Components**: PatternDetector (SAD Section 5.1)
- **ADRs**: None

**Target Value**: 1000+ patterns

**Current Baseline**: 1000+ patterns (AI Writing Guide core repository)

**Implementation Notes**:
- Use community contributions (accept pattern submissions via PRs)
- Use machine learning (generate patterns from AI-generated corpus)
- Use version control (track pattern additions, removals, modifications)

---

### NFR-COMP-002: Intake Critical Field Coverage [P1]

**Description**: Intake forms capture all critical project metadata.

**Rationale**: 100% critical field coverage (name, tech stack, language) enables accurate template selection, agent assignment. Missing critical fields blocks onboarding.

**Measurement Criteria**:
- **Target**: 100% critical field coverage (name, tech stack, language, team size, domain)
- **Measurement Methodology**: Intake form validation (verify all critical fields populated)
- **Baseline**: 100% (enforced by intake validation)

**Testing Approach**: **Automated** - Intake form validation (field presence checks)

**Priority**: **P1** - Completeness enhancement, deferred to post-MVP intake validation

**Traceability**:
- **Source**: UC-003: Analyze Existing Codebase for Intake (AC-001: critical field coverage)
- **Test Cases**: TC-003-018 (completeness validation)
- **Components**: IntakeCoordinator (SAD Section 5.2)
- **ADRs**: None

**Target Value**: 100% critical field coverage (5 critical fields: name, tech stack, language, team size, domain)

**Current Baseline**: 100% (established in intake templates)

**Implementation Notes**:
- Use intake validation (block submission if critical fields missing)
- Use default values (prefill with heuristic analysis)
- Use interactive prompts (ask user for missing critical fields)

---

### NFR-COMP-003: SDLC Artifact Completeness [P1]

**Description**: Framework self-improvement generates 100% complete SDLC artifacts.

**Rationale**: Complete artifacts (no gaps, all sections filled) demonstrate framework maturity. Incomplete artifacts erode trust, suggest framework can't dogfood.

**Measurement Criteria**:
- **Target**: 100% artifact completeness for all features
- **Measurement Methodology**: Artifact section validation (verify all required sections present)
- **Baseline**: 100% (enforced by template validation)

**Testing Approach**: **Automated** - Template section validation (markdown structure checks)

**Priority**: **P1** - Meta-application proof, deferred to UC-005 (Framework Self-Improvement)

**Traceability**:
- **Source**: UC-005: Framework Self-Improvement (AC-001: artifact completeness)
- **Test Cases**: TC-FSI-018 (completeness validation)
- **Components**: SDLC agents, template library (SAD Section 5.1, Section 10.1)
- **ADRs**: None

**Target Value**: 100% artifact completeness (all required sections present)

**Current Baseline**: TBD (establish baseline during Framework Self-Improvement execution)

**Implementation Notes**:
- Use template-based generation (ensure all sections present)
- Use validation scripts (detect missing sections before baseline)
- Use review sign-offs (reviewers verify completeness)

---

### NFR-COMP-004: Orphan Artifact Detection [P1]

**Description**: Traceability automation detects orphaned artifacts.

**Rationale**: 100% orphan detection prevents broken traceability links. Orphaned requirements, code, tests indicate gaps in implementation.

**Measurement Criteria**:
- **Target**: 100% orphan detection (all orphaned nodes flagged)
- **Measurement Methodology**: Graph traversal (detect nodes with no incoming/outgoing edges)
- **Baseline**: 100% (enforced by traceability validation)

**Testing Approach**: **Automated** - Graph validation (orphan node detection)

**Priority**: **P1** - Completeness enhancement, deferred to FID-001 (Traceability Automation)

**Traceability**:
- **Source**: UC-006: Automated Traceability Validation (AC-002: orphan detection)
- **Test Cases**: TC-006-018 (completeness validation)
- **Components**: TraceabilityEngine (SAD Section 5.3)
- **ADRs**: None

**Target Value**: 100% orphan detection (no orphaned nodes missed)

**Current Baseline**: TBD (establish baseline in FID-001 implementation)

**Implementation Notes**:
- Use bidirectional link validation (detect nodes with no incoming edges)
- Flag orphaned requirements (no code implementation)
- Flag orphaned code (no requirement justification)
- Flag orphaned tests (no code coverage)

---

### NFR-COMP-005: Orphan Files After Rollback [P2]

**Description**: Plugin rollback removes all plugin files, leaving no orphans.

**Rationale**: Zero orphan files ensures clean recovery. Orphaned files pollute filesystem, confuse users, suggest incomplete rollback.

**Measurement Criteria**:
- **Target**: Zero orphan files after rollback
- **Measurement Methodology**: Filesystem scan (compare before rollback vs after rollback)
- **Baseline**: Zero orphan files (enforced by rollback validation)

**Testing Approach**: **Automated** - Filesystem validation (file count comparison)

**Priority**: **P2** - Clean recovery feature, deferred to FID-005 (Plugin Rollback)

**Traceability**:
- **Source**: UC-010: Plugin Rollback (AC-002: clean recovery)
- **Test Cases**: TC-010-018 (completeness validation)
- **Components**: PluginManager (SAD Section 5.1)
- **ADRs**: ADR-006 (Plugin Rollback Strategy - reset + redeploy)

**Target Value**: Zero orphan files after rollback

**Current Baseline**: TBD (establish baseline in FID-005 implementation)

**Implementation Notes**:
- Use manifest-based deletion (delete all files listed in plugin manifest)
- Use directory cleanup (remove empty directories after file deletion)
- Use backup restoration (restore CLAUDE.md from backup)

---

## 7. Security Requirements

### 7.1 Overview

Security requirements ensure AIWG protects user data and prevents malicious plugin attacks. As a documentation tooling project, security focuses on content privacy, data integrity, file permissions, and backup integrity.

**Security Philosophy**: "Security by design" - security controls built into architecture, not bolted on.

**Priority Focus**: P0 NFRs target foundational security (content privacy, attack detection). P1 NFRs target data integrity (checksums, file permissions).

---

### NFR-SEC-001: Content Privacy (No External API Calls) [P0]

**Description**: Content validation occurs 100% locally, with zero external API calls.

**Rationale**: User content may contain confidential information. External API calls risk data leakage, enterprise blocker.

**Measurement Criteria**:
- **Target**: Zero external API calls during validation workflow
- **Measurement Methodology**: Network traffic monitoring (verify no outbound HTTP/HTTPS calls)
- **Baseline**: Zero external API calls (enforced by architecture)

**Testing Approach**: **Automated** - Network monitoring with nock library (assert no HTTP calls)

**Priority**: **P0** - Data protection, enterprise deal-breaker if violated

**Traceability**:
- **Source**: UC-001: Validate AI-Generated Content (AC-003: privacy)
- **Test Cases**: TC-001-017 (security validation)
- **Components**: WritingValidator, PatternDetector (SAD Section 5.1)
- **ADRs**: None

**Target Value**: Zero external API calls (100% local analysis)

**Current Baseline**: Zero external API calls (architecture enforced)

**Implementation Notes**:
- Use local pattern database (no remote API calls)
- Use offline validation (no network dependencies)
- Use nock library in tests (assert no HTTP calls attempted)

---

### NFR-SEC-002: Pattern Database Integrity [P1]

**Description**: Pattern database validated with SHA-256 checksum before use.

**Rationale**: Tampered pattern database could inject false positives/negatives. Checksum validation detects tampering, prevents malicious modifications.

**Measurement Criteria**:
- **Target**: SHA-256 checksum validation before pattern database load
- **Measurement Methodology**: Checksum verification (compute SHA-256, compare with expected value)
- **Baseline**: SHA-256 checksum validation (enforced by loader)

**Testing Approach**: **Automated** - Checksum validation test (tamper detection)

**Priority**: **P1** - Trust/security feature, deferred to post-MVP integrity enhancement

**Traceability**:
- **Source**: UC-001: Validate AI-Generated Content (AC-004: integrity)
- **Test Cases**: TC-001-018 (security validation)
- **Components**: PatternDetector (SAD Section 5.1)
- **ADRs**: None

**Target Value**: SHA-256 checksum validation (tamper detection)

**Current Baseline**: TBD (implement checksum validation in post-MVP)

**Implementation Notes**:
- Use Node.js `crypto` module (SHA-256 hash computation)
- Store expected checksum in manifest (version-controlled)
- Reject pattern database if checksum mismatch (abort validation)

---

### NFR-SEC-003: File Permissions Security [P0]

**Description**: Deployed files preserve source permissions, preventing privilege escalation.

**Rationale**: Incorrect file permissions (e.g., world-writable) create security vulnerabilities. Preserve source permissions ensures secure deployment.

**Measurement Criteria**:
- **Target**: Deployed file permissions match source permissions (no privilege escalation)
- **Measurement Methodology**: File permission comparison (before vs after deployment)
- **Baseline**: Permissions match source (enforced by deployment script)

**Testing Approach**: **Automated** - Filesystem API validation (`fs.stat()` mode comparison)

**Priority**: **P0** - Security vulnerability if violated, prevents privilege escalation

**Traceability**:
- **Source**: UC-002: Deploy SDLC Framework to Existing Project (AC-002: security)
- **Test Cases**: TC-002-017 (security validation)
- **Components**: deploy-agents.mjs (SAD Section 2.1)
- **ADRs**: None

**Target Value**: File permissions match source (no privilege escalation)

**Current Baseline**: Permissions match source (deployment script enforced)

**Implementation Notes**:
- Use `fs.copyFile()` with `COPYFILE_FICLONE` flag (preserve permissions)
- Validate permissions after deployment (assert match)
- Reject deployment if permissions differ (abort with error)

---

### NFR-SEC-004: Backup Integrity [P1]

**Description**: Backup files validated with SHA-256 checksum before restoration.

**Rationale**: Corrupted backups could lose user data during rollback. Checksum validation detects corruption, prevents data loss.

**Measurement Criteria**:
- **Target**: SHA-256 checksum validation before rollback restoration
- **Measurement Methodology**: Checksum verification (compute SHA-256, compare with expected value)
- **Baseline**: SHA-256 checksum validation (enforced by rollback script)

**Testing Approach**: **Automated** - Checksum validation test (corruption detection)

**Priority**: **P1** - Data protection feature, deferred to FID-005 (Plugin Rollback)

**Traceability**:
- **Source**: UC-002: Deploy SDLC Framework to Existing Project (AC-003: backup integrity)
- **Test Cases**: TC-002-018 (security validation)
- **Components**: PluginManager (SAD Section 5.1)
- **ADRs**: ADR-006 (Plugin Rollback Strategy)

**Target Value**: SHA-256 checksum validation (corruption detection)

**Current Baseline**: TBD (implement checksum validation in FID-005)

**Implementation Notes**:
- Use Node.js `crypto` module (SHA-256 hash computation)
- Store expected checksum in backup manifest (metadata file)
- Reject backup if checksum mismatch (abort rollback, warn user)

---

## 8. Reliability Requirements

### 8.1 Overview

Reliability requirements ensure AIWG operations complete successfully without data loss. As a documentation tooling project, reliability focuses on deployment success, data preservation, and rollback integrity.

**Reliability Philosophy**: "Transactional operations" - deployments succeed completely or rollback completely, no partial states.

**Priority Focus**: P2 NFRs target operational reliability (deployment success, data preservation, rollback integrity). Deferred to post-MVP to reduce scope.

---

### NFR-REL-001: Deployment Success Rate [P2]

**Description**: File deployment operations complete successfully with zero partial deployments.

**Rationale**: Partial deployments leave system in inconsistent state. 100% success rate ensures reliability, transactional deployment.

**Measurement Criteria**:
- **Target**: 100% deployment success rate (zero partial deployments)
- **Measurement Methodology**: Deployment validation (verify all files copied, no missing files)
- **Baseline**: 100% success rate (enforced by deployment script)

**Testing Approach**: **Automated** - Deployment validation (file count comparison)

**Priority**: **P2** - Reliability enhancement, deferred to post-MVP transactional deployment

**Traceability**:
- **Source**: UC-002: Deploy SDLC Framework to Existing Project (AC-001: deployment success)
- **Test Cases**: TC-002-019 (reliability validation)
- **Components**: deploy-agents.mjs (SAD Section 2.1)
- **ADRs**: ADR-006 (Plugin Rollback Strategy - transactional deployment)

**Target Value**: 100% deployment success rate (zero partial deployments)

**Current Baseline**: TBD (establish baseline in Construction phase)

**Implementation Notes**:
- Use atomic operations (deploy to temporary directory, then rename)
- Use rollback on failure (delete partial deployment if error)
- Use validation (verify all files copied before marking success)

---

### NFR-REL-002: Data Preservation During Updates [P2]

**Description**: CLAUDE.md updates preserve existing content with zero data loss.

**Rationale**: CLAUDE.md contains user customizations. Data loss erodes trust, users avoid updates.

**Measurement Criteria**:
- **Target**: Zero data loss during CLAUDE.md updates
- **Measurement Methodology**: Content comparison (before vs after update)
- **Baseline**: Zero data loss (enforced by update script)

**Testing Approach**: **Automated** - Content validation (diff comparison)

**Priority**: **P2** - Trust/reliability feature, deferred to post-MVP update enhancement

**Traceability**:
- **Source**: UC-002: Deploy SDLC Framework to Existing Project (AC-004: data preservation)
- **Test Cases**: TC-002-020 (reliability validation)
- **Components**: deploy-agents.mjs (SAD Section 2.1)
- **ADRs**: ADR-006 (Plugin Rollback Strategy - preserve existing content)

**Target Value**: Zero data loss (100% content preservation)

**Current Baseline**: Zero data loss (update script enforced)

**Implementation Notes**:
- Use append-only updates (add AIWG section, preserve existing content)
- Use backup before update (restore if update fails)
- Use validation (compare content length before/after)

---

### NFR-REL-003: Rollback State Restoration [P2]

**Description**: Plugin rollback restores system to pre-installation state with 100% integrity.

**Rationale**: Incomplete rollback leaves system in inconsistent state. 100% state restoration ensures reliable recovery.

**Measurement Criteria**:
- **Target**: 100% state restoration (all changes reverted)
- **Measurement Methodology**: State comparison (before installation vs after rollback)
- **Baseline**: 100% state restoration (enforced by rollback script)

**Testing Approach**: **Automated** - State validation (filesystem comparison)

**Priority**: **P2** - Reliability enhancement, deferred to FID-005 (Plugin Rollback)

**Traceability**:
- **Source**: UC-010: Plugin Rollback (AC-001: state restoration)
- **Test Cases**: TC-010-019 (reliability validation)
- **Components**: PluginManager (SAD Section 5.1)
- **ADRs**: ADR-006 (Plugin Rollback Strategy - reset + redeploy)

**Target Value**: 100% state restoration (complete recovery)

**Current Baseline**: TBD (establish baseline in FID-005 implementation)

**Implementation Notes**:
- Use backup-based restoration (restore CLAUDE.md from backup)
- Use manifest-based deletion (delete all plugin files)
- Use validation (verify state matches pre-installation)

---

## 9. Usability Requirements

### 9.1 Overview

Usability requirements ensure AIWG tools are learnable, clear, and efficient. As a documentation tooling project, usability focuses on learning curve, feedback clarity, progress visibility, setup friction, error clarity, and onboarding efficiency.

**Usability Philosophy**: "Don't make users think" - tools should be intuitive, errors should be self-explanatory, progress should be visible.

**Priority Focus**: P0 NFRs target user-facing interactions (learning curve, setup time, error clarity). P1 NFRs target user experience enhancements (feedback clarity, progress visibility).

---

### NFR-USE-001: AI Validation Learning Curve [P0]

**Description**: Users internalize AI validation feedback patterns within 1-2 validation cycles.

**Rationale**: Steep learning curve (>2 cycles) reduces adoption. Users should quickly understand validation feedback, apply improvements.

**Measurement Criteria**:
- **Target**: 1-2 validation cycles to internalize feedback patterns
- **Measurement Methodology**: User study with 10 new users, observe task completion improvement
- **Baseline**: 80% of users internalize feedback after 2 cycles

**Testing Approach**: **Manual** - User acceptance testing (UAT) with task observation

**Priority**: **P0** - Adoption barrier if steep, accessibility requirement

**Traceability**:
- **Source**: UC-001: Validate AI-Generated Content (AC-001: learning curve)
- **Test Cases**: TC-001-019 (usability validation)
- **Components**: WritingValidator (SAD Section 5.1)
- **ADRs**: None

**Target Value**: 1-2 validation cycles to internalize feedback patterns

**Current Baseline**: TBD (establish baseline in Transition phase, UAT with beta testers)

**Proxy Metric for Automated Testing**:
- Measure feedback consistency (same pattern flagged consistently across documents)
- Target: 95% consistency (pattern X always flagged in all documents)

**Implementation Notes**:
- Use clear feedback messages (explain why pattern flagged)
- Use consistent terminology (same terms across all feedback)
- Provide examples (show before/after rewrite suggestions)

---

### NFR-USE-002: Validation Feedback Clarity [P1]

**Description**: Validation feedback includes line numbers and specific rewrite suggestions.

**Rationale**: Vague feedback ("improve clarity") is not actionable. Specific line numbers + rewrite suggestions enable immediate action.

**Measurement Criteria**:
- **Target**: 100% of feedback includes line numbers and specific rewrite suggestions
- **Measurement Methodology**: Feedback message inspection (regex validation)
- **Baseline**: 100% (enforced by feedback format)

**Testing Approach**: **Automated** - Feedback format validation (regex checks)

**Priority**: **P1** - User experience enhancement, deferred to post-MVP feedback improvement

**Traceability**:
- **Source**: UC-001: Validate AI-Generated Content (AC-002: feedback clarity)
- **Test Cases**: TC-001-020 (usability validation)
- **Components**: WritingValidator (SAD Section 5.1)
- **ADRs**: None

**Target Value**: 100% of feedback includes line numbers and specific rewrite suggestions

**Current Baseline**: TBD (establish baseline in Construction phase)

**Feedback Format Example**:
```
Line 42: AI pattern detected - "It's worth noting that"
Suggestion: Remove hedge phrase. Rewrite as: "The system supports..."
```

**Implementation Notes**:
- Use line number tracking (parse markdown line-by-line)
- Use suggestion templates (predefined rewrites for common patterns)
- Use severity levels (high-confidence patterns flagged as errors, low-confidence as warnings)

---

### NFR-USE-003: Progress Visibility (Real-time Score Updates) [P1]

**Description**: Authenticity score updates in real-time as files are validated.

**Rationale**: Real-time updates motivate users (see improvement incrementally). Batch updates delay gratification, reduce engagement.

**Measurement Criteria**:
- **Target**: Score updates visible after each file validation (not batched)
- **Measurement Methodology**: UI inspection (manual testing)
- **Baseline**: Real-time updates (enforced by validation loop)

**Testing Approach**: **Manual** - UI inspection (requires UI testing framework)

**Priority**: **P1** - Motivation feature, deferred to Construction phase (when UI implemented)

**Traceability**:
- **Source**: UC-001: Validate AI-Generated Content (AC-003: progress visibility)
- **Test Cases**: TC-001-021 (usability validation)
- **Components**: WritingValidator (SAD Section 5.1)
- **ADRs**: None

**Target Value**: Real-time score updates (after each file validation)

**Current Baseline**: TBD (establish baseline in Construction phase, UI implementation)

**Implementation Notes**:
- Use streaming output (display score incrementally, not at end)
- Use progress indicators (percentage complete, files remaining)
- Use color coding (green = improving, red = declining)

---

### NFR-USE-004: First-Time Setup Friction [P0]

**Description**: Users generate first artifact within 15 minutes from installation.

**Rationale**: Onboarding friction (>15 minutes) reduces conversion. Users should experience value quickly.

**Measurement Criteria**:
- **Target**: <15 minutes from install to first artifact (80% of users)
- **Measurement Methodology**: Timed user study with 10 new users, task completion observation
- **Baseline**: 12 minutes (typical), 15 minutes (threshold)

**Testing Approach**: **Manual** - User acceptance testing (UAT) with timer

**Priority**: **P0** - Onboarding conversion rate, accessibility requirement

**Traceability**:
- **Source**: UC-002: Deploy SDLC Framework to Existing Project (AC-001: setup friction)
- **Test Cases**: TC-002-021 (usability validation)
- **Components**: CLI entry point, deploy-agents.mjs (SAD Section 2.1)
- **ADRs**: None

**Target Value**: <15 minutes from install to first artifact (80% of users)

**Current Baseline**: TBD (establish baseline in Transition phase, UAT with beta testers)

**Proxy Metric for Automated Testing**:
- Measure setup time (install + deploy + generate first artifact)
- Target: <15 minutes (measured on reference hardware)

**Implementation Notes**:
- Use one-line install (curl | bash)
- Use interactive prompts (guide users through setup)
- Use default values (minimize user input required)

---

### NFR-USE-005: Error Message Clarity [P0]

**Description**: Error messages include clear remediation steps for all errors.

**Rationale**: Unclear errors ("something went wrong") frustrate users, increase support burden. Clear remediation steps enable self-service recovery.

**Measurement Criteria**:
- **Target**: 100% of error messages include remediation steps
- **Measurement Methodology**: Error message inspection (regex validation)
- **Baseline**: 100% (enforced by error handling)

**Testing Approach**: **Automated** - Error message format validation (regex checks)

**Priority**: **P0** - Self-service support, reduce support burden

**Traceability**:
- **Source**: UC-002: Deploy SDLC Framework to Existing Project (AC-005: error clarity)
- **Test Cases**: TC-002-022 (usability validation)
- **Components**: CLI entry point, deploy-agents.mjs (SAD Section 2.1)
- **ADRs**: None

**Target Value**: 100% of error messages include remediation steps

**Current Baseline**: TBD (establish baseline in Construction phase)

**Error Message Format Example**:
```
ERROR: Plugin installation failed - insufficient disk space

Remediation:
1. Free up disk space (current: 50MB available, required: 100MB)
2. Retry installation: aiwg -install-plugin <name>
3. If issue persists, file bug report: https://github.com/jmagly/ai-writing-guide/issues
```

**Implementation Notes**:
- Use error templates (predefined remediation steps for common errors)
- Use context-specific guidance (include relevant details: disk space, file path, etc.)
- Use actionable language (specific commands, not vague suggestions)

---

### NFR-USE-006: Onboarding Time Savings [P1]

**Description**: Template selection guides reduce onboarding time by 50% vs manual selection.

**Rationale**: Manual template selection takes 10-20 minutes (browsing, comparison). 50% time savings (5-10 minutes) demonstrates automation value.

**Measurement Criteria**:
- **Target**: 50% time savings vs manual selection
- **Measurement Methodology**: A/B comparison (template selection with vs without AIWG), timed user study with 20 users (10 AIWG, 10 manual)
- **Baseline**: 10 minutes (AIWG), 20 minutes (manual) = 50% time savings

**Testing Approach**: **Manual** - User acceptance testing (UAT) with A/B comparison

**Priority**: **P1** - Productivity metric, deferred to FID-003 (Template Selection Guides)

**Traceability**:
- **Source**: UC-008: Template Selection Guides (AC-003: time savings)
- **Test Cases**: TC-008-017 (usability validation)
- **Components**: TemplateSelector (SAD Section 2.1)
- **ADRs**: None

**Target Value**: 50% time savings vs manual selection (10 minutes AIWG vs 20 minutes manual)

**Current Baseline**: TBD (establish baseline in Transition phase, UAT with beta testers)

**Proxy Metric for Automated Testing**:
- Measure recommendation time (time to generate recommendation)
- Target: <2 minutes (fast enough to save time vs manual browsing)

**Implementation Notes**:
- Use intelligent recommendation (project type, tech stack, team size)
- Limit recommendation set (top 3 templates, ranked)
- Provide explanation (why this template recommended)

---

## 10. Data Retention Requirements

### 10.1 Overview

Data retention requirements ensure AIWG preserves historical data for analysis and compliance. As a documentation tooling project, retention focuses on validation history, review history, and metrics retention.

**Data Retention Philosophy**: "Keep what's useful, discard what's not" - retain data for trend analysis and compliance, but avoid indefinite storage.

**Priority Focus**: P1 NFRs target operational data retention (validation history, review history, metrics). Deferred to post-MVP to reduce scope.

---

### NFR-DATA-001: Validation History Retention [P1]

**Description**: Validation history retained for 30 days to enable trend analysis.

**Rationale**: Trend analysis (improvement tracking) requires historical data. 30-day retention balances analysis value with storage constraints.

**Measurement Criteria**:
- **Target**: 30-day retention
- **Measurement Methodology**: File age validation (delete files older than 30 days)
- **Baseline**: 30-day retention (enforced by cleanup script)

**Testing Approach**: **Automated** - File age validation (timestamp checks)

**Priority**: **P1** - Trend analysis feature, deferred to post-MVP observability enhancement

**Traceability**:
- **Source**: UC-001: Validate AI-Generated Content (AC-004: history retention)
- **Test Cases**: TC-001-022 (retention validation)
- **Components**: WritingValidator (SAD Section 5.1)
- **ADRs**: None

**Target Value**: 30-day retention

**Current Baseline**: TBD (implement retention policy in post-MVP)

**Implementation Notes**:
- Use cron job (daily cleanup of files older than 30 days)
- Use `.aiwg/working/validation-history/` directory (isolated storage)
- Use compression (gzip old validation reports to save disk space)

---

### NFR-DATA-002: Multi-Agent Review History Retention [P1]

**Description**: Multi-agent review history retained permanently for compliance audit trail.

**Rationale**: Review history provides audit trail (who reviewed, when, what feedback). Permanent retention enables compliance validation, retrospective analysis.

**Measurement Criteria**:
- **Target**: Permanent retention (full review history preserved)
- **Measurement Methodology**: File existence validation (verify all reviews archived)
- **Baseline**: Permanent retention (enforced by archival script)

**Testing Approach**: **Automated** - File existence validation (all reviews archived)

**Priority**: **P1** - Governance feature, deferred to post-MVP compliance enhancement

**Traceability**:
- **Source**: UC-004: Multi-Agent Workflows (AC-002: review history)
- **Test Cases**: TC-004-019 (retention validation)
- **Components**: DocumentationSynthesizer (SAD Section 5.1)
- **ADRs**: None

**Target Value**: Permanent retention (full review history preserved)

**Current Baseline**: Permanent retention (archival to `.aiwg/archive/reviews/`)

**Implementation Notes**:
- Use `.aiwg/archive/reviews/` directory (permanent storage)
- Use version control (commit review history to Git)
- Use markdown format (human-readable, future-proof)

---

### NFR-DATA-003: Historical Metrics Retention [P1]

**Description**: Metrics data retained for 12 months to enable long-term trend analysis.

**Rationale**: Long-term trends (capacity planning, velocity improvement) require 12+ months data. Shorter retention prevents trend analysis.

**Measurement Criteria**:
- **Target**: 12-month retention
- **Measurement Methodology**: File age validation (delete files older than 12 months)
- **Baseline**: 12-month retention (enforced by cleanup script)

**Testing Approach**: **Automated** - File age validation (timestamp checks)

**Priority**: **P1** - Long-term analysis feature, deferred to FID-002 (Metrics Collection)

**Traceability**:
- **Source**: UC-007: Collect and Visualize Metrics (AC-002: retention)
- **Test Cases**: TC-007-016 (retention validation)
- **Components**: MetricsCollector (SAD Section 5.3)
- **ADRs**: None

**Target Value**: 12-month retention

**Current Baseline**: TBD (implement retention policy in FID-002)

**Implementation Notes**:
- Use cron job (monthly cleanup of files older than 12 months)
- Use `.aiwg/metrics/` directory (isolated storage)
- Use CSV format (compact, analysis-friendly)

---

## 11. Freshness Requirements

### 11.1 Overview

Freshness requirements ensure AIWG data reflects current system state. As a documentation tooling project, freshness focuses on real-time metric updates.

**Freshness Philosophy**: "Current data for current decisions" - metrics should reflect real-time state, not stale snapshots.

**Priority Focus**: P1 NFRs target observability (real-time metrics). Deferred to FID-002 (Metrics Collection).

---

### NFR-FRESH-001: Metrics Data Freshness [P1]

**Description**: Metrics data updates in real-time, not batched.

**Rationale**: Real-time metrics enable current decision-making. Stale metrics (batched hourly/daily) provide outdated information.

**Measurement Criteria**:
- **Target**: Real-time metric updates (after each event)
- **Measurement Methodology**: Timestamp validation (verify metrics updated after each event)
- **Baseline**: Real-time updates (enforced by metrics collection)

**Testing Approach**: **Automated** - Timestamp validation (event vs metric update timestamp)

**Priority**: **P1** - Decision accuracy feature, deferred to FID-002 (Metrics Collection)

**Traceability**:
- **Source**: UC-007: Collect and Visualize Metrics (AC-001: real-time updates)
- **Test Cases**: TC-007-017 (freshness validation)
- **Components**: MetricsCollector (SAD Section 5.3)
- **ADRs**: None

**Target Value**: Real-time metric updates (after each event)

**Current Baseline**: TBD (establish baseline in FID-002 implementation)

**Implementation Notes**:
- Use event-driven updates (write metrics after each event, not batched)
- Use async writes (non-blocking metrics collection)
- Use append-only files (avoid locking, enable concurrent writes)

---

## 12. Scalability Requirements

### 12.1 Overview

Scalability requirements ensure AIWG handles growing data volumes and user bases. As a documentation tooling project, scalability focuses on content size limits, agent concurrency, and artifact size limits.

**Scalability Philosophy**: "Design for 10x growth, build for current scale" - architecture supports future scale, implementation optimizes for MVP.

**Priority Focus**: P2 NFRs target boundary conditions (max/min content size, concurrency limits). Deferred to post-MVP to reduce scope.

---

### NFR-SCAL-001: Maximum Content Size [P2]

**Description**: System handles large documents up to 100,000 words without timeout.

**Rationale**: Large documents (technical specifications, compliance documents) reach 100,000 words. Timeout prevents validation, blocks adoption.

**Measurement Criteria**:
- **Target**: <100,000 words (validation completes without timeout)
- **Measurement Methodology**: Stress test with 100,000-word fixture document
- **Baseline**: Validation completes (may exceed 60s NFR-PERF-001, but must complete)

**Testing Approach**: **Automated** - Stress test with large document fixture

**Priority**: **P2** - Edge case, deferred to post-MVP scalability enhancement

**Traceability**:
- **Source**: UC-001: Validate AI-Generated Content (BR-001: content size limits)
- **Test Cases**: TC-001-020 (scalability validation)
- **Components**: WritingValidator (SAD Section 5.1)
- **ADRs**: None

**Target Value**: <100,000 words (validation completes)

**Current Baseline**: TBD (establish baseline in Construction phase)

**Implementation Notes**:
- Use chunking (split large documents into sections, validate independently)
- Use streaming (avoid loading full document into memory)
- Use timeout threshold (abort validation if exceeds 10 minutes)

---

### NFR-SCAL-002: Minimum Content Size [P2]

**Description**: System requires minimum 100 words for meaningful analysis.

**Rationale**: Statistical validation requires sufficient sample size. <100 words provides insufficient data for pattern detection.

**Measurement Criteria**:
- **Target**: 100+ words minimum
- **Measurement Methodology**: Boundary test with 99-word fixture document
- **Baseline**: Validation rejects documents <100 words with clear error message

**Testing Approach**: **Automated** - Boundary test with small document fixture

**Priority**: **P2** - Edge case, deferred to post-MVP validation enhancement

**Traceability**:
- **Source**: UC-001: Validate AI-Generated Content (BR-001: content size limits)
- **Test Cases**: TC-001-021 (scalability validation)
- **Components**: WritingValidator (SAD Section 5.1)
- **ADRs**: None

**Target Value**: 100+ words minimum (statistical validity)

**Current Baseline**: 100 words minimum (enforced by validation)

**Error Message Example**:
```
ERROR: Document too short for meaningful analysis

Current: 99 words
Minimum: 100 words

Remediation: Expand document to at least 100 words for validation.
```

**Implementation Notes**:
- Use word count validation (check before pattern detection)
- Use clear error message (specify current vs minimum word count)
- Use bypass flag (allow short documents with explicit user override)

---

### NFR-SCAL-003: Maximum Concurrent Agents [P2]

**Description**: Orchestrator queues workflows exceeding 25 concurrent agents (Claude Code constraint).

**Rationale**: Claude Code platform limits concurrent agents to 25. Exceeding limit causes throttling, workflow failures.

**Measurement Criteria**:
- **Target**: 25 agents maximum concurrency
- **Measurement Methodology**: Stress test with 30 concurrent agent invocations
- **Baseline**: Orchestrator queues 5 excess agents (max 25 concurrent, 5 queued)

**Testing Approach**: **Automated** - Concurrency test with multi-agent mock framework

**Priority**: **P2** - Platform constraint, deferred to post-MVP multi-agent enhancement

**Traceability**:
- **Source**: UC-004: Multi-Agent Workflows (BR-MA-003: platform limits)
- **Test Cases**: TC-004-021 (scalability validation)
- **Components**: CoreOrchestrator (SAD Section 4.2)
- **ADRs**: None

**Target Value**: 25 agents maximum concurrency (platform constraint)

**Current Baseline**: 25 agents maximum (platform enforced)

**Implementation Notes**:
- Use semaphore pattern (limit concurrent agents to 25)
- Use queueing (sequential execution for excess agents)
- Use progress updates (inform user of queue status)

---

### NFR-SCAL-004: Maximum Artifact Size [P2]

**Description**: Orchestrator chunks or rejects artifacts exceeding 10,000 words to avoid context window exhaustion.

**Rationale**: Claude Code context window limits artifact size. >10,000 words exhausts context, causes generation failures.

**Measurement Criteria**:
- **Target**: 10,000 words maximum (artifact chunked or rejected)
- **Measurement Methodology**: Stress test with 15,000-word artifact generation
- **Baseline**: Orchestrator chunks artifact or rejects with clear error message

**Testing Approach**: **Automated** - Stress test with large artifact fixture

**Priority**: **P2** - Platform constraint, deferred to post-MVP artifact chunking enhancement

**Traceability**:
- **Source**: UC-004: Multi-Agent Workflows (Exc-3: context window exhaustion)
- **Test Cases**: TC-004-022 (scalability validation)
- **Components**: CoreOrchestrator, DocumentationSynthesizer (SAD Section 4.2, Section 5.1)
- **ADRs**: None

**Target Value**: 10,000 words maximum (chunked or rejected)

**Current Baseline**: 10,000 words maximum (chunking strategy)

**Error Message Example**:
```
ERROR: Artifact size exceeds 10,000 words

Current: 15,000 words
Maximum: 10,000 words

Remediation:
1. Chunk artifact into sections (e.g., split SAD into multiple documents)
2. Reduce scope (remove optional sections)
3. If issue persists, file feature request for chunking support
```

**Implementation Notes**:
- Use word count validation (check before generation)
- Use chunking strategy (split into sections, generate independently)
- Use clear error message (specify current vs maximum word count)

---

## 13. Regulatory and Compliance Requirements

### 13.1 Overview

As an open-source documentation and tooling project, AIWG has minimal regulatory obligations. However, responsible data handling and security practices are maintained.

**Compliance Philosophy**: "Security by design, privacy by default" - protect user data, prevent malicious attacks, maintain trust.

---

### NFR-COMP-001: Open Source Licensing

**Requirement**: All AIWG components licensed under MIT License (permissive, commercial-friendly).

**Rationale**: MIT License maximizes adoption, enables commercial use, minimizes legal friction.

**Traceability**:
- README.md: License section
- LICENSE file (repository root)

---

### NFR-COMP-002: Dependency Licensing

**Requirement**: All dependencies use permissive licenses (MIT, Apache 2.0, BSD).

**Rationale**: Copyleft licenses (GPL) create legal constraints, reduce commercial adoption.

**Validation**: `npm audit` (Node.js), `pip-licenses` (Python) - verify all dependencies permissive

**Traceability**:
- package.json (Node.js dependencies)
- requirements.txt (Python dependencies)

---

### NFR-COMP-003: Data Privacy

**Requirement**: No user data collected or transmitted externally (100% local processing).

**Rationale**: User content may contain confidential information. Zero data collection ensures privacy, enables enterprise adoption.

**Validation**: Network monitoring (verify zero external API calls during operation)

**Traceability**:
- NFR-SEC-001: Content Privacy (No External API Calls)
- UC-001: Validate AI-Generated Content (AC-003: privacy)

---

### NFR-COMP-004: Security Vulnerability Disclosure

**Requirement**: Security vulnerabilities disclosed responsibly via SECURITY.md policy.

**Rationale**: Transparent vulnerability disclosure builds trust, enables coordinated fixes.

**Traceability**:
- SECURITY.md file (repository root)
- GitHub Security Advisories (CVE reporting)

---

## 14. Quality Metrics and Service Level Indicators

### 14.1 NFR Validation Metrics

**Performance Metrics** (10 NFRs):
- Response time: p50, p95, p99 percentiles (measured via `performance.now()`)
- Throughput: operations per minute (measured via benchmark harness)
- Resource utilization: CPU, memory, disk (measured via profiling tools)

**Accuracy Metrics** (6 NFRs):
- False positive rate: <5% (measured via confusion matrix)
- False negative rate: <10% (measured via confusion matrix)
- Field accuracy: 80-90% (measured via user edit rate)

**Quality Metrics** (4 NFRs):
- Test coverage: 80% unit, 70% integration, 50% E2E (measured via Istanbul/NYC, pytest-cov)
- Reviewer sign-offs: 3+ reviewers per artifact (measured via review metadata)
- Traceability coverage: 100% (measured via graph validation)

**Security Metrics** (4 NFRs):
- External API calls: 0 (measured via network monitoring)
- Checksum validation: 100% (measured via integrity checks)
- Attack detection: 100% known vectors (measured via security test suite)

**Usability Metrics** (6 NFRs):
- Learning curve: 1-2 cycles (measured via user study)
- Setup time: <15 minutes (measured via timed user study)
- Error clarity: 100% include remediation steps (measured via error message inspection)

### 14.2 Service Level Indicators (SLIs)

**Availability SLIs**:
- GitHub uptime: 99.9%+ (external dependency)
- CLI uptime: 99.99% (local tool)
- CI/CD uptime: 99.9%+ (external dependency)

**Performance SLIs**:
- Validation latency: <60s (p95) for 2000-word documents
- Deployment latency: <10s (p95) for 58 agents + 45 commands
- Analysis latency: <5 minutes (p95) for 1000-file repositories

**Reliability SLIs**:
- Deployment success rate: 100%
- Data preservation rate: 100%
- Rollback success rate: 100%

---

## 15. NFR Prioritization Summary

### 15.1 Priority Distribution

| Priority | NFR Count | % of Total | Target Release |
|----------|-----------|-----------|----------------|
| **P0 (Make-or-Break)** | 12 | 25% | MVP (Iterations 1-5) |
| **P1 (High Value)** | 18 | 37.5% | Version 1.1 (3 months post-MVP) |
| **P2 (Nice-to-Have)** | 18 | 37.5% | Version 2.0+ (Backlog) |

### 15.2 P0 NFRs (Make-or-Break for MVP)

**Performance (4 NFRs)**:
- NFR-PERF-001: Content Validation Time (<60s for 2000 words)
- NFR-PERF-002: SDLC Deployment Time (<10s for 58 agents)
- NFR-PERF-003: Codebase Analysis Time (<5 min for 1000 files)

**Accuracy (2 NFRs)**:
- NFR-ACC-001: AI Pattern False Positive Rate (<5%)
- NFR-ACC-002: Intake Field Accuracy (80-90%)
- NFR-ACC-005: Security Attack Detection (100% known vectors)

**Security (2 NFRs)**:
- NFR-SEC-001: Content Privacy (Zero external API calls)
- NFR-SEC-003: File Permissions Security (Match source)

**Usability (3 NFRs)**:
- NFR-USE-001: AI Validation Learning Curve (1-2 cycles)
- NFR-USE-004: First-Time Setup Friction (<15 minutes)
- NFR-USE-005: Error Message Clarity (100% include remediation)

**Total P0 NFRs**: 12 (Security, Usability, Performance, Accuracy)

### 15.3 P1 NFRs (High Value, Post-MVP)

**Performance (4 NFRs)**:
- NFR-PERF-004: Multi-Agent Workflow Completion (15-20 min)
- NFR-PERF-005: Traceability Validation (<90s for 10k nodes)
- NFR-PERF-006: Metrics Collection Overhead (<5%)
- NFR-PERF-007: Template Selection Time (<2 min)

**Quality (4 NFRs)**:
- NFR-QUAL-001: Multi-Agent Reviewer Sign-offs (3+ reviewers)
- NFR-QUAL-002: Requirements Traceability Coverage (100%)
- NFR-QUAL-003: Test Coverage Targets (80%/70%/50%)
- NFR-QUAL-004: Test Template Completeness (All types)

**Completeness (5 NFRs)**:
- NFR-COMP-001: AI Pattern Database Size (1000+ patterns)
- NFR-COMP-002: Intake Critical Field Coverage (100%)
- NFR-COMP-003: SDLC Artifact Completeness (100%)
- NFR-COMP-004: Orphan Artifact Detection (100%)

**Security (2 NFRs)**:
- NFR-SEC-002: Pattern Database Integrity (SHA-256)
- NFR-SEC-004: Backup Integrity (SHA-256)

**Usability (3 NFRs)**:
- NFR-USE-002: Validation Feedback Clarity (Line numbers + suggestions)
- NFR-USE-003: Progress Visibility (Real-time scores)
- NFR-USE-006: Onboarding Time Savings (50% vs manual)

**Data Retention (3 NFRs)**:
- NFR-DATA-001: Validation History Retention (30 days)
- NFR-DATA-002: Review History Retention (Permanent)
- NFR-DATA-003: Metrics Retention (12 months)

**Freshness (1 NFR)**:
- NFR-FRESH-001: Metrics Data Freshness (Real-time)

**Total P1 NFRs**: 18 (Quality, Completeness, Security, Usability, Retention)

### 15.4 P2 NFRs (Nice-to-Have, Future)

**Performance (2 NFRs)**:
- NFR-PERF-008: Test Suite Generation (<10 min)
- NFR-PERF-010: Security Validation (<10s per plugin)

**Throughput (3 NFRs)**:
- NFR-THRU-001: Batch Validation Throughput (10+ files/min)
- NFR-THRU-002: Parallel File Validation (3-5 concurrent)
- NFR-THRU-003: Iteration Velocity (1-2 weeks)

**Accuracy (3 NFRs)**:
- NFR-ACC-003: Traceability Accuracy (99%)
- NFR-ACC-004: Template Recommendation Acceptance (85%)
- NFR-ACC-006: Security False Positives (<5%)

**Reliability (3 NFRs)**:
- NFR-REL-001: Deployment Success Rate (100%)
- NFR-REL-002: Data Preservation (Zero loss)
- NFR-REL-003: Rollback State Restoration (100%)

**Completeness (1 NFR)**:
- NFR-COMP-005: Orphan Files After Rollback (Zero)

**Scalability (4 NFRs)**:
- NFR-SCAL-001: Maximum Content Size (100,000 words)
- NFR-SCAL-002: Minimum Content Size (100 words)
- NFR-SCAL-003: Maximum Concurrent Agents (25)
- NFR-SCAL-004: Maximum Artifact Size (10,000 words)

**Performance (1 NFR - duplicate categorization)**:
- NFR-PERF-009: Plugin Rollback Time (<5s)

**Total P2 NFRs**: 18 (Throughput, Reliability, Scalability, Polish)

### 15.5 Strategic Rationale

**Focus MVP on 12 P0 NFRs**:
- Security (3 NFRs): Content privacy, file permissions, attack detection - enterprise blockers
- Usability (3 NFRs): Learning curve, setup time, error clarity - adoption barriers
- Performance (4 NFRs): Validation, deployment, analysis - user-facing operations
- Accuracy (2 NFRs): False positives, intake accuracy - trust builders

**Defer 36 NFRs (P1/P2) to accelerate MVP**:
- **Benefit**: Reduces MVP scope by 75% (12 vs 48 NFRs)
- **Risk**: Acceptable - P1/P2 NFRs are enhancements, not blockers
- **Timeline Impact**: Accelerates MVP delivery by 2 weeks

**Post-MVP Roadmap**:
- **Version 1.1** (3 months post-MVP): 18 P1 NFRs (quality, completeness, security)
- **Version 2.0** (6+ months post-MVP): 18 P2 NFRs (throughput, reliability, scalability)

---

## 16. Traceability Matrix

### 16.1 NFR-to-Use-Case Traceability

| NFR ID | Category | Source UC | Test Cases | Priority |
|--------|----------|-----------|-----------|----------|
| NFR-PERF-001 | Performance | UC-001 | TC-001-015 | P0 |
| NFR-PERF-002 | Performance | UC-002 | TC-002-015 | P0 |
| NFR-PERF-003 | Performance | UC-003 | TC-003-015 | P0 |
| NFR-PERF-004 | Performance | UC-004 | TC-004-015 | P1 |
| NFR-PERF-005 | Performance | UC-006 | TC-006-015 | P1 |
| NFR-PERF-006 | Performance | UC-007 | TC-007-015 | P1 |
| NFR-PERF-007 | Performance | UC-008 | TC-008-015 | P1 |
| NFR-PERF-008 | Performance | UC-009 | TC-009-015 | P2 |
| NFR-PERF-009 | Performance | UC-010 | TC-010-015 | P2 |
| NFR-PERF-010 | Performance | UC-011 | TC-011-015 | P2 |
| NFR-THRU-001 | Throughput | UC-001 | TC-001-022 | P2 |
| NFR-THRU-002 | Throughput | UC-001 | TC-001-023 | P2 |
| NFR-THRU-003 | Throughput | UC-005 | TC-FSI-007 | P2 |
| NFR-ACC-001 | Accuracy | UC-001 | TC-001-016 | P0 |
| NFR-ACC-002 | Accuracy | UC-003 | TC-003-016 | P0 |
| NFR-ACC-003 | Accuracy | UC-006 | TC-006-016 | P2 |
| NFR-ACC-004 | Accuracy | UC-008 | TC-008-016 | P2 |
| NFR-ACC-005 | Accuracy | UC-011 | TC-011-016 | P0 |
| NFR-ACC-006 | Accuracy | UC-011 | TC-011-017 | P2 |
| NFR-QUAL-001 | Quality | UC-004 | TC-004-017 | P1 |
| NFR-QUAL-002 | Quality | UC-004, UC-006 | TC-004-018, TC-006-017 | P1 |
| NFR-QUAL-003 | Quality | UC-009 | TC-009-017 | P1 |
| NFR-QUAL-004 | Quality | UC-009 | TC-009-018 | P1 |
| NFR-COMP-001 | Completeness | UC-001 | TC-001-018 | P1 |
| NFR-COMP-002 | Completeness | UC-003 | TC-003-018 | P1 |
| NFR-COMP-003 | Completeness | UC-005 | TC-FSI-018 | P1 |
| NFR-COMP-004 | Completeness | UC-006 | TC-006-018 | P1 |
| NFR-COMP-005 | Completeness | UC-010 | TC-010-018 | P2 |
| NFR-SEC-001 | Security | UC-001 | TC-001-017 | P0 |
| NFR-SEC-002 | Security | UC-001 | TC-001-018 | P1 |
| NFR-SEC-003 | Security | UC-002 | TC-002-017 | P0 |
| NFR-SEC-004 | Security | UC-002 | TC-002-018 | P1 |
| NFR-REL-001 | Reliability | UC-002 | TC-002-019 | P2 |
| NFR-REL-002 | Reliability | UC-002 | TC-002-020 | P2 |
| NFR-REL-003 | Reliability | UC-010 | TC-010-019 | P2 |
| NFR-USE-001 | Usability | UC-001 | TC-001-019 | P0 |
| NFR-USE-002 | Usability | UC-001 | TC-001-020 | P1 |
| NFR-USE-003 | Usability | UC-001 | TC-001-021 | P1 |
| NFR-USE-004 | Usability | UC-002 | TC-002-021 | P0 |
| NFR-USE-005 | Usability | UC-002 | TC-002-022 | P0 |
| NFR-USE-006 | Usability | UC-008 | TC-008-017 | P1 |
| NFR-DATA-001 | Data Retention | UC-001 | TC-001-022 | P1 |
| NFR-DATA-002 | Data Retention | UC-004 | TC-004-019 | P1 |
| NFR-DATA-003 | Data Retention | UC-007 | TC-007-016 | P1 |
| NFR-FRESH-001 | Freshness | UC-007 | TC-007-017 | P1 |
| NFR-SCAL-001 | Scalability | UC-001 | TC-001-020 | P2 |
| NFR-SCAL-002 | Scalability | UC-001 | TC-001-021 | P2 |
| NFR-SCAL-003 | Scalability | UC-004 | TC-004-021 | P2 |
| NFR-SCAL-004 | Scalability | UC-004 | TC-004-022 | P2 |

### 16.2 NFR-to-Component Traceability

| NFR Category | Affected Components (SAD Reference) |
|--------------|-----------------------------------|
| Performance | WritingValidator (5.1), CLI Entry Point (2.1), IntakeCoordinator (5.2), CoreOrchestrator (4.2), TraceabilityEngine (5.3), MetricsCollector (5.3), TemplateSelector (2.1), TestEngineer (5.1), PluginManager (5.1), SecurityScanner (5.1) |
| Throughput | WritingValidator (5.1), IterationPlanner (5.1), RetrospectiveFacilitator (5.1) |
| Accuracy | PatternDetector (5.1), CodebaseAnalyzer (5.2), TraceabilityEngine (5.3), TemplateSelector (2.1), SecurityScanner (5.1) |
| Quality | DocumentationSynthesizer (5.1), Review Agents (5.1), TraceabilityEngine (5.3), Test Suite (11.3), Template Library (10.1) |
| Completeness | PatternDetector (5.1), IntakeCoordinator (5.2), SDLC Agents (5.1), TraceabilityEngine (5.3), PluginManager (5.1) |
| Security | WritingValidator (5.1), deploy-agents.mjs (2.1), PluginManager (5.1), PluginSandbox (5.1) |
| Reliability | deploy-agents.mjs (2.1), PluginManager (5.1) |
| Usability | WritingValidator (5.1), CLI Entry Point (2.1), deploy-agents.mjs (2.1), TemplateSelector (2.1) |
| Data Retention | WritingValidator (5.1), DocumentationSynthesizer (5.1), MetricsCollector (5.3) |
| Freshness | MetricsCollector (5.3) |
| Scalability | WritingValidator (5.1), CoreOrchestrator (4.2), DocumentationSynthesizer (5.1) |

### 16.3 NFR-to-ADR Traceability

| NFR ID | Related ADRs |
|--------|--------------|
| NFR-PERF-002, NFR-SEC-003, NFR-REL-001, NFR-REL-002, NFR-REL-003, NFR-SEC-004, NFR-COMP-005 | ADR-006: Plugin Rollback Strategy (reset + redeploy, backup integrity) |
| NFR-PERF-009 | ADR-007: Framework-Scoped Workspace Architecture (4-tier workspace design) |

---

## 17. References

### 17.1 AIWG Project Documents

- **Use Case Specifications**: UC-001 through UC-012 (`.aiwg/requirements/use-cases/`)
- **Software Architecture Document**: `.aiwg/architecture/software-architecture-doc.md`
- **Solution Profile Document**: `.aiwg/intake/solution-profile.md`
- **Elaboration Phase Plan**: `.aiwg/planning/elaboration-phase-plan.md`
- **Architecture Decision Records**: `.aiwg/architecture/adrs/` (ADR-006, ADR-007)

### 17.2 Requirements Workshop Artifacts

- **NFR Extraction List**: `.aiwg/working/nfr-extraction-list.md` (48 NFRs with traceability)
- **Product Strategist Review**: `.aiwg/working/requirements-workshop-reviews/product-strategist-review.md` (P0/P1/P2 prioritization)
- **Test Architect Review**: `.aiwg/working/requirements-workshop-reviews/test-architect-review.md` (Testing strategies)

### 17.3 External Standards

- **ISO/IEC 25010**: Software Quality Model (performance, usability, security, reliability)
- **IEEE 830-1998**: Recommended Practice for Software Requirements Specifications
- **NIST SP 800-53**: Security and Privacy Controls for Information Systems

---

**Document Status**: BASELINED
**Version**: 1.1
**Date**: 2025-10-19
**Owner**: Requirements Documenter
**Reviewers**: Product Strategist (APPROVED), Test Architect (CONDITIONAL - 3 blockers), Security Architect (PENDING)
**Next Review**: Construction Week 1 (validate performance baselines established)
