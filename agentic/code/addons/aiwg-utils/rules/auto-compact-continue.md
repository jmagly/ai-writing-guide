# Auto-Compact and Continue

**Enforcement Level**: HIGH
**Scope**: All long-running agent sessions and tool-using agents across all platforms
**Addon**: aiwg-utils (core, universal)
**Research Basis**: REF-909 (Anthropic — Effective Harnesses for Long-Running Agents), REF-910 (Anthropic — Compaction), REF-122 (Active Context Compression / Focus Agent), REF-128 (Context Window Management Strategies)

## Overview

When context grows long, the wrong response is to stop and ask the user "should I keep working?" The right response is to compact, checkpoint, and continue. AIWG agents must treat the AIWG memory system, activity log, and on-disk artifacts as the durable substrate that survives context resets, and must continue until the original task's measurable completion criteria are met.

## Problem Statement

Frontier models — especially under conservative harness defaults — increasingly stop mid-task to ask the user permission to continue when context budget gets tight, when a long tool result lands, or when an iteration count crosses some internal threshold. The user has already authorized the task. The question "should I keep working?" is the agent dumping its context-management responsibility onto the human. Every time this happens, the user has to re-engage, re-establish state, and pay a thinking tax that exists because the agent treated a routine context event as if it were a scope question.

The failure mode is structurally similar to `vague-discretion` (loops that exit on "good enough") and `anti-laziness` Rule 6 (premature abandonment). This rule names the specific subset: **stopping to ask about continuation when continuation is the obvious correct action**.

## The Single Rule, Stated Plainly

**The answer to "should I keep working?" is always YES — until the task's stated completion criteria are met or the user has redirected.** Context pressure is not a scope question. Long tool output is not a scope question. Crossing iteration N is not a scope question. The right response to all of them is: compact, checkpoint to durable storage, and continue.

The exceptions are narrow and named:
1. **Authorization gates** (`human-authorization` rule) — a destructive or out-of-scope action *was* discovered. Ask about the action, not about continuation.
2. **3-attempts-failed escalation** (`anti-laziness` rule, Rule 6) — three honest attempts to solve the same blocker have failed; escalate with full context.
3. **Explicit user redirect** — the user has paused or changed direction since you started.
4. **Genuinely ambiguous classification** of a new directive (`skill-discovery` rule, Rule 0) — ask one clarifying question, do not stall.

Nothing else justifies stopping to ask "should I keep working?"

## Mandatory Rules

### Rule 1: Never Ask "Should I Continue?" When Context Is the Reason

If your reason for asking the user is any of the following — context is getting long, you've been working a while, this is a big task, the next step might be expensive — do not ask. Compact and continue.

**FORBIDDEN**:
```
Agent: "I've completed phases 1 and 2. Context is getting long.
        Should I continue to phase 3?"

Agent: "This has been a complex investigation. Would you like me
        to wrap up here, or should I keep going?"

Agent: "I notice we're at iteration 8. Do you want me to keep
        iterating or stop?"
```

**REQUIRED**:
```
Agent: *writes checkpoint to .aiwg/working/<task-slug>-progress.md*
       *appends activity log entry*
       *continues to phase 3*

Agent: *continues investigation; if context tightens, writes findings
       to a working file and references it in subsequent turns*

Agent: *continues iterating against the measurable completion condition;
       if no progress for 3 consecutive iterations, applies the
       anti-laziness recovery protocol, not a continuation prompt*
```

### Rule 2: Use the Harness, Don't Ask the Human

AIWG already ships the durable-storage substrate that makes auto-compact safe. Before context fills, write the load-bearing state to one or more of these:

| Substrate | What lives there | Survives compaction? |
|---|---|---|
| `CLAUDE.md` / `AGENTS.md` / `AIWG.md` | Project conventions, framework rules, the task contract itself | Yes (system-prompt scope) |
| `.aiwg/activity.log` | Append-only timeline of operations performed | Yes (on disk, never in context) |
| AIWG memory (`~/.claude/projects/.../memory/`) | Durable facts the user explicitly chose to keep | Yes (system-prompt scope on Claude Code; equivalent surfaces on other providers) |
| `.aiwg/working/<task>-progress.md` | The progress file (see Rule 3) | Yes (on disk) |
| Git history | Each meaningful step as a commit | Yes (on disk + remote) |
| `.aiwg/working/` | Intermediate artifacts, scratch results | Yes (on disk) |

If the load-bearing state for the current task lives only in conversation turns, you are setting up a future failure. Move it to disk before context fills, not after.

### Rule 3: Write a Progress File for Multi-Phase Work

For any task that you reasonably expect to span more than ~20 tool calls or more than one compaction window, write a progress file at `.aiwg/working/<task-slug>-progress.md` and update it at each meaningful checkpoint. The file must include:

```markdown
# Progress: <task name>

## Task contract
- Original request: <verbatim quote of the user ask>
- Completion criteria (measurable, per vague-discretion): <bullets>
- Authorization scope: <what is in-scope; what requires asking>

## Current status
- Phase: <where we are>
- Last successful step: <what just worked>
- Next action: <what to do when this file is re-read>

## Completed steps
- [x] <step with brief result and link to artifact / commit ref>
- [x] <step with brief result and link to artifact / commit ref>

## Failed approaches (do not retry)
- <approach> — failed because <reason>; learning: <what we know now>

## Open questions / deferred items
- <item> — deferred because <reason>; will need authorization to <action>

## State references
- Activity log entries: <range or recent IDs>
- Commits: <hashes>
- Artifacts: <paths under .aiwg/working/ or final locations>
```

The progress file's **Failed approaches** section is the single most underrated artifact (REF-909). Without it, post-compaction agents re-discover known dead ends. With it, the next agent reads the file once, knows where to resume, and skips the blind alleys.

### Rule 4: Trust the Platform's Auto-Compact

On Claude Code (and equivalents), auto-compact runs automatically when context approaches the limit (REF-910). The right response is *not* to preempt it by asking the user to clear context. The right response is:

1. Make sure your durable state is current (Rule 2).
2. Let compaction run.
3. After compaction, the conversation history is summarized but `CLAUDE.md` / `AGENTS.md` / `AIWG.md`, the activity log, the progress file, and all on-disk artifacts are intact.
4. Read the progress file (Rule 3) and continue from "Next action."

If you are on a platform that does *not* auto-compact and you can see context getting tight, write the checkpoint and use whatever the platform's manual compact / new-session mechanism is, then resume — do not ask the user to make that decision for you.

### Rule 5: Honor the Compact Instructions

A `## Compact Instructions` section in `CLAUDE.md` / `AGENTS.md` / `AIWG.md` (or the equivalent provider context file) tells the auto-compact summarizer what to preserve. If the project has one, your in-context summaries should bias toward the same priorities. If the project lacks one and you are working on a long-running task, contribute one — propose to the user that AIWG's `aiwg-regenerate` skill add it, or write the file directly under team-directive scope.

A minimum-viable Compact Instructions block:

```markdown
## Compact Instructions

When summarizing this conversation for compaction, preserve:
1. The current task's completion criteria verbatim.
2. The last successful step and any verification command that proved it.
3. Failed approaches and the reason each failed (do not let them be re-attempted).
4. References to `.aiwg/working/*-progress.md`, `.aiwg/activity.log`,
   and any in-flight commits.
5. Pending authorization questions that were raised but not answered.
6. Open scope boundaries (what is in/out of scope for this task).

Discard:
- Exploratory reasoning traces leading to already-known conclusions.
- Tool outputs that were superseded by later, more authoritative reads.
- Greetings, status banners, and other non-load-bearing prose.
```

### Rule 6: Aggressive, Not Passive, Compaction Discipline

REF-122 (Focus Agent / Active Context Compression) is unambiguous: passive instructions to compress yield ~6% savings; aggressive instructions (compress every 10–15 tool calls; consolidate findings; prune raw history) yield ~22.7%. The mechanism that makes "always continue" safe is *actively compacting during the session*, not waiting for auto-compact at the limit. Apply the same discipline:

- After every meaningful tool-result observation, ask: "Is the raw content load-bearing for the remaining work, or is the conclusion?" If conclusion-only, summarize it into your next thought and stop carrying the raw output forward.
- After every 10–15 tool calls on a long task, write a progress-file update.
- Before spawning a subagent (`subagent-scoping` rule), pass conclusions, not raw history (`context-bloat` rule).

### Rule 7: Distinguish Continuation From Authorization

The hardest case, and the one this rule exists to draw a sharp line through:

| Situation | Right action |
|---|---|
| Context getting tight, task is in-scope, no new scope discovered | **Continue** (compact + checkpoint) |
| Context getting tight, but a destructive or out-of-scope action is the next required step | **Ask about the action** (per `human-authorization`), not about continuation |
| Context getting tight, three honest attempts have failed on the same blocker | **Escalate per anti-laziness Rule 6** with full context, not a generic "should I continue?" |
| Context getting tight, the user just sent a new directive that supersedes the current task | **Classify per skill-discovery Rule 0**; the old task may be done, the new task starts fresh |

In all four cases, the question framed to the user (if any) is specific and load-bearing. "Should I keep working?" is never the right question — it carries no information for the user and no signal back for the agent.

### Rule 8: Recovery After Compaction

When a session resumes from compaction (you notice prior turns are now summarized, or you are reading a progress file from a previous session):

1. **Read the progress file first.** It is the canonical state.
2. **Read recent activity log entries.** They are the timeline.
3. **Check git status and recent commits.** They show what landed.
4. **Verify the completion criteria are still met by your read.** If the summary says "phase 2 done" but git shows uncommitted changes from phase 2, reconcile before continuing.
5. **Skip the "failed approaches" set.** Do not re-try them.
6. **Resume from "Next action."**

This is the AIWG-flavored implementation of REF-909's initializer-agent / coding-agent pattern. The progress file *is* the bridge between sessions; treating it as authoritative is what makes the bridge load-bearing.

## Detection Heuristics

You may be in violation of this rule if:

| Symptom | Likely cause |
|---|---|
| Output ends with "Would you like me to continue?" or "Should I keep going?" | Asked a scope question that was actually a context question |
| Output offers a menu like "I can stop here or proceed with X — which?" when X is clearly the next obvious step | Same |
| You wrote a long summary of "what we've done so far" and asked the user to direct the next step | The summary belonged in a progress file, not in the conversation |
| You stopped before the user's measurable completion criteria were met | You confused fatigue / context / iteration count with scope completion |
| You re-attempted an approach the prior session marked as failed | You did not read the progress file's "Failed approaches" section |
| You asked the user to decide between two technically equivalent paths to the same outcome | The decision was yours to make under `instruction-comprehension` — make it and continue |

## Recovery When This Rule Was Violated

If you notice you just asked "should I continue?" or its semantic equivalent:

1. **Reframe in the same turn.** "Continuing — writing checkpoint to `.aiwg/working/<task>-progress.md` and proceeding to <next step>." Do not wait for the user to confirm.
2. **Write the progress file** if it does not already exist.
3. **Append an activity-log entry** noting the checkpoint and resumption.
4. **Continue.**

If the user has *already* responded ("yes, keep going") then the cost is paid; treat it as a lesson and update your in-session checklist to avoid the second occurrence.

## Interaction With Other Rules

| Rule | Relationship |
|---|---|
| `vague-discretion` | This rule is the operational counterpart: vague-discretion forbids vague completion criteria; this rule forbids stopping to ask about continuation against measurable criteria |
| `anti-laziness` | Rule 6 of anti-laziness names the 3-attempts-failed escalation case; this rule covers the much more common context-pressure case |
| `human-authorization` | Authorization is for scope changes and destructive actions, not for "should I keep working" |
| `instruction-comprehension` | Track the user's stated completion criteria. The criteria, not the agent's fatigue, decide when to stop |
| `skill-discovery` | Rule 0 handles new-directive classification; this rule handles "no new directive, just context pressure" |
| `activity-log` | The activity log is one of the durable substrates this rule depends on |
| `subagent-scoping` / `context-bloat` | When you delegate, pass conclusions not raw history; same logic applies in the main agent |
| `context-budget` | When `AIWG_CONTEXT_WINDOW` is set, the compaction trigger is tighter; budget more aggressively |

## Platform Applicability

Universal across all AIWG-supported providers:

- **Claude Code**: Auto-compact is the platform default. This rule says: trust it, prepare for it, do not ask the user to decide for it.
- **OpenAI Codex**: Smaller context window; aggressive checkpointing to disk is more important. The 32KB `AGENTS.md` cap means the progress file and activity log do the heavy lifting.
- **GitHub Copilot, Cursor, Warp, Factory, OpenCode, Windsurf, OpenClaw, Hermes**: All have their own context handling; the AIWG durable substrate (memory, activity log, working files, git) is platform-neutral and is the cross-platform answer.

## Checklist

Before responding "should I continue?" or any semantic equivalent:

- [ ] Did the original task contract include a measurable completion criterion?
- [ ] Has that criterion been met? If yes, *say so and stop*; if no, *continue*.
- [ ] Is the reason I want to stop "context is long"? Then write a progress file and continue.
- [ ] Is the reason I want to stop "I've done a lot"? Then write a progress file and continue.
- [ ] Is there an authorization gate (destructive / out-of-scope) blocking the next step? Then ask about *that specific action*, not about continuation.
- [ ] Have I made 3 honest attempts at the same blocker without progress? Then escalate per `anti-laziness`, with full context.
- [ ] Did the user redirect? Then classify the new directive per `skill-discovery` Rule 0.

If none of those apply: **continue**.

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Measurable completion criteria
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/instruction-comprehension.md — Track the user's stated criteria
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md — When asking *is* the right move
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/activity-log.md — One of the durable substrates
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-budget.md — Aggressive budgeting when `AIWG_CONTEXT_WINDOW` is set
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/skill-discovery.md — Rule 0: classify new directives
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/anti-laziness.md — Rule 6: 3-attempts escalation
- REF-909 (Anthropic — *Effective Harnesses for Long-Running Agents*) — initializer-agent / coding-agent pattern, progress files. Induction: [roctinam/research-papers#615](https://git.integrolabs.net/roctinam/research-papers/issues/615). Source URL: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- REF-910 (Anthropic — *Compaction*) — auto-compact mechanics, Compact Instructions, what survives. Induction: [roctinam/research-papers#616](https://git.integrolabs.net/roctinam/research-papers/issues/616). Source URL: https://platform.claude.com/docs/en/build-with-claude/compaction
- REF-122 (Verma — *Active Context Compression / Focus Agent*) — aggressive vs passive compression discipline (22.7% vs 6%)
- REF-128 (Zylos Research — *Context Window Management Strategies*) — effective context is 30-40% smaller than advertised
- Commissioning anchor: [roctinam/aiwg#1348](https://git.integrolabs.net/roctinam/aiwg/issues/1348)

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-05-14
