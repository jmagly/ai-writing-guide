# Testing Quality Addon

Advanced testing enforcement, quality metrics, and automation skills for AIWG.

## Overview

This addon provides skills for enforcing test-driven development, validating test quality beyond coverage, and maintaining healthy test suites. All recommendations are grounded in academic research and industry best practices.

## Research Foundation

| Capability | Source | Reference |
|------------|--------|-----------|
| TDD Methodology | Kent Beck (2002) | "Test-Driven Development by Example" |
| 80% Coverage | Google (2010) | [Testing Blog](https://testing.googleblog.com/2010/07/code-coverage-goal-80-and-no-less.html) |
| Mutation Testing | ICST Workshop | [IEEE Conference](https://conf.researchr.org/home/icst-2024/mutation-2024) |
| Flaky Detection | FlaKat (2024) | [arXiv:2403.01003](https://arxiv.org/abs/2403.01003) |
| Test Refactoring | UTRefactor (ACM 2024) | [89% smell reduction](https://dl.acm.org/doi/10.1145/3715750) |
| Factory Pattern | ThoughtBot | [FactoryBot](https://github.com/thoughtbot/factory_bot) |

## Skills

### Phase 1: Enforcement & Quality (Critical)

| Skill | Purpose | Trigger |
|-------|---------|---------|
| `tdd-enforce` | Pre-commit hooks + CI coverage gates | "set up TDD", "add coverage gates" |
| `mutation-test` | Run mutation testing analysis | "validate test quality", "mutation score" |
| `flaky-detect` | Identify flaky tests from CI history | "find flaky tests", "CI is unstable" |
| `flaky-fix` | Suggest/apply fixes for flaky tests | "fix flaky test", "make test reliable" |

### Phase 2: Automation & Efficiency

| Skill | Purpose | Trigger |
|-------|---------|---------|
| `generate-factory` | Auto-generate test data factories | "generate factory", "create test data" |
| `test-sync` | Detect orphaned/missing tests | "find orphaned tests", "sync tests" |

## Installation

```bash
# Via AIWG CLI
aiwg addon install testing-quality

# Or copy to project
cp -r agentic/code/addons/testing-quality/ .aiwg/addons/
```

## Usage Examples

### Set Up TDD Enforcement

```
"Set up TDD enforcement for this project"

→ Installs pre-commit hooks
→ Creates CI coverage gates
→ Generates TDD workflow documentation
```

### Validate Test Quality

```
"Run mutation testing on src/auth/"

→ Runs Stryker/PITest/mutmut
→ Generates mutation score report
→ Identifies weak tests with specific fixes
```

### Fix Flaky Tests

```
"Find and fix flaky tests"

→ Analyzes CI history for intermittent failures
→ Categorizes by root cause (timing, async, etc.)
→ Suggests deterministic replacements
```

### Generate Test Factories

```
"Generate factory for User model"

→ Analyzes User interface/schema
→ Creates factory with Faker.js
→ Includes traits and relationships
```

## Related Components

### Command

- `/setup-tdd` - One-command TDD infrastructure setup

### Agent

- `mutation-analyst` - Deep analysis of mutation testing results

### NFR Module

- `@.aiwg/requirements/nfr-modules/testing.md` - Testing requirements

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Coverage | ≥80% | CI gate |
| Mutation Score | ≥80% | Stryker/PITest report |
| Flaky Rate | <2% | CI history analysis |
| Test Data Setup Time | -60% | Factory adoption |

## Directory Structure

```
testing-quality/
├── manifest.json
├── README.md
└── skills/
    ├── tdd-enforce/
    │   ├── SKILL.md
    │   └── scripts/
    │       └── tdd_setup.py
    ├── mutation-test/
    │   └── SKILL.md
    ├── flaky-detect/
    │   └── SKILL.md
    ├── flaky-fix/
    │   └── SKILL.md
    ├── generate-factory/
    │   └── SKILL.md
    └── test-sync/
        └── SKILL.md
```

## References

- @.aiwg/planning/testing-tools-recommendations-referenced.md
- @.aiwg/requirements/nfr-modules/testing.md
- @agentic/code/frameworks/sdlc-complete/agents/test-engineer.md
- @agentic/code/frameworks/sdlc-complete/agents/test-architect.md
- @agentic/code/frameworks/sdlc-complete/agents/mutation-analyst.md
