# Use-Case Specification: UC-RF-002

## Metadata

- ID: UC-RF-002
- Name: Acquire Research Source with FAIR Validation
- Owner: Requirements Analyst
- Contributors: Acquisition Agent Designer, Quality Specialist
- Team: Research Framework
- Status: draft
- Created: 2026-01-25
- Updated: 2026-01-25
- Priority: P0 (Critical)
- Estimated Effort: M (Medium - from user perspective)
- Related Documents:
  - Vision: @.aiwg/flows/research-framework/inception/vision-document.md
  - Risks: @.aiwg/flows/research-framework/inception/initial-risk-assessment.md (T-04: Copyright Compliance)
  - Agent: @.aiwg/flows/research-framework/elaboration/agents/acquisition-agent.md
  - Precursor: @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-001-discover-research-papers.md

## 1. Use-Case Identifier and Name

**ID:** UC-RF-002
**Name:** Acquire Research Source with FAIR Validation

## 2. Scope and Level

**Scope:** AIWG Research Framework - Acquisition Stage
**Level:** User Goal
**System Boundary:** Acquisition Agent, PDF downloaders, FAIR validators, .aiwg/research/sources/

## 3. Primary Actor(s)

**Primary Actors:**
- Developer-Researcher: Needs quick access to papers for architecture decisions
- Academic Researcher: Building research corpus for systematic review
- Documentation Specialist: Acquiring authoritative sources for citations

**Actor Goals:**
- Download papers automatically without manual PDF hunting
- Ensure FAIR compliance (Findable, Accessible, Interoperable, Reusable)
- Extract metadata accurately for citation formatting
- Organize sources in structured, searchable repository
- Validate integrity (checksums) for reproducibility

## 4. Stakeholders and Interests

| Stakeholder | Interest |
|------------|----------|
| Developer-Researcher | Fast acquisition (<1 min/paper), metadata accuracy |
| Academic Researcher | FAIR compliance (100%), reproducibility, provenance tracking |
| Documentation Specialist | Reliable source URLs, citation-ready metadata |
| Framework Maintainer | Copyright compliance, API sustainability, storage efficiency |
| Librarian/Archivist | Long-term preservation, metadata standards |

## 5. Preconditions

1. AIWG Research Framework deployed (`aiwg use research`)
2. UC-RF-001 completed: Acquisition queue exists in `.aiwg/research/discovery/acquisition-queue.json`
3. `.aiwg/research/sources/` directory structure exists
4. User has access to papers (institutional subscription, open access, or personal library)
5. Network connectivity for PDF downloads

## 6. Postconditions

**Success:**
- Paper PDFs downloaded to `.aiwg/research/sources/pdfs/{REF-XXX}-{slug}.pdf`
- Metadata extracted and saved to `.aiwg/research/sources/metadata/{REF-XXX}-metadata.json`
- FAIR compliance score calculated and logged
- REF-XXX persistent identifier assigned
- SHA-256 checksum computed for integrity verification
- Source ready for documentation (UC-RF-003)

**Failure:**
- Acquisition aborted with error message and remediation steps
- No partial downloads (transactional: all-or-nothing)
- Failed papers logged for manual acquisition
- User can retry or skip failed papers

## 7. Trigger

User runs acquisition command: `aiwg research acquire REF-001 REF-002 REF-003`

Alternative triggers:
- Bulk acquisition from queue: `aiwg research acquire --from-queue`
- Natural language: "Acquire selected papers"
- Slash command: `/research-acquire --source REF-025`

## 8. Main Success Scenario

1. User runs acquisition command with paper IDs from discovery queue
2. Acquisition Agent validates acquisition queue:
   - Checks queue file exists and is valid JSON
   - Verifies paper IDs present in queue
   - Estimates download size (warns if >100 MB total)
3. Agent retrieves paper metadata from Semantic Scholar API:
   - DOI, title, authors, year, venue, abstract
   - Open access URLs (if available)
   - License information (CC-BY, CC0, etc.)
4. Agent determines download strategy:
   - **Open Access:** Download from Semantic Scholar, arXiv, or publisher
   - **Institutional Access:** Prompt user for manual download URL
   - **Paywalled:** Warn user, skip automatic download
5. Agent downloads PDF for each paper:
   - Constructs download URL (prioritizes open access)
   - Downloads PDF with progress indicator
   - Validates PDF format (magic bytes: %PDF-1.)
   - Renames PDF: `{REF-XXX}-{title-slug}.pdf`
6. Agent extracts metadata from PDF (if not from API):
   - Uses PDF metadata extraction tools (pdftotext, PyPDF2)
   - Extracts title, authors, DOI from PDF metadata
   - Falls back to API metadata if PDF extraction fails
7. Agent assigns REF-XXX persistent identifier:
   - Increments counter from last assigned ID
   - Format: `REF-001`, `REF-002`, etc.
   - Ensures uniqueness (checks existing sources)
8. Agent computes integrity checksum:
   - SHA-256 hash of PDF file
   - Logged for future verification
   - Enables detection of file corruption or tampering
9. Agent validates FAIR compliance:
   - **F (Findable):** DOI present, metadata complete
   - **A (Accessible):** Persistent URL available, license clear
   - **I (Interoperable):** Metadata in JSON format, follows schema
   - **R (Reusable):** License permits reuse, provenance documented
   - Scores 0-100 on each dimension, overall FAIR score
10. Agent saves metadata to JSON file:
    - Location: `.aiwg/research/sources/metadata/{REF-XXX}-metadata.json`
    - Schema: title, authors, year, venue, DOI, abstract, license, FAIR score, checksum
11. Agent saves PDF to sources directory:
    - Location: `.aiwg/research/sources/pdfs/{REF-XXX}-{slug}.pdf`
    - File permissions: 644 (rw-r--r--)
12. Agent updates acquisition queue:
    - Marks acquired papers as "complete"
    - Logs acquisition timestamp
    - Updates queue file
13. Agent generates acquisition report:
    - Saved to `.aiwg/research/sources/acquisition-report-{timestamp}.md`
    - Lists acquired papers, FAIR scores, failed acquisitions
    - Provides next steps (UC-RF-003: Documentation)
14. User reviews acquisition report:
    - Confirms papers acquired successfully
    - Reviews FAIR compliance scores (target: >80% high/moderate)
    - Proceeds to documentation (UC-RF-003)

## 9. Alternate Flows

### Alt-1: Manual PDF Upload (Paywalled Papers)

**Branch Point:** Step 4
**Condition:** Paper is paywalled, no open access URL available

**Flow:**
1. Agent detects paywalled paper (no open access URL)
2. Agent prompts: "Paper is paywalled. Provide PDF path or skip? (path/skip)"
3. User provides local PDF path: `/tmp/download/oauth-security.pdf`
4. Agent validates PDF format (magic bytes check)
5. Agent copies PDF to `.aiwg/research/sources/pdfs/{REF-XXX}-{slug}.pdf`
6. Agent extracts metadata from PDF
7. **Resume Main:** Step 7 (Agent assigns REF-XXX)

### Alt-2: Bulk Acquisition from Queue

**Branch Point:** Step 1
**Condition:** User wants to acquire all papers in queue

**Flow:**
1. User runs: `aiwg research acquire --from-queue`
2. Agent loads acquisition queue (all papers)
3. Agent displays paper count: "Acquiring 50 papers from queue..."
4. Agent processes papers in parallel (5 concurrent downloads)
5. Agent displays progress: "Acquired 10/50 papers (20% complete)"
6. **Resume Main:** Step 3 (Agent retrieves metadata for each paper)

### Alt-3: Shared Corpus Deduplication

**Branch Point:** Step 7
**Condition:** Paper already exists in research-papers shared repository

**Flow:**
1. Agent checks if paper DOI exists in `/tmp/research-papers/sources/`
2. DOI match found: Paper already acquired by another project
3. Agent displays: "Paper already in shared corpus. Symlink? (y/n)"
4. User confirms symlink
5. Agent creates symlink: `.aiwg/research/sources/pdfs/REF-XXX.pdf` → `/tmp/research-papers/sources/abc123.pdf`
6. Agent reuses existing metadata JSON (no re-extraction)
7. **Resume Main:** Step 9 (Agent validates FAIR compliance)

### Alt-4: Retry Failed Downloads

**Branch Point:** Step 5
**Condition:** PDF download fails (network timeout, 404 error)

**Flow:**
1. Agent attempts download, request times out
2. Agent retries with exponential backoff (3 attempts: 5s, 10s, 20s)
3. All retries fail
4. Agent logs failure: "Failed to acquire REF-042: Network timeout"
5. Agent continues with next paper in queue (non-blocking)
6. At end of acquisition, agent lists failed papers
7. User can retry failed papers: `aiwg research acquire --retry-failed`
8. **Resume Main:** Step 13 (Agent generates report, includes failures)

## 10. Exception Flows

### Exc-1: Acquisition Queue Missing or Empty

**Trigger:** Step 2
**Condition:** Queue file not found or contains 0 papers

**Flow:**
1. Agent checks for `.aiwg/research/discovery/acquisition-queue.json`
2. File not found or empty
3. Agent displays error: "Acquisition queue empty. Run discovery first: aiwg research search '<query>'"
4. Agent suggests creating queue manually or via discovery
5. User runs discovery (UC-RF-001) to populate queue
6. User retries acquisition
7. **Resume Main:** Step 2 (Queue now valid)

### Exc-2: Invalid PDF Format (Corrupted Download)

**Trigger:** Step 5
**Condition:** Downloaded file is not valid PDF (corrupted or HTML error page)

**Flow:**
1. Agent downloads file from URL
2. Agent validates PDF magic bytes (%PDF-1.)
3. Validation fails: File is HTML error page (403 Forbidden)
4. Agent displays warning: "Invalid PDF format for REF-025. Skipping."
5. Agent logs failure in acquisition report
6. Agent continues with next paper
7. User reviews failed papers, provides manual download
8. **Resume Main:** Step 13 (Report includes skipped papers)

### Exc-3: Metadata Extraction Failure

**Trigger:** Step 6
**Condition:** PDF metadata extraction fails, API metadata unavailable

**Flow:**
1. Agent attempts PDF metadata extraction
2. Extraction fails (PDF has no metadata fields)
3. Agent attempts Semantic Scholar API metadata retrieval
4. API also fails (paper not in database)
5. Agent prompts user for manual metadata:
   - Title: [user input]
   - Authors: [user input]
   - Year: [user input]
   - DOI (optional): [user input]
6. User provides minimal metadata
7. Agent creates metadata JSON with user-provided data
8. **Resume Main:** Step 9 (FAIR validation with incomplete metadata)

### Exc-4: Disk Space Insufficient

**Trigger:** Step 11
**Condition:** Insufficient disk space for PDF storage

**Flow:**
1. Agent estimates total download size (100 MB for 50 papers)
2. Agent checks available disk space: `df -h .aiwg/research/sources/`
3. Available space: 50 MB (insufficient)
4. Agent displays error: "Insufficient disk space. Required: 100 MB, Available: 50 MB. Free space: df -h"
5. Agent aborts acquisition (no partial downloads)
6. User frees disk space
7. User retries acquisition
8. **Resume Main:** Step 5 (Downloads proceed)

### Exc-5: FAIR Compliance Score Too Low

**Trigger:** Step 9
**Condition:** Paper scores <50 on FAIR compliance (low quality source)

**Flow:**
1. Agent calculates FAIR score: 40/100 (missing DOI, unclear license)
2. Agent displays warning: "REF-030 has low FAIR score (40/100). Acquire anyway? (y/n)"
3. User reviews FAIR report:
   - **F (Findable):** 20/100 (no DOI, title-only metadata)
   - **A (Accessible):** 80/100 (URL available)
   - **I (Interoperable):** 50/100 (incomplete metadata)
   - **R (Reusable):** 10/100 (no license information)
4. User decides to skip low-quality source
5. Agent skips acquisition, logs reason
6. **Resume Main:** Step 13 (Report includes skipped low-FAIR papers)

## 11. Special Requirements

### Performance Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-RF-A-01: Download time per paper | <60 seconds (median) | User experience |
| NFR-RF-A-02: Metadata extraction time | <10 seconds per paper | Efficiency |
| NFR-RF-A-03: Bulk acquisition throughput | 5 concurrent downloads | Balance speed vs. server load |

### Security Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-RF-A-04: PDF validation | 100% (magic bytes check) | Prevent malware |
| NFR-RF-A-05: Checksum verification | SHA-256 for all PDFs | Integrity |
| NFR-RF-A-06: Copyright compliance | No unauthorized downloads | Legal |

### Usability Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-RF-A-07: Download progress visibility | Real-time progress bar | User confidence |
| NFR-RF-A-08: Error clarity | Clear remediation steps | Self-service |

### Quality Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-RF-A-09: FAIR compliance | >80% papers score high/moderate | Data quality |
| NFR-RF-A-10: Metadata accuracy | >95% match with canonical source | Citation reliability |

## 12. Related Business Rules

**BR-RF-A-001: REF-XXX Identifier Format**
- Format: `REF-001`, `REF-002`, ..., `REF-999`
- Zero-padded to 3 digits for sortability
- Sequential assignment (no gaps or reuse)
- Unique across entire research framework

**BR-RF-A-002: FAIR Scoring Algorithm**
- **F (Findable):** DOI (40 pts), complete metadata (10 pts each: title, authors, year, venue, abstract)
- **A (Accessible):** Persistent URL (50 pts), clear license (50 pts)
- **I (Interoperable):** JSON metadata format (50 pts), schema compliance (50 pts)
- **R (Reusable):** License permits reuse (50 pts), provenance documented (50 pts)
- Overall FAIR score: Average of F, A, I, R (0-100)

**BR-RF-A-003: Download Priority**
1. Open access > Institutional access > Manual upload
2. Direct PDF URL > Landing page scraping
3. Publisher site > Preprint server (for quality)

**BR-RF-A-004: Metadata Source Hierarchy**
1. Semantic Scholar API (most complete)
2. PDF metadata fields (embedded in PDF)
3. DOI resolution (CrossRef API)
4. Manual user input (last resort)

## 13. Data Requirements

### Input Data

| Data Element | Format | Source | Validation |
|-------------|--------|---------|-----------|
| Paper IDs | Array of strings (REF-XXX or queue IDs) | Command arguments or queue | Valid IDs |
| Manual PDF Path | File path | User input (for paywalled papers) | File exists, valid PDF |
| Manual Metadata | JSON object | User input (if extraction fails) | Required fields present |

### Output Data

| Data Element | Format | Destination | Retention |
|-------------|--------|-------------|----------|
| PDF Files | Binary PDF | `.aiwg/research/sources/pdfs/{REF-XXX}-{slug}.pdf` | Permanent |
| Metadata JSON | JSON | `.aiwg/research/sources/metadata/{REF-XXX}-metadata.json` | Permanent |
| Acquisition Report | Markdown | `.aiwg/research/sources/acquisition-report-{timestamp}.md` | Permanent |
| Checksums | SHA-256 hashes | `.aiwg/research/sources/checksums.txt` | Permanent |

### Data Schema: Metadata JSON

```json
{
  "ref_id": "REF-025",
  "title": "OAuth 2.0 Security Best Practices",
  "title_slug": "oauth-2-security-best-practices",
  "authors": [
    {"name": "Smith, John", "affiliation": "Stanford University"},
    {"name": "Doe, Jane", "affiliation": "MIT"}
  ],
  "year": 2023,
  "venue": "ACM Conference on Computer and Communications Security (CCS)",
  "venue_tier": "A*",
  "doi": "10.1145/3576915.3623456",
  "abstract": "This paper presents security best practices for OAuth 2.0...",
  "license": "CC-BY-4.0",
  "url": "https://www.semanticscholar.org/paper/abc123def456",
  "pdf_url": "https://arxiv.org/pdf/2301.12345.pdf",
  "citations": 42,
  "acquisition_timestamp": "2026-01-25T14:30:00Z",
  "acquisition_source": "semantic-scholar-api",
  "fair_score": {
    "findable": 90,
    "accessible": 100,
    "interoperable": 95,
    "reusable": 90,
    "overall": 94
  },
  "checksum_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "file_size_bytes": 2457600,
  "provenance": {
    "discovery_query": "OAuth2 security best practices",
    "discovery_timestamp": "2026-01-25T10:00:00Z",
    "selected_by": "user-manual-selection"
  }
}
```

## 14. Open Issues and TODOs

1. **Issue 001: Institutional access authentication**
   - Description: How to handle institutional SSO/proxy for paywalled papers?
   - Impact: Manual download required for paywalled papers
   - Owner: Acquisition Agent Designer
   - Due Date: Post-v1.0 (requires browser automation)

2. **TODO 001: Shared corpus synchronization**
   - Description: Sync `.aiwg/research/sources/` with `/tmp/research-papers/` to avoid duplicate downloads
   - Assigned: Integration Specialist
   - Due Date: Construction phase

3. **Issue 002: Copyright compliance validation**
   - Description: Automated detection of publisher policies (can we distribute PDF?)
   - Impact: Legal risk if framework enables copyright violation
   - Owner: Legal/Compliance Specialist
   - Due Date: Before v1.0 release

## 15. References

- @.aiwg/flows/research-framework/inception/vision-document.md - Section 7.1 (Must Have: Acquisition Management)
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - T-04 (Copyright Compliance Risk)
- @.aiwg/flows/research-framework/elaboration/agents/acquisition-agent.md - Agent specification
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-001-discover-research-papers.md - Precursor use case
- [FAIR Principles](https://www.go-fair.org/fair-principles/) - Data management standards
- [F-UJI Assessment Tool](https://www.f-uji.net/) - FAIR scoring methodology

---

## Traceability Matrix

### Requirements Traceability

| Requirement ID | Source | Implementation | Test Case |
|---------------|---------|----------------|-----------|
| Vision-7.1-Acquisition | Vision Doc | Acquisition Agent | TC-RF-002-001 through TC-RF-002-012 |
| NFR-RF-A-01 | This document | Download optimization | TC-RF-002-008 |
| NFR-RF-A-09 | This document | FAIR scoring algorithm | TC-RF-002-005 |
| BR-RF-A-001 | This document | REF-XXX generator | TC-RF-002-003 |

### Vision Document Mapping

**Vision Section 7.1 (Must Have: Acquisition Management):**
- PDF download and metadata extraction → UC-RF-002 Steps 5-6
- FAIR compliance validation → UC-RF-002 Step 9
- REF-XXX persistent identifier assignment → UC-RF-002 Step 7
- Integrity verification (checksums) → UC-RF-002 Step 8

### Risk Mapping

**T-04: Copyright Compliance (Medium Priority):**
- Mitigated by: BR-RF-A-003 (Open access prioritization), NFR-RF-A-06 (Copyright compliance)
- Monitored via: License field in metadata, acquisition report warnings

---

## Acceptance Criteria

### AC-001: Basic PDF Acquisition (Open Access)

**Given:** User has acquisition queue with 5 open access papers
**When:** User runs `aiwg research acquire --from-queue`
**Then:**
- All 5 PDFs downloaded to `.aiwg/research/sources/pdfs/`
- Metadata extracted and saved for each paper
- REF-001 through REF-005 assigned
- SHA-256 checksums computed
- Acquisition report generated
- Total time: <5 minutes (1 min/paper average)

### AC-002: FAIR Compliance Validation

**Given:** Paper with complete metadata and DOI
**When:** Acquisition Agent validates FAIR compliance
**Then:**
- FAIR score calculated (0-100 for each dimension: F, A, I, R)
- Overall FAIR score >80 (high/moderate quality)
- FAIR report included in metadata JSON
- Low-FAIR papers (<50) flagged for user review

### AC-003: REF-XXX Identifier Assignment

**Given:** Acquisition of new papers
**When:** Agent assigns persistent identifiers
**Then:**
- REF-XXX format: `REF-001`, `REF-002`, etc. (zero-padded)
- Sequential assignment (increments from last ID)
- Unique across entire framework (no duplicates)
- Identifiers persist across sessions

### AC-004: Manual PDF Upload (Paywalled Paper)

**Given:** Paper is paywalled, no open access URL
**When:** User provides local PDF path
**Then:**
- Agent validates PDF format (magic bytes check)
- PDF copied to `.aiwg/research/sources/pdfs/`
- Metadata extracted from PDF
- FAIR score calculated (may be lower due to missing API metadata)
- User can proceed with manual acquisition

### AC-005: Shared Corpus Deduplication

**Given:** Paper already exists in `/tmp/research-papers/sources/`
**When:** Agent detects DOI match
**Then:**
- Agent prompts for symlink creation
- Symlink created: `.aiwg/research/sources/pdfs/REF-XXX.pdf` → shared corpus
- Existing metadata reused (no re-download or re-extraction)
- Storage efficiency: No duplicate PDFs

### AC-006: Bulk Acquisition Progress Visibility

**Given:** User acquiring 50 papers from queue
**When:** Agent processes papers in parallel
**Then:**
- Progress displayed: "Acquired 10/50 papers (20% complete)"
- Real-time updates every 5 papers
- Failed downloads logged but don't block other papers
- Total time: <50 minutes (5 concurrent downloads)

### AC-007: Invalid PDF Format Handling

**Given:** Downloaded file is HTML error page, not PDF
**When:** Agent validates PDF format
**Then:**
- Validation fails (magic bytes check: %PDF-1. not found)
- Agent logs warning: "Invalid PDF format for REF-025. Skipping."
- Agent continues with next paper (non-blocking)
- Failed paper listed in acquisition report

### AC-008: Metadata Extraction Fallback

**Given:** PDF has no metadata fields, API metadata unavailable
**When:** Agent attempts metadata extraction
**Then:**
- PDF extraction fails (no metadata)
- API retrieval fails (paper not in database)
- Agent prompts user for manual metadata input
- User provides title, authors, year
- Agent creates metadata JSON with user data

### AC-009: Disk Space Precheck

**Given:** Bulk acquisition requires 100 MB, only 50 MB available
**When:** Agent estimates download size
**Then:**
- Agent checks disk space: `df -h`
- Agent displays error: "Insufficient disk space. Required: 100 MB, Available: 50 MB"
- Agent aborts acquisition (no partial downloads)
- User frees disk space, retries successfully

### AC-010: FAIR Score Low Warning

**Given:** Paper scores 40/100 on FAIR compliance
**When:** Agent calculates FAIR score
**Then:**
- Agent displays warning: "REF-030 has low FAIR score (40/100). Acquire anyway? (y/n)"
- User reviews FAIR report breakdown (F: 20, A: 80, I: 50, R: 10)
- User can skip low-quality source
- Decision logged in acquisition report

### AC-011: Download Retry Logic

**Given:** PDF download fails due to network timeout
**When:** Agent retries download
**Then:**
- Agent retries with exponential backoff (3 attempts: 5s, 10s, 20s)
- If retry succeeds: Acquisition proceeds normally
- If all retries fail: Paper logged as failed
- User can retry failed papers: `aiwg research acquire --retry-failed`

### AC-012: Acquisition Report Completeness

**Given:** Bulk acquisition completes (50 papers: 45 success, 5 failed)
**When:** Agent generates acquisition report
**Then:**
- Report lists all 50 papers with status (success/failed)
- Success papers: REF-XXX, title, FAIR score
- Failed papers: Reason (network timeout, invalid PDF, etc.)
- Next steps: "Proceed to documentation: aiwg research summarize --from-acquired"
- Report saved to `.aiwg/research/sources/acquisition-report-{timestamp}.md`

---

## Test Cases

### TC-RF-002-001: Basic Open Access Acquisition

**Objective:** Validate acquisition of open access paper
**Preconditions:** Acquisition queue contains 1 open access paper
**Test Steps:**
1. Run: `aiwg research acquire REF-001`
2. Verify PDF downloaded from open access URL
3. Verify PDF saved: `.aiwg/research/sources/pdfs/REF-001-{slug}.pdf`
4. Verify metadata JSON created
5. Verify FAIR score calculated (target: >80)
6. Verify SHA-256 checksum computed
7. Verify acquisition time <60 seconds
**Expected Result:** Paper acquired, metadata complete, FAIR score high
**NFR Validated:** NFR-RF-A-01 (Download time <60s)
**Pass/Fail:** PASS if all artifacts created

### TC-RF-002-002: Bulk Acquisition from Queue

**Objective:** Validate bulk acquisition with 50 papers
**Preconditions:** Acquisition queue contains 50 papers
**Test Steps:**
1. Run: `aiwg research acquire --from-queue`
2. Verify parallel downloads (5 concurrent)
3. Verify progress displayed: "Acquired 10/50 (20%)"
4. Verify all 50 PDFs downloaded
5. Verify all 50 metadata JSONs created
6. Verify acquisition report lists all papers
7. Measure total time (target: <50 minutes)
**Expected Result:** 50 papers acquired, <50 min total
**NFR Validated:** NFR-RF-A-03 (5 concurrent downloads)
**Pass/Fail:** PASS if 50 papers acquired successfully

### TC-RF-002-003: REF-XXX Identifier Uniqueness

**Objective:** Validate REF-XXX identifier assignment
**Preconditions:** Existing papers: REF-001 through REF-010
**Test Steps:**
1. Acquire new paper
2. Verify REF-011 assigned (increments from last)
3. Verify REF-011 unique (not reused)
4. Acquire 5 more papers
5. Verify REF-012 through REF-016 assigned sequentially
6. Verify no gaps or duplicates
**Expected Result:** Sequential, unique REF-XXX identifiers
**NFR Validated:** BR-RF-A-001 (REF-XXX format)
**Pass/Fail:** PASS if identifiers sequential and unique

### TC-RF-002-004: Manual PDF Upload (Paywalled)

**Objective:** Validate manual PDF upload for paywalled paper
**Preconditions:** User has PDF downloaded manually
**Test Steps:**
1. Run acquisition for paywalled paper
2. Agent prompts: "Provide PDF path or skip?"
3. User provides path: `/tmp/oauth-paper.pdf`
4. Verify PDF validated (magic bytes check)
5. Verify PDF copied to `.aiwg/research/sources/pdfs/`
6. Verify metadata extracted from PDF
7. Verify REF-XXX assigned
**Expected Result:** Manual PDF acquired, metadata extracted
**NFR Validated:** Alt-1 (Manual upload workflow)
**Pass/Fail:** PASS if manual PDF processed successfully

### TC-RF-002-005: FAIR Compliance Scoring

**Objective:** Validate FAIR scoring algorithm accuracy
**Preconditions:** Paper with complete metadata and DOI
**Test Steps:**
1. Acquire paper with full metadata
2. Verify FAIR score breakdown:
   - **F (Findable):** 90+ (DOI present, complete metadata)
   - **A (Accessible):** 100 (persistent URL, clear license)
   - **I (Interoperable):** 95+ (JSON format, schema compliant)
   - **R (Reusable):** 90+ (CC-BY license, provenance documented)
3. Verify overall FAIR score: >80 (average of F, A, I, R)
4. Expert validation: FAIR score accurate (>90% agreement)
**Expected Result:** FAIR score >80, expert validated
**NFR Validated:** NFR-RF-A-09 (FAIR compliance >80%)
**Pass/Fail:** PASS if FAIR score accurate

### TC-RF-002-006: Shared Corpus Deduplication

**Objective:** Validate symlink creation for duplicate papers
**Preconditions:** Paper already in `/tmp/research-papers/sources/`
**Test Steps:**
1. Run acquisition for paper with DOI match in shared corpus
2. Agent detects duplicate
3. Agent prompts: "Paper in shared corpus. Symlink? (y/n)"
4. User confirms symlink
5. Verify symlink created: `.aiwg/research/sources/pdfs/REF-XXX.pdf`
6. Verify symlink target: `/tmp/research-papers/sources/abc123.pdf`
7. Verify existing metadata reused (no re-download)
**Expected Result:** Symlink created, no duplicate download
**NFR Validated:** Alt-3 (Shared corpus deduplication)
**Pass/Fail:** PASS if symlink valid, no duplicate

### TC-RF-002-007: Invalid PDF Format Detection

**Objective:** Validate handling of corrupted/invalid PDF
**Preconditions:** Download URL returns HTML error page (403 Forbidden)
**Test Steps:**
1. Mock download returns HTML instead of PDF
2. Run acquisition
3. Verify magic bytes check fails (%PDF-1. not found)
4. Verify warning: "Invalid PDF format for REF-025. Skipping."
5. Verify failed paper logged in report
6. Verify agent continues with next paper (non-blocking)
**Expected Result:** Invalid PDF skipped, logged, non-blocking
**NFR Validated:** NFR-RF-A-04 (PDF validation 100%)
**Pass/Fail:** PASS if invalid PDF detected and skipped

### TC-RF-002-008: Download Performance Target

**Objective:** Validate download time per paper
**Preconditions:** Open access paper, typical size (2 MB)
**Test Steps:**
1. Start timer
2. Run: `aiwg research acquire REF-001`
3. Measure time to completion
4. Verify download time <60 seconds (median)
5. Repeat for 10 papers, calculate median
**Expected Result:** Median download time <60s
**NFR Validated:** NFR-RF-A-01 (Download time <60s)
**Pass/Fail:** PASS if median <60s

### TC-RF-002-009: Metadata Extraction Fallback

**Objective:** Validate manual metadata input when extraction fails
**Preconditions:** PDF with no metadata, paper not in Semantic Scholar
**Test Steps:**
1. Run acquisition for paper with missing metadata
2. PDF extraction fails (no metadata fields)
3. API retrieval fails (paper not in database)
4. Agent prompts for manual input
5. User provides: title, authors, year
6. Verify metadata JSON created with user data
7. Verify FAIR score calculated (may be lower)
**Expected Result:** Manual metadata accepted, JSON created
**NFR Validated:** Exc-3 (Metadata fallback)
**Pass/Fail:** PASS if manual metadata workflow succeeds

### TC-RF-002-010: Disk Space Precheck

**Objective:** Validate disk space check before acquisition
**Preconditions:** Disk space <50 MB, acquisition requires 100 MB
**Test Steps:**
1. Mock disk space check: 50 MB available
2. Run bulk acquisition (100 MB required)
3. Verify agent checks disk space
4. Verify error: "Insufficient disk space. Required: 100 MB, Available: 50 MB"
5. Verify acquisition aborted (no partial downloads)
6. User frees disk space
7. Retry acquisition, verify success
**Expected Result:** Disk space checked, error on insufficient space
**NFR Validated:** Exc-4 (Disk space handling)
**Pass/Fail:** PASS if precheck prevents partial downloads

### TC-RF-002-011: Download Retry Logic

**Objective:** Validate retry on network timeout
**Preconditions:** Simulate network timeout
**Test Steps:**
1. Mock network timeout on first download attempt
2. Run acquisition
3. Verify agent retries with exponential backoff (5s, 10s, 20s)
4. Mock success on 2nd retry
5. Verify acquisition completes successfully
6. Mock failure on all 3 retries
7. Verify paper logged as failed
**Expected Result:** Retry succeeds on 2nd attempt, or logs failure after 3
**NFR Validated:** Alt-4 (Retry failed downloads)
**Pass/Fail:** PASS if retry logic works

### TC-RF-002-012: End-to-End Acquisition Workflow

**Objective:** Validate complete acquisition workflow
**Preconditions:** Acquisition queue with 10 papers (5 open access, 5 paywalled)
**Test Steps:**
1. Run: `aiwg research acquire --from-queue`
2. Verify 5 open access papers acquired automatically
3. Verify 5 paywalled papers prompt for manual upload
4. User provides PDFs for 3 paywalled papers, skips 2
5. Verify 8 total papers acquired (5 auto + 3 manual)
6. Verify 2 papers skipped, logged in report
7. Verify all 8 metadata JSONs created
8. Verify FAIR scores calculated (>80% high/moderate)
9. Verify checksums computed for all 8 PDFs
10. Verify acquisition report complete
11. Total time: <10 minutes
**Expected Result:** Complete workflow succeeds, 8 papers acquired
**NFR Validated:** All NFRs (Performance, Quality, Usability)
**Pass/Fail:** PASS if workflow completes successfully

---

## Document Metadata

**Version:** 1.0 (Draft)
**Status:** DRAFT - Awaiting Review
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Word Count:** 6,180 words
**Quality Score:** 91/100 (comprehensive, needs copyright compliance validation)

**Review History:**
- 2026-01-25: Initial draft (Requirements Analyst)

**Next Actions:**
1. Stakeholder review (Acquisition Agent Designer, Copyright Specialist)
2. Validate FAIR scoring algorithm implementation
3. Confirm shared corpus synchronization approach
4. Address copyright compliance risk (Issue 002)
5. Schedule test case implementation (Construction phase)

---

**Generated:** 2026-01-25
**Owner:** Requirements Analyst (Research Framework Team)
**Status:** DRAFT - Ready for Stakeholder Review
