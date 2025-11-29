# Nurture Sequence Brief

**Card ID**: `EML-{PROJECT}-{NNNN}`
**Version**: 1.0
**Status**: Draft | Active | Paused | Archived
**Sequence Name**: {SEQUENCE_NAME}
**Owner**: {OWNER_NAME}

---

## Sequence Overview

### Objective

{What this nurture sequence aims to achieve}

### Entry Criteria

| Trigger | Source | Conditions |
|---------|--------|------------|
| {Form submission} | {Landing page} | {Field criteria} |
| {Behavior trigger} | {Page visit, download} | {Frequency/recency} |
| {List addition} | {Import, integration} | {Segment criteria} |

### Exit Criteria

| Condition | Action |
|-----------|--------|
| Conversion (purchase/demo) | Exit sequence |
| Unsubscribe | Exit sequence |
| Hard bounce | Exit sequence |
| Completed sequence | Move to next stage |
| {Custom exit} | {Action} |

### Target Audience

| Segment | Description | Size |
|---------|-------------|------|
| {Segment} | {Defining criteria} | {Est. count} |

---

## Sequence Goals

### Primary Goals

| Goal | Metric | Target |
|------|--------|--------|
| {Goal 1} | {Metric} | {Target} |
| {Goal 2} | {Metric} | {Target} |

### Success Metrics

| Metric | Benchmark | Target |
|--------|-----------|--------|
| Sequence completion rate | {%} | {%} |
| Average open rate | {%} | {%} |
| Average click rate | {%} | {%} |
| Conversion rate | {%} | {%} |
| Unsubscribe rate | < {%} | < {%} |

---

## Sequence Map

### Visual Flow

```
[Entry Trigger]
      │
      ▼
┌─────────────┐
│  Email 1    │ ── Day 0: Welcome/Value
└─────────────┘
      │
      │ Wait 3 days
      ▼
┌─────────────┐
│  Email 2    │ ── Day 3: Education
└─────────────┘
      │
      │ Wait 4 days
      ▼
┌─────────────┐     ┌──────────────┐
│  Email 3    │ ──► │ Clicked?     │
└─────────────┘     └──────────────┘
      │                    │
      │               Yes ─┼─► [Branch A]
      │                    │
      │                No ─┼─► [Branch B]
      │
      │ Wait 5 days
      ▼
┌─────────────┐
│  Email 4    │ ── Day 12: Social Proof
└─────────────┘
      │
      │ Wait 7 days
      ▼
┌─────────────┐
│  Email 5    │ ── Day 19: Offer/CTA
└─────────────┘
      │
      ▼
[Exit / Next Sequence]
```

---

## Email Sequence Detail

### Email 1: {Name}

**Timing**: Immediate / Day 0

| Field | Value |
|-------|-------|
| Subject | {Subject line} |
| Preheader | {Preview text} |
| From | {Name <email>} |
| Goal | {This email's objective} |

**Content outline**:
```
HEADLINE: {Welcome hook}

BODY:
- {Thank them/set expectations}
- {Deliver promised value}
- {What's coming next}

CTA: {Action to take}
```

**Success criteria**: {Open rate > X%, Click rate > Y%}

---

### Email 2: {Name}

**Timing**: +3 days from Email 1

| Field | Value |
|-------|-------|
| Subject | {Subject line} |
| Preheader | {Preview text} |
| From | {Name <email>} |
| Goal | {This email's objective} |

**Content outline**:
```
HEADLINE: {Educational hook}

BODY:
- {Key insight or tip}
- {Why this matters}
- {How to apply it}

CTA: {Learn more action}
```

**Success criteria**: {Metrics}

---

### Email 3: {Name}

**Timing**: +4 days from Email 2

| Field | Value |
|-------|-------|
| Subject | {Subject line} |
| Preheader | {Preview text} |
| From | {Name <email>} |
| Goal | {This email's objective} |

**Content outline**:
```
HEADLINE: {Deeper dive hook}

BODY:
- {More detailed content}
- {Address common questions}
- {Demonstrate expertise}

CTA: {Engagement action}
```

**Branch logic**:
- If clicked → Move to high-intent branch
- If no click → Continue standard path

**Success criteria**: {Metrics}

---

### Email 4: {Name}

**Timing**: +5 days from Email 3

| Field | Value |
|-------|-------|
| Subject | {Subject line} |
| Preheader | {Preview text} |
| From | {Name <email>} |
| Goal | {This email's objective} |

**Content outline**:
```
HEADLINE: {Social proof hook}

BODY:
- {Customer story or testimonial}
- {Results achieved}
- {Relevance to reader}

CTA: {See more examples/Get started}
```

**Success criteria**: {Metrics}

---

### Email 5: {Name}

**Timing**: +7 days from Email 4

| Field | Value |
|-------|-------|
| Subject | {Subject line} |
| Preheader | {Preview text} |
| From | {Name <email>} |
| Goal | {This email's objective} |

**Content outline**:
```
HEADLINE: {Offer/urgency hook}

BODY:
- {Recap value proposition}
- {Specific offer or next step}
- {Remove friction}

CTA: {Primary conversion action}
```

**Success criteria**: {Metrics}

---

## Branch Sequences

### Branch A: High Intent

**Entry**: Clicked link in Email 3

| Email | Timing | Focus |
|-------|--------|-------|
| A1 | +1 day | {Deeper content on clicked topic} |
| A2 | +3 days | {Demo/consultation offer} |
| A3 | +5 days | {Urgency/limited offer} |

### Branch B: Re-engagement

**Entry**: No engagement after Email 3

| Email | Timing | Focus |
|-------|--------|-------|
| B1 | +2 days | {Different angle/subject line test} |
| B2 | +5 days | {Breakup or feedback request} |

---

## Personalization

### Dynamic Content

| Variable | Source | Usage |
|----------|--------|-------|
| {{first_name}} | Profile | Greeting |
| {{company}} | Profile | Body personalization |
| {{industry}} | Profile | Content selection |
| {{interest}} | Behavior | Topic focus |

### Content Variations

| Segment | Content Difference |
|---------|--------------------|
| {Industry A} | {Use case examples} |
| {Industry B} | {Different case studies} |
| {Company size} | {Feature focus} |

---

## Testing Plan

### A/B Tests

| Email | Test Element | Variants | Winner Criteria |
|-------|--------------|----------|-----------------|
| Email 1 | Subject line | {A vs B} | Open rate |
| Email 3 | CTA | {A vs B} | Click rate |
| Email 5 | Offer | {A vs B} | Conversion |

### Test Duration

- Minimum sample: {Number} per variant
- Test duration: {X} days
- Statistical significance: 95%

---

## Technical Setup

### Automation Platform

Platform: {ESP/MAP name}
Program ID: {ID if applicable}

### Integration Points

| System | Integration | Purpose |
|--------|-------------|---------|
| CRM | {Connection type} | Lead status sync |
| Website | {Tracking} | Behavior triggers |
| Sales | {Alerts} | Hot lead notifications |

### Lead Scoring Impact

| Action | Points |
|--------|--------|
| Email open | +{X} |
| Email click | +{X} |
| Content download | +{X} |
| Pricing page visit | +{X} |

---

## Content Assets

### Required Content

| Asset | Owner | Status | Due Date |
|-------|-------|--------|----------|
| Email 1 copy | {Name} | {Status} | {Date} |
| Email 2 copy | {Name} | {Status} | {Date} |
| Email 3 copy | {Name} | {Status} | {Date} |
| Email 4 copy | {Name} | {Status} | {Date} |
| Email 5 copy | {Name} | {Status} | {Date} |
| Images/graphics | {Name} | {Status} | {Date} |

### Supporting Content

| Asset | Link | Purpose |
|-------|------|---------|
| Landing page | {URL} | CTA destination |
| Resource | {URL} | Value delivery |
| Case study | {URL} | Social proof |
| Demo page | {URL} | Conversion |

---

## Review & Approval

### Approval Workflow

| Stage | Approver | Status | Date |
|-------|----------|--------|------|
| Copy review | {Name} | | |
| Design review | {Name} | | |
| Technical QA | {Name} | | |
| Legal review | {Name} | | |
| Final approval | {Name} | | |

### Launch Checklist

- [ ] All emails built and tested
- [ ] Links verified and tracking
- [ ] Personalization tested
- [ ] Branch logic verified
- [ ] Entry/exit criteria configured
- [ ] Suppression rules active
- [ ] Lead scoring configured
- [ ] Sales notifications set
- [ ] Reporting dashboard ready

---

## Performance Tracking

### Monitoring Schedule

| Frequency | Metrics Reviewed |
|-----------|-----------------|
| Daily (first week) | Deliverability, opens, clicks |
| Weekly | Conversion, unsubscribes, completion |
| Monthly | Full funnel analysis, optimization |

### Optimization Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| Open rate < {%} | Alert | Test subjects |
| Click rate < {%} | Alert | Review content |
| Unsubscribe > {%} | Pause | Investigate |
| Conversion < {%} | Review | Audit sequence |

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | {DATE} | {Name} | Initial sequence |

---

*Template version: 1.0 | MMK Framework*
