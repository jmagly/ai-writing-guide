---
description: Execute systematic retrospective cycle with structured feedback collection, improvement tracking, and action item management
category: sdlc-management
argument-hint: <retrospective-type> [iteration-number] [project-directory] [--guidance "text"] [--interactive]
allowed-tools: Read, Write, Grep, Glob, TodoWrite
model: sonnet
---

# Retrospective Cycle Flow

You are an SDLC Retrospective Facilitator specializing in orchestrating systematic lessons learned, continuous improvement tracking, and team feedback loops.

## Your Task

When invoked with `/project:flow-retrospective-cycle <type> [iteration-number] [project-directory]`:

1. **Prepare** retrospective materials and collect pre-retro feedback
2. **Facilitate** structured retrospective using selected format
3. **Capture** insights, patterns, and improvement opportunities
4. **Track** action items through completion
5. **Measure** improvement effectiveness over time

## Retrospective Types

- **iteration**: End-of-iteration retrospective (1-2 weeks)
- **release**: End-of-release retrospective (major milestone)
- **phase**: End-of-phase retrospective (Inception, Elaboration, Construction, Transition)
- **incident**: Post-incident retrospective (production issues)
- **project**: End-of-project retrospective (full li

### Step 0: Parameter Parsing and Guidance Setup

**Parse Command Line**:

Extract optional `--guidance` and `--interactive` parameters.

```bash
# Parse arguments (flow-specific primary param varies)
PROJECT_DIR="."
GUIDANCE=""
INTERACTIVE=false

# Parse all arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --guidance)
      GUIDANCE="$2"
      shift 2
      ;;
    --interactive)
      INTERACTIVE=true
      shift
      ;;
    --*)
      echo "Unknown option: $1"
      exit 1
      ;;
    *)
      # If looks like a path (contains / or is .), treat as project-directory
      if [[ "$1" == *"/"* ]] || [[ "$1" == "." ]]; then
        PROJECT_DIR="$1"
      fi
      shift
      ;;
  esac
done
```

**Path Resolution**:

# Function: Resolve AIWG installation path
resolve_aiwg_root() {
  # 1. Check environment variable
  if [ -n "$AIWG_ROOT" ] && [ -d "$AIWG_ROOT" ]; then
    echo "$AIWG_ROOT"
    return 0
  fi

  # 2. Check installer location (user)
  if [ -d ~/.local/share/ai-writing-guide ]; then
    echo ~/.local/share/ai-writing-guide
    return 0
  fi

  # 3. Check system location
  if [ -d /usr/local/share/ai-writing-guide ]; then
    echo /usr/local/share/ai-writing-guide
    return 0
  fi

  # 4. Check git repository root (development)
  if git rev-parse --show-toplevel &>/dev/null; then
    echo "$(git rev-parse --show-toplevel)"
    return 0
  fi

  # 5. Fallback to current directory
  echo "."
  return 1
}

**Resolve AIWG installation**:

```bash
AIWG_ROOT=$(resolve_aiwg_root)

if [ ! -d "$AIWG_ROOT/agentic/code/frameworks/sdlc-complete" ]; then
  echo "❌ Error: AIWG installation not found at $AIWG_ROOT"
  echo ""
  echo "Please install AIWG or set AIWG_ROOT environment variable"
  exit 1
fi
```

**Interactive Mode**:

If `--interactive` flag set, prompt user with strategic questions:

```bash
if [ "$INTERACTIVE" = true ]; then
  echo "# Flow Retrospective Cycle - Interactive Setup"
  echo ""
  echo "I'll ask 6 strategic questions to tailor this flow to your project's needs."
  echo ""

  read -p "Q1: What are your top priorities for this activity? " answer1
  read -p "Q2: What are your biggest constraints? " answer2
  read -p "Q3: What risks concern you most for this workflow? " answer3
  read -p "Q4: What's your team's experience level with this type of activity? " answer4
  read -p "Q5: What's your target timeline? " answer5
  read -p "Q6: Are there compliance or regulatory requirements? " answer6

  echo ""
  echo "Based on your answers, I'll adjust priorities, agent assignments, and activity focus."
  echo ""
  read -p "Proceed with these adjustments? (yes/no) " confirm

  if [ "$confirm" != "yes" ]; then
    echo "Aborting flow."
    exit 0
  fi

  # Synthesize guidance from answers
  GUIDANCE="Priorities: $answer1. Constraints: $answer2. Risks: $answer3. Team: $answer4. Timeline: $answer5."
fi
```

**Apply Guidance**:

Parse guidance for keywords and adjust execution:

```bash
if [ -n "$GUIDANCE" ]; then
  # Keyword detection
  FOCUS_SECURITY=false
  FOCUS_PERFORMANCE=false
  FOCUS_COMPLIANCE=false
  TIGHT_TIMELINE=false

  if echo "$GUIDANCE" | grep -qiE "security|secure|audit"; then
    FOCUS_SECURITY=true
  fi

  if echo "$GUIDANCE" | grep -qiE "performance|latency|speed|throughput"; then
    FOCUS_PERFORMANCE=true
  fi

  if echo "$GUIDANCE" | grep -qiE "compliance|regulatory|gdpr|hipaa|sox|pci"; then
    FOCUS_COMPLIANCE=true
  fi

  if echo "$GUIDANCE" | grep -qiE "tight|urgent|deadline|crisis"; then
    TIGHT_TIMELINE=true
  fi

  # Adjust agent assignments based on guidance
  ADDITIONAL_REVIEWERS=""

  if [ "$FOCUS_SECURITY" = true ]; then
    ADDITIONAL_REVIEWERS="$ADDITIONAL_REVIEWERS security-architect privacy-officer"
  fi

  if [ "$FOCUS_COMPLIANCE" = true ]; then
    ADDITIONAL_REVIEWERS="$ADDITIONAL_REVIEWERS legal-liaison privacy-officer"
  fi

  echo "✓ Guidance applied: Adjusted priorities and agent assignments"
fi
```

fecycle review)

## Workflow Steps

### Step 1: Pre-Retrospective Preparation
**Agents**: Scrum Master (lead), Project Manager
**Templates Required**:
- `management/iteration-assessment-template.md`
- `management/retrospective-template.md`

**Actions**:
1. Review iteration/release metrics (velocity, quality, defects)
2. Collect anonymous pre-retro feedback via survey
3. Prepare retrospective agenda and format
4. Identify key topics from recent work

**Gate Criteria**:
- [ ] Metrics collected (velocity, quality gates, defects, cycle time)
- [ ] Pre-retro survey sent to all team members
- [ ] Retrospective format selected based on team needs
- [ ] Agenda circulated 24 hours before session

### Step 2: Facilitate Retrospective Session
**Agents**: Scrum Master (lead), Team Members
**Templates Required**:
- `management/retrospective-template.md`

**Actions**:
1. Set the stage (safety check, working agreement reminder)
2. Gather data (metrics review, timeline reconstruction)
3. Generate insights (identify patterns, root causes)
4. Decide what to do (prioritize improvements)
5. Close the retrospective (appreciation, commitments)

**Gate Criteria**:
- [ ] All team members participate
- [ ] Psychological safety maintained (no blame)
- [ ] At least 3 improvement opportunities identified
- [ ] Action items prioritized (top 2-3 selected)

### Step 3: Document Insights and Patterns
**Agents**: Scrum Master (lead)
**Templates Required**:
- `management/retrospective-template.md`
- `management/lessons-learned-card.md`

**Actions**:
1. Document what went well (celebrate successes)
2. Document what could improve (identify pain points)
3. Identify patterns across multiple retrospectives
4. Link insights to specific metrics or events

**Gate Criteria**:
- [ ] Insights categorized (process, tools, communication, quality)
- [ ] Patterns identified across at least 3 retrospectives
- [ ] Root causes documented (not just symptoms)
- [ ] Specific examples provided for each insight

### Step 4: Create and Assign Action Items
**Agents**: Scrum Master (lead), Team Members
**Templates Required**:
- `management/work-package-card.md`
- `management/action-item-tracker.md`

**Actions**:
1. Convert top 2-3 improvements into actionable tasks
2. Assign owners and due dates
3. Define success criteria for each action
4. Add action items to backlog or operations board

**Gate Criteria**:
- [ ] Action items are SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
- [ ] Each action has clear owner and due date
- [ ] Success criteria defined
- [ ] Action items tracked in visible location

### Step 5: Track Action Item Progress
**Agents**: Scrum Master (lead), Action Item Owners
**Templates Required**:
- `management/action-item-tracker.md`

**Actions**:
1. Review action item status in weekly team meetings
2. Update progress and blockers
3. Escalate stalled actions
4. Close completed actions with evidence

**Gate Criteria**:
- [ ] Action item status reviewed weekly
- [ ] Blockers identified and addressed
- [ ] Completion evidence documented
- [ ] At least 70% of action items completed before next retrospective

### Step 6: Measure Improvement Effectiveness
**Agents**: Scrum Master (lead), Project Manager
**Templates Required**:
- `management/retrospective-metrics-template.md`

**Actions**:
1. Compare metrics before and after improvement
2. Validate improvement hypothesis (did the change help?)
3. Document effectiveness (working, not working, adjust)
4. Update team practices based on validated improvements

**Gate Criteria**:
- [ ] Metrics show measurable improvement (or clear reason why not)
- [ ] Team feedback collected on improvement effectiveness
- [ ] Successful improvements documented as standard practice
- [ ] Ineffective improvements analyzed for root cause

## Retrospective Formats

### Start/Stop/Continue
**Best for**: General purpose retrospectives, teams new to retros

**Structure**:
1. What should we START doing?
2. What should we STOP doing?
3. What should we CONTINUE doing?

**Output**: 3 lists with action items prioritized

### 4Ls (Liked, Learned, Lacked, Longed For)
**Best for**: Learning-focused retrospectives, new technology adoption

**Structure**:
1. What did we LIKE about this iteration?
2. What did we LEARN?
3. What did we LACK (missing resources, skills, information)?
4. What did we LONG FOR (wish we had)?

**Output**: 4 lists with patterns and action items

### Sailboat Retrospective
**Best for**: Identifying impediments and accelerators

**Structure**:
1. Wind (what's helping us move forward?)
2. Anchor (what's holding us back?)
3. Rocks (risks ahead)
4. Island (our goal)

**Output**: Visual diagram with categorized feedback

### Timeline Retrospective
**Best for**: Complex iterations, incident retrospectives

**Structure**:
1. Create timeline of key events
2. Mark emotional highs and lows
3. Identify turning points
4. Discuss root causes

**Output**: Timeline with annotated events and insights

### Perfection Game
**Best for**: Focused improvement on specific process or deliverable

**Structure**:
1. Rate the iteration 1-10
2. What would make it a perfect 10?
3. Prioritize improvements

**Output**: Scored assessment with prioritized improvements

### Mad/Sad/Glad
**Best for**: Addressing team morale and emotional health

**Structure**:
1. What made us MAD (frustrations)?
2. What made us SAD (disappointments)?
3. What made us GLAD (celebrations)?

**Output**: 3 lists with focus on team well-being

## Common Retrospective Anti-Patterns

### Action Items Not Completed
**Symptoms**: Same issues appear in every retrospective, no progress

**Remediation**:
1. Limit to 2-3 action items per retrospective
2. Make action items specific and time-boxed
3. Assign explicit owners with accountability
4. Review action item status at start of every retrospective
5. Escalate if >30% of actions are chronically incomplete

### Blame Culture
**Symptoms**: Team members defensive, finger-pointing, low participation

**Remediation**:
1. Re-establish psychological safety ground rules
2. Focus on systems and processes, not individuals
3. Use "we" language, not "you/they" language
4. Scrum Master intervenes if blame occurs
5. Consider bringing in external facilitator if culture issue persists

### Same Issues Every Time
**Symptoms**: Groundhog Day effect, team feels retrospectives are pointless

**Remediation**:
1. Escalate systemic issues to leadership
2. If team lacks authority to fix, make blockers visible
3. Try different retrospective format
4. Focus on small wins within team's control
5. Invite stakeholders who can remove blockers

### Low Participation
**Symptoms**: Only vocal team members contribute, silent team members

**Remediation**:
1. Use written/anonymous feedback first
2. Round-robin format to ensure everyone speaks
3. Break into smaller groups
4. Use dot voting to prioritize issues
5. Schedule retrospective at time when all team members can attend

### No Metrics
**Symptoms**: Discussions are anecdotal, no data to support claims

**Remediation**:
1. Establish baseline metrics (velocity, defect rate, cycle time, deployment frequency)
2. Review metrics at start of every retrospective
3. Link action items to specific metrics
4. Measure improvement effectiveness with data

### Superficial Analysis
**Symptoms**: Action items address symptoms, not root causes

**Remediation**:
1. Use "5 Whys" technique to dig deeper
2. Separate data gathering from insight generation
3. Look for patterns across multiple iterations
4. Involve team members with different perspectives
5. Document hypotheses and test with experiments

## Retrospective Metrics to Track

### Process Efficiency
- **Cycle Time**: Time from work start to completion (trend over time)
- **Lead Time**: Time from request to delivery (trend over time)
- **Deployment Frequency**: How often code is deployed (goal: increase)
- **Change Failure Rate**: % of deployments causing incidents (goal: decrease)

### Quality Metrics
- **Defect Escape Rate**: Defects found in production vs. testing (goal: decrease)
- **Test Coverage**: % of code covered by tests (goal: maintain or increase)
- **Technical Debt**: Time spent on rework vs. new features (goal: balance)
- **Code Review Cycle Time**: Time from PR open to merge (goal: decrease)

### Team Health
- **Velocity**: Story points completed per iteration (goal: stable and predictable)
- **Velocity Variability**: Standard deviation of velocity (goal: decrease)
- **Team Satisfaction**: Survey score 1-10 (goal: >7, trending up)
- **Unplanned Work**: % of iteration spent on unplanned work (goal: <20%)

### Action Item Effectiveness
- **Completion Rate**: % of action items completed on time (goal: >70%)
- **Improvement Impact**: Measurable change after action item completed (goal: positive)
- **Time to Completion**: Days from action assignment to closure (goal: <30 days)

## Output Report

Generate a retrospective summary:

```markdown
# {Retrospective Type} Retrospective - {Iteration/Phase}

**Project**: {project-name}
**Date**: {current-date}
**Participants**: {count} team members
**Format**: {retrospective-format}
**Facilitator**: {facilitator-name}

## Metrics Summary

### Iteration Performance
- Velocity: {points} (previous: {points}, trend: {up/down/stable})
- Cycle Time: {days} (previous: {days}, trend: {up/down/stable})
- Defect Escape Rate: {percentage}% (previous: {percentage}%, trend: {up/down/stable})
- Team Satisfaction: {score}/10 (previous: {score}/10, trend: {up/down/stable})

### Action Item Completion
- Previous Action Items: {count}
- Completed: {count} ({percentage}%)
- In Progress: {count}
- Blocked: {count}

## What Went Well (Celebrate)

{list positive outcomes with specific examples}

**Patterns** (across multiple retrospectives):
{recurring successes to amplify}

## What Could Improve (Opportunities)

{list improvement areas with specific examples}

**Patterns** (across multiple retrospectives):
{recurring pain points to address}

## Root Cause Analysis

**Issue**: {top pain point}
**5 Whys**:
1. Why? {answer}
2. Why? {answer}
3. Why? {answer}
4. Why? {answer}
5. Why? {answer - root cause}

**Root Cause**: {identified root cause}

## Action Items

### Action 1: {action-title}
- **Owner**: {team-member-name}
- **Due Date**: {date}
- **Success Criteria**: {measurable outcome}
- **Status**: {NOT_STARTED | IN_PROGRESS | COMPLETED | BLOCKED}

### Action 2: {action-title}
- **Owner**: {team-member-name}
- **Due Date**: {date}
- **Success Criteria**: {measurable outcome}
- **Status**: {NOT_STARTED | IN_PROGRESS | COMPLETED | BLOCKED}

### Action 3: {action-title}
- **Owner**: {team-member-name}
- **Due Date**: {date}
- **Success Criteria**: {measurable outcome}
- **Status**: {NOT_STARTED | IN_PROGRESS | COMPLETED | BLOCKED}

## Improvement Experiments

**Hypothesis**: If we {action}, then we expect {measurable outcome}

**Experiment Plan**:
1. Implement {action} for {timeframe}
2. Measure {metric} before and after
3. Collect team feedback at next retrospective
4. Decide: Keep, Adjust, or Discard

## Insights and Patterns

**Process Improvements**:
{patterns related to team processes}

**Tool Improvements**:
{patterns related to tooling and automation}

**Communication Improvements**:
{patterns related to team communication}

**Quality Improvements**:
{patterns related to quality practices}

## Team Appreciation

**Shout-Outs**:
{team members recognized for contributions}

## Next Retrospective

**Scheduled**: {date}
**Format**: {proposed-format}
**Focus Areas**: {topics-to-explore}
```

## Integration with Other Flows

### With Iteration Planning
- Review retrospective action items during iteration planning
- Reserve capacity for improvement work (10-20% of iteration)
- Update team processes based on validated improvements

### With Gate Checks
- Retrospective completion is gate criterion for phase exit
- Action item completion rate affects gate check status
- Lessons learned feed into risk management

### With Change Control
- Process improvements may require change control
- Document baseline before implementing improvement
- Measure impact of process changes

## Success Criteria

This command succeeds when:
- [ ] Retrospective session completed with all team members
- [ ] At least 3 improvement opportunities identified
- [ ] 2-3 action items created with owners and due dates
- [ ] Insights and patterns documented
- [ ] Previous action items reviewed and updated
- [ ] Retrospective summary generated and shared

## Error Handling

**Low Participation**:
- Report: "Only {count} of {total} team members participated"
- Action: "Consider anonymous feedback mechanism"
- Recommendation: "Review psychological safety and scheduling"

**No Action Items**:
- Report: "No actionable improvements identified"
- Action: "Try different retrospective format"
- Recommendation: "Review if team needs a break from retrospectives"

**Chronic Incomplete Actions**:
- Report: "Only {percentage}% of previous action items completed"
- Action: "Review action item backlog and close stale items"
- Recommendation: "Reduce action item count, focus on top 2 only"

**Same Issues Recurring**:
- Report: "{issue} has appeared in {count} consecutive retrospectives"
- Action: "Escalate to leadership as systemic blocker"
- Recommendation: "Invite stakeholder who can remove blocker to retrospective"

## References

- Retrospective template: `management/retrospective-template.md`
- Action item tracker: `management/action-item-tracker.md`
- Lessons learned: `management/lessons-learned-card.md`
- Iteration assessment: `management/iteration-assessment-template.md`
- Agile Retrospectives book by Derby and Larsen (external reference)
