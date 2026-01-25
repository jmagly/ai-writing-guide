# Agent Specification: Acquisition Agent

## 1. Agent Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Acquisition Agent |
| **ID** | research-acquisition-agent |
| **Purpose** | Download research papers, extract metadata, validate FAIR compliance, and assign persistent identifiers |
| **Lifecycle Stage** | Acquisition (Stage 2 of Research Framework) |
| **Model** | sonnet |
| **Version** | 1.0.0 |
| **Status** | Draft |

### Description

The Acquisition Agent transforms discovery results into a structured research corpus. It downloads PDFs from open access sources, extracts or retrieves metadata, assigns REF-XXX persistent identifiers, computes SHA-256 checksums for integrity verification, and validates FAIR (Findable, Accessible, Interoperable, Reusable) compliance. The agent handles paywalled papers through manual upload workflows and integrates with shared research-papers repositories to avoid duplicate downloads.

## 2. Capabilities

### Primary Capabilities

| Capability | Description | NFR Reference |
|------------|-------------|---------------|
| PDF Download | Download papers from Semantic Scholar, arXiv, publisher sites | NFR-RF-A-01 |
| Metadata Extraction | Extract title, authors, year, DOI from PDF or API | NFR-RF-A-02 |
| FAIR Validation | Score papers on Findable, Accessible, Interoperable, Reusable criteria | NFR-RF-A-09 |
| Checksum Computation | Generate SHA-256 hashes for integrity verification | NFR-RF-A-05 |
| REF-XXX Assignment | Assign sequential persistent identifiers | BR-RF-A-001 |
| Bulk Acquisition | Process multiple papers in parallel with rate limiting | NFR-RF-A-03 |

### Secondary Capabilities

| Capability | Description |
|------------|-------------|
| Manual Upload Handling | Accept user-provided PDFs for paywalled papers |
| Shared Corpus Deduplication | Create symlinks to existing papers in shared repository |
| Format Validation | Verify PDF format via magic bytes check |
| Progress Reporting | Real-time progress updates for bulk operations |

## 3. Tools

### Required Tools

| Tool | Purpose | Permission |
|------|---------|------------|
| Bash | Execute downloads, compute checksums | Execute |
| Read | Access acquisition queue, existing metadata | Read |
| Write | Save PDFs, metadata JSON, reports | Write |
| Glob | Find existing papers for deduplication | Read |
| Grep | Search metadata for duplicates | Read |

### External APIs

| API | Endpoint | Purpose | Auth |
|-----|----------|---------|------|
| Semantic Scholar | `api.semanticscholar.org` | Paper metadata, open access URLs | None |
| arXiv | `arxiv.org/pdf/` | Direct PDF download | None |
| CrossRef | `api.crossref.org` | DOI resolution | None |
| Unpaywall | `api.unpaywall.org` | Open access detection | Email header |

### System Tools

| Tool | Purpose |
|------|---------|
| `curl` / `wget` | HTTP downloads with resume support |
| `sha256sum` | Checksum computation |
| `file` | MIME type validation |
| `pdftotext` | PDF text extraction |

## 4. Triggers

### Automatic Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Discovery Complete | Acquisition queue populated (UC-RF-001) | Start bulk acquisition |
| Workflow Stage | UC-RF-008 initiates Stage 2 | Process workflow queue |

### Manual Triggers

| Trigger | Command | Description |
|---------|---------|-------------|
| Single Acquisition | `aiwg research acquire REF-XXX` | Acquire specific paper |
| Bulk from Queue | `aiwg research acquire --from-queue` | Process entire queue |
| Manual Upload | `aiwg research acquire --upload /path/to/file.pdf` | Add local PDF |
| Retry Failed | `aiwg research acquire --retry-failed` | Retry failed downloads |

### Event Triggers

| Event | Source | Action |
|-------|--------|--------|
| Paper Selected | Discovery Agent | Add to acquisition queue |
| Quality Gate Failed | Workflow Agent | Acquire additional sources |

## 5. Inputs/Outputs

### Inputs

| Input | Format | Source | Validation |
|-------|--------|--------|------------|
| Acquisition Queue | JSON | `.aiwg/research/discovery/acquisition-queue.json` | Valid paper IDs |
| Paper IDs | Array of strings | Command arguments | Valid IDs in queue |
| Manual PDF Path | File path | User input | File exists, valid PDF |
| Manual Metadata | JSON object | User input (if extraction fails) | Required fields present |

### Outputs

| Output | Format | Location | Retention |
|--------|--------|----------|-----------|
| PDF Files | Binary PDF | `.aiwg/research/sources/pdfs/{REF-XXX}-{slug}.pdf` | Permanent |
| Metadata JSON | JSON | `.aiwg/research/sources/metadata/{REF-XXX}-metadata.json` | Permanent |
| Acquisition Report | Markdown | `.aiwg/research/sources/acquisition-report-{timestamp}.md` | Permanent |
| Checksums | Text | `.aiwg/research/sources/checksums.txt` | Permanent |

### Output Schema: Metadata JSON

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

## 6. Dependencies

### Agent Dependencies

| Agent | Relationship | Interaction |
|-------|--------------|-------------|
| Discovery Agent | Upstream | Receives acquisition queue |
| Documentation Agent | Downstream | Provides PDFs and metadata for UC-RF-003 |
| Workflow Agent | Orchestrator | Receives task assignments, reports completion |
| Provenance Agent | Observer | Logs all acquisition operations |

### Service Dependencies

| Service | Purpose | Fallback |
|---------|---------|----------|
| HTTP Downloads | Paper acquisition | Manual upload |
| Semantic Scholar API | Metadata retrieval | PDF extraction |
| File System | PDF and metadata storage | Abort if unavailable |

### Data Dependencies

| Data | Location | Required |
|------|----------|----------|
| Acquisition Queue | `.aiwg/research/discovery/acquisition-queue.json` | Yes |
| REF Counter | `.aiwg/research/sources/ref-counter.txt` | Yes (created if missing) |
| Shared Corpus | `/tmp/research-papers/sources/` | Optional |

## 7. Configuration Options

### Agent Configuration

```yaml
# .aiwg/research/config/acquisition-agent.yaml
acquisition_agent:
  # Download Configuration
  download:
    timeout_seconds: 60
    retry_attempts: 3
    retry_backoff_ms: [5000, 10000, 20000]
    concurrent_downloads: 5
    user_agent: "AIWG Research Framework/1.0 (research tool)"

  # Storage Configuration
  storage:
    pdf_directory: ".aiwg/research/sources/pdfs"
    metadata_directory: ".aiwg/research/sources/metadata"
    max_file_size_mb: 100
    permissions: "644"

  # FAIR Scoring Weights
  fair_scoring:
    findable:
      doi_present: 40
      metadata_complete: 10  # per field: title, authors, year, venue, abstract
    accessible:
      persistent_url: 50
      clear_license: 50
    interoperable:
      json_format: 50
      schema_compliance: 50
    reusable:
      license_permits_reuse: 50
      provenance_documented: 50

  # Shared Corpus Integration
  shared_corpus:
    enabled: true
    path: "/tmp/research-papers/sources"
    symlink_enabled: true

  # REF-XXX Format
  ref_format:
    prefix: "REF"
    digits: 3  # REF-001, REF-002, etc.
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `AIWG_RESEARCH_DOWNLOAD_TIMEOUT` | Download timeout in seconds | 60 |
| `AIWG_RESEARCH_CONCURRENT_DOWNLOADS` | Max parallel downloads | 5 |
| `AIWG_RESEARCH_SHARED_CORPUS` | Path to shared paper repository | None |

## 8. Error Handling

### Error Categories

| Error Type | Severity | Handling Strategy |
|------------|----------|-------------------|
| Download Timeout | Warning | Retry 3x with backoff |
| 404 Not Found | Warning | Log, skip, continue with next |
| Invalid PDF | Warning | Flag for manual upload |
| Disk Full | Error | Abort, cleanup, notify user |
| Metadata Extraction Failed | Warning | Prompt for manual input |
| Checksum Mismatch | Error | Re-download and verify |

### Error Response Template

```json
{
  "error_code": "ACQUISITION_DOWNLOAD_FAILED",
  "severity": "warning",
  "paper_id": "abc123def456",
  "message": "Failed to download PDF: Network timeout after 60 seconds",
  "retry_count": 3,
  "remediation": "Provide manual PDF upload or skip this paper",
  "next_action": "Continue with remaining papers"
}
```

### Recovery Procedures

| Scenario | Procedure |
|----------|-----------|
| Partial acquisition failure | Save successful downloads, log failures, allow retry |
| Corrupted download | Delete partial file, retry from scratch |
| Metadata extraction failed | Use API metadata, prompt user if unavailable |
| Shared corpus unavailable | Fall back to local-only storage |

## 9. Metrics/Observability

### Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Download time per paper | <60 seconds median | Timer from request to save |
| Metadata extraction time | <10 seconds | Timer for extraction |
| Bulk throughput | 5 concurrent downloads | Active downloads |
| Success rate | >90% | Successful / total attempted |

### Logging

| Log Level | Events |
|-----------|--------|
| INFO | Acquisition start, paper acquired, completion |
| DEBUG | Download progress, metadata extraction steps |
| WARNING | Retry triggered, FAIR score low, paywalled paper |
| ERROR | Download failed, disk error, validation failure |

### Telemetry

```json
{
  "event": "acquisition_complete",
  "timestamp": "2026-01-25T14:30:00Z",
  "metrics": {
    "papers_attempted": 25,
    "papers_acquired": 23,
    "papers_failed": 2,
    "total_size_mb": 115.5,
    "average_download_time_ms": 8500,
    "fair_score_average": 87
  }
}
```

## 10. Example Usage

### Single Paper Acquisition

```bash
# Acquire a specific paper from queue
aiwg research acquire REF-025

# Output:
# Acquiring REF-025: "OAuth 2.0 Security Best Practices"
# Downloading from: https://arxiv.org/pdf/2301.12345.pdf
# Download complete: 2.4 MB
# Validating PDF format... OK
# Extracting metadata... OK
# Computing SHA-256 checksum... OK
# FAIR validation: 94/100 (High)
# Saved: .aiwg/research/sources/pdfs/REF-025-oauth-2-security-best-practices.pdf
# Metadata: .aiwg/research/sources/metadata/REF-025-metadata.json
```

### Bulk Acquisition from Queue

```bash
# Acquire all papers in queue
aiwg research acquire --from-queue

# Output:
# Acquisition queue: 25 papers
# Processing 5 concurrent downloads...
# [1/25] REF-001: Downloading... OK (1.2 MB)
# [2/25] REF-002: Downloading... OK (3.4 MB)
# [3/25] REF-003: PAYWALLED - Manual upload required
# ...
# [25/25] REF-025: Downloading... OK (2.4 MB)
#
# Acquisition Summary:
# - Acquired: 23/25 (92%)
# - Paywalled: 2 (manual upload required)
# - Total size: 115.5 MB
# - Average FAIR score: 87/100
#
# Report saved: .aiwg/research/sources/acquisition-report-2026-01-25T14-30-00.md
```

### Manual PDF Upload

```bash
# Upload paywalled paper manually
aiwg research acquire --upload /tmp/oauth-paper.pdf --ref REF-003

# Output:
# Validating PDF format... OK
# Extracting metadata from PDF...
# - Title: "OAuth 2.0 Authorization Framework"
# - Authors: [auto-extracted]
# - Year: 2023
# Confirm metadata? (y/n/edit): y
# Assigning identifier: REF-003
# Computing checksum... OK
# FAIR validation: 72/100 (Moderate - missing license info)
# Saved: .aiwg/research/sources/pdfs/REF-003-oauth-2-authorization-framework.pdf
```

### Shared Corpus Deduplication

```bash
# Paper already in shared corpus
aiwg research acquire REF-042

# Output:
# Checking shared corpus at /tmp/research-papers/sources/...
# Match found: Paper already acquired (DOI: 10.1145/example)
# Create symlink to shared corpus? (y/n): y
# Symlink created: .aiwg/research/sources/pdfs/REF-042.pdf -> /tmp/research-papers/sources/abc123.pdf
# Reusing existing metadata (no re-download)
```

## 11. Related Use Cases

| Use Case | Relationship | Description |
|----------|--------------|-------------|
| UC-RF-002 | Primary | Acquire Research Source with FAIR Validation |
| UC-RF-001 | Upstream | Discover Research Papers (provides queue) |
| UC-RF-003 | Downstream | Document Research Paper (receives PDFs) |
| UC-RF-008 | Orchestrated | Execute Research Workflow (Stage 2) |

## 12. Implementation Notes

### Architecture Considerations

1. **Parallel Download Management**: Use worker pool for concurrent downloads
2. **Transactional Acquisition**: All-or-nothing per paper (no partial saves)
3. **Idempotent Operations**: Re-acquiring same paper updates metadata, doesn't duplicate
4. **Storage Efficiency**: Symlinks for shared corpus, deduplication by DOI

### Performance Optimizations

1. **Streaming Downloads**: Stream large files to avoid memory issues
2. **Parallel Checksums**: Compute checksum while downloading (stream hash)
3. **Batch Metadata Retrieval**: Query API for multiple papers in one request
4. **Resume Support**: Resume interrupted downloads when supported

### Security Considerations

1. **URL Validation**: Only download from whitelisted domains
2. **File Type Verification**: Magic bytes check, not just extension
3. **Checksum Verification**: Detect corrupted or tampered files
4. **Copyright Compliance**: Respect publisher terms, prioritize open access

### Testing Strategy

| Test Type | Coverage Target | Focus Areas |
|-----------|-----------------|-------------|
| Unit Tests | 80% | Metadata extraction, FAIR scoring, REF assignment |
| Integration Tests | 70% | Download handling, file I/O, API interaction |
| E2E Tests | Key workflows | Full acquisition from queue to storage |

### Known Limitations

1. **Paywalled Papers**: Cannot auto-download; require manual upload
2. **Rate Limits**: Some publishers block rapid downloads
3. **PDF Quality**: Scanned PDFs may have poor metadata extraction
4. **Large Files**: Papers >100MB may timeout on slow connections

---

## References

- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-002-acquire-research-source.md
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 7.1 (Acquisition Management)
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - T-04 (Copyright Compliance)
- [FAIR Principles](https://www.go-fair.org/fair-principles/)

---

## Document Metadata

**Version:** 1.0 (Draft)
**Status:** DRAFT - Awaiting Review
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Owner:** Agent Designer (Research Framework Team)
