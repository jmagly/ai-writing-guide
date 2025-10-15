# Infrastructure Definition Template

## Purpose

Define infrastructure resources, architecture, and provisioning requirements as version-controlled, declarative specifications. This template captures WHAT infrastructure is needed and WHICH patterns to follow, independent of specific Infrastructure-as-Code tools.

## Ownership & Collaboration

- **Document Owner**: DevOps Engineer
- **Contributor Roles**: Software Architect, Security Architect, Reliability Engineer, Network Engineer
- **Automation Inputs**: Software Architecture (Physical/Deployment View), Security Requirements, Capacity Planning, Cost Constraints
- **Automation Outputs**: `infrastructure.md` and tool-specific IaC configurations (Terraform, CloudFormation, Pulumi, ARM)

## Completion Checklist

- [ ] All infrastructure resources enumerated and categorized
- [ ] Network architecture documented with security boundaries
- [ ] Data layer infrastructure defined with backup/recovery strategy
- [ ] Security infrastructure captured (IAM, encryption, secrets)
- [ ] Monitoring and observability infrastructure specified
- [ ] State management and versioning approach documented
- [ ] Disaster recovery and cost management addressed

## Document Sections

### 1. Infrastructure Overview

**Purpose**: [What does this infrastructure support? Application, service, platform?]

**Cloud Provider**:

- [ ] AWS
- [ ] Google Cloud Platform
- [ ] Microsoft Azure
- [ ] Hybrid (multiple clouds)
- [ ] On-premises
- [ ] Multi-cloud

**Regions and Availability**:

- Primary region: [e.g., us-east-1, eu-west-1]
- Secondary region (DR): [if applicable]
- Availability zones: [e.g., 3 AZs for high availability]

**High Availability Requirements**:

- Uptime SLA: [e.g., 99.9%, 99.95%, 99.99%]
- Redundancy strategy: [multi-AZ, multi-region, active-active, active-passive]
- Failover automation: [automatic, manual, hybrid]

**Compliance and Governance**:

- Regulatory requirements: [GDPR, HIPAA, SOC2, PCI-DSS]
- Data residency constraints: [regions where data must stay]
- Audit logging requirements: [all API calls, specific operations]

### 2. Resource Inventory

Comprehensive catalog of all infrastructure components:

| Resource Type | Resource Name | Purpose | Environment | Dependencies | Cost Tier |
|---------------|---------------|---------|-------------|--------------|-----------|
| Network | prod-vpc | Network isolation | Production | - | Low |
| Subnet | prod-subnet-public-a | Public-facing services | Production | prod-vpc | Low |
| Subnet | prod-subnet-private-a | Application tier | Production | prod-vpc | Low |
| Subnet | prod-subnet-data-a | Database tier | Production | prod-vpc | Low |
| Compute Cluster | prod-k8s-cluster | Container orchestration | Production | prod-vpc | High |
| Database | prod-db-primary | Primary database | Production | prod-subnet-data-a | High |
| Database | prod-db-replica | Read replica | Production | prod-db-primary | Medium |
| Object Storage | prod-artifacts | Build artifacts | Production | - | Low |
| Load Balancer | prod-alb | Traffic distribution | Production | prod-subnet-public-a | Medium |
| Cache | prod-redis | Session cache | Production | prod-subnet-private-a | Medium |

### 3. Compute Resources

#### 3.1 Container Orchestration (if applicable)

**Orchestrator**: [Kubernetes, ECS, AKS, GKE, etc.]

**Cluster Configuration**:

- Cluster version: [e.g., Kubernetes 1.27+]
- Control plane: [Managed, self-hosted]
- Cluster networking: [CNI plugin, network policy support]
- Cluster add-ons: [metrics-server, autoscaler, ingress controller, service mesh]

**Node Groups**:

| Node Group | Instance Type | Min Nodes | Max Nodes | Purpose |
|------------|---------------|-----------|-----------|---------|
| system | t3.medium | 2 | 3 | Kubernetes system components |
| compute | t3.large | 3 | 10 | Application workloads |
| memory-optimized | r6g.xlarge | 0 | 5 | Memory-intensive workloads |
| gpu | p3.2xlarge | 0 | 2 | ML/AI workloads |

**Auto-Scaling Policies**:

- Scale up trigger: [CPU >70% for 5 minutes, pending pods]
- Scale down trigger: [CPU <30% for 10 minutes, no pending pods]
- Scale down delay: [10 minutes after scale up]
- Max concurrent scale-up: [3 nodes]

**Resource Quotas** (per namespace):

- CPU requests: [total across all pods in namespace]
- Memory requests: [total across all pods in namespace]
- CPU limits: [total maximum CPU]
- Memory limits: [total maximum memory]

#### 3.2 Virtual Machines / Instances (if applicable)

**Instance Configuration**:

| Instance Group | Instance Type | Quantity | Purpose | Auto-Scaling |
|----------------|---------------|----------|---------|--------------|
| web-servers | t3.medium | 3-10 | Web tier | Yes |
| app-servers | c6i.large | 5-20 | Application tier | Yes |
| batch-workers | m6i.xlarge | 2-10 | Background jobs | Yes |

**Image Selection**:

- Base image: [AMI ID, OS version]
- Hardening applied: [CIS benchmark, custom security baseline]
- Patching strategy: [automated, scheduled, manual]

**Bootstrap Configuration**:

- User data scripts: [initial configuration, agent installation]
- Configuration management integration: [Ansible, Chef, Puppet]
- Service initialization: [start services, health check validation]

#### 3.3 Serverless Compute (if applicable)

**Function Configuration**:

- Runtime: [Node.js 18, Python 3.11, Go 1.21, etc.]
- Memory allocation: [128MB - 10GB]
- Timeout: [seconds]
- Concurrency limits: [maximum concurrent executions]
- VPC integration: [Yes/No, if yes specify subnets]

**Trigger Configuration**:

- HTTP endpoints: [API Gateway integration]
- Event sources: [message queues, storage events, schedules]
- Authorization: [IAM, API keys, OAuth]

### 4. Networking Architecture

#### 4.1 Network Topology

**VPC/Virtual Network Design**:

- VPC CIDR block: [e.g., 10.0.0.0/16]
- Subnet strategy: [public, private, database tiers across multiple AZs]

**Subnet Allocation**:

| Subnet Name | CIDR | Availability Zone | Purpose | Internet Access |
|-------------|------|-------------------|---------|-----------------|
| prod-public-a | 10.0.1.0/24 | us-east-1a | Load balancers | Yes (Internet Gateway) |
| prod-public-b | 10.0.2.0/24 | us-east-1b | Load balancers | Yes (Internet Gateway) |
| prod-private-a | 10.0.10.0/24 | us-east-1a | Application tier | Yes (NAT Gateway) |
| prod-private-b | 10.0.11.0/24 | us-east-1b | Application tier | Yes (NAT Gateway) |
| prod-data-a | 10.0.20.0/24 | us-east-1a | Database tier | No |
| prod-data-b | 10.0.21.0/24 | us-east-1b | Database tier | No |

**Routing Configuration**:

- Public subnets: Route to Internet Gateway for outbound/inbound internet
- Private subnets: Route to NAT Gateway for outbound internet only
- Database subnets: No internet routing, internal traffic only

**Network Peering/Transit**:

- VPC peering: [connection to other VPCs, if applicable]
- Transit gateway: [hub-and-spoke topology, if applicable]
- VPN connections: [on-premises connectivity, if applicable]

#### 4.2 Security Groups and Firewall Rules

Define network access control at the resource level:

**Security Group: Web Tier**

Ingress Rules:

| Source | Port | Protocol | Purpose |
|--------|------|----------|---------|
| 0.0.0.0/0 | 443 | TCP | HTTPS from internet |
| 0.0.0.0/0 | 80 | TCP | HTTP redirect to HTTPS |
| VPC CIDR | 8080 | TCP | Internal health checks |

Egress Rules:

| Destination | Port | Protocol | Purpose |
|-------------|------|----------|---------|
| VPC CIDR | 3000 | TCP | Application tier |
| 0.0.0.0/0 | 443 | TCP | External API calls |

**Security Group: Application Tier**

Ingress Rules:

| Source | Port | Protocol | Purpose |
|--------|------|----------|---------|
| web-tier-sg | 3000 | TCP | Requests from web tier |
| VPC CIDR | 3000 | TCP | Internal monitoring |

Egress Rules:

| Destination | Port | Protocol | Purpose |
|-------------|------|----------|---------|
| database-tier-sg | 5432 | TCP | PostgreSQL database |
| cache-sg | 6379 | TCP | Redis cache |
| 0.0.0.0/0 | 443 | TCP | External API calls |

**Security Group: Database Tier**

Ingress Rules:

| Source | Port | Protocol | Purpose |
|--------|------|----------|---------|
| app-tier-sg | 5432 | TCP | Database connections |

Egress Rules:

| Destination | Port | Protocol | Purpose |
|-------------|------|----------|---------|
| 0.0.0.0/0 | 443 | TCP | Backup to object storage |

#### 4.3 Load Balancers

**Load Balancer Configuration**:

- Type: [Application Load Balancer, Network Load Balancer, Classic]
- Scheme: [Internet-facing, internal]
- Subnets: [public subnets for internet-facing, private for internal]

**Listeners**:

| Port | Protocol | Action | Target |
|------|----------|--------|--------|
| 443 | HTTPS | Forward | web-servers-tg |
| 80 | HTTP | Redirect to HTTPS | - |

**Target Group Configuration**:

- Health check path: [/health, /readiness]
- Health check interval: [30 seconds]
- Healthy threshold: [2 consecutive successes]
- Unhealthy threshold: [3 consecutive failures]
- Deregistration delay: [30 seconds for graceful shutdown]

**SSL/TLS Configuration**:

- Certificate source: [AWS Certificate Manager, manual upload]
- TLS version: [TLSv1.2 minimum]
- Cipher suites: [modern, secure ciphers only]

#### 4.4 DNS Configuration

**DNS Zones**:

- Public zone: [example.com]
- Private zone: [internal.example.com]

**DNS Records**:

| Record Name | Type | Value | TTL | Purpose |
|-------------|------|-------|-----|---------|
| example.com | A | load-balancer-ip | 300 | Main website |
| www.example.com | CNAME | example.com | 300 | WWW redirect |
| api.example.com | A | api-load-balancer-ip | 300 | API endpoint |
| db.internal.example.com | CNAME | rds-endpoint | 300 | Database (private) |

#### 4.5 Content Delivery Network (CDN)

**CDN Configuration**:

- CDN provider: [CloudFront, Akamai, Cloudflare, Fastly]
- Origin: [load balancer, object storage]
- Edge locations: [global, specific regions]

**Caching Behavior**:

- Static assets: Cache for 30 days, cache query strings
- Dynamic content: Cache for 5 minutes, bypass for authenticated requests
- API responses: No caching or short TTL

**Security Features**:

- WAF integration: [Yes/No]
- DDoS protection: [Yes/No]
- Geo-restrictions: [if applicable]

### 5. Data Layer Infrastructure

#### 5.1 Relational Databases

**Database Engine**: [PostgreSQL, MySQL, SQL Server, Oracle]

**Instance Configuration**:

- Instance class: [e.g., db.r6g.xlarge]
- Storage type: [General Purpose SSD, Provisioned IOPS]
- Allocated storage: [100 GB, with auto-scaling to 1 TB]
- Storage encryption: [Yes, using KMS]

**High Availability**:

- Multi-AZ deployment: [Yes/No]
- Read replicas: [count, regions]
- Replication lag tolerance: [seconds]

**Backup and Recovery**:

- Automated backups: [Yes/No]
- Backup retention: [7 days, 30 days]
- Backup window: [03:00-04:00 UTC]
- Point-in-time recovery: [Yes/No]
- Cross-region backup replication: [Yes/No]

**Maintenance and Patching**:

- Maintenance window: [Sunday 04:00-05:00 UTC]
- Auto minor version upgrade: [Yes/No]
- Patch approval: [automated, manual]

**Performance Configuration**:

- Parameter groups: [custom tuning for workload]
- Connection pooling: [via application layer, PgBouncer]
- Query performance insights: [enabled]

#### 5.2 NoSQL Databases (if applicable)

**Database Type**: [DynamoDB, MongoDB, Cassandra, Redis]

**Table/Collection Configuration**:

- Throughput: [on-demand, provisioned]
- Partitioning strategy: [key design]
- Global secondary indexes: [if applicable]

**Replication**:

- Replication factor: [3 replicas]
- Consistency level: [eventual, strong]
- Multi-region replication: [Yes/No]

#### 5.3 Caching

**Cache Engine**: [Redis, Memcached]

**Cluster Configuration**:

- Node type: [cache.r6g.large]
- Number of nodes: [3 for high availability]
- Cluster mode: [enabled/disabled]
- Eviction policy: [allkeys-lru, volatile-lru]

**Security**:

- Encryption at rest: [Yes/No]
- Encryption in transit: [Yes/No]
- Authentication: [password-protected, IAM]

#### 5.4 Object Storage

**Storage Configuration**:

- Bucket naming: [prod-artifacts-{account-id}]
- Versioning: [enabled/disabled]
- Replication: [cross-region, same-region]

**Lifecycle Policies**:

- Transition to infrequent access: [after 90 days]
- Transition to archive: [after 365 days]
- Expiration: [after 7 years, or never]

**Access Control**:

- Bucket policies: [restrict by IAM role, IP range]
- Public access: [blocked by default]
- Encryption: [server-side encryption with KMS]

### 6. Security Infrastructure

#### 6.1 Identity and Access Management (IAM)

**Service Roles**:

| Role Name | Purpose | Permissions | Trust Policy |
|-----------|---------|-------------|--------------|
| eks-cluster-role | EKS control plane | AmazonEKSClusterPolicy | EKS service |
| eks-node-role | EKS worker nodes | AmazonEKSWorkerNodePolicy | EC2 service |
| lambda-execution-role | Lambda functions | Logs, network, S3 access | Lambda service |
| rds-monitoring-role | RDS enhanced monitoring | CloudWatch metrics | RDS service |

**User/Group Policies**:

- Developers: Read-only access to resources, write access to dev environment
- DevOps Engineers: Full access to infrastructure, audit logging enforced
- Auditors: Read-only access to logs and compliance reports

**Principle of Least Privilege**:

- All roles have minimum required permissions
- Wildcard permissions avoided
- Resource-specific ARNs used
- Time-limited access via temporary credentials

#### 6.2 Secrets Management

**Secrets Storage Backend**:

- Solution: [AWS Secrets Manager, HashiCorp Vault, Azure Key Vault]
- Encryption: [KMS-encrypted at rest]
- Access control: [IAM policies, RBAC]

**Secret Types**:

- Database credentials
- API keys for external services
- TLS certificates
- Encryption keys
- Service account tokens

**Secret Rotation Policy**:

- Database passwords: [rotate every 90 days]
- API keys: [rotate every 180 days]
- TLS certificates: [auto-renew before expiration]
- Rotation automation: [Yes/No]

**Secret Injection**:

- Environment variables: [via secrets manager integration]
- Configuration files: [generated at runtime]
- Kubernetes secrets: [via External Secrets Operator, Sealed Secrets]

#### 6.3 Encryption

**Encryption at Rest**:

- Database: [KMS-encrypted storage]
- Object storage: [server-side encryption with KMS]
- Disk volumes: [encrypted EBS volumes]
- Backups: [encrypted snapshots]

**Encryption in Transit**:

- TLS version: [TLSv1.2 minimum, prefer TLSv1.3]
- Certificate management: [automated via certificate manager]
- Internal traffic: [TLS between services, mTLS for service mesh]

**Key Management**:

- Key management service: [AWS KMS, Azure Key Vault, Google Cloud KMS]
- Key rotation: [automatic annual rotation]
- Key access: [audited via CloudTrail/activity logs]

#### 6.4 Network Security

**Web Application Firewall (WAF)**:

- WAF rules: [OWASP Top 10, custom rules]
- Rate limiting: [1000 requests per 5 minutes per IP]
- IP reputation blocking: [enabled]
- Geo-blocking: [if required]

**DDoS Protection**:

- DDoS mitigation: [automatic, provider-managed]
- Traffic scrubbing: [enabled]
- Rate-based rules: [throttle suspicious traffic]

**Network Access Control Lists (NACLs)**:

- Default action: [deny all]
- Explicit allow rules: [documented per subnet]
- Stateless filtering: [yes, complementary to security groups]

### 7. Monitoring and Observability Infrastructure

#### 7.1 Logging

**Log Aggregation**:

- Log collection: [Fluentd, Fluent Bit, CloudWatch Logs agent]
- Log destination: [CloudWatch Logs, Elasticsearch, Splunk]
- Log retention: [30 days hot, 365 days archive]

**Log Types**:

- Application logs: [structured JSON logs]
- Access logs: [load balancer, web server]
- Audit logs: [API calls, IAM activity]
- System logs: [OS events, container runtime]

**Log Encryption and Access Control**:

- Encryption: [encrypted at rest and in transit]
- Access: [restricted to authorized personnel]
- Audit trail: [log access is logged]

#### 7.2 Metrics and Monitoring

**Metrics Collection**:

- Metrics system: [Prometheus, CloudWatch, Datadog]
- Scrape interval: [30 seconds]
- Retention: [15 days detailed, 1 year aggregated]

**Metrics Categories**:

- Infrastructure metrics: [CPU, memory, disk, network]
- Application metrics: [request rate, error rate, latency]
- Business metrics: [transactions, users, revenue]

**Dashboards**:

- Executive dashboard: [high-level KPIs]
- Operations dashboard: [infrastructure health]
- Application dashboard: [service performance]
- Incident dashboard: [real-time during outages]

#### 7.3 Alerting

**Alert Routing**:

- Critical alerts: [on-call engineer via PagerDuty, 24/7]
- Warning alerts: [team Slack channel]
- Info alerts: [email to operations team]

**Alert Rules**:

- Infrastructure: [CPU >80%, disk >90%, memory >85%]
- Application: [error rate >1%, latency >1s, availability <99.5%]
- Security: [unauthorized access attempts, policy violations]

**Alert Tuning**:

- Alert thresholds: [tuned to avoid false positives]
- Alert grouping: [related alerts grouped together]
- Alert suppression: [during maintenance windows]

#### 7.4 Distributed Tracing (if applicable)

**Tracing System**: [Jaeger, Zipkin, AWS X-Ray]

**Trace Sampling**:

- Sampling rate: [1% of requests, 100% of errors]
- Trace retention: [7 days]

**Trace Propagation**:

- Context propagation: [across service boundaries]
- Correlation IDs: [request tracking across services]

### 8. State Management and Versioning

**Infrastructure-as-Code State Backend**:

- State storage: [S3 bucket, Azure Blob Storage, GCS bucket, Terraform Cloud]
- State locking: [DynamoDB, Blob leases, GCS locking]
- State encryption: [encrypted at rest using KMS]

**State Access Control**:

- Read access: [DevOps Engineers, CI/CD pipelines]
- Write access: [restricted to CI/CD pipelines only]
- State versioning: [enabled for rollback capability]

**Module Organization**:

```text
infrastructure/
  modules/
    network/        # Reusable network components
    compute/        # Compute configurations
    data/           # Database and storage
    security/       # IAM, security groups
  environments/
    dev/            # Dev environment config
    staging/        # Staging environment config
    prod/           # Production environment config
  shared/           # Shared resources (DNS, logging)
```

**Versioning Strategy**:

- IaC tool version: [pinned version, e.g., Terraform 1.5.x]
- Provider versions: [pinned versions to avoid breaking changes]
- Module versions: [semantic versioning, locked to specific versions]

**Variable Management**:

- Input variables: [defined per environment]
- Variable validation: [type constraints, range checks]
- Sensitive variables: [marked as sensitive, never logged]

### 9. Deployment and Change Management

#### 9.1 Provisioning Process

**Pre-Flight Validation**:

- Syntax validation: [validate IaC code syntax]
- Plan generation: [preview changes before applying]
- Cost estimation: [estimate infrastructure cost changes]
- Security policy check: [validate against security policies]

**Apply Process**:

- Apply order: [dependencies applied first, leaf resources last]
- Approval gates: [manual approval for production changes]
- Apply timeout: [maximum time to wait for resource creation]
- Retry logic: [automatic retry for transient failures]

**Post-Provisioning Validation**:

- Resource validation: [all resources created successfully]
- Health checks: [services responding correctly]
- Smoke tests: [basic functionality validated]
- Monitoring enabled: [alerts and dashboards configured]

#### 9.2 Change Management

**Review Process**:

- All infrastructure changes via pull request
- Peer review required before merge
- Automated tests run on every change
- Plan output reviewed by approvers

**Approval Gates**:

- Development changes: [1 approval from DevOps Engineer]
- Staging changes: [1 approval from Senior DevOps Engineer]
- Production changes: [2 approvals from Senior DevOps Engineer and Architect]

**Rollback Procedures**:

- State rollback: [revert to previous state version]
- Resource rollback: [apply previous configuration]
- Validation: [confirm rollback restored desired state]

#### 9.3 Drift Detection and Reconciliation

**Drift Detection**:

- Scheduled drift detection: [daily, weekly]
- Drift detection trigger: [on-demand, after suspected manual changes]
- Drift reporting: [alert if resources deviate from IaC]

**Drift Resolution**:

- Import manual changes: [incorporate into IaC if intentional]
- Revert manual changes: [re-apply IaC to restore desired state]
- Document exceptions: [if manual changes must persist temporarily]

**Audit Trail**:

- All infrastructure changes logged
- Manual changes flagged for review
- Drift events tracked and analyzed

### 10. Disaster Recovery

#### 10.1 Backup Strategy

**Infrastructure Backup**:

- Configuration backup: [IaC files in version control]
- State backup: [state file versioning enabled]
- Snapshot frequency: [daily for data volumes]
- Cross-region replication: [Yes/No]

**Backup Retention**:

- Daily backups: [retained for 7 days]
- Weekly backups: [retained for 4 weeks]
- Monthly backups: [retained for 12 months]
- Annual backups: [retained for 7 years or per compliance]

**Backup Testing**:

- Restore testing frequency: [quarterly]
- Restore validation: [data integrity verified]
- Restore performance: [measure time to restore]

#### 10.2 Recovery Procedures

**Recovery Time Objective (RTO)**: [e.g., 4 hours]

**Recovery Point Objective (RPO)**: [e.g., 15 minutes]

**Recovery Scenarios**:

- Single resource failure: [automated recovery via auto-scaling, health checks]
- Availability zone failure: [failover to other AZs, automated]
- Regional failure: [failover to DR region, manual trigger]
- Total loss: [provision infrastructure from scratch using IaC, restore data from backups]

**Failover Automation**:

- Health checks: [detect failures automatically]
- DNS failover: [route traffic to healthy region]
- Application failover: [promote read replica to primary]

**Recovery Validation**:

- Health check validation: [all services healthy]
- Data integrity check: [verify data consistency]
- Functional testing: [critical flows validated]

### 11. Cost Management

#### 11.1 Resource Tagging

**Tagging Strategy**:

```text
Environment: [dev, staging, prod]
Project: [project-name]
Owner: [team-name]
CostCenter: [cost-center-id]
ManagedBy: [Terraform, CloudFormation, etc.]
ExpirationDate: [for temporary resources]
```

**Tagging Enforcement**:

- Required tags: [all resources must have Environment, Project, Owner]
- Tag validation: [automated checks in IaC pipeline]
- Tag compliance reporting: [weekly reports on untagged resources]

#### 11.2 Cost Optimization

**Right-Sizing**:

- Instance type selection: [based on actual usage, not over-provisioned]
- Auto-scaling: [scale down during low-traffic periods]
- Spot instances: [for non-critical, fault-tolerant workloads]

**Reserved Capacity**:

- Reserved instances: [for predictable workloads, 1-year or 3-year commitments]
- Savings plans: [flexible pricing for compute]

**Resource Cleanup**:

- Unused resources: [automated detection and deletion]
- Orphaned resources: [cleanup scripts for abandoned resources]
- Ephemeral environments: [auto-delete after expiration]

**Cost Monitoring**:

- Budget alerts: [alert at 80% and 100% of budget]
- Cost anomaly detection: [alert on unexpected cost spikes]
- Cost attribution: [per-project, per-team cost reports]

#### 11.3 Cost Estimation

**Initial Cost Estimate**: [monthly cost for infrastructure as designed]

- Compute: $X,XXX
- Storage: $XXX
- Networking: $XXX
- Monitoring: $XXX
- **Total**: $X,XXX per month

**Cost Growth Projections**:

- 20% traffic growth: +$XXX per month
- Additional environment: +$XXX per month
- Scaling to new region: +$X,XXX per month

### 12. Compliance and Governance

#### 12.1 Policy as Code

**Policy Enforcement**:

- Policy engine: [Open Policy Agent, Sentinel, Azure Policy]
- Policy scope: [all infrastructure changes]
- Policy failure action: [block non-compliant changes]

**Policy Examples**:

- Encryption: [all databases must have encryption at rest]
- Network: [no public access to databases]
- IAM: [no wildcard permissions in production]
- Tagging: [all resources must have required tags]

**Policy Exemptions**:

- Exemption process: [security architect approval required]
- Exemption tracking: [documented and reviewed quarterly]
- Temporary exemptions: [auto-expire after 90 days]

#### 12.2 Audit Logging

**API Call Logging**:

- Log all API calls: [CloudTrail, Activity Logs]
- Log retention: [90 days hot, 7 years archive]
- Log integrity: [log file validation enabled]

**Access Auditing**:

- IAM activity: [who accessed what, when]
- Resource access: [login attempts, data access]
- Configuration changes: [who changed what resources]

**Compliance Reporting**:

- Automated compliance checks: [CIS benchmarks, NIST, PCI-DSS]
- Compliance reporting: [monthly reports to security team]
- Audit evidence: [logs and reports archived for auditors]

#### 12.3 Security Baseline

**Hardening Standards**:

- OS hardening: [CIS benchmark applied]
- Network hardening: [default deny, explicit allow]
- Application hardening: [secure defaults, disable unnecessary services]

**Vulnerability Management**:

- Vulnerability scanning: [weekly scans of all resources]
- Patch management: [automated patching within 30 days of release]
- Exception tracking: [unpatched systems require approval and remediation plan]

## Validation Checklist

Before considering this template complete:

- [ ] All infrastructure resources documented in resource inventory
- [ ] Network architecture includes security boundaries and access control
- [ ] Data layer includes backup, recovery, and replication strategy
- [ ] Security infrastructure covers IAM, secrets, encryption, network security
- [ ] Monitoring and observability infrastructure captures logs, metrics, alerts
- [ ] State management approach ensures safe concurrent access
- [ ] Disaster recovery procedures tested and documented
- [ ] Cost management includes tagging, optimization, and monitoring
- [ ] Compliance requirements addressed with policy as code and audit logging

## Related Templates

- software-architecture-doc-template.md (Physical/Deployment View)
- security-requirements-template.md (security infrastructure requirements)
- deployment-pipeline-template.md (infrastructure deployment automation)
- environment-definition-template.md (per-environment infrastructure configurations)
- ci-cd-pipeline-template.md (infrastructure provisioning in CI/CD)
- operational-readiness-review-template.md (validates infrastructure completeness)

## Agent Notes

This template is tool-agnostic by design. When implementing:

- Translate resource definitions into tool-specific syntax (Terraform HCL, CloudFormation YAML, Pulumi code)
- Map networking concepts to provider-specific constructs (AWS VPC, Azure VNet, GCP VPC)
- Adapt IAM and security configurations to provider capabilities
- Use provider-native monitoring and logging services where available
- Implement state management using tool-recommended backends

Focus on the WHAT (infrastructure requirements) and WHICH (patterns like multi-AZ, encryption, least privilege), not the HOW (tool-specific implementation).
