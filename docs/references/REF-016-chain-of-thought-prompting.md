# REF-016: Chain-of-Thought Prompting Elicits Reasoning in Large Language Models

## Citation

Wei, J., Wang, X., Schuurmans, D., Bosma, M., Ichter, B., Xia, F., Chi, E., Le, Q., & Zhou, D. (2022). Chain-of-Thought Prompting Elicits Reasoning in Large Language Models. *Advances in Neural Information Processing Systems 35 (NeurIPS 2022)*.

**arXiv**: [https://arxiv.org/abs/2201.11903](https://arxiv.org/abs/2201.11903)

## Summary

Chain-of-Thought (CoT) prompting demonstrates that providing a few examples of step-by-step reasoning significantly improves LLM performance on complex reasoning tasks. Rather than jumping directly to answers, models generate intermediate reasoning steps, enabling arithmetic, commonsense, and symbolic reasoning that was previously difficult.

### Key Concepts

| Concept | Definition |
|---------|------------|
| **Chain-of-Thought** | Series of intermediate reasoning steps leading to answer |
| **Few-Shot Exemplars** | 8 CoT examples in context sufficient for emergence |
| **Emergent Ability** | Only appears in models >100B parameters |
| **Multi-Step Reasoning** | Tasks requiring sequential logical steps |

### Key Findings

1. **Scale Matters**: CoT only helps models >100B parameters; harms smaller models
2. **Complexity Correlation**: Greater improvement on tasks requiring more steps
3. **No Training Required**: Pure inference-time technique
4. **State-of-the-Art**: 540B model + 8 CoT examples achieves SOTA on GSM8K

### Benchmark Results

| Task | Standard | + CoT | Improvement |
|------|----------|-------|-------------|
| GSM8K (math) | 17.9% | 58.1% | +40.2% |
| SVAMP (math) | 68.9% | 79.0% | +10.1% |
| StrategyQA | 73.3% | 79.3% | +6.0% |

## AIWG Application

### Direct Parallel: Structured Reasoning

AIWG templates and agent prompts encode CoT-style reasoning:

| CoT Element | AIWG Implementation |
|-------------|---------------------|
| Exemplar steps | Template structure with numbered procedures |
| Intermediate outputs | Phase artifacts (requirements → design → code) |
| Explicit reasoning | Agent system prompts with reasoning patterns |

### Why AIWG Benefits

1. **Template Design**: Structured templates guide step-by-step thinking
2. **Flow Commands**: Encode multi-step procedures as exemplars
3. **Artifact Progression**: Each phase output is an "intermediate step"
4. **Review Prompts**: Request explicit reasoning in feedback

### Integration Pattern

```markdown
# AIWG Template with CoT Structure

## Step 1: Understand Context
- What are the inputs?
- What constraints exist?

## Step 2: Analyze Requirements
- Break down user request
- Identify implicit needs

## Step 3: Design Approach
- Consider alternatives
- Select best option with rationale

## Step 4: Implement
- Execute selected approach
- Document decisions
```

## Key Quotes

> "We explore the ability of language models to generate a chain of thought—a series of intermediate reasoning steps—and find that this significantly improves their ability to perform complex reasoning."

> "Prompting a 540B-parameter language model with just eight chain of thought exemplars achieves state of the art accuracy on the GSM8K benchmark."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Template Design | **Critical** - structures reasoning |
| Agent Prompts | **High** - reasoning patterns in system prompts |
| Flow Commands | **High** - step-by-step procedures |
| Cognitive Load | **Medium** - relates to REF-005, REF-006 |

## Cross-References

- **REF-005**: Miller (1956) - Chunking aligns with CoT steps
- **REF-006**: Sweller (1988) - Worked examples parallel CoT exemplars
- **REF-017**: Self-Consistency extends CoT with sampling

## Related Work

- Zero-Shot CoT: "Let's think step by step" (Kojima et al., 2022)
- Self-Consistency: Sample multiple CoT paths (Wang et al., 2023)
- Tree of Thoughts: Branching CoT (Yao et al., 2023)

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
