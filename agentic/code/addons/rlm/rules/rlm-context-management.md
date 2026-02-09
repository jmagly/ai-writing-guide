# RLM Context Management Rules

**Enforcement Level**: HIGH
**Scope**: All agents operating on large codebases or document corpora
**Addon**: rlm (Recursive Language Model patterns)
**Research Basis**: REF-089 Recursive Language Models (Zhang et al., 2026)
**Issue**: #322 (Core RLM Addon)

## Overview

These rules enforce Recursive Language Model (RLM) patterns for context management when working with large codebases, documentation corpora, or multi-file operations. Research shows that treating context as an external environment accessed programmatically through code outperforms loading entire contexts into the conversation window — up to 3x cost reduction while maintaining stronger performance.

## Research Foundation

From REF-089 Recursive Language Models (Zhang et al., 2026):

> "The key insight is that arbitrarily long user prompts should not be fed into the neural network directly but should instead be treated as *part of the environment* that the LLM is tasked to *symbolically and recursively interact with*." (p. 1)

> "Compared to the summarization agent which ingests the entire input context, RLMs are up to 3× cheaper while maintaining stronger performance across all tasks because the RLM is able to selectively view context." (p. 6)

> "Unfortunately, compaction is rarely expressive enough for tasks that require dense access throughout the prompt. It presumes that *some* details that appear early in the prompt can safely be forgotten to make room for new content." (p. 1)

## Problem Statement

When working with large codebases or document sets, agents frequently:
- Load entire files into conversation context unnecessarily
- Process all content sequentially instead of filtering first
- Exhaust context windows with raw text rather than using programmatic access
- Lose information through compaction/summarization when full details are needed
- Fail to leverage recursive decomposition for complex multi-file tasks

This produces:
- Context window overflow and truncation
- Degraded output quality as details are lost to compaction
- Expensive token costs from processing irrelevant content
- Inability to handle codebases larger than context window
- Loss of information through lossy summarization

## Mandatory Rules

### Rule 1: Symbolic Handles Over Raw Text

**Research Basis**: REF-089 Design Choice 1 — Treat context as external environment

When working with large files or multiple documents, reference by symbolic handle (file path) rather than loading full content into conversation.

**FORBIDDEN**:
```
Agent task: Check authentication logic across the codebase

Agent: Let me read all 47 files in src/auth/ into context
*Loads 15,000 lines of code*
*Context window 80% full*
*Compaction kicks in, loses details*
```

**REQUIRED**:
```
Agent task: Check authentication logic across the codebase

Agent: I'll work with the codebase as an external environment
*Uses Grep to find password handling patterns*
*Identifies 8 relevant functions*
*Reads only those specific sections with line ranges*
*Preserves full detail, uses <10% of context window*

Symbolic handles maintained: src/auth/login.ts, src/auth/validate.ts
Full content never loaded — accessed programmatically via Read when needed
```

### Rule 2: Programmatic Access Over Full-Context Loading

**Research Basis**: REF-089 Observation 4 — "Even without explicit training, RLMs exhibit interesting context decomposition and problem decomposition behavior." (p. 7)

Before loading a large file, use code-based filtering (Grep, targeted Read with line ranges) rather than reading the entire content.

**FORBIDDEN**:
```
Task: Find all functions that handle user input validation

Agent: Let me read the entire 3,000-line utils.ts file
*Loads full file*
*Scans through 3,000 lines for validation functions*
*Context now contains 2,800 lines of irrelevant code*
```

**REQUIRED**:
```
Task: Find all functions that handle user input validation

Agent: I'll use programmatic access to filter before loading

Step 1: Grep for validation patterns
  grep -n "validate.*input" utils.ts
  → Lines 42, 156, 892, 1240 contain matches

Step 2: Read only relevant sections
  Read utils.ts (lines 35-65)   # First function
  Read utils.ts (lines 150-180) # Second function
  ...

Result: Context contains only 120 lines of relevant code (4% of file)
Full details preserved, no compaction needed
```

**Emergent Strategies** (from REF-089 Section 4.1, pp. 7-8):
- **Chunk by structure**: Use headers, function boundaries, class definitions
- **Keyword filtering**: Grep for relevant patterns before reading
- **Incremental aggregation**: Build understanding progressively via targeted reads
- **Model priors**: Use domain knowledge to narrow search space first

### Rule 3: Recursive Sub-Calls for Dense Tasks

**Research Basis**: REF-089 pp. 5-6 — "On information-dense tasks like OOLONG or OOLONG-Pairs, we observed several cases where recursive LM sub-calling is necessary... Across all information-dense tasks, RLMs outperform the ablation without sub-calling by 10%-59%."

When a task requires processing information distributed across many files, delegate to sub-agents via Task tool rather than trying to process everything in one context.

**FORBIDDEN**:
```
Task: Analyze error handling patterns across 30 API endpoints

Agent: Let me read all 30 endpoint files into context
*Attempts to load 30 files × 500 lines = 15,000 lines*
*Context overflow*
*Compaction loses critical error handling details*
```

**REQUIRED**:
```
Task: Analyze error handling patterns across 30 API endpoints

Agent: This is an information-dense task requiring distributed access.
I'll use recursive sub-calls.

Step 1: Identify all endpoint files
  glob "src/api/**/*.ts"
  → 30 endpoint files identified

Step 2: Spawn parallel sub-agents (via Task tool)
  Sub-agent 1: Analyze error handling in endpoints 1-10
  Sub-agent 2: Analyze error handling in endpoints 11-20
  Sub-agent 3: Analyze error handling in endpoints 21-30

  Each sub-agent:
    - Uses Grep to find error handling code
    - Reads only try/catch blocks and error returns
    - Summarizes patterns found (not raw code)

Step 3: Aggregate sub-agent findings
  Combine 3 summaries (total: ~500 tokens)
  Identify common patterns and gaps

Result: Full coverage, low context usage, no information loss
```

**When to Use Recursive Sub-Calls**:

| Task Type | Use Sub-Calls? | Reason |
|-----------|----------------|--------|
| Single file analysis | No | Read with line ranges sufficient |
| 2-5 related files | Maybe | Depends on total size |
| 6-20 files | Yes | Parallel sub-agents more efficient |
| >20 files | Definitely | Impossible to process in one context |
| Cross-cutting concerns | Yes | Information distributed across codebase |

### Rule 4: Cost-Aware Sub-Call Management

**Research Basis**: REF-089 Figure 3, p. 6 — RLM median cost comparable to base model, up to 3x cheaper than summarization, but high variance exists.

Track sub-call count and estimated token cost. When total cost approaches budget, switch to more targeted strategies rather than broad scanning.

**FORBIDDEN**:
```
Agent spawns 100 sub-agents to analyze every file in repository
*Each sub-agent costs 5,000 tokens*
*Total cost: 500,000 tokens*
*Budget exhausted on preliminary analysis*
*No tokens left for actual implementation*
```

**REQUIRED**:
```
Agent task: Find security vulnerabilities in authentication module

Cost awareness protocol:
1. Estimate task scope:
   - 30 files in auth module
   - Average 300 lines per file
   - Potential cost: 30 sub-calls × 3k tokens = 90k tokens

2. Check budget:
   - Total budget: 100k tokens
   - Estimated usage: 90k tokens (90% of budget)
   - Decision: Budget is tight, use targeted strategy

3. Apply filtering first:
   - Grep for sensitive operations (password, token, session)
   - Reduces scope to 8 critical files
   - New estimate: 8 sub-calls × 3k tokens = 24k tokens (24%)
   - Decision: Proceed with filtered approach

Result: Task completed in 26k tokens (26% of budget)
Buffer maintained for implementation work
```

**Cost Thresholds**:

| Budget Usage | Action |
|--------------|--------|
| <30% | Safe to proceed with current strategy |
| 30-50% | Monitor usage, prepare to filter more aggressively |
| 50-70% | Apply additional filtering before sub-calls |
| >70% | Switch to highly targeted approach or escalate |
| >90% | Abort current strategy, request human guidance |

### Rule 5: Emergent Decomposition Patterns

**Research Basis**: REF-089 Section 4.1 — "Even without explicit training, RLMs exhibit interesting context decomposition and problem decomposition behavior." Lists emergent strategies: chunking by structure, keyword filtering, incremental aggregation.

Use the decomposition patterns RLMs discover naturally. These are not prescribed strategies but observed best practices.

**Pattern 1: Structural Chunking**

**FORBIDDEN**:
```
Agent: Let me read the entire API documentation sequentially from top to bottom
*Loads all 50 pages*
*Loses details through compaction*
```

**REQUIRED**:
```
Agent: I'll chunk by document structure

1. Read table of contents (identifies 8 sections)
2. Determine which sections are relevant (3 of 8)
3. Read only those sections (15 pages instead of 50)

Structural boundary: Section headers
```

**Pattern 2: Keyword Filtering**

**FORBIDDEN**:
```
Agent: I need to understand the database schema
*Reads entire 50-file ORM model directory*
```

**REQUIRED**:
```
Agent: I'll filter by keywords first

1. Grep for "@Entity" decorator (finds 15 model files)
2. Grep for "userId" field (reduces to 5 relevant models)
3. Read only those 5 model definitions

Keyword filters: @Entity, userId
```

**Pattern 3: Incremental Aggregation**

**FORBIDDEN**:
```
Agent: Let me collect all API endpoint signatures at once
*Attempts to extract from 30 files in parallel*
*Context overflow from trying to hold all results*
```

**REQUIRED**:
```
Agent: I'll aggregate incrementally via intermediate storage

Iteration 1: Process endpoints 1-10
  → Write results to .aiwg/working/endpoints-batch1.json

Iteration 2: Process endpoints 11-20
  → Append to .aiwg/working/endpoints-batch2.json

Iteration 3: Process endpoints 21-30
  → Append to .aiwg/working/endpoints-batch3.json

Final step: Read all 3 batch files (compact summaries, not raw content)
  → Synthesize complete API surface

Incremental storage: Files as REPL variables
```

**Pattern 4: Model Priors (Domain Knowledge)**

**FORBIDDEN**:
```
Agent: I need to find the authentication logic
*Searches entire codebase alphabetically*
*Wastes tokens scanning irrelevant directories*
```

**REQUIRED**:
```
Agent: I'll leverage domain knowledge to narrow search

Domain prior: Authentication logic typically in:
  - src/auth/
  - src/middleware/
  - Filenames containing "auth", "login", "session"

1. Glob for these patterns first
2. Only then examine matched files

Search space reduced from 500 files to 12 files via priors
```

## Integration Patterns

### With Ralph Loops

RLM patterns integrate naturally with Ralph's TAO loop:

**Ralph TAO + RLM**:

```yaml
ralph_rlm_integration:
  thought_phase:
    - assess_context_needs
    - estimate_total_tokens_required
    - check_budget_vs_estimate
    - select_access_strategy (direct | filtered | recursive)

  action_phase:
    - if_strategy_direct:
        - Read with line ranges
        - Grep for patterns
    - if_strategy_filtered:
        - Grep first to identify targets
        - Read only matched sections
    - if_strategy_recursive:
        - Spawn sub-agents via Task tool
        - Each sub-agent uses filtered access
        - Aggregate results in intermediate files

  observation_phase:
    - capture_tokens_used
    - update_budget_remaining
    - check_information_completeness
    - decide_next_iteration_strategy
```

**Ralph State as RLM Variables**:

```
.aiwg/ralph/loop-{id}/
├── state/
│   ├── endpoints_analyzed.json      # RLM equivalent of REPL variable
│   ├── error_patterns_found.json    # Persistent intermediate results
│   └── coverage_summary.json        # Aggregated from sub-calls
```

These files act as REPL state variables — persistent across iterations, preventing context bloat.

### With Agent Supervisor

The Agent Supervisor can orchestrate RLM-style recursive delegation:

```yaml
agent_supervisor_rlm:
  on_complex_task:
    - estimate_task_complexity
    - if_complexity_high:
        - decompose_into_subtasks
        - spawn_specialist_agents (recursive sub-calls)
        - each_agent_uses_programmatic_access
        - supervisor_aggregates_results
    - if_complexity_moderate:
        - single_agent_with_filtered_access
    - if_complexity_low:
        - direct_processing
```

### With Research Before Decision

RLM context management complements research-before-decision:

- **Research-before-decision**: Know what to look for
- **RLM context management**: How to efficiently access it

**Combined Pattern**:

```
1. Research phase: Identify what needs to be known
   "I need to find password hashing configuration"

2. RLM filtering: Narrow search space before loading
   grep -r "hash.*password" config/
   → Found in config/security.ts line 42

3. RLM targeted access: Read only relevant section
   Read config/security.ts lines 35-55

4. Decision: Act on complete, targeted information
   Use bcrypt cost factor 12 as configured
```

### With Subagent Scoping

RLM patterns strengthen subagent scoping rules:

**Subagent Scoping Rule 2** + **RLM Rule 2**:

```
Before delegating to subagent:
1. Filter context programmatically (RLM)
2. Pass only filtered results to subagent (scoping)
3. Subagent receives minimal, relevant context
4. No context overflow, no compaction loss
```

**Example**:

```
Parent agent task: Analyze test coverage for auth module

Parent agent (RLM filtering):
  - Globs for test files: test/**/*auth*.test.ts
  - Finds 8 test files
  - Greps each for coverage gaps: "// TODO", "skip", "xit"
  - Extracts summary metadata (not full test code)

Delegation to subagent:
  Context: Summary metadata (200 tokens)
  NOT: All 8 test files (4,000 tokens)

Subagent: Analyzes gaps, suggests improvements
  Uses <10% of context window vs 70% if given full files
```

## Detection Patterns

### Signs of Missing RLM Patterns

| Symptom | Indicates | RLM Solution |
|---------|-----------|--------------|
| Context window repeatedly at 90%+ usage | Loading full content | Use symbolic handles + programmatic access |
| Compaction losing critical details | Too much raw text in context | Filter with Grep before loading |
| Agent reports "cannot process all files" | Single-context limitation | Use recursive sub-calls |
| High token costs on analysis tasks | Inefficient context usage | Apply keyword filtering first |
| Agent provides superficial multi-file analysis | Context overflow | Delegate to parallel sub-agents |
| Repeated re-reading of same files | No persistent state | Use intermediate files as REPL variables |

### Warning Signs Before Context Overload

| Check | Red Flag | RLM Mitigation |
|-------|----------|----------------|
| File count | >10 files needed | Use sub-agents |
| Total lines | >5,000 lines | Apply structural chunking |
| Context estimate | >50% of window | Filter with Grep first |
| Information density | High detail needed throughout | Recursive sub-calls |
| Cross-cutting concern | Logic spread across many files | Parallel sub-agents with aggregation |

## Best Practices

### Good RLM Patterns

**Pattern 1: Environment-First Mindset**

```
Agent receives task: "Update all API endpoints to use new auth middleware"

Good RLM approach:
  THOUGHT: The codebase is my environment. I don't need to load
           everything into my context. I'll interact with it
           programmatically.

  ACTION 1: Glob for endpoint files
    → 24 endpoints found

  ACTION 2: Grep each for current auth middleware usage
    → 18 of 24 use old middleware

  ACTION 3: For each of 18:
    - Read only the middleware registration lines
    - Generate targeted edit
    - Write updated version

  Result: Updated 18 files using <5% of context window
          Full details preserved, no compaction
```

**Pattern 2: Filter → Read → Process**

```
Task: Find all TODO comments related to performance

Bad: Read all files looking for TODOs (context overflow)

Good RLM:
  1. FILTER: grep -r "// TODO.*performance" src/
     → 8 matches found

  2. READ: For each match, read surrounding 10 lines
     → Context contains only 80 lines

  3. PROCESS: Categorize and prioritize TODOs
     → Output summary

Total tokens: <2,000 (vs 50,000+ for full codebase read)
```

**Pattern 3: Recursive Aggregation**

```
Task: Generate API documentation from 40 endpoint files

Bad: Load all 40 files and try to document in one pass

Good RLM:
  1. Spawn 4 sub-agents, each handles 10 endpoints
  2. Each sub-agent:
     - Uses Grep to extract route + handler signature
     - Generates doc snippet
     - Writes to intermediate file
  3. Parent agent:
     - Reads 4 intermediate files (summaries, not raw code)
     - Combines into final documentation
     - Total context: ~5,000 tokens (vs 40,000+ direct)

Recursive structure:
  Root Agent
    ├── Sub-agent 1 (endpoints 1-10) → docs-batch-1.md
    ├── Sub-agent 2 (endpoints 11-20) → docs-batch-2.md
    ├── Sub-agent 3 (endpoints 21-30) → docs-batch-3.md
    └── Sub-agent 4 (endpoints 31-40) → docs-batch-4.md
  Final aggregation from 4 batch files
```

## Cost Model

### RLM vs Full-Context Processing

**From REF-089**: RLMs are up to 3x cheaper than summarization agents while maintaining stronger performance.

**Cost Comparison**:

| Strategy | Token Cost | Information Loss | When Better |
|----------|-----------|------------------|-------------|
| **Full-context loading** | High (all content) | None (initially) | Files <2,000 tokens |
| **Context compaction** | Medium (compression) | High (lossy) | Not recommended for dense tasks |
| **RLM programmatic** | Low-Medium (targeted) | None (lossless) | Files >2,000 tokens, distributed info |
| **RLM recursive** | Variable (sub-calls) | None (lossless) | Very large codebases, cross-cutting |

**Median RLM Cost**: Comparable to or lower than base model (REF-089 Figure 3).

**Variance**: High — some tasks are cheap (simple filtering), others expensive (deep recursion). Use percentile-based cost tracking (p25, p50, p75, p95) to capture distribution.

### Cost Optimization Strategies

**Strategy 1: Depth-Based Budgeting**

```yaml
cost_by_recursion_depth:
  depth_0: 5,000 tokens    # Root agent direct processing
  depth_1: 15,000 tokens   # Root + sub-agents (no sub-sub-agents)
  depth_2: 40,000 tokens   # Root + sub + sub-sub (rare)

guideline: Prefer depth 0-1, avoid depth 2 unless truly necessary
```

**Strategy 2: Batch Size Tuning**

```yaml
batch_sizing:
  small_batch: 3-5 files per sub-agent   # Higher parallelism, more sub-calls
  medium_batch: 8-12 files per sub-agent # Balanced
  large_batch: 15-20 files per sub-agent # Lower parallelism, fewer sub-calls

rule: Tune batch size based on file complexity
  - Simple files (models, configs): Large batches
  - Complex files (business logic): Small batches
```

**Strategy 3: Incremental vs Parallel**

```yaml
aggregation_strategy:
  incremental:
    pattern: Process sequentially, save intermediate results to files
    cost: Lower (one agent active at a time)
    latency: Higher (sequential)
    when: Cost-constrained, not time-sensitive

  parallel:
    pattern: Spawn all sub-agents simultaneously
    cost: Higher (N agents active)
    latency: Lower (parallel execution)
    when: Time-sensitive, budget available
```

## Metrics

Track these metrics for RLM effectiveness:

| Metric | Target | Indicates |
|--------|--------|-----------|
| Context window utilization | <50% | Efficient programmatic access |
| Sub-call count per task | <10 (depth 1) | Appropriate decomposition |
| Cost ratio (RLM vs direct) | <1.5x | RLM efficiency maintained |
| Information completeness | >95% | No critical loss through filtering |
| Compaction rate | <10% | Minimal lossy summarization |
| Median tokens per task | <20k | Sustainable token usage |
| P95 tokens per task | <100k | Outlier control |

## Platform Applicability

These rules apply universally across all AI coding platforms:
- Claude Code, Codex, Copilot, Cursor, Warp, Factory, OpenCode, Windsurf
- Any agent working with large codebases or document corpora

RLM patterns are platform-agnostic — they depend on tool access (Read, Grep, Glob, Task) rather than specific model capabilities.

## Checklist

Before processing large context:

- [ ] Estimated total tokens if loaded directly (would it exceed 50% of context window?)
- [ ] Applied keyword filtering via Grep before loading
- [ ] Used line ranges in Read for targeted access
- [ ] Maintained symbolic file handles rather than loading full content
- [ ] Checked if recursive sub-calls would be more efficient (>10 files)
- [ ] Budget allocated for sub-calls if using delegation
- [ ] Intermediate results saved to files (REPL variables) if iterative
- [ ] Cost tracking enabled to monitor token usage

Before spawning sub-agents for RLM recursion:

- [ ] Task requires distributed information access (>5 files)
- [ ] Budget allocated (estimated cost < 70% of total budget)
- [ ] Each sub-task has clear scope (subagent-scoping rules followed)
- [ ] Aggregation strategy defined (parallel or incremental)
- [ ] Parent agent will receive summaries, not raw content from sub-agents

## Limitations

From REF-089 Appendix B, important limitations to be aware of:

1. **Synchronous sub-calls are slow**: Production systems should use async/parallel execution (AIWG already supports via Task tool parallelism)
2. **Models need coding ability**: Non-coder models struggle with programmatic context access (AIWG agents run in coding-capable environments by design)
3. **Output token limits matter**: Models with limited output tokens underperform as RLMs (provider model selection should consider this)
4. **High variance in costs**: Some RLM runs are expensive outliers (use percentile-based cost tracking, not just averages)

## References

- @.aiwg/research/findings/REF-089-recursive-language-models.md - Complete research analysis
- @.claude/rules/research-before-decision.md - Complementary research patterns
- @.claude/rules/subagent-scoping.md - Context limits for delegation
- @.claude/rules/tao-loop.md - TAO loop integration with RLM patterns
- @tools/ralph-external/ - Ralph loop implementation
- @tools/daemon/agent-supervisor.mjs - Agent orchestration
- @tools/daemon/task-store.mjs - Persistent state (REPL variables)

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-02-09
**Research Basis**: REF-089 (Zhang, Kraska, & Khattab, 2026)
**Issue**: #322 (Core RLM Addon)
