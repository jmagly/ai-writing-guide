# REF-017: Self-Consistency Improves Chain of Thought Reasoning

## Citation

Wang, X., Wei, J., Schuurmans, D., Le, Q., Chi, E., Narang, S., Chowdhery, A., & Zhou, D. (2023). Self-Consistency Improves Chain of Thought Reasoning in Language Models. *The Eleventh International Conference on Learning Representations (ICLR 2023)*.

**arXiv**: [https://arxiv.org/abs/2203.11171](https://arxiv.org/abs/2203.11171)
**PDF**: `docs/references/pdfs/REF-017-wang-2023-selfconsistency.pdf`

## Document Profile

| Attribute | Value |
|-----------|-------|
| Pages | 24 (with appendix) |
| Year | 2023 |
| Venue | ICLR 2023 |
| Type | Empirical research |
| AIWG Relevance | **Critical** - validates multi-agent review patterns |

## Executive Summary

Self-Consistency is a decoding strategy that replaces greedy decoding in Chain-of-Thought prompting. Instead of taking the single greedy path, it **samples multiple diverse reasoning paths** and selects the most consistent answer through **majority voting**. The key insight: correct reasoning processes, even when diverse, tend to converge on the same answer more often than incorrect ones.

**Core technique**: Sample-and-marginalize - sample diverse reasoning paths from the decoder, then aggregate answers by marginalizing out the reasoning paths.

---

## Key Findings

### 1. The Self-Consistency Method (Section 2)

Three steps:
1. **Prompt** with chain-of-thought exemplars
2. **Sample** diverse reasoning paths from the decoder (instead of greedy decode)
3. **Aggregate** by majority voting over final answers

> "Self-consistency leverages the intuition that a complex reasoning problem typically admits multiple different ways of thinking leading to its unique correct answer." (p. 1)

### 2. Benchmark Results

#### Arithmetic Reasoning (Table 2)

| Task | CoT (Greedy) | + Self-Consistency | Improvement |
|------|--------------|-------------------|-------------|
| GSM8K | 56.5% | 74.4% | **+17.9%** |
| SVAMP | 79.0% | 86.6% | +7.6% |
| AQuA | 35.8% | 48.3% | +12.5% |
| MultiArith | 94.7% | 99.3% | +4.6% |
| ASDiv | 74.0% | 81.9% | +7.9% |
| AddSub | 91.9% | 93.7% | +1.8% |

*Results on PaLM-540B with 40 sampled paths*

#### Commonsense Reasoning (Table 3)

| Task | CoT (Greedy) | + Self-Consistency | Improvement |
|------|--------------|-------------------|-------------|
| CommonsenseQA | 79.0% | 80.7% | +1.7% |
| StrategyQA | 75.3% | 81.6% | +6.3% |
| ARC-easy | 95.3% | 96.4% | +1.1% |
| ARC-challenge | 85.2% | 88.7% | +3.5% |

### 3. Gains Scale with Model Size

| Model | Typical Gain |
|-------|-------------|
| UL2-20B | +3-6% |
| LaMDA-137B | +9-23% |
| GPT-3 (175B) | +9-18% |
| PaLM-540B | +7-18% |

> "The gains become more significant when the language model's scale increases." (p. 5)

---

## Answer Aggregation Strategies (Table 1)

| Strategy | GSM8K | MultiArith | Finding |
|----------|-------|------------|---------|
| Greedy decode | 56.5 | 94.7 | Baseline |
| Weighted avg (unnormalized) | 56.3 | 90.5 | Worse than baseline |
| Weighted avg (normalized) | 22.1 | 59.7 | Much worse |
| Weighted sum (unnormalized) | 59.9 | 92.2 | Slight improvement |
| Weighted sum (normalized) | 74.1 | 99.3 | Good |
| **Unweighted sum (majority vote)** | **74.4** | **99.3** | Best/simplest |

**Key insight**: Simple majority voting performs as well as normalized weighted voting because the model regards different generations as "similarly likely" (p. 3).

---

## Comparison to Other Methods (Section 3.4)

### vs. Sample-and-Rank

Self-consistency significantly outperforms sample-and-rank (where you rank by log probability and take the top):
- GSM8K: 24% (self-consistency) vs ~15% (sample-and-rank) at 40 paths
- The gap widens with more samples

### vs. Beam Search (Table 6)

| Method | AQuA (40 paths) | MultiArith (40 paths) |
|--------|-----------------|----------------------|
| Beam search (top beam) | 10.2% | 10.5% |
| Self-consistency (beam) | 24.2% | 10.8% |
| **Self-consistency (sampling)** | **26.9%** | **14.7%** |

> "Beam search yields a lower diversity in the outputs... in self-consistency the diversity of the reasoning paths is the key." (p. 7)

### vs. Ensemble Methods (Table 7)

| Method | GSM8K | SVAMP |
|--------|-------|-------|
| CoT baseline | 17.1% | 38.9% |
| Ensemble (3 prompt sets) | 18.6% | 42.1% |
| Ensemble (40 permutations) | 19.2% | 42.7% |
| **Self-Consistency (40 paths)** | **27.7%** | **53.3%** |

Self-consistency acts as a "self-ensemble" on a single model, outperforming multi-prompt ensembles.

---

## Robustness Studies (Section 3.5)

### Robust to Sampling Strategies

Works with:
- Temperature sampling (T = 0.3 to 0.7)
- Top-k sampling (k = 20 to 40, or no top-k)
- Nucleus sampling (p = 0.9 to 0.95)

### Robust to Imperfect Prompts (Table 8)

| Condition | GSM8K |
|-----------|-------|
| Correct CoT prompts | 17.1% |
| Imperfect CoT prompts | 14.9% |
| + Self-consistency | **23.4%** |

Self-consistency recovers performance even with deliberately flawed prompts.

### Works with Zero-Shot CoT

| Method | GSM8K |
|--------|-------|
| Zero-shot CoT | 43.0% |
| + Self-consistency | **69.2%** (+26.2%) |

---

## Uncertainty Estimation (Figure 5)

**Consistency correlates with accuracy**: When multiple paths agree, the model is more likely correct.

> "One can use self-consistency to provide an uncertainty estimate of the model in its generated solutions... low consistency as an indicator that the model has low confidence." (p. 8)

This enables the model to "know when it doesn't know."

---

## When CoT Hurts, Self-Consistency Helps (Table 5)

For some NLP tasks, CoT hurts performance vs standard prompting. Self-consistency recovers:

| Task | Standard Prompting | CoT | Self-Consistency |
|------|-------------------|-----|------------------|
| ANLI-R1 | 69.1% | 68.8% | **78.5%** |
| e-SNLI | 85.8% | 81.0% | **88.4%** |
| RTE | 84.8% | 79.1% | **86.3%** |

---

## Key Quotes for Citation

### On the core method:
> "We propose a new decoding strategy, self-consistency, to replace the naive greedy decoding used in chain-of-thought prompting. It first samples a diverse set of reasoning paths instead of only taking the greedy one, and then selects the most consistent answer by marginalizing out the sampled reasoning paths." (p. 1)

### On the intuition:
> "We hypothesize that correct reasoning processes, even if they are diverse, tend to have greater agreement in their final answer than incorrect processes." (p. 2)

### On simplicity:
> "Self-consistency is entirely unsupervised, works off-the-shelf with pre-trained language models, requires no additional human annotation, and avoids any additional training, auxiliary models or fine-tuning." (p. 2)

### On diversity:
> "Diversity of the reasoning paths is the key to a better performance." (p. 7)

### On limitations:
> "One limitation of self-consistency is that it incurs more computation cost. In practice people can try a small number of paths (e.g., 5 or 10) as a starting point to realize most of the gains." (p. 9)

---

## Sampling Parameters Used

| Model | Temperature | Top-k |
|-------|-------------|-------|
| UL2-20B | 0.5 | 40 |
| LaMDA-137B | 0.5 | 40 |
| PaLM-540B | 0.7 | 40 |
| GPT-3 | 0.7 | No truncation |

---

## AIWG Implementation Mapping

| Self-Consistency Element | AIWG Implementation |
|-------------------------|---------------------|
| Multiple reasoning paths | Multiple reviewer agents |
| Diverse sampling | Different agent specializations/perspectives |
| Majority voting | Synthesizer integration with consensus |
| Answer aggregation | Multi-agent review panel decision |
| Uncertainty indicator | Reviewer disagreement signals need for escalation |

### Direct Parallel: Multi-Agent Review Pattern

```
Self-Consistency:                    AIWG Multi-Agent:
  Sample Path 1 → Answer A             Security Reviewer → Findings A
  Sample Path 2 → Answer A             Test Reviewer → Findings B
  Sample Path 3 → Answer B             Quality Reviewer → Findings C
  Majority Vote → Answer A             Synthesizer → Consensus Document
```

### Implementation Recommendations

1. **Review Panel Size**: 3-5 reviewers provides good diversity (similar to 5-10 paths giving most gains)
2. **Diversity is Key**: Different agent specializations matter more than quantity
3. **Disagreement Signals**: When reviewers strongly disagree, escalate to human
4. **Confidence Metric**: Agreement percentage indicates reliability

### Cost-Performance Trade-off

From Figure 2:
- 5 paths: ~80% of maximum gain
- 10 paths: ~90% of maximum gain
- 40 paths: Maximum gain but diminishing returns

**AIWG recommendation**: 3 specialized reviewers + 1 synthesizer balances cost and quality.

---

## Practical Guidance

### When to Use Self-Consistency

1. **High-stakes decisions** requiring verification
2. **Complex reasoning** with multiple valid approaches
3. **When uncertainty matters** - need confidence estimates
4. **Imperfect prompts** - more robust than single-path

### When to Skip Self-Consistency

1. **Simple factual queries** - single path sufficient
2. **Latency-critical** applications
3. **Budget-constrained** inference
4. **Near-perfect baseline** - diminishing returns

---

## Cross-References

| Paper | Relationship |
|-------|-------------|
| **REF-016** | Chain-of-Thought (foundation that self-consistency extends) |
| **REF-007** | Mixture of Experts (ensemble validation principle) |
| **REF-020** | Tree of Thoughts (adds structured search to diverse paths) |
| **REF-021** | Reflexion (adds self-reflection to improve paths) |
| **REF-024** | LATS (combines self-consistency with tree search) |

---

## Related Work (from paper)

### Extends
- Chain-of-Thought prompting (Wei et al., 2022)
- Sampling strategies for open-ended generation

### Differs from
- Verifier training (Cobbe et al., 2021) - no additional training needed
- Re-rankers (Thoppilan et al., 2022) - no human annotation needed
- Model ensembles - single model "self-ensemble"

### Leads to
- Tree of Thoughts (Yao et al., 2023)
- LATS (Zhou et al., 2024)
- Constitutional AI sampling methods

---

## Quick Reference Locations

| Topic | Location |
|-------|----------|
| Core method | Section 2, Figure 1 |
| Aggregation comparison | Table 1 (p. 3) |
| Main results | Tables 2-3 (p. 5) |
| vs. other methods | Section 3.4, Tables 6-7 |
| Robustness studies | Section 3.5, Table 8 |
| Additional examples | Appendix A.2, Tables 12-13 |
| All prompts used | Appendix A.3, Tables 14-21 |

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
| 2026-01-24 | PDF Analysis | Comprehensive update from full 24-page paper review |
