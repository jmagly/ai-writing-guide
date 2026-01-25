# Agent Specification: Documentation Agent

## 1. Agent Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Documentation Agent |
| **ID** | research-documentation-agent |
| **Purpose** | Summarize papers using LLM with RAG pattern, extract structured data, grade source quality, and create Zettelkasten-style literature notes |
| **Lifecycle Stage** | Documentation (Stage 3 of Research Framework) |
| **Model** | opus (for summarization quality) or sonnet (for efficiency) |
| **Version** | 1.0.0 |
| **Status** | Draft |

### Description

The Documentation Agent transforms raw PDFs into actionable knowledge. It extracts text from PDFs, generates summaries using RAG (Retrieval-Augmented Generation) to prevent hallucinations, extracts structured data (claims, methods, findings), calculates GRADE-inspired quality scores, and creates Zettelkasten literature notes with proper attribution. The agent achieves 75% time savings compared to manual documentation (5 minutes vs. 20 minutes per paper).

## 2. Capabilities

### Primary Capabilities

| Capability | Description | NFR Reference |
|------------|-------------|---------------|
| PDF Text Extraction | Extract readable text preserving structure | NFR-RF-D-03 |
| RAG Summarization | Generate summaries grounded in source text | NFR-RF-D-01 |
| Hallucination Detection | Validate claims against source content | NFR-RF-D-02 |
| Structured Extraction | Extract claims, methods, datasets, findings | NFR-RF-D-03 |
| GRADE Scoring | Assess evidence quality (risk of bias, consistency, etc.) | NFR-RF-D-05 |
| Literature Notes | Create atomic, tagged, linked notes (Zettelkasten) | NFR-RF-D-06 |

### Secondary Capabilities

| Capability | Description |
|------------|-------------|
| Progressive Summarization | Generate multi-level summaries (1-page, 1-paragraph, 1-sentence) |
| OCR Fallback | Extract text from scanned/image-based PDFs |
| Bulk Processing | Document multiple papers sequentially |
| Map of Content | Generate topic-based indexes across notes |

## 3. Tools

### Required Tools

| Tool | Purpose | Permission |
|------|---------|------------|
| Bash | Execute PDF tools, manage files | Execute |
| Read | Access PDFs, metadata, existing notes | Read |
| Write | Save summaries, extractions, notes | Write |
| Glob | Find related notes for linking | Read |
| Grep | Search for hallucination validation | Read |

### System Tools

| Tool | Purpose | Required |
|------|---------|----------|
| `pdftotext` | PDF text extraction (poppler-utils) | Yes |
| `tesseract` | OCR for scanned PDFs | Optional |
| `PyPDF2` | Python PDF manipulation | Optional |

### LLM Integration

| Model | Purpose | Settings |
|-------|---------|----------|
| Claude (opus/sonnet) | Summarization, extraction | Temperature: 0.3 |
| Local LLM (optional) | Fallback for privacy/cost | Temperature: 0.3 |

## 4. Triggers

### Automatic Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Acquisition Complete | Paper acquired (UC-RF-002) | Document paper |
| Workflow Stage | UC-RF-008 initiates Stage 3 | Process workflow papers |

### Manual Triggers

| Trigger | Command | Description |
|---------|---------|-------------|
| Single Paper | `aiwg research summarize REF-XXX` | Document one paper |
| Bulk Processing | `aiwg research summarize --from-acquired` | Document all acquired |
| Progressive Mode | `aiwg research summarize REF-XXX --progressive` | Multi-level summaries |
| Create Note | `aiwg research note-create --permanent --based-on REF-XXX` | Permanent note |
| Create MoC | `aiwg research moc-create "Topic Name"` | Map of Content |

## 5. Inputs/Outputs

### Inputs

| Input | Format | Source | Validation |
|-------|--------|--------|------------|
| REF-XXX Identifier | String | Command argument | Valid REF-XXX exists |
| LLM Model Selection | Enum | Optional flag `--llm` | Valid model name |
| Progressive Levels | Integer (1-3) | Optional flag | 1=page, 2=para, 3=sentence |

### Outputs

| Output | Format | Location | Retention |
|--------|--------|----------|-----------|
| Summary | Markdown | `.aiwg/research/knowledge/summaries/{REF-XXX}-summary.md` | Permanent |
| Extraction | JSON | `.aiwg/research/knowledge/extractions/{REF-XXX}-extraction.json` | Permanent |
| Literature Note | Markdown | `.aiwg/research/knowledge/notes/{REF-XXX}-literature-note.md` | Permanent |
| Permanent Note | Markdown | `.aiwg/research/knowledge/notes/permanent-{topic}-{timestamp}.md` | Permanent |
| Map of Content | Markdown | `.aiwg/research/knowledge/maps/{topic-slug}.md` | Permanent |

### Output Schema: Structured Extraction JSON

```json
{
  "ref_id": "REF-025",
  "extraction_timestamp": "2026-01-25T16:00:00Z",
  "llm_model": "claude-opus-4",
  "claims": [
    "Token rotation reduces CSRF risk by 80% compared to static tokens",
    "OAuth 2.0 with PKCE prevents authorization code interception",
    "Refresh token rotation improves security without UX degradation"
  ],
  "methods": [
    "Controlled experiment with 10,000 users",
    "Security analysis using formal verification",
    "User study measuring UX impact (SUS score)"
  ],
  "datasets": [
    {
      "name": "OAuth Security Dataset",
      "size": "10,000 user sessions",
      "source": "Production deployment (anonymized)"
    }
  ],
  "metrics": [
    {"name": "CSRF attack success rate", "baseline": "12%", "intervention": "2.4%"},
    {"name": "SUS usability score", "baseline": "78", "intervention": "76"}
  ],
  "findings": [
    {
      "claim": "Token rotation reduces CSRF risk by 80%",
      "statistic": "p < 0.001",
      "confidence_interval": "95% CI: [75%, 85%]"
    }
  ],
  "related_work": [
    "10.1145/3133956.3133980",
    "10.1145/3243734.3243820"
  ]
}
```

### Output Schema: Summary Frontmatter (YAML)

```yaml
---
ref_id: REF-025
title: "OAuth 2.0 Security Best Practices"
authors: ["Smith, J.", "Doe, J."]
year: 2023
summarized_date: 2026-01-25
llm_model: claude-opus-4
summary_type: full  # or progressive
grade_quality_score:
  risk_of_bias: 20
  consistency: 20
  directness: 20
  precision: 15
  publication_bias: 15
  overall_score: 90
  overall_grade: "High"
tags: [oauth, security, authentication, tokens]
---
```

## 6. Dependencies

### Agent Dependencies

| Agent | Relationship | Interaction |
|-------|--------------|-------------|
| Acquisition Agent | Upstream | Receives PDFs and metadata |
| Citation Agent | Downstream | Provides extractions for citations |
| Quality Agent | Collaborative | Shares GRADE scoring |
| Workflow Agent | Orchestrator | Receives task assignments |
| Provenance Agent | Observer | Logs documentation operations |

### Service Dependencies

| Service | Purpose | Fallback |
|---------|---------|----------|
| LLM API | Summarization, extraction | Local model or manual |
| PDF Tools | Text extraction | OCR if extraction fails |
| File System | Storage | Abort if unavailable |

### Data Dependencies

| Data | Location | Required |
|------|----------|----------|
| PDF Files | `.aiwg/research/sources/pdfs/` | Yes |
| Metadata JSON | `.aiwg/research/sources/metadata/` | Yes |
| Existing Notes | `.aiwg/research/knowledge/notes/` | Optional (for linking) |

## 7. Configuration Options

### Agent Configuration

```yaml
# .aiwg/research/config/documentation-agent.yaml
documentation_agent:
  # LLM Configuration
  llm:
    default_model: claude-opus-4  # Best quality
    fallback_model: claude-sonnet-4  # Faster, cheaper
    local_model: null  # e.g., llama-3
    temperature: 0.3
    max_tokens: 4000
    timeout_seconds: 120

  # PDF Extraction
  pdf:
    tool: pdftotext  # or pypdf2
    ocr_fallback: true
    ocr_tool: tesseract
    min_text_length: 100  # Below this triggers OCR

  # GRADE Scoring Weights
  grade_scoring:
    risk_of_bias: 25
    consistency: 20
    directness: 20
    precision: 20
    publication_bias: 15

  # Hallucination Detection
  hallucination:
    enabled: true
    confidence_threshold: 0.9  # Flag if match < 90%
    user_review_required: true

  # Zettelkasten Settings
  notes:
    max_length_words: 500  # Atomic notes
    auto_link: true
    tag_extraction: true
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `AIWG_RESEARCH_LLM_MODEL` | Default LLM for summarization | claude-opus-4 |
| `AIWG_RESEARCH_LLM_TIMEOUT` | LLM request timeout | 120 |
| `AIWG_RESEARCH_OCR_ENABLED` | Enable OCR fallback | true |

## 8. Error Handling

### Error Categories

| Error Type | Severity | Handling Strategy |
|------------|----------|-------------------|
| PDF Extraction Failed | Warning | Try OCR, prompt for manual |
| LLM API Unavailable | Warning | Retry, fallback to local, manual |
| Hallucination Detected | Warning | Flag for user review |
| Incomplete Extraction | Warning | Prompt for manual completion |
| GRADE Score Incomplete | Info | Proceed with partial score |

### Error Response Template

```json
{
  "error_code": "DOCUMENTATION_LLM_HALLUCINATION",
  "severity": "warning",
  "ref_id": "REF-025",
  "message": "Potential hallucination detected in summary",
  "details": {
    "flagged_claim": "Paper cites Smith et al. 2020",
    "evidence": "Citation not found in paper text"
  },
  "remediation": "Review flagged content and approve or reject",
  "user_action_required": true
}
```

### Recovery Procedures

| Scenario | Procedure |
|----------|-----------|
| LLM rate limit | Wait and retry with exponential backoff |
| PDF is image-only | Trigger OCR workflow |
| Partial extraction | Save partial results, allow manual completion |
| User rejects hallucination | Regenerate without flagged content |

## 9. Metrics/Observability

### Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Summarization time | <5 minutes | Timer from start to save |
| Hallucination detection rate | >95% recall | Flagged hallucinations / actual |
| Extraction completeness | >90% fields | Populated fields / expected |
| GRADE consistency | >80% agreement | Agent score vs. expert |

### Logging

| Log Level | Events |
|-----------|--------|
| INFO | Documentation start, summary saved, completion |
| DEBUG | PDF extraction steps, LLM prompts, GRADE calculations |
| WARNING | OCR triggered, hallucination flagged, incomplete extraction |
| ERROR | LLM failure, PDF unreadable, validation error |

### Telemetry

```json
{
  "event": "documentation_complete",
  "timestamp": "2026-01-25T16:00:00Z",
  "metrics": {
    "ref_id": "REF-025",
    "pdf_pages": 12,
    "extraction_time_ms": 15000,
    "summarization_time_ms": 45000,
    "llm_tokens_used": 8500,
    "hallucinations_flagged": 0,
    "grade_score": 90,
    "extraction_completeness": 0.95
  }
}
```

## 10. Example Usage

### Basic Paper Summarization

```bash
# Document a single paper
aiwg research summarize REF-025

# Output:
# Processing REF-025: "OAuth 2.0 Security Best Practices"
# Extracting text from PDF... 12 pages, 8,500 words
# Generating summary via Claude opus...
# Validating for hallucinations... PASSED
# Extracting structured data...
#   - Claims: 5 extracted
#   - Methods: 3 extracted
#   - Findings: 4 extracted
# Calculating GRADE score... 90/100 (High)
# Creating literature note...
#
# Documentation Complete:
# - Summary: .aiwg/research/knowledge/summaries/REF-025-summary.md
# - Extraction: .aiwg/research/knowledge/extractions/REF-025-extraction.json
# - Literature Note: .aiwg/research/knowledge/notes/REF-025-literature-note.md
# - GRADE Score: 90/100 (High quality evidence)
```

### Progressive Summarization

```bash
# Generate multi-level summaries
aiwg research summarize REF-025 --progressive

# Output:
# Generating progressive summaries for REF-025...
#
# Level 1 (1-page summary): Complete
# Level 2 (1-paragraph summary): Complete
# Level 3 (1-sentence summary): Complete
#
# 1-Sentence: "This paper demonstrates that OAuth 2.0 token rotation reduces CSRF attacks by 80% with minimal UX impact."
#
# All levels saved to: .aiwg/research/knowledge/summaries/REF-025-summary.md
```

### Bulk Documentation

```bash
# Document all acquired papers
aiwg research summarize --from-acquired

# Output:
# Processing 20 acquired papers...
# [1/20] REF-001: Summarizing... OK (4 min 30 sec)
# [2/20] REF-002: Summarizing... OK (3 min 45 sec)
# [3/20] REF-003: HALLUCINATION FLAGGED - Review required
# ...
# [20/20] REF-020: Summarizing... OK (5 min 10 sec)
#
# Batch Summary:
# - Documented: 19/20 (95%)
# - Flagged for review: 1
# - Average time: 4 min 15 sec
# - Total LLM tokens: 170,000
```

### Map of Content Creation

```bash
# Create topic overview
aiwg research moc-create "LLM Evaluation Methods"

# Output:
# Scanning knowledge base for related notes...
# Found 15 notes tagged "llm-evaluation"
#
# Generating Map of Content...
# - Overview: LLM evaluation landscape
# - Subtopic: Benchmark datasets (5 notes)
# - Subtopic: Human evaluation (4 notes)
# - Subtopic: Automatic metrics (6 notes)
#
# MoC saved: .aiwg/research/knowledge/maps/llm-evaluation-methods.md
```

## 11. Related Use Cases

| Use Case | Relationship | Description |
|----------|--------------|-------------|
| UC-RF-003 | Primary | Document Research Paper with LLM Summarization |
| UC-RF-002 | Upstream | Acquire Research Source (provides PDFs) |
| UC-RF-004 | Downstream | Integrate Citations (uses extractions) |
| UC-RF-006 | Collaborative | Assess Source Quality (shares GRADE) |
| UC-RF-008 | Orchestrated | Execute Research Workflow (Stage 3) |

## 12. Implementation Notes

### Architecture Considerations

1. **RAG Pattern Critical**: All summarization must use paper text as context
2. **Hallucination Prevention**: Validate every claim against source text
3. **Atomic Notes**: Literature notes should contain one main idea
4. **Idempotent Operations**: Re-documenting updates, doesn't duplicate

### Performance Optimizations

1. **Chunked Processing**: Process large PDFs in semantic chunks
2. **Parallel Extraction**: Extract structure while summarizing
3. **Caching**: Cache LLM responses for retry scenarios
4. **Streaming**: Stream summary generation for long papers

### Security Considerations

1. **No External Knowledge**: LLM must only use provided paper content
2. **Prompt Injection**: Sanitize paper content before LLM input
3. **API Key Security**: Use environment variables for LLM keys
4. **Content Privacy**: Don't send sensitive papers to external LLMs

### Testing Strategy

| Test Type | Coverage Target | Focus Areas |
|-----------|-----------------|-------------|
| Unit Tests | 80% | Text extraction, GRADE calculation, note formatting |
| Integration Tests | 70% | LLM interaction, file I/O, hallucination detection |
| E2E Tests | Key workflows | Full PDF to notes workflow |

### Known Limitations

1. **OCR Quality**: Scanned PDFs may have extraction errors
2. **LLM Costs**: Opus model is expensive for bulk operations
3. **Hallucination Risk**: RAG reduces but doesn't eliminate hallucinations
4. **Complex Tables**: Table extraction may be imperfect

---

## References

- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-003-document-research-paper.md
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 5.4 (Goal 4: Synthesize Knowledge)
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - T-01 (LLM Hallucination)
- [GRADE Framework](https://www.gradeworkinggroup.org/)
- [Zettelkasten Method](https://zettelkasten.de/introduction/)

---

## Document Metadata

**Version:** 1.0 (Draft)
**Status:** DRAFT - Awaiting Review
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Owner:** Agent Designer (Research Framework Team)
