# Informal Iteration Plan Template

## Ownership & Collaboration

- Document Owner: Project Manager
- Contributor Roles: System Analyst, Implementer, Test Architect
- Automation Inputs: Iteration goals, milestone dates, team capacity, historical velocity
- Automation Outputs: `iteration-<id>-plan-informal.md` with milestone table and capacity allocation

## Purpose

The informal iteration plan provides a lightweight planning approach for small teams, short iterations, or projects with low formality requirements. It focuses on essential planning elements: objectives, milestones, capacity, and sprint goals. Use this template when speed and agility are prioritized over comprehensive documentation.

## When to Use This Template

**Use informal iteration plan when**:

- Team size: 1-5 people
- Iteration duration: 1-2 weeks
- Project complexity: Low to moderate
- Governance requirements: Minimal
- Team maturity: Experienced, self-organizing

**Use formal iteration plan when**:

- Team size: 6+ people
- Iteration duration: 3+ weeks
- Project complexity: High (multiple dependencies, integrations)
- Governance requirements: Formal reviews, approvals
- Compliance: Regulatory, audit, or contractual documentation needed

Reference: Formal template at `iteration-plan-template.md`

## 1 Sprint Goal

**Sprint Goal**: `[One-sentence description of what this iteration achieves]`

**Why this matters**: The sprint goal provides focus and alignment. All iteration work should contribute to achieving this goal.

**Examples**:

- "Deliver working user authentication with social login integration"
- "Complete checkout flow with payment processing capability"
- "Achieve 80% test coverage on core business logic"

**Acceptance**: Sprint goal is met when: `[Specific, testable criteria]`

## 2 Key Milestones

| Milestone | Date | Status |
| --- | --- | --- |
| Iteration Start | `dd/mmm/yy` | |
| Iteration Planning Complete | `dd/mmm/yy` | |
| `[Mid-Iteration Checkpoint]` | `dd/mmm/yy` | |
| `[Feature Demo]` | `dd/mmm/yy` | |
| `[Testing Complete]` | `dd/mmm/yy` | |
| Sprint Review | `dd/mmm/yy` | |
| Sprint Retrospective | `dd/mmm/yy` | |
| Iteration Stop | `dd/mmm/yy` | |

**Status tracking**: Update status column with `[Not Started/In Progress/Complete/At Risk]`

## 3 Team Capacity

### Available Capacity

Reference: `[link to capacity-planning-template.md]` for detailed methodology

| Team Member | Role | Available Hours | Allocated Hours | Remaining |
| --- | --- | --- | --- | --- |
| `[Name]` | `[Role]` | `[X hours]` | `[Y hours]` | `[X-Y hours]` |
| `[Name]` | `[Role]` | `[X hours]` | `[Y hours]` | `[X-Y hours]` |
| **Total** | | **[X hours]** | **[Y hours]** | **[X-Y hours]** |

**Capacity Notes**:

- Available hours = Calendar hours × Availability factor (typically 60-70%)
- Buffer: `[X hours]` reserved for unexpected work (15-20% recommended)
- Known time-off: `[List any PTO, holidays, training]`
- Support/on-call: `[Hours allocated to support rotation]`

### Capacity Validation

- [ ] Total allocated hours ≤ available capacity
- [ ] No individual over-allocated
- [ ] Buffer maintained (15-20%)

## 4 Historical Velocity

**Purpose**: Ground planning in past performance to avoid overcommitment

Reference: `[link to velocity-tracking-template.md]`

- Average velocity (last 3 iterations): `[X points/hours]`
- Trend: `[Stable/Improving/Declining]`
- Planned velocity this iteration: `[Y points/hours]`
- Risk assessment: `[Low/Medium/High]` based on `[rationale]`

**Planning guardrail**: Planned work should not exceed average velocity by >10% unless justified

## 5 Iteration Objectives

> List objectives, tasks, or artifacts targeted in this iteration with owners, acceptance criteria, and effort estimates.

| Objective / Task | Assigned To | Acceptance Criteria | Estimated Effort | Status |
| --- | --- | --- | --- | --- |
| `[Implement Use Case: <Name>]` | `[Owner]` | `[Specific testable criteria]` | `[X hours/points]` | `[Not Started]` |
| `[Complete <Artifact>]` | `[Owner]` | `[Specific completion criteria]` | `[X hours/points]` | `[Not Started]` |
| `[Implement feature: <Name>]` | `[Owner]` | `[Acceptance criteria]` | `[X hours/points]` | `[Not Started]` |
| `[Execute regression suite]` | `[Owner]` | `[All tests passing]` | `[X hours/points]` | `[Not Started]` |
| `[Prepare next-iteration plan]` | `[Owner]` | `[Plan reviewed and approved]` | `[X hours/points]` | `[Not Started]` |

**Total estimated effort**: `[Sum of effort column]`

**Validation**: Total effort should align with planned velocity and available capacity

## 6 Definition of Done

**This iteration uses the project's standard Definition of Done** (reference: `[link to definition-of-done-checklist.md]`)

### Story-Level DoD Summary

Work is "done" when:

- [ ] Code complete and reviewed
- [ ] Tests written and passing (unit, integration, acceptance)
- [ ] Documentation updated
- [ ] Deployed to staging environment
- [ ] Product Owner acceptance

### Iteration-Specific Criteria

Additional DoD criteria for this iteration:

- `[e.g., "Performance testing complete for checkout flow"]`
- `[e.g., "Security review completed for authentication module"]`

## 7 Dependencies and Risks

### External Dependencies

| Dependency | Owner/Source | Required By | Status | Mitigation |
| --- | --- | --- | --- | --- |
| `[API endpoint from Team B]` | `[Team B/Alice]` | `[dd/mmm/yy]` | `[On Track/At Risk]` | `[Mitigation plan]` |
| `[Design assets]` | `[Design team/Bob]` | `[dd/mmm/yy]` | `[On Track/At Risk]` | `[Mitigation plan]` |

### Top Risks

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| `[e.g., "API not delivered on time"]` | `[High]` | `[Medium]` | `[Mock API for parallel dev]` |
| `[e.g., "Database migration complexity"]` | `[Medium]` | `[High]` | `[Spike investigation in first 2 days]` |

## 8 WIP Limits and Focus

**Work-in-Progress (WIP) Limits**: To maintain focus and flow

- Maximum WIP per person: `[2-3 tasks]`
- Team WIP limit: `[5-8 tasks total]`

**Purpose**: Prevent multitasking, encourage task completion before starting new work

**Enforcement**: In daily stand-up, check if WIP limits exceeded. If so, swarm to complete tasks before starting new ones.

## 9 Iteration Ceremonies Schedule

| Ceremony | Day/Time | Duration | Participants | Purpose |
| --- | --- | --- | --- | --- |
| Sprint Planning | `[Monday 9am]` | `[2-4 hours]` | `[Full team]` | `[Plan iteration]` |
| Daily Stand-Up | `[Daily 9:30am]` | `[15 min]` | `[Dev team]` | `[Sync progress, blockers]` |
| Backlog Refinement | `[Wednesday 2pm]` | `[1 hour]` | `[PO + 2 devs]` | `[Prepare future backlog]` |
| Sprint Review | `[Friday 2pm]` | `[1 hour]` | `[Team + stakeholders]` | `[Demo completed work]` |
| Sprint Retrospective | `[Friday 3:30pm]` | `[1 hour]` | `[Full team]` | `[Process improvement]` |

Reference: `[link to iteration-ceremonies-guide.md]` for ceremony facilitation guidance

## 10 Backlog Snapshot

**Iteration Backlog**: Work committed for this iteration

Reference: `[link to sprint-backlog-template.md]`

- Total stories committed: `[N]`
- Total points/hours: `[X]`
- Backlog link: `[link to backlog file or tool]`

**Product Backlog Status**: Upcoming work

- Stories ready for next iteration: `[N]`
- Stories in refinement: `[N]`

## 11 Success Metrics

How we'll measure iteration success:

- **Delivery**: `[X%]` of committed scope completed (target: >90%)
- **Quality**: `[Y%]` test coverage, `[Z]` critical defects (target: 80% coverage, 0 critical defects)
- **Velocity**: Actual velocity = `[Target range based on historical average]`
- **Sprint goal**: `[Achieved/Not Achieved]`

**Retrospective focus**: If targets not met, investigate root causes in retrospective

## 12 Notes and Context

### Iteration Context

Highlight unique aspects of this iteration:

- `[e.g., "First iteration with new team member - expect ramp-up time"]`
- `[e.g., "Holiday week - reduced capacity by 20%"]`
- `[e.g., "Focus on technical debt reduction this iteration"]`

### Open Questions

Unresolved questions that may impact iteration:

- `[Question 1 - Owner: <Name> - Due: dd/mmm/yy]`
- `[Question 2 - Owner: <Name> - Due: dd/mmm/yy]`

### Carry-Over from Previous Iteration

Work carried over from last iteration:

- `[Task ID - Description - Remaining effort: X hours]`
- `[Task ID - Description - Remaining effort: X hours]`

**Total carry-over**: `[X hours/points]`

**Impact on capacity**: Carry-over reduces capacity for new work

## Related Templates

- Formal Iteration Plan: `iteration-plan-template.md`
- Capacity Planning: `capacity-planning-template.md`
- Velocity Tracking: `velocity-tracking-template.md`
- Sprint Retrospective: `sprint-retrospective-template.md`
- Definition of Done: `definition-of-done-checklist.md`
- Sprint Backlog: `sprint-backlog-template.md`

## Agent Notes

- Verify sprint goal is specific and testable before finalizing plan
- Check capacity: Total estimated effort should not exceed available capacity
- Cross-reference velocity: Planned scope should align with historical average (±10%)
- Validate DoD: Ensure all objectives have clear acceptance criteria
- Parse milestone dates for deterministic tracking
- Alert if WIP limits not defined (risk of multitasking overhead)
- Ensure ceremonies scheduled (coordination structure essential)
- Document dependencies: Link to external dependency owners for follow-up
- Verify Automation Outputs satisfied before completion
