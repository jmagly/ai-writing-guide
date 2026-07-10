---
namespace: aiwg
name: aiwg-mission
platforms: [all]
kernel: true
description: Launch an AIWG Mission — durable, audited dynamic agent orchestration toward a completion criterion. AIWG owns the conductor (activity-log, gates, best-output, checkpoint/resume, cost); native primitives drive worker mechanism. Surfaces as /aiwg-mission in Codex (AIWG-owned, no plugin dependency).
---

# AIWG Mission

You are launching (or participating in) an **AIWG Mission** — AIWG's dynamic, durable, audited agent orchestration. A Mission decomposes a goal into worker cycles, runs them toward a measurable completion criterion, and aggregates the result, while AIWG owns the bookkeeping and gates regardless of which agent stack each worker runs on.

This is an **AIWG-specific kernel capability**. On Codex it surfaces as `/aiwg-mission`, deployed by AIWG to `~/.codex/prompts/` — it is **AIWG-owned**, not the plugin-provided `/workflow` an arbitrary Codex install may or may not have (`/workflow` is not a core Codex primitive — see `.aiwg/research/provider-workflow-integration.md`).

## Mission vs Flow vs in-stack primitive

- **Mission** (this skill) = *dynamic* orchestration. The shape emerges at run time from the goal. Cross-stack capable.
- **Flow** = a *pre-established* declarative YAML sequence (`flow.aiwg.io/v1`); use `aiwg discover` to find a matching Flow before improvising a Mission.
- **In-stack primitive** (Codex `/goal`, Claude's Workflow tool) = orchestrates *within one stack's process/turn*. A Mission may dispatch workers **to** these; they do not replace the Mission conductor.

## When this fires

Natural-language triggers:

- "launch a mission" / "start an AIWG mission"
- "orchestrate this across agents"
- "fan this out to several agents and aggregate"
- "spawn workers to do X until Y"
- "run a long unattended orchestration"
- "coordinate Codex and Claude agents on this" (cross-stack — see #1546)

Non-triggers (route elsewhere):

- A single focused task → just do it (no orchestration overhead; see `god-session` / `subagent-scoping`).
- A pre-established repeatable sequence → find the **Flow** via `aiwg discover` (e.g. `flow-release`, `flow-deploy-to-production`).
- An in-session "iterate until condition" on one stack → the provider-native `/goal` (Codex, Claude Code) already routes for that (#1451/#1469).
- "Address open issues" → the `address-issues` skill (which may itself run as a Mission).

## How to run a Mission

1. **State the completion criterion measurably** (per the `vague-discretion` rule). "good enough" is not a criterion; "all tests pass and CI green", "score ≥ 85", "every flagged finding verified" are. If the user's goal is vague, extract a checkable criterion first.

2. **Right-size + decompose.** Break the goal into independently-verifiable worker cycles (`subagent-scoping`). Decide single-stack vs cross-stack:
   - **Single-stack** (default): workers run on the current stack. Use this stack's native primitive for in-session fan-out where available; otherwise AIWG's external loop.
   - **Cross-stack** (#1546): when the operator wants heterogeneous stacks (e.g. Claude conductor → Codex workers), dispatch worker cycles to executors advertising the target `stack:<name>` capability via AIWG's `serve` executor-registry. The conductor stays AIWG-owned.

3. **Dispatch.** For durable/detached/unattended Missions use AIWG's external route (`aiwg mc dispatch` / `ralph-external`) so the Mission survives the session ending. For in-session orchestration, the native primitive may drive the *mechanism* — but AIWG still owns everything in step 4.

4. **Retain ownership (non-negotiable, identical across stacks).** Whatever drives the worker mechanism, AIWG owns:
   - activity-log entries (per the `activity-log` rule)
   - issue-thread comments / progress
   - human-authorization + threat gates (per `human-authorization`)
   - best-output selection across cycles
   - crash-resilient checkpoint/resume (durability)
   - reproducibility + cost tracking
   - LFD loop controls: measurable verifier, hypothesis-before-change,
     structural-variant quota, hard budget stop, and private eval/holdout
     channels where applicable

5. **Control the loss surface.** For any long-running, budgeted, or eval-driven
   Mission, declare observable iteration/wall-clock/token/tool/spend ceilings
   before dispatch. Each retry records the hypothesis, expected failure mode,
   distinguishing diagnostic, and whether the next attempt is structurally
   different. If the budget or exploration quota is exhausted, stop and emit a
   best-output report; do not continue by random walk. Eval/holdout Missions
   expose only aggregate score/probe/status or VOID to workers, while holdout
   answers and detailed lint diagnostics stay private. For durable Mission
   Control dispatch, use `--max-iterations`, `--max-total-tokens`,
   `--max-output-tokens`, `--max-tool-calls`, `--max-total-cost`,
   `--max-wall-clock-minutes`, and `--exploration-quota`.

6. **Converge + report.** Run cycles until the completion criterion is met (with a `max-cycles` escape hatch), select the best output, and report what each worker did and the aggregated result. Apply the anti-laziness recovery protocol (PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE) rather than abandoning on failure.

## Discover before improvising

Before hand-rolling a Mission, run `aiwg discover "<the goal>"` — a curated Flow or skill may already exist (the `skill-discovery` rule). A Mission is for genuinely *dynamic* orchestration where no pre-established Flow fits.

## References

- `.aiwg/architecture/adr-workflow-routing.md` — routing + cross-stack amendment
- `.aiwg/research/provider-workflow-integration.md` — why Codex `/workflow` is not core (#1535)
- #1534 (epic), #1544 (this command), #1546 (cross-stack Missions), #1536 (Missions/Flows naming)
- `aiwg mc` (mission-control) — the durable dispatch surface
