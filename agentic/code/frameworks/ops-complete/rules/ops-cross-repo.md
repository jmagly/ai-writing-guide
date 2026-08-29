---
enforcement: high
---

# Ops Cross-Repo Rules

**Enforcement Level**: HIGH
**Scope**: All work spanning sysops, itops, and devops repositories

## Principle

Operational work is distributed across multiple repositories with clear ownership boundaries. Work landing in the wrong repo creates confusion, breaks discoverability, and undermines the separation of concerns that keeps ops manageable. Every change must land in the correct repo, and every cross-repo reference must be unambiguous.

## Mandatory Rules

### Rule 1: Respect Scope Boundaries

Each ops repository owns a distinct domain. Work MUST land in the correct repo based on what it touches:

| Repository | Scope | Examples |
|------------|-------|----------|
| **sysops** | Per-host hardware, OS, host standup | Disk replacement on compute-03, BIOS update, OS install, host-specific networking, LUKS setup, ZFS pool for a specific machine |
| **itops** | Services, assets, CMDB, DR, monitoring | Service deployment, asset inventory, disaster recovery plans, Uptime Kuma config, DNS records, certificate management |
| **devops** | CI/CD, build pipelines, fleet-wide tooling | GitHub Actions, Gitea runners, container builds, fleet-wide Ansible roles, deployment automation, shared scripts |

**Boundary tests**:
- "Does this apply to one specific host's hardware/OS?" → **sysops**
- "Does this manage a service or asset across hosts?" → **itops**
- "Does this automate builds, deploys, or fleet-wide config?" → **devops**

### Rule 2: Flag Misplaced Work Before Committing

If work is about to land in the wrong repo, STOP and flag it before committing.

**Detection patterns**:
```markdown
# In sysops but looks like devops:
- Ansible roles that apply to all hosts (not host-specific)
- CI/CD pipeline definitions
- Container image builds

# In sysops but looks like itops:
- Service configuration (not host-level OS config)
- DNS or certificate management
- Monitoring rule definitions

# In devops but looks like sysops:
- Host-specific hardware troubleshooting
- Single-machine disk layout changes
- BIOS/firmware procedures for one machine

# In itops but looks like devops:
- Build pipeline definitions
- Fleet-wide deployment automation
```

**Required agent behavior**:
```markdown
SCOPE MISMATCH DETECTED

Current repo: roctinam/sysops
This work appears to belong in: roctinam/devops

Reason: Ansible role `common/docker-install` applies fleet-wide,
not to a specific host. Fleet-wide tooling belongs in devops.

Options:
1. Move this work to roctinam/devops
2. Override — keep in sysops with justification
3. Split — host-specific parts stay, fleet-wide parts move
```

### Rule 3: Use Fully Qualified Cross-Repo References

When referencing issues, commits, or files across repositories, ALWAYS use the fully qualified format. Bare `#15` is ambiguous across repos.

**FORBIDDEN**:
```markdown
# Ambiguous — which repo is #15 in?
See #15 for the disk layout.
Blocked by #42.
```

**REQUIRED**:
```markdown
# Fully qualified references
See roctinam/sysops#15 for the disk layout.
Blocked by roctinam/devops#42.
Related: roctinam/itops#8 (service dependency).
```

**Format**: `<org>/<repo>#<number>`

This applies to:
- Issue references in commit messages
- Issue references in other issue bodies
- Issue references in documentation
- PR references across repos

**Within the same repo**, bare `#N` is acceptable since context is unambiguous.

### Rule 4: Track Cross-Repo Dependencies

When work in one repo depends on or blocks work in another, declare the dependency explicitly in the issue body using `Blocks:` and `Blocked-by:` markers.

**Required format in issue bodies**:
```markdown
## Dependencies

Blocks: roctinam/devops#30 (fleet deploy depends on this host being ready)
Blocked-by: roctinam/sysops#22 (need disk replacement before OS install)
Related: roctinam/itops#8 (service will be migrated after host standup)
```

**Dependency types**:
- `Blocks:` — This issue must complete before the referenced issue can proceed
- `Blocked-by:` — This issue cannot proceed until the referenced issue completes
- `Related:` — Informational link, no execution dependency

### Rule 5: Maintain Host-to-Service Mapping Awareness

When working on host-level changes (sysops), be aware of what services run on that host (itops). When working on service changes (itops), be aware of which hosts are affected.

**Before host-level changes, check**:
```markdown
Host: compute-03
Services running on this host:
- PostgreSQL 14 (primary)
- Redis 7.2
- monitoring-agent

Impact assessment:
- Rebooting compute-03 will cause PostgreSQL failover
- Disk changes may affect PostgreSQL data directory
```

**Before service changes, check**:
```markdown
Service: PostgreSQL
Hosts involved:
- compute-03 (primary)
- compute-04 (replica)

Impact assessment:
- Config change affects both hosts
- Version upgrade requires coordinated maintenance window
```

### Rule 6: Gate Cross-Repository Disclosure

Correct repository ownership does not establish that a destination may receive the source artifact. Before copying content, committing a generated artifact, creating a cross-repo reference with operational detail, or exporting a bundle:

1. Resolve the source artifact's classification and handling metadata.
2. Resolve the destination repository as a named sink with known visibility.
3. Invoke the publication gate from `ops-information-governance`.
4. Require an artifact-and-sink-scoped approval when `crossRepo` is `approval-required` or the destination ceiling is lower.
5. If full disclosure is denied, use only the separately gated sanitized summary.

Unknown destination visibility fails closed for restricted artifacts. The gate audit contains artifact identity, sink, decision, and approval references only; never duplicate the payload.

## Detection

- Commits in sysops containing fleet-wide Ansible roles or CI/CD config
- Commits in devops containing single-host hardware procedures
- Bare `#N` references in cross-repo contexts (commit messages referencing issues from another repo)
- Missing `Blocks:`/`Blocked-by:` when cross-repo dependencies exist
- Host-level changes without service impact assessment
- Cross-repo content copied or referenced without a classification/sink decision

## Enforcement

- **On violation**: Flag before commit; suggest correct repo or reference format
- **Severity**: HIGH — misplaced work degrades operational discoverability and can cause missed dependencies
- **Recovery**: Move work to correct repo via new PR/issue; update references to fully qualified format; add missing dependency markers
