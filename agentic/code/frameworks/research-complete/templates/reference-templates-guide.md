# Reference-doc templates — choosing the right one

The research corpus uses two complementary reference-doc templates:

| Template | Sections | Use for |
|----------|---------:|---------|
| [`reference-canonical.md`](reference-canonical.md) | **15** | Most papers. Default choice. |
| [`reference-expanded.md`](reference-expanded.md) | **21** | Foundational / peer-reviewed papers warranting deep analysis. |
| [`reference-media.md`](reference-media.md) | **15** | Videos, lectures, podcasts, talks, and interviews with timestamped transcripts. |

Both produce ref docs with YAML frontmatter (`ref_id`, `title`, `authors`, `year`, `source_type`, `venue`, `url`, `pdf_hash`), numbered section headings, and the same conventions for citation-network linking, BibTeX, revision history, and document classification. The **difference is depth** — the expanded template adds 6 sections.

The matching citation sidecar uses [`citation-sidecar.md`](citation-sidecar.md); time-based media uses the same sidecar plus its spoken-reference table. The freshness sidecar uses [`radar-sidecar.md`](radar-sidecar.md); entity profiles use [`entity-profile.md`](entity-profile.md).

## Choosing between reference templates

**Use canonical (15-section) when:**
- arXiv preprint with a focused contribution
- Practitioner blog post or technical report
- Single-result or compact methodology paper
- Codebase induction (no formal paper) or a documented gap note
- Survey paper (sections 6-7-8 cover the survey scope)
- Paper shorter than ~20 pages or with a single empirical contribution

This is the default (the large majority of ref docs).

**Use expanded (21-section) when:**
- Peer-reviewed paper with substantial empirical scope (multi-benchmark + ablations + comparisons)
- Foundational paper establishing a research lineage downstream papers benchmark against
- Paper with a conceptual framework worth tracking distinct from its empirical results
- Paper with significant acknowledged limitations or known methodological critiques
- Paper that demands a side-by-side comparison with alternatives to be useful

**When in doubt: start canonical, promote later.** A canonical doc can be promoted by inserting the expanded-only sections at their canonical positions, renumbering subsequent sections, and adding a revision-history entry. Keep the original content; new sections are additive.

**Use media when:**
- the source is a recording rather than a PDF or web article
- timestamp anchors are needed instead of page numbers
- the evidence path includes a transcript hash and source media hash
- the source records speakers, channel/feed/venue, and license posture

Do not shoehorn a podcast or lecture into the paper template just to satisfy
DOI, page-count, or BibTeX fields. If a conference talk also has a companion
paper, induct the paper with the paper template and the recording with the
media template, then cross-reference the two REFs.

## Section mapping: canonical ↔ expanded

| Canonical | Expanded | Notes |
|-----------|----------|-------|
| §1 Citation | §1 Citation | identical |
| §2 Document Profile | §2 Document Profile | identical |
| §3 Referenced By | §3 Referenced By | identical |
| §4 Executive Summary | §4 Executive Summary | identical |
| §5 Summary | §5 Summary | identical |
| — | §6 Conceptual Framework | **expanded only** |
| §7 Architecture / Method | §7 Architecture / Method | (number shift) |
| §8 Implementation Details | §8 Implementation Details | identical |
| §6 Key Findings | — | folded into §9-§11 in expanded |
| — | §9 Benchmark Results | **expanded only** |
| — | §10 Ablation Studies | **expanded only** |
| — | §11 Key Insights | **expanded only** |
| — | §12 Limitations and Risks | **expanded only** |
| §9 Key Quotes | §13 Key Quotes | same content |
| §10 Cross-References | §14 Cross-References | same content |
| — | §15 Comparison with Related Work | **expanded only** |
| — | §16 Future Research Directions | **expanded only** |
| §11 External References | §17 External References | same content |
| §12 BibTeX Entry | §18 BibTeX Entry | same content |
| §13 Revision History | §19 Revision History | same content |
| §14 Document Classification | §20 Document Classification | same content |
| §15 Implementation Relevance | §21 Implementation Relevance | same content |

## Frontmatter field reference

| Field | Required | Type | Notes |
|-------|---------:|------|-------|
| `ref_id` | yes | string | `REF-XXX` form, matches filename |
| `title` | yes | string | Full paper title, no leading `REF-XXX:` prefix |
| `authors` | yes (where extractable) | list of strings | `"Lastname, F."` form |
| `year` | yes (where known) | int | Publication year, not citation count |
| `source_type` | yes | enum | Paper templates: `preprint`, `peer_reviewed_conference`, `peer_reviewed_journal`, `technical_report`, `survey`, `codebase`, `research_gap`; media template: `video`, `audio`, `podcast`, `lecture`, `interview`, `talk` |
| `venue` | recommended | string | arXiv ID, conference, journal, or org blog |
| `url` | recommended | string | Canonical landing URL |
| `pdf_hash` | yes when PDF exists | string | SHA-256 of the PDF — the load-bearing integrity check |
| `affiliation-primary` | optional | string or PROF-O ID | Primary author's institution |
| `status` | optional | enum | `placeholder`, `pending-acquisition`, `acquisition-deficit` for partial inductions |
| `transcript_path` | media | string | Path to timestamped transcript sidecar |
| `transcript_hash` | media | string | SHA-256 of canonical transcript payload |
| `media_storage.policy` | media | enum | `copied`, `lfs`, `object-storage`, or `hash-only` |

> The GRADE quality letter is recorded in the Document Classification section as `**Quality**: A / A- / B / C / D` (the radar subsystem's GRADE extraction reads this form).
