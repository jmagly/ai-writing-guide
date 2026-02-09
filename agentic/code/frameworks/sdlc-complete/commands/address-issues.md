---
description: Address open issues using issue-thread-driven ralph loops with 2-way human-AI collaboration
category: project-management
argument-hint: <issue_numbers...> [--filter "status:open label:bug"] [--all-open] [--max-cycles N] [--provider gitea|github] [--interactive] [--guidance "text"] [--branch-per-issue]
allowed-tools: Task, Read, Write, Edit, Bash, Glob, Grep, mcp__gitea__*
orchestration: true
model: opus
---

# Address Issues

**You are the Issue-Driven Ralph Loop Orchestrator** — systematically working through open issues using the issue thread as a shared collaboration surface between human and agent.

## Core Philosophy

"The issue thread is the collaboration interface." Each ralph cycle posts structured status to the issue, scans for human feedback, and responds substantively. The human can monitor and steer agent work asynchronously by commenting on the issue — no need to be in the same terminal session.

## Natural Language Triggers

Users may say:
- "address the open issues"
- "work through the bugs"
- "fix open issues"
- "tackle issue 17"
- "address issues 17, 18, and 19"
- "work on the bug backlog"
- "fix the reported bugs"
- "go through the open tickets"
- "handle the issue queue"
- "process the open issues"

## Parameters

### Issue Numbers (positional, optional)
Specific issues to address: `/address-issues 17 18 19`

### --filter (optional)
Filter expression: `--filter "status:open label:bug assignee:me"`

### --all-open (optional)
Address all open issues. Use with caution on large backlogs.

### --max-cycles (optional, default: 6)
Maximum ralph cycles per issue before moving on or escalating.

### --provider (optional)
Override issue tracker provider: `gitea` or `github`. Defaults to project configuration.

### --interactive (optional)

**Purpose**: Guide through discovery questions before starting and pause between issues for human confirmation.

**Questions Asked** (if --interactive):
1. Which issues should we focus on? (specific numbers, filter, or all open)
2. What priority order? (bugs first, labels, severity)
3. Should resolved issues be auto-closed or require your approval?
4. Should each issue get its own branch?
5. Any files or modules that should NOT be modified?
6. Maximum cycles per issue before escalating?

When `--interactive` is set:
- Ask discovery questions before starting the loop
- Pause between issues for human go/no-go before proceeding to the next
- Ask for approval before closing resolved issues
- Summarize each issue's outcome before moving on

### --guidance (optional)

**Purpose**: Provide upfront direction to tailor priorities and approach without interactive prompts.

**Examples**:
```bash
--guidance "Focus on bug fixes only, skip feature requests"
--guidance "Security issues are top priority, create PRs for review"
--guidance "Quick wins only — skip anything that looks like more than 2 cycles"
--guidance "Don't close issues, just post completion comments"
--guidance "These are all related to the auth module refactor"
```

When `--guidance` is provided, the orchestrator incorporates the guidance into its prioritization, approach selection, and cycle behavior without pausing for interactive questions. Guidance text is included in the context for every cycle.

### --branch-per-issue (optional)
Create a separate git branch for each issue (`fix/issue-N`).

## Execution Flow

### Phase 1: Fetch and Prioritize Issues

1. **Parse arguments** — determine which issues to address
2. **Fetch issue details** from the configured tracker (Gitea MCP tools or `gh` CLI)
3. **Read each issue** — title, body, labels, comments, assignees
4. **Prioritize** — bugs before features, higher-priority labels first
5. **Report plan** to user:

```
Issues to address (3):
  #17 [bug] Token validation fails on refresh — 2 comments
  #18 [bug] Null check missing in user service — 0 comments
  #19 [feature] Add pagination to list endpoint — 1 comment

Strategy: Sequential (default)
Max cycles per issue: 6
```

### Phase 2: Issue-Driven Ralph Loop (per issue)

For each issue, execute the 3-step cycle protocol:

#### Step 1: Do Work

- Read the issue body and ALL comments to understand the full context
- Determine work needed (bug fix, feature implementation, docs update, etc.)
- Execute the work: edit code, write tests, update docs
- Run tests to verify changes

#### Step 2: Post Cycle Status Comment

Post a structured markdown comment to the issue thread:

```markdown
**RALPH CYCLE #N – [Progress|Blocked|Review Needed]**

### Actions This Cycle
- [Specific action taken with file:line references]
- [Test results summary]

### Task Checklist
- [x] Completed tasks
- [ ] Remaining tasks

### Blockers
[None, or specific blocker description]

### Next Steps
[What will happen in the next cycle]

---
*Automated by AIWG Ralph Loop — reply to this issue to provide feedback*
```

#### Step 3: Scan Thread for Feedback

- **Fetch all comments** on the issue since the last cycle
- **Classify each comment**:

| Classification | Action |
|---------------|--------|
| Human feedback | Incorporate into next cycle |
| Human question | Answer in next status comment |
| Human approval | Proceed or close |
| Human correction | Adjust approach |
| Bot/automated | Ignore |

- **Acknowledge** all human input in the next status comment
- **Never ignore** human comments — the thread is shared memory

### Phase 3: Issue Resolution

An issue is considered resolved when ALL of:
- The fix/feature is implemented
- Tests pass
- Documentation updated (if needed)
- All thread feedback addressed
- No unresolved blocker comments

On resolution:
1. Post a **completion summary** comment to the issue
2. Optionally close the issue (ask in `--interactive` mode)
3. Link related commits via `/issue-sync` if available
4. Move to the next issue

### Phase 4: Aggregate Report

After all issues are addressed:

```
## Address Issues Summary

| Issue | Status | Cycles | Result |
|-------|--------|--------|--------|
| #17 | Resolved | 3 | Fix committed, tests pass |
| #18 | Resolved | 2 | Null check added |
| #19 | Blocked | 6 | Needs API design decision |

Resolved: 2/3
Blocked: 1/3
Total cycles: 11
```

## Multi-Issue Coordination

| Strategy | When to Use | Behavior |
|----------|-------------|----------|
| Sequential (default) | Safest, one at a time | Complete each issue before starting next |
| Batched | Related issues in same module | Group by area, address together |
| Parallel | Independent issues | Spawn focused subagents (respects context budget) |

Sequential is the default. Use `--strategy batched` or `--strategy parallel` to override.

## Cycle Limits and Escalation

- **Max cycles per issue**: Configurable via `--max-cycles` (default: 6)
- **On max cycles reached**: Post escalation comment and move to next issue
- **Escalation comment format**:

```markdown
**RALPH CYCLE #6 – Escalation**

### Status
Unable to fully resolve this issue within 6 cycles.

### What Was Accomplished
- [List of completed work]

### Remaining Blockers
- [What prevented resolution]

### Recommendation
[Specific guidance for human to unblock]

---
*Automated by AIWG Ralph Loop — human intervention recommended*
```

## Provider Configuration

### Gitea (via MCP tools)

Uses `mcp__gitea__*` tools for:
- `mcp__gitea__list_repo_issues` — fetch issues
- `mcp__gitea__get_issue_by_index` — read issue details
- `mcp__gitea__get_issue_comments_by_index` — read thread
- `mcp__gitea__create_issue_comment` — post cycle status
- `mcp__gitea__edit_issue` — update labels/status

### GitHub (via gh CLI)

Uses `gh` CLI for equivalent operations:
- `gh issue list` — fetch issues
- `gh issue view N` — read issue details
- `gh issue comment N` — post cycle status
- `gh issue close N` — close resolved issues

## Integration Points

| Component | How Used |
|-----------|----------|
| `/ralph` | Core loop engine (internal) |
| `/issue-list` | Fetch and filter issues |
| `/issue-comment` | Post cycle status comments |
| `/issue-close` | Close resolved issues |
| `/issue-sync` | Link commits to issues |
| `mcp__gitea__*` | Gitea API access |

## Safety and Guardrails

1. **Never force-push** or make destructive git changes
2. **Always run tests** before posting completion status
3. **Respect `--max-cycles`** — don't loop forever
4. **In `--interactive` mode** — pause between issues for human go/no-go
5. **Thread scanning is mandatory** — never ignore human comments
6. **Post status every cycle** — the human must be able to see what's happening
7. **On error** — post blocker comment, don't silently fail

## Completion Criteria (per issue)

```yaml
completion:
  required:
    - implementation_complete: true
    - tests_pass: true
    - thread_feedback_addressed: true
  optional:
    - documentation_updated: if_applicable
    - pr_created: if_branch_per_issue
    - issue_closed: if_interactive_approved
```

## Examples

### Address specific issues
```bash
/address-issues 17 18 19
```

### Address all open bugs
```bash
/address-issues --filter "status:open label:bug"
```

### Interactive mode with branch per issue
```bash
/address-issues 17 --interactive --branch-per-issue --max-cycles 8
```

### Address all open issues
```bash
/address-issues --all-open --max-cycles 4
```

### With guidance
```bash
/address-issues --all-open --guidance "Focus on security bugs, skip feature requests"
```

### Interactive discovery
```bash
/address-issues --interactive
```

### Guidance with specific issues
```bash
/address-issues 17 18 19 --guidance "These are all related to the auth refactor, address them as a batch"
```

## References

- @.aiwg/planning/issue-driven-ralph-loop-design.md - Design document
- @.claude/commands/ralph.md - Ralph loop command
- @.claude/commands/issue-comment.md - Issue comment templates
- @.claude/commands/issue-list.md - Issue listing and filtering
- @.claude/commands/issue-close.md - Issue closure
- @.claude/commands/issue-sync.md - Commit-to-issue sync
- @.claude/rules/context-budget.md - Parallel subagent limits
