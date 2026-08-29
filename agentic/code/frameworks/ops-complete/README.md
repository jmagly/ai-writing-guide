# ops-complete

Operational infrastructure framework for AIWG — providing structured workflows, templates, and agents for managing infrastructure operations.

## Overview

ops-complete is the base operational layer for AIWG, designed to make AI agents maximally effective when working inside operational repositories. It formalizes patterns proven across real-world ops repos (sysops, itops, devops, streamops).

## Architecture

```
ops-complete (base framework)
├── agents/       Core ops agents (runbook-executor, inventory)
├── commands/     Base ops commands
├── skills/       Shared operational skills (verify, audit-trail)
├── rules/        Operational enforcement rules
├── templates/    Base document templates (runbook, incident, troubleshooting)
└── schemas/      YAML metalanguage schemas (OpsInventory, OpsCapability, OpsPlaybook, etc.)
```

### Extensions (framework-dependent)

Extensions require ops-complete and cannot run standalone:

| Extension | Scope | Key Features |
|-----------|-------|--------------|
| `sys` | Per-host hardware, OS, boot chains, fleet docs | Host specs, fleet inventory, hardware safety rules |
| `it` | Asset management, CMDB, service deployments, DR | DR runbooks, provisioning, network state management |
| `dev` | CI/CD pipelines, build automation, fleet-wide tooling | CI builder patterns, pipeline safety, workflow templates |
| `stream` | Streaming infrastructure, transcoders, platform integrations | Stream service deployment, key safety, pipeline health |
| `repo-maintainer` | Role-aware repository maintenance | Permission-aware triage, PR review, labels, closures, merges, releases, threat-assessed handoff |

## Installation

```bash
# Base ops framework
aiwg use ops

# With extensions
aiwg use ops --ext sys          # + SysOps
aiwg use ops --ext sys,it,dev   # Classic trio
aiwg use ops --ext sys,it,dev,stream  # Full stack
aiwg use ops --ext repo-maintainer    # Role-aware repo maintenance
```

## YAML Metalanguage Design

ops-complete is the first AIWG framework built natively on the YAML metalanguage. Every ops artifact is a schema-validated YAML document using a Kubernetes-inspired envelope:

```yaml
apiVersion: ops.aiwg.io/v1
kind: OpsPlaybook
metadata:
  name: deploy-auth-stack
  namespace: production
  labels:
    tier: web
spec:
  # Desired state (kind-specific)
status:
  # Observed state (executor-written only)
```

### Kind Vocabulary

| Kind | Purpose | Inspired By |
|------|---------|-------------|
| `OpsInventory` | Fleet topology: groups, hosts, variables | Ansible inventory |
| `OpsCapability` | Reusable automation unit with I/O contract | Ansible role + Terraform contracts |
| `OpsPlaybook` | DAG of capability invocations against inventory | Argo Workflows + GitHub Actions |
| `OpsGate` | Human approval or quality checkpoint | AIWG HITL gate |
| `OpsTarget` | Single host, VM, container, or named resource | Ansible host + Backstage Component |
| `OpsSchedule` | Time-based trigger | GitHub Actions schedule |
| `OpsPipeline` | Composed sequence of playbooks | Argo WorkflowTemplate |
| `OpsExtension` | Framework-dependent extension manifest | AIWG addon |

### No Template Syntax

ops-complete uses structured `from:` references instead of template syntax (`{{ }}`):

```yaml
# Structured reference (always valid YAML):
inputs:
  - name: version
    from: vars.deploy_version
  - name: prev_version
    from: steps.health-check.outputs.current-version
```

### Variable Resolution: 3-Level Maximum

1. **Framework defaults** — from `OpsCapability` `defaults:` section
2. **Inventory/group** — from `OpsInventory` group `vars:`
3. **Instance** — from `OpsPlaybook` `vars:` or `OpsTarget` host `vars:`

## Core Components

### Rules

| Rule | Enforcement | Purpose |
|------|-------------|---------|
| `ops-documentation` | HIGH | Executable, idempotent, verified procedure format |
| `ops-safety` | CRITICAL | Interactive command detection, destructive operation gates |
| `ops-cross-repo` | HIGH | Scope validation, cross-repo reference format |
| `ops-issue-tracking` | MEDIUM | Label conventions, dependency tracking, phased work |

### Templates

| Template | Purpose |
|----------|---------|
| `runbook.md` | Step-by-step operational procedure with verification |
| `incident.md` | Incident report with timeline and RCA |
| `troubleshooting.md` | Symptom-driven diagnosis tree |

### Agents

| Agent | Purpose |
|-------|---------|
| `ops-runbook-executor` | Execute runbooks with verification at each step |
| `ops-inventory` | Fleet inventory collection and reconciliation |

### Skills

| Skill | Purpose |
|-------|---------|
| `ops-verify` | Post-procedure verification runner |
| `ops-audit-trail` | Track files modified, backups created, commands run |

## Creating Custom Extensions

A valid ops extension requires only an `ADDON.yaml` manifest:

```yaml
apiVersion: ops.aiwg.io/v1
kind: OpsExtension
metadata:
  name: netops
  labels:
    domain: network-operations
spec:
  extends: ops-complete
  description: "Network operations — switch configs, VLAN management, firewall rules"
  version: "1.0.0"
  capabilities: auto-discover
```

Drop it in `agentic/code/extensions/netops/` and add templates, rules, skills as needed. Auto-discovery scans conventional subdirectories.

Custom YAML kinds are declared under `spec.kinds` in `ADDON.yaml`, with schema
paths relative to the extension root. Run `npm run lint:ops-templates` to
validate every shipped extension YAML template and receive file-plus-pointer
diagnostics. See `docs/extensions-guide.md` for the complete contract.

## Relationship to Other Frameworks

| Framework | Relationship |
|-----------|-------------|
| `sdlc-complete` | Complementary — SDLC manages software lifecycle, ops manages infrastructure |
| `forensics-complete` | Consumer — forensics may run within ops context (incident response) |
| `media-curator` | Independent |
| `research-complete` | Independent |

## References

- Issue: #491
- YAML metalanguage: #447
- CI signal suppression: #490
- Extension system: `docs/extensions/overview.md`
- Existing framework pattern: `agentic/code/frameworks/sdlc-complete/`
