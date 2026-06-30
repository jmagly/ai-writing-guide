---
enforcement: high
---

# Auto-Compact and Continue

**Enforcement Level**: HIGH
**Scope**: All long-running agent sessions and tool-using agents across all platforms
**Addon**: aiwg-utils (core, universal) · **Research Basis**: REF-909, REF-910, REF-122, REF-128

## Overview

When context grows long, do not stop and ask "should I keep working?" Compact, checkpoint, and continue, treating AIWG memory / activity log / on-disk artifacts as durable substrate surviving context resets. This is the `vague-discretion` / `anti-laziness` Rule 6 failure subset: asking about continuation when continuation is obviously correct.

## The Single Rule, Stated Plainly

**The answer to "should I keep working?" is always YES — until the task's stated completion criteria are met or the user has redirected.** Context pressure, long tool output, and crossing iteration N are not scope questions — compact, checkpoint to durable storage, and continue.

Exceptions (narrow, named):
1. **Authorization gate** (`human-authorization`) — a destructive/out-of-scope action *was* discovered; ask about the action, not continuation.
2. **3-attempts-failed escalation** (`anti-laziness` Rule 6) — three honest attempts on one blocker failed; escalate with full context.
3. **Explicit user redirect** — the user paused or changed direction.
4. **Ambiguous new-directive classification** (`skill-discovery` Rule 0) — ask one clarifying question, do not stall.

Nothing else justifies stopping.

## Mandatory Rules

### Rule 1: Never Ask "Should I Continue?" When Context Is the Reason

If the reason for asking is "context is long / I've worked a while / big task / next step might be expensive" — do not ask. Compact and continue. **FORBIDDEN**: "Context is getting long. Should I continue to phase 3?" **REQUIRED**: checkpoint to `.aiwg/working/<task-slug>-progress.md`, append an activity-log entry, and continue. If no progress for 3 consecutive iterations, apply the anti-laziness recovery protocol — not a continuation prompt.

### Rule 2: Use the Harness, Don't Ask the Human

Before context fills, write load-bearing state to durable substrate; state living only in conversation turns is a future failure. All survive compaction:

| Substrate | What lives there |
|---|---|
| `CLAUDE.md` / `AGENTS.md` / `AIWG.md` | Project conventions, framework rules, the task contract (system-prompt scope) |
| `.aiwg/activity.log` | Append-only timeline of operations (on disk, never in context) |
| AIWG memory (`~/.claude/projects/.../memory/`) | Durable facts the user chose to keep |
| `.aiwg/working/<task>-progress.md` | The progress file (Rule 3) |
| Git history | Each step as a commit |
| `.aiwg/working/` | Intermediate artifacts, scratch results |

### Rule 3: Write a Progress File for Multi-Phase Work

For any task expected to span >~20 tool calls or more than one compaction window, write `.aiwg/working/<task-slug>-progress.md`, updating at each meaningful checkpoint. Required fields:

```markdown
# Progress: <task name>
## Task contract
- Original request (verbatim) / Completion criteria (measurable) / Authorization scope
## Current status
- Phase / Last successful step / Next action (what to do when re-read)
## Completed steps
- [x] <step + result + artifact/commit ref>
## Failed approaches (do not retry)
- <approach> — failed because <reason>; learning <what we now know>
## Open questions / deferred items
- <item> — deferred because <reason>; needs authorization to <action>
## State references
- Activity-log entries / commits / artifact paths
```

The **Failed approaches** section matters most (REF-909): without it, post-compaction agents re-discover known dead ends.

### Rule 4: Trust the Platform's Auto-Compact

On Claude Code and equivalents, auto-compact runs automatically near the limit (REF-910) — do *not* preempt it by asking the user to clear context. Ensure durable state is current (Rule 2), let it run (everything on disk survives; only conversation history is summarized), then read the progress file and continue from "Next action." On platforms without auto-compact, checkpoint, use the manual compact / new-session mechanism, then resume — never ask the user to decide.

### Rule 5: Honor the Compact Instructions

A `## Compact Instructions` section in the provider context file tells the summarizer what to preserve; bias your summaries to the same priorities, and contribute one (via `aiwg-regenerate` or team-directive scope) if a long-running project lacks it. Minimum block:

```markdown
## Compact Instructions
Preserve: completion criteria verbatim; last successful step + its verification
command; failed approaches + why; refs to .aiwg/working/*-progress.md,
.aiwg/activity.log, in-flight commits; pending authorization questions; open
scope boundaries.
Discard: exploratory traces to known conclusions; superseded tool outputs;
greetings, status banners, non-load-bearing prose.
```

### Rule 6: Aggressive, Not Passive, Compaction Discipline

Passive compression yields ~6%, aggressive ~22.7% (REF-122); active in-session compaction makes "always continue" safe. After each meaningful tool result, ask whether the raw content (not the conclusion) is load-bearing — if not, summarize into your next thought and drop the raw output. Update the progress file every 10–15 tool calls. Before spawning a subagent (`subagent-scoping`), pass conclusions, not raw history (`context-bloat`).

### Rule 7: Distinguish Continuation From Authorization

All rows below assume context is tight:

| Situation | Right action |
|---|---|
| Task in-scope, no new scope | **Continue** (compact + checkpoint) |
| Next step is destructive / out-of-scope | **Ask about the action** (`human-authorization`), not continuation |
| 3 honest attempts failed on same blocker | **Escalate per `anti-laziness` Rule 6** with full context |
| User sent a new directive superseding the task | **Classify per `skill-discovery` Rule 0**; old task may be done, new task starts fresh |

Any user-facing question must be specific and load-bearing — never "should I keep working?"

### Rule 8: Recovery After Compaction

When a session resumes from compaction (prior turns summarized, or reading a prior-session progress file):
1. **Read the progress file first** — the canonical state.
2. **Read recent activity-log entries** — the timeline.
3. **Check git status and recent commits** — what landed.
4. **Verify completion criteria against your read** — reconcile any mismatch (e.g. summary says "phase 2 done" but git shows uncommitted changes) first.
5. **Skip the "failed approaches" set** — do not retry them.
6. **Resume from "Next action."**

The progress file is the bridge between sessions (REF-909).

**Recovery when violated**: if you just asked "should I continue?", reframe ("Continuing — checkpointing, proceeding to <next step>") and continue without waiting for confirmation.

## Interaction With Other Rules

Operational counterpart to `vague-discretion`; covers the context-pressure case `anti-laziness` Rule 6 does not. `human-authorization` is for scope/destructive actions, not continuation; `skill-discovery` Rule 0 classifies new directives. Composes with `activity-log`, `subagent-scoping`/`context-bloat`, `context-budget`. Universal; Codex's 32KB `AGENTS.md` cap makes disk checkpointing essential.

## Checklist

Before responding "should I continue?" or any equivalent:

- [ ] Did the task contract include a measurable completion criterion? Met? If yes, *say so and stop*; else *continue*.
- [ ] Stopping because "context is long" / "I've done a lot"? Write a progress file and continue.
- [ ] Authorization gate (destructive / out-of-scope) blocking the next step? Ask about *that action*, not continuation.
- [ ] 3 honest attempts on the same blocker, no progress? Escalate per `anti-laziness` with full context.
- [ ] User redirected? Classify per `skill-discovery` Rule 0.

If none apply: **continue**.

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md, instruction-comprehension.md, human-authorization.md, activity-log.md, context-budget.md, skill-discovery.md
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/anti-laziness.md — Rule 6: 3-attempts escalation
- REF-909 (Anthropic — *Effective Harnesses for Long-Running Agents*) — progress files. https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- REF-910 (Anthropic — *Compaction*) — auto-compact, Compact Instructions. https://platform.claude.com/docs/en/build-with-claude/compaction
- REF-122 (Verma) — compression 22.7% vs 6%; REF-128 (Zylos) — effective context 30-40% smaller; anchor roctinam/aiwg#1348

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-05-14
