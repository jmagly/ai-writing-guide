# RLM — Recursive Language Models Addon

**Version**: 1.0.0
**Status**: Production Ready
**Research Foundation**: REF-089 (Zhang et al., 2026)

## Overview

The Recursive Language Models (RLM) addon enables AIWG agents to process arbitrarily large codebases, documentation corpora, and multi-file operations through recursive sub-agent delegation and programmatic environment interaction. Instead of loading entire contexts into the conversation window, RLM treats context as an external environment accessed selectively through code.

**Key insight from REF-089**: Long prompts should not be fed into the neural network directly but should instead be treated as part of the environment that the LLM is tasked to symbolically and recursively interact with. This approach is lossless, cost-efficient, and scales to 10M+ tokens through recursive composition.

**AIWG alignment**: Claude Code already operates this way through Read, Grep, and Glob tools. RLM formalizes and extends these patterns with recursive decomposition, parallel fan-out processing, and explicit task tree management.

Research demonstrates up to 3x cost reduction compared to summarization approaches while maintaining stronger performance, because the agent can selectively access only relevant portions of context.

## Quick Start

```bash
# Deploy RLM addon to current provider
aiwg use rlm

# Spawn focused sub-agent for specific context
/rlm-query src/auth/login.ts "identify security issues"

# Parallel fan-out processing across multiple files
/rlm-batch "src/**/*.ts" "extract all exported function names"

# Check execution status and cost
/rlm-status --cost
```

## Components

| Component | Type | Description |
|-----------|------|-------------|
| **rlm-agent** | Agent | Recursive decomposition specialist orchestrating environment interaction |
| **rlm-query** | Command | Sub-agent spawner (equivalent to RLM's `llm_query()`) for focused context processing |
| **rlm-batch** | Command | Parallel fan-out processing for batch operations across multiple files |
| **rlm-status** | Command | Real-time status dashboard showing task tree, progress, and cost |
| **rlm-mode** | Skill | Natural language trigger detecting large-scale operations requiring decomposition |
| **rlm-context-management** | Rule | Enforcement rules for symbolic handles, programmatic access, and recursive delegation |

## When to Use RLM

Use RLM for tasks that meet any of these criteria:

**1. Context Window Constraints**
- Task involves files or data exceeding available context window
- Need to analyze entire codebase larger than model capacity
- Working with multi-file operations spanning hundreds of files

**2. Information Density**
- Task requires selective access to specific details throughout large corpus
- Cannot afford lossy summarization (need full information preserved)
- Need to maintain complete detail while processing large volumes

**3. Batch Processing**
- Same operation applied to many files independently
- Parallel processing would improve speed and cost
- Results need to be aggregated from distributed sub-tasks

**4. Recursive Structure**
- Problem naturally decomposes into independent sub-problems
- Sub-problems can be solved in parallel or sequentially
- Final result synthesized from sub-results

## Architecture

### Mapping to AIWG

RLM's three-component architecture maps cleanly to AIWG's existing capabilities:

```
RLM Component          → AIWG Equivalent
─────────────────────────────────────────────
REPL (code execution)  → Read, Grep, Glob, Bash tools
llm_query()            → Task tool (sub-agent spawning)
Final env variable     → Task completion criteria
```

### Execution Flow

```
┌────────────────────────────────────────────────────────┐
│                  Root Agent (RLM)                      │
│  "Analyze authentication security across codebase"    │
└─────────────┬──────────────────────────────────────────┘
              │
              │ Decompose
              ▼
    ┌─────────────────────────┐
    │ Symbolic Environment    │
    │ src/auth/**/*.ts        │
    └─────────────────────────┘
              │
              │ Programmatic Query
              ▼
    ┌─────────────────────────┐
    │ Grep: "password.*hash"  │
    │ → 12 relevant files     │
    └─────────────────────────┘
              │
              │ Spawn Sub-Agents
              ▼
    ┌──────────────┬──────────────┬──────────────┐
    │  Sub-Agent 1 │  Sub-Agent 2 │  Sub-Agent 3 │
    │  login.ts    │  register.ts │  reset.ts    │
    └──────────────┴──────────────┴──────────────┘
              │
              │ Aggregate Results
              ▼
    ┌─────────────────────────────────────────────┐
    │ Security Report:                            │
    │ - Password hashing: bcrypt (GOOD)           │
    │ - Token generation: crypto.randomBytes (OK) │
    │ - Reset flow: Missing rate limiting (BAD)   │
    └─────────────────────────────────────────────┘
```

**Key principles**:
1. Root agent never loads full file contents
2. Symbolic handles (file paths) used for references
3. Programmatic filtering (Grep/Glob) before reading
4. Independent sub-agents process chunks in parallel
5. Results aggregated incrementally through intermediate artifacts

## Configuration

Default settings from `manifest.json`:

```json
{
  "maxDepth": 3,
  "maxSubCalls": 20,
  "defaultSubModel": "sonnet",
  "budgetTokens": 500000,
  "parallelSubCalls": true,
  "persistState": true
}
```

### Override Configuration

**Project-level** (`aiwg.yml`):
```yaml
addons:
  rlm:
    maxDepth: 5
    maxSubCalls: 50
    budgetTokens: 1000000
```

**Command-level** (inline):
```bash
/rlm-query file.ts "analyze" --depth 2
/rlm-batch "src/**/*.ts" "check" --max-parallel 5
```

### Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxDepth` | 3 | Maximum recursion depth for sub-agent chains |
| `maxSubCalls` | 20 | Maximum number of sub-agents per task |
| `defaultSubModel` | sonnet | Model for sub-agents (root agent always uses opus) |
| `budgetTokens` | 500000 | Maximum token budget across entire task tree |
| `parallelSubCalls` | true | Enable parallel execution of independent sub-agents |
| `persistState` | true | Save task tree state for recovery and analysis |

## Research Foundation

**REF-089: Recursive Language Models (Zhang et al., 2026)**

Key findings:
- **10M+ token processing**: Scales beyond any fixed context window through recursion
- **3x cost reduction**: Selective access cheaper than loading full context
- **Superior performance**: Maintains details lost to summarization
- **28.3% improvement**: Additional gain from training on RLM trajectories

**Core design choices**:
1. **Treat context as environment**: Long prompts are not model input but external data
2. **Programmatic access**: Query context via code rather than reading sequentially
3. **Recursive composition**: Decompose problems into sub-problems solved by sub-agents
4. **Selective reading**: Access only relevant portions, not entire corpus

**Research quote**:
> "Compared to the summarization agent which ingests the entire input context, RLMs are up to 3× cheaper while maintaining stronger performance across all tasks because the RLM is able to selectively view context."

## Integration Points

RLM integrates with multiple AIWG systems:

### Agent Supervisor (`tools/daemon/agent-supervisor.mjs`)
- Sub-agent lifecycle management
- Model selection and routing
- Resource allocation and limits

### Task Store (`tools/daemon/task-store.mjs`)
- Persistent task tree storage
- State recovery after failures
- Progress tracking across restarts

### Messaging Hub (`tools/messaging/index.mjs`)
- Sub-agent result collection
- Parallel execution coordination
- Aggregation patterns

### Ralph Loops (`tools/ralph-external/`)
- Iterative refinement within sub-agents
- Best-output selection from multiple attempts
- Feedback-driven improvement

### Multi-Provider Support
- Codex, Claude, Copilot, Cursor, Factory, OpenCode, Warp, Windsurf
- Model mapping handles provider differences
- Consistent RLM patterns across all platforms

## Schemas

RLM defines four core schemas:

**1. Task Tree** (`schemas/rlm-task-tree.yaml`)
- Hierarchical decomposition structure
- Parent-child relationships
- Dependency tracking

**2. State** (`schemas/rlm-state.yaml`)
- Execution status per sub-task
- Intermediate results
- Completion signals

**3. Trajectory** (`schemas/rlm-trajectory.yaml`)
- Tool invocation history
- Decision points and rationale
- Learning data for future training

**4. Cost** (`schemas/rlm-cost.yaml`)
- Token usage by depth
- Model costs per sub-agent
- Total budget tracking

## Dependencies

**Required**: None (RLM operates independently)

**Optional**:
- **ralph**: Enhanced iteration loops with best-output selection
- **aiwg-utils**: Development utilities for testing and debugging

## Usage Patterns

### Pattern 1: Single-File Deep Analysis

```bash
# Large file that exceeds context window
/rlm-query src/large-module.ts "identify all async race conditions"

# RLM will:
# 1. Chunk file by function/class
# 2. Grep for async patterns
# 3. Spawn sub-agents for each async function
# 4. Aggregate race condition findings
```

### Pattern 2: Corpus-Wide Search

```bash
# Find all API endpoints across entire codebase
/rlm-batch "src/**/*.ts" "list all HTTP route handlers"

# RLM will:
# 1. Glob match 50 TypeScript files
# 2. Spawn 50 parallel sub-agents (respecting max-parallel)
# 3. Each extracts endpoints from one file
# 4. Aggregate into comprehensive API inventory
```

### Pattern 3: Cross-Cutting Refactor

```bash
# Rename function across entire codebase
/rlm-query "src/**/*.js" "find all calls to oldFunctionName()"
# → intermediate result: call-sites.json

/rlm-batch "@call-sites.json" "rename oldFunctionName to newFunctionName"
# → applies changes to each file independently

/rlm-query "src/**/*.js" "verify no references to oldFunctionName remain"
# → validation check
```

### Pattern 4: Research Synthesis

```bash
# Analyze 100 research papers for common themes
/rlm-batch ".aiwg/research/sources/**/*.pdf" "extract main contribution"
# → 100 summaries

/rlm-query "@summaries/*.txt" "identify 5 most common themes"
# → synthesized analysis
```

## Advanced Topics

See documentation in `docs/`:

- **Architecture Deep Dive**: `docs/architecture.md`
- **Cost Optimization**: `docs/cost-optimization.md`
- **Parallel Execution**: `docs/parallel-patterns.md`
- **Error Recovery**: `docs/error-recovery.md`
- **Trajectory Analysis**: `docs/trajectory-analysis.md`
- **Integration Guide**: `docs/integration.md`
- **Research Background**: `docs/research-foundation.md`

## Performance Characteristics

Based on REF-089 benchmarks:

| Metric | RLM | Summarization | Direct Context |
|--------|-----|---------------|----------------|
| **Max tokens** | 10M+ (unbounded) | ~1M (limited by compression ratio) | ~200K (context window) |
| **Cost** | 1x (baseline) | 3x (reads everything) | N/A (overflow) |
| **Quality** | High (lossless) | Medium (lossy) | N/A (fails) |
| **Latency** | Variable (parallel) | High (sequential) | N/A (fails) |

**When RLM excels**:
- Information-dense tasks requiring full detail
- Tasks that decompose naturally into independent sub-problems
- Operations benefiting from parallelism

**When alternatives better**:
- Small contexts (<50K tokens) where direct reading works
- Tasks requiring global understanding that cannot decompose
- Real-time latency-critical operations

## Troubleshooting

**Problem**: Sub-agents exceed budget

**Solution**: Reduce `maxSubCalls` or `budgetTokens`, or increase sub-agent focus

**Problem**: Task tree too deep

**Solution**: Reduce `maxDepth`, or improve decomposition strategy

**Problem**: Slow execution despite parallelization

**Solution**: Check `parallelSubCalls` is enabled, verify provider supports concurrency

**Problem**: Results incomplete after timeout

**Solution**: Use `/rlm-status` to check progress, increase timeout, or resume from checkpoint

## References

**Research**:
- `.aiwg/research/findings/REF-089-recursive-language-models.md` — Primary research paper
- `.aiwg/research/synthesis/topic-04-tool-grounding.md` — Tool grounding patterns
- `.aiwg/research/synthesis/topic-02-decomposition.md` — Task decomposition strategies

**AIWG Documentation**:
- `agentic/code/addons/rlm/docs/architecture.md` — Architecture details
- `agentic/code/addons/rlm/docs/cost-optimization.md` — Cost optimization guide
- `agentic/code/addons/rlm/docs/parallel-patterns.md` — Parallelization patterns

**Rules and Schemas**:
- `agentic/code/addons/rlm/rules/rlm-context-management.md` — Context management rules
- `agentic/code/addons/rlm/schemas/` — All schema definitions

**Related Issues**:
- #322 — Core RLM addon implementation
- #323 — Parallel batch processing
- #324 — Task tree visualization
- #325 — Cost tracking and budgets

**Related Addons**:
- `agentic/code/addons/ralph/` — Iterative refinement loops
- `agentic/code/addons/aiwg-utils/` — Development utilities
- `agentic/code/frameworks/sdlc-complete/` — SDLC agent workflows

---

**License**: MIT
**Author**: AIWG Contributors
**Repository**: https://github.com/jmagly/aiwg
