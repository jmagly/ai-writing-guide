---
name: memory-query-capture
description: Capture query synthesis as durable pages in semantic memory
namespace: aiwg
category: kernel
platforms: [claude, copilot, cursor, factory, windsurf, warp, codex, opencode, openclaw, hermes]
---

# memory-query-capture

Capture valuable assistant synthesis from conversation into durable semantic memory pages. This is the compounding primitive — explorations accumulate as reusable knowledge rather than evaporating into chat history.

## When to Use

Any time an assistant response produces analytical output worth preserving: comparisons, gap analyses, architectural assessments, synthesis narratives. Invoked explicitly by the user, suggested ambiently by the system, or chained automatically by other skills.

## Parameters

### --consumer (optional)
Consumer ID to write against. Resolved via ADR-021 D4 precedence: explicit > wrapper > auto-detect.

### --type (optional)
Page type: `synthesis`, `comparison`, `analysis`, or `gap`. If omitted, determined by heuristic or user prompt.

### --title (optional)
Page title. If omitted, derived from content via headline extraction or summarization.

## Invocation Modes

### Ambient mode
Suggested automatically when a query response exceeds a length/value threshold. The system presents a capture prompt; the user confirms or dismisses.

### Explicit mode
User invokes directly: "save this as a page", "capture that comparison", or calls `memory-query-capture` with parameters.

### Skill-chain mode
Any skill can call `memory-query-capture` as a final step after producing analytical output. The calling skill passes `--type` and `--title` to skip heuristics.

## Operation

1. **Capture synthesis** — extract the last assistant synthesis from conversation state.
2. **Determine page type** — from `--type` flag, content heuristic, or user prompt.
3. **Resolve consumer** — determine target consumer via ADR-021 D4 precedence (explicit > wrapper > auto-detect).
4. **Resolve destination** — read `memory.topology.derivedPages` from consumer's `manifest.json` and select the matching subdirectory (`derivedPages.synthesis`, `derivedPages.comparison`, etc.).
5. **Title the page** — from `--title` flag or derived from content (first heading, key noun phrase, or summarized label).
6. **Add cross-references** — identify source pages cited in the synthesis and insert cross-reference links per the consumer's `crossRefStyle` setting.
7. **Write page** — create the Markdown file at the resolved destination path.
8. **Update index and log** — call `memory-log-append` with `--op query-capture` and metadata about the captured page.
9. **Mark provenance** (optional) — record query origin, model actor, and sources cited in a provenance block at the end of the page.

## Page-Type Heuristics

When `--type` is not provided, the skill inspects the synthesis content:

| Content pattern | Assigned type |
|-----------------|---------------|
| Comparison table, side-by-side columns | `comparison` |
| Narrative prose with connective reasoning | `synthesis` |
| Gap analysis, missing coverage, "what's absent" | `gap` |
| Bullet-point assessment, evaluation criteria | `analysis` |

If the heuristic is ambiguous, prompt the user to select.

## Consumer Resolution

Follows ADR-021 D4 precedence:

1. **Explicit** — `--consumer` flag provided on invocation.
2. **Wrapper** — a parent skill passes consumer context down the chain.
3. **Auto-detect** — inspect `.aiwg/frameworks/registry.json` for the active consumer with a `memory.topology` contract.

If no consumer can be resolved, abort with a clear error requesting `--consumer`.

## Cross-Reference Style

The consumer's `manifest.json` declares a `crossRefStyle` — one of:

- `wikilink` — `[[page-name]]`
- `markdown` — `[page name](relative/path.md)`
- `at-mention` — `@consumer/path/to/page.md`

The skill reads this setting and formats all source-page links accordingly.

## Error Handling

- If no synthesis content is available in conversation state, report "nothing to capture" and exit.
- If the destination directory does not exist, create it before writing.
- Log write failures via `memory-log-append` are **non-blocking** — the page write is the primary operation.
- If consumer topology lacks a `derivedPages` mapping for the resolved type, fall back to the consumer's base memory directory.

## Schema Reference

@semantic-memory/schemas/memory-log-event.md

## Examples

```
# Explicit capture after a deep comparison
memory-query-capture --consumer research-complete --type comparison --title "Redis vs Valkey feature matrix"

# Ambient capture (system-suggested, user confirms)
> Your comparison of caching strategies looks worth preserving. Capture as a page? [Y/n]
memory-query-capture --type synthesis

# Skill-chain: architecture-evolution calls capture after producing assessment
memory-query-capture --consumer sdlc-complete --type analysis --title "Microservices migration readiness"
```

## Storage Routing (#934, #966)

This skill's persistence flows through `resolveStorage('memory')`. On the default `fs` backend the memory subsystem lives at `.aiwg/memory/` and behavior is byte-identical to direct file writes. To redirect memory artifacts into Obsidian, Logseq, Fortemi, or another backend without changing this skill, configure `.aiwg/storage.config` (#934).

When this skill needs to read or write memory artifacts from a Bash step:

```bash
aiwg memory path                        # resolved root (fs only)
aiwg memory list --prefix research-complete/
aiwg memory get research-complete/index.md
echo "# index" | aiwg memory put research-complete/index.md
echo '{"op":"ingest","summary":"foo"}' | aiwg memory append-log research-complete/.log.jsonl
```

The `aiwg memory append-log` subcommand uses atomic `O_APPEND` (#976) on the fs backend — concurrent appenders don't race.
