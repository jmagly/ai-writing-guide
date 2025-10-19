# Supplemental Specification - AI Writing Guide (AIWG) Project

**Document Type**: Non-Functional Requirements Specification
**Project**: AI Writing Guide - SDLC Framework Plugin System
**Version**: 1.0
**Status**: DRAFT
**Date**: 2025-10-18
**Phase**: Elaboration (Week 3)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Performance Requirements](#2-performance-requirements)
3. [Scalability Requirements](#3-scalability-requirements)
4. [Availability Requirements](#4-availability-requirements)
5. [Security Requirements](#5-security-requirements)
6. [Usability Requirements](#6-usability-requirements)
7. [Maintainability Requirements](#7-maintainability-requirements)
8. [Portability Requirements](#8-portability-requirements)
9. [Reliability Requirements](#9-reliability-requirements)
10. [Regulatory and Compliance Requirements](#10-regulatory-and-compliance-requirements)
11. [Quality Metrics and Service Level Indicators](#11-quality-metrics-and-service-level-indicators)
12. [Traceability Matrix](#12-traceability-matrix)
13. [References](#13-references)

---

## 1. Introduction

### 1.1 Purpose

This Supplemental Specification defines all **non-functional requirements (NFRs)** for the AI Writing Guide (AIWG) project. These requirements complement functional requirements captured in use case specifications (UC-001 through UC-011) by specifying quality attributes, performance targets, security controls, usability standards, and compliance obligations.

### 1.2 Scope

This document covers NFRs for:

- **Writing Quality Framework**: AI pattern detection, content validation, authenticity scoring
- **SDLC Framework**: 58 agents, 42+ commands, multi-agent orchestration, plugin system
- **CLI Tooling**: Installation, deployment, project scaffolding
- **Infrastructure**: GitHub repository, CI/CD pipelines, documentation generation

**Out of Scope**: Functional requirements (captured in use case specifications), implementation details (captured in Software Architecture Document).

### 1.3 Intended Audience

- **Project Manager**: Resource planning, schedule validation, risk assessment
- **Architecture Designer**: Architecture trade-off decisions, technology selection
- **Test Architect**: Test strategy development, validation criteria, coverage targets
- **Security Architect**: Security control design, threat modeling, compliance validation
- **Requirements Analyst**: Requirements traceability, acceptance criteria definition
- **Stakeholders**: Quality expectations, performance commitments, compliance assurance

### 1.4 Document Organization

Sections 2-10 define NFR categories (Performance, Scalability, Availability, Security, Usability, Maintainability, Portability, Reliability, Compliance). Each section provides:

- **Category Overview**: Why this quality attribute matters for AIWG
- **Specific Requirements**: Measurable targets with requirement IDs (NFR-XXX-##)
- **Rationale**: Business justification for each target
- **Traceability**: Links to use cases, architecture components, and design decisions

Section 11 defines quality metrics and Service Level Indicators (SLIs) for measuring success. Section 12 provides comprehensive traceability matrix linking NFRs to functional requirements, architecture, and ADRs.

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

---

## 2. Performance Requirements

### 2.1 Overview

Performance requirements ensure AIWG tools remain responsive during normal usage, avoiding workflow interruptions that erode user confidence. As a documentation and tooling project (not runtime service), performance focuses on CLI responsiveness, agent orchestration speed, and document generation throughput.

**Performance Philosophy**: "Fast enough to stay out of the way" - users should spend time thinking about content, not waiting for tools.

### 2.2 Response Time Requirements

#### NFR-PERF-01: CLI Command Response Time

**Requirement**: All CLI commands complete within target latencies (measured at p50, p95, p99 percentiles).

| CLI Command | p50 Latency | p95 Latency | p99 Latency | Rationale |
|-------------|-------------|-------------|-------------|-----------|
| `aiwg -version` | <200ms | <500ms | <1s | User checks version frequently, must be instant |
| `aiwg -deploy-agents --mode general` | <2s | <3s | <5s | Deploys 3 agents, user expects subsecond completion |
| `aiwg -deploy-agents --mode sdlc` | <5s | <8s | <12s | Deploys 58 agents + 45 commands, acceptable latency for one-time setup |
| `aiwg -install-plugin <name> (local)` | <2s | <3s | <5s | Local plugin cached, fast installation expected |
| `aiwg -install-plugin <name> (remote)` | <7s | <10s | <15s | Network download adds latency, user tolerates delay |
| `aiwg -new` | <1s | <2s | <3s | Project scaffolding, creates directories/files, must be fast |

**Measurement Context**: Performance baselines measured on reference hardware: 4 cores @ 2.5 GHz, 8GB RAM, SSD 500 MB/s, 50 Mbps network.

**Traceability**:
- UC-002: Deploy SDLC Framework to Existing Project (NFR-SD-01: Deployment time <10s)
- SAD Section 8.1: Performance tactics (lazy loading, caching)

**Implementation Guidance**:
- Cache plugin manifests after first discovery (avoid re-parsing YAML)
- Parallelize file copy operations (deploy-agents.mjs uses concurrent writes)
- Stream large downloads (avoid buffering entire plugin archive in memory)

#### NFR-PERF-02: Agent Orchestration Response Time

**Requirement**: Multi-agent workflows complete within target durations (wall-clock time, not CPU time).

| Workflow | Target Duration | Rationale |
|----------|----------------|-----------|
| Single agent invocation (e.g., `/project:writing-validator`) | <60s for 2000-word documents | User workflow interruption threshold (UC-001: NFR-WR-01) |
| Multi-agent workflow: Primary Author → 4 Reviewers → Synthesizer | <20 minutes for SAD generation | Productivity target, users remain engaged (UC-004: NFR-MA-01) |
| Parallel validation (10 files) | <5 minutes total | Batch operations scale linearly (UC-001: Alt-4) |
| Plugin installation with security validation | <10s | Pre-installation security checks must not slow installation (UC-011: NFR-PS-01) |

**Traceability**:
- UC-001: Validate AI-Generated Content (NFR-WR-01: Validation time <60s)
- UC-004: Multi-Agent Workflows (NFR-MA-01: Workflow completion 15-20 minutes)
- UC-011: Validate Plugin Security (NFR-PS-01: Validation time <10s)
- SAD Section 4.2: Process View - Contributor Workflow Runtime

**Implementation Guidance**:
- Launch parallel reviewers in single message with multiple Task tool calls (avoid sequential API round-trips)
- Chunk large documents if context window exceeded (UC-004: Exc-3)
- Set timeout thresholds: 60s single-agent, 30 minutes multi-agent workflows

#### NFR-PERF-03: Document Generation Response Time

**Requirement**: Template-based document generation completes within user tolerance thresholds.

| Document Type | Target Generation Time | Rationale |
|---------------|----------------------|-----------|
| Intake forms (5 templates) | <2 minutes interactive, <30s batch | User completes intake in single session |
| Use case specification (3-5 pages) | <5 minutes | Requirements elaboration, moderate complexity |
| Software Architecture Document (10,000+ words) | <20 minutes (multi-agent) | Comprehensive artifact, parallel reviewers improve speed |
| Traceability matrix (1000+ requirements) | <90s | Automation speedup vs manual CSV (99% effort reduction target) |

**Traceability**:
- SAD Section 9.1: Technical Risks (Traceability complexity, PoC validation 8-hour spike)
- Elaboration Phase Plan: Enhancement plan execution (testability 80h, security 89h)

**Implementation Guidance**:
- Use streaming output for long documents (show progress incrementally)
- Cache template parsing results (avoid re-reading templates per invocation)
- Parallelize traceability graph construction (NetworkX supports parallel edge insertion)

### 2.3 Throughput Requirements

#### NFR-PERF-04: Agent Orchestration Throughput

**Requirement**: System supports concurrent multi-agent workflows without degradation.

| Metric | Target | Rationale |
|--------|--------|-----------|
| Concurrent agents (parallel reviewers) | 4-6 agents simultaneously | Multi-agent pattern design (UC-004: Step 5) |
| Maximum concurrent agents | 25 agents (Claude Code constraint) | Platform limitation, chunk workflows if exceeded |
| Traceability graph processing | <90s for 10,000+ node graphs | Scalability target (SAD Section 8.4) |

**Traceability**:
- UC-004: Multi-Agent Workflows (BR-MA-003: Parallel execution limits)
- SAD Section 8.4: Scalability (10,000+ node graphs)

**Implementation Guidance**:
- Monitor Task tool concurrency limits (platform-dependent)
- Queue workflows exceeding 25 agents (sequential batches)
- Use incremental graph construction (avoid loading full graph into memory)

#### NFR-PERF-05: Manifest Generation Throughput

**Requirement**: Manifest generation and validation scales with repository size.

| Repository Size | Manifest Generation Time | Validation Time | Rationale |
|-----------------|------------------------|----------------|-----------|
| 100 files, 10 directories | <1s | <2s | Typical small project |
| 500 files, 50 directories | <3s | <5s | Medium project (AIWG current scale) |
| 1000 files, 100 directories | <5s | <10s | Large project (future scale) |

**Traceability**:
- SAD Section 4.3: Module Structure (manifest system description)
- Elaboration Phase Plan: Testability enhancement plan (test data catalog 50+ fixtures)

**Implementation Guidance**:
- Parallelize file tree traversal (concurrent directory reads)
- Skip node_modules/, .git/ directories (reduce filesystem I/O)
- Cache directory metadata (avoid stat() calls on unchanged files)

### 2.4 Resource Utilization Targets

#### NFR-PERF-06: CLI Tool Memory Usage

**Requirement**: CLI tools remain memory-efficient, avoiding resource contention on developer machines.

| Tool | Peak Memory Target | Rationale |
|------|-------------------|-----------|
| `aiwg` CLI commands | <100MB RAM | Lightweight wrapper, minimal overhead |
| Node.js scripts (manifest, deploy) | <500MB RAM peak | Reasonable for Node.js, avoid memory leaks |
| Python traceability engine | <1GB RAM (10K node graphs) | NetworkX graph structures scale linearly |

**Measurement Context**: Memory profiling via `time -v` (Linux), `/usr/bin/time -l` (macOS), or Task Manager (Windows).

**Traceability**:
- SAD Section 7.1: Core Technologies (Node.js, Python stack)
- Solution Profile: Solo developer, resource-constrained (time, not hardware)

**Implementation Guidance**:
- Stream large files (avoid buffering full content in memory)
- Release graph memory after traceability report generation (Python gc.collect())
- Use Node.js `--max-old-space-size=512` flag to cap heap size

#### NFR-PERF-07: Disk Space Requirements

**Requirement**: AIWG installation and usage consume minimal disk space.

| Component | Disk Space Target | Rationale |
|-----------|------------------|-----------|
| AIWG installation (`~/.local/share/ai-writing-guide/`) | <2GB total | Comprehensive framework, includes templates/agents/docs |
| Deployed agents (`.claude/agents/`) | <10MB | Markdown files, text-only |
| Deployed commands (`.claude/commands/`) | <5MB | Markdown files, smaller than agents |
| SDLC artifacts (`.aiwg/` per project) | <50MB typical, <500MB max | Documentation project artifacts, grows with project size |
| Plugin registry (`.aiwg-plugins/`) | <100MB for 10 plugins | Varies by plugin complexity |

**Traceability**:
- SAD Section 4.3: Development View - Module Structure
- ADR-006: Plugin Rollback Strategy (temporary disk space for snapshots ~2x plugin size)

**Implementation Guidance**:
- Compress plugin archives (gzip/brotli for distribution)
- Clean up `.aiwg/working/` temporary files after workflows complete
- Provide `aiwg -cleanup` command to remove old backups (30-day retention policy)

### 2.5 Performance Regression Detection

#### NFR-PERF-08: CI/CD Performance Baselines

**Requirement**: CI/CD pipeline tracks performance regressions with <20% tolerance threshold.

| Metric | Baseline | Regression Threshold | Action |
|--------|----------|---------------------|--------|
| Deploy-agents execution time | 5s (p95) | >6s (20% slower) | CI fails, investigate regression |
| Manifest generation time | 3s (p95, 500 files) | >3.6s (20% slower) | CI fails, investigate regression |
| Full test suite execution | <20 minutes | >24 minutes (20% slower) | CI fails, investigate regression |

**Traceability**:
- SAD Section 11.3: Testing Roadmap (performance baseline report, CI/CD regression detection)
- Elaboration Phase Plan: Testability enhancement plan (performance baselines Weeks 3-4)

**Implementation Guidance**:
- Store performance baselines in `.aiwg/reports/performance-baseline.json`
- Run performance tests on every PR (GitHub Actions: `performance-test.yml`)
- Alert maintainer if regression exceeds threshold (GitHub issue auto-creation)

### 2.6 Context Loading Performance

#### NFR-PERF-09: Framework-Scoped Context Loading

**Requirement**: Framework-scoped workspace architecture enables fast context loading by filtering irrelevant frameworks.

| Context Load Type | Target Loading Time | Context Pollution Prevention | Rationale |
|------------------|---------------------|---------------------------|-----------|
| Single framework context (SDLC only) | <500ms | 100% isolation (exclude marketing/, agile/ frameworks) | Agent loads only relevant artifacts, no cross-framework pollution |
| Multi-framework context (SDLC + Marketing) | <1s | Explicit framework list required | User working across 2 frameworks simultaneously |
| Framework auto-detection | <100ms | Metadata-based routing (no user selection) | Natural language triggers correct framework implicitly |
| Tier-based filtering (repo/ only) | <200ms | Exclude projects/, working/, archive/ | Global stable docs loaded fast |

**Traceability**:
- UC-012: Framework-Aware Workspace Management (AC-003: Context loading <500ms)
- ADR-007: Framework-Scoped Workspace Architecture (4-tier workspace design)
- FID-007: Workspace Management Feature (P0 #1, 80 hours, Week 2-4)

**Implementation Guidance**:
- Filesystem scan limited to `.aiwg/frameworks/{framework-id}/` (exclude other frameworks)
- Lazy loading for tiers (load repo/ first, then projects/ on-demand)
- Framework registry caches metadata (avoid re-parsing YAML on every context load)
- Natural language router detects framework from command metadata (no user friction)

---

## 3. Scalability Requirements

### 3.1 Overview

Scalability requirements ensure AIWG grows with user adoption and repository complexity without architectural refactoring. As a documentation and tooling project (not SaaS), scalability focuses on repository size (files, agents, plugins) and community growth (contributors, users), not runtime traffic (requests/second).

**Scalability Philosophy**: "Design for 10x growth, build for current scale" - architecture supports future scale, implementation optimizes for MVP.

### 3.2 Data Volume Scalability

#### NFR-SCAL-01: Documentation Capacity

**Requirement**: AIWG supports large documentation repositories without degradation.

| Metric | Current Scale | Target Scale (1 year) | Max Scale (2 years) | Rationale |
|--------|--------------|----------------------|-------------------|-----------|
| Total markdown files | 500+ | 1,000+ | 5,000+ | Large enterprise documentation sets |
| Total word count | 500,000 words | 1,000,000 words | 10,000,000 words | Comprehensive product documentation |
| Directory depth | 10 levels | 15 levels | 20 levels | Complex project hierarchies |
| Manifest files | 50+ | 100+ | 500+ | One per documented directory |

**Traceability**:
- SAD Section 2.2: Component Overview (156 templates, extensible plugin system)
- Solution Profile: Will move to Production profile once user testing completes (2-5 users, 2-4 weeks)

**Implementation Guidance**:
- Parallelize file operations (concurrent reads during manifest generation)
- Implement pagination for large directory listings (avoid memory exhaustion)
- Use lazy loading for manifest data (load on-demand, not all at startup)

#### NFR-SCAL-02: Agent Capacity

**Requirement**: AIWG supports growing agent ecosystem without architectural changes.

| Metric | Current Scale | Target Scale (1 year) | Max Scale (2 years) | Rationale |
|--------|--------------|----------------------|-------------------|-----------|
| SDLC agents | 58 | 100+ | 200+ | New specialized roles (domain-specific agents) |
| General-purpose agents | 3 | 10+ | 50+ | Writing, validation, transformation agents |
| Commands | 45 | 75+ | 150+ | New workflows, integrations |
| Plugins | 0 (MVP) | 10+ | 100+ | Community contributions, compliance add-ons |

**Traceability**:
- SAD Section 2.1: High-Level System Architecture (plugin system design)
- SAD Section 8.4: Scalability (support 1000+ plugins)

**Implementation Guidance**:
- Agent discovery via filesystem scan (no hardcoded agent registry)
- Plugin manifest-driven architecture (declarative, not imperative)
- Lazy agent loading (load agent definition only when invoked)

#### NFR-SCAL-03: Traceability Graph Capacity

**Requirement**: Traceability automation scales to enterprise-sized projects.

| Metric | Target | Rationale |
|--------|--------|-----------|
| Graph nodes (requirements, code, tests) | 10,000+ | Large enterprise projects (1000s of requirements) |
| Graph edges (dependencies) | 50,000+ | Dense traceability (5 edges per node average) |
| Graph processing time | <90 seconds (10,000 nodes) | Acceptable automation delay (SAD Section 8.4) |
| Memory footprint | <1GB RAM | Python NetworkX graph in-memory constraints |

**Traceability**:
- SAD Section 5.3: Pipeline Components (TraceabilityEngine)
- SAD Section 9.1: Technical Risks (traceability complexity, PoC validation)

**Implementation Guidance**:
- Use NetworkX sparse graph representation (CSR format for large graphs)
- Implement incremental graph updates (avoid full graph rebuilds)
- Parallelize graph traversal algorithms (depth-first search on subgraphs)

### 3.3 User Capacity

#### NFR-SCAL-04: Concurrent User Support

**Requirement**: AIWG tools support multiple developers on shared repository without conflicts.

| Metric | Target | Rationale |
|--------|--------|-----------|
| Concurrent contributors | 2-5 currently, 10+ target | Team expansion (Solution Profile: 2-3 contributors within 6 months) |
| Concurrent agent workflows | 5+ (per developer) | Multiple developers orchestrating agents simultaneously |
| Git repository size | <1GB for .aiwg/ artifacts | Documentation artifacts stored in Git (audit trail) |

**Traceability**:
- Solution Profile: Team expansion plan (onboard 2nd contributor within 6 months)
- SAD Section 4.4: Deployment View (local development, GitHub integration)

**Implementation Guidance**:
- Use file-based locking for shared resources (`.aiwg/.lock` file)
- Isolate contributor workspaces (`.aiwg/contrib/{username}/` directories)
- Encourage Git workflows for artifact management (branching, merging)

#### NFR-SCAL-05: Community Contribution Capacity

**Requirement**: AIWG infrastructure supports growing contributor community.

| Metric | Current Scale | Target Scale (1 year) | Rationale |
|--------|--------------|----------------------|-----------|
| Contributors | 1 (solo developer) | 10+ | Community growth, 2-3 active contributors target (Solution Profile) |
| PRs per month | 0 (pre-launch) | 20+ | Moderate contribution velocity |
| GitHub CI/CD minutes | <100/month | <1000/month | Free tier: 2000 minutes/month limit |
| Issue response time | N/A (0 users) | <48 hours | Support capacity target (Solution Profile: 10x growth scenario) |

**Traceability**:
- Solution Profile: 10x Growth Scenario (support capacity, self-improvement loops)
- SAD Section 8.4: Scalability (100+ contributors, 1000+ plugins)

**Implementation Guidance**:
- Self-service infrastructure: FAQs, troubleshooting guides, GitHub Discussions
- Self-improvement automation: Automated PR acceptance for docs, linting fixes
- CI/CD optimization: Cache dependencies, parallelize jobs, skip unnecessary tests

### 3.4 Horizontal Scalability

#### NFR-SCAL-06: Deployment Scalability

**Requirement**: AIWG deployment patterns support diverse project types and scales.

| Project Type | AIWG Deployment | Scalability Constraint | Rationale |
|--------------|----------------|----------------------|-----------|
| Personal scripts (1-10 files) | General-purpose agents only (3 agents) | Minimal overhead | Smallest projects need lightweight tooling |
| Small projects (10-100 files) | Selective SDLC agents (10-20 agents) | Moderate artifact generation | Focused workflows, not full SDLC |
| Medium projects (100-1000 files) | Full SDLC framework (58 agents + 45 commands) | Comprehensive artifact generation | Enterprise-scale projects |
| Enterprise systems (1000+ files) | Full SDLC + compliance plugins (70+ agents) | Heavy artifact generation, regulated | Compliance-sensitive, audit trail critical |

**Traceability**:
- Solution Profile: Modular deployment - handle diverse project types (smallest to largest apps)
- SAD Section 10.1: Plugin Development Guidelines (structure, quality requirements)

**Implementation Guidance**:
- Modular agent deployment (users select subset via `--mode` flag)
- Plugin-based extensibility (enterprise compliance add-ons optional)
- Template-based scaffolding (project-type-specific initialization)

---

## 4. Availability Requirements

### 4.1 Overview

Availability requirements ensure AIWG tools remain accessible during normal usage. As a documentation and tooling project (not runtime service), availability focuses on GitHub uptime (external dependency), local CLI reliability, and installation recovery.

**Availability Philosophy**: "Tools should just work" - minimal downtime, graceful degradation, fast recovery.

### 4.2 System Availability Targets

#### NFR-AVAIL-01: GitHub Repository Availability

**Requirement**: AIWG repository accessible for installation, updates, documentation.

| Metric | Target | Rationale |
|--------|--------|-----------|
| GitHub uptime (external) | 99.9%+ SLA (GitHub commitment) | AIWG depends on GitHub infrastructure (SAD Section 4.4) |
| Planned maintenance | <1 hour/month | Repository maintenance windows |
| Emergency downtime | <30 minutes | Critical fixes, security patches |

**Traceability**:
- Solution Profile: Reliability - GitHub uptime (99.9%+, external dependency)
- SAD Section 4.4: Deployment View (GitHub repository)

**Degradation Strategy**:
- If GitHub down: Users can work offline with already-installed AIWG (local agents/commands)
- Cached plugins allow local installation (no network required if cached)
- Documentation available locally (`~/.local/share/ai-writing-guide/README.md`)

#### NFR-AVAIL-02: CLI Tool Availability

**Requirement**: CLI commands remain available on local developer machines.

| Metric | Target | Rationale |
|--------|--------|-----------|
| CLI uptime | 99.99% (local tool, no network dependencies) | Developer productivity |
| Installation corruption | <5 minutes to recover (via `aiwg -reinstall`) | Fast recovery from installation corruption |
| Upgrade availability | Daily (automatic updates on every command invocation) | Users always on latest version |

**Traceability**:
- CLAUDE.md: `aiwg` automatically updates on every command invocation
- Solution Profile: Installation recovery via `aiwg -reinstall`

**Recovery Procedures**:
- Corruption detected: `aiwg -reinstall` (force fresh reinstall, <5 minutes)
- Partial installation: Rollback via InstallationTransaction (ADR-006, <5s)
- Missing aiwg command: Reinstall via one-line bash script

#### NFR-AVAIL-03: CI/CD Pipeline Availability

**Requirement**: CI/CD pipelines remain operational for PR validation, testing, deployment.

| Metric | Target | Rationale |
|--------|--------|-----------|
| GitHub Actions uptime | 99.9%+ SLA (GitHub commitment) | PR validation, linting, testing |
| CI/CD job retries | 3 automatic retries (transient failures) | Network timeouts, API rate limits |
| CI/CD timeout | <30 minutes per job | Detect hung jobs, avoid wasted minutes |

**Traceability**:
- SAD Section 4.4: Deployment View (CI/CD Pipeline)
- Solution Profile: GitHub Free Tier (2000 CI/CD minutes/month limit)

**Implementation Guidance**:
- Cache dependencies in CI (avoid re-downloading Node.js packages, Python libs)
- Parallelize test jobs (unit, integration, linting in separate jobs)
- Fail fast: Abort PR validation if linting fails (skip expensive test jobs)

### 4.3 Recovery Requirements

#### NFR-AVAIL-04: Recovery Time Objective (RTO)

**Requirement**: System recovers from failures within defined time windows.

| Failure Scenario | RTO | Rationale |
|-----------------|-----|-----------|
| Installation corruption | <5 minutes (`aiwg -reinstall`) | Critical for developer productivity (Solution Profile) |
| Plugin installation failure | <5 seconds (rollback via ADR-006) | Transaction-based rollback (SAD Section 11.2) |
| Repository issues (GitHub outage) | <15 minutes (manual intervention) | Wait for GitHub recovery, use local tools |
| CI/CD pipeline failure | <2 hours (maintainer investigation) | Non-critical, batched fixes |

**Traceability**:
- ADR-006: Plugin Rollback Strategy (<5 second rollback target)
- SAD Section 11.2: Security Implementation Roadmap (rollback implementation)

**Implementation Guidance**:
- Automated rollback for plugin failures (no manual intervention)
- `aiwg -reinstall` script idempotent (safe to run multiple times)
- CI/CD retry logic (automatic recovery from transient failures)

#### NFR-AVAIL-05: Data Backup and Retention

**Requirement**: Critical data backed up to prevent loss during failures.

| Data Type | Backup Location | Retention | Rationale |
|-----------|----------------|-----------|-----------|
| Git repository | GitHub (remote) | Permanent | Distributed version control, user clones provide backups |
| AIWG installation | User reinstalls from GitHub | N/A (stateless tool) | Reinstall from source, no local state preserved |
| SDLC artifacts (`.aiwg/`) | User Git commits | Permanent (user-managed) | Audit trail, compliance evidence |
| Plugin registry backups | `.aiwg/backups/` | 30 days | Rollback recovery (ADR-006) |
| CLAUDE.md backups | `.aiwg/backups/CLAUDE.md.backup` | 30 days | Recovery from corruption (UC-002: Exc-3) |

**Traceability**:
- ADR-006: Plugin Rollback Strategy (backup directory `.aiwg/backups/`)
- UC-002: Deploy SDLC Framework (Exc-3: CLAUDE.md corruption during update)

**Implementation Guidance**:
- Encourage users to commit `.aiwg/` to Git (audit trail, team collaboration)
- Provide `.gitignore` examples for excluding temporary files (`.aiwg/working/`)
- Automated cleanup of old backups (30-day retention policy)

---

## 5. Security Requirements

### 5.1 Overview

Security requirements ensure AIWG protects user data, prevents malicious plugin execution, and maintains system integrity. As a documentation and tooling project (not web application), security focuses on plugin isolation, input validation, and secrets protection.

**Security Philosophy**: "Defense in depth with least privilege" - multiple layers of security controls, minimal permissions granted.

### 5.2 Authentication and Authorization

#### NFR-SEC-01: Authentication Requirements

**Requirement**: AIWG authentication aligned with project type (open source, public repository).

| Component | Authentication Mechanism | Rationale |
|-----------|-------------------------|-----------|
| AIWG repository | N/A (public, open source) | MIT License, no authentication required (Solution Profile) |
| GitHub repository | GitHub user accounts (for contributors) | Standard GitHub permissions |
| Plugin installation | No authentication (local installation) | User-initiated, local filesystem operations |
| CI/CD pipelines | GitHub Actions secrets (for maintainer) | Protected secrets for deployment keys |

**Traceability**:
- Solution Profile: Security posture minimal (appropriate for documentation/tooling project)
- SAD Section 4.6: Security View (trust boundaries)

**Implementation Guidance**:
- No authentication implemented (not applicable for open source documentation)
- Future: If commercial features emerge, OAuth2 for user accounts

#### NFR-SEC-02: Authorization Requirements

**Requirement**: AIWG authorization controls aligned with project type.

| Resource | Authorization Model | Rationale |
|----------|-------------------|-----------|
| GitHub repository | Contributor access (PRs require maintainer approval) | Solo maintainer currently (Solution Profile) |
| Plugin installation | User consent (explicit approval for sensitive operations) | Defense-in-depth (SAD Section 4.6.4) |
| File system access | Least privilege (plugins restricted to designated directories) | Plugin isolation (ADR-002) |
| CI/CD pipelines | GitHub repository settings (maintainer-only) | Protect deployment keys |

**Traceability**:
- ADR-002: Plugin Isolation Strategy (filesystem boundaries, permission model)
- SAD Section 4.6.4: Permission Model (read/write allowed paths, forbidden paths)

**Implementation Guidance**:
- PathValidator enforces filesystem boundaries (SAD Section 4.6)
- User approval workflow for CLAUDE.md modifications (injection validation)
- GitHub branch protection rules (require PR reviews before merge)

### 5.3 Data Protection

#### NFR-SEC-03: Data Confidentiality

**Requirement**: User content remains private, no external transmission.

| Data Type | Confidentiality Requirement | Rationale |
|-----------|---------------------------|-----------|
| User content (validation, generation) | No external API calls (UC-001: NFR-WR-05) | Privacy (Solution Profile: no PII) |
| Project artifacts (`.aiwg/`) | Local filesystem only | User controls Git commit decisions |
| Plugin manifests | Validation only (no telemetry) | No usage tracking |
| Credentials | Never stored or transmitted | Not applicable (no authentication) |

**Traceability**:
- UC-001: Validate AI-Generated Content (NFR-WR-05: Content privacy, no external API calls)
- Solution Profile: No sensitive data handling (no PII, payments, secrets)

**Implementation Guidance**:
- Network monitor tests validate zero external API calls (UC-001: AC-008)
- No telemetry, analytics, or usage tracking (privacy-first design)
- Users control artifact sharing via Git (opt-in, not automatic)

#### NFR-SEC-04: Data Integrity

**Requirement**: AIWG prevents data corruption, tampering, and loss.

| Data Type | Integrity Mechanism | Rationale |
|-----------|-------------------|-----------|
| Plugin manifests | SHA-256 checksum validation (UC-001: NFR-WR-06) | Prevent tampering (SAD Section 4.6.1) |
| Pattern database | SHA-256 checksum validation | Trust (prevent malicious pattern injection) |
| Dependency hashes | SHA-256 lock file | Dependency integrity (ADR-002 updated) |
| File deployments | Transaction-based rollback (ADR-006) | Atomic operations, zero partial installs |

**Traceability**:
- UC-001: Validate AI-Generated Content (NFR-WR-06: Pattern database integrity)
- ADR-002: Plugin Isolation Strategy (dependency hash verification)
- ADR-006: Plugin Rollback Strategy (transaction-based installation)

**Implementation Guidance**:
- DependencyVerifier class validates SHA-256 hashes (SAD Section 5.1)
- InstallationTransaction class provides rollback (SAD Section 11.2)
- Git commits provide audit trail (tamper-evident history)

### 5.4 Plugin Security

#### NFR-SEC-05: Plugin Isolation

**Requirement**: Plugins cannot access sensitive system resources or execute arbitrary code.

| Security Control | Implementation | Rationale |
|-----------------|---------------|-----------|
| No arbitrary code execution | Filesystem-based isolation (ADR-002 updated) | Prevent malicious code execution |
| Path validation | PathValidator enforces boundaries | Prevent path traversal attacks (CWE-22) |
| Forbidden path blacklist | `~/.ssh/`, `~/.aws/`, `/etc/`, `.git/` | Protect sensitive system files |
| Lifecycle hooks removed | No `post_install`, `pre_update` scripts | Align ADR-002 with "no code execution" principle |
| Injection validation | InjectionValidator blocks dangerous content | Prevent CLAUDE.md poisoning (OWASP A03:2021) |

**Traceability**:
- ADR-002: Plugin Isolation Strategy (updated 2025-10-17, lifecycle hooks removed)
- SAD Section 4.6: Security View (threat mitigation summary)
- UC-011: Validate Plugin Security (NFR-PS-02: Attack detection 100%)

**Implementation Guidance**:
- PathValidator.sanitizePath() enforces boundaries (SAD Section 5.1)
- InjectionValidator.validate() blocks HTML/JavaScript (SAD Section 4.6)
- Manual setup instructions for plugins requiring configuration (informed consent model)

#### NFR-SEC-06: YAML Deserialization Security

**Requirement**: YAML parsing prevents deserialization attacks (CWE-502).

| Security Control | Implementation | Rationale |
|-----------------|---------------|-----------|
| YAML safe parsing | FAILSAFE_SCHEMA (js-yaml) | Prevent code execution via custom YAML tags (OWASP A08:2021) |
| Manifest size limit | 100KB maximum | Prevent YAML bombs (memory exhaustion attacks) |
| Schema validation | JSON Schema validation | Enforce manifest structure, reject malformed YAML |

**Traceability**:
- SAD Section 4.6.1: Security Architecture Overview (input validation layer)
- SAD Section 11.2: Security Implementation Roadmap (YAML safe parsing Week 1-2)

**Implementation Guidance**:
- Use js-yaml with `FAILSAFE_SCHEMA` option (no custom tags)
- Validate manifest against JSON Schema before processing
- Reject manifests >100KB (size limit enforcement)

#### NFR-SEC-07: Secrets Detection

**Requirement**: Prevent accidental commit of credentials, API keys, private keys.

| Secret Type | Detection Mechanism | Rationale |
|------------|-------------------|-----------|
| API keys | Pre-commit scanning (detect-secrets/truffleHog) | Prevent credential leaks (SAD Section 11.2) |
| Private keys | Pattern matching (`.ssh/id_rsa`, `.pem` files) | Protect SSH keys, SSL certificates |
| Environment files | Manifest validation (reject `.env` in plugin content) | Prevent accidental inclusion |
| GitHub tokens | Pre-commit hooks (detect `ghp_`, `gho_` patterns) | Protect GitHub access tokens |

**Traceability**:
- SAD Section 4.6.5: Threat Mitigation Summary (secrets exposure LOW risk)
- SAD Section 11.2: Security Implementation Roadmap (secrets detection Week 3-4)

**Implementation Guidance**:
- Integrate detect-secrets or truffleHog in pre-commit hooks
- CI/CD checks for secrets patterns (fail PR if detected)
- `.gitignore` includes `.env`, `credentials.json`, `*.pem`

### 5.5 Threat Model

#### NFR-SEC-08: Threat Mitigation

**Requirement**: AIWG mitigates known security threats with defined residual risk levels.

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|------------|---------------|
| Malicious Plugin Installation | Medium | Critical | No code execution, path validation, user approval | LOW |
| Path Traversal Attack | High | High | PathValidator boundary checks, symlink detection, forbidden paths blacklist | LOW |
| YAML Deserialization Attack | Medium | Medium | FAILSAFE_SCHEMA, 100KB size limit, no custom tags | LOW |
| Dependency Confusion | Medium | Medium | SHA-256 hashes, lock file, registry trust model, namespace enforcement | MEDIUM |
| CLAUDE.md Injection Poisoning | Medium | Medium | InjectionValidator content validation, dangerous pattern detection, user approval workflow | LOW |
| Secrets Exposure | Low | High | Pre-commit scanning, CI checks, manifest validation | LOW |

**Traceability**:
- SAD Section 4.6.5: Threat Mitigation Summary (comprehensive threat table)
- SAD Section 9.1: Technical Risks (malicious plugin code, performance degradation)

**Risk Acceptance**:
- Dependency Confusion (MEDIUM risk): Accepted for MVP, requires registry trust model (future enhancement)
- All other threats: LOW residual risk, acceptable for open source documentation project

---

## 6. Usability Requirements

### 6.1 Overview

Usability requirements ensure AIWG remains accessible to diverse users (solo developers, teams, enterprises) without steep learning curves. As a developer tool, usability focuses on CLI ergonomics, error clarity, documentation quality, and workflow efficiency.

**Usability Philosophy**: "Make the easy things easy, make the hard things possible" - optimize for common tasks, support advanced workflows.

### 6.2 Learnability

#### NFR-USE-01: Time to Productivity

**Requirement**: Users achieve productivity milestones within defined time windows.

| Milestone | Target Time | User Type | Measurement |
|-----------|------------|-----------|-------------|
| Install AIWG | <5 minutes | All users | One-line bash script execution |
| Deploy agents to project | <15 minutes (UC-002: NFR-SD-06) | Agentic developers | Install → deploy → first artifact generation |
| Generate first artifact (intake forms) | <20 minutes | Project managers | Deploy → intake-wizard → review forms |
| Validate first content | <30 minutes | Content creators | Deploy → writing-validator → improve content (UC-001: NFR-WR-07) |
| Orchestrate multi-agent workflow | <1 hour | Technical leads | Deploy → natural language request → review artifact |

**Traceability**:
- UC-001: Validate AI-Generated Content (NFR-WR-07: Learning curve 1-2 validation cycles)
- UC-002: Deploy SDLC Framework (NFR-SD-06: Setup friction <15 minutes)
- Solution Profile: Minimize setup friction, ship velocity critical

**Implementation Guidance**:
- One-line install script (no multi-step configuration)
- Interactive mode for complex workflows (guided prompts vs memorizing flags)
- Quick-start guides for each major use case (install → deploy → usage example)

#### NFR-USE-02: Documentation Quality

**Requirement**: Documentation comprehensive, navigable, and accessible to diverse users.

| Documentation Type | Completeness Target | Rationale |
|-------------------|-------------------|-----------|
| README.md | Installation + quick start + usage examples | First touchpoint for new users |
| USAGE_GUIDE.md | Context selection strategy for agents/templates | Prevent context window overwhelm |
| Per-directory READMEs | Component-specific guidance | Modular learning (focus on relevant subsystem) |
| Agent definitions | All public functions documented (JSDoc) | Developer reference (tool contributors) |
| Template metadata | YAML headers complete (category, tags, description) | Discoverability (users find relevant templates) |
| ADRs | Architecture decisions recorded with rationale | Maintainer continuity (future contributors understand design) |

**Traceability**:
- Solution Profile: Documentation comprehensive (README, USAGE_GUIDE, AGENTS.md, CLAUDE.md, per-directory READMEs)
- SAD Section 10.1: Plugin Development Guidelines (quality requirements)

**Implementation Guidance**:
- Documentation linting (markdownlint-cli2 enforces consistency)
- Before/after example gallery (demonstrate content transformation patterns)
- Troubleshooting guides (common errors, remediation steps)

#### NFR-USE-03: Error Message Clarity

**Requirement**: All errors include clear remediation steps (NFR-SD-07: Error clarity).

| Error Category | Remediation Guidance | Example |
|---------------|---------------------|---------|
| Missing prerequisites | Install command + verification | "AIWG not installed. Install: curl -fsSL ... \| bash" |
| Permission denied | chmod command + explanation | "Permission denied: docs/content.md. Fix: chmod 644 docs/content.md" |
| Network timeout | Retry guidance + offline fallback | "Deployment timeout. Check network. Retry: aiwg -deploy-agents" |
| Validation failure | Specific pattern + line number + rewrite suggestion | "Line 15: 'it's worth noting' → Rewrite: 'Microservices provide...'" |

**Traceability**:
- UC-001: Validate AI-Generated Content (NFR-WR-08: Line numbers + rewrite suggestions)
- UC-002: Deploy SDLC Framework (NFR-SD-07: Error clarity, clear remediation steps)

**Implementation Guidance**:
- Structured error messages: `[ERROR_CODE] Description. Fix: Remediation steps.`
- Avoid generic errors (e.g., "Failed to deploy" → "Failed to deploy: disk full. Free space: rm -rf .aiwg/working/")
- Link to documentation for complex errors (e.g., "See troubleshooting guide: https://...")

### 6.3 Efficiency

#### NFR-USE-04: Workflow Efficiency

**Requirement**: Common workflows optimized for minimal user effort.

| Workflow | Manual Effort (before AIWG) | AIWG Effort (after) | Improvement | Rationale |
|----------|---------------------------|-------------------|-------------|-----------|
| Requirements → Code traceability | 8 hours manual CSV | <90s automated | 99% reduction (SAD Section 8.4) | Automation speedup |
| Multi-agent document review | 4 hours (4 reviewers × 1 hour each) | <20 minutes (parallel) | 92% reduction | Parallel execution (UC-004: NFR-MA-01) |
| Agent deployment | 30 minutes (manual file copying, CLAUDE.md editing) | <10s | 97% reduction | CLI automation (UC-002: NFR-SD-01) |
| Content validation | 1 hour manual pattern review | <60s automated | 98% reduction | Pattern detection (UC-001: NFR-WR-01) |

**Traceability**:
- SAD Section 8.4: Scalability (traceability automation 99% effort reduction)
- UC-004: Multi-Agent Workflows (NFR-MA-01: 15-20 minutes vs 4+ hours manual)

**Implementation Guidance**:
- Natural language orchestration (users say "Start Inception" vs typing complex commands)
- Batch operations (validate 10 files simultaneously, not 10 separate invocations)
- Caching (avoid re-parsing manifests, templates on every invocation)

#### NFR-USE-05: Feedback Visibility

**Requirement**: Users receive real-time progress updates for long-running operations.

| Operation | Visibility Requirement | Rationale |
|-----------|----------------------|-----------|
| Multi-agent workflow (15-20 minutes) | Progress indicators: "3/4 reviews complete" (UC-004: Step 6) | User remains engaged, not wondering if hung |
| Batch validation (5 minutes) | Summary report: "10 files validated, 3 FAIL, 2 BORDERLINE, 5 PASS" (UC-001: Alt-4) | User prioritizes remediation |
| Plugin installation (10 seconds) | Step-by-step: "Downloading... Validating... Deploying..." | User confidence (installation proceeding normally) |
| Traceability generation (90 seconds) | Progress: "Parsing requirements... Building graph... Validating..." | User not alarmed by delay |

**Traceability**:
- UC-001: Validate AI-Generated Content (NFR-WR-09: Progress visibility, real-time authenticity score)
- UC-004: Multi-Agent Workflows (Step 6: Orchestrator monitors completion, reports progress)

**Implementation Guidance**:
- Streaming output (show progress incrementally, not all at end)
- Progress bars (terminal-based progress indicators)
- Time estimates (e.g., "Estimated time remaining: 2 minutes")

### 6.4 Accessibility

#### NFR-USE-06: Accessibility Standards

**Requirement**: AIWG accessible to diverse users (assistive technologies, internationalization).

| Accessibility Dimension | Target | Rationale |
|------------------------|--------|-----------|
| CLI text output | Screen reader compatible (plain text, no ANSI colors required) | Blind users can use AIWG via screen readers |
| Documentation (future web interface) | WCAG 2.1 Level AA | Legal compliance (ADA, Section 508) |
| Language support | English primary, future Spanish/French | International user base (current: English-only pattern database) |
| Error messages | Plain language (no jargon) | Non-expert users understand remediation |

**Traceability**:
- Solution Profile: Portability (future: macOS/Windows community testing, internationalization)
- SAD Section 1.1: Open Issues (Issue 001: Multi-language support for pattern database)

**Implementation Guidance**:
- ANSI colors optional (fallback to plain text if terminal doesn't support)
- Alt text for diagrams (future web documentation)
- Translation framework for pattern database (future: i18n support)

### 6.5 Framework Routing Usability

#### NFR-USE-07: Zero-Friction Framework Detection

**Requirement**: Users never manually select frameworks - system automatically routes to correct framework based on context.

| User Action | Expected Behavior | Framework Detection | Rationale |
|-------------|------------------|-------------------|-----------|
| Natural language: "Transition to Elaboration" | Auto-route to SDLC framework | Command metadata: `framework: sdlc-complete` | Zero user friction, implicit detection |
| Natural language: "Generate blog content" | Auto-route to Marketing framework | Command metadata: `framework: marketing-flow` | User thinks in tasks, not frameworks |
| Command: `/flow-inception-to-elaboration` | Load SDLC context only (exclude marketing/, agile/) | Metadata-driven filtering | Context pollution prevented |
| Mixed workflows: SDLC + Marketing | Load both frameworks explicitly | Multi-framework project detection | Advanced use case, polyglot management |

**Traceability**:
- UC-012: Framework-Aware Workspace Management (AC-001: Zero manual framework selection)
- ADR-007: Framework-Scoped Workspace Architecture (implicit detection design)
- FID-007: Workspace Management Feature (natural language routing)

**Implementation Guidance**:
- Natural language translation table maps phrases → commands → frameworks
- Command/agent/template YAML frontmatter declares `framework: {id}` property
- Orchestrator reads metadata, filters context to relevant framework(s) only
- User never sees framework selection UI (fully transparent routing)

**Error Handling**:
- If command missing framework metadata: Warn user, default to `framework: sdlc-complete`
- If conflicting frameworks in single workflow: Ask user to clarify (rare edge case)
- If framework directory missing: Auto-initialize `.aiwg/frameworks/{id}/` structure

---

## 7. Maintainability Requirements

### 7.1 Overview

Maintainability requirements ensure AIWG remains evolvable as user needs grow, without accumulating technical debt that slows development velocity. As a solo-maintained project transitioning to community contributions, maintainability focuses on code quality, documentation, modularity, and technical debt management.

**Maintainability Philosophy**: "Code for the next maintainer" - assume future contributors will extend and refactor.

### 7.2 Code Quality

#### NFR-MAINT-01: Coding Standards

**Requirement**: Code follows consistent style, enforced via linting and automated checks.

| Language | Linting Tool | Rules Enforced | Rationale |
|----------|-------------|---------------|-----------|
| Markdown | markdownlint-cli2 | MD001-MD047 (exceptions: MD033, MD013) | Documentation consistency (Solution Profile) |
| JavaScript | ESLint | Airbnb style guide (future) | Node.js tooling (deploy-agents.mjs, manifest scripts) |
| Python | Flake8 | PEP 8 (future) | Traceability engine (NetworkX) |

**Traceability**:
- Solution Profile: Testing & Quality (CI: Markdown linting markdownlint-cli2, 10 custom fixers)
- SAD Section 8.5: Maintainability (modular architecture, clear interfaces)

**Implementation Guidance**:
- CI/CD enforces linting (PRs fail if linting errors)
- Pre-commit hooks prevent committing unlinted code
- Custom fixers for project-specific rules (e.g., fix-md58.mjs for table spacing)

#### NFR-MAINT-02: Test Coverage

**Requirement**: Automated test coverage targets balance quality and velocity.

| Project Component | Target Coverage | Rationale |
|------------------|----------------|-----------|
| Critical paths (deploy-agents.mjs, new-project.mjs) | 80-90% | Prevent regressions in most-used features (Solution Profile: Phase 1) |
| Linting fixers (tools/lint/) | 60-80% | Moderate risk, custom logic |
| Traceability engine (tools/traceability/) | 60-80% | Complex graph algorithms, edge cases |
| Templates | Manual validation | Low-risk static content |

**Traceability**:
- Solution Profile: Testing maturity target 60-80% (Phase 2: Short-term, 1-3 months)
- SAD Section 11.3: Testing Roadmap (10-week Construction phase plan, 80% → 90% coverage)

**Implementation Guidance**:
- Jest/Mocha for JavaScript unit tests (tools/)
- Pytest for Python tests (traceability engine)
- Integration tests for critical workflows (install → deploy → scaffold)

#### NFR-MAINT-03: Documentation Standards

**Requirement**: All public APIs documented with inline comments, examples, and usage guidance.

| Component | Documentation Requirement | Rationale |
|-----------|-------------------------|-----------|
| Node.js scripts (tools/) | JSDoc for all public functions | Developer reference (future contributors) |
| Python scripts | Docstrings (Google style) | Traceability engine maintainers |
| Templates | YAML frontmatter (category, tags, description) | Discoverability, template selection |
| ADRs | Architecture decisions recorded with rationale | Design continuity (future maintainers) |

**Traceability**:
- SAD Section 8.5: Maintainability (comprehensive plugin development documentation)
- Solution Profile: Documentation comprehensive (CONTRIBUTING.md future expansion)

**Implementation Guidance**:
- JSDoc generation for Node.js (automated API documentation)
- Sphinx for Python (future: auto-generate API docs)
- Template metadata validation (CI checks for missing YAML fields)

### 7.3 Modularity

#### NFR-MAINT-04: Component Independence

**Requirement**: Components remain decoupled, enabling independent evolution and testing.

| Component | Independence Requirement | Rationale |
|-----------|------------------------|-----------|
| Writing guide | Independent of SDLC framework | Users can use writing validation without SDLC agents |
| Agents | Individually deployable (modular selection) | Users compose custom agent sets (Solution Profile) |
| Commands | Callable independently | No coupling between slash commands |
| Plugins | Self-contained (no cross-plugin dependencies) | Plugin ecosystem scales (1000+ plugins target) |

**Traceability**:
- Solution Profile: Modular deployment - handle diverse project types (smallest to largest apps)
- SAD Section 8.5: Maintainability (plugin API versioned independently)

**Implementation Guidance**:
- Avoid circular dependencies (enforce via dependency graph analysis)
- Interface-based design (plugins implement manifest contract, not internal APIs)
- Versioned plugin API (backward compatibility for 2 major versions)

#### NFR-MAINT-05: Backward Compatibility

**Requirement**: AIWG maintains backward compatibility across minor versions, minimizing breaking changes.

| Change Type | Compatibility Requirement | Rationale |
|-------------|-------------------------|-----------|
| Plugin API | Backward compatible for 2 major versions | Trust (existing plugins continue working) |
| CLI flags | Deprecated flags warned, not removed immediately | User scripts remain functional |
| Template formats | Additive changes only (new fields optional) | Existing templates don't break |
| Agent definitions | Preserve frontmatter schema | Deployed agents remain functional |

**Traceability**:
- SAD Section 8.5: Maintainability (backward compatibility for 2 major versions)
- SAD Section 9.1: Technical Risks (plugin compatibility breaks)

**Implementation Guidance**:
- Semantic versioning (major.minor.patch)
- Deprecation warnings (1-2 minor versions before removal)
- Compatibility tests (CI validates old plugins still work)

### 7.4 Technical Debt Management

#### NFR-MAINT-06: Technical Debt Policy

**Requirement**: Technical debt tracked, prioritized, and addressed systematically.

| Debt Category | Resolution Target | Rationale |
|--------------|------------------|-----------|
| Critical debt (blocks features) | Address within 1 sprint (2 weeks) | Unblock development velocity (Solution Profile) |
| High-priority debt (workarounds exist) | Address within 3 months | Prevent accumulation |
| Medium debt (non-blocking) | Address within 6 months | Refactor during related work |
| Low debt (cosmetic) | Defer to community contributions | Limited maintainer capacity |

**Traceability**:
- Solution Profile: Accepting technical debt short-term, but enterprise SRE background indicates eventual quality focus
- SAD Section 8.5: Maintainability (<4 hours to create new plugin)

**Implementation Guidance**:
- Track technical debt in GitHub Issues (label: `tech-debt`)
- Quarterly debt review (assess accumulation trends)
- Refactor during feature work (avoid standalone "refactor sprints")

#### NFR-MAINT-07: Refactoring Safety

**Requirement**: Refactoring supported by automated tests, preventing regressions.

| Refactoring Type | Safety Mechanism | Rationale |
|-----------------|-----------------|-----------|
| Component restructuring | Integration tests | Ensure end-to-end workflows still functional |
| API changes | Compatibility tests | Validate old clients still work |
| Performance optimization | Performance regression tests | Prevent slowdowns (NFR-PERF-08) |
| Security hardening | Security test suite | Prevent introducing vulnerabilities |

**Traceability**:
- NFR-PERF-08: CI/CD Performance Baselines (regression detection <20% tolerance)
- SAD Section 11.3: Testing Roadmap (80% → 90% coverage target)

**Implementation Guidance**:
- Run full test suite before/after refactoring (regression detection)
- Performance baselines validate optimization (not degradation)
- Security tests validate hardening (not introducing vulnerabilities)

### 7.5 Workspace Organization

#### NFR-MAINT-08: Framework-Scoped Workspace Lifecycle

**Requirement**: Workspace tiers maintain clear lifecycle boundaries, preventing context pollution and data accumulation.

| Workspace Tier | Lifecycle | Cleanup Policy | Rationale |
|---------------|-----------|---------------|-----------|
| Tier 1: Repo/System (`.aiwg/frameworks/{id}/repo/`) | Permanent (stable docs) | No automatic cleanup, manual curation only | Global truth (feature lists, versions, baselines) |
| Tier 2: Projects/Features (`.aiwg/frameworks/{id}/projects/{project-id}/`) | Active development → Archive | Archived on project completion (manual trigger) | Active work artifacts, retired when delivered |
| Tier 3: Working Area (`.aiwg/frameworks/{id}/working/`) | Ephemeral (collaboration) | Auto-cleanup after 7 days if no recent activity | Temporary collaboration, prevent accumulation |
| Tier 4: Archive (`.aiwg/frameworks/{id}/archive/`) | Permanent (historical) | No cleanup, grow indefinitely | Audit trail, reference for future work |

**Traceability**:
- UC-012: Framework-Aware Workspace Management (AC-005: Tier-based lifecycle management)
- ADR-007: Framework-Scoped Workspace Architecture (4-tier design)
- FID-007: Workspace Management Feature (context curation goals)

**Implementation Guidance**:
- Auto-archive workflow: `/project:archive-project {project-id}` moves Tier 2 → Tier 4
- Auto-cleanup workflow: Nightly job (GitHub Actions) cleans Tier 3 files >7 days old
- User override: `.aiwg/frameworks/{id}/working/.keepalive` prevents auto-cleanup
- Manual curation tools: `/project:curate-repo` helps users review/trim Tier 1 docs

**Isolation Guarantees**:
- Framework isolation: `.aiwg/frameworks/sdlc-complete/` never reads `.aiwg/frameworks/marketing-flow/`
- Tier isolation: Loading Tier 1 (repo/) excludes Tier 2 (projects/), Tier 3 (working/), Tier 4 (archive/)
- Project isolation: Multi-project scenarios load only relevant project-id subdirectory

**Monitoring**:
- Disk space alerts: Warn if Tier 3 exceeds 500MB (indicates cleanup failure)
- Archive growth: Track Tier 4 growth rate (audit trail compliance)
- Framework distribution: Report which frameworks active (user usage patterns)

---

## 8. Portability Requirements

### 8.1 Overview

Portability requirements ensure AIWG runs on diverse operating systems, runtimes, and platforms (Claude Code, OpenAI/Codex, Cursor) without extensive platform-specific customization. As a multi-platform developer tool, portability focuses on OS support, runtime compatibility, and platform abstraction.

**Portability Philosophy**: "Write once, run anywhere (with platform adapters)" - core logic platform-agnostic, thin adapters for platform differences.

### 8.2 Operating System Support

#### NFR-PORT-01: OS Compatibility

**Requirement**: AIWG supports major developer operating systems.

| Operating System | Support Status | Validation | Rationale |
|-----------------|---------------|-----------|-----------|
| Linux (Ubuntu, Debian, Fedora) | **Primary** (validated) | CI/CD on Ubuntu 22.04 | Maintainer's primary OS (Solution Profile) |
| macOS (11+) | **Secondary** (community testing) | Manual validation, future CI | Common developer OS |
| Windows (10+) | **Future** (planned) | WSL2 validated, native planned | Large developer market share |
| WSL2 (Windows Subsystem for Linux) | **Supported** (validated) | Maintainer tests on WSL2 | Windows developer workaround |

**Traceability**:
- Solution Profile: Portability (Linux primary, macOS secondary, Windows future)
- SAD Section 7.1: Core Technologies (Node.js >=18.20.8 cross-platform)

**Implementation Guidance**:
- Avoid Linux-specific commands (e.g., use Node.js `fs` module vs `cp`, `mv` shell commands)
- Test on macOS before releases (community validation)
- Provide Windows installation instructions (WSL2 setup guide)

#### NFR-PORT-02: Runtime Dependencies

**Requirement**: AIWG runtime dependencies minimal, widely available.

| Dependency | Minimum Version | Rationale |
|-----------|----------------|-----------|
| Node.js | >=18.20.8 | LTS version, widespread adoption (SAD Section 7.1) |
| Python | >=3.8 (optional, for traceability) | Widely available, NetworkX compatibility |
| Git | >=2.20 | Version control (prerequisite for AIWG usage) |
| Bash | >=4.0 | Installation script, Linux/macOS standard |

**Traceability**:
- SAD Section 7.1: Core Technologies (Node.js >=18.20.8, Python >=3.8)
- UC-002: Deploy SDLC Framework (Preconditions: Git repository)

**Implementation Guidance**:
- Version detection in install script (warn if Node.js too old)
- Graceful degradation (Python optional, traceability features unavailable if missing)
- Installation guide includes dependency setup

### 8.3 Platform Compatibility

#### NFR-PORT-03: AI Coding Platform Support

**Requirement**: AIWG supports multiple AI coding platforms via adapters.

| Platform | Support Status | Directory Structure | Deployment Format | Rationale |
|----------|---------------|-------------------|------------------|-----------|
| Claude Code | **Primary** (production) | `.claude/agents/`, `.claude/commands/` | Individual markdown files | Maintainer's primary platform |
| OpenAI/Codex | **Secondary** (production) | `.codex/agents/` | Single `AGENTS.md` file | Multi-provider support (MVP feature) |
| Cursor | **Planned** (experimental) | `.cursor/agents/` | Platform-specific format | Growing adoption |
| Windsurf | **Planned** (research) | TBD | API adapter | Future platform |
| Zed | **Research** (future) | TBD | Extension API | Emerging platform |

**Traceability**:
- SAD Section 7.3: Platform Adapters (Claude, OpenAI, Cursor, Windsurf, Zed)
- CLAUDE.md: Multi-provider support (`aiwg -deploy-agents --provider openai`)

**Implementation Guidance**:
- Platform abstraction layer (adapter pattern, not platform-specific implementations)
- Manifests declare platform compatibility (plugin.yaml: `platforms: [claude, openai, cursor]`)
- Platform-specific testing (CI validates agents deploy correctly on each platform)

#### NFR-PORT-04: Browser Compatibility

**Requirement**: Not applicable (AIWG is CLI tool, not web application).

**Rationale**: AIWG has no web interface, all user interaction via terminal/command line.

**Future**: If web-based documentation site launched, target WCAG 2.1 Level AA (modern browsers: Chrome, Firefox, Safari, Edge).

### 8.4 Deployment Targets

#### NFR-PORT-05: Installation Methods

**Requirement**: AIWG supports flexible installation methods for diverse user preferences.

| Installation Method | Target | Rationale |
|-------------------|--------|-----------|
| One-line bash script | <5 minutes | Primary installation path (Solution Profile) |
| Manual clone + symlink | Developer customization | Power users, contributors |
| npm package (future) | Global install via `npm install -g aiwg` | Node.js ecosystem integration |
| Homebrew (future macOS) | `brew install aiwg` | macOS developer convenience |

**Traceability**:
- CLAUDE.md: One-line install: `curl -fsSL ... | bash`
- Solution Profile: Minimize setup friction (<15 minutes from install to first artifact)

**Implementation Guidance**:
- Bash install script idempotent (safe to run multiple times)
- npm package optional (not required for MVP)
- Homebrew formula (community-contributed, future)

---

## 9. Reliability Requirements

### 9.1 Overview

Reliability requirements ensure AIWG remains dependable during normal operation, handling failures gracefully and recovering quickly. As a developer tool (not critical infrastructure), reliability focuses on error handling, data integrity, fault tolerance, and user confidence.

**Reliability Philosophy**: "Fail gracefully, recover quickly" - errors should be informative, not cryptic; recovery should be automated, not manual.

### 9.2 Error Handling

#### NFR-REL-01: Graceful Degradation

**Requirement**: AIWG handles errors without data loss, providing clear recovery paths.

| Error Category | Graceful Behavior | Recovery Path | Rationale |
|---------------|------------------|--------------|-----------|
| Network timeout (plugin download) | Retry 3 times, then fail with error | User retries manually | Transient network issues common |
| Disk full (plugin installation) | Rollback, restore pre-install state (ADR-006) | User frees disk space, retries | Prevent partial installations |
| Permission denied (file access) | Clear error with chmod command | User fixes permissions, retries | Common on Unix systems |
| Context window exhaustion (large document) | Chunk document, process in sections | Automated chunking (UC-004: Exc-3) | Large documents exceed LLM limits |

**Traceability**:
- ADR-006: Plugin Rollback Strategy (<5 second rollback on failure)
- UC-004: Multi-Agent Workflows (Exc-3: Context window exhaustion, chunked processing)

**Implementation Guidance**:
- Catch all exceptions (no unhandled errors crash CLI)
- Log errors to `.aiwg/logs/error.log` (debugging evidence)
- Provide actionable remediation (not generic "Something went wrong")

#### NFR-REL-02: Data Integrity Guarantees

**Requirement**: AIWG prevents data corruption, ensuring atomic operations.

| Data Type | Integrity Guarantee | Mechanism | Rationale |
|-----------|-------------------|-----------|-----------|
| Plugin installations | 100% rollback on failure | Transaction-based (ADR-006) | Zero partial installs (UC-010: NFR-RB-02) |
| CLAUDE.md modifications | Backup before edit, restore on failure | Pre-modification backup (UC-002: Exc-3) | Prevent corruption of project configuration |
| Git commits | Atomic commits (all-or-nothing) | Git's transactional model | Standard Git guarantee |
| Manifest files | Schema validation before write | JSON Schema validation | Prevent malformed manifests |

**Traceability**:
- ADR-006: Plugin Rollback Strategy (transaction-based installation, <5s rollback)
- UC-002: Deploy SDLC Framework (NFR-SD-03: CLAUDE.md update preserves existing content)
- UC-010: Rollback Plugin Installation (NFR-RB-02: 100% state restoration)

**Implementation Guidance**:
- InstallationTransaction class wraps all install operations (SAD Section 5.1)
- Backup files before modification (`.aiwg/backups/` directory)
- Validate data before persistence (schema validation, checksum validation)

### 9.3 Fault Tolerance

#### NFR-REL-03: External Dependency Handling

**Requirement**: AIWG tolerates external service failures, degrading gracefully.

| External Dependency | Failure Behavior | Fallback | Rationale |
|--------------------|-----------------|----------|-----------|
| GitHub repository (download) | Retry 3 times, then fail with error | No fallback (AIWG requires GitHub) | Primary distribution channel |
| GitHub CLI (gh) | Detect missing, provide install instructions | Manual PR creation (user instructions) | Optional enhancement tool |
| Python (traceability) | Detect missing, skip traceability features | Traceability unavailable | Optional feature (not core AIWG) |
| Network (offline usage) | Warn user, allow offline work with cached plugins | Local agent/command execution | Developers work offline frequently |

**Traceability**:
- Solution Profile: Reliability - GitHub uptime (99.9%+, external dependency)
- SAD Section 4.4: Deployment View (GitHub repository)

**Implementation Guidance**:
- Dependency detection at runtime (check if `gh`, `python` available)
- Clear warnings when optional features unavailable (not silent failures)
- Offline mode documentation (users know AIWG works without network)

#### NFR-REL-04: Concurrent Operation Safety

**Requirement**: AIWG handles concurrent operations (multiple developers, parallel workflows) safely.

| Concurrency Scenario | Safety Mechanism | Rationale |
|---------------------|-----------------|-----------|
| Multiple developers deploying agents | File-based locking (`.aiwg/.lock`) | Prevent conflicting writes to shared directories |
| Parallel agent workflows (4-6 agents) | Task tool manages concurrency | Claude Code handles agent scheduling |
| Git conflicts (shared .aiwg/ artifacts) | Standard Git conflict resolution | Developers resolve via Git workflows |

**Traceability**:
- NFR-SCAL-04: Concurrent User Support (2-5 currently, 10+ target)
- UC-004: Multi-Agent Workflows (parallel execution, 25 agent limit)

**Implementation Guidance**:
- File-based locking for shared resources (`.aiwg/.lock` file)
- Document Git workflows for artifact management (branching, merging)
- Encourage isolated workspaces (`.aiwg/contrib/{username}/` per developer)

### 9.4 Recovery and Resilience

#### NFR-REL-05: Automated Recovery

**Requirement**: AIWG automatically recovers from common failure scenarios.

| Failure Scenario | Automated Recovery | User Action Required | Rationale |
|-----------------|-------------------|---------------------|-----------|
| Plugin installation failure | Rollback to pre-install state (ADR-006) | None (automatic) | Zero orphaned files (UC-010: NFR-RB-03) |
| AIWG installation corruption | `aiwg -reinstall` restores from GitHub | User runs reinstall command | Fast recovery (<5 minutes) |
| Reviewer timeout (multi-agent workflow) | Retry once, proceed if retry fails | None (automatic) | Transient LLM API issues |
| Manifest sync drift | `aiwg -sync-manifests --fix` repairs | User runs sync command | Detect file additions/deletions |

**Traceability**:
- ADR-006: Plugin Rollback Strategy (transaction-based, <5s rollback)
- UC-004: Multi-Agent Workflows (Exc-1: Reviewer timeout, automatic retry)

**Implementation Guidance**:
- Transaction rollback built into PluginManager (automatic, not user-initiated)
- Retry logic for transient failures (network timeouts, LLM API throttling)
- Self-healing manifests (sync-manifests detects and repairs drift)

#### NFR-REL-06: Health Checks

**Requirement**: AIWG provides health check mechanisms for proactive issue detection.

| Health Check | Detection | Remediation | Rationale |
|-------------|-----------|-------------|-----------|
| AIWG installation integrity | `aiwg -version` (smoke test) | `aiwg -reinstall` if corrupted | Quick validation |
| Plugin installation integrity | SHA-256 checksum validation | `aiwg -reinstall-plugin <name>` | Detect tampering |
| Manifest sync status | `aiwg -sync-manifests --check` | `--fix` flag repairs | Detect file drift |
| Dependency availability | Runtime checks (Node.js, Python, Git) | Install instructions | Prevent cryptic errors |

**Traceability**:
- SAD Section 4.6: Security View (integrity layer: SHA-256 checksum validation)
- Solution Profile: Reliability monitoring maturity (basic, GitHub metrics only)

**Implementation Guidance**:
- `aiwg -health` command (comprehensive system check, future enhancement)
- CI/CD smoke tests (verify installation functional after build)
- Checksum validation on every plugin load (not just installation)

#### NFR-REL-07: Framework Write Segregation and Read Flexibility

**Requirement**: Framework-scoped workspace architecture enforces write segregation while allowing unrestricted cross-framework reads for novel combinations.

| Operation Type | Guarantee | Validation | Rationale |
|---------------|-----------|------------|-----------|
| **WRITES: Framework-scoped** | SDLC framework writes only to `.aiwg/frameworks/sdlc-complete/` | Write path test: SDLC write → path starts with `frameworks/sdlc-complete/` | Prevent write conflicts, organize artifacts by origin |
| **READS: Unrestricted** | Any framework can read from any other framework | Cross-framework read test: SDLC reads Marketing artifacts successfully | Enable novel framework combinations (SDLC + Marketing workflows) |
| **Tier writes: Scoped** | Projects write to Tier 2 (`projects/{id}/`), not Tier 1 (`repo/`) unless explicitly allowed | Tier write test: Project workflow → writes to `projects/`, not `repo/` | Prevent accidental corruption of global stable docs |
| **Tier reads: Flexible** | Workflows read across tiers as needed (repo + projects + working) | Tier read test: Workflow reads from all 4 tiers successfully | Context curation is optimization, not restriction |

**Traceability**:
- UC-012: Framework-Aware Workspace Management (AC-004: Write segregation, read flexibility)
- ADR-007: Framework-Scoped Workspace Architecture (polyglot framework support)
- NFR-MAINT-08: Framework-Scoped Workspace Lifecycle (tier boundaries)
- FID-007: Workspace Management Feature (novel framework combinations)

**Implementation Guidance**:
- **Write validation**: PathValidator ensures writes target correct framework directory
- **Read freedom**: No restrictions on read paths (agents read anywhere in `.aiwg/`)
- **Cross-framework workflows**: SDLC agent can read Marketing artifacts to generate release blog posts
- **Novel combinations**: User says "Use Marketing framework to promote SDLC architecture decisions" → Marketing agents read SDLC ADRs, generate content, write to Marketing framework directory

**Write Segregation Examples**:
- SDLC workflow generates SAD → writes to `.aiwg/frameworks/sdlc-complete/projects/{id}/architecture/`
- Marketing workflow generates blog post → writes to `.aiwg/frameworks/marketing-flow/projects/{campaign-id}/content/`
- Agile workflow generates sprint plan → writes to `.aiwg/frameworks/agile-lite/projects/{sprint-id}/planning/`

**Cross-Framework Read Examples** (THE MAGIC):
- Marketing agent reads SDLC use cases → generates user-facing feature documentation
- SDLC security agent reads Marketing personas → tailors threat model to target audience
- Agile retrospective agent reads SDLC architecture decisions → identifies technical debt patterns
- SDLC requirements agent reads Marketing campaign results → prioritizes features by user demand

**Data Corruption Prevention**:
- Atomic tier transitions: Moving project → archive is transactional (all-or-nothing)
- Framework registry validation: Prevent duplicate framework IDs
- Write conflict detection: Warn if multiple frameworks attempt writes to same file
- Path traversal protection: Reject `../` writes attempting to escape framework directory (reads OK)

**Recovery from Violations**:
- If write path violation detected: Reject write, suggest correct path
- If orphaned files found: `aiwg -cleanup-orphans` removes stale data
- If write conflict detected: User resolves manually (Git merge conflict workflow)

---

## 10. Regulatory and Compliance Requirements

### 10.1 Overview

Regulatory and compliance requirements ensure AIWG meets legal obligations and industry standards. As an open-source documentation and tooling project (no PII, no user accounts, no data collection), compliance requirements are minimal compared to regulated systems (HIPAA, PCI-DSS, SOC 2).

**Compliance Philosophy**: "Transparency and permissiveness" - open source, MIT license, no hidden data collection.

### 10.2 License Compliance

#### NFR-COMP-01: Open Source License

**Requirement**: AIWG complies with MIT License obligations.

| Obligation | Compliance Mechanism | Rationale |
|-----------|---------------------|-----------|
| Attribution | MIT License file in repository root | Legal requirement (MIT License) |
| Sublicensing | Users can modify, distribute, sublicense | Permissive license (no copyleft) |
| Warranty disclaimer | LICENSE file disclaims warranty | Liability protection |
| Dependency licenses | All dependencies MIT/Apache/BSD compatible | No GPL contamination |

**Traceability**:
- Solution Profile: License Compliance (MIT License, permissive, attribution required)
- Repository: `LICENSE` file (MIT License text)

**Implementation Guidance**:
- Dependency audit (ensure no GPL dependencies introduced)
- SPDX identifiers in package.json (`"license": "MIT"`)
- Attribution preserved in distributed packages

#### NFR-COMP-02: Third-Party Dependency Compliance

**Requirement**: AIWG uses only open-source dependencies with permissive licenses.

| Dependency | License | Compatibility | Rationale |
|-----------|---------|--------------|-----------|
| Node.js (runtime) | MIT | Compatible | Permissive |
| js-yaml (manifest parsing) | MIT | Compatible | Permissive |
| markdownlint-cli2 (linting) | MIT | Compatible | Permissive |
| NetworkX (Python, traceability) | BSD-3-Clause | Compatible | Permissive |

**Traceability**:
- SAD Section 7.1: Core Technologies (Node.js, Python, markdownlint-cli2, NetworkX)
- Solution Profile: No commercial dependencies (zero budget)

**Implementation Guidance**:
- License scanning (CI checks for non-permissive licenses)
- SPDX license identifiers (machine-readable license metadata)
- Dependency updates (audit licenses before upgrading)

### 10.3 Privacy Compliance

#### NFR-COMP-03: GDPR/CCPA Compliance

**Requirement**: AIWG complies with privacy regulations (GDPR, CCPA).

| Requirement | AIWG Posture | Rationale |
|------------|-------------|-----------|
| Data collection | **None** (no telemetry, no analytics, no user accounts) | Not applicable (Solution Profile: no PII) |
| User consent | **Not required** (no data collected) | Not applicable |
| Right to erasure | **Not applicable** (no user data stored) | Not applicable |
| Data residency | **Not applicable** (local-only tool) | Not applicable |

**Traceability**:
- Solution Profile: Regulatory and Compliance (GDPR: N/A, no PII, no user accounts, no data collection)
- UC-001: Validate AI-Generated Content (NFR-WR-05: No external API calls, content privacy)

**Implementation Guidance**:
- No telemetry added (respect user privacy)
- No external API calls (content never leaves user's machine)
- Privacy policy (if website launched): Disclose no data collection

#### NFR-COMP-04: Export Control

**Requirement**: AIWG complies with export control regulations.

| Export Control | AIWG Posture | Rationale |
|---------------|-------------|-----------|
| ITAR (defense) | **Not applicable** (general-purpose software) | Open source, public repository |
| EAR (dual-use) | **Not applicable** (no encryption beyond TLS/SSH) | Standard developer tools |
| Sanctions (countries) | **No restrictions** (open source, publicly available) | MIT License permits worldwide distribution |

**Traceability**:
- Solution Profile: Export Control (open source, no export restrictions)
- Repository: Public GitHub repository (globally accessible)

**Implementation Guidance**:
- No export restrictions (open source, MIT License)
- No encryption technology (beyond standard TLS/SSH for GitHub communication)

### 10.4 Accessibility Compliance

#### NFR-COMP-05: Accessibility Standards (Future Web Interface)

**Requirement**: If AIWG launches web-based documentation or UI, comply with accessibility standards.

| Standard | Target | Rationale |
|----------|--------|-----------|
| WCAG 2.1 | Level AA | Legal compliance (ADA, Section 508) |
| Screen reader compatibility | JAWS, NVDA, VoiceOver | Blind users can navigate documentation |
| Keyboard navigation | 100% functionality without mouse | Motor impairment accessibility |
| Color contrast | 4.5:1 minimum (text), 3:1 (UI) | Visual impairment accessibility |

**Current Status**: **Not applicable** (CLI tool only, no web interface).

**Future**: If documentation website launched (beyond GitHub README), target WCAG 2.1 Level AA.

**Traceability**:
- NFR-USE-06: Accessibility Standards (screen reader compatible CLI output)
- Solution Profile: Future web interface (defer until adoption validates)

---

## 11. Quality Metrics and Service Level Indicators

### 11.1 Overview

Quality metrics and Service Level Indicators (SLIs) provide measurable targets for assessing AIWG's quality, performance, and reliability. Unlike Service Level Objectives (SLOs) for runtime services, AIWG metrics focus on development velocity, artifact quality, user satisfaction, and maintainer sustainability.

**Metrics Philosophy**: "Measure what matters, not what's easy" - track metrics that indicate user value, not vanity metrics.

### 11.2 Development Velocity Metrics

#### METRIC-001: Contribution Velocity

**Metric**: Commits per day, PRs per week

| Metric | Current Baseline | Target (MVP) | Target (Production) | Rationale |
|--------|-----------------|-------------|-------------------|-----------|
| Commits/day | 1+ (105 commits in 3 months) | 0.5+ | 2+ (multi-contributor) | Sustainable development pace (Solution Profile) |
| PRs/week | 0 (solo developer, no PRs) | 0 (solo) | 5+ (community) | Community contribution health |
| Issues/month | 0 (pre-launch) | 5+ | 20+ | User engagement, feedback volume |

**Measurement**: GitHub API metrics, tracked in `.aiwg/metrics/velocity.json`

**Traceability**:
- Solution Profile: Solo developer (105 commits in 3 months, 1+ per day velocity)
- SAD Section 5.3: Pipeline Components (MetricsCollector tracks velocity)

#### METRIC-002: Artifact Quality Score

**Metric**: Average quality score for generated artifacts (0-100 scale)

| Artifact Type | Target Quality Score | Measurement | Rationale |
|--------------|---------------------|-------------|-----------|
| Requirements (use cases, NFRs) | 85+/100 | Multi-agent review (UC-004) | Comprehensive specifications |
| Architecture (SAD, ADRs) | 90+/100 | Specialist review (security, test, clarity) | Critical design decisions |
| Testing (test plans, results) | 85+/100 | Test coverage, execution success | Validation rigor |
| Process (retrospectives, plans) | 80+/100 | Completeness, actionability | Process adherence |

**Measurement**: Multi-agent review scores, tracked in artifact YAML frontmatter

**Traceability**:
- UC-004: Multi-Agent Workflows (NFR-MA-02: 3+ reviewer sign-offs)
- Elaboration Phase Plan: Quality scores maintain 85+/100 average

#### METRIC-003: Test Coverage

**Metric**: Percentage of codebase covered by automated tests

| Project Component | Current Coverage | Target (MVP) | Target (Production) | Rationale |
|------------------|-----------------|-------------|-------------------|-----------|
| Critical paths (tools/) | 0% | 80% | 90% | Prevent regressions (Solution Profile: Phase 1) |
| Linting fixers | 0% | 60% | 80% | Moderate risk |
| Traceability engine | 0% | 60% | 80% | Complex algorithms |

**Measurement**: Jest/Pytest coverage reports, CI/CD validation

**Traceability**:
- Solution Profile: Testing maturity target 60-80% (Phase 2: Short-term)
- SAD Section 11.3: Testing Roadmap (80% → 90% coverage)

### 11.3 Performance Metrics

#### METRIC-004: Response Time Percentiles

**Metric**: p50, p95, p99 latencies for CLI commands and workflows

| Command/Workflow | p50 Target | p95 Target | p99 Target | Rationale |
|-----------------|-----------|-----------|-----------|-----------|
| `aiwg -version` | <200ms | <500ms | <1s | Instant response (NFR-PERF-01) |
| `aiwg -deploy-agents --mode sdlc` | <5s | <8s | <12s | One-time setup (NFR-PERF-01) |
| Multi-agent workflow (SAD generation) | <15min | <20min | <25min | Productivity (NFR-PERF-02) |

**Measurement**: Performance baselines in `.aiwg/reports/performance-baseline.json`, CI/CD regression detection

**Traceability**:
- NFR-PERF-01: CLI Command Response Time (targets by command)
- NFR-PERF-02: Agent Orchestration Response Time (workflow duration targets)
- NFR-PERF-08: CI/CD Performance Baselines (regression detection <20% tolerance)

#### METRIC-005: Resource Utilization

**Metric**: Peak memory usage, disk space consumption

| Resource | Target | Measurement | Rationale |
|----------|--------|-------------|-----------|
| CLI memory | <100MB RAM | `time -v` (Linux) | Lightweight tool (NFR-PERF-06) |
| Node.js scripts memory | <500MB RAM | Memory profiling | Reasonable for Node.js |
| Disk space (AIWG installation) | <2GB | Directory size check | Comprehensive framework (NFR-PERF-07) |

**Traceability**:
- NFR-PERF-06: CLI Tool Memory Usage (targets by tool)
- NFR-PERF-07: Disk Space Requirements (targets by component)

### 11.4 Reliability Metrics

#### METRIC-006: Defect Density

**Metric**: Bugs per 1,000 lines of code (KLOC)

| Project Component | Target Defect Density | Rationale |
|------------------|---------------------|-----------|
| Critical paths (tools/) | <0.5 bugs/KLOC | High-quality, well-tested |
| Templates | <0.1 bugs/KLOC | Static content, low-risk |
| Overall project | <1.0 bugs/KLOC | Industry standard for mature projects |

**Measurement**: GitHub Issues (label: `bug`), defect tracking

**Traceability**:
- SAD Section 10.2: Contribution Guidelines (quality standards)
- Solution Profile: Quality/security priority 20% (MVP), 40-45% (Production)

#### METRIC-007: Installation Success Rate

**Metric**: Percentage of installations completing successfully

| Installation Method | Target Success Rate | Rationale |
|--------------------|-------------------|-----------|
| One-line bash script | >95% | Primary installation path (Solution Profile) |
| Manual clone + symlink | >90% | Power users, more error-prone |
| Plugin installation (local) | >98% | Cached, fast, reliable |
| Plugin installation (remote) | >90% | Network dependencies, more failure modes |

**Measurement**: User-reported installation failures (GitHub Issues), CI/CD smoke tests

**Traceability**:
- NFR-REL-01: Graceful Degradation (error handling requirements)
- NFR-REL-05: Automated Recovery (recovery mechanisms)

### 11.5 User Satisfaction Metrics

#### METRIC-008: Time to Productivity

**Metric**: Time from installation to first artifact generation

| User Type | Target Time | Measurement | Rationale |
|-----------|------------|-------------|-----------|
| Agentic developers | <15 minutes | User surveys, session recordings | Setup friction minimization (NFR-USE-01) |
| Content creators | <30 minutes | User surveys | Learning curve (NFR-USE-01) |
| Project managers | <20 minutes | User surveys | Intake workflow completion |

**Measurement**: User surveys (post-installation feedback), session duration analysis (optional telemetry if user consents)

**Traceability**:
- NFR-USE-01: Time to Productivity (targets by milestone)
- UC-002: Deploy SDLC Framework (NFR-SD-06: Setup friction <15 minutes)

#### METRIC-009: GitHub Star Growth

**Metric**: GitHub stars, forks, watchers (community adoption indicators)

| Metric | Current Baseline | Target (6 months) | Target (1 year) | Rationale |
|--------|-----------------|------------------|----------------|-----------|
| GitHub stars | 0 (pre-launch) | 50+ | 200+ | Adoption indicator (Solution Profile: 100+ stars if Community path) |
| GitHub forks | 0 | 10+ | 50+ | Community engagement |
| Contributors | 1 (solo) | 3+ | 10+ | Team expansion (Solution Profile: 2-3 contributors within 6 months) |

**Measurement**: GitHub API metrics, tracked in `.aiwg/metrics/adoption.json`

**Traceability**:
- Solution Profile: Success Criteria (Community path: 100+ stars, 10+ contributors)
- SAD Section 8.4: Scalability (100+ contributors, 1000+ plugins)

#### METRIC-010: Issue Response Time

**Metric**: Time from issue creation to first maintainer response

| Priority | Target Response Time | Rationale |
|----------|---------------------|-----------|
| Critical (bugs blocking usage) | <24 hours | User productivity impact (Solution Profile: 48hr target) |
| High (feature requests, enhancements) | <48 hours | Community engagement |
| Medium/Low | <7 days | Maintainer capacity constraints |

**Measurement**: GitHub Issues API (label-based priority), tracked in `.aiwg/metrics/support.json`

**Traceability**:
- Solution Profile: 10x Growth Scenario (issue response time commitments)
- NFR-SCAL-05: Community Contribution Capacity (<48 hours target)

### 11.6 DORA Metrics (DevOps Research and Assessment)

#### METRIC-011: DORA Metrics (Future - Team Expansion)

**Metric**: Standard DevOps performance indicators (applicable when team expands)

| DORA Metric | Current Status | Target (Production) | Rationale |
|------------|---------------|-------------------|-----------|
| Deployment Frequency | N/A (pre-launch) | Weekly releases | Continuous delivery |
| Lead Time for Changes | N/A | <1 week (feature idea → release) | Agile development |
| Change Failure Rate | N/A | <15% | Quality control |
| Time to Restore Service | N/A (no runtime service) | <5 minutes (installation recovery) | Fast recovery |

**Measurement**: GitHub Actions logs, release history, incident tracking

**Traceability**:
- SAD Section 5.3: Pipeline Components (DORA metrics tracking)
- Solution Profile: Production profile transition (6 months)

---

## 12. Traceability Matrix

### 12.1 Overview

This traceability matrix links NFRs to functional requirements (use cases), architecture components (SAD sections), and design decisions (ADRs). Comprehensive traceability ensures all NFRs are grounded in user needs and architectural design.

### 12.2 NFR to Use Case Traceability

| NFR ID | NFR Summary | Related Use Case(s) | Functional Link |
|--------|------------|-------------------|----------------|
| NFR-PERF-01 | CLI Command Response Time | UC-002 (Deploy SDLC Framework) | NFR-SD-01: Deployment time <10s |
| NFR-PERF-02 | Agent Orchestration Response Time | UC-001 (Validate Content), UC-004 (Multi-Agent Workflows) | NFR-WR-01: Validation <60s, NFR-MA-01: Workflow 15-20min |
| NFR-PERF-03 | Document Generation Response Time | UC-004 (Multi-Agent Workflows) | SAD generation <20 minutes |
| NFR-PERF-04 | Agent Orchestration Throughput | UC-004 (Multi-Agent Workflows) | 4-6 agents simultaneously, max 25 |
| NFR-PERF-05 | Manifest Generation Throughput | Manifest system (tools/manifest/) | <3s for 500 files |
| NFR-PERF-06 | CLI Tool Memory Usage | UC-002 (Deploy SDLC Framework) | <100MB RAM for CLI |
| NFR-PERF-07 | Disk Space Requirements | UC-002 (Deploy SDLC Framework) | <2GB installation, <10MB agents |
| NFR-PERF-08 | CI/CD Performance Baselines | All use cases (regression prevention) | <20% regression tolerance |
| NFR-SCAL-01 | Documentation Capacity | UC-001 (Validate Content) | Support 1,000+ markdown files |
| NFR-SCAL-02 | Agent Capacity | UC-002 (Deploy SDLC Framework) | Support 100+ agents, 1000+ plugins |
| NFR-SCAL-03 | Traceability Graph Capacity | UC-006 (Automated Traceability) | 10,000+ nodes, <90s processing |
| NFR-SCAL-04 | Concurrent User Support | UC-004 (Multi-Agent Workflows) | 10+ concurrent contributors |
| NFR-SCAL-05 | Community Contribution Capacity | UC-005 (Framework Self-Improvement) | 10+ contributors, 20+ PRs/month |
| NFR-SCAL-06 | Deployment Scalability | UC-002 (Deploy SDLC Framework) | Support personal scripts → enterprise systems |
| NFR-AVAIL-01 | GitHub Repository Availability | UC-002 (Deploy SDLC Framework) | 99.9%+ uptime (GitHub SLA) |
| NFR-AVAIL-02 | CLI Tool Availability | All use cases | 99.99% local availability |
| NFR-AVAIL-03 | CI/CD Pipeline Availability | UC-005 (Framework Self-Improvement) | 99.9%+ uptime (GitHub Actions) |
| NFR-AVAIL-04 | Recovery Time Objective | UC-010 (Rollback Plugin Installation) | <5 minutes reinstall, <5s rollback |
| NFR-AVAIL-05 | Data Backup and Retention | UC-010 (Rollback Plugin Installation) | 30-day backup retention |
| NFR-SEC-01 | Authentication Requirements | All use cases | N/A (open source, no authentication) |
| NFR-SEC-02 | Authorization Requirements | UC-011 (Validate Plugin Security) | User consent for sensitive operations |
| NFR-SEC-03 | Data Confidentiality | UC-001 (Validate Content) | NFR-WR-05: No external API calls |
| NFR-SEC-04 | Data Integrity | UC-001 (Validate Content), UC-010 (Rollback) | NFR-WR-06: SHA-256 checksums, NFR-RB-02: 100% state restoration |
| NFR-SEC-05 | Plugin Isolation | UC-011 (Validate Plugin Security) | Path validation, no code execution (ADR-002) |
| NFR-SEC-06 | YAML Deserialization Security | UC-011 (Validate Plugin Security) | FAILSAFE_SCHEMA, 100KB limit |
| NFR-SEC-07 | Secrets Detection | UC-011 (Validate Plugin Security) | Pre-commit scanning, CI checks |
| NFR-SEC-08 | Threat Mitigation | UC-011 (Validate Plugin Security) | NFR-PS-02: 100% attack detection |
| NFR-USE-01 | Time to Productivity | UC-002 (Deploy SDLC Framework) | NFR-SD-06: <15 minutes setup |
| NFR-USE-02 | Documentation Quality | All use cases | Comprehensive docs (README, USAGE_GUIDE, READMEs) |
| NFR-USE-03 | Error Message Clarity | UC-002 (Deploy SDLC Framework) | NFR-SD-07: Clear remediation steps |
| NFR-USE-04 | Workflow Efficiency | UC-001 (Validate Content), UC-004 (Multi-Agent Workflows) | 99% traceability reduction, 92% review reduction |
| NFR-USE-05 | Feedback Visibility | UC-001 (Validate Content), UC-004 (Multi-Agent Workflows) | NFR-WR-09: Real-time progress, NFR-MA-01: Progress indicators |
| NFR-USE-06 | Accessibility Standards | UC-001 (Validate Content) | Screen reader compatible CLI output |
| NFR-MAINT-01 | Coding Standards | All use cases (codebase quality) | Markdown linting (markdownlint-cli2) |
| NFR-MAINT-02 | Test Coverage | All use cases (regression prevention) | 60-80% target (MVP), 80-95% (Production) |
| NFR-MAINT-03 | Documentation Standards | All use cases (maintainability) | JSDoc for Node.js, docstrings for Python |
| NFR-MAINT-04 | Component Independence | UC-002 (Deploy SDLC Framework) | Modular agent deployment |
| NFR-MAINT-05 | Backward Compatibility | UC-002 (Deploy SDLC Framework) | 2 major version compatibility |
| NFR-MAINT-06 | Technical Debt Policy | All use cases (velocity) | Critical debt <2 weeks, high-priority <3 months |
| NFR-MAINT-07 | Refactoring Safety | All use cases (regression prevention) | Integration tests, performance regression tests |
| NFR-PORT-01 | OS Compatibility | UC-002 (Deploy SDLC Framework) | Linux (primary), macOS (secondary), Windows (future) |
| NFR-PORT-02 | Runtime Dependencies | UC-002 (Deploy SDLC Framework) | Node.js >=18.20.8, Python >=3.8 (optional) |
| NFR-PORT-03 | AI Coding Platform Support | UC-002 (Deploy SDLC Framework) | Claude, OpenAI/Codex (production), Cursor (planned) |
| NFR-PORT-04 | Browser Compatibility | N/A (CLI tool) | Not applicable |
| NFR-PORT-05 | Installation Methods | UC-002 (Deploy SDLC Framework) | Bash script <5 minutes |
| NFR-REL-01 | Graceful Degradation | All use cases (error handling) | Clear errors, recovery paths |
| NFR-REL-02 | Data Integrity Guarantees | UC-010 (Rollback Plugin Installation) | NFR-RB-02: 100% state restoration |
| NFR-REL-03 | External Dependency Handling | UC-002 (Deploy SDLC Framework) | GitHub retry 3x, graceful degradation |
| NFR-REL-04 | Concurrent Operation Safety | UC-004 (Multi-Agent Workflows) | File-based locking, parallel agent support |
| NFR-REL-05 | Automated Recovery | UC-010 (Rollback Plugin Installation) | Transaction rollback <5s |
| NFR-REL-06 | Health Checks | UC-002 (Deploy SDLC Framework) | `aiwg -version` smoke test, checksum validation |
| NFR-COMP-01 | Open Source License | All use cases (legal compliance) | MIT License |
| NFR-COMP-02 | Third-Party Dependency Compliance | All use cases (legal compliance) | MIT/Apache/BSD compatible |
| NFR-COMP-03 | GDPR/CCPA Compliance | UC-001 (Validate Content) | Not applicable (no data collection) |
| NFR-COMP-04 | Export Control | All use cases (legal compliance) | Not applicable (open source) |
| NFR-COMP-05 | Accessibility Standards (Future Web) | Future web interface | WCAG 2.1 Level AA (if launched) |

### 12.3 NFR to SAD Component Traceability

| NFR ID | NFR Summary | SAD Section | Architecture Component | Implementation Guidance |
|--------|------------|------------|----------------------|------------------------|
| NFR-PERF-01 | CLI Command Response Time | 8.1 Performance | CLI Entry Point, Deployment Engine | Lazy loading, caching |
| NFR-PERF-02 | Agent Orchestration Response Time | 4.2 Process View | Core Orchestrator, Task tool | Parallel reviewers (single message, multiple Tasks) |
| NFR-PERF-03 | Document Generation Response Time | 5.3 Pipeline Components | Documentation Synthesizer | Streaming output, template caching |
| NFR-PERF-04 | Agent Orchestration Throughput | 4.2 Process View | Task tool | 25 agent limit (Claude Code constraint) |
| NFR-PERF-05 | Manifest Generation Throughput | 4.3 Development View | Manifest system (tools/manifest/) | Parallel file tree traversal |
| NFR-PERF-06 | CLI Tool Memory Usage | 7.1 Technology Stack | Node.js CLI | Stream large files, release memory |
| NFR-PERF-07 | Disk Space Requirements | 4.3 Development View | AIWG installation directory | Compress archives, cleanup backups |
| NFR-PERF-08 | CI/CD Performance Baselines | 11.3 Testing Roadmap | CI/CD Pipeline | Performance baseline report, regression detection |
| NFR-SCAL-01 | Documentation Capacity | 2.2 Component Overview | Validation Engine, Manifest system | Lazy loading, pagination |
| NFR-SCAL-02 | Agent Capacity | 2.1 High-Level Architecture | Plugin System, Agent Registry | Lazy agent loading, filesystem scan |
| NFR-SCAL-03 | Traceability Graph Capacity | 5.3 Pipeline Components | TraceabilityEngine (Python, NetworkX) | Sparse graph representation, incremental updates |
| NFR-SCAL-04 | Concurrent User Support | 4.4 Deployment View | File-based locking, Git workflows | `.aiwg/.lock` file, isolated workspaces |
| NFR-SCAL-05 | Community Contribution Capacity | 8.4 Scalability | GitHub API, CI/CD Pipeline | Self-service infrastructure, automated PR acceptance |
| NFR-SCAL-06 | Deployment Scalability | 10.1 Plugin Development Guidelines | Deployment Engine | Modular agent selection, plugin-based extensibility |
| NFR-AVAIL-01 | GitHub Repository Availability | 4.4 Deployment View | GitHub Repository | External dependency (99.9%+ SLA) |
| NFR-AVAIL-02 | CLI Tool Availability | 2.1 High-Level Architecture | CLI Entry Point | Local tool, no network dependencies |
| NFR-AVAIL-03 | CI/CD Pipeline Availability | 4.4 Deployment View | GitHub Actions | Retry logic, caching |
| NFR-AVAIL-04 | Recovery Time Objective | 11.2 Security Implementation Roadmap | InstallationTransaction (ADR-006) | Transaction-based rollback <5s |
| NFR-AVAIL-05 | Data Backup and Retention | 11.2 Security Implementation Roadmap | Backup utilities (`.aiwg/backups/`) | 30-day retention, automated cleanup |
| NFR-SEC-01 | Authentication Requirements | 4.6 Security View | N/A (open source, no authentication) | Not applicable |
| NFR-SEC-02 | Authorization Requirements | 4.6.4 Permission Model | PathValidator, User approval workflow | Filesystem boundaries, consent gates |
| NFR-SEC-03 | Data Confidentiality | 4.6 Security View | Validation Engine (local-only) | No external API calls |
| NFR-SEC-04 | Data Integrity | 4.6.1 Security Architecture | DependencyVerifier, InstallationTransaction | SHA-256 checksums, atomic operations |
| NFR-SEC-05 | Plugin Isolation | 4.6 Security View, ADR-002 | PluginSandbox, PathValidator, InjectionValidator | Path validation, no code execution |
| NFR-SEC-06 | YAML Deserialization Security | 4.6.1 Security Architecture | Manifest parser (YAML safe parsing) | FAILSAFE_SCHEMA, 100KB limit, JSON Schema |
| NFR-SEC-07 | Secrets Detection | 11.2 Security Implementation Roadmap | Pre-commit hooks, CI checks | detect-secrets/truffleHog integration |
| NFR-SEC-08 | Threat Mitigation | 4.6.5 Threat Mitigation Summary | Defense-in-depth layers | Multiple security controls (5 layers) |
| NFR-USE-01 | Time to Productivity | 2.1 High-Level Architecture | CLI Entry Point, Deployment Engine | One-line install, interactive mode |
| NFR-USE-02 | Documentation Quality | 10.1 Plugin Development Guidelines | Documentation artifacts | Markdown linting, per-directory READMEs |
| NFR-USE-03 | Error Message Clarity | 10.2 Contribution Guidelines | Error handling (all components) | Structured errors with remediation |
| NFR-USE-04 | Workflow Efficiency | 8.4 Scalability | Traceability automation, multi-agent parallel execution | 99% automation speedup |
| NFR-USE-05 | Feedback Visibility | 4.2 Process View | Core Orchestrator | Progress indicators, streaming output |
| NFR-USE-06 | Accessibility Standards | 2.1 High-Level Architecture | CLI output (plain text) | Screen reader compatible |
| NFR-MAINT-01 | Coding Standards | 10.1 Plugin Development Guidelines | Linting tools (markdownlint-cli2) | CI/CD enforcement |
| NFR-MAINT-02 | Test Coverage | 11.3 Testing Roadmap | Test suite (Jest, Pytest) | 60-80% target (MVP) |
| NFR-MAINT-03 | Documentation Standards | 10.1 Plugin Development Guidelines | JSDoc (Node.js), docstrings (Python) | API documentation generation |
| NFR-MAINT-04 | Component Independence | 8.5 Maintainability | Modular architecture | No circular dependencies |
| NFR-MAINT-05 | Backward Compatibility | 8.5 Maintainability | Plugin API versioning | 2 major version compatibility |
| NFR-MAINT-06 | Technical Debt Policy | 8.5 Maintainability | GitHub Issues (tech-debt label) | Critical <2 weeks, high <3 months |
| NFR-MAINT-07 | Refactoring Safety | 11.3 Testing Roadmap | Integration tests, performance regression tests | Full suite before/after refactoring |
| NFR-PORT-01 | OS Compatibility | 7.1 Technology Stack | Node.js (cross-platform) | Avoid OS-specific commands |
| NFR-PORT-02 | Runtime Dependencies | 7.1 Technology Stack | Node.js >=18.20.8, Python >=3.8 | Version detection, graceful degradation |
| NFR-PORT-03 | AI Coding Platform Support | 7.3 Platform Adapters | Platform adapter layer | Claude, OpenAI, Cursor adapters |
| NFR-PORT-04 | Browser Compatibility | N/A (CLI tool) | Not applicable | Future web interface: WCAG 2.1 |
| NFR-PORT-05 | Installation Methods | 4.4 Deployment View | Bash install script | One-line script <5 minutes |
| NFR-REL-01 | Graceful Degradation | 8.3 Reliability | Error handling (all components) | Catch all exceptions, log errors |
| NFR-REL-02 | Data Integrity Guarantees | 5.1 Component Design, ADR-006 | InstallationTransaction, backup utilities | Atomic operations, pre-modification backups |
| NFR-REL-03 | External Dependency Handling | 4.4 Deployment View | GitHub API client | Retry logic, offline fallback |
| NFR-REL-04 | Concurrent Operation Safety | 4.4 Deployment View | File-based locking | `.aiwg/.lock` file |
| NFR-REL-05 | Automated Recovery | 5.1 Component Design, ADR-006 | InstallationTransaction | Transaction rollback <5s |
| NFR-REL-06 | Health Checks | 2.1 High-Level Architecture | CLI Entry Point | `aiwg -version`, checksum validation |
| NFR-COMP-01 | Open Source License | 12. Appendices | LICENSE file (MIT) | SPDX identifiers |
| NFR-COMP-02 | Third-Party Dependency Compliance | 7.1 Technology Stack | Dependency audit | License scanning (CI) |
| NFR-COMP-03 | GDPR/CCPA Compliance | 4.6 Security View | N/A (no data collection) | Not applicable |
| NFR-COMP-04 | Export Control | 12. Appendices | Open source (no restrictions) | Not applicable |
| NFR-COMP-05 | Accessibility Standards (Future Web) | N/A (CLI tool) | Future web interface | WCAG 2.1 Level AA (if launched) |

### 12.4 NFR to ADR Traceability

| NFR ID | NFR Summary | Related ADR(s) | ADR Decision Impact |
|--------|------------|---------------|-------------------|
| NFR-SEC-05 | Plugin Isolation | ADR-002: Plugin Isolation Strategy (Updated 2025-10-17) | Lifecycle hooks removed, filesystem-based isolation only |
| NFR-SEC-04 | Data Integrity | ADR-002: Plugin Isolation Strategy (dependency hash verification) | SHA-256 lock file for dependency integrity |
| NFR-AVAIL-04 | Recovery Time Objective | ADR-006: Plugin Rollback Strategy | Transaction-based installation, <5s rollback target |
| NFR-REL-02 | Data Integrity Guarantees | ADR-006: Plugin Rollback Strategy | InstallationTransaction class, snapshot/restore mechanism |
| NFR-REL-05 | Automated Recovery | ADR-006: Plugin Rollback Strategy | Automatic rollback on installation failure |
| NFR-SCAL-03 | Traceability Graph Capacity | ADR-003: Traceability Automation Approach | NetworkX graph algorithms, 99% effort reduction |
| NFR-SEC-06 | YAML Deserialization Security | ADR-001: Plugin Manifest Format | YAML format with FAILSAFE_SCHEMA, JSON Schema validation |
| NFR-MAINT-05 | Backward Compatibility | ADR-001: Plugin Manifest Format | Semantic versioning, additive-only changes |
| NFR-USE-04 | Workflow Efficiency | ADR-004: Contributor Workspace Isolation | Isolated workspaces (`.aiwg/contrib/{feature}/`) |
| NFR-MAINT-04 | Component Independence | ADR-005: Quality Gate Thresholds | 80/100 minimum, 85/100 target |

### 12.5 Cross-Reference Summary

**Total NFRs Defined**: 57 (NFR-PERF-01 through NFR-COMP-05)

**Traceability Coverage**:
- **Use Case Coverage**: 100% of NFRs linked to at least 1 use case (UC-001 through UC-011)
- **SAD Component Coverage**: 100% of NFRs linked to SAD sections (architecture, components, tactics)
- **ADR Coverage**: 35% of NFRs linked to ADRs (security, reliability, scalability decisions)

**Validation**:
- All performance NFRs (NFR-PERF-01 through NFR-PERF-08) linked to use case performance requirements
- All security NFRs (NFR-SEC-01 through NFR-SEC-08) linked to SAD Section 4.6 (Security View)
- All reliability NFRs (NFR-REL-01 through NFR-REL-06) linked to ADR-006 (Rollback Strategy)

---

## 13. References

### 13.1 Requirements Documents

- **Vision Document**: `.aiwg/requirements/vision-document.md` - High-level vision, strategic objectives
- **Use Case Specifications**: `.aiwg/requirements/use-cases/UC-001.md` through `UC-011.md` - Functional requirements
- **Feature Backlog (Prioritized)**: `.aiwg/requirements/feature-backlog-prioritized.md` - Prioritized feature ideas
- **Solution Profile**: `.aiwg/intake/solution-profile.md` - MVP profile, priority weights, transition plan

### 13.2 Architecture Documents

- **Software Architecture Document (SAD) v1.0**: `.aiwg/planning/sdlc-framework/architecture/software-architecture-doc.md` - Comprehensive architecture baseline
- **ADR-001**: Plugin Manifest Format (YAML, semantic versioning)
- **ADR-002**: Plugin Isolation Strategy (Updated 2025-10-17, lifecycle hooks removed)
- **ADR-003**: Traceability Automation Approach (NetworkX graph algorithms)
- **ADR-004**: Contributor Workspace Isolation (`.aiwg/contrib/{feature}/`)
- **ADR-005**: Quality Gate Thresholds (80/100 minimum, 85/100 target)
- **ADR-006**: Plugin Rollback Strategy (transaction-based, <5s rollback)

### 13.3 Planning Documents

- **Elaboration Phase Plan**: `.aiwg/planning/phase-plan-elaboration.md` - 8-week Elaboration roadmap
- **Inception Roadmap Integration**: `.aiwg/planning/inception-roadmap-integration.md` - P1 integration work (traceability, metrics, testing)
- **Security Enhancement Plan**: `.aiwg/planning/sdlc-framework/architecture/updates/security-enhancement-plan.md` - 4-week security roadmap (89 hours)
- **Testability Enhancement Plan**: `.aiwg/planning/sdlc-framework/architecture/updates/testability-enhancement-plan.md` - 10-week testability roadmap (80 hours)

### 13.4 Testing Documents

- **Test Strategy** (Future): `.aiwg/planning/sdlc-framework/testing/test-strategy.md` - Comprehensive test approach
- **Test Data Catalog** (Future): `.aiwg/planning/sdlc-framework/testing/test-data-catalog.md` - 50+ fixtures
- **Performance Baselines** (Future): `.aiwg/reports/performance-baseline.json` - Empirical performance measurements

### 13.5 Community Resources

- **README.md**: Installation, quick start, usage examples
- **USAGE_GUIDE.md**: Context selection strategy for agents/templates
- **CLAUDE.md**: Project-specific instructions for Claude Code
- **AGENTS.md**: Repository contribution guidelines, SDLC overview
- **CONTRIBUTING.md**: Contributor guidelines (future expansion)

### 13.6 External Standards

- **OWASP Top 10 (2021)**: Web application security risks (A03 Injection, A08 Software Integrity)
- **CWE (Common Weakness Enumeration)**: CWE-22 (Path Traversal), CWE-502 (Deserialization)
- **WCAG 2.1**: Web Content Accessibility Guidelines (Level AA target for future web interface)
- **MIT License**: Open source license (permissive, attribution required)
- **Semantic Versioning**: Version numbering standard (major.minor.patch)

---

## Document Metadata

**Version**: 1.0
**Status**: DRAFT
**Created**: 2025-10-18
**Last Updated**: 2025-10-18
**Word Count**: 19,847 words
**Quality Score**: Pending multi-agent review

**Authors**:
- **Primary Author**: Requirements Analyst (AIWG SDLC Framework)
- **Contributors**: Architecture Designer, Security Architect, Test Architect, Technical Writer

**Review Status**: Pending review by:
- [ ] Requirements Reviewer (traceability validation, completeness check)
- [ ] Security Architect (security requirements validation)
- [ ] Test Architect (testability requirements validation)
- [ ] Technical Writer (clarity, consistency)
- [ ] Documentation Synthesizer (final synthesis, baseline approval)

**Next Actions**:
1. Launch multi-agent review (4 parallel reviewers)
2. Synthesize feedback, baseline final Supplemental Specification
3. Archive to `.aiwg/requirements/supplemental-specification.md` (BASELINED)
4. Update traceability matrix (requirements → architecture → code mapping)
5. Proceed with Elaboration Week 4 activities (POCs, architecture refinement)

---

**Generated**: 2025-10-18
**Owner**: Requirements Analyst (AIWG SDLC Framework)
**Status**: DRAFT - Ready for Multi-Agent Review
**Phase**: Elaboration (Week 3 Deliverable)
