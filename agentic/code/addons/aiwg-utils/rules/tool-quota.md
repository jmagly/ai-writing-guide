---
enforcement: high
---

# Tool Quota and Loop Detection

**Enforcement Level**: HIGH
**Scope**: All tool-using agents across all platforms
**Addon**: aiwg-utils (core, universal)
**Issue**: #1188

## Overview

Tool calls are a direct cost and reliability risk for unattended or low-budget agent fleets. A single session that retries the same failing command, fetches the same page repeatedly, or keeps invoking a broad shell tool without progress can burn the operator's quota before a human notices.

This rule gives agents a portable, prompt-level quota discipline. It does not replace provider or harness enforcement. Where a runtime supervisor exists, it should enforce the same limits mechanically; until then, agents must self-track and stop before loops become expensive.

## Problem Statement

Tool loops usually look productive in the moment:

- `Bash` command fails, the agent tweaks one flag and retries repeatedly
- `WebFetch` keeps requesting similar pages without extracting new facts
- File search commands run over the same broad tree with only cosmetic query changes
- An unattended bot receives a vague request and chains tools long past the useful signal

On small API plans and shared OpenRouter-style budgets, this creates two failures:

1. The bot spends money without measurable progress.
2. The operator gets a late summary instead of an early, actionable stop condition.

## Mandatory Rules

### Rule 1: Track Tool Calls Per Session

Every tool-using agent must maintain a lightweight session ledger:

```
tool name | normalized purpose | success/failure | new fact or artifact produced
```

The ledger can be mental for short sessions, but long-running agents and loops must summarize it in their progress notes before continuing.

### Rule 2: Stop Repeating Similar Calls Without Progress

If the same tool with similar arguments runs more than the configured retry limit without producing a new fact, artifact, or state transition, stop and report.

Default limits when no agent-specific configuration is present:

| Limit | Default |
|-------|---------|
| Same failing call retries | 3 |
| Similar calls in the rolling window | 5 |
| Total calls to one tool in a focused session | 30 |
| Total calls to one high-cost external tool | 10 |

**Similar arguments** means the purpose and target are substantially the same, even if small flags, phrasing, or path syntax changed.

### Rule 3: Honor Agent-Declared Quotas

Agent definitions may declare tighter limits:

```yaml
tool_quota:
  Bash: 10
  WebFetch: 5
  defaults: 20
loop_detection:
  same_call_window: 5
  max_retries: 3
```

When a quota is present, the agent must use the most restrictive applicable limit:

```
effective limit = min(agent quota, platform quota, this rule's default)
```

If no quota is present, use this rule's defaults and keep the scope bounded by `god-session` and `subagent-scoping`.

### Rule 4: Re-Research Instead of Retrying

After a repeated failure, do not keep perturbing the same call. Switch to diagnosis:

```
1. Stop the retry sequence
2. Read the full error or tool response
3. Search for the real interface, path, permission, or precondition
4. Make one evidence-backed attempt
5. If it still fails, report the blocker and the attempted evidence
```

This extends `research-before-decision` to tool usage. The right answer to repeated failure is better information, not more retries.

### Rule 5: Escalate Before Spending More

When a task appears to need more tool calls than the quota allows, the agent must summarize:

- What has been tried
- What new facts were learned
- Why more tool calls are needed
- Which narrower next action would continue the work

For unattended bots, stop at that summary unless the agent's policy explicitly allows continuing. For supervised sessions, ask for confirmation using platform-native interaction tools when available.

## Detection Patterns

| Pattern | Detection | Required Response |
|---------|-----------|-------------------|
| Same failing command retried | 3 failures with equivalent purpose | Stop, diagnose root cause, then make one informed attempt |
| Broad search churn | Multiple broad searches over same tree with no new facts | Narrow the query or read the most relevant file |
| External fetch loop | Same source family fetched repeatedly with no extraction | Stop and summarize what is missing |
| Tool count spike | One tool exceeds its quota or default limit | Report progress, budget state, and next action |
| Alternating tool ping-pong | Tool A and Tool B repeat the same observation cycle | Stop and identify the missing precondition |
| Unattended vague request | Bot is about to use tools beyond a simple answer | Ask for scope or stop with a bounded plan |

## Worked Example: Quickbooksbot

Quickbooksbot is configured for a low-budget Telegram deployment:

```yaml
tool_quota:
  Bash: 10
  WebFetch: 5
  defaults: 12
loop_detection:
  same_call_window: 5
  max_retries: 3
```

A user asks: "Why are the March numbers wrong?"

Correct behavior:

1. Inspect the known accounting files or available integration status.
2. If three import/export checks produce the same missing-token or permission failure, stop retrying.
3. Summarize the blocker: "I cannot inspect March data because the QuickBooks export token is unavailable."
4. Ask for the missing credential/export or provide the exact next manual step.

Incorrect behavior:

```
Run Bash export check
Fail
Run slightly different Bash export check
Fail
Run WebFetch on generic QuickBooks docs
Run another export command
Fail
Keep trying until the bot hits the API budget
```

## Runtime Enforcement

This rule is prompt-level and portable. Harness-level enforcement should use the same semantics when available:

- Daemon supervisors can count tool invocations per session.
- Ralph/external loops can count per-cycle tool calls and stop repeated failures.
- Provider-native quotas, when present, win over this prompt-level default.

Runtime enforcement is deliberately a separate implementation concern; this rule establishes the shared behavior contract all agents can follow today.

## Integration with Other Rules

- **research-before-decision**: repeated failures trigger research, not blind retries.
- **god-session**: quota overruns often indicate the session has absorbed too much scope.
- **subagent-scoping**: split independent tool-heavy investigations into focused subtasks instead of running one unbounded loop.
- **vague-discretion**: tool loops need concrete max-call and max-retry thresholds.
- **human-authorization**: exceeding a quota is a decision gate for supervised sessions.

## Checklist

Before continuing a tool-heavy task, verify:

- [ ] Tool calls are being counted per session
- [ ] Repeated failures have not exceeded the retry limit
- [ ] Similar calls are producing new facts or artifacts
- [ ] Agent-specific `tool_quota` values are honored when present
- [ ] The next tool call is narrower or better informed than the previous failed call
- [ ] Quota overruns are reported instead of hidden

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/god-session.md
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/subagent-scoping.md
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-05-17
