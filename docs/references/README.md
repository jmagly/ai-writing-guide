# Research References

This directory contains references to academic papers, industry research, and foundational works that inform AIWG's design and evolution.

## Purpose

- Document research that validates or extends AIWG concepts
- Track academic foundations for multi-agent orchestration patterns
- Identify opportunities for iterative self-improvement based on published research
- Provide citations for AIWG's theoretical underpinnings

## Reference Format

Each reference document includes:

- **Citation**: Full academic citation
- **Summary**: Key concepts and contributions
- **AIWG Alignment**: Where AIWG already embodies the research
- **Improvement Opportunities**: Where AIWG could adapt or extend concepts
- **Implementation Notes**: Actionable items for AIWG enhancement

## References

### Foundational Research (Classic)

| ID | Title | Authors | Year | AIWG Relevance |
|----|-------|---------|------|----------------|
| REF-005 | [The Magical Number Seven, Plus or Minus Two](REF-005-millers-law-cognitive-limits.md) | Miller | 1956 | Task decomposition, cognitive limits |
| REF-006 | [Cognitive Load Theory](REF-006-cognitive-load-theory.md) | Sweller | 1988 | Template design, worked examples |
| REF-007 | [Adaptive Mixtures of Local Experts](REF-007-mixture-of-experts.md) | Jacobs et al. | 1991 | Multi-agent architecture |
| REF-009 | [Neural Turing Machines](REF-009-neural-turing-machines.md) | Graves et al. | 2014 | External memory patterns |
| REF-010 | [Stage-Gate Systems](REF-010-stage-gate-systems.md) | Cooper | 1990 | Phase gates, milestones |
| REF-011 | [Requirements Traceability](REF-011-requirements-traceability.md) | Gotel & Finkelstein | 1994 | @-mentions, bidirectional links |

### Modern AI Research (2020+)

| ID | Title | Authors | Year | AIWG Relevance |
|----|-------|---------|------|----------------|
| REF-008 | [Retrieval-Augmented Generation](REF-008-retrieval-augmented-generation.md) | Lewis et al. | 2020 | .aiwg/ memory, context stacks |
| REF-015 | [Self-Refine: Iterative Refinement](REF-015-self-refine-iterative-refinement.md) | Madaan et al. | 2023 | Ralph loop foundation |
| REF-012 | [ChatDev: Communicative Agents](REF-012-chatdev-multi-agent-software.md) | Qian et al. | 2024 | Multi-agent communication |
| REF-013 | [MetaGPT: Multi-Agent Framework](REF-013-metagpt-multi-agent-framework.md) | Hong et al. | 2024 | SOPs, assembly line paradigm |
| REF-014 | [SWE-bench: GitHub Issue Resolution](REF-014-swe-bench-evaluation.md) | Jimenez et al. | 2024 | Evaluation methodology |
| REF-004 | [MAGIS: Multi-Agent GitHub Issues](https://arxiv.org/abs/2403.17927) | Tao et al. | 2024 | Issue-to-code, bounded iteration |

### Production & Failure Research

| ID | Title | Authors | Year | AIWG Relevance |
|----|-------|---------|------|----------------|
| REF-001 | [Production-Grade Agentic AI Workflows](REF-001-production-agentic-workflows.md) | Bandara et al. | 2024 | Multi-agent orchestration |
| REF-002 | [How Do LLMs Fail In Agentic Scenarios?](REF-002-llm-failure-modes-agentic.md) | Roig | 2025 | Failure archetypes, recovery |

## Category Index

### Memory & Retrieval
- REF-008: Lewis et al. (2020) - RAG
- REF-009: Graves et al. (2014) - Neural Turing Machines

### Multi-Agent Systems
- REF-007: Jacobs et al. (1991) - Mixture of Experts
- REF-012: Qian et al. (2024) - ChatDev
- REF-013: Hong et al. (2024) - MetaGPT
- REF-004: Tao et al. (2024) - MAGIS

### Cognitive Science
- REF-005: Miller (1956) - Magical Number Seven
- REF-006: Sweller (1988) - Cognitive Load Theory

### Process Management
- REF-010: Cooper (1990) - Stage-Gate Systems
- REF-011: Gotel & Finkelstein (1994) - Requirements Traceability

### Iteration & Recovery
- REF-015: Madaan et al. (2023) - Self-Refine
- REF-002: Roig (2025) - LLM Failure Modes

### Evaluation & Benchmarks
- REF-014: Jimenez et al. (2024) - SWE-bench

## Adding References

When adding a new reference:

1. Assign next sequential ID (REF-XXX)
2. Create detailed reference document following template
3. Update this README's reference table
4. Link relevant AIWG components that implement or could benefit from the research
5. Update `docs/research/glossary.md` if new terminology mappings apply

## Cross-References

- **Terminology Glossary**: `docs/research/glossary.md` - Maps informal terms to professional equivalents
- **Claims Index**: `.aiwg/research/citable-claims-index.md` - Tracks which claims need citations

---

*Last updated: 2026-01-24*
*Issue: #74 Research Acquisition*
