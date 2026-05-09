---
namespace: aiwg
name: rlm-query
platforms: [all]
description: Spawn sub-agent to process focused context and return structured result
commandHint:
  argumentHint: '"<context-file> <sub-prompt>" [--model <model>] [--output <file>] [--depth <n>] [--neighbors-of <id>] [--direction <in|out|both>] [--graph <name>] [--no-cache] [--cache-only]'
  allowedTools: 'Read, Write, Grep, Glob, Bash'
  model: sonnet
  category: rlm
---

# RLM Query

Spawn a focused sub-agent to process a specific portion of context and return a structured result. This is the command equivalent of RLM's `llm_query()` function.

## Core Philosophy

Sub-agents receive ONLY the specified context, not the full conversation history. This prevents context overload and improves output quality by enforcing focused, single-purpose queries.

## Usage

```
/rlm-query <context-file> <sub-prompt>
/rlm-query <glob-pattern> <sub-prompt> --output result.txt
/rlm-query file.ts "extract all function names" --model haiku
/rlm-query "src/**/*.test.js" "count total assertions" --depth 2
```

## Parameters

### context-file (required)
File path or glob pattern specifying the context source.

**Valid patterns**:
- Single file: `src/auth/login.ts`
- Glob pattern: `src/**/*.test.ts`
- Multiple files: `src/auth/*.ts`

**Context loading**:
- Files matching pattern are read and provided to sub-agent
- If pattern matches multiple files, all are included
- Large file sets (>10 files) should be avoided (use filtering)

### sub-prompt (required)
The specific task for the sub-agent. Should be:
- Focused and specific (single responsibility)
- Clear output format expectation
- Self-contained (no references to parent conversation)

**Good sub-prompts**:
- "Extract all exported function names as JSON array"
- "Identify security issues and list in bullet format"
- "Count total test assertions and return as integer"
- "Summarize this function's purpose in one sentence"

**Poor sub-prompts** (avoid):
- "Analyze this" (too vague)
- "Look at this and tell me what you think" (no format)
- "Check if this relates to the earlier discussion" (references parent context)

### --model <model> (optional)
Override the default model for the sub-agent.

**Available models**:
- `opus` - Highest capability (expensive, for complex analysis)
- `sonnet` - Balanced (default for most queries)
- `haiku` - Fast and cheap (for simple extraction)

**Model selection guidance** (per REF-089 Appendix B; GRADE: LOW, peer-review pending):
- Use `haiku` for: counting, extracting simple patterns, yes/no questions
- Use `sonnet` for: summarization, moderate analysis, code review
- Use `opus` for: complex reasoning, architectural decisions, multi-step analysis

**RLM root vs sub-agent**: When `rlm-query` itself dispatches sub-calls (recursion via `--depth >1`), the *root* agent should be coding-capable (sonnet or opus). Per REF-089, "Qwen3-8B (non-coder) struggled without sufficient coding capabilities." Sub-agents performing simple extraction can safely be `haiku`; sub-agents performing analysis or synthesis should be `sonnet` or higher.

**Output token limits**: RLM root agents emit code, which can be verbose. Models with output token limits below 4k will underperform. Surface a warning when the configured model has lower limits.

### --output <file> (optional)
Save the sub-agent's response to a file instead of returning inline.

**Use cases**:
- Intermediate results in multi-stage workflows
- Large outputs that would clutter conversation
- Results that need to persist for later reference

**Behavior**:
- File is created/overwritten with sub-agent response
- Command returns path to file instead of full content
- File can be used as input to subsequent `rlm-query` calls

### --neighbors-of <id> (optional, requires aiwg index)

Resolve the context source from the artifact index's dependency graph instead of from a glob pattern. Pass an artifact ID (path or REF-XXX identifier) — the skill resolves its neighbors and dispatches the sub-prompt over them.

**Requires**: `aiwg index` capability available (built and reachable). When the index is unavailable, the skill errors with a remediation pointer.

**Resolution**:

```bash
# At depth=1 (default), maps directly to the index CLI:
aiwg index neighbors --graph <graph> --node <id> --direction <dir> --json

# At depth >1, the skill expands recursively by calling neighbors on each
# result up to <N> hops, deduplicating along the way.
```

### --direction <in|out|both> (optional, with --neighbors-of)

Restrict which side of the dependency graph to traverse. Defaults to `both`. Aligns with the `aiwg index neighbors` CLI direction flag.

- `in` — upstream (artifacts that depend on the node)
- `out` — downstream (artifacts the node depends on)
- `both` — both directions (default)

### --graph <name> (optional, with --neighbors-of)

Which dependency graph to query. Defaults to `project`. Valid values match the `aiwg index neighbors --graph` flag (e.g., `framework`, `project`, `codebase`, or a user-defined graph name).

### --no-cache (optional, #1203)

Bypass the result cache: do not read existing cache entries, but still write the result for future calls. Use to force a re-run when you suspect external state has changed in a way the cache key would not capture.

### --cache-only (optional, #1203)

Read-only audit: error out if the call would not be a cache hit. Useful to verify reproducibility before committing or to gauge what re-running would cost.

### --depth <n> (optional)

When `--neighbors-of` is set, controls graph traversal depth (default: `1`). Otherwise tracks current recursion depth (internal use).

**Purpose**:
- Prevents infinite recursion if sub-agent spawns sub-queries
- Logs depth for debugging complex query chains
- Default: 0 (top-level query)

**Recursion limit**: Maximum depth of 3 levels
- Depth 0: Parent agent
- Depth 1: First sub-agent
- Depth 2: Sub-agent's sub-agent
- Depth 3: Maximum (further nesting blocked)

## Planned Capabilities

These flags are reserved in the design but not yet implemented. Tracked in Gitea #1201.

- `--save-trajectory <path>` — Persist a structured trajectory of the dispatch + sub-agent result suitable for offline analysis or future fine-tuning. Format: JSON Lines with one entry per call. REF-089 (p. 5) reports a 28.3% performance improvement from 1,000 trajectory samples for fine-tuning RLM-specialized models. When implemented, this flag will be added to `argumentHint` and become enforceable by the canonical command surface contract test.

## Execution Flow

### Phase 1: Context Loading

**Argument resolution** — pick the context-source axis from the parsed flags:

1. **If `--neighbors-of <id>` is present** (graph-bounded; #1206):
   - Verify `aiwg index` is available. Run `aiwg index stats --json` once; on failure, error with "neighbors-of requires aiwg index — run `aiwg index build` first".
   - Resolve direct neighbors:
     ```bash
     aiwg index neighbors --graph "${graph:-project}" \
       --node "<id>" \
       --direction "${direction:-both}" \
       --json
     ```
   - If `--depth N` (N > 1): expand iteratively. For each new neighbor, run the same `aiwg index neighbors` call; deduplicate by node id; stop after N hops or when the frontier is empty.
   - Map the resolved node IDs to file paths via `aiwg index query --id <id> --json` (or use the `path` field returned by `neighbors` directly when present).
   - Treat the deduplicated path list as the context source. Skip the glob/path branch below.
   - On empty result set, error with the offending node id and a suggestion to verify it exists via `aiwg index query "<id>"`.

2. **Else if a glob pattern or single path is supplied**:
   - Resolve the glob with `find` / `glob` semantics
   - Use the matched file list as the context source

3. **Read** all resolved files into memory.
4. **Cache lookup** (#1203, unless `--no-cache`):
   - Compute content hash for each resolved file (or pull from `aiwg index query --id <id> --json`)
   - Compose `CacheKey = { inputs[], query, subPrompt, model, aggregateStrategy }` and call `computeHash(key)` (`src/rlm/cache/hash.ts`)
   - If `aiwg rlm-cache` reports a hit (`get(root, hash)` succeeds): return the cached `result.json` immediately and log `cache_hit=true` in the cost report. Skip dispatch.
   - If miss and `--cache-only`: error with the hash and exit non-zero.
   - Otherwise: continue to Phase 2 dispatch. After dispatch, write `{result, manifest, metadata}` via `put(root, entry)`.
5. **Validate** total context size (<50% of model window).
6. If too large, error and suggest filtering (`--neighbors-of` with smaller `--depth`, narrower glob, or `--use-index` with stricter query).

**Communication**:
```
Context source: {neighbors-of <id> @ depth N | pattern}
Matched files:  {count}
Total size:     {size} tokens
Spawning sub-agent with {model}...
```

### Phase 2: Sub-Agent Invocation

1. Create isolated sub-agent instance
2. Provide ONLY the specified context (no parent conversation)
3. Execute sub-prompt
4. Capture response
5. Validate response format (if expected format specified)

**Sub-agent receives**:
```
Context:
{file contents}

Task:
{sub-prompt}

Instructions:
- Focus only on the provided context
- Output in the requested format
- Do not reference external information
- Be concise and specific
```

### Phase 3: Result Processing

**If --output specified**:
1. Write sub-agent response to file
2. Return file path

**Otherwise**:
1. Return sub-agent response inline
2. Preserve formatting

**Communication**:
```
Sub-agent completed.
Model: {model}
Duration: {time}

Result:
{response}

OR

Result saved to: {output-file}
```

## Integration with rlm-batch

`/rlm-query` works seamlessly with `/rlm-batch` for parallel fan-out:

```
# Fan-out: Query multiple files in parallel
/rlm-batch "src/components/*.tsx" "/rlm-query {file} 'extract props interface'"

# Fan-in: Aggregate results
/rlm-query "results/*.json" "combine all JSON arrays into single array"
```

See `@$AIWG_ROOT/agentic/code/addons/rlm/commands/rlm-batch.md` for batch processing patterns.

## Error Handling

### Context Too Large

```
Error: Context exceeds safe limit

Pattern: src/**/*.ts
Matched files: 87
Total size: 120k tokens (60% of window)

Suggestion:
1. Use more specific glob: src/auth/**/*.ts
2. Split into multiple queries: /rlm-batch
3. Use haiku model (larger window)
```

### No Files Matched

```
Error: No files matched pattern

Pattern: src/**/*.test.ts
Matches: 0

Verify:
1. Pattern syntax is correct
2. Files exist at specified path
3. Working directory is correct
```

### Recursion Depth Exceeded

```
Error: Maximum recursion depth exceeded

Current depth: 3
Limit: 3

A sub-agent cannot spawn more sub-queries at this depth.
Consider restructuring query chain to be less nested.
```

### Sub-Agent Failure

```
Error: Sub-agent failed to complete query

Model: sonnet
Error: {error message}

Options:
1. Retry with different model: --model opus
2. Simplify sub-prompt
3. Reduce context size
```

## User Communication

**At start**:
```
RLM Query: Spawning sub-agent

Context: {pattern} ({count} files, {size} tokens)
Prompt: {sub-prompt}
Model: {model}
Depth: {depth}

Processing...
```

**On completion**:
```
─────────────────────────────────────────
RLM Query: Complete
─────────────────────────────────────────

Duration: {time}
Model: {model} ({tokens} tokens)

{response OR "Result saved to: {file}"}
```

**On error**:
```
─────────────────────────────────────────
RLM Query: Failed
─────────────────────────────────────────

Error: {error summary}
Context: {pattern}
Model: {model}

{Suggestions for resolution}
```

## Best Practices

### Context Scoping

**Good**:
```
# Focused single file
/rlm-query src/auth/login.ts "extract exported functions"

# Specific subset
/rlm-query "src/auth/*.ts" "list all interfaces"
```

**Bad**:
```
# Too broad (hundreds of files)
/rlm-query "src/**/*" "analyze everything"

# Unfocused multi-file
/rlm-query "**/*.{ts,js,tsx,jsx,json,md}" "find issues"
```

### Sub-Prompt Design

**Good**:
```
# Clear output format
"extract function names as JSON array"

# Specific task
"count total test cases and return integer"

# Bounded scope
"summarize function purpose in one sentence"
```

**Bad**:
```
# Vague
"look at this code"

# Multi-task
"analyze, refactor, and document this code"

# Unbounded
"tell me everything about this"
```

### Model Selection

| Query Type | Model | Rationale |
|------------|-------|-----------|
| Count items | haiku | Fast extraction |
| Extract pattern | haiku | Simple regex/parsing |
| Summarize | sonnet | Balanced quality/cost |
| Analyze complexity | sonnet | Moderate reasoning |
| Architectural review | opus | Complex reasoning |
| Security audit | opus | High-stakes analysis |

### Output Strategy

**Return inline** (default):
- Simple extractions (<500 words)
- JSON/structured data
- Single values (counts, booleans)

**Use --output**:
- Large responses (>1000 words)
- Intermediate results in workflows
- Results referenced by multiple later queries

## Examples

### Example 1: Simple Extraction (haiku)

**Task**: Extract all exported function names from an auth module.

```
/rlm-query src/auth/helpers.ts "extract all exported function names as JSON array" --model haiku
```

**Sub-agent receives**:
```
Context:
// src/auth/helpers.ts
export function validateEmail(email: string): boolean { ... }
export function hashPassword(pwd: string): string { ... }
function internalHelper() { ... }  // not exported

Task:
extract all exported function names as JSON array
```

**Sub-agent returns**:
```json
["validateEmail", "hashPassword"]
```

**Duration**: ~2 seconds

### Example 2: Moderate Analysis with Output (sonnet)

**Task**: Review test file for missing edge cases, save to intermediate file.

```
/rlm-query test/auth/login.test.ts "identify missing edge cases and list in bullet format" --output .aiwg/working/edge-cases.md
```

**Sub-agent receives**:
```
Context:
// test/auth/login.test.ts
describe('login', () => {
  it('should accept valid credentials', () => { ... });
  it('should reject invalid password', () => { ... });
});

Task:
identify missing edge cases and list in bullet format
```

**Sub-agent returns** (saved to `.aiwg/working/edge-cases.md`):
```
Missing edge cases:
- Null/empty username input
- Null/empty password input
- Account lockout after N failed attempts
- Session expiration handling
- Concurrent login from multiple devices
```

**Command returns**:
```
Result saved to: .aiwg/working/edge-cases.md
```

**Duration**: ~8 seconds

### Example 3: Complex Nested Query (opus, depth tracking)

**Task**: Multi-level analysis where sub-agent spawns its own sub-query.

```
# Top-level query (depth 0)
/rlm-query src/api/ "for each endpoint file, extract security checks" --depth 0
```

**Sub-agent at depth 1 decides to spawn sub-query**:
```
# Sub-agent internally runs (depth 1):
/rlm-query src/api/auth.ts "extract middleware chain" --depth 1
```

**Sub-sub-agent at depth 2 processes single file**:
```
# Depth 2: Simple extraction
Context: src/api/auth.ts
Result: ["authenticate", "rateLimit", "validateInput"]
```

**Depth 1 sub-agent aggregates**:
```
Endpoint: /api/auth
Security checks: authenticate, rateLimit, validateInput
```

**Parent receives**:
```
Security Analysis:
- /api/auth: authenticate, rateLimit, validateInput
- /api/users: authenticate, authorize
- /api/admin: authenticate, authorize, auditLog
```

**Duration**: ~30 seconds (depth 0→1→2, sequential)

**Note**: This is acceptable because depth stays within limit (≤3). If depth 2 tried to spawn another query, it would be blocked.

## Success Criteria

This command succeeds when:
- [ ] Context loaded from specified files
- [ ] Sub-agent spawned with isolated context
- [ ] Sub-prompt executed successfully
- [ ] Result returned or saved to file
- [ ] Depth tracking prevents excessive recursion
- [ ] User informed of outcome

## References

- @$AIWG_ROOT/agentic/code/addons/rlm/commands/rlm-batch.md - Batch parallel queries
- @$AIWG_ROOT/agentic/code/addons/rlm/docs/rlm-patterns.md - RLM design patterns
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/subagent-scoping.md - Subagent scoping rules (context minimization)
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/instruction-comprehension.md - Instruction following for sub-prompts
