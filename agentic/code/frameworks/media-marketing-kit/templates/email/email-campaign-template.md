# Email Campaign Brief

**Card ID**: `EML-{PROJECT}-{NNNN}`
**Version**: 1.0
**Status**: Draft | In Review | Approved | Sent | Archived
**Campaign**: {CAMPAIGN_NAME}
**Owner**: {OWNER_NAME}

---

## Campaign Overview

### Objective

{Primary goal of this email campaign}

### Target Audience

| Segment | Size | Criteria |
|---------|------|----------|
| {Segment name} | {Count} | {Defining criteria} |

### Success Metrics

| Metric | Target | Benchmark |
|--------|--------|-----------|
| Open rate | {%} | {Industry avg} |
| Click rate | {%} | {Industry avg} |
| Conversion rate | {%} | {Historical} |
| Unsubscribe rate | < {%} | {Historical} |
| Revenue | ${Amount} | {Goal} |

---

## Campaign Structure

### Email Sequence

| # | Email Type | Subject | Send Timing | Segment |
|---|------------|---------|-------------|---------|
| 1 | {Type} | {Subject line} | {Date/trigger} | {Audience} |
| 2 | {Type} | {Subject line} | {Date/trigger} | {Audience} |
| 3 | {Type} | {Subject line} | {Date/trigger} | {Audience} |

### Suppression Rules

- [ ] Recent purchasers (last {X} days)
- [ ] Recent email recipients (last {X} days)
- [ ] Hard bounces
- [ ] Unsubscribed
- [ ] {Custom suppression}

---

## Email Details

### Email 1: {Name}

**Send details**:
| Field | Value |
|-------|-------|
| From name | {Name} |
| From email | {email@domain.com} |
| Reply-to | {email@domain.com} |
| Subject | {Subject line} |
| Preheader | {Preview text - 85-100 chars} |

**Content structure**:
| Section | Content | CTA |
|---------|---------|-----|
| Hero | {Description} | {Button text} |
| Body 1 | {Description} | {Link/button} |
| Body 2 | {Description} | {Link/button} |
| Footer | {Standard footer} | {Unsubscribe} |

**A/B Testing**:
| Element | Variant A | Variant B | Split |
|---------|-----------|-----------|-------|
| {Subject/content/CTA} | {Version} | {Version} | {%/%} |

---

## Content Requirements

### Subject Line Options

| Option | Character Count | Personalization |
|--------|-----------------|-----------------|
| {Subject 1} | {Count} | {Yes/No} |
| {Subject 2} | {Count} | {Yes/No} |
| {Subject 3} | {Count} | {Yes/No} |

### Body Copy

**Headline**: {Main headline}

**Body**:
```
{Email body copy}
```

**CTA Button**: {Button text}
**CTA Link**: {URL with UTMs}

### Personalization Tokens

| Token | Fallback | Usage |
|-------|----------|-------|
| {{first_name}} | {Friend/Valued Customer} | Greeting |
| {{company}} | {Your company} | Body copy |
| {{custom_field}} | {Fallback} | {Usage} |

---

## Design Specifications

### Template

- Template name: {Template ID/name}
- Layout: {Single column/Multi-column}
- Mobile responsive: Yes

### Visual Assets

| Asset | Specs | Status | Location |
|-------|-------|--------|----------|
| Hero image | {WxH}px | Ready/Pending | {Link} |
| Product images | {WxH}px | Ready/Pending | {Link} |
| Logo | {WxH}px | Ready/Pending | {Link} |
| Icons | {WxH}px | Ready/Pending | {Link} |

### Brand Guidelines

- Primary color: {#HEX}
- Secondary color: {#HEX}
- Font: {Font name}
- Button style: {Rounded/Square/Pill}

---

## Technical Requirements

### Links & Tracking

| Link | Destination | UTM Parameters |
|------|-------------|----------------|
| Hero CTA | {URL} | utm_source=email&utm_medium={type}&utm_campaign={name} |
| Secondary CTA | {URL} | {UTMs} |
| Footer links | {URLs} | {UTMs} |

### Dynamic Content

| Rule | Condition | Content Shown |
|------|-----------|---------------|
| {Rule name} | {If condition} | {Show content} |
| {Rule name} | {Else if} | {Show content} |
| {Rule name} | {Default} | {Show content} |

### Accessibility

- [ ] Alt text on all images
- [ ] Minimum 14px font size
- [ ] Sufficient color contrast (4.5:1)
- [ ] Descriptive link text (not "click here")
- [ ] Logical reading order

---

## Compliance

### CAN-SPAM Requirements

- [ ] Valid physical mailing address included
- [ ] Clear unsubscribe link
- [ ] Accurate sender information
- [ ] Subject line matches content
- [ ] Honor unsubscribes within 10 days

### GDPR/CCPA

- [ ] Consent properly obtained
- [ ] Easy preference center access
- [ ] Data privacy link included
- [ ] Legitimate basis documented

### Industry-Specific

- [ ] {Industry regulation} compliance
- [ ] Required disclaimers included
- [ ] Legal review completed

---

## Send Schedule

### Timing

| Detail | Value |
|--------|-------|
| Send date | {Date} |
| Send time | {Time with timezone} |
| Timezone optimization | Yes/No |
| Send throttling | {Rate per hour} |

### Trigger Rules (if applicable)

| Trigger | Delay | Conditions |
|---------|-------|------------|
| {Event} | {Time} | {Filters} |

---

## Quality Assurance

### Testing Checklist

**Pre-send testing**:
- [ ] Spelling and grammar check
- [ ] All links working and tracked
- [ ] Personalization tokens rendering
- [ ] Images loading (and alt text shows)
- [ ] Mobile preview reviewed
- [ ] Dark mode preview reviewed
- [ ] Plain text version reviewed
- [ ] Suppression logic verified
- [ ] Spam score checked (< 5)

**Email clients tested**:
- [ ] Gmail (web and mobile)
- [ ] Apple Mail (iOS and macOS)
- [ ] Outlook (desktop and web)
- [ ] Yahoo Mail
- [ ] {Others}

### Seed List Recipients

| Name | Email | Purpose |
|------|-------|---------|
| {Name} | {Email} | Final approval |
| {Name} | {Email} | Rendering test |

---

## Approval Workflow

| Stage | Approver | Status | Date |
|-------|----------|--------|------|
| Copy review | {Name} | Pending/Approved | |
| Design review | {Name} | Pending/Approved | |
| Legal review | {Name} | Pending/Approved | |
| Final approval | {Name} | Pending/Approved | |

---

## Post-Send Analysis

### Metrics Tracking

| Metric | 24 hr | 48 hr | 7 day | Final |
|--------|-------|-------|-------|-------|
| Sent | | | | |
| Delivered | | | | |
| Open rate | | | | |
| Click rate | | | | |
| Conversion | | | | |
| Unsubscribes | | | | |
| Bounces | | | | |
| Spam complaints | | | | |

### Learnings

**What worked**:
- {Learning}

**What didn't**:
- {Learning}

**Recommendations**:
- {Recommendation}

---

## Related Assets

| Asset | Link |
|-------|------|
| HTML file | {Link} |
| Design file | {Link} |
| Copy document | {Link} |
| Asset folder | {Link} |

---

*Template version: 1.0 | MMK Framework*
