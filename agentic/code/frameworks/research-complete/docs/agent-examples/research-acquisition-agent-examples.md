# Research Acquisition Agent — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Example 1: Simple - Single Paper Acquisition

**Input:**
"Acquire paper REF-025 from the queue."

**Thought (Goal):**
I need to download the paper, extract metadata, assign REF-025, compute checksum, and validate FAIR compliance.

**Action:**
Load acquisition queue, find paper ID abc123def456, query Semantic Scholar API for open access URL.

**Observation:**
Found open access URL: https://arxiv.org/pdf/2301.12345.pdf. Paper is CC-BY-4.0 licensed.

**Thought (Reasoning):**
arXiv URL is reliable and fast. CC-BY-4.0 means high FAIR reusability score. I'll download directly from arXiv.

**Action:**
Download PDF using curl with 60-second timeout.

**Observation:**
Download complete: 2.4 MB in 3 seconds. File saved successfully.

**Thought (Extraction):**
PDF metadata shows: Title "OAuth 2.0 Security Best Practices", authors Smith & Doe, year 2023. Need to validate format.

**Action:**
Validate PDF format using `file` command and compute SHA-256 checksum.

**Observation:**
File type: PDF document, version 1.4. SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

**Thought (Reasoning):**
FAIR scoring: DOI present (+40), all metadata fields complete (+50), CC-BY-4.0 license (+100 for accessible+reusable), JSON format (+50), provenance will be documented (+50). Total: 94/100 (High).

**Output:**
```bash
# Download log
Acquiring REF-025: "OAuth 2.0 Security Best Practices"
Downloading from: https://arxiv.org/pdf/2301.12345.pdf
Download complete: 2.4 MB in 3 seconds
Validating PDF format... OK
Extracting metadata... OK
Computing SHA-256 checksum... OK
FAIR validation: 94/100 (High)

Saved:
- PDF: .aiwg/research/sources/pdfs/REF-025-oauth-2-security-best-practices.pdf
- Metadata: .aiwg/research/sources/metadata/REF-025-metadata.json
- Checksum: Updated .aiwg/research/sources/checksums.txt
```

**Why This Is Good:**
- Uses structured thought protocol (Goal → Action → Observation → Extraction → Reasoning)
- Shows decision-making for source selection (arXiv vs others)
- Validates file integrity with checksum
- Calculates detailed FAIR score with breakdown
- Provides clear output showing all saved artifacts

## Example 2: Moderate - Bulk Acquisition with Paywalled Paper

**Input:**
"Process the full acquisition queue with 5 papers."

**Thought (Goal):**
I need to process 5 papers: download PDFs, handle any paywalled papers, extract metadata, assign REF-XXX identifiers, and generate acquisition report.

**Action:**
Load `.aiwg/research/discovery/acquisition-queue.json`, read current ref counter (024), process papers sequentially with 3-second delays to respect rate limits.

**Observation:**
Queue contains: abc123 (arXiv), def456 (Semantic Scholar), ghi789 (paywalled-ACM), jkl012 (arXiv), mno345 (Semantic Scholar)

**Paper 1: abc123**

**Thought (Reasoning):**
Paper abc123 has arXiv ID, will download directly from arXiv for reliability.

**Action:**
Download https://arxiv.org/pdf/2206.00001.pdf

**Observation:**
Success: 1.8 MB, 2 seconds. PDF valid. Metadata extracted.

**Thought (Progress):**
Acquired REF-025 successfully. 1/5 complete.

**Paper 2: def456**

**Action:**
Query Semantic Scholar for paper def456 open access URL.

**Observation:**
Found OA URL via publisher. Download successful: 3.2 MB, 4 seconds.

**Thought (Progress):**
Acquired REF-026 successfully. 2/5 complete.

**Paper 3: ghi789 (Paywalled)**

**Action:**
Query Semantic Scholar and Unpaywall for paper ghi789.

**Observation:**
Semantic Scholar: No OA URL. Unpaywall: No OA version found. Publisher: ACM (paywalled).

**Thought (Exception):**
Paper ghi789 is paywalled. Cannot auto-download. Will flag for manual upload.

**Action:**
Add paper ghi789 to paywalled list in acquisition report.

**Observation:**
Paywalled paper logged. Metadata saved for manual upload workflow.

**Thought (Progress):**
REF-027 flagged for manual upload. 3/5 processed.

**Paper 4: jkl012**

**Action:**
Download from arXiv.

**Observation:**
Success: 2.1 MB. REF-028 acquired.

**Thought (Progress):**
4/5 complete.

**Paper 5: mno345**

**Action:**
Download from Semantic Scholar OA link.

**Observation:**
Success: 2.9 MB. REF-029 acquired.

**Thought (Synthesis):**
Batch complete: 4/5 papers acquired (80%), 1 paywalled (20%). Total size: 10.0 MB. Average FAIR score: 87/100 (4 papers averaged, excluding paywalled).

**Output:**
```markdown
# Acquisition Report: 2026-01-25T14:30:00Z

**Queue Size:** 5 papers
**Acquired:** 4 papers (80%)
**Paywalled:** 1 paper (20%)
**Failed:** 0 papers

## Summary
- Total size: 10.0 MB
- Average FAIR score: 87/100
- Time elapsed: 25 seconds

## Acquired Papers
| REF | Title | Source | FAIR Score |
|-----|-------|--------|------------|
| REF-025 | "Attention Is All You Need" | arXiv | 90/100 |
| REF-026 | "BERT: Pre-training of Deep Bidirectional Transformers" | Semantic Scholar | 88/100 |
| REF-028 | "Language Models are Few-Shot Learners" | arXiv | 92/100 |
| REF-029 | "Constitutional AI: Harmlessness from AI Feedback" | Semantic Scholar | 78/100 |

## Paywalled Papers (Manual Upload Required)
| Paper ID | Title | Publisher | Assigned REF |
|----------|-------|-----------|--------------|
| ghi789 | "Formal Verification of Neural Networks" | ACM | REF-027 |

**Next Steps:**
1. Manually download REF-027 from ACM Digital Library
2. Run: `aiwg research acquire --upload /path/to/paper.pdf --ref REF-027`

## FAIR Score Distribution
- High (≥80): 3 papers (75%)
- Moderate (60-79): 1 paper (25%)
- Low (<60): 0 papers (0%)
```

**Why This Is Good:**
- Handles mixed sources (arXiv, Semantic Scholar, paywalled)
- Gracefully handles paywalled paper without blocking others
- Tracks progress through batch with counters
- Generates comprehensive report with actionable next steps
- Calculates FAIR score distribution for quality insight
- Uses thought protocol to show decision-making at each step

## Example 3: Complex - Manual Upload with Metadata Extraction

**Input:**
"User uploads a paywalled paper manually: `aiwg research acquire --upload /tmp/acm-paper.pdf --ref REF-027`"

**Thought (Goal):**
I need to validate the uploaded PDF, extract metadata from the PDF itself (since no API metadata available), prompt user to confirm/correct extracted metadata, compute checksum, calculate FAIR score (will be lower due to manual upload), and complete acquisition.

**Action:**
Validate PDF format using `file` command.

**Observation:**
File type: PDF document, version 1.7. Size: 1.5 MB. Format valid.

**Thought (Reasoning):**
PDF is valid. Now attempt metadata extraction from PDF using pdftotext and parsing.

**Action:**
Extract text from first page using `pdftotext -f 1 -l 1 /tmp/acm-paper.pdf -`.

**Observation:**
Extracted text contains:
```
Formal Verification of Neural Networks: A Survey
John Smith¹, Jane Doe², Alice Johnson¹
¹University of California, Berkeley
²Stanford University
ACM Computing Surveys, Vol. 55, No. 3, 2023
DOI: 10.1145/3576915.3000000
```

**Thought (Extraction):**
Successfully extracted: Title "Formal Verification of Neural Networks: A Survey", Authors: Smith, Doe, Johnson, Year: 2023, Venue: "ACM Computing Surveys", DOI: 10.1145/3576915.3000000.

**Action:**
Present extracted metadata to user for confirmation.

**User Interaction:**
```
Extracted metadata:
- Title: "Formal Verification of Neural Networks: A Survey"
- Authors: ["Smith, John", "Doe, Jane", "Johnson, Alice"]
- Year: 2023
- Venue: "ACM Computing Surveys"
- DOI: 10.1145/3576915.3000000

Confirm metadata? (y/n/edit): y
```

**Observation:**
User confirmed metadata is correct.

**Thought (Reasoning):**
Metadata confirmed. Now compute checksum and FAIR score. FAIR score will be moderate because: paywalled source (lower accessibility), but DOI present and metadata complete.

**Action:**
Compute SHA-256 checksum using `sha256sum /tmp/acm-paper.pdf`.

**Observation:**
SHA-256: a7b9c8d1e2f3456789abcdef0123456789abcdef0123456789abcdef01234567

**Thought (Reasoning):**
FAIR scoring for manually uploaded paper:
- Findable: DOI present (+40), metadata complete (+50 for all fields)
- Accessible: No persistent URL (-50), License unknown (-50) = 0/100
- Interoperable: JSON format (+50), schema compliance (+50) = 100/100
- Reusable: License unknown (-50), provenance documented (+50) = 50/100
Overall: (90 + 0 + 100 + 50) / 4 = 60/100 (Moderate)

**Action:**
Copy PDF to `.aiwg/research/sources/pdfs/REF-027-formal-verification-neural-networks-survey.pdf`, save metadata JSON, update checksums file, generate acquisition confirmation.

**Observation:**
All files saved successfully. Acquisition complete.

**Thought (Exception):**
FAIR score is only 60/100 (Moderate) due to missing license information and lack of persistent URL. This is expected for manually uploaded paywalled papers. User should be informed.

**Output:**
```bash
Validating PDF format... OK
Extracting metadata from PDF...
  - Title: "Formal Verification of Neural Networks: A Survey"
  - Authors: ["Smith, John", "Doe, Jane", "Johnson, Alice"]
  - Year: 2023
  - Venue: "ACM Computing Surveys"
  - DOI: 10.1145/3576915.3000000

Confirm metadata? (y/n/edit): y

Metadata confirmed by user.
Assigning identifier: REF-027
Computing SHA-256 checksum... OK
FAIR validation: 60/100 (Moderate - manual upload, missing license info)

⚠️  Note: FAIR score is moderate due to:
  - No persistent open access URL (paywalled source)
  - License information not available

Saved:
- PDF: .aiwg/research/sources/pdfs/REF-027-formal-verification-neural-networks-survey.pdf
- Metadata: .aiwg/research/sources/metadata/REF-027-metadata.json
- Checksum: Updated .aiwg/research/sources/checksums.txt

Acquisition complete for REF-027.
```

**Why This Is Good:**
- Handles manual upload workflow gracefully
- Extracts metadata from PDF when API unavailable
- Prompts user for confirmation to catch extraction errors
- Explains FAIR score reduction with specific reasons
- Completes acquisition despite missing information
- Warns user about quality limitations
- Uses thought protocol to show metadata extraction and FAIR scoring logic
