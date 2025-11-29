---
name: creative-brief
description: Generate comprehensive creative brief for design and content projects
arguments:
  - name: project-name
    description: Name of the creative project
    required: true
  - name: asset-type
    description: Type of asset (campaign, video, print, digital, brand)
    required: false
  - name: project-directory
    description: Project directory path (default current directory)
    required: false
---

# Creative Brief Command

Generate comprehensive creative brief to guide design and content development.

## What This Command Does

1. **Gathers Project Context**
   - Business objectives
   - Target audience
   - Key messages

2. **Develops Creative Direction**
   - Visual direction
   - Tone and voice
   - Creative mandatories

3. **Documents Requirements**
   - Deliverables and specifications
   - Timeline and milestones
   - Review and approval process

## Orchestration Flow

```
Creative Brief Request
        ↓
[Campaign Strategist] → Strategic Context
        ↓
[Creative Director] → Creative Strategy
        ↓
[Art Director] → Visual Direction
        ↓
[Copywriter] → Verbal Direction
        ↓
[Brand Guardian] → Brand Compliance Check
        ↓
[Production Coordinator] → Deliverables & Timeline
        ↓
Complete Creative Brief
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Campaign Strategist | Strategy context | Objectives, audience |
| Creative Director | Creative vision | Creative strategy |
| Art Director | Visual direction | Mood, style |
| Copywriter | Verbal direction | Tone, messaging |
| Brand Guardian | Compliance | Brand requirements |
| Production Coordinator | Logistics | Specs, timeline |

## Output Artifacts

Saved to `.aiwg/marketing/creative/briefs/`:

- `{project-name}-creative-brief.md` - Complete creative brief
- `{project-name}-visual-direction.md` - Mood board description
- `{project-name}-deliverables.md` - Asset specifications
- `{project-name}-timeline.md` - Production schedule

## Usage Examples

```bash
# Basic creative brief
/creative-brief "Holiday Campaign 2024"

# With asset type
/creative-brief "Product Launch Video" --asset-type video

# Full specification
/creative-brief "Brand Refresh" --asset-type brand --project-directory ./brand-team
```

## Interactive Mode

Prompts for:
- Project objectives and success metrics
- Target audience details
- Key messages and proof points
- Visual preferences and examples
- Mandatories and restrictions
- Budget and timeline constraints

## Success Criteria

- [ ] Business objectives clearly stated
- [ ] Target audience defined
- [ ] Key messages documented
- [ ] Visual direction established
- [ ] Deliverables specified with dimensions
- [ ] Timeline with milestones
- [ ] Approval workflow defined
