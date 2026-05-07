---
namespace: aiwg
platforms: [all]
name: citation-backfill
description: Rebuild bidirectional citation edges in a research corpus. Scans outgoing citations, computes the inverse map, rewrites incoming tables. Fixes one-directional graphs.
commandHint:
  argumentHint: "[--dry-run] [--scope REF-XXX] [--format full|summary|json]"
  allowedTools: Read, Write, Glob, Grep, Bash
  model: sonnet
  category: research-maintenance
---

# Citation Backfill

Rebuild bidirectional citation edges across the entire research corpus. After batch inductions or outgoing citation table updates, incoming citation tables across the corpus become stale. This command computes the inverse citation map and rewrites all incoming tables to match.

## Triggers

- "backfill citations"
- "rebuild citation edges"
- "fix incoming citations"
- "propagate citation edges"
- "citation backfill"
- `/citation-backfill`

## Parameters

### `--dry-run` (optional)
Report what would change without writing any files.

### `--scope REF-XXX` (optional)
Only propagate edges from a specific paper. Useful after inducting a single new source.

### `--format` (optional)
Output format: `full` (default), `summary`, or `json`.

## Execution Flow

### Phase 1: Scan Outgoing Edges

1. **Glob** all citation sidecar files:
   - `.aiwg/research/citations/REF-*.yaml` (if YAML sidecars exist)
   - `.aiwg/research/findings/REF-*.md` — scan "Outgoing Citations" / "References" / "Cites" sections
   - `.aiwg/research/documentation/citations/REF-*.md` — scan citation tables

2. **Extract outgoing edges** from each source:
   ```
   REF-016 → cites → [REF-018, REF-024, REF-121]
   REF-018 → cites → [REF-016, REF-024]
   REF-024 → cites → [REF-016]
   ```

3. **Build the outgoing map**: `Map<source, Set<target>>`

### Phase 2: Compute Inverse Map

Invert the outgoing map to produce the incoming map:

```
REF-016 ← cited-by ← [REF-018, REF-024]
REF-018 ← cited-by ← [REF-016]
REF-024 ← cited-by ← [REF-016, REF-018]
REF-121 ← cited-by ← [REF-016]
```

Result: `Map<target, Set<source>>`

### Phase 3: Diff Against Current State

For each target in the incoming map:
1. Read the current "Incoming Citations" / "Cited By" section
2. Parse existing incoming edges
3. Compute the diff: edges to add, edges to remove (if source was deleted)

### Phase 4: Write Updates

For each target with changes:
1. Rewrite the "Incoming Citations" section with the computed set
2. Sort entries by REF number for stable output
3. Preserve any manually-added annotations (relationship type, notes)

If `--dry-run`: report changes without writing.

### Phase 5: Report

```
Citation Backfill Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sources scanned:        372
Outgoing edges found:   1,247
Incoming edges computed: 1,247
Sidecars updated:       89
New edges propagated:   134
Stale edges removed:    3
Targets not found:      2 (REF-999, REF-888 — referenced but no note exists)

Updated files:
  documentation/citations/REF-016.md  (+3 incoming)
  documentation/citations/REF-018.md  (+1 incoming)
  documentation/citations/REF-024.md  (+2 incoming)
  ...
```

## Edge Detection Patterns

The backfill command recognizes citations in these formats:

| Pattern | Example | Context |
|---------|---------|---------|
| Table row | `\| REF-016 \| Title \| relationship \|` | Citation sidecar tables |
| Inline reference | `REF-016` in body text | Finding doc body |
| YAML list | `- REF-016` under `outgoing:` or `cites:` | Citation YAML sidecars |
| Markdown link | `[REF-016](../findings/REF-016.md)` | Cross-reference links |
| Frontmatter | `related_refs: [REF-016, REF-018]` | YAML frontmatter |

## Integration Points

| Component | Relationship |
|-----------|-------------|
| `induct-research` | Should auto-run backfill after batch induction (Phase 3.5) |
| `address-issues` | Should auto-run when citation sidecars are modified |
| `research-lint` | `cross-ref-bidirectional` rule validates what backfill fixes |
| `corpus-health` | Reports citation completeness as a health metric |
| `research-gap-detect` | Uses the completed graph for cluster analysis |

## Auto-Integration Hooks

When called from other skills:

```yaml
# After induct-research batch:
post-induction:
  - /citation-backfill --scope <newly-inducted-refs>

# After address-issues modifies citations:
post-issue-resolution:
  - /citation-backfill --dry-run
  - # If changes detected, prompt user to run full backfill
```

## Examples

```bash
# Full corpus backfill
/citation-backfill

# Preview what would change
/citation-backfill --dry-run

# Backfill only edges from a specific paper
/citation-backfill --scope REF-364

# JSON output for programmatic use
/citation-backfill --format json
```

## References

- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/induct-research/SKILL.md — Triggers backfill post-induction
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-lint/SKILL.md — Validates bidirectional edges
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/lint/cross-ref-bidirectional.yaml — Lint rule for edge validation
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-status/SKILL.md — Health scoring includes citation completeness
