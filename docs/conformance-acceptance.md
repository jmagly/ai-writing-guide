# Testing-quality conformance acceptance and capability boundaries

Review date: 2026-09-08. This document maps the 18 requirements in the SDLC test-conformance design baseline to
implementation and inspected tests. It distinguishes executable tooling, qualified platform behavior, agent
responsibilities, and remaining delivery evidence. It does not certify the target AIWG repository's entire testing
regime as conformant.

The implementation enhances the existing [testing-quality addon](../agentic/code/addons/testing-quality/README.md). Its
public command is `aiwg test-conformance`; the distributed standalone entrypoint is
`agentic/code/addons/testing-quality/commands/test-conformance.mjs`. Target-specific protocols determine required scope
and policies. Missing required evidence produces `unknown`, and any required failure prevents conformance.

## Requirement traceability

“Verified” below means the cited behavior has executable test evidence within its stated scope. It does not imply every
language, runner version, target repository, or semantic oracle is qualified.

| Requirement | Implemented behavior and evidence | Acceptance boundary |
| --- | --- | --- |
| **TC-01 Public target-root CLI** | [Command](../agentic/code/addons/testing-quality/commands/test-conformance.mjs), [two-platform external-cwd CLI tests](../test/unit/addons/test-conformance-cli-platforms.test.ts): initialize, inventory, actual collection, sampling, plan/apply/rollback against independent temporary roots. | Standalone subprocess behavior, extracted-package entrypoint and deployed public namespace verified; see delivery ledger below. |
| **TC-02 Inventory and platform discovery** | [Profiles](../agentic/code/addons/testing-quality/lib/profiles.mjs), [inventory](../agentic/code/addons/testing-quality/lib/inventory.mjs), [profile tests](../test/unit/addons/test-conformance-profiles.test.ts), [inventory tests](../test/unit/addons/test-conformance-inventory.test.ts): nine profiles, mixed-manifest ambiguity, real source/configuration hashes, lane/area assignment, omitted and unreadable scopes. | Inventory counts files, not lexical declarations or presumed cases. Supplemental harnesses must be included in the target protocol. A generic scaffold is not universal runner qualification. |
| **TC-03 File/case/runner reconciliation** | [Result adapters](../agentic/code/addons/testing-quality/lib/results.mjs), [assessment](../agentic/code/addons/testing-quality/lib/assessment.mjs), [result tests](../test/unit/addons/test-conformance-results.test.ts), [assessment tests](../test/unit/addons/test-conformance-assessment.test.ts): expanded identities, duplicate rejection, zero-case failed suites, omitted files, mismatched registered/executed cases and ambiguous selected runs. | Declared files, registered cases and runtime units remain separate. Missing source locations or discovery support prevents the default discovery gate from passing. Overlapping lane totals are not unique repository totals. |
| **TC-04 Actual SUT and boundary** | [Protocol schema](../agentic/code/addons/testing-quality/schemas/conformance-protocol.v1.schema.json), [review schema](../agentic/code/addons/testing-quality/schemas/test-review.v1.schema.json), [oracle-reviewer agent](../agentic/code/addons/testing-quality/agents/test-oracle-reviewer.md). Behavioral obligations trace explicit case IDs, assertions, SUT and boundary to current source review. | SUT/boundary descriptions and source-review judgments are supplied by the reviewer. The CLI checks traceability and evidence bindings; it cannot independently prove the semantics of natural-language claims. |
| **TC-05 Reproducible area sampling** | `sampleFrame` and [sampling tests](../test/unit/addons/test-conformance-inventory.test.ts) retain seed, population identity, unit and SHA-256 ranking; select min(20, population), without replacement. CLI supports `test-file` and `registered-case`. | File samples do not imply a declaration census. Sampling prioritizes review; `requireReview` requires every scoped test file. A valid subset review is explicitly rejected as complete assurance. |
| **TC-06 False-green/quality screening** | Inventory records unreviewed lexical candidates; [review agent](../agentic/code/addons/testing-quality/agents/test-oracle-reviewer.md) examines actual setup, assertions and helpers. Tests verify weak-oracle signals remain candidates rather than automatic defects. | Six automated signal categories cover conditional checks, weak oracles, real timers, source-text checks, skips/focus and uncontrolled input. This is not an exhaustive smell detector. Self-fulfilling mocks, global leakage, unreachable assertions and legitimate counterexamples require contextual review and/or negative controls. |
| **TC-07 Source-bound runtime receipts** | [Collector](../agentic/code/addons/testing-quality/lib/collector.mjs) and [collector tests](../test/unit/addons/test-conformance-collector.test.ts) execute argv, retain bounded raw output and versions, hash source/configuration/report data, reparse raw results, and reject stale, contradictory or tampered evidence. Assessment also checks configured command, environment hash, root and reporter identity. | Receipt hashes detect changes; they are not signatures proving an external actor's identity. Inherited environment, undeclared external services and all machine state are not fully reproduced. Add consequential configuration to `spec.configFiles`. |
| **TC-08 Scoped coverage and effective thresholds** | [Coverage adapter](../agentic/code/addons/testing-quality/lib/coverage.mjs), [coverage tests](../test/unit/addons/test-conformance-coverage.test.ts), [assessment threshold controls](../test/unit/addons/test-conformance-assessment.test.ts): Istanbul and canonical counters, source reconciliation, absent metrics, percentage-only rejection, below-threshold failure, passing threshold and zero-denominator unknown. | Reports must cover the declared source denominator. Coverage collection is explicitly configured; it is not automatically inferred from runner success. Separate lane maps are not blindly summed. |
| **TC-09 Versioned test protocols** | Strict protocol schema includes source/test/configuration scope, lanes, prerequisites, policy, research, negative-control recipes and optional behavioral obligations with owner/SUT/boundary/case/assertion mappings. [Contract tests](../test/unit/addons/test-conformance-contracts.test.ts) reject malformed input; [validator infrastructure tests](../test/unit/addons/test-conformance-validator-failclosed.test.ts) exercise a real unresolved-reference compilation failure and unavailable validator initialization. | Invalid schemas and invalid instances both fail closed. Optional obligations add behavioral traceability; a glob-only protocol does not claim that every product requirement has been specified. |
| **TC-10 Standard output contracts/templates** | [Governed domain](../schemas/catalog/domains/testing-quality.json), addon schemas and [contract tests](../test/unit/addons/test-conformance-contracts.test.ts) cover inventory, samples, normalized results, runs, review, research, coverage, normalization, controls and assessment. Markdown templates support protocol review and reports. | Schema validity proves shape and explicit status, not semantic correctness. Runtime verification and reviewer judgment remain necessary. |
| **TC-11 Target normalization-template authoring** | [Template engine](../agentic/code/addons/testing-quality/lib/templates.mjs), [template tests](../test/unit/addons/test-conformance-templates.test.ts): typed variables, self-contained content, default validation, explicit platform, substitution checks and editable target assets. | Bundled assets are examples; custom templates can target real configuration/tests. No arbitrary expression execution or universal automatic semantic codemod is claimed. |
| **TC-12 Safe repeatable deployment** | [Normalization transactions](../agentic/code/addons/testing-quality/lib/normalization.mjs), [normalization tests](../test/unit/addons/test-conformance-normalization.test.ts), template tests: exact before/after bytes and modes, create-only journals, whole-plan preflight, idempotent replay, collision/drift checks and traversal/symlink refusal. | Guarded plans preserve intervening user work by refusing conflicts. Mid-transaction failure is journaled as partial, not successful. Package/provider asset delivery is a separate check below. |
| **TC-13 Real test repair, verification and revert** | [Assessment integration test](../test/unit/addons/test-conformance-assessment.test.ts), “repairs an actual weak test oracle”: a type-only assertion passes an incorrect numeric result; the source fault survives; a reviewable test-file edit introduces exact expected-result checking; old evidence becomes stale; new control is killed; assessment passes; rollback restores original test bytes and original production source. | This is one real custom Node harness qualification of the semantic test-repair loop. Separate Vitest/pytest CLI lifecycles exercise real SUT repair and transactional revert. These are different claims and are not conflated. Agents author project-specific semantic repairs. |
| **TC-14 Internal/web research and tool recommendations** | [Research search](../agentic/code/addons/testing-quality/lib/research.mjs), [profile/research tests](../test/unit/addons/test-conformance-profiles.test.ts), [primary-source registry](../agentic/code/addons/testing-quality/research/primary-sources.json) and [recommendations](../agentic/code/addons/testing-quality/research/tool-recommendations.json). Configurable corpus paths, bounded excerpts, file hashes, versions, limitations and missing-tool diagnostics are retained. | CLI searches local UTF-8 Markdown/text/JSON and suggests primary links. The research skill/agent follows permitted web links; CLI does not browse or install tools. Missing/misspelled corpus roots are diagnosed, not silently treated as a successful search. PDF/OCR acquisition is outside this search adapter. |
| **TC-15 Existing mutation/flake integration** | Existing mutation/flaky/TDD/factory/sync skills remain in the manifest. [Controls](../agentic/code/addons/testing-quality/lib/controls.mjs), [control tests](../test/unit/addons/test-conformance-controls.test.ts) distinguish killed, survived and unknown; setup failure is not a killed defect. [Evidence rule](../agentic/code/addons/testing-quality/rules/test-conformance-evidence.md) preserves mutation denominators and first-attempt flake observations. | This delivery executes targeted negative controls, not a full mutation campaign or measured flake-history experiment. Existing skills are retained routing paths; no new cross-tool mutation-report or CI-history aggregator is claimed. |
| **TC-16 Agents, skills, YAML flows and AIWG integration** | Addon supplies three agents, three new skills alongside six retained skills, three YAML playbooks, ten capabilities and templates. [Workflow guide](../agentic/code/addons/testing-quality/docs/conformance-workflow.md) defines lifecycle handoffs and evidence checks. | YAML is agent-orchestrated. The CLI does not execute arbitrary flow YAML. Codex deployment and public discovery were exercised. The asset contract test validates all 13 YAML artifacts, step dependencies, capability bindings, required inputs and output references. |
| **TC-17 Extensible cross-platform qualification** | Nine profiles, generic adapter scaffold, [qualification worksheet](../agentic/code/addons/testing-quality/templates/adapter-qualification.md), strict canonical protocol and reporter interfaces, real Vitest/pytest tests, plus fixture-level Go/Cargo/TAP/JUnit/TRX parser tests. | Actual execution qualification is version-specific and narrower than parser support. See platform matrix below. Missing adapters remain unknown and must be qualified against target commands and versions. |
| **TC-18 Repeatable baseline/remediation** | Assessment `previous`/CLI `--baseline` compares new, resolved, unchanged, regressed, changed and removed gate identities while retaining source/protocol changes. Assessment tests prove unknown execution resolves with fresh evidence and regresses when evidence is absent. | Functional lane/file/obligation gates have stable identities. Baseline comparisons are evidence summaries, not proof that a removed requirement was repaired; removed gates and changed protocol are explicit. |

## Qualified platforms and evidence level

| Platform | Implemented surface | Qualified evidence and limits |
| --- | --- | --- |
| **Vitest 4.1.10** | Real `list --json` discovery and JSON execution, matching hierarchical names, profile and examples. | Fresh temporary projects exercise parameter expansion, nonexecution of bodies during collection, source drift, real boundary failures, and external-cwd CLI repair/apply/revert. Earlier exploratory 4.1.11 observations do not replace the final 4.1.10 qualification. |
| **pytest 9.1.1** | Shipped serial hook reporter for collection, setup/call/teardown and execution; profile and examples. | Qualified using an existing selected interpreter supplied through `TEST_CONFORMANCE_PYTHON`. System `python3` in the reviewed environment does not itself provide pytest. Tests skip explicitly without the prerequisite; those skips cannot count as compatibility evidence. Worker aggregation/pytest-xdist is not qualified. |
| Jest | JSON execution adapter, profile and examples. | Fixture-level normalization evidence. No real Jest installation/discovery lifecycle qualification claimed. Collected/would-run output cannot prove execution. |
| Native Node | Nested TAP execution adapter, profile/example and actual custom-harness controls. | TAP fixtures preserve leaves and custom units. The profile has no qualified collect-only discovery; default discovery requirements remain unknown without an added adapter. |
| Go | `go test -json` runtime adapter and profile. | NDJSON fixtures, dynamic subtest names, terminal/partial-stream checks. No actual Go project lifecycle qualification. Package names are not fabricated source file paths; `go test -list` does not prove dynamic subtest discovery. |
| Cargo/libtest | Explicit runtime JSON adapter and profile. | Runtime fixtures only; Cargo build JSON is rejected as test evidence. Toolchain/runtime format and dynamic discovery must be qualified on the target. |
| JUnit/Maven | Restricted JUnit XML adapter and profile. | Positive/adversarial XML fixtures; no real Java build/discovery qualification. Source paths and case IDs must reconcile before discovery gates pass. |
| .NET VSTest | Restricted TRX adapter and profile. | Positive/adversarial XML fixtures; no actual .NET runtime qualification. Microsoft Testing Platform is not silently assumed to be VSTest. |
| Generic/custom | Explicit argv, canonical reports, editable protocol and adapter guidance. | Actual custom Node harness verifies source-bound collection, semantic test repair, targeted controls and complete assessment. A new language/runner still requires its own adapter qualification. |

## Observed validation and delivery ledger

The following are bounded observations, not a whole-repository quality certificate:

- Final focused validation on 2026-09-08: **165 tests passed across 16 files, zero skipped**, using Vitest **4.1.10**
  and an explicitly selected existing pytest **9.1.1** interpreter. This includes real CLI lifecycles, semantic
  weak-test repair, negative controls, malformed reports, source drift, schema infrastructure failures and YAML
  bindings. Local log: `.aiwg/testing/toolkit-validation/coverage-run.log`; exact addon/test file hashes:
  `.aiwg/testing/toolkit-validation/validation-source-manifest.json`.
- V8 coverage for addon command/library JavaScript: **91.30% lines (1,207/1,322), 81.36% statements (1,677/2,061),
  76.50% branches (1,371/1,792), 88.60% functions (241/272)**. Aggregate 80% line/75% branch targets passed.
  Library-only coverage is **97.49% lines and 83.69% branches**. The CLI appears as 0% in the parent-process map because
  it is exercised through separate subprocesses; the six CLI integration cases provide behavioral evidence separately.
  This map does not measure the Python helper or all AIWG product code.
- Repository TypeScript check (`tsc --noEmit`), addon package validation (24 checks), and `git diff --check` passed.
  Contract tests validate all 13 testing schemas and positive/negative fixtures through both the core schema catalog and
  addon validator. Asset tests validate 3 playbooks and 10 capabilities against the canonical workflow schemas and their
  actual references.
- Actual public `aiwg use testing-quality --provider codex` into a temporary workspace deployed **3 agents, 9 skills and
  12 registered CLI commands**. `aiwg test-conformance templates --action list --platform javascript-vitest --format
  json` worked through that namespace. Public `aiwg discover 'test conformance' --json` returned the new skill, evidence
  rule, protocol schema and both audit/normalization flows. The empty temporary project emitted a project-index
  advisory; packaged framework discovery succeeded.
- `npm pack --ignore-scripts` produced a real tarball containing all addon assets. The extracted package's standalone
  entrypoint successfully listed Python templates and initialized a generic target protocol. The smoke test linked the
  development installation's already installed runtime dependencies into the extracted package; it is an
  extracted-asset/entrypoint check, not a fresh network dependency-install test. The direct `saxes` parser dependency
  and its maintenance limitation are documented in the XML adapter guide.
- A scoped inventory benchmark recorded **7,083.97 ms**, **163,127,296 RSS bytes**, **651 source files, 813 candidate
  test files and 35 configuration files**. Scope was conventional JS/TS files under `test/**`, `src/**`, and
  configuration; it retained **10 diagnostics and `complete:false`**. This is one performance observation of a
  deliberately incomplete scoped inventory, not a green conformance result, declaration census, timing guarantee or
  flake measurement. Local artifact: `.aiwg/testing/toolkit-validation/repository-inventory-benchmark.json`.

## Claims this toolkit deliberately does not make

No sample, coverage number, receipt hash, schema, or green runner can prove every possible behavior is correct. The
toolkit makes review and verification repeatable, identifies missing evidence, and supplies actionable
normalization/research paths. Semantic repairs still need contextual engineering judgment, meaningful negative controls
and target execution.

Passing configured gates is relative to that protocol. Disabling discovery, review, negative controls, or coverage
thresholds narrows assurance and is reported explicitly. Required live services, installed-artifact behavior,
performance baselines and product requirements must be declared and executed separately. Existing baseline failures are
retained rather than hidden by skips, weakened assertions, retries or relaxed thresholds.
