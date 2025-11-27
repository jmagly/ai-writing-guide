# Operational Runbook: Monitoring and Alerting

**Version:** 1.0
**Last Updated:** 2025-10-24
**Owner:** SRE/Operations Team
**Review Cycle:** Quarterly

## Purpose

This runbook defines the monitoring and alerting infrastructure for the AI Writing Guide platform, including metric collection, dashboard configuration, alert thresholds, and response procedures.

## Monitoring Stack

### Architecture Overview

```
Application Metrics → CloudWatch/Prometheus → Grafana Dashboards
                   ↓                      ↓
                Alerting Rules ← PagerDuty/OpsGenie → On-Call Rotation
                                         ↓
Logs → CloudWatch Logs/ELK Stack → Log Aggregation → Search/Analysis
```

### Stack Components

**Metrics Collection:**

- **CloudWatch** (AWS-native): EC2, RDS, ELB metrics
- **Prometheus** (Application): Custom application metrics, Node Exporter
- **Grafana**: Unified visualization layer

**Log Aggregation:**

- **CloudWatch Logs**: Application logs, system logs
- **ELK Stack** (Optional): Elasticsearch, Logstash, Kibana for advanced log analysis

**Alerting:**

- **Grafana Alerts**: Metric-based alerting
- **PagerDuty**: Incident routing and escalation
- **Slack**: Team notifications

**APM (Application Performance Monitoring):**

- **New Relic / DataDog** (Optional): Distributed tracing, code-level profiling

### Access and URLs

| Service | URL | Access Level |
|---------|-----|--------------|
| Grafana Dashboard | https://grafana.ai-writing-guide.com | Engineering team |
| CloudWatch Console | https://console.aws.amazon.com/cloudwatch | DevOps/SRE |
| PagerDuty | https://ai-writing-guide.pagerduty.com | On-call engineers |
| Kibana (Logs) | https://kibana.ai-writing-guide.com | Engineering/Support |
| Status Page | https://status.ai-writing-guide.com | Public |

## Key Metrics to Monitor

### Application Metrics

**HTTP Request Metrics:**

| Metric | Description | Normal Range | Alert Threshold |
|--------|-------------|--------------|-----------------|
| `http_requests_total` | Total HTTP requests | - | - |
| `http_request_duration_seconds` | Request latency histogram | p95 <500ms | p95 >1000ms |
| `http_requests_errors_total` | Failed requests | <0.1% | >1% |
| `http_requests_in_flight` | Concurrent requests | 10-50 | >200 |

**Example Prometheus Query:**

```promql
# Request rate (per second)
rate(http_requests_total[5m])

# p95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_errors_total[5m]) / rate(http_requests_total[5m]) * 100
```

**Application Health Metrics:**

| Metric | Description | Normal Range | Alert Threshold |
|--------|-------------|--------------|-----------------|
| `process_cpu_usage` | CPU usage % | 30-50% | >80% |
| `process_memory_usage_bytes` | Memory usage | 2-4 GB | >6 GB |
| `nodejs_heap_size_used_bytes` | Node.js heap usage | 100-500 MB | >1 GB |
| `nodejs_gc_duration_seconds` | Garbage collection time | <100ms | >500ms |
| `active_connections` | Active DB connections | 20-40 | >100 |

**Custom Business Metrics:**

| Metric | Description | Purpose |
|--------|-------------|---------|
| `validation_requests_total` | Content validations performed | Track feature usage |
| `agent_deployments_total` | Agent deployments | Monitor adoption |
| `cache_hit_rate` | Cache effectiveness | Optimize caching |
| `api_quota_usage` | Third-party API usage | Track costs |

### Infrastructure Metrics

**EC2 Instances (via CloudWatch):**

| Metric | Normal Range | Warning | Critical |
|--------|--------------|---------|----------|
| `CPUUtilization` | 30-50% | >70% | >85% |
| `MemoryUtilization` | 40-60% | >75% | >90% |
| `DiskReadOps` | <100 IOPS | >500 IOPS | >1000 IOPS |
| `DiskWriteOps` | <100 IOPS | >500 IOPS | >1000 IOPS |
| `NetworkIn` | <50 MB/min | >200 MB/min | >400 MB/min |
| `NetworkOut` | <50 MB/min | >200 MB/min | >400 MB/min |
| `StatusCheckFailed` | 0 | 1 | 2 |

**Database (RDS):**

| Metric | Normal Range | Warning | Critical |
|--------|--------------|---------|----------|
| `CPUUtilization` | 20-40% | >70% | >85% |
| `FreeableMemory` | >2 GB | <1 GB | <500 MB |
| `DatabaseConnections` | 20-50 | >100 | >150 |
| `ReadLatency` | <10ms | >50ms | >100ms |
| `WriteLatency` | <10ms | >50ms | >100ms |
| `FreeStorageSpace` | >50 GB | <20 GB | <10 GB |
| `ReplicaLag` | <1s | >10s | >60s |

**Load Balancer (ALB/ELB):**

| Metric | Normal Range | Warning | Critical |
|--------|--------------|---------|----------|
| `HealthyHostCount` | 3-5 | <3 | <2 |
| `UnHealthyHostCount` | 0 | 1 | >1 |
| `TargetResponseTime` | <200ms | >500ms | >1000ms |
| `RequestCount` | 100-500/min | - | - |
| `HTTPCode_Target_5XX_Count` | <5/min | >20/min | >50/min |

### Security Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `failed_login_attempts` | Failed auth attempts | >10 in 5 min from single IP |
| `api_calls_per_ip` | API rate per IP | >1000 in 1 min |
| `ssl_cert_expiry_days` | Days until SSL expiry | <30 days |
| `unauthorized_access_attempts` | 403 errors | >50 in 5 min |
| `suspicious_user_agents` | Bot/scanner detection | Any known malicious UA |
| `vulnerability_scan_findings` | Security scan results | Any critical finding |

## Alert Configuration

### Alert Severity Levels

**Critical (P0):**

- Immediate response required
- Page on-call engineer
- Escalate if no response in 5 minutes

**High (P1):**

- Response within 15 minutes
- Page on-call engineer
- Escalate if no response in 30 minutes

**Medium (P2):**

- Response within 1 hour
- Slack notification
- Create ticket for tracking

**Low (P3):**

- Response next business day
- Email notification
- Create ticket for tracking

### Core Alerts

#### Alert 1: High CPU Utilization

**Configuration:**

```yaml
alert: HighCPUUtilization
expr: avg(process_cpu_usage{job="aiwg-api"}) > 0.80
for: 5m
labels:
  severity: P2
  component: application
annotations:
  summary: "High CPU usage detected"
  description: "CPU utilization is {{ $value }}% for 5+ minutes"
  runbook: "https://docs.ai-writing-guide.com/runbooks/incident-response#high-cpu"
```

**Threshold:** >80% for 5 minutes
**Severity:** P2 (Medium)
**Response:**

1. Acknowledge alert in PagerDuty
2. Check Grafana dashboard for CPU trends
3. Identify high-CPU processes: `top -n 1`
4. Review application logs for errors
5. Consider scaling horizontally if traffic spike
6. Profile application if code issue suspected

**Escalation:**

- If CPU >90% for 10 minutes → Escalate to P1
- If CPU causes request timeouts → Escalate to P0

#### Alert 2: High Memory Usage

**Configuration:**

```yaml
alert: HighMemoryUsage
expr: (process_memory_usage_bytes{job="aiwg-api"} / process_memory_max_bytes) > 0.85
for: 5m
labels:
  severity: P2
  component: application
annotations:
  summary: "High memory usage detected"
  description: "Memory usage is {{ $value }}% of available"
  runbook: "https://docs.ai-writing-guide.com/runbooks/incident-response#memory-leak"
```

**Threshold:** >85% for 5 minutes
**Severity:** P2
**Response:**

1. Check memory usage trend (gradual vs sudden)
2. Review heap snapshot if available
3. Check for memory leaks: `node --inspect`
4. Restart service if OOM imminent
5. Investigate root cause post-restart

**Escalation:**

- If memory >95% → Immediate restart (P1)
- If OOM errors logged → P0

#### Alert 3: High Error Rate

**Configuration:**

```yaml
alert: HighErrorRate
expr: (rate(http_requests_errors_total[5m]) / rate(http_requests_total[5m])) > 0.01
for: 5m
labels:
  severity: P1
  component: application
annotations:
  summary: "Error rate exceeded threshold"
  description: "Error rate is {{ $value }}% over 5 minutes"
  runbook: "https://docs.ai-writing-guide.com/runbooks/incident-response"
```

**Threshold:** >1% for 5 minutes
**Severity:** P1 (High)
**Response:**

1. Check error types in logs
2. Identify affected endpoints
3. Review recent deployments (consider rollback)
4. Check dependency health (database, APIs)
5. Implement mitigation (rollback, hotfix, scale)

**Escalation:**

- If error rate >5% → Escalate to P0
- If errors cause data loss → Escalate to P0

#### Alert 4: Slow Response Time

**Configuration:**

```yaml
alert: SlowResponseTime
expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1.0
for: 10m
labels:
  severity: P2
  component: application
annotations:
  summary: "p95 response time degraded"
  description: "p95 latency is {{ $value }}s over 10 minutes"
  runbook: "https://docs.ai-writing-guide.com/runbooks/scaling-performance"
```

**Threshold:** p95 >1s for 10 minutes
**Severity:** P2
**Response:**

1. Check current request volume (traffic spike?)
2. Review slow query logs
3. Check database connection pool
4. Profile application for slow code paths
5. Consider horizontal scaling

**Escalation:**

- If p95 >2s for 15 minutes → P1
- If p95 >5s causing timeouts → P0

#### Alert 5: Database Connection Pool Exhausted

**Configuration:**

```yaml
alert: DatabaseConnectionPoolExhausted
expr: active_connections{job="aiwg-api"} > 140
for: 5m
labels:
  severity: P1
  component: database
annotations:
  summary: "Database connection pool nearly exhausted"
  description: "Active connections: {{ $value }} (max: 150)"
  runbook: "https://docs.ai-writing-guide.com/runbooks/incident-response#database-connections"
```

**Threshold:** >140 connections (max 150)
**Severity:** P1
**Response:**

1. Check for connection leaks in application
2. Identify long-running queries
3. Kill idle connections if needed
4. Restart application to reset pool
5. Increase pool size if legitimate load

**Escalation:**

- If connections = max → P0 (service degradation)

#### Alert 6: Health Check Failure

**Configuration:**

```yaml
alert: HealthCheckFailed
expr: up{job="aiwg-api"} == 0
for: 2m
labels:
  severity: P0
  component: availability
annotations:
  summary: "Application health check failing"
  description: "Instance {{ $labels.instance }} is down"
  runbook: "https://docs.ai-writing-guide.com/runbooks/incident-response"
```

**Threshold:** Health check down for 2 minutes
**Severity:** P0 (Critical)
**Response:**

1. Verify instance status (terminated, stopped, unresponsive)
2. Check application logs for crashes
3. Attempt service restart
4. Scale up replacement instance if needed
5. Investigate root cause

**Escalation:**

- Automatic escalation after 5 minutes if not resolved

#### Alert 7: SSL Certificate Expiration

**Configuration:**

```yaml
alert: SSLCertificateExpiring
expr: (ssl_cert_expiry_days < 30)
for: 1h
labels:
  severity: P2
  component: security
annotations:
  summary: "SSL certificate expiring soon"
  description: "SSL cert for {{ $labels.domain }} expires in {{ $value }} days"
  runbook: "https://docs.ai-writing-guide.com/runbooks/ssl-renewal"
```

**Threshold:** <30 days until expiration
**Severity:** P2 (or P1 if <7 days)
**Response:**

1. Verify certificate expiration date
2. Initiate renewal process (Let's Encrypt / AWS ACM)
3. Test new certificate in staging
4. Deploy to production
5. Verify new expiry date

**Escalation:**

- <7 days → P1 (urgent renewal needed)
- <1 day → P0 (emergency renewal)

#### Alert 8: Deployment Failure

**Configuration:**

```yaml
alert: DeploymentFailed
expr: increase(deployment_failures_total[10m]) > 0
for: 1m
labels:
  severity: P1
  component: deployment
annotations:
  summary: "Deployment failed"
  description: "Deployment to {{ $labels.environment }} failed"
  runbook: "https://docs.ai-writing-guide.com/runbooks/deployment"
```

**Threshold:** Any deployment failure
**Severity:** P1
**Response:**

1. Review deployment logs
2. Check health of new instances
3. Verify configuration changes
4. Rollback if deployment causing issues
5. Fix issue and retry deployment

#### Alert 9: Disk Space Low

**Configuration:**

```yaml
alert: DiskSpaceLow
expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.20
for: 5m
labels:
  severity: P2
  component: infrastructure
annotations:
  summary: "Disk space running low"
  description: "Disk usage on {{ $labels.instance }} is {{ $value }}%"
  runbook: "https://docs.ai-writing-guide.com/runbooks/disk-management"
```

**Threshold:** <20% free space
**Severity:** P2 (or P1 if <10%)
**Response:**

1. Identify large files/directories: `du -sh /* | sort -h`
2. Clean up old logs: `find /var/log -type f -mtime +30 -delete`
3. Remove old Docker images: `docker system prune -a`
4. Increase disk size if growth expected
5. Implement log rotation

**Escalation:**

- <10% free → P1
- <5% free → P0 (immediate action required)

#### Alert 10: Security Alert - Failed Login Attempts

**Configuration:**

```yaml
alert: SuspiciousLoginActivity
expr: rate(failed_login_attempts_total[5m]) > 10
for: 1m
labels:
  severity: P1
  component: security
annotations:
  summary: "Suspicious login activity detected"
  description: "{{ $value }} failed logins from {{ $labels.ip }} in 5 minutes"
  runbook: "https://docs.ai-writing-guide.com/runbooks/incident-response#security-alert"
```

**Threshold:** >10 failed logins in 5 minutes from single IP
**Severity:** P1
**Response:**

1. Identify source IP address
2. Check if legitimate user (password reset needed?)
3. Block IP if malicious: `iptables -A INPUT -s [IP] -j DROP`
4. Review authentication logs
5. Force password reset if account compromise suspected

**Escalation:**

- If data access detected → P0

## Dashboard Review Procedure

### Daily Health Check (10 AM)

**Checklist:**

- [ ] Review overall system health dashboard
- [ ] Check error rates (should be <0.1%)
- [ ] Verify response times (p95 <500ms)
- [ ] Confirm all instances healthy
- [ ] Review overnight alerts (any incidents?)
- [ ] Check database performance (CPU, connections)
- [ ] Verify backup completion
- [ ] Review security alerts (any suspicious activity?)

**Dashboard URL:** https://grafana.ai-writing-guide.com/d/daily-health

**Duration:** 10-15 minutes

**Action Items:**

- Create tickets for any anomalies
- Escalate critical issues immediately
- Document findings in #ops-daily-standup

### Weekly Performance Review

**Schedule:** Every Monday, 2 PM

**Agenda:**

1. **Availability Review** (5 min)
   - Uptime percentage vs SLO (99.9% target)
   - Incident count and duration
   - Error budget remaining

2. **Performance Trends** (10 min)
   - Response time trends (week-over-week)
   - Request volume changes
   - Resource utilization trends

3. **Capacity Planning** (10 min)
   - Current vs maximum capacity
   - Growth projections
   - Scaling recommendations

4. **Cost Analysis** (5 min)
   - Infrastructure costs (vs budget)
   - Optimization opportunities

5. **Action Items** (5 min)
   - Performance improvements
   - Infrastructure changes
   - Alert tuning

**Dashboard URL:** https://grafana.ai-writing-guide.com/d/weekly-review

**Duration:** 30-35 minutes

**Attendees:** SRE Lead, DevOps Engineer, Engineering Manager

### Monthly Capacity Planning

**Schedule:** First Monday of month, 10 AM

**Review:**

1. **Traffic Growth**
   - Month-over-month request volume
   - User growth trends
   - Feature adoption metrics

2. **Resource Utilization**
   - Peak vs average utilization
   - Capacity headroom
   - Scaling events analysis

3. **Cost Trends**
   - Infrastructure spend (actual vs budget)
   - Cost per user
   - Optimization opportunities

4. **Projections**
   - 3-month traffic forecast
   - Capacity needs
   - Budget planning

5. **Recommendations**
   - Infrastructure upgrades
   - Auto-scaling adjustments
   - Cost optimization initiatives

**Dashboard URL:** https://grafana.ai-writing-guide.com/d/capacity-planning

**Duration:** 60 minutes

**Attendees:** SRE Team, Engineering Leadership, Finance (for cost review)

**Deliverable:** Monthly capacity report (1-2 pages)

## Alert Response Workflow

### Step 1: Alert Received

**Channels:**

- **PagerDuty:** Push notification + SMS + Phone call
- **Slack:** #alerts channel
- **Email:** team-oncall@ai-writing-guide.com

**Initial Actions:**

1. **Acknowledge alert** (within 5 min for P0/P1, 15 min for P2)
   - PagerDuty: Click "Acknowledge"
   - Slack: React with :eyes: emoji

2. **Assess severity**
   - Review alert description
   - Check current impact (users affected, services down)
   - Confirm severity classification

3. **Communicate intent**
   - Post in #incidents Slack channel
   - Create incident document (for P0/P1)
   - Notify stakeholders if needed

### Step 2: Investigate

**Systematic Investigation:**

1. **Check Grafana Dashboard**
   - Navigate to alert source dashboard
   - Review metric trends (5 min, 1 hour, 24 hour)
   - Identify when issue started

2. **Review Application Logs**
   ```bash
   # Check recent errors
   tail -100 /var/log/aiwg/application.log | grep ERROR

   # Or CloudWatch Logs Insights
   fields @timestamp, @message
   | filter level = "ERROR"
   | sort @timestamp desc
   | limit 100
   ```

3. **Check Infrastructure Health**
   - EC2 instance status
   - Database connectivity
   - Load balancer health checks
   - External dependency status

4. **Identify Root Cause**
   - Recent deployments?
   - Configuration changes?
   - Traffic spike?
   - Dependency failure?
   - Resource exhaustion?

### Step 3: Mitigate

**Mitigation Options (by priority):**

1. **Rollback** (if recent deployment caused issue)
2. **Restart** (if service crashed or hung)
3. **Scale** (if resource exhaustion)
4. **Hotfix** (if critical bug identified)
5. **Fail over** (if database/dependency issue)
6. **Maintenance mode** (last resort)

**Example Mitigation Commands:**

```bash
# Rollback deployment
./deploy/rollback.sh production [previous-version]

# Restart service
sudo systemctl restart aiwg-api

# Scale horizontally
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name aiwg-production-asg \
  --desired-capacity 10

# Apply hotfix
git checkout -b hotfix/alert-123
# [make fix]
./deploy/hotfix-deploy.sh production
```

### Step 4: Verify Resolution

**Verification Checklist:**

- [ ] Alert resolved (metric returned to baseline)
- [ ] No secondary alerts triggered
- [ ] Error rates normalized
- [ ] Response times acceptable
- [ ] All instances healthy
- [ ] User-facing features functional

**Monitoring Period:**

- P0: Monitor for 30 minutes post-resolution
- P1: Monitor for 15 minutes
- P2: Monitor for 10 minutes

### Step 5: Document

**Incident Documentation (for P0/P1/P2):**

```markdown
## Alert Response: [Alert Name] - [Date]

**Alert ID:** ALERT-YYYY-MM-DD-NNN
**Severity:** [P0/P1/P2/P3]
**Triggered:** [timestamp]
**Acknowledged:** [timestamp]
**Resolved:** [timestamp]
**Duration:** [minutes]

**Symptoms:**
[What triggered the alert]

**Investigation:**
[What was checked, findings]

**Root Cause:**
[What caused the alert]

**Mitigation:**
[What was done to resolve]

**Follow-up Actions:**
- [ ] [Action 1]
- [ ] [Action 2]

**Responder:** [name]
```

**Post in:** #incidents Slack channel and incident log

### Step 6: Follow-Up

**For P0/P1 Alerts:**

- Schedule post-mortem (within 48 hours)
- Create action items for prevention
- Update runbooks if new procedures discovered
- Review alert thresholds (too sensitive? too lenient?)

**For P2 Alerts:**

- Create ticket for investigation
- Update documentation if needed
- Consider alert threshold tuning

**For Recurring Alerts:**

- Investigate underlying issue
- Implement permanent fix
- Adjust thresholds or suppress if false positive

## Log Analysis

### Common Log Patterns

**Error Patterns:**

```bash
# Application errors
grep -E "ERROR|Exception|Failed" /var/log/aiwg/application.log | tail -50

# Database connection errors
grep -i "connection" /var/log/aiwg/application.log | grep -i "error\|timeout\|failed"

# API errors (external services)
grep -E "OpenAI|GitHub" /var/log/aiwg/application.log | grep -i "error\|429\|500"

# Authentication failures
grep -i "authentication\|authorization" /var/log/nginx/access.log | grep " 401\| 403"
```

**Performance Patterns:**

```bash
# Slow requests (>1s)
awk '$9 > 1000 {print $0}' /var/log/aiwg/access.log | tail -20

# Requests by endpoint (top 10)
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# Requests by status code
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn

# Requests per minute
awk '{print $4}' /var/log/nginx/access.log | cut -d: -f1-2 | uniq -c
```

### Error Investigation Steps

**Step 1: Identify Error Pattern**

```bash
# Find unique error messages
grep ERROR /var/log/aiwg/application.log | awk -F'ERROR' '{print $2}' | sort | uniq -c | sort -rn

# Example output:
# 245 Database connection timeout
#  89 Invalid API key
#  12 Out of memory
```

**Step 2: Get Error Context**

```bash
# Show 5 lines before and after error
grep -A 5 -B 5 "Database connection timeout" /var/log/aiwg/application.log | tail -50

# Get full stack trace
grep -A 20 "Exception" /var/log/aiwg/application.log | less
```

**Step 3: Correlate with Metrics**

- Check Grafana dashboard for corresponding metric spikes
- Review infrastructure metrics (CPU, memory, network)
- Correlate with deployment times

**Step 4: Identify Affected Users/Requests**

```bash
# Extract request IDs from error logs
grep "Database connection timeout" /var/log/aiwg/application.log | awk '{print $5}' | head -20

# Find user associated with request
grep "request-id-123" /var/log/aiwg/application.log | grep "user_id"
```

### CloudWatch Logs Insights Queries

**Query 1: Error Distribution**

```sql
fields @timestamp, level, message
| filter level = "ERROR"
| stats count() by message
| sort count desc
| limit 20
```

**Query 2: Slow Requests**

```sql
fields @timestamp, method, path, duration
| filter duration > 1000
| sort duration desc
| limit 50
```

**Query 3: Failed API Calls**

```sql
fields @timestamp, api_endpoint, status_code, error_message
| filter status_code >= 400
| stats count() by api_endpoint, status_code
| sort count desc
```

**Query 4: Memory Usage Trends**

```sql
fields @timestamp, memory_usage_mb
| stats avg(memory_usage_mb), max(memory_usage_mb) by bin(5m)
```

### Log Retention Policy

**Retention Periods:**

| Log Type | Retention | Storage | Reason |
|----------|-----------|---------|--------|
| Application Logs | 90 days | CloudWatch | Debugging, compliance |
| Access Logs | 30 days | S3 (compressed) | Security audit, analytics |
| Error Logs | 180 days | CloudWatch | Long-term troubleshooting |
| Audit Logs | 7 years | S3 Glacier | Compliance requirement |
| Database Logs | 30 days | RDS | Performance tuning |
| Security Logs | 1 year | CloudWatch | Security audit |

**Archival Process:**

```bash
# Archive old logs to S3
aws logs create-export-task \
  --log-group-name /aws/aiwg/application \
  --from $(date -d '90 days ago' +%s)000 \
  --to $(date -d '30 days ago' +%s)000 \
  --destination aiwg-logs-archive \
  --destination-prefix 2025/10/

# Compress and move to Glacier after 1 year
# (Lifecycle policy configured in S3)
```

### Compliance Requirements

**GDPR / Privacy:**

- Mask PII in logs (email, IP addresses)
- Implement log encryption at rest
- Provide log deletion mechanism for user requests

**SOC2 / Security:**

- Maintain audit trail of all access
- Log all authentication events
- Encrypt logs in transit and at rest
- Implement access controls (RBAC)

**Example Log Masking:**

```javascript
// Log sanitization
function sanitizeLog(message) {
  return message
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***') // Email
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '***.***.***.***')          // IP
    .replace(/\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, '****-****-****-****');                // Credit card
}
```

## Appendix

### Grafana Dashboard Templates

**1. SLO/SLI Dashboard**

**Panels:**

- Availability (current month) - Single Stat
- p95 Response Time - Graph
- Error Budget Remaining - Gauge
- Request Rate - Graph
- Error Rate - Graph

**Example Query (Availability):**

```promql
(sum(rate(http_requests_total{status_code!~"5.."}[30d])) / sum(rate(http_requests_total[30d]))) * 100
```

**2. Application Health Dashboard**

**Panels:**

- CPU Usage (per instance) - Graph
- Memory Usage (per instance) - Graph
- Request Rate - Graph
- Response Time Histogram - Heatmap
- Error Count - Graph
- Active Connections - Graph

**3. Infrastructure Dashboard**

**Panels:**

- Instance Count (healthy vs unhealthy) - Single Stat
- Load Balancer Response Time - Graph
- Database Connections - Graph
- Cache Hit Rate - Gauge
- Disk Usage - Graph
- Network I/O - Graph

### Alert Notification Templates

**PagerDuty Incident Template:**

```json
{
  "routing_key": "PAGERDUTY_INTEGRATION_KEY",
  "event_action": "trigger",
  "payload": {
    "summary": "{{ $labels.alertname }}: {{ $annotations.summary }}",
    "severity": "{{ $labels.severity }}",
    "source": "{{ $labels.instance }}",
    "component": "{{ $labels.component }}",
    "custom_details": {
      "description": "{{ $annotations.description }}",
      "runbook": "{{ $annotations.runbook }}",
      "value": "{{ $value }}"
    }
  }
}
```

**Slack Alert Template:**

```json
{
  "channel": "#alerts",
  "username": "Grafana Alert",
  "icon_emoji": ":warning:",
  "attachments": [
    {
      "title": "{{ $labels.alertname }}",
      "text": "{{ $annotations.description }}",
      "color": "{{ if eq $labels.severity \"P0\" }}danger{{ else if eq $labels.severity \"P1\" }}warning{{ else }}good{{ end }}",
      "fields": [
        {"title": "Severity", "value": "{{ $labels.severity }}", "short": true},
        {"title": "Component", "value": "{{ $labels.component }}", "short": true},
        {"title": "Runbook", "value": "{{ $annotations.runbook }}", "short": false}
      ]
    }
  ]
}
```

### Monitoring Best Practices

**1. Alert Fatigue Prevention:**

- Tune thresholds to reduce false positives
- Use appropriate alert windows (e.g., 5 minutes, not 30 seconds)
- Implement alert grouping and deduplication
- Regularly review and remove obsolete alerts
- Use severity levels appropriately

**2. Dashboard Organization:**

- One dashboard per audience (exec, eng, ops)
- Group related metrics together
- Use consistent color schemes
- Add annotations for deployments/incidents
- Include links to runbooks

**3. Log Management:**

- Implement structured logging (JSON format)
- Include correlation IDs for request tracing
- Log at appropriate levels (DEBUG, INFO, WARN, ERROR)
- Avoid logging sensitive data
- Implement log sampling for high-volume systems

**4. Metrics Naming Conventions:**

```
# Format: <namespace>_<name>_<unit>
http_requests_total              # Counter
http_request_duration_seconds    # Histogram
process_cpu_usage_percent        # Gauge
cache_hit_rate_ratio             # Gauge
```

### Contact Information

**On-Call Rotation:**

| Week | Primary | Secondary |
|------|---------|-----------|
| Week 1 | Engineer A | Engineer B |
| Week 2 | Engineer B | Engineer C |
| Week 3 | Engineer C | Engineer A |

**Escalation Contacts:**

- **SRE Lead:** [Name] - [Email] - [Phone]
- **Engineering Manager:** [Name] - [Email] - [Phone]
- **DevOps Lead:** [Name] - [Email] - [Phone]

**Vendor Support:**

- **AWS Support:** Premium support (4-hour response)
- **PagerDuty Support:** support@pagerduty.com
- **Grafana Support:** Community forums

### Related Documentation

- Runbook: Incident Response
- Runbook: Scaling and Performance
- SLO/SLI Definition Document
- Architecture Documentation: Observability
- On-Call Playbook

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-24 | SRE Team | Initial release |

**Review Schedule:** Quarterly or after major monitoring changes
**Next Review:** 2026-01-24
