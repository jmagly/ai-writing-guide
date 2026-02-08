# regression-cicd-hooks

Integrate regression testing into CI/CD pipelines with automated baseline comparison, merge blocking, and multi-platform support.

## Triggers

- "add regression checks to CI"
- "setup regression pipeline"
- "configure regression gates"
- "block merge on regression"
- "add pre-commit regression check"
- "integrate baseline tests with GitHub Actions"
- "setup regression for GitLab"

## Purpose

This skill automates regression detection in CI/CD workflows by:
- Integrating baseline comparisons into PR/MR pipelines
- Blocking merges when regressions detected
- Running regression checks on pre-commit hooks
- Supporting GitHub Actions, GitLab CI, and Gitea Actions
- Notifying teams of regression failures
- Storing baseline comparisons as pipeline artifacts

## Behavior

When triggered, this skill:

1. **Identifies CI/CD platform**:
   - Detect existing CI configuration (.github, .gitlab-ci.yml)
   - Determine platform (GitHub Actions, GitLab CI, Gitea Actions)
   - Check for existing regression checks
   - Identify project type and test framework

2. **Configures regression pipeline**:
   - Add regression stage to workflow
   - Configure baseline comparison step
   - Set up artifact storage for results
   - Configure merge blocking rules
   - Add notification channels

3. **Implements local pre-commit hook**:
   - Create `.git/hooks/pre-commit` script
   - Add fast regression pattern checks
   - Configure skip patterns for WIP commits
   - Link to full CI regression checks

4. **Sets up multi-environment baselines**:
   - Configure environment-specific baselines (dev, staging, prod)
   - Set regression thresholds per environment
   - Link baselines to git branches/releases
   - Configure baseline update workflow

5. **Adds notifications**:
   - Configure Slack/Discord/email alerts
   - Add regression report to PR/MR comments
   - Link to detailed comparison reports
   - Tag relevant stakeholders

6. **Documents workflow**:
   - Create regression CI documentation
   - Add troubleshooting guide
   - Document baseline update process
   - Include developer quick-start

## Platform Integrations

### GitHub Actions

```yaml
# .github/workflows/regression-check.yml

name: Regression Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  regression-baseline-check:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for baseline comparison

      - name: Setup environment
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Download baseline
        uses: actions/download-artifact@v4
        with:
          name: regression-baseline
          path: .aiwg/testing/baselines/
        continue-on-error: true  # First run may not have baseline

      - name: Run tests and capture output
        run: |
          npm test -- --json --outputFile=test-results.json
          npm run benchmark -- --json > performance-results.json

      - name: Compare to baseline
        id: regression-check
        run: |
          aiwg baseline compare functional-baseline \
            --current test-results.json \
            --output regression-report.md \
            --fail-on-regression

      - name: Upload regression report
        uses: actions/upload-artifact@v4
        with:
          name: regression-report
          path: regression-report.md
          retention-days: 30

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('regression-report.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Regression Check Results\n\n${report}`
            });

      - name: Block merge on regression
        if: steps.regression-check.outcome == 'failure'
        run: |
          echo "::error::Regression detected. See report for details."
          exit 1

  update-baseline:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup environment
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests and capture baseline
        run: |
          npm test -- --json --outputFile=baseline.json
          npm run benchmark -- --json > performance-baseline.json

      - name: Create baseline
        run: |
          aiwg baseline create functional-baseline \
            --from baseline.json \
            --git-commit ${{ github.sha }} \
            --release ${{ github.ref_name }}

      - name: Upload baseline
        uses: actions/upload-artifact@v4
        with:
          name: regression-baseline
          path: .aiwg/testing/baselines/
          retention-days: 90
```

### GitLab CI

```yaml
# .gitlab-ci.yml

stages:
  - test
  - regression
  - deploy

regression-check:
  stage: regression
  image: node:20
  timeout: 15 minutes

  script:
    # Download baseline from artifacts
    - apt-get update && apt-get install -y curl
    - |
      curl --location --output baseline.tar.gz \
        --header "PRIVATE-TOKEN: $CI_JOB_TOKEN" \
        "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/jobs/artifacts/main/download?job=baseline-update"
    - tar -xzf baseline.tar.gz || echo "No baseline found, first run"

    # Run tests
    - npm ci
    - npm test -- --json --outputFile=test-results.json

    # Compare to baseline
    - |
      aiwg baseline compare functional-baseline \
        --current test-results.json \
        --output regression-report.md \
        --fail-on-regression

    # Post to MR
    - |
      if [ "$CI_MERGE_REQUEST_IID" ]; then
        curl --request POST \
          --header "PRIVATE-TOKEN: $CI_JOB_TOKEN" \
          --data "body=$(cat regression-report.md)" \
          "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/notes"
      fi

  artifacts:
    reports:
      junit: test-results.json
    paths:
      - regression-report.md
    expire_in: 30 days

  rules:
    - if: $CI_MERGE_REQUEST_ID
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

baseline-update:
  stage: deploy
  image: node:20

  script:
    - npm ci
    - npm test -- --json --outputFile=baseline.json
    - |
      aiwg baseline create functional-baseline \
        --from baseline.json \
        --git-commit $CI_COMMIT_SHA \
        --release $CI_COMMIT_TAG

  artifacts:
    paths:
      - .aiwg/testing/baselines/
    expire_in: 90 days

  only:
    - main
    - tags
```

### Gitea Actions

```yaml
# .gitea/workflows/regression.yml

name: Regression Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  regression-check:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Download baseline
        run: |
          curl -s -H "Authorization: token $(cat ~/.config/gitea/token)" \
            "https://git.integrolabs.net/api/v1/repos/${{ github.repository }}/releases/latest/assets" \
            | jq -r '.[] | select(.name=="baseline.tar.gz") | .browser_download_url' \
            | xargs -I {} curl -L -o baseline.tar.gz {}
          tar -xzf baseline.tar.gz || echo "First run, no baseline"

      - name: Install and test
        run: |
          npm ci
          npm test -- --json --outputFile=test-results.json

      - name: Compare baseline
        id: regression
        run: |
          aiwg baseline compare functional-baseline \
            --current test-results.json \
            --output regression-report.md \
            --fail-on-regression

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        run: |
          bash <<'EOF'
          TOKEN=$(cat ~/.config/gitea/token)
          REPORT=$(cat regression-report.md)
          curl -s -X POST \
            -H "Authorization: token ${TOKEN}" \
            -H "Content-Type: application/json" \
            "https://git.integrolabs.net/api/v1/repos/${{ github.repository }}/issues/${{ github.event.number }}/comments" \
            -d "{\"body\": \"## Regression Check\\n\\n${REPORT}\"}"
          EOF

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: regression-report
          path: regression-report.md
```

## Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit - Local regression checks

# Skip for WIP commits
if git log -1 --pretty=%B | grep -qi "wip\|fixup\|squash"; then
  echo "WIP commit detected, skipping regression checks"
  exit 0
fi

# Fast pattern checks for known regression markers
echo "Running fast regression checks..."

# Check for common regression patterns
PATTERNS=(
  "TODO.*remove"
  "FIXME.*regression"
  "console\.log"  # Remove debug statements
  "debugger"
  "\.only\("      # Focused tests
  "\.skip\("      # Skipped tests
)

FAILED=0
for pattern in "${PATTERNS[@]}"; do
  if git diff --cached --diff-filter=ACM | grep -E "$pattern"; then
    echo "❌ Found regression pattern: $pattern"
    FAILED=1
  fi
done

if [ $FAILED -eq 1 ]; then
  echo ""
  echo "Regression patterns detected in staged changes."
  echo "Fix issues or bypass with: git commit --no-verify"
  exit 1
fi

# Optional: Run quick smoke tests
if [ -f "package.json" ] && command -v npm &> /dev/null; then
  echo "Running quick smoke tests..."
  npm run test:quick 2>&1 | head -n 20

  if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo "❌ Quick tests failed. Fix or bypass with --no-verify"
    exit 1
  fi
fi

echo "✅ Pre-commit regression checks passed"
exit 0
```

## Configuration Schema

```yaml
# .aiwg/config/regression-cicd.yaml

regression_ci:
  platform: github-actions  # github-actions | gitlab-ci | gitea-actions

  baselines:
    storage:
      type: artifacts  # artifacts | git-lfs | s3
      retention_days: 90

    environments:
      - name: development
        branch: develop
        baseline: functional-baseline-dev
        threshold:
          functional: 100%  # Exact match required
          performance: 110%  # 10% tolerance

      - name: staging
        branch: staging
        baseline: functional-baseline-staging
        threshold:
          functional: 100%
          performance: 105%

      - name: production
        branch: main
        baseline: functional-baseline-prod
        threshold:
          functional: 100%
          performance: 100%  # Strict

  merge_blocking:
    enabled: true
    block_on:
      - functional_regression
      - performance_degradation
      - api_contract_break
    allow_override: false  # Require admin approval

  notifications:
    slack:
      enabled: true
      webhook_url: ${SLACK_WEBHOOK_URL}
      channel: "#engineering"
      mention_on_failure: "@engineering-leads"

    email:
      enabled: false
      recipients:
        - team-lead@example.com

    pr_comment:
      enabled: true
      include_full_report: true
      tag_reviewers: true

  pre_commit:
    enabled: true
    checks:
      - pattern_detection
      - quick_tests
    skip_on_wip: true
    bypass_command: "git commit --no-verify"

  thresholds:
    functional:
      exact_match: true
      allow_new_fields: false

    performance:
      p50_tolerance: 10%
      p95_tolerance: 15%
      p99_tolerance: 20%
      throughput_tolerance: -5%  # 5% reduction allowed

    visual:
      pixel_diff_threshold: 0.1%
      ignore_regions: [timestamp, dynamic-ads]

    api_contract:
      breaking_changes: block
      non_breaking_changes: warn
```

## Multi-Environment Strategy

### Development Branch

```yaml
development:
  frequency: every_commit
  baseline_update: automatic
  thresholds: relaxed
  notifications: minimal
  purpose: Catch obvious regressions early
```

### Staging Branch

```yaml
staging:
  frequency: every_merge
  baseline_update: manual_approval
  thresholds: moderate
  notifications: team_channel
  purpose: Validate release candidates
```

### Production Branch

```yaml
production:
  frequency: every_release
  baseline_update: requires_signoff
  thresholds: strict
  notifications: all_stakeholders
  purpose: Protect production quality
```

## Branch Protection Integration

### GitHub

```yaml
# .github/branch-protection.json

{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "regression-baseline-check",
      "performance-regression-check"
    ]
  },
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "enforce_admins": false,
  "restrictions": null
}
```

Apply via GitHub API:

```bash
curl -X PUT \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${OWNER}/${REPO}/branches/main/protection" \
  -d @.github/branch-protection.json
```

### GitLab

```yaml
# Set via GitLab UI or API
protected_branches:
  - name: main
    push_access_levels:
      - access_level: 40  # Maintainer
    merge_access_levels:
      - access_level: 30  # Developer
    required_approvals: 1
    code_owner_approval_required: true
    allow_force_push: false
    allowed_to_merge:
      - job: regression-check
        status: success
```

## Notification Examples

### Slack Message

```markdown
🔴 **Regression Detected in PR #123**

**PR**: feat: Add user profile endpoint
**Author**: @developer
**Branch**: `feature/user-profile` → `main`

**Regressions Found**: 3

1. ❌ **Functional**: user-login test failed
   - Expected: 200 OK
   - Got: 500 Internal Server Error
   - Severity: Critical

2. ⚠️ **Performance**: API latency degraded
   - p95: 150ms (baseline: 100ms)
   - Increase: +50%
   - Threshold: 15%

3. ⚠️ **API Contract**: Response schema changed
   - New field: `user.profile.avatar`
   - Breaking: true

**Action Required**: @engineering-leads

[View Full Report](https://github.com/org/repo/actions/runs/123)
```

### PR Comment

```markdown
## 🔍 Regression Check Results

**Status**: ❌ Regressions Detected

| Check | Status | Details |
|-------|--------|---------|
| Functional | ❌ Failed | 1/45 tests regressed |
| Performance | ⚠️ Warning | p95 latency +50% |
| API Contract | ⚠️ Warning | 1 breaking change |
| Visual | ✅ Passed | No pixel diff |

### Failed Tests

#### user-login

**Baseline** (v1.2.0):
```json
{
  "status": 200,
  "body": { "token": "..." }
}
```

**Current**:
```json
{
  "status": 500,
  "body": { "error": "Internal Server Error" }
}
```

**Root Cause**: Validation middleware broken in commit abc123

### Performance Regression

| Metric | Baseline | Current | Change | Threshold |
|--------|----------|---------|--------|-----------|
| p50 | 45ms | 48ms | +6.7% | ±10% ✅ |
| p95 | 100ms | 150ms | +50% | ±15% ❌ |
| p99 | 250ms | 300ms | +20% | ±20% ✅ |

### API Contract Changes

**Breaking Change Detected**:
- Added `user.profile.avatar` field
- Clients expecting strict schema will break

### Recommendations

- [ ] Fix validation middleware error handling
- [ ] Investigate p95 latency spike
- [ ] Version API or make avatar optional

**Merge Blocked**: Fix regressions or request override

[View Full Comparison](.aiwg/testing/baseline-comparisons/pr-123.md)
```

## Usage Examples

### Setup for New Project

```
User: "Add regression checks to our GitHub Actions CI"

Skill executes:
1. Detect GitHub Actions platform
2. Check for existing workflows
3. Generate regression-check.yml
4. Create baseline-update.yml
5. Setup branch protection
6. Create configuration file
7. Install pre-commit hook
8. Generate documentation

Output:
"Regression CI/CD Setup Complete

Platform: GitHub Actions
Workflows Created:
✓ .github/workflows/regression-check.yml - PR checks
✓ .github/workflows/baseline-update.yml - Baseline updates

Configuration:
✓ .aiwg/config/regression-cicd.yaml

Branch Protection:
✓ main: Requires regression-check to pass

Pre-commit Hook:
✓ .git/hooks/pre-commit - Fast local checks

Next Steps:
1. Review configuration in regression-cicd.yaml
2. Create initial baseline: aiwg baseline create functional-baseline
3. Push to trigger first regression check
4. Configure Slack webhook (optional)

Documentation: .aiwg/docs/regression-ci.md"
```

### Add to Existing Pipeline

```
User: "Integrate regression tests into our GitLab CI"

Skill analyzes:
- Existing .gitlab-ci.yml
- Current test stage configuration
- Baseline storage availability

Adds:
"Regression Stage Added to GitLab CI

Changes:
✓ Added 'regression' stage after 'test'
✓ Created regression-check job
✓ Created baseline-update job
✓ Configured artifact storage
✓ Added MR comment integration

Merge Request Pipeline:
test → regression → deploy
       ↓ (blocks merge on failure)

Review changes: .gitlab-ci.yml
Commit and push to activate"
```

### Configure Custom Thresholds

```
User: "Set stricter performance thresholds for production"

Skill updates regression-cicd.yaml:
"Performance Thresholds Updated

Environment: production
Changes:
- p50_tolerance: 10% → 5%
- p95_tolerance: 15% → 10%
- p99_tolerance: 20% → 15%
- throughput_tolerance: -5% → 0%

New baseline required for production.
Create with: aiwg baseline create functional-baseline-prod"
```

## Integration

This skill uses:
- `regression-baseline`: For baseline creation and management
- `regression-metrics`: For performance threshold validation
- `regression-report`: For generating detailed reports
- `project-awareness`: For detecting CI platform and configuration
- `notification-dispatch`: For Slack/email/comment notifications

## Agent Orchestration

```yaml
agents:
  setup:
    agent: devops-engineer
    focus: CI/CD configuration and integration

  configuration:
    agent: test-architect
    focus: Threshold tuning and baseline strategy

  troubleshooting:
    agent: reliability-engineer
    focus: Pipeline debugging and optimization
```

## Output Locations

- Workflows: `.github/workflows/` or `.gitlab-ci.yml` or `.gitea/workflows/`
- Configuration: `.aiwg/config/regression-cicd.yaml`
- Pre-commit: `.git/hooks/pre-commit`
- Documentation: `.aiwg/docs/regression-ci.md`
- Reports: `.aiwg/testing/baseline-comparisons/`

## Troubleshooting

### Baseline Not Found

```bash
# First run on new pipeline
echo "No baseline found. Creating initial baseline..."
aiwg baseline create functional-baseline --approve-initial
```

### Merge Block Override

```bash
# Admin override for emergencies
gh pr review 123 --approve --body "Override regression block: urgent hotfix"
gh pr merge 123 --admin --squash
```

### False Positive Regression

```bash
# Update baseline if change is intentional
aiwg baseline update functional-baseline \
  --approve-changes user-login \
  --justification "Added avatar field per REQ-456"
```

## References

- @agentic/code/frameworks/sdlc-complete/skills/regression-baseline/SKILL.md
- @agentic/code/frameworks/sdlc-complete/skills/regression-metrics/SKILL.md
- @agentic/code/frameworks/sdlc-complete/skills/regression-report/SKILL.md
- @agentic/code/frameworks/sdlc-complete/agents/devops-engineer.md
- @agentic/code/frameworks/sdlc-complete/agents/test-architect.md
- @agentic/code/frameworks/sdlc-complete/agents/reliability-engineer.md
