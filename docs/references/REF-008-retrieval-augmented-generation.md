# REF-008: Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks

## Citation

Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W., Rocktäschel, T., Riedel, S., & Kiela, D. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. *Advances in Neural Information Processing Systems*, 33, 9459-9474.

**arXiv**: [https://arxiv.org/abs/2005.11401](https://arxiv.org/abs/2005.11401)

**Link**: [NeurIPS Proceedings](https://proceedings.neurips.cc/paper/2020/file/6b493230205f780e1bc26945df7481e5-Paper.pdf)

## Summary

Seminal paper introducing Retrieval-Augmented Generation (RAG), combining pre-trained parametric memory (language models) with non-parametric memory (retrieval from external knowledge bases). RAG models retrieve relevant documents and use them to generate more factual, specific, and diverse outputs than pure parametric models.

### Key Concepts

| Concept | Definition |
|---------|------------|
| **Parametric Memory** | Knowledge encoded in model weights (seq2seq transformer) |
| **Non-Parametric Memory** | External knowledge base (Wikipedia, documents) |
| **Dense Retrieval** | Neural retrieval using dense vector embeddings |
| **Marginalization** | Combining evidence from multiple retrieved documents |

### Architecture

```
Query → Dense Retriever (DPR) → Top-k Documents
                                      ↓
                            Retrieved Context
                                      ↓
Query + Context → Generator (BART) → Output
```

### Two RAG Variants

| Variant | Retrieval Strategy | Use Case |
|---------|-------------------|----------|
| **RAG-Sequence** | Same documents for entire output | Coherent long-form generation |
| **RAG-Token** | Different documents per token | Fine-grained factual answers |

### Key Findings

1. **State-of-the-Art QA**: RAG outperformed all prior models on open-domain QA benchmarks
2. **Factuality**: Generated responses more factual than pure parametric models
3. **Specificity**: Outputs more specific and detailed with retrieved context
4. **Diversity**: More diverse generation due to varied retrieved evidence
5. **Updatable Knowledge**: Knowledge can be updated without retraining by updating the index

## AIWG Application

### Direct Parallel: Structured Semantic Memory

AIWG's `.aiwg/` directory implements **RAG at the project level**:

| RAG Component | AIWG Equivalent |
|---------------|-----------------|
| Non-Parametric Memory | `.aiwg/` artifacts (requirements, architecture, tests) |
| Dense Retriever | @-mention system + path-scoped rules |
| Retrieved Context | Loaded documentation + templates |
| Generator | LLM with augmented context |

### The `.aiwg/` Directory as Knowledge Base

```
.aiwg/                          # Non-parametric memory
├── requirements/               # Domain knowledge
│   ├── use-cases/             # Detailed requirements
│   └── nfr-modules/           # Constraints
├── architecture/              # Structural knowledge
│   ├── software-architecture-doc.md
│   └── adrs/                  # Decision records
├── testing/                   # Quality knowledge
└── security/                  # Security knowledge
```

### Retrieval Mechanisms in AIWG

1. **@-Mentions**: Explicit retrieval via `@.aiwg/requirements/UC-001.md`
2. **Path-Scoped Rules**: Automatic context loading based on file location
3. **Agent Context**: Each agent receives relevant domain documentation
4. **Template Loading**: Templates retrieved and populated with project context

### Why External Memory Matters

Lewis et al.'s findings explain AIWG's memory architecture benefits:

| Finding | AIWG Benefit |
|---------|--------------|
| Factuality improves | Grounding in actual project artifacts |
| Specificity increases | Real requirements, not hallucinated |
| Knowledge updatable | Change `.aiwg/` docs without redeploying |
| Diversity enabled | Multiple perspectives from different artifacts |

### Comparison: RAG vs AIWG Memory

| Aspect | Traditional RAG | AIWG Memory |
|--------|-----------------|-------------|
| Index | Vector database | File system + @-mentions |
| Retrieval | Semantic similarity | Explicit reference + rules |
| Update | Re-index documents | Edit files directly |
| Scope | Global knowledge | Project-specific artifacts |
| Traceability | Opaque | Bidirectional linking |

### Implementation Pattern

AIWG's context loading follows RAG principles:

```typescript
// 1. Identify relevant documents (retrieval)
const context = [
  loadFile('.aiwg/requirements/use-cases/UC-AUTH-001.md'),
  loadFile('.aiwg/architecture/software-architecture-doc.md'),
  loadTemplate('templates/analysis-design/test-plan-template.md')
];

// 2. Augment generation with retrieved context
const prompt = `
Given these project artifacts:
${context.join('\n---\n')}

Generate a test plan for the authentication module.
`;
```

## Key Quotes

> "RAG models combine pre-trained parametric and non-parametric memory for language generation."

> "For language generation tasks, we find that RAG models generate more specific, diverse and factual language than a state-of-the-art parametric-only seq2seq baseline."

> "RAG can be seen as a general fine-tuning recipe for knowledge-intensive tasks."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Memory Architecture | **Critical** - foundational pattern for .aiwg/ |
| Context Management | **Critical** - retrieval strategy |
| Artifact System | **High** - non-parametric knowledge store |
| Traceability | **High** - linking generation to sources |

## Cross-References

- **.aiwg/ Directory**: Project memory implementation
- **@-Mention System**: `.claude/rules/mention-wiring.md`
- **Path-Scoped Rules**: `.claude/rules/` auto-loading
- **REF-005, REF-006**: Cognitive limits that RAG helps manage

## Modern Context

RAG has become the dominant pattern for knowledge-grounded AI:
- **ChatGPT Plugins**: External tool and knowledge access
- **Claude Artifacts**: Structured output with source grounding
- **Enterprise AI**: Document Q&A systems universally use RAG
- **Agentic Systems**: Memory persistence between sessions

AIWG extends RAG with:
- Bidirectional traceability
- Multi-agent retrieval coordination
- Hierarchical project memory structure
- SDLC-aware context loading

## Related Work

- Graves, A., Wayne, G., & Danihelka, I. (2014). Neural Turing Machines (REF-009)
- Borgeaud, S., et al. (2022). Improving language models by retrieving from trillions of tokens
- Gao, L., et al. (2023). Retrieval-Augmented Generation for Large Language Models: A Survey

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
