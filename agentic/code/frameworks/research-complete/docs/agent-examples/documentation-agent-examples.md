# Documentation Agent — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Deliverable Samples

### Summary Markdown

Location: `.aiwg/research/knowledge/summaries/{REF-XXX}-summary.md`

```markdown
---
ref_id: REF-025
title: "OAuth 2.0 Security Best Practices"
authors: ["Smith, J.", "Doe, J."]
year: 2023
summarized_date: 2026-01-25
llm_model: claude-opus-4
summary_type: full
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

# Summary: OAuth 2.0 Security Best Practices

## 1-Sentence Summary
This paper demonstrates that OAuth 2.0 token rotation reduces CSRF attacks by 80% with minimal UX impact.

## 1-Paragraph Summary
The paper presents an empirical evaluation of OAuth 2.0 security best practices, focusing on token rotation and PKCE (Proof Key for Code Exchange). Through a controlled experiment with 10,000 users, the authors demonstrate that implementing token rotation reduces CSRF attack success rates from 12% to 2.4% (80% reduction, p<0.001) while maintaining usability (SUS score 76 vs 78 baseline). The study includes formal verification of the rotation protocol and provides implementation guidelines for production systems.

## Full Summary (1-Page)

### Context
OAuth 2.0 is widely deployed for API authorization but suffers from security vulnerabilities, particularly CSRF attacks via stolen authorization codes and refresh tokens.

### Research Question
Can token rotation and PKCE eliminate common OAuth 2.0 vulnerabilities without degrading user experience?

### Methods
- Controlled experiment with 10,000 users in production deployment
- Security analysis using formal verification (TLA+ model checking)
- User study measuring UX impact via SUS questionnaire
- Dataset: 10,000 anonymized user sessions over 30 days

### Key Findings
1. Token rotation reduces CSRF risk by 80% (p<0.001, 95% CI: [75%, 85%])
2. PKCE prevents authorization code interception in 100% of simulated attacks
3. No significant UX degradation (SUS 76 vs 78, p=0.12)
4. Refresh token rotation adds <50ms latency (p95)

### Limitations
- Single deployment environment (may not generalize)
- 30-day study period (long-term effects unknown)
- Anonymized data prevents detailed user behavior analysis

### Implications
Token rotation should be standard practice for OAuth 2.0 implementations. PKCE is essential for public clients (mobile, SPAs). Minimal implementation cost with substantial security benefit.
```

### Structured Extraction JSON

Location: `.aiwg/research/knowledge/extractions/{REF-XXX}-extraction.json`

```json
{
  "ref_id": "REF-025",
  "extraction_timestamp": "2026-01-25T16:00:00Z",
  "llm_model": "claude-opus-4",
  "claims": [
    "Token rotation reduces CSRF risk by 80% compared to static tokens",
    "OAuth 2.0 with PKCE prevents authorization code interception",
    "Refresh token rotation improves security without UX degradation",
    "Formal verification proves rotation protocol prevents replay attacks"
  ],
  "methods": [
    "Controlled experiment with 10,000 users in production",
    "Security analysis using TLA+ formal verification",
    "User study measuring UX impact via SUS questionnaire",
    "Simulated attack scenarios for PKCE and token rotation"
  ],
  "datasets": [
    {
      "name": "OAuth Security Dataset",
      "size": "10,000 user sessions over 30 days",
      "source": "Production deployment (anonymized)",
      "availability": "Not publicly available (privacy constraints)"
    }
  ],
  "metrics": [
    {"name": "CSRF attack success rate (baseline)", "value": "12%"},
    {"name": "CSRF attack success rate (rotation)", "value": "2.4%"},
    {"name": "Reduction percentage", "value": "80%", "statistic": "p < 0.001"},
    {"name": "SUS usability score (baseline)", "value": "78"},
    {"name": "SUS usability score (rotation)", "value": "76"},
    {"name": "Latency overhead (p95)", "value": "< 50ms"}
  ],
  "findings": [
    {
      "claim": "Token rotation reduces CSRF risk by 80%",
      "statistic": "p < 0.001",
      "confidence_interval": "95% CI: [75%, 85%]",
      "effect_size": "large"
    },
    {
      "claim": "No significant UX degradation from rotation",
      "statistic": "p = 0.12",
      "confidence_interval": "95% CI: [-1, 5] SUS points",
      "effect_size": "negligible"
    }
  ],
  "related_work": [
    "10.1145/3133956.3133980",
    "10.1145/3243734.3243820",
    "arXiv:2108.12345"
  ]
}
```

### Literature Note

Location: `.aiwg/research/knowledge/notes/{REF-XXX}-literature-note.md`

```markdown
# Literature Note: OAuth Token Rotation Security

**Source:** @REF-025 - Smith & Doe (2023)
**Date:** 2026-01-25
**Tags:** #oauth #security #csrf #tokens #authentication

## Main Idea
Token rotation as a defense mechanism against CSRF attacks in OAuth 2.0 provides an 80% risk reduction with negligible UX impact.

## Key Points

### Security Impact
- Static refresh tokens vulnerable to CSRF attacks (12% success rate)
- Rotating refresh tokens reduce attack success to 2.4%
- Effect size: 80% risk reduction (p < 0.001)

### Implementation
- Token rotation adds <50ms latency at p95
- Compatible with existing OAuth 2.0 flows
- Requires server-side state management (minimal)

### User Experience
- SUS score: 76 (rotation) vs 78 (baseline)
- Difference not statistically significant (p = 0.12)
- Users did not notice the change in 95% of cases

## Methodology Notes
- **Strengths**: Production deployment (n=10,000), formal verification
- **Limitations**: Single environment, 30-day window, anonymized data
- **Quality**: GRADE High (90/100) - well-designed controlled experiment

## Related Notes
- See @.aiwg/research/knowledge/notes/permanent-oauth-security-principles.md
- Links to: [[PKCE Extension]], [[CSRF Attacks]], [[Token Management]]

## Questions for Further Research
1. Does rotation effectiveness vary by application type (web vs mobile)?
2. What is the optimal rotation interval for different threat models?
3. How does rotation interact with other security measures (rate limiting, MFA)?

## Citation
\`\`\`bibtex
@inproceedings{smith2023oauth,
  title={OAuth 2.0 Security Best Practices},
  author={Smith, John and Doe, Jane},
  booktitle={ACM CCS},
  year={2023},
  doi={10.1145/3576915.3623456}
}
\`\`\`
```

## Example 1: Simple - Basic Paper Summarization

**Input:**
"Summarize paper REF-025 (OAuth 2.0 Security Best Practices)."

**Thought (Goal):**
I need to extract text from REF-025 PDF, generate a grounded summary, extract structured data, calculate GRADE score, and create a literature note.

**Action:**
Extract text from `.aiwg/research/sources/pdfs/REF-025-oauth-2-security-best-practices.pdf` using pdftotext.

**Observation:**
Extracted 8,500 words across 12 pages. Text quality is good (no OCR needed). Paper structure: Abstract, Introduction, Background, Methods, Results, Discussion, Conclusion.

**Thought (Extraction):**
Key information from paper:
- Research question: Can token rotation reduce OAuth CSRF attacks?
- Method: Controlled experiment, n=10,000, 30 days
- Main finding: 80% CSRF reduction (12% → 2.4%, p<0.001)
- Secondary finding: No UX impact (SUS 76 vs 78, p=0.12)
- Limitation: Single deployment environment

**Action:**
Generate summary using LLM with full paper text as context. Prompt: "Summarize this paper in one sentence, one paragraph, and one page. Ground all claims in the provided text."

**Observation:**
LLM generated summaries at all three levels. Checking for hallucinations by validating claims against source text.

**Thought (Exception):**
Validating claims:
- "80% reduction": Found in Results section (Table 2)
- "p<0.001": Found in statistical analysis
- "SUS 76 vs 78": Found in UX evaluation section
- "10,000 users": Found in Methods section
All claims validated. No hallucinations detected.

**Thought (Reasoning):**
GRADE assessment:
- Risk of bias: Low (randomized, large n) → 20/20
- Consistency: High (aligns with prior work) → 20/20
- Directness: High (directly addresses OAuth security) → 20/20
- Precision: High (tight CIs, large sample) → 15/20
- Publication bias: Low (registered study) → 15/15
Overall: 90/100 (High quality)

**Output:**
```markdown
Documentation complete for REF-025:

Summary generated:
- 1-sentence: "This paper demonstrates that OAuth 2.0 token rotation reduces CSRF attacks by 80% with minimal UX impact."
- 1-paragraph: 150 words
- 1-page: Full summary with context, methods, findings

Structured extraction:
- Claims: 4 extracted
- Methods: 4 extracted
- Datasets: 1 documented
- Metrics: 6 quantified
- Findings: 2 with statistics

GRADE quality assessment: 90/100 (High)

Literature note created: Atomic note with tags and links

Files saved:
- Summary: .aiwg/research/knowledge/summaries/REF-025-summary.md
- Extraction: .aiwg/research/knowledge/extractions/REF-025-extraction.json
- Literature Note: .aiwg/research/knowledge/notes/REF-025-literature-note.md
```

**Why This Is Good:**
- Uses structured thought protocol throughout (Goal → Action → Observation → Extraction → Exception → Reasoning)
- Validates all claims against source text to prevent hallucinations
- Generates multi-level summaries for different use cases
- Calculates detailed GRADE score with reasoning
- Creates atomic literature note following Zettelkasten principles
- Provides clear output showing all generated artifacts

## Example 2: Moderate - Hallucination Detection and Recovery

**Input:**
"Summarize paper REF-042 on LLM agent safety."

**Thought (Goal):**
Extract text, generate summary, validate for hallucinations, extract structured data with focus on safety claims.

**Action:**
Extract text from REF-042 PDF.

**Observation:**
Extracted 12,000 words, 15 pages. Paper discusses LLM agent failure modes and safety mitigations.

**Action:**
Generate summary using LLM with full paper text.

**Observation:**
LLM generated summary includes claim: "The paper demonstrates that constitutional AI reduces harmful outputs by 95% compared to baseline RLHF."

**Thought (Exception):**
Validating claim "95% reduction"... Searching paper text for "95%"... NOT FOUND. Searching for "constitutional AI" + "reduction"... Found mention of "constitutional AI" but no 95% figure. Searching for numeric reductions... Found "35% reduction in harmful outputs" not 95%.

**Hallucination detected**: LLM fabricated the 95% statistic. Actual paper reports 35% reduction.

**Thought (Reasoning):**
The LLM likely hallucinated 95% by conflating results from different papers or over-interpreting the paper's findings. I need to regenerate the summary with explicit instruction to use only statistics that appear verbatim in the paper text.

**Action:**
Regenerate summary with hallucination prevention prompt: "Summarize this paper. When citing statistics, use ONLY numbers that appear explicitly in the paper text. If uncertain about a statistic, say 'approximate' or omit it."

**Observation:**
New summary states: "The paper demonstrates that constitutional AI reduces harmful outputs by approximately 35% compared to baseline RLHF."

**Thought (Extraction):**
Validating new summary... "35%" found in Results section (Table 3). "constitutional AI" found throughout. "RLHF" found as baseline. All claims validated. No hallucinations in updated summary.

**Output:**
```markdown
⚠️  Hallucination detected during initial summarization:
- Claimed: "95% reduction"
- Actual: "35% reduction" (from Table 3)
- Action: Summary regenerated with hallucination prevention

Documentation complete for REF-042:

Summary generated (validated, no hallucinations):
- 1-sentence: "This paper analyzes LLM agent failure modes and shows constitutional AI reduces harmful outputs by 35%."
- 1-paragraph: [validated content]
- 1-page: [validated content]

Hallucination prevention:
- Initial attempt: 1 hallucination detected
- Regenerated: 0 hallucinations
- All statistics validated against source text

Structured extraction:
- Claims: 6 extracted (all validated)
- Methods: 3 documented
- Findings: 4 with correct statistics

GRADE quality assessment: 75/100 (Moderate - observational study)

Files saved:
- Summary: .aiwg/research/knowledge/summaries/REF-042-summary.md
- Extraction: .aiwg/research/knowledge/extractions/REF-042-extraction.json
- Literature Note: .aiwg/research/knowledge/notes/REF-042-literature-note.md
- Hallucination Log: .aiwg/research/knowledge/logs/REF-042-hallucination-detected.log
```

**Why This Is Good:**
- Demonstrates hallucination detection by validating claims against source
- Shows recovery process (regeneration with better prompt)
- Logs the hallucination for transparency and improvement
- Validates all statistics in final summary
- Provides detailed output explaining detection and correction

## Example 3: Complex - Progressive Summarization with GRADE Assessment

**Input:**
"Perform progressive summarization on REF-058 (systematic review paper) with detailed GRADE assessment."

**Thought (Goal):**
This is a systematic review, so I need to extract methodology carefully, generate progressive summaries (1-sentence → 1-paragraph → 1-page), perform comprehensive GRADE assessment considering review quality, and create a detailed literature note with links to referenced studies.

**Action:**
Extract text from REF-058 PDF.

**Observation:**
Extracted 18,000 words, 22 pages. Paper is a systematic review of "LLM Agent Evaluation Methods" covering 142 studies. Structure includes: PRISMA flow diagram, inclusion/exclusion criteria, quality assessment of included studies, meta-analysis results.

**Thought (Extraction):**
Key methodology elements:
- Systematic search: 3 databases (Semantic Scholar, ACM, IEEE)
- Boolean query documented: (LLM OR "language model") AND (agent OR agentic) AND (evaluation OR benchmark)
- Initial results: 487 papers
- After screening: 142 included
- Meta-analysis performed on 35 RCTs

**Action:**
Generate 1-sentence summary first.

**Observation:**
1-sentence: "This systematic review of 142 studies finds that benchmark-based evaluation is the dominant paradigm (68% of studies) but suffers from limited coverage of long-horizon tasks and multi-agent scenarios."

**Thought (Extraction):**
Validating 1-sentence summary:
- "142 studies": Confirmed in Abstract and Methods
- "68% of studies": Calculating from Table 2: 97/142 = 68.3%, confirmed
- "long-horizon tasks": Mentioned in Gap Analysis section
- "multi-agent scenarios": Mentioned in Future Work section
Validated, no hallucinations.

**Action:**
Generate 1-paragraph summary.

**Observation:**
1-paragraph summary generated (200 words). Includes: review scope, methods, key findings (benchmark dominance, gap analysis), limitations (publication bias risk), and implications.

**Thought (Extraction):**
Validating 1-paragraph claims against source... All statistics and claims found in paper text. No hallucinations.

**Action:**
Generate 1-page summary with full detail.

**Observation:**
1-page summary generated (800 words) covering: Context, Review Question, Methods (PRISMA-compliant), Quantitative Synthesis, Key Findings, Gap Analysis, Limitations, Implications.

**Thought (Extraction):**
Validating all claims in 1-page summary... Cross-referencing with paper sections... All validated.

**Action:**
Perform GRADE assessment for systematic review.

**Thought (Reasoning):**
GRADE assessment for systematic review:

1. **Risk of Bias (0-25 points)**
   - Search strategy: Comprehensive (3 databases, documented query) → +20
   - Selection process: Two reviewers, documented criteria → +5
   - Assessment: 25/25

2. **Consistency (0-25 points)**
   - Heterogeneity (I²): 45% (moderate, acceptable for social science)
   - Sensitivity analysis: Conducted, results robust → +20
   - Assessment: 20/25

3. **Directness (0-25 points)**
   - Population: LLM agents (direct) → +25
   - Intervention: Evaluation methods (direct) → already counted
   - Outcome: Evaluation effectiveness (direct) → already counted
   - Assessment: 25/25

4. **Precision (0-15 points)**
   - Sample size: 142 studies (large) → +10
   - Confidence intervals: Reported for all meta-analyses → +5
   - Assessment: 15/15

5. **Publication Bias (0-10 points)**
   - Funnel plot: Slight asymmetry detected
   - Fail-safe N: 58 (robust) → +8
   - Assessment: 8/10

Overall GRADE: 93/100 → **High Quality**

**Thought (Synthesis):**
This is a high-quality systematic review with comprehensive search, robust methodology, and careful analysis. The finding that benchmark-based evaluation dominates (68%) but has gaps is well-supported. The slight publication bias risk is acknowledged. This review should be highly trusted for guiding AIWG evaluation strategy.

**Output:**
```markdown
Progressive summarization complete for REF-058:

## Level 1: 1-Sentence Summary
"This systematic review of 142 studies finds that benchmark-based evaluation is the dominant paradigm (68% of studies) but suffers from limited coverage of long-horizon tasks and multi-agent scenarios."

## Level 2: 1-Paragraph Summary (200 words)
This PRISMA-compliant systematic review synthesizes 142 studies on LLM agent evaluation methods published between 2020-2024. The review found that benchmark-based evaluation is the dominant approach (68% of studies), with human evaluation (22%) and simulation-based methods (10%) as alternatives. Meta-analysis of 35 randomized controlled trials shows benchmark scores correlate moderately with human judgments (r=0.62, p<0.001) but poorly with real-world performance (r=0.38). Gap analysis reveals significant under-coverage of long-horizon tasks (only 15% of benchmarks), multi-agent scenarios (8%), and safety evaluation (12%). The review identifies publication bias risk (funnel plot asymmetry) but fail-safe N analysis suggests results are robust. Key implication: Current evaluation methods are insufficient for production LLM agent systems, particularly for safety-critical applications requiring long-horizon planning and multi-agent coordination.

## Level 3: 1-Page Summary (800 words)
[Full detailed summary with Context, Methods, Findings, Gaps, Limitations, Implications]

## GRADE Quality Assessment

### Detailed Scoring

**Risk of Bias: 25/25 (Excellent)**
- Comprehensive search strategy: 3 databases, Boolean query documented
- Two independent reviewers for study selection and quality assessment
- Pre-registered protocol (PROSPERO)
- Low risk of bias in review process

**Consistency: 20/25 (Good)**
- Moderate heterogeneity (I² = 45%) expected for diverse evaluation methods
- Sensitivity analysis confirms results robust to outliers
- Subgroup analyses show consistent patterns across study types

**Directness: 25/25 (Excellent)**
- Population: LLM agents (directly applicable to AIWG)
- Intervention: Evaluation methods (directly addresses research question)
- Outcomes: Evaluation effectiveness (directly measured)
- No indirectness concerns

**Precision: 15/15 (Excellent)**
- Large sample: 142 studies included
- Meta-analysis of 35 RCTs provides quantitative synthesis
- Tight confidence intervals on all estimates
- Adequate power for subgroup analyses

**Publication Bias: 8/10 (Minor Concern)**
- Funnel plot shows slight asymmetry (small study effects)
- Fail-safe N = 58 (robust to missing studies)
- Grey literature search conducted (conference papers, preprints)
- Likely minimal impact on conclusions

**Overall GRADE Score: 93/100**
**Quality Grade: HIGH**

### Interpretation
This is a high-quality systematic review with robust methodology and comprehensive coverage. The findings are trustworthy and directly applicable to AIWG evaluation strategy. Minor publication bias concern does not substantially affect conclusions.

## Structured Extraction
- Claims: 12 extracted (all validated)
- Methods: 8 documented (PRISMA-compliant)
- Meta-analysis results: 3 quantitative syntheses
- Gap analysis: 5 major gaps identified
- Related work: 142 studies synthesized

## Literature Note
Created atomic note: "Benchmark Evaluation Limitations for LLM Agents"
- Tagged: #evaluation #benchmarks #systematic-review #llm-agents
- Linked to: [[Evaluation Methods]], [[Long-Horizon Tasks]], [[Multi-Agent Systems]]

## Files Saved
- Summary (3 levels): .aiwg/research/knowledge/summaries/REF-058-summary.md
- Extraction: .aiwg/research/knowledge/extractions/REF-058-extraction.json
- Literature Note: .aiwg/research/knowledge/notes/REF-058-literature-note.md
- GRADE Report: .aiwg/research/quality/REF-058-grade-assessment.md
```

**Why This Is Good:**
- Demonstrates progressive summarization (1-sentence → 1-paragraph → 1-page)
- Shows detailed GRADE assessment appropriate for systematic review
- Validates all levels of summary against source text
- Provides comprehensive quality scoring with reasoning for each dimension
- Interprets GRADE score in context (high quality, trustworthy)
- Creates literature note with appropriate tags and links
- Uses thought protocol to show extraction, reasoning, and synthesis
