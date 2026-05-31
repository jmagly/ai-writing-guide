# ADR: Route External/Orchestration Loops to Provider-Native `/workflow` Where It Exists

Date: 2026-05-31
Status: Accepted
Issues: #1534, #1537, #1538; verification #1535

## Context

#1451/#1469 routed AIWG's **in-session** loop to native `/goal` (Codex, Claude Code) and carved out the **external/background** route (`agent-loop-ext` / `ralph-external`) as AIWG-native because `/goal` is in-session only. The open question (#1534) was whether a provider-native `/workflow` primitive now fills that external slot.

Contract verification (#1535, against installed binaries — `.aiwg/research/provider-workflow-integration.md`):

- **Codex `codex-cli 0.135.0`** exposes **no core `/workflow` command** (`SlashCommand` = `/goal`, `/plan`, `/agent`, `/subagents`, `/review`, …). Its long-running primitive is `/goal` (already routed). Any `/workflow` an operator sees in Codex is plugin/skill-provided and environment-specific, not a core contract.
- **Claude Code** ships the **Workflow tool** — script-based dynamic multi-agent orchestration (`agent`/`parallel`/`pipeline`, structured-output schemas, background execution, `/workflows` monitor). This is the genuine analog to AIWG's external/orchestration route, but it is **in-session/background scoped** (runs within the turn, notifies on completion, resumable via `resumeFromRunId` in-session) — **not a detached daemon that survives the session ending**.

## Decision

1. **Claude Code — delegate the orchestration *mechanism*, retain durability.** For in-session multi-agent fan-out / parallel orchestration, AIWG's orchestration layer MAY delegate to the native Workflow tool. AIWG retains activity-log, issue comments, human-authorization + threat gates, best-output selection, and **cross-session crash-resilient durability**. Work that must survive the session ending (detached, resume-later, unattended-long-running) **stays AIWG-native** (`ralph-external`) because the native Workflow tool is session-scoped.

2. **Codex — external route stays AIWG-native.** No core `/workflow` exists in 0.135.0. In-session loops already route to `/goal` (#1451). The external/background route remains `ralph-external`. Revisit only if a future Codex release adds a core `/workflow` (re-run #1535) or the operator confirms a specific plugin to target.

3. **Other providers — stay AIWG-native** unless a real native orchestration primitive is verified.

4. **No collapse row yet.** Only Claude Code has a verified native orchestration primitive, and it differs from `/goal` in shape (script vs goal-string). It gets its own routing row, not a shared `/goal`-style collapse. Re-evaluate if Codex (or others) gain a comparable primitive.

## Retained ownership (non-delegatable)

Identical audit trail regardless of mechanism (the #1451/#1469 invariant): activity-log entries, issue-thread comments, human-authorization/threat gates, best-output selection (`tools/ralph-external/best-output-tracker.mjs`), crash-resilient checkpoint/resume (`checkpoint-manager.mjs`), reproducibility, cost tracking. The native primitive drives *mechanism*; AIWG owns *bookkeeping, gates, durability, output selection*.

## Amendment (2026-05-31): cross-stack orchestration is the Mission, not a fallback

The decisions above framed the external route as "stays AIWG-native" in the sense of *who owns the conductor* — and an early reading mistakenly treated external-loop delegation as "largely moot" once in-stack `/workflow`/`/goal` exist. **That reading is wrong and is corrected here.**

In-stack primitives (Claude's Workflow tool, Codex `/goal`) orchestrate **within a single stack's process/turn**. AIWG's external/orchestration route — a **Mission** (#1536 naming) — is the **cross-stack conductor**: it can fan worker cycles out across *heterogeneous* agentic stacks. Operator examples that motivate this:

- A Claude-driven Mission spawning **Codex** subagents (or a Codex Mission spawning Claude workers).
- A single Mission fanning agents across **different agentic stacks** simultaneously, aggregating their results under one durable, audited conductor.

This is the durable value-add that no in-stack primitive provides. In-stack `/workflow`/`/goal` are **in-stack workers** a Mission may dispatch *to*; they are not substitutes for the cross-stack conductor.

### Substrate (already present)

`src/serve/` already carries the dispatch substrate: `executor-registry.ts` (executors register with a `capabilities: string[]` advertisement) + `dispatch-router.ts` (routes a dispatch by `executor_filter`, v2-then-v1, with A2A instance IDs). Cross-stack therefore does **not** need a new transport — it needs:

1. **A stack-capability convention** — executors advertise their stack (e.g. capability `stack:codex` / `stack:claude`), so a Mission can `executor_filter` workers onto a chosen stack.
2. **A Mission conductor** that fans out worker cycles across executors of differing stacks while AIWG retains the non-delegatable bookkeeping below.
3. **Per-stack executor adapters** — a registered executor that processes dispatched worker cycles using *its* stack's native primitive (Codex `/goal`, Claude Workflow tool, …).

### What stays true

The retained-ownership invariant is unchanged and is exactly what makes cross-stack safe: the Mission conductor owns activity-log, issue comments, human-authorization/threat gates, best-output selection, crash-resilient checkpoint/resume, reproducibility, cost tracking — **regardless of which stack each worker ran on**. The native primitive (whatever stack) drives only the *worker mechanism*.

This amendment broadens the epic's center of gravity from "delegate-to-native-/workflow" to "**Missions = cross-stack orchestration; native primitives = in-stack workers.**" Tracked design/impl: see the cross-stack Mission issue under #1534.

## Consequences

- Claude Code in-session orchestration can use the native Workflow tool; AIWG still owns the durable/detached path and all bookkeeping.
- Codex and other providers' *single-stack* external route is unchanged (AIWG-native), correctly reflecting verified capability.
- The genuinely new capability is **cross-stack** worker dispatch (heterogeneous executors under one Mission), built on the existing `serve` executor-registry — tracked as its own issue, not subsumed by in-stack `/workflow`.
- The `agent-loop` Step 0 table gains an external/Mission-orchestration row; no provider clone skills.

## Follow-ups

- **Cross-stack Mission orchestration** (the amendment above) — research + design issue filed under #1534. Covers the `stack:<name>` capability convention, the Mission conductor, and per-stack executor adapters on the `serve` substrate.
- If the operator confirms a Codex plugin-provided `/workflow`, scope a separate optional-delegation note (not a core contract).
- Naming: this ADR uses "orchestration"; the user-facing rename to **Missions** (dynamic) / **Flows** (pre-established) is tracked in #1536.
