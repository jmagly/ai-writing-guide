# Research Framework

> **First time using AIWG?** Begin with [Install, Connect, and Verify](install-connect-verify.md). This guide assumes
AIWG is connected to the target project and your provider session can read the deployed context.

You're doing academic or technical research. Finding papers manually is slow. Tracking what you've read and what it says is a spreadsheet nightmare. When you cite something, you're never sure you're representing the source correctly.

The research framework handles the mechanical parts: discovery, acquisition,
source-grounded notes, citation management, quality assessment, and archive
organization. You remain responsible for interpretation and final synthesis.

---

## Before You Start

Complete [Install, Connect, and Verify](install-connect-verify.md) first. If
you intentionally run a targeted deployment instead of the complete system,
`aiwg use research` remains the manual command for this framework.

The first useful result should be a traceable literature note, source list, or
corpus health report. Verify that claims cite stored source content before you
use them.

---

## The research workflow

```
discover → acquire → document → cite → assess quality → synthesize → find gaps → archive
```

Each stage has dedicated commands. Run them in sequence or jump to wherever you are.

---

## Finding papers

```bash
/research-discover "transformer attention mechanisms" --limit 20
```

Searches configured academic sources, ranks results by relevance and available
metadata, and returns a prioritized list. The `discovery-agent` can compare the
query with your existing corpus and surface likely gaps.

Filter by recency, citation count, or open access:

```bash
/research-discover "RLHF alignment techniques" --year-min 2023 --open-access-only
```

---

## Acquiring papers

```bash
/research-acquire --from-results last --output papers/
```

Downloads PDFs with Unpaywall integration for open-access versions, extracts
metadata, validates against FAIR principles, and assigns persistent `REF-XXX`
identifiers so later notes can refer back to stored sources.

---

## Documenting papers

```bash
/research-document papers/attention-is-all-you-need.pdf
```

Uses RAG-based summarization against the actual PDF content — not from training data. Produces a structured literature note with:

- Key findings and contributions
- Methodology summary
- Limitations acknowledged by the authors
- Connections to other papers in your corpus
- GRADE quality assessment

This is the core citation-safety mechanism. The note should tie its claims to
source text stored in the corpus.

---

## Citation management

```bash
/research-cite REF-042 --style apa
```

Generates properly formatted citations in 9,000+ styles from stored metadata. No manual formatting.

Check all citations in a document for accuracy:

```bash
/verify-citations path/to/paper.md
```

Flags citations that do not match stored source metadata or source content in
your corpus. Treat the result as a review queue for misquotes,
misattributions, and unsupported page references.

---

## Quality assessment

Every paper gets a GRADE score (Grading of Recommendations, Assessment, Development and Evaluations):

- **High**: Systematic reviews, RCTs, large cohort studies
- **Moderate**: Smaller controlled studies, consistent observational evidence
- **Low**: Case reports, expert opinion, early-stage findings

```bash
/quality-assess REF-042
```

When you cite low-quality sources, the framework flags it and suggests appropriate hedging language. You can still use the source — you just do it honestly.

---

## Corpus health

```bash
/research-status
```

Shows corpus statistics: total papers, quality distribution, coverage by topic, papers with incomplete metadata, and citations that need verification. The `corpus-health` skill gives you a snapshot of where your research stands.

---

## Finding gaps

```bash
/research-gap "transformer fine-tuning approaches"
```

Analyzes your corpus against the query topic to identify what's missing — research questions that aren't answered by what you have, contradictions between sources that need resolution, and time periods with thin coverage.

---

## Synthesizing knowledge

```bash
/research-document --synthesize "attention mechanisms"
```

Produces a synthesis note connecting related papers in your corpus — agreements, contradictions, evolution of the idea over time. This is where individual literature notes become connected knowledge.

---

## Archiving the corpus

```bash
/research-archive --verify-integrity
```

Packages the research corpus following OAIS standards: SHA-256 integrity verification, provenance tracking for all derivations, version control for notes, and reproducibility validation so anyone can reconstruct your research process.

---

## Key references

- `/corpus-health` — Corpus health report
- `/research-status` — Full research status dashboard
- `/grade-report` — GRADE quality distribution across corpus
- `@agentic/code/frameworks/research-complete/README.md` — Full framework documentation
