---
name: security-sentinel
version: 1.0.0
description: Continuous security monitoring with reactive scanning on file changes,
  deploys, and scheduled audits.
platforms:
- claude-code
- opencode
- warp
- openclaw
- codex
metadata:
  triggers:
  - run security scan
  - check for vulnerabilities
  - security audit
  scope: daemon
inputs:
- name: target
  type: path
  required: false
  description: File or directory to scan (defaults to project root)
  default: .
- name: severity
  type: enum
  values:
  - low
  - medium
  - high
  - critical
  default: medium
  description: Minimum severity threshold for reporting
hooks:
  on_file_write:
  - filter: '**/*.{ts,js,mjs,py,go,rs}'
    action: run_script
    script: scripts/scan-changed-file.sh
  on_deploy:
  - action: run_script
    script: scripts/post-deploy-scan.sh
  on_schedule:
  - cron: 0 */6 * * *
    action: run_script
    script: scripts/periodic-audit.sh
scripts:
  main: scripts/main.sh
  scan-changed-file: scripts/scan-changed-file.sh
  post-deploy-scan: scripts/post-deploy-scan.sh
  periodic-audit: scripts/periodic-audit.sh
manifest:
  category: security
  requires:
    bins:
    - node
  outputs:
  - type: report
    path: .aiwg/reports/security/
  composable_with:
  - quality-gate-watcher
---

# Security Sentinel

Continuous security monitoring behavior that reacts to code changes, deployments, and runs scheduled audits.

## When Triggered via NLP

Run a full security scan against the specified target directory. Report findings categorized by severity. Output structured JSON to `.aiwg/reports/security/`.

## When Triggered via Hooks

### on_file_write (source code changes)

Perform a lightweight scan of the changed file:
- Check for hardcoded secrets, tokens, or API keys
- Detect common vulnerability patterns (SQL injection, XSS, command injection)
- Flag files that import sensitive modules without proper guards

### on_deploy

Run a comprehensive post-deployment security validation:
- Verify no secrets in the deployed artifact
- Check dependency versions against known CVE databases
- Validate file permissions and ownership

### on_schedule (every 6 hours)

Periodic full audit:
- Scan all source files for security patterns
- Check `package-lock.json` / `yarn.lock` for vulnerable dependencies
- Generate a summary report with trend data
