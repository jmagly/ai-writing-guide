---
name: build-monitor
version: 1.0.0
description: Track build health by monitoring build tool completions and running scheduled
  build checks.
platforms:
- claude-code
- opencode
- warp
- openclaw
- codex
metadata:
  triggers:
  - monitor build
  - check build health
  - build status
  scope: daemon
inputs:
- name: command
  type: string
  required: false
  description: Build command to run
  default: npm run build
hooks:
  on_tool_complete:
  - tool: build
    action: run_script
    script: scripts/post-build-check.sh
  - tool: tsc
    action: run_script
    script: scripts/post-build-check.sh
  on_schedule:
  - cron: 0 */4 * * *
    action: run_script
    script: scripts/scheduled-build.sh
scripts:
  main: scripts/main.sh
  post-build-check: scripts/post-build-check.sh
  scheduled-build: scripts/scheduled-build.sh
manifest:
  category: build
  requires:
    bins:
    - node
  outputs:
  - type: report
    path: .aiwg/reports/build/
  composable_with:
  - test-watcher
---

# Build Monitor

Track build health by reacting to build tool completions and running periodic build verification.

## When Triggered via NLP

Run the build command and report success/failure with diagnostics. Output build metrics (duration, warnings, errors) to `.aiwg/reports/build/`.

## When Triggered via Hooks

### on_tool_complete (build, tsc)

After a build or TypeScript compilation completes, validate the output:
- Check for new warnings introduced
- Verify output artifact sizes haven't grown unexpectedly
- Log build duration for trend tracking

### on_schedule (every 4 hours)

Run a clean build from scratch to detect environmental drift or dependency issues that incremental builds miss.
