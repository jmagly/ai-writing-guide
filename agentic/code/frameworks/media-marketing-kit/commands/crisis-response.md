---
name: crisis-response
description: Coordinate rapid response to brand or communications crisis
arguments:
  - name: crisis-id
    description: Identifier for the crisis situation
    required: true
  - name: severity
    description: Crisis severity level (low, medium, high, critical)
    required: false
  - name: project-directory
    description: Project directory path (default current directory)
    required: false
---

# Crisis Response Command

Coordinate rapid response to brand, reputation, or communications crisis.

## What This Command Does

1. **Assesses Situation**
   - Crisis severity
   - Stakeholder impact
   - Response urgency

2. **Develops Response**
   - Key messages
   - Stakeholder communications
   - Response timeline

3. **Coordinates Execution**
   - Team mobilization
   - Channel management
   - Ongoing monitoring

## Orchestration Flow

```
Crisis Response Request
        ↓
[Crisis Communications] → Situation Assessment
        ↓
[Corporate Communications] → Executive Messaging
        ↓
[PR Specialist] → Media Response
        ↓
[Social Media Specialist] → Social Response
        ↓
[Internal Communications] → Employee Communications
        ↓
[Legal Reviewer] → Legal Review
        ↓
Crisis Response Package Ready
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Crisis Communications | Lead response | Crisis plan |
| Corporate Communications | Executive voice | Leadership messages |
| PR Specialist | Media | Press statements |
| Social Media Specialist | Social | Social response |
| Internal Communications | Internal | Employee comms |
| Legal Reviewer | Legal | Statement review |

## Severity Levels

| Level | Definition | Response Time |
|-------|------------|---------------|
| Low | Minor issue, limited impact | 24 hours |
| Medium | Moderate concern, some visibility | 4-8 hours |
| High | Significant risk, broad awareness | 1-2 hours |
| Critical | Major crisis, immediate threat | Immediate |

## Output Artifacts

Saved to `.aiwg/marketing/crisis/{crisis-id}/`:

- `situation-assessment.md` - Crisis analysis
- `response-plan.md` - Action plan
- `key-messages.md` - Approved messaging
- `stakeholder-comms/` - Audience-specific messages
  - `media-statement.md`
  - `social-response.md`
  - `employee-message.md`
  - `customer-message.md`
- `qa-document.md` - Q&A preparation
- `monitoring-plan.md` - Ongoing tracking
- `post-crisis-review.md` - After-action analysis

## Usage Examples

```bash
# Medium severity
/crisis-response "product-recall-jan24" --severity medium

# High severity
/crisis-response "data-breach" --severity high

# Critical
/crisis-response "executive-misconduct" --severity critical
```

## Success Criteria

- [ ] Situation fully assessed
- [ ] Severity level determined
- [ ] Key messages developed
- [ ] Stakeholder communications drafted
- [ ] Legal review complete
- [ ] Response team briefed
- [ ] Monitoring established
