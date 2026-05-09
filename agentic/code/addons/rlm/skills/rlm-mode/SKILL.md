---
namespace: aiwg
name: rlm-mode
description: Detect requests for recursive decomposition and large-scale operations that benefit from RLM processing
version: 1.1.0
platforms: [all]

---

# RLM Mode Skill

You detect when users need large-scale operations that would benefit from recursive decomposition and route to RLM commands instead of attempting to load everything into context.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "RLM" / "recursive language model" → explicit RLM mode activation
- "process in chunks" → chunk-based decomposition request
- "decompose and process" → explicit decomposition shorthand
- "fan out" → parallel fan-out processing across files or modules

## Core Problem

Loading entire codebases or directory trees into context causes:
- **Context window overflow**: Exceeding model limits
- **Degraded quality**: Agent struggles with too much information
- **Poor performance**: Slow processing, truncated responses
- **Memory exhaustion**: System crashes on large repos

**RLM solution**: Decompose → Process in chunks → Aggregate results

## Trigger Patterns Reference

| Pattern | Example | Why RLM? |
|---------|---------|----------|
| `analyze all files` | "analyze all TypeScript files for security issues" | Scope exceeds context window |
| `search the entire codebase` | "search the entire codebase for authentication logic" | Need to traverse full tree |
| `review every module` | "review every module for proper error handling" | Many independent reviews |
| `find all instances` | "find all instances of deprecated API usage" | Requires exhaustive search |
| `summarize the whole repository` | "summarize the whole repository structure" | Hierarchical decomposition |
| `check every file` | "check every file for missing tests" | File-by-file evaluation |
| `scan all directories` | "scan all directories for outdated dependencies" | Directory tree traversal |
| `across the entire project` | "find TODOs across the entire project" | Project-wide aggregation |
| `throughout the repository` | "identify duplicated code throughout the repository" | Cross-file comparison |
| `recursively process` | "recursively process src/ and generate docs" | Explicit recursion request |
| `batch process` | "batch process all markdown files for formatting" | Parallel batch operation |
| `apply to all` | "apply linting rules to all JavaScript files" | Bulk transformation |
| `update every` | "update every component to use new API" | Mass refactoring |
| `generate for each` | "generate tests for each module in lib/" | Templated generation |

## Detection Logic

### High Confidence (Auto-Suggest)

**Patterns that almost always need RLM**:

1. **Quantifiers**: "all", "every", "entire", "whole", "throughout"
2. **Scope words**: "codebase", "repository", "project-wide"
3. **Recursive terms**: "recursively", "nested", "hierarchical", "tree"
4. **Batch terms**: "batch", "bulk", "mass", "apply to multiple"

**Heuristics**:
- User mentions directory paths (`src/`, `lib/`, `test/`)
- User wants aggregated output ("list all", "summarize", "generate report")
- Task involves file count estimation >20 files
- User explicitly says "this might be a lot" or "there are many files"

### Medium Confidence (Suggest with Alternatives)

**Patterns that might need RLM**:

1. User asks about "multiple files" without quantity
2. User wants to "find patterns" without specifying scope
3. Task could be done with grep but user phrases it as analysis

**In these cases**: Ask user to clarify scope before recommending RLM

### Low Confidence (Don't Suggest)

**Patterns that DON'T need RLM**:

1. Single file operations: "analyze this file", "refactor login.ts"
2. Specific file list: "check auth.ts, user.ts, and session.ts"
3. Interactive exploration: "show me the auth module"
4. Already scoped: "in this directory" (with small directory)

## Decomposition Strategies

When RLM is appropriate, suggest the right strategy:

### Strategy 1: Recursive Query (`rlm-query`)

**Use when**: User wants to find, list, or aggregate information

**Example triggers**:
- "find all functions that use deprecated API"
- "list all files missing tests"
- "identify all TODO comments"
- "show me all error handling patterns"

**Suggested command**:
```
/rlm-query "{context-source}" "{query}" --depth {N}
```

The first positional argument is the context source — a single file path or glob pattern. The second is the sub-prompt for the spawned sub-agent.

**Example**:
```
User: "find all TODO comments across the entire codebase"

Decomposition:
  Context source: "**/*.{js,ts,jsx,tsx}" (all code files)
  Query: "Extract TODO comments with file:line locations"

Suggested: /rlm-query "**/*.{js,ts,jsx,tsx}" "Extract TODO comments with file:line locations"
```

### Strategy 2: Batch Processing (`rlm-batch`)

**Use when**: User wants to transform, update, or generate for multiple files

**Example triggers**:
- "update every component to use new prop types"
- "add JSDoc comments to all functions"
- "refactor all API calls to use new client"
- "generate tests for each module"

**Suggested command**:
```
/rlm-batch "{glob-pattern}" "{operation}" --max-parallel {N}
```

The first positional argument is the glob pattern that selects target files. The second is the operation applied to each file (use `{file}` as the placeholder for the current file path).

**Example**:
```
User: "add TypeScript types to every JavaScript file in src/"

Decomposition:
  Glob pattern: "src/**/*.js"
  Operation: "Add TypeScript type annotations to {file}"
  Max parallel: 4 (concurrent workers)

Suggested: /rlm-batch "src/**/*.js" "Add TypeScript type annotations to {file}" --max-parallel 4
```

### Strategy 3: Hierarchical Summary (`rlm-batch` with summarize aggregation)

**Use when**: User wants to understand large-scale structure or relationships

**Example triggers**:
- "summarize the entire repository structure"
- "explain the architecture of this codebase"
- "show me the dependency tree"
- "what are the main modules?"

**Suggested command**:
```
/rlm-batch "{glob-pattern}" "Summarize {file} for repository structure analysis" --aggregate summarize --max-parallel {N}
```

Pick a glob pattern that matches your repository layout. Common patterns:

- `**/README.md` — works for monolith *and* monorepo layouts (use a `.gitignore`-aware glob to avoid `node_modules/`)
- `apps/*/README.md` — multi-app monorepos
- `packages/*/README.md` — workspace-style monorepos
- `src/*/index.{ts,js}` — top-level module entry points

**Example**:
```
User: "summarize the whole repository so I can understand the architecture"

Decomposition:
  Glob pattern: "**/README.md" (adapt to your layout)
  Operation: "Summarize {file} for architecture overview"
  Max parallel: 3
  Aggregate: summarize (collapse all sub-summaries into one overview)

Suggested: /rlm-batch "**/README.md" "Summarize {file} for architecture overview" --aggregate summarize --max-parallel 3
```

## Response Templates

### When RLM is Clearly Needed

```
This request involves processing {N estimated} files, which exceeds comfortable
context window usage.

I recommend using RLM (Recursive Language Model) processing:

**Suggested approach:**
{command}

This will:
1. Decompose the task into manageable chunks
2. Process files independently (avoiding context overflow)
3. Aggregate results into a coherent summary

Would you like me to proceed with this RLM approach, or would you prefer a
different strategy?
```

### When Scope is Unclear

```
This could involve processing many files. To choose the right approach:

1. How many files are we talking about?
   - A few (1-5): I can handle directly
   - Several (5-20): Borderline, depends on size
   - Many (20+): RLM processing recommended

2. What's the scope?
   - Specific directory: {suggest path}
   - Whole repository: Definitely use RLM
   - Filtered by pattern: {suggest glob pattern}

Please clarify and I'll recommend the best approach.
```

### When User Insists on Direct Processing (Warning)

```
I can attempt to load {estimated files} directly, but I should warn you:

⚠️ Risks:
- Context window overflow (may truncate output)
- Degraded quality (too much information to process well)
- Slow response time
- Possible incomplete results

**Recommended**: Use RLM processing instead via:
{command}

Do you want to proceed with direct loading anyway, or use the recommended
RLM approach?
```

## Parameter Extraction

### Context Source Construction

The context source is the first positional argument — a single file path or glob pattern. Construct it from explicit and implicit signals.

**From explicit mention**:
- "in src/" → `src/**/*`
- "under lib/components/" → `lib/components/**/*`
- "the test directory" → `test/**/*`

**From implicit context**:
- No mention → `**/*` (whole repo)
- "the codebase" → `**/*`
- "source files" → `src/**/*` (if `src/` exists)

### File Type Filters

Combine the directory scope with a type filter to narrow the glob.

**From file type mention**:
- "TypeScript files" → append `*.ts`
- "React components" → append `*.{jsx,tsx}`
- "test files" → append `*.test.{js,ts}`
- "markdown docs" → append `*.md`

**From explicit pattern**:
- "files matching *.config.js" → use `**/*.config.js`

**Default**:
- No mention → leave the context source broad (`**/*`)

### Depth Extraction

**From explicit mention**:
- "top-level only" → `--depth 1`
- "two levels deep" → `--depth 2`
- "recursively" → omit (use default)

**From implicit context**:
- Summary request → `--depth 3` (reasonable overview)
- Search request → omit (exhaustive)
- Transform request → omit (all matches)

### Parallelism Extraction

**For batch operations** (`rlm-batch`):
- Default: `--max-parallel 4` (balanced, mid-sweet-spot)
- User mentions "fast" → `--max-parallel 7` (upper bound; see context-budget rule)
- User mentions "careful" → `--max-parallel 2` (conservative)

When `AIWG_CONTEXT_WINDOW` is declared in the project context, the parallel cap is bounded by the context-budget rule. See `@$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-budget.md`.

## Clarification Prompts

### If Query is Ambiguous

```
To set up RLM processing, I need to clarify:

1. **Scope**: Which directories?
   - [ ] Entire repository (.)
   - [ ] Specific directory: _______
   - [ ] Multiple directories: _______

2. **Files**: Which file types?
   - [ ] All files
   - [ ] Code files only (*.js, *.ts, etc.)
   - [ ] Specific pattern: _______

3. **Operation**: What should I do with each file?
   - [ ] Extract information (use rlm-query)
   - [ ] Transform/update (use rlm-batch)
   - [ ] Summarize structure (use rlm-batch with summarize aggregation)

Please provide these details.
```

### If Scope Seems Too Large

```
This request would process approximately {N estimated} files.

**Options:**

1. **Narrow the scope** (recommended):
   - Specific directory: {suggest path}
   - File type filter: {suggest pattern}
   - Depth limit: {suggest depth}

2. **Proceed with full scope** using RLM:
   - Command: {command}
   - Estimated time: {estimate}
   - This will process in chunks to avoid overflow

3. **Sample first**:
   - Process a subset to verify approach
   - Then expand to full scope

Which option do you prefer?
```

## Invocation Examples

### Example 1: Find Pattern Across Codebase

**User**: "find all instances of console.log across the entire project"

**Detection**:
- Trigger: "all instances", "across the entire project"
- Strategy: rlm-query (finding information)

**Extraction**:
- Context source: "**/*.{js,ts,jsx,tsx}" (JavaScript/TypeScript files)
- Query: "Find all console.log statements"

**Response**:
```
This requires searching across the entire codebase. I'll use RLM processing:

/rlm-query "**/*.{js,ts,jsx,tsx}" "Find all console.log statements with file and line number"

This will:
1. Recursively scan all JavaScript/TypeScript files
2. Extract console.log locations
3. Aggregate results into a summary report

Proceeding...
```

### Example 2: Batch Update

**User**: "update every React component to use the new useAuth hook instead of the old AuthContext"

**Detection**:
- Trigger: "update every", "React component"
- Strategy: rlm-batch (transformation)

**Extraction**:
- Glob pattern: "src/**/*.{jsx,tsx}" (React components)
- Operation: "Replace AuthContext with useAuth hook in {file}"
- Max parallel: 4 (default)

**Response**:
```
This is a batch refactoring task that will affect multiple components. Using RLM:

/rlm-batch "src/**/*.{jsx,tsx}" "Replace AuthContext with useAuth hook in {file}" --max-parallel 4

This will:
1. Identify all React components using AuthContext
2. Refactor each to use useAuth hook
3. Process 4 files concurrently for efficiency
4. Verify changes compile before proceeding to next

Proceeding with batch operation...
```

### Example 3: Repository Summary

**User**: "summarize the whole repository structure so I can understand what this project does"

**Detection**:
- Trigger: "summarize the whole repository"
- Strategy: rlm-batch with summarize aggregation (hierarchical understanding)

**Extraction**:
- Glob pattern: "**/README.md" (works across layouts; substitute `apps/*/README.md` or `packages/*/README.md` for monorepos)
- Operation: "Summarize {file} for architecture overview"
- Max parallel: 3
- Aggregate: summarize

**Response**:
```
I'll create a hierarchical summary of the repository using RLM batch aggregation:

/rlm-batch "**/README.md" "Summarize {file} for architecture overview" --aggregate summarize --max-parallel 3

This will:
1. Summarize each README independently (sub-agent per file)
2. Aggregate the summaries into one overview
3. Preserve chunked processing for large repositories
4. Generate a concise architecture summary

Proceeding...
```

### Example 4: Ambiguous Scope (Clarification Needed)

**User**: "check for missing error handling"

**Detection**:
- No scope quantifiers ("all", "every", "entire")
- Could be single file or entire codebase

**Response**:
```
I can check for missing error handling. To choose the right approach:

**Scope unclear**:
1. Current file only? (I can do this directly)
2. Specific module/directory? (Please specify path)
3. Entire codebase? (I'll use RLM processing)

**If entire codebase, I recommend:**
/rlm-query "**/*.{js,ts}" "Identify functions missing try-catch or error handling"

Which scope did you have in mind?
```

## Integration Notes

- **Priority**: Medium (yields to agent-loop for explicit iteration requests)
- **Exclusivity**: Partial (suggest RLM, but user can override)
- **Confirmation**: Always confirm strategy before invoking RLM commands
- **Fallback**: If user rejects RLM, warn about context limits but proceed if insisted

## Model Selection Guidance

Per REF-089 Appendix B (GRADE: LOW, peer-review pending) — RLM relies on the root agent emitting code, so non-coding-capable models underperform.

When suggesting a strategy, also recommend the model:

| Sub-prompt complexity | Recommended sub-agent model |
|---|---|
| Simple extraction (count, list, yes/no) | `--model haiku` |
| Moderate analysis (summarize, classify, code review) | `--model sonnet` (default) |
| Complex reasoning (architectural review, multi-step inference) | `--model opus` |

The orchestrating agent (the one invoking `/rlm-query` or `/rlm-batch`) should itself be coding-capable — sonnet or opus, never haiku — because it must emit dispatch code, parse sub-agent results, and aggregate. Output token limits below 4k cap orchestrator effectiveness.

## Performance Heuristics

### File Count Estimation

**Quick heuristics** for estimating whether RLM is needed:

| Directory | Typical File Count | RLM Recommended? |
|-----------|-------------------|------------------|
| `src/` (small project) | 10-50 | Maybe (depends on size) |
| `src/` (medium project) | 50-200 | Yes |
| `src/` (large project) | 200+ | Definitely |
| `node_modules/` | 10,000+ | Always (if user really wants this) |
| `test/` | Usually ~50-100 | Probably |
| Single directory | <10 | No |
| Single directory | 10-30 | Maybe |
| Single directory | 30+ | Yes |

### Context Window Budgeting

**Rule of thumb**: If estimated total file size exceeds 50% of context window, use RLM.

**Estimates**:
- TypeScript file: ~200 lines avg = ~8,000 tokens
- Test file: ~100 lines avg = ~4,000 tokens
- Config file: ~50 lines avg = ~2,000 tokens

**Context windows**:
- Claude Opus 4.6: 200k tokens → Safe limit ~100k tokens → ~12 large TS files
- GPT-5.3-Codex: 128k tokens → Safe limit ~64k tokens → ~8 large TS files

## Related

- `/rlm-query` command — recursive information extraction (positional: context-source, sub-prompt)
- `/rlm-batch` command — parallel batch processing (positional: glob-pattern, operation; supports `--aggregate summarize` for hierarchical summary)
- `@$AIWG_ROOT/agentic/code/addons/rlm/schemas/rlm-config.yaml` - RLM configuration schema
- `@$AIWG_ROOT/agentic/code/addons/rlm/docs/rlm-architecture.md` - RLM system design
- `@.aiwg/research/findings/REF-087-recursive-decomposition.md` - Decomposition research

## Version History

- **1.1.0**: Aligned command examples with shipped positional command surface; replaced nonexistent `rlm-summarize` with `rlm-batch --aggregate summarize`; renamed `--parallel` to `--max-parallel`; generalized Strategy 3 example for monolith and monorepo layouts (Gitea #1191, #1193, #1194; tracks upstream PR #103)
- **1.0.0**: Initial implementation for RLM mode detection and routing

## References

- @$AIWG_ROOT/agentic/code/addons/rlm/README.md — RLM addon overview and architecture
- @$AIWG_ROOT/agentic/code/addons/rlm/schemas/rlm-config.yaml — RLM configuration schema
- @$AIWG_ROOT/agentic/code/addons/rlm/docs/rlm-architecture.md — RLM system design and decomposition strategy
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/subagent-scoping.md — Subagent scoping and context budget rules
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-budget.md — Context window budgeting for parallel subagents
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for rlm commands
