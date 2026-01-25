# What Is AIWG?

**Document Type**: Conceptual Overview
**Audience**: Technical practitioners, architects, engineering leaders
**Reading Time**: 10-12 minutes

---

## The Elevator Pitch

AIWG is a cognitive architecture for AI-augmented software development. It provides AI agents with the structured memory, reasoning patterns, recovery mechanisms, and quality gates that make the difference between "impressive demos" and "production-ready workflows."

If you have used AI coding assistants and thought "this is amazing for small tasks but falls apart on anything complex," AIWG is the missing infrastructure layer that scales AI assistance to multi-week projects.

---

## What Problem Does AIWG Solve?

Base AI assistants (Claude, GPT-4, Copilot without frameworks) have three fundamental limitations:

### 1. No Memory Across Sessions

Each conversation starts fresh. The assistant has no idea what happened yesterday, what requirements you already documented, or what decisions you made last week. You end up re-explaining context repeatedly.

**The Cost**: Projects stall as context rebuilding eats time. Complex initiatives require continuity, not fresh starts every morning.

### 2. No Recovery Patterns

When an AI generates broken code or flawed designs, you manually intervene, explain the problem, and hope the next attempt works better. There is no systematic learning from failures, no structured retry strategy, no checkpoint-and-resume capability.

**The Cost**: Research shows 47% of AI workflows produce inconsistent outputs without reproducibility constraints. Debugging becomes trial-and-error instead of root cause analysis.

### 3. No Quality Gates

Base assistants optimize for "sounds plausible" not "actually works." They lack domain specialization (a general assistant critiques security, performance, maintainability simultaneously—poorly), multi-perspective review, and human approval checkpoints.

**The Cost**: Production code generated without architectural review, security validation, or operational feasibility assessment. What ships fast often fails hard.

---

## What AIWG Provides

AIWG is a **cognitive architecture**—a term borrowed from cognitive science (SOAR, ACT-R) describing systems with memory, reasoning, learning, verification, planning, and controllable output generation. These components work together to enable reliable AI-augmented development.

---

## The Six Core Components

### 1. Memory: Structured Semantic Memory

**What It Is**: The `.aiwg/` directory is a persistent artifact repository storing requirements, architecture, test plans, risks, and decisions across sessions.

**The Research Foundation**: This implements Retrieval-Augmented Generation patterns (Lewis et al., 2020), extending LLM working memory with external storage. Unlike pure parametric models trained once with static knowledge, AIWG agents retrieve from an evolving knowledge base.

**How It Works**:
```
.aiwg/
├── intake/          # Project goals, constraints
├── requirements/    # Use cases, user stories, NFRs
├── architecture/    # Software architecture doc, ADRs
├── planning/        # Phase plans, iteration plans
├── risks/           # Risk register, mitigations
├── testing/         # Test strategy, test plans
├── security/        # Threat models, security gates
└── deployment/      # Deployment plans, runbooks
```

Each artifact is discoverable via `@-mentions` (like `@.aiwg/requirements/use-cases/UC-001-login.md`). Agents read prior work instead of regenerating from scratch.

**What This Enables**:
- Continuity across days, weeks, months
- Context sharing between agents (requirements analyst hands off to architect)
- Provenance tracking (what artifacts derived from what sources)
- Human review without losing work (edit artifacts in place)

**The Difference**: A three-month project accumulates 50-100 interconnected artifacts. Week 12 builds on weeks 1-11 automatically, because memory persists.

---

### 2. Reasoning: Multi-Agent Deliberation with Synthesis

**What It Is**: Instead of a single general-purpose assistant, AIWG provides 53 specialized agents organized into 8 role categories. Complex artifacts (architecture docs, security assessments) go through multi-agent review panels with synthesis.

**The Research Foundation**: Mixture of Experts pattern (Jacobs et al., 1991) and Self-Consistency reasoning (Wang et al., 2023)—sampling multiple reasoning paths and aggregating improves accuracy by 15-20% on complex tasks.

**How It Works**:
```
Architecture Document Creation:
  1. Primary Agent (Architecture Designer) drafts
  2. Review Panel (3-5 specialized agents):
     - Security Auditor (threat perspective)
     - Performance Architect (scalability perspective)
     - Maintainability Reviewer (evolution perspective)
     - Test Strategist (testability perspective)
  3. Synthesizer aggregates findings into coherent review
  4. Human approval gate (accept, iterate, escalate)
```

**Agent Specialization Examples**:
- API Designer focuses on interface contracts, versioning, backward compatibility
- Test Engineer focuses on coverage, edge cases, test data strategy
- Security Auditor focuses on threat modeling, STRIDE analysis, mitigation controls
- DevOps Engineer focuses on deployment automation, monitoring, incident response

**What This Enables**:
- Domain expertise applied at the right moment (security review by security specialist)
- Divergent perspectives surface trade-offs (performance vs maintainability)
- Cost optimization (expensive models for complex decisions, cheaper models for routine tasks)

**The Difference**: Research shows 84% cost reduction with human-in-the-loop validation versus fully autonomous systems. AIWG keeps humans on judgment calls, automates clerical work.

---

### 3. Learning: Failure Analysis and Strategy Adaptation (Ralph)

**What It Is**: Ralph is a closed-loop self-correction system that executes tasks iteratively, learns from failures, and adapts strategy based on error patterns.

**The Research Foundation**: Control theory principles and findings from Roig (2025) showing recovery capability—not initial correctness—predicts agentic task success.

**How It Works**:
```
Ralph Loop:
  1. Execute task with current strategy
  2. Verify results (test pass, lint pass, format valid)
  3. If failure:
     a. Analyze root cause (what specific error occurred)
     b. Extract structured learning (add to knowledge base)
     c. Adapt strategy (try different approach)
     d. Log iteration state (checkpoint for resume)
  4. Repeat until success or iteration limit
  5. Terminate gracefully (provide human-readable summary)
```

**Failure Modes Addressed** (from Roig 2025):
- Archetype 1: Ungrounded Reasoning - Ralph grounds with external verification (run tests, check types)
- Archetype 3: Context Pollution - Ralph uses focused iterations to avoid distractor interference
- Archetype 4: Fragile Execution Under Load - Ralph saves checkpoints, enabling resume after interruption

**What This Enables**:
- Automatic retry with strategy modification (not blind "try again")
- Learning accumulation (failure patterns inform future attempts)
- Reproducibility (execution logs enable replay and debugging)
- Graceful degradation (terminate with useful partial results if full success impossible)

**The Difference**: Base assistants fail once and wait for you to fix the problem. Ralph tries multiple strategies, documents what did not work, and presents options when stuck.

---

### 4. Verification: Dual-Representation Consistency Checking

**What It Is**: AIWG maintains bidirectional traceability between documentation and code, ensuring artifacts stay synchronized as projects evolve.

**The Research Foundation**: Requirements traceability (Gotel & Finkelstein, 1994) extended with anti-hallucination patterns from LitLLM (ServiceNow, 2025)—retrieval-first architecture reduces citation hallucination from 56% to 0%.

**How It Works**:
```typescript
// src/auth/login.ts
/**
 * @implements @.aiwg/requirements/use-cases/UC-001-login.md
 * @architecture @.aiwg/architecture/software-architecture-doc.md#section-4.2
 * @tests @test/unit/auth/login.test.ts
 */
export function authenticateUser(credentials: Credentials): Promise<AuthResult> {
  // Implementation
}
```

```markdown
# .aiwg/requirements/use-cases/UC-001-login.md

## Implementation
- @src/auth/login.ts - Core authentication logic
- @test/unit/auth/login.test.ts - Test coverage
```

**Verification Types**:
1. **Doc → Code**: Requirements reference implementations, architecture docs reference modules
2. **Code → Doc**: Source files reference requirements, design docs, test plans
3. **Code → Tests**: Implementations reference test files (bidirectional)
4. **Citations → Sources**: All research claims reference verified papers (no fabricated citations)

**What This Enables**:
- Impact analysis (changing UC-001 affects which source files?)
- Coverage validation (which requirements lack implementation?)
- Audit trails (who made this decision, when, based on what rationale?)
- Anti-hallucination (citations must resolve to real sources)

**The Difference**: Traditional AI assistants cite nonexistent papers, reference outdated APIs, and lose track of requirements. AIWG enforces grounding throughout.

---

### 5. Planning: Hierarchical Decomposition with Phase Gates

**What It Is**: AIWG structures work using stage-gate processes from product development, breaking multi-month projects into manageable phases with explicit quality criteria.

**The Research Foundation**: Stage-Gate Systems (Cooper, 1990) combined with cognitive load optimization (Miller, 1956; Sweller, 1988)—working memory handles 7±2 items, requiring hierarchical decomposition for complex tasks.

**SDLC Phases**:
```
Inception → Elaboration → Construction → Transition
    ↓            ↓              ↓              ↓
  LOM          ABM            IOC             PR
(Lifecycle     (Architecture  (Initial        (Production
Objectives     Baseline       Operational     Release
Milestone)     Milestone)     Capability)     Milestone)
```

**Phase Gate Pattern**:
- **Entry criteria**: What must be complete before starting (e.g., Elaboration requires approved intake)
- **Activities**: What happens during the phase (e.g., architecture design, ADRs, threat modeling)
- **Exit criteria**: What must be validated before proceeding (e.g., architecture passes security review)
- **Human approval**: Explicit sign-off required (prevents runaway automation)

**Cognitive Load Management**:
- 4 phases (not 12 or 37)
- 3-5 artifacts per phase (not 20)
- 5-7 section headings per template (not 15)
- 3-5 reviewers per panel (not 10)

**What This Enables**:
- Bounded scope per phase (avoid "boil the ocean" paralysis)
- Clear decision points (proceed, iterate, pivot, abort)
- Cost control (no phase 2 spending without phase 1 approval)
- Risk management (catch architectural flaws before coding begins)

**The Difference**: Base assistants generate code immediately. AIWG ensures you are building the right thing (Inception), the right way (Elaboration), before committing resources (Construction).

---

### 6. Style: Controllable Generation via Voice Parameters

**What It Is**: Voice profiles provide continuous control over AI writing style—from casual conversational to technical authority—ensuring output matches audience and context.

**The Research Foundation**: Neural style transfer principles applied to text generation. Instead of binary "formal/informal," voice profiles use 12 continuous parameters.

**Voice Parameters** (0.0 to 1.0 scales):
```yaml
voice_profile:
  formality: 0.7              # Moderately formal
  technical_depth: 0.8        # Deep technical detail
  sentence_variety: 0.6       # Mix of structures
  jargon_density: 0.5         # Balanced terminology
  personal_tone: 0.3          # Mostly impersonal
  humor: 0.1                  # Minimal humor
  directness: 0.8             # Direct communication
  examples_ratio: 0.4         # Some examples
  uncertainty_acknowledgment: 0.7  # Acknowledge limits
  opinion_strength: 0.5       # Balanced opinions
  transition_style: 0.6       # Moderate transitions
  authenticity_markers: 0.4   # Some authentic elements
```

**Built-In Voices**:
- **technical-authority** (documentation, RFCs, design docs)
- **friendly-explainer** (tutorials, onboarding guides)
- **executive-brief** (summaries for decision-makers)
- **casual-conversational** (internal team communication)

**What This Enables**:
- Audience-appropriate communication (explain async/await differently for junior vs senior developers)
- Consistency across artifacts (all ADRs use same formality level)
- Template-specific defaults (executive briefs auto-use executive-brief voice)
- Custom voice creation (define your team's standard communication style)

**The Difference**: Base assistants use a single "helpful assistant" voice. AIWG adapts tone, depth, and structure to the document type and audience.

---

## Standards Alignment

AIWG aligns with internationally recognized standards to ensure professional credibility and interoperability:

| Standard | Endorsement | AIWG Application |
|----------|-------------|------------------|
| **FAIR Principles** | G20, EU, NIH (17,000+ citations) | REF-XXX persistent identifiers, research corpus management |
| **OAIS (ISO 14721)** | International archival standard | Research intake lifecycle (SIP→AIP→DIP) |
| **W3C PROV** | W3C Recommendation (2013) | Artifact provenance tracking (wasDerivedFrom chains) |
| **GRADE** | 100+ organizations (WHO, Cochrane, NICE) | Source quality assessment (high/moderate/low evidence) |
| **MCP** | Linux Foundation (10,000+ servers) | Tool/resource exposure via Model Context Protocol |

**Why Standards Matter**: They provide established vocabulary, proven patterns, and institutional validation. AIWG does not reinvent data management or provenance tracking—it implements research-backed best practices.

---

## How the Components Work Together

Consider a typical multi-week project:

### Week 1: Inception Phase

**Memory**: Create intake documents capturing project goals, constraints, stakeholders in `.aiwg/intake/`

**Planning**: Executive Orchestrator guides through intake questionnaire, ensuring completeness

**Reasoning**: Business Analyst drafts initial requirements, Product Manager reviews from stakeholder perspective

**Verification**: Requirements reference intake forms, ensuring alignment

**Human Gate**: Stakeholder reviews intake, approves transition to Elaboration

---

### Week 2-4: Elaboration Phase

**Memory**: Build architecture doc, ADRs, threat model, test strategy in `.aiwg/architecture/` and `.aiwg/testing/`

**Planning**: Phase checklist ensures coverage (architecture, security, testing, risks all addressed)

**Reasoning**: Multi-agent review panels:
  - Architecture Designer drafts Software Architecture Document
  - Security Auditor, Performance Architect, Maintainability Reviewer critique
  - Synthesizer consolidates feedback
  - Architecture Designer revises based on synthesis

**Learning**: Ralph iterates on ADRs (generate options, evaluate, refine based on feedback)

**Verification**: Architecture references requirements, code stubs reference architecture sections

**Style**: Technical documents use technical-authority voice, stakeholder summaries use executive-brief voice

**Human Gate**: Architect reviews final SAD, security team approves threat model, transition approved

---

### Week 5-10: Construction Phase

**Memory**: Test plans, implementation code, deployment scripts accumulate in `.aiwg/testing/`, `src/`, `.aiwg/deployment/`

**Planning**: Iteration plans break construction into 1-2 week sprints

**Reasoning**: Test Engineer creates test strategy, DevOps Engineer plans deployment, multiple developers implement features

**Learning**: Ralph handles implementation iterations:
  - Execute: Generate code for feature X
  - Verify: Run tests, type check, lint
  - Learn: "Test failed due to async race condition"
  - Adapt: Add proper synchronization primitives
  - Repeat: Re-run tests until pass

**Verification**: Code references requirements (@implements UC-XXX), tests reference code (@source src/...)

**Style**: Code comments use technical-authority, README uses friendly-explainer

**Human Gate**: Code review approves merges, QA approves test results

---

### Week 11-12: Transition Phase

**Memory**: Deployment plans, operational runbooks, post-mortem reports in `.aiwg/deployment/`, `.aiwg/reports/`

**Planning**: Deployment checklist (monitoring, rollback plan, incident response)

**Reasoning**: DevOps Engineer creates deployment automation, Technical Writer documents operations

**Learning**: Ralph retries deployment steps if environments fail validation

**Verification**: Deployment scripts reference architecture (which services, what order), runbooks reference code (how to debug service X)

**Style**: Runbooks use technical-authority with step-by-step instructions

**Human Gate**: Operations team reviews deployment plan, approves production release

---

### Throughout: Research Management

**Memory**: Research papers stored in `.aiwg/research/` with REF-XXX identifiers

**Verification**: All citations resolve to verified sources (retrieval-first architecture)

**Standards**: FAIR-aligned metadata, OAIS archival lifecycle, W3C PROV provenance tracking

**Learning**: Quality assessment using GRADE evidence levels (high/moderate/low)

---

## What Makes AIWG Different

### Compared to Base AI Assistants (Claude, GPT-4, Copilot)

| Feature | Base Assistant | AIWG |
|---------|----------------|------|
| Memory across sessions | ✗ None | ✓ Persistent `.aiwg/` artifacts |
| Specialized agents | ✗ General assistant | ✓ 53 role-specific agents |
| Quality gates | ✗ Ad-hoc | ✓ Phase gates with criteria |
| Recovery patterns | ✗ Manual retry | ✓ Ralph closed-loop learning |
| Citation integrity | ✗ Can hallucinate | ✓ Retrieval-first (0% hallucination) |
| Standards compliance | ✗ None | ✓ FAIR, OAIS, PROV, GRADE, MCP |

---

### Compared to Multi-Agent Frameworks (AutoGPT, MAGIS)

| Feature | AutoGPT-style | AIWG |
|---------|---------------|------|
| Execution pattern | Autonomous loops | Human-gated phases |
| Cost control | Token limits | Phase gates prevent runaway |
| Auditability | Limited provenance | Full W3C PROV chain of custody |
| Reproducibility | Non-deterministic | Checkpointing, execution logs |
| Cross-platform | Single environment | Claude, Cursor, Copilot, etc. |

**Key Difference**: AIWG prioritizes reliability and auditability over full autonomy. Research shows 84% cost reduction keeping humans on high-stakes decisions rather than removing them.

---

### Compared to Simple Prompt Templates

| Feature | Prompt Template | AIWG |
|---------|-----------------|------|
| Scope | Single task | End-to-end SDLC |
| Memory | None | Persistent artifact store |
| Recovery | None | Structured failure learning |
| Standards | Ad-hoc | Research-backed patterns |

**Key Difference**: Templates help with individual tasks. AIWG provides the cognitive architecture for multi-month projects.

---

## When to Use AIWG

### Good Fit

**Multi-week or multi-month projects** where:
- Requirements evolve over time (need memory)
- Multiple stakeholders with different concerns (need multi-perspective review)
- Quality gates required (security, compliance, operational readiness)
- Auditability matters (who decided what, when, why)
- Context exceeds conversation limits (need artifact repository)

**Examples**:
- Building a new product feature with architecture, security, and operational implications
- Migrating a legacy system (requires planning, risk analysis, phased rollback strategy)
- Research projects requiring literature review, methodology design, reproducibility
- Compliance-heavy domains (healthcare, finance, aerospace) needing audit trails

---

### Poor Fit

**Single-session tasks** where:
- No memory needed across sessions
- Quality gates overkill (quick prototype, throwaway experiment)
- Overhead exceeds value (one-off script, simple bug fix)

**Examples**:
- "Write a Python script to parse this CSV" (single task, no follow-up)
- "Fix this typo in the README" (trivial change, no review needed)
- "Explain how this code works" (no artifact creation)

---

### The Trade-off

AIWG adds structure (templates, phases, gates) that slows down trivial tasks but scales to complex multi-week workflows. If your project fits in a single conversation, use a base assistant. If it spans days, weeks, or months, AIWG provides the infrastructure to maintain quality and context.

---

## Quantified Claims and Evidence

AIWG makes specific, falsifiable claims backed by peer-reviewed research:

| Claim | Evidence | Source |
|-------|----------|--------|
| 84% cost reduction with human-in-the-loop vs fully autonomous | Agent Laboratory study | Schmidgall et al. (2025) |
| 47% workflow failure rate without reproducibility constraints | R-LAM evaluation | Sureshkumar et al. (2026) |
| 0% hallucination with retrieval-first vs 56% generation-only | LitLLM benchmarks | ServiceNow (2025) |
| 17.9% improvement with multi-path review | GSM8K benchmarks | Wang et al. (2023) |
| 18.5× improvement with tree search on planning tasks | Game of 24 results | Yao et al. (2023) |

Full references available in `docs/research/research-background.md` and `.aiwg/research/paper-analysis/INDEX.md`.

---

## Known Limitations

AIWG is transparent about limitations to maintain credibility:

### 1. Evaluation Gap

Automated metrics (test pass, lint clean, type check) do not perfectly correlate with human quality assessment. Human gates remain mandatory at phase transitions.

### 2. Token Cost Trade-offs

Multi-agent review (3-5 agents) costs 4-5× more tokens than single-agent generation. AIWG mitigates via hierarchical cost optimization (expensive models for complex decisions, cheaper models for routine tasks).

### 3. Reproducibility Overhead

R-LAM reproducibility constraints add 8-12% execution time. This is acceptable for audit/debug benefits but not zero-cost.

### 4. Scale Dependency

Chain-of-thought reasoning requires large models (>100B parameters). AIWG assumes access to frontier models (Claude Opus, GPT-4 class), not optimized for small models.

---

## Next Steps

### For Practitioners: Quick Start

1. Install AIWG: `npm install -g aiwg`
2. Deploy framework: `aiwg use sdlc`
3. Start project: Follow Inception phase questionnaire
4. Read: `@docs/quickstart.md` for hands-on walkthrough

### For Architects: Deep Dive

1. Review research foundations: `@docs/research/research-background.md`
2. Study agent capabilities: `@agentic/code/frameworks/sdlc-complete/agents/manifest.json`
3. Explore templates: `@agentic/code/frameworks/sdlc-complete/templates/`
4. Understand phase gates: `@agentic/code/frameworks/sdlc-complete/flows/phase-gates.md`

### For Researchers: Evaluation

1. Examine research corpus: `.aiwg/research/paper-analysis/INDEX.md`
2. Review standards compliance: REF-056 (FAIR), REF-061 (OAIS), REF-062 (PROV)
3. Identify gaps: `.aiwg/research/research-gap-analysis.md` (planned)
4. Compare to related work: `@docs/research/research-background.md#comparison-to-related-work`

### For Decision-Makers: Executive Summary

Read: `@docs/overview/executive-brief.md` (1-2 pages, business value focused)

---

## Glossary Quick Reference

AIWG uses dual terminology (informal + professional) for accessibility and credibility:

| Informal | Professional | Meaning |
|----------|--------------|---------|
| Context stacks | Structured Semantic Memory | Working memory extended with external storage |
| Multi-agent review | Ensemble Validation | Multiple specialized agents critique artifacts |
| Ralph loop | Closed-Loop Self-Correction | Iterative execution with failure learning |
| .aiwg/ directory | Artifact Repository | Persistent storage for project knowledge |
| @-mentions | Traceability Links | References enabling provenance tracking |
| Phase gates | Stage-Gate Process | Quality checkpoints with human approval |
| Voice profiles | Continuous Style Representation | Parametric control of writing style |

Full glossary: `@docs/research/glossary.md`

---

## References

This document draws on findings from:

- **Cognitive Science**: Miller (1956), Sweller (1988)
- **Reasoning Patterns**: Wei et al. (2022), Wang et al. (2023), Yao et al. (2023)
- **Multi-Agent Systems**: Jacobs et al. (1991), Tao et al. (2024), Schmidgall et al. (2025)
- **Memory & Retrieval**: Lewis et al. (2020), ServiceNow (2025)
- **Standards**: Wilkinson et al. (2016), ISO 14721, W3C (2013), GRADE, MCP

Full bibliography with paper analysis: `@.aiwg/research/paper-analysis/INDEX.md`

---

## Document Profile

| Attribute | Value |
|-----------|-------|
| Document Type | Conceptual Overview (Tier 2) |
| Intended Audience | Technical practitioners, architects, engineering leaders |
| Formality | Moderate (professional with informal explanations) |
| Reading Time | 10-12 minutes |
| Next Steps | @docs/quickstart.md (hands-on) or @docs/research/research-background.md (theory) |

---

## Cross-References

- @docs/overview/executive-brief.md - Business value summary (Tier 1)
- @docs/research/research-background.md - Full literature review (Tier 3)
- @docs/quickstart.md - Installation and first project guide
- @docs/research/glossary.md - Professional terminology mapping
- @.aiwg/planning/documentation-professionalization-plan.md - Documentation strategy
- @.aiwg/research/paper-analysis/INDEX.md - Complete research corpus (35 papers analyzed)
