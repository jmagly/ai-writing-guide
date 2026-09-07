# ops-complete Quickstart

> **First time using AIWG?** Begin with [Install, Connect, and
Verify](../../getting-started/install-connect-verify.md). This guide assumes AIWG is already installed and connected
to the target project.

Use ops-complete when a repository needs runbooks, fleet inventory, incident
records, deployment operations, or other operational procedures that an AI
assistant can inspect and update with evidence.

## Before You Start

ops-complete is for repositories that contain operational procedures — runbooks, fleet inventory, incident reports, CI/CD definitions. If you are working on an application codebase managed with the SDLC framework, you do not need ops-complete.

## Installation

```bash
# Base framework only
aiwg use ops

# With extensions — choose what fits your repo
aiwg use ops --ext sys              # Add per-host / fleet docs
aiwg use ops --ext sys,it           # Add CMDB, asset management, DR
aiwg use ops --ext sys,it,dev       # Add CI/CD, build automation
aiwg use ops --ext sys,it,dev,stream  # Add streaming infrastructure
```

After installation, verify what was deployed:

```bash
aiwg list
```

You should see `ops-complete` (and any extensions) listed as installed frameworks.
`aiwg use` also refreshes shared project context and prints any provider reload
step needed before the assistant sees the new framework.

## Extension Selection Guide

| If your repo contains... | Install these extensions |
|--------------------------|--------------------------|
| Per-host docs, hardware specs | `sys` |
| Asset inventory, DR runbooks, service deployments | `it` |
| CI/CD pipelines, build scripts | `dev` |
| Streaming services, transcoders | `stream` |

Extensions are additive. The base `ops` framework is always required; extensions cannot run standalone.

## First Useful Task

Start with an existing operational need and ask for one reviewable artifact:

```text
Use AIWG's ops framework to draft a restart runbook for our API service. Ask
only for missing operational facts, include verification and rollback steps,
and mark any assumptions that require operator approval.
```

Success means you have a runbook draft or review report with targets,
pre-flight checks, rollback conditions, evidence requirements, and the next
operator decision.

## Manual Runbook Example

Create a new runbook using the template:

```bash
mkdir -p ops/runbooks
```

Then create `ops/runbooks/restart-api-service.yaml`:

```yaml
apiVersion: ops.aiwg.io/v1
kind: OpsPlaybook
metadata:
  name: restart-api-service
  namespace: production
  labels:
    tier: web
    domain: api
spec:
  inventory: production-fleet
  targets:
    hosts:
      - web-01
  vars:
    service_name: api-gateway
    health_endpoint: "http://localhost:8080/health"
  steps:
    - id: pre-flight-check
      capability: service-health
      inputs:
        - name: service
          from: vars.service_name
        - name: expected_state
          value: active
    - id: restart-service
      capability: service-restart
      depends_on: [pre-flight-check]
      inputs:
        - name: service
          from: vars.service_name
    - id: wait-for-ready
      capability: http-health
      depends_on: [restart-service]
      inputs:
        - name: endpoint
          from: vars.health_endpoint
        - name: attempts
          value: 10
```

## Execute a Runbook

With the `ops-runbook-executor` agent deployed, you can run:

```
Execute the restart-api-service runbook against host web-01
```

The agent will:
1. Read the playbook
2. Resolve variables (framework defaults → inventory group → instance)
3. Execute each step, verifying the `verify:` condition before proceeding
4. Prepare minimum sufficient, redacted evidence through the governance boundary
5. Trigger rollback if a step fails

## Run a Fleet Inventory Collection

```
Collect fleet inventory for the web tier
```

The `ops-inventory` agent scans the configured host groups and produces an `OpsInventory` document with discovered hosts, their roles, and current state.

## Enable the Audit Trail

The `ops-audit-trail` skill tracks everything the executor touches. To review what changed during a runbook execution:

```
Show me the audit trail for the last runbook run
```

Output includes: files modified, backups created, command/result correlation, exit codes, bounded redacted excerpts, policy identity, and disposition deadlines. Full raw output is a separate short-lived tier and requires an explicit reason.

Before any generated artifact or collected output is written or posted, run `aiwg ops evidence prepare` (or use the `aiwg/governance` API). Start from `templates/governance-policy.yaml` when the project needs custom classes, detectors, sinks, or retention rules.

## Common Patterns

### Check a Runbook Before Running It

```
Validate the restart-api-service runbook for safety issues
```

The `ops-safety` rule checks for:
- Interactive commands that block automation (`read`, `pause`)
- Destructive operations without rollback steps
- Missing verification after state-changing commands

### Create an Incident Report

```
Create an incident report for the API outage that started at 14:30
```

Uses the `incident.md` template. The agent fills in the timeline, impact, and creates placeholders for the root cause analysis to be completed after resolution.

### Create a Troubleshooting Tree

```
Create a troubleshooting guide for API 5xx errors
```

Uses the `troubleshooting.md` template with symptom-driven diagnosis branches.

## Next Steps

- Read the extensions guide to enable domain-specific capabilities: `@$AIWG_ROOT/agentic/code/frameworks/ops-complete/docs/extensions-guide.md`
- Review the YAML metalanguage spec for full kind vocabulary: `@$AIWG_ROOT/docs/yaml-metalanguage.md`
- Check the rules index for all enforcement rules: `@$AIWG_ROOT/agentic/code/frameworks/ops-complete/rules/RULES-INDEX.md`
- Review evidence governance and sink policy: `@$AIWG_ROOT/docs/ops-evidence-governance.md`
