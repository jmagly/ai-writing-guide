# REF-009: Neural Turing Machines

## Citation

Graves, A., Wayne, G., & Danihelka, I. (2014). Neural Turing Machines. arXiv:1410.5401.

**arXiv**: [https://arxiv.org/abs/1410.5401](https://arxiv.org/abs/1410.5401)

**Link**: [DeepMind](https://www.deepmind.com/publications/neural-turing-machines)

## Summary

Introduces Neural Turing Machines (NTMs), neural networks coupled to external memory that they can read from and write to via attention mechanisms. NTMs can learn simple algorithms from examples (copying, sorting, recall) by developing memory access patterns. This work established the foundation for external memory in neural networks.

### Key Concepts

| Concept | Definition |
|---------|------------|
| **External Memory** | Differentiable memory matrix separate from network weights |
| **Read/Write Heads** | Attention mechanisms for memory access |
| **Content Addressing** | Retrieve by similarity to query |
| **Location Addressing** | Retrieve by position/offset |

### Architecture

```
Controller (LSTM/FFN)
      ↓ ↑
  Read/Write Heads
      ↓ ↑
 External Memory Bank
    [M₁][M₂][M₃]...
```

### Key Findings

1. **Algorithmic Learning**: NTMs learn copy, sort, and recall algorithms from I/O examples
2. **Generalization**: Learned algorithms generalize to longer sequences than trained on
3. **Memory Patterns**: Networks develop interpretable memory access patterns
4. **Differentiability**: Entire system trainable end-to-end via backpropagation

## AIWG Application

### Conceptual Foundation for .aiwg/

While AIWG doesn't use neural memory, the NTM paper establishes **why external memory matters for intelligent systems**:

| NTM Principle | AIWG Implementation |
|---------------|---------------------|
| Working memory has limits | Artifacts externalize knowledge |
| Memory enables algorithms | Templates encode procedures |
| Read/write operations | Create/update/reference artifacts |
| Content addressing | @-mention semantic lookup |
| Location addressing | Path-based file organization |

### Memory-Augmented Reasoning

NTMs showed that memory access enables multi-step reasoning. AIWG applies this:

```
Traditional LLM:
Query → Single-pass generation → Output

Memory-Augmented (AIWG):
Query → Load context → Generate → Store → Reference → Refine → Output
```

## Key Quotes

> "We extend the capabilities of neural networks by coupling them to external memory resources, which they can interact with by attentional processes."

> "The combined system is analogous to a Turing Machine or Von Neumann architecture but is differentiable end-to-end."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Memory Architecture | **High** - theoretical foundation |
| Context Management | **Medium** - attention parallels |

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
