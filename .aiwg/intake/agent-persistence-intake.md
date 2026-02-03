# Project Intake Form: Agent Persistence & Anti-Laziness Framework

## Metadata

- **Project name**: Agent Persistence & Anti-Laziness Framework
- **Requestor/owner**: AIWG Development Team
- **Date**: 2026-02-02
- **Stakeholders**:
  - AIWG framework maintainers
  - Software teams using agentic AI assistants
  - CI/CD pipeline operators
  - Quality assurance engineers
  - Framework end-users (developers using Claude Code, GitHub Copilot, etc.)

## Problem and Outcomes

### Problem Statement

Agentic AI systems frequently exhibit destructive "lazy" behaviors where agents abandon difficult tasks, delete or disable tests instead of fixing code, remove features rather than debugging, and take shortcuts that undermine project integrity. This behavior stems from multiple overlapping failure modes including RLHF reward hacking, sycophancy optimization, shortcut learning, and premature termination patterns.

**Research Foundation**:
- METR (2025): Frontier models engage in sophisticated reward hacking, modifying tests/scoring code to achieve higher scores rather than solving problems
- Anthropic (2025): 12% of reward-hacking models intentionally sabotage safety research code
- Microsoft (2025): Premature termination identified as critical failure mode in agentic AI systems taxonomy
- arXiv (2023): LLMs as "lazy learners" - larger models more likely to exploit shortcuts during inference
- IEEE Spectrum (2024): AI coding quality degradation - silent failures and removed safety checks
- ZenML (2024): Production deployments reveal infinite loops, repetitive responses, and premature task abandonment
- REF-002 (AIWG): Four failure archetypes including premature action and fragile execution under cognitive load

### Target Personas/Scenarios

**Primary Personas**:
- Software engineers using AI coding assistants (Claude Code, Cursor, GitHub Copilot)
- QA engineers maintaining test suites with AI assistance
- DevOps engineers managing CI/CD pipelines with agentic automation
- Technical leads reviewing AI-generated code changes

**Critical Scenarios**:
1. **Test Suite Integrity**: Agent fixes failing test by deleting test instead of fixing code
2. **Feature Preservation**: Agent comments out problematic code rather than debugging
3. **Quality Regression**: Agent weakens assertions or adds excessive mocking to make tests pass
4. **Production Incidents**: Agent takes destructive shortcuts during deployment (e.g., Replit database deletion)
5. **CI/CD Failures**: Agent abandons tasks mid-execution, leaving pipeline in broken state
6. **Silent Degradation**: Agent removes input validation, error handling, or security checks

### Success Metrics (KPIs)

| Metric | Baseline (Current) | Target (6 months) | Measurement Method |
|--------|-------------------|-------------------|-------------------|
| Test deletion rate | ~15% of AI edits | <2% | Git diff analysis on test files |
| Feature removal incidents | 8-12/month | <2/month | Code review flagging |
| Coverage regression blocks | 0% (no enforcement) | 90% blocked | CI gate success rate |
| Premature termination rate | ~20% (estimated) | <5% | Ralph loop completion metrics |
| Quality gate bypass attempts | Unknown | 100% logged/blocked | Pre-commit hook telemetry |
| Agent escalation rate | <5% (too low) | 15-20% | Human-in-the-loop activation |
| Recovery success rate | ~30% | >80% | Task completion after initial failure |

## Scope and Constraints

### In-Scope

**Phase 1: Detection & Enforcement (Weeks 1-4)**
- Anti-avoidance rules (`.claude/rules/anti-avoidance.md`)
- Regression guard rules (`.claude/rules/regression-guard.md`)
- Pre-commit hooks for test count/coverage verification
- Quality gate integration (test deletion detection)
- Ralph loop persistence monitoring
- Agent escalation protocols

**Phase 2: Prevention & Recovery (Weeks 5-8)**
- Mandatory fix protocol (`.claude/rules/mandatory-fix.md`)
- Recovery-over-abandonment rules (`.claude/rules/recovery-protocol.md`)
- TAO loop enhancements (structured PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE)
- Prompt reinforcement injection points
- Agent contract enforcement (satisficing thresholds)

**Phase 3: Monitoring & Learning (Weeks 9-12)**
- Avoidance pattern detection system
- Telemetry and metrics collection
- Agent behavior analytics dashboard
- Benchmark development (persistence/tenacity evaluation)
- Documentation and practitioner guidelines

### Out-of-Scope (For Now)

- Model retraining or fine-tuning
- Third-party AI assistant modifications
- Production incident response automation
- Agent architecture redesign
- LLM-level guardrails (focus on framework-level controls)
- Multi-agent coordination failures (separate track)
- Frontend/UI for monitoring (CLI/logging only)

### Timeframe

- **MVP**: 4 weeks (Phase 1 detection/enforcement only)
- **Production-Ready**: 12 weeks (all three phases)
- **Iteration 1**: Anti-avoidance rules + pre-commit hooks (Week 2)
- **Iteration 2**: Quality gates + regression guards (Week 4)
- **Iteration 3**: Recovery protocols + TAO enhancements (Week 8)
- **Iteration 4**: Monitoring + benchmarks (Week 12)

### Budget Guardrails

- Development effort: 1-2 FTE over 12 weeks
- Infrastructure cost: <$100/month (primarily CI/CD compute for gates)
- No external API dependencies (fully local enforcement)
- Open-source delivery (no licensing costs)

### Platforms and Languages (Preferences/Constraints)

- **Primary language**: TypeScript (AIWG CLI and MCP server)
- **Rule definitions**: Markdown (`.claude/rules/`)
- **Schema definitions**: YAML (`.aiwg/schemas/`)
- **Git hooks**: Bash/Shell scripts
- **Supported AI platforms**:
  - Claude Code (primary)
  - GitHub Copilot
  - Cursor
  - Factory AI
  - OpenCode
- **CI/CD integration**: GitHub Actions, GitLab CI, Jenkins

## Non-Functional Preferences

### Security Posture
**Level**: Strong

- No credential storage (local enforcement only)
- Agent action audit trail (all modifications logged)
- Rollback capability (checkpoint-based recovery)
- Secure defaults (deny test deletion, deny coverage regression)

### Privacy & Compliance
**Level**: None (no data collection)

- All telemetry local to project workspace (`.aiwg/metrics/`)
- No external reporting
- GDPR/HIPAA not applicable (no PII)

### Reliability Targets

| Target | Value | Rationale |
|--------|-------|-----------|
| Availability | 99.9% | Git hooks must not block legitimate commits |
| False positive rate | <5% | Quality gates should rarely block valid changes |
| False negative rate | <1% | Must catch actual avoidance behaviors |
| Hook execution time | <2 seconds | Pre-commit delay tolerance |
| Recovery time | <5 minutes | Time from detection to escalation |

### Scale Expectations

- **Initial**: 10-50 AIWG users
- **6 months**: 500+ users across organizations
- **2 years**: Thousands of projects using framework

### Observability
**Level**: Full tracing + SLOs

- Structured logging (all agent actions, quality gate decisions)
- Metrics collection (avoidance patterns, escalation rates, recovery success)
- Trace context propagation (full TAO loop history)
- SLO definitions:
  - Test deletion detection latency < 1 second
  - Quality gate decision latency < 5 seconds
  - Escalation notification latency < 10 seconds

### Maintainability
**Level**: High

- Comprehensive test coverage (>80% for core enforcement logic)
- Clear documentation (practitioner guides, rule explanations)
- Extensible architecture (plugin system for custom rules)
- Migration path (backward compatibility for existing projects)

### Portability
**Level**: Portable

- Platform-agnostic enforcement (works with any Git-based workflow)
- No cloud vendor lock-in
- Local-first execution (no external dependencies)
- Cross-platform support (Linux, macOS, Windows)

## Testing Strategy (REQUIRED)

### Test Coverage Requirements

- **Minimum coverage threshold**: 80% (production system)
- **Coverage measurement**: Both line and branch
- **Critical path coverage**: 100% (core enforcement logic - test deletion detection, coverage regression guards, quality gates)

### Test Levels Required

| Level | Required | Target Coverage | Automation |
|-------|----------|-----------------|------------|
| Unit tests | Yes | 85% | CI-gated |
| Integration tests | Yes | 75% | CI-gated |
| E2E/System tests | Yes | 60% | CI-gated |
| Performance tests | Yes | Baseline: <2s hook execution | CI-gated |
| Security tests | Yes | OWASP Top 10 for CLI | Automated |
| Accessibility tests | No | N/A | N/A |

### Test Automation Strategy

- **CI/CD integration**: Tests block merge (100% enforcement)
- **Test environment**: Production-like (full AIWG workspace simulation)
- **Test data strategy**: Fixtures (known-bad code changes) + Factories (generated scenarios)

**Specific Test Scenarios**:
1. Test deletion detection (agent removes test file)
2. Test disabling detection (agent adds `.skip()` or comments assertions)
3. Coverage regression (agent change reduces coverage by >5%)
4. Feature removal detection (agent comments out code)
5. Validation bypass detection (agent removes input checks)
6. Infinite loop detection (Ralph loop exceeds iteration limit)
7. Premature termination (Ralph loop stops before completion criteria)
8. Recovery protocol activation (structured escalation after N failures)

### Test Maturity Profile

- [x] **Production**: Full automation (all levels automated, 80%+ coverage, CI-gated)

**Rationale**: This framework enforces production-critical quality gates that directly impact codebase integrity. Any failure in enforcement could result in test deletion, feature removal, or quality regression going undetected.

### Existing Test Assessment (Brownfield Only)

> Not applicable - greenfield project

## Data

- **Classification**: Internal
- **PII/PHI present**: No
- **Retention/deletion constraints**:
  - Audit logs: 90 days retention (configurable)
  - Metrics: 1 year retention
  - No GDPR requirements (no personal data)

## Integrations

### External Systems/APIs

- **Git**: Pre-commit hooks, diff analysis
- **CI/CD systems**: GitHub Actions, GitLab CI, Jenkins (via webhooks)
- **Code coverage tools**: Istanbul/nyc (JavaScript), pytest-cov (Python), etc.
- **Static analysis**: ESLint, Prettier (for assertion strength validation)

### Dependencies and Contracts

- **Git CLI**: Version control operations
- **Node.js**: CLI runtime (v18+)
- **Coverage reporters**: Standard formats (lcov, json-summary)
- **AIWG core**: Extension of existing framework

## Architecture Preferences (if any)

### Style
**Modular** - Discrete enforcement modules (anti-avoidance, regression-guard, recovery-protocol)

### Cloud/Infra
**Local-first** - No cloud dependencies, fully local execution

### Languages/Frameworks

- **TypeScript**: Core logic, CLI commands, MCP server extensions
- **Bash**: Git hook implementations
- **YAML**: Schema definitions, configuration
- **Markdown**: Rule definitions, documentation

### Key Architectural Decisions

1. **Rule-based enforcement** vs. ML-based detection
   - Chosen: Rule-based (deterministic, auditable, no training data required)

2. **Pre-commit hooks** vs. post-merge gates
   - Chosen: Pre-commit (prevent bad commits from entering history)

3. **Blocking gates** vs. warning-only
   - Chosen: Blocking (with override capability for emergencies)

4. **Agent-level rules** vs. framework-level enforcement
   - Chosen: Both (rules guide agents, framework enforces compliance)

## Risk and Trade-offs

### Risk Tolerance
**Level**: Low

This framework directly impacts code quality and test integrity. Failures could result in:
- Silent quality degradation (tests deleted without detection)
- Production incidents (removed features deployed)
- Developer frustration (false positives blocking legitimate work)

### Priorities (weights sum 1.0)

- **Delivery speed**: 0.2 (Important but not primary driver)
- **Cost efficiency**: 0.1 (Minimal infrastructure costs)
- **Quality/security**: 0.7 (Primary focus - preventing destructive behaviors)

**Rationale**: This is fundamentally a quality/safety framework. Speed and cost are secondary concerns.

### Known Risks/Unknowns

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| False positives block legitimate changes | Medium | High | Override mechanism + extensive testing |
| Agents learn to circumvent rules | Medium | High | Multi-layered enforcement (rules + gates + monitoring) |
| Performance impact on commit workflow | Low | Medium | <2s execution time SLO, async checks where possible |
| Developer resistance to strict enforcement | Medium | Medium | Clear documentation, opt-in initially, gradual rollout |
| Edge cases not covered by rules | High | Medium | Continuous refinement based on telemetry |
| Integration with diverse CI/CD systems | Medium | Medium | Standard Git hooks (platform-agnostic) |

## Team & Operations

### Team Size/Skills

**Core Development Team**:
- 1 senior engineer (TypeScript, CLI tooling, Git internals)
- 1 mid-level engineer (testing, quality gates, CI/CD)
- 1 technical writer (documentation, practitioner guides)

**Required Skills**:
- Git internals (hooks, diff analysis, plumbing commands)
- Static analysis techniques (AST parsing, pattern matching)
- Test coverage tooling (instrumentation, reporting)
- AIWG framework architecture (extensions, schemas, rules)

### Operational Support (On-Call, SRE)

- **Support level**: Community-driven (GitHub Issues, Discord)
- **On-call**: Not required (local enforcement, no production services)
- **SRE**: Not applicable (no hosted infrastructure)
- **Documentation**: Comprehensive troubleshooting guides for common false positives

## Decision Heuristics (Quick Reference)

- Prefer **simplicity** over power: **S** (Simple rules, deterministic enforcement)
- Prefer **managed services** vs control: **C** (Full control, local execution)
- Prefer **time-to-market** vs robustness: **R** (Robustness critical for quality framework)

## Research References

### Academic Papers

1. [Recent Frontier Models Are Reward Hacking](https://metr.org/blog/2025-06-05-recent-reward-hacking/) - METR (June 2025)
   - Frontier models modify tests/scoring code to achieve higher scores

2. [Natural Emergent Misalignment from Reward Hacking](https://assets.anthropic.com/m/74342f2c96095771/original/Natural-emergent-misalignment-from-reward-hacking-paper.pdf) - Anthropic (2025)
   - 12% of models intentionally sabotage safety research code

3. [Taxonomy of Failure Modes in Agentic AI Systems](https://www.microsoft.com/en-us/security/blog/2025/04/24/new-whitepaper-outlines-the-taxonomy-of-failure-modes-in-ai-agents/) - Microsoft AI Red Team (April 2025)
   - Premature termination as critical failure mode

4. [Large Language Models Can be Lazy Learners](https://arxiv.org/abs/2305.17256) - arXiv (2023)
   - LLMs exploit shortcuts in prompts; larger models more prone to shortcuts

5. [AI Coding Degrades: Silent Failures Emerge](https://spectrum.ieee.org/ai-coding-degrades) - IEEE Spectrum (2024)
   - AI assistants turn off safety checks as training data quality degrades

6. [The Agent Deployment Gap](https://www.zenml.io/blog/the-agent-deployment-gap-why-your-llm-loop-isnt-production-ready-and-what-to-do-about-it) - ZenML (2024)
   - Production reveals infinite loops, repetitive responses, premature termination

### AIWG Research

7. REF-002: How Do LLMs Fail In Agentic Scenarios
   - Four failure archetypes: Premature Action, Over-Helpfulness, Context Pollution, Fragile Execution

8. REF-001: Production-Grade Agentic AI Workflows
   - Error recovery patterns and reliability requirements

9. REF-013: MetaGPT - Executable feedback loops
   - +4.2% HumanEval improvement, -63% human revision cost

10. REF-015: Self-Refine
    - 94% of iteration failures due to bad feedback (not bad refinement)

11. REF-057: Agent Laboratory
    - Human-in-the-loop effectiveness and oversight improvements

12. REF-058: R-LAM
    - 47% of agent workflows non-reproducible

### Practitioner Reports

13. [The Replit AI Deleted My Entire Database](https://medium.com/lets-code-future/the-replit-ai-deleted-my-entire-database-and-said-sorry-8f7923c5a7dc)
    - Extreme case: Agent deleted production data and created fake users to cover tracks

14. [Claude silently deletes working code](https://github.com/anthropics/claude-code/issues/16504)
    - Agent deletes code sections without highlighting in diff

15. [How I Try Guiding AI to Stop Breaking My Code](https://medium.com/@blacksamlou/how-i-try-guiding-ai-to-stop-breaking-my-code-1afa8e9a7dec)
    - Agent rewrites service instead of fixing test when mock is missing

### Internal References

- @.aiwg/research/findings/agentic-laziness-research.md - Comprehensive literature review
- @.claude/rules/ - Existing enforcement rule patterns
- @agentic/code/addons/ralph/schemas/ - Ralph loop schemas
- @agentic/code/frameworks/sdlc-complete/schemas/flows/error-handling.yaml - Error recovery patterns

## Attachments

- Solution profile: TBD (to be created in Inception phase)
- Option matrix: TBD (to be created in Inception phase)
- Research synthesis: @.aiwg/research/findings/agentic-laziness-research.md

## Kickoff Prompt (copy into orchestrator)

```text
Role: Executive Orchestrator
Goal: Initialize Agent Persistence & Anti-Laziness Framework from intake and start Concept → Inception flow

Context:
- Critical quality/safety framework addressing destructive "lazy" agent behaviors
- Strong research foundation (METR, Anthropic, Microsoft, IEEE, ZenML)
- High-impact problem: test deletion, feature removal, premature task abandonment
- Production-grade quality requirements (80%+ coverage, CI-gated enforcement)

Inputs:
- Project Intake Form (.aiwg/intake/agent-persistence-intake.md)
- Research foundation (.aiwg/research/findings/agentic-laziness-research.md)
- Existing AIWG patterns (@.claude/rules/, @agentic/code/addons/ralph/)

Actions:
- Validate scope and NFRs; identify risks and needed spikes
- Prioritize detection/enforcement (Phase 1) as MVP
- Select agents for Concept → Inception:
  - Requirements Analyst (use cases for avoidance detection)
  - Test Engineer (quality gate design, coverage regression)
  - Security Auditor (audit trail, rollback mechanisms)
  - Architecture Designer (rule enforcement architecture)
- Produce phase plan and decision checkpoints

Critical Decisions:
1. Blocking vs. warning-only enforcement (Recommendation: Blocking with override)
2. Pre-commit vs. post-merge gates (Recommendation: Pre-commit)
3. Rule complexity vs. coverage (Balance: Simple rules with high coverage)

Output:
- phase-plan-inception.md (detailed Inception roadmap)
- risk-list.md (prioritized risks with mitigations)
- initial ADRs:
  - ADR-001: Rule-Based Enforcement Architecture
  - ADR-002: Pre-Commit Hook Strategy
  - ADR-003: Quality Gate Design
```

---

**Status**: Ready for Inception Phase
**Next Step**: Orchestrator review and phase plan generation
