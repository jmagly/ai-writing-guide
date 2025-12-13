# Media/Marketing Kit (MMK) Framework - Quick Start

Build marketing campaigns with AI-assisted lifecycle: Strategy → Creation → Review → Publication → Analysis.

## 3 Ways to Start

### 1. New Campaign (From Scratch)

```bash
# Install CLI
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash

# Deploy marketing agents
cd /path/to/project
aiwg -deploy-agents --mode marketing
aiwg -deploy-commands --mode marketing

# Open in Claude Code
claude .
```

```text
# Integrate AIWG with platform (required for orchestration)
You: "Run /aiwg-update-claude"

# Then start intake
You: "Start marketing intake wizard for Q1 product launch"
```

Or use the interactive mode:

```text
/marketing-intake-wizard "Product launch for new mobile app" --interactive
```

### 2. Existing Campaign (From Assets)

Have existing brand assets, previous campaigns, or media kits?

```bash
aiwg -deploy-agents --mode marketing
aiwg -deploy-commands --mode marketing
claude .
```

```text
# Integrate AIWG with platform (required for orchestration)
You: "Run /aiwg-update-claude"

# Then analyze assets
You: "Analyze campaign assets in ./q4-campaign and generate intake"
```

Or use the command:

```text
/intake-from-campaign ./brand-assets --interactive
```

The framework scans your assets, detects brand patterns, and generates intake forms.

### 3. Manual Intake (Agency Handoff)

For campaigns with detailed client briefs or RFPs:

```bash
aiwg -deploy-agents --mode marketing
aiwg -deploy-commands --mode marketing
# Edit .aiwg/marketing/intake/campaign-brief.md manually
claude .
```

```text
# Integrate AIWG with platform (required for orchestration)
You: "Run /aiwg-update-claude"

# Then validate intake
You: "Validate campaign intake and start Strategy phase"
```

## Basic Workflow

| Phase | What You Say | What Happens |
|-------|--------------|--------------|
| **Intake** | "Start marketing intake for..." | Campaign brief, goals |
| **Strategy** | "Start Strategy phase" | Audience, messaging, channels |
| **Creation** | "Generate content calendar" | Copy, assets, scheduling |
| **Review** | "Run brand validation" | Brand + legal approval |
| **Publication** | "Launch campaign" | Deploy, schedule, activate |
| **Analysis** | "Analyze performance" | KPIs, ROI, optimization |

## Key Commands

```text
"Where are we?"                    → Campaign status
"Generate social content"          → Social media posts
"Run brand validation"             → Brand compliance check
"Create content calendar"          → Editorial planning
"Analyze campaign performance"     → Performance metrics
```

## Artifacts Location

All documents generated in `.aiwg/marketing/`:

```text
.aiwg/marketing/
├── intake/        # Campaign briefs
├── strategy/      # Audience, messaging
├── content/       # Calendars, copy
├── social/        # Social media plans
├── email/         # Email sequences
├── analytics/     # Performance reports
└── governance/    # Brand compliance
```

## Voice Profiles for Content

For consistent brand voice across your marketing content, add the Writing Quality framework:

```bash
aiwg use writing           # Add Voice Framework to your project
```

Then use voice profiles when generating content:

```text
"Write blog post in casual-conversational voice"
"Create executive summary in executive-brief voice"
"Generate social media copy with friendly, approachable tone"
```

**Built-in profiles**: `technical-authority`, `friendly-explainer`, `executive-brief`, `casual-conversational`

**Custom voices**: Create brand-specific voice profiles:

```text
"Create a voice profile from this sample blog post"
"Blend 70% friendly with 30% professional for our brand voice"
```

## Next Steps

- **Quick Start**: [General Quick Start](#quickstart)
- **37 Marketing agents**: Brand strategist, copywriter, SEO specialist, etc.
- **87+ Templates**: Campaign strategy, content calendar, media kit, etc.
- **CLI Reference**: [Full CLI documentation](#ref-cli)
- **Platform setup**: [Claude Code](#integrations-claude-code) | [Factory AI](#integrations-factory) | [Warp](#integrations-warp)
