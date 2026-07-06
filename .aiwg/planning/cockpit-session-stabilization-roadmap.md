# Cockpit Session Stabilization — Roadmap for Coding Agents

**Source**: `.aiwg/reports/cockpit-session-management-audit-2026-07-06.md`
**Umbrella**: roctinam/aiwg#1737 · Upstream: roctinam/agentic-sandbox#602-#605
**Delivery mode**: `direct` (this repo) — commit straight to `main`, conventional
commits, `Closes #N` in the closing commit, **CI green before done**. No PRs, no
branches, no AI attribution. Each work packet's issue carries a full
implementation spec as a comment — read it before coding.

Every issue below has an **"Implementation spec (agent-ready)"** comment with
exact files/lines, change list, and measurable acceptance criteria. This roadmap
adds sequencing, dependencies, and per-packet verification commands. Agents:
treat the issue spec as the task contract; treat this file as the schedule.

---

## Dependency graph

```
Phase 1 (parallel, independent)          Phase 2                Phase 3               Phase 4
WP1  #1738 create dedupe ────────────┐
WP2  #1739 detach scoping ──┐        │
WP3  #1743 launch binding ──┼────────┼──► WP4 #1741 identity ─► WP7 #1744 replay ─► WP10 #1742 registry +
                            │        │    WP5 #1740 races   ─►  WP8 #1746 deadline    background monitoring
                            └────────┘    WP6 #1747 polling     WP9 #1745 membership
                                          (WP4 before WP5;      (WP7 before WP8)
                                           WP2 finalizes on WP4/WP5)

Upstream (agentic-sandbox, fully parallel to Phases 1-3):
WPU1 #604 idempotent create   → retires WP1's client-side workaround (keep it anyway as defense)
WPU2 #605 keyframe on join    → simplifies WP7 (client workaround stays as fallback)
WPU3 #603 list metadata       → lights up WP9's membership UI; feeds WP10
WPU4 #602 controller lease    → REQUIRED before WP10's "Take Control" is truthful
```

**Critical path to symptom relief**: WP1 + WP2 (independent, ship first, in
parallel). These two alone eliminate the duplicate-session factory and the
browse-kills-connection defect — the operator's two worst symptoms.

**Critical path to target UX**: WP4 → WP5 → WP7 → WP10, with WPU4 landing before
WP10's control semantics.

---

## Phase 1 — Stop the bleeding (3 packets, fully parallel)

| WP | Issue | Area | Size | Blast radius |
|---|---|---|---|---|
| WP1 | aiwg#1738 | bridge (`server.mjs`) + StartSessionModal timeout | S-M | create path only |
| WP2 | aiwg#1739 | web (`useSession.ts`, `Sessions.tsx`, attach sites) | S-M | attach lifecycle |
| WP3 | aiwg#1743 | web (`App.tsx` waitForSessionReady) | S | launch flow only |

Notes for agents:
- WP1 and WP2 touch disjoint files except `StartSessionModal.tsx` (WP1 changes a
  timeout constant; WP2 threads attach meta) — trivial to merge, but if run
  concurrently, land WP1 first.
- WP2 introduces the `attach(..., meta)` signature that WP4 formalizes. Implement
  meta as `{ instanceId, sessionId }` exactly so WP4 needs no rework.

**Verification (every Phase 1 packet)**:
```bash
npm --prefix apps/cockpit run check
npx vitest run test/integration/cockpit-bridge.test.js
npm run e2e:cockpit-dev        # real executor; safe-skips when absent
```

## Phase 2 — Identity and races (3 packets)

| WP | Issue | Depends on | Size |
|---|---|---|---|
| WP4 | aiwg#1741 (session identity = ids, not URLs) | WP2's meta plumbing | M |
| WP5 | aiwg#1740 (request tokens, selection pinning, flap grace) | WP4 (compare by id) | M |
| WP6 | aiwg#1747 (agent-id cache, poll scheduler) | none — parallel to WP4/WP5 | S-M |

Notes:
- WP4 and WP5 both edit `Sessions.tsx`; run sequentially (WP4 → WP5), same agent
  ideally.
- WP6's bridge half (`resolveSessionAgentId` TTL cache) is independent of the web
  half; can split into two commits.
- After WP4+WP5, revisit WP2's auto-detach condition to use fresh-list tokens
  (the WP2 spec already states the final form).

## Phase 3 — Attach fidelity (3 packets)

| WP | Issue | Depends on | Size |
|---|---|---|---|
| WP7 | aiwg#1744 (replay_from:0 fresh attach, repaint, status line) | none hard; after Phase 2 to avoid `useSession` collisions | S-M |
| WP8 | aiwg#1746 (first-frame deadline on silent sockets) | WP7 (shares replay plumbing) | S |
| WP9 | aiwg#1745 (hide fabricated membership fields) | none | XS |

Notes:
- WP7+WP8 are natural single-agent companions in `useSession.ts`.
- WP9 is a good warm-up packet for any agent; zero dependencies.
- If WPU2 (#605) lands first, keep the client-side `replay_from: 0` anyway —
  older executors stay in the field.

## Phase 4 — Target-UX architecture (1 large packet)

| WP | Issue | Depends on | Size |
|---|---|---|---|
| WP10 | aiwg#1742 (session registry store + background monitoring + targeted inject) | WP4 (identity); WPU4 for truthful control; WPU3 enriches | L |

Target UX (operator-confirmed): **one driven terminal + background monitoring** —
per-session response-needed detection, activity/liveness, unread-output badges,
server-side screen-snapshot previews. The full design is in the #1742 spec
comment. Suggested decomposition for subagents:

1. `sessionRegistry.ts` store + types + unit tests (no UI).
2. Bridge snapshot proxy `GET /api/instances/:id/sessions/:sid/screen` + integration test.
3. Background monitor loop + prompt-detection reuse + badges in `Sessions.tsx` nav.
4. Approvals aggregation of background response-needed.
5. Targeted inject (`sendInput(target)` refusal semantics) across Actions/Library.

Each sub-packet is independently committable and testable; do NOT attempt WP10 as
one monolithic change.

## Upstream track (agentic-sandbox — parallel from day one)

| WP | Issue | Size | Unblocks |
|---|---|---|---|
| WPU1 | sandbox#604 idempotency-key on session create | S-M | retires WP1 workaround |
| WPU2 | sandbox#605 keyframe/ring replay on fresh join, observer keyframe | M | simplifies WP7 |
| WPU3 | sandbox#603 session-list metadata (pty_ws_url, membership, liveness) | M | WP9 lights up, WP10 membership |
| WPU4 | sandbox#602 controller lease + takeover + stale reaping | M-L | WP10 "Take Control" truthfulness |

Sandbox verification: crate tests for `session/registry.rs` + ws-protocol
conformance harness; re-run `agentic-sandbox-conformance` after WPU2/WPU4 (they
touch the conformant pty surface). Cockpit README says: re-run the harness after
executor-surface changes.

---

## Handoff template (per packet)

When dispatching a packet to a coding agent, hand it exactly this:

```
Task: implement roctinam/aiwg#<N> (or roctinam/agentic-sandbox#<N>).
Read the issue BODY (defect analysis) and the "Implementation spec (agent-ready)"
COMMENT (files, changes, acceptance criteria) — the spec is the contract.
Context: .aiwg/reports/cockpit-session-management-audit-2026-07-06.md (finding F<x>/U<x>)
and .aiwg/planning/cockpit-session-stabilization-roadmap.md (sequencing).
Constraints: delivery.mode=direct — commit to main with conventional commits,
"Closes #<N>" in the final commit; CI must be green before done; do not touch
files owned by other in-flight packets (see roadmap phase notes); never delete
or weaken tests; add the tests named in the acceptance criteria.
Verify: npm --prefix apps/cockpit run check &&
npx vitest run test/integration/cockpit-bridge.test.js
(+ npm run e2e:cockpit-dev when a real executor is reachable).
Done means: every acceptance criterion in the spec comment is demonstrably met,
tests added, CI green, issue auto-closed by the commit.
```

## Release gating

- Phases 1-2 together warrant a patch release ("session integrity") — run the
  full matrix before tagging: `npm run uat:cockpit-live:matrix` (host/docker/vm,
  per README release gate), plus `npm run uat` at repo root.
- Phase 4 (WP10) + WPU4 is the "background monitoring" release; it changes the
  operator control model — screenshot-verify per surface and update
  `.aiwg/ux/cockpit-ux-design.md` before tagging.

## Status tracking

- Each packet's issue is the single source of status (this repo auto-closes via
  `Closes #N`).
- On completing any upstream WPU packet, comment on the corresponding aiwg
  packet(s) it unblocks so the Cockpit-side agent knows the workaround can be
  simplified.
- The umbrella aiwg#1737 closes when Phases 1-3 are done and WP10 has an accepted
  design commit; reassess then whether WP10 sub-packets get their own issues.
