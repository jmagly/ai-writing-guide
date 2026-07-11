# Last-Cycle Audit — LFD Control-Patterns Refactor (issue #1585) and adjacent work

**Date**: 2026-07-11
**Scope**: Commits `9fe5af09f` (feat(agent-loop): add LFD control patterns), `9acf62206` (test(ralph): verify LFD loop controls in UAT), plus the surrounding cycle (`3810b081a` release sidecars, `9a9dd62b2` skill-usage telemetry). Audited: runtime implementation, CLI/MCP exposure surfaces, rules/schemas/skills, planning & governance artifacts, and the tracker.
**Method**: Four parallel audit passes (runtime, surfaces, governance, rules/schemas) with per-finding code verification (two findings confirmed empirically by executing `IterationAnalytics`), plus independent tracker/CI/test verification.

## Executive summary

Mechanical state is green — CI passes on HEAD, the full unit suite (7,536 tests) and UAT (97 tests) pass locally. But the audit found **1 critical and ~10 high-severity defects**, and a **bypassed governance gate**. The dominant pattern: the LFD refactor adopted LFD's *vocabulary* (budget stop, exploration quota, hypothesis-before-change, mechanical-vs-cooperative layering) without its *black-box discipline* — several controls are decorative, self-report-driven, or dead outside the happy path, and the implementation shipped against a pre-construction gate that was still recorded as `PENDING`.

### The five declared LFD controls — actual state

| Control | Declared | Actual |
|---|---|---|
| 1. Hard budget stop | ✅ shipped | Enforced only on: fresh (non-resumed) runs, Claude provider, non-timed-out sessions, analytics enabled. Dead on resume (critical). |
| 2. Stall rule | claimed in scope | **Not implemented at all** — nothing forbids repeating the same adjustment |
| 3. Exploration quota | ✅ shipped | Trigger driven by keyword-regex over agent stdout (self-report); enforcement is prompt-advisory; racing early-stop kills it under defaults |
| 4. Hypothesis-before-change | ✅ shipped | Records are post-hoc boilerplate — StrategyPlanner never produces the fields; fallbacks always fire |
| 5. Mechanical/cooperative layering | doc'd in rules | The rule-tier "substitutable by self-report" table (planned mitigation R-LFD-005) was never created; controls 3–4 violate the principle |

---

## 1. Governance findings (plans & issues)

**G1 — CRITICAL (process). Construction executed against an explicitly PENDING gate.**
`.aiwg/planning/issue-1585-operator-approval-record.md` is byte-identical to its 2026-06-17 creation: all 8 decisions `TBD | PENDING`, "silence is not approval." No approval exists in the tracker (issue #1585's last comment is 2026-06-17: "Construction remains gated on explicit operator approval"), the activity log, or any artifact. Implementation landed 2026-07-10. If out-of-band operator authorization happened, it was never recorded — the exact failure the record exists to prevent.

**G2 — HIGH. July 10 edits relabeled (not falsified) the gate.**
The plan's "Construction should not start until the operator approves" became "Construction has already been performed… Maintainers should still review." PENDING lines were preserved (no forged approval), but the completion audit retains a **false PASS row**: "Review before construction … PASS" in a document whose own conclusion admits construction preceded review.

**G3 — HIGH. Seven approved-shape child issues never filed; wave sequencing abandoned.**
The construction preview required operator approval → file Wave 1 → review → Wave 2 → Wave 3. Instead all three waves landed in one commit. Verified: no child issues exist in the tracker; the required completion comment on #1585 was never posted (violates `issue_comment_on_cycle: true` in `.aiwg/aiwg.config`).

**G4 — HIGH. Risk R-LFD-010 ("Human Review Gate Skipped") materialized and the register was never updated.**
The register still says "Draft for pre-construction review"; its "review at each implementation wave" cadence was not honored.

**G5 — MEDIUM. Unapproved scope divergence — both directions.**
Delivered but not in the reviewed plan: Mission Control as a first-class surface (packet recommended "MC after the shared language settles"), hard token/spend runtime stops (preview said wall-clock baseline, token/spend report `unknown`), default exploration quota k=3 (packet recommended require-declared-K, no default), lift-over-random metrics.
Planned but not delivered: mechanical/cooperative rule-tier doc (R-LFD-005 table — `grep "substitutable"` → nothing), `unknown` budget semantics (see R-H4), eval-harness runtime helper + adversarial VOID/holdout tests, thought-protocol/progress-file wiring, ADR acceptance (still `Proposed`).

**G6 — MEDIUM. Evidence base swapped without gate review; errata in citations.**
The approved evidence set was REF-1398–1406; the July pass instead cites ~43 new REFs (1500–1542) claimed fully inducted same-day in `section9/research-papers` (unverified — extraordinary throughput claim; spot-check recommended). Issue-number ranges drift between the three documents describing the batch (#180–#223 vs #282 vs #310). One "current 2026-07 sources" citation carries a 2025-11 arXiv ID. Security screening and test strategy retain `Date: 2026-06-17` headers over 2026-07-10 content.

## 2. Runtime findings (`tools/ralph-external/`)

**R-C1 — CRITICAL. The resume path bypasses every LFD control.**
`orchestrator.mjs:459-527` — `resume()` never initializes `IterationAnalytics`; all LFD checks live behind `if (this.iterationAnalytics)` (`:1031`). Budget flags passed on `--resume` are persisted but never enforced. Even if initialized, cumulative counters would reset (nothing calls `IterationAnalytics.load()`), so any crash resets the budget — on a runtime whose selling point is crash-resilience. A `budget_exhausted` loop can be resumed with no re-check. Scenario: `--max-total-cost 20`, crash at $18, resume → no ceiling at all.

**R-H1 — HIGH. Budget stop fires before the completion check** (`orchestrator.mjs:1054` vs `:1137`): an iteration that completes the task while crossing a ceiling is reported `success: false` / `budget_exhausted` / outcome `partial`, exits 1, and poisons cross-task learning. UAT encodes this deliberately, but it contradicts LFD intent and the exit-code contract.

**R-H2 — HIGH. Signature fix activated a verification-free plateau early-stop that mislabels flat loops as success.**
Fixing `recordIterationResult`'s call shape turned on `checkQualityPlateau()` (3 cycles <2% → stop, `success: true`, outcome `success`) with no minimum-quality or verification gate. Under production defaults a fully flat loop "succeeds" at iteration 3 — **before** the exploration quota (k=3) can ever fire (quota directive first appears at iteration 5). The UAT quota test passes only because it disables early stopping, masking the conflict.

**R-H3 — HIGH. Stall rule not implemented** (see table above).

**R-H4 — HIGH. Token/spend ceilings silently inert when usage is unobservable; timeouts record zero usage.**
Missing usage defaults to `0` at record time, so the `unobservable_limits` branch is unreachable for all five documented limits; non-Claude adapters (codex/opencode/factory) emit no usage at all → `--max-total-cost` observes a constant 0 forever, no warning. Timed-out sessions are killed before the `result` event → the most expensive runaway iterations contribute **nothing** to the budget. Note: the plan/risk register (R-LFD-003) explicitly required `unknown` semantics for unobservable values; the implementation shipped zero-defaults instead — a planned requirement dropped, not an oversight (cross-ref G5).

**R-M1..M6 — MEDIUM.** (M1) EarlyStopping fed the *previous* iteration's `quality_delta` (off-by-one, `orchestrator.mjs:1026`). (M2) `quality_score` — sole input to flat-cycle detection/best-output/budget reports — is keyword-regex over agent stdout: the quota trigger is substitutable by self-report, and its enforcement is prompt-only, violating control 5. (M3) Hypothesis records are post-hoc boilerplate (StrategyPlanner never supplies the fields; written after the iteration). (M4) `--resume` resets a persisted exploration quota to k=3 (default object always truthy in the merge). (M5) Wall-clock ceiling has per-iteration granularity — a single session can overshoot by up to `--timeout` (60 min default); session timeout not derived from remaining budget. (M6) 0→90 quality jump counts as a *flat* cycle (empirically confirmed).

**R-L1..L5 — LOW.** `--exploration-quota 0` silently becomes 3 with no disable path; NaN limits accepted and never fire or surface; `--status` LFD panel unreachable in the default multi-loop layout; the new `tools/ralph-external/*.test.mjs` unit tests are excluded from CI (`vitest.config.js` excludes `tools/ralph-external/**`; `test:node` not in the workflow — UAT does run in CI); several UAT assertions test field existence rather than behavior; the buildArgs→parseArgs flag contract is never tested end-to-end.

## 3. Exposure-surface findings (CLI/MCP)

**S-F1 — HIGH. `aiwg ralph` — the primary user entrypoint — silently ignores all six LFD flags.**
`ralph.ts` never parses or forwards them; unknown flags are dropped without error. An operator running `aiwg ralph "task" --max-total-cost 5` gets a detached, permission-skipping daemon with **no ceiling** while believing one applies. Only `aiwg mc dispatch`, MCP, and raw `agent-loop-ext` deliver the controls.

**S-F2 — HIGH. `mc dispatch` silently drops invalid budget values** (`parseNumberFlag`, `mc.ts:137-142`): `5,000`, `0`, negatives → flag vanishes, loop runs unbounded, no error. MCP surfaces hard-reject via zod — the CLI is the weakest of the three validators.

**S-F4/F5 — MEDIUM.** `--no-analytics` silently disables all budget enforcement (nothing documents the coupling). The exploration quota is on-by-default with no off switch on any surface.

**S-F7 — MEDIUM. Zero documentation**: none of the six flags appear in `docs/cli-reference.md` (plus pre-existing drift noted: ralph `--budget`/`--timeout`/`--max-iterations` doc defaults all disagree with the runtime).

**S-F8/F9, T1 — LOW.** `mc run` cost gate ignores `maxTotalCost`; `--flag=value` syntax silently unsupported on all mc flags; membership-only assertions in the buildArgs test.

Verified clean: flag names/units/defaults agree end-to-end across mc → launcher → runtime → MCP (no naming or unit mismatches).

## 4. Rules / schema / docs findings

**D-F1 — HIGH. The schema extension landed in the wrong document.** `iteration-analytics.mjs` declares `@implements addons/agent-loop/schemas/iteration-analytics.yaml`, which received **none** of the LFD fields; the +343-line extension went into `frameworks/sdlc-complete/schemas/flows/iteration-analytics.yaml`, a structurally different doc ($id v1 vs v2).

**D-F2..F4 — HIGH. Schema/code contract broken**: chimera iteration record (new fields use code naming, base fields use schema naming the code never emits — no real record can validate); `BudgetStopReport.budgets` shape differs between schema+rule-doc (per-dimension `{limit, observed}`) and code (parallel maps, pinned by test); schema-required fields (`selected_iteration` etc.) can be `null` in code.

**D-R1 — HIGH. `holdout-isolated` execution mode exists only as a table row** in `reproducibility.md:176` — absent from the execution-mode schema enum, the CLI, and the rule's own mode-selection flow.

**D-F5..F13, R2..R5, C1, I1 — MEDIUM (selection).** `--no-analytics` kills the "mechanical" budget stop (rules never mention the dependency); `stop_reason` enum drift both directions; `rate_caps_are_hard_stops` and `flat_cycle_action` schema fields have no code counterpart; the entire eval-harness surface is schema-only (zero implementation, yet `reproducibility.md` Rule 7 states MUSTs against it); stopping-flow rewrite describes "structural variant instead of stopping" options the code doesn't have (a loosening of prior mechanical-stop text); dead `addons/ralph/` @-mentions in the edited rules (renamed to `agent-loop`) while neither points at the actually-extended schema; REF-1398–1406 Research Basis lines are not corpus-resolvable (citation-policy Rules 3/5); internal-loop SKILL overclaims mechanics for a purely cooperative path; VOID exclusion asserted in checklist/index but defined and implemented nowhere; both new capability YAMLs depend on the addon-only `ralph-loop` agent with the dependency undeclared; `eval-harness-lfd-contract` listed in RULES-INDEX but is not a rule.

Verified clean: plugin/addon `aiwg-mission` SKILL copies byte-identical; three template copies identical; all new YAML parses; new @-mentions to the brief and ADR exist.

## 5. Cross-cutting problems in thinking/design

1. **Vocabulary without discipline.** The refactor's own centerpiece principle (Track 4: mechanical gates must not be substitutable by self-report) is violated by its implementation: the quota trigger, best-output selection, and flat-cycle detection all run on regex-scored agent stdout, and quota/hypothesis enforcement is prompt-advisory.
2. **Happy-path mechanics.** Every "hard" guarantee holds only on: fresh runs (not resume), the Claude provider (not codex/opencode/factory), sessions that terminate normally (not timeouts), analytics enabled. The recovery path — the runtime's core purpose — has zero enforcement.
3. **Zero conflated with unknown.** The plan explicitly demanded `unknown` semantics; shipping 0-defaults converts "can't measure" into "under budget," silently defeating the ceilings. This inverts the safety property.
4. **Untested control interactions under defaults.** Early-stop plateau (2%/3) races the exploration quota (5%/k=3); the UAT sidesteps it by disabling early stopping. The plateau stop also mislabels stagnation as success.
5. **Governance drift normalized.** A gate designed to force explicit decisions was bypassed, and where decisions were pending, the implementation consistently picked the *non-recommended* option (MC-first, k=3 default, hard token stops) — the exact pattern the approval record existed to prevent. The docs are candid about it, but one audit row now falsely certifies the failed control.

## 6. Other last-cycle items (checked clean)

- **Release-plan sidecars (`3810b081a`, #1731)**: `.yml` addition is doc/schema-comment only; no code resolves sidecar paths (skill-driven) — consistent, all three SKILL copies synced.
- **Skill-usage telemetry (`9a9dd62b2`, #1649)**: implementation matches the ADR's privacy contract — off-by-default enforced before any writes, env precedence correct, bounded stores with rotation, args used only for identity classification and never persisted raw.
- **CI/tests**: HEAD CI green; unit suite 7,536 pass / 28 skipped; UAT 97/97.

## 7. Suggested remediation priorities (pending operator authorization — none actioned)

1. **R-C1**: initialize + `load()` analytics on resume; block resume of `budget_exhausted` loops without explicit override. (Also fixes S-F3/R-M4 via correct config merge.)
2. **R-H4 / G5**: implement the planned `unknown` semantics — distinguish unobserved from zero; warn when a declared token/spend limit is unobservable on the provider; extract usage from partial streams on timeout.
3. **S-F1/S-F2**: wire the six flags into `aiwg ralph` (or hard-error on unknown flags); make invalid budget values a usage error on mc dispatch.
4. **R-H2/R-M1**: gate plateau early-stop on verification/minimum quality (or demote to `plateau` status, not `success`); fix the stale-delta off-by-one; reconcile the 2%-vs-5% threshold race.
5. **G1–G4**: record a dated retroactive decision in the approval record enumerating the actual delivered scope; fix the false PASS row; update the risk register (R-LFD-010 occurred); post the #1585 completion comment.
6. **D-F1..F4**: extend the schema the code actually `@implements` (or repoint), align the record/report shapes, fix dead @-mentions.
7. **R-H3 / decorative controls**: implement the stall rule or formally descope it; make StrategyPlanner produce hypothesis fields pre-change or stop labeling the records "hypothesis-before-change."
8. Add `tools/ralph-external` unit tests to CI; add an end-to-end buildArgs→parseArgs contract test; document the six flags in `docs/cli-reference.md`.
