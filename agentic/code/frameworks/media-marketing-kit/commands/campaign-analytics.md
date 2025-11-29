---
name: campaign-analytics
description: Generate comprehensive campaign performance analysis and recommendations
arguments:
  - name: campaign-name
    description: Name of campaign to analyze
    required: true
  - name: analysis-type
    description: Type of analysis (daily, weekly, final, deep-dive)
    required: false
  - name: project-directory
    description: Project directory path (default current directory)
    required: false
---

# Campaign Analytics Command

Generate comprehensive campaign performance analysis with insights and optimization recommendations.

## What This Command Does

1. **Collects Performance Data**
   - Channel-level metrics
   - Conversion funnel data
   - Attribution analysis

2. **Analyzes Performance**
   - KPI achievement
   - Trend analysis
   - Comparative benchmarks

3. **Generates Recommendations**
   - Optimization opportunities
   - Budget reallocation suggestions
   - Strategic insights

## Orchestration Flow

```
Campaign Analytics Request
        ↓
[Marketing Analyst] → Performance Analysis
        ↓
[Data Analyst] → Data Quality & Processing
        ↓
[Attribution Specialist] → Attribution Analysis
        ↓
[Reporting Specialist] → Report Generation
        ↓
[Campaign Strategist] → Strategic Recommendations
        ↓
Comprehensive Campaign Report
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Marketing Analyst | Performance analysis | KPI tracking, insights |
| Data Analyst | Data processing | Clean data, validation |
| Attribution Specialist | Attribution | Channel contribution |
| Reporting Specialist | Reporting | Visualizations, report |
| Campaign Strategist | Strategy | Recommendations |

## Analysis Types

| Type | Scope | Use Case |
|------|-------|----------|
| Daily | Quick metrics snapshot | During launch |
| Weekly | Detailed channel review | Ongoing optimization |
| Final | Complete campaign analysis | Post-campaign |
| Deep-dive | Specific area analysis | Problem solving |

## Output Artifacts

Saved to `.aiwg/marketing/analytics/{campaign-name}/`:

- `performance-summary.md` - Executive summary
- `channel-analysis.md` - Channel-by-channel breakdown
- `attribution-report.md` - Attribution analysis
- `recommendations.md` - Optimization recommendations
- `final-report.md` - Comprehensive final report

## Usage Examples

```bash
# Weekly analysis
/campaign-analytics "Spring Launch" --analysis-type weekly

# Final campaign report
/campaign-analytics "Q1 Awareness" --analysis-type final

# Deep-dive on specific issue
/campaign-analytics "Holiday Campaign" --analysis-type deep-dive
```

## Success Criteria

- [ ] All channel data collected
- [ ] KPIs tracked against targets
- [ ] Attribution analysis complete
- [ ] Insights documented
- [ ] Actionable recommendations provided
- [ ] Report delivered to stakeholders
