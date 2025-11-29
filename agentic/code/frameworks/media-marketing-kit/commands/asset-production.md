---
name: asset-production
description: Coordinate marketing asset production from brief through delivery
arguments:
  - name: project-name
    description: Name of the production project
    required: true
  - name: asset-types
    description: Types of assets (digital, print, video, all)
    required: false
  - name: project-directory
    description: Project directory path (default current directory)
    required: false
---

# Asset Production Command

Coordinate end-to-end marketing asset production from creative brief through final delivery.

## What This Command Does

1. **Initiates Production**
   - Reviews creative brief
   - Assigns resources
   - Creates production schedule

2. **Manages Production**
   - Tracks progress
   - Coordinates reviews
   - Manages revisions

3. **Delivers Assets**
   - Quality control
   - Asset organization
   - Delivery package

## Orchestration Flow

```
Asset Production Request
        ↓
[Production Coordinator] → Production Plan
        ↓
[Traffic Manager] → Resource Assignment
        ↓
[Creative Director] → Creative Oversight
        ↓
[Art Director/Graphic Designer] → Design Production
        ↓
[Video Producer] → Video Production (if applicable)
        ↓
[Quality Controller] → QC Review
        ↓
[Asset Manager] → Asset Organization
        ↓
Final Asset Delivery
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Production Coordinator | Lead coordination | Production plan, timeline |
| Traffic Manager | Resources | Assignments, workload |
| Creative Director | Oversight | Creative direction |
| Art Director | Visual production | Design oversight |
| Graphic Designer | Design | Digital assets |
| Video Producer | Video | Video assets |
| Quality Controller | QC | Quality review |
| Asset Manager | Organization | Final delivery |

## Output Artifacts

Saved to `.aiwg/marketing/production/{project-name}/`:

- `production-plan.md` - Production schedule
- `resource-allocation.md` - Team assignments
- `progress-tracker.md` - Status tracking
- `review-feedback/` - Review rounds
- `delivery-manifest.md` - Asset list
- `qc-checklist.md` - Quality checklist

## Usage Examples

```bash
# Full production coordination
/asset-production "Spring Campaign Assets"

# Specific asset types
/asset-production "Product Launch" --asset-types video

# All assets
/asset-production "Brand Refresh" --asset-types all
```

## Success Criteria

- [ ] Production plan approved
- [ ] Resources assigned
- [ ] Timeline established
- [ ] Reviews completed
- [ ] QC passed
- [ ] Assets delivered
- [ ] Documentation complete
