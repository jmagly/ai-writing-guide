# Activity Log Rule

**Enforcement Level**: MEDIUM
**Scope**: All agents that create, update, delete, or otherwise operate on `.aiwg/` artifacts
**Addon**: aiwg-utils (core, universal)

## Overview

Agents must append a single-line entry to `.aiwg/activity.log` whenever they perform a meaningful operation on AIWG artifacts. This produces a unified chronological timeline across all frameworks and sessions — making it possible to audit what happened, when, and why, without grepping individual framework logs.

## Problem Statement

Individual frameworks (SDLC, research, forensics) log internally, but no single file captures the cross-framework timeline:
- Post-mortem analysis requires stitching logs from multiple locations
- `aiwg activity-log show` has nothing to query when each framework writes only to its own directory
- Subagents silently create and delete artifacts with no record visible to the parent orchestrator
- Activity patterns (e.g., repeated failed deploys, orphaned archives) are invisible without a unified stream

## When to Apply

Append an entry to `.aiwg/activity.log` whenever an agent:
- Creates a new artifact in `.aiwg/` (use case, ADR, test plan, schema, etc.)
- Updates an existing artifact (edit, patch, version bump)
- Deletes or archives an artifact
- Ingests external data into `.aiwg/` (from codebase scan, external source, etc.)
- Deploys a framework or artifact to a provider
- Promotes an artifact to a baselined or released state
- Runs a lint or validation pass on `.aiwg/` content
- Queries the artifact index or activity log itself (only when the result is actioned)

Do NOT append when:
- Reading artifacts for context only (no write side-effect)
- The operation is a no-op (file unchanged, deploy already current)
- The environment variable `AIWG_SKIP_ACTIVITY_LOG=1` is set

## Log Entry Format

Each entry is exactly one line:

```
## [YYYY-MM-DD HH:MM] <operation> | <summary>
```

**Operation tokens** (use exactly one):

| Token | When to use |
|-------|-------------|
| `ingest` | Pulling external content into `.aiwg/` |
| `create` | New artifact written for the first time |
| `update` | Existing artifact modified |
| `delete` | Artifact removed or permanently pruned |
| `query` | Index or log query that drove a downstream action |
| `lint` | Validation or lint pass run against artifacts |
| `deploy` | Framework or artifact pushed to a provider |
| `archive` | Artifact moved to an archive location |
| `promote` | Artifact baselined, released, or version-bumped |

**Summary**: One sentence, ≤120 characters. Include the artifact path or operation target when relevant.

### Examples

```
## [2026-04-12 14:33] create | .aiwg/requirements/UC-007-password-reset.md (User Registration epic)
## [2026-04-12 14:41] update | .aiwg/architecture/software-architecture-doc.md — added section 4.3 caching layer
## [2026-04-12 15:02] deploy | sdlc-complete framework deployed to copilot provider
## [2026-04-12 15:18] lint | ran mention-validate across .aiwg/requirements/ — 2 broken refs fixed
## [2026-04-12 16:00] promote | .aiwg/architecture/adr-005.md baselined after security-architect approval
## [2026-04-12 16:45] archive | .aiwg/working/sad-draft-v0.1.md archived to .aiwg/archive/sad/
## [2026-04-12 17:10] delete | .aiwg/working/ pruned — 14 temp files removed (workspace-prune-working)
```

## Mandatory Rules

### Rule 1: Append, Never Overwrite

**FORBIDDEN**:
```
Agent overwrites .aiwg/activity.log with only the current session's entries
Agent truncates the log before writing
```

**REQUIRED**:
```
Agent appends to .aiwg/activity.log — existing history is never modified
```

Create the file if it does not exist. Never rewrite history.

### Rule 2: Write After the Operation, Not Before

**FORBIDDEN**:
```
Agent appends log entry → attempts operation → operation fails → log entry is stale
```

**REQUIRED**:
```
Agent performs operation → operation succeeds → agent appends log entry
```

Only log completed operations. If an operation fails, do not log it (the failure is implicit in the absence of a success entry).

### Rule 3: One Entry Per Logical Operation

Batch operations count as one entry with an aggregate summary:

```
## [2026-04-12 14:55] create | 3 use cases created: UC-008, UC-009, UC-010 (checkout flow)
```

Do not emit one entry per file when files are created as a batch in a single workflow step.

### Rule 4: Non-Blocking

A failure to write the activity log entry must never block or fail the primary operation. Log the write failure to stderr and continue.

## Append Pattern

**Preferred** — the AIWG CLI (#964 wires this through `resolveStorage('activity_log')`, so the entry honors `.aiwg/storage.config` redirection):

```bash
aiwg activity-log append <operation> "<summary>"
```

**Fallback** — when the AIWG CLI isn't available (legacy / minimal-environment agents):

```bash
echo "## [$(date -u '+%Y-%m-%d %H:%M')] <operation> | <summary>" >> .aiwg/activity.log
```

When running as an agent without shell access, use the Write tool in append mode or read the file and append the new line before writing back. On the default `fs` backend, both paths produce byte-identical output.

## Checklist

After any qualifying operation, verify:

- [ ] Operation completed successfully before appending
- [ ] Entry uses the correct format: `## [YYYY-MM-DD HH:MM] <operation> | <summary>`
- [ ] Operation token is one of the nine defined tokens
- [ ] Summary is ≤120 characters and identifies the artifact or target
- [ ] Appended — did not overwrite prior entries
- [ ] Write failure did not block the primary operation

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/activity-log/SKILL.md — Query and manage the activity log
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/post-commit-index-refresh.md — Parallel post-operation housekeeping pattern
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Measurable completion conditions

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-04-12
