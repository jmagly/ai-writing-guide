# Plan-Act Marketing Lifecycle Script

## Purpose

Equip PLAN → ACT marketing agents with a complete lifecycle playbook so they can deliver effective campaigns from a single creative brief prompt. Each activity lists the roles, artifacts, phases, and exit checks agents must satisfy before advancing.

## Intake & Creative Sprint

- **Trigger**: User provides a campaign idea, product launch, or marketing objective.
- **Roles**: Brand Strategist, Campaign Strategist, Creative Director (human or simulated agents).
- **Prompt**:

```text
Act as a marketing triad. Expand <campaign-idea> into:
- campaign goals and business objectives
- target audience personas and psychographics
- key messages and brand alignment
- channel mix and budget considerations
- creative concepts and execution approach
Return an initial campaign brief plus open questions for stakeholder review.
```

- **Outputs**: Campaign brief, audience profiles, messaging framework, channel strategy, budget outline.

## Lifecycle Phases and Major Milestones

| Phase | Marketing Objectives | Primary Disciplines | Lifecycle Milestone | Exit Criteria |
| --- | --- | --- | --- | --- |
| **Strategy** | Define goals, audience, messaging, positioning, channel mix | Strategy, Brand, Audience Research, Budget Planning | Strategy Baseline (SB) | Stakeholder agreement on goals, messaging, budget, and channel strategy |
| **Creation** | Produce content, creative assets, copy across all channels | Content Strategy, Copywriting, Creative Production, Asset Management | Content Complete (CC) | All assets created, copy written, creative briefs fulfilled, brand-compliant |
| **Review** | Validate brand compliance, legal clearance, stakeholder approval | Brand Governance, Legal Compliance, Quality Assurance, Accessibility | Brand & Legal OK (BL) | Brand, legal, accessibility approvals granted; required revisions complete |
| **Publication** | Deploy content, schedule posts, launch campaigns, activate channels | Production Coordination, Channel Management, Campaign Activation | Go-Live Ready (GL) | Content published/scheduled, tracking configured, launch checklist complete |
| **Analysis** | Measure performance, analyze results, optimize campaigns, report insights | Analytics, Performance Reporting, Optimization, A/B Testing | Performance Review (PR) | KPIs measured, insights documented, optimization recommendations delivered |

## Discipline Backlog for Agent To-Do Lists

| Discipline | Key Roles | PLAN Focus | ACT Deliverables | Cross-Checks |
| --- | --- | --- | --- | --- |
| Strategy | Brand Strategist, Campaign Strategist, Positioning Specialist | Define campaign goals, audience segments, messaging hierarchy, channel strategy | Campaign brief, messaging matrix, channel plan, budget allocation | Stakeholders approve strategy; aligns with brand architecture |
| Brand | Brand Guardian, Creative Director, Executive Communications | Validate brand alignment, tone consistency, visual identity adherence | Brand guidelines checklist, tone validation, visual style guide application | Brand governance sign-off; consistent with brand architecture |
| Audience Research | Marketing Analyst, Campaign Strategist | Profile target segments, psychographics, journey mapping, competitive landscape | Audience profiles, persona documents, journey maps, competitive analysis | Insights validated by data; segments actionable |
| Content Strategy | Content Strategist, SEO Specialist, Social Media Specialist | Plan content calendar, SEO optimization, content types per channel, distribution strategy | Content calendar, SEO briefs, channel content matrix, publishing schedule | Calendar aligns with campaign timeline; SEO targets set |
| Copywriting | Copywriter, Email Marketing Specialist, PR Specialist | Write headlines, body copy, CTAs, email sequences, social posts, PR materials | Ad copy, email templates, social posts, press releases, landing page copy | Copy reviewed for clarity, brand voice, legal compliance |
| Creative Production | Creative Director, Video Scriptwriter, Production Coordinator | Develop creative concepts, visual designs, video scripts, asset specifications | Creative briefs, design mockups, video scripts, asset specifications | Creative aligns with strategy; meets channel requirements |
| Asset Management | Production Coordinator, QA Reviewer | Organize assets, version control, file naming conventions, metadata tagging | Asset library, file organization system, metadata schema, version tracking | Assets accessible, properly tagged, versions controlled |
| Brand Governance | Brand Guardian, Legal Reviewer | Enforce brand standards, trademark usage, visual identity compliance, messaging consistency | Brand compliance report, trademark clearance, visual audit, messaging validation | Brand deviations flagged; trademarks cleared |
| Legal Compliance | Legal Reviewer, Accessibility Reviewer | Validate legal claims, disclosures, privacy compliance, accessibility standards | Legal clearance checklist, disclosure validation, privacy compliance report, accessibility audit | Legal approvals granted; WCAG/ADA compliant |
| Quality Assurance | QA Reviewer, Accessibility Reviewer, Brand Guardian | Review content quality, link validation, rendering checks, cross-device testing | QA checklist, link validation report, rendering test results, device compatibility | Quality gates passed; no critical defects |
| Production Coordination | Production Coordinator, Campaign Strategist | Schedule production timeline, coordinate handoffs, manage approvals, track dependencies | Production timeline, approval workflow, dependency tracker, launch checklist | Milestones met; handoffs clean; approvals tracked |
| Channel Management | Social Media Specialist, Email Marketing Specialist, PR Specialist | Configure channel settings, schedule content, set up tracking, activate campaigns | Channel configurations, scheduled posts, tracking setup, campaign activation | Channels configured; tracking validated; content scheduled |
| Analytics | Marketing Analyst, Reporting Specialist | Define KPIs, configure tracking, set up dashboards, establish baselines | KPI definitions, tracking implementation, analytics dashboard, performance baselines | Tracking verified; dashboards functional; baselines set |
| Performance Reporting | Reporting Specialist, Marketing Analyst | Measure campaign performance, analyze results, identify trends, generate insights | Performance reports, trend analysis, insight summaries, optimization recommendations | Reports accurate; insights actionable; stakeholders informed |
| Optimization | Marketing Analyst, Campaign Strategist, Content Strategist | A/B test hypotheses, iterate creative, refine targeting, optimize budget allocation | A/B test plans, optimization experiments, budget reallocation recommendations | Tests valid; optimizations data-driven; ROI improved |

Use the Markdown templates in `templates/` to instantiate each artifact; update file names to match the campaign or iteration context and record any tailoring in the Campaign Strategy.

## Detailed Phase Prompts

### 1. Strategy Phase Kickoff

```text
Role: Brand strategist + campaign strategist + creative director.
Goal: Establish the strategic baseline.
Instructions:
- validate campaign goals, business objectives, success metrics
- define target audience segments and personas
- develop messaging hierarchy and key themes
- outline channel strategy and budget allocation
- identify brand positioning and competitive differentiation
- document risks, assumptions, and dependencies
Deliver: campaign-strategy.md, messaging-matrix.md, audience-profile.md, channel-plan.md, budget-outline.md
```

**Phase Duration**: 1-2 weeks

**Key Activities**:
- Stakeholder alignment on campaign goals
- Audience research and persona development
- Competitive landscape analysis
- Channel selection and budget planning
- Messaging framework development
- Creative concept exploration

**Exit Criteria**:
- Stakeholder sign-off on strategy
- Budget approved
- Messaging validated
- Channel plan confirmed
- Creative direction set
- Risk register established

### 2. Creation Phase Execution

```text
Role: Content strategist + copywriter + creative director + production coordinator.
Goal: Produce all campaign content and creative assets.
Instructions:
- develop content calendar aligned with campaign timeline
- write copy for all channels (ads, email, social, PR, web)
- create visual assets, videos, graphics per creative brief
- develop email sequences and landing pages
- prepare social media content and scheduling
- produce supporting materials (sales enablement, PR kits)
- organize all assets with proper naming and metadata
Deliver: content-calendar.md, copy-library/, creative-assets/, email-templates/, social-content/, pr-materials/, asset-manifest.md
```

**Phase Duration**: 2-4 weeks

**Key Activities**:
- Content calendar planning
- Copywriting across all channels
- Creative asset production
- Video/audio content creation
- Email sequence development
- Social media content creation
- PR materials preparation
- Sales enablement content
- Asset organization and tagging

**Exit Criteria**:
- All content created per calendar
- Copy written for all channels
- Creative assets produced and approved
- Brand voice consistent across materials
- Assets organized and accessible
- Content meets quality standards
- Production timeline met

### 3. Review Phase Validation

```text
Role: Brand guardian + legal reviewer + accessibility reviewer + QA reviewer.
Goal: Validate brand compliance, legal clearance, and quality standards.
Instructions:
- review all content for brand alignment and tone consistency
- validate legal claims, disclosures, trademark usage
- check accessibility compliance (WCAG 2.1 AA minimum)
- perform QA on links, rendering, cross-device compatibility
- verify messaging consistency across channels
- ensure privacy compliance (GDPR, CCPA, etc.)
- flag required revisions and track resolution
- grant final approvals or escalate issues
Deliver: brand-compliance-report.md, legal-clearance.md, accessibility-audit.md, qa-checklist.md, approval-log.md
```

**Phase Duration**: 1-2 weeks

**Key Activities**:
- Brand compliance review
- Legal and regulatory clearance
- Accessibility validation
- Quality assurance testing
- Cross-channel consistency check
- Privacy compliance verification
- Trademark and copyright validation
- Revision tracking and resolution
- Final approval collection

**Exit Criteria**:
- Brand guardian approval granted
- Legal clearance obtained
- Accessibility compliance verified
- QA checks passed
- All revisions complete
- Approvals documented
- No blocking issues remain
- Launch readiness confirmed

### 4. Publication Phase Launch

```text
Role: Production coordinator + channel managers (social, email, PR, advertising).
Goal: Deploy content, activate campaigns, launch across all channels.
Instructions:
- configure channel settings and tracking parameters
- schedule social media posts and email sequences
- activate advertising campaigns (paid search, display, social ads)
- distribute PR materials to media contacts
- publish landing pages and web content
- set up analytics tracking and conversion pixels
- verify all tracking is functional
- execute launch checklist and monitor initial deployment
Deliver: channel-configs.md, scheduled-content/, campaign-activation-log.md, tracking-verification.md, launch-checklist.md
```

**Phase Duration**: 1-3 days

**Key Activities**:
- Channel configuration
- Content scheduling
- Campaign activation
- Tracking implementation
- Launch coordination
- Deployment verification
- Initial monitoring
- Stakeholder notification

**Exit Criteria**:
- Content published/scheduled
- Campaigns activated
- Tracking verified and functional
- Launch checklist complete
- No critical deployment issues
- Stakeholders notified
- Monitoring active
- Rollback plan ready

### 5. Analysis Phase Optimization

```text
Role: Marketing analyst + reporting specialist + campaign strategist + content strategist.
Goal: Measure performance, analyze results, optimize campaigns.
Instructions:
- collect performance data across all channels
- measure KPIs against baselines and goals
- analyze audience engagement and conversion patterns
- identify top-performing and underperforming content
- generate performance reports for stakeholders
- develop A/B test hypotheses for optimization
- recommend budget reallocation based on performance
- iterate creative and messaging based on insights
- prepare post-campaign analysis and learnings
Deliver: performance-report.md, kpi-dashboard.md, optimization-recommendations.md, ab-test-plan.md, post-campaign-analysis.md
```

**Phase Duration**: Ongoing (daily/weekly reporting, monthly deep analysis)

**Key Activities**:
- Performance monitoring
- KPI tracking and reporting
- Audience behavior analysis
- Content performance evaluation
- Channel effectiveness measurement
- A/B testing and experimentation
- Budget optimization
- Creative iteration
- Insight generation
- Post-campaign retrospective

**Exit Criteria**:
- All KPIs measured and reported
- Performance trends identified
- Insights documented
- Optimization recommendations delivered
- A/B tests executed (where applicable)
- Budget adjustments implemented
- Stakeholders informed
- Learnings captured for future campaigns

## Phase Transitions and Triggers

### Strategy → Creation

**Trigger**: Strategy Baseline (SB) milestone achieved

**Prerequisites**:
- Campaign strategy approved by stakeholders
- Budget allocated and confirmed
- Messaging framework validated
- Channel plan finalized
- Creative direction set
- Risk register established

**Handoff Artifacts**:
- `campaign-strategy.md`
- `messaging-matrix.md`
- `audience-profile.md`
- `channel-plan.md`
- `budget-outline.md`
- `creative-brief.md`

**Handoff Meeting**:
- Strategy team presents campaign vision
- Creation team asks clarifying questions
- Dependencies and timeline confirmed
- Success criteria reviewed
- Roles and responsibilities assigned

### Creation → Review

**Trigger**: Content Complete (CC) milestone achieved

**Prerequisites**:
- All content created per calendar
- Copy written for all channels
- Creative assets produced
- Email sequences developed
- Social media content ready
- PR materials prepared
- Assets organized and tagged

**Handoff Artifacts**:
- `content-calendar.md`
- `copy-library/` (all channel copy)
- `creative-assets/` (images, videos, graphics)
- `email-templates/`
- `social-content/`
- `pr-materials/`
- `asset-manifest.md`

**Handoff Meeting**:
- Creation team presents completed work
- Review team outlines evaluation criteria
- Timeline for review and revision confirmed
- Critical path items prioritized
- Escalation process established

### Review → Publication

**Trigger**: Brand & Legal OK (BL) milestone achieved

**Prerequisites**:
- Brand compliance approved
- Legal clearance granted
- Accessibility validated
- QA checks passed
- All required revisions complete
- Final approvals documented

**Handoff Artifacts**:
- `brand-compliance-report.md`
- `legal-clearance.md`
- `accessibility-audit.md`
- `qa-checklist.md`
- `approval-log.md`
- All revised content and assets

**Handoff Meeting**:
- Review team confirms all approvals
- Publication team reviews launch plan
- Channel configurations confirmed
- Tracking requirements validated
- Rollback procedures reviewed
- Go/no-go decision made

### Publication → Analysis

**Trigger**: Go-Live Ready (GL) milestone achieved

**Prerequisites**:
- Content published or scheduled
- Campaigns activated
- Tracking configured and verified
- Launch checklist complete
- No blocking deployment issues

**Handoff Artifacts**:
- `channel-configs.md`
- `scheduled-content/`
- `campaign-activation-log.md`
- `tracking-verification.md`
- `launch-checklist.md`
- Analytics dashboard access

**Handoff Meeting**:
- Publication team reports launch status
- Analytics team confirms tracking visibility
- KPI baselines and targets reviewed
- Reporting frequency and format confirmed
- Escalation thresholds established
- Optimization process outlined

### Analysis → Strategy (Next Campaign)

**Trigger**: Performance Review (PR) milestone achieved

**Prerequisites**:
- Campaign performance measured
- KPIs tracked and reported
- Insights documented
- Optimization recommendations delivered
- Post-campaign analysis complete

**Handoff Artifacts**:
- `performance-report.md`
- `kpi-dashboard.md`
- `optimization-recommendations.md`
- `ab-test-results.md`
- `post-campaign-analysis.md`
- `learnings-and-best-practices.md`

**Handoff Meeting**:
- Analytics team presents campaign results
- Strategy team captures learnings
- Successes and failures analyzed
- Best practices documented
- Recommendations for future campaigns
- Knowledge transfer to next strategy cycle

## Multi-Agent Collaboration Rules

- **Parallelize work by discipline** while synchronizing at phase boundaries; each phase concludes with a milestone assessment.
- **Maintain a shared artifact registry** under `.aiwg/marketing/` (or custom project path) so agents can resume long-running campaigns across sessions.
- **Escalate decisions** flagged as brand-critical, legal-risky, or budget-impacting to human stakeholders before proceeding.
- **Review cycles** should involve parallel reviewers (brand, legal, QA, accessibility) to accelerate approval timelines.
- **Synthesis agent** merges feedback from multiple reviewers to create final approved artifacts.
- **Version control** all content and creative assets with clear naming conventions (e.g., `v0.1-draft`, `v1.0-approved`).

## Quality & Creative Guardrails

- **Brand Consistency**: All content must align with brand voice, tone, visual identity, and messaging hierarchy.
- **Legal Compliance**: Validate all claims, disclosures, privacy statements, and trademark usage before publication.
- **Accessibility Standards**: Meet WCAG 2.1 AA minimum for all digital content; provide alt text, captions, transcripts.
- **Performance Tracking**: Configure analytics and conversion tracking before launch; verify functionality pre-publication.
- **A/B Testing**: When possible, test creative variations, subject lines, CTAs, landing pages to optimize performance.
- **Data-Driven Optimization**: Base creative iterations and budget shifts on performance data, not assumptions.
- **Cross-Channel Consistency**: Ensure messaging and visual identity remain consistent across all channels.
- **Audience-Centric**: Prioritize audience needs, pain points, and preferences over internal assumptions.

## Agent Assignments by Phase

### Strategy Phase

**Primary Agents**:
- `brand-strategist` (lead)
- `campaign-strategist`
- `creative-director`
- `positioning-specialist`

**Supporting Agents**:
- `marketing-analyst` (audience research, competitive analysis)
- `executive-communications` (stakeholder alignment)

**Review Agents**:
- `brand-guardian` (brand alignment validation)

### Creation Phase

**Primary Agents**:
- `content-strategist` (lead)
- `copywriter`
- `creative-director`
- `production-coordinator`

**Supporting Agents**:
- `email-marketing-specialist` (email sequences)
- `social-media-specialist` (social content)
- `pr-specialist` (press materials)
- `video-scriptwriter` (video content)

**Review Agents**:
- `brand-guardian` (brand voice check)
- `qa-reviewer` (quality assurance)

### Review Phase

**Primary Agents**:
- `brand-guardian` (lead)
- `legal-reviewer`
- `accessibility-reviewer`
- `qa-reviewer`

**Supporting Agents**:
- `production-coordinator` (revision tracking)

**Escalation Path**:
- Legal issues → Human legal counsel
- Brand conflicts → Brand leadership
- Accessibility gaps → Accessibility specialist

### Publication Phase

**Primary Agents**:
- `production-coordinator` (lead)
- `social-media-specialist` (social channels)
- `email-marketing-specialist` (email campaigns)

**Supporting Agents**:
- `qa-reviewer` (deployment verification)
- `marketing-analyst` (tracking validation)

**Review Agents**:
- `campaign-strategist` (launch readiness check)

### Analysis Phase

**Primary Agents**:
- `marketing-analyst` (lead)
- `reporting-specialist`

**Supporting Agents**:
- `campaign-strategist` (optimization strategy)
- `content-strategist` (creative iteration)
- `copywriter` (A/B test variants)

**Review Agents**:
- `executive-communications` (stakeholder reporting)

## Template Mappings by Phase

### Strategy Phase Templates

**Location**: `templates/strategy/`

- `campaign-strategy-template.md` → `.aiwg/marketing/strategy/campaign-strategy.md`
- `messaging-matrix-template.md` → `.aiwg/marketing/strategy/messaging-matrix.md`
- `audience-profile-template.md` → `.aiwg/marketing/strategy/audience-profile.md`
- `channel-plan-template.md` → `.aiwg/marketing/strategy/channel-plan.md`
- `budget-outline-template.md` → `.aiwg/marketing/strategy/budget-outline.md`
- `creative-brief-template.md` → `.aiwg/marketing/strategy/creative-brief.md`

### Creation Phase Templates

**Location**: `templates/content/`, `templates/creative/`, `templates/email/`, `templates/social/`, `templates/pr-communications/`

**Content**:
- `content-calendar-template.md` → `.aiwg/marketing/creation/content-calendar.md`
- `copy-brief-template.md` → `.aiwg/marketing/creation/copy-brief.md`

**Creative**:
- `creative-asset-spec-template.md` → `.aiwg/marketing/creation/asset-specs.md`
- `video-script-template.md` → `.aiwg/marketing/creation/video-scripts.md`

**Email**:
- `email-sequence-template.md` → `.aiwg/marketing/creation/email-sequences.md`
- `email-template-design.md` → `.aiwg/marketing/creation/email-templates/`

**Social**:
- `social-content-plan-template.md` → `.aiwg/marketing/creation/social-plan.md`
- `social-post-template.md` → `.aiwg/marketing/creation/social-posts.md`

**PR**:
- `press-release-template.md` → `.aiwg/marketing/creation/press-releases.md`
- `media-kit-template.md` → `.aiwg/marketing/creation/media-kit.md`

### Review Phase Templates

**Location**: `templates/governance/`, `templates/brand/`

- `brand-compliance-checklist-template.md` → `.aiwg/marketing/review/brand-compliance-report.md`
- `legal-review-template.md` → `.aiwg/marketing/review/legal-clearance.md`
- `accessibility-audit-template.md` → `.aiwg/marketing/review/accessibility-audit.md`
- `qa-checklist-template.md` → `.aiwg/marketing/review/qa-checklist.md`
- `approval-log-template.md` → `.aiwg/marketing/review/approval-log.md`

### Publication Phase Templates

**Location**: `templates/operations/`

- `channel-configuration-template.md` → `.aiwg/marketing/publication/channel-configs.md`
- `launch-checklist-template.md` → `.aiwg/marketing/publication/launch-checklist.md`
- `tracking-setup-template.md` → `.aiwg/marketing/publication/tracking-verification.md`
- `deployment-log-template.md` → `.aiwg/marketing/publication/campaign-activation-log.md`

### Analysis Phase Templates

**Location**: `templates/analytics/`

- `performance-report-template.md` → `.aiwg/marketing/analysis/performance-report.md`
- `kpi-dashboard-template.md` → `.aiwg/marketing/analysis/kpi-dashboard.md`
- `optimization-recommendations-template.md` → `.aiwg/marketing/analysis/optimization-recommendations.md`
- `ab-test-plan-template.md` → `.aiwg/marketing/analysis/ab-test-plan.md`
- `post-campaign-analysis-template.md` → `.aiwg/marketing/analysis/post-campaign-analysis.md`

## Quality Gates

### Strategy Gate (SB)

**Criteria**:
- [ ] Campaign goals and business objectives clearly defined
- [ ] Target audience segments documented with personas
- [ ] Messaging hierarchy validated by stakeholders
- [ ] Channel strategy aligns with audience and budget
- [ ] Budget approved and allocated by channel
- [ ] Creative direction set and approved
- [ ] Risk register established with mitigation plans
- [ ] Success metrics and KPIs defined
- [ ] Timeline and milestones agreed upon
- [ ] Stakeholder sign-off obtained

**Artifacts Required**:
- Campaign strategy document
- Messaging matrix
- Audience profiles
- Channel plan
- Budget outline
- Creative brief

### Creation Gate (CC)

**Criteria**:
- [ ] Content calendar complete and aligned with timeline
- [ ] Copy written for all channels and touchpoints
- [ ] Creative assets produced per specifications
- [ ] Email sequences developed and tested
- [ ] Social media content created and queued
- [ ] PR materials prepared (releases, kits, pitches)
- [ ] Sales enablement materials ready
- [ ] All assets organized with proper naming/metadata
- [ ] Brand voice consistent across all materials
- [ ] Production timeline met or variances explained

**Artifacts Required**:
- Content calendar
- Complete copy library
- Creative asset files
- Email templates and sequences
- Social media content
- PR materials
- Asset manifest

### Review Gate (BL)

**Criteria**:
- [ ] Brand compliance validated by brand guardian
- [ ] Legal clearance granted (claims, disclosures, trademarks)
- [ ] Accessibility compliance verified (WCAG 2.1 AA minimum)
- [ ] QA checks passed (links, rendering, compatibility)
- [ ] Privacy compliance confirmed (GDPR, CCPA, etc.)
- [ ] All required revisions completed
- [ ] Final approvals documented in approval log
- [ ] No blocking issues remain unresolved
- [ ] Launch readiness confirmed by review team

**Artifacts Required**:
- Brand compliance report
- Legal clearance document
- Accessibility audit report
- QA checklist
- Approval log

### Publication Gate (GL)

**Criteria**:
- [ ] Content published or scheduled across all channels
- [ ] Advertising campaigns activated
- [ ] Email sequences configured and tested
- [ ] Social media posts scheduled
- [ ] PR distribution executed
- [ ] Analytics tracking configured and verified
- [ ] Conversion pixels and UTM parameters in place
- [ ] Launch checklist 100% complete
- [ ] No critical deployment issues
- [ ] Rollback plan documented and tested
- [ ] Stakeholders notified of launch

**Artifacts Required**:
- Channel configuration documents
- Scheduled content confirmation
- Campaign activation log
- Tracking verification report
- Launch checklist

### Analysis Gate (PR)

**Criteria**:
- [ ] All KPIs measured and reported
- [ ] Performance data collected across all channels
- [ ] Audience engagement and conversion analyzed
- [ ] Top and underperforming content identified
- [ ] Performance trends documented
- [ ] Insights generated and validated
- [ ] Optimization recommendations delivered
- [ ] A/B test results analyzed (where applicable)
- [ ] Budget performance evaluated
- [ ] Post-campaign learnings documented
- [ ] Stakeholders informed of results

**Artifacts Required**:
- Performance report
- KPI dashboard
- Optimization recommendations
- A/B test results (if applicable)
- Post-campaign analysis

## Continuous Workflows (Across Phases)

### Brand Governance Cycle (Ongoing)

**Frequency**: Continuous during Creation and Review phases

**Primary Agents**: `brand-guardian`, `brand-strategist`

**Activities**:
- Review content for brand alignment
- Validate tone and voice consistency
- Check visual identity adherence
- Monitor trademark and copyright usage
- Flag deviations and recommend corrections
- Maintain brand asset library
- Update brand guidelines as needed

**Artifacts**: `brand-review-log.md`, `brand-compliance-report.md`

### Legal Compliance Cycle (Ongoing)

**Frequency**: Continuous during Creation and Review phases

**Primary Agents**: `legal-reviewer`

**Activities**:
- Review claims and superlatives
- Validate disclosures and disclaimers
- Check privacy policy compliance
- Verify trademark usage
- Review regulatory requirements (FTC, industry-specific)
- Flag legal risks and required changes
- Maintain legal clearance log

**Artifacts**: `legal-review-log.md`, `legal-clearance.md`, `compliance-checklist.md`

### Performance Monitoring Cycle (Ongoing)

**Frequency**: Daily/weekly during Analysis phase

**Primary Agents**: `marketing-analyst`, `reporting-specialist`

**Activities**:
- Monitor real-time campaign performance
- Track KPIs against baselines
- Identify anomalies and trends
- Generate performance alerts
- Update dashboards and reports
- Recommend tactical optimizations
- Report to stakeholders

**Artifacts**: `daily-performance-snapshot.md`, `weekly-performance-report.md`, `kpi-dashboard.md`

### Optimization Iteration Cycle (Ongoing)

**Frequency**: Weekly/bi-weekly during Analysis phase

**Primary Agents**: `marketing-analyst`, `campaign-strategist`, `content-strategist`, `copywriter`

**Activities**:
- Develop A/B test hypotheses
- Create test variants (creative, copy, targeting)
- Execute tests and collect data
- Analyze test results
- Implement winning variations
- Iterate creative based on insights
- Optimize budget allocation by channel
- Document learnings

**Artifacts**: `ab-test-plan.md`, `ab-test-results.md`, `optimization-log.md`, `creative-iterations.md`

## Usage Notes

Feed the relevant phase prompt and discipline backlog, plus current artifacts, into the active agent or agent cluster. Plan for multi-day or multi-week execution depending on campaign complexity. Agents should checkpoint progress after each phase, baseline approved artifacts, and request clarifications proactively to avoid drift.

**Multi-Agent Orchestration Pattern**:

1. **Primary Author** creates draft (e.g., `copywriter` drafts email sequence)
2. **Parallel Reviewers** evaluate independently (e.g., `brand-guardian`, `legal-reviewer`, `qa-reviewer`)
3. **Synthesizer** merges feedback into final version (e.g., `content-strategist` or `production-coordinator`)
4. **Archive** final approved artifact to `.aiwg/marketing/{phase}/`

**Artifact Versioning**:
- `v0.1-{author}-draft.md` → Initial draft by primary author
- `v0.2-{reviewer}-feedback.md` → Reviewer comments
- `v1.0-approved.md` → Final approved version (baselined)

**Working Directory Structure**:

```text
.aiwg/marketing/
├── strategy/           # Strategy phase artifacts
│   ├── campaign-strategy.md
│   ├── messaging-matrix.md
│   ├── audience-profile.md
│   ├── channel-plan.md
│   └── budget-outline.md
├── creation/           # Creation phase artifacts
│   ├── content-calendar.md
│   ├── copy-library/
│   ├── creative-assets/
│   ├── email-sequences/
│   ├── social-content/
│   └── pr-materials/
├── review/             # Review phase artifacts
│   ├── brand-compliance-report.md
│   ├── legal-clearance.md
│   ├── accessibility-audit.md
│   ├── qa-checklist.md
│   └── approval-log.md
├── publication/        # Publication phase artifacts
│   ├── channel-configs.md
│   ├── scheduled-content/
│   ├── campaign-activation-log.md
│   ├── tracking-verification.md
│   └── launch-checklist.md
├── analysis/           # Analysis phase artifacts
│   ├── performance-report.md
│   ├── kpi-dashboard.md
│   ├── optimization-recommendations.md
│   ├── ab-test-results.md
│   └── post-campaign-analysis.md
├── working/            # Temporary working files (drafts, reviews)
│   ├── drafts/
│   └── reviews/
└── archive/            # Historical campaigns (post-PR milestone)
    └── {campaign-name}/
```

## Example Campaign Execution

**Scenario**: Product Launch Campaign

### Week 1-2: Strategy Phase

**Agents**: `brand-strategist` (lead), `campaign-strategist`, `creative-director`, `marketing-analyst`

**Activities**:
1. Stakeholder kickoff and goal alignment
2. Audience research and persona development
3. Competitive landscape analysis
4. Messaging framework development
5. Channel strategy and budget allocation
6. Creative concept exploration

**Deliverables**:
- Campaign strategy (goals, audience, positioning)
- Messaging matrix (key themes, proof points, CTAs)
- Audience profiles (3 personas)
- Channel plan (email, social, PR, paid advertising, web)
- Budget outline ($100K allocated across channels)
- Creative brief (visual direction, tone, examples)

**Milestone**: Strategy Baseline (SB) achieved, stakeholders approve

### Week 3-6: Creation Phase

**Agents**: `content-strategist` (lead), `copywriter`, `creative-director`, `production-coordinator`, `email-marketing-specialist`, `social-media-specialist`, `pr-specialist`, `video-scriptwriter`

**Activities**:
1. Content calendar planning (8-week campaign)
2. Copywriting (emails, ads, landing pages, social posts)
3. Creative production (product photos, demo video, infographics)
4. Email sequence development (6-email nurture sequence)
5. Social media content creation (60 posts across platforms)
6. PR materials (press release, media kit, pitch deck)
7. Sales enablement (one-pagers, battlecards)
8. Asset organization and metadata tagging

**Deliverables**:
- Content calendar (8 weeks, all channels)
- Copy library (200+ pieces of copy)
- Creative assets (50+ images, 3 videos, 10 graphics)
- Email templates (6 emails + transactional)
- Social media content (60 posts, scheduled)
- PR materials (release, kit, pitches)
- Sales enablement package
- Asset manifest (all files catalogued)

**Milestone**: Content Complete (CC) achieved

### Week 7-8: Review Phase

**Agents**: `brand-guardian` (lead), `legal-reviewer`, `accessibility-reviewer`, `qa-reviewer`

**Activities**:
1. Brand compliance review (voice, visual identity, messaging consistency)
2. Legal clearance (claims validation, disclosures, trademarks)
3. Accessibility audit (WCAG 2.1 AA compliance)
4. QA testing (links, rendering, cross-device, email clients)
5. Privacy compliance check (GDPR, CCPA)
6. Revision tracking and resolution
7. Final approval collection

**Deliverables**:
- Brand compliance report (APPROVED)
- Legal clearance (APPROVED with minor disclosure updates)
- Accessibility audit (COMPLIANT, alt text added to 12 images)
- QA checklist (PASSED, 3 broken links fixed)
- Approval log (all stakeholders signed off)

**Milestone**: Brand & Legal OK (BL) achieved

### Week 9 (Day 1-3): Publication Phase

**Agents**: `production-coordinator` (lead), `social-media-specialist`, `email-marketing-specialist`, `marketing-analyst`

**Activities**:
1. Email sequence configuration in ESP (Mailchimp)
2. Social media scheduling (Hootsuite, Buffer)
3. Advertising campaign activation (Google Ads, LinkedIn, Meta)
4. Landing page publishing (WordPress)
5. PR distribution (newswire, direct pitches)
6. Analytics tracking setup (GA4, UTM parameters, conversion pixels)
7. Tracking verification and testing
8. Launch checklist execution

**Deliverables**:
- Channel configurations (all platforms configured)
- Scheduled content (emails queued, social scheduled)
- Campaign activation log (all campaigns live)
- Tracking verification (GA4, pixels firing correctly)
- Launch checklist (100% complete)

**Milestone**: Go-Live Ready (GL) achieved, campaign launched

### Week 9-16: Analysis Phase

**Agents**: `marketing-analyst` (lead), `reporting-specialist`, `campaign-strategist`, `content-strategist`, `copywriter`

**Activities**:
1. Daily performance monitoring (dashboard checks)
2. Weekly performance reporting (stakeholder updates)
3. KPI tracking (leads, conversions, engagement, ROI)
4. Audience behavior analysis (click patterns, drop-off points)
5. A/B testing (subject lines, CTAs, ad creative)
6. Creative iteration (refresh underperforming assets)
7. Budget optimization (shift spend to top-performing channels)
8. Post-campaign retrospective (learnings, best practices)

**Deliverables**:
- Weekly performance reports (8 reports)
- KPI dashboard (real-time, updated daily)
- Optimization recommendations (5 major optimizations implemented)
- A/B test results (12 tests executed, 7 winners implemented)
- Post-campaign analysis (ROI: 3.2x, 450 qualified leads, $320K pipeline)

**Milestone**: Performance Review (PR) achieved, campaign concluded successfully

## Natural Language Command Mapping

Users don't type slash commands. They use natural language. Map these phrases to MMK workflows:

**Strategy Phase**:
- "plan a campaign for {product/event}" → `/flow-strategy-baseline`
- "define campaign goals" → Strategy phase kickoff
- "who's our audience" → Audience research activity
- "what channels should we use" → Channel planning activity

**Creation Phase**:
- "write copy for {campaign}" → `/flow-content-creation`
- "create email sequence" → Email creation activity
- "develop creative assets" → Creative production workflow
- "prepare social content" → Social media content creation

**Review Phase**:
- "brand review" → `/flow-brand-review`
- "legal clearance" → Legal review workflow
- "check accessibility" → Accessibility audit
- "QA check" → Quality assurance workflow

**Publication Phase**:
- "launch campaign" → `/flow-campaign-launch`
- "publish content" → Publication workflow
- "schedule social posts" → Social media scheduling
- "activate ads" → Advertising campaign activation

**Analysis Phase**:
- "how's the campaign performing" → `/flow-performance-review`
- "show me the metrics" → Performance dashboard
- "optimize campaign" → Optimization workflow
- "run A/B test" → A/B testing workflow

**Cross-Phase**:
- "where are we" → Project status check
- "what's next" → Next milestone/phase check
- "campaign health check" → Quality gate evaluation
- "campaign status" → Current phase and progress

## Integration with SDLC Framework

Marketing campaigns often support product launches and feature releases. Coordinate MMK and SDLC frameworks:

**SDLC Transition → MMK Intake**:
- SDLC reaches Construction or Transition phase → Trigger MMK Strategy phase for launch campaign
- Product roadmap → Campaign calendar alignment
- Feature release notes → PR materials and messaging

**Shared Artifacts**:
- Product requirements → Messaging foundation
- User stories → Campaign personas and use cases
- Architecture diagrams → Product explainer content
- Test results → Product claims validation

**Coordination Points**:
- Product release date → Campaign launch timing
- Beta program → Early access campaign
- GA launch → Full-scale campaign activation
- Post-launch monitoring → Campaign performance analysis

**Multi-Framework Orchestration**:
- SDLC `product-manager` ↔ MMK `campaign-strategist`
- SDLC `technical-writer` ↔ MMK `content-strategist`
- SDLC `ux-designer` ↔ MMK `creative-director`
- SDLC `devops-engineer` ↔ MMK `production-coordinator` (for web publishing, tracking)
