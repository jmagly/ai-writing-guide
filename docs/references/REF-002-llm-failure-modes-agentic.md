# REF-002: How Do LLMs Fail In Agentic Scenarios?

## Citation

Roig, F. (2025). How Do LLMs Fail In Agentic Scenarios? A Behavioral Analysis Across Model Scales. arXiv:2512.07497v2.

## Summary

Empirical analysis of 900 execution traces from KAMI v0.1 benchmark across three model tiers (32B, 400B, 671B parameters). The study identifies four failure archetypes that emerge consistently regardless of model scale, demonstrating that recovery capability—not initial correctness or model size—is the dominant predictor of agentic task success.

### Key Findings

1. **Scale ≠ Reliability**: Llama 4 Maverick (400B) performs only marginally better than Granite 4 Small (32B) despite 12x parameter count
2. **Recovery is Dominant**: DeepSeek V3.1 achieves 92.2% success (vs predecessor V3's 59.4%) through post-training RL for verification/recovery, not architectural changes
3. **Four Universal Archetypes**: Failure patterns emerge consistently across model scales

### Four Failure Archetypes

| Archetype | Description | Example |
|-----------|-------------|---------|
| 1. Premature Action Without Grounding | Models guess schemas instead of inspecting | Assumes CSV columns without `head` command |
| 2. Over-Helpfulness Under Uncertainty | Substitutes missing data with plausibles | Silently swaps "Acme Corp" for "Acme Inc." |
| 3. Distractor-Induced Context Pollution | Irrelevant data derails reasoning | Includes Q1-Q3 data when asked only for Q4 |
| 4. Fragile Execution Under Load | Coherence loss, loops, malformed calls | Multi-step SQL joins cause alias confusion |

### Model Performance

| Model | Parameters | Success Rate | Recovery Rate |
|-------|------------|--------------|---------------|
| DeepSeek V3.1 | 671B | 92.2% | High |
| Llama 4 Maverick | 400B | 67.8% | Medium |
| Granite 4 Small | 32B | 64.4% | Low |

### Four Emergent Principles

1. Model size alone does not predict agentic reliability
2. Effective error feedback and recovery mechanisms are essential
3. Context quality matters more than context quantity
4. Alignment to source-of-truth (schema inspection) is critical

## AIWG Alignment

### Where AIWG Already Addresses

| Archetype | AIWG Mitigation | Coverage |
|-----------|-----------------|----------|
| 1. Premature Action | Multi-agent review catches ungrounded assumptions | Partial |
| 2. Over-Helpfulness | Consortium pattern validates uncertain outputs | Partial |
| 4. Fragile Execution | Task decomposition limits cognitive load; resilience patterns | Partial |

### Existing Strengths

- **Multi-agent orchestration**: Distributes cognitive load, reducing Archetype 4 failures
- **Decomposition patterns**: Keeps subtasks within 7-item cognitive limit
- **Primary→Reviewer→Synthesizer pattern**: Catches individual agent errors
- **Parallel agent execution**: Prevents sequential context accumulation

## Improvement Opportunities

### Significant Gap: Archetype 3

AIWG's planned features do not adequately address **Distractor-Induced Context Pollution**. The memory system leverage helps with context organization but does not actively filter distractors.

**Recommended Addition**: #12 Context Curator & Distractor Filter addon
- Pre-filters context before task execution
- Relevance scoring for context sections
- Scoped reasoning prompts to enforce task boundaries
- Path-filtered rules for distractor awareness

### Enhancements to Planned Items

| Item | Enhancement | Rationale |
|------|-------------|-----------|
| #4 Agent Design Bible | Add "Grounding Checkpoint" rule | Archetype 1 mitigation |
| #4 Agent Design Bible | Extend "Escalate Uncertainty" rule | Archetype 2 mitigation |
| #11 Resilience Primitives | Add structured recovery protocol | Archetype 4 - recovery is key |
| #11 Resilience Primitives | Add loop detection mechanism | Archetype 4 - prevent repetition |
| #7 Evals Framework | Include KAMI-style archetype tests | Validate all 4 archetypes |

## Implementation Notes

### New Success Metrics (from Roig findings)

| Metric | Target | Archetype |
|--------|--------|-----------|
| Grounding compliance | >90% | 1 |
| Entity substitution rate | <5% | 2 |
| Distractor error reduction | ≥50% | 3 |
| Recovery success rate | ≥80% | 4 |

### Structured Recovery Protocol

Based on DeepSeek V3.1's success pattern:

```
1. PAUSE: Stop execution, preserve state
2. DIAGNOSE: Analyze error message and trace
   - Syntax error? → Fix formatting
   - Schema mismatch? → Re-inspect target
   - Logic error? → Decompose further
   - Loop detected? → Change approach
3. ADAPT: Choose recovery strategy
4. RETRY: With adapted approach (max 3)
5. ESCALATE: Request human intervention
```

### Context Curation Pattern

For Archetype 3 mitigation:

```
1. Identify explicit task scope (time, entity, operation)
2. Score context sections:
   - RELEVANT: Directly supports task
   - PERIPHERAL: May be useful for edge cases
   - DISTRACTOR: Similar but out of scope
3. Process RELEVANT first
4. Access PERIPHERAL only if needed
5. Never incorporate DISTRACTOR into reasoning
```

## Cross-References

- **REF-001**: Bandara et al. production-grade patterns (complementary)
- **Unified Plan**: `.aiwg/planning/production-grade-unified-plan.md`
- **Gap Analysis**: `.aiwg/planning/roig-2025-gap-analysis.md`

## Methodology Notes

### KAMI Benchmark Domains

- Filesystem navigation
- Text extraction
- CSV manipulation
- SQL queries

### Evaluation Approach

- 900 execution traces analyzed
- Per-step behavioral coding
- Cross-model pattern identification
- Recovery attempt tracking

## Key Quotes

> "Recovery capability—not initial correctness—is the dominant predictor of agentic task success."

> "Model scale alone does not predict agentic reliability; post-training optimization for verification and recovery is the differentiator."

> "Distractor-induced context pollution emerged as a universal failure mode across all model tiers."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Multi-Agent Systems | High - validates orchestration patterns |
| Production Operations | High - recovery patterns critical |
| Tool Augmentation | Medium - grounding before tool use |
| Workflow Automation | High - context management essential |

## Action Items (Completed)

- [x] Gap analysis created: `.aiwg/planning/roig-2025-gap-analysis.md`
- [x] Unified plan updated with #12 Context Curator
- [x] #11 Resilience scope extended
- [x] New metrics added to success criteria
- [x] Reference entry created

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-10 | AIWG Analysis | Initial reference entry from arxiv 2512.07497v2 |
