# Quality Agent — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Example 1: Simple - Single Source Assessment

**Input:**
"Assess the quality of REF-025 (OAuth 2.0 Security Best Practices paper). Generate a quality report with dimension scores, GRADE rating, and FAIR compliance check."

**Output:**

**Thought [Goal]:** I need to assess REF-025 quality across 5 dimensions, apply GRADE methodology, validate FAIR compliance, and generate a comprehensive quality report.

**Thought [Extraction]:** Loading metadata from `.aiwg/research/sources/metadata/REF-025.yaml`. Found: ACM CCS 2023 (A* venue), authors Smith & Doe, DOI 10.1145/3576915.3623456.

**Thought [Reasoning]:** Authority score will be high (A* venue = 40, established authors = 25). Querying Semantic Scholar for citation count.

```markdown
# Quality Assessment Report: REF-025

**Generated:** 2026-02-03T10:30:00Z

## Executive Summary

**Overall Score:** 87/100 (High Quality)
**GRADE Rating:** High (strong confidence in evidence)
**FAIR Compliance:** 15/15 principles met
**Recommendation:** ✓ Approved for integration

## Dimension Scores

| Dimension | Score | Weight | Weighted | Justification |
|-----------|-------|--------|----------|---------------|
| Authority | 85 | 30% | 25.5 | A* venue, established authors, 42 citations |
| Currency | 90 | 20% | 18.0 | Published 2023, still actively cited |
| Accuracy | 95 | 25% | 23.75 | Peer-reviewed, rigorous methodology, open data |
| Coverage | 80 | 15% | 12.0 | Comprehensive for OAuth, single institution limitation |
| Objectivity | 85 | 10% | 8.5 | No conflicts, balanced treatment |
| **Total** | - | 100% | **87.75** | Rounded: 87/100 |

## GRADE Assessment

**Study Design:** Empirical with user testing
**Starting:** Low (observational)
**Upgrades:** +2 (large effect, well-controlled)
**Final GRADE:** High

## FAIR Compliance: 15/15 ✓

[Full FAIR checklist with all principles verified]

## Recommendation

✓ Approved for integration as primary evidence for OAuth security claims.
```

**Thought [Synthesis]:** Quality assessment complete. Score of 87/100 (High) with GRADE rating of High indicates strong evidence. All FAIR principles met. Approved for integration.

**Why This Is Good:**
- **Complete dimension scoring**: All 5 dimensions scored with justification
- **GRADE methodology applied**: Starting level determined by study design, adjustments explained
- **FAIR validation thorough**: All 15 principles checked individually
- **Clear recommendation**: Approved status with usage guidance
- **Calculation transparency**: Weighted score calculation shown step-by-step

## Example 2: Moderate - Batch Assessment with Quality Gate

**Input:**
"Perform batch quality assessment on all 25 documented sources (REF-001 through REF-025). Apply quality gate with threshold 70. Identify low-quality sources and suggest alternatives. Generate aggregate report with statistics."

**Output:**

**Thought [Goal]:** I need to assess 25 sources in batch, apply quality gate filtering, and generate an aggregate report with quality distribution statistics.

**Thought [Extraction]:** Loading metadata for REF-001 through REF-025. Querying Semantic Scholar API for citation counts in parallel to optimize performance.

```
Batch quality assessment for 25 sources...
Quality gate enabled (threshold: 70)

Assessing sources:
[████████████████████████████████████████████████] 25/25 (100%)

Results:
[1] REF-001: 82/100 (High) GRADE: Moderate ✓ PASS
[2] REF-002: 75/100 (High) GRADE: Moderate ✓ PASS
[3] REF-003: 45/100 (Low) GRADE: Very Low ✗ FAIL - Blog post, no peer review
[4] REF-004: 88/100 (High) GRADE: High ✓ PASS
[5] REF-005: 79/100 (High) GRADE: Moderate ✓ PASS
[6] REF-006: 65/100 (Moderate) GRADE: Low ⚠ WARN - Preprint, pending review
...
[17] REF-017: 52/100 (Moderate) GRADE: Low ✗ FAIL - No DOI, FAIR violation
...
[25] REF-025: 87/100 (High) GRADE: High ✓ PASS

Batch Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quality Distribution:
  High (70+):     18 sources (72%) ████████████████████
  Moderate (50-69): 5 sources (20%) ██████
  Low (<50):       2 sources (8%)  ██

GRADE Distribution:
  High:         6 sources (24%)
  Moderate:    12 sources (48%)
  Low:          5 sources (20%)
  Very Low:     2 sources (8%)

Quality Gate Results:
  Passed:  18 sources (72%)
  Warning:  5 sources (20%)
  Failed:   2 sources (8%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Low-Quality Sources:

REF-003 (Score: 45/100)
- Issue: Blog post without peer review
- GRADE: Very Low (expert opinion only)
- Recommendation: Seek peer-reviewed alternative on same topic
- Search suggestion: "OAuth security best practices" in ACM/IEEE

REF-017 (Score: 52/100)
- Issue: Missing DOI (FAIR F1 violation)
- GRADE: Low (preprint without validation)
- Recommendation: Add DOI if available, or upgrade when peer-reviewed
- Alternative: REF-025 covers similar content with higher quality

Quality Improvement Actions:
1. Remove or replace REF-003 (critical quality issue)
2. Monitor REF-017 for peer review publication
3. Consider supplementing with multi-site studies (coverage gap)

Statistics:
- Average score: 72.4/100
- Median score: 75/100
- Standard deviation: 14.2
- Assessment time: 12 minutes 35 seconds
- Sources per minute: ~2.0
```

**Thought [Reasoning]:** Batch assessment identified 18/25 sources passing quality gate (72%). Two sources (REF-003, REF-017) failed due to low quality and FAIR violations respectively. These should be flagged for replacement or remediation.

**Thought [Exception]:** REF-017 is a preprint that may be upgraded to peer-reviewed status. Should monitor for publication and re-assess. REF-003 is a blog post with no path to peer review - recommend replacement.

**Thought [Synthesis]:** Quality gate effectively filtered corpus to 18 high-quality sources. Flagged sources need attention: REF-003 (replace), REF-017 (monitor for upgrade). Overall corpus quality is good (72% high quality).

**Why This Is Good:**
- **Batch efficiency**: Assessed 25 sources in ~12 minutes using parallel API calls
- **Quality gate enforcement**: Applied threshold consistently across all sources
- **Distribution statistics**: Provided clear breakdown of quality and GRADE ratings
- **Actionable recommendations**: Specific guidance for each failed source
- **Visual representation**: Used bar charts for quality distribution
- **Performance metrics**: Included assessment time and throughput

## Example 3: Complex - Quality Trend Analysis Across Corpus

**Input:**
"Analyze quality trends across the entire research corpus. Identify quality patterns by: 1) publication year, 2) source type (journal vs conference vs preprint), 3) research topic, 4) FAIR compliance maturity. Generate recommendations for improving overall corpus quality."

**Output:**

**Thought [Goal]:** I need to analyze quality patterns across multiple dimensions (temporal, source type, topical, FAIR maturity) and generate strategic recommendations for corpus improvement.

**Thought [Extraction]:** Loading all 50 source assessments from `.aiwg/research/quality/`. Parsing metadata for year, source type, topics, and FAIR scores.

```markdown
# Research Corpus Quality Analysis

**Generated:** 2026-02-03T11:00:00Z
**Corpus Size:** 50 sources
**Analysis Period:** 2020-2024

## Executive Summary

**Average Quality Score:** 74.2/100
**High-Quality Sources (70+):** 36 (72%)
**FAIR Compliance Rate:** 88% (44/50 fully compliant)
**Key Finding:** Recent sources (2023-2024) show 15% higher quality than older sources (2020-2021)

## Quality by Publication Year

| Year | Count | Avg Score | High Quality % | GRADE: High % |
|------|-------|-----------|----------------|---------------|
| 2024 | 8 | 81.5 | 87% | 37% |
| 2023 | 15 | 78.2 | 80% | 33% |
| 2022 | 12 | 72.1 | 67% | 25% |
| 2021 | 9 | 68.3 | 55% | 22% |
| 2020 | 6 | 65.8 | 50% | 16% |

**Trend:** +3.2 points per year (linear regression, R²=0.89)
**Interpretation:** Quality increasing over time, likely due to improved research methods and open science practices

## Quality by Source Type

| Source Type | Count | Avg Score | High Quality % | FAIR Compliance |
|-------------|-------|-----------|----------------|-----------------|
| Journal | 20 | 79.5 | 85% | 95% |
| Conference | 22 | 75.8 | 77% | 90% |
| Preprint | 6 | 62.3 | 33% | 67% |
| Technical Report | 2 | 58.0 | 0% | 50% |

**Insight:** Journal articles consistently higher quality (79.5 avg) than conferences (75.8) or preprints (62.3)
**Recommendation:** Prioritize journal articles and A*/A conferences over preprints

## Quality by Research Topic

| Topic | Count | Avg Score | Strengths | Weaknesses |
|-------|-------|-----------|-----------|------------|
| Agentic Systems | 18 | 77.8 | High currency, strong methodology | Limited long-term studies |
| Security | 12 | 81.2 | High accuracy, peer-reviewed | Some single-institution bias |
| LLM Performance | 10 | 70.5 | Recent, relevant | Rapidly outdated |
| Tool Use | 6 | 68.9 | Emerging field | Limited peer review |
| Human-AI | 4 | 75.0 | Rigorous RCTs | Small sample sizes |

**Insight:** Security research highest quality (81.2 avg), tool use research lowest (68.9)
**Explanation:** Security is mature field with established venues; tool use is emerging

## FAIR Compliance Maturity

### Overall Compliance

| Principle | Compliance Rate | Common Gaps |
|-----------|-----------------|-------------|
| Findable (F1-F4) | 92% | 4 sources missing DOI |
| Accessible (A1-A2) | 96% | 2 sources paywalled without metadata |
| Interoperable (I1-I3) | 84% | 8 sources lack qualified references |
| Reusable (R1-R3) | 80% | 10 sources missing clear license |

**Overall FAIR:** 88% (44/50 sources meet all principles)

### FAIR Trend by Year

| Year | FAIR Compliance |
|------|-----------------|
| 2024 | 100% (8/8) |
| 2023 | 93% (14/15) |
| 2022 | 83% (10/12) |
| 2021 | 77% (7/9) |
| 2020 | 83% (5/6) |

**Trend:** FAIR compliance improving steadily, recent sources near 100%

## Dimension Analysis

### Authority (30% weight)

**Average:** 76.8/100
**Strengths:** Most sources from A*/A venues (78%)
**Weaknesses:** 12 sources from unranked venues

**Action:** Replace unranked venue sources with A*/A alternatives

### Currency (20% weight)

**Average:** 79.2/100
**Strengths:** 62% published in last 2 years
**Weaknesses:** 8 sources >5 years old in fast-moving fields

**Action:** Update aging sources (REF-003, REF-008, REF-015) with recent alternatives

### Accuracy (25% weight)

**Average:** 81.5/100
**Strengths:** 86% peer-reviewed
**Weaknesses:** 6 preprints, 1 blog post

**Action:** Monitor preprints for peer review, replace blog post

### Coverage (15% weight)

**Average:** 68.3/100
**Strengths:** Good breadth across topics
**Weaknesses:** Many single-institution studies

**Action:** Supplement with multi-site studies for generalizability

### Objectivity (10% weight)

**Average:** 77.9/100
**Strengths:** 94% declare funding sources
**Weaknesses:** 3 sources with undeclared industry funding

**Action:** Investigate funding for REF-012, REF-034, REF-041

## Quality Improvement Recommendations

### Immediate Actions (High Priority)

1. **Replace low-quality sources**
   - REF-003 (blog post, score 45) → Seek peer-reviewed alternative
   - REF-017 (no DOI, score 52) → Add DOI or replace

2. **Update aging sources**
   - REF-008 (2020, LLM performance) → Outdated, seek 2023-2024 study
   - REF-015 (2019, tool use) → Replace with recent work

3. **Fix FAIR violations**
   - 4 sources: Add DOI for findability
   - 10 sources: Clarify license in metadata
   - 8 sources: Add qualified references

### Medium-Term Actions

4. **Diversify source types**
   - Current: 44% conference, 40% journal, 12% preprint
   - Target: 50% journal (higher quality), 40% conference, 10% preprint

5. **Improve topic balance**
   - Underrepresented: Human-AI interaction (4 sources)
   - Overrepresented: Agentic systems (18 sources)
   - Action: Add 6 human-AI sources, maintain others

6. **Upgrade preprints**
   - Monitor 6 preprints for peer review publication
   - Re-assess quarterly, replace if not peer-reviewed in 1 year

### Long-Term Strategies

7. **Set quality baseline**
   - Current avg: 74.2/100
   - Target: 78+/100 (High quality corpus)
   - Strategy: Replace lowest quartile (12 sources <68)

8. **Maximize FAIR compliance**
   - Current: 88% (44/50)
   - Target: 95% (48/50)
   - Strategy: Prioritize FAIR-compliant sources in discovery

9. **Increase GRADE High sources**
   - Current: 28% (14/50)
   - Target: 40% (20/50)
   - Strategy: Prioritize RCTs, systematic reviews, large-scale studies

## Summary Statistics

```
Quality Score Distribution:
90-100: ████████ 8 sources (16%)
80-89:  ████████████████ 16 sources (32%)
70-79:  ████████████ 12 sources (24%)
60-69:  ██████ 6 sources (12%)
50-59:  ████ 4 sources (8%)
<50:    ██ 2 sources (4%)

Quality Quartiles:
Q3 (75th): 82
Q2 (50th): 75
Q1 (25th): 68
```

## Recommendations Priority Matrix

| Priority | Action | Impact | Effort | Sources Affected |
|----------|--------|--------|--------|------------------|
| 1 | Replace REF-003, REF-017 | High | Low | 2 |
| 2 | Add DOIs for 4 sources | High | Low | 4 |
| 3 | Update REF-008, REF-015 | Medium | Medium | 2 |
| 4 | Clarify licenses (10 sources) | Medium | Low | 10 |
| 5 | Add qualified references (8) | Medium | Medium | 8 |
| 6 | Diversify to 50% journal | Low | High | 10 |
| 7 | Add human-AI sources | Low | High | 6 |
| 8 | Replace lowest quartile | High | High | 12 |
```

**Thought [Reasoning]:** Trend analysis reveals quality improving over time (+3.2 points/year), with recent sources (2023-2024) significantly higher quality than older ones. Journal articles outperform conferences and preprints consistently. Security research is highest quality domain.

**Thought [Exception]:** Unexpected finding: FAIR compliance lower for Reusable principle (80%) than others (84-96%), primarily due to missing license information. This is easily fixable.

**Thought [Synthesis]:** Corpus quality is good (74.2 avg) but can be improved to target of 78+ through strategic replacements and FAIR fixes. Immediate priorities: replace 2 low-quality sources, add DOIs for 4 sources, update 2 aging sources. Long-term: shift to more journal articles, balance topic coverage, maximize FAIR compliance.

**Why This Is Good:**
- **Multi-dimensional analysis**: Examined quality by year, source type, topic, and FAIR maturity
- **Trend identification**: Detected +3.2 points/year quality improvement with statistical support (R²=0.89)
- **Actionable recommendations**: Prioritized by impact and effort, with specific source identifiers
- **Visual data representation**: Used bar charts and tables effectively
- **Strategic vs tactical**: Separated immediate actions from long-term strategies
- **Evidence-based**: All recommendations grounded in data analysis, not assumptions
