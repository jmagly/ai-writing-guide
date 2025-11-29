---
name: pr-launch
description: Coordinate public relations launch activities and media outreach
arguments:
  - name: announcement-name
    description: Name of the PR announcement or launch
    required: true
  - name: launch-type
    description: Type of launch (product, partnership, news, event)
    required: false
  - name: project-directory
    description: Project directory path (default current directory)
    required: false
---

# PR Launch Command

Coordinate comprehensive public relations launch with media outreach and communications.

## What This Command Does

1. **Develops PR Strategy**
   - News angle and positioning
   - Target media and outlets
   - Timing and embargo strategy

2. **Creates PR Materials**
   - Press release
   - Media kit components
   - Key messages and Q&A

3. **Plans Media Outreach**
   - Media list development
   - Pitch strategy
   - Follow-up plan

## Orchestration Flow

```
PR Launch Request
        ↓
[PR Specialist] → PR Strategy & Press Release
        ↓
[Media Relations] → Media Targeting & Outreach Plan
        ↓
[Corporate Communications] → Executive Messaging
        ↓
[Content Writer] → Supporting Content
        ↓
[Legal Reviewer] → Compliance Review
        ↓
[Crisis Communications] → Issues Preparation
        ↓
PR Launch Package Complete
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| PR Specialist | Lead PR strategy | Press release, strategy |
| Media Relations | Media outreach | Media list, pitch |
| Corporate Communications | Executive voice | Quotes, messaging |
| Content Writer | Support content | Blog, social copy |
| Legal Reviewer | Compliance | Legal approval |
| Crisis Communications | Preparation | Q&A, issues brief |

## Output Artifacts

Saved to `.aiwg/marketing/pr/{announcement-name}/`:

- `pr-strategy.md` - Overall PR strategy
- `press-release.md` - Press release draft
- `media-list.md` - Target media outlets
- `pitch-template.md` - Media pitch
- `key-messages.md` - Approved messaging
- `qa-document.md` - Q&A preparation
- `media-kit.md` - Media kit contents
- `timeline.md` - Launch timeline

## Usage Examples

```bash
# Product launch PR
/pr-launch "New Product X" --launch-type product

# Partnership announcement
/pr-launch "Strategic Partnership" --launch-type partnership

# Company news
/pr-launch "Q3 Earnings" --launch-type news
```

## Success Criteria

- [ ] PR strategy approved
- [ ] Press release drafted and reviewed
- [ ] Media list compiled
- [ ] Pitch strategy defined
- [ ] Key messages approved
- [ ] Q&A prepared
- [ ] Legal review complete
- [ ] Timeline established
