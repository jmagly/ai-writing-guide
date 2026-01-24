# REF-024: LATS - Language Agent Tree Search Unifies Reasoning, Acting, and Planning

## Citation

Zhou, A., Yan, K., Shlapentokh-Rothman, M., Wang, H., & Wang, Y.-X. (2024). Language Agent Tree Search Unifies Reasoning, Acting, and Planning in Language Models. *Proceedings of the 41st International Conference on Machine Learning (ICML 2024)*.

**arXiv**: [https://arxiv.org/abs/2310.04406](https://arxiv.org/abs/2310.04406)

**GitHub**: [https://github.com/lapisrocks/LanguageAgentTreeSearch](https://github.com/lapisrocks/LanguageAgentTreeSearch)

## Summary

LATS adapts Monte Carlo Tree Search (MCTS) to language agents, unifying reasoning, acting, and planning in a single framework. By treating LLM-generated thoughts and actions as tree nodes, LATS enables deliberate exploration with backtracking—achieving state-of-the-art results on coding, QA, and web navigation tasks.

### Key Concepts

| Concept | Definition |
|---------|------------|
| **MCTS for Agents** | Tree search adapted to language agent execution |
| **LM-Powered Value Function** | Model self-evaluates node promise |
| **Self-Reflection** | Generate critique for failed paths |
| **Environment Feedback** | External signals guide search |

### Architecture

```
                    [Task Root]
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    [Thought+Act 1] [Thought+Act 2] [Thought+Act 3]
         │               │               │
    [Obs: partial]  [Obs: error]    [Obs: progress]
         │                               │
    ┌────┴────┐                    ┌─────┴─────┐
    ▼         ▼                    ▼           ▼
 [T+A 1.1] [T+A 1.2]           [T+A 3.1]  [T+A 3.2]
                                    │
                               [Solution]

MCTS Operations:
- Selection: UCB1 to choose promising nodes
- Expansion: Generate new thought+action
- Evaluation: LM scores node value
- Backpropagation: Update ancestor values
```

### Key Findings

1. **SOTA on HumanEval**: 92.7% pass@1 with GPT-4
2. **Unifies Approaches**: Combines ReAct, ToT, Reflexion ideas
3. **Environment-Aware**: External feedback drives search
4. **No Training**: Pure inference-time optimization

### Benchmark Results

| Task | ReAct | ToT | LATS | Improvement |
|------|-------|-----|------|-------------|
| HumanEval (code) | 82.4% | - | 92.7% | +10.3% |
| WebShop | 40.1 | - | 75.9 | +35.8 |
| HotpotQA | 35.1% | - | 52.4% | +17.3% |

## AIWG Application

### Direct Parallel: Iterative Planning with Backtracking

LATS provides theoretical foundation for AIWG's iterative planning:

| LATS Element | AIWG Implementation |
|--------------|---------------------|
| Tree search | Multi-path planning |
| Value function | Gate check scoring |
| Backtracking | Iteration on failure |
| Environment feedback | External verification (tests, lint) |

### Integration Pattern

```
LATS:
  Select node → Expand (act) → Evaluate (observe) → Backprop → Repeat

AIWG Ralph + Planning:
  Select approach → Execute → Verify → Update strategy → Iterate
```

### Why LATS Matters for AIWG

1. **Search-Based Planning**: Validates deliberate exploration approach
2. **Backtracking**: Theoretical support for iteration patterns
3. **External Feedback**: Environment signals guide refinement
4. **Unification**: Combines reasoning, acting, planning literature

### Planning Command Enhancement

LATS suggests enhancements to AIWG flow commands:

```markdown
# Enhanced Flow Command with LATS-style Search

## /flow-architecture-planning

### Step 1: Generate Options (LATS Expansion)
- Microservices architecture
- Monolith with modules
- Serverless functions

### Step 2: Evaluate Each (LATS Value Function)
Score each on: security, scalability, maintainability, cost

### Step 3: Select Best (LATS Selection)
Use evaluation scores to pick most promising

### Step 4: Execute & Verify (LATS Environment Feedback)
Implement selected option, run validation

### Step 5: Backtrack if Needed (LATS Backpropagation)
If validation fails, return to Step 1 with updated constraints
```

## Key Quotes

> "LATS is the first general framework that synergizes the capabilities of LMs in reasoning, acting, and planning."

> "LATS achieves state-of-the-art pass@1 accuracy (92.7%) for programming on HumanEval with GPT-4."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Planning | **Critical** - search-based planning |
| Iteration Patterns | **High** - backtracking validation |
| External Verification | **High** - environment feedback |
| Flow Commands | **Medium** - orchestration patterns |

## Cross-References

- **REF-020**: Tree of Thoughts (thought tree foundation)
- **REF-018**: ReAct (reasoning + acting)
- **REF-021**: Reflexion (self-reflection)
- **Ralph Guide**: `docs/ralph-guide.md`

## Related Work

- Tree of Thoughts: Yao et al. (2023)
- ReAct: Yao et al. (2023)
- Reflexion: Shinn et al. (2023)
- RAP: Hao et al. (2023)

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
