# AIWG Terminology Glossary

This glossary maps AIWG's informal terminology to professional/academic equivalents with research citations.

## Terminology Mapping

| Informal Term | Professional Term | Citation | Definition |
|---------------|-------------------|----------|------------|
| **Context stacks** | Structured Semantic Memory | Lewis et al. (2020), Graves et al. (2014) | Persistent knowledge store that augments LLM reasoning with project-specific artifacts |
| **Extended memory** | Retrieval-Augmented Generation (RAG) | Lewis et al. (2020) | External knowledge base accessed during generation to improve factuality and specificity |
| **.aiwg/ directory** | Non-Parametric Knowledge Store | Lewis et al. (2020) | Project memory persisted in filesystem, independent of model weights |
| **Multi-agent review** | Ensemble Validation | Jacobs et al. (1991) | Multiple specialized models evaluate and synthesize to reduce individual errors |
| **Primary→Reviewers→Synthesizer** | Mixture of Experts (MoE) | Jacobs et al. (1991), Hong et al. (2024) | Gated routing of inputs to specialized experts with aggregated outputs |
| **Ralph loop** | Closed-Loop Self-Correction | Madaan et al. (2023), Roig (2025) | Iterative refinement with external verification until completion criteria met |
| **Recovery-first design** | Fault-Tolerant Agentic Systems | Roig (2025) | Architecture prioritizing recovery capability over initial correctness |
| **7±2 decomposition** | Cognitive Load Optimization | Miller (1956), Sweller (1988) | Task chunking within working memory limits to maintain coherence |
| **Phase gates** | Stage-Gate Process | Cooper (1990) | Quality checkpoints with explicit exit criteria between development phases |
| **Milestones (LOM, ABM, IOC, PR)** | Phase Gate Deliverables | Cooper (1990), Kruchten (2004) | Named checkpoints: Lifecycle Objective, Architecture Baseline, Initial Operational Capability, Product Release |
| **@-mentions** | Traceability Links | Gotel & Finkelstein (1994) | Bidirectional references connecting requirements to implementation and tests |
| **Capability dispatch** | Semantic Service Discovery | SOA literature | Routing tasks to agents based on declared capabilities, not hard-coded mappings |
| **Voice profiles** | Controllable Text Generation | Style transfer literature | Continuous parameters governing tone, formality, and audience adaptation |
| **Templates** | Worked Examples | Sweller (1988) | Structured scaffolds reducing cognitive load by providing format and organization |
| **Flow commands** | Standardized Operating Procedures (SOPs) | Hong et al. (2024) | Encoded workflow best practices guiding multi-agent orchestration |
| **Agent specialization** | Domain Expert Networks | Jacobs et al. (1991), Qian et al. (2024) | Bounded expertise per agent enabling focused, high-quality outputs |
| **Dual-track iteration** | Agile Discovery/Delivery | RUP, SAFe | Parallel research and implementation streams with synchronized handoffs |
| **Doc-code validation** | Dual-Representation Consistency | Formal verification | Cross-checking documentation against implementation for divergence detection |
| **Context pollution** | Distractor-Induced Interference | Roig (2025) | Irrelevant context degrading reasoning quality (Archetype 3) |
| **Grounding checkpoint** | Source-of-Truth Verification | Roig (2025) | Validating assumptions against actual data before acting (Archetype 1 mitigation) |
| **Structured reasoning** | Chain-of-Thought (CoT) | Wei et al. (2022) | Step-by-step intermediate reasoning traces improving complex task performance |
| **Multi-path validation** | Self-Consistency Decoding | Wang et al. (2023) | Sampling diverse reasoning paths and selecting most consistent answer |
| **Deliberate planning** | Tree of Thoughts (ToT) | Yao et al. (2023) | Branching exploration with lookahead and backtracking |
| **Tool-augmented reasoning** | ReAct Pattern | Yao et al. (2023) | Interleaved reasoning traces with external tool actions |
| **Search-based planning** | Language Agent Tree Search | Zhou et al. (2024) | MCTS adapted for agent task execution |
| **Verbal learning** | Reflexion | Shinn et al. (2023) | Learning from episodic memory of self-reflections |
| **Principle-based review** | Constitutional AI | Bai et al. (2022) | Self-critique against explicit principles/rules |
| **LLM orchestration** | Task Controller Pattern | Shen et al. (2023) | LLM as meta-coordinator for specialized models |
| **Conversation coordination** | Multi-Agent Conversation | Wu et al. (2023) | Natural language as agent coordination protocol |
| **Few-shot examples** | In-Context Learning | Dong et al. (2024) | Learning from demonstrations in prompt without training |

## Category Index

### Memory & Retrieval

| Term | Professional | Citation |
|------|--------------|----------|
| Context stacks | Structured Semantic Memory | REF-008, REF-009 |
| Extended memory | RAG | REF-008 |
| .aiwg/ directory | Non-Parametric Store | REF-008 |

### Multi-Agent Systems

| Term | Professional | Citation |
|------|--------------|----------|
| Multi-agent review | Ensemble Validation | REF-007 |
| Primary→Reviewers→Synthesizer | Mixture of Experts | REF-007, REF-013 |
| Agent specialization | Domain Expert Networks | REF-007, REF-012 |
| Capability dispatch | Semantic Service Discovery | SOA |

### Iteration & Recovery

| Term | Professional | Citation |
|------|--------------|----------|
| Ralph loop | Closed-Loop Self-Correction | REF-015, REF-002 |
| Recovery-first design | Fault-Tolerant Systems | REF-002 |

### Cognitive Load

| Term | Professional | Citation |
|------|--------------|----------|
| 7±2 decomposition | Cognitive Load Optimization | REF-005, REF-006 |
| Templates | Worked Examples | REF-006 |

### Process Management

| Term | Professional | Citation |
|------|--------------|----------|
| Phase gates | Stage-Gate Process | REF-010 |
| Flow commands | Standardized Operating Procedures | REF-013 |
| @-mentions | Traceability Links | REF-011 |

### Failure Modes

| Term | Professional | Citation |
|------|--------------|----------|
| Context pollution | Distractor-Induced Interference | REF-002 |
| Grounding checkpoint | Source-of-Truth Verification | REF-002 |

## Usage Guidelines

### In Practitioner Docs

Use dual inline format:
> AIWG implements **structured semantic memory** (context stacks) to maintain project knowledge across sessions.

### In Research Docs

Use full citations:
> AIWG's memory architecture draws on Retrieval-Augmented Generation (Lewis et al., 2020), extending the pattern with bidirectional traceability links (Gotel & Finkelstein, 1994).

### In README

Use professional terms only (no inline citations):
> AIWG provides structured semantic memory, ensemble validation, and closed-loop self-correction.

## References

- REF-002: Roig (2025) - LLM Failure Modes
- REF-005: Miller (1956) - Magical Number Seven
- REF-006: Sweller (1988) - Cognitive Load Theory
- REF-007: Jacobs et al. (1991) - Mixture of Experts
- REF-008: Lewis et al. (2020) - RAG
- REF-009: Graves et al. (2014) - Neural Turing Machines
- REF-010: Cooper (1990) - Stage-Gate Systems
- REF-011: Gotel & Finkelstein (1994) - Traceability
- REF-012: Qian et al. (2024) - ChatDev
- REF-013: Hong et al. (2024) - MetaGPT
- REF-015: Madaan et al. (2023) - Self-Refine

---

*Last updated: 2026-01-24*
*Issue: #68 Terminology Mapping, #74 Research Acquisition*
