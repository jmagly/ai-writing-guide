---
name: marketing-status
description: Generate comprehensive marketing status report across all active initiatives
arguments:
  - name: report-type
    description: Type of status report (daily, weekly, monthly, executive)
    required: false
  - name: focus-area
    description: Specific focus area (campaigns, content, brand, all)
    required: false
  - name: project-directory
    description: Project directory path (default current directory)
    required: false
---

# Marketing Status Command

Generate comprehensive status report across all active marketing initiatives.

## What This Command Does

1. **Aggregates Status**
   - Active campaigns
   - Content production
   - Creative projects
   - Analytics highlights

2. **Identifies Issues**
   - At-risk items
   - Blockers
   - Resource constraints

3. **Provides Recommendations**
   - Priority actions
   - Resource reallocation
   - Optimization opportunities

## Orchestration Flow

```
Marketing Status Request
        ↓
[Project Manager] → Project Status Collection
        ↓
[Campaign Orchestrator] → Campaign Status
        ↓
[Production Coordinator] → Production Status
        ↓
[Marketing Analyst] → Performance Highlights
        ↓
[Reporting Specialist] → Report Generation
        ↓
Comprehensive Status Report
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Project Manager | Overall status | Project tracking |
| Campaign Orchestrator | Campaigns | Campaign status |
| Production Coordinator | Production | Asset status |
| Marketing Analyst | Analytics | Performance data |
| Reporting Specialist | Reporting | Final report |

## Report Types

| Type | Audience | Content |
|------|----------|---------|
| Daily | Team | Quick metrics, blockers |
| Weekly | Team + Management | Detailed status, actions |
| Monthly | Leadership | Summary, trends, outlook |
| Executive | C-suite | High-level, strategic |

## Output Artifacts

Saved to `.aiwg/marketing/reports/`:

- `status-{date}.md` - Status report
- `dashboards/` - Dashboard data
- `action-items.md` - Priority actions
- `risk-register.md` - Active risks

## Usage Examples

```bash
# Weekly status
/marketing-status --report-type weekly

# Executive summary
/marketing-status --report-type executive

# Focus on campaigns
/marketing-status --report-type weekly --focus-area campaigns
```

## Success Criteria

- [ ] All active initiatives covered
- [ ] Status accurately reflected
- [ ] Issues and risks identified
- [ ] Actions prioritized
- [ ] Report delivered to stakeholders
