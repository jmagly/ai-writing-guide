---
name: brand-audit
description: Conduct comprehensive brand health audit across all touchpoints
arguments:
  - name: audit-scope
    description: Scope of audit (full, visual, verbal, touchpoints)
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

## Usage Examples

```bash
# Full brand audit
/brand-audit --audit-scope full

# Visual identity only
/brand-audit --audit-scope visual

# Specific touchpoints
/brand-audit --audit-scope touchpoints
```

## Success Criteria

- [ ] All brand elements audited
- [ ] Touchpoints reviewed
- [ ] Compliance scored
- [ ] Gaps identified
- [ ] Recommendations prioritized
- [ ] Action plan created
