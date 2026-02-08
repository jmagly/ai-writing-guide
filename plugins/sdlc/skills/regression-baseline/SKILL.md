# regression-baseline

Create and maintain regression test baselines for comparison and drift detection.

## Triggers

- "create regression baseline"
- "update baseline"
- "baseline the tests"
- "capture current state"
- "set new baseline"
- "baseline snapshot"

## Purpose

This skill manages regression baselines by:
- Capturing known-good system states as baselines
- Storing snapshots of expected outputs
- Maintaining versioned baseline history
- Comparing current state to baseline
- Detecting drift from established baselines
- Managing baseline updates and approvals

## Behavior

When triggered, this skill:

1. **Identifies baseline scope**:
   - Determine what to baseline (tests, outputs, performance)
   - Select baseline type (functional, visual, performance, API)
   - Identify affected components
   - Check for existing baselines

2. **Captures baseline data**:
   - Run tests and capture outputs
   - Take snapshots (visual, data, API responses)
   - Measure performance metrics
   - Record system configuration
   - Generate checksums/hashes

3. **Stores baseline**:
   - Version baseline with semantic versioning
   - Tag with git commit/release
   - Store in `.aiwg/testing/baselines/`
   - Update baseline manifest
   - Link to requirements/features

4. **Validates baseline quality**:
   - Ensure baseline is stable (run multiple times)
   - Verify baseline is reproducible
   - Check for known issues in baseline
   - Require approval for critical baselines

5. **Documents baseline**:
   - Record what is baselined
   - Note when and why baseline was created
   - Document known deviations
   - Link to issues/requirements

6. **Manages baseline lifecycle**:
   - Archive old baselines
   - Update baselines on intentional changes
   - Track baseline drift over time
   - Alert on excessive drift

## Baseline Types

### Functional Baseline

```yaml
functional_baseline:
  description: Expected behavior outputs
  scope: Unit and integration tests
  format: JSON snapshots

  capture:
    - test_outputs
    - assertions
    - mock_data
    - expected_errors

  example:
    test: "user registration"
    baseline: "baselines/functional/user-registration-v1.json"
    includes:
      - success_response_format
      - validation_error_messages
      - database_state_after_registration
```

### Visual Baseline

```yaml
visual_baseline:
  description: UI screenshots for visual regression
  scope: Frontend components
  format: PNG images with metadata

  capture:
    - component_screenshots
    - page_screenshots
    - responsive_breakpoints
    - interaction_states

  example:
    component: "LoginForm"
    baseline: "baselines/visual/login-form-v2.png"
    metadata:
      viewport: 1920x1080
      theme: dark
      state: default
```

### Performance Baseline

```yaml
performance_baseline:
  description: Performance benchmarks
  scope: API response times, load tests
  format: JSON metrics

  capture:
    - response_times_p50_p95_p99
    - throughput_requests_per_second
    - resource_utilization
    - database_query_times

  example:
    endpoint: "/api/users"
    baseline: "baselines/performance/api-users-v1.json"
    metrics:
      p50_response_time_ms: 45
      p95_response_time_ms: 120
      p99_response_time_ms: 250
      throughput_rps: 1000
```

### API Contract Baseline

```yaml
api_baseline:
  description: API request/response contracts
  scope: REST/GraphQL APIs
  format: OpenAPI/JSON schemas

  capture:
    - request_schemas
    - response_schemas
    - status_codes
    - headers

  example:
    endpoint: "POST /api/auth/login"
    baseline: "baselines/api/auth-login-v3.yaml"
    contract:
      request_body_schema: LoginRequest
      success_response: 200 with token
      error_responses: [400, 401, 429]
```

## Baseline Manifest

```yaml
# .aiwg/testing/baselines/manifest.yaml

baselines:
  - id: functional-auth-v1
    type: functional
    created: 2026-01-28T10:00:00Z
    created_by: test-engineer
    git_commit: abc123def
    release: v1.2.0
    scope: Authentication flows
    files:
      - baselines/functional/login-v1.json
      - baselines/functional/logout-v1.json
      - baselines/functional/register-v1.json
    status: active
    approved_by: tech-lead
    notes: Initial baseline for auth module

  - id: visual-dashboard-v2
    type: visual
    created: 2026-01-20T14:30:00Z
    created_by: frontend-engineer
    git_commit: def456ghi
    release: v1.1.0
    scope: Dashboard UI components
    files:
      - baselines/visual/dashboard-desktop-v2.png
      - baselines/visual/dashboard-mobile-v2.png
    status: active
    approved_by: design-lead
    previous_baseline: visual-dashboard-v1
    changes: Updated color scheme per design system v2

  - id: performance-api-v1
    type: performance
    created: 2026-01-15T09:00:00Z
    created_by: devops-engineer
    git_commit: ghi789jkl
    release: v1.0.0
    scope: Core API endpoints
    files:
      - baselines/performance/api-benchmarks-v1.json
    status: active
    approved_by: architect
    notes: Pre-optimization baseline
```

## Baseline Comparison Report

```markdown
# Baseline Comparison Report

**Date**: 2026-01-28
**Baseline**: functional-auth-v1
**Current State**: HEAD (commit xyz789)
**Comparison Type**: Functional

## Executive Summary

**Status**: ⚠️ Drift Detected
**Changes**: 3 outputs differ from baseline
**Severity**: Medium - Unexpected behavior changes

| Metric | Baseline | Current | Drift |
|--------|----------|---------|-------|
| Tests Passing | 45/45 | 43/45 | -2 |
| Output Matches | 100% | 93.3% | -6.7% |
| New Failures | 0 | 2 | +2 |

## Detailed Comparison

### Test: user-login

**Status**: ⚠️ Drift

**Baseline** (functional-auth-v1):
```json
{
  "status": 200,
  "body": {
    "token": "jwt.header.payload.signature",
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    }
  }
}
```

**Current**:
```json
{
  "status": 200,
  "body": {
    "token": "jwt.header.payload.signature",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"  // NEW FIELD
    }
  }
}
```

**Analysis**: New `name` field added to response
**Impact**: Breaking change for clients expecting exact schema
**Recommendation**: Update baseline if intentional, or fix if bug

### Test: user-registration-invalid-email

**Status**: ❌ Failure

**Baseline**:
```json
{
  "status": 400,
  "body": {
    "error": "Invalid email format"
  }
}
```

**Current**:
```json
{
  "status": 500,
  "body": {
    "error": "Internal server error"
  }
}
```

**Analysis**: Validation now returns 500 instead of 400
**Impact**: Critical - Server error on invalid input
**Recommendation**: Fix immediately - regression in error handling

### Test: user-logout

**Status**: ✅ Match

Output matches baseline exactly. No drift detected.

## Drift Summary

| Test | Status | Drift Type | Severity |
|------|--------|------------|----------|
| user-login | ⚠️ Drift | Schema change | Medium |
| user-registration | ✅ Match | None | - |
| user-registration-invalid | ❌ Fail | Error code | High |
| user-logout | ✅ Match | None | - |
| token-refresh | ✅ Match | None | - |

## Root Cause Analysis

### Likely Causes

1. **user-login drift**: Intentional feature addition (commit abc123)
   - PR #789: "Add user name to login response"
   - Needs baseline update

2. **invalid-email failure**: Unintentional regression
   - Validation middleware broken
   - Returns 500 instead of 400
   - Introduced in commit def456

## Recommendations

### Immediate Actions

- [ ] Fix validation error handling (returns 500 instead of 400)
- [ ] Add test for proper error codes
- [ ] Verify error handling across all validation

### Baseline Updates

- [ ] Update baseline for user-login if name field is intentional
- [ ] Document breaking change in API changelog
- [ ] Notify API consumers of schema change

### Process Improvements

- [ ] Require baseline review for API changes
- [ ] Add baseline diff to PR template
- [ ] Run baseline comparison in CI

## Approval Required

To update baseline with new outputs:

```bash
# Review changes
aiwg baseline compare functional-auth-v1

# Update if intentional
aiwg baseline update functional-auth-v1 \
  --approve-changes user-login \
  --justification "Added name field per REQ-123"

# Or create new baseline version
aiwg baseline create functional-auth-v2 \
  --based-on v1 \
  --changes "Added user name to login response"
```
```

## Usage Examples

### Create New Baseline

```
User: "Create baseline for authentication tests"

Skill executes:
1. Identify auth test suite
2. Run tests and capture outputs
3. Validate stability (run 3 times)
4. Store baseline with version
5. Update manifest

Output:
"Baseline Created: functional-auth-v1

Scope: Authentication tests (45 tests)
Format: JSON snapshots
Location: .aiwg/testing/baselines/functional/auth/

Files:
- login-v1.json
- logout-v1.json
- register-v1.json
- token-refresh-v1.json

Status: Active
Git Commit: abc123
Release: v1.2.0

Next: Baseline will be used for regression detection"
```

### Update Existing Baseline

```
User: "Update baseline for dashboard UI"

Skill checks current vs baseline:
"Comparing to visual-dashboard-v1:
- 5 screenshots differ
- Changes: Color scheme updated

Approve changes?
- dashboard-desktop.png
- dashboard-mobile.png
- widget-panel.png

Reason for update?"

User: "Design system v2 rollout"

Skill creates:
"Baseline Updated: visual-dashboard-v2

Previous: visual-dashboard-v1 (archived)
Changes: Design system v2 colors
Approved by: [current user]
Files updated: 5

New baseline active for regression tests"
```

### Compare to Baseline

```
User: "Compare current state to baseline"

Skill analyzes:
"Baseline Comparison: functional-auth-v1

Status: ⚠️ Drift Detected

Matches: 43/45 tests (95.6%)
Drifts: 2 tests show differences

Drift 1: user-login
  - New field 'name' in response
  - Severity: Medium
  - Likely intentional (commit abc123)

Drift 2: invalid-email handling
  - Returns 500 instead of 400
  - Severity: High
  - Likely regression (needs fix)

See full report: .aiwg/testing/baseline-comparison.md"
```

## Integration

This skill uses:
- `regression-bisect`: Find commits that broke baseline
- `regression-metrics`: Track baseline drift over time
- `test-coverage`: Ensure baselines cover critical paths
- `project-awareness`: Detect test framework and conventions

## Agent Orchestration

```yaml
agents:
  creation:
    agent: test-engineer
    focus: Baseline capture and validation

  analysis:
    agent: test-architect
    focus: Drift analysis and recommendations

  approval:
    agent: tech-lead
    focus: Baseline update approval
```

## Configuration

### Baseline Storage

```yaml
baseline_config:
  storage_path: .aiwg/testing/baselines/
  structure:
    - functional/
    - visual/
    - performance/
    - api/

  versioning: semantic  # v1, v2, v3
  compression: gzip     # for large baselines
  retention: 10         # keep last 10 versions
```

### Drift Thresholds

```yaml
drift_thresholds:
  functional:
    exact_match_required: true
    allow_new_fields: false  # strict schema matching

  visual:
    pixel_diff_threshold: 0.1%  # 0.1% difference allowed
    ignore_areas: [timestamp, dynamic-content]

  performance:
    p50_tolerance: 10%   # ±10% from baseline
    p95_tolerance: 15%   # ±15% from baseline
    p99_tolerance: 20%   # ±20% from baseline
```

### Approval Requirements

```yaml
approval_config:
  require_approval_for:
    - baseline_creation: true
    - baseline_updates: true
    - baseline_deletion: true

  approvers:
    - tech-lead
    - architect
    - test-lead

  approval_via:
    - pr_review
    - issue_comment
    - command_flag: --approved-by
```

## Output Locations

- Baselines: `.aiwg/testing/baselines/{type}/`
- Manifest: `.aiwg/testing/baselines/manifest.yaml`
- Comparisons: `.aiwg/testing/baseline-comparisons/`
- Archived: `.aiwg/testing/baselines/archive/`

## References

- @agentic/code/frameworks/sdlc-complete/schemas/test/baseline-schema.yaml
- @agentic/code/frameworks/sdlc-complete/commands/baseline-create.md
- @agentic/code/frameworks/sdlc-complete/agents/test-engineer.md
