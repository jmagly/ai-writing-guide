---
namespace: aiwg
name: index
platforms: [all]
description: Build, query, inspect dependencies, and report statistics for the searchable index of SDLC artifacts in .aiwg/
---

# Artifact Index

You manage the AIWG artifact index — building or rebuilding the searchable index of all SDLC artifacts in `.aiwg/`, querying it by text, inspecting dependency graphs, and reporting index statistics.

> **Scope: SDLC artifacts, not research corpora.** This skill (and `aiwg index ...`) operates on the SDLC artifact graph stored under `.aiwg/.index/*` (JSON: nodes, edges, checksums). It does **not** generate the human-readable markdown indices declared in `.aiwg/config.yaml` under `index.graphs.indices.manifest` for research-papers-style corpora. For those rendered indices (`indices/by-topic.md`, `indices/by-year.md`, `indices/authors.md`, etc.), use the `corpus-index-build` skill from `research-complete`.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "index my artifacts" → build
- "find requirements about authentication" → query "authentication"
- "what depends on UC-001" → deps .aiwg/requirements/UC-001.md
- "how many artifacts are indexed" → stats
- "refresh the index" → build --force

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Build index | "build the artifact index" | Run `aiwg index build` |
| Force rebuild | "rebuild the index from scratch" | Run `aiwg index build --force --verbose` |
| Text search | "search artifacts for authentication" | Run `aiwg index query "authentication"` |
| Dependency graph | "show dependencies for the SAD" | Run `aiwg index deps .aiwg/architecture/software-architecture-doc.md` |
| Statistics | "how many artifacts are indexed?" | Run `aiwg index stats` |
| JSON output | "get index stats as JSON" | Run `aiwg index stats --json` |

## Behavior

When triggered:

1. **Identify the subcommand**:
   - Is the user building, searching, inspecting dependencies, or checking stats?
   - Is a specific artifact path or query mentioned?
   - Is `--force`, `--verbose`, or `--json` appropriate?

2. **Run the appropriate command**:

   ```bash
   # Build or rebuild the index
   aiwg index build

   # Full rebuild with progress output
   aiwg index build --force --verbose

   # Semantic search across all artifacts
   aiwg index query "<text>"

   # Machine-readable search results
   aiwg index query "<text>" --json

   # Show dependency graph for an artifact
   aiwg index deps <artifact-path>

   # Machine-readable dependency graph
   aiwg index deps <artifact-path> --json

   # Show index statistics
   aiwg index stats

   # Machine-readable statistics
   aiwg index stats --json
   ```

3. **Report the result** — surface the relevant matches, dependencies, or counts.

## Examples

### Example 1: Build the index

**User**: "Build the artifact index"

**Extraction**: Build subcommand, no flags

**Action**:
```bash
aiwg index build
```

**Response**: "Index built. Indexed 47 artifacts across 8 categories in .aiwg/. Run `aiwg index query` to search."

### Example 2: Force rebuild with progress

**User**: "Rebuild the index from scratch"

**Extraction**: Build subcommand, --force --verbose

**Action**:
```bash
aiwg index build --force --verbose
```

**Response**: "Full rebuild complete. Scanned 52 files, indexed 47 artifacts (5 skipped: working/). Categories: requirements (12), architecture (8), testing (7), security (5), deployment (4), planning (6), risks (5)."

### Example 3: Text search

**User**: "Search artifacts for anything about authentication"

**Extraction**: Query subcommand, text = authentication

**Action**:
```bash
aiwg index query "authentication"
```

**Response**: "5 artifacts match 'authentication': UC-003-user-authentication.md (requirements), SAD section 4.2 (architecture), threat-model-v1.md (security), test-plan-auth.md (testing), deployment-runbook.md (deployment)."

### Example 4: Dependency inspection

**User**: "What does UC-001 depend on, and what depends on it?"

**Extraction**: Deps subcommand, artifact = .aiwg/requirements/UC-001.md

**Action**:
```bash
aiwg index deps .aiwg/requirements/UC-001.md
```

**Response**: "UC-001 (User Registration) dependencies: none (root artifact). Dependents: UC-003-user-authentication.md, test-plan-registration.md, SAD section 3.1, deployment-runbook.md."

### Example 5: Index statistics

**User**: "How many artifacts are indexed?"

**Extraction**: Stats subcommand

**Action**:
```bash
aiwg index stats
```

**Response**: "Index contains 47 artifacts. Coverage: 90% (5 unindexed files in working/). Last built: 2026-04-01T14:22:00Z. Categories with highest artifact count: requirements (12), architecture (8), testing (7)."

## Clarification Prompts

If the user's intent is ambiguous:

- "Are you looking to search for existing artifacts, or rebuild the index so new artifacts are discoverable?"
- "Do you want to see what an artifact depends on, or what other artifacts depend on it? (I can show both)"

## References

- @$AIWG_ROOT/src/cli/handlers/subcommands.ts — Index subcommand handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference (index section)
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/README.md — SDLC artifact structure
