---
name: research-brainstorm-promote
namespace: research
platforms: [all]
description: Promote selected brainstorm material into structured research questions, acquisition targets, REF candidates, gap reports, or synthesis plans.
---

# Research Brainstorm Promote

Use when a brainstorming note contains material mature enough to enter the
structured research framework.

## Promotion Targets

- Research question in `.aiwg/research/working/research-questions.md`
- Acquisition target in `.aiwg/research/working/acquisition-targets.md`
- `REF-*` candidate for `induct-research`
- Gap report item
- Synthesis report outline
- Corpus-root research repo candidate:
  - `documentation/references/REF-XXX-*.md`
  - `documentation/citations/REF-XXX-citations.md`
  - `documentation/radar/REF-XXX-radar.md`
  - `documentation/profiles/**`
  - `indices/**`, `pdfs/full/**`, `sources/web/**`, `bibliographies/master.bib`

## Procedure

1. Read the source brainstorming note.
2. Preserve original source labels (`user-idea`, `model-suggestion`,
   `citation-backed`).
3. Choose the smallest structured target that matches the maturity level.
4. If the item is not citation-backed, promote it as a question or acquisition
   target, not as a research claim.
5. If the item names a source, route it to `induct-research` as a candidate.
6. For corpus-root research repositories, require the full induction contract
   before calling the item complete:
   - archive the source under `pdfs/full/` or `sources/web/`
   - create the 15-section `documentation/references/REF-XXX-*.md`
   - create and backlink `documentation/citations/REF-XXX-citations.md`
   - create a live `documentation/radar/REF-XXX-radar.md`
   - update relevant `PROF-*` profiles and reciprocal links
   - update bibliography and rebuild indices/snapshot
   - run `research-lint` and `research-quality-audit`
7. Write a promotion record using
   `agentic/code/extensions/research-brainstorming/templates/promotion-record.md`.

## Output

Return the target artifact path, the preserved source label, missing evidence,
and the next research framework command or skill to run.
