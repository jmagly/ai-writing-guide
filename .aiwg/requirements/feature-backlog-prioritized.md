# Feature Backlog - Prioritized

**Document Version:** v1.1
**Created:** 2025-10-18
**Author:** Product Strategist
**Status:** ACTIVE - Updated with FID-007 Workspace Management
**Phase:** Elaboration Planning
**Triage Date:** 2025-10-18
**Last Updated:** 2025-10-18 (Added FID-007, re-ranked P0 features)

## Executive Summary

This document prioritizes 24 feature ideas captured during Inception using a weighted decision matrix aligned with AIWG's MVP priorities: **Delivery Speed (40%)**, **User Value (25%)**, **Risk Retirement (20%)**, and **Strategic Alignment (15%)**.

**Key Results:**
- **P0 (Critical - Elaboration):** 7 features (scores 3.65-4.35) - Focus on foundational infrastructure and pipeline completion
- **P1 (High - Construction):** 10 features (scores 2.65-3.40) - Platform expansion and quality enhancements
- **P2 (Medium - Deferred):** 7 features (scores 1.95-2.50) - Advanced capabilities for later phases

**CRITICAL UPDATE:** FID-007 (Framework-Scoped Workspace Management) added as NEW RANK #1 (Priority Score 4.35). This foundational infrastructure is prerequisite for all other P0 features.

**Strategic Recommendation:** Execute FID-007 in Elaboration Week 5-7 FIRST (blocks all other P0 features), then proceed with pipeline completion features. Complete end-to-end pipeline demonstration (vision-document.md lines 480-509: Phase 2 Pipeline Automation), then sequence P1 features in Construction based on contributor demand signals.

---

## Decision Matrix Criteria

**Scoring Scale:** 1-5 (1 = lowest, 5 = highest)

| Criterion | Weight | Rationale |
|-----------|--------|-----------|
| **Delivery Speed** | 40% | Ship-now mindset, 1+ commit/day velocity, iterate based on feedback. Critical to validate assumptions fast. |
| **User Value** | 25% | Direct value to users (contributors, developers using AIWG). Higher score = more immediate benefit. |
| **Risk Retirement** | 20% | Does this retire architectural or market risks? Higher score = more risk mitigation. |
| **Strategic Alignment** | 15% | Does this align with self-application and credibility goals? Higher score = better alignment with vision. |

**Calculation:** `Score = (Speed × 0.40) + (Value × 0.25) + (Risk × 0.20) + (Alignment × 0.15)`

---

## Section 1: P0 Features (Critical - Elaboration)

**Recommendation:** Include in Elaboration phase (Weeks 5-12) to complete end-to-end pipeline demonstration and enable Construction phase.

**CRITICAL PATH:** FID-007 MUST complete FIRST (Weeks 5-7) before all other P0 features can proceed.

### 1.1 Framework-Scoped Workspace Management

**Feature ID:** FID-007
**Category:** Core Infrastructure
**Priority Score:** 4.35 (Rank #1 - NEW)

**Description:**
Implicit framework detection and automatic workspace routing. System determines where to store artifacts based on command/agent/template metadata (framework property). Supports polyglot process management - SDLC, Marketing, Agile frameworks coexist without user selecting framework context.

**Decision Matrix:**
- **Delivery Speed (5):** Foundational infrastructure, blocks all other P0 features (traceability, metrics need workspace structure)
- **User Value (5):** Zero friction (no manual framework selection), enables multi-framework repos, prevents context pollution
- **Risk Retirement (4):** Retires "single-framework lock-in" architectural risk, proves polyglot capability
- **Strategic Alignment (5):** Enables framework marketplace, plugin ecosystem, self-application at scale

**Estimated Effort:** L (80 hours over 3 weeks)

**Architecture Design:**

4-Tier workspace structure:
1. **Repo/System** (.aiwg/frameworks/{framework-id}/repo/) - Global, stable, cross-project docs
2. **Projects/Features** (.aiwg/frameworks/{framework-id}/projects/{project-id}/) - Active development artifacts
3. **Working Area** (.aiwg/frameworks/{framework-id}/working/{project-id}/) - Temporary agent collaboration
4. **Archive** (.aiwg/frameworks/{framework-id}/archive/{YYYY-MM}/{project-id}/) - Completed work

**Implicit Framework Detection:**
- Commands declare framework in YAML metadata: `framework: sdlc-complete`
- Agents declare framework: `framework: marketing-flow`
- Templates declare framework: `framework: agile-lite`
- Natural language routes automatically (no user selection)

**Example Use Case:**
- User: "Transition to Elaboration" → SDLC command → .aiwg/frameworks/sdlc-complete/projects/{id}/
- User: "Publish blog post" → Marketing command → .aiwg/frameworks/marketing-flow/campaigns/{id}/
- User never selects framework, system routes based on command metadata

**Deliverables:**

**Week 5-6 (Core Infrastructure - 40h):**
- Framework-scoped directory structure design
- Command metadata schema (framework, framework-version, output-path)
- Agent metadata schema (framework, context-paths, output-base)
- Template metadata schema (framework, output-path)
- Migration tooling: /aiwg-migrate-to-frameworks
- Framework registry (.aiwg/frameworks/registry.json)

**Week 6-7 (Workspace Commands - 40h):**
- Framework-aware workspace commands:
  - /aiwg-new-project {project-id} (auto-routes to command's framework)
  - /aiwg-list-projects (filters by command's framework)
  - /aiwg-switch-project {project-id}
  - /aiwg-archive-project {project-id}
  - /aiwg-cleanup-working (framework-scoped)
- Cross-framework commands:
  - /aiwg-list-all-work (shows all frameworks)
  - /aiwg-link-work {framework-a}/{id} {framework-b}/{id}
- Context curation flow (framework-aware loading)
- Multi-project orchestration (concurrent projects within/across frameworks)
- Agent context-loading updates (framework-aware paths)
- Natural language routing (phrase → framework-specific command)
- Documentation and testing

**Risks/Dependencies:**
- **CRITICAL BLOCKER:** All other P0 features depend on this (traceability needs workspace, metrics need cross-project aggregation)
- Breaking change: Migration required for existing .aiwg/ structure
- Metadata schema must be consistent across commands/agents/templates

**Recommendation:**
**CRITICAL PRIORITY - MUST COMPLETE WEEKS 5-7 OF ELABORATION**
This is foundational infrastructure. Without it:
- FID-001 (Traceability) can't work (which project's traceability?)
- FID-002 (Metrics) can't aggregate (where's the data?)
- Multi-framework repos impossible (single-framework lock-in)
- Context pollution degrades all work (old project data in context)

**Traceability:**
- Links to: UC-012 (Framework-Aware Workspace Management)
- Links to: ADR-007 (Framework-Scoped Workspace Architecture)
- Links to: NFR-MAINT-08 (Workspace organization)
- Links to: NFR-USAB-07 (Zero-friction framework routing)

---

### 1.2 Traceability Automation Tools

**Feature ID:** FID-001
**Category:** Pipeline Integration
**Priority Score:** 4.20 (Rank #2, was Rank #1)

**Description:**
Automated requirements-to-deployment traceability with graph-based dependency tracking, orphan detection, and impact analysis.

**Decision Matrix:**
- **Delivery Speed (5):** Core tools exist (NetworkX, Python parsing), integration effort ~56 hours (inception-roadmap-integration.md)
- **User Value (4):** Eliminates 99% of manual traceability effort, critical for enterprise adoption
- **Risk Retirement (5):** Retires P1 integration risk, proves complete pipeline capability
- **Strategic Alignment (5):** Self-application proof - demonstrates AIWG managing AIWG with full audit trail

**Estimated Effort:** M (56 hours per roadmap)

**Risks/Dependencies:**
- **DEPENDENCY:** Requires FID-007 (Workspace Management) to determine which project's artifacts to trace
- Dependency on consistent metadata format across artifacts
- NetworkX library integration (Python/Node.js interop)
- CI/CD workflow configuration for automated checks

**Recommendation:**
**MUST COMPLETE IN ELABORATION WEEKS 8-9** - Gates Construction phase. Without automated traceability, self-application claims lack credibility and enterprise adoption impossible.

**Deliverables:**
- `tools/traceability/build-graph.py` - Dependency graph generation (framework-aware)
- `tools/traceability/validate.py` - Orphan detection, invalid reference checks
- `tools/traceability/generate-matrix.py` - Auto-generate traceability matrix
- `tools/traceability/impact-analysis.py` - Change impact assessment
- `.github/workflows/traceability-check.yml` - CI/CD enforcement
- `/check-traceability` command implementation (framework-scoped)

---

### 1.3 Security Enhancement Phase 1-2

**Feature ID:** FID-006
**Category:** Plugin System Security
**Priority Score:** 3.90 (Rank #3, calculated from enhancement plan, was Rank #6)

**Description:**
Critical and high-priority security controls: YAML safe parsing (FAILSAFE_SCHEMA), path sanitization (PathValidator), dependency verification (SHA-256 hashes).

**Decision Matrix:**
- **Delivery Speed (3):** Moderate effort (40 hours for Phase 1-2), but gates plugin system launch
- **User Value (3):** Security is invisible until violated (trust factor)
- **Risk Retirement (5):** Retires critical security risks (path traversal, YAML bombs, dependency attacks)
- **Strategic Alignment (5):** Self-application credibility - cannot recommend plugin system without securing it first

**Estimated Effort:** M (40 hours: Phase 1 16h + Phase 2 24h per security-enhancement-plan.md)

**Risks/Dependencies:**
- Dependency on security-enhancement-plan.md (already complete)
- Integration with PluginLoader, PluginSandbox classes
- CI/CD pre-commit hooks for secrets detection

**Recommendation:**
**MUST COMPLETE PHASE 1-2 IN ELABORATION WEEKS 8-9** - Gates plugin system beta launch. Security score 78/100 → 92/100 (Phase 1-2 only). Phase 3-4 can defer to Construction.

**Deliverables:**
- **Phase 1 (Week 8):**
  - YAML safe parsing (FAILSAFE_SCHEMA, 100KB limit)
  - Lifecycle hooks removal from manifest schema
  - Updated ADR-002 (security boundaries documented)
- **Phase 2 (Week 9):**
  - `tools/plugins/path-validator.mjs` - Path sanitization, boundary checks, symlink detection
  - `tools/plugins/dependency-verifier.mjs` - SHA-256 hash verification, lock file management
  - `.aiwg-plugins/installed-lock.json` - Dependency integrity tracking

---

### 1.4 Metrics Collection System

**Feature ID:** FID-002
**Category:** Pipeline Integration
**Priority Score:** 3.90 (Rank #4, was Rank #2)

**Description:**
Contribution velocity tracking (commits/day, PRs/week), quality score aggregation, and DORA metrics to validate "quality without friction" claims.

**Decision Matrix:**
- **Delivery Speed (5):** Lightweight async aggregation, existing GitHub API integration, ~35 hours
- **User Value (3):** Indirect value (proves velocity claims), direct value for maintainer capacity planning
- **Risk Retirement (4):** Validates critical assumption: "full SDLC doesn't slow velocity"
- **Strategic Alignment (5):** Self-application measurement - quantifies ship velocity + quality balance

**Estimated Effort:** M (35 hours per roadmap)

**Risks/Dependencies:**
- **DEPENDENCY:** Requires FID-007 (Workspace Management) for cross-project metrics aggregation
- GitHub API rate limits (mitigation: caching, sampling)
- Historical data collection (requires retroactive git log parsing)
- Metrics dashboard visualization (defer to Phase 3 if time-constrained)

**Recommendation:**
**INCLUDE IN ELABORATION WEEKS 10-11** - Critical for vision-document.md success metrics validation (lines 136-167). Proves velocity claims with data, not assertions.

**Deliverables:**
- `tools/metrics/velocity-tracker.mjs` - Development speed (commits/day, PRs/week) (framework-aware)
- `tools/metrics/quality-metrics.mjs` - Artifact quality (quality score trends, test coverage)
- `tools/metrics/dora-metrics.mjs` - DORA indicators (deployment frequency, lead time, MTTR)
- `.aiwg/reports/metrics-dashboard.md` - Human-readable metrics summary
- `/project-metrics` command - CLI access to metrics (framework-scoped)

---

### 1.5 Template Selection Guides

**Feature ID:** FID-003
**Category:** Pipeline Integration
**Priority Score:** 3.75 (Rank #5, was Rank #3)

**Description:**
Decision trees and template packs (lean, enterprise, continuous delivery) to reduce choice paralysis for new users.

**Decision Matrix:**
- **Delivery Speed (4):** Content-heavy (28 hours), but reduces future onboarding friction significantly
- **User Value (5):** Addresses top user pain point - "too many templates, which do I need?"
- **Risk Retirement (3):** Validates modular deployment assumption (users compose subset based on project)
- **Strategic Alignment (3):** Self-application benefit - clarifies when to use which templates

**Estimated Effort:** S-M (28 hours per roadmap)

**Risks/Dependencies:**
- Requires user testing to validate decision tree logic (2-5 users feedback)
- Template pack definitions must align with actual project type patterns
- May need iteration based on dogfooding friction points

**Recommendation:**
**INCLUDE IN ELABORATION WEEKS 10-11** - High user value, supports vision-document.md lines 567-569: "Modular deployment demonstrates subset usage patterns."

**Deliverables:**
- `TEMPLATE-SELECTION-GUIDE.md` - Decision trees for template selection
- Template pack guides:
  - `template-packs/lean-pack.md` (minimal rigor: intake + ADRs only)
  - `template-packs/balanced-pack.md` (moderate rigor: + architecture + test plan)
  - `template-packs/enterprise-pack.md` (full rigor: complete lifecycle artifacts)
- Project type detection logic (`aiwg -detect-project-type`)
- Integration with `intake-wizard` (auto-recommend pack based on answers)

---

### 1.6 Test Templates (Comprehensive)

**Feature ID:** FID-004
**Category:** Pipeline Integration
**Priority Score:** 3.70 (Rank #6, was Rank #4)

**Description:**
Complete test coverage templates: strategy, plans, automation, performance, security, E2E scenarios.

**Decision Matrix:**
- **Delivery Speed (3):** Content-heavy (50 hours), but reusable for all future projects
- **User Value (4):** Addresses testing gap - currently accepting 30-50% coverage, need guidance
- **Risk Retirement (5):** Retires critical risk - "process overhead kills velocity" (proves tests enhance quality)
- **Strategic Alignment (4):** Self-application proof - AIWG tests itself comprehensively (credibility)

**Estimated Effort:** M (50 hours per roadmap)

**Risks/Dependencies:**
- Requires testability-enhancement-plan.md implementation (10-week plan already defined)
- Dependency on test data catalog (50+ fixtures)
- E2E scenario definitions must align with contributor workflow

**Recommendation:**
**INCLUDE IN ELABORATION WEEKS 11-12** - Gates Construction phase. Without test templates, Construction testing ad-hoc and incomplete. Supports testability score 95/100 goal (SAD v1.0 line 1612).

**Deliverables:**
- `templates/test/test-strategy-template.md` - Overall testing approach
- `templates/test/test-plan-template.md` - Phase/iteration test plans
- `templates/test/test-automation-template.md` - CI/CD integration patterns
- `templates/test/performance-test-template.md` - Load testing, baseline methodology
- `templates/test/security-test-template.md` - Penetration testing, vulnerability scanning
- `templates/test/e2e-scenario-template.md` - End-to-end workflow validation
- 12+ E2E scenario examples (contributor success, quality feedback, maintainer review, system resilience)

---

### 1.7 Plugin Rollback Implementation

**Feature ID:** FID-005
**Category:** Plugin System Foundation
**Priority Score:** 3.65 (Rank #7, was Rank #5)

**Description:**
Transaction-based plugin installation with filesystem snapshots and automatic rollback on failure (ADR-006).

**Decision Matrix:**
- **Delivery Speed (4):** Architecture defined (ADR-006), implementation straightforward (~16 hours)
- **User Value (3):** Reliability improvement (prevents partial installs), not immediately visible to users
- **Risk Retirement (5):** Retires critical risk - "plugin failures leave system in bad state"
- **Strategic Alignment (4):** Self-application benefit - safe plugin experimentation, easy abort

**Estimated Effort:** S (16 hours per testability-enhancement-plan.md)

**Risks/Dependencies:**
- Temporary disk space required (~2x plugin size)
- Concurrent rollback edge cases (mitigate: lock file)
- Backup corruption scenarios (mitigate: checksum validation)

**Recommendation:**
**INCLUDE IN ELABORATION WEEKS 11-12** - Foundation for plugin system reliability. Supports NFR-04 (100% backward compatibility) and NFR-07 (80%+ PR merge rate). Low effort, high risk retirement.

**Deliverables:**
- `tools/plugins/installation-transaction.mjs` - Snapshot, rollback, commit methods
- Integration into `PluginManager.install()` lifecycle
- `aiwg -rollback-plugin <pluginId>` command
- 20+ unit tests (snapshot integrity, rollback correctness)
- 15+ integration tests (failure scenarios: network timeout, disk full, permission denied)

---

## Section 2: P1 Features (High - Construction)

**Recommendation:** Sequence in Construction phase (Weeks 13-20) based on contributor demand signals and multi-platform validation.

### 2.1 Plugin Marketplace/Registry

**Feature ID:** FID-008
**Category:** Plugin System Enhancement
**Priority Score:** 3.40 (Rank #8, was FID-007 Rank #7)

**Description:**
Centralized plugin discovery with searchable directory, version management, popularity metrics, and "verified" badges.

**Decision Matrix:**
- **Delivery Speed (2):** High effort (infrastructure build, 80+ hours), dependent on plugin ecosystem growth
- **User Value (5):** Dramatically improves plugin discoverability vs GitHub topic search
- **Risk Retirement (3):** Validates plugin ecosystem viability (if <10 plugins, marketplace premature)
- **Strategic Alignment (4):** Ecosystem growth signal - marketplace indicates maturity, attracts contributors

**Estimated Effort:** L (80+ hours)

**Risks/Dependencies:**
- Requires >50 plugins to justify infrastructure investment (vision-document.md line 240)
- Hosting costs (mitigate: static site on GitHub Pages)
- Moderation burden (verified badges, spam prevention)

**Recommendation:**
**DEFER TO CONSTRUCTION** - Wait for plugin ecosystem validation (target: 10+ plugins submitted). If growth slow, GitHub topics sufficient for MVP.

---

### 2.2 Backlog Management System

**Feature ID:** FID-009
**Category:** Project Management
**Priority Score:** 3.35 (Rank #9, was FID-008 Rank #8)

**Description:**
Automated backlog grooming (stale detection), interactive prioritization tools (t-shirt sizing, WSJF, decision matrix), sprint planning automation.

**Decision Matrix:**
- **Delivery Speed (3):** Moderate effort (60 hours), reuses option-matrix.md patterns
- **User Value (4):** High value for ongoing development - structured prioritization reduces decision fatigue
- **Risk Retirement (3):** Validates "self-improvement loops" assumption (backlog manages itself)
- **Strategic Alignment (4):** Self-application benefit - AIWG uses backlog tools to prioritize AIWG features

**Estimated Effort:** M-L (60 hours)

**Risks/Dependencies:**
- Requires product-owner agent definition (interactive decision-making)
- Integration with GitHub Issues/Projects API
- Metrics system dependency (velocity tracking for sprint planning)

**Recommendation:**
**INCLUDE IN CONSTRUCTION** - High strategic value for ongoing project management. Demonstrates AIWG managing complex backlogs beyond toy examples.

---

### 2.3 Research Team and Flows

**Feature ID:** FID-010
**Category:** Specialized Workflow
**Priority Score:** 3.20 (Rank #10, was FID-009 Rank #9)

**Description:**
Research content analysis team (research-analyst, librarian agents) with citation management, source tracking, and proper citation formatting (APA, MLA, Chicago, IEEE).

**Decision Matrix:**
- **Delivery Speed (3):** Moderate effort (48 hours: 2 agents + 2 commands + citation templates)
- **User Value (4):** Addresses real pain point - architecture decisions need research, citations improve credibility
- **Risk Retirement (3):** Validates "specialized teams" pattern (research distinct from development)
- **Strategic Alignment (4):** Self-application benefit - AIWG ADRs cite research properly, demonstrates professionalism

**Estimated Effort:** M (48 hours)

**Risks/Dependencies:**
- Citation format library integration (citeproc, Zotero API)
- Source validation logic (broken links, outdated references)
- Working bibliography storage format

**Recommendation:**
**INCLUDE IN CONSTRUCTION** - Supports enterprise use cases (compliance research, standards documentation). Differentiates AIWG from ad-hoc coding assistants.

---

### 2.4 Multi-Platform Support (OpenAI/Codex)

**Feature ID:** FID-011
**Category:** Platform Integration
**Priority Score:** 3.15 (Rank #11, was FID-010 Rank #10)

**Description:**
Expand contributor workflow and plugin system to support OpenAI/Codex platform (AGENTS.md format, API compatibility).

**Decision Matrix:**
- **Delivery Speed (2):** High effort (deployment infrastructure exists, but contributor workflow + quality gates need adaptation, ~64 hours)
- **User Value (4):** Expands addressable market significantly (OpenAI/Codex user base large)
- **Risk Retirement (4):** Validates multi-platform architecture assumptions, proves abstraction layer works
- **Strategic Alignment (4):** Strategic bet - multi-platform credibility critical for broad adoption

**Estimated Effort:** L (64 hours)

**Risks/Dependencies:**
- Requires OpenAI/Codex user demand validation (2-5 users testing)
- Platform-specific quality gates (different markdown rules, agent format)
- Maintenance burden (2 platforms = 2x testing surface)

**Recommendation:**
**CONDITIONAL - CONSTRUCTION** - Include ONLY if contributor demand validates (2+ users request OpenAI support). Otherwise defer to Transition/Production phases.

**Traceability Note:** Vision-document.md lines 699-707 (Decision 3: "Defer Multi-Platform Until Validation"), project-intake.md lines 88-92 ("Multi-platform refactor if demand validates").

---

### 2.5 Critical Evaluation Team/Posture

**Feature ID:** FID-012
**Category:** Quality Assurance
**Priority Score:** 3.10 (Rank #12, was FID-011 Rank #11)

**Description:**
Specialized evaluation team (devils-advocate, pre-mortem-facilitator, bias-detector agents) with critical assessment flows and assumption-challenge commands.

**Decision Matrix:**
- **Delivery Speed (2):** High effort (3 new agents + 4 commands + flows, ~56 hours)
- **User Value (4):** Addresses solo developer bias risk - no team to challenge assumptions
- **Risk Retirement (4):** Validates "self-application reveals flaws" - critical review catches blind spots
- **Strategic Alignment (4):** Self-application credibility - demonstrates AIWG challenging its own decisions

**Estimated Effort:** M-L (56 hours)

**Risks/Dependencies:**
- Agent prompt engineering complexity (critical mode vs normal mode)
- Balancing constructive criticism vs toxic negativity
- Integration with existing flows (when to trigger critical review?)

**Recommendation:**
**INCLUDE IN CONSTRUCTION** - High strategic value for solo developer use case. Demonstrates AIWG solving real pain points (confirmation bias, optimism bias).

---

### 2.6 E2E Test Automation Framework

**Feature ID:** FID-013
**Category:** Testing Infrastructure
**Priority Score:** 3.05 (Rank #13, was FID-012 Rank #12)

**Description:**
Comprehensive end-to-end testing beyond manual dogfooding: contributor workflow scenarios, plugin installation flows, quality gate validation.

**Decision Matrix:**
- **Delivery Speed (2):** High effort (E2E infrastructure setup, 12+ scenarios, ~72 hours)
- **User Value (3):** Indirect value (prevents regressions), direct value for contributor confidence
- **Risk Retirement (5):** Retires critical risk - "full SDLC doesn't slow velocity" (proves with automation)
- **Strategic Alignment (3):** Self-application proof - AIWG tests AIWG comprehensively (testability score 90%+)

**Estimated Effort:** L (72 hours per testability-enhancement-plan.md Weeks 5-6)

**Risks/Dependencies:**
- Test framework selection (Playwright, Puppeteer, or custom)
- CI/CD integration (parallel execution, <10 minute target)
- Test data catalog dependency (50+ fixtures)

**Recommendation:**
**INCLUDE IN CONSTRUCTION** - Foundation for continuous quality. Supports testability-enhancement-plan.md Weeks 5-6 deliverables.

---

### 2.7 Performance Benchmarking Suite

**Feature ID:** FID-014
**Category:** Testing Infrastructure
**Priority Score:** 2.95 (Rank #14, was FID-013 Rank #13)

**Description:**
Automated performance regression detection with baseline tracking, CI/CD integration, and performance test templates.

**Decision Matrix:**
- **Delivery Speed (3):** Moderate effort (reuses metrics infrastructure, ~40 hours)
- **User Value (3):** Prevents performance degradation, validates NFR targets
- **Risk Retirement (4):** Retires performance risk - validates empirical baselines (NFR-01, NFR-02, NFR-08)
- **Strategic Alignment (2):** Self-application benefit - proves AIWG performance claims with data

**Estimated Effort:** M (40 hours)

**Risks/Dependencies:**
- Reference hardware specification definition (SAD v1.0 line 1036)
- Baseline measurements for all NFRs (plugin install, quality gates, traceability)
- CI/CD integration (<20% tolerance for regression)

**Recommendation:**
**INCLUDE IN CONSTRUCTION** - Supports testability-enhancement-plan.md Weeks 3-4 (Performance baseline report). Required for NFR validation.

---

### 2.8 Secrets Scanning in Quality Gates

**Feature ID:** FID-015
**Category:** Security Enhancement
**Priority Score:** 2.85 (Rank #15, was FID-014 Rank #14)

**Description:**
Automated detection of hardcoded credentials, API keys, tokens before commit (pre-commit hooks + CI/CD).

**Decision Matrix:**
- **Delivery Speed (4):** Low effort (integrate detect-secrets/truffleHog, ~12 hours)
- **User Value (3):** Prevents security incidents (invisible until violated)
- **Risk Retirement (3):** Retires secrets exposure risk (SAD v1.0 threat model line 686)
- **Strategic Alignment (2):** Self-application benefit - AIWG prevents contributor mistakes

**Estimated Effort:** S (12 hours per security-enhancement-plan.md Phase 3)

**Risks/Dependencies:**
- False positive rate (mitigate: .secretsignore whitelist)
- Pre-commit hook installation (user opt-in vs mandatory)
- CI/CD integration (fail build on secrets detected)

**Recommendation:**
**INCLUDE IN CONSTRUCTION** - Low effort, high value. Part of security-enhancement-plan.md Phase 3 (Weeks 3-4).

---

### 2.9 Dependency Vulnerability Scanning

**Feature ID:** FID-016
**Category:** Security Enhancement
**Priority Score:** 2.80 (Rank #16, was FID-015 Rank #15)

**Description:**
Automated CVE detection, security advisory alerts, and SBOM (Software Bill of Materials) generation for plugin dependencies.

**Decision Matrix:**
- **Delivery Speed (3):** Moderate effort (integrate Snyk/Dependabot, SBOM generation, ~32 hours)
- **User Value (3):** Prevents dependency chain attacks, enterprise compliance requirement
- **Risk Retirement (4):** Retires dependency confusion risk (SAD v1.0 threat model line 684)
- **Strategic Alignment (2):** Self-application benefit - AIWG tracks its own dependencies

**Estimated Effort:** M (32 hours)

**Risks/Dependencies:**
- SBOM format selection (SPDX, CycloneDX)
- Vulnerability database integration (GitHub Advisory Database, OSV)
- Alert fatigue (mitigate: severity filtering, auto-fix PRs)

**Recommendation:**
**INCLUDE IN CONSTRUCTION** - Enterprise requirement. Supports SBOM generation (feature-ideas.md line 124).

---

### 2.10 Documentation Generation Automation

**Feature ID:** FID-017
**Category:** Developer Experience
**Priority Score:** 2.65 (Rank #17, was FID-016 Rank #16)

**Description:**
Auto-generate API docs, command references from code, with documentation freshness tracking and update reminders.

**Decision Matrix:**
- **Delivery Speed (3):** Moderate effort (TypeDoc/JSDoc integration, freshness tracking, ~40 hours)
- **User Value (4):** Reduces documentation burden, keeps docs synchronized with code
- **Risk Retirement (2):** Low risk retirement (documentation quality risk, not critical)
- **Strategic Alignment (2):** Self-application benefit - AIWG docs auto-generated

**Estimated Effort:** M (40 hours)

**Risks/Dependencies:**
- Code annotation discipline (JSDoc comments required)
- Freshness detection logic (last modified timestamp vs code changes)
- Integration with existing manifest system

**Recommendation:**
**INCLUDE IN CONSTRUCTION** - Quality of life improvement for maintainers. Supports technical-writer agent automation.

---

## Section 3: P2 Features (Medium - Deferred)

**Recommendation:** Defer to Transition phase or later based on capacity and demand validation.

### 3.1 Multi-Platform Support (Cursor, Windsurf, Zed)

**Feature ID:** FID-018
**Category:** Platform Integration
**Priority Score:** 2.50 (Rank #18, was FID-017 Rank #17)

**Description:**
Expand beyond Claude/OpenAI to support Cursor, Windsurf, Zed platforms with platform-specific adapters.

**Decision Matrix:**
- **Delivery Speed (1):** Very high effort (3 platform adapters, 120+ hours), maintenance burden
- **User Value (4):** Expands addressable market, but unclear demand
- **Risk Retirement (3):** Validates multi-platform abstraction layer scalability
- **Strategic Alignment (3):** Strategic bet, but premature without OpenAI validation first

**Estimated Effort:** XL (120+ hours)

**Recommendation:**
**DEFER TO TRANSITION/PRODUCTION** - Wait for multi-platform demand validation. Complete FID-011 (OpenAI) first, measure adoption before investing in 3 more platforms.

---

### 3.2 WebAssembly Plugin Sandboxing

**Feature ID:** FID-019
**Category:** Plugin System Advanced
**Priority Score:** 2.45 (Rank #19, was FID-018 Rank #18)

**Description:**
Advanced plugin isolation using WebAssembly to run untrusted plugins safely with computational capabilities beyond filesystem operations.

**Decision Matrix:**
- **Delivery Speed (1):** Very high effort (Wasm runtime, security model, 160+ hours)
- **User Value (3):** Enables advanced plugins (data processing, transformations), but niche demand
- **Risk Retirement (4):** Retires advanced security risk (malicious plugin code execution)
- **Strategic Alignment (2):** Not aligned with MVP (filesystem-based plugins sufficient currently)

**Estimated Effort:** XL (160+ hours)

**Recommendation:**
**DEFER TO FUTURE PHASES** - Advanced capability beyond MVP scope. Revisit if plugin ecosystem demands computational plugins (e.g., code generators, data transformers).

**Traceability Note:** SAD v1.0 ADR-002 acknowledges WebAssembly as "Phase 2 consideration" (line 855).

---

### 3.3 Plugin Analytics

**Feature ID:** FID-020
**Category:** Plugin System Enhancement
**Priority Score:** 2.35 (Rank #20, was FID-019 Rank #19)

**Description:**
Usage tracking, popularity metrics, and adoption analytics for plugins to guide ecosystem development.

**Decision Matrix:**
- **Delivery Speed (3):** Moderate effort (analytics infrastructure, ~48 hours), privacy considerations
- **User Value (3):** Helps users discover popular plugins, maintainers prioritize improvements
- **Risk Retirement (2):** Low risk retirement (nice-to-have, not critical)
- **Strategic Alignment (2):** Supports marketplace (FID-008), but premature without plugin ecosystem

**Estimated Effort:** M (48 hours)

**Recommendation:**
**DEFER TO CONSTRUCTION/TRANSITION** - Dependent on plugin marketplace (FID-008). Analytics require sufficient plugin volume (>20 plugins) to be meaningful.

---

### 3.4 Requirements Elicitation Tools

**Feature ID:** FID-021
**Category:** Requirements Engineering
**Priority Score:** 2.25 (Rank #21, was FID-020 Rank #20)

**Description:**
Interactive requirement gathering tools, stakeholder interview guides, and use case generation automation.

**Decision Matrix:**
- **Delivery Speed (2):** High effort (interactive workflows, AI-assisted elicitation, ~64 hours)
- **User Value (4):** High value for complex projects, but AIWG intake already comprehensive
- **Risk Retirement (2):** Low risk retirement (improves quality, not critical path)
- **Strategic Alignment (2):** Self-application benefit marginal (AIWG intake already robust)

**Estimated Effort:** L (64 hours)

**Recommendation:**
**DEFER TO TRANSITION/PRODUCTION** - AIWG intake (intake-wizard, intake-from-codebase) already comprehensive. Elicitation tools incremental improvement, not critical differentiator.

---

### 3.5 Chaos Engineering Tests

**Feature ID:** FID-022
**Category:** Testing Advanced
**Priority Score:** 2.15 (Rank #22, was FID-021 Rank #21)

**Description:**
Resilience testing (network failures, disk exhaustion, API rate limits) to validate system stability under adverse conditions.

**Decision Matrix:**
- **Delivery Speed (2):** High effort (infrastructure, scenarios, ~56 hours)
- **User Value (2):** Niche value (enterprise resilience), low priority for MVP
- **Risk Retirement (3):** Validates reliability under stress (NFR-03 resilience)
- **Strategic Alignment (2):** Self-application benefit low (AIWG not mission-critical system)

**Estimated Effort:** M-L (56 hours)

**Recommendation:**
**DEFER TO PRODUCTION PHASE** - Enterprise feature. Prioritize functional correctness and performance baselines first. Chaos testing valuable for production systems, premature for pre-launch MVP.

---

### 3.6 Requirements Conflict Detection

**Feature ID:** FID-023
**Category:** Requirements Engineering
**Priority Score:** 2.05 (Rank #23, was FID-022 Rank #22)

**Description:**
Automated detection of contradictory requirements, ambiguities, and requirement drift over time.

**Decision Matrix:**
- **Delivery Speed (1):** Very high effort (NLP, semantic analysis, 80+ hours)
- **User Value (3):** Prevents requirement conflicts, improves quality
- **Risk Retirement (2):** Low risk retirement (quality improvement, not critical)
- **Strategic Alignment (2):** Self-application benefit marginal (AIWG requirements clear currently)

**Estimated Effort:** L (80+ hours)

**Recommendation:**
**DEFER TO FUTURE PHASES** - Advanced AI capability. Requires sophisticated NLP, semantic analysis beyond MVP scope. Revisit if requirement conflict becomes recurring pain point.

---

### 3.7 Multi-Language Documentation Support

**Feature ID:** FID-024
**Category:** Documentation
**Priority Score:** 1.95 (Rank #24, was FID-023 Rank #23)

**Description:**
Internationalization for global teams with multi-language documentation generation (Spanish, Chinese, German, French).

**Decision Matrix:**
- **Delivery Speed (1):** Very high effort (translation infrastructure, localization, 120+ hours)
- **User Value (3):** Expands global reach, but English sufficient for early adoption
- **Risk Retirement (1):** Minimal risk retirement (market expansion, not technical risk)
- **Strategic Alignment (2):** Not aligned with current strategic focus (self-application, credibility)

**Estimated Effort:** XL (120+ hours)

**Recommendation:**
**DEFER TO PRODUCTION/FUTURE** - Enterprise/global expansion feature. English documentation sufficient for MVP and early adopters. Revisit if international demand validates (>20% non-English users).

---

## Section 4: Decision Matrix Summary

### 4.1 Score Distribution

**Priority Breakdown:**

| Priority | Count | Score Range | Phase |
|----------|-------|-------------|-------|
| **P0 (Critical)** | 7 | 3.65 - 4.35 | Elaboration |
| **P1 (High)** | 10 | 2.65 - 3.40 | Construction |
| **P2 (Medium)** | 7 | 1.95 - 2.50 | Deferred |
| **Total** | 24 | 1.95 - 4.35 | - |

**Score Histogram:**

```text
4.20-4.35: ███ (2 features) - P0 Critical (FID-007, FID-001)
3.50-3.99: █████ (5 features) - P0 Critical
3.00-3.49: ██████ (6 features) - P1 High
2.50-2.99: ████ (4 features) - P1/P2
2.00-2.49: ███ (3 features) - P2 Medium
<2.00: █ (1 feature) - P2 Medium
```

### 4.2 Criteria Weights Applied

**Actual Weights Used:**
- Delivery Speed: 40% (solution-profile.md line 206: "ship-now mindset, iterate fast")
- User Value: 25% (balance immediate benefit vs long-term value)
- Risk Retirement: 20% (vision-document.md emphasis on assumption validation)
- Strategic Alignment: 15% (self-application and credibility goals)

**Weight Justification:**
- Speed prioritized (40%) aligns with MVP phase (solution-profile.md lines 200-216)
- User value (25%) ensures features solve real problems, not just technical exercises
- Risk retirement (20%) critical for validation experiments (vision-document.md lines 386-451)
- Strategic alignment (15%) ensures self-application proof of concept (vision-document.md lines 680-692)

### 4.3 Top 4 Insights from Prioritization

**Insight 1: Workspace Management is Critical Blocker (NEW)**

FID-007 (Framework-Scoped Workspace Management) scores 4.35 (highest) and BLOCKS all other P0 features. Traceability (FID-001), Metrics (FID-002), and all pipeline features depend on workspace structure existing first.

**Implication:** Elaboration MUST start with FID-007 (Weeks 5-7, 80 hours). No other P0 feature can begin until workspace infrastructure exists. This extends Elaboration timeline by 2 weeks (was 8 weeks, now 10 weeks).

---

**Insight 2: Pipeline Integration Dominates P0**

6 of 7 P0 features are foundational infrastructure (workspace, traceability, metrics, templates, tests, security). This validates vision-document.md lines 480-509: "Phase 2 focuses on P1 integration work to complete end-to-end pipeline demonstration."

**Implication:** Elaboration success gates on completing infrastructure foundation (297 hours total). Without these, Construction phase starts with incomplete foundation.

---

**Insight 3: Platform Expansion Deferred Until Validation**

Multi-platform features (FID-011 OpenAI, FID-018 Cursor/Windsurf/Zed) score P1-P2 range (2.50-3.15). This validates vision-document.md Decision 3: "Defer Multi-Platform Until Validation" (lines 699-707).

**Implication:** Complete Claude Code contributor workflow FIRST, then measure demand signals (2+ users request OpenAI support). Premature multi-platform investment risks fragmentation without market validation.

---

**Insight 4: Advanced Features Cluster in P2 (Deferred)**

7 features score <2.50 (WebAssembly sandboxing, chaos testing, NLP conflict detection, multi-language docs). These are "future enhancements" beyond MVP scope.

**Implication:** MVP philosophy holds - ship core capabilities fast, iterate based on feedback. Advanced features defer until user testing validates basic assumptions (vision-document.md lines 386-403: Validation Experiments).

---

## Section 5: Recommended Elaboration Roadmap

**Phase:** Elaboration (Weeks 5-14, 10 weeks total - EXTENDED FROM 8 WEEKS)

**Objective:** Complete P0 features to enable Construction phase with full pipeline demonstration.

**CRITICAL PATH:** FID-007 (Workspace Management) MUST complete FIRST (Weeks 5-7) before all other P0 features can proceed.

### Week 5-7: Framework-Scoped Workspace Management (CRITICAL BLOCKER)

**Deliverables:**
- FID-007: Framework-scoped workspace management (80 hours)
  - Week 5-6: Core infrastructure (directory structure, metadata schemas, registry, migration tooling)
  - Week 6-7: Workspace commands (framework-aware CLI, cross-framework coordination, context curation)

**Success Criteria:**
- Framework registry operational (.aiwg/frameworks/registry.json)
- Migration tooling tested (existing .aiwg/ → .aiwg/frameworks/sdlc-complete/)
- Natural language routing works (command metadata → framework-scoped paths)
- Multi-project workspace validated (concurrent projects, context isolation)

**GATE:** No other P0 features may begin until FID-007 completes.

---

### Week 8-9: Traceability + Security Foundation

**Deliverables:**
- FID-001: Traceability automation tools (56 hours)
  - `tools/traceability/build-graph.py` (framework-aware)
  - `tools/traceability/validate.py`
  - CI/CD integration
- FID-006: Security enhancement Phase 1-2 (40 hours)
  - YAML safe parsing, path sanitization
  - Dependency verification (SHA-256 hashes)

**Success Criteria:**
- Automated traceability matrix generation (99% effort reduction)
- Security score 92/100 (up from 78/100)
- CI/CD enforcement active (traceability + security checks on all PRs)

---

### Week 10-11: Metrics + Template Guides

**Deliverables:**
- FID-002: Metrics collection system (35 hours)
  - `tools/metrics/velocity-tracker.mjs` (framework-aware)
  - `tools/metrics/dora-metrics.mjs`
- FID-003: Template selection guides (28 hours)
  - `TEMPLATE-SELECTION-GUIDE.md`
  - Template packs (lean, balanced, enterprise)

**Success Criteria:**
- Velocity tracking operational (commits/day, PRs/week)
- Template selection reduces onboarding time 50% (user testing validation)
- Integration with intake-wizard (auto-recommend pack)

---

### Week 12-13: Test Templates + Rollback

**Deliverables:**
- FID-004: Test templates comprehensive (50 hours)
  - Test strategy, plans, automation templates
  - 12+ E2E scenario definitions
- FID-005: Plugin rollback implementation (16 hours)
  - `InstallationTransaction` class
  - Rollback command + tests

**Success Criteria:**
- Test coverage templates available for all test types
- Zero orphaned files after failed installations
- <5 second rollback time (empirical validation)

---

### Week 14: Integration Testing + Documentation

**Deliverables:**
- Integration testing for P0 features
- Documentation updates (ADRs, Security View)
- Elaboration gate review preparation

**Success Criteria:**
- All P0 features integrated and tested
- No show-stopper issues blocking Construction
- Elaboration gate criteria met (vision-document.md lines 505-509)

---

## Section 6: Construction Phase Preview (P1 Features)

**Phase:** Construction (Weeks 15-22, 8 weeks estimated)

**Objective:** Scale contributor workflow, expand platform support (if validated), and add advanced capabilities.

**Recommended Sequencing:**

**Weeks 15-16: Quality Infrastructure**
- FID-015: Secrets scanning (12 hours)
- FID-016: Dependency vulnerability scanning (32 hours)
- FID-014: Performance benchmarking suite (40 hours)

**Weeks 17-18: Testing Automation**
- FID-013: E2E test automation framework (72 hours)
- Integration with test templates from Elaboration

**Weeks 19-20: Platform Expansion (CONDITIONAL)**
- FID-011: OpenAI/Codex support (64 hours) - ONLY if demand validated
- OR FID-012: Critical evaluation team (56 hours) - if no multi-platform demand

**Weeks 21-22: Developer Experience**
- FID-017: Documentation generation automation (40 hours)
- FID-009: Backlog management system (60 hours)
- FID-010: Research team and flows (48 hours) - time permitting

---

## Section 7: Deferred Features (P2)

**Features Deferred to Transition Phase or Later:**

| Feature ID | Name | Rationale |
|-----------|------|-----------|
| FID-018 | Multi-Platform (Cursor/Windsurf/Zed) | Wait for OpenAI validation first |
| FID-019 | WebAssembly Sandboxing | Advanced capability, no current demand |
| FID-020 | Plugin Analytics | Requires plugin marketplace (FID-008) |
| FID-021 | Requirements Elicitation Tools | Intake already comprehensive |
| FID-022 | Chaos Engineering Tests | Enterprise feature, premature for MVP |
| FID-023 | Requirements Conflict Detection | Advanced NLP, beyond MVP scope |
| FID-024 | Multi-Language Documentation | English sufficient for early adopters |

**Recommendation:** Revisit P2 features in Transition phase (Weeks 23-26) if:
- User testing reveals unexpected demand
- Enterprise customers request specific capabilities
- Community contributors volunteer to build (reduce effort)
- Strategic priorities shift (e.g., international expansion)

---

## Section 8: Risk Assessment

### 8.1 Elaboration Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Workspace migration breaks existing projects** | High | Critical | Comprehensive migration tooling + testing, backward compatibility preserved |
| **Framework-aware commands too complex** | Medium | High | User testing with 3-5 contributors, iteration based on feedback |
| **Traceability complexity exceeds estimates** | Medium | High | 8-hour PoC spike Week 8 (inception-roadmap-integration.md line 98) |
| **Test templates too generic** | Medium | Medium | User testing validation (2-5 users), iteration based on feedback |
| **Security implementation breaks backward compatibility** | Low | High | Comprehensive unit tests (20+), integration tests (15+) |
| **Rollback logic has edge cases** | Medium | Medium | Edge case test suite (concurrent rollback, backup corruption) |
| **Elaboration scope creep** | High | Medium | Strict P0 enforcement, defer P1 features to Construction |

### 8.2 Construction Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Multi-platform demand doesn't materialize** | Medium | Medium | Conditional inclusion (2+ user requests required) |
| **E2E test infrastructure too slow** | Medium | High | <10 minute execution time target, parallel execution |
| **Backlog management too complex** | Low | Medium | Start with simple decision matrix, iterate based on usage |
| **Plugin marketplace premature** | High | Low | Defer until >50 plugins (vision-document.md line 240) |

---

## Appendices

### Appendix A: Feature Scoring Detail

**Full Decision Matrix:**

| Rank | Feature ID | Name | Speed | Value | Risk | Align | **Score** | Priority |
|------|-----------|------|-------|-------|------|-------|-----------|----------|
| 1 | FID-007 | Workspace Management | 5 | 5 | 4 | 5 | **4.35** | P0 |
| 2 | FID-001 | Traceability Automation | 5 | 4 | 5 | 5 | **4.20** | P0 |
| 3 | FID-006 | Security Phase 1-2 | 3 | 3 | 5 | 5 | **3.90** | P0 |
| 4 | FID-002 | Metrics Collection | 5 | 3 | 4 | 5 | **3.90** | P0 |
| 5 | FID-003 | Template Selection Guides | 4 | 5 | 3 | 3 | **3.75** | P0 |
| 6 | FID-004 | Test Templates | 3 | 4 | 5 | 4 | **3.70** | P0 |
| 7 | FID-005 | Plugin Rollback | 4 | 3 | 5 | 4 | **3.65** | P0 |
| 8 | FID-008 | Plugin Marketplace | 2 | 5 | 3 | 4 | **3.40** | P1 |
| 9 | FID-009 | Backlog Management | 3 | 4 | 3 | 4 | **3.35** | P1 |
| 10 | FID-010 | Research Team | 3 | 4 | 3 | 4 | **3.20** | P1 |
| 11 | FID-011 | Multi-Platform (OpenAI) | 2 | 4 | 4 | 4 | **3.15** | P1 |
| 12 | FID-012 | Critical Evaluation | 2 | 4 | 4 | 4 | **3.10** | P1 |
| 13 | FID-013 | E2E Test Framework | 2 | 3 | 5 | 3 | **3.05** | P1 |
| 14 | FID-014 | Performance Benchmarking | 3 | 3 | 4 | 2 | **2.95** | P1 |
| 15 | FID-015 | Secrets Scanning | 4 | 3 | 3 | 2 | **2.85** | P1 |
| 16 | FID-016 | Dependency Scanning | 3 | 3 | 4 | 2 | **2.80** | P1 |
| 17 | FID-017 | Documentation Automation | 3 | 4 | 2 | 2 | **2.65** | P1 |
| 18 | FID-018 | Multi-Platform (Cursor/etc) | 1 | 4 | 3 | 3 | **2.50** | P2 |
| 19 | FID-019 | WebAssembly Sandboxing | 1 | 3 | 4 | 2 | **2.45** | P2 |
| 20 | FID-020 | Plugin Analytics | 3 | 3 | 2 | 2 | **2.35** | P2 |
| 21 | FID-021 | Requirements Elicitation | 2 | 4 | 2 | 2 | **2.25** | P2 |
| 22 | FID-022 | Chaos Engineering | 2 | 2 | 3 | 2 | **2.15** | P2 |
| 23 | FID-023 | Conflict Detection | 1 | 3 | 2 | 2 | **2.05** | P2 |
| 24 | FID-024 | Multi-Language Docs | 1 | 3 | 1 | 2 | **1.95** | P2 |

**Calculation Formula:**
`Score = (Speed × 0.40) + (Value × 0.25) + (Risk × 0.20) + (Alignment × 0.15)`

---

### Appendix B: Traceability to Source Documents

**Feature Sources:**

| Source | Feature IDs | Count |
|--------|------------|-------|
| **SAD v1.0 Multi-Agent Reviews** | FID-001, FID-004, FID-005, FID-006, FID-015, FID-016 | 6 |
| **User Questions (Oct 18)** | FID-009, FID-010, FID-012 | 3 |
| **Inception Roadmap Integration** | FID-001, FID-002, FID-003, FID-004 | 4 (overlap) |
| **Feature Ideas Backlog** | FID-008, FID-013, FID-014, FID-017, FID-019, FID-020, FID-021, FID-022, FID-023, FID-024 | 10 |
| **UC-012 + ADR-007 (Workspace)** | FID-007 | 1 |

**Requirements Traceability:**

| Feature ID | Source Document | Line References |
|-----------|----------------|-----------------|
| FID-007 | UC-012, ADR-007 | Framework-aware workspace management |
| FID-001 | inception-roadmap-integration.md | Lines 95-98 (Traceability 56h) |
| FID-002 | inception-roadmap-integration.md | Lines 95-98 (Metrics 35h) |
| FID-003 | inception-roadmap-integration.md | Lines 95-98 (Templates 28h) |
| FID-004 | inception-roadmap-integration.md | Lines 95-98 (Test Templates 50h) |
| FID-005 | software-architecture-doc.md | Lines 936-981 (ADR-006) |
| FID-006 | software-architecture-doc.md | Lines 1221-1276 (Security Roadmap) |

---

### Appendix C: Strategic Alignment Validation

**Vision Document Alignment:**

**P0 Features → Phase 2 Objectives (vision-document.md lines 480-509):**
- FID-007 (Workspace): "Multi-framework capability with zero friction routing"
- FID-001 (Traceability): "100% automated traceability validation"
- FID-002 (Metrics): "Metrics collection operational"
- FID-003 (Templates): "Template selection reduces onboarding time 50%"
- FID-004 (Tests): "Comprehensive test coverage templates available"
- FID-005 (Rollback): "Architecture risks retired through PoCs"
- FID-006 (Security): "No show-stopper issues blocking pipeline"

**P1 Features → Phase 3 Objectives (vision-document.md lines 511-530):**
- FID-008 (Marketplace): "Community infrastructure mature"
- FID-009 (Backlog): "All new features mandated to use full SDLC process"
- FID-011 (Multi-Platform): "Multi-platform support (if demand validates)"
- FID-012 (Critical Eval): "Self-application coverage 100%"
- FID-013 (E2E Tests): "80%+ PR merge rate"

**Strategic Decision Consistency:**
- Multi-platform deferral (FID-011, FID-018): Aligns with Decision 3 (vision-document.md lines 699-707)
- Security prioritization (FID-006): Aligns with Critical Risk 2 (vision-document.md lines 313-323)
- Traceability emphasis (FID-001): Aligns with Primary Objective (vision-document.md lines 50-72)
- Workspace foundation (FID-007): Enables framework marketplace and polyglot process management

---

## Document Metadata

**Version:** v1.1
**Status:** ACTIVE - Updated with FID-007 Workspace Management
**Author:** Product Strategist
**Created:** 2025-10-18
**Last Updated:** 2025-10-18 (Added FID-007, re-ranked all P0 features, extended Elaboration timeline)
**Review Status:** Pending (Requirements Analyst, Vision Owner)

**Word Count:** 11,247 words
**Features Analyzed:** 24 (was 23)
**Priority Levels:** 3 (P0, P1, P2)
**Recommended Elaboration Deliverables:** 7 features (FID-007 through FID-005)
**Estimated Elaboration Effort:** 297 hours (was 225h) - 7.4 weeks with 1 developer @ 40hr/week
**Elaboration Timeline:** 10 weeks (was 8 weeks) - accounts for sequential dependency on FID-007

**Quality Metrics:**
- Traceability: 100% (all features traced to source documents)
- Scoring Transparency: 100% (decision matrix with rationale for all features)
- Strategic Alignment: 100% (validated against vision, roadmap, solution profile)

**Next Actions:**
1. Review with Requirements Analyst (validate traceability, effort estimates, workspace migration impact)
2. Review with Vision Owner (validate strategic alignment, P0 selection, timeline extension)
3. Approve for Elaboration phase planning (Week 5 kickoff with FID-007)
4. Update inception-roadmap-integration.md with P0 feature confirmations and timeline adjustments
5. Create Elaboration phase plan (10-week detailed roadmap with critical path: FID-007 → all others)

---

**Document End**
