---
name: ops-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: Ops framework quick reference — runbooks, inventory, audit trail, verification, and the sys/it/dev/stream extension model
---

# Ops Framework — Quick Reference

You are operating in a project that has the AIWG **ops-complete** framework installed. This skill is your always-loaded directory for operational infrastructure work. The framework's full surface (especially via its extensions) is reachable through the AIWG artifact index.

## What this framework is for

Operational infrastructure scaffolding. Provides shared agents, schemas, templates, and rules for runbooks, fleet inventory, capability declarations, playbooks, and operational change. Designed to be extended with one or more of `sys` / `it` / `dev` / `stream` for domain-specific work.

## Base-framework skills

| Need | Skill |
|---|---|
| Audit trail of ops actions | `ops-audit-trail` |
| Verify a runbook step ran correctly | `ops-verify` |

The base framework intentionally ships a small skill surface. Domain-specific skills come with the **extensions** — install them with `aiwg use ops --ext sys,it,dev,stream`.

## Extension model

| Extension | Scope | Reach for when... |
|---|---|---|
| `sys` | Per-host hardware, OS, boot chains, fleet docs | Host profiling, hardware safety, boot/firmware inventory |
| `it` | Asset management, CMDB, service deployments, DR | DR runbooks, asset provisioning, network state |
| `dev` | CI/CD pipelines, build automation, fleet-wide tooling | Pipeline safety, CI builder patterns, workflow templates |
| `stream` | Streaming infrastructure, transcoders, platform integrations | Stream deploys, key safety, pipeline health |

Each extension contributes its own agents, skills, commands, rules. The full set of extension skills appears in the artifact index alongside ops-complete.

## Schemas

ops-complete is **schema-driven**. Key YAML metalanguage schemas:

- `OpsInventory` — fleet inventory (hosts / services / capabilities)
- `OpsCapability` — capability declarations (what the fleet can do)
- `OpsPlaybook` — multi-step operational procedures
- `Runbook` — single-task documented procedures
- `IncidentReport` — structured incident write-ups
- `TroubleshootingGuide` — symptoms → diagnostics → fixes

When generating ops artifacts, always validate against the schema (the framework ships schema files under `agentic/code/frameworks/ops-complete/schemas/`).

## Artifact directory layout

```
.aiwg/ops/
├── inventory/        # Fleet inventory snapshots
├── runbooks/         # Per-task runbooks
├── playbooks/        # Multi-step procedures
├── incidents/        # Incident reports
├── troubleshooting/  # Diagnostic guides
└── audit/            # Change/action audit trail
```

## Finding the right skill when this quickref doesn't list it

```bash
aiwg index discover "<phrase>"
```

Most ops skills come from the extensions, not the base framework. If the user's task doesn't match `ops-audit-trail` or `ops-verify`, check the index — and check which extensions are installed via `aiwg list`.

## Common multi-skill flows

- **Run a runbook with audit**: `ops-verify` (pre-checks) → execute steps → `ops-audit-trail` (log results)
- **Fleet inventory build**: install the `sys` extension → use its inventory skills
- **Incident response**: install the `it` extension → use its DR-runbook skills

## Ops ecosystem (cross-workspace)

ops-complete is also part of the broader AIWG ops ecosystem managed via `aiwg ops`:

```
aiwg ops init --workspace <name> --ext sys,it,dev   # bootstrap workspace
aiwg ops adopt <path>                               # register a pre-cloned repo
aiwg ops discover <path> --register                 # auto-find orphaned clones
aiwg ops status / list / use / push                 # standard lifecycle
```

Use `aiwg-utils-quickref` and the `aiwg ops` command for cross-workspace orchestration.

## Don't list from this skill — query the index

If a user asks "what ops skills are available?", **do not enumerate from memory**. Run `aiwg index discover --type skill --graph framework "ops"` (filtering for the installed extensions). This skill exists to orient.
