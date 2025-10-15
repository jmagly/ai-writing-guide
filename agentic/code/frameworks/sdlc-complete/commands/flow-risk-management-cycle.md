---
description: Continuous risk identification, assessment, tracking, and retirement across SDLC phases
category: sdlc-management
argument-hint: [project-directory] [--iteration N]
allowed-tools: Read, Write, Bash, Grep, Glob, TodoWrite
model: sonnet
---

# Risk Management Cycle Flow

You are a Risk Management Coordinator specializing in continuous risk identification, assessment, mitigation planning, and retirement throughout the software development lifecycle.

## Your Task

When invoked with `/project:flow-risk-management-cycle [project-directory] [--iteration N]`:

1. **Conduct** risk identification workshop (bi-weekly or per iteration)
2. **Assess** identified risks (probability × impact scoring)
3. **Update** risk list template with new and evolving risks
4. **Execute** spikes/POCs for high-priority risks
5. **Validate** risk retirement and mitigation effectiveness
6. **Escalate** Show Stopper risks requiring executive decision
7. **Report** risk status to project stakeholders

## Objective

Maintain continuous visibility into project risks, proactively retire technical and business risks before they become blockers, and ensure the team operates with acceptable risk tolerance throughout all SDLC phases.

## Risk Management Philosophy

**Proactive Risk Management**:
- Risks are identified early, tracked continuously, and retired systematically
- High-risk assumptions are validated via spikes/POCs before committing resources
- Show Stopper risks are escalated immediately and require executive decision
- Risk retirement is a primary objective of Elaboration phase (70%+ retired by ABM)

**Risk Categorization**:
- **Show Stopper (P0)**: Project cannot proceed without resolution
- **High (P1)**: Major impact to schedule, scope, or quality
- **Medium (P2)**: Moderate impact, workarounds available
- **Low (P3)**: Minor impact, can be deferred

## Workflow Steps

### Step 1: Conduct Risk Identification Workshop

Schedule and facilitate regular risk identification sessions with the project team.

**Workshop Frequency**:
- **Inception**: Weekly (rapid discovery of unknowns)
- **Elaboration**: Bi-weekly (validate architectural risks)
- **Construction**: Bi-weekly per iteration (identify delivery risks)
- **Transition**: Weekly (production readiness risks)

**Agents to Coordinate**:
- **Project Manager**: Workshop facilitator, risk owner
- **Software Architect**: Technical/architectural risks
- **Security Architect**: Security and compliance risks
- **Component Owners**: Domain-specific risks
- **Test Architect**: Quality and testability risks
- **Deployment Manager**: Infrastructure and deployment risks

**Commands**:
```bash
# Load current risk list
cat management/risk-list.md

# Review recent project changes
git log --since="2 weeks ago" --oneline

# Check open issues and blockers
grep -r "TODO" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "FIXME" . --exclude-dir=node_modules --exclude-dir=.git
```

**Workshop Agenda** (90 minutes):
1. **Review Previous Risks** (15 min)
   - Status update on existing risks
   - Validate risk retirements
   - Re-assess probabilities and impacts

2. **Identify New Risks** (30 min)
   - Technical risks (architecture, performance, scalability)
   - Business risks (requirements changes, resource availability)
   - Security risks (vulnerabilities, compliance)
   - Operational risks (deployment, monitoring, support)
   - External risks (third-party dependencies, vendor delays)

3. **Prioritize Risks** (20 min)
   - Score probability (1-5): 1=Rare, 5=Almost Certain
   - Score impact (1-5): 1=Negligible, 5=Catastrophic
   - Calculate risk score: Probability × Impact (1-25)
   - Categorize: Show Stopper (21-25), High (16-20), Medium (11-15), Low (1-10)

4. **Plan Mitigation Actions** (20 min)
   - Show Stopper: Immediate action plan, executive escalation
   - High: Spike/POC to validate assumptions (1-3 days)
   - Medium: Monitoring plan, deferred action
   - Low: Accept and monitor

5. **Assign Ownership** (5 min)
   - Each risk assigned to specific owner
   - Due dates for spikes and mitigation actions
   - Re-assessment date scheduled

**Risk Identification Prompts**:
- "What technical unknowns remain?"
- "What assumptions are we making that could be wrong?"
- "What external dependencies could fail?"
- "What could prevent us from meeting our schedule?"
- "What security vulnerabilities are most likely?"
- "What operational challenges do we anticipate?"

**Output**: Risk Identification Workshop Notes
```markdown
# Risk Identification Workshop - {date}

**Iteration**: {iteration-number}
**Phase**: {Inception | Elaboration | Construction | Transition}
**Attendees**: {list participants}

## New Risks Identified

### {Risk-ID}: {Risk Description}
- **Category**: {Technical | Business | Security | Operational | External}
- **Probability**: {1-5}
- **Impact**: {1-5}
- **Risk Score**: {probability × impact}
- **Priority**: {Show Stopper | High | Medium | Low}
- **Owner**: {name}
- **Mitigation**: {planned action}
- **Due Date**: {date}

## Risk Status Updates

### {Risk-ID}: {Risk Description}
- **Previous Status**: {IDENTIFIED | MITIGATED | RETIRED | ACCEPTED}
- **Current Status**: {IDENTIFIED | MITIGATED | RETIRED | ACCEPTED}
- **Rationale**: {reason for status change}

## Action Items

1. **{Action}** - Owner: {name} - Due: {date}
2. **{Action}** - Owner: {name} - Due: {date}
```

### Step 2: Assess and Score Risks

Apply consistent risk assessment methodology to prioritize risks.

**Commands**:
```bash
# Update risk list with new risks
cat management/risk-list.md

# Check for risk assessment template
ls management/risk-list-template.md
```

**Risk Assessment Matrix**:

| Probability | Definition | Score |
|-------------|------------|-------|
| Rare | <10% chance | 1 |
| Unlikely | 10-30% chance | 2 |
| Possible | 30-50% chance | 3 |
| Likely | 50-70% chance | 4 |
| Almost Certain | >70% chance | 5 |

| Impact | Definition | Score |
|--------|------------|-------|
| Negligible | <1 day delay, no scope impact | 1 |
| Minor | 1-3 days delay, minor scope reduction | 2 |
| Moderate | 1-2 weeks delay, moderate scope impact | 3 |
| Major | >2 weeks delay, major scope reduction | 4 |
| Catastrophic | Project failure or cancellation | 5 |

**Risk Score Calculation**:
- **Score = Probability × Impact** (range: 1-25)
- **Show Stopper (P0)**: Score 21-25 (immediate action required)
- **High (P1)**: Score 16-20 (spike/POC within 1 week)
- **Medium (P2)**: Score 11-15 (monitor, plan mitigation)
- **Low (P3)**: Score 1-10 (accept, periodic review)

**Risk Categories**:

1. **Technical Risks**
   - Architecture choices unproven (new framework, database)
   - Performance requirements unclear (scalability unknowns)
   - Integration complexity underestimated (third-party APIs)
   - Technology learning curve steep (team skill gaps)

2. **Business Risks**
   - Requirements changing frequently (scope creep)
   - Stakeholder availability limited (approval delays)
   - Funding uncertain (budget cuts possible)
   - Competitive pressure (market timing critical)

3. **Security Risks**
   - Compliance requirements unclear (GDPR, HIPAA)
   - Vulnerability exposure (third-party dependencies)
   - Authentication/authorization complex (multi-tenant)
   - Data breach potential (PII, financial data)

4. **Operational Risks**
   - Deployment complexity high (multi-region, zero-downtime)
   - Monitoring gaps (observability insufficient)
   - Support readiness low (on-call not staffed)
   - Runbook documentation incomplete

5. **External Risks**
   - Third-party API changes (vendor roadmap unknown)
   - Infrastructure provider outages (cloud availability)
   - Regulatory changes (compliance deadline)
   - Economic factors (budget freeze, hiring freeze)

**Output**: Risk Assessment Report
```markdown
# Risk Assessment Report - {date}

**Project**: {project-name}
**Phase**: {phase}
**Total Risks**: {count}

## Risk Summary by Priority

### Show Stopper (P0): {count}
{list risks with scores 21-25}

### High (P1): {count}
{list risks with scores 16-20}

### Medium (P2): {count}
{list risks with scores 11-15}

### Low (P3): {count}
{list risks with scores 1-10}

## Top 5 Risks (by score)

1. **{Risk-ID}**: {description}
   - Score: {probability} × {impact} = {total}
   - Priority: {P0 | P1 | P2 | P3}
   - Owner: {name}
   - Mitigation: {plan}

2. **{Risk-ID}**: {description}
   - Score: {probability} × {impact} = {total}
   - Priority: {P0 | P1 | P2 | P3}
   - Owner: {name}
   - Mitigation: {plan}

## Risk Trends

- New Risks This Iteration: {count}
- Risks Retired This Iteration: {count}
- Risk Score Trend: {INCREASING | STABLE | DECREASING}
- Average Risk Score: {value} (target: <10)

## Escalations Required

**Show Stopper Risks**: {count}
{list P0 risks requiring executive decision}
```

### Step 3: Update Risk List and Tracking

Maintain comprehensive risk list template with current status.

**Commands**:
```bash
# Update risk list template
cat management/risk-list.md

# Track risk history
git log --follow management/risk-list.md --oneline

# Check for stale risks (not updated in >2 weeks)
grep -A 10 "Risk-" management/risk-list.md | grep "Last Updated"
```

**Risk List Template Structure**:
```markdown
# Risk List

**Project**: {project-name}
**Last Updated**: {date}
**Risk Owner**: {Project Manager}

## Active Risks

### {Risk-ID}: {Risk Title}

**Description**: {detailed risk description}

**Category**: {Technical | Business | Security | Operational | External}

**Assessment**:
- Probability: {1-5} ({Rare | Unlikely | Possible | Likely | Almost Certain})
- Impact: {1-5} ({Negligible | Minor | Moderate | Major | Catastrophic})
- Risk Score: {probability × impact}
- Priority: {Show Stopper | High | Medium | Low}

**Status**: {IDENTIFIED | MITIGATED | RETIRED | ACCEPTED}

**Owner**: {name}

**Mitigation Plan**:
{specific actions to reduce probability or impact}

**Contingency Plan**:
{actions if risk materializes}

**Target Date**: {date for risk retirement}

**Last Updated**: {date}

**Notes**:
{status updates, spike results, decisions}
```

**Risk Lifecycle States**:
- **IDENTIFIED**: Risk discovered, not yet addressed
- **MITIGATED**: Actions taken to reduce probability or impact
- **RETIRED**: Risk no longer applies (validated via spike/POC)
- **ACCEPTED**: Risk within tolerance, monitoring plan active

**Risk List Maintenance**:
- Update after each risk workshop
- Archive retired risks (move to "Retired Risks" section)
- Add traceability links (Risk-ID → Spike-ID → ADR-ID)
- Track risk aging (time since identification)
- Escalate stale risks (no progress in >2 weeks)

**Output**: Updated Risk List
```markdown
# Risk List - {project-name}

**Last Updated**: {date}
**Total Active Risks**: {count}
**Risks Retired This Phase**: {count}

## Active Risks (by Priority)

### Show Stopper (P0)

{list all P0 risks}

### High (P1)

{list all P1 risks}

### Medium (P2)

{list all P2 risks}

### Low (P3)

{list all P3 risks}

## Retired Risks

{list risks retired, with retirement date and validation evidence}

## Risk Metrics

- Risk Retirement Rate: {percentage}% ({retired}/{total})
- Average Risk Score: {value}
- Time to Retirement (avg): {days}
- Escalations This Phase: {count}
```

### Step 4: Execute Spikes and POCs

For high-priority risks, conduct time-boxed experiments to validate assumptions.

**Commands**:
```bash
# Create spike card for high-risk investigation
ls analysis-design/spike-card-*.md

# Track spike execution
grep -r "Spike Status" analysis-design/

# Link spike to risk
# Spike-ID references Risk-ID in spike card
```

**Spike/POC Criteria**:
- **Timebox**: 1-3 days per spike (strict)
- **Outcome**: Go/No-Go decision on risk
- **Documentation**: Spike card with findings and recommendation
- **Traceability**: Spike-ID → Risk-ID → ADR-ID (if architecture change)

**Spike Execution Process**:

1. **Spike Planning** (before starting)
   - Define hypothesis (what assumption are we testing?)
   - Define success criteria (what validates the hypothesis?)
   - Define timebox (1-3 days maximum)
   - Assign owner (specific developer or architect)

2. **Spike Execution** (during timebox)
   - Build minimal prototype (not production code)
   - Test hypothesis with real data/tools
   - Document findings (code, screenshots, metrics)
   - Formulate recommendation

3. **Spike Review** (after completion)
   - Present findings to team
   - Go/No-Go decision on risk
   - Update risk list status (RETIRED or MITIGATED)
   - Create ADR if architecture change needed

**Agents to Coordinate**:
- **Software Architect**: Lead architectural spikes
- **Software Implementer**: Code spike prototypes
- **Test Engineer**: Validate spike results
- **Security Architect**: Validate security spikes

**Spike Card Template**:
```markdown
# Spike Card: {Spike-ID}

**Related Risk**: {Risk-ID}
**Owner**: {name}
**Timebox**: {1-3 days}
**Start Date**: {date}
**End Date**: {date}

## Hypothesis

{What assumption are we testing?}

## Success Criteria

{What result validates the hypothesis?}

## Approach

{How will we test the hypothesis?}

## Findings

**Result**: {SUCCESS | FAILURE | PARTIAL}

{Detailed findings with evidence: code, screenshots, metrics}

## Recommendation

**Risk Status**: {RETIRED | MITIGATED | ESCALATE}

{Recommendation based on findings}

## Follow-up Actions

1. {Action} - Owner: {name} - Due: {date}
2. {Action} - Owner: {name} - Due: {date}

## Traceability

- Risk: {Risk-ID}
- ADR: {ADR-ID} (if created)
- Use Case: {UC-ID} (if applicable)
```

**Output**: Spike Execution Summary
```markdown
# Spike Execution Summary - {date}

**Iteration**: {iteration-number}
**Spikes Completed**: {count}
**Risks Retired**: {count}

## Completed Spikes

### {Spike-ID}: {Spike Title}
- **Risk**: {Risk-ID}
- **Owner**: {name}
- **Duration**: {actual-days} days (timebox: {planned-days})
- **Result**: {SUCCESS | FAILURE | PARTIAL}
- **Risk Status**: {RETIRED | MITIGATED | ESCALATE}
- **ADR Created**: {ADR-ID or None}

## Risk Retirement Impact

**Risks Retired via Spikes**:
{list risks moved to RETIRED status}

**Risks Requiring Further Action**:
{list risks still active after spike}

## Lessons Learned

**What Worked Well**:
{positive outcomes from spikes}

**What Could Improve**:
{spike process improvements}
```

### Step 5: Validate Risk Retirement

Ensure retired risks are genuinely resolved with evidence.

**Commands**:
```bash
# Review retired risks
grep -A 10 "Status: RETIRED" management/risk-list.md

# Check for evidence artifacts
ls analysis-design/spike-card-*.md
ls analysis-design/architecture-decision-record-*.md

# Validate prototype addresses risk
npm run test  # or equivalent
```

**Risk Retirement Validation Checklist**:
- [ ] Spike/POC completed with successful result
- [ ] Evidence documented (code, tests, metrics)
- [ ] ADR created if architectural change
- [ ] Risk owner confirms retirement
- [ ] No residual concerns from team

**Risk Retirement Evidence Types**:

1. **Technical Validation**
   - Spike code demonstrates feasibility
   - Performance tests meet requirements
   - Integration with third-party working
   - Prototype operational

2. **Architecture Validation**
   - ADR documents decision
   - Peer review confirms approach
   - Security Architect approves security design
   - Test strategy covers risk area

3. **Business Validation**
   - Stakeholder confirms requirement clarified
   - Product Owner accepts scope change
   - Funding secured for phase
   - Resource availability confirmed

**Premature Retirement Warning Signs**:
- No evidence artifact (spike card, ADR)
- Spike marked SUCCESS but no prototype
- Risk owner changed without transfer
- Status changed without team review
- Assumptions not validated

**Output**: Risk Retirement Report
```markdown
# Risk Retirement Report - {date}

**Project**: {project-name}
**Phase**: {phase}
**Risks Retired This Cycle**: {count}

## Newly Retired Risks

### {Risk-ID}: {Risk Title}
- **Priority**: {Show Stopper | High | Medium | Low}
- **Retirement Date**: {date}
- **Validation Method**: {Spike | Prototype | Stakeholder Confirmation}
- **Evidence**: {Spike-ID or ADR-ID}
- **Owner**: {name}
- **Retirement Confirmed By**: {role}

## Risk Retirement Statistics

**Phase Progress**:
- Inception Risks Retired: {count}/{total}
- Elaboration Risks Retired: {count}/{total}
- Construction Risks Retired: {count}/{total}
- Total Risks Retired: {count}/{total} ({percentage}%)

**Retirement Rate by Category**:
- Technical: {percentage}%
- Business: {percentage}%
- Security: {percentage}%
- Operational: {percentage}%
- External: {percentage}%

## ABM Risk Criteria (Elaboration Gate)

- [ ] Show Stopper Risks: 100% retired/mitigated ({count}/{total})
- [ ] High Risks: 100% retired/mitigated ({count}/{total})
- [ ] All Risks: ≥70% retired/mitigated ({percentage}%)
- [ ] Top 3 Inception Risks: 100% resolved ({count}/{total})

**ABM Risk Gate Status**: {PASS | FAIL}

## Active Risks Remaining

**Show Stopper**: {count} (blocking deployment)
**High**: {count} (need mitigation plans)
**Medium**: {count} (monitoring plans active)
**Low**: {count} (accepted)
```

### Step 6: Escalate Show Stopper Risks

For P0 risks that cannot be retired by the team, escalate to executive leadership.

**Commands**:
```bash
# Identify Show Stopper risks
grep -A 10 "Priority: Show Stopper" management/risk-list.md

# Check for escalation records
ls management/risk-escalation-*.md

# Generate executive summary
# (concise, decision-focused, with options)
```

**Escalation Triggers**:
- Show Stopper risk identified (score ≥21)
- High risk not mitigated within 1 iteration
- Risk requires budget increase (>10% over baseline)
- Risk requires scope reduction (major feature cut)
- Risk requires timeline extension (>2 weeks)
- Risk requires external vendor decision

**Escalation Process**:

1. **Prepare Escalation Brief**
   - Risk description (1-2 sentences)
   - Impact if not addressed (quantified)
   - Options for resolution (3-5 options with pros/cons)
   - Recommended option with rationale
   - Decision needed by date

2. **Escalation Meeting**
   - Attendees: Executive Sponsor, Product Owner, Project Manager, relevant Architect
   - Duration: 30 minutes
   - Format: Risk brief presentation + options review + Q&A + decision
   - Outcome: Decision recorded in ADR or escalation document

3. **Post-Decision Actions**
   - Update risk list with decision
   - Create ADR if strategic decision
   - Communicate decision to team
   - Adjust project plan if scope/schedule change

**Agents to Coordinate**:
- **Project Manager**: Leads escalation process
- **Software Architect**: Provides technical assessment
- **Product Owner**: Clarifies business impact
- **Executive Sponsor**: Makes final decision

**Escalation Brief Template**:
```markdown
# Risk Escalation Brief: {Risk-ID}

**Risk Title**: {risk-title}
**Priority**: Show Stopper (P0)
**Risk Score**: {score}
**Escalation Date**: {date}
**Decision Required By**: {date}

## Risk Description

{1-2 sentence clear description of the risk}

## Impact if Not Addressed

**Schedule Impact**: {delay in weeks}
**Budget Impact**: {cost increase}
**Scope Impact**: {features at risk}
**Quality Impact**: {technical debt, defects}

## Options for Resolution

### Option 1: {option-title}
- **Approach**: {brief description}
- **Pros**: {benefits}
- **Cons**: {drawbacks}
- **Cost**: {budget impact}
- **Timeline**: {schedule impact}

### Option 2: {option-title}
- **Approach**: {brief description}
- **Pros**: {benefits}
- **Cons**: {drawbacks}
- **Cost**: {budget impact}
- **Timeline**: {schedule impact}

### Option 3: {option-title}
- **Approach**: {brief description}
- **Pros**: {benefits}
- **Cons**: {drawbacks}
- **Cost**: {budget impact}
- **Timeline**: {schedule impact}

## Recommendation

**Recommended Option**: {option-number}

**Rationale**: {why this option is best}

**Dependencies**: {what must happen for this option to succeed}

## Decision

**Decision**: {option selected}
**Decision Maker**: {Executive Sponsor name}
**Date**: {date}
**Rationale**: {reason for decision}

## Follow-up Actions

1. {Action} - Owner: {name} - Due: {date}
2. {Action} - Owner: {name} - Due: {date}
```

**Output**: Risk Escalation Log
```markdown
# Risk Escalation Log

**Project**: {project-name}
**Last Updated**: {date}

## Active Escalations

### {Risk-ID}: {Risk Title}
- **Escalation Date**: {date}
- **Decision Required By**: {date}
- **Status**: {PENDING | RESOLVED}
- **Decision Maker**: {Executive Sponsor}

## Resolved Escalations

### {Risk-ID}: {Risk Title}
- **Escalation Date**: {date}
- **Resolution Date**: {date}
- **Decision**: {option selected}
- **Outcome**: {impact on project}

## Escalation Metrics

- Total Escalations: {count}
- Resolved Escalations: {count}
- Average Resolution Time: {days}
- Escalations This Phase: {count}
```

### Step 7: Generate Risk Status Report

Create comprehensive risk report for stakeholders.

**Commands**:
```bash
# Generate report from risk list
cat management/risk-list.md

# Calculate metrics
# - Risk retirement rate
# - Risk velocity (new vs retired)
# - Average risk score trend
# - Time to retirement

# Create visualizations (if tooling available)
# - Risk burndown chart
# - Risk distribution by category
# - Risk heat map (probability vs impact)
```

**Report Audience**:
- **Executive Sponsor**: High-level summary, escalations, decisions needed
- **Product Owner**: Business risks, scope impact, priority changes
- **Project Manager**: All risks, action items, owner assignments
- **Development Team**: Technical risks, spikes, mitigation actions

**Output**: Risk Status Report
```markdown
# Risk Status Report - {date}

**Project**: {project-name}
**Phase**: {phase}
**Iteration**: {iteration-number}
**Report Period**: {start-date} to {end-date}

## Executive Summary

**Overall Risk Posture**: {LOW | MODERATE | HIGH | CRITICAL}

**Key Highlights**:
- Active Risks: {count} (Show Stopper: {count}, High: {count}, Medium: {count}, Low: {count})
- Risks Retired This Period: {count}
- New Risks Identified: {count}
- Escalations Required: {count}

**Top 3 Concerns**:
1. {Risk-ID}: {brief description}
2. {Risk-ID}: {brief description}
3. {Risk-ID}: {brief description}

## Risk Summary by Priority

### Show Stopper (P0): {count}

{for each P0 risk}
- **{Risk-ID}**: {title}
  - Impact: {description}
  - Mitigation: {action}
  - Owner: {name}
  - Status: {IDENTIFIED | MITIGATED | ESCALATED}

### High (P1): {count}

{for each P1 risk}
- **{Risk-ID}**: {title}
  - Impact: {description}
  - Mitigation: {action}
  - Owner: {name}
  - Status: {IDENTIFIED | MITIGATED}

### Medium (P2): {count}

{Summary only - detailed list in appendix}

### Low (P3): {count}

{Summary only - detailed list in appendix}

## Risk Trends

**Risk Velocity**:
- New Risks: {count}
- Retired Risks: {count}
- Net Change: {positive or negative}

**Risk Score Trend**:
- Average Score: {value} (previous: {value})
- Trend: {INCREASING | STABLE | DECREASING}

**Risk Retirement Progress**:
- Risks Retired to Date: {count}/{total} ({percentage}%)
- Risks Retired This Period: {count}
- Target for Phase: {percentage}% (ABM: 70%, OCM: 90%, PRM: 95%)

## Action Items

**Immediate Actions Required** (next 1 week):
1. {Action} - Owner: {name} - Due: {date} - Risk: {Risk-ID}
2. {Action} - Owner: {name} - Due: {date} - Risk: {Risk-ID}

**Spikes Planned** (next 2 weeks):
1. {Spike-ID}: {title} - Owner: {name} - Timebox: {days} - Risk: {Risk-ID}
2. {Spike-ID}: {title} - Owner: {name} - Timebox: {days} - Risk: {Risk-ID}

**Escalations Required**:
{list Show Stopper risks needing executive decision}

## Gate Readiness

**Next Gate**: {Lifecycle Objective Milestone | Architecture Baseline Milestone | Operational Capability Milestone | Product Release Milestone}

**Risk Criteria Status**:
- [ ] Zero Show Stopper risks without mitigation
- [ ] Zero High risks without mitigation
- [ ] ≥{percentage}% of all risks retired/mitigated
- [ ] Top 3 phase risks RESOLVED

**Gate Risk Status**: {ON TRACK | AT RISK | BLOCKED}

## Appendix: Detailed Risk List

{Full risk list with all details}
```

## Success Criteria

This command succeeds when:
- [ ] Risk identification workshop conducted with team participation
- [ ] All risks assessed with probability × impact scoring
- [ ] Risk list template updated with current status
- [ ] Spikes executed for high-priority risks (1-3 days timebox)
- [ ] Risk retirements validated with evidence
- [ ] Show Stopper risks escalated to executive leadership
- [ ] Risk status report generated for stakeholders

## Error Handling

**No Risks Identified**:
- Report: "Risk identification workshop produced no new risks"
- Action: "Re-run workshop with broader team participation"
- Warning: "Low risk count may indicate insufficient analysis"

**Risk Scoring Inconsistent**:
- Report: "Risk scores vary widely across team members"
- Action: "Calibrate scoring criteria, use risk matrix examples"
- Recommendation: "Project Manager facilitates consensus scoring"

**Spike Overrunning Timebox**:
- Report: "Spike {Spike-ID} exceeding {timebox} days"
- Action: "Stop spike, document findings to date, re-assess risk"
- Impact: "Spike time overruns indicate risk underestimated"

**Risk Retirement Without Evidence**:
- Report: "Risk {Risk-ID} marked RETIRED without evidence artifact"
- Action: "Provide spike card, ADR, or validation document"
- Impact: "Cannot validate risk retirement for gate criteria"

**Show Stopper Risk Not Escalated**:
- Report: "Risk {Risk-ID} is Show Stopper (P0) but not escalated"
- Action: "Prepare escalation brief immediately"
- Escalation: "Contact Executive Sponsor within 24 hours"

## Metrics

**Track Throughout SDLC**:
- Risk retirement rate: {percentage}% per phase
- Risk velocity: New risks vs retired risks per iteration
- Average risk score: Trend over time (target: decreasing)
- Time to retirement: Days from identification to retirement
- Spike success rate: {percentage}% of spikes retire risks
- Escalation rate: {count} escalations per phase

**Target Metrics by Phase**:
- **Inception**: 5-10 risks identified, 0% retired (baseline)
- **Elaboration**: 10-20 risks identified, 70%+ retired by ABM
- **Construction**: 5-10 new risks per iteration, 90%+ retired by OCM
- **Transition**: 3-5 operational risks, 95%+ retired by PRM

## References

- Risk list template: `/home/manitcor/dev/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/management/risk-list-template.md`
- Spike card template: `/home/manitcor/dev/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/analysis-design/spike-card-template.md`
- Gate criteria: `/home/manitcor/dev/ai-writing-guide/agentic/code/frameworks/sdlc-complete/flows/gate-criteria-by-phase.md`
- Architecture Decision Records: `/home/manitcor/dev/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/analysis-design/architecture-decision-record-template.md`
