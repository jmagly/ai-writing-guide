---
name: video-production
description: Plan and coordinate video marketing production from concept to delivery
argument-hint: "<project-name> [--video-type value] [--project-directory value] [--guidance "text"] [--interactive]"
arguments:
  - name: project-name
    description: Name of the video project
    required: true
  - name: video-type
    description: Type of video (brand, product, testimonial, social, tutorial)
    required: false
  - name: guidance
    description: Strategic guidance to tailor priorities and approach
    required: false
  - name: interactive
    description: Enable interactive mode with discovery questions
    required: false

  - name: project-directory
    description: Project directory path (default current directory)
    required: false
---

# Video Production Command

Plan and coordinate video marketing production from concept development to final delivery.

## What This Command Does

1. **Develops Concept**
   - Creative concept
   - Script/storyboard
   - Production approach

2. **Plans Production**
   - Budget and timeline
   - Production requirements
   - Talent and locations

3. **Coordinates Delivery**
   - Post-production plan
   - Deliverable versions
   - Distribution strategy

## Orchestration Flow

```
Video Production Request
        ↓
[Video Producer] → Production Strategy
        ↓
[Scriptwriter] → Script Development
        ↓
[Creative Director] → Creative Approval
        ↓
[Production Coordinator] → Production Planning
        ↓
[Legal Reviewer] → Rights & Compliance
        ↓
[Quality Controller] → Video QC
        ↓
[Accessibility Checker] → Captions & Accessibility
        ↓
Video Production Package Complete
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Video Producer | Lead production | Production plan |
| Scriptwriter | Script | Script, storyboard |
| Creative Director | Creative | Creative direction |
| Production Coordinator | Logistics | Schedule, resources |
| Legal Reviewer | Compliance | Rights clearance |
| Quality Controller | QC | Quality review |
| Accessibility Checker | Accessibility | Captions |

## Video Types

| Type | Typical Length | Primary Use |
|------|----------------|-------------|
| Brand | 1-3 minutes | Awareness, website |
| Product | 30s-2min | Education, conversion |
| Testimonial | 1-2 minutes | Trust, conversion |
| Social | 15-60 seconds | Engagement, reach |
| Tutorial | 3-10 minutes | Education, support |

## Output Artifacts

Saved to `.aiwg/marketing/video/{project-name}/`:

- `video-brief.md` - Production brief
- `script.md` - Video script
- `storyboard.md` - Visual storyboard
- `production-plan.md` - Production schedule
- `budget.md` - Production budget
- `shot-list.md` - Shot planning
- `deliverables.md` - Output specifications
- `distribution-plan.md` - Publishing strategy

## Parameter Handling

### --guidance Parameter

**Purpose**: Provide upfront direction to tailor priorities and approach

**Examples**:
```bash
--guidance "Low-budget, authentic style over polished"
--guidance "Testimonial focus, customer voices"
--guidance "Short-form for social, under 60 seconds"
```

**How Applied**:
- Parse guidance for keywords: priority, timeline, audience, focus, constraints
- Adjust agent emphasis and output depth based on stated priorities
- Modify deliverable order based on timeline constraints
- Influence scope and detail level based on context

### --interactive Parameter

**Purpose**: Guide through discovery questions for comprehensive input

**Questions Asked** (if --interactive):
1. What type of video is being produced?
2. What is the target length?
3. Where will this video be distributed?
4. What is the budget range?
5. What is the production timeline?
6. What style/tone is appropriate?

## Usage Examples

```bash
# Brand video
/video-production "Company Story" --video-type brand

# Product demo
/video-production "Product X Demo" --video-type product

# Social content
/video-production "Feature Highlights" --video-type social

# With strategic guidance
/video-production "Example" --guidance "Your specific context here"

# Interactive mode
/video-production "Example" --interactive
```

## Success Criteria

- [ ] Creative concept approved
- [ ] Script finalized
- [ ] Production plan complete
- [ ] Budget approved
- [ ] Rights cleared
- [ ] Deliverables specified
- [ ] Distribution planned
