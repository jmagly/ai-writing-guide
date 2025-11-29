---
name: competitive-analysis
description: Conduct comprehensive competitive marketing analysis
arguments:
  - name: analysis-focus
    description: Focus area (overall, messaging, digital, content, campaigns)
    required: false
  - name: competitors
    description: Comma-separated list of competitors to analyze
    required: false
  - name: project-directory
    description: Project directory path (default current directory)
    required: false
---

# Competitive Analysis Command

Conduct comprehensive analysis of competitor marketing strategies, tactics, and positioning.

## What This Command Does

1. **Audits Competitors**
   - Digital presence
   - Messaging and positioning
   - Content strategy
   - Campaign activity

2. **Analyzes Landscape**
   - Share of voice
   - Positioning gaps
   - Best practices

3. **Generates Insights**
   - Competitive advantages
   - Opportunity areas
   - Strategic recommendations

## Orchestration Flow

```
Competitive Analysis Request
        ↓
[Market Researcher] → Market Landscape
        ↓
[Positioning Specialist] → Positioning Analysis
        ↓
[Content Strategist] → Content Comparison
        ↓
[Social Media Specialist] → Social Analysis
        ↓
[SEO Specialist] → SEO/Digital Audit
        ↓
[Marketing Analyst] → Benchmarks & Metrics
        ↓
Competitive Intelligence Report
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Market Researcher | Lead research | Market landscape |
| Positioning Specialist | Positioning | Messaging analysis |
| Content Strategist | Content | Content comparison |
| Social Media Specialist | Social | Social audit |
| SEO Specialist | Digital | SEO analysis |
| Marketing Analyst | Metrics | Benchmarks |

## Output Artifacts

Saved to `.aiwg/marketing/competitive/`:

- `competitive-landscape.md` - Market overview
- `competitor-profiles/` - Individual competitor analyses
- `positioning-map.md` - Competitive positioning
- `content-analysis.md` - Content comparison
- `digital-audit.md` - Digital presence
- `opportunity-gaps.md` - Strategic opportunities
- `recommendations.md` - Action items

## Usage Examples

```bash
# Overall competitive analysis
/competitive-analysis

# Focus on messaging
/competitive-analysis --analysis-focus messaging

# Specific competitors
/competitive-analysis --competitors "CompA,CompB,CompC"
```

## Success Criteria

- [ ] Key competitors identified
- [ ] Positioning mapped
- [ ] Messaging analyzed
- [ ] Content strategies compared
- [ ] Digital presence audited
- [ ] Gaps and opportunities identified
- [ ] Actionable recommendations provided
