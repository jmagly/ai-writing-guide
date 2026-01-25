# Research Source Documentation: REF-XXX

## Metadata

```yaml
---
ref_id: REF-XXX
title: "[Paper Title Here]"
authors:
  - Last, First
  - Last, First
year: YYYY
publication_type: academic-paper  # or blog-post, documentation, book-chapter, preprint
venue: "[Conference/Journal Name]"
venue_tier: "A*"  # or A, B, C, preprint, blog
doi: "10.xxxx/xxxxx"  # if available
url: "https://..."
access_date: YYYY-MM-DD
acquisition_method: automated  # or manual
acquisition_source: semantic-scholar  # or arxiv, manual-upload, github
pdf_location: ".aiwg/research/sources/pdfs/REF-XXX-{slug}.pdf"
checksum_sha256: "[SHA-256 hash]"
documented_date: YYYY-MM-DD
quality_assessed: false  # becomes true after UC-RF-006
quality_score: null  # populated by Quality Agent
grade_rating: null  # High, Moderate, Low, Very Low
fair_compliant: null  # true/false after FAIR validation
tags:
  - topic1
  - topic2
  - domain
status: documented  # pending, acquired, documented, quality-assessed, integrated
---
```

## Citation

**Full Citation:**
> [Author1, A., Author2, B. (YYYY). "Paper Title." *Conference/Journal Name*, Volume(Issue), Pages. https://doi.org/...]

**BibTeX:**
```bibtex
@article{author2023title,
  author = {Last, First and Last, First},
  title = {Paper Title},
  journal = {Journal Name},
  year = {2023},
  volume = {XX},
  number = {YY},
  pages = {ZZ--ZZ},
  doi = {10.xxxx/xxxxx}
}
```

## Abstract

[Paste or extract abstract from paper - max 300 words]

## Keywords

[List of keywords from paper or inferred]
- keyword1
- keyword2
- keyword3

## Research Context

### Problem Statement
What problem does this paper address?

### Contribution
What is the main contribution or finding?

### Methodology
What approach or methods did the authors use?

### Key Results
What are the main quantitative/qualitative results?

## Relevance to AIWG Research

### Why Acquired
[Explain why this source was selected for the research corpus]

### Expected Application
[How will this source inform AIWG development?]
- E.g., "Informs multi-agent orchestration architecture"
- E.g., "Provides validation for prompt engineering approach"

## Related Work

### Papers Cited (Sample)
- REF-YYY: [Related work 1]
- REF-ZZZ: [Related work 2]

### Papers Citing This Work
[If known, list papers that cite this work]

## File Integrity

### Checksums
- **SHA-256:** `[64-character hex hash]`
- **MD5:** `[32-character hex hash]` (optional)

### File Metadata
- **Size:** [X MB]
- **Pages:** [N pages]
- **Format:** PDF/A, PDF 1.7, etc.

## Provenance

### Acquisition Provenance
- **Discovered:** YYYY-MM-DD via [Discovery Agent / Manual Search]
- **Search Query:** "[Original search query if automated]"
- **Acquisition Date:** YYYY-MM-DD
- **Acquisition Agent:** [discovery-agent v1.0.0 | manual]
- **Source API:** [Semantic Scholar | ArXiv | Manual Upload]

### Documentation Provenance
- **Documented:** YYYY-MM-DD
- **Documentation Agent:** [documentation-agent v1.0.0]
- **LLM Model:** [claude-opus-4 | manual]

## FAIR Principles Compliance

### Findable
- [ ] Persistent identifier (DOI, ArXiv ID, etc.)
- [ ] Metadata complete and searchable
- [ ] Registered in research corpus index

### Accessible
- [ ] Retrieval protocol documented (URL, API)
- [ ] Access conditions clear (open access, subscription, etc.)
- [ ] Long-term storage plan

### Interoperable
- [ ] Standard format (PDF/A, BibTeX)
- [ ] Controlled vocabulary for tags
- [ ] Linked to related sources (REF-XXX)

### Reusable
- [ ] Clear license (CC-BY, MIT, proprietary)
- [ ] Provenance documented
- [ ] Usage context documented

**FAIR Compliance Score:** X/4 principles met

## Quality Assessment Placeholder

[This section populated by Quality Agent (UC-RF-006)]

**Quality Score:** [0-100, calculated by Quality Agent]
**GRADE Rating:** [High | Moderate | Low | Very Low]

See: `.aiwg/research/quality/REF-XXX-quality-report.md` for detailed assessment.

## Notes

### Initial Observations
[User notes on first review]

### Integration Status
- [ ] Summary created (UC-RF-003)
- [ ] Citations extracted (UC-RF-004)
- [ ] Quality assessed (UC-RF-006)
- [ ] Integrated into knowledge base

## References

- @.aiwg/research/sources/pdfs/REF-XXX-{slug}.pdf - Source PDF
- @.aiwg/research/knowledge/summaries/REF-XXX-summary.md - Summary (if exists)
- @.aiwg/research/knowledge/extractions/REF-XXX-extraction.json - Structured data (if exists)
- @.aiwg/research/knowledge/notes/REF-XXX-literature-note.md - Literature note (if exists)
- @.aiwg/research/quality/REF-XXX-quality-report.md - Quality assessment (if exists)

---

## Validation Rules

### Required Fields
- `ref_id`: Must match REF-XXX pattern
- `title`: Non-empty string
- `authors`: Array with at least one author
- `year`: Valid year (1900-2099)
- `publication_type`: Valid enum value
- `url`: Valid URL format
- `access_date`: ISO 8601 date
- `pdf_location`: File must exist
- `checksum_sha256`: Valid SHA-256 hex (64 chars)

### Conditional Fields
- `doi`: If `publication_type` is academic-paper or preprint
- `venue`: If `publication_type` is academic-paper
- `quality_score`: If `quality_assessed` is true

### FAIR Validation
- Must document at least 2/4 FAIR principles for inclusion
- Persistent identifier strongly recommended

---

## Agent Responsibilities

**Produced by:** Acquisition Agent (UC-RF-002)
**Updated by:** Documentation Agent (UC-RF-003), Quality Agent (UC-RF-006)
**Used by:** Citation Agent (UC-RF-004), Gap Analysis Agent (UC-RF-009), Archival Agent (UC-RF-007)

---

## Example (Real Data)

```yaml
---
ref_id: REF-025
title: "Constitutional AI: Harmlessness from AI Feedback"
authors:
  - Bai, Yuntao
  - Kadavath, Saurav
  - Kundu, Sandipan
  - Askell, Amanda
  - Kernion, Jackson
  - Jones, Andy
  - Chen, Anna
  - Goldie, Anna
  - Mirhoseini, Azalia
  - McKinnon, Cameron
year: 2022
publication_type: preprint
venue: "arXiv"
venue_tier: preprint
doi: null
arxiv_id: "2212.08073"
url: "https://arxiv.org/abs/2212.08073"
access_date: 2026-01-25
acquisition_method: automated
acquisition_source: arxiv
pdf_location: ".aiwg/research/sources/pdfs/REF-025-constitutional-ai.pdf"
checksum_sha256: "a3f8c9e2d1b4567890abcdef1234567890abcdef1234567890abcdef12345678"
documented_date: 2026-01-25
quality_assessed: true
quality_score: 92
grade_rating: "High"
fair_compliant: true
tags:
  - ai-safety
  - constitutional-ai
  - harmlessness
  - rlhf
  - alignment
status: integrated
---
```

**Abstract:**
As AI systems become more capable, we increasingly need to align them with human values. Reinforcement learning from human feedback (RLHF) has emerged as a powerful approach, but it has limitations. We propose Constitutional AI (CAI), which trains AI systems to be harmless using a set of principles (a "constitution") rather than extensive human feedback. We demonstrate that CAI can produce AI assistants that are both helpful and harmless while requiring significantly less human oversight than RLHF.

**Key Results:**
- CAI reduces harmful outputs by 75% compared to baseline RLHF
- Human oversight time reduced by 90% (from 100 hours to 10 hours per model)
- Helpfulness maintained at 95% of RLHF performance
- Constitution with 16 principles achieved best balance

**Relevance to AIWG Research:**
This paper informs AIWG's approach to AI safety in multi-agent systems. The constitutional approach to harmlessness aligns with AIWG's need for automated quality gates that don't require constant human oversight. We can apply CAI principles to ensure SDLC agents produce safe, ethical documentation.

**FAIR Compliance:** 4/4
- ✅ Findable: ArXiv ID, complete metadata
- ✅ Accessible: Open access, permanent URL
- ✅ Interoperable: PDF/A format, BibTeX available
- ✅ Reusable: CC-BY license, provenance documented

---

**Template Version:** 1.0.0
**Last Updated:** 2026-01-25
**Owner:** Acquisition Agent, Documentation Agent
