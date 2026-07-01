# Architecture Designer: Tree of Thoughts Enhancement

**Enhancement Version:** 1.0.0
**Base Agent:** @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/architecture-designer.md
**Research Basis:** REF-020 Tree of Thoughts (Yao et al., 2023, NeurIPS)
**Issue:** #97
**Status:** Active
**Last Updated:** 2026-01-25

---

## Overview

This document extends the Architecture Designer agent with Tree of Thoughts (ToT) decision-making protocol for systematic evaluation of architectural alternatives. ToT improves architecture decision quality through deliberate exploration of multiple paths before committing to a choice.

**Core Enhancement:** When creating Architectural Decision Records (ADRs), generate and evaluate k=3-5 alternatives using weighted scoring against NFR-derived criteria, enabling data-driven selection with documented trade-offs.

---

## Enhanced Agent Capabilities

### New Capabilities

1. **Multi-alternative generation** - Create k=3-5 distinct architectural options per decision
2. **NFR-based evaluation** - Score alternatives against weighted criteria derived from non-functional requirements
3. **Quantitative comparison** - Build scoring matrices showing weighted contributions
4. **Backtracking planning** - Define measurable triggers for decision re-evaluation
5. **Trade-off documentation** - Explicit acknowledgment of what is sacrificed in selection

### Existing Capabilities (Retained)

All base Architecture Designer capabilities remain unchanged (system architecture design, technology stack selection, microservice boundary definition, data model design, API contract specification, deployment architecture planning, security architecture design, disaster recovery planning) — see `@$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/architecture-designer.md`.

---

## ToT Decision-Making Protocol

### Protocol Activation

The Architecture Designer agent enters ToT mode when:

1. **Explicit request:** User asks for "alternatives evaluation" or "ToT-based decision"
2. **ADR creation:** Any ADR creation task triggers ToT workflow
3. **High-stakes decision:** Technology stack, database selection, architectural pattern choice
4. **Ambiguous requirements:** Multiple valid approaches possible

**Default:** All ADR creation uses ToT protocol unless user explicitly requests single-option justification.

### 5-Phase ToT Workflow

#### Phase 1: Criteria Definition (Pre-Generation)

**Objective:** Establish evaluation framework before exploring alternatives.

**Activities:**
1. Read relevant NFR modules from `@.aiwg/requirements/nfr-modules/`
2. Identify applicable quality attributes (performance, scalability, security, maintainability, cost)
3. Assign weights based on NFR priorities and project context
4. Define minimum acceptable threshold (default: 65/100)
5. Specify critical (pass/fail) criteria if any

**Output:** Evaluation criteria table in ADR (weighted criteria + minimum score + critical pass/fail criteria).

> Worked examples for every phase: see `docs/agent-examples/architecture-designer-tot-protocol-examples.md` (`aiwg discover "architecture designer tot protocol worked examples"`).

#### Phase 2: Alternative Generation (k=3-5)

**Objective:** Create diverse architectural options representing different trade-off optimizations.

**Generation Strategy:**

Use one or more of these strategies to ensure diversity (illustrative examples in the worked-examples link above):

1. **Pattern-based diversity:** ensures fundamentally different architectural styles (e.g., monolith vs microservices vs serverless).
2. **Technology-based diversity:** ensures different technology ecosystem trade-offs (e.g., PostgreSQL vs MongoDB vs DynamoDB).
3. **Trade-off optimization diversity:** ensures different criteria prioritizations (e.g., performance- vs cost- vs simplicity-optimized).
4. **Vendor/ecosystem diversity:** ensures different lock-in and integration trade-offs (e.g., AWS-native vs GCP-native vs multi-cloud).
5. **Hybrid combinations:** ensures creative combinations (e.g., REST+polling vs WebSocket vs GraphQL subscriptions vs gRPC streaming).

**Minimum k=3, Recommended k=5:**
- k=3: Fast decisions, limited exploration
- k=5: Thorough exploration, better coverage (recommended default)
- k>5: Rarely justified, diminishing returns

**Include status quo:** If modifying existing architecture, include "keep current approach" as baseline for comparison.

**Output:** 3-5 option descriptions with implementation details (see worked-examples link above).

#### Phase 3: Systematic Evaluation

**Objective:** Score each option against criteria with documented rationale.

**Scoring Guidelines:**

Use 0-10 scale:
- **0-2:** Fails criterion, significant issues
- **3-4:** Poor fit, major concerns
- **5-6:** Acceptable, notable compromises
- **7-8:** Good fit, minor concerns
- **9-10:** Excellent fit, ideal

**Evaluation Template (per option) — required fields:**
- Per-criterion score table (Criterion | Score 0-10 | Rationale) with specific rationale for every score
- Weighted Score: sum of (score × weight) × 10, reported out of 100
- Critical Criteria Check: pass/fail against each critical threshold
- Pros, Cons, and Risks (each risk paired with a Mitigation)

(See worked-examples link above for a fully populated per-option template.)

**Evaluate all k options** using this template before proceeding to comparison.

#### Phase 4: Comparison and Selection

**Objective:** Build comparison matrix, identify highest-scoring option, apply context to make final selection.

**Comparison Matrix:** Build one row per option with per-criterion scores, the weighted contribution (score × weight) in parentheses, a bolded weighted **Total**, and a Critical Pass? column.

**Selection Process:**

1. **Eliminate failures:** Remove options failing any critical criterion; remove options below the minimum threshold.
2. **Identify quantitative winner:** Rank surviving options by total score.
3. **Apply context factors:** Weigh team expertise, current architecture, timeline, vendor lock-in, and scale reality against the raw scores.
4. **Make selection:** Choose the option; if it is not the top scorer, explicitly justify why the score gap is acceptable given the context factors.

**Output:** Selection with quantitative + qualitative rationale, captured in a `## Decision` block containing: Selected Option, Quantitative Rationale (score vs threshold, rank, critical pass), Qualitative Rationale (context factors), and explicit Trade-offs Accepted. (See worked-examples link above for a fully populated matrix and Decision block.)

#### Phase 5: Backtracking Triggers

**Objective:** Define measurable conditions that indicate decision should be re-evaluated.

**Trigger Categories:**

1. **Performance failures** - SLA violations, latency spikes
2. **Scalability ceilings** - Growth approaching architectural limits
3. **Operational issues** - Reliability, maintenance burden
4. **Team capability gaps** - Skill shortages, knowledge loss
5. **Business context changes** - Regulatory, acquisition, pivot

**Specification Guidelines:**
- Make triggers **measurable** (not subjective)
- Include **threshold values** (when does it become a problem?)
- Cover **diverse categories** (not just performance)
- Aim for **3-7 triggers** (not exhaustive, but meaningful)

**Output:** Backtracking trigger list in ADR (3-7 measurable triggers spanning diverse categories, each with a threshold + time window) plus a Backtracking Action stating that triggering re-runs the ToT evaluation with updated context. (See worked-examples link above.)

---

## ADR Template Integration

The Architecture Designer agent uses the ToT-enhanced ADR template:

**Template Location:** `@$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/architecture/adr-with-tot.md`

**Key Sections Populated:**

1. **Context** - Problem statement, constraints, scope
2. **Evaluation Criteria** - NFR-based weighted criteria
3. **Options Considered** - k=3-5 alternatives with implementation details
4. **Option Evaluation** - Scored assessment per option
5. **Options Comparison Matrix** - Weighted scoring table
6. **Decision** - Selection with quantitative + qualitative rationale
7. **Consequences** - Positive, negative, neutral outcomes
8. **Implementation Notes** - Backtracking triggers, validation criteria
9. **References** - NFRs, architecture docs, related use cases

---

## Decision Quality Standards

### Minimum Acceptable ADR

To meet ToT quality standards, an ADR MUST include:

- [ ] **Criteria definition:** Minimum 3 weighted criteria derived from NFRs
- [ ] **Alternative generation:** Minimum k=3 distinct options
- [ ] **Systematic evaluation:** All options scored against all criteria with rationale
- [ ] **Comparison matrix:** Weighted score calculation for all options
- [ ] **Selection rationale:** Both quantitative (scores) and qualitative (context) factors
- [ ] **Trade-off acknowledgment:** Explicit statement of what is sacrificed
- [ ] **Backtracking triggers:** Minimum 3 measurable conditions

### Red Flags (Inadequate Process)

Watch for these indicators of poor ToT execution:

- **Single option presented:** No alternatives explored (not ToT)
- **Superficial alternatives:** Options differ only cosmetically (e.g., "PostgreSQL vs MySQL vs MariaDB" - all same paradigm)
- **Missing scoring rationale:** Scores without explanation (not auditable)
- **Cherry-picked criteria:** Criteria seem selected to favor pre-chosen option (confirmation bias)
- **No context factors:** Selection based purely on scores without qualitative reasoning (naive optimization)
- **Vague backtracking triggers:** "If it doesn't work out" (not measurable)

---

## Alternative Generation Standards

### Diversity Requirements

Alternatives MUST differ in at least one of:

1. **Architectural paradigm** (monolith vs microservices vs serverless)
2. **Technology ecosystem** (relational vs NoSQL vs NewSQL)
3. **Deployment model** (self-hosted vs managed vs serverless)
4. **Trade-off optimization** (performance vs cost vs simplicity)
5. **Vendor/platform** (AWS vs GCP vs Azure vs on-premise)

Variants of the same paradigm (e.g., three PostgreSQL connection-pooler choices) are insufficient — that is implementation-detail selection, not an architecture decision requiring ToT. Sufficient diversity spans distinct paradigms, deployment models, and trade-offs. (Bad-vs-good worked examples: see worked-examples link above.)

---

## Evaluation Scoring Standards

### Rationale Requirements

Every score MUST include:
- **What** - What aspect of the criterion is being assessed
- **Why** - Why this score (specific evidence, not vague claims)
- **Trade-offs** - What is sacrificed vs gained

Vague rationale ("Good performance") is circular and not auditable. Sufficient rationale cites specific metrics, identifies trade-offs, references NFRs, and acknowledges limitations. (Bad-vs-good worked examples: see worked-examples link above.)

---

## Context Factor Guidance

When higher-scoring option is NOT selected, document why:

### Common Context Factors

1. **Team capability:**
   - Existing expertise vs learning curve
   - Hiring market availability
   - Knowledge transfer risk

2. **Strategic alignment:**
   - Vendor lock-in concerns
   - Technology standardization policies
   - Acquisition/partnership implications

3. **Migration complexity:**
   - Path from current state
   - Downtime tolerance
   - Data migration effort

4. **Timeline pressure:**
   - Learning curve impact on schedule
   - Time-to-market criticality
   - Parallel work enablement

5. **Risk tolerance:**
   - Proven vs cutting-edge technology
   - Operational maturity
   - Vendor stability

6. **Scale appropriateness:**
   - Current vs projected load
   - Over-engineering concerns
   - Future flexibility needs

### Documentation Template

When a higher-scoring option is rejected, write a **Qualitative Rationale** block that names each context-factor category with its specific situation and states that the score difference is acceptable given the risk reductions. (Template + worked example: see worked-examples link above.)

---

## Backtracking Trigger Standards

### Measurability Requirements

Every trigger MUST be:
- **Specific:** Exact metric or condition, not vague
- **Measurable:** Quantifiable threshold
- **Observable:** Can be monitored/detected
- **Actionable:** Clear what to do when triggered

Unmeasurable triggers ("if performance becomes a problem") are subjective and not actionable. Measurable triggers state specific metrics, thresholds, and time windows for unambiguous detection. (Bad-vs-good worked examples: see worked-examples link above.)

---

## Agent Interaction Patterns

Required behaviors per request type (worked dialogs in the worked-examples link above):

- **Explicit ToT request** ("Create an ADR ... using Tree of Thoughts"): run the full workflow — acknowledge, read NFRs, confirm weighted criteria, generate k=5, score, build matrix, recommend, define triggers, populate template, save to `.aiwg/architecture/decisions/ADR-XXX-*.md`.
- **Simple justification request** ("Document why we chose X"): first clarify whether the user wants a simple justification ADR or a full ToT evaluation; only proceed with full ToT if they choose it.
- **Quick/blocked decision** ("...today — we're blocked"): acknowledge urgency, offer expedited ToT (k=3, simplified evaluation), deliver the matrix fast, and note in the ADR that it was time-constrained ToT (may revisit).

---

## Tool Integration

Before generating criteria, the agent reads context and extracts thresholds/priorities/constraints from:

- **NFR modules** — `@.aiwg/requirements/nfr-modules/{performance,scalability,maintainability,security}.md` and `@.aiwg/requirements/supplemental-specification.md` (thresholds, priorities, constraints).
- **Use case context** (decision tied to a feature) — `@.aiwg/requirements/use-cases/UC-XXX-relevant-feature.md` (performance requirements, data volumes, user expectations).
- **Existing architecture** — `@.aiwg/architecture/software-architecture-doc.md` (migration constraints, integration needs, existing patterns).

---

## Success Metrics

Track ToT decision effectiveness:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Alternatives per ADR | k≥3 (prefer k=5) | Count options in each ADR |
| Decisions requiring reversal | <5% within 12 months | Track superseding ADRs |
| Backtracking triggers defined | 100% of ADRs have 3-7 triggers | ADR audit |
| Stakeholder confidence | >85% agreement with selection | Post-decision survey |
| Time to decision | <2 weeks from initiation | Track ADR creation timestamps |
| Scoring completeness | 100% have documented rationale | ADR review checklist |

---

## Examples

Two full ADR walk-throughs (Database Selection k=5, API Design Pattern k=4) — including criteria, generated options, selection, and backtracking triggers — live in the worked-examples file: see the worked-examples link above (`aiwg discover "architecture designer tot protocol worked examples"`).

---

## References

- **Research Paper:** @.aiwg/research/paper-analysis/REF-020-tree-of-thoughts.md
- **Workflow Guide:** @.aiwg/research/docs/tot-decision-workflow.md
- **ADR Template:** @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/architecture/adr-with-tot.md
- **Base Agent:** @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/architecture-designer.md
- **NFR Modules:** @.aiwg/requirements/nfr-modules/
- **Software Architecture Doc:** @.aiwg/architecture/software-architecture-doc.md

---

## Appendix: ToT Quick Reference for Agents

The per-phase actionable checklists (Pre-Flight, Generation, Evaluation, Selection, Backtracking, Quality Check) are the checkbox restatement of the 5-Phase ToT Workflow above combined with the "Minimum Acceptable ADR" checklist under Decision Quality Standards. Work those two sections directly — no item is unique to this appendix.

---

**Enhancement Status:** Active
**Applies To:** All Architecture Designer agent invocations creating ADRs
**Maintenance:** Review quarterly, update based on ToT research developments
**Feedback:** Report issues or improvements to issue #97
