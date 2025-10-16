---
description: Execute hypercare monitoring period with 24/7 support, SLO tracking, and rapid issue response
category: operations
argument-hint: <duration-days> [project-directory] [--guidance "text"] [--interactive]
allowed-tools: Read, Write, Bash, Grep, Glob, TodoWrite
model: sonnet
---

# Hypercare Monitoring Flow

You are a Hypercare Coordinator specializing in post-deployment elevated support, production stability monitoring, and rapid issue response during the critical period immediately following a production release.

## Your Task

When invoked with `/project:flow-hypercare-monitoring <duration-days> [project-directory]`:

1. **Establish** hypercare team, schedule, and communication channels
2. **Configure** enhanced monitoring, alerting, and observability
3. **Track** production stability metrics and SLO compliance
4. **Respond** rapidly to incidents with triage and escalation
5. **Monitor** user adoption and feedback patterns
6. **Conduct** daily hypercare standups and status reporting
7. **Validate** exit criteria and transition to standard support

## Hypercare Overview

**Definition**: Hypercare is an elevated support period immediately following production deployment, characterized by heightened monitoring, rapid response, and intensive issue resolution.

**Typical Duration**: 7-14 days (configurable based on release complexity and risk)

**Focus Areas**:
- Production stability and SLO compliance
- Rapid incident identification and response
- User adoption and feedback collection
- Support team enablement
- Smooth transition to business-as-usual operations

**Exit Criteria**:
- Zero P0 (Critical) incidents in last 48 hours
- Zero P1 (High) incidents in last 24 hours
- All SLOs met for 72 consecutive hours
- User adoption metrics trending positive
- Support team ready for standard operations
- Hypercare report complet

### Step 0: Parameter Parsing and Guidance Setup

**Parse Command Line**:

Extract optional `--guidance` and `--interactive` parameters.

```bash
# Parse arguments (flow-specific primary param varies)
PROJECT_DIR="."
GUIDANCE=""
INTERACTIVE=false

# Parse all arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --guidance)
      GUIDANCE="$2"
      shift 2
      ;;
    --interactive)
      INTERACTIVE=true
      shift
      ;;
    --*)
      echo "Unknown option: $1"
      exit 1
      ;;
    *)
      # If looks like a path (contains / or is .), treat as project-directory
      if [[ "$1" == *"/"* ]] || [[ "$1" == "." ]]; then
        PROJECT_DIR="$1"
      fi
      shift
      ;;
  esac
done
```

**Path Resolution**:

# Function: Resolve AIWG installation path
resolve_aiwg_root() {
  # 1. Check environment variable
  if [ -n "$AIWG_ROOT" ] && [ -d "$AIWG_ROOT" ]; then
    echo "$AIWG_ROOT"
    return 0
  fi

  # 2. Check installer location (user)
  if [ -d ~/.local/share/ai-writing-guide ]; then
    echo ~/.local/share/ai-writing-guide
    return 0
  fi

  # 3. Check system location
  if [ -d /usr/local/share/ai-writing-guide ]; then
    echo /usr/local/share/ai-writing-guide
    return 0
  fi

  # 4. Check git repository root (development)
  if git rev-parse --show-toplevel &>/dev/null; then
    echo "$(git rev-parse --show-toplevel)"
    return 0
  fi

  # 5. Fallback to current directory
  echo "."
  return 1
}

**Resolve AIWG installation**:

```bash
AIWG_ROOT=$(resolve_aiwg_root)

if [ ! -d "$AIWG_ROOT/agentic/code/frameworks/sdlc-complete" ]; then
  echo "❌ Error: AIWG installation not found at $AIWG_ROOT"
  echo ""
  echo "Please install AIWG or set AIWG_ROOT environment variable"
  exit 1
fi
```

**Interactive Mode**:

If `--interactive` flag set, prompt user with strategic questions:

```bash
if [ "$INTERACTIVE" = true ]; then
  echo "# Flow Hypercare Monitoring - Interactive Setup"
  echo ""
  echo "I'll ask 6 strategic questions to tailor this flow to your project's needs."
  echo ""

  read -p "Q1: What are your top priorities for this activity? " answer1
  read -p "Q2: What are your biggest constraints? " answer2
  read -p "Q3: What risks concern you most for this workflow? " answer3
  read -p "Q4: What's your team's experience level with this type of activity? " answer4
  read -p "Q5: What's your target timeline? " answer5
  read -p "Q6: Are there compliance or regulatory requirements? " answer6

  echo ""
  echo "Based on your answers, I'll adjust priorities, agent assignments, and activity focus."
  echo ""
  read -p "Proceed with these adjustments? (yes/no) " confirm

  if [ "$confirm" != "yes" ]; then
    echo "Aborting flow."
    exit 0
  fi

  # Synthesize guidance from answers
  GUIDANCE="Priorities: $answer1. Constraints: $answer2. Risks: $answer3. Team: $answer4. Timeline: $answer5."
fi
```

**Apply Guidance**:

Parse guidance for keywords and adjust execution:

```bash
if [ -n "$GUIDANCE" ]; then
  # Keyword detection
  FOCUS_SECURITY=false
  FOCUS_PERFORMANCE=false
  FOCUS_COMPLIANCE=false
  TIGHT_TIMELINE=false

  if echo "$GUIDANCE" | grep -qiE "security|secure|audit"; then
    FOCUS_SECURITY=true
  fi

  if echo "$GUIDANCE" | grep -qiE "performance|latency|speed|throughput"; then
    FOCUS_PERFORMANCE=true
  fi

  if echo "$GUIDANCE" | grep -qiE "compliance|regulatory|gdpr|hipaa|sox|pci"; then
    FOCUS_COMPLIANCE=true
  fi

  if echo "$GUIDANCE" | grep -qiE "tight|urgent|deadline|crisis"; then
    TIGHT_TIMELINE=true
  fi

  # Adjust agent assignments based on guidance
  ADDITIONAL_REVIEWERS=""

  if [ "$FOCUS_SECURITY" = true ]; then
    ADDITIONAL_REVIEWERS="$ADDITIONAL_REVIEWERS security-architect privacy-officer"
  fi

  if [ "$FOCUS_COMPLIANCE" = true ]; then
    ADDITIONAL_REVIEWERS="$ADDITIONAL_REVIEWERS legal-liaison privacy-officer"
  fi

  echo "✓ Guidance applied: Adjusted priorities and agent assignments"
fi
```

ed and approved

## Workflow Steps

### Step 1: Establish Hypercare Team and Schedule

**Purpose**: Create dedicated support structure with clear ownership and 24/7 coverage

**Actions**:

1. **Define Hypercare Team Roles**:
   ```markdown
   ## Hypercare Team Structure

   ### Core Team
   - **Hypercare Lead**: {name} (overall coordination, daily standups)
   - **On-Call Engineers**: {rotation-schedule} (24/7 coverage)
   - **Deployment Manager**: {name} (deployment issues, rollback authority)
   - **Reliability Engineer**: {name} (SLO monitoring, performance analysis)
   - **Support Lead**: {name} (user-facing issues, ticket triage)
   - **Component Owners**: {list by component} (deep technical expertise)

   ### Extended Team
   - **Product Owner**: {name} (prioritization, user impact decisions)
   - **Project Manager**: {name} (escalation path, resourcing)
   - **Security Gatekeeper**: {name} (security incidents)
   - **Executive Sponsor**: {name} (critical escalation)
   ```

2. **Create 24/7 On-Call Rotation**:
   ```markdown
   ## On-Call Schedule (Duration: {duration-days} days)

   ### Primary On-Call
   | Date Range | Engineer | Contact | Backup |
   |------------|----------|---------|--------|
   | {Day 1-3}  | {name}   | {phone} | {name} |
   | {Day 4-7}  | {name}   | {phone} | {name} |
   | {Day 8-10} | {name}   | {phone} | {name} |
   | {Day 11-14}| {name}   | {phone} | {name} |

   ### Escalation Path
   1. **P0 (Critical)**: Page on-call engineer immediately → Escalate to Hypercare Lead within 15 min
   2. **P1 (High)**: Alert on-call engineer → Response within 30 min
   3. **P2 (Medium)**: Create ticket → Response within 4 hours
   4. **P3 (Low)**: Create ticket → Response within 1 business day
   ```

3. **Establish Communication Channels**:
   ```bash
   # Create dedicated Slack channel
   # Channel: #hypercare-{project-name}-{YYYY-MM}

   # Pin critical information:
   # - On-call schedule
   # - Escalation contacts
   # - Production dashboard links
   # - Incident response runbook
   # - Daily standup schedule
   ```

4. **Schedule Daily Hypercare Standups**:
   ```markdown
   ## Daily Standup Schedule

   **Time**: {time} (every day during hypercare period)
   **Duration**: 30 minutes
   **Attendees**: Core hypercare team (mandatory), Extended team (optional)

   **Agenda**:
   1. Production health review (5 min)
   2. Incident summary (last 24h) (10 min)
   3. User feedback review (5 min)
   4. SLO/SLI status (5 min)
   5. Action items and blockers (5 min)
   ```

**Deliverables**:
- [ ] Hypercare team roster with roles and contacts
- [ ] 24/7 on-call rotation schedule
- [ ] Dedicated communication channel (#hypercare-*)
- [ ] Daily standup calendar invites sent
- [ ] Escalation path documented and socialized

### Step 2: Configure Enhanced Monitoring

**Purpose**: Enable real-time visibility into production health, performance, and user experience

**Actions**:

1. **Create Real-Time Dashboards**:
   ```markdown
   ## Production Health Dashboard

   **Dashboard URL**: {monitoring-tool-url}/hypercare-{project}

   ### Key Metrics (Auto-Refresh: 30s)

   **Availability**
   - Current Uptime: {percentage}% (Target: ≥99.9%)
   - Service Health: {GREEN | YELLOW | RED}
   - Failed Health Checks: {count}

   **Performance (Last 5 min)**
   - Response Time (p50): {value}ms
   - Response Time (p95): {value}ms (Target: <{SLA}ms)
   - Response Time (p99): {value}ms
   - Throughput: {requests-per-second} req/s

   **Errors (Last 5 min)**
   - Error Rate: {percentage}% (Target: <0.1%)
   - 4xx Errors: {count}
   - 5xx Errors: {count}
   - Database Errors: {count}

   **Business Metrics**
   - Active Users (Current): {count}
   - Successful Transactions: {count}
   - Failed Transactions: {count}
   - Transaction Success Rate: {percentage}%

   **Infrastructure**
   - CPU Utilization: {percentage}% (Alert: >80%)
   - Memory Utilization: {percentage}% (Alert: >85%)
   - Disk I/O: {value} IOPS
   - Network Traffic: {value} Mbps
   ```

2. **Configure Alert Escalation**:
   ```markdown
   ## Alert Escalation Configuration

   ### P0 (Critical) - Page Immediately
   - Availability <99%
   - Error rate >1%
   - Response time p95 >3x SLA
   - All instances down
   - Database unavailable
   - Security breach detected

   **Action**: Page on-call engineer + Hypercare Lead
   **Response SLA**: Immediate acknowledgment, 15 min time-to-engage

   ### P1 (High) - Alert Within 5 Minutes
   - Availability <99.5%
   - Error rate >0.5%
   - Response time p95 >2x SLA
   - Single instance failure (with redundancy)
   - Elevated database latency

   **Action**: Alert on-call engineer via Slack + SMS
   **Response SLA**: 30 min acknowledgment, 1 hour time-to-mitigation

   ### P2 (Medium) - Alert Within 30 Minutes
   - Availability <99.9%
   - Error rate >0.1%
   - Response time p95 >SLA
   - Resource utilization >80%
   - Increased warning logs

   **Action**: Alert on-call engineer via Slack
   **Response SLA**: 4 hours

   ### P3 (Low) - Log and Review
   - Minor performance degradation
   - Non-critical errors
   - Informational warnings

   **Action**: Create ticket for review
   **Response SLA**: 1 business day
   ```

3. **Set Up Log Aggregation and Analysis**:
   ```bash
   # Configure log aggregation (example: CloudWatch, Datadog, Splunk)

   # Key log queries for hypercare:
   # 1. Error logs (last 5 min)
   # 2. User journey failures
   # 3. Performance anomalies
   # 4. Security events
   # 5. Database slow queries

   # Create saved searches for rapid triage
   ```

4. **Implement User Journey Monitoring**:
   ```markdown
   ## Critical User Journeys (Synthetic Monitoring)

   **Journey 1: {User Action}**
   - Frequency: Every 1 min
   - Success Rate Target: >99.9%
   - Response Time Target: <{value}ms
   - Alert: 3 consecutive failures OR success rate <99%

   **Journey 2: {User Action}**
   - Frequency: Every 5 min
   - Success Rate Target: >99.5%
   - Response Time Target: <{value}ms
   - Alert: 5 consecutive failures OR success rate <95%

   **Journey 3: {User Action}**
   - Frequency: Every 15 min
   - Success Rate Target: >98%
   - Response Time Target: <{value}ms
   - Alert: Success rate <95%
   ```

**Deliverables**:
- [ ] Real-time production dashboard created and shared
- [ ] Alert escalation rules configured and tested
- [ ] Log aggregation queries saved for hypercare team
- [ ] Synthetic monitoring for critical user journeys active
- [ ] Dashboard links pinned in #hypercare-* channel

### Step 3: Track Production Stability Metrics

**Purpose**: Continuously validate that production system meets SLO targets and stability expectations

**Actions**:

1. **Monitor SLO Compliance**:
   ```markdown
   ## SLO Tracking (Updated Hourly)

   ### Availability SLO
   - **Target**: ≥99.9% uptime
   - **Current (24h)**: {percentage}%
   - **Current (7d)**: {percentage}%
   - **Error Budget Remaining**: {percentage}%
   - **Status**: {ON TARGET | AT RISK | EXCEEDED}

   ### Performance SLO
   - **Target**: p95 response time <{value}ms
   - **Current p95 (24h)**: {value}ms
   - **Current p95 (7d)**: {value}ms
   - **Status**: {ON TARGET | AT RISK | EXCEEDED}

   ### Error Rate SLO
   - **Target**: <0.1% error rate
   - **Current (24h)**: {percentage}%
   - **Current (7d)**: {percentage}%
   - **Status**: {ON TARGET | AT RISK | EXCEEDED}

   ### Throughput SLO
   - **Target**: Handle {value} req/s
   - **Current Peak**: {value} req/s
   - **Current Average**: {value} req/s
   - **Status**: {ON TARGET | AT RISK | EXCEEDED}
   ```

2. **Track Incident Metrics**:
   ```markdown
   ## Incident Summary (Hypercare Period)

   ### Total Incidents: {count}

   **By Severity**:
   - P0 (Critical): {count} (Target: 0)
   - P1 (High): {count} (Target: 0)
   - P2 (Medium): {count}
   - P3 (Low): {count}

   **By Status**:
   - Open: {count}
   - In Progress: {count}
   - Resolved: {count}
   - Closed: {count}

   **Key Metrics**:
   - Mean Time to Detect (MTTD): {value} min
   - Mean Time to Acknowledge (MTTA): {value} min
   - Mean Time to Resolve (MTTR): {value} min
   - Incidents Requiring Hotfix: {count}
   - Incidents Requiring Rollback: {count}
   ```

3. **Validate Performance Baselines**:
   ```markdown
   ## Performance Baseline Validation

   ### Response Time Trends
   - **Baseline (Pre-Deployment)**: p95 {value}ms, p99 {value}ms
   - **Current (Post-Deployment)**: p95 {value}ms, p99 {value}ms
   - **Variance**: {+/-percentage}%
   - **Assessment**: {IMPROVED | STABLE | DEGRADED}

   ### Throughput Trends
   - **Baseline**: {value} req/s
   - **Current**: {value} req/s
   - **Variance**: {+/-percentage}%
   - **Assessment**: {IMPROVED | STABLE | DEGRADED}

   ### Resource Utilization
   - **CPU**: Avg {percentage}%, Peak {percentage}%
   - **Memory**: Avg {percentage}%, Peak {percentage}%
   - **Database Connections**: Avg {count}, Peak {count}
   - **Assessment**: {HEALTHY | CONCERNING | CRITICAL}
   ```

4. **Monitor Error Budget Burn Rate**:
   ```markdown
   ## Error Budget Status

   **Monthly Error Budget**: {value} minutes of downtime allowed (99.9% SLO)
   **Hypercare Period Budget**: {value} minutes ({duration-days} days)

   **Current Burn Rate**:
   - Downtime So Far: {value} minutes
   - Budget Remaining: {value} minutes ({percentage}%)
   - Projected End-of-Month: {percentage}% budget consumed

   **Assessment**: {HEALTHY | MONITOR | CRITICAL}

   **Action Required**:
   {IF CRITICAL: Implement incident freeze, focus on stability}
   {IF MONITOR: Increase monitoring, defer risky changes}
   {IF HEALTHY: Continue normal operations}
   ```

**Deliverables**:
- [ ] SLO compliance dashboard updated hourly
- [ ] Incident metrics tracked and reported daily
- [ ] Performance baseline comparison documented
- [ ] Error budget burn rate monitored and trended

### Step 4: Rapid Issue Triage and Response

**Purpose**: Quickly identify, prioritize, and resolve production issues to minimize user impact

**Actions**:

1. **Incident Prioritization Framework**:
   ```markdown
   ## Incident Severity Classification

   ### P0 - Critical (Page Immediately)
   **Definition**: Complete service outage or data loss
   **Examples**:
   - Application completely unavailable
   - Data corruption or loss
   - Security breach
   - Payment processing failure

   **Response**:
   - Page on-call engineer + Hypercare Lead immediately
   - War room within 15 minutes
   - Executive notification within 30 minutes
   - Public status page update within 30 minutes

   **Resolution Target**: 1 hour

   ### P1 - High (Alert Within 5 Minutes)
   **Definition**: Severe degradation affecting majority of users
   **Examples**:
   - Critical feature unavailable
   - Error rate >0.5%
   - Response time >2x SLA
   - Database performance degraded

   **Response**:
   - Alert on-call engineer within 5 minutes
   - Hypercare Lead notified
   - Component Owner engaged
   - Status update every 30 minutes

   **Resolution Target**: 4 hours

   ### P2 - Medium (Alert Within 30 Minutes)
   **Definition**: Moderate degradation affecting subset of users
   **Examples**:
   - Non-critical feature unavailable
   - Error rate >0.1%
   - Response time >SLA
   - Minor UI issues

   **Response**:
   - Ticket created, assigned to on-call
   - Triage within 30 minutes
   - Component Owner consulted
   - Status update daily

   **Resolution Target**: 24 hours

   ### P3 - Low (Standard Process)
   **Definition**: Minor issues or enhancement requests
   **Examples**:
   - Cosmetic issues
   - Feature requests
   - Performance optimization opportunities

   **Response**:
   - Ticket created for post-hypercare
   - Triage within 1 business day
   - Prioritize in normal backlog

   **Resolution Target**: Post-hypercare
   ```

2. **Incident Response Workflow**:
   ```markdown
   ## Rapid Response Process

   ### Phase 1: Detection (Target: <5 min)
   - [ ] Alert received or issue reported
   - [ ] On-call engineer acknowledges
   - [ ] Initial severity assessment (P0/P1/P2/P3)
   - [ ] Incident channel created: #incident-{YYYY-MM-DD}-{ID}

   ### Phase 2: Triage (Target: <15 min)
   - [ ] Gather initial evidence (logs, metrics, user reports)
   - [ ] Identify affected systems/users
   - [ ] Estimate business impact
   - [ ] Engage Component Owner(s)
   - [ ] Update severity if needed
   - [ ] Notify stakeholders per escalation matrix

   ### Phase 3: Investigation (Target: P0=30min, P1=1h)
   - [ ] Review logs and metrics for root cause signals
   - [ ] Check recent deployments/changes
   - [ ] Reproduce issue in non-prod (if possible)
   - [ ] Identify probable root cause
   - [ ] Determine mitigation strategy

   ### Phase 4: Mitigation (Target: P0=1h, P1=4h)
   - [ ] Execute mitigation (rollback, hotfix, config change)
   - [ ] Validate mitigation effectiveness
   - [ ] Monitor for regression
   - [ ] Update stakeholders on resolution

   ### Phase 5: Resolution (Target: P0=2h, P1=8h)
   - [ ] Confirm issue fully resolved
   - [ ] Validate SLOs back to normal
   - [ ] Close incident
   - [ ] Schedule post-incident review (PIR)

   ### Phase 6: Post-Incident Review (Within 48h)
   - [ ] Document timeline and root cause
   - [ ] Identify contributing factors
   - [ ] Define corrective actions
   - [ ] Assign action owners and due dates
   - [ ] Update runbooks/documentation
   ```

3. **Root Cause Analysis (RCA) Template**:
   ```markdown
   ## Post-Incident Review: {Incident-ID}

   **Date**: {YYYY-MM-DD}
   **Severity**: {P0/P1/P2/P3}
   **Duration**: {detection-to-resolution}
   **Impact**: {user-count} users, {downtime-minutes} minutes downtime

   ### Incident Summary
   {1-2 sentence description of what happened}

   ### Timeline
   | Time | Event | Actor |
   |------|-------|-------|
   | {HH:MM} | Incident detected | {monitoring/user report} |
   | {HH:MM} | Engineer acknowledged | {name} |
   | {HH:MM} | Root cause identified | {name} |
   | {HH:MM} | Mitigation deployed | {name} |
   | {HH:MM} | Incident resolved | {name} |

   ### Root Cause
   {Detailed description of technical root cause}

   ### Contributing Factors
   1. {Factor 1 - e.g., insufficient testing}
   2. {Factor 2 - e.g., monitoring gap}
   3. {Factor 3 - e.g., unclear runbook}

   ### Corrective Actions
   | Action | Owner | Due Date | Status |
   |--------|-------|----------|--------|
   | {Action 1} | {name} | {date} | {Open/In Progress/Done} |
   | {Action 2} | {name} | {date} | {Open/In Progress/Done} |
   | {Action 3} | {name} | {date} | {Open/In Progress/Done} |

   ### Lessons Learned
   - **What went well**: {list}
   - **What could improve**: {list}
   - **Process changes needed**: {list}
   ```

4. **Hotfix Deployment Procedure**:
   ```markdown
   ## Emergency Hotfix Process

   ### Prerequisites
   - [ ] P0 or P1 incident requiring code change
   - [ ] Deployment Manager approval obtained
   - [ ] Rollback plan confirmed

   ### Hotfix Workflow
   1. **Create Hotfix Branch**:
      ```bash
      git checkout -b hotfix/{incident-ID}-{description}
      ```

   2. **Implement Fix**:
      - Minimal code change to resolve issue
      - Add regression test
      - Peer review (async if P0, required if P1)

   3. **Test in Staging**:
      - Deploy to staging environment
      - Validate fix resolves issue
      - Run smoke tests

   4. **Deploy to Production**:
      ```bash
      # Get Deployment Manager approval
      # Deploy hotfix
      # Monitor metrics for 15 minutes
      # Validate issue resolved
      ```

   5. **Post-Deployment**:
      - Monitor SLOs for 1 hour
      - Update incident with resolution
      - Merge hotfix to main branch
      - Schedule PIR
   ```

**Deliverables**:
- [ ] Incident prioritization framework documented
- [ ] Incident response runbook followed for all incidents
- [ ] RCA completed for all P0/P1 incidents within 48h
- [ ] Corrective actions tracked to completion
- [ ] Hotfix procedures followed when needed

### Step 5: Monitor User Adoption

**Purpose**: Validate that users are successfully adopting new features and experiencing positive outcomes

**Actions**:

1. **Track Active User Metrics**:
   ```markdown
   ## User Adoption Dashboard

   ### Active Users
   - **DAU (Daily Active Users)**: {count} (Target: >{target})
   - **WAU (Weekly Active Users)**: {count}
   - **MAU (Monthly Active Users)**: {count}
   - **DAU/MAU Ratio**: {percentage}% (stickiness)

   ### User Growth
   - **New Users (24h)**: {count}
   - **New Users (7d)**: {count}
   - **User Growth Rate**: {+/-percentage}%
   - **Trend**: {GROWING | STABLE | DECLINING}

   ### User Retention
   - **Day 1 Retention**: {percentage}%
   - **Day 7 Retention**: {percentage}%
   - **Day 14 Retention**: {percentage}%
   ```

2. **Monitor Feature Adoption Rates**:
   ```markdown
   ## Feature Adoption (New Features in This Release)

   ### Feature 1: {Feature-Name}
   - **Total Users**: {count}
   - **Users Engaged**: {count} ({percentage}%)
   - **Adoption Rate**: {percentage}% (Target: >{target}%)
   - **Engagement Trend**: {INCREASING | STABLE | DECREASING}

   ### Feature 2: {Feature-Name}
   - **Total Users**: {count}
   - **Users Engaged**: {count} ({percentage}%)
   - **Adoption Rate**: {percentage}% (Target: >{target}%)
   - **Engagement Trend**: {INCREASING | STABLE | DECREASING}

   ### Feature 3: {Feature-Name}
   - **Total Users**: {count}
   - **Users Engaged**: {count} ({percentage}%)
   - **Adoption Rate**: {percentage}% (Target: >{target}%)
   - **Engagement Trend**: {INCREASING | STABLE | DECREASING}
   ```

3. **Collect and Analyze User Feedback**:
   ```markdown
   ## User Feedback Summary (Hypercare Period)

   ### Feedback Channels
   - **Support Tickets**: {count} tickets
   - **In-App Feedback**: {count} submissions
   - **User Surveys**: {count} responses
   - **Social Media**: {count} mentions

   ### Sentiment Analysis
   - **Positive**: {percentage}% ({count} items)
   - **Neutral**: {percentage}% ({count} items)
   - **Negative**: {percentage}% ({count} items)
   - **Net Promoter Score**: {value}

   ### Top User Issues (Negative Feedback)
   1. {Issue 1} - {count} reports
   2. {Issue 2} - {count} reports
   3. {Issue 3} - {count} reports

   ### Top User Praises (Positive Feedback)
   1. {Feature 1} - {count} mentions
   2. {Feature 2} - {count} mentions
   3. {Feature 3} - {count} mentions
   ```

4. **Analyze Support Ticket Trends**:
   ```markdown
   ## Support Ticket Analysis

   ### Ticket Volume
   - **Total Tickets (Hypercare)**: {count}
   - **Daily Average**: {count} tickets/day
   - **Trend**: {INCREASING | STABLE | DECREASING}

   ### Ticket Categories
   | Category | Count | Percentage | Trend |
   |----------|-------|------------|-------|
   | Bug Reports | {count} | {percentage}% | {↑/→/↓} |
   | How-To Questions | {count} | {percentage}% | {↑/→/↓} |
   | Feature Requests | {count} | {percentage}% | {↑/→/↓} |
   | Performance Issues | {count} | {percentage}% | {↑/→/↓} |
   | Account Issues | {count} | {percentage}% | {↑/→/↓} |

   ### Critical Issues
   - **Critical Bugs**: {count} (requiring immediate attention)
   - **Blockers**: {count} (preventing user success)
   - **Workarounds Provided**: {count}

   ### Support Team Health
   - **Average Response Time**: {value} hours (Target: <{SLA}h)
   - **Average Resolution Time**: {value} hours
   - **First Contact Resolution Rate**: {percentage}%
   - **Support Team Sentiment**: {CONFIDENT | MANAGING | OVERWHELMED}
   ```

**Deliverables**:
- [ ] User adoption metrics tracked daily
- [ ] Feature adoption rates monitored and trended
- [ ] User feedback collected and categorized
- [ ] Support ticket trends analyzed
- [ ] User adoption report generated for daily standup

### Step 6: Conduct Daily Hypercare Standups

**Purpose**: Maintain team alignment, surface issues early, and coordinate rapid response

**Actions**:

1. **Daily Standup Agenda**:
   ```markdown
   ## Hypercare Daily Standup - Day {N} of {duration-days}

   **Date**: {YYYY-MM-DD}
   **Time**: {HH:MM}
   **Duration**: 30 minutes
   **Facilitator**: {Hypercare Lead}

   ### Agenda

   #### 1. Production Health Review (5 min)
   **Presented by**: Reliability Engineer

   - **Availability**: {percentage}% (Target: ≥99.9%) - {STATUS}
   - **Performance**: p95 {value}ms (Target: <{SLA}ms) - {STATUS}
   - **Error Rate**: {percentage}% (Target: <0.1%) - {STATUS}
   - **Error Budget**: {percentage}% remaining - {STATUS}

   **Overall Health**: {GREEN | YELLOW | RED}

   #### 2. Incident Summary (Last 24h) (10 min)
   **Presented by**: On-Call Engineer

   **Total Incidents**: {count}
   - P0 (Critical): {count} - {list titles}
   - P1 (High): {count} - {list titles}
   - P2 (Medium): {count} - {list titles}
   - P3 (Low): {count} - {list titles}

   **Key Incidents**:
   {For each P0/P1 incident}
   - **{Incident-ID}**: {title}
     - Status: {Open/Resolved/Closed}
     - Impact: {user-count} users, {duration} minutes
     - Root Cause: {brief description}
     - Action Items: {list}

   **Patterns/Trends**: {emerging issues or recurring problems}

   #### 3. User Feedback Review (5 min)
   **Presented by**: Support Lead

   - **Support Tickets (24h)**: {count} (Trend: {↑/→/↓})
   - **Critical User Issues**: {count}
   - **Top User Complaints**: {top 3}
   - **Top User Praises**: {top 3}
   - **Sentiment**: {POSITIVE | NEUTRAL | NEGATIVE}

   **Blockers for Users**: {list critical issues preventing success}

   #### 4. SLO/SLI Status (5 min)
   **Presented by**: Reliability Engineer

   | SLO | Target | Current (24h) | Current (7d) | Status |
   |-----|--------|---------------|--------------|--------|
   | Availability | ≥99.9% | {percentage}% | {percentage}% | {✓/⚠/✗} |
   | Response Time | p95<{value}ms | {value}ms | {value}ms | {✓/⚠/✗} |
   | Error Rate | <0.1% | {percentage}% | {percentage}% | {✓/⚠/✗} |
   | Throughput | >{value} req/s | {value} req/s | {value} req/s | {✓/⚠/✗} |

   **SLO Compliance**: {percentage}% of SLOs met

   #### 5. Action Items and Blockers (5 min)
   **Presented by**: All

   **Open Action Items**:
   | Action | Owner | Due Date | Status |
   |--------|-------|----------|--------|
   | {Action 1} | {name} | {date} | {Red/Yellow/Green} |
   | {Action 2} | {name} | {date} | {Red/Yellow/Green} |

   **New Blockers**:
   - {Blocker 1} - Owner: {name} - Escalation needed: {Y/N}
   - {Blocker 2} - Owner: {name} - Escalation needed: {Y/N}

   **Escalations**:
   {List any items requiring executive/PM intervention}

   **Tomorrow's On-Call**: {name} (taking over at {HH:MM})
   ```

2. **Standup Output Documentation**:
   ```markdown
   ## Hypercare Standup Notes - Day {N}

   **Overall Status**: {GREEN | YELLOW | RED}

   **Key Decisions Made**:
   1. {Decision 1}
   2. {Decision 2}

   **New Action Items**:
   - [ ] {Action} - Owner: {name} - Due: {date}
   - [ ] {Action} - Owner: {name} - Due: {date}

   **Escalations Required**:
   - {Issue requiring PM/Executive intervention}

   **Notes for Tomorrow**:
   {Anything the next on-call engineer should know}
   ```

3. **Weekly Hypercare Summary** (if hypercare >7 days):
   ```markdown
   ## Hypercare Week {N} Summary

   **Week**: {date-range}
   **Overall Status**: {GREEN | YELLOW | RED}

   ### Production Stability
   - **Availability**: {percentage}% (Target: ≥99.9%)
   - **Total Incidents**: {count} (P0: {count}, P1: {count})
   - **MTTR**: {value} min
   - **SLO Compliance**: {percentage}%

   ### User Adoption
   - **Active Users**: {count} ({+/-percentage}% vs. previous week)
   - **Feature Adoption**: {percentage}%
   - **User Sentiment**: {POSITIVE | NEUTRAL | NEGATIVE}

   ### Support Health
   - **Support Tickets**: {count} ({+/-percentage}% vs. previous week)
   - **Critical Issues**: {count}
   - **Response Time**: {value}h (Target: <{SLA}h)

   ### Accomplishments
   - {Accomplishment 1}
   - {Accomplishment 2}

   ### Challenges
   - {Challenge 1}
   - {Challenge 2}

   ### Next Week Focus
   - {Focus Area 1}
   - {Focus Area 2}
   ```

**Deliverables**:
- [ ] Daily standup conducted and documented
- [ ] Standup notes posted to #hypercare-* channel
- [ ] Action items tracked and assigned
- [ ] Blockers escalated when needed
- [ ] Weekly summary created (if applicable)

### Step 7: Validate Exit Criteria and Transition

**Purpose**: Ensure production is stable and support team is ready before ending hypercare period

**Actions**:

1. **Exit Criteria Checklist**:
   ```markdown
   ## Hypercare Exit Criteria Validation

   **Hypercare Period**: Day {N} of {duration-days}
   **Validation Date**: {YYYY-MM-DD}

   ### Production Stability
   - [ ] **Zero P0 (Critical) incidents** in last 48 hours
   - [ ] **Zero P1 (High) incidents** in last 24 hours
   - [ ] **All SLOs met** for 72 consecutive hours
     - [ ] Availability ≥99.9%
     - [ ] Response time p95 <{SLA}ms
     - [ ] Error rate <0.1%
     - [ ] Throughput >{target} req/s
   - [ ] **Error budget healthy**: >{percentage}% remaining
   - [ ] **No open P0/P1 incidents**

   ### User Adoption
   - [ ] **User adoption trending positive** ({percentage}% week-over-week growth)
   - [ ] **Feature adoption** >{target}% for all critical features
   - [ ] **User sentiment** majority positive (≥70% positive feedback)
   - [ ] **Support ticket volume stable** or decreasing
   - [ ] **No critical user blockers** unresolved

   ### Support Readiness
   - [ ] **Support team trained** and confident
   - [ ] **Runbooks validated** (all common issues documented)
   - [ ] **Escalation paths tested** and effective
   - [ ] **Knowledge base updated** with hypercare learnings
   - [ ] **On-call rotation** transitioned to standard support

   ### Documentation Complete
   - [ ] **Hypercare report** completed (see below)
   - [ ] **Post-incident reviews** completed for all P0/P1 incidents
   - [ ] **Corrective actions** tracked (all assigned, due dates set)
   - [ ] **Lessons learned** documented
   - [ ] **Runbooks updated** with new procedures

   ### Stakeholder Signoff
   - [ ] **Hypercare Lead**: {APPROVED | PENDING | DECLINED}
   - [ ] **Reliability Engineer**: {APPROVED | PENDING | DECLINED}
   - [ ] **Support Lead**: {APPROVED | PENDING | DECLINED}
   - [ ] **Product Owner**: {APPROVED | PENDING | DECLINED}
   - [ ] **Project Manager**: {APPROVED | PENDING | DECLINED}

   **Overall Exit Criteria Status**: {PASS | CONDITIONAL | FAIL}

   **Decision**: {END HYPERCARE | EXTEND HYPERCARE | ESCALATE}
   ```

2. **Hypercare Exit Report**:
   ```markdown
   # Hypercare Report: {Project-Name}

   **Hypercare Period**: {start-date} to {end-date} ({duration-days} days)
   **Report Date**: {YYYY-MM-DD}
   **Report Author**: {Hypercare Lead}

   ## Executive Summary

   {2-3 sentence summary of hypercare period outcomes}

   **Overall Status**: {SUCCESS | SUCCESS WITH CONDITIONS | CHALLENGES}

   **Key Metrics**:
   - Availability: {percentage}%
   - Total Incidents: {count} (P0: {count}, P1: {count})
   - User Adoption: {percentage}%
   - Support Tickets: {count}

   ## Production Stability Summary

   ### SLO Performance
   | SLO | Target | Achieved | Status |
   |-----|--------|----------|--------|
   | Availability | ≥99.9% | {percentage}% | {✓/⚠/✗} |
   | Response Time | p95<{value}ms | {value}ms | {✓/⚠/✗} |
   | Error Rate | <0.1% | {percentage}% | {✓/⚠/✗} |
   | Throughput | >{value} req/s | {value} req/s | {✓/⚠/✗} |

   **SLO Compliance Rate**: {percentage}%

   ### Incident Summary
   **Total Incidents**: {count}

   **By Severity**:
   - P0 (Critical): {count}
   - P1 (High): {count}
   - P2 (Medium): {count}
   - P3 (Low): {count}

   **Key Metrics**:
   - Mean Time to Detect (MTTD): {value} min
   - Mean Time to Acknowledge (MTTA): {value} min
   - Mean Time to Resolve (MTTR): {value} min

   **Major Incidents**:
   {For each P0/P1 incident}
   - **{Incident-ID}**: {title}
     - Date: {YYYY-MM-DD HH:MM}
     - Duration: {minutes} min
     - Impact: {user-count} users
     - Root Cause: {summary}
     - Resolution: {summary}
     - Corrective Actions: {count} actions assigned

   ### Performance Trends
   - **Response Time**: {IMPROVED | STABLE | DEGRADED} ({+/-percentage}% vs. pre-deployment)
   - **Error Rate**: {IMPROVED | STABLE | DEGRADED} ({+/-percentage}% vs. pre-deployment)
   - **Resource Utilization**: {HEALTHY | CONCERNING}

   ## User Adoption Summary

   ### Adoption Metrics
   - **Active Users**: {count} ({+/-percentage}% vs. pre-deployment)
   - **Feature Adoption**: {percentage}% (Target: >{target}%)
   - **User Retention (Day 14)**: {percentage}%

   ### User Feedback
   - **Total Feedback Items**: {count}
   - **Sentiment**: {percentage}% positive, {percentage}% neutral, {percentage}% negative
   - **Net Promoter Score**: {value}

   **Top User Praises**:
   1. {Item 1}
   2. {Item 2}
   3. {Item 3}

   **Top User Complaints**:
   1. {Item 1} - {Status: Resolved/In Progress/Backlog}
   2. {Item 2} - {Status: Resolved/In Progress/Backlog}
   3. {Item 3} - {Status: Resolved/In Progress/Backlog}

   ## Support Summary

   ### Ticket Volume
   - **Total Support Tickets**: {count}
   - **Daily Average**: {count} tickets/day
   - **Trend**: {DECREASING | STABLE | INCREASING}

   ### Support Performance
   - **Average Response Time**: {value}h (Target: <{SLA}h) - {✓/⚠/✗}
   - **Average Resolution Time**: {value}h
   - **First Contact Resolution**: {percentage}%

   ### Support Team Readiness
   - **Team Confidence Level**: {HIGH | MEDIUM | LOW}
   - **Runbook Completeness**: {percentage}%
   - **Knowledge Gaps Identified**: {count}

   ## Lessons Learned

   ### What Went Well
   1. {Success 1}
   2. {Success 2}
   3. {Success 3}

   ### What Could Improve
   1. {Improvement 1}
   2. {Improvement 2}
   3. {Improvement 3}

   ### Process Recommendations
   1. {Recommendation 1}
   2. {Recommendation 2}
   3. {Recommendation 3}

   ## Corrective Actions

   **Total Actions Identified**: {count}

   | Action | Category | Owner | Due Date | Status |
   |--------|----------|-------|----------|--------|
   | {Action 1} | {Monitoring/Code/Process/Documentation} | {name} | {date} | {Open/In Progress/Done} |
   | {Action 2} | {Monitoring/Code/Process/Documentation} | {name} | {date} | {Open/In Progress/Done} |
   | {Action 3} | {Monitoring/Code/Process/Documentation} | {name} | {date} | {Open/In Progress/Done} |

   ## Handover to Standard Support

   ### Transition Plan
   - [ ] Standard on-call rotation activated (starting {date})
   - [ ] Support runbooks transferred to support team
   - [ ] Knowledge base articles published
   - [ ] Support team final training completed
   - [ ] Escalation paths updated for BAU operations

   ### Post-Hypercare Monitoring
   - **Duration**: {duration} days of continued close monitoring
   - **Responsible**: {Support Lead}
   - **Review Cadence**: Weekly check-ins for {duration} weeks

   ## Conclusion

   {2-3 sentence summary of hypercare outcomes and readiness for standard support}

   **Recommendation**: {END HYPERCARE | EXTEND HYPERCARE}

   **Signoff**:
   - Hypercare Lead: {name} - {date}
   - Reliability Engineer: {name} - {date}
   - Support Lead: {name} - {date}
   - Product Owner: {name} - {date}
   - Project Manager: {name} - {date}
   ```

3. **Transition to Standard Support**:
   ```markdown
   ## Hypercare → Standard Support Transition Checklist

   ### Pre-Transition (24h before end)
   - [ ] Exit criteria validated and approved
   - [ ] Hypercare report completed and distributed
   - [ ] Final corrective actions assigned
   - [ ] Standard support team briefed
   - [ ] On-call handoff scheduled

   ### Transition Day
   - [ ] Final hypercare standup conducted
   - [ ] Handoff meeting with standard support (1h)
     - Review open issues
     - Walk through critical runbooks
     - Clarify escalation paths
     - Transfer incident response ownership
   - [ ] Update on-call rotation to standard schedule
   - [ ] Archive #hypercare-* channel (keep history for 90 days)
   - [ ] Post transition announcement to stakeholders

   ### Post-Transition (Week 1)
   - [ ] Daily check-ins with support team (first 3 days)
   - [ ] Monitor incident volume and response times
   - [ ] Weekly retrospective (Week 1)
   - [ ] Final report to stakeholders (Week 1 complete)

   ### Post-Transition (Weeks 2-4)
   - [ ] Weekly check-ins with support team
   - [ ] Review corrective action progress
   - [ ] Validate standard support effectiveness
   - [ ] Close hypercare project officially (Week 4)
   ```

4. **Stakeholder Communication**:
   ```markdown
   ## Hypercare Completion Announcement

   **Subject**: {Project-Name} Hypercare Period Complete - Transition to Standard Support

   **Team**,

   We are pleased to announce the successful completion of the hypercare period for {project-name}, which ran from {start-date} to {end-date} ({duration-days} days).

   **Key Highlights**:
   - **Availability**: {percentage}% (exceeded 99.9% target)
   - **Total Incidents**: {count} (P0: {count}, P1: {count})
   - **User Adoption**: {percentage}% of target users actively engaged
   - **Support Readiness**: Team trained and confident

   **Transition Plan**:
   Effective {date}, we are transitioning to standard support operations. The support team is fully prepared and will continue to monitor production health closely.

   **On-Call Coverage**:
   Standard on-call rotation resumes on {date}. For urgent issues, contact {support-channel} or page {on-call-alias}.

   **Thank You**:
   Thank you to the hypercare team for their dedication and rapid response over the past {duration-days} days. Your efforts ensured a smooth production launch.

   **Full Report**: {link-to-hypercare-report}

   Questions? Contact {Hypercare-Lead} or {Project-Manager}.

   Best regards,
   {Hypercare Lead}
   ```

**Deliverables**:
- [ ] Exit criteria validated and documented
- [ ] Hypercare report completed and distributed
- [ ] Transition to standard support executed
- [ ] Stakeholder announcement sent
- [ ] Corrective actions tracked post-hypercare

## Success Criteria

This flow succeeds when:
- [ ] Hypercare period completed ({duration-days} days)
- [ ] Zero P0/P1 incidents in final 48/24 hours
- [ ] All SLOs met for 72 consecutive hours
- [ ] User adoption trending positive
- [ ] Support team ready and confident
- [ ] Hypercare report completed and approved
- [ ] Transition to standard support successful

## Error Handling

### P0 Incident During Hypercare

**Situation**: Critical incident detected (complete outage, data loss, security breach)

**Actions**:
1. **Immediate Response**:
   - Page on-call engineer + Hypercare Lead immediately
   - Create incident war room within 15 minutes
   - Engage Deployment Manager (rollback authority)
   - Update status page (public-facing)

2. **Escalation**:
   - Notify Executive Sponsor within 30 minutes
   - Engage Component Owners
   - Consider extending hypercare period

3. **Resolution**:
   - Follow incident response workflow (Phase 1-5)
   - Execute rollback if needed
   - Deploy hotfix if safe
   - Conduct post-incident review within 24h

4. **Impact Assessment**:
   - Recalculate SLO compliance
   - Update error budget
   - Re-evaluate hypercare exit criteria
   - Communicate to stakeholders

**Exit Criteria Impact**: P0 incident resets 48h "zero critical incidents" requirement

### SLO Breach

**Situation**: SLO target not met (e.g., availability <99.9%, response time >SLA)

**Actions**:
1. **Immediate Investigation**:
   - Review metrics and logs for root cause
   - Identify contributing factors (code, infrastructure, traffic)
   - Assess impact on users

2. **Mitigation**:
   - Implement corrective actions (scale resources, optimize code, adjust configs)
   - Monitor for improvement
   - Validate SLO returns to target

3. **Hypercare Extension**:
   - If SLO breach persists >24h, extend hypercare period
   - If error budget critically low, implement incident freeze
   - Daily executive updates until resolved

4. **Reliability Engineering**:
   - Engage Reliability Engineer for deep analysis
   - Review capacity planning
   - Update monitoring and alerting

**Exit Criteria Impact**: SLO compliance resets 72h "all SLOs met" requirement

### User Adoption Low

**Situation**: User adoption significantly below target (<50% of expected)

**Actions**:
1. **Root Cause Analysis**:
   - Review user feedback for blockers
   - Analyze support tickets for common issues
   - Conduct user interviews (if possible)
   - Check feature visibility and discoverability

2. **Product Owner Engagement**:
   - Present adoption data to Product Owner
   - Discuss potential UX improvements
   - Evaluate communication strategy
   - Consider feature adjustments

3. **Support Analysis**:
   - Review "how-to" support tickets
   - Identify training gaps
   - Update user guides and documentation
   - Create FAQ for common questions

4. **Decision Point**:
   - If blockers identified: Prioritize fixes, extend hypercare
   - If user education needed: Launch awareness campaign
   - If feature not valuable: Discuss with stakeholders

**Exit Criteria Impact**: User adoption trend must improve before exit approval

### Support Team Overwhelmed

**Situation**: Support ticket volume exceeding capacity, team stressed

**Actions**:
1. **Immediate Relief**:
   - Bring in additional support staff (temp assignment)
   - Engineering team handles overflow tickets
   - Triage tickets aggressively (defer P3/P4)
   - Create workarounds for common issues

2. **Root Cause Analysis**:
   - Categorize tickets by type
   - Identify top issues driving volume
   - Determine if product bugs or user education
   - Review documentation completeness

3. **Mitigation**:
   - Deploy hotfixes for high-frequency bugs
   - Publish FAQ and self-service guides
   - Improve error messages and in-app help
   - Proactive communication to users

4. **Support Readiness**:
   - Additional training sessions
   - Update runbooks with learnings
   - Create troubleshooting decision trees
   - Validate escalation paths working

**Exit Criteria Impact**: Support team must be confident and staffed before exit

### Corrective Actions Not Completed

**Situation**: Hypercare exit criteria met, but corrective actions from incidents still open

**Actions**:
1. **Action Review**:
   - Prioritize actions: Critical (must complete) vs. Nice-to-Have (can defer)
   - Confirm owners and due dates
   - Escalate blocked items

2. **Exit Decision**:
   - If Critical actions incomplete: Conditional exit with deadline
   - If Nice-to-Have incomplete: Approve exit, track post-hypercare
   - Document all open actions in hypercare report

3. **Post-Hypercare Tracking**:
   - Weekly action review meetings
   - Project Manager owns tracking
   - Report to stakeholders monthly

4. **Accountability**:
   - Critical actions must complete within 2 weeks post-hypercare
   - Owners accountable for delivery
   - Escalate if deadlines missed

**Exit Criteria Impact**: Critical corrective actions may require conditional exit

## Agent Coordination

This flow coordinates with the following agents:

### Primary Agents

- **Reliability Engineer** (Lead)
  - SLO/SLI monitoring and reporting
  - Performance analysis and capacity planning
  - Incident triage and root cause analysis
  - ORR validation and hypercare metrics

- **Support Lead**
  - User feedback collection and analysis
  - Support ticket triage and resolution
  - Support team training and readiness
  - User adoption monitoring

- **Deployment Manager**
  - Incident response and rollback authority
  - Hotfix deployment coordination
  - Production environment validation
  - Change management during hypercare

### Supporting Agents

- **Component Owners**
  - Deep technical expertise for incidents
  - Code fixes and optimizations
  - Runbook updates

- **Product Owner**
  - User adoption analysis
  - Feature usage decisions
  - User communication

- **Security Gatekeeper**
  - Security incident response
  - Vulnerability remediation

- **Project Manager**
  - Hypercare coordination and reporting
  - Escalation management
  - Resource allocation

## References

- Operational Readiness Review: `templates/deployment/operational-readiness-review-template.md`
- SLO/SLI Definition: `templates/deployment/slo-sli-template.md`
- Incident Response Runbook: `templates/support/incident-response-runbook-template.md`
- Support Plan: `templates/support/support-plan-template.md`
- Gate Check: `commands/flow-gate-check.md`
- Handoff Checklist: `commands/flow-handoff-checklist.md`

## Notes

- **Hypercare Duration**: Adjust based on release complexity, risk, and organizational norms. Typical: 7 days (low-risk), 14 days (high-risk).
- **Exit Criteria Flexibility**: While zero P0/P1 incidents is ideal, conditional exit may be appropriate if incidents are well-understood and mitigated.
- **Continuous Improvement**: Hypercare is a learning opportunity. Capture lessons learned to improve future releases.
- **Team Wellbeing**: 24/7 on-call is demanding. Ensure adequate staffing, clear handoffs, and post-hypercare recovery time.
