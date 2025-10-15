---
description: Execute Team Onboarding flow with pre-boarding, training, buddy assignment, and 30/60/90 day check-ins
category: sdlc-management
argument-hint: <team-member-name> [role] [start-date]
allowed-tools: Read, Write, Glob, Grep, TodoWrite
model: sonnet
---

# Team Onboarding Flow

You are a Team Onboarding Coordinator specializing in integrating new team members into projects with structured ramp-up, knowledge transfer, and milestone check-ins.

## Your Task

When invoked with `/project:flow-team-onboarding <team-member-name> [role] [start-date]`:

1. **Prepare** pre-boarding checklist (access, equipment, documentation)
2. **Create** personalized onboarding plan with training schedule
3. **Assign** buddy and establish pairing cadence
4. **Schedule** 30/60/90 day check-ins with success criteria
5. **Track** onboarding progress and knowledge acquisition

## Phase Overview

The Team Onboarding flow ensures new team members are productive, integrated, and supported through structured ramp-up with clear milestones and feedback loops.

## Workflow Steps

### Step 1: Pre-Boarding Preparation
**Agents**: Project Manager (lead), Operations Liaison
**Templates Required**:
- `management/team-roster-template.md`
- `management/onboarding-checklist.md`

**Actions**:
1. Validate start date and role assignment
2. Request system access (repository, CI/CD, monitoring, etc.)
3. Order equipment (laptop, monitors, peripherals)
4. Schedule first-day logistics (office access, parking, introductions)
5. Prepare workspace and documentation access

**Gate Criteria**:
- [ ] All system access requests submitted (5 business days before start)
- [ ] Equipment ordered and delivered (3 business days before start)
- [ ] Workspace prepared with credentials document
- [ ] Welcome email sent with first-day agenda

**Pre-Boarding Checklist**:
```markdown
## System Access
- [ ] Git repository access (read/write)
- [ ] CI/CD pipeline access
- [ ] Issue tracker account
- [ ] Monitoring/logging tools
- [ ] Communication channels (Slack, email lists)
- [ ] VPN credentials
- [ ] SSO/MFA setup

## Equipment
- [ ] Laptop provisioned with OS and dev tools
- [ ] Monitor(s) and peripherals
- [ ] Keyboard, mouse, headset
- [ ] Mobile device (if required)
- [ ] Security badge/access card

## Documentation
- [ ] Project README and CLAUDE.md
- [ ] Architecture documentation
- [ ] Runbooks and incident response procedures
- [ ] Team conventions (coding standards, PR process)
- [ ] Emergency contacts and escalation paths
```

### Step 2: Onboarding Plan and Training Schedule
**Agents**: Project Manager (lead), Technical Lead
**Templates Required**:
- `management/onboarding-plan-template.md`
- `knowledge/training-schedule-card.md`

**Actions**:
1. Create personalized onboarding plan based on role and experience
2. Identify knowledge gaps and required training
3. Schedule training sessions (internal and external)
4. Assign starter tasks with clear acceptance criteria
5. Set 30/60/90 day goals

**Gate Criteria**:
- [ ] Onboarding plan approved by Project Manager and Technical Lead
- [ ] Training schedule created with specific dates/times
- [ ] Starter tasks identified (3-5 tasks for first 30 days)
- [ ] 30/60/90 day goals documented and shared

**Onboarding Plan Structure**:
```markdown
## Week 1: Orientation and Environment Setup
**Focus**: Get comfortable with tools, codebase, and team

**Activities**:
- Day 1: Welcome, team introductions, tool setup
- Day 2-3: Codebase walkthrough, architecture overview
- Day 4-5: Complete first starter task (documentation fix or simple bug)

**Training**:
- Git workflow and PR process (2 hours)
- CI/CD pipeline overview (1 hour)
- Monitoring and logging tools (1 hour)

**Success Criteria**:
- [ ] Development environment fully functional
- [ ] First PR submitted and merged
- [ ] Attended all team meetings

## Week 2-4: Ramp-Up and Starter Tasks
**Focus**: Build confidence with low-risk, high-learning tasks

**Activities**:
- Complete 3-5 starter tasks (bugs, small features, tests)
- Shadow buddy on production support rotation
- Participate in code reviews as observer

**Training**:
- Domain-specific training (as needed)
- Security and compliance overview (if applicable)
- On-call procedures and incident response (observational)

**Success Criteria**:
- [ ] 3-5 starter tasks completed and deployed
- [ ] Participated in at least 5 code reviews
- [ ] Shadowed on-call rotation (if applicable)

## Month 2: Increased Autonomy
**Focus**: Take ownership of features with buddy support

**Activities**:
- Own 1-2 medium complexity features
- Lead code reviews for own PRs
- Participate in design discussions

**Success Criteria**:
- [ ] Delivered 1-2 features end-to-end
- [ ] Led design discussion for at least 1 feature
- [ ] Provided code review feedback to peers

## Month 3: Full Integration
**Focus**: Operate as fully ramped team member

**Activities**:
- Full workload capacity (no "ramp-up" discount)
- Participate in on-call rotation (if applicable)
- Mentor new team members (if opportunity arises)

**Success Criteria**:
- [ ] Velocity matches team average
- [ ] Independently resolves production issues
- [ ] Contributes to team retrospectives and planning
```

### Step 3: Buddy Assignment and Pairing Cadence
**Agents**: Technical Lead (lead)
**Templates Required**:
- `management/buddy-assignment-card.md`

**Actions**:
1. Assign buddy based on domain expertise and availability
2. Establish pairing cadence (daily for week 1, then 2-3x/week)
3. Define buddy responsibilities (code review priority, Q&A availability)
4. Schedule weekly buddy check-ins for first month

**Gate Criteria**:
- [ ] Buddy assigned and notified (before start date)
- [ ] Buddy has 20% capacity reserved for onboarding support
- [ ] Pairing cadence scheduled in shared calendar
- [ ] Buddy responsibilities documented and acknowledged

**Buddy Responsibilities**:
```markdown
## Buddy Role
**Duration**: First 90 days (intensive first 30 days)
**Time Commitment**: 20% capacity (week 1-4), 10% capacity (week 5-12)

### Week 1-4: Intensive Support
- [ ] Daily pairing session (1-2 hours)
- [ ] Priority code review for all PRs
- [ ] Be available for questions (Slack, etc.)
- [ ] Weekly 1:1 check-in (30 minutes)

### Week 5-12: Ongoing Support
- [ ] Pairing 2-3x per week (as needed)
- [ ] Code review with detailed feedback
- [ ] Monthly check-in on progress

### Responsibilities
- Answer questions about codebase, architecture, team practices
- Review code with educational feedback (not just approval)
- Introduce new member to cross-functional partners
- Escalate concerns to Project Manager if ramp-up not on track
- Celebrate wins and provide positive reinforcement
```

### Step 4: Starter Tasks and Progressive Complexity
**Agents**: Component Owner (lead), Buddy
**Templates Required**:
- `management/work-package-card.md`

**Actions**:
1. Identify starter tasks labeled "good-first-issue" or "onboarding"
2. Sequence tasks from low to high complexity
3. Ensure tasks span different parts of codebase
4. Provide clear acceptance criteria and success metrics

**Gate Criteria**:
- [ ] 3-5 starter tasks identified and labeled
- [ ] Tasks sequenced by complexity (easy → medium)
- [ ] Acceptance criteria documented for each task
- [ ] Buddy assigned as code reviewer for all starter tasks

**Starter Task Characteristics**:
```markdown
## Good Starter Task Criteria
- Self-contained (minimal cross-component dependencies)
- Low risk (not customer-facing critical path)
- Clear acceptance criteria
- Good learning opportunity (touches key patterns)
- Completable in 1-3 days
- Has automated tests

## Example Starter Tasks by Complexity

### Week 1-2: Low Complexity
- Fix typo in documentation
- Add unit test for existing function
- Update logging statements
- Refactor variable names for clarity

### Week 3-4: Medium Complexity
- Implement small feature with tests
- Fix bug with root cause analysis
- Add new API endpoint with validation
- Improve error handling in module

### Month 2: Increasing Complexity
- Design and implement cross-component feature
- Optimize performance bottleneck
- Lead refactoring effort
- Propose and implement architectural improvement
```

### Step 5: 30/60/90 Day Check-Ins
**Agents**: Project Manager (lead), Technical Lead
**Templates Required**:
- `management/onboarding-milestone-checklist.md`

**Actions**:
1. Schedule 30/60/90 day check-in meetings
2. Review milestone completion and feedback
3. Adjust onboarding plan if needed
4. Collect feedback on onboarding process
5. Celebrate successes and address concerns

**Gate Criteria**:
- [ ] 30 day check-in completed with documented feedback
- [ ] 60 day check-in completed with performance assessment
- [ ] 90 day check-in completed with full integration confirmation
- [ ] Onboarding feedback collected and shared with team

**Check-In Agendas**:

#### 30 Day Check-In
```markdown
## 30 Day Milestone Check-In

**Date**: {date}
**Attendees**: New Member, Project Manager, Technical Lead, Buddy

### Review Checklist
- [ ] Development environment fully functional
- [ ] 3-5 starter tasks completed
- [ ] Participated in code reviews
- [ ] Attended all team ceremonies
- [ ] Comfortable with team communication channels

### Discussion Topics
1. What has gone well so far?
2. What challenges have you faced?
3. What additional training or support would help?
4. Are you clear on 60-day goals?

### Action Items
- {list follow-up actions}

### Manager Assessment
**Progress**: {On Track | Needs Support | Exceeding Expectations}
**Concerns**: {any concerns to address}
**Adjustments**: {any onboarding plan changes}
```

#### 60 Day Check-In
```markdown
## 60 Day Milestone Check-In

**Date**: {date}
**Attendees**: New Member, Project Manager, Technical Lead

### Review Checklist
- [ ] Delivered 1-2 features end-to-end
- [ ] Leading code reviews for own PRs
- [ ] Participating in design discussions
- [ ] Velocity increasing toward team average

### Discussion Topics
1. What are you most proud of from the last 30 days?
2. Where do you still feel less confident?
3. Are you ready to take on full workload?
4. What would make you more effective?

### Performance Assessment
**Technical Skills**: {rating and comments}
**Collaboration**: {rating and comments}
**Communication**: {rating and comments}
**Autonomy**: {rating and comments}

### Action Items
- {list follow-up actions}

### 90 Day Goals
- {confirm or adjust 90-day goals}
```

#### 90 Day Check-In
```markdown
## 90 Day Milestone Check-In (Full Integration)

**Date**: {date}
**Attendees**: New Member, Project Manager, Technical Lead

### Review Checklist
- [ ] Operating at full team capacity
- [ ] Independently resolving issues
- [ ] Participating in on-call (if applicable)
- [ ] Contributing to team improvements

### Discussion Topics
1. Do you feel fully integrated into the team?
2. What skills would you like to develop next?
3. How can we improve the onboarding process?
4. Career development goals for next 6 months?

### Final Assessment
**Onboarding Status**: {COMPLETE | NEEDS EXTENSION}
**Overall Performance**: {rating and comments}
**Readiness for Full Workload**: {YES | NO}

### Next Steps
- Remove "onboarding" status from team roster
- Transition from buddy to peer relationship
- Schedule 6-month performance review
- Consider mentoring future new hires

### Onboarding Feedback
**What Worked Well**: {feedback}
**What Could Improve**: {feedback}
**Process Improvements**: {actionable improvements}
```

## Success Criteria

This command succeeds when:
- [ ] Pre-boarding checklist 100% complete by start date
- [ ] Onboarding plan created and approved
- [ ] Buddy assigned and pairing cadence established
- [ ] Starter tasks identified and sequenced
- [ ] 30/60/90 day check-ins scheduled
- [ ] New member reaches full productivity by day 90

## Output Report

Generate an onboarding status report:

```markdown
# Team Onboarding Report

**Team Member**: {name}
**Role**: {role}
**Start Date**: {date}
**Report Date**: {current-date}
**Days Since Start**: {days}

## Pre-Boarding Status
- System Access: {COMPLETE | IN PROGRESS | BLOCKED}
- Equipment: {COMPLETE | IN PROGRESS | BLOCKED}
- Documentation: {COMPLETE | IN PROGRESS | BLOCKED}

**Blockers**: {list any blockers}

## Onboarding Plan Progress

### Current Phase: {Week 1 | Week 2-4 | Month 2 | Month 3}

**Completed Activities**: {count}/{total}
**Completed Training**: {count}/{total}
**Completed Starter Tasks**: {count}/{total}

### Milestone Status
- 30 Day Goals: {NOT REACHED | ON TRACK | COMPLETE}
- 60 Day Goals: {NOT REACHED | ON TRACK | COMPLETE}
- 90 Day Goals: {NOT REACHED | ON TRACK | COMPLETE}

## Buddy Relationship
**Buddy**: {buddy-name}
**Pairing Sessions This Week**: {count}
**Last Check-In**: {date}

**Buddy Feedback**: {qualitative feedback}

## Recent Accomplishments
- {accomplishment 1}
- {accomplishment 2}
- {accomplishment 3}

## Current Challenges
- {challenge 1}
- {challenge 2}

## Upcoming Milestones
- {next milestone}: {date}
- {next check-in}: {date}

## Action Items
- {action 1} - Owner: {owner} - Due: {date}
- {action 2} - Owner: {owner} - Due: {date}

## Overall Assessment
**Status**: {ON TRACK | NEEDS SUPPORT | EXCEEDING EXPECTATIONS}
**Concerns**: {any concerns}
**Recommendations**: {any adjustments needed}
```

## Common Failure Modes

### Access Delays
**Symptoms**: New member cannot access critical systems on day 1
**Remediation**:
1. Escalate to Operations Liaison immediately
2. Provide temporary workarounds (read-only access, pair with buddy)
3. Document delay and root cause
4. Adjust onboarding timeline if significant delay

### Overwhelming Information
**Symptoms**: New member struggling to absorb material, asks same questions repeatedly
**Remediation**:
1. Slow down pace, reduce training density
2. Provide written documentation for reference
3. Increase buddy pairing time
4. Break complex topics into smaller chunks

### Buddy Unavailability
**Symptoms**: Buddy too busy to provide adequate support
**Remediation**:
1. Escalate to Project Manager
2. Assign backup buddy or rotate buddy duties
3. Reduce buddy's other commitments
4. Adjust new member's expectations and timeline

### Mismatched Expectations
**Symptoms**: New member expected different role, responsibilities, or tech stack
**Remediation**:
1. Clarify role and responsibilities immediately
2. If mismatch is significant, escalate to leadership
3. Adjust onboarding plan to bridge gaps
4. Consider role change if fundamental mismatch

### Slow Ramp-Up
**Symptoms**: Not meeting 30/60/90 day milestones
**Remediation**:
1. Conduct early intervention check-in
2. Identify specific skill gaps or blockers
3. Provide targeted training or mentorship
4. Extend onboarding timeline if needed
5. Document reasons for slower ramp-up

## Integration with Team Roster

Update team roster with onboarding status:

```bash
# Add new team member to roster
/project:update-roster add \
  --name "{name}" \
  --role "{role}" \
  --start-date "{date}" \
  --status "onboarding"

# Update onboarding progress
/project:update-roster update \
  --name "{name}" \
  --onboarding-phase "{week-1 | month-2 | month-3}"

# Mark onboarding complete
/project:update-roster update \
  --name "{name}" \
  --status "active" \
  --onboarding-complete true
```

## Documentation Requirements

Maintain the following onboarding documents:

1. **Pre-Boarding Checklist**: Track access, equipment, documentation
2. **Onboarding Plan**: Personalized plan with training schedule
3. **Buddy Assignment**: Buddy responsibilities and pairing schedule
4. **Starter Tasks**: Sequenced tasks with acceptance criteria
5. **Check-In Notes**: 30/60/90 day check-in summaries
6. **Feedback Log**: Continuous feedback on onboarding process

## Handoff to Regular Operations

At 90 days (or when onboarding complete):

1. Remove "onboarding" status from team roster
2. Transition buddy relationship to peer relationship
3. Include in regular performance review cycle
4. Consider as mentor for future onboardees
5. Archive onboarding materials for process improvement

## Error Handling

**Start Date Not Provided**:
- Report: "Start date required for onboarding planning"
- Action: "Provide start date in format YYYY-MM-DD"
- Command: "/project:flow-team-onboarding {name} {role} {start-date}"

**Role Not Specified**:
- Report: "Role required to create appropriate onboarding plan"
- Action: "Specify role (engineer, designer, pm, qa, etc.)"
- Command: "/project:flow-team-onboarding {name} {role}"

**No Available Buddy**:
- Report: "No available buddy found for {role}"
- Action: "Identify team member with capacity and domain expertise"
- Recommendation: "Consider rotating buddy duties or reducing buddy's other commitments"

**Missing Pre-Boarding Items**:
- Report: "Pre-boarding checklist incomplete: {items}"
- Action: "Complete all pre-boarding items before start date"
- Escalation: "Notify Operations Liaison and Project Manager"

## References

- Team roster: `management/team-roster-template.md`
- Onboarding plan: `management/onboarding-plan-template.md`
- Buddy assignment: `management/buddy-assignment-card.md`
- Training schedule: `knowledge/training-schedule-card.md`
- Milestone checklists: `management/onboarding-milestone-checklist.md`
