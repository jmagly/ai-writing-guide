# ADR: RLM × Index Integration — Treat the Artifact Index as RLM Environment

**Status**: Accepted
**Date**: 2026-05-08
**Deciders**: Joseph Magly
**Tags**: rlm, index, integration, addon, design

---

## Context

AIWG ships two independent capabilities that share a deep semantic alignment:

- **`aiwg index`** — small, structured artifact metadata (paths, types, dependencies, neighbors) populated via `aiwg index build`. CLI surface: `query`, `deps`, `stats`, `neighbors`, `set`, `watch`. Storage: `.aiwg/index/`.

- **RLM addon** — recursive context decomposition for large file/document sets. Skills: `rlm-query`, `rlm-batch`, `rlm-search`, `fanout`, `rlm-prep`, `chunk`, `rlm-status`, `rlm-mode`. Lives at `agentic/code/addons/rlm/`.

These run in parallel today with no shared surface. Yet the artifact index is *exactly* the kind of "external environment with symbolic handles" that REF-089 (Zhang et al., 2026, GRADE: LOW pending peer review) describes as the RLM substrate. Every artifact entry is already a symbolic handle to a file plus structured metadata. Treating the index as the RLM's REPL state lets the root agent navigate the project's artifact graph without loading file contents — exactly the access pattern REF-089 prescribes.

---

## Decision

**Wire RLM and the artifact index together through opportunistic, non-coupling integration.** Neither addon depends on the other; integration features activate when both are installed.

The integration spans seven sub-issues, all derived from this baseline:

| Sub-issue | Capability | Status |
|---|---|---|
| **#1200 (this ADR)** | Baseline integration: `--use-index` flag for index-aware dispatch + opportunistic RLM-driven index build | Accepted |
| #1203 | Result cache keyed by index content-hash | Open — design captured below |
| #1204 | RLM-driven semantic enrichment of index entries | Open — design captured below |
| #1205 | Index-backed citation/provenance for RLM outputs | Open — design captured below |
| #1206 | `rlm-query --neighbors-of` for graph-bounded recursion | Open — design captured below |
| #1207 | Materialized views — RLM analyses persisted as queryable index views | Open — design captured below |
| #1208 | Content-drift audit — semantic health check via RLM | Open — design captured below |

---

## Architecture

### Three context-bounding axes

RLM operations select target context via one of three axes. This ADR formalizes the third:

| Axis | Today | After Integration |
|---|---|---|
| **Glob-bounded** | `/rlm-query "src/**/*.ts" "..."` | unchanged (default) |
| **Pattern-bounded** | (not available) | `/rlm-query --use-index "auth" "..."` queries index by keyword/type |
| **Graph-bounded** | (not available) | `/rlm-query --neighbors-of UC-007 --depth 2 "..."` follows the index graph |

The three axes are not exclusive; an operator can layer them (e.g., `--use-index --neighbors-of X`).

### Integration boundary

Detection at runtime — both addons can install independently:

```
if (rlm_installed && index_capability_present()) {
  enable_use_index_flag();
  enable_neighbors_of_flag();
  enable_rlm_driven_index_build_when_artifact_count_exceeds_threshold();
  ...
} else {
  // graceful degradation: glob-bounded only
}
```

Capability detection should query AIWG's framework registry, not test for the existence of `.aiwg/index/` directly — the user might have the index addon installed but not yet built.

### Vector A: RLM uses the index (index-aware dispatch)

`/rlm-query --use-index <query> <sub-prompt>` and `/rlm-batch --use-index <query> <sub-prompt>`:

1. Resolve `<query>` via `aiwg index query --json`
2. The candidate set is the resolved artifact paths + metadata (type, phase, declared deps)
3. Dispatch sub-agents over the candidate set instead of a glob
4. Each sub-agent receives the artifact metadata alongside its task, enabling type-aware processing

This is REF-089's "filter input via code execution" emergent pattern (p. 7) made first-class: the index *is* the filter.

### Vector B: RLM builds the index (RLM-driven index build)

`aiwg index build` opportunistically delegates to `/rlm-batch` when:

- RLM addon is installed
- Artifact count exceeds threshold (default: 500; configurable via `.aiwg/index/config.yaml`)

Each sub-agent extracts metadata from one artifact chunk; results aggregate into the index via existing `aiwg index set`. Falls back to sequential build when RLM is unavailable.

### Vector C: Graph-bounded recursion (#1206)

`--neighbors-of <id> --depth <N> --direction <fwd|rev|both>` flags resolve to `aiwg index neighbors <id>` results. This is the third bounding axis and is independent of `--use-index` (operates on a known starting artifact, not a query string).

---

## Acceptance Criteria

### For this ADR (#1200)

- ADR documents the integration design — **this document satisfies that**
- Sub-issues #1203–#1208 derived and filed — **complete**
- Detection logic is opportunistic, neither addon hard-depends on the other — **specified above**

### For follow-up implementation issues

Each follow-up issue carries its own acceptance criteria. This ADR records the design context they share.

---

## Consequences

### Positive

- Composes two existing capabilities without duplicating either
- Index becomes a richer substrate for navigation; RLM gains structured access to project topology
- Three context-bounding axes give operators precise control over RLM scope
- All integrations are opportunistic — no forced coupling

### Negative

- Adds a new failure mode: index-aware RLM behaves differently when the index is stale (mitigated by the post-commit-index-refresh rule and #1208 drift audit)
- Documentation surface area grows — every RLM skill now has a "with index" and "without index" mode
- Cross-addon detection adds complexity to the install/uninstall lifecycle

### Neutral

- Existing RLM and index users see no behavior change unless they opt in

---

## Sub-Issue Design Notes

The seven sub-issues all derive from this baseline. Their individual acceptance criteria are captured in their issue bodies; this section preserves the design rationale shared across them.

### #1203 — Result cache keyed by index content-hash

Cache key composition uses index content-hashes (not just file paths) so file edits invalidate cleanly. Storage: `.aiwg/working/rlm-cache/{hash}/`. CLI surface adds `--no-cache`, `--cache-only` flags and `aiwg rlm-cache` management subcommand. REF-089 emphasizes RLM cost as primary tradeoff; this directly addresses repeated-workload waste.

### #1204 — RLM-driven semantic enrichment

Index entries gain optional `semantic.*` fields (summary, declared symbols, citations, inferred tags, open questions, enriched_hash). Population via `aiwg index enrich --using-rlm` which delegates to `rlm-batch`. Enrichment is incremental — `enriched_hash` mismatch triggers re-enrichment.

### #1205 — Citation/provenance for RLM outputs

`rlm-batch` aggregation outputs include structured citations: `{artifact_id, content_hash, lines}`. Aggregation strategies preserve citations through merge. New `aiwg rlm-verify-citations` command validates citation freshness against current index. Maps directly to AIWG's existing citation policy.

### #1206 — `--neighbors-of` graph-bounded recursion

Adds `--neighbors-of <id>`, `--depth <N>`, `--direction <fwd|rev|both>` to `rlm-query` and `rlm-batch`. Resolves via existing `aiwg index neighbors`. Implementation surface is small — one flag triplet wired through the existing dispatch logic. Recommended as the first sub-issue to implement after this ADR lands.

### #1207 — Materialized views

View definitions in `.aiwg/index/views/<name>.yaml` declare a producer (`rlm-batch`), inputs (glob or query), prompt, aggregate strategy, and refresh trigger. `aiwg index views build` populates results; `aiwg index views show` returns them. Integrates with `aiwg index watch` for change-driven refresh. Pairs with #1203 (cache) and #1204 (enriched inputs).

### #1208 — Content-drift audit

`aiwg index doctor --rlm-audit` re-validates each enriched entry's semantic summary against current artifact content. Detects refactor-induced doc rot. Depends on #1204 (semantic fields must exist to validate against). Configurable divergence threshold; `--strict` mode for CI.

---

## Implementation Order

Recommended sequence for follow-up work:

1. **#1206 (`--neighbors-of`)** — smallest surface; validates the integration plumbing
2. **#1200 baseline `--use-index`** — feeds the rest
3. **#1203 (cache)** — infrastructure, no semantic prereqs
4. **#1204 (semantic enrichment)** — unlocks #1207, #1208
5. **#1205 (citations)** — independent of #1204
6. **#1207 (views)** — leverages #1203 and #1204
7. **#1208 (drift audit)** — depends on #1204

---

## Out of Scope

- Vector embeddings — semantic fields in #1204 are text-based only; embeddings tracked separately
- Cross-project cache or index sharing — each project's storage is local
- Replacing the `aiwg index` storage backend
- Real-time view subscription — poll-based via `aiwg index watch` is sufficient
- Many-to-many human-AI configurations from REF-169 — this is single-operator scope

---

## References

- @.aiwg/research/findings/REF-089-recursive-language-models.md — RLM paradigm (GRADE: LOW)
- @.aiwg/research/findings/REF-086-multi-agent-coordination-tax.md — coordination topology (GRADE: LOW)
- @agentic/code/addons/rlm/rules/rlm-context-management.md — RLM context rules (Rules 6-10 added 2026-05-08)
- @agentic/code/addons/aiwg-utils/rules/post-commit-index-refresh.md — post-commit index hygiene
- @agentic/code/addons/aiwg-utils/rules/context-budget.md — parallel sub-agent caps
- Gitea issue #1196 — research-corpus update epic (parent)
- Gitea issues #1200, #1203–#1208 — RLM × Index integration sub-issues
