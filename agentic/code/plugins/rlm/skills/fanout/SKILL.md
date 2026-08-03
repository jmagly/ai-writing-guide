---
namespace: aiwg
name: fanout
platforms: [all]
description: Dispatch the same query to multiple subagents in parallel across chunks in a manifest and aggregate results with source provenance
version: 1.1.0
---

# Fanout

Dispatch the same query to multiple subagents in parallel, each processing one chunk from a chunk manifest. Aggregates results with source provenance — every answer is tagged with which chunk it came from.

## Triggers

Alternate expressions and non-obvious activations:

- "search all chunks" → fanout query across manifest
- "run in parallel across the chunks" → fanout with current manifest
- "ask each piece this question" → fanout with default parallelism
- "parallel grep" → fanout with a pattern as the query

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Fanout search | "search all chunks for authentication bugs" | Fanout query across manifest |
| Explicit chunks dir | "fanout across .aiwg/rlm-chunks/auth/" | `--chunks .aiwg/rlm-chunks/auth/` |
| Limit parallelism | "search chunks, max 2 at a time" | `--max-parallel 2` |
| Synthesis request | "search all chunks and give me one answer" | `--synthesize` |
| Model selection | "use haiku to search the chunks" | `--model haiku` |
| Manifest path | "fanout using manifest.json" | `--chunks manifest.json` |

## Behavior

When triggered:

1. **Parse arguments** — extract query, chunks path (directory or manifest), parallelism limit, model, and synthesis flag.

2. **Load manifest** — read `manifest.json` from the chunks directory, or use the provided manifest path directly. Validate that chunk files exist.

3. **Respect context budget** — if `AIWG_CONTEXT_WINDOW` is set, cap `--max-parallel` at the budget-appropriate limit per the context-budget rule. Default cap is 4 parallel subagents.

4. **Dispatch subagents** — launch up to `--max-parallel` subagents simultaneously. Each subagent:
   - Receives the query and exactly one chunk's content
   - Is instructed to answer only from that chunk's content
   - Returns a structured result: `{ chunk_id, answer, confidence, relevant_lines }`

5. **Wait for all subagents** — collect results as they complete. Track which chunks returned answers vs. "not found in this chunk".

6. **Aggregate with provenance** — compile results into a provenance-tagged list. Each entry shows:
   - The answer or finding
   - The chunk it came from (`chunk-0003`)
   - The source lines within that chunk
   - Confidence level (high / medium / low)

7. **Optionally synthesize** — if `--synthesize` is set, pass all results to a synthesis subagent that merges them into a single coherent answer.

8. **Report result** — print the aggregated findings with provenance, or the synthesized answer.

### Aggregated Result Format

```
Fanout Query: "Where is the token refresh logic?"
Chunks searched: 8  |  Matches found: 3  |  Model: haiku

Matches:
  [chunk-0002] lines 45-67 — HIGH confidence
    Token refresh is handled in `AuthMiddleware.refreshToken()`.
    The method checks expiry, calls `/auth/refresh`, and updates the
    session cookie on success.

  [chunk-0005] lines 112-118 — MEDIUM confidence
    `refreshToken()` is called from the React hook `useSession`
    when the access token has less than 60 seconds remaining.

  [chunk-0007] lines 203-208 — LOW confidence
    Environment variable REFRESH_INTERVAL_MS controls refresh
    frequency. Default: 300000 (5 minutes).

Chunks with no match: chunk-0001, chunk-0003, chunk-0004, chunk-0006, chunk-0008
```

### Synthesized Result Format (--synthesize)

```
Fanout Query: "Where is the token refresh logic?"
Synthesis from 3 matching chunks:

Token refresh is implemented in `AuthMiddleware.refreshToken()` (chunk-0002,
lines 45-67). The React layer triggers refresh via the `useSession` hook when
the access token has less than 60 seconds remaining (chunk-0005, lines 112-118).
Refresh interval is configurable via REFRESH_INTERVAL_MS (default: 5 minutes,
chunk-0007, lines 203-208).
```

## Parameters

- `<query>` — Natural language question or task to answer using the chunks (required)
- `--chunks <dir|manifest.json>` — Path to chunks directory or manifest file (default: `.aiwg/rlm-chunks/`)
- `--max-parallel N` — Max simultaneously active subagents (default: `4`, bounded by context budget). Alias `--parallel` is accepted for one release cycle and emits a deprecation warning; remove it after the next stable release.
- `--model haiku|sonnet|opus` — Model for subagents (default: `haiku` for cost efficiency)
- `--synthesize` — After collecting results, synthesize into a single answer

## Examples

### Example 1: Basic fanout search

**User**: "fanout search across the auth chunks: where is token expiry checked?"

**Action**: Dispatch query to each chunk in `.aiwg/rlm-chunks/auth/`, 4 parallel subagents using haiku.

**Response**:
```
Fanout Query: "where is token expiry checked?"
Chunks searched: 6  |  Matches found: 2  |  Model: haiku

Matches:
  [chunk-0002] lines 88-95 — HIGH confidence
    Token expiry is checked in `validateToken()` by comparing
    `token.exp` against `Date.now() / 1000`.

  [chunk-0004] lines 31-38 — MEDIUM confidence
    JWT middleware also checks expiry via the `express-jwt`
    `credentialsRequired` option, which rejects expired tokens
    before reaching route handlers.

Chunks with no match: chunk-0001, chunk-0003, chunk-0005, chunk-0006
```

---

### Example 2: Synthesized answer

**User**: "search all chunks for how errors are logged, and give me one answer"

**Action**:
```bash
aiwg fanout "how are errors logged?" --chunks .aiwg/rlm-chunks/api/ --synthesize
```

**Response**:
```
Synthesis from 4 matching chunks:

Errors are logged through three mechanisms: (1) the `logger.error()` wrapper
in `src/utils/logger.ts` formats structured JSON logs with request ID and stack
trace (chunk-0001, lines 12-28); (2) unhandled exceptions are caught by the
Express error handler in `src/middleware/error.ts` and forwarded to the logger
(chunk-0003, lines 55-71); (3) async errors in service classes use the
`@LogError` decorator (chunk-0006, lines 9-18).
```

---

### Example 3: Budget-constrained fanout

**User**: "parallel search the chunks but only 2 at a time — system is under load"

**Action**:
```bash
aiwg fanout "find all database connection setup" --chunks .aiwg/rlm-chunks/services/ --max-parallel 2
```

**Response**: Runs subagents in batches of 2. Reports matches with provenance after all 9 chunks are processed.

---

### Example 4: Expensive query on a large chunk set

**User**: "fanout across all the migration chunks using sonnet — I need precise SQL analysis"

**Action**:
```bash
aiwg fanout "find any ALTER TABLE statements that drop columns" \
  --chunks .aiwg/rlm-chunks/migrations/ \
  --model sonnet \
  --synthesize
```

**Response**: Dispatches sonnet subagents, synthesizes findings with exact line references.

## Clarification Prompts

If the user's intent is ambiguous:

- "Which chunks directory should I search? (found: `.aiwg/rlm-chunks/`)"
- "Should I synthesize the results into one answer, or list all matches with provenance?"
- "How many parallel subagents? Default is 4 (use `--max-parallel N` to override)."

## References

- @$AIWG_ROOT/agentic/code/addons/rlm/skills/chunk/SKILL.md — Produce the chunk manifest fanout reads
- @$AIWG_ROOT/agentic/code/addons/rlm/skills/rlm-search/SKILL.md — Full pipeline (prep + fanout + synthesize)
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-budget.md — Parallel budget constraints
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/subagent-scoping.md — Subagent isolation rules
- @$AIWG_ROOT/agentic/code/addons/rlm/schemas/rlm-chunk-manifest.yaml — Manifest schema
