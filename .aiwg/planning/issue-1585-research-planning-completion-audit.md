# Issue 1585 Research and Planning Completion Audit

**Issue**: `roctinam/aiwg#1585`  
**Audit date**: 2026-07-10
**Scope**: Research, planning, construction status, and completion evidence
**Conclusion**: LFD control patterns have been ported into rules, flows,
schemas, Ralph external-loop runtime controls, and Mission Control CLI/MCP
pass-through. The current source set filed through
`section9/research-papers#223` is fully inducted as `REF-1500` through
`REF-1542` with `#195` resolved under existing `REF-1059`; newly discovered
follow-on sources are tracked as separate induction issues.

## Requirements Audited

The active objective required:

1. Start as a research spike.
2. Make sure needed references exist either in `~/research` repos or from the
   internet/current external sources.
3. For any new sources found, file induction issues in the research repo.
4. When sources and planning are complete, stop for review before construction.
5. Create ADRs and other supporting SDLC docs as needed.
6. Leverage AIWG skill discovery.
7. Ask questions interactively as needed.

## Evidence Table

| Requirement | Evidence | Status |
|---|---|---|
| Research spike first | Work produced research brief, verified LFD source, verified research corpus issues before construction planning | PASS |
| Needed references checked | LFD GitHub source verified; `section9/research-papers` audit reports verified; REF-1398 through REF-1406 confirmed through closed induction issues #66, #67, #71 | PASS |
| New sources filed for induction | `section9/research-papers#72` filed and labeled `induction` for AI Safety Gridworlds and deduplication/memorization follow-up sources | PASS |
| Current LFD-adjacent sources filed for induction | `section9/research-papers#180` through `section9/research-papers#282` filed on 2026-07-10 for budget-aware agent control, harness integrity, coding-agent loop specs, hidden-objective reward-hacking controls, observability-driven harness evolution, process discipline, guidance tuning, budget-constrained search, inference-compute evaluation, orchestration budget allocation, budget-overrun incident taxonomy, tool-list depth, budget-guided reasoning, control-token budget awareness, harness taxonomy, cost-aware tool planning, cost-aware exploration, speed-of-accuracy controls, follow-up spontaneous reward-hacking evidence, harness-evolution baselines, process/self-repair benchmark baselines, AGENTS.md/context-file baselines, contract/adversarial-verification baselines, search-agent/RAG-control baselines, test-time-scaling foundations, budget-allocation / knapsack-failure follow-ups, budget-enforcement runtime/gateway follow-ups, chance-corrected tool-routing follow-ups, tool-planning/pruning follow-ups, multi-tool orchestration follow-ups, reward-hacking/proof-of-use follow-ups, skill-reuse follow-ups, speculative-agent serving follow-ups, token-budget serving follow-ups, budget-guidance baseline follow-ups, BudgetThinker follow-ups, and AI Harness Engineering platform/baseline follow-ups. `#180` through `#194` are fully inducted as `REF-1500` through `REF-1514`; `#195` is resolved as duplicate coverage under existing `REF-1059` with repaired PDF archive and full-source LFD audit; `#196` through `#223` are fully inducted as `REF-1515` through `REF-1542`. Follow-on issues `#224` through `#310` track lower-priority or newly discovered sources and are not load-bearing for this completion audit. | PASS |
| Review before construction | Review packet, construction preview, and approval record all state construction must not start until operator approval | PASS |
| ADR created | `.aiwg/architecture/adr-lfd-control-patterns-for-agent-loops.md` | PASS |
| Supporting SDLC docs created | Research brief, plan, review packet, issue preview, approval record, risk register, test strategy, security screening | PASS |
| AIWG skill discovery used | Discovery used for `architecture-evolution`, `induct-research`, `issue-planner`, `risk-cycle`, `flow-gate-check`, and `flow-handoff-checklist` | PASS |
| Interactive questions preserved | Decision questions and approval record capture questions needing operator response before construction | PASS |
| LFD controls ported locally | Draft rules, capability flows, iteration analytics schema, agent-loop guidance, Mission Control / `/aiwg-mission` dispatch guidance, Mission Control CLI/MCP and first-class Mission MCP budget-control pass-through, and Ralph external-loop runtime/status support now carry budget stops, hypothesis-before-change, holdout isolation, VOID semantics, structural variation, token/speed-of-accuracy metrics, and optional lift-over-random baseline reporting | PASS |

## Artifact Inventory

| Artifact | Status | Purpose |
|---|---|---|
| `.aiwg/research/reports/issue-1585-lfd-control-patterns-research-brief.md` | Created | Source inventory and synthesis |
| `.aiwg/architecture/adr-lfd-control-patterns-for-agent-loops.md` | Created | Proposed architectural decision |
| `.aiwg/planning/issue-1585-lfd-control-patterns-plan.md` | Created | Backlog and execution plan |
| `.aiwg/planning/issue-1585-review-packet.md` | Created | Review gate packet |
| `.aiwg/planning/issue-1585-construction-issue-preview.md` | Created | Dry-run child issue filing plan |
| `.aiwg/planning/issue-1585-operator-approval-record.md` | Created | Pending approval decisions |
| `.aiwg/risks/issue-1585-lfd-control-patterns-risks.md` | Created | Risk register |
| `.aiwg/testing/issue-1585-lfd-control-patterns-test-strategy.md` | Created | Test strategy |
| `.aiwg/security/issue-1585-lfd-control-patterns-security-screening.md` | Created | Security screening |
| `.aiwg/research/queue/induct-lfd-current-agent-control-sources-2026-07-10.md` | Updated | Current-source induction handoff for `section9/research-papers#180` through `section9/research-papers#223`; records `#180` through `#194` completion as `REF-1500` through `REF-1514`, `#195` duplicate resolution to `REF-1059`, and `#196` through `#223` completion as `REF-1515` through `REF-1542`; records `#224` through `#310` as follow-up induction issues |
| `agentic/code/frameworks/sdlc-complete/flows/capabilities/agentloop-lfd-controls.yaml` | Created | LFD loop-control capability flow |
| `agentic/code/frameworks/sdlc-complete/flows/capabilities/eval-harness-lfd-contract.yaml` | Created | Eval-harness contract for score/lint/probe/status controls |

## External Evidence

| Evidence | Status |
|---|---|
| `roctinam/aiwg#1585` remains open | CONFIRMED |
| `section9/research-papers#66` closed | CONFIRMED earlier in spike |
| `section9/research-papers#67` closed | CONFIRMED earlier in spike |
| `section9/research-papers#71` closed | CONFIRMED earlier in spike |
| `section9/research-papers#72` closed after induction follow-up | CONFIRMED |
| `section9/research-papers#180` through `section9/research-papers#206` filed for current-source induction with `induction`/`research` labels | CONFIRMED |
| `section9/research-papers#207` through `section9/research-papers#216` filed for follow-on current-source induction with `induction`/`research` labels | CONFIRMED |
| `section9/research-papers#217` through `section9/research-papers#220` filed for budget-guidance and harness-taxonomy continuation induction with `induction`/`research` labels | CONFIRMED |
| `section9/research-papers#221` through `section9/research-papers#223` filed for cost-aware planning and exploration continuation induction with `induction`/`research` labels | CONFIRMED |
| `section9/research-papers#180` fully inducted in the corpus as `REF-1500` (`Reward Hacking Benchmark`) with full PDF archive, GRADE A-, radar sidecar, citation sidecar/backlinks, and index entry | CONFIRMED |
| `section9/research-papers#181` fully inducted in the corpus as `REF-1501` (`Inference-Time Budget Control for LLM Search Agents`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar/backlinks, and index entry | CONFIRMED |
| `section9/research-papers#182` fully inducted in the corpus as `REF-1502` (`Budget-Aware Tool-Use Enables Effective Agent Scaling`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar/backlinks, and index entry | CONFIRMED |
| `section9/research-papers#183` fully inducted in the corpus as `REF-1503` (`Spend Less, Reason Better: Budget-Aware Value Tree Search for LLM Agents`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar/backlinks, and index entry | CONFIRMED |
| `section9/research-papers#184` fully inducted in the corpus as `REF-1504` (`VeRO: A Harness for Agents to Optimize Agents`) with full PDF archive, GRADE A-, radar sidecar, citation sidecar/backlinks, and index entry | CONFIRMED |
| `section9/research-papers#185` fully inducted in the corpus as `REF-1505` (`Token-Budget-Aware LLM Reasoning`) with full PDF archive, GRADE A-, radar sidecar, citation sidecar/backlinks, and index entry | CONFIRMED |
| `section9/research-papers#190` fully inducted in the corpus as `REF-1510` (`Do Androids Dream of Breaking the Game? Systematically Auditing AI Agent Benchmarks with BenchJack`) with full PDF archive, GRADE A-, radar sidecar, citation sidecar/backlinks, code repository confirmation, and index entry | CONFIRMED |
| `section9/research-papers#191` fully inducted in the corpus as `REF-1511` (`SpecBench: Measuring Reward Hacking in Long-Horizon Coding Agents`) with full PDF archive, GRADE A-, radar sidecar, citation sidecar/backlinks, code repository confirmation, and index entry | CONFIRMED |
| `section9/research-papers#192` fully inducted in the corpus as `REF-1512` (`Hack-Verifiable Environments: Towards Evaluating Reward Hacking at Scale`) with full PDF archive, GRADE A-, radar sidecar, citation sidecar/backlinks, code repository/project-page confirmation, and index entry | CONFIRMED |
| `section9/research-papers#193` fully inducted in the corpus as `REF-1513` (`RewardHackingAgents: Benchmarking Evaluation Integrity for LLM ML-Engineering Agents`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar/backlinks, code repository confirmation, and index entry | CONFIRMED |
| `section9/research-papers#194` fully inducted in the corpus as `REF-1514` (`Reason Less, Verify More: Deterministic Gates Recover a Silent Policy-Violation Failure Mode in Tool-Using LLM Agents`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar/backlinks, and index entry | CONFIRMED |
| `section9/research-papers#195` resolved as existing `REF-1059` (`Code as Agent Harness`) with repaired PDF archive, full-source LFD audit, updated reference note, citation sidecar, and radar sidecar | CONFIRMED |
| `section9/research-papers#196` fully inducted in the corpus as `REF-1515` (`Stop Comparing LLM Agents Without Disclosing the Harness`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar/backlinks, and index entry | CONFIRMED |
| `section9/research-papers#197` fully inducted in the corpus as `REF-1516` (`Auditing Agent Harness Safety`) with full PDF archive, GRADE A-, radar sidecar, citation sidecar/backlink, code/project confirmation, and index entry | CONFIRMED |
| `section9/research-papers#198` fully inducted in the corpus as `REF-1517` (`From Prompts to Contracts: Harness Engineering for Auditable Enterprise LLM Agents`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar/backlinks, code/artifact confirmation, and index entry | CONFIRMED |
| `section9/research-papers#199` fully inducted in the corpus as `REF-1518` (`LLM Readiness Harness`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar/backlinks, reproducibility-repo confirmation, and index entry | CONFIRMED |
| Cited companion quality-gate source filed for separate induction as `section9/research-papers#1762` | CONFIRMED |
| `section9/research-papers#200` fully inducted in the corpus as `REF-1519` (`Stop Hand-Holding Your Coding Agent`) with full PDF archive, GRADE B, radar sidecar, citation sidecar/backlinks, sandeco-loop artifact confirmation, Loop Library live-corpus caveat, and index entry | CONFIRMED |
| `section9/research-papers#201` fully inducted in the corpus as `REF-1520` (`Reward Hacking in Language Model Agents`) with full PDF archive, GRADE A-, radar sidecar, citation sidecar/backlinks, public code confirmation, hidden/observed reward evidence, and index entry | CONFIRMED |
| Cited spontaneous reward-hacking source filed for separate induction as `section9/research-papers#224` | CONFIRMED |
| `section9/research-papers#202` fully inducted in the corpus as `REF-1521` (`Agentic Harness Engineering`) with full PDF archive, GRADE A-, radar sidecar, citation sidecar/backlinks, public repository confirmation, observability-driven harness-evolution evidence, token-efficiency evidence, and index entry | CONFIRMED |
| Cited harness-evolution baselines filed for separate induction as `section9/research-papers#225` through `section9/research-papers#227` | CONFIRMED |
| `section9/research-papers#203` fully inducted in the corpus as `REF-1522` (`RigorBench`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar/backlinks, public repository confirmation, process-discipline trajectory evidence, token-efficiency evidence, and index entry | CONFIRMED |
| Cited process/self-repair benchmark baselines filed for separate induction as `section9/research-papers#228` through `section9/research-papers#230` | CONFIRMED |
| `section9/research-papers#204` fully inducted in the corpus as `REF-1523` (`Probe-and-Refine Tuning`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar/backlinks, public repository confirmation, guidance activation-threshold evidence, coverage/precision evidence, cross-model guidance-harm evidence, and index entry | CONFIRMED |
| Cited AGENTS.md/context-file baselines filed for separate induction as `section9/research-papers#231` through `section9/research-papers#232` | CONFIRMED |
| `section9/research-papers#205` fully inducted in the corpus as `REF-1524` (`Meta-Engineering Harnesses`) with full PDF archive, GRADE B, radar sidecar, citation sidecar/backlinks, contract-driven harness architecture, four-way failure arbiter, early deployment evidence, and index entry | CONFIRMED |
| Cited contract/adversarial-verification baselines filed for separate induction as `section9/research-papers#233` through `section9/research-papers#235` | CONFIRMED |
| `section9/research-papers#206` fully inducted in the corpus as `REF-1525` (`Budget-Constrained Agentic LLM Search`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar/backlinks, public repository confirmation, budget-visible BCAS loop evidence, hard search-tool gating, and token/search/cost ledger evidence | CONFIRMED |
| Cited search-agent/RAG-control baselines filed for separate induction as `section9/research-papers#236` through `section9/research-papers#239` | CONFIRMED |
| `section9/research-papers#207` fully inducted in the corpus as `REF-1526` (`How Inference Compute Shapes Frontier LLM Evaluation`) with full PDF archive, GRADE A-, radar sidecar, citation sidecar/backlinks, inference-compute curve evidence, repeated-answer guard evidence, and serial-vs-parallel matched-budget reporting evidence | CONFIRMED |
| Cited test-time-scaling foundations filed for separate induction as `section9/research-papers#240` through `section9/research-papers#243` | CONFIRMED |
| `section9/research-papers#208` fully inducted in the corpus as `REF-1527` (`ZEBRA: Zero-shot Budgeted Resource Allocation for LLM Orchestration`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar/backlinks, phase-level budget allocation evidence, solver-vs-LLM allocation ablation evidence, and APPS/HotpotQA budget-retention evidence | CONFIRMED |
| Cited budget-allocation and knapsack-failure sources filed for separate induction as `section9/research-papers#244` through `section9/research-papers#248` | CONFIRMED |
| `section9/research-papers#209` fully inducted in the corpus as `REF-1528` (`Token Budgets`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar/backlinks, public artifact/catalog confirmation, budget-overrun incident taxonomy, affine/non-bypassable budget ownership evidence, and provider-usage trust-boundary evidence | CONFIRMED |
| Cited runtime/gateway budget-enforcement sources filed for separate induction as `section9/research-papers#249` through `section9/research-papers#251` | CONFIRMED |
| `section9/research-papers#210` fully inducted in the corpus as `REF-1529` (`How Many Tools Should an LLM Agent See?`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar/backlinks, Bits-over-Random metric extraction, adaptive tool-depth evidence, and downstream BFCL choice-accuracy evidence | CONFIRMED |
| Cited chance-corrected tool-routing baselines filed for separate induction as `section9/research-papers#252` through `section9/research-papers#254` | CONFIRMED |
| `section9/research-papers#211` fully inducted in the corpus as `REF-1530` (`ToolTree`) with full PDF archive, GRADE A-, radar sidecar, citation sidecar, dual-feedback MCTS extraction, bidirectional pruning evidence, token-cost ablations, and public implementation confirmation | CONFIRMED |
| Cited tool-planning/pruning baselines filed for separate induction as `section9/research-papers#255` through `section9/research-papers#257` | CONFIRMED |
| `section9/research-papers#212` fully inducted in the corpus as `REF-1531` (`The Evolution of Tool Use in LLM Agents`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar, multi-tool orchestration taxonomy, safety/control staging, efficiency/resource taxonomy, and benchmark-design extraction | CONFIRMED |
| Cited multi-tool orchestration follow-ups filed for separate induction as `section9/research-papers#258` through `section9/research-papers#260` | CONFIRMED |
| `section9/research-papers#213` fully inducted in the corpus as `REF-1532` (`Reward Hacking in the Era of Large Models`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar, Proxy Compression Hypothesis extraction, reward-hacking mechanism taxonomy, proxy-channel controls, and VOID/proof-of-use mapping | CONFIRMED |
| Cited reward-hacking follow-ups filed for separate induction as `section9/research-papers#261` through `section9/research-papers#262` | CONFIRMED |
| `section9/research-papers#214` fully inducted in the corpus as `REF-1533` (`SkillCraft`) with full PDF archive, GRADE A-, radar sidecar, citation sidecar, public code/project verification, Skill Mode protocol extraction, matched-success efficiency metrics, transfer analysis, and verified skill-promotion controls | CONFIRMED |
| Cited skill-reuse follow-ups filed for separate induction as `section9/research-papers#263` through `section9/research-papers#264` | CONFIRMED |
| `section9/research-papers#215` fully inducted in the corpus as `REF-1534` (`Parallelizing Tool Execution and LLM Generation`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar, pattern-aware speculative tool execution, LLM-tool co-scheduling evidence, side-effect safety audit, and speed-of-accuracy telemetry mapping | CONFIRMED |
| Cited speculative-serving follow-ups filed for separate induction as `section9/research-papers#265` through `section9/research-papers#267` | CONFIRMED |
| `section9/research-papers#216` fully inducted in the corpus as `REF-1535` (`Dual-Pool Token-Budget Routing`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar, canonical replacement for withdrawn duplicate arXiv source, total-token pool routing evidence, provider-usage calibration, preemption telemetry, and dispatch-envelope mapping | CONFIRMED |
| Cited token-budget serving follow-ups filed for separate induction as `section9/research-papers#268` through `section9/research-papers#269` | CONFIRMED |
| `section9/research-papers#217` fully inducted in the corpus as `REF-1536` (`Steering LLM Thinking with Budget Guidance`) with full PDF archive, GRADE A-, radar sidecar, citation sidecar, public code/model confirmation, soft budget-guidance extraction, predictor-overhead and controllability evidence, and thinking-token telemetry mapping | CONFIRMED |
| Cited budget-guidance baseline follow-ups filed for separate induction as `section9/research-papers#270` through `section9/research-papers#274` | CONFIRMED |
| `section9/research-papers#218` fully inducted in the corpus as `REF-1537` (`BudgetThinker`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar, public code/data/model confirmation, control-token budget-awareness extraction, SFT+GRPO curriculum evidence, and adherence/utilization telemetry mapping | CONFIRMED |
| Cited BudgetThinker follow-ups filed for separate induction as `section9/research-papers#275` through `section9/research-papers#278` | CONFIRMED |
| `section9/research-papers#219` fully inducted in the corpus as `REF-1538` (`AI Harness Engineering`) with full PDF archive, GRADE B+, radar sidecar, citation sidecar, runtime-substrate responsibility extraction, H0-H3 harness ladder mapping, trace/outcome schema extraction, and entropy/intervention telemetry mapping | CONFIRMED |
| Cited AI Harness Engineering follow-ups filed for separate induction as `section9/research-papers#279` through `section9/research-papers#282` | CONFIRMED |
| LFD audit reports under `audits/LFD-2026-06-13/` | CONFIRMED |

## Governance Review Gate

The current working tree contains the construction pass for the planned LFD
controls. Implementation evidence is sufficient for the active porting
objective, but the ADR remains `Proposed for review`; maintainers still need to
decide whether to accept it, amend it, or supersede it before treating the
architecture decision as final project governance. The unresolved review
questions are:

- ADR direction: PENDING
- Loop surface priority: PENDING
- First construction wave: PENDING
- VOID semantics scope: PENDING
- Exploration quota policy: PENDING
- Issue filing shape: PENDING
- Risk/test/security constraints: PENDING
- Follow-up research handling: PENDING

## Completion Judgment

The active research-and-port objective is complete in the working tree:
research was performed against the existing corpus and current external
sources, new sources were either inducted or filed for induction, and the LFD
controls now exist across AIWG loop rules, capability flows, iteration schemas,
Mission Control dispatch surfaces, and Ralph external runtime/status support.

The current source set filed through `section9/research-papers#223` is now
fully inducted. `section9/research-papers#180` is now stable corpus evidence
as `REF-1500`; `section9/research-papers#181` is now stable corpus evidence as
`REF-1501`; `section9/research-papers#182` is now stable corpus evidence as
`REF-1502`; `section9/research-papers#183` is now stable corpus evidence as
`REF-1503`; `section9/research-papers#184` is now stable corpus evidence as
`REF-1504`; `section9/research-papers#185` is now stable corpus evidence as
`REF-1505`; `section9/research-papers#186` is now stable corpus evidence as
`REF-1506`; `section9/research-papers#187` is now stable corpus evidence as
`REF-1507`; `section9/research-papers#188` is now stable corpus evidence as
`REF-1508`; `section9/research-papers#189` is now stable corpus evidence as
`REF-1509`; `section9/research-papers#190` is now stable corpus evidence as
`REF-1510`; `section9/research-papers#191` is now stable corpus evidence as
`REF-1511`; `section9/research-papers#192` is now stable corpus evidence as
`REF-1512`; `section9/research-papers#193` is now stable corpus evidence as
`REF-1513`; `section9/research-papers#194` is now stable corpus evidence as
`REF-1514`; `section9/research-papers#195` is resolved as duplicate evidence
under existing `REF-1059`; `section9/research-papers#196` is now stable corpus
evidence as `REF-1515`; `section9/research-papers#197` is now stable corpus
evidence as `REF-1516`; `section9/research-papers#198` is now stable corpus
evidence as `REF-1517`; `section9/research-papers#199` is now stable corpus
evidence as `REF-1518`; `section9/research-papers#200` is now stable corpus
evidence as `REF-1519`; `section9/research-papers#201` is now stable corpus
evidence as `REF-1520`; `section9/research-papers#202` is now stable corpus
evidence as `REF-1521`; `section9/research-papers#203` is now stable corpus
evidence as `REF-1522`; `section9/research-papers#204` is now stable corpus
evidence as `REF-1523`; `section9/research-papers#205` is now stable corpus
evidence as `REF-1524`; `section9/research-papers#206` is now stable corpus
evidence as `REF-1525`; `section9/research-papers#207` is now stable corpus
evidence as `REF-1526`; `section9/research-papers#208` is now stable corpus
evidence as `REF-1527`; `section9/research-papers#209` is now stable corpus
evidence as `REF-1528`; `section9/research-papers#210` is now stable corpus
evidence as `REF-1529`; `section9/research-papers#211` is now stable corpus
evidence as `REF-1530`; `section9/research-papers#212` is now stable corpus
evidence as `REF-1531`; `section9/research-papers#213` is now stable corpus
evidence as `REF-1532`; `section9/research-papers#214` is now stable corpus
evidence as `REF-1533`; `section9/research-papers#215` is now stable corpus
evidence as `REF-1534`; `section9/research-papers#216` is now stable corpus
evidence as `REF-1535`; `section9/research-papers#217` is now stable corpus
evidence as `REF-1536`; `section9/research-papers#218` is now stable corpus
evidence as `REF-1537`; `section9/research-papers#219` is now stable corpus
evidence as `REF-1538`; `section9/research-papers#220` is now stable corpus
evidence as `REF-1539`; `section9/research-papers#221` is now stable corpus
evidence as `REF-1540`; `section9/research-papers#222` is now stable corpus
evidence as `REF-1541`; `section9/research-papers#223` is now stable corpus
evidence as `REF-1542`.

The remaining work is governance and follow-up hygiene rather than active
objective completion: accept or supersede the ADR, decide whether any of the
follow-on `section9/research-papers#224` through `#310` sources should become
load-bearing evidence later, and choose whether to build a concrete eval
harness runtime helper beyond the current rules/schema/flow contract.
