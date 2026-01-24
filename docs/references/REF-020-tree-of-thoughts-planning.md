# REF-020: Tree of Thoughts - Deliberate Problem Solving with Large Language Models

## Citation

Yao, S., Yu, D., Zhao, J., Shafran, I., Griffiths, T. L., Cao, Y., & Narasimhan, K. (2023). Tree of Thoughts: Deliberate Problem Solving with Large Language Models. *Advances in Neural Information Processing Systems 36 (NeurIPS 2023)*.

**arXiv**: [https://arxiv.org/abs/2305.10601](https://arxiv.org/abs/2305.10601)

**GitHub**: [https://github.com/princeton-nlp/tree-of-thought-llm](https://github.com/princeton-nlp/tree-of-thought-llm)

## Document Profile

| Attribute | Value |
|-----------|-------|
| **Publication** | NeurIPS 2023 |
| **Authors** | Yao et al. (Princeton University, Google DeepMind) |
| **Research Type** | Novel prompting framework with search algorithms |
| **Primary Focus** | Deliberate problem-solving through tree search over thoughts |
| **Base Model** | GPT-4 |
| **Key Innovation** | Tree-structured exploration with LM-based heuristics |

## Executive Summary

Tree of Thoughts (ToT) revolutionizes language model reasoning by introducing deliberate decision-making through search algorithms. Unlike linear Chain-of-Thought prompting, ToT explores multiple reasoning paths simultaneously, using the LM to both generate candidate thoughts and evaluate their promise. By combining this with classical search algorithms (BFS/DFS), ToT enables LMs to look ahead, backtrack, and make strategic decisions—achieving dramatic improvements on tasks requiring planning.

**Bottom Line**: ToT transforms LMs from reflexive text generators into deliberate problem-solvers by structuring reasoning as tree search with self-evaluation.

## Key Findings

### Performance Breakthroughs

1. **Game of 24**: 4% → 74% success rate (GPT-4 CoT → ToT)
   - 18.5x improvement over baseline
   - Demonstrates value of exploration and backtracking

2. **Creative Writing**: 6.19 → 7.56 coherence score (GPT-4 IO → ToT)
   - Human evaluation: ToT preferred in 41/100 cases vs 21/100 for CoT
   - Improved passage coherency through planning

3. **Mini Crosswords**: 15.6% → 60% word-level success (GPT-4 CoT → ToT)
   - 3.8x improvement
   - 20% game-level success (solving all 10 words correctly)

### Core Insights

- **Deliberate vs Reflexive**: Tree search enables "System 2" deliberation vs "System 1" autoregressive generation
- **Self-Evaluation**: LMs can assess thought quality without external training
- **Search Matters**: BFS/DFS with lookahead dramatically outperforms sampling
- **Generality**: Framework adapts to diverse task types and thought granularities

## Method/Architecture

### Four Key Design Decisions

#### 1. Thought Decomposition

Thoughts are intermediate reasoning steps between input and output:

| Task | Thought Granularity | Example |
|------|---------------------|---------|
| **Game of 24** | Single equation | "13 - 9 = 4 (left: 4, 4, 10)" |
| **Creative Writing** | Paragraph plan | "Introduce a book connecting all sentences..." |
| **Crosswords** | Single word fill | "h1: shown, v5: naled" |

**Design Principle**: Thoughts should be "small" enough for diverse sampling, yet "big" enough for meaningful evaluation.

#### 2. Thought Generation G(pθ, s, k)

Two strategies depending on thought space:

**a) Sampling (for rich thought spaces)**:
```
z^(j) ∼ p_θ^CoT(z_{i+1}|s) for j = 1...k
```
- Used when thoughts are paragraphs or complex plans
- i.i.d. samples ensure diversity
- Example: Creative Writing (5 different paragraph plans)

**b) Sequential Proposal (for constrained spaces)**:
```
[z^(1), ..., z^(k)] ∼ p_θ^propose(z_{i+1}^{1...k}|s)
```
- Used when thoughts are words or equations
- Single context avoids duplication
- Example: Game of 24 (propose multiple equations at once)

#### 3. State Evaluation V(pθ, S)

**Independent Evaluation**:
```
V(pθ, S)(s) ∼ p_θ^value(v|s) for all s ∈ S
```
- LM reasons about state and assigns scalar value (1-10) or classification (sure/likely/impossible)
- Uses lookahead simulation: "Can 5, 5, 14 reach 24? Yes, via 5+5+14=24"
- Plus commonsense: "1, 2, 3 too small to reach 24"

**Voting Across States**:
```
V(pθ, S)(s) = 1[s = s*] where s* ∼ p_θ^vote(s*|S)
```
- Comparative evaluation when absolute valuation is difficult
- Multi-choice QA over states
- Used for Creative Writing coherence

#### 4. Search Algorithm

**Breadth-First Search (BFS)** - Algorithm 1 in paper:
- Maintains b best states per step
- Used when depth is limited (T ≤ 3)
- Game of 24: b=5, T=3
- Creative Writing: b=1 (with voting), T=2

**Depth-First Search (DFS)** - Algorithm 2 in paper:
- Explores most promising state until terminal or impossible
- Backtracks when V(pθ, {s})(s) ≤ v_th
- Used for deeper trees
- Mini Crosswords: up to 10 steps

### Complete ToT Framework

```
State s = [x, z_1...i] where:
  x = input
  z_1...i = thought sequence so far

For each step:
  1. Generate k candidate thoughts from current state
  2. Evaluate each candidate with V(pθ, ·)
  3. Select best b candidates (BFS) or best 1 (DFS)
  4. Expand selected states
  5. Backtrack if dead end (DFS only)
  6. Repeat until solution or budget exhausted
```

## Benchmark Results

### Game of 24 (100 hard games)

| Method | Success Rate | Notes |
|--------|--------------|-------|
| IO prompt | 7.3% | Direct answer generation |
| CoT prompt | 4.0% | Step-by-step reasoning |
| CoT-SC (k=100) | 9.0% | Self-consistency voting |
| **ToT (b=1)** | **45%** | Single-path search |
| **ToT (b=5)** | **74%** | Best configuration |
| IO (best of 100) | 33% | Oracle baseline |
| CoT (best of 100) | 49% | Oracle baseline |

**Key Insight**: ToT with b=5 outperforms even oracle best-of-100 CoT sampling, demonstrating superior exploration strategy.

**Error Analysis**: 60% of CoT samples fail at first step (first 3 words), highlighting left-to-right generation weakness.

### Creative Writing (100 tasks)

| Method | GPT-4 Score (1-10) | Human Preference |
|--------|-------------------|------------------|
| IO | 6.19 | - |
| CoT | 6.93 | 21% preferred over ToT |
| **ToT** | **7.56** | **41% preferred over CoT** |
| IO + refine (k≤5) | 7.67 | - |
| ToT + refine | 7.91 | - |

**Human Evaluation**: 38% rated as "similarly coherent", ToT wins 2:1 when there's a preference.

### Mini Crosswords (20 games, 5×5 grid)

| Method | Letter Accuracy | Word Accuracy | Game Success |
|--------|----------------|---------------|--------------|
| IO | 38.7% | 14.0% | 0% |
| CoT | 40.6% | 15.6% | 1/20 (5%) |
| **ToT** | **78.0%** | **60.0%** | **4/20 (20%)** |
| ToT + best state | 82.4% | 67.5% | 7/20 (35%) |
| ToT - prune | 65.4% | 41.5% | 1/20 (5%) |
| ToT - backtrack | 54.6% | 20.0% | 1/20 (5%) |

**Ablations**: Both pruning and backtracking are critical—removing either degrades performance significantly.

### Scaling Analysis (Game of 24)

| Nodes Visited | IO (best of k) | CoT (best of k) | ToT |
|---------------|----------------|-----------------|-----|
| 25 | ~15% | ~25% | ~60% |
| 50 | ~20% | ~35% | ~70% |
| 100 | 33% | 49% | ~74% |

**Efficiency**: ToT reaches 70% success with 50 nodes, while CoT needs >100 nodes to reach 49%.

## Comparison to Related Methods

### ToT vs Chain-of-Thought (CoT)

| Dimension | CoT | ToT |
|-----------|-----|-----|
| **Reasoning Path** | Single linear chain | Multiple explored paths |
| **Error Recovery** | None—compounds errors | Backtracking to earlier states |
| **Lookahead** | No | Yes—evaluates before committing |
| **Search Strategy** | Greedy left-to-right | BFS/DFS with heuristics |
| **Best For** | Simple reasoning | Planning, exploration tasks |

### ToT vs Self-Consistency (CoT-SC)

| Dimension | CoT-SC | ToT |
|-----------|--------|-----|
| **Exploration** | Independent samples | Structured tree search |
| **Aggregation** | Majority vote on outputs | Evaluation during generation |
| **Efficiency** | Samples k complete paths | Explores b branches per step |
| **Applicability** | Multi-choice or limited output | Any task with evaluable states |

### ToT vs RAP (Reasoning via Planning)

| Dimension | RAP | ToT |
|-----------|-----|-----|
| **Search Algorithm** | MCTS with rollouts | BFS/DFS with evaluation |
| **World Model** | LM simulates future | No simulation—actual actions |
| **Application** | Closed reasoning tasks | Reasoning + decision-making |
| **Evaluation** | LM-based reward | LM-based heuristic |

**Key Distinction**: ToT focuses on reasoning tasks without requiring a world model, while RAP uses the LM to simulate outcomes.

## Key Quotes for Citation

> "ToT allows LMs to perform deliberate decision making by considering multiple different reasoning paths and self-evaluating choices to decide the next course of action, as well as looking ahead or backtracking when necessary to make global choices." (p. 1)

> "While GPT-4 with chain-of-thought prompting only solved 4% of tasks, our method achieved a success rate of 74%." (p. 1)

> "A genuine problem-solving process involves the repeated use of available information to initiate exploration, which discloses, in turn, more information until a way to attain the solution is finally discovered." — Newell et al. [21] (p. 3, epigraph)

> "The simple associative token-level choices of LMs are also reminiscent of 'System 1', and thus might benefit from augmentation by a more deliberate 'System 2' planning process." (p. 1)

> "This high-level semantic unit allows the LM to self-evaluate the progress different intermediate thoughts make towards solving the problem through a deliberate reasoning process that is also instantiated in language." (p. 2)

## AIWG Implementation Mapping

### Direct Parallel: Phase Gates & Planning

ToT's search-based deliberation maps directly to AIWG's phase gate system:

| ToT Element | AIWG Implementation |
|-------------|---------------------|
| **Thought branches** | Alternative approaches in planning documents |
| **Self-evaluation** | Gate check validation criteria |
| **Backtracking** | Iteration on failed gate checks |
| **Search algorithm** | Flow command orchestration |
| **State** | Project artifacts at each phase |

### Flow Command Integration

AIWG flow commands implement ToT-style deliberation:

```markdown
## /flow-inception-to-elaboration

### Step 1: Generate Architecture Options (ToT Generation)
- Option A: Microservices with API gateway
- Option B: Monolithic with domain modules
- Option C: Serverless event-driven

### Step 2: Evaluate Each Option (ToT Evaluation)
Score each on: security, scalability, maintainability, cost
- Option A: 8.5/10 (high scalability, complex ops)
- Option B: 7.0/10 (simple ops, scaling limits)
- Option C: 8.0/10 (auto-scale, vendor lock-in)

### Step 3: Select Best Path (ToT Selection)
Based on evaluation scores: Select Option A

### Step 4: Proceed or Backtrack (ToT Backtracking)
If gate fails, return to Step 1 with new constraints
```

### Ralph Loop Connection

ToT's deliberate search complements Ralph's iterative execution:

- **ToT**: Plans multiple approaches before execution
- **Ralph**: Executes one approach with iteration on failure
- **Combined**: Use ToT to generate recovery strategies when Ralph detects failures

### Why ToT Matters for AIWG

1. **Planning Quality**: Deliberation over alternatives improves architectural decisions
2. **Error Recovery**: Backtracking enables course correction at phase gates
3. **Gate Design**: Self-evaluation patterns inform validation criteria
4. **Search Strategies**: BFS/DFS provide workflow optimization patterns
5. **Documentation**: Thought trees map to decision documentation in ADRs

### Implementation Considerations

**When to Use ToT Patterns in AIWG**:
- Architecture selection (Elaboration phase)
- Risk mitigation planning (all phases)
- Test strategy design (Construction phase)
- Deployment approach selection (Transition phase)

**How to Implement**:
1. Generate k alternative approaches for each decision point
2. Evaluate each using project-specific criteria
3. Select most promising b options
4. Document decision rationale in ADRs
5. Maintain ability to backtrack if validation fails

## Cross-References

### Within AIWG Reference Library

- **@REF-021**: Reflexion (self-reflection for learning)
- **@REF-024**: LATS (combines ToT search with acting)
- **@REF-018**: ReAct (reasoning + acting baseline)
- **@REF-016**: Chain-of-Thought (linear reasoning baseline)

### AIWG Documentation

- **@docs/ralph-guide.md**: Iterative execution with recovery
- **@.aiwg/architecture/**: Decision documentation in ADRs
- **@.claude/commands/flow-*.md**: Phase transition workflows
- **@docs/sdlc/templates/**: Phase gate templates

### Related Research

- Chain-of-Thought: Wei et al. (2022) - Linear reasoning
- Self-Consistency: Wang et al. (2022) - Voting over chains
- LATS: Zhou et al. (2024) - Tree search + acting
- RAP: Hao et al. (2023) - Reasoning via planning
- Least-to-Most: Zhou et al. (2022) - Decomposition

## Quick Reference Locations

### Code Examples
- **GitHub Repository**: [princeton-nlp/tree-of-thought-llm](https://github.com/princeton-nlp/tree-of-thought-llm)
- **Prompts**: `tree-of-thought-llm/src/tot/prompts/`
- **Algorithms**: See paper Algorithms 1 (BFS) and 2 (DFS)

### Key Figures and Tables
- **Figure 1** (p. 2): Schematic comparison of IO, CoT, CoT-SC, ToT
- **Figure 2** (p. 5): Game of 24 thought generation and evaluation examples
- **Figure 3** (p. 6): Performance scaling and error analysis
- **Table 1** (p. 5): Task overview with thought examples
- **Table 2** (p. 6): Game of 24 complete results

### Experimental Details
- **Tasks**: Game of 24, Creative Writing, Mini Crosswords
- **Model**: GPT-4 (Chat Completion mode, temperature=0.7)
- **Baselines**: IO, CoT, CoT-SC, iterative refinement
- **Code**: All prompts and trajectories available in GitHub repo

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
| 2026-01-24 | Technical Research | Comprehensive documentation with full benchmark results, algorithm details, and AIWG mapping |
