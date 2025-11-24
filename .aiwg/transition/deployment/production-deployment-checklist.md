# Production Deployment Checklist

**Project:** AI Writing Guide Framework
**Deployment Date:** [DATE]
**Deployment Window:** [START TIME] - [END TIME]
**Deployment Lead:** [NAME]
**Version:** [VERSION NUMBER]
**Status:** PENDING

---

## Pre-Deployment Checklist (T-24 Hours)

### Code Readiness (8 items)

- [ ] **All PR gate criteria met**
  - [ ] Test pass rate ≥98% (verified: ____/2019 tests passing)
  - [ ] CodebaseAnalyzer fully functional (44/44 tests)
  - [ ] 5 E2E test suites passing
  - [ ] Coverage ≥90% (verified: ____%)
  - **Verification:** Test execution report dated [DATE]
  - **Responsible:** Test Engineer
  - **Sign-off:** ________________

- [ ] **UAT sign-off complete**
  - [ ] All UAT scenarios passed (____/15 scenarios)
  - [ ] Critical defects resolved (count: ____)
  - [ ] Known issues documented and approved
  - **Verification:** UAT sign-off document signed by Product Manager
  - **Responsible:** QA Team Lead
  - **Sign-off:** ________________

- [ ] **Code freeze in effect**
  - [ ] `main` branch locked (no commits since [TIMESTAMP])
  - [ ] All feature branches merged
  - [ ] No outstanding PRs
  - **Verification:** Git log shows no commits in freeze window
  - **Responsible:** DevOps Engineer
  - **Sign-off:** ________________

- [ ] **Release notes prepared**
  - [ ] Feature summary complete
  - [ ] Known limitations documented
  - [ ] Breaking changes identified (if any)
  - [ ] Migration guide (if applicable)
  - **Verification:** `RELEASE_NOTES_v[VERSION].md` reviewed and approved
  - **Responsible:** Technical Writer
  - **Sign-off:** ________________

- [ ] **Version tagged in Git**
  - [ ] Tag format: `v[MAJOR].[MINOR].[PATCH]` (e.g., v1.0.0)
  - [ ] Tag annotated with release notes summary
  - [ ] Tag pushed to origin
  - **Verification:** `git tag -l v[VERSION]` returns tag
  - **Responsible:** DevOps Engineer
  - **Sign-off:** ________________

- [ ] **Build artifacts generated**
  - [ ] Production build successful (CI/CD pipeline: #____)
  - [ ] Docker image built and tagged: `aiwg:[VERSION]`
  - [ ] Docker image scanned (zero vulnerabilities)
  - [ ] Artifacts uploaded to registry
  - **Verification:** Registry URL: ________________
  - **Responsible:** DevOps Engineer
  - **Sign-off:** ________________

- [ ] **Dependencies locked**
  - [ ] `package-lock.json` committed
  - [ ] No dependency updates in last 48 hours
  - [ ] Security scan passed (zero production vulnerabilities)
  - **Verification:** `npm audit --production` returns zero vulnerabilities
  - **Responsible:** Security Engineer
  - **Sign-off:** ________________

- [ ] **Configuration validated**
  - [ ] Environment variables documented
  - [ ] `.env.production.example` updated
  - [ ] No hardcoded secrets in codebase
  - [ ] Configuration drift check passed
  - **Verification:** Config validation script output attached
  - **Responsible:** DevOps Engineer
  - **Sign-off:** ________________

---

### Infrastructure Readiness (12 items)

- [ ] **Production environment provisioned**
  - [ ] Servers/containers running (count: ____)
  - [ ] CPU allocation: ____ vCPUs per instance
  - [ ] Memory allocation: ____ GB per instance
  - [ ] Disk allocation: ____ GB per instance
  - **Verification:** Infrastructure dashboard screenshot attached
  - **Responsible:** Operations Team
  - **Sign-off:** ________________

- [ ] **SSL certificates valid**
  - [ ] Certificate expiry date: ________________ (>30 days from now)
  - [ ] Certificate chain complete
  - [ ] Certificate matches domain: ________________
  - [ ] Auto-renewal configured (if Let's Encrypt)
  - **Verification:** `openssl s_client -connect [domain]:443 -servername [domain]`
  - **Responsible:** DevOps Engineer
  - **Sign-off:** ________________

- [ ] **DNS records configured**
  - [ ] A/AAAA records point to production IPs
  - [ ] CNAME records configured (if applicable)
  - [ ] TTL appropriate (300s recommended for deployment window)
  - [ ] DNS propagation verified (via external resolver)
  - **Verification:** `dig [domain] +short` returns correct IP
  - **Responsible:** DevOps Engineer
  - **Sign-off:** ________________

- [ ] **Load balancer configured**
  - [ ] Target group healthy (____/____ targets)
  - [ ] Health check interval: ____ seconds
  - [ ] Health check timeout: ____ seconds
  - [ ] Unhealthy threshold: ____ consecutive failures
  - [ ] Sticky sessions configured (if required)
  - **Verification:** Load balancer dashboard shows all targets healthy
  - **Responsible:** Operations Team
  - **Sign-off:** ________________

- [ ] **CDN configured (if applicable)**
  - [ ] CDN distribution active
  - [ ] Cache rules configured
  - [ ] SSL/TLS enabled on CDN
  - [ ] Origin failover configured
  - **Verification:** `curl -I [CDN_URL]` returns correct headers
  - **Responsible:** DevOps Engineer
  - **Sign-off:** ________________

- [ ] **Database ready**
  - [ ] Production database accessible
  - [ ] Connection pooling configured (max connections: ____)
  - [ ] Database schema up to date (version: ____)
  - [ ] Read replicas healthy (if applicable)
  - **Verification:** Database health check script passed
  - **Responsible:** Database Administrator
  - **Sign-off:** ________________

- [ ] **Database backups verified**
  - [ ] Most recent backup timestamp: ________________
  - [ ] Backup restoration tested (last test date: ________)
  - [ ] Backup retention policy: ____ days
  - [ ] Point-in-time recovery enabled
  - **Verification:** Backup verification script passed
  - **Responsible:** Database Administrator
  - **Sign-off:** ________________

- [ ] **Network connectivity validated**
  - [ ] VPC peering configured (if applicable)
  - [ ] Security groups allow required traffic
  - [ ] Outbound internet access verified (for external APIs)
  - [ ] Internal service-to-service connectivity tested
  - **Verification:** Network connectivity test script passed
  - **Responsible:** Network Engineer
  - **Sign-off:** ________________

- [ ] **Auto-scaling configured**
  - [ ] Min instances: ____
  - [ ] Max instances: ____
  - [ ] Scale-up threshold: CPU >____% for ____ minutes
  - [ ] Scale-down threshold: CPU <____% for ____ minutes
  - **Verification:** Auto-scaling policy document attached
  - **Responsible:** Operations Team
  - **Sign-off:** ________________

- [ ] **Storage configured**
  - [ ] Persistent volumes mounted
  - [ ] Storage capacity: ____ GB available
  - [ ] Backup retention: ____ days
  - [ ] IOPS provisioned (if applicable): ____
  - **Verification:** Storage dashboard shows available capacity
  - **Responsible:** Operations Team
  - **Sign-off:** ________________

- [ ] **Caching layer configured (if applicable)**
  - [ ] Redis/Memcached instances running
  - [ ] Cache memory allocation: ____ GB
  - [ ] Cache eviction policy configured
  - [ ] Connection pooling configured
  - **Verification:** Cache health check passed
  - **Responsible:** DevOps Engineer
  - **Sign-off:** ________________

- [ ] **Message queues configured (if applicable)**
  - [ ] Queue service running (SQS, RabbitMQ, etc.)
  - [ ] Dead letter queue configured
  - [ ] Message retention: ____ days
  - [ ] Throughput limits validated
  - **Verification:** Queue health check passed
  - **Responsible:** DevOps Engineer
  - **Sign-off:** ________________

---

### Security Readiness (10 items)

- [ ] **Security scan passed (zero vulnerabilities)**
  - [ ] SAST scan results: ____ critical, ____ high (target: 0/0)
  - [ ] DAST scan results: ____ critical, ____ high (target: 0/0)
  - [ ] Container scan results: zero vulnerabilities
  - [ ] Dependency scan results: zero production vulnerabilities
  - **Verification:** Security scan report dated [DATE] attached
  - **Responsible:** Security Engineer
  - **Sign-off:** ________________

- [ ] **Secrets rotated**
  - [ ] API keys rotated (last rotation: ________)
  - [ ] Database credentials rotated
  - [ ] Encryption keys rotated (if applicable)
  - [ ] Old secrets revoked
  - **Verification:** Secrets rotation log attached
  - **Responsible:** Security Engineer
  - **Sign-off:** ________________

- [ ] **Access controls reviewed**
  - [ ] IAM policies audited
  - [ ] Principle of least privilege enforced
  - [ ] Service accounts have minimum permissions
  - [ ] Unused accounts disabled
  - **Verification:** Access control audit report attached
  - **Responsible:** Security Engineer
  - **Sign-off:** ________________

- [ ] **Firewall rules configured**
  - [ ] Inbound rules allow only required traffic
  - [ ] Outbound rules restrict unnecessary traffic
  - [ ] Default deny policy enforced
  - [ ] Rules documented in runbook
  - **Verification:** Firewall rule export attached
  - **Responsible:** Network Security Engineer
  - **Sign-off:** ________________

- [ ] **HTTPS enforced**
  - [ ] HTTP redirects to HTTPS (301 redirect)
  - [ ] HSTS header configured (max-age ≥31536000)
  - [ ] TLS 1.2+ enforced (TLS 1.0/1.1 disabled)
  - [ ] Strong cipher suites only
  - **Verification:** SSL Labs scan score: A+ (URL: ________________)
  - **Responsible:** DevOps Engineer
  - **Sign-off:** ________________

- [ ] **Audit logging enabled**
  - [ ] All admin actions logged
  - [ ] Authentication events logged
  - [ ] Data access logged (if applicable)
  - [ ] Logs immutable/tamper-proof
  - **Verification:** Audit log test event visible in logs
  - **Responsible:** Security Engineer
  - **Sign-off:** ________________

- [ ] **Rate limiting configured**
  - [ ] API rate limits: ____ requests/minute per IP
  - [ ] Burst limits: ____ requests/second
  - [ ] Rate limit response: HTTP 429 with Retry-After header
  - [ ] Whitelist for known clients (if applicable)
  - **Verification:** Rate limit test script passed
  - **Responsible:** DevOps Engineer
  - **Sign-off:** ________________

- [ ] **DDoS protection enabled**
  - [ ] CloudFlare/AWS Shield configured
  - [ ] Geo-blocking configured (if required)
  - [ ] Traffic anomaly detection enabled
  - [ ] Mitigation rules tested
  - **Verification:** DDoS protection dashboard screenshot attached
  - **Responsible:** Network Security Engineer
  - **Sign-off:** ________________

- [ ] **Data encryption at rest**
  - [ ] Database encryption enabled
  - [ ] Storage encryption enabled (AES-256 or better)
  - [ ] Encryption keys managed securely (KMS)
  - [ ] Encryption verified via audit
  - **Verification:** Encryption configuration document attached
  - **Responsible:** Security Engineer
  - **Sign-off:** ________________

- [ ] **Data encryption in transit**
  - [ ] TLS 1.2+ for all external connections
  - [ ] mTLS for internal service-to-service (if applicable)
  - [ ] Database connections encrypted
  - [ ] Certificate validation enforced
  - **Verification:** Network traffic capture shows encrypted connections
  - **Responsible:** Security Engineer
  - **Sign-off:** ________________

---

### Monitoring Readiness (10 items)

- [ ] **SLO/SLI dashboard operational**
  - [ ] Availability SLO: 99.9% uptime
  - [ ] Latency SLO: p95 <500ms, p99 <1s
  - [ ] Error rate SLO: <0.1%
  - [ ] Dashboard accessible: [URL]
  - **Verification:** Dashboard screenshot showing real-time metrics
  - **Responsible:** Reliability Engineer
  - **Sign-off:** ________________

- [ ] **PagerDuty alerts configured**
  - [ ] Service integration key: ________________
  - [ ] Escalation policy configured (levels: ____)
  - [ ] On-call rotation active (current on-call: ________)
  - [ ] Test alert delivered successfully
  - **Verification:** Test alert screenshot + delivery confirmation
  - **Responsible:** DevOps Engineer
  - **Sign-off:** ________________

- [ ] **Critical alerts configured**
  - [ ] SLO breach alert (error budget <10%)
  - [ ] Service outage alert (health check fails)
  - [ ] High error rate alert (>1% errors)
  - [ ] High latency alert (p95 >1s)
  - [ ] Disk space alert (<15% free)
  - **Verification:** Alert configuration export attached
  - **Responsible:** Reliability Engineer
  - **Sign-off:** ________________

- [ ] **Log aggregation active**
  - [ ] All services shipping logs
  - [ ] Log retention: 90 days
  - [ ] Log dashboard accessible: [URL]
  - [ ] Log search functional (test query executed)
  - **Verification:** Log dashboard screenshot showing recent logs
  - **Responsible:** DevOps Engineer
  - **Sign-off:** ________________

- [ ] **Health check endpoints working**
  - [ ] `/health` endpoint: HTTP 200 (response time: ____ms)
  - [ ] `/ready` endpoint: HTTP 200 (response time: ____ms)
  - [ ] `/live` endpoint: HTTP 200 (response time: ____ms)
  - [ ] Health checks include version information
  - **Verification:** `curl -s [URL]/health | jq` output attached
  - **Responsible:** Software Engineer
  - **Sign-off:** ________________

- [ ] **Performance baselines established**
  - [ ] Baseline CPU utilization: ____%
  - [ ] Baseline memory usage: ____ GB
  - [ ] Baseline response time: p50=____ms, p95=____ms, p99=____ms
  - [ ] Baseline throughput: ____ operations/minute
  - **Verification:** Performance baseline document attached
  - **Responsible:** Performance Engineer
  - **Sign-off:** ________________

- [ ] **APM/tracing configured (if applicable)**
  - [ ] Distributed tracing enabled (Jaeger, DataDog, etc.)
  - [ ] Service map visible
  - [ ] Trace sampling rate: ____%
  - [ ] Critical paths instrumented
  - **Verification:** APM dashboard screenshot showing traces
  - **Responsible:** DevOps Engineer
  - **Sign-off:** ________________

- [ ] **Metrics collection validated**
  - [ ] CPU, memory, disk metrics flowing
  - [ ] Application metrics flowing (custom metrics)
  - [ ] Database metrics flowing (connections, query time)
  - [ ] Network metrics flowing (throughput, errors)
  - **Verification:** Metrics dashboard screenshot showing all metric types
  - **Responsible:** Reliability Engineer
  - **Sign-off:** ________________

- [ ] **Synthetic monitoring configured (if applicable)**
  - [ ] Synthetic tests running from ____ locations
  - [ ] Test frequency: every ____ minutes
  - [ ] Alert on test failures: enabled
  - [ ] Uptime dashboard: [URL]
  - **Verification:** Synthetic monitoring dashboard screenshot
  - **Responsible:** DevOps Engineer
  - **Sign-off:** ________________

- [ ] **Status page configured (if applicable)**
  - [ ] Public status page: [URL]
  - [ ] Component status tracked (____/____ components)
  - [ ] Incident templates prepared
  - [ ] Email/SMS notifications configured
  - **Verification:** Status page accessible and showing "Operational"
  - **Responsible:** Operations Team
  - **Sign-off:** ________________

---

### Team Readiness (8 items)

- [ ] **On-call rotation scheduled**
  - [ ] Primary on-call: ________________ (contact: ________)
  - [ ] Secondary on-call: ________________ (contact: ________)
  - [ ] Escalation on-call: ________________ (contact: ________)
  - [ ] Rotation duration: ____ days
  - **Verification:** PagerDuty schedule screenshot attached
  - **Responsible:** Engineering Manager
  - **Sign-off:** ________________

- [ ] **Runbooks accessible**
  - [ ] Deployment runbook: [URL or path]
  - [ ] Incident response runbook: [URL or path]
  - [ ] Rollback runbook: [URL or path]
  - [ ] All runbooks tested in staging
  - **Verification:** Runbook index attached with last-updated dates
  - **Responsible:** Technical Writer
  - **Sign-off:** ________________

- [ ] **Rollback plan reviewed**
  - [ ] Rollback decision criteria documented
  - [ ] Rollback procedure tested in staging
  - [ ] Rollback time estimate: <5 minutes
  - [ ] Rollback authority assigned: ________________
  - **Verification:** Rollback test results from staging attached
  - **Responsible:** DevOps Engineer
  - **Sign-off:** ________________

- [ ] **Support team trained**
  - [ ] Training completed: [DATE]
  - [ ] Training attendees: ____/____ required
  - [ ] Training recording available: [URL]
  - [ ] Support team confidence: HIGH/MEDIUM/LOW
  - **Verification:** Training attendance sheet attached
  - **Responsible:** Operations Manager
  - **Sign-off:** ________________

- [ ] **Stakeholders notified**
  - [ ] Deployment notification sent: [DATE/TIME]
  - [ ] Change window communicated: [START] - [END]
  - [ ] Impact assessment shared (expected downtime: ____ minutes)
  - [ ] Contact information provided
  - **Verification:** Notification email confirmation attached
  - **Responsible:** Product Manager
  - **Sign-off:** ________________

- [ ] **War room scheduled**
  - [ ] Video conference link: ________________
  - [ ] Chat channel: ________________ (Slack, Teams, etc.)
  - [ ] All team members invited (____/____ confirmed)
  - [ ] Screen sharing tested
  - **Verification:** Calendar invite screenshot attached
  - **Responsible:** Project Manager
  - **Sign-off:** ________________

- [ ] **Deployment checklist printed**
  - [ ] Physical copy for deployment lead
  - [ ] Backup copy available
  - [ ] Checklist includes roll-call section
  - [ ] Sign-off section ready
  - **Verification:** Checklist review completed
  - **Responsible:** Deployment Lead
  - **Sign-off:** ________________

- [ ] **Communication plan activated**
  - [ ] Status update schedule: every ____ minutes
  - [ ] Stakeholder distribution list confirmed
  - [ ] Escalation contact tree posted
  - [ ] Post-deployment communication template ready
  - **Verification:** Communication plan document attached
  - **Responsible:** Product Manager
  - **Sign-off:** ________________

---

## Pre-Deployment Go/No-Go Decision (T-1 Hour)

**Decision Time:** [TIMESTAMP]

**Attendees:**
- Deployment Lead: ________________
- Engineering Manager: ________________
- DevOps Engineer: ________________
- Operations Manager: ________________
- Product Manager: ________________

**Checklist Summary:**
- Code Readiness: ____/8 items complete
- Infrastructure Readiness: ____/12 items complete
- Security Readiness: ____/10 items complete
- Monitoring Readiness: ____/10 items complete
- Team Readiness: ____/8 items complete

**TOTAL: ____/48 items complete** (Target: 48/48 = 100%)

**Decision:**
- [ ] **GO** - Proceed with deployment
- [ ] **NO-GO** - Abort deployment (reason: ________________)

**Sign-offs:**
- Deployment Lead: ________________ Date: ________
- Engineering Manager: ________________ Date: ________
- Product Manager: ________________ Date: ________

---

## Deployment Procedure (Step-by-Step)

### Phase 1: Deployment Preparation (15 minutes)

**Step 1.1: Activate War Room**
```bash
# Join deployment war room
# Video conference: [URL]
# Chat channel: [URL]
```
- [ ] All team members present (roll call)
- [ ] Screen sharing active
- [ ] Deployment lead confirmed
- **Time:** ________ **Completed by:** ________

**Step 1.2: Final Pre-Deployment Checks**
```bash
# Verify production environment health
kubectl get nodes  # All nodes Ready
kubectl get pods -A | grep -v Running  # No unhealthy pods

# Verify current version
curl -s https://[DOMAIN]/health | jq '.version'
# Expected: v[CURRENT_VERSION]

# Verify database connectivity
psql -h [DB_HOST] -U [DB_USER] -c "SELECT 1;"
# Expected: (1 row)
```
- [ ] All checks passed
- [ ] Current version confirmed: ________________
- [ ] No active incidents
- **Time:** ________ **Completed by:** ________

**Step 1.3: Create Pre-Deployment Snapshot**
```bash
# Take database snapshot (if applicable)
aws rds create-db-snapshot \
  --db-instance-identifier [DB_IDENTIFIER] \
  --db-snapshot-identifier pre-deploy-v[VERSION]-$(date +%Y%m%d-%H%M%S)

# Snapshot ID: ________________
```
- [ ] Snapshot created successfully
- [ ] Snapshot ID recorded
- **Time:** ________ **Completed by:** ________

**Step 1.4: Enable Maintenance Mode (Optional)**
```bash
# If maintenance page required
kubectl apply -f maintenance-mode.yaml

# Verify maintenance page
curl -I https://[DOMAIN]
# Expected: HTTP 503 with Retry-After header
```
- [ ] Maintenance mode enabled (if required)
- [ ] Maintenance page accessible
- **Time:** ________ **Completed by:** ________

---

### Phase 2: Database Migration (10 minutes, if applicable)

**Step 2.1: Backup Current Database**
```bash
# Additional backup before migration
pg_dump -h [DB_HOST] -U [DB_USER] -d [DB_NAME] | \
  gzip > backup-pre-migration-$(date +%Y%m%d-%H%M%S).sql.gz

# Verify backup size (should be >0)
ls -lh backup-pre-migration-*.sql.gz
```
- [ ] Backup completed
- [ ] Backup size verified: ________ MB
- **Time:** ________ **Completed by:** ________

**Step 2.2: Run Database Migrations**
```bash
# Run migrations in transaction mode
npm run migrate:prod

# Expected output:
# ✓ Migration 001_add_users_table: SUCCESS
# ✓ Migration 002_add_indices: SUCCESS
# All migrations completed successfully
```
- [ ] Migrations successful
- [ ] No errors in output
- [ ] Migration count: ________ migrations applied
- **Time:** ________ **Completed by:** ________

**Step 2.3: Validate Database Schema**
```bash
# Verify schema version
psql -h [DB_HOST] -U [DB_USER] -d [DB_NAME] -c \
  "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"

# Expected: [TARGET_SCHEMA_VERSION]
```
- [ ] Schema version correct: ________________
- [ ] No schema errors
- **Time:** ________ **Completed by:** ________

**Rollback Trigger:** If migrations fail, execute database rollback:
```bash
# Restore from backup
gunzip < backup-pre-migration-[TIMESTAMP].sql.gz | \
  psql -h [DB_HOST] -U [DB_USER] -d [DB_NAME]
```

---

### Phase 3: Application Deployment (20 minutes)

**Step 3.1: Pull New Docker Image**
```bash
# Pull production image
docker pull [REGISTRY]/aiwg:v[VERSION]

# Verify image digest
docker inspect [REGISTRY]/aiwg:v[VERSION] --format='{{.Id}}'
# Expected digest: sha256:[EXPECTED_DIGEST]
```
- [ ] Image pulled successfully
- [ ] Image digest matches expected: ________________
- **Time:** ________ **Completed by:** ________

**Step 3.2: Update Kubernetes Deployment**
```bash
# Update deployment with new image
kubectl set image deployment/aiwg \
  aiwg=[REGISTRY]/aiwg:v[VERSION] \
  --namespace=production

# Expected output:
# deployment.apps/aiwg image updated
```
- [ ] Deployment updated
- [ ] No errors in output
- **Time:** ________ **Completed by:** ________

**Step 3.3: Monitor Rollout Progress**
```bash
# Watch rollout status (this will stream output)
kubectl rollout status deployment/aiwg --namespace=production

# Expected output:
# Waiting for deployment "aiwg" rollout to finish: 0 of 3 updated replicas are available...
# Waiting for deployment "aiwg" rollout to finish: 1 of 3 updated replicas are available...
# Waiting for deployment "aiwg" rollout to finish: 2 of 3 updated replicas are available...
# deployment "aiwg" successfully rolled out
```
- [ ] Rollout completed successfully
- [ ] All replicas ready: ____/3
- [ ] Rollout duration: ________ minutes
- **Time:** ________ **Completed by:** ________

**Step 3.4: Verify Pod Health**
```bash
# Check pod status
kubectl get pods -l app=aiwg --namespace=production

# All pods should show:
# NAME                    READY   STATUS    RESTARTS   AGE
# aiwg-[hash]-[id]        1/1     Running   0          2m
# aiwg-[hash]-[id]        1/1     Running   0          2m
# aiwg-[hash]-[id]        1/1     Running   0          2m
```
- [ ] All pods Running
- [ ] No CrashLoopBackOff or Error states
- [ ] Zero restarts
- **Time:** ________ **Completed by:** ________

**Rollback Trigger:** If rollout fails, execute application rollback:
```bash
# Rollback to previous version
kubectl rollout undo deployment/aiwg --namespace=production
kubectl rollout status deployment/aiwg --namespace=production
```

---

### Phase 4: Configuration Updates (5 minutes, if applicable)

**Step 4.1: Update ConfigMaps**
```bash
# Apply new configuration
kubectl apply -f production-config-v[VERSION].yaml --namespace=production

# Verify ConfigMap updated
kubectl get configmap aiwg-config --namespace=production -o yaml
```
- [ ] ConfigMap updated
- [ ] Configuration values correct
- **Time:** ________ **Completed by:** ________

**Step 4.2: Update Secrets (if applicable)**
```bash
# Apply new secrets (if rotated)
kubectl apply -f production-secrets-v[VERSION].yaml --namespace=production

# Verify Secret updated (DO NOT print secret values)
kubectl get secret aiwg-secrets --namespace=production
```
- [ ] Secrets updated
- [ ] No secrets exposed in logs
- **Time:** ________ **Completed by:** ________

**Step 4.3: Restart Pods (if config requires restart)**
```bash
# Trigger rolling restart to pick up new config
kubectl rollout restart deployment/aiwg --namespace=production
kubectl rollout status deployment/aiwg --namespace=production
```
- [ ] Pods restarted successfully
- [ ] All pods healthy after restart
- **Time:** ________ **Completed by:** ________

---

### Phase 5: Service Restart & Validation (5 minutes)

**Step 5.1: Verify Service Endpoints**
```bash
# Check service endpoint
kubectl get service aiwg --namespace=production

# Expected output:
# NAME   TYPE           CLUSTER-IP       EXTERNAL-IP      PORT(S)
# aiwg   LoadBalancer   10.100.200.50    [PUBLIC_IP]      443:30443/TCP
```
- [ ] Service endpoints correct
- [ ] External IP assigned: ________________
- **Time:** ________ **Completed by:** ________

**Step 5.2: Verify Load Balancer Health**
```bash
# Check load balancer target health
aws elbv2 describe-target-health \
  --target-group-arn [TARGET_GROUP_ARN]

# All targets should show TargetHealth.State: healthy
```
- [ ] All targets healthy: ____/3
- [ ] No draining or unhealthy targets
- **Time:** ________ **Completed by:** ________

**Step 5.3: Disable Maintenance Mode (if enabled)**
```bash
# Remove maintenance mode
kubectl delete -f maintenance-mode.yaml

# Verify production traffic flowing
curl -I https://[DOMAIN]
# Expected: HTTP 200
```
- [ ] Maintenance mode disabled
- [ ] Production traffic flowing
- **Time:** ________ **Completed by:** ________

---

### Phase 6: Cache Invalidation (5 minutes, if applicable)

**Step 6.1: Clear Application Cache**
```bash
# Clear Redis cache (if applicable)
redis-cli -h [REDIS_HOST] FLUSHDB

# Expected output: OK
```
- [ ] Application cache cleared
- **Time:** ________ **Completed by:** ________

**Step 6.2: Clear CDN Cache**
```bash
# Invalidate CloudFront distribution (if applicable)
aws cloudfront create-invalidation \
  --distribution-id [DISTRIBUTION_ID] \
  --paths "/*"

# Invalidation ID: ________________
```
- [ ] CDN cache invalidated
- [ ] Invalidation ID recorded
- **Time:** ________ **Completed by:** ________

**Step 6.3: Verify Cache Invalidation**
```bash
# Verify fresh content served
curl -I https://[DOMAIN]/health

# Check headers:
# X-Cache: Miss from cloudfront (first request after invalidation)
# X-Version: v[VERSION] (should match new version)
```
- [ ] Cache invalidation confirmed
- [ ] New version served
- **Time:** ________ **Completed by:** ________

---

## Smoke Testing Checklist (20 items, 15 minutes)

**Smoke Test Execution Time:** [TIMESTAMP]

### Critical Workflow Tests

- [ ] **Test 1: Application Responds**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://[DOMAIN]/
  # Expected: 200
  ```
  **Result:** ________ **Time:** ________

- [ ] **Test 2: Health Check Passing**
  ```bash
  curl -s https://[DOMAIN]/health | jq
  # Expected: {"status":"healthy","version":"v[VERSION]"}
  ```
  **Result:** ________ **Time:** ________

- [ ] **Test 3: Readiness Check Passing**
  ```bash
  curl -s https://[DOMAIN]/ready | jq
  # Expected: {"status":"ready","dependencies":{"database":"ok","filesystem":"ok"}}
  ```
  **Result:** ________ **Time:** ________

- [ ] **Test 4: Liveness Check Passing**
  ```bash
  curl -s -w "Time: %{time_total}s\n" https://[DOMAIN]/live
  # Expected: HTTP 200, Time <0.010s
  ```
  **Result:** ________ **Time:** ________

- [ ] **Test 5: Version Endpoint Correct**
  ```bash
  curl -s https://[DOMAIN]/version | jq
  # Expected: {"version":"v[VERSION]","build":"[BUILD_NUMBER]","commit":"[GIT_SHA]"}
  ```
  **Result:** ________ **Time:** ________

- [ ] **Test 6: Authentication Working**
  - Navigate to: https://[DOMAIN]/login
  - Attempt login with test credentials
  - Expected: Successful login, session token issued
  **Result:** PASS/FAIL **Time:** ________

- [ ] **Test 7: API Endpoint Functional**
  ```bash
  curl -H "Authorization: Bearer [TEST_TOKEN]" \
    https://[DOMAIN]/api/v1/test
  # Expected: HTTP 200 with valid JSON response
  ```
  **Result:** ________ **Time:** ________

- [ ] **Test 8: Database Connectivity**
  ```bash
  curl -H "Authorization: Bearer [TEST_TOKEN]" \
    https://[DOMAIN]/api/v1/db-health
  # Expected: {"database":"connected","latency_ms":<100}
  ```
  **Result:** ________ **Time:** ________

- [ ] **Test 9: File Upload (if applicable)**
  - Upload test file via UI or API
  - Expected: HTTP 201, file ID returned
  **Result:** PASS/FAIL **Time:** ________

- [ ] **Test 10: External Integration (if applicable)**
  - Test integration with external API/service
  - Expected: Integration responds within SLA
  **Result:** PASS/FAIL **Time:** ________

### Performance Tests

- [ ] **Test 11: Response Time Within SLO**
  ```bash
  for i in {1..10}; do
    curl -s -o /dev/null -w "%{time_total}\n" https://[DOMAIN]/
  done | awk '{s+=$1; c++} END {print "Average: " s/c "s"}'
  # Expected: Average <0.500s (p95 target)
  ```
  **Result:** ________ **Time:** ________

- [ ] **Test 12: Concurrent Request Handling**
  ```bash
  ab -n 100 -c 10 https://[DOMAIN]/
  # Expected: 100% success rate, mean time <500ms
  ```
  **Result:** ________ **Time:** ________

### Monitoring Tests

- [ ] **Test 13: Logs Flowing**
  - Check log dashboard: [URL]
  - Search for recent deployment event
  - Expected: Logs visible within 30 seconds
  **Result:** PASS/FAIL **Time:** ________

- [ ] **Test 14: Metrics Being Collected**
  - Check metrics dashboard: [URL]
  - Verify CPU, memory, request count metrics
  - Expected: Metrics updating in real-time
  **Result:** PASS/FAIL **Time:** ________

- [ ] **Test 15: Alerts Functioning**
  ```bash
  # Trigger test alert
  curl -X POST https://[DOMAIN]/api/v1/test-alert
  # Check PagerDuty for alert delivery
  ```
  **Result:** Alert received in ________ seconds **Time:** ________

- [ ] **Test 16: SLO Dashboard Updating**
  - Navigate to SLO dashboard: [URL]
  - Verify SLO compliance metrics updating
  - Expected: Availability ≥99.9%, error rate <0.1%
  **Result:** PASS/FAIL **Time:** ________

### Error Handling Tests

- [ ] **Test 17: 404 Handling**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://[DOMAIN]/nonexistent
  # Expected: 404 with friendly error page
  ```
  **Result:** ________ **Time:** ________

- [ ] **Test 18: 500 Error Handling**
  - Trigger intentional error (if test endpoint available)
  - Expected: HTTP 500 with error tracking ID, no sensitive data leaked
  **Result:** PASS/FAIL **Time:** ________

- [ ] **Test 19: Rate Limiting**
  ```bash
  for i in {1..100}; do curl -s -o /dev/null -w "%{http_code}\n" https://[DOMAIN]/api/v1/test; done | grep 429
  # Expected: At least one 429 (rate limit exceeded) response
  ```
  **Result:** ________ **Time:** ________

- [ ] **Test 20: Graceful Degradation**
  - Simulate external service failure (if applicable)
  - Expected: Application continues functioning with degraded features
  **Result:** PASS/FAIL **Time:** ________

---

## Smoke Test Summary

**Total Tests:** 20
**Passed:** ________ (**Target:** ≥19/20, 95%)
**Failed:** ________
**Blocked:** ________

**Overall Status:** PASS / FAIL

**Sign-off:**
- QA Engineer: ________________ Date/Time: ________
- Deployment Lead: ________________ Date/Time: ________

**Rollback Trigger:** If <19/20 tests pass, evaluate rollback decision.

---

## Post-Deployment Verification Checklist (10 items)

- [ ] **SLO Tracking Active**
  - Navigate to SLO dashboard: [URL]
  - Verify metrics flowing: availability, latency, error rate
  - Baseline values recorded: ________________
  **Verified by:** ________ **Time:** ________

- [ ] **Log Aggregation Functioning**
  - Search logs for deployment event
  - Verify log volume normal (______ logs/minute)
  - No error spikes detected
  **Verified by:** ________ **Time:** ________

- [ ] **Performance Within SLOs**
  - p50 latency: ________ ms (target: <100ms)
  - p95 latency: ________ ms (target: <500ms)
  - p99 latency: ________ ms (target: <1000ms)
  **Verified by:** ________ **Time:** ________

- [ ] **No Error Spikes**
  - Error rate: ________% (target: <0.1%)
  - No 5xx error increase detected
  - Error rate stable over 15 minutes
  **Verified by:** ________ **Time:** ________

- [ ] **Resource Utilization Normal**
  - CPU utilization: ________% (baseline: ____%)
  - Memory usage: ________ GB (baseline: ____ GB)
  - Disk usage: ________% (no increase >5%)
  **Verified by:** ________ **Time:** ________

- [ ] **Database Performance Normal**
  - Active connections: ________ (max: ________)
  - Query latency: ________ ms (baseline: ______ ms)
  - No slow query alerts
  **Verified by:** ________ **Time:** ________

- [ ] **External Integrations Functioning**
  - Integration 1: ________________ (status: OK/DEGRADED/FAIL)
  - Integration 2: ________________ (status: OK/DEGRADED/FAIL)
  - Integration 3: ________________ (status: OK/DEGRADED/FAIL)
  **Verified by:** ________ **Time:** ________

- [ ] **Alerts Delivery Confirmed**
  - Test alert triggered
  - PagerDuty received alert in ________ seconds (target: <5s)
  - Escalation path validated
  **Verified by:** ________ **Time:** ________

- [ ] **Synthetic Monitoring Passing (if configured)**
  - Synthetic tests passing: ____/____
  - Uptime: ________% (target: ≥99.9%)
  - No anomalies detected
  **Verified by:** ________ **Time:** ________

- [ ] **No Critical Issues Reported**
  - Check support channels (email, Slack, ticketing)
  - Zero critical user reports
  - Zero production incidents
  **Verified by:** ________ **Time:** ________

---

## Rollback Procedure

### Rollback Decision Criteria

**Execute rollback if ANY of the following occur:**

1. **Critical Failures:**
   - [ ] Smoke tests <19/20 passing (95% threshold)
   - [ ] Health checks failing (any endpoint returning non-200)
   - [ ] Error rate >1% sustained for >5 minutes
   - [ ] Application unresponsive (no HTTP response)
   - [ ] Database corruption detected

2. **High-Severity Issues:**
   - [ ] p99 latency >5s sustained for >10 minutes
   - [ ] Critical workflow broken (authentication, core API)
   - [ ] Data loss detected
   - [ ] Security vulnerability introduced

3. **Business Impact:**
   - [ ] Revenue-impacting feature broken
   - [ ] Stakeholder-requested abort
   - [ ] Compliance violation detected

**Decision Authority:**
- **Automatic Rollback:** DevOps Engineer (if health checks fail)
- **Manual Rollback:** Deployment Lead + Engineering Manager (for business/severity issues)

**Time to Decision:** Within 5 minutes of issue detection

---

### Rollback Steps (Target: <5 Minutes)

**Step R1: Declare Rollback (Immediate)**
```bash
# Announce rollback in war room
# "ROLLBACK INITIATED - [REASON] - ETA 5 minutes"
```
- [ ] Rollback announced
- [ ] Stakeholders notified
- **Time:** ________

**Step R2: Rollback Application (2 minutes)**
```bash
# Rollback Kubernetes deployment to previous version
kubectl rollout undo deployment/aiwg --namespace=production

# Monitor rollback progress
kubectl rollout status deployment/aiwg --namespace=production

# Expected output:
# deployment "aiwg" successfully rolled out
```
- [ ] Rollback initiated
- [ ] Rollback completed
- [ ] All pods Running
- **Time:** ________ **Duration:** ________ seconds

**Step R3: Rollback Database (3 minutes, if migrations ran)**
```bash
# Restore from pre-deployment snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier [DB_IDENTIFIER] \
  --db-snapshot-identifier pre-deploy-v[VERSION]-[TIMESTAMP]

# Wait for restoration to complete (this may take several minutes)
# Monitor restoration progress in AWS Console

# Alternative: Rollback migrations manually
npm run migrate:rollback -- --to=[PREVIOUS_VERSION]
```
- [ ] Database rollback initiated
- [ ] Database rollback completed
- [ ] Database connectivity verified
- **Time:** ________ **Duration:** ________ seconds

**Step R4: Verify Rollback (1 minute)**
```bash
# Verify previous version running
curl -s https://[DOMAIN]/health | jq '.version'
# Expected: v[PREVIOUS_VERSION]

# Run critical smoke tests
curl -s -o /dev/null -w "%{http_code}" https://[DOMAIN]/
# Expected: 200

curl -s https://[DOMAIN]/ready | jq '.status'
# Expected: "ready"
```
- [ ] Previous version confirmed
- [ ] Health checks passing
- [ ] Critical workflows functional
- **Time:** ________ **Duration:** ________ seconds

**Step R5: Restore Normal Operations (1 minute)**
```bash
# Disable maintenance mode (if re-enabled during rollback)
kubectl delete -f maintenance-mode.yaml

# Verify production traffic flowing
curl -I https://[DOMAIN]
# Expected: HTTP 200
```
- [ ] Normal operations restored
- [ ] User traffic flowing
- **Time:** ________

---

### Post-Rollback Actions (30 minutes)

- [ ] **Incident Report Created**
  - Incident ID: ________________
  - Root cause: ________________
  - Impact: ________________
  - **Completed by:** ________ **Time:** ________

- [ ] **Stakeholder Communication**
  - Rollback completion announced
  - Impact assessment shared
  - Next steps communicated
  - **Completed by:** ________ **Time:** ________

- [ ] **Post-Mortem Scheduled**
  - Meeting scheduled: [DATE/TIME]
  - Attendees invited
  - Incident data collected
  - **Completed by:** ________ **Time:** ________

- [ ] **Fix Plan Developed**
  - Root cause identified
  - Fix timeline estimated: ________ hours/days
  - Re-deployment date proposed: [DATE]
  - **Completed by:** ________ **Time:** ________

---

## Communication Plan

### Before Deployment (T-24 Hours)

**Stakeholder Notification:**
- [ ] **To:** Executive team, Product team, Customer success
- [ ] **Subject:** "Production Deployment Scheduled: [DATE] [TIME]"
- [ ] **Content:**
  - Deployment window: [START] - [END]
  - Expected impact: [None / Minor / Planned downtime]
  - New features/fixes summary
  - Contact information: ________________
- [ ] **Sent by:** ________________ **Time:** ________

**Change Window Communication:**
- [ ] **Change ticket created:** [TICKET_ID]
- [ ] **Change approval obtained:** [APPROVER_NAME]
- [ ] **Change window reserved:** [START] - [END]
- [ ] **Completed by:** ________________ **Time:** ________

**Support Team Alert:**
- [ ] **Support team notified:** [DATE/TIME]
- [ ] **Expected support volume:** LOW / MEDIUM / HIGH
- [ ] **Escalation path confirmed**
- [ ] **Completed by:** ________________ **Time:** ________

---

### During Deployment (Every 15 Minutes)

**Status Update Template:**
```
DEPLOYMENT STATUS UPDATE - [TIMESTAMP]

Phase: [CURRENT_PHASE]
Progress: [X]/[Y] steps complete
ETA: [MINUTES] remaining
Issues: [NONE / description]
Next: [NEXT_PHASE]

- Deployment Lead
```

**Distribution:**
- War room chat channel
- Stakeholder email (for major milestones only)

**Updates Required:**
- [ ] T+0: Deployment started
- [ ] T+15: Phase 1-2 complete (if on schedule)
- [ ] T+30: Phase 3-4 complete (if on schedule)
- [ ] T+45: Phase 5-6 complete, smoke tests starting
- [ ] T+60: Deployment complete / SUCCESS or ROLLBACK initiated

---

### After Deployment

**Success Notification:**
- [ ] **To:** All stakeholders
- [ ] **Subject:** "Production Deployment Complete: v[VERSION]"
- [ ] **Content:**
  - Deployment status: SUCCESS
  - Deployment duration: ________ minutes
  - Smoke test results: ____/20 passed
  - Version deployed: v[VERSION]
  - Known issues: [NONE / list]
  - Next steps: Hypercare monitoring for 2-4 weeks
- [ ] **Sent by:** ________________ **Time:** ________

**Internal Deployment Report:**
- [ ] **Recipients:** Engineering team, DevOps
- [ ] **Content:**
  - Full deployment log
  - Smoke test detailed results
  - Performance metrics snapshot
  - Lessons learned
  - Recommendations for next deployment
- [ ] **Completed by:** ________________ **Time:** ________

**Customer Communication (if applicable):**
- [ ] **Release notes published:** [URL]
- [ ] **Feature announcements:** [Channels used]
- [ ] **Support documentation updated**
- [ ] **Completed by:** ________________ **Time:** ________

---

## Final Sign-off

**Deployment Completion Time:** [TIMESTAMP]

**Deployment Status:** SUCCESS / ROLLBACK / PARTIAL

**Deployment Duration:** ________ minutes (Target: <60 minutes)

**Smoke Test Results:** ____/20 passed (Target: ≥19/20)

**Post-Deployment Verification:** ____/10 items complete (Target: 10/10)

**Production Health:** HEALTHY / DEGRADED / CRITICAL

---

### Sign-offs Required

**Deployment Lead:**
- Name: ________________
- Signature: ________________
- Date/Time: ________
- Comments: ________________

**Engineering Manager:**
- Name: ________________
- Signature: ________________
- Date/Time: ________
- Comments: ________________

**Operations Manager:**
- Name: ________________
- Signature: ________________
- Date/Time: ________
- Comments: ________________

**Product Manager:**
- Name: ________________
- Signature: ________________
- Date/Time: ________
- Comments: ________________

---

### Hypercare Initiation

- [ ] **Hypercare plan activated**
  - Duration: 2-4 weeks (end date: [DATE])
  - Daily health checks scheduled
  - On-call rotation active
  - Escalation paths confirmed

- [ ] **Hypercare Schedule:**
  - Week 1: Daily health checks (2 hours/day)
  - Week 2-4: Health checks every 2 days (2 hours/check)
  - Daily health check time: [TIME]
  - Health check owner: ________________

- [ ] **Hypercare Deliverables:**
  - Daily health check reports
  - Incident logs (if any)
  - Performance trend analysis
  - Hypercare summary report (at end)

**Hypercare Lead:** ________________

**Sign-off:** ________________ **Date/Time:** ________

---

## Appendices

### A. Contact Information

**Deployment Team:**
- Deployment Lead: ________________ ([EMAIL] / [PHONE])
- DevOps Engineer: ________________ ([EMAIL] / [PHONE])
- Database Administrator: ________________ ([EMAIL] / [PHONE])
- Security Engineer: ________________ ([EMAIL] / [PHONE])

**Management:**
- Engineering Manager: ________________ ([EMAIL] / [PHONE])
- Operations Manager: ________________ ([EMAIL] / [PHONE])
- Product Manager: ________________ ([EMAIL] / [PHONE])

**On-Call:**
- Primary: ________________ ([EMAIL] / [PHONE])
- Secondary: ________________ ([EMAIL] / [PHONE])
- Escalation: ________________ ([EMAIL] / [PHONE])

**Vendors/Support:**
- Cloud provider support: ________________
- Database support: ________________
- Monitoring support: ________________

---

### B. Reference Links

- **Deployment Runbook:** [URL or path]
- **Rollback Runbook:** [URL or path]
- **Incident Response Runbook:** [URL or path]
- **SLO/SLI Dashboard:** [URL]
- **Metrics Dashboard:** [URL]
- **Log Dashboard:** [URL]
- **PagerDuty Service:** [URL]
- **Status Page:** [URL]
- **Change Ticket:** [URL]
- **Release Notes:** [URL]

---

### C. Deployment Log

**Use this section to record timeline and events during deployment:**

| Time | Event | Status | Notes |
|------|-------|--------|-------|
| [TIME] | Deployment started | IN PROGRESS | War room activated |
| [TIME] | Pre-deployment checks complete | COMPLETE | 48/48 items passed |
| [TIME] | Database migration started | IN PROGRESS | |
| [TIME] | Database migration complete | COMPLETE | 3 migrations applied |
| [TIME] | Application deployment started | IN PROGRESS | |
| [TIME] | Rollout 33% complete | IN PROGRESS | 1/3 pods ready |
| [TIME] | Rollout 66% complete | IN PROGRESS | 2/3 pods ready |
| [TIME] | Rollout 100% complete | COMPLETE | All pods Running |
| [TIME] | Smoke tests started | IN PROGRESS | |
| [TIME] | Smoke tests complete | COMPLETE | 20/20 passed |
| [TIME] | Deployment complete | SUCCESS | Total duration: ____ min |

---

**END OF PRODUCTION DEPLOYMENT CHECKLIST**

**Version:** 1.0
**Last Updated:** [DATE]
**Next Review:** After deployment (lessons learned)
