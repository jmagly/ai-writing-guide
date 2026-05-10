---
name: marketing-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: Marketing framework quick reference — capability domains and curated discovery phrases for campaign intake, brand compliance, content production, audience synthesis, and approval workflows
---

# Marketing Framework — Quick Reference

This is your always-loaded directory for the AIWG **media-marketing-kit** framework (33 skills — the largest by skill count). It does **not** list every skill. Instead, it teaches the framework's domains and gives you **curated search phrases** that map to `aiwg discover` lookups.

## Canonical access pattern: discover → show

When you find a candidate via `aiwg discover`, fetch its body with `aiwg show <type> <name>`. **Never** use `find`, `ls`, `Glob`, or direct `Read` on `<provider>/skills/` paths — those reflect the kernel-pivot deploy state, not the full surface.

```bash
aiwg discover "<phrase>"             # find — returns ranked candidates
aiwg show skill <name>               # fetch — streams the SKILL.md body
```

If your platform's Skill tool errors on a non-kernel skill (expected — most aren't kernel), the fallback is `aiwg show`, never filesystem browsing. Last-resort if `aiwg` itself is broken: read directly from `$AIWG_ROOT/agentic/code/...` (the canonical corpus, always present).

## How to use this quickref

1. Identify the **capability domain** the user's need belongs to
2. Pick a **curated phrase** from that domain (or paraphrase the user's words)
3. Run `aiwg discover "<phrase>"` and surface the top match (or top-3) to the user

**Do not enumerate skills from memory.** Discovery is the lookup surface.

## What this framework is for

Full marketing operations stack: campaign strategy and intake, content production (briefs / scripts / asset production), audience synthesis, brand compliance and identity refinement, multi-stakeholder approval workflows, performance analytics, and crisis / event / email / social-strategy primitives.

## Capability domains

| Domain | Covers |
|---|---|
| **Intake & strategy** | Campaign intake forms, audience synthesis, competitive intel |
| **Brand** | Identity refinement, compliance, audit/review |
| **Production** | Creative briefs, asset production, video, email, social, content planning |
| **Approval & QA** | Multi-stakeholder approval routing, asset QA protocol |
| **Analytics & reporting** | Campaign analytics, performance digests, attribution |
| **Operations** | Project status, retrospectives, kickoffs, data pipelines |
| **Cross-cutting** | Crisis response, legal compliance, budget review, PR launch |

## Curated discovery phrases

### Intake & strategy

```bash
aiwg discover "marketing intake wizard"        # → marketing-intake-wizard (score 1.00)
aiwg discover "intake start campaign"          # → intake-start-campaign
aiwg discover "intake from campaign"           # → intake-from-campaign
aiwg discover "audience synthesis"             # → audience-synthesis
aiwg discover "competitive intel"              # → competitive-intel (score 0.82)
aiwg discover "competitive analysis"           # → competitive-analysis
```

### Brand

```bash
aiwg discover "brand identity refinement"      # → brand-identity-refinement
aiwg discover "brand compliance"               # → brand-compliance
aiwg discover "brand audit"                    # → brand-audit
aiwg discover "brand review"                   # → brand-review
```

### Production

```bash
aiwg discover "creative brief"                 # → creative-brief (score 0.93)
aiwg discover "asset production"               # → asset-production
aiwg discover "video production"               # → video-production
aiwg discover "email campaign"                 # → email-campaign
aiwg discover "social strategy"                # → social-strategy
aiwg discover "event marketing"                # → event-marketing
aiwg discover "sales enablement"               # → sales-enablement
aiwg discover "content planning"               # → content-planning
```

### Approval & QA

```bash
aiwg discover "approval workflow"              # → approval-workflow
aiwg discover "qa protocol"                    # → qa-protocol
```

### Analytics & reporting

```bash
aiwg discover "campaign analytics"             # → campaign-analytics (score 0.93)
aiwg discover "performance digest"             # → performance-digest
aiwg discover "data pipeline marketing"        # → data-pipeline
aiwg discover "marketing review synthesis"     # → review-synthesis
```

### Operations

```bash
aiwg discover "marketing status"               # → marketing-status
aiwg discover "marketing retrospective"        # → marketing-retrospective
aiwg discover "campaign kickoff"               # → campaign-kickoff
aiwg discover "pr launch"                      # → pr-launch
```

### Cross-cutting

```bash
aiwg discover "crisis response"                # → crisis-response
aiwg discover "legal compliance"               # → legal-compliance
aiwg discover "budget review"                  # → budget-review
```

## Phase model

```
Intake → Strategy → Production → Distribution → Analytics → Retrospective
   marketing-intake     creative-brief     approval-workflow     campaign-analytics
   intake-start-campaign asset-production  qa-protocol           performance-digest
                        video-production
                        email-campaign
                        social-strategy
```

## Artifact directory layout

```
.aiwg/marketing/
├── intake/           # Campaign intake forms, brand profiles
├── strategy/         # Audience, positioning, channel mix
├── production/       # Creative briefs, asset specs
├── assets/           # Produced creative (links / metadata)
├── analytics/        # Performance reports, attribution
└── retrospectives/   # Lessons learned per campaign
```

## When the curated phrases don't fit

```bash
aiwg discover "<your need, paraphrased>" --limit 5
```

## Anti-pattern: don't enumerate

If a user asks "what marketing skills are available?", **do not list from this skill**. Run:

```bash
aiwg discover --type skill --limit 20 "<their interest area>"
```
