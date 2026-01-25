# Agent Specification: Quality Agent

## 1. Agent Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Quality Agent |
| **ID** | research-quality-agent |
| **Purpose** | Assess source quality using GRADE framework, validate FAIR compliance, generate quality reports, and enforce quality gates |
| **Lifecycle Stage** | Cross-cutting (integrated with Documentation, Integration stages) |
| **Model** | sonnet |
| **Version** | 1.0.0 |
| **Status** | Draft |

### Description

The Quality Agent ensures research integrity by systematically evaluating sources using established frameworks. It calculates multi-dimensional quality scores (authority, currency, accuracy, coverage, objectivity), applies GRADE methodology for evidence assessment, validates FAIR principles for data quality, and generates actionable quality reports with recommendations. The agent serves as a quality gate, flagging low-quality sources and recommending alternatives.

## 2. Capabilities

### Primary Capabilities

| Capability | Description | NFR Reference |
|------------|-------------|---------------|
| Multi-Dimensional Scoring | Evaluate authority, currency, accuracy, coverage, objectivity | BR-QA-002 |
| GRADE Assessment | Rate evidence quality (High/Moderate/Low/Very Low) | NFR-QA-04 |
| FAIR Validation | Check Findable, Accessible, Interoperable, Reusable principles | NFR-QA-04 |
| Quality Reporting | Generate clear, actionable quality reports | NFR-QA-05 |
| Quality Gates | Flag low-quality sources, recommend alternatives | BR-QA-001 |
| Batch Assessment | Assess multiple sources efficiently | NFR-QA-02 |

### Secondary Capabilities

| Capability | Description |
|------------|-------------|
| Citation Analysis | Retrieve and analyze citation counts |
| Venue Ranking | Assess publication venue quality (A*/A/B/C) |
| Conflict Detection | Identify contradictory or conflicting quality signals |
| Remediation Guidance | Provide steps to improve FAIR compliance |

## 3. Tools

### Required Tools

| Tool | Purpose | Permission |
|------|---------|------------|
| Bash | Execute external APIs, file operations | Execute |
| Read | Access source metadata, existing assessments | Read |
| Write | Save quality reports, update metadata | Write |
| Glob | Find sources for batch assessment | Read |
| Grep | Search metadata for quality indicators | Read |

### External APIs

| API | Endpoint | Purpose | Auth |
|-----|----------|---------|------|
| Semantic Scholar | `api.semanticscholar.org` | Citation counts | None |
| CrossRef | `api.crossref.org` | Publication metadata | None |
| OpenCitations | `opencitations.net/index` | Citation network | None |

## 4. Triggers

### Automatic Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Documentation Complete | Paper documented (UC-RF-003) | Assess quality |
| Acquisition Complete | Paper acquired (UC-RF-002) | FAIR pre-check |
| Workflow Stage | UC-RF-008 initiates quality stage | Batch assessment |

### Manual Triggers

| Trigger | Command | Description |
|---------|---------|-------------|
| Single Assessment | `aiwg research assess-quality REF-XXX` | Assess one source |
| Batch Assessment | `aiwg research assess-quality --all` | Assess all sources |
| FAIR Check | `aiwg research fair-check REF-XXX` | FAIR validation only |
| Quality Report | `aiwg research quality-report` | Generate summary report |

## 5. Inputs/Outputs

### Inputs

| Input | Format | Source | Validation |
|-------|--------|--------|------------|
| Source Metadata | YAML frontmatter + Markdown | `.aiwg/research/sources/` | Required fields present |
| Citation Information | Structured citation | Source metadata | Valid format |
| Source Type | Enum | Source metadata | Valid type |
| Publication Date | ISO 8601 | Source metadata | Valid date |

### Outputs

| Output | Format | Location | Retention |
|--------|--------|----------|-----------|
| Quality Report | Markdown | `.aiwg/research/quality/{REF-XXX}-quality-report.md` | Permanent |
| Quality Score | Integer (0-100) | Source metadata frontmatter | Permanent |
| GRADE Rating | Enum | Source metadata frontmatter | Permanent |
| FAIR Compliance | Boolean + details | Source metadata frontmatter | Permanent |
| Aggregate Report | Markdown | `.aiwg/research/quality/quality-summary.md` | Updated continuously |

### Output Schema: Quality Report Frontmatter

```yaml
---
ref_id: REF-025
assessment_date: 2026-01-25
quality_score: 87
grade_rating: High
fair_compliant: true
dimension_scores:
  authority: 85
  currency: 90
  accuracy: 95
  coverage: 80
  objectivity: 85
grade_details:
  study_design: "Randomized controlled trial"
  risk_of_bias: "Low"
  consistency: "Consistent with other studies"
  directness: "Directly addresses question"
  precision: "Adequate sample size"
  publication_bias: "No evidence"
fair_details:
  findable: true
  accessible: true
  interoperable: true
  reusable: true
recommendation: "Approved for integration"
---
```

### Output Schema: Quality Report Body

```markdown
# Quality Assessment Report: REF-025

## Executive Summary

**Overall Score:** 87/100 (High Quality)
**GRADE Rating:** High (strong confidence in evidence)
**FAIR Compliance:** 4/4 principles met
**Recommendation:** Approved for integration

## Dimension Scores

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Authority | 85 | 30% | 25.5 |
| Currency | 90 | 20% | 18.0 |
| Accuracy | 95 | 25% | 23.75 |
| Coverage | 80 | 15% | 12.0 |
| Objectivity | 85 | 10% | 8.5 |
| **Total** | - | 100% | **87.75** |

## Strengths

- Peer-reviewed in A* venue (ACM CCS)
- Recent publication (2023)
- Comprehensive methodology documented
- Large sample size (10,000 users)

## Limitations

- Single institution study (generalizability concern)

## Recommendations

- Approved for integration
- Suitable for primary evidence
- Consider supplementing with multi-site studies
```

## 6. Dependencies

### Agent Dependencies

| Agent | Relationship | Interaction |
|-------|--------------|-------------|
| Documentation Agent | Upstream | Provides paper metadata for assessment |
| Acquisition Agent | Upstream | Provides initial FAIR data |
| Workflow Agent | Orchestrator | Receives task assignments |
| Discovery Agent | Downstream | Filters discovery results by quality |

### Service Dependencies

| Service | Purpose | Fallback |
|---------|---------|----------|
| Semantic Scholar API | Citation counts | Skip citation analysis |
| File System | Report storage | Abort if unavailable |

### Data Dependencies

| Data | Location | Required |
|------|----------|----------|
| Source Metadata | `.aiwg/research/sources/metadata/` | Yes |
| Summaries | `.aiwg/research/knowledge/summaries/` | Optional (for accuracy) |
| Extractions | `.aiwg/research/knowledge/extractions/` | Optional |

## 7. Configuration Options

### Agent Configuration

```yaml
# .aiwg/research/config/quality-agent.yaml
quality_agent:
  # Quality Thresholds
  thresholds:
    high_quality: 70
    moderate_quality: 50
    low_quality: 0  # Below 50

  # Dimension Weights (must sum to 1.0)
  dimension_weights:
    authority: 0.30
    currency: 0.20
    accuracy: 0.25
    coverage: 0.15
    objectivity: 0.10

  # GRADE Configuration
  grade:
    starting_level:
      randomized_trial: "High"
      observational_study: "Low"
      expert_opinion: "Very Low"
    downgrade_factors:
      - risk_of_bias
      - inconsistency
      - indirectness
      - imprecision
      - publication_bias
    upgrade_factors:
      - large_effect
      - dose_response
      - confounders_adjusted

  # FAIR Validation
  fair:
    require_doi: true
    require_license: true
    minimum_metadata_fields: 5

  # External API Integration
  apis:
    citation_source: semantic-scholar
    fallback_source: crossref
    cache_ttl_hours: 24

  # Reporting
  reporting:
    max_report_words: 500
    include_recommendations: true
    include_strengths: true
    include_limitations: true
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `AIWG_QUALITY_THRESHOLD` | Minimum quality for approval | 70 |
| `AIWG_QUALITY_CACHE_TTL` | Citation cache TTL in hours | 24 |

## 8. Error Handling

### Error Categories

| Error Type | Severity | Handling Strategy |
|------------|----------|-------------------|
| Source Not Found | Error | Prompt to document first |
| Metadata Incomplete | Warning | Proceed with partial assessment |
| API Unavailable | Warning | Skip citation analysis |
| Conflicting Signals | Info | Flag for manual review |
| FAIR Violation | Warning | Generate remediation guidance |

### Error Response Template

```json
{
  "error_code": "QUALITY_METADATA_INCOMPLETE",
  "severity": "warning",
  "ref_id": "REF-025",
  "message": "Source metadata incomplete for full quality assessment",
  "missing_fields": ["publication_date", "source_type"],
  "remediation": "Complete source documentation before quality assessment",
  "partial_assessment_available": true
}
```

## 9. Metrics/Observability

### Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Assessment time | <30 seconds | Timer per source |
| Batch throughput | 100 sources / 15 min | Sources per time |
| GRADE consistency | >80% agreement | Agent vs. expert |
| False positive rate | <10% | Incorrectly flagged |

### Logging

| Log Level | Events |
|-----------|--------|
| INFO | Assessment start, score calculated, report generated |
| DEBUG | Dimension calculations, API calls, GRADE logic |
| WARNING | Low quality detected, FAIR violation, API fallback |
| ERROR | Assessment failed, invalid metadata |

## 10. Example Usage

### Single Source Assessment

```bash
# Assess quality of one source
aiwg research assess-quality REF-025

# Output:
# Assessing quality of REF-025: "OAuth 2.0 Security Best Practices"
#
# Retrieving citation data from Semantic Scholar...
# Citation count: 42
#
# Evaluating dimensions:
# - Authority: 85/100 (peer-reviewed A* venue, known authors)
# - Currency: 90/100 (published 2023, active research area)
# - Accuracy: 95/100 (methodology documented, data cited)
# - Coverage: 80/100 (comprehensive, single institution)
# - Objectivity: 85/100 (balanced, minimal bias)
#
# Overall Score: 87/100 (High Quality)
# GRADE Rating: High (strong confidence)
# FAIR Compliance: 4/4 principles met
#
# Recommendation: Approved for integration
#
# Report saved: .aiwg/research/quality/REF-025-quality-report.md
```

### Batch Assessment

```bash
# Assess all documented sources
aiwg research assess-quality --all

# Output:
# Batch quality assessment for 25 sources...
#
# [1/25] REF-001: 82/100 (High) OK
# [2/25] REF-002: 75/100 (High) OK
# [3/25] REF-003: 45/100 (Low) WARNING: Low quality source
# ...
# [25/25] REF-025: 87/100 (High) OK
#
# Batch Summary:
# - High Quality (70+): 18 sources (72%)
# - Moderate Quality (50-69): 5 sources (20%)
# - Low Quality (<50): 2 sources (8%)
#
# Recommendations:
# - REF-003: Seek higher-quality alternative (blog post, no citations)
# - REF-017: FAIR violation - add DOI for findability
```

### FAIR Validation

```bash
# Check FAIR compliance only
aiwg research fair-check REF-025

# Output:
# FAIR Validation for REF-025
#
# Findable:
#   [OK] DOI present: 10.1145/3576915.3623456
#   [OK] Metadata complete (title, authors, year, venue, abstract)
#
# Accessible:
#   [OK] Persistent URL available
#   [OK] License documented: CC-BY-4.0
#
# Interoperable:
#   [OK] Metadata in JSON format
#   [OK] Schema compliant
#
# Reusable:
#   [OK] License permits reuse
#   [OK] Provenance documented
#
# FAIR Compliance: 4/4 principles met (Fully Compliant)
```

### Quality Gate Enforcement

```bash
# Integration workflow with quality gate
aiwg research integrate --enforce-quality-gate

# Output:
# Quality gate enabled (minimum score: 70)
#
# Checking quality scores for 25 sources...
# - 23 sources pass quality gate
# - 2 sources below threshold:
#   - REF-003: 45/100 (BLOCKED)
#   - REF-017: 52/100 (BLOCKED)
#
# Options:
# 1. Proceed with 23 high-quality sources
# 2. Lower quality threshold (not recommended)
# 3. Seek alternative sources for blocked papers
#
# Choice: 1
# Proceeding with 23 quality-approved sources...
```

## 11. Related Use Cases

| Use Case | Relationship | Description |
|----------|--------------|-------------|
| UC-RF-006 | Primary | Assess Source Quality |
| UC-RF-003 | Upstream | Document Research Paper (provides metadata) |
| UC-RF-008 | Orchestrated | Execute Research Workflow (quality gate) |
| UC-RF-001 | Downstream | Discover Research Papers (quality filtering) |

## 12. Implementation Notes

### Architecture Considerations

1. **Deterministic Scoring**: Same inputs always produce same scores
2. **Configurable Weights**: Allow domain-specific weight adjustment
3. **Extensible Dimensions**: Support custom quality dimensions
4. **Caching**: Cache citation counts to reduce API calls

### Performance Optimizations

1. **Parallel API Calls**: Fetch citations for multiple sources concurrently
2. **Batch Processing**: Process multiple sources in single pass
3. **Incremental Assessment**: Only re-assess changed metadata
4. **Result Caching**: Cache API responses with TTL

### Security Considerations

1. **No Data Modification**: Quality agent only reads and reports
2. **API Rate Limiting**: Respect external API rate limits
3. **Metadata Integrity**: Don't trust unvalidated metadata

### Testing Strategy

| Test Type | Coverage Target | Focus Areas |
|-----------|-----------------|-------------|
| Unit Tests | 80% | Scoring algorithms, GRADE logic |
| Integration Tests | 70% | API interaction, report generation |
| E2E Tests | Key workflows | Full assessment workflow |

### Known Limitations

1. **Citation Lag**: New papers may lack citation data
2. **Venue Coverage**: Not all venues have tier rankings
3. **Subjective Elements**: Some quality aspects require human judgment
4. **API Dependencies**: External APIs may be unavailable

---

## References

- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-006-assess-source-quality.md
- [GRADE Framework](https://www.gradeworkinggroup.org/)
- [FAIR Principles](https://www.go-fair.org/fair-principles/)

---

## Document Metadata

**Version:** 1.0 (Draft)
**Status:** DRAFT - Awaiting Review
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Owner:** Agent Designer (Research Framework Team)
