---
name: marketing-intake
description: Initialize marketing project intake with discovery and requirements gathering
arguments:
  - name: project-type
    description: Type of marketing project (campaign, rebrand, launch, content, ongoing)
    required: false
  - name: intake-directory
    description: Directory for intake files (default .aiwg/marketing/intake)
    required: false
  - name: interactive
    description: Enable interactive question mode
    required: false
---

# Marketing Intake Command

Initialize marketing project intake with comprehensive discovery and requirements gathering.

## What This Command Does

1. **Gathers Project Information**
   - Business objectives
   - Target audience
   - Budget and timeline
   - Success criteria

2. **Assesses Requirements**
   - Deliverables needed
   - Resource requirements
   - Dependencies and constraints

3. **Creates Project Foundation**
   - Project brief
   - Team assignments
   - Initial planning documents

## Orchestration Flow

```
Marketing Intake Request
        ↓
[Project Manager] → Intake Form Collection
        ↓
[Campaign Strategist] → Strategic Assessment
        ↓
[Budget Planner] → Budget Feasibility
        ↓
[Production Coordinator] → Resource Assessment
        ↓
[Workflow Coordinator] → Process Planning
        ↓
Intake Package Complete
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Project Manager | Lead intake | Project setup |
| Campaign Strategist | Strategy | Strategic brief |
| Budget Planner | Budget | Budget framework |
| Production Coordinator | Resources | Resource plan |
| Workflow Coordinator | Process | Workflow setup |

## Intake Sections

### Business Context
- Business objectives
- Marketing goals
- Success metrics
- Key stakeholders

### Audience & Messaging
- Target audience segments
- Key messages
- Value proposition
- Competitive positioning

### Scope & Deliverables
- Required deliverables
- Channels and formats
- Quantity and specifications

### Timeline & Budget
- Key dates and milestones
- Budget range
- Resource availability

### Constraints & Dependencies
- Known constraints
- Dependencies
- Risks and concerns

## Output Artifacts

Saved to `.aiwg/marketing/intake/`:

- `project-intake.md` - Complete intake form
- `strategic-brief.md` - Strategic foundation
- `scope-definition.md` - Deliverables and scope
- `budget-framework.md` - Budget planning
- `timeline-draft.md` - Initial timeline
- `team-assignments.md` - Resource allocation

## Usage Examples

```bash
# Interactive intake
/marketing-intake --interactive

# Campaign intake
/marketing-intake --project-type campaign

# Custom directory
/marketing-intake --intake-directory ./my-project/intake
```

## Interactive Mode

When run interactively, guides through:
1. Project type and scope
2. Business objectives
3. Target audience
4. Budget and timeline
5. Deliverable requirements
6. Team and stakeholder identification

## Success Criteria

- [ ] Business objectives documented
- [ ] Target audience defined
- [ ] Deliverables specified
- [ ] Budget range established
- [ ] Timeline created
- [ ] Team assigned
- [ ] Kickoff ready
