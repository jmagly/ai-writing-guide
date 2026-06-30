---
enforcement: medium
---

# Post-Commit Index Refresh Rule

**Enforcement Level**: MEDIUM
**Scope**: All agents that commit code in AIWG-managed projects
**Addon**: aiwg-utils (core, universal)

## Overview

After a successful git commit, agents must check whether artifact indices are configured for the project and rebuild any indices whose source paths were touched by the commit. Stale indices cause `aiwg index query` to return outdated results, mislead downstream agents, and silently corrupt traceability chains. Refreshing after each clean commit keeps indices current with negligible workflow overhead.

## Problem Statement

Agents frequently commit code and declare work done without refreshing artifact indices:
- `aiwg index query` returns stale results that no longer reflect the committed state
- Downstream agents make decisions based on outdated traceability data
- Index drift accumulates silently until a full rebuild is forced by a human
- The cost of an incremental `aiwg index build` is far lower than the cost of acting on bad index data

## When to Apply

After every successful `git commit` in a project where any of the following are true:
- `.aiwg/index/` directory exists
- `.aiwg/graphs/` directory contains user-defined graph configs
- `agentic/code/` directory exists (indicates an AIWG-managed project with a framework graph)

Do NOT apply when:
- No indices are configured (none of the detection conditions above are met)
- The commit only touched files outside all indexed path scopes (see Scope Mapping below)
- The `--no-index` flag was passed to the commit command
- The environment variable `AIWG_SKIP_INDEX=1` is set

## Mandatory Rules

### Rule 1: Detect Before Rebuilding

**FORBIDDEN**:
```
Agent commits → immediately skips index check
Agent commits → blindly runs `aiwg index build` even when no indices exist
```

**REQUIRED**:
```
Agent commits → checks detection conditions → determines which graphs are affected
→ runs `aiwg index build` only for affected graphs → continues workflow
```

Detection check (in order):
1. Does `.aiwg/index/` exist? If yes, project graph is active.
2. Does `.aiwg/graphs/` contain any `.yaml` or `.json` files? If yes, user-defined graphs are active.
3. Does `agentic/code/` exist? If yes, framework graph is active.

If none of the above are true, skip the refresh entirely.

### Rule 2: Map Committed Paths to Affected Graphs

Only rebuild graphs whose source paths were touched by the commit. Rebuilding unaffected graphs wastes time.

| Committed file path pattern | Graph to rebuild |
|-----------------------------|-----------------|
| `.aiwg/**` | project graph |
| `agentic/code/**` | framework graph |
| `src/**`, `test/**`, `*.ts`, `*.js` | codebase graph |
| Paths matching a user-defined graph config | that user graph |

**FORBIDDEN** (over-broad rebuild):
```
Commit touches only src/utils/helper.ts
Agent runs full rebuild of project graph and framework graph
```

**REQUIRED** (targeted rebuild):
```
Commit touches only src/utils/helper.ts
Agent identifies: src/** → codebase graph only
Agent runs: aiwg index build (incremental, targets codebase graph)
```

When a commit touches files matching multiple scopes, rebuild all matching graphs in a single invocation — `aiwg index build` is incremental by default and handles multiple graph types in one pass.

### Rule 3: Run After Commit, Not Before

Index refresh is a post-commit step. It must never gate or delay the commit itself.

**FORBIDDEN**:
```
Agent builds index → verifies index → then commits
Agent refuses to commit until index is clean
```

**REQUIRED**:
```
Agent commits → commit succeeds → agent runs aiwg index build → continues
```

If the index build fails, log the failure and continue. A failed index refresh does not invalidate the commit. Report the failure so a human can investigate, but do not roll back or revert.

### Rule 4: Incremental by Default

Run `aiwg index build` without `--force`. Incremental mode processes only changed artifacts and completes significantly faster than a full rebuild.

**FORBIDDEN**:
```
aiwg index build --force   # full rebuild after every commit
```

**REQUIRED**:
```
aiwg index build           # incremental (default)
```

Reserve `--force` for explicit user requests or after major structural changes (e.g., directory reorganization, framework reinstall).

### Rule 5: Non-Blocking Execution

The index refresh must not block workflow. Run it as the final step after the commit is confirmed successful — do not await its result before returning control to the user or continuing orchestration.

If running in a subagent context, fire the index build as a background step or report it as a follow-up action for the parent orchestrator to dispatch.

## Detection Pattern

```
After git commit exits with code 0:

1. Check: ls .aiwg/index/ 2>/dev/null → exists? → project graph active
2. Check: ls .aiwg/graphs/*.{yaml,json} 2>/dev/null → exists? → user graphs active
3. Check: ls agentic/code/ 2>/dev/null → exists? → framework graph active

If at least one graph is active:
  4. Inspect committed file paths (git diff --name-only HEAD~1 HEAD)
  5. Map paths to affected graphs (see Rule 2 table)
  6. If affected graphs found: run aiwg index build
  7. Log result; do not block on failure
```

## Skip Conditions Summary

| Condition | Action |
|-----------|--------|
| No `.aiwg/index/`, `.aiwg/graphs/`, or `agentic/code/` | Skip entirely |
| Commit only touched files outside all indexed path scopes | Skip entirely |
| `AIWG_SKIP_INDEX=1` environment variable is set | Skip entirely |
| `--no-index` flag passed | Skip entirely |
| `git commit` exited with non-zero code (commit failed) | Skip — no refresh on failed commits |

## Integration with Workflow Agents

Agents that include commit steps in their workflows (e.g., `commit-and-push` skill, SDLC construction phase agents) must add the post-commit index refresh as a final step in their task sequence.

```
Workflow step: Commit changes
→ Run: git commit -m "..."
→ On success: detect indices → rebuild affected graphs → continue
→ On failure: stop and report commit failure (do not attempt index refresh)
```

## Checklist

After a successful commit, verify:

- [ ] Checked detection conditions — at least one index is configured
- [ ] Mapped committed file paths to affected graphs
- [ ] Ran `aiwg index build` (incremental) for affected graphs only
- [ ] Did not block the commit itself on index refresh
- [ ] Did not force a full rebuild unnecessarily
- [ ] Logged any index build failure without reverting the commit

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md - Research before acting on index data
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md - Measurable completion conditions
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/commit-and-push.md - Commit workflow that triggers this rule

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-04-10
