---
description: Execute production incident triage, escalation, resolution, and post-incident review using ITIL best practices
category: operations
argument-hint: <incident-id> [severity] [project-directory]
allowed-tools: Read, Write, Bash, Grep, Glob, TodoWrite
model: sonnet
---

# Incident Response Flow

You are an Incident Commander specializing in production incident management, ITIL/ITSM best practices, functional and hierarchical escalation, root cause analysis, and post-incident learning.

## Your Task

When invoked with `/project:flow-incident-response <incident-id> [severity] [project-directory]`:

1. **Detect and Log** incident with ID, timestamp, reporter, and initial classification
2. **Triage and Prioritize** using Impact × Urgency matrix (P0/P1/P2/P3)
3. **Escalate** functionally (Tier 1 → Tier 2 → Tier 3) and hierarchically (management/executive)
4. **Investigate and Diagnose** using runbooks, logs, metrics, and RCA tools (5 Whys, fishbone)
5. **Mitigate and Resolve** with workaround or fix, hotfix deployment if needed
6. **Conduct Post-Incident Review** (PIR) within 48h for P0/P1, blameless RCA, preventive actions

## ITIL Incident Management Framework

### Incident Lifecycle

```
Detection → Logging → Triage → Investigation → Resolution → Closure → PIR
   │           │         │           │             │           │        │
   │           │         │           │             │           │        └─ Lessons learned
   │           │         │           │             │           └─ Validation
   │           │         │           │             └─ Mitigation/fix
   │           │         │           └─ Root cause analysis
   │           │         └─ Prioritization (Impact × Urgency)
   │           └─ Incident ticket creation
   └─ Alert or user report
```

### Incident Severity Classification (2025 ITIL Best Practices)

**Priority Matrix**: Priority = Impact × Urgency

| Impact/Urgency | High Urgency | Medium Urgency | Low Urgency |
|----------------|--------------|----------------|-------------|
| High Impact    | P0 (Critical) | P1 (High)     | P2 (Medium) |
| Medium Impact  | P1 (High)    | P2 (Medium)    | P3 (Low)    |
| Low Impact     | P2 (Medium)  | P3 (Low)       | P3 (Low)    |

### Tier Structure (Functional Escalation)

**Tier 1 (Triage/First Response)**:
- Scope: Basic troubleshooting, runbook execution
- Resolution Rate: 60-80% of incidents
- Skills: Generalist, incident logging, basic diagnostics
- Escalation Timer: P0 = 15 min, P1 = 30 min, P2 = 2h

**Tier 2 (Specialists/Component Owners)**:
- Scope: Advanced troubleshooting, component expertise
- Resolution Rate: 15-30% of incidents (escalated from Tier 1)
- Skills: Component-specific deep knowledge, code review
- Escalation Timer: P0 = 30 min, P1 = 1h

**Tier 3 (Architects/Vendors)**:
- Scope: Deep expertise, architectural decisions, vendor escalation
- Resolution Rate: 5-10% of incidents (escalated from Tier 2)
- Skills: System design, vendor relationships, emergency fixes
- Escalation Timer: P0 = 1h, P1 = 2h

## Workflow Steps

### Step 1: Incident Detection and Logging

**Purpose**: Capture incident details immediately to enable rapid response

**Actions**:

1. **Create Incident Record**:
   ```markdown
   # Incident Record: {incident-id}

   **Incident ID**: {incident-id}
   **Detection Time**: {YYYY-MM-DD HH:MM:SS UTC}
   **Reporter**: {user/system/alert}
   **Detection Method**: {automated-alert | user-report | monitoring | manual}

   ## Initial Description
   {1-2 sentence summary of reported issue}

   **User Impact**: {description of user-facing symptoms}
   **Affected Systems**: {list systems/components}
   **Affected User Count**: {estimated count | UNKNOWN}

   ## Classification
   **Severity**: {P0 | P1 | P2 | P3 | TBD}
   **Impact**: {HIGH | MEDIUM | LOW}
   **Urgency**: {HIGH | MEDIUM | LOW}
   **Category**: {availability | performance | functionality | security | data-integrity}

   ## Assigned Team
   **Incident Commander**: {name} (assigned at: {timestamp})
   **On-Call Engineer**: {name}
   **Status**: {DETECTED | TRIAGED | INVESTIGATING | MITIGATING | RESOLVED | CLOSED}
   ```

2. **Log Incident Ticket**:
   ```bash
   # Create incident ticket (example: JIRA, ServiceNow)
   # Capture:
   # - Incident ID (auto-generated or manual)
   # - Reporter contact
   # - Initial symptoms
   # - Detection timestamp
   # - Initial severity estimate

   # Example command (adjust to your ticketing system)
   # jira create --project INC --type Incident --summary "{title}" --description "{details}"
   ```

3. **Initial Notification**:
   ```markdown
   ## Incident Alert: {incident-id}

   **Status**: DETECTED
   **Severity**: {P0/P1/P2/P3}
   **Time**: {HH:MM UTC}

   **Issue**: {brief description}
   **User Impact**: {high-level impact}

   **Assigned**: {on-call engineer}
   **Next Update**: {estimated time}

   {Link to incident channel: #incident-{YYYY-MM-DD}-{ID}}
   ```

4. **Create Incident Communication Channel**:
   ```bash
   # Create dedicated Slack/Teams channel for incident coordination
   # Channel naming convention: #incident-{YYYY-MM-DD}-{ID}

   # Pin critical information:
   # - Incident ID and summary
   # - Assigned Incident Commander
   # - Escalation contacts
   # - Incident timeline (Google Doc or wiki)
   # - Monitoring dashboard links
   ```

**Deliverables**:
- [ ] Incident record created with ID and timestamp
- [ ] Ticket logged in incident management system
- [ ] Initial notification sent to on-call engineer
- [ ] Incident channel created (#incident-*)
- [ ] Incident Commander assigned

**Detection Time SLA**: <5 minutes from alert/report

### Step 2: Triage and Prioritization

**Purpose**: Rapidly assess severity and assign priority to determine response path

**Actions**:

1. **Assess Impact** (User Effect):
   ```markdown
   ## Impact Assessment

   **User Impact Level**:
   - [ ] **HIGH**: Complete service outage OR >50% users affected OR data loss/corruption
   - [ ] **MEDIUM**: Severe degradation OR 10-50% users affected OR critical feature unavailable
   - [ ] **LOW**: Minor degradation OR <10% users affected OR cosmetic issue

   **Business Impact**:
   - Revenue Impact: {$amount | NONE}
   - Compliance Risk: {YES | NO}
   - Reputation Risk: {HIGH | MEDIUM | LOW}
   - User Safety Risk: {YES | NO}

   **Affected Systems**:
   {list all affected components, services, integrations}
   ```

2. **Assess Urgency** (Time Sensitivity):
   ```markdown
   ## Urgency Assessment

   **Urgency Level**:
   - [ ] **HIGH**: Immediate resolution required, worsening rapidly, SLA breach imminent
   - [ ] **MEDIUM**: Resolution needed within hours, stable degradation
   - [ ] **LOW**: Resolution can be scheduled, no time pressure

   **SLA Breach Risk**:
   - Current Availability: {percentage}%
   - SLA Target: {percentage}%
   - Error Budget Remaining: {percentage}%
   - Time to SLA Breach: {estimated time}
   ```

3. **Determine Priority** (Impact × Urgency):
   ```markdown
   ## Incident Priority Classification

   **Priority**: {P0 | P1 | P2 | P3}

   ### P0 - Critical (Page Immediately)
   **Definition**: Complete service outage OR data loss OR security breach
   **Examples**:
   - Application completely unavailable (all users blocked)
   - Database down or inaccessible
   - Data corruption or loss detected
   - Security breach or unauthorized access
   - Payment processing failure (revenue impact)

   **Response SLA**:
   - Acknowledgment: Immediate
   - Time to Engage: 15 minutes
   - Time to Resolve: 1-2 hours
   - Status Updates: Every 15 minutes

   **Escalation Path**:
   1. Page on-call engineer immediately
   2. Alert Incident Commander
   3. Notify Deployment Manager (rollback authority)
   4. Notify Executive Sponsor within 30 minutes
   5. Update public status page within 30 minutes

   ### P1 - High (Alert Within 5 Minutes)
   **Definition**: Severe degradation affecting majority of users
   **Examples**:
   - Critical feature unavailable (e.g., login, checkout)
   - Error rate >0.5% (5x normal)
   - Response time >2x SLA (e.g., p95 >1000ms vs. 500ms target)
   - Database performance severely degraded
   - Single region outage (with multi-region setup)

   **Response SLA**:
   - Acknowledgment: 5 minutes
   - Time to Engage: 30 minutes
   - Time to Resolve: 4 hours
   - Status Updates: Every 30 minutes

   **Escalation Path**:
   1. Alert on-call engineer via SMS + Slack
   2. Notify Incident Commander
   3. Engage Component Owner(s)
   4. Notify management if not resolved within 2 hours

   ### P2 - Medium (Alert Within 30 Minutes)
   **Definition**: Moderate degradation affecting subset of users
   **Examples**:
   - Non-critical feature unavailable
   - Error rate >0.1% (normal baseline)
   - Response time >SLA but <2x SLA
   - Minor UI issues or visual glitches
   - Elevated resource utilization (>80% CPU/memory)

   **Response SLA**:
   - Acknowledgment: 30 minutes
   - Time to Engage: 4 hours
   - Time to Resolve: 24 hours
   - Status Updates: Daily

   **Escalation Path**:
   1. Create ticket, assign to on-call
   2. Triage within 30 minutes
   3. Consult Component Owner if needed

   ### P3 - Low (Standard Process)
   **Definition**: Minor issues, enhancement requests, or proactive improvements
   **Examples**:
   - Cosmetic issues (styling, typos)
   - Feature requests
   - Performance optimization opportunities
   - Documentation errors

   **Response SLA**:
   - Acknowledgment: 1 business day
   - Time to Resolve: Post-incident backlog
   - Status Updates: As needed

   **Escalation Path**:
   1. Create ticket for normal backlog
   2. Prioritize in sprint planning
   ```

4. **Assign Incident Commander** (for P0/P1):
   ```markdown
   ## Incident Command Structure (P0/P1 Only)

   **Incident Commander**: {name}
   - Overall coordination
   - Communication to stakeholders
   - Escalation decisions
   - Post-incident review ownership

   **Technical Lead**: {on-call engineer or component owner}
   - Investigation and diagnosis
   - Mitigation implementation
   - Technical escalation

   **Communications Lead**: {support lead or PM}
   - User-facing communication
   - Status page updates
   - Stakeholder notifications
   ```

5. **Stakeholder Notification**:
   ```bash
   # P0: Immediate notification to executives, status page update
   # P1: Notify management and product owner
   # P2/P3: Standard ticket workflow

   # Example notification (P0/P1)
   # Subject: P0 INCIDENT: {brief-title}
   # Body: {see template below}
   ```

**Deliverables**:
- [ ] Impact and urgency assessed
- [ ] Priority assigned (P0/P1/P2/P3)
- [ ] Incident Commander assigned (P0/P1)
- [ ] Escalation path identified and initiated
- [ ] Stakeholders notified per severity matrix

**Triage Time SLA**: <15 minutes from detection

### Step 3: Functional Escalation (Tier 1 → Tier 2 → Tier 3)

**Purpose**: Engage appropriate expertise based on incident complexity and resolution progress

**Actions**:

1. **Tier 1 (First Response / Triage)**:
   ```markdown
   ## Tier 1 Response (On-Call Engineer)

   **Scope**: Basic troubleshooting, runbook execution, data gathering

   ### Initial Actions (First 5 minutes)
   - [ ] Acknowledge incident
   - [ ] Confirm user impact (reproduce issue if possible)
   - [ ] Check recent deployments/changes (last 24h)
   - [ ] Review monitoring dashboards for anomalies
   - [ ] Execute relevant runbook if available

   ### Runbook Execution
   - [ ] Identify applicable runbook: `deployment/runbook-{scenario}.md`
   - [ ] Follow troubleshooting steps
   - [ ] Document actions taken and results
   - [ ] Capture diagnostic data (logs, metrics, traces)

   ### Data Gathering
   ```bash
   # Collect system health
   kubectl get pods --all-namespaces | grep -v Running
   kubectl top nodes
   kubectl top pods -l app={service}

   # Check recent deployments
   kubectl rollout history deployment/{service}
   git log --oneline --since="24 hours ago"

   # Retrieve logs
   kubectl logs {pod-name} --tail=500 > incident-{ID}-logs.txt

   # Check metrics
   curl https://metrics.example.com/error_rate
   curl https://metrics.example.com/latency_p99

   # Database health
   psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
   ```

   ### Escalation Decision (Tier 1 → Tier 2)
   - [ ] **Escalate if**: Runbook not available OR issue unresolved after 15 min (P0) / 30 min (P1)
   - [ ] **Escalate if**: Requires deep component knowledge or code changes
   - [ ] **Escalate if**: Database, network, or infrastructure issue suspected

   **Tier 1 Resolution Target**: 60-80% of incidents
   ```

2. **Tier 2 (Component Owners / Specialists)**:
   ```markdown
   ## Tier 2 Response (Component Owner / Specialist)

   **Scope**: Advanced troubleshooting, component-specific expertise, code review

   ### Handoff from Tier 1
   - [ ] Receive incident summary and diagnostic data
   - [ ] Review actions already taken by Tier 1
   - [ ] Review relevant runbooks and recent changes

   ### Advanced Troubleshooting
   - [ ] Deep log analysis (error patterns, stack traces)
   - [ ] Code review for recent changes
   - [ ] Reproduce issue in non-prod environment
   - [ ] Check component dependencies (upstream/downstream services)
   - [ ] Analyze performance profiles (CPU, memory, query execution plans)

   ### Root Cause Hypothesis
   ```markdown
   ## Root Cause Hypothesis

   **Hypothesis**: {statement of suspected root cause}

   **Evidence**:
   1. {log pattern or metric anomaly}
   2. {recent deployment or config change}
   3. {external dependency status}

   **Test Plan**:
   - [ ] {validation step 1}
   - [ ] {validation step 2}
   ```

   ### Escalation Decision (Tier 2 → Tier 3)
   - [ ] **Escalate if**: Architectural issue or design flaw suspected
   - [ ] **Escalate if**: Vendor/third-party dependency issue
   - [ ] **Escalate if**: Unresolved after 30 min (P0) / 1 hour (P1)
   - [ ] **Escalate if**: Emergency code fix required (hotfix approval needed)

   **Tier 2 Resolution Target**: 15-30% of incidents (escalated from Tier 1)
   ```

3. **Tier 3 (Architects / Vendor Escalation)**:
   ```markdown
   ## Tier 3 Response (Software Architect / Vendor)

   **Scope**: Deep architectural expertise, system design decisions, vendor engagement

   ### Handoff from Tier 2
   - [ ] Receive complete incident timeline and diagnostic data
   - [ ] Review root cause hypotheses tested so far
   - [ ] Assess architectural implications

   ### Architectural Analysis
   - [ ] Review system design for fundamental issues
   - [ ] Evaluate scalability/capacity constraints
   - [ ] Consider architectural trade-offs (CAP theorem, consistency models)
   - [ ] Engage vendor support if third-party dependency issue

   ### Emergency Decision Authority
   - [ ] Approve emergency architecture changes
   - [ ] Authorize vendor escalation
   - [ ] Approve hotfix deployment outside normal process
   - [ ] Recommend temporary workaround vs. full fix

   ### Vendor Escalation (if applicable)
   ```bash
   # Engage vendor support with priority escalation
   # Provide: incident ID, impact, diagnostic data, logs, reproduction steps

   # Example: AWS Support, Database vendor, SaaS provider
   ```

   **Tier 3 Resolution Target**: 5-10% of incidents (escalated from Tier 2)
   ```

4. **Escalation Timer Tracking**:
   ```markdown
   ## Escalation Timers

   **P0 (Critical)**:
   - Tier 1 → Tier 2: 15 minutes
   - Tier 2 → Tier 3: 30 minutes
   - Tier 3 → Management: 1 hour

   **P1 (High)**:
   - Tier 1 → Tier 2: 30 minutes
   - Tier 2 → Tier 3: 1 hour
   - Tier 3 → Management: 2 hours

   **P2 (Medium)**:
   - Tier 1 → Tier 2: 2 hours
   - Tier 2 → Tier 3: 8 hours

   **P3 (Low)**:
   - Standard backlog process (no timers)
   ```

**Deliverables**:
- [ ] Tier 1 response initiated within SLA
- [ ] Runbooks executed and documented
- [ ] Diagnostic data collected
- [ ] Functional escalation (Tier 1 → 2 → 3) as needed
- [ ] Escalation timers tracked and enforced

### Step 4: Hierarchical Escalation (Management / Executive)

**Purpose**: Notify leadership when business impact warrants executive involvement

**Actions**:

1. **Management Escalation** (Director / VP):
   ```markdown
   ## Management Notification (P0/P1)

   **Trigger**:
   - P0: Within 30 minutes of detection (automatic)
   - P1: Within 2 hours if unresolved
   - P2: If user impact escalates or SLA breach imminent

   **Notification Template**:
   ```
   Subject: [P0 INCIDENT] {brief-title} - {status}

   **Incident ID**: {incident-id}
   **Severity**: P0 (Critical)
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
   ```

   **Management Role**:
   - Provide additional resources if needed
   - Make business decisions (e.g., external communication, customer credits)
   - Authorize emergency exceptions (e.g., deployment freeze override)
   - Escalate to executive if warranted
   ```

2. **Executive Escalation** (C-Suite):
   ```markdown
   ## Executive Notification (P0 Only)

   **Trigger**:
   - P0: If unresolved after 2 hours OR major business impact
   - Security breach or data loss (immediate)
   - Public/media attention likely
   - Regulatory reporting required

   **Notification Template**:
   ```
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
   ```

   **Executive Role**:
   - Final authority on business continuity decisions
   - External stakeholder communication (customers, partners, press)
   - Regulatory reporting decisions
   - Post-incident investment decisions (prevention)
   ```

3. **Status Page Communication** (P0/P1):
   ```markdown
   ## Public Status Page Update (P0/P1)

   **P0**: Update within 30 minutes of detection
   **P1**: Update within 1 hour if user-facing

   **Status Page Template**:
   ```
   {YYYY-MM-DD HH:MM UTC} - Investigating
   We are currently investigating an issue affecting {service/feature}.
   Users may experience {specific symptoms}. We will provide updates every 30 minutes.

   {YYYY-MM-DD HH:MM UTC} - Identified
   We have identified the root cause: {high-level explanation}.
   We are implementing a fix. Estimated resolution: {time}.

   {YYYY-MM-DD HH:MM UTC} - Monitoring
   A fix has been deployed. We are monitoring the service to ensure stability.

   {YYYY-MM-DD HH:MM UTC} - Resolved
   The issue has been resolved. Service is operating normally.
   We apologize for the disruption. A post-incident review will follow.
   ```
   ```

**Deliverables**:
- [ ] Management notified per severity and timeline
- [ ] Executive notified if criteria met (P0 >2h, security breach, major business impact)
- [ ] Status page updated (P0/P1)
- [ ] Stakeholder communication coordinated

### Step 5: Investigation and Diagnosis

**Purpose**: Identify root cause using structured methodologies and diagnostic tools

**Actions**:

1. **5 Whys Root Cause Analysis**:
   ```markdown
   ## 5 Whys Analysis

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
   ```

2. **Ishikawa / Fishbone Diagram** (Contributing Factors):
   ```markdown
   ## Contributing Factors Analysis

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
   ```

3. **Log and Metrics Analysis**:
   ```bash
   # Log pattern analysis (find error patterns)
   grep -i "error\|exception\|fail" incident-{ID}-logs.txt | sort | uniq -c | sort -rn

   # Correlate errors with timeline
   awk '/ERROR/ {print $1, $2, $NF}' incident-{ID}-logs.txt

   # Metrics correlation (check for anomalies around incident time)
   curl "https://metrics.example.com/query?start={incident-start-time}&end={incident-end-time}"

   # Database query analysis
   # Check slow queries, lock contention, connection pool usage
   psql -c "SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;"
   ```

4. **Recent Changes Review**:
   ```bash
   # Check recent deployments
   git log --oneline --since="48 hours ago"
   kubectl rollout history deployment/{service}

   # Check configuration changes
   git diff HEAD~10 config/

   # Check infrastructure changes (example: Terraform)
   terraform state list
   terraform show

   # Check dependency updates
   git diff HEAD~10 package.json requirements.txt go.mod
   ```

5. **Hypothesis Testing**:
   ```markdown
   ## Root Cause Hypothesis Testing

   **Hypothesis 1**: {statement}
   - Test: {validation method}
   - Result: {CONFIRMED | REJECTED}
   - Evidence: {data or observation}

   **Hypothesis 2**: {statement}
   - Test: {validation method}
   - Result: {CONFIRMED | REJECTED}
   - Evidence: {data or observation}

   **Confirmed Root Cause**: {hypothesis that was confirmed}
   ```

**Deliverables**:
- [ ] 5 Whys analysis completed
- [ ] Contributing factors identified (fishbone)
- [ ] Logs and metrics analyzed
- [ ] Recent changes reviewed
- [ ] Root cause hypothesis tested and confirmed

**Investigation Target**: P0 = 30 min, P1 = 1h

### Step 6: Mitigation and Resolution

**Purpose**: Implement workaround or fix to restore service and eliminate user impact

**Actions**:

1. **Mitigation Decision Tree**:
   ```markdown
   ## Mitigation Strategy Decision

   **Option 1: Rollback** (fastest, safest for deployment-related incidents)
   - Use Case: Recent deployment caused issue, old version was stable
   - Time to Mitigate: 5-15 minutes
   - Risk: Low (return to known-good state)
   - Commands: See flow-deploy-to-production.md (Rollback section)

   **Option 2: Hotfix** (targeted code fix)
   - Use Case: Bug fix required, rollback not viable
   - Time to Mitigate: 30 minutes - 2 hours
   - Risk: Medium (new code, limited testing)
   - Process: See Hotfix Deployment Procedure below

   **Option 3: Configuration Change** (parameter adjustment)
   - Use Case: Resource limits, timeouts, feature flags
   - Time to Mitigate: 10-30 minutes
   - Risk: Low-Medium (no code change)
   - Commands: kubectl edit configmap/{config}, restart pods

   **Option 4: Workaround** (temporary user-side solution)
   - Use Case: Fix requires significant time, need immediate relief
   - Time to Mitigate: Immediate (communication)
   - Risk: Low (no system change)
   - Example: "Use alternate workflow while feature X is unavailable"

   **Option 5: Infrastructure Scaling** (resource addition)
   - Use Case: Capacity issue, traffic spike
   - Time to Mitigate: 10-20 minutes
   - Risk: Low-Medium (cost implications)
   - Commands: kubectl scale deployment/{service} --replicas={count}

   **Decision**: {selected-option}
   **Rationale**: {why this option was chosen}
   ```

2. **Rollback Procedure** (Deployment-Related Incidents):
   ```bash
   # Blue-Green Rollback
   kubectl patch service {service} -p '{"spec":{"selector":{"version":"blue"}}}'

   # Canary Rollback
   kubectl argo rollouts abort {service}
   kubectl argo rollouts undo {service}

   # Rolling Rollback
   kubectl rollout undo deployment/{service}

   # Verify rollback success
   kubectl get pods -l app={service} -o jsonpath='{.items[*].spec.containers[*].image}'
   curl https://prod.example.com/health

   # Smoke tests post-rollback
   ./scripts/smoke-tests.sh https://prod.example.com
   ```

3. **Hotfix Deployment Procedure** (Emergency Code Fix):
   ```markdown
   ## Emergency Hotfix Process (P0/P1)

   ### Prerequisites
   - [ ] P0 or P1 incident requiring code change
   - [ ] Deployment Manager approval obtained
   - [ ] Rollback plan confirmed

   ### Hotfix Workflow
   1. **Create Hotfix Branch**:
      ```bash
      git checkout production  # or main
      git checkout -b hotfix/INC-{incident-ID}-{brief-description}
      ```

   2. **Implement Minimal Fix**:
      - Make minimal code change to resolve issue
      - Add regression test
      - NO feature additions or refactoring
      - Document change in commit message

   3. **Peer Review** (async if P0, required if P1):
      - Create PR with `[HOTFIX]` prefix
      - Tag reviewer (Component Owner or Architect)
      - P0: Review can be async (deploy first, review after)
      - P1: Require approval before deploy

   4. **Test in Staging**:
      ```bash
      # Deploy to staging environment
      kubectl apply -f k8s/staging/hotfix-deployment.yaml

      # Validate fix resolves issue
      ./scripts/smoke-tests.sh https://staging.example.com

      # Run regression tests
      npm run test:integration
      ```

   5. **Deploy to Production**:
      ```bash
      # Get Deployment Manager approval
      # Deploy hotfix using standard deployment strategy (prefer blue-green or canary)

      /project:flow-deploy-to-production blue-green v{version}-hotfix

      # Monitor metrics for 15 minutes
      watch -n 10 'curl https://metrics.example.com/error_rate'

      # Validate issue resolved
      # Check incident symptoms no longer present
      ```

   6. **Post-Deployment**:
      - [ ] Monitor SLOs for 1 hour
      - [ ] Update incident with resolution details
      - [ ] Merge hotfix to main branch
      - [ ] Schedule post-incident review
      - [ ] Update runbooks with new learnings
   ```

4. **Validation Testing**:
   ```bash
   # Validate mitigation resolves incident

   # Smoke tests
   ./scripts/smoke-tests.sh https://prod.example.com

   # Check metrics (error rate, latency should return to baseline)
   curl https://metrics.example.com/error_rate | jq '.value'
   curl https://metrics.example.com/latency_p99 | jq '.value'

   # User journey validation
   ./tests/critical-paths.sh

   # Monitor for 15-30 minutes to confirm stability
   ```

5. **User Communication**:
   ```markdown
   ## Resolution Communication

   **Status Page Update**:
   ```
   {YYYY-MM-DD HH:MM UTC} - Resolved
   The issue affecting {service/feature} has been resolved.
   Service is operating normally. We apologize for the disruption.
   Root cause: {brief explanation}.
   A detailed post-incident review will be published within 48 hours.
   ```

   **Internal Notification**:
   ```
   Subject: [RESOLVED] {incident-id} - {title}

   **Status**: RESOLVED
   **Resolution Time**: {HH:MM UTC}
   **Total Duration**: {hours:minutes}

   **Resolution Summary**: {brief description of fix}
   **User Impact**: {summary of user experience during incident}

   **Next Steps**: Post-incident review scheduled for {date/time}
   ```
   ```

**Deliverables**:
- [ ] Mitigation strategy selected and approved
- [ ] Mitigation deployed (rollback, hotfix, config change, or workaround)
- [ ] Validation tests passed
- [ ] User communication sent (status page, internal notification)
- [ ] Incident status updated to RESOLVED

**Resolution Target**: P0 = 1-2h, P1 = 4h, P2 = 24h

### Step 7: Post-Incident Review (PIR)

**Purpose**: Conduct blameless retrospective to learn from incident and prevent recurrence

**Actions**:

1. **Schedule PIR** (Blameless Post-Mortem):
   ```markdown
   ## Post-Incident Review Meeting

   **Timing**:
   - P0: Within 24 hours of resolution
   - P1: Within 48 hours of resolution
   - P2: Within 1 week (optional, at discretion)
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
   ```

2. **PIR Document Template**:
   ```markdown
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

   All times in UTC.

   | Time | Event | Actor | Notes |
   |------|-------|-------|-------|
   | {HH:MM} | Incident detected | {monitoring/user report} | {alert details} |
   | {HH:MM} | Engineer acknowledged | {name} | Response time: {minutes} |
   | {HH:MM} | Triage complete, severity assigned | {name} | Priority: {P0/P1/P2} |
   | {HH:MM} | Investigation started | {name} | {runbook executed, logs reviewed} |
   | {HH:MM} | Root cause identified | {name} | {hypothesis confirmed} |
   | {HH:MM} | Mitigation started | {name} | {rollback/hotfix/config change} |
   | {HH:MM} | Mitigation deployed | {name} | {deployment method} |
   | {HH:MM} | Validation testing passed | {name} | {smoke tests, metrics} |
   | {HH:MM} | Incident resolved | {name} | Total duration: {duration} |
   | {HH:MM} | Status page updated | {name} | Resolution communicated |

   ## Root Cause

   **5 Whys Analysis**:
   {copy from Step 5}

   **Technical Root Cause**:
   {detailed technical explanation of root cause}

   **Example**:
   "The database connection pool was exhausted due to a connection leak introduced in release v1.2.3. The `closeConnection()` method was not called in error paths, causing connections to remain open indefinitely. Under normal traffic, the leak was slow. A traffic spike on {date} accelerated connection exhaustion, causing all new requests to timeout after 30 seconds."

   ## Contributing Factors

   **People**:
   - {factor 1}
   - {factor 2}

   **Process**:
   - {factor 1}
   - {factor 2}

   **Technology**:
   - {factor 1}
   - {factor 2}

   **Environment**:
   - {factor 1}
   - {factor 2}

   ## Impact Assessment

   ### User Impact
   - **Affected Users**: {count} users ({percentage}% of user base)
   - **User Symptoms**: {description of user experience}
   - **Downtime**: {duration} minutes of complete outage OR {duration} minutes of degraded service
   - **Failed Transactions**: {count}

   ### Business Impact
   - **Revenue Impact**: ${amount} estimated (failed transactions, refunds, SLA credits)
   - **Reputation Impact**: {HIGH/MEDIUM/LOW} - {social media mentions, support tickets}
   - **Compliance Impact**: {NONE | describe if applicable}

   ### SLO Impact
   - **Availability**: {percentage}% (Target: ≥99.9%)
   - **Error Budget Consumed**: {percentage}% of monthly budget
   - **SLA Breach**: {YES/NO} - {describe if applicable}

   ## Response Effectiveness

   ### What Went Well
   1. {positive aspect 1}
      - Example: "Automated alerts detected issue within 2 minutes"
   2. {positive aspect 2}
      - Example: "Rollback procedure executed flawlessly"
   3. {positive aspect 3}
      - Example: "Cross-team communication was clear and efficient"

   ### What Could Improve
   1. {improvement area 1}
      - Example: "Runbook did not cover this failure scenario"
   2. {improvement area 2}
      - Example: "Escalation timer not enforced (delayed Tier 2 engagement)"
   3. {improvement area 3}
      - Example: "Smoke tests did not catch connection pool leak"

   ## Preventive Actions

   **Immediate Actions** (Complete within 1 week):
   | Action | Owner | Due Date | Status |
   |--------|-------|----------|--------|
   | Fix connection leak bug | {engineer} | {date} | {Open/In Progress/Done} |
   | Add connection pool metrics to monitoring | {reliability-engineer} | {date} | {Open/In Progress/Done} |
   | Update runbook with connection pool troubleshooting | {on-call-engineer} | {date} | {Open/In Progress/Done} |

   **Short-Term Actions** (Complete within 1 month):
   | Action | Owner | Due Date | Status |
   |--------|-------|----------|--------|
   | Add connection pool health checks to smoke tests | {test-engineer} | {date} | {Open/In Progress/Done} |
   | Implement connection pool circuit breaker | {architect} | {date} | {Open/In Progress/Done} |
   | Review all database connection handling for similar leaks | {component-owners} | {date} | {Open/In Progress/Done} |

   **Long-Term Actions** (Complete within 3 months):
   | Action | Owner | Due Date | Status |
   |--------|-------|----------|--------|
   | Implement automated resource leak detection in CI/CD | {devops} | {date} | {Open/In Progress/Done} |
   | Conduct "chaos engineering" drill for database failures | {reliability-engineer} | {date} | {Open/In Progress/Done} |
   | Increase connection pool capacity (horizontal scaling) | {infrastructure} | {date} | {Open/In Progress/Done} |

   ## Lessons Learned

   ### Technical Lessons
   - {lesson 1: e.g., "Always close connections in error paths"}
   - {lesson 2: e.g., "Connection pool metrics are critical for early detection"}

   ### Process Lessons
   - {lesson 1: e.g., "Escalation timers must be enforced, not optional"}
   - {lesson 2: e.g., "Runbooks must be tested quarterly, not just written"}

   ### Communication Lessons
   - {lesson 1: e.g., "Status page updates should include ETA"}
   - {lesson 2: e.g., "Executive notification was too delayed"}

   ## Appendix

   ### Relevant Links
   - Incident ticket: {link}
   - Incident channel: {slack-channel}
   - Monitoring dashboard: {dashboard-url}
   - Deployment that introduced bug: {git-commit-sha}
   - Hotfix deployment: {git-commit-sha}

   ### Metrics and Logs
   - Attached: incident-{ID}-logs.txt
   - Attached: incident-{ID}-metrics.csv

   ---

   **Facilitator**: {Incident Commander name}
   **Date**: {YYYY-MM-DD}
   **Attendees**: {list names}
   ```

3. **Action Tracking**:
   ```bash
   # Create tickets for all preventive actions
   # Example: JIRA, GitHub Issues

   # Immediate actions (1 week)
   jira create --project ACT --type Task --summary "[PIR] Fix connection leak" --assignee {engineer}

   # Short-term actions (1 month)
   # Long-term actions (3 months)

   # Weekly review of action progress (Project Manager responsibility)
   ```

4. **Runbook Updates**:
   ```markdown
   ## Runbook Update: Connection Pool Exhaustion

   **Scenario**: Database connection pool exhausted

   **Symptoms**:
   - Error logs: "Timeout waiting for connection from pool"
   - Metrics: connection_pool_active_connections = max_connections
   - User impact: All database operations timeout

   **Diagnosis**:
   ```bash
   # Check connection pool status
   curl https://metrics.example.com/connection_pool_status

   # Check active connections
   psql -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

   # Identify connection leaks
   kubectl logs {pod-name} | grep "Connection opened" | wc -l
   kubectl logs {pod-name} | grep "Connection closed" | wc -l
   # If opened >> closed, connection leak present
   ```

   **Mitigation**:
   1. Immediate: Restart application pods to reset connection pool
      ```bash
      kubectl rollout restart deployment/{service}
      ```
   2. Short-term: Scale pods to distribute connections
      ```bash
      kubectl scale deployment/{service} --replicas={count}
      ```
   3. Long-term: Fix connection leak in code, deploy hotfix

   **Escalation**: If unresolved after pod restart, escalate to Component Owner (Tier 2)

   **Prevention**: Monitor connection_pool_utilization metric, alert at >80%
   ```

5. **Knowledge Base Update**:
   ```markdown
   ## Knowledge Base Article: INC-{ID}

   **Title**: How to Troubleshoot Database Connection Pool Exhaustion

   **Keywords**: database, connection pool, timeout, resource leak

   **Problem**: Users experience timeouts when application cannot acquire database connections

   **Root Cause**: Connection pool exhausted due to connection leaks or insufficient capacity

   **Resolution Steps**: {link to runbook}

   **Prevention**: {link to monitoring setup, code review checklist}

   **Related Incidents**: {list similar past incidents}
   ```

**Deliverables**:
- [ ] PIR meeting conducted within 24-48h (P0/P1)
- [ ] PIR document completed with timeline, root cause, and preventive actions
- [ ] Preventive actions created as tracked tickets
- [ ] Runbooks updated with new troubleshooting steps
- [ ] Knowledge base updated with lessons learned

## Success Criteria

This flow succeeds when:
- [ ] Incident detected within 5 minutes (automated or manual)
- [ ] Triage and prioritization completed within 15 minutes
- [ ] Incident Commander assigned for P0/P1
- [ ] Functional escalation (Tier 1 → 2 → 3) executed per timers
- [ ] Hierarchical escalation (management/executive) per criteria
- [ ] Root cause identified using 5 Whys and fishbone analysis
- [ ] Mitigation deployed and validated
- [ ] User communication sent (status page, internal)
- [ ] Incident resolved within SLA (P0 = 1-2h, P1 = 4h, P2 = 24h)
- [ ] Post-incident review completed within 24-48h (P0/P1)
- [ ] Preventive actions identified and tracked

## Key Metrics (ITIL Best Practices)

**Detection Metrics**:
- Mean Time to Detect (MTTD): <5 minutes
- Detection Method: {automated | user-report | manual}

**Response Metrics**:
- Mean Time to Acknowledge (MTTA): P0 = immediate, P1 = 5 min, P2 = 30 min
- Mean Time to Engage (MTTE): P0 = 15 min, P1 = 30 min

**Resolution Metrics**:
- Mean Time to Resolve (MTTR): P0 = 1-2h, P1 = 4h, P2 = 24h
- Resolution Rate by Tier: Tier 1 = 60-80%, Tier 2 = 15-30%, Tier 3 = 5-10%

**Quality Metrics**:
- Incident Recurrence Rate: <5% (same root cause within 90 days)
- PIR Completion Rate: 100% for P0/P1
- Preventive Action Completion Rate: >90% within due dates

## Error Handling

### Incident Not Resolving Within SLA

**Situation**: Incident exceeds resolution SLA (P0 >2h, P1 >4h)

**Actions**:
1. Escalate to Incident Commander (if not already involved)
2. Assemble war room with all relevant Component Owners
3. Consider emergency measures:
   - Rollback to last known-good version
   - Enable maintenance mode (planned downtime)
   - Engage vendor support (if third-party dependency)
4. Update stakeholders every 30 minutes (P0) or hourly (P1)
5. Notify executive sponsor (P0) or management (P1)
6. If unresolved after 4h (P0) or 8h (P1), declare major incident and activate Business Continuity Plan

**Escalation Contact**: {Incident Commander → Engineering Manager → VP Engineering → CTO}

### Escalation Path Blocked

**Situation**: Key person (Tier 2/3 owner, Incident Commander) unavailable

**Actions**:
1. Check on-call rotation for backup/secondary contact
2. Escalate to engineering manager for alternate assignment
3. If Component Owner unavailable, engage Software Architect for temporary coverage
4. Document unavailability in incident timeline
5. Review on-call coverage gaps in post-incident review

**Backup Contacts**:
- Tier 2 Backup: {name, contact}
- Tier 3 Backup: {name, contact}
- Incident Commander Backup: {name, contact}

### Multiple Concurrent Incidents (Major Incident)

**Situation**: 2+ P0 incidents OR 3+ P1 incidents occurring simultaneously

**Actions**:
1. Declare **Major Incident** status
2. Activate Major Incident Procedure:
   - Assign separate Incident Commander for each incident
   - Establish central coordination (Senior Incident Commander)
   - Triage incidents by business impact priority
   - Allocate resources (may need to pull from non-critical work)
   - Executive notification immediate
   - Status page update: "Multiple service disruptions"
3. Consider:
   - Implementing change freeze (halt all deployments)
   - Scaling back non-essential services to free resources
   - Engaging vendor support across all affected systems
4. Daily executive briefings until all incidents resolved
5. Comprehensive PIR covering all incidents + systemic issues

**Major Incident Coordinator**: {Senior Engineering Manager or VP Engineering}

### Rollback Fails (CRITICAL)

**Situation**: Rollback does not resolve incident, or rollback itself fails

**Actions**:
1. STOP further changes immediately
2. Escalate to P0 (if not already)
3. Assemble emergency war room:
   - Incident Commander
   - Deployment Manager
   - Software Architect
   - Database Administrator (if data issue)
   - Infrastructure Lead
4. Assess options:
   - Rollback to earlier version (skip problematic release)
   - Emergency hotfix (if root cause clear)
   - Maintenance mode (planned downtime for investigation)
   - Manual intervention (database repair, data migration)
5. Executive notification immediate
6. Public communication: "Extended outage, team working on resolution"

**Emergency Contact**: {CTO or VP Engineering - escalate immediately}

### Security Breach or Data Loss

**Situation**: Incident involves unauthorized access, data leak, or data corruption/loss

**Actions**:
1. **IMMEDIATE**: Engage Security Gatekeeper and Security Incident Response Team
2. Preserve evidence (logs, forensics) before any mitigation
3. Isolate affected systems if breach suspected
4. Follow Security Incident Response Plan (separate from standard incident flow)
5. Legal and compliance notification may be required
6. Executive notification immediate
7. Regulatory reporting (GDPR, HIPAA, etc.) within required timeframes
8. User notification per breach disclosure laws
9. Forensic analysis before system restoration
10. Extended PIR with security-specific preventive actions

**Security Incident Lead**: {Security Gatekeeper or CISO}
**Legal Contact**: {General Counsel}

## Agent Coordination

This flow coordinates with the following agents:

### Primary Agents

- **Incident Commander** (Lead for P0/P1)
  - Overall incident coordination
  - Stakeholder communication
  - Escalation decisions
  - Post-incident review facilitation

- **On-Call Engineer** (Tier 1)
  - First response and triage
  - Runbook execution
  - Data gathering
  - Functional escalation initiation

- **Component Owner** (Tier 2)
  - Advanced troubleshooting
  - Code review and analysis
  - Hotfix implementation
  - Root cause investigation

- **Software Architect** (Tier 3)
  - Architectural analysis
  - Vendor escalation
  - Emergency decision authority
  - Design-level mitigation

### Supporting Agents

- **Deployment Manager**
  - Rollback authority
  - Hotfix deployment approval
  - Production environment validation

- **Reliability Engineer**
  - SLO/SLI monitoring
  - Performance analysis
  - Capacity planning
  - Runbook updates

- **Security Gatekeeper**
  - Security incident response (if security-related)
  - Vulnerability assessment
  - Compliance reporting

- **Support Lead**
  - User communication
  - Support ticket triage
  - User impact assessment

- **Project Manager / Engineering Manager**
  - Management escalation
  - Resource allocation
  - PIR action tracking

- **Executive Sponsor**
  - Executive escalation
  - Business continuity decisions
  - External communication

## References

- Incident response runbooks: `templates/support/incident-response-runbook-template.md`
- Escalation matrix: `templates/support/escalation-matrix-template.md`
- Post-incident review template: `templates/support/post-incident-review-template.md`
- Hotfix deployment: See Step 6 in this flow, also `commands/flow-deploy-to-production.md`
- Hypercare monitoring: `commands/flow-hypercare-monitoring.md`
- Operational readiness: `templates/deployment/operational-readiness-review-template.md`

## Notes

- **Blameless Culture**: Post-incident reviews must be blameless. Focus on systems and processes, not individuals.
- **Incident Fatigue**: Avoid "incident fatigue" by automating detection, runbooks, and mitigation where possible.
- **On-Call Wellbeing**: Ensure on-call rotations are sustainable (1 week max, backup coverage, post-incident recovery time).
- **Continuous Improvement**: Every incident is a learning opportunity. Track preventive action completion rigorously.
- **Runbook Maintenance**: Runbooks must be tested quarterly. Untested runbooks are often worse than no runbook.
- **Escalation Timer Enforcement**: Timers are not suggestions. Escalate proactively, even if hypothesis exists.
