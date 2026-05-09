# ADR: Implementation Plan — RLM × Index Sub-Features (#1203, #1207, #1204, #1208)

- **Status**: Proposed
- **Date**: 2026-05-09
- **Parent ADR**: [adr-rlm-index-integration.md](./adr-rlm-index-integration.md)
- **Issues**: #1203 (cache), #1207 (views), #1204 (enrichment), #1208 (drift audit)
- **Predecessor (landed)**: #1206 (`--neighbors-of` graph-bounded recursion) — runtime gap closed in `e08068fc`

## Context

The parent ADR (`adr-rlm-index-integration.md`) established the three context-bounding axes (glob, query-via-index, graph) and named four follow-up sub-issues. Each issue carries proposal text and acceptance criteria but no implementation-level wiring spec. This ADR fills that gap with concrete module layout, type signatures, integration points, and test strategy so the implementation pass for each can proceed without re-deriving design.

The four features share infrastructure: they all read from `aiwg index`, produce or consume RLM dispatches, and persist artifacts under either `.aiwg/index/` or `.aiwg/working/`. Cross-feature dependencies are real and constrain the build order:

```
#1203 (cache)            ──┐
                           ├──> #1207 (views — uses cache for refresh)
#1206 (neighbors-of) ✓ ────┘

#1204 (enrichment) ──> #1208 (drift audit — needs semantic.* fields to validate)
```

## Decision

Implement in the order: **#1203 → #1207 → #1204 → #1208**, with each feature landing as a single coherent commit + tests, following the patterns below.

## Module Layout

All new code under `src/artifacts/` (existing index surface) and `src/cli/handlers/` (existing handler surface). No new top-level directories.

```
src/artifacts/
├── cli.ts                       # existing — extend switch with new subcommands
├── cache/                       # NEW (#1203)
│   ├── hash.ts                  # deterministic hash composition
│   ├── store.ts                 # filesystem cache I/O
│   ├── policy.ts                # eviction, age cutoff
│   └── types.ts                 # CacheEntry, CacheManifest interfaces
├── views/                       # NEW (#1207)
│   ├── definition.ts            # YAML schema + parser
│   ├── builder.ts               # invokes RLM, persists results
│   ├── refresh.ts               # change-driven + scheduled refresh
│   └── types.ts                 # ViewDefinition, ViewResult interfaces
├── enrichment/                  # NEW (#1204)
│   ├── prompt.ts                # the canonical extraction prompt
│   ├── orchestrator.ts          # dispatches /rlm-batch, merges via index set
│   └── types.ts                 # SemanticFields interface
└── audit/                       # NEW (#1208)
    ├── drift.ts                 # divergence detection logic
    ├── thresholds.ts            # configurable thresholds
    └── reporter.ts              # actionable output formatting
```

## Feature 1 — Result Cache (#1203)

### CLI surface

```bash
# Existing rlm-query / rlm-batch gain two flags
/rlm-query <pattern> "<prompt>" [--no-cache] [--cache-only]
/rlm-batch <pattern> "<prompt>" [--no-cache] [--cache-only]

# NEW top-level subcommand routed via aiwg rlm-cache <op>
aiwg rlm-cache list
aiwg rlm-cache evict <hash>
aiwg rlm-cache evict --older-than 30d
aiwg rlm-cache stats
aiwg rlm-cache clear        # explicit destructive op, prompts confirmation
```

### Hash composition (deterministic)

```typescript
// src/artifacts/cache/hash.ts
export interface CacheKey {
  inputs: Array<{ artifactId: string; contentHash: string }>;
  query: string;
  subPrompt: string;
  model: string;
  aggregateStrategy: string;
}

export function computeHash(key: CacheKey): string {
  const sortedInputs = [...key.inputs].sort((a, b) =>
    a.artifactId.localeCompare(b.artifactId)
  );
  const canonical = JSON.stringify({
    inputs: sortedInputs,
    query: key.query,
    subPrompt: key.subPrompt,
    model: key.model,
    aggregateStrategy: key.aggregateStrategy,
  });
  return createHash('sha256').update(canonical).digest('hex');
}
```

`contentHash` comes from the index. New artifacts have a content hash today; if not, this feature requires backfilling that field as a prerequisite — verify before starting.

### Storage

```
.aiwg/working/rlm-cache/{hash}/
├── result.json
├── manifest.json
└── metadata.json
```

`metadata.json`:
```json
{
  "hash": "...",
  "query": "...",
  "subPrompt": "...",
  "model": "claude-sonnet-4-6",
  "createdAt": "2026-05-09T00:00:00Z",
  "tokensIn": 12345,
  "tokensOut": 678,
  "costUsd": 0.0234
}
```

### Integration points

| Hook | What changes |
|---|---|
| `src/artifacts/cli.ts` `main()` switch | Add `case 'rlm-cache':` (or split into a sibling handler — see below) |
| `src/cli/handlers/subcommands.ts` | New `rlmCacheHandler: CommandHandler` (delegates to `src/artifacts/cache/cli.ts` for clean separation from `aiwg index`) |
| Cost report | New columns: `cache_hit_count`, `cache_miss_count`, `tokens_saved` |

Decision: cache is its own top-level handler (`aiwg rlm-cache <op>`), not nested under `aiwg index`. Cache is RLM concern, not index concern; the index is just the source of input identifiers + content hashes.

### Test strategy

- `test/unit/artifacts/cache/hash.test.ts` — hash determinism (same inputs → same hash, ordering invariance), invalidation (file edit → different hash)
- `test/unit/artifacts/cache/store.test.ts` — read/write/list/evict round trips
- `test/integration/rlm-cache-e2e.test.ts` — full path: dispatch RLM → cache hit on second call → `--no-cache` bypasses → `--cache-only` fails on miss

### Acceptance gates (extends issue acceptance criteria)

- [ ] `aiwg rlm-cache <op>` registered in handler dispatch + appears in `aiwg help`
- [ ] Cost report distinguishes hits/misses
- [ ] Default age-based eviction at 30d (configurable via `.aiwg/aiwg.config` `rlm.cache.maxAgeDays`)
- [ ] Cache miss never blocks (errors degrade to "no cache hit, computing")
- [ ] CI: existing tests stay green; new tests pass

---

## Feature 2 — Materialized Views (#1207)

### Depends on

- #1203 cache (refresh leverages cache for unchanged inputs)
- Index `watch` capability for change-driven triggers

### CLI surface

```bash
aiwg index views add <name>             # interactive scaffold of definition YAML
aiwg index views list                   # all views with freshness
aiwg index views show <name>            # current results
aiwg index views build [<name>]         # refresh all or one
aiwg index views remove <name>          # delete definition + results
```

### View definition schema

`.aiwg/index/views/<name>.yaml`:

```yaml
name: use-cases-missing-acceptance-criteria
description: Use cases without an explicit acceptance-criteria section
producer: rlm-batch
inputs:
  glob: ".aiwg/requirements/UC-*.md"
  # OR mutually exclusive:
  # query: "type:use-case"
  # OR:
  # neighbors-of: <id>
  #   depth: 2
  #   direction: both
prompt: |
  Determine if this use case has an explicit acceptance-criteria section.
  Return JSON: {"missing": true|false, "reasoning": "..."}
aggregate: filter-true            # one of: concat | summarize | filter-true | filter-false | json-merge
refresh:
  on_artifact_change: true
  schedule: weekly                # cron-like: never | daily | weekly | monthly
  manual_only: false
output_format: json
```

### Storage

```
.aiwg/index/views/
├── <name>.yaml                  # definition
└── results/
    ├── <name>.json              # last computed result
    └── <name>.meta.json         # freshness metadata
```

### Integration points

| Hook | What changes |
|---|---|
| `src/artifacts/cli.ts` switch | Add `case 'views':` routing to `src/artifacts/views/cli.ts` |
| `src/artifacts/views/refresh.ts` | New event handler subscribing to `aiwg index watch` change events |
| `src/artifacts/views/builder.ts` | Invokes `/rlm-batch` via the existing skill dispatch path; uses cache (#1203) for inputs |

### Test strategy

- `test/unit/artifacts/views/definition.test.ts` — schema validation, mutually exclusive input fields
- `test/unit/artifacts/views/builder.test.ts` — view build dispatches RLM with right args, persists results
- `test/integration/views-refresh.test.ts` — modify input artifact → next build refreshes; unchanged inputs hit cache

---

## Feature 3 — Semantic Enrichment (#1204)

### CLI surface

```bash
aiwg index enrich --using-rlm
aiwg index enrich --using-rlm --filter "type:use-case"
aiwg index enrich --using-rlm --force        # ignore enriched_hash, re-run
aiwg index enrich --using-rlm --dry-run      # estimate cost only
```

### Index schema additions

Per artifact entry, optional:

```yaml
semantic:
  summary: string                # one-paragraph
  declared_symbols: string[]
  citations: string[]            # REF-XXX, paths, @-mentions
  inferred_tags: string[]
  open_questions: string[]
  enriched_at: ISO8601
  enriched_by: string            # "rlm-batch"
  enriched_hash: sha256          # content hash at enrichment time
```

### Canonical extraction prompt

Single source of truth at `src/artifacts/enrichment/prompt.ts`:

```typescript
export const ENRICHMENT_PROMPT = `
Read the artifact below. Return JSON matching this schema:

{
  "summary": "<one paragraph, ≤500 chars>",
  "declared_symbols": ["<exported function/type/entity names>"],
  "citations": ["<REF-XXX | path/to/file.md | @-mention target>"],
  "inferred_tags": ["<topic keywords from content>"],
  "open_questions": ["<contradictions or open questions stated in artifact>"]
}

Be conservative — empty arrays are fine when nothing applies. Do not fabricate citations or symbols not present in the source.
`;
```

### Integration points

| Hook | What changes |
|---|---|
| `src/artifacts/cli.ts` switch | Add `case 'enrich':` routing |
| `src/artifacts/enrichment/orchestrator.ts` | Filter artifacts where `enriched_hash !== current content hash`, dispatch `/rlm-batch` over the missing set, merge results via existing `aiwg index set` |
| `aiwg index query` output | Surface `semantic.*` when present (no schema break — additive only) |

### Cost-bounded behavior

Default behavior is incremental; `--force` is required to re-enrich. `--dry-run` estimates by `(missing artifact count) × (per-artifact token cost)`.

### Test strategy

- `test/unit/artifacts/enrichment/prompt.test.ts` — JSON schema compliance of mock LLM outputs
- `test/integration/enrich-incremental.test.ts` — enrich → modify artifact → next enrich only re-processes that one

---

## Feature 4 — Drift Audit (#1208)

### Depends on

- #1204 enrichment (drift audit compares against `semantic.summary` field — must exist first)

### CLI surface

```bash
aiwg index doctor --rlm-audit
aiwg index doctor --rlm-audit --filter "type:use-case"
aiwg index doctor --rlm-audit --strict      # exit 1 on any drift
```

### Detection logic

```typescript
// src/artifacts/audit/drift.ts
export async function detectDrift(entry: IndexEntry, opts: AuditOpts): Promise<DriftResult> {
  if (!entry.semantic) return { status: 'skip', reason: 'not enriched' };

  const currentHash = await computeContentHash(entry.path);
  if (currentHash === entry.semantic.enriched_hash) {
    return { status: 'ok', reason: 'content unchanged' };
  }

  // Hash mismatch — recompute summary and compare
  const recomputed = await dispatchEnrichment(entry);
  const divergence = compareSummaries(entry.semantic.summary, recomputed.summary, opts.thresholds);

  if (divergence.exceedsThreshold) {
    return {
      status: 'drift',
      stored: entry.semantic.summary,
      current: recomputed.summary,
      keywordOverlap: divergence.overlap,
      lastEnrichedAt: entry.semantic.enriched_at,
      remediation: `aiwg index enrich --using-rlm --filter "id:${entry.id}" --force`,
    };
  }

  return { status: 'ok', reason: 'hash mismatch but semantic content unchanged' };
}
```

### Threshold configuration

`.aiwg/index/audit.config.yaml`:

```yaml
divergence:
  keyword_overlap_min: 0.70       # below this triggers drift
  symbol_change_critical: true    # any disappeared/added symbol = drift
  freshness_max_days: 90          # entries older than this flagged as stale even if content unchanged
```

### Test strategy

- `test/unit/artifacts/audit/drift.test.ts` — overlap calculation, threshold logic
- `test/integration/audit-drift-e2e.test.ts` — enrich → modify artifact → audit detects → re-enrich resolves

---

## Implementation Order & Sequencing

| Order | Issue | Why this order | Estimated scope (atomic units) |
|---|---|---|---|
| 1 | #1203 cache | Independent; unblocks #1207 refresh-cost reduction | 4 (hash, store, CLI, tests) |
| 2 | #1207 views | Uses #1203 for refresh cost; independent of #1204/#1208 | 5 (definition, builder, refresh, CLI, tests) |
| 3 | #1204 enrichment | Independent feature; required by #1208 | 4 (prompt, orchestrator, schema, tests) |
| 4 | #1208 drift audit | Validates #1204 output | 3 (drift, thresholds, CLI + tests) |

Each row should land as one coherent commit with tests. CI must be green between commits per `delivery.require_ci_green`.

## Cross-Cutting Concerns

### Provider availability

All four features dispatch RLM via `/rlm-batch` (or `/rlm-query`). The dispatch path must be available — agents reading this ADR should verify `aiwg-utils` and `rlm` addons are deployed before starting.

### Cost transparency

Every feature touches the cost report. Extend `cost-report` skill output to include:
- Cache hit ratio
- Tokens saved by cache
- View build cost (per view)
- Enrichment cost (total + per-artifact)
- Audit cost (recompute calls only)

### Rollback strategy

Each feature stores under either `.aiwg/working/rlm-cache/` (cache), `.aiwg/index/views/` (views), or extends index entries (enrichment, audit). Rollback for cache and views is `rm -rf` of the storage path. Rollback for enrichment requires removing `semantic.*` fields from the index — implement an `aiwg index enrich --reset` op as part of #1204.

## Out of Scope

- Vector embeddings for semantic similarity (#1204 uses text-based fields only)
- Cross-project cache or view sharing (each project local)
- LRU eviction (cache uses age-based only)
- View composition / view-of-views
- Auto-fixing drift (audit reports; re-enrichment is manual)

## Acceptance for this ADR

- [ ] Each of #1203, #1207, #1204, #1208 has a comment linking back to this ADR
- [ ] Implementation issues can proceed without re-deriving design decisions
- [ ] CI stays green after each feature commit
- [ ] Cost report shows new columns when feature is exercised

## References

- Parent ADR: [adr-rlm-index-integration.md](./adr-rlm-index-integration.md)
- Predecessor commits: `9ea21d36` (#1206 flags), `e08068fc` (#1206 runtime gap closure)
- REF-089 (recursive language models) — cost economics motivating cache
- REF-088, REF-086 — sub-agent coordination limits (relevant for view build parallelism)
