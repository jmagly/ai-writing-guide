# REF-060: GRADE - Evidence Quality Assessment Framework

## Citation

GRADE Working Group (2004-2025). GRADE Handbook.

**Official Site**: https://www.gradeworkinggroup.org/
**Handbook**: https://gradepro.org/handbook/
**Software**: https://gradepro.org/

## Document Profile

| Attribute | Value |
|-----------|-------|
| Year | 2004 (initial), continuously updated |
| Type | Evidence quality assessment framework |
| Adoption | 100+ organizations worldwide (WHO, Cochrane, NICE) |
| AIWG Relevance | **High** - Provides systematic approach to research source quality assessment |

## Executive Summary

GRADE (Grading of Recommendations, Assessment, Development and Evaluations) is the most widely adopted framework for assessing evidence quality. It transforms subjective quality judgments into explicit, reproducible assessments rated from "High" to "Very Low" based on defined criteria.

### Key Insight

> "GRADE is the most widely adopted tool for grading the quality of evidence, with over 100 organizations worldwide officially endorsing GRADE."

**AIWG Implication**: AIWG needs a systematic quality assessment approach. Rather than inventing one, adapt GRADE's proven methodology for research source evaluation.

---

## Evidence Quality Levels

### Four Quality Levels

| Level | Definition | Confidence Interpretation |
|-------|------------|---------------------------|
| **High** | Very confident estimate is close to true effect | Further research very unlikely to change confidence |
| **Moderate** | Moderately confident; true effect likely close | Further research likely to have important impact |
| **Low** | Limited confidence; true effect may differ substantially | Further research very likely to have important impact |
| **Very Low** | Very little confidence; true effect likely different | Any estimate very uncertain |

### Starting Points

| Study Type | Starting Quality |
|------------|------------------|
| **Randomized Controlled Trials** | High |
| **Observational studies** | Low |

---

## Rating Factors

### Five Factors for Rating DOWN

| Factor | Description | Impact |
|--------|-------------|--------|
| **Risk of bias** | Methodological limitations | -1 or -2 |
| **Inconsistency** | Unexplained heterogeneity across studies | -1 or -2 |
| **Indirectness** | Evidence doesn't directly address question | -1 or -2 |
| **Imprecision** | Wide confidence intervals, small sample | -1 or -2 |
| **Publication bias** | Selective reporting of studies | -1 or -2 |

### Three Factors for Rating UP

| Factor | Description | Impact |
|--------|-------------|--------|
| **Large effect** | Large magnitude of effect | +1 or +2 |
| **Dose-response** | Gradient present | +1 |
| **Confounding** | Residual confounding would reduce effect | +1 |

---

## Key Findings for AIWG

### 1. Explicit Criteria Enable Reproducibility

> "GRADE provides a framework guiding through the critical components of the assessment in a structured way. By allowing to make the judgments explicit rather than implicit it ensures transparency and a clear basis for discussion."

**AIWG Implication**: Quality assessments must use defined criteria, not implicit "I think this is good" judgments.

### 2. Source Type Determines Baseline

Different source types start at different quality levels. This prevents treating all sources as equal when they inherently aren't.

**AIWG Implication**: Peer-reviewed journals start at High; blog posts start at Low. Adjustments happen from the baseline.

### 3. Transparency Over Precision

GRADE emphasizes documenting the reasoning for each judgment, even if judgments are subjective.

**AIWG Implication**: Quality assessments should include rationale, not just final score.

---

## AIWG Implementation Mapping

| GRADE Concept | AIWG Analog | Implementation |
|---------------|-------------|----------------|
| **Study type baseline** | Source type baseline | Peer-reviewed = High; Preprint = Moderate; Blog = Low; Social media = Very Low |
| **Risk of bias** | Methodology quality | Assess study design, sample size, statistical rigor |
| **Inconsistency** | Cross-source agreement | Do other sources support or contradict? |
| **Indirectness** | Relevance to AIWG | Does it directly address agentic systems, or is it tangential? |
| **Imprecision** | Specificity | Concrete findings vs. vague claims |
| **Publication bias** | Source diversity | Single source vs. multiple independent sources |
| **Large effect** | Strong evidence | Clear, unambiguous findings |
| **Replication** | Multiple confirmations | Same finding in multiple papers |
| **Confounding** | Conservative estimate | Would confounders strengthen rather than weaken the finding? |

---

## Specific AIWG Design Decisions Informed by GRADE

### 1. Source Type Baseline in Document Profile

**Decision**: Every REF-XXX document includes `AIWG Relevance` rating in Document Profile.

**GRADE Justification**: Explicit starting point enables systematic adjustment.

### 2. Quality Assessment Template

**Decision**: Create standardized quality assessment format:

```yaml
source_id: REF-XXX
quality_assessment:
  baseline_type: journal_article  # High

  downgrade_factors:
    methodology: 0       # -1 for methodological issues
    consistency: 0       # -1 if contradicted by other sources
    directness: -1       # -1 if tangential to AIWG
    precision: 0         # -1 if findings are vague
    reporting_bias: 0    # -1 if single source only

  upgrade_factors:
    strong_effect: 0     # +1 for clear, strong findings
    replication: +1      # +1 if confirmed by multiple sources
    conservative: 0      # +1 if confounders would strengthen

  final_quality: Moderate
  rationale: "Peer-reviewed journal with rigorous methodology, but research is tangential to agentic systems (indirect application requires extrapolation)"
```

### 3. Proposed AIWG Quality Levels

| Level | Source Types | Confidence |
|-------|--------------|------------|
| **High** | Peer-reviewed journal, systematic review, replicated findings | Can cite directly as evidence |
| **Moderate** | Preprint, conference paper, technical report, single peer-reviewed study | Can cite with caveats |
| **Low** | Blog post, documentation, tutorial, unreplicated claims | Use for background only |
| **Very Low** | Social media, unverified claims, promotional material | Do not cite as evidence |

### 4. Directness Assessment

**Decision**: Explicitly assess how directly a paper addresses AIWG concerns.

**GRADE Justification**: "Indirectness" factor. A paper about clinical trials might have relevant methodology insights but is indirect for agentic AI.

### 5. Quality Rating in REF-XXX Documents

**Decision**: Document Profile includes explicit relevance rating with categories:
- **Critical**: Directly shapes AIWG design
- **High**: Important supporting evidence
- **Medium**: Useful background/context
- **Low**: Tangentially relevant

**GRADE Justification**: Explicit quality levels enable prioritization.

---

## Research Framework Application

### Quality Assessment Workflow

```yaml
quality_workflow:
  step_1_baseline:
    action: determine_source_type
    output: baseline_quality_level

  step_2_downgrade:
    action: assess_downgrade_factors
    factors:
      - methodology_quality
      - cross_source_consistency
      - relevance_directness
      - finding_precision
      - source_diversity
    output: adjusted_quality

  step_3_upgrade:
    action: assess_upgrade_factors
    factors:
      - effect_strength
      - replication_status
      - conservative_estimate
    output: final_quality

  step_4_document:
    action: record_assessment
    include:
      - final_quality_level
      - factor_scores
      - rationale_text
```

### Integration with REF-XXX Documents

The AIWG Relevance field in Document Profile represents the GRADE-style assessment:

```markdown
| Attribute | Value |
|-----------|-------|
| Year | 2016 |
| Type | Research Paper |
| AIWG Relevance | **High** - Directly informs artifact management patterns |
```

The rationale explains the assessment:
- What makes it High/Medium/Low?
- Any downgrade factors?
- Any upgrade factors?

---

## Key Quotes

### On the purpose:
> "GRADE provides a framework guiding through the critical components of the assessment in a structured way. By allowing to make the judgments explicit rather than implicit it ensures transparency and a clear basis for discussion."

### On adoption:
> "Over 100 organizations worldwide have officially endorsed GRADE."

### On transparency:
> "The quality of evidence reflects the extent to which one can be confident that an estimate of effect or association is close to the quantity of specific interest."

---

## Cross-References

| Paper | Relationship |
|-------|-------------|
| **REF-056** | FAIR R1 (reusability) includes quality attributes; GRADE provides assessment |
| **REF-059** | LitLLM could use GRADE for quality scoring of retrieved papers |
| **REF-057** | Agent Laboratory needs quality assessment for human evaluation |

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-25 | Research Acquisition | Initial AIWG-specific analysis document |
