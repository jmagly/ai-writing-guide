# Cockpit / agentic-sandbox Current-State Audit

**Date**: 2026-07-04
**Mode**: SDLC issue audit + architecture-evolution refresh
**Scope**: AIWG Cockpit integration state after agentic-sandbox July updates
**Primary issues**: aiwg#1653, #1654, #1655, #1656, #1657, #1639, #1595, #1592, #1591, #1565; agentic-sandbox#595, #597, #499, #503, #507, #518

## Executive Summary

The old Cockpit blocker framing is stale. Cockpit is no longer waiting for a basic real-sandbox swap: the Bridge now targets a real agentic-sandbox v2 executor by default, refuses the bundled mock unless a test harness opts in, derives Running and Approvals from per-instance A2A task surfaces, and has current tests for the v2-shaped control-plane path.

The remaining work is product integration and hardening: close the merged-console topology issue, complete the single Bridge-backed operator console, bring durable Missions into that console, finish live index/contribution features, and keep the VM/security evidence gaps tracked against agentic-sandbox.

## Current Evidence

### agentic-sandbox

- Current local checkout: `main`, latest tag `v2026.7.1`.
- Release `v2026.7.1` supersedes `v2026.7.0` as the July publication tag.
- July payload includes credential-proxy hardening, QEMU first-boot restart handling, release artifact recovery, and management startup file-descriptor resilience.
- The release notes still explicitly track remaining evidence gaps for agentic-sandbox#503, #507, #518, and #597.

### AIWG Cockpit

- `apps/cockpit/bridge/src/server.mjs` defaults to `http://127.0.0.1:8122`, refuses mock-like executors unless `AIWG_COCKPIT_ALLOW_MOCK_EXECUTOR=1`, and starts on Bridge port `8140` outside the sandbox `8120/8121/8122` range.
- `getInventory()` normalizes real admin v2 `/api/v2/admin/instances` payloads and falls back to agent-backed host inventory when the admin inventory is degraded.
- `getRunning()` derives active work from per-instance A2A task surfaces, not mock `/admin/running`.
- `getApprovals()` derives pending HITL prompts from A2A `input-required` / `hitl-prompt/v1` task surfaces, not mock `/admin/approvals`.
- `respondApproval()` routes approve/deny decisions back through A2A task response or `messages:send` candidates.
- `apps/cockpit/scripts/cockpit-up.sh` can bring up the sibling agentic-sandbox checkout and includes a temporary pre-start heal for agentic-sandbox#595.
- `apps/cockpit/web` has the current operator tabs: Home, Inventory, Running, Missions, Sessions, Approvals, Explore, Library, Telemetry, Memory, Actions.

### Verification Run

Command:

```bash
npm test -- --run test/integration/cockpit-bridge.test.js
```

Result:

```text
test/integration/cockpit-bridge.test.js: 30 tests passed
```

Covered behaviors include token-gated Bridge API and CSRF/origin checks, mock-executor refusal for dev/operator launch, real-v2-shaped admin inventory normalization, A2A-task-derived Running and Approval inbox, approval response routing, session create/list and attach URL normalization, port collision guard, durable Mission projection, session-inclusive unified events, contribution actions/screens/workflows, live index status validation, strict keychain failure, and capability search input validation.

## Issue Audit

### Closed / Resolved

- **aiwg#1654**: Closed 2026-07-04. The requested topology ADR exists and is accepted at `.aiwg/architecture/adr-cockpit-merged-console-topology.md`. The accepted decision is `apps/cockpit/web` as base, Cockpit Bridge as backend, existing opt-in `@aiwg/cockpit` package, and Mission conductor outside the Bridge.
- **aiwg#1639**: Closed 2026-07-04. Bridge derivation is implemented and covered by tests. The old "interim empty-degrade" blocker is no longer the active state; any remaining operator-wall-specific binding should be tracked as a narrower follow-up under aiwg#1655 or aiwg#1656.

### Addressed In Cockpit Slice

- **aiwg#1655**: Bridge now projects durable `aiwg mc` Missions plus live executor work and emits a unified event snapshot over inventory, sessions, tasks, HITL approvals, and Mission lifecycle.
- **aiwg#1656**: Useful legacy dashboard panels have moved into `apps/cockpit/web` (Telemetry and Memory), and `apps/web` is reduced to a compatibility landing surface that points operators to Cockpit.
- **aiwg#1657**: Cockpit has a first-class Missions tab backed by `.aiwg/ralph-external/mc/sessions/*/{session.json,log.jsonl}` plus live executor task/HITL projection.
- **aiwg#1595**: Strict keychain mode fails closed when OS-keychain storage is unavailable, shell-core rejects plaintext runtime files in strict mode, and redacted audit evidence covers lifecycle, session start, action inject, index rebuild, and approval response decisions.
- **aiwg#1592**: Explore includes live artifact-index status, query, and rebuild controls through Bridge-backed `aiwg index` routes.
- **aiwg#1591**: Contribution manifests now cover actions, first-party screens, hooks, and workflows, with Actions rendering contributed actions/screens/workflows and injecting workflow steps into sessions.
- **Follow-up scope**: deeper vector UX, event-hook execution, and contribution sandbox policy can be tracked as follow-up hardening rather than blockers for this addressed slice.
- **aiwg#1565**: Keep open. The Bridge can surface/respond to HITL prompts, but orchestration policy still needs identity, routing, escalation, timeout, audit, and Mission-state rules.

### Track In agentic-sandbox

- **agentic-sandbox#595**: Still open in tracker, but Cockpit has a defensive pre-start registry normalizer. Remove the Cockpit workaround after the sandbox fix is released and adopted.
- **agentic-sandbox#597**: Release notes say QEMU first-boot restart handling landed in the July payload, but the issue remains open. Needs a real VM-tier validation comment or closure in the sandbox tracker.
- **agentic-sandbox#499**: Claude auth propagation remains relevant for provider parity, but it no longer blocks Codex-backed Cockpit proof.
- **agentic-sandbox#503/#507/#518**: Security market-readiness evidence, transport verification, and credential leakage harness remain launch-readiness work, not Cockpit feature blockers.

## Architecture Baseline

The accepted baseline is:

- **UI base**: `apps/cockpit/web`.
- **Backend**: Cockpit Bridge.
- **Executor substrate**: real agentic-sandbox v2 surfaces.
- **Live state**: admin v2 inventory + A2A tasks + PTY sessions.
- **Durable orchestration**: Mission conductor / `aiwg mc`, projected into Cockpit rather than implemented inside the Bridge.
- **Package**: opt-in `@aiwg/cockpit`, installed via `aiwg use cockpit`.
- **Legacy UI**: `apps/web` is source material until explicitly retired or redirected.

## Roadmap

### Phase 0: Tracker Hygiene and Baseline Lock

- [x] Close aiwg#1654 with the accepted topology ADR.
- [x] Close aiwg#1639 as the real-v2 derivation blocker.
- [x] Comment on agentic-sandbox#597 requesting closure or updated VM validation against `v2026.7.1`.
- [x] Record this audit in the parent epic aiwg#1653.

### Phase 1: Bridge Backend Completion

- [x] Add Mission status/projection endpoints to the Bridge without moving Mission durability into the Bridge.
- [x] Normalize one event model for inventory, task updates, HITL prompts, session events, and Mission lifecycle updates.
- Replace heartbeat-only refresh with source-driven updates where upstream supports events.
- [x] Add contract fixtures for Mission projection alongside the existing real-v2 admin fixtures.

### Phase 2: Mission Surface

- [x] Add a Missions tab with active, completed, failed, and awaiting-approval states.
- [x] Show `aiwg mc`-started Missions and live executor work from the same state projection.
- Add operator actions for observe, attach, respond, pause/resume, cancel, and handoff where the conductor supports them.
- [x] Bind Mission audit tail into the detail view.

### Phase 3: UI Consolidation

- [x] Port only the useful `apps/web` panels into `apps/cockpit/web`: telemetry, memory, onboarding, and any terminal affordances not already represented.
- [x] Retire or redirect duplicate `apps/web` operator-console routes.
- [x] Add a migration note documenting the single launch path and changed URLs.

### Phase 4: Extensibility and Index UX

- [x] Promote contribution manifests from action lists to real first-party screens/workflows.
- [x] Add index inspect/query/rebuild controls with audit records.
- Extend contributed workflows with event hooks and sandbox policy enforcement.
- Add deeper vector inspect/create controls beyond the current index status/query/rebuild slice.

### Phase 5: Security and Release Readiness

- [x] Finish OS-keychain strict mode and shell handshakes across browser, VS Code, and Tauri.
- [x] Add dispatch/approval audit evidence that Cockpit relays operator intent but core validates authorization.
- Run the real live matrix against agentic-sandbox `v2026.7.1+`, including host, Docker/container, VM, Codex, Claude where auth-state support permits, HITL, and PTY replay.
- Remove temporary #595 healing after the sandbox fix is proven.

## Recommended Follow-Ups

1. Replace heartbeat refresh with source-driven events where the executor/conductor exposes them.
2. Add conductor-backed Mission controls for pause/resume/cancel/handoff when those APIs are stable.
3. Extend contribution workflows with event-hook execution and sandbox policy enforcement.
4. Add deeper vector inspect/create controls beyond the current index status/query/rebuild slice.
5. Run and record the full live matrix against agentic-sandbox `v2026.7.1+`.
