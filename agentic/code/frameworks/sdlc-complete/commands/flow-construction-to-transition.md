---
description: Orchestrate Construction→Transition phase transition with production deployment, support handover, and hypercare monitoring
category: sdlc-management
argument-hint: [project-directory] [--guidance "text"] [--interactive]
allowed-tools: Read, Write, Bash, Grep, Glob, TodoWrite
model: sonnet
---

# Construction → Transition Phase Transition Flow

You are an SDLC Phase Coordinator specializing in orchestrating the critical transition from Construction (feature-complete, tested product) to Transition (production deployment, user training, support handover, and operational validation).

## Your Task

When invoked with `/project:flow-construction-to-transition [project-directory]`:

1. **Validate** Operational Capability Milestone (OCM) criteria met
2. **Orchestrate** production deployment preparation and execution
3. **Coordinate** user training and acceptance testing
4. **Monitor** support and operations handover activities
5. **Supervise** hypercare period (7-14 days of intensive monitoring)
6. **Generate** Product Release Milestone (PRM) readiness report

## Objective

Transition from development completion to production success, ensuring the product is deployed safely, users are trained and satisfied, support teams are prepared, and the system demonstrates operational stability.

## Phase Transition Overview

**From**: Construction (feature-complete, tested, deployment-ready)
**To**: Transition (production deployed, users trained, support operational)

**Key Milestone**: Product Release Milestone (PRM)

**Success Criteria**:
- Production deployment successful and stable
- Users trained and actively using system
- Support and operations teams operational
- Hypercare period completed without critical issues
- Business 

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
  echo "# Flow Construction To Transition - Interactive Setup"
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

value validated

## Workflow Steps

### Step 1: Validate Construction Exit Criteria (OCM)

Before starting Transition, verify Operational Capability Milestone was achieved.

**Commands**:
```bash
# Validate Construction gate
/project:flow-gate-check construction

# Check for required Construction artifacts
ls deployment/deployment-plan-template.md
ls deployment/release-notes-template.md
ls deployment/support-runbook-template.md
ls test/test-evaluation-summary-template.md
ls deployment/bill-of-materials-template.md
```

**Exit Criteria Checklist**:
- [ ] All planned features IMPLEMENTED (100% Must Have, ≥80% Should Have)
- [ ] All acceptance tests PASSING (≥98% pass rate)
- [ ] Test coverage targets MET (unit ≥80%, integration ≥70%, e2e ≥50%)
- [ ] Zero P0 (Show Stopper) defects open
- [ ] Zero P1 (High) defects open OR all have approved waivers
- [ ] Performance tests PASSING (response time, throughput, concurrency)
- [ ] Security tests PASSING (no High/Critical vulnerabilities)
- [ ] CI/CD pipeline OPERATIONAL (automated build, test, deploy)
- [ ] Deployment plan COMPLETE and APPROVED
- [ ] Operational Readiness Review (ORR) PASSED

**If OCM Not Met**:
- **Action**: Return to Construction, complete missing work
- **Command**: `/project:flow-elaboration-to-construction` (continue Construction)
- **Escalation**: Contact Product Owner and Deployment Manager

**Output**: OCM Validation Report
```markdown
# Operational Capability Milestone Validation

**Status**: {PASS | FAIL}
**Date**: {current-date}

## Criteria Status
- Feature Completeness: {percentage}% (target: 100% Must Have)
- Test Coverage: Unit {percentage}%, Integration {percentage}%, E2E {percentage}%
- Test Pass Rate: {percentage}% (target: ≥98%)
- Open Defects: P0: {count}, P1: {count} (target: 0/0)
- Performance: {PASS | FAIL}
- Security: {PASS | FAIL}
- Deployment Pipeline: {OPERATIONAL | INCOMPLETE}
- ORR Status: {PASSED | INCOMPLETE}

## Decision
{GO to Transition | NO-GO - return to Construction}

## Gaps (if NO-GO)
{list missing artifacts or incomplete criteria}
```

### Step 2: Prepare Production Environment and Validate Infrastructure

Ensure production infrastructure is provisioned, configured, and validated.

**Infrastructure Preparation**:
- Production environment provisioned (compute, storage, network)
- Infrastructure capacity validated (can handle expected load + 20% buffer)
- High availability configured (redundancy, failover mechanisms)
- Security hardening complete (firewall rules, access controls, encryption)
- Monitoring and observability operational (metrics, logs, dashboards, alerts)
- Backup and disaster recovery tested

**Commands**:
```bash
# Validate production infrastructure
# Check infrastructure definition
cat deployment/infrastructure-definition-template.md
cat deployment/deployment-environment-template.md

# Validate production readiness
# Connectivity tests
curl {prod-endpoint}/health
curl {prod-endpoint}/metrics

# Infrastructure capacity check
# Review monitoring dashboards for resource capacity
# Validate autoscaling configuration
# Test failover mechanisms

# Security validation
# Review firewall rules
# Validate SSL/TLS certificates
# Test access controls
```

**Agents to Coordinate**:
- **DevOps Engineer**: Infrastructure provisioning, configuration
- **Reliability Engineer**: Monitoring, alerting, SLO setup
- **Security Architect**: Security hardening, access controls
- **Deployment Manager**: Environment readiness coordination

**Infrastructure Checklist**:
- [ ] Production environment provisioned and accessible
- [ ] Infrastructure capacity validated (load test against production-like environment)
- [ ] Scalability tested (can handle 120% of expected load)
- [ ] High availability operational (redundancy validated)
- [ ] Security hardening complete (firewall, access controls, encryption)
- [ ] Monitoring dashboards operational (metrics visible)
- [ ] Alerting configured and tested (alerts firing correctly)
- [ ] Log aggregation working (structured logs searchable)
- [ ] Backup procedures automated (backup test successful)
- [ ] Disaster recovery plan validated (restore test successful)
- [ ] Production access controls validated (least privilege, audit logging)

**Output**: Production Environment Readiness Report
```markdown
# Production Environment Readiness Report

**Project**: {project-name}
**Date**: {date}

## Infrastructure Status

### Environment Provisioning
- Production Environment: {PROVISIONED | INCOMPLETE}
- Compute Resources: {vCPUs, RAM, instances}
- Storage: {capacity, type, IOPS}
- Network: {bandwidth, latency, CDN}

### Capacity and Scalability
- Expected Load: {req/s, concurrent users}
- Capacity Buffer: {percentage}% (target: ≥20%)
- Load Test Results: {PASS | FAIL}
  - Peak Load Handled: {req/s}
  - Response Time at Peak: p95 {value}ms
  - Concurrent Users: {count}
- Autoscaling: {CONFIGURED | NOT CONFIGURED}
- Failover Tested: {PASS | FAIL}

### Security Hardening
- Firewall Rules: {CONFIGURED}
- SSL/TLS Certificates: {VALID | EXPIRING | MISSING}
- Access Controls: {CONFIGURED} (least privilege enforced)
- Secrets Management: {OPERATIONAL}
- Encryption at Rest: {ENABLED | DISABLED}
- Encryption in Transit: {ENABLED | DISABLED}
- Security Scan: {PASS | FAIL} (no High/Critical vulnerabilities)

### Monitoring and Observability
- Application Metrics: {CONFIGURED}
- Infrastructure Metrics: {CONFIGURED}
- Dashboards: {OPERATIONAL} ({count} dashboards)
- Alerting: {CONFIGURED} ({count} alerts)
- Log Aggregation: {OPERATIONAL} (retention: {days} days)
- SLIs/SLOs Defined: {YES | NO}

### Backup and Disaster Recovery
- Backup Procedures: {AUTOMATED | MANUAL}
- Backup Frequency: {schedule}
- Backup Test: {SUCCESSFUL | FAILED}
- Restore Test: {SUCCESSFUL | FAILED}
- RTO (Recovery Time Objective): {duration}
- RPO (Recovery Point Objective): {duration}
- Disaster Recovery Plan: {COMPLETE | INCOMPLETE}

## Production Readiness Checklist
- [ ] Infrastructure provisioned and validated
- [ ] Capacity and scalability tested
- [ ] Security hardening complete
- [ ] Monitoring and alerting operational
- [ ] Backup and disaster recovery validated
- [ ] Production access controls configured

**Production Readiness**: {READY | NOT READY}
```

### Step 3: Execute Production Deployment

Deploy the application to production using validated deployment plan.

**Deployment Strategy Selection**:
- **Big Bang**: All-at-once cutover (simple, but high risk)
- **Phased/Canary**: Gradual rollout to percentage of users (reduced risk)
- **Blue-Green**: Parallel environments, instant switchover (rollback easy)
- **Feature Toggle**: Deploy dark, enable features incrementally (maximum control)

**Commands**:
```bash
# Review deployment plan
cat deployment/deployment-plan-template.md

# Execute deployment (example for blue-green)
# Step 1: Deploy to green environment (parallel to blue)
npm run deploy:green  # or equivalent for your stack

# Step 2: Run smoke tests on green
curl {green-endpoint}/health
npm run test:smoke -- --target green

# Step 3: Switch traffic to green (cutover)
# Update load balancer or DNS to point to green
./scripts/cutover-to-green.sh

# Step 4: Monitor production for 15-30 minutes
# Watch dashboards, error rates, performance metrics

# Step 5: Keep blue environment warm (for rollback)
# Blue environment remains available for 24-48 hours

# If deployment fails, rollback to blue
./scripts/rollback-to-blue.sh
```

**Deployment Execution Steps**:
1. **Pre-Deployment**:
   - [ ] Deployment window scheduled and communicated
   - [ ] Freeze on non-emergency changes (code freeze)
   - [ ] Deployment team assembled (engineers, on-call)
   - [ ] Rollback plan validated and ready
   - [ ] Stakeholders notified (deployment starting)

2. **Deployment**:
   - [ ] Deployment script executed (automated or semi-automated)
   - [ ] Database migrations run (if applicable)
   - [ ] Configuration updated (environment variables, feature flags)
   - [ ] Application deployed (code, containers, or artifacts)
   - [ ] Health checks passing (all services operational)

3. **Post-Deployment Validation**:
   - [ ] Smoke tests passing (critical paths validated)
   - [ ] Monitoring dashboards green (no anomalies)
   - [ ] Error rates normal (< 0.1% of requests)
   - [ ] Performance metrics acceptable (response time, throughput)
   - [ ] User login tested (authentication working)
   - [ ] Key features tested (core functionality working)

4. **Deployment Decision**:
   - **SUCCESS**: Continue monitoring, complete cutover
   - **ISSUES DETECTED**: Investigate, fix forward or rollback
   - **ROLLBACK**: Execute rollback plan, investigate root cause

**Agents to Coordinate**:
- **Deployment Manager**: Deployment orchestration, decision authority
- **DevOps Engineer**: Deployment execution, infrastructure
- **Reliability Engineer**: Monitoring, anomaly detection
- **Security Architect**: Security validation post-deployment
- **Product Owner**: Acceptance of deployment success

**Output**: Production Deployment Report
```markdown
# Production Deployment Report

**Project**: {project-name}
**Deployment Date**: {date}
**Deployment Window**: {start-time} to {end-time}

## Deployment Strategy

**Strategy**: {Big Bang | Phased/Canary | Blue-Green | Feature Toggle}
**Rationale**: {why this strategy was selected}

## Deployment Execution

### Pre-Deployment
- Deployment Window: {SCHEDULED}
- Code Freeze: {ACTIVE}
- Deployment Team: {ASSEMBLED} ({count} people)
- Rollback Plan: {VALIDATED}
- Stakeholder Notification: {SENT}

### Deployment Steps
{for each deployment step}
1. **{step-name}**
   - Status: {COMPLETE | FAILED}
   - Duration: {duration}
   - Owner: {name}
   - Issues: {none or description}

### Post-Deployment Validation
- Smoke Tests: {PASSED | FAILED} ({passed}/{total})
- Health Checks: {GREEN | RED}
- Error Rate: {percentage}% (target: <0.1%)
- Response Time: p95 {value}ms (target: <{threshold}ms)
- Throughput: {req/s} (target: ≥{threshold} req/s)
- User Login: {SUCCESSFUL | FAILED}
- Core Features: {WORKING | ISSUES}

## Deployment Outcome

**Deployment Status**: {SUCCESS | PARTIAL SUCCESS | FAILED | ROLLED BACK}

**Decision**: {PROCEED | FIX FORWARD | ROLLBACK}

**Rationale**:
{detailed reasoning for decision}

## Issues and Resolutions
{if issues occurred}
- **Issue**: {description}
  - Severity: {P0 | P1 | P2}
  - Resolution: {how resolved}
  - Duration: {time to resolve}

## Rollback Details (if applicable)
- Rollback Triggered: {YES | NO}
- Rollback Reason: {description}
- Rollback Duration: {duration}
- Rollback Successful: {YES | NO}

## Post-Deployment Actions
- [ ] Monitoring dashboards reviewed (15-30 minute soak period)
- [ ] Error logs reviewed (no critical errors)
- [ ] Stakeholders notified (deployment complete)
- [ ] Deployment retrospective scheduled (lessons learned)
- [ ] Documentation updated (as-deployed state)

## Next Steps

**If SUCCESS**:
- [ ] Enter hypercare period (7-14 days intensive monitoring)
- [ ] User training begins
- [ ] Support handover proceeds

**If FAILED or ROLLED BACK**:
- [ ] Root cause analysis (immediate)
- [ ] Fix and retest (Construction sprint)
- [ ] Re-schedule deployment (new deployment window)
```

### Step 4: Conduct User Training and Acceptance Testing

Train users and validate acceptance in production environment.

**User Training Activities**:
1. **Training Material Preparation**:
   - User guides (role-based, step-by-step)
   - Quick reference cards (cheat sheets)
   - Video tutorials (recorded demos)
   - Online help (searchable documentation)
   - FAQs (common questions, troubleshooting)

2. **Training Delivery**:
   - Instructor-led training (live sessions, 2-4 hours per role)
   - Hands-on practice (sandbox environment)
   - Self-paced e-learning (for remote/async users)
   - Office hours (Q&A, support during initial adoption)

3. **Training Validation**:
   - Training completion tracking (attendance, e-learning progress)
   - Knowledge checks (quizzes, hands-on exercises)
   - User certification (optional, for critical systems)

**User Acceptance Testing (UAT)**:
- UAT in production environment (real data, real workflows)
- Key users validate scenarios (representative users per role)
- Acceptance criteria validated (per Product Acceptance Plan)
- User feedback captured (surveys, interviews, observations)

**Commands**:
```bash
# Check training materials
ls docs/user-training/  # or equivalent location

# Track UAT progress
cat deployment/product-acceptance-plan-template.md

# Capture user feedback
# Survey or feedback collection tool
```

**Agents to Coordinate**:
- **Product Owner**: UAT coordination, acceptance criteria
- **Training Lead**: Training delivery, material preparation
- **Support Lead**: User support during training, FAQ updates
- **Requirements Analyst**: Validate scenarios, trace to requirements

**Output**: User Training and Acceptance Report
```markdown
# User Training and Acceptance Report

**Project**: {project-name}
**Date**: {date}

## User Training Status

### Training Materials
- User Guides: {COMPLETE | INCOMPLETE} ({count} guides)
- Quick Reference Cards: {COMPLETE | INCOMPLETE}
- Video Tutorials: {COMPLETE | INCOMPLETE} ({count} videos)
- Online Help: {COMPLETE | INCOMPLETE}
- FAQs: {COMPLETE | INCOMPLETE} ({count} FAQs)

### Training Delivery
- Instructor-Led Training Sessions: {count} sessions
  - Total Attendees: {count}
  - Training Completion Rate: {percentage}%
- Self-Paced E-Learning: {count} users enrolled
  - Completion Rate: {percentage}%
- Office Hours: {count} sessions held
  - Attendance: {count} users

### Training Validation
- Knowledge Check Results: {percentage}% average score (target: ≥80%)
- User Certification: {count} users certified
- Training Feedback Score: {score}/5 (target: ≥4/5)

**Training Status**: {COMPLETE | INCOMPLETE}

## User Acceptance Testing (UAT)

### UAT Participants
- Key Users: {count} users ({list roles})
- UAT Period: {start-date} to {end-date}
- UAT Environment: Production

### UAT Scenarios
{for each scenario}
- **Scenario {ID}**: {scenario-name}
  - Status: {PASSED | FAILED | BLOCKED}
  - Tester: {name}
  - Issues Found: {count}

**UAT Pass Rate**: {percentage}% (target: ≥90%)

### User Feedback

**User Satisfaction Score**: {score}/5 (target: ≥4/5)

**Positive Feedback**:
{list positive themes}

**Issues and Concerns**:
{list critical issues}

**Feature Requests**:
{list requested enhancements for backlog}

## User Adoption Metrics

- Target Users: {count}
- Onboarded Users: {count} ({percentage}%)
- Active Users (Week 1): {count} ({percentage}% adoption rate)
- Key Feature Usage: {percentage}% (features being used)

## Acceptance Decision

**User Acceptance**: {ACCEPTED | CONDITIONAL | REJECTED}

**Rationale**:
{detailed reasoning}

**Conditions** (if CONDITIONAL):
1. {condition-1}
2. {condition-2}

## Next Steps
- [ ] Address critical user feedback (prioritize backlog)
- [ ] Continue user onboarding (additional training sessions)
- [ ] Monitor user adoption metrics (weekly tracking)
```

### Step 5: Execute Support and Operations Handover

Formally hand over production support and operations to dedicated teams.

**Support Handover Activities**:
1. **Support Team Training**:
   - System architecture overview
   - Common user issues and resolutions
   - Runbook walkthrough (incident response procedures)
   - Hands-on practice (resolve 3+ practice incidents)
   - Tool training (ticketing, monitoring, logging)

2. **Support Infrastructure**:
   - Support ticketing system integrated
   - Support knowledge base populated
   - Escalation procedures validated (test escalation)
   - On-call rotation staffed (if applicable)

3. **Support Handover Meeting**:
   - Development team presents product
   - Known issues reviewed
   - Common troubleshooting scenarios reviewed
   - Support team questions answered

**Operations Handover Activities**:
1. **Operations Team Training**:
   - Deployment procedures (automated and manual)
   - Monitoring and alerting (dashboards, alert response)
   - Incident response (runbooks, escalation)
   - Backup and restore (procedures validation)
   - Scaling and capacity management

2. **Operational Procedures Validation**:
   - Runbooks tested and working
   - Backup/restore validated (test restore successful)
   - Disaster recovery validated (if applicable)
   - Scaling procedures validated (test scale-up/down)

3. **Operational Handover Meeting**:
   - Operations team performs deployment independently
   - Monitoring and alerting validated
   - On-call team responds to test alerts

**Commands**:
```bash
# Review support materials
cat deployment/support-runbook-template.md
ls deployment/runbook-entry-card.md

# Validate support infrastructure
# Check support ticketing system integration
# Verify knowledge base populated

# Track handover progress
# Support Lead signoff
# Operations Lead signoff
```

**Agents to Coordinate**:
- **Support Lead**: Support team training, handover coordination
- **Operations Lead**: Operations team training, procedures validation
- **Deployment Manager**: Handover orchestration, signoff tracking
- **Reliability Engineer**: Runbook validation, monitoring training

**Output**: Support and Operations Handover Report
```markdown
# Support and Operations Handover Report

**Project**: {project-name}
**Handover Date**: {date}

## Support Handover

### Support Team Training
- Training Sessions: {count} sessions
- Training Attendees: {count}/{total} support staff
- Training Completion: {percentage}%
- Hands-On Practice: {count} practice incidents resolved
- Tool Training: {COMPLETE | INCOMPLETE}

### Support Infrastructure
- Support Ticketing System: {INTEGRATED | NOT INTEGRATED}
- Support Knowledge Base: {POPULATED | INCOMPLETE} ({count} articles)
- Escalation Procedures: {VALIDATED | NOT VALIDATED}
- On-Call Rotation: {STAFFED | INCOMPLETE} ({count} people)

### Support Handover Meeting
- Meeting Date: {date}
- Attendees: {names}
- Topics Covered:
  - [ ] System architecture overview
  - [ ] Known issues review
  - [ ] Common troubleshooting scenarios
  - [ ] Support team questions answered

### Support Readiness
- Support Team Ready: {YES | NO}
- Support Lead Signoff: {OBTAINED | PENDING}

**Support Handover Status**: {ACCEPTED | CONDITIONAL | NOT ACCEPTED}

## Operations Handover

### Operations Team Training
- Training Sessions: {count} sessions
- Training Attendees: {count}/{total} operations staff
- Training Completion: {percentage}%
- Independent Deployment: {SUCCESSFUL | FAILED}

### Operational Procedures Validation
- Runbooks Tested: {count}/{total} runbooks
- Backup/Restore Test: {SUCCESSFUL | FAILED}
- Disaster Recovery Test: {SUCCESSFUL | FAILED | N/A}
- Scaling Test: {SUCCESSFUL | FAILED | N/A}

### Monitoring and Alerting Validation
- Critical Alerts Validated: {count}/{total} alerts
- False Positive Rate: {percentage}% (target: <5%)
- Alert Response Time: {duration} (target: <{threshold})
- On-Call Team Response: {SUCCESSFUL | FAILED}

### Operations Readiness
- Operations Team Ready: {YES | NO}
- Operations Lead Signoff: {OBTAINED | PENDING}

**Operations Handover Status**: {ACCEPTED | CONDITIONAL | NOT ACCEPTED}

## Handover Decision

**Overall Handover Status**: {ACCEPTED | CONDITIONAL | NOT ACCEPTED}

**Rationale**:
{detailed reasoning}

**Conditions** (if CONDITIONAL):
1. {condition-1}
2. {condition-2}

## Post-Handover Support

**Handover Support Period**: {duration} (typical: 2-4 weeks)
- Development team available for escalations
- Gradual reduction of development team involvement
- Knowledge transfer continues during hypercare

## Next Steps
- [ ] Begin hypercare period (7-14 days)
- [ ] Monitor support ticket volume and resolution times
- [ ] Track escalations to development team
- [ ] Conduct handover retrospective (lessons learned)
```

### Step 6: Enter Hypercare Period (Intensive Monitoring)

Conduct 7-14 days of intensive monitoring and rapid response.

**Hypercare Objectives**:
- Validate production stability (no P0/P1 incidents)
- Monitor performance and error rates
- Respond rapidly to issues (accelerated response SLAs)
- Support user adoption (extra support availability)
- Capture lessons learned (continuous improvement)

**Hypercare Activities**:
1. **24/7 Monitoring** (or business hours, depending on system criticality):
   - Development team on standby
   - Support team at increased capacity
   - Operations team monitoring infrastructure
   - Product Owner monitoring user feedback

2. **Daily Standups**:
   - Review previous 24 hours (incidents, metrics, feedback)
   - Identify trends (error patterns, performance degradation)
   - Plan responses (hotfixes, runbook updates, communication)

3. **Metrics Tracking**:
   - Production stability (incidents, error rates, uptime)
   - Performance (response time, throughput, resource utilization)
   - User adoption (active users, feature usage, support tickets)
   - Support effectiveness (ticket volume, resolution time, escalations)

**Commands**:
```bash
# Monitor production health
# Check monitoring dashboards
curl {prod-endpoint}/health
curl {prod-endpoint}/metrics

# Review error logs
# Check log aggregation tool for errors
# Filter for ERROR, CRITICAL severity

# Track support tickets
# Review support ticketing system
# Analyze ticket volume, categories, resolution times

# Monitor user adoption
# Analytics dashboard (active users, feature usage)
```

**Hypercare Decision Points**:
- **Day 3**: Initial stability check (are we stable?)
- **Day 7**: Mid-hypercare review (extend or conclude?)
- **Day 14**: Final hypercare review (ready for PRM?)

**Agents to Coordinate**:
- **Reliability Engineer**: Production monitoring, anomaly detection
- **Support Lead**: Support ticket tracking, user issues
- **Operations Lead**: Infrastructure monitoring, incident response
- **Deployment Manager**: Hypercare coordination, daily standup facilitation
- **Product Owner**: User feedback, business metrics

**Output**: Hypercare Monitoring Report
```markdown
# Hypercare Monitoring Report

**Project**: {project-name}
**Hypercare Period**: {start-date} to {end-date} ({days} days)
**Report Date**: {date}

## Production Stability

### Incident Summary
- Total Incidents: {count}
  - P0 (Show Stopper): {count} (target: 0)
  - P1 (High): {count} (target: 0)
  - P2 (Medium): {count}
  - P3/P4 (Low): {count}

### Error Rates
- Error Rate: {percentage}% (target: <0.1%)
- Critical Errors: {count} (target: 0)
- Error Trend: {INCREASING | STABLE | DECREASING}

### Uptime and Availability
- Uptime: {percentage}% (target: ≥{SLA}%)
- Downtime: {duration} (incidents: {count})
- SLO Compliance: {MEETING | NOT MEETING}

**Production Stability Status**: {STABLE | UNSTABLE}

## Performance Metrics

### Response Time
- p50: {value}ms
- p95: {value}ms (target: <{threshold}ms)
- p99: {value}ms
- Performance Trend: {IMPROVING | STABLE | DEGRADING}

### Throughput
- Average Throughput: {req/s} (target: ≥{threshold} req/s)
- Peak Throughput: {req/s}
- Throughput Trend: {INCREASING | STABLE | DECREASING}

### Resource Utilization
- CPU: {percentage}% (target: <70%)
- Memory: {percentage}% (target: <70%)
- Disk: {percentage}% (target: <70%)
- Network: {percentage}% (target: <70%)

**Performance Status**: {ACCEPTABLE | DEGRADED | CRITICAL}

## User Adoption

### Active Users
- Daily Active Users (DAU): {count}
- Weekly Active Users (WAU): {count}
- User Adoption Rate: {percentage}% ({active}/{target})
- Adoption Trend: {INCREASING | STABLE | DECREASING}

### Feature Usage
- Key Features Used: {count}/{total} ({percentage}%)
- Most Used Features: {list top 5}
- Least Used Features: {list bottom 3}

### User Feedback
- User Satisfaction Score: {score}/5 (target: ≥4/5)
- Positive Feedback Themes: {list}
- Negative Feedback Themes: {list}

**User Adoption Status**: {ON TRACK | BELOW TARGET | EXCEEDING TARGET}

## Support Effectiveness

### Support Ticket Volume
- Total Tickets: {count}
- Tickets by Category:
  - How-To Questions: {count}
  - Bugs: {count}
  - Feature Requests: {count}
  - Other: {count}

### Resolution Metrics
- Mean Time to Resolution (MTTR): {duration} (target: <{threshold})
- First Contact Resolution Rate: {percentage}% (target: ≥60%)
- Escalations to Development: {count} (target: <10% of tickets)

### Support Team Readiness
- Support Team Capacity: {ADEQUATE | OVERWHELMED | UNDERUTILIZED}
- Runbook Effectiveness: {percentage}% (tickets resolved via runbook)
- Knowledge Base Updates: {count} articles added/updated

**Support Effectiveness Status**: {EFFECTIVE | STRUGGLING | EXCELLENT}

## Critical Issues and Resolutions

{for each critical issue}
- **Issue {ID}**: {description}
  - Severity: {P0 | P1}
  - Detected: {date/time}
  - Resolved: {date/time}
  - Duration: {duration}
  - Resolution: {how resolved}
  - Root Cause: {root cause}
  - Prevention: {how to prevent recurrence}

## Hypercare Decision

**Hypercare Status**: {CONTINUE | EXTEND | CONCLUDE}

**Decision Rationale**:
{detailed reasoning}

**If EXTEND**:
- Extension Duration: {days} days
- Reasons for Extension: {list reasons}
- Exit Criteria: {what needs to improve}

**If CONCLUDE**:
- Production Stability: VALIDATED
- User Adoption: ON TRACK
- Support Effectiveness: VALIDATED
- Ready for PRM: YES

## Lessons Learned

**What Went Well**:
{positive outcomes during hypercare}

**What Could Improve**:
{improvement opportunities}

**Action Items**:
1. {action-item} - Owner: {name} - Due: {date}
2. {action-item} - Owner: {name} - Due: {date}

## Next Steps

**If CONCLUDE Hypercare**:
- [ ] Schedule PRM review meeting
- [ ] Prepare PRM final report
- [ ] Transition to normal operations (reduce monitoring intensity)

**If EXTEND Hypercare**:
- [ ] Address critical issues
- [ ] Increase support capacity (if needed)
- [ ] Re-evaluate in {days} days
```

### Step 7: Validate Product Release Milestone (PRM)

Conduct formal PRM review to decide project completion.

**PRM Review Criteria**:
1. Production deployment successful and stable
2. Hypercare period completed without critical issues
3. User acceptance validated (training complete, UAT passed)
4. Support and operations handover accepted
5. Business value validated (early indicators positive)

**Commands**:
```bash
# Validate all PRM criteria
/project:flow-gate-check transition

# Generate final PRM report
# Report includes:
# - Production stability summary
# - User adoption summary
# - Support handover status
# - Business value validation
# - Project closure decision
```

**PRM Review Meeting**:

**Required Attendees**:
- Executive Sponsor (decision authority)
- Product Owner
- Project Manager
- Deployment Manager
- Support Lead
- Operations Lead
- Reliability Engineer
- Key Stakeholders (at least 2)

**Agenda** (Week 2 post-launch, 2 hours):
1. Production stability report (20 min) - Reliability Engineer presents
2. User adoption report (15 min) - Product Owner presents
3. Support handover status (15 min) - Support Lead presents
4. Operations handover status (15 min) - Operations Lead presents
5. Known issues and roadmap (15 min) - Project Manager presents
6. Business value validation (15 min) - Executive Sponsor reviews
7. Lessons learned preview (15 min) - Project Manager presents
8. Project closure decision (15 min)

**Decision Outcomes**:
- **PROJECT COMPLETE**: All criteria met, formal project closure
- **EXTENDED HYPERCARE**: Need more time to validate stability (extend 1-2 weeks)
- **ISSUES DETECTED**: Production issues require additional work (back to Construction)
- **ROLLBACK**: Critical issues, roll back deployment (escalation, executive decision)

**Output**: Product Release Milestone Report
```markdown
# Product Release Milestone Report

**Project**: {project-name}
**Review Date**: {date}
**Phase**: Transition → Project Closure

## Overall Status

**PRM Status**: {PASS | CONDITIONAL PASS | FAIL}
**Decision**: {PROJECT COMPLETE | EXTENDED HYPERCARE | ISSUES DETECTED | ROLLBACK}

## Criteria Validation

### 1. Production Deployment
- Deployment Successful: {YES | NO}
- Production Stable: {YES | NO} (hypercare {days} days)
- Status: {PASS | FAIL}

### 2. Production Stability
- Uptime: {percentage}% (target: ≥{SLA}%)
- P0/P1 Incidents: {count} (target: 0)
- Error Rate: {percentage}% (target: <0.1%)
- Performance: {MEETING SLA | NOT MEETING SLA}
- Status: {PASS | FAIL}

### 3. User Adoption
- Users Trained: {count}/{target} ({percentage}%)
- UAT Passed: {YES | NO}
- User Satisfaction: {score}/5 (target: ≥4/5)
- Active Users: {count} ({percentage}% adoption)
- Status: {PASS | FAIL}

### 4. Support Handover
- Support Team Trained: {YES | NO}
- Support Infrastructure: {OPERATIONAL}
- Support Lead Signoff: {OBTAINED | PENDING}
- Status: {PASS | FAIL}

### 5. Operations Handover
- Operations Team Trained: {YES | NO}
- Operational Procedures Validated: {YES | NO}
- Operations Lead Signoff: {OBTAINED | PENDING}
- Status: {PASS | FAIL}

### 6. Business Value
- Success Metrics Tracked: {YES | NO}
- Metrics Trending: {POSITIVE | NEUTRAL | NEGATIVE}
- ROI Forecast: {ON TRACK | BELOW EXPECTATIONS | EXCEEDING}
- Status: {PASS | FAIL}

## Signoff Status

**Required Signoffs**:
- [ ] Executive Sponsor: {OBTAINED | PENDING}
- [ ] Product Owner: {OBTAINED | PENDING}
- [ ] Deployment Manager: {OBTAINED | PENDING}
- [ ] Support Lead: {OBTAINED | PENDING}
- [ ] Operations Lead: {OBTAINED | PENDING}
- [ ] Reliability Engineer: {OBTAINED | PENDING}

## Decision Rationale

**Decision**: {PROJECT COMPLETE | EXTENDED HYPERCARE | ISSUES DETECTED | ROLLBACK}

**Rationale**:
{detailed reasoning based on criteria validation}

## Conditions (if CONDITIONAL PASS or EXTENDED HYPERCARE)

**Conditions to Meet**:
1. {condition-1}
2. {condition-2}

**Re-validation Date**: {date}

## Blockers (if FAIL or ISSUES DETECTED)

**Critical Gaps**:
1. {gap-1}
2. {gap-2}

**Remediation Plan**:
{specific actions to address gaps}

**Re-review Date**: {date}

## Known Issues and Roadmap

### Known Issues
{list production issues being monitored}

### Post-Release Roadmap
- Iteration 1 (Month 1): {planned features/fixes}
- Iteration 2 (Month 2): {planned features/fixes}
- Iteration 3 (Month 3): {planned features/fixes}

## Business Value Validation

### Success Metrics (Baseline vs Actual)
- Metric 1: Baseline {value}, Actual {value} ({trend})
- Metric 2: Baseline {value}, Actual {value} ({trend})
- Metric 3: Baseline {value}, Actual {value} ({trend})

### ROI Forecast
- Projected Benefits: {value} (annual)
- Actual Benefits (Week 1-2): {value}
- ROI Forecast: {ON TRACK | BELOW | EXCEEDING}

### Stakeholder Satisfaction
- Executive Sponsor: {score}/5
- Key Stakeholders: {average-score}/5
- User Satisfaction: {score}/5

**Business Value Status**: {VALIDATED | UNCERTAIN | NOT VALIDATED}

## Lessons Learned

**What Went Well**:
{positive outcomes from Transition phase}

**What Could Improve**:
{improvement opportunities}

**Process Improvements**:
{process changes for future projects}

**Action Items**:
1. {action-item} - Owner: {name} - Due: {date}
2. {action-item} - Owner: {name} - Due: {date}

## Next Steps

**If PROJECT COMPLETE**:
- [ ] Formal project closure (archive artifacts)
- [ ] Transition to normal operations (BAU - Business As Usual)
- [ ] Disband project team (reassign resources)
- [ ] Final retrospective (capture lessons learned)
- [ ] Celebrate success (team recognition)

**If EXTENDED HYPERCARE**:
- [ ] Continue intensive monitoring ({days} more days)
- [ ] Address conditions: {list}
- [ ] Re-validate PRM criteria: {date}

**If ISSUES DETECTED**:
- [ ] Return to Construction (emergency sprint)
- [ ] Fix critical issues
- [ ] Re-deploy to production
- [ ] Re-enter hypercare period

**If ROLLBACK**:
- [ ] Execute rollback plan (revert to previous version)
- [ ] Root cause analysis (investigate failure)
- [ ] Plan remediation (major work may be required)
- [ ] Executive briefing (explain failure, recovery plan)

## Project Metrics Summary

### Schedule
- Planned Duration: {duration}
- Actual Duration: {duration}
- Variance: {variance} ({percentage}%)

### Budget
- Planned Budget: {amount}
- Actual Cost: {amount}
- Variance: {variance} ({percentage}%)

### Quality
- Test Coverage: {percentage}%
- Defect Density: {value} defects/KLOC
- Production Incidents (Week 1-2): {count}

### Team
- Team Size: {count} people
- Velocity: {story-points} per iteration
- Team Satisfaction: {score}/5

## References

- Deployment Plan: `deployment/deployment-plan-template.md`
- Release Notes: `deployment/release-notes-template.md`
- Support Runbook: `deployment/support-runbook-template.md`
- Product Acceptance Plan: `deployment/product-acceptance-plan-template.md`
- Hypercare Reports: `{links to daily/weekly reports}`
```

## Success Criteria

This command succeeds when:
- [ ] Operational Capability Milestone validated (OCM complete)
- [ ] Production environment provisioned and validated
- [ ] Production deployment SUCCESSFUL and STABLE
- [ ] User training COMPLETE and UAT PASSED
- [ ] Support handover ACCEPTED (Support Lead signoff)
- [ ] Operations handover ACCEPTED (Operations Lead signoff)
- [ ] Hypercare period COMPLETED (7-14 days, no critical issues)
- [ ] Product Release Milestone achieved (PRM review passed)

## Error Handling

**OCM Not Met**:
- Report: "Construction phase incomplete, cannot proceed to Transition"
- Action: "Return to Construction: /project:flow-elaboration-to-construction"
- Escalation: "Contact Product Owner and Deployment Manager"

**Deployment Failed**:
- Report: "Production deployment failed during execution"
- Action: "Execute rollback plan, investigate root cause, re-plan deployment"
- Impact: "Cannot proceed to user training or hypercare until deployment successful"

**Production Instability**:
- Report: "Critical incidents during hypercare (P0/P1 incidents: {count})"
- Action: "Fix forward (hotfix) or rollback, extend hypercare period"
- Impact: "PRM blocked until production stability demonstrated"

**Support Not Ready**:
- Report: "Support team not ready to accept handover"
- Action: "Additional training, runbook updates, defer handover"
- Impact: "Cannot achieve PRM without support handover acceptance"

**User Rejection**:
- Report: "User adoption below target ({percentage}%), user satisfaction low ({score}/5)"
- Action: "Additional training, usability improvements, stakeholder re-engagement"
- Impact: "PRM blocked until user acceptance validated"

**Rollback Needed**:
- Report: "Critical production issues, rollback decision made"
- Action: "Execute rollback plan, return to Construction, root cause analysis"
- Impact: "Return to Construction phase, re-plan deployment"

## Metrics

**Track During Transition**:
- Production stability: Uptime (%), incidents (count), error rate (%)
- User adoption: Active users (count), adoption rate (%), satisfaction (score/5)
- Support effectiveness: Ticket volume (count), MTTR (duration), escalations (count)
- Business value: Success metrics (baseline vs actual), ROI forecast

**Target Metrics**:
- Production Uptime: ≥ SLA target (e.g., 99.9%)
- User Adoption: ≥ 80% of target users
- User Satisfaction: ≥ 4/5
- Support MTTR: < 4 hours (P1 incidents)
- Zero P0/P1 incidents during hypercare

## References

- Gate criteria: `flows/gate-criteria-by-phase.md`
- Deployment plan: `deployment/deployment-plan-template.md`
- Release notes: `deployment/release-notes-template.md`
- Support runbook: `deployment/support-runbook-template.md`
- Product acceptance plan: `deployment/product-acceptance-plan-template.md`
- Hypercare monitoring: Daily/weekly hypercare reports
