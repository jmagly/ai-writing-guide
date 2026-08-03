---
namespace: aiwg
name: rlm-prep
platforms: [all]
description: Prepare source content for RLM processing by discovering files, chunking each one, and writing a unified searchable manifest
---

# RLM Prep

Prepare source content for RLM processing in one shot: discovers files, chunks each one, builds a searchable index, and writes a unified `manifest.json`. Run this once on a codebase or document set; then use `rlm-search` or `fanout` against the output without re-preparing.

## Triggers

Alternate expressions and non-obvious activations:

- "index this codebase for search" → rlm-prep on directory
- "get this ready for RLM" → rlm-prep with defaults
- "prep the docs folder" → rlm-prep on `docs/`
- "build a chunk index" → rlm-prep with index output

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Prep a directory | "prepare src/ for RLM" | `rlm-prep src/` |
| Prep a single file | "prep this file for recursive search" | `rlm-prep path/to/file.ts` |
| Strategy override | "prep with fixed-count chunking" | `--strategy fixed-count` |
| Size override | "prep in 100-line chunks" | `--size 100` |
| Custom output | "prep into tmp/rlm/" | `--output tmp/rlm/` |
| Force refresh | "re-prep even if already done" | `--force` |
| Check status | "is this codebase already prepped?" | Inspect output dir for manifest |

## Behavior

When triggered:

1. **Resolve source** — determine whether the input is a single file or a directory. For directories, discover all supported file types (`.ts`, `.js`, `.py`, `.go`, `.md`, `.txt`, `.yaml`, `.json`, `.sql`, and others). Respect `.gitignore` patterns.

2. **Check for existing prep** — look for a manifest in the output directory. If found and `--force` is not set, report that prep already exists and offer to use it or re-run.

3. **Chunk each file** — apply the selected strategy per file. Each file produces its own subdirectory under `chunks/`, named after the file path (slashes replaced with underscores).

4. **Build index** — construct a searchable index (`index.json`) with:
   - Chunk IDs mapped to file, line range, and boundary label
   - Content summaries (first non-blank line of each chunk)
   - File-level metadata (language, size, last-modified)

5. **Write unified manifest** — a single `manifest.json` at the output root that references all chunks across all files. This is what `fanout` and `rlm-search` consume.

6. **Report result** — print file count, total chunk count, index size, and output path.

### Output Directory Structure

```
.aiwg/rlm-prep/<source-hash>/
├── manifest.json              # Unified chunk manifest (all files)
├── index.json                 # Searchable index with summaries
├── meta.json                  # Source path, strategy, timestamp
└── chunks/
    ├── src__auth__middleware.ts/
    │   ├── chunk-0001.txt
    │   ├── chunk-0002.txt
    │   └── chunk-0003.txt
    ├── src__auth__jwt.ts/
    │   ├── chunk-0001.txt
    │   └── chunk-0002.txt
    └── src__core__parser.ts/
        ├── chunk-0001.txt
        ├── chunk-0002.txt
        ├── chunk-0003.txt
        └── chunk-0004.txt
```

### Manifest Format (multi-file)

```json
{
  "source": "src/auth/",
  "source_hash": "sha256:a1b2c3d4...",
  "strategy": "semantic-boundary",
  "chunk_size": 200,
  "overlap": 20,
  "created_at": "2026-04-01T14:23:00Z",
  "files": 12,
  "total_chunks": 47,
  "output_dir": ".aiwg/rlm-prep/a1b2c3d4/",
  "chunks": [
    {
      "id": "src__auth__middleware.ts/chunk-0001",
      "file_source": "src/auth/middleware.ts",
      "chunk_file": ".aiwg/rlm-prep/a1b2c3d4/chunks/src__auth__middleware.ts/chunk-0001.txt",
      "start_line": 1,
      "end_line": 218,
      "boundary_label": "validateToken()"
    }
  ]
}
```

## Parameters

- `<file|dir>` — Source file or directory to prepare (required)
- `--output <dir>` — Output directory (default: `.aiwg/rlm-prep/<source-hash>/`)
- `--strategy semantic-boundary|fixed-count|adaptive` — Chunking strategy (default: `semantic-boundary`)
- `--size N` — Target chunk size in lines (default: `200`)
- `--overlap N` — Overlap lines between adjacent chunks (default: `20`)
- `--force` — Re-prep even if a manifest already exists

## Examples

### Example 1: Prep a source directory

**User**: "prepare src/ for RLM processing"

**Action**:
```bash
aiwg rlm-prep src/
```

**Response**: "Prepped `src/` for RLM. 12 files, 47 chunks. Strategy: semantic-boundary (200 lines, 20 overlap). Manifest: `.aiwg/rlm-prep/a1b2c3d4/manifest.json`"

---

### Example 2: Prep with smaller chunks for a dense codebase

**User**: "index the entire repo for RLM, use 100-line chunks"

**Action**:
```bash
aiwg rlm-prep . --size 100 --overlap 15
```

**Response**: "Prepped `.` for RLM. 84 files, 312 chunks. Strategy: semantic-boundary (100 lines, 15 overlap). Manifest: `.aiwg/rlm-prep/b3c4d5e6/manifest.json`"

---

### Example 3: Prep a documentation set

**User**: "get the docs folder ready for recursive search"

**Action**:
```bash
aiwg rlm-prep docs/ --strategy fixed-count --size 150
```

**Response**: "Prepped `docs/` for RLM. 23 files, 89 chunks. Strategy: fixed-count (150 lines, 20 overlap). Manifest: `.aiwg/rlm-prep/c4d5e6f7/manifest.json`"

---

### Example 4: Already prepped — user wants to force refresh

**User**: "re-prep the auth module, I've made changes"

**Action**:
```bash
aiwg rlm-prep src/auth/ --force
```

**Response**: "Re-prepped `src/auth/` (previous prep from 2026-03-28 replaced). 4 files, 14 chunks. Manifest: `.aiwg/rlm-prep/d5e6f7a8/manifest.json`"

---

### Example 5: Check if already prepped

**User**: "is src/ already prepped for RLM?"

**Action**: Check `.aiwg/rlm-prep/` for a manifest matching the source hash of `src/`.

**Response**: "Yes — `src/` was prepped on 2026-04-01 (47 chunks, strategy: semantic-boundary). Run with `--force` to re-prep."

## Clarification Prompts

If the user's intent is ambiguous:

- "Should I prep the entire directory or just a specific subdirectory?"
- "A previous prep exists from [date]. Should I use it or re-prep?"
- "Which strategy: split at natural boundaries (semantic-boundary), fixed line counts, or adaptive?"

## References

- @$AIWG_ROOT/agentic/code/addons/rlm/skills/chunk/SKILL.md — Single-file chunking (used internally by rlm-prep)
- @$AIWG_ROOT/agentic/code/addons/rlm/skills/fanout/SKILL.md — Query the prepared manifest
- @$AIWG_ROOT/agentic/code/addons/rlm/skills/rlm-search/SKILL.md — Full pipeline that calls rlm-prep automatically
- @$AIWG_ROOT/agentic/code/addons/rlm/schemas/rlm-chunk-manifest.yaml — Manifest schema
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-budget.md — Budget guidance for downstream fanout
