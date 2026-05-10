---
name: ops-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: AUTO-INVOKE when user mentions ops, runbook, inventory, audit trail, ops repo, sysops, devops, itops, infrastructure operations, fleet management. Ops framework quick reference — capability domains, extension model, and discovery phrases for runbooks, inventory, audit trail, verification.
---

# Ops Framework — Quick Reference

This is your always-loaded directory for the AIWG **ops-complete** framework. It does **not** list every skill. The framework is small (2 base skills) but extends via `sys` / `it` / `dev` / `stream` extensions — discovery is how you find the extension surface.

## Canonical access pattern: discover → show

When you find a candidate via `aiwg discover`, fetch its body with `aiwg show <type> <name>`. **Never** use `find`, `ls`, `Glob`, or direct `Read` on `<provider>/skills/` paths — those reflect the kernel-pivot deploy state, not the full surface.

```bash
aiwg discover "<phrase>"             # find — returns ranked candidates
aiwg show skill <name>               # fetch — streams the SKILL.md body
```

If your platform's Skill tool errors on a non-kernel skill (expected — most aren't kernel), the fallback is `aiwg show`, never filesystem browsing. Last-resort if `aiwg` itself is broken: read directly from `$AIWG_ROOT/agentic/code/...` (the canonical corpus, always present).

## How to use this quickref

1. Identify the **capability domain** the user's need belongs to
2. Pick a **curated phrase** from that domain (or paraphrase the user's words)
3. Run `aiwg discover "<phrase>"` and surface the top match to the user

**Do not enumerate skills from memory.** The extension surface is large and only `aiwg list` + `aiwg discover` show what's actually installed.

## What this framework is for

Operational infrastructure scaffolding. Provides shared agents, schemas, templates, and rules for runbooks, fleet inventory, capability declarations, playbooks, and operational change. Designed to be extended with one or more of `sys` / `it` / `dev` / `stream` for domain-specific work.

## Capability domains

| Domain | Covers | Where it lives |
|---|---|---|
| **Base operations** | Audit trails, runbook step verification | `ops-complete` (always) |
| **Per-host / OS** | Hardware, OS, boot chains, fleet docs | `sys` extension |
| **IT / CMDB** | Asset management, service deployments, DR runbooks | `it` extension |
| **CI/CD** | Pipelines, build automation, fleet-wide tooling | `dev` extension |
| **Streaming infra** | Transcoders, platform integrations, key safety | `stream` extension |

## Curated discovery phrases

### Base operations

```bash
aiwg discover "ops audit trail"                # → ops-audit-trail
aiwg discover "ops verify"                     # → ops-verify
```

### Inventory & playbooks (schema-driven, framework-wide)

```bash
aiwg discover "ops inventory"                  # → ops (top-level command + related schemas)
aiwg discover "ops playbook"                   # → ops (playbook schemas)
```

### Extension-specific (after `aiwg use ops --ext <name>`)

```bash
# After --ext sys
aiwg discover "host profile"                   # → sys extension skills
aiwg discover "fleet inventory"                # → sys extension skills

# After --ext it
aiwg discover "DR runbook"                     # → it extension skills
aiwg discover "asset provisioning"             # → it extension skills

# After --ext dev
aiwg discover "CI builder pattern"             # → dev extension skills
aiwg discover "pipeline safety"                # → dev extension skills

# After --ext stream
aiwg discover "stream service deployment"      # → stream extension skills
aiwg discover "transcoder health"              # → stream extension skills
```

## Schemas

ops-complete is **schema-driven**. Key YAML metalanguage schemas:

- `OpsInventory` — fleet inventory (hosts / services / capabilities)
- `OpsCapability` — capability declarations (what the fleet can do)
- `OpsPlaybook` — multi-step operational procedures
- `Runbook` — single-task documented procedures
- `IncidentReport` — structured incident write-ups
- `TroubleshootingGuide` — symptoms → diagnostics → fixes

When generating ops artifacts, validate against the schema (the framework ships schema files under `agentic/code/frameworks/ops-complete/schemas/`).

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

## Ops ecosystem (cross-workspace)

ops-complete is also part of the broader AIWG ops ecosystem managed via `aiwg ops`:

```bash
aiwg ops init --workspace <name> --ext sys,it,dev   # bootstrap workspace
aiwg ops adopt <path>                               # register a pre-cloned repo
aiwg ops discover <path> --register                 # auto-find orphaned clones
aiwg ops status / list / use / push                 # standard lifecycle
```

## When the curated phrases don't fit

```bash
aiwg discover "<your need, paraphrased>" --limit 5
```

If you don't see ops-related results, the user likely needs to install an extension (`aiwg use ops --ext sys` etc.).

## Anti-pattern: don't enumerate

If a user asks "what ops skills are available?", **do not list from this skill or memory**. Run:

```bash
aiwg list                           # show installed extensions
aiwg discover --type skill "<area>" # find specific skills
```
