# Issue-Driven Ralph Loop Design

## Problem Statement

When users need to work through open issues (bugs, feature requests, etc.), the current workflow is:
1. Manually read each issue
2. Ask the agent to fix it
3. Hope the agent does it right in one shot
4. Manually update the issue with results

This is fragile, opaque, and doesn't leverage the issue thread as a collaboration surface. The agent works silently, doesn't report progress, doesn't scan for human feedback, and doesn't track work back to the issue.

## Concept: Issue Thread as Shared Memory

The core insight from production usage is that **the issue thread should be the collaboration interface** between human and agent. Each ralph cycle:

1. **Posts a structured status comment** to the issue thread (progress, blockers, task checklist)
2. **Scans all thread comments** for new human input (feedback, corrections, approvals)
3. **Responds substantively** to any human feedback found
4. **Checkpoints state** so work survives crashes

This transforms the issue tracker from a passive record into an active 2-way collaboration surface. The human can monitor and steer agent work asynchronously by commenting on the issue — no need to be in the same terminal session.

## Prompt Fragment (Proven Effective)

The following suffix has been used successfully in production:

```
[RALPH LOOP ENFORCED per AIWG guide: Invoke /ralph or /ralph-external mode
immediately with --completion "issue resolved: tests pass / PR ready / docs
updated / all thread feedback addressed". Run full loop relentlessly until
completion criteria met. EVERY cycle: 1. Post markdown status comment (prefix
**RALPH CYCLE #N – [Progress/Blocked/Review Needed]**) summarizing actions,
results, blockers, updated task list (markdown checklist/table, versioned).
2. Scan ALL thread comments, replies, reactions for new input. 3. Respond
substantively & immediately to any relevant feedback/questions/suggestions
(acknowledge, incorporate, clarify, escalate if blocked). No silence—treat
thread as shared memory. Checkpoint state if supported. Max 6-8 cycles per
response; resume on next invocation. Prioritize fast 2-way human-AI collab
over silent work. Begin Ralph Loop now.]
```

## Proposed Feature: `/address-issues` Command

### Usage

```bash
# Address specific issues
/address-issues 17 18 19

# Address by filter
/address-issues --filter "status:open label:bug assignee:me"

# Address all open issues
/address-issues --all-open

# With options
/address-issues 17 --max-cycles 8 --provider gitea --interactive
```

### Behavior

1. **Fetch issues** — Query the configured issue tracker (Gitea/GitHub/etc.)
2. **For each issue**, spawn an issue-driven ralph loop:
   a. Read the issue body, comments, and labels
   b. Determine the work needed (bug fix, feature, docs, etc.)
   c. Begin ralph cycle loop:
      - **Cycle N**: Do work, post status comment to issue, scan for feedback
      - **If human commented**: Incorporate feedback, acknowledge in next comment
      - **If blocked**: Post blocker comment, move to next issue or wait
      - **If resolved**: Post completion summary, optionally close issue
3. **Aggregate results** — Summary of all issues addressed

### Cycle Status Comment Format

Posted to the issue thread each cycle:

```markdown
**RALPH CYCLE #3 – Progress**

### Actions This Cycle
- Fixed null check in `validateToken()` (src/auth/token.ts:42)
- Added regression test covering the reported edge case
- Ran full test suite — 247 passed, 0 failed

### Task Checklist
- [x] Reproduce the bug
- [x] Identify root cause
- [x] Implement fix
- [x] Add regression test
- [ ] Update documentation
- [ ] Final review

### Blockers
None

### Next Steps
Update API documentation to reflect the new validation behavior.

---
*Automated by AIWG Ralph Loop — reply to this issue to provide feedback*
```

### Thread Scanning Protocol

Each cycle, the agent:

1. **Fetches all comments** on the issue since the last cycle
2. **Classifies each comment**:
   - Human feedback → incorporate into next cycle
   - Human question → answer in next status comment
   - Human approval → proceed / close
   - Human correction → adjust approach
   - Bot/automated → ignore
3. **Acknowledges** all human input in the next status comment

### Completion Criteria

An issue is considered resolved when ALL of:
- The fix/feature is implemented
- Tests pass
- Documentation updated (if needed)
- All thread feedback addressed
- No unresolved blocker comments

### Multi-Issue Coordination

When addressing multiple issues:

| Strategy | When to Use |
|----------|-------------|
| Sequential | Default — address one at a time, safest |
| Batched | Group related issues (same module/area) |
| Parallel | Independent issues, respects context budget |

Parallel execution respects `AIWG_CONTEXT_WINDOW` limits per the context-budget rule.

## Integration Points

### Existing Infrastructure Used

| Component | How Used |
|-----------|----------|
| `ralph` / `ralph-external` | Core loop engine |
| `issue-list` | Fetch issues by filter |
| `issue-comment` | Post cycle status comments |
| `issue-update` | Update issue status/labels |
| `issue-close` | Close resolved issues |
| `issue-sync` | Link commits to issues |
| Gitea MCP tools | API access for issue operations |

### New Components Needed

| Component | Purpose |
|-----------|---------|
| `/address-issues` command | Entry point — parse args, fetch issues, orchestrate |
| Issue-driven ralph skill | The cycle logic — work + post + scan + respond |
| Thread scanner | Parse issue comments, classify, extract feedback |
| Cycle comment template | Structured markdown for status comments |

## Design Decisions

### Why a command, not just a prompt fragment?

The prompt fragment works but requires the user to paste ~200 tokens every time. A command:
- Is invocable with `/address-issues 17`
- Encodes the cycle protocol so agents follow it consistently
- Configurable (max cycles, provider, interactive mode)
- Discoverable via `/help`

### Why post to the issue thread?

- **Asynchronous collaboration** — human doesn't need to be in the terminal
- **Audit trail** — all work is logged on the issue
- **Remote steering** — human can redirect by commenting
- **Visibility** — team can see what the agent is doing
- **Persistence** — survives session crashes

### Why scan for feedback?

Without scanning, the agent works in a vacuum. The user's #1 complaint is "I told it something in the issue thread and it ignored me." Scanning makes the issue thread a true shared memory space.

## Relationship to Existing Commands

```
/address-issues 17 18 19
    │
    ├── For issue #17:
    │   ├── /issue-list (fetch details)
    │   ├── /ralph (execute work loop)
    │   │   ├── Cycle 1: analyze + implement
    │   │   │   └── /issue-comment #17 (post status)
    │   │   ├── Cycle 2: test + refine
    │   │   │   ├── scan thread for feedback
    │   │   │   └── /issue-comment #17 (post status)
    │   │   └── Cycle 3: docs + verify
    │   │       └── /issue-comment #17 (post completion)
    │   ├── /issue-sync (link commits)
    │   └── /issue-close #17 (if resolved)
    │
    ├── For issue #18: (same pattern)
    └── For issue #19: (same pattern)
```

## Open Questions

1. **Max cycles per issue** — Default 6-8? Configurable?
2. **Auto-close behavior** — Should resolved issues auto-close or require human approval?
3. **Branch strategy** — One branch per issue? Single branch for batch?
4. **PR creation** — Auto-create PR per issue or per batch?
5. **Failure handling** — If one issue is stuck, skip to next or block?
6. **Cost tracking** — Track token spend per issue?

## References

- @.claude/commands/ralph-external.md — External ralph loop command
- @.claude/commands/ralph.md — Internal ralph loop command
- @.claude/commands/issue-comment.md — Issue comment templates
- @.claude/commands/issue-list.md — Issue listing and filtering
- @.claude/commands/issue-sync.md — Commit-to-issue synchronization
- @.claude/rules/context-budget.md — Parallel subagent limits
- @tools/ralph-external/orchestrator.mjs — Ralph-external implementation
