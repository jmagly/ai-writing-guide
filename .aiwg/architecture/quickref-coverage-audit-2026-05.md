# Quickref Coverage Audit — 2026-05-10

## Summary

The kernel-pivot epic (#1212/#1215) deployed quickref skills as the always-loaded orientation layer for each framework. Coverage of frameworks is complete (8 of 8). Coverage of **addons** is 1 of 28 (only `aiwg-utils-quickref`). Coverage of **extensions** is 0 of 7. Agents looking for addon or extension capabilities have no kernel-loaded directory pointing them at the right discover phrase — they're forced to guess or skip discovery entirely.

## Current State

### Frameworks (8 of 8 ✓)

| Framework | Quickref | Skills count |
|---|---|---|
| sdlc-complete | sdlc-quickref | 112 |
| forensics-complete | forensics-quickref | 20 |
| research-complete | research-quickref | 21 |
| media-curator | media-curator-quickref | 19 |
| media-marketing-kit | marketing-quickref | 34 |
| ops-complete | ops-quickref | 3 (extensions carry the bulk) |
| security-engineering | security-engineering-quickref | 8 |
| knowledge-base | knowledge-base-quickref | 3 |

### Addons (1 of 28)

Addons with a kernel quickref: **aiwg-utils** only.

Addons with substantial skill counts and **no quickref**:

| Addon | Skills | Capability |
|---|---|---|
| aiwg-utils | 113 | core meta-utilities (covered) |
| agent-loop | 18 | Ralph iterative loops |
| aiwg-dev | 14 | AIWG framework development tooling |
| rlm | 8 | recursive language model decomposition |
| nlp-prod | 7 | LLM inference pipeline productionization |
| prose-integration | 7 | OpenProse VM bridge |
| testing-quality | 6 | testing enforcement |
| voice-framework | 5 | voice profile system |
| doc-intelligence | 5 | doc scraping, extraction, analysis |
| semantic-memory | 5 | semantic memory operations |
| color-palette | 4 | color theory + palette tooling |
| skill-factory | 4 | skill scaffolding + packaging |
| uat-mcp | 4 | UAT via MCP connections |
| agentic-installer | 3 | reproducible installer manifests |
| aiwg-evals | 3 | KAMI-based eval framework |
| daemon | 1 | persistent daemon sessions |
| guided-implementation | 1 | bounded autonomous coding loops |
| star-prompt | 1 | repo-star prompt |
| verbalized-sampling | 1 | output diversity prompting |
| writing-quality | 1 | AI pattern detection |

Addons with 0 skills (no quickref needed — currently rule/template-only):
- agent-persistence, aiwg-hooks, auto-memory, context-curator, droid-bridge, llm-wiki, security

### Extensions (0 of 7)

All extensions extend `ops-complete` with operational domains. None have a quickref:

| Extension | Skills | Rules | Domain |
|---|---|---|---|
| sys | 3 | 4 | per-host hardware, OS, boot chains |
| net | 3 | 3 | VLANs, DNS, firewalls, tunnels |
| sec | 3 | 4 | PKI, LUKS, YubiKey, access auditing |
| dev | 4 | 4 | CI/CD pipelines, build automation |
| it | 6 | 4 | CMDB, asset management, DR |
| stream | 2 | 2 | transcoders, restreaming |
| api-adapter | 0 | 0 | (placeholder — not yet populated) |

## Gap Analysis

### Discoverability gap

`aiwg discover` works on indexed content regardless of whether a quickref exists, but agents need a **language map** — a kernel-loaded document that:

1. Names the **categories of capability** that exist beyond the framework set
2. Maps natural-language needs to curated discover phrases
3. Routes to per-bundle quickrefs when they exist, or directly to discover

Without this, the kernel has 9 framework quickrefs but no orientation layer for the addon/extension surface (~270 skills across 28 addons + 7 extensions). An agent looking for "voice profile" or "color palette review" or "VLAN audit" has no kernel-loaded breadcrumb pointing at the right query.

### Coverage gap

Per-bundle quickrefs are valuable for the densest addons (>5 skills) but adding 27 more kernel skills would blow the platform skill-listing budget that the kernel pivot was designed to fit within (Claude Code's 25%-of-context cap, OpenClaw's 150-skill hard cap, etc.).

### Solution: One combined language map

A single kernel quickref — `aiwg-language-map` — that covers:
- **Addon capability domains** (memory, loops, voice, testing, etc.) with curated discover phrases
- **Extension domains** (sys/net/sec/dev/it/stream/api-adapter) with operational discover phrases
- **Pointers to per-bundle quickrefs** when they exist (frameworks today, dense addons later)

This adds 1 kernel skill instead of 27+ and keeps the orientation layer crisp.

## Recommendations

### Immediate (this PR)

1. **Add `aiwg-language-map` kernel quickref** at `agentic/code/addons/aiwg-utils/skills/aiwg-language-map/SKILL.md` (lives alongside `aiwg-utils-quickref` since both are core utilities)
2. **Cross-link from `aiwg-utils-quickref`** so agents already in that quickref find the language map
3. **Audit document** (this file) committed under `.aiwg/architecture/`

### Follow-up (separate issue)

Per-bundle quickrefs for the densest addons — only as kernel-resident if they prove more useful than the language map's category routing. Candidates ordered by skill density:

- `agent-loop-quickref` (18 skills)
- `aiwg-dev-quickref` (14 skills)
- `rlm-quickref` (8 skills)
- `nlp-prod-quickref` (7 skills)
- `prose-integration-quickref` (7 skills)
- `voice-framework-quickref` (5 skills)
- `doc-intelligence-quickref` (5 skills)
- `semantic-memory-quickref` (5 skills)
- `testing-quality-quickref` (6 skills)
- `uat-mcp-quickref` (4 skills)

These would NOT all be kernel-loaded — only those that prove they pull their weight against the language map's category-level routing.

### Out of scope

- Extension-specific quickrefs (covered by the language map's ops-extensions section; the existing `ops-quickref` lists them)
- Quickrefs for 0-skill addons (no surface to direct to)

## Acceptance criteria

After this PR:

- [ ] `aiwg-language-map` exists and is `kernel: true`
- [ ] Running `aiwg discover "addon"` or `aiwg discover "what addons exist"` surfaces it
- [ ] The language map lists every addon with ≥1 skill plus every extension
- [ ] Each entry has a curated discover phrase that returns ≥1 useful match
- [ ] `aiwg-utils-quickref` has a "See also" pointer to the language map
