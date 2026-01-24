# REF-024: LATS - AIWG Tree Search and Planning Analysis

**Source**: `/tmp/research-papers/docs/references/REF-024-lats-language-agent-tree-search.md`

**Citation**: Zhou, A., et al. (2024). Language Agent Tree Search Unifies Reasoning, Acting, and Planning in Language Models. *ICML 2024*.

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

---

## Key Performance Results

### Programming (HumanEval)

| Method | Model | Pass@1 | Improvement | Notes |
|--------|-------|--------|-------------|-------|
| CoT | GPT-4 | 67.0% | baseline | Chain-of-thought reasoning |
| ReAct | GPT-4 | 82.4% | +15.4% | Reasoning + Acting |
| **LATS** | **GPT-4** | **92.7%** | **+10.3%** | **State-of-the-art** |
| CoT | GPT-3.5 | 72.0% | baseline | |
| ReAct | GPT-3.5 | 82.4% | +10.4% | |
| **LATS** | **GPT-3.5** | **83.8%** | **+1.4%** | Smaller gain with weaker model |

### Web Navigation (WebShop)

| Method | Average Score | Improvement | Notes |
|--------|---------------|-------------|-------|
| Human baseline | 62.0 | reference | Average human performance |
| ReAct | 53.8 | -8.2 from human | Single-path agent |
| **LATS** | **75.9** | **+22.1** | **+22% over human** |

### Question Answering (HotPotQA)

| Method | Accuracy | Improvement | Notes |
|--------|----------|-------------|-------|
| CoT | 62% | baseline | Reasoning only |
| ReAct | 63% | +1% | Reasoning + Wikipedia lookup |
| CoT + ReAct | 65% | +3% | Hybrid approach |
| **LATS (ReAct)** | **63%** | **0%** | Search over actions only |
| **LATS (CoT+ReAct)** | **71%** | **+6%** | **Search over reasoning+acting** |

---

## Implementation Roadmap

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

## AIWG References

**Related AIWG Documentation**:
- `@tools/ralph-external/README.md` - Ralph loop implementation
- `@.aiwg/architecture/software-architecture-doc.md` - Architecture decision patterns
- `@docs/ralph-guide.md` - Iterative error recovery guide
- `@agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md` - Flow command orchestration

**Related Research Papers**:
- **REF-020**: Tree of Thoughts (thought-level search foundation)
- **REF-021**: Reflexion (self-reflection and episodic memory)
- **REF-018**: ReAct (reasoning + acting baseline)
- **REF-022**: Chain-of-Thought (step-by-step reasoning)

**AIWG Implementation Touchpoints**:

| LATS Concept | AIWG Location | Status |
|--------------|---------------|--------|
| MCTS tree search | `tools/ralph-external/core/` | Partial (linear trials, not tree) |
| Hybrid evaluation | `tools/ralph-external/core/verifier.ts` | Partial (external only) |
| Self-reflection | `tools/ralph-external/core/reflector.ts` | ✅ Implemented |
| Episodic memory | `.aiwg/ralph/*/reflections.jsonl` | ✅ Implemented |
| UCT selection | - | ❌ Not implemented |
| Multi-path planning | Flow commands | ❌ Not implemented |

---

**Document Created**: 2026-01-24
**Analysis Type**: AIWG Tree Search and Planning Mapping
**Source Paper**: ICML 2024
**State-of-the-Art Result**: 92.7% HumanEval pass@1 with GPT-4
