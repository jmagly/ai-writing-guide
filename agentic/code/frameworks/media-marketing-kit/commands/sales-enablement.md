---
name: sales-enablement
description: Create sales enablement materials and resources for sales team
arguments:
  - name: material-type
    description: Type of material (all, presentations, battlecards, case-studies, playbooks)
    required: false
  - name: product-focus
    description: Specific product or solution focus
    required: false
  - name: project-directory
    description: Project directory path (default current directory)
    required: false
---

# Sales Enablement Command

Create comprehensive sales enablement materials to support sales team effectiveness.

## What This Command Does

1. **Develops Sales Content**
   - Product presentations
   - Competitive battlecards
   - Case studies and proof points

2. **Creates Sales Tools**
   - Sales playbooks
   - Objection handling guides
   - ROI calculators

3. **Organizes Resources**
   - Content library
   - Usage guidelines
   - Training materials

## Orchestration Flow

```
Sales Enablement Request
        ↓
[Content Strategist] → Content Strategy
        ↓
[Copywriter] → Sales Copy
        ↓
[Technical Marketing Writer] → Technical Content
        ↓
[Graphic Designer] → Visual Materials
        ↓
[Market Researcher] → Competitive Intelligence
        ↓
[Positioning Specialist] → Messaging Alignment
        ↓
[Asset Manager] → Content Organization
        ↓
Sales Enablement Package Complete
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Content Strategist | Strategy | Content plan |
| Copywriter | Copy | Sales messaging |
| Technical Marketing Writer | Technical | Product content |
| Graphic Designer | Design | Visual materials |
| Market Researcher | Research | Competitive intel |
| Positioning Specialist | Messaging | Value props |
| Asset Manager | Organization | Content library |

## Material Types

| Type | Purpose | Typical Format |
|------|---------|----------------|
| Presentations | Customer meetings | PPT/Google Slides |
| Battlecards | Competitive selling | 1-2 page PDF |
| Case Studies | Proof of value | PDF/Web |
| Playbooks | Sales process | PDF/Wiki |
| One-pagers | Quick reference | 1-page PDF |

## Output Artifacts

Saved to `.aiwg/marketing/sales-enablement/`:

- `content-inventory.md` - All materials index
- `presentations/` - Sales presentations
- `battlecards/` - Competitive materials
- `case-studies/` - Customer success stories
- `playbooks/` - Sales playbooks
- `one-pagers/` - Quick reference guides
- `objection-handling.md` - Objection responses
- `roi-tools/` - ROI calculators
- `training-guide.md` - How to use materials

## Usage Examples

```bash
# Full sales enablement package
/sales-enablement --material-type all

# Specific material type
/sales-enablement --material-type battlecards

# Product-focused
/sales-enablement --material-type all --product-focus "Enterprise Plan"
```

## Success Criteria

- [ ] Content strategy aligned with sales needs
- [ ] Key materials created
- [ ] Competitive intelligence current
- [ ] Materials properly branded
- [ ] Content library organized
- [ ] Training documentation provided
- [ ] Sales team briefed
