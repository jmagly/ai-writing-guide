# Marketing Framework

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

You're running marketing campaigns — content, social, email, paid, events. You have a strategy but execution is fragmented. Different people working in different tools, inconsistent brand voice, no structured review before things go out.

The marketing framework gives you a full campaign lifecycle: intake, strategy, content creation across channels, brand and legal review, publication, and performance analysis. Every role that exists in a marketing team has a corresponding agent.

---

## Deploy it

```bash
npm install -g aiwg
cd /path/to/your/project
aiwg use marketing
claude .
```

---

## Starting a campaign

### From a brief or idea

```bash
/marketing-intake-wizard "Q2 product launch for enterprise customers" --interactive
```

The wizard walks through campaign goals, audience definition, messaging pillars, channel mix, budget, and timeline. It generates a campaign brief and strategy document in `.aiwg/marketing/`.

### From existing assets

If you already have some materials and need to build a campaign around them:

```bash
/intake-from-campaign ./existing-assets --interactive
```

Scans what you have, infers campaign intent, identifies gaps, and generates the missing strategy documents.

---

## The campaign lifecycle

| Phase | What happens | Key commands |
|-------|-------------|-------------|
| **Strategy** | Goals, audience, messaging, channel selection | `/flow-strategy-baseline` |
| **Creation** | Content generation across channels | `/generate-content-calendar`, `/generate-social-content` |
| **Review** | Brand, legal, and quality validation | `/brand-validate`, `/legal-clearance` |
| **Publication** | Scheduling and deployment | `/flow-review-to-publication` |
| **Analysis** | Performance measurement and optimization | `/flow-performance-optimization` |

Check status at any point:

```
/campaign-status
```

---

## The agent roster

| Agent | Role |
|-------|------|
| `campaign-strategist` | Campaign architecture, channel strategy, measurement frameworks |
| `copywriter` | Headlines, CTAs, long-form copy, channel-specific messaging |
| `content-writer` | Blog posts, articles, case studies, whitepapers |
| `social-media-specialist` | Platform-native social content, community engagement |
| `email-marketer` | Email sequences, automation flows, subject line optimization |
| `seo-specialist` | Keyword research, on-page optimization, content briefs |
| `brand-guardian` | Brand guideline compliance, voice consistency |
| `legal-reviewer` | Regulatory compliance, claim validation, risk mitigation |
| `market-researcher` | Competitive intelligence, audience research |
| `marketing-analyst` | Performance data, trend analysis, optimization recommendations |
| `art-director` | Visual concept development, layout, brand visual consistency |

---

## Content creation

### Social content

```
Generate a week of social content for LinkedIn and Twitter announcing our new feature
```

```
/generate-social-content --campaign "Q2 launch" --channels "linkedin,twitter" --tone "professional"
```

### Blog and thought leadership

```
Write a blog post about why we moved from monolith to microservices, written as a practitioner for other practitioners
```

### Email campaigns

```
Write a 3-email nurture sequence for enterprise prospects who downloaded our whitepaper
```

### Paid copy

```
Generate 10 ad headline variants for this product feature targeting CTOs at mid-market companies
```

---

## Brand and voice consistency

The marketing framework integrates with the voice framework. Apply a brand voice profile to everything generated:

```
Use the technical-authority voice for all content in this campaign
```

Run brand compliance review before anything goes out:

```
/brand-validate path/to/content.md
```

This checks tone, vocabulary, visual description language, and structural patterns against your brand guidelines.

---

## Legal review

For campaigns making specific claims or running in regulated industries:

```
/legal-clearance path/to/campaign-assets/
```

Reviews for regulatory compliance, claim substantiation, required disclosures, and risk flags.

---

## Performance and analytics

After a campaign runs:

```
/campaign-analytics --campaign "Q2 launch" --period "last-30-days"
```

Analyzes engagement, conversion, and attribution data. The `attribution-specialist` agent models which channels drove actual results vs. coincidental traffic.

---

## Multi-channel coordination

Large campaigns spanning many channels:

```
/campaign-kickoff "Q2 Enterprise Launch" --channels "email,social,blog,paid,webinar"
```

This orchestrates content creation across all channels with consistent messaging, proper sequencing, and cross-channel coordination. The `campaign-orchestrator` agent ensures nothing conflicts and everything reinforces the core message.

---

## Campaign retrospective

When a campaign ends:

```
/marketing-retrospective --campaign "Q2 launch"
```

Documents what worked, what didn't, performance against goals, and recommendations for the next campaign. Builds organizational memory so you don't repeat the same mistakes.

---

## Key references

- `/campaign-status` — Current campaign health dashboard
- `/marketing-status` — All campaigns overview
- `/content-planning` — Editorial calendar and content pipeline
- `@agentic/code/frameworks/media-marketing-kit/README.md` — Full framework documentation
