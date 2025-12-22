---
name: social-strategy
description: Develop comprehensive social media strategy and content calendar
model: claude-sonnet-4-5-20250929
tools: ["Read","LS","Grep","Glob","Edit","Create","Execute","Task","TodoWrite","WebSearch","FetchUrl"]
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

## Parameter Handling

### --guidance Parameter

**Purpose**: Provide upfront direction to tailor priorities and approach

**Examples**:
```bash
--guidance "TikTok-first approach for Gen Z audience"
--guidance "B2B focus, LinkedIn priority over other platforms"
--guidance "Community building emphasis over follower growth"
```

**How Applied**:
- Parse guidance for keywords: priority, timeline, audience, focus, constraints
- Adjust agent emphasis and output depth based on stated priorities
- Modify deliverable order based on timeline constraints
- Influence scope and detail level based on context

### --interactive Parameter

**Purpose**: Guide through discovery questions for comprehensive input

**Questions Asked** (if --interactive):
1. What are the business objectives for social?
2. Which platforms are priorities?
3. What is the target audience on social?
4. What content themes resonate with your audience?
5. What resources are available for content creation?
6. What are the current pain points with social?

## Usage Examples

```bash
# Quarterly strategy
/social-strategy "Q2 2024"

# Specific platforms
/social-strategy "January" --platforms "instagram,linkedin,twitter"

# All platforms
/social-strategy "Q1" --platforms all

# With strategic guidance
/social-strategy "Example" --guidance "Your specific context here"

# Interactive mode
/social-strategy "Example" --interactive
```

## Success Criteria

- [ ] Platform audit complete
- [ ] Strategy aligned with business goals
- [ ] Content pillars defined
- [ ] Content calendar populated
- [ ] Post templates created
- [ ] KPIs and benchmarks established
- [ ] Community guidelines documented