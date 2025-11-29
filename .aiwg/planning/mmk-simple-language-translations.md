# Media/Marketing Kit (MMK) Framework - Simple Language Translations

**Purpose**: Map natural language user requests to MMK flow orchestration templates and commands.

## Core Principle

**Users don't type slash commands. They use natural language.**

As the core orchestrator, you interpret user intent and map it to appropriate MMK flow templates, then coordinate multi-agent workflows for campaign execution, content creation, and media kit production.

## Translation Patterns

### Campaign Lifecycle - Phase Transitions

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Start new campaign" | Begin campaign intake | `campaign-intake` | 5-8 min |
| "Create campaign" | Same as above | `campaign-intake` | 5-8 min |
| "New campaign for {product/event}" | Same as above | `campaign-intake` | 5-8 min |
| "Move to strategy" | Intake → Strategy | `flow-intake-to-strategy` | 10-15 min |
| "Strategy is done" | Strategy → Creation | `flow-strategy-to-creation` | 8-10 min |
| "Start content creation" | Same as above | `flow-strategy-to-creation` | 8-10 min |
| "Content is ready" | Creation → Review | `flow-creation-to-review` | 5-8 min |
| "Ready for review" | Same as above | `flow-creation-to-review` | 5-8 min |
| "Approved to publish" | Review → Publication | `flow-review-to-publication` | 5-8 min |
| "Content is approved" | Same as above | `flow-review-to-publication` | 5-8 min |
| "Launch the campaign" | Publication → Live | `flow-campaign-launch` | 10-15 min |
| "Go live" | Same as above | `flow-campaign-launch` | 10-15 min |
| "Campaign is live" | Publication → Analysis | `flow-publication-to-analysis` | 3-5 min |
| "Start tracking results" | Same as above | `flow-publication-to-analysis` | 3-5 min |

### Campaign Management

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "What's the campaign status?" | Campaign status check | `campaign-status` | Instant |
| "Where are we with the campaign?" | Same as above | `campaign-status` | Instant |
| "Campaign health check" | Campaign health report | `campaign-health-check` | 2-3 min |
| "Generate campaign brief" | Create campaign brief | `generate-campaign-brief` | 8-10 min |
| "Create campaign plan" | Full campaign planning | `flow-campaign-planning` | 15-20 min |
| "Update campaign timeline" | Timeline revision | `update-campaign-timeline` | 3-5 min |
| "Who's working on this?" | Show team assignments | `campaign-status --team` | Instant |

### Media Kit & Press

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Create media kit" | Generate comprehensive media kit | `generate-media-kit` | 15-20 min |
| "Build press kit" | Same as above | `generate-media-kit` | 15-20 min |
| "Update media kit" | Refresh existing media kit | `update-media-kit` | 8-10 min |
| "Write press release" | Press release cycle | `flow-press-release-cycle` | 10-15 min |
| "Draft announcement" | Same as above | `flow-press-release-cycle` | 10-15 min |
| "Prepare for media outreach" | Media outreach workflow | `flow-media-outreach` | 12-15 min |
| "Build media list" | Create media contact list | `generate-media-list` | 5-8 min |
| "Update company boilerplate" | Refresh boilerplate template | `update-company-boilerplate` | 3-5 min |
| "Create fact sheet" | Generate product/company fact sheet | `generate-fact-sheet` | 5-8 min |
| "Build executive bios" | Create leadership bios | `generate-executive-bios` | 8-10 min |

### Content Creation - Blog & Editorial

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Write blog post about {topic}" | Generate blog post | `generate-blog-post` | 10-15 min |
| "Create article on {topic}" | Same as above | `generate-blog-post` | 10-15 min |
| "Draft thought leadership piece" | Long-form editorial content | `generate-thought-leadership` | 15-20 min |
| "Build content calendar" | Editorial calendar planning | `flow-content-calendar-planning` | 10-15 min |
| "Create blog series on {topic}" | Multi-part content series | `flow-blog-series-creation` | 20-30 min |
| "Write guest post for {publication}" | Targeted guest contribution | `generate-guest-post` | 12-15 min |
| "Create white paper on {topic}" | Long-form research content | `generate-white-paper` | 25-35 min |
| "Build ebook about {topic}" | Comprehensive lead magnet | `generate-ebook` | 30-45 min |

### Content Creation - Case Studies & Customer Stories

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Create case study for {customer}" | Generate customer case study | `generate-case-study` | 15-20 min |
| "Build customer story" | Same as above | `generate-case-study` | 15-20 min |
| "Write success story about {customer}" | Same as above | `generate-case-study` | 15-20 min |
| "Create testimonial one-pager" | Short customer testimonial | `generate-testimonial-sheet` | 5-8 min |
| "Build ROI calculator" | Interactive ROI content | `generate-roi-calculator` | 10-15 min |

### Content Creation - Email & Nurture

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Draft email sequence" | Generate email nurture series | `generate-nurture-sequence` | 12-18 min |
| "Create nurture campaign" | Same as above | `generate-nurture-sequence` | 12-18 min |
| "Write welcome series" | Onboarding email sequence | `generate-welcome-series` | 10-15 min |
| "Build promotional email" | Single promotional message | `generate-promo-email` | 5-8 min |
| "Create newsletter" | Periodic newsletter content | `generate-newsletter` | 10-15 min |
| "Draft event invitation" | Event marketing email | `generate-event-invitation` | 8-10 min |

### Content Creation - Social Media

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Build social campaign" | Multi-platform social campaign | `flow-social-campaign` | 15-20 min |
| "Create social posts for {campaign}" | Social media content batch | `generate-social-posts` | 8-12 min |
| "Write LinkedIn post about {topic}" | Single platform content | `generate-linkedin-post` | 5-8 min |
| "Draft Twitter thread on {topic}" | Twitter/X thread | `generate-twitter-thread` | 5-8 min |
| "Create social calendar" | Social media scheduling | `flow-social-calendar-planning` | 10-15 min |
| "Build Instagram campaign" | Instagram-specific content | `generate-instagram-campaign` | 12-15 min |
| "Write video script for {topic}" | Video content script | `generate-video-script` | 10-15 min |

### Sales Enablement

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Build pitch deck" | Create sales presentation | `generate-pitch-deck` | 20-25 min |
| "Create sales deck" | Same as above | `generate-pitch-deck` | 20-25 min |
| "Generate one-pager" | Product/solution one-sheet | `generate-one-pager` | 8-10 min |
| "Create one-sheet for {product}" | Same as above | `generate-one-pager` | 8-10 min |
| "Make battle card for {competitor}" | Competitive battle card | `generate-battle-card` | 10-12 min |
| "Build competitive matrix" | Multi-competitor comparison | `generate-competitive-matrix` | 12-15 min |
| "Create FAQ sheet" | Sales FAQ document | `generate-sales-faq` | 8-10 min |
| "Write objection handlers" | Sales objection handling guide | `generate-objection-handlers` | 10-12 min |
| "Build sales playbook" | Comprehensive sales enablement | `generate-sales-playbook` | 25-35 min |

### Website & Landing Pages

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Create landing page for {campaign}" | Landing page copy | `generate-landing-page` | 12-15 min |
| "Write homepage copy" | Homepage messaging | `generate-homepage-copy` | 15-20 min |
| "Build product page" | Product detail page | `generate-product-page` | 12-15 min |
| "Create pricing page" | Pricing page content | `generate-pricing-page` | 10-15 min |
| "Write about us page" | Company about page | `generate-about-page` | 10-12 min |
| "Build website sitemap" | Site structure planning | `flow-website-sitemap-planning` | 8-10 min |

### Reviews & Compliance

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Check brand compliance" | Brand guidelines validation | `flow-brand-compliance-check` | 5-8 min |
| "Validate brand guidelines" | Same as above | `flow-brand-compliance-check` | 5-8 min |
| "Legal review needed" | Legal/compliance review | `flow-legal-review` | 10-15 min |
| "Check for legal issues" | Same as above | `flow-legal-review` | 10-15 min |
| "Is it accessible?" | Accessibility validation | `check-accessibility` | 3-5 min |
| "Check WCAG compliance" | Same as above | `check-accessibility` | 3-5 min |
| "Validate tone of voice" | Brand voice consistency | `flow-tone-validation` | 5-8 min |
| "Check messaging consistency" | Cross-asset messaging review | `flow-messaging-consistency-check` | 8-10 min |
| "SEO review" | SEO optimization check | `flow-seo-review` | 8-10 min |

### Analytics & Reporting

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "How did the campaign perform?" | Campaign performance report | `generate-campaign-report` | 8-10 min |
| "Generate campaign report" | Same as above | `generate-campaign-report` | 8-10 min |
| "Monthly marketing report" | Monthly performance summary | `generate-monthly-report` | 12-15 min |
| "Track KPIs" | KPI dashboard/tracking | `campaign-status --metrics` | Instant |
| "Show campaign metrics" | Same as above | `campaign-status --metrics` | Instant |
| "A/B test results" | A/B test analysis | `generate-ab-test-report` | 8-10 min |
| "Social media analytics" | Social performance report | `generate-social-analytics` | 8-10 min |
| "Email campaign stats" | Email performance metrics | `generate-email-analytics` | 8-10 min |
| "Website analytics" | Web traffic analysis | `generate-web-analytics` | 10-12 min |

### Asset Management

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Build asset library" | Organize marketing assets | `flow-asset-library-organization` | 10-15 min |
| "Create content hub" | Centralized content repository | `flow-content-hub-creation` | 15-20 min |
| "Tag assets for {campaign}" | Asset tagging and metadata | `tag-campaign-assets` | 3-5 min |
| "Archive old campaigns" | Campaign archival workflow | `flow-campaign-archival` | 5-8 min |
| "Build brand guidelines doc" | Comprehensive brand guide | `generate-brand-guidelines` | 20-30 min |

### Collaboration & Workflow

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Assign to {team member}" | Assign task/content | `assign-campaign-task` | Instant |
| "Who's reviewing this?" | Show review assignments | `campaign-status --reviewers` | Instant |
| "Request stakeholder approval" | Approval workflow trigger | `flow-stakeholder-approval` | 5-8 min |
| "Send for client review" | Client review workflow | `flow-client-review` | 5-8 min |
| "Schedule content" | Content scheduling setup | `schedule-content-publication` | 3-5 min |

## Interpretation Guidelines

### 1. Context Awareness

**Consider current campaign phase** when interpreting ambiguous requests:

```python
# Example logic for "create"
if user_says("create") and current_phase == "Intake":
    → campaign-intake or generate-campaign-brief
elif user_says("create") and current_phase == "Strategy":
    → Clarify: "Create what? (content, landing page, email, social posts)"
elif user_says("create") and current_phase == "Creation":
    → Suggest content types based on campaign brief
```

### 2. Clarification When Needed

**Ask for clarification** if intent is ambiguous:

```
User: "Create content"
You: "I can help create content. What type?
  1. Blog post or article
  2. Social media posts
  3. Email sequence
  4. Sales enablement (pitch deck, one-pager, battle card)
  5. Landing page copy
  6. Something else?"
```

### 3. Extract Parameters

**Parse relevant parameters** from natural language:

```
User: "Write blog post about AI in healthcare with SEO focus"
You interpret:
  - Flow: generate-blog-post
  - Topic: "AI in healthcare"
  - Guidance: "SEO optimization focus"
```

### 4. Offer Guidance Mode

**Suggest --guidance or --interactive** for complex requests:

```
User: "Create media kit"
You: "I'll generate a comprehensive media kit. This will take ~15-20 minutes.

Would you like to:
  1. Standard media kit (company overview, products, leadership)
  2. Provide guidance upfront (--guidance: target audience, key messages, events)
  3. Interactive mode (I'll ask 8-10 strategic questions)

[If no response in 3 seconds, proceed with #1]"
```

## Response Patterns

### Confirmation Pattern

**Always confirm understanding** before starting orchestration:

```
User: "Build social campaign for Q4 product launch"

You: "Understood. I'll orchestrate a comprehensive social media campaign for Q4 product launch.

This will generate:
- Social media content calendar (60 posts across platforms)
- Platform-specific post variants (LinkedIn, Twitter, Instagram, Facebook)
- Visual content briefs
- Hashtag strategy
- Engagement guidelines

I'll coordinate content creators, brand reviewer, and social media manager.
Expected duration: 15-20 minutes.

Starting orchestration...
```

### Progress Update Pattern

**Update user throughout** with clear indicators:

```
✓ = Complete
⏳ = In progress
❌ = Error/blocked
⚠️ = Warning/attention needed

Example:
✓ Campaign brief analyzed
⏳ Blog post draft (Content Writer)...
✓ Blog post draft complete (1,850 words)
⏳ Launching parallel review (3 agents)...
  ✓ SEO Specialist: APPROVED with keyword additions
  ✓ Brand Manager: CONDITIONAL (adjust tone in paragraph 3)
  ✓ Technical Writer: APPROVED
⏳ Synthesizing final blog post...
✓ PUBLISHED: .aiwg/mmk/content/blog/blog-post-ai-healthcare.md
```

### Completion Pattern

**Summarize results** with actionable next steps:

```
─────────────────────────────────────────────
Campaign Assets Complete ✓
─────────────────────────────────────────────

Generated Artifacts:
✓ Campaign Brief (.aiwg/mmk/campaigns/q4-launch/campaign-brief.md)
✓ Blog Post: "AI in Healthcare" (.aiwg/mmk/content/blog/ai-healthcare-2025.md)
✓ Email Sequence (5 emails) (.aiwg/mmk/content/email/nurture-series-ai/)
✓ Social Posts (20 variants) (.aiwg/mmk/content/social/q4-launch/)
✓ Landing Page Copy (.aiwg/mmk/content/web/landing-ai-launch.md)

Review Status: All assets reviewed and APPROVED by brand and legal

Next Steps:
- Schedule social posts via content calendar
- Set up email automation in marketing platform
- Coordinate with design for visual assets
- Launch campaign on target date: 2025-12-01
```

## Special Cases

### Intake & Planning

| User Says | Intent | Action |
|-----------|--------|--------|
| "New campaign" | Begin campaign intake | `campaign-intake` with interactive mode |
| "Plan content calendar" | Editorial planning | `flow-content-calendar-planning` |
| "Build marketing plan" | Comprehensive marketing strategy | `flow-marketing-planning` |

### Quick Wins

| User Says | Intent | Action |
|-----------|--------|--------|
| "Quick social post about {topic}" | Single social post | `generate-social-post` (3-5 min) |
| "Draft announcement email" | Simple email | `generate-promo-email` (5-8 min) |
| "Update landing page headline" | Copy tweak | Direct edit (1-2 min) |

### Repurposing Content

| User Says | Intent | Action |
|-----------|--------|--------|
| "Turn blog into social posts" | Content repurposing | `flow-content-repurposing` |
| "Create LinkedIn post from case study" | Cross-format adaptation | `adapt-content` |
| "Break white paper into blog series" | Long-form to series | `flow-content-chunking` |

## Regex Patterns (For Implementation)

If implementing pattern matching, use these regex patterns:

```python
CAMPAIGN_LIFECYCLE = {
    r"(new|start|create).*(campaign)": "campaign-intake",
    r"(strategy|strategic).*(done|complete|ready)": "flow-strategy-to-creation",
    r"(content|assets).*(ready|done|complete)": "flow-creation-to-review",
    r"(launch|go live|publish).*(campaign)": "flow-campaign-launch",
}

CONTENT_CREATION = {
    r"(write|create|draft).*(blog|post|article)": "generate-blog-post",
    r"(write|create|draft).*(email|nurture)": "generate-nurture-sequence",
    r"(build|create).*(pitch deck|sales deck)": "generate-pitch-deck",
    r"(create|generate).*(case study|customer story)": "generate-case-study",
}

MEDIA_PR = {
    r"(create|build|generate).*(media kit|press kit)": "generate-media-kit",
    r"(write|draft|create).*(press release|announcement)": "flow-press-release-cycle",
    r"(media|press).*(outreach|list)": "flow-media-outreach",
}

REVIEWS = {
    r"(check|validate|review).*(brand|compliance)": "flow-brand-compliance-check",
    r"(legal|compliance).*(review|check)": "flow-legal-review",
    r"(accessible|accessibility|wcag)": "check-accessibility",
}

ANALYTICS = {
    r"(campaign|marketing).*(report|performance|analytics)": "generate-campaign-report",
    r"(monthly|quarterly).*(report)": "generate-monthly-report",
    r"(track|show|display).*(kpi|metric)": "campaign-status --metrics",
}
```

## Examples

### Example 1: Clear Intent - Content Creation

```
User: "Write blog post about AI trends in 2025"

Intent: Blog post generation (clear)
Flow: generate-blog-post
Topic: "AI trends in 2025"
Guidance: None

Action: Confirm and orchestrate
```

### Example 2: Needs Clarification - Ambiguous Content Type

```
User: "Create content for product launch"

Intent: Content creation (ambiguous - which type?)
Current Phase: Strategy Complete

Response: "I can create content for your product launch. Which assets do you need?
  1. Blog post or article
  2. Email sequence
  3. Social media campaign
  4. Landing page copy
  5. Sales enablement (pitch deck, one-pager)
  6. Multiple assets (full campaign)"
```

### Example 3: Extract Guidance - Complex Request

```
User: "Build social campaign for B2B SaaS launch with LinkedIn focus and thought leadership angle"

Intent: Social media campaign
Flow: flow-social-campaign
Platform Focus: LinkedIn
Guidance: "B2B SaaS audience, thought leadership positioning, LinkedIn primary channel"

Action: Confirm and orchestrate with guidance
```

### Example 4: Interactive Suggestion - Media Kit

```
User: "Create media kit"

Intent: Generate comprehensive media kit
Flow: generate-media-kit

Response: "I'll generate a comprehensive media kit (~15-20 minutes).

This is a substantial asset. Would you like:
  1. Standard media kit (company overview, products, leadership, press coverage)
  2. Provide guidance first (target audience, upcoming events, key messages)
  3. Interactive mode (I'll ask 10 questions about positioning, audience, assets)

[Default to #1 if no response]"
```

### Example 5: Content Repurposing

```
User: "Turn the case study into LinkedIn posts"

Intent: Content repurposing
Source: Case study (needs identification)
Target: LinkedIn posts
Flow: adapt-content or flow-content-repurposing

Response: "I'll repurpose your case study into LinkedIn content.

Which case study?
  1. [Customer A] - Enterprise SaaS (most recent)
  2. [Customer B] - Healthcare AI
  3. [Customer C] - Fintech

How many posts?
  1. 3-post series (key findings, results, customer quote)
  2. 5-post series (full story arc)
  3. 10-post campaign (comprehensive breakdown)"
```

## Natural Language Command Reference

**Full list of recognized phrases by category:**

### Campaign Lifecycle
- "start campaign" | "new campaign" | "create campaign"
- "move to strategy" | "strategy phase"
- "content creation" | "start creating"
- "ready for review" | "send for review"
- "approved" | "approved to publish"
- "launch campaign" | "go live"

### Content Types
- "blog post" | "article" | "write about"
- "case study" | "customer story" | "success story"
- "email sequence" | "nurture campaign" | "welcome series"
- "social campaign" | "social posts" | "LinkedIn post"
- "press release" | "announcement" | "media alert"
- "pitch deck" | "sales deck" | "presentation"
- "one-pager" | "one-sheet" | "product sheet"
- "battle card" | "competitive matrix"
- "landing page" | "web copy" | "homepage"

### Media & PR
- "media kit" | "press kit" | "media package"
- "press release" | "announcement"
- "media outreach" | "media list"
- "fact sheet" | "company overview"
- "executive bios" | "leadership profiles"

### Reviews
- "brand compliance" | "brand check" | "validate brand"
- "legal review" | "compliance check"
- "accessible" | "accessibility" | "WCAG"
- "SEO review" | "SEO optimization"
- "tone check" | "voice validation"

### Analytics
- "campaign performance" | "campaign report"
- "monthly report" | "quarterly report"
- "track KPIs" | "show metrics" | "analytics"
- "A/B test results" | "test analysis"

### Status & Health
- "campaign status" | "where are we"
- "campaign health" | "health check"
- "what's next" | "next steps"

## Implementation Notes

1. **Pattern Matching**: Use fuzzy matching (not exact), consider marketing terminology variations
2. **Default to Safety**: If unsure about content type, ask for clarification rather than guessing
3. **Learn Over Time**: Track which content types users request most, adapt patterns
4. **Context Stack**: Maintain campaign context to resolve "it", "that", "the campaign"
5. **Abbreviations**: Support common marketing abbreviations (e.g., "PR", "SEO", "CTR", "CTA")
6. **Platform-Specific**: Recognize platform names (LinkedIn, Twitter/X, Instagram, Facebook)

## Testing

**Test scenarios for validation:**

```
✓ "write blog post about AI" → generate-blog-post
✓ "create media kit" → generate-media-kit
✓ "check brand compliance" → flow-brand-compliance-check
✓ "campaign status" → campaign-status
✓ "launch campaign" + (context: Review Complete) → flow-review-to-publication
✓ "new campaign" + (no context) → campaign-intake
✓ "build social campaign for Q4 launch with LinkedIn focus" → flow-social-campaign (guidance="Q4 launch, LinkedIn focus")
✓ "turn case study into social posts" → flow-content-repurposing
✓ "monthly report" → generate-monthly-report
✓ "is it accessible?" → check-accessibility
```

## Edge Cases

### Multi-Asset Requests

```
User: "I need everything for product launch"

Response: "I'll create a complete product launch asset package.

This includes:
  - Campaign brief and strategy
  - Blog post (launch announcement)
  - Press release
  - Email sequence (3-5 emails)
  - Social media campaign (20+ posts)
  - Landing page copy
  - Sales one-pager
  - Pitch deck slides

This is comprehensive (~45-60 minutes). Proceed?
  1. Yes, create everything
  2. Let me select specific assets
  3. Interactive mode (prioritize based on timeline)"
```

### Revision Requests

```
User: "Make it more technical"

Context: Recent blog post generation
Intent: Revise existing content

Response: "I'll increase the technical depth of [blog post title].

Which aspect?
  1. Add technical details throughout
  2. Include code examples or technical diagrams
  3. Target technical audience (increase jargon appropriately)
  4. All of the above"
```

### Platform-Specific Optimization

```
User: "Optimize for LinkedIn"

Context: Recent social post
Intent: Platform-specific adaptation

Response: "I'll optimize this content for LinkedIn:
  - Adjust length (1,300-2,000 characters ideal)
  - Professional tone adjustment
  - Add relevant hashtags (3-5 industry-specific)
  - Include call-to-action for engagement
  - Format for readability (short paragraphs, bullets)

Proceeding with LinkedIn optimization..."
```

## Command Categories Summary

**Campaign Management** (9 commands)
**Media Kit & PR** (9 commands)
**Blog & Editorial** (7 commands)
**Case Studies** (5 commands)
**Email & Nurture** (6 commands)
**Social Media** (7 commands)
**Sales Enablement** (9 commands)
**Website & Landing Pages** (6 commands)
**Reviews & Compliance** (9 commands)
**Analytics & Reporting** (9 commands)
**Asset Management** (5 commands)
**Collaboration** (5 commands)

**Total: 86+ natural language command translations**
