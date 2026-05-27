---
ref_id: REF-XXX
title: "Short descriptive title of paper"
authors:
  - "Lastname, F."
  - "Lastname2, F."
year: YYYY
source_type: peer_reviewed_conference    # one of: preprint | peer_reviewed_conference | peer_reviewed_journal | technical_report | survey | codebase | research_gap
venue: "NeurIPS 2024 / arXiv:NNNN.NNNNN"
url: "https://arxiv.org/abs/NNNN.NNNNN"
pdf_hash: "sha256-hex-of-pdf"
---

# REF-XXX: {Paper Title}

<!--
EXPANDED reference template — 21 sections. Use instead of reference-canonical.md
(15 sections) when the paper warrants deeper analysis:
- Peer-reviewed papers with substantial empirical scope (benchmarks + ablations + comparisons)
- Foundational papers that establish a research lineage
- Papers with significant limitations / open questions worth tracking explicitly
- Papers that demand a comparison-with-related-work section to be useful

The expanded template extends the canonical structure with: Conceptual Framework
(§6), Benchmark Results (§9), Ablation Studies (§10), Key Insights (§11),
Limitations and Risks (§12), Comparison with Related Work (§15), Future Research
Directions (§16). The section *content* is the load-bearing distinction, not the
numbering. See reference-templates-guide.md for the canonical↔expanded mapping.
-->

## 1. Citation

{Author list} ({year}). *{Title}* ({venue}). {URL}

## 2. Document Profile

- **Topic**: {one-line topic}
- **Methods**: {what was done}
- **Domain**: {primary + adjacent subject categories}
- **Status**: {preprint / peer-reviewed venue / technical report — with venue note}

## 3. Referenced By

(To be populated as downstream documents cite this paper.)

### 3b. Profiles

- {Profile creation candidates}

## 4. Executive Summary

{2-4 paragraphs covering contribution, headline result, why it matters.}

## 5. Summary

{Extended narrative. Use sub-headings as needed.}

## 6. Conceptual Framework

{The theoretical scaffolding the paper proposes or operates within. Diagrams of relationships between key concepts. This section is for papers whose contribution is partly conceptual rather than purely empirical — e.g., new framework for thinking about a problem, taxonomy, decision matrix.}

### 6a. Key Concepts

- **{Concept name}** — {definition + how the paper uses it}
- ...

### 6b. Conceptual Diagram (optional)

```
{ASCII or mermaid diagram of conceptual relationships}
```

## 7. Architecture / Method

{Concrete algorithmic / experimental setup. Include a diagram.}

## 8. Implementation Details

{Model size, compute, datasets, hyperparameters, code availability.}

## 9. Benchmark Results

{The metrics tables. One table per benchmark suite. Include numbers, not just verbal claims.}

| Benchmark | Baseline | This work | Δ |
|-----------|---------:|----------:|---:|
| {bench-1} | {N} | {M} | {+/-X%} |
| {bench-2} | {N} | {M} | {+/-X%} |

### 9a. Result Interpretation

{What does this configuration of results mean? Which baselines are the relevant ones to beat? Where are the gains concentrated?}

## 10. Ablation Studies

{Which components of the method matter? Order ablations from largest to smallest effect.}

| Variant | Result | Δ vs full | Interpretation |
|---------|-------:|----------:|----------------|
| Full method | {N} | — | — |
| Without {component A} | {N} | {-X%} | {what this shows} |
| Without {component B} | {N} | {-X%} | {what this shows} |

## 11. Key Insights

{The "so what" of the empirical findings. 3-7 concrete insights, each anchored in specific evidence from the paper. This is where you separate the paper's marketing message from what it actually demonstrates.}

1. **{Insight header}** — {evidence + interpretation}
2. ...

## 12. Limitations and Risks

{What the paper does NOT establish. Acknowledged limitations + your own analysis of methodological caveats.}

### 12a. Acknowledged Limitations

- {Limitation the authors note explicitly} — {paper section reference}

### 12b. Methodological Caveats

- {Limitation worth noting even if not acknowledged} — {your reasoning}

### 12c. Downstream Risk

- {Risk introduced by the method's adoption} — {scenario}

## 13. Key Quotes

> "Direct quote demonstrating the paper's central claim." (paper §X)

> "Quote with a specific metric or finding." (paper §Y, p. NN)

## 14. Cross-References

In-corpus connections:
- **REF-YYY** ({short title}) — {relationship}

Citation network: [REF-XXX-citations.md](../citations/REF-XXX-citations.md)

## 15. Comparison with Related Work

{Where does this paper sit relative to alternatives? Use this section when there's a non-trivial answer — i.e., the paper is in active competition with other approaches.}

| Approach | Strengths | Weaknesses | When to prefer |
|----------|-----------|------------|----------------|
| This paper's method | {…} | {…} | {…} |
| {Alternative A} | {…} | {…} | {…} |
| {Alternative B} | {…} | {…} | {…} |

## 16. Future Research Directions

{What the paper suggests OR what you think should follow. Be specific about open questions and what would close them.}

- **{Direction 1}** — {what's needed and why}
- **{Direction 2}** — {…}

## 17. External References

- Source page: {URL}
- PDF: {URL or local path}
- Code: {if applicable}
- Project page: {if applicable}

## 18. BibTeX Entry

```bibtex
@inproceedings{citekey,
  title     = {Paper Title},
  author    = {Lastname, First and Lastname2, First},
  booktitle = {Proceedings of {Venue}},
  year      = {YYYY},
  url       = {https://arxiv.org/abs/NNNN.NNNNN}
}
```

## 19. Revision History

- YYYY-MM-DD — Initial induction ({agent / human identifier}).

## 20. Document Classification

- **Tier**: {Primary research | Survey | Technical report}
- **Quality**: {A / A- / B / C / D — with rationale}
- **Relevance**: {VERY HIGH / HIGH / MEDIUM / LOW}

## 21. Implementation Relevance

Affects downstream / cross-project components:
- **{component name}** — {connection}
