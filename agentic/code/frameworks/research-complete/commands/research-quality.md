---
description: Assess source quality using GRADE methodology
category: research-quality
argument-hint: "[REF-XXX] [--update-frontmatter] [--output yaml|markdown]"
---

# Research Quality Command

Perform systematic GRADE evidence quality assessment on research sources.

## Instructions

When invoked, perform rigorous quality assessment:

1. **Load Source**
   - Accept REF-XXX identifier or file path
   - Load PDF and finding document
   - Extract frontmatter metadata
   - Determine source type and baseline quality

2. **Apply GRADE Framework**

   **Baseline Quality** (by source type):
   - Systematic review / Meta-analysis → HIGH
   - Randomized controlled trial → HIGH
   - Cohort study → MODERATE
   - Case-control study → MODERATE
   - Case series → LOW
   - Expert opinion → LOW
   - Preprint / Blog post → VERY LOW

   **Downgrade Factors** (each -1 level):
   - Risk of bias (study design flaws, conflicts of interest)
   - Inconsistency (conflicting results across studies)
   - Indirectness (different population, indirect comparisons)
   - Imprecision (small sample size, wide confidence intervals)
   - Publication bias (selective reporting)

   **Upgrade Factors** (each +1 level):
   - Large effect size (strong effect, dose-response relationship)
   - Confounding works against finding (makes result conservative)
   - Dose-response gradient present

3. **Calculate Final GRADE**
   ```
   Final GRADE = Baseline + Upgrades - Downgrades

   HIGH:      Strong confidence, unlikely to change with new evidence
   MODERATE:  Moderate confidence, may change with new evidence
   LOW:       Limited confidence, likely to change with new evidence
   VERY LOW:  Very uncertain, any estimate is very uncertain
   ```

4. **Generate Assessment Report**
   - Document baseline quality
   - List all downgrade/upgrade factors with justification
   - Calculate final GRADE level
   - Provide hedging language recommendations
   - Assess AIWG applicability

5. **Save Assessment**
   - Save to `.aiwg/research/quality-assessments/REF-XXX-assessment.yaml`
   - Update frontmatter in finding document if --update-frontmatter
   - Log in quality assessment index

6. **Check Existing Citations**
   - If --check-citations, scan corpus for citations of this source
   - Flag any violations (overclaiming beyond GRADE level)
   - Generate remediation suggestions

## Arguments

- `[ref-id or file-path]` - Source to assess (required)
- `--output [yaml|markdown]` - Output format (default: yaml)
- `--update-frontmatter` - Update finding document frontmatter with assessment
- `--check-citations` - Scan corpus for citation policy violations
- `--interactive` - Interactive assessment with prompts for each factor

## Examples

```bash
# Basic quality assessment
/research-quality REF-022

# Assessment with frontmatter update
/research-quality REF-022 --update-frontmatter

# Interactive assessment
/research-quality REF-022 --interactive

# Assessment with citation check
/research-quality REF-022 --check-citations --output markdown
```

## Expected Output

```
Assessing Quality: REF-022 - AutoGen
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Determining baseline
  Source Type: arXiv preprint (later published in conference)
  Baseline Quality: MODERATE (conference paper)
  Note: Upgraded from VERY LOW due to peer review

Step 2: Applying GRADE framework

  Downgrade Factors:
    [✓] Risk of Bias: -0 (no significant bias detected)
        - Study design appropriate
        - No apparent conflicts of interest
        - Methodology clearly described

    [✓] Inconsistency: -0 (single study, no comparison)
        - No conflicting results to evaluate

    [!] Indirectness: -0 (directly applicable)
        - Population: Software development teams
        - Intervention: Multi-agent conversation framework
        - Direct relevance to AIWG agent orchestration

    [!] Imprecision: -1 (limited evaluation scope)
        - Small benchmark dataset
        - Limited real-world validation
        - No confidence intervals reported

    [✓] Publication Bias: -0 (mitigated)
        - Open preprint, full methodology disclosed
        - Negative results discussed

  Upgrade Factors:
    [!] Large Effect: +0 (moderate effect size)
        - Improvements shown but not exceptionally large
        - Effect sizes: 10-30% improvement range

    [✓] Dose-Response: +0 (not applicable)
        - No dose-response relationship to evaluate

    [✓] Confounding: +0 (no clear confounding against)

Step 3: Calculating final GRADE
  Baseline: MODERATE
  Downgrades: -1 (imprecision)
  Upgrades: +0
  ─────────────────────────
  Final GRADE: LOW

Step 4: Generating assessment report
  ✓ Assessment saved: .aiwg/research/quality-assessments/REF-022-assessment.yaml
  ✓ Frontmatter updated in finding document
  ✓ Quality index updated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GRADE Assessment: LOW
Confidence: Limited confidence in effect estimates

Appropriate Hedging Language:
  ✓ USE: "Limited evidence suggests...", "Preliminary findings indicate..."
  ✗ AVOID: "Research demonstrates...", "Evidence proves..."

Rationale:
  While AutoGen shows promising multi-agent collaboration patterns,
  the evidence base is limited to a single study with small-scale
  evaluation. Real-world effectiveness at scale requires further
  investigation.

AIWG Applicability:
  - Patterns are directly applicable to agent orchestration (HIGH)
  - Implementation risk is moderate due to limited production validation
  - Recommend: Pilot implementation with monitoring

Next Steps:
  1. Monitor for follow-up studies strengthening evidence base
  2. Plan validation studies within AIWG context
  3. Review citations of REF-022 in corpus: /research-quality REF-022 --check-citations
```

## Assessment YAML Output

```yaml
# .aiwg/research/quality-assessments/REF-022-assessment.yaml
ref_id: REF-022
assessment_date: "2026-02-03"
assessor: "quality-agent"

source_metadata:
  title: "AutoGen: Enabling Next-Gen LLM Applications..."
  source_type: peer_reviewed_conference
  year: 2023

grade_assessment:
  baseline: MODERATE
  baseline_rationale: "Peer-reviewed conference paper"

  downgrade_factors:
    - factor: imprecision
      severity: -1
      rationale: "Limited evaluation scope, small benchmarks"

  upgrade_factors: []

  final_grade: LOW
  confidence_statement: "Limited confidence in effect estimates"

hedging_language:
  appropriate:
    - "Limited evidence suggests"
    - "Preliminary findings indicate"
    - "Initial research shows"

  inappropriate:
    - "Research demonstrates"
    - "Evidence proves"
    - "Studies conclusively show"

aiwg_applicability:
  relevance: HIGH
  implementation_risk: MODERATE
  recommendation: "Pilot implementation with validation"

citation_guidance:
  template: |
    Research provides preliminary evidence for [claim]
    (@.aiwg/research/findings/REF-022-autogen.md), though
    broader validation is needed (GRADE: LOW).
```

## Citation Policy Integration

When --check-citations is used:

```
Checking citations of REF-022 across corpus...

Found 8 citations:

✓ COMPLIANT (5):
  - .aiwg/architecture/agent-orchestration-sad.md:142
    "Research suggests flexible conversation patterns..."
    Hedging: APPROPRIATE for LOW quality

  - .aiwg/requirements/UC-174-conversable-agent.md:23
    "Evidence indicates multi-agent collaboration is feasible..."
    Hedging: APPROPRIATE for LOW quality

✗ VIOLATIONS (3):
  - docs/agent-framework.md:78
    "Research demonstrates significant improvements..."
    Hedging: TOO STRONG for LOW quality
    Suggestion: Change to "Limited evidence suggests..."

  - .aiwg/architecture/adr-012-agent-protocol.md:45
    "Studies prove that conversation patterns enable..."
    Hedging: TOO STRONG for LOW quality
    Suggestion: Change to "Preliminary findings indicate..."

Remediation script generated:
  .aiwg/research/quality-assessments/REF-022-violations.sh
```

## Interactive Mode

When --interactive is used, prompts for each factor:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRADE Assessment: REF-022 (Interactive Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Baseline Quality: MODERATE (conference paper)

────────────────────────────────────────────────────────────────────
Factor 1: Risk of Bias
────────────────────────────────────────────────────────────────────
Evaluate study design quality, conflicts of interest, methodology clarity.

Downgrade by 1 level? [y/N]: n
Rationale: Study design appropriate, no COI detected

────────────────────────────────────────────────────────────────────
Factor 2: Inconsistency
────────────────────────────────────────────────────────────────────
Evaluate consistency across studies (if multiple).

Downgrade by 1 level? [y/N]: n
Rationale: Single study, no comparison available

[... continues for all factors ...]
```

## References

- @agentic/code/frameworks/research-complete/agents/quality-agent.md - Quality Assessment Agent
- @src/research/services/quality-service.ts - GRADE implementation
- @.aiwg/research/docs/grade-assessment-guide.md - GRADE methodology
- @agentic/code/frameworks/sdlc-complete/schemas/research/quality-dimensions.yaml - Quality schema
- @.claude/rules/citation-policy.md - Hedging language requirements
