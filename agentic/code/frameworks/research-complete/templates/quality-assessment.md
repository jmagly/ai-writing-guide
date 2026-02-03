# GRADE Quality Assessment Template

---
template_id: quality-assessment
version: 1.0.0
reasoning_required: true
framework: research-complete
---

## Ownership & Collaboration

- Document Owner: Research Analyst
- Contributor Roles: Domain Expert, Quality Auditor
- Automation Inputs: Paper metadata, methodology sections, results tables
- Automation Outputs: `quality-assessment-REF-XXX.md` with GRADE rating and justification

## Phase 1: Core (ESSENTIAL)

### Paper Identification

**Reference ID:** REF-XXX

<!-- EXAMPLE: REF-018 -->

**Title:** [Full paper title]

<!-- EXAMPLE: ReAct: Synergizing Reasoning and Acting in Language Models -->

**Authors:** [Author list]

**Year:** YYYY

**Source:** [Journal/Conference/Preprint]

<!-- EXAMPLE:
**Authors:** Yao, S., Zhao, J., Yu, D., et al.
**Year:** 2022
**Source:** ICLR 2023 (International Conference on Learning Representations)
-->

### Quality Rating Summary

**GRADE Level:** HIGH | MODERATE | LOW | VERY LOW

<!-- EXAMPLE: HIGH -->

**Baseline (Source Type):** [Initial quality based on publication venue]

<!-- EXAMPLE:
**Baseline (Source Type):** HIGH (Peer-reviewed top-tier conference)
Per @.claude/rules/research-metadata.md, peer-reviewed conferences start at HIGH.
-->

**Adjustments:** [Factors that raised or lowered from baseline]

<!-- EXAMPLE:
**Adjustments:**
+0 (No upward adjustments needed, strong methodology)
-0 (No downward adjustments, no serious limitations)
Final: HIGH (retained baseline)
-->

**One-Line Rationale:** [Brief justification]

<!-- EXAMPLE:
**One-Line Rationale:** Rigorous experimental design with multiple baselines, reproducible methodology, and consistent results across four diverse benchmarks.
-->

## Reasoning

> Complete this section BEFORE detailed assessment. Per @.claude/rules/reasoning-sections.md

1. **Baseline Determination**: What is the starting quality level?
   > [Assess publication venue quality per GRADE guidelines]

<!-- EXAMPLE:
Source: ICLR 2023 (International Conference on Learning Representations)
Venue quality: Top-tier ML conference (acceptance rate ~28%, rigorous peer review)
Baseline per @.claude/rules/research-metadata.md: HIGH

Rationale: ICLR is top-3 ML conference alongside NeurIPS and ICML. Strong review process, high standards.
-->

2. **Study Design Evaluation**: How rigorous is the methodology?
   > [Assess experimental design, controls, baselines, reproducibility]

<!-- EXAMPLE:
Design strengths:
- Multiple baselines (Act-only, CoT, standard prompting)
- Diverse tasks (4 benchmarks: HotpotQA, FEVER, ALFWorld, WebShop)
- Clear evaluation metrics (success rate, accuracy, trajectory efficiency)
- Reproducible (code and data publicly available)

Design weaknesses:
- Single model family tested (GPT-3/GPT-4, no LLaMA/Claude comparison)
- Limited analysis of failure modes
-->

3. **Evidence Strength Assessment**: How strong is the evidence for claims?
   > [Evaluate sample size, statistical significance, effect sizes]

<!-- EXAMPLE:
Evidence strengths:
- Large sample sizes (500 questions for HotpotQA, FEVER)
- Consistent improvements across tasks (not cherry-picked)
- Effect sizes substantial (34% relative improvement, not marginal)

Evidence limitations:
- No statistical significance testing reported (p-values, confidence intervals)
- Single-run results (no error bars or repeated trials)
-->

4. **Generalizability Analysis**: How broadly do findings apply?
   > [Assess scope: single domain vs cross-domain, single model vs multiple]

<!-- EXAMPLE:
Generalizability strengths:
- Four diverse task types (QA, fact verification, interactive, web)
- Both reasoning-heavy and action-heavy tasks tested

Generalizability limitations:
- All tasks involve tool use; unclear if pattern helps non-tool tasks
- Consumer-grade tasks; enterprise SDLC workflows not tested
- Single model family (OpenAI GPT); transferability to other LLMs unclear
-->

5. **Risk of Bias Assessment**: Are there methodological biases?
   > [Check for selection bias, reporting bias, funding conflicts]

<!-- EXAMPLE:
Bias risks:
- LOW: Baselines fairly selected (standard methods in literature)
- LOW: Tasks represent diverse challenge types
- MODERATE: Authors affiliated with OpenAI, tested on GPT models (potential optimization bias)
- LOW: Code and data public (transparency high)

Overall bias risk: LOW to MODERATE
-->

## Phase 2: Detailed GRADE Assessment (EXPAND WHEN READY)

<details>
<summary>Click to expand detailed GRADE criteria evaluation</summary>

### GRADE Framework

GRADE (Grading of Recommendations Assessment, Development and Evaluation) assesses evidence quality across five domains:

1. **Study Design** (starting point)
2. **Risk of Bias** (may downgrade)
3. **Inconsistency** (may downgrade)
4. **Indirectness** (may downgrade)
5. **Imprecision** (may downgrade)
6. **Publication Bias** (may downgrade)
7. **Large Effect Size** (may upgrade)
8. **Dose-Response** (may upgrade)
9. **Confounders** (may upgrade)

### 1. Study Design (Baseline)

| Design Type | Baseline GRADE | This Paper |
|-------------|----------------|------------|
| Systematic review | HIGH | ☐ |
| RCT | HIGH | ☐ |
| Cohort study | MODERATE | ☐ |
| Case-control | MODERATE | ☐ |
| Case series | LOW | ☐ |
| Expert opinion | VERY LOW | ☐ |
| **Experimental (ML)** | **HIGH** | **☑** |
| Preprint/unreviewed | LOW | ☐ |

**Assessment:**

<!-- EXAMPLE:
**Design:** Controlled experiment with multiple baselines
**Venue:** Peer-reviewed top-tier conference (ICLR 2023)
**Baseline:** HIGH (equivalent to RCT in clinical research)

Justification: ML experimental papers with proper controls and peer review start at HIGH in GRADE framework.
-->

### 2. Risk of Bias (Downgrade?)

| Bias Type | Risk Level | Impact on Rating |
|-----------|------------|------------------|
| Selection bias | LOW / MODERATE / HIGH | 0 / -1 / -2 |
| Performance bias | LOW / MODERATE / HIGH | 0 / -1 / -2 |
| Detection bias | LOW / MODERATE / HIGH | 0 / -1 / -2 |
| Attrition bias | LOW / MODERATE / HIGH | 0 / -1 / -2 |
| Reporting bias | LOW / MODERATE / HIGH | 0 / -1 / -2 |

**Assessment:**

<!-- EXAMPLE:
**Selection bias:** LOW
- Benchmarks are standard in field (HotpotQA, FEVER publicly available)
- Not cherry-picked; results reported for all attempted tasks

**Performance bias:** MODERATE
- Authors affiliated with OpenAI, tested on GPT models
- Possible optimization toward GPT behavior
- Mitigation: Would benefit from independent replication on other LLMs

**Detection bias:** LOW
- Evaluation metrics clearly defined and objective (success rate, accuracy)
- Not subjective assessment

**Attrition bias:** LOW
- All test cases processed (no selective exclusions mentioned)

**Reporting bias:** LOW
- Failures discussed (e.g., limited gains on some tasks)
- Code and data publicly available for verification

**Overall Risk of Bias:** LOW to MODERATE
**Downgrade:** -0 levels (minor concerns but no serious limitations)
-->

### 3. Inconsistency (Downgrade?)

| Consistency Check | Status | Impact |
|-------------------|--------|--------|
| Results consistent across tasks? | YES / NO / MIXED | 0 / -1 / -2 |
| Results align with prior work? | YES / NO / MIXED | 0 / -1 |
| Effect sizes consistent? | YES / NO / MIXED | 0 / -1 |

**Assessment:**

<!-- EXAMPLE:
**Consistency across tasks:** HIGH
- Improvements observed on all four benchmarks
- Effect sizes range 5-34% but all positive

**Consistency with prior work:** HIGH
- Builds logically on CoT (cited work)
- Extends rather than contradicts prior findings

**Effect size consistency:** MODERATE
- Varying magnitude across tasks (5% on ALFWorld, 34% on HotpotQA)
- Explainable by task characteristics (reasoning vs action-heavy)

**Overall Inconsistency:** LOW
**Downgrade:** -0 levels (results are consistent)
-->

### 4. Indirectness (Downgrade?)

| Indirectness Check | Status | Impact |
|--------------------|--------|--------|
| Population matches our target? | YES / NO / PARTIAL | 0 / -1 / -2 |
| Intervention matches our use? | YES / NO / PARTIAL | 0 / -1 / -2 |
| Outcomes match our needs? | YES / NO / PARTIAL | 0 / -1 |

**Assessment:**

<!-- EXAMPLE:
**Population (Tasks):** PARTIAL
- Paper tests: QA, fact-checking, interactive games, web shopping
- AIWG needs: SDLC workflows (requirements, architecture, testing)
- Overlap: Tool use, reasoning, multi-step processes
- Gap: No direct test of SDLC-specific tasks

**Intervention (Method):** YES
- Paper uses: Thought→Action→Observation loop
- AIWG uses: TAO loop (same structure)
- Match: High

**Outcomes:** PARTIAL
- Paper measures: Success rate, accuracy, efficiency
- AIWG needs: Artifact quality, iteration count, HITL rate
- Overlap: Task completion as success metric
- Gap: AIWG-specific quality dimensions not tested

**Overall Indirectness:** MODERATE
**Downgrade:** -0 levels (indirect but relevant; extrapolation reasonable)

Note: Would downgrade -1 if population gap was severe, but tool-use reasoning generalizes reasonably to SDLC.
-->

### 5. Imprecision (Downgrade?)

| Precision Check | Status | Impact |
|-----------------|--------|--------|
| Large sample size? | YES / NO | 0 / -1 |
| Narrow confidence intervals? | YES / NO / UNKNOWN | 0 / -1 / -1 |
| Statistical significance reported? | YES / NO | 0 / -1 |

**Assessment:**

<!-- EXAMPLE:
**Sample size:** YES
- 500 questions per benchmark (HotpotQA, FEVER)
- 134 tasks (ALFWorld), 251 tasks (WebShop)
- Adequate for reliable estimates

**Confidence intervals:** UNKNOWN
- No CIs reported (common in ML papers but suboptimal)
- No error bars or repeated trials
- Cannot assess precision statistically

**Statistical significance:** NO
- No p-values reported
- Cannot determine if differences are statistically significant vs random

**Overall Imprecision:** MODERATE
**Downgrade:** -0 levels (effect sizes large enough to be meaningful despite lack of statistical tests; common practice in ML)

Note: Would downgrade -1 if effect sizes were small AND no significance testing. Here effects are large (34% improvement).
-->

### 6. Publication Bias (Downgrade?)

| Bias Check | Status | Impact |
|------------|--------|--------|
| Preregistration? | YES / NO | N/A for ML |
| Negative results published? | YES / NO / UNKNOWN | 0 / -1 |
| File drawer problem likely? | YES / NO | 0 / -1 |

**Assessment:**

<!-- EXAMPLE:
**Preregistration:** N/A
- Not standard in ML research (more common in psychology, medicine)

**Negative results:** PARTIAL
- Authors report lower gains on some tasks (5% on ALFWorld vs 34% on HotpotQA)
- Some failure cases discussed
- No mention of abandoned experiments

**File drawer:** UNLIKELY
- Peer-reviewed venue with replication requirements
- Code and data public (enables verification)

**Overall Publication Bias:** LOW
**Downgrade:** -0 levels (no strong evidence of selective reporting)
-->

### 7. Large Effect Size (Upgrade?)

| Effect Check | Status | Impact |
|--------------|--------|--------|
| Large effect (>2x baseline)? | YES / NO | +1 / 0 |
| Very large effect (>5x baseline)? | YES / NO | +2 / 0 |

**Assessment:**

<!-- EXAMPLE:
**Effect magnitude:**
- HotpotQA: 49% → 66% (1.35x baseline, +34% relative)
- FEVER: Not specified in review
- Overall: Moderate to large effects, not >2x

**Large effect:** NO (1.35x < 2x threshold)
**Upgrade:** +0 levels (effects are meaningful but not exceptionally large)

Note: Would upgrade +1 if effect was >2x baseline (e.g., 49% → 98%).
-->

### 8. Dose-Response Gradient (Upgrade?)

| Gradient Check | Status | Impact |
|----------------|--------|--------|
| Clear dose-response? | YES / NO / N/A | +1 / 0 |

**Assessment:**

<!-- EXAMPLE:
**Dose-response applicability:** N/A
- Not applicable to this study (not a dose-response design)
- Would apply to studies testing varying "doses" of intervention (e.g., 1 vs 3 vs 5 iterations)

**Upgrade:** +0 levels (criterion not applicable)
-->

### 9. Confounders (Upgrade?)

| Confounder Check | Status | Impact |
|------------------|--------|--------|
| Plausible confounders? | YES / NO | 0 / +1 |
| Confounders would reduce effect? | YES / NO / N/A | 0 / +1 |

**Assessment:**

<!-- EXAMPLE:
**Plausible confounders:**
- Model size (GPT-3 vs GPT-4) could confound
- Task difficulty varies
- Prompt engineering quality could vary

**Confounders accounted for:** PARTIAL
- Same model used for baselines (controls for model size)
- Multiple tasks tested (controls for task-specific effects)
- Some confounding remains (e.g., prompt quality)

**Would confounders reduce observed effect?** UNLIKELY
- If anything, confounders might favor simpler baselines (easier to optimize)
- ReAct showing gains despite potential confounds is stronger evidence

**Upgrade:** +0 levels (no evidence confounders would strengthen effect)
-->

### GRADE Calculation

**Starting Point:** HIGH (peer-reviewed experimental study)

**Downgrades:**
- Risk of Bias: -0 (LOW to MODERATE, no serious issues)
- Inconsistency: -0 (results consistent)
- Indirectness: -0 (extrapolation reasonable)
- Imprecision: -0 (large effects compensate for lack of CIs)
- Publication Bias: -0 (no evidence of bias)

**Upgrades:**
- Large Effect: +0 (effects moderate, not >2x)
- Dose-Response: +0 (N/A)
- Confounders: +0 (none that would strengthen)

**Final GRADE Level:** HIGH

<!-- EXAMPLE:
**Calculation:**
HIGH (baseline) - 0 (downgrades) + 0 (upgrades) = HIGH

**Interpretation:**
We have HIGH confidence that the true effect is close to the estimate. Further research is unlikely to substantially change our confidence in this finding.
-->

</details>

## Phase 3: Applicability Analysis (ADVANCED)

<details>
<summary>Click to expand AIWG-specific applicability assessment</summary>

### Applicability to AIWG

**Overall Applicability:** HIGH | MODERATE | LOW

<!-- EXAMPLE: HIGH -->

**Rationale:**

<!-- EXAMPLE:
HIGH applicability because:
1. Core pattern (TAO loop) directly maps to AIWG agent design
2. Tool use context aligns with AIWG tool-using agents (Read, Write, Bash, Grep)
3. Multi-step reasoning required in SDLC tasks (same as QA tasks)
4. Observation grounding reduces hallucinations (critical for AIWG citation policy)

Caveats:
- Not tested on SDLC-specific tasks (requirements, architecture, code review)
- Longer iteration counts in AIWG (Ralph 10+ iterations vs paper 3-5)
- Multi-agent coordination not addressed (AIWG orchestrator needs)
-->

### Implementation Confidence

| AIWG Component | Confidence | Rationale |
|----------------|------------|-----------|
| [Component 1] | HIGH / MODERATE / LOW | [Why this confidence level] |
| [Component 2] | HIGH / MODERATE / LOW | [Why this confidence level] |

<!-- EXAMPLE:
| AIWG Component | Confidence | Rationale |
| TAO loop structure | HIGH | Direct pattern match, well-validated across tasks |
| Thought types | MODERATE | Extrapolation from paper's example traces |
| Tool grounding | HIGH | Hallucination reduction demonstrated clearly |
| Multi-iteration (Ralph) | MODERATE | Paper tests 3-5 iterations, Ralph runs 10+; scale effects unknown |
| Multi-agent coordination | LOW | Not addressed in paper; separate research needed |
-->

### Evidence Gaps for AIWG

**Gap 1:** [Specific AIWG use case not covered by research]

<!-- EXAMPLE:
**Gap 1:** Long-running agent sessions (10+ iterations)
Paper tests: 3-5 TAO iterations per task
AIWG needs: Ralph loops run 10+ iterations on complex tasks
Gap: Unknown if reasoning quality degrades, if observation grounding remains effective

Action: Monitor Ralph loop quality metrics; conduct pilot study if degradation observed
-->

**Gap 2:** [Another AIWG-specific gap]

<!-- EXAMPLE:
**Gap 2:** SDLC-specific tasks (requirements, architecture)
Paper tests: QA, fact-checking, interactive games
AIWG needs: Requirements elicitation, architectural decision-making
Gap: Unclear if TAO loop benefits generalize to less well-defined tasks

Action: Implement with monitoring; collect quality data from AIWG dogfooding
-->

### Recommendations

**For implementation:**

<!-- EXAMPLE:
1. IMPLEMENT: TAO loop structure in all tool-using agents (HIGH confidence)
2. IMPLEMENT: Tool observation grounding for all factual claims (HIGH confidence)
3. PILOT: Thought type taxonomy (MODERATE confidence; adapt based on AIWG needs)
4. MONITOR: Quality in 10+ iteration Ralph loops (MODERATE confidence; watch for degradation)
5. DEFER: Multi-agent TAO coordination (LOW confidence; needs separate research)
-->

**For monitoring:**

<!-- EXAMPLE:
Track these metrics to validate applicability:
- Agent success rate on SDLC tasks (does TAO loop improve performance?)
- Hallucination rate (does observation grounding reduce fabrications?)
- Iteration efficiency (do longer Ralph loops maintain quality?)
- Human escalation rate (are agents self-sufficient with TAO loop?)

Revalidation trigger: If any metric degrades >20% from baseline, investigate and potentially revise approach.
-->

**For future research:**

<!-- EXAMPLE:
Research needs revealed by applicability analysis:
1. TAO loop effectiveness on SDLC tasks (pilot study)
2. Long-iteration agent sessions (10+ TAO iterations)
3. Multi-agent TAO coordination patterns
4. Thought type taxonomy for SDLC domains

Priority: #1 and #2 (directly affect AIWG production use)
-->

</details>

## Quality Summary Table

| GRADE Criterion | Assessment | Impact | Notes |
|-----------------|------------|--------|-------|
| **Baseline (Study Design)** | HIGH | Starting point | Peer-reviewed experimental |
| Risk of Bias | LOW-MODERATE | -0 | Minor concerns (OpenAI affiliation) |
| Inconsistency | LOW | -0 | Results consistent |
| Indirectness | MODERATE | -0 | Extrapolation reasonable |
| Imprecision | MODERATE | -0 | Large effects compensate |
| Publication Bias | LOW | -0 | No evidence of selective reporting |
| Large Effect | NO | +0 | 1.35x not >2x threshold |
| Dose-Response | N/A | +0 | Not applicable |
| Confounders | UNLIKELY | +0 | None that strengthen effect |
| **Final GRADE** | **HIGH** | **HIGH** | **High confidence in findings** |

## References

- @.aiwg/research/sources/[PDF-filename].pdf - Original paper
- @.aiwg/research/findings/REF-XXX.md - Literature note
- @.claude/rules/citation-policy.md - GRADE-based citation language
- @.claude/rules/research-metadata.md - Baseline quality by source type
- @agentic/code/frameworks/research-complete/schemas/grade-schema.yaml - GRADE assessment schema

## Template Usage Notes

**When to perform GRADE assessment:**
- When adding paper to corpus
- Before citing paper in implementation decisions
- When updating quality assessments (annually)
- Before recommending paper as "definitive" on topic

**Assessment approach:**
1. Determine baseline quality (publication venue)
2. Evaluate each GRADE criterion systematically
3. Apply downgrades/upgrades per framework
4. Calculate final GRADE level
5. Assess AIWG-specific applicability
6. Document confidence and gaps

**Common pitfalls:**
- Conflating quality with relevance (HIGH quality ≠ HIGH relevance)
- Ignoring indirect evidence (extrapolation often reasonable)
- Over-penalizing for missing statistical tests (common in ML)
- Not documenting applicability gaps

**GRADE levels in citation language:**
- HIGH: "demonstrates", "shows", "establishes"
- MODERATE: "suggests", "indicates", "supports"
- LOW: "limited evidence", "preliminary findings"
- VERY LOW: "anecdotal", "exploratory"

Per @.claude/rules/citation-policy.md

## Metadata

- **Template Type:** research-quality-assessment
- **Framework:** research-complete
- **Primary Agent:** @agentic/code/frameworks/research-complete/agents/quality-agent.md
- **Related Templates:**
  - @agentic/code/frameworks/research-complete/templates/literature-note.md
  - @agentic/code/frameworks/research-complete/templates/extraction.yaml
- **Version:** 1.0.0
- **Last Updated:** 2026-02-03
