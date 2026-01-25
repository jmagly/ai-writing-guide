# ADR-RF-003: Quality Assessment Model

## Metadata

- **ID**: ADR-RF-003
- **Title**: Quality Assessment Model for Research Sources
- **Status**: Accepted
- **Created**: 2026-01-25
- **Updated**: 2026-01-25
- **Decision Makers**: Research Framework Architecture Team
- **Related ADRs**: ADR-RF-002 (Provenance Storage), ADR-RF-004 (Artifact Storage)

## Context

The Research Framework requires a systematic approach to assessing source quality to ensure that research decisions are informed by credible, reliable evidence. Quality assessment serves multiple purposes:

1. **Source Selection**: Filtering high-quality sources from large discovery results
2. **Evidence Grading**: Informing how much weight to give claims from different sources
3. **Gap Identification**: Revealing areas lacking high-quality evidence
4. **Reproducibility**: Providing transparent quality rationale for external verification

### Decision Drivers

1. **Academic Standards**: GRADE is the gold standard for evidence quality in systematic reviews
2. **Multi-Dimensional**: Quality is not single-score; different dimensions matter for different uses
3. **Automation**: Must support automated scoring while allowing human override (NFR-QA-03: 95%+ agreement)
4. **Accessibility**: Developers need usable quality signals without PhD-level training
5. **FAIR Compliance**: Quality metadata contributes to FAIR R1.2 (community standards)
6. **Performance**: NFR-QA-01 requires <30 seconds per source assessment

### GRADE Framework Overview

GRADE (Grading of Recommendations Assessment, Development and Evaluation) provides:

| Level | Confidence | Meaning |
|-------|------------|---------|
| High | Strong | Further research unlikely to change confidence |
| Moderate | Moderate | Further research may change estimate |
| Low | Limited | Further research likely to change estimate |
| Very Low | Very limited | Estimate very uncertain |

GRADE factors: Study design, risk of bias, inconsistency, indirectness, imprecision, publication bias.

## Decision

**Adopt a Multi-Dimensional Quality Model combining GRADE principles with weighted dimension scoring.**

### Model Architecture

```
                    ┌────────────────────────────────────────┐
                    │         Quality Assessment             │
                    │              Model                     │
                    └────────────────────┬───────────────────┘
                                         │
          ┌──────────────┬───────────────┼───────────────┬──────────────┐
          │              │               │               │              │
          ▼              ▼               ▼               ▼              ▼
    ┌──────────┐  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Authority│  │ Currency │   │ Accuracy │   │ Coverage │   │Objectivity│
    │   30%    │  │   20%    │   │   25%    │   │   15%    │   │   10%    │
    └────┬─────┘  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
         │             │              │              │              │
         └─────────────┴──────────────┴──────────────┴──────────────┘
                                      │
                                      ▼
                             ┌─────────────────┐
                             │  Overall Score  │
                             │    (0-100)      │
                             └────────┬────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
             ┌───────────┐     ┌───────────┐     ┌───────────┐
             │   GRADE   │     │   FAIR    │     │  Source   │
             │  Rating   │     │Compliance │     │   Type    │
             │(H/M/L/VL) │     │  (0-4)    │     │  Context  │
             └───────────┘     └───────────┘     └───────────┘
```

### Dimension Definitions

#### 1. Authority (30% weight)

Measures the credibility of the source creator and publisher.

| Score | Criteria |
|-------|----------|
| 90-100 | Peer-reviewed journal, established author, high citation count |
| 70-89 | Reputable conference, known organization, moderate citations |
| 50-69 | Technical blog by verified expert, company documentation |
| 30-49 | Self-published, unknown author, limited verification |
| 0-29 | Anonymous, unverifiable, known unreliable source |

**Automated Signals**: Citation count (Semantic Scholar), h-index, venue impact factor, author affiliation.

#### 2. Currency (20% weight)

Measures how recent and up-to-date the source is relative to topic dynamics.

| Score | Criteria |
|-------|----------|
| 90-100 | Published within 2 years, actively maintained |
| 70-89 | Published 2-5 years ago, topic evolves slowly |
| 50-69 | Published 5-10 years ago, foundational work |
| 30-49 | Older than 10 years, may be outdated |
| 0-29 | Significantly outdated, superseded by newer work |

**Automated Signals**: Publication date, last update date, topic velocity (via citation trends).

#### 3. Accuracy (25% weight)

Measures methodological rigor and verifiability.

| Score | Criteria |
|-------|----------|
| 90-100 | RCT/systematic review, methodology documented, data available |
| 70-89 | Peer-reviewed, methodology clear, reproducible |
| 50-69 | Internal review, methodology partially documented |
| 30-49 | No peer review, methodology unclear |
| 0-29 | Unverifiable claims, no methodology |

**Automated Signals**: Study design (extracted from abstract), data availability statement, conflict of interest disclosure.

#### 4. Coverage (15% weight)

Measures depth and comprehensiveness of the source.

| Score | Criteria |
|-------|----------|
| 90-100 | Comprehensive treatment, multiple perspectives, synthesis |
| 70-89 | Detailed coverage of specific aspect |
| 50-69 | Moderate depth, focused scope |
| 30-49 | Surface-level treatment |
| 0-29 | Incomplete, fragmentary coverage |

**Automated Signals**: Document length, section count, citation breadth, abstract completeness.

#### 5. Objectivity (10% weight)

Measures bias and balance.

| Score | Criteria |
|-------|----------|
| 90-100 | Balanced perspectives, conflicts disclosed, neutral tone |
| 70-89 | Mostly objective, minor bias indicators |
| 50-69 | Some bias evident, single perspective dominant |
| 30-49 | Clearly biased, commercial interest |
| 0-29 | Propaganda, undisclosed conflicts |

**Automated Signals**: Sentiment analysis, conflict of interest statements, funding sources.

### Overall Score Calculation

```
Overall Score = (Authority × 0.30) + (Currency × 0.20) + (Accuracy × 0.25) +
                (Coverage × 0.15) + (Objectivity × 0.10)
```

### Quality Thresholds

Per BR-QA-001:

| Range | Classification | Recommendation |
|-------|---------------|----------------|
| 70-100 | High Quality | Approved for integration |
| 50-69 | Moderate Quality | Requires review, conditional approval |
| 0-49 | Low Quality | Not recommended, seek alternatives |

### GRADE Rating Mapping

The overall score maps to GRADE-style ratings for academic contexts:

| Overall Score | GRADE Rating | Confidence |
|---------------|--------------|------------|
| 85-100 | High | Strong confidence in evidence |
| 70-84 | Moderate | Moderate confidence, likely suitable |
| 50-69 | Low | Limited confidence, use with caution |
| 0-49 | Very Low | Very limited confidence, seek better sources |

### Source Type Context

Different source types have adjusted expectations:

| Source Type | Authority Expectation | Accuracy Expectation |
|-------------|----------------------|---------------------|
| Peer-reviewed paper | 80+ | 85+ |
| Conference paper | 70+ | 75+ |
| Technical blog | 50+ | 60+ |
| Documentation | 60+ | 70+ |
| Opinion/perspective | 70+ (author) | 40+ (acceptable) |

## Consequences

### Positive

1. **Transparency**: Multi-dimensional scoring explains why sources are rated
2. **Flexibility**: Different use cases can weight dimensions differently
3. **Academic Alignment**: GRADE mapping provides academic credibility
4. **Automation**: Automated signals enable batch processing (NFR-QA-02)
5. **Human Override**: Dimension scores can be manually adjusted with rationale
6. **Progressive Disclosure**: Simple overall score for quick use, detailed dimensions for deep analysis

### Negative

1. **Complexity**: Five dimensions plus GRADE plus FAIR is conceptually heavy
2. **Subjectivity**: Some dimensions (objectivity, coverage) difficult to automate accurately
3. **Domain Variation**: Weights may need adjustment for different research domains
4. **Calibration**: Automated scoring requires ongoing calibration against human judgment

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Automated scores disagree with experts | Medium | Medium | NFR-QA-03 target 95% agreement, calibration dataset |
| Over-reliance on metrics | Medium | Low | Display qualitative rationale alongside scores |
| Domain-inappropriate weights | Medium | Medium | Domain-specific weight profiles, user customization |
| Gaming/manipulation | Low | Low | Multiple signals per dimension, human review for critical sources |

## Alternatives Considered

### Option A: GRADE-Only Assessment

**Description**: Use pure GRADE methodology with its four levels and specific criteria.

**Pros**:
- Academic gold standard
- Well-documented methodology
- Recognized credibility

**Cons**:
- Designed for clinical evidence, not software research
- Binary/categorical (not continuous scores)
- Requires expert judgment, hard to automate
- Steep learning curve for developers

**Decision**: Rejected as sole approach. GRADE informs the model but doesn't provide actionable scores for automated filtering.

### Option B: Single Numeric Score

**Description**: Simple 1-5 or 1-100 quality score without dimensions.

**Pros**:
- Maximum simplicity
- Easy to sort/filter
- Quick assessment

**Cons**:
- No explanation of why sources score as they do
- Different users value different quality aspects
- Hard to improve scores (what needs fixing?)
- Opaque decision-making

**Decision**: Rejected. Single scores obscure important quality nuances.

### Option C: Machine Learning Quality Prediction

**Description**: Train ML model to predict quality scores from metadata patterns.

**Pros**:
- Potentially higher accuracy
- Learns patterns humans miss
- Scales infinitely

**Cons**:
- Requires training data (labeled quality assessments)
- Black box explanations
- Model drift over time
- Infrastructure complexity

**Decision**: Deferred to v2.0 (TODO-002 in UC-RF-006). Current approach provides explainable baseline.

### Option D: Crowdsourced Quality Ratings

**Description**: Aggregate quality ratings from multiple users.

**Pros**:
- Diverse perspectives
- Scales with user base
- Self-correcting over time

**Cons**:
- Requires user community
- Cold start problem
- Manipulation risk
- Solo developer context lacks crowd

**Decision**: Rejected. Framework targets solo developers initially; crowdsourcing may be added later.

## Implementation Notes

### Quality Report Schema

```json
{
  "$schema": "https://aiwg.io/research/schemas/quality-report.json",
  "source_id": "REF-025",
  "assessed_at": "2026-01-25T16:00:00Z",
  "assessed_by": "quality-agent-v1.0.0",

  "dimensions": {
    "authority": {
      "score": 85,
      "signals": {
        "citation_count": 1250,
        "h_index": 45,
        "venue_impact": "high",
        "author_affiliation": "Stanford University"
      },
      "rationale": "High-impact venue, well-cited author with strong affiliation"
    },
    "currency": {
      "score": 90,
      "signals": {
        "publication_date": "2024-03-15",
        "topic_velocity": "high"
      },
      "rationale": "Recent publication in fast-moving field"
    },
    "accuracy": {
      "score": 95,
      "signals": {
        "study_design": "systematic_review",
        "peer_reviewed": true,
        "data_available": true
      },
      "rationale": "Systematic review with transparent methodology and available data"
    },
    "coverage": {
      "score": 80,
      "signals": {
        "page_count": 45,
        "section_count": 8,
        "references_count": 127
      },
      "rationale": "Comprehensive treatment with extensive references"
    },
    "objectivity": {
      "score": 85,
      "signals": {
        "conflicts_disclosed": true,
        "funding_disclosed": true,
        "tone": "neutral"
      },
      "rationale": "No conflicts, balanced perspective"
    }
  },

  "overall_score": 87,
  "grade_rating": "High",
  "fair_compliance": 4,
  "source_type": "systematic_review",

  "recommendation": "Approved for integration",
  "limitations": [],
  "human_override": null
}
```

### Configurable Weights

Users can customize dimension weights via `.aiwg/research/config/quality-criteria.yaml`:

```yaml
# Custom weight profile for software engineering research
weights:
  authority: 0.25      # Less emphasis on traditional credentials
  currency: 0.30       # More emphasis on recency (fast-moving field)
  accuracy: 0.20       # Methodology still important but flexible
  coverage: 0.15       # Unchanged
  objectivity: 0.10    # Unchanged

thresholds:
  high_quality: 70
  moderate_quality: 50
```

### Batch Assessment Performance

To meet NFR-QA-02 (100 sources in <15 minutes):
- Parallel API calls for metadata (Semantic Scholar, CrossRef)
- Cached venue/author metrics
- Progressive scoring (quick estimate first, detailed on demand)

## References

- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-006-assess-source-quality.md - Quality assessment use case
- @.aiwg/flows/research-framework/elaboration/nfr/NFR-RF-specifications.md - NFR-QA-01 through NFR-QA-06
- @.aiwg/flows/research-framework/inception/solution-profile.md - Section 3.2 (GRADE-inspired scoring)
- [GRADE Handbook](https://gdt.gradepro.org/app/handbook/handbook.html) - GRADE methodology
- [FAIR Principles](https://www.go-fair.org/fair-principles/) - R1.2 community standards

---

**Document Status**: Accepted
**Review Date**: 2026-01-25
**Next Review**: End of Construction Phase
