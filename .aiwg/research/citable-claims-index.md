# AIWG Citable Claims Index

This document tracks claims made in AIWG documentation that require or benefit from academic citations.

## Research Corpus

Full paper documentation available at: **[roctinam/research-papers](https://git.integrolabs.net/roctinam/research-papers)**

## Purpose

- Map AIWG claims to supporting research
- Identify gaps where claims lack citations
- Guide documentation updates per Decision 5

## Citation Placement Rules (Decision 5)

| Location | Citations |
|----------|-----------|
| README | None |
| Practitioner docs | None |
| `docs/research/` | Mixed format: (Author, Year) + REF-XXX link |
| Glossary | Table format |

## Claims by Category

### Memory & Context Management

| Claim | Location | Citation | Status |
|-------|----------|----------|--------|
| "Context stacks maintain project knowledge across sessions" | Multi-agent pattern doc | REF-008 (Lewis 2020), REF-009 (Graves 2014) | ✅ Cited |
| ".aiwg/ provides non-parametric knowledge store" | Architecture docs | REF-008 (Lewis 2020) | ✅ Cited |
| "RAG improves factuality over parametric-only models" | Research docs | REF-008 (Lewis 2020) | ✅ Cited |

### Multi-Agent Architecture

| Claim | Location | Citation | Status |
|-------|----------|----------|--------|
| "Multiple specialized agents outperform single generalist" | Multi-agent pattern doc | REF-007 (Jacobs 1991), REF-012 (Qian 2024) | ✅ Cited |
| "Ensemble validation reduces individual errors" | Multi-agent pattern doc | REF-007 (Jacobs 1991) | ✅ Cited |
| "Primary→Reviewers→Synthesizer follows MoE pattern" | Orchestrator docs | REF-007 (Jacobs 1991), REF-013 (Hong 2024) | ✅ Cited |
| "Role specialization improves output quality" | Agent design docs | REF-012 (Qian 2024), REF-013 (Hong 2024) | ✅ Cited |
| "Structured communication outperforms unstructured chat" | Multi-agent pattern doc | REF-012 (Qian 2024), REF-013 (Hong 2024) | ✅ Cited |

### Cognitive Load & Task Design

| Claim | Location | Citation | Status |
|-------|----------|----------|--------|
| "7±2 items is optimal task chunk size" | Task decomposition docs | REF-005 (Miller 1956) | ✅ Cited |
| "Templates reduce cognitive load" | Template design docs | REF-006 (Sweller 1988) | ✅ Cited |
| "Worked examples accelerate learning" | Template design docs | REF-006 (Sweller 1988) | ✅ Cited |
| "Intrinsic vs extraneous load distinction" | Task design docs | REF-006 (Sweller 1988) | ✅ Cited |

### Iteration & Recovery

| Claim | Location | Citation | Status |
|-------|----------|----------|--------|
| "Iterative refinement improves output quality ~20%" | Ralph guide | REF-015 (Madaan 2023) | ✅ Cited |
| "External verification outperforms self-critique" | Ralph guide | REF-015 (Madaan 2023), REF-002 (Roig 2025) | ✅ Cited |
| "2-3 iterations optimal before diminishing returns" | Ralph guide | REF-015 (Madaan 2023) | ✅ Cited |
| "Models have blind spots for own errors" | Recovery patterns | REF-002 (Roig 2025), REF-015 (Madaan 2023) | ✅ Cited |

### Process & Traceability

| Claim | Location | Citation | Status |
|-------|----------|----------|--------|
| "Phase gates with explicit criteria improve quality" | SDLC docs | REF-010 (Cooper 1990) | ✅ Cited |
| "Bidirectional traceability essential for maintenance" | @-mention docs | REF-011 (Gotel 1994) | ✅ Cited |
| "SOPs encoded as prompts reduce errors" | Flow command docs | REF-013 (Hong 2024) | ✅ Cited |

### Failure Modes

| Claim | Location | Citation | Status |
|-------|----------|----------|--------|
| "Context pollution degrades reasoning (Archetype 3)" | Failure handling docs | REF-002 (Roig 2025) | ✅ Cited |
| "Over-helpfulness causes hallucination (Archetype 2)" | Failure handling docs | REF-002 (Roig 2025) | ✅ Cited |
| "Grounding checkpoints prevent stale data errors" | Recovery patterns | REF-002 (Roig 2025) | ✅ Cited |

### Evaluation & Benchmarks

| Claim | Location | Citation | Status |
|-------|----------|----------|--------|
| "Real-world issues more indicative than synthetic tasks" | Evaluation docs | REF-014 (Jimenez 2024) | ✅ Cited |
| "Agentic scaffolding dramatically outperforms raw LLMs" | Architecture docs | REF-014 (Jimenez 2024) | ✅ Cited |
| "Tool use essential for complex software tasks" | Tool design docs | REF-014 (Jimenez 2024) | ✅ Cited |

## Uncited Claims (Gaps)

| Claim | Location | Needed Research | Priority |
|-------|----------|-----------------|----------|
| "Voice profiles enable consistent tone" | Voice framework | Style transfer literature | Medium |
| "Capability-based dispatch improves routing" | Agent dispatch | SOA/microservices literature | Low |
| "Dual-track iteration improves throughput" | SDLC docs | Agile/RUP literature | Medium |

## Research Gaps

Claims that need additional research support:

### High Priority
1. **Voice/Style Transfer**: Need citations for controllable text generation
2. **Agentic failure taxonomy**: Roig (2025) is primary; need more sources

### Medium Priority
1. **Dual-track delivery**: Need SAFe/RUP citations for parallel discovery/delivery
2. **Semantic service discovery**: SOA literature for capability dispatch

### Low Priority
1. **Doc-code validation**: Formal verification literature for consistency checking

## Update Protocol

When adding claims to AIWG documentation:

1. Check this index for existing citation
2. If uncited, search `docs/references/` for relevant research
3. If no reference exists, create one following REF-XXX template
4. Update this index with new claim → citation mapping
5. Apply citation in `docs/research/` only (per Decision 5)

---

*Last updated: 2026-01-24*
*Issue: #74 Research Acquisition*
