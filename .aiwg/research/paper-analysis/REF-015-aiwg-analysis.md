# REF-015: Self-Refine - AIWG Ralph Loop Analysis

**Source**: [REF-015: Self-Refine - Iterative Refinement with Self-Feedback](https://tmp/research-papers/documentation/references/REF-015-self-refine-iterative-refinement.md)

**Author**: Madaan, A., et al. (2023)

**AIWG Relevance**: CRITICAL - Theoretical foundation for Ralph loop architecture

---

## AIWG Ralph Loop Mapping

### Direct Parallel

| SELF-REFINE Component | Ralph Loop Component |
|----------------------|---------------------|
| GENERATE | Execute task |
| FEEDBACK (self-critique) | External verification (tests, linters, type check) |
| REFINE | Analyze error + Adapt strategy |
| Stopping: self-satisfaction | Stopping: completion criteria met |
| Single model | Multi-agent + orchestrator |

### Key Enhancement: External Verification

**SELF-REFINE Pattern**:
```
Generate → Self-Critique → Refine → (repeat)
```

**Ralph Loop Pattern**:
```
Execute → External Verify → Analyze Error → Adapt Strategy → (repeat)
             ↑
      npm test, linter, type check, etc.
```

---

## Why External Verification Matters

### Evidence from SELF-REFINE

1. **Math Reasoning**: 94% self-feedback says "everything looks good" when errors exist (page 6)
2. **With Oracle**: +4.8% improvement vs. 0% with self-feedback (page 22)
3. **Error Analysis**: 94% of failures due to bad feedback, not bad refinement (page 8)

### Cross-Reference to REF-002 (Roig et al.)

- **Archetype 2 (Over-helpfulness)**: Models can't detect when they're being too verbose
- **Archetype 3 (Context pollution)**: Models can't recognize when they've lost the thread
- **External verification catches what self-critique misses**

---

## Ralph Loop Implementation

```typescript
// Ralph implements externally-verified Self-Refine
async function ralphLoop(
  task: Task,
  completionCriteria: string,
  maxIterations: number = 5
) {
  let iteration = 0;
  let currentTask = task;

  while (iteration < maxIterations) {
    // 1. Execute (like SELF-REFINE's Generate)
    const result = await agent.execute(currentTask);

    // 2. External Verify (enhanced SELF-REFINE Feedback)
    const verification = await runExternalValidation([
      'npm test',
      'tsc --noEmit',
      'eslint .',
    ]);

    // 3. Check completion criteria
    if (verification.passed && meetsCompletionCriteria(result, completionCriteria)) {
      return result; // Success
    }

    // 4. Analyze (structured critique - like FEEDBACK but with external data)
    const analysis = await analyzeFailure(
      verification.errors,
      result,
      currentTask
    );

    // Analysis asks: syntax error? logic error? missing dependency? wrong approach?

    // 5. Adapt Strategy (informed Refine)
    currentTask = await adaptStrategy(
      currentTask,
      analysis,
      getAllHistory(iteration)
    );

    iteration++;
  }

  throw new Error(`Failed to complete after ${maxIterations} iterations`);
}
```

---

## SELF-REFINE Lessons for Ralph

### 1. Iteration is Powerful

**SELF-REFINE Finding**: Average 20% improvement across tasks (page 6)

**Ralph Application**: Default max 5 iterations, but expect most value in first 2-3

**Evidence**:

| Task | Δ(y₀→y₁) | Δ(y₁→y₂) | Δ(y₂→y₃) |
|------|---------|---------|---------|
| Code Opt | +5.0 | +0.9 | +0.9 |
| Sentiment Rev | +1.0 | +1.2 | +0.7 |
| Constrained Gen | +11.3 | +6.4 | +3.0 |

**Pattern**: Largest gains in first iteration, diminishing returns after.

### 2. Feedback Quality is Critical

**SELF-REFINE Finding** (page 6):

| Task | SELF-REFINE | Generic FB | No FB |
|------|------------|-----------|-------|
| Code Optimization | 27.5 | 26.0 (-1.5) | 24.8 (-2.7) |
| Sentiment Reversal | 43.2 | 31.2 (-12.0) | 0 (-43.2) |
| Acronym Generation | 56.4 | 54.0 (-2.4) | 48.0 (-8.4) |

**Ralph Application**:
- External validators provide specific error messages
- Structure analysis to be actionable ("fix syntax error on line 42" not "code has problems")

### 3. History Retention Helps

**SELF-REFINE Quote** (page 4):
> "Intuitively, this allows the model to learn from past mistakes and avoid repeating them."

**Ralph Application**: Pass full iteration history to strategy adaptation

**Implementation**:
```typescript
interface IterationHistory {
  iteration: number;
  task: Task;
  result: Result;
  verification: VerificationResult;
  analysis: FailureAnalysis;
  strategy: AdaptationStrategy;
}

function getAllHistory(currentIteration: number): IterationHistory[] {
  // Return all previous iterations
  // Helps avoid repeating same mistakes
}
```

### 4. Stopping Criteria Essential

**SELF-REFINE Approaches** (page 4):
- Fixed iterations (used in paper)
- Self-determined (model generates stop signal)

**Ralph Application**: Hybrid approach
- External verification provides objective stop signal (tests pass)
- Completion criteria provides goal-based stop signal
- Max iterations provides safety net

**Implementation**:
```typescript
interface StoppingConditions {
  // Objective: External validation
  testsPass: boolean;
  lintPass: boolean;
  typeCheckPass: boolean;

  // Goal-based: Completion criteria
  requirementsMet: boolean;

  // Safety net
  maxIterationsReached: boolean;
}

function shouldStop(conditions: StoppingConditions): boolean {
  // Success: All external checks + requirements met
  if (conditions.testsPass &&
      conditions.lintPass &&
      conditions.typeCheckPass &&
      conditions.requirementsMet) {
    return true;
  }

  // Safety: Hit iteration limit
  if (conditions.maxIterationsReached) {
    return true;  // Escalate to human
  }

  return false;  // Continue iterating
}
```

### 5. Stronger Models Unlock More

**SELF-REFINE Quote** (pages 5-6):
> "We thus believe that SELF-REFINE allows stronger models (such as GPT-4) to unlock their full potential, even in cases where this potential is not expressed in the standard, single-pass, output generation."

**Ralph Application**: Use best available model for complex tasks requiring multiple iterations.

---

## Multi-Agent Enhancement

### SELF-REFINE vs. Multi-Agent Ralph

**SELF-REFINE**: Single model provides feedback

**AIWG Multi-Agent Ralph**:
```
Primary Author (Generate)
    ↓
[Security Reviewer] + [Test Engineer] + [Writing Quality] → Multiple Perspectives
    ↓
Synthesizer (Refine based on all feedback)
```

**Advantage**: Different specialized agents catch different issues
- Security reviewer: Catches SQL injection
- Test engineer: Catches missing edge cases
- Writing quality: Catches verbosity issues

**Evidence**: SELF-REFINE error analysis shows blind spots (page 8) - multiple perspectives reduce blind spots.

---

## Performance Results and Implications

### SELF-REFINE Benchmark Results

| Task | GPT-4 Base | +SELF-REFINE | Δ | AIWG Application |
|------|-----------|--------------|---|------------------|
| **Sentiment Reversal** | 3.8% | **36.2%** | +32.4% | Writing quality refinement |
| **Dialogue Response** | 25.4% | **74.6%** | +49.2% | Documentation improvement |
| **Code Optimization** | 27.3% | **36.0%** | +8.7% | Ralph loop for code tasks |
| **Code Readability** | 27.4% | **56.2%** | +28.8% | Code review workflows |
| **Math Reasoning** | 92.9% | **93.1%** | +0.2% | **Needs external verification** |
| **Acronym Generation** | 30.4% | **56.0%** | +25.6% | Creative naming tasks |
| **Constrained Gen** | 15.0% | **45.0%** | +30.0% | Template-based generation |

### Key Insight: Math Reasoning Failure

**SELF-REFINE Finding**: ChatGPT feedback for 94% instances is "everything looks good" when errors exist.

**With Oracle Feedback** (page 22):

| Model | Base | +SELF-REFINE | +Oracle | Δ Oracle |
|-------|------|-------------|---------|----------|
| GPT-3.5 | 64.1 | 64.1 (0) | **68.9** | **+4.8** |
| ChatGPT | 74.8 | 75.0 (+0.2) | **76.2** | **+1.4** |
| GPT-4 | 92.9 | 93.1 (+0.2) | **93.8** | **+0.7** |

**Ralph Implication**: External verification (test execution, linters) provides the "oracle" that self-critique cannot.

---

## Error Analysis Insights

### Failure Attribution (page 8)

**70 samples analyzed** (35 success, 35 failure):

**Failure Attribution**:
- 33% - Feedback inaccurately pinpointed error location
- 61% - Feedback suggested inappropriate fix
- 6% - Refiner incorrectly implemented good feedback

**Quote** (page 8):
> "When SELF-REFINE failed to improve the original generation, the majority of issues were due to erroneous feedback rather than faulty refinements."

**Ralph Implication**: The refiner is relatively robust; focus on improving feedback quality through external validation.

### Success Pattern

- 61% - Precise fixes from accurate feedback
- 33% - Rectified issues even with partially incorrect feedback

**Implication**: Refiner can sometimes ignore bad feedback, but accurate feedback dramatically improves outcomes.

---

## Implementation Patterns for AIWG

### Pattern 1: Structured Feedback

**Inspired by SELF-REFINE**:
```typescript
interface RefinementFeedback {
  aspect: string;          // What dimension (e.g., "test coverage")
  score: number;           // Quantitative assessment
  issue: string;           // Specific problem identified
  suggestion: string;      // Actionable improvement
  location?: string;       // Where to apply (file, line, section)
}
```

**Enhanced for Ralph**:
```typescript
interface RalphFeedback extends RefinementFeedback {
  source: 'self-critique' | 'external-validation';
  validator?: string;      // Which external tool (npm test, eslint, etc.)
  errorDetails?: any;      // Raw error from external validator
}
```

### Pattern 2: Multi-Dimensional Quality

**Inspired by Dialogue Response (page 31)**:
```typescript
interface OutputQuality {
  // Functional
  correct: number;         // Does it work?
  complete: number;        // All requirements met?
  efficient: number;       // Performance acceptable?

  // Code Quality
  readable: number;        // Easy to understand?
  maintainable: number;    // Easy to modify?
  testable: number;        // Easy to test?

  // Documentation
  documented: number;      // Adequate comments?
  clear: number;          // Clear explanations?

  // Safety
  secure: number;         // No vulnerabilities?
  safe: number;           // No harmful behavior?
}
```

### Pattern 3: Actionable Feedback

**SELF-REFINE Definition** (page 4):
> "By 'actionable', we mean the feedback should contain a concrete action that would likely improve the output. By 'specific', we mean the feedback should identify concrete phrases in the output to change."

**Ralph Application**:
```typescript
interface ActionableFeedback {
  // ✅ Actionable + Specific
  type: 'actionable';
  action: string;          // "Add import statement"
  location: string;        // "src/auth/login.ts:1"
  suggestion: string;      // "import { jwt } from 'jsonwebtoken';"

  // ❌ Generic (avoid)
  // type: 'generic';
  // message: "Improve the code";
}
```

---

## Stopping Conditions Design

### SELF-REFINE Termination (page 4)

**Two approaches**:
- **Fixed iterations**: Maximum of 4 iterations (used in experiments)
- **Self-determined**: Model generates stopping indicator in feedback

### Ralph Stopping Conditions

```typescript
enum StopReason {
  SUCCESS = 'success',           // Completion criteria met
  MAX_ITERATIONS = 'max_iter',   // Hit iteration limit
  NO_PROGRESS = 'no_progress',   // Unchanged for 2 iterations
  ESCALATE = 'escalate',          // Requires human intervention
}

function determineStopReason(
  iteration: number,
  verification: VerificationResult,
  completionCriteria: string,
  history: IterationHistory[]
): { stop: boolean; reason?: StopReason } {
  // Success condition
  if (verification.passed && meetsCompletionCriteria(completionCriteria)) {
    return { stop: true, reason: StopReason.SUCCESS };
  }

  // Max iterations (like SELF-REFINE's fixed 4)
  if (iteration >= 5) {
    return { stop: true, reason: StopReason.MAX_ITERATIONS };
  }

  // No progress (like SELF-REFINE's 2 unchanged iterations)
  if (hasNoProgress(history, 2)) {
    return { stop: true, reason: StopReason.NO_PROGRESS };
  }

  // Escalation conditions (unique to Ralph)
  if (shouldEscalate(verification, history)) {
    return { stop: true, reason: StopReason.ESCALATE };
  }

  return { stop: false };
}
```

---

## Diminishing Returns Analysis

### SELF-REFINE Evidence (pages 6-7)

**Constrained Generation** (20-30 concepts):

| Iteration | Coverage % | Δ |
|-----------|-----------|---|
| y₀ | 29.0 | - |
| y₁ | 40.3 | +11.3 |
| y₂ | 46.7 | +6.4 |
| y₃ | 49.7 | +3.0 |

**Pattern**: Largest gains in first iteration, diminishing returns after.

### Ralph Application

```typescript
interface IterationMetrics {
  iteration: number;
  improvement: number;  // Quality delta from previous iteration
  cumulativeImprovement: number;
}

function shouldContinue(metrics: IterationMetrics[]): boolean {
  const recentMetrics = metrics.slice(-2);

  // If last 2 iterations show <5% improvement, stop
  const avgRecentImprovement = recentMetrics.reduce(
    (sum, m) => sum + m.improvement, 0
  ) / recentMetrics.length;

  return avgRecentImprovement >= 0.05;  // 5% threshold
}
```

---

## Comparison with Related Approaches

### vs. Self-Correction (Welleck et al. 2022)

| Feature | Self-Correction | SELF-REFINE | Ralph Loop |
|---------|----------------|-------------|------------|
| **Feedback** | No explicit feedback | ✅ Explicit NL feedback | ✅ External + explicit |
| **Training** | Trains separate refiner per task | ✅ No training | ✅ No training |
| **Multi-aspect** | Single aspect (correctness) | ✅ Multi-dimensional | ✅ Multi-dimensional |
| **GSM-8k** | 45.9% | **55.7%** (+9.8%) | TBD (with external) |

### vs. Reflexion (Shinn et al. 2023)

| Feature | Reflexion | SELF-REFINE | Ralph Loop |
|---------|-----------|-------------|------------|
| **Use case** | ReAct planning | General NL generation | Code + artifacts |
| **Feedback** | Free-form reflection | Structured multi-dimensional | External validation |
| **Focus** | Next action selection | Output quality improvement | Task completion |

### Ralph's Unique Contribution

- **External verification**: Objective feedback from tests, linters, type checkers
- **Multi-agent review**: Multiple specialized perspectives
- **Completion criteria**: Goal-based stopping conditions
- **SDLC integration**: Artifact-aware refinement

---

## Key Quotes with AIWG Interpretation

### On Iterative Improvement

> "Like humans, large language models (LLMs) do not always generate the best output on their first try." (page 1)

**AIWG**: Ralph loop implements this insight - expect iteration, not perfection.

### On Feedback Quality

> "Specific, actionable feedback yields superior results" (page 6)

**AIWG**: External validators (tests, linters) provide specific, actionable feedback that self-critique cannot.

### on Math Reasoning Limitations

> "ChatGPT feedback for 94% instances is 'everything looks good'" (page 6)

**AIWG**: This is why Ralph uses external verification instead of self-critique for code tasks.

### On Error Attribution

> "When SELF-REFINE failed to improve the original generation, the majority of issues were due to erroneous feedback rather than faulty refinements." (page 8)

**AIWG**: Ralph's external validation addresses the primary failure mode - bad feedback.

---

## Improvement Opportunities for AIWG

### High Priority

1. **Implement multi-dimensional quality scoring**
   - Track quality across dimensions (correctness, efficiency, readability, security)
   - Report per-dimension improvements across iterations
   - Identify which dimensions benefit most from iteration

2. **Add iteration analytics**
   - Track improvement per iteration
   - Identify diminishing returns threshold
   - Optimize stopping conditions based on data

3. **Enhance feedback specificity**
   - External validators already provide location (file, line)
   - Add suggested fixes from error messages
   - Structure feedback as actionable recommendations

4. **Create feedback quality metrics**
   - Measure accuracy of feedback (did following it improve output?)
   - A/B test self-critique vs. external validation
   - Combine both when appropriate

### Medium Priority

1. **Build cross-task learning**
   - Track which types of tasks benefit most from iteration
   - Optimize iteration limits per task type
   - Share patterns across similar tasks

2. **Implement non-monotonic handling**
   - Track best output across all iterations (not just final)
   - Allow quality to fluctuate
   - Select highest-scoring output from history

3. **Add confidence scoring**
   - Model confidence in each iteration
   - Early stopping if high confidence + verification passed
   - Request human review if low confidence persists

---

## Cross-References

**AIWG Internal**:
- @tools/ralph-external/loop-executor.ts - Ralph loop implementation
- @docs/ralph-guide.md - Ralph user documentation
- @agentic/code/addons/quality/metrics.ts - Multi-dimensional assessment

**Related Papers**:
- @docs/references/REF-002-roig-failure-modes.md - Why external verification needed
- @docs/references/REF-021-reflexion-verbal-reinforcement.md - Concurrent self-reflection work
- @docs/references/REF-014-swe-bench-evaluation.md - Benchmark showing iteration value

---

**Analysis Created**: 2026-01-24
**Source Paper**: Madaan et al. (2023) - Self-Refine
**AIWG Impact**: Direct foundation for Ralph loop, validates iterative refinement with external verification enhancement
