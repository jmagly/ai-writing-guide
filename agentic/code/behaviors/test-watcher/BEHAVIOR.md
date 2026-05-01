---
name: test-watcher
version: 1.0.0
description: Reactive test execution that runs tests on file changes and on a schedule.
platforms:
- claude-code
- opencode
- warp
- openclaw
- codex
metadata:
  triggers:
  - watch tests
  - run tests on change
  - test watcher
  scope: daemon
inputs:
- name: pattern
  type: string
  required: false
  description: Test file pattern to watch
  default: test/**
- name: runner
  type: enum
  values:
  - npm
  - vitest
  - jest
  - pytest
  default: npm
  description: Test runner to use
hooks:
  on_file_write:
  - filter: src/**/*.{ts,js,mjs}
    action: run_script
    script: scripts/run-related-tests.sh
  - filter: test/**/*.{ts,js,mjs}
    action: run_script
    script: scripts/run-changed-test.sh
  on_schedule:
  - cron: 0 */2 * * *
    action: run_script
    script: scripts/full-suite.sh
scripts:
  main: scripts/main.sh
  run-related-tests: scripts/run-related-tests.sh
  run-changed-test: scripts/run-changed-test.sh
  full-suite: scripts/full-suite.sh
manifest:
  category: testing
  requires:
    bins:
    - node
  outputs:
  - type: report
    path: .aiwg/reports/testing/
  composable_with:
  - quality-gate-watcher
---

# Test Watcher

Reactive test execution behavior. Watches for source and test file changes, runs the relevant tests, and reports results.

## When Triggered via NLP

Start watching for file changes and run related tests automatically. Report pass/fail status and coverage deltas.

## When Triggered via Hooks

### on_file_write (source files)

When a source file changes, identify and run tests that import or reference the changed module. Use file naming conventions (`foo.ts` -> `foo.test.ts`) and import graph analysis when available.

### on_file_write (test files)

When a test file changes, run that specific test file immediately.

### on_schedule (every 2 hours)

Run the full test suite and generate a coverage report to `.aiwg/reports/testing/`.
