---
name: marketing-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: Marketing framework quick reference — campaign intake through analytics, brand compliance, content production, audience synthesis, and approval workflows
---

# Marketing Framework — Quick Reference

You are operating in a project that has the AIWG **media-marketing-kit** framework installed. This skill is your always-loaded directory for marketing operations. The full skill catalog is reachable through the AIWG artifact index.

## What this framework is for

Full marketing operations stack: campaign strategy and intake, content production (briefs / scripts / asset production), audience synthesis, brand compliance and identity refinement, multi-stakeholder approval workflows, performance analytics, and crisis / event / email / social-strategy primitives.

## When to reach for which skill

### Intake & strategy

| Need | Skill |
|---|---|
| Generate campaign intake forms | `marketing-intake` / `marketing-intake-wizard` |
| Validate intake + start strategy phase | `intake-start-campaign` |
| Scan existing assets for intake | `intake-from-campaign` |
| Audience persona synthesis | `audience-synthesis` |
| Competitive intel | `competitive-intel`, `competitive-analysis` |

### Brand

| Need | Skill |
|---|---|
| Brand identity refinement | `brand-identity-refinement` |
| Brand compliance (visual/verbal/legal) | `brand-compliance` |
| Brand audit / review | `brand-audit`, `brand-review` |

### Production

| Need | Skill |
|---|---|
| Creative brief | `creative-brief` |
| Asset production | `asset-production` |
| Video production | `video-production` |
| Email campaign | `email-campaign` |
| Social strategy | `social-strategy` |
| Event marketing | `event-marketing` |
| Sales enablement | `sales-enablement` |
| Content planning | `content-planning` |

### Workflow & approvals

| Need | Skill |
|---|---|
| Approval workflow (multi-stakeholder) | `approval-workflow` |
| QA protocol on assets | `qa-protocol` |
| Marketing data pipeline | `data-pipeline` |
| Performance digest | `performance-digest` |
| Marketing project status | `marketing-status` |
| Marketing retrospective | `marketing-retrospective` |
| Campaign analytics | `campaign-analytics` |
| Campaign kickoff | `campaign-kickoff` |
| Marketing review synthesis | `review-synthesis` |
| PR launch | `pr-launch` |

### Cross-cutting

| Need | Skill |
|---|---|
| Crisis response | `crisis-response` |
| Legal compliance | `legal-compliance` |
| Budget review | `budget-review` |

This framework ships **33 skills**, the most of any installed framework. The tables above are the high-traffic entries — for everything else, query the index.

## Phase model

```
Intake → Strategy → Production → Distribution → Analytics → Retrospective
   marketing-intake     creative-brief     approval-workflow     campaign-analytics
   intake-start-campaign asset-production  qa-protocol           performance-digest
                        video-production
                        email-campaign
                        social-strategy
```

## Artifact directory layout

Marketing artifacts go under `.aiwg/marketing/` when the framework is in use:

```
.aiwg/marketing/
├── intake/           # Campaign intake forms, brand profiles
├── strategy/         # Audience, positioning, channel mix
├── production/       # Creative briefs, asset specs
├── assets/           # Produced creative (links / metadata)
├── analytics/        # Performance reports, attribution
└── retrospectives/   # Lessons learned per campaign
```

## Finding the right skill when this quickref doesn't list it

```bash
aiwg discover "<phrase>"
```

This framework is the largest by skill count (33). For unusual asks (e.g., "build an attribution model", "audit a landing page"), the index ranks better than memory.

## Common multi-skill flows

- **New campaign, full lifecycle**: `marketing-intake-wizard` → `intake-start-campaign` → `audience-synthesis` → `creative-brief` → `asset-production` → `approval-workflow` → `qa-protocol` → `campaign-analytics` → `marketing-retrospective`
- **Brand refresh**: `brand-audit` → `brand-identity-refinement` → `brand-compliance`
- **PR + launch**: `pr-launch` → `social-strategy` → `email-campaign` → `crisis-response` (on standby)
- **Quarterly performance review**: `campaign-analytics` → `performance-digest` → `review-synthesis`

## Don't list from this skill — query the index

If a user asks "what marketing skills are available?", **do not enumerate from memory**. Run `aiwg discover --type skill --graph framework "marketing"`. This skill exists to orient.
