---
name: event-marketing
description: Plan comprehensive marketing strategy for events (hosted or participated)
arguments:
  - name: event-name
    description: Name of the event
    required: true
  - name: event-type
    description: Type of event (hosted, tradeshow, webinar, conference, sponsorship)
    required: false
  - name: project-directory
    description: Project directory path (default current directory)
    required: false
---

# Event Marketing Command

Plan comprehensive marketing strategy for events, from promotion to post-event follow-up.

## What This Command Does

1. **Develops Event Strategy**
   - Event positioning
   - Target audience
   - Marketing objectives

2. **Plans Promotion**
   - Multi-channel promotion
   - Registration campaigns
   - Partner coordination

3. **Coordinates Execution**
   - Event collateral
   - On-site marketing
   - Post-event follow-up

## Orchestration Flow

```
Event Marketing Request
        ↓
[Campaign Strategist] → Event Strategy
        ↓
[Content Strategist] → Content Plan
        ↓
[Email Marketer] → Email Campaigns
        ↓
[Social Media Specialist] → Social Promotion
        ↓
[Graphic Designer] → Event Collateral
        ↓
[Production Coordinator] → Materials Production
        ↓
[Marketing Analyst] → Success Metrics
        ↓
Event Marketing Package Complete
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Campaign Strategist | Strategy | Event positioning |
| Content Strategist | Content | Content calendar |
| Email Marketer | Email | Registration campaigns |
| Social Media Specialist | Social | Social promotion |
| Graphic Designer | Design | Event collateral |
| Production Coordinator | Production | Materials |
| Marketing Analyst | Analytics | KPIs, tracking |

## Event Types

| Type | Marketing Focus | Timeline |
|------|-----------------|----------|
| Hosted | Full promotion, registration | 8-12 weeks |
| Tradeshow | Booth presence, lead gen | 6-8 weeks |
| Webinar | Registration, attendance | 3-4 weeks |
| Conference | Speaking, presence | 8-12 weeks |
| Sponsorship | Brand visibility | Varies |

## Output Artifacts

Saved to `.aiwg/marketing/events/{event-name}/`:

- `event-strategy.md` - Marketing strategy
- `promotion-plan.md` - Multi-channel plan
- `content-calendar.md` - Content schedule
- `email-sequence.md` - Email campaigns
- `social-plan.md` - Social promotion
- `collateral-list.md` - Materials needed
- `on-site-plan.md` - Event day marketing
- `follow-up-plan.md` - Post-event campaigns
- `kpis.md` - Success metrics

## Usage Examples

```bash
# Hosted event
/event-marketing "Annual User Conference" --event-type hosted

# Trade show
/event-marketing "Industry Expo 2024" --event-type tradeshow

# Webinar series
/event-marketing "Product Deep Dive" --event-type webinar
```

## Success Criteria

- [ ] Event strategy defined
- [ ] Promotion timeline created
- [ ] Registration campaigns planned
- [ ] Collateral identified
- [ ] Social plan documented
- [ ] On-site marketing planned
- [ ] Follow-up sequence created
- [ ] Success metrics defined
