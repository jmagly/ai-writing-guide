# REF-026: A Survey on In-Context Learning

## Citation

Dong, Q., Li, L., Dai, D., Zheng, C., Ma, J., Li, R., Xia, H., Xu, J., Wu, Z., Chang, B., Sun, X., Li, L., & Sui, Z. (2024). A Survey on In-Context Learning. *Proceedings of the 2024 Conference on Empirical Methods in Natural Language Processing (EMNLP 2024)*, 1107-1128.

**Paper**: [https://aclanthology.org/2024.emnlp-main.64/](https://aclanthology.org/2024.emnlp-main.64/)

**arXiv**: [https://arxiv.org/abs/2301.00234](https://arxiv.org/abs/2301.00234)

## Document Profile

| Attribute | Value |
|-----------|-------|
| Pages | 22 (1107-1128 in proceedings) |
| Year | 2024 (arXiv: 2022, published 2024) |
| Venue | EMNLP 2024 (Conference on Empirical Methods in Natural Language Processing) |
| Type | Comprehensive survey paper |
| AIWG Relevance | **Critical** - Foundational for template design, prompt engineering, few-shot patterns |

## Executive Summary

This comprehensive survey examines **in-context learning (ICL)** - the ability of large language models to learn tasks from a few examples provided in the prompt without parameter updates. The paper presents the first systematic survey of ICL research, covering formal definitions, training strategies, prompt design techniques, theoretical analysis, and applications across modalities.

**Core Finding**: ICL enables LLMs to perform complex tasks by learning from analogy through demonstration examples. The effectiveness of ICL depends critically on: (1) demonstration selection and ordering, (2) instruction formatting, (3) model pretraining characteristics, and (4) understanding that format matters more than label correctness.

**AIWG Significance**: ICL research directly informs AIWG's template design philosophy. The finding that "demonstration structure is more important than label correctness" validates AIWG's emphasis on consistent template formats with well-structured examples. The survey's taxonomy of demonstration selection, reformatting, and ordering provides empirical grounding for AIWG's few-shot template patterns.

## Key Concepts

### 1. In-Context Learning (ICL)

**Definition**: "A paradigm that allows language models to learn tasks given only a few examples in the form of demonstration." (p. 1108)

ICL differs from traditional learning:
- **No parameter updates** - Model weights remain frozen
- **Learning from analogy** - Similar to human reasoning by example
- **Training-free** - Adapts to new tasks without gradient descent

**Formal Definition**:
```
P(y_j | x) = f_M(y_j, C, x)

where:
- C = demonstration set {I, s(x1,y1), ..., s(xk,yk)}
- I = optional task instruction
- s(xi,yi) = example formatted in natural language
- f_M = scoring function
```

### 2. Demonstration Components

**Prompt Structure** (Figure 1, p. 1107):
```
[Instruction] (optional)
"Classify the sentiment of the text"

[Demonstrations] (k examples)
Review: "Delicious food!" Sentiment: Positive
Review: "The food is awful." Sentiment: Negative
...

[Query]
Review: "Good meal!" Sentiment: ?
```

### 3. ICL Taxonomy (Figure 2, p. 1108)

The survey organizes ICL research into three stages:

**Training Stage**:
- **Pre-training**: Reorganizing corpora for ICL (PICL, ICLM)
- **Warmup**: Instruction tuning, meta-learning (MetaICL, FLAN)

**Inference Stage**:
- **Demonstration Organization**: Selection, reformatting, ordering
- **Instruction Formatting**: Task descriptions, chain-of-thought
- **Scoring Functions**: Direct, PPL, Channel models

**Analysis**:
- **Influencing Factors**: Pre-training data, model architecture, demonstration properties
- **Learning Mechanisms**: Induction heads, Bayesian inference, gradient descent analogy

### 4. Demonstration Selection Methods

**Unsupervised Methods**:
- **KATE** (k-Nearest Neighbors): Select demonstrations similar to query
- **Mutual Information**: Choose examples maximizing MI with query
- **Perplexity-based**: Use LLM perplexity scores for selection
- **Votek**: Graph-based diverse and representative selection

**Supervised Methods**:
- **EPR**: Train dense retriever with task-specific supervision
- **Q-Learning**: Frame selection as Markov decision process
- **AdaICL**: Model-adaptive selection using uncertainty scores

### 5. Scoring Functions (Table 3, p. 1111)

| Method | Target | Efficiency | Coverage | Stability |
|--------|--------|-----------|----------|-----------|
| **Direct** | M(y_j \| C, x) | +++ (fastest) | + (local tokens) | + (sensitive) |
| **PPL** | PPL(S_j) | + (slower) | +++ (all tokens) | + (sensitive) |
| **Channel** | M(x \| C, y_j) | + (slower) | + (local tokens) | ++ (more stable) |

**Key Trade-offs**:
- **Direct**: Fast but restricts template design (answer must be at end)
- **PPL**: Universal but computationally expensive
- **Channel**: Robust under imbalanced data but requires generating full input

### 6. Emergent Abilities

**Scale-dependent ICL** (Wei et al., 2022b):
- ICL capability emerges at certain model scale thresholds
- Both model parameters and pretraining steps matter
- Demonstrates "emergent abilities" of large language models

### 7. Chain-of-Thought (CoT) in ICL

**CoT Prompting** (Wei et al., 2022c):
- Adds intermediate reasoning steps between input and output
- Significantly improves performance on complex reasoning tasks
- Example: Math word problems, commonsense reasoning

**Auto-CoT Methods**:
- LLMs can generate reasoning paths automatically
- Self-consistency improves CoT reliability
- Least-to-most prompting for compositional tasks

## Key Findings

### 1. Format Matters More Than Label Correctness

**Finding**: "The label space and the distribution of the input text specified by the demonstrations are both important—regardless of whether the labels are correct for individual inputs." (Min et al., 2022c, cited p. 1113)

**Evidence**:
- Experiments show ICL works even with random labels if format is consistent
- Input distribution and label space matter more than individual correctness
- Later studies qualified this: accurate mappings DO help, but format is critical baseline

**Implications for AIWG**: Template structure consistency is paramount; examples serve to establish format patterns.

### 2. Demonstration Order Sensitivity

**Finding**: "Order sensitivity is a common problem and always exists for various models." (Lu et al., 2022, p. 1111)

**Evidence**:
- Different orderings of the same demonstrations produce significantly different results
- Global and local entropy metrics correlate with ICL performance
- Simple-to-complex ordering (ICCL) improves performance

**Design Strategies**:
- **GlobalE & LocalE**: Use entropy metrics to determine optimal ordering
- **ICCL**: Arrange from simple to complex examples
- **Proximity-based**: Closest example as rightmost demonstration

### 3. Model Warmup Enhances ICL

**Finding**: "All these warmup methods improve the ICL capability by updating the model parameters, which implies that the ICL capability of the original LLMs has great potential for improvement." (p. 1124)

**Warmup Methods**:
- **Instruction Tuning (FLAN)**: 60+ datasets with natural language instructions
- **MetaICL**: Multi-task learning with demonstration formats
- **Symbol Tuning**: Replace natural labels with arbitrary symbols (e.g., "foo/bar")

**Performance Gains**:
- FLAN improves zero-shot and few-shot on unseen tasks
- Scaling to 1000+ instructions further improves generalization
- Warmup plateau: Small amounts of data sufficient for adaptation

### 4. Pretraining Data Distribution Critical

**Finding**: "ICL capability emerges when the training data exhibits specific distributional properties, such as burstiness, wherein items appear in clusters rather than being uniformly distributed." (Chan et al., 2022, p. 1112)

**Contributing Factors**:
- **Diversity**: Multiple corpora more important than size alone
- **Burstiness**: Clustered examples better than uniform distribution
- **Domain**: Source domain matters more than corpus size
- **Task Diversity Threshold**: Beyond threshold, strong generalization emerges

### 5. Induction Heads as Functional Mechanism

**Finding**: "Specific attention heads, referred to as 'induction heads', can replicate previous patterns for next-token prediction, thus progressively developing ICL capabilities." (Olsson et al., 2022, p. 1113)

**Mechanism**:
- Induction heads identify and copy patterns from demonstrations
- Computational layers show information flow: demonstrations → labels → prediction
- Label words serve as "anchors" aggregating information

**Theoretical Importance**: Provides mechanistic explanation for how ICL works at the architecture level.

### 6. ICL as Implicit Bayesian Inference

**Finding**: "ICL is explained as implicit Bayesian inference, where models perform ICL by identifying a shared latent concept among examples." (Xie et al., 2022; Jiang, 2023, p. 1113)

**Bayesian Framework**:
```
P(y | x, D) = ∫ P(y | x, θ) P(θ | D) dθ

where:
- D = demonstration set
- θ = latent concept/task
- P(θ | D) = posterior over concepts given demonstrations
```

**Interpretation**: LLMs infer task concept from demonstrations and apply to query.

### 7. ICL Resembles Gradient Descent

**Finding**: "GPT-based ICL behaves similarly to explicit finetuning from multiple perspectives." (Dai et al., 2023a, p. 1113)

**Dual Form**:
- Transformer attention has dual form with gradient descent
- One step of gradient descent is provably optimal for linear self-attention
- ICL can be viewed as "meta-optimizers" performing implicit gradient descent

**Controversy**: Simplified settings (linear regression) may not fully generalize to real-world scenarios.

### 8. Demonstration Selection: Model-Dependent Effectiveness

**Finding**: Experimental comparison (Table 2, p. 1111) shows demonstration selection methods are **model-dependent**.

**Results**:
| Model | topk | votek | mdl |
|-------|------|-------|-----|
| GPT-2 | 49.5 | 34.9 | **54.4** |
| GPT-J | **63.9** | 50.6 | 63.5 |
| Qwen2 | **69.4** | 67.0 | 69.2 |
| Llama3 | **71.5** | 70.5 | 70.9 |

**Conclusion**: No single selection method dominates; effectiveness depends on model architecture and scale.

## Benchmark and Experimental Results

### Demonstration Selection Comparison (Table 2, p. 1111)

**Datasets**: SST-5, SST-2, CommonsenseQA, SNLI, AG News (8 demonstrations)

**Average Performance**:
- **GPT-2**: topk (49.5) < **mdl (54.4)**
- **GPT-J**: topk (63.9) ≈ **mdl (63.5)** > votek (50.6)
- **Qwen2**: **topk (69.4)** ≈ mdl (69.2) > votek (67.0)
- **Llama3**: **topk (71.5)** > mdl (70.9) > votek (70.5)

**Takeaway**: Simple topk (k-nearest neighbors) performs competitively or best for larger models; mdl excels for smaller models.

### Scoring Function Efficiency (Table 4, p. 1126)

**Inference Latency (ms)** with 8 in-context examples:

| Model | Direct | PPL | Channel |
|-------|--------|-----|---------|
| GPT-2 | 44.13 (1.00×) | 114.02 (2.58×) | 157.70 (3.57×) |
| GPT-J | 611.04 (1.00×) | 1766.82 (2.89×) | 1793.27 (2.93×) |
| Qwen2 | 745.89 (1.00×) | 1886.63 (2.53×) | 1957.97 (2.63×) |
| Llama3 | 790.46 (1.00×) | 1935.04 (2.45×) | 1956.21 (2.47×) |

**Takeaway**: Direct scoring is 2.5-3× faster than PPL or Channel; efficiency trade-off for flexibility.

### Scoring Function Stability (Table 5, p. 1126)

**Variance across 5 random seeds** (lower = more stable):

| Model | Direct | PPL | Channel |
|-------|--------|-----|---------|
| GPT-2 | 1.12 | 0.85 | 3.18 |
| GPT-J | 1.00 | 0.77 | 4.06 |
| Qwen2 | 0.72 | **0.70** | 2.43 |
| Llama3 | 0.89 | **0.78** | 2.43 |
| **Average** | 0.93 | **0.78** | 3.03 |

**Takeaway**: PPL is most stable (0.78 avg variance); Channel is least stable (3.03), suggesting sensitivity to demonstration changes.

### New Challenging Benchmarks (Table 6, p. 1126)

| Benchmark | Tasks | Focus |
|-----------|-------|-------|
| **BIG-Bench** | 204 | Mixed tasks across domains |
| **BBH** (BIG-Bench Hard) | 23 | Unsolved problems where LLMs fail |
| **PRONTOQA** | 1 | Logical reasoning and QA |
| **MGSM** | 1 | Multilingual math reasoning |
| **LLMAS** | 8 | Planning and reasoning about change |
| **OPT-IML Bench** | 2000 | Cross-task generalization |

**Progress**: Best models now outperform average human raters on 65% of BIG-Bench tasks via ICL.

## Key Quotes for Citation

> "In-context learning is a paradigm that allows language models to learn tasks given only a few examples in the form of demonstration." (p. 1108)

> "The key idea of in-context learning is to learn from analogy." (p. 1107)

> "Different from supervised learning, which requires a training stage that uses backward gradients to update model parameters, ICL does not perform parameter updates. The model is expected to learn the pattern hidden in the demonstration and accordingly make the right prediction." (p. 1107)

> "The label space and the distribution of the input text specified by the demonstrations are both important—regardless of whether the labels are correct for individual inputs." (Min et al., 2022c, as cited on p. 1113)

> "Order sensitivity is a common problem and always exists for various models." (Lu et al., 2022, p. 1111)

> "Specific attention heads, referred to as 'induction heads', can replicate previous patterns for next-token prediction, thus progressively developing ICL capabilities." (Olsson et al., 2022, p. 1113)

> "GPT-based ICL behaves similarly to explicit finetuning from multiple perspectives." (Dai et al., 2023a, discussing gradient descent analogy, p. 1113)

> "All these warmup methods improve the ICL capability by updating the model parameters, which implies that the ICL capability of the original LLMs has great potential for improvement." (Takeaway on training, p. 1124)

> "Format matters more than label correctness" (Paraphrase of Min et al. findings, Section 5.1.2)

> "ICL heavily relies on high-quality demonstrations selected from annotated examples, which are often scarce in low-resource languages and tasks." (Challenge: Generalization, p. 1114)

## AIWG Implementation Mapping

### Direct Application to AIWG Templates

| ICL Element | AIWG Implementation | Location |
|-------------|---------------------|----------|
| **Demonstrations** | Template examples (2-4 examples) | All templates in `sdlc-complete/templates/` |
| **Instruction** | Template purpose/header | Template front matter |
| **Format Specification** | Template structure (sections, fields) | Markdown structure in templates |
| **Few-shot** | 2-3 examples per template | Standard across AIWG |
| **Consistent Structure** | Identical format across examples | Voice templates, use case templates |
| **Relevant Selection** | Examples similar to target task | Domain-specific template examples |
| **Ordering** | Simple to complex when applicable | Tutorial sequences |

### Template Design Guidelines from ICL Research

**1. Prioritize Format Consistency** (from Finding 1):
```markdown
# AIWG Template Pattern

## Example 1: [Simple Case]
**Field A**: Value
**Field B**: Value
**Outcome**: Result

## Example 2: [Moderate Case]
**Field A**: Value  # Same structure
**Field B**: Value  # Same structure
**Outcome**: Result

## Your Task
**Field A**: [USER INPUT]
**Field B**: [USER INPUT]
**Outcome**: ?
```

**Rationale**: Format consistency matters more than individual example perfection. AIWG templates should maintain identical structure across all examples.

**2. Demonstration Selection Strategy** (from Section 4.1.1):
- **Use k-NN for domain relevance**: Select examples semantically similar to likely use cases
- **2-4 demonstrations optimal**: Survey shows few-shot (k=1-10) typical; AIWG uses 2-4
- **Diversity regularization**: Avoid redundant examples; ensure variety in complexity

**3. Simple-to-Complex Ordering** (from ICCL, Liu et al., 2024b):
```markdown
## Example 1: Basic Use Case
[Simplest possible instance]

## Example 2: Intermediate Use Case
[More fields, moderate complexity]

## Example 3: Advanced Use Case
[Full complexity, edge cases]
```

**4. Instruction Clarity** (from Section 4.2):
- Include explicit task instruction at template header
- Natural language description of what to create
- Specify expected output format

**5. Chain-of-Thought for Complex Templates** (from Section 4.2):
```markdown
## Example with Reasoning Steps

**Requirement**: User needs secure authentication

**Analysis**:
1. Identify actors (User, System)
2. Determine preconditions (valid credentials exist)
3. Map main flow steps
4. Consider error cases

**Output**: [Complete use case]
```

### Agent System Prompts and ICL

**Few-Shot Agent Prompts** (`sdlc-complete/agents/`):

```markdown
# Test Engineer Agent

## Your Role
You are a test engineer specializing in test strategy and test case design.

## Example 1: Unit Test Strategy
**Given**: User authentication module
**Test Approach**:
- Test valid credentials → expect success
- Test invalid credentials → expect failure
- Test edge cases (empty, special characters)
**Output**: [Detailed test cases]

## Example 2: Integration Test Strategy
[Similar structure...]

## Your Task
Given the following requirement, create a test strategy...
```

**Application**: Agent definitions use ICL patterns with 1-3 examples to establish behavior.

### Prompt Engineering Principles for AIWG

**From ICL Research → AIWG Practice**:

| ICL Principle | AIWG Application |
|---------------|------------------|
| **Format > Content** | Template structure is rigid; content flexible |
| **Order Matters** | Simple examples first in tutorials |
| **Warmup Helps** | Agent "warmup" via system prompt examples |
| **Diversity** | Examples cover different use case types |
| **Relevance** | Examples from same domain as target |
| **Minimal Set** | 2-4 examples, not 10+ |

### Scoring Functions for AIWG Validation

**Not directly applicable** (AIWG generates documents, not classifications), but conceptually:

- **Direct**: Validate template compliance (structural checks)
- **PPL**: Could use perplexity to detect off-topic content
- **Channel**: Reverse validation (given output, does it match input requirements?)

## Integration with AIWG Workflows

### 1. Template Creation Workflow

**ICL-Informed Process**:
1. **Define task instruction** (clear, natural language)
2. **Select 2-4 representative examples** (diverse but relevant)
3. **Order simple → complex**
4. **Ensure identical structure** across examples
5. **Test with minimal set** (don't over-provide examples)

### 2. Agent Prompt Engineering

**Few-Shot Agent Design**:
```markdown
# [Agent Name]

You are a [role] specializing in [domain].

## Example Interaction 1
**User Request**: [Simple request]
**Your Response**: [Ideal response showing format, tone, content]

## Example Interaction 2
**User Request**: [More complex request]
**Your Response**: [Ideal response with reasoning steps]

## Now Handle
**User Request**: [Actual user input]
```

**Rationale**: Agents learn behavior from demonstration examples (ICL), not just instruction.

### 3. Quality Gate Checklists

**ICL-Inspired Checklist Pattern**:
```markdown
# Security Review Gate

## Example 1: Authentication Review
- [ ] Verify authentication mechanism documented
- [ ] Check credential storage security
- [ ] Validate session management
**Result**: PASS

## Example 2: Data Protection Review
[Similar checklist...]
**Result**: PASS with conditions

## Your Review
[Apply same checklist to your artifact]
```

## Challenges and Future Directions (from Section 7)

### 1. Efficiency and Scalability

**Challenge**: "The use of demonstrations in ICL introduces two challenges: (1) higher computational costs with an increasing number of demonstrations (efficiency), and (2) fewer learnable samples due to the maximum input length of LLMs (scalability)." (p. 1114)

**AIWG Consideration**: Templates should remain concise; avoid bloating with excessive examples.

### 2. Generalization to Low-Resource Scenarios

**Challenge**: "ICL heavily relies on high-quality demonstrations selected from annotated examples, which are often scarce in low-resource languages and tasks." (p. 1114)

**AIWG Relevance**: Cross-task ICL could enable templates designed for one domain (e.g., web apps) to adapt to another (e.g., embedded systems) with minimal examples.

### 3. Long-Context ICL

**Challenge**: "Researchers have found that increasing the number of demonstrations does not necessarily enhance performance and may even be detrimental." (p. 1115)

**AIWG Practice**: Current practice of 2-4 examples appears optimal; avoid template bloat.

### 4. Understanding ICL Mechanisms

**Challenge**: "Despite preliminary explanations (Dai et al., 2023a; Jiang, 2023), the underlying working mechanism of ICL remains unclear and requires further investigation." (p. 1108)

**Research Opportunity**: Better mechanistic understanding could improve AIWG template design.

## Cross-References

### Related AIWG References

- **REF-025**: Constitutional AI - Self-critique patterns (similar to ICL's iterative improvement)
- **REF-016**: Chain-of-Thought Prompting - CoT as ICL application
- **REF-006**: Sweller's Cognitive Load Theory - Worked examples parallel to ICL demonstrations

### Related Papers in Survey

**Foundational ICL**:
- Brown et al. (2020) - GPT-3: Few-Shot Learners (ICL emergence)
- Wei et al. (2022c) - Chain-of-Thought Prompting (reasoning ICL)
- Min et al. (2022c) - Rethinking Demonstrations (format importance)

**Demonstration Selection**:
- Liu et al. (2022) - KATE: k-NN retrieval for ICL
- Rubin et al. (2022) - EPR: Supervised retrieval
- Su et al. (2023) - Votek: Graph-based diverse selection

**Theoretical Understanding**:
- Dai et al. (2023a) - ICL as Gradient Descent
- Xie et al. (2022) - ICL as Bayesian Inference
- Olsson et al. (2022) - Induction Heads mechanism

**Training Enhancements**:
- Wei et al. (2022a) - FLAN: Instruction tuning
- Min et al. (2022b) - MetaICL: Meta-learning for ICL
- Wei et al. (2023a) - Symbol Tuning: Decouple format from semantics

## Quick Reference: Topic → Section/Page

| Topic | Section | Page(s) |
|-------|---------|---------|
| **ICL Definition** | §2 Definition and Formulation | 1108-1109 |
| **Demonstration Selection** | §4.1.1 | 1110 |
| **Demonstration Reformatting** | §4.1.2 | 1110-1111 |
| **Demonstration Ordering** | §4.1.3 | 1111 |
| **Instruction Formatting** | §4.2 | 1111-1112 |
| **Scoring Functions** | §4.3 | 1112 |
| **Pretraining Factors** | §5.1.1 | 1112 |
| **Inference Factors** | §5.1.2 | 1113 |
| **Induction Heads** | §5.2.1 | 1113 |
| **Bayesian Interpretation** | §5.2.2 | 1113 |
| **Gradient Descent View** | §5.2.2 | 1113-1114 |
| **Applications** | §6 | 1114 |
| **Challenges** | §7 | 1114-1115 |
| **Experimental Comparison** | Appendix B | 1125-1126 |
| **Takeaways** | Appendix A | 1124-1125 |
| **Beyond Text (Vision, Speech)** | Appendix D | 1127-1128 |

## Methodological Details

### Taxonomy Construction

**Approach**: Literature review with hierarchical categorization (Figure 2, p. 1108)

**Three Dimensions**:
1. **Training**: Pre-training, Warmup
2. **Inference**: Demonstration (selection, reformatting, ordering), Instruction, Scoring
3. **Analysis**: Influencing Factors (pretraining stage, inference stage), Learning Mechanism (functional modules, theoretical interpretation)

### Experimental Setup (Appendix B)

**Models Tested**: GPT-2, GPT-J, Llama3-8B-Instruct, Qwen2-7B-Instruct

**Datasets**: SST-2, SST-5, CommonsenseQA, AG News, SNLI

**Configuration**:
- 8 demonstrations per task
- 1000 training examples for retrieval
- 1000 test examples for evaluation
- PPL-based scoring function
- Framework: OpenICL

**Metrics**:
- **Accuracy**: Classification performance
- **Efficiency**: Inference latency (ms)
- **Stability**: Variance across 5 random seeds

## Limitations and Scope

**Survey Limitations** (from Section 8, p. 1115):

1. **Coverage**: "Given the extensive body of related work, particularly in demonstration design and the principle analysis of ICL, we may have overlooked some equally valuable contributions."

2. **Recency**: "Many papers covered by this survey did not utilize the most up-to-date models while running experiments."

3. **Scope**: Survey focuses on NLP; visual/speech ICL covered briefly in Appendix D

**Out of Scope**:
- Detailed prompt engineering beyond ICL
- Full coverage of multimodal ICL
- Production deployment considerations
- Cost-benefit analysis of ICL vs fine-tuning

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial comprehensive reference entry |

## Notes for AIWG Implementation

### High-Priority Takeaways

1. **Template Design**: Use 2-4 examples with identical structure (format > content)
2. **Example Ordering**: Simple to complex when applicable
3. **Agent Prompts**: Few-shot examples in system prompts establish behavior
4. **Instruction Clarity**: Explicit task descriptions at template headers
5. **Demonstration Selection**: Choose examples relevant to target domain

### Medium-Priority Considerations

1. **Warmup for Agents**: Could pre-tune agent models on AIWG-specific tasks
2. **CoT in Complex Templates**: Add reasoning steps for architecture decisions, risk analysis
3. **Scoring Functions**: Consider template validation approaches inspired by ICL scoring
4. **Long-Context Trade-offs**: Monitor when adding more examples hurts vs. helps

### Low-Priority (Research Directions)

1. **Meta-Learning**: Could AIWG learn optimal template structures from usage data?
2. **Automatic Template Generation**: Use LLMs to generate templates from task descriptions
3. **Cross-Task Transfer**: Can templates designed for one domain adapt to others?
4. **Theoretical Understanding**: Apply gradient descent or Bayesian interpretations to understand why AIWG templates work

### Open Questions for AIWG

1. **Optimal k for AIWG**: Is 2-4 examples optimal, or should some templates have more?
2. **Domain-Specific vs. Generic**: Should templates be highly domain-specific or more generic?
3. **Example Diversity**: How to balance similarity (relevance) with diversity (coverage)?
4. **Instruction vs. Demonstration**: When to rely on explicit instructions vs. implicit examples?

## Further Reading

**If interested in...**

- **Demonstration Selection**: Liu et al. (2022) KATE, Rubin et al. (2022) EPR
- **Theoretical Mechanisms**: Dai et al. (2023a) Gradient Descent, Xie et al. (2022) Bayesian
- **Chain-of-Thought**: Wei et al. (2022c), Zhang et al. (2023c)
- **Instruction Tuning**: Wei et al. (2022a) FLAN, Chung et al. (2022) Scaling Instructions
- **Practical Prompting**: Li (2023) Practical Survey on Prompt Design
- **Retrieved Demonstrations**: Xu et al. (2024) Survey on Retrieval for ICL
