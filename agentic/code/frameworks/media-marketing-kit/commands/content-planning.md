---
name: content-planning
description: Create comprehensive content strategy and editorial calendar
arguments:
  - name: planning-period
    description: Time period for content plan (Q1, Q2, monthly, etc.)
    required: true
  - name: content-focus
    description: Primary content focus area (optional)
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

## Usage Examples

```bash
# Quarterly content planning
/content-planning "Q1 2024"

# Monthly with focus area
/content-planning "January 2024" --content-focus "product education"

# With project directory
/content-planning "Q2" --project-directory ./marketing-team
```

## Success Criteria

- [ ] Content strategy aligned with business goals
- [ ] Editorial calendar populated
- [ ] Topic clusters defined with keywords
- [ ] Content briefs created for priority content
- [ ] Distribution strategy documented
- [ ] Quality standards established
