---
# Research Document Frontmatter
# Schema: @.aiwg/research/schemas/frontmatter-schema.yaml
# Issue: #105

ref_id: "REF-XXX"
title: "Full Paper Title Here"
short_title: "Short Title"

authors:
  - name: "Author Name"
    affiliation: "Institution"
    orcid: "0000-0000-0000-0000"  # Optional

year: 2024
month: 1  # Optional

source_type: peer_reviewed_conference  # or: peer_reviewed_journal, preprint, etc.

venue:
  name: "Conference/Journal Name"
  abbreviation: "CONF"
  volume: ""
  pages: ""

identifiers:
  doi: "10.xxxx/xxxxx"  # Required for published papers
  arxiv: "2401.00000"   # For preprints
  url: "https://..."

keywords:
  - keyword1
  - keyword2

categories:
  - multi_agent_systems  # AIWG category
  - code_generation

abstract: |
  Paper abstract goes here. Minimum 50 characters required.

key_findings:
  - finding: "Primary finding statement"
    metric: "Quantified result (e.g., +20% improvement)"
    impact: high  # high, medium, low

aiwg_relevance:
  applicability: direct  # direct, partial, reference, background
  components_affected:
    - agents
    - flows
  implementation_priority: round-2  # top-10, round-2, round-3, future
  related_issues:
    - "#XXX"

quality_assessment:
  grade_baseline: moderate  # Based on source_type (high for peer-reviewed, moderate for preprints, low for whitepapers)
  downgrade_factors:
    risk_of_bias: {present: false, notes: ""}
    inconsistency: {present: false, notes: ""}
    indirectness: {present: false, notes: ""}
    imprecision: {present: false, notes: ""}
    publication_bias: {present: false, notes: ""}
  upgrade_factors:
    large_effect: {present: false, notes: ""}
    dose_response: {present: false, notes: ""}
    confounding: {present: false, notes: ""}
  final_grade: moderate  # HIGH, MODERATE, LOW, VERY LOW
  hedging_recommendations:
    allowed: []   # e.g., ["suggests", "indicates"]
    avoid: []     # e.g., ["demonstrates", "proves"]
  confidence_statement: ""  # e.g., "Further research likely to change confidence"

pdf_hash: ""  # SHA-256 hash of source PDF
analysis_date: "2026-01-25"
last_verified: "2026-01-25"
---

# REF-XXX: {{short_title}}

> **Source Paper**: [{{title}}]({{identifiers.url}})
> **Research Corpus**: [Full Documentation](https://git.integrolabs.net/roctinam/research-papers)
> **Analysis Date**: {{analysis_date}}

## Overview

Brief overview of the paper and its relevance to AIWG.

## AIWG Concept Mapping

| Paper Concept | AIWG Implementation | Coverage |
|---------------|---------------------|----------|
| Concept 1 | Implementation | **Strong/Partial/Weak** |

## Key Findings

### Finding 1

**Metric**: {{key_findings[0].metric}}

Description of the finding and its implications.

### Finding 2

Description and details.

## Implementation Opportunities

### Opportunity 1

**Priority**: {{aiwg_relevance.implementation_priority}}
**Components**: {{aiwg_relevance.components_affected}}

Description of the implementation opportunity.

## Best Practice Alignments

How this paper's recommendations align with or extend AIWG patterns.

## Improvement Opportunities

Gaps identified and recommended improvements.

## Quality Assessment

**GRADE**: {{quality_assessment.final_grade}}
**Confidence**: {{quality_assessment.confidence_statement}}

| Factor | Assessment | Notes |
|--------|------------|-------|
| Source Type | {{source_type}} | |
| Baseline | {{quality_assessment.grade_baseline}} | |
| Risk of Bias | {{quality_assessment.downgrade_factors.risk_of_bias.present}} | {{quality_assessment.downgrade_factors.risk_of_bias.notes}} |
| Inconsistency | {{quality_assessment.downgrade_factors.inconsistency.present}} | {{quality_assessment.downgrade_factors.inconsistency.notes}} |
| Indirectness | {{quality_assessment.downgrade_factors.indirectness.present}} | {{quality_assessment.downgrade_factors.indirectness.notes}} |
| Imprecision | {{quality_assessment.downgrade_factors.imprecision.present}} | {{quality_assessment.downgrade_factors.imprecision.notes}} |
| Publication Bias | {{quality_assessment.downgrade_factors.publication_bias.present}} | {{quality_assessment.downgrade_factors.publication_bias.notes}} |
| Large Effect | {{quality_assessment.upgrade_factors.large_effect.present}} | {{quality_assessment.upgrade_factors.large_effect.notes}} |
| Dose-Response | {{quality_assessment.upgrade_factors.dose_response.present}} | {{quality_assessment.upgrade_factors.dose_response.notes}} |
| Confounding | {{quality_assessment.upgrade_factors.confounding.present}} | {{quality_assessment.upgrade_factors.confounding.notes}} |

### Hedging Recommendations

- **Allowed language**: {{quality_assessment.hedging_recommendations.allowed}}
- **Avoid**: {{quality_assessment.hedging_recommendations.avoid}}

## References

- Source: {{identifiers.doi}} or {{identifiers.arxiv}}
- Related Issues: {{aiwg_relevance.related_issues}}

---

**Analysis Status**: Complete
**Verified**: {{last_verified}}
