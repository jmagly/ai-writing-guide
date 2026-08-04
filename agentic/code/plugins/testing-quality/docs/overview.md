# Testing Quality Overview

The testing-quality addon provides skills for enforcing test-driven development, validating test quality beyond coverage, and maintaining healthy test suites. It addresses the gap between passing a coverage gate and actually having meaningful tests — a codebase can have 80% coverage and still have tests that would pass with any implementation.

## What It Provides

Six skills organized in two phases:

### Phase 1: Enforcement and Quality

| Skill | Purpose | Natural Language Trigger |
|-------|---------|--------------------------|
| `tdd-enforce` | Install pre-commit hooks and CI coverage gates | "set up TDD," "add coverage gates" |
| `mutation-test` | Run mutation testing to validate test quality | "validate test quality," "mutation score" |
| `flaky-detect` | Identify flaky tests from CI history | "find flaky tests," "CI is unstable" |
| `flaky-fix` | Suggest and apply fixes for flaky tests | "fix flaky test," "make test reliable" |

### Phase 2: Automation and Efficiency

| Skill | Purpose | Natural Language Trigger |
|-------|---------|--------------------------|
| `generate-factory` | Generate test data factories from model schemas | "generate factory," "create test data" |
| `test-sync` | Detect orphaned and missing tests | "find orphaned tests," "sync tests" |

## Why Mutation Testing Matters

Coverage tells you which lines were executed during tests. Mutation testing tells you whether your tests would catch a bug. It works by making small, deliberate changes to your code (mutants) — flipping a `>` to `>=`, negating a condition, removing a return value — and checking whether your tests fail. If they do not, the test is not actually validating that behavior.

A codebase with 85% coverage but a 50% mutation score has a lot of tests that would pass with broken code.

The `mutation-test` skill runs Stryker (JavaScript/TypeScript), PITest (Java), or mutmut (Python) depending on the project language, generates a mutation score report, and identifies which specific tests are weak and what they should be checking.

## Quality Targets

| Metric | Target | How It's Measured |
|--------|--------|-------------------|
| Line coverage | ≥ 80% | CI gate configured by `tdd-enforce` |
| Mutation score | ≥ 80% | Stryker/PITest/mutmut report |
| Flaky test rate | < 2% | CI history analysis |
| Test data setup time | −60% vs manual | Factory adoption rate |

The 80% coverage target comes from Google's testing research (2010). Mutation score at 80% is based on ICST workshop standards.

## Test Data Factories

Hand-writing test data for complex models is tedious and leads to brittle tests that break whenever the model changes. The `generate-factory` skill analyzes a model's interface or schema and generates a factory with:

- Sensible defaults for all fields
- Faker.js integration for realistic random data
- Traits for common test variants (e.g., `admin`, `inactive`, `unverified`)
- Relationship handling for associated models

Example:

```
Generate factory for User model
```

Output is a factory file compatible with the project's existing test infrastructure.

## Flaky Test Categories

`flaky-detect` analyzes CI history to identify intermittently failing tests and categorizes root causes:

| Category | Example | Fix Approach |
|----------|---------|-------------|
| Timing/async | Tests that pass locally but fail in CI | Replace `setTimeout` with proper async wait |
| Shared state | Tests that fail when run in a different order | Isolate state in `beforeEach`/`afterEach` |
| External dependency | Tests that fail when network is slow | Mock the dependency |
| Random data | Tests that fail on certain random inputs | Fix the seed or use deterministic data |

`flaky-fix` applies the appropriate fix for each category.

## Integration with SDLC

The testing-quality addon integrates with the SDLC framework during Construction phase:

- `tdd-enforce` is invoked during project setup or when transitioning to Construction
- `mutation-test` runs as part of the quality gate before Construction → Transition
- `flaky-detect` / `flaky-fix` runs when CI instability is reported

Related SDLC agents: `test-engineer`, `test-architect`, `mutation-analyst`.

## References

- `@$AIWG_ROOT/agentic/code/addons/testing-quality/docs/quickstart.md` — Set up testing quality in a project
- `@$AIWG_ROOT/agentic/code/addons/testing-quality/skills/tdd-enforce/SKILL.md` — TDD enforcement details
- `@$AIWG_ROOT/agentic/code/addons/testing-quality/skills/mutation-test/SKILL.md` — Mutation testing details
- `@$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/test-engineer.md` — Test engineer agent
