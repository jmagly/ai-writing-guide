---
name: brand-audit
description: Conduct comprehensive brand health audit across all touchpoints
argument-hint: "[--audit-scope value] [--project-directory value] [--guidance "text"] [--interactive]"
arguments:
  - name: audit-scope
    description: Scope of audit (full, visual, verbal, touchpoints)
    required: false
  - name: guidance
    description: Strategic guidance to tailor priorities and approach
    required: false
  - name: interactive
    description: Enable interactive mode with discovery questions
    required: false

  - name: project-directory
    description: Project directory path (default current directory)
    required: false
---

# Brand Audit Command

Conduct comprehensive brand health audit across all marketing touchpoints and materials.

## What This Command Does

1. **Audits Brand Identity**
   - Visual identity consistency
   - Verbal identity alignment
   - Brand guideline compliance

2. **Reviews Touchpoints**
   - Digital presence
   - Marketing materials
   - Customer communications

3. **Provides Recommendations**
   - Compliance gaps
   - Brand evolution opportunities
   - Action priorities

## Orchestration Flow

```
Brand Audit Request
        ↓
[Brand Guardian] → Visual Identity Audit
        ↓
[Brand Guardian] → Verbal Identity Audit
        ↓
[Positioning Specialist] → Positioning Review
        ↓
[Quality Controller] → Touchpoint Review
        ↓
[Marketing Analyst] → Brand Metrics
        ↓
[Reporting Specialist] → Audit Report
        ↓
Brand Audit Complete
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Brand Guardian | Lead audit | Compliance review |
| Positioning Specialist | Positioning | Positioning analysis |
| Quality Controller | Quality | Touchpoint review |
| Marketing Analyst | Metrics | Brand health data |
| Reporting Specialist | Reporting | Audit report |

## Audit Areas

| Area | Key Checks |
|------|------------|
| Visual | Logo, colors, typography, imagery |
| Verbal | Voice, tone, messaging, taglines |
| Digital | Website, social, email, ads |
| Print | Collateral, signage, packaging |
| Experience | Customer touchpoints |

## Output Artifacts

Saved to `.aiwg/marketing/brand/audit/`:

- `brand-audit-report.md` - Comprehensive audit
- `visual-audit.md` - Visual identity review
- `verbal-audit.md` - Verbal identity review
- `touchpoint-matrix.md` - All touchpoints
- `compliance-scorecard.md` - Compliance scores
- `gap-analysis.md` - Identified gaps
- `recommendations.md` - Action plan
- `brand-health-metrics.md` - Brand health data

## Parameter Handling

### --guidance Parameter

**Purpose**: Provide upfront direction to tailor priorities and approach

**Examples**:
```bash
--guidance "Comprehensive audit before rebrand"
--guidance "Focus on digital touchpoints"
--guidance "Competitive comparison with top 3 competitors"
```

**How Applied**:
- Parse guidance for keywords: priority, timeline, audience, focus, constraints
- Adjust agent emphasis and output depth based on stated priorities
- Modify deliverable order based on timeline constraints
- Influence scope and detail level based on context

### --interactive Parameter

**Purpose**: Guide through discovery questions for comprehensive input

**Questions Asked** (if --interactive):
1. What is the scope of the audit?
2. Are there specific touchpoints to prioritize?
3. What triggered this audit?
4. What comparisons should be included?
5. What is the timeline for completion?

## Usage Examples

```bash
# Full brand audit
/brand-audit --audit-scope full

# Visual identity only
/brand-audit --audit-scope visual

# Specific touchpoints
/brand-audit --audit-scope touchpoints

# With strategic guidance
/brand-audit "Example" --guidance "Your specific context here"

# Interactive mode
/brand-audit "Example" --interactive
```

## Success Criteria

- [ ] All brand elements audited
- [ ] Touchpoints reviewed
- [ ] Compliance scored
- [ ] Gaps identified
- [ ] Recommendations prioritized
- [ ] Action plan created
