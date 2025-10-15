# CI/CD Pipeline Template

## Purpose

Define the continuous integration and continuous deployment pipeline structure, stages, quality gates, and automation requirements for the project. This template specifies WHAT the pipeline must accomplish and WHICH patterns to follow, independent of implementation tools.

## Ownership & Collaboration

- **Document Owner**: DevOps Engineer
- **Contributor Roles**: Build Engineer, Test Architect, Security Architect, Deployment Manager
- **Automation Inputs**: Software Architecture, Integration Build Plan, Test Strategy, Security Requirements
- **Automation Outputs**: `cicd-pipeline.md` and tool-specific pipeline configurations

## Completion Checklist

- [ ] Pipeline stages and dependencies clearly defined
- [ ] Quality gate criteria specified with measurable thresholds
- [ ] Artifact management strategy documented
- [ ] Rollback mechanisms defined
- [ ] Notification and escalation paths established
- [ ] Integration with test and security templates validated

## Document Sections

### 1. Pipeline Overview

**Pipeline Purpose**: [Brief description of what this pipeline automates]

**Pipeline Type**:

- [ ] CI Only (build and test, no deployment)
- [ ] CI + CD (build, test, and deploy)
- [ ] GitOps (declarative sync to desired state)

**Trigger Strategy**:

- [ ] Code push to branches
- [ ] Pull request validation
- [ ] Scheduled builds
- [ ] Manual execution
- [ ] External event triggers
- [ ] Dependency updates

**Target Environments**:

- [ ] Development
- [ ] Staging
- [ ] Production
- [ ] Other: _________________

**Pipeline Execution Model**:

- Sequential stages (wait for each to complete)
- Parallel execution where possible
- Conditional execution based on triggers
- Fan-out/fan-in patterns

### 2. Pipeline Stages Definition

Define the logical stages of the pipeline. Each stage represents a phase of work with clear entry/exit criteria.

#### Stage: Source Preparation

**Purpose**: Prepare source code and dependencies for build

**Entry Conditions**:

- Valid trigger event received
- Repository accessible
- Build credentials available

**Activities**:

- Checkout source code at specific revision
- Resolve and cache dependencies
- Validate workspace cleanliness
- Apply configuration from version control

**Exit Criteria**:

- Source code retrieved successfully
- Dependencies resolved without conflicts
- Workspace prepared for build

**Timeout**: [e.g., 5 minutes]

#### Stage: Build

**Purpose**: Compile, package, and prepare artifacts

**Entry Conditions**:

- Source preparation completed
- Build tools available
- Compilation environment configured

**Activities**:

- Compile source code
- Run static analysis and linting
- Package artifacts (binaries, containers, libraries)
- Generate artifact metadata (version, commit hash, timestamp)
- Tag artifacts with semantic versioning

**Exit Criteria**:

- All compilation successful (zero errors)
- Artifacts generated and validated
- Artifact signatures created
- Build metadata captured

**Timeout**: [e.g., 15 minutes]

**Artifacts Produced**:

- Compiled binaries
- Container images
- Library packages
- Build logs and reports

#### Stage: Test

**Purpose**: Execute automated tests to validate functionality and quality

**Entry Conditions**:

- Build stage completed successfully
- Test artifacts available
- Test environment ready

**Activities**:

- Execute unit tests (fast, isolated)
- Execute integration tests (component interactions)
- Execute end-to-end tests (full system behavior)
- Measure code coverage
- Generate test reports

**Exit Criteria**:

- Test pass rate meets threshold (e.g., ≥95%)
- Code coverage meets threshold (e.g., ≥80%)
- No critical test failures
- Test results published

**Timeout**: [e.g., 30 minutes]

**Quality Gates**: See Section 3

#### Stage: Security Scan

**Purpose**: Identify security vulnerabilities before deployment

**Entry Conditions**:

- Build and test stages completed
- Artifacts available for scanning

**Activities**:

- Static Application Security Testing (SAST) on source code
- Dependency vulnerability scanning (CVE database checks)
- Container image scanning (if applicable)
- Secret detection in code and configuration
- License compliance validation

**Exit Criteria**:

- Zero critical vulnerabilities detected
- High-severity vulnerabilities below threshold (e.g., ≤5)
- No secrets detected in artifacts
- License compliance verified

**Timeout**: [e.g., 10 minutes]

**Quality Gates**: See Section 3

#### Stage: Deploy (Per Environment)

**Purpose**: Deploy artifacts to target environment

**Entry Conditions**:

- All quality gates passed
- Target environment healthy
- Deployment window active (if applicable)
- Required approvals obtained

**Activities**:

- Pre-deployment validation (environment health check)
- Artifact promotion to target environment
- Configuration application (environment-specific settings)
- Database migrations (if applicable)
- Service/application restart or rolling update
- Post-deployment verification (smoke tests)

**Exit Criteria**:

- Deployment completed without errors
- Health checks passing
- Smoke tests successful
- Service endpoints responding
- Metrics within acceptable ranges

**Timeout**: [e.g., 20 minutes]

**Rollback Triggers**: See Section 4

### 3. Quality Gates

Quality gates enforce measurable criteria at each stage. Gates can be blocking (fail the pipeline) or non-blocking (warn only).

#### Gate: Build Success

**Stage**: Build
**Type**: Blocking
**Criteria**:

- Compilation exit code = 0 (success)
- Zero compilation errors
- Linting warnings below threshold (e.g., <10)

**Failure Action**: Stop pipeline, notify developers

#### Gate: Unit Test Pass Rate

**Stage**: Test
**Type**: Blocking
**Criteria**:

- Unit test pass rate ≥ 95%
- Zero failed tests in critical modules
- Test execution time < baseline + 20%

**Failure Action**: Stop pipeline, publish test report, notify developers

#### Gate: Code Coverage

**Stage**: Test
**Type**: Non-blocking (warning)
**Criteria**:

- Line coverage ≥ 80%
- Branch coverage ≥ 70%
- New code coverage ≥ 90%

**Failure Action**: Warn, publish coverage report, continue pipeline

#### Gate: Security Vulnerabilities

**Stage**: Security Scan
**Type**: Blocking
**Criteria**:

- Critical vulnerabilities = 0
- High vulnerabilities ≤ 5
- Medium vulnerabilities ≤ 20
- No secrets detected in artifacts

**Failure Action**: Stop pipeline, generate security report, escalate to security team

#### Gate: Performance Regression

**Stage**: Test
**Type**: Non-blocking (warning)
**Criteria**:

- API response time ≤ baseline + 15%
- Memory usage ≤ baseline + 10%
- Database query time ≤ baseline + 20%

**Failure Action**: Warn, publish performance report, continue pipeline

#### Gate: Deployment Health Check

**Stage**: Deploy
**Type**: Blocking
**Criteria**:

- All service health endpoints return 200 OK
- Error rate ≤ 1% in first 5 minutes
- CPU/memory within operating thresholds
- No restart loops detected

**Failure Action**: Trigger automatic rollback, alert on-call engineer

### 4. Artifact Management

**Artifact Naming Convention**:

```text
{artifact-name}-{version}-{commit-hash}-{timestamp}
Example: api-server-1.2.3-a7f3c8d-20251015143022
```

**Artifact Storage**:

- Build artifacts: Store in artifact registry (container registry, package repository)
- Test reports: Store in test result system
- Security scan reports: Store in security dashboard
- Build logs: Store in log aggregation system

**Artifact Retention Policy**:

- Development builds: 7 days
- Staging builds: 30 days
- Production builds: 365 days (or regulatory requirement)
- Tagged releases: Indefinite

**Artifact Promotion**:

Artifacts are immutable. Promote the same artifact across environments:

```text
dev-registry → staging-registry → prod-registry
```

**Artifact Validation**:

- Checksum verification before deployment
- Signature validation (if signing enabled)
- Metadata verification (version, commit hash)

### 5. Rollback Strategy

**Automatic Rollback Triggers**:

- Health check failures post-deployment
- Error rate exceeds threshold (e.g., >5%)
- Response time degradation (e.g., >50% increase)
- Critical service dependency failures

**Manual Rollback Conditions**:

- Business-critical bug discovered
- Data integrity issues detected
- Compliance violation identified

**Rollback Mechanism**:

1. Detect failure condition
2. Halt forward deployment
3. Revert to previous stable artifact version
4. Execute rollback-specific database migrations (if applicable)
5. Validate rollback success via health checks
6. Notify stakeholders of rollback event

**Rollback Validation**:

- All health checks passing
- Error rate returns to baseline
- Service endpoints responding normally
- No recurring failures detected

**Rollback Time Objective**: ≤ 5 minutes from trigger to validation

### 6. Notification and Observability

**Success Notifications**:

- Developers: Successful pipeline completion
- Operations team: Production deployment success
- Stakeholders: Release deployment confirmation

**Failure Notifications**:

- Developers: Build/test failures (immediate)
- Security team: Security scan failures (immediate)
- Operations team: Deployment failures (immediate)
- On-call engineer: Production incidents (immediate, high-priority channel)

**Escalation Path**:

1. Automatic notification to developers (first 5 minutes)
2. Escalate to team lead (if not resolved in 15 minutes)
3. Escalate to on-call engineer (if production impact)
4. Escalate to engineering manager (if service outage)

**Pipeline Metrics to Track**:

- Build duration per stage
- Test pass rate over time
- Deployment frequency
- Lead time (commit to production)
- Change failure rate
- Mean time to recovery (MTTR)
- Artifact size trends

**Dashboard Requirements**:

- Real-time pipeline status visualization
- Historical trends for key metrics
- Quality gate pass/fail rates
- Deployment success rate per environment
- Rollback frequency

### 7. Configuration Management

**Environment-Specific Configuration**:

Configuration is externalized from artifacts. Each environment has its own configuration:

```text
config/
  dev/
    app-config.yaml
    secrets-reference.yaml
  staging/
    app-config.yaml
    secrets-reference.yaml
  prod/
    app-config.yaml
    secrets-reference.yaml
```

**Configuration Sources**:

- Version-controlled configuration files
- Environment variables
- Secrets management system (never hardcoded)
- Feature flag service

**Configuration Validation**:

- Schema validation before deployment
- Required fields presence check
- Secrets availability verification
- Configuration drift detection

**Secrets Management Integration**:

- Secrets stored in dedicated secrets management system
- Secrets injected at deployment time (never stored in artifacts)
- Secrets rotation coordinated with deployments
- Secrets access audited and logged

### 8. Pipeline Infrastructure Requirements

**Execution Environment**:

- Compute resources: [CPU, memory, disk requirements per stage]
- Network access: [required external services, APIs, registries]
- Credentials: [required service accounts, API keys]
- Tool dependencies: [compilers, test frameworks, scanners]

**Concurrency**:

- Maximum concurrent pipeline executions: [e.g., 5]
- Branch-specific concurrency: [e.g., 1 per feature branch, unlimited on main]
- Resource contention handling: [queue, fail fast, throttle]

**Caching Strategy**:

- Dependency cache: Persist between builds (invalidate on manifest change)
- Build cache: Reuse intermediate artifacts when source unchanged
- Test cache: Skip tests for unchanged modules (if safe)
- Cache eviction policy: LRU, 7-day retention

**Workspace Cleanup**:

- Clean workspace before build: Yes/No
- Clean workspace after build: Yes/No
- Retain artifacts: As per retention policy (Section 4)

### 9. Integration Points

**Source Control Integration**:

- Trigger on: [commits, tags, pull requests]
- Status updates: Report pipeline status back to source control
- Branch protection: Require pipeline success before merge

**Test Framework Integration**:

- Unit test framework: [Reference test-strategy-template.md]
- Integration test framework: [Reference integration-test-plan-template.md]
- Test result format: [JUnit XML, TAP, custom]

**Security Tool Integration**:

- SAST tool: [Reference security-requirements-template.md]
- Dependency scanner: [Reference dependency-management approach]
- Container scanner: [If containerized]

**Deployment Target Integration**:

- Deployment mechanism: [Reference deployment-pipeline-template.md]
- Environment definitions: [Reference environment-definition-template.md]
- Infrastructure provisioning: [Reference infrastructure-definition-template.md]

**Monitoring Integration**:

- Metrics collection: [Reference slo-sli-template.md]
- Log aggregation: [Reference observability approach]
- Alerting system: [Reference incident-response-plan-template.md]

## Validation Checklist

Before considering this template complete:

- [ ] All stages have clear entry/exit criteria
- [ ] Quality gates have measurable thresholds
- [ ] Rollback mechanisms are automated and tested
- [ ] Notification paths cover all failure scenarios
- [ ] Artifact management handles all lifecycle stages
- [ ] Configuration management keeps secrets secure
- [ ] Pipeline infrastructure requirements are feasible
- [ ] Integration points with other templates are documented

## Related Templates

- integration-build-plan-template.md (high-level build strategy)
- test-strategy-template.md (defines what tests to run)
- deployment-pipeline-template.md (deployment-specific automation)
- automated-quality-gate-template.md (detailed gate definitions)
- infrastructure-definition-template.md (where deployments run)
- security-requirements-template.md (security gate criteria)

## Agent Notes

This template is tool-agnostic by design. When implementing:

- Translate stages into tool-specific syntax (GitHub Actions, GitLab CI, Jenkins)
- Map quality gates to tool-specific enforcement mechanisms
- Adapt artifact management to available registries
- Implement notifications using available channels
- Use native caching and concurrency features where possible

Focus on the WHAT (pipeline requirements) and WHICH (patterns like quality gates, rollback), not the HOW (tool-specific implementation).
