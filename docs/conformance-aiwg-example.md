# AIWG's test conformance example

Ask your assistant:

> Audit this repository's testing regime with Testing Quality. Reconcile runner ownership, review actual test
> oracles, repair confirmed weaknesses through normalization plans, and prove the repaired tests reject wrong behavior.

AIWG uses its own conformance toolkit to support that workflow. Source inventory, execution, semantic review,
coverage, and negative controls remain distinct evidence. The repository example is deliberately scoped and does
not certify every AIWG test or every supported platform.

## Inventory the repository

After installing development dependencies, run:

```bash
npm run lint:test-registration
npm run test:conformance:audit
```

The registration gate reads actual runner configuration and test imports, checks offline lane ownership against
the CI command graph, and fails on unknown or unassigned test files. Its unit is a source file, not an executed
case. Legacy synchronous Node harnesses are counted as files; their printed labels do not become case counts.

The audit command uses Testing Quality's protocol, inventory, and sampling APIs. It records source hashes and
up to twenty test files per area with a retained seed, using a census for smaller areas. Areas follow root test
directories, framework tests, and tool tests. App-local suites, the VS Code extension host, and live-system
qualification have separate owners. The command records lane recipes without executing them.

Reports go to the configured AIWG artifact root, including workspaces redirected through `.aiwg-location` or
`AIWG_ARTIFACTS_PATH`. An ownership report or sample is the start of an audit, not a conformance certificate.

## Run the reviewed example

```bash
npm run test:conformance:example
```

Run the example while the source tree is idle. It temporarily changes one reviewed production source statement;
the example serializes its own invocations, and other tests or editors must not share that mutation window.

The example reviews the complete `test-conformance-controls.test.ts` file and exercises the shipped control
collector, result adapter, inventory, transaction, and assessment code. Its checked-in protocol and review are
under `config/testing/`.

The command performs this sequence:

1. Verify the recorded review's test, source, schema, and configuration hashes. Changed reviewed bytes require a
   fresh semantic review; the command never updates the pins itself.
2. Inventory the declared scope and retain its deterministic census sample.
3. Collect actual Vitest discovery and execution receipts, reconciling full case identities and source files.
4. Prepare a source-only normalization plan that changes universal selected-case matching from `every` to `some`.
5. Execute the same lane against that mutation. The named multi-target case must fail because one selected target
   surviving is insufficient evidence of a killed control.
6. Restore the source, rerun the passing baseline, verify raw receipts and restoration, and assess conformance.

All eleven controls cases receive semantic review. The mutation establishes sensitivity to the named attribution
defect; it is not a whole-library mutation score. Missing cases, stale review, malformed reports, setup failure,
timeout, surviving mutations, or incomplete restoration prevent success.

Each invocation creates fresh evidence under `test-results/conformance-example/` and copies the complete run to
the canonical artifact root. It retains plans, inventories, raw reports, stdout/stderr, reviews, control journals,
assessment, and Markdown report. Receipts preserve their original workspace-relative paths; keep that workspace
evidence when reverifying them. A failed restoration preserves the lock and receipts for explicit recovery.

## What the release audit repaired

| Finding | Repair and evidence |
| --- | --- |
| Vitest `.mjs` files were excluded solely by extension | Restore API-based ownership and execute the previously omitted cohort. |
| Contract files mixed native Node and Vitest APIs | Split the runner lanes and make both mandatory in CI. |
| Validators could pass after missing dependencies or compilation errors | Fail closed and test the setup failures explicitly. |
| Enum and payload checks could verify local constants or skip absent fixtures | Validate actual schema constraints and complete, nonempty fixture envelopes. |
| Query integration returned before assertions when the external corpus was absent | Build a deterministic four-document index and assert exact results through the real query engine. |
| Fixture hashes were derived from the same current bytes | Pin reviewed fixture digests and prove an edited fixture fails its named guard. |
| Every negative-control target set contained one case | Add multiple targets, one surviving target, and unrelated failing decoys with exact status maps. |
| Vitest nested suites were mistaken for report files | Qualify the adapter against a captured real nested-suite report and malformed counters. |
| Several tests independently rebuilt the same npm package | Share one genuine prepack within a serial packaging lane; keep the original content assertions. |
| Global coverage keys were outside the effective threshold object | Correct their placement and add a measured library gate with a deliberate denominator failure. |

The executor/schema repair also has three attributable source controls: remove an enum member, remove a
paused-state requirement, and bypass the validator depth guard. Each must fail its intended test and pass again
after restoration. These results support those concrete behaviors, not live executor transport qualification.

## Maintain the runner and coverage boundaries

The default Vitest lane, native Node lane, split contracts, serial packaging lane, corpus discovery lane, and UAT
have separate commands and CI ownership. Moving a test between them must preserve an executed CI path. The
registration gate checks that connection; new unsupported APIs must receive explicit ownership.

```bash
npm run test:coverage:testing-quality
npm run test:coverage:enforcement
```

The measured gate covers `agentic/code/addons/testing-quality/lib/**/*.mjs`, with thresholds of 90% lines,
80% statements, 75% branches, and 85% functions. It excludes subprocess-only lifecycle suites from the collecting
process; those have separate real-runner qualification. The enforcement check runs a passing behavior test,
adds uncovered source to the same denominator, requires coverage failure while that test still passes, then
restores the original denominator and requires success.

The broader historical `src/` and daemon coverage targets remain an opt-in measurement. Their correct syntax
does not establish that the whole repository meets them. The reviewed controls example declares no coverage
threshold of its own and makes no measured coverage claim; CI's library coverage gate supplies that separate evidence.

When changing reviewed tests or implementation, repeat semantic review and source controls before updating
`conformance-example.review.json`. Refreshing hashes alone would erase the evidence boundary this example teaches.

See the [Testing Quality workflow](addons/testing-quality/conformance-workflow.md) for applying the same process
to another codebase and the [toolkit acceptance matrix](conformance-acceptance.md) for platform qualification limits.
