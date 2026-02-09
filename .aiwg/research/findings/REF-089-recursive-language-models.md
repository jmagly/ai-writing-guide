# REF-089 AIWG Analysis: Recursive Language Models

**Source**: @docs/references/REF-089-recursive-language-models.md (research-papers repo)
**Paper**: Zhang, A. L., Kraska, T., & Khattab, O. (2026). Recursive Language Models. arXiv:2512.24601v2.
**AIWG Relevance**: **HIGH** — Directly applicable to context management, agent delegation, and Ralph loop architecture.
**Issue**: #321 (AIWG RLM Addon Epic)

---

## Executive Summary

Recursive Language Models (RLMs) propose treating long prompts as external environment variables that LLMs interact with through code — examining, decomposing, and recursively sub-querying via a persistent REPL. This maps remarkably well to AIWG's existing architecture: Claude Code already operates with tools (Read, Grep, Bash) that treat the codebase as an external environment, and Ralph loops already implement iterative refinement. RLMs formalize and extend these patterns, providing a principled framework for scaling AIWG agent workflows to handle arbitrarily large codebases, document corpora, and multi-file operations.

Key implications for AIWG:
1. **Context management**: Replace ad-hoc summarization with programmatic context access
2. **Sub-agent delegation**: Formalize how orchestrator agents decompose and delegate to sub-agents
3. **Ralph integration**: RLM's iterative REPL loop is structurally identical to Ralph's TAO loop
4. **Multi-provider support**: RLM's model-agnostic design maps to AIWG's 8-provider architecture

---

## AIWG Concept Mapping

### RLM → AIWG Implementation

| RLM Concept | AIWG Equivalent | Coverage | Gap |
|-------------|-----------------|----------|-----|
| REPL Environment | Claude Code tool environment | **Strong** | No persistent REPL state between turns |
| Prompt as Variable | Codebase on filesystem | **Strong** | Already implemented via Read/Grep tools |
| `llm_query()` sub-calls | Task tool sub-agents | **Strong** | Already supports parallel sub-agents |
| Recursive decomposition | Ralph loop iterations | **Moderate** | Ralph iterates but doesn't recursively spawn |
| `FINAL()` / `FINAL_VAR()` | Task completion criteria | **Moderate** | Ralph uses completion commands, not REPL vars |
| Code-based context filtering | Grep/Glob tool usage | **Strong** | Already how Claude Code navigates codebases |
| Metadata-only root context | CLAUDE.md + rules | **Strong** | Root agent sees metadata, delegates for details |
| Training on trajectories | Not implemented | **Planned** | Issue #329 for Ralph integration |

### Key Alignment: AIWG Already Implements RLM Patterns

The paper's core insight — *treat the problem space as an external environment the LLM interacts with through code* — is already the fundamental architecture of Claude Code and similar agentic coding tools. What AIWG can learn from RLMs:

1. **Formalization**: RLMs provide theoretical grounding for patterns AIWG uses empirically
2. **Recursive depth**: AIWG sub-agents don't currently spawn their own sub-agents (Rule: max depth 2); RLMs show this can be valuable
3. **Programmatic decomposition**: Instead of human-engineered task breakdowns, let the agent write code to decompose the problem
4. **Cost awareness**: RLM results show careful sub-call management keeps costs comparable to direct processing

---

## Detailed Analysis

### 1. Context Management Strategy

**RLM Pattern**: Load entire context as variable, access programmatically via code.

**Current AIWG Approach**: Context loaded via CLAUDE.md rules, agents read files on demand via Read/Grep tools. Context compaction happens via Claude Code's automatic message compression.

**Gap Identified**: AIWG's current compaction is lossy — when context is compressed, details are permanently lost. RLMs show that offloading context to an environment (the filesystem in our case) and accessing it programmatically preserves all information while keeping the active context window small.

**Recommendation**: The RLM model validates AIWG's existing "read-on-demand" pattern. No architectural change needed, but the framework should explicitly discourage loading large files into context when programmatic access (Grep for specific patterns, Read with line ranges) is sufficient.

**Relevant AIWG Rules**:
- @.claude/rules/distractor-filter.md — Already implements relevant context classification
- @.claude/rules/scoped-reasoning.md — Already enforces scope boundaries
- @.claude/rules/subagent-scoping.md — Already limits context passed to sub-agents

### 2. Recursive Sub-Agent Delegation

**RLM Pattern**: `llm_query()` enables recursive self-invocation on sub-problems.

**Current AIWG Approach**: Task tool spawns sub-agents, but @.claude/rules/subagent-scoping.md Rule 6 limits delegation depth to 2 levels.

**Paper Evidence (pp. 5-6)**:
> "On information-dense tasks like OOLONG or OOLONG-Pairs, we observed several cases where recursive LM sub-calling is necessary... Across all information-dense tasks, RLMs outperform the ablation without sub-calling by 10%-59%."

**Gap Identified**: AIWG's depth-2 limit may be too conservative for complex codebases. The paper shows recursive depth of 1 (root + sub-calls) is sufficient for most tasks, but the ability to recursively compose sub-call outputs is the key capability.

**Recommendation**: Maintain current depth limit for general use, but provide an explicit `rlm-mode` for tasks that need deep recursive decomposition (e.g., large-scale refactoring, multi-file analysis). This aligns with Issue #322 (Core RLM addon).

### 3. Ralph Loop Integration

**RLM Pattern**: Iterative REPL loop — generate code, execute, observe output, repeat until `Final` is set.

**Current AIWG Approach**: Ralph implements TAO (Thought→Action→Observation) loops with configurable completion criteria.

**Structural Equivalence**:

| RLM Loop Step | Ralph TAO Step | Notes |
|---------------|---------------|-------|
| `code ← LLM(hist)` | Thought → Action | Agent reasons and selects action |
| `REPL(state, code)` | Action execution | Tool execution (Read, Write, Bash, etc.) |
| `Metadata(stdout)` | Observation | Tool output returned to agent |
| `state[Final] is set` | Completion criteria met | Task done |

**Gap Identified**: Ralph doesn't explicitly maintain state across iterations via persistent variables — it relies on conversation history. RLMs show that maintaining intermediate results in named variables (REPL state) is more robust than relying on growing context.

**Recommendation**: Issue #329 should implement an optional persistent state store for Ralph loops, allowing intermediate results to be saved as named artifacts (files) rather than carried in conversation context. This directly mirrors the REPL variable pattern.

### 4. Emergent Decomposition Strategies

**RLM Finding (Section 4.1, pp. 7-8)**: Even without explicit training, RLMs discover effective strategies:
- **Chunking by structure**: Split by headers, sections, newlines
- **Keyword filtering**: Use regex to find relevant sections before processing
- **Incremental aggregation**: Build answer progressively via variables
- **Model priors**: Leverage domain knowledge to narrow search before reading

**AIWG Alignment**: These are exactly the patterns experienced developers use with Claude Code:
- Grep for relevant code before reading entire files
- Glob for file discovery before diving into implementation
- Read specific line ranges rather than entire files
- Use Task tool to parallelize independent searches

**Recommendation**: Document these as first-class "RLM-inspired patterns" in AIWG's research-before-decision rule. The paper provides academic validation for the rule's core principle.

### 5. Cost Model

**RLM Finding (Figure 3, p. 6)**:
- Median RLM cost is comparable to or lower than base model
- Up to 3x cheaper than summarization agents
- High variance — some runs are expensive outliers

**AIWG Alignment**: This validates AIWG's cost tracking system (Issue #326). The key insight is that selective context access is cheaper than processing everything, even when it requires multiple sub-calls.

**Recommendation**: AIWG's cost tracking should implement percentile-based reporting (p25, p50, p75, p95) to capture the variance pattern RLMs exhibit. Simple averages may not reflect the bimodal cost distribution.

### 6. Multi-Provider Implications

**RLM Finding (Observation 5, p. 7)**:
> "While both GPT-5 and Qwen3-Coder-480B both exhibit strong performance as RLMs relative to their base model... they also exhibit different performance and behavior across all tasks."

**AIWG Alignment**: AIWG already supports 8 providers with model-specific configurations. The RLM finding that different models need different system prompts (e.g., Qwen3-Coder needs a warning about excessive sub-calls) reinforces the need for provider-specific agent configurations.

**Recommendation**: Issue #325 (Multi-provider support) should include per-provider RLM prompt tuning. The paper's Appendix C provides exact prompt diffs as templates.

### 7. Training on Trajectories

**RLM Finding (Observation 6, p. 7)**:
> "Certain behavior in RLM trajectories is common among different domains... our simple general-purpose training recipe uses only 1,000 samples from unrelated domains to improve its performance by a median of 28.3%."

**AIWG Alignment**: This is highly relevant to AIWG's cross-task learning system (@.claude/skills/cross-task-learner). If RLM-style trajectories can be collected from AIWG agent sessions (Ralph loop logs, agent TAO traces), these could potentially be used to improve agent performance.

**Recommendation**: Long-term exploration. Issue #330 should capture RLM trajectory data from the research paper as a starting corpus. AIWG's reflection memory (@agentic/code/addons/ralph/schemas/reflection-memory.json) already stores similar data.

---

## Implementation Recommendations

### Immediate (High Priority) — Issue #322

1. **Formalize "environment-first" context pattern**: Update @.claude/rules/research-before-decision.md to explicitly reference RLM's evidence that programmatic context access outperforms full-context processing
2. **Add RLM-inspired prompt patterns**: Create an RLM prompt template for long-context tasks (based on Appendix C)
3. **Document cost-awareness heuristic**: When `llm_query()` equivalent (Task tool sub-agents) is cheaper than processing full context, prefer delegation

### Short-Term (Enhancement) — Issues #323, #324

4. **Ralph persistent state**: Add optional named variable storage to Ralph loops (files as REPL variables)
5. **Agent Supervisor RLM mode**: Allow supervised agents to recursively spawn sub-agents beyond depth-2 limit for designated tasks
6. **Task Store trajectory logging**: Log full TAO traces in format compatible with RLM trajectory analysis

### Medium-Term (Research) — Issues #329, #330

7. **Trajectory collection**: Instrument AIWG agent sessions to collect RLM-format trajectories
8. **Cross-task transfer**: Evaluate whether collected trajectories improve performance on new tasks
9. **Async sub-calls**: The paper notes synchronous sub-LM calls are slow; AIWG should implement parallel sub-agent execution (already partially supported via Task tool parallelism)

---

## Cross-References to AIWG Components

| Component | Location | RLM Relevance |
|-----------|----------|---------------|
| Ralph Loop Core | @tools/ralph-external/ | RLM's iterative REPL loop maps to Ralph TAO |
| Agent Supervisor | @tools/daemon/agent-supervisor.mjs | Could orchestrate RLM-style recursive delegation |
| Task Store | @tools/daemon/task-store.mjs | Persistent state equivalent to REPL variables |
| Sub-agent Scoping | @.claude/rules/subagent-scoping.md | Depth limits may need RLM exception mode |
| Research Before Decision | @.claude/rules/research-before-decision.md | RLM validates "search before process" pattern |
| Context Management | @.claude/rules/distractor-filter.md | RLM's programmatic filtering as formal pattern |
| TAO Loop | @.claude/rules/tao-loop.md | Structurally equivalent to RLM's REPL loop |
| Cost Tracking | Issue #326 | RLM cost model informs percentile-based tracking |
| Multi-Provider | @tools/agents/providers/ | Per-provider RLM prompt tuning needed |

---

## Key Quotes for AIWG Documentation

### On the Core Paradigm:
> "The key insight is that arbitrarily long user prompts should not be fed into the neural network directly but should instead be treated as *part of the environment* that the LLM is tasked to *symbolically and recursively interact with*." (p. 1)

### On Compaction Limitations:
> "Unfortunately, compaction is rarely expressive enough for tasks that require dense access throughout the prompt. It presumes that *some* details that appear early in the prompt can safely be forgotten to make room for new content." (p. 1)

### On Cost Efficiency:
> "Compared to the summarization agent which ingests the entire input context, RLMs are up to 3× cheaper while maintaining stronger performance across all tasks because the RLM is able to selectively view context." (p. 6)

### On Existing Scaffold Limitations:
> "Prior coding agents and retrieval agents treat some designated external data source (e.g., a filesystem or a corpus of search documents) as an environment for fetching snippets. However, they *can only fill up the underlying LLM's context window with snippets before breaking down*." (p. 2)

### On Emergent Behavior:
> "Even without explicit training, RLMs exhibit interesting context decomposition and problem decomposition behavior." (p. 7)

### On Training Efficiency:
> "Our simple general-purpose training recipe uses only 1,000 samples from unrelated domains to improve its performance by a median of 28.3% across the four evaluation tasks." (p. 2)

---

## Professional Terminology Mapping

| AIWG Term | RLM Formal Term | Context |
|-----------|----------------|---------|
| Ralph TAO loop | REPL iteration loop | Iterative agent execution |
| Sub-agent delegation | Recursive sub-LM calls | Task decomposition |
| Context compression | Context compaction | Lossy summarization |
| Tool-based codebase access | Symbolic environment interaction | External data access |
| Completion criteria | `Final` / `FINAL_VAR()` | Loop termination |
| Agent trajectory | RLM trajectory | Execution trace |
| Reflection memory | REPL state variables | Persistent intermediate results |
| Provider-specific config | Per-model system prompt tuning | Multi-model adaptation |

---

## Comparison with Existing Approaches

### RLM vs Context Compaction (Claude Code's Current Approach)

| Dimension | Context Compaction | RLM Pattern |
|-----------|-------------------|-------------|
| **Information loss** | Lossy (summarized) | Lossless (original preserved) |
| **Access pattern** | Sequential through compressed context | Random access via code |
| **Cost** | Fixed (compression cost) | Variable (sub-call dependent) |
| **Complexity ceiling** | Limited by compressed context size | Unbounded (recursive) |
| **When better** | Short/medium contexts | Very long contexts, information-dense |

### RLM vs RAG (Retrieval-Augmented Generation)

| Dimension | RAG | RLM Pattern |
|-----------|-----|-------------|
| **Retrieval** | Pre-computed embeddings | Dynamic, code-driven |
| **Flexibility** | Fixed retrieval strategy | Adaptive per-query |
| **Multi-hop** | Difficult (needs iterative retrieval) | Natural (recursive sub-calls) |
| **Setup cost** | High (index building) | Zero (no preprocessing) |
| **When better** | Known query patterns, stable corpora | Ad-hoc analysis, changing data |

---

## Research Limitations to Note

From Appendix B (p. 14):
1. **Synchronous sub-calls are slow** — Production implementation needs async/parallel execution
2. **FINAL vs FINAL_VAR is brittle** — Models confuse completion signals; needs explicit training
3. **Models need coding ability** — Non-coder models struggle in REPL environment
4. **Output token limits matter** — Models with limited output tokens underperform as RLMs

These limitations are important for AIWG implementation:
- Limitation 1: AIWG already supports parallel Task tool calls
- Limitation 2: Ralph's completion criteria system is more robust than FINAL/FINAL_VAR
- Limitation 3: AIWG agents run in coding-capable environments by design
- Limitation 4: Provider model selection should consider output token limits for RLM tasks

---

## Document Status

**Created**: 2026-02-09
**Source Paper**: REF-089 (Zhang et al., 2026)
**AIWG Priority**: HIGH
**Implementation Status**: Planning — Issue #321 (Epic) with 9 sub-issues (#322-#330)
**Key Contribution**: Formal theoretical framework validating AIWG's empirical patterns for context management, recursive delegation, and iterative refinement. Provides evidence that programmatic environment interaction scales better than context compaction for long-context tasks.
