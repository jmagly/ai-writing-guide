# Quality Assessment Report: REF-XXX

## Metadata

```yaml
---
assessment_type: source-quality
ref_id: REF-XXX
source_title: "[Paper Title]"
assessment_date: YYYY-MM-DD
assessor: quality-agent  # or manual-expert
assessor_version: 1.0.0
overall_score: 0  # 0-100
overall_grade: null  # High Quality (70-100), Moderate (50-69), Low (<50)
grade_rating: null  # GRADE: High, Moderate, Low, Very Low
fair_compliant: false  # true/false
fair_score: 0  # 0-4 (number of FAIR principles met)
assessment_status: draft  # draft | reviewed | final
---
```

## Executive Summary

**Overall Quality Score:** X / 100
**Quality Grade:** [High Quality | Moderate Quality | Low Quality]
**GRADE Rating:** [High | Moderate | Low | Very Low]
**FAIR Compliance:** [X/4 principles met]

**Recommendation:** [Approved for integration | Conditional approval | Seek alternative source]

**Summary:**
[2-3 sentence assessment: Is this source suitable for AIWG research? What are the key strengths/limitations?]

---

## Multi-Dimensional Quality Assessment

### 1. Authority Evaluation (Weight: 30%)

**Score:** X / 100

#### Author Credentials
| Criterion | Assessment | Evidence | Points |
|-----------|------------|----------|--------|
| Academic Affiliation | [Yes/No/Unknown] | [Institution name or "None"] | X/25 |
| Subject Expertise | [Expert/Intermediate/Novice] | [Publication history, h-index] | X/25 |
| Publication History | [Extensive/>10 papers/Few/<5/None] | [Google Scholar profile] | X/25 |
| Industry Recognition | [Award/Conference speaker/Standard/None] | [Specific awards or roles] | X/25 |

**Author Score:** X / 100

#### Publisher Reputation
| Criterion | Assessment | Evidence | Points |
|-----------|------------|----------|--------|
| Venue Tier | [A*/A/B/C/Blog/Unknown] | [CORE ranking or equivalent] | X/30 |
| Peer Review Status | [Peer-reviewed/Preprint/Blog/None] | [Publication type] | X/30 |
| Publisher Prestige | [Top-tier/Reputable/Standard/Unknown] | [Journal impact factor, conference acceptance rate] | X/25 |
| Citation Count | [>1000/100-1000/10-100/<10] | [Semantic Scholar, Google Scholar] | X/15 |

**Publisher Score:** X / 100

**Authority Overall:** (Author Score × 0.5) + (Publisher Score × 0.5) = **X / 100**

**Rationale:**
[Why this authority score? What are the key factors?]

---

### 2. Currency Evaluation (Weight: 20%)

**Score:** X / 100

#### Timeliness
| Criterion | Assessment | Evidence | Points |
|-----------|------------|----------|--------|
| Publication Date | [<1 year/1-2 years/3-5 years/>5 years] | YYYY | X/40 |
| Topic Currency | [Active research/Established/Declining] | [Publication trend analysis] | X/30 |
| Access Date | [Recent/<6 months/6-12 months/>1 year] | YYYY-MM-DD | X/15 |
| Updates Available | [Yes/No/N/A] | [Revised version, errata] | X/15 |

**Currency Overall:** X / 100

**Rationale:**
[Is this source still current for the topic? Has research moved on?]

**Field Context:**
- **Fast-Moving Field** (LLMs, AI): <2 years = current, >3 years = dated
- **Established Field** (SDLC): <5 years = current, >10 years = dated

---

### 3. Accuracy Evaluation (Weight: 25%)

**Score:** X / 100

#### Methodological Rigor
| Criterion | Assessment | Evidence | Points |
|-----------|------------|----------|--------|
| Peer Review | [Yes/Preprint/None] | [Journal/conference peer review] | X/30 |
| Methodology Documented | [Comprehensive/Adequate/Minimal/None] | [Methods section quality] | X/25 |
| Data Sources Cited | [All cited/Most cited/Some/None] | [Reference quality] | X/20 |
| Reproducibility | [Fully reproducible/Partially/Not reproducible] | [Code/data availability] | X/15 |
| Conflicts of Interest | [Disclosed/None/Undisclosed] | [COI statement] | X/10 |

**Accuracy Overall:** X / 100

**Rationale:**
[How rigorous is the research? Can results be trusted?]

**Red Flags (if any):**
- [ ] No methodology described
- [ ] Data sources unclear
- [ ] Conflicts of interest not disclosed
- [ ] Extraordinary claims without extraordinary evidence

---

### 4. Coverage Evaluation (Weight: 15%)

**Score:** X / 100

#### Comprehensiveness
| Criterion | Assessment | Evidence | Points |
|-----------|------------|----------|--------|
| Topic Depth | [Comprehensive/Adequate/Superficial] | [Analysis detail level] | X/35 |
| Breadth of Analysis | [Multi-faceted/Focused/Narrow] | [Perspectives covered] | X/30 |
| Completeness | [Thorough/Adequate/Incomplete] | [Key aspects addressed] | X/25 |
| Related Work Coverage | [Extensive/Adequate/Minimal/None] | [Literature review quality] | X/10 |

**Coverage Overall:** X / 100

**Rationale:**
[Does this source provide sufficient depth and breadth?]

---

### 5. Objectivity Evaluation (Weight: 10%)

**Score:** X / 100

#### Bias Assessment
| Criterion | Assessment | Evidence | Points |
|-----------|------------|----------|--------|
| Bias Detection | [Minimal/Moderate/Significant] | [Subjective language, cherry-picking] | X/40 |
| Balanced Perspective | [Yes/Mostly/No] | [Multiple viewpoints presented] | X/30 |
| Conflicts of Interest | [None/Disclosed/Undisclosed] | [Financial, affiliation] | X/20 |
| Objectivity Language | [Neutral/Mostly neutral/Subjective] | [Tone analysis] | X/10 |

**Objectivity Overall:** X / 100

**Rationale:**
[Are there bias concerns? Is the perspective balanced?]

**Potential Biases:**
- [ ] Corporate affiliation (vendor bias)
- [ ] Financial conflict of interest
- [ ] Confirmation bias (cherry-picked evidence)
- [ ] Publication bias (only positive results)

---

## Overall Quality Score Calculation

| Dimension | Weight | Score | Weighted Score |
|-----------|--------|-------|----------------|
| **Authority** | 30% | X/100 | X.X |
| **Currency** | 20% | X/100 | X.X |
| **Accuracy** | 25% | X/100 | X.X |
| **Coverage** | 15% | X/100 | X.X |
| **Objectivity** | 10% | X/100 | X.X |

**Overall Quality Score:** X / 100

**Quality Grade:**
- **High Quality (70-100):** Approved for integration, suitable for critical decisions
- **Moderate Quality (50-69):** Conditional approval, verify with additional sources
- **Low Quality (<50):** Not recommended, seek higher-quality alternatives

---

## GRADE Assessment (Evidence Quality)

### GRADE Dimensions

#### 1. Risk of Bias (Study Design Quality)
**Score:** X / 25 points

| Study Design | Starting GRADE | Score |
|--------------|----------------|-------|
| Randomized Controlled Trial (RCT) | High | 25 |
| Well-designed observational study | Moderate | 20 |
| Observational study | Low | 15 |
| Case study / Expert opinion | Very Low | 5 |

**This Source:** [Study design type] → **X points**

**Bias Assessment:**
- Selection bias: [Low/Moderate/High]
- Performance bias: [Low/Moderate/High]
- Detection bias: [Low/Moderate/High]

**Adjustment:** [No downgrade | Downgrade by X points due to Y bias]

---

#### 2. Consistency (Agreement with Other Studies)
**Score:** X / 20 points

| Consistency Level | Assessment | Score |
|-------------------|------------|-------|
| Aligns with other studies | No issues | 20 |
| Mostly consistent | Minor inconsistencies | 15 |
| Contradicts some studies | Conflicting evidence | 10 |
| Unknown (first study) | Cannot assess | 10 |

**This Source:** [Assessment] → **X points**

**Evidence:**
[Compare findings to REF-YYY, REF-ZZZ - do they agree or contradict?]

---

#### 3. Directness (Relevance to Question)
**Score:** X / 20 points

| Directness Level | Assessment | Score |
|------------------|------------|-------|
| Directly addresses question | Direct | 20 |
| Addresses similar question | Mostly direct | 15 |
| Indirectly relevant | Indirect | 10 |
| Tangential relevance | Very indirect | 5 |

**This Source:** [Assessment] → **X points**

**Rationale:**
[How directly does this address AIWG research question?]

---

#### 4. Precision (Statistical Power)
**Score:** X / 20 points

| Precision Level | Assessment | Score |
|-----------------|------------|-------|
| Large sample, narrow CI | High precision | 20 |
| Adequate sample | Moderate precision | 15 |
| Small sample, wide CI | Low precision | 10 |
| Single case study | Very low precision | 5 |

**This Source:**
- **Sample Size:** n=X
- **Confidence Interval:** [95% CI: X-Y] or [Not reported]
- **Statistical Power:** [Adequate/Inadequate]

**Score:** X points

---

#### 5. Publication Bias (Selective Reporting)
**Score:** X / 15 points

| Venue Tier | Assessment | Score |
|------------|------------|-------|
| A* venue (top-tier) | Minimal bias | 15 |
| A venue (reputable) | Low bias | 12 |
| B venue (standard) | Moderate bias | 8 |
| C venue or preprint | Higher bias | 5 |
| Blog/unreviewed | Significant bias | 3 |

**This Source:** [Venue tier] → **X points**

**Publication Bias Assessment:**
- [ ] Negative results reported (reduces bias)
- [ ] Industry-funded (may increase bias)
- [ ] Preprint (not peer-reviewed)

---

### GRADE Overall Score

**Total GRADE Score:** X / 100 points

**GRADE Rating:**
- **High (80-100):** Strong confidence in evidence, suitable for critical decisions
- **Moderate (60-79):** Moderate confidence, likely suitable but verify
- **Low (40-59):** Limited confidence, use with caution
- **Very Low (<40):** Very limited confidence, seek better sources

**Confidence Statement:**
[We have {High/Moderate/Low/Very Low} confidence that this evidence is reliable for informing AIWG development decisions.]

---

## FAIR Principles Validation

### 1. Findable
**Status:** [✅ Met | ❌ Not Met]

**Checklist:**
- [ ] **Persistent Identifier:** DOI, ArXiv ID, ISBN, or Handle
  - **Evidence:** [DOI or identifier]
- [ ] **Metadata Complete:** Title, authors, year, abstract documented
  - **Evidence:** [Metadata file exists]
- [ ] **Registered in Index:** Searchable in research corpus
  - **Evidence:** [REF-XXX indexed]

**Score:** X / 3 criteria met

**Rationale:**
[Why met or not met?]

---

### 2. Accessible
**Status:** [✅ Met | ❌ Not Met]

**Checklist:**
- [ ] **Retrieval Protocol:** URL or API documented
  - **Evidence:** [URL or access method]
- [ ] **Access Conditions Clear:** Open access, subscription, or manual upload
  - **Evidence:** [License type]
- [ ] **Long-Term Storage:** Archival plan or stable repository
  - **Evidence:** [Publisher commitment, local backup]

**Score:** X / 3 criteria met

**Rationale:**
[Why met or not met?]

---

### 3. Interoperable
**Status:** [✅ Met | ❌ Not Met]

**Checklist:**
- [ ] **Standard Format:** PDF/A, BibTeX, or machine-readable format
  - **Evidence:** [File format]
- [ ] **Controlled Vocabulary:** Tags use standard ontology
  - **Evidence:** [Tag schema]
- [ ] **Linked Data:** Cross-references to related sources
  - **Evidence:** [Links to REF-YYY, REF-ZZZ]

**Score:** X / 3 criteria met

**Rationale:**
[Why met or not met?]

---

### 4. Reusable
**Status:** [✅ Met | ❌ Not Met]

**Checklist:**
- [ ] **Clear License:** CC-BY, MIT, proprietary explicitly stated
  - **Evidence:** [License info]
- [ ] **Provenance Documented:** Acquisition and documentation history
  - **Evidence:** [Provenance log exists]
- [ ] **Usage Context:** How to use this source documented
  - **Evidence:** [README or usage notes]

**Score:** X / 3 criteria met

**Rationale:**
[Why met or not met?]

---

### FAIR Overall Compliance

**FAIR Score:** X / 4 principles met

**Compliance Level:**
- **Fully Compliant (4/4):** Archival-ready, suitable for long-term preservation
- **Partially Compliant (2-3/4):** Acceptable with documentation of limitations
- **Non-Compliant (0-1/4):** Remediate or exclude from archival packages

**Remediation Recommendations (if <4/4):**
1. [Action to improve Findable]
2. [Action to improve Accessible]
3. [Action to improve Interoperable]
4. [Action to improve Reusable]

---

## Strengths and Limitations

### Strengths
1. **[Strength 1]:** [Explanation]
2. **[Strength 2]:** [Explanation]
3. **[Strength 3]:** [Explanation]

### Limitations
1. **[Limitation 1]:** [Explanation and impact]
2. **[Limitation 2]:** [Explanation and impact]
3. **[Limitation 3]:** [Explanation and impact]

### Critical Issues (if any)
- [ ] **Issue 1:** [Description and why it's critical]
- [ ] **Issue 2:** [Description and why it's critical]

---

## Recommendations

### Usage Recommendation
**Approved for Integration:** [Yes | Conditional | No]

**Conditions (if conditional):**
1. [Condition 1 that must be met]
2. [Condition 2 that must be met]

**Rationale:**
[Why is this source suitable or unsuitable for AIWG research corpus?]

### Citation Confidence
**Confidence Level:** [High | Moderate | Low]

**Guidance:**
- **High Confidence:** Use for critical architectural decisions, cite prominently
- **Moderate Confidence:** Use for supporting evidence, cite with context
- **Low Confidence:** Reference for awareness only, do not rely on for decisions

### Alternative Sources (if Low Quality)
[If quality score <50, recommend better alternatives]
1. **Alternative 1:** [REF-YYY or search query]
2. **Alternative 2:** [REF-ZZZ or search query]

---

## Validation Rules

### Required Fields
- `ref_id`: Valid REF-XXX identifier
- `assessment_date`: ISO 8601 date
- `overall_score`: Integer 0-100
- `grade_rating`: Valid GRADE rating
- `fair_score`: Integer 0-4

### Score Consistency
- Overall score must equal weighted average of dimension scores
- GRADE score must follow dimension scoring rules
- FAIR score must match number of principles met

---

## Agent Responsibilities

**Produced by:** Quality Agent (UC-RF-006)
**Updated by:** Quality Agent (periodic reassessment), Manual Expert (validation)
**Used by:** Citation Agent (confidence levels), Gap Analysis Agent (corpus quality), User (source selection)

---

## References

- @.aiwg/research/sources/metadata/REF-XXX-metadata.json - Source metadata
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-006-assess-source-quality.md - Quality assessment use case
- [GRADE Framework](https://www.gradeworkinggroup.org/) - Evidence grading standard
- [FAIR Principles](https://www.go-fair.org/fair-principles/) - Data quality standard

---

**Template Version:** 1.0.0
**Last Updated:** 2026-01-25
**Owner:** Quality Agent
