# REF-026: In-Context Learning Survey - AIWG Template Design Analysis

**Source**: `/tmp/research-papers/docs/references/REF-026-in-context-learning-survey.md`

**Citation**: Dong, Q., et al. (2024). A Survey on In-Context Learning. *EMNLP 2024*, 1107-1128.

---

## AIWG Implementation Mapping

| ICL Element | AIWG Implementation | Location |
|-------------|---------------------|----------|
| **Demonstrations** | Template examples (2-4 examples) | All templates in `sdlc-complete/templates/` |
| **Instruction** | Template purpose/header | Template front matter |
| **Format Specification** | Template structure (sections, fields) | Markdown structure in templates |
| **Few-shot** | 2-3 examples per template | Standard across AIWG |
| **Consistent Structure** | Identical format across examples | Voice templates, use case templates |
| **Relevant Selection** | Examples similar to target task | Domain-specific template examples |
| **Ordering** | Simple to complex when applicable | Tutorial sequences |

---

## Template Design Guidelines from ICL Research

### 1. Prioritize Format Consistency (from Finding 1)

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

### 2. Demonstration Selection Strategy (from Section 4.1.1)

- **Use k-NN for domain relevance**: Select examples semantically similar to likely use cases
- **2-4 demonstrations optimal**: Survey shows few-shot (k=1-10) typical; AIWG uses 2-4
- **Diversity regularization**: Avoid redundant examples; ensure variety in complexity

### 3. Simple-to-Complex Ordering (from ICCL, Liu et al., 2024b)

```markdown
## Example 1: Basic Use Case
[Simplest possible instance]

## Example 2: Intermediate Use Case
[More fields, moderate complexity]

## Example 3: Advanced Use Case
[Full complexity, edge cases]
```

### 4. Instruction Clarity (from Section 4.2)

- Include explicit task instruction at template header
- Natural language description of what to create
- Specify expected output format

### 5. Chain-of-Thought for Complex Templates (from Section 4.2)

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

---

## Agent System Prompts and ICL

### Few-Shot Agent Prompts (`sdlc-complete/agents/`)

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

---

## Prompt Engineering Principles for AIWG

### From ICL Research → AIWG Practice

| ICL Principle | AIWG Application |
|---------------|------------------|
| **Format > Content** | Template structure is rigid; content flexible |
| **Order Matters** | Simple examples first in tutorials |
| **Warmup Helps** | Agent "warmup" via system prompt examples |
| **Diversity** | Examples cover different use case types |
| **Relevance** | Examples from same domain as target |
| **Minimal Set** | 2-4 examples, not 10+ |

---

## Key Findings for AIWG

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

### 5. Demonstration Selection: Model-Dependent Effectiveness

**Finding**: Experimental comparison (Table 2, p. 1111) shows demonstration selection methods are **model-dependent**.

**Results**:
| Model | topk | votek | mdl |
|-------|------|-------|-----|
| GPT-2 | 49.5 | 34.9 | **54.4** |
| GPT-J | **63.9** | 50.6 | 63.5 |
| Qwen2 | **69.4** | 67.0 | 69.2 |
| Llama3 | **71.5** | 70.5 | 70.9 |

**Conclusion**: No single selection method dominates; effectiveness depends on model architecture and scale.

---

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

---

## Scoring Functions for AIWG Validation

**Not directly applicable** (AIWG generates documents, not classifications), but conceptually:

- **Direct**: Validate template compliance (structural checks)
- **PPL**: Could use perplexity to detect off-topic content
- **Channel**: Reverse validation (given output, does it match input requirements?)

### Scoring Function Efficiency (Table 4, p. 1126)

**Inference Latency (ms)** with 8 in-context examples:

| Model | Direct | PPL | Channel |
|-------|--------|-----|---------|
| GPT-2 | 44.13 (1.00×) | 114.02 (2.58×) | 157.70 (3.57×) |
| GPT-J | 611.04 (1.00×) | 1766.82 (2.89×) | 1793.27 (2.93×) |
| Qwen2 | 745.89 (1.00×) | 1886.63 (2.53×) | 1957.97 (2.63×) |
| Llama3 | 790.46 (1.00×) | 1935.04 (2.45×) | 1956.21 (2.47×) |

**Takeaway**: Direct scoring is 2.5-3× faster than PPL or Channel; efficiency trade-off for flexibility.

---

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

---

## Critical Insights for AIWG

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

### Open Questions for AIWG

1. **Optimal k for AIWG**: Is 2-4 examples optimal, or should some templates have more?
2. **Domain-Specific vs. Generic**: Should templates be highly domain-specific or more generic?
3. **Example Diversity**: How to balance similarity (relevance) with diversity (coverage)?
4. **Instruction vs. Demonstration**: When to rely on explicit instructions vs. implicit examples?

---

## AIWG References

**Related AIWG Documentation**:
- `@agentic/code/frameworks/sdlc-complete/templates/` - All SDLC templates
- `@agentic/code/addons/voice-framework/voices/templates/` - Voice profile templates
- `@docs/simple-language-translations.md` - Natural language patterns

**Related Research Papers**:
- **REF-025**: Constitutional AI (self-critique patterns similar to ICL's iterative improvement)
- **REF-016**: Chain-of-Thought Prompting (CoT as ICL application)
- **REF-006**: Sweller's Cognitive Load Theory (worked examples parallel to ICL demonstrations)

---

**Document Created**: 2026-01-24
**Analysis Type**: AIWG Template Design and Prompt Engineering Mapping
**Source Paper**: EMNLP 2024
**Core Finding**: Format consistency matters more than label correctness
