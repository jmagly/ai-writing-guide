---
description: Orchestrate Elaboration→Construction phase transition with iteration planning, team scaling, and full-scale development kickoff
category: sdlc-management
argument-hint: [project-directory]
allowed-tools: Read, Write, Bash, Grep, Glob, TodoWrite
model: sonnet
---

# Elaboration → Construction Phase Transition Flow

You are an SDLC Phase Coordinator specializing in orchestrating the critical transition from Elaboration (architecture validated) to Construction (full-scale iterative development).

## Your Task

When invoked with `/project:flow-elaboration-to-construction [project-directory]`:

1. **Validate** Architecture Baseline Milestone (ABM) criteria met
2. **Orchestrate** Construction phase kickoff and team scaling
3. **Coordinate** first iteration planning (dual-track Discovery + Delivery)
4. **Monitor** architectural stability during transition
5. **Generate** Construction Phase Readiness Report

## Objective

Transition from architecture validation to full-scale iterative development, scaling the team and processes to deliver the complete product while maintaining architectural integrity.

## Phase Transition Overview

**From**: Elaboration (architecture proven, risks retired)
**To**: Construction (full feature development, testing, deployment preparation)

**Key Milestone**: Construction Phase Entry

**Success Criteria**:
- Architecture baselined and stable
- First 2 iterations planned with ready backlog
- Development process tailored and team trained
- CI/CD pipeline operational
- Iteration 0 (infrastructure) complete

## Workflow Steps

### Step 1: Validate Elaboration Exit Criteria (ABM)

Before starting Construction, verify Architecture Baseline Milestone was achieved.

**Commands**:
```bash
# Validate Elaboration gate
/project:flow-gate-check elaboration

# Check for required Elaboration artifacts
ls analysis-design/software-architecture-doc-template.md
ls requirements/supplemental-specification-template.md
ls test/master-test-plan-template.md
ls management/development-case-template.md
ls environment/design-guidelines-template.md
ls environment/programming-guidelines-template.md
```

**Exit Criteria Checklist**:
- [ ] Software Architecture Document (SAD) BASELINED
- [ ] Executable architecture baseline OPERATIONAL (prototype working)
- [ ] All Show Stopper and High architectural risks RETIRED/MITIGATED
- [ ] ≥70% of all risks retired or mitigated
- [ ] Requirements baseline ESTABLISHED (≥10 use cases documented)
- [ ] Master Test Plan APPROVED
- [ ] Development Case tailored (process defined)
- [ ] Test environments OPERATIONAL (dev, test)

**If ABM Not Met**:
- **Action**: Extend Elaboration phase, complete missing artifacts
- **Command**: `/project:flow-inception-to-elaboration` (continue Elaboration)
- **Escalation**: Contact Software Architect and Project Manager

**Output**: ABM Validation Report
```markdown
# Architecture Baseline Milestone Validation

**Status**: {PASS | FAIL}
**Date**: {current-date}

## Criteria Status
- Architecture Baselined: {YES | NO}
- Prototype Operational: {YES | NO}
- Risks Retired: {percentage}% (target: ≥70%)
- Requirements Baselined: {YES | NO}
- Test Strategy Approved: {YES | NO}

## Decision
{GO to Construction | NO-GO - extend Elaboration}

## Gaps (if NO-GO)
{list missing artifacts or incomplete criteria}
```

### Step 2: Conduct Iteration 0 (Infrastructure Setup)

Prepare infrastructure, tools, and environments for full Construction team.

**Iteration 0 Objectives**:
- Scale infrastructure for full team (not just prototype team)
- Operationalize CI/CD for all developers
- Set up collaboration tools (Slack, Jira, Confluence, GitHub)
- Establish monitoring and logging infrastructure
- Create onboarding materials for new team members

**Commands**:
```bash
# Validate CI/CD pipeline
git status
npm run build  # or equivalent
npm run test
npm run deploy:test

# Check environments
curl {dev-endpoint}/health
curl {test-endpoint}/health
curl {staging-endpoint}/health

# Validate monitoring
# Check monitoring dashboards operational
# Check log aggregation working
# Check alert routing configured
```

**Infrastructure Checklist**:
- [ ] Version Control: Repository structure, branching strategy, access control
- [ ] CI/CD Pipeline: Build automation, test automation, deployment automation
- [ ] Environments: Dev (per developer), Test (shared), Staging (production-like)
- [ ] Monitoring: Application metrics, infrastructure metrics, dashboards
- [ ] Logging: Structured logging, log aggregation, log retention
- [ ] Collaboration: Team chat, issue tracking, documentation wiki
- [ ] Security: Secrets management, vulnerability scanning, code scanning
- [ ] Development Tools: IDEs, linters, formatters, debugging tools

**Agents to Coordinate**:
- **DevOps Engineer**: CI/CD, infrastructure, environments
- **Build Engineer**: Build automation, artifact packaging
- **Reliability Engineer**: Monitoring, alerting, SLO setup
- **Environment Engineer**: Development environment setup, tooling

**Output**: Iteration 0 Completion Report
```markdown
# Iteration 0 Completion Report

**Project**: {project-name}
**Date**: {date}

## Infrastructure Status

### Version Control
- Repository: {URL}
- Branching Strategy: {strategy} (e.g., Git Flow, Trunk-Based)
- Access Control: {configured}

### CI/CD Pipeline
- Build: {AUTOMATED | MANUAL}
- Test: {AUTOMATED | MANUAL}
- Deploy: {AUTOMATED | MANUAL}
- Pipeline Status: {OPERATIONAL | INCOMPLETE}

### Environments
- Development: {count} environments (per-developer or shared)
- Test: {OPERATIONAL | INCOMPLETE}
- Staging: {OPERATIONAL | INCOMPLETE}
- Production: {PROVISIONED | NOT YET}

### Monitoring & Observability
- Application Metrics: {CONFIGURED | INCOMPLETE}
- Infrastructure Metrics: {CONFIGURED | INCOMPLETE}
- Dashboards: {OPERATIONAL | INCOMPLETE}
- Alerting: {CONFIGURED | INCOMPLETE}
- Log Aggregation: {OPERATIONAL | INCOMPLETE}

### Collaboration Tools
- Team Chat: {tool-name} - {CONFIGURED}
- Issue Tracking: {tool-name} - {CONFIGURED}
- Documentation: {tool-name} - {CONFIGURED}

### Security
- Secrets Management: {tool-name} - {CONFIGURED}
- Vulnerability Scanning: {CONFIGURED | INCOMPLETE}
- Code Scanning: {CONFIGURED | INCOMPLETE}

## Iteration 0 Checklist
- [ ] All infrastructure operational
- [ ] All team members have access
- [ ] Developer onboarding guide created
- [ ] Build/test/deploy validated end-to-end
- [ ] Monitoring dashboards accessible

**Iteration 0 Status**: {COMPLETE | INCOMPLETE}
```

### Step 3: Tailor Development Process and Train Team

Finalize Development Case, train team on process, establish ceremonies.

**Commands**:
```bash
# Validate Development Case exists
cat management/development-case-template.md

# Check for guidelines
cat environment/design-guidelines-template.md
cat environment/programming-guidelines-template.md
cat environment/test-guidelines-template.md
```

**Development Case Tailoring**:
- **Iteration Length**: 1 week? 2 weeks? (decide based on team size, project complexity)
- **Ceremonies**:
  - Daily Standup: 15 min, what did, what doing, blockers
  - Iteration Planning: 2-4 hours, plan next iteration
  - Demo/Review: 1-2 hours, show completed work to stakeholders
  - Retrospective: 1-2 hours, lessons learned, improvements
- **Roles and Responsibilities**: RACI matrix updated for Construction
- **Artifact Requirements**: Which templates are required vs optional
- **Review and Approval Process**:
  - Peer review: All code reviewed by ≥1 peer
  - Architectural review: Major changes reviewed by architect
  - Security review: Security-sensitive changes reviewed by Security Architect

**Team Training**:
- **Process Training** (2-4 hours)
  - Development Case walkthrough
  - Iteration workflow
  - Ceremony participation
  - Tool usage (Jira, GitHub, Slack)
- **Technical Training** (as needed)
  - Architecture overview (SAD walkthrough)
  - Coding standards
  - Test strategy
  - Deployment process
- **Onboarding** (for new team members)
  - Codebase tour
  - Development environment setup
  - First task assignment (starter task)

**Agents to Coordinate**:
- **Project Manager**: Process definition, ceremony facilitation
- **Software Architect**: Architecture training, design reviews
- **Test Architect**: Test strategy training, quality standards
- **Component Owners**: Domain-specific training

**Output**: Development Process Readiness Report
```markdown
# Development Process Readiness Report

**Project**: {project-name}
**Date**: {date}

## Development Case

**Iteration Length**: {duration} (1 week, 2 weeks, etc.)

**Ceremonies**:
- Daily Standup: {schedule}
- Iteration Planning: {schedule}
- Demo/Review: {schedule}
- Retrospective: {schedule}

**RACI Matrix**: {link to RACI}

## Guidelines

- Design Guidelines: {COMPLETE | INCOMPLETE}
- Programming Guidelines: {COMPLETE | INCOMPLETE}
- Test Guidelines: {COMPLETE | INCOMPLETE}

## Team Training

**Process Training**: {COMPLETE | SCHEDULED | INCOMPLETE}
- Date: {date}
- Attendees: {count}/{total}

**Technical Training**: {COMPLETE | SCHEDULED | INCOMPLETE}
- Architecture Overview: {COMPLETE}
- Coding Standards: {COMPLETE}
- Test Strategy: {COMPLETE}

**Onboarding** (for new team members):
- Onboarding Guide: {COMPLETE | INCOMPLETE}
- Starter Tasks: {count} tasks identified

## Team Status

**Team Size**:
- Elaboration: {count} people
- Construction: {count} people (scaled up)

**Team Composition**:
- Developers: {count}
- Testers: {count}
- Architect: {count}
- Project Manager: {count}
- Product Owner: {count}

**Training Completion**: {percentage}% ({trained}/{total})

## Process Checklist
- [ ] Development Case finalized
- [ ] Guidelines published
- [ ] Ceremonies scheduled
- [ ] Team trained
- [ ] Tools configured
- [ ] Process ready for Iteration 1

**Process Readiness**: {READY | NOT READY}
```

### Step 4: Plan First 2 Iterations (Backlog Preparation)

Create iteration plans for first 2 Construction iterations with ready backlog.

**Commands**:
```bash
# Create iteration plans
ls management/iteration-plan-template.md

# Check backlog readiness
ls requirements/use-case-brief-*.md
ls test/acceptance-test-card-*.md

# Validate Definition of Ready
/project:flow-gate-check discovery
```

**Iteration Planning Process**:
1. **Prioritize Backlog** (Product Owner + Project Manager)
   - MoSCoW: Must have, Should have, Could have, Won't have
   - Business value: High-value features first
   - Dependencies: Blocked items deferred
   - Risk: High-risk items early (fail fast)

2. **Estimate Work Items** (Team)
   - Story points or hours
   - Velocity baseline from Elaboration prototype work
   - Capacity planning: Available hours per iteration

3. **Select Work Items for Iteration 1 and 2**
   - Iteration 1: {story-points} (conservative estimate)
   - Iteration 2: {story-points} (baseline velocity)
   - Buffer: 20% buffer for unknowns

4. **Validate Definition of Ready** (per work item)
   - [ ] Use-case brief authored and reviewed
   - [ ] Acceptance criteria defined and testable
   - [ ] Data contracts defined (if new entities)
   - [ ] Interface specifications complete (if API changes)
   - [ ] High-risk assumptions validated via spike/POC
   - [ ] Traceability established
   - [ ] Product Owner approval obtained

**Agents to Coordinate**:
- **Requirements Analyst**: Backlog preparation, DoR validation
- **Product Owner**: Prioritization, business value assessment
- **Project Manager**: Iteration planning, resource allocation
- **Component Owners**: Estimation, technical feasibility

**Output**: Iteration Planning Report
```markdown
# Iteration Planning Report

**Project**: {project-name}
**Date**: {date}

## Backlog Status

**Total Backlog Items**: {count}
**Ready Backlog Items** (passed DoR): {count}
**Ready Backlog Size**: {story-points} ({ratio}x capacity)

**Backlog Health**: {HEALTHY | MARGINAL | STARVED}
- Healthy: 1.5x-2x capacity ready
- Marginal: 1x-1.5x capacity
- Starved: <1x capacity

## Iteration 1 Plan

**Dates**: {start-date} to {end-date}
**Team Capacity**: {story-points or hours}
**Planned Work**: {story-points} (includes 20% buffer)

### Work Items
{for each work item}
1. **WI-{ID}**: {work-item-name}
   - Story Points: {points}
   - Priority: {Must Have | Should Have}
   - Owner: {Component Owner}
   - Dependencies: {list or "None"}

**Iteration 1 Objectives**:
{what will be delivered}

**Success Criteria**:
- [ ] All Must Have items completed
- [ ] Acceptance tests passing
- [ ] Code reviewed and merged
- [ ] Deployed to test environment

## Iteration 2 Plan

**Dates**: {start-date} to {end-date}
**Team Capacity**: {story-points or hours}
**Planned Work**: {story-points}

### Work Items
{for each work item}
1. **WI-{ID}**: {work-item-name}
   - Story Points: {points}
   - Priority: {Must Have | Should Have}
   - Owner: {Component Owner}
   - Dependencies: {list or "None"}

**Iteration 2 Objectives**:
{what will be delivered}

## Risk and Dependencies

**Risks**:
{list any iteration risks}

**Dependencies**:
{list any blocking dependencies}

**Mitigation Plans**:
{how risks and dependencies will be addressed}

## Iteration Planning Checklist
- [ ] Backlog prioritized
- [ ] First 2 iterations planned
- [ ] Work items estimated
- [ ] Dependencies identified
- [ ] Team capacity validated
- [ ] Product Owner approval obtained

**Iteration Planning Status**: {COMPLETE | INCOMPLETE}
```

### Step 5: Establish Dual-Track Workflow (Discovery + Delivery)

Kick off parallel Discovery (iteration N+1) and Delivery (iteration N) tracks.

**Commands**:
```bash
# Start Discovery track for Iteration 2
/project:flow-discovery-track 2

# Start Delivery track for Iteration 1
/project:flow-delivery-track 1

# Monitor dual-track synchronization
/project:flow-iteration-dual-track 1
```

**Dual-Track Cadence**:
- **Discovery Track**: Works 1 iteration ahead, prepares backlog for Iteration N+1
- **Delivery Track**: Implements Iteration N, delivers working software
- **Synchronization**: Weekly handoff from Discovery to Delivery (Definition of Ready)

**Track Coordination**:
- **Discovery Team**: Requirements Analyst, Product Owner, Domain Experts
- **Delivery Team**: Developers, Testers, Component Owners
- **Shared Resources**: Architect (design reviews), Security (security reviews), PM (coordination)

**Handoff Points**:
- **Discovery → Delivery**: End of Discovery iteration N → Start of Delivery iteration N
- **Delivery → Operations**: End of Delivery iteration N → Deploy to staging/production

**Output**: Dual-Track Kickoff Report
```markdown
# Dual-Track Workflow Kickoff Report

**Project**: {project-name}
**Date**: {date}

## Track Status

### Discovery Track (Iteration 2)
- Status: {STARTED | NOT STARTED}
- Focus: Prepare backlog for Iteration 2
- Work Items: {count} items in Discovery
- Target Completion: {date}

### Delivery Track (Iteration 1)
- Status: {STARTED | NOT STARTED}
- Focus: Deliver Iteration 1 work items
- Work Items: {count} items in Delivery
- Target Completion: {date}

## Team Allocation

**Discovery Team**:
- Requirements Analyst: {name}
- Product Owner: {name}
- Domain Experts: {names}

**Delivery Team**:
- Developers: {names}
- Testers: {names}
- Component Owners: {names}

**Shared Resources**:
- Software Architect: {name}
- Security Architect: {name}
- Project Manager: {name}

## Synchronization

**Handoff Cadence**: Weekly (end of iteration)
**Handoff Checklist**: Definition of Ready (DoR)
**Lead Time**: Discovery 1 iteration ahead of Delivery

## Dual-Track Metrics

- Lead Time Alignment: {status}
- Ready Backlog Size: {ratio}x capacity
- Gate Pass Rate: {percentage}% (target: >90%)
- Defect Leakage: {percentage}% (target: <10%)

**Dual-Track Status**: {OPERATIONAL | NOT READY}
```

### Step 6: Monitor Architectural Stability

Track architectural changes during Construction to ensure architecture remains stable.

**Commands**:
```bash
# Review architectural changes
git log --grep="ADR" --since="1 month ago"
git diff --stat elaboration-baseline..HEAD analysis-design/

# Check for architecture drift
ls analysis-design/architecture-decision-record-*.md

# Validate component boundaries not violated
# Use static analysis tools or manual code review
```

**Architecture Stability Metrics**:
- **Architectural Change Rate**: % of architectural changes (target: <10% during Construction)
- **ADR Frequency**: Number of ADRs created per iteration (high frequency = instability)
- **Component Boundary Violations**: Code violations of layering/modularity (target: 0)
- **Prototype Divergence**: % of prototype code rewritten (target: <30%)

**Architecture Review Triggers**:
- New ADR created (major decision)
- Component boundary change (adding/removing components)
- Technology stack change (switching frameworks, databases)
- Integration change (new external system, API contract change)

**Agents to Coordinate**:
- **Architecture Designer**: Reviews all architectural changes
- **Code Reviewer**: Validates component boundaries during peer review
- **Component Owners**: Report architectural issues to architect

**Output**: Architecture Stability Report
```markdown
# Architecture Stability Report

**Project**: {project-name}
**Phase**: Construction (Iteration {N})
**Date**: {date}

## Baseline Reference
- Architecture Baseline Date: {date}
- Architecture Baseline Version: {version}
- Baseline Tag: `elaboration-baseline-{date}`

## Architectural Changes

**ADRs Created Since ABM**: {count}
{for each ADR}
- **ADR-{ID}**: {title}
  - Impact: {HIGH | MEDIUM | LOW}
  - Reason: {why change needed}
  - Reviewed: {YES | NO}

**Architectural Change Rate**: {percentage}% (target: <10%)

## Component Boundary Validation

**Component Boundary Violations**: {count} (target: 0)
{list violations if any}

## Prototype Divergence

**Prototype Code Retained**: {percentage}%
**Prototype Code Rewritten**: {percentage}% (target: <30%)

**Divergence Reasons**:
{why prototype code was changed}

## Architecture Stability

**Overall Stability**: {STABLE | UNSTABLE}
- Stable: <10% change, 0 violations, <30% divergence
- Unstable: ≥10% change or >0 violations or ≥30% divergence

**Recommendation**:
{continue Construction | conduct architecture review | consider pivot}

**Action Items**:
{list any actions to address instability}
```

### Step 7: Generate Construction Phase Readiness Report

Final report confirming readiness to proceed with full Construction.

**Output**: Construction Phase Readiness Report
```markdown
# Construction Phase Readiness Report

**Project**: {project-name}
**Date**: {date}
**Phase**: Construction Entry

## Overall Status

**Construction Readiness**: {READY | NOT READY}
**Decision**: {PROCEED | DEFER}

## Gate Validation

### 1. Architecture Baseline Milestone (ABM)
- Status: {PASS | FAIL}
- Evidence: ABM review conducted {date}

### 2. Iteration 0 (Infrastructure)
- Status: {COMPLETE | INCOMPLETE}
- Evidence: CI/CD operational, environments ready

### 3. Development Process
- Status: {READY | NOT READY}
- Evidence: Team trained, process documented

### 4. Iteration Planning
- Status: {COMPLETE | INCOMPLETE}
- Evidence: First 2 iterations planned

### 5. Dual-Track Workflow
- Status: {OPERATIONAL | NOT READY}
- Evidence: Discovery and Delivery tracks started

### 6. Architecture Stability
- Status: {STABLE | UNSTABLE}
- Evidence: <10% architectural change

## Team Readiness

**Team Size**: {count} (scaled from {elaboration-count})
**Training Completion**: {percentage}%
**Onboarding Status**: {count} new members onboarded

## Infrastructure Readiness

**CI/CD Pipeline**: {OPERATIONAL}
**Environments**: Dev {READY}, Test {READY}, Staging {READY}
**Monitoring**: {OPERATIONAL}
**Collaboration Tools**: {CONFIGURED}

## Backlog Readiness

**Ready Backlog Size**: {story-points} ({ratio}x capacity)
**DoR Compliance**: {percentage}%
**First 2 Iterations**: {PLANNED}

## Decision

**Construction Readiness**: {READY | NOT READY}

**Rationale**:
{detailed reasoning}

## Next Steps

**If READY**:
- [ ] Kick off Iteration 1: {start-date}
- [ ] Discovery track for Iteration 2: {start-date}
- [ ] First iteration planning meeting: {date}
- [ ] Daily standups begin: {date}

**If NOT READY**:
- [ ] Complete missing criteria: {list}
- [ ] Re-validate readiness: {date}
- [ ] Notify stakeholders of delay

## Success Metrics

**Track During Construction**:
- Velocity: Story points delivered per iteration
- Quality: Defect density, test coverage
- Schedule: On-time delivery percentage
- Scope: Feature completion percentage

**Target Metrics**:
- Velocity: {baseline-velocity} ±20%
- Test Coverage: ≥80% unit, ≥70% integration
- Defect Density: <1 defect per 1000 LOC
- On-Time Delivery: ≥80%

## References

- Architecture baseline: `elaboration-baseline-{date}`
- Iteration plans: `management/iteration-plan-*.md`
- Development Case: `management/development-case-template.md`
- Dual-track flow: `/project:flow-iteration-dual-track`
```

## Success Criteria

This command succeeds when:
- [ ] Architecture Baseline Milestone validated (ABM complete)
- [ ] Iteration 0 infrastructure setup COMPLETE
- [ ] Development process tailored and team trained
- [ ] First 2 iterations planned with ready backlog
- [ ] Dual-track workflow OPERATIONAL
- [ ] Architecture stability confirmed (<10% change)
- [ ] Construction Phase Readiness Report generated with READY status

## Error Handling

**ABM Not Met**:
- Report: "Elaboration phase incomplete, cannot proceed to Construction"
- Action: "Extend Elaboration: /project:flow-inception-to-elaboration"
- Escalation: "Contact Software Architect and Project Manager"

**Infrastructure Not Ready**:
- Report: "Iteration 0 incomplete, CI/CD or environments not operational"
- Action: "Complete infrastructure setup, re-validate"
- Impact: "Construction cannot start without operational infrastructure"

**Backlog Starved**:
- Report: "Ready backlog size {ratio}x capacity (target: 1.5x-2x)"
- Action: "Accelerate Discovery, simplify requirements"
- Impact: "Delivery team may be blocked waiting for backlog"

**Team Not Trained**:
- Report: "Team training {percentage}% complete (target: 100%)"
- Action: "Complete training sessions, defer Construction start"
- Impact: "Untrained team = higher defect rate, slower velocity"

## Metrics

**Track During Transition**:
- Team scaling time: Days to onboard new team members
- Infrastructure setup time: Days to complete Iteration 0
- Training completion rate: % of team trained on process
- Backlog readiness: Ratio of ready backlog to team capacity

## References

- Gate criteria: `flows/gate-criteria-by-phase.md`
- Iteration planning: `management/iteration-plan-template.md`
- Development Case: `management/development-case-template.md`
- Dual-track flow: `commands/flow-iteration-dual-track.md`
- Discovery track: `commands/flow-discovery-track.md`
- Delivery track: `commands/flow-delivery-track.md`
