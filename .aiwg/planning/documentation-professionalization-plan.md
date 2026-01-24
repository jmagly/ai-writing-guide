# Documentation Professionalization Plan

**Epic:** [#67 - Documentation Professionalization: Research-Backed Framing](https://git.integrolabs.net/roctinam/ai-writing-guide/issues/67)
**Date:** 2026-01-24
**Status:** ✅ APPROVED (2026-01-24)

---

## Executive Summary

This plan updates AIWG's external documentation to reflect its actual sophistication as a **cognitive architecture for AI-augmented software development**, not just a "writing guide." The work involves:

1. Adding professional/academic terminology alongside informal terms
2. Integrating research citations where academic backing exists
3. Creating multi-level documentation (executive, practitioner, researcher)
4. Restructuring the README for multiple audiences
5. Updating marketing copy to differentiate from simple AI tools

**Critical constraint:** NO changes to `.aiwg/` directory or core system behavior.

**Pre-requisite:** Research acquisition must complete before documentation work begins (Issue #74).

---

## Scope

### In Scope

| Category | Files |
|----------|-------|
| **README** | `README.md` |
| **Core Docs** | `docs/extensions/overview.md`, `docs/ralph-guide.md`, `docs/quickstart.md`, `docs/cli-reference.md` |
| **New Docs** | `docs/overview/`, `docs/research/`, `docs/glossary.md` |
| **References** | `docs/references/` (expand, don't modify existing) |
| **Package** | `package.json` (description field only) |

### Out of Scope

| Category | Rationale |
|----------|-----------|
| `.aiwg/` directory | System memory - do not alter |
| `agentic/code/` | Agent definitions work fine, just need better external docs |
| `src/` | Implementation code - no changes |
| `CLAUDE.md` | Project instructions - separate concern |

---

## Phase 0: Research Acquisition (Issue #74) ⚠️ PRE-REQUISITE

**BLOCKS ALL OTHER PHASES** - Must complete before any documentation work begins.

### Overview

Before updating documentation with professional terminology and citations, we must:

1. **Acquire** peer-reviewed research papers backing AIWG techniques
2. **Review** thoroughly and extract citable claims, insights, and findings
3. **Compile** into reusable reference set with standardized format
4. **Identify gaps** - techniques we use that lack research backing
5. **Plan placement** - detailed map of where citations go

### Target Papers (HIGH Priority)

| Category | Paper | Status |
|----------|-------|--------|
| **Cognitive Load** | Miller (1956) "The Magical Number Seven" | TO ACQUIRE |
| **Cognitive Load** | Sweller (1988) Cognitive Load Theory | TO ACQUIRE |
| **Multi-Agent** | Jacobs et al. (1991) Mixture of Experts | TO ACQUIRE |
| **Memory/RAG** | Lewis et al. (2020) RAG for NLP | TO ACQUIRE |
| **Memory** | Graves et al. (2016) Neural Turing Machines | TO ACQUIRE |
| **Stage-Gate** | Cooper (1990) Stage-Gate Systems | TO ACQUIRE |
| **Traceability** | Gotel & Finkelstein (1994) Traceability Problem | TO ACQUIRE |
| **LLM Failures** | Roig (2025) LLM Failure Modes | HAVE (REF-002) |
| **Multi-Agent** | Tao et al. (2024) MAGIS | HAVE (REF-004) |

### Deliverables

1. **Reference files** (`docs/references/REF-005` through `REF-011+`)
2. **Claims index** (`.aiwg/research/citable-claims-index.md`)
3. **Gap analysis** (`.aiwg/research/research-gap-analysis.md`)
4. **Citation placement plan** (`.aiwg/planning/citation-placement-plan.md`)

### Success Criteria

- [ ] All HIGH priority papers acquired and reviewed
- [ ] Reference entries created for each paper
- [ ] Claims index with 50+ citable claims
- [ ] Gap analysis completed
- [ ] Citation placement plan covers all target docs

**Full details:** [Issue #74](https://git.integrolabs.net/roctinam/ai-writing-guide/issues/74)

---

## Phase 1: Foundation (Issues #68, #73)

### 1.1 Create Glossary (Issue #68)

**New file:** `docs/glossary.md`

```markdown
# Glossary

## Terminology Mapping

| Informal Term | Professional Term | Academic Citation |
|---------------|-------------------|-------------------|
| Context stacks | Structured Semantic Memory | Graves et al. (2016) |
| Extended memory | Persistent Knowledge Store | Lewis et al. (2020) RAG |
| Multi-agent review | Ensemble Validation | Jacobs et al. (1991) MoE |
| Ralph loop | Closed-Loop Self-Correction | Control theory, Roig (2025) |
| Doc-code validation | Dual-Representation Consistency | Formal verification |
| 7±2 decomposition | Cognitive Load Optimization | Miller (1956), Sweller CLT |
| Voice profiles | Continuous Style Representation | Neural style transfer |
| Phase gates | Stage-Gate Process | Cooper (1990), RUP |
| @-mentions | Traceability Links | IEEE 830, DO-178C |
| Capability dispatch | Semantic Service Discovery | SOA literature |
...
```

**Decision:** Keep both terminologies - informal for accessibility, professional for credibility.

### 1.2 Create Research Background (Issue #73)

**New file:** `docs/research/research-background.md`

**Structure:**
1. Overview - What research domains inform AIWG
2. Theoretical Foundations (6 sections with Source → Findings → AIWG Application)
3. Comparison to Related Work (AIWG vs MAGIS vs AutoGPT vs Claude Code base)
4. Known Limitations (honest assessment)
5. Bibliography (full citations, prefer open access)

**Decision:** Be honest about limitations. Credibility requires acknowledging gaps.

### 1.3 Add New Reference Files (Issue #69)

**New files in `docs/references/`:**
- `REF-005-millers-law-cognitive-limits.md`
- `REF-006-cognitive-load-theory.md`
- `REF-007-mixture-of-experts.md`
- `REF-008-retrieval-augmented-generation.md`

**Update:** `docs/references/README.md` with full bibliography

---

## Phase 2: README Restructuring (Issue #70)

### Current README Analysis

| Section | Status | Action |
|---------|--------|--------|
| Hero / positioning | Undersells system | Rewrite |
| Quick Start | Good | Keep |
| What You Get | Good but surface-level | Enhance with "why" |
| Platform Support | Good | Keep |
| Documentation | Good | Add audience-level links |
| Community | Good | Keep |

### Proposed README Structure

```markdown
# AIWG - Agentic AI Workflow Guide

## One-Line Summary
A cognitive architecture for AI-augmented software development.

## What AIWG Actually Is
[NEW - Explain it's a cognitive architecture, not just a writing tool]

## Why This Matters
[NEW - Three audience perspectives]

### For Practitioners
### For Researchers
### For Executives

## Quick Start
[KEEP - existing content]

## Core Capabilities
[NEW - Six capabilities with professional terminology]

### 1. Structured Semantic Memory (.aiwg/)
### 2. Multi-Agent Ensemble Validation
### 3. Closed-Loop Self-Correction (Ralph)
### 4. Bidirectional Traceability
### 5. Stage-Gate Process Management
### 6. Cognitive Load Optimization

## Research Foundations
[NEW - Brief section with key citations]

## What You Get
[KEEP - existing frameworks/addons tables]

## Platform Support
[KEEP]

## Documentation
[ENHANCE - add audience-level navigation]

## Contributing
[KEEP]

## Community & Support
[KEEP]

## License
[KEEP]

## Sponsors
[KEEP]

## Acknowledgments
[ENHANCE - add academic acknowledgments]
```

### Key Content Changes

**New positioning statement:**

> "AIWG is a **cognitive architecture for AI-augmented software development** that applies established computer science and cognitive science principles to LLM orchestration. The framework provides structured memory, ensemble validation, closed-loop correction, and quality gates—techniques backed by research showing that recovery capability and multi-perspective review are the dominant predictors of AI system reliability."

**New "What AIWG Actually Is" section:**

> **AIWG is not just a writing tool—it's a cognitive architecture.**
>
> The system provides AI agents with:
> - **Memory** - Structured persistence across sessions (.aiwg/)
> - **Reasoning** - Multi-agent deliberation with synthesis
> - **Learning** - Failure analysis and strategy adaptation (Ralph)
> - **Verification** - Dual-representation consistency checking
> - **Planning** - Hierarchical decomposition with phase gates
> - **Style** - Controllable generation via continuous voice parameters
>
> This positions AIWG closer to cognitive architectures (SOAR, ACT-R) adapted for LLM orchestration than to simple prompt engineering tools.

**Decision:** Add "Why This Matters" with three audience sections to address different readers without forcing them through irrelevant content.

---

## Phase 3: Multi-Audience Documentation (Issue #71)

### New Directory Structure

```
docs/
├── overview/                    # NEW
│   ├── executive-brief.md      # Tier 1: 1-2 pages
│   ├── what-is-aiwg.md         # Tier 2: Conceptual overview
│   └── quickstart.md           # MOVE from docs/quickstart.md
├── guides/                      # RENAME from current flat structure
│   ├── ralph-guide.md          # MOVE
│   ├── intake-guide.md         # MOVE
│   └── ...
├── research/                    # NEW
│   ├── research-background.md  # Full literature review
│   ├── architecture-rationale.md # Why each design choice
│   ├── failure-mode-mitigation.md # How AIWG addresses LLM failures
│   └── evaluation.md           # How to evaluate AIWG claims
├── references/                  # ENHANCE
│   ├── REF-001-... (existing)
│   ├── REF-005-... (new)
│   └── README.md (bibliography)
├── extensions/                  # ENHANCE
│   ├── overview.md             # Add "why" sections
│   └── ...
└── glossary.md                  # NEW
```

### Tier 1: Executive Brief

**File:** `docs/overview/executive-brief.md`
**Length:** 1-2 pages max
**Audience:** Decision makers, evaluators

**Content:**
1. What AIWG does (3 sentences)
2. Business value (risk reduction, auditability, governance)
3. Key differentiators (vs simple AI tools)
4. Research backing (brief - "based on...")
5. Link to deeper content

### Tier 2: Practitioner Docs

**Enhance existing docs with "why" sections:**

| File | Addition |
|------|----------|
| `docs/ralph-guide.md` | Add "Research Foundation" section citing Roig (2025) |
| `docs/extensions/overview.md` | Add rationale for unified schema |
| `docs/quickstart.md` | Add conceptual context before commands |

### Tier 3: Research Documentation

**New files:**
- `docs/research/research-background.md` - Full literature review
- `docs/research/architecture-rationale.md` - Design decisions with academic framing
- `docs/research/failure-mode-mitigation.md` - How AIWG addresses Roig's 4 archetypes
- `docs/research/evaluation.md` - How to evaluate claims, benchmarks

**Decision:** Create separate research/ directory rather than bloating practitioner docs.

---

## Phase 4: Existing Doc Enhancements (Issues #68, #69)

### docs/ralph-guide.md

**Add section after "Overview":**

```markdown
## Research Foundation

Ralph implements **closed-loop self-correction** based on findings from Roig (2025):

> "Recovery capability—not initial correctness—is the dominant predictor of agentic task success."

The Execute → Verify → Learn → Iterate pattern addresses **Archetype 4** (Fragile Execution Under Load) from LLM failure mode research by:

1. Keeping individual iterations bounded in scope
2. Extracting structured learnings from each failure
3. Adapting strategy based on error analysis
4. Terminating gracefully when limits are reached

See [Research: Failure Mode Mitigation](research/failure-mode-mitigation.md) for full details.
```

### docs/extensions/overview.md

**Add section after "What Are Extensions?":**

```markdown
## Why a Unified Schema?

AIWG's extension system implements **semantic service discovery** patterns from service-oriented architecture (SOA). Instead of hard-coded mappings ("use Agent X for task Y"), extensions declare capabilities that enable:

1. **Dynamic dispatch** - Find agents by capability, not by name
2. **Graceful substitution** - Replace agents without changing orchestration
3. **Automatic discovery** - New extensions are found without registry updates
4. **Cross-platform deployment** - Same extension works on Claude, Cursor, Copilot

This approach is inspired by FIPA agent communication standards and semantic web service discovery.
```

### docs/quickstart.md

**Add conceptual section at top:**

```markdown
## What You're Installing

AIWG deploys a **cognitive architecture** for AI-augmented development:

- **Agents** - Specialized AI personas (Test Engineer, Security Auditor, etc.)
- **Memory** - Persistent artifact storage in `.aiwg/`
- **Workflows** - Phase-gated orchestration (Inception → Production)
- **Recovery** - Iterative execution with automatic error handling

This isn't just prompt templates—it's structured memory, ensemble validation, and closed-loop correction.
```

---

## Phase 5: Marketing Copy (Issue #72)

### package.json

**Current:**
```json
"description": "AI Writing Guide - Framework for improving AI-generated content"
```

**Proposed:**
```json
"description": "AIWG - Cognitive architecture for AI-augmented software development with structured memory, ensemble validation, and closed-loop correction"
```

### GitHub Repository Description

**Current:** "AI Writing Guide - improve AI content quality"

**Proposed:** "AIWG - Cognitive architecture for reliable AI-augmented development. Structured memory, ensemble validation, closed-loop correction."

### Three Positioning Statements

**Technical (for README, docs):**
> "AIWG is an AI orchestration framework that applies established software engineering and cognitive science principles to large language model workflows."

**Accessible (for marketing, social):**
> "AIWG turns unpredictable AI assistance into reliable, auditable workflows. Instead of hoping AI gets it right the first time, AIWG provides the memory, verification, and recovery systems that make AI trustworthy for serious work."

**Peer Review (for academic contexts):**
> "We present AIWG, a framework for AI-augmented software development that operationalizes findings from recent LLM failure mode research [Roig 2025] and multi-agent coordination studies [Tao et al. 2024]."

### Name Discussion

**Decision needed:** Keep "AI Writing Guide" name or rebrand?

**Options:**
1. **Keep as-is** - Brand recognition, avoid confusion
2. **Keep acronym, reframe expansion** - "AIWG" stays, full name de-emphasized
3. **Backronym** - "AI Workflow & Governance"
4. **Full rebrand** - New name entirely

**Recommendation:** Option 2 - Keep "AIWG" acronym prominently, de-emphasize "AI Writing Guide" in favor of positioning statement. No immediate rebrand needed.

---

## Implementation Order

### Wave 0: Research Acquisition (BLOCKING - #74)
1. Acquire peer-reviewed papers (HIGH priority first)
2. Create reference entries (REF-005 through REF-011+)
3. Extract citable claims into index
4. Complete gap analysis
5. Create citation placement plan

**Must complete before any documentation work begins.**

### Wave 1: Foundation (Can parallelize, after Wave 0)
6. Create `docs/glossary.md` (#68)
7. Create `docs/research/research-background.md` (#73)
8. Add new reference files (#69)

### Wave 2: README (Depends on Wave 1)
9. Restructure `README.md` (#70)

### Wave 3: Documentation Tiers (Depends on Wave 1)
10. Create `docs/overview/executive-brief.md` (#71)
11. Create `docs/overview/what-is-aiwg.md` (#71)
12. Create `docs/research/` additional files (#71)
13. Move/reorganize existing docs (#71)

### Wave 4: Enhancements (Depends on Waves 1-3)
14. Enhance `docs/ralph-guide.md` (#68, #69)
15. Enhance `docs/extensions/overview.md` (#68, #69)
16. Enhance `docs/quickstart.md` (#71)

### Wave 5: Marketing (Depends on Wave 2)
17. Update `package.json` description (#72)
18. Update repository descriptions (#72)

---

## Decisions ✅ APPROVED

All decisions finalized 2026-01-24.

### Decision 1: Terminology Strategy ✅

**Choice:** Dual inline - professional term with informal in parentheses

**Format:**
> "AIWG implements **structured semantic memory** (context stacks) to maintain..."

**Rationale:** Preserves accessibility for practitioners while adding credibility for researchers.

### Decision 2: Documentation Structure ✅

**Choice:** Use existing Pagenary `research/` section

**Constraints:**
- Docs already migrated to Pagenary - don't break existing structure
- New content goes in `content/research/` per Pagenary plan
- Glossary goes in `content/research/glossary.md`

**Rationale:** Aligns with existing `.aiwg/planning/docs-pagenary-refactor-plan.md`.

### Decision 3: README Depth ✅

**Choice:** Brief explanation (3-5 sentences) + link to docs/research/

**Specifications:**
- No citations in README
- "What AIWG Is" section: 3-5 sentences defining cognitive architecture
- Link to `docs/research/` for full explanation
- Keep README scannable

**Rationale:** Quick install focus, depth for those who want it.

### Decision 4: Name Strategy ✅

**Choice:** Keep acronym "AIWG", phase out "AI Writing Guide" from prominent positions

**Specifications:**
- Hero/title: Just "AIWG"
- Positioning statement does the explaining
- "AI Writing Guide" stays only in package.json name and legal docs
- Don't mention full name in README hero

**Rationale:** Let positioning do the work, avoid confusing name.

### Decision 5: Citation Strategy ✅

**Choice:** Tiered citation approach

| Location | Citations |
|----------|-----------|
| README | None |
| Practitioner docs | None |
| `docs/research/` | Mixed format: `(Roig, 2025)` + link to `REF-XXX` |
| Glossary | Table format: Informal \| Professional \| Citation |

**Rationale:** Clean practitioner experience, academic rigor where expected.

---

## Files to Create

**Note:** Paths follow existing Pagenary structure. `docs/` is the source that compiles to Pagenary `content/`.

| File | Issue | Priority |
|------|-------|----------|
| `docs/research/glossary.md` | #68 | High |
| `docs/research/research-background.md` | #73 | High |
| `docs/research/architecture-rationale.md` | #71 | Medium |
| `docs/research/failure-mode-mitigation.md` | #71 | Medium |
| `docs/research/evaluation.md` | #71 | Low |
| `docs/references/REF-005-millers-law-cognitive-limits.md` | #69 | High |
| `docs/references/REF-006-cognitive-load-theory.md` | #69 | High |
| `docs/references/REF-007-mixture-of-experts.md` | #69 | Medium |
| `docs/references/REF-008-retrieval-augmented-generation.md` | #69 | Medium |
| `docs/references/REF-009-stage-gate-systems.md` | #69 | Medium |
| `docs/references/REF-010-traceability-problem.md` | #69 | Low |

## Files to Modify

| File | Issue | Changes |
|------|-------|---------|
| `README.md` | #70, #72 | Add "What AIWG Is" (3-5 sentences), link to research/, de-emphasize "AI Writing Guide" |
| `docs/references/README.md` | #69 | Add full bibliography with all REF-XXX entries |
| `package.json` | #72 | Update description to "cognitive architecture" positioning |

**Note:** Per Decision 5, practitioner docs (`ralph-guide.md`, `quickstart.md`, `extensions/overview.md`) get NO changes - all academic content goes in `docs/research/` only.

---

## Success Criteria

- [ ] All 10 core concepts have professional terminology documented
- [ ] README explains "what AIWG actually is" in 3-5 sentences (no citations)
- [ ] Glossary uses table format: Informal | Professional | Citation
- [ ] All citations in `docs/research/` only (not in practitioner docs)
- [ ] Research background document exists with honest limitations
- [ ] "AIWG" acronym prominent, "AI Writing Guide" de-emphasized
- [ ] Marketing copy reflects cognitive architecture positioning
- [ ] Pagenary structure preserved (no breaking changes)
- [ ] All existing documentation links still work

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Over-academicizing alienates practitioners | Keep informal terms alongside professional |
| Links break during restructure | Create redirects, update internal references |
| Claims appear overblown | Be honest about limitations, cite sources |
| Work scope creeps into system changes | Strict scope enforcement - docs only |

---

## Approval Request

**Requesting approval for:**

1. Overall plan structure and phasing
2. Decision recommendations (5 decisions above)
3. File creation and modification list
4. Implementation order

**Please review and provide:**
- Approval to proceed
- Any decision overrides
- Additional requirements
- Scope adjustments

---

## Gitea Issues Created

| Issue | Title | URL | Notes |
|-------|-------|-----|-------|
| #67 | [Epic] Documentation Professionalization | https://git.integrolabs.net/roctinam/ai-writing-guide/issues/67 | Parent epic |
| **#74** | **Research Acquisition & Citation Integration** | https://git.integrolabs.net/roctinam/ai-writing-guide/issues/74 | **⚠️ PRE-REQ - Blocks all others** |
| #68 | Terminology Mapping & Standardization | https://git.integrolabs.net/roctinam/ai-writing-guide/issues/68 | Blocked by #74 |
| #69 | Academic Citation Integration | https://git.integrolabs.net/roctinam/ai-writing-guide/issues/69 | Blocked by #74 |
| #70 | README Restructuring for Multiple Audiences | https://git.integrolabs.net/roctinam/ai-writing-guide/issues/70 | Blocked by #74 |
| #71 | Multi-Audience Documentation Levels | https://git.integrolabs.net/roctinam/ai-writing-guide/issues/71 | Blocked by #74 |
| #72 | Marketing Copy Professionalization | https://git.integrolabs.net/roctinam/ai-writing-guide/issues/72 | Blocked by #74 |
| #73 | Create Research Background Document | https://git.integrolabs.net/roctinam/ai-writing-guide/issues/73 | Blocked by #74 |
