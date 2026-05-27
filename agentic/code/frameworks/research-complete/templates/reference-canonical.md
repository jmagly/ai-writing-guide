---
ref_id: REF-XXX
title: "Short descriptive title of paper"
authors:
  - "Lastname, F."
  - "Lastname2, F."
year: YYYY
source_type: preprint            # one of: preprint | peer_reviewed_conference | peer_reviewed_journal | technical_report | survey | codebase | research_gap
venue: "arXiv:NNNN.NNNNN"        # arXiv ID, conference name, journal, or "<Org> blog"
url: "https://arxiv.org/abs/NNNN.NNNNN"
pdf_hash: "sha256-hex-of-pdf"    # SHA-256 of pdfs/full/REF-XXX-*.pdf (omit if no PDF)
---

# REF-XXX: {Paper Title}

<!--
CANONICAL reference template — 15 sections, the default for most papers (arXiv
preprints, practitioner posts, single-result/compact papers, codebase or gap
inductions, surveys < ~20 pages). For foundational / peer-reviewed papers
warranting deep analysis, use reference-expanded.md (21 sections). See
reference-templates-guide.md for the choosing rubric + section mapping.
-->

## 1. Citation

{Author list (Last, F., Last2, F., & LastN, F.)} ({year}). *{Title}* ({venue/arXiv ID}). {URL}

## 2. Document Profile

- **Topic**: {one-line topic}
- **Methods**: {what was done}
- **Domain**: {primary + adjacent subject categories}
- **Status**: {preprint / peer-reviewed / technical report — with venue note}

## 3. Referenced By

(To be populated as downstream documents cite this paper.)

### 3b. Profiles

- {Profile creation candidates: senior author(s), primary affiliation, funder if salient}
- Format: `PROF-P-firstname-lastname` / `PROF-O-org-slug` / `PROF-F-funder-slug`

## 4. Executive Summary

{2-4 paragraphs. State the paper's contribution, the headline result, and why it matters for this corpus. Quote a key statistic if available. Avoid abstract-only paraphrase — anchor in specifics.}

## 5. Summary

{Longer narrative summary. Cover methodology, key findings, and significance in depth. Use sub-headings if helpful:

### Background and Motivation
### Methodology
### Key Findings
### Implications

The goal is a self-contained explanation a reader can use without going to the PDF.}

## 6. Key Findings

{Numbered list of 4-8 concrete findings. Each finding should be a single specific claim with a metric, not a vague directional statement.}

1. **{Finding header}** — {specific claim with metric}
2. ...

## 7. Architecture / Method

{Describe the architecture, algorithm, or experimental setup. Include a diagram if appropriate (ASCII or mermaid).}

## 8. Implementation Details

{Specifics: model size, training compute, datasets, ablation conditions, hyperparameters, code availability. If specifics are unknown, mark as "pending PDF read" rather than fabricating.}

## 9. Key Quotes

{Direct quotes from the paper, attributed if from the abstract or specific section. Quotes should be high-information-density — not generic "this paper proposes X" statements.}

> "Direct quote demonstrating the paper's central claim."

> "Quote with a specific metric or finding."

## 10. Cross-References

In-corpus connections:
- **REF-YYY** ({short title}) — {how this paper relates: cites, extends, contradicts, parallels}
- **REF-ZZZ** ({short title}) — {relationship}

Citation network: [REF-XXX-citations.md](../citations/REF-XXX-citations.md)

## 11. External References

- Source page: {URL}
- PDF: {URL or local pdfs/full/REF-XXX-*.pdf path}
- Code: {if applicable}
- Project page: {if applicable}

## 12. BibTeX Entry

```bibtex
@misc{citekey,
  title  = {Paper Title},
  author = {Lastname, First and Lastname2, First},
  year   = {YYYY},
  eprint = {NNNN.NNNNN},
  archivePrefix = {arXiv},
  primaryClass = {cs.XX},
  url    = {https://arxiv.org/abs/NNNN.NNNNN}
}
```

## 13. Revision History

- YYYY-MM-DD — Initial induction ({agent / human identifier}).

## 14. Document Classification

- **Tier**: {Primary research | Survey | Technical report | Codebase | Gap note}
- **Quality**: {A / A- / B / C / D — with brief rationale referencing the GRADE scheme}
- **Relevance**: {VERY HIGH / HIGH / MEDIUM / LOW — for this corpus's themes}

## 15. Implementation Relevance

Affects downstream / cross-project components:
- **{component name}** — {how this paper informs the component's design or rationale}
- **{another component}** — {connection}

(If no implementation relevance, replace this section with a "Cross-corpus relevance" note describing how this paper connects to broader research lineages tracked in the corpus.)
