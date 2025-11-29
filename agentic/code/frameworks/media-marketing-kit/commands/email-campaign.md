---
name: email-campaign
description: Create comprehensive email marketing campaign with content and automation
arguments:
  - name: campaign-name
    description: Name of the email campaign
    required: true
  - name: campaign-type
    description: Type of campaign (nurture, promotional, announcement, automated)
    required: false
  - name: project-directory
    description: Project directory path (default current directory)
    required: false
---

# Email Campaign Command

Create comprehensive email marketing campaign with strategy, content, and automation planning.

## What This Command Does

1. **Develops Email Strategy**
   - Campaign objectives
   - Audience segmentation
   - Email sequence planning

2. **Creates Email Content**
   - Subject lines and preview text
   - Email body copy
   - CTA strategy

3. **Plans Technical Setup**
   - Automation workflow
   - Personalization strategy
   - Testing plan

## Orchestration Flow

```
Email Campaign Request
        ↓
[Email Marketer] → Campaign Strategy & Sequence
        ↓
[Copywriter] → Email Copy & Subject Lines
        ↓
[Graphic Designer] → Email Design Direction
        ↓
[Legal Reviewer] → CAN-SPAM Compliance
        ↓
[Quality Controller] → Email QC Checklist
        ↓
[Accessibility Checker] → Email Accessibility
        ↓
Email Campaign Package Complete
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Email Marketer | Strategy lead | Sequence, automation |
| Copywriter | Content | Copy, subject lines |
| Graphic Designer | Design | Visual direction |
| Legal Reviewer | Compliance | Legal review |
| Quality Controller | QC | Pre-send checklist |
| Accessibility Checker | Accessibility | Email accessibility |

## Campaign Types

| Type | Description | Typical Sequence |
|------|-------------|------------------|
| Nurture | Lead nurturing series | 5-7 emails over 2-4 weeks |
| Promotional | Sales/offer campaign | 2-3 emails over 1 week |
| Announcement | News/launch | 1-2 emails |
| Automated | Trigger-based | Varies by trigger |

## Output Artifacts

Saved to `.aiwg/marketing/email/{campaign-name}/`:

- `email-strategy.md` - Campaign strategy
- `email-sequence.md` - Email sequence plan
- `emails/` - Individual email content
  - `email-1.md`
  - `email-2.md`
  - etc.
- `subject-lines.md` - Subject line options
- `automation-flow.md` - Automation workflow
- `testing-plan.md` - A/B testing strategy
- `compliance-checklist.md` - Legal compliance

## Usage Examples

```bash
# Nurture sequence
/email-campaign "New Subscriber Welcome" --campaign-type nurture

# Promotional campaign
/email-campaign "Black Friday Sale" --campaign-type promotional

# Product announcement
/email-campaign "Feature Launch" --campaign-type announcement
```

## Success Criteria

- [ ] Campaign strategy defined
- [ ] Email sequence planned
- [ ] All email copy drafted
- [ ] Subject lines created with A/B variants
- [ ] Automation workflow documented
- [ ] Legal compliance verified
- [ ] QC checklist completed
- [ ] Accessibility reviewed
