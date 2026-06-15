# Handoff — Cockpit build + issue triage session

**Date:** 2026-06-14/15 · **Branch:** main · **State:** all committed + pushed, CI green at HEAD.

This session (1) built the AIWG Cockpit end-to-end against the mock, (2) corrected its core
model on operator feedback, (3) fixed two P1 regenerate bugs, and (4) audited + triaged the
open-issue backlog. Everything below is on `main`.

---

## 1. What shipped

### AIWG Cockpit — `apps/cockpit/` (opt-in; never in base npm — guarded)
A UX-first control plane over AIWG + multi-stack agentic sessions. Commits `26038c94…a77ae181`.

**Core model (ADR — read first):** `.aiwg/architecture/adr-cockpit-session-control-not-cli-runner.md`
> The Cockpit is a **session-control surface, not a CLI runner**. Action buttons **inject a
> command into an agentic session**; the agent runs the CLI. The Cockpit only sources read-only
> catalog data for display. This was a mid-session correction — the first cut wrongly had the
> Bridge spawn `aiwg`.

**Stack (operator decisions):** React 19 + Vite + TS frontend (`apps/cockpit/web/`); fortemi-react
*patterns* for the Tenor-style capability search (modeled, not imported — its data layer is
PGlite-bound); user assets are **files on disk** under `~/.aiwg/cockpit/library` (AIWG install
files never written).

**Components:**
| Path | Role |
|---|---|
| `web/` | React UI — 8 tabs: Home, Inventory, Running, Sessions, Approvals, Explore, Library, Actions |
| `mock-executor/` | wire-faithful agentic-sandbox A2A v2 stand-in (conformance was 33/0/17) |
| `bridge/` | token-gated control-plane server; serves the built `web/dist`; registry + library endpoints |
| `shell-core/` | cross-shell handshake (read runtime token → connect) |
| `vscode/` · `desktop/` | VS Code extension (runnable) + Tauri scaffold (build toolchain-gated) |
| `contrib/` | declarative UI contribution schema (actions inject commands) |
| `poc/` | Iteration-1 risk-gate PoCs (kill-bridge isolation, security) |

### P1 fix — regenerate additive hook (#1597, #1579) — closed
`regenerate`/`use` no longer skip an operator-owned `AGENTS.md`/`WARP.md`/`.hermes.md`; they
**additively install the `@AIWG.md` hook** (content preserved, idempotent, no `--force`).
`src/smiths/context-pipeline/managed-hook.ts` + generator wiring + `doctor` AGENTS.md check +
tests. Commit `a77ae181`, CI green.

---

## 2. How to run + verify

```bash
npm --prefix apps/cockpit run build:web            # install + vite build → web/dist
node apps/cockpit/mock-executor/src/server.mjs     # :8122 executor
node apps/cockpit/bridge/src/server.mjs            # :8120 → open the printed URL (token auto-injected)

npm --prefix apps/cockpit run check                # build + typecheck + render/a11y + smokes + PoCs
npx vitest run test/integration/cockpit-bridge.test.js test/smoke/cockpit-base-footprint.test.js
```

---

## 3. Outstanding work (prioritized)

1. **#1587 — debloat 33 oversized SDLC agent defs (>16KB).** ACTIVELY BLOCKS subagent dispatch
   ("Prompt is too long"). Decided to do next. **Method:** one subagent per def, trim to lean
   core + the 2–3 mandated few-shot examples (do NOT drop below the floor or weaken assertions),
   then add a `validate-metadata` size lint. Worst: security-auditor 44KB, test-engineer 41KB.
2. **#1589 — real agentic-sandbox swap** (the Cockpit's one real dependency; + agentic-sandbox
   #460 host target / #461 sessions). Contract-preserving change at the Bridge `MOCK_URL` seam,
   validated by the same conformance harness. Queued with the sandbox agent.
3. **Cockpit child remainders (all open under #1588):** #1595 OS-keychain, #1594 Tauri build,
   #1593 opt-in npm publish, #1592 file-watch auto-refresh, #1591 screen-render + event-hook exec.
4. **6.0 provider validation under #1586** (the 5.13 epic #1517 + children were closed/rolled here).

---

## 4. Gotchas / lessons (so the next session doesn't relearn them)

- **Drive the real browser** — smokes false-passed on two bugs only a render caught: (a) a literal
  `</head>` in `web/index.html`'s comment made Vite inject the bundle *inside* the comment → blank
  app; (b) the Bridge served the shell cacheable, masking rebuilds. Both fixed + the tests hardened
  (strip comments before asserting; `no-cache` on the shell, `immutable` on hashed assets).
- **Conformance harness** (`/tmp/as-conformance/asc`) was cleared from `/tmp` (multi-day session).
  Re-acquire from `agentic-sandbox-conformance` to re-run. The mock additions since (session-create,
  library) don't touch conformant discovery/A2A/pty surfaces.
- **Background `node` servers get reaped at turn boundaries** in this environment — re-launch as
  needed; the mock died repeatedly. For an extended review, run the two commands in your own terminal.
- **`web/dist` + `node_modules` are gitignored** — the Bridge serves dist when built, falls back to
  the legacy vanilla page (`bridge/src/public/index.html`) in CI (no build there). Tests assert
  page-agnostic shell truths; rendered a11y is the jsdom test in `web/src/App.test.tsx`.
- **CI "Build failure" on a superseded commit** = concurrency-cancel from the next push, not a real
  failure — verify the *latest* run, not the cancelled one.

---

## 5. Issue tracker state (this session)

**Closed (10):** #1590 (spike), #1597 + #1579 (regenerate fix), #1517 + its 5 children
(#1518/#1520/#1523/#1525/#1528 → rolled to #1586), #1482 (not-planned).
**Refreshed/commented:** epic #1588 + children #1591–1595 (mock-complete + remainders), #1508
(check-dated), #1586 (validation roll-up).
**Labeled:** 12 previously-unlabeled issues.

---

## 6. Key references
- `apps/cockpit/README.md` — app overview + run/verify
- `.aiwg/architecture/adr-cockpit-session-control-not-cli-runner.md` — the core model
- `.aiwg/architecture/cockpit-sad.md` · `cockpit-instance-control-interface.md` — design + seam
- `.aiwg/reports/cockpit-abm-gate.md` — risk-gate closure + PoC evidence
- `.aiwg/planning/cockpit-construction-plan.md` — iteration roadmap
- Epic roctinam/aiwg#1588
