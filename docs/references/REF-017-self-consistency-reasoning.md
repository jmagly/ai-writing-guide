# REF-017: Self-Consistency Improves Chain of Thought Reasoning

## Citation

Wang, X., Wei, J., Schuurmans, D., Le, Q., Chi, E., Narang, S., Chowdhery, A., & Zhou, D. (2023). Self-Consistency Improves Chain of Thought Reasoning in Language Models. *The Eleventh International Conference on Learning Representations (ICLR 2023)*.

**arXiv**: [https://arxiv.org/abs/2203.11171](https://arxiv.org/abs/2203.11171)

## Summary

Self-Consistency is a decoding strategy that improves Chain-of-Thought prompting by sampling multiple diverse reasoning paths and selecting the most consistent answer through majority voting. The intuition: complex problems often have multiple valid reasoning approaches that converge on the same correct answer.

### Key Concepts

| Concept | Definition |
|---------|------------|
| **Self-Consistency** | Sample diverse reasoning paths, vote on answer |
| **Majority Voting** | Select answer appearing most frequently across samples |
| **Reasoning Path Diversity** | Different valid approaches to same problem |
| **Marginalization** | Aggregate over reasoning paths to find answer |

### Key Findings

1. **Significant Improvement**: +17.9% on GSM8K over standard CoT
2. **No Training Required**: Pure inference-time technique
3. **Complements CoT**: Stacks with chain-of-thought prompting
4. **Robust to Errors**: Individual wrong paths don't dominate

### Benchmark Results

| Task | CoT | + Self-Consistency | Improvement |
|------|-----|-------------------|-------------|
| GSM8K | 56.5% | 74.4% | +17.9% |
| SVAMP | 78.7% | 89.7% | +11.0% |
| AQuA | 52.0% | 64.2% | +12.2% |
| StrategyQA | 73.4% | 79.8% | +6.4% |

## AIWG Application

### Direct Parallel: Multi-Agent Review

AIWG's multi-agent review implements a form of self-consistency:

| Self-Consistency | AIWG Multi-Agent |
|------------------|------------------|
| Multiple reasoning paths | Multiple reviewer perspectives |
| Sample diverse approaches | Different agent specializations |
| Majority voting | Synthesizer integration |
| Aggregate to find answer | Consensus on final artifact |

### Implementation Pattern

```
Self-Consistency:
  Sample Path 1 → Answer A
  Sample Path 2 → Answer A
  Sample Path 3 → Answer B
  Majority Vote → Answer A

AIWG Multi-Agent:
  Security Reviewer → "Fix auth issue"
  Test Reviewer → "Add edge case test"
  Writing Reviewer → "Clarify section 3"
  Synthesizer → Integrated document addressing all
```

### Why This Matters for AIWG

1. **Review Panel Design**: Multiple reviewers provide diverse "reasoning paths"
2. **Synthesizer Role**: Acts as aggregation/voting mechanism
3. **Error Resilience**: Single reviewer mistakes don't dominate
4. **Quality Improvement**: Diverse perspectives catch more issues

### Trade-offs

- **Cost**: Multiple samples = multiple API calls
- **Latency**: Sequential sampling adds time
- **Diminishing Returns**: Benefits plateau around 5-10 samples

## Key Quotes

> "Self-consistency leverages the intuition that a complex reasoning problem typically admits multiple different ways of thinking leading to its unique correct answer."

> "Self-consistency boosts the performance of chain-of-thought prompting with a striking margin on a range of popular arithmetic and commonsense reasoning benchmarks."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Multi-Agent Review | **Critical** - validates ensemble approach |
| Synthesizer Design | **High** - aggregation patterns |
| Quality Assurance | **High** - error resilience |
| Cost Optimization | **Medium** - trade-off considerations |

## Cross-References

- **REF-016**: Chain-of-Thought (foundation for self-consistency)
- **REF-007**: Mixture of Experts (ensemble validation)
- **Multi-Agent Pattern**: `docs/multi-agent-documentation-pattern.md`

## Related Work

- Chain-of-Thought: Wei et al. (2022)
- Tree of Thoughts: Yao et al. (2023)
- Diverse Verifier on Reasoning: Li et al. (2023)

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
