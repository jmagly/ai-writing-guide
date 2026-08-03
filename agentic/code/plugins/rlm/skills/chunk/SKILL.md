---
namespace: aiwg
name: chunk
platforms: [all]
description: Split a file into overlapping chunks suitable for parallel fanout processing and emit a manifest describing each chunk
---

# Chunk

Split a file into overlapping chunks suitable for parallel fanout processing. Produces numbered chunk files and a `manifest.json` describing each chunk's location, line range, and overlap metadata.

## Triggers

Alternate expressions and non-obvious activations:

- "break this file up for parallel processing" → chunk with defaults
- "prepare for fanout" → chunk + write manifest
- "split into pieces" → chunk at semantic boundaries
- "make this codebase searchable" → chunk directory of files

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Chunk file | "chunk this file" | Apply semantic-boundary strategy, write to `.aiwg/rlm-chunks/` |
| Size override | "chunk into 100-line pieces" | `--size 100` |
| Overlap override | "chunk with 50-line overlap" | `--overlap 50` |
| Fixed count | "split into fixed-size chunks" | `--strategy fixed-count` |
| JSON output | "chunk as JSON" | `--format json` |
| Custom directory | "chunk into tmp/chunks/" | `--output tmp/chunks/` |
| Dry run | "how would this file be chunked?" | Read file, describe strategy, no writes |

## Behavior

When triggered:

1. **Parse arguments** — identify source file, strategy, size, overlap, format, and output directory from user input.

2. **Read the source file** — determine total line count and content type (code, markdown, prose, config).

3. **Select chunking strategy**:
   - `semantic-boundary` (default) — split at headings (`##`, `###`), blank lines between sections, function/class definitions, or import blocks. Preserves logical units.
   - `fixed-count` — fixed number of lines per chunk regardless of content. Use when content has no clear structure.
   - `adaptive` — measure content density (code density, average line length) and shrink chunk size for dense regions, expand for sparse ones.

4. **Apply overlap** — each chunk includes the last `--overlap` lines of the previous chunk and the first `--overlap` lines of the next. This ensures queries that span chunk boundaries are answerable from either side.

5. **Write output**:
   - Text mode: one file per chunk, named `chunk-0001.txt`, `chunk-0002.txt`, etc.
   - JSON mode: single `chunks.json` with each chunk's content embedded as a field.
   - Always write `manifest.json` regardless of format.

6. **Report result** — print chunk count, output directory, and manifest path.

### Manifest Format

```json
{
  "source": "src/auth/middleware.ts",
  "source_lines": 842,
  "strategy": "semantic-boundary",
  "chunk_size": 200,
  "overlap": 20,
  "format": "text",
  "output_dir": ".aiwg/rlm-chunks/middleware-ts/",
  "created_at": "2026-04-01T14:23:00Z",
  "chunks": [
    {
      "id": "chunk-0001",
      "file": ".aiwg/rlm-chunks/middleware-ts/chunk-0001.txt",
      "start_line": 1,
      "end_line": 218,
      "overlap_start": 0,
      "overlap_end": 20,
      "boundary_type": "function",
      "boundary_label": "validateToken()"
    },
    {
      "id": "chunk-0002",
      "file": ".aiwg/rlm-chunks/middleware-ts/chunk-0002.txt",
      "start_line": 199,
      "end_line": 412,
      "overlap_start": 20,
      "overlap_end": 20,
      "boundary_type": "class",
      "boundary_label": "AuthMiddleware"
    }
  ]
}
```

## Parameters

- `<file>` — Source file to chunk (required)
- `--size N` — Target chunk size in lines (default: `200`). For `adaptive`, this is the base size before density adjustments.
- `--overlap N` — Lines of overlap on each side of a chunk boundary (default: `20`)
- `--strategy semantic-boundary|fixed-count|adaptive` — Chunking strategy (default: `semantic-boundary`)
- `--format json|text` — Output format (default: `text`)
- `--output <dir>` — Output directory (default: `.aiwg/rlm-chunks/<filename>/`)

## Examples

### Example 1: Default chunk

**User**: "chunk src/auth/middleware.ts"

**Action**:
```bash
aiwg chunk src/auth/middleware.ts
```

**Response**: "Split `middleware.ts` (842 lines) into 5 chunks using semantic-boundary strategy. Overlap: 20 lines. Manifest: `.aiwg/rlm-chunks/middleware-ts/manifest.json`"

---

### Example 2: Small chunks for a dense file

**User**: "chunk this file into 100-line pieces with 30-line overlap for the RLM fanout"

**Action**:
```bash
aiwg chunk src/core/parser.ts --size 100 --overlap 30
```

**Response**: "Split `parser.ts` (1,240 lines) into 14 chunks. 100-line target, 30-line overlap. Manifest: `.aiwg/rlm-chunks/parser-ts/manifest.json`"

---

### Example 3: Fixed-count for a flat config file

**User**: "split config/nginx.conf into fixed chunks"

**Action**:
```bash
aiwg chunk config/nginx.conf --strategy fixed-count --size 150
```

**Response**: "Split `nginx.conf` (620 lines) into 5 fixed-count chunks. Manifest: `.aiwg/rlm-chunks/nginx-conf/manifest.json`"

---

### Example 4: JSON format for programmatic use

**User**: "chunk the migration SQL file as JSON"

**Action**:
```bash
aiwg chunk db/migrations/0042_schema.sql --format json --output .aiwg/rlm-chunks/migration/
```

**Response**: "Split `0042_schema.sql` (380 lines) into 2 JSON chunks. Output: `.aiwg/rlm-chunks/migration/chunks.json`. Manifest: `.aiwg/rlm-chunks/migration/manifest.json`"

## Clarification Prompts

If the user's intent is ambiguous:

- "Should I split at semantic boundaries (headings, functions) or use fixed line counts?"
- "What chunk size would you like? Default is 200 lines."
- "Should the output go to `.aiwg/rlm-chunks/` or a custom directory?"

## References

- @$AIWG_ROOT/agentic/code/addons/rlm/skills/fanout/SKILL.md — Next step after chunking
- @$AIWG_ROOT/agentic/code/addons/rlm/skills/rlm-prep/SKILL.md — One-shot prep (chunk + index)
- @$AIWG_ROOT/agentic/code/addons/rlm/skills/rlm-search/SKILL.md — Full pipeline using chunk output
- @$AIWG_ROOT/agentic/code/addons/rlm/schemas/rlm-chunk-manifest.yaml — Manifest schema
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-budget.md — Parallel context budget rules
