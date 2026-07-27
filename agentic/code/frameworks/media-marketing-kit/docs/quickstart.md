# Media/Marketing Kit Quickstart

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

Deploy the MMK framework and run your first campaign workflow in about 15 minutes.

## Installation

```bash
# Deploy marketing framework to Claude Code
aiwg use marketing

# Or deploy to a specific provider
aiwg use marketing --provider copilot
aiwg use marketing --provider cursor
```

Verify what was deployed:

```bash
aiwg list
# media-marketing-kit    installed
```

## Starting a Campaign

There are three ways to start, depending on what you have:

### Option A: New Campaign (from description)

If you know what you want to do but have no existing materials:

```
/marketing-intake-wizard "Q1 product launch for enterprise CRM targeting mid-market B2B" --interactive
```

The wizard asks targeted questions about goals, audience, budget, timeline, and channels. When complete, validated intake files are saved to `.aiwg/marketing/intake/` and you can proceed directly to Strategy.

For a faster path with less guidance:

```
/marketing-intake-wizard "Holiday email campaign" --guidance "6-week deadline, $30k budget, email and social only"
```

### Option B: Existing Campaign (from materials)

If you have existing campaign assets, a media kit, or brand documents:

```
/intake-from-campaign ./campaign-assets --interactive
```

The framework analyzes your materials, extracts campaign parameters, and generates structured intake. Interactive mode prompts for clarification on gaps.

### Option C: Manual Intake

If you created intake files manually:

```
/intake-start-campaign .aiwg/marketing/intake/
```

This validates the intake and confirms readiness for the Strategy phase.

## Strategy Phase

After intake (options A and B validate automatically, option C validates during `intake-start-campaign`):

```
/flow-strategy-baseline
```

Or use natural language:

```
Start the strategy phase
```

The Marketing Orchestrator coordinates the Campaign Strategist, Brand Strategist, Audience Researcher, and Content Strategist agents to produce:

- Campaign strategy document
- Messaging matrix
- Audience profiles
- Channel plan
- Budget allocation

Review the artifacts in `.aiwg/marketing/strategy/` when complete. The Strategy Baseline milestone is met when stakeholders approve goals, messaging, and channel strategy.

## Creation Phase

When Strategy is approved:

```
/flow-strategy-to-creation
```

Then generate content:

```
/generate-content-calendar --channels "blog,social,email" --duration "60 days"
/generate-social-content --platforms "linkedin,twitter" --posts 20
/generate-email-sequence --sequence-type "product-launch" --emails 5
```

Content artifacts go to their respective directories under `.aiwg/marketing/`.

## Review Phase

```
/flow-creation-to-review
```

Run validation before the Brand & Legal OK milestone:

```bash
# Brand compliance
/brand-validate ./campaign-assets/ --report

# Legal clearance
/legal-clearance ./campaign-assets/ --framework "FTC,GDPR"

# Accessibility (WCAG 2.1 AA)
/accessibility-audit ./landing-pages/ --standard "WCAG-2.1-AA"
```

Address any issues flagged before proceeding.

## Publication Phase

```
/flow-review-to-publication
```

At this point, content is scheduled and channels are activated. The Go-Live Ready milestone marks when everything is deployed or queued.

## Analysis Phase

```
/flow-publication-to-analysis
```

After launch, measure and optimize:

```
/flow-performance-optimization --guidance "Focus on email open rates and social engagement"
```

Generate a report:

```
/export-campaign-report --include-metrics
```

## Checking Status Anytime

```
/campaign-status
```

Shows current phase, completed milestones, and next steps.

## Key Options

All MMK commands support two standard flags:

| Flag | Purpose |
|------|---------|
| `--guidance "text"` | Provide strategic direction upfront — sets priorities, constraints, focus areas |
| `--interactive` | Ask clarifying questions before executing |

Combine them to provide partial guidance and answer remaining questions interactively:

```
/generate-campaign-strategy "Q2 Launch" --interactive --guidance "Mobile-first, Gen Z audience, TikTok primary"
```

## Common Workflows

### Quick Blog and Social Calendar

```
/marketing-intake-wizard "Monthly content program" --guidance "Tech blog targeting developers, 2 posts/week + daily social"
/generate-content-calendar --channels "blog,social" --duration "30 days"
```

### Product Launch Coordination

When using MMK alongside sdlc-complete for a product launch, the frameworks share the `.aiwg/` artifact directory with no overlap:

```
/flow-product-launch --sdlc-phase construction --mmk-phase strategy
```

### Media Kit Generation

```
/generate-media-kit --company-profile --assets --press-archive
```

## Troubleshooting

**Agents not found after installation**: Re-run `aiwg use marketing` and verify with `aiwg list`.

**Intake validation fails**: Check that required fields (campaign goals, target audience, budget range, timeline) are present in your intake files. Run `/marketing-intake-wizard --complete` to fill gaps interactively.

**Content calendar missing channels**: Confirm that channel names match supported values: `blog`, `social`, `email`, `advertising`, `pr`.

## References

- `@$AIWG_ROOT/agentic/code/frameworks/media-marketing-kit/docs/overview.md` — Framework overview
- `@$AIWG_ROOT/agentic/code/frameworks/media-marketing-kit/agents/` — Agent catalog
- `@$AIWG_ROOT/agentic/code/frameworks/media-marketing-kit/templates/` — All 87+ templates
- `@$AIWG_ROOT/agentic/code/frameworks/media-marketing-kit/plan-act-mmk.md` — Phase lifecycle details
