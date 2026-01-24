# REF-016: Chain-of-Thought Prompting Elicits Reasoning in Large Language Models

## Citation

Wei, J., Wang, X., Schuurmans, D., Bosma, M., Ichter, B., Xia, F., Chi, E., Le, Q., & Zhou, D. (2022). Chain-of-Thought Prompting Elicits Reasoning in Large Language Models. *Advances in Neural Information Processing Systems 35 (NeurIPS 2022)*.

**arXiv**: [https://arxiv.org/abs/2201.11903](https://arxiv.org/abs/2201.11903)
**PDF**: `docs/references/pdfs/REF-016-wei-2022-cot.pdf`

## Document Profile

| Attribute | Value |
|-----------|-------|
| Pages | 43 (with appendix) |
| Year | 2022 |
| Venue | NeurIPS 2022 |
| Type | Empirical research |
| AIWG Relevance | **Critical** - foundational for structured reasoning |

## Executive Summary

Chain-of-Thought (CoT) prompting demonstrates that including step-by-step reasoning examples in few-shot prompts dramatically improves LLM performance on complex reasoning tasks. The key insight is that **reasoning ability is emergent at scale** - CoT only helps models >100B parameters and actually hurts smaller models.

**Core technique**: Instead of `<input, output>` exemplars, use `<input, chain of thought, output>` triples where the chain of thought is a series of intermediate natural language reasoning steps.

---

## Key Findings

### 1. Emergent Ability of Scale

| Model Size | CoT Effect |
|------------|-----------|
| <10B | **Hurts** performance |
| 10B-100B | Marginal/inconsistent |
| >100B | **Significant improvement** |

> "Chain-of-thought prompting is an emergent ability of model scale—it does not positively impact performance until used with a model of sufficient scale." (p. 4)

### 2. Benchmark Results (PaLM 540B)

| Task | Standard | + CoT | Improvement |
|------|----------|-------|-------------|
| GSM8K (math) | 17.9% | 56.9% | **+39.0%** |
| SVAMP (math) | 69.4% | 79.0% | +9.6% |
| ASDiv (math) | 72.1% | 73.9% | +1.8% |
| MAWPS (math) | 79.2% | 93.3% | +14.2% |
| StrategyQA | 68.6% | 77.8% | +9.2% |
| Date Understanding | 49.0% | 65.3% | +16.3% |
| Sports Understanding | 80.5% | 95.4% | +14.9% |

### 3. Complexity Correlation

> "Chain-of-thought prompting has larger performance gains for more-complicated problems." (p. 5)

- GSM8K (multi-step, low baseline): +39% improvement
- SingleOp (single-step, high baseline): Minimal improvement

---

## Four Properties of Chain-of-Thought

### 1. Decomposition
Allows models to break multi-step problems into intermediate steps, allocating additional computation to harder problems.

### 2. Interpretability
Provides a window into model behavior, showing how it arrived at an answer and where reasoning went wrong.

### 3. Generality
Applicable to any task humans solve via language:
- Arithmetic reasoning
- Commonsense reasoning
- Symbolic manipulation

### 4. Simplicity
No training required - works with off-the-shelf models via prompting alone.

---

## Ablation Study Results (Section 3.3)

| Ablation | GSM8K Effect | Finding |
|----------|-------------|---------|
| **Equation only** | Minimal help | Natural language semantics needed, not just math |
| **Variable compute only** (dots) | Same as baseline | It's not just extra tokens that help |
| **CoT after answer** | Same as baseline | Sequential reasoning matters, not just knowledge activation |
| **Full CoT** | +39% | The combination of decomposition + natural language is key |

**Key insight**: The benefit comes from the actual reasoning process, not from:
- Just producing equations
- Just having more output tokens
- Just activating relevant knowledge

---

## Error Analysis (Appendix D)

### Correct Chains of Thought (50 samples)
- 48/50 (96%): Completely correct logic and math
- 2/50: Coincidentally arrived at correct answer

### Incorrect Chains of Thought (50 samples)

| Error Type | Percentage | Fixable? |
|------------|-----------|----------|
| Calculator error only | 8% | Yes (external calculator) |
| Symbol mapping error | 16% | Partially |
| One step missing | 22% | Potentially |
| Semantic understanding | 54% | Requires model improvement |

**Scaling fixes errors**: Analysis of PaLM 62B vs 540B showed that scaling fixes many one-step missing and semantic understanding errors.

---

## Robustness Studies (Section 3.4 & Appendix A.2)

### Robust to Different Annotators
Three annotators wrote CoT for same exemplars - all outperformed baseline significantly.

### Robust to Different Exemplars
Randomly sampled exemplars from GSM8K training set worked comparably to hand-crafted ones.

### Robust to Exemplar Order
Low variance across different orderings of few-shot exemplars.

### Robust to Number of Exemplars
1-8 exemplars all showed improvement over standard prompting.

---

## When CoT Helps Most (Appendix A.3)

Three conditions predict maximum benefit:

1. **Task is challenging** - requires multi-step reasoning
2. **Large model** - >100B parameters
3. **Flat scaling curve** - standard prompting doesn't improve with scale

---

## Key Quotes for Citation

### On the core contribution:
> "We explore how generating a chain of thought—a series of intermediate reasoning steps—significantly improves the ability of large language models to perform complex reasoning." (p. 1)

### On emergence:
> "Chain-of-thought prompting is an emergent ability of model scale... chain of thought actually hurts performance for most models smaller than 10B parameters." (p. 4)

### On decomposition:
> "Chain of thought, in principle, allows models to decompose multi-step problems into intermediate steps, which means that additional computation can be allocated to problems that require more reasoning steps." (p. 3)

### On natural language:
> "There appears to be utility from expressing intermediate steps via natural language." (p. 6)

### On limitations:
> "Although chain of thought emulates the thought processes of human reasoners, this does not answer whether the neural network is actually 'reasoning,' which we leave as an open question." (p. 9)

---

## AIWG Implementation Mapping

| CoT Element | AIWG Implementation |
|-------------|---------------------|
| Exemplar steps | Template structure with numbered procedures |
| Intermediate outputs | Phase artifacts (requirements → design → code) |
| Explicit reasoning | Agent system prompts with reasoning patterns |
| Decomposition | Task breakdown in orchestration flows |

### Why AIWG Benefits

1. **Template Design**: Structured templates encode CoT-style step-by-step thinking
2. **Flow Commands**: `/flow-*` commands encode multi-step procedures as exemplars
3. **Artifact Progression**: Each phase output is an "intermediate step"
4. **Review Prompts**: Request explicit reasoning in agent feedback

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

---

## Cross-References

| Paper | Relationship |
|-------|-------------|
| **REF-005** | Miller (1956) - Chunking aligns with CoT steps (7±2 rule) |
| **REF-006** | Sweller (1988) - Worked examples parallel CoT exemplars |
| **REF-017** | Self-Consistency extends CoT with multi-path sampling |
| **REF-020** | Tree of Thoughts adds branching/backtracking to CoT |
| **REF-018** | ReAct interleaves CoT with tool use |

---

## Related Work (from paper)

### Extends
- Ling et al. (2017) - Rationale-augmented training
- Cobbe et al. (2021) - Verifiers for math problems
- Nye et al. (2021) - Scratchpads for computation

### Leads to
- Zero-Shot CoT: "Let's think step by step" (Kojima et al., 2022)
- Self-Consistency (Wang et al., 2023)
- Tree of Thoughts (Yao et al., 2023)

---

## Quick Reference Locations

| Topic | Location |
|-------|----------|
| Core method | Section 2, Figure 1 |
| Arithmetic experiments | Section 3 |
| Commonsense experiments | Section 4 |
| Symbolic experiments | Section 5 |
| Ablation studies | Section 3.3, Figure 5 |
| Error analysis | Appendix D |
| All prompts used | Appendix G (Tables 20-28) |

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
| 2026-01-24 | PDF Analysis | Comprehensive update from full paper review |
