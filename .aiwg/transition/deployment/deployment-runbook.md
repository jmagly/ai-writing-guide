# Production Deployment Runbook

**Project:** AI Writing Guide Framework
**Runbook Version:** 1.0
**Last Updated:** [DATE]
**Owner:** DevOps Team
**Review Frequency:** After each deployment

---

## Document Purpose

This runbook provides detailed, step-by-step instructions for deploying the AI Writing Guide framework to production. It is designed to be executed by any DevOps engineer with minimal context, ensuring consistent and reliable deployments.

**Target Audience:** DevOps Engineers, SREs, Operations Team

**Prerequisites:**
- Access to production Kubernetes cluster
- Access to production database
- Access to AWS/Cloud provider console
- Access to monitoring dashboards
- PagerDuty access
- Deployment checklist (companion document)

---

## Quick Reference

### Critical Information

**Production Environment:**
- **Domain:** [PRODUCTION_DOMAIN]
- **Kubernetes Cluster:** [CLUSTER_NAME]
- **Kubernetes Namespace:** production
- **Registry:** [DOCKER_REGISTRY]
- **Database:** [DB_IDENTIFIER]

**Emergency Contacts:**
- **Deployment Lead:** [NAME] ([PHONE])
- **Engineering Manager:** [NAME] ([PHONE])
- **On-Call Engineer:** [NAME] ([PHONE])
- **Escalation:** [NAME] ([PHONE])

**Dashboards:**
- **SLO Dashboard:** [URL]
- **Metrics Dashboard:** [URL]
- **Log Dashboard:** [URL]
- **PagerDuty:** [URL]

**Rollback Authority:**
- **Automatic:** DevOps Engineer (if health checks fail)
- **Manual:** Deployment Lead + Engineering Manager

**Maximum Deployment Duration:** 60 minutes (abort if exceeded)

**Rollback Time Target:** <5 minutes

---

## Pre-Deployment Preparation

### T-48 Hours: Schedule and Notify

**1. Schedule Deployment Window**
```bash
# Create change ticket in change management system
# Example: Jira, ServiceNow, etc.

# Change details:
# - Title: Production Deployment v[VERSION]
# - Window: [DATE] [START_TIME] - [END_TIME] (recommend 2-hour window)
# - Impact: Low (no expected downtime)
# - Rollback plan: Included
```

**2. Notify Stakeholders**
```
To: executive-team@company.com, product@company.com, support@company.com
Subject: Production Deployment Scheduled: v[VERSION] on [DATE]

Team,

We're deploying AI Writing Guide v[VERSION] to production on [DATE] at [TIME].

Deployment Window: [START_TIME] - [END_TIME]
Expected Impact: None (rolling deployment, zero downtime)
Estimated Duration: 45-60 minutes

New Features:
- [Feature 1]
- [Feature 2]

Bug Fixes:
- [Fix 1]
- [Fix 2]

For questions, contact: [DEPLOYMENT_LEAD_EMAIL]

- DevOps Team
```

**3. Confirm Team Availability**
```bash
# Ensure these roles are available during deployment window:
# - Deployment Lead
# - DevOps Engineer (primary)
# - DevOps Engineer (backup)
# - Database Administrator
# - On-Call Engineer
# - Engineering Manager (for approvals)

# Send calendar invite with war room link
```

---

### T-24 Hours: Pre-Flight Checks

**1. Verify Code Readiness**
```bash
# Clone production release branch
git clone https://github.com/[ORG]/ai-writing-guide.git
cd ai-writing-guide
git checkout v[VERSION]

# Verify tag exists
git tag -l v[VERSION]

# Verify commit SHA matches expected
git log -1 --format="%H"
# Expected: [EXPECTED_SHA]

# Verify no uncommitted changes
git status
# Expected: "nothing to commit, working tree clean"
```

**2. Verify Build Artifacts**
```bash
# Pull production Docker image
docker pull [REGISTRY]/aiwg:v[VERSION]

# Verify image exists and is recent
docker images [REGISTRY]/aiwg:v[VERSION]

# Verify image digest (prevents tampering)
docker inspect [REGISTRY]/aiwg:v[VERSION] --format='{{.Id}}'
# Expected: sha256:[EXPECTED_DIGEST]

# Verify image scanned with zero vulnerabilities
# Check CI/CD pipeline security scan results
```

**3. Verify Test Results**
```bash
# Review CI/CD pipeline results
# Pipeline URL: [CI_CD_PIPELINE_URL]

# Verify:
# - All tests passed (≥98% pass rate)
# - Security scan passed (zero vulnerabilities)
# - Build successful
# - Artifacts uploaded

# Download test report for review
curl -o test-report.json [CI_CD_ARTIFACT_URL]/test-report.json
```

**4. Review UAT Sign-off**
```bash
# Verify UAT document signed by Product Manager
# UAT Document: [UAT_DOCUMENT_URL]

# Confirm:
# - All UAT scenarios passed
# - No critical defects outstanding
# - Product Manager signature present
# - Date within last 7 days
```

**5. Verify Production Environment Health**
```bash
# Check production cluster health
kubectl get nodes
# All nodes should show STATUS: Ready

kubectl get pods -A | grep -v Running
# Should return minimal results (only Completed or Succeeded pods)

# Check current version
curl -s https://[DOMAIN]/health | jq '.version'
# Current version: v[CURRENT_VERSION]

# Check database health
psql -h [DB_HOST] -U [DB_USER] -c "SELECT 1;"
# Expected: (1 row)

# Check monitoring dashboards
# - SLO Dashboard: All SLOs green
# - No active incidents
# - No anomalies in metrics
```

---

### T-1 Hour: Final Preparation

**1. Setup War Room**
```bash
# Create Slack/Teams channel: #deploy-v[VERSION]
# Invite: Deployment team + stakeholders

# Create video conference
# Link: [VIDEO_CONFERENCE_URL]

# Pin important links in channel:
# - This runbook
# - Deployment checklist
# - SLO Dashboard
# - PagerDuty
# - Rollback runbook
```

**2. Prepare Deployment Environment**
```bash
# Set environment variables
export DEPLOYMENT_VERSION="v[VERSION]"
export KUBE_NAMESPACE="production"
export REGISTRY="[DOCKER_REGISTRY]"
export DB_HOST="[DB_HOST]"
export DB_USER="[DB_USER]"

# Verify kubectl context
kubectl config current-context
# Expected: production-cluster

# Verify AWS CLI credentials
aws sts get-caller-identity
# Verify correct AWS account ID

# Test PagerDuty API access
curl -H "Authorization: Token token=[PAGERDUTY_TOKEN]" \
  https://api.pagerduty.com/users/me
# Expected: HTTP 200
```

**3. Create Pre-Deployment Backups**
```bash
# Database snapshot
aws rds create-db-snapshot \
  --db-instance-identifier [DB_IDENTIFIER] \
  --db-snapshot-identifier pre-deploy-${DEPLOYMENT_VERSION}-$(date +%Y%m%d-%H%M%S)

# Wait for snapshot to complete
aws rds wait db-snapshot-completed \
  --db-snapshot-identifier pre-deploy-${DEPLOYMENT_VERSION}-$(date +%Y%m%d-%H%M%S)

# Verify snapshot
aws rds describe-db-snapshots \
  --db-snapshot-identifier pre-deploy-${DEPLOYMENT_VERSION}-$(date +%Y%m%d-%H%M%S)
# Status should be "available"

# IMPORTANT: Record snapshot ID for rollback
echo "SNAPSHOT_ID: pre-deploy-${DEPLOYMENT_VERSION}-$(date +%Y%m%d-%H%M%S)"
```

**4. Print Deployment Checklist**
```bash
# Download and print physical copy
# URL: [DEPLOYMENT_CHECKLIST_URL]

# Deployment lead should have physical checklist to mark items
```

**5. Go/No-Go Decision (T-15 Minutes)**
```bash
# Assemble team in war room
# Review pre-deployment checklist (48/48 items)

# Go/No-Go vote:
# - Deployment Lead: GO / NO-GO
# - DevOps Engineer: GO / NO-GO
# - Database Administrator: GO / NO-GO
# - Engineering Manager: GO / NO-GO

# Consensus required for GO
# Document decision in deployment log
```

---

## Deployment Procedure

### Phase 1: Deployment Start (5 minutes)

**Step 1.1: Announce Deployment Start**
```bash
# Post to war room channel:
echo "🚀 DEPLOYMENT STARTED - v${DEPLOYMENT_VERSION}"
echo "Start time: $(date)"
echo "Deployment lead: [NAME]"
echo "Expected duration: 45-60 minutes"

# Post to status page (if applicable)
# Status: "Deploying new version - no expected impact"
```

**Step 1.2: Enable Monitoring**
```bash
# Open monitoring dashboards in browser tabs:
# Tab 1: SLO Dashboard [URL]
# Tab 2: Metrics Dashboard [URL]
# Tab 3: Log Dashboard [URL]
# Tab 4: Kubernetes Dashboard [URL]
# Tab 5: PagerDuty [URL]

# Start screen recording (for audit/review)
# File: deployment-v${DEPLOYMENT_VERSION}-$(date +%Y%m%d-%H%M%S).mp4
```

**Step 1.3: Final Health Check**
```bash
# Verify all production services healthy
kubectl get pods -n ${KUBE_NAMESPACE} -l app=aiwg

# Expected output (all pods Running):
# NAME                    READY   STATUS    RESTARTS   AGE
# aiwg-[hash]-[id]        1/1     Running   0          Xd
# aiwg-[hash]-[id]        1/1     Running   0          Xd
# aiwg-[hash]-[id]        1/1     Running   0          Xd

# Verify health endpoints
for endpoint in health ready live; do
  echo "Testing /${endpoint}..."
  curl -s -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n" \
    https://[DOMAIN]/${endpoint}
done

# All endpoints should return HTTP 200
```

**Step 1.4: Lock Codebase**
```bash
# Protect main branch (if not already protected)
# Prevent any commits during deployment window

# Post in engineering channel:
echo "🔒 CODE FREEZE in effect for deployment"
echo "Duration: Until deployment complete (~60 minutes)"
echo "No merges to main branch during this time"
```

---

### Phase 2: Database Migration (10 minutes, if applicable)

**SKIP THIS PHASE IF:** No database schema changes in this release.

**Step 2.1: Backup Database**
```bash
# Additional manual backup before migration
pg_dump -h ${DB_HOST} -U ${DB_USER} -d aiwg_production \
  --format=custom --compress=9 \
  --file=backup-pre-migration-$(date +%Y%m%d-%H%M%S).dump

# Verify backup file created
ls -lh backup-pre-migration-*.dump

# Upload backup to S3 (for redundancy)
aws s3 cp backup-pre-migration-*.dump \
  s3://[BACKUP_BUCKET]/deployments/v${DEPLOYMENT_VERSION}/
```

**Step 2.2: Test Migration in Staging (VERIFY BEFOREHAND)**
```bash
# This should have been done in T-24 hours preparation
# If not done, DO NOT PROCEED - abort deployment

# Verify migration tested in staging:
# - Migration executed successfully
# - Rollback tested successfully
# - Performance impact assessed
# - Duration measured

# Expected staging results:
# - Migrations: X applied successfully
# - Duration: Y seconds
# - Rollback tested: SUCCESS
```

**Step 2.3: Execute Production Migration**
```bash
# Set migration timeout
export MIGRATION_TIMEOUT=600  # 10 minutes

# Run migrations
timeout ${MIGRATION_TIMEOUT} npm run migrate:prod

# Expected output:
# ✓ Running migrations...
# ✓ Migration 001_add_feature_x: SUCCESS (0.5s)
# ✓ Migration 002_add_indices: SUCCESS (2.3s)
# ✓ Migration 003_alter_table_y: SUCCESS (1.8s)
# All migrations completed successfully
# Total duration: 4.6s

# If migrations fail:
# - DO NOT PROCEED
# - Execute rollback procedure
# - Escalate to Database Administrator
```

**Step 2.4: Verify Schema Version**
```bash
# Check schema version updated
psql -h ${DB_HOST} -U ${DB_USER} -d aiwg_production -c \
  "SELECT version, applied_at FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# Expected output (latest version matches target):
#  version  |        applied_at
# ----------+---------------------------
#  20251024 | 2025-10-24 14:23:45.123456
#  20251015 | 2025-10-15 10:15:32.789012
#  ...

# Verify new columns/tables exist
psql -h ${DB_HOST} -U ${DB_USER} -d aiwg_production -c \
  "\d [NEW_TABLE_NAME]"
```

**Step 2.5: Validate Data Integrity**
```bash
# Run data integrity checks
npm run validate:data:prod

# Expected output:
# ✓ Checking referential integrity...
# ✓ Checking constraints...
# ✓ Checking indices...
# ✓ All checks passed

# If validation fails:
# - DO NOT PROCEED
# - Rollback migrations immediately
# - Escalate to Database Administrator
```

---

### Phase 3: Application Deployment (20 minutes)

**Step 3.1: Pull New Image**
```bash
# Pull production image to verify availability
docker pull ${REGISTRY}/aiwg:${DEPLOYMENT_VERSION}

# Verify image digest matches expected
ACTUAL_DIGEST=$(docker inspect ${REGISTRY}/aiwg:${DEPLOYMENT_VERSION} --format='{{.Id}}')
EXPECTED_DIGEST="sha256:[EXPECTED_DIGEST]"

if [ "$ACTUAL_DIGEST" != "$EXPECTED_DIGEST" ]; then
  echo "❌ ERROR: Image digest mismatch!"
  echo "Expected: $EXPECTED_DIGEST"
  echo "Actual:   $ACTUAL_DIGEST"
  echo "ABORTING DEPLOYMENT"
  exit 1
fi

echo "✓ Image digest verified"
```

**Step 3.2: Update Deployment Manifest**
```bash
# Update Kubernetes deployment with new image
kubectl set image deployment/aiwg \
  aiwg=${REGISTRY}/aiwg:${DEPLOYMENT_VERSION} \
  --namespace=${KUBE_NAMESPACE} \
  --record

# Expected output:
# deployment.apps/aiwg image updated

# Verify deployment updated
kubectl get deployment aiwg -n ${KUBE_NAMESPACE} -o jsonpath='{.spec.template.spec.containers[0].image}'
# Expected: [REGISTRY]/aiwg:v[VERSION]
```

**Step 3.3: Monitor Rollout (Rolling Update Strategy)**
```bash
# Watch rollout status (streams output in real-time)
kubectl rollout status deployment/aiwg \
  --namespace=${KUBE_NAMESPACE} \
  --timeout=10m

# Expected output (for 3 replicas):
# Waiting for deployment "aiwg" rollout to finish: 0 of 3 updated replicas are available...
# Waiting for deployment "aiwg" rollout to finish: 1 of 3 updated replicas are available...
# Waiting for deployment "aiwg" rollout to finish: 2 of 3 updated replicas are available...
# deployment "aiwg" successfully rolled out

# Rollout timeline (typical):
# t=0s:     Deployment updated
# t=10s:    First new pod created
# t=30s:    First new pod Ready (old pod terminated)
# t=40s:    Second new pod created
# t=60s:    Second new pod Ready (old pod terminated)
# t=70s:    Third new pod created
# t=90s:    Third new pod Ready (old pod terminated)
# t=90s:    Rollout complete
```

**Step 3.4: Monitor Pod Health During Rollout**
```bash
# In separate terminal, watch pod status
watch -n 2 'kubectl get pods -n production -l app=aiwg'

# Monitor for issues:
# - ImagePullBackOff: Image not available (check registry)
# - CrashLoopBackOff: Application crashing (check logs)
# - Pending: Resource constraints (check node capacity)
# - Evicted: Out of memory/disk (check resource limits)

# If any pod fails to become Ready within 2 minutes:
# - Check pod logs: kubectl logs -n production [POD_NAME]
# - Check pod events: kubectl describe pod -n production [POD_NAME]
# - Evaluate rollback decision
```

**Step 3.5: Verify New Pods Healthy**
```bash
# Check all pods Running and Ready
kubectl get pods -n ${KUBE_NAMESPACE} -l app=aiwg

# Expected output (all 1/1 Ready):
# NAME                    READY   STATUS    RESTARTS   AGE
# aiwg-[new-hash]-[id1]   1/1     Running   0          2m
# aiwg-[new-hash]-[id2]   1/1     Running   0          2m
# aiwg-[new-hash]-[id3]   1/1     Running   0          2m

# Check for restarts (should be 0)
kubectl get pods -n ${KUBE_NAMESPACE} -l app=aiwg -o json | \
  jq '.items[].status.containerStatuses[].restartCount'

# If any restarts detected:
# - Investigate pod logs
# - Check for crash reasons
# - Evaluate rollback decision
```

**Step 3.6: Verify Version Update**
```bash
# Check running version via health endpoint
curl -s https://[DOMAIN]/health | jq

# Expected output:
# {
#   "status": "healthy",
#   "version": "v[VERSION]",
#   "build": "[BUILD_NUMBER]",
#   "commit": "[GIT_SHA]",
#   "uptime_seconds": 120,
#   "timestamp": "2025-10-24T14:30:00Z"
# }

# Verify version matches deployed version
VERSION_CHECK=$(curl -s https://[DOMAIN]/health | jq -r '.version')
if [ "$VERSION_CHECK" != "${DEPLOYMENT_VERSION}" ]; then
  echo "❌ ERROR: Version mismatch!"
  echo "Expected: ${DEPLOYMENT_VERSION}"
  echo "Actual:   $VERSION_CHECK"
  echo "EVALUATE ROLLBACK"
fi

echo "✓ Version verified: ${DEPLOYMENT_VERSION}"
```

---

### Phase 4: Configuration Update (5 minutes, if applicable)

**SKIP THIS PHASE IF:** No configuration changes in this release.

**Step 4.1: Backup Current Configuration**
```bash
# Export current ConfigMap
kubectl get configmap aiwg-config -n ${KUBE_NAMESPACE} -o yaml > \
  backup-configmap-$(date +%Y%m%d-%H%M%S).yaml

# Export current Secrets (for reference, values will be encrypted)
kubectl get secret aiwg-secrets -n ${KUBE_NAMESPACE} -o yaml > \
  backup-secrets-$(date +%Y%m%d-%H%M%S).yaml
```

**Step 4.2: Apply New Configuration**
```bash
# Apply updated ConfigMap
kubectl apply -f manifests/production/configmap-v${DEPLOYMENT_VERSION}.yaml

# Expected output:
# configmap/aiwg-config configured

# Verify ConfigMap updated
kubectl get configmap aiwg-config -n ${KUBE_NAMESPACE} -o yaml
```

**Step 4.3: Apply New Secrets (if rotated)**
```bash
# Apply updated Secrets
kubectl apply -f manifests/production/secrets-v${DEPLOYMENT_VERSION}.yaml

# Expected output:
# secret/aiwg-secrets configured

# DO NOT print secret values
# Verify secret exists and was updated
kubectl get secret aiwg-secrets -n ${KUBE_NAMESPACE}
```

**Step 4.4: Rolling Restart (if config requires pod restart)**
```bash
# Check if application hot-reloads config
# If YES: No restart needed
# If NO: Proceed with rolling restart

# Trigger rolling restart
kubectl rollout restart deployment/aiwg -n ${KUBE_NAMESPACE}

# Monitor restart progress
kubectl rollout status deployment/aiwg -n ${KUBE_NAMESPACE}

# Verify all pods restarted and healthy
kubectl get pods -n ${KUBE_NAMESPACE} -l app=aiwg
# Check AGE column - all pods should show recent creation time
```

---

### Phase 5: Service Validation (5 minutes)

**Step 5.1: Verify Service Endpoints**
```bash
# Check Service exists and has endpoints
kubectl get service aiwg -n ${KUBE_NAMESPACE}

# Expected output:
# NAME   TYPE           CLUSTER-IP       EXTERNAL-IP      PORT(S)          AGE
# aiwg   LoadBalancer   10.100.200.50    [PUBLIC_IP]      443:30443/TCP    30d

# Verify endpoints populated
kubectl get endpoints aiwg -n ${KUBE_NAMESPACE}

# Expected output (3 endpoints for 3 pods):
# NAME   ENDPOINTS                                                     AGE
# aiwg   10.244.1.15:8080,10.244.2.23:8080,10.244.3.31:8080           30d
```

**Step 5.2: Verify Load Balancer Health**
```bash
# Check load balancer target group health
aws elbv2 describe-target-health \
  --target-group-arn [TARGET_GROUP_ARN]

# Expected output (all targets healthy):
# {
#   "TargetHealthDescriptions": [
#     {
#       "Target": {"Id": "i-xxx", "Port": 8080},
#       "HealthCheckPort": "8080",
#       "TargetHealth": {"State": "healthy"}
#     },
#     ...
#   ]
# }

# Count healthy targets
HEALTHY_COUNT=$(aws elbv2 describe-target-health \
  --target-group-arn [TARGET_GROUP_ARN] | \
  jq '.TargetHealthDescriptions | map(select(.TargetHealth.State=="healthy")) | length')

echo "Healthy targets: ${HEALTHY_COUNT}/3"

if [ "$HEALTHY_COUNT" -lt 3 ]; then
  echo "⚠️ WARNING: Not all targets healthy"
  echo "EVALUATE ROLLBACK if targets don't become healthy within 2 minutes"
fi
```

**Step 5.3: Verify SSL/TLS**
```bash
# Check SSL certificate validity
echo | openssl s_client -connect [DOMAIN]:443 -servername [DOMAIN] 2>/dev/null | \
  openssl x509 -noout -dates

# Expected output:
# notBefore=Oct 1 00:00:00 2025 GMT
# notAfter=Oct 1 23:59:59 2026 GMT

# Verify certificate not expired
# Verify certificate valid for >30 days

# Check SSL Labs grade (optional, takes 2-3 minutes)
# https://www.ssllabs.com/ssltest/analyze.html?d=[DOMAIN]
# Target: A or A+
```

**Step 5.4: Test End-to-End Connectivity**
```bash
# Test from external network (not from same VPC)
# Use personal device or external test server

# HTTP should redirect to HTTPS
curl -I http://[DOMAIN]
# Expected: HTTP 301 Moved Permanently
# Location: https://[DOMAIN]/

# HTTPS should return 200
curl -I https://[DOMAIN]
# Expected: HTTP 200 OK

# Verify HSTS header present
curl -I https://[DOMAIN] | grep -i strict-transport
# Expected: strict-transport-security: max-age=31536000
```

---

### Phase 6: Cache Invalidation (5 minutes, if applicable)

**SKIP THIS PHASE IF:** No CDN or caching layer in use.

**Step 6.1: Clear Application Cache**
```bash
# Clear Redis cache (if applicable)
redis-cli -h [REDIS_HOST] -p 6379 FLUSHDB

# Expected output: OK

# Verify cache cleared
redis-cli -h [REDIS_HOST] -p 6379 DBSIZE
# Expected: (integer) 0

# Cache will rebuild automatically as requests come in
```

**Step 6.2: Invalidate CDN Cache**
```bash
# Invalidate CloudFront distribution (if applicable)
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id [DISTRIBUTION_ID] \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "Invalidation ID: ${INVALIDATION_ID}"

# Monitor invalidation progress
aws cloudfront get-invalidation \
  --distribution-id [DISTRIBUTION_ID] \
  --id ${INVALIDATION_ID}

# Status will be "InProgress" then "Completed"
# Typically takes 1-5 minutes
```

**Step 6.3: Verify Cache Invalidation**
```bash
# First request should be cache MISS
curl -I https://[DOMAIN]/health

# Check X-Cache header:
# Expected: Miss from cloudfront

# Second request should be cache HIT (if caching enabled)
curl -I https://[DOMAIN]/health

# Check X-Cache header:
# Expected: Hit from cloudfront

# Verify correct version served
curl -s https://[DOMAIN]/health | jq '.version'
# Expected: v[VERSION]
```

---

### Phase 7: Smoke Testing (15 minutes)

**Step 7.1: Automated Smoke Tests**
```bash
# Run automated smoke test suite
npm run test:smoke:prod

# Expected output:
# ✓ Application responds (HTTP 200)
# ✓ Health check passing
# ✓ Readiness check passing
# ✓ Liveness check passing
# ✓ Version correct
# ✓ Authentication working
# ✓ Database connectivity
# ✓ API endpoints functional
# ...
#
# Smoke Tests: 20/20 passed (100%)
# Duration: 3m 45s

# If <19/20 tests pass (95% threshold):
# - Review failed tests
# - Evaluate rollback decision
```

**Step 7.2: Manual Critical Path Testing**
```bash
# Test critical user workflows manually:

# 1. Homepage loads
curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s\n" \
  https://[DOMAIN]/

# 2. User login
# Navigate to https://[DOMAIN]/login
# Enter test credentials: [TEST_USER] / [TEST_PASS]
# Expected: Successful login, redirect to dashboard

# 3. API request
curl -H "Authorization: Bearer [TEST_TOKEN]" \
  https://[DOMAIN]/api/v1/agents | jq

# 4. File upload (if applicable)
curl -F "file=@test-file.txt" \
  -H "Authorization: Bearer [TEST_TOKEN]" \
  https://[DOMAIN]/api/v1/upload

# 5. Search functionality
curl -H "Authorization: Bearer [TEST_TOKEN]" \
  "https://[DOMAIN]/api/v1/search?q=test"
```

**Step 7.3: Performance Validation**
```bash
# Measure response times (10 requests)
for i in {1..10}; do
  curl -s -o /dev/null -w "%{time_total}\n" https://[DOMAIN]/health
done | awk '{
  sum+=$1
  if(min==""){min=max=$1}
  if($1<min){min=$1}
  if($1>max){max=$1}
} END {
  print "Min: " min "s"
  print "Avg: " sum/NR "s"
  print "Max: " max "s"
}'

# Expected:
# Min: <0.100s
# Avg: <0.200s
# Max: <0.500s

# If p95 >0.500s or p99 >1.000s:
# - Check metrics dashboard for anomalies
# - Compare to baseline performance
# - Evaluate if within acceptable variance
```

**Step 7.4: Error Rate Check**
```bash
# Check error rate in last 5 minutes
# Query from metrics dashboard or via API

# Expected: <0.1% (1 error per 1000 requests)

# If error rate >1%:
# - Investigate logs for error patterns
# - Check if errors related to new version
# - Evaluate rollback decision
```

---

### Phase 8: Monitoring Validation (5 minutes)

**Step 8.1: Verify Metrics Collection**
```bash
# Check Prometheus metrics endpoint
curl -s https://[DOMAIN]/metrics | head -20

# Expected: Metrics in Prometheus format
# Example:
# # HELP http_requests_total Total HTTP requests
# # TYPE http_requests_total counter
# http_requests_total{method="GET",status="200"} 12345

# Verify metrics flowing to dashboard
# Navigate to: [METRICS_DASHBOARD_URL]
# Check: CPU, memory, request rate, error rate all updating
```

**Step 8.2: Verify Log Aggregation**
```bash
# Search for recent deployment event in logs
# Navigate to: [LOG_DASHBOARD_URL]

# Search query:
# level:INFO AND message:"Application started" AND version:"v[VERSION]"

# Expected: 3 log entries (one per pod) within last 5 minutes

# Verify log volume normal
# Check logs/minute metric
# Should be similar to pre-deployment baseline
```

**Step 8.3: Verify Alert Configuration**
```bash
# Trigger test alert
curl -X POST https://[DOMAIN]/api/v1/admin/test-alert \
  -H "Authorization: Bearer [ADMIN_TOKEN]" \
  -d '{"severity":"info","message":"Deployment test alert"}'

# Check PagerDuty for alert delivery
# Navigate to: [PAGERDUTY_URL]
# Expected: Alert received within 5 seconds

# Acknowledge/resolve test alert
```

**Step 8.4: Verify SLO Dashboard**
```bash
# Navigate to SLO dashboard: [SLO_DASHBOARD_URL]

# Verify metrics updating:
# - Availability: Should be ≥99.9%
# - Error rate: Should be <0.1%
# - Latency p95: Should be <500ms
# - Latency p99: Should be <1000ms

# Check error budget:
# - Should have >90% remaining
# - If <90%, investigate error sources
```

---

### Phase 9: Post-Deployment Verification (5 minutes)

**Step 9.1: Resource Utilization Check**
```bash
# Check CPU utilization
kubectl top pods -n ${KUBE_NAMESPACE} -l app=aiwg

# Expected output:
# NAME                    CPU(cores)   MEMORY(bytes)
# aiwg-[hash]-[id1]       25m          256Mi
# aiwg-[hash]-[id2]       23m          248Mi
# aiwg-[hash]-[id3]       27m          264Mi

# Compare to baseline:
# - CPU should be within 20% of baseline
# - Memory should be within 10% of baseline

# If significant deviation:
# - Check for memory leaks (memory increasing over time)
# - Check for CPU spikes (inefficient code)
# - Evaluate if requires hotfix
```

**Step 9.2: Database Performance Check**
```bash
# Check active database connections
psql -h ${DB_HOST} -U ${DB_USER} -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Expected: Similar to pre-deployment baseline (typically 5-20)

# Check slow queries
psql -h ${DB_HOST} -U ${DB_USER} -c \
  "SELECT query, (now() - query_start) AS duration
   FROM pg_stat_activity
   WHERE state = 'active' AND (now() - query_start) > interval '5 seconds';"

# Expected: No slow queries (or only known long-running reports)
```

**Step 9.3: External Integration Check**
```bash
# Test external integrations (if applicable)

# Integration 1: [INTEGRATION_NAME]
curl -H "Authorization: Bearer [TOKEN]" \
  https://[DOMAIN]/api/v1/integrations/[INTEGRATION_NAME]/health

# Expected: {"status":"connected","latency_ms":<1000}

# If any integration DISCONNECTED:
# - Check integration credentials
# - Check network connectivity
# - Evaluate if related to deployment (rollback if so)
```

**Step 9.4: User Impact Assessment**
```bash
# Check for user-reported issues

# 1. Support ticket queue
# Navigate to: [SUPPORT_SYSTEM_URL]
# Filter: Created in last 30 minutes
# Expected: Zero deployment-related tickets

# 2. Error tracking
# Navigate to: [ERROR_TRACKING_URL] (Sentry, Rollbar, etc.)
# Filter: Last 15 minutes
# Expected: No new error types, error volume similar to baseline

# 3. Social media monitoring (if applicable)
# Check Twitter/Reddit for mentions of outage
# Expected: No negative mentions

# If user impact detected:
# - Assess severity
# - Evaluate rollback decision
# - Escalate to Product Manager
```

---

### Phase 10: Deployment Completion (5 minutes)

**Step 10.1: Update Deployment Log**
```bash
# Record deployment completion in deployment log
# File: .aiwg/transition/deployment/production-deployment-checklist.md

# Update deployment log table:
# | [TIME] | Deployment complete | SUCCESS | v[VERSION] deployed |

# Final statistics:
# - Deployment duration: [X] minutes
# - Smoke test results: 20/20 passed
# - Zero errors detected
# - Zero user impact
```

**Step 10.2: Announce Deployment Success**
```bash
# Post to war room channel:
cat <<EOF
✅ DEPLOYMENT COMPLETE - v${DEPLOYMENT_VERSION}

Status: SUCCESS
Duration: [X] minutes
Smoke Tests: 20/20 passed
Version: v${DEPLOYMENT_VERSION}
Rollout: 3/3 pods healthy
SLO Compliance: ✓ All SLOs green

No issues detected. Entering hypercare monitoring.

Next: Daily health checks for 2-4 weeks.

- Deployment Lead
EOF

# Post to stakeholder channel:
cat <<EOF
Production Deployment Complete

We've successfully deployed AI Writing Guide v${DEPLOYMENT_VERSION} to production.

✅ Zero downtime
✅ All tests passed
✅ No user impact

New features:
- [Feature 1]
- [Feature 2]

Full release notes: [URL]

- DevOps Team
EOF
```

**Step 10.3: Unlock Codebase**
```bash
# Remove code freeze
# Post in engineering channel:
echo "✅ CODE FREEZE lifted - deployment complete"
echo "main branch is now open for commits"

# Remove branch protection (if temporarily added)
```

**Step 10.4: Initiate Hypercare**
```bash
# Activate hypercare monitoring plan
# Duration: 2-4 weeks
# Daily health checks: 2 hours/day for first week

# Create hypercare schedule:
# Week 1: Daily health checks at [TIME]
# Week 2-4: Health checks every 2 days

# Assign hypercare owner: [NAME]

# Hypercare checklist:
# - Monitor SLO compliance daily
# - Review error logs daily
# - Check performance trends
# - Respond to incidents within 15 minutes
# - Document all issues and resolutions
```

**Step 10.5: Close Change Ticket**
```bash
# Update change ticket status: SUCCESSFUL
# Change ticket: [TICKET_ID]

# Add deployment summary:
# - Start time: [TIME]
# - End time: [TIME]
# - Duration: [X] minutes
# - Result: SUCCESS
# - Issues: NONE
# - Rollback: NOT REQUIRED

# Attach artifacts:
# - Deployment log
# - Smoke test results
# - Post-deployment metrics snapshot
```

---

## Rollback Procedure

### When to Rollback

**IMMEDIATE ROLLBACK REQUIRED:**
- Health checks failing (any endpoint non-200)
- Error rate >5% sustained for >1 minute
- Application completely unresponsive
- Database corruption detected
- Security incident detected

**EVALUATE ROLLBACK:**
- Smoke tests <19/20 passing (95% threshold)
- Error rate >1% sustained for >5 minutes
- p99 latency >5s sustained for >10 minutes
- Critical workflow broken (authentication, core API)
- User-reported production issues

**NO ROLLBACK (FIX FORWARD):**
- Minor bugs not affecting core functionality
- Cosmetic issues
- Known issues documented in release notes
- Error rate <0.5%

---

### Rollback Steps

**Step R1: Declare Rollback (Immediate)**
```bash
# Announce in war room:
echo "🚨 ROLLBACK INITIATED"
echo "Reason: [DESCRIBE ISSUE]"
echo "Time: $(date)"
echo "ETA: 5 minutes"

# Stop smoke testing (if in progress)
# Focus all attention on rollback
```

**Step R2: Rollback Application (2 minutes)**
```bash
# Rollback Kubernetes deployment to previous revision
kubectl rollout undo deployment/aiwg -n ${KUBE_NAMESPACE}

# Expected output:
# deployment.apps/aiwg rolled back

# Monitor rollback progress
kubectl rollout status deployment/aiwg -n ${KUBE_NAMESPACE} --timeout=5m

# Expected output:
# Waiting for deployment "aiwg" rollout to finish...
# deployment "aiwg" successfully rolled out

# Verify pods running previous version
kubectl get pods -n ${KUBE_NAMESPACE} -l app=aiwg

# Check version via API
curl -s https://[DOMAIN]/health | jq '.version'
# Expected: v[PREVIOUS_VERSION]
```

**Step R3: Rollback Database (if migrations ran)**
```bash
# OPTION 1: Rollback migrations (fastest, if reversible)
npm run migrate:rollback -- --to=[PREVIOUS_SCHEMA_VERSION]

# OPTION 2: Restore from snapshot (if migrations not reversible)
# WARNING: This causes downtime (typically 5-15 minutes)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier ${DB_IDENTIFIER}-rollback \
  --db-snapshot-identifier pre-deploy-v${DEPLOYMENT_VERSION}-[TIMESTAMP]

# Wait for restoration
aws rds wait db-instance-available \
  --db-instance-identifier ${DB_IDENTIFIER}-rollback

# Update application to use rollback database
# (Requires updating connection string and pod restart)

# OPTION 3: Point-in-time recovery (most precise)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier ${DB_IDENTIFIER} \
  --target-db-instance-identifier ${DB_IDENTIFIER}-pitr \
  --restore-time [TIMESTAMP_BEFORE_MIGRATION]
```

**Step R4: Verify Rollback (1 minute)**
```bash
# Run critical smoke tests
curl -s -o /dev/null -w "Status: %{http_code}\n" https://[DOMAIN]/
# Expected: 200

curl -s https://[DOMAIN]/health | jq
# Expected: {"status":"healthy","version":"v[PREVIOUS_VERSION]"}

curl -s https://[DOMAIN]/ready | jq '.status'
# Expected: "ready"

# Test critical workflow
# - Login
# - API request
# - Database query

# Verify error rate returned to normal
# Check metrics dashboard: error rate <0.1%
```

**Step R5: Announce Rollback Complete**
```bash
# Post to war room:
cat <<EOF
✅ ROLLBACK COMPLETE

Previous version restored: v[PREVIOUS_VERSION]
Rollback duration: [X] minutes
System status: HEALTHY

Root cause: [BRIEF DESCRIPTION]
Next steps: Post-mortem scheduled for [DATE/TIME]

- Deployment Lead
EOF

# Post to stakeholders:
cat <<EOF
Deployment Rollback Notice

We've rolled back the production deployment due to [ISSUE].

Current version: v[PREVIOUS_VERSION] (stable)
User impact: [DESCRIBE IMPACT]
Status: All systems operational

We're investigating the root cause and will provide an update within 24 hours.

- DevOps Team
EOF
```

---

### Post-Rollback Actions

**1. Create Incident Report**
```bash
# Create incident ticket: [INCIDENT_ID]
# Severity: [CRITICAL/HIGH/MEDIUM]
# Title: "Production Deployment Rollback - v[VERSION]"

# Include:
# - Timeline of events
# - Root cause (if known)
# - Impact assessment
# - Mitigation taken (rollback)
# - Next steps
```

**2. Preserve Evidence**
```bash
# Collect logs from failed deployment
kubectl logs -n ${KUBE_NAMESPACE} -l app=aiwg --previous > \
  logs-failed-deployment-v${DEPLOYMENT_VERSION}.log

# Export metrics from failed deployment
# Screenshots from dashboards showing error spikes

# Export database query logs (if relevant)
# psql -c "SELECT * FROM pg_stat_statements ORDER BY calls DESC LIMIT 100;"
```

**3. Schedule Post-Mortem**
```bash
# Schedule meeting within 24-48 hours
# Required attendees:
# - Deployment Lead
# - Engineering Manager
# - Developer(s) who made changes
# - DevOps Engineer
# - Product Manager

# Agenda:
# - Timeline review
# - Root cause analysis
# - Contributing factors
# - Lessons learned
# - Action items to prevent recurrence
```

**4. Fix and Re-Deploy**
```bash
# Create hotfix branch
git checkout -b hotfix/v[VERSION]-fix-[ISSUE]

# Implement fix
# Test in staging
# Code review
# Merge to main

# Schedule new deployment (typically 1-3 days later)
# Ensure additional testing before retry
```

---

## Troubleshooting Guide

### Issue: ImagePullBackOff

**Symptoms:**
```bash
kubectl get pods -n production -l app=aiwg
# NAME                    READY   STATUS             RESTARTS   AGE
# aiwg-[hash]-[id]        0/1     ImagePullBackOff   0          2m
```

**Diagnosis:**
```bash
# Check pod events
kubectl describe pod aiwg-[hash]-[id] -n production

# Common causes:
# - Image doesn't exist: Failed to pull image "registry/aiwg:v1.0.0": not found
# - Registry auth failed: unauthorized: incorrect username or password
# - Network issue: dial tcp: lookup registry on 10.0.0.2:53: no such host
```

**Resolution:**
```bash
# Verify image exists in registry
docker pull [REGISTRY]/aiwg:${DEPLOYMENT_VERSION}

# Verify registry credentials
kubectl get secret regcred -n production -o yaml

# If image missing:
# - Check CI/CD pipeline - image may not have been built
# - Rebuild and push image manually:
docker build -t [REGISTRY]/aiwg:${DEPLOYMENT_VERSION} .
docker push [REGISTRY]/aiwg:${DEPLOYMENT_VERSION}

# If credentials invalid:
# - Rotate registry credentials
# - Update Kubernetes secret
kubectl create secret docker-registry regcred \
  --docker-server=[REGISTRY] \
  --docker-username=[USER] \
  --docker-password=[PASS] \
  --namespace=production \
  --dry-run=client -o yaml | kubectl apply -f -
```

---

### Issue: CrashLoopBackOff

**Symptoms:**
```bash
kubectl get pods -n production -l app=aiwg
# NAME                    READY   STATUS             RESTARTS   AGE
# aiwg-[hash]-[id]        0/1     CrashLoopBackOff   5          10m
```

**Diagnosis:**
```bash
# Check pod logs
kubectl logs aiwg-[hash]-[id] -n production

# Common causes:
# - Missing environment variable: Error: DATABASE_URL not defined
# - Database connection failed: Error: connect ECONNREFUSED 10.0.1.5:5432
# - Application error: TypeError: Cannot read property 'x' of undefined
# - Resource limits too low: Killed (OOMKilled)
```

**Resolution:**
```bash
# For missing env var:
kubectl edit configmap aiwg-config -n production
# Add missing variable, save, and restart pods

# For database connection:
# Verify database accessible from pod:
kubectl exec -it aiwg-[hash]-[id] -n production -- \
  psql -h ${DB_HOST} -U ${DB_USER} -c "SELECT 1;"

# For application error:
# Review code changes in deployment
# Likely requires code fix and rollback

# For OOMKilled:
# Increase memory limits:
kubectl edit deployment aiwg -n production
# spec.template.spec.containers[0].resources.limits.memory: 1Gi

# Check memory usage:
kubectl top pod aiwg-[hash]-[id] -n production
```

---

### Issue: High Error Rate

**Symptoms:**
- Metrics dashboard shows error rate >1%
- Logs show increased 5xx errors

**Diagnosis:**
```bash
# Check error distribution
kubectl logs -n production -l app=aiwg | grep "ERROR" | tail -100

# Common errors:
# - "Database connection pool exhausted"
# - "Request timeout after 30s"
# - "Unhandled promise rejection"
# - "Rate limit exceeded from external API"
```

**Resolution:**
```bash
# For database pool exhausted:
# Increase connection pool size:
kubectl edit configmap aiwg-config -n production
# DB_POOL_SIZE: 50 (increase from 20)

# For request timeouts:
# Check for slow queries:
psql -h ${DB_HOST} -U ${DB_USER} -c \
  "SELECT query, (now() - query_start) AS duration
   FROM pg_stat_activity
   WHERE state = 'active'
   ORDER BY duration DESC LIMIT 10;"

# For external API rate limits:
# Implement backoff/retry logic (requires code change)
# Or reduce request volume (configuration change)

# If errors persist >5 minutes at >1% rate:
# ROLLBACK RECOMMENDED
```

---

### Issue: High Latency

**Symptoms:**
- p95 latency >1s
- p99 latency >5s
- Slow page loads

**Diagnosis:**
```bash
# Check resource utilization
kubectl top pods -n production -l app=aiwg

# High CPU (>80%):
# - Inefficient algorithm
# - Infinite loop
# - Missing index causing table scans

# High memory (>80%):
# - Memory leak
# - Caching too much data
# - Large object allocations

# Check database performance
psql -h ${DB_HOST} -U ${DB_USER} -c \
  "SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC LIMIT 10;"
```

**Resolution:**
```bash
# For high CPU:
# Scale horizontally:
kubectl scale deployment aiwg --replicas=5 -n production

# Or increase CPU limits:
kubectl edit deployment aiwg -n production
# spec.template.spec.containers[0].resources.limits.cpu: 1000m

# For high memory:
# Restart pods to clear memory leak (temporary):
kubectl rollout restart deployment/aiwg -n production

# Long-term: Requires code fix

# For slow queries:
# Add missing index (requires migration)
# Or optimize query (requires code change)

# If latency doesn't improve within 10 minutes:
# ROLLBACK RECOMMENDED
```

---

## Post-Deployment Checklist

- [ ] Deployment completed successfully
- [ ] Smoke tests 100% passed (20/20)
- [ ] Version verified (v[VERSION] running)
- [ ] SLO dashboard green (all SLOs met)
- [ ] Error rate <0.1%
- [ ] Resource utilization within baseline ±20%
- [ ] No user-reported issues
- [ ] Stakeholders notified of success
- [ ] Deployment log updated
- [ ] Change ticket closed
- [ ] Hypercare initiated
- [ ] Code freeze lifted
- [ ] Lessons learned documented

---

## Lessons Learned Template

**After each deployment, document lessons learned:**

### What Went Well
- [Item 1]
- [Item 2]

### What Could Be Improved
- [Item 1]
- [Item 2]

### Action Items
- [ ] [Action 1] (Owner: [NAME], Due: [DATE])
- [ ] [Action 2] (Owner: [NAME], Due: [DATE])

### Metrics
- Deployment duration: [X] minutes (Target: <60 minutes)
- Rollback required: YES / NO
- Smoke test pass rate: [X]% (Target: ≥95%)
- User impact: NONE / MINOR / MAJOR

---

## Appendix A: Command Reference

### Kubernetes Commands

```bash
# Get cluster info
kubectl cluster-info

# Get node status
kubectl get nodes

# Get pod status
kubectl get pods -n production

# Get pod logs
kubectl logs [POD_NAME] -n production

# Get pod logs (previous container)
kubectl logs [POD_NAME] -n production --previous

# Describe pod (for events)
kubectl describe pod [POD_NAME] -n production

# Exec into pod
kubectl exec -it [POD_NAME] -n production -- /bin/bash

# Get deployment status
kubectl get deployment aiwg -n production

# Update deployment image
kubectl set image deployment/aiwg aiwg=[IMAGE] -n production

# Rollout status
kubectl rollout status deployment/aiwg -n production

# Rollout history
kubectl rollout history deployment/aiwg -n production

# Rollback to previous version
kubectl rollout undo deployment/aiwg -n production

# Rollback to specific revision
kubectl rollout undo deployment/aiwg -n production --to-revision=3

# Scale deployment
kubectl scale deployment aiwg --replicas=5 -n production

# Edit deployment
kubectl edit deployment aiwg -n production

# Get service
kubectl get service aiwg -n production

# Get endpoints
kubectl get endpoints aiwg -n production

# Get ConfigMap
kubectl get configmap aiwg-config -n production -o yaml

# Get Secret
kubectl get secret aiwg-secrets -n production

# Top (resource usage)
kubectl top nodes
kubectl top pods -n production
```

### Docker Commands

```bash
# Pull image
docker pull [REGISTRY]/aiwg:[VERSION]

# List images
docker images

# Inspect image
docker inspect [REGISTRY]/aiwg:[VERSION]

# Get image digest
docker inspect [REGISTRY]/aiwg:[VERSION] --format='{{.Id}}'

# Remove image
docker rmi [REGISTRY]/aiwg:[VERSION]

# Build image
docker build -t [REGISTRY]/aiwg:[VERSION] .

# Push image
docker push [REGISTRY]/aiwg:[VERSION]

# Run container locally (for testing)
docker run -it --rm [REGISTRY]/aiwg:[VERSION]
```

### Database Commands

```bash
# Connect to database
psql -h ${DB_HOST} -U ${DB_USER} -d aiwg_production

# Run query
psql -h ${DB_HOST} -U ${DB_USER} -d aiwg_production -c "SELECT 1;"

# List databases
psql -h ${DB_HOST} -U ${DB_USER} -l

# List tables
psql -h ${DB_HOST} -U ${DB_USER} -d aiwg_production -c "\dt"

# Describe table
psql -h ${DB_HOST} -U ${DB_USER} -d aiwg_production -c "\d [TABLE_NAME]"

# Check active connections
psql -h ${DB_HOST} -U ${DB_USER} -c \
  "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check slow queries
psql -h ${DB_HOST} -U ${DB_USER} -c \
  "SELECT query, (now() - query_start) AS duration
   FROM pg_stat_activity
   WHERE state = 'active' AND (now() - query_start) > interval '5 seconds';"

# Dump database
pg_dump -h ${DB_HOST} -U ${DB_USER} -d aiwg_production > backup.sql

# Restore database
psql -h ${DB_HOST} -U ${DB_USER} -d aiwg_production < backup.sql
```

### AWS Commands

```bash
# Get caller identity
aws sts get-caller-identity

# Create RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier [DB_ID] \
  --db-snapshot-identifier [SNAPSHOT_ID]

# List RDS snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier [DB_ID]

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier [NEW_DB_ID] \
  --db-snapshot-identifier [SNAPSHOT_ID]

# Describe target health
aws elbv2 describe-target-health \
  --target-group-arn [ARN]

# Create CloudFront invalidation
aws cloudfront create-invalidation \
  --distribution-id [ID] \
  --paths "/*"

# Get CloudFront invalidation status
aws cloudfront get-invalidation \
  --distribution-id [ID] \
  --id [INVALIDATION_ID]

# Upload to S3
aws s3 cp [FILE] s3://[BUCKET]/[KEY]

# Download from S3
aws s3 cp s3://[BUCKET]/[KEY] [FILE]
```

---

## Appendix B: Deployment Timeline Template

**Use this to track deployment progress:**

| Time | Phase | Task | Status | Duration | Notes |
|------|-------|------|--------|----------|-------|
| 14:00 | Pre-Deploy | Go/No-Go decision | ✅ | 15m | GO |
| 14:15 | Phase 1 | Deployment start | ✅ | 5m | |
| 14:20 | Phase 2 | Database migration | ✅ | 10m | 3 migrations |
| 14:30 | Phase 3 | Application deployment | ✅ | 20m | |
| 14:50 | Phase 4 | Configuration update | ⏭️ | - | Skipped (no config changes) |
| 14:50 | Phase 5 | Service validation | ✅ | 5m | |
| 14:55 | Phase 6 | Cache invalidation | ⏭️ | - | Skipped (no CDN) |
| 14:55 | Phase 7 | Smoke testing | ✅ | 15m | 20/20 passed |
| 15:10 | Phase 8 | Monitoring validation | ✅ | 5m | |
| 15:15 | Phase 9 | Post-deploy verification | ✅ | 5m | |
| 15:20 | Phase 10 | Deployment completion | ✅ | 5m | |

**Total Duration:** 80 minutes (Target: <60 minutes)

**Issues:** None

**Rollback Required:** No

---

**END OF DEPLOYMENT RUNBOOK**

**Version:** 1.0
**Owner:** DevOps Team
**Last Updated:** [DATE]
**Next Review:** After next deployment
