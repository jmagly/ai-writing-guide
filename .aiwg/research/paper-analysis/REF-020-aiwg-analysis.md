# REF-020 AIWG Analysis: Tree of Thoughts - Deliberate Problem Solving

**Source**: @/tmp/research-papers/documentation/references/REF-020-tree-of-thoughts-planning.md

**Paper**: Yao, S., Yu, D., Zhao, J., Shafran, I., Griffiths, T. L., Cao, Y., & Narasimhan, K. (2023). Tree of Thoughts: Deliberate Problem Solving with Large Language Models. *NeurIPS 2023*.

**AIWG Relevance**: CRITICAL - Maps directly to AIWG's phase gate system and planning workflows

---

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

---

## Performance Breakthroughs

### Game of 24
4% → 74% success rate (GPT-4 CoT → ToT)
- 18.5x improvement over baseline
- Demonstrates value of exploration and backtracking

### Creative Writing
6.19 → 7.56 coherence score (GPT-4 IO → ToT)
- Human evaluation: ToT preferred in 41/100 cases vs 21/100 for CoT
- Improved passage coherency through planning

### Mini Crosswords
15.6% → 60% word-level success (GPT-4 CoT → ToT)
- 3.8x improvement
- 20% game-level success (solving all 10 words correctly)

---

## Four Key Design Decisions

### 1. Thought Decomposition

Thoughts are intermediate reasoning steps between input and output:

| Task | Thought Granularity | Example |
|------|---------------------|---------|
| **Game of 24** | Single equation | "13 - 9 = 4 (left: 4, 4, 10)" |
| **Creative Writing** | Paragraph plan | "Introduce a book connecting all sentences..." |
| **Crosswords** | Single word fill | "h1: shown, v5: naled" |

**Design Principle**: Thoughts should be "small" enough for diverse sampling, yet "big" enough for meaningful evaluation.

### 2. Thought Generation G(pθ, s, k)

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

### 3. State Evaluation V(pθ, S)

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

### 4. Search Algorithm

**Breadth-First Search (BFS)**:
- Maintains b best states per step
- Used when depth is limited (T ≤ 3)
- Game of 24: b=5, T=3
- Creative Writing: b=1 (with voting), T=2

**Depth-First Search (DFS)**:
- Explores most promising state until terminal or impossible
- Backtracks when V(pθ, {s})(s) ≤ v_th
- Used for deeper trees
- Mini Crosswords: up to 10 steps

---

## Flow Command Integration

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

---

## Ralph Loop Connection

ToT's deliberate search complements Ralph's iterative execution:

- **ToT**: Plans multiple approaches before execution
- **Ralph**: Executes one approach with iteration on failure
- **Combined**: Use ToT to generate recovery strategies when Ralph detects failures

---

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

---

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

---

## Why ToT Matters for AIWG

### 1. Planning Quality
Deliberation over alternatives improves architectural decisions
- Generate multiple architecture options
- Evaluate each against project constraints
- Select best approach with documented rationale

### 2. Error Recovery
Backtracking enables course correction at phase gates
- If gate validation fails, return to earlier state
- Adjust constraints based on failure analysis
- Re-evaluate with new information

### 3. Gate Design
Self-evaluation patterns inform validation criteria
- Define measurable evaluation criteria
- Score artifacts against requirements
- Set thresholds for gate passage

### 4. Search Strategies
BFS/DFS provide workflow optimization patterns
- BFS for shallow exploration (Inception → Elaboration)
- DFS for deep planning (detailed implementation paths)

### 5. Documentation
Thought trees map to decision documentation in ADRs
- Document explored alternatives
- Record evaluation rationale
- Trace decision path

---

## Implementation Considerations

### When to Use ToT Patterns in AIWG

**High-Value Decision Points**:
- Architecture selection (Elaboration phase)
- Risk mitigation planning (all phases)
- Test strategy design (Construction phase)
- Deployment approach selection (Transition phase)

**Complex Planning Tasks**:
- Multi-step workflows with dependencies
- High uncertainty requiring exploration
- Critical decisions with significant consequences

### How to Implement

1. **Generate k alternative approaches** for each decision point
   - Use diverse generation strategies
   - Consider different architectural styles
   - Explore trade-off space

2. **Evaluate each using project-specific criteria**
   - Security requirements
   - Performance needs
   - Maintainability goals
   - Cost constraints

3. **Select most promising b options**
   - BFS: Keep top b candidates
   - DFS: Follow single best path with backtracking
   - Hybrid: BFS early, DFS for refinement

4. **Document decision rationale in ADRs**
   - Alternatives considered
   - Evaluation scores
   - Selection reasoning
   - Trade-offs accepted

5. **Maintain ability to backtrack if validation fails**
   - Store intermediate states
   - Define backtrack triggers
   - Plan recovery strategies

---

## AIWG Flow Command Example

### Architecture Selection with ToT Pattern

```markdown
# /flow-architecture-selection

## Input: Project Requirements
- NFRs: High availability, low latency, cost efficiency
- Constraints: Team expertise in Node.js, AWS infrastructure
- Scale: 10K concurrent users, 1M requests/day

## Step 1: Generate Architecture Options (k=5)

### Option A: Microservices + API Gateway
- Services: Auth, User, Product, Order, Payment
- Communication: REST + Event Bus (SQS)
- Deployment: ECS Fargate
**Evaluation Criteria**:
- Scalability: 9/10 (independent scaling)
- Complexity: 5/10 (service coordination)
- Cost: 6/10 (multiple services)
- Team Fit: 7/10 (requires distributed system expertise)

### Option B: Modular Monolith
- Modules: Auth, User, Product, Order, Payment
- Communication: In-process function calls
- Deployment: EC2 + Auto Scaling
**Evaluation Criteria**:
- Scalability: 6/10 (vertical scaling limits)
- Complexity: 8/10 (simpler deployment)
- Cost: 8/10 (fewer resources)
- Team Fit: 9/10 (familiar pattern)

### Option C: Serverless (Lambda + API Gateway)
- Functions: Auth, User, Product, Order, Payment
- Communication: API Gateway + EventBridge
- Deployment: AWS Lambda
**Evaluation Criteria**:
- Scalability: 10/10 (infinite horizontal scaling)
- Complexity: 6/10 (cold start management)
- Cost: 7/10 (pay-per-use, good for variable load)
- Team Fit: 6/10 (learning curve)

### Option D: Hybrid (Monolith + Critical Microservices)
- Monolith: User, Product
- Microservices: Auth, Payment (high security)
- Deployment: EC2 (monolith) + ECS (microservices)
**Evaluation Criteria**:
- Scalability: 7/10 (balanced approach)
- Complexity: 7/10 (moderate)
- Cost: 7/10 (moderate)
- Team Fit: 8/10 (incremental adoption)

### Option E: Event-Driven Serverless
- Event Sources: API Gateway, S3, DynamoDB Streams
- Processing: Lambda functions
- Storage: DynamoDB
**Evaluation Criteria**:
- Scalability: 9/10 (event-driven scaling)
- Complexity: 5/10 (event choreography)
- Cost: 8/10 (efficient for event-driven workloads)
- Team Fit: 5/10 (paradigm shift)

## Step 2: Evaluate and Prune (b=3)

**Overall Scores** (weighted: scalability 30%, complexity 20%, cost 25%, team fit 25%):
- Option A: 6.7/10
- **Option B: 7.7/10** ✓ Keep
- Option C: 7.1/10 ✓ Keep
- **Option D: 7.3/10** ✓ Keep
- Option E: 6.5/10

**Selected for deeper analysis**: B, C, D

## Step 3: Detailed Evaluation (Lookahead)

### Option B: Modular Monolith - Detailed Analysis
**Strengths**:
- Team can start immediately
- Simple deployment pipeline
- Low operational overhead
**Risks**:
- Scaling limits at ~50K concurrent users
- Module boundaries must be enforced
**Mitigation**:
- Plan migration path to microservices if needed
- Use architectural fitness functions

**Projected Success**: 80% (good fit for current scale)

### Option C: Serverless - Detailed Analysis
**Strengths**:
- Infinite scaling
- No infrastructure management
- Cost-efficient for variable load
**Risks**:
- Cold start latency (200-500ms)
- Team learning curve (2-3 months)
**Mitigation**:
- Use provisioned concurrency for critical functions
- Training investment

**Projected Success**: 70% (risk from cold starts and team learning)

### Option D: Hybrid - Detailed Analysis
**Strengths**:
- Balanced approach
- Isolates high-security components
- Incremental complexity
**Risks**:
- Operational overhead of mixed deployment
- Inter-service communication latency
**Mitigation**:
- Strong monitoring from day one
- API contract testing

**Projected Success**: 75% (good balance, moderate risks)

## Step 4: Selection Decision

**Selected**: **Option B - Modular Monolith**

**Rationale**:
- Highest overall score (7.7/10)
- Best team fit (9/10) enables fast delivery
- Lowest complexity (8/10) reduces risk
- Meets current scale requirements (10K users)
- Clear migration path if scale increases

**Trade-offs Accepted**:
- Lower ultimate scalability than serverless
- Requires discipline to maintain module boundaries

## Step 5: Gate Check (ToT Evaluation)

**Validation Criteria**:
- [ ] Architecture supports all NFRs? **YES** (with migration plan for scale)
- [ ] Team has required expertise? **YES** (strong Node.js skills)
- [ ] Cost within budget? **YES** (estimated $500/month)
- [ ] Deployment complexity manageable? **YES** (single deployment unit)

**Gate Status**: **PASS** ✓

## Step 6: Document Decision (ADR)

Create ADR-003-modular-monolith-architecture.md documenting:
- Alternatives considered (A, B, C, D, E)
- Evaluation criteria and scores
- Selected option and rationale
- Trade-offs and risks
- Migration path if scaling needs exceed monolith capacity

## Backtracking Trigger

**If any gate check fails**:
→ Return to Step 2, adjust evaluation criteria
→ Re-score options with new constraints
→ Select next-best alternative

**If implementation reveals blocking issue**:
→ Return to Step 3 with failure analysis
→ Re-evaluate remaining options (C, D)
→ Update ADR with pivot reasoning
```

---

## Key Quotes

> "ToT allows LMs to perform deliberate decision making by considering multiple different reasoning paths and self-evaluating choices to decide the next course of action, as well as looking ahead or backtracking when necessary to make global choices." (p. 1)

> "While GPT-4 with chain-of-thought prompting only solved 4% of tasks, our method achieved a success rate of 74%." (p. 1)

> "The simple associative token-level choices of LMs are also reminiscent of 'System 1', and thus might benefit from augmentation by a more deliberate 'System 2' planning process." (p. 1)

> "This high-level semantic unit allows the LM to self-evaluate the progress different intermediate thoughts make towards solving the problem through a deliberate reasoning process that is also instantiated in language." (p. 2)

---

## Cross-References to Other AIWG Papers

| Paper | Relationship |
|-------|-------------|
| **REF-021** | Reflexion (self-reflection for learning) |
| **REF-024** | LATS (combines ToT search with acting) |
| **REF-018** | ReAct (reasoning + acting baseline) |
| **REF-016** | Chain-of-Thought (linear reasoning baseline) |
| **REF-017** | Self-Consistency (voting over chains) |

---

## Complete ToT Framework

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

---

## Document Status

**Created**: 2026-01-24
**Source Paper**: REF-020
**AIWG Priority**: CRITICAL
**Implementation Status**: Applicable to phase gate workflows and architecture selection
**Key Pattern**: Tree search with self-evaluation for deliberate planning
**Primary Use Cases**: Architecture selection, risk planning, test strategy, deployment approach
