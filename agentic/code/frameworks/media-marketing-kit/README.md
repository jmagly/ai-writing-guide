# Media/Marketing Kit (MMK) Framework

## 5-Minute Quick Start

```bash
# 1. Install CLI (one-time)
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash

# 2. Deploy marketing agents to your project
aiwg -deploy-agents --mode marketing
aiwg -deploy-commands --mode marketing

# 3. Start a campaign (choose one)
/marketing-intake-wizard "Your campaign description" --interactive
# OR: /intake-from-campaign ./existing-assets --interactive

# 4. Check status anytime
/campaign-status
```

**That's it.** The wizard guides you through Strategy → Creation → Review → Publication → Analysis.

| Phase | What Happens | Key Commands |
|-------|--------------|--------------|
| **Strategy** | Define goals, audience, messaging | `/flow-strategy-baseline` |
| **Creation** | Generate content across channels | `/generate-content-calendar`, `/generate-social-content` |
| **Review** | Brand + legal validation | `/brand-validate`, `/legal-clearance` |
| **Publication** | Deploy and launch | `/flow-review-to-publication` |
| **Analysis** | Measure and optimize | `/flow-performance-optimization` |

---

## Overview

The Media/Marketing Kit (MMK) framework provides a comprehensive Plan → Act lifecycle for marketing and media content delivery using AI agents. This specialized framework includes agents, commands, templates, and flows for managing the entire marketing content lifecycle from strategy through analysis.

**Supported Platforms:** Claude Code, Warp Terminal, Factory AI, OpenAI/Codex (experimental)

## Framework Structure

### Content

- `agents/` - 37 specialized marketing role agents (brand-strategist, campaign-strategist, copywriter, creative-director, etc.)
- `commands/` - Marketing-specific slash commands (intake-campaign, launch-campaign, brand-validate, etc.)
- `templates/` - Markdown templates for all marketing artifacts organized by discipline
- `flows/` - Phase-based workflows (Strategy → Creation → Review → Publication → Analysis)
- `add-ons/` - Compliance and integration extensions (FTC, GDPR-Marketing, industry-specific)
- `metrics/` - Campaign performance and tracking metrics
- `artifacts/` - Sample campaigns demonstrating complete lifecycle
- `config/` - Framework configuration (models.json, etc.)

### Template Categories

The framework provides 87+ templates organized by marketing discipline:

- `intake/` - Campaign briefs, stakeholder requirements, project intake
- `strategy/` - Campaign strategy, messaging matrix, audience profiles, channel plans
- `brand/` - Brand guidelines, voice frameworks, visual identity, tone specifications
- `content/` - Content calendars, editorial plans, SEO briefs, content audits
- `social/` - Social media calendars, platform strategies, community guidelines
- `email/` - Email campaigns, sequences, templates, segmentation
- `advertising/` - Ad creative briefs, media plans, performance tracking
- `pr-communications/` - Press releases, media kits, spokesperson briefs, crisis plans
- `sales-enablement/` - Sales collateral, competitive analysis, battlecards
- `product-marketing/` - Launch plans, positioning docs, GTM strategy
- `events/` - Event plans, sponsorship strategies, post-event analysis
- `analytics/` - Performance dashboards, KPI tracking, attribution models
- `creative/` - Creative briefs, asset specifications, production schedules
- `governance/` - Brand compliance, legal clearance, approval workflows
- `operations/` - Production timelines, resource allocation, vendor management

### Key References

- `plan-act-mmk.md` - Lifecycle phases and milestones
- `agents/` - Marketing role agent definitions
- `templates/card-metadata-standard.md` - Template metadata specification

## Relationship to Core Repository

This framework is part of the AIWG repository but serves as a standalone marketing toolkit. The parent repository contains:

- `/agents/` - General-purpose writing agents (content-diversifier, writing-validator, prompt-optimizer)
- `/commands/` - General-purpose command documentation
- `/core/`, `/validation/`, `/examples/` - Writing Guide content

The MMK framework agents apply writing guide principles to marketing artifacts but focus on marketing lifecycle management rather than general content creation.

## Marketing Lifecycle Model

The MMK framework follows a 5-phase lifecycle:

### Phase Overview

| Phase | Marketing Objectives | Primary Disciplines | Lifecycle Milestone | Duration |
|-------|---------------------|---------------------|---------------------|----------|
| **Strategy** | Define goals, audience, messaging, positioning, channel mix | Strategy, Brand, Audience Research, Budget Planning | Strategy Baseline (SB) | 1-2 weeks |
| **Creation** | Produce content, creative assets, copy across all channels | Content Strategy, Copywriting, Creative Production, Asset Management | Content Complete (CC) | 2-4 weeks |
| **Review** | Validate brand compliance, legal clearance, stakeholder approval | Brand Governance, Legal Compliance, Quality Assurance, Accessibility | Brand & Legal OK (BL) | 1-2 weeks |
| **Publication** | Deploy content, schedule posts, launch campaigns, activate channels | Production Coordination, Channel Management, Campaign Activation | Go-Live Ready (GL) | 1 week |
| **Analysis** | Measure performance, analyze results, optimize campaigns, report insights | Analytics, Performance Reporting, Optimization, A/B Testing | Performance Review (PR) | Ongoing |

### Milestones and Exit Criteria

**Strategy Baseline (SB)**:
- Stakeholder agreement on goals, messaging, budget, and channel strategy
- Audience personas validated
- Competitive positioning defined
- Risk register established

**Content Complete (CC)**:
- All assets created, copy written, creative briefs fulfilled
- Brand voice consistent across materials
- Assets organized with proper naming and metadata
- Production timeline met

**Brand & Legal OK (BL)**:
- Brand, legal, accessibility approvals granted
- Required revisions complete
- Trademark clearance obtained
- WCAG 2.1 AA compliance verified

**Go-Live Ready (GL)**:
- Content published/scheduled
- Tracking configured and validated
- Launch checklist complete
- Channel settings activated

**Performance Review (PR)**:
- KPIs measured and reported
- Insights documented
- Optimization recommendations delivered
- ROI analysis complete

## Agent Categories

The MMK framework includes 37 specialized agents organized by function:

### Strategy & Planning (7 agents)
- **Brand Strategist** - Brand positioning, messaging hierarchy, competitive differentiation
- **Campaign Strategist** - Campaign planning, goal-setting, channel strategy, budget allocation
- **Audience Researcher** - Persona development, journey mapping, psychographics, segmentation
- **Content Strategist** - Content planning, editorial calendars, SEO optimization, distribution
- **Product Marketing Manager** - Product launches, GTM strategy, positioning, competitive analysis
- **Event Strategist** - Event planning, sponsorship strategy, experiential marketing
- **Marketing Operations Manager** - Resource allocation, process optimization, vendor management

### Content Creation (8 agents)
- **Copywriter** - Ad copy, web content, long-form writing, headlines, CTAs
- **Email Marketing Specialist** - Email sequences, templates, segmentation, automation
- **Social Media Specialist** - Social content, community management, platform optimization
- **SEO Specialist** - Keyword research, on-page optimization, technical SEO, content optimization
- **Video Scriptwriter** - Video scripts, storyboards, B-roll briefs, multimedia content
- **PR Specialist** - Press releases, media kits, spokesperson briefs, journalist outreach
- **Sales Enablement Writer** - Sales collateral, battlecards, competitive positioning, training materials
- **Executive Communications Writer** - Executive messaging, thought leadership, speeches, investor relations

### Creative Production (5 agents)
- **Creative Director** - Creative concepts, visual direction, brand expression, campaign themes
- **Production Coordinator** - Production timelines, asset management, vendor coordination, quality control
- **Asset Manager** - File organization, version control, metadata tagging, asset library maintenance
- **Accessibility Reviewer** - WCAG compliance, inclusive design, alt text, keyboard navigation
- **QA Reviewer** - Quality assurance, link validation, cross-device testing, rendering checks

### Brand & Governance (4 agents)
- **Brand Guardian** - Brand compliance, voice consistency, visual identity adherence, trademark protection
- **Legal Reviewer** - Legal clearance, claims validation, disclosure requirements, privacy compliance
- **Compliance Specialist** - Regulatory compliance (FTC, GDPR, industry-specific), policy enforcement
- **Editorial Reviewer** - Content quality, grammar, style guide adherence, fact-checking

### Communications (3 agents)
- **PR Coordinator** - Media relations, press outreach, crisis communications, media monitoring
- **Community Manager** - Community engagement, social listening, user-generated content, reputation management
- **Influencer Coordinator** - Influencer partnerships, creator relationships, FTC compliance, performance tracking

### Analytics & Optimization (5 agents)
- **Marketing Analyst** - Performance analysis, KPI tracking, attribution modeling, ROI measurement
- **Reporting Specialist** - Dashboard creation, data visualization, stakeholder reporting, insights synthesis
- **A/B Testing Specialist** - Test design, hypothesis development, statistical analysis, optimization recommendations
- **SEO Analyst** - Search performance, keyword rankings, technical audits, competitor analysis
- **Social Media Analyst** - Social analytics, engagement metrics, sentiment analysis, platform performance

### Orchestration & Coordination (5 agents)
- **Marketing Project Manager** - Project coordination, timeline management, stakeholder communication, risk tracking
- **Campaign Coordinator** - Cross-channel coordination, launch management, dependency tracking, handoff facilitation
- **Documentation Synthesizer** - Artifact consolidation, template population, cross-referencing, archive management
- **Intake Coordinator** - Campaign intake, requirements gathering, stakeholder alignment, brief development
- **Marketing Orchestrator** - Multi-agent coordination, workflow optimization, escalation management, phase transitions

## Template Library

The framework provides 87+ research-backed templates:

### Strategic Planning Templates
- Campaign Strategy Document
- Messaging Matrix
- Audience Profile & Personas
- Channel Plan & Budget Allocation
- Competitive Landscape Analysis
- Marketing OKRs & KPIs
- RACE Framework Planner (Reach, Act, Convert, Engage)
- Agile Marketing Sprint Plan

### Brand & Voice Templates
- Brand Guidelines Master
- Voice Dimensional Framework
- Channel Voice Adaptation Matrix
- Visual Identity Specification
- Design Token Specification
- Inclusive Language Guide
- AI Brand Voice Training Brief
- Brand Compliance Checklist

### Content Development Templates
- Content Calendar
- Editorial Plan
- SEO Content Brief
- Blog Post Template
- Landing Page Copy Template
- Web Page Content Template
- Long-Form Content Outline
- Content Audit Report

### Social Media Templates
- Social Media Calendar
- Platform Strategy Document
- Community Guidelines
- Social Media Post Templates (by platform)
- Influencer Brief
- User-Generated Content Campaign
- Social Crisis Response Plan

### Email Marketing Templates
- Email Campaign Brief
- Email Sequence Template
- Newsletter Template
- Segmentation Strategy
- Email Automation Workflow
- A/B Test Plan (Email)
- Email Performance Report

### Advertising Templates
- Ad Creative Brief
- Media Plan
- Ad Copy Library (by channel)
- Display Ad Specifications
- Video Ad Script
- Performance Creative Report
- Budget Allocation Matrix

### PR & Communications Templates
- Press Release Template
- Media Kit Master
- Media Contact Directory
- Spokesperson Brief
- Executive Bio Template
- Crisis Communication Plan
- Media Coverage Report
- Embargo Management Checklist

### Sales Enablement Templates
- Sales Battlecard
- Competitive Analysis
- Product Positioning Document
- Sales Presentation Deck Outline
- Demo Script
- Objection Handling Guide
- Case Study Template

### Product Marketing Templates
- Product Launch Plan
- Go-To-Market Strategy
- Product Positioning Brief
- Feature Announcement
- Beta Program Plan
- Product Messaging Framework
- Pricing & Packaging Strategy

### Events Templates
- Event Planning Document
- Sponsorship Strategy
- Event Marketing Plan
- Post-Event Analysis
- Speaker Brief
- Event Content Calendar
- Attendee Journey Map

### Analytics & Reporting Templates
- Performance Dashboard Specification
- KPI Tracking Matrix
- Attribution Model Documentation
- A/B Test Report
- Campaign Performance Report
- ROI Analysis
- Privacy-First Measurement Plan
- Marketing Mix Modeling Template

### Creative Production Templates
- Creative Brief
- Asset Specification Document
- Video Production Brief
- B-roll Brief
- Photography Brief
- Production Timeline
- Asset Manifest

### Governance & Operations Templates
- Brand Review Checklist
- Legal Clearance Form
- Accessibility Audit
- QA Checklist
- Approval Workflow
- Production Schedule
- Vendor Management Template
- Marketing Operations Runbook

## Command Reference

### Standard Parameters

All MMK commands support two standard parameters for customization:

#### --guidance Parameter

Provide upfront strategic direction to tailor command behavior and priorities.

```bash
# Focus creative direction
/creative-brief "Product Launch" --guidance "Minimalist aesthetic, mobile-first, Gen Z audience"

# Constrain timeline
/campaign-kickoff "Q2 Launch" --guidance "3-week deadline, prioritize hero assets"

# Specify compliance focus
/brand-review ./assets --guidance "Pre-launch review, flag any legal concerns"

# Set analysis priorities
/campaign-analytics "Holiday Sale" --guidance "Focus on attribution across paid channels"
```

**How guidance is applied**:
- Parses for keywords: priority, timeline, audience, compliance, channels
- Adjusts agent emphasis and output depth
- Modifies deliverable ordering based on constraints
- Influences scope and detail level

#### --interactive Parameter

Enable discovery questions to gather comprehensive input before execution.

```bash
# Interactive campaign setup
/campaign-kickoff "New Product" --interactive

# Combine with guidance
/social-strategy "Q1" --interactive --guidance "TikTok-first, Gen Z focus"

# Interactive analytics deep-dive
/campaign-analytics "Spring Campaign" --interactive
```

**Interactive mode**:
- Asks 5-10 targeted questions based on command type
- Adapts questions based on previous responses
- Combines with `--guidance` to skip already-answered questions

### Intake Commands

The MMK framework provides three intake methods matching the SDLC framework pattern:

| Command | Purpose | Equivalent SDLC Command |
|---------|---------|------------------------|
| `/marketing-intake-wizard` | Generate new or complete existing intake | `/intake-wizard` |
| `/intake-from-campaign` | Analyze existing campaign/media kit | `/intake-from-codebase` |
| `/intake-start-campaign` | Validate manual intake, start Strategy | `/intake-start` |

**marketing-intake-wizard** - Generate or complete campaign intake forms:

```bash
# Generate new intake from description
/marketing-intake-wizard "Product launch for new mobile app targeting Gen Z"

# Interactive mode with questions
/marketing-intake-wizard "B2B SaaS launch" --interactive

# With strategic guidance
/marketing-intake-wizard "Holiday campaign" --guidance "Tight 3-week deadline, $50k budget, social and email focus"

# Complete existing intake (fill gaps)
/marketing-intake-wizard --complete

# Complete with interactive gap-filling
/marketing-intake-wizard --complete --interactive
```

**intake-from-campaign** - Scan existing campaign materials and generate intake:

```bash
# Analyze existing campaign folder
/intake-from-campaign ./q4-campaign-assets

# Interactive mode for clarification
/intake-from-campaign ./media-kit --interactive

# With analysis focus
/intake-from-campaign ./brand-assets --guidance "Preparing for agency handoff, need complete documentation"

# Specify output location
/intake-from-campaign ./campaign --output .aiwg/marketing/intake/
```

**intake-start-campaign** - Validate manually-created intake and kick off Strategy:

```bash
# Validate and start (default path)
/intake-start-campaign .aiwg/marketing/intake/

# With strategic guidance
/intake-start-campaign .aiwg/marketing/intake/ --guidance "Focus on brand consistency"
```

**Note**: If you use `/marketing-intake-wizard` or `/intake-from-campaign`, the intake is already validated - you can proceed directly to Strategy phase without running `/intake-start-campaign`.

### Phase Transition Flows

**flow-strategy-to-creation** - Transition from Strategy to Creation phase:
```bash
/flow-strategy-to-creation
```

**flow-creation-to-review** - Transition from Creation to Review phase:
```bash
/flow-creation-to-review
```

**flow-review-to-publication** - Transition from Review to Publication phase:
```bash
/flow-review-to-publication
```

**flow-publication-to-analysis** - Transition from Publication to Analysis phase:
```bash
/flow-publication-to-analysis
```

### Continuous Workflows

**flow-brand-compliance-cycle** - Validate brand compliance throughout lifecycle:
```bash
/flow-brand-compliance-cycle --guidance "Focus on visual identity and tone consistency"
```

**flow-content-production-cycle** - Execute content creation workflows:
```bash
/flow-content-production-cycle blog --interactive
```

**flow-creative-review-cycle** - Multi-agent creative review and approval:
```bash
/flow-creative-review-cycle campaign-assets/
```

**flow-performance-optimization** - Analyze and optimize campaign performance:
```bash
/flow-performance-optimization --guidance "Prioritize email and social channels"
```

### Content Generators

**generate-campaign-strategy** - Create comprehensive campaign strategy:
```bash
/generate-campaign-strategy "Q1 product launch" --interactive
```

**generate-content-calendar** - Build content calendar from strategy:
```bash
/generate-content-calendar --channels "blog,social,email" --duration "90 days"
```

**generate-social-content** - Generate social media content from campaign:
```bash
/generate-social-content --platforms "linkedin,twitter" --posts 20
```

**generate-email-sequence** - Create email nurture sequence:
```bash
/generate-email-sequence --sequence-type "product-launch" --emails 5
```

**generate-media-kit** - Build comprehensive media kit:
```bash
/generate-media-kit --company-profile --assets --press-archive
```

### Quality & Validation

**brand-validate** - Validate content against brand guidelines:
```bash
/brand-validate ./campaign-assets/ --report
```

**legal-clearance** - Legal and compliance review:
```bash
/legal-clearance ./campaign-assets/ --framework "FTC,GDPR"
```

**accessibility-audit** - WCAG compliance validation:
```bash
/accessibility-audit ./landing-pages/ --standard "WCAG-2.1-AA"
```

**campaign-health-check** - Overall campaign health assessment:
```bash
/campaign-health-check
```

### Utilities

**campaign-status** - Current phase, milestone progress, next steps:
```bash
/campaign-status
```

**build-campaign-index** - Generate campaign artifact index:
```bash
/build-campaign-index .aiwg/marketing/
```

**export-campaign-report** - Export comprehensive campaign report:
```bash
/export-campaign-report --format pdf --include-metrics
```

## Artifact Directory Structure

All marketing artifacts are stored in **`.aiwg/marketing/`** by default:

```
.aiwg/
├── marketing/              # MMK-specific artifacts
│   ├── intake/            # Campaign briefs, stakeholder requirements
│   ├── strategy/          # Campaign strategy, messaging, audience profiles
│   ├── brand/             # Brand guidelines, voice frameworks
│   ├── content/           # Content calendars, editorial plans
│   ├── social/            # Social media calendars, platform strategies
│   ├── email/             # Email campaigns, sequences, templates
│   ├── advertising/       # Ad creative, media plans, performance reports
│   ├── pr-communications/ # Press releases, media kits, crisis plans
│   ├── sales-enablement/  # Sales collateral, battlecards
│   ├── product-marketing/ # Launch plans, GTM strategy, positioning
│   ├── events/            # Event plans, sponsorship strategies
│   ├── analytics/         # Performance dashboards, KPI tracking
│   ├── creative/          # Creative briefs, asset specifications
│   ├── governance/        # Brand compliance, legal clearance
│   ├── operations/        # Production timelines, vendor management
│   ├── working/           # Temporary/scratch (safe to delete)
│   └── reports/           # Generated reports and indices
└── [other SDLC directories if using both frameworks]
```

### Recommended .gitignore Strategy

**Option 1: Commit Everything** (Teams & Agencies)
- Full audit trail for client deliverables
- Shared context for team coordination
- No .gitignore entries for `.aiwg/marketing/`

**Option 2: Commit Finals Only** (Balanced)
```gitignore
.aiwg/marketing/working/       # Ignore temporary files
.aiwg/marketing/reports/       # Ignore generated reports
```

**Option 3: Use Locally Only** (Freelancers)
```gitignore
.aiwg/marketing/               # Ignore all marketing artifacts
!.aiwg/marketing/intake/       # Keep intake forms for context
!.aiwg/marketing/README.md
```

## Integration with SDLC Framework

The MMK framework seamlessly integrates with the SDLC Complete framework for product launches and marketing-engineering alignment:

### Cross-Framework Usage

**Product Launch Scenario**:
1. SDLC framework manages product development (Inception → Construction)
2. MMK framework manages launch marketing (Strategy → Publication)
3. Shared artifacts: Product requirements, release notes, feature specs
4. Synchronized milestones: Beta release, GA launch, post-launch analysis

**Unified Artifact Structure**:
```
.aiwg/
├── marketing/              # MMK artifacts
│   ├── product-marketing/  # Launch plans, positioning
│   └── content/            # Launch content, announcements
├── requirements/           # SDLC artifacts (shared with MMK)
├── architecture/           # SDLC artifacts
└── deployment/             # SDLC artifacts (launch timing coordination)
```

### Cross-Framework Workflows

**flow-product-launch** - Coordinate SDLC and MMK for product launch:
```bash
/flow-product-launch --sdlc-phase construction --mmk-phase strategy
```

**flow-release-marketing** - Sync release deployment with marketing activation:
```bash
/flow-release-marketing --release-date "2025-03-15" --channels "email,social,pr"
```

## Installation

Use the AIWG CLI to deploy this framework:

```bash
# Install CLI
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash

# Deploy marketing agents only (for marketing projects)
aiwg -deploy-agents --mode marketing

# Deploy all frameworks including marketing (for product launches)
aiwg -deploy-agents --mode all

# Deploy commands
aiwg -deploy-commands --mode marketing

# Scaffold new marketing project with templates
aiwg -new --framework marketing
```

### Platform-Specific Deployment

```bash
# Claude Code (default - creates .claude/agents/)
aiwg -deploy-agents --mode marketing

# Warp Terminal (creates warp/agents/)
aiwg -deploy-agents --platform warp --mode marketing

# Factory AI (creates .factory/droids/)
aiwg -deploy-agents --provider factory --mode marketing --deploy-commands

# OpenAI/Codex (creates .codex/agents/)
aiwg -deploy-agents --provider openai --mode marketing
```

## Quick Start

### 1. Initialize Marketing Campaign

**Option A: New Campaign** (from description)

```bash
# Generate campaign intake with interactive questions
/marketing-intake-wizard "Q1 Product Launch - Enterprise CRM" --interactive

# Or quick mode with guidance
/marketing-intake-wizard "Product launch" --guidance "B2B SaaS, $100k budget, 8-week timeline"
```

**Option B: Existing Campaign** (from materials)

```bash
# Analyze existing campaign assets and generate intake
/intake-from-campaign ./campaign-assets --interactive
```

**Option C: Manual Intake** (validate existing)

```bash
# If you manually created intake files, validate and start
/intake-start-campaign .aiwg/marketing/intake/
```

### 2. Start Strategy Phase

```bash
# Proceed directly to Strategy (intake already validated by wizard commands)
/flow-strategy-baseline

# Or use natural language
# "Start Strategy phase" or "Let's plan this campaign"
```

### 3. Check Campaign Status

```bash
# View current phase and next steps
/campaign-status
```

### 4. Progress Through Phases

```bash
# When Strategy complete, transition to Creation
/flow-strategy-to-creation

# Generate content from strategy
/generate-content-calendar --channels "blog,social,email,pr" --duration "60 days"
```

### 5. Launch Campaign

```bash
# Validate brand and legal compliance
/brand-validate ./campaign-assets/
/legal-clearance ./campaign-assets/

# Transition to Publication
/flow-review-to-publication
```

### 6. Analyze Performance

```bash
# Measure campaign performance
/flow-performance-optimization

# Generate performance report
/export-campaign-report --include-metrics
```

## Research-Backed Best Practices

The MMK framework incorporates industry best practices from:

### Media Kit Standards
- **Digital-first delivery**: Self-service downloads < 3 clicks
- **Technical specifications**: Images 2000px minimum, 300 DPI; Video 1080p+
- **Mobile optimization**: 60%+ journalist access on mobile
- **Accessibility**: WCAG 2.1 AA compliance minimum
- **Video preference**: 68% journalist preference for B-roll

### Marketing Campaign Frameworks
- **RACE methodology**: Reach → Act → Convert → Engage
- **Agile marketing**: 2-week sprint cadence for campaign execution
- **Privacy-first measurement**: First-party data, Marketing Mix Modeling (MMM)
- **Incrementality testing**: Channel validation and optimization

### Brand Guidelines
- **Living systems**: Dynamic guidelines vs. static PDFs
- **Design tokens**: Automated brand consistency
- **Voice dimensional framework**: Scales and dimensions vs. rigid rules
- **AI-era considerations**: Brand voice training for LLMs
- **Inclusive language**: Built-in accessibility and inclusivity

### Performance Measurement
- **Privacy-compliant attribution**: Post-cookie tracking strategies
- **Marketing Mix Modeling**: Aggregate channel contribution analysis
- **Incrementality testing**: True lift measurement
- **First-party data**: Cookie-less tracking infrastructure

## Framework Extensions

### Compliance Add-Ons

**FTC Compliance** (`add-ons/compliance/ftc/`):
- Disclosure requirements for endorsements
- Influencer partnership compliance
- Native advertising standards
- Truth in advertising validation

**GDPR Marketing** (`add-ons/compliance/gdpr-marketing/`):
- Consent management
- Data processing agreements
- Privacy policy templates
- Cookie compliance

**Industry-Specific** (`add-ons/compliance/industry/`):
- Healthcare (HIPAA marketing compliance)
- Financial services (FINRA, SEC)
- Pharmaceuticals (FDA promotional rules)
- Legal services (attorney advertising rules)

### Integration Add-Ons

**Platform Integrations** (`add-ons/integrations/`):
- Marketing automation (HubSpot, Marketo, Pardot)
- Social platforms (Meta, LinkedIn, Twitter/X)
- Email platforms (Mailchimp, SendGrid, Klaviyo)
- Analytics (Google Analytics 4, Mixpanel, Amplitude)
- CRM (Salesforce, HubSpot CRM, Pipedrive)

## Success Metrics

**Campaign Velocity**:
- Strategy to launch: 6-8 weeks (vs. 12-16 weeks industry average)
- Content creation: 50% faster with template-driven workflows
- Approval cycles: 30% reduction with multi-agent review

**Quality Standards**:
- 100% brand compliance before publication
- Zero legal rejections post-review
- WCAG 2.1 AA accessibility compliance
- < 2% content revision rate after multi-agent review

**Performance**:
- KPI tracking configured 100% of campaigns
- Attribution modeling documented
- Optimization recommendations data-driven
- ROI measurement standardized

## Limitations

The MMK framework provides:
- Templates and workflows (not execution tools)
- Best practice guidance (not creative inspiration)
- Compliance validation (not legal advice)
- Performance frameworks (not analytics platforms)

For complete marketing execution, integrate with:
- Marketing automation platforms
- Social media management tools
- Email service providers
- Analytics and attribution tools
- Digital asset management systems

## Support and Resources

- **Repository**: https://github.com/jmagly/aiwg
- **Framework Documentation**: `/agentic/code/frameworks/media-marketing-kit/`
- **Research Findings**: `.aiwg/planning/mmk-research/RESEARCH-SYNTHESIS.md`
- **Template Library**: `/templates/`
- **Agent Catalog**: `/agents/`
- **Issues**: https://github.com/jmagly/aiwg/issues
- **Discussions**: https://github.com/jmagly/aiwg/discussions

## Contributing

See the parent repository's `AGENTS.md` for contribution guidelines.

## License

Part of the AIWG repository. See main repository for license information.

---

**Framework Version**: 1.0.0
**Last Updated**: 2025-01-28
**Status**: Production-ready for marketing campaign management
