# Velocity Tracking Template

## Ownership & Collaboration

- Document Owner: Project Manager
- Contributor Roles: Team Lead, Metrics Analyst
- Automation Inputs: Iteration assessments, completed work records, estimation data
- Automation Outputs: `velocity-tracker.md` with historical trends and predictions

## Purpose

Velocity tracking establishes a feedback loop between estimation, planning, and delivery. By measuring completed work per iteration and analyzing estimation accuracy, teams improve predictability, plan realistically, and identify process impediments. This template defines what to measure and how to use velocity data, not how to collect it.

## 1 Velocity Measurement Approach

### Defining Velocity

**Velocity** = Amount of work completed in an iteration, measured in consistent units

**Measurement units** (choose one and maintain consistency):

- Story points (relative sizing)
- Ideal hours (estimated effort)
- Task count (for similar-sized tasks)
- Features delivered (for consistent feature scope)

**Recommendation**: Story points for variable-sized work, ideal hours for estimation-mature teams

### Velocity Calculation

**Velocity = Sum of completed work items in iteration**

**Completed** means:

- Meets Definition of Done (DoD)
- Accepted by Product Owner
- Deployed to target environment (if applicable)
- No carry-over to next iteration

**Exclude**:

- Partially completed work (count only when done)
- Scope added mid-iteration (track separately as scope creep)
- Defect remediation from previous iterations (track as rework)

### Data Collection Requirements

To track velocity, record per iteration:

1. Planned scope (committed work at iteration start)
2. Completed scope (work meeting DoD by iteration end)
3. Carry-over scope (incomplete work deferred to next iteration)
4. Scope changes (work added/removed mid-iteration)
5. Rework (defects from previous iterations)

## 2 Velocity History

### Historical Velocity Data

Track velocity over last 6-12 iterations:

| Iteration | Start Date | Planned Scope | Completed Scope | Velocity | Carry-Over | Scope Changes | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `[Iter-N]` | `[YYYY-MM-DD]` | `[X points]` | `[Y points]` | `[Y points]` | `[Z points]` | `[±A points]` | `[Context]` |
| `[Iter-N-1]` | `[YYYY-MM-DD]` | `[X points]` | `[Y points]` | `[Y points]` | `[Z points]` | `[±A points]` | `[Context]` |
| `[Iter-N-2]` | `[YYYY-MM-DD]` | `[X points]` | `[Y points]` | `[Y points]` | `[Z points]` | `[±A points]` | `[Context]` |

**Minimum data**: 3 iterations required for meaningful trend analysis

**Optimal data**: 6+ iterations provides reliable average and trend detection

### Average Velocity

**Formula**: Average Velocity = Sum(Velocity for last N iterations) / N

**Recommended N**: 3 iterations for short-term average, 6 iterations for long-term baseline

**Example**:

- Iteration 1: 32 points
- Iteration 2: 38 points
- Iteration 3: 35 points
- Average: (32 + 38 + 35) / 3 = 35 points

**Usage**: Use average velocity for planning next iteration scope

## 3 Velocity Trend Analysis

### Trend Detection

Classify velocity trend over last 3-6 iterations:

- **Stable**: Velocity variance <10% from average (predictable)
- **Improving**: Velocity increasing >10% over period (process improvements working)
- **Declining**: Velocity decreasing >10% over period (investigate impediments)
- **Volatile**: Velocity swinging >20% iteration-to-iteration (unpredictable, process issues)

**Visualization recommendation**: Line chart with velocity per iteration, average line, ±10% variance band

### Trend Analysis Questions

**If stable**: What practices maintain consistency? How do we preserve them?

**If improving**: What changed? Can we accelerate improvement? Is it sustainable?

**If declining**: What impediments emerged? Team capacity reduced? Complexity increasing?

**If volatile**: What causes swings? Estimation inconsistency? External disruptions? Scope creep?

### Contextual Factors

Document factors influencing velocity trends:

| Iteration | Velocity | Trend | Influencing Factors |
| --- | --- | --- | --- |
| `[Iter-N]` | `[X points]` | `[+5% vs avg]` | `[New team member onboarding reduced capacity]` |
| `[Iter-N-1]` | `[Y points]` | `[-10% vs avg]` | `[Production incident consumed 15 hours]` |
| `[Iter-N-2]` | `[Z points]` | `[+2% vs avg]` | `[Automated deployment reduced overhead]` |

**Purpose**: Separate signal from noise - understand whether velocity changes indicate process issues or one-time events

## 4 Estimation Accuracy Tracking

### Estimation Variance

Measure how accurately team estimates work:

**Formula**: Estimation Error = (Actual Effort - Estimated Effort) / Estimated Effort × 100%

**Positive error**: Underestimated (actual > estimate)
**Negative error**: Overestimated (actual < estimate)

### Story-Level Estimation Accuracy

Track estimation accuracy for individual stories:

| Story ID | Estimated Effort | Actual Effort | Variance | Root Cause of Variance |
| --- | --- | --- | --- | --- |
| `[STORY-123]` | `[8 hours]` | `[12 hours]` | `[+50%]` | `[Unforeseen API integration complexity]` |
| `[STORY-124]` | `[5 hours]` | `[4 hours]` | `[-20%]` | `[Simpler than expected, reused existing code]` |
| `[STORY-125]` | `[13 hours]` | `[16 hours]` | `[+23%]` | `[Database migration not accounted for]` |

**Analysis**: Identify patterns in estimation errors

- Are specific story types consistently underestimated?
- Do specific team members estimate differently?
- Are technical dependencies commonly missed?

### Iteration-Level Estimation Accuracy

Aggregate estimation accuracy per iteration:

| Iteration | Total Estimated | Total Actual | Estimation Error | Notes |
| --- | --- | --- | --- | --- |
| `[Iter-N]` | `[40 points]` | `[38 points]` | `[-5%]` | `[Slight over-estimation, improving]` |
| `[Iter-N-1]` | `[40 points]` | `[32 points]` | `[-20%]` | `[Significant over-estimation, new tech stack]` |

**Target**: ±10% estimation error (within acceptable margin)

**Red flag**: Consistent >20% error indicates estimation process breakdown

## 5 Predictability Metrics

### Commitment Reliability

**Definition**: How often does the team deliver what they commit to?

**Formula**: Commitment Reliability = (Iterations meeting goals / Total iterations) × 100%

**Measurement approach**:

- Goal met: Completed scope ≥90% of planned scope
- Goal partially met: Completed scope 70-89% of planned scope
- Goal missed: Completed scope <70% of planned scope

**Target**: >80% commitment reliability (4 of 5 iterations meet goals)

### Scope Creep Tracking

**Definition**: Unplanned work added mid-iteration

**Formula**: Scope Creep = (Scope added mid-iteration / Original planned scope) × 100%

**Acceptable scope creep**: <10% (minor adjustments)
**Problematic scope creep**: >20% (destabilizes iteration)

**Tracking table**:

| Iteration | Original Scope | Scope Added | Scope Removed | Net Change | Scope Creep % |
| --- | --- | --- | --- | --- | --- |
| `[Iter-N]` | `[40 points]` | `[5 points]` | `[0 points]` | `[+5 points]` | `[+12.5%]` |

**Mitigation**: Establish scope freeze after iteration planning, use buffer for emergent work

### Rework Percentage

**Definition**: Effort spent fixing defects from previous iterations

**Formula**: Rework % = (Effort on defects / Total iteration capacity) × 100%

**Tracking table**:

| Iteration | Total Capacity | Defect Remediation | Rework % | Defect Sources |
| --- | --- | --- | --- | --- |
| `[Iter-N]` | `[40 hours]` | `[6 hours]` | `[15%]` | `[4 defects from Iter-N-1, 2 from Iter-N-2]` |

**Target rework**: <15% (healthy level for sustainable quality)
**Warning threshold**: >25% (quality issues compounding)

## 6 Velocity-Based Planning

### Using Velocity for Iteration Planning

**Recommended approach**: Plan next iteration scope = Average velocity × Buffer factor

**Buffer factor**:

- Stable velocity: 95-100% of average (high confidence)
- Improving velocity: 100-105% of average (capitalize on improvement)
- Declining velocity: 85-95% of average (conservative until stabilized)
- Volatile velocity: 80-90% of average (high uncertainty)

**Example**:

- Average velocity: 35 points (last 3 iterations)
- Trend: Stable (variance <10%)
- Buffer factor: 95% (account for small uncertainties)
- Planned scope: 35 × 0.95 = 33 points

### Forecasting Completion

Use velocity to predict when backlog will be completed:

**Formula**: Iterations to Complete = Remaining Backlog / Average Velocity

**Example**:

- Remaining backlog: 140 points
- Average velocity: 35 points/iteration
- Iterations needed: 140 / 35 = 4 iterations
- Estimated completion: 8 weeks (assuming 2-week iterations)

**Confidence levels**:

- High confidence (stable velocity): ±1 iteration variance
- Medium confidence (some volatility): ±2 iteration variance
- Low confidence (high volatility): ±3 iteration variance

### Capacity-Velocity Alignment

Validate velocity against team capacity:

**Check**: Does planned velocity align with available capacity?

**Example**:

- Team capacity: 80 hours/iteration
- Planned velocity: 40 points
- Implied hours per point: 80 / 40 = 2 hours/point
- Historical average: 2.2 hours/point

**Interpretation**: Planned velocity is slightly aggressive (2 vs 2.2 hours/point), acceptable if team improving efficiency

## 7 Velocity Improvement Strategies

### Identifying Velocity Limiters

Analyze root causes of velocity constraints:

- **Estimation accuracy**: Poor estimates lead to overcommitment
- **Defect rate**: High rework consumes capacity
- **Scope creep**: Unplanned work destabilizes iterations
- **Blockers**: External dependencies or technical impediments
- **Team capacity**: Insufficient capacity for planned scope
- **Process overhead**: Excessive meetings, coordination, administrative work

### Improvement Experiment Framework

Test improvements using structured experiments:

1. **Hypothesis**: `[e.g., "Pair programming will reduce defect rate and improve velocity"]`
2. **Baseline**: `[Current velocity = 35 points, defect rate = 20%]`
3. **Intervention**: `[Pair on all stories >8 hours for 2 iterations]`
4. **Measurement**: `[Track velocity, defect rate, estimation accuracy]`
5. **Evaluation**: `[After 2 iterations, assess if hypothesis validated]`
6. **Decision**: `[Adopt, modify, or abandon practice based on evidence]`

### Velocity Improvement Levers

Evidence-based practices that improve velocity:

- **Reduce rework**: Improve code review, testing, Definition of Done
- **Minimize blockers**: Early dependency identification, proactive escalation
- **Stabilize scope**: Scope freeze, strong product ownership, buffer management
- **Improve estimation**: Historical data, decomposition standards, estimation workshops
- **Reduce coordination overhead**: Smaller teams, clearer ownership, async communication
- **Invest in automation**: CI/CD, testing, deployment automation

## 8 Success Criteria for Velocity Tracking

Velocity tracking is effective when:

- Velocity data informs iteration planning (not ignored or overridden arbitrarily)
- Team commitment reliability >80% (consistent delivery)
- Velocity trend understood (team can explain changes)
- Estimation accuracy improving over time (learning from experience)
- Predictability enables stakeholder confidence (realistic roadmaps)

### Velocity Tracking Quality Metrics

Monitor these to ensure velocity tracking remains valuable:

- **Data completeness**: 100% of iterations have recorded velocity
- **Data timeliness**: Velocity updated within 2 days of iteration end
- **Estimation capture**: >90% of completed work has actual effort recorded
- **Trend visibility**: Velocity chart reviewed in iteration planning
- **Action orientation**: Velocity issues trigger retrospective discussion and improvement actions

## 9 Anti-Patterns to Avoid

### Gaming Velocity

**Problem**: Team inflates estimates to show higher velocity

**Detection**: Velocity increasing while actual throughput flat or declining

**Prevention**: Focus on business value delivered, not velocity points; use velocity for planning, not performance evaluation

### Over-Optimizing Velocity

**Problem**: Team sacrifices quality to maximize velocity

**Detection**: Velocity increasing but defect rate rising, technical debt accumulating

**Prevention**: Balance velocity with quality metrics (defect rate, tech debt, code health)

### Ignoring Context

**Problem**: Comparing velocity across teams or treating velocity as universal metric

**Issue**: Velocity is team-specific, context-dependent, and non-comparable

**Prevention**: Use velocity for intra-team planning only, never for team comparison

### Planning Beyond Capacity

**Problem**: Ignoring velocity data and committing to unrealistic scope

**Detection**: Consistent <70% completion rate, high carry-over

**Prevention**: Enforce velocity-based planning guardrails, communicate capacity constraints to stakeholders

## Related Templates

- Iteration Plan: `iteration-plan-template.md`
- Iteration Assessment: `iteration-assessment-template.md`
- Capacity Planning: `capacity-planning-template.md`
- Sprint Retrospective: `sprint-retrospective-template.md`
- Measurement Plan: `measurement-plan-template.md`

## Tailoring Guidance

### Small Teams (1-3 people)

- Simplify tracking: Focus on completed vs planned work, less granular analysis
- Shorten history: 3 iterations sufficient for planning
- Informal tracking: Spreadsheet or simple table adequate

### Large Teams (10+ people)

- Track sub-team velocity separately
- Aggregate program-level velocity for cross-team planning
- Automate data collection from project management tools

### Kanban/Flow Teams

- Replace velocity with throughput (items completed per time period)
- Track cycle time (time from start to done)
- Use cumulative flow diagrams instead of velocity charts

### Short Iterations (1 week)

- Velocity may be volatile due to small sample size
- Use rolling 6-iteration average (6 weeks of data)
- Focus on throughput trends rather than iteration-to-iteration variance

### New Teams

- Velocity unstable during first 3-5 iterations (team forming, process establishing)
- Don't commit to velocity-based roadmaps until 5+ iterations of data
- Focus on estimation accuracy and process improvement, not velocity optimization

## Agent Notes

- Verify velocity history has ≥3 data points before calculating average
- Alert if velocity declining >15% from historical average (warrants investigation)
- Suggest capacity planning adjustment if planned scope exceeds average velocity by >10%
- Cross-reference velocity trends with iteration assessments for context
- Flag estimation errors >30% for retrospective discussion
