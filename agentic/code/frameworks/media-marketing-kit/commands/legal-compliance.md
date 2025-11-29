---
name: legal-compliance
description: Conduct legal and regulatory compliance review of marketing materials
arguments:
  - name: material-path
    description: Path to materials or campaign to review
    required: true
  - name: compliance-areas
    description: Areas to check (advertising, privacy, promotions, all)
    required: false
  - name: project-directory
    description: Project directory path (default current directory)
    required: false
---

# Legal Compliance Command

Conduct comprehensive legal and regulatory compliance review of marketing materials.

## What This Command Does

1. **Reviews Compliance Areas**
   - Advertising claims
   - Privacy and data
   - Promotions and contests
   - Industry regulations

2. **Documents Findings**
   - Compliance checklist
   - Issues and risk levels
   - Required corrections

3. **Provides Guidance**
   - Remediation steps
   - Disclaimer templates
   - Best practices

## Orchestration Flow

```
Legal Compliance Request
        ↓
[Legal Reviewer] → Advertising Claims Review
        ↓
[Legal Reviewer] → Privacy Compliance
        ↓
[Legal Reviewer] → Promotional Compliance
        ↓
[Brand Guardian] → Brand/IP Review
        ↓
[Accessibility Checker] → ADA Compliance
        ↓
Compliance Report & Recommendations
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Legal Reviewer | Lead compliance | Legal review |
| Brand Guardian | IP/trademark | Brand compliance |
| Accessibility Checker | ADA | Accessibility |

## Compliance Areas

| Area | Key Checks |
|------|------------|
| Advertising | Claims substantiation, FTC compliance |
| Privacy | GDPR, CCPA, CAN-SPAM |
| Promotions | Official rules, state requirements |
| Industry | Sector-specific regulations |
| Accessibility | ADA, WCAG compliance |

## Output Artifacts

Saved to `.aiwg/marketing/compliance/`:

- `compliance-review.md` - Full review report
- `issues-log.md` - Issues with severity
- `remediation-guide.md` - Fix instructions
- `disclaimer-templates.md` - Required disclaimers
- `approval-checklist.md` - Sign-off checklist

## Usage Examples

```bash
# Full compliance review
/legal-compliance "campaign-materials/" --compliance-areas all

# Advertising claims focus
/legal-compliance "ad-copy.md" --compliance-areas advertising

# Promotional compliance
/legal-compliance "contest-rules.md" --compliance-areas promotions
```

## Success Criteria

- [ ] All applicable regulations identified
- [ ] Materials reviewed against requirements
- [ ] Issues documented with severity
- [ ] Remediation guidance provided
- [ ] Required disclaimers identified
- [ ] Sign-off obtained
