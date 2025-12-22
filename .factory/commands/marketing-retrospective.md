---
name: marketing-retrospective
description: Conduct retrospective analysis of marketing initiatives for continuous improvement
model: claude-sonnet-4-5-20250929
tools: ["Read","LS","Grep","Glob","Edit","Create","Execute","Task","TodoWrite","WebSearch","FetchUrl"]
---

# Marketing Retrospective Command

Conduct retrospective analysis of marketing initiatives to capture learnings and drive improvement.

## What This Command Does

1. **Gathers Feedback**
   - Team input
   - Performance data
   - Stakeholder feedback

2. **Analyzes Results**
   - What worked well
   - What didn't work
   - Root cause analysis

3. **Documents Learnings**
   - Key insights
   - Action items
   - Best practices

## Orchestration Flow

```
Retrospective Request
        ↓
[Project Manager] → Retrospective Facilitation
        ↓
[Marketing Analyst] → Performance Analysis
        ↓
[Campaign Orchestrator] → Campaign Review
        ↓
[Production Coordinator] → Process Review
        ↓
[Reporting Specialist] → Documentation
        ↓
Retrospective Complete
```

## Agents Involved

| Agent | Role | Output |
|-------|------|--------|
| Project Manager | Facilitation | Retro structure |
| Marketing Analyst | Analysis | Performance data |
| Campaign Orchestrator | Campaign | Campaign insights |
| Production Coordinator | Process | Process insights |
| Reporting Specialist | Documentation | Final report |

## Retrospective Types

| Type | Scope | Frequency |
|------|-------|-----------|
| Campaign | Single campaign | Post-campaign |
| Quarterly | All Q activities | Quarterly |
| Annual | Full year review | Annually |
| Process | Specific workflow | As needed |

## Retrospective Framework

### Start-Stop-Continue
- **Start**: Things we should begin doing
- **Stop**: Things we should stop doing
- **Continue**: Things working well

### 5 Whys Analysis
For issues, drill down to root cause through successive "why" questions.

## Output Artifacts

Saved to `.aiwg/marketing/retrospectives/`:

- `retro-{initiative-name}.md` - Full retrospective
- `learnings.md` - Key insights
- `action-items.md` - Improvement actions
- `best-practices.md` - Documented successes
- `process-improvements.md` - Process changes

## Parameter Handling

### --guidance Parameter

**Purpose**: Provide upfront direction to tailor priorities and approach

**Examples**:
```bash
--guidance "Focus on process improvements"
--guidance "Cross-functional learnings"
--guidance "Budget efficiency analysis"
```

**How Applied**:
- Parse guidance for keywords: priority, timeline, audience, focus, constraints
- Adjust agent emphasis and output depth based on stated priorities
- Modify deliverable order based on timeline constraints
- Influence scope and detail level based on context

### --interactive Parameter

**Purpose**: Guide through discovery questions for comprehensive input

**Questions Asked** (if --interactive):
1. What campaign or period is being reviewed?
2. What were the original objectives?
3. Who should participate?
4. What went well that should be repeated?
5. What challenges were encountered?
6. What process improvements are suggested?

## Usage Examples

```bash
# Campaign retrospective
/marketing-retrospective "Spring Campaign 2024" --retro-type campaign

# Quarterly review
/marketing-retrospective "Q3 2024" --retro-type quarterly

# Process improvement
/marketing-retrospective "Creative Process" --retro-type process

# With strategic guidance
/marketing-retrospective "Example" --guidance "Your specific context here"

# Interactive mode
/marketing-retrospective "Example" --interactive
```

## Success Criteria

- [ ] Team feedback collected
- [ ] Performance data reviewed
- [ ] Wins documented
- [ ] Issues identified
- [ ] Root causes analyzed
- [ ] Action items assigned
- [ ] Learnings captured
- [ ] Best practices documented