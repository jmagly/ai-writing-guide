# Automated Quality Gate Template

## Purpose

Define measurable quality criteria that must be met before code, infrastructure, or deployments progress to the next stage. Quality gates enforce standards automatically, blocking progression when criteria are not met. This template specifies WHAT to measure and WHEN to enforce gates, independent of specific automation tools.

## Ownership & Collaboration

- **Document Owner**: Test Architect
- **Contributor Roles**: DevOps Engineer, Security Architect, Reliability Engineer, Project Manager
- **Automation Inputs**: Test Strategy, Security Requirements, SLO/SLI Definitions, Performance Baselines
- **Automation Outputs**: `quality-gates.md` and tool-specific gate enforcement configurations

## Completion Checklist

- [ ] Gate criteria are measurable and objective
- [ ] Thresholds are realistic and validated
- [ ] Failure actions and escalations defined
- [ ] Override/waiver process documented
- [ ] Gate effectiveness tracked and reviewed

## Document Sections

### 1. Gate Definition

Quality gates are decision points in the pipeline. Each gate evaluates specific criteria and decides whether to allow progression.

**Gate ID**: GATE-{PHASE}-{ID}

**Gate Name**: [Descriptive name, e.g., "Unit Test Pass Rate Gate"]

**Gate Purpose**: [One-sentence description of what this gate protects]

**Phase**: [Where in the pipeline this gate applies]

- [ ] Build
- [ ] Test
- [ ] Security Scan
- [ ] Performance Test
- [ ] Pre-Deployment
- [ ] Post-Deployment
- [ ] Environment Promotion

**Gate Type**:

- [ ] Blocking (fails pipeline if criteria not met)
- [ ] Warning (logs warning but allows progression)
- [ ] Advisory (informational only, no action)

**Enforcement Timing**:

- [ ] Before stage starts (entry gate)
- [ ] After stage completes (exit gate)
- [ ] During stage execution (real-time monitoring)

### 2. Entry Conditions

Define prerequisites that must be satisfied before gate evaluation can begin.

**Required Artifacts**:

- Build artifacts available
- Test results published
- Security scan reports generated
- Performance metrics collected

**Environmental Readiness**:

- Test environment healthy
- Dependencies available
- Configuration valid

**Data Availability**:

- Metrics collected from monitoring system
- Logs aggregated and searchable
- Baseline data available for comparison

### 3. Evaluation Criteria

Define the specific metrics, thresholds, and measurement methods for this gate.

#### 3.1 Criteria Definition

| Metric Name | Threshold | Operator | Measurement Method | Data Source |
|-------------|-----------|----------|-------------------|-------------|
| Unit Test Pass Rate | 95% | >= | (Passed Tests / Total Tests) * 100 | Test runner report |
| Code Coverage (Line) | 80% | >= | (Covered Lines / Total Lines) * 100 | Coverage tool |
| Code Coverage (Branch) | 70% | >= | (Covered Branches / Total Branches) * 100 | Coverage tool |
| Critical Vulnerabilities | 0 | = | Count of CVE severity CRITICAL | Security scanner |
| High Vulnerabilities | 5 | <= | Count of CVE severity HIGH | Security scanner |
| Build Time | 15 minutes | <= | Pipeline stage duration | CI/CD system |
| Linting Errors | 0 | = | Count of linting errors | Linter output |
| Linting Warnings | 10 | <= | Count of linting warnings | Linter output |

#### 3.2 Composite Criteria

Some gates require multiple conditions to ALL be true:

**Gate: Pre-Deployment Health Check**

ALL of the following must be true:

- Service health endpoint returns HTTP 200
- Error rate < 1% over last 10 minutes
- CPU usage < 80% over last 10 minutes
- Memory usage < 85% over last 10 minutes
- Database connections < 80% of max connections

**Boolean Logic**: (health=200) AND (error_rate < 0.01) AND (cpu < 0.80) AND (memory < 0.85) AND (db_connections < 0.80)

#### 3.3 Trend-Based Criteria

Some gates evaluate trends, not absolute values:

**Gate: Performance Regression**

- API response time (p95) <= baseline + 15%
- Memory usage <= baseline + 10%
- Database query time <= baseline + 20%

**Baseline Source**: [7-day rolling average, last stable release, manual baseline]

**Baseline Update Frequency**: [weekly, per release, manual]

### 4. Gate Evaluation Process

#### 4.1 Evaluation Trigger

**When is gate evaluated?**

- [ ] Automatically at end of stage
- [ ] Manually triggered
- [ ] Scheduled evaluation
- [ ] On-demand via API/webhook

**Evaluation Frequency**:

- One-time evaluation: [Yes/No]
- Continuous monitoring: [Yes/No, duration]
- Polling interval: [e.g., every 30 seconds for 5 minutes]

#### 4.2 Evaluation Logic

**Single Criterion**:

```text
IF (actual_value OPERATOR threshold) THEN PASS ELSE FAIL
Example: IF (test_pass_rate >= 95%) THEN PASS ELSE FAIL
```

**Multiple Criteria (AND)**:

```text
IF (criterion1 AND criterion2 AND criterion3) THEN PASS ELSE FAIL
```

**Multiple Criteria (OR)**:

```text
IF (criterion1 OR criterion2) THEN PASS ELSE FAIL
```

**Weighted Scoring** (advanced):

```text
Score = (metric1_weight * metric1_score) + (metric2_weight * metric2_score) + ...
IF (Score >= threshold) THEN PASS ELSE FAIL
```

#### 4.3 Evaluation Timeout

**Maximum Evaluation Time**: [e.g., 5 minutes]

**Timeout Action**:

- [ ] Fail gate (treat as failure)
- [ ] Pass gate (treat as success)
- [ ] Retry evaluation (up to N times)
- [ ] Escalate to manual review

### 5. Failure Actions

Define what happens when gate criteria are NOT met.

#### 5.1 Immediate Actions

**Pipeline Behavior**:

- [ ] Stop pipeline execution immediately
- [ ] Complete current stage, then stop
- [ ] Continue with warning flag
- [ ] Skip deployment, continue with tests

**Artifact Handling**:

- [ ] Do not publish artifacts
- [ ] Publish artifacts with "unstable" tag
- [ ] Quarantine artifacts for review
- [ ] Delete artifacts

#### 5.2 Notifications

**Notification Recipients**:

- Developers who committed code
- Team Slack channel
- DevOps on-call
- Security team (for security gate failures)

**Notification Content**:

- Gate name and ID
- Which criteria failed
- Actual vs. expected values
- Link to detailed report
- Suggested remediation steps

**Notification Urgency**:

- [ ] Immediate (push notification, page)
- [ ] High priority (email, Slack mention)
- [ ] Normal priority (email, Slack message)
- [ ] Low priority (daily digest)

#### 5.3 Reporting

**Failure Report Contents**:

- Gate execution timestamp
- Criteria evaluated
- Actual values vs. thresholds
- Historical trend (last 10 executions)
- Root cause analysis hints (if available)
- Remediation suggestions

**Report Storage**:

- [ ] CI/CD system artifacts
- [ ] Centralized quality dashboard
- [ ] Log aggregation system
- [ ] Issue tracking system

**Report Retention**: [30 days, 90 days, 1 year]

#### 5.4 Escalation

**Escalation Trigger**:

- Gate failure not resolved within: [1 hour, 4 hours, 24 hours]
- Gate failure recurring: [3+ failures in 24 hours]
- Critical gate failure: [immediate escalation]

**Escalation Path**:

1. Developers (immediate notification)
2. Team Lead (if not resolved in 1 hour)
3. Engineering Manager (if recurring failures)
4. Director of Engineering (if blocking production release)

### 6. Override and Waivers

Sometimes gates must be bypassed. Define when and how this is allowed.

#### 6.1 Override Conditions

**When can override be requested?**

- [ ] Emergency production hotfix
- [ ] Time-sensitive release (with risk acceptance)
- [ ] False positive in gate criteria
- [ ] External dependency failure (not our fault)
- [ ] Planned degradation (known issue with workaround)

#### 6.2 Override Authority

**Who can approve override?**

| Gate Type | Approval Required | Approval Level |
|-----------|-------------------|----------------|
| Build gate | 1 approval | Senior Developer |
| Test gate | 1 approval | Tech Lead |
| Security gate | 2 approvals | Security Architect + Engineering Manager |
| Production gate | 3 approvals | VP Engineering + Security + Operations |

#### 6.3 Override Process

**Override Request**:

1. Developer submits override request with justification
2. Request routed to appropriate approver(s)
3. Approver reviews criteria, justification, risk assessment
4. Approver grants/denies override with documented rationale
5. If granted, pipeline continues with override flag

**Override Documentation**:

- Override reason (detailed justification)
- Risk assessment (what could go wrong)
- Mitigation plan (how to handle if issues arise)
- Remediation plan (how to fix underlying issue)
- Expiration date (temporary override expires after X days)

**Override Audit Trail**:

- All overrides logged to audit system
- Override approval chain preserved
- Override usage tracked and reviewed quarterly

#### 6.4 Temporary Waivers

**Waiver vs. Override**:

- Override: One-time bypass for specific pipeline execution
- Waiver: Temporary exemption for a specific gate for a defined period

**Waiver Use Cases**:

- Known issue in gate logic (being fixed)
- External dependency unreliable (temporary)
- Technical debt (legacy code cannot meet criteria yet)

**Waiver Expiration**:

- All waivers must have expiration date
- Waiver automatically expires after: [30 days, 90 days]
- Waiver extension requires re-approval

**Waiver Review**:

- Monthly review of active waivers
- Justification for extension
- Plan to eliminate need for waiver

### 7. Success Actions

Define what happens when gate criteria ARE met.

**Pipeline Behavior**:

- [ ] Continue to next stage
- [ ] Auto-deploy to next environment
- [ ] Publish artifacts to registry
- [ ] Update status in source control

**Notifications**:

- [ ] No notification (only notify on failure)
- [ ] Success notification to team channel
- [ ] Success badge on pull request
- [ ] Update quality dashboard

**Artifact Tagging**:

- [ ] Tag artifacts as "gate-passed"
- [ ] Add gate execution metadata to artifact
- [ ] Promote artifact to next environment registry

### 8. Gate Metrics and Reporting

Track gate effectiveness and optimize over time.

#### 8.1 Gate Performance Metrics

**Metrics to Track**:

- Gate pass rate: [% of executions that passed]
- Gate failure rate: [% of executions that failed]
- False positive rate: [% of failures that were overridden]
- Gate execution duration: [time to evaluate criteria]
- Override frequency: [how often gate is bypassed]

**Metrics Collection**:

- Real-time metrics: [updated on every gate execution]
- Historical metrics: [retain 90 days of execution data]
- Trend analysis: [identify patterns, degradation]

#### 8.2 Gate Health Dashboard

**Dashboard Views**:

- Current gate status: [all gates, current status]
- Historical pass/fail trends: [line chart over 30 days]
- Gate execution duration: [average, p95, p99]
- Override frequency: [count per gate, per week]
- Top failing gates: [most frequent failures]

**Dashboard Audience**:

- Developers: [understand quality trends]
- Managers: [assess team quality practices]
- Executives: [high-level quality metrics]

#### 8.3 Gate Effectiveness Review

**Review Frequency**: [monthly, quarterly]

**Review Questions**:

- Is gate catching real issues?
- Are thresholds too strict/lenient?
- Are there excessive false positives?
- Are overrides too frequent?
- Should criteria be adjusted?

**Review Outcomes**:

- Adjust thresholds: [increase/decrease based on data]
- Add new criteria: [if gaps identified]
- Remove criteria: [if not adding value]
- Improve gate logic: [reduce false positives]

### 9. Gate Integration Points

#### 9.1 Integration with CI/CD Pipeline

**Pipeline Integration**:

- Gates defined in pipeline configuration
- Gate results control pipeline flow
- Gate failures stop pipeline progression
- Gate metrics published to dashboard

**Tool-Specific Notes**:

- GitHub Actions: [branch protection rules, required status checks]
- GitLab CI: [pipeline rules, manual approval gates]
- Jenkins: [quality gates plugin, pipeline stage gates]
- Azure DevOps: [gate conditions, pre-deployment approvals]

#### 9.2 Integration with Source Control

**Source Control Integration**:

- Gate status reported to pull requests
- Failed gates block merge
- Gate results visible in commit status
- Gate history linked to commits

#### 9.3 Integration with Quality Tools

**Test Frameworks**:

- Unit test results: [JUnit XML, TAP]
- Integration test results: [test runner reports]
- Coverage reports: [Cobertura, LCOV]

**Security Scanners**:

- SAST results: [SARIF, JSON]
- Dependency scanners: [vulnerability reports]
- Container scanners: [image scan results]

**Performance Tools**:

- Load test results: [JMeter, k6 reports]
- APM metrics: [response times, error rates]
- Resource metrics: [CPU, memory, network]

#### 9.4 Integration with Monitoring Systems

**Real-Time Monitoring**:

- Gate evaluation triggers: [based on metrics]
- Gate criteria: [pulled from monitoring system]
- Gate results: [sent back to monitoring system]

**Alerting Integration**:

- Gate failures trigger alerts
- Alert routing based on gate severity
- Alert suppression during maintenance

## Example Quality Gates

### Gate: Build Success Gate

- **Gate ID**: GATE-BUILD-001
- **Phase**: Build
- **Type**: Blocking
- **Criteria**:
  - Compilation exit code = 0
  - Zero compilation errors
  - Linting errors = 0
  - Linting warnings <= 10
- **Failure Action**: Stop pipeline, notify developers
- **Override**: Allowed by Senior Developer (only for linting warnings)

### Gate: Unit Test Quality Gate

- **Gate ID**: GATE-TEST-001
- **Phase**: Test
- **Type**: Blocking
- **Criteria**:
  - Unit test pass rate >= 95%
  - Zero failed tests in critical modules
  - Line coverage >= 80%
  - Branch coverage >= 70%
  - Test execution time <= baseline + 20%
- **Failure Action**: Stop pipeline, publish test report, notify developers
- **Override**: Allowed by Tech Lead (for coverage only, not for failed tests)

### Gate: Security Vulnerability Gate

- **Gate ID**: GATE-SEC-001
- **Phase**: Security Scan
- **Type**: Blocking
- **Criteria**:
  - Critical vulnerabilities = 0
  - High vulnerabilities <= 5
  - No secrets detected in code
  - License compliance = PASS
- **Failure Action**: Stop pipeline, escalate to security team
- **Override**: Allowed by Security Architect + Engineering Manager (for high vulns only)

### Gate: Performance Regression Gate

- **Gate ID**: GATE-PERF-001
- **Phase**: Test
- **Type**: Warning (non-blocking)
- **Criteria**:
  - API response time (p95) <= baseline + 15%
  - Memory usage <= baseline + 10%
  - Database query time <= baseline + 20%
- **Failure Action**: Warn, publish performance report, continue pipeline
- **Override**: Not applicable (non-blocking)

### Gate: Pre-Deployment Health Gate

- **Gate ID**: GATE-DEPLOY-001
- **Phase**: Pre-Deployment
- **Type**: Blocking
- **Criteria**:
  - Target environment health check = OK
  - Error rate < 1% over last 10 minutes
  - CPU usage < 80%
  - Memory usage < 85%
  - Database connections < 80% of max
- **Failure Action**: Block deployment, alert on-call engineer
- **Override**: Allowed by Operations Manager

### Gate: Post-Deployment Validation Gate

- **Gate ID**: GATE-DEPLOY-002
- **Phase**: Post-Deployment
- **Type**: Blocking (triggers rollback)
- **Criteria**:
  - All health endpoints return 200 OK
  - Error rate <= 1% for first 5 minutes
  - Response time <= baseline + 20%
  - No restart loops detected
- **Failure Action**: Trigger automatic rollback, alert on-call
- **Override**: Not allowed (safety-critical)

### Gate: Environment Promotion Gate

- **Gate ID**: GATE-PROMOTE-001
- **Phase**: Environment Promotion (dev → staging)
- **Type**: Blocking
- **Criteria**:
  - All quality gates passed in source environment
  - Security scan completed < 24 hours ago
  - No critical bugs open
  - Smoke tests passed
  - Stakeholder approval obtained
- **Failure Action**: Block promotion, notify project manager
- **Override**: Allowed by VP Engineering

## Validation Checklist

Before considering these quality gates complete:

- [ ] All gate criteria are measurable and objective (no subjective criteria)
- [ ] Thresholds are validated against historical data (not arbitrary)
- [ ] Failure actions are appropriate for gate severity
- [ ] Override process is documented and enforced
- [ ] Gate metrics are tracked and reviewed regularly
- [ ] Integration with CI/CD, source control, and monitoring systems defined

## Related Templates

- ci-cd-pipeline-template.md (gates are enforced in pipeline stages)
- test-strategy-template.md (defines tests that feed into test gates)
- security-requirements-template.md (defines security criteria for security gates)
- slo-sli-template.md (defines SLIs used in deployment gates)
- deployment-pipeline-template.md (gates control deployment progression)
- infrastructure-definition-template.md (infrastructure gates before provisioning)

## Agent Notes

This template is tool-agnostic by design. When implementing:

- Translate gate criteria into tool-specific syntax (Jenkins quality gates, GitHub branch protection, GitLab rules)
- Map failure actions to tool-specific behaviors (pipeline stop, status checks, approval requirements)
- Implement notification routing using available channels (Slack, email, PagerDuty)
- Use native metrics collection and alerting where possible

Focus on the WHAT (gate criteria) and WHEN (enforcement timing), not the HOW (tool-specific implementation).

Quality gates are the enforcement mechanism that makes your quality standards real. Without gates, standards are just suggestions.
