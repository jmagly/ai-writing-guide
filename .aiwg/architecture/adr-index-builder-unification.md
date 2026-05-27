# ADR: Unify the two index builders — port corpus-index-build to TypeScript

**Status**: Accepted
**Date**: 2026-05-26
**Issue**: #1490 (epic #1487)
**Deciders**: operator (Option A/B/scope fork resolved via interactive decision)
**Follows**: adr-index-config-consolidation (#1491)

## Context

Two builders read overlapping parts of the same config but produced different outputs in different languages:

| | `aiwg index build` | `corpus-index-build/build.py` |
|---|---|---|
| Language | TypeScript | Python |
| Output | JSON graphs (`.aiwg/.index/*`) | markdown views (`indices/*.md`) |
| Parse | scans corpus | **scans corpus again** |

The system shipped a "these are two different things" warning box to manage the confusion. The corpus was parsed twice, and the markdown renderers — 12 of them, plus topic/method/venue/size classifier taxonomies — lived only in Python, invisible to the TS index pipeline. #1491 unified the config; #1490 addresses the builders.

The fork: **Option A** (teach `aiwg index build` to render markdown; retire/wrap build.py) vs **Option B** (keep the split but have build.py render from the TS builder's already-computed JSON). Grounding the choice surfaced that "parse once" (AC2) is the expensive part either way — build.py's classifiers are not in the TS node JSON, so B requires moving them into the shared representation and A requires porting them to TS.

## Decision

**Full A: port build.py's renderers and classifier taxonomies to TypeScript; `aiwg index build` renders the markdown views natively in the same process; retire build.py.**

The operator chose the cleanest long-term end state (all-TS, single language, single process, true parse-once) over the lower-risk staged options, accepting the higher up-front port cost.

### Implementation
- New `src/artifacts/corpus-views/`:
  - `taxonomies.ts` — verbatim port of TOPIC/METHOD/VENUE/SIZE/PIPELINE pattern tables (order is load-bearing: `classifyFirst` returns the first match).
  - `ref-parser.ts` — RefRecord parsing, classification, author normalization, size extraction, citation-edge parsing, source checksum.
  - `renderers.ts` — the 12 renderers, byte-faithful to the Python output (per-renderer trailing-newline behavior preserved).
  - `build.ts` — `buildCorpusViews()`: resolves the view manifest, parses the corpus once, renders, writes, with checksum-based staleness skip.
- `aiwg index build` (`cli.ts handleBuild`) invokes `buildCorpusViews()` in the same process after building JSON graphs. `--graph <view>` renders a single view; default/`--all` renders the configured set. No-op when there is no `documentation/references/` corpus.
- `build.py` deleted; `corpus-index-build` SKILL rewritten as a thin pointer to `aiwg index build`.
- The "two different things" warning box (`maybePrintMarkdownIndicesHint`) removed.

### Regression control
build.py was kept during development as a **golden oracle**: a fixture corpus (`test/fixtures/corpus-views/`) was rendered by build.py, the output captured (timestamp normalized), and the TS renderers diffed against it until all 12 views matched byte-for-byte. The golden fixtures are committed and the diff runs in CI (`test/unit/artifacts/corpus-views.test.ts`), so the port stays faithful.

## Reasoning

1. **Why Full A over B or staged A-delegation?** Operator preference for the clean end state. A-delegation (shell to build.py) keeps a Python dependency and doesn't parse once; B keeps the cross-language split. Full A removes both: one language, one process, true parse-once.
2. **Why an oracle-diff port rather than a from-scratch rewrite?** The renderers and classifiers encode years of tuning (topic taxonomies, author normalization, size heuristics). Byte-diffing against build.py output guarantees behavioral parity and turns "port ~700 lines of Python" from a HIGH-risk rewrite into a verified transformation.
3. **Why a thin-pointer skill, not deletion?** The `corpus-index-build` skill's triggers ("build the research indices", "rebuild corpus graphs") remain valuable discovery aids; the skill now routes users to `aiwg index build` rather than carrying a duplicate engine. The issue explicitly allowed "thin wrapper or retired".
4. **Why no-op without a corpus?** `aiwg index build` runs in every AIWG project; markdown views are meaningful only for research corpora, so rendering is gated on `documentation/references/` existing.

## Consequences

**Positive**: AC1 (single entrypoint), AC2 (parse once — same process), AC3 (warning box gone) all met. One language to maintain; classifiers now live alongside the rest of the index pipeline; no PyYAML/Python runtime needed for indexing.

**Negative / trade-offs**: ~700 lines of Python rendering+classification now live as TS (a real maintenance surface, mitigated by the committed golden fixtures). The classifier taxonomies are duplicated knowledge that must track corpus conventions — the golden test will catch drift. Removing the config.yaml fallback (deprecated in #1491) is deliberately left for a later cleanup once corpora have migrated.

## References

- #1490 — this issue; #1487 — index epic; #1491 — config consolidation (prerequisite)
- `src/artifacts/corpus-views/` — the native renderers
- `test/fixtures/corpus-views/` + `test/unit/artifacts/corpus-views.test.ts` — golden oracle parity
- historical: `corpus-index-build/build.py` (retired in this change)
