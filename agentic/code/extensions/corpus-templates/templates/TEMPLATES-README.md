# Reference Doc Templates — Choosing the Right One

This corpus uses two complementary reference-doc templates:

| Template | Sections | Use for |
|----------|---------:|---------|
| [`TEMPLATE-reference-canonical.md`](TEMPLATE-reference-canonical.md) | **15** | Most papers. Default choice. |
| [`TEMPLATE-reference-expanded.md`](TEMPLATE-reference-expanded.md) | **21** | Foundational / peer-reviewed papers warranting deep analysis. |

Both templates produce ref docs with:
- YAML frontmatter at the top (`ref_id`, `title`, `authors`, `year`, `source_type`, `venue`, `url`, `pdf_hash`)
- Numbered section headings (`## 1. Citation` ... `## 15.` or `## 21.`)
- The same conventions for citation network linking, BibTeX, revision history, and document classification

The **difference** is depth: the expanded template adds 6 sections for papers that warrant deeper treatment.

---

## Choosing between templates

### Use the **canonical** (15-section) template when:

- arXiv preprint with focused contribution
- Practitioner blog post or technical report
- Single-result paper or compact methodology paper
- Codebase induction (no formal paper)
- Survey paper (sections 6-7-8 cover the survey scope)
- Gap note (a documented research gap, not a paper)
- The paper is shorter than 20 pages or has a single empirical contribution

This is the default. About 84% of corpus ref docs use this structure.

### Use the **expanded** (21-section) template when:

- Peer-reviewed paper with substantial empirical scope (multi-benchmark + ablations + comparisons)
- Foundational paper establishing a research lineage (e.g., introduces a new method that downstream papers will benchmark against)
- Paper with a conceptual framework worth tracking distinct from its empirical results
- Paper with significant acknowledged limitations OR known methodological critiques
- Paper that demands a side-by-side comparison with alternatives to be useful for the corpus

About 12% of corpus ref docs use this structure (predominantly older inductions from the corpus's early peer-reviewed era).

### When in doubt: start canonical, promote later

If a canonical-template ref doc later proves to need the deeper analysis sections, it can be **promoted** to the expanded template:

1. Insert the new sections at the canonical positions documented in `TEMPLATE-reference-expanded.md`'s comment block
2. Renumber subsequent sections (canonical §6 Key Findings → expanded §6 Conceptual Framework → §11 Key Insights)
3. Add a revision-history entry documenting the promotion
4. Keep the original canonical content; new sections are additive

---

## Section mapping: canonical ↔ expanded

| Canonical | Expanded | Notes |
|-----------|----------|-------|
| §1 Citation | §1 Citation | identical |
| §2 Document Profile | §2 Document Profile | identical |
| §3 Referenced By | §3 Referenced By | identical |
| §4 Executive Summary | §4 Executive Summary | identical |
| §5 Summary | §5 Summary | identical |
| — | §6 Conceptual Framework | **expanded only** |
| §7 Architecture / Method | §7 Architecture / Method | identical (note number shift) |
| §8 Implementation Details | §8 Implementation Details | identical |
| §6 Key Findings (canonical position) | — | folded into §9-§11 in expanded |
| — | §9 Benchmark Results | **expanded only** |
| — | §10 Ablation Studies | **expanded only** |
| — | §11 Key Insights | **expanded only** |
| — | §12 Limitations and Risks | **expanded only** |
| §9 Key Quotes | §13 Key Quotes | same content, different number |
| §10 Cross-References | §14 Cross-References | same content, different number |
| — | §15 Comparison with Related Work | **expanded only** |
| — | §16 Future Research Directions | **expanded only** |
| §11 External References | §17 External References | same content, different number |
| §12 BibTeX Entry | §18 BibTeX Entry | same content, different number |
| §13 Revision History | §19 Revision History | same content, different number |
| §14 Document Classification | §20 Document Classification | same content, different number |
| §15 Implementation Relevance | §21 Implementation Relevance | same content, different number |

The expanded template positions its extra sections at canonical insertion points — they don't replace canonical content, they extend it.

---

## Legacy heading-only docs (no YAML frontmatter)

About 930 corpus docs (mostly pre-REF-1000) use legacy heading conventions without YAML frontmatter:

- **~825 docs** use canonical or canonical-unnumbered structure → can be backfilled with frontmatter additively (no structural change). Tracked in [issue #651](https://git.integrolabs.net/roctinam/research-papers/issues/651).
- **~125 docs** use the legacy "expanded" convention with unnumbered sections (Conceptual Framework, Benchmark Results, Ablation Studies, etc.). These already have the depth of the expanded template — they just need YAML frontmatter and optional number-normalization. Tracked as a follow-up item on #651.

When backfilling, do **not** restructure heading content silently. Preserve the existing sections; promote them to the expanded template numbering only if it improves discoverability without losing content.

---

## Frontmatter field reference

| Field | Required | Type | Notes |
|-------|---------:|------|-------|
| `ref_id` | yes | string | `REF-XXX` form, matches filename |
| `title` | yes | string | Full paper title, no leading `REF-XXX:` prefix |
| `authors` | yes (where extractable) | list of strings | `"Lastname, F."` form |
| `year` | yes (where known) | int | Publication year, not citation count |
| `source_type` | yes | enum | `preprint`, `peer_reviewed_conference`, `peer_reviewed_journal`, `technical_report`, `survey`, `codebase`, `research_gap` |
| `venue` | recommended | string | arXiv ID, conference, journal, or org blog |
| `url` | recommended | string | Canonical landing URL |
| `pdf_hash` | yes when PDF exists | string | SHA-256 of `pdfs/full/REF-XXX-*.pdf` |
| `affiliation-primary` | optional | string or PROF-O ID | Primary author's institution |
| `status` | optional | enum | `placeholder`, `pending-acquisition`, `acquisition-deficit` for partial inductions |

The `pdf_hash` field is the load-bearing integrity check — verify with `sha256sum pdfs/full/REF-XXX-*.pdf` when refreshing.

---

## Related templates

- [`../citations/TEMPLATE-citations.md`](../citations/TEMPLATE-citations.md) — citation sidecar (Outgoing + Incoming tables) — pending creation
- [`../radar/TEMPLATE-radar.md`](../radar/TEMPLATE-radar.md) — radar sidecar (GRADE re-assessment + signals + refresh history)
- [`../profiles/TEMPLATE-profile.md`](../profiles/TEMPLATE-profile.md) — entity profile (people / orgs / funders / groups)
