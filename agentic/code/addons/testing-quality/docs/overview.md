# Testing Quality Overview

The testing-quality addon helps teams check whether tests protect behavior, not only whether they execute lines. Use
it when you need coverage gates, mutation testing, flaky-test investigation, factory generation, or test-suite
synchronization inside an AIWG workflow.

## Common Use Cases

- Add a TDD or coverage gate to an existing repository.
- Run mutation testing to find tests that execute code but do not catch broken behavior.
- Investigate intermittent CI failures and record the likely flaky-test cause.
- Generate test-data factories from models or schemas.
- Detect missing or orphaned tests after refactors.

## What It Provides

Skills are organized in two phases:

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

The `mutation-test` skill runs Stryker (JavaScript/TypeScript), PITest (Java), or mutmut (Python) depending on the project language, generates a mutation score report, and identifies which specific tests are weak and what they should be checking. Python covered-line runs first execute a subprocess-isolated native-extension preflight. If that preflight detects a module that mutmut could unload and re-import, the skill blocks covered-line mode and permits the non-covered-line fallback only for explicit mutation targets whose conservative estimate fits the declared runtime budget.

Mutation evidence keeps three result classes separate: harness/tool failures,
direct project-test failures, and mutant outcomes. A native-extension crash while
mutmut is collecting stats never contributes to the mutation score.

## Quality Targets

These are starter targets for project policy, not universal product guarantees:

| Metric | Example Target | How It's Measured |
|--------|--------|-------------------|
| Line coverage | ≥ 80% | CI gate configured by `tdd-enforce` |
| Mutation score | ≥ 80% | Stryker/PITest/mutmut report |
| Flaky test rate | < 2% | CI history analysis |
| Test data setup friction | Declines after factory adoption | Factory usage and reviewer feedback |

Teams should adjust these thresholds to the codebase, test runtime, risk level, and language tooling.

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

- [Quickstart](quickstart.md) — Set up testing quality in a project
- `@$AIWG_ROOT/agentic/code/addons/testing-quality/skills/tdd-enforce/SKILL.md` — TDD enforcement details
- `@$AIWG_ROOT/agentic/code/addons/testing-quality/skills/mutation-test/SKILL.md` — Mutation testing details
- `@$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/test-engineer.md` — Test engineer agent
