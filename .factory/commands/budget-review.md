---
name: budget-review
description: Analyze marketing budget allocation, spending, and ROI performance
model: claude-sonnet-4-5-20250929
tools: ["Read","LS","Grep","Glob","Edit","Create","Execute","Task","TodoWrite","WebSearch","FetchUrl"]
---

# Budget Review Command

Analyze marketing budget performance with spend tracking, ROI analysis, and optimization recommendations.

## What This Command Does

1. **Tracks Spending**
   - Budget vs. actual
   - Category breakdown
   - Variance analysis

2. **Analyzes ROI**
   - Channel efficiency
   - Campaign ROI
   - Cost per acquisition

3. **Provides Recommendations**
   - Reallocation opportunities
   - Efficiency improvements
   - Forecasting

## Orchestration Flow

```
Budget Review Request
        ↓
[Budget Planner] → Budget Analysis
        ↓
[Marketing Analyst] → Performance Correlation
        ↓
[Attribution Specialist] → Channel ROI
        ↓
[Campaign Orchestrator] → Campaign Efficiency
        ↓
[Reporting Specialist] → Budget Report
        ↓
Budget Review Complete
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Budget Planner | Lead analysis | Budget tracking |
| Marketing Analyst | Performance | ROI analysis |
| Attribution Specialist | Attribution | Channel efficiency |
| Campaign Orchestrator | Campaigns | Campaign costs |
| Reporting Specialist | Reporting | Final report |

## Output Artifacts

Saved to `.aiwg/marketing/budget/`:

- `budget-review-{period}.md` - Budget analysis
- `roi-analysis.md` - ROI breakdown
- `variance-report.md` - Budget vs. actual
- `recommendations.md` - Optimization suggestions
- `forecast.md` - Forward projections

## Parameter Handling

### --guidance Parameter

**Purpose**: Provide upfront direction to tailor priorities and approach

**Examples**:
```bash
--guidance "Q4 optimization, reallocate underperforming channels"
--guidance "New budget request justification"
--guidance "Year-end close, maximize ROI"
```

**How Applied**:
- Parse guidance for keywords: priority, timeline, audience, focus, constraints
- Adjust agent emphasis and output depth based on stated priorities
- Modify deliverable order based on timeline constraints
- Influence scope and detail level based on context

### --interactive Parameter

**Purpose**: Guide through discovery questions for comprehensive input

**Questions Asked** (if --interactive):
1. What is the review period?
2. What triggered this review?
3. Are there specific channels to analyze?
4. What is the decision context (optimization, new request)?
5. Who needs this analysis?

## Usage Examples

```bash
# Quarterly review
/budget-review "Q3 2024"

# YTD paid media
/budget-review "YTD" --budget-area paid-media

# Monthly all areas
/budget-review "October 2024" --budget-area all

# With strategic guidance
/budget-review "Example" --guidance "Your specific context here"

# Interactive mode
/budget-review "Example" --interactive
```

## Success Criteria

- [ ] Spending tracked against budget
- [ ] Variances explained
- [ ] ROI calculated by channel/campaign
- [ ] Optimization opportunities identified
- [ ] Reallocation recommendations provided
- [ ] Forecast updated