# REF-005: The Magical Number Seven, Plus or Minus Two

## Citation

Miller, G. A. (1956). The magical number seven, plus or minus two: Some limits on our capacity for processing information. *Psychological Review*, 63(2), 81-97.

**DOI**: [https://doi.org/10.1037/h0043158](https://doi.org/10.1037/h0043158)

**Link**: [APA PsycNet](https://psycnet.apa.org/record/1957-02914-001) | [PDF](https://labs.la.utexas.edu/gilden/files/2016/04/MagicNumberSeven-Miller1956.pdf)

## Summary

Foundational cognitive psychology paper establishing that human working memory has a limited capacity of approximately 7 (plus or minus 2) items. Miller introduced the concept of "chunking" as a strategy to overcome this limitation by grouping information into meaningful units.

### Key Findings

1. **Working Memory Limit**: Humans can hold approximately 7 ± 2 items in working memory at once
2. **Chunking**: Information can be grouped into "chunks" to increase effective capacity
3. **Channel Capacity**: Information processing has bandwidth limitations similar to communication channels
4. **Recoding**: Converting information into familiar patterns enables better retention

### The Magic Number

| Context | Observed Limit |
|---------|----------------|
| Absolute judgments (unidimensional) | ~7 categories |
| Immediate memory span | 7 ± 2 items |
| Attention span | ~7 objects |

### Chunking Mechanism

Miller demonstrated that while the number of chunks is limited, the information content per chunk is not:

> "The span of immediate memory seems to be almost independent of the number of bits per chunk, at least over the range that has been examined to date."

This means a 7-digit phone number and a 7-word sentence occupy similar "slots" despite vastly different information content.

## AIWG Application

### Direct Applications

| AIWG Feature | Application of Miller's Law |
|--------------|----------------------------|
| **Task Decomposition** | Tasks decomposed to ≤7 subtasks per level |
| **Agent Review Panels** | 3-5 reviewers (within 7±2 range) |
| **Checklist Design** | Phase gates limited to 5-7 criteria |
| **Context Windows** | Information chunked into meaningful sections |
| **Ralph Loop** | Iteration state tracked as discrete chunks |

### Implementation Patterns

**Decomposition Rule** (from `agentic/code/addons/aiwg-utils/prompts/reliability/decomposition.md`):

```
Decompose large tasks to maintain cognitive load within 7±2 items:
- Parent task → 5-7 child tasks maximum
- Each child task → 5-7 steps maximum
- Checklist items → 5-7 per category
```

**Multi-Agent Orchestration**:

The Primary→Reviewers→Synthesizer pattern keeps each agent's scope bounded:
- Primary author: Single document focus
- Reviewers: 3-5 parallel (within working memory for synthesis)
- Synthesizer: Integrates ≤7 review perspectives

### Why This Matters for AI Systems

While LLMs have larger context windows than human working memory, Miller's Law still applies:

1. **Human-AI Handoff**: Outputs must be digestible by humans (≤7 key points)
2. **Prompt Engineering**: Instructions with >7 complex requirements degrade compliance
3. **Quality Gates**: Checklist items exceeding 7 reduce review accuracy
4. **Status Reporting**: Progress updates should highlight ≤7 key items

## Key Quotes

> "There is a clear and definite limit to the accuracy with which we can identify absolutely the magnitude of a unidimensional stimulus variable."

> "The span of absolute judgment and the span of immediate memory impose severe limitations on the amount of information that we are able to receive, process, and remember."

> "By organizing the stimulus input simultaneously into several dimensions and successively into a sequence of chunks, we manage to break... this informational bottleneck."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Task Management | **Critical** - decomposition patterns |
| Multi-Agent Systems | **High** - reviewer panel sizing |
| Documentation | **High** - section/checklist design |
| User Experience | **High** - output formatting |

## Cross-References

- **REF-006**: Sweller's Cognitive Load Theory (extends Miller's work)
- **Decomposition Templates**: `agentic/code/addons/aiwg-utils/prompts/reliability/decomposition.md`
- **Agent Design Rules**: Rule #3 (Chunked Context) applies Miller's principle

## Related Work

- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning
- Cowan, N. (2001). The magical number 4 in short-term memory (revised estimate)
- Baddeley, A. (2000). The episodic buffer: A new component of working memory?

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
