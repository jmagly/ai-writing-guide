# Deployment Environment Template

## Purpose

Define the characteristics, configuration, and operational requirements for a specific deployment environment (development, staging, production, etc.). This template specifies WHAT distinguishes each environment and WHICH patterns to follow for environment parity and promotion, independent of specific infrastructure tools.

## Ownership & Collaboration

- **Document Owner**: DevOps Engineer
- **Contributor Roles**: Environment Manager, Operations Team, Security Architect
- **Automation Inputs**: Infrastructure Definition, SLO/SLI Requirements, Security Requirements, Cost Constraints
- **Automation Outputs**: `{environment}-definition.md` and environment-specific configurations

## Completion Checklist

- [ ] Environment purpose and characteristics documented
- [ ] Infrastructure configuration specified with sizing rationale
- [ ] Configuration differences from other environments justified
- [ ] Access control and RBAC defined
- [ ] Deployment process and change control documented
- [ ] Monitoring, alerting, and observability configured
- [ ] Backup, recovery, and runbooks prepared

## Document Sections

### 1. Environment Overview

**Environment Name**: [dev, staging, production, qa, demo, etc.]

**Environment Purpose**: [One-sentence description of what this environment is for]

- Development: Isolated environment for active feature development and experimentation
- Staging: Pre-production environment for final validation before release
- Production: Customer-facing environment serving live traffic
- QA: Dedicated environment for quality assurance and acceptance testing

**Environment Criticality**:

- [ ] Critical (production, customer-facing)
- [ ] High (staging, pre-production)
- [ ] Medium (QA, demo)
- [ ] Low (development, sandbox)

**Uptime SLA**: [e.g., 99.9%, 95%, None]

**Data Sensitivity**:

- [ ] Production data (real customer data)
- [ ] Anonymized production data (PII removed)
- [ ] Synthetic data (generated for testing)
- [ ] No sensitive data

**Traffic Profile**:

- Expected requests per second: [e.g., 1000 RPS, <10 RPS]
- Peak traffic periods: [e.g., business hours, 24/7]
- Geographic distribution: [e.g., global, US only, EU only]

**Cost Tier**:

- [ ] Full (production-grade resources)
- [ ] Medium (scaled-down but representative)
- [ ] Minimal (cost-optimized for non-critical use)

### 2. Environment Characteristics

#### 2.1 Environment Identity

**Resource Naming Convention**:

```text
{environment}-{resource-type}-{identifier}
Examples:
  prod-api-server-01
  staging-db-primary
  dev-k8s-cluster
```

**Tagging Strategy**:

```text
Environment: [dev, staging, prod]
Owner: [team-name]
Project: [project-name]
ManagedBy: [IaC tool]
```

**Network Isolation**:

- [ ] Dedicated VPC/VNet (full network isolation)
- [ ] Shared VPC with isolated subnets
- [ ] Shared network with security group isolation
- [ ] No isolation (development only)

#### 2.2 Environment Lifecycle

**Environment Provisioning**:

- Provisioned on: [date, or "on-demand"]
- Provisioned by: [IaC, manual, hybrid]
- Provisioning duration: [e.g., 30 minutes]

**Environment Persistence**:

- [ ] Permanent (always running)
- [ ] Semi-permanent (running during business hours)
- [ ] Ephemeral (created per-branch, per-PR)
- [ ] Scheduled (weekend only, demo days)

**Environment Destruction**:

- Auto-delete after: [never, 7 days, 30 days]
- Destruction requires approval: [Yes/No]
- Destruction safety checks: [backups verified, no active users]

### 3. Infrastructure Configuration

Define the infrastructure resources for this specific environment. Reference the infrastructure-definition-template.md for detailed specifications.

#### 3.1 Compute Resources

**Container Orchestration** (if applicable):

- Cluster size: [e.g., 3-10 nodes for prod, 1-3 nodes for dev]
- Node instance types: [e.g., t3.large for prod, t3.small for dev]
- Auto-scaling: [enabled/disabled, min/max nodes]

**Virtual Machines** (if applicable):

- Instance types: [production-grade vs. cost-optimized]
- Instance count: [min-max range]
- Auto-scaling: [enabled/disabled]

**Serverless** (if applicable):

- Concurrency limits: [per function]
- Memory allocation: [production vs. development settings]

#### 3.2 Data Layer

**Primary Database**:

- Instance class: [e.g., db.r6g.xlarge for prod, db.t3.small for dev]
- Storage: [100 GB for dev, 1 TB for prod]
- Multi-AZ: [Yes for prod, No for dev]
- Read replicas: [count, if applicable]

**Cache**:

- Cache engine: [Redis, Memcached]
- Node type: [production-grade vs. minimal]
- Cluster size: [single node for dev, 3 nodes for prod]

**Object Storage**:

- Bucket naming: [{environment}-artifacts-{project}]
- Replication: [cross-region for prod, none for dev]
- Versioning: [enabled/disabled]

#### 3.3 Networking

**Load Balancer**:

- Type: [Application Load Balancer, Network Load Balancer]
- Scheme: [internet-facing, internal]
- Availability zones: [single AZ for dev, multi-AZ for prod]

**DNS**:

- Domain: [dev.example.com, staging.example.com, example.com]
- DNS zone: [public, private, both]
- TLS certificate: [wildcard, specific domains]

**CDN**:

- CDN enabled: [Yes for prod/staging, No for dev]
- Edge locations: [global, regional]

### 4. Configuration Management

Define environment-specific settings that differ from other environments.

#### 4.1 Configuration Differences

| Configuration | Development | Staging | Production | Justification |
|---------------|-------------|---------|------------|---------------|
| Log Level | DEBUG | INFO | WARN | Dev needs verbose logs, prod minimizes noise |
| Session Timeout | 24 hours | 8 hours | 1 hour | Dev convenience, prod security |
| Rate Limiting | Disabled | 1000 req/min | 500 req/min | Dev unlimited, prod protects resources |
| Feature Flags | All enabled | Controlled | Controlled | Dev tests all features, prod gradual rollout |
| TLS Required | Optional | Required | Required | Dev flexibility, staging/prod security |
| Database Connections | 10 | 50 | 200 | Sized for expected load |
| Cache TTL | 60s | 5min | 30min | Dev short TTL for rapid testing |
| Backup Frequency | Weekly | Daily | Hourly | Dev low value, prod critical |
| Monitoring Interval | 5min | 1min | 30s | Dev less urgent, prod real-time |

#### 4.2 Configuration Storage

**Configuration Source**:

- [ ] Environment variables (injected at runtime)
- [ ] Configuration files (per-environment config files)
- [ ] Configuration service (centralized config management)
- [ ] Secrets manager (for sensitive values)

**Configuration Location**:

```text
config/
  {environment}/
    app-config.yaml          # Application settings
    infrastructure-vars.tfvars  # IaC variables
    secrets-reference.yaml   # References to secrets (not actual secrets)
```

**Configuration Validation**:

- Schema validation: [validate config structure before deployment]
- Required fields: [ensure mandatory settings present]
- Value constraints: [validate ranges, formats, enums]

#### 4.3 Secrets Management

**Secrets Storage**:

- Secrets backend: [AWS Secrets Manager, HashiCorp Vault, Azure Key Vault]
- Secret naming: [{environment}/{service}/{secret-name}]
- Secret encryption: [KMS-encrypted at rest]

**Secret Injection**:

- Environment variables: [injected by orchestrator]
- Configuration files: [generated at startup]
- Volume mounts: [secrets mounted as files]

**Secret Rotation**:

- Rotation frequency: [90 days for prod, 180 days for staging/dev]
- Rotation automation: [Yes/No]
- Zero-downtime rotation: [Yes/No]

### 5. Access Control

#### 5.1 Human Access

**Access Levels**:

| Role | Development | Staging | Production | Justification |
|------|-------------|---------|------------|---------------|
| Developer | Read/Write | Read | Read (logs only) | Dev full access, prod restricted |
| DevOps Engineer | Read/Write | Read/Write | Read/Write | Full access for operations |
| QA Engineer | Read/Write | Read/Write | Read (logs only) | Testing access, prod read-only |
| Support Engineer | No access | Read | Read | Troubleshooting in staging/prod |
| Manager | Read | Read | Read | Oversight, no write access |
| External Auditor | No access | Read | Read | Compliance verification |

**Access Method**:

- SSH/RDP: [bastion host, VPN, direct]
- Kubernetes exec: [via kubectl with RBAC]
- Database console: [allowed/restricted/prohibited]
- Web console: [cloud provider console with MFA]

**Access Logging**:

- All access logged: [Yes/No]
- Log retention: [90 days]
- Access review: [quarterly]

#### 5.2 Service Access (RBAC)

**Kubernetes RBAC** (if applicable):

| Service Account | Namespace | Permissions | Purpose |
|-----------------|-----------|-------------|---------|
| api-server | default | read secrets, write logs | Application access |
| monitoring | monitoring | read all | Metrics collection |
| deployer | default | create/update/delete deployments | CI/CD deployment |

**IAM Roles** (cloud provider):

| Role | Permissions | Attached To | Purpose |
|------|-------------|-------------|---------|
| eks-node-role | EC2, ECR, CloudWatch | EKS nodes | Node operation |
| lambda-execution-role | Logs, S3, DynamoDB | Lambda functions | Function execution |
| rds-monitoring-role | CloudWatch | RDS instance | Enhanced monitoring |

#### 5.3 Network Access

**Ingress Rules**:

- Public internet access: [allowed/restricted/blocked]
- Allowed source IPs: [corporate VPN, specific IPs, any]
- TLS enforcement: [required/optional]

**Egress Rules**:

- Internet access: [allowed/restricted/blocked]
- Allowed destinations: [specific domains, IP ranges]
- Proxy requirements: [Yes/No]

**Cross-Environment Access**:

- Development → Staging: [blocked]
- Staging → Production: [blocked]
- Production → Development: [blocked]

### 6. Deployment Configuration

#### 6.1 Deployment Strategy

**Deployment Method**:

- [ ] Blue-green deployment
- [ ] Canary deployment
- [ ] Rolling update
- [ ] Feature flag rollout
- [ ] GitOps sync
- [ ] Manual deployment

**Deployment Frequency**:

- Development: [on every commit, multiple times per day]
- Staging: [daily, after dev validation]
- Production: [weekly scheduled releases, on-demand hotfixes]

**Deployment Window**:

- Development: [24/7, any time]
- Staging: [business hours, 9am-5pm]
- Production: [scheduled maintenance window, Tuesday 2am-4am]

**Change Control**:

- Development: [no approval required]
- Staging: [peer review required]
- Production: [CAB approval, change ticket, rollback plan]

#### 6.2 Deployment Automation

**CI/CD Integration**:

- Automated deployment: [Yes/No]
- Deployment trigger: [manual approval, automatic on merge]
- Pre-deployment checks: [tests passing, security scans clear]

**Deployment Stages**:

1. Pre-deployment validation: [health check, backup verification]
2. Deployment execution: [artifact deployment, configuration update]
3. Post-deployment validation: [smoke tests, health checks]
4. Monitoring period: [duration, error rate thresholds]

**Rollback Capability**:

- Automatic rollback: [Yes/No, triggers]
- Manual rollback: [Yes, command or process]
- Rollback validation: [health checks, smoke tests]
- Rollback time: [target duration, e.g., <5 minutes]

### 7. Monitoring and Alerting

#### 7.1 Observability Configuration

**Metrics Collection**:

- Metrics backend: [Prometheus, CloudWatch, Datadog]
- Scrape interval: [30s for prod, 1min for staging, 5min for dev]
- Metric retention: [15 days for prod, 7 days for staging, 3 days for dev]

**Log Aggregation**:

- Log destination: [CloudWatch Logs, Elasticsearch, Splunk]
- Log level: [DEBUG for dev, INFO for staging, WARN for prod]
- Log retention: [7 days for dev, 30 days for staging, 90 days for prod]

**Distributed Tracing**:

- Tracing enabled: [Yes/No]
- Sampling rate: [100% for dev, 10% for staging, 1% for prod]
- Trace retention: [3 days for dev, 7 days for staging/prod]

#### 7.2 Health Checks

**Application Health Checks**:

- Liveness probe: [endpoint, interval, timeout]
- Readiness probe: [endpoint, interval, timeout]
- Startup probe: [endpoint, interval, timeout]

**Infrastructure Health Checks**:

- Compute: [CPU <80%, memory <85%, disk <90%]
- Database: [connections <80% of max, replication lag <10s]
- Network: [load balancer healthy targets ≥2]

#### 7.3 Alerting Configuration

**Alert Severity Levels**:

- Critical: [production outage, immediate response required]
- High: [degraded performance, response within 1 hour]
- Medium: [non-critical issue, response within 4 hours]
- Low: [informational, response next business day]

**Alert Routing**:

| Severity | Development | Staging | Production | Channel |
|----------|-------------|---------|------------|---------|
| Critical | - | Team Slack | On-call engineer | PagerDuty |
| High | - | Team Slack | Team Slack + email | Slack + email |
| Medium | Email | Email | Email | Email |
| Low | No alert | Email (daily digest) | Email (daily digest) | Email |

**Alert Thresholds** (environment-specific):

| Metric | Development | Staging | Production | Notes |
|--------|-------------|---------|------------|-------|
| Error Rate | No alert | >5% for 10min | >1% for 5min | Prod most sensitive |
| Response Time | No alert | >2s for 15min | >1s for 10min | Prod stricter SLO |
| CPU Usage | No alert | >90% for 30min | >80% for 15min | Prod scale earlier |
| Disk Usage | >95% | >90% | >85% | Prod prevent outage |
| Failed Logins | No alert | >100 in 5min | >50 in 5min | Prod security sensitive |

### 8. Backup and Recovery

#### 8.1 Backup Configuration

**Backup Frequency**:

- Development: [weekly snapshots]
- Staging: [daily snapshots]
- Production: [continuous backups + daily snapshots]

**Backup Retention**:

- Development: [7 days]
- Staging: [30 days]
- Production: [90 days + monthly snapshots for 1 year]

**Backup Verification**:

- Backup integrity checks: [daily for prod, weekly for staging]
- Restore testing: [quarterly for all environments]

#### 8.2 Disaster Recovery

**Recovery Time Objective (RTO)**:

- Development: [24 hours]
- Staging: [4 hours]
- Production: [1 hour]

**Recovery Point Objective (RPO)**:

- Development: [24 hours]
- Staging: [1 hour]
- Production: [15 minutes]

**Disaster Scenarios**:

- Single resource failure: [auto-scaling, auto-replacement]
- Availability zone failure: [failover to other AZs]
- Regional failure: [failover to DR region (production only)]
- Data corruption: [restore from backup]

**Disaster Recovery Testing**:

- Test frequency: [annual for prod, on-demand for staging/dev]
- Test scope: [full DR failover, partial recovery]
- Test validation: [RTO/RPO met, data integrity verified]

### 9. Operational Runbook

#### 9.1 Common Operations

**Environment Provisioning**:

```text
1. Run IaC provisioning: [command or process]
2. Validate infrastructure: [health checks]
3. Deploy application: [deployment command]
4. Smoke test: [critical flows]
5. Enable monitoring: [alerts configured]
```

**Environment Scaling**:

```text
1. Identify scaling need: [metrics showing need]
2. Update configuration: [increase node count, instance size]
3. Apply changes: [IaC apply, auto-scaling triggers]
4. Validate scaling: [new capacity available]
```

**Environment Refresh** (staging/dev):

```text
1. Schedule maintenance window
2. Backup current state
3. Restore production snapshot (anonymized)
4. Run data transformation scripts (PII removal)
5. Validate data integrity
6. Resume operations
```

#### 9.2 Incident Response

**Incident Classification**:

- SEV1 (Critical): [production outage, customer impact]
- SEV2 (High): [degraded performance, partial outage]
- SEV3 (Medium): [non-critical issue, workaround available]

**Incident Response Process**:

1. Detection: [automated alert, user report]
2. Acknowledgement: [on-call engineer acknowledges within 5 min]
3. Investigation: [logs, metrics, traces]
4. Mitigation: [rollback, failover, hotfix]
5. Resolution: [root cause fixed]
6. Postmortem: [incident report, corrective actions]

**Escalation Path**:

1. On-call engineer (immediate)
2. Team lead (if not resolved in 30 min)
3. Engineering manager (if SEV1, not resolved in 1 hour)
4. VP Engineering (if extended outage)

#### 9.3 Emergency Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| On-Call Engineer | [Rotation] | [PagerDuty] | 24/7 |
| DevOps Lead | [Name] | [Email/Phone] | Business hours |
| Security Contact | [Name] | [Email/Phone] | 24/7 for SEV1 security |
| Database Admin | [Name] | [Email/Phone] | On-call rotation |

### 10. Compliance and Security

#### 10.1 Security Posture

**Security Controls**:

- Encryption at rest: [required/optional]
- Encryption in transit: [required/optional]
- Multi-factor authentication: [required/optional]
- Network isolation: [yes/no]
- Security scanning: [frequency]

**Compliance Requirements**:

- Regulatory compliance: [GDPR, HIPAA, SOC2, PCI-DSS, None]
- Data residency: [region restrictions]
- Audit logging: [enabled/disabled]
- Access reviews: [quarterly for prod, annual for staging/dev]

#### 10.2 Data Management

**Data Classification**:

- Development: [synthetic data only]
- Staging: [anonymized production data]
- Production: [live customer data]

**Data Retention**:

- Application data: [per data retention policy]
- Logs: [7-90 days depending on environment]
- Backups: [per backup retention policy]

**Data Destruction**:

- Environment deletion: [wipe all data]
- Backup deletion: [secure deletion after retention period]
- Secrets rotation: [old secrets invalidated]

### 11. Cost Tracking

**Monthly Cost Estimate**: [$X,XXX]

**Cost Breakdown**:

- Compute: [$XXX]
- Storage: [$XXX]
- Networking: [$XXX]
- Monitoring: [$XXX]
- Other: [$XXX]

**Cost Optimization Opportunities**:

- Right-sizing: [current resources over-provisioned?]
- Reserved capacity: [predictable workload, consider reserved instances]
- Auto-scaling: [scale down during off-hours]
- Spot instances: [for non-critical workloads]

**Cost Monitoring**:

- Budget alerts: [alert at 80% and 100% of budget]
- Cost anomaly detection: [alert on unexpected spikes]
- Cost attribution: [tagged resources for accurate tracking]

## Validation Checklist

Before considering this environment definition complete:

- [ ] Environment purpose and characteristics clearly defined
- [ ] Infrastructure configuration sized appropriately for environment
- [ ] Configuration differences justified and documented
- [ ] Access control follows least-privilege principle
- [ ] Deployment process tested and validated
- [ ] Monitoring and alerting configured and tested
- [ ] Backup and disaster recovery tested
- [ ] Operational runbook covers common scenarios
- [ ] Compliance and security requirements met
- [ ] Cost estimates align with budget

## Related Templates

- infrastructure-definition-template.md (defines infrastructure resources)
- ci-cd-pipeline-template.md (deploys to this environment)
- deployment-plan-template.md (deployment strategy)
- automated-quality-gate-template.md (promotion criteria to this environment)
- slo-sli-template.md (defines SLOs for this environment)
- operational-readiness-review-template.md (validates environment readiness)

## Agent Notes

This template is tool-agnostic by design. When implementing:

- Create separate environment definition for dev, staging, production
- Adapt resource sizing to environment criticality and budget
- Implement access control using provider-specific RBAC/IAM
- Configure monitoring and alerting using available tools
- Test backup and recovery procedures for each environment

Focus on the WHAT (environment requirements) and WHICH (patterns like parity, promotion criteria), not the HOW (tool-specific implementation).
