# Issue 1585 Plan: Port LFD Control Patterns into AIWG

**Status**: Construction pass complete for the active porting objective; ADR
governance review remains pending
**Issue**: `roctinam/aiwg#1585`  
**Related ADR**: `.aiwg/architecture/adr-lfd-control-patterns-for-agent-loops.md`  
**Research brief**: `.aiwg/research/reports/issue-1585-lfd-control-patterns-research-brief.md`
**Review packet**: `.aiwg/planning/issue-1585-review-packet.md`
**Issue preview**: `.aiwg/planning/issue-1585-construction-issue-preview.md`
**Approval record**: `.aiwg/planning/issue-1585-operator-approval-record.md`
**Completion audit**: `.aiwg/planning/issue-1585-research-planning-completion-audit.md`
**Supporting docs**:

- `.aiwg/risks/issue-1585-lfd-control-patterns-risks.md`
- `.aiwg/testing/issue-1585-lfd-control-patterns-test-strategy.md`
- `.aiwg/security/issue-1585-lfd-control-patterns-security-screening.md`

## Scope

This plan covers research-backed design, backlog decomposition, and the
completed construction pass for the five tracks in issue #1585. The original
review gate is preserved as governance evidence; the implemented work now
extends through runtime controls and flow/schema contracts.

In scope:

- rules and skills that govern Ralph / agent-loop / Mission-style loops
- progress-file and iteration-record schema guidance
- reproducibility and eval-fixture guidance
- mechanical-vs-cooperative control tiering
- budget stop-condition design

Out of scope for this construction pass:

- building a full LFD-compatible harness generator
- importing LFD as an AIWG skill verbatim
- changing every AIWG workflow to require eval/holdout setup
- scoring or optimizing current issue-resolution loops against a new metric

## Proposed Backlog

### Wave 1: Documentation and Control Model

1. **ADR and rule-tier doc**
   - Deliverable: accepted ADR plus a mechanical/cooperative rule-tier doc.
   - Current implementation pass:
     - `agentic/code/addons/agent-loop/skills/agent-loop/SKILL.md`
     - `agentic/code/frameworks/sdlc-complete/flows/capabilities/agentloop-lfd-controls.yaml`
   - Acceptance:
     - Defines black-box/mechanical vs white-box/cooperative controls.
     - Names which controls are load-bearing under high criticality.
     - Cross-links REF-1398 through REF-1406 and issue #1585.

2. **Reproducibility holdout extension**
   - Deliverable: update reproducibility/reproducibility-validation guidance.
   - Current implementation pass:
     - `agentic/code/frameworks/sdlc-complete/rules/reproducibility.md`
   - Acceptance:
     - Adds dev/holdout split language.
     - Requires holdout answers to be hidden from optimizer-readable surfaces.
     - Defines aggregate-only holdout feedback and leakage audit.
     - Covers canaries/capacity caps for benchmark fixtures.

3. **Hypothesis-before-change progress schema**
   - Deliverable: update progress-file / best-output / thought-protocol docs.
   - Current implementation pass:
     - `agentic/code/frameworks/sdlc-complete/rules/best-output-selection.md`
     - `agentic/code/frameworks/sdlc-complete/rules/tao-loop.md`
     - `agentic/code/frameworks/sdlc-complete/schemas/flows/iteration-analytics.yaml`
   - Acceptance:
     - Adds `hypothesis`, `expected_failure_mode`, and
       `distinguishing_diagnostic` before-change fields.
     - Explains how fields survive compaction.
     - Includes at least one example iteration record.

### Wave 2: Loop Runtime Policy

4. **Dosed entropy directive**
   - Deliverable: Ralph/agent-loop loop directive for stall rule and
     exploration quota.
   - Current implementation pass:
     - `agentic/code/frameworks/sdlc-complete/rules/tao-loop.md`
     - `agentic/code/addons/agent-loop/skills/agent-loop/SKILL.md`
     - `agentic/code/addons/agent-loop/skills/mission-control/SKILL.md`
     - `agentic/code/addons/agent-loop/agents/mc-conductor.md`
     - `agentic/code/addons/aiwg-utils/skills/aiwg-mission/SKILL.md`
     - `agentic/code/plugins/utils/skills/aiwg-mission/SKILL.md`
     - `src/cli/handlers/mc.ts`
     - `src/cli/handlers/ralph-launcher.ts`
     - `src/mcp/tools/orchestration.mjs`
     - `src/mcp/tools/subsystems.mjs`
     - `tools/ralph-external/iteration-analytics.mjs`
     - `tools/ralph-external/orchestrator.mjs`
   - Acceptance:
     - Non-improving cycle forbids repeating the same adjustment.
     - Every K cycles requires a structurally different approach.
     - K is configurable or locally declared.
     - Directive remains bounded by stop conditions.
     - Mission Control and `/aiwg-mission` dispatch guidance carry the same
       LFD controls for long-running, budgeted, or eval-driven missions.
     - `aiwg mc dispatch`, `aiwg mc run`, MCP `mc-dispatch`, and first-class
       MCP `mission-dispatch` preserve and forward the same budget and
       exploration-quota controls to Ralph external.

5. **Budget stop-condition design**
   - Deliverable: loop budget spec and stop report schema.
   - Current implementation pass:
     - `agentic/code/frameworks/sdlc-complete/rules/best-output-selection.md`
     - `agentic/code/frameworks/sdlc-complete/schemas/flows/iteration-analytics.yaml`
     - `agentic/code/frameworks/sdlc-complete/flows/capabilities/agentloop-lfd-controls.yaml`
     - `agentic/code/frameworks/sdlc-complete/templates/aiwg-sections/05-self-maintenance.md`
     - `agentic/code/frameworks/sdlc-complete/templates/project/AIWG.md`
     - `agentic/code/frameworks/sdlc-complete/templates/project/AIWG-sdlc-fragment.md`
     - `tools/ralph-external/index.mjs`
     - `tools/ralph-external/orchestrator.mjs`
     - `tools/ralph-external/session-launcher.mjs`
     - `tools/ralph-external/iteration-analytics.mjs`
     - `src/cli/handlers/mc.ts`
     - `src/cli/handlers/ralph-launcher.ts`
     - `src/mcp/tools/orchestration.mjs`
     - `src/mcp/tools/subsystems.mjs`
   - Runtime visibility added:
     - hard budgets for total/output tokens, tool calls, spend, and wall-clock
     - best-output budget stop reports
     - quality-per-1K-token and quality-per-minute analytics report columns
     - optional lift-over-random/chance baseline reporting for quality, token
       efficiency, tool-call count, and speed-of-accuracy comparisons
     - `ralph-external --status` budget utilization and speed-of-accuracy
       visibility when iteration analytics are present
   - Acceptance:
     - Covers wall-clock, token, and spend ceilings where observable.
     - Defines budget-exhausted stop behavior.
     - Requires best-output report on stop.
     - Separates rate caps from hard stops.
   - Current verification:
     - `node tools/ralph-external/iteration-analytics.test.mjs`
     - `node tools/ralph-external/session-launcher-usage.test.mjs`
     - `node tools/ralph-external/status-output.test.mjs`
     - `node tools/ralph-external/early-stopping.test.mjs`
     - `npx vitest run test/unit/cli/handlers/mc.test.ts test/unit/cli/handlers/ralph-launcher-buildargs.test.ts test/unit/mcp/subsystems.test.ts`
     - `npx vitest run test/unit/mcp/orchestration.test.ts`
     - `node --check` on touched external-loop runtime modules

### Wave 3: Harness and Verification Conventions

6. **Eval harness convention**
   - Deliverable: optional convention for `score`, `lint`, `probe`, and
     `status` instruments in eval-driven AIWG loops.
   - Current implementation pass:
     - `agentic/code/frameworks/sdlc-complete/flows/capabilities/eval-harness-lfd-contract.yaml`
     - `agentic/code/frameworks/sdlc-complete/flows/capabilities/agentloop-lfd-controls.yaml`
     - `agentic/code/frameworks/sdlc-complete/schemas/flows/iteration-analytics.yaml`
     - `agentic/code/frameworks/sdlc-complete/rules/reproducibility.md`
     - `agentic/code/frameworks/sdlc-complete/rules/best-output-selection.md`
   - Acceptance:
     - Defines VOID semantics.
     - Requires detailed lint findings to stay outside optimizer-readable
       surfaces.
     - Defines probe gap as memorization/generalization signal.
     - Includes test expectations for no holdout answer leakage.

7. **Traceability and corpus cross-links**
   - Deliverable: issue #1585 docs/rules cross-link to REF-1398 through
     REF-1406 and any new induction tasks.
   - Current induction issues:
     - `section9/research-papers#180` through
      `section9/research-papers#193` cover the 2026-07-10 budget-aware and
       harness-control source batch; `#180` is now inducted as `REF-1500` and
       `#181` is now inducted as `REF-1501`; `#182` is now inducted as
       `REF-1502`; `#183` is now inducted as `REF-1503`; `#184` is now
       inducted as `REF-1504`; `#185` is now inducted as `REF-1505`; and
       `#186` is now inducted as `REF-1506`; `#187` is now inducted as
       `REF-1507`; `#188` is now inducted as `REF-1508`; `#189` is now
       inducted as `REF-1509`; `#190` is now inducted as `REF-1510`; `#191`
       is now inducted as `REF-1511`; `#192` is now inducted as `REF-1512`;
       `#193` is now inducted as `REF-1513`; `#194` is now inducted as
       `REF-1514`.
     - `section9/research-papers#194` covers the remaining follow-on
       current-source sweep for deterministic gates and is now complete as
       `REF-1514`.
     - `section9/research-papers#195` was a duplicate of existing
       `REF-1059` and is now resolved with full-source LFD audit; `#196` is
       now inducted as `REF-1515`; `#197` is now inducted as `REF-1516`;
       `#198` is now inducted as `REF-1517`; `#199` is now inducted as
       `REF-1518`.
     - `section9/research-papers#200` covers explicit loop-spec replacement
       for step-by-step prompting and is now inducted as `REF-1519`;
       `section9/research-papers#201` covers hidden-objective/proxy-reward gap
       controls and is now inducted as `REF-1520`.
     - `section9/research-papers#202` covers observability-driven harness
       evolution and is now inducted as `REF-1521`; `section9/research-papers#203`
       covers coding-agent process-discipline scoring and is now inducted as
       `REF-1522`; `section9/research-papers#204` covers probe/refine
       repository guidance and is now inducted as `REF-1523`;
       `section9/research-papers#205` covers meta-engineering contracts and is
       now inducted as `REF-1524`; `section9/research-papers#206` covers
       budget-constrained agentic search cost/accuracy tradeoffs and is now
       inducted as `REF-1525`; `section9/research-papers#207` covers
       inference-compute evaluation curves and is now inducted as `REF-1526`;
       `section9/research-papers#208` covers phase-level multi-agent budget
       allocation and is now inducted as `REF-1527`;
       `section9/research-papers#209` covers budget-overrun incidents and
       non-bypassable budget ownership and is now inducted as `REF-1528`;
       `section9/research-papers#210` covers chance-corrected tool shortlist
       depth and is now inducted as `REF-1529`;
       `section9/research-papers#211` covers dual-feedback MCTS
       tool-trajectory pruning and is now inducted as `REF-1530`;
       `section9/research-papers#212` covers multi-tool orchestration taxonomy
       and is now inducted as `REF-1531`;
       `section9/research-papers#213` covers reward-hacking survey evidence
       and is now inducted as `REF-1532`;
       `section9/research-papers#214` covers tool-skill reuse and is now
       inducted as `REF-1533`;
       `section9/research-papers#215` covers speculative tool execution and
       LLM-tool co-scheduling and is now inducted as `REF-1534`;
       `section9/research-papers#216` covers token-budget-aware inference
       routing and is now inducted as `REF-1535`.
     - `section9/research-papers#217` through
       `section9/research-papers#220` cover budget-guided thinking-token
       control, control-token budget awareness, AI harness runtime-substrate
       responsibilities, and agent-harness survey taxonomy; `#217` is now
       inducted as `REF-1536`; `#218` is now inducted as `REF-1537`; `#219`
       is now inducted as `REF-1538`; `#220` is now inducted as `REF-1539`.
     - `section9/research-papers#221` through
       `section9/research-papers#223` cover cost-optimal multi-turn tool
       planning benchmarks, cost-aware tool planning methods, and
       cost-aware exploration policies; `#221` is now inducted as `REF-1540`
       and `#222` is now inducted as `REF-1541`; `#223` is now inducted as
       `REF-1542`.
   - Acceptance:
     - Cites the corrected REF cluster including REF-1404 through REF-1406.
     - Notes any lower-priority sources left as future work.
     - Updates relevant docs indexes if the touched docs have indexes.

## Suggested Execution Order

1. Review this plan and ADR.
2. Track induction issue `section9/research-papers#72` for the lower-priority
   candidates from `section9/research-papers#71` (now closed). The current
   LFD-adjacent source set through `section9/research-papers#223` is complete:
   `#180` through `#194` are `REF-1500` through `REF-1514`, `#195` is resolved
   under existing `REF-1059`, and `#196` through `#223` are `REF-1515` through
   `REF-1542`. Follow-on issues `#224` through `#310` remain lower-priority or
   newly discovered induction work.
3. Review the implemented Wave 1/2/3 artifacts and decide whether the ADR should
   be accepted, amended, or superseded.
4. Decide whether optional eval-harness runtime helpers should be built beyond
   the current rules/schema/flow contract.

## Open Questions for Review

1. Should the first implementation target Ralph, generic `agent-loop`, Mission
   Control, or all loop surfaces at once?
2. Should VOID semantics be reserved for eval/holdout harnesses, or become a
   broader high-criticality rule pattern?
3. Do we want an explicit numeric default for exploration quota K, or require
   each loop to declare it?
4. Where should budget observation live first: docs-only, progress files, or a
   concrete `status` command/runtime helper?
5. Should construction produce one combined issue or split the seven backlog
   items above into separate tracker issues?

## Governance Review Gate

Construction has already been performed for the active objective. Maintainers
should still review and record decisions for:

- the ADR direction,
- the track/backlog split,
- the loop surface priority,
- the risk/test/security constraints,
- and the induction handling for lower-priority sources.
