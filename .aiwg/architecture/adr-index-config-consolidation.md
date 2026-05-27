# ADR: Consolidate index configuration into aiwg.config with a validated schema

**Status**: Accepted
**Date**: 2026-05-26
**Issue**: #1491 (epic #1487)
**Deciders**: operator (config-home fork resolved via interactive decision)

## Context

Index configuration was split across two files with inconsistent guarantees:

| File | Format | Validated | Holds |
|------|--------|-----------|-------|
| `.aiwg/aiwg.config` | JSON | editor-facing schema only | providers, delivery, parallelism, installed |
| `.aiwg/config.yaml` | YAML | **not validated** | `index.graphs` (the index contract) |

The rich `index.graphs` contract — node graphs, edge graphs with `edgeExtraction`, profile graphs with `filenamePattern`, and the `indices.manifest[]` markdown-view list — had **no schema**, so malformed graph defs, bad regexes, or typo'd keys failed silently or at runtime instead of at validate time. Two config files, two formats, one schema-checked: a maintenance smell and a footgun for operators authoring corpus configs.

Three readers consume `index.graphs`:
- `src/artifacts/types.ts` `loadUserGraphConfigs` (TS, reads config.yaml via YAML)
- `src/artifacts/cli.ts` `hasMarkdownIndicesManifest` (TS, YAML)
- `corpus-index-build/build.py` `load_config` (Python, PyYAML)

## Decision

**Consolidate the `index` block into `.aiwg/aiwg.config` (JSON), under a published, validated schema. (Option (a) of #1491.)**

1. Extend `aiwg.config.v1.json` with an `index` property, defined via reusable `$defs` (`IndexGraphDef`, `IndexMarkdownIndices`) so a future standalone `index-config.v1.json` could `$ref` them if ever needed.
2. Add a hand-rolled `validateIndexConfig()` in `src/config/aiwg-config.ts` (no new runtime dependency — consistent with the codebase's deliberate config-validation dependency-avoidance). `aiwg index build` rejects malformed config with actionable errors; `aiwg doctor` validates and flags the deprecated config.yaml location.
3. Migrate all three readers to read `index.graphs` from `.aiwg/aiwg.config` first, falling back to `.aiwg/config.yaml` with a deprecation warning. Because JSON is valid YAML — and `aiwg.config` is JSON — `build.py` reads it with `json.loads`, dropping PyYAML from its primary path.

### Migration path
Reader-level fallback (config.yaml still works, with a deprecation warning) makes the transition non-abrupt: existing corpora keep working until they move the `index:` block into `aiwg.config`. The manual move is documented in `docs/cli-reference.md`; `aiwg doctor` surfaces a warning pointing the operator to it.

## Reasoning

1. **Why consolidate at all?** A single validated config file removes the "two files, one validated" smell and gives operators authoring `index.graphs` the same validate-time safety they already get for providers/delivery/parallelism.
2. **Why `aiwg.config` (JSON) as the home, not a validated `config.yaml`?** The operator chose full consolidation over validate-in-place. JSON is already the validated, schema-referenced config; folding `index` in means one file, one format, one schema — and JSON's status as a YAML subset means `build.py` can read it without a YAML dependency.
3. **Why hand-rolled validation, not ajv?** There is no existing ajv pipeline for `aiwg.config` (it is `JSON.parse`d at runtime; the schema is for editors). Adding ajv for one block is disproportionate and counter to the codebase's pattern (`config-gitignore.mjs` inlines logic "to avoid TS import complexity"). A focused validator returning actionable messages satisfies the AC.
4. **Why keep config.yaml fallback?** Hard-removing it would break every existing corpus on upgrade. Fallback + deprecation is the standard non-breaking migration; the abrupt removal can follow once corpora have moved.
5. **Why not do the full builder rework here?** #1490 reconciles the two builders and reworks `build.py`'s rendering. This ADR changes only the config *source* (surgical), so #1490 doesn't pay the build.py-config tax twice — schema-first, as the epic sequences.

## Consequences

**Positive**: one validated config file; validate-time rejection of malformed index defs; `build.py` loses its PyYAML hard-dependency on the primary path; schema published for editor autocomplete.

**Negative / trade-offs**: a breaking change requiring corpora to migrate (mitigated by fallback + deprecation + docs); three readers now carry a two-source read path until the fallback is eventually removed; the `indices` manifest sub-shape and the graph-def sub-shape coexist under `index.graphs` (intrinsic to the current two-builder design — #1490 territory).

## References

- #1491 — this issue
- #1487 — index architecture epic
- #1490 — builder reconciliation (consumes this schema; removes the config.yaml fallback when build.py is reworked)
- `vscode-extension/schemas/aiwg.config.v1.json` — the extended schema
- `src/config/aiwg-config.ts` — `validateIndexConfig()`
