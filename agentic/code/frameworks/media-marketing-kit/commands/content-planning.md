---
name: content-planning
description: Create comprehensive content strategy and editorial calendar
argument-hint: "<planning-period> [--content-focus value] [--project-directory value] [--guidance "text"] [--interactive]"
arguments:
  - name: planning-period
    description: Time period for content plan (Q1, Q2, monthly, etc.)
    required: true
  - name: content-focus
    description: Primary content focus area (optional)
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

# Content Planning Command

Develop comprehensive content strategy with editorial calendar, topic clusters, and distribution plan.

## What This Command Does

1. **Analyzes Content Needs**
   - Reviews business objectives
   - Identifies audience content preferences
   - Audits existing content performance

2. **Develops Content Strategy**
   - Content pillars and themes
   - Topic clusters and SEO strategy
   - Content types and formats

3. **Creates Editorial Calendar**
   - Publishing schedule
   - Content assignments
   - Distribution plan

## Orchestration Flow

```
Content Planning Request
        ↓
[Content Strategist] → Content Strategy Framework
        ↓
[SEO Specialist] → Keyword & Topic Research
        ↓
[Content Writer] → Content Brief Templates
        ↓
[Social Media Specialist] → Distribution Strategy
        ↓
[Editor] → Editorial Standards
        ↓
Integrated Content Plan
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Content Strategist | Lead strategy | Content pillars, themes |
| SEO Specialist | SEO alignment | Keywords, topic clusters |
| Content Writer | Brief development | Content templates |
| Social Media Specialist | Distribution | Social calendar |
| Editor | Quality standards | Style guide, standards |

## Output Artifacts

Saved to `.aiwg/marketing/content/`:

- `content-strategy.md` - Overall content strategy
- `editorial-calendar.md` - Publishing schedule
- `topic-clusters.md` - SEO topic organization
- `content-briefs/` - Individual content briefs
- `distribution-plan.md` - Channel distribution strategy
- `content-standards.md` - Quality guidelines

## Parameter Handling

### --guidance Parameter

**Purpose**: Provide upfront direction to tailor priorities and approach

**Examples**:
```bash
--guidance "SEO-driven content for organic growth"
--guidance "Thought leadership focus for executives"
--guidance "Product education for onboarding"
```

**How Applied**:
- Parse guidance for keywords: priority, timeline, audience, focus, constraints
- Adjust agent emphasis and output depth based on stated priorities
- Modify deliverable order based on timeline constraints
- Influence scope and detail level based on context

### --interactive Parameter

**Purpose**: Guide through discovery questions for comprehensive input

**Questions Asked** (if --interactive):
1. What are the primary content goals?
2. What content formats work best for your audience?
3. What topics/themes are priorities?
4. What is the publishing cadence target?
5. What resources are available for content creation?
6. What distribution channels will be used?

## Usage Examples

```bash
# Quarterly content planning
/content-planning "Q1 2024"

# Monthly with focus area
/content-planning "January 2024" --content-focus "product education"

# With project directory
/content-planning "Q2" --project-directory ./marketing-team

# With strategic guidance
/content-planning "Example" --guidance "Your specific context here"

# Interactive mode
/content-planning "Example" --interactive
```

## Success Criteria

- [ ] Content strategy aligned with business goals
- [ ] Editorial calendar populated
- [ ] Topic clusters defined with keywords
- [ ] Content briefs created for priority content
- [ ] Distribution strategy documented
- [ ] Quality standards established
