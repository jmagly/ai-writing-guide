# Tiered Context Pilot Report

Pilot area: generated provider bridge context from `src/smiths/context-pipeline`.

The pilot converts deployed artifact visibility from long-form default context into a Tier 2 quickref-style capability map. Tier 3 bodies remain available through `aiwg discover` and `aiwg show`.

## Size Measurement

Measured on 2026-06-22 with a 1,000-artifact high-volume fixture:

- 500 deployed agent entries.
- 500 deployed skill entries.
- Before: 106,361 bytes for a long-form rendered deployed-artifact index using `renderSection`.
- After: 7,361 bytes for the generated tiered bridge using `buildAgentsMd`.
- Reduction: 99,000 bytes, 93.1%.

Current repo bridge guard:

```bash
node tools/lint/context-size-guard.mjs
```

Observed output on 2026-06-22:

```text
Context bridge ceiling: 8.0 KiB.
  - AGENTS.md: 3.9 KiB (ok)
  - WARP.md: 3.9 KiB (ok)
  - .hermes.md: 0.4 KiB (ok)
  - .github/copilot-instructions.md: 3.9 KiB (ok)
```

## Routing Verification

Manual Tier 1 -> Tier 2 -> Tier 3 checks:

- Skill route: `node bin/aiwg.mjs discover "address issues"` found `skill address-issues`; `node bin/aiwg.mjs show skill address-issues` loaded the full skill body.
- Rule route: `node bin/aiwg.mjs discover "context budget rule"` found `rule context-budget`; `node bin/aiwg.mjs show rule context-budget` loaded the full rule body.
- Agent route: `node bin/aiwg.mjs discover "agent for code review"` found `agent code-reviewer`; `node bin/aiwg.mjs show agent code-reviewer` loaded the full agent body.

## Regression Coverage

- `test/unit/smiths/context-pipeline.test.ts` verifies the Tier 2 schema, discover phrases, deep-load targets, bounded examples, and 8 KiB bridge ceiling on the high-volume fixture.
- `test/unit/smiths/context-pipeline-overflow.test.ts` verifies no spillover is created and no full provider paths are inlined.
- `test/unit/smiths/context-size-guard.test.ts` verifies the bridge-size guard reports oversized default-loaded context.

## Follow-Up Work

Related tracker work: #1651 is the epic for this tiered summarization pass, and #1652 is the concrete quickref-style Tier 2 implementation issue.

- Convert additional provider-specific documentation generators that still inline long rule bodies.
- Expand Tier 2 summaries with domain-owned quickrefs where the framework owner already maintains one.
- Add CI wiring for `npm run lint:context-sizes` after regenerated bridge artifacts are refreshed in release workflows.
