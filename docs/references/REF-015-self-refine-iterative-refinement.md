# REF-015: Self-Refine - Iterative Refinement with Self-Feedback

## Citation

Madaan, A., Tandon, N., Gupta, P., Hallinan, S., Gao, L., Wiegreffe, S., Alon, U., Dziri, N., Prabhumoye, S., Yang, Y., Gupta, S., Majumder, B. P., Hermann, K. M., Welleck, S., Yazdanbakhsh, A., & Clark, P. (2023). Self-Refine: Iterative Refinement with Self-Feedback. *Advances in Neural Information Processing Systems 36 (NeurIPS 2023)*.

**arXiv**: [https://arxiv.org/abs/2303.17651](https://arxiv.org/abs/2303.17651)

**Website**: [https://selfrefine.info](https://selfrefine.info)

**Pages**: 54 pages total (main paper + extensive appendices)

## Executive Summary

Self-Refine demonstrates that large language models can iteratively improve their outputs through self-generated feedback without any additional training, supervised data, or reinforcement learning. Using the same LLM as generator, critic, and refiner, the approach achieves ~20% absolute improvement across diverse tasks ranging from dialogue generation to mathematical reasoning. This work provides the theoretical foundation for iterative refinement loops like AIWG's Ralph, while also revealing critical limitations that external verification addresses.

**Key Innovation**: Inference-time iteration with self-feedback eliminates the need for trained refinement models or reward signals.

**Critical Finding**: Performance gains are consistent but diminish after 2-3 iterations, and self-critique has blind spots that external validation can address.

**AIWG Impact**: Direct foundation for Ralph loop architecture, validating refinement approach while motivating external verification enhancements.

## The SELF-REFINE Algorithm

### Core Architecture

```
Input (x)
    ↓
[GENERATE] → Initial Output (y₀)
    ↓
┌─────────────────────────────┐
│  Iterative Loop (t=0,1,2..) │
│                             │
│  [FEEDBACK]                 │
│  fb_t = M(p_fb || x || y_t) │
│      ↓                      │
│  [STOP CONDITION]           │
│  if stop(fb_t, t): break    │
│      ↓                      │
│  [REFINE]                   │
│  y_{t+1} = M(p_refine ||    │
│             x || y₀ || fb₀  │
│             ... || y_t ||   │
│             fb_t)           │
└─────────────────────────────┘
    ↓
Final Output (y_t)
```

### Algorithm Components (page 3)

**1. Initial Generation**

```
y₀ = M(p_gen || x)
```

- Uses few-shot prompt with input-output pairs ⟨x^(k), y^(k)⟩
- Standard generation, no special requirements
- Temperature: 0.7 (greedy with sampling)

**2. FEEDBACK Module**

```
fb_t = M(p_fb || x || y_t)
```

- **Actionable**: Feedback contains concrete actions for improvement
- **Specific**: Identifies exact phrases/elements to change
- **Multi-aspect**: Addresses multiple quality dimensions
- Example prompt structure: Input-output-feedback triples ⟨x^(k), y^(k), fb^(k)⟩

> "This code is slow as it uses a for loop which is brute force. A better approach is to use the formula ... (n(n+1))/2." (page 3)

**3. REFINE Module**

```
y_{t+1} = M(p_refine || x || y₀ || fb₀ || ... || y_t || fb_t)
```

- Uses feedback to generate improved output
- **Retains history**: All previous outputs and feedback appended
- Allows learning from past mistakes across iterations
- Example prompt: Input-output-feedback-refined quadruples ⟨x^(k), y_t^(k), fb_t^(k), y_{t+1}^(k)⟩

**4. Stopping Conditions**

Two approaches:

- **Fixed iterations**: Maximum of 4 iterations (used in experiments)
- **Self-determined**: Model generates stopping indicator in feedback
  - Example: Numerical scores falling below threshold
  - Example: Explicit "no further refinement needed" signal

### Key Design Principles (pages 2-3)

1. **Same Model**: Single LLM for all three functions (generate, feedback, refine)
2. **No Training**: Purely inference-time, uses frozen model
3. **Few-Shot Prompting**: All behavior defined by examples, not fine-tuning
4. **History Retention**: Full context of iterations prevents regression

## Comprehensive Benchmark Results

### Main Results Table (page 5)

| Task | GPT-3.5 Base | +SELF-REFINE | ChatGPT Base | +SELF-REFINE | GPT-4 Base | +SELF-REFINE |
|------|-------------|--------------|-------------|--------------|-----------|--------------|
| **Sentiment Reversal** | 8.8 | **30.4** (+21.6) | 11.4 | **43.2** (+31.8) | 3.8 | **36.2** (+32.4) |
| **Dialogue Response** | 36.4 | **63.6** (+27.2) | 40.1 | **59.9** (+19.8) | 25.4 | **74.6** (+49.2) |
| **Code Optimization** | 14.8 | **23.0** (+8.2) | 23.9 | **27.5** (+3.6) | 27.3 | **36.0** (+8.7) |
| **Code Readability** | 37.4 | **51.3** (+13.9) | 27.7 | **63.1** (+35.4) | 27.4 | **56.2** (+28.8) |
| **Math Reasoning** | 64.1 | **64.1** (0) | 74.8 | **75.0** (+0.2) | 92.9 | **93.1** (+0.2) |
| **Acronym Generation** | 41.6 | **56.4** (+14.8) | 27.2 | **37.2** (+10.0) | 30.4 | **56.0** (+25.6) |
| **Constrained Gen** | 28.0 | **37.0** (+9.0) | 44.0 | **67.0** (+23.0) | 15.0 | **45.0** (+30.0) |

**Average Improvement**: ~20% absolute across all tasks

### Task-Specific Details

#### 1. Sentiment Reversal (pages 5, 35-36)

- **Task**: Rewrite reviews to flip sentiment (positive→negative, negative→positive)
- **Dataset**: 1000 review passages from Zhang et al. (2015)
- **Metric**: Human preference (A/B evaluation) and GPT-4 preference
- **Best Gain**: GPT-4 +32.4% (3.8% → 36.2%)

**Why High Gains**:
- Multiple aspects to improve (sentiment strength, word choice, tone)
- Large search space for valid outputs
- Feedback can pinpoint specific phrases needing changes

**Example** (page 35):
- **Initial**: "The food was terrible, I hated it!!"
- **Feedback**: "Not very negative - uses 'terrible' and 'hated' but could be more extreme. Try phrases like 'wouldn't eat if they paid me.'"
- **Refined**: "The food was so abysmal, it was a nightmare to even taste it!"

#### 2. Dialogue Response Generation (pages 5, 30-33)

- **Task**: Generate engaging, coherent dialogue responses
- **Dataset**: FED dataset (Mehri & Eskenazi 2020) - 372 conversations
- **Metric**: 10-dimensional quality assessment (relevant, informative, interesting, consistent, helpful, engaging, specific, safe, user understanding, fluent)
- **Best Gain**: GPT-4 +49.2% (25.4% → 74.6%)

**10 Quality Dimensions** (page 31):
1. Relevant - Addresses context
2. Informative - Provides information
3. Interesting - Beyond predictable
4. Consistent - Tone and topic alignment
5. Helpful - Actionable information
6. Engaging - Encourages continuation
7. Specific - Concrete details
8. Safe - No toxic/harmful content
9. User understanding - Shows comprehension
10. Fluent - Easy to understand

**Example** (page 31):
- **Context**: "I'm very much interested in playing table tennis."
- **Initial**: "That sounds like fun! I'm not very good at table tennis."
- **Feedback**: "Informative: 1/3 - provides no information about table tennis. Engaging: 2/3 - somewhat engaging but could ask follow-up."
- **Refined**: "That's great! It's a fun sport requiring quick reflexes and good hand-eye coordination. Have you played before, or are you looking to learn?"

#### 3. Code Optimization (pages 5, 33)

- **Task**: Improve algorithmic efficiency of functionally correct code
- **Dataset**: PIE dataset (Madaan et al. 2023) - 1000 Python programs
- **Metric**: % programs optimized, relative speedup
- **Best Gain**: GPT-4 +8.7% (27.3% → 36.0%)

**Comparison with Prior Work** (page 19):

| Method | %OPT |
|--------|------|
| PIE-Few-shot (BEST@32) | 38.3 |
| **SELF-REFINE w/ GPT-4** | **36.0** |
| PIE-16B (BEST@32) | 26.6 |
| CODEX | 13.1 |

*Note: SELF-REFINE uses max 4 samples vs. 32 for baselines*

**Example** (page 7):
- **Initial**: Nested loops O(amount × coins⁶)
- **Feedback**: "This code is slow because it uses six nested loops to iterate through all possible combinations. A more efficient approach would be dynamic programming."
- **Refined**: Dynamic programming solution O(amount × coins)

#### 4. Math Reasoning (pages 5-6, 34-35)

- **Task**: Solve grade-school math word problems
- **Dataset**: GSM-8k (Cobbe et al. 2021) - 1319 questions
- **Metric**: Solve rate (% correct answers)
- **Modest Gains**: GPT-4 +0.2% (92.9% → 93.1%)

**Why Modest Gains** (page 5-6):
> "ChatGPT feedback for 94% instances is 'everything looks good'" (page 6)

- Errors are nuanced (single line, single operation)
- Consistent-looking reasoning deceives self-critique
- Model cannot reliably identify its own math errors

**With Oracle Feedback** (page 22):

| Model | Base | +SELF-REFINE | +Oracle |
|-------|------|-------------|---------|
| GPT-3.5 | 64.1 | 64.1 (0) | **68.9** (+4.8) |
| ChatGPT | 74.8 | 75.0 (+0.2) | **76.2** (+1.4) |
| GPT-4 | 92.9 | 93.1 (+0.2) | **93.8** (+0.7) |

**Key Insight**: External verification dramatically improves performance when model can't self-assess.

**Comparison with Self-Correct** (page 15):
- Welleck et al. (2022) Self-Correct: 45.9%
- **SELF-REFINE w/ GPT-3**: **55.7%** (+9.8%)

#### 5. Code Readability (pages 29-30)

- **Task**: Improve variable names, add comments, modularize functions
- **Dataset**: CodeNet (Puri et al. 2021) - 300 competitive programming samples
- **Metrics**:
  - Meaningful Variable Ratio
  - Comments per line
  - Number of function units
- **Best Gain**: ChatGPT +35.4% (27.7% → 63.1%)

**Metric Evolution Over Iterations** (page 30):

| Iteration | Meaningful Vars | Comments/Line | Function Units |
|-----------|----------------|---------------|----------------|
| 0 (Original) | 0.2 | 0.0 | 0.5 |
| 1 | 0.4 | 0.1 | 1.0 |
| 2 | 0.5 | 0.15 | 2.0 |
| 3 | 0.6 | 0.2 | 3.0 |

**Human Comparison** (page 30):

| Metric | Human | SELF-REFINE (T=0.7) |
|--------|-------|---------------------|
| Meaningful Variables | 0.653 | **0.700** |
| Comments per Line | 0.24 | 0.25 |
| Function Units | 0.70 | **1.33** |

*SELF-REFINE matches or exceeds human performance*

#### 6. Acronym Generation (page 36-37)

- **Task**: Generate memorable acronyms for technical titles
- **Dataset**: 250 curated acronyms from Wikipedia
- **Metric**: 5-dimensional scoring (pronunciation, spelling, relation, connotation, familiarity)
- **Best Gain**: GPT-4 +25.6% (30.4% → 56.0%)

**5 Quality Dimensions**:
1. Ease of pronunciation
2. Ease of spelling
3. Relation to title
4. Positive connotation
5. Well-known/recognizable

**Non-Monotonic Improvement** (page 22):

| Iteration | Acronym | Pronunciation | Spelling | Relation | Connotation | Total |
|-----------|---------|--------------|----------|----------|-------------|-------|
| 1 | USTACCSF | 1 | 1 | 5 | 3 | 11/25 |
| 2 | TACC-SIM | 4 | 4 | 5 | 3 | **17/25** |
| 3 | TACCSF | 1 | 2 | 5 | 3 | 12/25 |
| 4 | TACC-SIMF | 4 | 4 | 5 | 3 | **17/25** |

*Quality can fluctuate - improvement on one aspect, decline on another*

**Solution**: Generate numerical scores for all aspects, select output with max total score across all iterations.

#### 7. Constrained Generation (pages 4, 37-38)

- **Task**: Generate sentences containing 20-30 given concepts (vs. 3-5 in original CommonGen)
- **Dataset**: 200 samples from Lin et al. (2020), extended constraints
- **Metric**: Concept coverage %, coherence
- **Best Gain**: GPT-4 +30.0% (15.0% → 45.0%)

**Why High Gains** (page 5):
> "This task benefits significantly from SELF-REFINE because there are more opportunities to miss some of the concepts on the first attempt, and thus SELF-REFINE allows the model to fix these mistakes subsequently."

**Iteration Improvements** (page 7):

| Iteration | Coverage % |
|-----------|-----------|
| y₀ | 29.0 |
| y₁ | 40.3 (+11.3) |
| y₂ | 46.7 (+6.4) |
| y₃ | 49.7 (+3.0) |

*Largest gains in first iteration, diminishing returns after*

## Detailed Ablation Studies

### 1. Impact of Feedback Quality (page 6)

**Experiment**: Compare actionable feedback vs. generic feedback vs. no feedback

| Task | SELF-REFINE | Generic FB | No FB |
|------|------------|-----------|-------|
| **Code Optimization** | 27.5 | 26.0 (-1.5) | 24.8 (-2.7) |
| **Sentiment Reversal** | 43.2 | 31.2 (-12.0) | 0 (-43.2) |
| **Acronym Generation** | 56.4 | 54.0 (-2.4) | 48.0 (-8.4) |

**Key Finding**:
> "Specific, actionable feedback yields superior results" (page 6)

**Actionable Feedback Example**:
- ✅ "Avoid repeated calculations in the for loop" (specific action + location)
- ❌ "Improve the efficiency of the code" (generic, no direction)

### 2. Multiple Iterations Analysis (pages 6-7)

**Diminishing Returns Pattern**:

| Task | Δ(y₀→y₁) | Δ(y₁→y₂) | Δ(y₂→y₃) |
|------|---------|---------|---------|
| Code Opt | +5.0 | +0.9 | +0.9 |
| Sentiment Rev | +1.0 | +1.2 | +0.7 |
| Constrained Gen | +11.3 | +6.4 | +3.0 |

**Optimal Iterations**: 2-3 iterations provide best balance of improvement vs. computational cost

**Quote** (page 6):
> "Figure 4 highlights the diminishing returns in the improvement as the number of iterations increases. Overall, having multiple FEEDBACK-REFINE iterations significantly enhances the quality of the output, although the marginal improvement naturally decreases with more iterations."

### 3. vs. Multiple Sampling (page 7)

**Experiment**: SELF-REFINE (1 output with refinement) vs. generating k=4 outputs without refinement

**Setup**: 1 vs. k evaluation - can SELF-REFINE beat all k initial outputs?

**Result**: Even in harder 1-vs-4 setting, SELF-REFINE outputs preferred by humans

**Implication**: Refinement according to feedback > just generating more candidates

### 4. Model Size Requirements (pages 7-8)

**Vicuna-13B Experiment** (weaker model):

**Failures**:
- Could not generate feedback in required format
- Failed to follow refinement prompts even with Oracle feedback
- Generated hallucinated conversations instead of refinements

**Quote** (page 8):
> "Vicuna-13B was trained on conversations, it does not generalize as well as instruction-based models to test-time few-shot tasks."

**Conclusion**: SELF-REFINE requires strong instruction-following capabilities (GPT-3.5+)

**Mixed-Refine Alternative** (page 20):
- Vicuna-13B for initialization: 24.18%
- ChatGPT for FEEDBACK + REFINE: **40.5%** (+16.3%)

*Smaller models can initialize, stronger models refine*

### 5. Qualitative Error Analysis (page 8)

**70 samples analyzed** (35 success, 35 failure) across Code Optimization and Math Reasoning

**Failure Attribution**:
- 33% - Feedback inaccurately pinpointed error location
- 61% - Feedback suggested inappropriate fix
- 6% - Refiner incorrectly implemented good feedback

**Quote** (page 8):
> "When SELF-REFINE failed to improve the original generation, the majority of issues were due to erroneous feedback rather than faulty refinements."

**Success Pattern**:
- 61% - Precise fixes from accurate feedback
- 33% - Rectified issues even with partially incorrect feedback

**Implication**: Refiner is relatively robust to sub-optimal feedback

### 6. Dialogue Response Error Analysis (pages 23-24)

**FEEDBACK Errors** (Table 11):

| Error Type | Occurrence | Impact |
|------------|-----------|--------|
| Incorrect feedback | 25% | Wrong critique direction |
| Generic feedback | 30% | Lacks specificity |
| Incorrect scoring | 10% | Misaligned scores |

**REFINE Errors** (Table 12):

| Error Type | Occurrence | Behavior |
|------------|-----------|----------|
| Not robust | 10% | Degrades with good feedback |
| Ignores feedback | 25% | No changes despite feedback |
| Introduces new problem | 20% | Fix one issue, create another |
| **Robust to bad feedback** | **60%** | **Ignores incorrect feedback** |

**Key Insight**: Model is surprisingly robust - often ignores bad feedback rather than following it blindly.

## Statistical Significance (page 28)

**Wilson Confidence Intervals** (95% confidence):

| Task | GPT-4 Base | GPT-4 +SELF-REFINE | Significant? |
|------|-----------|-------------------|--------------|
| Sentiment Reversal | 3.8 ± 1.28 | 36.2 ± 3.82 | ✅ * |
| Dialogue Response | 25.4 ± 5.36 | 74.6 ± 6.22 | ✅ * |
| Code Optimization | 27.3 ± 3.48 | 36.0 ± 3.81 | ✅ * |
| Code Readability | 27.4 ± 6.10 | 56.2 ± 7.45 | ✅ * |
| Math Reasoning | 92.9 ± 2.05 | 93.1 ± 2.03 | ❌ |
| Acronym Gen | 30.4 ± 6.92 | 56.0 ± 8.15 | ✅ * |
| Constrained Gen | 15.0 ± 5.38 | 45.0 ± 8.77 | ✅ * |

**Summary**:
- **GPT-4**: 6/7 tasks show statistically significant gains
- **ChatGPT**: 4/7 tasks significant
- **GPT-3.5**: 3/7 tasks significant

## Beyond Benchmarks: Website Generation (pages 25-27)

**Use Case**: Iteratively develop HTML/CSS/JS for websites

**Process**:
1. Generate rudimentary initial layout
2. Provide multi-dimensional feedback (design, content, usability, aesthetics)
3. Refine through iterations

**Example Feedback** (Ice Cream Parlor site):
- Change background color to light blue (#6f2ff)
- Increase heading font size to 48px
- Add icon before welcome text
- Add paragraph about toppings and cones
- Increase button text size to 24px
- Update button color to #9933

**Result**: Evolved from basic text layout to polished, visually appealing website

**Implication**: SELF-REFINE generalizes beyond benchmarks to creative, open-ended tasks

## Key Quotes with Page Numbers

### On Core Approach

> "Like humans, large language models (LLMs) do not always generate the best output on their first try. Motivated by how humans refine their written text, we introduce SELF-REFINE, an approach for improving initial outputs from LLMs through iterative feedback and refinement." (page 1)

> "SELF-REFINE does not require any supervised training data, additional training, or reinforcement learning, and instead uses a single LLM as the generator, refiner and the feedback provider." (page 1)

### On Performance

> "Across all evaluated tasks, outputs generated with SELF-REFINE are preferred by humans and automatic metrics over those generated with the same LLM using conventional one-step generation, improving by ∼20% absolute on average in task performance." (page 1)

> "Our work demonstrates that even state-of-the-art LLMs like GPT-4 can be further improved at test-time using our simple, standalone approach." (page 1)

### On Feedback Quality

> "By 'actionable', we mean the feedback should contain a concrete action that would likely improve the output. By 'specific', we mean the feedback should identify concrete phrases in the output to change." (page 4)

### On Iterations

> "Figure 4 demonstrates that on average, the quality of the output improves as the number of iterations increases... Figure 4 highlights the diminishing returns in the improvement as the number of iterations increases." (page 6)

### On Math Reasoning Limitations

> "The modest performance gains in Math Reasoning can be traced back to the inability to accurately identify whether there is any error. In math, errors can be nuanced and sometimes limited to a single line or incorrect operation. Besides, a consistent-looking reasoning chain can deceive LLMs to think that 'everything looks good' (e.g., ChatGPT feedback for 94% instances is 'everything looks good')." (pages 5-6)

### On Error Analysis

> "When SELF-REFINE failed to improve the original generation, the majority of issues were due to erroneous feedback rather than faulty refinements. Specifically, 33% of unsuccessful cases were due to feedback inaccurately pinpointing the error's location, while 61% were a result of feedback suggesting an inappropriate fix. Only 6% of failures were due to the refiner incorrectly implementing good feedback." (page 8)

### On Model Requirements

> "The main limitation of our approach is that the base models need to have sufficient few-shot modeling or instruction-following abilities, in order to learn to provide feedback and to refine in an in-context fashion, without having to train supervised models and rely on supervised data." (page 9)

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

### Why External Verification Matters

**Evidence from SELF-REFINE**:

1. **Math Reasoning**: 94% self-feedback says "everything looks good" when errors exist (page 6)
2. **With Oracle**: +4.8% improvement vs. 0% with self-feedback (page 22)
3. **Error Analysis**: 94% of failures due to bad feedback, not bad refinement (page 8)

**Cross-Reference to REF-002** (Roig et al.):
- Archetype 2 (Over-helpfulness): Models can't detect when they're being too verbose
- Archetype 3 (Context pollution): Models can't recognize when they've lost the thread
- **External verification catches what self-critique misses**

### Ralph Loop Implementation

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

### SELF-REFINE Lessons for Ralph

**1. Iteration is Powerful** (page 6):
- Average 20% improvement across tasks
- Validates iterative refinement approach
- But: **diminishing returns after 2-3 iterations**

**Ralph Application**: Default max 5 iterations, but expect most value in first 2-3

**2. Feedback Quality is Critical** (page 6):
- Actionable + specific feedback: 27.5% performance
- Generic feedback: 26.0% (-1.5%)
- No feedback: 24.8% (-2.7%)

**Ralph Application**:
- External validators provide specific error messages
- Structure analysis to be actionable ("fix syntax error on line 42" not "code has problems")

**3. History Retention Helps** (page 4):
> "Intuitively, this allows the model to learn from past mistakes and avoid repeating them." (page 4)

**Ralph Application**: Pass full iteration history to strategy adaptation

**4. Stopping Criteria Essential** (page 4):
- Fixed iterations (used in paper)
- Self-determined (model generates stop signal)

**Ralph Application**: Hybrid approach
- External verification provides objective stop signal (tests pass)
- Completion criteria provides goal-based stop signal
- Max iterations provides safety net

**5. Stronger Models Unlock More** (pages 5-6):
> "We thus believe that SELF-REFINE allows stronger models (such as GPT-4) to unlock their full potential, even in cases where this potential is not expressed in the standard, single-pass, output generation." (page 6)

**Ralph Application**: Use best available model for complex tasks requiring multiple iterations

### Multi-Agent Enhancement

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

**Evidence**: SELF-REFINE error analysis shows blind spots (page 8) - multiple perspectives reduce blind spots

## Limitations and Discussion

### Model Requirements (page 9)

> "The main limitation of our approach is that the base models need to have sufficient few-shot modeling or instruction-following abilities, in order to learn to provide feedback and to refine in an in-context fashion."

**Minimum Requirements**:
- GPT-3.5 level instruction-following
- Ability to parse few-shot examples
- Sufficient context window for iteration history

**Evidence**: Vicuna-13B failed despite 13B parameters (pages 7-8, 20-21)

### Language Limitations (page 9)

> "Another limitation of our work is that we exclusively experiment with datasets in English. In other languages, the current models may not provide the same benefits."

**Untested**: Non-English performance unknown

### Closed Models (page 9)

> "The experiments in this work were performed with language models that are not open-sourced, namely GPT-3.5, ChatGPT, GPT-4, and CODEX."

**Reproducibility Challenges**:
- Model details not fully disclosed
- Cost barriers for research
- Model biases unknown

**Mitigation**: Authors released code and model outputs

### Potential Misuse (page 9)

> "Finally, there is a possibility for bad actors to use prompting techniques to steer a model to generate more toxic or harmful text. Our approach does not explicitly guard against this."

**No Built-in Safety**: SELF-REFINE could theoretically refine toward harmful outputs if prompted

### Task-Specific Limitations

**Math Reasoning** (pages 5-6):
- Self-critique fails 94% of the time
- Requires external verification for significant gains
- Nuanced errors hard to detect

**Code Tasks** (page 8):
- Gains smaller than other tasks (8-14%)
- Functional correctness hard to assess without execution
- Algorithm improvements require deep reasoning

## Comparison with Related Work (pages 8-9, 15)

### vs. Self-Correction (Welleck et al. 2022)

| Feature | Self-Correction | SELF-REFINE |
|---------|----------------|-------------|
| Feedback | No explicit feedback | ✅ Explicit natural language feedback |
| Training | Trains separate refiner per task | ✅ No training |
| Multi-aspect | Single aspect (correctness) | ✅ Multi-dimensional quality |
| GSM-8k | 45.9% | **55.7%** (+9.8%) |

**Quote** (page 15):
> "Self-Correction does not train their model to generate explicit feedback; instead, Welleck et al. (2022) trained their models to refine only. As we show in Section 4 and Table 2, having the model generate explicit feedback results in significantly better refined outputs."

### vs. Reflexion (Shinn et al. 2023)

| Feature | Reflexion | SELF-REFINE |
|---------|-----------|-------------|
| Use case | ReAct planning | General NL generation |
| Feedback | Free-form reflection | Structured multi-dimensional |
| Focus | Next action selection | Output quality improvement |

**Quote** (page 15):
> "While ReAct and Reflexion provide a free-form reflection on whether a step was executed correctly and potential improvements, our approach is more granular and structured, with multi-dimensional feedback and scores."

### vs. RLHF Methods (page 9)

| Feature | RLHF (Stiennon et al. 2020) | SELF-REFINE |
|---------|---------------------------|-------------|
| Feedback access | No intermediate feedback | ✅ Feedback on every iteration |
| Training | Updates model parameters | ✅ No parameter updates |
| Data requirements | Large labeled datasets | ✅ Few-shot examples only |

### vs. Trained Refiners (PEER, CodeRL)

| Feature | PEER (Schick et al. 2022) | SELF-REFINE |
|---------|--------------------------|-------------|
| Training | Supervised on edit pairs | ✅ No training |
| Feedback source | Wikipedia edits | ✅ Self-generated |
| Domain transfer | New training per domain | ✅ Same approach all domains |

## Prompting Details (pages 37-38)

### Prompt Construction Principles

**GENERATE Prompt** (p_gen):
- 3-15 few-shot examples ⟨x^(k), y^(k)⟩
- Task-specific instructions
- Input-output pairs demonstrating desired quality

**FEEDBACK Prompt** (p_fb):
- Input-output-feedback triples ⟨x^(k), y^(k), fb^(k)⟩
- Examples of actionable, specific feedback
- Multi-dimensional scoring rubrics (for applicable tasks)
- Chain-of-thought reasoning before scores

**REFINE Prompt** (p_refine):
- Input-output-feedback-refined quadruples ⟨x^(k), y_t^(k), fb_t^(k), y_{t+1}^(k)⟩
- Shows how to incorporate feedback
- Examples of improvement in specific dimensions

### Example Prompt Sizes (from Appendices)

| Task | p_gen examples | p_fb examples | p_refine examples |
|------|---------------|---------------|------------------|
| Sentiment Reversal | 1 (with variants) | 2 | 2 |
| Dialogue | 3 | 6 | 6 |
| Acronym | 15 | 3 | 3 |
| Code Opt | 2 | 2 | 2 |
| Math | 8 (from PaL) | 2 | 2 |
| Constrained Gen | 10 | 6 | 6 |

## Experimental Setup Details

### Models Used (page 4)

- **GPT-3.5**: `text-davinci-003`
- **ChatGPT**: `gpt-3.5-turbo`
- **GPT-4**: `gpt-4` (March 2023)
- **Codex**: `code-davinci-002` (code tasks only)

### Hyperparameters (pages 4, 31-32)

- **Temperature**: 0.7 for all setups
- **Decoding**: Greedy with sampling
- **Max iterations**: 4 (all experiments)
- **Context**: Full history of all previous iterations

### Dataset Sizes (page 14)

| Task | Size | Type |
|------|------|------|
| Sentiment Reversal | 1000 | Review passages |
| Dialogue | 372 | Conversations |
| Code Optimization | 1000 | Python programs |
| Code Readability | 300 | Python programs |
| Math Reasoning | 1319 | Word problems |
| Acronym Generation | 250 | Technical titles |
| Constrained Gen | 200 | Concept sets |

## Human Evaluation Details (pages 16, 33)

### Evaluation Protocol

**Blind A/B Testing**:
- Show human evaluators two outputs (SELF-REFINE vs. Baseline)
- Do not reveal which method generated which output
- Ask: "Which output better aligns with the task instruction?"
- Options: Output A, Output B, Both equally good, Neither

### Results (page 16)

| Task | SELF-REFINE Preferred | Baseline Preferred | Equal |
|------|---------------------|-------------------|-------|
| Sentiment Reversal | 75.00% | 21.43% | 3.57% |
| Acronym Generation | 44.59% | 12.16% | 43.24% |
| Dialogue Response | 47.58% | 19.66% | 32.76% |

**Sample Size**: 150 examples per task

### GPT-4 as Evaluator (page 5, 17)

**Correlation with Human Judgment**:
- Sentiment Reversal: 82%
- Acronym Generation: 68%
- Dialogue Response: 71%

**Method**: Zero-shot prompting with GPT-4 to select preferred output

**Validation**: High correlation suggests GPT-4 can serve as proxy for human evaluation

## Implementation and Reproducibility

### Released Resources

- **Code**: Available at https://selfrefine.info/
- **Prompts**: Full prompts in Appendix S (Figures 16-35)
- **Model Outputs**: Released for reproducibility
- **Dataset Details**: Table 4 (page 14)

### Prompt Examples Available (pages 39-54)

- Acronym Generation: Figures 16-18
- Code Optimization: Figures 19-21
- Code Readability: Figures 22-23
- Constrained Generation: Figures 24-26
- Dialogue Response: Figures 27-29
- Math Reasoning: Figures 30-32
- Sentiment Reversal: Figures 33-35

## Future Research Directions (Implied)

### From Limitations Section

1. **Extend to open-source models**: Test with Llama, Mistral, etc.
2. **Multi-language support**: Evaluate non-English performance
3. **Safety mechanisms**: Guard against refinement toward harmful outputs
4. **Feedback robustness**: Improve resilience to incorrect feedback
5. **Task-specific stopping**: Better automatic stopping criteria

### From Results

1. **Math reasoning improvements**: Better self-critique for numerical tasks
2. **Reduce iterations**: Achieve same gains in fewer steps
3. **Hybrid approaches**: Combine self-feedback with external validators
4. **Multi-agent refinement**: Different models for different feedback aspects

### From AIWG Perspective

1. **External verification integration**: Systematic combination of self-feedback and external checks
2. **Failure mode detection**: Use SELF-REFINE patterns to detect Roig archetypes
3. **Quality metric development**: Automated assessment of refinement quality
4. **Cross-iteration learning**: Better strategy for incorporating historical context

## Relevance to AIWG

| Category | Relevance | Why |
|----------|-----------|-----|
| **Ralph Loop** | **Critical** | Theoretical foundation for iterative refinement without training |
| **Recovery Patterns** | **Critical** | Validates feedback-driven improvement approach |
| **External Verification** | **Critical** | Math results prove necessity of external validation |
| **Multi-Agent Review** | **High** | Self-Refine + multi-perspective = stronger refinement |
| **Stopping Criteria** | **High** | Demonstrates importance of clear completion conditions |
| **Quality Metrics** | **Medium** | Multi-dimensional feedback applicable to AIWG quality assessment |
| **Prompt Engineering** | **Medium** | Few-shot patterns applicable to AIWG agent design |

## Cross-References

### AIWG Internal

- **Ralph Loop**: `@tools/ralph-external/loop-executor.ts` - implements externally-verified SELF-REFINE
- **Ralph Guide**: `@docs/ralph-guide.md` - user documentation
- **Flow Commands**: Self-healing patterns in orchestration
- **Quality Framework**: `@agentic/code/addons/quality/metrics.ts` - multi-dimensional assessment inspired by SELF-REFINE

### Other Papers

- **REF-002** (Roig et al.): Failure modes that self-critique misses, motivating external verification
- **REF-003** (Shinn et al. - Reflexion): Concurrent work on self-reflection for agents
- **REF-014** (Bai et al. - Constitutional AI): Alternative approach using AI feedback for training

### Related Work Cited in Paper

- Welleck et al. (2022): Self-Correction - trained refiners
- Schick et al. (2022): PEER - Wikipedia edit-based refinement
- Madaan et al. (2023): PIE - code optimization benchmark
- Gao et al. (2022): PAL - program-aided language models

## Actionable Insights for AIWG

### Immediate Applications

1. **Validate Ralph Loop Design**: SELF-REFINE confirms iterative refinement works, Ralph's external verification addresses blind spots

2. **Set Iteration Limits**: Data supports max 5 iterations (diminishing returns after 2-3)

3. **Structured Feedback**: Use multi-dimensional feedback in agent review processes
   - Example: Test Engineer feedback could score coverage, edge cases, performance separately

4. **History Retention**: Pass full iteration context to strategy adaptation (already doing this)

5. **Stopping Criteria**: Combine external validation + completion criteria + max iterations

### Design Patterns

**From SELF-REFINE**:
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

### Quality Metrics

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

### Prompt Engineering

**Apply SELF-REFINE principles to AIWG agent prompts**:

1. **Few-shot examples**: Include input-output-feedback-refined quadruples
2. **Actionable feedback**: Train agents to give specific, actionable critique
3. **Multi-dimensional**: Score multiple aspects separately
4. **Chain-of-thought**: Explain reasoning before giving scores

## Conclusion

Self-Refine validates the core assumption behind AIWG's Ralph loop: **iterative refinement with feedback improves LLM outputs without training**. The ~20% average improvement across diverse tasks proves the approach works. However, the Math Reasoning results reveal critical limitations - self-critique has blind spots that external verification addresses.

**Key Takeaway for AIWG**: Ralph's combination of SELF-REFINE's iterative refinement pattern with external verification (tests, linters, validators) represents the best of both worlds - the flexibility of self-improvement plus the objectivity of external checks.

**Validation**: Self-Refine's success across 7 diverse tasks confirms that refinement loops are a general-purpose technique for improving LLM outputs, not just a code-specific hack.

**Enhancement**: Ralph extends SELF-REFINE by replacing unreliable self-critique with reliable external validation, addressing the core limitation revealed in the Math Reasoning experiments.

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Analysis | Comprehensive documentation created from PDF with full algorithm details, benchmark results, ablation studies, Ralph loop mapping, and AIWG integration guidance |

## References

**Primary Source**: Madaan et al. (2023) - Self-Refine paper

**AIWG Cross-References**:
- `@tools/ralph-external/` - Ralph loop implementation
- `@docs/ralph-guide.md` - Ralph user documentation
- `@docs/references/REF-002-roig-failure-modes.md` - Why external verification needed

**Code Repository**: https://github.com/madaan/self-refine

**Website**: https://selfrefine.info
