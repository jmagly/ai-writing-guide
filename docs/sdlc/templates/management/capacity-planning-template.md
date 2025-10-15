# Capacity Planning Template

## Ownership & Collaboration

- Document Owner: Project Manager
- Contributor Roles: Team Lead, Resource Manager
- Automation Inputs: Team profile, iteration duration, historical velocity
- Automation Outputs: `capacity-plan-<iteration-id>.md` with allocation tables

## Purpose

Capacity planning prevents overcommitment by calculating realistic team availability and aligning iteration scope with actual productive capacity. This template defines a planning approach that accounts for calendar hours, availability factors, and buffer for unexpected work.

## 1 Iteration Context

### Iteration Details

- Iteration ID: `[iteration-id]`
- Duration: `[X weeks]`
- Calendar Start: `[YYYY-MM-DD]`
- Calendar End: `[YYYY-MM-DD]`
- Working Days: `[N days]` (excluding holidays/weekends)

### Team Composition

Reference: `[link to team-profile.md]`

Total team members: `[N]`
Team roles: `[list primary roles]`

## 2 Capacity Calculation Methodology

### Calendar Hours to Productive Hours

**Formula**: Productive Hours = Calendar Hours × Availability Factor × Project Allocation

**Availability Factor**: Percentage of time actually spent on productive work

- Industry baseline: 60-70% (accounts for meetings, email, context switching, administrative overhead)
- Team-specific factor: `[X%]` (adjust based on historical data)

**Project Allocation**: Percentage of team member's time dedicated to this project

- Full-time: 100%
- Shared resources: 50-80% (document other commitments)

### Capacity Adjustments

Account for planned and unplanned time away:

- Planned time off (PTO, holidays, training)
- Support rotation and on-call duties
- Planned meetings (reviews, planning, retrospectives)
- Carry-over work from previous iteration
- Known external commitments

## 3 Team Capacity Table

| Team Member | Role | Calendar Hours | Availability (%) | Adjusted Hours | Allocated Hours | Remaining |
| --- | --- | --- | --- | --- | --- | --- |
| `[Name]` | `[Role]` | `[X]` | `[Y%]` | `[Z]` | `[A]` | `[Z-A]` |
| **Totals** | | **[X]** | **[Avg%]** | **[Z]** | **[A]** | **[Z-A]** |

### Calculation Examples

**Example 1: Full-time developer**

- Calendar hours: 80 (2 weeks × 40 hours/week)
- PTO: 16 hours (2 days)
- Effective calendar: 64 hours
- Availability factor: 65%
- Productive capacity: 64 × 0.65 = 41.6 hours

**Example 2: Shared resource**

- Calendar hours: 80
- Project allocation: 50% (shared across 2 projects)
- Effective calendar: 40 hours
- Availability factor: 70%
- Productive capacity: 40 × 0.70 = 28 hours

## 4 Capacity Assumptions and Buffers

### Documented Assumptions

Document the assumptions underlying capacity calculations:

- Availability factor rationale: `[e.g., "Based on last 3 iterations averaging 68% productive time"]`
- Meeting overhead: `[e.g., "15 hours/week for planning, stand-ups, reviews"]`
- Support rotation impact: `[e.g., "Alice on-call this iteration, reduced capacity by 10 hours"]`
- Carry-over work: `[e.g., "12 hours of incomplete work from Iteration N-1"]`

### Capacity Buffer

Reserve buffer for unexpected work:

- Recommended buffer: 15-20% of total capacity
- Buffer allocation: `[X hours]` reserved for:
  - Production incidents
  - Scope clarifications
  - Estimation errors
  - Technical challenges
  - Stakeholder requests

**Formula**: Available Work Capacity = Productive Capacity - Buffer

## 5 Capacity Allocation by Work Type

Distribute capacity across work categories to ensure balanced iteration:

| Work Category | Allocated Hours | Percentage of Total | Rationale |
| --- | --- | --- | --- |
| Planned features | `[X]` | `[Y%]` | `[Primary iteration goal]` |
| Technical debt | `[X]` | `[Y%]` | `[Quality investment]` |
| Bug fixes | `[X]` | `[Y%]` | `[Defect remediation]` |
| Support/maintenance | `[X]` | `[Y%]` | `[Operational stability]` |
| Buffer | `[X]` | `[Y%]` | `[Unexpected work]` |
| **Total** | **[Z]** | **100%** | |

## 6 Capacity Validation Checklist

Before finalizing iteration plan, verify:

- [ ] Total allocated hours ≤ adjusted productive capacity
- [ ] No individual team member over-allocated (allocated hours ≤ individual capacity)
- [ ] Buffer maintained (15-20% unallocated capacity)
- [ ] All known time-off and external commitments accounted for
- [ ] Capacity allocation aligns with iteration priorities
- [ ] Historical velocity data consulted (if available)
- [ ] Team consulted on capacity estimates (bottom-up validation)

## 7 Capacity Tracking and Adjustment

### In-Iteration Monitoring

Track actual capacity consumption to enable mid-iteration adjustments:

- Daily/weekly capacity burn: Compare planned vs actual hours consumed
- Emerging blockers: Document new capacity constraints discovered during iteration
- Scope changes: Adjust capacity allocation if iteration scope changes

### Capacity Adjustment Triggers

Re-evaluate capacity if:

- Team member becomes unavailable (illness, emergency)
- Unplanned production incidents consume buffer
- Estimation errors reveal significant under/over-allocation
- Scope change requests exceed buffer capacity

**Response strategy**:

1. Assess remaining capacity
2. De-scope lower-priority work if necessary
3. Defer non-critical tasks to next iteration
4. Document capacity variance in iteration assessment

## 8 Velocity Integration

### Historical Velocity Reference

Use past iteration velocity to validate capacity planning:

- Average velocity (last 3 iterations): `[X points/hours]`
- Velocity trend: `[Stable/Improving/Declining]`
- Planned velocity for this iteration: `[Y points/hours]`

Reference: `[link to velocity-tracker.md]`

### Velocity-Capacity Alignment

**Expected outcome**: Allocated work should align with historical velocity

- If planned work > historical velocity: High risk of overcommitment
- If planned work < historical velocity: Under-utilization or velocity improvement
- Acceptable variance: ±10% from historical average

### Velocity Prediction

Based on capacity calculation, predict iteration velocity:

- Total productive capacity: `[Z hours]`
- Expected velocity: `[Z × velocity-per-hour] points`
- Confidence level: `[High/Medium/Low]` based on:
  - Team stability (same team composition as previous iterations)
  - Work type similarity (comparable to historical work)
  - External dependencies (minimal vs significant)

## 9 Multi-Team Capacity Considerations

For projects involving multiple teams:

### Cross-Team Dependencies

Document capacity reserved for dependency coordination:

- Team A waiting on Team B: `[X hours blocked]`
- Integration work requiring multiple teams: `[Y hours collaborative work]`
- Synchronization meetings and handoffs: `[Z hours overhead]`

### Shared Resource Allocation

Explicit allocation for resources shared across teams:

| Shared Resource | Team A Allocation | Team B Allocation | Total Allocation | Notes |
| --- | --- | --- | --- | --- |
| `[Name]` | `[X hours]` | `[Y hours]` | `[X+Y hours]` | `[Coordination notes]` |

### Program-Level Capacity View

For program increment or release planning, aggregate team capacities:

- Total program capacity: `[Sum of all team capacities]`
- Cross-team coordination overhead: `[X% of total]`
- Net program capacity: `[Total - overhead]`

## 10 Success Criteria for Capacity Planning

Capacity planning is effective when:

- Iteration commitments consistently achieved (>80% completion rate)
- Buffer consumed but not exceeded (indicating appropriate contingency)
- Team reports sustainable pace (no burnout indicators)
- Velocity stabilizing over multiple iterations (predictability improving)
- Stakeholders receive realistic commitments (trust building)

### Capacity Planning Quality Metrics

Track these metrics to improve capacity planning:

- **Capacity utilization**: Actual hours consumed / Planned capacity
  - Target range: 85-95% (buffer accounts for variance)
- **Buffer consumption**: Buffer hours used / Total buffer hours
  - Target range: 50-80% (buffer used but not exhausted)
- **Over-allocation incidents**: Count of team members exceeding capacity
  - Target: Zero
- **Scope change impact**: Hours of scope changes / Total capacity
  - Target: <10% (minimize mid-iteration disruption)

## 11 Continuous Improvement

### Capacity Planning Retrospective

Include capacity planning in iteration retrospective:

- Was capacity estimate accurate?
- What factors caused capacity variance?
- Should availability factor be adjusted?
- What capacity risks should we monitor?

### Refinement Actions

Based on retrospective insights:

- Adjust availability factor: `[New factor based on last 3 iterations]`
- Improve estimation process: `[Specific improvements]`
- Update capacity assumptions: `[New assumptions]`
- Modify buffer strategy: `[Increase/decrease buffer based on volatility]`

## Related Templates

- Iteration Plan (Formal): `iteration-plan-template.md`
- Iteration Plan (Informal): `iteration-plan-informal-template.md`
- Velocity Tracking: `velocity-tracking-template.md`
- Team Profile: `team-profile-template.md`
- Iteration Assessment: `iteration-assessment-template.md`

## Tailoring Guidance

### Small Teams (1-3 people)

- Simplify capacity table (less overhead)
- Increase buffer to 20-25% (individuals have less flexibility)
- Focus on calendar availability rather than complex availability factors

### Large Teams (10+ people)

- Track capacity by sub-team or functional area
- Formalize capacity governance (approval process for over-allocation)
- Automate capacity tracking with tooling integration

### Remote/Distributed Teams

- Account for timezone coordination overhead
- Increase buffer for asynchronous communication delays
- Track capacity by timezone to ensure coverage

### Short Iterations (1 week)

- Reduce buffer to 10-15% (less volatility in short timeframe)
- Simplify capacity calculation (use rules of thumb)
- Focus on critical path capacity constraints

## Agent Notes

- Validate capacity plan shows no over-allocation before finalizing iteration plan
- Cross-check team profile for recent capacity updates (PTO, role changes)
- Alert if planned work exceeds historical velocity by >15%
- Suggest de-scoping options if capacity insufficient for requested scope
- Verify buffer allocation is documented and justified
