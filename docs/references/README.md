# Research References

> **Full Research Corpus**: [roctinam/research-papers](https://git.integrolabs.net/roctinam/research-papers)
>
> This directory contains AIWG-specific reference summaries. The comprehensive paper documentation, PDFs, and supporting indices are maintained in the shared research-papers repository.

## Purpose

- Document research that validates or extends AIWG concepts
- Track academic foundations for multi-agent orchestration patterns
- Identify opportunities for iterative self-improvement based on published research
- Provide citations for AIWG's theoretical underpinnings

## Reference Summary

| Category | Count | Key Papers |
|----------|-------|------------|
| Foundational (pre-2020) | 6 | Miller, Sweller, Jacobs, Cooper, Gotel, Graves |
| Multi-Agent Systems | 6 | ChatDev, MetaGPT, AutoGen, HuggingGPT, MAGIS, MoE |
| Reasoning & Prompting | 4 | CoT, Self-Consistency, ICL Survey, ToT |
| Tool Use & Acting | 3 | ReAct, Toolformer, SWE-bench |
| Iteration & Recovery | 4 | Self-Refine, Reflexion, LATS, Constitutional AI |
| Failure & Production | 2 | Roig, Bandara |
| Research Management | 7 | FAIR, OAIS, PROV, GRADE, R-LAM, LitLLM, Agent Lab |
| **Total** | **33** | |

## References by Category

### Tier 1: Foundational Research (Classic)

| ID | Title | Authors | Year | AIWG Relevance |
|----|-------|---------|------|----------------|
| REF-005 | [The Magical Number Seven](REF-005-millers-law-cognitive-limits.md) | Miller | 1956 | Task decomposition, 7±2 rule |
| REF-006 | [Cognitive Load Theory](REF-006-cognitive-load-theory.md) | Sweller | 1988 | Template design, worked examples |
| REF-007 | [Adaptive Mixtures of Local Experts](REF-007-mixture-of-experts.md) | Jacobs et al. | 1991 | Multi-agent architecture foundation |
| REF-009 | [Neural Turing Machines](REF-009-neural-turing-machines.md) | Graves et al. | 2014 | External memory patterns |
| REF-010 | [Stage-Gate Systems](REF-010-stage-gate-systems.md) | Cooper | 1990 | Phase gates, milestones |
| REF-011 | [Requirements Traceability](REF-011-requirements-traceability.md) | Gotel & Finkelstein | 1994 | @-mentions, bidirectional links |

### Tier 1: Modern Multi-Agent Frameworks (2020+)

| ID | Title | Authors | Year | AIWG Relevance |
|----|-------|---------|------|----------------|
| REF-008 | [Retrieval-Augmented Generation](REF-008-retrieval-augmented-generation.md) | Lewis et al. | 2020 | .aiwg/ memory, context stacks |
| REF-012 | [ChatDev: Communicative Agents](REF-012-chatdev-multi-agent-software.md) | Qian et al. | 2024 | Role-based communication |
| REF-013 | [MetaGPT: Multi-Agent Framework](REF-013-metagpt-multi-agent-framework.md) | Hong et al. | 2024 | SOPs, assembly line paradigm |
| REF-022 | [AutoGen: Multi-Agent Conversation](REF-022-autogen-multi-agent-conversation.md) | Wu et al. | 2023 | Conversation coordination |
| REF-023 | [HuggingGPT/JARVIS](REF-023-hugginggpt-task-planning.md) | Shen et al. | 2023 | LLM as orchestrator |
| REF-004 | [MAGIS: Multi-Agent GitHub Issues](https://arxiv.org/abs/2403.17927) | Tao et al. | 2024 | Issue-to-code implementation |

### Tier 2: Reasoning & Prompting

| ID | Title | Authors | Year | AIWG Relevance |
|----|-------|---------|------|----------------|
| REF-016 | [Chain-of-Thought Prompting](REF-016-chain-of-thought-prompting.md) | Wei et al. | 2022 | Structured reasoning |
| REF-017 | [Self-Consistency](REF-017-self-consistency-reasoning.md) | Wang et al. | 2023 | Multi-path validation |
| REF-020 | [Tree of Thoughts](REF-020-tree-of-thoughts-planning.md) | Yao et al. | 2023 | Deliberate planning |
| REF-026 | [In-Context Learning Survey](REF-026-in-context-learning-survey.md) | Dong et al. | 2024 | Template/example design |

### Tier 2: Tool Use & Acting

| ID | Title | Authors | Year | AIWG Relevance |
|----|-------|---------|------|----------------|
| REF-018 | [ReAct: Reasoning + Acting](REF-018-react-reasoning-acting.md) | Yao et al. | 2023 | Agent tool use patterns |
| REF-019 | [Toolformer](REF-019-toolformer-self-taught-tools.md) | Schick et al. | 2023 | Self-taught tool use |
| REF-014 | [SWE-bench Evaluation](REF-014-swe-bench-evaluation.md) | Jimenez et al. | 2024 | Real-world coding benchmark |

### Tier 2: Iteration & Recovery

| ID | Title | Authors | Year | AIWG Relevance |
|----|-------|---------|------|----------------|
| REF-015 | [Self-Refine](REF-015-self-refine-iterative-refinement.md) | Madaan et al. | 2023 | Ralph loop foundation |
| REF-021 | [Reflexion](REF-021-reflexion-verbal-reinforcement.md) | Shinn et al. | 2023 | Verbal reinforcement learning |
| REF-024 | [LATS: Language Agent Tree Search](REF-024-lats-language-agent-tree-search.md) | Zhou et al. | 2024 | MCTS for agent planning |
| REF-025 | [Constitutional AI](REF-025-constitutional-ai-harmlessness.md) | Bai et al. | 2022 | Principle-based review |

### Tier 2: Failure Modes & Production

| ID | Title | Authors | Year | AIWG Relevance |
|----|-------|---------|------|----------------|
| REF-001 | [Production-Grade Agentic Workflows](REF-001-production-agentic-workflows.md) | Bandara et al. | 2024 | Production reliability |
| REF-002 | [LLM Failure Modes in Agentic Scenarios](REF-002-llm-failure-modes-agentic.md) | Roig | 2025 | Failure archetypes, recovery |

### Tier 2: Research Management & Reproducibility

| ID | Title | Authors | Year | AIWG Relevance |
|----|-------|---------|------|----------------|
| REF-056 | [FAIR Guiding Principles](REF-056-fair-guiding-principles.md) | Wilkinson et al. | 2016 | Findable, Accessible, Interoperable, Reusable data |
| REF-057 | [Agent Laboratory](REF-057-agent-laboratory.md) | Schmidgall et al. | 2025 | Multi-agent research automation |
| REF-058 | [R-LAM Reproducibility](REF-058-rlam-reproducibility.md) | Sureshkumar et al. | 2026 | Workflow reproducibility, provenance |
| REF-059 | [LitLLM Literature Review](REF-059-litllm-literature-review.md) | ServiceNow | 2025 | RAG-based citation, anti-hallucination |
| REF-060 | [GRADE Evidence Quality](REF-060-grade-evidence-quality.md) | GRADE Working Group | 2004-2025 | Evidence quality assessment framework |
| REF-061 | [OAIS Reference Model](REF-061-oais-reference-model.md) | CCSDS/ISO | 2002-2024 | Digital preservation, SIP/AIP/DIP lifecycle |
| REF-062 | [W3C PROV](REF-062-w3c-prov.md) | W3C | 2013 | Provenance tracking, Entity-Activity-Agent |

## Category Index

### Memory & Retrieval
- REF-008: Lewis et al. (2020) - RAG
- REF-009: Graves et al. (2014) - Neural Turing Machines

### Multi-Agent Systems
- REF-007: Jacobs et al. (1991) - Mixture of Experts
- REF-012: Qian et al. (2024) - ChatDev
- REF-013: Hong et al. (2024) - MetaGPT
- REF-022: Wu et al. (2023) - AutoGen
- REF-023: Shen et al. (2023) - HuggingGPT
- REF-004: Tao et al. (2024) - MAGIS

### Cognitive Science
- REF-005: Miller (1956) - Magical Number Seven
- REF-006: Sweller (1988) - Cognitive Load Theory

### Reasoning & Prompting
- REF-016: Wei et al. (2022) - Chain-of-Thought
- REF-017: Wang et al. (2023) - Self-Consistency
- REF-020: Yao et al. (2023) - Tree of Thoughts
- REF-026: Dong et al. (2024) - In-Context Learning

### Tool Use & Acting
- REF-018: Yao et al. (2023) - ReAct
- REF-019: Schick et al. (2023) - Toolformer

### Process Management
- REF-010: Cooper (1990) - Stage-Gate Systems
- REF-011: Gotel & Finkelstein (1994) - Requirements Traceability

### Iteration & Recovery
- REF-015: Madaan et al. (2023) - Self-Refine
- REF-021: Shinn et al. (2023) - Reflexion
- REF-024: Zhou et al. (2024) - LATS
- REF-025: Bai et al. (2022) - Constitutional AI
- REF-002: Roig (2025) - LLM Failure Modes

### Evaluation & Benchmarks
- REF-014: Jimenez et al. (2024) - SWE-bench

### Research Management & Reproducibility
- REF-056: Wilkinson et al. (2016) - FAIR Guiding Principles
- REF-057: Schmidgall et al. (2025) - Agent Laboratory
- REF-058: Sureshkumar et al. (2026) - R-LAM Reproducibility
- REF-059: ServiceNow (2025) - LitLLM Literature Review
- REF-060: GRADE Working Group (2004-2025) - Evidence Quality
- REF-061: CCSDS/ISO (2002-2024) - OAIS Reference Model
- REF-062: W3C (2013) - PROV Data Model

## Adding References

When adding a new reference:

1. Assign next sequential ID (REF-XXX)
2. Create detailed reference document following template
3. Update this README's reference table
4. Link relevant AIWG components that implement or could benefit from the research
5. Update `docs/research/glossary.md` if new terminology mappings apply

## Cross-References

**AIWG-Specific (this repo)**:
- **Claims Index**: `.aiwg/research/citable-claims-index.md` - Tracks which AIWG claims need citations
- **Gap Analysis**: `.aiwg/research/research-gap-analysis.md` - Identifies AIWG priority research areas
- **Terminology Glossary**: `docs/research/glossary.md` - Maps informal terms to professional equivalents

**Shared Research Corpus** ([research-papers](https://git.integrolabs.net/roctinam/research-papers)):
- **Full Paper Documentation**: `documentation/references/REF-XXX-*.md`
- **PDFs**: `pdfs/full/` and `pdfs/chunks/`
- **Master Index**: `INDEX.md` - Topic and relevance lookups

---

*Last updated: 2026-01-25*
*Issue: #74 Research Acquisition*
*Total references: 33*
