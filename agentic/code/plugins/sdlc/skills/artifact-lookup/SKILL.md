---
namespace: aiwg
name: artifact-lookup
platforms: [all]
description: Search and navigate SDLC artifacts by topic, type, phase, or tag using the aiwg index CLI

---

# artifact-lookup

Search and navigate SDLC artifacts using the artifact index.

## Triggers


Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "where is [artifact]" → artifact location query
- "find my [SAD/test plan/ADR]" → artifact search shorthand

## Purpose

This skill wraps the `aiwg index` CLI commands to provide natural language artifact discovery. Agents and users can query, navigate dependencies, and check project health without knowing the exact CLI syntax.

## Behavior

### Query Artifacts

When the user asks to find artifacts by topic, type, or phase:

```bash
# By keyword
aiwg index query "authentication" --json

# By type
aiwg index query --type use-case --json

# By phase
aiwg index query --phase testing --json

# By tag
aiwg index query --tags security,auth --json

# Combined filters
aiwg index query "login" --type use-case --phase requirements --json
```

Parse the JSON output and present results in a readable summary:
- List matching artifacts with path, title, and relevance score
- Highlight the most relevant result
- Suggest related queries if results are sparse

### Check Dependencies

When the user asks what depends on or references an artifact:

```bash
# Both directions
aiwg index deps .aiwg/requirements/UC-001.md --json

# Upstream only (what this depends on)
aiwg index deps .aiwg/requirements/UC-001.md --direction upstream --json

# Downstream only (what depends on this)
aiwg index deps .aiwg/requirements/UC-001.md --direction downstream --json
```

Present the dependency tree in a readable format:
- Show upstream dependencies (what the artifact relies on)
- Show downstream dependents (what would be impacted by changes)
- Flag high fan-out artifacts (many dependents)

### Show Statistics

When the user asks about project health or artifact stats:

```bash
aiwg index stats --json
```

Summarize:
- Total artifacts by phase and type
- Coverage percentage
- Orphaned artifacts (no connections)
- Most referenced artifacts

### Rebuild Index

When the user creates new artifacts or asks to refresh:

```bash
aiwg index build
```

Report what changed (new, updated, unchanged counts).

## Archiving Answers

### `--archive-answer` flag

Pass `--archive-answer` to persist the query result as a structured artifact instead of (or in addition to) displaying it in chat:

```
artifact-lookup "authentication flow" --archive-answer
artifact-lookup --type use-case --archive-answer --tags auth,security
```

When this flag is present, after presenting results the skill invokes `archive-answer` with:
- `title` derived from the query string
- `content` set to the formatted result summary
- `source-query` set to the original query expression
- `tags` forwarded if provided

Without the flag, the skill still offers archival automatically when it detects a substantive result (3+ matching artifacts with meaningful relevance scores, or a dependency tree with 5+ nodes). In that case it asks: "This looks like a useful finding. Archive it? (y/n)"

Archived answers land in `.aiwg/working/answers/` and are picked up by the next `aiwg index build` run.

## Output Format

Always present results as structured summaries, not raw JSON dumps. Example:

```
Found 3 artifacts about "authentication":

1. UC-001: User Authentication (requirements, score: 0.95)
   Path: .aiwg/requirements/UC-001.md
   Tags: auth, security

2. ADR-001: JWT Token Strategy (architecture, score: 0.82)
   Path: .aiwg/architecture/adr-001.md
   Tags: auth, architecture

3. TP-001: Auth Test Plan (testing, score: 0.75)
   Path: .aiwg/testing/tp-001.md
   Tags: auth, testing
```

## Prerequisites

- Artifact index must exist (`aiwg index build` must have been run)
- If index doesn't exist, offer to build it first

## References

- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/artifact-discovery.md — Agent protocol rules
- @$AIWG_ROOT/src/artifacts/cli.ts — CLI implementation
