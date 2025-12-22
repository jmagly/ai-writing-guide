---
name: legal-compliance
description: Conduct legal and regulatory compliance review of marketing materials
model: claude-sonnet-4-5-20250929
tools: ["Read","LS","Grep","Glob","Edit","Create","Execute","Task","TodoWrite","WebSearch","FetchUrl"]
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

## Parameter Handling

### --guidance Parameter

**Purpose**: Provide upfront direction to tailor priorities and approach

**Examples**:
```bash
--guidance "FTC disclosure review for influencer content"
--guidance "GDPR compliance for EU campaign"
--guidance "Healthcare claims review, FDA considerations"
```

**How Applied**:
- Parse guidance for keywords: priority, timeline, audience, focus, constraints
- Adjust agent emphasis and output depth based on stated priorities
- Modify deliverable order based on timeline constraints
- Influence scope and detail level based on context

### --interactive Parameter

**Purpose**: Guide through discovery questions for comprehensive input

**Questions Asked** (if --interactive):
1. What type of content is being reviewed?
2. What jurisdictions apply?
3. Are there industry-specific regulations?
4. What is the review deadline?
5. Are there specific claims of concern?

## Usage Examples

```bash
# Full compliance review
/legal-compliance "campaign-materials/" --compliance-areas all

# Advertising claims focus
/legal-compliance "ad-copy.md" --compliance-areas advertising

# Promotional compliance
/legal-compliance "contest-rules.md" --compliance-areas promotions

# With strategic guidance
/legal-compliance "Example" --guidance "Your specific context here"

# Interactive mode
/legal-compliance "Example" --interactive
```

## Success Criteria

- [ ] All applicable regulations identified
- [ ] Materials reviewed against requirements
- [ ] Issues documented with severity
- [ ] Remediation guidance provided
- [ ] Required disclaimers identified
- [ ] Sign-off obtained