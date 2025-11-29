# Media/Marketing Kit Framework - Comprehensive Plan

**Document ID**: PLAN-MMK-001
**Version**: 1.0-draft
**Created**: 2025-01-28
**Status**: PROPOSED
**Owner**: Framework Architecture Team

---

## Executive Summary

This document presents a comprehensive plan for developing the **Media/Marketing Kit (MMK) Framework** - a new AIWG framework module designed to help teams assemble media kits, marketing decks, campaign materials, and other supporting collateral through multi-agent orchestration.

The framework follows the proven architectural patterns established by the SDLC-Complete framework, adapting them for the unique lifecycle and workflows of media/marketing content production.

---

## 1. Framework Overview

### 1.1 Purpose

The MMK Framework provides:
- **Structured workflows** for media kit and marketing material creation
- **Specialized agents** for distinct marketing/media roles
- **Template library** covering all common marketing artifacts
- **Quality gates** ensuring brand consistency and compliance
- **Multi-agent orchestration** for parallel content development and review

### 1.2 Target Users

| User Type | Primary Use Cases |
|-----------|-------------------|
| Marketing Teams | Campaign planning, content production, brand management |
| Communications | Press releases, media kits, executive communications |
| Product Marketing | Launch materials, positioning, competitive analysis |
| Creative Teams | Asset production, design briefs, brand compliance |
| Agencies | Client deliverables, campaign proposals, reporting |
| Startups/Solo | Pitch decks, investor materials, launch kits |

### 1.3 Framework Principles

Aligned with AIWG core philosophy:
1. **Accuracy Over Enhancement** - Real metrics, actual results, honest assessments
2. **Brand Authority** - Consistent voice without marketing fluff
3. **Specific Beats General** - Named customers, actual numbers, concrete examples
4. **Natural Variation** - Avoid templated, formulaic content patterns
5. **Include Reality** - Acknowledge limitations, competitive context, trade-offs

---

## 2. Framework Architecture

### 2.1 Directory Structure

```
agentic/code/frameworks/media-marketing-kit/
├── README.md                           # Framework overview
├── plan-act-mmk.md                     # Lifecycle phases & milestones
├── actors-and-templates.md             # Role→Template mappings
├── prompt-templates.md                 # Copy-ready prompts by phase
├── aiwg-marketing-structure.md         # Marketing artifact directory layout
│
├── agents/                             # 35-45 specialized agents
│   ├── manifest.json
│   ├── README.md
│   │
│   ├── # Strategy Agents
│   ├── brand-strategist.md
│   ├── campaign-strategist.md
│   ├── market-researcher.md
│   ├── competitive-analyst.md
│   ├── audience-analyst.md
│   ├── positioning-specialist.md
│   │
│   ├── # Content Creation Agents
│   ├── content-strategist.md
│   ├── copywriter.md
│   ├── technical-copywriter.md
│   ├── social-media-specialist.md
│   ├── email-marketing-specialist.md
│   ├── seo-specialist.md
│   ├── video-scriptwriter.md
│   ├── podcast-producer.md
│   │
│   ├── # Creative/Design Agents
│   ├── creative-director.md
│   ├── visual-designer.md
│   ├── brand-guardian.md
│   ├── ux-copywriter.md
│   ├── presentation-designer.md
│   │
│   ├── # Communications Agents
│   ├── pr-specialist.md
│   ├── media-relations-specialist.md
│   ├── executive-communications.md
│   ├── crisis-communications.md
│   ├── internal-communications.md
│   │
│   ├── # Production Agents
│   ├── production-coordinator.md
│   ├── asset-manager.md
│   ├── localization-specialist.md
│   ├── qa-reviewer.md
│   │
│   ├── # Analytics Agents
│   ├── marketing-analyst.md
│   ├── performance-analyst.md
│   ├── attribution-specialist.md
│   ├── reporting-specialist.md
│   │
│   ├── # Compliance/Legal Agents
│   ├── legal-reviewer.md
│   ├── compliance-specialist.md
│   ├── accessibility-reviewer.md
│   │
│   ├── # Orchestration Agents
│   ├── campaign-coordinator.md
│   ├── content-synthesizer.md
│   └── review-synthesizer.md
│
├── commands/                           # 20-25 orchestration commands
│   ├── manifest.json
│   ├── README.md
│   │
│   ├── # Intake & Planning Commands
│   ├── campaign-intake.md
│   ├── media-kit-wizard.md
│   ├── brand-audit.md
│   │
│   ├── # Phase Flow Commands
│   ├── flow-strategy-to-creation.md
│   ├── flow-creation-to-review.md
│   ├── flow-review-to-publication.md
│   ├── flow-publication-to-analysis.md
│   │
│   ├── # Workflow Commands
│   ├── flow-press-release-cycle.md
│   ├── flow-campaign-launch.md
│   ├── flow-content-review-cycle.md
│   ├── flow-brand-compliance-check.md
│   ├── flow-competitive-analysis.md
│   ├── flow-crisis-response.md
│   │
│   ├── # Utility Commands
│   ├── generate-media-kit.md
│   ├── generate-pitch-deck.md
│   ├── generate-campaign-brief.md
│   ├── check-brand-compliance.md
│   ├── campaign-status.md
│   └── content-health-check.md
│
├── templates/                          # 100+ artifact templates
│   ├── manifest.json
│   ├── card-metadata-standard.md
│   │
│   ├── intake/                         # Campaign/project intake
│   │   ├── campaign-intake-form.md
│   │   ├── brand-brief.md
│   │   ├── audience-profile.md
│   │   └── project-scope.md
│   │
│   ├── strategy/                       # Strategic planning
│   │   ├── campaign-strategy.md
│   │   ├── messaging-matrix.md
│   │   ├── positioning-statement.md
│   │   ├── competitive-analysis.md
│   │   ├── audience-segmentation.md
│   │   ├── channel-strategy.md
│   │   └── content-calendar.md
│   │
│   ├── brand/                          # Brand assets & guidelines
│   │   ├── brand-guidelines.md
│   │   ├── voice-tone-guide.md
│   │   ├── messaging-framework.md
│   │   ├── brand-story.md
│   │   ├── elevator-pitch.md
│   │   └── boilerplate-library.md
│   │
│   ├── content/                        # Content artifacts
│   │   ├── blog-post-template.md
│   │   ├── case-study-template.md
│   │   ├── whitepaper-template.md
│   │   ├── ebook-template.md
│   │   ├── infographic-brief.md
│   │   ├── video-script-template.md
│   │   ├── podcast-outline.md
│   │   └── newsletter-template.md
│   │
│   ├── social/                         # Social media
│   │   ├── social-post-card.md
│   │   ├── social-campaign-brief.md
│   │   ├── platform-playbook.md
│   │   ├── hashtag-strategy.md
│   │   └── community-guidelines.md
│   │
│   ├── email/                          # Email marketing
│   │   ├── email-campaign-brief.md
│   │   ├── email-template.md
│   │   ├── nurture-sequence.md
│   │   ├── newsletter-template.md
│   │   └── email-performance-report.md
│   │
│   ├── advertising/                    # Paid media
│   │   ├── ad-campaign-brief.md
│   │   ├── ad-copy-card.md
│   │   ├── media-plan.md
│   │   ├── audience-targeting.md
│   │   └── ad-performance-report.md
│   │
│   ├── pr-communications/              # PR & comms
│   │   ├── press-release-template.md
│   │   ├── media-kit-template.md
│   │   ├── media-pitch.md
│   │   ├── press-briefing.md
│   │   ├── spokesperson-guide.md
│   │   ├── qa-document.md
│   │   ├── crisis-response-plan.md
│   │   └── media-contact-list.md
│   │
│   ├── sales-enablement/               # Sales support
│   │   ├── pitch-deck-template.md
│   │   ├── one-pager.md
│   │   ├── battle-card.md
│   │   ├── roi-calculator-brief.md
│   │   ├── demo-script.md
│   │   └── objection-handling.md
│   │
│   ├── product-marketing/              # Product marketing
│   │   ├── product-launch-plan.md
│   │   ├── feature-announcement.md
│   │   ├── product-positioning.md
│   │   ├── pricing-page-copy.md
│   │   └── comparison-matrix.md
│   │
│   ├── events/                         # Events & webinars
│   │   ├── event-brief.md
│   │   ├── webinar-plan.md
│   │   ├── speaker-brief.md
│   │   ├── event-promotion-plan.md
│   │   └── post-event-report.md
│   │
│   ├── analytics/                      # Measurement & reporting
│   │   ├── measurement-plan.md
│   │   ├── kpi-dashboard-spec.md
│   │   ├── campaign-report.md
│   │   ├── monthly-report.md
│   │   ├── attribution-model.md
│   │   └── competitive-tracking.md
│   │
│   ├── creative/                       # Creative production
│   │   ├── creative-brief.md
│   │   ├── design-spec.md
│   │   ├── asset-requirements.md
│   │   ├── photography-brief.md
│   │   ├── video-production-brief.md
│   │   └── asset-card.md
│   │
│   ├── governance/                     # Governance & compliance
│   │   ├── approval-workflow.md
│   │   ├── brand-compliance-checklist.md
│   │   ├── legal-review-checklist.md
│   │   ├── accessibility-checklist.md
│   │   └── content-audit-template.md
│   │
│   └── operations/                     # Operations & management
│       ├── campaign-card.md
│       ├── content-card.md
│       ├── asset-card.md
│       ├── vendor-brief.md
│       ├── agency-brief.md
│       └── budget-tracker.md
│
├── flows/                              # Phase workflow documentation
│   ├── README.md
│   ├── phase-overview.md
│   ├── gate-criteria-by-phase.md
│   ├── strategy-phase.md
│   ├── creation-phase.md
│   ├── review-phase.md
│   ├── publication-phase.md
│   └── analysis-phase.md
│
├── docs/                               # Documentation
│   ├── README.md
│   ├── orchestrator-architecture.md
│   ├── multi-agent-content-pattern.md
│   ├── simple-language-translations.md
│   ├── brand-voice-calibration.md
│   ├── channel-specific-guidance.md
│   └── integration-guide.md
│
├── config/                             # Configuration
│   ├── models.json
│   ├── channels.json
│   └── brand-defaults.json
│
├── metrics/                            # Performance tracking
│   ├── content-health-catalog.md
│   ├── campaign-metrics.md
│   └── quality-indicators.md
│
├── add-ons/                            # Extensions
│   ├── compliance/
│   │   ├── ftc/                        # FTC advertising compliance
│   │   ├── gdpr-marketing/             # GDPR for marketing
│   │   └── industry/                   # Industry-specific (pharma, finance)
│   └── integrations/
│       ├── hubspot/
│       ├── marketo/
│       └── salesforce/
│
└── artifacts/                          # Sample projects
    ├── sample-product-launch/
    ├── sample-media-kit/
    └── sample-campaign/
```

### 2.2 Artifact Directory Structure (.aiwg/marketing/)

**IMPORTANT**: All AIWG frameworks output to the unified `.aiwg/` directory. The MMK framework uses `.aiwg/marketing/` as its primary subdirectory, with some artifacts in shared directories when appropriate.

```
.aiwg/
├── intake/                      # Shared: Project intake (SDLC + Marketing)
│   └── campaign-intake.md       # MMK: Campaign-specific intake
├── marketing/                   # MMK Framework Primary Directory
│   ├── strategy/                # Strategic planning artifacts
│   │   ├── campaign-strategy.md
│   │   ├── messaging-matrix.md
│   │   ├── channel-strategy.md
│   │   └── content-calendar.md
│   ├── brand/                   # Brand guidelines & assets references
│   │   ├── brand-guidelines.md
│   │   ├── voice-tone-guide.md
│   │   └── boilerplate-library.md
│   ├── content/                 # Content artifacts by type
│   │   ├── blog/
│   │   ├── social/
│   │   ├── email/
│   │   ├── video/
│   │   └── other/
│   ├── creative/                # Creative briefs & asset specs
│   ├── pr/                      # Press releases & media kits
│   ├── sales/                   # Sales enablement materials
│   ├── campaigns/               # Campaign-specific artifact bundles
│   │   └── [campaign-name]/     # All artifacts for a campaign
│   └── analytics/               # Marketing-specific reports
├── compliance/                  # Shared: Legal & compliance reviews
├── working/                     # Shared: Temporary drafts (safe to delete)
│   └── marketing/               # MMK working drafts
├── archive/                     # Shared: Completed work
│   └── campaigns/               # Archived campaigns
└── reports/                     # Shared: Generated reports & indices
    └── marketing/               # MMK reports
```

**Shared vs. Framework-Specific Directories:**

| Directory | Ownership | Usage |
|-----------|-----------|-------|
| `.aiwg/intake/` | Shared | Campaign intake forms alongside project intake |
| `.aiwg/marketing/` | MMK | All marketing-specific artifacts |
| `.aiwg/compliance/` | Shared | Legal reviews (SDLC + Marketing) |
| `.aiwg/working/` | Shared | Temp files with framework subdirs |
| `.aiwg/reports/` | Shared | Reports with framework subdirs |
| `.aiwg/archive/` | Shared | Archived artifacts with framework subdirs |

This unified structure allows:
- Cross-framework artifact sharing (e.g., product launch links SDLC release to marketing campaign)
- Single `.gitignore` strategy for all AIWG artifacts
- Consistent tooling across frameworks
- Clear ownership boundaries within shared directories

---

## 3. Lifecycle Model

### 3.1 Five-Phase Model

Unlike SDLC's four phases, marketing workflows follow five phases:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  STRATEGY   │ ──► │  CREATION   │ ──► │   REVIEW    │ ──► │ PUBLICATION │ ──► │  ANALYSIS   │
│   Phase     │     │   Phase     │     │   Phase     │     │   Phase     │     │   Phase     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     │                   │                   │                   │                   │
     ▼                   ▼                   ▼                   ▼                   ▼
  Strategy           Content              Brand &            Go-Live            Performance
  Baseline           Complete            Legal OK            Ready               Review
   (SB)               (CC)                (BL)               (GL)                (PR)
```

### 3.2 Phase Details

| Phase | Duration | Objectives | Primary Artifacts | Milestone |
|-------|----------|------------|-------------------|-----------|
| **Strategy** | 1-2 weeks | Define goals, audience, messaging, channels | Campaign brief, strategy doc, messaging matrix | Strategy Baseline (SB) |
| **Creation** | 2-4 weeks | Produce content, creative assets, copy | Content drafts, asset files, copy decks | Content Complete (CC) |
| **Review** | 1-2 weeks | Brand, legal, stakeholder approval | Compliance reports, approval records | Brand & Legal OK (BL) |
| **Publication** | 1-3 days | Deploy, schedule, launch | Published content, launch checklist | Go-Live Ready (GL) |
| **Analysis** | Ongoing | Measure, report, optimize | Performance reports, insights | Performance Review (PR) |

### 3.3 Phase Gate Criteria

#### Strategy Baseline (SB) Exit Criteria
- [ ] Campaign objectives defined with measurable KPIs
- [ ] Target audience documented with personas
- [ ] Messaging matrix approved by stakeholders
- [ ] Channel strategy defined
- [ ] Content calendar drafted
- [ ] Budget allocated
- [ ] Success metrics defined

#### Content Complete (CC) Exit Criteria
- [ ] All content pieces drafted
- [ ] Creative assets produced
- [ ] Copy complete and proofread
- [ ] Internal review complete
- [ ] Assets organized and named properly
- [ ] Version control established

#### Brand & Legal OK (BL) Exit Criteria
- [ ] Brand compliance verified
- [ ] Legal review complete
- [ ] Accessibility check passed
- [ ] Stakeholder sign-off obtained
- [ ] Regulatory compliance verified (if applicable)
- [ ] Final versions locked

#### Go-Live Ready (GL) Exit Criteria
- [ ] All assets uploaded to platforms
- [ ] UTM parameters configured
- [ ] Tracking verified
- [ ] Launch schedule confirmed
- [ ] Team briefed
- [ ] Rollback plan documented

#### Performance Review (PR) Exit Criteria
- [ ] Initial performance data collected
- [ ] KPIs measured against targets
- [ ] Insights documented
- [ ] Optimization recommendations made
- [ ] Campaign retrospective complete
- [ ] Learnings archived

---

## 4. Agent Roster

### 4.1 Agent Categories & Model Assignments

| Category | Agent | Model | Primary Responsibility |
|----------|-------|-------|----------------------|
| **Strategy** | brand-strategist | opus | Brand positioning, identity evolution |
| | campaign-strategist | opus | Campaign architecture, channel mix |
| | market-researcher | sonnet | Market analysis, trend identification |
| | competitive-analyst | sonnet | Competitor monitoring, differentiation |
| | audience-analyst | sonnet | Persona development, segmentation |
| | positioning-specialist | opus | Value prop, messaging hierarchy |
| **Content** | content-strategist | opus | Content planning, editorial direction |
| | copywriter | sonnet | Marketing copy, headlines, CTAs |
| | technical-copywriter | sonnet | Product copy, technical explanations |
| | social-media-specialist | sonnet | Platform-native content, engagement |
| | email-marketing-specialist | sonnet | Email campaigns, sequences |
| | seo-specialist | sonnet | SEO optimization, keyword strategy |
| | video-scriptwriter | sonnet | Video scripts, storyboards |
| **Creative** | creative-director | opus | Creative vision, design direction |
| | visual-designer | sonnet | Design specs, visual briefs |
| | brand-guardian | sonnet | Brand compliance verification |
| | presentation-designer | sonnet | Deck structure, visual flow |
| **Communications** | pr-specialist | sonnet | Press releases, media relations |
| | executive-communications | opus | C-level communications, speeches |
| | crisis-communications | opus | Crisis response, reputation management |
| **Production** | production-coordinator | haiku | Asset management, workflow tracking |
| | localization-specialist | sonnet | Translation, cultural adaptation |
| | qa-reviewer | haiku | Proofreading, link checking |
| **Analytics** | marketing-analyst | sonnet | Performance analysis, attribution |
| | reporting-specialist | haiku | Report generation, dashboards |
| **Compliance** | legal-reviewer | sonnet | Legal compliance, claim verification |
| | compliance-specialist | sonnet | Regulatory compliance, disclosures |
| | accessibility-reviewer | haiku | WCAG compliance, accessibility |
| **Orchestration** | campaign-coordinator | sonnet | Workflow orchestration |
| | content-synthesizer | sonnet | Multi-source content merging |
| | review-synthesizer | sonnet | Review feedback consolidation |

### 4.2 Agent Definition Format

Following SDLC agent patterns:

```yaml
---
name: Campaign Strategist
description: Designs campaign architecture, channel strategy, and measurement frameworks for marketing initiatives
model: opus
tools: Read, Write, MultiEdit, Bash, WebFetch, Glob, Grep
---

# Campaign Strategist

You are a Campaign Strategist responsible for designing comprehensive marketing campaign architectures...

## Your Process

### CONTEXT ANALYSIS
- Review brand guidelines and voice documentation
- Analyze target audience profiles and personas
- Understand business objectives and constraints
- Review competitive landscape

### STRATEGY DEVELOPMENT
- Define campaign objectives with measurable KPIs
- Design channel mix and content distribution strategy
- Create messaging hierarchy and key themes
- Develop content calendar and milestone timeline

### DELIVERABLES
- Campaign Strategy Document (.aiwg/marketing/strategy/campaign-strategy.md)
- Messaging Matrix (.aiwg/marketing/strategy/messaging-matrix.md)
- Channel Strategy (.aiwg/marketing/strategy/channel-strategy.md)
- Content Calendar (.aiwg/marketing/strategy/content-calendar.md)

## Patterns
[Mermaid diagrams, framework examples]

## Usage Examples
[2-3 realistic scenarios]

## Limitations
[Honest constraints]

## Success Metrics
[Measurable outcomes]
```

---

## 5. Command Structure

### 5.1 Command Categories

| Category | Commands | Purpose |
|----------|----------|---------|
| **Intake** | campaign-intake, media-kit-wizard, brand-audit | Initialize campaigns/projects |
| **Phase Flows** | flow-strategy-to-creation, flow-creation-to-review, flow-review-to-publication, flow-publication-to-analysis | Phase transitions |
| **Workflows** | flow-press-release-cycle, flow-campaign-launch, flow-content-review-cycle, flow-brand-compliance-check | Specific workflow orchestration |
| **Generators** | generate-media-kit, generate-pitch-deck, generate-campaign-brief | Artifact generation |
| **Utilities** | check-brand-compliance, campaign-status, content-health-check | Status and validation |

### 5.2 Natural Language Translations

Users interact naturally; commands translate automatically:

| User Says | Translates To |
|-----------|---------------|
| "Start new campaign" | `/campaign-intake` |
| "Create media kit" | `/generate-media-kit` |
| "Build pitch deck" | `/generate-pitch-deck` |
| "Move to content creation" | `/flow-strategy-to-creation` |
| "Ready for review" | `/flow-creation-to-review` |
| "Check brand compliance" | `/flow-brand-compliance-check` |
| "Launch campaign" | `/flow-campaign-launch` |
| "How's the campaign doing?" | `/campaign-status` |
| "Write press release" | `/flow-press-release-cycle` |
| "Prepare for crisis" | `/flow-crisis-response` |

---

## 6. Multi-Agent Orchestration Patterns

### 6.1 Standard Content Production Workflow

```
Step 1: Strategy Definition
  └── Task(campaign-strategist) → Campaign brief, messaging matrix

Step 2: Parallel Content Creation (SINGLE MESSAGE, MULTIPLE TASKS)
  ├── Task(copywriter) → Marketing copy
  ├── Task(social-media-specialist) → Social content
  ├── Task(email-marketing-specialist) → Email sequences
  └── Task(visual-designer) → Creative briefs

Step 3: Parallel Review (SINGLE MESSAGE, MULTIPLE TASKS)
  ├── Task(brand-guardian) → Brand compliance
  ├── Task(legal-reviewer) → Legal compliance
  ├── Task(qa-reviewer) → Quality check
  └── Task(accessibility-reviewer) → Accessibility

Step 4: Synthesis
  └── Task(review-synthesizer) → Consolidated feedback

Step 5: Revision & Finalization
  └── Task(content-synthesizer) → Final content package

Step 6: Archive
  └── Write to .aiwg/marketing/campaigns/[campaign]/
```

### 6.2 Media Kit Generation Workflow

```
Input: Company info, news angle, target media
  │
  ├── Task(pr-specialist) → Press release draft
  │
  ├── [PARALLEL]
  │   ├── Task(copywriter) → Company boilerplate
  │   ├── Task(executive-communications) → Executive quotes
  │   └── Task(visual-designer) → Asset list spec
  │
  ├── [PARALLEL REVIEW]
  │   ├── Task(brand-guardian) → Brand check
  │   └── Task(legal-reviewer) → Legal check
  │
  └── Task(content-synthesizer) → Assembled media kit
      │
      └── Output: .aiwg/marketing/pr/media-kit-[date].md
```

---

## 7. Template Highlights

### 7.1 Card Templates (Atomic Work Units)

**Campaign Card** (`templates/operations/campaign-card.md`)
```markdown
---
id: CAM-###
name: Campaign Name
type: campaign
status: draft | active | paused | complete
owner: [Role]
---

# Campaign: {name}

## Overview
- **Objective**:
- **Target Audience**:
- **Channels**:
- **Timeline**: [start] - [end]
- **Budget**: $

## KPIs
| Metric | Target | Actual |
|--------|--------|--------|
| | | |

## Content Assets
- [ ] Asset 1
- [ ] Asset 2

## Related
- Strategy: [link]
- Content: [links]
- Reports: [links]
```

**Content Card** (`templates/operations/content-card.md`)
```markdown
---
id: CNT-###
name: Content Title
type: blog | social | email | video | ...
status: draft | review | approved | published
owner: [Role]
campaign: CAM-###
---

# Content: {name}

## Specifications
- **Format**:
- **Word Count**:
- **Target Publish**:
- **Channel**:

## Brief
[Content brief]

## Draft
[Content draft]

## Review Status
- [ ] Brand compliance
- [ ] Legal review
- [ ] Final approval
```

### 7.2 Key Document Templates

| Template | Purpose | Primary Agent |
|----------|---------|---------------|
| campaign-strategy.md | Campaign architecture & objectives | campaign-strategist |
| messaging-matrix.md | Key messages by audience/channel | positioning-specialist |
| press-release-template.md | Standard press release format | pr-specialist |
| media-kit-template.md | Complete media kit structure | pr-specialist |
| pitch-deck-template.md | Investor/sales presentation | presentation-designer |
| creative-brief.md | Design/creative direction | creative-director |
| case-study-template.md | Customer success story | copywriter |
| campaign-report.md | Performance analysis | marketing-analyst |

---

## 8. Integration Points

### 8.1 AIWG Core Integration

The MMK framework integrates with AIWG writing guide:
- **Validation**: Content checked against `validation/banned-patterns.md`
- **Voice Calibration**: Uses `context/` voice guides for tone
- **Authenticity**: Follows `core/philosophy.md` principles

### 8.2 SDLC Framework Integration

For product launches and technical content:
- **Product Marketing**: Links to SDLC release artifacts
- **Technical Content**: References architecture documentation
- **Cross-functional**: Shares templates with documentation efforts

### 8.3 External Tool Integration (Add-ons)

| Integration | Purpose |
|-------------|---------|
| HubSpot | Campaign tracking, email automation |
| Marketo | Lead scoring, nurture sequences |
| Salesforce | CRM data, pipeline tracking |
| Google Analytics | Performance measurement |
| Social platforms | Native publishing, analytics |

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Create directory structure
- [ ] Write framework README.md
- [ ] Define phase model documentation
- [ ] Create card-metadata-standard.md
- [ ] Build manifest system

### Phase 2: Core Templates (Week 2-3)
- [ ] Intake templates (4)
- [ ] Strategy templates (7)
- [ ] Brand templates (6)
- [ ] Content templates (8)
- [ ] Operations templates (6)

### Phase 3: Agent Development (Week 3-4)
- [ ] Strategy agents (6)
- [ ] Content agents (8)
- [ ] Creative agents (4)
- [ ] Communications agents (5)
- [ ] Review/compliance agents (4)
- [ ] Orchestration agents (3)

### Phase 4: Commands & Flows (Week 4-5)
- [ ] Intake commands (3)
- [ ] Phase flow commands (4)
- [ ] Workflow commands (6)
- [ ] Generator commands (4)
- [ ] Utility commands (3)

### Phase 5: Documentation & Polish (Week 5-6)
- [ ] Orchestrator architecture doc
- [ ] Multi-agent patterns doc
- [ ] Natural language translations
- [ ] Channel-specific guidance
- [ ] Sample artifacts

### Phase 6: Testing & Refinement (Week 6-7)
- [ ] End-to-end workflow tests
- [ ] Template validation
- [ ] Agent interaction tests
- [ ] User acceptance testing

---

## 10. Success Metrics

### Framework Adoption
- Number of projects using MMK framework
- Template usage frequency
- Agent invocation patterns

### Quality Indicators
- Content passing brand compliance on first review
- Time from strategy to publication
- Revision cycles before approval

### User Satisfaction
- Ease of use ratings
- Time savings vs. manual process
- Content quality scores

---

## 11. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep in templates | High | Medium | Prioritize core templates, add-on system for extensions |
| Agent overlap/confusion | Medium | Medium | Clear responsibility matrix, distinct naming |
| Integration complexity | Medium | High | Modular design, optional add-ons |
| Brand voice inconsistency | High | High | Brand guardian agent, compliance gates |
| Adoption resistance | Medium | Medium | Clear documentation, quick-start guides |

---

## 12. Open Questions

1. **Brand Configuration**: How should per-project brand voice be configured?
2. **Asset Management**: Should framework include DAM (Digital Asset Management) patterns?
3. **Approval Workflows**: How complex should approval routing be?
4. **Localization**: Priority level for multi-language support?
5. **Analytics Integration**: Depth of analytics tool integration?

---

## 13. Research-Informed Additions

Based on comprehensive research of industry best practices and tools (see `mmk-research/` for full documentation), the following additions are required:

### 13.1 Media Kit Best Practices (Research-Informed)

**Essential Technical Standards**:
- Images: Minimum 2000px width, 300 DPI
- Video: 1080p minimum (4K preferred for B-roll)
- Logos: SVG/EPS vector required + PNG raster versions
- Page load: Under 2 seconds target
- Mobile: 60%+ journalist access is mobile

**Modern Requirements**:
- Video B-roll (68% journalist preference over stills)
- Self-service downloads (< 3 clicks to asset)
- WCAG 2.1 AA accessibility compliance
- Embargo management workflow
- Chronological press release archive

**Sources**: Cision State of Media Report, Muck Rack Journalist Survey, PR Newswire Best Practices

### 13.2 Campaign Planning Framework (Research-Informed)

**Recommended: RACE Framework**
| Phase | Focus | Key Activities |
|-------|-------|----------------|
| Plan | Strategy | Goals, audience, positioning |
| Reach | Awareness | SEO, social, PR, advertising |
| Act | Engagement | Content, lead magnets, landing pages |
| Convert | Conversion | Email sequences, offers, CTAs |
| Engage | Loyalty | Retention, advocacy, community |

**Agile Marketing Integration**:
- 2-week sprint cadence (recommended)
- Sprint goal = single campaign objective
- Daily standups (15 min max)
- Sprint retrospectives for improvement

**Sources**: Smart Insights, CoSchedule, Agile Sherpas

### 13.3 Privacy-First Measurement (2024-2025 Critical)

**Context**: Third-party cookie deprecation requires new approaches

**Recommended Solutions**:
| Solution | Best For |
|----------|----------|
| First-Party Data | All brands (consent-based) |
| Marketing Mix Modeling (MMM) | Long sales cycles, offline |
| Incrementality Testing | Proving channel value |
| Clean Rooms | Enterprise partnerships |
| AI/ML Attribution | Complex multi-touch journeys |

**Sources**: Marketing Evolution, Chariot Creative, Factors.ai

### 13.4 Brand Guidelines Evolution (Research-Informed)

**Modern Brand System Requirements**:
- Living/dynamic guidelines (not static PDFs)
- Design tokens for automated tool sync
- Voice dimensional framework (scales, not rigid rules)
- Channel-specific adaptations
- Inclusive language requirements
- AI-era brand voice documentation

**Governance Models**:
- **Centralized**: Brand team controls all assets
- **Federated**: Regional/product variations permitted
- **Open Source**: Community-driven evolution

**Sources**: Frontify, Bynder, Nielsen Norman Group

---

## 14. CLI/Installer Requirements

### 14.1 Discrete Framework Installation

**Requirement**: Users should be able to install SDLC or MMK frameworks independently.

**Proposed CLI Updates**:
```bash
# Scaffold SDLC-only project
aiwg -new --framework sdlc

# Scaffold Marketing-only project
aiwg -new --framework marketing

# Scaffold combined project (product launch)
aiwg -new --framework all

# Deploy agents for specific framework
aiwg -deploy-agents --mode marketing
aiwg -deploy-commands --mode marketing
```

### 14.2 Mode Extension

**Current**: `--mode general|sdlc|both`

**Proposed**: `--mode general|sdlc|marketing|all`

| Mode | Description |
|------|-------------|
| `general` | Writing agents only |
| `sdlc` | SDLC Complete framework |
| `marketing` | Media/Marketing Kit framework |
| `all` | All frameworks combined |

### 14.3 Unified Output Directory

Both frameworks output to `.aiwg/` with framework-specific subdirectories:
- SDLC artifacts → `.aiwg/requirements/`, `.aiwg/architecture/`, etc.
- Marketing artifacts → `.aiwg/marketing/strategy/`, `.aiwg/marketing/content/`, etc.
- Shared → `.aiwg/intake/`, `.aiwg/compliance/`, `.aiwg/working/`

### 14.4 Implementation Tasks

| Task | Priority | Estimate |
|------|----------|----------|
| Update deploy-agents.mjs (add marketing mode) | High | 3 days |
| Update new-project.mjs (framework selection) | High | 2 days |
| Create MMK CLAUDE.md template | High | 2 days |
| Update install.sh (framework-aware) | Medium | 1 day |
| Documentation updates | Medium | 2 days |

**Full specification**: See `mmk-research/cli-installer-requirements.md`

---

## 15. Research Documentation

### Research Files Created

| File | Content |
|------|---------|
| `mmk-research/media-kit-best-practices.md` | Industry standards, distribution, accessibility |
| `mmk-research/media-kit-tools-analysis.md` | Platform features, market gaps, pricing |
| `mmk-research/marketing-campaign-best-practices.md` | RACE framework, agile marketing, attribution |
| `mmk-research/brand-guidelines-best-practices.md` | Modern brand systems, voice documentation |
| `mmk-research/cli-installer-requirements.md` | Technical requirements for discrete installation |
| `mmk-research/RESEARCH-SYNTHESIS.md` | Consolidated findings and recommendations |

### Key Sources Cited

**Media Kit & PR**:
- [Cision State of Media Report](https://www.cision.com/resources/research-reports/)
- [Muck Rack Journalist Survey](https://muckrack.com/blog/journalist-survey)
- [Prezly Newsroom Guide](https://www.prezly.com/academy)
- [PR Newswire Best Practices](https://www.prnewswire.com/resources/)

**Campaign Planning**:
- [Smart Insights RACE Framework](https://www.smartinsights.com/digital-marketing-strategy/organize-campaign-plan-race-framework/)
- [CoSchedule Agile Marketing](https://coschedule.com/agile-marketing-guide/sprint-planning)
- [Improvado Campaign Best Practices](https://improvado.io/blog/marketing-campaigns-best-practices)

**Attribution & Analytics**:
- [Marketing Evolution Cookieless Attribution](https://www.marketingevolution.com/knowledge-center/marketing-attribution-cookieless-world)
- [Factors.ai Multi-Touch Attribution](https://www.factors.ai/blog/cookieless-multi-touch-attribution)
- [Chariot Creative First-Party Data](https://chariotcreative.com/blog/cookieless-attribution-in-marketing-first-party-data-strategies/)

**Brand Guidelines**:
- [Frontify Brand Guidelines](https://www.frontify.com/en/brand-guidelines/)
- [Bynder State of Branding](https://www.bynder.com/en/state-of-branding/)
- [Nielsen Norman Group Voice & Tone](https://www.nngroup.com/articles/tone-of-voice-dimensions/)

---

## 16. Appendices

### A. Template Count Summary

| Category | Template Count |
|----------|---------------|
| Intake | 4 |
| Strategy | 7 |
| Brand | 6 |
| Content | 8 |
| Social | 5 |
| Email | 5 |
| Advertising | 5 |
| PR/Communications | 8 |
| Sales Enablement | 6 |
| Product Marketing | 5 |
| Events | 5 |
| Analytics | 6 |
| Creative | 6 |
| Governance | 5 |
| Operations | 6 |
| **Total** | **~87 core templates** |

### B. Agent Count Summary

| Category | Agent Count |
|----------|-------------|
| Strategy | 6 |
| Content Creation | 8 |
| Creative/Design | 4 |
| Communications | 5 |
| Production | 4 |
| Analytics | 4 |
| Compliance | 3 |
| Orchestration | 3 |
| **Total** | **~37 agents** |

### C. Command Count Summary

| Category | Command Count |
|----------|---------------|
| Intake | 3 |
| Phase Flows | 4 |
| Workflows | 6 |
| Generators | 4 |
| Utilities | 3 |
| **Total** | **~20 commands** |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0-draft | 2025-01-28 | Framework Team | Initial draft |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Architecture Lead | | | |
| Content Lead | | | |
