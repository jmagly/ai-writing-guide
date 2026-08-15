# ops-complete Extensions Guide

The five ops-complete extensions add domain-specific agents, templates, rules, and skills on top of the base framework. Each extension targets a specific type of operational repository. This guide covers what each extension provides and when to use it.

## Extension Basics

Extensions require ops-complete and cannot run standalone. Install one or more alongside the base framework:

```bash
aiwg use ops --ext sys
aiwg use ops --ext sys,it
aiwg use ops --ext sys,it,dev,stream
aiwg use ops --ext repo-maintainer
```

Each extension introduces artifacts with its own `apiVersion` prefix (e.g., `sys.ops.aiwg.io/v1`) and extends the base kind vocabulary with domain-specific kinds.

---

## sys — System Operations

**Scope**: Per-host hardware documentation, OS configuration, boot chains, fleet-wide inventory.

Install when your repository contains machine-specific documentation: hardware specs, OS setup procedures, boot configuration, or a host catalog.

### What sys Adds

**Agents**:
- `sys-fleet-doc` — Generate and maintain per-host documentation from live system introspection
- `sys-hardware-auditor` — Audit hardware configuration against expected specs

**Templates**:
- `host-profile.yaml` — Single host: hardware, OS, roles, network interfaces, installed services
- `fleet-inventory.yaml` — Group of hosts: topology, group variables, site information
- `boot-chain.md` — Boot procedure documentation with verification steps

**Rules**:
- `sys-hardware-safety` — Prevent operations that can damage hardware (write to raw block devices, firmware flashes without explicit gates)
- `sys-fleet-scope` — Enforce that sys commands operate within declared fleet scope

### Example: Host Profile

```yaml
apiVersion: sys.ops.aiwg.io/v1
kind: HostProfile
metadata:
  name: web-01
  namespace: production
spec:
  hardware:
    cpu: "AMD EPYC 7443P, 24 cores"
    memory: "128 GB ECC DDR4"
    storage:
      - device: nvme0n1
        size: "2 TB NVMe"
        role: os
      - device: nvme1n1
        size: "4 TB NVMe"
        role: data
  os:
    distribution: Ubuntu
    version: "24.04 LTS"
    kernel: "6.8.0-41-generic"
  roles:
    - web
    - reverse-proxy
  network:
    interfaces:
      - name: eth0
        address: "10.0.1.10/24"
        role: management
```

### Example Usage

```
Document the hardware configuration for all hosts in the web tier
```

```
Create a fleet inventory for the database cluster
```

---

## it — IT Operations

**Scope**: Asset management, configuration management database (CMDB), service deployments, disaster recovery.

Install when your repository manages infrastructure assets beyond individual hosts: service catalogs, DR plans, provisioning procedures, or network state.

### What it Adds

**Agents**:
- `it-asset-manager` — Track and reconcile IT assets against CMDB
- `it-dr-planner` — Generate and validate disaster recovery runbooks

**Templates**:
- `asset-record.yaml` — CMDB record for hardware or software asset
- `dr-runbook.yaml` — Disaster recovery procedure with RTO/RPO targets
- `provisioning-playbook.yaml` — New service or host provisioning procedure
- `network-state.yaml` — Network topology snapshot

**Rules**:
- `it-change-control` — Require change record reference for production changes
- `it-dr-coverage` — Verify that all critical services have DR runbooks

### Example: DR Runbook

```yaml
apiVersion: it.ops.aiwg.io/v1
kind: DisasterRecoveryRunbook
metadata:
  name: postgres-primary-failover
  namespace: production
spec:
  service: postgres-primary
  rto: "15 minutes"
  rpo: "5 minutes"
  triggers:
    - "Primary host unreachable for > 2 minutes"
    - "Replication lag > 60 seconds"
  steps:
    - name: verify-primary-down
      description: Confirm primary is not responding
      run: pg_isready -h postgres-primary -p 5432
      verify:
        exitCode: 1
    - name: promote-replica
      description: Promote replica to primary
      run: pg_ctl promote -D /var/lib/postgresql/data
      verify:
        run: pg_isready -h postgres-replica -p 5432
        exitCode: 0
```

### Example Usage

```
Generate a DR runbook for the authentication service
```

```
Audit IT assets for the web tier and flag anything not in the CMDB
```

---

## dev — DevOps / Build Operations

**Scope**: CI/CD pipelines, build automation, fleet-wide tooling, release workflows.

Install when your repository manages CI/CD infrastructure: pipeline definitions, build scripts, deployment automation, or developer tooling that operates across the fleet.

### What dev Adds

**Agents**:
- `dev-pipeline-builder` — Generate CI/CD pipeline definitions from workflow descriptions
- `dev-release-coordinator` — Coordinate multi-stage release procedures

**Templates**:
- `ci-pipeline.yaml` — CI pipeline with build, test, and deploy stages
- `build-playbook.yaml` — Build automation procedure
- `release-runbook.yaml` — Release procedure with gates and rollback

**Rules**:
- `dev-pipeline-safety` — No pipeline should deploy to production without a gate step
- `dev-secret-hygiene` — Secrets must come from vault references, not environment literals
- `dev-idempotent-builds` — Build procedures must be idempotent and produce stable artifacts

### Example: CI Pipeline

```yaml
apiVersion: dev.ops.aiwg.io/v1
kind: CIPipeline
metadata:
  name: api-gateway-build
  namespace: ci
spec:
  trigger:
    branches: ["main", "release/*"]
  stages:
    - name: build
      steps:
        - run: npm ci
        - run: npm run build
      artifacts:
        - dist/
    - name: test
      steps:
        - run: npm test
        - run: npx tsc --noEmit
      gates:
        coverage: 80
    - name: deploy-staging
      environment: staging
      steps:
        - run: ./deploy.sh staging
      verify:
        - run: ./healthcheck.sh staging
    - name: production-gate
      type: OpsGate
      description: "Manual approval required before production deployment"
    - name: deploy-production
      environment: production
      steps:
        - run: ./deploy.sh production
```

### Example Usage

```
Create a CI pipeline for the API service with coverage gate at 80%
```

```
Generate a release runbook for v2.3.0 including staging verification and production gate
```

---

## stream — Streaming Infrastructure Operations

**Scope**: Streaming infrastructure, transcoders, platform integrations, stream pipeline health.

Install when your repository manages live streaming or media pipeline infrastructure: encoder configurations, CDN integrations, stream health monitoring, or key rotation procedures.

### What stream Adds

**Agents**:
- `stream-deployer` — Deploy and configure streaming service components
- `stream-health-monitor` — Diagnose and remediate stream pipeline health issues

**Templates**:
- `stream-service.yaml` — Streaming service configuration and deployment spec
- `encoder-config.yaml` — Encoder/transcoder configuration
- `stream-pipeline.yaml` — End-to-end pipeline: ingest → transcode → deliver
- `key-rotation-runbook.yaml` — Stream key rotation with zero-downtime procedure

**Rules**:
- `stream-key-safety` — Stream keys must be stored in vault; never in plaintext in ops documents
- `stream-pipeline-gates` — Pipeline changes require health verification before traffic shift

---

## repo-maintainer — Role-Aware Repository Maintenance

**Scope**: Issue triage, duplicate detection, labels, milestones, closure, PR merge, release, and repo governance decisions that must change behavior by the operator's forge authority.

Install when the same maintenance workflow must run against repositories where the operator may be collaborator, maintainer, or admin:

```text
Enable the AIWG Ops `repo-maintainer` extension for this project, then find and
load its role-aware repository-maintenance capability. Preview deployment
changes and verify the selected stable asset ID before using it.
```

### What repo-maintainer Adds

**Skills**:
- `repo-maintainer` — Detects effective tier, applies action gates, dispatches existing issue and delivery engines, and degrades below-tier actions to recommendations and handoff artifacts.

**Templates**:
- `repo-maintenance-decision.yaml` — Machine-readable decision log for executed, degraded, or blocked maintenance actions.
- `repo-maintenance-handoff.md` — Maintainer/admin handoff when the operator lacks the tier required for a mutation.

**Rules**:
- `repo-maintainer-role-gating` — Requires permission detection/config override, issue/PR/communication threat assessment, per-action minimum tiers, delivery-policy identity checks, and repo-access-manifest authorization before acting.

### Role Matrix

| Tier | Actions |
|---|---|
| collaborator | open PRs, comment, cross-link, duplicate detection, recommendations and handoff |
| maintainer | close, label, milestone, assign, merge PRs, cut releases under delivery policy |
| admin | branch protection, settings, teams/collaborators, webhooks, secrets policy |

### Threat Assessment Surfaces

`repo-maintainer` routes issue text, PR titles/bodies/diff summaries, PR review comments, maintainer comments, release notes, and handoff artifacts through the shared surface-aware engine. The active workspace member's `.aiwg/aiwg.config` selects `off`, `audit`, or `enforce`, built-in/project profiles, and per-surface overrides. Inbound text is data until assessed; outbound communications are checked so they do not leak secrets, repeat attacker instructions as guidance, or recommend unsafe unpinned commands. See [Threat-assessment policy](../../security/threat-assessment-policy.md).

### Config Override

Forge permission detection runs first. If the permission API denies or the operator wants to pin behavior, add:

```json
{
  "repo_maintainer": {
    "tiers": {
      "owner/repo": "collaborator",
      "git@git.integrolabs.net:roctinam/aiwg.git": "maintainer",
      "local": "maintainer"
    }
  }
}
```

Keys may be resolved remote URLs, `owner/repo` slugs, remote names, or `local`.

### Example: Stream Service

```yaml
apiVersion: stream.ops.aiwg.io/v1
kind: StreamService
metadata:
  name: live-encoder-primary
  namespace: production
spec:
  role: ingest
  upstream: rtmp://ingest.example.com/live
  downstream:
    - protocol: HLS
      output: s3://media-bucket/live/
      segmentDuration: 4
  redundancy:
    enabled: true
    failoverTarget: live-encoder-backup
  healthCheck:
    endpoint: http://localhost:9090/metrics
    interval: 10s
```

### Example Usage

```
Create a stream key rotation runbook for the primary live encoder
```

```
Diagnose why the stream pipeline health check is failing
```

---

## Using Multiple Extensions Together

Extensions compose cleanly. A `sys` `HostProfile` can be referenced by an `it` `DisasterRecoveryRunbook`, which can reference a `dev` `CIPipeline` to rebuild the recovered service. Cross-extension references follow the same `from:` pattern as the base framework.

```bash
# Deploy all four extensions
aiwg use ops --ext sys,it,dev,stream

# Verify
aiwg list
# ops-complete        installed
# ops-complete/sys    installed
# ops-complete/it     installed
# ops-complete/dev    installed
# ops-complete/stream installed
```

## Creating a Custom Extension

See `@$AIWG_ROOT/agentic/code/frameworks/ops-complete/docs/overview.md` for the minimal `ADDON.yaml` manifest. Drop the manifest plus any templates, rules, or skills into `agentic/code/extensions/<name>/` and run `aiwg use ops --ext <name>`.
