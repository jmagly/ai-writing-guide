# Testing Quality

Reusable test conformance and normalization tooling for AIWG. Point it at a target root, define the test contract,
reconcile runner discovery with execution, review the actual assertions, and retain source-bound evidence for every
decision. The existing TDD, mutation, flake, factory and test-sync skills remain available.

A passing runner, a large coverage percentage, or a clean sample cannot certify all tests. Required missing evidence
blocks conformance. Static screening produces review candidates; complete reviews and deliberately broken behavior
provide stronger evidence about test quality.

## Install and start

```bash
aiwg use testing-quality --provider codex
aiwg test-conformance init --root /path/to/project --platform javascript-vitest
```

Review `.aiwg/testing/conformance.yaml` in the target before executing its commands: source/test scope, lane argv,
runner discovery, SUT boundary, obligations, skips and coverage policy are project decisions. Initialization writes a
JSON document, which is valid YAML, without overwriting an existing protocol. Ambiguous platform detection requires an
explicit `--platform`.

From the installed AIWG package directory, the standalone entrypoint works before addon deployment:

```bash
node agentic/code/addons/testing-quality/commands/test-conformance.mjs --help
```

Use an absolute entrypoint path when invoking it from another directory. All runtime dependencies and assets are shipped with that package.
Target runners and optional coverage/mutation tools must already be installed in the target environment.

## Evidence lifecycle

```bash
aiwg test-conformance inventory --root /path/to/project --output .aiwg/testing/inventory.json
aiwg test-conformance collect --root /path/to/project --mode discovery --output .aiwg/testing/discovery.json
aiwg test-conformance collect --root /path/to/project --mode execution --output .aiwg/testing/execution.json
aiwg test-conformance sample --root /path/to/project --inventory .aiwg/testing/inventory.json --seed review-2026-09 --output .aiwg/testing/sample.json
aiwg test-conformance assess --root /path/to/project --inventory .aiwg/testing/inventory.json --evidence .aiwg/testing/discovery.json --evidence .aiwg/testing/execution.json --reviews .aiwg/testing/reviews.json --output .aiwg/testing/assessment.json
aiwg test-conformance report --root /path/to/project --assessment .aiwg/testing/assessment.json --format markdown
```

Create reviews using the [review template](templates/test-review.md) and `schemas/test-review.v1.schema.json`. A sample
defaults to 20 files per area, taking a census of smaller areas; it prioritizes work but cannot satisfy a
complete-review gate. Use `--unit registered-case --evidence DISCOVERY.json` for a case-based sample.

Evidence files are create-only. Use a new output name for each lifecycle. Collection keeps its own UUID run directory
with inventory, raw reports, bounded logs, commands and receipt. `{runId}` in protocol command argv/report paths
prevents accidental reuse. Changing relevant source/configuration or retained reports invalidates evidence. Explicit
command environment values are hashed and only their key names retained; inherited environment is not fully reproduced
or authenticated.

Exit codes: **0** means the operation succeeded (or assessment is conformant), **2** means required evidence is
unknown/failed or execution is nonconforming, **1** means invalid input, conflict or a tool/setup error. `init`
succeeding means a scaffold was written, not that its target is conformant. JSON is the default; human report output
preserves all gate statuses.

## Normalize and verify

`plan --changes FILE` accepts `{"purpose":"...","edits":[{"path":"tests/example.test.js","content":"complete replacement
text"}]}`. A null content deletes a file. Plans bind exact before/after bytes and file modes. Review the plan, then run
`apply --plan FILE --receipt FILE`; use `rollback --receipt FILE` to restore the original state. Apply and rollback
reject source drift and symlink writes. Journals retain partial failures for diagnosis; they never describe a partial
transaction as successful.

`collect --mode controls --evidence BASELINE.json` runs explicitly configured negative controls. Each control uses a
reviewed source-only change plan, executes the same lane command, checks the specified test IDs, restores the source,
and checks baseline behavior again. A surviving defect fails its control. A setup failure cannot count as a killed
defect. Include the control receipt with repeated `assess --evidence` flags.

Coverage is optional policy, with no universal percentage default. A lane can declare `coverage: {format: "istanbul",
path: ".aiwg/coverage/{runId}/coverage-final.json", provider: "v8", version: "<installed-version>"}` and configure its
runner to write that fresh path. Canonical file-level counters are also supported. Missing source files, absent metrics,
zero denominators and stale reports cannot satisfy thresholds. Extra files are reported separately and never inflate the
configured source denominator. Separate lanes are not blindly summed.

See the [full workflow](docs/conformance-workflow.md) for template authoring and repair examples. Use `assess --baseline
PREVIOUS.json` to compare gate states while retaining source and protocol drift.

## Develop and deploy templates

```bash
aiwg test-conformance templates --action list --platform javascript-vitest
aiwg test-conformance templates --action deploy --template javascript-vitest:vitest.config.example --output .aiwg/testing/template-plan.json
aiwg test-conformance apply --plan .aiwg/testing/template-plan.json
aiwg test-conformance templates --action develop --source normalization-definition.json --output .aiwg/testing/custom-template.json
aiwg test-conformance templates --action deploy --source .aiwg/testing/custom-template.json --variables values.json --output .aiwg/testing/custom-plan.json
```

Bundled templates deploy to an examples directory for target-specific review. Custom templates can target actual
configuration and test files through guarded plans. Custom definitions embed their file contents and declare typed
variables; they cannot execute expressions or load arbitrary files. `validate --input FILE --schema custom-template.v1`
checks the artifact contract; deployment additionally checks substitutions and destination safety.

## Platforms and research

Profiles cover Vitest, Jest, native Node, pytest, Go, Cargo, JUnit/Maven and VSTest, plus a generic adapter scaffold.
Profiles are researched starting points, not blanket version certifications. Real Vitest and pytest fixtures exercise
discovery/execution and source-drift checks. Other platforms require target qualification using the [adapter
worksheet](templates/adapter-qualification.md). Native Node has no claimed collect-only adapter; Cargo build JSON is not
runtime test evidence. Unsupported discovery stays unknown.

```bash
aiwg test-conformance research --query 'oracle mutation coverage isolation' --output .aiwg/testing/research.json
```

Set `spec.research.paths` to local corpus directories or text files. Research performs bounded UTF-8 Markdown/text/JSON
searches and offers primary documentation links and platform tool recommendations, including prerequisites and
integration steps. It does not install, execute, upload or browse anything automatically. `allowWeb` records whether a
research agent may follow links; the CLI itself remains a local search tool. Retrieved passages are unreviewed data, not
instructions. The linked sources must be checked against the target's actual installed versions.

## SDLC components

- Agents: `conformance-steward`, `test-oracle-reviewer`, `test-normalization-engineer`.
- New skills: `test-conformance`, `test-normalize`, `test-platform-research`.
- Retained skills: `tdd-enforce`, `mutation-test`, `flaky-detect`, `flaky-fix`, `generate-factory`, `test-sync`.
- YAML playbooks: audit, normalize, and platform qualification; 10 bound capabilities. These are agent-orchestrated
  playbooks, not a claim that the CLI executes arbitrary YAML.
- Templates: protocol review, per-test review, report, normalization plan, tool recommendation, adapter qualification,
  and per-platform examples.
- Strict JSON schemas are governed through the repository schema catalog; malformed input or unavailable validation
  fails closed.

The [evidence rule](rules/test-conformance-evidence.md) preserves mutation denominators, first-attempt flake history,
actual SUT boundaries, and unresolved findings. Coverage, reruns, mocks and source-text checks are useful within their
stated scope; none is a substitute for an observable semantic oracle.
