# Recursive Language Model Agent — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587/#1600).

These worked examples demonstrate the RLM execution patterns (keyword filtering,
structural chunking, recursive corpus analysis, incremental aggregation, and
model-prior-guided search) end-to-end. The agent definition retains the
capability descriptions and pattern catalog; the full input → output walkthroughs
live here.

## Example 1: Simple — Search Large File for Specific Function

**Task**: Find the implementation of `validatePassword()` in a 3000-line auth module.

**Context**:
- File: `src/auth/authentication.ts` (3000 lines)
- User wants to understand password validation logic

**RLM Approach**:

```markdown
THOUGHT [Goal]: I need to find validatePassword() in a large file.

THOUGHT [Research]: Instead of reading 3000 lines, I'll search for the function
definition first to get the line number.

ACTION: Grep
  pattern: "validatePassword"
  path: "src/auth/authentication.ts"
  output_mode: "content"
  -n: true

OBSERVATION:
  142: export function validatePassword(password: string): ValidationResult {
  143:   const minLength = 8;
  144:   const hasUpper = /[A-Z]/.test(password);
  ...
  168: }

THOUGHT [Extraction]: Function starts at line 142, likely ends around 168.

ACTION: Read
  file_path: "src/auth/authentication.ts"
  offset: 140
  limit: 35

OBSERVATION: [Full function implementation]

THOUGHT [Synthesis]: I now have the complete validatePassword() function.
Writing to intermediate result for reference.

ACTION: Write
  file_path: ".aiwg/rlm/tasks/task-001/final-result.md"
  content: |
    # validatePassword() Implementation

    Located at: src/auth/authentication.ts:142-168

    ## Function:
    ```typescript
    [full function code]
    ```

    ## Summary:
    - Minimum 8 characters
    - Requires uppercase, lowercase, number, special character
    - Returns ValidationResult with error messages

COMPLETION: Task complete. Function analysis written to final-result.md.
```

**Why This Is Good**:
- Used Grep to locate before reading (saved 2850 lines from context)
- Read only relevant section (35 lines vs 3000)
- Wrote final result to file for persistence
- Clear completion signal

## Example 2: Moderate — Analyze Multiple Files and Aggregate

**Task**: Find all database migration files and summarize their changes.

**Context**:
- Directory: `db/migrations/` (unknown number of files)
- User wants a changelog of all schema changes

**RLM Approach**:

```markdown
THOUGHT [Goal]: I need to find all migration files and summarize their changes.

THOUGHT [Research]: First discover how many migration files exist, then analyze each.

ACTION: Glob
  pattern: "db/migrations/*.sql"

OBSERVATION:
  db/migrations/001-create-users.sql
  db/migrations/002-add-email-verification.sql
  db/migrations/003-create-sessions.sql
  db/migrations/004-add-user-roles.sql
  [12 total files]

THOUGHT [Reasoning]: 12 files is manageable but will exceed context if I read all.
I'll delegate per-file analysis to sub-agents and aggregate their results.

ACTION: Write
  file_path: ".aiwg/rlm/tasks/task-002/query-plan.md"
  content: |
    # Migration Analysis Plan

    Files to analyze: 12
    Strategy: Delegate per-file to sub-agents
    Aggregation: Collect summaries into changelog

ACTION: Task (parallel)
  [Spawn 12 sub-agents in parallel]

  Sub-agent 1: "Summarize database changes in db/migrations/001-create-users.sql.
                Write result to .aiwg/rlm/tasks/task-002/intermediate/summary-001.md"

  Sub-agent 2: "Summarize database changes in db/migrations/002-add-email-verification.sql.
                Write result to .aiwg/rlm/tasks/task-002/intermediate/summary-002.md"

  [... 10 more sub-agents ...]

OBSERVATION: All sub-agents completed successfully.
  [12 summary files written to intermediate/]

THOUGHT [Extraction]: Sub-agents have analyzed each migration. Now aggregate.

ACTION: Bash
  command: "cat .aiwg/rlm/tasks/task-002/intermediate/summary-*.md > .aiwg/rlm/tasks/task-002/intermediate/all-summaries.md"

OBSERVATION: Aggregated file created (2.1KB).

ACTION: Read
  file_path: ".aiwg/rlm/tasks/task-002/intermediate/all-summaries.md"

OBSERVATION: [All 12 summaries]

THOUGHT [Synthesis]: I now have all migration summaries. Creating final changelog.

ACTION: Write
  file_path: ".aiwg/rlm/tasks/task-002/final-result.md"
  content: |
    # Database Migration Changelog

    ## Summary
    12 migrations applied from 2024-01 to 2025-12

    ## Changes by Migration

    ### 001 - Create Users (2024-01-15)
    - Created `users` table
    - Columns: id, email, password_hash, created_at

    ### 002 - Add Email Verification (2024-02-10)
    - Added `email_verified` boolean to users
    - Added `verification_token` column

    [... remaining 10 migrations ...]

    ## Schema Impact
    - 5 new tables created
    - 8 columns added to existing tables
    - 2 indexes created for performance

COMPLETION: Migration changelog complete. Final result written to final-result.md.
```

**Why This Is Good**:
- Used Glob to discover files (no guessing)
- Delegated to parallel sub-agents (12 independent analyses)
- Sub-agents wrote structured output to intermediate files
- Root agent aggregated efficiently (read intermediate files, not re-analyze)
- Clear completion with comprehensive summary

## Example 3: Complex — Recursive Corpus Analysis with Sub-Agent Delegation

**Task**: Analyze the AIWG research corpus to find all papers discussing "agent memory" and synthesize their key approaches.

**Context**:
- Corpus: `.aiwg/research/sources/` (89 papers)
- User wants comparative analysis of memory systems across research

**RLM Approach**:

```markdown
THOUGHT [Goal]: Find all papers discussing agent memory and synthesize approaches.

THOUGHT [Research]: 89 papers is too many to process directly. I'll use a two-phase
approach: (1) Filter to relevant papers, (2) Deep analysis of filtered set.

ACTION: Bash
  command: "ls .aiwg/research/sources/ | wc -l"

OBSERVATION: 89

THOUGHT [Reasoning]: Step 1 - Filter corpus to memory-relevant papers using keyword search.

ACTION: Grep
  pattern: "memory|episodic|semantic|reflexion|recall"
  path: ".aiwg/research/sources/"
  glob: "*.md"
  output_mode: "files_with_matches"

OBSERVATION:
  .aiwg/research/sources/REF-021-reflexion.md
  .aiwg/research/sources/REF-035-memgpt.md
  .aiwg/research/sources/REF-041-generative-agents.md
  .aiwg/research/sources/REF-057-agent-laboratory.md
  .aiwg/research/sources/REF-089-recursive-language-models.md
  [12 total papers]

THOUGHT [Progress]: Filtered from 89 to 12 papers. Now write the filtered list.

ACTION: Write
  file_path: ".aiwg/rlm/tasks/task-003/intermediate/memory-relevant-papers.txt"
  content: |
    REF-021-reflexion.md
    REF-035-memgpt.md
    REF-041-generative-agents.md
    REF-057-agent-laboratory.md
    REF-089-recursive-language-models.md
    [... 7 more papers]

THOUGHT [Reasoning]: 12 papers. Delegate deep analysis to sub-agents (one per paper).
Each sub-agent will extract the memory approach and key findings.

ACTION: Task (parallel)
  [Spawn 12 sub-agents]

  Sub-agent 1 (Depth 1):
    Task: "Analyze @.aiwg/research/sources/REF-021-reflexion.md
           Extract: (1) Type of memory system, (2) Key mechanism, (3) Performance impact
           Write: .aiwg/rlm/tasks/task-003/intermediate/analysis-REF-021.yaml"

  Sub-agent 2 (Depth 1):
    Task: "Analyze @.aiwg/research/sources/REF-035-memgpt.md
           [same extraction criteria]
           Write: .aiwg/rlm/tasks/task-003/intermediate/analysis-REF-035.yaml"

  [... 10 more sub-agents ...]

OBSERVATION: All 12 sub-agents completed.
  Sub-agent 1 wrote: analysis-REF-021.yaml (3.2KB)
  Sub-agent 2 wrote: analysis-REF-035.yaml (2.8KB)
  [... 10 more ...]

THOUGHT [Extraction]: Sub-agents have extracted structured data. Now aggregate.

ACTION: Bash
  command: |
    for f in .aiwg/rlm/tasks/task-003/intermediate/analysis-*.yaml; do
      echo "---"
      cat "$f"
    done > .aiwg/rlm/tasks/task-003/intermediate/all-analyses.yaml

OBSERVATION: Aggregated YAML created (34KB).

ACTION: Read
  file_path: ".aiwg/rlm/tasks/task-003/intermediate/all-analyses.yaml"

OBSERVATION: [12 structured analyses]

THOUGHT [Synthesis]: I now have all memory approaches. Synthesizing into comparative analysis.

ACTION: Write
  file_path: ".aiwg/rlm/tasks/task-003/final-result.md"
  content: |
    # Agent Memory Systems: Comparative Analysis

    ## Papers Analyzed
    12 papers from AIWG research corpus (filtered from 89)

    ## Memory System Types

    ### Episodic Memory (4 papers)
    - **Reflexion** (REF-021): Sliding window of past task attempts
      - Stores: trajectory, reward, reflection
      - Window size: Ω=1-5 (task-dependent)
      - Impact: +34% success rate on HumanEval

    - **Agent Laboratory** (REF-057): Draft-then-edit memory
      - Stores: previous drafts, human feedback
      - Window: Last 3 iterations
      - Impact: 84% cost reduction vs autonomous

    [... 2 more episodic systems ...]

    ### Working Memory (3 papers)
    - **MemGPT** (REF-035): Hierarchical context management
      - Stores: Core context + archival
      - Paging: Move between tiers
      - Impact: 10x context capacity

    [... 2 more working memory systems ...]

    ### Semantic Memory (2 papers)
    - **Generative Agents** (REF-041): Retrieval-based memory
      - Stores: Embeddings of past interactions
      - Retrieval: Similarity search
      - Impact: Consistent long-term behavior

    [... 1 more semantic system ...]

    ### Hybrid Systems (3 papers)
    - **RLM** (REF-089): External environment as memory
      - Stores: REPL state variables
      - Access: Programmatic via code
      - Impact: Lossless, scales unbounded

    [... 2 more hybrid systems ...]

    ## Key Findings

    | Memory Type | Best For | Cost | Complexity |
    |-------------|----------|------|------------|
    | Episodic | Iterative tasks | Low | Low |
    | Working | Long conversations | Medium | Medium |
    | Semantic | Long-term consistency | High | High |
    | Hybrid | Large-scale analysis | Variable | Medium |

    ## Recommendations for AIWG

    1. **Agent loops**: Episodic memory (Reflexion pattern) - already implemented
    2. **Long sessions**: Working memory (MemGPT-style paging) - planned
    3. **Cross-session**: Semantic memory (embeddings) - future work
    4. **Large corpora**: Hybrid (RLM pattern) - this agent!

    ## References

    All 12 papers analyzed:
    - @.aiwg/research/sources/REF-021-reflexion.md
    - @.aiwg/research/sources/REF-035-memgpt.md
    [... full list ...]

    ## Detailed Analyses

    Individual paper analyses available at:
    .aiwg/rlm/tasks/task-003/intermediate/analysis-*.yaml

COMPLETION: Agent memory comparative analysis complete.
  - 89 papers screened
  - 12 papers deeply analyzed
  - Synthesis written to final-result.md
```

**Why This Is Good**:
- Two-phase approach: filter then analyze (saved 77 irrelevant papers)
- Used Grep to identify relevant subset before deep analysis
- Delegated per-paper analysis to parallel sub-agents (12 independent tasks)
- Sub-agents wrote structured YAML for machine-readable aggregation
- Root agent synthesized high-level comparative analysis
- All intermediate data preserved for future reference
- Clear completion with actionable recommendations

**Key RLM Patterns Demonstrated**:
1. **Keyword filtering**: Used Grep to narrow corpus from 89 to 12
2. **Recursive delegation**: Root agent spawned 12 sub-agents (depth 1)
3. **Structured output**: Sub-agents wrote YAML for easy aggregation
4. **Incremental aggregation**: Collected all analyses before synthesis
5. **Model priors**: Used domain knowledge (memory keywords) to guide search
6. **Explicit completion**: Clear COMPLETION signal with summary

## RLM-Specific Pattern Walkthroughs

These are the worked command sequences for the five RLM strategy patterns. The
agent definition keeps the strategy descriptions; the demonstrative command
sequences live here.

### Pattern 1: Keyword Filtering Before Reading

**Problem**: Need to find authentication logic in a 5000-line file.

**RLM Solution**:
```bash
# Step 1: Find relevant line numbers
grep -n "authenticate\|login\|auth" src/large-file.ts

# Step 2: Read only relevant sections (±20 lines of context)
# If line 142 matched, read lines 122-162
```

**Anti-Pattern**: Reading the entire file into context.

### Pattern 2: Structural Chunking

**Problem**: Analyze all functions in a module.

**RLM Solution**:
```bash
# Step 1: Extract function names
grep -E "^(export )?function \w+|^(export )?(const|let) \w+ = " src/module.ts

# Step 2: Delegate per-function analysis
Task("Analyze function authenticateUser()") for each function
Task("Analyze function validateToken()")
...

# Step 3: Aggregate results
Write intermediate/{function-name}-analysis.md for each
Synthesize into final-module-analysis.md
```

### Pattern 3: Recursive Corpus Analysis

**Problem**: Analyze 100 research papers for a specific claim.

**RLM Solution**:
```bash
# Root agent (you):
1. Glob for all papers: .aiwg/research/sources/*.pdf
2. Spawn sub-agent per paper: Task("Extract key claims from {paper}")
3. Sub-agents write: intermediate/claims-{paper-id}.yaml
4. Root aggregates: Read all intermediate/*.yaml → synthesize

# Sub-agents (depth 1):
1. Receive single paper path
2. Search for keywords
3. Extract relevant passages
4. Write structured claims YAML
5. DONE (no further recursion needed)
```

### Pattern 4: Incremental Aggregation

**Problem**: Find all API endpoints across a codebase.

**RLM Solution**:
```bash
# Step 1: Discover route files
glob "**/*route*.{ts,js}" → intermediate/route-files.txt

# Step 2: Extract endpoints per file
For each file in route-files.txt:
  grep -E "router\.(get|post|put|delete)" {file} → intermediate/endpoints-{file}.txt

# Step 3: Aggregate
cat intermediate/endpoints-*.txt → intermediate/all-endpoints.txt

# Step 4: Deduplicate and structure
Parse intermediate/all-endpoints.txt → Write final-api-inventory.json
```

### Pattern 5: Model Prior-Guided Search

**Problem**: Find where database transactions are handled.

**RLM Solution**:
```bash
# Use domain knowledge to narrow search BEFORE reading
# Likely locations: repositories, services, database modules

# Step 1: Search likely paths first
grep -r "transaction\|BEGIN\|COMMIT" src/repositories/ src/services/ src/db/

# Step 2: If found, read those files
# Step 3: If not found, expand search
grep -r "transaction\|BEGIN\|COMMIT" src/
```

**Key Insight**: Use your prior knowledge about code organization to guide the search, don't search exhaustively when domain priors exist.

## Output Format Templates

### During Execution

```
─────────────────────────────────────────
RLM Agent: {task-id}
─────────────────────────────────────────

Phase: DISCOVERY
- Scanning: {directory/file}
- Found: {N} relevant files/sections

Phase: DECOMPOSITION
- Strategy: {by_structure | by_keyword | by_file}
- Sub-calls: {N} parallel tasks

Phase: AGGREGATION
- Collected: {N} intermediate results
- Aggregating: {approach}

Phase: SYNTHESIS
- Synthesizing final result
- Writing: {completion-artifact}

Completed: {timestamp}
─────────────────────────────────────────
```

### On Completion

```
═══════════════════════════════════════════
RLM Agent: COMPLETE
═══════════════════════════════════════════

Task: {task-description}
Status: SUCCESS

Execution Summary:
- Files analyzed: {N}
- Sub-agents spawned: {M}
- Recursion depth: {D}
- Duration: {time}

Cost Metrics:
- Total tokens: {tokens}
- Sub-call tokens: {sub-tokens}
- Cost vs baseline: {percentage}

Artifacts:
- Query plan: {path}/query-plan.md
- Intermediate results: {path}/intermediate/ ({N} files)
- Final result: {path}/final-result.md

═══════════════════════════════════════════
```

## Execution-Pattern Flow Diagram

The environment-first loop, drawn out:

```
┌─────────────────────────────────────────┐
│         RLM EXECUTION PATTERN           │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐                      │
│  │ Identify     │                      │
│  │ What to Know │                      │
│  └──────┬───────┘                      │
│         │                               │
│         ▼                               │
│  ┌──────────────┐                      │
│  │ Write Code   │ ◀─ Grep/Glob/Read    │
│  │ to Query     │    with line ranges  │
│  └──────┬───────┘                      │
│         │                               │
│         ▼                               │
│  ┌──────────────┐                      │
│  │ Execute &    │                      │
│  │ Observe      │                      │
│  └──────┬───────┘                      │
│         │                               │
│    ┌────┴────┐                         │
│    │ Enough? │                         │
│    └────┬────┘                         │
│         │                               │
│     NO  │        YES                    │
│         │         │                     │
│    ┌────▼────┐   ▼                     │
│    │ Recurse │  Set                    │
│    │ Deeper  │  Completion             │
│    └─────────┘   State                 │
│         │         │                     │
│         │    ┌────▼────┐               │
│         └───▶│ DONE    │               │
│              └─────────┘               │
│                                         │
└─────────────────────────────────────────┘
```

## State Directory Layout

RLM agents maintain explicit state on the filesystem:

```
.aiwg/rlm/tasks/{task-id}/
├── query-plan.md          # Task decomposition plan
├── intermediate/          # Named intermediate results
│   ├── search-results.txt
│   ├── filtered-files.json
│   └── aggregated-data.yaml
├── sub-calls/             # Delegated sub-tasks
│   ├── analyze-module-a.md
│   └── analyze-module-b.md
└── final-result.md        # Completion artifact
```

**Key Principle**: If an intermediate result might be useful later, write it to a file. Don't rely on context memory.

## Configuration Samples

### Basic Configuration

```yaml
rlm_config:
  max_depth: 5                    # Maximum recursion depth
  max_sub_calls: 20               # Maximum sub-agents per task
  sub_model: "sonnet"             # Model for sub-agents (default: same as parent)
  parallel_sub_calls: true        # Allow parallel Task execution
  intermediate_dir: ".aiwg/rlm/tasks/{task-id}/intermediate/"
  completion_artifact: "final-result.md"
```

### Advanced Configuration

```yaml
advanced_rlm_config:
  chunk_strategy: "auto"          # auto | by_function | by_section | fixed_size
  chunk_size: 1000                # Lines per chunk (if fixed_size)
  cache_intermediate: true        # Reuse intermediate results
  cost_tracking: true             # Track token costs per sub-call
  timeout_per_subcall: 300        # Seconds (5 minutes default)
  fallback_on_depth_limit: true   # Warn instead of error at max depth
```

## Cost Model Table

Based on REF-089 research findings:

| Metric | Direct Processing | RLM Pattern |
|--------|------------------|-------------|
| Median cost | 1.0x (baseline) | 0.8-1.2x |
| Cost variance | Low | Moderate (some outliers 3x+) |
| When cheaper | Short contexts | Long contexts, sparse access |
| When expensive | Long contexts | Inefficient decomposition |

**Key Insight**: RLM is up to 3x cheaper than summarization agents when context access is selective. Cost depends on decomposition quality.

## Research Foundation Quotes

Verbatim quotes from REF-089: Recursive Language Models (Zhang et al., 2026):

> "The key insight is that arbitrarily long user prompts should not be fed into the neural network directly but should instead be treated as part of the environment that the LLM is tasked to symbolically and recursively interact with."

> "Compared to the summarization agent which ingests the entire input context, RLMs are up to 3× cheaper while maintaining stronger performance across all tasks because the RLM is able to selectively view context."

> "Even without explicit training, RLMs exhibit interesting context decomposition and problem decomposition behavior."

## Comparison Tables

### RLM vs Context Compaction

| Dimension | Context Compaction | RLM Pattern |
|-----------|-------------------|-------------|
| Information loss | Lossy (summarized) | Lossless (original preserved) |
| Access pattern | Sequential | Random access via code |
| Cost | Fixed | Variable (sub-call dependent) |
| Scale ceiling | Limited by compressed size | Unbounded (recursive) |
| Best for | Short/medium contexts | Long/information-dense contexts |

### RLM vs RAG

| Dimension | RAG | RLM Pattern |
|-----------|-----|-------------|
| Retrieval | Pre-computed embeddings | Dynamic, code-driven |
| Flexibility | Fixed strategy | Adaptive per query |
| Multi-hop | Difficult | Natural (recursive) |
| Setup cost | High (indexing) | Zero (no preprocessing) |
| Best for | Known patterns, stable corpora | Ad-hoc analysis, changing data |
