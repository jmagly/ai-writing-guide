# REF-021: Reflexion - AIWG Implementation Analysis

**Source**: `/tmp/research-papers/docs/references/REF-021-reflexion-verbal-reinforcement.md`

**Citation**: Shinn, N., Cassano, F., Berman, E., Gopinath, A., Narasimhan, K., & Yao, S. (2023). Reflexion: Language Agents with Verbal Reinforcement Learning. *NeurIPS 2023*.

---

## AIWG Implementation Mapping

### Direct Parallel: Ralph Loop Recovery

Reflexion is the **theoretical foundation** for AIWG's Ralph loop pattern:

| Reflexion Component | Ralph Loop Implementation |
|---------------------|---------------------------|
| **Verbal reflection** | Error analysis with context |
| **Episodic memory** | `.aiwg/ralph/` state directory |
| **Trial improvement** | Iteration with adapted strategy |
| **External feedback** | Verification (npm test, tsc, eslint) |
| **Actor** | Execution agent |
| **Evaluator** | External tooling (compilers, linters) |
| **Self-Reflection** | Failure analysis with trajectory |

### Ralph Enhancement: External Verification

Ralph extends Reflexion with **objective external feedback**:

```
Reflexion Pattern:
  Attempt → Self-assess failure → Reflect → Retry

Ralph Pattern:
  Execute → External verify → Analyze with context → Adapt → Retry
           ↑
           Objective signals: npm test, tsc, eslint
```

**Why External Verification Matters**:
- Reduces false positives from self-evaluation
- Provides ground truth for code correctness
- Enables pass@1-eligible implementations
- Catches edge cases LLM might miss

### Integration Pattern in AIWG

```typescript
// Ralph implementing Reflexion pattern
interface RalphState {
  reflections: string[];      // Episodic memory (Msr outputs)
  attempts: number;
  lastError: string;
  verificationResults: VerificationResult[];  // External Me
}

async function ralphLoop(task: string, state: RalphState) {
  // Load previous reflections (Reflexion's episodic memory)
  const context = buildContext(task, state.reflections);

  // Attempt execution (Actor)
  const result = await execute(context);

  // External verification (Ralph enhancement to Evaluator)
  const verification = await verify(result);  // npm test, tsc, etc.

  if (!verification.passed) {
    // Generate reflection (Self-Reflection model)
    const reflection = await reflect(
      result,
      verification.errors,
      state.reflections  // Include past reflections
    );

    state.reflections.push(reflection);

    // Truncate to Ω capacity (typically 1-3)
    if (state.reflections.length > 3) {
      state.reflections = state.reflections.slice(-3);
    }

    // Retry with accumulated wisdom
    return ralphLoop(task, state);
  }

  return result;
}
```

### Memory Design from Reflexion

AIWG's Ralph state management follows Reflexion's episodic memory pattern:

**Storage Location**: `.aiwg/ralph/task-{id}/`
```
.aiwg/ralph/task-123/
├── reflections.jsonl         # Episodic memory (sr0, sr1, sr2, ...)
├── attempts/
│   ├── attempt-0.json        # τ0 + r0
│   ├── attempt-1.json        # τ1 + r1
│   └── attempt-2.json        # τ2 + r2
├── verification/
│   ├── test-results-0.json
│   └── test-results-1.json
└── final-output/
```

**Reflection Format** (inspired by Reflexion):
```json
{
  "trial": 2,
  "error": "TypeError: Cannot read property 'map' of undefined",
  "reflection": "In my previous attempt, I tried to map over userData without checking if it exists. The error occurred because the API response was empty in the test case. I should add a null check before the map operation. In the next attempt, I will verify userData exists and return an empty array if it doesn't.",
  "timestamp": "2026-01-24T10:30:00Z",
  "verification_context": {
    "test_failures": ["should handle empty API response"],
    "linter_errors": []
  }
}
```

### Why Reflexion Matters for AIWG

1. **Recovery Theory**: Validates verbal learning approach for error recovery
2. **Memory Design**: Episodic reflection storage pattern is optimal
3. **No Retraining**: Learning through context injection enables fast iteration
4. **Interpretability**: Reflections explain agent reasoning and improvement
5. **Empirical Validation**: 91% HumanEval proves effectiveness for code generation
6. **External Feedback**: AlfWorld heuristics inspire Ralph's verification patterns

### Implementation Considerations for AIWG

**When to Use Reflexion Patterns**:
- ❌ **Simple tasks**: Single-attempt solutions (direct prompting sufficient)
- ✓ **Complex tasks**: Multi-step implementations with external verification
- ✓ **High-stakes**: When correctness verification is critical
- ✓ **Learning scenarios**: When similar tasks will be repeated

**Memory Capacity Tuning**:
- **Ω = 1**: Simple tasks, clear failure modes (Reflexion paper default for programming)
- **Ω = 3**: Complex tasks, multiple error types (Reflexion paper default for AlfWorld/HotPotQA)
- **Ω = 5+**: Research/experimental (may exceed context limits)

**Self-Reflection Prompt Design** (from Reflexion paper):
```
You will be given:
1. Your previous implementation
2. Unit test results and/or verification errors
3. Your past reflections (if any)

Analyze what went wrong and provide:
- Credit assignment: Which specific action/code caused the failure?
- Causal reasoning: Why did this action lead to failure?
- Actionable insight: What should you do differently next time?

Write your reflection in first person, focusing on lessons learned.
```

---

## Key Performance Results

### Programming (HumanEval)
- **67% → 91% pass@1** (GPT-3 + Reflexion)
- Surpasses GPT-4 baseline (80%) by 11 percentage points
- State-of-the-art on code generation benchmark

### Decision-Making (AlfWorld)
- **65% → 97% success rate**
- 22% absolute improvement over ReAct baseline
- 130 out of 134 tasks completed successfully

### Reasoning (HotPotQA)
- **31% → 51% accuracy** (ReAct)
- **68% → 80% accuracy** (CoT with ground truth)
- 8% boost over episodic memory alone

---

## AIWG References

**Related AIWG Documentation**:
- `@tools/ralph-external/README.md` - Ralph loop implementation
- `@docs/ralph-guide.md` - Ralph loop implementation and patterns
- `@.aiwg/ralph/` - State directory for iterative execution
- `@.claude/commands/flow-*.md` - Phase transition workflows with reflection
- `@agentic/code/frameworks/sdlc-complete/docs/ralph-external.md` - External Ralph loop architecture

**Related Research Papers**:
- **REF-020**: Tree of Thoughts (deliberate search planning)
- **REF-024**: LATS (combines Reflexion reflection with ToT search)
- **REF-018**: ReAct (reasoning + acting baseline)
- **REF-015**: Self-Refine (single-generation iterative refinement)

---

## Critical Insights for AIWG

**Three-Model Architecture**:
1. **Actor (Ma)**: Generates code/actions based on current state
2. **Evaluator (Me)**: Scores outputs (external tests, heuristics, LLM evaluation)
3. **Self-Reflection (Msr)**: Converts sparse rewards into detailed verbal feedback

**Memory Architecture**:
- **Short-Term**: Current trajectory history
- **Long-Term**: Episodic buffer storing self-reflections (max Ω=1-3)
- **Memory Operations**: Initialize empty, append reflections, truncate to capacity

**Key Difference from Traditional RL**:
- No gradient descent or weight updates
- Policy "update" occurs by modifying memory context
- Learning is immediate and interpretable

---

**Document Created**: 2026-01-24
**Analysis Type**: AIWG Implementation Mapping
**Source Paper**: NeurIPS 2023
