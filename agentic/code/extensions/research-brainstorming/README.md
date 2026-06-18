# Research Brainstorming Extension

Research brainstorming is the loose, early-stage complement to
`research-complete`. It uses wiki memory and the KB graph for ideas that are not
ready for `REF-*` source structure, GRADE assessment, or citation-grounded
synthesis.

## Composition

This extension composes existing AIWG surfaces:

- `kb-ingest`, `aiwg kb`, and knowledge-base templates for wiki pages.
- Semantic-memory kernel skills: `memory-ingest`, `memory-query-capture`,
  `memory-log-append`, and `memory-lint`.
- `aiwg index neighbors --graph kb --node <slug>` for adjacent concepts,
  entities, syntheses, source summaries, and prior brainstorm notes.
- `research-query` for citation-backed corpus answers.
- `induct-research` for mature `REF-*` candidates.
- `research-store` and `.aiwg/research/working/` for promoted research tasks.

## Corpus-Root Research Repositories

The extension also supports the proven corpus-root layout used by
`~/dev/research/research-papers`:

```text
documentation/references/   # REF-XXX 15-section analysis files
documentation/citations/    # REF-XXX-citations sidecars and backlinks
documentation/radar/        # live freshness/GRADE radar sidecars
documentation/profiles/     # PROF-* entity profiles and graph edges
indices/                    # generated cross-reference and graph indices
pdfs/full/                  # archived PDFs
sources/web/                # archived web snapshots
bibliographies/master.bib   # BibTeX
```

In that layout, brainstorming stays lightweight until promotion. Promotion
targets should follow the repository contract:

- Research questions and acquisition targets stay in working notes until they
  name an actual source or corpus gap.
- A promoted source candidate becomes a `REF-XXX` induction candidate and must
  go through source archival, 15-section reference analysis, citation sidecar,
  live radar sidecar, entity profile updates, bibliography updates, index
  rebuild, and the repo's `research-lint` / `research-quality-audit` gates.
- Backlinks are mandatory: citation sidecars need incoming/outgoing consistency,
  and `PROF-*` profile references need reciprocal REF links.
- Generated `indices/` are retrieval aids, not hand-authored brainstorm notes.

## Source Labels

Every brainstorming output must label each meaningful item as one of:

- `user-idea`: supplied by the operator.
- `model-suggestion`: generated during brainstorming and not yet verified.
- `citation-backed`: grounded in an existing `REF-*`, source summary, or
  research-query result.

Speculative claims stay in wiki memory until promoted. Do not require GRADE,
`REF-*`, or citation formatting for `user-idea` and `model-suggestion` notes.
Require citation and quality handling only when a note becomes a research claim,
structured synthesis, or source candidate.

## Workflow

1. Capture loose ideas in `.aiwg/kb/brainstorming/` using
   `research-brainstorm`.
2. Retrieve neighboring context with `research-brainstorm-query`, backed by
   `aiwg index neighbors --graph kb`.
3. Generate exploration outputs: idea maps, question trees, competing
   hypotheses, synthesis sketches, and exploration plans.
4. Promote mature material with `research-brainstorm-promote` into research
   questions, acquisition targets, `REF-*` candidates, gap reports, or synthesis
   report outlines.
5. Run the normal research framework once promoted material makes a factual
   research claim.

## Current Research Grounding

The design follows current GraphRAG/KG-RAG direction: graph retrieval preserves
relationships that flat chunk retrieval loses, but incomplete graphs can mislead
retrieval and synthesis. For that reason, this extension keeps source labels,
neighbor provenance, and promotion gates explicit.

- GraphRAG survey: https://arxiv.org/abs/2501.00309
- KG-guided RAG: https://arxiv.org/abs/2502.06864
- KG-RAG under knowledge incompleteness: https://arxiv.org/abs/2504.05163
- W3C PROV overview: https://www.w3.org/TR/prov-overview/
- GRADE Working Group: https://www.gradeworkinggroup.org/

## Storage

Default brainstorming notes live under:

```text
.aiwg/kb/brainstorming/
```

Promotion targets live under:

```text
.aiwg/research/working/
.aiwg/research/reports/
.aiwg/research/findings/
```

The KB graph remains the retrieval authority. Rebuild or query it with:

```bash
aiwg index build --graph kb
aiwg index neighbors --graph kb --node <slug>
```
