---
name: creative-brief
description: Generate comprehensive creative brief for design and content projects
argument-hint: "<project-name> [--asset-type type] [--guidance \"text\"] [--interactive]"
arguments:
  - name: project-name
    description: Name of the creative project
    required: true
  - name: asset-type
    description: Type of asset (campaign, video, print, digital, brand)
    required: false
  - name: guidance
    description: Strategic guidance to tailor creative direction and priorities
    required: false
  - name: interactive
    description: Enable interactive mode with discovery questions
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

## Parameter Handling

### --guidance Parameter

**Purpose**: Provide upfront direction to tailor creative priorities and approach

**Examples**:
```bash
--guidance "Minimalist aesthetic, focus on product photography over lifestyle"
--guidance "Tight 2-week deadline, prioritize hero assets first"
--guidance "Must appeal to Gen Z, TikTok-first approach"
--guidance "Accessibility critical, WCAG AAA target"
```

**How Applied**:
- Parse guidance for keywords: style, timeline, audience, platform, accessibility
- Adjust visual direction emphasis based on stated preferences
- Modify deliverable priorities based on timeline constraints
- Influence tone and messaging based on audience focus

### --interactive Parameter

**Purpose**: Guide through discovery questions to build comprehensive brief

**Questions Asked** (if --interactive):
1. What are the primary objectives for this creative?
2. Who is the target audience? (demographics, psychographics)
3. What key messages must be communicated?
4. Are there visual references or style examples to follow?
5. What are the mandatory brand elements?
6. What restrictions or constraints apply?
7. What is the budget and timeline?
8. Who needs to approve the final deliverables?

## Usage Examples

```bash
# Basic creative brief
/creative-brief "Holiday Campaign 2024"

# With asset type
/creative-brief "Product Launch Video" --asset-type video

# With strategic guidance
/creative-brief "Brand Refresh" --guidance "Premium feel, competitor X as anti-reference"

# Interactive mode with guidance
/creative-brief "Q1 Launch" --interactive --guidance "Focus on mobile-first assets"

# Full specification
/creative-brief "Brand Refresh" --asset-type brand --project-directory ./brand-team
```

## Success Criteria

- [ ] Business objectives clearly stated
- [ ] Target audience defined
- [ ] Key messages documented
- [ ] Visual direction established
- [ ] Deliverables specified with dimensions
- [ ] Timeline with milestones
- [ ] Approval workflow defined
