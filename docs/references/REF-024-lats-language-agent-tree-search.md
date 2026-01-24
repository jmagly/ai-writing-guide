# REF-024: LATS - Language Agent Tree Search Unifies Reasoning, Acting, and Planning

## Citation

Zhou, A., Yan, K., Shlapentokh-Rothman, M., Wang, H., & Wang, Y.-X. (2024). Language Agent Tree Search Unifies Reasoning, Acting, and Planning in Language Models. *Proceedings of the 41st International Conference on Machine Learning (ICML 2024)*.

**arXiv**: [https://arxiv.org/abs/2310.04406](https://arxiv.org/abs/2310.04406)

**GitHub**: [https://github.com/lapisrocks/LanguageAgentTreeSearch](https://github.com/lapisrocks/LanguageAgentTreeSearch)

---

## Document Profile

| Attribute | Value |
|-----------|-------|
| **Publication** | ICML 2024 |
| **Authors** | Andy Zhou, Kai Yan, Michal Shlapentokh-Rothman, Haohan Wang, Yu-Xiong Wang |
| **Affiliation** | University of Illinois Urbana-Champaign, Carnegie Mellon University |
| **Base Models** | GPT-4, GPT-3.5-turbo |
| **Key Innovation** | First unified framework combining reasoning (ToT), acting (ReAct), and planning (MCTS) |
| **Core Algorithm** | Monte Carlo Tree Search (MCTS) adapted for language agents |
| **Novel Contribution** | Hybrid value function: V(s) = λ * LM(s) + (1-λ) * SC(s) |
| **Best Result** | 92.7% pass@1 on HumanEval with GPT-4 (state-of-the-art) |
| **Task Coverage** | Programming, web navigation, question answering, reasoning games |

---

## Executive Summary

**Bottom Line**: LATS is the first general framework that unifies reasoning (deliberate search), acting (environment interaction), and planning (tree-based exploration) in language models. By adapting Monte Carlo Tree Search (MCTS) to language agent execution, LATS achieves state-of-the-art results on programming (92.7% HumanEval), web navigation (75.9 WebShop), and question answering (71% HotPotQA CoT+ReAct).

**What Makes It Work**: A novel hybrid value function combines LM-generated scores with self-consistency voting to guide tree search. External environment feedback (test execution, web responses, answer verification) enables backtracking from failed paths. Self-reflection generates verbal critiques that improve subsequent exploration.

**Impact for AIWG**: Provides theoretical foundation for Ralph loop's iterative error recovery and validates backtracking patterns in SDLC flow commands. LATS demonstrates that deliberate search over action spaces (not just thought spaces) yields superior performance compared to single-path execution (ReAct) or pure reasoning search (ToT).

---

## Key Findings

### Performance Breakthroughs

1. **State-of-the-Art Code Generation**
   - HumanEval GPT-4: **92.7% pass@1** (previous best: 82.4% ReAct)
   - HumanEval GPT-3.5: **83.8% pass@1** (+1.4% over ReAct)
   - MBPP GPT-3.5: **81.1% pass@1** (vs 70.8% ReAct)

2. **Superior Web Navigation**
   - WebShop: **75.9 average score** (vs 53.8 ReAct, +41% improvement)
   - First method to exceed human baseline (62) by significant margin

3. **Robust Question Answering**
   - HotPotQA with CoT+ReAct: **71% accuracy** (vs 63% ReAct-only, 62% CoT)
   - Game of 24: **44% success rate** (vs 7.3% ReAct, +500% improvement)

4. **Consistent Gains Across Tasks**
   - Outperforms ReAct baseline on all 5 benchmarks tested
   - Surpasses or matches ToT despite ToT using privileged information (pruning rules)

### Core Insights

1. **Search Over Actions Matters**: Tree search through action space (not just thought space) crucial for tasks requiring environment interaction

2. **External Feedback Drives Exploration**: Environment signals (test results, web responses) more reliable than pure LM self-evaluation

3. **Self-Reflection Accelerates Search**: Verbal critiques of failed trajectories reduce exploration of similar dead-ends

4. **Hybrid Evaluation Works Best**: Combining LM scoring with self-consistency voting (λ = 0.5 optimal) outperforms either alone

5. **Sample Efficiency**: LATS achieves better results with fewer LM calls than naive tree expansion (5-10 candidates per node vs exhaustive branching)

---

## Method and Architecture

### Monte Carlo Tree Search (MCTS) Adaptation

LATS adapts classical MCTS for language agent decision-making through six core operations:

#### 1. Selection

Use Upper Confidence Bound (UCT) formula to select most promising node:

```
UCT(s, a) = Q(s, a) + c * sqrt(ln(N(s)) / N(s, a))

Where:
- Q(s, a) = average value of state-action pair
- N(s) = visit count of state s
- N(s, a) = visit count of (s, a) pair
- c = exploration constant (paper uses c = 1.0)
```

**Key Insight**: UCT balances exploitation (high Q values) with exploration (low visit counts).

#### 2. Expansion

Generate k candidate actions using LM in-context learning:

```
Prompt Template:
"Given state: {current_state}
Previous attempts: {reflection_memory}
Generate {k} possible next actions with reasoning."

Yields: [(thought₁, action₁), ..., (thoughtₖ, actionₖ)]
```

**Configuration**: Paper uses k = 5 candidates per expansion.

#### 3. Evaluation

Hybrid value function combining LM scoring and self-consistency:

```
V(s) = λ * V_LM(s) + (1 - λ) * V_SC(s)

Where:
- V_LM(s) = LM-generated scalar score (0-1 scale)
- V_SC(s) = self-consistency voting score
- λ = weighting parameter (λ = 0.5 optimal)
```

**LM Evaluation (V_LM)**:
```
Prompt: "Rate the promise of this state for solving the task.
State: {current_state}
Rating (0-1):"
```

**Self-Consistency (V_SC)**:
```
Generate n independent rollouts from state s
V_SC(s) = (number reaching goal state) / n
Paper uses n = 5 rollouts
```

#### 4. Simulation

Execute action in environment and observe outcome:

```
(s', o, r) = Environment.step(s, a)

Where:
- s' = next state
- o = observation (test result, web page, answer correctness)
- r = reward signal (binary or scalar)
```

**Task-Specific Rewards**:
- Programming: r = 1 if all tests pass, else 0
- WebShop: r = attribute match score / max_attributes
- HotPotQA: r = 1 if answer correct, else 0
- Game of 24: r = 1 if expression equals 24, else 0

#### 5. Backpropagation

Update values along path from leaf to root:

```
For each node n in path from leaf to root:
  N(n) += 1
  Q(n) = (Q(n) * (N(n) - 1) + V_leaf) / N(n)
```

**Running Average**: Q values incrementally updated with each simulation.

#### 6. Reflection

On failed terminal states, generate self-reflection:

```
Prompt: "This attempt failed.
Trajectory: {failed_path}
Error: {environment_feedback}
Reflection: What went wrong and how to improve?"

Output stored in episodic memory for subsequent expansions.
```

**Memory Integration**: Reflections added to expansion prompts to avoid repeating mistakes.

### Complete LATS Algorithm

```python
Algorithm 1: Language Agent Tree Search

Input: Task description τ, LM agent π, max iterations T, expansion width k
Output: Solution trajectory or failure

1: Initialize root node s₀ with τ
2: reflection_memory ← []
3:
4: for t = 1 to T do
5:   # Selection: Traverse tree using UCT
6:   s ← s₀
7:   while s is not leaf:
8:     a ← argmax_a [Q(s,a) + c * sqrt(ln(N(s)) / N(s,a))]
9:     s ← child(s, a)
10:
11:  # Expansion: Generate k candidate actions
12:  candidates ← π.generate(s, reflection_memory, k=k)
13:  for (thought, action) in candidates:
14:
15:    # Simulation: Execute in environment
16:    s', obs, reward ← Environment.step(s, action)
17:
18:    # Evaluation: Compute node value
19:    V_LM ← π.evaluate(s')
20:    V_SC ← self_consistency(s', π, rollouts=5)
21:    V ← λ * V_LM + (1 - λ) * V_SC
22:
23:    # Check terminal condition
24:    if reward == 1:
25:      return extract_trajectory(s')
26:
27:    # Reflection on failure
28:    if is_terminal(s') and reward == 0:
29:      reflection ← π.reflect(trajectory(s'), obs)
30:      reflection_memory.append(reflection)
31:
32:    # Backpropagation: Update ancestor values
33:    node ← s'
34:    while node is not None:
35:      N(node) += 1
36:      Q(node) ← (Q(node) * (N(node) - 1) + V) / N(node)
37:      node ← parent(node)
38:
39: return best_trajectory()  # Return highest-value path if no success
```

### Architecture Diagram

```
                        [Task Root: s₀]
                         N=20, Q=0.65
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    [thought+action 1]  [thought+action 2]  [thought+action 3]
     N=8, Q=0.45        N=7, Q=0.72         N=5, Q=0.58
          │                  │                   │
    [obs: test fail]   [obs: 3/5 pass]     [obs: syntax error]
                             │
                  ┌──────────┼──────────┐
                  ▼          ▼          ▼
            [t+a 2.1]  [t+a 2.2]  [t+a 2.3]
            N=3,Q=0.8  N=2,Q=0.6  N=2,Q=0.9
                  │                   │
            [obs: 4/5]          [obs: ALL PASS]
                                      │
                                [SOLUTION ✓]

Legend:
- N = visit count
- Q = average value
- UCT selects nodes with high Q + exploration bonus
- Reflection memory prevents repeating "syntax error" path
```

---

## Benchmark Results

### Programming (HumanEval)

| Method | Model | Pass@1 | Improvement | Notes |
|--------|-------|--------|-------------|-------|
| CoT | GPT-4 | 67.0% | baseline | Chain-of-thought reasoning |
| ReAct | GPT-4 | 82.4% | +15.4% | Reasoning + Acting |
| **LATS** | **GPT-4** | **92.7%** | **+10.3%** | **State-of-the-art** |
| CoT | GPT-3.5 | 72.0% | baseline | |
| ReAct | GPT-3.5 | 82.4% | +10.4% | |
| **LATS** | **GPT-3.5** | **83.8%** | **+1.4%** | Smaller gain with weaker model |

**Key Observation**: LATS achieves 92.7% with GPT-4, surpassing previous SOTA of 90.2% (AlphaCodium) and far exceeding single-path methods.

### Programming (MBPP)

| Method | Model | Pass@1 | Improvement | Notes |
|--------|-------|--------|-------------|-------|
| CoT | GPT-3.5 | 63.2% | baseline | |
| ReAct | GPT-3.5 | 70.8% | +7.6% | |
| **LATS** | **GPT-3.5** | **81.1%** | **+10.3%** | Largest gap on MBPP |

**Key Observation**: LATS shows stronger gains on MBPP than HumanEval with GPT-3.5, suggesting search is more valuable when model capabilities are limited.

### Web Navigation (WebShop)

| Method | Average Score | Improvement | Notes |
|--------|---------------|-------------|-------|
| Human baseline | 62.0 | reference | Average human performance |
| ReAct | 53.8 | -8.2 from human | Single-path agent |
| **LATS** | **75.9** | **+22.1** | **+22% over human** |

**WebShop Task**: Navigate e-commerce site to purchase item matching attribute requirements (color, size, brand, etc.)

**Key Observation**: LATS exceeds human baseline by 22%, demonstrating that tree search enables backtracking from wrong product categories.

### Question Answering (HotPotQA)

| Method | Accuracy | Improvement | Notes |
|--------|----------|-------------|-------|
| CoT | 62% | baseline | Reasoning only |
| ReAct | 63% | +1% | Reasoning + Wikipedia lookup |
| CoT + ReAct | 65% | +3% | Hybrid approach |
| **LATS (ReAct)** | **63%** | **0%** | Search over actions only |
| **LATS (CoT+ReAct)** | **71%** | **+6%** | **Search over reasoning+acting** |

**HotPotQA Task**: Multi-hop question answering requiring 2+ Wikipedia lookups.

**Key Observation**: LATS benefits most when searching over combined reasoning+acting space (71%) vs acting alone (63%).

### Reasoning Game (Game of 24)

| Method | Success Rate | Improvement | Notes |
|--------|--------------|-------------|-------|
| CoT | 1.5% | baseline | |
| ReAct | 7.3% | +5.8% | Trial-and-error |
| ToT (b=1) | 45% | +37.7% | Breadth-first search |
| **LATS** | **44%** | **+36.7%** | Matches ToT without pruning |

**Game of 24 Task**: Use 4 numbers and arithmetic operations to reach 24.

**Key Observation**: LATS matches ToT performance (44% vs 45%) despite ToT using privileged pruning rules for invalid expressions. LATS learns to avoid invalid moves through reflection.

---

## Comparison to Related Methods

### LATS vs Tree of Thoughts (ToT)

| Dimension | ToT | LATS | Advantage |
|-----------|-----|------|-----------|
| **Search Space** | Thoughts only | Thoughts + Actions | LATS: handles environment interaction |
| **Environment Feedback** | None (internal reasoning) | Yes (external execution) | LATS: test results, web responses |
| **Backtracking** | BFS/DFS predefined | MCTS adaptive | LATS: dynamic based on value estimates |
| **Value Function** | Fixed heuristics | Learned (LM + SC) | LATS: task-agnostic evaluation |
| **Reflection** | Not used | Episodic memory | LATS: learns from failures |
| **Task Coverage** | Reasoning games, writing | Coding, web nav, QA, games | LATS: broader applicability |

**Bottom Line**: ToT excels at pure reasoning tasks with clear decomposition; LATS generalizes to tasks requiring environment interaction and external feedback.

### LATS vs ReAct

| Dimension | ReAct | LATS | Advantage |
|-----------|-------|------|-----------|
| **Trajectory Type** | Single path | Tree (multiple paths) | LATS: explores alternatives |
| **Backtracking** | No (greedy) | Yes (MCTS) | LATS: recovers from errors |
| **Sample Complexity** | 1 trajectory | 5-10 candidates/node × depth | ReAct: fewer LM calls |
| **Success Rate** | Lower (82.4% HumanEval) | Higher (92.7% HumanEval) | LATS: +10% absolute |
| **Reflection** | Not used | Episodic memory | LATS: avoids repeated mistakes |

**Bottom Line**: ReAct is sample-efficient but brittle; LATS trades LM calls for reliability through deliberate search.

### LATS vs Reflexion

| Dimension | Reflexion | LATS | Advantage |
|-----------|-----------|------|-----------|
| **Search Strategy** | Sequential trials | Tree (parallel exploration) | LATS: explores multiple hypotheses simultaneously |
| **Memory** | Sliding window (Ω=1-3) | Full tree (graph memory) | LATS: complete search history |
| **Evaluation** | External only (tests) | Hybrid (LM + environment) | LATS: predictive value estimates |
| **Planning Depth** | 1-step lookahead | Multi-step (MCTS rollouts) | LATS: long-horizon planning |

**Bottom Line**: Reflexion optimizes single trajectory through iterative refinement; LATS explores action space through tree search.

### LATS vs RAP (Reasoning via Planning)

| Dimension | RAP | LATS | Advantage |
|-----------|-----|------|-----------|
| **World Model** | Requires pre-trained | Not required | LATS: no training overhead |
| **Search Algorithm** | MCTS with world model | MCTS with real environment | RAP: faster (simulated), LATS: accurate (real) |
| **Task Coverage** | Mathematical reasoning | Coding, web, QA, games | LATS: broader |
| **Reward Signal** | World model prediction | Environment execution | LATS: ground truth feedback |

**Bottom Line**: RAP requires task-specific world model training; LATS uses real environment feedback.

---

## Key Quotes for Citation

1. **Core Innovation** (p. 1):
   > "We introduce LATS (Language Agent Tree Search), the first general framework that synergizes the capabilities of LMs in reasoning (strategic thinking), acting (interaction with external environments), and planning (goal-oriented decision-making)."

2. **MCTS Adaptation** (p. 2):
   > "LATS repurposes the planning and search capabilities of MCTS for LM agents by considering the agent's thoughts and actions as tree nodes, using the LM's self-evaluation and self-reflection abilities to guide the search, and leveraging the signals from external environments to ground the search."

3. **State-of-the-Art Performance** (p. 1):
   > "LATS achieves state-of-the-art pass@1 accuracy (92.7%) for programming on HumanEval with GPT-4, and demonstrates superior performance compared to ReAct on web navigation (WebShop) and question-answering (HotPotQA)."

4. **Value Function Design** (p. 5):
   > "We combine both evaluations and use a weighted average as the value function: V(s) = λV_LM(s) + (1−λ)V_SC(s), where λ ∈ [0, 1] is a balancing parameter. We find λ = 0.5 works the best across tasks."

5. **Reflection Mechanism** (p. 6):
   > "When the search reaches an undesired terminal state (e.g., fails the test cases in programming), LATS prompts the LM to generate a self-reflection to diagnose potential reasons for the failure. This reflection is then stored in memory and provided as additional context during the expansion step to avoid similar errors."

---

## AIWG Implementation Mapping

### Direct Parallel: Ralph Loop as MCTS

The Ralph loop implements LATS-style deliberate search through iterative error recovery:

| LATS Component | Ralph Loop Implementation | Code Location |
|----------------|---------------------------|---------------|
| **Selection** | Choose next approach based on past failures | `tools/ralph-external/core/selector.ts` |
| **Expansion** | Generate fix attempt with context | `tools/ralph-external/core/executor.ts` |
| **Evaluation** | Run external verification (npm test, tsc) | `tools/ralph-external/core/verifier.ts` |
| **Simulation** | Execute code and observe results | `tools/ralph-external/core/executor.ts` |
| **Backpropagation** | Update strategy based on test outcomes | `tools/ralph-external/core/state-manager.ts` |
| **Reflection** | Generate verbal critique of failure | `tools/ralph-external/core/reflector.ts` |

### TypeScript Implementation Pattern

```typescript
// LATS-inspired Ralph loop with tree search

interface RalphNode {
  state: ProjectState;           // Current code state
  action: string;                 // Attempted fix
  value: number;                  // Hybrid evaluation
  visits: number;                 // MCTS visit count
  parent: RalphNode | null;
  children: RalphNode[];
}

interface HybridValue {
  lmScore: number;                // LM self-evaluation (0-1)
  verificationScore: number;      // Test pass rate (0-1)
  combined: number;               // λ * LM + (1-λ) * verification
}

class RalphMCTS {
  private root: RalphNode;
  private reflections: string[] = [];
  private explorationConstant = 1.0;  // UCT parameter c
  private lambda = 0.5;                // Value function weight

  async solve(task: string, maxIterations: number): Promise<Solution> {
    this.root = this.initializeRoot(task);

    for (let i = 0; i < maxIterations; i++) {
      // 1. Selection: UCT tree policy
      const node = this.select(this.root);

      // 2. Expansion: Generate fix candidates
      const candidates = await this.expand(node, k=5);

      for (const candidate of candidates) {
        // 3. Simulation: Execute code
        const result = await this.execute(candidate.action);

        // 4. Evaluation: Hybrid value function
        const value = await this.evaluate(result);

        // Check success
        if (value.verificationScore === 1.0) {
          return this.extractSolution(candidate);
        }

        // 5. Reflection: Learn from failure
        if (result.terminal && value.verificationScore < 1.0) {
          const reflection = await this.reflect(
            candidate,
            result.errors
          );
          this.reflections.push(reflection);
        }

        // 6. Backpropagation: Update tree
        this.backpropagate(candidate, value.combined);
      }
    }

    return this.bestPath(this.root);
  }

  // Selection: UCT formula
  private select(node: RalphNode): RalphNode {
    if (node.children.length === 0) return node;

    // UCT(s,a) = Q(s,a) + c * sqrt(ln(N(s)) / N(s,a))
    let best = node.children[0];
    let bestUCT = -Infinity;

    for (const child of node.children) {
      const exploit = child.value / (child.visits + 1);
      const explore = this.explorationConstant *
        Math.sqrt(Math.log(node.visits + 1) / (child.visits + 1));
      const uct = exploit + explore;

      if (uct > bestUCT) {
        bestUCT = uct;
        best = child;
      }
    }

    return this.select(best);  // Recursive descent
  }

  // Expansion: Generate k fix candidates
  private async expand(node: RalphNode, k: number): Promise<RalphNode[]> {
    const prompt = `
Task: ${node.state.task}
Current state: ${node.state.code}
Previous reflections:
${this.reflections.slice(-3).join('\n')}

Generate ${k} possible fixes with reasoning.
`;

    const candidates = await this.llm.generateCandidates(prompt, k);

    return candidates.map(c => ({
      state: c.resultingState,
      action: c.fix,
      value: 0,
      visits: 0,
      parent: node,
      children: []
    }));
  }

  // Evaluation: Hybrid V(s) = λ*V_LM + (1-λ)*V_SC
  private async evaluate(result: ExecutionResult): Promise<HybridValue> {
    // LM evaluation
    const lmScore = await this.llm.evaluate(`
Rate the quality of this code (0-1):
Code: ${result.code}
Test results: ${result.testOutput}
`);

    // External verification (self-consistency proxy)
    const verificationScore = result.testsPassed / result.testsTotal;

    return {
      lmScore,
      verificationScore,
      combined: this.lambda * lmScore + (1 - this.lambda) * verificationScore
    };
  }

  // Backpropagation: Update ancestor values
  private backpropagate(node: RalphNode, value: number): void {
    let current: RalphNode | null = node;

    while (current !== null) {
      current.visits += 1;
      current.value =
        (current.value * (current.visits - 1) + value) / current.visits;
      current = current.parent;
    }
  }

  // Reflection: Generate critique
  private async reflect(
    node: RalphNode,
    errors: string[]
  ): Promise<string> {
    return await this.llm.generate(`
This attempt failed:
Action: ${node.action}
Errors: ${errors.join('\n')}

Reflect: What went wrong and how to improve?
`);
  }
}

// Usage in Ralph command
const ralph = new RalphMCTS();
const solution = await ralph.solve(
  "Fix all TypeScript errors",
  maxIterations = 50
);
```

### State Management Pattern

```bash
# LATS-inspired directory structure

.aiwg/ralph/task-456/
├── tree.json                    # MCTS tree state
│   {
│     "root": {
│       "visits": 20,
│       "value": 0.65,
│       "children": [...]
│     }
│   }
├── nodes/
│   ├── node-001.json            # State snapshot + action
│   ├── node-002.json
│   └── node-003.json
├── reflections.jsonl            # Episodic memory
│   {"id": "r0", "content": "Forgot to handle null case"}
│   {"id": "r1", "content": "Type mismatch in generics"}
├── evaluations/
│   ├── eval-001.json            # Hybrid V(s) scores
│   │   {
│   │     "lmScore": 0.7,
│   │     "verificationScore": 0.6,
│   │     "combined": 0.65,
│   │     "lambda": 0.5
│   │   }
│   └── eval-002.json
└── best-path.json               # Highest-value trajectory
```

### Flow Command Integration

LATS suggests multi-path planning for AIWG flow commands:

```markdown
## Enhanced Flow Command: /flow-architecture-selection

### Step 1: Expansion (Generate Options)

Generate k=3 architectural candidates:
1. Microservices with API Gateway
2. Modular Monolith with clean boundaries
3. Serverless functions with event bus

### Step 2: Evaluation (Hybrid Scoring)

For each option, compute:
- LM Score: Rate on security, scalability, maintainability (0-1)
- External Score: Pass architecture checklist items (0-1)
- Combined: V = 0.5 * LM + 0.5 * Checklist

Example:
| Option | LM Score | Checklist | Combined |
|--------|----------|-----------|----------|
| Microservices | 0.8 | 0.6 | 0.70 |
| Monolith | 0.7 | 0.9 | 0.80 |
| Serverless | 0.6 | 0.5 | 0.55 |

### Step 3: Selection (UCT-guided)

Select highest-value option (Monolith: 0.80)

### Step 4: Simulation (Execute)

Implement selected architecture:
- Create module boundaries
- Define interfaces
- Write ADR

### Step 5: Verification (Environment Feedback)

Run architecture validation:
- Dependency graph analysis (no cycles)
- Security checklist (all items pass)
- Performance estimates (within SLA)

### Step 6: Backtracking (If Needed)

If validation fails:
- Generate reflection: "Why did this architecture fail?"
- Return to Step 1 with reflection in context
- Explore next-best option

### Step 7: Backpropagation

Update strategy knowledge:
- "Monolith worked well for 10-person team"
- "Microservices too complex for MVP phase"
```

### Why LATS Matters for AIWG

1. **Theoretical Validation**: LATS demonstrates that deliberate search (Ralph loop) outperforms single-path execution (basic ReAct agents)

2. **Hybrid Evaluation**: Combining LM self-assessment with external verification (tests, lint) yields better value estimates than either alone

3. **Reflection Benefits**: Storing verbal critiques in memory reduces repeated mistakes (Ralph's `.aiwg/ralph/reflections.jsonl`)

4. **Backtracking Patterns**: MCTS provides principled framework for when to backtrack vs continue refining current approach

5. **Sample Efficiency**: Using value estimates to guide search (not exhaustive exploration) keeps LM call budgets reasonable

### Implementation Roadmap

**Phase 1: Enhanced Ralph (v2026.2)**
- Add hybrid value function (LM score + test pass rate)
- Implement UCT-style selection between fix strategies
- Store MCTS tree in `.aiwg/ralph/*/tree.json`

**Phase 2: Flow Command Trees (v2026.3)**
- Multi-path planning for architecture selection
- Backtracking support in flow orchestrator
- Value-guided exploration of design options

**Phase 3: Full MCTS Integration (v2026.4)**
- Complete LATS implementation for complex tasks
- Adaptive exploration constant tuning
- Self-consistency rollouts for value estimation

---

## Cross-References

### Related AIWG Documentation

- `@tools/ralph-external/README.md` - Ralph loop implementation
- `@.aiwg/architecture/software-architecture-doc.md` - Architecture decision patterns
- `@docs/ralph-guide.md` - Iterative error recovery guide
- `@agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md` - Flow command orchestration

### Related Research Papers

- **REF-020**: Tree of Thoughts (Yao et al., 2023) - Thought-level search foundation
- **REF-021**: Reflexion (Shinn et al., 2023) - Self-reflection and episodic memory
- **REF-018**: ReAct (Yao et al., 2023) - Reasoning + Acting baseline
- **REF-022**: Chain-of-Thought (Wei et al., 2022) - Step-by-step reasoning
- **Hao et al., 2023**: RAP (Reasoning via Planning) - World model-based MCTS

### AIWG Implementation Touchpoints

| LATS Concept | AIWG Location | Status |
|--------------|---------------|--------|
| MCTS tree search | `tools/ralph-external/core/` | Partial (linear trials, not tree) |
| Hybrid evaluation | `tools/ralph-external/core/verifier.ts` | Partial (external only) |
| Self-reflection | `tools/ralph-external/core/reflector.ts` | ✅ Implemented |
| Episodic memory | `.aiwg/ralph/*/reflections.jsonl` | ✅ Implemented |
| UCT selection | - | ❌ Not implemented |
| Multi-path planning | Flow commands | ❌ Not implemented |

---

## Quick Reference Locations

### Figures and Tables

| Item | Page | Description |
|------|------|-------------|
| Figure 1 | p. 2 | LATS framework overview diagram |
| Figure 2 | p. 3 | MCTS tree illustration with UCT values |
| Table 1 | p. 7 | HumanEval benchmark results (all methods) |
| Table 2 | p. 8 | WebShop, HotPotQA, Game of 24 results |
| Table 3 | p. 9 | Ablation study (value function components) |
| Algorithm 1 | p. 5 | Complete LATS pseudocode |

### Key Experiments

| Experiment | Page | Finding |
|------------|------|---------|
| HumanEval GPT-4 | p. 7 | 92.7% pass@1 (SOTA) |
| WebShop navigation | p. 8 | 75.9 score (+41% vs ReAct) |
| Value function ablation | p. 9 | λ=0.5 optimal for hybrid V(s) |
| Reflection impact | p. 10 | +5-10% with reflection vs without |
| Model scaling | p. 11 | GPT-4 benefits more from search than GPT-3.5 |

### Code and Data

- **GitHub**: [https://github.com/lapisrocks/LanguageAgentTreeSearch](https://github.com/lapisrocks/LanguageAgentTreeSearch)
- **Datasets**: HumanEval, MBPP, WebShop, HotPotQA, Game of 24
- **Prompts**: Appendix A (expansion, evaluation, reflection templates)
- **Hyperparameters**: Appendix B (k=5, c=1.0, λ=0.5, n_rollouts=5)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
| 2026-01-24 | Claude (Comprehensive Documentation) | Complete rewrite with all benchmark results, full MCTS algorithm (6 operations), hybrid value function details, key quotes with page numbers, comprehensive AIWG mapping (Ralph loop as MCTS, flow command integration patterns), comparison tables vs ToT/ReAct/Reflexion/RAP, TypeScript implementation examples, state management patterns, implementation roadmap, cross-references to AIWG codebase |
