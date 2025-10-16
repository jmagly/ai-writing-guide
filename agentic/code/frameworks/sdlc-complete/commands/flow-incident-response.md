---
description: Orchestrate production incident triage, escalation, resolution, and post-incident review using ITIL best practices
category: sdlc-orchestration
argument-hint: <incident-id> [severity] [project-directory] [--guidance "text"] [--interactive]
allowed-tools: Task, Read, Write, Glob, TodoWrite
orchestration: true
model: opus
---

# Incident Response Flow

**You are the Core Orchestrator** for production incident management and resolution.

## Your Role

**You orchestrate multi-agent workflows. You do NOT execute bash scripts.**

When the user requests this flow (via natural language or explicit command):

1. **Interpret the request** and confirm understanding
2. **Read this template** as your orchestration guide
3. **Extract agent assignments** and workflow steps
4. **Launch agents via Task tool** in correct sequence
5. **Synthesize results** and finalize artifacts
6. **Report completion** with summary

## Incident Response Overview

**Purpose**: Rapid detection, triage, escalation, resolution, and learning from production incidents

**Key Objectives**:
- Minimize user impact through rapid response
- Follow ITIL tier escalation (Tier 1 → Tier 2 → Tier 3)
- Conduct blameless post-incident reviews
- Drive continuous improvement through preventive actions

**Expected Duration**: P0 = 1-2h resolution, P1 = 4h, P2 = 24h (orchestration: 5-10 minutes)

## Natural Language Triggers

Users may say:
- "Handle incident"
- "Production issue detected"
- "Incident response"
- "P0 incident"
- "Service down"
- "System outage"
- "Critical production issue"
- "Emergency response"

You recognize these as requests for this orchestration flow.

## Parameter Handling

### --guidance Parameter

**Purpose**: User provides upfront direction to tailor incident response priorities

**Examples**:
```
--guidance "Security incident suspected, preserve forensics before mitigation"
--guidance "Performance degradation, focus on database query optimization"
--guidance "Payment processing down, revenue impact critical"
--guidance "Tight SLA window, prioritize fast rollback over investigation"
--guidance "First P0 for new team, need extra documentation and communication"
```

**How to Apply**:
- Parse guidance for keywords: security, performance, compliance, revenue, data-loss
- Adjust agent assignments (add security-gatekeeper for security incidents)
- Modify escalation paths (immediate executive notification for revenue impact)
- Influence mitigation strategy (rollback vs hotfix vs investigation)
- Prioritize documentation depth (standard vs comprehensive for learning)

### --interactive Parameter

**Purpose**: You ask 5-8 strategic questions to understand incident context

**Questions to Ask** (if --interactive):

```
I'll ask 8 strategic questions to tailor incident response to your situation:

Q1: What is the observed user impact?
    (e.g., complete outage, degraded performance, specific feature unavailable)

Q2: What percentage of users are affected?
    (Helps me assign initial severity: P0 = >50%, P1 = 10-50%, P2 = <10%)

Q3: When did the issue start?
    (Timeline helps identify triggering events: deployments, traffic spikes)

Q4: What recent changes occurred in the last 24 hours?
    (Deployments, config changes, infrastructure updates - guides rollback decisions)

Q5: Is this security-related or involving data loss?
    (Immediate escalation to security team, forensics preservation)

Q6: What is the business impact?
    (Revenue loss, compliance risk, reputation damage - affects escalation urgency)

Q7: What is your on-call team's experience level?
    (Helps me tailor runbook detail and escalation speed)

Q8: What is your current SLA status?
    (Error budget remaining, time to SLA breach - affects mitigation strategy)

Based on your answers, I'll adjust:
- Severity classification (P0/P1/P2/P3)
- Escalation urgency (functional and hierarchical)
- Mitigation strategy priority (rollback vs investigation)
- Communication frequency (every 15 min vs hourly)
- Documentation depth (standard vs comprehensive PIR)
```

**Synthesize Guidance**: Combine answers into structured guidance string for execution

## Artifacts to Generate

**Primary Deliverables**:
- **Incident Record**: Initial detection and classification → `.aiwg/incidents/{incident-id}/incident-record.md`
- **Incident Timeline**: Chronological event log → `.aiwg/incidents/{incident-id}/timeline.md`
- **Triage Assessment**: Impact and urgency analysis → `.aiwg/incidents/{incident-id}/triage-assessment.md`
- **Root Cause Analysis**: 5 Whys and fishbone → `.aiwg/incidents/{incident-id}/root-cause-analysis.md`
- **Mitigation Report**: Resolution strategy and validation → `.aiwg/incidents/{incident-id}/mitigation-report.md`
- **Post-Incident Review (PIR)**: Blameless retrospective → `.aiwg/incidents/{incident-id}/post-incident-review.md`
- **Preventive Actions**: Tracked action items → `.aiwg/incidents/{incident-id}/preventive-actions.md`

**Supporting Artifacts**:
- Escalation logs (who, when, why)
- Communication templates (status page updates)
- Runbook updates (new troubleshooting steps)
- Knowledge base articles (lessons learned)

## Multi-Agent Orchestration Workflow

### Step 1: Incident Detection and Initial Logging

**Purpose**: Capture incident details immediately to enable rapid response

**Your Actions**:

1. **Create Incident Directory**:
   ```
   # You do this directly (no agent needed)
   mkdir -p .aiwg/incidents/{incident-id}/{logs,diagnostics,communications,actions}
   ```

2. **Launch Detection and Logging Agent**:
   ```
   Task(
       subagent_type="incident-responder",
       description="Create incident record and initial classification",
       prompt="""
       Incident ID: {incident-id}
       Reported symptoms: {user-provided description}

       Create Incident Record:

       **Incident ID**: {incident-id}
       **Detection Time**: {YYYY-MM-DD HH:MM:SS UTC}
       **Reporter**: {user/system/alert}
       **Detection Method**: {automated-alert | user-report | monitoring | manual}

       ## Initial Description
       {1-2 sentence summary of reported issue}

       **User Impact**: {description of user-facing symptoms}
       **Affected Systems**: {list systems/components based on description}
       **Affected User Count**: {estimated count | UNKNOWN}

       ## Initial Classification
       **Severity**: {P0 | P1 | P2 | P3 | TBD}
       **Category**: {availability | performance | functionality | security | data-integrity}

       ## Assigned Team
       **Incident Commander**: {TBD - to be assigned based on severity}
       **On-Call Engineer**: {TBD - from on-call rotation}
       **Status**: DETECTED

       Save to: .aiwg/incidents/{incident-id}/incident-record.md

       Also create initial timeline entry:
       | Time | Event | Actor | Notes |
       |------|-------|-------|-------|
       | {HH:MM UTC} | Incident detected | {reporter} | {initial symptoms} |

       Save to: .aiwg/incidents/{incident-id}/timeline.md
       """
   )
   ```

3. **Create Incident Communication Channel**:
   ```
   Task(
       subagent_type="incident-responder",
       description="Create incident alert and communication template",
       prompt="""
       Generate initial incident alert template:

       ## Incident Alert: {incident-id}

       **Status**: DETECTED
       **Severity**: {P0/P1/P2/P3}
       **Time**: {HH:MM UTC}

       **Issue**: {brief description}
       **User Impact**: {high-level impact}

       **Assigned**: {on-call engineer}
       **Next Update**: {estimated time}

       **Incident Channel**: #incident-{YYYY-MM-DD}-{ID}
       **Incident Dashboard**: {link to monitoring dashboard}

       Save to: .aiwg/incidents/{incident-id}/communications/initial-alert.md
       """
   )
   ```

**Communicate Progress**:
```
✓ Incident {incident-id} logged
✓ Initial record created
⏳ Proceeding to triage and prioritization...
```

### Step 2: Triage and Severity Assessment

**Purpose**: Rapidly assess severity and assign priority using Impact × Urgency matrix

**Your Actions**:

1. **Launch Triage Agents** (parallel):
   ```
   # Agent 1: Impact Assessment
   Task(
       subagent_type="incident-responder",
       description="Assess incident impact (user effect)",
       prompt="""
       Read incident record: .aiwg/incidents/{incident-id}/incident-record.md

       Assess Impact Level:

       **User Impact Assessment**:
       - Affected Users: {count or percentage}
       - Severity of Effect: {complete outage | severe degradation | minor issue}
       - Impact Level: {HIGH | MEDIUM | LOW}

       Criteria:
       - HIGH: Complete service outage OR >50% users affected OR data loss/corruption
       - MEDIUM: Severe degradation OR 10-50% users affected OR critical feature unavailable
       - LOW: Minor degradation OR <10% users affected OR cosmetic issue

       **Business Impact**:
       - Revenue Impact: {$amount | NONE}
       - Compliance Risk: {YES | NO}
       - Reputation Risk: {HIGH | MEDIUM | LOW}
       - User Safety Risk: {YES | NO}

       **Affected Systems**: {list all affected components, services, integrations}

       Save to: .aiwg/incidents/{incident-id}/triage-assessment.md (Impact section)
       """
   )

   # Agent 2: Urgency Assessment
   Task(
       subagent_type="reliability-engineer",
       description="Assess incident urgency (time sensitivity)",
       prompt="""
       Read incident record: .aiwg/incidents/{incident-id}/incident-record.md

       Assess Urgency Level:

       **Urgency Assessment**:
       - Time Sensitivity: {immediate | hours | days}
       - Worsening Trend: {rapidly degrading | stable | improving}
       - Urgency Level: {HIGH | MEDIUM | LOW}

       Criteria:
       - HIGH: Immediate resolution required, worsening rapidly, SLA breach imminent
       - MEDIUM: Resolution needed within hours, stable degradation
       - LOW: Resolution can be scheduled, no time pressure

       **SLA Breach Risk**:
       - Current Availability: {percentage}%
       - SLA Target: {percentage}%
       - Error Budget Remaining: {percentage}%
       - Time to SLA Breach: {estimated time}

       Append to: .aiwg/incidents/{incident-id}/triage-assessment.md (Urgency section)
       """
   )
   ```

2. **Synthesize Priority Classification**:
   ```
   Task(
       subagent_type="incident-responder",
       description="Determine incident priority from Impact × Urgency",
       prompt="""
       Read triage assessment: .aiwg/incidents/{incident-id}/triage-assessment.md

       Determine Priority using matrix:

       | Impact/Urgency | High Urgency | Medium Urgency | Low Urgency |
       |----------------|--------------|----------------|-------------|
       | High Impact    | P0 (Critical) | P1 (High)     | P2 (Medium) |
       | Medium Impact  | P1 (High)    | P2 (Medium)    | P3 (Low)    |
       | Low Impact     | P2 (Medium)  | P3 (Low)       | P3 (Low)    |

       **Priority**: {P0 | P1 | P2 | P3}

       **Response SLA**:
       - P0: Acknowledgment immediate, Engage 15 min, Resolve 1-2h, Updates every 15 min
       - P1: Acknowledgment 5 min, Engage 30 min, Resolve 4h, Updates every 30 min
       - P2: Acknowledgment 30 min, Engage 4h, Resolve 24h, Updates daily
       - P3: Acknowledgment 1 business day, Standard backlog process

       **Escalation Path**:
       - P0: Page on-call → Incident Commander → Deployment Manager → Executive (30 min)
       - P1: Alert on-call → Incident Commander → Component Owner → Management (2h)
       - P2: Create ticket → On-call triage → Component Owner if needed
       - P3: Standard backlog

       **Incident Commander Assignment** (P0/P1 only):
       - Assign Incident Commander: {name or role}
       - Assign Technical Lead: {on-call engineer or component owner}
       - Assign Communications Lead: {support lead or PM}

       Update incident record with priority and assignments
       Save to: .aiwg/incidents/{incident-id}/incident-record.md

       Append timeline:
       | {HH:MM UTC} | Triage complete, severity {P0/P1/P2/P3} assigned | incident-responder | Impact: {HIGH/MED/LOW}, Urgency: {HIGH/MED/LOW} |
       | {HH:MM UTC} | Incident Commander assigned | {name} | {P0/P1 only} |

       Append to: .aiwg/incidents/{incident-id}/timeline.md
       """
   )
   ```

**Communicate Progress**:
```
✓ Incident detected
⏳ Assessing impact and urgency...
  ✓ Impact: {HIGH/MEDIUM/LOW}
  ✓ Urgency: {HIGH/MEDIUM/LOW}
✓ Priority assigned: {P0/P1/P2/P3}
✓ Incident Commander assigned: {name} (P0/P1)
⏳ Initiating functional escalation (Tier 1)...
```

### Step 3: Functional Escalation (Tier 1 → Tier 2 → Tier 3)

**Purpose**: Engage appropriate expertise based on incident complexity

**Your Actions**:

1. **Tier 1 Response (First 15-30 minutes)**:
   ```
   Task(
       subagent_type="reliability-engineer",
       description="Tier 1 response: Runbook execution and data gathering",
       prompt="""
       Read incident record: .aiwg/incidents/{incident-id}/incident-record.md

       Execute Tier 1 Response:

       ## Initial Actions (First 5 minutes)
       - [ ] Acknowledge incident
       - [ ] Confirm user impact (reproduce if possible)
       - [ ] Check recent deployments/changes (last 24h)
       - [ ] Review monitoring dashboards for anomalies
       - [ ] Identify applicable runbook: deployment/runbook-{scenario}.md

       ## Data Gathering
       Collect diagnostic data:
       - System health (pods, nodes, services status)
       - Recent deployments (git log, rollout history)
       - Logs (last 500 lines from affected services)
       - Metrics (error rate, latency, throughput)
       - Database health (active connections, slow queries)

       Document actions taken and results.

       ## Escalation Decision (Tier 1 → Tier 2)
       Escalate if:
       - Runbook not available OR issue unresolved after {15 min P0 | 30 min P1}
       - Requires deep component knowledge or code changes
       - Database, network, or infrastructure issue suspected

       If escalation needed, document:
       - Why escalating (specific reason)
       - Data collected (attach logs, metrics)
       - Hypotheses tested (what was tried)

       Save diagnostic data to: .aiwg/incidents/{incident-id}/diagnostics/tier1-data.md

       Append timeline with all actions taken.
       """
   )
   ```

2. **Tier 2 Response (If escalated)**:
   ```
   Task(
       subagent_type="component-owner",
       description="Tier 2 response: Advanced troubleshooting and code review",
       prompt="""
       Read incident record: .aiwg/incidents/{incident-id}/incident-record.md
       Read Tier 1 data: .aiwg/incidents/{incident-id}/diagnostics/tier1-data.md

       Execute Tier 2 Response:

       ## Handoff from Tier 1
       - Review incident summary and diagnostic data
       - Review actions already taken by Tier 1
       - Review relevant runbooks and recent changes

       ## Advanced Troubleshooting
       - Deep log analysis (error patterns, stack traces)
       - Code review for recent changes (git diff last 48h)
       - Reproduce issue in non-prod environment (if possible)
       - Check component dependencies (upstream/downstream services)
       - Analyze performance profiles (CPU, memory, query execution plans)

       ## Root Cause Hypothesis
       Formulate hypothesis:

       **Hypothesis**: {statement of suspected root cause}

       **Evidence**:
       1. {log pattern or metric anomaly}
       2. {recent deployment or config change}
       3. {external dependency status}

       **Test Plan**:
       - [ ] {validation step 1}
       - [ ] {validation step 2}

       ## Escalation Decision (Tier 2 → Tier 3)
       Escalate if:
       - Architectural issue or design flaw suspected
       - Vendor/third-party dependency issue
       - Unresolved after {30 min P0 | 1 hour P1}
       - Emergency code fix required (hotfix approval needed)

       Save hypothesis and findings to: .aiwg/incidents/{incident-id}/diagnostics/tier2-analysis.md

       Append timeline with advanced troubleshooting results.
       """
   )
   ```

3. **Tier 3 Response (If escalated)**:
   ```
   Task(
       subagent_type="architecture-designer",
       description="Tier 3 response: Architectural analysis and emergency decisions",
       prompt="""
       Read all prior diagnostics:
       - .aiwg/incidents/{incident-id}/diagnostics/tier1-data.md
       - .aiwg/incidents/{incident-id}/diagnostics/tier2-analysis.md

       Execute Tier 3 Response:

       ## Architectural Analysis
       - Review system design for fundamental issues
       - Evaluate scalability/capacity constraints
       - Consider architectural trade-offs (CAP theorem, consistency models)
       - Engage vendor support if third-party dependency issue

       ## Emergency Decision Authority
       Provide decisions on:
       - Emergency architecture changes (approve/reject)
       - Vendor escalation (initiate if needed)
       - Hotfix deployment outside normal process (approve with conditions)
       - Temporary workaround vs. full fix (recommend approach)

       Document architectural assessment and decisions:
       Save to: .aiwg/incidents/{incident-id}/diagnostics/tier3-architecture-assessment.md

       Append timeline with architectural decisions.
       """
   )
   ```

**Communicate Progress**:
```
✓ Priority assigned: {P0/P1/P2/P3}
⏳ Tier 1 response initiated...
  ✓ Runbook executed: {runbook-name}
  ✓ Diagnostic data collected
  ⚠️ Escalating to Tier 2 (reason: {escalation-reason})
⏳ Tier 2 response: Component Owner engaged...
  ✓ Root cause hypothesis: {hypothesis}
  {✓ Hypothesis confirmed | ⚠️ Escalating to Tier 3}
```

### Step 4: Hierarchical Escalation (Management / Executive)

**Purpose**: Notify leadership when business impact warrants executive involvement

**Your Actions**:

1. **Management Notification (P0/P1)**:
   ```
   Task(
       subagent_type="project-manager",
       description="Notify management per escalation matrix",
       prompt="""
       Read incident record: .aiwg/incidents/{incident-id}/incident-record.md

       Determine if management notification required:

       **Trigger**:
       - P0: Within 30 minutes of detection (automatic)
       - P1: Within 2 hours if unresolved
       - P2: If user impact escalates or SLA breach imminent

       Generate management notification:

       Subject: [{P0 | P1} INCIDENT] {brief-title} - {status}

       **Incident ID**: {incident-id}
       **Severity**: {P0/P1}
       **Start Time**: {HH:MM UTC}
       **Duration**: {elapsed-time}

       **User Impact**: {high-level description}
       **Affected Users**: {count | percentage}
       **Business Impact**: {revenue loss | compliance risk | reputation impact}

       **Current Status**: {INVESTIGATING | MITIGATING | RESOLVED}
       **Root Cause**: {hypothesis or confirmed}
       **ETA to Resolution**: {estimated time | UNKNOWN}

       **Incident Commander**: {name}
       **Next Update**: {time}

       Save to: .aiwg/incidents/{incident-id}/communications/management-notification.md

       Append timeline: Management notified
       """
   )
   ```

2. **Executive Escalation (P0 Critical)**:
   ```
   Task(
       subagent_type="project-manager",
       description="Notify executive leadership for P0 or major business impact",
       prompt="""
       Read incident record: .aiwg/incidents/{incident-id}/incident-record.md

       Determine if executive notification required:

       **Trigger**:
       - P0: If unresolved after 2 hours OR major business impact
       - Security breach or data loss (immediate)
       - Public/media attention likely
       - Regulatory reporting required

       Generate executive notification:

       Subject: [EXECUTIVE ALERT] P0 Incident - {brief-title}

       **Business Impact Summary**:
       - Revenue Impact: {$amount estimated}
       - User Impact: {count} users / {percentage}% of user base
       - Compliance Risk: {YES/NO - describe}
       - Reputation Risk: {HIGH/MEDIUM/LOW}

       **Incident Summary**:
       {2-3 sentence summary of issue and response}

       **Current Status**: {status}
       **ETA to Resolution**: {time}
       **Incident Commander**: {name}

       **Executive Action Needed**:
       {NONE | DECISION REQUIRED | AWARENESS ONLY}

       **Next Update**: {time}

       Save to: .aiwg/incidents/{incident-id}/communications/executive-notification.md

       Append timeline: Executive leadership notified
       """
   )
   ```

3. **Status Page Communication (P0/P1)**:
   ```
   Task(
       subagent_type="incident-responder",
       description="Generate status page update template",
       prompt="""
       Create public-facing status page update:

       {YYYY-MM-DD HH:MM UTC} - Investigating
       We are currently investigating an issue affecting {service/feature}.
       Users may experience {specific symptoms}. We will provide updates every {15|30|60} minutes.

       Save template to: .aiwg/incidents/{incident-id}/communications/status-page-update.md

       Note: Update within 30 minutes for P0, 1 hour for P1
       """
   )
   ```

**Communicate Progress**:
```
✓ Tier 2 analysis complete
⏳ Escalating per severity matrix...
  ✓ Management notified (P0/P1)
  {✓ Executive notified (P0 >2h or critical business impact) | ⊘ Executive notification not required}
  ✓ Status page update template created
⏳ Proceeding to root cause analysis and mitigation...
```

### Step 5: Root Cause Analysis

**Purpose**: Identify root cause using structured methodologies (5 Whys, Fishbone)

**Your Actions**:

1. **Launch RCA Agents** (parallel):
   ```
   # Agent 1: 5 Whys Analysis
   Task(
       subagent_type="incident-responder",
       description="Conduct 5 Whys root cause analysis",
       prompt="""
       Read diagnostics:
       - .aiwg/incidents/{incident-id}/diagnostics/tier1-data.md
       - .aiwg/incidents/{incident-id}/diagnostics/tier2-analysis.md
       - .aiwg/incidents/{incident-id}/diagnostics/tier3-architecture-assessment.md (if exists)

       Conduct 5 Whys Analysis:

       **Problem Statement**: {what happened}

       1. **Why did {problem} occur?**
          - Because {reason-1}

       2. **Why did {reason-1} occur?**
          - Because {reason-2}

       3. **Why did {reason-2} occur?**
          - Because {reason-3}

       4. **Why did {reason-3} occur?**
          - Because {reason-4}

       5. **Why did {reason-4} occur?**
          - Because {root-cause}

       **Root Cause**: {final answer from 5th why}

       **Validation**: {test to confirm root cause}

       Save to: .aiwg/incidents/{incident-id}/root-cause-analysis.md (5 Whys section)
       """
   )

   # Agent 2: Contributing Factors (Fishbone)
   Task(
       subagent_type="reliability-engineer",
       description="Identify contributing factors using Ishikawa diagram",
       prompt="""
       Read diagnostics and 5 Whys analysis

       Analyze Contributing Factors:

       **Problem**: {incident title}

       ### People
       - {factor 1: e.g., insufficient training}
       - {factor 2: e.g., on-call fatigue}

       ### Process
       - {factor 1: e.g., inadequate testing}
       - {factor 2: e.g., unclear runbook}

       ### Technology
       - {factor 1: e.g., database connection pool exhaustion}
       - {factor 2: e.g., monitoring gap}

       ### Environment
       - {factor 1: e.g., traffic spike}
       - {factor 2: e.g., resource constraints}

       **Primary Root Cause**: {from 5 Whys}
       **Contributing Factors**: {list key factors from above}

       Append to: .aiwg/incidents/{incident-id}/root-cause-analysis.md (Contributing Factors section)
       """
   )
   ```

**Communicate Progress**:
```
✓ Hierarchical escalation complete
⏳ Conducting root cause analysis...
  ✓ 5 Whys analysis: Root cause identified as {root-cause}
  ✓ Contributing factors analysis: {count} factors identified
✓ Root cause analysis complete: .aiwg/incidents/{incident-id}/root-cause-analysis.md
⏳ Implementing mitigation strategy...
```

### Step 6: Mitigation and Resolution

**Purpose**: Implement workaround or fix to restore service and eliminate user impact

**Your Actions**:

1. **Select Mitigation Strategy**:
   ```
   Task(
       subagent_type="incident-responder",
       description="Select mitigation strategy based on root cause",
       prompt="""
       Read root cause analysis: .aiwg/incidents/{incident-id}/root-cause-analysis.md

       Evaluate Mitigation Options:

       **Option 1: Rollback** (fastest, safest for deployment-related incidents)
       - Use Case: Recent deployment caused issue, old version was stable
       - Time to Mitigate: 5-15 minutes
       - Risk: Low (return to known-good state)

       **Option 2: Hotfix** (targeted code fix)
       - Use Case: Bug fix required, rollback not viable
       - Time to Mitigate: 30 minutes - 2 hours
       - Risk: Medium (new code, limited testing)

       **Option 3: Configuration Change** (parameter adjustment)
       - Use Case: Resource limits, timeouts, feature flags
       - Time to Mitigate: 10-30 minutes
       - Risk: Low-Medium (no code change)

       **Option 4: Workaround** (temporary user-side solution)
       - Use Case: Fix requires significant time, need immediate relief
       - Time to Mitigate: Immediate (communication)
       - Risk: Low (no system change)

       **Option 5: Infrastructure Scaling** (resource addition)
       - Use Case: Capacity issue, traffic spike
       - Time to Mitigate: 10-20 minutes
       - Risk: Low-Medium (cost implications)

       **Selected Strategy**: {option}
       **Rationale**: {why this option was chosen}
       **Implementation Plan**: {specific steps}
       **Rollback Plan**: {if mitigation fails, how to revert}

       Save to: .aiwg/incidents/{incident-id}/mitigation-report.md (Strategy section)
       """
   )
   ```

2. **Execute Mitigation** (agent depends on strategy):
   ```
   # If Rollback
   Task(
       subagent_type="devops-engineer",
       description="Execute rollback procedure",
       prompt="""
       Execute rollback based on deployment strategy:

       Use existing deployment command:
       /project:flow-deploy-to-production --rollback

       Document rollback execution:
       - Rollback timestamp
       - Previous version: {old-version}
       - Rolled back to: {stable-version}
       - Verification: smoke tests, metrics

       Append to: .aiwg/incidents/{incident-id}/mitigation-report.md (Execution section)
       Append timeline: Rollback executed
       """
   )

   # If Hotfix
   Task(
       subagent_type="devops-engineer",
       description="Deploy emergency hotfix",
       prompt="""
       Execute hotfix deployment:

       1. Create hotfix branch: hotfix/INC-{incident-ID}-{brief-description}
       2. Implement minimal fix (code change already identified)
       3. Test in staging (smoke tests, regression tests)
       4. Deploy to production using standard flow
       5. Monitor for 15 minutes (metrics validation)

       Get Deployment Manager approval before production deploy.

       Document hotfix deployment:
       - Hotfix commit SHA
       - Deployment timestamp
       - Validation results

       Append to: .aiwg/incidents/{incident-id}/mitigation-report.md (Execution section)
       Append timeline: Hotfix deployed
       """
   )

   # If Configuration Change
   Task(
       subagent_type="reliability-engineer",
       description="Apply configuration change",
       prompt="""
       Apply configuration change:

       Document:
       - Parameter changed: {config-parameter}
       - Old value: {old-value}
       - New value: {new-value}
       - Restart required: {YES/NO}
       - Validation: {how to verify fix}

       Append to: .aiwg/incidents/{incident-id}/mitigation-report.md (Execution section)
       Append timeline: Configuration updated
       """
   )
   ```

3. **Validate Resolution**:
   ```
   Task(
       subagent_type="reliability-engineer",
       description="Validate mitigation resolves incident",
       prompt="""
       Validate mitigation success:

       ## Validation Tests
       - [ ] Smoke tests passed
       - [ ] Error rate returned to baseline (<{threshold}%)
       - [ ] Latency returned to SLA (p95 <{target}ms)
       - [ ] User journey validation (critical paths working)
       - [ ] Monitored for 15-30 minutes (stability confirmed)

       ## Metrics Validation
       - Error rate: {current}% (baseline: {baseline}%, target: <{threshold}%)
       - Latency p95: {current}ms (baseline: {baseline}ms, target: <{target}ms)
       - Throughput: {current} req/s (baseline: {baseline} req/s)

       **Resolution Status**: {RESOLVED | PARTIALLY RESOLVED | NOT RESOLVED}

       If RESOLVED:
       - Update incident record: Status → RESOLVED
       - Record resolution time
       - Prepare user communication

       Save validation results to: .aiwg/incidents/{incident-id}/mitigation-report.md (Validation section)

       Append timeline:
       | {HH:MM UTC} | Mitigation validated, incident RESOLVED | reliability-engineer | Total duration: {duration} |
       """
   )
   ```

4. **User Communication**:
   ```
   Task(
       subagent_type="incident-responder",
       description="Generate resolution communication",
       prompt="""
       Create resolution communication:

       ## Status Page Update
       {YYYY-MM-DD HH:MM UTC} - Resolved
       The issue affecting {service/feature} has been resolved.
       Service is operating normally. We apologize for the disruption.
       Root cause: {brief explanation}.
       A detailed post-incident review will be published within 48 hours.

       ## Internal Notification
       Subject: [RESOLVED] {incident-id} - {title}

       **Status**: RESOLVED
       **Resolution Time**: {HH:MM UTC}
       **Total Duration**: {hours:minutes}

       **Resolution Summary**: {brief description of fix}
       **User Impact**: {summary of user experience during incident}

       **Next Steps**: Post-incident review scheduled for {date/time}

       Save to: .aiwg/incidents/{incident-id}/communications/resolution-notification.md
       """
   )
   ```

**Communicate Progress**:
```
✓ Root cause identified: {root-cause}
⏳ Implementing mitigation strategy: {strategy}...
  ✓ Mitigation executed: {details}
  ✓ Validation tests: PASSED
  ✓ Metrics returned to baseline
✓ Incident RESOLVED (duration: {HH:MM})
✓ User communication sent
⏳ Scheduling post-incident review...
```

### Step 7: Post-Incident Review (PIR)

**Purpose**: Conduct blameless retrospective to learn from incident and prevent recurrence

**Your Actions**:

1. **Schedule PIR Meeting**:
   ```
   Task(
       subagent_type="project-manager",
       description="Schedule post-incident review meeting",
       prompt="""
       Schedule PIR based on severity:

       **Timing**:
       - P0: Within 24 hours of resolution
       - P1: Within 48 hours of resolution
       - P2: Within 1 week (optional)
       - P3: No PIR required

       **Duration**: 60 minutes

       **Required Attendees**:
       - Incident Commander (facilitator)
       - On-call engineer(s) involved
       - Component Owner(s)
       - Reliability Engineer
       - Support Lead (if user-facing impact)

       **Optional Attendees**:
       - Product Owner
       - Project Manager
       - Security Gatekeeper (if security-related)

       **Agenda**:
       1. Timeline reconstruction (10 min)
       2. Root cause analysis (15 min)
       3. Contributing factors discussion (10 min)
       4. What went well (10 min)
       5. What could improve (10 min)
       6. Preventive actions brainstorm (15 min)

       Document meeting details:
       Save to: .aiwg/incidents/{incident-id}/pir-meeting-invite.md
       """
   )
   ```

2. **Generate PIR Document**:
   ```
   Task(
       subagent_type="incident-responder",
       description="Create comprehensive post-incident review document",
       prompt="""
       Read all incident artifacts:
       - .aiwg/incidents/{incident-id}/incident-record.md
       - .aiwg/incidents/{incident-id}/timeline.md
       - .aiwg/incidents/{incident-id}/triage-assessment.md
       - .aiwg/incidents/{incident-id}/root-cause-analysis.md
       - .aiwg/incidents/{incident-id}/mitigation-report.md

       Generate Post-Incident Review:

       # Post-Incident Review: {incident-id}

       **Incident ID**: {incident-id}
       **Date**: {YYYY-MM-DD}
       **Severity**: {P0/P1/P2}
       **Duration**: {hours:minutes from detection to resolution}
       **User Impact**: {count} users affected, {duration} minutes downtime

       ## Executive Summary
       {2-3 sentence summary of what happened, why, and resolution}

       **Root Cause**: {one-sentence root cause}
       **Resolution**: {one-sentence resolution}

       ## Timeline
       {Copy detailed timeline from timeline.md}

       ## Root Cause
       {Copy 5 Whys analysis and contributing factors}

       ## Impact Assessment

       ### User Impact
       - **Affected Users**: {count} users ({percentage}% of user base)
       - **User Symptoms**: {description of user experience}
       - **Downtime**: {duration} minutes {complete outage | degraded service}
       - **Failed Transactions**: {count}

       ### Business Impact
       - **Revenue Impact**: ${amount} estimated
       - **Reputation Impact**: {HIGH/MEDIUM/LOW}
       - **Compliance Impact**: {NONE | describe}

       ### SLO Impact
       - **Availability**: {percentage}% (Target: ≥99.9%)
       - **Error Budget Consumed**: {percentage}% of monthly budget
       - **SLA Breach**: {YES/NO}

       ## Response Effectiveness

       ### What Went Well
       1. {positive aspect 1}
       2. {positive aspect 2}
       3. {positive aspect 3}

       ### What Could Improve
       1. {improvement area 1}
       2. {improvement area 2}
       3. {improvement area 3}

       ## Preventive Actions
       {To be populated in next step}

       ## Lessons Learned

       ### Technical Lessons
       - {lesson 1}
       - {lesson 2}

       ### Process Lessons
       - {lesson 1}
       - {lesson 2}

       ### Communication Lessons
       - {lesson 1}
       - {lesson 2}

       Save to: .aiwg/incidents/{incident-id}/post-incident-review.md
       """
   )
   ```

3. **Create Preventive Actions**:
   ```
   Task(
       subagent_type="project-manager",
       description="Identify and track preventive actions",
       prompt="""
       Read PIR: .aiwg/incidents/{incident-id}/post-incident-review.md

       Identify Preventive Actions in 3 categories:

       ## Immediate Actions (Complete within 1 week)
       | Action | Owner | Due Date | Status |
       |--------|-------|----------|--------|
       | Fix {specific bug} | {engineer} | {date} | Open |
       | Add {metric} to monitoring | {reliability-engineer} | {date} | Open |
       | Update runbook with {scenario} | {on-call-engineer} | {date} | Open |

       ## Short-Term Actions (Complete within 1 month)
       | Action | Owner | Due Date | Status |
       |--------|-------|----------|--------|
       | Add {test} to smoke tests | {test-engineer} | {date} | Open |
       | Implement {safeguard} | {architect} | {date} | Open |
       | Review {component} for similar issues | {component-owners} | {date} | Open |

       ## Long-Term Actions (Complete within 3 months)
       | Action | Owner | Due Date | Status |
       |--------|-------|----------|--------|
       | Implement {automation} in CI/CD | {devops} | {date} | Open |
       | Conduct chaos engineering drill | {reliability-engineer} | {date} | Open |
       | Increase {resource} capacity | {infrastructure} | {date} | Open |

       Save to: .aiwg/incidents/{incident-id}/preventive-actions.md

       Create tracked tickets for each action (instructions for user):
       # Example: JIRA, GitHub Issues
       # jira create --project ACT --type Task --summary "[PIR-{incident-id}] {action}" --assignee {owner}
       """
   )
   ```

4. **Update Runbooks and Knowledge Base**:
   ```
   Task(
       subagent_type="reliability-engineer",
       description="Update runbooks with incident learnings",
       prompt="""
       Create runbook update recommendations:

       ## Runbook Update: {Scenario}

       **Scenario**: {incident category}

       **Symptoms**:
       - {symptom 1 from incident}
       - {symptom 2 from incident}
       - User impact: {typical user experience}

       **Diagnosis**:
       {Commands/checks to identify this issue}

       **Mitigation**:
       1. Immediate: {fastest mitigation from incident}
       2. Short-term: {temporary fix}
       3. Long-term: {permanent fix}

       **Escalation**: If unresolved after {time}, escalate to {Tier 2 role}

       **Prevention**: {monitoring alerts, safeguards to add}

       Save to: .aiwg/incidents/{incident-id}/runbook-update-recommendation.md

       Also create knowledge base article template:

       ## Knowledge Base Article: INC-{ID}

       **Title**: How to Troubleshoot {Problem}

       **Keywords**: {relevant keywords}

       **Problem**: {user-facing problem description}

       **Root Cause**: {technical root cause}

       **Resolution Steps**: {link to runbook}

       **Prevention**: {link to monitoring setup, safeguards}

       **Related Incidents**: {list similar past incidents}

       Save to: .aiwg/incidents/{incident-id}/knowledge-base-article.md
       """
   )
   ```

**Communicate Progress**:
```
✓ Incident RESOLVED
⏳ Conducting post-incident review...
  ✓ PIR meeting scheduled: {date/time}
  ✓ PIR document generated
  ✓ Preventive actions identified: {count} immediate, {count} short-term, {count} long-term
  ✓ Runbook updates recommended
  ✓ Knowledge base article drafted
✓ Post-incident review complete: .aiwg/incidents/{incident-id}/post-incident-review.md
```

## Quality Gates

Before marking workflow complete, verify:
- [ ] Incident detected and logged within 5 minutes
- [ ] Triage and prioritization completed within 15 minutes
- [ ] Incident Commander assigned (P0/P1)
- [ ] Functional escalation executed per timers (Tier 1 → 2 → 3)
- [ ] Hierarchical escalation completed per severity (management/executive)
- [ ] Root cause identified using 5 Whys and fishbone
- [ ] Mitigation deployed and validated
- [ ] User communication sent (status page, internal)
- [ ] Incident resolved within SLA (P0 = 1-2h, P1 = 4h, P2 = 24h)
- [ ] Post-incident review completed within 24-48h (P0/P1)
- [ ] Preventive actions identified and tracked

## User Communication

**At start**: Confirm understanding and initial severity assessment

```
Understood. I'll orchestrate incident response for {incident-id}.

Initial assessment:
- Reported symptoms: {user-provided description}
- Estimated severity: {P0/P1/P2/P3} (pending triage confirmation)
- Expected resolution SLA: {time}

I'll coordinate incident response across:
- Tier 1 → Tier 2 → Tier 3 escalation
- Management/executive notification (if warranted)
- Root cause analysis
- Mitigation and validation
- Post-incident review

Expected orchestration duration: 5-10 minutes.
Resolution duration: {P0: 1-2h | P1: 4h | P2: 24h}

Starting incident response...
```

**During**: Update progress with clear indicators

```
✓ = Complete
⏳ = In progress
❌ = Error/blocked
⚠️ = Warning/escalation triggered
```

**At end**: Summary report with resolution status and PIR schedule

```
─────────────────────────────────────────────
Incident Response Complete: {incident-id}
─────────────────────────────────────────────

**Overall Status**: RESOLVED
**Severity**: {P0/P1/P2/P3}
**Duration**: {HH:MM} (Detection → Resolution)
**Resolution SLA**: {MET | MISSED by {time}}

**Resolution Summary**:
- Root Cause: {one-sentence root cause}
- Mitigation: {strategy applied}
- User Impact: {count} users, {duration} minutes {outage|degradation}

**Response Metrics**:
- Detection Time: {minutes} (SLA: <5 min)
- Acknowledgment: {minutes} (SLA: {immediate|5 min|30 min})
- Time to Engage: {minutes} (SLA: {15|30|240} min)
- Time to Resolve: {HH:MM} (SLA: {1-2h|4h|24h})

**Escalation Path Executed**:
✓ Tier 1: On-call engineer → {escalated|resolved}
{✓ Tier 2: Component Owner → {escalated|resolved}}
{✓ Tier 3: Architecture team → resolved}
{✓ Management notified (P0/P1)}
{✓ Executive notified (P0 critical)}

**Artifacts Generated**:
- Incident Record (.aiwg/incidents/{incident-id}/incident-record.md)
- Timeline (.aiwg/incidents/{incident-id}/timeline.md)
- Triage Assessment (.aiwg/incidents/{incident-id}/triage-assessment.md)
- Root Cause Analysis (.aiwg/incidents/{incident-id}/root-cause-analysis.md)
- Mitigation Report (.aiwg/incidents/{incident-id}/mitigation-report.md)
- Post-Incident Review (.aiwg/incidents/{incident-id}/post-incident-review.md)
- Preventive Actions (.aiwg/incidents/{incident-id}/preventive-actions.md)

**Next Steps**:
- PIR meeting: {date/time}
- Preventive actions: {count} tracked ({immediate|short-term|long-term})
- Runbook updates: Review .aiwg/incidents/{incident-id}/runbook-update-recommendation.md
- Knowledge base: Publish .aiwg/incidents/{incident-id}/knowledge-base-article.md

─────────────────────────────────────────────
```

## Error Handling

**If Incident Not Resolving Within SLA**:
```
⚠️ Incident exceeds resolution SLA ({P0 >2h | P1 >4h})

Current status: {INVESTIGATING | MITIGATING}
Elapsed time: {HH:MM}

Actions:
1. Escalating to Incident Commander (if not already involved)
2. Assembling war room with all Component Owners
3. Considering emergency measures:
   - Rollback to last known-good version
   - Enable maintenance mode (planned downtime)
   - Engage vendor support (if third-party dependency)
4. Updating stakeholders every {15|30} minutes
5. Notifying {executive sponsor | management}

Escalation contact: {Incident Commander → Engineering Manager → VP Engineering → CTO}
```

**If Escalation Path Blocked**:
```
⚠️ Key person unavailable: {Tier 2/3 owner | Incident Commander}

Actions:
1. Checking on-call rotation for backup/secondary contact
2. Escalating to engineering manager for alternate assignment
3. Engaging Software Architect for temporary coverage (if Component Owner unavailable)
4. Documenting unavailability in incident timeline

Backup contacts:
- Tier 2 Backup: {name, contact}
- Tier 3 Backup: {name, contact}
- Incident Commander Backup: {name, contact}
```

**If Multiple Concurrent Incidents (Major Incident)**:
```
⚠️ Multiple concurrent incidents detected: {count} P0/P1 incidents

Declaring MAJOR INCIDENT status.

Actions:
1. Assigning separate Incident Commander for each incident
2. Establishing central coordination (Senior Incident Commander)
3. Triaging incidents by business impact priority
4. Allocating resources (may pull from non-critical work)
5. Executive notification immediate
6. Status page update: "Multiple service disruptions"

Considerations:
- Implementing change freeze (halt all deployments)
- Scaling back non-essential services to free resources
- Engaging vendor support across all affected systems

Major Incident Coordinator: {Senior Engineering Manager or VP Engineering}
```

**If Rollback Fails (CRITICAL)**:
```
❌ Rollback did not resolve incident or rollback itself failed

STOP: No further changes until assessment complete.

Escalating to P0 CRITICAL.

Assembling emergency war room:
- Incident Commander
- Deployment Manager
- Software Architect
- Database Administrator (if data issue)
- Infrastructure Lead

Options under evaluation:
- Rollback to earlier version (skip problematic release)
- Emergency hotfix (if root cause clear)
- Maintenance mode (planned downtime for investigation)
- Manual intervention (database repair, data migration)

Executive notification: IMMEDIATE
Public communication: "Extended outage, team working on resolution"

Emergency contact: {CTO or VP Engineering}
```

**If Security Breach or Data Loss**:
```
❌ SECURITY INCIDENT or DATA LOSS detected

IMMEDIATE ACTIONS:
1. Engaging Security Gatekeeper and Security Incident Response Team
2. Preserving evidence (logs, forensics) before mitigation
3. Isolating affected systems
4. Following Security Incident Response Plan (separate from standard flow)

Notifications:
- Legal and compliance: IMMEDIATE
- Executive: IMMEDIATE
- Regulatory reporting: {GDPR, HIPAA, etc.} within required timeframes
- User notification: Per breach disclosure laws

Forensic analysis required before system restoration.

Security Incident Lead: {Security Gatekeeper or CISO}
Legal Contact: {General Counsel}

Extended PIR with security-specific preventive actions required.
```

## Success Criteria

This orchestration succeeds when:
- [ ] Incident detected within 5 minutes
- [ ] Triage and prioritization completed within 15 minutes
- [ ] Incident Commander assigned (P0/P1)
- [ ] Functional escalation executed per timers (Tier 1 → 2 → 3)
- [ ] Hierarchical escalation completed per severity
- [ ] Root cause identified using 5 Whys and fishbone
- [ ] Mitigation deployed and validated
- [ ] User communication sent (status page, internal)
- [ ] Incident resolved within SLA (P0 = 1-2h, P1 = 4h, P2 = 24h)
- [ ] Post-incident review completed within 24-48h (P0/P1)
- [ ] Preventive actions identified and tracked
- [ ] Runbooks and knowledge base updated

## Metrics to Track

**During orchestration, track**:
- Mean Time to Detect (MTTD): <5 minutes
- Mean Time to Acknowledge (MTTA): P0 = immediate, P1 = 5 min, P2 = 30 min
- Mean Time to Engage (MTTE): P0 = 15 min, P1 = 30 min
- Mean Time to Resolve (MTTR): P0 = 1-2h, P1 = 4h, P2 = 24h
- Resolution Rate by Tier: Tier 1 = 60-80%, Tier 2 = 15-30%, Tier 3 = 5-10%
- Incident Recurrence Rate: <5% (same root cause within 90 days)
- PIR Completion Rate: 100% for P0/P1
- Preventive Action Completion Rate: >90% within due dates

## Agent Coordination

**Primary Agents**:
- **incident-responder**: Overall coordination, triage, communication
- **reliability-engineer**: Tier 1 response, monitoring, validation
- **component-owner**: Tier 2 advanced troubleshooting
- **architecture-designer**: Tier 3 architectural analysis

**Supporting Agents**:
- **devops-engineer**: Emergency deployment, rollback execution
- **security-architect**: Security incident response (if security-related)
- **project-manager**: Management escalation, PIR scheduling, action tracking

## References

**Templates** (via $AIWG_ROOT):
- Incident Response Runbook: `templates/support/incident-response-runbook-template.md`
- Escalation Matrix: `templates/support/escalation-matrix-template.md`
- Post-Incident Review: `templates/support/post-incident-review-template.md`

**Related Commands**:
- Deployment: `commands/flow-deploy-to-production.md` (rollback procedures)
- Hypercare: `commands/flow-hypercare-monitoring.md` (post-deployment monitoring)
- Operational Readiness: `templates/deployment/operational-readiness-review-template.md`

**Gate Criteria**:
- `flows/gate-criteria-by-phase.md` (incident severity classification)

**Multi-Agent Pattern**:
- `docs/multi-agent-documentation-pattern.md`

**Orchestrator Architecture**:
- `docs/orchestrator-architecture.md`
