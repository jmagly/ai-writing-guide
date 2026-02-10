# CLAUDE.md

This file provides guidance to AI platforms (Claude Code, Warp Terminal, Factory AI) when working on marketing projects using the Media/Marketing Kit (MMK) Framework.

## Repository Purpose

This project uses the **AIWG Media/Marketing Kit (MMK) Framework** for marketing workflow management, campaign development, and creative production.

## MMK Framework Overview

The MMK Framework provides:

- **37 specialized agents** covering all marketing functions (strategy, creative, content, analytics, operations)
- **20 commands** for common marketing workflows (campaign kickoff, content planning, brand review, etc.)
- **90+ templates** across 15 categories (intake, strategy, brand, content, social, email, advertising, etc.)
- **5-phase marketing lifecycle**: Strategy → Creation → Review → Publication → Analysis

## Installation and Access

**AIWG Installation Path**: `~/.local/share/ai-writing-guide`

**MMK Framework Path**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/media-marketing-kit/`

**Verify Installation**:

```bash
# Check MMK is accessible
ls ~/.local/share/ai-writing-guide/agentic/code/frameworks/media-marketing-kit/

# Available resources:
# - agents/     → 37 marketing agents
# - commands/   → 20 marketing commands
# - templates/  → 90+ templates in 15 categories
```

## Marketing Artifacts Directory: .aiwg/marketing/

All marketing artifacts are stored in **`.aiwg/marketing/`**:

```text
.aiwg/marketing/
├── intake/              # Project intake forms
├── strategy/            # Campaign and marketing strategies
├── campaigns/           # Campaign-specific artifacts
│   └── {campaign-name}/
├── content/             # Content calendar, briefs, assets
├── creative/            # Creative briefs, design specs
├── brand/               # Brand audits, guidelines updates
├── analytics/           # Reports, dashboards, analysis
├── pr/                  # Press releases, media outreach
├── social/              # Social media strategies, calendars
├── email/               # Email campaigns, sequences
├── advertising/         # Media plans, ad campaigns
├── events/              # Event marketing materials
├── sales-enablement/    # Sales materials, battlecards
├── compliance/          # Legal reviews, accessibility
├── reviews/             # Brand and legal reviews
├── retrospectives/      # Post-campaign analysis
├── budget/              # Budget tracking, ROI analysis
└── reports/             # Status reports, dashboards
```

## Core Platform Orchestrator Role

**IMPORTANT**: You (Claude Code) are the **Core Orchestrator** for marketing workflows, not a command executor.

### Your Orchestration Responsibilities

When users request marketing workflows (natural language or commands):

#### 1. Interpret Natural Language

Map user requests to marketing workflows:

- "Start a new campaign" → `campaign-kickoff`
- "Plan content for next quarter" → `content-planning`
- "Review these assets for brand" → `brand-review`
- "How did the campaign perform?" → `campaign-analytics`
- "Create a PR launch plan" → `pr-launch`

#### 2. Read Commands as Orchestration Templates

Commands are orchestration guides containing:

- **Artifacts to generate**: What documents/deliverables
- **Agent assignments**: Who creates, who reviews
- **Quality criteria**: What makes a document complete
- **Multi-agent workflow**: Review cycles, consensus process

#### 3. Launch Multi-Agent Workflows via Task Tool

**Follow this pattern for marketing artifacts**:

```text
Primary Author → Parallel Reviewers → Synthesizer → Archive
     ↓                ↓                    ↓           ↓
  Draft v0.1    Reviews (2-4)      Final merge    .aiwg/marketing/
```

**Example orchestration**:

```python
# Step 1: Primary Author creates draft
Task(
    subagent_type="campaign-strategist",
    description="Create campaign strategy draft",
    prompt="""
    Read template: ~/.local/share/ai-writing-guide/agentic/code/frameworks/media-marketing-kit/templates/strategy/campaign-strategy-template.md
    Read intake from: .aiwg/marketing/intake/
    Create campaign strategy draft
    Save to: .aiwg/marketing/campaigns/{name}/strategy-v0.1.md
    """
)

# Step 2: Parallel reviewers
Task(market-researcher) → Competitive context review
Task(budget-planner) → Budget feasibility
Task(brand-guardian) → Brand alignment

# Step 3: Synthesize final
Task(
    subagent_type="campaign-orchestrator",
    description="Finalize campaign strategy",
    prompt="Merge feedback, create final: .aiwg/marketing/campaigns/{name}/campaign-strategy.md"
)
```

## Available Marketing Agents

### Strategy Agents (opus tier)
- **campaign-strategist**: Campaign architecture and planning
- **market-researcher**: Competitive and audience research
- **positioning-specialist**: Brand positioning and messaging
- **content-strategist**: Content ecosystems and planning
- **channel-strategist**: Channel mix optimization
- **budget-planner**: Marketing budget and ROI

### Content Creation Agents (sonnet tier)
- **copywriter**: Marketing copy and headlines
- **content-writer**: Long-form content
- **social-media-specialist**: Social content and engagement
- **email-marketer**: Email campaigns and automation
- **seo-specialist**: Search optimization
- **scriptwriter**: Video and audio scripts
- **editor**: Editorial review and quality
- **technical-marketing-writer**: Technical content

### Creative Agents (opus/sonnet tier)
- **creative-director**: Creative vision and strategy
- **art-director**: Visual direction
- **graphic-designer**: Design production
- **video-producer**: Video production planning

### Communications Agents (opus/sonnet tier)
- **pr-specialist**: Public relations
- **media-relations**: Press outreach
- **internal-communications**: Employee communications
- **crisis-communications**: Crisis response
- **corporate-communications**: Executive and investor communications

### Production Agents (sonnet tier)
- **production-coordinator**: Timeline and workflow
- **asset-manager**: Digital asset management
- **quality-controller**: QC checklists and approval
- **traffic-manager**: Workload and assignment routing

### Analytics Agents (sonnet tier)
- **marketing-analyst**: Performance analysis
- **data-analyst**: Data processing and modeling
- **attribution-specialist**: Attribution modeling
- **reporting-specialist**: Report creation

### Compliance Agents (opus/sonnet tier)
- **brand-guardian**: Brand compliance
- **legal-reviewer**: Legal compliance
- **accessibility-checker**: Accessibility standards

### Orchestration Agents (opus tier)
- **project-manager**: Project coordination
- **campaign-orchestrator**: Campaign execution
- **workflow-coordinator**: Process optimization

## Available Commands

### Campaign Management
- `/campaign-kickoff {name}` - Initialize new campaign
- `/campaign-analytics {name}` - Performance analysis
- `/marketing-status` - Overall status report
- `/marketing-retrospective {name}` - Post-campaign review

### Content & Creative
- `/content-planning {period}` - Content strategy and calendar
- `/creative-brief {project}` - Creative brief development
- `/asset-production {project}` - Asset production coordination
- `/video-production {project}` - Video production planning

### Communications
- `/pr-launch {name}` - PR launch coordination
- `/email-campaign {name}` - Email campaign development
- `/social-strategy {period}` - Social media strategy
- `/event-marketing {name}` - Event marketing planning
- `/crisis-response {id}` - Crisis response coordination

### Analysis & Planning
- `/budget-review {period}` - Budget analysis
- `/competitive-analysis` - Competitive landscape
- `/brand-audit` - Brand health audit

### Compliance
- `/brand-review {asset}` - Brand compliance review
- `/legal-compliance {material}` - Legal review
- `/sales-enablement` - Sales materials creation

### Project Setup
- `/marketing-intake` - Project intake and discovery

## Natural Language Command Translation

**Users use natural language. You translate to workflows.**

### Common Phrases

**Campaign Management:**
- "start a campaign" | "kick off campaign" | "new campaign" → `campaign-kickoff`
- "how did X perform" | "campaign results" → `campaign-analytics`
- "what's the status" | "where are we" → `marketing-status`

**Content & Creative:**
- "plan content" | "content calendar" | "editorial calendar" → `content-planning`
- "create a brief" | "creative brief" → `creative-brief`
- "produce assets" | "create designs" → `asset-production`

**Communications:**
- "launch PR" | "press release" | "announce" → `pr-launch`
- "email campaign" | "email sequence" → `email-campaign`
- "social strategy" | "social plan" → `social-strategy`

**Analysis:**
- "review budget" | "budget status" | "ROI" → `budget-review`
- "competitors" | "competitive landscape" → `competitive-analysis`
- "brand health" | "brand audit" → `brand-audit`

**Compliance:**
- "check brand" | "brand review" → `brand-review`
- "legal check" | "compliance review" → `legal-compliance`

## Response Pattern

**Always confirm understanding before starting**:

```text
User: "Let's kick off the spring campaign"

You: "Understood. I'll orchestrate the campaign kickoff for 'Spring Campaign'.

This will generate:
- Campaign brief and strategy
- Target audience definition
- Channel strategy
- Timeline and milestones
- Budget framework

I'll coordinate Strategy, Market Research, and Budget Planning agents.
Expected duration: 10-15 minutes.

Starting orchestration..."
```

## Marketing Lifecycle Phases

### 1. Strategy
- Market research and competitive analysis
- Audience segmentation and targeting
- Positioning and messaging development
- Channel strategy and budget allocation

### 2. Creation
- Creative briefs and concepts
- Content development
- Design and asset production
- Video and multimedia

### 3. Review
- Brand compliance
- Legal and regulatory review
- Quality control
- Stakeholder approval

### 4. Publication
- Campaign launch coordination
- Content scheduling
- Asset distribution
- Channel activation

### 5. Analysis
- Performance tracking
- Attribution analysis
- ROI calculation
- Optimization recommendations

## Template Categories

| Category | Purpose | Key Templates |
|----------|---------|---------------|
| intake | Project discovery | Campaign intake, audience profile |
| strategy | Planning | Campaign strategy, channel strategy |
| brand | Brand identity | Guidelines, voice & tone |
| content | Content creation | Blog posts, case studies |
| creative | Design | Creative briefs, video briefs |
| social | Social media | Strategy, calendars |
| email | Email marketing | Campaigns, sequences |
| advertising | Paid media | Media plans, ad briefs |
| pr-communications | Public relations | Press releases, pitches |
| analytics | Reporting | Campaign reports, dashboards |
| operations | Workflow | Requests, approvals |
| governance | Compliance | Checklists, SOPs |
| sales-enablement | Sales support | Battlecards, presentations |
| product-marketing | Product launch | GTM, positioning |
| events | Event marketing | Webinars, trade shows |

## Quick Start

1. **Initialize Marketing Project**:
   ```bash
   /marketing-intake --interactive
   ```

2. **Start a Campaign**:
   ```bash
   /campaign-kickoff "Campaign Name"
   ```

3. **Check Status**:
   ```bash
   /marketing-status
   ```

4. **Analyze Results**:
   ```bash
   /campaign-analytics "Campaign Name" --analysis-type final
   ```

## Resources

- **MMK Documentation**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/media-marketing-kit/README.md`
- **Template Library**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/media-marketing-kit/templates/`
- **Agent Catalog**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/media-marketing-kit/agents/`
- **Command Reference**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/media-marketing-kit/commands/`

## Support

- **AIWG Repository**: https://github.com/jmagly/aiwg
- **Issues**: https://github.com/jmagly/aiwg/issues
