# GRADE Evidence Quality Assessment Guide

**Document Type**: Quality Assessment Methodology
**Version**: 1.0.0
**Status**: Active
**Created**: 2026-01-25
**Epic**: [#67 - Documentation Professionalization](https://git.integrolabs.net/roctinam/ai-writing-guide/issues/67)
**Issue**: [#103 - GRADE Evidence Quality Schema](https://git.integrolabs.net/roctinam/ai-writing-guide/issues/103)

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Decision Tree](#decision-tree)
4. [Assessment Process](#assessment-process)
5. [Factor Examples](#factor-examples)
6. [Citation Policy Integration](#citation-policy-integration)
7. [Common Scenarios](#common-scenarios)
8. [Quality Assurance](#quality-assurance)

---

## Overview

### Purpose

This guide explains how to assess the quality of research sources using AIWG's GRADE-style evidence quality schema. Quality assessments inform citation policy and help maintain research integrity.

### What GRADE Is

**GRADE** (Grading of Recommendations Assessment, Development and Evaluation) is a systematic framework for evaluating evidence quality. Originally developed for clinical medicine, we've adapted it for AI/software research.

**Core principle**: Start with a baseline quality based on source type, then adjust up or down based on specific quality factors.

### Why We Use It

| Problem | GRADE Solution |
|---------|---------------|
| Informal quality judgments | Systematic, documented criteria |
| Inconsistent citation strength | Clear guidance tied to quality level |
| Undocumented assumptions | Explicit rationale for each assessment |
| No bias detection | Structured downgrade factors |
| Overconfidence in weak sources | Conservative quality ratings |

### Key Concepts

**Source Type Baseline**: Starting quality based on publication venue (e.g., peer-reviewed journal starts HIGH, blog starts LOW)

**Downgrade Factors**: 5 criteria that reduce quality (bias, inconsistency, indirectness, imprecision, publication bias)

**Upgrade Factors**: 3 criteria that increase quality (large effects, replication, opposing confounders) - rarely applied

**Quality Levels**: VERY_LOW ⊕○○○ → LOW ⊕⊕○○ → MODERATE ⊕⊕⊕○ → HIGH ⊕⊕⊕⊕

---

## Quick Start

### 5-Minute Assessment

For a quick quality check:

1. **Identify source type** → Assign baseline (HIGH/MODERATE/LOW)
2. **Check for red flags** → Any serious bias, inconsistency, or indirectness?
3. **Assign quality level** → Baseline minus red flags
4. **Document why** → 1-2 sentence rationale

**Example**:
```yaml
# Quick assessment for blog post
source_type: industry_blog (baseline: LOW)
red_flags: Small sample size (n=3 users)
final_quality: VERY_LOW
rationale: "Blog post with anecdotal evidence from 3 users, no statistical analysis"
```

### Full Assessment

For sources that will be cited heavily:

1. Complete all sections of assessment template
2. Evaluate all 5 downgrade factors
3. Check all 3 upgrade factors
4. Write detailed rationale
5. Specify citation guidance

**Time estimate**: 15-30 minutes per source

**Template**: `.aiwg/research/quality-assessments/REF-XXX-assessment.yaml`

---

## Decision Tree

### Step 1: What Is The Source Type?

```
┌─────────────────────────────────────────────────────────┐
│ Is this a peer-reviewed publication?                    │
└────────────┬────────────────────────────────────────────┘
             │
      ┌──────┴──────┐
      │ YES         │ NO
      │             │
      v             v
┌─────────────┐   ┌──────────────────────────────────────┐
│ Top-tier    │   │ Is it a recognized standard (W3C,    │
│ conference  │   │ ISO, IEEE)?                          │
│ or journal? │   └──────┬───────────────────────────────┘
│             │          │
│ YES → HIGH  │    ┌─────┴──────┐
│ NO → MOD    │    │ YES        │ NO
└─────────────┘    │            │
                   v            v
            ┌──────────────┐  ┌────────────────────────┐
            │ HIGH         │  │ Technical report from  │
            │ (Standards)  │  │ reputable org?         │
            └──────────────┘  └────┬───────────────────┘
                                   │
                             ┌─────┴──────┐
                             │ YES        │ NO
                             │            │
                             v            v
                      ┌──────────────┐  ┌───────────┐
                      │ MODERATE     │  │ Blog or   │
                      │ (Tech Report)│  │ informal? │
                      └──────────────┘  │           │
                                        │ LOW       │
                                        └───────────┘
```

### Step 2: Are There Downgrade Factors?

```
For each factor, ask:

┌─────────────────────────────────────────────────────┐
│ BIAS: Is there systematic bias in study design?     │
│   - Funded by party with financial interest?        │
│   - Comparison only to weak baselines?              │
│   - Selective reporting of results?                 │
│                                                      │
│ Serious bias → -1 level                             │
│ Very serious bias → -2 levels                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ INCONSISTENCY: Are results variable/contradictory?  │
│   - Large variance across runs (>20% relative)?     │
│   - Contradictory findings from similar studies?    │
│   - Results not reproducible?                       │
│                                                      │
│ Serious inconsistency → -1 level                    │
│ Very serious inconsistency → -2 levels              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ INDIRECTNESS: Does study context match AIWG use?    │
│   - Different domain (vision vs text vs code)?      │
│   - Synthetic data vs real-world?                   │
│   - Different evaluation criteria?                  │
│                                                      │
│ Serious indirectness → -1 level                     │
│ Very serious indirectness → -2 levels               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ IMPRECISION: Is evidence insufficient?              │
│   - Small sample size (n < 30)?                     │
│   - Wide confidence intervals?                      │
│   - No statistical testing?                         │
│                                                      │
│ Serious imprecision → -1 level                      │
│ Very serious imprecision → -2 levels                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ PUBLICATION BIAS: Selective reporting?              │
│   - Only positive results published?                │
│   - Multiple versions with different results?       │
│   - Negative results not reported?                  │
│                                                      │
│ Serious bias → -1 level                             │
│ Very serious bias → -2 levels                       │
└─────────────────────────────────────────────────────┘
```

### Step 3: Are There Upgrade Factors? (Rare)

```
┌─────────────────────────────────────────────────────┐
│ LARGE EFFECT: Is improvement >2× baseline?          │
│   - Effect so large confounding unlikely?           │
│   - Dose-response gradient observed?                │
│                                                      │
│ YES (with confidence) → +1 level                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ REPLICATION: Have ≥2 independent teams reproduced?  │
│   - Different implementations?                      │
│   - Consistent results (within 10%)?                │
│                                                      │
│ YES → +1 level                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ OPPOSING CONFOUNDERS: Do biases work against finding?│
│   - Effect persists despite handicaps?              │
│   - Sensitivity analysis shows robustness?          │
│                                                      │
│ YES (requires deep analysis) → +1 level             │
└─────────────────────────────────────────────────────┘
```

### Step 4: Calculate Final Quality

```
final_quality = baseline - sum(downgrades) + sum(upgrades)

Clamp to range: [VERY_LOW, LOW, MODERATE, HIGH]

Examples:
- HIGH baseline, -1 bias = MODERATE
- MODERATE baseline, -2 indirectness = VERY_LOW
- LOW baseline, +1 large effect = MODERATE
- HIGH baseline, no factors = HIGH
```

---

## Assessment Process

### Detailed Workflow

#### Phase 1: Preparation

**Before starting assessment:**

1. **Read the full source** - Don't assess based on abstract only
2. **Check for related work** - Are there critiques, replications, or citations?
3. **Identify AIWG use case** - How will this be cited in AIWG documentation?
4. **Gather context** - Venue reputation, author track record, code availability

**Time**: 30-60 minutes for initial reading

#### Phase 2: Baseline Classification

**Complete the `source_classification` section:**

```yaml
source_classification:
  type: "peer_reviewed_conference"  # From schema
  baseline_quality: "HIGH"
  rationale: |
    Explain why this source type and baseline.
    Include:
    - Venue name and reputation
    - Acceptance rate if known
    - Peer review process
    - Any special considerations
```

**Questions to answer:**

- What type of publication is this? (Conference, journal, preprint, blog, etc.)
- Is the venue reputable in its field?
- What is the acceptance/rejection rate?
- What peer review process was used?

**Time**: 5 minutes

#### Phase 3: Downgrade Factor Assessment

**For each of the 5 factors, complete:**

```yaml
downgrade_assessment:
  risk_of_bias:
    severity: "none"  # none | serious | very_serious
    impact: 0         # 0, -1, or -2
    rationale: |
      Explain your assessment.
      What evidence supports this rating?
      What specific biases did you check for?
```

**Detailed factor-by-factor guidance:**

##### Factor 1: Risk of Bias

**Ask:**
- Who funded this research? Any conflicts of interest?
- What baselines were compared? Strong or weak?
- Is evaluation methodology sound?
- Are comparisons fair (same data, same metrics)?
- Is there cherry-picking of results?

**Red flags:**
- Company-funded study with no independent validation
- Comparison only to outdated or weak baselines
- Metrics that favor proposed approach
- Missing details about experimental setup
- Inconsistent reporting across paper sections

**Example - NO bias:**
```yaml
risk_of_bias:
  severity: "none"
  impact: 0
  rationale: |
    No conflicts of interest disclosed. Comparison to multiple strong
    baselines (GPT-4, ChatDev, etc.). Open-source implementation enables
    verification. Standard benchmarks used.
```

**Example - SERIOUS bias:**
```yaml
risk_of_bias:
  severity: "serious"
  impact: -1
  rationale: |
    Study funded by company selling the technology. Comparison only to
    company's own prior work, not to independent competing methods.
    Evaluation metrics not standard in field.
```

##### Factor 2: Inconsistency

**Ask:**
- How variable are the results across runs/seeds?
- Are findings consistent with related studies?
- Do different metrics tell the same story?
- Is statistical significance marginal or robust?

**Red flags:**
- Variance >20% across runs
- Results contradict similar published studies
- Different sections of paper report conflicting findings
- P-values barely below 0.05

**Example - NO inconsistency:**
```yaml
inconsistency:
  severity: "none"
  impact: 0
  rationale: |
    Results consistent across 164 HumanEval and 427 MBPP tasks. Multiple
    metrics align (Pass@1, executability, token efficiency). Low variance
    reported in ablation studies.
```

**Example - SERIOUS inconsistency:**
```yaml
inconsistency:
  severity: "serious"
  impact: -1
  rationale: |
    Accuracy varies from 68% to 91% across different runs (34% relative variance).
    One similar study reported opposite finding (Jones et al. 2023). Results
    seem sensitive to random seed selection.
```

##### Factor 3: Indirectness

**Ask:**
- Is the study domain the same as AIWG's use case?
- Are the tasks/benchmarks relevant to AIWG?
- Is the model architecture comparable?
- Are evaluation criteria aligned?

**Red flags:**
- Different field entirely (e.g., biology for software)
- Synthetic/toy problems vs real-world tasks
- Evaluation metrics AIWG doesn't use
- Older technology (2010s research for 2024 LLMs)

**Example - NO indirectness:**
```yaml
indirectness:
  severity: "none"
  impact: 0
  rationale: |
    Directly applicable: multi-agent software development, same workflow
    (requirements → design → code), same artifacts (PRD, design docs, tests).
    Nearly 1:1 mapping to AIWG SDLC phases.
```

**Example - SERIOUS indirectness:**
```yaml
indirectness:
  severity: "serious"
  impact: -1
  rationale: |
    Study focuses on image classification, AIWG uses text/code generation.
    Convolutional architecture vs Transformer. Evaluation on ImageNet, not
    code benchmarks. Findings may not transfer across modalities.
```

##### Factor 4: Imprecision

**Ask:**
- Is sample size adequate (n ≥ 30 for quantitative)?
- Are confidence intervals reported and narrow?
- Is there proper statistical testing?
- Are results from single example or systematic study?

**Red flags:**
- n < 10 for quantitative claims
- Confidence intervals span both benefit and harm
- No significance testing, just point estimates
- Anecdotal evidence only

**Example - NO imprecision:**
```yaml
imprecision:
  severity: "none"
  impact: 0
  rationale: |
    Large samples: 164 HumanEval, 427 MBPP, 70 SoftwareDev tasks. Multiple
    metrics reported. Effect sizes large enough that statistical significance
    clear even without formal testing.
```

**Example - SERIOUS imprecision:**
```yaml
imprecision:
  severity: "serious"
  impact: -1
  rationale: |
    User study with n=8 participants. No confidence intervals reported.
    Results based on Likert scale with high variance (σ=2.3 on 5-point scale).
    No power analysis or significance testing.
```

##### Factor 5: Publication Bias

**Ask:**
- Are negative results reported?
- Is there evidence of selective reporting?
- Are limitations acknowledged?
- Are failed approaches documented?

**Red flags:**
- No limitations section
- Perfection claims (100% success with no failures)
- Multiple versions with different results
- Only best results reported (no ablations showing what doesn't work)

**Example - NO publication bias:**
```yaml
publication_bias:
  severity: "none"
  impact: 0
  rationale: |
    Limitations section present. Ablation studies show what doesn't work
    (e.g., removing certain roles reduces quality). Acknowledges areas not
    addressed (UI, frontend). Human revisions still needed (0.83).
```

**Example - SERIOUS publication bias:**
```yaml
publication_bias:
  severity: "serious"
  impact: -1
  rationale: |
    No limitations discussed. Claims 100% success with no failures. Multiple
    preprint versions with different results (v1 reported 78%, v3 reports 91%).
    No discussion of failed experiments or alternative approaches.
```

**Time**: 15-20 minutes for thorough downgrade assessment

#### Phase 4: Upgrade Factor Assessment

**For each of the 3 factors:**

```yaml
upgrade_assessment:
  large_magnitude_effect:
    applies: false  # true | false
    impact: 0       # 0 or +1
    rationale: |
      Explain why this does or does not apply.
      If applies, justify why confounding unlikely.
```

**Important**: Upgrade factors are **rare**. Default to `applies: false` unless strong evidence.

##### Factor 1: Large Magnitude Effect

**Criteria for "large":**
- Improvement >2× baseline (100% relative improvement)
- Effect size remains large even with conservative assumptions
- Dose-response gradient (more X → more Y)

**Example - DOES apply:**
```yaml
large_magnitude_effect:
  applies: true
  impact: +1
  rationale: |
    85.9% vs 67.0% baseline = 28% relative improvement. Also 18.5× improvement
    in Tree of Thoughts study (74% vs 4%). Effect so large that even if true
    value is half, still meaningful. Dose-response: more agents → better quality.
```

**Example - DOES NOT apply:**
```yaml
large_magnitude_effect:
  applies: false
  impact: 0
  rationale: |
    Improvement is 82% vs 78% (5% relative). While statistically significant,
    magnitude not large enough to rule out confounding factors. Conservative
    assumptions could eliminate effect.
```

##### Factor 2: Independent Replication

**Criteria:**
- ≥2 independent teams (different institutions)
- Different implementations/codebases
- Consistent results (within ~10%)

**Example - DOES apply:**
```yaml
independent_replication:
  applies: true
  impact: +1
  rationale: |
    Chain-of-Thought benefit replicated by 5+ independent papers (Wei et al.,
    Kojima et al., Wang et al., Zhou et al.). Different prompting implementations,
    different benchmarks, consistent finding: CoT improves reasoning.
```

**Example - DOES NOT apply:**
```yaml
independent_replication:
  applies: false
  impact: 0
  rationale: |
    Published in 2024, insufficient time for independent replications. GitHub
    repo has high stars but no peer-reviewed replication studies yet. Reassess
    in 1-2 years.
```

##### Factor 3: Opposing Confounders

**Criteria:**
- Identified biases would work *against* finding
- Effect persists despite conservative assumptions
- Sensitivity analysis shows robustness

**Example - DOES apply:**
```yaml
opposing_confounders:
  applies: true
  impact: +1
  rationale: |
    Study used suboptimal hyperparameters (acknowledged in paper), yet still
    found improvement. Sensitivity analysis with worst-case assumptions still
    shows benefit. Any tuning would likely increase effect size.
```

**Example - DOES NOT apply (most common):**
```yaml
opposing_confounders:
  applies: false
  impact: 0
  rationale: |
    No clear opposing confounders identified. Most biases (if any) would work
    in same direction as reported effect.
```

**Time**: 5-10 minutes for upgrade assessment

#### Phase 5: Final Quality Calculation

**Calculate final quality level:**

```yaml
quality_adjustments_summary:
  baseline: "HIGH"

  downgrades:
    risk_of_bias: 0
    inconsistency: 0
    indirectness: -1
    imprecision: 0
    publication_bias: 0
    total: -1

  upgrades:
    large_magnitude_effect: 0
    independent_replication: 0
    opposing_confounders: 0
    total: 0

  final_calculation: "HIGH + (-1) + 0 = MODERATE"

final_quality:
  level: "MODERATE"
  symbol: "⊕⊕⊕○"
  confidence: "Moderately confident in [core finding]"
```

**Write confidence statement:**

```yaml
final_quality:
  confidence_statement: |
    We have [LEVEL] confidence that [CORE FINDING].

    This assessment is based on:
    - [Evidence 1]
    - [Evidence 2]
    - [Evidence 3]

    [What would change our confidence?]
```

**Time**: 5 minutes

#### Phase 6: Citation Guidance

**Specify how this source should be cited:**

```yaml
citation_guidance:
  strength: "PRIMARY_EVIDENCE"  # PRIMARY_EVIDENCE | SUPPORTING | BACKGROUND | AVOID
  quality_level: "HIGH"

  allowed_uses:
    - "Technical documentation"
    - "Architecture decisions"

  restrictions:
    - "Not for marketing claims"

  recommended_qualifiers:
    required:
      - "Note that finding from different domain"
    optional:
      - "Can mention limitations"

  example_citations:
    strong_claims:
      - "[Specific claim] (Author, Year)"

    with_qualification:
      - "Early evidence suggests [claim], though replication needed (Author, Year)"
```

**Mapping quality → citation strength:**

| Quality | Strength | Qualifiers | Marketing OK? |
|---------|----------|------------|---------------|
| **HIGH** | PRIMARY_EVIDENCE | None required | Yes |
| **MODERATE** | SUPPORTING | Context + limitations | With caveats |
| **LOW** | BACKGROUND | Explicit uncertainty | No |
| **VERY_LOW** | AVOID | N/A (don't cite) | No |

**Time**: 5 minutes

#### Phase 7: Documentation

**Complete metadata:**

```yaml
assessment_metadata:
  assessed_by: "Your Name"
  assessment_date: "2026-01-25"
  grade_version: "1.0.0"
  review_status: "INITIAL"
  next_review_date: "2027-01-25"

  review_triggers:
    - "Independent replication published"
    - "Paper retracted or corrected"
    - "Major critique published"

  notes: |
    Additional context or considerations.
```

**Time**: 2 minutes

**Total time for full assessment: 30-40 minutes**

---

## Factor Examples

### Risk of Bias Examples

#### Example 1: NO Bias (MetaGPT)

**Source**: REF-013 - MetaGPT (ICLR 2024)

**Assessment**:
- ✓ No conflicts of interest disclosed
- ✓ Comparison to multiple strong baselines (GPT-4, ChatDev, AutoGPT)
- ✓ Open-source implementation for verification
- ✓ Standard benchmarks (HumanEval, MBPP)
- ✓ Ablation studies show what doesn't work

**Rating**: severity: none, impact: 0

#### Example 2: SERIOUS Bias

**Source**: Hypothetical company blog

**Assessment**:
- ✗ Funded by company selling the technology
- ✗ Comparison only to company's prior work
- ✗ Evaluation metrics not standard in field
- ✗ No independent validation
- ✗ Results favor commercial offering

**Rating**: severity: serious, impact: -1

#### Example 3: VERY SERIOUS Bias

**Source**: Hypothetical cherry-picked study

**Assessment**:
- ✗ No baseline comparison at all
- ✗ Selective data reporting (best results only)
- ✗ Methodology designed to favor outcome
- ✗ Independent reproduction attempts failed
- ✗ Authors have financial stake in results

**Rating**: severity: very_serious, impact: -2

### Inconsistency Examples

#### Example 1: NO Inconsistency (MetaGPT)

**Source**: REF-013 - MetaGPT

**Assessment**:
- ✓ HumanEval: 85.9% (164 tasks) - stable
- ✓ MBPP: 87.7% (427 tasks) - consistent with HumanEval
- ✓ Multiple metrics align (Pass@1, executability, tokens/line)
- ✓ Ablation trends expected (more roles → better)
- ✓ Small variance in reported metrics

**Rating**: severity: none, impact: 0

#### Example 2: SERIOUS Inconsistency

**Source**: Hypothetical unstable study

**Assessment**:
- ✗ Accuracy varies 68%-91% across runs (34% relative variance)
- ✗ Contradicted by similar study (Jones et al. 2023)
- ✗ Different seeds produce wildly different results
- ✗ Results unstable to minor hyperparameter changes

**Rating**: severity: serious, impact: -1

### Indirectness Examples

#### Example 1: NO Indirectness (MetaGPT)

**Source**: REF-013 - MetaGPT for AIWG SDLC

**Assessment**:
- ✓ Same domain: multi-agent software development
- ✓ Same workflow: requirements → design → code → test
- ✓ Same artifacts: PRD, design docs, code, tests
- ✓ Nearly 1:1 mapping to AIWG phases
- ✓ Evaluation criteria directly relevant

**Rating**: severity: none, impact: 0

#### Example 2: SERIOUS Indirectness

**Source**: Image classification study for code generation

**Assessment**:
- ✗ Different modality (vision vs text)
- ✗ Different architecture (CNN vs Transformer)
- ✗ Different benchmarks (ImageNet vs HumanEval)
- ✗ Findings may not transfer across domains

**Rating**: severity: serious, impact: -1

#### Example 3: VERY SERIOUS Indirectness

**Source**: 1990s neural network study for modern LLMs

**Assessment**:
- ✗ Historical work (30+ years old)
- ✗ Completely different architecture (MLP vs Transformer)
- ✗ Toy problems (XOR, 28×28 digits) vs real-world
- ✗ Outdated assumptions (gradient vanishing, no attention)

**Rating**: severity: very_serious, impact: -2

### Imprecision Examples

#### Example 1: NO Imprecision (MetaGPT)

**Source**: REF-013 - MetaGPT

**Assessment**:
- ✓ Large samples: 164 + 427 + 70 tasks
- ✓ Multiple metrics reported with exact values
- ✓ Effect sizes large and clear
- ✓ Standard benchmarks enable comparison

**Rating**: severity: none, impact: 0

#### Example 2: SERIOUS Imprecision

**Source**: Small user study

**Assessment**:
- ✗ n=8 participants (underpowered)
- ✗ No confidence intervals reported
- ✗ High variance (σ=2.3 on 5-point scale)
- ✗ No significance testing

**Rating**: severity: serious, impact: -1

### Publication Bias Examples

#### Example 1: NO Publication Bias (MetaGPT)

**Source**: REF-013 - MetaGPT

**Assessment**:
- ✓ Limitations section acknowledges gaps
- ✓ Ablation studies show what doesn't help
- ✓ Human revisions still needed (not claiming perfection)
- ✓ Failed approaches documented

**Rating**: severity: none, impact: 0

#### Example 2: SERIOUS Publication Bias

**Source**: Hypothetical selective reporting

**Assessment**:
- ✗ No limitations discussed
- ✗ Claims 100% success (implausible)
- ✗ Multiple preprint versions with different results
- ✗ No negative results reported

**Rating**: severity: serious, impact: -1

---

## Citation Policy Integration

### Quality Level → Citation Strength Mapping

#### HIGH Quality (⊕⊕⊕⊕)

**Citation Strength**: PRIMARY_EVIDENCE

**Allowed Uses**:
- Core architectural justification
- Marketing materials and public claims
- Technical documentation without qualification
- ADRs as supporting evidence
- Research publications

**Phrasing**:
- "Research shows that [claim] (REF-XXX)"
- "MetaGPT achieves 85.9% on HumanEval (Hong et al., 2024)"
- "AIWG's architecture is validated by [finding]"

**Qualifiers**: None required (optional for precision)

**Examples**:
- ✓ "Multi-agent workflows improve code quality by 28% (REF-013)"
- ✓ "Chain-of-Thought enhances reasoning performance (Wei et al., 2022)"

#### MODERATE Quality (⊕⊕⊕○)

**Citation Strength**: SUPPORTING

**Allowed Uses**:
- Supporting evidence (combine with other sources)
- Technical documentation with context
- Preliminary findings
- Internal documentation

**Phrasing**:
- "Early evidence suggests [claim] (REF-XXX)"
- "One study found [result], though replication needed"
- "[Finding] has been observed (Author, Year), but further validation required"

**Qualifiers**: Required
- State limitations explicitly
- Note preliminary nature
- Combine with other evidence when possible

**Examples**:
- ✓ "A preprint suggests [claim] (REF-XXX), though peer review pending"
- ✗ "We know that [claim]" (too strong)

#### LOW Quality (⊕⊕○○)

**Citation Strength**: BACKGROUND

**Allowed Uses**:
- Background information and context
- Illustrative examples
- Motivation for research
- Internal documentation only (not public)

**Phrasing**:
- "Practitioners report [observation] (REF-XXX)"
- "Anecdotal evidence suggests [possibility]"
- "[Author] describes [approach], though formal evaluation lacking"

**Qualifiers**: Required
- Flag as exploratory/preliminary
- Never use alone for critical claims
- Avoid quantitative claims

**Examples**:
- ✓ "Industry blogs discuss [approach] (REF-XXX) as a potential direction"
- ✗ "Studies prove [claim]" (inappropriate strength)

#### VERY LOW Quality (⊕○○○)

**Citation Strength**: AVOID

**Allowed Uses**:
- Historical context only
- Identifying gaps for future research
- Explicitly flagged as speculative

**Restrictions**:
- **Do NOT cite as evidence**
- **Do NOT use in marketing materials**
- **Do NOT base architectural decisions on**

**Phrasing**:
- "Speculative discussions suggest [idea]"
- "[Author] proposes [theory], though unvalidated"

**Examples**:
- ✓ "Future work might explore [speculative idea mentioned in REF-XXX]"
- ✗ ANY use as supporting evidence

### Citation Qualifier Templates

#### For MODERATE Sources

**Template 1**: Acknowledge Limitations
```
Early research suggests [claim] (REF-XXX), though independent
replication is needed to confirm findings.
```

**Template 2**: Combine with Other Sources
```
Multiple studies indicate [claim] (REF-XXX, REF-YYY), with
preliminary evidence from [MODERATE source] (REF-ZZZ).
```

**Template 3**: Note Uncertainty
```
[Finding] has been observed in initial studies (REF-XXX),
though the magnitude of effect remains uncertain.
```

#### For LOW Sources

**Template 1**: Exploratory Framing
```
Practitioners report [observation] (REF-XXX), suggesting a
direction for future systematic investigation.
```

**Template 2**: Anecdotal Evidence
```
Anecdotal evidence from industry (REF-XXX) indicates [pattern],
though rigorous evaluation is lacking.
```

**Template 3**: Background Only
```
The history of [approach] includes informal discussions (REF-XXX),
which motivated subsequent formal research.
```

---

## Common Scenarios

### Scenario 1: Peer-Reviewed Conference Paper (Direct Relevance)

**Source**: ICLR 2024 paper on multi-agent code generation

**Assessment**:
1. **Baseline**: HIGH (top-tier conference, 24% acceptance rate)
2. **Downgrades**: None (rigorous methodology, large sample, directly applicable)
3. **Upgrades**: +1 large magnitude effect (28% improvement)
4. **Final**: HIGH (⊕⊕⊕⊕)

**Citation**: PRIMARY_EVIDENCE, no qualifiers needed

**Time**: 30 minutes (thorough)

### Scenario 2: arXiv Preprint (Awaiting Peer Review)

**Source**: ArXiv preprint from reputable lab, promising results

**Assessment**:
1. **Baseline**: MODERATE (preprint, not peer-reviewed yet)
2. **Downgrades**: None if methodology sound
3. **Upgrades**: Rarely applicable for preprints
4. **Final**: MODERATE (⊕⊕⊕○)

**Citation**: SUPPORTING, note "preprint awaiting review"

**Time**: 20 minutes

### Scenario 3: Industry Blog (Small Study)

**Source**: Engineering blog with n=10 user study

**Assessment**:
1. **Baseline**: LOW (blog, not peer-reviewed)
2. **Downgrades**: -1 imprecision (small n), possible bias
3. **Upgrades**: None
4. **Final**: VERY_LOW (⊕○○○)

**Citation**: AVOID or BACKGROUND only

**Time**: 10 minutes

### Scenario 4: Standard (W3C Recommendation)

**Source**: W3C PROV-DM standard

**Assessment**:
1. **Baseline**: HIGH (formal standard, consensus process)
2. **Downgrades**: None (standards are definitional, not empirical)
3. **Upgrades**: None (not applicable for standards)
4. **Final**: HIGH (⊕⊕⊕⊕)

**Citation**: PRIMARY_EVIDENCE for standard compliance

**Time**: 15 minutes

### Scenario 5: Highly Cited But Indirect Study

**Source**: Landmark paper in different domain (e.g., vision for code)

**Assessment**:
1. **Baseline**: HIGH (prestigious journal, highly cited)
2. **Downgrades**: -1 or -2 indirectness (different domain)
3. **Upgrades**: Possibly +1 replication (if widely validated in original domain)
4. **Final**: MODERATE or LOW

**Citation**: BACKGROUND or SUPPORTING with caveats

**Time**: 25 minutes

### Scenario 6: Theoretical Work (No Empirical Data)

**Source**: Mathematical proof or theoretical framework

**Assessment**:
1. **Baseline**: HIGH if peer-reviewed, MODERATE if not
2. **Downgrades**: -1 indirectness (theory vs practice), -1 imprecision (no empirical data)
3. **Upgrades**: None
4. **Final**: LOW or MODERATE

**Citation**: BACKGROUND for theoretical motivation, not empirical claims

**Time**: 20 minutes

---

## Quality Assurance

### Self-Check Questions

Before finalizing assessment, ask:

#### Baseline Classification
- [ ] Is the source type correctly identified?
- [ ] Have I verified the venue's reputation?
- [ ] Is the baseline assignment justified?

#### Downgrade Factors
- [ ] Have I checked ALL 5 downgrade factors?
- [ ] Are severity ratings conservative (when uncertain, downgrade more)?
- [ ] Is rationale specific (not generic)?
- [ ] Have I documented specific evidence for each factor?

#### Upgrade Factors
- [ ] Am I being appropriately skeptical? (Upgrades are rare)
- [ ] Is there strong justification for any upgrade?
- [ ] Have I verified replication claims independently?

#### Final Quality
- [ ] Does final quality level match the evidence?
- [ ] Is confidence statement specific, not generic?
- [ ] Would an independent assessor reach similar conclusion?

#### Citation Guidance
- [ ] Is citation strength aligned with quality level?
- [ ] Are restrictions clear and enforceable?
- [ ] Do example citations use appropriate phrasing?

### Common Mistakes to Avoid

#### Mistake 1: Over-Confidence in Preprints

**Wrong**:
```yaml
source_type: preprint_arxiv
baseline_quality: HIGH  # ✗ Too high
```

**Right**:
```yaml
source_type: preprint_arxiv
baseline_quality: MODERATE  # ✓ Correct
notes: "Can upgrade to HIGH after peer review publication"
```

#### Mistake 2: Ignoring Indirectness

**Wrong**:
```yaml
indirectness:
  severity: "none"  # ✗ Image study for code generation
```

**Right**:
```yaml
indirectness:
  severity: "serious"  # ✓ Different modality
  impact: -1
  rationale: "Vision domain findings may not transfer to code"
```

#### Mistake 3: Liberal Use of Upgrades

**Wrong**:
```yaml
large_magnitude_effect:
  applies: true  # ✗ 15% improvement isn't "large magnitude"
```

**Right**:
```yaml
large_magnitude_effect:
  applies: false  # ✓ Reserve for >2× improvements
  rationale: "15% improvement, while significant, not large enough for upgrade"
```

#### Mistake 4: Generic Rationales

**Wrong**:
```yaml
risk_of_bias:
  severity: "none"
  rationale: "Study looks fine"  # ✗ Too vague
```

**Right**:
```yaml
risk_of_bias:
  severity: "none"
  rationale: |  # ✓ Specific evidence
    No conflicts disclosed. Comparison to 5 strong baselines (GPT-4, etc.).
    Open-source code enables verification. Standard benchmarks used.
```

#### Mistake 5: Inappropriate Citation Strength

**Wrong**:
```yaml
# MODERATE quality source
citation_guidance:
  strength: "PRIMARY_EVIDENCE"  # ✗ Too strong
  example_citations:
    - "Research proves [claim]"  # ✗ Overconfident
```

**Right**:
```yaml
# MODERATE quality source
citation_guidance:
  strength: "SUPPORTING"  # ✓ Appropriate
  example_citations:
    - "Early evidence suggests [claim] (REF-XXX)"  # ✓ Qualified
```

### Peer Review Checklist

When reviewing someone else's assessment:

#### Content Review
- [ ] All required sections completed
- [ ] Rationales are specific and evidence-based
- [ ] Quality calculations are correct
- [ ] Citation guidance aligns with quality level

#### Judgment Review
- [ ] Baseline classification is appropriate
- [ ] Downgrade assessments are justified
- [ ] Upgrade factors (if any) have strong justification
- [ ] Final quality level is reasonable

#### Consistency Review
- [ ] Assessment consistent with similar sources
- [ ] Tone is objective, not advocacy
- [ ] No obvious biases in assessor's judgment

#### Completeness Review
- [ ] Cross-references populated
- [ ] Metadata complete
- [ ] Review triggers identified

### Update Triggers

Reassess quality when:

1. **Independent replication published** → May upgrade
2. **Paper retracted or corrected** → Downgrade or remove
3. **Major critique published** → May downgrade
4. **Venue ranking changes** → May adjust baseline
5. **New evidence contradicts findings** → May downgrade for inconsistency
6. **Annual review date** → Systematic reassessment

---

## Appendix: Quick Reference Tables

### Baseline Quality by Source Type

| Source Type | Baseline | Notes |
|-------------|----------|-------|
| Peer-reviewed journal (top) | HIGH | Nature, Science, JMLR |
| Peer-reviewed conference (top) | HIGH | NeurIPS, ICML, ICLR |
| Standard (W3C, ISO, IEEE) | HIGH | Formal consensus |
| Academic book | HIGH | MIT Press, Springer |
| Peer-reviewed journal (mid) | MODERATE | Domain-specific journals |
| Peer-reviewed conference (mid) | MODERATE | Regional conferences |
| ArXiv preprint | MODERATE | Awaiting peer review |
| Workshop paper | MODERATE | Some review |
| Technical report | MODERATE | Reputable org |
| Trade book | MODERATE | O'Reilly, Pragmatic |
| Industry blog | LOW | Practitioner |
| Blog post | LOW | Informal |
| Social media | VERY_LOW | Avoid |

### Downgrade Impact Summary

| Factor | Serious | Very Serious |
|--------|---------|--------------|
| Risk of Bias | -1 level | -2 levels |
| Inconsistency | -1 level | -2 levels |
| Indirectness | -1 level | -2 levels |
| Imprecision | -1 level | -2 levels |
| Publication Bias | -1 level | -2 levels |

### Upgrade Impact Summary

| Factor | Impact | Frequency |
|--------|--------|-----------|
| Large Magnitude Effect | +1 level | Uncommon |
| Independent Replication | +1 level | Rare in AI |
| Opposing Confounders | +1 level | Very rare |

### Citation Strength by Quality

| Quality | Symbol | Citation Strength | Marketing OK? |
|---------|--------|-------------------|---------------|
| HIGH | ⊕⊕⊕⊕ | PRIMARY_EVIDENCE | Yes |
| MODERATE | ⊕⊕⊕○ | SUPPORTING | With caveats |
| LOW | ⊕⊕○○ | BACKGROUND | No |
| VERY_LOW | ⊕○○○ | AVOID | No |

---

## References

### Schema and Templates

- **Quality Schema**: `agentic/code/frameworks/sdlc-complete/schemas/research/quality-assessment.yaml`
- **Example Assessment**: `.aiwg/research/quality-assessments/REF-013-metagpt-assessment.yaml`
- **Assessment Template**: Copy REF-013 and modify

### Related Documentation

- **Citation Policy**: `.aiwg/research/docs/citation-policy.md` (planned)
- **Research Gap Analysis**: `.aiwg/research/research-gap-analysis.md`
- **Citable Claims Index**: `.aiwg/research/citable-claims-index.md`

### External Resources

- **GRADE Handbook**: REF-060 - Original GRADE methodology
- **LitLLM Study**: REF-059 - Citation integrity in LLMs
- **R-LAM**: REF-058 - Reproducibility constraints

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-25 | Claude Code | Initial guide creation |

---

**Document Status**: ACTIVE
**Next Review**: 2027-01-25
**Maintainer**: Research Team
