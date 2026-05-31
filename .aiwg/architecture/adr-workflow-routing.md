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

## Consequences

- Claude Code in-session orchestration can use the native Workflow tool; AIWG still owns the durable/detached path and all bookkeeping.
- Codex and other providers' external route is unchanged (AIWG-native), correctly reflecting verified capability.
- The `agent-loop` Step 0 table gains one external-orchestration row (Claude Code); no provider clone skills.

## Follow-ups

- If the operator confirms a Codex plugin-provided `/workflow`, scope a separate optional-delegation note (not a core contract).
- Naming: this ADR uses "orchestration"; the user-facing rename to **Missions** (dynamic) / **Flows** (pre-established) is tracked in #1536.
