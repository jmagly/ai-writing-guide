# regression-auto-baseline

Automatically manage regression test baseline lifecycle with triggers for releases, deployments, and quality gates.

## Triggers

- "auto-update baselines"
- "automatic baseline management"
- "baseline on release"
- "update baseline after merge"
- "schedule baseline updates"
- "baseline lifecycle"

## Purpose

This skill automates regression baseline management by:
- Triggering baseline updates on semantic version tags
- Updating baselines after successful merges to main/master
- Creating baselines on deployment success
- Scheduling periodic baseline refreshes
- Managing baseline retention and archival
- Validating baseline quality before activation
- Integrating with CI/CD for seamless automation

## Behavior

When triggered or activated automatically, this skill:

1. **Detects trigger conditions**:
   - Semantic version tag created (v*.*.*)
   - Merge to protected branch completed
   - Deployment succeeded to environment
   - Quality gate passed
   - Manual approval received
   - Scheduled time reached

2. **Validates pre-conditions**:
   - Tests are passing (minimum threshold met)
   - No critical issues open
   - Quality gates passed
   - Human approval obtained (if required)
   - No concurrent baseline updates in progress

3. **Captures new baseline**:
   - Run full regression test suite
   - Capture all artifact types (functional, visual, performance, API)
   - Verify baseline stability (run multiple times if configured)
   - Generate checksums for integrity
   - Tag with git commit, release version, timestamp

4. **Validates baseline quality**:
   - Compare to previous baseline
   - Detect unexpected changes
   - Verify all expected outputs present
   - Check for baseline drift
   - Flag suspicious differences for review

5. **Activates baseline**:
   - Archive previous baseline version
   - Set new baseline as active
   - Update baseline manifest
   - Notify relevant teams
   - Create baseline comparison report

6. **Manages lifecycle**:
   - Archive old baselines per retention policy
   - Compress large baselines
   - Upload to cloud storage if configured
   - Prune outdated baselines
   - Maintain audit trail

## Trigger Types

### Semantic Version Tag

```yaml
trigger:
  type: git_tag
  pattern: "^v[0-9]+\\.[0-9]+\\.[0-9]+$"
  description: "Baseline on semantic version tags"

  behavior:
    on_tag_create:
      - validate_tag_format
      - check_if_tests_passing
      - create_baseline:
          name: "release-{tag}"
          auto_activate: true
      - tag_baseline_with_git_tag

  example:
    tag: v2.1.0
    baseline_id: release-v2.1.0
    status: auto-created
```

### Merge to Main

```yaml
trigger:
  type: git_merge
  branches:
    - main
    - master
  description: "Baseline after merge to protected branch"

  behavior:
    on_merge_complete:
      - wait_for_ci_success
      - check_test_pass_rate:
          minimum: 95%
      - create_baseline:
          name: "main-{commit_short}"
          auto_activate: false  # Require approval
      - request_approval:
          approvers: [tech-lead, test-lead]

  example:
    merge_commit: abc123def
    baseline_id: main-abc123d
    approval_required: true
```

### Deployment Success

```yaml
trigger:
  type: deployment
  environments:
    - production
    - staging
  description: "Baseline after successful deployment"

  behavior:
    on_deployment_success:
      - wait_for_smoke_tests
      - verify_health_checks
      - create_baseline:
          name: "{environment}-{deploy_id}"
          auto_activate: true
      - link_to_deployment:
          id: deploy_id
          timestamp: deployment_timestamp

  example:
    environment: production
    deploy_id: prod-2026-01-28-01
    baseline_id: production-prod-2026-01-28-01
```

### Manual Approval

```yaml
trigger:
  type: manual
  description: "Baseline after explicit human approval"

  behavior:
    on_approval_received:
      - validate_approver_permissions
      - capture_approval_metadata
      - create_baseline:
          name: "approved-{timestamp}"
          auto_activate: true
      - record_approver:
          name: approver_name
          reason: approval_reason

  example:
    approver: tech-lead
    reason: "Post-release validation complete"
    baseline_id: approved-2026-01-28T15-30
```

### Scheduled Updates

```yaml
trigger:
  type: schedule
  description: "Baseline on fixed schedule"

  schedules:
    nightly:
      cron: "0 2 * * *"
      description: "Nightly baseline capture"
      auto_activate: false

    weekly:
      cron: "0 3 * * 0"
      description: "Weekly baseline for long-term tracking"
      auto_activate: false

    monthly:
      cron: "0 4 1 * *"
      description: "Monthly baseline archive"
      auto_activate: false

  behavior:
    on_schedule_trigger:
      - check_if_tests_healthy
      - create_baseline:
          name: "{schedule}-{date}"
          auto_activate: false
      - generate_drift_report
```

## Baseline Storage Strategies

### Local File Storage

```yaml
storage:
  type: local
  location: .aiwg/testing/baselines/
  structure:
    - functional/
    - visual/
    - performance/
    - api/

  retention:
    active: 1        # Keep 1 active baseline per type
    archive: 10      # Keep 10 archived versions
    compress: true   # Compress archives with gzip

  cleanup:
    prune_after_days: 90
    keep_tagged: true  # Never prune tagged baselines
```

### Git LFS

```yaml
storage:
  type: git_lfs
  description: "Use Git LFS for large baselines (screenshots, large JSON)"

  configuration:
    track_patterns:
      - "*.png"
      - "*.jpg"
      - "baselines/**/*.json"
    max_file_size: 10MB

  behavior:
    on_baseline_create:
      - compress_if_needed
      - add_to_git_lfs
      - commit_with_metadata
```

### Cloud Storage (S3/GCS)

```yaml
storage:
  type: cloud
  provider: s3  # or gcs, azure_blob

  configuration:
    bucket: my-project-baselines
    path_prefix: baselines/{environment}/
    encryption: AES256

  behavior:
    on_baseline_create:
      - upload_to_cloud
      - generate_signed_url:
          expiry: 7 days
      - store_url_in_manifest
      - keep_local_copy: false  # Optional: delete after upload

  retention:
    lifecycle_policy:
      - after_30_days: transition_to_infrequent_access
      - after_90_days: transition_to_glacier
      - after_365_days: delete
```

### Artifact Registry

```yaml
storage:
  type: artifact_registry
  description: "Integrate with artifact registries (npm, Maven, Docker)"

  configuration:
    registry_url: https://registry.example.com
    repository: baseline-artifacts
    versioning: semver  # Follow package versioning

  behavior:
    on_baseline_create:
      - package_baseline:
          format: tarball
          name: "{project}-baseline"
          version: "{tag_version}"
      - publish_to_registry
      - tag_as_latest: true
```

## Baseline Validation

### Pre-Activation Checks

```yaml
validation:
  before_activation:
    - test_pass_rate:
        minimum: 95%
        description: "At least 95% of tests must pass"

    - quality_gates:
        all_must_pass: true
        description: "All quality gates must be green"

    - stability_check:
        runs: 3
        consistency: 100%
        description: "Baseline must be 100% consistent across 3 runs"

    - critical_issues:
        max_open: 0
        description: "No critical issues can be open"

    - human_approval:
        required_for:
          - production_baselines
          - breaking_changes
        approvers: [tech-lead, qa-lead]
```

### Baseline Diff Detection

```yaml
validation:
  diff_detection:
    compare_to_previous: true
    flag_changes:
      - new_failures
      - performance_degradation
      - unexpected_schema_changes
      - visual_differences

    severity_classification:
      critical:
        - new_test_failures
        - security_regressions
      high:
        - performance_degradation_gt_20_percent
        - breaking_api_changes
      medium:
        - new_warnings
        - minor_visual_differences
      low:
        - timestamp_changes
        - non-functional_metadata

    action_on_critical:
      - block_activation
      - notify_stakeholders
      - require_manual_review
```

## Environment-Specific Baselines

```yaml
environments:
  development:
    auto_baseline: true
    trigger: merge_to_develop
    retention: 5
    approval_required: false

  staging:
    auto_baseline: true
    trigger: deployment_success
    retention: 10
    approval_required: true
    approvers: [qa-lead]

  production:
    auto_baseline: true
    trigger: semantic_version_tag
    retention: 20
    approval_required: true
    approvers: [tech-lead, release-manager]
    validation_level: strict
```

## Selective Baseline Updates

```yaml
selective_updates:
  description: "Update only specific baseline types"

  update_policies:
    functional:
      trigger: every_merge
      auto_activate: true

    visual:
      trigger: design_system_update
      auto_activate: false
      require_approval: true

    performance:
      trigger: weekly
      auto_activate: false
      threshold_change: 10%  # Only update if >10% improvement

    api:
      trigger: version_tag
      auto_activate: true
      breaking_changes_require_approval: true
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
# .github/workflows/auto-baseline.yml

name: Auto-Baseline Management

on:
  push:
    tags:
      - 'v*.*.*'
  workflow_dispatch:
    inputs:
      baseline_type:
        description: 'Baseline type to update'
        required: true
        type: choice
        options:
          - all
          - functional
          - visual
          - performance
          - api

jobs:
  auto_baseline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run tests and capture baseline
        run: |
          npm test -- --coverage
          npm run test:integration
          npm run test:e2e

      - name: Create baseline
        run: |
          npx aiwg baseline create auto-${GITHUB_REF_NAME} \
            --type all \
            --tag ${GITHUB_REF_NAME} \
            --auto-activate

      - name: Upload to S3
        run: |
          aws s3 sync .aiwg/testing/baselines/ \
            s3://my-baselines/baselines/${GITHUB_REF_NAME}/

      - name: Update manifest
        run: |
          git add .aiwg/testing/baselines/manifest.yaml
          git commit -m "chore: update baseline for ${GITHUB_REF_NAME}"
          git push
```

### GitLab CI Example

```yaml
# .gitlab-ci.yml

baseline_on_release:
  stage: deploy
  only:
    - tags
  script:
    - npm test
    - npx aiwg baseline create release-${CI_COMMIT_TAG}
    - npx aiwg baseline upload --storage s3
  artifacts:
    paths:
      - .aiwg/testing/baselines/
    expire_in: 30 days
```

## Conflict Resolution

### Concurrent Baseline Updates

```yaml
concurrency_control:
  mode: lock_file
  lock_file: .aiwg/testing/baselines/.lock

  on_conflict:
    - check_lock_file
    - if_locked:
        wait_timeout: 300  # 5 minutes
        action_on_timeout: fail_with_message

  distributed_lock:
    enabled: true
    backend: redis
    key: "baseline_update_lock"
    ttl: 600  # 10 minutes
```

### Merge Conflicts

```yaml
merge_strategy:
  on_baseline_conflict:
    - prefer: newer_timestamp
    - fallback: manual_resolution

  resolution_workflow:
    - detect_conflict
    - preserve_both_baselines
    - notify_team_for_manual_merge
    - provide_diff_comparison
```

## Baseline Rollback

```yaml
rollback:
  enabled: true
  preserve_rollback_history: true

  rollback_triggers:
    - manual_command
    - quality_regression_detected
    - deployment_failure

  rollback_process:
    - identify_previous_baseline
    - validate_previous_baseline_integrity
    - deactivate_current_baseline
    - activate_previous_baseline
    - update_manifest
    - notify_stakeholders
    - record_rollback_reason

  example:
    current: baseline-v2.1.0
    rollback_to: baseline-v2.0.5
    reason: "Critical regression in v2.1.0"
    triggered_by: tech-lead
```

## Baseline Diff Reports

```markdown
# Baseline Diff Report

**Date**: 2026-01-28
**Previous Baseline**: functional-auth-v2
**New Baseline**: functional-auth-v3
**Trigger**: semantic_version_tag v2.1.0

## Executive Summary

**Changes Detected**: 12 differences
**Severity**: Medium
**Recommendation**: Approve with review of API changes

| Category | Previous | New | Change |
|----------|----------|-----|--------|
| Tests Passing | 45/45 | 47/47 | +2 new tests |
| Functional Outputs | 100% match | 98% match | 2 API changes |
| Performance | Baseline | +5% faster | Improvement |
| Visual | Baseline | 100% match | No change |

## Detailed Changes

### Functional Changes

#### Change 1: New field in login response

**Type**: API Schema Change
**Severity**: Medium - Breaking for strict clients

**Previous** (baseline-v2):
```json
{
  "token": "jwt.header.payload",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**New** (baseline-v3):
```json
{
  "token": "jwt.header.payload",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe"
  }
}
```

**Impact**: Clients using strict schema validation may fail
**Recommendation**: Document as breaking change in CHANGELOG

#### Change 2: Error message improved

**Type**: Error Message Update
**Severity**: Low - Informational

**Previous**:
```
Error: Invalid input
```

**New**:
```
ValidationError: Email format is invalid. Expected format: user@example.com
```

**Impact**: Better user experience, non-breaking
**Recommendation**: Approve

## Performance Changes

| Metric | Previous | New | Change | Status |
|--------|----------|-----|--------|--------|
| Login p50 | 45ms | 42ms | -7% | ✅ Improved |
| Login p95 | 120ms | 115ms | -4% | ✅ Improved |
| Registration p50 | 85ms | 80ms | -6% | ✅ Improved |

## New Tests Added

1. `test/auth/display-name-validation.test.ts`
   - Tests display name field validation
   - Covers new feature

2. `test/auth/error-message-quality.test.ts`
   - Tests improved error messaging
   - Regression test for clarity

## Recommendations

### Immediate Actions

- [ ] Review API schema change for breaking impact
- [ ] Update API documentation with new field
- [ ] Notify API consumers via changelog
- [ ] Approve baseline if change is intentional

### Follow-up

- [ ] Add versioning to API if not present
- [ ] Consider deprecation period for schema changes
- [ ] Update client SDKs with new field

## Approval

To approve this baseline:

```bash
aiwg baseline approve functional-auth-v3 \
  --reviewed-by "tech-lead" \
  --reason "API schema change documented and approved"
```

To reject and rollback:

```bash
aiwg baseline rollback functional-auth-v3 \
  --to functional-auth-v2 \
  --reason "Breaking change not acceptable"
```
```

## Usage Examples

### Auto-Baseline on Release Tag

```
Event: Git tag v2.1.0 created

Skill activates automatically:
1. Detect tag creation event
2. Wait for CI to complete
3. Check test pass rate: 100% (45/45)
4. Run baseline capture
5. Validate baseline stability (3 runs)
6. Compare to previous baseline
7. Generate diff report

Output:
"Auto-Baseline Created: release-v2.1.0

Trigger: Git tag v2.1.0
Previous: release-v2.0.5
Changes: 3 API fields added, 2 tests added
Quality: 100% tests passing
Stability: 100% consistent (3/3 runs)

Status: Pending approval
Approvers: tech-lead, release-manager

Diff report: .aiwg/testing/baseline-diff-v2.1.0.md

Approve with:
  aiwg baseline approve release-v2.1.0"
```

### Auto-Baseline on Merge to Main

```
Event: PR #456 merged to main

Skill activates:
1. Detect merge event
2. Wait for CI success
3. Check test pass rate: 98% (44/45) - 1 flaky test
4. Decision: Pass rate below 100%, require approval

Output:
"Auto-Baseline Blocked: main-abc123d

Trigger: Merge to main (commit abc123d)
Test pass rate: 98% (44/45)
Reason: 1 test flaky, below 100% threshold

Action required:
- Stabilize flaky test: test/api/timeout.test.ts
- Re-run baseline after fix

Or override with:
  aiwg baseline create main-abc123d \
    --force \
    --approved-by tech-lead \
    --reason 'Known flaky test acceptable'"
```

### Scheduled Weekly Baseline

```
Event: Weekly schedule (Sunday 3 AM)

Skill activates:
1. Detect schedule trigger
2. Run full test suite
3. Capture baseline: weekly-2026-01-28
4. Compare to last week
5. Generate drift report

Output:
"Weekly Baseline Created: weekly-2026-01-28

Previous: weekly-2026-01-21
Drift: Minimal (0.2% performance improvement)
New tests: 3 added
Test health: 100% passing

Auto-activated: No (scheduled baselines require approval)

Drift report: .aiwg/testing/weekly-drift-2026-01-28.md

Review and approve:
  aiwg baseline review weekly-2026-01-28"
```

## Integration

This skill uses:
- `regression-baseline`: Core baseline creation and comparison
- `regression-bisect`: Find commits that changed baseline
- `regression-metrics`: Track baseline drift over time
- `test-coverage`: Ensure baseline captures critical paths
- `issue-auto-sync`: Create issues for baseline approval
- `project-awareness`: Detect CI/CD configuration

## Agent Orchestration

```yaml
agents:
  baseline_creation:
    agent: test-engineer
    focus: Capture and validate baseline

  diff_analysis:
    agent: test-architect
    focus: Analyze baseline changes

  approval:
    agent: tech-lead
    focus: Review and approve baselines

  automation:
    agent: devops-engineer
    focus: CI/CD integration
```

## Configuration

### Auto-Baseline Rules

```yaml
# aiwg.yml

regression:
  auto_baseline:
    enabled: true

    triggers:
      semantic_version_tag:
        enabled: true
        pattern: "^v[0-9]+\\.[0-9]+\\.[0-9]+$"
        auto_activate: false
        approval_required: true

      merge_to_main:
        enabled: true
        branches: [main, master]
        auto_activate: false
        test_pass_threshold: 100%

      deployment_success:
        enabled: true
        environments: [production, staging]
        auto_activate: true

      scheduled:
        enabled: true
        nightly:
          cron: "0 2 * * *"
          auto_activate: false
        weekly:
          cron: "0 3 * * 0"
          auto_activate: false

    validation:
      minimum_test_pass_rate: 95%
      stability_runs: 3
      require_human_approval_for:
        - production_baselines
        - breaking_changes
        - critical_severity_changes

    storage:
      primary: local
      backup: s3
      retention:
        active: 1
        archive: 10
        compress: true

    notifications:
      on_baseline_created: [slack, email]
      on_approval_needed: [slack, issue_comment]
      on_baseline_activated: [slack]
```

### Retention Policy

```yaml
retention:
  by_tag:
    release_tags: keep_forever
    development_tags: 30_days
    untagged: 7_days

  by_environment:
    production: 365_days
    staging: 90_days
    development: 30_days

  by_type:
    functional: 90_days
    visual: 60_days
    performance: 120_days
    api: 90_days

  compression:
    after_days: 7
    algorithm: gzip
    keep_uncompressed: false
```

## Notification Templates

### Baseline Created

```
📸 Auto-Baseline Created

Baseline: {baseline_id}
Trigger: {trigger_type}
Environment: {environment}
Status: {status}

Changes from previous:
• {change_count} differences detected
• Severity: {max_severity}

Diff report: {diff_report_url}

{approval_required ? "Approval required from: {approvers}" : "Auto-activated"}
```

### Approval Needed

```
⚠️ Baseline Approval Required

Baseline: {baseline_id}
Reason: {approval_reason}

Changes:
{change_summary}

Review:
{diff_report_url}

Approve:
aiwg baseline approve {baseline_id} --reason "..."

Reject:
aiwg baseline reject {baseline_id} --reason "..."

Expires: {approval_timeout}
```

### Baseline Activated

```
✅ Baseline Activated

Baseline: {baseline_id}
Activated at: {activation_timestamp}
Replaces: {previous_baseline_id}

This baseline is now active for regression testing.

All future test runs will be compared against this baseline.
```

## Output Locations

- Baselines: `.aiwg/testing/baselines/{type}/`
- Manifest: `.aiwg/testing/baselines/manifest.yaml`
- Diff reports: `.aiwg/testing/baseline-diffs/`
- Approval requests: `.aiwg/testing/baseline-approvals/`
- Archive: `.aiwg/testing/baselines/archive/`
- Locks: `.aiwg/testing/baselines/.lock`

## References

- @agentic/code/frameworks/sdlc-complete/skills/regression-baseline/SKILL.md - Manual baseline creation
- @agentic/code/frameworks/sdlc-complete/skills/regression-bisect/SKILL.md - Find breaking commits
- @agentic/code/frameworks/sdlc-complete/skills/regression-metrics/SKILL.md - Baseline drift tracking
- @agentic/code/frameworks/sdlc-complete/schemas/testing/regression.yaml - Regression schema
- @agentic/code/frameworks/sdlc-complete/commands/regression-check.md - Regression testing command
- @agentic/code/frameworks/sdlc-complete/agents/test-engineer.md - Test Engineer agent
- @.claude/rules/executable-feedback.md - Executable feedback rules
