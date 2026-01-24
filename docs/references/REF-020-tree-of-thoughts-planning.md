# REF-020: Tree of Thoughts - Deliberate Problem Solving with Large Language Models

## Citation

Yao, S., Yu, D., Zhao, J., Shafran, I., Griffiths, T. L., Cao, Y., & Narasimhan, K. (2023). Tree of Thoughts: Deliberate Problem Solving with Large Language Models. *Advances in Neural Information Processing Systems 36 (NeurIPS 2023)*.

**arXiv**: [https://arxiv.org/abs/2305.10601](https://arxiv.org/abs/2305.10601)

**GitHub**: [https://github.com/princeton-nlp/tree-of-thought-llm](https://github.com/princeton-nlp/tree-of-thought-llm)

## Summary

Tree of Thoughts (ToT) generalizes Chain-of-Thought prompting by enabling exploration of multiple reasoning paths with lookahead and backtracking. Instead of linear reasoning, ToT treats problem-solving as search over a tree of "thoughts" (coherent reasoning units), using the LLM itself for both generation and evaluation.

### Key Concepts

| Concept | Definition |
|---------|------------|
| **Thought** | Coherent unit of reasoning (sentence to paragraph) |
| **Tree Structure** | Branching paths representing different approaches |
| **Self-Evaluation** | LLM assesses promise of each thought |
| **Backtracking** | Abandon unpromising paths, try alternatives |
| **Search Algorithms** | BFS or DFS over thought tree |

### Architecture

```
                    [Problem]
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
        [Thought 1] [Thought 2] [Thought 3]
            │           │           │
        [Eval: 0.8] [Eval: 0.3] [Eval: 0.7]
            │                       │
       ┌────┴────┐             ┌────┴────┐
       ▼         ▼             ▼         ▼
   [T1.1]    [T1.2]        [T3.1]    [T3.2]
       │
   [Solution]
```

### Key Findings

1. **Dramatic Improvement**: 4% → 74% on Game of 24 (GPT-4)
2. **Deliberate Search**: Enables strategic lookahead
3. **Error Recovery**: Backtracking escapes dead ends
4. **General Framework**: Works across planning, creative, puzzle tasks

### Benchmark Results

| Task | CoT (GPT-4) | ToT (GPT-4) | Improvement |
|------|-------------|-------------|-------------|
| Game of 24 | 4% | 74% | +70% |
| Creative Writing | 6.93 | 7.56 | +9% coherence |
| Mini Crosswords | 15.6% | 60% | +44.4% |

## AIWG Application

### Direct Parallel: Phase Gates & Planning

AIWG's phase gate system implements ToT-like deliberation:

| ToT Element | AIWG Implementation |
|-------------|---------------------|
| Thought branches | Alternative approaches in planning |
| Self-evaluation | Gate check validation |
| Backtracking | Iteration on failed gates |
| Search | Flow command orchestration |

### Integration Pattern

```
ToT Search:
  Generate thoughts → Evaluate → Prune → Expand best → Repeat

AIWG Phase Planning:
  Generate options → Review → Gate check → Proceed/Iterate
```

### Flow Command Connection

```markdown
# AIWG Flow with ToT-style Deliberation

## /flow-inception-to-elaboration

### Step 1: Generate Architecture Options
- Option A: Microservices
- Option B: Monolith
- Option C: Serverless

### Step 2: Evaluate Each Option
Security review, scalability analysis, cost estimate

### Step 3: Select Best Path
Based on evaluation scores

### Step 4: Proceed or Backtrack
If gate fails, return to Step 1 with constraints
```

### Why ToT Matters for AIWG

1. **Planning Quality**: Deliberation improves complex decisions
2. **Error Recovery**: Backtracking enables course correction
3. **Gate Design**: Self-evaluation informs gate criteria
4. **Search Strategies**: BFS/DFS patterns for workflow optimization

## Key Quotes

> "ToT allows LMs to perform deliberate decision making by considering multiple different reasoning paths and self-evaluating choices to decide the next course of action."

> "GPT-4 with chain-of-thought prompting only solved 4% of tasks, while ToT achieved 74%."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Phase Planning | **Critical** - deliberate decision making |
| Gate Checks | **High** - self-evaluation patterns |
| Flow Commands | **High** - search orchestration |
| Error Recovery | **High** - backtracking patterns |

## Cross-References

- **REF-016**: Chain-of-Thought (linear reasoning baseline)
- **REF-021**: LATS (tree search + acting)
- **REF-010**: Stage-Gate (phase gate validation)
- **Flow Commands**: `.claude/commands/flow-*.md`

## Related Work

- LATS: Zhou et al. (2023) - Tree search with actions
- Self-Consistency: Wang et al. (2023) - Multiple paths, voting
- RAP: Hao et al. (2023) - Reasoning via planning

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
