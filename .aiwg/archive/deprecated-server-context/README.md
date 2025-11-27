# Deprecated Server-Context Artifacts

**Archived**: 2025-11-26
**Reason**: AIWG deployment context rescoping

## Why These Files Were Archived

These artifacts were generated using generic SDLC templates that assumed a deployed server/API context. However, **AIWG is fundamentally a CLI tool and documentation framework**, not a deployed service.

### AIWG Deployment Context

**AIWG IS:**

- A documentation/template framework consumed by AI agents
- A local CLI tool (`aiwg`) installed on developer machines
- Markdown linters, validators, and analyzers
- Agent definitions deployed to user projects (`.claude/agents/`)
- A GitHub-distributed open source project

**AIWG IS NOT:**

- A deployed server or API
- A SaaS platform requiring uptime monitoring
- A containerized application (Docker/K8s)
- A service handling HTTP requests

## Archived Files

### Operations Runbooks (Server-Oriented)

| File | Original Purpose | Why Not Applicable |
|------|------------------|-------------------|
| `runbook-monitoring-alerting.md` | Prometheus, Grafana, PagerDuty, CloudWatch monitoring | AIWG has no server to monitor |
| `runbook-scaling-performance.md` | Autoscaling, load balancers, database connections | AIWG has no server to scale |
| `runbook-incident-response.md` | Server incident procedures | AIWG has no production server incidents |

### Hypercare Templates (Server-Oriented)

| File | Original Purpose | Why Not Applicable |
|------|------------------|-------------------|
| `hypercare-monitoring-plan.md` | Server health monitoring plan | AIWG has no server health to monitor |
| `daily-health-check-template.md` | API health checks | AIWG has no API |
| `weekly-summary-template.md` | Server metrics summary | AIWG has no server metrics |
| `issue-log-template.md` | Production incident tracking | Partially relevant, archived for clarity |

### Deployment Procedures (Server-Oriented)

| File | Original Purpose | Why Not Applicable |
|------|------------------|-------------------|
| `deployment-runbook.md` | EC2, ECS, Docker deployment | AIWG not containerized |
| `production-deployment-checklist.md` | Server deployment checklist | AIWG deploys via GitHub releases/npm |

### Duplicate Gate Directory

| Directory | Reason |
|-----------|--------|
| `construction-ioc-20251024-204657/` | Duplicate of `.aiwg/gates/construction-ioc/` - archived to reduce confusion |

## Important Distinction: Dogfooding

**AIWG is dogfooding itself** - using its own SDLC framework to manage its development.

This creates two distinct artifact layers:

| Layer | Scope | Status |
|-------|-------|--------|
| **AIWG Project Artifacts** (`.aiwg/`) | Specific to AIWG as a CLI tool | Rescoped to CLI context |
| **SDLC Framework Templates** (`agentic/.../templates/`) | Generic for ALL project types | Unchanged - kept server-capable |

The framework templates remain generic so users can apply AIWG to SaaS apps, APIs, and servers. Only the AIWG-specific project artifacts were rescoped.

## Reference

- **Rescoping Plan**: `.aiwg/planning/deployment-context-rescoping-plan.md`
- **CLI-Appropriate IOC Criteria**: See rescoping plan for revised gate criteria

## Recovery

If any of these artifacts are needed for reference or adaptation, they remain intact in this archive directory. The original file structure and content are preserved.
