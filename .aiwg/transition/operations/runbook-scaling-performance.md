# Operational Runbook: Scaling and Performance

**Version:** 1.0
**Last Updated:** 2025-10-24
**Owner:** DevOps/SRE Team
**Review Cycle:** Quarterly

## Purpose

This runbook provides procedures for managing system capacity, performance optimization, and scaling the AI Writing Guide platform to meet demand while maintaining service level objectives.

## Performance Baselines

### Normal Operation Metrics

**Application Performance:**

| Metric | Baseline | Warning Threshold | Critical Threshold |
|--------|----------|-------------------|-------------------|
| Response Time (p50) | <200ms | >500ms | >1000ms |
| Response Time (p95) | <500ms | >1000ms | >2000ms |
| Response Time (p99) | <1000ms | >2000ms | >5000ms |
| Throughput | 100 req/s | <50 req/s | <25 req/s |
| Error Rate | <0.1% | >1% | >5% |
| Availability | 99.9% | <99.5% | <99% |

**Resource Utilization:**

| Resource | Normal | Warning | Critical |
|----------|--------|---------|----------|
| CPU Usage | 30-50% | >70% | >85% |
| Memory Usage | 40-60% | >75% | >90% |
| Disk Usage | <60% | >80% | >90% |
| Network I/O | <50 Mbps | >200 Mbps | >400 Mbps |
| Disk I/O | <100 IOPS | >500 IOPS | >1000 IOPS |

**Database Performance:**

| Metric | Baseline | Warning | Critical |
|--------|----------|---------|----------|
| Query Time (avg) | <50ms | >200ms | >500ms |
| Active Connections | 20-40 | >100 | >150 |
| Connection Pool Usage | 30-50% | >80% | >95% |
| Cache Hit Rate | >90% | <75% | <50% |
| Replication Lag | <1s | >10s | >60s |

### SLO/SLI Targets

**Service Level Objectives (SLOs):**

1. **Availability SLO:** 99.9% uptime (monthly)
   - **Error Budget:** 43.2 minutes downtime per month
   - **Measurement:** Percentage of successful health checks

2. **Latency SLO:** 95% of requests <500ms
   - **Measurement:** p95 response time from load balancer logs

3. **Throughput SLO:** Support 100 concurrent users
   - **Measurement:** Concurrent active sessions

4. **Data Durability SLO:** 99.999% data retention
   - **Measurement:** Database backup success rate

**Service Level Indicators (SLIs):**

```bash
# Calculate availability SLI
availability = (successful_requests / total_requests) * 100

# Calculate latency SLI
latency_sli = (requests_under_500ms / total_requests) * 100

# Calculate error rate SLI
error_rate = (failed_requests / total_requests) * 100
```

**Monitoring Queries:**

```sql
-- Availability (last 24 hours)
SELECT
  COUNT(*) FILTER (WHERE status_code < 500) * 100.0 / COUNT(*) AS availability_pct
FROM access_logs
WHERE timestamp > NOW() - INTERVAL '24 hours';

-- p95 Latency (last 1 hour)
SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) AS p95_latency
FROM access_logs
WHERE timestamp > NOW() - INTERVAL '1 hour';

-- Error Budget Remaining (this month)
SELECT
  (1 - (SUM(downtime_minutes) / (30 * 24 * 60 * 0.001))) * 100 AS error_budget_remaining_pct
FROM incidents
WHERE incident_date >= DATE_TRUNC('month', CURRENT_DATE);
```

### Capacity Thresholds

**When to Scale Up (Add Capacity):**

- CPU sustained >70% for 10+ minutes
- Memory sustained >75% for 5+ minutes
- Response time p95 >500ms for 15+ minutes
- Request queue depth >100
- Database connections >80% of max
- Error rate >1% for 5+ minutes

**When to Scale Down (Remove Capacity):**

- CPU sustained <30% for 30+ minutes
- Memory sustained <40% for 30+ minutes
- Response time p95 <200ms for 60+ minutes
- During scheduled low-traffic periods (2 AM - 6 AM)
- After traffic spike resolved

**Capacity Planning Triggers:**

- 80% of current maximum capacity reached
- Consistent upward trend in traffic (>20% month-over-month)
- Upcoming product launches or marketing campaigns
- Seasonal traffic patterns identified

## Scaling Triggers

### Auto-Scaling Configuration

**Horizontal Scaling Triggers (Application Tier):**

```yaml
# Example: AWS Auto Scaling Policy
scaling_policies:
  scale_up:
    metric: CPUUtilization
    threshold: 70
    evaluation_periods: 2
    period: 300  # 5 minutes
    action: add 1 instance
    cooldown: 300

  scale_down:
    metric: CPUUtilization
    threshold: 30
    evaluation_periods: 4
    period: 300  # 5 minutes
    action: remove 1 instance
    cooldown: 600  # Longer cooldown for scale-down

  scale_up_aggressive:
    metric: RequestCount
    threshold: 1000
    evaluation_periods: 1
    period: 60  # 1 minute
    action: add 2 instances
    cooldown: 180
```

**Vertical Scaling Triggers (Database Tier):**

- Database CPU >80% for 15+ minutes
- Memory usage >85% for 10+ minutes
- Storage >80% full
- IOPS sustained at provisioned limit

**Manual Override Scenarios:**

- Known traffic events (product launches, press coverage)
- Emergency scaling during incidents
- Maintenance windows requiring additional capacity
- Load testing sessions

### Scaling Decision Matrix

| Scenario | Action | Timeline |
|----------|--------|----------|
| CPU >85% for 5 min | Scale up 2 instances immediately | <2 min |
| CPU 70-85% for 10 min | Scale up 1 instance | <5 min |
| Response time >1s for 15 min | Scale up + investigate | <5 min |
| Traffic 2x normal | Scale up 100% capacity | <3 min |
| Planned event tomorrow | Pre-scale +50% capacity | 24h before |
| Traffic <30% capacity for 1h | Scale down 1 instance | >30 min |
| Database IOPS maxed | Upgrade instance type | Schedule maintenance |

## Horizontal Scaling Procedure

### Scaling Up (Adding Instances)

**Pre-Scaling Checklist:**

- [ ] Verify current instance health
- [ ] Check error logs for application issues
- [ ] Confirm database can handle additional connections
- [ ] Review recent deployments (no new issues)
- [ ] Notify team in Slack #ops-scaling

**Step-by-Step Procedure:**

#### Step 1: Determine Target Capacity

```bash
# Check current instance count
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names aiwg-production-asg \
  --query 'AutoScalingGroups[0].{Desired:DesiredCapacity,Running:Instances[?LifecycleState==`InService`]|length(@)}'

# Current: 3 instances
# Target: 5 instances (based on CPU/load)
```

#### Step 2: Increase Desired Capacity

```bash
# Set new desired capacity
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name aiwg-production-asg \
  --desired-capacity 5 \
  --honor-cooldown

# Verify command accepted
echo "Scaling initiated at $(date)"
```

#### Step 3: Monitor Instance Launch

```bash
# Watch instances launching
watch -n 10 'aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names aiwg-production-asg \
  --query "AutoScalingGroups[0].Instances[*].[InstanceId,LifecycleState,HealthStatus]" \
  --output table'

# Expected lifecycle: Pending → InService (3-5 minutes)
```

#### Step 4: Verify Health Checks

```bash
# Wait for instances to pass health checks
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names aiwg-production-asg \
  --query 'AutoScalingGroups[0].Instances[?HealthStatus==`Healthy`].InstanceId'

# Should show all 5 instances healthy
```

#### Step 5: Verify Load Balancer Registration

```bash
# Check load balancer targets
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:region:account:targetgroup/aiwg-prod/abc123 \
  --query 'TargetHealthDescriptions[*].[Target.Id,TargetHealth.State]' \
  --output table

# All targets should show "healthy"
```

#### Step 6: Monitor Traffic Distribution

```bash
# Check request distribution across instances
# View load balancer metrics in CloudWatch or Grafana

# Verify CPU drops on existing instances
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=AutoScalingGroupName,Value=aiwg-production-asg \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# CPU should decrease as load distributes
```

#### Step 7: Validate Application Performance

```bash
# Check response times improved
curl -o /dev/null -s -w "Response time: %{time_total}s\n" https://api.ai-writing-guide.com/health

# Run multiple requests to test distribution
for i in {1..20}; do
  curl -s -w "Time: %{time_total}s | HTTP: %{http_code}\n" https://api.ai-writing-guide.com/health
  sleep 1
done

# Check error rates returned to baseline
grep "HTTP 5" /var/log/nginx/access.log | tail -20
```

### Scaling Down (Removing Instances)

**Pre-Scaling Down Checklist:**

- [ ] Verify sustained low utilization (>30 minutes)
- [ ] No scaling events in past 30 minutes
- [ ] No upcoming known traffic spikes
- [ ] Current capacity >minimum required (at least 2 instances)

**Step-by-Step Procedure:**

#### Step 1: Verify Safe to Scale Down

```bash
# Check current CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=AutoScalingGroupName,Value=aiwg-production-asg \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# Should be consistently <30%

# Check traffic patterns
# Review Grafana dashboard for request rate
```

#### Step 2: Decrease Desired Capacity

```bash
# Reduce by 1 instance
CURRENT_CAPACITY=$(aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names aiwg-production-asg \
  --query 'AutoScalingGroups[0].DesiredCapacity' \
  --output text)

NEW_CAPACITY=$((CURRENT_CAPACITY - 1))

# Ensure minimum capacity (e.g., 2)
if [ $NEW_CAPACITY -ge 2 ]; then
  aws autoscaling set-desired-capacity \
    --auto-scaling-group-name aiwg-production-asg \
    --desired-capacity $NEW_CAPACITY
  echo "Scaled down to $NEW_CAPACITY instances"
else
  echo "Cannot scale below minimum capacity"
fi
```

#### Step 3: Monitor Graceful Shutdown

```bash
# Watch instance termination
watch -n 10 'aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names aiwg-production-asg \
  --query "AutoScalingGroups[0].Instances[*].[InstanceId,LifecycleState]" \
  --output table'

# Instance should show: InService → Terminating → Terminated
```

#### Step 4: Verify Remaining Instances Stable

```bash
# Check CPU on remaining instances
# Should increase slightly but stay below warning threshold (<70%)

# Monitor for 15 minutes to ensure stability
watch -n 60 'aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=AutoScalingGroupName,Value=aiwg-production-asg \
  --start-time $(date -u -d "5 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average \
  --output text'
```

### Emergency Scaling

**Immediate Scale-Up (Traffic Spike):**

```bash
# Double capacity immediately
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name aiwg-production-asg \
  --desired-capacity 10 \
  --no-honor-cooldown  # Bypass cooldown period

# Or set to maximum capacity
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name aiwg-production-asg \
  --desired-capacity 15 \
  --no-honor-cooldown
```

**Rollback Scaling (Issues After Scale):**

```bash
# Return to previous capacity
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name aiwg-production-asg \
  --desired-capacity [PREVIOUS_CAPACITY]

# Terminate problematic instances manually if needed
aws autoscaling terminate-instance-in-auto-scaling-group \
  --instance-id i-1234567890abcdef0 \
  --should-decrement-desired-capacity
```

## Vertical Scaling Procedure

### Database Vertical Scaling (Upgrade Instance Type)

**When to Vertically Scale Database:**

- CPU consistently >80% during normal operations
- Memory pressure causing query slowdowns
- IOPS at provisioned limit
- Horizontal scaling not feasible (single primary database)

**Pre-Scaling Checklist:**

- [ ] Schedule maintenance window (low-traffic period)
- [ ] Notify stakeholders 24 hours in advance
- [ ] Take database backup
- [ ] Verify backup integrity
- [ ] Prepare rollback plan
- [ ] Document current instance specs

**Step-by-Step Procedure:**

#### Step 1: Select Target Instance Type

```bash
# Current instance: db.t3.large (2 vCPU, 8 GB RAM)
# Target instance: db.r5.xlarge (4 vCPU, 32 GB RAM)

# Verify instance type available in region
aws rds describe-orderable-db-instance-options \
  --engine postgres \
  --db-instance-class db.r5.xlarge \
  --query 'OrderableDBInstanceOptions[0].[DBInstanceClass,AvailabilityZones]'
```

#### Step 2: Create Pre-Upgrade Snapshot

```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier aiwg-production-db \
  --db-snapshot-identifier aiwg-db-pre-upgrade-$(date +%Y%m%d-%H%M%S)

# Wait for snapshot completion
aws rds wait db-snapshot-completed \
  --db-snapshot-identifier aiwg-db-pre-upgrade-$(date +%Y%m%d-%H%M%S)

# Verify snapshot
aws rds describe-db-snapshots \
  --db-snapshot-identifier aiwg-db-pre-upgrade-$(date +%Y%m%d-%H%M%S) \
  --query 'DBSnapshots[0].Status'
```

#### Step 3: Enable Maintenance Mode

```bash
# Put application in maintenance mode
# Serve static maintenance page from load balancer
curl -X POST https://api.ai-writing-guide.com/admin/maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": true, "message": "Database upgrade in progress. ETA: 15 minutes"}'

# Verify maintenance mode
curl https://api.ai-writing-guide.com/health
# Should return 503 with maintenance message
```

#### Step 4: Modify Database Instance

```bash
# Modify instance class
aws rds modify-db-instance \
  --db-instance-identifier aiwg-production-db \
  --db-instance-class db.r5.xlarge \
  --apply-immediately

# Monitor modification progress
watch -n 30 'aws rds describe-db-instances \
  --db-instance-identifier aiwg-production-db \
  --query "DBInstances[0].[DBInstanceStatus,DBInstanceClass]" \
  --output table'

# Status progression: available → modifying → available (10-15 minutes)
```

#### Step 5: Verify Database Accessibility

```bash
# Wait for instance to become available
aws rds wait db-instance-available \
  --db-instance-identifier aiwg-production-db

# Test connection
psql -h [db-endpoint] -U [username] -d aiwg_production -c "SELECT version();"

# Verify instance class upgraded
aws rds describe-db-instances \
  --db-instance-identifier aiwg-production-db \
  --query 'DBInstances[0].DBInstanceClass'
# Should show: db.r5.xlarge
```

#### Step 6: Disable Maintenance Mode

```bash
# Resume application
curl -X POST https://api.ai-writing-guide.com/admin/maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": false}'

# Verify application responding
curl https://api.ai-writing-guide.com/health
# Should return 200 OK
```

#### Step 7: Monitor Performance

```bash
# Monitor database performance for 30 minutes
watch -n 60 'aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=aiwg-production-db \
  --start-time $(date -u -d "10 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average \
  --output text'

# CPU should be lower than pre-upgrade
# Response times should improve
```

### Application Instance Vertical Scaling

**Procedure:**

```bash
# Update launch template with new instance type
aws ec2 create-launch-template-version \
  --launch-template-name aiwg-production-lt \
  --source-version 1 \
  --launch-template-data '{"InstanceType":"t3.xlarge"}'

# Set new version as default
aws ec2 modify-launch-template \
  --launch-template-name aiwg-production-lt \
  --default-version 2

# Gradually replace instances
# Scale up with new instance type
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name aiwg-production-asg \
  --desired-capacity 6

# Wait for new instances healthy, then scale down old instances
# Terminate old instance types one by one
```

## Performance Optimization

### Code Profiling

**Node.js Profiling:**

```bash
# Enable profiling
node --prof server.js

# Generate load
ab -n 1000 -c 10 http://localhost:3000/api/validate

# Stop server (Ctrl+C)
# Process profile
node --prof-process isolate-0x[hash]-v8.log > profile.txt

# Analyze profile
less profile.txt

# Look for:
# - Hot functions (high ticks)
# - Optimization bailouts
# - Garbage collection overhead
```

**Python Profiling:**

```bash
# Use cProfile
python -m cProfile -o profile.stats server.py

# Analyze with pstats
python -c "import pstats; p = pstats.Stats('profile.stats'); p.sort_stats('cumulative'); p.print_stats(20)"

# Or use line_profiler for specific functions
```

**Memory Profiling:**

```bash
# Node.js heap snapshot
kill -USR2 [PID]
# Generates heapsnapshot file

# Analyze in Chrome DevTools
# chrome://inspect → Load snapshot

# Look for:
# - Retained objects
# - Detached DOM nodes
# - Large arrays/objects
```

### Database Query Optimization

**Identify Slow Queries:**

```sql
-- PostgreSQL: Find slow queries
SELECT
  pid,
  now() - query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - query_start > interval '5 seconds'
ORDER BY duration DESC;

-- Enable query logging
ALTER DATABASE aiwg_production SET log_min_duration_statement = 1000; -- Log queries >1s

-- Review slow query log
cat /var/log/postgresql/postgresql-slow.log
```

**Optimize Queries:**

```sql
-- Analyze query plan
EXPLAIN ANALYZE
SELECT * FROM documents WHERE user_id = 123 AND status = 'active';

-- Look for:
-- - Sequential scans (should use indexes)
-- - High cost estimates
-- - Slow execution time

-- Add index if needed
CREATE INDEX CONCURRENTLY idx_documents_user_status
ON documents(user_id, status);

-- Verify index usage
EXPLAIN ANALYZE
SELECT * FROM documents WHERE user_id = 123 AND status = 'active';
-- Should show "Index Scan" instead of "Seq Scan"
```

**Optimize Connection Pooling:**

```javascript
// Example: PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: 'aiwg_production',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Optimize pool settings
  min: 10,                    // Minimum connections
  max: 50,                    // Maximum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Timeout if no connection available
});

// Monitor pool metrics
pool.on('connect', () => {
  console.log('Pool connection established');
});

pool.on('error', (err) => {
  console.error('Pool error:', err);
});
```

### Cache Configuration

**Application-Level Caching:**

```javascript
// Example: Redis caching
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: 6379,
  // Optimization settings
  retry_strategy: (options) => {
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }
    return Math.min(options.attempt * 100, 3000);
  },
  enable_offline_queue: false, // Fail fast if Redis unavailable
});

// Cache frequently accessed data
async function getDocument(id) {
  const cacheKey = `document:${id}`;

  // Try cache first
  const cached = await client.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const doc = await db.query('SELECT * FROM documents WHERE id = $1', [id]);

  // Cache for 5 minutes
  await client.setex(cacheKey, 300, JSON.stringify(doc));

  return doc;
}
```

**Database Query Caching:**

```sql
-- PostgreSQL: Configure shared_buffers for query cache
-- Edit postgresql.conf
shared_buffers = 2GB              -- 25% of system RAM
effective_cache_size = 6GB        -- 75% of system RAM
work_mem = 50MB                   -- Per-operation memory
maintenance_work_mem = 512MB      -- For vacuum, index creation

-- Restart PostgreSQL
sudo systemctl restart postgresql
```

**HTTP Caching (Nginx):**

```nginx
# Nginx cache configuration
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

server {
  location /api/ {
    # Cache GET requests
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_valid 404 1m;
    proxy_cache_use_stale error timeout updating;

    # Add cache status header
    add_header X-Cache-Status $upstream_cache_status;

    proxy_pass http://backend;
  }
}
```

### CDN Utilization

**CloudFront Configuration:**

```bash
# Create CloudFront distribution (example)
aws cloudfront create-distribution \
  --origin-domain-name api.ai-writing-guide.com \
  --default-cache-behavior '{
    "TargetOriginId": "aiwg-api",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    },
    "CachedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "ForwardedValues": {
      "QueryString": true,
      "Headers": {
        "Quantity": 1,
        "Items": ["Authorization"]
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 300,
    "MaxTTL": 3600
  }'

# Cache static assets aggressively
# /static/* → cache for 1 year
# /api/* → cache for 5 minutes
# /health → no cache
```

## Load Testing

### When to Run Load Tests

**Regular Testing:**

- Before major releases (weekly during Construction phase)
- After scaling configuration changes
- Monthly baseline performance checks

**Event-Driven Testing:**

- Before product launches
- After major refactoring
- When adding new features
- After infrastructure changes

**Continuous Testing:**

- Automated smoke tests (every deployment)
- Automated load tests (nightly)

### Test Scenarios

**Scenario 1: Baseline Performance**

```bash
# Test normal traffic (100 concurrent users, 5 minutes)
artillery run --target https://staging.ai-writing-guide.com \
  config/load-test-baseline.yml

# baseline.yml:
config:
  target: "https://staging.ai-writing-guide.com"
  phases:
    - duration: 300
      arrivalRate: 20  # 20 new users/second
scenarios:
  - name: "Typical user flow"
    flow:
      - get:
          url: "/api/health"
      - think: 2
      - post:
          url: "/api/validate"
          json:
            content: "Sample text for validation"
      - think: 5
      - get:
          url: "/api/agents"
```

**Scenario 2: Stress Test**

```bash
# Test maximum capacity (ramp up to 500 concurrent users)
artillery run --target https://staging.ai-writing-guide.com \
  config/load-test-stress.yml

# stress.yml:
config:
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 180
      arrivalRate: 100  # Peak load
    - duration: 60
      arrivalRate: 10   # Cool down
```

**Scenario 3: Spike Test**

```bash
# Test sudden traffic spike
artillery run --target https://staging.ai-writing-guide.com \
  config/load-test-spike.yml

# spike.yml:
config:
  phases:
    - duration: 60
      arrivalRate: 10   # Normal traffic
    - duration: 30
      arrivalRate: 200  # Sudden spike
    - duration: 60
      arrivalRate: 10   # Return to normal
```

### Results Interpretation

**Key Metrics to Analyze:**

```bash
# Artillery output analysis
Summary report:
  scenarios.launched: 6000
  scenarios.completed: 5950
  requests.completed: 23800
  response_time.min: 45
  response_time.max: 2345
  response_time.median: 187
  response_time.p95: 512
  response_time.p99: 1234
  errors.ETIMEDOUT: 15
  errors.ECONNREFUSED: 35
```

**Interpretation:**

| Metric | Good | Warning | Action Needed |
|--------|------|---------|---------------|
| Success Rate | >99% | 95-99% | <95% |
| p95 Response Time | <500ms | 500-1000ms | >1000ms |
| p99 Response Time | <1000ms | 1000-2000ms | >2000ms |
| Error Rate | <1% | 1-5% | >5% |
| Throughput | Meets target | 80-100% target | <80% target |

**Action Thresholds:**

```bash
# If p95 >500ms → Investigate slow endpoints
artillery run --target https://staging.ai-writing-guide.com \
  --output report.json \
  config/load-test.yml

# Generate HTML report
artillery report report.json

# Analyze slowest endpoints
cat report.json | jq '.aggregate.latency.median | to_entries | sort_by(.value) | reverse | .[0:10]'

# If error rate >1% → Check error types
cat report.json | jq '.aggregate.errors'

# If CPU/memory spikes → Profile application
node --prof server.js  # During load test
```

### Load Test Automation

**CI/CD Integration:**

```yaml
# .github/workflows/load-test.yml
name: Load Testing

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Artillery
        run: npm install -g artillery

      - name: Run baseline test
        run: artillery run config/load-test-baseline.yml

      - name: Check results
        run: |
          # Parse results and fail if thresholds exceeded
          p95=$(cat artillery-output.json | jq '.aggregate.latency.p95')
          if (( $(echo "$p95 > 500" | bc -l) )); then
            echo "ERROR: p95 latency $p95 ms exceeds threshold"
            exit 1
          fi
```

## Appendix

### Scaling Checklist

**Pre-Scaling:**

- [ ] Review current metrics (CPU, memory, response time)
- [ ] Check recent deployments and changes
- [ ] Verify auto-scaling policies active
- [ ] Confirm database capacity adequate
- [ ] Review error logs for application issues

**During Scaling:**

- [ ] Monitor instance health
- [ ] Verify load balancer registration
- [ ] Check traffic distribution
- [ ] Monitor application performance
- [ ] Watch for errors or anomalies

**Post-Scaling:**

- [ ] Verify metrics returned to acceptable range
- [ ] Document scaling event
- [ ] Update capacity planning forecasts
- [ ] Review auto-scaling thresholds (adjust if needed)
- [ ] Communicate results to team

### Performance Optimization Checklist

**Application Level:**

- [ ] Profile code for hot paths
- [ ] Optimize database queries
- [ ] Implement caching strategy
- [ ] Minimize external API calls
- [ ] Optimize asset delivery (compression, CDN)
- [ ] Remove unnecessary dependencies

**Database Level:**

- [ ] Add appropriate indexes
- [ ] Optimize query plans
- [ ] Configure connection pooling
- [ ] Enable query caching
- [ ] Partition large tables
- [ ] Regular VACUUM and ANALYZE

**Infrastructure Level:**

- [ ] Right-size instance types
- [ ] Configure auto-scaling policies
- [ ] Implement CDN for static assets
- [ ] Optimize network configuration
- [ ] Configure load balancer settings
- [ ] Enable compression (gzip, brotli)

### Monitoring Dashboard Widgets

**Essential Widgets:**

1. **Response Time Trends** (p50, p95, p99)
2. **Request Rate** (requests/second)
3. **Error Rate** (errors/total requests)
4. **Instance Count** (current vs desired vs healthy)
5. **CPU Utilization** (per-instance and aggregate)
6. **Memory Utilization** (per-instance and aggregate)
7. **Database Connections** (active vs max)
8. **Cache Hit Rate** (Redis/CDN)
9. **SLO Compliance** (current period error budget)
10. **Cost Tracking** (infrastructure spend)

### Related Documentation

- Runbook: Incident Response
- Runbook: Monitoring and Alerting
- Architecture Documentation: Scalability Design
- Capacity Planning Spreadsheet
- SLO/SLI Dashboard

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-24 | DevOps Team | Initial release |

**Review Schedule:** Quarterly or after major scaling events
**Next Review:** 2026-01-24
