# REF-026: A Survey on In-Context Learning

## Citation

Dong, Q., Li, L., Dai, D., Zheng, C., Wu, Z., Chang, B., Sun, X., Xu, J., & Sui, Z. (2024). A Survey on In-Context Learning. *Proceedings of the 2024 Conference on Empirical Methods in Natural Language Processing (EMNLP 2024)*, 1107-1128.

**Paper**: [https://aclanthology.org/2024.emnlp-main.64/](https://aclanthology.org/2024.emnlp-main.64/)

## Summary

This comprehensive survey covers in-context learning (ICL)—the ability of LLMs to learn from examples provided in the prompt without parameter updates. The survey covers ICL mechanisms, design choices, applications, and challenges, providing a unified framework for understanding this emergent capability.

### Key Concepts

| Concept | Definition |
|---------|------------|
| **In-Context Learning** | Learning from examples in prompt without training |
| **Demonstrations** | Example input-output pairs in context |
| **Few-Shot** | Small number (1-10) of demonstrations |
| **Zero-Shot** | No demonstrations, instruction only |

### ICL Components

```
Prompt Structure:
┌─────────────────────────────────────────────┐
│ [Instruction]                               │
│ "Classify the sentiment of the text"        │
├─────────────────────────────────────────────┤
│ [Demonstrations]                            │
│ Input: "Great product!" → Output: Positive  │
│ Input: "Terrible service" → Output: Negative│
├─────────────────────────────────────────────┤
│ [Query]                                     │
│ Input: "Works as expected" → Output: ?      │
└─────────────────────────────────────────────┘
```

### Key Findings

1. **Format Matters More Than Labels**: Demonstration structure more important than correctness
2. **Order Sensitivity**: Different orderings produce different results
3. **Scale Enables**: ICL emerges with sufficient model size
4. **Task Transfer**: ICL enables rapid adaptation to new tasks

### Design Factors

| Factor | Impact |
|--------|--------|
| Number of examples | More helps, but saturates quickly |
| Example selection | Relevant examples > random |
| Example ordering | Significant variance between orderings |
| Label correctness | Less important than structure |

## AIWG Application

### Direct Parallel: Template Design

AIWG templates implement ICL patterns:

| ICL Element | AIWG Implementation |
|-------------|---------------------|
| Demonstrations | Template examples |
| Instruction | Template header/purpose |
| Format specification | Template structure |
| Few-shot | 2-3 examples per template |

### Integration Pattern

```markdown
# AIWG Template (ICL-Structured)

## Purpose (Instruction)
Create a use case document following the template structure.

## Examples (Demonstrations)

### Example 1: User Authentication
**Actor**: Registered User
**Goal**: Access protected resources
**Preconditions**: Valid credentials exist
**Main Flow**:
1. User provides credentials
2. System validates credentials
3. System grants access
**Postconditions**: User session established

### Example 2: Password Reset
[Similar structure...]

## Your Task (Query)
Create a use case for: [USER INPUT]
```

### Why ICL Matters for AIWG

1. **Template Design**: ICL research informs example selection
2. **Prompt Engineering**: Structure > exact wording
3. **Agent Prompts**: Few-shot examples in system prompts
4. **Efficiency**: No training needed for new patterns

### Template Design Guidelines (from ICL research)

1. **Consistent Structure**: Keep format identical across examples
2. **Relevant Examples**: Select demonstrations similar to target task
3. **Minimal Set**: 2-4 well-chosen examples often sufficient
4. **Order Testing**: Try different orderings for critical prompts

## Key Quotes

> "In-context learning performs a new task by conditioning on input-output examples, without optimizing any parameters."

> "The label space and the distribution of the input text specified by the demonstrations are both important—regardless of whether the labels are correct for individual inputs."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Template Design | **Critical** - ICL patterns |
| Agent Prompts | **High** - few-shot design |
| Prompt Engineering | **High** - structure guidelines |
| Efficiency | **Medium** - no training needed |

## Cross-References

- **REF-016**: Chain-of-Thought (ICL for reasoning)
- **REF-006**: Sweller CLT (worked examples parallel)
- **Templates**: `agentic/code/frameworks/sdlc-complete/templates/`

## Related Work

- GPT-3: Brown et al. (2020) - ICL emergence
- Chain-of-Thought: Wei et al. (2022) - reasoning ICL
- Rethinking Demonstrations: Min et al. (2022) - format importance

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
