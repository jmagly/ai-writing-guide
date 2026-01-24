# REF-021: Reflexion - Language Agents with Verbal Reinforcement Learning

## Citation

Shinn, N., Cassano, F., Berman, E., Gopinath, A., Narasimhan, K., & Yao, S. (2023). Reflexion: Language Agents with Verbal Reinforcement Learning. *Advances in Neural Information Processing Systems 36 (NeurIPS 2023)*.

**arXiv**: [https://arxiv.org/abs/2303.11366](https://arxiv.org/abs/2303.11366)

**GitHub**: [https://github.com/noahshinn/reflexion](https://github.com/noahshinn/reflexion)

## Document Profile

| Attribute | Value |
|-----------|-------|
| **Publication** | NeurIPS 2023 |
| **Authors** | Shinn et al. (Northeastern, MIT, Princeton) |
| **Research Type** | Novel reinforcement learning paradigm |
| **Primary Focus** | Verbal reinforcement via self-reflection and episodic memory |
| **Base Models** | GPT-4, GPT-3.5-turbo, text-davinci-003 |
| **Key Innovation** | Learning through linguistic feedback without weight updates |

## Executive Summary

Reflexion introduces a paradigm shift in language agent learning by replacing expensive gradient-based updates with verbal reinforcement. After task failure, agents generate natural language reflections on their mistakes, store these in episodic memory, and use accumulated wisdom to improve in subsequent trials. This lightweight approach achieves state-of-the-art results—91% pass@1 on HumanEval (surpassing GPT-4's 80%)—without any model fine-tuning.

**Bottom Line**: Reflexion enables LLM agents to learn from experience through self-critique and memory, achieving RL benefits without training costs.

## Key Findings

### Performance Breakthroughs

1. **HumanEval (Python)**: 67% → 91% pass@1 (GPT-3 + Reflexion)
   - Surpasses GPT-4 baseline (80%) by 11 percentage points
   - State-of-the-art on code generation benchmark

2. **AlfWorld (Decision-Making)**: 65% → 97% success rate
   - 22% absolute improvement over ReAct baseline
   - 130 out of 134 tasks completed successfully
   - Learning improves across 12 iterative trials

3. **HotPotQA (Reasoning)**: 31% → 51% accuracy (ReAct)
   - 20% improvement with verbal reflection
   - CoT (GT) + Reflexion: 68% → 80% accuracy
   - 8% boost over episodic memory alone

4. **Cross-Language Code Generation**:
   - HumanEval Rust: 60% → 68%
   - MBPP Python: 80.1% → 77.1% (limited by test quality)
   - MBPP Rust: 70.9% → 75.4%
   - Leetcode Hard (Python): 7.5% → 15% (2x improvement)

### Core Insights

- **Verbal Learning**: Natural language feedback is more actionable than scalar rewards
- **No Fine-Tuning**: All improvements at inference time through context
- **Episodic Memory**: Sliding window of 1-3 reflections enables transfer learning
- **Credit Assignment**: Self-reflection helps identify specific failure points in long trajectories
- **Emergent Capability**: Self-correction quality improves with model size (works with GPT-4, limited with smaller models)

## Method/Architecture

### Three-Model Framework

Reflexion uses three distinct LLM-based components:

#### 1. Actor (Ma)

**Role**: Generates text and actions based on current state

**Implementation**:
```
Policy πθ(at|st) where θ = {Ma, mem}
- at: action or text generation at time t
- st: current state (task + trajectory history)
- mem: episodic memory buffer
```

**Actor Variants**:
- **Chain-of-Thought (CoT)**: Step-by-step reasoning for single-generation tasks
- **ReAct**: Interleaved reasoning and acting for multi-step decision-making

**Memory Component**:
- Sliding window of past self-reflections (typically Ω = 1-3 experiences)
- Provides context-based learning without weight updates
- Inspired by Brooks et al.'s in-context policy iteration

#### 2. Evaluator (Me)

**Role**: Scores generated outputs to produce reward signal

**Evaluation Strategies by Task Type**:

| Task Type | Evaluation Method | Example |
|-----------|------------------|---------|
| **Reasoning** | Exact match (EM) grading | HotPotQA answer verification |
| **Decision-Making** | Pre-defined heuristics | AlfWorld: repeated actions >3 cycles, trajectory >30 steps |
| **Programming** | Self-generated unit tests + execution | Python/Rust compiler feedback |
| **Decision-Making (Alt)** | LLM-based binary classification | GPT evaluates trajectory success |

**Output**: Binary or scalar reward rt = Me(τt) for trajectory τt

#### 3. Self-Reflection (Msr)

**Role**: Converts sparse rewards into detailed verbal feedback

**Input**: {trajectory τt, reward rt, episodic memory mem}

**Output**: Natural language reflection srt containing:
- **Credit assignment**: Identification of specific failing actions
- **Causal reasoning**: Explanation of why actions led to failure
- **Actionable insights**: Concrete suggestions for improvement

**Example Reflection** (AlfWorld):
```
"In this environment, my plan was to find a mug then find and use a
desklamp. However, the task says to examine the mug with the desklamp.
I should have looked for the desklamp first, then looked for the mug.
I noticed that the desklamp was found on desk 1. In the next trial,
I will go to desk 1, find the lamp, then look for the mug and examine
it with the desklamp."
```

### Memory Architecture

**Short-Term Memory**:
- Current trajectory history: τt = [a0, o0, ..., ai, oi]
- Represents immediate context and recent decisions

**Long-Term Memory**:
- Episodic buffer storing self-reflections: mem = [sr0, sr1, ..., srt]
- Maximum capacity Ω (typically 1-3) to respect context limits
- Most recent experiences inform future decisions
- Provides "lessons learned" across trials

**Memory Operations**:
```
Initialize: mem ← []
After each trial t:
  1. Generate reflection: srt ← Msr(τt, rt, mem)
  2. Append to memory: mem ← mem + [srt]
  3. Truncate if needed: mem ← last Ω elements
```

### Complete Reflexion Algorithm

```
Algorithm 1: Reinforcement via self-reflection

Initialize Ma (Actor), Me (Evaluator), Msr (Self-Reflection)
Initialize policy πθ(ai|si), θ = {Ma, mem}
Generate initial trajectory τ0 using πθ
Evaluate τ0 using Me → r0
Generate initial self-reflection sr0 using Msr
Set mem ← [sr0]
Set t = 0

while Me(τt) ≠ pass and t < max_trials do
    Generate trajectory τt = [a0, o0, ..., ai, oi] using πθ
    Evaluate trajectory: rt ← Me(τt)
    Generate self-reflection: srt ← Msr(τt, rt, mem)
    Append to memory: mem ← mem + [srt]
    Truncate to capacity: mem ← last Ω elements
    Increment t
end while

return final trajectory
```

**Key Difference from Traditional RL**:
- No gradient descent or weight updates
- Policy "update" occurs by modifying memory context
- Learning is immediate and interpretable

## Benchmark Results

### Decision-Making: AlfWorld (134 Tasks)

| Method | Success Rate | Trial 0 | Trial 12 | Notes |
|--------|-------------|---------|----------|-------|
| ReAct only | 75% | 65% | 75% | Plateaus at trial 6-7 |
| ReAct + Reflexion (Heuristic) | **97%** | 78% | 97% | 130/134 tasks solved |
| ReAct + Reflexion (GPT) | 95% | 76% | 95% | LLM-based evaluation |

**Error Analysis by Type**:

| Error Type | ReAct Only | ReAct + Reflexion |
|------------|-----------|-------------------|
| Hallucination | 22% → 1% | 95% reduction |
| Inefficient Planning | 35% → 2% | 94% reduction |

**Learning Curve**:
- **Immediate spike**: 65% → 78% after first reflection
- **Steady improvement**: Gains across all 12 trials
- **Near-perfect**: 97% by trial 12 vs 75% baseline plateau

### Reasoning: HotPotQA (100 Questions)

#### Multi-Hop QA with Wikipedia API

| Method | Trial 0 | Final | Temperature | Improvement |
|--------|---------|-------|-------------|-------------|
| ReAct only | 39% | 39% | 0.7 | No learning |
| CoT only | 29% | 29% | 0.7 | No learning |
| **ReAct + Reflexion** | **39%** | **51%** | 0.7 | +12% |
| **CoT + Reflexion** | **29%** | **47%** | 0.7 | +18% |

#### Reasoning with Ground Truth Context

| Method | Trial 0 | Final | Improvement |
|--------|---------|-------|-------------|
| CoT (GT) only | 68% | 68% | No learning |
| **CoT (GT) + Reflexion** | **68%** | **80%** | **+12%** |

**Ablation: Episodic Memory vs Self-Reflection**

| Approach | Accuracy | Notes |
|----------|----------|-------|
| CoT (GT) only | 68% | Baseline |
| CoT (GT) + Episodic Memory | 72% | +4% from context alone |
| **CoT (GT) + EPM + Reflexion** | **80%** | **+8% boost from verbal reflection** |

**Key Insight**: Self-reflection provides 2x the benefit of context alone (8% vs 4%)

### Programming: HumanEval, MBPP, LeetcodeHard

#### Pass@1 Accuracy Across Languages

| Benchmark + Language | Prev SOTA | GPT-4 Baseline | Reflexion | Improvement |
|---------------------|-----------|----------------|-----------|-------------|
| **HumanEval (PY)** | 65.8% (CodeT + GPT-3.5) | 80.1% | **91.0%** | **+10.9%** |
| **HumanEval (RS)** | - | 60.0% | **68.0%** | **+8.0%** |
| MBPP (PY) | 67.7% (CodeT + Codex) | 80.1% | 77.1% | -3.0% |
| **MBPP (RS)** | - | 70.9% | **75.4%** | **+4.5%** |
| **Leetcode Hard (PY)** | - | 7.5% | **15.0%** | **+7.5% (2x)** |

**Note on MBPP Python**: False positive rate (16.3% vs 1.4% for HumanEval) due to flaky test generation limits Reflexion effectiveness

#### Test Generation Analysis

| Benchmark | Base | Reflexion | TP | FN | FP | TN |
|-----------|------|-----------|----|----|----|----|
| HumanEval (PY) | 0.80 | **0.91** | 0.99 | 0.40 | **0.01** | 0.60 |
| MBPP (PY) | 0.80 | 0.77 | 0.84 | 0.59 | **0.16** | 0.41 |
| HumanEval (RS) | 0.60 | **0.68** | 0.87 | 0.37 | **0.13** | 0.63 |
| MBPP (RS) | 0.71 | **0.75** | 0.84 | 0.51 | **0.16** | 0.49 |

**Legend**:
- TP: Unit tests pass, solution correct (ideal)
- FN: Unit tests fail, solution correct (false negative - recoverable)
- FP: Unit tests pass, solution wrong (false positive - problematic)
- TN: Unit tests fail, solution wrong (correct failure detection)

**Key Finding**: MBPP has 16x higher FP rate than HumanEval (0.16 vs 0.01), causing premature termination on incorrect solutions

#### Ablation Study: HumanEval Rust (50 Hardest Problems)

| Approach | Test Generation | Self-Reflection | Pass@1 |
|----------|----------------|-----------------|--------|
| Base model | False | False | 0.60 |
| Test generation only | True | False | **0.60** (no improvement) |
| Self-reflection only | False | True | **0.52** (harmful without tests) |
| **Reflexion (both)** | **True** | **True** | **0.68** |

**Critical Insights**:
1. **Test generation alone insufficient**: Catches errors but doesn't improve fixes (0.60 = baseline)
2. **Self-reflection needs guidance**: Without test feedback, agents make harmful edits (0.52 < baseline)
3. **Synergy required**: Both components together achieve 13% gain (0.68 vs 0.60)

### Model Scaling: HotPotQA Across Model Sizes

#### CoT (GT) + Reflexion Performance

| Model | Baseline | Reflexion | Improvement |
|-------|----------|-----------|-------------|
| text-davinci-003 | 60% | **77%** | +17% |
| gpt-3.5-turbo | 57% | **71%** | +14% |
| gpt-4 | 68% | **80%** | +12% |

#### ReAct + Reflexion Performance

| Model | Baseline | Reflexion | Improvement |
|-------|----------|-----------|-------------|
| text-davinci-003 | 30% | **55%** | +25% |
| gpt-3.5-turbo | 26% | **38%** | +12% |
| gpt-4 | 39% | **51%** | +12% |

**Weaker Model Test: HumanEval Python with starchat-beta**

| Approach | Avg Pass@1 (8 trials) | Std Dev |
|----------|----------------------|---------|
| Baseline | 0.26 | 0.00481 |
| Reflexion | 0.26 | 0.00305 |

**Key Insight**: Self-correction is an emergent capability of larger models; smaller models lack the capacity to generate useful reflections

## Comparison to Related Methods

### Reflexion vs Self-Refine

| Dimension | Self-Refine | Reflexion |
|-----------|-------------|-----------|
| **Memory** | None (stateless) | Episodic memory across trials |
| **Scope** | Single-generation tasks | Multi-step decision-making + reasoning |
| **Feedback** | Task-specific constraints ("more positive") | Open-ended self-evaluation |
| **Learning** | Within-episode only | Across-episode transfer |

### Reflexion vs Traditional RL

| Dimension | Policy Gradient RL | Reflexion |
|-----------|-------------------|-----------|
| **Learning Signal** | Scalar rewards (credit assignment hard) | Verbal feedback (specific guidance) |
| **Update Mechanism** | Gradient descent on weights | Memory context update |
| **Compute Cost** | High (training runs) | Minimal (inference only) |
| **Interpretability** | Black box | Natural language explanations |
| **Sample Efficiency** | Requires many samples | Few-shot (1-12 trials) |

### Reflexion vs Code Debugging Approaches

| Approach | Test Execution | Debugging | Self-Generated Tests | Multi-Language | Self-Reflection |
|----------|----------------|-----------|---------------------|----------------|-----------------|
| AlphaCode | ✓ (hidden) | ✗ | ✗ | ✓ | ✗ |
| CodeT | ✓ | ✗ | ✓ | ✗ | ✗ |
| Self-Debugging | ✓ | ✓ | ✗ | ✗ | ✗ |
| CodeRL | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Reflexion** | **✓** | **✓** | **✓** | **✓** | **✓** |

**Key Distinction**: Reflexion bridges error identification (debugging) and implementation improvement (self-reflection) in a unified framework

## Key Quotes for Citation

> "Reflexion agents verbally reflect on task feedback signals, then maintain their own reflective text in an episodic memory buffer to induce better decision-making in subsequent trials." (p. 1)

> "Reflexion achieves a 91% pass@1 accuracy on the HumanEval coding benchmark, surpassing the previous state-of-the-art GPT-4 that achieves 80%." (p. 1)

> "This self-reflective feedback acts as a 'semantic' gradient signal by providing the agent with a concrete direction to improve upon, helping it learn from prior mistakes to perform better on the task." (p. 2)

> "Reflexion is flexible enough to incorporate various types (scalar values or free-form language) and sources (external or internally simulated) of feedback signals." (p. 1)

> "The simple associative token-level choices of LMs are also reminiscent of 'System 1', and thus might benefit from augmentation by a more deliberate 'System 2' planning process." (Related to Kahneman's dual-process theory)

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

## Limitations and Failure Modes

### WebShop Experiment: Local Minima Problem

**Task**: Navigate e-commerce website to locate and purchase products

**Results**:
- ReAct only: 33% success
- ReAct + Reflexion: 35% success (minimal improvement)
- Learning plateaus after 4 trials

**Analysis**:
- **Search ambiguity**: E-commerce search requires very precise queries
- **Exploration vs exploitation**: Reflexion struggles with tasks requiring creative diversity
- **Unhelpful reflections**: Agents generate generic feedback without actionable specifics

**Lesson**: Reflexion works best when:
- Permissible actions are observable in state
- Failure modes have clear causal explanations
- Success requires refinement > radical exploration

### Test Generation Quality (Programming)

**Problem**: Self-generated tests can be flaky or incorrect

**Impact on MBPP Python**:
- False positive rate: 16.3% (vs 1.4% for HumanEval)
- Premature success declarations on wrong code
- Lower Reflexion accuracy than baseline (77.1% vs 80.1%)

**Mitigation in AIWG**:
- Prefer external test suites when available
- Combine self-generated tests with ground truth
- Add test validation step before execution

### Model Size Requirements

**Observation**: Smaller models (starchat-beta) show no improvement with Reflexion

**Hypothesis**: Self-correction is an emergent capability requiring:
- Strong self-evaluation ability
- Accurate credit assignment
- Actionable natural language generation

**Implication for AIWG**: Recommend GPT-4 class models for Ralph loop

## Cross-References

### Within AIWG Reference Library

- **REF-020**: Tree of Thoughts (deliberate search planning)
- **REF-024**: LATS (combines Reflexion reflection with ToT search)
- **REF-018**: ReAct (reasoning + acting baseline)
- **REF-015**: Self-Refine (single-generation iterative refinement)
- **REF-002**: Roig failure modes (error categorization for reflection)

### AIWG Documentation

- **@docs/ralph-guide.md**: Ralph loop implementation and patterns
- **@.aiwg/ralph/**: State directory for iterative execution
- **@.claude/commands/flow-*.md**: Phase transition workflows with reflection
- **@agentic/code/frameworks/sdlc-complete/docs/ralph-external.md**: External Ralph loop architecture

### Related Research

- Self-Refine: Madaan et al. (2023) - Iterative refinement without memory
- ReAct: Yao et al. (2023) - Reasoning + acting pattern
- LATS: Zhou et al. (2024) - Tree search agents with reflection
- Self-Debugging: Chen et al. (2023) - Code debugging without reflection
- Chain-of-Thought: Wei et al. (2022) - Step-by-step reasoning
- Constitutional AI: Anthropic (2022) - Self-critique and revision

## Quick Reference Locations

### Code Examples

- **GitHub Repository**: [noahshinn/reflexion](https://github.com/noahshinn/reflexion)
- **Prompts**: See Appendix C (Programming), D (Reasoning), B (Decision-Making)
- **Full trajectories**: Figures 1, 5, 7 in paper

### Key Figures and Tables

- **Figure 1** (p. 3): Reflexion workflow across decision-making, programming, reasoning
- **Figure 2** (p. 4): Architecture diagram and Algorithm 1
- **Figure 3** (p. 6): AlfWorld learning curves and error analysis
- **Figure 4** (p. 7): HotPotQA results across methods
- **Table 1** (p. 7): Programming pass@1 results across benchmarks
- **Table 2** (p. 8): Test generation performance analysis
- **Table 3** (p. 8): Ablation study on HumanEval Rust
- **Table 5** (p. 12): Model scaling results on HotPotQA

### Experimental Details

- **Decision-Making**: AlfWorld (134 tasks), 6 task types, GPT-3, max 12 trials, Ω=3
- **Reasoning**: HotPotQA (100 questions), GPT-4, temperature=0.7, Ω=3
- **Programming**: HumanEval (164 problems), MBPP (427 problems), LeetcodeHard (40 problems), GPT-4, Ω=1
- **Languages**: Python, Rust (via MultiPL-E compiler)
- **Few-shot**: 2-shot (ReAct/self-reflection), 6-shot (CoT)

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
| 2026-01-24 | Technical Research | Comprehensive documentation with full benchmark results, three-model architecture, detailed ablations, AIWG Ralph loop mapping, and programming test generation analysis |
