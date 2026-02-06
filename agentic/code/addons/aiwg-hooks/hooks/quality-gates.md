# Quality Gate Hook Templates

**Issue:** #289
**Platform:** Claude Code v2.1.3+
**Type:** Documentation/Templates
**Timeout:** 10 minutes (v2.1.3)

## Overview

Claude Code v2.1.3 increased hook timeout to 10 minutes, enabling comprehensive quality gate checks before commits, pushes, and deployments. These hooks leverage the extended timeout for full test suites, security scans, and validation workflows.

**Key Benefits**:
- Catch issues before they enter version control
- Automated quality enforcement at critical checkpoints
- Leverage 10-minute timeout for comprehensive checks
- Fail-fast feedback on quality issues

**How It Works**:
1. User performs git operation (commit, push) or build
2. Hook runs validation checks (tests, lint, security)
3. If checks pass, operation proceeds
4. If checks fail, operation blocks with clear feedback
5. Developer fixes issues and retries

## Timeout Configuration

Claude Code v2.1.3+ provides 10-minute timeout for hooks, sufficient for:
- Full test suites (typically 2-5 minutes)
- Security scanning (1-3 minutes)
- Linting and type checking (<1 minute)
- Build verification (2-5 minutes)

**Best Practices**:
- Keep individual checks under 3 minutes when possible
- Run checks in parallel where feasible
- Provide progress feedback for long-running operations
- Use appropriate exit codes (0=success, non-zero=failure)

---

## Hook Templates

### 1. Pre-Commit Test Hook

**Purpose**: Run tests and coverage checks before allowing commits.

**Checks Performed**:
- Unit test suite execution
- Coverage threshold enforcement (80% minimum)
- Type checking (TypeScript/Flow)
- Fast linting (quick checks only)

**Hook Configuration** (`.claude/settings.json`):

```json
{
  "hooks": {
    "PreGitCommit": [
      {
        "id": "pre-commit-tests",
        "name": "Pre-Commit Test Gate",
        "description": "Runs tests and type checks before commit",
        "enabled": true,
        "timeout": 300000,
        "handler": {
          "type": "shell",
          "command": "npm run precommit",
          "workingDirectory": "${workspaceRoot}",
          "failOnError": true
        }
      }
    ]
  }
}
```

**package.json script**:

```json
{
  "scripts": {
    "precommit": "npm run typecheck && npm test -- --coverage --coverageThreshold='{\"global\":{\"lines\":80,\"statements\":80,\"functions\":80,\"branches\":80}}'",
    "typecheck": "tsc --noEmit"
  }
}
```

**Expected Output**:
```
Running Pre-Commit Test Gate...
✓ Type check passed (2.1s)
✓ Tests: 42 passed, 0 failed (3.2s)
✓ Coverage: 85.3% (exceeds 80% threshold)
Commit allowed.
```

**Failure Output**:
```
Running Pre-Commit Test Gate...
✓ Type check passed (2.1s)
✗ Tests: 40 passed, 2 failed (3.5s)
  - test/auth/login.test.ts: Token validation fails
  - test/api/users.test.ts: Missing error handling
✗ Commit blocked. Fix failing tests and try again.
```

---

### 2. Security Gate Hook

**Purpose**: Run security scans before commits to prevent vulnerabilities from entering codebase.

**Checks Performed**:
- Secret detection (AWS keys, API tokens, passwords)
- Dependency vulnerability scan (npm audit)
- OWASP security patterns (if applicable)
- License compliance check

**Hook Configuration** (`.claude/settings.json`):

```json
{
  "hooks": {
    "PreGitCommit": [
      {
        "id": "security-gate",
        "name": "Security Scan Gate",
        "description": "Scans for secrets and vulnerabilities before commit",
        "enabled": true,
        "timeout": 180000,
        "handler": {
          "type": "shell",
          "command": "npm run security-check",
          "workingDirectory": "${workspaceRoot}",
          "failOnError": true
        }
      }
    ]
  }
}
```

**package.json script**:

```json
{
  "scripts": {
    "security-check": "npm run detect-secrets && npm run audit-deps",
    "detect-secrets": "detect-secrets-hook --baseline .secrets.baseline || (echo '⚠️  Secrets detected!' && exit 1)",
    "audit-deps": "npm audit --audit-level=moderate"
  }
}
```

**Setup Requirements**:

1. Install detect-secrets:
   ```bash
   pip install detect-secrets
   detect-secrets scan > .secrets.baseline
   ```

2. Add to `.gitignore`:
   ```
   .secrets.baseline
   ```

**Expected Output**:
```
Running Security Scan Gate...
✓ Secret detection: No secrets found (0.8s)
✓ Dependency audit: No vulnerabilities (1.2s)
Commit allowed.
```

**Failure Output**:
```
Running Security Scan Gate...
✗ Secret detection: Potential secrets found
  - src/config.ts:15: Possible AWS Access Key
  - .env:3: Possible API token
✗ Commit blocked. Review and remove secrets, update .secrets.baseline if false positive.
```

---

### 3. Pre-Push Validation Hook

**Purpose**: Run comprehensive validation before pushing to remote (more extensive than pre-commit).

**Checks Performed**:
- Full test suite (including integration tests)
- Full linting (all rules)
- Build verification (ensure code compiles/bundles)
- Documentation checks (if applicable)

**Hook Configuration** (`.claude/settings.json`):

```json
{
  "hooks": {
    "PreGitPush": [
      {
        "id": "pre-push-validation",
        "name": "Pre-Push Validation Gate",
        "description": "Comprehensive checks before push",
        "enabled": true,
        "timeout": 600000,
        "handler": {
          "type": "shell",
          "command": "npm run prepush",
          "workingDirectory": "${workspaceRoot}",
          "failOnError": true
        }
      }
    ]
  }
}
```

**package.json script**:

```json
{
  "scripts": {
    "prepush": "npm run lint && npm run build && npm test -- --testPathIgnorePatterns=[]",
    "lint": "eslint . --ext .ts,.tsx --max-warnings=0",
    "build": "tsc && webpack --mode production"
  }
}
```

**Expected Output**:
```
Running Pre-Push Validation Gate...
✓ Lint check passed (1.8s)
✓ Build successful (4.2s)
✓ Full test suite: 127 passed, 0 failed (5.3s)
Push allowed.
```

**Failure Output**:
```
Running Pre-Push Validation Gate...
✓ Lint check passed (1.8s)
✗ Build failed (2.1s)
  - Type error in src/utils/helpers.ts:42
  - Property 'validate' does not exist on type 'User'
✗ Push blocked. Fix build errors and try again.
```

---

### 4. AIWG Anti-Laziness Gate

**Purpose**: Detect avoidance patterns before commits (test deletion, skip patterns, feature removal).

**Checks Performed**:
- Test count regression (compared to baseline)
- Skip pattern detection (`.skip()`, `@Ignore`)
- Coverage regression (>2% drop blocks)
- Feature removal without documentation

**Hook Configuration** (`.claude/settings.json`):

```json
{
  "hooks": {
    "PreGitCommit": [
      {
        "id": "anti-laziness-gate",
        "name": "Anti-Laziness Detection Gate",
        "description": "Detects avoidance patterns before commit",
        "enabled": true,
        "timeout": 120000,
        "handler": {
          "type": "shell",
          "command": "npm run detect-avoidance",
          "workingDirectory": "${workspaceRoot}",
          "failOnError": true
        }
      }
    ]
  }
}
```

**package.json script**:

```json
{
  "scripts": {
    "detect-avoidance": "node scripts/detect-avoidance.js",
    "baseline": "npm test -- --json --outputFile=.test-baseline.json"
  }
}
```

**Script**: `scripts/detect-avoidance.js`

```javascript
const { execSync } = require('child_process');
const fs = require('fs');

// Load baseline
const baseline = JSON.parse(fs.readFileSync('.test-baseline.json', 'utf-8'));

// Run current tests
const current = JSON.parse(
  execSync('npm test -- --json --outputFile=/dev/stdout', { encoding: 'utf-8' })
);

// Check test count
if (current.numTotalTests < baseline.numTotalTests) {
  console.error(`✗ Test count decreased: ${baseline.numTotalTests} → ${current.numTotalTests}`);
  process.exit(1);
}

// Check for skip patterns
const skipPatterns = ['.skip(', 'xit(', 'xdescribe(', '@Ignore'];
const files = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
  .split('\n')
  .filter(f => f.match(/\.(test|spec)\.(ts|js|tsx|jsx)$/));

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  for (const pattern of skipPatterns) {
    if (content.includes(pattern)) {
      console.error(`✗ Skip pattern detected in ${file}: ${pattern}`);
      process.exit(1);
    }
  }
}

// Check coverage
const coverageDrop = baseline.coverage - current.coverage;
if (coverageDrop > 2) {
  console.error(`✗ Coverage dropped by ${coverageDrop.toFixed(1)}%`);
  process.exit(1);
}

console.log('✓ No avoidance patterns detected');
process.exit(0);
```

**Expected Output**:
```
Running Anti-Laziness Detection Gate...
✓ Test count: 42 (unchanged)
✓ No skip patterns found
✓ Coverage: 85.3% (no regression)
Commit allowed.
```

**Failure Output**:
```
Running Anti-Laziness Detection Gate...
✗ Test count decreased: 42 → 40
✗ Skip pattern detected in test/auth/login.test.ts: .skip(
✗ Commit blocked. Tests were removed or skipped. Fix the issues, don't mask them.
```

---

## Cross-Platform Note

**Hooks are platform-specific.** On non-Claude platforms, equivalent checks run via:

| Platform | Alternative Method |
|----------|-------------------|
| **Git Hooks** | `.git/hooks/pre-commit`, `.git/hooks/pre-push` (native) |
| **Husky** | Configure in `.husky/pre-commit`, `.husky/pre-push` |
| **CI/CD** | GitHub Actions, GitLab CI, Jenkins pipelines |
| **Pre-commit framework** | `.pre-commit-config.yaml` with hook configs |

For maximum portability:
- Implement checks as npm scripts (platform-agnostic)
- Use git hooks for local enforcement
- Use CI/CD for remote enforcement
- Document Claude Code hooks as "enhanced local experience"

---

## Installation

### Method 1: Project Settings (Recommended)

Add hook configurations to `.claude/settings.json`:

```json
{
  "hooks": {
    "PreGitCommit": [
      // ... hook configurations from above
    ],
    "PreGitPush": [
      // ... push gate configuration
    ]
  }
}
```

### Method 2: Gradual Adoption

Start with lightweight checks and expand:

**Week 1**: Pre-commit tests only
**Week 2**: Add security gate
**Week 3**: Add pre-push validation
**Week 4**: Add anti-laziness detection

### Verification

To verify hooks are active:

1. Stage changes: `git add .`
2. Attempt commit: `git commit -m "test"`
3. Observe hook execution and output
4. Verify operation blocks on failure

---

## Performance Optimization

### Parallel Execution

Run independent checks in parallel:

```json
{
  "scripts": {
    "precommit": "npm-run-all --parallel typecheck test:fast lint:fast"
  }
}
```

### Incremental Checks

Only check modified files:

```bash
# Lint only staged files
eslint $(git diff --cached --name-only --diff-filter=ACM | grep '\\.tsx\\?$')

# Test only affected modules
npm test -- --findRelatedTests $(git diff --cached --name-only)
```

### Caching

Use tool caching where available:

```json
{
  "scripts": {
    "typecheck": "tsc --incremental --noEmit",
    "lint": "eslint . --cache"
  }
}
```

---

## Troubleshooting

**Hook taking too long?**
- Reduce test scope for pre-commit (save full suite for pre-push)
- Use `--bail` flag to stop on first failure
- Enable test caching (`jest --cache`)

**Hook blocking valid commits?**
- Check for false positives in detection logic
- Update baselines (`.test-baseline.json`, `.secrets.baseline`)
- Consider making hook advisory instead of blocking (warn vs error)

**Hook not running?**
- Verify Claude Code version (v2.1.3+ for quality gates)
- Check `.claude/settings.json` for JSON errors
- Ensure npm scripts exist and are executable

**Need to bypass temporarily?**
- Use `git commit --no-verify` (NOT recommended for Claude Code agents per @.claude/rules/token-security.md)
- Fix the underlying issue instead

---

## Best Practices

1. **Keep Fast Checks in Pre-Commit**: Save slow checks for pre-push
2. **Provide Clear Feedback**: Show what failed and how to fix
3. **Make Scripts Standalone**: Hooks should work outside Claude Code too
4. **Document Bypass Procedures**: For emergency hotfixes (rare)
5. **Update Baselines Regularly**: As tests and coverage evolve
6. **Monitor Hook Performance**: Track execution time, optimize slow checks

---

## Research Foundation

Quality gates implement patterns from:
- **REF-071**: METR Reward Hacking - Prevents test deletion avoidance
- **REF-072**: Anthropic Misalignment - Detects sabotage patterns
- **REF-013**: MetaGPT Executable Feedback - Tests before return
- **REF-015**: Self-Refine - Quality enforcement in iteration loops

---

## References

- Issue #289 - Quality gate hook implementation
- Issue #264 - Anti-laziness enforcement (REF-071, REF-072, REF-073, REF-074)
- Claude Code v2.1.3 Release Notes - 10-minute timeout
- @.claude/rules/anti-laziness.md - Avoidance pattern detection
- @.claude/rules/executable-feedback.md - Execute before return
- @.aiwg/research/findings/agentic-laziness-research.md - Research compilation

---

**Status**: Active
**Last Updated**: 2026-02-06
**Maintainer**: AIWG Contributors
