# REF-008 AIWG Analysis: Retrieval-Augmented Generation

> **Source Paper**: [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](../../../docs/references/REF-008-retrieval-augmented-generation.md)
> **Research Corpus**: [Full Documentation](https://git.integrolabs.net/roctinam/research-papers)
> **Authors**: Lewis, P., et al. (2020)
> **Venue**: NeurIPS 2020

## Implementation Mapping

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

## AIWG as RAG for Development

AIWG implements RAG principles at the project management level:

### Memory Architecture

```
.aiwg/                          # Non-parametric memory (21M docs → project artifacts)
├── requirements/               # Domain knowledge (use cases, stories, NFRs)
├── architecture/              # Structural knowledge (SAD, ADRs)
├── testing/                   # Quality knowledge (test plans, strategies)
├── security/                  # Security knowledge (threat models)
└── deployment/                # Operational knowledge (runbooks, plans)
```

**Parallel to RAG**: Just as RAG uses Wikipedia (21M documents) as external memory, AIWG uses `.aiwg/` artifacts as external memory.

**Location**: `.aiwg/` directory structure

### Retrieval Mechanisms

1. **Explicit (@-mentions)**: `@.aiwg/requirements/UC-AUTH-001.md` → content-based retrieval
2. **Implicit (path-scoped rules)**: Working in `src/**` → automatic context loading
3. **Semantic (agent context)**: Test Engineer agent → testing knowledge retrieval
4. **Template retrieval**: Load and populate with project context

**Location**:
- `.claude/rules/mention-wiring.md` - @-mention system
- `.aiwg/` - Artifact storage
- Path-scoped rules in agent definitions

### Implementation Pattern: RAG's Marginalization in AIWG

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

**Location**: MCP server implementation in `src/`, orchestrator logic

## Benefits Mirroring RAG Research Findings

### 1. Factuality

**RAG Result**: 42.7% more factual than BART baseline in human evaluation.

**AIWG Application**:
- Grounded in actual project artifacts, not hallucinated requirements
- @-mentions provide evidence trail back to source
- Templates enforce structure, reducing fabrication

**Evidence**: Test plans reference actual use cases, architectures cite real ADRs.

### 2. Specificity

**RAG Result**: 37.4% more specific than BART baseline.

**AIWG Application**:
- Real use case IDs (UC-AUTH-001, not "authentication use case")
- Exact architecture decisions (ADR-005, not "we chose microservices")
- Concrete test criteria from requirements

**Evidence**: Artifacts contain specific references, not generic descriptions.

### 3. Updatability

**RAG Result**: 70% accuracy with 2016 index on 2016 leaders; 68% with 2018 index on 2018 leaders. Knowledge updated by swapping index without retraining.

**AIWG Application**:
- Change `.aiwg/` files without redeploying agents
- Update requirements → architecture/tests automatically reference new content
- No "retraining" needed—just edit Markdown

**Evidence**: Edit `.aiwg/requirements/UC-001.md`, all downstream artifacts reference updated version on next generation.

**Location**: `.aiwg/` directory (git-tracked, versioned)

### 4. Diversity

**RAG Result**: 83.5% distinct trigram ratio vs 70.7% for BART (MS-MARCO).

**AIWG Application**:
- Multiple artifacts (requirements + architecture + security) provide varied perspectives
- Multi-agent reviews combine diverse viewpoints
- Template variation across artifact types

**Evidence**: Test plans for different features show high variation (not cookie-cutter).

### 5. Provenance

**RAG Result**: Retrieved documents provide evidence trail for outputs.

**AIWG Application**:
- @-mention wiring creates bidirectional traceability
- Every assertion traceable to source requirement or architectural decision
- Audit trail for compliance

**Evidence**: Code files include `@implements @.aiwg/requirements/UC-001.md` headers.

**Location**: `.claude/rules/mention-wiring.md` - Wiring rules

## Comparison: Traditional RAG vs AIWG Memory

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

**Key Difference**: AIWG trades semantic search flexibility for explicit traceability and human readability.

## RAG Architecture Components in AIWG

### 1. Dense Passage Retrieval (DPR) → @-Mention System

**RAG DPR**:
- Bi-encoder: separate query and document encoders
- Similarity: cosine(query_embedding, document_embedding)
- Top-k retrieval via MIPS (Maximum Inner Product Search)

**AIWG Equivalent**:
- Query: Agent capability + task description
- Document: Artifact metadata (tags, phase, type)
- Similarity: Path-scoped rules + explicit @-mentions
- Top-k: Load referenced files + path-scoped context

**Location**: Path-scoped rules in agent definitions, @-mention parser

### 2. BART Generator → LLM (Claude/GPT-4)

**RAG BART**: 400M parameter seq2seq transformer

**AIWG LLM**: Claude Opus 4.5 / Claude Sonnet 4.5 / GPT-4

**Difference**: AIWG uses much larger, more capable models (trillions of parameters) but without domain-specific fine-tuning. Compensates with better retrieval (explicit project context).

### 3. Wikipedia Index → `.aiwg/` Directory

**RAG Index**:
- 21M documents (100-word chunks)
- 15.3B values (21M × 728-dim vectors)
- FAISS with HNSW approximation

**AIWG Index**:
- ~10-100 documents per project (full artifacts, not chunks)
- File system hierarchy (not vectors)
- git for versioning (not FAISS)

**Trade-off**: AIWG sacrifices scale for human-readability and editability.

### 4. RAG-Sequence vs RAG-Token → AIWG Context Strategies

**RAG-Sequence**: Same documents for entire output (better coherence)

**RAG-Token**: Different documents per token (better factual grounding)

**AIWG Strategies**:
- **Sequence mode**: Load full template + all referenced artifacts → generate complete document (e.g., Software Architecture Document)
- **Token mode**: Load specific sections on-demand → generate piecemeal (e.g., iterative use case development)

**Implementation**: Orchestrator selects strategy based on artifact type and task.

## Cross-References to Other AIWG Components

### Related Papers

- **REF-009** (Neural Turing Machines): Foundational work on external memory for neural networks
- **REF-005** (Miller's 7±2): Cognitive limits that external memory (RAG) helps overcome
- **REF-006** (Cognitive Load Theory): RAG reduces intrinsic load by externalizing knowledge

### AIWG Implementation Files

- **Artifact Directory**: `.aiwg/` - Non-parametric memory
- **@-Mention System**: `.claude/rules/mention-wiring.md` - Content addressing
- **Path-Scoped Rules**: Agent definitions - Implicit retrieval
- **Template Library**: `agentic/code/frameworks/sdlc-complete/templates/` - Structured retrieval targets
- **MCP Server**: `src/` - Retrieval and generation orchestration

## Improvement Opportunities for AIWG

### 1. Semantic Search for Artifacts

**Current State**: Explicit @-mentions and path-scoped rules (location-based).

**Opportunity**: Add semantic search capability:
- Embed all `.aiwg/` artifacts
- Query: "Find all requirements related to authentication"
- Retrieve: UC-AUTH-001, UC-AUTH-002, Security-NFR-Auth, ADR-005-OAuth

**Implementation**:
- Local embedding model (sentence-transformers)
- Vector index for `.aiwg/` contents
- Hybrid retrieval: explicit @-mentions + semantic search fallback

**Benefit**: Discover relevant artifacts without explicit wiring.

### 2. Top-K Retrieval Strategy

**RAG Pattern**: Retrieve top-k documents (k=5-10), marginalize over them.

**Current State**: AIWG loads all @-mentioned files (no k limit).

**Opportunity**: Implement top-k for large projects:
- Rank artifacts by relevance to task
- Load only top-k most relevant
- Reduce context window usage

**Implementation**:
- Relevance scoring algorithm (recency, citation count, semantic similarity)
- Context budget management
- Dynamic k selection based on available tokens

### 3. RAG-Sequence vs RAG-Token Mode Selection

**Current State**: Implicit strategy (load all context, generate document).

**Opportunity**: Explicit mode selection:
- **Sequence mode**: Long-form artifacts (SAD, Test Strategy) → load all context upfront
- **Token mode**: Iterative refinement (use case expansion) → load context per section

**Implementation**:
- Artifact type metadata: `generation_mode: sequence|token`
- Orchestrator respects mode, adjusts context loading
- Ralph loop uses token mode for iterative tasks

### 4. Index Hot-Swapping Validation

**RAG Capability**: Swap Wikipedia index → updated knowledge without retraining.

**AIWG Equivalent**: Edit `.aiwg/` files → updated context without redeploying.

**Opportunity**: Add validation:
- Detect when `.aiwg/` files change
- Re-generate affected downstream artifacts
- Notify user of propagation impact

**Implementation**:
- File change watcher
- Dependency graph (which artifacts reference which)
- Incremental regeneration workflow

### 5. Provenance Visualization

**RAG Insight**: Retrieved documents provide evidence trail.

**AIWG Extension**: Visualize provenance chains:
- "This test case comes from UC-001 → SAD Section 5 → ADR-003"
- Interactive graph showing artifact dependencies
- Highlight missing links (requirements without tests)

**Implementation**:
- Parse @-mentions across all artifacts
- Build dependency graph
- Render with mermaid/graphviz
- Integrate into MCP server

### 6. Multi-Hop Retrieval

**RAG Extension (recent research)**: Retrieve documents, then retrieve again based on initial results.

**AIWG Opportunity**: Multi-hop context loading:
- Start with requirement UC-001
- Load referenced architecture (SAD Section 5)
- Load ADRs mentioned in SAD
- Load security model referenced by ADRs
- Build complete context chain

**Implementation**:
- Recursive @-mention resolution
- Depth limit (e.g., 3 hops)
- Cycle detection
- Intelligent pruning (avoid context explosion)

## Critical Insights for AIWG Development

### 1. External Memory Is Not Optional

**RAG Evidence**: Parametric-only models (BART, T5-11B) lag behind hybrid RAG models on knowledge-intensive tasks.

**AIWG Implication**: LLMs without project-specific external memory will hallucinate requirements, invent architectures, fabricate test criteria. The `.aiwg/` directory is foundational, not auxiliary.

### 2. Traceability = Retrieval Provenance

**RAG Strength**: Retrieved documents provide evidence for outputs.

**AIWG Extension**: @-mention wiring creates stronger provenance than RAG:
- RAG: Output → top-k retrieved docs (opaque ranking)
- AIWG: Output → explicit @-mentions → bidirectional links

This makes AIWG's retrieval more auditable and debuggable than neural RAG.

### 3. Human-Readable Memory Is a Feature, Not a Bug

**RAG Uses**: Vector embeddings (compact, semantic search)

**AIWG Uses**: Markdown files (human-readable, git-versioned, editable)

**Trade-off**:
- RAG: Better semantic search, harder to debug/edit
- AIWG: Worse semantic search, easier to debug/edit

For software development (high need for human oversight), AIWG's approach is superior.

### 4. Update Latency Matters

**RAG Hot-Swapping**: Replace index → immediate knowledge update (no retraining).

**AIWG Hot-Swapping**: Edit `.aiwg/` file → immediate context update (no redeployment).

Both systems share zero-latency updates. This is critical for agile development where requirements/architecture change frequently.

### 5. Marginalization = Multi-Document Synthesis

**RAG Pattern**: Combine evidence from multiple retrieved documents via marginalization.

**AIWG Pattern**: Synthesize from multiple artifacts (requirement + architecture + security).

The math differs (probabilistic vs contextual), but the principle is identical: **aggregate evidence from multiple sources to improve quality**.

## Key Quotes Relevant to AIWG

> "Hybrid models that combine parametric memory with non-parametric (i.e., retrieval-based) memories can address some of these issues because knowledge can be directly revised and expanded, and accessed knowledge can be inspected and interpreted." (p. 1)

**AIWG Application**: `.aiwg/` is non-parametric memory; LLM is parametric. Hybrid approach enables rapid knowledge updates.

> "We can update RAG's world knowledge by simply replacing its non-parametric memory." (p. 8)

**AIWG Application**: Update `.aiwg/` files without redeploying agents—instant knowledge propagation.

> "Documents with clues about the answer but do not contain the answer verbatim can still contribute towards a correct answer being generated, which is not possible with standard extractive approaches." (p. 5-6)

**AIWG Application**: Partial information across requirements + architecture + tests combines to generate complete test plan. Not extractive—generative synthesis.

## Summary

Retrieval-Augmented Generation provides the theoretical foundation for AIWG's external memory architecture:

1. **`.aiwg/` directory** = Non-parametric memory (Wikipedia equivalent)
2. **@-mention system** = Content addressing (DPR equivalent)
3. **LLM generation** = BART equivalent (but much larger)
4. **Multi-document context** = Marginalization (evidence aggregation)
5. **File editing** = Index hot-swapping (zero-latency updates)

RAG's experimental evidence validates AIWG's design:
- **Factuality**: Grounded outputs (42.7% improvement)
- **Specificity**: Concrete details (37.4% improvement)
- **Updatability**: Edit external memory without retraining
- **Provenance**: Explicit evidence trail

AIWG extends RAG with:
- **Bidirectional traceability** (not just retrieval → output, but output → retrieval)
- **Human-readable memory** (Markdown > embeddings for software development)
- **Hierarchical organization** (SDLC-aware structure)
- **Git versioning** (temporal dimension RAG lacks)

**Next Steps**:
- Add semantic search for artifact discovery
- Implement top-k retrieval for large projects
- Build provenance visualization tools
- Develop multi-hop retrieval for deep context chains
- Optimize RAG-Sequence vs RAG-Token mode selection
