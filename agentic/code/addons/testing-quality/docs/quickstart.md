# Testing Quality Quickstart

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

Set up TDD enforcement and validate test quality in your project.

## Installation

```bash
aiwg addon install testing-quality
```

Or manually:

```bash
cp -r agentic/code/addons/testing-quality/ .aiwg/addons/
```

## Set Up TDD Enforcement

Run this once when starting a project or when adding testing gates to an existing one:

```
Set up TDD enforcement for this project
```

What gets installed:
- Pre-commit hook that runs `npm test` (or equivalent) before allowing commits
- CI coverage gate at 80% minimum
- `tdd_setup.py` script for non-npm projects
- TDD workflow documentation in `.aiwg/testing/`

After setup, commits that do not pass the test suite are blocked, and CI pipelines fail below 80% coverage.

## Check Test Quality with Mutation Testing

To find out whether your tests would actually catch bugs:

```
Run mutation testing on src/auth/
```

```
Validate test quality for the payment module
```

```
What's our mutation score?
```

The skill detects your test framework and runs the appropriate mutation tool:
- JavaScript/TypeScript: Stryker
- Java: PITest
- Python: mutmut

### Python native-extension preflight

Before mutmut uses `mutate_only_covered_lines = true`, the skill runs the
selected pytest nodes in a disposable subprocess and records native extensions
loaded by the test, conftest, plugin, or source import graph:

```bash
python scripts/native_extension_preflight.py \
  --test-selection tests/test_numerical_contracts.py \
  --pytest-arg=--no-cov \
  --mutation-target package/numerical_contracts.py \
  --estimated-mutants 80 --max-children 4 \
  --runtime-budget-seconds 600 --format json
```

If the report classifies `harness_native_extension_reload_risk`, do not start
mutmut covered-line mode. The script allows `mutate_only_covered_lines = false`
only when the mutation target, observed mutant estimate, child count, and runtime
budget are explicit and the conservative estimate fits. Otherwise narrow the
target or select a project-approved harness with subprocess-isolated coverage and
stats phases.

Preserve the preflight JSON with the mutation report. A stats-phase crash or
re-import error is a harness/tool failure; it is not a project test failure and
must not be counted as a killed, survived, timed-out, or no-tests mutant.

Output is a mutation score report with:
- Overall score (target: ≥80%)
- Which specific functions/methods have weak test coverage
- For each weak test, what condition or behavior it fails to validate

Example output:

```
Mutation Score: 73% (target: 80%)

Weak tests identified:
  src/auth/token.ts:validateExpiry()
  - Mutant survived: Changed > to >= on line 47
  - Tests should check boundary: token valid at exactly expiration time
  
  src/auth/token.ts:generateToken()  
  - Mutant survived: Removed userId from payload on line 23
  - Tests should verify userId is present in generated token
```

Fix the identified weak tests and re-run until the score reaches ≥80%.

## Find and Fix Flaky Tests

When CI is reporting intermittent failures:

```
Find flaky tests
```

```
CI is unstable — find the flaky tests
```

The `flaky-detect` skill analyzes CI history to identify tests that fail intermittently and categorizes the root cause. To fix them:

```
Fix the flaky tests
```

```
Make the auth tests reliable
```

The `flaky-fix` skill applies deterministic replacements: proper async/await patterns for timing issues, state isolation for order-dependency issues, mocking for external dependencies.

## Generate Test Data Factories

When writing tests that require complex model instances:

```
Generate factory for User model
```

```
Create test data factory for Order with traits for pending, completed, and cancelled orders
```

Output is a factory file with sensible defaults, Faker.js integration for realistic data, and traits for common test variants. The factory is placed in the project's existing test/factories/ directory (or created if absent).

## Detect Orphaned Tests

When tests accumulate and fall out of sync with the codebase:

```
Find orphaned tests
```

```
Sync tests with the current codebase
```

`test-sync` identifies:
- Test files that reference source files which no longer exist
- Source files that have no corresponding test file
- Test functions that test code paths no longer present in the source

## Run the /setup-tdd Command

For a one-command TDD infrastructure setup:

```
/setup-tdd
```

This combines `tdd-enforce` installation with test suite configuration, creating a complete TDD environment in one step.

## Integrate with SDLC Quality Gates

If using sdlc-complete, the testing-quality addon hooks into the Construction phase:

```
Run quality gate check before transitioning to Transition
```

The quality gate runs `mutation-test` and `flaky-detect` as blocking checks. Both must pass (≥80% mutation score, <2% flaky rate) before the transition is approved.

## References

- `@$AIWG_ROOT/agentic/code/addons/testing-quality/docs/overview.md` — All skills and quality targets
- `@$AIWG_ROOT/agentic/code/addons/testing-quality/skills/tdd-enforce/SKILL.md` — TDD enforcement details
- `@$AIWG_ROOT/agentic/code/addons/testing-quality/skills/mutation-test/SKILL.md` — Mutation testing details
- `@$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/test-engineer.md` — SDLC test engineer agent
