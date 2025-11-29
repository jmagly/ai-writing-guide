---
name: brand-review
description: Conduct brand compliance review of marketing materials
arguments:
  - name: asset-path
    description: Path to asset or asset description to review
    required: true
  - name: review-type
    description: Type of review (quick, comprehensive, pre-launch)
    required: false
  - name: project-directory
    description: Project directory path (default current directory)
    required: false
---

# Brand Review Command

Conduct thorough brand compliance review of marketing materials.

## What This Command Does

1. **Reviews Brand Elements**
   - Logo usage and placement
   - Color palette compliance
   - Typography adherence
   - Visual style consistency

2. **Evaluates Messaging**
   - Voice and tone alignment
   - Key message accuracy
   - Value proposition clarity

3. **Documents Findings**
   - Compliance checklist
   - Issues and severity
   - Remediation guidance

## Orchestration Flow

```
Brand Review Request
        ↓
[Brand Guardian] → Visual Identity Review
        ↓
[Brand Guardian] → Verbal Identity Review
        ↓
[Legal Reviewer] → Claims & Compliance
        ↓
[Quality Controller] → Technical Specs
        ↓
[Accessibility Checker] → Accessibility Compliance
        ↓
Consolidated Brand Review Report
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Brand Guardian | Brand compliance | Visual/verbal review |
| Legal Reviewer | Legal compliance | Claims validation |
| Quality Controller | Quality check | Technical specs |
| Accessibility Checker | Accessibility | WCAG compliance |

## Review Types

| Type | Scope | Timeline |
|------|-------|----------|
| Quick | Logo, colors, major elements | Same day |
| Comprehensive | All brand elements, messaging | 1-2 days |
| Pre-launch | Full review + legal + accessibility | 3-5 days |

## Output Artifacts

Saved to `.aiwg/marketing/reviews/brand/`:

- `{asset}-brand-review.md` - Brand compliance report
- `{asset}-issues.md` - Issues with remediation guidance
- `{asset}-approval.md` - Approval status and sign-off

## Usage Examples

```bash
# Quick brand review
/brand-review "homepage-banner.md"

# Comprehensive review
/brand-review "email-campaign/" --review-type comprehensive

# Pre-launch review
/brand-review "product-launch-assets/" --review-type pre-launch
```

## Success Criteria

- [ ] All brand elements reviewed
- [ ] Issues documented with severity
- [ ] Remediation guidance provided
- [ ] Approval/rejection decision made
- [ ] Sign-off documented
