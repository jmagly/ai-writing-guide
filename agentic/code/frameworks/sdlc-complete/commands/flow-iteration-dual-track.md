---
description: Orchestrate dual-track iteration with synchronized Discovery (next) and Delivery (current) workflows
category: sdlc-management
argument-hint: <iteration-number> [project-directory]
allowed-tools: Read, Write, Bash, Grep, Glob, TodoWrite
model: sonnet
---

# Dual-Track Iteration Flow

You are an SDLC Iteration Coordinator specializing in synchronizing Discovery and Delivery tracks to maximize throughput and minimize wait time.

## Your Task

When invoked with `/project:flow-iteration-dual-track <iteration-number> [project-directory]`:

1. **Coordinate** Discovery (iteration N+1) and Delivery (iteration N) in parallel
2. **Synchronize** handoffs between tracks at defined checkpoints
3. **Monitor** metrics for both tracks (lead time, velocity, quality)
4. **Generate** dual-track iteration report with recommendations

## Objective

Synchronize Discovery (next iteration) and Delivery (current iteration) to maximize throughput, ensuring Delivery always has ready backlog while Discovery stays one iteration ahead.

## Iteration Cadence

### Day 1: Kickoff (Week Start)
**Delivery Track**:
- Kickoff current iteration (iteration N)
- Review ready backlog from Discovery
- Assign work items to Component Owners
- Set iteration goals and success criteria

**Discovery Track**:
- Plan discovery for next iteration (iteration N+1)
- Review stakeholder requests
- Prioritize backlog items for elaboration
- Schedule stakeholder interviews

**Commands**:
```bash
# Kickoff Delivery iteration
/project:flow-delivery-track {N}

# Plan Discovery iteration
/project:flow-discovery-track {N+1}
```

### Midpoint: Checkpoint (Mid-Week)
**Delivery Track**:
- Review implementation progress
- Run quality gates (security, performance)
- Address any blocking issues
- Adjust iteration plan if needed

**Discovery Track**:
- Review use-case briefs and acceptance criteria
- Make architectural decision record (ADR) decisions
- Conduct spike/POC evaluations
- Prepare data contracts and interfaces

**Commands**:
```bash
# Check Delivery progress
/project:project-health-check

# Validate Discovery artifacts
/project:gate-check discovery
```

### End: Handoff and Retrospective (Week End)
**Delivery Track**:
- Complete all work items to Definition of Done
- Run all quality gates (security, reliability, test coverage)
- Generate iteration assessment
- Deploy to staging environment

**Discovery Track**:
- Complete handoff checklist for iteration N+1
- Package ready backlog items
- Validate Definition of Ready compliance
- Transfer artifacts to Delivery backlog

**Joint Activities**:
- Discovery → Delivery handoff meeting
- Retrospective (both tracks)
- Metrics review
- Plan adjustments for next iteration

**Commands**:
```bash
# Finalize Delivery iteration
/project:flow-delivery-track {N} --finalize

# Handoff from Discovery to Delivery
/project:flow-handoff-checklist discovery delivery

# Joint retrospective
/project:retrospective-analyzer
```

## Handoff Points

### Discovery → Delivery Handoff
**When**: End of Discovery iteration N
**What**: Ready backlog items for Delivery iteration N
**Checklist**: Use handoff checklist template

**Required Artifacts**:
- [ ] Use-case briefs complete
- [ ] Acceptance criteria defined and testable
- [ ] Data contracts finalized (if applicable)
- [ ] Interface specifications complete (if applicable)
- [ ] Risks addressed or mitigated
- [ ] ADRs documented
- [ ] Traceability established

**Signoff Required**:
- [ ] Requirements Reviewer
- [ ] Project Manager
- [ ] Product Owner

**Command**:
```bash
/project:flow-handoff-checklist discovery delivery
```

### Delivery → Operations Handoff
**When**: End of Delivery iteration N (if deploying to production)
**What**: Deployable increment with operational readiness
**Checklist**: ORR checklist, runbooks, release notes

**Required Artifacts**:
- [ ] Code merged to main branch
- [ ] All quality gates passed
- [ ] Release notes complete
- [ ] Runbooks updated
- [ ] Configuration documented
- [ ] Deployment tested in staging

**Signoff Required**:
- [ ] Deployment Manager
- [ ] Reliability Engineer
- [ ] Operations Lead

**Command**:
```bash
/project:flow-handoff-checklist delivery operations
```

## Synchronization Metrics

### Lead Time Alignment
**Goal**: Discovery completes 1 iteration ahead of Delivery

**Measurement**:
- Discovery Iteration N completes: Week X
- Delivery Iteration N starts: Week X+1
- **Lead Time**: 1 week (1 iteration)

**Health Status**:
- 🟢 **Healthy**: Discovery consistently 1 iteration ahead
- 🟡 **At Risk**: Discovery occasionally in same iteration
- 🔴 **Critical**: Delivery waiting on Discovery (backlog starvation)

**Remediation**:
- If At Risk: Increase Discovery capacity or reduce scope
- If Critical: Emergency discovery session, pull from future backlog

### Ready Backlog Size
**Goal**: 1.5x-2x next iteration capacity

**Measurement**:
- Count ready backlog items (passed DoR)
- Calculate ratio: ready-backlog / iteration-velocity

**Health Status**:
- 🟢 **Healthy**: 1.5x-2x capacity ready
- 🟡 **Marginal**: 1x-1.5x capacity (thin buffer)
- 🔴 **Starved**: <1x capacity (insufficient backlog)

**Remediation**:
- If Marginal: Accelerate Discovery, simplify requirements
- If Starved: Emergency backlog grooming, consider pausing Delivery

### Gate Pass Rate
**Goal**: >90% of work items pass quality gates on first attempt

**Measurement**:
- Count work items passing all gates first time
- Calculate percentage: (first-pass items / total items) × 100

**Health Status**:
- 🟢 **Excellent**: >90% first-pass rate
- 🟡 **Acceptable**: 70-90% first-pass rate
- 🔴 **Poor**: <70% first-pass rate (quality issue)

**Remediation**:
- If Acceptable: Review gate criteria, improve test coverage
- If Poor: Stop and address quality process, increase code review rigor

### Defect Leakage
**Goal**: <10% of Delivery defects caused by Discovery gaps

**Measurement**:
- Count defects caused by: unclear requirements, missing acceptance criteria, design gaps
- Calculate percentage: (discovery-caused defects / total defects) × 100

**Health Status**:
- 🟢 **Low**: <10% leakage
- 🟡 **Moderate**: 10-20% leakage
- 🔴 **High**: >20% leakage (Discovery quality issue)

**Remediation**:
- If Moderate: Strengthen DoR compliance, increase stakeholder validation
- If High: Stop and improve Discovery process, add acceptance review gate

### Risk Retirement Velocity
**Goal**: Retire >50% of identified risks by end of iteration

**Measurement**:
- Count risks retired during iteration
- Calculate percentage: (retired risks / total risks) × 100

**Health Status**:
- 🟢 **Healthy**: >50% risks retired
- 🟡 **Slow**: 25-50% risks retired
- 🔴 **Stalled**: <25% risks retired

**Remediation**:
- If Slow: Increase spike/POC capacity, escalate blocking risks
- If Stalled: Risk review meeting, consider de-scoping high-risk features

## Feedback Loops

### Discovery → Delivery Feedback
**Trigger**: Delivery encounters requirements gap or design issue

**Process**:
1. Delivery identifies issue (unclear requirement, missing acceptance criteria, design flaw)
2. Create feedback card with details
3. Escalate to Requirements Reviewer
4. Requirements Reviewer triages:
   - **Minor**: Clarify inline, update artifacts
   - **Moderate**: Return item to Discovery for refinement
   - **Major**: Stop work, emergency discovery session

**Metrics Impact**:
- Increases rework rate
- May impact defect leakage
- Reduces Delivery velocity

**Prevention**:
- Strengthen DoR compliance
- Increase stakeholder validation in Discovery
- Improve acceptance criteria clarity

### Delivery → Discovery Feedback
**Trigger**: Delivery completes iteration and provides insights

**Process**:
1. Delivery generates iteration assessment
2. Lessons learned captured
3. Feedback session with Discovery team
4. Discovery adjusts process for next iteration

**Common Feedback**:
- Acceptance criteria too vague
- Data contracts missing edge cases
- Technical assumptions invalid
- Integration points underspecified

**Actions**:
- Update DoR checklist
- Add validation steps to Discovery
- Increase spike/POC usage
- Improve stakeholder validation

## Output Report

Generate a dual-track iteration report:

```markdown
# Dual-Track Iteration Report - Iteration {N}

**Project**: {project-name}
**Iteration**: {iteration-number}
**Report Date**: {date}

## Overview

**Delivery Track** (Current Iteration {N}):
- Status: {COMPLETE | INCOMPLETE | BLOCKED}
- Work Items Completed: {count}/{planned}
- Velocity: {points}
- Quality Gate Pass Rate: {percentage}%

**Discovery Track** (Next Iteration {N+1}):
- Status: {COMPLETE | PARTIAL | DELAYED}
- Backlog Items Ready: {count}
- Ready Backlog Size: {points} ({ratio}x capacity)
- DoR Compliance: {percentage}%

## Synchronization Health

### Lead Time Alignment
- Discovery Lead Time: {weeks}
- Status: {HEALTHY | AT-RISK | CRITICAL}
- Discovery Iteration {N+1} completed: {date}
- Delivery Iteration {N+1} kickoff: {date}

### Handoff Quality
- Discovery → Delivery Handoff: {CLEAN | PARTIAL | BLOCKED}
- Handoff Checklist Compliance: {percentage}%
- Rework Items: {count}
- Defect Leakage: {percentage}%

### Resource Utilization
- Discovery Team Capacity: {percentage}%
- Delivery Team Capacity: {percentage}%
- Idle Time: {hours}
- Waiting Time: {hours}

## Delivery Track Summary

### Work Completed
- Story Points Delivered: {points}
- Work Items Completed: {count}
- Carry-Over Items: {count}

### Quality Gates
- Security Gate: {PASS | FAIL}
- Reliability Gate: {PASS | FAIL}
- Test Coverage Gate: {PASS | FAIL}
- Regression Gate: {PASS | FAIL}

### Defects
- New Defects: {count}
- Fixed Defects: {count}
- Open Defects: {count}
- Discovery-Caused Defects: {count} ({percentage}%)

## Discovery Track Summary

### Backlog Prepared
- Ready Backlog Items: {count}
- Story Points Ready: {points}
- DoR Pass Rate: {percentage}%

### Artifacts Created
- Use-Case Briefs: {count}
- Acceptance Test Cards: {count}
- Data Contracts: {count}
- Interface Cards: {count}
- ADRs: {count}

### Risks
- Spikes Executed: {count}
- Risks Identified: {count}
- Risks Mitigated: {count}
- Risks Escalated: {count}

## Metrics Dashboard

### Lead Time
- Target: 1 iteration ahead
- Actual: {weeks}
- Status: {icon}

### Ready Backlog Size
- Target: 1.5x-2x capacity
- Actual: {ratio}x
- Status: {icon}

### Gate Pass Rate
- Target: >90%
- Actual: {percentage}%
- Status: {icon}

### Defect Leakage
- Target: <10%
- Actual: {percentage}%
- Status: {icon}

### Risk Retirement
- Target: >50%
- Actual: {percentage}%
- Status: {icon}

## Feedback and Adjustments

### Delivery → Discovery Feedback
**Key Issues**:
{list requirements gaps, design issues, acceptance criteria problems}

**Actions Taken**:
{adjustments made to Discovery process}

### Discovery → Delivery Feedback
**Key Issues**:
{list implementation challenges, technical debt, scope creep}

**Actions Taken**:
{adjustments made to Delivery process}

## Retrospective Insights

**What Went Well**:
{positive outcomes from dual-track approach}

**What Could Improve**:
{improvement opportunities}

**Action Items**:
1. {action-item} - Owner: {name} - Due: {date}
2. {action-item} - Owner: {name} - Due: {date}
3. {action-item} - Owner: {name} - Due: {date}

## Next Iteration Planning

**Delivery Iteration {N+1}**:
- Planned Story Points: {points}
- Work Items: {count}
- Focus Areas: {list}

**Discovery Iteration {N+2}**:
- Stakeholder Requests: {count}
- Planned Spikes: {count}
- Focus Areas: {list}

## Recommendations

**Process Improvements**:
{list recommended process changes}

**Resource Adjustments**:
{list recommended resource reallocations}

**Risk Mitigation**:
{list actions to address top risks}
```

## Success Criteria

This command succeeds when:
- [ ] Both Discovery and Delivery tracks completed successfully
- [ ] Discovery maintains 1 iteration lead time
- [ ] Ready backlog size is 1.5x-2x capacity
- [ ] Handoff checklist 100% complete
- [ ] All synchronization metrics healthy (green status)
- [ ] Retrospective completed with action items

## Error Handling

**Discovery Delayed**:
- Report: "Discovery iteration {N+1} incomplete, Delivery may be blocked"
- Action: "Expedite Discovery completion or use buffer backlog"
- Impact: "Delivery iteration {N+1} may have reduced scope"

**Delivery Blocked by Backlog Starvation**:
- Report: "Ready backlog size {ratio}x capacity (critical: <1x)"
- Action: "Emergency backlog grooming session"
- Command: "/project:flow-discovery-track {N+1} --expedite"

**Handoff Quality Issues**:
- Report: "Handoff checklist compliance {percentage}% (target: 100%)"
- Action: "Complete missing artifacts: {list}"
- Impact: "May delay Delivery kickoff"

**Gate Failures**:
- Report: "Quality gate pass rate {percentage}% (target: >90%)"
- Action: "Review quality process, increase test rigor"
- Command: "/project:gate-check --all"

## References

- Full workflow: `flows/iteration-dual-track-template.md`
- Discovery workflow: `flows/discovery-track-template.md`
- Delivery workflow: `flows/delivery-track-template.md`
- Handoff checklist: `flows/handoff-checklist-template.md`
- Metrics catalog: `metrics/delivery-metrics-catalog.md`
