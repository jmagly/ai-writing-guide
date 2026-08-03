---
name: memory-lint
description: Health-check any consumer's semantic memory by composing structural and domain-specific checks
namespace: aiwg
category: kernel
platforms: [claude, copilot, cursor, factory, windsurf, warp, codex, opencode, openclaw, hermes]
---

# memory-lint

Validate the structural integrity and content health of a consumer's semantic memory. Composes eight built-in checks with any domain-specific lint rules declared by the consumer.

## When to Use

- Periodic maintenance (weekly or per-iteration)
- Before phase transitions or releases — ensures memory is clean
- After bulk ingest operations
- When `memory-log-append` flags corruption
- CI/CD quality gates that include memory health

## Parameters

### --consumer (optional)
Consumer ID to lint. Resolved via ADR-021 D4 precedence: explicit > wrapper > auto-detect.

### --fix (optional, flag)
Auto-apply safe fixes. Safe fixes: rebuild index, add missing cross-references, backfill log metadata. Unsafe fixes (resolving contradictions, deleting orphan pages) are reported but left for human action per the `human-authorization` rule.

### --severity (optional, default: warning)
Minimum severity to include in output: `error`, `warning`, or `suggestion`.

## Operation

1. **Resolve consumer** — determine which consumer to lint using ADR-021 D4 precedence (explicit > wrapper > auto-detect).
2. **Load topology** — read `memory.topology` from consumer's `manifest.json` to locate pages, index, log, and derived paths.
3. **Compose checks** — run each check against the resolved topology:

| # | Check | Source | Severity |
|---|-------|--------|----------|
| 1 | Broken @-mentions / references | `mention-lint`, link-check | error |
| 2 | Orphan pages (no inbound links) | new — walks `derivedPages`, tracks inbound refs | warning |
| 3 | Stale claims (source contradicts page) | `doc-sync` drift + contradiction scan | error |
| 4 | Missing cross-references (concept appears in multiple pages without its own page) | new — entity extraction + frequency threshold | suggestion |
| 5 | Index drift (page exists but index entry missing, or vice versa) | filesystem vs `index.md` comparison | warning |
| 6 | Log integrity (append-only, no gaps, valid JSON Lines) | new — structural validation of `.log.jsonl` | error |
| 7 | Provenance coverage | `provenance-validate` (only if `ingestRequires` includes `provenance`) | warning |
| 8 | Domain-specific rules | delegate to consumer's declared `lintRules` skills | varies |

4. **Aggregate findings** — group by severity, deduplicate across checks.
5. **Auto-fix** (if `--fix`) — apply safe fixes only:
   - Rebuild `index.md` from filesystem state (fixes check 5)
   - Insert missing cross-reference links (fixes check 4)
   - Backfill missing log fields where deterministic (fixes check 6)
6. **Log operation** — call `memory-log-append` with op `lint` and finding counts.
7. **Report** — emit structured report grouped by severity.

## Check Details

### Broken @-mentions (check 1)
Delegates to existing `mention-lint` and link-check skills. Every `@`-reference and relative path in memory pages must resolve to an existing file. Broken references are severity `error`.

### Orphan pages (check 2)
Walks all `derivedPages` paths and builds an inbound-reference graph. Pages with zero inbound links from other memory pages or the index are flagged as orphans. Severity `warning` because orphans may be entry points.

### Stale claims (check 3)
Compares memory page claims against their source material using `doc-sync` drift detection. When a source has changed and the memory page hasn't been updated, flags the specific stale sections. Severity `error` because stale claims actively mislead.

### Missing cross-references (check 4)
Extracts named entities and domain concepts from all pages. When a concept appears in 3+ pages but has no dedicated page or anchor, suggests creating a cross-reference page. Severity `suggestion`.

### Index drift (check 5)
Compares filesystem contents under the topology's page directories against entries in `index.md`. Reports pages missing from the index and index entries pointing to nonexistent files. Severity `warning`.

### Log integrity (check 6)
Validates the `.log.jsonl` file line by line: each line must be valid JSON with required fields (`ts`, `op`, `consumer`, `actor`). Checks for monotonic timestamps (append-only guarantee) and sequence gaps. Severity `error`.

### Provenance coverage (check 7)
Only runs when the consumer's `ingestRequires` includes `provenance`. Delegates to `provenance-validate` to ensure every derived page has a valid provenance chain. Severity `warning`.

### Domain-specific rules (check 8)
Reads `lintRules` from the consumer's manifest and delegates to each declared skill. Each rule returns findings with its own severity. This allows consumers to inject domain-specific validation without modifying the kernel.

## Output Format

```
memory-lint report for <consumer>
================================

ERRORS (2)
  [broken-ref] pages/api-design.md:42 — @schemas/auth-flow.md does not exist
  [stale-claim] pages/deployment.md:18 — source changed 2026-04-10, page last updated 2026-03-15

WARNINGS (3)
  [orphan] pages/legacy-migration.md — no inbound references
  [index-drift] pages/new-feature.md — exists on disk but missing from index.md
  [provenance] pages/summary.md — no provenance record found

SUGGESTIONS (1)
  [missing-xref] "authentication" appears in 4 pages — consider a dedicated page

Summary: 2 errors, 3 warnings, 1 suggestion
Auto-fixable: 2 (run with --fix)
```

## Error Handling

- Individual check failures do not abort the overall lint run. Failed checks are reported with severity `error` and a diagnostic message.
- If the consumer cannot be resolved, abort with a clear message listing available consumers.
- If the topology path is missing or malformed, abort with the specific missing field.

## Schema Reference

@semantic-memory/schemas/memory-topology.md

## Examples

```
# Lint the sdlc-complete consumer's memory
memory-lint --consumer sdlc-complete

# Lint with auto-fix, errors only
memory-lint --consumer research-complete --fix --severity=error

# Lint auto-detected consumer (inferred from current directory)
memory-lint

# Lint all consumers in the workspace
memory-lint --consumer all
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
