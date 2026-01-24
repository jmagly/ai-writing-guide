# REF-018: ReAct - Synergizing Reasoning and Acting in Language Models

## Citation

Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2023). ReAct: Synergizing Reasoning and Acting in Language Models. *The Eleventh International Conference on Learning Representations (ICLR 2023)*.

**arXiv**: [https://arxiv.org/abs/2210.03629](https://arxiv.org/abs/2210.03629)

**Project**: [https://react-lm.github.io](https://react-lm.github.io)

## Summary

ReAct introduces a paradigm where LLMs interleave reasoning traces with actions, enabling dynamic plan adjustment based on external feedback. Unlike pure chain-of-thought (reasoning only) or action-only approaches, ReAct allows models to reason about observations and adapt their strategy mid-execution.

### Key Concepts

| Concept | Definition |
|---------|------------|
| **Reasoning Trace** | Internal thought process verbalized by model |
| **Action** | External operation (API call, search, tool use) |
| **Observation** | Feedback from environment after action |
| **Interleaving** | Thought → Action → Observation → Thought cycle |

### Architecture

```
Task: Answer "What is the capital of the country where Einstein was born?"

Thought 1: I need to find where Einstein was born.
Action 1: Search[Albert Einstein birthplace]
Observation 1: Albert Einstein was born in Ulm, Germany.

Thought 2: Einstein was born in Germany. Now I need the capital of Germany.
Action 2: Search[capital of Germany]
Observation 2: Berlin is the capital of Germany.

Thought 3: I have the answer.
Action 3: Finish[Berlin]
```

### Key Findings

1. **Reduces Hallucination**: External verification corrects reasoning errors
2. **Interpretable**: Reasoning traces show model's decision process
3. **Flexible**: Works across QA, fact verification, interactive tasks
4. **Outperforms**: +34% absolute on ALFWorld, +10% on WebShop

### Benchmark Results

| Task | Chain-of-Thought | Act-Only | ReAct |
|------|------------------|----------|-------|
| HotpotQA | 29.4% | 25.7% | 35.1% |
| Fever | 56.3% | 58.9% | 64.6% |
| ALFWorld | - | 45% | 71% |

## AIWG Application

### Direct Parallel: Agent Tool Use

AIWG agents implement ReAct pattern through structured tool use:

| ReAct Component | AIWG Implementation |
|-----------------|---------------------|
| Reasoning trace | Agent system prompt reasoning |
| Action | Tool calls (Bash, Read, Write) |
| Observation | Tool output processing |
| Interleaving | Turn-by-turn agent execution |

### Integration Pattern

```typescript
// AIWG agent implementing ReAct pattern
while (!taskComplete) {
  // Reasoning: What do I need to do?
  const plan = await agent.reason(context);

  // Action: Execute tool
  const action = selectAction(plan);
  const observation = await executeTool(action);

  // Update context with observation
  context.addObservation(observation);

  // Loop continues with new reasoning
}
```

### Why ReAct Matters for AIWG

1. **Tool Integration**: Foundation for agent tool use patterns
2. **Error Recovery**: Observations enable strategy adjustment
3. **Transparency**: Reasoning traces aid debugging
4. **Grounding**: External feedback prevents hallucination (REF-002 Archetype 1)

### Ralph Loop Connection

Ralph extends ReAct with structured recovery:

```
ReAct: Thought → Action → Observation → Thought

Ralph: Execute → Verify → Analyze → Adapt
       (ReAct + external validation + structured error handling)
```

## Key Quotes

> "ReAct prompts LLMs to generate both reasoning traces and task-specific actions in an interleaved manner, allowing for greater synergy between the two."

> "Reasoning traces help the model induce, track, and update action plans as well as handle exceptions, while actions allow it to interface with external sources."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Agent Design | **Critical** - tool use foundation |
| Ralph Loop | **Critical** - execution pattern |
| Error Recovery | **High** - observation-based adaptation |
| Transparency | **High** - interpretable reasoning |

## Cross-References

- **REF-016**: Chain-of-Thought (reasoning component)
- **REF-019**: Toolformer (tool learning)
- **REF-015**: Self-Refine (iteration patterns)
- **Ralph Guide**: `docs/ralph-guide.md`

## Related Work

- Toolformer: Schick et al. (2023) - self-taught tool use
- LATS: Zhou et al. (2023) - tree search with ReAct
- Reflexion: Shinn et al. (2023) - verbal reinforcement

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
