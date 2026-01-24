# REF-017 AIWG Analysis: Self-Consistency Reasoning

**Source**: @/tmp/research-papers/documentation/references/REF-017-self-consistency-reasoning.md

**Paper**: Wang, X., Wei, J., Schuurmans, D., Le, Q., Chi, E., Narang, S., Chowdhery, A., & Zhou, D. (2023). Self-Consistency Improves Chain of Thought Reasoning in Language Models. *ICLR 2023*.

**AIWG Relevance**: CRITICAL - validates multi-agent review patterns

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

---

## Key Findings Relevant to AIWG

### Benchmark Results

#### Arithmetic Reasoning (Table 2)

| Task | CoT (Greedy) | + Self-Consistency | Improvement |
|------|--------------|-------------------|-------------|
| GSM8K | 56.5% | 74.4% | **+17.9%** |
| SVAMP | 79.0% | 86.6% | +7.6% |
| AQuA | 35.8% | 48.3% | +12.5% |

#### Commonsense Reasoning (Table 3)

| Task | CoT (Greedy) | + Self-Consistency | Improvement |
|------|--------------|-------------------|-------------|
| CommonsenseQA | 79.0% | 80.7% | +1.7% |
| StrategyQA | 75.3% | 81.6% | +6.3% |
| ARC-challenge | 85.2% | 88.7% | +3.5% |

### Gains Scale with Model Size

| Model | Typical Gain |
|-------|-------------|
| UL2-20B | +3-6% |
| LaMDA-137B | +9-23% |
| GPT-3 (175B) | +9-18% |
| PaLM-540B | +7-18% |

---

## AIWG Application: Multi-Agent Review

### Implementation Recommendations

#### 1. Review Panel Size

From Figure 2: 5-10 paths give most gains

**AIWG recommendation**: 3-5 reviewers provides good diversity
- 5 paths: ~80% of maximum gain
- 10 paths: ~90% of maximum gain
- 40 paths: Maximum gain but diminishing returns

**Cost-Performance Trade-off**: 3 specialized reviewers + 1 synthesizer balances cost and quality.

#### 2. Diversity is Key

> "Diversity of the reasoning paths is the key to a better performance." (p. 7)

**AIWG Implementation**:
- Different agent specializations matter more than quantity
- Security Reviewer (threat focus)
- Test Engineer (quality focus)
- Architect (design focus)
- Each brings unique perspective

#### 3. Disagreement Signals Uncertainty

**Self-Consistency Finding**: Consistency correlates with accuracy

> "One can use self-consistency to provide an uncertainty estimate of the model in its generated solutions... low consistency as an indicator that the model has low confidence." (p. 8)

**AIWG Application**:
- When reviewers strongly disagree, escalate to human
- Agreement percentage indicates reliability
- Low consensus = need for additional review or clarification

#### 4. Simple Majority Voting Works Best

| Strategy | GSM8K | Finding |
|----------|-------|---------|
| Weighted avg (unnormalized) | 56.3 | Worse than baseline |
| Weighted sum (normalized) | 74.1 | Good |
| **Unweighted sum (majority vote)** | **74.4** | Best/simplest |

**AIWG Implication**: Simple majority consensus among reviewers is sufficient - no need for complex weighting schemes.

---

## Answer Aggregation Strategies

### Comparison to Other Methods

#### vs. Sample-and-Rank

Self-consistency significantly outperforms sample-and-rank:
- GSM8K: 24% (self-consistency) vs ~15% (sample-and-rank) at 40 paths
- Gap widens with more samples

**AIWG Application**: Don't just rank reviewer outputs - use consensus/voting.

#### vs. Beam Search

| Method | AQuA (40 paths) |
|--------|-----------------|
| Beam search (top beam) | 10.2% |
| **Self-consistency (sampling)** | **26.9%** |

> "Beam search yields a lower diversity in the outputs... in self-consistency the diversity of the reasoning paths is the key." (p. 7)

**AIWG Application**: Diverse perspectives (specialized agents) outperform similar perspectives (beam search).

#### vs. Ensemble Methods

| Method | GSM8K | SVAMP |
|--------|-------|-------|
| CoT baseline | 17.1% | 38.9% |
| Ensemble (40 permutations) | 19.2% | 42.7% |
| **Self-Consistency (40 paths)** | **27.7%** | **53.3%** |

Self-consistency acts as a "self-ensemble" on a single model.

---

## Practical Guidance for AIWG

### When to Use Multi-Agent Review (Self-Consistency Pattern)

1. **High-stakes decisions** requiring verification
   - Architecture selection
   - Security threat models
   - Production deployment plans

2. **Complex reasoning** with multiple valid approaches
   - API design decisions
   - Risk mitigation strategies
   - Test strategy design

3. **When uncertainty matters** - need confidence estimates
   - Ambiguous requirements clarification
   - Conflicting NFRs resolution

4. **Imperfect prompts** - more robust than single-path
   - User inputs with unclear intent
   - Incomplete specifications

### When to Skip Multi-Agent Review

1. **Simple factual queries** - single path sufficient
   - File lookups
   - Syntax checks
   - Simple validations

2. **Latency-critical** applications
   - Real-time feedback loops

3. **Budget-constrained** inference
   - Low-priority tasks
   - Draft generations

4. **Near-perfect baseline** - diminishing returns
   - Well-defined, routine tasks

---

## Robustness Studies

### Works with Imperfect Prompts (Table 8)

| Condition | GSM8K |
|-----------|-------|
| Correct CoT prompts | 17.1% |
| Imperfect CoT prompts | 14.9% |
| + Self-consistency | **23.4%** |

**AIWG Implication**: Multi-agent review recovers performance even with suboptimal agent definitions.

### Works with Zero-Shot CoT

| Method | GSM8K |
|--------|-------|
| Zero-shot CoT | 43.0% |
| + Self-consistency | **69.2%** (+26.2%) |

**AIWG Implication**: Can use lightweight agents (minimal prompting) with multi-agent consensus and still achieve strong results.

---

## Implementation Pattern for AIWG

### Multi-Agent Review Workflow

```markdown
## Multi-Agent Architecture Review

### Step 1: Generate Review Panel
Invoke specialized reviewers:
- Security Auditor
- Performance Architect
- Maintainability Reviewer

### Step 2: Independent Reviews
Each reviewer analyzes architecture document independently:
- Reviewer 1: [Security findings]
- Reviewer 2: [Performance findings]
- Reviewer 3: [Maintainability findings]

### Step 3: Aggregate Findings
Synthesizer collects all reviews and identifies:
- **Consensus Issues**: All reviewers agree on problems
- **Partial Consensus**: 2/3 reviewers flag same issue
- **Divergent Views**: Reviewers disagree

### Step 4: Resolve or Escalate
- High consensus → Accept finding
- Medium consensus → Request clarification
- Low consensus → Escalate to human or add more reviewers

### Step 5: Generate Consolidated Report
Synthesizer creates final review document with:
- All consensus findings
- Confidence indicators
- Recommendations
```

### Confidence Metric

```python
def calculate_review_confidence(reviews):
    """
    Calculate confidence based on reviewer agreement
    Similar to self-consistency frequency
    """
    finding_counts = {}
    for review in reviews:
        for finding in review.findings:
            key = finding.canonical_form()
            finding_counts[key] = finding_counts.get(key, 0) + 1

    total_reviews = len(reviews)
    confidence_scores = {
        finding: count / total_reviews
        for finding, count in finding_counts.items()
    }

    return confidence_scores
    # High confidence: 80-100% agreement
    # Medium confidence: 60-79% agreement
    # Low confidence: <60% agreement
```

---

## Cross-References to Other AIWG Papers

| Paper | Relationship |
|-------|-------------|
| **REF-016** | Chain-of-Thought (foundation that self-consistency extends) |
| **REF-007** | Mixture of Experts (ensemble validation principle) |
| **REF-020** | Tree of Thoughts (adds structured search to diverse paths) |
| **REF-021** | Reflexion (adds self-reflection to improve paths) |

---

## Key Quotes

> "We propose a new decoding strategy, self-consistency, to replace the naive greedy decoding used in chain-of-thought prompting. It first samples a diverse set of reasoning paths instead of only taking the greedy one, and then selects the most consistent answer by marginalizing out the sampled reasoning paths." (p. 1)

> "We hypothesize that correct reasoning processes, even if they are diverse, tend to have greater agreement in their final answer than incorrect processes." (p. 2)

> "Diversity of the reasoning paths is the key to a better performance." (p. 7)

> "One limitation of self-consistency is that it incurs more computation cost. In practice people can try a small number of paths (e.g., 5 or 10) as a starting point to realize most of the gains." (p. 9)

---

## Document Status

**Created**: 2026-01-24
**Source Paper**: REF-017
**AIWG Priority**: CRITICAL
**Implementation Status**: Active in multi-agent review patterns
**Recommended Review Panel Size**: 3-5 specialized agents
