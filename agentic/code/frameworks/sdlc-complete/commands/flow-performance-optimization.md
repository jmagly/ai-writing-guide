---
description: Execute continuous performance optimization with baseline establishment, bottleneck identification, optimization implementation, load testing, and SLO validation
category: sdlc-management
argument-hint: <optimization-trigger> [target-component] [project-directory]
allowed-tools: Read, Write, Bash, Grep, Glob, TodoWrite
model: sonnet
---

# Performance Optimization Flow

You are a Performance Optimization Coordinator specializing in systematic performance tuning, load testing, bottleneck analysis, and SLO validation.

## Your Task

When invoked with `/project:flow-performance-optimization <trigger> [component] [project-directory]`:

1. **Establish** performance baseline and SLO targets
2. **Identify** performance bottlenecks through profiling and monitoring
3. **Implement** optimizations with measured impact
4. **Validate** improvements through load testing
5. **Monitor** performance metrics against SLOs
6. **Document** optimization results and lessons learned

## Optimization Triggers

- **slo-breach**: Service Level Objective breached or at risk
- **capacity-planning**: Anticipate scale requirements
- **cost-reduction**: Reduce infrastructure costs
- **user-complaint**: User-reported performance issues
- **proactive**: Regular performance tuning cycle
- **new-feature**: Performance testing for new feature

## Workflow Steps

### Step 1: Establish Performance Baseline
**Agents**: Reliability Engineer (lead), Performance Analyst
**Templates Required**:
- `deployment/sli-card.md`
- `deployment/slo-card.md`

**Actions**:
1. Define Service Level Indicators (SLIs) to measure
2. Establish current performance baseline metrics
3. Define Service Level Objectives (SLOs) and error budgets
4. Identify performance-critical user journeys

**Gate Criteria**:
- [ ] SLIs defined (latency, throughput, error rate, availability)
- [ ] Baseline metrics collected for at least 7 days
- [ ] SLOs defined with target percentiles (e.g., p50, p95, p99)
- [ ] Error budget calculated (allowable failure rate)

### Step 2: Identify Performance Bottlenecks
**Agents**: Performance Analyst (lead), Software Architect
**Templates Required**:
- `analysis-design/performance-profile-card.md`
- `test/load-test-plan-template.md`

**Actions**:
1. Run performance profiling (CPU, memory, I/O, network)
2. Analyze application logs and traces (APM tools)
3. Execute load tests to identify breaking points
4. Identify top bottlenecks (queries, algorithms, I/O, external calls)

**Gate Criteria**:
- [ ] Performance profile captured (CPU, memory, I/O)
- [ ] APM traces analyzed for slow operations
- [ ] Load test executed to identify capacity limits
- [ ] Top 3-5 bottlenecks identified with evidence

### Step 3: Prioritize Optimization Opportunities
**Agents**: Performance Analyst (lead), Software Architect
**Templates Required**:
- `intake/option-matrix-template.md`

**Actions**:
1. Estimate impact of each optimization (latency reduction, throughput increase)
2. Estimate effort required for each optimization (dev time, risk)
3. Calculate ROI (impact / effort)
4. Prioritize optimizations by ROI and business impact

**Gate Criteria**:
- [ ] Each optimization scored on impact and effort
- [ ] ROI calculated for each optimization
- [ ] Top 3-5 optimizations prioritized
- [ ] Quick wins identified (high impact, low effort)

### Step 4: Implement Performance Optimizations
**Agents**: Component Owner (lead), Performance Analyst
**Templates Required**:
- `implementation/design-class-card.md`

**Actions**:
1. Implement optimization with measurable hypothesis
2. Add performance tests to validate improvement
3. Measure before/after metrics
4. Document optimization in code comments and ADR

**Gate Criteria**:
- [ ] Optimization implemented with before/after measurement
- [ ] Performance tests added to regression suite
- [ ] Code review completed with focus on correctness
- [ ] Optimization documented in ADR or commit message

### Step 5: Validate with Load Testing
**Agents**: Performance Analyst (lead), QA Engineer
**Templates Required**:
- `test/load-test-plan-template.md`
- `test/performance-test-card.md`

**Actions**:
1. Execute load tests with production-like traffic patterns
2. Measure performance metrics under load (latency, throughput, error rate)
3. Compare results to baseline and SLO targets
4. Identify any performance regressions

**Gate Criteria**:
- [ ] Load test executed with realistic traffic patterns
- [ ] Metrics meet SLO targets (p95 latency, throughput, error rate)
- [ ] No performance regressions detected
- [ ] System stable under sustained load

### Step 6: Monitor and Report Results
**Agents**: Reliability Engineer (lead), Project Manager
**Templates Required**:
- `deployment/sli-card.md`
- `management/performance-report-template.md`

**Actions**:
1. Deploy optimization to production
2. Monitor performance metrics in production
3. Validate SLO compliance over 7-14 days
4. Generate performance optimization report

**Gate Criteria**:
- [ ] Optimization deployed to production
- [ ] Production metrics monitored for at least 7 days
- [ ] SLOs met consistently
- [ ] Performance report generated with ROI analysis

## Performance Optimization Patterns

### Database Optimization

**Slow Queries**:
- Add indexes on frequently queried columns
- Optimize query structure (avoid N+1 queries)
- Use query caching for repeated queries
- Implement database connection pooling

**Expected Impact**: 50-90% latency reduction for query-bound operations

**Example**:
```sql
-- Before: Table scan on 1M rows
SELECT * FROM users WHERE email = 'user@example.com';

-- After: Index seek
CREATE INDEX idx_users_email ON users(email);
-- Result: 500ms → 5ms (100x improvement)
```

### Caching Strategies

**In-Memory Caching**:
- Cache frequently accessed data (Redis, Memcached)
- Set appropriate TTL based on data freshness requirements
- Implement cache invalidation strategy
- Use cache-aside or write-through patterns

**Expected Impact**: 80-95% latency reduction for cached operations

**Example**:
```python
# Before: Database query every request
user = db.query("SELECT * FROM users WHERE id = ?", user_id)

# After: Cache with 5-minute TTL
user = cache.get(f"user:{user_id}")
if not user:
    user = db.query("SELECT * FROM users WHERE id = ?", user_id)
    cache.set(f"user:{user_id}", user, ttl=300)
# Result: 50ms → 2ms (25x improvement)
```

### Algorithm Optimization

**Time Complexity Reduction**:
- Replace O(n²) with O(n log n) or O(n) algorithms
- Use appropriate data structures (hash maps vs lists)
- Implement early termination conditions
- Use lazy evaluation

**Expected Impact**: 10-1000x performance improvement depending on data size

**Example**:
```python
# Before: O(n²) nested loop
matches = []
for user in users:
    for item in items:
        if user.id == item.user_id:
            matches.append((user, item))

# After: O(n) hash map
user_map = {user.id: user for user in users}
matches = [(user_map[item.user_id], item) for item in items if item.user_id in user_map]
# Result: 1000ms → 10ms on 10K records (100x improvement)
```

### Asynchronous Processing

**Background Jobs**:
- Move slow operations to background jobs (email, reports)
- Use message queues (RabbitMQ, SQS, Kafka)
- Implement job retry and failure handling
- Provide status tracking for users

**Expected Impact**: 90-99% latency reduction for user-facing operations

**Example**:
```python
# Before: Synchronous email sending blocks request
def register_user(user):
    create_user(user)
    send_welcome_email(user)  # 2 seconds
    return "User registered"

# After: Asynchronous background job
def register_user(user):
    create_user(user)
    queue.enqueue(send_welcome_email, user)  # 10ms
    return "User registered"
# Result: 2000ms → 50ms (40x improvement)
```

### API Call Optimization

**Batching and Parallelization**:
- Batch multiple API calls into one request
- Execute independent API calls in parallel
- Implement request coalescing (deduplicate identical requests)
- Use HTTP/2 multiplexing

**Expected Impact**: 50-90% latency reduction for API-bound operations

**Example**:
```python
# Before: Sequential API calls
user = api.get_user(user_id)         # 100ms
orders = api.get_orders(user_id)     # 100ms
reviews = api.get_reviews(user_id)   # 100ms
# Total: 300ms

# After: Parallel API calls
results = await asyncio.gather(
    api.get_user(user_id),
    api.get_orders(user_id),
    api.get_reviews(user_id)
)
# Total: 100ms (3x improvement)
```

### Resource Pool Management

**Connection Pooling**:
- Reuse database connections (avoid connection overhead)
- Tune pool size based on load (not too small, not too large)
- Implement connection health checks
- Use connection timeout and retry logic

**Expected Impact**: 20-50% latency reduction by avoiding connection overhead

## Service Level Objectives (SLO) Framework

### Latency SLOs

**Definition**: Time to respond to user requests

**Measurement**:
- p50 (median): 50% of requests faster than X ms
- p95: 95% of requests faster than Y ms
- p99: 99% of requests faster than Z ms

**Example SLOs**:
- API endpoint: p95 < 200ms, p99 < 500ms
- Page load: p95 < 2s, p99 < 5s
- Background job: p95 < 30s, p99 < 60s

### Throughput SLOs

**Definition**: Number of requests handled per second

**Measurement**:
- Requests per second (RPS)
- Transactions per second (TPS)

**Example SLOs**:
- API endpoint: 1000 RPS sustained, 5000 RPS peak
- Database: 10,000 TPS sustained, 50,000 TPS peak

### Availability SLOs

**Definition**: Percentage of time service is operational

**Measurement**:
- Uptime percentage (99.9% = 43 minutes downtime/month)
- Error rate (% of requests resulting in errors)

**Example SLOs**:
- Critical service: 99.95% uptime (21 minutes downtime/month)
- Non-critical service: 99.5% uptime (3.6 hours downtime/month)

### Error Budget

**Definition**: Allowable failure rate before violating SLO

**Calculation**:
- 99.9% SLO = 0.1% error budget
- 1M requests/month = 1000 failed requests allowed

**Usage**:
- If error budget exhausted: STOP feature work, focus on reliability
- If error budget healthy: OK to take risks (new features, experiments)

## Load Testing Strategies

### Baseline Load Test
**Goal**: Establish normal performance under typical load

**Configuration**:
- Virtual users: Average concurrent users
- Duration: 15-30 minutes
- Ramp-up: Gradual increase to avoid cold start effects

### Stress Test
**Goal**: Identify breaking point and failure modes

**Configuration**:
- Virtual users: Increase until system fails
- Duration: Until failure or 2x peak capacity
- Monitor: Error rate, response time, resource utilization

### Soak Test
**Goal**: Validate stability under sustained load

**Configuration**:
- Virtual users: Average load
- Duration: 4-24 hours
- Monitor: Memory leaks, resource exhaustion, degradation over time

### Spike Test
**Goal**: Validate handling of sudden traffic spikes

**Configuration**:
- Virtual users: Sudden jump from low to high load
- Duration: 5-10 minute spike
- Monitor: Auto-scaling response, error rate during spike

### Capacity Planning Test
**Goal**: Forecast infrastructure needs for future growth

**Configuration**:
- Virtual users: Projected future load (3x, 5x, 10x)
- Duration: 30-60 minutes per scenario
- Monitor: Resource utilization, cost per transaction

## Performance Metrics to Track

### Application Metrics
- **Response Time**: p50, p95, p99 latency (milliseconds)
- **Throughput**: Requests per second (RPS)
- **Error Rate**: % of requests resulting in errors
- **Concurrency**: Concurrent requests being processed

### Infrastructure Metrics
- **CPU Utilization**: % CPU usage (target: <70% average)
- **Memory Utilization**: % memory usage (target: <80% average)
- **Disk I/O**: Read/write operations per second, latency
- **Network I/O**: Bandwidth usage, packet loss, latency

### Database Metrics
- **Query Time**: p95, p99 query latency
- **Connection Pool**: Active connections, wait time
- **Cache Hit Rate**: % of queries served from cache (target: >90%)
- **Lock Contention**: Waiting locks, deadlocks

### External Service Metrics
- **Third-Party API Latency**: Response time for external calls
- **Third-Party Error Rate**: % of external calls failing
- **Timeout Rate**: % of calls timing out

## Output Report

Generate a performance optimization summary:

```markdown
# Performance Optimization Report - {Component}

**Project**: {project-name}
**Component**: {component-name}
**Date**: {current-date}
**Trigger**: {optimization-trigger}
**Status**: {COMPLETE | IN_PROGRESS | BLOCKED}

## Optimization Overview

**Business Justification**: {why optimization needed}
**Optimization Timeline**: {start-date} to {end-date}

## Performance Baseline

### SLI Metrics (Before Optimization)
- **p50 Latency**: {value}ms
- **p95 Latency**: {value}ms
- **p99 Latency**: {value}ms
- **Throughput**: {value} RPS
- **Error Rate**: {percentage}%

### SLO Targets
- **p95 Latency Target**: <{value}ms
- **Throughput Target**: >{value} RPS
- **Error Rate Target**: <{percentage}%
- **Availability Target**: {percentage}%

### SLO Compliance (Before)
- p95 Latency: {PASS | FAIL} ({value}ms vs {target}ms)
- Throughput: {PASS | FAIL} ({value} vs {target} RPS)
- Error Rate: {PASS | FAIL} ({percentage}% vs {target}%)

## Bottleneck Analysis

### Identified Bottlenecks
1. **{bottleneck-name}**
   - Impact: {percentage}% of total latency
   - Root Cause: {description}
   - Evidence: {profiling data, traces, logs}

2. **{bottleneck-name}**
   - Impact: {percentage}% of total latency
   - Root Cause: {description}
   - Evidence: {profiling data, traces, logs}

3. **{bottleneck-name}**
   - Impact: {percentage}% of total latency
   - Root Cause: {description}
   - Evidence: {profiling data, traces, logs}

## Optimizations Implemented

### Optimization 1: {optimization-title}
- **Type**: {database | caching | algorithm | async | API}
- **Effort**: {Low | Medium | High}
- **Estimated Impact**: {latency reduction | throughput increase}
- **Implementation**: {brief description}

**Hypothesis**: If we {action}, then we expect {measurable outcome}

**Results**:
- Before: {metric} = {value}
- After: {metric} = {value}
- Improvement: {percentage}% or {multiplier}x

**Status**: {IMPLEMENTED | IN_PROGRESS | REJECTED}

### Optimization 2: {optimization-title}
{repeat structure for each optimization}

## Load Test Results

### Baseline Load Test
- **Virtual Users**: {count}
- **Duration**: {minutes}
- **RPS**: {value}
- **p95 Latency**: {value}ms
- **Error Rate**: {percentage}%
- **Status**: {PASS | FAIL}

### Stress Test
- **Breaking Point**: {count} virtual users or {value} RPS
- **Failure Mode**: {description}
- **Resource Bottleneck**: {CPU | Memory | Database | Network}

### Soak Test
- **Duration**: {hours}
- **Memory Leak Detected**: {YES | NO}
- **Performance Degradation**: {percentage}% over time
- **Status**: {PASS | FAIL}

## Performance Improvements

### SLI Metrics (After Optimization)
- **p50 Latency**: {value}ms (baseline: {value}ms, improvement: {percentage}%)
- **p95 Latency**: {value}ms (baseline: {value}ms, improvement: {percentage}%)
- **p99 Latency**: {value}ms (baseline: {value}ms, improvement: {percentage}%)
- **Throughput**: {value} RPS (baseline: {value} RPS, improvement: {percentage}%)
- **Error Rate**: {percentage}% (baseline: {percentage}%, improvement: {percentage}%)

### SLO Compliance (After)
- p95 Latency: {PASS | FAIL} ({value}ms vs {target}ms)
- Throughput: {PASS | FAIL} ({value} vs {target} RPS)
- Error Rate: {PASS | FAIL} ({percentage}% vs {target}%)

### ROI Analysis
- **Development Effort**: {hours} or {days}
- **Infrastructure Cost Savings**: ${value}/month
- **User Experience Improvement**: {metric improvement}
- **Business Impact**: {revenue increase, churn reduction, etc.}

## Production Monitoring

**Monitoring Period**: {start-date} to {end-date} ({days} days)

**Metrics Stability**:
- [ ] p95 latency within ±10% of target
- [ ] No performance regressions detected
- [ ] Error rate stable
- [ ] No new production incidents

## Lessons Learned

**What Worked Well**:
{list successful optimization strategies}

**What Didn't Work**:
{list failed optimization attempts and why}

**Recommendations**:
{recommendations for future optimization work}

## Next Steps

1. {Step 1}
2. {Step 2}
3. {Step 3}

**Next Optimization Target**: {component or bottleneck}
**Next Review Date**: {date}
```

## Integration with Other Flows

### With Gate Checks
- Performance SLO compliance is gate criterion
- Load test results reviewed at phase gates
- Performance degradation blocks release

### With Architecture Evolution
- Performance optimization may trigger architecture changes
- Performance results inform architecture decisions
- ADRs created for significant optimizations

### With Monitoring
- Performance metrics continuously monitored in production
- SLO violations trigger optimization flow
- Error budget tracking informs risk-taking

## Common Failure Modes

### Premature Optimization
**Symptoms**: Optimizing before identifying real bottleneck

**Remediation**:
1. Always profile first before optimizing
2. Measure before/after to validate improvement
3. Focus on top 3 bottlenecks (80/20 rule)
4. Don't sacrifice readability for micro-optimizations

### Optimization Without Measurement
**Symptoms**: Can't prove optimization worked, no baseline

**Remediation**:
1. Establish baseline before optimization
2. Add performance tests to regression suite
3. Monitor metrics before and after deployment
4. Validate improvement with load tests

### Load Test Doesn't Match Production
**Symptoms**: Performance good in test, bad in production

**Remediation**:
1. Use production-like data volumes
2. Replicate production traffic patterns
3. Test with production-like infrastructure
4. Include realistic third-party API latency

### Optimizing the Wrong Metric
**Symptoms**: Optimized latency but users care about throughput

**Remediation**:
1. Identify user-facing metrics (Core Web Vitals, business KPIs)
2. Align SLOs with business objectives
3. Validate optimization impact with user feedback
4. Monitor business metrics, not just technical metrics

## Success Criteria

This command succeeds when:
- [ ] Performance baseline established with SLOs
- [ ] Bottlenecks identified through profiling
- [ ] Optimizations implemented and measured
- [ ] Load tests validate improvement
- [ ] SLOs met consistently in production
- [ ] Performance report generated with ROI analysis

## Error Handling

**SLO Breach**:
- Report: "SLO breached: {metric} {value} exceeds target {target}"
- Action: "Identify bottleneck and implement optimization"
- Escalation: "If error budget exhausted, STOP feature work"

**Load Test Failure**:
- Report: "Load test failed: {failure-mode}"
- Action: "Identify breaking point and optimize bottleneck"
- Recommendation: "Do not proceed to production"

**Performance Regression**:
- Report: "Performance regression detected: {metric} degraded by {percentage}%"
- Action: "Rollback change and investigate root cause"
- Command: "/project:troubleshooting-guide performance-regression"

**Optimization Not Effective**:
- Report: "Optimization did not improve {metric} as expected"
- Action: "Re-profile to identify actual bottleneck"
- Recommendation: "Document failed optimization as lesson learned"

## References

- Performance templates: `deployment/sli-card.md`, `deployment/slo-card.md`
- Load testing: `test/load-test-plan-template.md`, `test/performance-test-card.md`
- Profiling: `analysis-design/performance-profile-card.md`
- Site Reliability Engineering book by Google (external reference)
