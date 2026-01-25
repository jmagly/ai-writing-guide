# REF-060 AIWG Analysis: GRADE Evidence Quality

**Source**: @docs/references/REF-060-grade-evidence-quality.md

**Paper**: GRADE Working Group (2004-2025). GRADE Handbook.

**AIWG Relevance**: HIGH - Provides systematic quality assessment framework adopted by 100+ organizations (WHO, Cochrane, NICE). Enables reproducible evidence evaluation for research sources.

---

## AIWG Concept Mapping

### GRADE → AIWG Implementation

| GRADE Concept | AIWG Implementation | Coverage |
|---------------|---------------------|----------|
| Four Quality Levels | AIWG Relevance field | **Partial** |
| Source Type Baseline | Implicit differentiation | **Weak** |
| Downgrade Factors | Not formalized | **Weak** |
| Upgrade Factors | Not formalized | **Weak** |
| Explicit Criteria | Document Profile | **Partial** |
| Rationale Documentation | Relevance notes | **Partial** |

### Gap Analysis

AIWG currently uses informal quality assessment:

| Current Approach | GRADE Approach | Gap |
|------------------|----------------|-----|
| "Critical/High/Medium/Low" | Explicit criteria per level | Need defined criteria |
| Implicit assessment | Documented rationale | Need systematic documentation |
| Single dimension | Multiple factors (8) | Need multi-factor assessment |
| No baseline by source | Type determines baseline | Need source type classification |

---

## GRADE Quality Framework

### Four Evidence Levels

| Level | Definition | AIWG Interpretation |
|-------|------------|---------------------|
| **High** | Very confident estimate is close to true effect | Cite directly as evidence |
| **Moderate** | Moderately confident; true effect likely close | Cite with minor caveats |
| **Low** | Limited confidence; true effect may differ | Background only |
| **Very Low** | Very little confidence | Do not cite as evidence |

### Starting Points by Source Type

| Source Type | Starting Quality | AIWG Examples |
|-------------|------------------|---------------|
| Peer-reviewed journal | High | Nature, Science, ACM |
| Systematic review | High | Cochrane reviews |
| Conference paper | Moderate | NeurIPS, ICLR, ICSE |
| Preprint (arXiv) | Moderate | arXiv papers |
| Technical report | Moderate | Company reports |
| Blog post | Low | Engineering blogs |
| Documentation | Low | Product docs |
| Social media | Very Low | Twitter threads |

### Rating Factors

#### Five Downgrade Factors

| Factor | Description | AIWG Application |
|--------|-------------|------------------|
| **Risk of bias** | Methodological issues | Study design quality |
| **Inconsistency** | Heterogeneous results | Cross-source agreement |
| **Indirectness** | Doesn't address question | Relevance to AIWG |
| **Imprecision** | Wide confidence intervals | Specificity of findings |
| **Publication bias** | Selective reporting | Source diversity |

#### Three Upgrade Factors

| Factor | Description | AIWG Application |
|--------|-------------|------------------|
| **Large effect** | Strong magnitude | Clear, unambiguous findings |
| **Dose-response** | Gradient present | Quantified relationships |
| **Confounding** | Would reduce effect | Conservative estimates |

---

## AIWG Quality Assessment Implementation

### Proposed Quality Assessment Schema

```yaml
# Quality assessment for REF-XXX
quality_assessment:
  ref_id: REF-056

  # Step 1: Baseline by source type
  source_type: peer_reviewed_journal
  baseline_quality: high

  # Step 2: Downgrade factors (-1 or -2 each)
  downgrade_factors:
    risk_of_bias: 0         # No methodological issues
    inconsistency: 0        # Not contradicted by other sources
    indirectness: 0         # Directly addresses data management
    imprecision: 0          # Specific, clear principles
    publication_bias: 0     # Widely cited, no selective reporting

  # Step 3: Upgrade factors (+1 each)
  upgrade_factors:
    large_effect: 0         # Principles, not effect sizes
    dose_response: 0        # Not applicable
    confounding: 0          # Not applicable
    replication: +1         # 17,000+ citations, widely adopted

  # Step 4: Calculate final quality
  quality_adjustments: +1
  final_quality: high  # high + 1 = still high (cap)

  # Step 5: Document rationale
  rationale: |
    Peer-reviewed journal with rigorous methodology.
    17,000+ citations indicates broad validation.
    Directly addresses AIWG's artifact management needs.
    Endorsed by G20, EU, NIH—institutional validation.

  # Step 6: Usage guidance
  citation_guidance: "Cite directly as authoritative evidence"
```

### Quality Levels for AIWG

| Level | Definition | Citation Guidance | Example Sources |
|-------|------------|-------------------|-----------------|
| **High** | Peer-reviewed, replicated, directly relevant | Cite as evidence | REF-056 (FAIR), REF-016 (CoT) |
| **Moderate** | Preprint or indirect but rigorous | Cite with context | REF-058 (R-LAM), arXiv papers |
| **Low** | Blog, informal, or tangentially relevant | Background only | Engineering blogs |
| **Very Low** | Unverified, promotional, or social | Do not cite | Marketing, social media |

---

## Integration with REF-XXX Documents

### Current Document Profile

```markdown
## Document Profile

| Attribute | Value |
|-----------|-------|
| Year | 2016 |
| Type | Research Paper |
| AIWG Relevance | **Critical** |
```

### Enhanced Document Profile (GRADE-Style)

```markdown
## Document Profile

| Attribute | Value |
|-----------|-------|
| Year | 2016 |
| Type | Research Paper |
| Source Type | Peer-reviewed journal |
| Baseline Quality | High |
| AIWG Relevance | **Critical** |

## Quality Assessment

| Factor | Assessment | Adjustment |
|--------|------------|------------|
| **Baseline** | Peer-reviewed journal | High |
| Risk of bias | None identified | 0 |
| Inconsistency | Consistent with other sources | 0 |
| Indirectness | Directly applicable | 0 |
| Imprecision | Specific principles | 0 |
| Publication bias | Widely cited (17,000+) | 0 |
| Replication | Endorsed by G20/EU/NIH | +1 |
| **Final Quality** | | **High** |

**Rationale**: Foundational paper in data management with institutional validation.
Directly applicable to AIWG artifact management patterns.

**Citation Guidance**: Cite directly as authoritative evidence.
```

---

## Quality Assessment Workflow

### Automated Assessment

```yaml
# Quality assessment workflow
quality_workflow:
  step_1_classify:
    action: determine_source_type
    input: source_metadata
    output: source_type, baseline_quality

  step_2_downgrade:
    action: assess_downgrade_factors
    inputs:
      - methodology_review
      - cross_source_check
      - relevance_assessment
    output: downgrade_adjustments

  step_3_upgrade:
    action: assess_upgrade_factors
    inputs:
      - citation_count
      - replication_evidence
      - institutional_endorsement
    output: upgrade_adjustments

  step_4_calculate:
    action: compute_final_quality
    formula: baseline + upgrades - downgrades
    cap: [very_low, low, moderate, high]
    output: final_quality

  step_5_document:
    action: generate_rationale
    inputs: all_assessments
    output: quality_rationale

  step_6_guide:
    action: determine_citation_guidance
    input: final_quality
    output: citation_guidance
```

### Quality Assessment Command

```bash
# Assess quality of a research source
aiwg research assess-quality REF-056

# Output:
# Quality Assessment: REF-056 (FAIR Guiding Principles)
#
# Source Type: Peer-reviewed journal (Nature Scientific Data)
# Baseline Quality: High
#
# Downgrade Factors:
#   Risk of bias:     None (0)
#   Inconsistency:    None (0)
#   Indirectness:     None (0)
#   Imprecision:      None (0)
#   Publication bias: None (0)
#
# Upgrade Factors:
#   Large effect:     N/A (0)
#   Replication:      17,000+ citations (+1)
#   Institutional:    G20/EU/NIH endorsed (+1)
#
# Final Quality: HIGH
#
# Rationale: Foundational paper with institutional validation.
# Citation Guidance: Cite directly as authoritative evidence.
```

---

## Implementation Recommendations

### Immediate (High Priority)

#### 1. Define Source Type Classification

Add to research framework:

```yaml
# Source type classification
source_types:
  peer_reviewed_journal:
    baseline: high
    examples: ["Nature", "Science", "ACM Transactions"]
    verification: "DOI from known publisher"

  systematic_review:
    baseline: high
    examples: ["Cochrane reviews", "ACM Computing Surveys"]
    verification: "Review methodology documented"

  conference_paper:
    baseline: moderate
    examples: ["NeurIPS", "ICLR", "ICSE"]
    verification: "Conference proceedings DOI"

  preprint:
    baseline: moderate
    examples: ["arXiv", "bioRxiv", "SSRN"]
    verification: "Preprint server ID"

  technical_report:
    baseline: moderate
    examples: ["Google AI Blog (technical)", "Company whitepapers"]
    verification: "Institutional publication"

  blog_post:
    baseline: low
    examples: ["Engineering blogs", "Medium technical posts"]
    verification: "Author credentials checked"

  documentation:
    baseline: low
    examples: ["Product docs", "API references"]
    verification: "Official source"

  social_media:
    baseline: very_low
    examples: ["Twitter threads", "Reddit posts"]
    verification: "Author identity verified"
```

#### 2. Add Quality Assessment to REF-XXX Template

Update template to include quality section:

```markdown
## Quality Assessment

| Factor | Assessment | Adjustment |
|--------|------------|------------|
| **Baseline** | [source_type] | [high/moderate/low/very_low] |
| Risk of bias | [assessment] | [0/-1/-2] |
| Inconsistency | [assessment] | [0/-1/-2] |
| Indirectness | [assessment] | [0/-1/-2] |
| Imprecision | [assessment] | [0/-1/-2] |
| Publication bias | [assessment] | [0/-1/-2] |
| Large effect | [assessment] | [0/+1/+2] |
| Replication | [assessment] | [0/+1] |
| **Final Quality** | | **[level]** |

**Rationale**: [explanation of assessment]

**Citation Guidance**: [how to cite this source]
```

#### 3. Quality-Aware Citation Guidelines

```markdown
## Citation by Quality Level

### High Quality Sources
- Cite directly: "According to Wilkinson et al. (2016)..."
- Use for: Core claims, architectural decisions

### Moderate Quality Sources
- Cite with context: "Preliminary research suggests..." [REF-058]
- Use for: Supporting evidence, emerging patterns

### Low Quality Sources
- Use for background only: "Some practitioners report..."
- Never use for core claims
- Always corroborate with higher-quality sources

### Very Low Quality Sources
- Do not cite as evidence
- May reference for historical context only
- Requires explicit disclaimer
```

### Short-Term (Enhancement)

#### 4. Quality Calibration Tracking

Track how quality assessments correlate with usefulness:

```yaml
# .aiwg/metrics/quality-calibration.yaml
calibration_record:
  ref_id: REF-058
  assessed_quality: moderate
  actual_usefulness: high

  note: |
    Preprint baseline was moderate, but paper proved
    highly useful for Ralph loop design. Consider
    upgrading preprints with strong empirical validation.
```

#### 5. Cross-Source Consistency Checking

```bash
# Check if sources agree
aiwg research check-consistency --topic "reproducibility"

# Output:
# Consistency Check: reproducibility
#
# Sources: REF-056, REF-058, REF-062
#
# Agreement:
#   ✓ Provenance is critical (3/3)
#   ✓ Reproducibility requires explicit tracking (3/3)
#   ✓ 8-12% overhead acceptable (2/3)
#
# Consistency Score: High
# Recommendation: Claims well-supported across sources
```

---

## Cross-References to AIWG Components

| Component | Location | GRADE Relevance |
|-----------|----------|-----------------|
| REF-XXX Template | `templates/REF-XXX-template.md` | Quality section |
| Document Profile | All REF-XXX documents | Source type field |
| INDEX.md | `docs/references/INDEX.md` | Quality filtering |
| Citation Policy | `.claude/rules/citation-policy.md` | Quality-based guidance |
| Research Acquisition | `/research-acquire` | Quality assessment step |

---

## Key Quotes for Documentation

### On Purpose:
> "GRADE provides a framework guiding through the critical components of the assessment in a structured way."

### On Transparency:
> "By allowing to make the judgments explicit rather than implicit it ensures transparency and a clear basis for discussion."

### On Adoption:
> "Over 100 organizations worldwide have officially endorsed GRADE."

---

## Professional Terminology Mapping

| Informal AIWG Term | Professional Term (GRADE) | Use In |
|-------------------|---------------------------|--------|
| "AIWG Relevance" | Evidence Quality Level | All docs |
| "Good source" | High-quality evidence | Technical docs |
| "Needs verification" | Low-quality evidence | Review notes |
| "Quality notes" | Explicit Quality Criteria | Documentation |
| "Source type" | Study Design Baseline | Methodology docs |

---

## Document Status

**Created**: 2026-01-25
**Source Paper**: REF-060
**AIWG Priority**: HIGH
**Implementation Status**: Weak - needs formal quality framework
**Key Contribution**: Systematic evidence quality assessment
**Adoption Validation**: 100+ organizations (WHO, Cochrane, NICE)
