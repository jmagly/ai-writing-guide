---
name: social-strategy
description: Develop comprehensive social media strategy and content calendar
arguments:
  - name: strategy-period
    description: Time period for strategy (Q1, monthly, campaign-based)
    required: true
  - name: platforms
    description: Target platforms (comma-separated, or 'all')
    required: false
  - name: project-directory
    description: Project directory path (default current directory)
    required: false
---

# Social Strategy Command

Develop comprehensive social media strategy with platform-specific tactics and content calendar.

## What This Command Does

1. **Audits Current State**
   - Platform performance review
   - Competitive analysis
   - Content performance

2. **Develops Strategy**
   - Platform-specific strategies
   - Content pillars
   - Engagement approach

3. **Creates Content Plan**
   - Content calendar
   - Post templates
   - Community guidelines

## Orchestration Flow

```
Social Strategy Request
        ↓
[Social Media Specialist] → Platform Strategy
        ↓
[Content Strategist] → Content Pillars
        ↓
[Copywriter] → Post Templates & Copy
        ↓
[Graphic Designer] → Visual Templates
        ↓
[Marketing Analyst] → KPIs & Benchmarks
        ↓
[Brand Guardian] → Brand Guidelines
        ↓
Social Strategy Package Complete
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Social Media Specialist | Lead strategy | Platform plans |
| Content Strategist | Content planning | Pillars, themes |
| Copywriter | Copy | Post templates |
| Graphic Designer | Visual | Design templates |
| Marketing Analyst | Analytics | KPIs, benchmarks |
| Brand Guardian | Brand | Guidelines |

## Output Artifacts

Saved to `.aiwg/marketing/social/{strategy-period}/`:

- `social-strategy.md` - Overall strategy
- `platform-strategies/` - Platform-specific plans
  - `instagram.md`
  - `linkedin.md`
  - `twitter.md`
  - `facebook.md`
  - `tiktok.md`
- `content-calendar.md` - Publishing calendar
- `content-pillars.md` - Content themes
- `post-templates.md` - Copy templates
- `community-guidelines.md` - Engagement rules
- `kpis-benchmarks.md` - Success metrics

## Usage Examples

```bash
# Quarterly strategy
/social-strategy "Q2 2024"

# Specific platforms
/social-strategy "January" --platforms "instagram,linkedin,twitter"

# All platforms
/social-strategy "Q1" --platforms all
```

## Success Criteria

- [ ] Platform audit complete
- [ ] Strategy aligned with business goals
- [ ] Content pillars defined
- [ ] Content calendar populated
- [ ] Post templates created
- [ ] KPIs and benchmarks established
- [ ] Community guidelines documented
