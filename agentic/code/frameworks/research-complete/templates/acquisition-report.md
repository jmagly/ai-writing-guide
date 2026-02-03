# Paper Acquisition Report Template

---
template_id: acquisition-report
version: 1.0.0
reasoning_required: true
framework: research-complete
---

## Ownership & Collaboration

- Document Owner: Research Analyst
- Contributor Roles: Acquisition Agent, Archival Agent
- Automation Inputs: Paper metadata, DOI/arXiv ID, acquisition strategy
- Automation Outputs: `acquisition-report-REF-XXX-YYYY-MM-DD.md` with FAIR scores and verification

## Phase 1: Core (ESSENTIAL)

### Paper Identification

**Reference ID:** REF-XXX

<!-- EXAMPLE: REF-018 -->

**Title:** [Full paper title]

<!-- EXAMPLE: ReAct: Synergizing Reasoning and Acting in Language Models -->

**Authors:** [Author list]

<!-- EXAMPLE: Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., Cao, Y. -->

**Year:** YYYY

**Source:** [Journal/Conference/Preprint]

<!-- EXAMPLE:
**Year:** 2022
**Source:** ICLR 2023 (International Conference on Learning Representations)
-->

### Acquisition Summary

**Status:** ACQUIRED | IN_PROGRESS | BLOCKED | UNAVAILABLE

<!-- EXAMPLE: ACQUIRED -->

**Date Acquired:** YYYY-MM-DD

**Method:** [How paper was obtained]

<!-- EXAMPLE:
**Date Acquired:** 2026-02-03
**Method:** Direct download from conference proceedings (open access)
-->

**Verification:** [Identity verification status]

<!-- EXAMPLE:
**Verification:** VERIFIED
- DOI resolves correctly to paper
- PDF checksum matches published version
- Author list matches official record
-->

## Reasoning

> Complete this section BEFORE acquisition attempt. Per @.claude/rules/reasoning-sections.md

1. **Acquisition Strategy Selection**: What's the best way to obtain this paper?
   > [Evaluate options: open access, institutional access, request from authors, purchase]

<!-- EXAMPLE:
Options:
1. Open access: ICLR 2023 proceedings are freely available
2. Institutional access: Not needed (open access)
3. Author request: Not needed (open access)
4. Purchase: Not needed (open access)

Selected: Option 1 (open access download)
Rationale: Most efficient, no barriers, verifiable source
-->

2. **Identity Verification Plan**: How do we ensure this is the correct paper?
   > [Define verification steps: DOI check, title match, author match, checksum]

<!-- EXAMPLE:
Verification checklist:
1. DOI resolves to paper? (https://doi.org/...)
2. Title matches exactly?
3. All authors listed correctly?
4. Publication venue matches metadata?
5. PDF checksum available from trusted source?

All must pass for VERIFIED status.
-->

3. **License Compatibility Check**: Can we legally use this paper?
   > [Assess license terms: commercial use, redistribution, attribution requirements]

<!-- EXAMPLE:
License: CC BY 4.0 (Creative Commons Attribution)
Terms:
- Commercial use: YES (allowed)
- Redistribution: YES (with attribution)
- Modification: YES (derivative works allowed)
- Attribution: REQUIRED

AIWG compatibility: FULL (no restrictions)
-->

4. **Quality Source Assessment**: Is this a trustworthy source?
   > [Evaluate source credibility: official proceedings, author website, repository]

<!-- EXAMPLE:
Source: Official ICLR 2023 proceedings website
Credibility: HIGH
- Peer-reviewed venue
- Official publication (not preprint)
- Publisher website (not third-party mirror)
- SSL certificate valid
- No modification signs (checksum verifiable)
-->

5. **Fixity Planning**: How will we detect future corruption?
   > [Define integrity monitoring: checksum algorithm, verification schedule]

<!-- EXAMPLE:
Fixity protocol:
- Algorithm: SHA-256 (industry standard)
- Initial checksum: Record at acquisition
- Verification: Weekly automated check
- Alert: If checksum mismatch detected
- Action: Re-acquire from source, investigate cause

Storage: .aiwg/research/fixity-manifest.json
-->

## Phase 2: Acquisition Details (EXPAND WHEN READY)

<details>
<summary>Click to expand detailed acquisition information</summary>

### Source Information

**Primary Source:**

| Field | Value |
|-------|-------|
| URL | [Full URL where paper was obtained] |
| Accessed | YYYY-MM-DD HH:MM:SS UTC |
| Source Type | [official_proceedings / preprint_server / author_website / institutional_repo] |
| SSL Valid | YES / NO |

<!-- EXAMPLE:
| Field | Value |
| URL | https://openreview.net/pdf?id=WE_vluYUL-X |
| Accessed | 2026-02-03 15:00:00 UTC |
| Source Type | official_proceedings |
| SSL Valid | YES |
-->

**Backup Sources:**

- [Secondary URL if primary unavailable]
- [Author website URL]
- [ArXiv URL if applicable]

<!-- EXAMPLE:
- https://arxiv.org/abs/2210.03629 (arXiv preprint)
- https://react-lm.github.io/ (project website)
- https://github.com/ysymyth/ReAct (code repository with paper link)
-->

### Identifier Verification

**DOI:**

```
DOI: [Digital Object Identifier]
Resolves to: [URL DOI redirects to]
Status: VERIFIED | UNVERIFIED | NOT_AVAILABLE
```

<!-- EXAMPLE:
```
DOI: 10.48550/arXiv.2210.03629
Resolves to: https://arxiv.org/abs/2210.03629
Status: VERIFIED
```
-->

**Other Identifiers:**

- ArXiv ID: [arXiv ID if applicable]
- ISBN: [ISBN if book chapter]
- PubMed ID: [PMID if biomedical]
- Semantic Scholar ID: [Corpus ID]

<!-- EXAMPLE:
- ArXiv ID: 2210.03629
- ISBN: N/A
- PubMed ID: N/A
- Semantic Scholar ID: 253098892
-->

### File Metadata

**Original File:**

| Attribute | Value |
|-----------|-------|
| Filename | [Original filename] |
| Size | [File size in bytes] |
| Format | [PDF version or other] |
| Pages | [Page count] |
| Creation Date | [PDF creation date if available] |

<!-- EXAMPLE:
| Attribute | Value |
| Filename | yao-2022-react.pdf |
| Size | 2,457,832 bytes |
| Format | PDF 1.7 |
| Pages | 22 |
| Creation Date | 2022-10-07 |
-->

**Storage Location:**

```
Local path: @.aiwg/research/sources/[filename].pdf
Backup: [Backup location if applicable]
```

<!-- EXAMPLE:
```
Local path: @.aiwg/research/sources/yao-2022-react.pdf
Backup: /mnt/backup/research-corpus/yao-2022-react.pdf
```
-->

### Fixity Information

**Checksum:**

```
Algorithm: SHA-256
Checksum: [SHA-256 hash of PDF]
Computed at: YYYY-MM-DD HH:MM:SS UTC
Verified: YES / NO
```

<!-- EXAMPLE:
```
Algorithm: SHA-256
Checksum: a1b2c3d4e5f6789...
Computed at: 2026-02-03 15:05:00 UTC
Verified: YES
```
-->

**Fixity Manifest Entry:**

```yaml
# Entry in .aiwg/research/fixity-manifest.json
{
  "ref_id": "REF-XXX",
  "filename": "filename.pdf",
  "sha256": "checksum",
  "size_bytes": 0,
  "acquired_at": "YYYY-MM-DDTHH:MM:SSZ",
  "last_verified": "YYYY-MM-DDTHH:MM:SSZ",
  "verification_status": "valid"
}
```

<!-- EXAMPLE:
```yaml
{
  "ref_id": "REF-018",
  "filename": "yao-2022-react.pdf",
  "sha256": "a1b2c3d4e5f6789...",
  "size_bytes": 2457832,
  "acquired_at": "2026-02-03T15:05:00Z",
  "last_verified": "2026-02-03T15:05:00Z",
  "verification_status": "valid"
}
```
-->

### License & Usage Rights

**License Type:** [License name]

<!-- EXAMPLE: CC BY 4.0 -->

**License Terms:**

| Permission | Status | Notes |
|------------|--------|-------|
| Read | ✓ | Allowed |
| Copy | ✓ | Allowed |
| Distribute | ✓ | With attribution |
| Modify | ✓ | Derivative works allowed |
| Commercial use | ✓ | Allowed |

<!-- EXAMPLE:
| Permission | Status | Notes |
| Read | ✓ | Allowed |
| Copy | ✓ | Allowed |
| Distribute | ✓ | With attribution |
| Modify | ✓ | Derivative works allowed |
| Commercial use | ✓ | Allowed |
-->

**Attribution Requirements:**

```
Citation format: [Required citation]
Copyright notice: [If required]
License link: [URL to license terms]
```

<!-- EXAMPLE:
```
Citation format: Yao et al., "ReAct: Synergizing Reasoning and Acting in Language Models", ICLR 2023
Copyright notice: © 2022 Authors. Licensed under CC BY 4.0
License link: https://creativecommons.org/licenses/by/4.0/
```
-->

### Acquisition Challenges

**Issues Encountered:** [List any problems during acquisition]

<!-- EXAMPLE:
**Issues Encountered:**
1. Initial download link was broken (conference website migration)
2. Redirected to arXiv preprint as alternative
3. Verified both versions have identical content (checksums differ due to formatting)
4. Selected official proceedings version as canonical

Resolution time: 15 minutes
-->

**Resolution:** [How issues were resolved]

<!-- EXAMPLE:
**Resolution:**
- Located backup link on arXiv
- Cross-referenced content to ensure correctness
- Recorded both sources in acquisition report
- No content loss or corruption
-->

</details>

## Phase 3: FAIR Compliance Assessment (ADVANCED)

<details>
<summary>Click to expand FAIR principles evaluation</summary>

### FAIR Principles Score

**Overall FAIR Score:** X.X / 4.0

<!-- EXAMPLE: 3.8 / 4.0 (Excellent FAIR compliance) -->

#### F - Findable (Score: X.X / 1.0)

| Criterion | Status | Score | Evidence |
|-----------|--------|-------|----------|
| F1: Globally unique identifier | ✓ / ✗ | 0-0.25 | [DOI, arXiv ID, etc.] |
| F2: Rich metadata | ✓ / ✗ | 0-0.25 | [Metadata completeness] |
| F3: Identifier in metadata | ✓ / ✗ | 0-0.25 | [Metadata includes identifiers] |
| F4: Searchable resource | ✓ / ✗ | 0-0.25 | [Indexed in databases] |

<!-- EXAMPLE:
| Criterion | Status | Score | Evidence |
| F1: Globally unique identifier | ✓ | 0.25 | DOI: 10.48550/arXiv.2210.03629 |
| F2: Rich metadata | ✓ | 0.25 | Full bibliographic data available |
| F3: Identifier in metadata | ✓ | 0.25 | DOI embedded in PDF metadata |
| F4: Searchable resource | ✓ | 0.25 | Indexed in Google Scholar, Semantic Scholar, arXiv |

**Findable Score:** 1.0 / 1.0 (Perfect)
-->

**Assessment:**

<!-- EXAMPLE:
**Assessment:** Excellent findability. Paper has persistent DOI, rich metadata, and is indexed in major academic databases. Easy to locate using title, authors, or DOI.
-->

#### A - Accessible (Score: X.X / 1.0)

| Criterion | Status | Score | Evidence |
|-----------|--------|-------|----------|
| A1: Retrievable by identifier | ✓ / ✗ | 0-0.25 | [DOI resolves?] |
| A1.1: Open protocol | ✓ / ✗ | 0-0.25 | [HTTPS, no proprietary access?] |
| A1.2: Authentication needed? | ✓ / ✗ | 0-0.25 | [Open access?] |
| A2: Metadata accessible | ✓ / ✗ | 0-0.25 | [Even if data unavailable?] |

<!-- EXAMPLE:
| Criterion | Status | Score | Evidence |
| A1: Retrievable by identifier | ✓ | 0.25 | DOI resolves to full-text PDF |
| A1.1: Open protocol | ✓ | 0.25 | HTTPS, no special client required |
| A1.2: Authentication needed? | ✓ | 0.25 | Open access, no login required |
| A2: Metadata accessible | ✓ | 0.25 | Metadata available even without PDF access |

**Accessible Score:** 1.0 / 1.0 (Perfect)
-->

**Assessment:**

<!-- EXAMPLE:
**Assessment:** Perfect accessibility. Open access paper with no authentication barriers. Metadata and full text retrievable via standard protocols.
-->

#### I - Interoperable (Score: X.X / 1.0)

| Criterion | Status | Score | Evidence |
|-----------|--------|-------|----------|
| I1: Formal language | ✓ / ✗ | 0-0.33 | [PDF, structured data?] |
| I2: FAIR vocabularies | ✓ / ✗ | 0-0.33 | [Standard metadata schemas?] |
| I3: Qualified references | ✓ / ✗ | 0-0.34 | [References machine-readable?] |

<!-- EXAMPLE:
| Criterion | Status | Score | Evidence |
| I1: Formal language | ✓ | 0.33 | PDF with extractable text, structured citations |
| I2: FAIR vocabularies | Partial | 0.20 | Uses DOI, but no semantic markup |
| I3: Qualified references | ✓ | 0.34 | All references include DOIs or URLs |

**Interoperable Score:** 0.87 / 1.0 (High)
-->

**Assessment:**

<!-- EXAMPLE:
**Assessment:** High interoperability. Standard PDF format, DOI system, structured citations. Could improve with semantic markup (e.g., RDF metadata).
-->

#### R - Reusable (Score: X.X / 1.0)

| Criterion | Status | Score | Evidence |
|-----------|--------|-------|----------|
| R1: Rich metadata | ✓ / ✗ | 0-0.25 | [Attributes described?] |
| R1.1: Clear license | ✓ / ✗ | 0-0.25 | [License specified?] |
| R1.2: Provenance | ✓ / ✗ | 0-0.25 | [Origin documented?] |
| R1.3: Standards | ✓ / ✗ | 0-0.25 | [Community standards met?] |

<!-- EXAMPLE:
| Criterion | Status | Score | Evidence |
| R1: Rich metadata | ✓ | 0.25 | Full bibliographic metadata, keywords, abstract |
| R1.1: Clear license | ✓ | 0.25 | CC BY 4.0 clearly stated |
| R1.2: Provenance | ✓ | 0.25 | Authors, institutions, funding sources documented |
| R1.3: Standards | ✓ | 0.25 | Follows academic publishing standards |

**Reusable Score:** 1.0 / 1.0 (Perfect)
-->

**Assessment:**

<!-- EXAMPLE:
**Assessment:** Perfect reusability. Clear licensing, rich metadata, well-documented provenance. Can be freely reused with proper attribution.
-->

### FAIR Improvement Recommendations

**Areas for Improvement:**

1. [Improvement 1]
2. [Improvement 2]

<!-- EXAMPLE:
**Areas for Improvement:**
1. Add semantic markup (RDF) to metadata for better machine readability
2. Include structured data export (BibTeX, RIS) directly on paper page
3. Link to datasets/code repositories in machine-readable format
-->

**Actions Taken:**

- [Action 1]
- [Action 2]

<!-- EXAMPLE:
**Actions Taken:**
- Generated BibTeX entry and added to corpus bibliography
- Linked code repository (https://github.com/ysymyth/ReAct) in literature note
- Created structured extraction (extraction.yaml) for machine processing
-->

</details>

## Verification Checklist

Before marking acquisition complete:

- [ ] Paper downloaded and stored in `.aiwg/research/sources/`
- [ ] Filename follows convention: `[author]-[year]-[short-title].pdf`
- [ ] DOI verified (resolves to correct paper)
- [ ] Title matches exactly
- [ ] All authors listed correctly
- [ ] Publication venue matches metadata
- [ ] SHA-256 checksum computed and recorded
- [ ] Fixity manifest updated (`.aiwg/research/fixity-manifest.json`)
- [ ] License identified and compatibility verified
- [ ] FAIR score computed
- [ ] Backup copy created (if applicable)
- [ ] Provenance record created (`.aiwg/research/provenance/records/REF-XXX.prov.yaml`)

## Related Artifacts

**Created During Acquisition:**
- @.aiwg/research/sources/[filename].pdf - PDF file
- @.aiwg/research/fixity-manifest.json - Checksum entry
- @.aiwg/research/provenance/records/REF-XXX.prov.yaml - Provenance record

**To Be Created Next:**
- @.aiwg/research/findings/REF-XXX-[topic].md - Literature note
- @.aiwg/research/summaries/REF-XXX-summary.md - Multi-level summary
- @.aiwg/research/extractions/REF-XXX-extraction.yaml - Structured extraction

## Acquisition Metadata

| Field | Value |
|-------|-------|
| Acquisition Date | YYYY-MM-DD |
| Acquired By | [Agent or Human] |
| Method | [Download/Request/Purchase] |
| Duration | [Time to acquire] |
| Cost | [If purchased] |
| Verification Status | VERIFIED / UNVERIFIED |
| FAIR Score | X.X / 4.0 |

<!-- EXAMPLE:
| Field | Value |
| Acquisition Date | 2026-02-03 |
| Acquired By | Acquisition Agent |
| Method | Direct download (open access) |
| Duration | 5 minutes |
| Cost | $0 (open access) |
| Verification Status | VERIFIED |
| FAIR Score | 3.87 / 4.0 |
-->

## References

- @.aiwg/research/sources/[filename].pdf - Acquired paper
- @.aiwg/research/fixity-manifest.json - Fixity tracking
- @.aiwg/research/provenance/records/REF-XXX.prov.yaml - Provenance
- @.claude/rules/research-metadata.md - Metadata requirements
- @agentic/code/frameworks/research-complete/schemas/acquisition-schema.yaml - Schema

## Template Usage Notes

**When to create acquisition report:**
- Immediately after acquiring new paper
- When re-acquiring paper (e.g., after corruption detected)
- When upgrading from preprint to published version

**Acquisition workflow:**
1. Identify paper and source
2. Verify identity (DOI, title, authors)
3. Check license compatibility
4. Download from trusted source
5. Compute checksum
6. Create acquisition report
7. Update fixity manifest
8. Create provenance record
9. Proceed to literature note creation

**Quality checks:**
- DOI resolves correctly
- Checksum matches trusted source (if available)
- No watermarks or modifications
- PDF is complete (all pages)
- Text is extractable (not scanned image-only)

**Anti-patterns:**
- Acquiring papers without license check
- No checksum recorded (can't detect corruption)
- Unclear source provenance (untrusted sources)
- No backup plan if primary source fails

## Metadata

- **Template Type:** research-acquisition-report
- **Framework:** research-complete
- **Primary Agent:** @agentic/code/frameworks/research-complete/agents/acquisition-agent.md
- **Related Templates:**
  - @agentic/code/frameworks/research-complete/templates/literature-note.md
  - @agentic/code/frameworks/research-complete/templates/provenance-record.yaml
- **Version:** 1.0.0
- **Last Updated:** 2026-02-03
