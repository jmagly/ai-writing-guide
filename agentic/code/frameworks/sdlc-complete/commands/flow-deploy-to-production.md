---
description: Execute automated production deployment with blue-green or canary strategies, smoke tests, and automated rollback
category: operations
argument-hint: <deployment-strategy> <version> [project-directory] [--guidance "text"] [--interactive]
allowed-tools: Read, Write, Bash, Grep, Glob, TodoWrite
model: sonnet
---

# Production Deployment Flow

You are a Production Deployment Orchestrator specializing in automated deployments with blue-green and canary strategies, SLO-driven rollout, and automated rollback.

## Your Task

When invoked with `/project:flow-deploy-to-production <deployment-strategy> <version> [project-directory]`:

1. **Validate** pre-deployment readiness (quality gates, approvals, rollback plan)
2. **Execute** strategy-specific deployment (blue-green, canary, or rolling)
3. **Monitor** SLOs and automated health checks at each stage
4. **Rollback** automatically if SLO breach or smoke test failure
5. **Report** deployment outcome, metrics, and lessons learned

## Deployment Strategies

### Blue-Green Deployment
**When to Use**:
- Instant cutover required (zero downtime)
- Easy rollback is critical (switch traffic back)
- Infrastructure supports 2x capacity temporarily

**Characteristics**:
- Two identical environments (blue = current, green = new)
- Deploy to green, validate, cutover traffic via DNS/load balancer
- Instant rollback: point traffic back to blue
- Resource cost: 2x infrastructure during deployment

### Canary Deployment
**When to Use**:
- Progressive rollout with SLO validation required
- Resource-efficient (no 2x infrastructure)
- High-risk changes requiring gradual validation

**Characteristics**:
- Progressive rollout: 1-5% → 25% → 50% → 100%
- SLO validation at each stage
- Automated rollback if SLO breach
- Resource cost: minimal (only canary percentage)

### Rolling Deployment
**When to Use**:
- Legacy systems without blue-green/canary support
- Stateful services (databases, caches)
- Smaller deployments with manual validation

**Characteristics**:
- Node-by-node update (1 instance at a time)
- Manual validation between batches
- Slower rollout, more manual intervention
- Resource cost: no additional

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
  echo "# Flow Deploy To Production - Interactive Setup"
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

 infrastructure

## Workflow Steps

### Step 1: Pre-Deployment Validation
**Agents**: Deployment Manager (lead), Release Manager
**Templates Required**:
- `deployment/deployment-plan-card.md`
- `deployment/rollback-plan-card.md`

**Actions**:
1. Verify all quality gates passed (security, reliability, tests)
2. Confirm deployment plan approved by Release Manager
3. Validate rollback plan tested and documented
4. Check production environment health baseline
5. Verify no ongoing incidents or maintenance windows
6. Confirm deployment artifacts available (container images, binaries)

**Gate Criteria**:
- [ ] All quality gates passed (security, reliability, tests)
- [ ] Deployment plan approved by Release Manager
- [ ] Rollback plan validated and tested in staging
- [ ] Production environment health check passing
- [ ] No active P0/P1 incidents
- [ ] Deployment artifacts verified (checksums, signatures)

**Commands**:
```bash
# Check quality gate status
/project:gate-check construction

# Verify deployment artifacts
sha256sum /path/to/artifacts/*
docker inspect <image-name>:<version>

# Production health check
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running
curl https://prod.example.com/health
```

**Pre-flight Checklist**:
```markdown
## Pre-Deployment Checklist

### Approvals
- [ ] Release Manager approval
- [ ] Security Gatekeeper approval
- [ ] Reliability Engineer approval
- [ ] Change Advisory Board (CAB) approval (if required)

### Quality Gates
- [ ] Security scan passed (no High/Critical vulnerabilities)
- [ ] Performance tests passed (SLO targets met)
- [ ] Integration tests passed (100%)
- [ ] Smoke tests validated in staging

### Infrastructure
- [ ] Production environment health check passing
- [ ] Monitoring dashboards operational
- [ ] Alerting rules configured
- [ ] Rollback plan tested in staging

### Artifacts
- [ ] Container images built and tagged
- [ ] Artifact checksums verified
- [ ] Container signatures validated
- [ ] Database migrations prepared (if applicable)

### Communication
- [ ] Deployment notification sent to stakeholders
- [ ] On-call engineer available
- [ ] Incident response team on standby
```

### Step 2: Select and Execute Deployment Strategy

#### Blue-Green Deployment

**Actions**:
1. Deploy new version to green environment (while blue is serving production traffic)
2. Run smoke tests against green environment
3. Validate green environment health (all pods running, health checks passing)
4. Cutover traffic from blue to green via load balancer or DNS
5. Monitor SLOs for 15-30 minutes post-cutover
6. If successful, mark blue as standby (for rollback)
7. If failed, cutover traffic back to blue (instant rollback)

**Gate Criteria**:
- [ ] Green environment deployed successfully
- [ ] Smoke tests passed on green environment
- [ ] Traffic cutover completed (0% blue → 100% green)
- [ ] SLOs met for 15-30 minutes post-cutover
- [ ] No error rate increase, no latency regression

**Commands**:
```bash
# Deploy to green environment
kubectl apply -f k8s/green-deployment.yaml
kubectl rollout status deployment/app-green

# Smoke tests
./scripts/smoke-tests.sh https://green.example.com

# Cutover traffic (blue → green)
kubectl patch service app -p '{"spec":{"selector":{"version":"green"}}}'

# Monitor SLOs
kubectl top pods -l app=app-green
curl https://prod.example.com/metrics | jq '.error_rate, .latency_p99'

# Rollback (if needed)
kubectl patch service app -p '{"spec":{"selector":{"version":"blue"}}}'
```

**Blue-Green Decision Tree**:
```
Deploy to green → Smoke tests pass?
  NO → STOP, rollback not needed (traffic still on blue)
  YES → Cutover traffic to green → Monitor SLOs for 15min
    SLO breach?
      YES → Instant rollback to blue
      NO → Success, retire blue after 24h
```

#### Canary Deployment

**Actions**:
1. Deploy canary version (1-5% of traffic)
2. Monitor SLOs for 10-15 minutes (compare baseline vs. canary)
3. If SLO breach: automated rollback
4. If SLO pass: increase to 25% → monitor → 50% → monitor → 100%
5. Progressive rollout continues until 100% or rollback triggered

**Gate Criteria**:
- [ ] Canary deployed successfully (1-5% traffic)
- [ ] SLOs met at 1-5% stage (no error rate increase, no latency regression)
- [ ] SLOs met at 25% stage
- [ ] SLOs met at 50% stage
- [ ] SLOs met at 100% stage
- [ ] No automated rollback triggered

**Commands**:
```bash
# Deploy canary with Argo Rollouts
kubectl apply -f k8s/canary-rollout.yaml
kubectl argo rollouts status app

# Monitor canary SLOs
kubectl argo rollouts get rollout app --watch

# Promote canary (manual progression)
kubectl argo rollouts promote app

# Automated rollback (if SLO breach)
kubectl argo rollouts abort app
kubectl argo rollouts undo app

# With Flagger (GitOps approach)
flagger create canary app --target-kind=Deployment --target=app --progression=manual
kubectl get canary app --watch
```

**Canary Decision Tree**:
```
Deploy canary (1-5%) → Monitor SLOs for 10min
  SLO breach?
    YES → Automated rollback, stop deployment
    NO → Promote to 25% → Monitor SLOs for 10min
      SLO breach?
        YES → Automated rollback, stop deployment
        NO → Promote to 50% → Monitor SLOs for 10min
          SLO breach?
            YES → Automated rollback, stop deployment
            NO → Promote to 100% → Monitor SLOs for 30min
              SLO breach?
                YES → Automated rollback (full rollback)
                NO → Success, deployment complete
```

**Canary SLO Validation**:
```bash
# Compare baseline (stable) vs. canary metrics
# Error rate: canary should not exceed baseline by >2%
# Latency p99: canary should not exceed baseline by >20%

BASELINE_ERROR_RATE=$(curl https://metrics/stable | jq '.error_rate')
CANARY_ERROR_RATE=$(curl https://metrics/canary | jq '.error_rate')

if [ $(echo "$CANARY_ERROR_RATE > $BASELINE_ERROR_RATE + 0.02" | bc) -eq 1 ]; then
  echo "ERROR: Canary error rate breach, triggering rollback"
  kubectl argo rollouts abort app
fi
```

#### Rolling Deployment

**Actions**:
1. Update 1 instance at a time
2. Wait for health check to pass
3. Manually validate instance behavior
4. Proceed to next instance
5. Repeat until all instances updated

**Gate Criteria**:
- [ ] Each instance updated successfully
- [ ] Health checks passing after each update
- [ ] No error rate increase during rollout
- [ ] Manual validation passed for each batch

**Commands**:
```bash
# Rolling update with Kubernetes
kubectl set image deployment/app app=<image>:<version> --record
kubectl rollout status deployment/app

# Manual pause/resume
kubectl rollout pause deployment/app
kubectl rollout resume deployment/app

# Rollback
kubectl rollout undo deployment/app
```

### Step 3: Run Smoke Tests
**Agents**: QA Engineer (lead), Deployment Manager
**Templates Required**:
- `test/smoke-test-checklist.md`
- `test/use-case-test-card.md`

**Actions**:
1. Execute critical path smoke tests (top 5-10 user journeys)
2. Validate API endpoints (health, status, critical operations)
3. Check database connectivity and data integrity
4. Verify external integrations (payment gateway, email service, etc.)
5. Validate monitoring and logging (metrics being collected, logs flowing)

**Gate Criteria**:
- [ ] Critical path smoke tests passing (100%)
- [ ] API endpoints responding with 2xx status codes
- [ ] Database connectivity confirmed
- [ ] External integrations operational
- [ ] Monitoring and logging operational

**Smoke Test Examples**:
```bash
# API health check
curl -f https://prod.example.com/health || exit 1

# Critical user journey (login, search, checkout)
./tests/smoke/critical-paths.sh

# Database connectivity
psql -h prod-db.example.com -U app -c "SELECT 1;" || exit 1

# External integration (payment gateway)
curl -f https://api.payment-gateway.com/health || exit 1

# Monitoring (metrics endpoint)
curl https://prod.example.com/metrics | jq '.uptime, .request_count' || exit 1
```

**Smoke Test Checklist**:
```markdown
## Smoke Test Checklist

### Critical User Journeys
- [ ] User registration and login
- [ ] Search functionality
- [ ] Product/item creation
- [ ] Checkout/payment flow
- [ ] Admin dashboard access

### API Endpoints
- [ ] /health (200 OK)
- [ ] /status (200 OK, returns version)
- [ ] /api/v1/users (authenticated, returns user data)
- [ ] /api/v1/orders (authenticated, returns orders)

### Database
- [ ] Connection successful
- [ ] Read operation (SELECT query)
- [ ] Write operation (INSERT query)
- [ ] Transaction rollback test

### External Integrations
- [ ] Payment gateway health check
- [ ] Email service health check
- [ ] CDN health check
- [ ] Third-party API health check

### Monitoring & Logging
- [ ] Metrics endpoint responding
- [ ] Logs flowing to aggregation service
- [ ] Alerts configured and operational
- [ ] Dashboard displaying live data
```

### Step 4: Monitor SLOs and Metrics
**Agents**: Reliability Engineer (lead), Operations Lead
**Templates Required**:
- `deployment/sli-card.md`
- `deployment/slo-definition-template.md`

**Actions**:
1. Monitor SLOs in real-time (error rate, latency, throughput)
2. Compare current metrics vs. baseline (pre-deployment)
3. Set up automated alerts for SLO breaches
4. Track business metrics (conversion rate, user activity)
5. Monitor infrastructure metrics (CPU, memory, network)

**Gate Criteria**:
- [ ] Error rate within SLO target (e.g., <0.1%)
- [ ] Latency p99 within SLO target (e.g., <500ms)
- [ ] Throughput within expected range (baseline ±10%)
- [ ] No infrastructure alarms triggered
- [ ] Business metrics stable (no conversion drop)

**Key SLOs**:
```yaml
# Example SLO definitions
slos:
  availability:
    target: 99.95%
    measurement_window: 30d

  latency_p99:
    target: 500ms
    measurement_window: 5m

  error_rate:
    target: 0.1%
    measurement_window: 5m

  throughput:
    target: 1000 req/s
    measurement_window: 5m
```

**Monitoring Commands**:
```bash
# Prometheus queries (via PromQL)
# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100

# Latency p99
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Throughput
rate(http_requests_total[5m])

# Infrastructure (Kubernetes)
kubectl top nodes
kubectl top pods -l app=app

# Business metrics (example)
curl https://metrics.example.com/conversion_rate | jq '.rate'
```

**Automated SLO Breach Detection**:
```bash
#!/bin/bash
# Automated SLO breach check script

ERROR_RATE_THRESHOLD=0.1
LATENCY_P99_THRESHOLD=500

ERROR_RATE=$(curl -s https://metrics/error_rate | jq '.value')
LATENCY_P99=$(curl -s https://metrics/latency_p99 | jq '.value')

if (( $(echo "$ERROR_RATE > $ERROR_RATE_THRESHOLD" | bc -l) )); then
  echo "SLO BREACH: Error rate $ERROR_RATE exceeds threshold $ERROR_RATE_THRESHOLD"
  kubectl argo rollouts abort app
  exit 1
fi

if (( $(echo "$LATENCY_P99 > $LATENCY_P99_THRESHOLD" | bc -l) )); then
  echo "SLO BREACH: Latency p99 ${LATENCY_P99}ms exceeds threshold ${LATENCY_P99_THRESHOLD}ms"
  kubectl argo rollouts abort app
  exit 1
fi

echo "SLO CHECK PASSED: All metrics within targets"
```

### Step 5: Complete Deployment or Rollback
**Agents**: Deployment Manager (lead), Incident Commander (if rollback)
**Templates Required**:
- `deployment/rollback-plan-card.md`
- `deployment/incident-report-template.md`

**Success Path**:
1. All SLOs met for 15-30 minutes post-deployment
2. Smoke tests passing
3. No alerts triggered
4. Mark deployment as successful
5. Retire old version (blue environment, canary baseline)
6. Generate deployment success report

**Rollback Path**:
1. SLO breach detected OR smoke test failure
2. Trigger automated rollback (strategy-specific)
3. Verify rollback successful (old version serving traffic)
4. Run smoke tests on rolled-back version
5. Declare incident, start root cause analysis
6. Generate rollback incident report

**Gate Criteria (Success)**:
- [ ] SLOs met for 15-30 minutes post-deployment
- [ ] Smoke tests passing
- [ ] No alerts triggered
- [ ] Business metrics stable
- [ ] Operations Lead signoff

**Gate Criteria (Rollback)**:
- [ ] Rollback executed successfully
- [ ] Old version serving traffic (100%)
- [ ] Smoke tests passing on rolled-back version
- [ ] Incident declared and root cause analysis initiated

**Rollback Commands**:
```bash
# Blue-Green rollback
kubectl patch service app -p '{"spec":{"selector":{"version":"blue"}}}'

# Canary rollback
kubectl argo rollouts abort app
kubectl argo rollouts undo app

# Rolling rollback
kubectl rollout undo deployment/app

# Verify rollback
kubectl get pods -l app=app -o jsonpath='{.items[*].spec.containers[*].image}'
curl https://prod.example.com/status | jq '.version'

# Smoke tests post-rollback
./scripts/smoke-tests.sh https://prod.example.com
```

**Rollback Decision Tree**:
```
SLO breach OR smoke test failure?
  YES → Trigger rollback
    Blue-Green: Switch traffic back to blue
    Canary: Abort rollout, scale down canary
    Rolling: Undo rollout
  → Verify rollback successful
    Old version serving 100% traffic?
      YES → Run smoke tests
        Smoke tests pass?
          YES → Rollback complete, declare incident
          NO → CRITICAL: Rollback failed, escalate to Incident Commander
      NO → CRITICAL: Rollback failed, escalate to Incident Commander
```

### Step 6: Generate Deployment Report
**Agents**: Deployment Manager (lead)
**Templates Required**:
- `deployment/deployment-report-template.md`

**Actions**:
1. Document deployment outcome (success or rollback)
2. Record deployment duration and timeline
3. List issues encountered and resolutions
4. Capture lessons learned
5. Update deployment runbooks based on learnings

**Gate Criteria**:
- [ ] Deployment outcome documented
- [ ] Timeline and metrics recorded
- [ ] Issues and resolutions captured
- [ ] Lessons learned documented
- [ ] Runbooks updated (if process improvements identified)

## Automated Rollback Triggers

### SLO Breach Triggers
**Error Rate Breach**:
- Threshold: >2% above baseline
- Detection window: 5 minutes
- Action: Immediate rollback

**Latency Breach**:
- Threshold: >20% above baseline (p99)
- Detection window: 5 minutes
- Action: Immediate rollback

**Throughput Drop**:
- Threshold: >30% below baseline
- Detection window: 10 minutes
- Action: Immediate rollback

### Infrastructure Triggers
**Pod Crash Loop**:
- Threshold: >3 restarts in 5 minutes
- Action: Immediate rollback

**Out of Memory (OOM)**:
- Threshold: Any OOM kill
- Action: Immediate rollback

**Health Check Failure**:
- Threshold: >50% pods failing health checks
- Action: Immediate rollback

### Business Metric Triggers
**Conversion Rate Drop**:
- Threshold: >20% drop vs. baseline
- Detection window: 15 minutes
- Action: Immediate rollback

**User Activity Drop**:
- Threshold: >30% drop vs. baseline
- Detection window: 15 minutes
- Action: Immediate rollback

## Integration with Quality Gates

### Pre-Deployment Gate Dependencies
- Security Gate: Must pass (no High/Critical vulnerabilities)
- Reliability Gate: Must pass (SLOs met in staging)
- Test Gate: Must pass (integration tests 100%)
- Approval Gate: Must pass (Release Manager approval)

### Post-Deployment Gate Updates
- Update deployment history
- Record SLO compliance during deployment
- Document lessons learned
- Update reliability metrics

**Commands**:
```bash
# Check pre-deployment gates
/project:gate-check construction

# Update deployment history
/project:release-notes --version <version> --status deployed
```

## Output Report

Generate a comprehensive deployment report:

```markdown
# Production Deployment Report

**Project**: {project-name}
**Version**: {version}
**Strategy**: {blue-green | canary | rolling}
**Date**: {deployment-date}
**Status**: {SUCCESS | ROLLBACK | FAILED}

## Deployment Timeline

**Start Time**: {start-timestamp}
**End Time**: {end-timestamp}
**Duration**: {duration-minutes} minutes

### Key Milestones
- Pre-deployment validation: {timestamp} ({duration})
- Deployment execution: {timestamp} ({duration})
- Smoke tests: {timestamp} ({duration})
- SLO monitoring: {timestamp} ({duration})
- Completion/rollback: {timestamp} ({duration})

## Strategy-Specific Details

### Blue-Green (if applicable)
- Green deployment: {timestamp}
- Traffic cutover: {timestamp}
- Blue retirement: {timestamp | N/A}

### Canary (if applicable)
- Canary 1-5%: {timestamp}
- Canary 25%: {timestamp}
- Canary 50%: {timestamp}
- Canary 100%: {timestamp}
- SLO breaches: {count}

### Rolling (if applicable)
- Instances updated: {count}/{total}
- Batch size: {count}
- Pause duration: {duration-minutes} minutes

## Pre-Deployment Validation

**Quality Gates Status**:
- Security Gate: {PASS | FAIL}
- Reliability Gate: {PASS | FAIL}
- Test Gate: {PASS | FAIL}
- Approval Gate: {PASS | FAIL}

**Environment Health**:
- Nodes: {count} healthy, {count} unhealthy
- Pods: {count} running, {count} failed
- Infrastructure alarms: {count}

**Artifacts**:
- Container images: {list}
- Checksums verified: {YES | NO}
- Signatures validated: {YES | NO}

## Smoke Tests Results

**Critical Path Tests**: {count-passed}/{count-total}
**API Endpoint Tests**: {count-passed}/{count-total}
**Database Tests**: {count-passed}/{count-total}
**External Integration Tests**: {count-passed}/{count-total}
**Monitoring Tests**: {count-passed}/{count-total}

**Failures**:
{list any smoke test failures}

## SLO Metrics

### Error Rate
- Baseline: {baseline-percentage}%
- Post-Deployment: {current-percentage}%
- Target: {target-percentage}%
- Status: {PASS | BREACH}

### Latency (p99)
- Baseline: {baseline-ms}ms
- Post-Deployment: {current-ms}ms
- Target: {target-ms}ms
- Status: {PASS | BREACH}

### Throughput
- Baseline: {baseline-rps} req/s
- Post-Deployment: {current-rps} req/s
- Target: {target-rps} req/s
- Status: {PASS | BREACH}

### Availability
- Uptime: {percentage}%
- Downtime: {duration-seconds} seconds
- Target: {target-percentage}%
- Status: {PASS | BREACH}

## Business Metrics

### Conversion Rate
- Baseline: {baseline-percentage}%
- Post-Deployment: {current-percentage}%
- Change: {change-percentage}%

### User Activity
- Baseline: {baseline-users} active users
- Post-Deployment: {current-users} active users
- Change: {change-percentage}%

## Issues and Resolutions

### Issues Encountered
{list issues, severity, and resolution}

**Example**:
1. Issue: Canary error rate breach at 25%
   - Severity: High
   - Resolution: Automated rollback triggered, root cause analysis initiated
   - Time to Resolve: 5 minutes

### Rollback Details (if applicable)
- Rollback Trigger: {slo-breach | smoke-test-failure | manual}
- Rollback Strategy: {blue-green | canary | rolling}
- Rollback Duration: {duration-minutes} minutes
- Rollback Success: {YES | NO}
- Smoke Tests Post-Rollback: {PASS | FAIL}

## Lessons Learned

**What Went Well**:
{list positive outcomes}

**What Could Improve**:
{list improvement opportunities}

**Action Items**:
{list concrete actions for future deployments}

**Example**:
- What Went Well: Automated SLO breach detection triggered rollback within 2 minutes
- What Could Improve: Smoke tests did not catch database connection pool exhaustion
- Action Items: Add connection pool metrics to smoke tests, increase monitoring window

## Runbook Updates

**Process Improvements**:
{list any updates to deployment runbooks}

**Example**:
- Added connection pool health check to smoke tests
- Updated SLO breach threshold for latency (500ms → 400ms)

## Approvals and Sign-offs

- Deployment Manager: {name} - {timestamp}
- Reliability Engineer: {name} - {timestamp}
- Operations Lead: {name} - {timestamp}
- Release Manager: {name} - {timestamp}

## References

- Deployment Plan: `docs/deployment/deployment-plan-{version}.md`
- Rollback Plan: `docs/deployment/rollback-plan-{version}.md`
- Incident Report (if rollback): `docs/incidents/incident-{incident-id}.md`
- Release Notes: `docs/releases/release-notes-{version}.md`

---
Generated by: Production Deployment Flow
Command: `/project:flow-deploy-to-production {strategy} {version}`
```

## Success Criteria

This command succeeds when:
- [ ] Pre-deployment validation passed
- [ ] Deployment executed successfully (strategy-specific)
- [ ] Smoke tests passed
- [ ] SLOs met for 15-30 minutes post-deployment
- [ ] No rollback triggered
- [ ] Deployment report generated with metrics and lessons learned

## Error Handling

**Pre-Deployment Gate Failure**:
- Report: "Pre-deployment validation failed: {gate-name}"
- Action: "Resolve gate failure before proceeding"
- Command: "/project:gate-check construction"
- Recommendation: "Review quality gate criteria and re-run validation"

**Deployment Execution Failure**:
- Report: "Deployment failed: {error-message}"
- Action: "Review deployment logs, fix issue, re-run deployment"
- Example: "Container image not found" → "Verify artifact registry and image tags"

**Smoke Test Failure**:
- Report: "Smoke tests failed: {test-name}"
- Action: "Review test logs, fix issue, re-run smoke tests"
- Rollback Decision: "If deployed to production, trigger rollback"
- Example: "API health check failed" → "Check pod status, logs, network connectivity"

**SLO Breach Detected**:
- Report: "SLO breach detected: {slo-name} - Current: {current-value}, Target: {target-value}"
- Action: "Automated rollback triggered"
- Command: "kubectl argo rollouts abort app" (canary) or "kubectl patch service..." (blue-green)
- Follow-up: "Declare incident, start root cause analysis"

**Rollback Failure (CRITICAL)**:
- Report: "CRITICAL: Rollback failed - {error-message}"
- Action: "Escalate to Incident Commander immediately"
- Emergency Response:
  1. Declare P0 incident
  2. Assemble incident response team
  3. Manual intervention required (e.g., traffic rerouting, emergency maintenance)
  4. Notify stakeholders of service disruption

**Infrastructure Failure**:
- Report: "Infrastructure failure: {issue-description}"
- Action: "Check node health, pod status, network connectivity"
- Commands:
  ```bash
  kubectl get nodes
  kubectl describe node <node-name>
  kubectl get pods --all-namespaces | grep -v Running
  ```
- Recovery: "Resolve infrastructure issue, re-run deployment"

## References

- Deployment planning: `deployment/deployment-plan-card.md`
- Rollback procedures: `deployment/rollback-plan-card.md`
- SLO definitions: `deployment/slo-definition-template.md`
- Incident response: `deployment/incident-report-template.md`
- Quality gates: `flows/gate-criteria-by-phase.md` (Transition Phase)
- Smoke test examples: `test/smoke-test-checklist.md`
