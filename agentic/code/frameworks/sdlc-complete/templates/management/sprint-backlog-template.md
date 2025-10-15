# Sprint Backlog Template

## Metadata

- **ID**: `SPRINT-{project}-{number}` (e.g., SPRINT-PLATFORM-023)
- **Type**: Management Artifact
- **Owner**: Scrum Master / Team Lead
- **Contributors**: Development Team, Product Owner
- **Team**: Development Team
- **Status**: Planning | Active | In Review | Completed | Cancelled
- **Created**: YYYY-MM-DD (Sprint Planning Date)
- **Last Updated**: YYYY-MM-DD
- **Sprint Duration**: [1-4 weeks, typically 2 weeks]
- **Sprint Start**: YYYY-MM-DD
- **Sprint End**: YYYY-MM-DD
- **Related**:
  - Product Backlog: `BACKLOG-{project}`
  - Iteration Plan: `ITER-{project}-{number}`
  - Sprint Goal: Section below
  - Previous Sprint: `SPRINT-{project}-{number-1}`
  - Team Profile: `TEAM-{id}`

## Purpose

The sprint backlog is the set of product backlog items selected for this sprint, plus the plan for delivering them and achieving the sprint goal. It is a living artifact that the team updates daily as they learn more about the work.

**Key Principles**:

- **Team Commitment**: Team collectively commits to sprint goal and backlog
- **Self-Organizing**: Team decides how to accomplish the work
- **Transparent**: Visible to entire team and stakeholders
- **Dynamic**: Updated daily as work emerges and understanding deepens
- **Goal-Focused**: All work connects to sprint goal

## Sprint Goal

### Goal Statement

**Sprint Goal**: [One-sentence description of what this sprint will achieve]

**Example**: "Enable users to search and filter job listings by location, salary, and experience level with <2 second response time."

### Why This Goal Matters

**Business Value**: [What business outcome this sprint delivers]

**User Impact**: [How this sprint improves user experience or capabilities]

**Technical Foundation**: [Infrastructure or architecture enabled by this sprint]

### Success Criteria

This sprint is successful if:

- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]
- [ ] [Measurable outcome 3]

**Example**:

- [ ] 80% of committed stories are "Done" per Definition of Done
- [ ] Search feature deployed to staging with <2s response time
- [ ] Zero high-severity bugs introduced to production

## Committed Work

### Stories Committed

| Story ID | Title | Owner | Story Points | Status | Tasks | Notes |
|----------|-------|-------|--------------|--------|-------|-------|
| US-PLATFORM-042 | Advanced search filters | Alex | 5 | In Progress | 3/5 | API integration blocked |
| US-PLATFORM-043 | Salary range filtering | Jordan | 3 | Done | 4/4 | Deployed to staging |
| US-PLATFORM-044 | Location autocomplete | Casey | 3 | Not Started | 0/3 | Waiting on US-042 |
| US-PLATFORM-045 | Save search preferences | Morgan | 2 | In Progress | 1/2 | - |

**Total Story Points Committed**: 13
**Team Velocity (Last 3 Sprints)**: 12, 14, 11 (Average: 12.3)
**Commitment Confidence**: [High/Medium/Low]

### Tasks and Subtasks

#### US-PLATFORM-042: Advanced Search Filters

- [x] Design filter UI components (Alex) - 4h
- [x] Implement API endpoint for filters (Casey) - 6h
- [ ] Integrate frontend with API (Alex) - 4h - BLOCKED: API auth issue
- [ ] Write unit tests for filter logic (Jordan) - 3h
- [ ] Add integration tests (Jordan) - 2h

#### US-PLATFORM-043: Salary Range Filtering

- [x] Add salary min/max to data model (Casey) - 2h
- [x] Implement salary range query logic (Casey) - 4h
- [x] Create salary slider UI component (Morgan) - 3h
- [x] Write tests (Jordan) - 2h

#### US-PLATFORM-044: Location Autocomplete

- [ ] Research location API options (Casey) - 2h
- [ ] Implement autocomplete backend (Casey) - 4h
- [ ] Integrate autocomplete UI (Alex) - 3h

#### US-PLATFORM-045: Save Search Preferences

- [x] Design user preferences schema (Morgan) - 2h
- [ ] Implement save/load logic (Morgan) - 4h

### Technical Debt and Bugs

| Item ID | Title | Owner | Priority | Estimate | Status |
|---------|-------|-------|----------|----------|--------|
| DEBT-012 | Refactor search service for testability | Jordan | Medium | 4h | Not Started |
| BUG-156 | Search results pagination broken | Alex | High | 2h | In Progress |

### Spikes and Research

| Spike ID | Question to Answer | Owner | Timebox | Status | Outcome |
|----------|-------------------|-------|---------|--------|---------|
| SPIKE-008 | Evaluate Elasticsearch vs. PostgreSQL full-text search | Casey | 4h | Done | Recommend Postgres - simpler, meets perf needs |

## Capacity Planning

### Team Capacity

| Team Member | Role | Availability (%) | Hours/Day | Days This Sprint | Total Hours | Allocated Hours | Buffer |
|-------------|------|------------------|-----------|------------------|-------------|-----------------|--------|
| Alex | Frontend Dev | 80% | 6.4h | 10 | 64h | 58h | 6h |
| Casey | Backend Dev | 100% | 8h | 10 | 80h | 72h | 8h |
| Jordan | QA Engineer | 90% | 7.2h | 10 | 72h | 65h | 7h |
| Morgan | Fullstack Dev | 75% | 6h | 10 | 60h | 54h | 6h |

**Total Team Capacity**: 276 hours
**Total Allocated**: 249 hours
**Total Buffer**: 27 hours (10% buffer)

### Capacity Adjustments

**Planned Time Off**:

- Casey: Out Oct 20 (1 day) - already reflected in availability

**Meetings & Ceremonies**:

- Daily standups: 15 min/day × 10 days = 2.5h per person
- Sprint planning: 2h (already completed)
- Sprint review: 1h (end of sprint)
- Sprint retrospective: 1h (end of sprint)
- Backlog refinement: 2h
- Total ceremony time: 6.5h per person = 26h team total

**Support Rotation**:

- On-call support rotation: 4h per person per sprint
- Production incident buffer: 8h team total

**Net Development Capacity**: 276h - 26h (ceremonies) - 16h (support) = 234h

**Commitment vs. Capacity**: 249h allocated / 234h capacity = 106% utilization
**Risk Assessment**: Slightly over-committed, monitor daily for scope adjustment

## Daily Tracking

### Burndown Chart Data

| Date | Remaining Story Points | Remaining Hours | Notes |
|------|------------------------|-----------------|-------|
| Oct 10 (Day 1) | 13 | 120h | Sprint started |
| Oct 11 (Day 2) | 12 | 112h | US-043 progressing well |
| Oct 12 (Day 3) | 12 | 108h | Blocked on API integration |
| Oct 13 (Day 4) | 11 | 100h | Bug fix taking longer than expected |
| Oct 14 (Day 5) | 10 | 92h | US-043 completed |
| Oct 15 (Day 6) | 10 | 88h | Weekend |
| Oct 16 (Day 7) | 10 | 88h | Weekend |
| Oct 17 (Day 8) | - | - | Forecast: 8 points |
| Oct 18 (Day 9) | - | - | Forecast: 7 points |
| Oct 19 (Day 10) | - | - | Target: 0 points |

**Trend**: On track, slight risk due to API blocker on Day 3

### Impediments and Blockers

| Date Raised | Impediment | Impact | Owner | Status | Resolution |
|-------------|------------|--------|-------|--------|------------|
| Oct 12 | API authentication bug prevents filter integration | High - blocks US-042 | Casey | Resolved | Fixed auth token expiry issue |
| Oct 13 | Test environment down | Medium - delays testing | DevOps | Resolved | Restarted test cluster |
| Oct 14 | Location API vendor selection unclear | Low - may delay US-044 | Product Owner | Open | Decision needed by Oct 16 |

### Work in Progress (WIP)

**Current WIP Limit**: 4 stories maximum in "In Progress"
**Current WIP**: 2 stories
**Status**: Within limits

## Definition of Done

A story is "Done" when all criteria are met:

### Code Completion

- [ ] Code implements all acceptance criteria
- [ ] Code follows team coding standards
- [ ] Code is peer-reviewed and approved
- [ ] No critical or high-severity code review findings
- [ ] Code is merged to main/development branch

### Testing

- [ ] Unit tests written and passing (>80% coverage for new code)
- [ ] Integration tests written and passing
- [ ] Manual testing completed for UI/UX
- [ ] No high or critical severity bugs remain
- [ ] Non-functional requirements verified (performance, security)

### Documentation

- [ ] Code comments for complex logic
- [ ] API documentation updated (if applicable)
- [ ] User-facing documentation updated
- [ ] Release notes updated

### Deployment

- [ ] Code deployed to staging environment
- [ ] Product Owner has accepted the story
- [ ] Story marked as "Done" in tracking system

### Sprint-Level Done

At the end of the sprint:

- [ ] All committed stories meet Definition of Done
- [ ] Sprint goal achieved or progress clearly communicated
- [ ] Sprint review completed with stakeholder demo
- [ ] Sprint retrospective completed with action items
- [ ] Incomplete work moved back to product backlog
- [ ] Sprint metrics calculated (velocity, completion rate)

## Sprint Ceremonies

### Daily Standup (15 minutes)

**When**: Every day, same time
**Who**: Development team (mandatory), Product Owner (optional), Scrum Master (facilitator)

**Format** (each person answers):

1. What did I complete yesterday?
2. What will I work on today?
3. Any blockers or impediments?

**Output**: Updated sprint backlog, identified blockers escalated

### Sprint Review (1 hour)

**When**: Last day of sprint
**Who**: Team, Product Owner, Stakeholders

**Agenda**:

1. Sprint goal recap (5 min)
2. Demo completed stories (30 min)
3. Review incomplete work (10 min)
4. Stakeholder feedback (10 min)
5. Update product backlog based on feedback (5 min)

**Output**: Product Owner accepts or rejects stories, backlog updated

### Sprint Retrospective (1 hour)

**When**: After sprint review
**Who**: Development team, Scrum Master

**Agenda**:

1. What went well? (15 min)
2. What could be improved? (15 min)
3. What will we commit to improve next sprint? (20 min)
4. Review previous retrospective action items (10 min)

**Output**: 1-3 actionable improvements for next sprint

## Risk and Dependency Management

### Sprint Risks

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| API vendor decision delayed | Medium | High - blocks US-044 | Parallelize with alternate vendor POC | Product Owner |
| Over-committed sprint (106% capacity) | High | Medium | Monitor daily, descope US-045 if needed | Scrum Master |
| Key team member out sick | Low | High | Pair programming, knowledge sharing | All |

### Dependencies

**External Dependencies**:

- Location API vendor selection (blocks US-044) - decision by Oct 16
- Design approval for search UI (blocks US-042 integration) - approval by Oct 13

**Internal Dependencies**:

- US-044 depends on US-042 completion (API must be ready)
- DEBT-012 should complete before US-045 (refactoring enables cleaner implementation)

## Metrics and Reporting

### Sprint Metrics

- **Velocity**: Story points completed (target: 13, forecast: 11-13)
- **Commitment Accuracy**: % of committed stories completed (target: >80%)
- **Cycle Time**: Average days from "In Progress" to "Done" (target: <3 days)
- **Defect Leakage**: Bugs found in production from this sprint (target: 0 critical)
- **Team Happiness**: Self-reported on 1-5 scale (target: >3.5)

### Status Summary (End of Sprint)

**Completed Stories**: [X/Y] ([Z]%)
**Story Points Delivered**: [X/13]
**Sprint Goal Achieved**: [Yes/No/Partial]

**Key Accomplishments**:

- [Achievement 1]
- [Achievement 2]

**Challenges Faced**:

- [Challenge 1 and how addressed]
- [Challenge 2 and how addressed]

**Carryover to Next Sprint**:

- [Item 1 and reason]
- [Item 2 and reason]

## Automation Guidance

**What to Automate**:

- Burndown chart generation from task status updates
- WIP limit alerts when exceeded
- Velocity calculation from completed story points
- Cycle time tracking from status transitions
- Sprint report generation (metrics, completion rates)
- Blocker notifications to stakeholders
- Daily standup reminders and meeting notes

**What to Keep Manual**:

- Sprint goal definition
- Story commitment decisions (team consensus)
- Daily standup discussions
- Impediment resolution strategies
- Definition of Done validation (requires judgment)
- Sprint review demo and feedback
- Retrospective facilitation and action items

## Template Customization

**For Kanban Teams**:

- Remove sprint boundaries, track continuous flow
- Replace sprint goal with monthly objectives
- Focus on cycle time and throughput instead of velocity
- Track cumulative flow instead of burndown
- Remove sprint ceremonies, keep daily standup and retrospectives

**For Solo Developers**:

- Simplify to personal task list with priorities
- Skip daily standup, use daily journal
- Focus on task completion, not story points
- Weekly review replaces sprint review
- Monthly retrospective replaces sprint retrospective

**For Remote/Distributed Teams**:

- Record daily standups asynchronously (written updates)
- Use virtual whiteboard for sprint board
- Schedule sprint ceremonies across time zones
- Over-communicate blockers in chat channels
- Add "time zone coverage" to capacity planning

## Related Templates

- `/docs/sdlc/templates/management/product-backlog-template.md` - Source of sprint work
- `/docs/sdlc/templates/management/iteration-plan-template.md` - Detailed sprint planning
- `/docs/sdlc/templates/requirements/user-story-card.md` - Individual story details
- `/docs/sdlc/templates/management/team-profile-template.md` - Team capacity source
- `/docs/sdlc/templates/management/status-assessment-template.md` - Sprint progress reporting

## Agent Notes

### For Scrum Master / Team Lead

- Facilitate sprint planning to ensure realistic commitment
- Monitor daily progress against burndown and capacity
- Escalate blockers immediately, don't wait for daily standup
- Protect team from scope creep during sprint
- Ensure Definition of Done is consistently applied
- Track velocity trends to improve future planning

### For Product Owner

- Collaborate on sprint goal that delivers business value
- Clarify acceptance criteria during sprint planning
- Be available for questions during sprint (max 24h response)
- Accept or reject stories based on criteria, not perfection
- Respect sprint commitment, avoid mid-sprint changes
- Provide feedback in sprint review, update backlog accordingly

### For Software Implementer

- Break stories into tasks during sprint planning
- Update task status daily (not just at standup)
- Raise blockers immediately, don't wait
- Pair with teammates to share knowledge and reduce risk
- Write tests as you code, don't defer to end of sprint
- Validate against Definition of Done before marking "Done"

### For Test Engineer

- Review acceptance criteria during sprint planning
- Identify test scenarios and data needs early
- Test continuously, not just at end of sprint
- Report bugs immediately with clear reproduction steps
- Validate non-functional requirements (performance, security)
- Update test documentation as part of Definition of Done

## Quality Gates

**Sprint Backlog is Healthy When**:

- [ ] Sprint goal is clear, measurable, and achievable
- [ ] Committed stories total to within 10% of average velocity
- [ ] All stories meet Definition of Ready
- [ ] Team capacity accounts for ceremonies, support, and PTO
- [ ] Buffer is maintained (10-20% of capacity)
- [ ] Dependencies are identified and tracked
- [ ] Daily burndown is trending toward zero by sprint end
- [ ] WIP limits are respected
- [ ] Blockers are raised and resolved within 24 hours
- [ ] Definition of Done is applied consistently

## Version Control

**Version**: 1.0
**Last Updated**: 2025-10-15
**Owner**: Project Manager + Agile Coach
**Change History**:

- 2025-10-15: Initial template created (v1.0)
