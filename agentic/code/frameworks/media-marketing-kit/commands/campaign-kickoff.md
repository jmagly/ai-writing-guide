---
name: campaign-kickoff
description: Initialize a new marketing campaign with strategy, planning, and team coordination
arguments:
  - name: campaign-name
    description: Name of the campaign to initialize
    required: true
  - name: campaign-type
    description: Type of campaign (launch, awareness, demand-gen, event, rebrand)
    required: false
  - name: project-directory
    description: Project directory path (default current directory)
    required: false
---

# Campaign Kickoff Command

Initialize a new marketing campaign with comprehensive strategy and planning artifacts.

## What This Command Does

1. **Creates Campaign Structure**
   - Sets up `.aiwg/marketing/campaigns/{campaign-name}/` directory
   - Initializes campaign brief, strategy, and planning templates

2. **Orchestrates Strategy Development**
   - Campaign Strategist develops initial strategy
   - Market Researcher provides competitive context
   - Positioning Specialist refines messaging framework

3. **Establishes Campaign Foundation**
   - Campaign charter with objectives and KPIs
   - Target audience definition
   - Channel strategy outline
   - Budget framework
   - Timeline with milestones

## Orchestration Flow

```
Campaign Kickoff Request
        ↓
[Create Directory Structure]
        ↓
[Campaign Strategist] → Campaign Brief Draft
        ↓
[Market Researcher] → Competitive Context
        ↓
[Positioning Specialist] → Messaging Framework
        ↓
[Campaign Orchestrator] → Integrated Plan
        ↓
[Project Manager] → Timeline & Resources
        ↓
Campaign Ready for Execution
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Campaign Strategist | Primary strategy | Campaign brief, objectives |
| Market Researcher | Context | Competitive landscape |
| Positioning Specialist | Messaging | Value proposition, key messages |
| Campaign Orchestrator | Integration | Channel plan, timeline |
| Project Manager | Coordination | Resource plan, milestones |

## Output Artifacts

All artifacts saved to `.aiwg/marketing/campaigns/{campaign-name}/`:

- `campaign-brief.md` - Campaign overview and strategy
- `campaign-charter.md` - Formal campaign charter
- `audience-definition.md` - Target audience profiles
- `messaging-framework.md` - Key messages and positioning
- `channel-strategy.md` - Channel mix and allocation
- `campaign-timeline.md` - Milestones and schedule
- `budget-plan.md` - Budget allocation and tracking

## Usage Examples

```bash
# Basic campaign kickoff
/campaign-kickoff "Spring Product Launch"

# Specify campaign type
/campaign-kickoff "Brand Awareness Q2" --campaign-type awareness

# With custom project directory
/campaign-kickoff "Holiday Campaign" --project-directory ./marketing
```

## Interactive Mode

When run interactively, prompts for:
- Campaign objectives (primary and secondary)
- Target audience segments
- Available budget range
- Key dates and constraints
- Stakeholder requirements

## Success Criteria

Campaign kickoff is complete when:
- [ ] Campaign brief approved by stakeholders
- [ ] Objectives and KPIs defined
- [ ] Target audience documented
- [ ] Channel strategy outlined
- [ ] Timeline established
- [ ] Budget allocated
- [ ] Team assigned
