---
enforcement: medium
---

# Ops Issue Tracking Rules

**Enforcement Level**: MEDIUM
**Scope**: Issue creation, labeling, and progress tracking across ops repositories

## Principle

Consistent issue tracking makes operational work searchable, filterable, and auditable. Standard labels, phased work patterns, and commit-issue linking turn a pile of tickets into an operational history that anyone can navigate — including agents.

## Mandatory Rules

### Rule 1: Use Standard Label Format

All ops issues MUST use the standard label taxonomy. Labels follow a `category: value` format with consistent casing.

**Required label categories**:

| Category | Format | Values | Example |
|----------|--------|--------|---------|
| **host** | `host: <hostname>` | Actual hostname | `host: compute-03` |
| **priority** | `priority: <level>` | critical, high, medium, low | `priority: high` |
| **area** | `area: <domain>` | storage, network, security, monitoring, backup, compute, services | `area: storage` |
| **status** | `status: <state>` | blocked, in-progress, needs-review, waiting-on-parts | `status: blocked` |
| **type** | `type: <kind>` | incident, maintenance, migration, standup, decommission | `type: migration` |
| **release** | `release/<version>` | CalVer version | `release/v2026.3.3` |

**Label rules**:
- Use lowercase for all label values
- One `priority:` label per issue (required)
- One or more `host:` labels if host-specific (required for sysops)
- One or more `area:` labels (required)
- `status:` labels updated as work progresses
- `type:` label assigned at creation

**FORBIDDEN**:
```
# Inconsistent casing and format
Host: Compute-03
PRIORITY: HIGH
storage
```

**REQUIRED**:
```
host: compute-03
priority: high
area: storage
type: maintenance
```

### Rule 2: Use Phased Work Breakdown for Multi-Step Operations

Large operational tasks (migrations, host standup, decommissions) MUST be broken into sequential phased issues. Each phase is a separate issue with explicit dependencies.

**Pattern**:
```markdown
# Phase 1: Preparation
Title: [compute-03] ZFS migration phase 1: backup and validation
Labels: host: compute-03, area: storage, type: migration, priority: high
Body:
  ## Objective
  Back up existing data and validate backup integrity.

  ## Dependencies
  Blocked-by: (none — first phase)
  Blocks: roctinam/sysops#16 (phase 2: partition and pool creation)

  ## Acceptance Criteria
  - [ ] Full backup completed to /backup/compute-03/
  - [ ] Backup integrity verified with checksums
  - [ ] Backup size matches source within 5%

---

# Phase 2: Execution
Title: [compute-03] ZFS migration phase 2: partition and pool creation
Labels: host: compute-03, area: storage, type: migration, priority: high
Body:
  ## Dependencies
  Blocked-by: roctinam/sysops#15 (phase 1: backup)
  Blocks: roctinam/sysops#17 (phase 3: data migration)

---

# Phase 3: Migration
Title: [compute-03] ZFS migration phase 3: data restore and verification
Labels: host: compute-03, area: storage, type: migration, priority: high
Body:
  ## Dependencies
  Blocked-by: roctinam/sysops#16 (phase 2: pool creation)
```

**Phase naming convention**: `[hostname] <operation> phase N: <description>`

### Rule 3: Link Commits to Issues

Every commit that addresses an ops issue MUST reference the issue in the commit message using conventional commit format.

**Required format**:
```
type(scope): subject

Body text explaining what and why.

Refs: roctinam/sysops#15
```

**Closing keywords** (when the commit completes the issue):
```
fix(compute-03): repair ZFS pool degraded mirror

Replaced failed drive /dev/sdb, resilvered pool.

Closes: roctinam/sysops#15
```

**Valid closing keywords**: `Closes:`, `Fixes:`, `Resolves:`

**Cross-repo commits**:
```
feat(ansible): add ZFS monitoring role

Fleet-wide ZFS health monitoring via node_exporter.

Refs: roctinam/sysops#15
Closes: roctinam/devops#30
```

### Rule 4: Track Progress Through Issue Comments

For multi-step procedures, post progress updates as issue comments at each significant checkpoint. This creates an audit trail and allows others to see current status without asking.

**Progress comment format**:
```markdown
## Progress Update — 2026-03-24 14:30

### Completed
- [x] Backed up /data to /backup/compute-03/ (45 GB, sha256 verified)
- [x] Confirmed backup accessible from recovery host

### In Progress
- [ ] Partitioning new drives (ETA: 15 min)

### Blocked
- (none)

### Next Steps
1. Create ZFS pool after partitioning
2. Begin data restore
```

**When to post updates**:
- After completing each major step
- When encountering a blocker
- When handing off to another person or agent
- Before and after any destructive operation

### Rule 5: Cross-Repo Issue References in Context

When creating issues that relate to work in other repos, include the cross-repo context in a Dependencies section. Follow the fully qualified reference format from ops-cross-repo rules.

**Required in issue body when cross-repo dependencies exist**:
```markdown
## Dependencies

Blocks: roctinam/devops#30 (fleet monitoring deploy)
Blocked-by: roctinam/itops#12 (DNS record creation)
Related: roctinam/sysops#18 (similar migration on compute-04)
```

## Detection

- Issues missing required labels (priority, area)
- sysops issues missing `host:` label
- Multi-step operations in a single issue instead of phased breakdown
- Commits touching ops repos without issue references
- Large issues with no progress comments over 48 hours
- Inconsistent label format (wrong casing, missing category prefix)

## Enforcement

- **On violation**: Flag during issue creation or commit review
- **Severity**: MEDIUM — inconsistency degrades searchability and audit trails but does not cause operational harm
- **Recovery**: Add missing labels, split oversized issues into phases, update commit messages with issue references on next commit
