# AIWG Production-Grade Unified Improvement Plan

Unified analysis synthesizing:

- **REF-001**: Academic analysis of Bandara et al. "Production-Grade Agentic AI Workflows" (arxiv 2512.08769)
- **Consultant Punchlist**: 11-item gap-closer punchlist from external review
- **Memory System Leverage**: See [memory-system-leverage.md](./memory-system-leverage.md) for Claude Code memory integration
- **Claude Code Features**: See [claude-code-features-leverage.md](./claude-code-features-leverage.md) for 2.0.43-2.0.64 feature adoption

## Executive Summary: Memory System Impact

Claude Code's memory hierarchy significantly accelerates our roadmap:

| Item | Original Approach | Memory-Optimized Approach | Effort Reduction |
|------|-------------------|---------------------------|------------------|
| #3 External Prompt Registry | Separate repo + submodule + runtime hooks | **Native via @imports** | ~90% |
| #4 Agent Design Bible | Monolithic doc | Importable prompts + path-filtered rules | ~50% |
| #2 Parallel-Hints | Template auto-injection | Single `.claude/rules/` file | ~80% |
| #1 Decompose Helper | Custom extension | Command + importable prompts | ~30% |
| #10 Linter | CLI only | CLI + runtime rules (belt & suspenders) | +20% value |

**Key enablers from memory system**:
- `@path/to/file` imports → External prompt registry is native
- `.claude/rules/*.md` → Modular, deployable guidance
- Path-specific frontmatter (`paths: .claude/agents/*.md`) → Conditional loading
- Recursive discovery → Nested project support

## Claude Code 2.0.64 Feature Impact

Recent Claude Code updates (2.0.43-2.0.64) provide additional acceleration:

| Feature | Impact on Unified Plan |
|---------|------------------------|
| **Async agents** (2.0.64) | #2 Parallel-Hints: Native async, no injection needed |
| **Subagent hooks** (2.0.43) | #6 Trace Collector: Native lifecycle capture |
| **Named sessions** (2.0.64) | #11 Resilience: Workflow state persistence |
| **@-mention fixes** (2.0.43) | Traceability: Live doc references in code/artifacts |
| **Skills frontmatter** (2.0.43) | Voice Framework: Auto-load skills per agent |
| **permissionMode** (2.0.43) | #4 Agent Bible: Permission tiers per agent type |
| **PermissionRequest hooks** (2.0.54) | All flows: Auto-approve trusted operations |

**New deliverables from feature adoption**:
- `aiwg-hooks` addon: Trace capture, permission auto-approve, session naming
- `traceability` addon: @-mention conventions, validation linter
- Agent frontmatter updates: skills, permissionMode fields
- Template updates: @-mention references throughout SDLC artifacts

## Cross-Reference Matrix

| # | Consultant Item | Paper BP | REF-001 Finding | Alignment |
|---|-----------------|----------|-----------------|-----------|
| 1 | Decompose Helper | BP-4 (Single Responsibility) | Noted task decomposition need | **Extends** - adds prescriptive tooling |
| 2 | Parallel-Hint System | BP-9 (KISS), implicit | Not explicitly covered | **New** - consultant addition |
| 3 | External Prompt Registry | BP-5 (Externalized Prompts) | Strong alignment noted | **Extends** - adds versioning/rollback |
| 4 | Agent Design Bible | BP-3, BP-4 (Tools, Responsibility) | Medium priority - validation | **Formalizes** - captures REF-001 principles |
| 5 | API Adapter Layer | BP-7 (MCP Separation) | Future consideration | **Aligns** - both identify as production enabler |
| 6 | Logging & Trace Collector | Observability (paper throughout) | High priority - observability framework | **Converges** - both high priority |
| 7 | Evals Framework | Implicit in case study | Not covered | **New** - consultant addition |
| 8 | Consortium Lite | BP-6 (Model Consortium) | High priority - multi-model consensus | **Converges** - both high priority |
| 9 | Docker/K8s Generator | BP-8 (Containerized Deployment) | Out of scope noted | **Expands** - consultant makes actionable |
| 10 | Responsibility Linter | BP-3, BP-4 | Medium priority - agent tool count | **Converges** - both identify need |
| 11 | Retry/Circuit-Breaker | BP-6 (Responsible AI) | Medium priority - reliability patterns | **Converges** - both identify need |

## Gap Analysis

### Items Both Sources Identify (High Confidence)

| Item | Paper BP | REF-001 Priority | Consultant Priority | Unified Priority |
|------|----------|------------------|---------------------|------------------|
| Observability/Tracing (#6) | BP-8 | High | Phase 1 | **P0** |
| Model Consortium (#8) | BP-6 | High | Phase 3 | **P1** |
| Responsibility Linter (#10) | BP-3, BP-4 | Medium | Phase 0 | **P0** |
| Retry/Resilience (#11) | BP-6 | Medium | Phase 4 | **P2** |
| API Adapter (#5) | BP-7 | Future | Phase 2 | **P2** |

### Items Consultant Adds Beyond REF-001

| Item | Value Add | Risk/Complexity | Unified Priority |
|------|-----------|-----------------|------------------|
| Decompose Helper (#1) | Determinism, clean handoffs | Medium (prompt engineering) | **P1** |
| Parallel-Hint System (#2) | Performance, agent utilization | Low (template injection) | **P1** |
| Evals Framework (#7) | Regression prevention, quality gates | High (separate repo, dataset design) | **P2** |

### Items REF-001 Adds Beyond Consultant

| Item | REF-001 Source | Value Add | Action |
|------|----------------|-----------|--------|
| Direct Function Guidelines | BP-2 | Bypass agents for deterministic ops | Add to Agent Design Bible (#4) |
| Error Recovery Patterns | Section 6 | Checkpoint/resume capability | Merge into Resilience (#11) |
| State Management Formalization | Key Concepts | Workflow state persistence | Merge into Trace Collector (#6) |
| Security Boundaries | BP-8 | RBAC, secret management | Future consideration |

## Unified Priority Matrix

### P0: Foundation (Week 1-2)

| # | Item | Type | Location | Deliverable |
|---|------|------|----------|-------------|
| 4 | Agent Design Bible | Docs + Templates | `docs/AGENT-DESIGN.md` + `templates/agent-scaffolding/` | 10 golden rules, automated checklist, `/agent-new` command |
| 10 | Responsibility Linter | Tool | `tools/linters/` | `aiwg lint agents` with CI integration |

**Rationale**: Both establish the "rules of the game" before other work proceeds. Every subsequent addon/extension can be validated against these standards.

**Success Criteria**:

- [ ] All 53 SDLC agents pass lint (green CI)
- [ ] Every new agent passes 10-rule checklist

### P1: Core Patterns (Week 3-5)

| # | Item | Type | Location | Deliverable |
|---|------|------|----------|-------------|
| 1 | Decompose Helper | Extension | `extensions/decompose-helper/` | `/task-decompose` command, 5 prompt templates (atomic→epic) |
| 2 | Parallel-Hint System | Addon | `addons/parallel-hints/` | Auto-injection, `/multi-run` wrapper |
| 6 | Trace Collector | Addon | `addons/run-tracer/` | JSON Lines logging, `/trace-start`, replay CLI |

**Rationale**: These are the "production-grade" reliability patterns that close the biggest paper gaps.

**Success Criteria**:

- [ ] 80% of intake tasks auto-split into ≤7 subtasks
- [ ] Parallel agent usage >60% on flows with ≥4 subtasks
- [ ] Every failed run produces downloadable trace in <3 seconds

### P2: Production Enablers (Week 6-8)

| # | Item | Type | Location | Deliverable |
|---|------|------|----------|-------------|
| 3 | External Prompt Registry | Extension (future core) | Separate repo `aiwg-prompts` (submodule) | Folder structure, load-at-runtime hook, versioning guide |
| 5 | API Adapter Layer | Extension | `extensions/api-adapter/` | Express/FastAPI server, OpenAPI spec, server mode |
| 9 | Deploy Generators | Templates | `templates/deploy/` | `/deploy-gen docker`, `/deploy-gen k8s` commands |

**Rationale**: Enable external system integration and deployment—the "production-grade" part of paper BP-7, BP-8.

**Success Criteria**:

- [ ] All new agents load ≥1 prompt from external registry
- [ ] Any workflow triggerable via webhook/HTTP
- [ ] Zero to containerized workspace in <2 minutes

### P3: Advanced Patterns (Week 9-12)

| # | Item | Type | Location | Deliverable |
|---|------|------|----------|-------------|
| 8 | Consortium Lite | Extension | `extensions/consortium-lite/` | 2-3 model config, majority-vote consolidator, opt-in flag |
| 7 | Evals Framework | New Repo | `aiwg-evals` (separate) | Dataset format, golden test runner, 5 initial tests |
| 11 | Retry/Circuit-Breaker | Addon | `addons/resilience/` | `@retry(3)` decorator, backoff, fallback-to-human |

**Rationale**: Advanced reliability patterns that require foundation work to be complete.

**Success Criteria**:

- [ ] Hallucination rate drops ≥30% on 20-sample benchmark (Consortium)
- [ ] 5 golden tests pass for SDLC Complete Phase 1 (Evals)
- [ ] Failed handoffs auto-retry ≥2 times before escalating (Resilience)

## Comparison: REF-001 vs Consultant Approach

### Where REF-001 and Consultant Converge

1. **Observability is Critical** - Both identify tracing/logging as high priority
2. **Single Responsibility** - Paper BP-4 aligns with Agent Design Bible
3. **Externalized Prompts** - Paper BP-5 is AIWG strength; consultant adds versioning
4. **Multi-Model Consensus** - Paper BP-6 maps to Consortium Lite
5. **Simplicity (KISS)** - Paper BP-9 validates AIWG's markdown-first approach

### Where REF-001 Goes Deeper

1. **Direct Function Guidelines (BP-2)** - Paper explicitly identifies when to bypass agents
   - **Action**: Add to Agent Design Bible section 6: "When NOT to Use an Agent"

2. **Checkpoint/Resume Patterns** - Paper mentions workflow state persistence
   - **Action**: Extend Trace Collector to include checkpoint capture

3. **Security Boundaries** - Paper BP-8 mentions RBAC, network policies
   - **Action**: Future consideration after core patterns land

### Where Consultant Goes Deeper

1. **Decomposition Tooling** - Prescriptive prompt templates for task splitting
   - **Action**: Accept as new capability not in REF-001

2. **Parallel-Hint Injection** - Auto-injection into orchestrator templates
   - **Action**: Accept as performance optimization pattern

3. **Evals Framework** - Formal golden test infrastructure
   - **Action**: Accept as quality assurance infrastructure

4. **Specific Implementation Guidance** - Repo locations, success metrics, delivery order
   - **Action**: Accept consultant's actionable specificity

## Unified Delivery Plan

### Phase 0: Foundation (This Week)

**Squad 1: Agent Design Bible**

- Lead: Technical Writer + Architecture Designer
- Deliverables:
  - `docs/AGENT-DESIGN.md` (10 golden rules)
  - `templates/agent-scaffolding/` (cookiecutter templates)
  - `/agent-new` command in `commands/`
- **REF-001 Integration**: Include BP-2 guidance on when NOT to use agents

**Squad 2: Responsibility Linter**

- Lead: Toolsmith + Code Reviewer
- Deliverables:
  - `tools/linters/agent-linter.mjs`
  - `aiwg lint agents` CLI integration
  - CI workflow for agent validation

### Phase 1: Core Patterns (Week 3-5)

**Squad 3: Decompose Helper**

- Lead: Requirements Analyst + Intake Coordinator
- Deliverables:
  - `/task-decompose` command
  - 5 prompt templates (atomic, small, medium, large, epic)
  - Example flows for SDLC & MMK

**Squad 4: Parallel-Hint System**

- Lead: DevOps Engineer + Environment Engineer
- Deliverables:
  - Auto-injection hook for orchestrator templates
  - `/multi-run` wrapper with dry-run preview
  - Documentation for parallel agent patterns

**Squad 5: Trace Collector**

- Lead: Metrics Analyst + Reliability Engineer
- Deliverables:
  - JSON Lines log format (Bandara-compatible)
  - `/trace-start` command
  - Replay viewer CLI
- **REF-001 Integration**: Include checkpoint/state capture from paper Section 6

### Phase 2: Production Enablers (Week 6-8)

**Squad 6: External Prompt Registry**

- Lead: Configuration Manager + Context Librarian
- Deliverables:
  - `aiwg-prompts` repo with folder structure
  - Load-at-runtime hook spec
  - Versioning and rollback guide

**Squad 7: API Adapter**

- Lead: API Designer + Integration Engineer
- Deliverables:
  - Minimal Express/FastAPI server
  - OpenAPI spec
  - Server mode flag in config

**Squad 8: Deploy Generators**

- Lead: Deployment Manager + Build Engineer
- Deliverables:
  - `/deploy-gen docker` command
  - `/deploy-gen k8s` command
  - Multi-stage Dockerfile template

### Phase 3: Advanced Patterns (Week 9-12)

**Squad 9: Consortium Lite**

- Lead: Security Architect + Domain Expert
- Deliverables:
  - Config block for 2-3 models
  - Majority-vote consolidator agent
  - Opt-in flag per workspace

**Squad 10: Evals Framework**

- Lead: Test Architect + Quality Controller
- Deliverables:
  - `aiwg-evals` repo
  - Dataset format spec
  - 5 golden tests for SDLC Complete Phase 1

**Squad 11: Resilience Primitives**

- Lead: Incident Responder + Support Lead
- Deliverables:
  - `@retry(3)` decorator syntax
  - Backoff + fallback-to-human patterns
  - Circuit breaker for external APIs

## Success Metrics Summary

| Phase | Metric | Target |
|-------|--------|--------|
| P0 | Agent lint pass rate | 100% of main repo agents |
| P0 | New agent checklist pass rate | 100% within 2 weeks |
| P1 | Intake task auto-split | 80% ≤7 subtasks |
| P1 | Parallel agent utilization | >60% on ≥4-subtask flows |
| P1 | Trace bundle generation | <3 seconds |
| P2 | External prompt loading | All new agents load ≥1 |
| P2 | HTTP workflow triggering | Any workflow via webhook |
| P2 | Containerization time | Zero to running <2 minutes |
| P3 | Hallucination reduction | ≥30% on 20-sample benchmark |
| P3 | Golden test pass | 5 SDLC Phase 1 tests |
| P3 | Auto-retry coverage | ≥2 retries before escalation |

## Open Questions for Resolution

1. **Prompt Registry Repo**: Submodule or npm package?
   - Consultant suggests submodule
   - Consider: npm might be simpler for version management

2. **API Adapter Framework**: Express or FastAPI?
   - AIWG is JS-first, but Python has broader ML ecosystem
   - Consider: Express for consistency, optional Python adapter

3. **Evals Dataset Source**: Synthetic or real-world?
   - Need representative samples without exposing proprietary data
   - Consider: Curated subset of AIWG dogfooding outputs

4. **Consortium Model Mix**: Which models?
   - Consultant suggests Claude-3.5 + GPT-4o + Gemini-1.5
   - Consider: Provider API costs, rate limits, consistency

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-10 | AIWG Analysis | Initial unified plan synthesizing REF-001 and consultant punchlist |
| 2025-12-10 | AIWG Analysis | Added memory system leverage analysis; revised effort estimates |
| 2025-12-10 | AIWG Analysis | Added Claude Code 2.0.64 feature leverage; async agents, hooks, @-mentions |
