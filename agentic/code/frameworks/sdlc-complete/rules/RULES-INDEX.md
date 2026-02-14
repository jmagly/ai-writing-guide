# AIWG Rules Index

Consolidated index of all AIWG enforcement rules. Each entry provides a summary sufficient to determine relevance — load the full rule via @-link only when needed.

**How to use**: Scan summaries below. When a rule is relevant to your current task, load the full rule file for detailed enforcement instructions. Rules are grouped by tier and ordered by enforcement level (CRITICAL > HIGH > MEDIUM).

---

## Core Rules (9 rules — always active)

Core rules are non-negotiable defaults deployed to every AIWG installation.

### CRITICAL

#### no-attribution
**Summary**: AI tools are tools — never add attribution to commits, PRs, docs, or code. No "Co-Authored-By", no "Generated with", no tool branding. This is universal across all 8 providers.
**When to apply**: Commit creation, PR drafting, code generation, documentation output
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/no-attribution.md

#### token-security
**Summary**: Never hard-code tokens, pass tokens as CLI arguments, echo token values, or commit tokens to git. Use the heredoc pattern for scoped token lifetime. File permissions mode 600. Load at point of use.
**When to apply**: API integration, authentication code, command implementation, security review
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/token-security.md

#### versioning
**Summary**: CalVer format: YYYY.M.PATCH with NO leading zeros. npm rejects leading zeros — users can install but cannot update. Tags use `v` prefix (e.g., `v2026.1.5`).
**When to apply**: Version bumps, release tagging, changelog updates, npm publishing, package.json edits
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/versioning.md

#### citation-policy
**Summary**: Never fabricate citations, DOIs, URLs, or page numbers. Only cite sources that exist in the research corpus. Use GRADE methodology for quality-appropriate hedging language.
**When to apply**: Documentation generation, claim justification, research corpus references, evidence quality assessment
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/citation-policy.md

### HIGH

#### anti-laziness
**Summary**: Never delete tests to make them pass. Never skip tests. Never remove features instead of fixing them. Never weaken assertions. Escalate to human after 3 failed attempts. Recovery protocol: PAUSE > DIAGNOSE > ADAPT > RETRY > ESCALATE.
**When to apply**: Test failures, difficult bugs, refactoring challenges, coverage regression, premature task abandonment
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/anti-laziness.md

#### executable-feedback
**Summary**: Code-generating agents must execute tests before returning results. Implements MetaGPT feedback pattern (+4.2% HumanEval, -63% revision cost). Track execution history and learn from failure patterns. Max 3 retries with root cause analysis.
**When to apply**: Code generation, test execution, debug memory access, failure analysis
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/executable-feedback.md

#### failure-mitigation
**Summary**: Mitigation strategies for 6 LLM failure archetypes: hallucination, context loss, instruction drift, safety issues, technical errors, consistency failures. Applies specific detection and recovery for each type.
**When to apply**: Pre-generation risk assessment, during-generation monitoring, post-generation validation
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/failure-mitigation.md

#### research-before-decision
**Summary**: Research codebase, docs, and sources before making technical decisions. Prevents guessing APIs, blind retries, and missing context. Pattern: IDENTIFY > SEARCH > EXTRACT > REASON > ACT > VERIFY.
**When to apply**: Technical decision-making, API usage, configuration changes, dependency selection, error diagnosis
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/research-before-decision.md

#### instruction-comprehension
**Summary**: Fully parse and confirm understanding of all user instructions before acting. Extract constraints, requirements, and format preferences. Track multi-part requests to completion. Top user complaint: repeating instructions 5-6 times.
**When to apply**: Every user request, multi-part tasks, specification compliance, instruction drift detection
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/instruction-comprehension.md

---

## SDLC Rules (20 rules — active with framework)

SDLC rules enforce workflow quality when the SDLC framework is deployed via `aiwg use sdlc`.

### HIGH

#### actionable-feedback
**Summary**: Structured, actionable feedback following Self-Refine principles. 94% of iteration failures stem from vague feedback. Every feedback item must include specific location, concrete action, and rationale.
**When to apply**: Ralph loops, iteration feedback cycles, code review, improvement tracking
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/actionable-feedback.md

#### mention-wiring
**Summary**: Wire @-mentions during artifact creation, not as a separate step. Semantic tags indicate relationship types (implements, tests, depends, etc.). Enables traceability and bidirectional linking.
**When to apply**: Artifact generation (code, docs, agents, commands, skills), reference creation
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/mention-wiring.md

#### hitl-gates
**Summary**: Human-in-the-loop gates at SDLC phase transitions. 84% cost reduction with strategic human involvement. Blocks, reviews, or escalates based on configured mode and conditions.
**When to apply**: Phase transitions, artifact quality gates, approval workflows, decision points
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/hitl-gates.md

#### agent-fallback
**Summary**: Graceful degradation when specialized agents fail or are unavailable. System continues with reduced capability rather than failing. Maintains capability matrix with fallback chains for all roles.
**When to apply**: Agent unavailability, permission denied, timeout, error thresholds, quality drops
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/agent-fallback.md

#### provenance-tracking
**Summary**: W3C PROV-compliant tracking for all artifacts using Entity-Activity-Agent model with URN schema. Records derivation chains, timestamps, and bidirectional references for audit trails.
**When to apply**: Artifact creation, derivation documentation, compliance requirements, quality auditing
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/provenance-tracking.md

#### tao-loop
**Summary**: Standardizes Thought > Action > Observation loop across all iterative execution. ReAct pattern improves performance 34% and reduces hallucinations to 0% with tool grounding. Complete triplets required.
**When to apply**: Iterative agent execution, Ralph loops, tool-using agents, reasoning traces
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/tao-loop.md

#### reproducibility-validation
**Summary**: Validates workflow reproducibility by detecting non-determinism sources. Required thresholds: compliance audit (100%), security scan (100%), test generation (95%). Reports variance with recommendations.
**When to apply**: Compliance workflows, critical operations, quality gates, regulatory requirements
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/reproducibility-validation.md

#### sdlc-orchestration
**Summary**: Core orchestrator for SDLC workflows: interprets natural language, reads flow templates, launches multi-agent workflows. Pattern: Primary Author > Parallel Reviewers > Synthesizer > Archive.
**When to apply**: Phase transitions, workflow execution, natural language commands, agent coordination
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/sdlc-orchestration.md

### MEDIUM

#### hitl-patterns
**Summary**: Human-in-the-loop patterns for agent-human collaboration including draft-then-edit workflow. Clear handoff points reduce errors; iterative refinement produces higher quality output.
**When to apply**: Ralph loops, draft review cycles, feedback incorporation, artifact finalization
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/hitl-patterns.md

#### human-gate-display
**Summary**: Rich display format for human approval gates with artifact preview, diff display, and decision logging. Clear action options and status indicators for optimal user experience.
**When to apply**: Human review points, approval workflows, artifact inspection, decision capture
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/human-gate-display.md

#### thought-protocol
**Summary**: Seven thought types structure agent reasoning: Goal, Research, Progress, Extraction, Reasoning, Exception, Synthesis. Research thought prevents uninformed action. Enables monitoring and debugging.
**When to apply**: Agent system prompts, reasoning transparency, tool usage, quality gates
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/thought-protocol.md

#### reasoning-sections
**Summary**: Explicit reasoning sections in artifact templates following Chain-of-Thought patterns. CoT improves complex reasoning 2-4x. Numbered steps structure thinking transparently for review.
**When to apply**: Template design, artifact generation, decision documentation, collaborative review
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/reasoning-sections.md

#### few-shot-examples
**Summary**: 2-3 concrete examples required in every agent system prompt. Few-shot dramatically improves task performance. Examples show input/output pairs for simple, moderate, and complex scenarios.
**When to apply**: Agent definition creation, system prompt design, domain-specific examples
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/few-shot-examples.md

#### best-output-selection
**Summary**: Non-monotonic output selection — track highest quality across iterations rather than accepting final result. Quality often peaks early then degrades. Select best, not last.
**When to apply**: Ralph loops, iteration completion, quality scoring, degradation detection
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/best-output-selection.md

#### reproducibility
**Summary**: Reproducibility practices for workflows: strict mode (temperature=0, fixed seed), checkpoints at phase boundaries, configuration snapshots. 47% of workflows are non-reproducible without this.
**When to apply**: Critical workflows, test generation, compliance, CI/CD, validation
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/reproducibility.md

#### progressive-disclosure
**Summary**: Progressive revelation in SDLC templates reducing cognitive load via collapsible sections. ESSENTIAL / EXPAND WHEN READY / ADVANCED phases. Scaffolding helps novices without hindering experts.
**When to apply**: Template creation, documentation design, requirement gathering, artifact expansion
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/progressive-disclosure.md

#### conversable-agent-interface
**Summary**: Standardized send/receive/generateReply agent interface following AutoGen pattern. Enables conversation persistence, replay, and debugging across multi-agent collaborations.
**When to apply**: Agent definitions, multi-agent collaboration, conversation protocols, interface implementation
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/conversable-agent-interface.md

#### auto-reply-chains
**Summary**: Autonomous agent conversations with self-termination based on context. Removes central orchestration dependency. Defines termination keywords and safety limits for conversation chains.
**When to apply**: Multi-agent conversations, automated dialogue, workflow orchestration
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/auto-reply-chains.md

#### criticality-panel-sizing
**Summary**: Ensemble review panel sizes based on task criticality. CRITICAL(7), HIGH(5), STANDARD(5), LOW(3). High-stakes decisions get larger panels; routine changes stay efficient.
**When to apply**: Ensemble review, artifact classification, panel composition, threshold adjustment
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/criticality-panel-sizing.md

#### qualified-references
**Summary**: Extends @-mentions with semantic relationship qualifiers (implements, tested-by, depends, derives-from, etc.). Enables queries like "what implements UC-001?" for knowledge graph navigation.
**When to apply**: Reference creation, semantic linking, bidirectional consistency, traceability queries
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/qualified-references.md

---

## Research Rules (2 rules — optional)

Research rules manage the research corpus. Deployed when research features are active.

### HIGH

#### research-metadata
**Summary**: FAIR-compliant metadata for research documents with required YAML frontmatter. Key findings include metrics; DOI verification required; PDF checksums recorded; GRADE quality assessment mandatory.
**When to apply**: Research document creation, citation validation, corpus management, metadata completeness
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/research-metadata.md

### MEDIUM

#### index-generation
**Summary**: Auto-generate INDEX.md files from YAML frontmatter per FAIR F4 discoverability principle. Indexes by topic, year, license, and full listing with defined sorting rules.
**When to apply**: Research corpus organization, documentation navigation, artifact discoverability
**Full rule**: @agentic/code/frameworks/sdlc-complete/rules/index-generation.md

---

## Quick Reference by Context

| Task Type | Relevant Rules |
|-----------|---------------|
| **Writing code** | no-attribution, executable-feedback, research-before-decision, anti-laziness, token-security |
| **Running tests** | executable-feedback, anti-laziness, reproducibility, reproducibility-validation |
| **Creating artifacts** | mention-wiring, provenance-tracking, qualified-references, progressive-disclosure |
| **Phase transitions** | hitl-gates, sdlc-orchestration, human-gate-display |
| **Ralph loops** | tao-loop, actionable-feedback, best-output-selection, anti-laziness |
| **Agent design** | few-shot-examples, conversable-agent-interface, agent-fallback, thought-protocol |
| **Documentation** | citation-policy, no-attribution, reasoning-sections, research-metadata |
| **Security review** | token-security, failure-mitigation, research-before-decision |
| **Multi-agent work** | auto-reply-chains, criticality-panel-sizing, sdlc-orchestration |
| **Versioning/release** | versioning, no-attribution |
| **Research** | research-metadata, index-generation, citation-policy |

---

*Generated from manifest.json v2.0.0 — 31 rules across 3 tiers*
*Full rule files: @agentic/code/frameworks/sdlc-complete/rules/*
