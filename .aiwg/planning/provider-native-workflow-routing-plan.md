# Planning: Route AIWG's External Agent-Loop to Provider-Native `/workflow`

**Status:** draft (planning)
**Provider scope:** Codex, Claude Code (field-confirmed `/workflow`); others as their primitives appear
**Prior art:** #1451 (Codex `/goal`, closed), #1469 (Claude `/goal`, closed)
**Related collision:** AIWG "workflow" terminology (see Naming Disambiguation)

---

## Context & Prior Art

AIWG already routes the **in-session** loop to provider-native `/goal`:

- **#1451** (closed) — Codex: `agent-loop`/`address-issues` detect the provider and delegate the in-session iterate-to-completion loop to native `/goal`. AIWG retains activity-log entries, issue-thread comments, threat/human-authorization gates. Landed: `.aiwg/research/codex-goal-integration.md`, `.aiwg/architecture/adr-codex-goal-routing.md`, the `agent-loop/SKILL.md` Step 0 table, and the `address-issues` cycle-dispatch branch.
- **#1469** (closed) — Claude Code: near-verbatim mirror; both providers expose `/goal`, so the routing generalizes to "provider with native `/goal` → delegate."

Both issues **explicitly carved out** the external/background route: *"`ralph-external` / `agent-loop-ext` stays AIWG-native — `/goal` is in-session only,"* and likewise `mc` parallel fan-out.

## Problem / Gap

The operator reports (field-tested on the latest installed releases of Codex and Claude Code) that both now ship a `/workflow` command that is **functionally equivalent to AIWG's external agent-loop route** — the cross-session, longer-horizon orchestration primitive, not the in-session `/goal` loop.

That is precisely the slot #1451/#1469 carved out. So this plan applies the **same provider-detect-and-delegate pattern, one layer out**: route AIWG's external route to provider-native `/workflow`, with AIWG retaining the responsibilities the provider primitive does not cover.

## Provider `/workflow` — KNOWN vs UNVERIFIED

**KNOWN**
- Operator field-confirmed `/workflow` exists and runs in the latest installed Codex and Claude Code releases, behaving like a long-horizon / multi-step orchestration primitive (the external-route analog of `/goal`).
- Claude Code exposes dynamic multi-agent orchestration directly (the `Workflow` capability used by AIWG sessions; `/workflows` monitors live runs).

**UNVERIFIED (must pin before implementation)**
- Codex `/workflow` is **not present in the OSS mirror** as of `openai/codex@e93dc98` (cloned this session). The mirror lags the shipped binary; absence in source is **not** evidence of absence in the release. Verify against the **released binary** (`/help`, `/workflow`) and re-check OSS once it catches up.
- Exact argument shape / completion-criteria semantics of `/workflow` on each provider.
- In-session vs cross-session persistence; crash-resilience; whether it checkpoints.
- Programmatic invocation vs operator-typed (mirror the `/goal` textual-fallback resolution from #1451).
- Relationship to the provider's `/goal`, `/plan`, `/agent`, `/subagents` (Codex's nearest current primitives at `e93dc98`).

## Proposed Routing Design

Mirror the #1451/#1469 seam one layer out:

1. **Seam — external route entrypoints:** `src/cli/handlers/ralph.ts`, `ralph-launcher.ts`, `local-executor.ts`, `tools/ralph-external/*`, and the `agent-loop-ext` / `ralph-external` command. Add a provider-detection branch (via `aiwg runtime-info` / steward capability surface): on a provider with native `/workflow`, delegate the orchestration mechanism to `/workflow`; otherwise run AIWG's native external loop.
2. **Skill surface:** extend the `agent-loop/SKILL.md` Step 0 capability table with an **external-route row** ("provider with native `/workflow` → delegate external orchestration"), and the matching branch in `address-issues` where it dispatches background cycles.
3. **Steward capability surface:** add `/workflow` alongside `/goal` in the provider capability map.
4. **Textual fallback:** if the host cannot invoke `/workflow` programmatically, emit the exact `/workflow "…"` line for the operator (mirror the `/goal` fallback).

## Non-Delegatable AIWG Responsibilities

Even when iteration/orchestration is delegated to `/workflow`, AIWG retains (these are not provided by the provider primitive and are required by AIWG rules):

- **Activity-log entries** (`activity-log` rule) and **issue-thread comments**.
- **Human-authorization + threat gates** (`human-authorization`, security rules).
- **Best-output selection** across iterations (`tools/ralph-external/best-output-tracker.mjs`; REF-015).
- **Crash-resilient checkpointing / resume** (`checkpoint-manager.mjs`) — unless the provider primitive demonstrably provides equivalent durability.
- **Reproducibility** (`reproducibility` rules) and **cost tracking**.

The provider `/workflow` drives the *orchestration mechanism*; AIWG owns *bookkeeping, gates, durability, and output selection* — exactly the division #1451/#1469 established for `/goal`.

## Naming Disambiguation (operator-raised)

AIWG overloads "workflow," which now collides with the provider `/workflow` command. Two AIWG concepts need disambiguation:

1. **Pre-established** — the workflow *metalanguage* / playbooks under `agentic/code/addons/aiwg-utils/workflow/` (`WorkflowCapability`, `WorkflowPlaybook`, `WorkflowInventory`, `WorkflowGate`, `WorkflowRole`, `WorkflowExtension`). (Also adjacent: SDLC `flow-*` commands.)
2. **Dynamic** — AIWG's dynamic multi-agent orchestration (the script-fanout / `mc` mission-control style runs).

Renaming is a deliberate decision (tracked as an ADR/decision issue). Candidate schemes — to be chosen by the operator:

| Scheme | Pre-established | Dynamic | Notes |
|---|---|---|---|
| A | Playbooks | Orchestrations | `WorkflowPlaybook` already half-named "playbook" |
| **B (CHOSEN)** | **Flows** | **Missions** | reuses existing AIWG vocabulary (`flow-*` SDLC commands, `mc` missions) |
| C | Routines | Conductions | distinct from provider terms; `mc` = "conductor" |

**Decision (operator): Scheme B — Flows + Missions.** The pre-established workflow metalanguage/playbooks become **Flows** (unifying with the existing SDLC `flow-*` commands, which are themselves pre-established sequences), and the dynamic multi-agent orchestration becomes **Missions** (unifying with `mc` mission-control, which already uses "missions" and a "conductor"). Reconciliation note: "Flows" currently denotes the SDLC `flow-*` family; the rename must decide whether the metalanguage *merges into* that family or sits beside it as a distinct "Flows" kind — resolved in the rename ADR.

## Phase-1 Verification Tasks (the unknowns)

1. Introspect the **released** Codex + Claude binaries for `/workflow` (`/help`, run it) — capture argument shape, completion semantics, persistence model, programmatic-vs-typed.
2. Re-check `openai/codex` OSS once the mirror catches up to the release that introduced `/workflow`; cite the source path when available.
3. Confirm AIWG bookkeeping/gates/checkpoint/best-output can wrap the `/workflow` run (audit trail identical to the native external loop).
4. Decide Codex-vs-Claude collapse (one shared "/workflow" row) vs siblings (if dialects diverge) — mirror the #1469 collapse decision.

## Risks

- **Source lag:** planning against a primitive whose exact contract isn't in OSS yet. Mitigation: gate implementation on Phase-1 binary introspection; field-test is authoritative for existence, binary introspection for contract.
- **Durability mismatch:** if `/workflow` is in-session/non-durable, it does NOT replace `ralph-external`'s crash-resilience — delegation would then be partial (mechanism only), AIWG still owns resume.
- **Naming churn:** renaming the metalanguage touches schemas/docs/skills; scope carefully behind the ADR decision.

## Right-Size

Per `sdlc-right-sizing`: medium, mirroring #1451/#1469 — **issue + Phase-1 verification + ADR + extend skills/handlers in place**. No formal intake. The naming rename is a separate ADR-gated decision (may widen scope if a full metalanguage rename is chosen).

## Reasoning

1. **Problem analysis.** The external route is the one loop tier AIWG still emulates natively; the provider now (field-confirmed) ships a matching primitive. Continuing to emulate where a native primitive exists contradicts `cli-secondary`.
2. **Constraint identification.** OSS mirror lags release; AIWG rules require retained bookkeeping/gates/durability; "workflow" is an overloaded term.
3. **Alternatives considered.** (a) Leave external route AIWG-native — rejected, contradicts the #1451/#1469 trajectory and `cli-secondary`. (b) Per-provider clone skills — rejected for #1451's reason (same work, internal branch). (c) Delegate everything including durability — rejected unless `/workflow` proves durable; otherwise AIWG retains resume.
4. **Decision rationale.** Mirror the proven `/goal` pattern one layer out; delegate mechanism, retain ownership; gate on binary introspection because source lags.
5. **Risk assessment.** Primary risk is contract-unknown; mitigated by Phase-1 verification against the released binary before implementation.

## References

- #1451, #1469 — the `/goal` routing this mirrors
- Seam: `agentic/code/addons/agent-loop/skills/agent-loop/SKILL.md` (Step 0), `agentic/code/frameworks/sdlc-complete/skills/address-issues/SKILL.md`, `src/cli/handlers/ralph*.ts`, `tools/ralph-external/`
- Collision surface: `agentic/code/addons/aiwg-utils/workflow/`
- Rules: `cli-secondary`, `steward`, `sdlc-right-sizing`, `activity-log`, `human-authorization`, `reproducibility`
- OSS data point: `openai/codex@e93dc98` (no `/workflow` in `SlashCommand` enum as of clone; mirror lags release)
