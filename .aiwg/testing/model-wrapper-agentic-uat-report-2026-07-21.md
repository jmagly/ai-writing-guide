# Model Wrapper Agentic UAT Report

Date: 2026-07-21
Plan: `.aiwg/testing/model-wrapper-agentic-uat-plan-2026-07-21.md`
Status: In progress — authorization-gated cases remain

## Summary

The policy, routing, deployment, live efficiency/coding rehearsals, and both
regeneration branches pass. The first reasoning rehearsal failed and produced
three defects: #1832, #1833, and #1834. Safe issues #1832 and #1833 were fixed
and the final reasoning rerun passed; #1834 is waiting for issue-specific authorization after a
false-positive threat flag. Existing-project extraction case MW-020 is likewise
waiting for issue-specific authorization on #1830. Full-suite verification also
exposed a characterization-test isolation defect (#1835); the test now runs the
mutating `--new` alias in a disposable project and leaves the checkout clean.
Two pre-existing release-hygiene findings were filed separately: stale tracked
`AGENTS.md` exceeds the context ceiling (#1836), and the aggregate parallel unit
suite refreshes two generated count lines in tracked `AIWG.md` even though every
isolated unit partition is clean (#1837).

Runtime child-model telemetry is not exposed by the active subagent surface.
Model ids below are compiled catalog/deployment evidence and are not represented
as directly observed runtime identity.

## Environment

- Repository: `/home/roctinam/dev/aiwg`
- Base commit: `27be1bc6f3ef9c83d3a3f4f4176742bc779b4444`
- Provider under live routing: Codex
- Catalog source: local fresh cache with committed static fallback
- Effective Codex roles:
  - efficiency: `gpt-5.3-codex-spark`
  - coding: `gpt-5.6-sol`
  - reasoning: `gpt-5.6-sol`
- Isolated provider targets: explicit `/tmp/aiwg-*` directories; no credential
  material captured

## Results

| ID | Result | Evidence |
| --- | --- | --- |
| MW-001 | PASS | 33/33 provider × role compilations across 11 providers; degraded outcomes explicit |
| MW-002 | PASS | Deterministic route emits no wrapper/model |
| MW-003 | PASS | Routine `aiwg-status` route → economy/efficiency/`gpt-5.3-codex-spark` |
| MW-004 | PASS | Complex agent route → standard/coding/`gpt-5.6-sol` |
| MW-005 | PASS | High-impact premium route requires confirmation without authorization |
| MW-006 | PASS | `--allow-premium` → premium/reasoning/`gpt-5.6-sol` without duplicate confirmation |
| MW-007 | PARTIAL | Missing/type-mismatched capability now fails; missing-value parser remains #1834 |
| MW-008 | PASS | Live route uses cached observed Codex models and static policy metadata |
| MW-009 | PASS | Isolated Codex addon and framework deployments contain and validate all wrappers |
| MW-010 | PASS | Isolated Claude addon deployment contains and validates all wrappers |
| MW-011 | PASS | Missing wrapper named exactly; stale current Codex pins reported field-by-field |
| MW-012 | PASS | Static matrix reports global-only, compiled, or unsupported providers honestly |
| MW-013 | PASS | Efficiency subagent loaded wrapper + `aiwg-status`; `aiwg status` exit 0; no edits |
| MW-014 | PASS | Coding subagent loaded wrapper + `test-engineer`; 37/37 focused tests; no edits |
| MW-015 | PASS | Final reasoning rerun found no remaining high/medium contract or false-certification defect; #1834 excluded by gate |
| MW-016 | PASS | Canonical apply/reapply produced identical hashes for all four context files |
| MW-017 | PASS | Legacy apply/reapply produced identical `.aiwg/AIWG.md` and `AGENTS.md` hashes |
| MW-018 | PASS | Conflicting and unknown regenerate options exit with usage status in focused tests |
| MW-019 | PASS | Both branches idempotent; dry-runs non-mutating |
| MW-020 | BLOCKED | #1830 requires explicit issue-specific authorization before extraction changes |
| MW-021 | PASS | Focused and full CLI-router characterization runs leave root `WORKSPACE.md` absent |

The final polling-mode full suite passed 7,809 tests with 28 skips across 472
files. Native inotify mode could not allocate another watcher because the host
session had reached the 128-instance user ceiling; the isolated watcher suite
passed 25/25 with `CHOKIDAR_USEPOLLING=1`. Typecheck, build, and `git diff
--check` passed. The aggregate suite's separate tracked `AIWG.md` count side
effect is recorded in #1837 and was restored before delivery.

## Live Subagent Evidence

### MW-013 — Efficiency

- Loaded `aiwg-model-efficiency-worker` through `aiwg show agent`.
- Discovered and loaded stable `aiwg-status` skill id
  `aiwg:skill:7dac841e59bdae0d`.
- `aiwg status` exited 0 and reported a healthy workspace with the known
  partial/mixed migration warning.
- Before/after worktree lists were identical.

### MW-014 — Coding

- Loaded the coding wrapper and `test-engineer` with discover/show-first.
- Ran wrapper route, wrapper deployment, legacy injection, Steward, and
  regenerate handler suites: 5 files, 37 tests, all passed.
- Before/after worktree lists were identical.

### MW-015 — Reasoning, first run

The security-auditor rehearsal found:

1. Filename-only deployment verification accepted empty or stale artifacts → #1832.
2. A nonexistent capability produced a plausible envelope → #1833.
3. `--assignment --json` consumed the next option as the value → #1834.

#1832 and #1833 passed mandatory threat preflight and were fixed. #1834's
preflight flagged the phrase "flag value" as environment probing; no #1834 code
change has been made while authorization is pending.

The final MW-015 rerun verified stale-wrapper rejection with filter selectors,
fresh filtered deployment, explicit coding-model override validation, missing and
type-mismatched capability rejection, and a valid stable/provenanced
`security-auditor` reasoning route. It passed with no remaining high/medium
finding in the authorized scope.

## Deployment Evidence

Fresh standalone `aiwg use aiwg-utils` deployments for Codex and Claude reported:

```text
Model wrappers verified: aiwg-model-reasoning-worker,
aiwg-model-coding-worker, aiwg-model-efficiency-worker
```

A full isolated `aiwg use sdlc --provider codex` deployment also passed wrapper
validation after all addons/extensions were deployed. Content-aware verification
now rejects empty/malformed artifacts. The repository deployment was refreshed
for both Codex and Claude with context-file emission disabled; the three Codex
wrappers now pin `gpt-5.6-sol`, `gpt-5.6-sol`, and
`gpt-5.3-codex-spark` for reasoning, coding, and efficiency respectively, while
the operator-authored root context remained byte-identical and no `WORKSPACE.md`
was created.

## Regeneration Evidence

- Canonical target: `/tmp/aiwg-regenerate-uat-canonical.odQI3J`
- Legacy target: `/tmp/aiwg-regenerate-uat-legacy.8WOHVx`
- Canonical second-run hashes matched the first run for `WORKSPACE.md`, `AIWG.md`,
  `.aiwg/AIWG.md`, and `AGENTS.md`.
- Legacy second-run hashes matched for `.aiwg/AIWG.md` and `AGENTS.md`; no
  `WORKSPACE.md` was created.

The explicit temporary rehearsal directories were removed after their evidence
was summarized; they are not release artifacts.

## Defect Ledger

| Issue | Preflight | Status |
| --- | --- | --- |
| #1829 | safe | Explicit legacy/canonical regenerate branches implemented; final delivery pending |
| #1830 | flag (false-positive negative safety wording) | Awaiting issue-specific authorization |
| #1831 | safe | Capability-bound wrapper route and installer verification implemented |
| #1832 | safe | Fixed; final MW-015 rerun passed |
| #1833 | safe | Fixed; final MW-015 rerun passed |
| #1834 | flag (false-positive "flag value" wording) | Awaiting issue-specific authorization |
| #1835 | safe | Characterization alias isolated in disposable cwd; focused and full regression pass |
| #1836 | safe (score 3, tracked context target) | Pre-existing stale `AGENTS.md`; canonical regeneration is gated with #1830 |
| #1837 | safe (score 3, tracked context target) | Parallel aggregate unit-suite side effect filed; isolated partitions are clean |

## Release Gate

Not yet satisfied. Remaining work: resolve authorized cases, run final full
verification, deliver a signed commit, confirm green remote CI, and close only
fully completed issues.
