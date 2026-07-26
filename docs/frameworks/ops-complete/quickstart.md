# ops-complete Quickstart

Deploy the ops-complete framework and write your first validated runbook in about 10 minutes.

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

## Extension Selection Guide

| If your repo contains... | Install these extensions |
|--------------------------|--------------------------|
| Per-host docs, hardware specs | `sys` |
| Asset inventory, DR runbooks, service deployments | `it` |
| CI/CD pipelines, build scripts | `dev` |
| Streaming services, transcoders | `stream` |

Extensions are additive. The base `ops` framework is always required; extensions cannot run standalone.

## Your First Runbook

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
  description: Restart the API service with pre-flight health checks and post-restart verification
  target:
    from: vars.target_host
  vars:
    service_name: api-gateway
    health_endpoint: "http://localhost:8080/health"
  steps:
    - name: pre-flight-check
      description: Verify service is currently running
      run: systemctl is-active {{ spec.vars.service_name }}
      verify:
        exitCode: 0
        message: "Service must be active before restart"

    - name: restart-service
      description: Restart the service
      run: systemctl restart {{ spec.vars.service_name }}
      rollback: systemctl start {{ spec.vars.service_name }}

    - name: wait-for-ready
      description: Wait for health endpoint to respond
      run: |
        for i in $(seq 1 10); do
          curl -sf {{ spec.vars.health_endpoint }} && exit 0
          sleep 3
        done
        exit 1
      verify:
        exitCode: 0
        message: "Health endpoint did not respond within 30 seconds"
```

Note: ops-complete uses structured `from:` references for variable sourcing; the `{{ }}` syntax above is only for illustration of intent — actual resolution uses the 3-level variable system described in the overview.

## Execute a Runbook

With the `ops-runbook-executor` agent deployed, you can run:

```
Execute the restart-api-service runbook against host web-01
```

The agent will:
1. Read the playbook
2. Resolve variables (framework defaults → inventory group → instance)
3. Execute each step, verifying the `verify:` condition before proceeding
4. Log all actions to the audit trail
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

Output includes: files modified, backups created, commands executed, and their exit codes.

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
