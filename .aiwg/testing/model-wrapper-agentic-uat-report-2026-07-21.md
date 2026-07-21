# Model Wrapper Agentic UAT Report

Date: 2026-07-21
Plan: `.aiwg/testing/model-wrapper-agentic-uat-plan-2026-07-21.md`
Status: PASS — local UAT complete; remote delivery gate pending

## Summary

The policy, routing, deployment, three live subagent rehearsals, and all three
regeneration branches pass. The first reasoning rehearsal produced #1832,
#1833, and #1834; all three are now fixed and covered by regressions after the
operator explicitly authorized #1834. The separately authorized #1830 existing-
project path extracted a bounded, attributed snapshot, migrated provider roots
atomically, proved rollback and reapply, and is idempotent. The ordinary
unqualified `aiwg-regenerate` selector now routes intelligently between fresh,
existing, and already-adopted projects. The resulting minimal root adapters also
resolve #1836's context ceiling. Earlier findings #1835 and #1837 remain closed.

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
| MW-007 | PASS | Missing/type-mismatched capability and missing option values fail with usage status; no launch envelope |
| MW-008 | PASS | Live route uses cached observed Codex models and static policy metadata |
| MW-009 | PASS | Isolated Codex addon and framework deployments contain and validate all wrappers |
| MW-010 | PASS | Isolated Claude addon deployment contains and validates all wrappers |
| MW-011 | PASS | Missing wrapper named exactly; stale current Codex pins reported field-by-field |
| MW-012 | PASS | Static matrix reports global-only, compiled, or unsupported providers honestly |
| MW-013 | PASS | Efficiency subagent loaded wrapper + `aiwg-status`; `aiwg status` exit 0; no edits |
| MW-014 | PASS | Coding subagent loaded wrapper + `test-engineer`; 37/37 focused tests; no edits |
| MW-015 | PASS | Final reasoning rerun found no remaining high/medium contract or false-certification defect; #1834 parser regression passes |
| MW-016 | PASS | Canonical apply/reapply produced identical hashes for all four context files |
| MW-017 | PASS | Legacy apply/reapply produced identical `.aiwg/AIWG.md` and `AGENTS.md` hashes |
| MW-018 | PASS | Conflicting and unknown regenerate options exit with usage status in focused tests |
| MW-019 | PASS | Both branches idempotent; dry-runs non-mutating |
| MW-020 | PASS | Authorized extraction preview/apply, credential refusal, rollback, reapply, and idempotence pass; final transaction `2026-07-21T16-24-56-526Z-1fe6077d` |
| MW-021 | PASS | Full characterization suite remains fixture-contained; authorized repository adoption is explicit and healthy |
| MW-022 | PASS | Five selector regressions cover fresh/existing/adopted/explicit routing; `aiwg run skill aiwg-regenerate -- --dry-run` selected canonical workspace on the adopted root |

The final polling-mode full suite passed 7,836 tests with 28 skips across 473
files. Typecheck, build, context-size lint, schema/generated-artifact lint,
conformance (142/142), UAT (107/107), and Fortemi release discovery (21/21)
passed. `workspace-context doctor --json` reports healthy, and the second apply
created no transaction or file changes.

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
preflight flagged the phrase "flag value" as environment probing; the operator
explicitly authorized #1834, and the parser now rejects both end-of-input and a
following option token for every value-bearing route flag.

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
- Authorized existing-project preview enumerated stable sources and exact targets.
  Apply transaction `2026-07-21T16-23-16-065Z-b517a084` was rolled back live,
  restoring all nine targets; corrected reapply transaction
  `2026-07-21T16-24-56-526Z-1fe6077d` is retained and a repeat apply was a no-op.
- The retained repository graph keeps root adapters small (`AGENTS.md` and
  `AGENTS.override.md` approximately 0.5 KiB) while provider bodies live under
  `.aiwg/context/providers/` and remain linked from `WORKSPACE.md`.

The explicit temporary rehearsal directories were removed after their evidence
was summarized; they are not release artifacts.

## Defect Ledger

| Issue | Preflight | Status |
| --- | --- | --- |
| #1829 | safe | Closed by signed delivery `61b028a1a`; remote CI green |
| #1830 | flag (false-positive negative safety wording) | Authorized; implemented and locally verified; delivery gate pending |
| #1831 | safe | Closed by signed delivery `61b028a1a`; remote CI green |
| #1832 | safe | Closed by signed delivery `61b028a1a`; final MW-015 rerun passed |
| #1833 | safe | Closed by signed delivery `61b028a1a`; final MW-015 rerun passed |
| #1834 | flag (false-positive "flag value" wording) | Authorized; implemented and locally verified; delivery gate pending |
| #1835 | safe | Closed by signed delivery `61b028a1a`; characterization regressions pass |
| #1836 | safe (score 3, tracked context target) | Resolved by authorized adoption; context-size lint passes; delivery gate pending |
| #1837 | safe (score 3, tracked context target) | Closed by signed delivery `2239c6eba`; aggregate unit suite is clean |

## Delivered Verification

- Signed commit `61b028a1a5855162ac5d4c1d8587c662406d3568` delivered the
  regenerate branches, capability-bound routing, wrapper verification, and UAT
  fixes. Gitea CI run 3784 completed successfully.
- Signed commit `2239c6eba14f6e6bc7a890360c8a241e6de964f5` made
  `deploy-agents.mjs` import-safe and added a regression that imports it from a
  disposable working directory. Gitea CI run 3788 completed successfully.
- The retained repository adoption is healthy and idempotent. Its rollback
  transaction remains local and ignored; only the canonical graph and provider
  source files are release artifacts.

## Release Gate

Local acceptance is satisfied. Remaining delivery work is to create and push the
signed commit, confirm green remote CI, and only then close #1830, #1834, and
#1836.
