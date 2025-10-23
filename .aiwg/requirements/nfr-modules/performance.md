# Performance Requirements Module

**Parent Document**: [Supplemental Specification](../supplemental-specification.md)
**Category**: Performance, Throughput, Scalability
**NFR Count**: 27 (9 P0, 8 P1, 10 P2)
**Version**: 1.3
**Last Updated**: 2025-10-22

## Overview

This module contains all performance-related non-functional requirements including response time targets, throughput metrics, and scalability limits.

## NFRs in This Module

- NFR-PERF-001: Content Validation Time [P0]
- NFR-PERF-002: SDLC Deployment Time [P0]
- NFR-PERF-003: Codebase Analysis Time [P0]
- NFR-PERF-004: Multi-Agent Workflow Completion [P1]
- NFR-PERF-005: Traceability Validation Time [P1]
- NFR-PERF-006: Metrics Collection Overhead [P1]
- NFR-PERF-007: Template Selection Time [P1]
- NFR-PERF-008: Test Suite Generation Time [P2]
- NFR-PERF-009: Plugin Rollback Time [P2]
- NFR-PERF-010: Security Validation Time [P2]
- NFR-SCAL-001: Maximum Content Size [P2]
- NFR-SCAL-002: Minimum Content Size [P2]
- NFR-SCAL-003: Maximum Concurrent Agents [P2]
- NFR-SCAL-004: Maximum Artifact Size [P2]
- NFR-TEST-01: Test Generation Time [P0]
- NFR-TEST-02: Test Case Derivation Speed [P1]
- NFR-TEST-03: Coverage Calculation Speed [P1]
- NFR-THRU-001: Batch Validation Throughput [P2]
- NFR-THRU-002: Parallel File Validation [P2]
- NFR-THRU-003: Iteration Velocity [P2]
- NFR-TMPL-01: Template Catalog Search Time [P0]
- NFR-TMPL-02: Template Selection Time (First-Time User) [P0]
- NFR-TMPL-03: Template Copy and Placeholder Replacement [P1]
- NFR-TRACE-01: Requirements Scan Time [P0]
- NFR-TRACE-02: Code Scan Time [P0]
- NFR-TRACE-03: Test Scan Time [P0]
- NFR-TRACE-04: CSV Generation Time [P1]

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

---

### NFR-TEST-01: Test Generation Time [P0]

**Description**: Automated test generation completes within acceptable time for productivity workflows.

**Rationale**: Developer productivity depends on fast test generation. Slow generation (>10 minutes) blocks test planning and development.

**Measurement Criteria**:
- **Target**: <10 minutes for 100 requirements (wall-clock time)
- **Measurement Methodology**: End-to-end test generation timer from invocation to completion
- **Baseline**: TBD (establish baseline in Construction Week 3)

**Testing Approach**: **Automated** - Test generation benchmark with timer

**Priority**: **P0** - Critical for test-driven development workflows. Slow generation blocks testing phase, reducing developer productivity.

**Traceability**:
- **Source**: UC-009 (Test Templates)
- **Test Cases**: TC-TEST-001, TC-TEST-003, TC-TEST-010
- **Components**: TestEngineer agent, TestGenerator
- **ADRs**: None

**Target Value**: <10 minutes for 100 requirements

**Current Baseline**: TBD (measure in Construction Week 3)

**Implementation Notes**:
- Generate tests in parallel (unit, integration, E2E simultaneously)
- Use template-based generation (avoid expensive analysis)
- Cache use case metadata (avoid re-parsing requirements)

---

---

### NFR-TEST-02: Test Case Derivation Speed [P1]

**Description**: Individual test case derivation completes quickly for real-time feedback.

**Rationale**: Rapid feedback loop essential for test-driven development. Immediate test case generation enables iterative refinement.

**Measurement Criteria**:
- **Target**: <5 seconds per use case
- **Measurement Methodology**: Per-use-case derivation timer, averaged across 100 use cases
- **Baseline**: TBD (establish baseline in Construction Week 3)

**Testing Approach**: **Automated** - Test case derivation benchmark

**Priority**: **P1** - High value for iterative development. Fast derivation enables real-time test planning.

**Traceability**:
- **Source**: UC-009 (Test Templates)
- **Test Cases**: TC-TEST-002, TC-TEST-008
- **Components**: TestCaseDeriver, ScenarioParser
- **ADRs**: None

**Target Value**: <5 seconds per use case

**Current Baseline**: TBD (measure in Construction Week 3)

**Implementation Notes**:
- Parse use case flows efficiently (single-pass parsing)
- Use template matching (avoid expensive scenario analysis)
- Cache scenario patterns (avoid recompiling regex)

---

---

### NFR-TEST-03: Coverage Calculation Speed [P1]

**Description**: Test coverage calculation completes quickly for instant metrics.

**Rationale**: Instant coverage metrics essential for test planning. No delay ensures users can validate coverage targets immediately.

**Measurement Criteria**:
- **Target**: <2 seconds for 500 test cases
- **Measurement Methodology**: Coverage calculation timer from invocation to result display
- **Baseline**: TBD (establish baseline in Construction Week 3)

**Testing Approach**: **Automated** - Coverage calculation benchmark

**Priority**: **P1** - High value for test planning workflows. Instant metrics enable rapid validation of test coverage.

**Traceability**:
- **Source**: UC-009 (Test Templates)
- **Test Cases**: TC-TEST-005
- **Components**: CoverageCalculator, TraceabilityEngine
- **ADRs**: None

**Target Value**: <2 seconds for 500 test cases

**Current Baseline**: TBD (measure in Construction Week 3)

**Implementation Notes**:
- Use incremental coverage updates (avoid recalculating all coverage)
- Cache traceability links (avoid rebuilding graph)
- Pre-compute coverage statistics (update on test case changes only)

---

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

---

### NFR-TMPL-01: Template Catalog Search Time [P0]

**Description**: Template catalog search completes quickly to maintain user workflow responsiveness.

**Rationale**: Responsiveness critical for user experience with 100+ templates. Slow search creates perception of heavyweight tooling.

**Measurement Criteria**:
- **Target**: <2 seconds (95th percentile)
- **Measurement Methodology**: Search operation timer from invocation to result display, 100 runs
- **Baseline**: TBD (establish baseline in Construction Week 2)

**Testing Approach**: **Automated** - Search performance benchmark with various query patterns

**Priority**: **P0** - Critical for onboarding and template discovery. Slow search blocks user workflow, reducing adoption.

**Traceability**:
- **Source**: UC-008 (Template Selection)
- **Test Cases**: TC-TMPL-002, TC-TMPL-006, TC-TMPL-010
- **Components**: TemplateSelector, TemplateCatalog
- **ADRs**: None

**Target Value**: <2 seconds (95th percentile) for template catalog search

**Current Baseline**: TBD (measure in Construction Week 2)

**Implementation Notes**:
- Index template metadata (avoid scanning all templates on every search)
- Use fuzzy matching with efficient algorithm (Levenshtein distance with early termination)
- Cache search results for common queries

---

---

### NFR-TMPL-02: Template Selection Time (First-Time User) [P0]

**Description**: First-time users can select correct template quickly with guided workflow.

**Rationale**: Onboarding friction reduction critical for adoption. 50% time savings vs manual browsing justifies guided workflow investment.

**Measurement Criteria**:
- **Target**: <5 minutes (95th percentile)
- **Measurement Methodology**: User study with first-time users, timed from template search to selection
- **Baseline**: TBD (establish baseline in Construction Week 2)

**Testing Approach**: **Manual** - User study with 20+ first-time users measuring time-to-selection

**Priority**: **P0** - Critical for onboarding conversion. Slow template selection creates barrier to adoption.

**Traceability**:
- **Source**: UC-008 (Template Selection)
- **Test Cases**: TC-TMPL-001
- **Components**: TemplateSelector, IntakeWizard
- **ADRs**: None

**Target Value**: <5 minutes (95th percentile) for first-time users to find correct template

**Current Baseline**: TBD (measure in Construction Week 2 with user study)

**Implementation Notes**:
- Provide context-aware recommendations (phase, artifact type, project type)
- Show template previews (avoid opening each template file)
- Limit recommendation set (top 3 templates based on context)

---

---

### NFR-TMPL-03: Template Copy and Placeholder Replacement [P1]

**Description**: Template instantiation completes quickly to provide instant feedback.

**Rationale**: Perceived performance critical for user satisfaction. Instant feedback reinforces tool responsiveness.

**Measurement Criteria**:
- **Target**: <5 seconds (95th percentile)
- **Measurement Methodology**: Copy operation timer from invocation to completion, 100 runs
- **Baseline**: TBD (establish baseline in Construction Week 2)

**Testing Approach**: **Automated** - Template copy benchmark with performance timer

**Priority**: **P1** - High value for user experience. Fast instantiation provides satisfying instant feedback.

**Traceability**:
- **Source**: UC-008 (Template Selection)
- **Test Cases**: TC-TMPL-004
- **Components**: TemplateInstantiator, PlaceholderReplacer
- **ADRs**: None

**Target Value**: <5 seconds (95th percentile) for template copy and placeholder replacement

**Current Baseline**: TBD (measure in Construction Week 2)

**Implementation Notes**:
- Use streaming file copy (avoid buffering entire template in memory)
- Parallelize placeholder replacement (process sections concurrently)
- Pre-compile placeholder regex patterns

---

---

### NFR-TRACE-01: Requirements Scan Time [P0]

**Description**: Automated traceability requirement scanning completes within acceptable time for CI/CD integration.

**Rationale**: Baseline loading speed critical for developer productivity. Rapid feedback loop essential for iterative development.

**Measurement Criteria**:
- **Target**: <10 seconds for 200 requirements files (95th percentile)
- **Measurement Methodology**: 95th percentile scan time measured across 100 validation runs on projects with 200 requirements files
- **Baseline**: TBD (establish baseline in Construction Week 1)

**Testing Approach**: **Automated** - Automated benchmarking with performance profiler on standard developer hardware (4 cores, 8GB RAM, SSD)

**Priority**: **P0** - Critical for CI/CD integration. Without fast requirement scanning, traceability validation becomes bottleneck in CI/CD pipeline.

**Traceability**:
- **Source**: UC-006 (Automated Traceability)
- **Test Cases**: TC-TRACE-003, TC-TRACE-015
- **Components**: RequirementsLoader, FileScanner, MetadataParser
- **ADRs**: ADR-006 (Plugin Rollback Strategy)

**Target Value**: <10 seconds (95th percentile) for 200 requirements files

**Current Baseline**: TBD (measure in Construction Week 1)

**Implementation Notes**:
- Use parallel file reading (multi-threaded I/O)
- Cache parsed requirement metadata for unchanged files
- Optimize regex pattern compilation (compile once, reuse)

---

---

### NFR-TRACE-02: Code Scan Time [P0]

**Description**: Automated traceability code scanning completes within acceptable time for CI/CD integration.

**Rationale**: Implementation mapping speed critical to avoid blocking developers. Slow scans interrupt development flow.

**Measurement Criteria**:
- **Target**: <30 seconds for 1,000 files (95th percentile)
- **Measurement Methodology**: 95th percentile scan time measured across 100 validation runs on projects with 1,000 code files
- **Baseline**: TBD (establish baseline in Construction Week 1)

**Testing Approach**: **Automated** - Automated benchmarking with performance profiler on standard developer hardware (4 cores, 8GB RAM, SSD)

**Priority**: **P0** - Critical for CI/CD integration. Implementation mapping must be fast to avoid blocking developers during continuous integration.

**Traceability**:
- **Source**: UC-006 (Automated Traceability)
- **Test Cases**: TC-TRACE-003, TC-TRACE-015
- **Components**: CodeScanner, CommentParser, TraceabilityEngine
- **ADRs**: ADR-006 (Plugin Rollback Strategy)

**Target Value**: <30 seconds (95th percentile) for 1,000 files

**Current Baseline**: TBD (measure in Construction Week 1)

**Implementation Notes**:
- Use parallel file reading (multi-threaded I/O)
- Skip binary files and excluded directories (node_modules/, .git/)
- Implement incremental scanning (cache unchanged files)

---

---

### NFR-TRACE-03: Test Scan Time [P0]

**Description**: Automated traceability test scanning completes within acceptable time for CI/CD integration.

**Rationale**: Test mapping speed critical for CI/CD pipeline performance. Rapid validation essential for test-driven development.

**Measurement Criteria**:
- **Target**: <20 seconds for 500 test files (95th percentile)
- **Measurement Methodology**: 95th percentile scan time measured across 100 validation runs on projects with 500 test files
- **Baseline**: TBD (establish baseline in Construction Week 1)

**Testing Approach**: **Automated** - Automated benchmarking with performance profiler on standard developer hardware (4 cores, 8GB RAM, SSD)

**Priority**: **P0** - Critical for CI/CD integration. Test mapping must be fast to provide immediate feedback on test coverage.

**Traceability**:
- **Source**: UC-006 (Automated Traceability)
- **Test Cases**: TC-TRACE-003, TC-TRACE-015
- **Components**: TestScanner, TestCaseParser, TraceabilityEngine
- **ADRs**: ADR-006 (Plugin Rollback Strategy)

**Target Value**: <20 seconds (95th percentile) for 500 test files

**Current Baseline**: TBD (measure in Construction Week 1)

**Implementation Notes**:
- Use parallel file reading (multi-threaded I/O)
- Parse test metadata (test IDs, requirement links) efficiently
- Cache test file metadata for unchanged files

---

---

### NFR-TRACE-04: CSV Generation Time [P1]

**Description**: Traceability CSV report generation completes quickly to minimize overhead.

**Rationale**: Report generation speed impacts user experience. Fast generation enables on-demand reporting without delays.

**Measurement Criteria**:
- **Target**: <5 seconds for 200 requirements (95th percentile)
- **Measurement Methodology**: 95th percentile generation time measured across 100 report generation runs
- **Baseline**: TBD (establish baseline in Construction Week 1)

**Testing Approach**: **Automated** - Report generation benchmark with performance timer

**Priority**: **P1** - High value for reporting workflows. Minimal overhead ensures users can generate reports on-demand.

**Traceability**:
- **Source**: UC-006 (Automated Traceability)
- **Test Cases**: TC-TRACE-013
- **Components**: ReportGenerator, CSVFormatter
- **ADRs**: None

**Target Value**: <5 seconds (95th percentile) for 200 requirements

**Current Baseline**: TBD (measure in Construction Week 1)

**Implementation Notes**:
- Use streaming CSV generation (avoid buffering entire report in memory)
- Pre-compute summary statistics (avoid recalculating on every report)
- Cache traceability graph (avoid rebuilding for reports)

---

---

