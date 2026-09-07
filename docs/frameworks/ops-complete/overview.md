# ops-complete Overview

ops-complete helps teams turn operational work into executable, reviewable runbooks and inventories. Use it for
sysops, itops, devops, streamops, and repository maintenance where commands must be scoped, verified, and recorded.

## Common Use Cases

- Convert a manual deployment checklist into an idempotent runbook with verification.
- Capture fleet inventory and the variables needed for repeatable operations.
- Prepare incident, troubleshooting, or disaster-recovery artifacts with evidence boundaries.
- Extend the base workflow for host, IT, CI/CD, or streaming infrastructure operations.

## What It Is

Operational work differs from application development: procedures must be idempotent and verifiable, commands may be
destructive, and context spans multiple hosts or systems. ops-complete addresses this by providing:

- A Kubernetes-inspired YAML artifact format for all operational documents
- Enforcement rules that catch dangerous patterns (interactive commands, missing verification steps)
- Agents that can execute runbooks with per-step verification
- Templates for runbooks, incident reports, and troubleshooting trees
- A composable extension system for domain-specific operations
- A mandatory evidence boundary for minimization, redaction, classification, publication, retention, and disposal

## The YAML Metalanguage

ops-complete is built natively on the AIWG YAML metalanguage. Every operational artifact uses a Kubernetes-style envelope:

```yaml
apiVersion: ops.aiwg.io/v1
kind: OpsPlaybook
metadata:
  name: deploy-auth-stack
  namespace: production
  labels:
    tier: web
spec:
  # Desired state (kind-specific fields)
status:
  # Observed state — written by the executor, not the author
```

The `kind` field determines the schema. Available kinds:

| Kind | Purpose | Analogous To |
|------|---------|--------------|
| `OpsInventory` | Fleet topology: groups, hosts, variables | Ansible inventory |
| `OpsCapability` | Reusable automation unit with I/O contract | Ansible role |
| `OpsPlaybook` | DAG of capability invocations against inventory | Argo Workflows |
| `OpsGate` | Human approval or quality checkpoint | AIWG HITL gate |
| `OpsTarget` | Single host, VM, container, or named resource | Ansible host |
| `OpsSchedule` | Time-based trigger | GitHub Actions schedule |
| `OpsPipeline` | Composed sequence of playbooks | Argo WorkflowTemplate |
| `OpsExtension` | Framework-dependent extension manifest | AIWG addon |

All artifacts use structured `from:` references instead of template syntax like `{{ }}`, keeping every file valid YAML regardless of whether it has been rendered.

## Variable Resolution

Variables resolve in a 3-level hierarchy (later levels override earlier):

1. **Framework defaults** — `OpsCapability` `defaults:` section
2. **Inventory/group** — `OpsInventory` group `vars:`
3. **Instance** — `OpsPlaybook` `vars:` or `OpsTarget` host `vars:`

There is no deeper nesting. This keeps resolution predictable during AI-assisted execution.

## Core Extensions

Extensions require ops-complete and cannot run standalone. They add domain-specific agents, templates, and rules on top of the base framework.

| Extension | Scope |
|-----------|-------|
| `sys` | Per-host hardware, OS, boot chains, fleet documentation |
| `it` | Asset management, CMDB, service deployments, disaster recovery |
| `dev` | CI/CD pipelines, build automation, fleet-wide tooling |
| `stream` | Streaming infrastructure, transcoders, platform integrations |

See `@$AIWG_ROOT/agentic/code/frameworks/ops-complete/docs/extensions-guide.md` for details on each extension.

## Core Components

### Rules

| Rule | Level | Purpose |
|------|-------|---------|
| `ops-safety` | CRITICAL | Detect interactive commands; gate destructive operations |
| `ops-information-governance` | CRITICAL | Gate every response, persistence, tracker, repository, cross-repo, and export sink |
| `ops-documentation` | HIGH | Enforce executable, idempotent, verified procedure format |
| `ops-cross-repo` | HIGH | Validate scope; enforce cross-repo reference format |
| `ops-issue-tracking` | MEDIUM | Label conventions, dependency tracking, phased work |

The `ops-safety` rule is the most important. It catches patterns like `read -p "Are you sure?"` in runbooks, commands that lack rollback steps, and procedures that modify production state without verification.

`ops-information-governance` is the mandatory confidentiality/lifecycle boundary. It resolves classification, defaults durable records to minimum sufficient evidence, sanitizes complete text streams and nested objects, rejects unknown or under-trusted sinks, and attaches retention/disposition metadata before any payload is written or submitted. The public API and project policy format are documented in `@$AIWG_ROOT/docs/ops-evidence-governance.md`.

### Agents

| Agent | Purpose |
|-------|---------|
| `ops-runbook-executor` | Execute runbooks step by step with verification at each step |
| `ops-inventory` | Collect and reconcile fleet inventory |

### Skills

| Skill | Purpose |
|-------|---------|
| `ops-verify` | Run post-procedure verification |
| `ops-audit-trail` | Track files modified, backups created, commands run |
| `aiwg ops evidence prepare` | Prepare and gate collected output before any sink |

### Templates

| Template | Purpose |
|----------|---------|
| `runbook.md` | Step-by-step procedure with prerequisite checks, steps, and verification |
| `incident.md` | Incident report with timeline, impact assessment, and root cause analysis |
| `troubleshooting.md` | Symptom-driven diagnosis tree |

## Relationship to Other Frameworks

ops-complete is complementary to sdlc-complete, not a replacement. SDLC manages software lifecycle artifacts; ops-complete manages infrastructure artifacts. They can coexist in the same project — the artifact directories do not overlap.

Forensics-complete can run within an ops context for incident response workflows.

## Creating Custom Extensions

A minimal ops extension requires only an `ADDON.yaml` manifest placed in `agentic/code/extensions/<name>/`:

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

Auto-discovery scans for templates, rules, and skills in conventional subdirectories. Add them as needed.

Extensions that introduce YAML resource kinds must register each kind in
`ADDON.yaml` with a schema path relative to the extension root. The conformance
gate discovers every extension YAML template and resolves custom kinds without
requiring a core-framework edit. See `docs/extensions-guide.md` for the manifest
contract, validator command, and structured reference rules.

## References

- [Quickstart](quickstart.md) — Deploy and first steps
- [Extensions guide](extensions-guide.md) — Extension details
- [YAML metalanguage](https://github.com/jmagly/aiwg/blob/main/docs/yaml-metalanguage.md) — Full YAML metalanguage specification
- `@$AIWG_ROOT/agentic/code/frameworks/ops-complete/rules/RULES-INDEX.md` — All ops rules
- [Ops evidence governance](https://github.com/jmagly/aiwg/blob/main/docs/ops-evidence-governance.md) — Redaction,
  publication, retention, and disposal contract
