# REF-015: Self-Refine - Iterative Refinement with Self-Feedback

## Citation

Madaan, A., Tandon, N., Gupta, P., Hallinan, S., Gao, L., Wiegreffe, S., Alon, U., Dziri, N., Prabhumoye, S., Yang, Y., Gupta, S., Majumder, B. P., Hermann, K. M., Welleck, S., Yazdanbakhsh, A., & Clark, P. (2023). Self-Refine: Iterative Refinement with Self-Feedback. *Advances in Neural Information Processing Systems 36 (NeurIPS 2023)*.

**arXiv**: [https://arxiv.org/abs/2303.17651](https://arxiv.org/abs/2303.17651)

**Website**: [https://selfrefine.info](https://selfrefine.info)

## Summary

Self-Refine is an approach for improving LLM outputs through iterative self-feedback and refinement. The same model generates an initial output, critiques it, then refines based on that critique—repeating until quality criteria are met. Crucially, this requires no supervised training, additional training, or RL; it works purely through inference-time iteration.

### Key Concepts

| Concept | Definition |
|---------|------------|
| **Self-Feedback** | Model critiques its own output |
| **Iterative Refinement** | Multiple generate→critique→refine cycles |
| **Stopping Criteria** | Halt when feedback indicates satisfaction |
| **No Additional Training** | Works with frozen model at inference time |

### Architecture

```
Initial Generation
       ↓
┌──────────────────────────────────┐
│ Feedback Module                  │
│   "What's wrong with this?"      │
│   → Specific critique            │
├──────────────────────────────────┤
│ Refine Module                    │
│   "Fix based on feedback"        │
│   → Improved output              │
└──────────────────────────────────┘
       ↓
   (Repeat until satisfactory)
       ↓
   Final Output
```

### Key Findings

1. **~20% Improvement**: Across tasks, Self-Refine improves by ~20% absolute on average
2. **Human Preference**: Outputs preferred by humans over single-shot generation
3. **No Training Required**: Works purely at inference time
4. **Transferable Pattern**: Works across code, math, reasoning, writing tasks

### Benchmark Results

| Task | Base GPT-4 | + Self-Refine | Improvement |
|------|------------|---------------|-------------|
| Code Generation | 65% | 82% | +17% |
| Math Word Problems | 78% | 91% | +13% |
| Sentiment Reversal | 71% | 89% | +18% |
| Dialogue Response | 63% | 85% | +22% |

### Limitations Noted

- Feedback quality depends on model capability
- Diminishing returns after 2-3 iterations
- Model may not always recognize its errors
- Some tasks show no improvement from self-refinement

## AIWG Application

### Direct Parallel: Ralph Loop

AIWG's Ralph loop is an **externally-validated extension of Self-Refine**:

| Self-Refine | Ralph Loop |
|-------------|------------|
| Self-feedback | External verification (tests, validation commands) |
| Critique prompt | Structured error analysis |
| Refine prompt | Strategy adaptation based on findings |
| Stopping: self-satisfaction | Stopping: completion criteria met |
| Single model | Multi-agent + orchestrator |

### Key Enhancement: External Verification

Self-Refine relies on the model recognizing its own errors. AIWG's Ralph extends this with:

```
Self-Refine:
  Generate → Self-Critique → Refine → (repeat)

Ralph:
  Execute → External Verify → Analyze Error → Adapt Strategy → (repeat)
            ↑
            npm test, linter, type check, etc.
```

External verification is critical because (per REF-002) models often can't detect their own Archetype 2 (Over-helpfulness) and Archetype 3 (Context pollution) errors.

### Integration Pattern

```typescript
// Ralph loop implementing externally-verified Self-Refine
while (!completionCriteriaMet && iteration < maxIterations) {

  // 1. Execute (like Self-Refine's Generate)
  const result = await agent.execute(task);

  // 2. External Verify (enhanced Self-Refine Feedback)
  const verification = await runExternalValidation([
    'npm test',
    'tsc --noEmit',
    'eslint .'
  ]);

  // 3. Analyze (structured critique)
  if (!verification.passed) {
    const analysis = await analyzeFailure(verification.errors);
    // Structured: syntax? logic? missing dep? wrong approach?
  }

  // 4. Adapt Strategy (informed Refine)
  task = adaptStrategy(task, analysis);
  iteration++;
}
```

### Lessons for AIWG

1. **Iteration is Powerful**: Self-Refine validates that refinement loops improve quality
2. **External Feedback Superior**: But self-critique has blind spots; external validation catches more
3. **Diminishing Returns**: 2-3 iterations optimal; AIWG Ralph defaults to max 5
4. **Stopping Criteria Critical**: Clear completion criteria prevent infinite loops

### Multi-Agent Enhancement

Self-Refine is single-model. AIWG adds multi-agent perspectives:

```
Self-Refine:
  Model → Model critiques → Model refines

AIWG Multi-Agent Refine:
  Primary Author → Security reviews + Test reviews + Writing reviews → Synthesizer
                   (different perspectives catch different issues)
```

## Key Quotes

> "Self-Refine is an approach for improving initial outputs from LLMs through iterative feedback and refinement."

> "Outputs generated with Self-Refine are preferred by humans and automatic metrics, improving by ~20% absolute on average."

> "Self-Refine does not require any supervised training data, additional training, or reinforcement learning."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Ralph Loop | **Critical** - theoretical foundation for iteration |
| Recovery Patterns | **Critical** - validates refinement approach |
| Quality Improvement | **High** - quantified improvement metrics |
| Multi-Agent Review | **Medium** - extends with multiple perspectives |

## Cross-References

- **REF-002**: Roig failure modes (why external verification needed)
- **Ralph Guide**: `docs/ralph-guide.md`
- **Flow Commands**: Self-healing patterns in orchestration

## Related Work

- Shinn, N., et al. (2023). Reflexion: Language Agents with Verbal Reinforcement Learning
- Kim, G., et al. (2023). Language Models can Solve Computer Tasks (MindAct)
- "When Can LLMs Actually Correct Their Own Mistakes?" (TACL 2024) - critical survey

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
