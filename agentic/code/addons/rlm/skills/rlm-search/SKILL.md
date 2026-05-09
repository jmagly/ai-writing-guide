---
namespace: aiwg
name: rlm-search
platforms: [all]
description: Run the full Recursive Language Model pipeline — prep, fan out across chunks, and recursively synthesize until results fit one context window
version: 1.1.0
---

# RLM Search

The full Recursive Language Model pipeline in one command. Prepares content if needed, fans the query out across all chunks, and recursively synthesizes results until they fit in a single context window. Use this when you need to answer a question against content too large to read at once.

## Triggers

Alternate expressions and non-obvious activations:

- "deep search this codebase" → rlm-search with source `.`
- "answer this using the whole repo" → rlm-search with source `.`
- "recursive search" → rlm-search
- "search the entire codebase for X" → rlm-search with extracted query
- "use RLM to find X" → rlm-search

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Whole-repo search | "search the entire codebase for all usages of deprecated API" | `rlm-search "..." --source .` |
| Directory search | "recursively search src/ for logging calls" | `--source src/` |
| File search | "use RLM to analyze this 5000-line file" | `--source path/to/file.ts` |
| Budget limit | "search but cap at 200k tokens" | `--budget 200000` |
| Depth limit | "search up to 2 levels deep" | `--depth 2` |
| Skip re-prep | "search using the existing prep" | No re-prep if manifest exists |

## Behavior

When triggered:

1. **Extract query and source** — identify the natural language query and the source path (file or directory). Default source is `.` (current directory).

2. **Check for existing prep** — look for a valid manifest in `.aiwg/rlm-prep/` matching the source. If found and not stale, skip prep. If not found, run `rlm-prep` automatically.

3. **Initial fanout (level 1)** — dispatch the query across all chunks, up to `--max-parallel` subagents at a time. Collect results with provenance.

4. **Check synthesis fit** — measure the total size of all level-1 results. If they fit in a single context window, synthesize directly (base case). If not, recurse.

5. **Recursive reduction** — chunk the level-1 results into a new set of chunks and fan out again. Each level-N subagent synthesizes the results from one batch of level-(N-1) answers. Repeat until the output fits in one window.

6. **Final synthesis** — produce a single coherent answer from the last reduction level. Include provenance: trace each claim back to a source file and line range.

7. **Cost summary** — report total tokens consumed, number of subagents launched, recursion depth reached, and USD cost estimate.

### Recursion Diagram

```
Level 0 (root query)
  └── Level 1 fanout: N subagents (one per chunk)
        ├── chunk-0001 → answer fragment A
        ├── chunk-0002 → answer fragment B
        ├── chunk-0003 → (no match)
        └── chunk-0004 → answer fragment C

      If A + B + C fit in one window:
        └── Synthesize → Final Answer  ✓

      If A + B + C do NOT fit:
        Level 2 fanout: chunk the level-1 results
          ├── [A + B] → synthesis fragment 1
          └── [C]     → synthesis fragment 2
          └── Synthesize fragments 1 + 2 → Final Answer  ✓
```

The default `--depth 3` means the pipeline will recurse at most 3 times before forcing synthesis even if results are large.

### Final Answer Format

```
RLM Search Complete
Query: "Where is rate limiting implemented?"
Source: src/  |  Chunks: 47  |  Depth reached: 1  |  Subagents: 14

Answer:

Rate limiting is implemented in three places:

1. **API gateway level** — `src/gateway/rate-limit.ts` (lines 12-45) applies
   a sliding window limiter using Redis. Limits are configured per route in
   `config/rate-limits.yaml`.

2. **Auth service** — `src/auth/middleware.ts` (lines 88-102) imposes a
   per-IP limit of 10 login attempts per minute using an in-memory store.

3. **WebSocket connections** — `src/realtime/server.ts` (lines 231-248)
   limits new connections per second to prevent connection floods.

Cost summary: 47 subagents, 184,320 tokens (~$0.18), 1 synthesis pass
```

## Parameters

- `<query>` — Natural language question or task (required)
- `--source <file|dir>` — Source content to search (default: `.`)
- `--depth N` — Maximum recursion depth before forcing synthesis (default: `3`)
- `--max-parallel N` — Max parallel subagents per level (default: `4`, bounded by context budget). Alias `--parallel` is accepted for one release cycle and emits a deprecation warning; remove it after the next stable release.
- `--budget N` — Token budget for the entire operation (default: `500000`)

## Examples

### Example 1: Whole-codebase search

**User**: "search the entire codebase for where authentication tokens are validated"

**Action**: Check for existing prep of `.`, fanout across all chunks, synthesize.

**Response**:
```
RLM Search Complete
Query: "where are authentication tokens validated?"
Source: .  |  Chunks: 84  |  Depth: 1  |  Subagents: 84

Answer:

Token validation occurs at two layers:

1. **HTTP middleware** — `src/auth/middleware.ts` lines 34-67: the
   `validateToken` function decodes and verifies JWTs using the
   `jsonwebtoken` library, checking signature and expiry.

2. **GraphQL context** — `src/graphql/context.ts` lines 18-31: calls
   `validateToken` on every request and attaches the decoded payload
   to the GraphQL execution context.

Cost: 84 subagents, 241,800 tokens (~$0.24)
```

---

### Example 2: Large document set, multi-level recursion

**User**: "use RLM to find all compliance-relevant data handling in the entire codebase"

**Action**:
```bash
aiwg rlm-search "find all places where PII or sensitive data is stored, transmitted, or logged" --source .
```

Level-1 produces 28 matching fragments totaling 40,000 tokens (too large for one pass). Level-2 reduces to 4 synthesis fragments, then final synthesis produces the answer.

**Response**: "Depth reached: 2. Found 14 locations across 9 files. [Full provenance-tagged answer]"

---

### Example 3: Budget-constrained search

**User**: "deep search src/payments/ for Stripe webhook handling, cap at 100k tokens"

**Action**:
```bash
aiwg rlm-search "how are Stripe webhooks handled?" \
  --source src/payments/ \
  --budget 100000 \
  --max-parallel 4
```

**Response**: If budget would be exceeded, the pipeline pauses and reports: "Budget checkpoint: 82,400 tokens used. Continue (remaining budget: 17,600)? [y/n]"

---

### Example 4: Single large file

**User**: "use RLM to analyze this 8,000-line migration file for rollback risk"

**Action**:
```bash
aiwg rlm-search "identify any irreversible operations with no rollback path" \
  --source db/migrations/0099_big_schema.sql \
  --depth 2
```

**Response**: Preps the single file into ~40 chunks, fans out, synthesizes. Reports all `DROP`, `TRUNCATE`, and `ALTER TABLE ... DROP COLUMN` statements with line numbers.

---

### Example 5: Shallow search (fast mode)

**User**: "quick RLM search: where is the database connection string set?"

**Action**:
```bash
aiwg rlm-search "where is the database connection string configured?" \
  --source . \
  --depth 1 \
  --max-parallel 8
```

**Response**: Forces synthesis at depth 1 — faster but may miss cross-chunk context. Reports results within a single fanout pass.

## Clarification Prompts

If the user's intent is ambiguous:

- "Should I search the whole repo or a specific directory?"
- "What token budget should I use? Default is 500,000 tokens (~$0.50 with haiku)."
- "Is this a one-time search or should I prep the source for repeated queries?"

## References

- @$AIWG_ROOT/agentic/code/addons/rlm/skills/chunk/SKILL.md — Chunking used in prep stage
- @$AIWG_ROOT/agentic/code/addons/rlm/skills/fanout/SKILL.md — Fanout used at each recursion level
- @$AIWG_ROOT/agentic/code/addons/rlm/skills/rlm-prep/SKILL.md — Prep stage (called automatically if needed)
- @$AIWG_ROOT/agentic/code/addons/rlm/skills/rlm-status/SKILL.md — Monitor a running rlm-search
- @$AIWG_ROOT/agentic/code/addons/rlm/schemas/rlm-state.yaml — State schema for in-progress searches
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-budget.md — Budget and parallel limits
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/subagent-scoping.md — Subagent isolation (max 2-level delegation)
- @.aiwg/research/findings/REF-089-recursive-language-models.md — RLM research foundation
