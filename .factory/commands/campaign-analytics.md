---
name: campaign-analytics
description: Generate comprehensive campaign performance analysis and recommendations
model: claude-sonnet-4-5-20250929
tools: ["Read","LS","Grep","Glob","Edit","Create","Execute","Task","TodoWrite","WebSearch","FetchUrl"]
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

## Parameter Handling

### --guidance Parameter

**Purpose**: Provide upfront direction to tailor priorities and approach

**Examples**:
```bash
--guidance "Focus on attribution across paid channels"
--guidance "Need deep-dive on email performance"
--guidance "Benchmark against Q3 results"
```

**How Applied**:
- Parse guidance for keywords: priority, timeline, audience, focus, constraints
- Adjust agent emphasis and output depth based on stated priorities
- Modify deliverable order based on timeline constraints
- Influence scope and detail level based on context

### --interactive Parameter

**Purpose**: Guide through discovery questions for comprehensive input

**Questions Asked** (if --interactive):
1. What specific metrics are you most interested in?
2. What time period should be analyzed?
3. Are there specific channels to focus on?
4. What benchmarks should we compare against?
5. Who is the audience for this report?

## Usage Examples

```bash
# Weekly analysis
/campaign-analytics "Spring Launch" --analysis-type weekly

# Final campaign report
/campaign-analytics "Q1 Awareness" --analysis-type final

# Deep-dive on specific issue
/campaign-analytics "Holiday Campaign" --analysis-type deep-dive

# With strategic guidance
/campaign-analytics "Example" --guidance "Your specific context here"

# Interactive mode
/campaign-analytics "Example" --interactive
```

## Success Criteria

- [ ] All channel data collected
- [ ] KPIs tracked against targets
- [ ] Attribution analysis complete
- [ ] Insights documented
- [ ] Actionable recommendations provided
- [ ] Report delivered to stakeholders