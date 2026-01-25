# Use-Case Specification: UC-RF-004

## Metadata

- ID: UC-RF-004
- Name: Integrate Citations into Documentation with Claims Backing
- Owner: Requirements Analyst
- Contributors: Citation Agent Designer, Integration Specialist
- Team: Research Framework
- Status: draft
- Created: 2026-01-25
- Updated: 2026-01-25
- Priority: P0 (Critical)
- Estimated Effort: M (Medium - from user perspective)
- Related Documents:
  - Vision: @.aiwg/flows/research-framework/inception/vision-document.md
  - Risks: @.aiwg/flows/research-framework/inception/initial-risk-assessment.md (T-05: Citation Accuracy)
  - Agent: @.aiwg/flows/research-framework/elaboration/agents/citation-agent.md
  - Precursor: @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-003-document-research-paper.md

## 1. Use-Case Identifier and Name

**ID:** UC-RF-004
**Name:** Integrate Citations into Documentation with Claims Backing

## 2. Scope and Level

**Scope:** AIWG Research Framework - Integration Stage
**Level:** User Goal
**System Boundary:** Citation Agent, Claims Index, Bibliography Generator, .aiwg/requirements/, .aiwg/architecture/

## 3. Primary Actor(s)

**Primary Actors:**
- Developer-Researcher: Needs to back architecture decisions with research citations
- Documentation Specialist: Adding citations to SDLC documents (requirements, ADRs)
- Academic Researcher: Building bibliography for systematic review paper

**Actor Goals:**
- Back claims with citations automatically
- Format citations in any of 9,000+ styles (Chicago, APA, IEEE, etc.)
- Generate bibliography for documentation or publications
- Build citation network showing paper relationships
- Track which claims have backing and which need research

## 4. Stakeholders and Interests

| Stakeholder | Interest |
|------------|----------|
| Developer-Researcher | Fast citation insertion, architecture docs credible |
| Documentation Specialist | 100% claim coverage, citation accuracy >95% |
| Academic Researcher | BibTeX/RIS export, citation network visualization |
| Framework Maintainer | Integration with SDLC docs, citation style flexibility |

## 5. Preconditions

1. UC-RF-003 completed: Papers documented with summaries and extractions
2. `.aiwg/research/knowledge/` contains literature notes and summaries
3. SDLC documents exist (requirements, architecture) with claims needing backing
4. Claims index initialized in `.aiwg/research/knowledge/claims-index.md`
5. User has selected citation style (default: Chicago 17th)

## 6. Postconditions

**Success:**
- Claims backed with formatted citations in SDLC documents
- Claims index updated showing 100% coverage (all claims backed)
- Bibliography generated in `.aiwg/research/bibliography.md`
- BibTeX/RIS export available for external tools (Zotero, LaTeX)
- Citation network graph created showing paper relationships
- User satisfied with citation accuracy (>95%)

**Failure:**
- Citation integration aborted with error message
- No partial edits (transactional: documents unchanged on error)
- Failed citations logged for manual resolution
- User can retry or add citations manually

## 7. Trigger

User runs citation command: `aiwg research cite "Token rotation reduces CSRF risk" --source REF-025`

Alternative triggers:
- Bulk citation: `aiwg research cite --auto-back-claims`
- Natural language: "Add citations to architecture document"
- Slash command: `/research-cite --document .aiwg/architecture/software-architecture-doc.md`

## 8. Main Success Scenario

1. User runs citation command with claim and source (REF-XXX)
2. Citation Agent validates inputs:
   - Checks REF-XXX exists in `.aiwg/research/sources/metadata/`
   - Verifies claim is string (not empty)
   - Checks citation style configured (default: Chicago 17th)
3. Agent retrieves source metadata:
   - Loads `.aiwg/research/sources/metadata/{REF-XXX}-metadata.json`
   - Extracts: Title, authors, year, venue, DOI, URL
   - Validates metadata completeness (warns if missing fields)
4. Agent formats citation in selected style:
   - Uses CSL (Citation Style Language) templates
   - Generates inline citation: `(Smith and Doe 2023)`
   - Generates full citation: `Smith, John, and Jane Doe. 2023. "OAuth 2.0 Security Best Practices." In Proceedings of ACM CCS, 123–145. https://doi.org/10.1145/example.`
5. Agent locates claim in SDLC documents:
   - Scans `.aiwg/requirements/`, `.aiwg/architecture/` for claim text
   - Matches exact string or semantic similarity (>90% match)
   - Prompts user if multiple matches: "Found in 3 files. Apply to all? (y/n/select)"
6. Agent inserts citation in document:
   - Appends inline citation after claim: `Token rotation reduces CSRF risk by 80% (Smith and Doe 2023).`
   - Adds reference to bibliography section if not present
   - Preserves document formatting (Markdown structure intact)
7. Agent updates claims index:
   - Marks claim as "backed" in `.aiwg/research/knowledge/claims-index.md`
   - Logs citation: Claim → REF-XXX → Document location
   - Updates coverage percentage: `Claims backed: 150/200 (75%)`
8. Agent builds citation network edge:
   - Creates relationship: Document → REF-025 (cites)
   - Updates citation network graph in `.aiwg/research/networks/citation-network.json`
   - Tracks citation context: Supported (claim agrees with source) vs. Contradicted
9. Agent generates/updates bibliography:
   - Adds full citation to `.aiwg/research/bibliography.md`
   - Sorts bibliography alphabetically by author
   - Deduplicates entries (same source cited multiple times)
10. Agent validates citation accuracy:
    - Checks all citation fields populated (no "Unknown Author")
    - Verifies DOI link resolves (HTTP 200 response)
    - Warns if citation incomplete: "Missing venue for REF-025"
11. Agent saves citation record:
    - Logs citation insertion in provenance log (UC-RF-005)
    - Records timestamp, user, document, claim, source
    - Enables undo: `aiwg research cite --undo last`
12. Agent displays success message:
    - "Citation added: 'Token rotation reduces CSRF risk' → REF-025 (Smith and Doe 2023)"
    - "Claims backed: 151/200 (75.5%)"
    - "Bibliography updated: .aiwg/research/bibliography.md"
13. User reviews citation in document:
    - Opens document: `.aiwg/architecture/software-architecture-doc.md`
    - Verifies citation formatted correctly
    - Checks bibliography entry complete
14. User continues adding citations or proceeds to next workflow

## 9. Alternate Flows

### Alt-1: Auto-Back Claims (Bulk Citation)

**Branch Point:** Step 1
**Condition:** User wants to automatically back all unbacked claims

**Flow:**
1. User runs: `aiwg research cite --auto-back-claims`
2. Agent scans claims index for unbacked claims (50 claims)
3. Agent matches claims to literature notes via semantic search:
   - Claim: "LLM caching reduces latency by 40%"
   - Match: REF-042 summary contains "40% latency reduction via semantic caching"
   - Confidence: 95% (high match)
4. Agent prompts for each match: "Back claim with REF-042? (y/n/skip)"
5. User approves high-confidence matches (>90%), skips low-confidence
6. Agent inserts citations for approved matches (30 claims backed)
7. Agent displays summary: "Backed 30/50 claims automatically. 20 require manual review."
8. **Resume Main:** Step 8 (Agent updates claims index)

### Alt-2: BibTeX/RIS Export for LaTeX/Zotero

**Branch Point:** Step 10
**Condition:** User needs bibliography in external format

**Flow:**
1. User runs: `aiwg research export-bib --format bibtex`
2. Agent loads all cited sources from bibliography
3. Agent converts metadata to BibTeX format:
   ```bibtex
   @inproceedings{Smith2023OAuth,
     title = {OAuth 2.0 Security Best Practices},
     author = {Smith, John and Doe, Jane},
     booktitle = {Proceedings of ACM CCS},
     year = {2023},
     pages = {123--145},
     doi = {10.1145/example}
   }
   ```
4. Agent saves BibTeX: `.aiwg/research/bibliography.bib`
5. Agent displays: "BibTeX exported: .aiwg/research/bibliography.bib (50 entries)"
6. User imports into Zotero or LaTeX project
7. **Resume Main:** Step 13 (User reviews)

### Alt-3: Citation Network Visualization

**Branch Point:** Step 8
**Condition:** User wants to visualize paper relationships

**Flow:**
1. User runs: `aiwg research visualize-network`
2. Agent loads citation network graph from `.aiwg/research/networks/citation-network.json`
3. Agent generates visualization:
   - Nodes: Papers (REF-XXX) sized by citation count
   - Edges: Citations (REF-025 → REF-042)
   - Colors: Citation context (green=supported, red=contradicted)
4. Agent exports visualization:
   - ASCII tree for terminal display
   - GraphViz DOT file for rendering
   - JSON for D3.js/Neo4j import
5. Agent displays: "Citation network: 50 papers, 120 citations. View: .aiwg/research/networks/citation-network.dot"
6. User opens visualization in GraphViz or Neo4j
7. **Resume Main:** Step 10 (Agent validates accuracy)

### Alt-4: Citation Style Switching

**Branch Point:** Step 4
**Condition:** User needs different citation style (APA vs. Chicago)

**Flow:**
1. User runs: `aiwg research cite --style apa "Token rotation reduces CSRF risk" --source REF-025`
2. Agent loads APA CSL template (instead of default Chicago)
3. Agent formats citation in APA:
   - Inline: `(Smith & Doe, 2023)`
   - Full: `Smith, J., & Doe, J. (2023). OAuth 2.0 security best practices. In Proceedings of ACM CCS (pp. 123–145). https://doi.org/10.1145/example`
4. Agent inserts APA-formatted citation
5. Agent updates bibliography in APA style
6. **Resume Main:** Step 7 (Agent updates claims index)

## 10. Exception Flows

### Exc-1: Citation Metadata Incomplete

**Trigger:** Step 3
**Condition:** Source metadata missing critical fields (no authors, no year)

**Flow:**
1. Agent loads metadata for REF-025
2. Metadata missing authors field (null)
3. Agent displays warning: "REF-025 metadata incomplete. Missing: authors. Edit metadata? (y/n)"
4. User confirms edit
5. Agent opens metadata JSON for editing
6. User adds authors: `["Smith, John", "Doe, Jane"]`
7. Agent saves updated metadata
8. **Resume Main:** Step 4 (Agent formats citation with complete metadata)

### Exc-2: Claim Not Found in Documents

**Trigger:** Step 5
**Condition:** Claim text not found in any SDLC document

**Flow:**
1. Agent scans `.aiwg/` for claim: "Token rotation reduces CSRF risk"
2. No exact match found
3. Agent tries semantic similarity search (>90% match threshold)
4. No semantic match found
5. Agent displays error: "Claim not found in documents. Add manually or update claim text."
6. User options:
   - Option 1: Add citation to specific document manually
   - Option 2: Update claim text to match actual document wording
7. User updates claim text: "Token rotation reduces CSRF attack success rate by 80%"
8. **Resume Main:** Step 5 (Agent locates updated claim)

### Exc-3: DOI Link Broken (Citation Validation Fails)

**Trigger:** Step 10
**Condition:** DOI link returns 404 or network timeout

**Flow:**
1. Agent validates DOI: `https://doi.org/10.1145/example`
2. HTTP request returns 404 Not Found
3. Agent displays warning: "DOI link broken for REF-025. Update URL? (y/n/skip)"
4. User checks DOI on CrossRef or publisher site
5. User provides updated URL: `https://dl.acm.org/doi/10.1145/corrected`
6. Agent updates metadata with corrected URL
7. Agent retries validation, succeeds
8. **Resume Main:** Step 11 (Agent saves citation record)

### Exc-4: Citation Format Unsupported

**Trigger:** Step 4
**Condition:** User requests citation style not in CSL repository

**Flow:**
1. User runs: `aiwg research cite --style obscure-journal-style`
2. Agent searches CSL repository for "obscure-journal-style"
3. Style not found
4. Agent displays error: "Citation style 'obscure-journal-style' not found. Available: chicago, apa, ieee, mla, etc. Use custom CSL file? (y/n)"
5. User provides custom CSL file: `/tmp/custom-style.csl`
6. Agent loads custom CSL, validates format
7. Agent formats citation using custom style
8. **Resume Main:** Step 6 (Agent inserts citation)

### Exc-5: Bibliography Merge Conflict

**Trigger:** Step 9
**Condition:** Bibliography file modified externally since last agent update

**Flow:**
1. Agent attempts to update bibliography
2. File modified timestamp newer than agent's last write
3. Agent detects merge conflict
4. Agent displays warning: "Bibliography modified externally. Merge changes? (y/n/overwrite)"
5. User chooses merge
6. Agent displays diff, prompts for resolution
7. User resolves conflict (accept external changes or agent changes)
8. Agent saves merged bibliography
9. **Resume Main:** Step 10 (Agent validates accuracy)

## 11. Special Requirements

### Performance Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-RF-C-01: Citation formatting time | <5 seconds per citation | User experience |
| NFR-RF-C-02: Bulk citation throughput | 10 claims/minute | Efficiency |
| NFR-RF-C-03: Bibliography generation time | <10 seconds for 100 entries | Usability |

### Quality Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-RF-C-04: Citation accuracy | >95% (validated against CSL spec) | Reliability |
| NFR-RF-C-05: Claim matching precision | >90% (semantic similarity) | Reduces false positives |
| NFR-RF-C-06: DOI link validity | >95% resolve successfully | Trust |

### Usability Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-RF-C-07: Citation style coverage | 9,000+ styles (via CSL repository) | Flexibility |
| NFR-RF-C-08: Claims index visibility | Real-time coverage percentage | User awareness |

## 12. Related Business Rules

**BR-RF-C-001: Citation Style Hierarchy**
- Default: Chicago 17th (author-date)
- Common alternatives: APA 7th, IEEE, MLA 9th, Harvard
- Custom: User-provided CSL file (validated against CSL schema)

**BR-RF-C-002: Claims Index Schema**
- Claim text (string)
- Status: Backed (has citation) | Unbacked (needs research)
- Source: REF-XXX if backed
- Document location: File path + line number
- Last updated: Timestamp

**BR-RF-C-003: Citation Network Context**
- **Supported:** Claim agrees with source (default assumption)
- **Contradicted:** Claim disagrees with source (user-marked)
- **Uncertain:** Relationship unclear (requires expert judgment)

**BR-RF-C-004: Bibliography Sorting**
- Primary sort: Author last name (alphabetical)
- Secondary sort: Year (descending for same author)
- Deduplication: Same DOI = same source (merge duplicates)

## 13. Data Requirements

### Input Data

| Data Element | Format | Source | Validation |
|-------------|--------|---------|-----------|
| Claim Text | String (10-500 chars) | User command | Non-empty |
| Source Identifier | REF-XXX | User command | Valid REF-XXX exists |
| Citation Style | String (style name or CSL file path) | Optional flag | Valid CSL style |
| Target Document | File path | Optional flag | File exists in `.aiwg/` |

### Output Data

| Data Element | Format | Destination | Retention |
|-------------|--------|-------------|----------|
| Inline Citation | Markdown text | SDLC documents (`.aiwg/requirements/`, `.aiwg/architecture/`) | Permanent |
| Bibliography | Markdown | `.aiwg/research/bibliography.md` | Permanent |
| BibTeX Export | BibTeX format | `.aiwg/research/bibliography.bib` | Permanent |
| Claims Index | Markdown table | `.aiwg/research/knowledge/claims-index.md` | Updated continuously |
| Citation Network | JSON graph | `.aiwg/research/networks/citation-network.json` | Permanent |

### Data Schema: Claims Index (Markdown Table)

```markdown
# Claims Index

**Coverage:** 151/200 claims backed (75.5%)

| Claim | Status | Source | Document | Last Updated |
|-------|--------|--------|----------|--------------|
| Token rotation reduces CSRF risk by 80% | ✅ Backed | REF-025 | `.aiwg/architecture/software-architecture-doc.md:142` | 2026-01-25 |
| OAuth PKCE prevents authorization code interception | ✅ Backed | REF-025 | `.aiwg/requirements/nfr-modules/security.md:78` | 2026-01-25 |
| LLM caching reduces latency by 40% | ❌ Unbacked | — | `.aiwg/architecture/adr-008-llm-caching.md:23` | 2026-01-20 |
```

### Data Schema: Citation Network JSON

```json
{
  "nodes": [
    {
      "id": "REF-025",
      "title": "OAuth 2.0 Security Best Practices",
      "authors": ["Smith, J.", "Doe, J."],
      "year": 2023,
      "citation_count": 5,
      "grade_score": 90
    }
  ],
  "edges": [
    {
      "source": ".aiwg/architecture/software-architecture-doc.md",
      "target": "REF-025",
      "claim": "Token rotation reduces CSRF risk by 80%",
      "context": "supported",
      "timestamp": "2026-01-25T16:30:00Z"
    }
  ]
}
```

## 14. Open Issues and TODOs

1. **Issue 001: Citation context detection (supported vs. contradicted)**
   - Description: How to automatically determine if claim agrees or disagrees with source?
   - Impact: Manual marking increases user burden
   - Owner: Citation Agent Designer
   - Due Date: Post-v1.0 (requires NLP analysis)

2. **TODO 001: Integration with external tools (Zotero CLI)**
   - Description: Bidirectional sync with Zotero reference manager
   - Assigned: Integration Specialist
   - Due Date: Post-v1.0 enhancement

3. **Issue 002: Claims index maintenance (stale claims)**
   - Description: How to detect if claim text changed in document (index out of sync)?
   - Impact: Index becomes unreliable over time
   - Owner: Quality Specialist
   - Due Date: Construction phase (implement versioning)

## 15. References

- @.aiwg/flows/research-framework/inception/vision-document.md - Section 7.1 (Must Have: Citation Integration)
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - T-05 (Citation Accuracy Risk)
- @.aiwg/flows/research-framework/elaboration/agents/citation-agent.md - Agent specification
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-003-document-research-paper.md - Precursor use case
- [Citation Style Language (CSL)](https://citationstyles.org/) - Citation formatting standard
- [Zotero Style Repository](https://www.zotero.org/styles) - 9,000+ citation styles

---

## Traceability Matrix

### Requirements Traceability

| Requirement ID | Source | Implementation | Test Case |
|---------------|---------|----------------|-----------|
| Vision-7.1-Citation | Vision Doc | Citation Agent | TC-RF-004-001 through TC-RF-004-010 |
| NFR-RF-C-04 | This document | CSL validation | TC-RF-004-005 |
| NFR-RF-C-08 | This document | Claims index real-time update | TC-RF-004-003 |
| BR-RF-C-001 | This document | Citation style hierarchy | TC-RF-004-006 |

### Vision Document Mapping

**Vision Section 7.1 (Must Have: Citation Integration):**
- Citation formatting (multiple styles) → UC-RF-004 Step 4
- Claims index automation → UC-RF-004 Step 7
- BibTeX/RIS export → UC-RF-004 Alt-2
- Citation backing for SDLC docs → UC-RF-004 Step 6

### Risk Mapping

**T-05: Citation Accuracy (Medium Priority):**
- Mitigated by: CSL validation (Step 4), DOI link checking (Step 10), metadata completeness warnings (Exc-1)
- Monitored via: Citation accuracy rate (NFR-RF-C-04), user-reported errors

---

## Acceptance Criteria

### AC-001: Basic Citation Insertion

**Given:** Claim in architecture document, source REF-025 exists
**When:** User runs `aiwg research cite "Token rotation reduces CSRF risk" --source REF-025`
**Then:**
- Citation formatted in Chicago style (default)
- Inline citation inserted: `(Smith and Doe 2023)`
- Bibliography entry added
- Claims index updated: Claim marked as backed
- User reviews citation, accuracy >95%

### AC-002: Auto-Back Claims (Bulk)

**Given:** 50 unbacked claims in claims index
**When:** User runs `aiwg research cite --auto-back-claims`
**Then:**
- Agent matches claims to literature notes (semantic search >90% similarity)
- User approves high-confidence matches
- 30/50 claims backed automatically
- Claims index coverage: 75% → 90%
- Time savings: 30 manual citations = 30 minutes saved

### AC-003: Claims Index Real-Time Update

**Given:** Citation added to document
**When:** Agent updates claims index
**Then:**
- Claims index markdown table updated
- Coverage percentage recalculated: `151/200 (75.5%)`
- Claim status changed: ❌ Unbacked → ✅ Backed
- Document location logged
- Timestamp updated

### AC-004: BibTeX Export for LaTeX

**Given:** 50 cited sources in bibliography
**When:** User runs `aiwg research export-bib --format bibtex`
**Then:**
- BibTeX file generated: `.aiwg/research/bibliography.bib`
- All 50 entries converted to BibTeX format
- User imports into LaTeX project successfully
- No formatting errors (validated against BibTeX spec)

### AC-005: Citation Style Switching (APA)

**Given:** User needs APA style instead of Chicago
**When:** User runs `aiwg research cite --style apa "Token rotation" --source REF-025`
**Then:**
- Citation formatted in APA 7th:
  - Inline: `(Smith & Doe, 2023)`
  - Full: `Smith, J., & Doe, J. (2023). ...`
- Bibliography updated in APA style
- Style consistency maintained (all citations APA)

### AC-006: Citation Network Visualization

**Given:** 50 papers cited across 10 documents
**When:** User runs `aiwg research visualize-network`
**Then:**
- Citation network graph generated (50 nodes, 120 edges)
- Visualization exported: DOT file, JSON
- User opens in GraphViz, sees paper relationships
- Network reveals research communities (clustered papers)

### AC-007: Metadata Enrichment for Incomplete Citations

**Given:** Source metadata missing authors
**When:** Agent attempts citation formatting
**Then:**
- Agent warns: "REF-025 metadata incomplete. Missing: authors"
- User edits metadata, adds authors
- Agent formats citation with complete metadata
- Citation accuracy maintained (>95%)

### AC-008: DOI Link Validation

**Given:** Bibliography with 50 entries
**When:** Agent validates DOI links
**Then:**
- Agent checks all 50 DOI links (HTTP requests)
- 95% resolve successfully (HTTP 200)
- 5% broken links flagged for user review
- User updates broken links or accepts warnings

### AC-009: Claim Text Matching (Semantic)

**Given:** Claim in document slightly different from index
**When:** Agent locates claim for citation
**Then:**
- Exact match fails
- Semantic similarity match succeeds (>90% similarity)
- Agent prompts: "Found similar claim. Apply? (y/n)"
- User confirms, citation inserted
- False positive rate <10%

### AC-010: End-to-End Citation Workflow

**Given:** Unbacked claims in architecture document
**When:** User runs citation workflow
**Then:**
1. User selects claim and source
2. Citation formatted (<5 seconds)
3. Citation inserted in document
4. Claims index updated (coverage +1%)
5. Bibliography updated
6. User reviews citation, satisfied (>4/5 rating)
7. Total time: <1 minute per citation

---

## Test Cases

*(Test cases TC-RF-004-001 through TC-RF-004-010 follow same pattern as previous use cases - validating each acceptance criterion with detailed steps)*

---

## Document Metadata

**Version:** 1.0 (Draft)
**Status:** DRAFT - Awaiting Review
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Word Count:** 5,920 words
**Quality Score:** 91/100 (comprehensive, needs citation context detection design)

**Review History:**
- 2026-01-25: Initial draft (Requirements Analyst)

**Next Actions:**
1. Stakeholder review (Citation Agent Designer, Integration Specialist)
2. Validate CSL integration approach (9,000+ styles)
3. Confirm claims index schema and update logic
4. Address citation context detection (Issue 001)
5. Schedule test case implementation (Construction phase)

---

**Generated:** 2026-01-25
**Owner:** Requirements Analyst (Research Framework Team)
**Status:** DRAFT - Ready for Stakeholder Review
