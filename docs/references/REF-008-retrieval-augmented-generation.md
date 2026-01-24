# REF-008: Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks

## Citation

Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W., Rocktäschel, T., Riedel, S., & Kiela, D. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. *Advances in Neural Information Processing Systems*, 33, 9459-9474.

**arXiv**: https://arxiv.org/abs/2005.11401
**NeurIPS**: https://proceedings.neurips.cc/paper/2020/file/6b493230205f780e1bc26945df7481e5-Paper.pdf
**PDF**: `docs/references/pdfs/REF-008-lewis-2020-rag.pdf`

## Document Profile

| Attribute | Value |
|-----------|-------|
| Pages | 16 (19 with appendices) |
| Year | 2020 |
| Venue | NeurIPS 2020 |
| Type | Empirical |
| Authors | Facebook AI Research, UCL, NYU |
| AIWG Relevance | **Critical** - Foundational architecture for external memory and context grounding |

## Executive Summary

This seminal paper introduces Retrieval-Augmented Generation (RAG), a hybrid architecture that combines pre-trained parametric memory (seq2seq language models) with non-parametric memory (dense retrieval from external knowledge bases). RAG addresses three fundamental limitations of pure parametric models: inability to expand knowledge without retraining, lack of provenance for predictions, and tendency to hallucinate facts.

The key innovation is treating document retrieval as a differentiable latent variable, allowing end-to-end training via gradient descent. The system uses Dense Passage Retrieval (DPR) to fetch relevant documents from Wikipedia, then conditions a BART generator on both the input and retrieved context to produce outputs. Two variants are proposed: RAG-Sequence (same documents for entire output) and RAG-Token (different documents per token).

RAG achieves state-of-the-art results on open-domain QA tasks (Natural Questions, TriviaQA, WebQuestions, CuratedTrec) and demonstrates superior factuality, specificity, and diversity compared to parametric-only baselines. Critically, the knowledge base can be updated by simply replacing the document index without retraining the model.

## Key Findings

### 1. State-of-the-Art Open-Domain QA Performance

RAG models achieved new state-of-the-art results on all four tested open-domain QA benchmarks:
- **Natural Questions**: 44.5 EM (vs 41.5 DPR, 36.6 T5-11B+SSM)
- **TriviaQA**: 56.8 EM (vs 57.9 DPR standard test)
- **WebQuestions**: 45.2 EM (vs 41.1 DPR, 44.7 T5-11B+SSM)
- **CuratedTrec**: 52.2 EM (vs 50.6 DPR)

These results were achieved without specialized pre-training objectives like "salient span masking" used by REALM and T5+SSM (p. 5).

### 2. Superior Generation Quality

Human evaluation on Jeopardy question generation (452 pairs) showed RAG was:
- **More factual** in 42.7% of cases (vs BART 7.1%)
- **More specific** in 37.4% of cases (vs BART 16.8%)
- Both factual in 17% of cases
- Both poor in only 6.9% of cases (p. 6)

Automatic metrics on MS-MARCO showed RAG-Sequence outperformed BART by 2.6 BLEU points and 2.6 Rouge-L points (p. 6).

### 3. Generation Over Extraction

RAG demonstrated that generative approaches can outperform extractive methods even on tasks traditionally solved by extraction. The model achieved 11.8% accuracy on Natural Questions even when the correct answer wasn't in any retrieved document (p. 6), showing effective marginalization over documents and use of parametric knowledge.

### 4. Updatable Knowledge Without Retraining

Index hot-swapping experiments with world leaders demonstrated dynamic knowledge updates:
- 70% accuracy with 2016 index on 2016 leaders
- 68% accuracy with 2018 index on 2018 leaders
- Only 12% accuracy with mismatched 2018 index on 2016 leaders
- Only 4% accuracy with mismatched 2016 index on 2018 leaders (p. 8)

This proves the knowledge base can be updated by simply replacing the document index without any model retraining.

### 5. Efficient Parameterization

RAG-Sequence with 626M trainable parameters (110M query encoder + 406M BART generator, document encoder frozen) substantially outperformed T5-large (770M parameters, 28.9 EM on NQ) and approached T5-11B (11B parameters, 36.6 EM on NQ) on open-domain QA (p. 19, Appendix G).

## Architecture/Method

### Core Components

**1. Retriever: Dense Passage Retrieval (DPR)**
- Bi-encoder architecture with separate query and document encoders
- Both encoders based on BERT_BASE (110M parameters each)
- Similarity function: cosine similarity between dense representations
- Content-based addressing via Maximum Inner Product Search (MIPS)

Mathematical formulation (p. 3):
```
p_η(z|x) ∝ exp(d(z)^T q(x))
d(z) = BERT_d(z)
q(x) = BERT_q(x)
```

**2. Generator: BART-large**
- Pre-trained seq2seq transformer with 400M parameters
- Denoising pre-training objective
- Input formed by concatenating query x with retrieved document z
- Autoregressive generation: p_θ(y_i|x, z, y_{1:i-1})

**3. Document Index**
- December 2018 Wikipedia dump
- 21M documents (100-word chunks)
- 15.3B values (21M × 728-dimensional vectors)
- FAISS index with Hierarchical Navigable Small World approximation
- Can be compressed to 36GB CPU memory (down from ~100GB)

### Two RAG Formulations

**RAG-Sequence** (p. 3):
- Uses same retrieved documents for entire output sequence
- Treats documents as single latent variable marginalized at sequence level
- Better for coherent long-form generation
```
p_RAG-Sequence(y|x) ≈ Σ_{z∈top-k} p_η(z|x) Π_i p_θ(y_i|x,z,y_{1:i-1})
```

**RAG-Token** (p. 3):
- Can use different documents for each output token
- Marginalizes per token, allowing fine-grained evidence combination
- Better for factual short answers
```
p_RAG-Token(y|x) ≈ Π_i Σ_{z∈top-k} p_η(z|x) p_θ(y_i|x,z,y_{1:i-1})
```

### Training Procedure

- End-to-end training via gradient descent (Adam optimizer, RMSProp momentum 0.9)
- Document encoder (BERT_d) kept frozen to avoid expensive index updates
- Only query encoder (BERT_q) and BART generator are fine-tuned
- Loss: negative marginal log-likelihood Σ_j -log p(y_j|x_j)
- Top-k approximation for marginalization (k ∈ {5, 10} for training)
- Gradient clipping to range (-10, 10) element-wise (p. 22)

### Decoding Strategies

**RAG-Token Decoding**:
- Standard beam search with modified transition probability
- p'_θ(y_i|x,y_{1:i-1}) = Σ_z p_η(z|x)p_θ(y_i|x,z,y_{1:i-1})

**RAG-Sequence Decoding**:
- **Thorough Decoding**: Run beam search per document, collect hypothesis set Y, run additional forward passes for missing hypotheses, marginalize
- **Fast Decoding**: Approximate p_θ(y|x,z_i) ≈ 0 for hypotheses not in beam, avoiding additional forward passes (p. 4)

## Benchmark/Experimental Results

### Open-Domain Question Answering

| Model | NQ | TQA | WQ | CT |
|-------|-----|-----|-----|-----|
| **Closed-Book** | | | | |
| T5-11B | 34.5 | -/50.1 | 37.4 | - |
| T5-11B+SSM | 36.6 | -/60.5 | 44.7 | - |
| **Open-Book** | | | | |
| REALM | 40.4 | -/- | 40.7 | 46.8 |
| DPR | 41.5 | 57.9/- | 41.1 | 50.6 |
| **RAG-Token** | **44.1** | 55.2/66.1 | **45.5** | 50.0 |
| **RAG-Sequence** | **44.5** | **56.8/68.0** | 45.2 | **52.2** |

### Abstractive Question Answering (MS-MARCO)

| Model | BLEU-1 | Rouge-L |
|-------|--------|---------|
| State-of-Art* | 49.9 | 49.8 |
| BART | 41.6 | 38.2 |
| RAG-Token | 41.5 | 40.1 |
| **RAG-Sequence** | **44.2** | **40.8** |

*Uses gold passages

### Jeopardy Question Generation

| Model | BLEU-1 | Q-BLEU-1 | Factuality | Specificity |
|-------|--------|----------|------------|-------------|
| BART | 15.1 | 19.7 | 7.1% better | 16.8% better |
| **RAG-Token** | **17.3** | **22.2** | **42.7% better** | **37.4% better** |
| RAG-Sequence | 14.7 | 21.4 | - | - |

### FEVER Fact Verification

| Model | 3-way Accuracy | 2-way Accuracy |
|-------|----------------|----------------|
| SotA* | 76.8 | 92.2 |
| BART | 64.0 | 81.1 |
| **RAG-Token** | **72.5** | **89.5** |

*Uses gold evidence supervision

### Generation Diversity (Distinct Trigram Ratio)

| Model | MS-MARCO | Jeopardy |
|-------|----------|----------|
| Gold | 89.6% | 90.0% |
| BART | 70.7% | 32.4% |
| RAG-Token | 77.8% | 46.8% |
| **RAG-Sequence** | **83.5%** | **53.8%** |

## Key Quotes for Citation

> "Large pre-trained language models have been shown to store factual knowledge in their parameters, and achieve state-of-the-art results when fine-tuned on downstream NLP tasks. However, their ability to access and precisely manipulate knowledge is still limited, and hence on knowledge-intensive tasks, their performance lags behind task-specific architectures." (p. 1)

> "We explore a general-purpose fine-tuning recipe for retrieval-augmented generation (RAG)—models which combine pre-trained parametric and non-parametric memory for language generation." (p. 1)

> "Hybrid models that combine parametric memory with non-parametric (i.e., retrieval-based) memories can address some of these issues because knowledge can be directly revised and expanded, and accessed knowledge can be inspected and interpreted." (p. 1)

> "For language generation tasks, we find that RAG models generate more specific, diverse and factual language than a state-of-the-art parametric-only seq2seq baseline." (p. 1)

> "RAG can be seen as a general fine-tuning recipe for knowledge-intensive tasks." (p. 2)

> "Documents with clues about the answer but do not contain the answer verbatim can still contribute towards a correct answer being generated, which is not possible with standard extractive approaches, leading to more effective marginalization over documents." (p. 5-6)

> "We can update RAG's world knowledge by simply replacing its non-parametric memory." (p. 8)

## AIWG Implementation Mapping

| RAG Component | AIWG Implementation | Function |
|---------------|---------------------|----------|
| **Non-Parametric Memory** | `.aiwg/` artifact directory | External knowledge store |
| **Dense Retriever** | @-mention system + path-scoped rules | Document addressing mechanism |
| **Retrieved Context** | Loaded requirements, architecture, templates | Grounding material |
| **Generator** | LLM (Claude, GPT-4) | Content generation |
| **Content Addressing** | @-mentions (`@.aiwg/requirements/UC-001.md`) | Semantic lookup |
| **Location Addressing** | File paths, directory structure | Hierarchical organization |
| **Marginalization** | Multi-document context injection | Evidence aggregation |
| **Index Hot-Swapping** | Edit `.aiwg/` files directly | Knowledge updates without redeployment |

### AIWG as RAG for Development

AIWG implements RAG principles at the project management level:

**Memory Architecture**:
```
.aiwg/                          # Non-parametric memory (21M docs → project artifacts)
├── requirements/               # Domain knowledge (use cases, stories, NFRs)
├── architecture/              # Structural knowledge (SAD, ADRs)
├── testing/                   # Quality knowledge (test plans, strategies)
├── security/                  # Security knowledge (threat models)
└── deployment/                # Operational knowledge (runbooks, plans)
```

**Retrieval Mechanisms**:
1. **Explicit (@-mentions)**: `@.aiwg/requirements/UC-AUTH-001.md` → content-based retrieval
2. **Implicit (path-scoped rules)**: Working in `src/**` → automatic context loading
3. **Semantic (agent context)**: Test Engineer agent → testing knowledge retrieval
4. **Template retrieval**: Load and populate with project context

**Benefits Mirror RAG Findings**:
- **Factuality**: Grounded in actual project artifacts, not hallucinated requirements
- **Specificity**: Real use cases, concrete architecture decisions, exact test criteria
- **Updatability**: Change `.aiwg/` files without redeploying agents
- **Diversity**: Multiple perspectives from different artifacts (requirements + architecture + tests)
- **Provenance**: Bidirectional @-mention linking shows evidence trail

### Comparison: RAG vs AIWG Memory

| Aspect | Traditional RAG | AIWG Memory |
|--------|-----------------|-------------|
| **Index** | Vector database (FAISS) | File system + git |
| **Retrieval** | Semantic similarity (cosine) | Explicit reference (@) + rules |
| **Documents** | Wikipedia chunks (100 words) | SDLC artifacts (variable length) |
| **Update** | Re-index documents | Edit files, commit changes |
| **Scope** | Global knowledge (all of Wikipedia) | Project-specific (this codebase) |
| **Traceability** | Opaque (embedding space) | Explicit (bidirectional links) |
| **Query** | Dense embeddings | File paths, semantic tags |
| **Marginalization** | Probabilistic (top-k) | Contextual (multi-file injection) |

### Implementation Pattern

AIWG's context loading follows RAG's marginalization:

```typescript
// 1. Retrieval (identify relevant documents)
const context = [
  loadFile('.aiwg/requirements/use-cases/UC-AUTH-001.md'),
  loadFile('.aiwg/architecture/software-architecture-doc.md#auth'),
  loadFile('.aiwg/security/threat-models/authentication.md'),
  loadTemplate('templates/analysis-design/test-plan-template.md')
];

// 2. Generation (augment prompt with retrieved context)
const prompt = `
Given these project artifacts:
${context.join('\n---\n')}

Generate a comprehensive test plan for the authentication module,
ensuring coverage of security requirements and architectural constraints.
`;

// 3. Output with provenance
const testPlan = await llm.generate(prompt);
// Includes @-mentions back to source artifacts
```

## Cross-References

| Paper | Relationship |
|-------|-------------|
| **REF-009** (Neural Turing Machines) | Foundational work on external memory for neural networks |
| **REF-005** (Miller, Magical Number 7±2) | Cognitive limits that external memory (RAG) helps overcome |
| **REF-006** (Baddeley, Working Memory) | Psychological model of working memory that RAG mimics |
| Graves (2020) - Attention mechanisms | Attention used in both retrieval and generation |
| DPR (Karpukhin et al., 2020) | Dense retrieval component of RAG |
| REALM (Guu et al., 2020) | Prior work on retrieval-augmented pre-training |
| BART (Lewis et al., 2019) | Generator component of RAG |

## Quick Reference Locations

| Topic | Location |
|-------|----------|
| **RAG Architecture Overview** | Figure 1, p. 2 |
| **RAG-Sequence Formula** | Equation (1), p. 3 |
| **RAG-Token Formula** | Equation (2), p. 3 |
| **DPR Retriever Definition** | Section 2.2, p. 3 |
| **BART Generator** | Section 2.3, p. 3 |
| **Training Procedure** | Section 2.4, p. 3-4 |
| **Decoding Strategies** | Section 2.5, p. 4 |
| **Open-Domain QA Results** | Table 1, Section 4.1, p. 5-6 |
| **Generation Quality Results** | Table 2, Section 4.2-4.4, p. 6 |
| **Human Evaluation Results** | Table 4, p. 8 |
| **Index Hot-Swapping** | Section 4.5, p. 7-8 |
| **Ablation Studies** | Table 6, p. 8 |
| **Experimental Details** | Section 4.6, Tables 1-3, p. 21-23 |
| **Memory Requirements** | Appendix G, p. 18-19 |

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Comprehensive update from full paper review - added complete architecture details, all benchmark results, implementation mapping to AIWG, key quotes with page numbers, and cross-references |
| 2026-01-24 | Initial Entry (#74) | Basic reference entry |

## Notes

**Implementation Status**: RAG is now the dominant pattern for production AI systems:
- **ChatGPT Plugins** (2023): External tool and knowledge retrieval
- **Claude Projects** (2024): Project-specific knowledge injection
- **Enterprise AI** (2024): Document Q&A universally uses RAG
- **GitHub Copilot** (2024): Codebase-aware suggestions via retrieval

**AIWG Extensions**:
1. **Bidirectional traceability**: @-mentions create explicit forward and backward links
2. **Multi-agent coordination**: Multiple agents retrieve from shared `.aiwg/` memory
3. **Hierarchical memory**: Organized by SDLC phase rather than flat document store
4. **SDLC-aware retrieval**: Context rules based on file location and task type
5. **Human-readable memory**: Markdown artifacts vs opaque embeddings
6. **Version control**: Git integration for memory evolution tracking

**Critical Insight**: RAG solves the fundamental tension between parametric models (fast, general but frozen) and non-parametric models (updatable, interpretable but slow). AIWG applies this same principle to software development by combining general-purpose LLMs with project-specific artifact stores.
