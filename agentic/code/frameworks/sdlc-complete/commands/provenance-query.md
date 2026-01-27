---
description: Query provenance chains to trace artifact derivation and impact
category: provenance
---

# Provenance Query Command

Query provenance chains to understand artifact derivation, impact, and attribution.

## Instructions

When invoked, query provenance graph:

1. **Load provenance graph**
   - Read all records from `.aiwg/research/provenance/records/`
   - Build in-memory graph of entity relationships
   - Index by entity URN for fast lookup

2. **Execute query** (based on subcommand)

   **trace** - Full derivation chain for an artifact:
   - Follow wasDerivedFrom relationships backward to root sources
   - Display as indented tree showing derivation types
   - Include depth limiting with `--depth`

   **impact** - What depends on this artifact:
   - Follow wasDerivedFrom relationships forward
   - Show all artifacts that derive from the queried artifact
   - Useful for understanding change impact

   **orphans** - Find artifacts without provenance:
   - Scan `.aiwg/` and `src/` for files
   - Compare against provenance records
   - List untracked artifacts

   **agents** - Show agent attribution:
   - Group provenance records by agent
   - Show what each agent created/modified
   - Include activity counts and timestamps

3. **Format output**
   - Default: indented tree
   - `--format table`: Markdown table
   - `--format mermaid`: Mermaid diagram
   - `--format json`: Raw JSON

4. **Display results**
   - Show query results
   - Include summary statistics

## Subcommands

- `trace [path]` - Full derivation chain for artifact
- `impact [path]` - What depends on this artifact
- `orphans` - Find artifacts without provenance
- `agents` - Show agent attribution summary

## Arguments

- `[artifact-path]` - Path to artifact (required for trace/impact)
- `--direction [forward|backward|both]` - Traversal direction (default: both)
- `--depth [n]` - Maximum traversal depth (default: unlimited)
- `--format [tree|table|mermaid|json]` - Output format (default: tree)

## References

- @agentic/code/frameworks/sdlc-complete/agents/provenance-manager.md - Provenance Manager agent
- @.aiwg/research/provenance/schemas/prov-record.yaml - PROV record schema
- @.aiwg/research/provenance/schemas/prov-query.yaml - Query schema
- @.claude/rules/provenance-tracking.md - Provenance tracking rules
