# Test Strategy: LFD Control Patterns for AIWG Agent Loops

**Document Type**: Test Strategy  
**Issue**: `roctinam/aiwg#1585`  
**Status**: Construction-pass verification recorded; ADR governance review pending
**Date**: 2026-06-17 (created) / 2026-07-11 (revised during construction + audit remediation)  
**Related Docs**:

- `.aiwg/research/reports/issue-1585-lfd-control-patterns-research-brief.md`
- `.aiwg/architecture/adr-lfd-control-patterns-for-agent-loops.md`
- `.aiwg/planning/issue-1585-lfd-control-patterns-plan.md`
- `.aiwg/risks/issue-1585-lfd-control-patterns-risks.md`

## Executive Summary

This strategy defines how construction for issue #1585 should be verified once
approved. The expected work is rule/documentation first, then optional runtime
budget/status support, then eval-harness conventions. Tests must prove the new
controls improve loop discipline without leaking holdout data, blocking simple
workflows, or substituting self-report for mechanical evidence.

## Quality Goals

| Goal | Target |
|---|---|
| Rule clarity | Operators can identify when LFD controls are required, optional, or unnecessary |
| Evaluation integrity | Holdout answers and lint details never enter optimizer-readable output |
| Backward compatibility | Existing non-eval workflows continue without mandatory harness setup |
| Budget stop behavior | Budget exhaustion halts loops and emits a best-output report |
| Progress auditability | Each cycle can record hypothesis, expected failure, diagnostic, and result |

## Test Scope by Wave

### Wave 1: Documentation and Rule Changes

**Artifacts under test**:

- rule-tier documentation
- reproducibility / holdout isolation guidance
- progress-file / best-output / thought-protocol guidance
- loop entropy guidance
- Mission Control and `/aiwg-mission` dispatch guidance
- Mission Control CLI/runtime pass-through for Ralph external LFD controls
- MCP `mc-dispatch` pass-through for the same controls
- first-class MCP `mission-dispatch` pass-through for the same controls

**Verification**:

- Static doc tests or unit tests that scan for required concepts:
  - mechanical vs cooperative controls
  - holdout-only acceptance
  - aggregate-only holdout feedback
  - hypothesis-before-change fields
  - stall rule and exploration quota
  - Mission dispatch budget stops, verifier requirements, and best-output
    reports
- Existing routing/docs tests updated where command/skill mirrors include these
  files.
- Manual review confirms construction docs cite REF-1398 through REF-1406 and
  do not depend on pending #72 sources as load-bearing evidence.

### Wave 2: Runtime Budget/Status Support

**Artifacts under test**:

- loop budget schema or runtime helper
- budget-exhausted stop behavior
- best-output stop report
- status/progress output

**Unit tests**:

- Wall-clock budget exceeded -> loop stops.
- Token/spend unavailable -> status reports `unknown`, not a fabricated value.
- Budget remaining -> loop may continue.
- Plateau threshold reached -> loop stops with best-output report.
- Best output is preserved when later cycles regress.

**Integration tests**:

- A simulated loop runs multiple cycles, hits budget exhaustion, and emits a
  stop report.
- Existing loop without budget configuration behaves as before.
- Configured budget is carried through compaction/progress files.
- Declared random/chance baseline is recorded and reported as quality lift,
  token-efficiency lift, tool-call savings, and speed-efficiency lift.
- Mission Control stores configured budget/exploration controls on dispatch
  and forwards them to the Ralph external launcher on run.
- MCP `mc-dispatch` forwards budget/exploration controls to the CLI argv.
- MCP `mission-dispatch` forwards budget/exploration controls to the durable
  Mission Control substrate while preserving the `/aiwg-mission` completion
  contract.

### Wave 3: Eval Harness Conventions

**Artifacts under test**:

- score/lint/probe/status convention docs or helpers
- VOID semantics
- private diagnostics
- holdout scoring limits
- `eval-harness-lfd-contract.yaml` capability flow
- `EvalHarnessContract` / `EvalHarnessResult` schema definitions

**Required adversarial tests**:

- Plant an eval-shaped literal in optimizer-readable files. Scoring returns
  only `VOID: constraint violation` to optimizer output.
- Confirm detailed lint diagnostics are written only to the configured
  human-only location.
- Attempt repeated holdout scoring. Rate limit blocks or records calls
  according to policy.
- Probe gap increases after adding a lookup-shaped artifact; guidance requires
  removing eval-shaped artifacts rather than adding more.
- Scorer/checksum files declared read-only cannot be modified by the optimizer
  in the expected workflow.

## Test Data Requirements

Use synthetic fixtures for construction tests:

- small dev set with visible inputs and hidden answers
- small holdout set with hidden answers
- known-good candidate output
- known-bad candidate output
- eval-shaped literal planted for lint VOID testing
- lookup-shaped artifact that should trigger capacity-cap checks

Do not use real research corpus holdout data for unit tests. The goal is to
test leakage behavior and control flow, not benchmark model quality.

## Acceptance Criteria

Construction for issue #1585 should not be considered ready for maintainer
acceptance until:

- [ ] The ADR is accepted or explicitly superseded.
- [x] The implemented docs/rules cross-link the research brief or core REFs.
- [x] Tests cover every new parser/schema/helper introduced by runtime support.
- [ ] If VOID semantics are implemented, tests prove optimizer output does not
  reveal the matching holdout/lint detail.
- [x] If budget stops are implemented, tests prove stop report generation and
  best-output preservation.
- [x] Existing test suites relevant to touched files pass.

The unchecked ADR item is a governance decision, not an implementation failure
in the current port. The VOID item remains unchecked because this pass defines
VOID behavior in rules, schema, and capability-flow contracts, but does not add
a concrete eval-harness runtime helper.

## Current Runtime Verification

The first runtime pass adds deterministic coverage for the external loop's
observable control points:

- `node tools/ralph-external/iteration-analytics.test.mjs`
  - verifies hard cumulative token budget detection
  - verifies budget stop report generation
  - verifies exploration quota / flat-cycle structural-variant signaling
  - verifies analytics report visibility for quality per 1K tokens and quality
    per minute
  - verifies optional lift over random-walk baseline for quality,
    quality-per-1K-token, quality-per-minute, and tool-call savings
- `node tools/ralph-external/session-launcher-usage.test.mjs`
  - verifies stream-event token and cost extraction
  - verifies explicit total-token accounting takes precedence
  - verifies missing accounting data degrades to zero observable usage
- `node tools/ralph-external/status-output.test.mjs`
  - verifies `ralph-external --status` prints LFD budget utilization
  - verifies status output surfaces best quality per 1K tokens and best quality
    per minute
  - verifies status output surfaces quality, token-efficiency, and
    speed-efficiency lift over random-walk baselines when present
- `node tools/ralph-external/early-stopping.test.mjs`
  - guards existing early-stop behavior after the LFD analytics extension
- `npx vitest run test/unit/cli/handlers/mc.test.ts test/unit/cli/handlers/ralph-launcher-buildargs.test.ts test/unit/mcp/subsystems.test.ts`
  - verifies `aiwg mc dispatch` persists LFD budget controls
  - verifies `aiwg mc run` passes persisted controls to the Ralph external
    launcher
  - verifies launcher argv construction emits every LFD budget flag
  - verifies MCP `mc-dispatch` forwards the same flags to the CLI
- `npx vitest run test/unit/mcp/orchestration.test.ts`
  - verifies first-class MCP `mission-dispatch` forwards the same LFD budget
    flags to `aiwg mc dispatch`
- `npx vitest run --config config/vitest.uat.config.js test/uat/ralph-external.uat.ts`
  - verifies the real external Ralph orchestrator halts on a hard wall-clock
    budget ceiling
  - verifies `budget-stop-report.json`, `completion-report.md`, and
    `iteration-analytics-report.md` are emitted from the UAT run
  - verifies the completion report embeds the `LFD Controls` budget-stop
    evidence instead of relying on self-report
  - verifies flat cycles trigger the configured exploration quota and inject a
    structural-variant directive into the next real prompt

## Coverage Audit: Loop-Control Capability Quantification

| Capability | Quantified Signal | Mechanical Coverage | Residual Gap |
|---|---|---|---|
| Hard cumulative budgets | observed `wall_clock_minutes`, token, output-token, tool-call, and spend counters against declared limits | `iteration-analytics.test.mjs`, `ralph-external.uat.ts`, CLI/MCP pass-through tests | real provider accounting remains adapter-dependent |
| Best-output preservation on stop | selected iteration, final iteration, best score, hypothesis outcomes | `iteration-analytics.test.mjs`, `ralph-external.uat.ts` | artifact restoration is still recorded selection, not automatic rollback |
| Loss-function efficiency | quality per 1K tokens, quality per minute, total tokens/cost/time | `iteration-analytics.test.mjs`, `status-output.test.mjs`, UAT analytics report assertion | quality score remains harness-defined completion percentage for Ralph external |
| Random/chance baseline lift | quality lift, token-efficiency lift, speed-efficiency lift, tool-call savings | `iteration-analytics.test.mjs`, `status-output.test.mjs` | no live benchmark baseline runner is implemented |
| Exploration quota / anti-random-walk control | flat-cycle count, quota `k`, structural-variant-required state, next-prompt directive | `iteration-analytics.test.mjs`, `ralph-external.uat.ts` | UAT proves enforcement of prompt constraint, not agent creativity quality |
| Mission Control dispatch controls | persisted budget/exploration fields and launcher argv forwarding | `mc.test.ts`, `ralph-launcher-buildargs.test.ts` | daemon provider execution is covered by Ralph UAT, not every provider |
| MCP dispatch parity | `mc-dispatch` and `mission-dispatch` argv forwarding | `subsystems.test.ts`, `orchestration.test.ts` | MCP tests stop at tool-command construction, not remote session execution |
| Eval-harness VOID semantics | contract schema and capability-flow presence | schema lint and capability YAML parse | concrete runtime helper and adversarial VOID tests are not yet implemented |

Broader `npm run test:node` currently still fails in pre-existing Ralph
registry concurrency tests unrelated to the LFD runtime changes. The affected
external-loop analytics/early-stopping/parser tests pass inside that run.

Latest validation run, 2026-07-10:

- `git diff --check`: pass
- `npm run lint:schemas`: pass
- YAML parse for `iteration-analytics.yaml`, `agentloop-lfd-controls.yaml`, and
  `eval-harness-lfd-contract.yaml`: pass
- `npm run docs:collect:dry`: pass
- `npm run typecheck`: pass
- focused Ralph external runtime/status checks: pass
- focused Mission Control CLI/MCP pass-through checks: pass
- focused first-class Mission MCP pass-through check: pass
- `npm run test:node`: 158 pass / 12 fail; failures are only in the existing
  `test/unit/ralph/registry*.test.mjs` and
  `test/unit/ralph/state-manager.test.mjs` async/concurrency cases; touched
  external-loop tests, including `status-output.test.mjs`, pass inside the
  suite.

## Residual Test Gaps

Some claims will remain review-only unless a concrete runtime helper is built:

- Whether agents actually choose better structural variants under exploration
  quota.
- Whether real provider token/spend accounting is accurate across all surfaces.
- Whether holdout leakage can occur through side channels outside the harness
  contract, such as timing or filesystem metadata.

These should be called out in construction PR/commit notes if not directly
tested.
