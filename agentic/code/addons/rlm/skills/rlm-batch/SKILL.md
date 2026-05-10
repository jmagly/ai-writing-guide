---
namespace: aiwg
name: rlm-batch
platforms: [all]
description: Parallel fan-out processing - spawn multiple sub-agents for chunked context processing
commandHint:
  argumentHint: '"<glob-pattern> <sub-prompt>" [--model <model>] [--output-dir <dir>] [--aggregate <strategy>] [--max-parallel <n>] [--force] [--neighbors-of <id>] [--direction <in|out|both>] [--graph <name>] [--depth <n>] [--no-cache] [--cache-only] [--require-citations]'
  allowedTools: 'Task, Read, Write, Bash, Glob, Grep, TodoWrite, Edit'
  model: opus
  category: automation
  orchestration: true
---

# RLM Batch Processing

**You are the RLM Batch Orchestrator** - executing parallel fan-out processing where multiple sub-agents work on separate chunks of context simultaneously.

## Core Philosophy

"Divide and conquer at scale" - when a task requires processing many similar items (files, modules, documents), spawn parallel sub-agents rather than sequentially processing in a single context window.

## Your Role

You manage parallel batch execution:

1. **Parse** glob pattern and sub-prompt
2. **Match** files against pattern
3. **Estimate** cost and prompt for confirmation
4. **Spawn** sub-agents in parallel (respecting max-parallel limit)
5. **Collect** results from all sub-agents
6. **Aggregate** results according to strategy
7. **Report** final aggregated output

## Natural Language Triggers

Users may say:
- "batch process all files in src/ with: [sub-prompt]"
- "run [sub-prompt] on every file in [pattern]"
- "parallel process [pattern] to [sub-prompt]"
- "fan out [sub-prompt] across [pattern]"
- "rlm batch [pattern] [prompt]"

## Parameters

### Glob Pattern (required)
The file selection pattern. Uses standard glob syntax.

**Examples**:
- `src/**/*.ts` - All TypeScript files in src/
- `test/unit/**/*.test.js` - All unit tests
- `.aiwg/requirements/**/*.md` - All requirement docs
- `**/*.{js,ts}` - All JS and TS files recursively

### Sub-Prompt (required)
The prompt applied to each matched file independently.

**Best practices**:
- Keep prompts focused and single-purpose
- Reference the file with `{file}` placeholder
- Specify exact output format
- Make output deterministic (no random creativity)

**Good examples**:
- `"Extract all exported function names from {file}"`
- `"Count TODO comments in {file} and return as JSON: {count: N}"`
- `"Check if {file} has JSDoc comments for all exports. Return: yes/no"`

**Poor examples** (avoid these):
- `"Analyze {file}"` (too vague)
- `"Improve {file}"` (subjective, non-deterministic)
- `"Write a comprehensive report about {file}"` (unbounded output)

### --model (default: sonnet)
Which model to use for sub-agents.

**Options**:
- `opus` - Most capable, highest cost (use for complex analysis)
- `sonnet` - Balanced performance and cost (default)
- `haiku` - Fast and cheap (use for simple extraction tasks)

**Cost considerations**:
```
haiku:  ~$0.25 per 1M input tokens
sonnet: ~$3.00 per 1M input tokens
opus:   ~$15.00 per 1M input tokens
```

For 100 files @ 1k tokens each:
- haiku: ~$0.025
- sonnet: ~$0.30
- opus: ~$1.50

### --output-dir (default: .aiwg/rlm/batch-{timestamp}/)
Where to save individual sub-agent results.

Each sub-agent creates a file named after its input file:
```
.aiwg/rlm/batch-2026-02-09-1030/
├── src-auth-login.ts.result.md
├── src-auth-logout.ts.result.md
├── src-auth-refresh.ts.result.md
└── aggregate.md
```

### --aggregate (default: concat)
How to combine sub-agent results.

**Quick disambiguation** — pick by output shape:

| Sub-agent output shape | Use strategy |
|---|---|
| Independent prose findings, one per file | `concat` |
| Lists or key-value pairs likely to overlap across sub-agents | `merge` |
| Verbose findings that need executive synthesis | `summarize` |
| Findings that should be filtered to a subset (e.g., "files missing X") | `filter` (when implemented; today use `concat` + post-filter) |

**Choose deliberately** — `concat` is the default but is appropriate ONLY when sub-agent outputs are truly independent. Per Rule 6 of `rlm-context-management`, silent concatenation is the "bag of agents" anti-pattern. If sub-agents could disagree, contradict, or duplicate, use `merge` or `summarize` so the conflicts get reconciled.

**Strategies**:

#### concat (default)
Concatenate all results in order.

**Use when**: Results are independent and order matters (e.g., list of findings, one finding per file with no cross-cutting concerns).

**Output format**:
```markdown
# Batch Results

## File: src/auth/login.ts
{result from sub-agent 1}

## File: src/auth/logout.ts
{result from sub-agent 2}

...
```

#### merge
Deduplicate and merge structured results.

**Use when**: Results contain lists or key-value data with potential duplicates.

**Output format**:
```markdown
# Merged Results

Unique items across all sub-agents:
- {item1}
- {item2}
- {item3}

(Duplicates removed, sorted alphabetically)
```

**Requirements**:
- Sub-prompt MUST produce structured output (JSON, YAML, or Markdown lists)
- Deduplication based on exact string match

#### summarize
Use a final summarization agent to condense all results.

**Use when**: Individual results are verbose and need high-level synthesis.

**Process**:
1. Collect all sub-agent results
2. Spawn summarization agent with prompt:
   ```
   Summarize the following batch processing results into a concise report:

   {all results}

   Focus on:
   - Key patterns across files
   - Common issues or findings
   - Quantitative summary (counts, percentages)
   - Actionable recommendations
   ```
3. Return summarized report

**Cost note**: Adds one additional LLM call with full context of all results.

### --max-parallel (default: 4)
Maximum number of sub-agents running concurrently.

**Guidelines** (aligned with Rule 8 of `rlm-context-management`):

- Default: 4 — mid-sweet-spot per REF-088 (GRADE: VERY LOW), n*(n-1)/2 = 6 communication paths, fits all `AIWG_CONTEXT_WINDOW` tiers ≥65k
- Recommended range: 3-5 for most tasks, 5-7 for complex tasks
- **Hard cap: 7** — values >7 are auto-batched into sequential waves of ≤7. Per REF-086 (GRADE: LOW), independent multi-agent error amplification grows nonlinearly past the small-team coordination range
- **Context-budget interaction**: when `AIWG_CONTEXT_WINDOW` is set, the smaller of the budget cap and the 7-agent hard cap applies. See `@$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-budget.md`

**Rate limits**:
- Claude API: 50 requests/minute
- OpenAI API: 60 requests/minute

**System resource limits**:
- Each sub-agent uses ~100MB RAM
- 7 parallel = ~700MB RAM usage
- Adjust based on available system memory

**Migration note**: Earlier versions defaulted to 10 with guidance to scale to 20-50. The lower default and hard cap are research-grounded (REF-086 LOW, REF-088 VERY LOW); for batches that genuinely need >7 parallel sub-agents, the runtime auto-batches into waves rather than rejecting the request.

## Model Selection

**Research basis**: REF-089 Appendix B (GRADE: LOW, peer-review pending) — "Qwen3-8B (non-coder) struggled without sufficient coding capabilities" and "Qwen3-235B-A22B showed smaller gains due to running out of output tokens."

| Role | Recommended | Avoid | Reason |
|---|---|---|---|
| Orchestrator (this skill) | `opus` | haiku | Emits dispatch code, parses sub-agent results, performs aggregation reasoning |
| Sub-agent — simple extraction | `haiku` | — | "Count TODOs", "list exports", yes/no checks; cheap and fast |
| Sub-agent — analysis/synthesis | `sonnet` | haiku | "Identify security issues", "summarize approach"; haiku underperforms |
| Sub-agent — complex reasoning | `opus` | — | Multi-step analysis, code generation, architectural review |

**Output token limits matter**: RLM root agents emit code (regex, glob, dispatch logic) which can be verbose. Models with restrictive output limits (<4k tokens) cap RLM effectiveness. The orchestrator should warn when the configured model's output limit is below 4k.

**Synchronous-call tradeoff**: Each sub-agent call is synchronous from the orchestrator's perspective. Parallel fan-out via `--max-parallel` is the only practical way to keep wall-clock time bounded for large batches.

### --neighbors-of <id> (optional, requires aiwg index)

Resolve the input file set from the artifact index's dependency graph instead of from a glob pattern. Pass an artifact ID (path or REF-XXX identifier); the skill resolves its neighbors and dispatches the sub-prompt over them.

**Requires**: `aiwg index` capability available (built and reachable). If unavailable, error with remediation pointer.

**Resolution**:

```bash
# Depth 1 (default) maps directly to the index CLI:
aiwg index neighbors --graph <graph> --node <id> --direction <dir> --json

# Depth >1 expands recursively, deduplicating along the way.
```

**Example**:

```
/rlm-batch --neighbors-of "src/auth/sessionManager.ts" --depth 1 \
  "list every test that exercises this module"
```

This is the graph-bounded context-source axis described in @.aiwg/architecture/adr-rlm-index-integration.md (#1206), distinct from glob-bounded (default) and pattern-bounded (`--use-index`, #1200).

### --direction <in|out|both> (with --neighbors-of)

`in` = upstream deps, `out` = downstream deps, `both` = both directions (default). Aligns with `aiwg index neighbors --direction`.

### --graph <name> (with --neighbors-of)

Which dependency graph to query. Defaults to `project`. Aligns with `aiwg index neighbors --graph`.

### --depth <n> (with --neighbors-of, default: 1)

Graph traversal depth. Single-hop by default; multi-hop expansion is implemented via repeated index calls with deduplication.

### --no-cache (optional, #1203)

Bypass the result cache for this batch — do not read existing cache entries, but still write per-input results for future calls.

### --cache-only (optional, #1203)

Read-only audit: error out if any input would not be a cache hit. Useful to verify the batch is fully cached before committing or to gauge re-run cost.

### --require-citations (optional, #1223)

Opt in to the index-backed citation contract. When set:

- Each sub-agent's system prompt is augmented with the citation-emission instructions from the [Citation Format](#citation-format) section below
- Sub-agents are required to attach a citation tuple to every finding that references source content
- Aggregation strategies preserve citations through merge (see [Citation Format → Aggregation Behavior](#aggregation-behavior))
- The aggregate output can be validated downstream with `aiwg verify-citations --rlm` (see #1225)

Default: **off**. Existing callers that don't pass this flag see no behavior change — sub-agent prompts are unmodified and aggregation passes content through verbatim.

When **off**, sub-agents may still emit citations on their own initiative, but it isn't enforced and downstream verification is best-effort.

## Citation Format

When `--require-citations` is set, sub-agents emit findings tagged with a citation tuple that links each claim back to a specific artifact + content version. The aggregate output remains traceable: a downstream reader (or `aiwg verify-citations --rlm`) can verify every claim against the index.

### Tuple shape

```
{
  "artifact_id": "<project-relative-path>",
  "content_hash": "<sha256, 16 hex chars>",
  "lines": "L<start>-<end>"   // optional; omit for whole-file citation
}
```

- **`artifact_id`** — project-relative path. Matches the existing index `artifactId` convention (see `src/artifacts/types.ts`, `src/artifacts/audit/types.ts`).
- **`content_hash`** — sha256 of the file content, truncated to the first 16 hex chars. Matches the existing index hash convention at `src/artifacts/index-builder.ts:243` (`createHash('sha256').update(content).digest('hex').slice(0, 16)`).
- **`lines`** — optional `"L42-58"` for a range or `"L42"` for a single line. Omit for whole-file citations.

### Inline rendered form

When emitting markdown, sub-agents render citations inline next to the claim:

```markdown
- **Plaintext password comparison in login flow** [src/auth/login.ts@a8f9c2d4e5f60718, L42-58]
- **Token expiry hardcoded to 24h** [src/auth/sessionManager.ts@b3d1e9c2f48a5b6c, L101]
```

The bracket format is `[<artifact_id>@<content_hash>, <lines>]`. The hash is shown in full (16 hex chars) so it's grep-able and stable across renders.

### Path-only fallback

When the cited source is *not* present in the artifact index — e.g., the user passed a glob outside `aiwg index` coverage — sub-agents emit a path-only citation:

```markdown
- **Hardcoded credential** [src/legacy/auth.py, L88]
```

`aiwg verify-citations --rlm` flags these as `un-versioned` (warning, not error). With `--strict` they become errors.

### Aggregation behavior

The `--aggregate` strategy controls how citations propagate through the merge:

| Strategy | Citation behavior |
|---|---|
| `concat` | Pass through verbatim. Each sub-agent's findings + citations land in a per-file section. (Tracked in #1224.) |
| `merge` | Union across overlapping findings; deduplicate by tuple identity `(artifact_id, content_hash, lines)`. Same finding from two sub-agents becomes one entry with both citations attached. (Tracked in #1224.) |
| `summarize` | Synthesized prose at top, followed by a `## Sources` footer that lists every input citation. The summarizer agent is told NOT to drop citations during synthesis. (Tracked in #1224.) |

When `--require-citations` is **off**, aggregation runs unchanged — no special citation handling.

### Sub-agent prompt augmentation

When the flag is set, the orchestrator prepends the following instruction block to each sub-agent's system prompt (after the user's sub-prompt, before the file content):

```
CITATION REQUIREMENT (--require-citations is active):

Every finding you emit MUST carry a citation tuple linking it back to specific
content in the source file. Use the inline bracket form for markdown output:

  [<file-path>@<content-hash>, L<start>-<end>]

Example:
  - **SQL injection risk** [src/db/query.ts@<hash>, L42-58]

The orchestrator will provide the file's content_hash. Use it verbatim. If the
file isn't index-tracked, the orchestrator will signal "path-only" — emit:

  [<file-path>, L<start>-<end>]

Findings without citations may be rejected or flagged downstream.
```

The orchestrator computes `content_hash` once per input file (via the same sha256-truncated-16 routine the index uses) and substitutes it into the per-file prompt. Path-only fallback is signaled when the file is outside the index's known artifact set.

### Schema reference

A machine-readable JSON schema for the citation tuple is at `agentic/code/addons/rlm/schemas/citation-tuple.json` (#1223). Downstream tooling (verify-citations, aggregation strategies, materialized views in #1207) validates against it.

### Why this matters

- Closes the "trust me" gap in current RLM aggregations — every claim points at a verifiable artifact + version
- Re-running the same query later, downstream tools detect which findings became stale (file content changed) vs. fresh
- Maps directly to AIWG's existing citation policy (`agentic/code/frameworks/sdlc-complete/rules/citation-policy.md`) — never fabricate, always trace
- Makes RLM outputs suitable as evidence in security audits, code reviews, and traceability work

## Planned Capabilities

These flags are reserved in the design but not yet implemented. Tracked in Gitea #1201.

- `--save-trajectory <path>` — Persist a structured trajectory of dispatch + sub-agent results suitable for offline analysis or future fine-tuning. Format: JSON Lines with one entry per sub-agent call, including prompt, response, model, tokens, duration, and success flag. REF-089 (p. 5) reports a 28.3% performance improvement from 1,000 trajectory samples for fine-tuning RLM-specialized models.

When implemented, this flag will be added to `argumentHint` and become enforceable by the canonical command surface contract test.

## Execution Flow

### Phase 1: Initialization

1. Parse arguments (sub-prompt plus context-source flags)
2. **Resolve the input file list** by picking exactly one context-source axis:

   **a) `--neighbors-of <id>` — graph-bounded (#1206)**

   ```bash
   # Verify the index is available
   aiwg index stats --json >/dev/null \
     || die "neighbors-of requires aiwg index — run 'aiwg index build' first"

   # Direct neighbors at depth 1
   aiwg index neighbors \
     --graph "${graph:-project}" \
     --node "<id>" \
     --direction "${direction:-both}" \
     --json
   ```

   For `--depth N` where N > 1: iterate the same call over each new neighbor, deduplicating by node id, stopping after N hops or when the frontier is empty. Map node ids to file paths via the `path` field on each neighbor record (or `aiwg index query --id <id> --json` if missing). On empty result, error with the offending node id.

   **b) Glob pattern (default)**

   ```bash
   find . -path "{pattern}" -type f
   ```

   **c) `--use-index` query** — see #1200 documentation.

   Skip branches not selected. Continue with the resolved file list.

3. Count matched files
4. **Cache pre-pass** (#1203, unless `--no-cache`):
   - For each resolved input, compose `CacheKey = { inputs:[{artifactId, contentHash}], query, subPrompt, model, aggregateStrategy }` and call `computeHash(key)` (`src/rlm/cache/hash.ts`).
   - Partition the file list into hits and misses by querying `has(root, hash)` from `src/rlm/cache/store.ts`.
   - If `--cache-only` and any miss exists: error with the missing hash list and exit non-zero.
   - Skip dispatch for hits — load results directly from cache.
   - Continue dispatch only for misses; write fresh results back via `put(root, entry)` after each sub-agent completes.
   - Cost report includes `cache_hit_count`, `cache_miss_count`, and `tokens_saved`.
5. Estimate cost:
   ```
   Estimated tokens per file: {avg_file_size}
   Total files: {count}
   Model: {model}

   Estimated cost: ${cost}
   Input tokens: {count * avg_size}
   Output tokens: {estimated based on prompt}
   ```
6. Prompt for confirmation (if cost > $1.00)
7. Create output directory
8. Log batch initialization

**Communicate**:
```
RLM Batch Initialized
Pattern: {pattern}
Files matched: {count}
Sub-prompt: {prompt}
Model: {model}
Max parallel: {max}
Aggregate: {strategy}

Estimated cost: ${cost}

Proceed? (y/n)
```

### Phase 2: Spawn Sub-Agents

1. Initialize work queue with all matched files
2. Spawn initial batch of sub-agents (up to max-parallel):
   ```
   For each file in work queue (limit: max-parallel):
     - Create sub-agent with:
       - System prompt: "You are processing {file}. Apply this prompt: {sub-prompt}"
       - Context: File contents
       - Output file: {output-dir}/{sanitized-filename}.result.md
     - Track sub-agent in active set
   ```
3. As sub-agents complete:
   - Remove from active set
   - Add to completed set
   - If work queue not empty, spawn next sub-agent
4. Continue until all files processed

**Progress tracking**:
```
─────────────────────────────────────────
Batch Processing: {completed}/{total}
─────────────────────────────────────────

Active ({active_count}/{max_parallel}):
  - src/auth/login.ts (processing...)
  - src/auth/logout.ts (processing...)

Completed: {completed_count}
Remaining: {remaining_count}

Estimated time remaining: {estimate}
```

### Phase 3: Collect Results

1. Wait for all sub-agents to complete
2. Check for errors:
   - If any sub-agent failed, log error and continue
   - Failed files are noted in final report
3. Collect all result files from output directory
4. Validate results:
   - Check each result file exists and is non-empty
   - Flag any anomalies (empty results, errors, truncated output)

### Phase 4: Aggregate Results

Apply aggregation strategy. When `--require-citations` is active, every strategy below MUST preserve sub-agent citation tuples through the merge — see [Citation Format → Aggregation Behavior](#aggregation-behavior) for the per-strategy contract. Implementation specifics for each strategy follow.

**Citation parsing** (used by `merge` and `summarize`): extract inline citations from each sub-agent result by matching the bracket pattern from the [Citation Format](#citation-format) section. The same regex documented in `agentic/code/addons/rlm/schemas/citation-tuple.json` (`x-inline-form.pattern`) applies. Path-only fallback citations (no `@hash`) are recognized and preserved as `un-versioned`.

#### For concat strategy:
```bash
# Concatenate all results with file headers.
# Citations: pass through verbatim. No parsing, no dedup. Each sub-agent's
# section retains its citations exactly as emitted (#1224).
cat > aggregate.md <<EOF
# Batch Processing Results

Pattern: {pattern}
Files processed: {count}
Timestamp: {timestamp}

---

EOF

for result in results/*.result.md; do
  file=$(basename "$result" .result.md)
  echo "## File: $file" >> aggregate.md
  echo "" >> aggregate.md
  cat "$result" >> aggregate.md
  echo "" >> aggregate.md
  echo "---" >> aggregate.md
  echo "" >> aggregate.md
done
```

`concat` is appropriate when sub-agent outputs are independent — citations from different files don't need reconciliation. Pure pass-through preserves traceability with zero merge logic.

#### For merge strategy:

When `--require-citations` is active:

1. Parse each result file for findings + their inline citations
2. For each finding, extract its citation tuples (`{artifact_id, content_hash, lines}`)
3. Deduplicate findings by content equality
4. **Citation deduplication**: when two sub-agents produce the same finding from different sources, attach all distinct citation tuples to the merged finding. Tuple identity is `(artifact_id, content_hash, lines)` — exact triple match means same citation. Different `lines` ranges from the same `(artifact_id, content_hash)` are kept distinct (different evidence locations).
5. Render the merged finding with all attached citations inline (space-separated bracket forms)

When `--require-citations` is **off**: legacy behavior — parse as structured data, extract unique items, sort, dedupe.

Example merged finding:

```markdown
- **SQL injection in user lookup** [src/db/userQuery.ts@a8f9c2d4e5f60718, L42-50] [src/admin/userLookup.ts@c4d2e1a98f7b6c5a, L88-94]
```

#### For summarize strategy:

When `--require-citations` is active:

1. Collect all sub-agent results AND extract every citation tuple from them (including path-only)
2. Spawn summarization agent with the full context AND an explicit instruction:
   ```
   You MUST NOT drop or omit citations during summarization. The synthesized
   prose may rephrase findings, but every claim that was citation-backed in
   the input MUST remain citation-backed in the output. If you cannot retain
   a specific citation, omit the underlying claim rather than the citation.
   ```
3. Append a `## Sources` footer to the summary listing every input citation, deduplicated by tuple identity. This is a complete record — even if the summarizer dropped a claim, its citation appears here, so nothing is silently lost.
4. Save synthesized prose + Sources footer as `aggregate.md`

When `--require-citations` is **off**: legacy behavior — concatenate all results, summarize, save.

Example summarized output:

```markdown
# Summary: Auth Module Security Findings

The auth module contains three high-severity issues clustered around
session handling. Token expiry is hardcoded across multiple call sites
[src/auth/sessionManager.ts@b3d1e9c2f48a5b6c, L101], and password
comparison uses a non-constant-time check [src/auth/login.ts@a8f9c2d4e5f60718, L42-58].

...

## Sources

- src/auth/login.ts@a8f9c2d4e5f60718 (L42-58)
- src/auth/sessionManager.ts@b3d1e9c2f48a5b6c (L101)
- src/auth/refreshToken.ts@d5e4f6a18b29c7d3 (L15-30)
- src/legacy/auth.py (L88) [un-versioned]
```

The footer is mechanical — it's the union of all input citations regardless of which made it into the synthesized prose. Downstream `aiwg verify-citations --rlm` checks both the inline citations in the prose AND the Sources footer.

### Phase 5: Completion Report

Generate final report:

```markdown
# RLM Batch Completion Report

**Pattern**: {glob pattern}
**Sub-Prompt**: {prompt}
**Status**: {SUCCESS | PARTIAL | FAILED}
**Files Processed**: {count}
**Duration**: {time}
**Model**: {model}
**Aggregate Strategy**: {strategy}

## Summary

{High-level summary of what was accomplished}

## Statistics

- Total files matched: {total}
- Successfully processed: {success_count}
- Failed: {failed_count}
- Total tokens used: {total_tokens}
- Total cost: ${total_cost}

## Failed Files

{List any files that failed processing with error reasons}

## Output Location

Results: {output-dir}/
Aggregate: {output-dir}/aggregate.md

## Next Steps

{Suggested follow-up actions based on results}
```

Save to: `.aiwg/rlm/batch-{timestamp}-report.md`

## Error Handling

### No Files Matched

```
RLM Batch: No files matched pattern

Pattern: {pattern}

Please check:
1. Pattern syntax is correct
2. Files exist in expected location
3. Working directory is correct

Examples:
  - src/**/*.ts (all TypeScript files)
  - test/**/*.test.js (all test files)
  - **/*.{js,ts} (all JS and TS files)
```

### Sub-Agent Failure

```
Sub-agent failed processing {file}

Error: {error message}

This file will be skipped. Batch will continue with remaining files.

Failed files are noted in the completion report.
```

### Rate Limit Exceeded

```
Rate limit exceeded. Pausing batch processing...

Completed: {completed}/{total}
Waiting 60 seconds before resuming...
```

### Out of Memory

```
System memory limit reached. Reducing parallelism...

Original max-parallel: {max}
Adjusted max-parallel: {new_max}

Continuing with reduced parallelism...
```

### Cost Limit Exceeded

```
Estimated cost (${estimate}) exceeds safety threshold (${limit})

Options:
1. Proceed anyway: /rlm-batch {args} --force
2. Reduce scope: Use more specific glob pattern
3. Use cheaper model: --model haiku
4. Cancel: Ctrl+C
```

## User Communication

**At start**:
```
Starting RLM Batch Processing

Pattern: {pattern}
Files: {count}
Sub-prompt: {prompt}
Model: {model}
Max parallel: {max}
Aggregate: {strategy}

Estimated cost: ${cost}
Estimated time: {time}

Beginning processing...
```

**During processing**:
```
─────────────────────────────────────────
Batch Progress: {completed}/{total}
─────────────────────────────────────────

Completed: {list of recently completed files}
Active: {count} sub-agents running
Remaining: {count} files in queue

ETA: {time}
```

**On completion**:
```
═══════════════════════════════════════════
RLM Batch: SUCCESS
═══════════════════════════════════════════

Pattern: {pattern}
Files processed: {count}
Duration: {time}
Total cost: ${cost}

Results: {output-dir}/aggregate.md
Report: .aiwg/rlm/batch-{timestamp}-report.md

Summary:
{High-level summary of findings}
═══════════════════════════════════════════
```

## Success Criteria for This Command

This orchestration succeeds when:
- [ ] All matched files processed (or failures documented)
- [ ] Results saved to output directory
- [ ] Results aggregated according to strategy
- [ ] Completion report generated
- [ ] User informed of outcome and cost

## Examples

### Example 1: Simple Extraction (Haiku)

**Task**: Extract all exported function names from TypeScript files

```bash
/rlm-batch "src/**/*.ts" "List all exported function names in {file}. Return as JSON: {\"functions\": [\"name1\", \"name2\"]}" --model haiku --aggregate merge
```

**Expected behavior**:
- Matches all .ts files in src/
- Uses haiku for speed and low cost
- Each sub-agent extracts function names from one file
- Merge strategy deduplicates function names across all files
- Final output: Combined list of unique function names

**Cost estimate**: ~$0.025 for 100 files

**Output**:
```markdown
# Merged Results

Unique exported functions across all files:
- authenticateUser
- calculateTotal
- fetchData
- formatDate
- generateToken
- hashPassword
- parseInput
- validateEmail
- validatePassword

(62 total functions, 9 unique after deduplication)
```

### Example 2: Moderate Complexity (Sonnet)

**Task**: Analyze each module for potential security issues

```bash
/rlm-batch "src/**/*.ts" "Analyze {file} for these security concerns: 1) SQL injection risks 2) XSS vulnerabilities 3) Authentication bypass 4) Sensitive data exposure. Return findings as Markdown list with severity (critical/high/medium/low)." --model sonnet --aggregate concat
```

**Expected behavior**:
- Matches all TypeScript files
- Uses sonnet for better analysis capability
- Each sub-agent performs security analysis on one file
- Concat strategy preserves per-file findings
- Final output: Security report for each file

**Cost estimate**: ~$0.30 for 100 files

**Output**:
```markdown
# Batch Processing Results

## File: src/auth/login.ts

### Security Findings

- **[HIGH]** SQL injection risk at line 42: User input concatenated into query
- **[MEDIUM]** Password comparison not using constant-time algorithm (line 58)

## File: src/auth/register.ts

### Security Findings

- **[CRITICAL]** Password stored in plaintext in logs (line 89)
- **[HIGH]** Email validation regex vulnerable to ReDoS attack (line 34)

## File: src/utils/sanitize.ts

### Security Findings

No issues found.

---

Total files analyzed: 100
Critical issues: 1
High issues: 15
Medium issues: 23
Low issues: 8
```

### Example 3: Complex Two-Phase Batch (Opus)

**Task**: Extract test coverage gaps, then prioritize them

**Phase 1: Extract gaps**
```bash
/rlm-batch "src/**/*.ts" "For {file}, identify which functions lack test coverage. Check corresponding test file in test/. Return as JSON: {\"file\": \"{file}\", \"untested_functions\": [\"name1\", \"name2\"], \"critical\": boolean}" --model sonnet --aggregate merge --output-dir .aiwg/rlm/coverage-gaps
```

**Phase 2: Prioritize gaps**
```bash
/rlm-batch ".aiwg/rlm/coverage-gaps/*.result.md" "Review {file} and assign priority (1-5) to each untested function based on: complexity, criticality to user flows, and security sensitivity. Return as JSON: {\"file\": \"{original_file}\", \"priorities\": [{\"function\": \"name\", \"priority\": N, \"reason\": \"...\"}]}" --model opus --aggregate summarize --output-dir .aiwg/rlm/coverage-priorities
```

**Expected behavior**:
1. First batch extracts untested functions from all source files
2. Results saved to coverage-gaps/
3. Second batch reads first batch results and prioritizes
4. Uses opus for complex prioritization logic
5. Summarize strategy produces final action plan

**Cost estimate**:
- Phase 1: ~$0.30 (100 files @ sonnet)
- Phase 2: ~$0.15 (100 gap files @ opus, smaller files)
- Total: ~$0.45

**Final output** (after summarize):
```markdown
# Test Coverage Priority Report

## Executive Summary

Analyzed 100 source files and identified 247 untested functions.
Prioritized based on complexity, criticality, and security impact.

## High Priority (P1) - Address Immediately

1. **src/auth/validateToken.ts → validateJWT()**
   - Reason: Critical security function, complex signature verification logic
   - Impact: Authentication bypass risk if broken

2. **src/payment/processPayment.ts → chargeCard()**
   - Reason: Handles financial transactions, multiple failure modes
   - Impact: Revenue loss or double-charging bugs

## Medium Priority (P2-P3) - Address Soon

{15 functions listed}

## Low Priority (P4-P5) - Address When Possible

{remaining functions listed}

## Recommendations

1. Start with P1 functions (2 functions, ~8 tests estimated)
2. Batch write P2 tests (15 functions, ~40 tests)
3. Consider automated test generation for P4-P5

Estimated effort: 2-3 days for P1-P2, 1 week for full coverage
```

## Cost Awareness

Before executing, estimate and display cost:

```
Cost Estimate:

Files: {count}
Avg file size: {size} tokens
Model: {model}

Input tokens: {count * size}
Output tokens: {estimated}
Cost per 1M tokens: ${rate}

Total estimated cost: ${total}

Proceed? (y/n)
```

**Safety thresholds**:
- Warn if cost > $1.00
- Require --force if cost > $10.00
- Abort if cost > $100.00 (suggest chunking)

## References

- RLM methodology: Retrieval, Long-form thinking, Multi-step
- Parallel fan-out pattern for chunked processing
- @.aiwg/rlm/ - RLM batch results directory
- @$AIWG_ROOT/agentic/code/addons/rlm/docs/batch-processing.md - Detailed batch patterns
- @$AIWG_ROOT/agentic/code/addons/rlm/schemas/batch-config.yaml - Batch configuration schema
