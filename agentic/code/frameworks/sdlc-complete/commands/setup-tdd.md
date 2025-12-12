---
description: One-command TDD infrastructure setup with pre-commit hooks and CI coverage gates
category: testing
argument-hint: [--level strict|standard|gradual|audit] [--threshold 80]
---

# Setup TDD Command

Configure Test-Driven Development enforcement for the current project with a single command.

## Research Foundation

This command implements TDD enforcement based on established research:

| Principle | Source | Reference |
|-----------|--------|-----------|
| TDD Methodology | Kent Beck (2002) | "Test-Driven Development by Example" |
| 80% Coverage | Google (2010) | [Code Coverage Goal](https://testing.googleblog.com/2010/07/code-coverage-goal-80-and-no-less.html) |
| Pre-commit Hooks | Industry Practice | [Husky](https://typicode.github.io/husky/), [pre-commit](https://pre-commit.com/) |
| CI Gates | ISTQB CT-TAS | [Test Automation Strategy](https://istqb.org/certifications/certified-tester-test-automation-strategy-ct-tas/) |

## Usage

```
/setup-tdd [options]
```

### Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--level` | strict, standard, gradual, audit | standard | Enforcement strictness |
| `--threshold` | 0-100 | 80 | Line coverage threshold |
| `--branch-threshold` | 0-100 | 75 | Branch coverage threshold |

### Enforcement Levels

| Level | Pre-commit | CI Gate | Best For |
|-------|-----------|---------|----------|
| `strict` | Block | Fail | New projects, critical systems |
| `standard` | Warn + Block | Fail | Most projects |
| `gradual` | Warn | Warn | Brownfield TDD adoption |
| `audit` | Log only | Report | Assessment before enforcement |

## Instructions

When this command is invoked, perform these steps:

### 1. Analyze Project

- Detect project type (JavaScript, Python, Java, Go, Rust)
- Identify test framework (Vitest, Jest, Pytest, etc.)
- Check for existing test infrastructure
- Assess current coverage baseline

### 2. Configure Pre-commit Hooks

**For JavaScript projects**:
```bash
npm install --save-dev husky lint-staged
npx husky init
```

Create `.husky/pre-commit`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run tests for staged files
npx lint-staged

# Check coverage threshold
npm test -- --coverage
```

**For Python projects**:
```bash
pip install pre-commit pytest-cov
pre-commit install
```

Create `.pre-commit-config.yaml`:
```yaml
repos:
  - repo: local
    hooks:
      - id: pytest-coverage
        name: pytest with coverage
        entry: pytest --cov=src --cov-fail-under=80
        language: system
        types: [python]
        pass_filenames: false
```

### 3. Configure CI Coverage Gates

Create `.github/workflows/tdd-coverage-gate.yml`:

```yaml
name: TDD Coverage Gate

on:
  pull_request:
    branches: [main, master]

jobs:
  test-coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests with coverage
        run: npm test -- --coverage

      - name: Check coverage threshold
        run: |
          COVERAGE=$(jq '.total.lines.pct' coverage/coverage-summary.json)
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "::error::Coverage $COVERAGE% below 80% threshold"
            exit 1
          fi

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            // Add coverage report as PR comment
```

### 4. Create Test Presence Validation

Add script to validate new code has tests:

```javascript
// scripts/check-test-presence.js
const changedFiles = getChangedFiles();
const srcFiles = changedFiles.filter(f => f.startsWith('src/'));

for (const src of srcFiles) {
  const testFile = src.replace('src/', 'test/').replace('.ts', '.test.ts');
  if (!fs.existsSync(testFile)) {
    console.error(`Missing test: ${testFile}`);
    process.exit(1);
  }
}
```

### 5. Generate Documentation

Create `docs/TDD_WORKFLOW.md`:

```markdown
# TDD Workflow

This project enforces Test-Driven Development.

## The TDD Cycle

1. **Red**: Write a failing test
2. **Green**: Write minimum code to pass
3. **Refactor**: Clean up while keeping tests green

## Coverage Requirements

- Line coverage: ≥80%
- Branch coverage: ≥75%
- Critical paths: 100%

## Pre-commit Checks

Every commit runs:
- Tests for staged files
- Coverage threshold validation

## CI Gates

Every PR requires:
- All tests passing
- Coverage ≥ threshold
- No coverage decrease
```

## Output Format

Report setup results:

```markdown
## TDD Enforcement Configured

**Project**: [project-name]
**Type**: JavaScript (Vitest)
**Level**: standard

### Pre-commit Hooks
- [x] Husky installed
- [x] lint-staged configured
- [x] Coverage check on commit

### CI Gates
- [x] GitHub Actions workflow created
- [x] Coverage threshold: 80%
- [x] PR comment integration

### Files Created
- `.husky/pre-commit`
- `.github/workflows/tdd-coverage-gate.yml`
- `docs/TDD_WORKFLOW.md`

### Files Modified
- `package.json` (added scripts)

### Next Steps
1. Run `npm test` to establish baseline
2. Commit changes to enable hooks
3. Create first PR to verify CI gates
```

## Brownfield Adoption

For projects without tests, use gradual adoption:

```
/setup-tdd --level gradual --threshold 40
```

This:
1. Starts with 40% threshold (achievable)
2. Warns but doesn't block initially
3. Tracks coverage trends
4. Recommends threshold increases

### Gradual Ramp-up Schedule

| Week | Threshold | Enforcement |
|------|-----------|-------------|
| 1-2 | 40% | Audit only |
| 3-4 | 50% | Warn on commit |
| 5-6 | 60% | Block on PR |
| 7-8 | 70% | Standard enforcement |
| 9+ | 80% | Full enforcement |

## Integration

This command uses the `tdd-enforce` skill from the testing-quality addon:

```
@agentic/code/addons/testing-quality/skills/tdd-enforce/
```

## References

- @.aiwg/requirements/nfr-modules/testing.md
- @agentic/code/frameworks/sdlc-complete/agents/test-architect.md
- @agentic/code/addons/testing-quality/skills/tdd-enforce/SKILL.md
