---
namespace: aiwg
name: mutation-test
description: Run mutation testing to validate test quality beyond code coverage. Use when assessing test effectiveness, finding weak tests, or validating test suite quality.
version: 1.1.0
platforms: [all]

---

# Mutation Test Skill

## Purpose

Run mutation testing to measure test suite effectiveness. Mutation testing introduces small changes (mutants) to code and checks if tests catch them. High coverage with low mutation score indicates weak tests.

## Research Foundation

| Concept | Source | Reference |
|---------|--------|-----------|
| Mutation Testing Theory | IEEE TSE (2019) | Papadakis et al. "Mutation Testing Advances" |
| ICST Mutation Workshop | IEEE Annual | [Mutation 2024](https://conf.researchr.org/home/icst-2024/mutation-2024) |
| Stryker Mutator | Industry Tool | [stryker-mutator.io](https://stryker-mutator.io/) |
| PITest | Java Tool | [pitest.org](https://pitest.org/) |
| mutmut | Python Tool | [github.com/boxed/mutmut](https://github.com/boxed/mutmut) |

## When This Skill Applies

- User asks to "validate test quality" or "check test effectiveness"
- User mentions "mutation testing" or "mutation score"
- User wants to know if tests are "actually testing anything"
- High coverage but bugs still escaping
- Assessing test suite health
- Pre-release quality validation

## Trigger Phrases

| Natural Language | Action |
|------------------|--------|
| "Run mutation testing" | Execute mutation analysis |
| "Check if my tests are effective" | Run mutation + analyze |
| "Validate test quality" | Mutation score report |
| "Are my tests catching real bugs?" | Mutation analysis |
| "Find weak tests" | Identify low-score tests |
| "Why did this bug escape tests?" | Mutation analysis on module |

## Mutation Testing Concepts

### What is a Mutant?

A mutant is a small code change that should cause tests to fail:

```javascript
// Original
if (age >= 18) { return "adult"; }

// Mutant 1: Changed >= to >
if (age > 18) { return "adult"; }

// Mutant 2: Changed >= to ==
if (age == 18) { return "adult"; }

// Mutant 3: Changed "adult" to ""
if (age >= 18) { return ""; }
```

### Mutation Operators

| Operator | Example | Tests |
|----------|---------|-------|
| Arithmetic | `+` → `-` | Math operations |
| Relational | `>=` → `>` | Boundary conditions |
| Logical | `&&` → `\|\|` | Boolean logic |
| Literal | `true` → `false` | Constant handling |
| Return | `return x` → `return null` | Return value handling |

### Mutation Score

```
Mutation Score = (Killed Mutants / Total Mutants) × 100
```

| Score | Quality | Interpretation |
|-------|---------|----------------|
| 90%+ | Excellent | Tests are highly effective |
| 80-89% | Good | Target for production |
| 60-79% | Adequate | Room for improvement |
| <60% | Poor | Tests need significant work |

## Implementation Process

### 1. Detect Project and Resolve Tool

```python
def mutation_tool(project_type):
    if project_type == "javascript":
        return "stryker"
    elif project_type == "python":
        return "mutmut"
    elif project_type == "java":
        return "pitest"
```

Use the project's existing lockfile or approved dependency workflow. Record the
resolved tool and version in the evidence; do not install an unpinned tool as an
implicit side effect of this skill.

### 2. Configure Mutation Testing

**Stryker (JavaScript)**:
```json
// stryker.config.json
{
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts"],
  "testRunner": "vitest",
  "reporters": ["html", "progress"],
  "coverageAnalysis": "perTest",
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
```

**mutmut 3 (Python)**:
```toml
# pyproject.toml
[tool.mutmut]
source_paths = ["src/package/"]
only_mutate = ["src/package/critical_contract.py"]
pytest_add_cli_args = ["--no-cov", "-q"]
pytest_add_cli_args_test_selection = ["tests/test_critical_contract.py"]
mutate_only_covered_lines = true
```

Keep both `only_mutate` and the selected tests explicit. A directory-wide
fallback is not an acceptable substitute for a target that was selected to fit
the runtime budget.

**PITest (Java)**:
```xml
<!-- pom.xml -->
<plugin>
    <groupId>org.pitest</groupId>
    <artifactId>pitest-maven</artifactId>
    <version>1.15.0</version>
    <configuration>
        <targetClasses>
            <param>com.example.*</param>
        </targetClasses>
        <mutationThreshold>80</mutationThreshold>
    </configuration>
</plugin>
```

### 3. Preflight Python Native Extensions

mutmut 3's covered-line mode runs coverage and stats in the same parent Python
process. Its coverage phase snapshots `sys.modules`, runs the selected tests,
then unloads every newly imported module. A later stats pass can re-import a
native extension that cannot safely be initialized twice. This is an upstream
mutmut boundary, not a killed/survived mutant and not evidence that the project
tests failed. See [mutmut #528](https://github.com/boxed/mutmut/issues/528).

Before any Python run with `mutate_only_covered_lines = true`, execute the
selected tests through the bundled subprocess probe:

```bash
python scripts/native_extension_preflight.py \
  --test-selection tests/test_critical_contract.py \
  --pytest-arg=--no-cov \
  --pytest-arg=-q \
  --mutation-target src/package/critical_contract.py \
  --estimated-mutants 120 \
  --max-children 4 \
  --runtime-budget-seconds 900 \
  --format json
```

The probe runs the test selection in a disposable subprocess and records native
modules imported after its pytest plugin loads. It never unloads or re-imports a
module. Use `--import-file` or `--import-module` for import-only checks when a
pytest selection is not yet available.

| Exit | Classification | Required action |
|------|----------------|-----------------|
| `0` | `preflight_safe` | Covered-line mode may proceed; preserve the report. |
| `2` | `harness_native_extension_reload_risk` | Do not run mutmut covered-line mode. Use only an allowed bounded fallback or a project-approved subprocess-isolated tool. |
| `3` | `project_test_or_import_failure` | Fix or clarify the direct project test/import failure before mutation testing. |
| `4` | `harness_preflight_timeout` | Reduce the selection or increase the explicitly approved preflight budget. |

Detection is conservative. A safe result proves only that this selected run did
not load a native extension after the probe boundary; change the selection or
environment and the preflight must be repeated.

#### Bounded mutmut fallback

When a native extension is found, the supported mutmut fallback is
`mutate_only_covered_lines = false`, but only when the JSON report says
`fallback.allowed: true`. The fallback gate requires all of:

- one or more explicit `--mutation-target` values matching `only_mutate`;
- an observed or tool-generated `--estimated-mutants` count (do not guess);
- the intended `--max-children` value;
- an explicit `--runtime-budget-seconds` value; and
- the conservative estimate
  `baseline_test_seconds × estimated_mutants ÷ max_children × 1.5` to fit the
  budget.

If any bound is missing or the estimate exceeds budget, shrink the mutation
target or use a project-approved mutation harness whose coverage and stats
phases start in fresh subprocesses. Never silently widen `only_mutate` to
compensate for disabling covered-line selection.

### 4. Run Mutation Analysis

```bash
# JavaScript
npx stryker run

# Python, only after the preflight decision is recorded
python -m mutmut run --max-children 4

# Java
mvn org.pitest:pitest-maven:mutationCoverage
```

### 5. Classify and Report Results

Keep harness/tool failures, direct project-test failures, and mutant outcomes in
separate fields. For an existing mutmut log, the preflight script can classify
known native reload signatures:

```bash
python scripts/native_extension_preflight.py \
  --classify-mutmut-log mutation-run.log \
  --format json
```

`Running stats` combined with `cannot load module more than once per process`,
`module functions cannot set METH_CLASS or METH_STATIC`, or a fatal segmentation
fault whose report lists extension modules is
`harness_tool_failure_native_extension_reload`. It must set
`counts_as_mutant_outcome: false`; do not compute a mutation score from that run.
`failed to collect stats` is supporting context, not a sufficient signature by
itself.
Only a direct test run that fails independently of the mutation harness is a
`project_test_failure`. Killed, survived, timeout, and no-tests results are
mutant outcomes only after preflight, baseline tests, stats collection, and the
mutation harness complete successfully.

```python
def parse_mutation_results(report_path):
    """Parse mutation testing report"""
    return {
        "execution_mode": "mutmut-covered-lines-preflight-safe",
        "harness_status": "passed",
        "project_test_status": "passed",
        "total_mutants": 150,
        "killed": 120,
        "survived": 25,
        "timeout": 5,
        "mutation_score": 80.0,
        "survivors": [
            {
                "file": "src/auth/validate.ts",
                "line": 45,
                "mutator": "RelationalOperator",
                "original": "age >= 18",
                "mutant": "age > 18",
                "status": "survived"
            }
            # ... more survivors
        ]
    }
```

## Output Format

```markdown
## Mutation Testing Report

**Module**: src/auth/
**Test Suite**: test/auth/
**Execution mode**: mutmut covered-line mode (native-extension preflight safe)
**Harness status**: passed
**Project baseline tests**: passed

### Summary

| Metric | Value |
|--------|-------|
| Total Mutants | 150 |
| Killed | 120 (80%) |
| Survived | 25 (17%) |
| Timeout | 5 (3%) |
| **Mutation Score** | **80%** |

### Status: PASSED (threshold: 80%)

### Survived Mutants (Highest Priority)

#### 1. `src/auth/validate.ts:45`
```diff
- if (age >= 18) { return "adult"; }
+ if (age > 18) { return "adult"; }
```
**Problem**: Boundary condition not tested
**Fix**: Add test case for `age = 18`

#### 2. `src/auth/login.ts:23`
```diff
- if (attempts < maxAttempts) { allow(); }
+ if (attempts <= maxAttempts) { allow(); }
```
**Problem**: Off-by-one boundary not tested
**Fix**: Add test for `attempts = maxAttempts`

### Recommended Test Improvements

1. **Add boundary tests** for `validate.ts` (3 survivors)
2. **Add error path tests** for `login.ts` (2 survivors)
3. **Test null/undefined cases** in `session.ts` (1 survivor)

### Coverage vs Mutation Score

| File | Line Coverage | Mutation Score | Gap |
|------|--------------|----------------|-----|
| validate.ts | 95% | 72% | 23% |
| login.ts | 88% | 85% | 3% |
| session.ts | 100% | 91% | 9% |

*High coverage with low mutation score indicates weak assertions*
```

## Integration with CI

### GitHub Actions Integration

```yaml
- name: Run mutation testing
  run: npx stryker run --reporters json

- name: Check mutation threshold
  run: |
    SCORE=$(jq '.metrics.mutationScore' reports/mutation/stryker-incremental.json)
    if (( $(echo "$SCORE < 80" | bc -l) )); then
      echo "::error::Mutation score $SCORE% below 80% threshold"
      exit 1
    fi
```

## Optimization Tips

### Incremental Mutation Testing

Only test changed code:
```bash
# Stryker incremental
npx stryker run --incremental

# PITest history
mvn pitest:mutationCoverage -DwithHistory
```

### Target Critical Modules First

```json
{
  "mutate": [
    "src/auth/**/*.ts",
    "src/payment/**/*.ts",
    "src/validation/**/*.ts"
  ]
}
```

## Related Skills

- `tdd-enforce` - Enforce test-first development
- `flaky-detect` - Identify unreliable tests
- `test-sync` - Maintain test-code alignment

## Script Reference

### mutation_runner.py
Run mutation testing for project:
```bash
python scripts/mutation_runner.py --module src/auth
```

### mutation_analyzer.py
Analyze and prioritize survivors:
```bash
python scripts/mutation_analyzer.py --report stryker-report.json
```

### native_extension_preflight.py

Run the isolated Python import/test preflight and emit machine-readable evidence:

```bash
python scripts/native_extension_preflight.py \
  --test-selection tests/test_critical_contract.py \
  --mutation-target src/package/critical_contract.py \
  --estimated-mutants 120 --max-children 4 \
  --runtime-budget-seconds 900 --format json
```

## References

- @$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/README.md — Testing quality addon overview
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/README.md — SDLC framework context for quality gates
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Measurable quality thresholds and gate criteria
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
