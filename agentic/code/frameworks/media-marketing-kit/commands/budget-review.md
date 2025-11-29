---
name: budget-review
description: Analyze marketing budget allocation, spending, and ROI performance
arguments:
  - name: review-period
    description: Period to review (monthly, quarterly, YTD, annual)
    required: true
  - name: budget-area
    description: Specific budget area (all, paid-media, content, events)
    required: false
  - name: project-directory
    description: Project directory path (default current directory)
    required: false
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

## Usage Examples

```bash
# Quarterly review
/budget-review "Q3 2024"

# YTD paid media
/budget-review "YTD" --budget-area paid-media

# Monthly all areas
/budget-review "October 2024" --budget-area all
```

## Success Criteria

- [ ] Spending tracked against budget
- [ ] Variances explained
- [ ] ROI calculated by channel/campaign
- [ ] Optimization opportunities identified
- [ ] Reallocation recommendations provided
- [ ] Forecast updated
