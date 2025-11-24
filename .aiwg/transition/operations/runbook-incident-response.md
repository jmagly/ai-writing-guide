# Operational Runbook: Incident Response

**Version:** 1.0
**Last Updated:** 2025-10-24
**Owner:** Operations Team
**Review Cycle:** Quarterly

## Purpose

This runbook provides step-by-step procedures for detecting, responding to, and resolving production incidents in the AI Writing Guide platform.

## Incident Severity Definitions

### P0 - Critical

**Impact:** Complete system outage, data loss, or security breach

**Examples:**

- Platform completely unavailable
- Data loss or corruption
- Security breach or vulnerability exploitation
- Revenue-impacting outage (>25% users affected)

**Response Time:** Immediate (acknowledge within 5 minutes)
**Resolution Target:** 1-2 hours
**Communication:** Immediate notification to all stakeholders

### P1 - High

**Impact:** Major functionality broken, significant user impact

**Examples:**

- Core validation features unavailable
- Agent deployment failures
- Database performance severely degraded
- Authentication/authorization failures
- 10-25% of users affected

**Response Time:** 15 minutes
**Resolution Target:** 4 hours
**Communication:** Notify key stakeholders within 30 minutes

### P2 - Medium

**Impact:** Degraded performance, workarounds available

**Examples:**

- Non-critical feature unavailable
- Performance degradation (slow but functional)
- Intermittent errors affecting <10% users
- Elevated error rates (but below SLO breach)

**Response Time:** 1 hour
**Resolution Target:** 24 hours
**Communication:** Status update in team channels

### P3 - Low

**Impact:** Minor issues, minimal user impact

**Examples:**

- Cosmetic issues
- Minor documentation errors
- Edge case bugs
- Non-urgent performance optimizations

**Response Time:** Next business day
**Resolution Target:** 7 days
**Communication:** Tracked in issue tracker

## Incident Response Workflow

### 1. Detection and Alerting

**Incident Sources:**

- Automated monitoring alerts (Grafana, CloudWatch)
- User reports (support tickets, GitHub issues)
- Team member observation
- Security scanning alerts
- Third-party service notifications

**Initial Actions:**

```bash
# Check system status dashboard
# URL: https://status.ai-writing-guide.com (or internal monitoring)

# Check recent deployments
git log --since="24 hours ago" --oneline

# Review active alerts
# Access monitoring dashboard: [Grafana URL]

# Check service health
curl -I https://api.ai-writing-guide.com/health
```

### 2. Initial Assessment (5 Minutes)

**Severity Assessment Checklist:**

- [ ] How many users are affected? (1 user vs 10% vs all users)
- [ ] What functionality is impacted? (core vs peripheral)
- [ ] Is there data loss risk?
- [ ] Is there a security component?
- [ ] Is revenue impacted?
- [ ] Are workarounds available?

**Document Initial Findings:**

```markdown
## Incident Report Template

**Incident ID:** INC-YYYY-MM-DD-NNN
**Reported:** [timestamp]
**Reporter:** [name]
**Severity:** [P0/P1/P2/P3]

**Symptoms:**
- [What users are experiencing]

**Impact:**
- Users affected: [number or percentage]
- Functionality: [what's broken]

**Initial Assessment:**
- [First observations]
```

### 3. Stakeholder Notification

**P0/P1 Notification (Immediate):**

**To:** Engineering Lead, Product Owner, Support Lead
**Subject:** [P0/P1] Production Incident - [Brief Description]

```
Incident ID: INC-2025-10-24-001
Severity: P0
Status: Investigating

Impact:
- [Description of user impact]
- Affected users: [estimate]

Current Actions:
- [What's being investigated]

Next Update: [timeframe, e.g., 30 minutes]

Incident Commander: [name]
```

**P2 Notification (Within 1 hour):**

Post in team Slack/Teams channel with summary

**P3 Notification:**

Create issue in tracker, no immediate notification required

### 4. Investigation and Diagnosis

**Systematic Investigation Steps:**

#### Step 1: Reproduce the Issue

```bash
# Attempt to reproduce in staging/dev environment
# Document exact steps that trigger the issue

# Check if issue is environment-specific
# Production vs Staging vs Dev
```

#### Step 2: Check Recent Changes

```bash
# Review recent deployments
git log --since="48 hours ago" --oneline --graph

# Check recent configuration changes
# Review deployment logs
# Check CI/CD pipeline status

# If recent deployment suspected, prepare rollback
git log -1 --stat  # Review last deployment changes
```

#### Step 3: Review Logs

```bash
# Application logs
tail -f /var/log/aiwg/application.log

# Error logs
grep -i "error\|exception\|critical" /var/log/aiwg/application.log | tail -50

# Database logs
tail -f /var/log/postgresql/postgresql.log

# Web server logs
tail -f /var/log/nginx/error.log
```

#### Step 4: Check Resource Utilization

```bash
# CPU and memory
top -n 1
htop

# Disk usage
df -h
du -sh /var/log/*

# Database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Network connections
netstat -an | grep ESTABLISHED | wc -l
```

#### Step 5: Check Dependencies

```bash
# External service status
curl -I https://api.github.com
curl -I https://openai.com/api

# Database connectivity
psql -h [db-host] -U [user] -c "SELECT 1;"

# Cache service
redis-cli ping

# Check DNS resolution
nslookup api.ai-writing-guide.com
```

### 5. Mitigation and Resolution

**Immediate Mitigation Options (by priority):**

#### Option 1: Rollback Recent Deployment

```bash
# If issue started after recent deployment
# Rollback to previous stable version

# Identify previous stable version
git log --oneline | head -10

# Rollback procedure
git checkout [previous-stable-commit]
./deploy/rollback.sh [environment] [commit-hash]

# Verify rollback
curl https://api.ai-writing-guide.com/version

# Monitor for 15 minutes
# Check error rates return to baseline
```

#### Option 2: Restart Services

```bash
# Restart application
sudo systemctl restart aiwg-api
sudo systemctl status aiwg-api

# Restart web server
sudo systemctl restart nginx

# Restart cache
sudo systemctl restart redis

# Monitor service startup
journalctl -u aiwg-api -f
```

#### Option 3: Scale Resources

```bash
# If resource exhaustion identified
# Increase instance count (horizontal scaling)

# AWS example
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name aiwg-production \
  --desired-capacity 5

# Verify new instances healthy
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names aiwg-production
```

#### Option 4: Apply Hotfix

```bash
# For critical bugs requiring code changes
# Create hotfix branch
git checkout -b hotfix/incident-INC-2025-10-24-001 main

# Make minimal fix
# [edit code]

# Fast-track testing
npm run test:critical

# Deploy hotfix
./deploy/hotfix-deploy.sh production

# Monitor deployment
./deploy/monitor-deployment.sh
```

#### Option 5: Enable Maintenance Mode

```bash
# Last resort: graceful degradation
# Enable maintenance mode with user messaging

# Update load balancer to serve maintenance page
sudo cp /etc/nginx/maintenance.html /var/www/html/index.html
sudo systemctl reload nginx

# Notify users via status page
# Post to status.ai-writing-guide.com
```

### 6. Post-Incident Review

**Within 24-48 Hours of Resolution:**

#### Schedule Post-Mortem Meeting

**Attendees:** Incident responders, engineering lead, product owner

**Agenda:**

1. Incident timeline review
2. Root cause analysis
3. What went well
4. What could be improved
5. Action items

#### Post-Mortem Template

```markdown
# Incident Post-Mortem: INC-YYYY-MM-DD-NNN

**Date:** [incident date]
**Severity:** [P0/P1/P2/P3]
**Duration:** [detection to resolution time]
**Impact:** [users affected, revenue impact]

## Incident Summary

[2-3 sentence summary of what happened]

## Timeline

| Time (UTC) | Event |
|------------|-------|
| 14:23 | Monitoring alert triggered: High error rate |
| 14:25 | Incident commander assigned |
| 14:30 | Root cause identified: Database connection pool exhausted |
| 14:45 | Mitigation: Increased connection pool size |
| 15:10 | Issue resolved, monitoring returned to baseline |

## Root Cause

[Detailed explanation of what caused the incident]

**Contributing Factors:**
- [Factor 1]
- [Factor 2]

## Resolution

[What was done to resolve the incident]

## Impact Analysis

- **Users Affected:** [number/percentage]
- **Duration:** [time]
- **Revenue Impact:** [if applicable]
- **SLO Impact:** [error budget consumed]

## What Went Well

- [Positive aspect 1]
- [Positive aspect 2]

## What Could Be Improved

- [Improvement area 1]
- [Improvement area 2]

## Action Items

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Increase default connection pool size | DevOps | 2025-11-01 | Open |
| Add connection pool monitoring | SRE | 2025-11-05 | Open |
| Update runbook with new diagnosis steps | Ops | 2025-10-30 | Open |

## Lessons Learned

[Key takeaways for future incidents]
```

## Common Incidents

### Incident 1: High CPU Usage

**Symptoms:**

- Monitoring alert: CPU >80% for 5+ minutes
- Slow response times
- Request timeouts
- Application unresponsive

**Diagnosis Steps:**

```bash
# 1. Check current CPU usage
top -n 1 -b | head -20

# 2. Identify high CPU processes
ps aux --sort=-%cpu | head -10

# 3. Check application threads
pgrep -a node | xargs ps -p

# 4. Review recent traffic patterns
# Check analytics dashboard for traffic spikes

# 5. Check for infinite loops or runaway processes
strace -p [PID] -c -f

# 6. Review application logs for errors
grep -i "timeout\|slow\|performance" /var/log/aiwg/application.log
```

**Resolution Steps:**

1. **Immediate:** Restart affected service if CPU at 100%
   ```bash
   sudo systemctl restart aiwg-api
   ```

2. **Short-term:** Scale horizontally to distribute load
   ```bash
   # Add more instances
   ./deploy/scale-up.sh --instances 3
   ```

3. **Medium-term:** Identify and optimize slow code paths
   ```bash
   # Profile application
   node --prof server.js
   # Analyze profile
   node --prof-process isolate-*.log > profile.txt
   ```

4. **Long-term:** Implement caching, optimize algorithms

**Prevention Measures:**

- Set up auto-scaling based on CPU thresholds (>70%)
- Implement rate limiting to prevent abuse
- Regular performance profiling and optimization
- Load testing before major releases
- Code review focus on algorithmic complexity

### Incident 2: Memory Leak

**Symptoms:**

- Gradually increasing memory usage over time
- Memory alert triggered (>85% usage)
- Application slowdown
- Out of Memory (OOM) crashes
- Increased garbage collection frequency

**Diagnosis Steps:**

```bash
# 1. Check memory usage trend
free -m
watch -n 5 free -m

# 2. Identify memory-consuming processes
ps aux --sort=-%mem | head -10

# 3. Get heap snapshot (Node.js)
kill -USR2 [PID]
# Heap snapshot saved to /tmp/heapsnapshot-*.heapsnapshot

# 4. Check for memory growth pattern
# Monitor memory over time
while true; do
  ps -p [PID] -o rss,vsz,cmd
  sleep 60
done

# 5. Review application logs for memory warnings
grep -i "memory\|heap\|gc" /var/log/aiwg/application.log
```

**Resolution Steps:**

1. **Immediate:** Restart service to clear memory
   ```bash
   sudo systemctl restart aiwg-api
   # Schedule regular restarts as temporary measure
   ```

2. **Short-term:** Increase memory allocation
   ```bash
   # Increase Node.js heap size
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

3. **Medium-term:** Analyze heap snapshot
   ```bash
   # Use Chrome DevTools or dedicated tools
   # Identify objects not being garbage collected
   # Look for event listener leaks, unclosed connections
   ```

4. **Long-term:** Fix memory leaks in code
   - Remove event listeners when no longer needed
   - Close database connections
   - Clear timers and intervals
   - Avoid global variable accumulation

**Prevention Measures:**

- Memory profiling in CI/CD pipeline
- Automated memory leak detection tools
- Regular heap snapshot analysis
- Memory usage monitoring and alerts
- Code review focus on resource cleanup

### Incident 3: Database Connection Issues

**Symptoms:**

- "Too many connections" errors
- Connection timeout errors
- Slow database queries
- Application unable to connect to database
- Intermittent 500 errors

**Diagnosis Steps:**

```bash
# 1. Check database connection pool status
# Application-level check
curl http://localhost:3000/health/db

# 2. Check active database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"
psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# 3. Check max connections limit
psql -c "SHOW max_connections;"

# 4. Identify long-running queries
psql -c "
  SELECT pid, age(clock_timestamp(), query_start), usename, query
  FROM pg_stat_activity
  WHERE query != '<IDLE>' AND query NOT ILIKE '%pg_stat_activity%'
  ORDER BY query_start ASC;
"

# 5. Check for connection leaks
grep "connection" /var/log/aiwg/application.log | tail -100

# 6. Test database connectivity
psql -h [db-host] -U [user] -c "SELECT 1;"
```

**Resolution Steps:**

1. **Immediate:** Kill long-running or idle connections
   ```bash
   # Kill idle connections
   psql -c "
     SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE state = 'idle'
     AND state_change < current_timestamp - interval '10 minutes';
   "
   ```

2. **Short-term:** Restart application to reset connection pool
   ```bash
   sudo systemctl restart aiwg-api
   ```

3. **Medium-term:** Increase connection limits
   ```bash
   # Database side (PostgreSQL)
   # Edit postgresql.conf
   max_connections = 200

   # Restart database
   sudo systemctl restart postgresql

   # Application side
   # Update connection pool configuration
   pool: {
     min: 10,
     max: 50,
     idleTimeoutMillis: 30000
   }
   ```

4. **Long-term:** Fix connection leaks
   - Review code for unclosed connections
   - Implement connection pooling best practices
   - Add connection timeout configurations
   - Use try-finally blocks for connection management

**Prevention Measures:**

- Monitor active database connections
- Set connection pool limits appropriate to workload
- Implement connection leak detection
- Regular database performance tuning
- Load testing with realistic connection patterns
- Automated alerts for connection pool exhaustion

### Incident 4: API Rate Limiting

**Symptoms:**

- 429 "Too Many Requests" errors
- Users unable to access features
- Third-party API rejecting requests
- Elevated error rates in logs

**Diagnosis Steps:**

```bash
# 1. Check rate limit errors in logs
grep "429\|rate limit\|too many requests" /var/log/aiwg/application.log | wc -l

# 2. Identify affected endpoints
grep "429" /var/log/nginx/access.log | awk '{print $7}' | sort | uniq -c | sort -rn

# 3. Check request volume by IP
grep "429" /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn

# 4. Review third-party API quotas
# Check provider dashboard (OpenAI, GitHub, etc.)

# 5. Analyze request patterns
# Look for automated bots, retry storms, or abuse
```

**Resolution Steps:**

1. **Immediate:** Implement or adjust rate limiting
   ```bash
   # Nginx rate limiting example
   limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

   location /api/ {
     limit_req zone=api burst=20 nodelay;
   }
   ```

2. **Short-term:** Increase API quotas (if cost-acceptable)
   - Contact third-party provider for quota increase
   - Upgrade to higher tier plan

3. **Medium-term:** Implement request queuing
   ```javascript
   // Example: Implement exponential backoff
   async function retryWithBackoff(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (error.status === 429 && i < maxRetries - 1) {
           await sleep(2 ** i * 1000); // Exponential backoff
         } else {
           throw error;
         }
       }
     }
   }
   ```

4. **Long-term:** Optimize API usage
   - Implement caching to reduce API calls
   - Batch requests where possible
   - Use webhooks instead of polling

**Prevention Measures:**

- Monitor API usage vs quotas
- Implement tiered rate limiting (authenticated vs anonymous)
- Set up alerts at 80% of quota
- Implement request caching
- Document rate limits in API documentation
- Regular review of API usage patterns

### Incident 5: Test Suite Failures

**Symptoms:**

- CI/CD pipeline failing
- Unable to deploy new releases
- Intermittent test failures (flaky tests)
- Test execution timeouts

**Diagnosis Steps:**

```bash
# 1. Identify failing tests
npm test -- --verbose

# 2. Run failing test in isolation
npm test -- --testNamePattern="specific test name"

# 3. Check test environment
echo $NODE_ENV
echo $DATABASE_URL
env | grep TEST

# 4. Review test logs
cat test-results/junit.xml

# 5. Check for timing issues
npm test -- --runInBand  # Disable parallel execution

# 6. Verify test data and fixtures
ls -la test/fixtures/
```

**Resolution Steps:**

1. **Immediate:** Skip failing tests temporarily (not recommended long-term)
   ```javascript
   test.skip('flaky test', () => {
     // Test code
   });
   ```

2. **Short-term:** Increase test timeouts
   ```javascript
   jest.setTimeout(10000); // 10 seconds
   ```

3. **Medium-term:** Fix flaky tests
   - Add proper wait conditions
   - Mock external dependencies
   - Reset state between tests
   - Fix race conditions

4. **Long-term:** Improve test reliability
   - Implement test retry mechanisms
   - Use test fixtures properly
   - Isolate test environments
   - Regular test suite maintenance

**Prevention Measures:**

- Monitor test execution times
- Identify and fix flaky tests immediately
- Run tests in CI/CD before merge
- Maintain test data fixtures
- Regular test suite refactoring
- Test isolation best practices

### Incident 6: Plugin Load Failures

**Symptoms:**

- Agent deployment errors
- "Plugin not found" errors
- Validation features unavailable
- Claude Code extension errors

**Diagnosis Steps:**

```bash
# 1. Check plugin directory structure
ls -la .claude/agents/
ls -la .claude/commands/

# 2. Verify plugin metadata
cat .claude/agents/[agent-name].md

# 3. Check for syntax errors
node -c .claude/commands/command-name.md

# 4. Review plugin load logs
grep "plugin\|agent\|command" /var/log/aiwg/application.log

# 5. Test plugin load manually
# Use CLI tool to validate plugins
aiwg -deploy-agents --dry-run

# 6. Check file permissions
ls -la .claude/
```

**Resolution Steps:**

1. **Immediate:** Rollback to known-good plugin version
   ```bash
   git checkout HEAD~1 .claude/
   git checkout HEAD~1 agentic/
   ```

2. **Short-term:** Redeploy plugins
   ```bash
   aiwg -deploy-agents --mode both --force
   ```

3. **Medium-term:** Fix plugin syntax or structure
   - Validate YAML frontmatter
   - Check markdown formatting
   - Verify agent names match conventions

4. **Long-term:** Implement plugin validation in CI/CD
   ```bash
   # Add to CI pipeline
   npm run validate:plugins
   ```

**Prevention Measures:**

- Plugin validation in CI/CD pipeline
- Automated testing of agent deployment
- Version control for plugin configurations
- Documentation of plugin structure requirements
- Regular plugin compatibility testing

### Incident 7: Security Alert Triggered

**Symptoms:**

- Security scanning tool alerts
- Unusual access patterns detected
- Failed authentication attempts spike
- Suspicious API calls logged
- Vulnerability disclosed in dependency

**Diagnosis Steps:**

```bash
# 1. Review security alerts
# Check security dashboard or SIEM

# 2. Check failed authentication attempts
grep "failed\|unauthorized\|forbidden" /var/log/nginx/access.log | tail -100

# 3. Analyze suspicious IP addresses
grep [suspicious-IP] /var/log/nginx/access.log

# 4. Check for known vulnerabilities
npm audit
snyk test

# 5. Review recent access logs
tail -100 /var/log/aiwg/access.log

# 6. Check for data exfiltration patterns
# Large data transfers, unusual endpoints accessed
```

**Resolution Steps:**

1. **Immediate:** Block suspicious IP addresses
   ```bash
   # Temporary IP block
   sudo iptables -A INPUT -s [suspicious-IP] -j DROP

   # Nginx block
   # Add to nginx.conf
   deny [suspicious-IP];
   ```

2. **Short-term:** Revoke compromised credentials
   ```bash
   # Rotate API keys
   # Force password resets for affected users
   # Revoke OAuth tokens
   ```

3. **Medium-term:** Patch vulnerabilities
   ```bash
   # Update dependencies
   npm audit fix

   # Update specific package
   npm update [package-name]

   # Test and deploy
   npm test
   ./deploy/deploy.sh staging
   ```

4. **Long-term:** Security hardening
   - Implement IP whitelisting
   - Add multi-factor authentication
   - Enhance logging and monitoring
   - Regular security audits

**Prevention Measures:**

- Automated security scanning in CI/CD
- Regular dependency updates
- Security training for team
- Implement least-privilege access
- Regular penetration testing
- Security incident response drills

## Escalation Matrix

### L1 Support (First Response)

**Responsibilities:**

- Initial triage and assessment
- Basic troubleshooting (restart services, check logs)
- Escalate to L2 if unresolved in 30 minutes (P0/P1)

**Contact:**

- Slack: #support-oncall
- Email: support-oncall@ai-writing-guide.com
- Phone: [On-call rotation]

### L2 Engineering (Technical Resolution)

**Responsibilities:**

- Deep technical investigation
- Code-level debugging
- Hotfix deployment
- Escalate to L3 for architectural issues

**Contact:**

- Slack: #engineering-oncall
- Email: engineering-oncall@ai-writing-guide.com
- Phone: [On-call rotation]

### L3 Architecture (Complex Issues)

**Responsibilities:**

- Architectural decisions during incidents
- Complex system interactions
- Major infrastructure changes
- Escalate to management for business decisions

**Contact:**

- Slack: @architecture-lead
- Email: architecture@ai-writing-guide.com
- Phone: [Direct line]

### Management (Business Impact)

**Responsibilities:**

- Customer communication for major outages
- Business continuity decisions
- Resource allocation
- Public relations and legal coordination

**Contact:**

- Slack: @engineering-manager
- Email: management@ai-writing-guide.com
- Phone: [Direct line]

### Escalation Timeframes

| Severity | L1 → L2 | L2 → L3 | L3 → Management |
|----------|---------|---------|-----------------|
| P0 | 15 minutes | 30 minutes | Immediate |
| P1 | 30 minutes | 1 hour | 2 hours |
| P2 | 2 hours | 4 hours | Next business day |
| P3 | Next day | As needed | Not required |

## Communication Templates

### Incident Notification

**Subject:** [P0/P1/P2] Production Incident - [Brief Description]

```
Incident ID: INC-YYYY-MM-DD-NNN
Severity: [P0/P1/P2/P3]
Status: [Investigating/Mitigating/Resolved]
Start Time: [timestamp UTC]

IMPACT:
- Affected Users: [number or percentage]
- Affected Services: [list of services/features]
- Business Impact: [revenue, reputation, compliance]

CURRENT STATUS:
[2-3 sentences on what's happening]

ACTIONS TAKEN:
- [Action 1]
- [Action 2]

NEXT STEPS:
- [Next action]
- ETA: [timeframe]

NEXT UPDATE:
[timestamp - typically 30 min for P0/P1, 2 hours for P2]

Incident Commander: [name]
Contact: [email/phone]
```

### Status Update

**Subject:** UPDATE: [P0/P1/P2] [Brief Description] - [Status]

```
Incident ID: INC-YYYY-MM-DD-NNN
Update #: [number]
Time: [timestamp UTC]

STATUS CHANGE:
Previous: [old status]
Current: [new status]

PROGRESS:
[What's been done since last update]

FINDINGS:
[What we've learned]

NEXT STEPS:
- [Planned action]
- ETA: [timeframe]

NEXT UPDATE:
[timestamp]
```

### Resolution Notification

**Subject:** RESOLVED: [P0/P1/P2] [Brief Description]

```
Incident ID: INC-YYYY-MM-DD-NNN
Status: RESOLVED
Resolution Time: [timestamp UTC]
Total Duration: [hours:minutes]

RESOLUTION SUMMARY:
[2-3 sentences explaining how issue was resolved]

ROOT CAUSE:
[Brief explanation of what caused the incident]

IMPACT:
- Users Affected: [number]
- Duration: [time]
- Services Impacted: [list]

PREVENTIVE MEASURES:
[What we're doing to prevent recurrence]

POST-MORTEM:
Scheduled for: [date/time]
Document link: [URL when available]

Thank you for your patience.

Incident Commander: [name]
```

### Post-Mortem Invitation

**Subject:** Post-Mortem Scheduled: INC-YYYY-MM-DD-NNN

```
Incident: [brief description]
Severity: [P0/P1/P2]
Date/Time: [meeting schedule]
Location: [meeting link]

Agenda:
1. Incident timeline review (10 min)
2. Root cause analysis (15 min)
3. What went well (10 min)
4. What could be improved (15 min)
5. Action items (10 min)

Pre-read:
[Link to incident report]

Please review the incident report before the meeting.

Required Attendees:
- [List of key participants]

Optional Attendees:
- [Others who may benefit]

Meeting Link: [URL]
```

## Appendix

### Useful Commands Reference

```bash
# System health
top
htop
free -m
df -h
iostat

# Process management
ps aux
pgrep -a [process-name]
kill -9 [PID]
systemctl status [service]
systemctl restart [service]

# Logs
tail -f /var/log/[logfile]
journalctl -u [service] -f
grep -i "error" /var/log/[logfile]

# Network
netstat -tulpn
ss -tulpn
curl -I [URL]
nslookup [domain]
traceroute [host]

# Database
psql -c "SELECT * FROM pg_stat_activity;"
psql -c "SHOW max_connections;"

# Application
npm test
npm run build
git log --oneline
```

### Monitoring Dashboard URLs

- **Primary Dashboard:** [Grafana URL]
- **Logs:** [CloudWatch/ELK URL]
- **Alerts:** [PagerDuty URL]
- **Status Page:** [Status page URL]
- **CI/CD:** [GitHub Actions/Jenkins URL]

### Contact Information

| Role | Name | Email | Phone | Slack |
|------|------|-------|-------|-------|
| Engineering Lead | [Name] | [Email] | [Phone] | @handle |
| DevOps Lead | [Name] | [Email] | [Phone] | @handle |
| Product Owner | [Name] | [Email] | [Phone] | @handle |
| Support Lead | [Name] | [Email] | [Phone] | @handle |

### Related Documentation

- Runbook: Scaling and Performance
- Runbook: Monitoring and Alerting
- Deployment Procedures
- Security Incident Response Plan
- Business Continuity Plan

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-24 | Ops Team | Initial release |

**Review Schedule:** Quarterly or after major incidents
**Next Review:** 2026-01-24
