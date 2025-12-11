# SDLC Extensions Evaluation Plan

## Overview

This document defines the evaluation criteria, test scenarios, and quality gates for the language/platform-specific SDLC extensions.

## Extensions Covered

| Extension | Type | Skills | Agents |
|-----------|------|--------|--------|
| Python | Language | 6 | 1 |
| JavaScript | Language | 5 | 1 |
| GitHub | Platform | 5 | 1 |

## Research Compliance Validation

Each extension skill must demonstrate compliance with:

- **REF-001**: Production-Grade Agentic Workflows
- **REF-002**: LLM Failure Modes in Agentic Scenarios

### Python Extension Compliance

| Skill | Archetype 1 | Archetype 2 | Archetype 3 | Archetype 4 |
|-------|-------------|-------------|-------------|-------------|
| pytest-runner | ☐ | ☐ | ☐ | ☐ |
| venv-manager | ☐ | ☐ | ☐ | ☐ |
| pip-auditor | ☐ | ☐ | ☐ | ☐ |
| pylint-checker | ☐ | ☐ | ☐ | ☐ |
| mypy-validator | ☐ | ☐ | ☐ | ☐ |
| poetry-manager | ☐ | ☐ | ☐ | ☐ |

### JavaScript Extension Compliance

| Skill | Archetype 1 | Archetype 2 | Archetype 3 | Archetype 4 |
|-------|-------------|-------------|-------------|-------------|
| vitest-runner | ☐ | ☐ | ☐ | ☐ |
| eslint-checker | ☐ | ☐ | ☐ | ☐ |
| typescript-validator | ☐ | ☐ | ☐ | ☐ |
| npm-auditor | ☐ | ☐ | ☐ | ☐ |
| bundle-analyzer | ☐ | ☐ | ☐ | ☐ |

### GitHub Extension Compliance

| Skill | Archetype 1 | Archetype 2 | Archetype 3 | Archetype 4 |
|-------|-------------|-------------|-------------|-------------|
| repo-analyzer | ☐ | ☐ | ☐ | ☐ |
| pr-reviewer | ☐ | ☐ | ☐ | ☐ |
| actions-checker | ☐ | ☐ | ☐ | ☐ |
| issue-tracker | ☐ | ☐ | ☐ | ☐ |
| release-manager | ☐ | ☐ | ☐ | ☐ |

## Python Extension Evaluation

### pytest-runner Scenarios

**Test Case PY-001: Basic Test Execution**
```
Input: Python project with pytest
Expected: Test results with pass/fail counts
Grounding: venv activated, pytest installed
Recovery: Handle missing dependencies gracefully
```

**Test Case PY-002: Coverage Report**
```
Input: Tests with coverage flag
Expected: Coverage report in multiple formats
Grounding: pytest-cov installed
Recovery: Skip coverage if not available
```

### venv-manager Scenarios

**Test Case VM-001: Create Virtual Environment**
```
Input: Project directory
Expected: venv/ created with correct Python
Grounding: Python version confirmed
Recovery: Handle creation failures
```

**Test Case VM-002: Dependency Installation**
```
Input: requirements.txt
Expected: All packages installed
Grounding: pip upgraded first
Recovery: Report failed packages
```

## JavaScript Extension Evaluation

### vitest-runner Scenarios

**Test Case JS-001: Basic Test Execution**
```
Input: TypeScript project with Vitest
Expected: Test results with pass/fail counts
Grounding: node_modules present
Recovery: Handle missing dependencies
```

**Test Case JS-002: Coverage Report**
```
Input: Tests with coverage flag
Expected: Coverage report generated
Grounding: v8 coverage available
Recovery: Skip if not configured
```

### eslint-checker Scenarios

**Test Case ES-001: Lint Execution**
```
Input: TypeScript source files
Expected: Lint results with error/warning counts
Grounding: ESLint config validated
Recovery: Handle config errors
```

**Test Case ES-002: Auto-Fix**
```
Input: Files with fixable issues
Expected: Issues fixed, report generated
Grounding: User confirmation for --fix
Recovery: No destructive changes without approval
```

## GitHub Extension Evaluation

### repo-analyzer Scenarios

**Test Case GH-001: Repository Analysis**
```
Input: GitHub repository URL
Expected: Structure analysis, health report
Grounding: gh CLI authenticated
Recovery: Handle API rate limits
```

**Test Case GH-002: Private Repository**
```
Input: Private repo URL
Expected: Analysis with proper auth
Grounding: Token permissions verified
Recovery: Clear error on auth failure
```

### pr-reviewer Scenarios

**Test Case PR-001: PR Review**
```
Input: PR number
Expected: Review with findings, suggestions
Grounding: PR exists, user has access
Recovery: Handle large diffs gracefully
```

**Test Case PR-002: Security Scan**
```
Input: PR with potential vulnerabilities
Expected: Security issues flagged
Escalation: User decision on blocking issues
Recovery: Continue review if scan fails
```

## Quality Gates

### Gate 1: Extension Structure

- [ ] extension.json valid
- [ ] All declared skills exist
- [ ] Agent orchestrator present
- [ ] Templates defined (if any)

### Gate 2: Skill Structure

- [ ] SKILL.md follows template
- [ ] Grounding checkpoint present
- [ ] Recovery protocol defined
- [ ] Context scope documented

### Gate 3: Research Compliance

- [ ] BP-4 Single Responsibility
- [ ] BP-9 KISS principle
- [ ] All 4 archetypes addressed
- [ ] Uncertainty escalation clear

### Gate 4: Integration Testing

- [ ] Orchestrator coordinates skills
- [ ] Cross-skill data flow works
- [ ] Checkpoint handoff successful
- [ ] Recovery cascade works

## Test Execution Matrix

### Python Extension

```bash
# Setup
python3 -m venv test_venv
source test_venv/bin/activate
pip install pytest pytest-cov pylint mypy

# Tests
pytest tests/ -v --cov=src
pylint src/ --output-format=json
mypy src/ --json-report
```

### JavaScript Extension

```bash
# Setup
npm install

# Tests
npx vitest run --coverage
npx eslint src/ --format json
npx tsc --noEmit
```

### GitHub Extension

```bash
# Setup
gh auth status

# Tests
gh repo view owner/repo --json name,languages
gh pr view 42 --json title,files,status
gh run list --limit 10
```

## CI/CD Integration

```yaml
# .github/workflows/extension-evaluation.yml
name: Extension Evaluation
on: [push, pull_request]

jobs:
  python-extension:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Validate Extension
        run: |
          test -f "agentic/code/frameworks/sdlc-complete/extensions/python/extension.json"
          for skill in pytest-runner venv-manager; do
            test -f "agentic/code/frameworks/sdlc-complete/extensions/python/skills/$skill/SKILL.md"
          done

  javascript-extension:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Validate Extension
        run: |
          test -f "agentic/code/frameworks/sdlc-complete/extensions/javascript/extension.json"
          for skill in vitest-runner eslint-checker; do
            test -f "agentic/code/frameworks/sdlc-complete/extensions/javascript/skills/$skill/SKILL.md"
          done

  github-extension:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Extension
        run: |
          test -f "agentic/code/frameworks/sdlc-complete/extensions/github/extension.json"
          for skill in repo-analyzer pr-reviewer; do
            test -f "agentic/code/frameworks/sdlc-complete/extensions/github/skills/$skill/SKILL.md"
          done
```

## Metrics

### Extension Quality Score

```
Structure (30 points)
- extension.json valid: 10
- All skills present: 10
- Agent present: 5
- Templates present: 5

Skills (40 points)
- SKILL.md per skill: 10
- Grounding checkpoints: 10
- Recovery protocols: 10
- Context scopes: 10

Integration (30 points)
- Orchestrator functional: 15
- Cross-skill flow: 10
- Checkpoint support: 5

Total: 100 points
PASS: ≥80 | WARN: 60-79 | FAIL: <60
```

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-15 | Initial evaluation plan |
