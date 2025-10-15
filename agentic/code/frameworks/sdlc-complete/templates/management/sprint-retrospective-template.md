# Sprint Retrospective Template

## Ownership & Collaboration

- Document Owner: Project Manager / Scrum Master
- Contributor Roles: All team members (Development Team, Product Owner)
- Automation Inputs: Iteration assessment, velocity data, metrics dashboard
- Automation Outputs: `retrospective-<iteration-id>.md` with action items

## Purpose

Sprint retrospectives enable continuous improvement by creating structured reflection on team processes, identifying what went well, diagnosing what didn't, and committing to actionable improvements. This template provides a retrospective framework that works across team sizes and methodologies.

## 1 Retrospective Context

### Iteration Details

- Iteration ID: `[iteration-id]`
- Date: `[YYYY-MM-DD]`
- Facilitator: `[Name]`
- Duration: `[90 minutes for 2-week iteration]`
- Location: `[In-person/Virtual link]`

### Participants

List all team members participating:

- [x] `[Name - Role]`
- [x] `[Name - Role]`
- [ ] `[Name - Role]` (absent - reason: `[e.g., PTO]`)

### Retrospective Goals

What does the team want to learn or improve this retrospective?

- `[e.g., "Understand why velocity dropped 15% this iteration"]`
- `[e.g., "Identify process improvements for faster code review"]`
- `[e.g., "Celebrate wins and build team morale"]`

## 2 Data Review

### Iteration Metrics Summary

Reference: `[link to iteration-assessment.md]`

Key metrics to inform retrospective discussion:

- Planned velocity: `[X points/hours]`
- Actual velocity: `[Y points/hours]`
- Completion rate: `[Y/X]%`
- Carry-over work: `[Z points/hours]`
- Defects found: `[N defects]` (severity breakdown: P0=`[X]`, P1=`[Y]`, P2=`[Z]`)
- Build success rate: `[X%]`
- Average cycle time: `[Y days]` (from start to done)

### Iteration Goals Achievement

- Goal 1: `[Description]` - Status: `[Achieved/Partial/Missed]`
- Goal 2: `[Description]` - Status: `[Achieved/Partial/Missed]`
- Goal 3: `[Description]` - Status: `[Achieved/Partial/Missed]`

### Notable Events

Document significant events that impacted the iteration:

- `[e.g., "Production incident on Day 5 consumed 12 hours of team capacity"]`
- `[e.g., "New team member onboarding reduced senior developer availability"]`
- `[e.g., "API dependency delivered 2 days late"]`

## 3 What Went Well (Successes)

### Team Wins

What accomplishments should we celebrate?

1. `[Specific success]` - Impact: `[How did this help?]`
2. `[Specific success]` - Impact: `[How did this help?]`
3. `[Specific success]` - Impact: `[How did this help?]`

**Examples**:

- "Completed all P0 stories despite production incident"
- "New automated deployment pipeline reduced deployment time from 2 hours to 15 minutes"
- "Pair programming session unblocked complex algorithm design"

### Process Improvements That Worked

Which process changes from previous retrospectives proved valuable?

1. `[Process change]` - Evidence: `[Measured improvement]`
2. `[Process change]` - Evidence: `[Measured improvement]`

**Example**: "Contract testing (from last retro) caught 3 breaking API changes before integration"

### Individual Shout-Outs

Recognize individual contributions (builds team morale):

- `[Name]`: `[Specific contribution and impact]`
- `[Name]`: `[Specific contribution and impact]`

## 4 What Didn't Go Well (Pain Points)

### Issues and Challenges

What problems did we encounter?

1. `[Specific issue]` - Impact: `[How did this hurt?]`
2. `[Specific issue]` - Impact: `[How did this hurt?]`
3. `[Specific issue]` - Impact: `[How did this hurt?]`

**Examples**:

- "Code review bottleneck: 5 PRs waited >2 days for review"
- "Scope creep: 15 hours of unplanned work added mid-iteration"
- "Test environment unavailable for 2 days, blocked integration testing"

### Estimation and Planning Issues

Where did estimation or planning break down?

- Story X: Estimated `[A hours]`, actual `[B hours]` - Variance: `[±%]`
  - Root cause: `[e.g., "Underestimated database migration complexity"]`
- Story Y: Blocked for `[N days]`
  - Root cause: `[e.g., "External dependency not flagged during planning"]`

### Communication and Coordination Gaps

Where did communication fail or coordination suffer?

- `[e.g., "Duplicate work: Alice and Bob both implemented feature X without coordinating"]`
- `[e.g., "Requirements clarification delayed 3 days waiting for stakeholder response"]`

## 5 Root Cause Analysis

For top 3 pain points, identify underlying root causes.

### Issue 1: `[Description]`

**5 Whys Analysis** (or other root cause technique):

1. Why did this happen? `[Surface reason]`
2. Why did that happen? `[Deeper reason]`
3. Why did that happen? `[Deeper reason]`
4. Why did that happen? `[Deeper reason]`
5. Why did that happen? `[Root cause]`

**Contributing factors**:

- `[Factor 1: e.g., "Lack of test coverage"]`
- `[Factor 2: e.g., "No code review checklist"]`
- `[Factor 3: e.g., "Time pressure led to shortcuts"]`

### Issue 2: `[Description]`

**Root cause**: `[Analysis using same format]`

### Issue 3: `[Description]`

**Root cause**: `[Analysis using same format]`

## 6 Action Items and Improvements

Transform insights into concrete, actionable improvements.

### Committed Actions

| Action | Owner | Due Date | Success Criteria | Priority |
| --- | --- | --- | --- | --- |
| `[Specific action]` | `[Name]` | `[YYYY-MM-DD or "Next iteration"]` | `[Measurable outcome]` | `[P0/P1/P2]` |
| `[Specific action]` | `[Name]` | `[YYYY-MM-DD]` | `[Measurable outcome]` | `[P0/P1/P2]` |

**Action Item Quality Guidelines**:

- **Specific**: "Implement contract tests for User API" (not "Improve testing")
- **Measurable**: "Reduce code review time to <1 day" (not "Speed up reviews")
- **Assigned**: Single owner accountable for each action
- **Time-bound**: Completion target (next iteration, specific date, ongoing)
- **Achievable**: Within team's control and capacity

### Process Changes

Document process modifications to be adopted:

1. `[Process change]`
   - Rationale: `[Why this will help]`
   - Implementation: `[How to adopt]`
   - Review: `[When to evaluate effectiveness]`

**Examples**:

- "Daily stand-up: Add 'blockers' roundtable at end (5 min max)"
- "Code review: Reviewers must respond within 4 hours or reassign"
- "Estimation: Add 'database migration' as explicit estimation category"

### Experiments to Try

Low-risk experiments to validate improvement ideas:

1. `[Experiment]`
   - Hypothesis: `[What we expect to happen]`
   - Test: `[How we'll run the experiment]`
   - Measurement: `[How we'll know if it worked]`
   - Timeframe: `[Duration of experiment]`

**Example**:

- Experiment: "Pair programming on complex stories"
- Hypothesis: "Pairing will reduce estimation error and improve code quality"
- Test: "Pair on all stories >8 hours next iteration"
- Measurement: "Compare estimation accuracy and defect density to baseline"
- Timeframe: "Next 2 iterations"

## 7 Action Item Tracking

### Previous Retrospective Action Items

Review status of actions from last retrospective:

| Action (from `[Previous Iteration]`) | Status | Notes |
| --- | --- | --- |
| `[Previous action]` | `[Done/In Progress/Deferred/Dropped]` | `[Update]` |
| `[Previous action]` | `[Done/In Progress/Deferred/Dropped]` | `[Update]` |

**Accountability check**:

- Actions completed: `[X/Y]` (`[%]`)
- Actions in progress: `[Z]`
- Actions dropped: `[A]` (requires justification)

### Long-Running Improvements

Track ongoing improvement initiatives spanning multiple iterations:

| Initiative | Start Date | Status | Latest Progress | Next Milestone |
| --- | --- | --- | --- | --- |
| `[Initiative]` | `[YYYY-MM-DD]` | `[On Track/At Risk/Blocked]` | `[Recent update]` | `[Next target]` |

**Example**: "Increase test coverage to 80%" - Started 3 iterations ago, currently 67%, target 75% next iteration

## 8 Team Health and Morale

### Team Sentiment

Gauge team morale and well-being (optional anonymous voting):

- Team morale: `[1-5 scale, avg = X.X]`
- Workload sustainability: `[1-5 scale, avg = X.X]`
- Collaboration quality: `[1-5 scale, avg = X.X]`
- Confidence in delivering next iteration: `[1-5 scale, avg = X.X]`

**Trends**: Compare to previous iterations

### Burnout and Stress Indicators

Document any concerns requiring leadership attention:

- Overtime worked: `[X hours total, Y% of team capacity]`
- Weekend/after-hours work: `[Frequency and reasons]`
- Team member concerns: `[Anonymous or attributed feedback]`

**Action if burnout detected**: Escalate to leadership, adjust capacity planning, prioritize team sustainability

## 9 Knowledge Sharing and Learning

### Lessons Learned

What did the team learn that should be preserved?

1. `[Technical lesson]` - `[Context and implication]`
2. `[Process lesson]` - `[Context and implication]`
3. `[Domain lesson]` - `[Context and implication]`

**Examples**:

- "Database migration rollback strategy essential: Saved 4 hours when migration failed"
- "Feature flags enable safer production deployments: Rolled back breaking change in 5 minutes"

### Documentation Updates Needed

Identify documentation gaps exposed during iteration:

- `[Document to create/update]` - Owner: `[Name]`
- `[Document to create/update]` - Owner: `[Name]`

## 10 Retrospective Meta-Feedback

Evaluate the retrospective itself:

- Did we allocate enough time? `[Yes/No - adjust for next retro]`
- Was discussion balanced? `[All voices heard or dominated by few?]`
- Did we dig deep enough into root causes? `[Superficial or thorough?]`
- Are action items realistic? `[Within team capacity?]`

### Retrospective Format

Should we change the retrospective format next time?

- Current format: `[e.g., "What Went Well / What Didn't / Actions"]`
- Satisfaction: `[1-5 scale]`
- Alternative formats to try: `[e.g., "Sailboat retrospective", "4Ls", "Start-Stop-Continue"]`

## Success Criteria for Retrospectives

Retrospectives are effective when:

- Action items from previous retrospectives are completed (>70% completion rate)
- Team actively participates (all voices heard, not dominated by few)
- Root causes identified, not just symptoms
- Improvements are measurable and evidence-based
- Team morale and psychological safety maintained
- Process changes adopted and sustained over multiple iterations

## Related Templates

- Iteration Assessment: `iteration-assessment-template.md`
- Iteration Plan: `iteration-plan-template.md`
- Capacity Planning: `capacity-planning-template.md`
- Velocity Tracking: `velocity-tracking-template.md`

## Tailoring Guidance

### Small Teams (1-3 people)

- Shorten duration: 30-45 minutes sufficient
- Focus on top 3 items (what worked, what didn't, 1-2 actions)
- Combine retro with iteration review to reduce meeting overhead

### Large Teams (10+ people)

- Extend duration: 2-3 hours for deep discussion
- Use facilitation techniques (dot voting, breakout groups)
- Assign scribe to capture all input
- Consider separate retros for sub-teams + program-level retro

### Remote/Distributed Teams

- Use virtual collaboration tools (Miro, Mural, Retrium)
- Allow asynchronous input collection before live session
- Record session for absent team members
- Ensure timezone-friendly scheduling

### Short Iterations (1 week)

- Lightweight retro: 30 minutes max
- Every-other-iteration full retro (alternate weeks)
- Focus on process quick wins, defer strategic improvements to monthly retro

## Retrospective Facilitation Tips

### Creating Psychological Safety

- Start with "Vegas rule": What's said in retro stays in retro
- Focus on systems and processes, not individual blame
- Model vulnerability: Facilitator shares their own mistakes
- Celebrate failures that led to learning

### Encouraging Participation

- Round-robin format ensures all voices heard
- Silent writing before discussion (prevents groupthink)
- Anonymous input for sensitive topics
- Small group breakouts for large teams

### Driving Action

- Limit action items: 3-5 max per retrospective (focus ensures completion)
- Assign owners in the meeting (don't defer ownership)
- First 5 minutes of next retrospective: Review action item progress
- Make actions visible: Post in team space, track in iteration plan

## Agent Notes

- Parse iteration assessment metrics before generating retrospective
- Suggest root cause analysis for top velocity or quality issues
- Validate action items have owner, due date, success criteria
- Alert if >30% of previous retrospective actions incomplete (process improvement breakdown)
- Cross-reference action items with iteration plan capacity (ensure team has time for improvements)
